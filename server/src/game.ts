// Room state and every rule of an online game, as pure functions:
// (room, who, what, now) -> new room or an error. No database, no HTTP,
// so all of it is unit-tested directly. The server is the only judge:
// whose turn it is, whether a point is free, who won and whose clock ran out.

import { boardFromMoves, isFull, isValidMove, other, winningLine } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';

import type { First, Reason, RoomView, Status } from '@gomoku/shared/room';

export type { First, Reason, RoomView, Status };

export interface Room {
  code: string;
  /** secret token of each colour's player ('' while the seat is empty) */
  tokens: { 1: string; 2: string };
  /** thinking time per player in minutes; 0 = no clock */
  minutes: number;
  /** cells in the order played; black always plays first */
  moves: number[];
  status: Status;
  /** 0 = draw */
  winner: Player | 0 | null;
  reason: Reason | null;
  winLine: number[] | null;
  /** ms left for [black, white] as of turnStartedAt */
  clock: [number, number];
  /** epoch ms when the current game started (second player joined, or rematch) */
  startedAt?: number | null;
  /** epoch ms when the side to move started thinking */
  turnStartedAt: number | null;
  /** colour that asked to take back its last move */
  undoBy: Player | null;
  /** colour that asked for another game */
  rematchBy: Player | null;
  /** last time each colour polled, for the "opponent online" dot */
  seen: { 1: number; 2: number };
  /** counts games played in this room (colours swap on a rematch) */
  game: number;
  /** bumped on every write; used for compare-and-swap */
  version: number;
  /** TTL index: quiet rooms are deleted after 24 h */
  updatedAt: Date;
}

export type Result = { ok: true; room: Room } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): Result => ({ ok: false, status, error });
const done = (room: Room): Result => ({ ok: true, room });

export const turnOf = (room: Room): Player => (room.moves.length % 2 === 0 ? 1 : 2);

export function colorOf(room: Room, token: string | undefined): Player | null {
  if (!token) return null;
  if (room.tokens[1] === token) return 1;
  if (room.tokens[2] === token) return 2;
  return null;
}

export function createRoom(code: string, hostToken: string, first: First, minutes: number, now: number, rnd = Math.random()): Room {
  const hostColor: Player = first === 'me' ? 1 : first === 'opponent' ? 2 : rnd < 0.5 ? 1 : 2;
  const tokens = { 1: '', 2: '' };
  tokens[hostColor] = hostToken;
  const ms = minutes * 60_000;
  return {
    code, tokens, minutes, moves: [], status: 'waiting', winner: null, reason: null, winLine: null,
    clock: [ms, ms], startedAt: null, turnStartedAt: null, undoBy: null, rematchBy: null,
    seen: { 1: 0, 2: 0, [hostColor]: now } as Room['seen'], game: 1, version: 0, updatedAt: new Date(now),
  };
}

/** Take the empty seat. The clock starts the moment the second player arrives. */
export function join(room: Room, token: string, now: number): Result {
  if (room.status !== 'waiting') return fail(409, 'room is full');
  const seat: Player = room.tokens[1] === '' ? 1 : 2;
  const tokens = { ...room.tokens, [seat]: token };
  return done({ ...room, tokens, status: 'playing', startedAt: now, turnStartedAt: now, seen: { ...room.seen, [seat]: now } });
}

/** Time left right now for [black, white]. */
export function remaining(room: Room, now: number): [number, number] {
  const clock: [number, number] = [room.clock[0], room.clock[1]];
  if (room.status === 'playing' && room.minutes > 0 && room.turnStartedAt !== null) {
    const side = turnOf(room) - 1;
    clock[side] = Math.max(0, clock[side] - (now - room.turnStartedAt));
  }
  return clock;
}

