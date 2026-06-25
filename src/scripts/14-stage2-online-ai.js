/* ===== 阶段2：真·AI 在线生成（可选，默认关闭） =====
 *
 * 复用现有离线逻辑：buildAgentPrompt(panel,kind) 生成结构化提示词 →
 * 这里把它 POST 给 Cloudflare Worker 代理（密钥在后端）→ 把返回结果塞进
 * #{panel}Result → renderAgentResult(panel) 拆成成品题卡片。
 *
 * 接入方式（二选一）：
 *   A. 直接改下面两个常量的默认值；
 *   B. 在本脚本之前定义 window.PHYSICS_AI_CONFIG = { WORKER_URL, ACCESS_TOKEN }。
 *
 * 安全：ACCESS_TOKEN 在前端可见，只抬高门槛、不是鉴权；真正的兜底是在
 * Anthropic 控制台给该 key 设月度花费上限。详见 worker/阶段2_AI后端接入说明.md。
 *
 * 默认 WORKER_URL 为空 = 在线生成关闭，页面与离线版完全一致；离线“复制提示词”
 * 路径始终保留，作为降级方案。
 */
(function () {
  var CFG = (typeof window !== 'undefined' && window.PHYSICS_AI_CONFIG) || {};
  var WORKER_URL = CFG.WORKER_URL || ''; // 例： "https://xxx.your-sub.workers.dev"
  var ACCESS_TOKEN = CFG.ACCESS_TOKEN || ''; // 与 Worker 里设的 ACCESS_TOKEN 相同

  function configured() { return /^https?:\/\//.test(WORKER_URL); }
  function tip(msg) { if (typeof window.toast === 'function') window.toast(msg); }
  function $(id) { return document.getElementById(id); }
  function label(panel) {
    return panel === 'integrateAgent' ? '直接生成整合题（在线）' : '直接生成变式题（在线）';
  }
  function setBusy(panel, busy) {
    var b = $(panel + 'OnlineBtn');
    if (b) { b.disabled = busy; b.textContent = busy ? '生成中…' : label(panel); }
  }

  async function runAgent(panel, kind) {
    if (!configured()) { tip('在线生成未配置：请先在脚本顶部填写 WORKER_URL'); return; }
    try {
      if (typeof window.buildAgentPrompt === 'function') window.buildAgentPrompt(panel, kind);
      var ta = $(panel + 'Prompt');
      var prompt = ta ? (ta.value || '').trim() : '';
      if (!prompt) { tip('没有可发送的提示词'); return; }

      setBusy(panel, true);
      tip('正在在线生成，请稍候…');
      var res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-access-token': ACCESS_TOKEN },
        body: JSON.stringify({ prompt: prompt }),
      });
      var data = {};
      try { data = await res.json(); } catch (e) { /* 非 JSON 响应 */ }
      if (!res.ok || data.error) { tip('生成失败：' + (data.error || res.status)); return; }

      var out = $(panel + 'Result');
      if (out) out.value = data.text || '';
      if (typeof window.renderAgentResult === 'function') window.renderAgentResult(panel);
      tip('已在线生成');
    } catch (e) {
      tip('在线生成出错（网络或跨域），可改用离线“复制提示词”');
    } finally {
      setBusy(panel, false);
    }
  }
  window.runAgent = runAgent;

  // v23 用 `.agent-panel{display:none!important}` 把整个 AI 成品题生成区折叠了。
  // 只有在配置了 Worker（真要用在线生成）时，才重新显示这两个面板并加按钮；
  // 未配置时什么都不做，部署与离线 v24 完全一致。注入幂等，可多次调用。
  function injectButtons() {
    if (!configured()) return;
    [['integrateAgent', 'integration'], ['variationAgent', 'variation']].forEach(function (pair) {
      var panel = pair[0], kind = pair[1];
      var panelEl = $(panel + 'Panel');
      if (!panelEl) return;
      // 覆盖 v23 的 display:none!important（需用 important 才压得过）。
      panelEl.style.setProperty('display', 'block', 'important');
      if ($(panel + 'OnlineBtn')) return;
      var actions = panelEl.querySelector('.agent-actions');
      if (!actions) return;
      var btn = document.createElement('button');
      btn.className = 'primary online-ai-btn';
      btn.id = panel + 'OnlineBtn';
      btn.type = 'button';
      btn.textContent = label(panel);
      btn.onclick = function () { runAgent(panel, kind); };
      actions.appendChild(btn);
    });
  }

  // 面板由前面的脚本延时挂载（300/900/1500/2600ms），这里多次补注入。
  [600, 1100, 2000, 3000].forEach(function (t) { setTimeout(injectButtons, t); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(injectButtons, 1000); });
})();
