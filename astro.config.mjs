import { defineConfig } from 'astro/config';

// GitHub Pages project site (T021). Internal links resolve under `base`
// via src/util/url.ts — Astro only auto-prefixes bundled assets, not <a href>.
export default defineConfig({
  site: 'https://yangzhou91.github.io',
  base: '/Workout_Web',
});
