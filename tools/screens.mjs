// Render real screenshots of the built site, including a live 阶段2 demo
// (online generation via a local mock Worker). Outputs PNGs to scratchpad.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dir = path.resolve(process.argv[2] || 'dist');
const OUT = process.argv[3] || '.';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const types = { '.html': 'text/html', '.webp': 'image/webp', '.css': 'text/css', '.js': 'text/javascript' };

const product = {
  studentVersion: { title: '高速公路湿滑路面的安全车距', stem: '一辆轿车在高速公路上以 30 m/s 匀速行驶。驾驶员发现前方事故，反应时间为 0.6 s，随后以大小为 6 m/s² 的加速度刹车直至停下。已知干燥路面最大制动加速度约 7.5 m/s²，湿滑路面约 4 m/s²。', questions: ['求反应阶段行驶的距离；', '求制动阶段的距离与总停车距离；', '若路面湿滑（a=4 m/s²），在限速 120 km/h 时，安全车距应如何调整？请说明理由。'] },
  teacherVersion: { idea: '把过程分成"反应匀速段"和"匀减速制动段"两段分别处理。', known: ['v0 = 30 m/s', 't_反应 = 0.6 s', 'a = 6 m/s²'], formulas: ['x1 = v0·t', 'x2 = v0² / (2a)', 'x = x1 + x2'], solutionSteps: ['反应距离 x1 = 30 × 0.6 = 18 m', '制动距离 x2 = 30² / (2×6) = 75 m', '总停车距离 x = 18 + 75 = 93 m'], conclusion: '总停车距离约 93 m；湿滑路面 a 减小，制动距离增大，需显著拉大车距。', mistakes: ['忘记加反应阶段距离', '湿滑时仍套用干燥路面加速度'], teacherQuestions: ['若车速提高到 40 m/s，停车距离如何变化？', '为什么"二倍速度"会让制动距离变成约四倍？'] },
  teachingNotes: { diagram: '画 v-t 图：先一段水平线（反应段），再一段斜向下的直线（制动段），面积即位移。', lessonUse: '匀变速直线运动复习课 / 交通安全情境课', time: '约 10 分钟' },
  researchBasis: { motherProblem: 'RJ-01 汽车加速后刹车', motherUnderstanding: '母题考查匀减速直线运动的制动距离计算。', strategy: '在母题基础上增加"反应时间"和"路面条件对比"，把计算题升级为含判断与解释的综合题。', retainedElements: ['匀减速制动模型', '运动学公式'], addedElements: ['反应阶段', '湿滑/干燥路面对比', '安全车距裁决'], sourceChain: ['RJ-01：制动模型与基本数据', 'YJ-16：限速法规情境'], codingChange: '认知层级 Ⅱ → Ⅲ（增加解释与裁决）', qualityCheck: ['数据可计算', '单位统一', '过程清楚', '答案与题干一致', '贴合母题'] },
};

let gotPrompt = '';
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/ai') {
    let body = ''; req.on('data', (c) => (body += c));
    req.on('end', () => { try { gotPrompt = JSON.parse(body).prompt || ''; } catch {} res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ text: JSON.stringify(product) })); });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript((url) => { window.PHYSICS_AI_CONFIG = { WORKER_URL: url, ACCESS_TOKEN: 'demo' }; }, base + 'ai');
await page.goto(base, { waitUntil: 'networkidle' });

const shot = async (name, full = false) => { await page.screenshot({ path: path.join(OUT, name), fullPage: full }); console.log('shot', name); };

// 1) Home
await page.waitForTimeout(400); await shot('01-home.png');

// 2) Library (原题库)
await page.click('.nav button[data-page="library"]'); await page.waitForTimeout(500); await shot('02-library.png');

// 3) 阶段2 online generation live demo on 拓展(variation)
await page.click('.nav button[data-page="variation"]');
await page.waitForSelector('#variationAgentOnlineBtn', { timeout: 6000 });
await page.click('#variationAgentOnlineBtn');
await page.waitForFunction(() => /安全车距/.test(document.querySelector('#variationAgentCard')?.textContent || ''), { timeout: 6000 });
await page.waitForTimeout(300);
await page.$eval('#variationAgentPanel', (el) => el.scrollIntoView());
await page.waitForTimeout(200);
await shot('03-online-generate.png');
// expand the folded teacher answer for a second shot
await page.$$eval('#variationAgentCard details', (ds) => ds.forEach((d) => (d.open = true)));
await page.waitForTimeout(200);
await page.$eval('#variationAgentCard', (el) => el.scrollIntoView());
await shot('04-online-card-expanded.png', true);

await browser.close();
server.close();
console.log('promptLen', gotPrompt.length);
