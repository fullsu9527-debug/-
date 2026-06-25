/* ===== 阶段1-3：课堂投屏版 · 分步呈现 =====
 *
 * 不改任何题目数据：在每个成品/草稿卡上加一个“🖥 分步投屏”按钮，点开一个全屏、大字号、
 * 一屏一题的演示器，按 题干 → 圈画已知 → 画模型图 → 列式 → 解答 逐步展开。
 * 数据来自产物对象 r（题干/设问/图示建议/公式/标准答案），不写回任何数据。
 */
(function () {
  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []); }
  var store = (window.__projData = window.__projData || {});

  // 在生效版 resourceCard 外再包一层：登记产物对象 + 注入投屏按钮。
  var base = window.resourceCard;
  if (typeof base === 'function') {
    window.resourceCard = function (r) {
      if (r && !r.id) r.id = 'proj_' + Math.random().toString(36).slice(2);
      if (r) store[r.id] = r;
      var html = base(r);
      if (r) {
        html = html.replace('<div class="copy-row">',
          '<div class="copy-row"><button class="copy-btn proj-btn" onclick="openProjector(\'' + r.id + '\')">🖥 分步投屏</button>');
      }
      return html;
    };
  }

  function buildSteps(r) {
    var stem = esc(r.stem || '');
    var qs = arr(r.questions).map(function (q, i) { return '<li>' + esc(q) + '</li>'; }).join('');
    var qsBlock = qs ? '<ol class="proj-qs">' + qs + '</ol>' : '';
    var ans = r.standardAnswer || {};
    var ansSteps = arr(ans.steps).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var ansBlock = (ansSteps || ans.conclusion)
      ? (ans.overview ? '<p class="proj-lead">' + esc(ans.overview) + '</p>' : '')
        + (ans.known ? '<p class="proj-known"><b>已知：</b>' + esc(ans.known) + '</p>' : '')
        + (ansSteps ? '<ol class="proj-qs">' + ansSteps + '</ol>' : '')
        + (ans.conclusion ? '<p class="proj-concl"><b>结论：</b>' + esc(ans.conclusion) + '</p>' : '')
      : '<p class="proj-muted">本题为草稿骨架，暂无现成解答，请教师板演或用“在线生成”补全。</p>';

    return [
      { tag: '题目', focus: '先把题目读两遍', body: '<div class="proj-stem">' + stem + '</div>' + qsBlock },
      { tag: '① 圈画已知', focus: '圈出题目给出的已知量，标出要求的未知量', body: '<div class="proj-stem hi">' + stem + '</div>' },
      { tag: '② 画模型图', focus: esc(r.diagram || '把情境抽象成受力图 / 运动过程图，标出方向和关键量'), body: '<div class="proj-stem">' + stem + '</div>' },
      { tag: '③ 列式', focus: esc(r.formulas || '根据模型选择公式，列出方程（先列式，再代入）'), body: qsBlock || '<div class="proj-stem">' + stem + '</div>' },
      { tag: '④ 解答', focus: '对照计算，检查单位与结论是否合理', body: ansBlock },
    ];
  }

  var el = null, steps = [], idx = 0;
  function ensureEl() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'projector';
    el.className = 'projector';
    el.innerHTML =
      '<div class="proj-top"><div class="proj-dots"></div>'
      + '<button class="proj-close" title="退出投屏（Esc）" onclick="closeProjector()">✕</button></div>'
      + '<div class="proj-stage"><div class="proj-tag"></div><div class="proj-focus"></div><div class="proj-body"></div></div>'
      + '<div class="proj-nav"><button class="proj-prev" onclick="projStep(-1)">← 上一步</button>'
      + '<span class="proj-count"></span>'
      + '<button class="proj-next" onclick="projStep(1)">下一步 →</button></div>';
    document.body.appendChild(el);
    return el;
  }
  function render() {
    var s = steps[idx]; if (!s) return;
    el.querySelector('.proj-tag').textContent = s.tag;
    el.querySelector('.proj-focus').textContent = s.focus;
    el.querySelector('.proj-body').innerHTML = s.body;
    el.querySelector('.proj-count').textContent = (idx + 1) + ' / ' + steps.length;
    el.querySelector('.proj-prev').disabled = idx === 0;
    el.querySelector('.proj-next').disabled = idx === steps.length - 1;
    el.querySelector('.proj-dots').innerHTML = steps.map(function (_s, i) {
      return '<span class="proj-dot' + (i === idx ? ' on' : '') + '"></span>';
    }).join('');
    if (window.fixUnitSpacing) window.fixUnitSpacing(el); // 投屏里也用不断行单位
  }
  window.openProjector = function (id) {
    var r = store[id]; if (!r) return;
    ensureEl();
    steps = buildSteps(r); idx = 0;
    el.classList.add('open');
    document.body.classList.add('projector-on');
    render();
  };
  window.projStep = function (d) {
    idx = Math.max(0, Math.min(steps.length - 1, idx + d));
    render();
  };
  window.closeProjector = function () {
    if (el) el.classList.remove('open');
    document.body.classList.remove('projector-on');
  };
  document.addEventListener('keydown', function (e) {
    if (!el || !el.classList.contains('open')) return;
    if (e.key === 'Escape') closeProjector();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); projStep(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); projStep(-1); }
  });
})();
