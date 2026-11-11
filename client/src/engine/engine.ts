// Depth-limited α–β search with a pattern-counting evaluation function.
// Pure TypeScript with no DOM access, so it runs in a Web Worker and in node tests.
//
// Everything is built on "windows": every run of 5 consecutive points on the
// board (572 of them). A window that holds k stones of one colour and none of
// the other is a line that colour can still complete, so counting those windows
// by k gives the features of the evaluation function.

import { CELLS, CENTER, DIRS, SIZE, idx, inBounds } from '@gomoku/shared/rules';
import type { Board, Player } from '@gomoku/shared/rules';

export const WIN = 1_000_000;
/** Scores at or beyond this mean a forced win was found inside the search depth. */
export const WIN_THRESHOLD = WIN - 1000;
const INF = WIN * 10;

/** Eval weights w[k] for a window with k own stones and no enemy stones. */
export const EVAL_WEIGHTS: readonly number[] = [0, 1, 12, 120, 1500];
/** Side to move already has four in an open window: it completes five next move. */
export const FOUR_TO_MOVE = 50_000;
/** Opponent has fours that need two different blocking points: cannot stop both. */
export const DOUBLE_FOUR_AGAINST = -40_000;

// Quick per-move score used for move ordering and for limiting candidates.
const ATTACK = [1, 4, 30, 300, 200_000];
const DEFEND = [1, 3, 20, 220, 40_000];

// ---------- precomputed geometry ----------

const WINDOW_CELLS: number[] = [];
const CELL_WINDOWS: number[][] = Array.from({ length: CELLS }, () => []);
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) {
    for (const [dr, dc] of DIRS) {
      if (!inBounds(r + dr * 4, c + dc * 4)) continue;
      const w = WINDOW_CELLS.length / 5;
      for (let k = 0; k < 5; k++) {
        const cell = idx(r + dr * k, c + dc * k);
        WINDOW_CELLS.push(cell);
        CELL_WINDOWS[cell].push(w);
      }
    }
  }
}
export const WINDOW_COUNT = WINDOW_CELLS.length / 5;

/** Points within 2 steps (a 5×5 square) of each cell. */
const NEAR: number[][] = Array.from({ length: CELLS }, (_, cell) => {
  const r = Math.floor(cell / SIZE), c = cell % SIZE, out: number[] = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if ((dr || dc) && inBounds(r + dr, c + dc)) out.push(idx(r + dr, c + dc));
    }
  }
  return out;
});

export type MoveOrder = 'best' | 'index' | 'worst';

// ---------- position with incremental window counts ----------

export class Position {
  board: Int8Array;
  /** counts[p-1][w] = stones of player p inside window w */
  counts: [Int8Array, Int8Array];
  /** near[cell] = how many stones lie within 2 steps of cell */
  near: Int16Array;
  side: Player;
  stones: number;

  constructor(board: Board, side: Player) {
    this.board = new Int8Array(CELLS);
    this.counts = [new Int8Array(WINDOW_COUNT), new Int8Array(WINDOW_COUNT)];
    this.near = new Int16Array(CELLS);
    this.side = side;
    this.stones = 0;
    for (let cell = 0; cell < CELLS; cell++) {
      const p = board[cell];
      if (p === 1 || p === 2) this.put(cell, p);
    }
  }

  private put(cell: number, p: Player): void {
    this.board[cell] = p;
    const cnt = this.counts[p - 1];
    for (const w of CELL_WINDOWS[cell]) cnt[w]++;
    for (const n of NEAR[cell]) this.near[n]++;
    this.stones++;
  }

  make(cell: number): void {
    this.put(cell, this.side);
    this.side = this.side === 1 ? 2 : 1;
  }

  unmake(cell: number): void {
    this.side = this.side === 1 ? 2 : 1;
    const cnt = this.counts[this.side - 1];
    this.board[cell] = 0;
    for (const w of CELL_WINDOWS[cell]) cnt[w]--;
    for (const n of NEAR[cell]) this.near[n]--;
    this.stones--;
  }

  /** Did player p just complete five through `cell`? */
  isWinAt(cell: number, p: Player): boolean {
    const cnt = this.counts[p - 1];
    for (const w of CELL_WINDOWS[cell]) if (cnt[w] === 5) return true;
    return false;
  }

  /** f[k] = number of windows holding exactly k stones of p and no enemy stone. */
  features(p: Player): number[] {
    const me = this.counts[p - 1], op = this.counts[2 - p];
    const f = [0, 0, 0, 0, 0, 0];
    for (let w = 0; w < WINDOW_COUNT; w++) if (op[w] === 0 && me[w] > 0) f[me[w]]++;
    return f;
  }

