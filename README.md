# 高中物理例题整合与变式工作台

面向一线高中物理教师的单页 Web 应用，配套硕士论文《多版本高中物理教材例题资源的整合与拓展策略研究——以必修1为例》。
用于必修一的备课、组题、改题、出讲义和课堂投屏。以六版必修一全部 **95 道**教材例题的**六维编码总表（D1–D6）**为唯一数据源。

> 项目约定、数据红线与分阶段工作计划见根目录 **`CLAUDE.md`**（改任何东西前先读）。

## 五个页面

首页 / 原题库（library）/ 整合策略（integrate）/ 拓展策略（variation）/ 研究（research）。

## 源码结构（阶段 0：已拆分）

权威基线为 v24（“交通制动高质量题库版”）。原本是单文件 HTML（图片以 base64 WebP 内嵌），现已拆分为可维护源码：

```
src/
  index.html        骨架（head + body），引用 styles.css 与 scripts/*.js
  styles.css        全部样式（13 个 <style> 块按文档顺序合并）
  scripts/
    01-core.js …    13 个 <script> 块，每块一个文件，保持原始顺序
images/             173 张例题截图 img-001.webp … img-173.webp（从 base64 抽出）
build.mjs           构建脚本：把 src 内联成单文件 index.html（图片仍外置）
tools/              一次性拆分脚本与无头回归测试
index.html          构建产物（可直接部署 / 本地双击打开）
CLAUDE.md           项目说明与工作计划
```

### 为什么 JS 是「每块一个文件」而不是合并成一个 bundle

v24 依赖经典 `<script>` 标签**逐块隔离失败**：其中 `v22-seed-bank-script` 块存在**既有语法错误**
（单引号字符串里夹了真实换行），在 v24 里它单独失败、其余块照常运行。若合并成一个文件，这个错误会变成**整页致命**。
逐块独立加载 = 与 v24 行为**完全一致**（含这处既有 bug）。该 bug 属于产物逻辑，未在阶段 0 内擅自修复，留待单独决定。

> **未触及任何编码数字、维度赋值与题目内容。** 图片仅做了 base64 → 文件的外置；DATA 对象其余字节逐字保留。
> 校验：95 道题；LK-09 / HKJ-05 / JK-10 均为层级Ⅰ；图片字节与 v24 逐一对得上；无头 Chromium 行为与 v24 一致。

## 构建与本地预览

```bash
node build.mjs            # 生成根目录 index.html（CSS/JS 内联，图片外置）
node build.mjs dist       # 生成 dist/（index.html + images/，供 CI 部署）
```

本地直接用浏览器打开根目录 `index.html` 即可（需与 `images/` 同目录）。
OCR 功能需联网（从 CDN 加载 tesseract.js），其余完全离线可用。

## 自动部署（GitHub Actions → Pages）

`.github/workflows/deploy.yml`：push 到部署分支即自动 `node build.mjs dist` 并发布到 GitHub Pages。

> **一次性设置**：仓库 **Settings → Pages → Source** 选 **“GitHub Actions”**。
> 需要更换部署分支时改 workflow 里的 `branches` 列表。

## 阶段 2（可选）：真·AI 在线生成

默认**关闭**——不配置就和离线版一模一样，“AI 成品题生成区”保持 v23 起的折叠状态，
教师走原有「生成提示词 → 复制给 Claude → 粘回拆卡」的离线路径。

要启用在线生成：

1. 按 `worker/阶段2_AI后端接入说明.md` 把 `worker/worker.js` 部署成 Cloudflare Worker
   （API key 作为后端 Secret，**先在 Anthropic 控制台设月度花费上限**）。
2. 在 `src/scripts/14-stage2-online-ai.js` 顶部填 `WORKER_URL` 与 `ACCESS_TOKEN`
   （或在该脚本之前定义 `window.PHYSICS_AI_CONFIG = { WORKER_URL, ACCESS_TOKEN }`），
   然后 `node build.mjs`。

一旦配置好，整合页 / 拓展页的 AI 区会重新显示，并多出一个绿色「直接生成（在线）」按钮：
它复用现有 `buildAgentPrompt` 生成的结构化提示词，POST 给 Worker，再用现有
`renderAgentResult` 把返回结果拆成「学生版题目 / 教师版解析 / 研究依据」三层卡片。
离线「复制提示词」按钮始终保留作降级。

> `ACCESS_TOKEN` 在前端可见，只抬高门槛、不是鉴权；真正的兜底是后端花费上限 + 限流。
> 切勿把真实 API key 写进前端或提交进仓库。
