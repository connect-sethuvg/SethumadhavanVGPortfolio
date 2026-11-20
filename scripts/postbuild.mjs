// Runs after `ng build`:
//  1. Stamps the public site URL into index.html (canonical, Open Graph, JSON-LD).
//  2. Writes robots.txt and sitemap.xml.
//  3. Copies index.html to 404.html (GitHub Pages deep-link fallback).
//
// The site URL switches to CUSTOM_DOMAIN automatically once its CNAME points at Azure.
// Override with the SITE_URL env var if needed.
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolveCname } from 'node:dns/promises';

// Preferred public domain, and the Azure Static Web Apps address it points to.
const CUSTOM_DOMAIN = 'sethumadhavan.is-a.dev';
const AZURE_HOST = 'yellow-pond-092dad110.8.azurestaticapps.net';

/** Use the custom domain only once its DNS really points at Azure, so canonical links never break. */
async function pickSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  try {
    const targets = await resolveCname(CUSTOM_DOMAIN);
    if (targets.some((t) => t.replace(/\.$/, '').toLowerCase() === AZURE_HOST)) return `https://${CUSTOM_DOMAIN}`;
  } catch {
    // Not registered yet (or offline): fall through.
  }
  return `https://${AZURE_HOST}`;
}

const SITE_URL = (await pickSiteUrl()).replace(/\/+$/, '');
const PAGES = ['/', '/classic'];

const dir = new URL('../dist/portfolio/browser/', import.meta.url);
const indexUrl = new URL('index.html', dir);

const html = (await readFile(indexUrl, 'utf8')).replaceAll('__SITE_URL__', SITE_URL);
await writeFile(indexUrl, html);
await copyFile(indexUrl, new URL('404.html', dir));

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  new URL('sitemap.xml', dir),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
);
await writeFile(
  new URL('robots.txt', dir),
  `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

console.log(`[postbuild] site URL ${SITE_URL}: wrote index.html, 404.html, sitemap.xml, robots.txt`);
