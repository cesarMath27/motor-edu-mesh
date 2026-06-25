// =============================================================================
//  EJEMPLO CON EL SDK  — un juego NUEVO, escrito con el motor (no un tipo dado)
// -----------------------------------------------------------------------------
//  Muestra el camino "para programadores": en vez de un .game.json, construyes
//  el juego con la API imperativa (Game, escenas, entrada, audio, puntuación).
//  Así se crean tipos de juego que el motor todavía no trae de fábrica.
//
//  Uso:  import { build } from './examples/sumas-sdk.game.js';
//        build({ mount: '#app' }).start();
// =============================================================================

import { Game, el, onTap } from '../src/engine/index.js';

export const meta = { title: 'Lluvia de sumas (SDK)', kind: 'sdk', type: 'custom' };

const now = () =>
  (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

/**
 * Crea el juego. Devuelve un Game listo para .start().
 * @param {object} [opts]  Opciones de Game (mount, sound, seed…).
 */
export function build(opts = {}) {
  const ROUNDS = 8;
  const g = new Game({ title: 'Lluvia de sumas', ...opts });

  g.scene('play', (s) => {
    let round = 0;
    let qStart = 0;
    const card = el('div', { class: 'em-math' });
    s.root.append(card);

    function next() {
      round += 1;
      if (round > ROUNDS) { g.win({ message: '¡Sumas dominadas! 🌟' }); return; }

      const a = g.rng.int(1, 9);
      const b = g.rng.int(1, 9);
      const answer = a + b;

      // Tres distractores cercanos y únicos.
      const set = new Set([answer]);
      while (set.size < 4) {
        const d = answer + g.rng.int(-3, 3);
        if (d > 0 && d !== answer) set.add(d);
      }
      const choices = g.rng.shuffle([...set]);
      qStart = now();

      card.replaceChildren(
        el('div', { class: 'em-math-prog', text: `Suma ${round} / ${ROUNDS}` }),
        el('div', { class: 'em-math-problem', text: `${a} + ${b} = ?` }),
      );
      const grid = el('div', { class: 'em-keypad', style: { gridTemplateColumns: 'repeat(2, 1fr)' } });
      for (const c of choices) {
        const btn = el('button', { class: 'em-key', type: 'button' }, String(c));
        onTap(btn, () => pick(c === answer, btn));
        grid.append(btn);
      }
      card.append(grid);
    }

    function pick(ok, btn) {
      const speed = Math.max(0, 1 - (now() - qStart) / 6000);
      g.score.answer(ok, { speed });
      g.audio.play(ok ? 'correct' : 'wrong');
      btn.style.background = ok ? 'var(--ok)' : 'var(--bad)';
      btn.style.color = '#fff';
      setTimeout(next, ok ? 350 : 750);
    }

    next();
  });

  return g;
}
