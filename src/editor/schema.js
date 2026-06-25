// =============================================================================
//  EDITOR · ESQUEMAS Y SERIALIZACIÓN  (lógica pura, sin DOM)
// -----------------------------------------------------------------------------
//  Describe DECLARATIVAMENTE el formulario de cada tipo de juego y convierte
//  entre "valores del formulario" ⇄ ".game.json". Al ser puro, se prueba en
//  Node y el editor del navegador solo se encarga de dibujar los campos.
// =============================================================================

import { gridLetters } from '../engine/text.js';

// ---- Campos comunes (metadatos del juego) ----------------------------------
export const META_FIELDS = [
  { key: 'title', type: 'text', label: 'Título', placeholder: 'Capitales de México', required: true },
  { key: 'subject', type: 'text', label: 'Materia', placeholder: 'Geografía' },
  { key: 'grade', type: 'text', label: 'Grado', placeholder: 'Primaria' },
  { key: 'author', type: 'text', label: 'Autor(a)', placeholder: 'Profe…' },
  { key: 'seed', type: 'number', label: 'Semilla (0 = aleatoria)', default: 0, min: 0 },
];

// ---- Esquema de cada tipo de juego -----------------------------------------
export const SCHEMAS = {
  memory: {
    label: 'Memoria / parejas',
    help: 'Crea pares para emparejar. La cara A y la B pueden ser distintas (palabra ↔ definición).',
    fields: [
      {
        key: 'pairs', type: 'rows', label: 'Pares', addLabel: '＋ Agregar par', min: 2,
        columns: [
          { key: 'a', label: 'Cara A', placeholder: 'Jalisco' },
          { key: 'b', label: 'Cara B (opcional)', placeholder: 'Guadalajara' },
        ],
        default: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }],
      },
      { key: 'columns', type: 'number', label: 'Columnas (0 = automático)', default: 0, min: 0, max: 8, omitIfFalsy: true },
      { key: 'maxPairs', type: 'number', label: 'Máx. de pares (0 = todos)', default: 0, min: 0, omitIfFalsy: true },
      { key: 'timeLimit', type: 'number', label: 'Tiempo límite (seg, 0 = sin límite)', default: 0, min: 0 },
    ],
  },

  math: {
    label: 'Matemáticas',
    help: 'Problemas con teclado en pantalla y contrarreloj. Usa tablas o mezcla operaciones.',
    fields: [
      {
        key: 'ops', type: 'multicheck', label: 'Operaciones (si no usas tablas)',
        options: [
          { value: '+', label: '＋ Suma' }, { value: '-', label: '－ Resta' },
          { value: '×', label: '× Multiplicación' }, { value: '÷', label: '÷ División' },
        ],
        default: ['+', '-'],
      },
      { key: 'tables', type: 'numlist', label: 'Tablas a practicar (×) — vacío = usar operaciones', placeholder: '6, 7, 8', omitIfFalsy: true },
      { key: 'min', type: 'number', label: 'Operando mínimo', default: 1 },
      { key: 'max', type: 'number', label: 'Operando máximo', default: 12 },
      { key: 'count', type: 'number', label: 'Cantidad de problemas', default: 10, min: 1 },
      { key: 'timeLimit', type: 'number', label: 'Tiempo total (seg, 0 = sin límite)', default: 60, min: 0 },
      { key: 'allowNegative', type: 'checkbox', label: 'Permitir restas con resultado negativo', default: false },
      { key: 'parSeconds', type: 'number', label: 'Segundos ideales por problema', default: 8, min: 1 },
    ],
  },

  fill: {
    label: 'Completar huecos',
    help: 'Escribe frases y marca la respuesta entre llaves: La célula tiene {núcleo}.',
    fields: [
      {
        key: 'items', type: 'rows', label: 'Frases', addLabel: '＋ Agregar frase', min: 1,
        columns: [
          { key: 'text', label: 'Frase (usa {respuesta})', placeholder: 'La fotosíntesis ocurre en el {cloroplasto}.', wide: true },
          { key: 'bank', label: 'Banco de palabras (comas, opcional)', parse: 'list', placeholder: 'cloroplasto, núcleo, vacuola' },
        ],
        default: [{ text: '', bank: '' }],
      },
      { key: 'caseSensitive', type: 'checkbox', label: 'Distinguir mayúsculas', default: false },
      { key: 'accentSensitive', type: 'checkbox', label: 'Distinguir acentos', default: false },
      { key: 'shuffle', type: 'checkbox', label: 'Mezclar el orden de las frases', default: true },
    ],
  },

  wordsearch: {
    label: 'Sopa de letras',
    help: 'Una palabra por línea (o separadas por comas). Se acomodan solas en la cuadrícula.',
    fields: [
      { key: 'words', type: 'textlist', label: 'Palabras', placeholder: 'PERRO\nGATO\nAGUILA\nBALLENA', default: [] },
      { key: 'size', type: 'number', label: 'Tamaño de la cuadrícula', default: 12, min: 5, max: 18 },
      { key: 'allowReverse', type: 'checkbox', label: 'Permitir palabras al revés', default: true },
      { key: 'allowDiagonal', type: 'checkbox', label: 'Permitir diagonales', default: true },
      { key: 'timeLimit', type: 'number', label: 'Tiempo límite (seg, 0 = sin límite)', default: 0, min: 0 },
    ],
  },
};

