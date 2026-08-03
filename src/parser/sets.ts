// Catalog-driven set parser (R3). One recognizer per observed notation variant
// (contracts/source-format.md §2.1 V1–V15), each normalizing a segment to
// ParsedSegment(s); normalize.ts then expands to WorkSet[]. Lines matching no
// variant are returned verbatim (sets: [], unparsed) and excluded from metrics
// (SC-011) — never silently mis-summed.
import type { Category, Exercise } from "../types";
import { isBodyweightName, isStretchName } from "./conventions";
import { normalizeSegment, type ParsedSegment } from "./normalize";

// Segments are separated by ；; or 、 (the author mixes fullwidth semicolon and
// ideographic comma between set-expressions).
const SEG_SPLIT = /[；;、]/;
const EXCLUDED_RE = /推测|不计入/;
const ASSIST_RE = /辅助/;

const num = (s: string) => parseFloat(s);

function recognize(t: string): ParsedSegment | null {
  let m: RegExpMatchArray | null;

  // assisted with parenthetical kg — V8: "130 lb（约 58.97 kg 辅助）× 10 × 3"
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*lb[（(]\s*约\s*(\d+(?:\.\d+)?)\s*kg\s*辅助\s*[）)]\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/))) {
    return { assistKg: num(m[2]), assisted: true, reps: num(m[3]), setCount: m[4] ? num(m[4]) : 1, originalWeight: `${m[1]} lb` };
  }
  // assisted kg — V9: "52.3 kg 辅助 × 5"  /  slash-list assist "35/30/30 kg 辅助 × 12"
  if ((m = t.match(/(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)\s*kg\s*辅助\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/))) {
    const wtok = m[1];
    const assistKg: number | number[] = wtok.includes("/") ? wtok.split("/").map(Number) : num(wtok);
    return { assistKg, assisted: true, reps: num(m[2]), setCount: m[3] ? num(m[3]) : 1, originalWeight: `${wtok} kg 辅助` };
  }
  // lb with parenthetical kg (NOT assist): "100 lb（约 45.36 kg）× 12 × 3"
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*lb[（(]\s*约\s*(\d+(?:\.\d+)?)\s*kg\s*[）)]\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/))) {
    return { weightKg: num(m[2]), reps: num(m[3]), setCount: m[4] ? num(m[4]) : 1, originalWeight: `${m[1]} lb` };
  }
  // range / aggregate — V15 + ladders: "18-32 kg … 约 11 组" / "50-70 kg 阶梯 × 12，共 5 组"
  if (/\d+(?:\.\d+)?\s*[-–~]\s*\d+(?:\.\d+)?\s*kg/.test(t)) {
    const sc = t.match(/(?:共|约)\s*(\d+)\s*组/);
    return { lowConfidence: true, setCount: sc ? num(sc[1]) : 1, originalWeight: t };
  }
  // reps slash-list — V4: "45 kg，8/5/5/8，共 4 组 26 次" (no ×; single weight, reps list)
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*kg[，,]\s*(\d+(?:\/\d+)+)/))) {
    return { weightKg: num(m[1]), reps: m[2].split("/").map(Number), setCount: 1, originalWeight: `${m[1]} kg` };
  }
  // unified kg — V1/V2/V3/V5/V6/V7 + 总重/两侧总重/单边/边 labels.
  //   <weight(s)> kg [/边|单边|总重…] [filler] × reps [× sets]
  if ((m = t.match(/(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)*)\s*kg\s*(\/边|两侧总重|双侧总重|总重|单边)?[\s\S]*?[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/))) {
    const wtok = m[1];
    const sideTok = m[2];
    const perSide = sideTok === "/边" || sideTok === "单边" || /单边/.test(t);
    const weights: number | number[] = wtok.includes("/")
      ? wtok.split("/").map(Number)
      : num(wtok);
    return {
      weightKg: weights,
      perSide,
      reps: num(m[3]),
      setCount: m[4] ? num(m[4]) : 1,
      originalWeight: `${wtok} kg${sideTok ?? ""}`,
    };
  }
  // plain lb (no parenthetical) — convert: "85 lb × 12"
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*lb\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/))) {
    return { weightLb: num(m[1]), reps: num(m[2]), setCount: m[3] ? num(m[3]) : 1, originalWeight: `${m[1]} lb` };
  }
  // cardio minutes — V13: "15 分钟"
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*分钟/))) {
    return { durationMin: num(m[1]), setCount: 1 };
  }
  // stretch seconds — V14: "各 30 秒 × 2"
  if ((m = t.match(/(?:各\s*)?(\d+(?:\.\d+)?)\s*秒(?:\s*[x×]\s*(\d+))?/))) {
    return { durationMin: num(m[1]) / 60, setCount: m[2] ? num(m[2]) : 1 };
  }
  // bodyweight reps — V11: "10 × 6 组，共 60 次"  /  V12: "12 × 2"  /  "自重 × 12"
  if ((m = t.match(/自重\s*[x×]\s*(\d+)/))) {
    return { reps: num(m[1]), setCount: 1 };
  }
  if ((m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*组/))) {
    return { reps: num(m[1]), setCount: num(m[2]) };
  }
  if ((m = t.match(/(\d+)\s*[x×]\s*(\d+)/))) {
    return { reps: num(m[1]), setCount: num(m[2]) };
  }
  return null;
}

function categoryOf(name: string, segs: ParsedSegment[]): Category {
  if (segs.some((s) => s.assisted || s.assistKg !== undefined)) return "assisted";
  const hasLoad = segs.some((s) => s.weightKg !== undefined || s.weightLb !== undefined);
  if (!hasLoad) {
    if (isStretchName(name)) return "stretch";
    if (segs.some((s) => s.durationMin !== undefined)) return "cardio";
    if (isBodyweightName(name)) return "bodyweight";
  }
  return "resistance";
}

export function parseExerciseLine(line: string): Exercise {
  const m = line.match(/^([^：:]+)[：:]\s*(.+)$/);
  if (!m) {
    return { name: line.trim(), category: "resistance", sets: [], unparsed: line };
  }
  const name = m[1].trim();
  const body = m[2].trim();

  const segTexts = body.split(SEG_SPLIT).map((s) => s.trim()).filter(Boolean);
  const segs: ParsedSegment[] = [];
  for (const raw of segTexts) {
    const seg = recognize(raw);
    if (!seg) {
      // Trailing exclusion clause with no set of its own (e.g. "；仅为推测，不计入")
      // retroactively excludes the preceding set-bearing segments (contract §2).
      if (EXCLUDED_RE.test(raw)) segs.forEach((s) => (s.excluded = true));
      continue;
    }
    if (EXCLUDED_RE.test(raw)) seg.excluded = true;
    if (ASSIST_RE.test(raw)) seg.assisted = true;
    segs.push(seg);
  }

  if (segs.length === 0) {
    return { name, category: "resistance", sets: [], unparsed: line };
  }
  const category = categoryOf(name, segs);
  const sets = segs.flatMap((seg) => normalizeSegment(seg, category));
  return { name, category, sets, unparsed: null };
}
