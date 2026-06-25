# 阶段 2 ｜AI 在线生成后端接入说明

把 `worker.js` 部署成一个 Cloudflare Worker，作为静态站和 Claude 之间的代理。前端不变地留在 GitHub Pages，只多一次 `fetch`。

```
GitHub Pages（静态）──POST 提示词──▶ Cloudflare Worker（存 API key）──▶ Claude API
        ▲                                                                  │
        └──────────────────── 返回生成结果 ◀───────────────────────────────┘
```

---

## 第一件事：先设花费上限（最重要的保险）
公开站点调 AI，端点早晚会被人发现并刷你的额度——费用算你头上。真正兜底的不是前端口令，而是**在 Anthropic 控制台给这个 key 设一个每月花费上限**（Console → Billing / Usage limits 一类菜单，给这个 key 或这个组织设一个你能承受的月度上限，比如几美元）。先做这一步，再往下。

其余三道门（口令、来源校验、频率限制）只是把门槛抬高、过滤掉随手乱调，不是严密鉴权。对答辩演示 + 小范围教师试用，这个组合是够用的。

---

## 部署步骤（Cloudflare 控制台，最省事）

1. **拿 API key**：Anthropic 控制台创建一个 API key，复制备用。顺手把上面的花费上限设好。
2. **建 Worker**：登录 Cloudflare（免费账号即可）→ Workers & Pages → Create → Create Worker → 起个名 → Deploy（先用默认代码占位）。
3. **贴脚本**：进这个 Worker 的 Edit code，把 `worker.js` 全部内容粘进去；把顶部 `ALLOWED_ORIGINS` 里的域名改成你的 Pages 域名（`https://fullsu9527-debug.github.io`，注意不带路径、不带结尾斜杠）。Deploy。
4. **设密钥**：Worker → Settings → Variables and Secrets，添加两个 **Secret**（不是普通变量）：
   - `ANTHROPIC_API_KEY` = 你的 key
   - `ACCESS_TOKEN` = 自己定一个口令字符串（前端要填同一个）
5. **（可选）开频率限制**：Storage & Databases → KV → 建一个命名空间（如 `physics_rl`）→ 回 Worker → Settings → Variables → Bindings 里加一个 KV 绑定，变量名必须叫 **`RL`**，指向该命名空间。不绑 `RL`，脚本会自动跳过限流（那段有 `if (env.RL)` 保护）。
6. **拿 URL**：部署后 Worker 有个 `https://xxx.你的子域.workers.dev` 地址，复制，前端要用。

> 想用命令行也行：`npm i -g wrangler` → `wrangler deploy`，secret 用 `wrangler secret put ANTHROPIC_API_KEY` 设置。控制台路线对单文件项目更简单。

---

## 前端接入（复用现有逻辑，改动很小）

现有的"AI 成品题生成区"已经有 `buildAgentPrompt`（生成提示词填进 `#{id}Prompt`）和 `renderAgentResult`（把 `#{id}Result` 里的结果拆成卡片）。在线生成只是把中间"人工复制粘贴"换成一次请求。

**① 在 JS 顶部加配置：**

```js
const WORKER_URL  = "https://xxx.你的子域.workers.dev"; // 部署后替换
const ACCESS_TOKEN = "改成你在 Worker 里设的同一个口令";   // 注意：前端可见，只是门槛
```

**② 加一个在线生成函数：**

```js
async function runAgent(id, kind){
  try{
    buildAgentPrompt(id, kind);                       // 用现有逻辑生成提示词
    const prompt = document.querySelector('#'+id+'Prompt').value;
    if(!prompt){ window.toast && toast('没有可发送的提示词'); return; }
    window.toast && toast('正在生成，请稍候…');
    const res = await fetch(WORKER_URL, {
      method:'POST',
      headers:{ 'content-type':'application/json', 'x-access-token': ACCESS_TOKEN },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if(!res.ok || data.error){ window.toast && toast('生成失败：'+(data.error||res.status)); return; }
    const out = document.querySelector('#'+id+'Result');
    if(out) out.value = data.text;
    if(typeof renderAgentResult==='function') renderAgentResult(id); // 现有解析→成品题卡片
    window.toast && toast('已生成');
  }catch(e){ window.toast && toast('生成出错'); }
}
```

**③ 在生成面板里加一个按钮**（和现有"生成提示词"按钮并排，用同一套 `${id}` / `${kind}`）：

```html
<button class="primary" onclick="runAgent('面板id','integration')">直接生成（在线）</button>
```

> 注意：这份代码是多代叠加的，`buildAgentPrompt` / `renderAgentResult` / `#{id}Prompt` / `#{id}Result` 的确切名字和生效版本要对照实际文件确认（生效的通常是最后一个定义）。**保留原来"生成提示词→复制"的离线按钮作为降级方案**——花费上限触顶或网络不通时，教师还能走离线路径。

---

## 成本与安全清单（部署完逐条核对）
- [ ] Anthropic 控制台已设月度花费上限（真正的兜底）。
- [ ] 用的是 Sonnet（`claude-sonnet-4-6`），不是默认上 Opus。
- [ ] `MAX_TOKENS` 控制在够用就好（3000 偏宽，题目短可降到 2000）。
- [ ] `ALLOWED_ORIGINS` 只放你自己的 Pages 域名。
- [ ] `ANTHROPIC_API_KEY`、`ACCESS_TOKEN` 都是 Secret，没写进前端、没提交进仓库。
- [ ] 绑了 KV、限流生效（或明确决定不限流）。
- [ ] 离线"复制提示词"按钮仍在，作为降级。

## 老实说一句
前端那个 `ACCESS_TOKEN` 任何人打开开发者工具都能看到，所以它挡得住爬虫和顺手乱调，挡不住铁了心要刷的人。对一篇硕士论文的演示和小范围教师试用，"口令 + 来源校验 + 限流 + 控制台花费上限"这套是相称的；真要做到生产级防护就得上用户登录和服务端会话，那对你这个场景是过度设计。