  /** Static evaluation from the point of view of the side to move. */
  evaluate(): number {
    const me = this.counts[this.side - 1], op = this.counts[2 - this.side];
    let score = 0;
    let block = -1;
    let doubleFour = false;
    for (let w = 0; w < WINDOW_COUNT; w++) {
      const a = me[w], b = op[w];
      if (b === 0) {
        if (a === 4) return FOUR_TO_MOVE;
        score += EVAL_WEIGHTS[a];
      } else if (a === 0) {
        score -= EVAL_WEIGHTS[b];
        if (b === 4) {
          let e = -1;
          for (let k = 0; k < 5; k++) if (this.board[WINDOW_CELLS[w * 5 + k]] === 0) e = WINDOW_CELLS[w * 5 + k];
          if (block === -1) block = e;
          else if (block !== e) doubleFour = true;
        }
      }
    }
    return doubleFour ? DOUBLE_FOUR_AGAINST : score;
  }

  /** Cheap score of playing `cell` for the side to move: build own lines + break enemy lines. */
  quick(cell: number): number {
    const me = this.counts[this.side - 1], op = this.counts[2 - this.side];
    let s = 0;
    for (const w of CELL_WINDOWS[cell]) {
      const a = me[w], b = op[w];
      if (b === 0) s += ATTACK[a];
      if (a === 0) s += DEFEND[b];
    }
    return s;
  }

  /** All empty points within 2 steps of a stone (the centre on an empty board). */
  nearbyEmpty(): number[] {
    if (this.stones === 0) return [CENTER];
    const out: number[] = [];
    for (let cell = 0; cell < CELLS; cell++) if (this.board[cell] === 0 && this.near[cell] > 0) out.push(cell);
    return out;
  }

  /**
   * Candidate moves: the `width` most promising nearby points.
   * `order` decides the order they are searched in (the set is the same).
   */
  candidates(width: number, order: MoveOrder = 'best'): number[] {
    const cells = this.nearbyEmpty();
    const scored = cells.map((cell) => ({ cell, s: this.quick(cell) }));
    scored.sort((x, y) => y.s - x.s || x.cell - y.cell);
    const top = scored.slice(0, width);
    if (order === 'index') top.sort((x, y) => x.cell - y.cell);
    else if (order === 'worst') top.reverse();
    return top.map((x) => x.cell);
  }
}

// ---------- search ----------

export interface SearchOptions {
  /** deepest iteration to run */
  maxDepth: number;
  /** stop starting new work after this many ms (Infinity = no limit) */
  timeMs: number;
  /** candidate moves per node below the root */
  width: number;
  /** candidate moves at the root (these get scores for the heatmap) */
  rootWidth: number;
  alphaBeta: boolean;
  order: MoveOrder;
  /** true: every root move gets an exact score (heatmap). false: root moves are pruned too. */
  exactRoot: boolean;
  /** start at this depth instead of 1 (used by the fixed-depth experiments) */
  minDepth: number;
}

export const DEFAULT_OPTIONS: SearchOptions = {
  maxDepth: 8, timeMs: 1000, width: 10, rootWidth: 14, alphaBeta: true, order: 'best', exactRoot: true, minDepth: 1,
};

export interface RootMove { cell: number; score: number; pv: number[] }

export interface SearchResult {
  /** deepest fully finished iteration (0 = nothing finished) */
  depth: number;
  best: number;
  /** score of the best move for the side to move */
  score: number;
  /** root moves, best first */
  moves: RootMove[];
  nodes: number;
  cutoffs: number;
  timeMs: number;
  /** per-iteration totals, for the iterative-deepening table */
  iterations: { depth: number; nodes: number; cutoffs: number; timeMs: number; best: number; score: number }[];
}

const ABORT = Symbol('abort');

