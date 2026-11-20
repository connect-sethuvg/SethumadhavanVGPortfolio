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

## Visitor tracking & sign-in (Firebase)

- Every visitor is counted anonymously: one record per session with 3D/2D mode, referrer site, timezone, language and device. No names are recorded.
- Visitors can optionally **Sign in with Google or GitHub** ("Say hi 👋"), and then you see their name and email.
- **`/admin`** is a private dashboard (Google sign-in, restricted to `ADMIN_EMAILS`). It shows totals, visits per day, referrers, timezones, the people who signed in, recent visits, and a CSV export. Your own visits aren't counted.
- Until it's configured, all of this is switched off and the site behaves as before.

### One-time setup (about 10 minutes)

1. **Create a project** at https://console.firebase.google.com and click **Add app → Web**. Copy the config values into `src/app/core/firebase.config.ts`.
2. In **Authentication → Sign-in method**, enable:
   - **Anonymous**
   - **Google**
   - **GitHub**: create an OAuth app at https://github.com/settings/developers with the callback URL Firebase shows, then paste its Client ID and Client secret into Firebase.
3. In **Authentication → Settings → Authorized domains**, add `connect-sethuvg.github.io`. `localhost` is already there.
4. Go to **Firestore Database → Create database** (production mode). Then open **Rules**, paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
5. Make sure the admin email in `firebase.config.ts` **and** in `firestore.rules` is the Google account you'll use for `/admin`.
6. Optional: enable **Google Analytics** in the Firebase project and copy `measurementId` into the config. That adds country/city and in-game events (sections opened and discovered, achievement unlocked).

## Deploy

The site is hosted on **Azure Static Web Apps (Free plan)** at https://yellow-pond-092dad110.8.azurestaticapps.net.

- `.github/workflows/azure-static-web-apps-*.yml` builds with Node 24 and deploys on every push to `main`, plus a weekly rebuild so repo data stays fresh. Pull requests get preview URLs.
- `public/staticwebapp.config.json` rewrites deep links (`/classic`, `/admin`) to `index.html` and sets the cache headers.
- The deploy token is the repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN_YELLOW_POND_092DAD110`, which Azure created.
- **Custom domain:** in the Azure portal, open Static Web App → **Custom domains → Add**, then add the CNAME/TXT records it shows at your DNS provider. Azure issues HTTPS for free.
- `.github/workflows/deploy.yml` (GitHub Pages) is a manual-only backup.

## SEO

- `src/index.html` holds the title, description, Open Graph/Twitter tags, and Person + WebSite structured data (JSON-LD). A `<noscript>` fallback carries crawlable text.
- `scripts/postbuild.mjs` stamps **`SITE_URL`** into the canonical/OG/JSON-LD tags and writes `sitemap.xml` and `robots.txt`. **To move to a new domain, change `SITE_URL` there** (or set the `SITE_URL` env var in CI).
- `src/app/core/seo.service.ts` updates the canonical URL per route, and `/admin` is `noindex`.
- The share image `public/og-image.png` is rendered from `scripts/og/og-image.html` with headless Chrome.
