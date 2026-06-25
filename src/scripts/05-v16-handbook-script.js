(function(){
  const H=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function safe(fn, fallback){try{return fn()}catch(e){console.warn('v16',e);return fallback||''}}
  function renameBasic(){
    document.title='高中物理例题整合与变式工作台 · v24 交通制动高质量题库版';
    const brand=document.querySelector('.brand p'); if(brand) brand.textContent='教师备课手册版 · 原题检索 / 整合方案 / 变式改编';
    const pages={library:['原题检索','在六版本必修一例题库中，先按物理模型与教学主题找到可借鉴的母题资源。'],integrate:['整合方案册','先像翻手册一样查看成熟整合方案；需要时再展开自定义整合。'],variation:['母题改编','从一道母题出发，经过“母题要素—改造方向—变式成品”形成可用练习。'],research:['研究依据','这里放论文数据、横向切片与 OCR 等依据性内容，普通备课时可先不进入。']};
    Object.entries(pages).forEach(([id,[h,p]])=>{const sec=document.getElementById(id); if(!sec) return; const title=sec.querySelector('.section-title h2'); const desc=sec.querySelector('.section-title p'); if(title) title.textContent=h; if(desc) desc.textContent=p;});
    const libBtn=document.querySelector('#library .section-title .btn'); if(libBtn) libBtn.textContent='展开更多筛选';
    const customTitle=[...document.querySelectorAll('#integrate .section-title h2')].find(x=>x.textContent.includes('自定义')); if(customTitle){customTitle.textContent='自定义整合（可选）'; const p=customTitle.closest('.section-title')?.querySelector('p'); if(p) p.textContent='成熟案例不能满足时，再按主用题、物理模型和补充目标生成方案。'}
    const vp=[...document.querySelectorAll('#variation .section-title h2')].find(x=>x.textContent.includes('选择改造')); if(vp){vp.textContent='改造方向'; const p=vp.closest('.section-title')?.querySelector('p'); if(p) p.textContent='用教师语言选择改造方向；研究编码放在生成结果中折叠查看。'}
    if(!document.getElementById('homeHandbookLine')){
      const home=document.querySelector('.simple-home .home-menu');
      if(home) home.insertAdjacentHTML('beforebegin','<div id="homeHandbookLine" class="handbook-note"><b>使用顺序：</b>先找同模型原题，再查看整合方案或做变式改编，最后导出学生讲义或教师解析。</div>');
    }
    const r=document.querySelector('#research .section-title');
    if(r && !document.getElementById('researchModeInline')) r.insertAdjacentHTML('afterend','<div id="researchModeInline" class="handbook-note"><b>研究层开关：</b>需要查看完整编码、OCR 校对与高级筛选时再打开。 <button class="btn soft" onclick="toggleMode()">展开/收起研究层</button></div>');
  }
  window.renderIntegrationCases=function(){
    const cases=(window.DATA&&DATA.integrationCases)||[];
    const box=document.querySelector('#integrationCases'); if(!box) return;
    box.innerHTML=cases.map((c,i)=>`<div class="mini-card case-card ${c.id===currentCaseId?'active':''}" onclick="selectCase('${H(c.id)}')"><div class="eyebrow">方案 ${i+1}</div><h3>${H((c.title||'').replace('整合',''))}</h3><p class="meta">${H(c.summary||'')}</p><div class="tags"><span class="tag orange">成品题</span><span class="tag green">可导出讲义</span></div></div>`).join('');
    if(typeof renderCaseOutput==='function') renderCaseOutput();
  };
  window.renderCaseOutput=function(){
    const c=((window.DATA&&DATA.integrationCases)||[]).find(x=>x.id===currentCaseId);
    const out=document.querySelector('#caseOutput'); if(!out||!c) return;
    const codes=c.codes||[]; const all=codes.map(x=>window.byCode&&byCode[x]).filter(Boolean); const first=all[0];
    const prod=safe(()=>productForCase(c.id), null);
    const card=prod?safe(()=>resourceCard(prod),''):'<div class="empty">暂无成品题</div>';
    const steps=(c.steps||[]).map(s=>`<div class="flow-item"><div><b>${H(s.op)}</b><br><span class="tiny">${H((s.codes||[]).join(' + '))}</span></div><div>${H(s.text)}<br><span class="tag gray">${H(typeof roleOfStep==='function'?roleOfStep(s):(s.op||''))}</span></div></div>`).join('');
    out.innerHTML=`<div class="output integrated-product"><div class="eyebrow">整合方案册</div><h3>${H(c.title)}</h3><p class="meta">${H(c.summary||'')}</p><div class="handbook-layer"><div class="layer-kicker">第一层｜学生看到的题</div><h4>整合后的题目成品</h4>${card}</div><div class="handbook-layer"><div class="layer-kicker">第二层｜教师怎么讲</div><h4>教学使用</h4><p>建议先让学生完成学生版题目，再切换教师备课版讲解答案、易错点和追问；讲义打印用于课堂练习或教研展示。</p><p><b>课堂顺序：</b>读题提取信息 → 建立物理模型 → 分层解答 → 比较原题与整合题的提升点。</p></div><details class="research-fold"><summary>展开研究依据：来源链、整合路径与原则复核</summary><div class="output-section"><b>主用题与借鉴题要素</b>${first?renderElements(first):''}</div><div class="output-section"><b>整合路径</b><div class="flow">${steps}</div></div><div class="output-section"><b>原则复核</b><br>互补性：不同原题承担不同功能；课标一致性：围绕核心知识与素养目标；认知梯度：由基础进入判断评价；学情适切性：可按班级基础删减高阶问。</div></details></div>`;
  };
  const oldSelect=window.selectVariationProblem;
  window.selectVariationProblem=function(){ if(oldSelect) oldSelect(); const vm=document.querySelector('#varMother'); if(vm && !vm.querySelector('.handbook-note')) vm.insertAdjacentHTML('afterbegin','<div class="handbook-note"><b>母题原貌：</b>先看题目背后的研究对象、物理过程和核心模型，再决定改哪一处。</div>'); };
  window.generateVariation=function(){
    const p=(window.byCode&&byCode[document.querySelector('#varProblem')?.value])||(window.PROBLEMS&&PROBLEMS[0]); if(!p) return;
    const e=extractElements(p); const out=variationByType(p,e,currentVariationType); const typeMap={D1:'换情境',D2:'加知识',D3:'改图示',D4:'改结构',D5:'加提示',D6:'升层级'};
    const base=safe(()=>vBase(p,e),'generic'); const extra=safe(()=>answerForBase(base),{});
    const res={id:'variation_handbook_'+String(p.code).replace(/[^a-zA-Z0-9]/g,'_'),type:'变式成品题',title:`${p.code}《${p.title}》｜${out.name}`,summary:`按“${typeMap[currentVariationType]||currentVariationType}”改造，生成可练、可讲、可投屏的变式。`,stem:out.stem,questions:out.questions,sourceChain:[{code:p.code,text:'提供母题情境、核心模型与原始设问。'},{code:typeMap[currentVariationType]||currentVariationType,text:'保留核心模型，调整题目外壳、支架或认知任务。'}],compare:[['母题核心',`${p.title}｜${e.核心模型}`,'保留核心模型并重组设问'],['改造方向',`${p.situation||p.d1} / ${p.level||p.d6}`,out.note]],coding:[{text:`原：${p.situation||p.d1}`,arrow:true},{text:`变式后：${(out.code||'').split('/')[0].trim()}`,changed:true},{text:`原：${p.level||p.d6}`,arrow:true},{text:(String(out.code).match(/层级[ⅠⅡⅢ][^/，]*/)||['层级变化'])[0],changed:true}],standardAnswer:extra.standardAnswer,diagram:extra.diagram,solutionPath:out.teach,formulas:base==='traffic'?'s反=v0t；s制=v0²/(2a)':base==='friction'?'f静≤fmax；f滑=μN；F合=ma':base==='balance'?'F=mg·tanθ':base==='fall'?'h=1/2gt²；v=gt':'依据母题模型选择公式',misconception:base==='traffic'?'注意反应时间与单位换算。':base==='friction'?'先判动静，再选摩擦力规则。':base==='balance'?'注意角度与力的几何关系。':'注意模型适用条件。',followUp:'继续改变一个条件，让学生判断模型、路径或结论是否改变。',usage:'可作为课堂练习、课后作业或专题复习中的一环。',qualityCheck:['题干完整','设问清楚','答案可追踪','可导出讲义'],chain:safe(()=>chainForBase(base),[]),labels:['变式改编','含答案','可导出'],tags:[{text:typeMap[currentVariationType]||'变式',kind:'warm'},{text:'教师手册版',kind:'green'}]};
    const target=document.querySelector('#variationOutput'); if(!target) return;
    target.innerHTML=`<div class="output"><div class="eyebrow">母题改编流程</div><h3>${H(p.code)}《${H(p.title)}》的变式结果</h3><div class="handbook-layer"><div class="layer-kicker">第一步｜母题要素</div>${renderElements(p)}</div><div class="handbook-layer"><div class="layer-kicker">第二步｜改造方向</div><h4>${H(typeMap[currentVariationType]||currentVariationType)}</h4><p>${H(out.note||'保留核心模型，调整题目结构。')}</p></div><div class="handbook-layer"><div class="layer-kicker">第三步｜变式成品</div>${resourceCard(res)}</div></div>`;
  };
  function setup(){renameBasic(); if(typeof renderIntegrationCases==='function') renderIntegrationCases(); if(typeof selectVariationProblem==='function') selectVariationProblem();}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,360));
  setTimeout(setup,700);
})();
