// Where rooms live. On Vercel the Express app is a serverless function that
// keeps nothing between requests, so rooms must be in MongoDB. Without
// MONGODB_URI (local development, tests) an in-memory map is used instead.

import { MongoClient } from 'mongodb';
import type { Collection } from 'mongodb';
import type { Player } from '@gomoku/shared/rules';
import type { Room } from './game.ts';
import type { GameRecord, LogEvent } from './log.ts';

export interface RoomStore {
  /** false if the code is already taken */
  insert(room: Room): Promise<boolean>;
  get(code: string): Promise<Room | null>;
  /**
   * Compare-and-swap: write only if nobody else wrote since we read
   * (the stored version still equals room.version). Returns false on a conflict.
   */
  replace(room: Room): Promise<boolean>;
  /** record that a player polled; does not bump the version */
  touch(code: string, color: Player, now: number): Promise<void>;
  /** record that a spectator polled, and forget the ones in `drop`; does not bump the version */
  watch(code: string, key: string, now: number, drop: string[]): Promise<void>;
  /** append one event to the log */
  log(event: LogEvent): Promise<void>;
  /** store the summary of a finished game (once per room + game number) */
  saveGame(game: GameRecord): Promise<void>;
}

export class MemoryStore implements RoomStore {
  private rooms = new Map<string, Room>();
  /** kept in memory so tests (and local development) can inspect them */
  events: LogEvent[] = [];
  games: GameRecord[] = [];

  async insert(room: Room): Promise<boolean> {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }

  async get(code: string): Promise<Room | null> {
    const room = this.rooms.get(code);
    return room ? structuredClone(room) : null;
  }

  async replace(room: Room): Promise<boolean> {
    const current = this.rooms.get(room.code);
    if (!current || current.version !== room.version) return false;
    this.rooms.set(room.code, structuredClone({ ...room, version: room.version + 1, updatedAt: new Date() }));
    return true;
  }

  async touch(code: string, color: Player, now: number): Promise<void> {
    const room = this.rooms.get(code);
    if (room) room.seen[color] = now;
  }

  async watch(code: string, key: string, now: number, drop: string[]): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) return;
    const watchers = { ...(room.watchers ?? {}), [key]: now };
    for (const k of drop) delete watchers[k];
    room.watchers = watchers;
  }

  async log(event: LogEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }

  async saveGame(game: GameRecord): Promise<void> {
    const i = this.games.findIndex((g) => g.code === game.code && g.game === game.game);
    if (i >= 0) this.games[i] = structuredClone(game);
    else this.games.push(structuredClone(game));
  }
}

export class MongoStore implements RoomStore {
  private col: Promise<Collection<Room>>;
  private events: Promise<Collection<LogEvent>>;
  private games: Promise<Collection<GameRecord>>;

  constructor(uri: string) {
    // one client per process, reused by every request (vital on serverless)
    const g = globalThis as unknown as { _gomokuMongo?: Promise<MongoClient> };
    g._gomokuMongo ??= new MongoClient(uri).connect();
    this.col = g._gomokuMongo.then(async (client) => {
      const col = client.db('gomoku').collection<Room>('rooms');
      await col.createIndex({ code: 1 }, { unique: true });
      await col.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
      return col;
    });
    // logs are kept: no TTL on these two collections
    this.events = g._gomokuMongo.then(async (client) => {
      const col = client.db('gomoku').collection<LogEvent>('events');
      await col.createIndex({ code: 1, game: 1, at: 1 });
      await col.createIndex({ type: 1, at: 1 });
      return col;
    });
    this.games = g._gomokuMongo.then(async (client) => {
      const col = client.db('gomoku').collection<GameRecord>('games');
      await col.createIndex({ code: 1, game: 1 }, { unique: true });
      await col.createIndex({ endedAt: 1 });
      return col;
    });
  }

  async insert(room: Room): Promise<boolean> {
    try {
      await (await this.col).insertOne({ ...room });
      return true;
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return false; // duplicate code
      throw e;
    }
  }

  async get(code: string): Promise<Room | null> {
    return (await this.col).findOne({ code }, { projection: { _id: 0 } }) as Promise<Room | null>;
  }

  async replace(room: Room): Promise<boolean> {
    const next: Room = { ...room, version: room.version + 1, updatedAt: new Date() };
    const r = await (await this.col).replaceOne({ code: room.code, version: room.version }, next);
    return r.matchedCount === 1;
  }

  async touch(code: string, color: Player, now: number): Promise<void> {
    await (await this.col).updateOne({ code }, { $set: { [`seen.${color}`]: now } });
  }

  async watch(code: string, key: string, now: number, drop: string[]): Promise<void> {
    const unset: Record<string, 1> = {};
    for (const k of drop) unset[`watchers.${k}`] = 1;
    await (await this.col).updateOne(
      { code },
      { $set: { [`watchers.${key}`]: now }, ...(drop.length ? { $unset: unset } : {}) },
    );
  }

  async log(event: LogEvent): Promise<void> {
    await (await this.events).insertOne({ ...event });
  }

  async saveGame(game: GameRecord): Promise<void> {
    await (await this.games).replaceOne({ code: game.code, game: game.game }, { ...game }, { upsert: true });
  }
}

export function defaultStore(): RoomStore {
  const uri = process.env.MONGODB_URI;
  return uri ? new MongoStore(uri) : new MemoryStore();
}
