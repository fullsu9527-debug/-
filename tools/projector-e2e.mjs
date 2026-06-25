// 阶段1-3 verification: stepped projection presenter.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dir = path.resolve(process.argv[2] || 'dist');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const types = { '.html': 'text/html', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// Render a curated case (with full answer), open its projector via the injected button.
await page.evaluate(() => {
  const h = document.createElement('div'); h.id = 'ph'; document.getElementById('app').appendChild(h);
  h.innerHTML = window.resourceCard(window.productForCase('traffic-rj'));
});
await page.click('#ph .proj-btn');
await page.waitForSelector('#projector.open', { timeout: 4000 });

const stepTags = [];
for (let i = 0; i < 5; i++) {
  stepTags.push(await page.textContent('#projector .proj-tag'));
  if (i < 4) await page.click('#projector .proj-next');
  await page.waitForTimeout(80);
}
const lastBody = await page.textContent('#projector .proj-body'); // step ④ 解答
const nextDisabledAtEnd = await page.evaluate(() => document.querySelector('#projector .proj-next').disabled);
const count = await page.textContent('#projector .proj-count');
// keyboard back to start
await page.keyboard.press('ArrowLeft');
const afterLeft = await page.textContent('#projector .proj-count');
// Esc closes
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const closed = await page.evaluate(() => !document.querySelector('#projector').classList.contains('open'));

await browser.close();
server.close();
const report = { stepTags, count, nextDisabledAtEnd, answerHasNumbers: /\d/.test(lastBody) && /结论|m\/s|km\/h|=/.test(lastBody), afterLeft, closed };
console.log(JSON.stringify(report, null, 2));
const ok = stepTags.length === 5 && /题目/.test(stepTags[0]) && /圈画/.test(stepTags[1]) &&
  /模型图/.test(stepTags[2]) && /列式/.test(stepTags[3]) && /解答/.test(stepTags[4]) &&
  nextDisabledAtEnd && report.answerHasNumbers && afterLeft === '4 / 5' && closed;
console.log(ok ? '\nPROJECTOR E2E: PASS' : '\nPROJECTOR E2E: FAIL');
process.exit(ok ? 0 : 1);
