// Calls to the room API. The server URL is baked in at build time from
// VITE_API_URL; in development it falls back to the local Express server.
import type { AdviceInfo, CreateRoomReply, First, JoinRoomReply, RoomView } from '@gomoku/shared/room';

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  /** on a rejected action the server sends the current room back */
  room?: RoomView;
  constructor(status: number, message: string, room?: RoomView) {
    super(message);
    this.status = status;
    this.room = room;
  }
}

async function call<T>(method: string, path: string, token?: string | null, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.room);
  return data as T;
}

// The token is this browser's proof of which seat it holds. No login needed.
const key = (code: string) => `gomoku-room-${code.toUpperCase()}`;
export function loadToken(code: string): string | null {
  try { return localStorage.getItem(key(code)); } catch { return null; }
}
export function saveToken(code: string, token: string): void {
  try { localStorage.setItem(key(code), token); } catch { /* storage unavailable */ }
}

/** when storage is unavailable the key still has to stay the same for the whole visit */
const sessionKeys = new Map<string, string>();

/**
 * This browser's seat key for a room: the stored one, or a new random one that
 * is saved before the first request. Sending the same key on every attempt makes
 * joining repeatable: a second request gets the same seat instead of "room full".
 */
export function seatKey(code: string): string {
  const id = code.toUpperCase();
  const known = loadToken(id) ?? sessionKeys.get(id);
  if (known) return known;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  sessionKeys.set(id, fresh);
  saveToken(id, fresh);
  return fresh;
}

export const createRoom = (first: First, minutes: number) => call<CreateRoomReply>('POST', '/rooms', null, { first, minutes });
export const joinRoom = (code: string, key: string) => call<JoinRoomReply>('POST', `/rooms/${code}/join`, key);
export const getRoom = (code: string, token: string | null) => call<RoomView>('GET', `/rooms/${code}`, token);
export const sendMove = (code: string, token: string, cell: number, advice: AdviceInfo) =>
  call<RoomView>('POST', `/rooms/${code}/move`, token, { cell, advice });
export const sendResign = (code: string, token: string) => call<RoomView>('POST', `/rooms/${code}/resign`, token);
export const sendUndo = (code: string, token: string, action: 'request' | 'accept' | 'decline' | 'cancel') =>
  call<RoomView>('POST', `/rooms/${code}/undo`, token, { action });
export const sendRematch = (code: string, token: string) => call<RoomView>('POST', `/rooms/${code}/rematch`, token);
