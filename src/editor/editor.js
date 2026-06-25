// =============================================================================
//  EDITOR VISUAL  — crea videojuegos educativos sin programar
// -----------------------------------------------------------------------------
//  Dibuja un formulario por tipo de juego (a partir de los esquemas), arma el
//  .game.json en vivo, deja PROBARLO al instante (reusa el motor) y exportarlo
//  o importarlo. El maestro nunca toca código.
// =============================================================================

import { loadGame, el, clear } from '../engine/index.js';
import '../games/index.js'; // registra memory/math/fill/wordsearch para la vista previa
import {
  META_FIELDS, SCHEMAS, EDITOR_TYPES,
  buildDef, blankValues, valuesFromDef, validateConfig, fileNameFor,
} from './schema.js';

// ---- Controles de formulario (genéricos) -----------------------------------

/** Bloque de campo con etiqueta arriba. */
function fieldBlock(label, control, help) {
  return el('div', { class: 'ed-field' }, [
    el('label', { class: 'ed-label', text: label }),
    control,
    help ? el('div', { class: 'ed-help', text: help }) : null,
  ]);
}

/**
 * Crea el control de un campo. `get()` devuelve el valor actual; `set(v)` lo
 * guarda; tras cualquier cambio se llama a `onChange`.
 */
function makeControl(field, get, set, onChange) {
  const value = get();
  const changed = (v) => { set(v); onChange(); };

  if (field.type === 'checkbox') {
    const inp = el('input', { type: 'checkbox' });
    inp.checked = !!value;
    inp.addEventListener('change', () => changed(inp.checked));
    return el('div', { class: 'ed-field ed-field-inline' }, [
      el('label', { class: 'ed-check' }, [inp, el('span', { text: field.label })]),
    ]);
  }

  if (field.type === 'multicheck') {
    const current = new Set(Array.isArray(value) ? value : []);
    const box = el('div', { class: 'ed-multi' });
    for (const opt of field.options) {
      const cb = el('input', { type: 'checkbox' });
      cb.checked = current.has(opt.value);
      cb.addEventListener('change', () => {
        if (cb.checked) current.add(opt.value); else current.delete(opt.value);
        changed(field.options.map((o) => o.value).filter((v) => current.has(v)));
      });
      box.append(el('label', { class: 'ed-check' }, [cb, el('span', { text: opt.label })]));
    }
    return fieldBlock(field.label, box, field.help);
  }

  if (field.type === 'textlist') {
    const ta = el('textarea', { class: 'ed-input ed-area', placeholder: field.placeholder || '' });
    ta.value = value || '';
    ta.addEventListener('input', () => changed(ta.value));
    return fieldBlock(field.label, ta, field.help);
  }

  if (field.type === 'rows') return makeRows(field, get, set, onChange);

  // text / number / numlist
  const isNum = field.type === 'number';
  const inp = el('input', { class: 'ed-input', type: isNum ? 'number' : 'text', placeholder: field.placeholder || '' });
  inp.value = value ?? '';
  if (field.min != null) inp.min = String(field.min);
  if (field.max != null) inp.max = String(field.max);
  inp.addEventListener('input', () => changed(isNum ? (Number(inp.value) || 0) : inp.value));
  return fieldBlock(field.label, inp, field.help);
}

/** Campo de FILAS repetibles (pares de memoria, frases de "completar"…). */
function makeRows(field, get, set, onChange) {
  const rows = (Array.isArray(get()) ? get() : []).map((r) => ({ ...r }));
  const blankRow = () => Object.fromEntries(field.columns.map((c) => [c.key, '']));
  while (rows.length < (field.min || 0)) rows.push(blankRow());

  const list = el('div', { class: 'ed-rows' });
  const emit = () => { set(rows.map((r) => ({ ...r }))); onChange(); };

  function renderRows() {
    clear(list);
    rows.forEach((row, idx) => {
      const rowEl = el('div', { class: 'ed-row' });
      for (const c of field.columns) {
        const inp = el('input', {
          class: 'ed-input' + (c.wide ? ' ed-wide' : ''), type: 'text',
          placeholder: c.placeholder || c.label, 'aria-label': c.label,
        });
        inp.value = row[c.key] ?? '';
        inp.addEventListener('input', () => { row[c.key] = inp.value; emit(); });
        rowEl.append(inp);
      }
      const del = el('button', { class: 'ed-row-del', type: 'button', 'aria-label': 'Quitar fila', title: 'Quitar' }, '✕');
      del.addEventListener('click', () => {
        rows.splice(idx, 1);
        while (rows.length < (field.min || 0)) rows.push(blankRow());
        renderRows(); emit();
      });
      rowEl.append(del);
      list.append(rowEl);
    });
  }

  const add = el('button', { class: 'ed-add', type: 'button' }, field.addLabel || '＋ Agregar');
  add.addEventListener('click', () => { rows.push(blankRow()); renderRows(); emit(); });

  renderRows();
  set(rows.map((r) => ({ ...r }))); // sincroniza el estado con el mínimo de filas
  return fieldBlock(field.label, el('div', {}, [list, add]), field.help);
}

// ---- Aplicación del editor --------------------------------------------------

