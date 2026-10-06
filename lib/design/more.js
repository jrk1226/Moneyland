// Planner, tracker, calendar and party pages.
const { Page, measure, fitSize, wrapLines, tint, rng, shuffle, clean } = require("./core");
const TH = require("./theme");
const IC = require("./icons");
const { start, done } = require("./kids");
const M = TH.M;
const P = {};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

P.table = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Tracker", pg.subtitle || "", { border: false });
  let yy = y + 2;
  const fl = pg.fieldsList || (pg.fields ? String(pg.fields).split(/_{3,}/).map(s => s.replace(/[:\s]+$/, "").trim()).filter(Boolean).slice(0, 3) : []);
  if (fl.length) yy = TH.fields(p, th, fl, yy + 4) + 2;
  let cols = (pg.columns || []).map(clean).filter(Boolean).slice(0, 7); if (!cols.length) cols = ["Date", "Item", "Amount"];
  const wts = cols.map(c => /note|description|item|detail|book|title|exercise|meal|activity|idea|address|name|task|category|workout|why|goal|step/i.test(c) ? 2 : 1), sum = wts.reduce((a, b) => a + b, 0), widths = wts.map(w => w / sum * (p.w - 2 * M));
  const labels = (pg.rowLabels || []).map(clean), notes = (pg.notes || []).slice(0, 2).map(clean);
  const hh = 30, rows = Math.max(labels.length, Math.max(7, Math.min(26, parseInt(pg.rows) || 16))), bottom = p.h - 48 - notes.length * 22, rh = Math.min(34, (bottom - yy - hh) / rows);
  p.rect(M, yy, p.w - 2 * M, hh, { fill: th.c[0], r: th.style === "minimal" ? 3 : 10 });
  let x = M; cols.forEach((c, i) => { const fs = fitSize(c, th.bold, 10, widths[i] - 8, 7); p.text(c, x + widths[i] / 2, yy + 19.5, { font: th.bold, size: fs, fill: "#FFFFFF", anchor: "middle" }); x += widths[i]; });
  yy += hh; const top = yy;
  for (let r2 = 0; r2 < rows; r2++) {
    if (r2 % 2) p.rect(M, yy, p.w - 2 * M, rh, { fill: tint(th.c[0], 0.92) });
    p.line(M, yy + rh, p.w - M, yy + rh, { stroke: th.line, sw: 0.6 });
    if (labels[r2]) p.text(labels[r2], M + 8, yy + rh / 2 + 4, { font: th.bold, size: fitSize(labels[r2], th.bold, 10, widths[0] - 14, 7), fill: th.ink });
    if (pg.totalRow && r2 === rows - 1) p.text("Total", M + 8, yy + rh / 2 + 4, { font: th.bold, size: 10.5, fill: th.ink });
    yy += rh;
  }
  x = M; widths.slice(0, -1).forEach(w => { x += w; p.line(x, top, x, yy, { stroke: th.line, sw: 0.6 }); });
  p.rect(M, top - hh, p.w - 2 * M, yy - top + hh, { stroke: tint(th.c[0], 0.5), sw: 1, r: th.style === "minimal" ? 3 : 10 });
  yy += 20; notes.forEach(n => { p.circle(M + 3, yy - 4, 2.4, { fill: th.c[1] }); yy = p.para(n, M + 12, yy, p.w - 2 * M - 12, { font: th.body, size: 9.5, fill: th.ink }) + 4; });
  done(ctx, p, pg.title || "Tracker");
};