/** If the side to move has run out of time, return the finished room; otherwise null. */
export function timeout(room: Room, now: number): Room | null {
  if (room.status !== 'playing' || room.minutes === 0) return null;
  const clock = remaining(room, now);
  const side = turnOf(room);
  if (clock[side - 1] > 0) return null;
  return { ...room, clock, status: 'finished', winner: other(side), reason: 'time', turnStartedAt: null, undoBy: null };
}

export function move(room: Room, color: Player, cell: number, now: number): Result {
  if (room.status !== 'playing') return fail(409, 'game is not in progress');
  if (turnOf(room) !== color) return fail(409, 'not your turn');
  const board = boardFromMoves(room.moves);
  if (!isValidMove(board, cell)) return fail(400, 'invalid move');
  board[cell] = color;
  const moves = [...room.moves, cell];
  const clock = remaining(room, now);
  const line = winningLine(board, cell);
  const base: Room = { ...room, moves, clock, turnStartedAt: now, undoBy: null }; // moving on declines a pending undo
  if (line) return done({ ...base, status: 'finished', winner: color, reason: 'five', winLine: line, turnStartedAt: null });
  if (isFull(board)) return done({ ...base, status: 'finished', winner: 0, reason: 'draw', turnStartedAt: null });
  return done(base);
}

export function resign(room: Room, color: Player, now: number): Result {
  if (room.status !== 'playing') return fail(409, 'game is not in progress');
  return done({ ...room, clock: remaining(room, now), status: 'finished', winner: other(color), reason: 'resign', turnStartedAt: null, undoBy: null });
}

/**
 * Take-back: the player who just moved may ask; the opponent accepts or
 * declines. Accepting rewinds one move. No time is given back.
 */
export function undo(room: Room, color: Player, action: 'request' | 'accept' | 'decline' | 'cancel', now: number): Result {
  if (room.status !== 'playing') return fail(409, 'game is not in progress');
  if (action === 'request') {
    if (room.moves.length === 0 || turnOf(room) === color) return fail(409, 'you can only take back the move you just played');
    if (room.undoBy !== null) return fail(409, 'an undo request is already pending');
    return done({ ...room, undoBy: color });
  }
  if (room.undoBy === null) return fail(409, 'no undo request is pending');
  if (action === 'cancel') {
    if (room.undoBy !== color) return fail(409, 'not your request');
    return done({ ...room, undoBy: null });
  }
  if (room.undoBy === color) return fail(409, 'your opponent has to answer');
  if (action === 'decline') return done({ ...room, undoBy: null });
  return done({ ...room, moves: room.moves.slice(0, -1), clock: remaining(room, now), turnStartedAt: now, undoBy: null });
}

/** Both players have to ask. The second request starts a new game with the colours swapped. */
export function rematch(room: Room, color: Player, now: number): Result {
  if (room.status !== 'finished') return fail(409, 'game is still in progress');
  if (room.rematchBy === null || room.rematchBy === color) return done({ ...room, rematchBy: color });
  const ms = room.minutes * 60_000;
  return done({
    ...room,
    tokens: { 1: room.tokens[2], 2: room.tokens[1] },
    seen: { 1: room.seen[2], 2: room.seen[1] },
    moves: [], status: 'playing', winner: null, reason: null, winLine: null,
    clock: [ms, ms], startedAt: now, turnStartedAt: now, undoBy: null, rematchBy: null, game: room.game + 1,
  });
}

export const ONLINE_WINDOW_MS = 6000;

/** What a client may see: everything except the tokens. */
export function view(room: Room, you: Player | null, now: number): RoomView {
  return {
    code: room.code, status: room.status, you, moves: room.moves, turn: turnOf(room),
    winner: room.winner, reason: room.reason, winLine: room.winLine, minutes: room.minutes,
    clock: remaining(room, now), undoBy: room.undoBy, rematchBy: room.rematchBy,
    online: [
      room.tokens[1] !== '' && now - room.seen[1] < ONLINE_WINDOW_MS,
      room.tokens[2] !== '' && now - room.seen[2] < ONLINE_WINDOW_MS,
    ],
    game: room.game, version: room.version,
  };
}
