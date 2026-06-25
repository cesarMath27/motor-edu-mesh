// =============================================================================
//  JUEGO: SOPA DE LETRAS
// -----------------------------------------------------------------------------
//  Encuentra palabras en una cuadrícula arrastrando el dedo/mouse en línea
//  recta (8 direcciones). La cuadrícula se genera con semilla → reproducible.
//
//  Definición (.game.json):
//  {
//    "type": "wordsearch",
//    "title": "Animales",
//    "config": {
//      "words": ["PERRO","GATO","AGUILA","BALLENA","ABEJA"],
//      "size": 12,
//      "allowReverse": true,
//      "allowDiagonal": true,
//      "timeLimit": 0
//    }
//  }
// =============================================================================

import { el } from '../engine/dom.js';
import { defineGameType } from '../engine/registry.js';
import { gridLetters } from '../engine/text.js';

const perfNow = () =>
  (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

// ---- Lógica pura ------------------------------------------------------------

function buildDirs(diagonal, reverse) {
  const base = [
    { dr: 0, dc: 1, name: 'E' },
    { dr: 1, dc: 0, name: 'S' },
  ];
  if (diagonal) base.push({ dr: 1, dc: 1, name: 'SE' }, { dr: -1, dc: 1, name: 'NE' });
  if (!reverse) return base;
  return base.concat(base.map((d) => ({ dr: -d.dr, dc: -d.dc, name: 'R' + d.name })));
}

function makeAlphabet(words) {
  const set = new Set();
  for (const w of words) for (const ch of w.norm) set.add(ch);
  for (const ch of 'AEIOURLNSTMDCPB') set.add(ch); // letras comunes de relleno
  return [...set];
}

function placeWord(grid, w, dirs, size, rng, tries = 100) {
  for (let t = 0; t < tries; t++) {
    const dir = rng.pick(dirs);
    const r0 = rng.int(0, size - 1);
    const c0 = rng.int(0, size - 1);
    const endR = r0 + dir.dr * (w.norm.length - 1);
    const endC = c0 + dir.dc * (w.norm.length - 1);
    if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

    const cells = [];
    let ok = true;
    for (let k = 0; k < w.norm.length; k++) {
      const rr = r0 + dir.dr * k;
      const cc = c0 + dir.dc * k;
      const cur = grid[rr][cc];
      if (cur && cur !== w.norm[k]) { ok = false; break; }
      cells.push({ r: rr, c: cc });
    }
    if (!ok) continue;
    for (let k = 0; k < w.norm.length; k++) grid[cells[k].r][cells[k].c] = w.norm[k];
    return { word: w.norm, display: w.display, cells, dir: dir.name, found: false };
  }
  return null;
}

/**
 * Genera la cuadrícula y la ubicación de cada palabra (determinista).
 * @returns {{grid:string[][], size:number, placements:Array, words:string[]}}
 */
export function generateGrid(config = {}, rng) {
  const size = config.size || 10;
  const allowReverse = config.allowReverse !== false;
  const allowDiagonal = config.allowDiagonal !== false;
  const raw = (config.words || [])
    .map((w) => ({ display: String(w), norm: gridLetters(w) }))
    .filter((w) => w.norm.length > 0 && w.norm.length <= size);

  const dirs = buildDirs(allowDiagonal, allowReverse);
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placements = [];

  // Las palabras largas primero: son las más difíciles de acomodar.
  for (const w of raw.slice().sort((a, b) => b.norm.length - a.norm.length)) {
    const p = placeWord(grid, w, dirs, size, rng);
    if (p) placements.push(p);
  }

  const alphabet = makeAlphabet(raw);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(rng.next() * alphabet.length)];
    }
  }
  return { grid, size, placements, words: placements.map((p) => p.display) };
}

/** Celdas de la línea recta entre a y b (o null si no están alineadas). */
export function lineCells(a, b) {
  const dr = Math.sign(b.r - a.r);
  const dc = Math.sign(b.c - a.c);
  const adr = Math.abs(b.r - a.r);
  const adc = Math.abs(b.c - a.c);
  if (!(a.r === b.r || a.c === b.c || adr === adc)) return null;
  const len = Math.max(adr, adc) + 1;
  const cells = [];
  for (let k = 0; k < len; k++) cells.push({ r: a.r + dr * k, c: a.c + dc * k });
  return cells;
}

