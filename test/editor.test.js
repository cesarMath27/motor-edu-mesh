import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitList, parseNumberList, buildConfig, buildDef,
  valuesFromDef, blankValues, validateConfig, fileNameFor,
} from '../src/editor/schema.js';

test('splitList y parseNumberList', () => {
  assert.deepEqual(splitList('a,b\nc , '), ['a', 'b', 'c']);
  assert.deepEqual(parseNumberList('6, 7, x, 8'), [6, 7, 8]);
});

test('buildConfig memory: filas a pares, omite ceros', () => {
  const cfg = buildConfig('memory', {
    pairs: [{ a: 'Jalisco', b: 'Guadalajara' }, { a: 'Sonora', b: 'Hermosillo' }, { a: '', b: '' }],
    columns: 0, maxPairs: 0, timeLimit: 0,
  });
  assert.equal(cfg.pairs.length, 2); // la fila vacía se descarta
  assert.ok(!('columns' in cfg)); // omitIfFalsy
  assert.ok(!('maxPairs' in cfg));
  assert.equal(cfg.timeLimit, 0);  // este sí se conserva
});

test('buildConfig fill: el banco se vuelve lista', () => {
  const cfg = buildConfig('fill', {
    items: [{ text: 'El {sol} sale.', bank: 'sol, luna' }],
    caseSensitive: false, accentSensitive: false, shuffle: true,
  });
  assert.equal(cfg.items[0].text, 'El {sol} sale.');
  assert.deepEqual(cfg.items[0].bank, ['sol', 'luna']);
});

test('buildConfig math: tablas y operaciones', () => {
  const cfg = buildConfig('math', { ops: ['+', '×'], tables: '6, 7', min: 1, max: 10, count: 8, timeLimit: 60, allowNegative: false, parSeconds: 8 });
  assert.deepEqual(cfg.tables, [6, 7]);
  assert.deepEqual(cfg.ops, ['+', '×']);
  assert.equal(cfg.count, 8);
});

test('buildConfig wordsearch: palabras desde texto multilínea', () => {
  const cfg = buildConfig('wordsearch', { words: 'PERRO\nGATO, AGUILA', size: 12, allowReverse: true, allowDiagonal: false, timeLimit: 0 });
  assert.deepEqual(cfg.words, ['PERRO', 'GATO', 'AGUILA']);
  assert.equal(cfg.allowDiagonal, false);
});

test('buildDef: defaults y metadatos', () => {
  const d = buildDef('math', { title: '', seed: 0 }, blankValues('math'));
  assert.equal(d.format, 'edumesh-game');
  assert.equal(d.title, 'Juego educativo');
  assert.equal(d.locale, 'es-MX');
  assert.ok(!('seed' in d));
  assert.ok(!('meta' in d));
});

test('round-trip: def → formulario → def', () => {
  const def = {
    format: 'edumesh-game', version: 1, type: 'memory', title: 'Capitales', locale: 'es-MX', seed: 42,
    config: { pairs: [{ a: 'Jalisco', b: 'Guadalajara' }, { a: 'Sonora', b: 'Hermosillo' }], timeLimit: 0 },
    meta: { subject: 'Geografía' },
  };
  const { type, meta, values } = valuesFromDef(def);
  const rebuilt = buildDef(type, meta, values);
  assert.equal(rebuilt.type, 'memory');
  assert.equal(rebuilt.seed, 42);
  assert.deepEqual(rebuilt.config.pairs, def.config.pairs);
  assert.equal(rebuilt.meta.subject, 'Geografía');
});

test('validateConfig detecta lo que falta', () => {
  assert.ok(validateConfig('memory', { pairs: [{ a: 'x' }] }).length);
  assert.equal(validateConfig('memory', { pairs: [{ a: 'x' }, { a: 'y' }] }).length, 0);
  assert.ok(validateConfig('fill', { items: [{ text: 'sin hueco' }] }).length);
  assert.equal(validateConfig('fill', { items: [{ text: 'a {b}' }] }).length, 0);
  assert.ok(validateConfig('wordsearch', { words: [], size: 10 }).length);
  assert.ok(validateConfig('math', { ops: [], tables: [], count: 5 }).length);
});

test('blankValues y fileNameFor', () => {
  const v = blankValues('memory');
  assert.ok(Array.isArray(v.pairs) && v.pairs.length >= 2);
  assert.equal(fileNameFor({ title: 'Capitales de México' }), 'capitales-de-mexico.game.json');
});
