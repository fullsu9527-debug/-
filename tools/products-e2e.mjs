// 阶段1-2 verification: 成品/草稿 status badge + 教师备课版标准答案前置.
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
await page.waitForTimeout(800); // let overrides settle

const out = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const host = document.createElement('div');
  host.id = 'testHost';
  document.body.appendChild(host);

  // final product (curated case) + draft skeleton
  const draft = {
    type: '自定义整合成品骨架', summary: '根据所选需求生成可继续人工精修的成品题骨架。',
    labels: ['自定义整合', '待教师精修', '资源包骨架'], title: '草稿示例', stem: '题干……',
    questions: ['问题1', '问题2'], standardAnswer: { steps: ['步骤'], conclusion: '结论' },
    sourceChain: [{ code: 'RJ-01', text: '主用题' }], compare: [['维度', '前', '后']],
    coding: [{ text: 'D6 Ⅰ', arrow: true }, { text: 'Ⅰ→Ⅱ', changed: true }],
  };
  host.innerHTML =
    '<div id="finalWrap">' + window.resourceCard(window.productForCase('traffic-rj')) + '</div>' +
    '<div id="draftWrap">' + window.resourceCard(draft) + '</div>';
  await wait(700); // allow MutationObserver reorder

  const finalPack = host.querySelector('#finalWrap .resource-pack');
  const draftPack = host.querySelector('#draftWrap .resource-pack');
  const tv = finalPack.querySelector('.teacher-view');
  const ans = tv.querySelector('.answer-box');
  // v24 (06-v16-context layer) already folds research into .research-fold-card after the answer.
  const fold = tv.querySelector('.research-fold-card, details');
  const answerBeforeFold = !!(ans && fold && (ans.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING));

  // Real custom-integration products must ALL be drafts, regardless of base problem.
  const realDraftChecks = [];
  const co = document.getElementById('customIntegrationOutput');
  const bp = document.getElementById('baseProblem');
  if (co && bp && window.generateCustomIntegration) {
    for (const idx of [0, 3, 8, 20]) {
      if (idx < bp.options.length) {
        bp.selectedIndex = idx;
        window.generateCustomIntegration();
        await wait(80);
        const pack = co.querySelector('.resource-pack');
        realDraftChecks.push(pack ? pack.classList.contains('is-draft') : null);
      }
    }
  }

  // A product WITH a full standard answer must be final; one WITHOUT must be draft.
  const finalWithAnswer = window.resourceCard(window.productForCase('traffic-rj')); // has standardAnswer
  const noAnswer = window.resourceCard({ id: 'variation_pack_x', type: '变式成品题', summary: '已整理三版', title: 't', stem: 's', questions: ['q'] });
  const withAnswerFinal = /resource-pack[^"]*is-final/.test(finalWithAnswer);
  const noAnswerDraft = /resource-pack[^"]*is-draft/.test(noAnswer);

  return {
    realCustomDraftFlags: realDraftChecks,
    withAnswerFinal, noAnswerDraft,
    finalHasClass: finalPack.classList.contains('is-final'),
    finalBanner: !!finalPack.querySelector('.status-banner.final'),
    finalBannerText: (finalPack.querySelector('.status-banner.final') || {}).textContent || '',
    draftHasClass: draftPack.classList.contains('is-draft'),
    draftBanner: !!draftPack.querySelector('.status-banner.draft'),
    draftBannerText: (draftPack.querySelector('.status-banner.draft') || {}).textContent || '',
    teacherHasAnswer: !!ans,
    teacherHasFold: !!fold,
    answerBeforeFold, // pre-existing v24 structure must remain intact
    foldHasResearch: !!(fold && /来源|依据|对比|编码/.test(fold.textContent)),
  };
});

await browser.close();
server.close();
console.log(JSON.stringify(out, null, 2));
const ok = out.finalHasClass && out.finalBanner && /可直接上课/.test(out.finalBannerText) &&
  out.draftHasClass && out.draftBanner && /需教师精修/.test(out.draftBannerText) &&
  out.teacherHasAnswer && out.teacherHasFold && out.answerBeforeFold && out.foldHasResearch &&
  out.realCustomDraftFlags.length > 0 && out.realCustomDraftFlags.every((x) => x === true) &&
  out.withAnswerFinal && out.noAnswerDraft;
console.log(ok ? '\nPRODUCTS E2E: PASS' : '\nPRODUCTS E2E: FAIL');
process.exit(ok ? 0 : 1);
