// Coloring-page illustrator: Claude draws clean line art as SVG paths, then a second Claude call
// looks at the rendered pictures and rejects anything that is not clearly good.
const { claude, parseJSON } = require("./_lib");
const OUT = require("../lib/design/output");

function sanitize(paths) {
  return (paths || []).map(d => String(d).replace(/[^MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]/g, "").trim()).filter(d => /^[Mm]/.test(d) && d.length < 6000).slice(0, 90);
}
function artSvg(art, size) {
  const s = size || 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="${s}" height="${s}"><rect width="400" height="400" fill="#fff"/>`
    + art.paths.map(d => `<path d="${d}" fill="#fff" stroke="#111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`).join("") + "</svg>";
}
async function drawOne(subject, audience) {
  const prompt = "You are an illustrator making a printable coloring page for " + (audience || "kids ages 3 to 8") + ".\n"
    + "Draw: " + subject + "\n\n"
    + "Output the drawing as SVG path data on a 400 x 400 canvas. Rules:\n"
    + "- Cute, friendly cartoon style with bold simple outlines, like a professional kids coloring book.\n"
    + "- The main subject is big and centered, filling about 70% of the canvas. Add 2 to 5 simple background details (ground line, grass tufts, clouds, sun, small flowers, stars) that fit the subject.\n"
    + "- Use closed shapes that are easy to color: large areas, no tiny details, no shading, no hatching, no text, no letters.\n"
    + "- Draw shapes back to front: later paths are painted on top of earlier ones and hide what is behind them (every path is filled white with a black outline). Use this for overlaps, e.g. draw the body first, then the head on top.\n"
    + "- Eyes: small filled-looking circles are fine as tiny closed shapes. Smiles can be open curves.\n"
    + "- Absolute commands only (M L C Q A Z), all coordinates between 8 and 392, 15 to 70 paths.\n"
    + "Think about the shape carefully so the subject is clearly recognizable.\n"
    + "Reply with only JSON: {\"paths\": [\"M ... Z\", ...]}";
  const out = await claude({ tier: "smart", prompt, maxTokens: 9000 });
  const data = parseJSON(out.text);
  const paths = sanitize(data.paths);
  if (paths.length < 6) throw new Error("drawing too simple");
  return { viewBox: [0, 0, 400, 400], paths };
}
// Looks at up to 8 drawings at once and scores them.
async function review(items) {
  const content = [];
  items.forEach((it, i) => {
    content.push({ type: "text", text: "Picture " + (i + 1) + " should show: " + it.subject });
    content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: Buffer.from(OUT.png(artSvg(it.art, 400), 400)).toString("base64") } });
  });
  content.push({ type: "text", text: "You are the quality checker for a coloring book that will be sold to parents. For each picture, score 1-10: is the subject clearly recognizable, is it clean and well drawn with closed shapes that are easy to color, and would a paying customer be happy with it? Messy scribbles, broken shapes, unrecognizable subjects or overlapping lines that make a mess score 5 or less. Reply with only JSON: {\"scores\": [{\"n\": 1, \"score\": 8, \"note\": \"short\"}, ...]}" });
  const out = await claude({ tier: "smart", prompt: content, maxTokens: 1500 });
  const data = parseJSON(out.text);
  const map = {}; (data.scores || []).forEach(s => { map[parseInt(s.n, 10)] = { score: parseInt(s.score, 10) || 0, note: String(s.note || "") }; });
  return items.map((it, i) => Object.assign({}, it, map[i + 1] || { score: 0, note: "not reviewed" }));
}
async function pool(list, n, fn) {
  const out = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k], k); } catch (e) { out[k] = { error: e }; } } }));
  return out;
}
// Fills in "art" for every coloring subject in a spec. Bad drawings get one retry, then are dropped.
async function illustrate(spec, deadline) {
  const jobs = [];
  (spec.pages || []).forEach(pg => { if (pg.template === "coloring") (pg.subjects || [pg]).forEach(sj => { if (!sj.art && (sj.subject || sj.title)) jobs.push(sj); }); });
  if (!jobs.length) return { drawn: 0, dropped: 0 };
  const audience = spec.category === "kids" ? "kids ages 3 to 8" : "all ages";
  const attempt = async (list) => {
    const drawn = await pool(list, 6, sj => Date.now() < deadline ? drawOne(sj.subject || sj.title, audience) : Promise.reject(new Error("out of time")));
    const ok = list.map((sj, i) => ({ sj, subject: sj.subject || sj.title, art: drawn[i] && !drawn[i].error ? drawn[i] : null })).filter(x => x.art);
    const reviewed = [];
    for (let i = 0; i < ok.length; i += 8) { try { reviewed.push(...await review(ok.slice(i, i + 8))); } catch (e) { reviewed.push(...ok.slice(i, i + 8).map(x => Object.assign(x, { score: 0, note: "review failed" }))); } }
    reviewed.forEach(r => { if (r.score >= 7) r.sj.art = r.art; });
    return list.filter(sj => !sj.art);
  };
  let left = await attempt(jobs);
  if (left.length && Date.now() < deadline - 60000) left = await attempt(left);
  // drop subjects that never got a good drawing
  (spec.pages || []).forEach(pg => { if (pg.template === "coloring" && pg.subjects) pg.subjects = pg.subjects.filter(sj => sj.art); });
  spec.pages = (spec.pages || []).filter(pg => pg.template !== "coloring" || (pg.subjects ? pg.subjects.length : pg.art));
  return { drawn: jobs.length - left.length, dropped: left.length };
}
module.exports = { illustrate, drawOne, review, artSvg };
