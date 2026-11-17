// Types of the online-room API, shared by the server (which produces them)
// and the client (which renders them).
import type { Player } from './rules.ts';

/** Who moves first, chosen by the player who creates the room. */
export type First = 'me' | 'opponent' | 'random';
export type Status = 'waiting' | 'playing' | 'finished';
export type Reason = 'five' | 'time' | 'resign' | 'draw';

/** What a client may see of a room: everything except the players' tokens. */
export interface RoomView {
  code: string;
  status: Status;
  /** your colour, or null for a spectator */
  you: Player | null;
  /** cells in the order played; black always plays first */
  moves: number[];
  turn: Player;
  /** 0 = draw */
  winner: Player | 0 | null;
  reason: Reason | null;
  winLine: number[] | null;
  /** thinking time per player in minutes; 0 = no clock */
  minutes: number;
  /** ms left for [black, white] at the time of this response */
  clock: [number, number];
  /** colour that asked to take back its last move */
  undoBy: Player | null;
  /** colour that asked for another game */
  rematchBy: Player | null;
  /** did each colour poll recently: [black, white] */
  online: [boolean, boolean];
  /** a time-out that was asked for or is running; null otherwise */
  pause: PauseView | null;
  /** how many spectators are watching right now */
  spectators: number;
  game: number;
  version: number;
}

/**
 * A time-out. One player asks for a number of seconds; the other has a few
 * seconds to answer while play goes on. If they agree, both clocks stop and
 * the board is hidden until the time is up.
 */
export interface PauseView {
  /** colour that asked */
  by: Player;
  /** length of the time-out that was asked for, in seconds */
  seconds: number;
  /** 'asked' = waiting for the opponent's answer; 'on' = the game is paused */
  state: 'asked' | 'on';
  /** ms until the request lapses ('asked') or the game resumes ('on') */
  msLeft: number;
}

export interface CreateRoomReply { code: string; token: string; color: Player }
export type JoinRoomReply = { token: string; color: Player } | { spectator: true };

/**
 * What a player's advisor was showing at the moment they placed a stone.
 * Sent with each move and stored in the log; the server cannot verify it.
 */
export interface AdviceInfo {
  /** was "show next-move advice" switched on */
  on: boolean;
  /** thinking time the player had chosen, in ms */
  timeMs: number | null;
  /** rank of the cell they played among the suggestions (1 = the top suggestion); null if it was not suggested */
  rank: number | null;
  /** how many suggestions were on screen */
  shown: number | null;
  /** search depth the suggestions came from */
  depth: number | null;
  /** the top suggestion */
  best: number | null;
  /** engine score of the top suggestion */
  score: number | null;
  /** how many times the player changed the thinking time before this move */
  changes: number | null;
  /** how many times the player pressed "Stop" before this move */
  stops: number | null;
  /** had the latest search run its full time when the stone was placed */
  done: boolean | null;
}
