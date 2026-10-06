// Kids activity pages.
const { Page, measure, fitSize, wrapLines, tint, rng, shuffle, clean } = require("./core");
const TH = require("./theme");
const IC = require("./icons");
const PZ = require("./puzzles");
const ST = require("./strokes");
const M = TH.M;

function start(ctx, title, sub, o = {}) {
  const p = new Page(o.w, o.h);
  TH.decorate(p, ctx.th, ctx.seed + (ctx.n++), { border: o.border !== false });
  const y = TH.header(p, ctx.th, title, sub, o);
  return { p, y };
}
function done(ctx, p, label, o = {}) { TH.footer(p, ctx.th); ctx.out.push({ page: p, label, key: !!o.key }); return p; }
const themeIcons = (ctx, n) => IC.iconSet(ctx.th.icons, n);
const LETTER_ICON = { A: "apple", B: "balloon", C: "cat", D: "dog", E: "egg", F: "fish", G: "gift", H: "house", I: "ice", K: "kite", L: "leaf", M: "moon", O: "owl", P: "pumpkin", Q: "crown", R: "rocket", S: "star", T: "tree", U: "umbrella", V: "car", W: "mitten", X: "gift", Y: "ball", Z: "bee" };
const LETTER_WORD = { A: "apple", B: "balloon", C: "cat", D: "dog", E: "egg", F: "fish", G: "gift", H: "house", L: "leaf", M: "moon", O: "owl", P: "pumpkin", R: "rocket", S: "star", T: "tree", U: "umbrella" };

// ---------- handwriting guide row ----------
function guides(p, th, x0, x1, base, cap) {
  p.line(x0, base - cap, x1, base - cap, { stroke: tint(th.c[1], 0.35), sw: 1.1 });
  p.line(x0, base - cap / 2, x1, base - cap / 2, { stroke: tint(th.c[0], 0.4), sw: 0.9, dash: "5 4" });
  p.line(x0, base, x1, base, { stroke: tint(th.c[1], 0.1), sw: 1.4 });
  p.line(x0, base + cap * 0.45, x1, base + cap * 0.45, { stroke: tint(th.c[1], 0.75), sw: 0.6 });
}
function traceRow(p, th, txt, x0, x1, base, cap, copies) {
  guides(p, th, x0, x1, base, cap);
  const w = ST.strokeWidth(txt, cap), gap = Math.max(cap * 0.6, 14);
  let x = x0 + 8;
  ST.drawStrokes(p, txt, x, base, cap, { color: th.ink, start: th.c[3] || th.c[0] }); x += w + gap;
  let n = 0;
  while (x + w < x1 - 4 && n < (copies || 99)) { ST.drawStrokes(p, txt, x, base, cap, { color: tint(th.ink, 0.55), style: "dots" }); x += w + gap; n++; }
}

const K = {};

K.tracing = function (ctx, pg) {
  const th = ctx.th;
  const src = pg.letters || pg.words || pg.items || [];
  let items = typeof src === "string" ? src.replace(/[^A-Za-z]/g, "").split("") : [].concat(src).map(w => clean(w).trim()).filter(Boolean);
  const mode = pg.mode || (pg.numbers ? "numbers" : items.length && items.every(w => /^[A-Za-z]{1,2}$/.test(w)) ? "letters" : "words");
  if (mode === "numbers") {
    const nums = (pg.numbers || items).map(String).slice(0, 20);
    for (let i = 0; i < nums.length; i += 5) {
      const { p, y } = start(ctx, pg.title || "Trace the Numbers", pg.subtitle || "Start at the green dot and follow the dots.", { icon: "pencil" });
      let yy = TH.fields(p, th, ["Name", "Date"], y + 4) + 6;
      const chunk = nums.slice(i, i + 5), rowH = (p.h - 70 - yy) / 5, cap = Math.min(52, rowH * 0.62);
      chunk.forEach((nm, j) => {
        const base = yy + j * rowH + cap + 8, n = parseInt(nm, 10);
        traceRow(p, th, nm, M, p.w - M - (n > 0 && n <= 10 ? 130 : 0), base, cap, 4);
        if (n > 0 && n <= 10) { const ic = themeIcons(ctx, 6)[j % 6]; for (let k = 0; k < n; k++) IC.draw(p, ic, p.w - M - 124 + (k % 5) * 25, base - cap + Math.floor(k / 5) * 27, 22, { a: th.c[k % 3], b: th.c[(k + 1) % 3] }); }
      });
      done(ctx, p, "Number tracing " + chunk[0] + "-" + chunk[chunk.length - 1]);
    }
    return;
  }
  if (mode === "letters") {
    const letters = [...new Set(items.map(l => l[0].toUpperCase()))];
    letters.forEach(L => {
      const lw = L.toLowerCase(), icon = LETTER_ICON[L] && IC.I[LETTER_ICON[L]] ? LETTER_ICON[L] : null, word = LETTER_WORD[L];
      const { p, y } = start(ctx, "Trace the Letter " + L, pg.subtitle || "Say the sound. Start at the green dot.", {});
      // feature panel
      const fy = y + 4, fh = 150;
      p.rect(M, fy, p.w - 2 * M, fh, { fill: tint(th.c[2], 0.82), r: 18 });
      ST.drawStrokes(p, L, M + 28, fy + fh - 28, 96, { color: th.c[0], sw: 8 });
      ST.drawStrokes(p, lw, M + 28 + ST.strokeWidth(L, 96) + 18, fy + fh - 28, 96, { color: th.c[1], sw: 8 });
      if (icon) { IC.draw(p, icon, p.w - M - 150, fy + 14, 100, { a: th.c[0], b: th.c[1] }); }
      if (word) p.text(word.charAt(0).toUpperCase() + word.slice(1), p.w - M - 100, fy + fh - 14, { font: th.bold, size: 18, fill: th.ink, anchor: "middle" });
      let yy = fy + fh + 26;
      const rows = [L, L, lw, lw, L + lw], rowH = (p.h - 56 - yy) / rows.length, cap = Math.min(54, rowH * 0.6);
      rows.forEach((t, j) => traceRow(p, th, t, M, p.w - M, yy + j * rowH + cap + 4, cap, j === 4 ? 3 : 99));
      done(ctx, p, "Letter " + L);
    });
    return;
  }
  for (let i = 0; i < items.length; i += 6) {
    const { p, y } = start(ctx, pg.title || "Trace the Words", pg.subtitle || "Trace each word, then write it on your own.", { icon: "pencil" });
    let yy = TH.fields(p, th, ["Name", "Date"], y + 4) + 4;
    const chunk = items.slice(i, i + 6), rowH = (p.h - 60 - yy) / Math.max(chunk.length, 4), cap = Math.min(42, rowH * 0.5);
    chunk.forEach((w, j) => {
      const base = yy + j * rowH + cap + 6, ic = IC.I[w.toLowerCase()] ? w.toLowerCase() : null;
      if (ic) IC.draw(p, ic, M, base - cap - 2, cap + 8, { a: th.c[j % 4], b: th.c[(j + 1) % 4] });
      traceRow(p, th, w, M + (ic ? cap + 16 : 0), p.w - M, base, cap, 3);
    });
    done(ctx, p, "Word tracing");
  }
};

