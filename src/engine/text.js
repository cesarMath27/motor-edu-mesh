// =============================================================================
//  TEXTO  — normalización para comparar respuestas (acentos / mayúsculas)
// -----------------------------------------------------------------------------
//  "Fotosíntesis" debe poder igualar a "fotosintesis". Lógica pura y probada.
// =============================================================================

/** Quita acentos/diacríticos (mantiene la ñ → n solo si stripEnye). */
export function stripAccents(s, { stripEnye = true } = {}) {
  let out = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!stripEnye) out = out.replace(/ñ/g, 'ñ'); // recompone la ñ
  return out;
}

/**
 * Normaliza una respuesta para compararla con tolerancia.
 * @param {string} s
 * @param {object} [o]
 * @param {boolean} [o.caseSensitive=false]
 * @param {boolean} [o.accentSensitive=false]
 * @param {boolean} [o.trim=true]
 */
export function normalize(s, { caseSensitive = false, accentSensitive = false, trim = true } = {}) {
  let out = String(s ?? '');
  if (trim) out = out.trim().replace(/\s+/g, ' ');
  if (!caseSensitive) out = out.toLowerCase();
  if (!accentSensitive) out = stripAccents(out);
  return out;
}

/** ¿Dos textos son equivalentes según las tolerancias dadas? */
export function answersMatch(a, b, opts) {
  return normalize(a, opts) === normalize(b, opts);
}

/** MAYÚSCULAS sin acentos ni espacios — para colocar palabras en la sopa. */
export function gridLetters(word) {
  return stripAccents(String(word).toUpperCase()).replace(/[^A-ZÑ0-9]/g, '');
}
