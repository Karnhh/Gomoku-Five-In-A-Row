import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { roomsRouter } from './rooms.ts';
import { defaultStore } from './store.ts';
import type { RoomStore } from './store.ts';

export function createApp(store: RoomStore = defaultStore(), clock: () => number = Date.now) {
  const app = express();
  const origins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'];
  if (process.env.CLIENT_ORIGIN) origins.push(...process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()));
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '10kb' }));
  app.get('/api/health', (_req, res) => { res.json({ ok: true, store: process.env.MONGODB_URI ? 'mongodb' : 'memory' }); });
  app.use('/api/rooms', roomsRouter(store, clock));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  });
  return app;
}

export default createApp();