export function mountEditor(host) {
  const root = typeof host === 'string' ? document.querySelector(host) : host;

  const state = {
    type: EDITOR_TYPES[0],
    meta: { title: '', locale: 'es-MX', seed: 0, subject: '', grade: '', author: '' },
    values: blankValues(EDITOR_TYPES[0]),
  };
  let currentGame = null;

  // --- Estructura ---
  const metaBox = el('div', { class: 'ed-section' });
  const typeSel = el('select', { class: 'ed-input ed-select' });
  for (const t of EDITOR_TYPES) typeSel.append(el('option', { value: t, text: SCHEMAS[t].label }));
  const typeHelp = el('div', { class: 'ed-help' });
  const formBox = el('div', { class: 'ed-section ed-form' });

  const errBox = el('div', { class: 'ed-errors' });
  const jsonView = el('textarea', { class: 'ed-json', readonly: true, spellcheck: 'false' });

  const btnPlay = el('button', { class: 'em-btn em-btn-primary', type: 'button' }, '▶ Probar');
  const btnDownload = el('button', { class: 'em-btn', type: 'button' }, '⬇ Descargar .game.json');
  const btnCopy = el('button', { class: 'em-btn', type: 'button' }, '⧉ Copiar JSON');
  const btnImport = el('button', { class: 'em-btn', type: 'button' }, '⬆ Importar');
  const btnNew = el('button', { class: 'em-btn', type: 'button' }, '✦ Nuevo');
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });

  // Vista previa (overlay)
  const previewMount = el('div', {});
  const overlay = el('div', { class: 'ed-overlay', hidden: true }, [
    el('div', { class: 'ed-modal' }, [
      el('div', { class: 'ed-modal-bar' }, [
        el('strong', { text: 'Vista previa' }),
        (() => { const b = el('button', { class: 'em-btn', type: 'button' }, '✕ Cerrar'); b.addEventListener('click', closePreview); return b; })(),
      ]),
      previewMount,
    ]),
  ]);

  root.append(
    el('div', { class: 'ed-grid' }, [
      el('div', { class: 'ed-col' }, [
        el('h2', { class: 'ed-h2', text: '1 · Datos del juego' }), metaBox,
        el('h2', { class: 'ed-h2', text: '2 · Tipo de juego' }),
        fieldBlock('Tipo', typeSel), typeHelp,
        el('h2', { class: 'ed-h2', text: '3 · Contenido' }), formBox,
      ]),
      el('div', { class: 'ed-col' }, [
        el('div', { class: 'ed-actions' }, [btnPlay, btnDownload, btnCopy, btnImport, btnNew, fileInput]),
        errBox,
        el('h2', { class: 'ed-h2', text: 'Vista del .game.json' }),
        jsonView,
        el('p', { class: 'ed-help', text: 'Este es el archivo que edu-mesh puede firmar y repartir por la WiFi del salón.' }),
      ]),
    ]),
    overlay,
  );

  // --- Render dinámico ---
  function renderMeta() {
    clear(metaBox);
    for (const f of META_FIELDS) {
      metaBox.append(makeControl(f, () => state.meta[f.key], (v) => { state.meta[f.key] = v; }, refresh));
    }
  }

  function renderForm() {
    typeHelp.textContent = SCHEMAS[state.type].help || '';
    clear(formBox);
    for (const f of SCHEMAS[state.type].fields) {
      formBox.append(makeControl(f, () => state.values[f.key], (v) => { state.values[f.key] = v; }, refresh));
    }
  }

  function currentDef() {
    return buildDef(state.type, state.meta, state.values);
  }

  function refresh() {
    const def = currentDef();
    jsonView.value = JSON.stringify(def, null, 2);
    const errs = validateConfig(def.type, def.config);
    clear(errBox);
    if (errs.length) {
      errBox.append(el('div', { class: 'ed-errs-title', text: 'Para poder jugar, falta:' }));
      for (const e of errs) errBox.append(el('div', { class: 'ed-err', text: '• ' + e }));
    }
    const ready = errs.length === 0;
    btnPlay.disabled = !ready;
    btnDownload.disabled = !ready;
  }

  // --- Acciones ---
  function preview() {
    const def = currentDef();
    if (validateConfig(def.type, def.config).length) return;
    overlay.hidden = false;
    clear(previewMount);
    try {
      currentGame = loadGame(def, { mount: previewMount });
      currentGame.start();
    } catch (e) {
      previewMount.append(el('div', { class: 'ed-err', text: 'Error: ' + e.message }));
    }
  }
  function closePreview() {
    if (currentGame) { try { currentGame.destroy?.(); } catch { /* */ } currentGame = null; }
    overlay.hidden = true;
    clear(previewMount);
  }
  function download() {
    const def = currentDef();
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: fileNameFor(def) });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(jsonView.value);
      const old = btnCopy.textContent; btnCopy.textContent = '✓ ¡Copiado!';
      setTimeout(() => { btnCopy.textContent = old; }, 1200);
    } catch {
      jsonView.removeAttribute('readonly'); jsonView.focus(); jsonView.select();
      jsonView.setAttribute('readonly', '');
    }
  }
  function loadFromDef(def) {
    const parsed = valuesFromDef(def);
    state.type = parsed.type; state.meta = parsed.meta; state.values = parsed.values;
    typeSel.value = state.type;
    renderMeta(); renderForm(); refresh();
  }
  function reset() {
    state.meta = { title: '', locale: 'es-MX', seed: 0, subject: '', grade: '', author: '' };
    state.values = blankValues(state.type);
    renderMeta(); renderForm(); refresh();
  }

  // --- Eventos ---
  typeSel.addEventListener('change', () => {
    state.type = typeSel.value;
    state.values = blankValues(state.type);
    renderForm(); refresh();
  });
  btnPlay.addEventListener('click', preview);
  btnDownload.addEventListener('click', download);
  btnCopy.addEventListener('click', copy);
  btnNew.addEventListener('click', reset);
  btnImport.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try { loadFromDef(JSON.parse(await f.text())); }
    catch (e) { alert('No se pudo leer el archivo: ' + e.message); }
    fileInput.value = '';
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePreview(); });

  // --- Inicio ---
  typeSel.value = state.type;
  renderMeta();
  renderForm();
  refresh();
}
