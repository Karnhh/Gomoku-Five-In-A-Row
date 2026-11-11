// Web Worker wrapper: the search runs here so the page never freezes.
import { search } from './engine.ts';
import type { SearchOptions, SearchResult } from './engine.ts';
import type { Player } from '@gomoku/shared/rules';

export interface EngineRequest { id: number; board: number[]; turn: Player; options: Partial<SearchOptions> }
export interface EngineReply { id: number; done: boolean; result: SearchResult }

const ctx = self as unknown as {
  postMessage(msg: EngineReply): void;
  onmessage: ((e: MessageEvent<EngineRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { id, board, turn, options } = e.data;
  const result = search(board, turn, options, (r) => ctx.postMessage({ id, done: false, result: r }));
  ctx.postMessage({ id, done: true, result });
};
