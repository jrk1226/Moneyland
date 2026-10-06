// Color/font themes and the shared page furniture (headers, cards, borders, decorations).
const { tint, rng, measure, fitSize, wrapLines } = require("./core");
const IC = require("./icons");

const T = {
  kids_bright: { name: "Bright and playful", cat: "kids", head: "fredoka-700", sub: "patrick-hand-400", body: "fredoka-400", bold: "fredoka-600",
    c: ["#FF6B6B", "#4D96FF", "#FFC93C", "#43B66B", "#A66CFF"], bg: "#FFFFFF", ink: "#2B2B35", soft: "#6B6F80", line: "#C9CEDA", style: "kids", decor: "confetti", icons: "general" },
  kids_pastel: { name: "Soft pastel", cat: "kids", head: "fredoka-700", sub: "patrick-hand-400", body: "fredoka-400", bold: "fredoka-600",
    c: ["#F48FB1", "#7FB8F5", "#FFB86B", "#6CCB9F", "#B79CED"], bg: "#FFFFFF", ink: "#3A3A48", soft: "#7A7D8C", line: "#D3D7E2", style: "kids", decor: "clouds", icons: "baby" },
  christmas: { name: "Christmas", cat: "kids", head: "baloo-2-800", sub: "dancing-script-600", body: "fredoka-400", bold: "fredoka-600",
    c: ["#D62828", "#2A9D8F", "#E9B949", "#1F4E5F", "#E76F51"], bg: "#FFFDF8", ink: "#2B2B35", soft: "#6B6F80", line: "#D8D2C4", style: "kids", decor: "snow", icons: "christmas" },
  halloween: { name: "Halloween", cat: "kids", head: "baloo-2-800", sub: "patrick-hand-400", body: "fredoka-400", bold: "fredoka-600",
    c: ["#F77F00", "#7B2CBF", "#43AA8B", "#2B2D42", "#FCBF49"], bg: "#FFFCF7", ink: "#2B2D42", soft: "#6B6F80", line: "#D9D3CC", style: "kids", decor: "stars", icons: "halloween" },
  spring: { name: "Spring and Easter", cat: "kids", head: "fredoka-700", sub: "patrick-hand-400", body: "fredoka-400", bold: "fredoka-600",
    c: ["#F497B6", "#7EC4CF", "#F9C74F", "#90BE6D", "#B392F0"], bg: "#FFFFFF", ink: "#36364A", soft: "#777A8A", line: "#D5D9E3", style: "kids", decor: "flowers", icons: "easter" },
  sage_boho: { name: "Sage boho", cat: "planner", head: "playfair-display-700", sub: "dancing-script-600", body: "poppins-400", bold: "poppins-600",
    c: ["#7D9B76", "#C99A6B", "#B7C4A6", "#5E6B57", "#E3D5C1"], bg: "#FBF8F3", ink: "#3A3A36", soft: "#7C7A72", line: "#D9D3C7", style: "boho", decor: "arches", icons: "general" },
  blush: { name: "Blush neutral", cat: "planner", head: "dm-serif-display-400", sub: "dancing-script-600", body: "lato-400", bold: "lato-700",
    c: ["#C98F95", "#9C7A86", "#E9CFCF", "#6D6875", "#D9B8A2"], bg: "#FFFAF8", ink: "#3D3540", soft: "#857C86", line: "#E3D6D6", style: "boho", decor: "botanical", icons: "general" },
  navy: { name: "Navy and blush", cat: "planner", head: "playfair-display-700", sub: "dancing-script-600", body: "lato-400", bold: "lato-700",
    c: ["#23395B", "#D99AA5", "#C9A96E", "#406E8E", "#EAD7D1"], bg: "#FFFFFF", ink: "#1F2A3C", soft: "#6E7686", line: "#D8DDE5", style: "classic", decor: "frame", icons: "general" },
  minimal: { name: "Modern minimal", cat: "planner", head: "poppins-700", sub: "poppins-400", body: "poppins-400", bold: "poppins-600",
    c: ["#2D3142", "#EF8354", "#9BA3B4", "#4F5D75", "#E8E9ED"], bg: "#FFFFFF", ink: "#2D3142", soft: "#7D8394", line: "#D9DCE3", style: "minimal", decor: "none", icons: "general" },
  terracotta: { name: "Terracotta", cat: "planner", head: "dm-serif-display-400", sub: "caveat-600", body: "poppins-400", bold: "poppins-600",
    c: ["#C8553D", "#E59E6D", "#588B8B", "#8C3B2A", "#F3D9C4"], bg: "#FFF8F1", ink: "#3B2A24", soft: "#85716A", line: "#E6D3C4", style: "boho", decor: "arches", icons: "general" },
  party_bright: { name: "Party brights", cat: "party", head: "baloo-2-800", sub: "dancing-script-600", body: "fredoka-400", bold: "fredoka-600",
    c: ["#FF4F8B", "#00A6ED", "#FFB400", "#7FB800", "#8E5CE6"], bg: "#FFFFFF", ink: "#26263A", soft: "#6E6F80", line: "#D6D8E2", style: "kids", decor: "confetti", icons: "birthday" },
  baby_soft: { name: "Baby soft", cat: "party", head: "playfair-display-700", sub: "caveat-600", body: "lato-400", bold: "lato-700",
    c: ["#9DB39A", "#E3B5BD", "#D8C3A5", "#8FAFC0", "#F2E6DA"], bg: "#FFFCF8", ink: "#3D3A3A", soft: "#857D7A", line: "#E2D9CF", style: "boho", decor: "clouds", icons: "baby" },
};
const ACCENT_MAP = { purple: "kids_bright", teal: "sage_boho", orange: "terracotta", pink: "kids_pastel", blue: "navy", green: "sage_boho", yellow: "kids_bright", red: "christmas", navy: "navy", sage: "sage_boho" };
function pick(spec) {
  if (spec.theme && T[spec.theme]) return Object.assign({ id: spec.theme }, T[spec.theme]);
  const t = (spec.title || "").toLowerCase();
  let id = /christmas|santa|holiday|xmas/.test(t) ? "christmas" : /halloween/.test(t) ? "halloween" : /easter|spring/.test(t) ? "spring"
    : /baby shower|baby/.test(t) ? "baby_soft" : spec.category === "party" ? "party_bright" : spec.category === "kids" ? "kids_bright"
    : ACCENT_MAP[spec.accent] || "sage_boho";
  if (spec.category === "planner" && T[id].cat === "kids") id = "sage_boho";
  if (spec.category === "coloring" && !spec.theme) id = "minimal";
  return Object.assign({ id }, T[id]);
}

