import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabel } from '@gomoku/shared/rules';
import { colorOf, createRoom, join, move, rematch, remaining, resign, timeout, undo, view } from './game.ts';
import type { Result, Room } from './game.ts';

const L = (s: string) => parseLabel(s)!;
const ok = (r: Result): Room => { assert.ok(r.ok, r.ok ? '' : r.error); return (r as { room: Room }).room; };
const err = (r: Result) => { assert.equal(r.ok, false); return r as { status: number; error: string }; };

/** A room with both players seated; host is black, clock started at t=1000. */
const started = (minutes = 5) => ok(join(createRoom('ABCDE', 'host', 'me', minutes, 0), 'guest', 1000));

test('the host picks who moves first', () => {
  assert.equal(colorOf(createRoom('A', 'h', 'me', 5, 0), 'h'), 1);
  assert.equal(colorOf(createRoom('A', 'h', 'opponent', 5, 0), 'h'), 2);
  assert.equal(colorOf(createRoom('A', 'h', 'random', 5, 0, 0.1), 'h'), 1);
  assert.equal(colorOf(createRoom('A', 'h', 'random', 5, 0, 0.9), 'h'), 2);
});

test('joining seats the guest in the other colour and starts the game', () => {
  const waiting = createRoom('A', 'h', 'opponent', 5, 0);
  assert.equal(waiting.status, 'waiting');
  const room = ok(join(waiting, 'g', 500));
  assert.equal(room.status, 'playing');
  assert.equal(colorOf(room, 'g'), 1);
  assert.equal(room.turnStartedAt, 500);
  // a third visitor cannot take a seat
  assert.equal(err(join(room, 'x', 600)).status, 409);
  assert.equal(colorOf(room, 'x'), null);
  assert.equal(colorOf(room, ''), null);
});

test('moves are validated by the server', () => {
  let room = started();
  assert.match(err(move(room, 2, L('H8'), 2000)).error, /not your turn/);
  assert.match(err(move(room, 1, 999, 2000)).error, /invalid/);
  assert.match(err(move(room, 1, 1.5, 2000)).error, /invalid/);
  room = ok(move(room, 1, L('H8'), 2000));
  assert.match(err(move(room, 2, L('H8'), 3000)).error, /invalid/); // occupied
  assert.match(err(move(room, 1, L('H9'), 3000)).error, /not your turn/);
  assert.match(err(move(createRoom('A', 'h', 'me', 5, 0), 1, L('H8'), 1)).error, /not in progress/);
});

test('five in a row ends the game', () => {
  let room = started();
  const blacks = ['D8', 'E8', 'F8', 'G8', 'H8'], whites = ['D9', 'E9', 'F9', 'G9'];
  let now = 2000;
  for (let i = 0; i < 5; i++) {
    room = ok(move(room, 1, L(blacks[i]), now += 1000));
    if (i < 4) room = ok(move(room, 2, L(whites[i]), now += 1000));
  }
  assert.equal(room.status, 'finished');
  assert.equal(room.winner, 1);
  assert.equal(room.reason, 'five');
  assert.equal(room.winLine?.length, 5);
  assert.match(err(move(room, 2, L('A1'), now + 1)).error, /not in progress/);
});

test('only the side to move loses time', () => {
  let room = started(5);
  assert.deepEqual(remaining(room, 1000), [300_000, 300_000]);
  assert.deepEqual(remaining(room, 11_000), [290_000, 300_000]);
  room = ok(move(room, 1, L('H8'), 11_000));
  assert.deepEqual(remaining(room, 31_000), [290_000, 280_000]);
  room = ok(move(room, 2, L('H9'), 31_000));
  assert.deepEqual(room.clock, [290_000, 280_000]);
});

test('running out of time loses', () => {
  const room = started(3);
  assert.equal(timeout(room, 1000 + 179_000), null);
  const over = timeout(room, 1000 + 180_000)!;
  assert.equal(over.status, 'finished');
  assert.equal(over.winner, 2);
  assert.equal(over.reason, 'time');
  assert.equal(over.clock[0], 0);
  // no clock: never times out
  assert.equal(timeout(started(0), 1e12), null);
  assert.deepEqual(remaining(started(0), 1e12), [0, 0]);
});

test('resigning gives the game to the opponent', () => {
  const room = ok(resign(started(), 2, 5000));
  assert.equal(room.winner, 1);
  assert.equal(room.reason, 'resign');
  assert.equal(err(resign(room, 1, 6000)).status, 409);
});

test('undo needs the opponent to agree, and rewinds one move', () => {
  let room = started();
  assert.equal(err(undo(room, 1, 'request', 1500)).status, 409); // nothing to take back
  room = ok(move(room, 1, L('H8'), 2000));
  assert.equal(err(undo(room, 2, 'request', 2500)).status, 409); // white has not just moved
  room = ok(undo(room, 1, 'request', 2500));
  assert.equal(room.undoBy, 1);
  assert.equal(err(undo(room, 1, 'accept', 2600)).status, 409);  // cannot accept your own request
  assert.equal(err(undo(room, 1, 'request', 2600)).status, 409); // already pending
  const accepted = ok(undo(room, 2, 'accept', 4000));
  assert.deepEqual(accepted.moves, []);
  assert.equal(accepted.undoBy, null);
  assert.equal(accepted.turnStartedAt, 4000);
  assert.equal(accepted.clock[1], 300_000 - 2000); // white thought for 2 s; no refund
  const declined = ok(undo(room, 2, 'decline', 4000));
  assert.deepEqual(declined.moves, [L('H8')]);
  assert.equal(declined.undoBy, null);
  assert.equal(ok(undo(room, 1, 'cancel', 3000)).undoBy, null);
  // simply playing on declines the request
  assert.equal(ok(move(room, 2, L('H9'), 4000)).undoBy, null);
  assert.equal(err(undo(accepted, 2, 'accept', 5000)).status, 409); // nothing pending
});

test('a rematch needs both players and swaps colours', () => {
  let room = ok(resign(started(), 2, 5000));
  assert.equal(err(rematch(started(), 1, 1)).status, 409); // game still running
  room = ok(rematch(room, 1, 6000));
  assert.equal(room.status, 'finished');
  assert.equal(room.rematchBy, 1);
  room = ok(rematch(room, 1, 6500)); // asking twice changes nothing
  assert.equal(room.status, 'finished');
  room = ok(rematch(room, 2, 7000));
  assert.equal(room.status, 'playing');
  assert.equal(room.game, 2);
  assert.deepEqual(room.moves, []);
  assert.equal(colorOf(room, 'host'), 2);
  assert.equal(colorOf(room, 'guest'), 1);
  assert.deepEqual(remaining(room, 7000), [300_000, 300_000]);
});

test('the view never leaks tokens', () => {
  const room = ok(move(started(), 1, L('H8'), 2000));
  const v = view(room, null, 2500);
  assert.equal(JSON.stringify(v).includes('host'), false);
  assert.equal(JSON.stringify(v).includes('guest'), false);
  assert.equal(v.you, null);
  assert.equal(v.turn, 2);
  assert.deepEqual(v.online, [true, true]);
  assert.deepEqual(view(room, 2, 60_000).online, [false, false]);
});
