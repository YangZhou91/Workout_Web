// Normalization + flags at the parser boundary (FR-016/020). Takes a parsed
// segment descriptor (from a sets.ts recognizer) and expands it into WorkSet[],
// applying unit conversion, per-side marking, category-specific fields, and the
// assisted/bodyweight/excluded/lowConfidence flags.
import type { Category, SetFlags, WorkSet } from "../types";
import { lbToKg } from "./conventions";

// Intermediate shape produced by a sets.ts recognizer. Number-valued fields may
// be a single number or an array (slash-list variants V3/V4) → expanded here.
export interface ParsedSegment {
  weightKg?: number | number[]; // explicit kg (parenthetical or direct)
  weightLb?: number | number[]; // raw lb, converted when no kg is given
  perSide?: boolean; // /边 or 单边 → total = weightKg × 2 in volume
  reps?: number | number[]; // single or slash-list (V4)
  setCount?: number; // trailing × N or 共 N 组 (default 1)
  durationMin?: number; // cardio minutes / stretch seconds→min
  assistKg?: number | number[]; // explicit assist (辅助) — may be a slash-list (V9 / 7-19 form)
  assisted?: boolean; // 辅助 marker
  excluded?: boolean; // 推测 / 不计入 (FR-020)
  lowConfidence?: boolean; // range/aggregate, no per-set breakdown (V15)
  originalWeight?: string; // verbatim token for traceability (SC-008)
}

function toArray(v: number | number[] | undefined): number[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

function resolveWeightKg(seg: ParsedSegment): number[] | undefined {
  if (seg.weightKg !== undefined) return toArray(seg.weightKg);
  if (seg.weightLb !== undefined) return toArray(seg.weightLb).map(lbToKg);
  return undefined;
}

export function normalizeSegment(
  seg: ParsedSegment,
  category: Category,
): WorkSet[] {
  const flags: SetFlags = {
    assisted: category === "assisted",
    bodyweight: category === "bodyweight",
    excluded: !!seg.excluded,
    lowConfidence: !!seg.lowConfidence,
  };
  const setCount = seg.setCount ?? 1;
  const durationMin = seg.durationMin ?? null;

  if (category === "assisted") {
    // Assist weight may arrive as assistKg (V8/V9 single) or as weightKg when
    // a slash-list assist like "35/30/30 kg 辅助" was caught by unified-kg and
    // flagged assisted by the sets.ts loop. Expand lists to one set per value.
    const assists = seg.assistKg !== undefined ? toArray(seg.assistKg) : resolveWeightKg(seg);
    const repses = toArray(seg.reps);
    const list = assists ?? [null];
    const out: WorkSet[] = [];
    for (let i = 0; i < list.length; i++) {
      const a = list.length === 1 ? list[0] : list[i] ?? null;
      const r = repses && repses.length === 1 ? repses[0] : repses?.[i] ?? null;
      out.push({
        weightKg: a,
        originalWeight: seg.originalWeight ?? null,
        perSide: false,
        reps: r ?? null,
        setCount,
        assistKg: a,
        durationMin,
        flags,
      });
    }
    return out;
  }

  // bodyweight / cardio / stretch — no external kg load
  if (category === "bodyweight" || category === "cardio" || category === "stretch") {
    return [
      {
        weightKg: null,
        originalWeight: null,
        perSide: false,
        reps: toArray(seg.reps)?.[0] ?? null,
        setCount,
        assistKg: null,
        durationMin,
        flags,
      },
    ];
  }

  // resistance
  if (seg.lowConfidence) {
    return [
      {
        weightKg: null,
        originalWeight: seg.originalWeight ?? null,
        perSide: false,
        reps: null,
        setCount,
        assistKg: null,
        durationMin,
        flags,
      },
    ];
  }

  const weights = resolveWeightKg(seg) ?? [null];
  const repses = toArray(seg.reps) ?? [null];
  const len = Math.max(weights.length, repses.length);
  const out: WorkSet[] = [];
  for (let i = 0; i < len; i++) {
    const w = weights.length === 1 ? weights[0] : weights[i] ?? null;
    const r = repses.length === 1 ? repses[0] : repses[i] ?? null;
    out.push({
      weightKg: w ?? null,
      originalWeight: seg.originalWeight ?? null,
      perSide: !!seg.perSide,
      reps: r ?? null,
      setCount,
      assistKg: null,
      durationMin,
      flags,
    });
  }
  return out;
}
