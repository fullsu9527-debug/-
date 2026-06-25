/* ===== 阶段1-1：原题页筛选改成教师语言 + 更强关键词搜索 =====
 *
 * 不改任何题目数据/编码：层级Ⅰ/Ⅱ/Ⅲ 仍是底层真值，这里只在界面上显示为
 * 基础/进阶/挑战；情境从“研究筛选”里提到主筛选条；关键词搜索扩到所有文本字段
 * 并加教师同义词别名（“刹车/斜面/超速”都能命中）。
 *
 * 作为最后一层覆盖 window.filterProblems / problemCard / miniTags（前面 v15 的版本
 * 是被覆盖对象，本脚本在其之后加载，成为生效版本）。
 */
(function () {
  var esc = window.esc || function (x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  function P() { return window.PROBLEMS || []; }
  function lvl(p) { return p.level || p.d6 || ''; }
  // 层级 → 难度（仅显示用；底层数据不变）
  function diffWord(p) {
    var l = lvl(p);
    if (l.indexOf('Ⅲ') >= 0) return '挑战';
    if (l.indexOf('Ⅱ') >= 0) return '进阶';
    if (l.indexOf('Ⅰ') >= 0) return '基础';
    return l;
  }
  function diffClass(p) {
    var l = lvl(p);
    if (l.indexOf('Ⅲ') >= 0) return 'diff-3';
    if (l.indexOf('Ⅱ') >= 0) return 'diff-2';
    if (l.indexOf('Ⅰ') >= 0) return 'diff-1';
    return 'gray';
  }
  window.diffWord = diffWord;

  // 关键词 → 额外匹配词（教师常用说法）。命中其中任意一个即算匹配。
  var ALIAS = {
    超速: ['限速', '制动', '刹车', '交通', '车痕', '测速'],
    刹车: ['制动', '刹车', '减速', '停车', '匀减速'],
    制动: ['制动', '刹车', '减速', '停车'],
    斜面: ['斜面', '斜', '倾角', '斜坡', '滑块'],
    加速: ['加速', '匀加速', '启动', '起动', '牵引'],
    减速: ['减速', '制动', '匀减速'],
    落体: ['自由落体', '下落', '竖直', '落体'],
    自由落体: ['自由落体', '下落', '竖直'],
    平衡: ['平衡', '共点力', '悬', '细线', '偏角', '风力仪'],
    受力: ['受力', '平衡', '共点力', '力的合成', '力的分解'],
    摩擦: ['摩擦', '动摩擦', '静摩擦', '粗糙', '雪橇', '物资箱'],
    牛顿: ['牛顿', '牛顿第二定律', '加速度', '合力'],
    图像: ['图像', '图象', 'v-t', 'x-t', '坐标', '纸带', '频闪'],
    追及: ['追及', '相遇', '超车', '相撞'],
  };
  function richText(p) {
    var tags = (typeof window.getModelTags === 'function') ? window.getModelTags(p).join(' ') : '';
    return [
      p.code, p.title, p.version, p.module, p.d2, p.situation, p.d1,
      p.figure, p.d3, p.structure, p.d4, p.support, p.d5,
      p.role, p.extend, p.trafficTask, tags, diffWord(p),
    ].join(' ').toLowerCase();
  }
  function matchKeyword(p, q) {
    if (!q) return true;
    var text = richText(p);
    var terms = [q].concat(ALIAS[q] || []);
    for (var i = 0; i < terms.length; i++) {
      if (text.indexOf(String(terms[i]).toLowerCase()) >= 0) return true;
    }
    return false;
  }

  // 生效版筛选：教师语言 + 扩展搜索；结构化下拉沿用既有字段（含 v15 的物理模型）。
  window.filterProblems = function () {
    function val(id) { var e = document.querySelector('#' + id); return e ? e.value : ''; }
    var q = (val('libSearch') || '').trim().toLowerCase();
    var v = val('libVersion'), m = val('libModule'), model = val('libModel'),
      l = val('libLevel'), d1 = val('libD1'), d3 = val('libD3'), d4 = val('libD4'), d5 = val('libD5');
    var getTags = window.getModelTags || function () { return []; };
    return P().filter(function (p) {
      return matchKeyword(p, q)
        && (!v || p.version === v)
        && (!m || (p.module || p.d2) === m)
        && (!model || getTags(p).indexOf(model) >= 0)
        && (!l || (p.level || p.d6) === l)
        && (!d1 || (p.situation || p.d1) === d1)
        && (!d3 || (p.figure || p.d3) === d3)
        && (!d4 || (p.structure || p.d4) === d4)
        && (!d5 || (p.support || p.d5) === d5);
    });
  };

  // 卡片：把醒目的“层级Ⅱ”显示成“进阶”，精确编码仍保留在“详情→D6 层级”里。
  var baseMini = window.miniTags;
  if (baseMini) {
    window.miniTags = function (p) {
      var html = baseMini(p);
      var l = lvl(p);
      if (l) html = html.replace('<span class="tag purple">' + l + '</span>',
        '<span class="tag ' + diffClass(p) + '">' + esc(diffWord(p)) + '</span>');
      return html;
    };
  }
  var baseCard = window.problemCard;
  if (baseCard) {
    window.problemCard = function (p, small) {
      var html = baseCard(p, small);
      var l = lvl(p);
      if (l) html = html.replace('｜' + l + '</p>', '｜' + esc(diffWord(p)) + '</p>');
      return html;
    };
  }

  // 把“情境”从研究筛选提到主筛选条，并把层级下拉改成“难度（基础/进阶/挑战）”。
  function teacherizeToolbar() {
    var search = document.getElementById('libSearch');
    if (search) search.placeholder = '搜关键词或编号：刹车、斜面、超速、传送带、风力仪、RJ-04…';

    // 难度下拉：保留 value=层级Ⅰ/Ⅱ/Ⅲ，只改显示文字。
    var level = document.getElementById('libLevel');
    if (level && !level.dataset.teacherized) {
      var map = { 'Ⅰ': '基础', 'Ⅱ': '进阶', 'Ⅲ': '挑战' };
      level.innerHTML = '<option value="">全部难度</option>'
        + Object.keys(map).map(function (k) {
          return '<option value="层级' + k + '">' + map[k] + '（层级' + k + '）</option>';
        }).join('');
      level.dataset.teacherized = '1';
    }

    // 情境（libD1）：从折叠的研究筛选移到主筛选条，紧跟模块/物理模型之后。
    var d1 = document.getElementById('libD1');
    var toolbar = search ? search.parentElement : null;
    if (d1 && toolbar && d1.parentElement !== toolbar) {
      d1.classList.add('teacher-situation');
      var anchor = document.getElementById('libModel') || document.getElementById('libModule') || document.getElementById('libLevel');
      if (anchor && anchor.parentElement === toolbar) anchor.insertAdjacentElement('afterend', d1);
      else toolbar.insertBefore(d1, document.getElementById('libLevel') || null);
    }
    if (window.renderLibrary) window.renderLibrary();
  }

  // 面板/下拉由前面的脚本在 DOMContentLoaded+120ms 才填充，这里多次补一遍，幂等。
  [200, 400, 800, 1500].forEach(function (t) { setTimeout(teacherizeToolbar, t); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(teacherizeToolbar, 300); });
})();
