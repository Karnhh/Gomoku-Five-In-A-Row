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
  game: number;
  version: number;
}

export interface CreateRoomReply { code: string; token: string; color: Player }
export type JoinRoomReply = { token: string; color: Player } | { spectator: true };
