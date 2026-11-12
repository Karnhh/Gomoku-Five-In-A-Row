// Where rooms live. On Vercel the Express app is a serverless function that
// keeps nothing between requests, so rooms must be in MongoDB. Without
// MONGODB_URI (local development, tests) an in-memory map is used instead.

import { MongoClient } from 'mongodb';
import type { Collection } from 'mongodb';
import type { Player } from '@gomoku/shared/rules';
import type { Room } from './game.ts';

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
}

export class MemoryStore implements RoomStore {
  private rooms = new Map<string, Room>();

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
}

export class MongoStore implements RoomStore {
  private col: Promise<Collection<Room>>;

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
}

export function defaultStore(): RoomStore {
  const uri = process.env.MONGODB_URI;
  return uri ? new MongoStore(uri) : new MemoryStore();
}
