(function(){
  function $(sel,root=document){return root.querySelector(sel)}
  function $all(sel,root=document){return Array.from(root.querySelectorAll(sel))}
  function showToast(msg){
    if(typeof window.toast==='function') return window.toast(msg);
    let t=$('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600);
  }
  function fallbackCopy(text){
    const ta=document.createElement('textarea');
    ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.left='-9999px';
    document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}
    document.body.removeChild(ta);return ok;
  }
  window.copySmart=async function(text,label='内容'){
    text=String(text||'').trim();
    if(!text){showToast('没有可复制的内容');return false;}
    try{
      if(navigator.clipboard && window.isSecureContext!==false){await navigator.clipboard.writeText(text);showToast(label+'已复制');return true;}
    }catch(e){}
    const ok=fallbackCopy(text);showToast(ok?label+'已复制':'复制失败，请手动选择文本');return ok;
  };

  // 覆盖所有资源包复制，统一使用稳定复制逻辑。
  window.copyResource=function(cardId,view){
    const card=document.getElementById(cardId); if(!card){showToast('未找到题卡');return;}
    const target=card.querySelector(`[data-view="${view}"]`)||card;
    const map={student:'学生版',teacher:'教师版',screen:'投屏版'};
    copySmart(target.innerText,map[view]||'内容');
  };

  // 覆盖 Agent 提示词复制。
  window.copyAgentPrompt=async function(panel){
    const ta=document.getElementById(panel+'Prompt');
    if(!ta){showToast('未找到提示词');return;}
    await copySmart(ta.value,'提示词');
  };

  // 研究层开关文字和状态同步。
  const oldToggle=window.toggleMode;
  function syncResearchSwitch(){
    const on=document.body.classList.contains('research-mode');
    const modeBtn=document.getElementById('modeBtn');
    if(modeBtn) modeBtn.textContent=on?'研究层：已打开':'研究层';
    $all('#researchModeInline button').forEach(btn=>{
      btn.classList.add('research-switch-btn');
      btn.textContent=on?'收起研究层':'打开研究层';
      btn.setAttribute('aria-pressed',on?'true':'false');
    });
  }
  window.toggleMode=function(){
    if(typeof oldToggle==='function') oldToggle(); else document.body.classList.toggle('research-mode');
    syncResearchSwitch();
  };

  // 如果原按钮已经写了 onclick，不改功能，只改样式与文案。
  function polishResearchBox(){
    const box=document.getElementById('researchModeInline');
    if(box){
      const b=box.querySelector('button');
      if(b){b.classList.add('research-switch-btn'); b.onclick=window.toggleMode;}
    }
    syncResearchSwitch();
  }

  // 重新定义 AI 成品题渲染：默认只像“题”，复制按钮也稳定。
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function arr(x){return Array.isArray(x)?x:(x?[String(x)]:[])}
  function lines(xs){return arr(xs).map(x=>'• '+x).join('\n')}
  function renderProductV19(data, raw){
    const st=data.studentVersion||{}; const tv=data.teacherVersion||{}; const tn=data.teachingNotes||{}; const rb=data.researchBasis||{};
    const title=st.title||'AI 生成成品题';
    const stem=st.stem||st.题干||'';
    const qs=arr(st.questions||st.设问);
    const teacherText=[
      tv.idea&&`【解题思路】\n${tv.idea}`,
      arr(tv.known).length&&`【已知量整理】\n${lines(tv.known)}`,
      arr(tv.formulas).length&&`【公式选择】\n${lines(tv.formulas)}`,
      arr(tv.solutionSteps).length&&`【分步计算】\n${lines(tv.solutionSteps)}`,
      tv.conclusion&&`【最终结论】\n${tv.conclusion}`,
      arr(tv.mistakes).length&&`【易错点】\n${lines(tv.mistakes)}`,
      arr(tv.teacherQuestions).length&&`【教师追问】\n${lines(tv.teacherQuestions)}`
    ].filter(Boolean).join('\n\n');
    const teachText=[tn.diagram&&`【图示建议】\n${tn.diagram}`,tn.lessonUse&&`【课堂使用】\n${tn.lessonUse}`,tn.time&&`【建议用时】\n${tn.time}`].filter(Boolean).join('\n\n');
    const researchText=[
      rb.motherProblem&&`【母题来源】\n${rb.motherProblem}`,
      rb.motherUnderstanding&&`【母题理解】\n${rb.motherUnderstanding}`,
      rb.strategy&&`【改造策略】\n${rb.strategy}`,
      arr(rb.retainedElements).length&&`【保留要素】\n${lines(rb.retainedElements)}`,
      arr(rb.addedElements).length&&`【新增要素】\n${lines(rb.addedElements)}`,
      arr(rb.sourceChain).length&&`【来源链】\n${lines(rb.sourceChain)}`,
      rb.codingChange&&`【编码变化】\n${rb.codingChange}`,
      arr(rb.qualityCheck).length&&`【质量核查】\n${lines(rb.qualityCheck)}`
    ].filter(Boolean).join('\n\n');
    const productText=`${title}\n\n${stem}\n\n${qs.map((x,i)=>`（${i+1}）${x}`).join('\n')}`;
    return `<div class="agent-product"><span class="badge">成品题优先呈现</span><h4>${esc(title)}</h4><div class="product-label">题干</div><div class="stem">${esc(stem||'未识别到题干。请让 AI 按 JSON 格式重新输出。')}</div>${qs.length?`<div class="product-label">设问</div><ol class="question-list">${qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="agent-copy-row"><button type="button" onclick="copySmart(${JSON.stringify(productText)},'学生版题目')">复制学生版题目</button></div>${teacherText?`<details class="agent-fold"><summary>答案解析 / 教师使用</summary><div class="fold-body">${esc(teacherText)}</div></details>`:''}${teachText?`<details class="agent-fold"><summary>图示建议 / 教学提示</summary><div class="fold-body">${esc(teachText)}</div></details>`:''}${researchText?`<details class="agent-fold"><summary>研究依据 / 母题理解</summary><div class="fold-body">${esc(researchText)}</div></details>`:''}<details class="agent-fold"><summary>查看 AI 原始输出</summary><div class="fold-body"><div class="agent-raw-preview">${esc(raw)}</div></div></details></div>`;
  }
  // 若原页面存在 normalizeResult，则覆盖 renderAgentResult；否则不动。
  const oldNormalize=window.normalizeResult;
  if(typeof normalizeResult==='function' || typeof oldNormalize==='function'){
    window.renderAgentResult=function(panel){
      const v=(document.getElementById(panel+'Result')||{}).value||'';
      const box=document.getElementById(panel+'Card'); if(!box) return;
      if(!v.trim()){box.innerHTML='<div class="agent-empty">请先粘贴 Claude / ChatGPT 生成的结果。</div>';return;}
      let data;
      try{data=(typeof normalizeResult==='function'?normalizeResult(v):oldNormalize(v));}
      catch(e){data={studentVersion:{title:'AI 生成成品题',stem:v,questions:[]},teacherVersion:{},teachingNotes:{},researchBasis:{}};}
      box.innerHTML=renderProductV19(data,v);
      showToast('已整理为成品题卡片');
    };
  }

  // 给所有普通按钮补 type，避免表单环境下误触发；同时隐藏打印类按钮。
  function polishButtons(){
    $all('button').forEach(btn=>{
      if(!btn.getAttribute('type')) btn.setAttribute('type','button');
      const t=(btn.textContent||'').trim();
      if(/^打印/.test(t)||/讲义导出|打印/.test(t)) btn.style.display='none';
    });
    polishResearchBox();
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(polishButtons,450));
  setTimeout(polishButtons,1000);
  setTimeout(polishButtons,1800);
})();
