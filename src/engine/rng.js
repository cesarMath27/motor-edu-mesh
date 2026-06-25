// =============================================================================
//  RNG CON SEMILLA  — números aleatorios DETERMINISTAS (mulberry32)
// -----------------------------------------------------------------------------
//  Misma semilla ⇒ misma secuencia. Esto importa porque un juego (.game.json)
//  se distribuye firmado: si todos parten de la misma semilla, el tablero sale
//  igual en cada celular y el juego es REPRODUCIBLE y verificable.
//  Lógica pura: sin DOM, corre igual en Node (para pruebas) y en el navegador.
// =============================================================================

/**
 * Crea un generador con semilla.
 * @param {number} [seed]  Entera. Por defecto, basada en el reloj.
 * @returns {{next:()=>number, int:(min:number,max:number)=>number,
 *            float:(min:number,max:number)=>number, pick:<T>(arr:T[])=>T,
 *            shuffle:<T>(arr:T[])=>T[], bool:(p?:number)=>boolean, seed:number}}
 */
export function makeRng(seed = Date.now()) {
  let a = (seed >>> 0) || 1;

  // mulberry32: rápido, sin estado global, suficiente para juegos.
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max] (ambos inclusive). */
  const int = (min, max) => Math.floor(next() * (max - min + 1)) + min;

  /** Flotante en [min, max). */
  const float = (min, max) => next() * (max - min) + min;

  /** Elige un elemento al azar. */
  const pick = (arr) => arr[Math.floor(next() * arr.length)];

  /** true con probabilidad p (0..1). */
  const bool = (p = 0.5) => next() < p;

  /** Copia barajada (Fisher–Yates). No muta el original. */
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return { next, int, float, pick, bool, shuffle, seed: (seed >>> 0) || 1 };
}
