(function(){
  const V17_OCR_PREFIX='physics_example_ocr_';
  function q(id){return document.getElementById(id)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function txt(el){return (el&&el.textContent||'').trim()}
  function currentPage(){return document.querySelector('.page.active')?.id || 'variation'}
  function getProblems(){return window.PROBLEMS || (window.DATA&&DATA.problems) || []}
  function getByCode(code){return (window.byCode&&byCode[code]) || getProblems().find(p=>p.code===code)}
  function selectedProblem(kind){
    let code='';
    if(kind==='integration') code=q('baseProblem')?.value || q('varProblem')?.value || '';
    else code=q('varProblem')?.value || q('baseProblem')?.value || '';
    return getByCode(code) || getProblems()[0];
  }
  function getElements(p){
    try{ if(typeof extractElements==='function') return extractElements(p); }catch(e){}
    return {情境背景:p?.situation||p?.d1||'需根据原题校对',研究对象:guessObject(p),物理过程:guessProcess(p),已知量:'需结合原题题干或 OCR 校对文本确认',未知量:'需结合原设问确认',核心模型:(p?.modelTags&&p.modelTags[0]) || p?.model || p?.module || p?.d2 || '待判定',求解路径:'提取对象与过程 → 建模 → 列式 → 计算/判断'};
  }
  function guessText(p){return `${p?.code||''} ${p?.title||''} ${p?.module||p?.d2||''} ${p?.situation||p?.d1||''}`}
  function guessObject(p){const s=guessText(p); if(/汽车|刹车|制动|车/.test(s)) return '汽车/车辆'; if(/摩擦|雪橇|冰壶|物资箱|木箱/.test(s)) return /冰壶/.test(s)?'冰壶':'物体/箱子/雪橇'; if(/风力仪|小球|悬|绳|拉索|电灯/.test(s)) return '小球/节点/悬挂物'; if(/电梯|传送带|滑块/.test(s)) return '物体/系统'; return '题干中的研究对象';}
  function guessProcess(p){const s=guessText(p); if(/刹车|制动|限速/.test(s)) return '反应阶段与制动阶段的匀变速直线运动'; if(/冰壶/.test(s)) return '冰面上物体离手后受阻力减速运动'; if(/摩擦|雪橇/.test(s)) return '水平面受力、静止临界或滑动过程'; if(/平衡|风力仪|悬|绳|拉索/.test(s)) return '共点力平衡过程'; if(/牛顿|电梯|传送带/.test(s)) return '受力分析后由合力决定加速度'; return p?.module||p?.d2||'待根据题干判断的物理过程';}
  function modelLabel(p,e){
    if(p?.modelTags&&p.modelTags.length) return p.modelTags.join(' / ');
    try{ if(typeof getModelTags==='function') { const tags=getModelTags(p); if(tags&&tags.length) return tags.join(' / ');} }catch(err){}
    return e.核心模型 || p?.model || p?.module || p?.d2 || '待匹配';
  }
  function correctedText(p){return localStorage.getItem(V17_OCR_PREFIX+(p?.code||'')) || ''}
  function candidateProblems(base,need){
    const ps=getProblems();
    let cand=ps.filter(x=>x&&base&&x.code!==base.code && ((x.module||x.d2)===(base.module||base.d2) || (x.situation||x.d1)===(base.situation||base.d1)));
    cand=cand.slice(0,5); if(!cand.length) cand=ps.filter(x=>x&&base&&x.code!==base.code).slice(0,5); return cand;
  }
  function sourceHint(p){
    const s=guessText(p);
    if(/刹车|制动|限速|交通/.test(s)) return '优先形成“反应阶段—制动阶段—安全距离—限速判断”的问题链。';
    if(/摩擦|雪橇|冰壶/.test(s)) return '优先形成“状态判断—受力分析—动静摩擦区分—公式选择”的问题链。';
    if(/平衡|风力仪|悬|绳|拉索/.test(s)) return '优先形成“情境图—受力图—几何关系图—分力计算”的问题链。';
    return '优先从同一知识模块、同一物理模型、同一情境类型的原题中借鉴要素，避免脱离母题。';
  }
  function directionLabel(){
    const id=window.currentVariationType || 'D6';
    return ({D1:'换情境：保留核心模型，改换更真实的情境外壳',D2:'加知识：联结其他知识模块或前后知识',D3:'改图示：重构情境图、模型图、受力图或过程图',D4:'改结构：从三段式改为案例闭环或任务链',D5:'加提示：增加方法策略、易错提醒或反思评价',D6:'升层级：从计算走向判断、解释、评价或裁决'})[id] || id;
  }
  function motherBlock(p){
    const e=getElements(p); const corr=correctedText(p);
    return `【母题信息】\n编号：${p.code}\n版本：${p.version||''}\n题名：${p.title}\n知识模块：${p.module||p.d2||''}\n情境类型：${p.situation||p.d1||''}\n图示类型：${p.figure||p.d3||''}\n呈现结构：${p.structure||p.d4||''}\n助学栏目：${p.support||p.d5||''}\n认知层级：${p.level||p.d6||''}\n物理模型：${modelLabel(p,e)}\n\n【系统初步识别的母题要素】\n情境背景：${e.情境背景}\n研究对象：${e.研究对象}\n物理过程：${e.物理过程}\n已知量：${e.已知量}\n未知量：${e.未知量}\n核心模型：${e.核心模型}\n求解路径：${e.求解路径}\n\n【已校对题干/OCR文本】\n${corr ? corr : '暂无校对题干。请基于题名、编码、截图信息谨慎生成；如关键信息不足，请在结果中标注“需人工确认”。'}`;
  }
  function agentWorkflow(){
    return `请你先在后台完成“母题解析 → 模型匹配 → 策略设计 → 成品题生成 → 解答校验 → 教学化输出”的 Agent 工作流，但最终输出必须分层：前台先呈现题目，后台材料折叠呈现。不要把分析过程放在最前面。`;
  }
  function outputSpec(){
    return `【输出格式要求：必须按 JSON 输出】\n请只输出一个 JSON 对象，不要使用 Markdown 标题，不要在 JSON 外添加解释。字段如下：\n{\n  "studentVersion": {\n    "title": "题目标题",\n    "stem": "完整题干。要求像教材例题，情境真实、数据合理、可计算。",\n    "questions": ["分层设问1", "分层设问2", "分层设问3"]\n  },\n  "teacherVersion": {\n    "idea": "解题思路，先说明物理过程如何分段或如何建模。",\n    "known": ["已知量1", "已知量2"],\n    "formulas": ["核心公式1", "核心公式2"],\n    "solutionSteps": ["分步计算1", "分步计算2", "分步计算3"],\n    "conclusion": "最终结论，要与计算结果一致。",\n    "mistakes": ["易错点1", "易错点2"],\n    "teacherQuestions": ["教师追问1", "教师追问2"]\n  },\n  "teachingNotes": {\n    "diagram": "具体图示建议",\n    "lessonUse": "适用课型和建议用法",\n    "time": "建议用时"\n  },\n  "researchBasis": {\n    "motherProblem": "母题编号与题名",\n    "motherUnderstanding": "母题原情境、核心模型和原训练目标",\n    "strategy": "本次整合/变式策略",\n    "retainedElements": ["保留要素1", "保留要素2"],\n    "addedElements": ["新增要素1", "新增要素2"],\n    "sourceChain": ["来源1：提供什么", "来源2：提供什么"],\n    "codingChange": "六维编码或认知层级变化",\n    "qualityCheck": ["数据可计算", "单位统一", "过程清楚", "答案与题干一致", "贴合母题"]\n  }\n}\n\n重要：AI 可以在内部分析很多内容，但 JSON 中 studentVersion 必须是可直接给学生看的题目；teacherVersion 是教师展开后才看的解析；researchBasis 是最深层折叠的研究依据。`;
  }
  function buildPrompt(kind){
    const p=selectedProblem(kind); if(!p) return '未找到当前母题。';
    const need=q('needType')?.selectedOptions?.[0]?.textContent || '提升题目质量';
    if(kind==='check'){
      const draft=q(`${currentPage()}AgentResult`)?.value || q(`${currentPage()}AgentPrompt`)?.value || '';
      return `你是一名高中物理教研员与命题审核员。请审核下面这份成品题草稿。重点检查题干是否清楚、数据是否能算通、答案是否正确、结论是否与计算一致、是否贴合母题。\n\n请仍按 JSON 输出，字段为：studentVersion、teacherVersion、teachingNotes、researchBasis。默认 studentVersion 只放题目，不放分析过程。\n\n【待审核草稿】\n${draft || '请在这里粘贴待审核的题目草稿。'}`;
    }
    const baseBlock=motherBlock(p);
    if(kind==='integration'){
      const cand=candidateProblems(p,need);
      return `你是一名高中物理教材例题整合教研 Agent。请在“原题库母题”的基础上，生成一份更贴合母题、更完整、更像教材例题的跨版本整合成品题。\n\n${agentWorkflow()}\n\n${baseBlock}\n\n【本次整合需求】\n${need}\n\n【可借鉴原题资源】\n${cand.map((x,i)=>`${i+1}. ${x.code}《${x.title}》｜${x.version||''}｜${x.module||x.d2||''}｜${x.situation||x.d1||''}｜${x.level||x.d6||''}`).join('\n')}\n\n【整合要求】\n- 不要脱离母题另起炉灶；\n- 生成后的 studentVersion 必须像教材例题，只包含题目标题、完整题干和设问；\n- 母题理解、策略说明、来源链、质量自检不要放在 studentVersion，而要放进 researchBasis；\n- teacherVersion 必须包含完整标准解答，并验算数据；\n- 如果母题信息不足，请在 researchBasis 中标注需人工确认，但 studentVersion 仍要给出可修改的高质量题目草稿。\n\n${sourceHint(p)}\n\n${outputSpec()}`;
    }
    return `你是一名高中物理例题变式改编教研 Agent。请在“原题库母题”的基础上，生成一份更贴合母题、更完整、更像教材例题的变式成品题。\n\n${agentWorkflow()}\n\n${baseBlock}\n\n【本次变式方向】\n${directionLabel()}\n\n【变式要求】\n- 不要只换文字，要保留母题核心模型；\n- studentVersion 只呈现题目，不呈现分析报告；\n- teacherVersion 给完整解析、易错点和教师追问；\n- researchBasis 再说明母题理解、保留要素、改造策略和质量核查；\n- 数据必须可计算，结论必须与答案一致。\n\n${sourceHint(p)}\n\n${outputSpec()}`;
  }
  window.buildAgentPrompt=function(panel,kind){
    const ta=q(panel+'Prompt'); if(!ta) return; ta.value=buildPrompt(kind); ta.focus(); ta.scrollTop=0; if(typeof toast==='function') toast('已生成结构化 AI 提示词，可复制给 Claude');
  }
  window.copyAgentPrompt=async function(panel){
    const ta=q(panel+'Prompt'); if(!ta) return; ta.select();
    try{await navigator.clipboard.writeText(ta.value); if(typeof toast==='function') toast('提示词已复制');}
    catch(e){document.execCommand('copy'); if(typeof toast==='function') toast('提示词已复制');}
  }
  function stripFence(s){return String(s||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()}
  function parseJSONLoose(s){
    const raw=stripFence(s); try{return JSON.parse(raw)}catch(e){}
    const a=raw.indexOf('{'), b=raw.lastIndexOf('}'); if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch(e){}}
    return null;
  }
  function section(s, names){
    const raw=String(s||'');
    for(const name of names){
      const re=new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?(?:[一二三四五六七八九十]+[、.．]\\s*)?${name}\\s*(?:[:：]?|\\n)`,'i');
      const m=raw.match(re); if(m){
        const start=m.index+m[0].length; const rest=raw.slice(start); const next=rest.search(/\n\s*(?:#{1,4}\s*)?(?:[一二三四五六七八九十]+[、.．]\s*)?(学生版|教师版|教学说明|研究依据|质量自检|母题理解|策略说明|标准解答)/);
        return (next>=0?rest.slice(0,next):rest).trim();
      }
    }
    return '';
  }
  function parseMarkdownFallback(s){
    const student=section(s,['学生版成品题','学生版题目','成品题','题目']);
    const teacher=section(s,['教师版标准解答','教师版解析','标准解答','答案解析']);
    const teaching=section(s,['教学说明','教学提示']);
    const research=[section(s,['母题理解']),section(s,['策略说明']),section(s,['质量自检','研究依据'])].filter(Boolean).join('\n\n');
    return {studentVersion:{title:'AI 生成成品题',stem:student||s,questions:[]},teacherVersion:{idea:'',solutionSteps:teacher?[teacher]:[],conclusion:'',mistakes:[],teacherQuestions:[]},teachingNotes:{diagram:teaching,lessonUse:'',time:''},researchBasis:{motherProblem:'',motherUnderstanding:research,strategy:'',retainedElements:[],addedElements:[],sourceChain:[],codingChange:'',qualityCheck:[]},_raw:s};
  }
  function normalizeResult(s){return parseJSONLoose(s) || parseMarkdownFallback(s)}
  function arr(x){return Array.isArray(x)?x:(x?[String(x)]:[])}
  function lines(xs){return arr(xs).map(x=>`• ${esc(x)}`).join('\n')}
  function renderProduct(data, raw){
    const st=data.studentVersion||{}; const tv=data.teacherVersion||{}; const tn=data.teachingNotes||{}; const rb=data.researchBasis||{};
    const title=st.title||'AI 生成成品题'; const stem=st.stem||st.题干||''; const qs=arr(st.questions||st.设问);
    const teacherText=[tv.idea&&`【解题思路】\n${tv.idea}`, arr(tv.known).length&&`【已知量整理】\n${lines(tv.known)}`, arr(tv.formulas).length&&`【公式选择】\n${lines(tv.formulas)}`, arr(tv.solutionSteps).length&&`【分步计算】\n${lines(tv.solutionSteps)}`, tv.conclusion&&`【最终结论】\n${tv.conclusion}`, arr(tv.mistakes).length&&`【易错点】\n${lines(tv.mistakes)}`, arr(tv.teacherQuestions).length&&`【教师追问】\n${lines(tv.teacherQuestions)}`].filter(Boolean).join('\n\n');
    const teachText=[tn.diagram&&`【图示建议】\n${tn.diagram}`, tn.lessonUse&&`【课堂使用】\n${tn.lessonUse}`, tn.time&&`【建议用时】\n${tn.time}`].filter(Boolean).join('\n\n');
    const researchText=[rb.motherProblem&&`【母题来源】\n${rb.motherProblem}`, rb.motherUnderstanding&&`【母题理解】\n${rb.motherUnderstanding}`, rb.strategy&&`【改造策略】\n${rb.strategy}`, arr(rb.retainedElements).length&&`【保留要素】\n${lines(rb.retainedElements)}`, arr(rb.addedElements).length&&`【新增要素】\n${lines(rb.addedElements)}`, arr(rb.sourceChain).length&&`【来源链】\n${lines(rb.sourceChain)}`, rb.codingChange&&`【编码变化】\n${rb.codingChange}`, arr(rb.qualityCheck).length&&`【质量核查】\n${lines(rb.qualityCheck)}`].filter(Boolean).join('\n\n');
    const productText=`${title}\n\n${stem}\n\n${qs.map((x,i)=>`（${i+1}）${x}`).join('\n')}`;
    return `<div class="agent-product"><span class="badge">前台默认只呈现题目成品</span><h4>${esc(title)}</h4><div class="stem">${esc(stem||'未识别到题干。请让 AI 按 JSON 格式重新输出。')}</div>${qs.length?`<ol>${qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="agent-copy-row"><button onclick="navigator.clipboard.writeText(${JSON.stringify(productText)})">复制学生版题目</button></div>${teacherText?`<details class="agent-fold"><summary>答案解析 / 教师使用</summary><div class="fold-body">${esc(teacherText)}</div></details>`:''}${teachText?`<details class="agent-fold"><summary>图示建议 / 教学提示</summary><div class="fold-body">${esc(teachText)}</div></details>`:''}${researchText?`<details class="agent-fold"><summary>研究依据 / 母题理解</summary><div class="fold-body">${esc(researchText)}</div></details>`:''}<details class="agent-fold"><summary>查看 AI 原始输出</summary><div class="fold-body"><div class="agent-raw-preview">${esc(raw)}</div></div></details></div>`;
  }
  window.renderAgentResult=function(panel){
    const v=q(panel+'Result')?.value || ''; const box=q(panel+'Card'); if(!box) return;
    if(!v.trim()){box.innerHTML='<div class="agent-empty">请先粘贴 Claude / ChatGPT 生成的结果。</div>';return;}
    const data=normalizeResult(v); box.innerHTML=renderProduct(data,v);
  }
  function panelHTML(id,kind){
    return `<div class="agent-panel" id="${id}Panel"><h3>AI 成品题生成区</h3><p>AI 可以在后台完成母题理解、策略设计和质量自检，但网页默认只呈现“题目成品”。答案解析、教学提示和研究依据全部折叠，避免页面变成一大段生成报告。</p><div class="agent-steps"><div class="agent-step"><b>1 读懂母题</b>整理情境、对象、过程</div><div class="agent-step"><b>2 生成成品题</b>只把题干和设问放前台</div><div class="agent-step"><b>3 校验答案</b>公式、单位、结论一致</div><div class="agent-step"><b>4 折叠依据</b>教师解析和研究依据后置</div></div><div class="agent-tip">建议先生成结构化提示词，让 Claude / ChatGPT 按 JSON 输出。粘贴回来后，网页会自动拆成“学生版题目—教师版解析—研究依据”三层。</div><div class="agent-actions"><button class="primary" onclick="buildAgentPrompt('${id}','${kind}')">生成${kind==='integration'?'整合':'变式'}题提示词</button><button onclick="buildAgentPrompt('${id}','check')">生成答案校验提示词</button><button onclick="copyAgentPrompt('${id}')">复制提示词</button></div><textarea class="agent-textarea" id="${id}Prompt" placeholder="这里会生成可直接发给 Claude / ChatGPT 的结构化提示词"></textarea><div class="agent-two" style="margin-top:12px"><div><p><b>粘贴 AI 生成结果</b></p><textarea class="agent-textarea" id="${id}Result" style="min-height:180px" placeholder="建议粘贴 JSON 结果；若粘贴 Markdown 长文，系统也会尝试拆分，但效果不如 JSON 稳定。"></textarea><div class="agent-actions"><button class="primary" onclick="renderAgentResult('${id}')">整理为成品题卡片</button></div><p class="agent-muted">原则：AI 可以生成很多，网页只默认展示题目；答案、教学和研究依据按需展开。</p></div><div><p><b>成品题卡片</b></p><div id="${id}Card"><div class="agent-empty">AI 生成结果会在这里整理为“先题目、后解析、再依据”的卡片。</div></div></div></div><div class="agent-small">说明：本试验区不上传数据，也不内置 API Key；真正接入 Agent API 需要后端服务，不能把密钥写进单文件 HTML。</div></div>`;
  }
  function mount(){
    document.querySelectorAll('.print-toolbox').forEach(el=>el.remove());
    document.querySelectorAll('button').forEach(b=>{const t=txt(b); if(/^打印/.test(t)||/讲义/.test(t)) b.classList.add('agent-hide-print');});
    const intSec=q('integrate'); if(intSec && !q('integrateAgentPanel')) intSec.insertAdjacentHTML('beforeend',panelHTML('integrateAgent','integration'));
    const varSec=q('variation'); if(varSec && !q('variationAgentPanel')) varSec.insertAdjacentHTML('beforeend',panelHTML('variationAgent','variation'));
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,300));
  setTimeout(mount,900);
})();
