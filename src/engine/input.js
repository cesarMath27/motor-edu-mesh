// =============================================================================
//  ENTRADA ACCESIBLE  — un solo "toque" para mouse, táctil y teclado
// -----------------------------------------------------------------------------
//  En un salón hay celulares (táctil) y a veces teclado. onTap unifica los tres
//  y deja el elemento enfocable para que también funcione con Enter/Espacio.
// =============================================================================

/**
 * Registra un "toque" accesible. Devuelve una función para desuscribirse.
 * @param {Element} elem
 * @param {(e:Event)=>void} handler
 * @param {object} [o]
 * @param {boolean} [o.keyboard=true]  Activa con Enter/Espacio.
 * @param {string}  [o.role='button']
 */
export function onTap(elem, handler, { keyboard = true, role = 'button' } = {}) {
  const onClick = (e) => handler(e);
  elem.addEventListener('click', onClick);

  let onKey = null;
  if (keyboard) {
    if (!elem.hasAttribute('tabindex')) elem.setAttribute('tabindex', '0');
    if (role && !elem.hasAttribute('role')) elem.setAttribute('role', role);
    onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handler(e);
      }
    };
    elem.addEventListener('keydown', onKey);
  }

  return () => {
    elem.removeEventListener('click', onClick);
    if (onKey) elem.removeEventListener('keydown', onKey);
  };
}

/**
 * Coordenadas de un evento de puntero (mouse o táctil), normalizadas.
 */
export function pointerXY(e) {
  const t = e.touches?.[0] || e.changedTouches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
}
