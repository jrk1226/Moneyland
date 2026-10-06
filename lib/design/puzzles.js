// Code-made puzzles, so they are always correct: mazes, word searches, scrambles.
const { rng, shuffle } = require("./core");

// Perfect maze (one path between any two cells). Returns { cols, rows, walls, solution }.
function maze(cols, rows, seed) {
  const r = rng(seed || "maze"), N = cols * rows;
  const wallE = new Array(N).fill(true), wallS = new Array(N).fill(true), seen = new Array(N).fill(false);
  const stack = [0]; seen[0] = true;
  while (stack.length) {
    const c = stack[stack.length - 1], x = c % cols, y = Math.floor(c / cols), nb = [];
    if (x > 0 && !seen[c - 1]) nb.push(c - 1);
    if (x < cols - 1 && !seen[c + 1]) nb.push(c + 1);
    if (y > 0 && !seen[c - cols]) nb.push(c - cols);
    if (y < rows - 1 && !seen[c + cols]) nb.push(c + cols);
    if (!nb.length) { stack.pop(); continue; }
    const n = nb[Math.floor(r() * nb.length)];
    if (n === c + 1) wallE[c] = false; else if (n === c - 1) wallE[n] = false; else if (n === c + cols) wallS[c] = false; else wallS[n] = false;
    seen[n] = true; stack.push(n);
  }
  // solve from top-left to bottom-right
  const prev = new Array(N).fill(-1), q = [0], vis = new Array(N).fill(false); vis[0] = true;
  while (q.length) {
    const c = q.shift(), x = c % cols;
    const moves = [];
    if (x < cols - 1 && !wallE[c]) moves.push(c + 1);
    if (x > 0 && !wallE[c - 1]) moves.push(c - 1);
    if (c + cols < N && !wallS[c]) moves.push(c + cols);
    if (c - cols >= 0 && !wallS[c - cols]) moves.push(c - cols);
    for (const m of moves) if (!vis[m]) { vis[m] = true; prev[m] = c; q.push(m); }
  }
  const sol = []; for (let c = N - 1; c !== -1; c = prev[c]) sol.unshift(c);
  return { cols, rows, wallE, wallS, solution: sol };
}

const DIRS = { E: [1, 0], S: [0, 1], SE: [1, 1], NE: [1, -1], W: [-1, 0], N: [0, -1], NW: [-1, -1], SW: [-1, 1] };
// Word search. level 1: across/down, 2: + diagonals, 3: + backwards.
function wordsearch(words, size, level, seed) {
  const r = rng(seed || "ws");
  const list = [...new Set(words.map(w => String(w).toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 3 && w.length <= size))]
    .sort((a, b) => b.length - a.length).slice(0, 20);
  const dirs = level >= 3 ? Object.keys(DIRS) : level >= 2 ? ["E", "S", "SE", "NE"] : ["E", "S"];
  const g = Array.from({ length: size }, () => new Array(size).fill(""));
  const placed = [];
  for (const w of list) {
    let ok = false;
    for (let tries = 0; tries < 400 && !ok; tries++) {
      const d = DIRS[dirs[Math.floor(r() * dirs.length)]], x0 = Math.floor(r() * size), y0 = Math.floor(r() * size);
      const x1 = x0 + d[0] * (w.length - 1), y1 = y0 + d[1] * (w.length - 1);
      if (x1 < 0 || y1 < 0 || x1 >= size || y1 >= size) continue;
      let fits = true;
      for (let i = 0; i < w.length; i++) { const c = g[y0 + d[1] * i][x0 + d[0] * i]; if (c && c !== w[i]) { fits = false; break; } }
      if (!fits) continue;
      for (let i = 0; i < w.length; i++) g[y0 + d[1] * i][x0 + d[0] * i] = w[i];
      placed.push({ word: w, x0, y0, x1, y1 }); ok = true;
    }
  }
  const ABC = "ABCDEFGHIJKLMNOPRSTUWY";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!g[y][x]) g[y][x] = ABC[Math.floor(r() * ABC.length)];
  return { grid: g, placed, size };
}
function scramble(word, seed) {
  const w = String(word).toUpperCase(), r = rng(seed || w);
  for (let i = 0; i < 20; i++) { const s = shuffle(w.split(""), r).join(""); if (s !== w) return s; }
  return w.split("").reverse().join("");
}
module.exports = { maze, wordsearch, scramble };