K.math = function (ctx, pg) {
  const th = ctx.th, count = [12, 15, 16, 20, 24, 25].includes(+pg.count) ? +pg.count : 20;
  const op = ["+", "-", "x"].includes(pg.op) ? pg.op : "+", lo = Math.max(0, parseInt(pg.min) || 0), hi = Math.max(lo + 1, Math.min(99, parseInt(pg.max) || 10));
  const sheets = Math.max(1, Math.min(10, parseInt(pg.sheets) || 1));
  for (let s = 0; s < sheets; s++) {
    const r = rng(clean(pg.title) + op + lo + hi + count + s + ctx.seed), probs = [], ri = () => lo + Math.floor(r() * (hi - lo + 1));
    for (let i = 0; i < count; i++) { let a = ri(), b = ri(); if (op === "-" && b > a) [a, b] = [b, a]; probs.push([a, b, op === "+" ? a + b : op === "-" ? a - b : a * b]); }
    const icons = themeIcons(ctx, 4);
    const { p, y } = start(ctx, (pg.title || "Math Practice") + (sheets > 1 ? " " + (s + 1) : ""), pg.subtitle || "", { icon: icons[0], icon2: icons[1] });
    let yy = TH.fields(p, th, ["Name", "Date", "Score     / " + count], y + 4) + 6;
    const per = count % 5 === 0 ? 5 : 4, rows = Math.ceil(count / per), gw = (p.w - 2 * M) / per, gh = Math.min(128, (p.h - 50 - yy) / rows);
    const grid = (pp, top, cellH, ans, scale) => probs.forEach(([a, b, c], i) => {
      const x = M + gw * (i % per), yc = top + cellH * Math.floor(i / per), size = Math.min(24, cellH * 0.2) * (scale || 1);
      pp.rect(x + 4, yc + 4, gw - 8, cellH - 8, { fill: i % 2 ? "#FFFFFF" : tint(th.c[i % 3], 0.88), stroke: tint(th.c[i % 3], 0.55), sw: 1, r: 12 });
      pp.text(String(i + 1), x + 13, yc + 18, { font: th.bold, size: 8.5, fill: th.soft });
      const rx = x + gw / 2 + size * 1.2;
      pp.text(String(a), rx, yc + cellH * 0.38, { font: th.bold, size, fill: th.ink, anchor: "end" });
      pp.text((op === "x" ? "x" : op) + " " + b, rx, yc + cellH * 0.38 + size * 1.15, { font: th.bold, size, fill: th.ink, anchor: "end" });
      pp.line(rx - size * 2.4, yc + cellH * 0.38 + size * 1.5, rx + 2, yc + cellH * 0.38 + size * 1.5, { stroke: th.ink, sw: 1.6, cap: "round" });
      if (ans) pp.text(String(c), rx, yc + cellH * 0.38 + size * 2.7, { font: th.head, size, fill: th.c[0], anchor: "end" });
    });
    grid(p, yy, gh, false);
    done(ctx, p, (pg.title || "Math") + (sheets > 1 ? " " + (s + 1) : ""));
    ctx.keys.push(() => { const kp = keyPage(ctx, "Answers: " + (pg.title || "Math") + (sheets > 1 ? " " + (s + 1) : "")); grid(kp.p, kp.y, Math.min(120, (kp.p.h - 60 - kp.y) / rows), true); return kp.p; });
  }
};

