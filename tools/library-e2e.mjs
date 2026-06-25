// 阶段1-1 verification: teacher-language filters + stronger keyword search.
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
const page = await browser.newPage();
await page.goto(base, { waitUntil: 'networkidle' });
await page.click('.nav button[data-page="library"]');
await page.waitForTimeout(900); // let teacherizeToolbar passes run

// keyword search via the app's own filter
async function searchCount(q) {
  return page.evaluate((kw) => {
    const s = document.querySelector('#libSearch'); s.value = kw;
    window.renderLibrary();
    return { count: window.filterProblems().length, listText: document.querySelector('#libraryList').textContent.slice(0, 0) };
  }, q);
}

const kw = {};
for (const q of ['刹车', '斜面', '超速', '传送带', '风力仪']) kw[q] = (await searchCount(q)).count;
await page.evaluate(() => { document.querySelector('#libSearch').value = ''; window.renderLibrary(); });

const ui = await page.evaluate(() => {
  const level = document.querySelector('#libLevel');
  const opts = level ? [...level.options].map((o) => o.textContent) : [];
  const optVals = level ? [...level.options].map((o) => o.value) : [];
  const d1 = document.querySelector('#libD1');
  const toolbarHasSituation = !!(d1 && d1.parentElement === document.querySelector('#libSearch').parentElement);
  // difficulty word shown on first card, precise 层级 still in details
  const firstCardTags = document.querySelector('#libraryList .mini-card .tags')?.textContent || '';
  const total = window.filterProblems().length;
  // pick difficulty 进阶 and check all results are 层级Ⅱ underneath
  level.value = '层级Ⅱ'; window.renderLibrary();
  const onlyII = window.filterProblems().every((p) => (p.level || p.d6).includes('Ⅱ'));
  const advancedCount = window.filterProblems().length;
  level.value = ''; window.renderLibrary();
  return { difficultyOptions: opts, difficultyValues: optVals, toolbarHasSituation, firstCardTags, total, onlyII, advancedCount };
});

await browser.close();
server.close();

const report = { keywordHits: kw, ...ui };
console.log(JSON.stringify(report, null, 2));
const ok =
  kw['刹车'] > 0 && kw['斜面'] > 0 && kw['超速'] > 0 && kw['传送带'] > 0 && kw['风力仪'] > 0 &&
  ui.difficultyOptions.join('|').includes('基础') && ui.difficultyOptions.join('|').includes('挑战') &&
  ui.difficultyValues.includes('层级Ⅰ') && // values/data unchanged
  ui.toolbarHasSituation && /基础|进阶|挑战/.test(ui.firstCardTags) && ui.total === 95 && ui.onlyII;
console.log(ok ? '\nLIBRARY E2E: PASS' : '\nLIBRARY E2E: FAIL');
process.exit(ok ? 0 : 1);
