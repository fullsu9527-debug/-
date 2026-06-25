(function(){
  const OCR_PREFIX='physics_example_ocr_';
  function $(id){return document.getElementById(id)}
  function $all(sel,root=document){return Array.from(root.querySelectorAll(sel))}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function arr(x){return Array.isArray(x)?x:(x?[String(x)]:[])}
  function copy(text,label){ if(window.copySmart) return window.copySmart(text,label); navigator.clipboard?.writeText(String(text||'')); }
  function getProblems(){return window.PROBLEMS || (window.DATA&&DATA.problems) || []}
  function byCodeLocal(code){return (window.byCode&&byCode[code]) || getProblems().find(p=>p.code===code)}
  function currentProblemForPanel(panel){
    const isInt=String(panel||'').includes('integrate');
    const code=(isInt?$('baseProblem')?.value:$('varProblem')?.value) || $('varProblem')?.value || $('baseProblem')?.value;
    return byCodeLocal(code)||getProblems()[0]||{};
  }
  function getElementsSafe(p){
    try{if(typeof extractElements==='function') return extractElements(p)}catch(e){}
    const s=`${p.code||''} ${p.title||''} ${p.module||p.d2||''} ${p.situation||p.d1||''}`;
    const traffic=/汽车|刹车|制动|限速|交通/.test(s), friction=/摩擦|雪橇|冰壶/.test(s), balance=/平衡|风力仪|悬|绳|拉索/.test(s);
    return {
      情境背景:p.situation||p.d1||'需根据原题校对',
      研究对象: traffic?'汽车/车辆':friction?'物体/冰壶/雪橇':balance?'小球/节点/悬挂物':'题干中的研究对象',
      物理过程: traffic?'加速、反应与制动的分段运动':friction?'静止、临界或滑动过程':balance?'共点力平衡过程':(p.module||p.d2||'待判定过程'),
      已知量:'需结合母题题干或 OCR 校对文本确认',
      未知量:'需结合原设问确认',
      核心模型: traffic?'交通制动安全 / 匀变速直线运动':friction?'摩擦力临界 / 动静摩擦判断':balance?'共点力平衡 / 力的分解':(p.model||p.module||p.d2||'待匹配模型'),
      求解路径:'提取对象与过程 → 建模 → 列式 → 计算/判断'
    };
  }
  function modelTags(p,e){
    if(p.modelTags&&p.modelTags.length) return p.modelTags.join(' / ');
    try{if(typeof getModelTags==='function'){const t=getModelTags(p); if(t&&t.length) return t.join(' / ')}}catch(e){}
    return e.核心模型||p.model||p.module||p.d2||'待匹配';
  }
  function variationDirection(){
    const id=window.currentVariationType || 'D6';
    return ({D1:'换情境：保留核心模型，改换真实情境外壳',D2:'加知识：联结相关知识模块',D3:'改图示：重构情境图、过程图或受力图',D4:'改结构：组织为任务链或案例闭环',D5:'加提示：增加方法支架、易错提醒或反思评价',D6:'升层级：由计算走向判断、解释、评价或裁决'})[id]||id;
  }
  function needText(){return $('needType')?.selectedOptions?.[0]?.textContent || '提升题目质量'}
  function taskPack(panel,kind){
    const p=currentProblemForPanel(panel); const e=getElementsSafe(p); const corr=localStorage.getItem(OCR_PREFIX+(p.code||''))||'';
    return {
      problem:`${p.code||''}《${p.title||''}》`,
      version:p.version||'',
      module:p.module||p.d2||'',
      situation:p.situation||p.d1||'',
      level:p.level||p.d6||'',
      model:modelTags(p,e),
      object:e.研究对象,
      process:e.物理过程,
      known:e.已知量,
      unknown:e.未知量,
      path:e.求解路径,
      ocr:corr,
      goal:kind==='integration'?`整合需求：${needText()}`:`变式方向：${variationDirection()}`
    };
  }
  function taskText(tp){
    return `母题：${tp.problem}\n版本：${tp.version}\n模块：${tp.module}\n情境：${tp.situation}\n层级：${tp.level}\n物理模型：${tp.model}\n研究对象：${tp.object}\n物理过程：${tp.process}\n已知量：${tp.known}\n未知量：${tp.unknown}\n求解路径：${tp.path}\n目标：${tp.goal}\nOCR/校对题干：${tp.ocr||'暂无；需根据截图或题名谨慎生成，并标注需人工确认。'}`;
  }
  function renderTaskPack(panel,kind){
    const host=$(panel+'Panel'); if(!host) return;
    let d=$(panel+'TaskPack'); if(!d){
      d=document.createElement('details'); d.id=panel+'TaskPack'; d.className='v20-taskpack'; d.open=false;
      const actions=host.querySelector('.agent-actions'); host.insertBefore(d, actions||host.firstChild);
    }
    const tp=taskPack(panel,kind);
    d.innerHTML=`<summary>查看本次生成前的母题任务包</summary><div class="v20-task-grid"><div class="v20-task-item"><b>母题</b>${esc(tp.problem)}｜${esc(tp.version)}</div><div class="v20-task-item"><b>模型</b>${esc(tp.model)}</div><div class="v20-task-item"><b>研究对象</b>${esc(tp.object)}</div><div class="v20-task-item"><b>物理过程</b>${esc(tp.process)}</div><div class="v20-task-item"><b>生成目标</b>${esc(tp.goal)}</div><div class="v20-task-item"><b>层级与模块</b>${esc(tp.module)}｜${esc(tp.level)}</div><div class="v20-task-item v20-task-full"><b>OCR/校对题干</b>${esc(tp.ocr||'暂无校对题干：生成时应提示“需人工确认”，并避免编造母题原始数据。')}</div></div><div class="v20-mini-actions"><button type="button" onclick="copySmart(${JSON.stringify(taskText(tp))},'母题任务包')">复制任务包</button></div>`;
  }
  function v20ExtraInstruction(){
    return `\n\n【v20 额外要求：前台成品题优先】\n1. 你可以在内部完成母题理解、模型匹配、策略设计、解答校验，但最终 JSON 的 studentVersion 只能放“题目本身”，不要放分析报告。\n2. studentVersion.stem 必须像教材例题，包含清楚情境、已知量、单位和求解目标；questions 建议 3—5 问，按“基础计算—过程分析—判断/解释”递进。\n3. teacherVersion.solutionSteps 必须逐步验算，所有数值结论要与题干数据一致。\n4. researchBasis 只放在后台折叠层，包括母题理解、保留要素、增加要素和质量核查。\n5. 如果母题题干信息不足，不要假装完全准确，请在 researchBasis.qualityCheck 中写明“需人工核对原题数据/图示”。\n6. 请严格输出 JSON 对象，不要在 JSON 外写任何说明。`;
  }
  const oldBuild=window.buildAgentPrompt;
  window.buildAgentPrompt=function(panel,kind){
    if(typeof oldBuild==='function') oldBuild(panel,kind);
    const ta=$(panel+'Prompt'); if(ta && !ta.value.includes('【v20 额外要求：前台成品题优先】')) ta.value = ta.value.trim()+v20ExtraInstruction();
    renderTaskPack(panel,kind);
  };
  function stripFence(s){return String(s||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()}
  function parseJSONLoose(s){const raw=stripFence(s); try{return JSON.parse(raw)}catch(e){} const a=raw.indexOf('{'),b=raw.lastIndexOf('}'); if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch(e){}} return null;}
  function section(s,names){const raw=String(s||''); for(const name of names){const re=new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?(?:[一二三四五六七八九十]+[、.．]\\s*)?${name}\\s*(?:[:：]?|\\n)`,'i'); const m=raw.match(re); if(m){const start=m.index+m[0].length; const rest=raw.slice(start); const next=rest.search(/\n\s*(?:#{1,4}\s*)?(?:[一二三四五六七八九十]+[、.．]\s*)?(学生版|教师版|教学说明|研究依据|质量自检|母题理解|策略说明|标准解答)/); return (next>=0?rest.slice(0,next):rest).trim();}} return '';}
  function fallback(s){const student=section(s,['学生版成品题','学生版题目','成品题','题目']); const teacher=section(s,['教师版标准解答','教师版解析','标准解答','答案解析']); const teaching=section(s,['教学说明','教学提示']); const research=[section(s,['母题理解']),section(s,['策略说明']),section(s,['质量自检','研究依据'])].filter(Boolean).join('\n\n'); return {studentVersion:{title:'AI 生成成品题',stem:student||s,questions:[]},teacherVersion:{idea:'',solutionSteps:teacher?[teacher]:[],conclusion:'',mistakes:[],teacherQuestions:[]},teachingNotes:{diagram:teaching,lessonUse:'',time:''},researchBasis:{motherProblem:'',motherUnderstanding:research,strategy:'',retainedElements:[],addedElements:[],sourceChain:[],codingChange:'',qualityCheck:[]},_raw:s};}
  function normalize(s){return parseJSONLoose(s)||fallback(s)}
  function lines(xs){return arr(xs).map(x=>'• '+x).join('\n')}
  function quality(data){
    const st=data.studentVersion||{}, tv=data.teacherVersion||{}, tn=data.teachingNotes||{}, rb=data.researchBasis||{};
    const checks=[
      ['题干完整', String(st.stem||'').length>80],
      ['设问分层', arr(st.questions).length>=3],
      ['有解题思路', !!tv.idea],
      ['有计算步骤', arr(tv.solutionSteps).length>=3],
      ['有最终结论', !!tv.conclusion],
      ['有易错点', arr(tv.mistakes).length>0],
      ['有图示建议', !!tn.diagram],
      ['有母题依据', !!(rb.motherProblem||rb.motherUnderstanding)],
      ['有质量核查', arr(rb.qualityCheck).length>0]
    ];
    const pass=checks.filter(x=>x[1]).length, score=Math.round(pass/checks.length*100);
    return {score,checks};
  }
  function renderV20(data, raw, panel){
    const st=data.studentVersion||{}, tv=data.teacherVersion||{}, tn=data.teachingNotes||{}, rb=data.researchBasis||{};
    const title=st.title||'AI 生成成品题', stem=st.stem||st.题干||'', qs=arr(st.questions||st.设问);
    const teacherText=[tv.idea&&`【解题思路】\n${tv.idea}`, arr(tv.known).length&&`【已知量整理】\n${lines(tv.known)}`, arr(tv.formulas).length&&`【公式选择】\n${lines(tv.formulas)}`, arr(tv.solutionSteps).length&&`【分步计算】\n${lines(tv.solutionSteps)}`, tv.conclusion&&`【最终结论】\n${tv.conclusion}`, arr(tv.mistakes).length&&`【易错点】\n${lines(tv.mistakes)}`, arr(tv.teacherQuestions).length&&`【教师追问】\n${lines(tv.teacherQuestions)}`].filter(Boolean).join('\n\n');
    const teachText=[tn.diagram&&`【图示建议】\n${tn.diagram}`, tn.lessonUse&&`【课堂使用】\n${tn.lessonUse}`, tn.time&&`【建议用时】\n${tn.time}`].filter(Boolean).join('\n\n');
    const researchText=[rb.motherProblem&&`【母题来源】\n${rb.motherProblem}`, rb.motherUnderstanding&&`【母题理解】\n${rb.motherUnderstanding}`, rb.strategy&&`【改造策略】\n${rb.strategy}`, arr(rb.retainedElements).length&&`【保留要素】\n${lines(rb.retainedElements)}`, arr(rb.addedElements).length&&`【新增要素】\n${lines(rb.addedElements)}`, arr(rb.sourceChain).length&&`【来源链】\n${lines(rb.sourceChain)}`, rb.codingChange&&`【编码变化】\n${rb.codingChange}`, arr(rb.qualityCheck).length&&`【质量核查】\n${lines(rb.qualityCheck)}`].filter(Boolean).join('\n\n');
    const productText=`${title}\n\n${stem}\n\n${qs.map((x,i)=>`（${i+1}）${x}`).join('\n')}`;
    const teacherAll=[productText,teacherText,teachText].filter(Boolean).join('\n\n');
    const q=quality(data);
    const qTags=q.checks.map(([name,ok])=>`<span class="${ok?'':'warn'}">${ok?'✓':'待补'} ${esc(name)}</span>`).join('');
    const revisePrompt=`请基于下面这份成品题继续优化，但保持题目贴合母题。重点补足缺失项：${q.checks.filter(x=>!x[1]).map(x=>x[0]).join('、')||'继续润色题干与解析'}。仍按原 JSON 结构输出。\n\n【当前成品题 JSON/原文】\n${raw}`;
    return `<div class="agent-product"><span class="badge">AI Agent 成品题</span><h4>${esc(title)}</h4><div class="v20-subtitle">默认只展示学生看到的题目；答案、教学和研究依据按需展开。</div><div class="product-label">题干</div><div class="stem">${esc(stem||'未识别到题干。请让 AI 按 JSON 格式重新输出。')}</div>${qs.length?`<div class="product-label">设问</div><ol class="question-list">${qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="v20-student-only-note">前台只保留题目成品，避免显示大段生成报告。</div><div class="v20-card-actions"><button class="primary" type="button" onclick="copySmart(${JSON.stringify(productText)},'学生版题目')">复制学生版题目</button><button type="button" onclick="copySmart(${JSON.stringify(teacherAll)},'教师版内容')">复制教师版内容</button><button type="button" onclick="document.getElementById('${panel}Prompt').value=${JSON.stringify(revisePrompt)};copySmart(${JSON.stringify(revisePrompt)},'二次优化提示词')">生成二次优化提示词</button></div><div class="v20-quality"><span class="score">${q.score}分</span>结构完整度检查<div class="quality-tags">${qTags}</div></div>${teacherText?`<details class="agent-fold"><summary>答案解析 / 教师使用</summary><div class="fold-body">${esc(teacherText)}</div></details>`:''}${teachText?`<details class="agent-fold"><summary>图示建议 / 教学提示</summary><div class="fold-body">${esc(teachText)}</div></details>`:''}${researchText?`<details class="agent-fold"><summary>研究依据 / 母题理解</summary><div class="fold-body">${esc(researchText)}</div></details>`:''}<details class="agent-fold"><summary>查看 AI 原始输出</summary><div class="fold-body"><div class="agent-raw-preview">${esc(raw)}</div></div></details></div>`;
  }
  window.renderAgentResult=function(panel){
    const v=($(panel+'Result')||{}).value||'', box=$(panel+'Card'); if(!box) return;
    if(!v.trim()){box.innerHTML='<div class="agent-empty">请先粘贴 Claude / ChatGPT 生成的结果。</div>';return;}
    const data=normalize(v); box.innerHTML=renderV20(data,v,panel); if(window.toast) toast('已按 v20 结构整理为成品题');
  };
  function init(){
    document.title='高中物理例题整合与变式工作台 · v24 交通制动高质量题库版';
    [['integrateAgent','integration'],['variationAgent','variation']].forEach(([panel,kind])=>renderTaskPack(panel,kind));
    $all('.agent-panel h3').forEach(h=>{ if(!h.textContent.includes('结构化')) h.childNodes[h.childNodes.length-1].textContent='AI Agent 结构化生成区'; });
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));
  setTimeout(init,1500); setTimeout(init,2600);
})();
