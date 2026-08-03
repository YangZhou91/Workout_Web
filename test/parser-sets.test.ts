// T027 — set-parser variant + convention tests (RED before sets.ts; now GREEN).
// Encodes every variant in contracts/source-format.md §2.1 (V1–V15) and the
// unit/convention rules in §2.2. Honest-segmentation invariants (FR-017–020):
// excluded/lowConfidence never feed metrics; assisted/bodyweight are flagged.
import { describe, expect, it } from "vitest";
import { LB_TO_KG, isBodyweightName, isStretchName, lbToKg } from "../src/parser/conventions";
import { parseExerciseLine } from "../src/parser/sets";

// Compact projection of a WorkSet — only the fields assertions care about.
function proj(s: ReturnType<typeof parseExerciseLine>["sets"][number]) {
  return {
    w: s.weightKg,
    r: s.reps,
    s: s.setCount,
    perSide: s.perSide,
    assist: s.assistKg,
    dur: s.durationMin,
    f: s.flags,
  };
}
const F = (assisted = false, bodyweight = false, excluded = false, lowConfidence = false) => ({
  assisted,
  bodyweight,
  excluded,
  lowConfidence,
});

describe("parseExerciseLine — V1–V15 catalog", () => {
  it("V1: single load × reps × sets", () => {
    const e = parseExerciseLine("史密斯深蹲：55 kg × 12 × 4");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([{ w: 55, r: 12, s: 4, perSide: false, assist: null, dur: null, f: F() }]);
  });

  it("V2: two segments, one with set count", () => {
    const e = parseExerciseLine("史密斯坐姿推举：30 kg × 12；32.5 kg × 12 × 3");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 30, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 32.5, r: 12, s: 3, perSide: false, assist: null, dur: null, f: F() },
    ]);
  });

  it("V3: slash-list weights expand to one set each", () => {
    const e = parseExerciseLine("史密斯深蹲：40/45/50/50 kg × 12，共 4 组");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 40, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 45, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 50, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 50, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F() },
    ]);
  });

  it("V4: single weight + slash-list reps expand to one set each", () => {
    const e = parseExerciseLine("上斜杠铃卧推：45 kg，8/5/5/8，共 4 组 26 次");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 45, r: 8, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 45, r: 5, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 45, r: 5, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 45, r: 8, s: 1, perSide: false, assist: null, dur: null, f: F() },
    ]);
  });

  it("V5: per-side weight flagged (volume layer doubles)", () => {
    const e = parseExerciseLine("上斜哑铃卧推：12 kg/边 × 12；14 kg/边 × 12");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 12, r: 12, s: 1, perSide: true, assist: null, dur: null, f: F() },
      { w: 14, r: 12, s: 1, perSide: true, assist: null, dur: null, f: F() },
    ]);
  });

  it("V7: four segments with varying weight and reps", () => {
    const e = parseExerciseLine("侧平举：12.5 kg × 20；15 kg × 20；17.5 kg × 15；15 kg × 18");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 12.5, r: 20, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 15, r: 20, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 17.5, r: 15, s: 1, perSide: false, assist: null, dur: null, f: F() },
      { w: 15, r: 18, s: 1, perSide: false, assist: null, dur: null, f: F() },
    ]);
  });

  it("V8: assisted pull-up with parenthetical assist kg", () => {
    const e = parseExerciseLine("辅助引体：130 lb（约 58.97 kg 辅助）× 10 × 3");
    expect(e.category).toBe("assisted");
    expect(e.sets.map(proj)).toEqual([
      { w: 58.97, r: 10, s: 3, perSide: false, assist: 58.97, dur: null, f: F(true) },
    ]);
  });

  it("V9: multiple assisted-kg segments", () => {
    const e = parseExerciseLine("辅助引体：52.3 kg 辅助 × 5；59.1 kg 辅助 × 7 × 2");
    expect(e.category).toBe("assisted");
    expect(e.sets.map(proj)).toEqual([
      { w: 52.3, r: 5, s: 1, perSide: false, assist: 52.3, dur: null, f: F(true) },
      { w: 59.1, r: 7, s: 2, perSide: false, assist: 59.1, dur: null, f: F(true) },
    ]);
  });

  it("V10: parenthetical kg + an excluded speculative lb segment", () => {
    const e = parseExerciseLine("坐姿推胸：100 lb（约 45.36 kg）× 12 × 3；另有 85 lb × 12 一组仅为推测，不计入确定组");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: 45.36, r: 12, s: 3, perSide: false, assist: null, dur: null, f: F() },
      { w: lbToKg(85), r: 12, s: 1, perSide: false, assist: null, dur: null, f: F(false, false, true) },
    ]);
  });

  it("V11: bodyweight reps with 组 suffix", () => {
    const e = parseExerciseLine("退阶波比跳：10 × 6 组，共 60 次");
    expect(e.category).toBe("bodyweight");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: 10, s: 6, perSide: false, assist: null, dur: null, f: F(false, true) },
    ]);
  });

  it("V12: bodyweight bare reps×sets", () => {
    const e = parseExerciseLine("悬垂举腿：12 × 2");
    expect(e.category).toBe("bodyweight");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: 12, s: 2, perSide: false, assist: null, dur: null, f: F(false, true) },
    ]);
  });

  it("V13: cardio minutes", () => {
    const e = parseExerciseLine("跑步机：15 分钟");
    expect(e.category).toBe("cardio");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: null, s: 1, perSide: false, assist: null, dur: 15, f: F() },
    ]);
  });

  it("V14: stretch seconds × sets", () => {
    const e = parseExerciseLine("三角肌中束、后束拉伸：各 30 秒 × 2");
    expect(e.category).toBe("stretch");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: null, s: 2, perSide: false, assist: null, dur: 0.5, f: F() },
    ]);
  });

  it("V15: range/aggregate is lowConfidence (no per-set data)", () => {
    const e = parseExerciseLine("Matrix 侧平举：18-32 kg 双边总配重，双金字塔约 11 组");
    expect(e.category).toBe("resistance");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: null, s: 11, perSide: false, assist: null, dur: null, f: F(false, false, false, true) },
    ]);
  });
});

