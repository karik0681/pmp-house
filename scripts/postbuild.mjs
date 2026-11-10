/* After "ng build": pages that are not prebuilt (the staff cabinet, unknown addresses)
   get the empty app shell, so the browser app starts cleanly there. */
import { copyFileSync, mkdirSync } from 'node:fs';

const out = 'dist/pmp-house/browser';
for (const page of ['admin', 'admin/login']) {
  mkdirSync(`${out}/${page}`, { recursive: true });
  copyFileSync(`${out}/index.csr.html`, `${out}/${page}/index.html`);
}
copyFileSync(`${out}/index.csr.html`, `${out}/404.html`);
console.log('postbuild: app shell copied to /admin, /admin/login and 404.html');
