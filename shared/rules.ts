// Rules of five-in-a-row on a 15×15 board (stones sit on line intersections).
// Shared by the client today and by the server once online play is added,
// so the server can re-check every move with exactly the same code.

export const SIZE = 15;
export const CELLS = SIZE * SIZE;
export const WIN_LENGTH = 5;

/** 1 = black (moves first), 2 = white. 0 on the board means empty. */
export type Player = 1 | 2;
export type Board = ArrayLike<number>;

/** The four line directions as [dRow, dCol]: → ↓ ↘ ↙ */
export const DIRS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

export const idx = (r: number, c: number): number => r * SIZE + c;
export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
export const colOf = (cell: number): number => cell % SIZE;
export const inBounds = (r: number, c: number): boolean => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
export const other = (p: Player): Player => (p === 1 ? 2 : 1);
export const CENTER = idx(7, 7);

export function emptyBoard(): number[] {
  return new Array<number>(CELLS).fill(0);
}

export function isValidMove(board: Board, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < CELLS && board[cell] === 0;
}

/**
 * If the stone on `cell` is part of a line of five or more, return that whole
 * line (in order). Six or more in a row also wins: the game ends the moment a
 * line reaches five.
 */
export function winningLine(board: Board, cell: number): number[] | null {
  const p = board[cell];
  if (!p) return null;
  const r = rowOf(cell), c = colOf(cell);
  for (const [dr, dc] of DIRS) {
    const line = [cell];
    for (let k = 1; inBounds(r + dr * k, c + dc * k) && board[idx(r + dr * k, c + dc * k)] === p; k++) {
      line.push(idx(r + dr * k, c + dc * k));
    }
    for (let k = 1; inBounds(r - dr * k, c - dc * k) && board[idx(r - dr * k, c - dc * k)] === p; k++) {
      line.unshift(idx(r - dr * k, c - dc * k));
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

export function checkWin(board: Board, cell: number): boolean {
  return winningLine(board, cell) !== null;
}

/** Scan the whole board (used for positions that were set up rather than played). */
export function findWinner(board: Board): { winner: Player; line: number[] } | null {
  for (let cell = 0; cell < CELLS; cell++) {
    if (!board[cell]) continue;
    const line = winningLine(board, cell);
    if (line) return { winner: board[cell] as Player, line };
  }
  return null;
}

export function isFull(board: Board): boolean {
  for (let i = 0; i < CELLS; i++) if (board[i] === 0) return false;
  return true;
}

/** Replay a move list; black always plays first and the colours alternate. */
export function boardFromMoves(moves: readonly number[]): number[] {
  const board = emptyBoard();
  moves.forEach((cell, i) => { board[cell] = i % 2 === 0 ? 1 : 2; });
  return board;
}

const COLS = 'ABCDEFGHIJKLMNO';

/** "H8" style label: column letter A–O, row number 1–15 counted from the bottom. */
export function cellLabel(cell: number): string {
  return `${COLS[colOf(cell)]}${SIZE - rowOf(cell)}`;
}

export function parseLabel(label: string): number | null {
  const m = /^([A-Oa-o])(\d{1,2})$/.exec(label.trim());
  if (!m) return null;
  const c = COLS.indexOf(m[1].toUpperCase());
  const n = Number(m[2]);
  if (n < 1 || n > SIZE) return null;
  return idx(SIZE - n, c);
}

/** Build a board from space-separated labels, e.g. boardFromLabels('H8 I9', 'G8'). */
export function boardFromLabels(blacks: string, whites: string): number[] {
  const board = emptyBoard();
  const put = (s: string, p: Player) => {
    for (const tok of s.split(/[\s.,]+/)) {
      if (!tok) continue;
      const cell = parseLabel(tok);
      if (cell !== null) board[cell] = p;
    }
  };
  put(blacks, 1);
  put(whites, 2);
  return board;
}
