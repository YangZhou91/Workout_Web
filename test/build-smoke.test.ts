// T039 — build smoke test. Runs the real build, then asserts every workout
// page and the key routes exist on disk, and that no workout was dropped.
// Unparsed/lowConfidence lines are expected (SC-011) and surface in the build
// report — they are listed, not fatal.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadTrainingLog } from "../src/data/log";

const DIST = "dist";

function built(p: string): boolean {
  return existsSync(join(DIST, p));
}

describe("build smoke (T039)", () => {
  it("`npm run build` exits zero", () => {
    execSync("npm run build", { stdio: "pipe" });
  });

  it("key routes are generated", () => {
    expect(built("index.html")).toBe(true);
    expect(built("full/index.html")).toBe(true);
    expect(built("analytics/index.html")).toBe(true);
  });

  it("every parsed workout has a page", async () => {
    const { workouts } = await loadTrainingLog();
    expect(workouts.length).toBeGreaterThan(0);
    for (const w of workouts) {
      expect(built(`workouts/${w.id}/index.html`), `missing page for ${w.id}`).toBe(true);
    }
  });

  it("no workout heading was dropped", async () => {
    const doc = await loadTrainingLog();
    expect(doc.droppedWorkouts, doc.droppedWorkouts.join("; ")).toEqual([]);
  });
});
