// GitHub Pages serves 404.html for unknown paths; copying index.html there makes
// deep links such as /classic work with Angular's path-based routing.
import { copyFile } from 'node:fs/promises';

const dir = new URL('../dist/portfolio/browser/', import.meta.url);
await copyFile(new URL('index.html', dir), new URL('404.html', dir));
console.log('[postbuild] wrote 404.html');
