# Sethu Madhavan V G · 3D Portfolio

A static Angular + Three.js portfolio. Visitors walk through a minimal 3D gallery in first person, collect 5 orbs to discover each section, and press **E** on exhibits to open the content. A plain 2D page (`/classic`) shows the same content and is the default on phones.

## Run

```bash
npm install
npm start            # http://localhost:4200
npm run build        # fetches public GitHub repos, builds to dist/portfolio/browser (+ 404.html)
```

Requires Node 22.22+ or 24.15+.

## Edit the content

| What | Where |
| --- | --- |
| Name, bio, links, education, skills, experience | `src/app/data/portfolio.data.ts` |
| Project titles and descriptions (curated) | `PROJECT_CURATION` in the same file |
| GitHub repo metadata | auto-generated: `scripts/fetch-repos.mjs` → `src/app/data/repos.generated.ts` |
| Resume download button | put a PDF in `public/` and set `links.resume` |

New public repos that aren't curated show up automatically (using the repo description or README). Excluded repos are listed in `scripts/fetch-repos.mjs`.

## Structure

- `src/app/three/`: the engine (`portfolio-world.ts`), first-person controller, canvas-text helpers and one file per station in `world/stations/`.
- `src/app/features/world/`: the 3D page, with intro, HUD/minimap, pause menu, toasts and touch controls.
- `src/app/features/panel/`: the slide-in content panel.
- `src/app/features/classic/`: the 2D page.
- `src/app/core/`: progress (localStorage), synthesized Web Audio sounds, device detection.

## Deploy

`.github/workflows/deploy.yml` builds on every push to `main` (and weekly, so repo data stays fresh) and publishes to GitHub Pages at `https://<user>.github.io/<repo>/`. In the repo settings, set **Pages → Source** to **GitHub Actions**.