const M = 40; // page margin
function footer(p, th, text) {
  p.text(text || "Printable - for personal use. Print on US Letter or A4 paper.", p.w / 2, p.h - 28, { font: th.body, size: 7.5, fill: th.soft, anchor: "middle" });
}

// Background decorations, kept to the margins.
function decorate(p, th, seed, opt = {}) {
  const r = rng(seed || "d"), c = th.c;
  const top = opt.top == null ? 0 : opt.top;
  if (th.decor === "confetti") {
    for (let i = 0; i < 26; i++) {
      const side = i % 4, x = side < 2 ? (side === 0 ? 8 + r() * 26 : p.w - 34 + r() * 26) : 40 + r() * (p.w - 80), y = side < 2 ? 40 + r() * (p.h - 90) : (side === 2 ? 6 + r() * 22 : p.h - 34 + r() * 10);
      const col = c[i % c.length], k = r();
      if (k < 0.4) p.circle(x, y, 2.5 + r() * 2.5, { fill: col, op: 0.85 });
      else if (k < 0.7) p.rect(x, y, 6, 6, { fill: col, op: 0.85, r: 1.2 });
      else p.path(`M${x} ${y} q 4 -5 8 0 t 8 0`, { stroke: col, sw: 2.2, cap: "round", op: 0.9 });
    }
  } else if (th.decor === "clouds") {
    IC.draw(p, "cloud", 14, 10, 56, { style: "flat", op: 1 }); IC.draw(p, "cloud", p.w - 74, 18, 46, { style: "flat" });
    IC.draw(p, "star", p.w - 30, 70, 14, { style: "flat" }); IC.draw(p, "star", 22, 76, 11, { style: "flat" });
  } else if (th.decor === "snow" || th.decor === "stars") {
    const nm = th.decor === "snow" ? "snowflake" : "star";
    [[16, 14, 22], [p.w - 40, 12, 26], [12, p.h - 52, 18], [p.w - 34, p.h - 56, 20], [p.w - 26, p.h / 2, 12], [10, p.h / 2 - 40, 12]].forEach(([x, y, s], i) =>
      IC.draw(p, nm, x, y, s, { style: "mono", monoColor: tint(c[i % 2 ? 1 : 0], 0.55) }));
  } else if (th.decor === "flowers") {
    [[10, 10, 34], [p.w - 44, 10, 30], [12, p.h - 52, 26], [p.w - 40, p.h - 50, 28]].forEach(([x, y, s], i) =>
      IC.draw(p, i % 2 ? "butterfly" : "flower", x, y, s, { style: "flat", a: c[i % 3], b: c[(i + 1) % 3] }));
  } else if (th.decor === "arches") {
    const x = p.w - 30, y = 30;
    [[c[0], 52], [c[1], 40], [c[2], 28]].forEach(([col, rad]) => p.path(`M${x - rad} ${y} A ${rad} ${rad} 0 0 1 ${x + rad} ${y}`, { stroke: tint(col, 0.35), sw: 9 }));
    p.circle(34, p.h - 40, 16, { fill: tint(c[1], 0.55) });
    p.path(`M10 ${p.h - 18} Q 40 ${p.h - 34} 72 ${p.h - 18}`, { stroke: tint(c[0], 0.5), sw: 2.5, cap: "round" });
  } else if (th.decor === "botanical") {
    sprig(p, p.w - 46, 24, 1, tint(th.c[0], 0.35)); sprig(p, 46, p.h - 30, -1, tint(th.c[1], 0.45));
  } else if (th.decor === "frame") {
    p.rect(14, 14, p.w - 28, p.h - 28, { stroke: tint(c[0], 0.75), sw: 1 }); p.rect(19, 19, p.w - 38, p.h - 38, { stroke: tint(c[2], 0.45), sw: 0.6 });
  }
  if (opt.border && th.style === "kids") p.rect(18, 18, p.w - 36, p.h - 36, { stroke: tint(c[1], 0.45), sw: 2.2, r: 18, dash: "1 7", cap: "round" });
}
function sprig(p, x, y, dir, col) {
  p.path(`M${x} ${y} Q ${x - 20 * dir} ${y + 30} ${x - 6 * dir} ${y + 70}`, { stroke: col, sw: 1.8, cap: "round" });
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6, px = x - 20 * dir * 2 * t * (1 - t) - 6 * dir * t * t, py = y + 70 * t, s = (i % 2 ? 1 : -1);
    p.path(`M${px} ${py} q ${12 * s} -10 ${20 * s} -4 q ${-6 * s} 10 ${-20 * s} 4 Z`, { fill: col });
  }
}

