// Bright Page Prints brand kit: logo, Etsy shop icon, banners, receipt banner and Pinterest pins.
const { Page, measure, fitSize, wrapLines, tint, rng, clean } = require("./core");
const IC = require("./icons");

const B = { name: "Bright Page", sub: "PRINTS", tagline: "Printables that make everyday life brighter",
  coral: "#F2685B", sun: "#FFC145", teal: "#2BA8A0", navy: "#25324A", cream: "#FFF8EE", blush: "#FDE3DC" };

// The mark: a page with a folded corner and a sun rising over it. Drawn in a 100 x 100 box.
function mark(p, x, y, s, o = {}) {
  const k = s / 100;
  p.open(`translate(${x} ${y}) scale(${k})`);
  // sun rays
  for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8, r1 = 33, r2 = 45, cx = 66, cy = 34;
    p.line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, { stroke: B.sun, sw: 5, cap: "round" }); }
  p.circle(66, 34, 24, { fill: B.sun });
  // page
  p.path("M18 22 L62 22 L82 42 L82 90 Q82 94 78 94 L22 94 Q18 94 18 90 Z", { fill: o.page || "#FFFFFF", stroke: B.navy, sw: 5, join: "round" });
  p.path("M62 22 L62 38 Q62 42 66 42 L82 42", { fill: B.blush, stroke: B.navy, sw: 5, join: "round" });
  p.line(30, 56, 66, 56, { stroke: B.coral, sw: 5, cap: "round" });
  p.line(30, 68, 70, 68, { stroke: B.teal, sw: 5, cap: "round" });
  p.line(30, 80, 56, 80, { stroke: B.sun, sw: 5, cap: "round" });
  p.close();
}
function wordmark(p, x, y, size, o = {}) {
  const w1 = measure(B.name, "fredoka-700", size);
  p.text("Bright", x, y, { font: "fredoka-700", size, fill: o.light ? "#FFFFFF" : B.coral });
  p.text("Page", x + measure("Bright ", "fredoka-700", size), y, { font: "fredoka-700", size, fill: o.light ? "#FFFFFF" : B.navy });
  p.text(B.sub, x + 2, y + size * 0.62, { font: "poppins-600", size: size * 0.32, fill: o.light ? "#FFFFFF" : B.teal, ls: size * 0.16 });
  return w1;
}
function confetti(p, W, H, seed, n, avoid) {
  const r = rng(seed || "brand"), cols = [B.coral, B.sun, B.teal, "#9AD3E0", "#F7A1B5"];
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H; if (avoid && x > avoid[0] && x < avoid[2] && y > avoid[1] && y < avoid[3]) continue;
    const c = cols[i % cols.length], k = r();
    if (k < 0.45) p.circle(x, y, (2 + r() * 4) * W / 1000, { fill: c, op: 0.75 });
    else if (k < 0.75) p.rect(x, y, 7 * W / 1000, 7 * W / 1000, { fill: c, op: 0.7, r: 1.5 * W / 1000 });
    else p.path(`M${x} ${y} q ${5 * W / 1000} ${-6 * W / 1000} ${10 * W / 1000} 0 t ${10 * W / 1000} 0`, { stroke: c, sw: 2.4 * W / 1000, cap: "round", op: 0.8 });
  }
}

