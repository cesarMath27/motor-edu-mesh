// =============================================================================
//  JUEGO  — orquestador: HUD, escenas, puntuación, fin de partida y reinicio
// -----------------------------------------------------------------------------
//  Dos formas de usarlo:
//   1) SDK:  const g = new Game({title}); g.scene('n', s => {...}); g.start();
//   2) Datos: loadGame(def) arma el juego desde un .game.json y un tipo registrado.
//  Solo toca el DOM al arrancar (start), así que importarlo en Node es seguro.
// =============================================================================

import { el, clear } from './dom.js';
import { Scene } from './scene.js';
import { Score } from './score.js';
import { makeRng } from './rng.js';
import { createAudio } from './audio.js';
import { createLoop } from './loop.js';
import { onTap } from './input.js';
import { getGameType, listGameTypes } from './registry.js';

export class Game {
  /**
   * @param {object} [opts]
   * @param {string} [opts.title]
   * @param {string} [opts.locale='es']
   * @param {number} [opts.seed]
   * @param {Element|string} [opts.mount]  Dónde montar (nodo o selector).
   * @param {boolean} [opts.sound=true]
   * @param {boolean} [opts.hud=true]      Muestra la barra superior.
   * @param {object} [opts.def]            Definición original (.game.json) si aplica.
   */
  constructor(opts = {}) {
    this.title = opts.title || 'Juego educativo';
    this.locale = opts.locale || 'es';
    this.def = opts.def || null;
    this.seed = (opts.seed ?? this.def?.seed ?? Math.floor(Math.random() * 1e9)) >>> 0;
    this.rng = makeRng(this.seed);
    this.score = new Score();
    this.audio = createAudio({ enabled: opts.sound !== false });
    this.state = {};                  // estado libre para el juego
    this.results = null;

    this._opts = opts;
    this._showHud = opts.hud !== false;
    this._scenes = new Map();
    this.current = null;
    this._bus = {};
    this._loop = createLoop((dt) => this._update(dt));

    // Nodos DOM (se crean en start)
    this.root = null;
    this.stage = null;
    this.hud = null;
    this._scoreEl = null;
    this._timerEl = null;
    this._muteBtn = null;
  }

  // ---- Definición de escenas (SDK) -----------------------------------------
  scene(name, setup) {
    this._scenes.set(name, new Scene(this, name, setup));
    return this;
  }

  on(ev, cb) { (this._bus[ev] ||= []).push(cb); return this; }
  emit(ev, data) { (this._bus[ev] || []).forEach((cb) => cb(data)); return this; }

  // ---- Andamiaje DOM --------------------------------------------------------
  _ensureDom() {
    if (this.root) return;
    let host = this._opts.mount;
    if (typeof host === 'string') host = document.querySelector(host);
    if (!host) host = document.body;

    this.root = el('div', { class: 'em-game', dataset: { locale: this.locale } });

    if (this._showHud) {
      this._scoreEl = el('div', { class: 'em-score', text: '0', title: 'Puntos' });
      this._timerEl = el('div', { class: 'em-timer' });
      this._muteBtn = el('button', { class: 'em-mute', 'aria-label': 'Sonido' }, this.audio.muted ? '🔇' : '🔊');
      onTap(this._muteBtn, () => this._toggleMute());
      this.hud = el('div', { class: 'em-hud' }, [
        el('div', { class: 'em-title', text: this.title }),
        el('div', { class: 'em-hud-right' }, [this._timerEl, this._scoreEl, this._muteBtn]),
      ]);
      this.root.append(this.hud);
    }

    this.stage = el('div', { class: 'em-stage' });
    this.root.append(this.stage);
    host.append(this.root);
  }

  _toggleMute() {
    const m = this.audio.toggle();
    if (this._muteBtn) this._muteBtn.textContent = m ? '🔇' : '🔊';
  }

  /** Actualiza el texto del temporizador del HUD ('' lo oculta). */
  setTimer(text) {
    if (this._timerEl) this._timerEl.textContent = text || '';
  }

  // ---- Arranque y navegación -----------------------------------------------
  start(name) {
    this._ensureDom();
    this.audio.unlock();
    this.audio.play('start');
    const first = name || [...this._scenes.keys()][0];
    if (!first) throw new Error('El juego no tiene escenas. Usa game.scene(...) antes de start().');
    this.goTo(first);
    this._loop.start();
    this.emit('start');
    return this;
  }