function keyPage(ctx, title) {
  const p = new Page(); const th = ctx.th;
  p.text("Answer Key", M, 52, { font: th.bold, size: 10, fill: th.c[0], ls: 1.5 });
  p.text(title, M, 80, { font: th.head, size: fitSize(title, th.head, 24, p.w - 2 * M, 12), fill: th.ink });
  p.rect(M, 92, 60, 4, { fill: th.c[1], r: 2 });
  return { p, y: 112 };
}

K.counting = function (ctx, pg) {
  const th = ctx.th, sheets = Math.max(1, Math.min(8, parseInt(pg.sheets) || 2)), max = Math.max(3, Math.min(12, parseInt(pg.max) || 10));
  const icons = (pg.icons || []).filter(i => IC.I[i]); const pool = icons.length ? icons : themeIcons(ctx, 12);
  for (let s = 0; s < sheets; s++) {
    const r = rng(ctx.seed + "count" + s);
    const { p, y } = start(ctx, pg.title || "Count and Circle", pg.subtitle || "Count the pictures. Circle the right number.", { icon: pool[0] });
    const yy = TH.fields(p, th, ["Name"], y + 2, M, M + 260) + 4;
    const cols = 2, rowsN = 3, gw = (p.w - 2 * M - 16) / cols, gh = (p.h - 48 - yy - 2 * 14) / rowsN;
    for (let i = 0; i < 6; i++) {
      const x = M + (i % cols) * (gw + 16), y0 = yy + Math.floor(i / cols) * (gh + 14), ic = pool[(s * 6 + i) % pool.length];
      const n = 1 + Math.floor(r() * max), col = th.c[i % th.c.length];
      p.rect(x, y0, gw, gh, { fill: "#FFFFFF", stroke: tint(col, 0.4), sw: 1.6, r: 16 });
      const area = { x: x + 14, y: y0 + 12, w: gw - 28, h: gh - 64 }, per = n <= 4 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3), rws = Math.ceil(n / per);
      const sz = Math.min(area.w / per - 6, area.h / rws - 6, 46);
      for (let k = 0; k < n; k++) {
        const cx = area.x + (area.w - per * (sz + 6)) / 2 + (k % per) * (sz + 6), cy = area.y + (area.h - rws * (sz + 6)) / 2 + Math.floor(k / per) * (sz + 6);
        IC.draw(p, ic, cx, cy, sz, { a: col, b: th.c[(i + 2) % th.c.length] });
      }
      const opts = shuffle([n, Math.max(1, n === 1 ? 2 : n - 1), Math.min(max + 1, n + 1 + (n % 2))].filter((v, j, a) => a.indexOf(v) === j), r);
      while (opts.length < 3) opts.push(opts[opts.length - 1] + 1);
      opts.slice(0, 3).forEach((v, j) => { const cx = x + gw / 2 + (j - 1) * 52, cy = y0 + gh - 28; p.circle(cx, cy, 18, { fill: tint(col, 0.85), stroke: tint(col, 0.3), sw: 1.2 }); p.text(String(v), cx, cy + 7, { font: th.head, size: 19, fill: th.ink, anchor: "middle" }); });
    }
    done(ctx, p, "Counting " + (s + 1));
  }
};

K.ispy = function (ctx, pg) {
  const th = ctx.th, sheets = Math.max(1, Math.min(6, parseInt(pg.sheets) || 1));
  const given = (pg.icons || []).filter(i => IC.I[i]);
  for (let s = 0; s < sheets; s++) {
    const r = rng(ctx.seed + "ispy" + s), pool = given.length >= 4 ? given : themeIcons(ctx, 12);
    const kinds = shuffle(pool, r).slice(0, 6), counts = kinds.map(() => 3 + Math.floor(r() * 6));
    const { p, y } = start(ctx, pg.title || "I Spy", pg.subtitle || "Count each picture and write how many you spy.", { icon: kinds[0], icon2: kinds[1] });
    const area = { x: M + 6, y: y + 6, w: p.w - 2 * M - 12, h: p.h - y - 210 };
    p.rect(area.x - 6, area.y - 6, area.w + 12, area.h + 12, { fill: tint(th.c[2], 0.88), stroke: tint(th.c[2], 0.4), sw: 1.5, r: 20 });
    const items = []; kinds.forEach((k, i) => { for (let j = 0; j < counts[i]; j++) items.push(k); });
    const placed = [], tally = kinds.map(() => 0);
    shuffle(items, r).forEach((k, i) => {
      let best = null;
      for (let t = 0; t < 400; t++) {
        const sz = 38 + r() * 14, x = area.x + r() * (area.w - sz), yv = area.y + r() * (area.h - sz);
        if (placed.every(q => Math.hypot(q.x + q.s / 2 - x - sz / 2, q.y + q.s / 2 - yv - sz / 2) > (q.s + sz) / 2 + 2)) { best = { x, y: yv, s: sz }; break; }
      }
      if (!best) return; placed.push(best); tally[kinds.indexOf(k)]++;
      const a = (r() - 0.5) * 50, ci = kinds.indexOf(k);
      p.open(`rotate(${a.toFixed(1)} ${(best.x + best.s / 2).toFixed(1)} ${(best.y + best.s / 2).toFixed(1)})`);
      IC.draw(p, k, best.x, best.y, best.s, { a: th.c[ci % th.c.length], b: th.c[(ci + 1) % th.c.length] }); p.close();
    });
    const ty = p.h - 190, tw = (p.w - 2 * M) / 3;
    kinds.forEach((k, i) => {
      const x = M + (i % 3) * tw, yv = ty + Math.floor(i / 3) * 70;
      p.rect(x + 4, yv, tw - 8, 58, { fill: "#FFFFFF", stroke: tint(th.c[i % 4], 0.45), sw: 1.4, r: 14 });
      IC.draw(p, k, x + 14, yv + 7, 44, { a: th.c[i % th.c.length], b: th.c[(i + 1) % th.c.length] });
      p.rect(x + tw - 74, yv + 12, 56, 34, { fill: "#FFFFFF", stroke: th.line, sw: 1.2, r: 8 });
    });
    done(ctx, p, "I Spy " + (s + 1));
    ctx.keys.push({ group: "ispy", draw: (kp, x, yv, w, h) => { kp.text("I Spy " + (s + 1), x, yv + 8, { font: th.bold, size: 10, fill: th.ink }); kinds.forEach((k, i) => { IC.draw(kp, k, x + (i % 2) * (w / 2), yv + 20 + Math.floor(i / 2) * 40, 32, { a: th.c[i % th.c.length], b: th.c[(i + 1) % th.c.length] }); kp.text(String(tally[i]), x + (i % 2) * (w / 2) + 40, yv + 42 + Math.floor(i / 2) * 40, { font: th.head, size: 18, fill: th.ink }); }); } });
  }
};

