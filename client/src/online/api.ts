// Calls to the room API. The server URL is baked in at build time from
// VITE_API_URL; in development it falls back to the local Express server.
import type { CreateRoomReply, First, JoinRoomReply, RoomView } from '@gomoku/shared/room';

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

export const createRoom = (first: First, minutes: number) => call<CreateRoomReply>('POST', '/rooms', null, { first, minutes });
export const joinRoom = (code: string, token: string | null) => call<JoinRoomReply>('POST', `/rooms/${code}/join`, token);
export const getRoom = (code: string, token: string | null) => call<RoomView>('GET', `/rooms/${code}`, token);
export const sendMove = (code: string, token: string, cell: number) => call<RoomView>('POST', `/rooms/${code}/move`, token, { cell });
export const sendResign = (code: string, token: string) => call<RoomView>('POST', `/rooms/${code}/resign`, token);
export const sendUndo = (code: string, token: string, action: 'request' | 'accept' | 'decline' | 'cancel') =>
  call<RoomView>('POST', `/rooms/${code}/undo`, token, { action });
export const sendRematch = (code: string, token: string) => call<RoomView>('POST', `/rooms/${code}/rematch`, token);
