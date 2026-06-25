// =============================================================================
//  motor-edu-mesh — API pública del MOTOR (SDK)
// -----------------------------------------------------------------------------
//  import { Game, loadGame } from './src/engine/index.js'
//
//  Dos caminos:
//   • SDK (programadores): construye con Game/Scene/Entity y la API imperativa.
//   • Datos: loadGame(def) interpreta un .game.json con un tipo ya registrado
//     (importa './src/games/index.js' para tener memoria, math, fill, sopa…).
// =============================================================================

export const VERSION = '0.1.0';

export { Game, loadGame, validateDef } from './game.js';
export { Scene } from './scene.js';
export { Entity } from './entity.js';
export { Score, POINTS_MAX, STREAK_BONUS } from './score.js';
export { makeRng } from './rng.js';
export { createAudio } from './audio.js';
export { createLoop } from './loop.js';
export { onTap, pointerXY } from './input.js';
export { el, clear, wait } from './dom.js';
export { normalize, answersMatch, stripAccents, gridLetters } from './text.js';
export {
  defineGameType,
  getGameType,
  hasGameType,
  listGameTypes,
} from './registry.js';
