// Headless regression smoke test for the built site.
// Serves a folder over HTTP and drives it in Chromium (playwright-core).
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
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

const errors = [];
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => { if (/\/images\//.test(r.url())) errors.push('imgfail: ' + r.url()); });

await page.goto(base, { waitUntil: 'networkidle' });

const libCount = await page.evaluate(() => document.querySelector('#libCount')?.textContent?.trim());
const problemsLen = await page.evaluate(() => (window.PROBLEMS || []).length);
const firstImg = await page.evaluate(() => {
  const img = document.querySelector('#libraryList img');
  return img ? { src: img.getAttribute('src'), w: img.naturalWidth } : null;
});

// Click through every nav page and confirm it activates.
const pages = await page.$$eval('.nav button[data-page]', (bs) => bs.map((b) => b.dataset.page));
const navResults = {};
for (const id of pages) {
  await page.click(`.nav button[data-page="${id}"]`);
  await page.waitForTimeout(120);
  navResults[id] = await page.evaluate((i) => document.getElementById(i)?.classList.contains('active'), id);
}

await browser.close();
server.close();

const report = { libCount, problemsLen, firstImg, navResults, errors };
console.log(JSON.stringify(report, null, 2));
const ok = problemsLen === 95 && firstImg && firstImg.w > 0 && errors.length === 0 &&
  Object.values(navResults).every(Boolean);
console.log(ok ? '\nSMOKE: PASS' : '\nSMOKE: FAIL');
process.exit(ok ? 0 : 1);