export function search(
  board: Board,
  turn: Player,
  options: Partial<SearchOptions> = {},
  onDepth?: (r: SearchResult) => void,
): SearchResult {
  const o: SearchOptions = { ...DEFAULT_OPTIONS, ...options };
  const pos = new Position(board, turn);
  const start = performance.now();
  const deadline = start + o.timeMs;
  let nodes = 0, cutoffs = 0;
  const pv: number[][] = Array.from({ length: o.maxDepth + 3 }, () => []);

  function negamax(depth: number, alpha: number, beta: number, ply: number): number {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) throw ABORT;
    pv[ply] = [];
    if (depth === 0) return pos.evaluate();
    const moves = pos.candidates(o.width, o.order);
    if (moves.length === 0) return 0; // board full: draw
    const me = pos.side;
    let best = -INF;
    for (const m of moves) {
      pos.make(m);
      let v: number;
      if (pos.isWinAt(m, me)) { v = WIN - (ply + 1); pv[ply + 1] = []; }
      else v = -negamax(depth - 1, -beta, -alpha, ply + 1);
      pos.unmake(m);
      if (v > best) { best = v; pv[ply] = [m, ...pv[ply + 1]]; }
      if (o.alphaBeta) {
        if (best > alpha) alpha = best;
        if (alpha >= beta) { cutoffs++; break; }
      }
    }
    return best;
  }

  const result: SearchResult = { depth: 0, best: -1, score: 0, moves: [], nodes: 0, cutoffs: 0, timeMs: 0, iterations: [] };
  let rootOrder = pos.candidates(o.rootWidth, o.order);
  if (rootOrder.length === 0) return result;

  try {
    for (let depth = Math.max(1, o.minDepth); depth <= o.maxDepth; depth++) {
      const moves: RootMove[] = [];
      let alpha = -INF;
      for (const m of rootOrder) {
        pos.make(m);
        let v: number;
        if (pos.isWinAt(m, turn)) { v = WIN - 1; pv[1] = []; }
        else v = -negamax(depth - 1, -INF, o.alphaBeta && !o.exactRoot ? -alpha : INF, 1);
        pos.unmake(m);
        moves.push({ cell: m, score: v, pv: [m, ...pv[1]] });
        if (v > alpha) alpha = v;
      }
      moves.sort((x, y) => y.score - x.score); // stable: ties keep the previous order
      if (o.order === 'best') rootOrder = moves.map((x) => x.cell);
      result.depth = depth;
      result.moves = moves;
      result.best = moves[0].cell;
      result.score = moves[0].score;
      result.nodes = nodes;
      result.cutoffs = cutoffs;
      result.timeMs = performance.now() - start;
      result.iterations.push({ depth, nodes, cutoffs, timeMs: result.timeMs, best: result.best, score: result.score });
      onDepth?.({ ...result, iterations: [...result.iterations] });
      // a forced result needs no deeper look; neither does a single legal move
      if (Math.abs(result.score) >= WIN_THRESHOLD || performance.now() > deadline) break;
    }
  } catch (e) {
    if (e !== ABORT) throw e;
    // the unfinished iteration is discarded: the last complete one stands
  }
  result.timeMs = performance.now() - start;
  return result;
}

// ---------- small explicit tree (for the sub-tree view) ----------

export interface TreeNode {
  /** move that leads to this node (-1 for the root) */
  move: number;
  ply: number;
  /** value from the root player's point of view; null if the node was pruned */
  value: number | null;
  pruned: boolean;
  /** this move completes five */
  win: boolean;
  /** on the principal variation */
  best: boolean;
  children: TreeNode[];
}

export interface SubTree { root: TreeNode; evaluated: number; pruned: number; leaves: number }

/**
 * Build the top of the game tree from a position: `depth` plies, `width` moves
 * per node, searched with α–β. Leaves get Eval; moves that α–β never looked at
 * are kept in the tree and flagged as pruned so the view can show them.
 */
export function buildTree(board: Board, turn: Player, width: number, depth = 2): SubTree {
  const pos = new Position(board, turn);
  let evaluated = 0, pruned = 0, leaves = 0;

  function rec(move: number, d: number, alpha: number, beta: number, ply: number): TreeNode {
    const node: TreeNode = { move, ply, value: null, pruned: false, win: false, best: false, children: [] };
    if (d === 0) {
      const v = pos.evaluate();
      node.value = pos.side === turn ? v : -v;
      evaluated++; leaves++;
      return node;
    }
    const maximizing = pos.side === turn;
    const me = pos.side;
    let best = maximizing ? -INF : INF;
    let cut = false;
    for (const m of pos.candidates(width, 'best')) {
      if (cut) {
        node.children.push({ move: m, ply: ply + 1, value: null, pruned: true, win: false, best: false, children: [] });
        pruned++; leaves++;
        continue;
      }
      pos.make(m);
      let child: TreeNode;
      if (pos.isWinAt(m, me)) {
        const v = WIN - (ply + 1);
        child = { move: m, ply: ply + 1, value: maximizing ? v : -v, pruned: false, win: true, best: false, children: [] };
        evaluated++; leaves++;
      } else {
        child = rec(m, d - 1, alpha, beta, ply + 1);
      }
      pos.unmake(m);
      node.children.push(child);
      const v = child.value as number;
      if (maximizing) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) cut = true;
    }
    node.value = node.children.length ? best : 0;
    return node;
  }

  const root = rec(-1, depth, -INF, INF, 0);
  // mark the principal variation
  let n: TreeNode | undefined = root;
  while (n) {
    n.best = true;
    const parent: TreeNode = n;
    n = parent.children.find((ch) => !ch.pruned && ch.value === parent.value);
  }
  return { root, evaluated, pruned, leaves };
}

/** Eval feature counts for both colours, for the explanation widgets. */
export function evalBreakdown(board: Board, turn: Player) {
  const pos = new Position(board, turn);
  return { black: pos.features(1), white: pos.features(2), score: pos.evaluate(), candidates: pos.nearbyEmpty() };
}