/** ¿La selección coincide con la ubicación de una palabra (en cualquier sentido)? */
export function sameLine(sel, placed) {
  if (sel.length !== placed.length) return false;
  const fwd = sel.every((c, k) => c.r === placed[k].r && c.c === placed[k].c);
  const rev = [...placed].reverse();
  const bwd = sel.every((c, k) => c.r === rev[k].r && c.c === rev[k].c);
  return fwd || bwd;
}

// ---- Tipo de juego ----------------------------------------------------------

defineGameType('wordsearch', (game, def) => {
  const cfg = def.config || {};
  const { grid, size, placements } = generateGrid(cfg, game.rng);

  game.scene('play', (s) => {
    const wordList = el('div', { class: 'em-ws-words' });
    const wordEls = {};
    for (const p of placements) {
      wordEls[p.display] = el('span', { class: 'em-ws-word', text: p.display });
      wordList.append(wordEls[p.display]);
    }

    const board = el('div', { class: 'em-ws-board', style: { '--n': String(size) } });
    const cellEls = {};
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = el('div', { class: 'em-ws-cell', dataset: { r, c }, text: grid[r][c] });
        cellEls[`${r},${c}`] = cell;
        board.append(cell);
      }
    }
    s.root.append(el('div', { class: 'em-ws' }, [wordList, board]));

    let limit = null;
    if (cfg.timeLimit) {
      limit = s.timer(cfg.timeLimit, {
        onTick: (left) => game.setTimer(`⏱ ${Math.ceil(left)}`),
        onEnd: () => { if (!game.results) game.lose({ message: '¡Se acabó el tiempo!' }); },
      });
    }

    let selecting = false;
    let startCell = null;
    let selCells = [];
    let found = 0;
    let lastFind = perfNow();

    const key = (c) => `${c.r},${c.c}`;
    const clearSel = () => { selCells.forEach((c) => cellEls[key(c)].classList.remove('sel')); selCells = []; };
    const paint = (cells) => {
      clearSel();
      selCells = cells || [];
      selCells.forEach((c) => cellEls[key(c)].classList.add('sel'));
    };

    function cellAt(x, y) {
      const node = document.elementFromPoint(x, y);
      const cellEl = node && node.closest ? node.closest('.em-ws-cell') : null;
      if (!cellEl || !board.contains(cellEl)) return null;
      return { r: +cellEl.dataset.r, c: +cellEl.dataset.c };
    }

    function finalize(cells) {
      if (cells.length >= 2) {
        for (const p of placements) {
          if (!p.found && sameLine(cells, p.cells)) {
            p.found = true;
            p.cells.forEach((c) => cellEls[key(c)].classList.add('found'));
            wordEls[p.display]?.classList.add('found');
            const speed = Math.max(0, 1 - (perfNow() - lastFind) / 8000);
            lastFind = perfNow();
            game.score.answer(true, { speed });
            game.audio.play('match');
            found += 1;
            if (found === placements.length) {
              let bonus = 0;
              if (limit && !limit.done) { bonus = Math.round(limit.left * 10); game.score.bonus(bonus); }
              game.win({ message: '¡Encontraste todas las palabras!', timeBonus: bonus });
            }
            return;
          }
        }
      }
      game.audio.play('wrong');
    }

    board.addEventListener('pointerdown', (e) => {
      const cell = cellAt(e.clientX, e.clientY);
      if (!cell) return;
      e.preventDefault();
      selecting = true;
      startCell = cell;
      board.setPointerCapture?.(e.pointerId);
      paint([cell]);
    });
    board.addEventListener('pointermove', (e) => {
      if (!selecting) return;
      const cell = cellAt(e.clientX, e.clientY);
      if (!cell) return;
      const line = lineCells(startCell, cell);
      if (line) paint(line);
    });
    const end = () => {
      if (!selecting) return;
      selecting = false;
      const cells = selCells.slice();
      clearSel();
      finalize(cells);
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
  });
});