const MAZE_PAIRS = [["bunny", "carrot"], ["bee", "flower"], ["dog", "ball"], ["rocket", "moon"], ["car", "house"], ["owl", "moon"], ["cat", "fish"], ["bear", "cookie"], ["turtle", "leaf"], ["gingerbread", "house"], ["snowman", "mitten"], ["ghost", "pumpkin"], ["butterfly", "flower"], ["sailboat", "sun"], ["truck", "house"]];
const SIZES = [[7, 9], [9, 11], [11, 14], [14, 17], [17, 21], [20, 25]];
function drawMaze(p, th, mz, x, y, w, h, sol) {
  const cs = Math.min(w / mz.cols, h / mz.rows), ox = x + (w - cs * mz.cols) / 2, oy = y + (h - cs * mz.rows) / 2, sw = Math.max(1.6, Math.min(4, cs * 0.12));
  let d = "";
  for (let c = 0; c < mz.cols * mz.rows; c++) {
    const cx = c % mz.cols, cy = Math.floor(c / mz.cols), X = ox + cx * cs, Y = oy + cy * cs;
    if (mz.wallE[c] && cx < mz.cols - 1) d += `M${X + cs} ${Y} L${X + cs} ${Y + cs} `;
    if (mz.wallS[c] && cy < mz.rows - 1) d += `M${X} ${Y + cs} L${X + cs} ${Y + cs} `;
  }
  const W = cs * mz.cols, H = cs * mz.rows;
  d += `M${ox + cs} ${oy} L${ox + W} ${oy} L${ox + W} ${oy + H} M${ox + W - cs} ${oy + H} L${ox} ${oy + H} L${ox} ${oy}`;
  p.path(d, { stroke: th.ink, sw, cap: "round", join: "round" });
  if (sol) p.path("M" + sol.map(c => (ox + (c % mz.cols) * cs + cs / 2).toFixed(1) + " " + (oy + Math.floor(c / mz.cols) * cs + cs / 2).toFixed(1)).join(" L"), { stroke: th.c[0], sw: Math.max(1.5, cs * 0.28), cap: "round", join: "round", op: 0.85 });
  return { ox, oy, cs, W, H };
}
K.maze = function (ctx, pg) {
  const th = ctx.th, count = Math.max(1, Math.min(12, parseInt(pg.count) || 1)), base = Math.max(1, Math.min(6, parseInt(pg.difficulty) || 2));
  const pairs = MAZE_PAIRS.filter(([a, b]) => IC.I[a] && IC.I[b]);
  const themed = pairs.filter(([a, b]) => IC.iconSet(th.icons).includes(a) || IC.iconSet(th.icons).includes(b));
  const list = themed.length >= 3 ? themed : pairs;
  for (let i = 0; i < count; i++) {
    const lvl = Math.min(6, base + Math.floor(i * 3 / Math.max(count, 1))), [cols, rows] = SIZES[lvl - 1];
    const [a, b] = pg.start && IC.I[pg.start] ? [pg.start, IC.I[pg.end] ? pg.end : "star"] : list[(i + ctx.n) % list.length];
    const mz = PZ.maze(cols, rows, ctx.seed + "maze" + i + pg.title);
    const title = count === 1 && pg.title ? pg.title : "Help the " + IC.word(a) + " find the " + IC.word(b);
    const { p, y } = start(ctx, title, pg.subtitle || (count > 1 ? "Maze " + (i + 1) + " of " + count + " - level " + lvl : "Find the path from start to finish."), {});
    const top = y + 54, bottom = p.h - 92;
    const g = drawMaze(p, th, mz, M + 10, top, p.w - 2 * M - 20, bottom - top);
    IC.draw(p, a, g.ox - 4, g.oy - 56, 50, { a: th.c[0], b: th.c[1] });
    p.text("START", g.ox + 50, g.oy - 20, { font: th.bold, size: 11, fill: th.c[3] || th.c[0] });
    IC.draw(p, b, g.ox + g.W - 46, g.oy + g.H + 4, 50, { a: th.c[2], b: th.c[0] });
    p.text("FINISH", g.ox + g.W - 52, g.oy + g.H + 36, { font: th.bold, size: 11, fill: th.c[0], anchor: "end" });
    done(ctx, p, "Maze " + (i + 1));
    ctx.keys.push({ group: "mazes", draw: (kp, x, yv, w, h) => { drawMaze(kp, th, mz, x, yv + 14, w, h - 14, mz.solution); kp.text("Maze " + (i + 1), x, yv + 8, { font: th.bold, size: 10, fill: th.ink }); } });
  }
};

