// 记录口径 rules — the author's documented recording conventions (FR-017/018).
// Pure helpers; no parsing. Applied at the normalize boundary (see normalize.ts).

export const LB_TO_KG = 0.45359237;

export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

// Bodyweight moves: count sets/reps, exclude from kg volume (FR-017).
// Names are matched as substrings so "辅助引体" also contains "引体" — the
// assisted marker (checked in sets.ts) takes priority over this list.
export const BODYWEIGHT_NAMES = ["引体", "悬垂举腿", "波比跳", "退阶波比跳", "平板", "臂屈伸"];

export function isBodyweightName(name: string): boolean {
  return BODYWEIGHT_NAMES.some((n) => name.includes(n));
}

// Stretch detection is name-driven (拉伸 / 压腿); cardio is the duration-only
// fallback (see categoryOf in sets.ts).
export function isStretchName(name: string): boolean {
  return /拉伸|压腿/.test(name);
}

// Barbell: the author records total load (杆+片) already, so we never add a
// 20 kg bar unless a line explicitly says 空杆/杆重. No-op, documented (FR-017).
export function barbellTotalAlreadyReported(): boolean {
  return true;
}
