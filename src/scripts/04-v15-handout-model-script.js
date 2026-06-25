(function(){
  const esc2 = window.esc || (x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])));

  // v16-fix：前面的原题库使用 top-level const PROBLEMS，不能通过 window.PROBLEMS 直接访问。
  // 这里显式挂到 window，避免“物理模型”与“决策流程”下拉框空白，检索结果为 0。
  try { if(!window.PROBLEMS && typeof PROBLEMS !== 'undefined') window.PROBLEMS = PROBLEMS; } catch(e) {}
  function getModelTags(p){
    const s = `${p.code||''} ${p.title||''} ${p.role||''} ${p.extend||''} ${p.trafficTask||''} ${p.module||''} ${p.situation||''}`;
    const tags=[];
    function add(t){ if(t && !tags.includes(t)) tags.push(t); }
    if(/制动|刹车|安全|限速|车痕|红灯|追尾|交通|汽车|动车|列车/.test(s)) add('交通制动安全');
    if(/雪橇|摩擦|木箱|书桌|物资箱|传送带|粗糙|拉动/.test(s)) add('摩擦力临界');
    if(/风力仪|悬|细线|偏角|共点|平衡|电灯|鸟笼|结点|节点/.test(s)) add('悬线偏角/共点力平衡');
    if(/斜拉|拉索|桥|起重机|吊臂|工程/.test(s)) add('工程结构受力');
    if(/频闪|纸带|打点|实验|探究/.test(s)) add('实验探究/频闪运动');
    if(/自由落体|下落|竖直|枯井|比萨|椰子/.test(s)) add('自由落体');
    if(/追及|相遇|超车|相撞/.test(s)) add('追及相遇');
    if(/图像|v-t|x-t|坐标/.test(s)) add('运动图像分析');
    if(/牛顿|加速度|牵引|火箭|电梯|超重|失重|传送带/.test(s)) add('牛顿第二定律应用');
    if(!tags.length) add((p.module||p.d2||'一般模型')+'模型');
    return tags;
  }
  window.getModelTags = getModelTags;
  window.getPrimaryModel = p => getModelTags(p)[0] || '一般模型';

  function ensureModelSelect(){
    if(!document.getElementById('libModel')){
      const moduleSel=document.getElementById('libModule');
      if(moduleSel){
        const sel=document.createElement('select');
        sel.id='libModel';
        sel.innerHTML='<option value="">全部物理模型</option>';
        sel.setAttribute('aria-label','物理模型筛选');
        sel.onchange=()=>window.renderLibrary&&window.renderLibrary();
        moduleSel.insertAdjacentElement('afterend',sel);
      }
    }
    const sel=document.getElementById('libModel');
    if(sel && window.PROBLEMS){
      const models=[...new Set(PROBLEMS.flatMap(getModelTags))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
      const old=sel.value;
      sel.innerHTML='<option value="">全部物理模型</option>'+models.map(m=>`<option value="${esc2(m)}">${esc2(m)}</option>`).join('');
      if(models.includes(old)) sel.value=old;
    }
  }

  const oldMiniTags = window.miniTags;
  window.miniTags = function(p){
    const base = oldMiniTags ? oldMiniTags(p) : `<div class="tags"><span class="tag">${esc2(p.version)}</span></div>`;
    const model = getPrimaryModel(p);
    return base.replace('</div>', `<span class="tag model-badge">${esc2(model)}</span></div>`);
  };

  window.filterProblems = function(){
    const q=(document.querySelector('#libSearch')?.value||'').trim().toLowerCase();
    const v=document.querySelector('#libVersion')?.value||'';
    const m=document.querySelector('#libModule')?.value||'';
    const model=document.querySelector('#libModel')?.value||'';
    const l=document.querySelector('#libLevel')?.value||'';
    const d1=document.querySelector('#libD1')?.value||'';
    const d3=document.querySelector('#libD3')?.value||'';
    const d4=document.querySelector('#libD4')?.value||'';
    const d5=document.querySelector('#libD5')?.value||'';
    return (window.PROBLEMS||[]).filter(p=>{
      const text=`${p.code} ${p.title} ${p.version} ${p.module} ${p.situation} ${getModelTags(p).join(' ')}`.toLowerCase();
      return (!q||text.includes(q))&&(!v||p.version===v)&&(!m||(p.module||p.d2)===m)&&(!model||getModelTags(p).includes(model))&&(!l||(p.level||p.d6)===l)&&(!d1||(p.situation||p.d1)===d1)&&(!d3||(p.figure||p.d3)===d3)&&(!d4||(p.structure||p.d4)===d4)&&(!d5||(p.support||p.d5)===d5);
    });
  };
  const oldReset=window.resetLibrary;
  window.resetLibrary=function(){
    if(oldReset) oldReset();
    const m=document.getElementById('libModel'); if(m) m.value='';
    window.renderLibrary&&window.renderLibrary();
  };

  function addPrintToolboxes(){
    if(!document.getElementById('integratePrintBox')){
      const target=document.querySelector('#integrate .section-title');
      if(target){
        target.insertAdjacentHTML('afterend',`<div id="integratePrintBox" class="print-toolbox no-print"><h3>讲义导出 / 打印</h3><p class="meta">把当前整合方案整理为 A4 讲义；可选择学生练习版、教师解析版或课堂投屏版。</p><div class="print-actions"><button class="btn primary" onclick="printHandout('student')">打印学生讲义</button><button class="btn soft" onclick="printHandout('teacher')">打印教师解析讲义</button><button class="btn ghost" onclick="printHandout('screen')">打印课堂投屏版</button></div><p class="print-hint">打印时会自动隐藏导航、按钮和筛选面板，并按 A4 页面排版。</p></div>`);
      }
    }
    if(!document.getElementById('variationPrintBox')){
      const target=document.querySelector('#variation .section-title');
      if(target){
        target.insertAdjacentHTML('afterend',`<div id="variationPrintBox" class="print-toolbox no-print"><h3>变式题讲义导出</h3><p class="meta">生成变式后，可直接打印为学生练习或教师备课材料。</p><div class="print-actions"><button class="btn primary" onclick="printHandout('student')">打印学生变式讲义</button><button class="btn soft" onclick="printHandout('teacher')">打印教师解析讲义</button><button class="btn ghost" onclick="printHandout('screen')">打印投屏版</button></div></div>`);
      }
    }
  }
  window.printHandout=function(type){
    const cls = type==='teacher'?'print-teacher':type==='screen'?'print-screen':'print-student';
    document.body.classList.remove('print-student','print-teacher','print-screen');
    document.body.classList.add('print-mode',cls);
    setTimeout(()=>window.print(),80);
  };
  window.addEventListener('afterprint',()=>document.body.classList.remove('print-mode','print-student','print-teacher','print-screen'));

  function addDecisionWorkflow(){
    if(document.getElementById('decisionWorkflow')) return;
    const grid=document.querySelector('#integrate .grid.cols-2');
    if(!grid) return;
    grid.insertAdjacentHTML('beforebegin',`<div id="decisionWorkflow" class="decision-workflow"><div class="workflow-head"><div><div class="eyebrow">图 3-1 交互化</div><h3>跨版本例题整合决策流程</h3><p class="meta">先判断主用版本该模块是否有例题，再进入“融合 / 补充 / 替换”或“筛选 + 定位”路径。</p></div><button class="btn soft" onclick="runDecisionFlow()">根据当前选择判断</button></div><div class="toolbar"><select id="decisionVersion"></select><select id="decisionModule"></select><select id="decisionNeed"><option value="level">想补认知层级</option><option value="situation">想补情境类型</option><option value="figure">想补图示支架</option><option value="support">想补方法策略</option><option value="model">想找同一物理模型</option></select></div><div class="decision-steps"><div class="decision-step" data-step="start"><b>1 起点判断</b><span>主用版本该课时/模块是否有例题？</span></div><div class="decision-step" data-step="case1"><b>2 情形一</b><span>有例题：融合、补充、替换。</span></div><div class="decision-step" data-step="case2"><b>3 情形二</b><span>无例题：跨版本筛选。</span></div><div class="decision-step" data-step="filter"><b>4 四项过滤</b><span>知识一致、情境适切、层级匹配、呈现兼容。</span></div><div class="decision-step" data-step="product"><b>5 成品输出</b><span>生成整合题、解析与讲义。</span></div></div><div id="decisionResult" class="decision-result">请选择主用版本和模块后点击判断。</div></div>`);
    fillDecisionOptions();
  }
  function fillDecisionOptions(){
    const v=document.getElementById('decisionVersion'), m=document.getElementById('decisionModule');
    const data = window.PROBLEMS || [];
    if(!v||!m||!data.length) return;
    const versions=[...new Set(data.map(p=>p.version).filter(Boolean))];
    const modules=[...new Set(data.map(p=>p.module||p.d2).filter(Boolean))];
    v.innerHTML='<option value="">主用版本</option>'+versions.map(x=>`<option value="${esc2(x)}">${esc2(x)}</option>`).join('');
    m.innerHTML='<option value="">知识模块</option>'+modules.map(x=>`<option value="${esc2(x)}">${esc2(x)}</option>`).join('');
  }
  window.runDecisionFlow=function(){
    const v=document.getElementById('decisionVersion')?.value||'';
    const m=document.getElementById('decisionModule')?.value||'';
    const need=document.getElementById('decisionNeed')?.value||'';
    if(!v || !m){ const box=document.getElementById('decisionResult'); if(box) box.innerHTML='请先选择主用版本和知识模块。'; return; }
    const data = window.PROBLEMS || [];
    const owns=data.filter(p=>p.version===v && (p.module||p.d2)===m);
    const others=data.filter(p=>p.version!==v && (p.module||p.d2)===m).slice(0,8);
    document.querySelectorAll('.decision-step').forEach(x=>x.classList.remove('active'));
    document.querySelector('[data-step="start"]')?.classList.add('active');
    let html='';
    if(owns.length){
      document.querySelector('[data-step="case1"]')?.classList.add('active');
      document.querySelector('[data-step="product"]')?.classList.add('active');
      const recommended = need==='level'?'补充高层级题，形成“入口—主干—裁决”梯度':need==='figure'?'融合图示支架，重构“情境图—受力/运动图—关系图”':need==='support'?'融合方法策略或反思评价栏目':need==='model'?'优先寻找同一物理模型的跨版本异构呈现':'补充情境类型，增强真实任务感';
      html=`<b>判断结果：情形一｜主用版本已有例题</b><br>${esc2(v)}在“${esc2(m)}”模块已有 ${owns.length} 道例题，可先保留主用题，再按需求进行融合、补充或替换。<br><b>建议路径：</b>${recommended}。<br><b>主用候选：</b>${owns.slice(0,5).map(p=>`${p.code} ${p.title}`).join('；')}<br><b>跨版本候选：</b>${others.map(p=>`${p.code} ${p.title}`).join('；')||'暂无'}`;
    }else{
      document.querySelector('[data-step="case2"]')?.classList.add('active');
      document.querySelector('[data-step="filter"]')?.classList.add('active');
      document.querySelector('[data-step="product"]')?.classList.add('active');
      html=`<b>判断结果：情形二｜主用版本该模块暂无例题</b><br>需要从其他版本中筛选知识内容一致、情境适切、层级匹配、呈现兼容的例题，再确定其在新授、练习或复习中的定位。<br><b>可选候选：</b>${others.map(p=>`${p.code} ${p.title}`).join('；')||'暂无，需要进入拓展变式。'}`;
    }
    const box=document.getElementById('decisionResult'); if(box) box.innerHTML=html;
  };

  function addResearchSpotlight(){
    if(document.getElementById('spotlightFindingsV15')) return;
    const title=document.querySelector('#research .section-title');
    if(title){
      title.insertAdjacentHTML('afterend',`<div id="spotlightFindingsV15" class="spotlight-findings"><div class="spotlight-card"><div class="num">1</div><h3>为什么需要补工程情境？</h3><p>“相互作用与力 × 工程技术情境”全样本仅 1 道，说明工程实践类例题在部分模块中存在结构性不足，需要通过跨版本整合或拓展补足。</p></div><div class="spotlight-card"><div class="num">2</div><h3>为什么需要补高阶任务？</h3><p>层级Ⅲ例题占比偏低，且较多集中在运动学模块。整合与变式应承担“基础计算 → 建模分析 → 判断评价”的梯度提升功能。</p></div></div>`);
    }
  }
  function addOCRWarning(){
    const details=document.querySelector('#variation details.research-only');
    if(details && !details.querySelector('.ocr-warning')){
      const p=details.querySelector('p.compact-note');
      const warn=document.createElement('div');
      warn.className='ocr-warning';
      warn.textContent='提示：OCR 仅用于辅助识别，中文题干、公式、上下标和单位可能存在误差。请人工校对后再用于变式生成。';
      (p||details).insertAdjacentElement(p?'afterend':'afterbegin',warn);
    }
  }
  function overrideImageLazy(){
    const old=window.showProblemImage;
    window.showProblemImage=function(code){
      if(old) old(code);
      setTimeout(()=>document.querySelectorAll('#modalBody img').forEach(img=>{img.loading='lazy';img.decoding='async';}),30);
    };
  }
  function setupV15(){
    ensureModelSelect();
    addPrintToolboxes();
    addDecisionWorkflow();
    addResearchSpotlight();
    addOCRWarning();
    overrideImageLazy();
    if(window.renderLibrary) window.renderLibrary();
    if(window.renderAdvancedTable) window.renderAdvancedTable();
    if(window.renderTrafficSlice) window.renderTrafficSlice();
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(setupV15,120));
})();
