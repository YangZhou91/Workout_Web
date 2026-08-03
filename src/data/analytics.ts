// Analytics report, computed in-process at build time (T035 deviation: no
// scripts/parse-log.ts CLI or dist/data/analytics.json emitter — mirrors the
// T011 pattern; the /analytics page imports this module in frontmatter and the
// snapshot/analytics tests exercise the same path). All exclusions (FR-020) and
// gym segmentation (FR-019) are applied upstream in the analytics modules.
import type { AnalyticsReport } from "../types";
import { loadTrainingLog } from "./log";
import { sessionVolumes } from "../analytics/volume";
import { personalRecords } from "../analytics/pr";
import { crossSegmentWarnings, exerciseVolumeTrend } from "../analytics/trends";

export async function computeAnalytics(): Promise<AnalyticsReport> {
  const { workouts } = await loadTrainingLog();
  return {
    generatedAt: new Date().toISOString(),
    sessionVolumes: sessionVolumes(workouts),
    trends: exerciseVolumeTrend(workouts),
    records: personalRecords(workouts),
    crossSegmentWarnings: crossSegmentWarnings(workouts),
  };
}
