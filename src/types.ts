// Parser + analytics data contract (mirrors contracts/data-schema.md).
// Field semantics: data-model.md. Source-line recognition: contracts/source-format.md.

export type Status = "complete" | "partial" | "rest" | "planned";

export type Category = "resistance" | "bodyweight" | "assisted" | "cardio" | "stretch";

export interface SetFlags {
  assisted: boolean;
  bodyweight: boolean;
  excluded: boolean; // 推测 / 不计入 → excluded from metrics
  lowConfidence: boolean; // range/aggregate, no per-set breakdown
}

export interface WorkSet {
  weightKg: number | null;
  originalWeight: string | null;
  perSide: boolean;
  reps: number | null;
  setCount: number; // default 1
  assistKg: number | null;
  flags: SetFlags;
}

export interface Exercise {
  name: string;
  category: Category;
  sets: WorkSet[]; // empty when unparsed (layer 3 / US4)
  unparsed: string | null; // verbatim line when sets is empty
}

export interface AuthorTotal {
  raw: string; // e.g., "3,840 kg 抗阻 + 5 分钟有氧 + 核心 5 组"
  groupCount?: number;
}

export interface SessionTime {
  start?: string; // "HH:MM"
  end?: string;
  durationMin?: number;
}

export interface Workout {
  id: string; // date slug, e.g. "2026-07-13"
  date: string; // ISO YYYY-MM-DD
  weekday: string | null;
  status: Status;
  type: string | null;
  gym: string | null;
  sessionTime: SessionTime | null;
  exercises: Exercise[]; // [] until layer-3 set parsing (US4)
  authorTotal: AuthorTotal | null;
  rawBody: string; // original subsection markdown (verbatim render + fallback)
  notes: string | null;
}

export interface Section {
  heading: string; // e.g. "## 计划目标"
  html: string; // rendered content
}

export interface TrainingLogDocument {
  title: string;
  meta: Record<string, string>;
  documentSections: Section[];
  workouts: Workout[]; // ordered by date
}

// --- Analytics output (computed from Workout[] in US4; always traceable) ---

export interface SessionVolume {
  workoutId: string;
  gym: string | null;
  resistanceVolumeKg: number;
  bodyweightGroupCount: number;
  cardioMinutes: number | null;
  notes: string[];
}

export interface ExerciseTrendPoint {
  exercise: string;
  gym: string | null;
  date: string;
  estimated1RM?: number;
  topWeightKg: number;
  volumeKg: number;
}

export interface PersonalRecord {
  exercise: string;
  gym: string | null;
  weightKg: number;
  workoutId: string;
  asOf: string;
  isEstimated: boolean;
}

export interface AnalyticsReport {
  generatedAt: string;
  sessionVolumes: SessionVolume[];
  trends: ExerciseTrendPoint[];
  records: PersonalRecord[];
  crossSegmentWarnings: string[];
}
