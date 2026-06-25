import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProblems, checkAnswer, compute } from '../src/games/math.js';
import { makeRng } from '../src/engine/rng.js';

test('genera la cantidad pedida y las sumas cuadran', () => {
  const ps = generateProblems({ count: 12, ops: ['+'], min: 1, max: 9 }, makeRng(3));
  assert.equal(ps.length, 12);
  for (const p of ps) assert.equal(p.a + p.b, p.answer);
});

test('la división siempre es exacta', () => {
  const ps = generateProblems({ count: 50, ops: ['÷'], min: 1, max: 9 }, makeRng(2));
  for (const p of ps) {
    assert.equal(p.op, '÷');
    assert.equal(p.a % p.b, 0);
    assert.equal(p.a / p.b, p.answer);
  }
});

test('la resta no da negativos por defecto', () => {
  const ps = generateProblems({ count: 50, ops: ['-'], min: 1, max: 9 }, makeRng(4));
  for (const p of ps) assert.ok(p.answer >= 0);
});

test('tables produce multiplicaciones de esas tablas', () => {
  const ps = generateProblems({ count: 30, tables: [6, 7], max: 10 }, makeRng(8));
  for (const p of ps) {
    assert.equal(p.op, '×');
    assert.ok([6, 7].includes(p.a));
  }
});

test('checkAnswer compara numéricamente y compute opera', () => {
  const p = { a: 3, op: '+', b: 4, answer: 7, text: '3 + 4' };
  assert.ok(checkAnswer(p, '7'));
  assert.ok(checkAnswer(p, 7));
  assert.ok(!checkAnswer(p, '8'));
  assert.equal(compute(6, '×', 7), 42);
  assert.equal(compute(20, '÷', 4), 5);
});
