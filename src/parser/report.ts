import type { Status, TrainingLogDocument } from "../types";

export interface BuildReport {
  total: number;
  byStatus: Record<Status, number>;
  dropped: { heading: string; reason: string }[];
  hasIssues: boolean;
}

// Build-time summary of parse health. Surfaced on the index when something
// was dropped; line-level unparsed/lowConfidence tracking is added in US4
// once the set parser exists.
export function buildReport(doc: TrainingLogDocument): BuildReport {
  const byStatus: Record<Status, number> = {
    complete: 0,
    partial: 0,
    rest: 0,
    planned: 0,
  };
  for (const w of doc.workouts) byStatus[w.status]++;

  return {
    total: doc.workouts.length,
    byStatus,
    dropped: doc.droppedWorkouts,
    hasIssues: doc.droppedWorkouts.length > 0,
  };
}