// Sections laid out as cards: [{head, kind: lines|checks|hours|dots|box, count, wide}]
P.planner = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Planner", pg.subtitle || "", { border: false });
  let yy = y + 2;
  const fl = pg.fieldsList || (pg.fields ? String(pg.fields).split(/_{3,}/).map(s => s.replace(/[:\s]+$/, "").trim()).filter(Boolean).slice(0, 3) : ["Date"]);
  if (fl.length) yy = TH.fields(p, th, fl, yy + 4) + 4;
  const secs = (pg.sections || []).slice(0, 8).map(s => ({ head: clean(s.head || s.title), kind: ["lines", "checks", "hours", "dots", "box", "bullets"].includes(s.kind) ? s.kind : "lines", count: Math.max(2, Math.min(18, parseInt(s.count) || 5)), wide: !!s.wide }));
  const rowsL = []; for (let i = 0; i < secs.length; i++) { const s = secs[i]; if (s.wide || i === secs.length - 1 || secs[i + 1].wide) rowsL.push([s]); else { rowsL.push([s, secs[i + 1]]); i++; } }
  const units = rowsL.reduce((a, r) => a + Math.max(...r.map(s => s.count)), 0), lh = Math.max(14, Math.min(26, (p.h - 50 - yy - rowsL.length * 46) / units));
  const hour0 = Math.max(5, Math.min(9, parseInt(pg.startHour) || 6));
  rowsL.forEach((row, ri) => {
    const n = Math.max(...row.map(s => s.count)), bh = 40 + n * lh, w = row.length === 2 ? (p.w - 2 * M - 14) / 2 : p.w - 2 * M;
    row.forEach((s, j) => {
      const col = th.c[(ri * 2 + j) % 4], c = TH.card(p, th, M + j * (w + 14), yy, w, bh, s.head, col);
      for (let k = 0; k < s.count; k++) {
        const ly = c.y + (k + 1) * lh - 2;
        if (s.kind === "checks") { p.rect(c.x, ly - 10, 10, 10, { stroke: col, sw: 1.1, r: 2.5 }); p.line(c.x + 16, ly, c.x1, ly, { stroke: th.line, sw: 0.8 }); }
        else if (s.kind === "bullets") { p.circle(c.x + 3, ly - 4, 2.2, { fill: tint(col, 0.3) }); p.line(c.x + 11, ly, c.x1, ly, { stroke: th.line, sw: 0.8 }); }
        else if (s.kind === "hours") { const h = hour0 + k, lab = (h % 12 || 12) + (h < 12 ? " AM" : " PM"); p.text(lab, c.x, ly - 3, { font: th.bold, size: 8.5, fill: th.soft }); p.line(c.x + 40, ly, c.x1, ly, { stroke: th.line, sw: 0.8 }); }
        else if (s.kind === "dots" || s.kind === "box") { if (k === 0) TH.dots(p, th, c.x + 2, c.y + 4, c.w - 4, s.count * lh - 10, 12); }
        else p.line(c.x, ly, c.x1, ly, { stroke: th.line, sw: 0.8 });
      }
    });
    yy += bh + 12;
  });
  done(ctx, p, pg.title || "Planner page");
};

