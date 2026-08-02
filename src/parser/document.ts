import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { DroppedHeading, Section, TrainingLogDocument, Workout } from "../types";
import { parseWorkout } from "./workout";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  return String(await processor.process(md));
}

interface Block {
  heading: string; // text without the leading ###/##
  body: string;
}

function splitSections(body: string, prefix: string): Block[] {
  const re = new RegExp(`^${prefix}\\s+(.+)$`);
  const out: Block[] = [];
  let heading: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (heading !== null) out.push({ heading, body: lines.join("\n") });
    heading = null;
    lines = [];
  };
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(re);
    if (m) {
      flush();
      heading = m[1].trim();
    } else if (heading !== null) {
      lines.push(line);
    }
  }
  flush();
  return out;
}

export async function parseDocument(md: string): Promise<TrainingLogDocument> {
  const lines = md.split(/\r?\n/);

  const titleLine = lines.find((l) => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : "训练日志";

  const firstH2 = lines.findIndex((l) => /^##(?!#)/.test(l));
  const headEnd = firstH2 === -1 ? lines.length : firstH2;
  const blockquote = lines
    .slice(0, headEnd)
    .filter((l) => /^>\s?/.test(l))
    .map((l) => l.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  const meta: Record<string, string> = {};
  if (blockquote) meta.blockquote = blockquote;

  // Split the whole document by ## (but not ###) to get top-level sections.
  const topSections = splitSections(md, "##(?!#)");

  const documentSections: Section[] = [];
  const workouts: Workout[] = [];
  const droppedWorkouts: DroppedHeading[] = [];

  for (const sec of topSections) {
    if (sec.heading.includes("训练记录")) {
      for (const sub of splitSections(sec.body, "###")) {
        const w = parseWorkout(`### ${sub.heading}`, sub.body);
        if (w) {
          workouts.push(w);
        } else {
          droppedWorkouts.push({ heading: sub.heading, reason: "unparseable date" });
          console.warn(
            `[parser] dropped workout (unparseable date): ### ${sub.heading}`,
          );
        }
      }
    } else {
      const html = await renderMarkdown(`## ${sec.heading}\n${sec.body}`);
      documentSections.push({ heading: sec.heading, html });
    }
  }

  workouts.sort((a, b) => a.date.localeCompare(b.date));

  return { title, meta, documentSections, workouts, droppedWorkouts };
}
