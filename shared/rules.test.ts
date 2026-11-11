import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELLS, SIZE, boardFromLabels, boardFromMoves, cellLabel, checkWin, emptyBoard, findWinner,
  idx, isFull, isValidMove, parseLabel, winningLine,
} from './rules.ts';

test('board is 15×15', () => {
  assert.equal(SIZE, 15);
  assert.equal(CELLS, 225);
  assert.equal(emptyBoard().length, 225);
});

test('labels round-trip (H8 is the centre, A1 bottom-left)', () => {
  assert.equal(parseLabel('H8'), idx(7, 7));
  assert.equal(parseLabel('A1'), idx(14, 0));
  assert.equal(parseLabel('O15'), idx(0, 14));
  assert.equal(parseLabel('P1'), null);
  assert.equal(parseLabel('A16'), null);
  for (let c = 0; c < CELLS; c++) assert.equal(parseLabel(cellLabel(c)), c);
});

test('five in a row wins in all four directions', () => {
  const lines = [
    'D8 E8 F8 G8 H8',      // horizontal
    'H4 H5 H6 H7 H8',      // vertical
    'D4 E5 F6 G7 H8',      // diagonal /
    'D12 E11 F10 G9 H8',   // diagonal \
  ];
  for (const l of lines) {
    const b = boardFromLabels(l, '');
    const line = winningLine(b, parseLabel('H8')!);
    assert.ok(line, l);
    assert.equal(line.length, 5);
    // every stone of the line reports the win
    for (const tok of l.split(' ')) assert.ok(checkWin(b, parseLabel(tok)!));
  }
});

test('four in a row is not a win, and an empty point never wins', () => {
  const b = boardFromLabels('E8 F8 G8 H8', '');
  assert.equal(checkWin(b, parseLabel('H8')!), false);
  assert.equal(checkWin(b, parseLabel('I8')!), false);
  assert.equal(findWinner(b), null);
});

test('a broken line does not win', () => {
  const b = boardFromLabels('D8 E8 G8 H8 I8', 'F8');
  assert.equal(findWinner(b), null);
});

test('six in a row also counts (the game ends as soon as five is reached)', () => {
  const b = boardFromLabels('C8 D8 E8 G8 H8 F8', '');
  const line = winningLine(b, parseLabel('F8')!);
  assert.equal(line?.length, 6);
});

test('lines do not wrap around the board edge', () => {
  // M8 N8 O8 then A7 B7 are consecutive indices but not a line
  const b = boardFromLabels('M8 N8 O8 A7 B7', '');
  assert.equal(findWinner(b), null);
  // anti-diagonal across the edge
  const b2 = boardFromLabels('A5 B4 C3 D2 E1', '');
  assert.equal(findWinner(b2)?.winner, 1);
  const b3 = boardFromLabels('O5 A3 B2 C1 N6', '');
  assert.equal(findWinner(b3), null);
});

test('findWinner reports the colour', () => {
  const b = boardFromLabels('A1 B1 C1', 'D4 E5 F6 G7 H8');
  assert.equal(findWinner(b)?.winner, 2);
});

test('isValidMove rejects occupied and out-of-range cells', () => {
  const b = boardFromMoves([idx(7, 7)]);
  assert.equal(isValidMove(b, idx(7, 7)), false);
  assert.equal(isValidMove(b, idx(7, 8)), true);
  assert.equal(isValidMove(b, -1), false);
  assert.equal(isValidMove(b, 225), false);
  assert.equal(isValidMove(b, 1.5), false);
});

test('boardFromMoves alternates black then white', () => {
  const b = boardFromMoves([10, 20, 30]);
  assert.deepEqual([b[10], b[20], b[30]], [1, 2, 1]);
  assert.equal(isFull(b), false);
  assert.equal(isFull(new Array(CELLS).fill(1)), true);
});
