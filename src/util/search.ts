import type { Workout } from "../types";
import { statusLabel } from "./format";

// Naive pre-set-parser label extraction, used ONLY to build a lean search
// haystack (US3) — not for metrics. The real set parser lands in US4 (T030).
// Grabs the label before "：" on bullet lines that carry a digit, skipping
// meta lines (门店/时间/状态) and bold totals.
export function exerciseLabels(rawBody: string): string[] {
  const META = new Set(["门店", "时间", "状态"]);
  const labels: string[] = [];
  for (const line of rawBody.split(/\r?\n/)) {
    const s = line.trim();
    if (!s.startsWith("- ")) continue;
    if (s.startsWith("- **")) continue;
    const body = s.slice(2);
    const m = body.match(/^([^：:]+)[：:](.*)$/);
    if (!m) continue;
    const label = m[1].trim();
    const rest = m[2];
    if (META.has(label)) continue;
    if (!/\d/.test(rest)) continue;
    labels.push(label);
  }
  return labels;
}

// Lowercase searchable text for one workout. Lean by design: metadata +
// exercise labels only — no full rawBody, no rendered HTML — so the index
// page payload stays small as the archive grows (FR-011, SC-004).
export function haystack(w: Workout): string {
  const parts: (string | null | undefined)[] = [
    w.date,
    w.weekday,
    w.type,
    w.gym,
    statusLabel(w.status),
    w.notes,
    w.authorTotal?.raw,
    ...exerciseLabels(w.rawBody),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}
