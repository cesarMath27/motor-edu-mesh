// =============================================================================
//  JUEGO: COMPLETAR / RELLENAR HUECOS
// -----------------------------------------------------------------------------
//  Frases con huecos {entre llaves}. El alumno escribe (o toca una ficha del
//  banco de palabras) para completarlas. Compara con tolerancia a mayúsculas y
//  acentos (configurable).
//
//  Definición (.game.json):
//  {
//    "type": "fill",
//    "title": "Partes de la célula",
//    "config": {
//      "items": [
//        { "text": "La fotosíntesis ocurre en el {cloroplasto} de la célula.",
//          "bank": ["cloroplasto","mitocondria","núcleo"] },
//        { "text": "El agua se compone de {hidrógeno} y {oxígeno}." }
//      ],
//      "caseSensitive": false,
//      "accentSensitive": false,
//      "shuffle": true
//    }
//  }
// =============================================================================

import { el, clear } from '../engine/dom.js';
import { onTap } from '../engine/input.js';
import { defineGameType } from '../engine/registry.js';
import { answersMatch } from '../engine/text.js';

const perfNow = () =>
  (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

// ---- Lógica pura ------------------------------------------------------------

/** Divide una plantilla en segmentos de texto y huecos. */
export function parseTemplate(text) {
  const segs = [];
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let bi = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', value: text.slice(last, m.index) });
    segs.push({ type: 'blank', answer: m[1].trim(), index: bi++ });
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ type: 'text', value: text.slice(last) });
  return segs;
}

/** Respuestas correctas de una plantilla, en orden. */
export function blanksOf(text) {
  return parseTemplate(text).filter((s) => s.type === 'blank').map((s) => s.answer);
}

// ---- Tipo de juego ----------------------------------------------------------

defineGameType('fill', (game, def) => {
  const cfg = def.config || {};
  const opts = { caseSensitive: !!cfg.caseSensitive, accentSensitive: !!cfg.accentSensitive };
  let items = (cfg.items || []).map((it) => (typeof it === 'string' ? { text: it } : it));
  if (cfg.shuffle) items = game.rng.shuffle(items);

  game.scene('play', (s) => {
    let i = 0;
    let itemStart = perfNow();
    let focused = null;
    let checked = false;
    let inputs = [];

    const prog = el('div', { class: 'em-fill-prog' });
    const sentence = el('div', { class: 'em-fill-sentence' });
    const bank = el('div', { class: 'em-fill-bank' });
    const feedback = el('div', { class: 'em-feedback' });
    const action = el('button', { class: 'em-btn em-btn-primary', type: 'button' }, 'Comprobar');
    onTap(action, onAction);
    s.root.append(el('div', { class: 'em-fill' }, [prog, sentence, bank, feedback, action]));

    function render() {
      checked = false;
      itemStart = perfNow();
      inputs = [];
      clear(sentence); clear(bank);
      feedback.textContent = ''; feedback.className = 'em-feedback';
      prog.textContent = `Frase ${i + 1} / ${items.length}`;

      const it = items[i];
      for (const seg of parseTemplate(it.text)) {
        if (seg.type === 'text') {
          sentence.append(document.createTextNode(seg.value));
        } else {
          const inp = el('input', {
            class: 'em-blank', type: 'text', autocomplete: 'off',
            autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Respuesta',
            size: String(Math.max(4, seg.answer.length)),
          });
          inp.dataset.answer = seg.answer;
          inp.addEventListener('focus', () => { focused = inp; });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAction(); });
          sentence.append(inp);
          inputs.push(inp);
        }
      }

      if (Array.isArray(it.bank) && it.bank.length) {
        for (const w of game.rng.shuffle(it.bank)) {
          const chip = el('button', { class: 'em-chip', type: 'button' }, w);
          onTap(chip, () => {
            const target = (focused && inputs.includes(focused)) ? focused : inputs.find((x) => !x.value);
            if (target) { target.value = w; target.focus(); }
          });
          bank.append(chip);
        }
      }

      action.textContent = 'Comprobar';
      inputs[0]?.focus();
    }

    function check() {
      if (!inputs.length) return true;
      let correct = 0;
      const speed = Math.max(0, 1 - (perfNow() - itemStart) / 15000);
      for (const inp of inputs) {
        const ok = answersMatch(inp.value, inp.dataset.answer, opts);
        inp.classList.toggle('ok', ok);
        inp.classList.toggle('bad', !ok);
        inp.disabled = true;
        game.score.answer(ok, { speed });
        if (ok) correct++;
      }
      const all = correct === inputs.length;
      feedback.textContent = all
        ? '¡Muy bien! ✓'
        : `Respuestas: ${inputs.map((x) => x.dataset.answer).join(', ')}`;
      feedback.className = 'em-feedback ' + (all ? 'ok' : 'bad');
      game.audio.play(all ? 'correct' : 'wrong');
      return all;
    }

    function onAction() {
      if (!checked) {
        check();
        checked = true;
        action.textContent = (i + 1 >= items.length) ? 'Terminar 🏁' : 'Siguiente ▶';
      } else {
        i += 1;
        if (i >= items.length) game.win({ message: '¡Completaste las frases!' });
        else render();
      }
    }

    render();
  });
});
