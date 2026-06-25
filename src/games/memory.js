// =============================================================================
//  JUEGO: MEMORIA / PAREJAS
// -----------------------------------------------------------------------------
//  Voltea cartas y encuentra los pares. Cada par tiene dos caras que pueden ser
//  DISTINTAS (palabra ↔ definición, país ↔ capital, operación ↔ resultado), así
//  que sirve para repasar, no solo para memorizar dibujos iguales.
//
//  Definición (.game.json):
//  {
//    "type": "memory",
//    "title": "Capitales de México",
//    "config": {
//      "pairs": [ { "a": "Jalisco", "b": "Guadalajara" }, ... ],
//      "columns": 4,           // opcional (si no, se calcula)
//      "maxPairs": 8,          // opcional: recorta y baraja a N pares
//      "timeLimit": 0          // opcional: segundos (0 = sin límite)
//    }
//  }
// =============================================================================

import { Entity } from '../engine/entity.js';
import { el } from '../engine/dom.js';
import { onTap } from '../engine/input.js';
import { defineGameType } from '../engine/registry.js';

const perfNow = () =>
  (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

// ---- Lógica pura (probada sin DOM) -----------------------------------------

/**
 * Arma el mazo barajado a partir de la config.
 * @returns {{cards:Array, pairCount:number}}
 */
export function buildDeck(config = {}, rng) {
  let pairs = Array.isArray(config.pairs) ? config.pairs.slice() : [];
  if (config.maxPairs && pairs.length > config.maxPairs) {
    pairs = rng.shuffle(pairs).slice(0, config.maxPairs);
  }
  const cards = [];
  pairs.forEach((p, i) => {
    const a = (p && typeof p === 'object') ? p.a : p;
    const b = (p && typeof p === 'object') ? p.b : p;
    cards.push({ pairId: i, label: String(a), kind: 'a', matched: false, revealed: false });
    cards.push({ pairId: i, label: String(b ?? a), kind: 'b', matched: false, revealed: false });
  });
  return { cards: rng.shuffle(cards), pairCount: pairs.length };
}

/** Columnas "bonitas" para N cartas (cuadrado, con tope para celulares). */
export function bestColumns(n) {
  if (n <= 4) return 2;
  if (n <= 12) return Math.min(4, Math.ceil(Math.sqrt(n)));
  return Math.min(5, Math.ceil(Math.sqrt(n)));
}

// ---- Vista: una carta -------------------------------------------------------

class Card extends Entity {
  render() {
    const { label, kind } = this.props;
    const node = el('button', { class: 'em-card', type: 'button', 'aria-label': 'Carta' }, [
      el('div', { class: 'em-card-inner' }, [
        el('div', { class: 'em-card-face em-card-back', text: '?' }),
        el('div', { class: `em-card-face em-card-front kind-${kind}`, text: label }),
      ]),
    ]);
    return node;
  }
  reveal() { this.props.revealed = true; this.el.classList.add('revealed'); }
  hide() { this.props.revealed = false; this.el.classList.remove('revealed'); }
  match() {
    this.props.matched = true;
    this.el.classList.add('matched');
    this.el.disabled = true;
  }
}

// ---- Tipo de juego ----------------------------------------------------------

defineGameType('memory', (game, def) => {
  const cfg = def.config || {};
  const { cards, pairCount } = buildDeck(cfg, game.rng);

  game.scene('play', (s) => {
    const cols = cfg.columns || bestColumns(cards.length);
    const board = el('div', { class: 'em-mem-board', dataset: { cols }, style: { '--cols': String(cols) } });
    s.root.append(board);

    let first = null;
    let lock = false;
    let t0 = 0;
    let matched = 0;

    let limit = null;
    if (cfg.timeLimit) {
      limit = s.timer(cfg.timeLimit, {
        onTick: (left) => game.setTimer(`⏱ ${Math.ceil(left)}`),
        onEnd: () => game.lose({ message: '¡Se acabó el tiempo!' }),
      });
    }

    function finish() {
      let bonus = 0;
      if (limit && !limit.done) { bonus = Math.round(limit.left * 10); game.score.bonus(bonus); }
      game.win({ message: '¡Encontraste todas las parejas!', pairs: pairCount, timeBonus: bonus });
    }

    function pick(card) {
      if (lock || card.props.matched || card.props.revealed) return;
      game.audio.play('flip');
      card.reveal();

      if (!first) { first = card; t0 = perfNow(); return; }

      const second = card;
      if (second.props.pairId === first.props.pairId) {
        const speed = Math.max(0, 1 - (perfNow() - t0) / 4000);
        game.score.answer(true, { speed });
        game.audio.play('match');
        first.match(); second.match();
        first = null;
        matched += 1;
        game.state.pairsLeft = pairCount - matched;
        if (matched === pairCount) finish();
      } else {
        lock = true;
        game.score.miss();
        game.audio.play('wrong');
        const a = first, b = second;
        first = null;
        setTimeout(() => { a.hide(); b.hide(); lock = false; }, 850);
      }
    }

    cards.forEach((c) => {
      const card = new Card({ ...c });
      card.mount(board);
      onTap(card.el, () => pick(card));
    });
  });
});
