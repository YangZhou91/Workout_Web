import type { AuthorTotal, Exercise, SessionTime, Status, Workout } from "../types";
import { parseExerciseLine } from "./sets";

const STATUS_BY_EMOJI: Record<string, Status> = {
  "✅": "complete",
  "🟡": "partial",
  "💤": "rest",
  "⏳": "planned",
};

// `### <date>（<weekday>）<emoji> <type>` — weekday + emoji + type all optional.
const HEADING_RE =
  /^###\s+(\d{4}-\d{2}-\d{2})(?:\s*[（(]([^）)]*)[）)])?\s*(✅|🟡|💤|⏳)?\s*(.*)$/;

const AUTHOR_TOTAL_RE =
  /^\*\*(记录总量|记录总组数|计划训练量|最终总量)\*\*：\s*(.+)$/;

export function statusFromEmoji(emoji: string | undefined): Status {
  return (emoji && STATUS_BY_EMOJI[emoji]) || "complete";
}

function parseSessionTime(text: string): SessionTime | null {
  const range = text.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  const hm = text.match(/约\s*(\d+)\s*小时\s*(\d+)\s*分钟/);
  const minOnly = !hm && text.match(/约\s*(\d+)\s*分钟/);
  const hourOnly = !hm && !minOnly && text.match(/约\s*(\d+)\s*小时/);

  let durationMin: number | undefined;
  if (hm) durationMin = Number(hm[1]) * 60 + Number(hm[2]);
  else if (minOnly) durationMin = Number(minOnly[1]);
  else if (hourOnly) durationMin = Number(hourOnly[1]) * 60;

  if (!range && durationMin === undefined) return null;
  return { start: range?.[1], end: range?.[2], durationMin };
}

function parseAuthorTotal(content: string): AuthorTotal | null {
  const m = content.match(AUTHOR_TOTAL_RE);
  if (!m) return null;
  const raw = m[2].trim();
  const groups = raw.match(/(\d+)\s*组/);
  return { raw, groupCount: groups ? Number(groups[1]) : undefined };
}

export function parseWorkout(heading: string, body: string): Workout | null {
  const h = heading.match(HEADING_RE);
  if (!h) return null;

  const date = h[1];
  const weekday = h[2] ? h[2].trim() : null;
  const status = statusFromEmoji(h[3]);
  const type = h[4] ? h[4].trim() : null;

  let gym: string | null = null;
  let sessionTime: SessionTime | null = null;
  let authorTotal: AuthorTotal | null = null;
  let notes: string | null = null;
  const exercises: Exercise[] = [];

  const META_PREFIXES = ["门店：", "时间：", "状态："];
  for (const line of body.split(/\r?\n/)) {
    // top-level bullet only — indented sub-bullets stay in rawBody
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (!bullet) continue;
    const content = bullet[1];

    let c: RegExpMatchArray | null;
    if ((c = content.match(/^门店：\s*(.+)$/))) gym = c[1].trim();
    else if ((c = content.match(/^时间：\s*(.+)$/))) sessionTime = parseSessionTime(c[1]);
    else if ((c = content.match(/^状态：\s*(.+)$/))) notes = c[1].trim();
    else if (AUTHOR_TOTAL_RE.test(content)) authorTotal = parseAuthorTotal(content);
    else if (
      /[：:]/.test(content) &&
      !content.startsWith("**") &&
      !META_PREFIXES.some((p) => content.startsWith(p))
    ) {
      // Exercise line: name：set-notation. Guard on a set token so prose notes
      // that happen to contain ： (e.g. "用户于 …00：11 明确订正：…") are not
      // misclassified as exercises. Aggregate summaries without per-set data
      // still enter parseExerciseLine and fall through to verbatim (SC-011).
      if (!/kg|lb|[x×]|组|次|分钟|秒/.test(content)) continue;
      exercises.push(parseExerciseLine(content));
    }
  }

  return {
    id: date,
    date,
    weekday,
    status,
    type,
    gym,
    sessionTime,
    exercises,
    authorTotal,
    rawBody: body.trim(),
    notes,
  };
}
