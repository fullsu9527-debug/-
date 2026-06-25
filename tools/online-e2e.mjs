// End-to-end test of the 阶段2 online path WITHOUT touching the real Claude API.
// Injects window.PHYSICS_AI_CONFIG pointing at a local mock "Worker" that echoes
// a canned JSON product, then clicks the injected online button and asserts the
// product card renders. Also asserts offline buttons remain.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dir = path.resolve(process.argv[2] || 'dist');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const types = { '.html': 'text/html', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript' };

const product = {
  studentVersion: { title: '测试成品题', stem: '一辆汽车以 20 m/s 行驶，刹车加速度大小为 5 m/s²，求刹车距离。'.repeat(2), questions: ['求刹车时间', '求刹车距离', '判断 3 s 后是否停下'] },
  teacherVersion: { idea: '匀减速直线运动分段分析', known: ['v0=20 m/s', 'a=5 m/s²'], formulas: ['v=v0-at', 'x=v0t-½at²'], solutionSteps: ['t=v0/a=4 s', 'x=v0²/2a=40 m', '3 s 未停'], conclusion: '刹车距离 40 m', mistakes: ['忽略反应距离'], teacherQuestions: ['若湿滑路面如何变化'] },
  teachingNotes: { diagram: 'v-t 图', lessonUse: '匀变速复习课', time: '8 分钟' },
  researchBasis: { motherProblem: 'RJ-01', motherUnderstanding: '汽车制动', strategy: '数据具体化', retainedElements: ['制动模型'], addedElements: ['停车判断'], sourceChain: ['RJ-01:模型'], codingChange: 'Ⅱ→Ⅱ', qualityCheck: ['数据可算'] },
};

let gotPrompt = '';
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/ai') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try { gotPrompt = JSON.parse(body).prompt || ''; } catch {}
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ text: JSON.stringify(product) }));
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const errors = [];
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
page.on('pageerror', (e) => { if (!/Invalid or unexpected token|renderBars/.test(e.message)) errors.push('pageerror: ' + e.message); });
// Configure online mode BEFORE app scripts run.
await page.addInitScript((url) => { window.PHYSICS_AI_CONFIG = { WORKER_URL: url, ACCESS_TOKEN: 'test-token' }; }, base + 'ai');

await page.goto(base, { waitUntil: 'networkidle' });
await page.click('.nav button[data-page="variation"]');
await page.waitForSelector('#variationAgentOnlineBtn', { timeout: 6000 });

const offlineBtns = await page.$$eval('#variationAgentPanel .agent-actions button', (bs) => bs.map((b) => b.textContent.trim()));
await page.click('#variationAgentOnlineBtn');
await page.waitForFunction(() => /测试成品题/.test(document.querySelector('#variationAgentCard')?.textContent || ''), { timeout: 6000 });

const cardText = await page.evaluate(() => document.querySelector('#variationAgentCard')?.textContent || '');
const resultVal = await page.evaluate(() => document.querySelector('#variationAgentResult')?.value || '');

await browser.close();
server.close();

const report = {
  onlineButtonInjected: true,
  offlineButtonsPresent: offlineBtns,
  promptReachedWorker: gotPrompt.length > 0 && /母题信息|变式/.test(gotPrompt),
  resultFilled: resultVal.includes('测试成品题'),
  cardRenderedTitle: /测试成品题/.test(cardText),
  cardHasFoldedAnswer: /答案解析|教师/.test(cardText),
  errors,
};
console.log(JSON.stringify(report, null, 2));
const ok = report.promptReachedWorker && report.resultFilled && report.cardRenderedTitle &&
  report.cardHasFoldedAnswer && offlineBtns.some((t) => /提示词/.test(t)) && errors.length === 0;
console.log(ok ? '\nONLINE E2E: PASS' : '\nONLINE E2E: FAIL');
process.exit(ok ? 0 : 1);
