import { describe, it, expect } from "vitest";
import { loadTrainingLog } from "../src/data/log";

// Pins behavior against the real public/training-log.md. Structural summary
// (no rendered-HTML blobs) so regression diffs stay readable. When new
// notation or workouts change the parse, review and `vitest -u` to accept.
describe("full training-log.md parse (snapshot)", () => {
  it("matches the pinned structural snapshot", async () => {
    const doc = await loadTrainingLog();
    const summary = {
      title: doc.title,
      meta: doc.meta,
      sectionHeadings: doc.documentSections.map((s) => s.heading),
      workouts: doc.workouts.map((w) => ({
        date: w.date,
        weekday: w.weekday,
        status: w.status,
        type: w.type,
        gym: w.gym,
        sessionTime: w.sessionTime,
        authorTotal: w.authorTotal?.raw ?? null,
        groupCount: w.authorTotal?.groupCount ?? null,
        notes: w.notes,
      })),
    };
    expect(summary).toMatchSnapshot();
  });

  it("extracts all 17 dated workouts", async () => {
    const doc = await loadTrainingLog();
    expect(doc.workouts).toHaveLength(17);
  });

  it("covers the full date range", async () => {
    const doc = await loadTrainingLog();
    const dates = doc.workouts.map((w) => w.date);
    expect(dates[0]).toBe("2026-07-13");
    expect(dates[dates.length - 1]).toBe("2026-08-01");
  });
});