  goTo(name) {
    const sc = this._scenes.get(name);
    if (!sc) throw new Error(`Escena desconocida: "${name}". Hay: ${[...this._scenes.keys()].join(', ')}`);
    if (this.current) this.current.exit();
    clear(this.stage);
    this.setTimer('');
    this.current = sc;
    sc.enter();
    this.emit('scene', name);
    return this;
  }

  /** Avanza a la siguiente escena registrada; si no hay más, gana. */
  next() {
    const names = [...this._scenes.keys()];
    const i = names.indexOf(this.current?.name);
    if (i >= 0 && i + 1 < names.length) this.goTo(names[i + 1]);
    else this.win();
  }

  _update(dt) {
    if (this.current) this.current.update(dt);
    if (this._scoreEl) this._scoreEl.textContent = String(this.score.points);
  }

  // ---- Fin de partida -------------------------------------------------------
  win(payload = {}) { this._end(true, payload); }
  lose(payload = {}) { this._end(false, payload); }

  _end(won, payload) {
    this._loop.stop();
    if (this.current) { this.current.exit(); this.current = null; }
    this.results = {
      won,
      score: this.score.points,
      correct: this.score.correct,
      total: this.score.total,
      accuracy: this.score.accuracy,
      bestStreak: this.score.bestStreak,
      seed: this.seed,
      title: this.title,
      ...payload,
    };
    this.audio.play(won ? 'win' : 'lose');
    this.setTimer('');
    this._showEndScreen(won, payload);
    this.emit(won ? 'win' : 'lose', this.results);
    this.emit('end', this.results);
  }

  _showEndScreen(won, payload) {
    if (!this.stage) return;
    clear(this.stage);
    const r = this.results;
    const msg = payload.message || (won ? '¡Lo lograste! 🎉' : '¡Sigue practicando! 💪');
    const pct = r.total ? Math.round(r.accuracy * 100) : null;
    const replay = el('button', { class: 'em-btn em-btn-primary' }, '↻ Jugar de nuevo');
    onTap(replay, () => this.restart());
    this.stage.append(
      el('div', { class: `em-end ${won ? 'won' : 'lost'}` }, [
        el('div', { class: 'em-end-emoji', text: won ? '🏆' : '🎯' }),
        el('h2', { class: 'em-end-title', text: msg }),
        el('div', { class: 'em-end-score', text: `${r.score} pts` }),
        pct !== null
          ? el('div', { class: 'em-end-detail', text: `${r.correct}/${r.total} aciertos · ${pct}%` })
          : null,
        replay,
      ]),
    );
  }

  /** Reinicia con un tablero nuevo (otra semilla). */
  restart() {
    this.score.reset();
    this.results = null;
    this.seed = (Math.floor(Math.random() * 1e9)) >>> 0;
    this.rng = makeRng(this.seed);
    this.emit('restart');
    this.start([...this._scenes.keys()][0]);
  }

  destroy() {
    this._loop.stop();
    this.current?.exit();
    this.root?.remove();
    this.root = null;
  }
}

// =============================================================================
//  CARGADOR  — arma un Game a partir de una definición (.game.json)
// =============================================================================

/** Valida la forma mínima de una definición y lanza un error claro si falla. */
export function validateDef(def) {
  if (!def || typeof def !== 'object') throw new Error('Definición vacía o no es un objeto.');
  if (!def.type) throw new Error('Falta "type" (qué tipo de juego es).');
  if (def.config && typeof def.config !== 'object') throw new Error('"config" debe ser un objeto.');
  return true;
}

/**
 * Crea un juego listo para start() desde una definición y un tipo registrado.
 * @param {object} def    El .game.json (objeto ya parseado).
 * @param {object} [opts] Opciones de Game (mount, sound, hud…).
 * @returns {Game}
 */
export function loadGame(def, opts = {}) {
  validateDef(def);
  const factory = getGameType(def.type);
  if (!factory) {
    throw new Error(
      `Tipo de juego desconocido: "${def.type}". ` +
      `Registrados: ${listGameTypes().join(', ') || '(ninguno: ¿importaste src/games/index.js?)'}`,
    );
  }
  const game = new Game({
    title: def.title,
    locale: def.locale,
    seed: def.seed,
    def,
    ...opts,
  });
  factory(game, def);
  return game;
}