K.wordsearch = function (ctx, pg) {
  const th = ctx.th;
  const words = (pg.words || []).map(w => clean(w).toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 3 && w.length <= 12);
  const size = Math.max(9, Math.min(15, parseInt(pg.size) || (words.length > 14 ? 14 : words.length > 10 ? 12 : 10)));
  const ws = PZ.wordsearch(words, size, parseInt(pg.level) || 2, ctx.seed + "ws" + pg.title);
  const { p, y } = start(ctx, pg.title || "Word Search", pg.subtitle || "Find and circle every word in the puzzle.", { icon: themeIcons(ctx, 2)[0], icon2: themeIcons(ctx, 2)[1] });
  const gs = Math.min(p.w - 2 * M - 40, p.h - y - 230), cs = gs / size, gx = (p.w - gs) / 2, gy = y + 6;
  const drawGrid = (pp, X, Y, C, key) => {
    pp.rect(X - 10, Y - 10, C * size + 20, C * size + 20, { fill: "#FFFFFF", stroke: th.c[1], sw: 2.2, r: 16 });
    if (key) ws.placed.forEach((pl, i) => { const x0 = X + pl.x0 * C + C / 2, y0 = Y + pl.y0 * C + C / 2, x1 = X + pl.x1 * C + C / 2, y1 = Y + pl.y1 * C + C / 2;
      pp.line(x0, y0, x1, y1, { stroke: tint(th.c[i % th.c.length], 0.35), sw: C * 0.72, cap: "round", op: 0.75 }); });
    ws.grid.forEach((row, ry) => row.forEach((ch, rx) => pp.text(ch, X + rx * C + C / 2, Y + ry * C + C * 0.68, { font: th.bold, size: C * 0.56, fill: th.ink, anchor: "middle" })));
  };
  drawGrid(p, gx, gy, cs, false);
  const ly = gy + gs + 32, cols = 3, cw = (p.w - 2 * M) / cols;
  ws.placed.forEach((pl, i) => { const x = M + 20 + (i % cols) * cw, yy = ly + Math.floor(i / cols) * 24;
    p.rect(x, yy - 11, 12, 12, { stroke: th.c[i % 3], sw: 1.4, r: 3 }); p.text(pl.word, x + 20, yy, { font: th.bold, size: 12.5, fill: th.ink }); });
  done(ctx, p, pg.title || "Word search");
  ctx.keys.push({ group: "words", draw: (kp, x, yv, w, h) => { const C = Math.min(w, h - 20) / size; kp.text(pg.title || "Word search", x, yv + 8, { font: th.bold, size: 10, fill: th.ink }); drawGrid(kp, x + 10, yv + 26, C * 0.92, true); } });
};

K.scramble = function (ctx, pg) {
  const th = ctx.th;
  const words = (pg.words || []).map(w => clean(w).toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 3 && w.length <= 11).slice(0, 12);
  const scr = words.map((w, i) => PZ.scramble(w, ctx.seed + w + i));
  const { p, y } = start(ctx, pg.title || "Word Scramble", pg.subtitle || "Unscramble the letters to make a word.", { icon: themeIcons(ctx, 1)[0] });
  const rh = Math.min(76, (p.h - 50 - y) / Math.max(words.length, 6));
  scr.forEach((s, i) => {
    const yy = y + 8 + i * rh, tile = Math.min(34, rh - 20, (p.w / 2 - 20 - M - 36) / s.length - 4);
    p.circle(M + 12, yy + tile / 2, 12, { fill: th.c[i % th.c.length] }); p.text(String(i + 1), M + 12, yy + tile / 2 + 4.5, { font: th.bold, size: 12, fill: "#FFFFFF", anchor: "middle" });
    s.split("").forEach((ch, k) => { const x = M + 36 + k * (tile + 4); p.rect(x, yy, tile, tile, { fill: tint(th.c[i % th.c.length], 0.82), r: 5 }); p.text(ch, x + tile / 2, yy + tile * 0.72, { font: th.head, size: tile * 0.62, fill: th.ink, anchor: "middle" }); });
    p.line(p.w / 2 + 50, yy + tile, p.w - M, yy + tile, { stroke: th.ink, sw: 1.2 });
  });
  done(ctx, p, pg.title || "Word scramble");
  ctx.keys.push({ group: "words", draw: (kp, x, yv, w, h) => { kp.text(pg.title || "Word scramble", x, yv + 8, { font: th.bold, size: 10, fill: th.ink }); words.forEach((wd, i) => kp.text((i + 1) + ". " + scr[i] + " = " + wd, x, yv + 30 + i * Math.min(18, (h - 30) / words.length), { font: th.body, size: 10.5, fill: th.ink })); } });
};

