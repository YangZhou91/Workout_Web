// Base-path-aware link helper. Astro auto-prefixes bundled assets with `base`,
// but NOT hand-written <a href="/..."> in components — so every internal link
// must go through here to resolve under the GitHub Pages sub-path (SC-005).
const raw = import.meta.env.BASE_URL as string; // '/' in dev, '/Workout_Web' or '/Workout_Web/' in prod
export const BASE_URL = raw.endsWith("/") ? raw : `${raw}/`;

// Joins a site-relative path onto the configured base, always with a single
// joining slash and a trailing slash (directory-style routes for Pages).
// path('full') -> '/Workout_Web/full/'; path('workouts/2026-07-13/') ditto.
export function path(p: string = ""): string {
  const trimmed = p.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `${BASE_URL}${trimmed}/` : BASE_URL;
}

export const homePath = (): string => BASE_URL;
