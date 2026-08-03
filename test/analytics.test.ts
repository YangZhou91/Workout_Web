// T031 — analytics invariant tests (RED before the analytics modules).
// Honest/approximate analytics (research R3/R7, FR-017–020, SC-008–010):
// volume excludes bodyweight/cardio/assisted/excluded/lowConfidence; PRs respect
// the same exclusions and segment by gym (FR-019); cross-gym views warn.
// Synthetic workouts (built via the parser itself) for deterministic figures.
import { describe, expect, it } from "vitest";
import type { Workout } from "../src/types";
import { parseExerciseLine } from "../src/parser/sets";
import { sessionVolume, sessionVolumes } from "../src/analytics/volume";
import { personalRecords } from "../src/analytics/pr";
import { crossSegmentWarnings, exerciseVolumeTrend } from "../src/analytics/trends";

function mkWorkout(date: string, gym: string | null, lines: string[]): Workout {
  return {
    id: date,
    date,
    weekday: null,
    status: "complete",
    type: null,
    gym,
    sessionTime: null,
    exercises: lines.map(parseExerciseLine),
    authorTotal: null,
    rawBody: lines.join("\n"),
    notes: null,
  };
}

const FIXTURE: Workout[] = [
  mkWorkout("2026-07-01", "宝龙", [
    "史密斯深蹲：55 kg × 12 × 4", // resistance: 55*12*4 = 2640
    "哑铃弯举：12 kg/边 × 12", // resistance perSide: 12*2*12 = 288 (effective weight 24)
    "退阶波比跳：10 × 6 组", // bodyweight: 6 groups, no kg volume
    "跑步机：15 分钟", // cardio: 15 min
  ]),
  mkWorkout("2026-07-02", "宝龙", [
    "史密斯深蹲：60 kg × 8 × 3", // 60*8*3 = 1440; new PR @ 宝龙
    "辅助引体：50 kg 辅助 × 8", // assisted: excluded from kg volume
  ]),
  mkWorkout("2026-07-03", "绿地", [
    "史密斯深蹲：55 kg × 10 × 3", // different gym segment → own PR
  ]),
];

describe("sessionVolume", () => {
  it("sums resistance volume, doubles per-side weights", () => {
    const v = sessionVolume(FIXTURE[0]);
    expect(v.resistanceVolumeKg).toBe(2640 + 288);
    expect(v.bodyweightGroupCount).toBe(6);
    expect(v.cardioMinutes).toBe(15);
    expect(v.gym).toBe("宝龙");
  });

  it("excludes assisted from kg volume and notes it", () => {
    const v = sessionVolume(FIXTURE[1]);
    expect(v.resistanceVolumeKg).toBe(1440);
    expect(v.bodyweightGroupCount).toBe(0);
    expect(v.cardioMinutes).toBeNull();
    expect(v.notes.some((n) => /辅助/.test(n))).toBe(true);
  });

  it("sessionVolumes maps one per workout, ordered by date", () => {
    const vs = sessionVolumes(FIXTURE);
    expect(vs).toHaveLength(3);
    expect(vs.map((v) => v.workoutId)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });
});

describe("personalRecords", () => {
  it("picks the heaviest set per (exercise, gym), respecting segmentation", () => {
    const prs = personalRecords(FIXTURE);
    const find = (ex: string, gym: string) =>
      prs.find((p) => p.exercise === ex && p.gym === gym);
    expect(find("史密斯深蹲", "宝龙")?.weightKg).toBe(60);
    expect(find("史密斯深蹲", "宝龙")?.asOf).toBe("2026-07-02");
    expect(find("史密斯深蹲", "绿地")?.weightKg).toBe(55);
    // per-side effective weight (12 × 2)
    expect(find("哑铃弯举", "宝龙")?.weightKg).toBe(24);
  });

  it("never records assisted/bodyweight/excluded/lowConfidence as a weight PR", () => {
    const prs = personalRecords(FIXTURE);
    expect(prs.some((p) => p.exercise === "辅助引体")).toBe(false);
    expect(prs.some((p) => p.exercise === "退阶波比跳")).toBe(false);
  });

  it("excluded/lowConfidence sets are not the max", () => {
    const w = mkWorkout("2026-07-09", "G", [
      "深蹲：100 kg × 5 × 2",
      "深蹲：200 kg × 1；仅为推测，不计入",
    ]);
    // two exercise entries named 深蹲 — PR must be 100, not 200
    const prs = personalRecords([w]);
    expect(prs.find((p) => p.exercise === "深蹲")?.weightKg).toBe(100);
  });
});

describe("exerciseVolumeTrend", () => {
  it("emits one point per (exercise, gym, date) with volume + topWeight", () => {
    const t = exerciseVolumeTrend(FIXTURE);
    const d1 = t.find((p) => p.exercise === "史密斯深蹲" && p.gym === "宝龙" && p.date === "2026-07-01");
    expect(d1?.volumeKg).toBe(2640);
    expect(d1?.topWeightKg).toBe(55);
    const d2 = t.find((p) => p.exercise === "史密斯深蹲" && p.gym === "宝龙" && p.date === "2026-07-02");
    expect(d2?.topWeightKg).toBe(60);
  });

  it("estimates a 1RM (Epley) on the heaviest set", () => {
    const t = exerciseVolumeTrend(FIXTURE);
    const d2 = t.find((p) => p.exercise === "史密斯深蹲" && p.gym === "宝龙" && p.date === "2026-07-02");
    // 60 kg × 8 → 60 × (1 + 8/30) = 76
    expect(d2?.estimated1RM).toBeCloseTo(76, 0);
  });
});

describe("crossSegmentWarnings", () => {
  it("warns when an exercise appears across >1 gym (FR-019)", () => {
    const warns = crossSegmentWarnings(FIXTURE);
    expect(warns.some((w) => /史密斯深蹲/.test(w) && /宝龙/.test(w) && /绿地/.test(w))).toBe(true);
  });

  it("does not warn for single-gym exercises", () => {
    const warns = crossSegmentWarnings(FIXTURE);
    expect(warns.some((w) => /哑铃弯举/.test(w))).toBe(false);
  });
});
