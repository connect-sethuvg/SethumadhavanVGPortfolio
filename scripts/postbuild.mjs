// Runs after `ng build`:
//  1. Stamps the public site URL into index.html (canonical, Open Graph, JSON-LD).
//  2. Writes robots.txt and sitemap.xml.
//  3. Copies index.html to 404.html (GitHub Pages deep-link fallback).
//
// Change SITE_URL here (or set the SITE_URL env var) when the site moves to a new domain.
import { copyFile, readFile, writeFile } from 'node:fs/promises';

const SITE_URL = (process.env.SITE_URL || 'https://yellow-pond-092dad110.8.azurestaticapps.net').replace(/\/+$/, '');
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
