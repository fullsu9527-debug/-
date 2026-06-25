/* ===== 阶段1-2：成品 / 草稿骨架 状态角标 =====
 *
 * 不改任何题目数据/编码：只在产物卡（resourceCard）外面加一个醒目的状态角标和底色，
 * 让“成品（可直接上课）”和“草稿骨架（需教师精修）”一眼可分，避免教师把骨架当成品
 * 发给学生。状态由产物自带的 type/summary/labels 文案推断，不写回任何数据。
 *
 * 说明：v24 的 06-v16-context 层已经把“完整标准答案前置、研究依据折叠”的教师备课版
 * 结构做好了；本脚本只补“成品/草稿”角标，并对答案框做视觉强调（见 styles.css）。
 *
 * 本脚本最后加载，包裹的是当前生效版 resourceCard（即 06 层的版本）。
 */
(function () {
  // 成品（可直接上课）必须带一份完整、可验算的标准答案；否则只算草稿骨架。
  function hasFullAnswer(r) {
    var a = r.standardAnswer;
    return !!(a && Array.isArray(a.steps) && a.steps.length >= 2 && a.conclusion);
  }
  function productStatus(r) {
    if (!r) return 'final';
    // 自定义整合产物 id 一律以 custom_ 开头，本质就是“需教师精修”的骨架。
    if (/^custom_/.test(r.id || '')) return 'draft';
    var ans = r.standardAnswer || {};
    var s = [r.type, r.summary, (r.labels || []).join(' '), ans.overview, ans.conclusion].join(' ');
    if (/骨架|精修|草稿|需人工|需教师|待教师/.test(s)) return 'draft';
    // 关键：没有完整可验算标准答案的，不能当“可直接上课”的成品。
    return hasFullAnswer(r) ? 'final' : 'draft';
  }
  function banner(status) {
    if (status === 'draft') {
      return '<div class="status-banner draft">⚠ 草稿骨架 · 需教师精修'
        + '<span>题干与设问已生成，但标准答案需教师补全、核对后，再发给学生。</span></div>';
    }
    return '<div class="status-banner final">✓ 成品 · 可直接上课'
      + '<span>含完整可验算的标准答案，可直接复制使用。</span></div>';
  }

  var base = window.resourceCard;
  if (typeof base === 'function') {
    window.resourceCard = function (r) {
      var html = base(r);
      var status = productStatus(r);
      // 给 .resource-pack 加状态 class，并把角标插为第一个子节点。
      return html.replace(/<div class="resource-pack([^"]*)"([^>]*)>/,
        '<div class="resource-pack$1 is-' + status + '"$2>' + banner(status));
    };
  }
})();