K.matching = function (ctx, pg) {
  const th = ctx.th, r = rng(ctx.seed + "match");
  const given = (pg.icons || []).filter(i => IC.I[i]); const icons = (given.length >= 4 ? given : themeIcons(ctx, 8)).slice(0, 6);
  const words = shuffle(icons, r);
  const { p, y } = start(ctx, pg.title || "Match the Pictures", pg.subtitle || "Draw a line from each picture to its word.", { icon: icons[0] });
  const rh = (p.h - 60 - y) / icons.length;
  icons.forEach((ic, i) => {
    const yy = y + i * rh + rh / 2;
    p.circle(M + 52, yy, Math.min(40, rh / 2 - 4), { fill: tint(th.c[i % th.c.length], 0.82) });
    IC.draw(p, ic, M + 52 - 30, yy - 30, 60, { a: th.c[i % th.c.length], b: th.c[(i + 2) % th.c.length] });
    p.circle(M + 120, yy, 6, { fill: th.ink });
    const wd = IC.word(words[i]), yw = y + i * rh + rh / 2;
    p.circle(p.w - M - 190, yw, 6, { fill: th.ink });
    p.text(wd, p.w - M - 170, yw + 7, { font: th.head, size: 22, fill: th.ink });
  });
  done(ctx, p, pg.title || "Matching");
};

K.dotdot = function (ctx, pg) {
  const th = ctx.th;
  let list = [].concat(pg.icons || pg.icon || []).filter(i => IC.DOT_ICONS.includes(i));
  if (!list.length) list = IC.iconSet(th.icons).filter(i => IC.DOT_ICONS.includes(i));
  if (!list.length) list = ["star", "heart", "house", "fish"];
  const count = Math.max(1, Math.min(10, parseInt(pg.count) || Math.min(list.length, 4)));
  for (let i = 0; i < count; i++) {
    const ic = list[i % list.length], n = Math.min(40, 14 + i * 4 + (ctx.n % 3) * 2);
    const pts = IC.samplePoints(ic, n);
    const { p, y } = start(ctx, pg.title || "Connect the Dots", "Join the dots from 1 to " + n + ", then color the picture.", {});
    const box = { x: M + 30, y: y + 20, s: Math.min(p.w - 2 * M - 60, p.h - y - 120) };
    const cxm = pts.reduce((a, q) => a + q[0], 0) / pts.length, cym = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    pts.forEach(([px, py], k) => {
      const X = box.x + px / 100 * box.s, Y = box.y + py / 100 * box.s;
      p.circle(X, Y, k === 0 ? 5 : 3.6, { fill: k === 0 ? th.c[3] || th.c[0] : th.ink });
      let dx = px - cxm, dy = py - cym; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      p.text(String(k + 1), X + dx * 13, Y + dy * 13 + 4, { font: th.bold, size: 11, fill: k === 0 ? th.c[3] || th.c[0] : th.soft, anchor: "middle" });
    });
    done(ctx, p, "Dot to dot " + (i + 1));
    ctx.keys.push({ group: "dots", draw: (kp, x, yv, w, h) => { kp.text("Dot to dot " + (i + 1) + ": " + IC.word(ic), x, yv + 8, { font: th.bold, size: 10, fill: th.ink }); IC.draw(kp, ic, x + 10, yv + 20, Math.min(w, h - 24) - 10, { a: th.c[0], b: th.c[1] }); } });
  }
};

K.shapes = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Trace the Shapes", pg.subtitle || "Trace each shape. Then color it in.", {});
  const shapes = [["circle"], ["square"], ["triangle"], ["rectangle"], ["star"], ["heart"], ["oval"], ["diamond"]];
  const cw = (p.w - 2 * M) / 2, ch = (p.h - y - 50) / 4;
  shapes.forEach(([nm], i) => {
    const x = M + (i % 2) * cw, yy = y + Math.floor(i / 2) * ch, cx = x + cw / 2, cy = yy + ch / 2 - 10, s = Math.min(cw, ch) * 0.34, col = th.c[i % th.c.length];
    const o = { stroke: col, sw: 4, dash: "0.1 9", cap: "round", join: "round" };
    if (nm === "circle") p.circle(cx, cy, s, o);
    else if (nm === "square") p.rect(cx - s, cy - s, 2 * s, 2 * s, o);
    else if (nm === "rectangle") p.rect(cx - s * 1.5, cy - s * 0.8, 3 * s, 1.6 * s, o);
    else if (nm === "oval") p.ellipse(cx, cy, s * 1.4, s * 0.8, o);
    else if (nm === "triangle") p.poly([[cx, cy - s], [cx + s * 1.1, cy + s * 0.9], [cx - s * 1.1, cy + s * 0.9]], o);
    else if (nm === "diamond") p.poly([[cx, cy - s * 1.1], [cx + s * 0.8, cy], [cx, cy + s * 1.1], [cx - s * 0.8, cy]], o);
    else { const pts = IC.samplePoints(nm, 60); p.poly(pts.map(([a, b]) => [cx - s * 1.05 + a / 100 * 2.1 * s, cy - s * 1.05 + b / 100 * 2.1 * s]), o); }
    p.text(nm.charAt(0).toUpperCase() + nm.slice(1), cx, yy + ch - 12, { font: th.head, size: 17, fill: th.ink, anchor: "middle" });
  });
  done(ctx, p, "Shapes");
};

