// End-to-end over real HTTP against the in-memory store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseLabel } from '@gomoku/shared/rules';
import { createApp } from './app.ts';
import { MemoryStore } from './store.ts';

let server: Server;
const store = new MemoryStore();
let base = '';
let now = 1_000_000;

before(async () => {
  const app = createApp(store, () => now);
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

test('every stone placed is logged, with what the advisor was showing', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 5 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  const mine = () => store.events.filter((e) => e.code === code);

  // black follows the top suggestion after 3 s of thinking
  now += 3000;
  await call('POST', `/rooms/${code}/move`, host, {
    cell: L('H8'), advice: { on: true, timeMs: 1000, rank: 1, shown: 14, depth: 7, best: L('H8'), score: 296, changes: 0, stops: 0, done: true },
  });
  // white plays with advice off, and sends junk that must not reach the log
  now += 2000;
  await call('POST', `/rooms/${code}/move`, guest, { cell: L('H9'), advice: { on: false, rank: 3, token: 'secret' } });
  // black ignores the suggestions: the cell was not on the list
  now += 1000;
  await call('POST', `/rooms/${code}/move`, host, {
    // changed the time twice, pressed Stop once, and moved before the search finished
    cell: L('A1'), advice: { on: true, timeMs: 10000, rank: null, shown: 14, depth: 9, best: L('G8'), score: -40.6, changes: 2, stops: 1, done: false },
  });
  // no advice field at all (an old client)
  await call('POST', `/rooms/${code}/move`, guest, { cell: L('H10') });
  // a rejected move is not logged
  await call('POST', `/rooms/${code}/move`, guest, { cell: L('H11') });

  const moves = mine().filter((e) => e.type === 'move');
  assert.equal(moves.length, 4);
  assert.deepEqual(moves.map((e) => [e.ply, e.label, e.color]), [[1, 'H8', 1], [2, 'H9', 2], [3, 'A1', 1], [4, 'H10', 2]]);
  assert.deepEqual(moves[0].advice, { on: true, timeMs: 1000, rank: 1, shown: 14, depth: 7, best: L('H8'), score: 296, changes: 0, stops: 0, done: true });
  assert.equal(moves[0].thinkMs, 3000);
  assert.deepEqual(moves[1].advice, { on: false, timeMs: null, rank: null, shown: null, depth: null, best: null, score: null, changes: null, stops: null, done: null });
  assert.equal(moves[1].thinkMs, 2000);
  assert.equal(moves[2].advice?.rank, null);
  assert.equal(moves[2].advice?.timeMs, 10000);
  assert.equal(moves[2].advice?.score, -41);
  assert.deepEqual([moves[2].advice?.changes, moves[2].advice?.stops, moves[2].advice?.done], [2, 1, false]);
  assert.equal(moves[2].adviceBest, 'G8');
  assert.equal(moves[3].advice?.on, false);
  assert.deepEqual(moves[0].clock, [297_000, 300_000]);

  // undo request + accept, then resign: all in the log, in order, and nothing leaks a token
  await call('POST', `/rooms/${code}/undo`, guest, { action: 'request' });
  await call('POST', `/rooms/${code}/undo`, host, { action: 'accept' });
  await call('POST', `/rooms/${code}/resign`, host);
  assert.deepEqual(mine().map((e) => e.type), [
    'create', 'join', 'move', 'move', 'move', 'move', 'undo_request', 'undo_accept', 'resign', 'finish',
  ]);
  const text = JSON.stringify(mine());
  assert.equal(text.includes(host) || text.includes(guest) || text.includes('secret'), false);

  const game = store.games.find((g) => g.code === code)!;
  assert.deepEqual(game.labels, ['H8', 'H9', 'A1']); // the undone H10 is gone from the final record
  assert.equal(game.winner, 2);
  assert.equal(game.reason, 'resign');
  assert.equal(game.game, 1);
  assert.equal(game.durationMs, 6000);

  // a rematch is logged and the second game gets its own record
  await call('POST', `/rooms/${code}/rematch`, host);
  await call('POST', `/rooms/${code}/rematch`, host); // asking twice logs once
  await call('POST', `/rooms/${code}/rematch`, guest);
  assert.deepEqual(mine().slice(-2).map((e) => [e.type, e.game]), [['rematch_request', 1], ['rematch_start', 2]]);
});

test('a game lost on time is logged even though nobody moved', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 3 })).body;
  await call('POST', `/rooms/${code}/join`);
  now += 200_000;
  await call('GET', `/rooms/${code}`, host);
  await call('GET', `/rooms/${code}`, host); // a second poll must not log it twice
  const types = store.events.filter((e) => e.code === code).map((e) => e.type);
  assert.deepEqual(types, ['create', 'join', 'timeout', 'finish']);
  const game = store.games.find((g) => g.code === code)!;
  assert.equal(game.reason, 'time');
  assert.equal(game.winner, 2);
  assert.equal(game.plies, 0);
});