// Page header. Returns the y where content can start.
function header(p, th, title, sub, o = {}) {
  const W = p.w, cx = W / 2;
  title = title || ""; sub = sub || "";
  let y;
  if (th.style === "kids") {
    const size = fitSize(title, th.head, o.big ? 44 : 36, W - 2 * M - (o.icon ? 120 : 20), 18);
    y = 76;
    p.text(title, cx + 2, y + 3, { font: th.head, size, fill: tint(th.c[1], 0.6), anchor: "middle" });
    p.text(title, cx, y, { font: th.head, size, fill: th.c[0], anchor: "middle", stroke: th.ink, sw: 0.9 });
    if (o.icon) { const tw = measure(title, th.head, size); IC.draw(p, o.icon, cx - tw / 2 - 52, y - 38, 42, { a: th.c[0], b: th.c[1] }); IC.draw(p, o.icon2 || o.icon, cx + tw / 2 + 10, y - 38, 42, { a: th.c[2], b: th.c[3] }); }
    if (sub) { const ss = fitSize(sub, th.sub, 17, W - 2 * M - 30, 10); p.text(sub, cx, y + 26, { font: th.sub, size: ss, fill: th.soft, anchor: "middle" }); y += 26; }
    y += 18;
  } else if (th.style === "minimal") {
    y = 70;
    const size = fitSize(title.toUpperCase(), th.head, 26, W - 2 * M, 14);
    p.text(title.toUpperCase(), M, y, { font: th.head, size, fill: th.ink, ls: 2.2 });
    p.rect(M, y + 12, 46, 4, { fill: th.c[1] });
    if (sub) p.text(sub, M + 58, y + 17, { font: th.body, size: 10, fill: th.soft });
    y += 34;
  } else { // boho / classic
    y = th.style === "classic" ? 74 : 80;
    const size = fitSize(title, th.head, 34, W - 2 * M - 40, 16);
    if (sub && th.style === "boho") { const ss = fitSize(sub, th.sub, 24, W - 2 * M - 60, 12); p.text(sub, cx, y - 36, { font: th.sub, size: ss, fill: th.c[1], anchor: "middle" }); }
    p.text(title, cx, y, { font: th.head, size, fill: th.ink, anchor: "middle" });
    const tw = Math.min(measure(title, th.head, size), W - 2 * M);
    p.line(cx - tw / 2 - 30, y - size * 0.32, cx - tw / 2 - 10, y - size * 0.32, { stroke: th.c[0], sw: 1.2 });
    p.line(cx + tw / 2 + 10, y - size * 0.32, cx + tw / 2 + 30, y - size * 0.32, { stroke: th.c[0], sw: 1.2 });
    if (sub && th.style !== "boho") { p.text(sub, cx, y + 22, { font: th.body, size: 10.5, fill: th.soft, anchor: "middle" }); y += 18; }
    y += 22;
  }
  return y;
}
// "Name ____  Date ____" style line. Returns new y.
function fields(p, th, labels, y, x0, x1) {
  x0 = x0 == null ? M : x0; x1 = x1 == null ? p.w - M : x1;
  const n = labels.length, gap = 18, w = (x1 - x0 - gap * (n - 1)) / n;
  labels.forEach((lb, i) => {
    const x = x0 + i * (w + gap), lw = p.text(lb + ":", x, y, { font: th.bold, size: 10.5, fill: th.ink });
    p.line(x + lw + 6, y + 2, x + w, y + 2, { stroke: th.line, sw: 1 });
  });
  return y + 22;
}
// Rounded card with a colored heading tab. Returns {x,y,w,h, top} of the inner area.
function card(p, th, x, y, w, h, title, col, o = {}) {
  col = col || th.c[0];
  const r = th.style === "minimal" ? 4 : 12;
  p.rect(x, y, w, h, { fill: o.fill || "#FFFFFF", stroke: tint(col, 0.45), sw: 1.2, r });
  let top = y + 10;
  if (title) {
    if (th.style === "minimal") { p.text(title.toUpperCase(), x + 12, y + 18, { font: th.bold, size: 9, fill: col, ls: 1.4 }); top = y + 28; }
    else {
      p.path(`M${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + 24} L ${x} ${y + 24} Z`, { fill: tint(col, th.style === "kids" ? 0.2 : 0.72) });
      const fs = fitSize(title, th.bold, 11, w - 20, 7);
      p.text(title, x + 12, y + 16.5, { font: th.bold, size: fs, fill: th.style === "kids" ? "#FFFFFF" : th.ink });
      top = y + 32;
    }
  }
  return { x: x + 12, y: top, w: w - 24, h: h - (top - y) - 8, x1: x + w - 12, y1: y + h - 8 };
}
function lines(p, th, x, y, w, y1, gap, o = {}) {
  let n = 0;
  for (let yy = y + gap; yy <= y1 + 0.5; yy += gap) {
    if (o.check) { p.rect(x, yy - 10, 9, 9, { stroke: th.soft, sw: 0.9, r: 2 }); p.line(x + 15, yy, x + w, yy, { stroke: th.line, sw: 0.8 }); }
    else if (o.bullets) { p.circle(x + 3, yy - 4, 2, { fill: tint(th.c[0], 0.3) }); p.line(x + 11, yy, x + w, yy, { stroke: th.line, sw: 0.8 }); }
    else p.line(x, yy, x + w, yy, { stroke: th.line, sw: 0.8 });
    n++;
  }
  return n;
}
function dots(p, th, x, y, w, h, gap) {
  for (let yy = y; yy <= y + h; yy += gap) for (let xx = x; xx <= x + w; xx += gap) p.circle(xx, yy, 0.8, { fill: tint(th.soft, 0.3) });
}
module.exports = { T, pick, M, footer, decorate, header, fields, card, lines, dots, sprig };