export const EDITOR_TYPES = Object.keys(SCHEMAS);

// ---- Utilidades de listas ---------------------------------------------------

/** "a, b\nc" → ['a','b','c'] (sin vacíos). */
export function splitList(str) {
  return String(str ?? '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

/** "6, 7, 8" → [6,7,8] (solo números válidos). */
export function parseNumberList(str) {
  return splitList(str).map(Number).filter((n) => Number.isFinite(n));
}

// ---- valores del formulario  →  config -------------------------------------

function isEmpty(v) {
  return v == null || v === '' || v === 0 || (Array.isArray(v) && v.length === 0);
}

/** Convierte el valor crudo de un campo al valor que va en el config. */
export function parseField(field, raw) {
  switch (field.type) {
    case 'number': return Number(raw) || 0;
    case 'checkbox': return !!raw;
    case 'multicheck': return Array.isArray(raw) ? raw.slice() : [];
    case 'numlist': return parseNumberList(raw);
    case 'textlist': return splitList(raw);
    case 'rows': {
      const rows = Array.isArray(raw) ? raw : [];
      return rows
        .map((row) => {
          const obj = {};
          for (const c of field.columns) {
            obj[c.key] = c.parse === 'list' ? splitList(row[c.key]) : String(row[c.key] ?? '').trim();
          }
          return obj;
        })
        // descarta filas totalmente vacías
        .filter((obj) => field.columns.some((c) => {
          const v = obj[c.key];
          return Array.isArray(v) ? v.length : v;
        }));
    }
    default: return String(raw ?? '').trim();
  }
}

/** Arma el `config` de un tipo a partir de los valores del formulario. */
export function buildConfig(type, values) {
  const schema = SCHEMAS[type];
  if (!schema) throw new Error(`Tipo desconocido: ${type}`);
  const config = {};
  for (const f of schema.fields) {
    const v = parseField(f, values[f.key]);
    if (f.omitIfFalsy && isEmpty(v)) continue;
    config[f.key] = v;
  }
  return config;
}

/** Arma el `.game.json` completo (lo que consume loadGame y firma edu-mesh). */
export function buildDef(type, meta, values) {
  const def = {
    format: 'edumesh-game',
    version: 1,
    type,
    title: (meta.title || '').trim() || 'Juego educativo',
    locale: meta.locale || 'es-MX',
  };
  const seed = Number(meta.seed) || 0;
  if (seed) def.seed = seed;
  def.config = buildConfig(type, values);
  const m = {};
  for (const k of ['subject', 'grade', 'author']) {
    if (meta[k] && String(meta[k]).trim()) m[k] = String(meta[k]).trim();
  }
  if (Object.keys(m).length) def.meta = m;
  return def;
}

// ---- config  →  valores del formulario (para importar/editar) --------------

/** Valor crudo para el input a partir del valor del config (o el default). */
export function serializeField(field, value) {
  const has = value !== undefined && value !== null;
  switch (field.type) {
    case 'number': return has ? value : (field.default ?? 0);
    case 'checkbox': return has ? !!value : !!(field.default ?? false);
    case 'multicheck': return Array.isArray(value) ? value.slice() : (field.default || []);
    case 'numlist': return (Array.isArray(value) ? value : []).join(', ');
    case 'textlist': return (Array.isArray(value) ? value : []).join('\n');
    case 'rows': {
      const arr = Array.isArray(value) ? value : (field.default || []);
      return arr.map((obj) => {
        const row = {};
        for (const c of field.columns) {
          const cv = obj?.[c.key];
          row[c.key] = c.parse === 'list'
            ? (Array.isArray(cv) ? cv.join(', ') : (cv || ''))
            : (cv ?? '');
        }
        return row;
      });
    }
    default: return has ? value : (field.default ?? '');
  }
}

/** Valores iniciales (en blanco) de un tipo, listos para el formulario. */
export function blankValues(type) {
  const schema = SCHEMAS[type];
  const values = {};
  for (const f of schema.fields) values[f.key] = serializeField(f, undefined);
  return values;
}

/** Descompone un `.game.json` en { type, meta, values } para poblar el editor. */
export function valuesFromDef(def) {
  const type = def.type;
  const schema = SCHEMAS[type];
  if (!schema) throw new Error(`Tipo no editable: ${type}`);
  const meta = {
    title: def.title || '',
    locale: def.locale || 'es-MX',
    seed: def.seed || 0,
    subject: def.meta?.subject || '',
    grade: def.meta?.grade || '',
    author: def.meta?.author || '',
  };
  const cfg = def.config || {};
  const values = {};
  for (const f of schema.fields) values[f.key] = serializeField(f, cfg[f.key]);
  return { type, meta, values };
}

// ---- Validación amigable ----------------------------------------------------

/** Devuelve una lista de problemas (vacía si el juego está listo). */
export function validateConfig(type, config) {
  const errs = [];
  if (type === 'memory') {
    const pairs = (config.pairs || []).filter((p) => (p.a || '').trim());
    if (pairs.length < 2) errs.push('Agrega al menos 2 pares con la cara A.');
  } else if (type === 'wordsearch') {
    const words = config.words || [];
    if (!words.length) errs.push('Agrega al menos una palabra.');
    const size = config.size || 12;
    const tooLong = words.find((w) => gridLetters(w).length > size);
    if (tooLong) errs.push(`"${tooLong}" no cabe en una cuadrícula de ${size}.`);
  } else if (type === 'fill') {
    const items = (config.items || []).filter((it) => (it.text || '').trim());
    if (!items.length) errs.push('Agrega al menos una frase.');
    else if (!items.some((it) => /\{[^}]+\}/.test(it.text))) errs.push('Marca el hueco con {llaves} en al menos una frase.');
  } else if (type === 'math') {
    if (!(config.tables || []).length && !(config.ops || []).length) errs.push('Elige al menos una operación o una tabla.');
    if ((config.count || 0) < 1) errs.push('La cantidad de problemas debe ser ≥ 1.');
  }
  return errs;
}

/** Nombre de archivo sugerido para descargar el juego. */
export function fileNameFor(def) {
  const base = String(def.title || 'juego').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'juego';
  return `${base}.game.json`;
}