K.coloring = function (ctx, pg) {
  const th = ctx.th, subjects = pg.subjects || [pg];
  subjects.forEach((sj, i) => {
    const subject = clean(sj.subject || sj.title || pg.subject || "picture");
    const title = clean(sj.title || pg.title || "Color the " + subject);
    const p = new Page(); TH.decorate(p, th, ctx.seed + "col" + i, { border: false });
    const size = fitSize(title, th.head, 40, p.w - 2 * M, 18);
    p.text(title, p.w / 2, 82, { font: th.head, size, fill: "#FFFFFF", stroke: th.ink, sw: 1.6, anchor: "middle" });
    const box = { x: M, y: 108, w: p.w - 2 * M, h: p.h - 108 - 70 };
    p.rect(box.x, box.y, box.w, box.h, { stroke: th.ink, sw: 2.2, r: 26, fill: "#FFFFFF" });
    const art0 = sj.art || null, art = art0 && (art0.paths || art0._paths) ? Object.assign({}, art0, { paths: art0.paths || art0._paths }) : null;
    if (art && art.paths && art.paths.length) {
      const vb = art.viewBox || [0, 0, 400, 400], vw = vb[2] || 400, vh = vb[3] || 400, sc = Math.min((box.w - 50) / vw, (box.h - 50) / vh);
      const ox = box.x + (box.w - vw * sc) / 2 - (vb[0] || 0) * sc, oy = box.y + (box.h - vh * sc) / 2 - (vb[1] || 0) * sc;
      p.open(`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${sc.toFixed(4)})`);
      if (art.mode === "filled") art.paths.forEach(d => p.path(String(d).replace(/[^MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]/g, ""), { fill: "#1E1E1E", rule: "evenodd" }));
      else art.paths.forEach(d => p.path(String(d).replace(/[^MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]/g, ""), { fill: "#FFFFFF", stroke: "#1E1E1E", sw: 3.2 / sc * (art.weight || 1), cap: "round", join: "round" }));
      p.close();
    } else {
      const ic = IC.I[sj.icon] ? sj.icon : IC.I[subject.toLowerCase()] ? subject.toLowerCase() : themeIcons(ctx, 6)[i % 6];
      const s = Math.min(box.w, box.h) - 170, others = themeIcons(ctx, 8).filter(x => x !== ic), r = rng(ctx.seed + "cf" + i);
      IC.draw(p, ic, box.x + (box.w - s) / 2, box.y + 40, s, { style: "line", ow: 1.8 });
      [[box.x + 20, box.y + box.h - 112], [box.x + box.w - 112, box.y + box.h - 112], [box.x + box.w / 2 - 46, box.y + box.h - 104]].forEach(([x, yv], k) => IC.draw(p, others[(k + i) % others.length], x, yv, 92, { style: "line", ow: 2.4 }));
      [[box.x + 26, box.y + 24], [box.x + box.w - 70, box.y + 30]].forEach(([x, yv], k) => IC.draw(p, k ? "cloud" : "sun", x, yv, 48, { style: "line", ow: 3 }));
    }
    TH.fields(p, th, ["Name"], p.h - 40, M + 120, p.w - M - 120);
    ctx.out.push({ page: p, label: "Coloring: " + subject, coloring: true });
  });
};

K.drawing = function (ctx, pg) {
  const th = ctx.th, prompts = (pg.prompts || [pg.prompt || pg.title || "Draw a picture"]).slice(0, 10);
  prompts.forEach((pr, i) => {
    const { p, y } = start(ctx, clean(pr), pg.subtitle || "Draw it here, then color it in.", {});
    p.rect(M, y + 6, p.w - 2 * M, p.h - y - 130, { stroke: th.c[1], sw: 2.2, r: 22, dash: "10 6" });
    TH.lines(p, th, M, p.h - 120, p.w - 2 * M, p.h - 50, 22);
    done(ctx, p, "Drawing prompt");
  });
};

K.reward = function (ctx, pg) {
  const th = ctx.th, n = [10, 15, 20, 25, 30].includes(+pg.spots) ? +pg.spots : 20, desc = !!pg.countdown;
  const { p, y } = start(ctx, pg.title || "My Reward Chart", pg.subtitle || "Color a star each time you reach your goal!", { icon: "star" });
  let yy = TH.fields(p, th, ["Name", "Started"], y + 4);
  if (pg.goal && !/^_+$/.test(pg.goal)) { p.text("My goal:", M, yy + 8, { font: th.bold, size: 13, fill: th.c[0] }); yy = p.para(pg.goal, M + 70, yy + 8, p.w - 2 * M - 70, { font: th.bold, size: 13, fill: th.ink }) + 4; }
  else { p.text("My goal:", M, yy + 8, { font: th.bold, size: 13, fill: th.c[0] }); p.line(M + 70, yy + 10, p.w - M, yy + 10, { stroke: th.line }); yy += 24; }
  const per = 5, rowsN = Math.ceil(n / per), area = p.h - 150 - yy, cell = Math.min((p.w - 2 * M) / per, area / rowsN), gx = (p.w - cell * per) / 2;
  const shape = pg.shape && IC.I[pg.shape] ? pg.shape : "star";
  for (let i = 0; i < n; i++) {
    const x = gx + (i % per) * cell, yv = yy + 6 + Math.floor(i / per) * cell, s = cell * 0.86;
    IC.draw(p, shape, x + (cell - s) / 2, yv + (cell - s) / 2, s, { style: "line", ow: 2.6, ink: tint(th.c[i % th.c.length], -0.05) });
    p.text(String(desc ? n - i : i + 1), x + cell / 2, yv + cell * 0.6, { font: th.head, size: cell * 0.2, fill: tint(th.c[i % th.c.length], 0.1), anchor: "middle" });
  }
  const by = p.h - 128;
  p.rect(M, by, p.w - 2 * M, 74, { fill: tint(th.c[2], 0.85), stroke: th.c[2], sw: 1.6, r: 18 });
  IC.draw(p, "gift", M + 14, by + 12, 50, { a: th.c[0], b: th.c[1] });
  p.text(clean(pg.prizeLabel || "When I fill every star, I earn:"), M + 76, by + 30, { font: th.bold, size: 13, fill: th.ink });
  p.line(M + 76, by + 56, p.w - M - 18, by + 56, { stroke: th.ink, sw: 1 });
  done(ctx, p, pg.title || "Reward chart");
};

