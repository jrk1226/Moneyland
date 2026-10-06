// Moneyland AI relay. Keeps the Claude API key on the server and adds simple limits.
// Vercel environment variables:
//   ANTHROPIC_API_KEY  (required)  your key from console.anthropic.com
//   MONEYLAND_CODE     (optional)  an access code; when set, the site asks for it once
const MODELS = { chat: "claude-haiku-4-5-20251001", plan: "claude-sonnet-5-5" };
const MAX_TOKENS = { chat: 350, plan: 1500 };
const LIMIT = 40, WINDOW_MS = 10 * 60 * 1000; // per visitor, per 10 minutes
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list);
  return list.length > LIMIT;
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-14)) {
    const role = m && m.role === "assistant" ? "assistant" : "user";
    const content = String((m && m.content) || "").slice(0, 12000);
    if (!content.trim()) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY, code = process.env.MONEYLAND_CODE;
  if (req.method === "GET") return res.status(200).json({ configured: !!key, needsCode: !!code });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!key) return res.status(503).json({ error: "The AI key is not set up yet.", code: "not_configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (code && body.code !== code) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (limited(ip)) return res.status(429).json({ error: "Too many questions. Try again in a few minutes.", code: "rate_limited" });

  const mode = body.mode === "plan" ? "plan" : "chat";
  const messages = cleanMessages(body.messages);
  if (!messages) return res.status(400).json({ error: "Nothing to send.", code: "invalid_request" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELS[mode], max_tokens: MAX_TOKENS[mode],
        system: "You are part of Moneyland, a playful simulation of an AI maker district in the year 2085. Stay in the role the user turn describes. Never use emojis.",
        messages,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).json({ error: (data && data.error && data.error.message) || "The AI service had a problem.", code: status === 429 ? "rate_limited" : "upstream_error" });
    }
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    if (!text) return res.status(502).json({ error: "The AI gave an empty answer.", code: "empty_completion" });
    return res.status(200).json({ text, truncated: data.stop_reason === "max_tokens" });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the AI service.", code: "upstream_error" });
  }
};
