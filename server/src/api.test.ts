// End-to-end over real HTTP against the in-memory store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseLabel } from '@gomoku/shared/rules';
import { createApp } from './app.ts';
import { MemoryStore } from './store.ts';

let server: Server;
let base = '';
let now = 1_000_000;

before(async () => {
  const app = createApp(new MemoryStore(), () => now);
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${(server.address() as AddressInfo).port}/api`;
});
after(() => server.close());

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json()) as any };
}
const L = (s: string) => parseLabel(s)!;

test('health', async () => {
  const r = await call('GET', '/health');
  assert.deepEqual(r.body, { ok: true, store: 'memory' });
});

test('a full game between two players, with a spectator watching', async () => {
  const created = await call('POST', '/rooms', undefined, { first: 'me', minutes: 5 });
  assert.equal(created.status, 201);
  const { code, token: host } = created.body;
  assert.match(code, /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(created.body.color, 1);

  assert.equal((await call('GET', `/rooms/${code}`, host)).body.status, 'waiting');
  assert.equal((await call('GET', '/rooms/ZZZZZ')).status, 404);
  // codes are case-insensitive
  assert.equal((await call('GET', `/rooms/${code.toLowerCase()}`)).status, 200);

  const joined = await call('POST', `/rooms/${code}/join`);
  const guest = joined.body.token;
  assert.equal(joined.body.color, 2);
  // refreshing the page re-joins with the same token and keeps the seat
  assert.deepEqual((await call('POST', `/rooms/${code}/join`, guest)).body, { token: guest, color: 2 });
  // a third visitor only watches
  assert.deepEqual((await call('POST', `/rooms/${code}/join`)).body, { spectator: true });

  // the spectator and a stranger with a made-up token cannot move
  assert.equal((await call('POST', `/rooms/${code}/move`, undefined, { cell: L('H8') })).status, 403);
  assert.equal((await call('POST', `/rooms/${code}/move`, 'nope', { cell: L('H8') })).status, 403);
  // white cannot move first
  assert.equal((await call('POST', `/rooms/${code}/move`, guest, { cell: L('H8') })).status, 409);

  const blacks = ['D8', 'E8', 'F8', 'G8'], whites = ['D9', 'E9', 'F9', 'G9'];
  for (let i = 0; i < 4; i++) {
    now += 1000;
    assert.equal((await call('POST', `/rooms/${code}/move`, host, { cell: L(blacks[i]) })).status, 200);
    now += 1000;
    assert.equal((await call('POST', `/rooms/${code}/move`, guest, { cell: L(whites[i]) })).status, 200);
  }
  // taking an occupied point is rejected
  assert.equal((await call('POST', `/rooms/${code}/move`, host, { cell: L('D9') })).status, 400);

  const seen = (await call('GET', `/rooms/${code}`)).body; // spectator view
  assert.equal(seen.you, null);
  assert.equal(seen.moves.length, 8);
  assert.deepEqual(seen.clock, [296_000, 296_000]);
  assert.equal('tokens' in seen, false);

  const won = await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') });
  assert.equal(won.body.status, 'finished');
  assert.equal(won.body.winner, 1);
  assert.equal(won.body.winLine.length, 5);

  // rematch: both ask, colours swap
  assert.equal((await call('POST', `/rooms/${code}/rematch`, guest)).body.rematchBy, 2);
  const again = await call('POST', `/rooms/${code}/rematch`, host);
  assert.equal(again.body.status, 'playing');
  assert.equal(again.body.you, 2);
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.you, 1);
});

test('undo request and answer over HTTP', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') });
  assert.equal((await call('POST', `/rooms/${code}/undo`, host, { action: 'what' })).status, 400);
  assert.equal((await call('POST', `/rooms/${code}/undo`, host, { action: 'request' })).body.undoBy, 1);
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.undoBy, 1);
  const r = await call('POST', `/rooms/${code}/undo`, guest, { action: 'accept' });
  assert.deepEqual(r.body.moves, []);
  assert.equal(r.body.turn, 1);
});

test('the clock is enforced by the server, even if nobody moves', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 3 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  now += 179_000;
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.status, 'playing');
  now += 2000;
  // black tries to move after the flag fell
  const late = await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') });
  assert.equal(late.status, 409);
  const v = (await call('GET', `/rooms/${code}`, guest)).body;
  assert.equal(v.status, 'finished');
  assert.equal(v.winner, 2);
  assert.equal(v.reason, 'time');
  assert.deepEqual(v.moves, []);
});

test('presence: a player who stops polling shows as offline', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  assert.deepEqual((await call('GET', `/rooms/${code}`, host)).body.online, [true, true]);
  now += 10_000;
  assert.deepEqual((await call('GET', `/rooms/${code}`, host)).body.online, [true, false]);
  assert.deepEqual((await call('GET', `/rooms/${code}`, guest)).body.online, [true, true]);
});

test('bad options fall back to defaults', async () => {
  const { code, token } = (await call('POST', '/rooms', undefined, { first: 'banana', minutes: 999 })).body;
  assert.equal((await call('GET', `/rooms/${code}`, token)).body.minutes, 5);
});
