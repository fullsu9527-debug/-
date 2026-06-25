(function(){
  function byId(id){return document.getElementById(id)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function arr(x){return Array.isArray(x)?x:(x==null||x===''?[]:[String(x)])}
  function stripFence(s){return String(s||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()}
  function parseLoose(s){
    const raw=stripFence(s);
    try{return JSON.parse(raw)}catch(e){}
    const a=raw.indexOf('{'), b=raw.lastIndexOf('}');
    if(a>=0 && b>a){
      let candidate=raw.slice(a,b+1);
      try{return JSON.parse(candidate)}catch(e){}
      // 常见情况：AI 在 JSON 内意外使用了中文引号或末尾逗号，做非常轻量修复。
      candidate=candidate.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/,\s*([}\]])/g,'$1');
      try{return JSON.parse(candidate)}catch(e){}
    }
    return null;
  }
  function section(raw, names){
    const s=String(raw||'');
    for(const name of names){
      const re=new RegExp('(?:^|\\n)\\s*(?:#{1,4}\\s*)?(?:[一二三四五六七八九十]+[、.．]\\s*)?'+name+'\\s*(?:[:：]?|\\n)','i');
      const m=s.match(re); if(!m) continue;
      const start=m.index+m[0].length, rest=s.slice(start);
      const next=rest.search(/\n\s*(?:#{1,4}\s*)?(?:[一二三四五六七八九十]+[、.．]\s*)?(学生版|题目|教师版|标准解答|答案解析|教学说明|教学提示|研究依据|母题理解|策略说明|质量自检)/);
      return (next>=0?rest.slice(0,next):rest).trim();
    }
    return '';
  }
  function fallbackMarkdown(raw){
    const student=section(raw,['学生版成品题','学生版题目','成品题','题目']);
    const teacher=section(raw,['教师版标准解答','教师版解析','标准解答','答案解析']);
    const teach=section(raw,['教学说明','教学提示']);
    const research=[section(raw,['母题理解']),section(raw,['策略说明']),section(raw,['研究依据','质量自检'])].filter(Boolean).join('\n\n');
    // 尝试从学生版里拆标题、题干和设问
    let title='AI 生成成品题', stem=student||String(raw||''), questions=[];
    const tm=stem.match(/(?:题目标题|标题)\s*[:：]?\s*\n?\s*([^\n]+)/);
    if(tm) title=tm[1].replace(/\*\*/g,'').trim();
    const parts=stem.split(/(?:分层设问|设问|问题)\s*[:：]?/);
    if(parts.length>1){stem=parts[0].replace(/(?:题目标题|标题)\s*[:：]?\s*\n?[^\n]+/,'').replace(/(?:完整题干|题干)\s*[:：]?/,'').trim(); questions=parts.slice(1).join('设问').split(/\n+/).map(x=>x.replace(/^\s*(?:[-*]|\d+[.、）)]|[（(]\d+[）)])\s*/,'').trim()).filter(x=>x.length>6);}
    return {studentVersion:{title,stem,questions},teacherVersion:{idea:'',solutionSteps:teacher?[teacher]:[],conclusion:'',mistakes:[],teacherQuestions:[]},teachingNotes:{diagram:teach,lessonUse:'',time:''},researchBasis:{motherProblem:'',motherUnderstanding:research,strategy:'',retainedElements:[],addedElements:[],sourceChain:[],codingChange:'',qualityCheck:[]},_raw:raw};
  }
  function normalize(raw){return parseLoose(raw)||fallbackMarkdown(raw)}
  function lines(xs){return arr(xs).map(x=>'• '+String(x)).join('\n')}
  function textBlock(title, content){return content?`【${title}】\n${content}`:''}
  function quality(data){
    const st=data.studentVersion||{}, tv=data.teacherVersion||{}, tn=data.teachingNotes||{}, rb=data.researchBasis||{};
    const checks=[
      ['题干像例题', String(st.stem||'').length>90 && /[0-9]|km\/h|m\/s|N|s|kg/.test(String(st.stem||''))],
      ['设问分层', arr(st.questions).length>=3],
      ['有解题思路', !!tv.idea],
      ['有公式/已知量', arr(tv.formulas).length>0 || arr(tv.known).length>0],
      ['有计算步骤', arr(tv.solutionSteps).length>=3],
      ['有结论判断', !!tv.conclusion],
      ['有易错点', arr(tv.mistakes).length>0],
      ['有图示建议', !!tn.diagram],
      ['有母题依据', !!(rb.motherProblem||rb.motherUnderstanding||arr(rb.retainedElements).length)],
      ['有质量核查', arr(rb.qualityCheck).length>0]
    ];
    const score=Math.round(checks.filter(x=>x[1]).length/checks.length*100);
    return {score,checks,missing:checks.filter(x=>!x[1]).map(x=>x[0])};
  }
  function copyText(text,label){
    if(window.copySmart) return window.copySmart(String(text||''),label||'内容');
    navigator.clipboard?.writeText(String(text||'')).then(()=>window.toast&&toast((label||'内容')+'已复制')).catch(()=>{const ta=document.createElement('textarea');ta.value=String(text||'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();window.toast&&toast((label||'内容')+'已复制')});
  }
  window.v21Copy = copyText;
  function refinePrompt(data, raw, q){
    return `请继续优化下面这道高中物理成品题。\n\n核心要求：\n1. 前台只保留“题目标题、完整题干、分层设问”；不要把母题分析放在题目之前。\n2. 重点补足这些缺失项：${q.missing.join('、')||'题干语言更像教材例题，解答更简洁准确'}。\n3. 题目必须贴合母题，不要凭空更换物理模型。\n4. 标准解答必须验算，数据、单位、结论一致。\n5. 最终只输出 JSON，不要在 JSON 外写解释。\n\n【当前结果】\n${raw}`;
  }
  function render(data, raw, panel){
    const st=data.studentVersion||{}, tv=data.teacherVersion||{}, tn=data.teachingNotes||{}, rb=data.researchBasis||{};
    const title=st.title||'AI 生成成品题';
    const stem=st.stem||st.题干||'';
    const qs=arr(st.questions||st.设问);
    const teacherText=[
      textBlock('解题思路', tv.idea),
      arr(tv.known).length&&textBlock('已知量整理', lines(tv.known)),
      arr(tv.formulas).length&&textBlock('公式选择', lines(tv.formulas)),
      arr(tv.solutionSteps).length&&textBlock('分步计算', lines(tv.solutionSteps)),
      textBlock('最终结论', tv.conclusion),
      arr(tv.mistakes).length&&textBlock('易错点', lines(tv.mistakes)),
      arr(tv.teacherQuestions).length&&textBlock('教师追问', lines(tv.teacherQuestions))
    ].filter(Boolean).join('\n\n');
    const teachText=[textBlock('图示建议',tn.diagram),textBlock('课堂使用',tn.lessonUse),textBlock('建议用时',tn.time)].filter(Boolean).join('\n\n');
    const researchText=[
      textBlock('母题来源', rb.motherProblem), textBlock('母题理解', rb.motherUnderstanding), textBlock('改造策略', rb.strategy),
      arr(rb.retainedElements).length&&textBlock('保留要素',lines(rb.retainedElements)), arr(rb.addedElements).length&&textBlock('新增要素',lines(rb.addedElements)),
      arr(rb.sourceChain).length&&textBlock('来源链',lines(rb.sourceChain)), textBlock('编码变化',rb.codingChange), arr(rb.qualityCheck).length&&textBlock('质量核查',lines(rb.qualityCheck))
    ].filter(Boolean).join('\n\n');
    const productText=`${title}\n\n${stem}\n\n${qs.map((x,i)=>`（${i+1}）${x}`).join('\n')}`;
    const teacherAll=[productText,teacherText,teachText].filter(Boolean).join('\n\n');
    const q=quality(data); const rp=refinePrompt(data, raw, q);
    const tags=q.checks.map(([name,ok])=>`<span class="${ok?'':'warn'}">${ok?'✓':'待补'} ${esc(name)}</span>`).join('');
    return `<div class="agent-v21-product"><div class="agent-v21-kicker">AI整理后的前台成品题</div><h4>${esc(title)}</h4><div class="agent-v21-section-title">题干</div><div class="agent-v21-stem">${esc(stem||'未识别到题干。请让 AI 按 JSON 格式重新输出。')}</div>${qs.length?`<div class="agent-v21-section-title">设问</div><ol class="agent-v21-questions">${qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="agent-v21-actions"><button class="primary" type="button" onclick="v21Copy(${JSON.stringify(productText)},'学生版题目')">复制学生版题目</button><button type="button" onclick="v21Copy(${JSON.stringify(teacherAll)},'教师版解析')">复制教师版解析</button><button type="button" onclick="document.getElementById('${panel}Prompt').value=${JSON.stringify(rp)};v21Copy(${JSON.stringify(rp)},'二次精修提示词')">复制二次精修提示词</button></div><div class="agent-v21-quality"><span class="score">${q.score}分</span>成品题结构检查<div class="agent-v21-tags">${tags}</div><div class="agent-v21-mini">分数只检查结构完整度，不替代教师对物理正确性与教学适切性的判断。</div></div>${teacherText?`<details class="agent-v21-fold"><summary>答案解析 / 教师使用</summary><div class="agent-v21-body">${esc(teacherText)}</div></details>`:''}${teachText?`<details class="agent-v21-fold"><summary>图示建议 / 教学提示</summary><div class="agent-v21-body">${esc(teachText)}</div></details>`:''}${researchText?`<details class="agent-v21-fold"><summary>研究依据 / 母题理解</summary><div class="agent-v21-body">${esc(researchText)}</div></details>`:''}<details class="agent-v21-fold"><summary>AI 原始输出 / 调试用</summary><div class="agent-v21-body">${esc(raw)}</div></details></div>`;
  }
  const oldBuild=window.buildAgentPrompt;
  window.buildAgentPrompt=function(panel,kind){
    if(oldBuild) oldBuild(panel,kind);
    const ta=byId(panel+'Prompt'); if(!ta) return;
    const extra=`\n\n【v21 呈现约束】\n- 请把“题目成品”与“后台依据”彻底分开。\n- studentVersion 中只能放学生看到的内容：title、stem、questions。不要放母题理解、策略说明、质量核查。\n- teacherVersion 中放解题思路、已知量、公式、分步计算、结论、易错点、教师追问。\n- teachingNotes 中放图示建议、课堂使用、建议用时。\n- researchBasis 中放母题来源、保留要素、新增要素、来源链、编码变化、质量核查。\n- 最终只输出一个 JSON 对象，不要输出 Markdown 大纲。`;
    if(!ta.value.includes('【v21 呈现约束】')) ta.value += extra;
    const panelEl=byId(panel+'Panel');
    if(panelEl && !panelEl.querySelector('.v21-prompt-rule')){
      const note=document.createElement('div'); note.className='v21-prompt-rule';
      note.textContent='v21规则：AI可以深度分析，但网页前台只显示题目；答案、教学和研究依据默认折叠。';
      const actions=panelEl.querySelector('.agent-actions'); if(actions) actions.insertAdjacentElement('afterend', note);
    }
  };
  window.renderAgentResult=function(panel){
    const v=byId(panel+'Result')?.value||''; const box=byId(panel+'Card'); if(!box) return;
    if(!v.trim()){box.innerHTML='<div class="agent-v21-empty">请先粘贴 Claude / ChatGPT 生成的 JSON 或结果文本。</div>';return;}
    const data=normalize(v); box.innerHTML=render(data,v,panel);
    box.scrollIntoView({behavior:'smooth',block:'start'});
  };
  function polishPanels(){
    document.querySelectorAll('.agent-panel .agent-textarea[id$="Result"]').forEach(ta=>{
      ta.placeholder='优先粘贴 JSON 结果。网页会把它整理成：前台题目 + 折叠答案 + 折叠研究依据。';
    });
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(polishPanels,600));
  setTimeout(polishPanels,1200);
})();
