// =============================================================================
//  ESCENA  — una pantalla del juego (un nivel, una ronda, el menú…)
// -----------------------------------------------------------------------------
//  setup(scene) construye la UI/entidades. La escena ofrece: bus de eventos,
//  temporizadores con cuenta regresiva, entidades y atajos (score, win, next).
// =============================================================================

import { el } from './dom.js';

export class Scene {
  constructor(game, name, setup) {
    this.game = game;
    this.name = name;
    this.setup = setup;
    this.root = null;        // contenedor DOM de la escena
    this.entities = [];
    this._bus = {};
    this._timers = [];
    this.active = false;
  }

  // ---- Bus de eventos de la escena -----------------------------------------
  on(ev, cb) { (this._bus[ev] ||= []).push(cb); return this; }
  emit(ev, data) { (this._bus[ev] || []).forEach((cb) => cb(data)); return this; }

  // ---- Entidades ------------------------------------------------------------
  add(entity) {
    entity.scene = this;
    this.entities.push(entity);
    if (this.root) entity.mount(this.root);
    return entity;
  }

  spawn(Type, props) {
    return this.add(new Type(props));
  }

  // ---- Temporizador con cuenta regresiva (segundos) -------------------------
  /**
   * @param {number} seconds
   * @param {object} [o]
   * @param {(left:number,total:number)=>void} [o.onTick]
   * @param {()=>void} [o.onEnd]
   * @returns {{left:number,total:number,done:boolean,stop:()=>void}}
   */
  timer(seconds, { onTick, onEnd } = {}) {
    const t = { left: seconds, total: seconds, done: false, onTick, onEnd, stop() { this.done = true; } };
    this._timers.push(t);
    onTick?.(t.left, t.total);
    return t;
  }

  // ---- Ciclo de vida (lo llama Game) ---------------------------------------
  enter() {
    this.active = true;
    this.root = el('div', { class: `em-scene em-scene-${this.name}` });
    this.game.stage.append(this.root);
    this.setup?.(this);
    for (const e of this.entities) if (!e.el) e.mount(this.root);
    this.onEnter?.();
  }

  update(dt) {
    for (const t of this._timers) {
      if (t.done) continue;
      t.left = Math.max(0, t.left - dt);
      t.onTick?.(t.left, t.total);
      if (t.left <= 0) { t.done = true; t.onEnd?.(); }
    }
    for (const e of this.entities) if (!e.dead) e.update(dt);
  }

  exit() {
    this.active = false;
    this.onExit?.();
    for (const e of this.entities) e.destroy();
    this.entities = [];
    this._timers = [];
    this.root?.remove();
    this.root = null;
  }

  // ---- Atajos al juego ------------------------------------------------------
  get score() { return this.game.score; }
  get rng() { return this.game.rng; }
  get audio() { return this.game.audio; }
  win(payload) { this.game.win(payload); }
  lose(payload) { this.game.lose(payload); }
  goTo(name) { this.game.goTo(name); }
  next() { this.game.next(); }
}
