// Shared helpers for the Moneyland server functions (files starting with _ are not routes).
const SUPABASE_URL = process.env.SUPABASE_URL || "https://larxtghtrxcfadtqgcdz.supabase.co";
const MODELS = { quick: "claude-haiku-4-5-20251001", smart: "claude-sonnet-5-5" };

function cfg() {
  return { db: !!process.env.SUPABASE_SERVICE_KEY, ai: !!process.env.ANTHROPIC_API_KEY, needsCode: !!process.env.MONEYLAND_CODE };
}
function codeOk(req, body) {
  const code = process.env.MONEYLAND_CODE;
  if (!code) return true;
  const given = (body && body.code) || req.headers["x-moneyland-code"] || "";
  return given === code;
}
function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
async function db(path, opts = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, "content-type": "application/json", Prefer: opts.prefer || "return=representation" };
  if (!String(key).startsWith("sb_")) headers.Authorization = "Bearer " + key;
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error("Database error " + r.status + ": " + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}
// Calls Claude. Handles server-tool pauses. Returns { text, blocks }.
async function claude({ tier = "smart", prompt, maxTokens = 4000, tools }) {
  const messages = [{ role: "user", content: prompt }];
  let all = [];
  for (let round = 0; round < 4; round++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELS[tier], max_tokens: maxTokens, messages, tools,
        system: "You work inside Moneyland, a small business that designs printable PDF products and sells them as digital downloads on Etsy. Be accurate and practical. Never use emojis." }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data && data.error && data.error.message) || "AI error " + r.status);
    all = all.concat(data.content || []);
    if (data.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: data.content }); continue; }
    break;
  }
  const text = all.filter(b => b.type === "text").map(b => b.text).join("");
  return { text, blocks: all };
}
function parseJSON(text) {
  const t = String(text || "");
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fence ? fence[1] : t;
  let lastErr = new Error("No JSON in AI answer"), tries = 0;
  for (let i = 0; i < src.length && tries < 25; i++) {
    const ch = src[i]; if (ch !== "{" && ch !== "[") continue;
    const end = src.lastIndexOf(ch === "{" ? "}" : "]"); if (end <= i) continue;
    tries++;
    try { return JSON.parse(src.slice(i, end + 1)); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
// Ask Claude for JSON; if the reply is not valid JSON, have Claude repair it once.
async function claudeJSON(opts) {
  const out = await claude(opts);
  try { return { data: parseJSON(out.text), blocks: out.blocks }; }
  catch (e) {
    const fix = await claude({ tier: "smart", maxTokens: opts.maxTokens || 4000,
      prompt: "The text below was supposed to be valid JSON but is broken (" + e.message + "). Return the same content as valid JSON. Escape any double quotes inside strings, remove trailing commas, close any unclosed brackets. Reply with only the JSON, nothing else.\n\n" + String(out.text).slice(0, 60000) });
    return { data: parseJSON(fix.text), blocks: out.blocks };
  }
}
// Each timed job checks in here so the health checker can tell it is still running.
async function beat(job, ok, note) {
  try { await db("heartbeats?on_conflict=job", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [{ job, at: new Date().toISOString(), ok: ok !== false, note: String(note || "").slice(0, 300) }] }); } catch (e) {}
}
module.exports = { cfg, codeOk, readBody, db, claude, parseJSON, claudeJSON, beat };
