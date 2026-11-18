/* After "ng build": pages that are not prebuilt (the staff cabinet, unknown addresses)
   get the empty app shell, so the browser app starts cleanly there.
   Then robots.txt and sitemap.xml are written from the prebuilt pages. */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist/pmp-house/browser';
const site = 'https://pmphouse.cz';

/* the sitemap: every prebuilt page, except the cabinet and pages marked "pmp-sitemap: skip" (sample content) */
const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push(p);
  }
})(out);
const urls = pages
  .map(p => ({ p, path: '/' + p.slice(out.length + 1).replace(/index\.html$/, '').replace(/\/$/, '') }))
  .filter(({ path }) => !path.startsWith('/admin'))
  .filter(({ p }) => !/<meta name="pmp-sitemap" content="skip"/.test(readFileSync(p, 'utf8')))
  .map(({ path }) => site + (path === '/' ? '/' : path + '/'))   /* pages are served at addresses ending in '/' */
  .sort();
writeFileSync(`${out}/sitemap.xml`,
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
writeFileSync(`${out}/robots.txt`, `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);

for (const page of ['admin', 'admin/login']) {
  mkdirSync(`${out}/${page}`, { recursive: true });
  copyFileSync(`${out}/index.csr.html`, `${out}/${page}/index.html`);
}
copyFileSync(`${out}/index.csr.html`, `${out}/404.html`);
console.log(`postbuild: sitemap with ${urls.length} pages, robots.txt, app shell for /admin and 404.html`);
