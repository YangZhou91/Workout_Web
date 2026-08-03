// Per-exercise load trend (one point per exercise × gym × date) + cross-gym
// warnings (FR-019). volumeKg mirrors sessionVolume's trusted-set sum;
// estimated1RM uses Epley on the session's heaviest set and is labeled
// "estimated" on the page (SC-009).
import type { ExerciseTrendPoint, Workout } from "../types";
import { effectiveWeight, epley1RM, resistanceEligible, setVolume } from "./shared";

export function exerciseVolumeTrend(ws: Workout[]): ExerciseTrendPoint[] {
  const points: ExerciseTrendPoint[] = [];
  for (const w of ws) {
    const byEx = new Map<string, ExerciseTrendPoint>();
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!resistanceEligible(s)) continue;
        const key = `${ex.name} ${w.gym ?? "未知门店"}`;
        const ew = effectiveWeight(s);
        let p = byEx.get(key);
        if (!p) {
          p = {
            exercise: ex.name,
            gym: w.gym,
            date: w.date,
            topWeightKg: 0,
            volumeKg: 0,
          };
          byEx.set(key, p);
        }
        p.volumeKg += setVolume(s);
        if (ew > p.topWeightKg) {
          p.topWeightKg = ew;
          p.estimated1RM = epley1RM(ew, s.reps ?? 1);
        }
      }
    }
    points.push(...byEx.values());
  }
  return points;
}

export function crossSegmentWarnings(ws: Workout[]): string[] {
  const exGyms = new Map<string, Set<string>>();
  for (const w of ws) {
    for (const ex of w.exercises) {
      if (!exGyms.has(ex.name)) exGyms.set(ex.name, new Set());
      if (w.gym) exGyms.get(ex.name)!.add(w.gym);
    }
  }
  const warns: string[] = [];
  for (const [ex, gyms] of exGyms) {
    if (gyms.size > 1) {
      warns.push(
        `「${ex}」出现在多个门店（${[...gyms].join("、")}）——跨门店数据已分段，未合并排名（FR-019）`,
      );
    }
  }
  return warns;
}
