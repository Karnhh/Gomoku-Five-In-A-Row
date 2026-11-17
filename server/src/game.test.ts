import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabel } from '@gomoku/shared/rules';
import { colorOf, createRoom, join, move, pause, pauseState, rematch, remaining, resign, spectatorCount, timeout, undo, view } from './game.ts';
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

test('time-out: the request must be well-formed and only one can be open', () => {
  const room = started();
  for (const bad of [4, 61, 0, -5, 7.5, NaN]) assert.equal(err(pause(room, 1, 'request', bad, 2000)).status, 400);
  assert.equal(err(pause(createRoom('A', 'h', 'me', 5, 0), 1, 'request', 30, 1)).status, 409); // not started
  const asked = ok(pause(room, 2, 'request', 30, 2000));
  assert.equal(pauseState(asked, 2000), 'asked');
  assert.deepEqual(view(asked, 1, 3000).pause, { by: 2, seconds: 30, state: 'asked', msLeft: 4000 });
  assert.equal(err(pause(asked, 1, 'request', 10, 2500)).status, 409); // one already waiting
  assert.equal(err(pause(asked, 2, 'accept', 0, 2500)).status, 409);   // cannot accept your own
  assert.equal(err(pause(asked, 1, 'cancel', 0, 2500)).status, 409);   // not your request
  assert.equal(ok(pause(asked, 2, 'cancel', 0, 2500)).pause, null);
  assert.equal(ok(pause(asked, 1, 'decline', 0, 2500)).pause, null);
  assert.equal(err(pause(room, 1, 'accept', 0, 2500)).status, 409);    // nothing to answer
});

test('time-out: play goes on while the request waits, and it lapses after 5 seconds', () => {
  let room = ok(pause(started(), 2, 'request', 20, 2000));
  // the clock keeps running and black can still move
  assert.deepEqual(remaining(room, 4000), [297_000, 300_000]);
  room = ok(move(room, 1, L('H8'), 4000));
  assert.equal(pauseState(room, 4000), 'asked');           // the request survives the move
  assert.equal(pauseState(room, 6999), 'asked');
  assert.equal(pauseState(room, 7000), 'none');            // 5 s after it was asked
  assert.equal(view(room, 1, 7000).pause, null);
  assert.equal(err(pause(room, 1, 'accept', 0, 7000)).status, 409);
  // nothing changed: white is still on the clock, and a new request can be made
  assert.deepEqual(remaining(room, 9000), [297_000, 295_000]);
  assert.equal(pauseState(ok(pause(room, 1, 'request', 5, 9000)), 9000), 'asked');
  // a move after the lapse clears the stale request
  assert.equal(ok(move(room, 2, L('H9'), 9000)).pause, null);
});

test('time-out: accepting stops both clocks for exactly the time asked for', () => {
  // black has been thinking since t=1000; white asks at 11 000 and black agrees at 13 000
  let room = ok(pause(started(), 2, 'request', 30, 11_000));
  room = ok(pause(room, 1, 'accept', 0, 13_000));
  assert.equal(pauseState(room, 13_000), 'on');
  assert.deepEqual(view(room, null, 23_000).pause, { by: 2, seconds: 30, state: 'on', msLeft: 20_000 });
  // 12 s were used before the time-out; nothing is lost during it
  assert.deepEqual(remaining(room, 13_000), [288_000, 300_000]);
  assert.deepEqual(remaining(room, 30_000), [288_000, 300_000]);
  assert.deepEqual(remaining(room, 42_999), [288_000, 300_000]);
  assert.equal(timeout(room, 42_999), null);
  // nobody can move, take back or ask again while it is on
  assert.match(err(move(room, 1, L('H8'), 20_000)).error, /paused/);
  assert.match(err(undo(room, 1, 'request', 20_000)).error, /paused/);
  assert.equal(err(pause(room, 1, 'request', 10, 20_000)).status, 409);
  // it ends by itself: the clock runs again from 43 000 and the move is accepted
  assert.equal(pauseState(room, 43_000), 'none');
  assert.deepEqual(remaining(room, 48_000), [283_000, 300_000]);
  room = ok(move(room, 1, L('H8'), 48_000));
  assert.deepEqual(room.clock, [283_000, 300_000]);
  assert.equal(room.pause, null);
});

test('time-out: resigning during it ends the game; a rematch starts clean', () => {
  let room = ok(pause(started(), 1, 'request', 60, 2000));
  room = ok(pause(room, 2, 'accept', 0, 3000));
  room = ok(resign(room, 2, 10_000));
  assert.equal(room.status, 'finished');
  assert.equal(room.pause, null);
  assert.equal(view(room, 1, 10_000).pause, null);
  room = ok(rematch(ok(rematch(room, 1, 11_000)), 2, 12_000));
  assert.equal(pauseState(room, 12_000), 'none');
  assert.deepEqual(remaining(room, 13_000), [299_000, 300_000]);
});

test('spectators are counted only while they keep polling', () => {
  const room = { ...started(), watchers: { a: 10_000, b: 14_000, c: 1 } };
  assert.equal(spectatorCount(room, 15_000), 2);
  assert.equal(spectatorCount(room, 19_000), 1);
  assert.equal(spectatorCount(room, 30_000), 0);
  assert.equal(view(started(), 1, 2000).spectators, 0);
});
