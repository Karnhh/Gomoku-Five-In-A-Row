// Next-move advice shared by the local game and the online room:
// a hook that runs the engine in its worker, and the panel that controls it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cellLabel } from '@gomoku/shared/rules';
import type { Board, Player } from '@gomoku/shared/rules';
import type { HeatCell } from './Board.tsx';
import { fmtScore } from './SubTreeView.tsx';
import { EngineClient, MAX_DEPTH, THINK_TIMES } from '../engine/client.ts';
import type { SearchResult } from '../engine/engine.ts';
import { useLang } from '../i18n.tsx';

export interface Advice {
  result: SearchResult | null;
  thinking: boolean;
  /** the latest search ran its full time (false while thinking, and after Stop) */
  complete: boolean;
  runId: number;
  heat: HeatCell[] | undefined;
  /** end the current search early and keep its latest answer */
  stop: () => void;
}

/** Searches `board` for `turn` whenever `active` is true; cancels as soon as anything changes. */
export function useAdvice(board: Board, turn: Player, active: boolean, timeMs: number): Advice {
  const engine = useRef<EngineClient | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [thinking, setThinking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    engine.current ??= new EngineClient();
    const eng = engine.current;
    eng.cancel();
    setResult(null);
    setComplete(false);
    if (!active) { setThinking(false); return; }
    setThinking(true);
    setRunId((n) => n + 1);
    let alive = true;
    eng.run(board, turn, { timeMs, maxDepth: MAX_DEPTH }, (r) => { if (alive) setResult(r); })
      .then((r) => { if (alive) { if (r.depth > 0) setResult(r); setThinking(false); setComplete(true); } });
    return () => { alive = false; };
  }, [board, turn, active, timeMs]);
  useEffect(() => () => engine.current?.cancel(), []);

  const heat = useMemo(() => {
    if (!result || !active || result.moves.length === 0) return undefined;
    const scores = result.moves.map((m) => m.score);
    const hi = Math.max(...scores), lo = Math.min(...scores);
    return result.moves.map((m, i) => ({ cell: m.cell, rank: i + 1, t: hi === lo ? 1 : (m.score - lo) / (hi - lo) }));
  }, [result, active]);

  const stop = useCallback(() => { engine.current?.cancel(); setThinking(false); }, []);

  return { result, thinking, complete, runId, heat, stop };
}

interface Props {
  on: boolean;
  onToggle: (on: boolean) => void;
  timeMs: number;
  onTime: (ms: number) => void;
  advice: Advice;
  /** the engine is (or should be) working on the current position */
  active: boolean;
  /** called when the player presses Stop (the panel stops the search itself) */
  onStop?: () => void;
  /** shown instead of a result while advice is on but not active, e.g. "waiting for your turn" */
  idleText?: string;
  note: string;
}

export function HintBox({ on, onToggle, timeMs, onTime, advice, active, onStop, idleText, note }: Props) {
  const { t } = useLang();
  const { result, thinking, runId } = advice;
  return (
    <div className="card hint-box">
      <label className="check">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
        <span>{t('แสดงคำแนะนำตาต่อไป', 'Show next-move advice')}</span>
      </label>
      {on && (
        <>
          <div className="field-inline">
            <span className="field-label">{t('เวลาคิด', 'Time limit')}</span>
            <div className="seg small">
              {THINK_TIMES.map((ms) => (
                <button key={ms} className={timeMs === ms ? 'on' : ''} onClick={() => onTime(ms)}>{ms / 1000}s</button>
              ))}
            </div>
          </div>
          {active && thinking && (
            <div className="thinking">
              <div className="progress" role="progressbar" aria-label={t('กำลังคิด', 'Thinking')}>
                <i key={runId} style={{ animationDuration: `${timeMs}ms` }} />
              </div>
              <span className="muted small">
                {result ? t(`กำลังคิด… ค้นเสร็จแล้วถึงชั้นที่ ${result.depth}`, `Thinking… depth ${result.depth} finished`) : t('กำลังคิด…', 'Thinking…')}
              </span>
              <button className="btn sm" onClick={() => { advice.stop(); onStop?.(); }} disabled={!result}>{t('หยุดคิด', 'Stop')}</button>
            </div>
          )}
          {active && (
            <div className="hint-line">
              {result && result.moves.length > 0
                ? <>{t('แนะนำ', 'Suggested')} <b className="mono">{cellLabel(result.best)}</b> · {t('คะแนน', 'score')} <span className="mono">{fmtScore(result.score)}</span> · {t('ลึก', 'depth')} <span className="mono">{result.depth}</span></>
                : <span className="muted">{t('กำลังคิด…', 'Thinking…')}</span>}
            </div>
          )}
          {!active && idleText && <div className="hint-line muted">{idleText}</div>}
          <p className="muted small">{note}</p>
        </>
      )}
    </div>
  );
}
