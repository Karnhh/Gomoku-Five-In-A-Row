// What gets logged for later analysis. Two collections:
//   events: one document per thing that happened, in order (every stone placed is one)
//   games:  one summary document per finished game
// Nothing here identifies a person: no IP address, no token, no user agent.

import { CELLS, cellLabel } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';
import type { AdviceInfo } from '@gomoku/shared/room';
import { turnOf } from './game.ts';
import type { Reason, Room } from './game.ts';

export type EventType =
  | 'create' | 'join' | 'move'
  | 'undo_request' | 'undo_accept' | 'undo_decline' | 'undo_cancel'
  | 'pause_request' | 'pause_accept' | 'pause_decline' | 'pause_cancel'
  | 'resign' | 'timeout' | 'rematch_request' | 'rematch_start' | 'finish';

export interface LogEvent {
  type: EventType;
  code: string;
  /** game number inside the room (a rematch starts the next one) */
  game: number;
  at: Date;
  /** colour of the player who acted; null when the server acted (finish) */
  color: Player | null;
  /** number of stones on the board after this event */
  ply?: number;
  cell?: number;
  /** the cell as a board label such as "H8" */
  label?: string;
  /** how long the player thought before this move */
  thinkMs?: number;
  /** ms left for [black, white] after this event */
  clock?: [number, number];
  /** what the player's advisor was showing when they moved (reported by the client) */
  advice?: AdviceInfo;
  /** advice.best as a board label, for reading the log without decoding cell numbers */
  adviceBest?: string | null;
  minutes?: number;
  first?: string;
  /** length of the time-out asked for (pause_* events) */
  seconds?: number;
  winner?: Player | 0;
  reason?: Reason;
}

export interface GameRecord {
  code: string;
  game: number;
  minutes: number;
  moves: number[];
  labels: string[];
  plies: number;
  winner: Player | 0;
  reason: Reason;
  startedAt: Date | null;
  endedAt: Date;
  durationMs: number | null;
}

const int = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;

/** The advice block comes from the browser, so keep only well-formed values. */
export function sanitizeAdvice(raw: unknown): AdviceInfo {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const on = r.on === true;
  if (!on) return { on: false, timeMs: null, rank: null, shown: null, depth: null, best: null, score: null, changes: null, stops: null, done: null };
  return {
    on: true,
    timeMs: int(r.timeMs, 1, 600_000),
    rank: int(r.rank, 1, 50),
    shown: int(r.shown, 0, 50),
    depth: int(r.depth, 0, 99),
    best: int(r.best, 0, CELLS - 1),
    score: typeof r.score === 'number' && Number.isFinite(r.score) ? Math.round(r.score) : null,
    changes: int(r.changes, 0, 999),
    stops: int(r.stops, 0, 999),
    done: typeof r.done === 'boolean' ? r.done : null,
  };
}

const base = (room: Room, type: EventType, color: Player | null, now: number): LogEvent =>
  ({ type, code: room.code, game: room.game, at: new Date(now), color });

export const createEvent = (room: Room, color: Player, first: string, now: number): LogEvent =>
  ({ ...base(room, 'create', color, now), minutes: room.minutes, first });

export const joinEvent = (room: Room, color: Player, now: number): LogEvent => base(room, 'join', color, now);

export function moveEvent(before: Room, after: Room, color: Player, cell: number, advice: AdviceInfo, now: number): LogEvent {
  return {
    ...base(after, 'move', color, now),
    ply: after.moves.length, cell, label: cellLabel(cell),
    thinkMs: before.turnStartedAt === null ? 0 : now - before.turnStartedAt,
    clock: after.clock, advice, adviceBest: advice.best === null ? null : cellLabel(advice.best),
  };
}

export const simpleEvent = (room: Room, type: EventType, color: Player, now: number): LogEvent =>
  ({ ...base(room, type, color, now), ply: room.moves.length });

/** When a game has just ended: the 'finish' event and the game summary. */
export function finishRecords(before: Room, after: Room, now: number): { event: LogEvent; game: GameRecord } | null {
  if (before.status === 'finished' || after.status !== 'finished' || after.winner === null || after.reason === null) return null;
  const started = after.startedAt ?? null;
  return {
    event: { ...base(after, 'finish', null, now), ply: after.moves.length, winner: after.winner, reason: after.reason, clock: after.clock },
    game: {
      code: after.code, game: after.game, minutes: after.minutes,
      moves: after.moves, labels: after.moves.map(cellLabel), plies: after.moves.length,
      winner: after.winner, reason: after.reason,
      startedAt: started === null ? null : new Date(started), endedAt: new Date(now),
      durationMs: started === null ? null : now - started,
    },
  };
}

export const timeoutEvent = (before: Room, now: number): LogEvent => simpleEvent(before, 'timeout', turnOf(before), now);
