// HTTP routes for rooms. Each handler loads the room, applies one pure
// function from game.ts, and writes the result back with compare-and-swap.

import { randomBytes, randomInt } from 'node:crypto';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Player } from '@gomoku/shared/rules';
import { colorOf, createRoom, join, move, rematch, resign, timeout, undo, view } from './game.ts';
import type { Result, Room } from './game.ts';
import type { RoomStore } from './store.ts';

// no 0/O or 1/I, which are easy to confuse when read aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const newToken = () => randomBytes(16).toString('hex');

const tokenOf = (req: Request): string | undefined => {
  const h = req.header('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
};
const codeOf = (req: Request) => String(req.params.code ?? '').toUpperCase();

/** Rewrite a room whose clock has run out, so every later read sees the result. */
async function settle(store: RoomStore, room: Room, now: number): Promise<Room> {
  const over = timeout(room, now);
  if (!over) return room;
  await store.replace(over); // if someone else wrote first, the reload below picks that up
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
  async function mutate(req: Request, res: Response, fn: (room: Room, color: Player, now: number) => Result) {
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
      // rejoining with a token we already issued (refresh, second tab)
      const mine = colorOf(room, tokenOf(req));
      if (mine) return res.json({ token: tokenOf(req), color: mine });
      const token = newToken();
      const r = join(room, token, now);
      if (!r.ok) return res.json({ spectator: true }); // room is full: watch only
      if (await store.replace(r.room)) return res.json({ token, color: colorOf(r.room, token) });
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
    res.set('Cache-Control', 'no-store');
    return res.json(view(room, color, now));
  }));

  router.post('/:code/move', safe((req, res) => {
    const cell = req.body?.cell;
    return mutate(req, res, (room, color, now) => move(room, color, cell, now));
  }));
  router.post('/:code/resign', safe((req, res) => mutate(req, res, resign)));
  router.post('/:code/undo', safe((req, res) => {
    const action = req.body?.action;
    if (!['request', 'accept', 'decline', 'cancel'].includes(action)) return res.status(400).json({ error: 'bad action' });
    return mutate(req, res, (room, color, now) => undo(room, color, action, now));
  }));
  router.post('/:code/rematch', safe((req, res) => mutate(req, res, rematch)));

  return router;
}
