// Shared analytics helpers (FR-017–020). Effective load doubles per-side
// weights so a 12 kg/边 dumbbell counts as 24 kg everywhere — volume, top
// weight, and PR — keeping the three views consistent.
import type { WorkSet } from "../types";

export function effectiveWeight(s: WorkSet): number {
  const w = s.weightKg ?? 0;
  return s.perSide ? w * 2 : w;
}

export function setVolume(s: WorkSet): number {
  return effectiveWeight(s) * (s.reps ?? 0) * s.setCount;
}

// A loaded, trusted resistance set — the only kind that feeds kg volume / PR /
// load trends. Bodyweight, assisted, cardio, stretch, excluded, and
// lowConfidence sets are all excluded (FR-017/018/020, SC-008).
export function resistanceEligible(s: WorkSet): boolean {
  return (
    !s.flags.assisted &&
    !s.flags.bodyweight &&
    !s.flags.excluded &&
    !s.flags.lowConfidence &&
    s.weightKg !== null &&
    s.reps !== null
  );
}

// Epley 1RM estimate — labeled "estimated" everywhere it appears (SC-009).
export function epley1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}
