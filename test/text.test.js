import test from 'node:test';
import assert from 'node:assert/strict';
import { answersMatch, normalize, gridLetters } from '../src/engine/text.js';

test('compara ignorando acentos y mayúsculas por defecto', () => {
  assert.ok(answersMatch('Fotosíntesis', 'fotosintesis'));
  assert.ok(answersMatch('  Oxígeno ', 'oxigeno'));
  assert.ok(!answersMatch('casa', 'caza'));
});

test('accentSensitive distingue acentos', () => {
  assert.ok(!answersMatch('si', 'sí', { accentSensitive: true }));
});

test('gridLetters deja MAYÚSCULAS sin acentos ni espacios', () => {
  assert.equal(gridLetters('Águila real'), 'AGUILAREAL');
  assert.equal(normalize('  Hola   Mundo '), 'hola mundo');
});
