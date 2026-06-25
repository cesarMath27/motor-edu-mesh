// =============================================================================
//  BUCLE DE JUEGO  — requestAnimationFrame en el navegador, setTimeout en Node
// -----------------------------------------------------------------------------
//  Llama a update(dt) cada cuadro con el delta en segundos (acotado para que un
//  cambio de pestaña no provoque un salto enorme). Headless-safe.
// =============================================================================

const now = () =>
  (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();

const raf =
  (typeof requestAnimationFrame !== 'undefined')
    ? (fn) => requestAnimationFrame(fn)
    : (fn) => setTimeout(() => fn(now()), 16);

const caf =
  (typeof cancelAnimationFrame !== 'undefined')
    ? (id) => cancelAnimationFrame(id)
    : (id) => clearTimeout(id);

export function createLoop(update) {
  let running = false;
  let last = 0;
  let handle = null;

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)) || 0;
    last = t;
    update(dt);
    handle = raf(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = now();
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle != null) caf(handle);
      handle = null;
    },
    get running() {
      return running;
    },
  };
}
