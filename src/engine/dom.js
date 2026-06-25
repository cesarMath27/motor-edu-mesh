// =============================================================================
//  HELPERS DOM  — crear nodos sin plantillas ni dependencias
// -----------------------------------------------------------------------------
//  Solo tocan `document` DENTRO de las funciones, así que importar este módulo
//  en Node es seguro (no se ejecuta nada hasta que el navegador llama a el()).
// =============================================================================

/**
 * Crea un elemento.
 * @param {string} tag
 * @param {object} [props]  class, text, html, style{}, on<Evento>, o atributos.
 * @param {Array|Node|string} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c && c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Vacía un nodo. */
export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Espera ms milisegundos (para pausas entre animaciones). */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