// Logo variants (1000 x 1000).
function logo(variant) {
  const p = new Page(1000, 1000); p.bg = B.cream;
  if (variant === "stacked" || !variant) {
    confetti(p, 1000, 1000, "logo", 40, [150, 150, 850, 900]);
    mark(p, 330, 150, 340);
    const size = 120, w = measure("Bright Page", "fredoka-700", size);
    wordmark(p, 500 - w / 2, 640, size);
  } else if (variant === "badge") {
    p.circle(500, 500, 430, { fill: B.coral }); p.circle(500, 500, 395, { stroke: "#FFFFFF", sw: 6, dash: "4 18", cap: "round" });
    mark(p, 345, 180, 310, { page: B.cream });
    p.text("BRIGHT PAGE", 500, 650, { font: "fredoka-700", size: 92, fill: "#FFFFFF", anchor: "middle" });
    p.text("PRINTS", 500, 740, { font: "poppins-600", size: 46, fill: B.sun, anchor: "middle", ls: 18 });
  } else {
    mark(p, 50, 350, 280);
    wordmark(p, 360, 530, 104);
  }
  return p;
}
// Etsy shop icon 500 x 500 (Etsy crops it to a circle on some screens, so keep it centered).
function shopIcon() {
  const p = new Page(500, 500); p.bg = B.cream;
  p.circle(250, 250, 238, { fill: "#FFFFFF" }); p.circle(250, 250, 238, { stroke: B.coral, sw: 10 });
  mark(p, 120, 70, 260);
  p.text("BRIGHT PAGE", 250, 380, { font: "fredoka-700", size: 50, fill: B.navy, anchor: "middle" });
  p.text("PRINTS", 250, 425, { font: "poppins-600", size: 24, fill: B.teal, anchor: "middle", ls: 9 });
  return p;
}
// Etsy shop banner (3360 x 840 drawn at 1680 x 420).
function banner(covers) {
  const W = 1680, H = 420, p = new Page(W, H); p.bg = B.cream;
  confetti(p, W, H, "banner", 90, [60, 60, 900, 360]);
  p.path(`M0 ${H} L0 ${H * 0.78} Q ${W * 0.25} ${H * 0.66} ${W * 0.5} ${H * 0.8} T ${W} ${H * 0.74} L ${W} ${H} Z`, { fill: B.blush });
  mark(p, 90, 70, 230);
  wordmark(p, 350, 200, 110);
  p.text(B.tagline, 354, 330, { font: "poppins-400", size: 30, fill: B.navy });
  p.text("Kids activities  -  Planners  -  Party printables  -  Wall art", 354, 372, { font: "poppins-600", size: 22, fill: B.teal });
  (covers || []).slice(0, 3).forEach((c, i) => {
    const s = 0.36, x = 1080 + i * 170, y = 60 + (i === 1 ? -14 : 8);
    p.rect(x + 6, y + 8, c.w * s, c.h * s, { fill: "#000", op: 0.12, r: 4 });
    p.open(`translate(${x} ${y}) scale(${s}) rotate(${[-4, 0, 4][i]} ${c.w / 2} ${c.h / 2})`);
    p.add(`<rect width="${c.w}" height="${c.h}" fill="${c.bg || "#FFFFFF"}"/>`); c.els.forEach(e => p.add(e)); c.defs.forEach((v, k) => { if (!p.defs.has(k)) p.defs.set(k, v); });
    p.close();
  });
  return p;
}
// Order receipt banner (760 x 100).
function receiptBanner() {
  const p = new Page(760, 100); p.bg = B.cream;
  confetti(p, 760, 100, "rcpt", 26, [10, 5, 520, 95]);
  mark(p, 18, 12, 76); wordmark(p, 110, 58, 40);
  p.text("Thank you for your order!", 740, 60, { font: "dancing-script-600", size: 30, fill: B.coral, anchor: "end" });
  return p;
}
// Pinterest pin (1000 x 1500) for a product: big cover, title, benefits, brand footer.
function pin(spec, cover, pageCount, style) {
  const p = new Page(1000, 1500); p.bg = style === 2 ? B.navy : B.cream;
  const dark = style === 2;
  confetti(p, 1000, 1500, "pin" + (spec.title || ""), 50, [60, 140, 940, 1260]);
  const title = clean(spec.title || "Printable"), tl = wrapLines(title, "fredoka-700", 76, 860).slice(0, 3), size = tl.length > 2 ? 64 : 76;
  tl.forEach((l, i) => p.text(l, 500, 130 + i * size * 1.05, { font: "fredoka-700", size: fitSize(l, "fredoka-700", size, 880, 36), fill: dark ? "#FFFFFF" : B.navy, anchor: "middle" }));
  let y = 130 + tl.length * size * 1.05 + 10;
  p.rect(380, y - 6, 240, 52, { fill: B.coral, r: 26 });
  p.text(spec.category === "wallart" ? "PRINTABLE ART" : (pageCount ? pageCount + " PAGES" : "PRINTABLE"), 500, y + 28, { font: "poppins-600", size: 24, fill: "#FFFFFF", anchor: "middle", ls: 2 });
  y += 80;
  if (cover) {
    const avail = 1320 - y, s = Math.min(760 / cover.w, avail / cover.h), cw = cover.w * s, ch = cover.h * s, cx = 500 - cw / 2;
    p.rect(cx + 10, y + 14, cw, ch, { fill: "#000", op: 0.18, r: 6 });
    p.open(`translate(${cx} ${y}) scale(${s})`);
    p.add(`<rect width="${cover.w}" height="${cover.h}" fill="${cover.bg || "#FFFFFF"}"/>`); cover.els.forEach(e => p.add(e)); cover.defs.forEach((v, k) => { if (!p.defs.has(k)) p.defs.set(k, v); });
    p.close();
  }
  p.rect(0, 1380, 1000, 120, { fill: dark ? B.coral : B.navy });
  mark(p, 60, 1395, 90, {});
  p.text("Bright Page Prints", 170, 1445, { font: "fredoka-700", size: 40, fill: "#FFFFFF" });
  p.text("Instant download on Etsy", 170, 1480, { font: "poppins-400", size: 22, fill: "#FFFFFF" });
  p.rect(700, 1408, 250, 64, { fill: B.sun, r: 32 });
  p.text("Shop now", 825, 1450, { font: "poppins-600", size: 28, fill: B.navy, anchor: "middle" });
  return p;
}
module.exports = { B, mark, logo, shopIcon, banner, receiptBanner, pin };
