/* ===== 阶段1-4：讲义打印加固 + 数值与单位不断行 =====
 *
 * 不改任何题目数据：只在“显示出来的 DOM 文本”里，把数字和单位之间的普通空格换成
 * 不断行空格（U+00A0），避免“5 m/s²”“54 km/h”在行尾被拆开。底层 DATA 里的空格不变。
 * 打印相关的列表加固在 styles.css 的 @media print 里。
 */
(function () {
  // 数字 + 空格 + 单位（长单位在前，避免被短单位先吃掉）。单位后不能再接字母，避免误伤英文。
  var UNIT = /(\d(?:\.\d+)?) (km\/h|m\/s²|m\/s\^2|m\/s|N·m|°C|cm|mm|km|kg|min|rad|Hz|Pa|N|J|W|V|A|°|m|s|g|h)(?![A-Za-z])/g;
  function fixText(s) { return s.replace(UNIT, '$1 $2'); }

  function sweep(root) {
    root = root || document.getElementById('app') || document.body;
    if (!root) return;
    var skip = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1 };
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.parentNode || skip[n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        // 快速预筛：必须含“数字 空格 字母/度”才有处理价值。
        return /\d [A-Za-z°]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var v = fixText(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v; // characterData 改动不触发 childList 观察者
    });
  }
  window.fixUnitSpacing = sweep;

  // 内容是动态渲染的：用（防抖的）MutationObserver 捕获新内容，并在打印前再扫一遍。
  var timer = null;
  if (window.MutationObserver) {
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { sweep(); }, 250);
    }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  }
  window.addEventListener('beforeprint', function () { sweep(); });
  [400, 1200, 2500].forEach(function (ms) { setTimeout(function () { sweep(); }, ms); });
})();
