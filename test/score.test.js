import test from 'node:test';
import assert from 'node:assert/strict';
import { Score } from '../src/engine/score.js';

test('acierto instantáneo da el máximo', () => {
  const s = new Score();
  const gain = s.answer(true, { speed: 1 });
  assert.equal(gain, 1000);
  assert.equal(s.points, 1000);
  assert.equal(s.correct, 1);
  assert.equal(s.total, 1);
});

test('acertar al final aún da la mitad (halfFloor)', () => {
  const s = new Score();
  assert.equal(s.answer(true, { speed: 0 }), 500);
});

test('la racha suma bono y un fallo la rompe', () => {
  const s = new Score();
  s.answer(true, { speed: 1 });            // racha 1
  const g2 = s.answer(true, { speed: 1 }); // racha 2 → +50
  assert.equal(g2, 1050);
  assert.equal(s.answer(false), 0);        // rompe la racha y cuenta intento
  assert.equal(s.streak, 0);
  assert.equal(s.total, 3);
  assert.equal(s.correct, 2);
});

test('miss rompe la racha SIN contar intento', () => {
  const s = new Score();
  s.answer(true, { speed: 1 });
  s.miss();
  assert.equal(s.streak, 0);
  assert.equal(s.total, 1);
});
