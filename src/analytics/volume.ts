// Session volume (FR-017–020). resistanceVolumeKg sums only trusted loaded
// sets; bodyweight counts groups, cardio counts minutes. Each exclusion is
// surfaced as a human-readable note so every figure stays traceable (SC-008).
import type { SessionVolume, Workout } from "../types";
import { resistanceEligible, setVolume } from "./shared";

export function sessionVolume(w: Workout): SessionVolume {
  let resistanceVolumeKg = 0;
  let bodyweightGroupCount = 0;
  let cardioMinutes: number | null = null;
  let assistedSets = 0;
  let excludedSets = 0;
  let lowConfSets = 0;

  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      if (s.flags.assisted) assistedSets += s.setCount;
      if (s.flags.excluded) excludedSets += s.setCount;
      if (s.flags.lowConfidence) lowConfSets += s.setCount;

      if (resistanceEligible(s)) {
        resistanceVolumeKg += setVolume(s);
      } else if (s.flags.bodyweight) {
        bodyweightGroupCount += s.setCount;
      } else if (ex.category === "cardio" && s.durationMin !== null) {
        cardioMinutes = (cardioMinutes ?? 0) + s.durationMin;
      }
    }
  }

  const notes: string[] = [];
  if (assistedSets > 0)
    notes.push(`${assistedSets} 组辅助训练未计入抗阻容量（净拉需体重基线）`);
  if (excludedSets > 0) notes.push(`${excludedSets} 组推测/不计入已排除`);
  if (lowConfSets > 0) notes.push(`${lowConfSets} 项低置信度（范围/汇总）已排除`);

  return {
    workoutId: w.id,
    gym: w.gym,
    resistanceVolumeKg,
    bodyweightGroupCount,
    cardioMinutes,
    notes,
  };
}

export function sessionVolumes(ws: Workout[]): SessionVolume[] {
  return ws.map(sessionVolume);
}
