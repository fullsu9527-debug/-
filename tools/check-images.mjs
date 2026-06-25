// Targeted check for the split build: identify any 404s and confirm an external
// WebP screenshot actually loads when a problem image is shown.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dir = path.resolve(process.argv[2] || 'dist');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const types = { '.html': 'text/html', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const notFound = [];
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url().replace(base, '/')); });
await page.goto(base, { waitUntil: 'networkidle' });

// Open the first problem's image via the app's own function, then read the <img>.
const imgInfo = await page.evaluate(async () => {
  const code = (window.PROBLEMS || [])[0]?.code;
  if (window.showProblemImage) window.showProblemImage(code);
  await new Promise((r) => setTimeout(r, 400));
  const img = document.querySelector('#modal img, .modal img, #modalBody img');
  if (!img) return { code, found: false };
  if (!img.complete) await new Promise((r) => (img.onload = img.onerror = r));
  return { code, found: true, src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight };
});

await browser.close();
server.close();
console.log(JSON.stringify({ notFound, imgInfo }, null, 2));