function monthGrid(p, th, year, m, x, y, w, h, o = {}) {
  const first = new Date(Date.UTC(year, m, 1)).getUTCDay(), days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const mon = o.monday, off = mon ? (first + 6) % 7 : first, names = mon ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeks = Math.ceil((off + days) / 7), cw = w / 7, hh = o.mini ? 14 : 24, ch = (h - hh) / weeks;
  if (!o.mini) p.rect(x, y, w, hh, { fill: th.c[0], r: th.style === "minimal" ? 2 : 8 });
  names.forEach((d, i) => p.text(o.mini ? d[0] : d, x + cw * i + cw / 2, y + (o.mini ? 10 : 16), { font: th.bold, size: o.mini ? 7 : 10, fill: o.mini ? th.c[0] : "#FFFFFF", anchor: "middle" }));
  for (let d = 1; d <= days; d++) {
    const k = off + d - 1, cx = x + (k % 7) * cw, cy = y + hh + Math.floor(k / 7) * ch;
    if (o.mini) p.text(String(d), cx + cw / 2, cy + ch * 0.7, { font: th.body, size: 7.5, fill: th.ink, anchor: "middle" });
    else { p.rect(cx + 2, cy + 3, cw - 4, ch - 5, { fill: (k % 7 === 0 || k % 7 === 6) !== mon ? tint(th.c[2], 0.85) : "#FFFFFF", stroke: tint(th.c[0], 0.65), sw: 0.8, r: 6 }); p.text(String(d), cx + 9, cy + 17, { font: th.bold, size: 10.5, fill: th.ink }); }
  }
  if (!o.mini) for (let k = off + days; k < weeks * 7; k++) { const cx = x + (k % 7) * cw, cy = y + hh + Math.floor(k / 7) * ch; p.rect(cx + 2, cy + 3, cw - 4, ch - 5, { stroke: tint(th.line, 0.4), sw: 0.6, r: 6, dash: "2 3" }); }
  for (let k = 0; k < off && !o.mini; k++) { const cx = x + k * cw, cy = y + hh; p.rect(cx + 2, cy + 3, cw - 4, ch - 5, { stroke: tint(th.line, 0.4), sw: 0.6, r: 6, dash: "2 3" }); }
}
P.calendar = function (ctx, pg) {
  const th = ctx.th, year = parseInt(pg.year) || 2027, months = (pg.months && pg.months.length ? pg.months : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map(Number).filter(m => m >= 1 && m <= 12);
  if (pg.yearPage !== false && months.length >= 6) {
    const { p, y } = start(ctx, String(year) + " at a Glance", pg.subtitle || "", { border: false });
    const cw = (p.w - 2 * M - 30) / 3, ch = (p.h - y - 50) / 4;
    for (let m = 0; m < 12; m++) {
      const x = M + (m % 3) * (cw + 15), yv = y + Math.floor(m / 3) * ch;
      p.text(MONTHS[m], x + cw / 2, yv + 14, { font: th.head, size: 13, fill: th.c[m % 4 === 3 ? 0 : m % 4], anchor: "middle" });
      monthGrid(p, th, year, m, x, yv + 20, cw, ch - 30, { mini: true, monday: pg.weekStart === "monday" });
    }
    done(ctx, p, "Year at a glance");
  }
  months.forEach(m => {
    const p = new Page(); TH.decorate(p, th, ctx.seed + "cal" + m, {});
    const name = MONTHS[m - 1];
    if (th.style === "kids" || th.style === "minimal") { p.text(name.toUpperCase(), M, 74, { font: th.head, size: 36, fill: th.c[0], ls: 2 }); p.text(String(year), p.w - M, 74, { font: th.head, size: 36, fill: tint(th.c[1], 0.3), anchor: "end" }); }
    else { p.text(String(year), p.w / 2, 44, { font: th.sub, size: 22, fill: th.c[1], anchor: "middle" }); p.text(name, p.w / 2, 86, { font: th.head, size: 40, fill: th.ink, anchor: "middle" }); }
    monthGrid(p, th, year, m - 1, M, 104, p.w - 2 * M, 470, { monday: pg.weekStart === "monday" });
    const c1 = TH.card(p, th, M, 592, (p.w - 2 * M - 14) * 0.62, 152, "Notes", th.c[1]); TH.lines(p, th, c1.x, c1.y - 10, c1.w, c1.y1, 21);
    const c2 = TH.card(p, th, M + (p.w - 2 * M - 14) * 0.62 + 14, 592, (p.w - 2 * M - 14) * 0.38, 152, "Goals", th.c[2]); TH.lines(p, th, c2.x, c2.y - 10, c2.w, c2.y1, 21, { check: true });
    done(ctx, p, name + " " + year);
  });
};

P.weekly = function (ctx, pg) {
  const th = ctx.th, n = Math.max(1, Math.min(4, parseInt(pg.copies) || 1));
  for (let i = 0; i < n; i++) {
    const { p, y } = start(ctx, pg.title || "Weekly Planner", pg.subtitle || "", { border: false });
    const yy = TH.fields(p, th, ["Week of"], y + 4, M, M + 260) + 4;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], cw = (p.w - 2 * M - 14) / 2, ch = (p.h - 50 - yy - 3 * 12) / 4;
    days.forEach((d, k) => { const x = M + (k % 2) * (cw + 14), yv = yy + Math.floor(k / 2) * (ch + 12); const c = TH.card(p, th, x, yv, cw, ch, d, th.c[k % 4]); TH.lines(p, th, c.x, c.y - 12, c.w, c.y1, 19); });
    const c = TH.card(p, th, M + cw + 14, yy + 3 * (ch + 12), cw, ch, "To do", th.c[1]); TH.lines(p, th, c.x, c.y - 12, c.w, c.y1, 19, { check: true });
    done(ctx, p, "Weekly planner");
  }
};
P.daily = function (ctx, pg) {
  const th = ctx.th;
  P.planner(ctx, Object.assign({ title: "Daily Planner", fieldsList: ["Date", "Mood"], startHour: 6, sections: [{ head: "Top 3 priorities", kind: "checks", count: 3 }, { head: "Water", kind: "lines", count: 3 }, { head: "Schedule", kind: "hours", count: 16 }, { head: "To do", kind: "checks", count: 16 }, { head: "Notes", kind: "lines", count: 5, wide: true }] }, pg));
};
P.habit = function (ctx, pg) {
  const th = ctx.th, habits = (pg.habits || pg.rows || []).map(clean).slice(0, 16);
  while (habits.length < 15) habits.push("");
  const { p, y } = start(ctx, pg.title || "Habit Tracker", pg.subtitle || "", { border: false });
  const yy = TH.fields(p, th, ["Month"], y + 4, M, M + 240) + 6;
  const first = 128, cw = (p.w - 2 * M - first) / 31, rh = Math.min(42, (p.h - 60 - yy - 26) / habits.length);
  for (let d = 1; d <= 31; d++) p.text(String(d), M + first + (d - 0.5) * cw, yy + 14, { font: th.bold, size: 7, fill: th.soft, anchor: "middle" });
  habits.forEach((h, i) => {
    const yv = yy + 24 + i * rh;
    if (i % 2 === 0) p.rect(M, yv, p.w - 2 * M, rh, { fill: tint(th.c[i % 4], 0.9), r: 6 });
    if (h) p.text(h, M + 8, yv + rh / 2 + 4, { font: th.bold, size: fitSize(h, th.bold, 10, first - 14, 7), fill: th.ink });
    else p.line(M + 8, yv + rh / 2 + 5, M + first - 10, yv + rh / 2 + 5, { stroke: th.line, sw: 0.8 });
    for (let d = 0; d < 31; d++) p.circle(M + first + (d + 0.5) * cw, yv + rh / 2, Math.min(cw, rh) * 0.34, { fill: "#FFFFFF", stroke: tint(th.c[i % 4], 0.35), sw: 0.9 });
  });
  done(ctx, p, "Habit tracker");
};
P.meal = function (ctx, pg) {
  const th = ctx.th, meals = (pg.meals || ["Breakfast", "Lunch", "Dinner", "Snacks"]).map(clean).slice(0, 5);
  const { p, y } = start(ctx, pg.title || "Weekly Meal Planner", pg.subtitle || "", { border: false });
  const yy = TH.fields(p, th, ["Week of"], y + 4, M, M + 260) + 6;
  const gw = (p.w - 2 * M) * 0.68, first = 64, cw = (gw - first) / meals.length, days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], rh = (p.h - 56 - yy - 28) / 7;
  p.rect(M, yy, gw, 28, { fill: th.c[0], r: 8 });
  meals.forEach((m, i) => p.text(m, M + first + cw * i + cw / 2, yy + 18, { font: th.bold, size: fitSize(m, th.bold, 10, cw - 6, 7), fill: "#FFFFFF", anchor: "middle" }));
  days.forEach((d, i) => { const yv = yy + 30 + i * rh; p.rect(M, yv + 2, first - 6, rh - 4, { fill: tint(th.c[i % 4], 0.75), r: 8 }); p.text(d, M + (first - 6) / 2, yv + rh / 2 + 4, { font: th.bold, size: 11, fill: th.ink, anchor: "middle" });
    meals.forEach((m, j) => p.rect(M + first + cw * j + 2, yv + 2, cw - 4, rh - 4, { stroke: th.line, sw: 0.8, r: 8 })); });
  const c = TH.card(p, th, M + gw + 12, yy, p.w - 2 * M - gw - 12, p.h - 56 - yy, "Grocery list", th.c[1]); TH.lines(p, th, c.x, c.y - 10, c.w, c.y1, 20, { check: true });
  done(ctx, p, "Meal planner");
};
P.notes = function (ctx, pg) {
  const th = ctx.th;
  const { p, y } = start(ctx, pg.title || "Notes", pg.subtitle || "", { border: false });
  const yy = TH.fields(p, th, ["Date"], y + 4, M, M + 240) + 4;
  if (pg.style === "dots") TH.dots(p, th, M, yy + 6, p.w - 2 * M, p.h - 60 - yy, 16);
  else if (pg.style === "grid") { for (let x = M; x <= p.w - M; x += 16) p.line(x, yy, x, p.h - 50, { stroke: tint(th.line, 0.4), sw: 0.5 }); for (let yv = yy; yv <= p.h - 50; yv += 16) p.line(M, yv, p.w - M, yv, { stroke: tint(th.line, 0.4), sw: 0.5 }); }
  else TH.lines(p, th, M, yy, p.w - 2 * M, p.h - 50, 24);
  done(ctx, p, pg.title || "Notes");
};
P.goals = function (ctx, pg) {
  const th = ctx.th, n = Math.max(2, Math.min(4, parseInt(pg.count) || 3));
  const { p, y } = start(ctx, pg.title || "Goal Setting", pg.subtitle || "", { border: false });
  const ch = (p.h - 50 - y - (n - 1) * 12) / n;
  for (let i = 0; i < n; i++) {
    const c = TH.card(p, th, M, y + i * (ch + 12), p.w - 2 * M, ch, "Goal " + (i + 1), th.c[i % 4]);
    p.line(c.x, c.y + 14, c.x1, c.y + 14, { stroke: th.line });
    p.text("Why it matters", c.x, c.y + 36, { font: th.bold, size: 9, fill: th.soft }); p.line(c.x + 80, c.y + 37, c.x1, c.y + 37, { stroke: th.line, sw: 0.8 });
    p.text("Steps", c.x, c.y + 60, { font: th.bold, size: 9, fill: th.soft }); TH.lines(p, th, c.x, c.y + 64, c.w, c.y1 - 20, 19, { check: true });
    p.text("Deadline", c.x, c.y1 - 2, { font: th.bold, size: 9, fill: th.soft }); p.line(c.x + 52, c.y1 - 1, c.x + 200, c.y1 - 1, { stroke: th.line, sw: 0.8 });
  }
  done(ctx, p, "Goals");
};

