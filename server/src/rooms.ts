// HTTP routes for rooms. Each handler loads the room, applies one pure
// function from game.ts, and writes the result back with compare-and-swap.

import { randomBytes, randomInt } from 'node:crypto';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Player } from '@gomoku/shared/rules';
import { colorOf, createRoom, join, move, pause, rematch, resign, timeout, undo, view } from './game.ts';
import type { Result, Room } from './game.ts';
import { createEvent, finishRecords, joinEvent, moveEvent, sanitizeAdvice, simpleEvent, timeoutEvent } from './log.ts';
import type { EventType, GameRecord, LogEvent } from './log.ts';
import type { RoomStore } from './store.ts';

// no 0/O or 1/I, which are easy to confuse when read aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const newToken = () => randomBytes(16).toString('hex');
/** what a browser-chosen seat key must look like: 32 hex characters (128 random bits) */
const CLIENT_KEY = /^[0-9a-f]{32}$/;

const tokenOf = (req: Request): string | undefined => {
  const h = req.header('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
};
const codeOf = (req: Request) => String(req.params.code ?? '').toUpperCase();

/** Write to the log. Logging must never break a game, so failures are only reported. */
async function record(store: RoomStore, events: LogEvent[], game?: GameRecord): Promise<void> {
  try {
    for (const e of events) await store.log(e);
    if (game) await store.saveGame(game);
  } catch (err) {
    console.error('log write failed', err);
  }
}

/** The events for one successful change, plus the finish records if it ended the game. */
async function recordChange(store: RoomStore, before: Room, after: Room, events: LogEvent[], now: number): Promise<void> {
  const fin = finishRecords(before, after, now);
  await record(store, fin ? [...events, fin.event] : events, fin?.game);
}

/** Rewrite a room whose clock has run out, so every later read sees the result. */
async function settle(store: RoomStore, room: Room, now: number): Promise<Room> {
  const over = timeout(room, now);
  if (!over) return room;
  // if someone else wrote first, the reload below picks that up (and they logged it)
  if (await store.replace(over)) await recordChange(store, room, over, [timeoutEvent(room, now)], now);
  return (await store.get(room.code)) ?? over;
}

// Express 4 does not catch rejected promises, so route every handler's errors to next()
type Handler = (req: Request, res: Response) => unknown;
const safe = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve().then(() => fn(req, res)).catch(next);
};

