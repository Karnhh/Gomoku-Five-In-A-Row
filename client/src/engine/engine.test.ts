import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromLabels, emptyBoard, parseLabel, CENTER } from '@gomoku/shared/rules';
import { Position, WINDOW_COUNT, WIN_THRESHOLD, buildTree, evalBreakdown, search } from './engine.ts';

const L = (s: string) => parseLabel(s)!;
const fixed = { timeMs: Infinity };

test('there are 572 windows of five on a 15×15 board', () => {
  assert.equal(WINDOW_COUNT, 572);
});

test('empty board: the only candidate is the centre', () => {
  const r = search(emptyBoard(), 1, { ...fixed, maxDepth: 2 });
  assert.equal(r.best, CENTER);
});

test('make/unmake restores the position', () => {
  const pos = new Position(boardFromLabels('H8 I9', 'G8'), 1);
  const before = pos.evaluate();
  const snapshot = [...pos.counts[0], ...pos.counts[1], ...pos.near];
  for (const m of pos.candidates(8)) { pos.make(m); pos.unmake(m); }
  assert.equal(pos.evaluate(), before);
  assert.deepEqual([...pos.counts[0], ...pos.counts[1], ...pos.near], snapshot);
});

test('takes an immediate win', () => {
  const b = boardFromLabels('E8 F8 G8 H8', 'E9 F9 G9');
  const r = search(b, 1, { ...fixed, maxDepth: 3 });
  assert.ok([L('D8'), L('I8')].includes(r.best));
  assert.ok(r.score >= WIN_THRESHOLD);
});

test('blocks a four', () => {
  const b = boardFromLabels('E8 F8 G8 H8', 'D8 F9 G9');
  const r = search(b, 2, { ...fixed, maxDepth: 3 });
  assert.equal(r.best, L('I8'));
});

test('blocks an open three before it becomes an open four', () => {
  const b = boardFromLabels('F8 G8 H8', 'F9 H10');
  const r = search(b, 2, { ...fixed, maxDepth: 4 });
  assert.ok([L('E8'), L('I8'), L('D8'), L('J8')].includes(r.best), `played ${r.best}`);
});

test('finds the 4-3 fork', () => {
  // I8 makes a four on row 8 and an open three on column I
  const b = boardFromLabels('F8 G8 H8 I9 I10', 'E8 F10 G11 J12');
  const r = search(b, 1, { ...fixed, maxDepth: 5 });
  assert.equal(r.best, L('I8'));
  assert.ok(r.score >= WIN_THRESHOLD);
});

test('α–β returns the same value as plain minimax with fewer nodes', () => {
  const b = boardFromLabels('H8 I9 G9 H10', 'H9 G8 J10 I8');
  const base = { ...fixed, minDepth: 4, maxDepth: 4, width: 6, rootWidth: 6, exactRoot: false };
  const mm = search(b, 1, { ...base, alphaBeta: false });
  const worst = search(b, 1, { ...base, order: 'worst' });
  const ab = search(b, 1, { ...base, order: 'best' });
  assert.equal(ab.score, mm.score);
  assert.equal(worst.score, mm.score);
  assert.ok(ab.nodes < mm.nodes);
  assert.ok(ab.nodes <= worst.nodes, `${ab.nodes} vs ${worst.nodes}`);
  assert.equal(mm.cutoffs, 0);
});

test('the time limit stops the search and keeps the last full iteration', () => {
  const b = boardFromLabels('H8 I9 G9 H10', 'H9 G8 J10 I8');
  const r = search(b, 1, { timeMs: 60, maxDepth: 30 });
  assert.ok(r.depth >= 1);
  assert.ok(r.timeMs < 1500);
  assert.equal(r.iterations.length, r.depth);
});

test('sub-tree: root value matches a depth-2 search and pruned leaves are flagged', () => {
  const b = boardFromLabels('H8 I9 G9 H10', 'H9 G8 J10 I8');
  const t = buildTree(b, 1, 5, 2);
  const r = search(b, 1, { ...fixed, minDepth: 2, maxDepth: 2, width: 5, rootWidth: 5 });
  assert.equal(t.root.value, r.score);
  assert.equal(t.root.children.length, 5);
  assert.equal(t.evaluated + t.pruned, t.leaves);
  const flagged = t.root.children.flatMap((c) => c.children).filter((c) => c.pruned).length;
  assert.equal(flagged, t.pruned);
  assert.ok(t.root.children.some((c) => c.best));
});

test('eval features count open windows', () => {
  // one lone stone in the centre sits in 20 windows
  const e = evalBreakdown(boardFromLabels('H8', ''), 2);
  assert.equal(e.black[1], 20);
  assert.equal(e.score, -20);
  assert.equal(e.candidates.length, 24);
});