describe("parseExerciseLine — conventions & real-log edge cases", () => {
  it("lb→kg conversion factor", () => {
    expect(LB_TO_KG).toBeCloseTo(0.45359237, 8);
    expect(lbToKg(85)).toBeCloseTo(38.5553, 3);
  });

  it("bodyweight name allowlist (substring match)", () => {
    expect(isBodyweightName("引体")).toBe(true);
    expect(isBodyweightName("辅助引体")).toBe(true); // substring
    expect(isBodyweightName("史密斯深蹲")).toBe(false);
  });

  it("stretch name detection", () => {
    expect(isStretchName("三角肌拉伸")).toBe(true);
    expect(isStretchName("腘绳肌压腿")).toBe(true);
    expect(isStretchName("史密斯深蹲")).toBe(false);
  });

  it("lb without parenthetical is converted (70 lb → kg)", () => {
    const e = parseExerciseLine("高位下拉：70 lb × 12；85 lb（约 38.56 kg）× 8");
    expect(e.sets.map((s) => s.weightKg)).toEqual([lbToKg(70), 38.56]);
  });

  it("slash-list assist (辅助) expands to one assisted set per value", () => {
    const e = parseExerciseLine("辅助引体：35/30/30 kg 辅助 × 12，共 3 组");
    expect(e.category).toBe("assisted");
    expect(e.sets.map(proj)).toEqual([
      { w: 35, r: 12, s: 1, perSide: false, assist: 35, dur: null, f: F(true) },
      { w: 30, r: 12, s: 1, perSide: false, assist: 30, dur: null, f: F(true) },
      { w: 30, r: 12, s: 1, perSide: false, assist: 30, dur: null, f: F(true) },
    ]);
  });

  it("两侧总重 is NOT per-side (already a bilateral total)", () => {
    const e = parseExerciseLine("绳索夹胸：25 kg 两侧总重 × 12");
    const s = e.sets[0];
    expect(s.perSide).toBe(false);
    expect(s.weightKg).toBe(25);
  });

  it("ladder range is lowConfidence", () => {
    const e = parseExerciseLine("自由深蹲：50-70 kg 阶梯 × 12，共 5 组");
    expect(e.sets.every((s) => s.flags.lowConfidence)).toBe(true);
    expect(e.sets[0].setCount).toBe(5);
  });

  it("自重 × N is a bodyweight variant", () => {
    const e = parseExerciseLine("悬垂举腿：自重 × 12");
    expect(e.category).toBe("bodyweight");
    expect(e.sets.map(proj)).toEqual([
      { w: null, r: 12, s: 1, perSide: false, assist: null, dur: null, f: F(false, true) },
    ]);
  });

  it("unrecognized line → verbatim fallback, excluded from metrics", () => {
    const e = parseExerciseLine("自由深蹲：foo bar baz 无法解析");
    expect(e.sets).toEqual([]);
    expect(e.unparsed).toBe("自由深蹲：foo bar baz 无法解析");
  });
});