export function roomsRouter(store: RoomStore, clock: () => number = Date.now): Router {
  const router = Router();

  /** Load -> settle clock -> apply fn -> compare-and-swap, retrying once on a conflict. */
  async function mutate(
    req: Request, res: Response,
    fn: (room: Room, color: Player, now: number) => Result,
    describe: (before: Room, after: Room, color: Player, now: number) => LogEvent[],
  ) {
    const code = codeOf(req);
    for (let attempt = 0; attempt < 2; attempt++) {
      const now = clock();
      const loaded = await store.get(code);
      if (!loaded) return res.status(404).json({ error: 'room not found' });
      const room = await settle(store, loaded, now);
      const color = colorOf(room, tokenOf(req));
      if (!color) return res.status(403).json({ error: 'you are not a player in this room' });
      const r = fn(room, color, now);
      if (!r.ok) return res.status(r.status).json({ error: r.error, room: view(room, color, now) });
      if (await store.replace(r.room)) {
        await recordChange(store, room, r.room, describe(room, r.room, color, now), now);
        // colours swap on a rematch, so look the caller up again in the new state
        return res.json(view({ ...r.room, version: r.room.version + 1 }, colorOf(r.room, tokenOf(req)), now));
      }
    }
    return res.status(409).json({ error: 'conflict, try again' });
  }

  router.post('/', safe(async (req, res) => {
    const first = ['me', 'opponent', 'random'].includes(req.body?.first) ? req.body.first : 'random';
    const minutes = [0, 3, 5, 10].includes(req.body?.minutes) ? req.body.minutes : 5;
    const token = newToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      const room = createRoom(newCode(), token, first, minutes, clock());
      if (await store.insert(room)) {
        await record(store, [createEvent(room, colorOf(room, token) as Player, first, clock())]);
        return res.status(201).json({ code: room.code, token, color: colorOf(room, token) });
      }
    }
    return res.status(503).json({ error: 'could not allocate a room code' });
  }));

  router.post('/:code/join', safe(async (req, res) => {
    const code = codeOf(req);
    for (let attempt = 0; attempt < 2; attempt++) {
      const now = clock();
      const room = await store.get(code);
      if (!room) return res.status(404).json({ error: 'room not found' });
      // Rejoining with a key that already holds a seat (refresh, second tab, or a
      // repeated request whose first answer was lost) gives the same seat back.
      const offered = tokenOf(req);
      const mine = colorOf(room, offered);
      if (mine) return res.json({ token: offered, color: mine });
      // The browser picks its own random key before asking, so that a join it has to
      // repeat lands on the seat it already took instead of finding the room full.
      const token = offered && CLIENT_KEY.test(offered) ? offered : newToken();
      const r = join(room, token, now);
      if (!r.ok) return res.json({ spectator: true }); // room is full: watch only
      if (await store.replace(r.room)) {
        const color = colorOf(r.room, token) as Player;
        await record(store, [joinEvent(r.room, color, now)]);
        return res.json({ token, color });
      }
    }
    return res.status(409).json({ error: 'conflict, try again' });
  }));

  router.get('/:code', safe(async (req, res) => {
    const now = clock();
    const loaded = await store.get(codeOf(req));
    if (!loaded) return res.status(404).json({ error: 'room not found' });
    const room = await settle(store, loaded, now);
    const color = colorOf(room, tokenOf(req));
    if (color && now - room.seen[color] > 2000) {
      await store.touch(room.code, color, now);
      room.seen[color] = now;
    }
    // A visitor who holds no seat is a spectator; remember them so players can see they have an audience.
    const key = tokenOf(req);
    if (!color && key && CLIENT_KEY.test(key)) {
      const watchers = room.watchers ?? {};
      if (now - (watchers[key] ?? 0) > 2000) {
        const stale = Object.keys(watchers).filter((k) => k !== key && now - watchers[k] > 60_000);
        await store.watch(room.code, key, now, stale);
        room.watchers = { ...watchers, [key]: now };
        for (const k of stale) delete room.watchers[k];
      }
    }
    res.set('Cache-Control', 'no-store');
    return res.json(view(room, color, now));
  }));

  router.post('/:code/move', safe((req, res) => {
    const cell = req.body?.cell;
    const advice = sanitizeAdvice(req.body?.advice);
    return mutate(req, res,
      (room, color, now) => move(room, color, cell, now),
      (before, after, color, now) => [moveEvent(before, after, color, cell, advice, now)]);
  }));
  router.post('/:code/resign', safe((req, res) => mutate(req, res, resign,
    (_before, after, color, now) => [simpleEvent(after, 'resign', color, now)])));
  router.post('/:code/undo', safe((req, res) => {
    const action = req.body?.action;
    if (!['request', 'accept', 'decline', 'cancel'].includes(action)) return res.status(400).json({ error: 'bad action' });
    return mutate(req, res,
      (room, color, now) => undo(room, color, action, now),
      (before, _after, color, now) => [simpleEvent(before, `undo_${action}` as EventType, color, now)]);
  }));
  router.post('/:code/pause', safe((req, res) => {
    const action = req.body?.action;
    if (!['request', 'accept', 'decline', 'cancel'].includes(action)) return res.status(400).json({ error: 'bad action' });
    const seconds = req.body?.seconds;
    return mutate(req, res,
      (room, color, now) => pause(room, color, action, seconds, now),
      (before, after, color, now) => [{
        ...simpleEvent(after, `pause_${action}` as EventType, color, now),
        seconds: (after.pause ?? before.pause)?.seconds,
      }]);
  }));
  router.post('/:code/rematch', safe((req, res) => mutate(req, res, rematch,
    (before, after, color, now) => (after.status === 'playing'
      ? [simpleEvent(after, 'rematch_start', color, now)]
      : before.rematchBy === after.rematchBy ? [] : [simpleEvent(after, 'rematch_request', color, now)]))));

  return router;
}
