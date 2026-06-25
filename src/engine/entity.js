// =============================================================================
//  ENTIDAD  — un objeto del juego con representación en el DOM
// -----------------------------------------------------------------------------
//  Base mínima: render() crea su nodo, update(dt) la anima, on/emit comunican.
//  Los tipos de juego extienden esta clase (Carta, Celda, Ficha…).
// =============================================================================

import { el } from './dom.js';

export class Entity {
  constructor(props = {}) {
    this.props = props;
    this.scene = null;       // la asigna Scene.add()
    this.el = null;          // nodo DOM (tras mount)
    this.dead = false;
    this._listeners = {};
  }

  /** Crea el nodo. Sobrescríbelo en las subclases. */
  render() {
    return el('div', { class: 'em-entity' });
  }

  /** Inserta el nodo en el contenedor de la escena. */
  mount(parent) {
    if (!this.el) this.el = this.render();
    if (this.el && parent) parent.append(this.el);
    this.onMount?.();
    return this;
  }

  /** Animación por cuadro (dt en segundos). Opcional. */
  update(_dt) {}

  on(ev, cb) {
    (this._listeners[ev] ||= []).push(cb);
    return this;
  }

  emit(ev, data) {
    (this._listeners[ev] || []).forEach((cb) => cb(data));
    return this;
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.onDestroy?.();
    this.el?.remove();
    this.el = null;
  }
}