// ---------- party ----------
P.sign = function (ctx, pg) {
  const th = ctx.th, p = new Page(); TH.decorate(p, th, ctx.seed + "sign" + ctx.n++, { border: true });
  const W = p.w, H = p.h;
  p.rect(48, 60, W - 96, H - 120, { stroke: th.c[0], sw: 2.5, r: 30 }); p.rect(58, 70, W - 116, H - 140, { stroke: tint(th.c[1], 0.4), sw: 1, r: 24 });
  const ic = IC.iconSet(th.icons, 3);
  IC.draw(p, ic[0], W / 2 - 40, 110, 80, { a: th.c[0], b: th.c[1] });
  const title = clean(pg.title || "Welcome"), tl = wrapLines(title, th.head, 58, W - 180).slice(0, 3), size = tl.length > 2 ? 46 : 58;
  let y = 290 - (tl.length - 1) * size * 0.55;
  if (pg.kicker || th.style !== "kids") { p.text(clean(pg.kicker || "please"), W / 2, y - size - 6, { font: th.sub, size: 30, fill: th.c[1], anchor: "middle" }); }
  tl.forEach((l, i) => p.text(l, W / 2, y + i * size * 1.08, { font: th.head, size: fitSize(l, th.head, size, W - 170, 24), fill: th.style === "kids" ? th.c[0] : th.ink, anchor: "middle", stroke: th.style === "kids" ? th.ink : null, sw: 0.8 }));
  y += tl.length * size * 1.08 + 10;
  if (pg.subtitle) { y = p.para(pg.subtitle, 110, y + 10, W - 220, { font: th.sub, size: 24, fill: th.c[1], anchor: "middle", lh: 30 }); }
  (pg.lines || []).slice(0, 4).forEach((l, i) => { y = p.para(l, 110, y + 18, W - 220, { font: th.body, size: 16, fill: th.ink, anchor: "middle", lh: 22 }); });
  IC.draw(p, ic[1], 84, H - 160, 60, { a: th.c[2], b: th.c[0] }); IC.draw(p, ic[2] || ic[0], W - 144, H - 160, 60, { a: th.c[3] || th.c[1], b: th.c[0] });
  done(ctx, p, "Sign: " + title);
};
P.labels = function (ctx, pg) {
  const th = ctx.th, labels = (pg.labels || []).map(clean).slice(0, 10);
  const { p, y } = start(ctx, pg.title || "Labels", pg.subtitle || "Cut along the dotted lines.", {});
  const n = Math.max(1, labels.length), rows = Math.ceil(n / 2), gw = (p.w - 2 * M - 16) / 2, gh = Math.min(150, (p.h - 50 - y - (rows - 1) * 14) / rows);
  const ic = IC.iconSet(th.icons, 6);
  labels.forEach((t, i) => {
    const x0 = M + (i % 2) * (gw + 16), y0 = y + Math.floor(i / 2) * (gh + 14);
    p.rect(x0, y0, gw, gh, { stroke: th.soft, sw: 0.8, dash: "5 4" });
    p.rect(x0 + 10, y0 + 10, gw - 20, gh - 20, { fill: "#FFFFFF", stroke: th.c[i % 4], sw: 1.6, r: 14 });
    IC.draw(p, ic[i % ic.length], x0 + gw / 2 - 16, y0 + 16, 32, { a: th.c[i % 4], b: th.c[(i + 1) % 4] });
    const ls = wrapLines(t, th.head, 19, gw - 50).slice(0, 2), ty = y0 + gh / 2 + 14 - (ls.length - 1) * 11;
    ls.forEach((l, j) => p.text(l, x0 + gw / 2, ty + j * 23, { font: th.head, size: fitSize(l, th.head, 19, gw - 44, 10), fill: th.ink, anchor: "middle" }));
    if (pg.blankLine) p.line(x0 + 36, y0 + gh - 24, x0 + gw - 36, y0 + gh - 24, { stroke: th.ink, sw: 0.9 });
  });
  done(ctx, p, pg.title || "Labels");
};
P.certificate = function (ctx, pg) {
  const th = ctx.th, p = new Page(792, 612), W = 792, H = 612;
  p.rect(18, 18, W - 36, H - 36, { stroke: th.c[0], sw: 10 }); p.rect(34, 34, W - 68, H - 68, { stroke: th.c[2], sw: 1.5 });
  [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]].forEach(([x, y]) => p.circle(x, y, 9, { fill: th.c[1] }));
  p.text(clean(pg.kicker || "Certificate"), W / 2, 110, { font: th.sub, size: 46, fill: th.c[0], anchor: "middle" });
  p.text(clean(pg.title || "Award of Achievement").toUpperCase(), W / 2, 158, { font: th.head, size: fitSize(clean(pg.title || "Award").toUpperCase(), th.head, 30, W - 200, 14), fill: th.ink, anchor: "middle", ls: 1.5 });
  p.text(clean(pg.subtitle || "This certificate is proudly presented to"), W / 2, 210, { font: th.body, size: 14, fill: th.soft, anchor: "middle" });
  p.line(W / 2 - 230, 270, W / 2 + 230, 270, { stroke: th.ink, sw: 1.2 });
  p.para(clean(pg.body || ""), W / 2 - 260, 312, 520, { font: th.body, size: 14, fill: th.ink, anchor: "middle", lh: 20 });
  IC.draw(p, "star", W / 2 - 42, 398, 84, { a: th.c[2] });
  p.line(110, 520, 330, 520, { stroke: th.ink, sw: 1 }); p.text(clean(pg.signLabel || "Signed"), 220, 540, { font: th.body, size: 11, fill: th.soft, anchor: "middle" });
  p.line(W - 330, 520, W - 110, 520, { stroke: th.ink, sw: 1 }); p.text("Date", W - 220, 540, { font: th.body, size: 11, fill: th.soft, anchor: "middle" });
  TH.footer(p, th); ctx.out.push({ page: p, label: pg.title || "Certificate" });
};
P.bingo = function (ctx, pg) {
  const th = ctx.th, cards = Math.max(1, Math.min(12, parseInt(pg.cards) || 6));
  const iconMode = (pg.icons || []).filter(i => IC.I[i]).length >= 12 || (!pg.words || pg.words.length < 24);
  const items = iconMode ? [...new Set([...(pg.icons || []).filter(i => IC.I[i]), ...IC.iconSet(th.icons), ...IC.NEUTRAL])].slice(0, 24) : pg.words.map(clean).filter(Boolean);
  for (let c = 0; c < cards; c++) {
    const { p, y } = start(ctx, pg.title || "Bingo", (pg.subtitle ? pg.subtitle + " - " : "") + "Card " + (c + 1), {});
    const pickd = shuffle(items, rng(ctx.seed + "bingo" + c)).slice(0, 24); while (pickd.length < 24) pickd.push("");
    const size = Math.min((p.w - 2 * M) / 5, (p.h - 60 - y - 46) / 5), gx = (p.w - 5 * size) / 2;
    "BINGO".split("").forEach((ch, i) => { p.rect(gx + i * size + 3, y, size - 6, 40, { fill: th.c[i % th.c.length], r: 10 }); p.text(ch, gx + i * size + size / 2, y + 30, { font: th.head, size: 28, fill: "#FFFFFF", anchor: "middle" }); });
    const top = y + 46; let k = 0;
    for (let rr = 0; rr < 5; rr++) for (let cc = 0; cc < 5; cc++) {
      const x0 = gx + cc * size, y0 = top + rr * size, free = rr === 2 && cc === 2;
      p.rect(x0 + 3, y0 + 3, size - 6, size - 6, { fill: free ? tint(th.c[2], 0.75) : "#FFFFFF", stroke: tint(th.c[cc % th.c.length], 0.4), sw: 1.6, r: 10 });
      if (free) { IC.draw(p, "star", x0 + size / 2 - size * 0.25, y0 + size * 0.18, size * 0.5, { a: th.c[2] }); p.text("FREE", x0 + size / 2, y0 + size * 0.86, { font: th.head, size: 12, fill: th.ink, anchor: "middle" }); continue; }
      const it = pickd[k++];
      if (iconMode) { IC.draw(p, it, x0 + size * 0.2, y0 + size * 0.1, size * 0.6, { a: th.c[(rr + cc) % th.c.length], b: th.c[(rr + cc + 1) % th.c.length] }); p.text(IC.word(it), x0 + size / 2, y0 + size * 0.88, { font: th.bold, size: fitSize(IC.word(it), th.bold, 11, size - 12, 7), fill: th.ink, anchor: "middle" }); }
      else { const ls = wrapLines(it, th.bold, 13, size - 18).slice(0, 3); ls.forEach((l, j) => p.text(l, x0 + size / 2, y0 + size / 2 + 5 - (ls.length - 1) * 8 + j * 16, { font: th.bold, size: 13, fill: th.ink, anchor: "middle" })); }
    }
    done(ctx, p, "Bingo card " + (c + 1));
  }
  // calling cards
  const { p, y } = start(ctx, (pg.title || "Bingo") + " Calling Cards", "Cut these out and draw one at a time.", {});
  const per = 5, cw = (p.w - 2 * M) / per, ch = Math.min(cw, (p.h - 50 - y) / Math.ceil(items.length / per));
  items.forEach((it, i) => { const x0 = M + (i % per) * cw, y0 = y + Math.floor(i / per) * ch; p.rect(x0 + 2, y0 + 2, cw - 4, ch - 4, { stroke: th.soft, sw: 0.7, dash: "4 3" });
    if (iconMode) { IC.draw(p, it, x0 + cw * 0.25, y0 + ch * 0.1, cw * 0.5, { a: th.c[i % th.c.length], b: th.c[(i + 1) % th.c.length] }); p.text(IC.word(it), x0 + cw / 2, y0 + ch * 0.85, { font: th.bold, size: 10, fill: th.ink, anchor: "middle" }); }
    else wrapLines(it, th.bold, 11, cw - 14).slice(0, 3).forEach((l, j) => p.text(l, x0 + cw / 2, y0 + ch / 2 + j * 13, { font: th.bold, size: 11, fill: th.ink, anchor: "middle" })); });
  done(ctx, p, "Bingo calling cards");
};
P.game = function (ctx, pg) {
  const th = ctx.th, qs = (pg.questions || []).map(clean).filter(Boolean).slice(0, 16);
  const { p, y } = start(ctx, pg.title || "Party Game", pg.subtitle || "", { icon: IC.iconSet(th.icons, 1)[0] });
  let yy = TH.fields(p, th, pg.fieldsList || ["Name"], y + 4, M, M + 260) + 6;
  const style = pg.style || (qs.every(q => / or /i.test(q)) ? "choice" : "lines");
  const rh = (p.h - 56 - yy) / Math.max(qs.length, 8);
  qs.forEach((q, i) => {
    const yv = yy + i * rh;
    p.circle(M + 11, yv + 12, 11, { fill: th.c[i % th.c.length] }); p.text(String(i + 1), M + 11, yv + 16.5, { font: th.bold, size: 11, fill: "#FFFFFF", anchor: "middle" });
    if (style === "choice") { const [a, b] = q.split(/ or /i); p.rect(M + 34, yv, (p.w - 2 * M - 70) / 2, rh - 8, { stroke: tint(th.c[i % 4], 0.4), sw: 1.2, r: 10 }); p.text(clean(a), M + 34 + (p.w - 2 * M - 70) / 4, yv + (rh - 8) / 2 + 6, { font: th.bold, size: fitSize(a, th.bold, 16, (p.w - 2 * M - 100) / 2, 8), fill: th.ink, anchor: "middle" });
      p.text("or", p.w / 2 + 17, yv + (rh - 8) / 2 + 6, { font: th.sub, size: 20, fill: th.soft, anchor: "middle" });
      p.rect(p.w / 2 + 36, yv, (p.w - 2 * M - 70) / 2, rh - 8, { stroke: tint(th.c[(i + 1) % 4], 0.4), sw: 1.2, r: 10 }); p.text(clean(b || ""), p.w / 2 + 36 + (p.w - 2 * M - 70) / 4, yv + (rh - 8) / 2 + 6, { font: th.bold, size: fitSize(b || "", th.bold, 16, (p.w - 2 * M - 100) / 2, 8), fill: th.ink, anchor: "middle" }); }
    else { p.para(q, M + 34, yv + 16, p.w - 2 * M - 34, { font: th.bold, size: 13, fill: th.ink, maxLines: 2 }); p.line(M + 34, yv + rh - 8, p.w - M, yv + rh - 8, { stroke: th.line, sw: 0.9 }); }
  });
  done(ctx, p, pg.title || "Game");
};
P.toppers = function (ctx, pg) {
  const th = ctx.th, text = clean(pg.text || pg.title || "Happy Birthday"), icons = IC.iconSet(th.icons, 6);
  const { p, y } = start(ctx, pg.title || "Cupcake Toppers", "Cut out, then tape to a toothpick.", {});
  const per = 4, d = (p.w - 2 * M) / per, rowsN = Math.floor((p.h - 50 - y) / d);
  for (let i = 0; i < per * rowsN; i++) {
    const cx = M + (i % per) * d + d / 2, cy = y + Math.floor(i / per) * d + d / 2, r = d / 2 - 6, col = th.c[i % th.c.length];
    p.circle(cx, cy, r, { fill: tint(col, 0.8), stroke: th.soft, sw: 0.7, dash: "4 3" }); p.circle(cx, cy, r - 7, { fill: "#FFFFFF", stroke: col, sw: 2 });
    if (i % 2) IC.draw(p, icons[i % icons.length], cx - r * 0.55, cy - r * 0.55, r * 1.1, { a: col, b: th.c[(i + 1) % th.c.length] });
    else { const ls = wrapLines(text, th.head, 16, r * 1.5).slice(0, 3); ls.forEach((l, j) => p.text(l, cx, cy + 6 - (ls.length - 1) * 9 + j * 18, { font: th.head, size: fitSize(l, th.head, 16, r * 1.55, 8), fill: th.ink, anchor: "middle" })); }
  }
  done(ctx, p, "Toppers");
};
P.banner = function (ctx, pg) {
  const th = ctx.th, text = clean(pg.text || "HAPPY BIRTHDAY").toUpperCase().replace(/[^A-Z0-9 !]/g, "");
  [...text].forEach((ch, i) => {
    const p = new Page(), col = th.c[i % th.c.length];
    if (ch === " ") { p.poly([[56, 40], [p.w - 56, 40], [p.w / 2, p.h - 60]], { fill: tint(col, 0.7), stroke: th.soft, sw: 0.6, dash: "5 4" }); IC.draw(p, IC.iconSet(th.icons, 3)[i % 3], p.w / 2 - 70, 160, 140, { a: th.c[0], b: th.c[1] }); }
    else {
      p.poly([[56, 40], [p.w - 56, 40], [p.w / 2, p.h - 60]], { fill: col, stroke: th.soft, sw: 0.6, dash: "5 4" });
      p.poly([[86, 62], [p.w - 86, 62], [p.w / 2, p.h - 116]], { stroke: "#FFFFFF", sw: 2.5, dash: "1 8", cap: "round" });
      p.circle(90, 70, 6, { fill: "#FFFFFF" }); p.circle(p.w - 90, 70, 6, { fill: "#FFFFFF" });
      p.text(ch, p.w / 2, 360, { font: th.head, size: 230, fill: "#FFFFFF", anchor: "middle" });
    }
    ctx.out.push({ page: p, label: "Banner " + (ch === " " ? "spacer" : ch) });
  });
};
P.invitation = function (ctx, pg) {
  const th = ctx.th, p = new Page(); TH.decorate(p, th, ctx.seed + "inv", { border: true });
  const W = p.w; let y = 120;
  IC.draw(p, IC.iconSet(th.icons, 1)[0], W / 2 - 45, 40, 90, { a: th.c[0], b: th.c[1] });
  p.text(clean(pg.kicker || "You're invited"), W / 2, 170, { font: th.sub, size: 34, fill: th.c[1], anchor: "middle" });
  const t = clean(pg.title || "Party Time"); p.text(t, W / 2, 230, { font: th.head, size: fitSize(t, th.head, 48, W - 140, 20), fill: th.c[0], anchor: "middle", stroke: th.style === "kids" ? th.ink : null, sw: 0.8 });
  y = 290; (pg.fieldsList || ["For", "Date", "Time", "Place", "RSVP"]).forEach(f => { p.text(f.toUpperCase(), 130, y, { font: th.bold, size: 13, fill: th.c[1], ls: 1.4 }); p.line(220, y + 2, W - 130, y + 2, { stroke: th.ink, sw: 1 }); y += 54; });
  if (pg.subtitle) p.para(pg.subtitle, 110, y + 20, W - 220, { font: th.sub, size: 20, fill: th.ink, anchor: "middle" });
  done(ctx, p, "Invitation");
};

module.exports = { P, MONTHS, monthGrid };
