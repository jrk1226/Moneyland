// "Best of two": for business and marketing work, Claude and ChatGPT each make their own version,
// then Claude judges them BLIND (it is not told which AI wrote which) and the better one is used.
// If ChatGPT is not set up or fails, Claude's version is used as before.
const { db, claudeJSON } = require("./_lib");
const O = require("./_openai");

async function log(text) { try { await db("autopilot_log", { method: "POST", prefer: "return=minimal", body: [{ kind: "contest", text: String(text).slice(0, 500) }] }); } catch (e) {} }

// task: short name for the log ("shop text", "pin text", ...)
// brief: what a great answer looks like (shown to the judge)
// claudeAnswer: Claude's JSON answer, already made
// gptPrompt: the same job for ChatGPT, must ask for the same JSON shape
// show: turns an answer into readable text for the judge
async function bestOf({ task, brief, claudeAnswer, gptPrompt, show, valid }) {
  if (!O.configured()) return { answer: claudeAnswer, winner: "claude", skipped: true };
  let gpt;
  try { gpt = await O.chatJSON(gptPrompt, { maxTokens: 3000 }); } catch (e) { return { answer: claudeAnswer, winner: "claude", skipped: true, error: e.message }; }
  if (valid && !valid(gpt)) return { answer: claudeAnswer, winner: "claude", skipped: true, error: "ChatGPT answer incomplete" };
  const flip = Math.random() < 0.5, one = flip ? gpt : claudeAnswer, two = flip ? claudeAnswer : gpt;
  const view = show || (x => JSON.stringify(x).slice(0, 4000));
  let j;
  try {
    j = (await claudeJSON({ tier: "smart", maxTokens: 700, prompt: "You run Bright Page Prints, an Etsy shop of printable digital downloads, and must choose the better of two versions of: " + task + ".\nWhat a great one does: " + brief
      + "\nReject any version that is inaccurate, promises things the product does not have, uses trademarks or brand names, or breaks the length limits.\n\nVERSION 1:\n" + view(one) + "\n\nVERSION 2:\n" + view(two)
      + "\n\nReply with only JSON: {\"pick\": 1 or 2, \"why\": \"one short sentence\"}" })).data;
  } catch (e) { return { answer: claudeAnswer, winner: "claude", skipped: true, error: e.message }; }
  const pickedOne = parseInt(j.pick, 10) === 1, useGpt = pickedOne === flip;
  const why = String(j.why || "").slice(0, 200);
  await log("Best of two, " + task + ": used " + (useGpt ? "ChatGPT's" : "Claude's") + " version. " + why);
  return { answer: useGpt ? gpt : claudeAnswer, winner: useGpt ? "chatgpt" : "claude", why };
}

// Research: ChatGPT searches the web on its own; Claude cross-checks both lists and keeps the strongest ideas.
async function gptResearch(prompt) {
  const model = await O.pickTextModel();
  let last;
  for (const tool of ["web_search", "web_search_preview", null]) {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: "Bearer " + O.key(), "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ model, input: prompt + "\nReply with only the JSON object, no other words." }, tool ? { tools: [{ type: tool }] } : {})),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { last = new Error("ChatGPT research: " + ((d.error && d.error.message) || r.status)); if (r.status === 401 || r.status === 429) throw last; continue; }
    let text = d.output_text || "", sources = [];
    (d.output || []).forEach(o => (o.content || []).forEach(c => { if (c.type === "output_text") { if (!d.output_text) text += c.text || ""; (c.annotations || []).forEach(a => { if (a.url && sources.length < 8 && !sources.some(s => s.url === a.url)) sources.push({ url: a.url, title: a.title || a.url }); }); } }));
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) { last = new Error("ChatGPT research gave no JSON"); continue; }
    return { data: JSON.parse(m[0]), sources };
  }
  throw last;
}
async function mergeIdeas(claudeOut, gptOut) {
  const tag = (list, from) => (list || []).map(i => Object.assign({}, i, { from }));
  const all = tag(claudeOut.ideas, "claude").concat(tag(gptOut.ideas, "chatgpt"));
  const prompt = "Two researchers each searched the web for printable products to make for our Etsy shop. Cross-check their findings and keep the 4 strongest ideas overall. "
    + "Prefer ideas with real, specific evidence of buying (sales counts, review counts, best seller badges); merge duplicates into one; lower the score of any idea whose evidence looks vague or made up; never invent new evidence. Keep each idea's fields and its \"from\" value (use \"both\" when both found it).\n"
    + "Summary from researcher A: " + (claudeOut.summary || "") + "\nSummary from researcher B: " + (gptOut.summary || "") + "\nIdeas:\n" + JSON.stringify(all).slice(0, 24000)
    + "\nReply with only JSON: {\"summary\": \"3-4 plain sentences on what to make next\", \"ideas\": [same fields as above, best first]}";
  return (await claudeJSON({ tier: "smart", prompt, maxTokens: 6000 })).data;
}

module.exports = { bestOf, gptResearch, mergeIdeas };
