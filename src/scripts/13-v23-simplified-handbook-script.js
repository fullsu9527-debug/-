(function(){
  const H=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const list=arr=>`<ol>${(arr||[]).map(x=>`<li>${H(x)}</li>`).join('')}</ol>`;
  function answerHtml(a){ if(!a) return '<p>暂无解析。</p>'; return `<p><b>解题思路：</b>${H(a.overview||'先提取信息，再建立模型并分步求解。')}</p>${a.known?`<p><b>已知量：</b>${H(a.known)}</p>`:''}${(a.steps||[]).length?list(a.steps):''}${a.conclusion?`<p><b>结论：</b>${H(a.conclusion)}</p>`:''}`; }
  function sourceHtml(r){ const src=(r.sourceChain||[]).map(s=>`<li><b>${H(s.code||'来源')}</b>：${H(s.text||s)}</li>`).join(''); const qc=(r.qualityCheck||[]).map(x=>`<span class="tag green">${H(x)}</span>`).join(''); return `<p><b>母题关系：</b>${H(r.summary||'保留母题核心模型并进行教学化加工。')}</p>${src?`<ul>${src}</ul>`:''}${qc?`<div class="tags" style="margin-top:10px">${qc}</div>`:''}`; }
  function productSimple(r){ const id=H(r.id||('v23_'+Math.random().toString(36).slice(2))); const q=(r.questions||[]); return `<div class="v23-product-card" id="${id}"><div class="v23-product-head"><span class="v23-product-kicker">${H(r.type||'成品题')}</span><h3>${H(r.title)}</h3><p>${H(r.summary||'前台只展示题目，解析与研究依据按需展开。')}</p></div><div class="v23-student-task"><b>题干</b><div class="v23-stem">${H(r.stem)}</div><b>设问</b><ol class="v23-questions">${q.map(x=>`<li>${H(x)}</li>`).join('')}</ol><div class="v23-toolbar"><button class="v23-mini-btn" onclick="copyResource('${id}','student')">复制学生版</button></div></div><details class="v23-fold"><summary>展开答案解析 / 教师使用</summary><div>${answerHtml(r.standardAnswer)}${r.misconception?`<p><b>易错点：</b>${H(r.misconception)}</p>`:''}${r.followUp?`<p><b>教师追问：</b>${H(r.followUp)}</p>`:''}${r.diagram?`<p><b>图示建议：</b>${H(r.diagram)}</p>`:''}</div></details><details class="v23-fold"><summary>展开研究依据 / 母题关系</summary><div>${sourceHtml(r)}</div></details></div>`; }
  window.renderIntegrationCases=function(){
    const cases=(window.DATA&&DATA.integrationCases)||[]; const box=document.querySelector('#integrationCases'); if(!box) return;
    box.innerHTML=cases.map((c,i)=>`<div class="mini-card case-card ${c.id===window.currentCaseId?'active':''}" onclick="selectCase('${H(c.id)}')"><div class="eyebrow">方案 ${i+1}</div><h3>${H(c.title)}</h3><p class="meta">${H(c.summary||'')}</p></div>`).join('');
    if(typeof window.renderCaseOutput==='function') window.renderCaseOutput();
  };
  window.renderCaseOutput=function(){
    const c=((window.DATA&&DATA.integrationCases)||[]).find(x=>x.id===window.currentCaseId)||((window.DATA&&DATA.integrationCases)||[])[0];
    const out=document.querySelector('#caseOutput'); if(!out||!c) return;
    const r=(typeof window.productForCase==='function')?window.productForCase(c.id):null;
    const stepCount=(c.steps||[]).length;
    out.innerHTML=`<div class="v23-plan-note"><b>阅读顺序：</b>先看整合后的题目成品；答案、教学提示和研究依据默认折叠。当前方案由 ${H((c.codes||[]).slice(0,5).join('、'))}${(c.codes||[]).length>5?'等':''} 提供要素，包含 ${stepCount} 个整合步骤。</div>${r?productSimple(r):'<div class="empty">请选择一个方案查看成品题。</div>'}`;
  };
  function seedStudent(p){return `【${p.title}】\n${p.stem}\n\n${(p.questions||[]).map((q,i)=>`（${i+1}）${q}`).join('\n')}`}
  function seedTeacher(p){return `【${p.title}】\n解题思路：${p.idea||''}\n\n${(p.steps||[]).map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n结论：${p.conclusion||''}\n\n易错点：${(p.mistakes||[]).join('；')}\n图示建议：${p.diagram||''}`}
  window.copySeedProblem=function(id,type){const p=(window.TRAFFIC_SEED_PROBLEMS||[]).find(x=>x.id===id); if(!p) return; const text=type==='teacher'?seedTeacher(p):seedStudent(p); if(window.copySmart) return window.copySmart(text,type==='teacher'?'教师版':'学生版'); navigator.clipboard?.writeText(text);}
  window.renderTrafficSeed=function(){
    const arr=window.TRAFFIC_SEED_PROBLEMS||[]; const listBox=document.getElementById('trafficSeedList'); if(!listBox) return;
    const cover=document.querySelector('#trafficSeedTopic .topic-cover'); if(cover && !cover.classList.contains('v23-topic-cover')) cover.classList.add('v23-topic-cover');
    listBox.innerHTML=arr.map(p=>`<article class="seed-card"><div class="seed-head"><div class="seed-title"><span class="seed-badge">${H(p.tag)}</span><h3>${H(p.id)}｜${H(p.title)}</h3><div class="seed-meta">母题：${H(p.mother)}　模型：${H(p.model)}</div></div></div><div class="seed-body"><div class="seed-stem">${H(p.stem)}</div><ol class="seed-qs">${(p.questions||[]).map(q=>`<li>${H(q)}</li>`).join('')}</ol><div class="seed-actions"><button onclick="copySeedProblem('${H(p.id)}','student')">复制学生版</button><button onclick="copySeedProblem('${H(p.id)}','teacher')">复制教师解析</button></div><details class="seed-fold"><summary>展开答案解析 / 教师使用</summary><div><p><b>解题思路：</b>${H(p.idea)}</p>${list(p.steps)}<p><b>结论：</b>${H(p.conclusion)}</p><div class="seed-two-col"><div><b>易错点</b>${list(p.mistakes)}</div><div><b>图示建议</b><p>${H(p.diagram)}</p></div></div></div></details><details class="seed-fold"><summary>展开研究依据 / 母题关系</summary><div><p>${H(p.research)}</p><p><b>生成意图：</b>${H(p.purpose)}</p></div></details></div></article>`).join('');
  };
  function simplifyLayout(){
    document.title='高中物理例题整合与变式工作台 · v24 交通制动高质量题库版';
    const brand=document.querySelector('.brand p'); if(brand) brand.textContent='找例题 · 看方案 · 生成成品题';
    const integrate=document.querySelector('#integrate .section-title');
    if(integrate && !document.getElementById('v23IntegrateIntro')) integrate.insertAdjacentHTML('beforebegin','<div id="v23IntegrateIntro" class="page-intro-v23"><h2>整合方案册</h2><p>像翻备课手册一样先看成熟方案：多版本原题提供要素，前台只呈现整合后的题目成品。</p></div>');
    const variation=document.querySelector('#variation .section-title');
    if(variation && !document.getElementById('v23VariationIntro')) variation.insertAdjacentHTML('beforebegin','<div id="v23VariationIntro" class="page-intro-v23"><h2>变式题组</h2><p>以 RJ-01 为母题打样，默认展示可直接给学生的题目；解析、教学提示和研究依据按需展开。</p></div>');
    const topic=document.getElementById('trafficSeedTopic'); const firstTitle=document.querySelector('#variation .section-title');
    if(topic && firstTitle && topic.previousElementSibling!==firstTitle) firstTitle.insertAdjacentElement('afterend', topic);
    if(typeof window.renderIntegrationCases==='function') window.renderIntegrationCases();
    if(typeof window.renderTrafficSeed==='function') window.renderTrafficSeed();
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(simplifyLayout,900));
  setTimeout(simplifyLayout,1400);
})();
