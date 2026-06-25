import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/engine/rng.js';

test('misma semilla → misma secuencia', () => {
  const a = makeRng(123);
  const b = makeRng(123);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('int respeta el rango inclusivo', () => {
  const r = makeRng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7);
    assert.equal(v, Math.floor(v));
  }
});

test('shuffle conserva los elementos y no muta el original', () => {
  const r = makeRng(9);
  const orig = [1, 2, 3, 4, 5, 6];
  const sh = r.shuffle(orig);
  assert.deepEqual([...sh].sort((a, b) => a - b), orig);
  assert.deepEqual(orig, [1, 2, 3, 4, 5, 6]);
});
