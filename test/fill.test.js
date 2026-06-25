import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplate, blanksOf } from '../src/games/fill.js';

test('parseTemplate separa texto y huecos', () => {
  const segs = parseTemplate('El {sol} sale por el {este}.');
  assert.equal(segs.filter((s) => s.type === 'blank').length, 2);
  assert.equal(segs[0].value, 'El ');
  assert.equal(segs[1].answer, 'sol');
});

test('blanksOf devuelve las respuestas en orden', () => {
  assert.deepEqual(blanksOf('A {x} y {y} z'), ['x', 'y']);
});

test('sin huecos → un solo segmento de texto', () => {
  const segs = parseTemplate('hola mundo');
  assert.equal(segs.length, 1);
  assert.equal(segs[0].type, 'text');
});
