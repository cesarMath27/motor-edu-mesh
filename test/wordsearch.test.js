import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGrid, lineCells, sameLine } from '../src/games/wordsearch.js';
import { makeRng } from '../src/engine/rng.js';

test('coloca las palabras y se leen igual en la cuadrícula', () => {
  const words = ['PERRO', 'GATO', 'AGUILA', 'ABEJA'];
  const { grid, placements, size } = generateGrid({ words, size: 12 }, makeRng(1234));
  assert.ok(placements.length >= 1);
  for (const p of placements) {
    const read = p.cells.map((c) => grid[c.r][c.c]).join('');
    assert.equal(read, p.word);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      assert.equal(typeof grid[r][c], 'string');
      assert.equal(grid[r][c].length, 1);
    }
  }
});

test('lineCells solo acepta líneas rectas', () => {
  assert.equal(lineCells({ r: 0, c: 0 }, { r: 0, c: 3 }).length, 4);
  assert.equal(lineCells({ r: 0, c: 0 }, { r: 3, c: 3 }).length, 4);
  assert.equal(lineCells({ r: 0, c: 0 }, { r: 2, c: 3 }), null);
});

test('sameLine reconoce la palabra en ambos sentidos', () => {
  const placed = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }];
  assert.ok(sameLine([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }], placed));
  assert.ok(sameLine([{ r: 0, c: 2 }, { r: 0, c: 1 }, { r: 0, c: 0 }], placed));
  assert.ok(!sameLine([{ r: 0, c: 0 }, { r: 0, c: 1 }], placed));
});

test('es determinista con la misma semilla', () => {
  const a = generateGrid({ words: ['CASA', 'SOL'], size: 8 }, makeRng(9)).grid.map((r) => r.join('')).join('');
  const b = generateGrid({ words: ['CASA', 'SOL'], size: 8 }, makeRng(9)).grid.map((r) => r.join('')).join('');
  assert.equal(a, b);
});