test('joining is repeatable: the same browser key always gets the same seat', async () => {
  const { code } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const key = 'a'.repeat(32);
  // the page asks twice (as React does in development) before either answer arrives
  const [a, b] = await Promise.all([call('POST', `/rooms/${code}/join`, key), call('POST', `/rooms/${code}/join`, key)]);
  assert.deepEqual(a.body, { token: key, color: 2 });
  assert.deepEqual(b.body, { token: key, color: 2 });
  // and again later (a refresh, or a retry after a lost answer)
  assert.deepEqual((await call('POST', `/rooms/${code}/join`, key)).body, { token: key, color: 2 });
  // that key really holds the seat
  assert.equal((await call('GET', `/rooms/${code}`, key)).body.you, 2);
  // a different browser finds the room full
  assert.deepEqual((await call('POST', `/rooms/${code}/join`, 'b'.repeat(32))).body, { spectator: true });
  assert.equal((await call('GET', `/rooms/${code}`, 'b'.repeat(32))).body.you, null);
  // only one join was logged
  assert.equal(store.events.filter((e) => e.code === code && e.type === 'join').length, 1);
});

test('a malformed browser key is replaced by a server-made token', async () => {
  const { code } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const r = (await call('POST', `/rooms/${code}/join`, 'short')).body;
  assert.equal(r.color, 2);
  assert.match(r.token, /^[0-9a-f]{32}$/);
  assert.notEqual(r.token, 'short');
});

test('either player can resign at any time, on their turn or not', async () => {
  for (const who of ['host', 'guest'] as const) {
    const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
    const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
    // black (host) is to move; with one stone down it is white's turn
    if (who === 'guest') await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') });
    const quitter = who === 'host' ? host : guest;
    // a pending undo request must not block resigning
    if (who === 'guest') await call('POST', `/rooms/${code}/undo`, host, { action: 'request' });
    const r = await call('POST', `/rooms/${code}/resign`, quitter);
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'finished');
    assert.equal(r.body.winner, who === 'host' ? 2 : 1);
  }
  // the player who is NOT to move can resign too
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  assert.equal((await call('POST', `/rooms/${code}/resign`, guest)).body.winner, 1);
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.reason, 'resign');
});

test('time-out over HTTP: ask, agree, the board is frozen, then play resumes', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 5 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  now += 4000;
  assert.equal((await call('POST', `/rooms/${code}/pause`, guest, { action: 'nap' })).status, 400);
  assert.equal((await call('POST', `/rooms/${code}/pause`, guest, { action: 'request', seconds: 500 })).status, 400);
  const asked = await call('POST', `/rooms/${code}/pause`, guest, { action: 'request', seconds: 15 });
  assert.deepEqual(asked.body.pause, { by: 2, seconds: 15, state: 'asked', msLeft: 5000 });
  now += 1000;
  // the host sees the request and can still play; here they agree instead
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.pause.state, 'asked');
  const on = await call('POST', `/rooms/${code}/pause`, host, { action: 'accept' });
  assert.deepEqual(on.body.pause, { by: 2, seconds: 15, state: 'on', msLeft: 15_000 });
  assert.deepEqual(on.body.clock, [295_000, 300_000]);
  now += 10_000;
  assert.equal((await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') })).status, 409);
  const mid = (await call('GET', `/rooms/${code}`)).body; // a spectator sees it too
  assert.deepEqual([mid.pause.state, mid.pause.msLeft, mid.clock[0]], ['on', 5000, 295_000]);
  now += 5000;
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.pause, null);
  now += 2000;
  const moved = await call('POST', `/rooms/${code}/move`, host, { cell: L('H8') });
  assert.equal(moved.status, 200);
  assert.deepEqual(moved.body.clock, [293_000, 300_000]); // 5 s before + 2 s after; the 15 s in between cost nothing

  // a request nobody answers just goes away
  await call('POST', `/rooms/${code}/pause`, host, { action: 'request', seconds: 60 });
  now += 5000;
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.pause, null);
  assert.equal((await call('POST', `/rooms/${code}/pause`, guest, { action: 'accept' })).status, 409);
  // and a refusal clears it at once
  await call('POST', `/rooms/${code}/pause`, host, { action: 'request', seconds: 5 });
  assert.equal((await call('POST', `/rooms/${code}/pause`, guest, { action: 'decline' })).body.pause, null);

  const log = store.events.filter((e) => e.code === code && e.type.startsWith('pause_'));
  assert.deepEqual(log.map((e) => [e.type, e.color, e.seconds]), [
    ['pause_request', 2, 15], ['pause_accept', 1, 15], ['pause_request', 1, 60], ['pause_request', 1, 5], ['pause_decline', 2, 5],
  ]);
});

test('players are told how many spectators are watching', async () => {
  const { code, token: host } = (await call('POST', '/rooms', undefined, { first: 'me', minutes: 0 })).body;
  const guest = (await call('POST', `/rooms/${code}/join`)).body.token;
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.spectators, 0);
  const s1 = '1'.repeat(32), s2 = '2'.repeat(32);
  await call('GET', `/rooms/${code}`, s1);
  await call('GET', `/rooms/${code}`, s2);
  await call('GET', `/rooms/${code}`, s2);           // the same spectator polling again is still one
  await call('GET', `/rooms/${code}`);               // no key: not counted
  await call('GET', `/rooms/${code}`, 'not-a-key');  // malformed key: not counted
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.spectators, 2);
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.spectators, 2);
  assert.equal((await call('GET', `/rooms/${code}`, s1)).body.you, null);
  // players are never counted as spectators
  now += 3000;
  await call('GET', `/rooms/${code}`, host);
  assert.equal((await call('GET', `/rooms/${code}`, guest)).body.spectators, 2);
  // one of them leaves: after a few seconds without polling they drop out
  now += 4000;
  await call('GET', `/rooms/${code}`, s1);
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.spectators, 1);
  now += 10_000;
  assert.equal((await call('GET', `/rooms/${code}`, host)).body.spectators, 0);
});
