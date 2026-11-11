// Promise wrapper around the engine worker.
import type { Board, Player } from '@gomoku/shared/rules';
import type { SearchOptions, SearchResult } from './engine.ts';
import type { EngineReply, EngineRequest } from './worker.ts';

type Job = { resolve: (r: SearchResult) => void; onDepth?: (r: SearchResult) => void };

export class EngineClient {
  private worker: Worker | null = null;
  private jobs = new Map<number, Job>();
  private nextId = 1;

  private ensure(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<EngineReply>) => {
        const job = this.jobs.get(e.data.id);
        if (!job) return;
        if (e.data.done) { this.jobs.delete(e.data.id); job.resolve(e.data.result); }
        else job.onDepth?.(e.data.result);
      };
    }
    return this.worker;
  }

  /** Jobs queue up in the worker and run one after another. */
  run(board: Board, turn: Player, options: Partial<SearchOptions>, onDepth?: (r: SearchResult) => void): Promise<SearchResult> {
    const id = this.nextId++;
    const req: EngineRequest = { id, board: Array.from(board), turn, options };
    return new Promise((resolve) => {
      this.jobs.set(id, { resolve, onDepth });
      this.ensure().postMessage(req);
    });
  }

  /** Drop everything in flight (their promises never settle). */
  cancel(): void {
    this.worker?.terminate();
    this.worker = null;
    this.jobs.clear();
  }
}
