// =============================================================================
//  TIPOS DE JUEGO INTEGRADOS
// -----------------------------------------------------------------------------
//  Importar este módulo registra los tipos en el motor (efecto secundario).
//  A partir de aquí, loadGame({ type: 'memory' | 'math' | 'fill' | 'wordsearch' })
//  ya sabe construirlos. También re-exporta la lógica pura por si la necesitas.
// =============================================================================

import './memory.js';
import './math.js';
import './fill.js';
import './wordsearch.js';

export { buildDeck, bestColumns } from './memory.js';
export { generateProblems, checkAnswer, compute } from './math.js';
export { parseTemplate, blanksOf } from './fill.js';
export { generateGrid, lineCells, sameLine } from './wordsearch.js';

/** Lista de tipos integrados (para menús/validación). */
export const BUILTIN_TYPES = ['memory', 'math', 'fill', 'wordsearch'];
