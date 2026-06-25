// =============================================================================
//  JUEGO: MATEMÁTICAS  — resolver con teclado en pantalla y contrarreloj
// -----------------------------------------------------------------------------
//  Genera problemas (sumas, restas, multiplicaciones, divisiones o tablas) con
//  semilla, y el alumno teclea la respuesta. Puntos por rapidez + racha.
//
//  Definición (.game.json):
//  {
//    "type": "math",
//    "title": "Tablas del 6, 7 y 8",
//    "config": {
//      "ops": ["+","-","×","÷"],   // operaciones a mezclar (ignorado si hay "tables")
//      "tables": [6,7,8],          // opcional: practica estas tablas (×)
//      "min": 1, "max": 12,        // rango de operandos
//      "count": 10,                // cuántos problemas
//      "timeLimit": 60,            // segundos totales (0 = sin límite)
//      "allowNegative": false,     // permite restas con resultado negativo
//      "parSeconds": 8             // tiempo "ideal" por problema (afecta el bono)
//    }
//  }
// =============================================================================

import { el } from '../engine/dom.js';
import { onTap } from '../engine/input.js';
import { defineGameType } from '../engine/registry.js';

const perfNow = () =>
  (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

// ---- Lógica pura ------------------------------------------------------------

export function compute(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': case '*': return a * b;
    case '÷': case '/': return a / b;
    default: throw new Error(`Operación desconocida: ${op}`);
  }
}

/** Genera la lista de problemas de forma determinista (con semilla). */
export function generateProblems(config = {}, rng) {
  const count = Math.max(1, config.count || 10);
  const min = config.min ?? 1;
  const max = config.max ?? 10;
  const allowNeg = !!config.allowNegative;
  const ops = (config.ops && config.ops.length) ? config.ops : ['+', '-'];
  const tables = Array.isArray(config.tables) && config.tables.length ? config.tables : null;

  const out = [];
  for (let i = 0; i < count; i++) {
    let a, b, op;
    if (tables) {
      op = '×';
      a = rng.pick(tables);
      b = rng.int(1, max || 10);
    } else {
      op = rng.pick(ops);
      if (op === '÷') {
        b = rng.int(1, Math.max(1, max));
        a = b * rng.int(min, max);
      } else if (op === '-') {
        a = rng.int(min, max);
        b = rng.int(min, max);
        if (!allowNeg && b > a) { const t = a; a = b; b = t; }
      } else {
        a = rng.int(min, max);
        b = rng.int(min, max);
      }
    }
    out.push({ a, op, b, answer: compute(a, op, b), text: `${a} ${op} ${b}` });
  }
  return out;
}

export function checkAnswer(problem, value) {
  const n = Number(String(value).trim());
  return Number.isFinite(n) && n === problem.answer;
}

// ---- Tipo de juego ----------------------------------------------------------

defineGameType('math', (game, def) => {
  const cfg = def.config || {};
  const problems = generateProblems(cfg, game.rng);
  const par = cfg.parSeconds || 8;

  game.scene('play', (s) => {
    let i = 0;
    let typed = '';
    let qStart = perfNow();
    let busy = false;

    const prog = el('div', { class: 'em-math-prog' });
    const problemEl = el('div', { class: 'em-math-problem' });
    const display = el('div', { class: 'em-math-display', 'aria-live': 'polite' });
    const feedback = el('div', { class: 'em-feedback' });
    const pad = el('div', { class: 'em-keypad' });
    s.root.append(el('div', { class: 'em-math' }, [prog, problemEl, display, feedback, pad]));

    if (cfg.timeLimit) {
      s.timer(cfg.timeLimit, {
        onTick: (left) => game.setTimer(`⏱ ${Math.ceil(left)}`),
        onEnd: () => { if (!game.results) game.lose({ message: '¡Se acabó el tiempo!' }); },
      });
    }

    function render() {
      const p = problems[i];
      prog.textContent = `Problema ${i + 1} / ${problems.length}`;
      problemEl.textContent = `${p.text} =`;
      display.textContent = typed || '—';
      feedback.textContent = '';
      feedback.className = 'em-feedback';
    }

    function press(key) {
      if (busy) return;
      if (key === 'ok') return submit();
      if (key === 'del') typed = typed.slice(0, -1);
      else if (key === '±') typed = typed.startsWith('-') ? typed.slice(1) : '-' + typed;
      else if (typed.replace('-', '').length < 6) typed += key;
      game.audio.play('click');
      display.textContent = typed || '—';
    }

    function submit() {
      if (busy || typed === '' || typed === '-') return;
      busy = true;
      const p = problems[i];
      const ok = checkAnswer(p, typed);
      const speed = Math.max(0, 1 - (perfNow() - qStart) / (par * 1000));
      game.score.answer(ok, { speed });
      feedback.textContent = ok ? '¡Correcto! ✓' : `✗ Era ${p.answer}`;
      feedback.className = 'em-feedback ' + (ok ? 'ok' : 'bad');
      game.audio.play(ok ? 'correct' : 'wrong');
      setTimeout(() => {
        i += 1;
        typed = '';
        qStart = perfNow();
        busy = false;
        if (i >= problems.length) game.win({ message: '¡Terminaste los problemas!' });
        else render();
      }, ok ? 480 : 1050);
    }

    // Teclado en pantalla (3 columnas).
    const layout = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (cfg.allowNegative) layout.push('±', '0', 'del');
    else layout.push('0', 'del');
    layout.forEach((k) => {
      const wide = (k === '0' && !cfg.allowNegative);
      const b = el('button', { class: 'em-key' + (wide ? ' em-key-wide' : ''), type: 'button' },
        k === 'del' ? '⌫' : k);
      onTap(b, () => press(k));
      pad.append(b);
    });
    const okBtn = el('button', { class: 'em-key em-key-ok', type: 'button' }, '✓');
    onTap(okBtn, () => press('ok'));
    pad.append(okBtn);

    render();
  });
});
