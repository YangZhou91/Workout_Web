import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "../parser/document";
import type { TrainingLogDocument } from "../types";

const DEFAULT_PATH = resolve(process.cwd(), "public/training-log.md");

// Build-time data access: reads the source log and returns the parsed document.
// Astro pages call this in frontmatter; Vitest calls it in the snapshot test.
export async function loadTrainingLog(
  path: string = DEFAULT_PATH,
): Promise<TrainingLogDocument> {
  const md = readFileSync(path, "utf8");
  return parseDocument(md);
}
