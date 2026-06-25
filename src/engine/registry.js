// =============================================================================
//  REGISTRO DE TIPOS DE JUEGO  — el "plugin system" del motor
// -----------------------------------------------------------------------------
//  Cada tipo de juego (memoria, matemáticas, completar, sopa de letras…) se
//  registra con un nombre y una FÁBRICA: factory(game, def). La fábrica recibe
//  un Game vacío y una definición (.game.json) y arma las escenas.
//  Importar este módulo NO ejecuta ninguna fábrica: solo guarda referencias.
// =============================================================================

const types = new Map();

/**
 * Declara un tipo de juego.
 * @param {string} name
 * @param {(game:import('./game.js').Game, def:object)=>void} factory
 */
export function defineGameType(name, factory) {
  if (typeof factory !== 'function') {
    throw new Error(`defineGameType("${name}"): la fábrica debe ser una función.`);
  }
  types.set(name, factory);
}

export function getGameType(name) {
  return types.get(name);
}

export function hasGameType(name) {
  return types.has(name);
}

export function listGameTypes() {
  return [...types.keys()];
}