K.chart = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Weekly Chart", pg.subtitle || "", { icon: themeIcons(ctx, 1)[0] });
  let yy = TH.fields(p, th, (pg.fieldsList || ["Name", "Week of"]), y + 4) + 4;
  const cols = (pg.columns && pg.columns.length ? pg.columns : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map(clean).slice(0, 8);
  const rows = (pg.rows || []).map(clean).slice(0, 12), first = cols.length > 5 ? 190 : 230, cw = (p.w - 2 * M - first) / cols.length, hh = 34;
  const bottom = pg.footer ? p.h - 96 : p.h - 52, rh = Math.min(96, (bottom - yy - hh) / Math.max(1, rows.length));
  p.rect(M, yy, p.w - 2 * M, hh, { fill: th.c[0], r: 12 });
  p.text(clean(pg.rowHead || "Task"), M + 14, yy + 22, { font: th.bold, size: 12, fill: "#FFFFFF" });
  cols.forEach((c, i) => p.text(c, M + first + cw * i + cw / 2, yy + 22, { font: th.bold, size: 11, fill: "#FFFFFF", anchor: "middle" }));
  yy += hh + 4;
  const icons = themeIcons(ctx, 12);
  rows.forEach((rw, i) => {
    if (i % 2 === 0) p.rect(M, yy, p.w - 2 * M, rh - 4, { fill: tint(th.c[1], 0.88), r: 10 });
    const fsz = rh > 70 ? 15 : 12, ls = wrapLines(rw, th.bold, fsz, first - 30 - Math.min(rh - 14, 44)).slice(0, 2);
    const isz = Math.min(rh - 16, 52); IC.draw(p, icons[i % icons.length], M + 8, yy + (rh - 4) / 2 - isz / 2, isz, { a: th.c[i % th.c.length], b: th.c[(i + 1) % th.c.length] });
    ls.forEach((l, j) => p.text(l, M + 20 + Math.min(rh - 16, 52), yy + (rh - 4) / 2 + 5 - (ls.length - 1) * fsz * 0.6 + j * fsz * 1.2, { font: th.bold, size: fsz, fill: th.ink }));
    const bs = Math.min(rh > 60 ? 34 : 24, rh - 14, cw - 8);
    cols.forEach((c, k) => p.rect(M + first + cw * k + cw / 2 - bs / 2, yy + (rh - 4) / 2 - bs / 2, bs, bs, { fill: "#FFFFFF", stroke: th.c[k % th.c.length], sw: 1.5, r: 6 }));
    yy += rh;
  });
  if (pg.footer) { p.rect(M, p.h - 86, p.w - 2 * M, 36, { fill: tint(th.c[2], 0.75), r: 12 }); p.text(clean(pg.footer), p.w / 2, p.h - 63, { font: th.bold, size: 13, fill: th.ink, anchor: "middle" }); }
  done(ctx, p, pg.title || "Chart");
};

K.letter = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Dear Friend", pg.subtitle || "", { icon: themeIcons(ctx, 1)[0] });
  let yy = TH.fields(p, th, ["Date"], y + 4, M, M + 240) + 6;
  const n = Math.max(6, Math.min(16, parseInt(pg.lines) || 12)), prompts = (pg.prompts || []).map(clean);
  p.rect(M - 6, yy - 6, p.w - 2 * M + 12, p.h - yy - 50, { fill: "#FFFFFF", stroke: tint(th.c[0], 0.4), sw: 2, r: 20 });
  const lh = (p.h - yy - 70) / n;
  for (let i = 0; i < n; i++) { const ly = yy + (i + 1) * lh; p.line(M + 12, ly, p.w - M - 12, ly, { stroke: th.line, sw: 0.9 }); if (prompts[i]) p.text(prompts[i], M + 14, ly - 7, { font: th.sub, size: 17, fill: th.ink }); }
  done(ctx, p, pg.title || "Letter");
};

K.countdown = function (ctx, pg) { K.reward(ctx, Object.assign({ countdown: true, spots: pg.days || 25, shape: pg.shape || "star", prizeLabel: pg.prizeLabel || "The big day is here!" }, pg)); };

module.exports = { K, start, done, keyPage, guides, traceRow, drawMaze };
