import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, bestColumns } from '../src/games/memory.js';
import { makeRng } from '../src/engine/rng.js';

test('crea dos cartas por par', () => {
  const cfg = { pairs: [{ a: '1', b: 'uno' }, { a: '2', b: 'dos' }, { a: '3', b: 'tres' }] };
  const { cards, pairCount } = buildDeck(cfg, makeRng(5));
  assert.equal(pairCount, 3);
  assert.equal(cards.length, 6);
  const counts = {};
  for (const c of cards) counts[c.pairId] = (counts[c.pairId] || 0) + 1;
  assert.deepEqual(Object.values(counts).sort(), [2, 2, 2]);
});

test('maxPairs recorta el mazo', () => {
  const pairs = Array.from({ length: 10 }, (_, i) => ({ a: String(i), b: 'x' + i }));
  const { pairCount, cards } = buildDeck({ pairs, maxPairs: 4 }, makeRng(1));
  assert.equal(pairCount, 4);
  assert.equal(cards.length, 8);
});

test('es determinista con la misma semilla', () => {
  const cfg = { pairs: [{ a: 'a', b: 'b' }, { a: 'c', b: 'd' }] };
  const x = buildDeck(cfg, makeRng(7)).cards.map((c) => c.label).join(',');
  const y = buildDeck(cfg, makeRng(7)).cards.map((c) => c.label).join(',');
  assert.equal(x, y);
});

test('bestColumns es razonable', () => {
  assert.ok(bestColumns(4) <= 3);
  assert.ok(bestColumns(16) <= 5);
});
