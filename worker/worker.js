// Cloudflare Worker：高中物理例题工作台 · AI 生成代理
// 作用：前端（GitHub Pages 静态站）把"提示词"POST 到这里，
//       Worker 用服务器端保存的 API key 调用 Claude，再把结果返回前端。
// API key 永远不出现在前端代码里。

// ===== 配置（按需修改）=====
const ALLOWED_ORIGINS = [
  "https://fullsu9527-debug.github.io", // 你的 GitHub Pages 域名（部署后确认）
  // 本地调试时可临时加 "http://localhost:8000"
];
const MODEL = "claude-sonnet-4-6"; // 成本/质量平衡；要更高质量可换 "claude-opus-4-8"（更贵）
const MAX_TOKENS = 3000;            // 控制单次返回长度，直接影响每次费用
const RATE_LIMIT = 20;             // 每个 IP 每个时间窗口的最大请求数
const RATE_WINDOW_SEC = 3600;      // 时间窗口（秒）：这里是每小时 20 次

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = buildCors(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

    // 来源校验（过滤随手乱调；注意：CORS 不是硬安全边界）
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "Origin not allowed" }, 403, cors);

    // 访问口令（前端会带上；它在前端源码里可见，只抬高门槛，不是真正鉴权）
    const token = request.headers.get("x-access-token") || "";
    if (token !== env.ACCESS_TOKEN) return json({ error: "Unauthorized" }, 401, cors);

    // 频率限制（需要绑定一个 KV 命名空间 RL；不想用就删掉这一整段）
    if (env.RL) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const key = "rl:" + ip;
      const count = parseInt((await env.RL.get(key)) || "0", 10);
      if (count >= RATE_LIMIT) return json({ error: "请求过于频繁，请稍后再试" }, 429, cors);
      await env.RL.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_SEC });
    }

    // 取出前端发来的提示词
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400, cors); }
    const prompt = ((body && body.prompt) || "").toString().trim();
    if (!prompt) return json({ error: "缺少 prompt" }, 400, cors);
    if (prompt.length > 12000) return json({ error: "提示词过长" }, 400, cors);

    // 调用 Claude
    let aiResp;
    try {
      aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: "你只输出符合要求的 JSON，不要任何额外说明、前言或 Markdown 代码块围栏。",
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (e) {
      return json({ error: "调用模型失败" }, 502, cors);
    }

    if (!aiResp.ok) {
      const detail = await aiResp.text().catch(() => "");
      return json({ error: "模型返回错误", status: aiResp.status, detail: detail.slice(0, 500) }, 502, cors);
    }

    const data = await aiResp.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return json({ text }, 200, cors);
  },
};

function buildCors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-access-token",
    "Access-Control-Max-Age": "86400",
  };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}
