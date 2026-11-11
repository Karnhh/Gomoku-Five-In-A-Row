import { useEffect, useMemo, useRef, useState } from 'react';
import { CELLS, cellLabel, findWinner, other } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';
import Board from './Board.tsx';
import { fmtScore } from './SubTreeView.tsx';
import { EngineClient } from '../engine/client.ts';
import { EVAL_WEIGHTS, evalBreakdown } from '../engine/engine.ts';
import type { SearchOptions, SearchResult } from '../engine/engine.ts';
import { SAMPLE, setupBoard } from '../data/positions.ts';
import { useLang } from '../i18n.tsx';

const sample = setupBoard(SAMPLE);

function useEngine() {
  const ref = useRef<EngineClient | null>(null);
  useEffect(() => () => ref.current?.cancel(), []);
  return () => (ref.current ??= new EngineClient());
}

/** Shows which empty points the search will even consider. */
export function CandidateDemo() {
  const { t } = useLang();
  const { candidates } = useMemo(() => evalBreakdown(sample, SAMPLE.turn), []);
  const stones = sample.filter(Boolean).length;
  return (
    <div className="widget two-col">
      <Board board={sample} dots={candidates} coords={false} label={t('ตาที่พิจารณา', 'Candidate moves')} />
      <div>
        <div className="big-compare">
          <div><span className="num">{CELLS - stones}</span><span className="lbl">{t('ช่องว่างทั้งหมด', 'empty points')}</span></div>
          <span className="arrow">→</span>
          <div><span className="num accent">{candidates.length}</span><span className="lbl">{t('ช่องที่อยู่ห่างหมากไม่เกิน 2 ช่อง', 'within 2 steps of a stone')}</span></div>
        </div>
        <p className="muted">
          {t(
            'จุดสีม่วงคือตาที่ตัวคำนวณพิจารณา ช่องที่อยู่ไกลจากหมากทุกตัวแทบไม่มีผลกับเกม จึงตัดทิ้งได้ จากนั้นจัดอันดับด้วยคะแนนแบบเร็ว แล้วเก็บไว้แค่ 10–14 ตาแรกต่อ node',
            'Purple dots are the moves the engine considers. Points far from every stone hardly matter, so they are dropped. The rest are ranked with a quick score and only the top 10–14 per node are kept.',
          )}
        </p>
        <p className="muted small">
          {t(
            'ข้อแลกเปลี่ยน: ถ้าตาที่ดีที่สุดอยู่นอกรายการนี้ ตัวคำนวณจะมองไม่เห็น นี่คือเหตุผลหนึ่งที่ผลลัพธ์เป็นแค่การประเมิน',
            'The trade-off: if the best move is outside this list the engine never sees it. That is one reason the result is only an estimate.',
          )}
        </p>
      </div>
    </div>
  );
}

/** Click to add stones and watch the feature counts and Eval change. */
export function EvalDemo() {
  const { t } = useLang();
  const [extra, setExtra] = useState<{ cell: number; color: Player }[]>([]);
  const board = useMemo(() => {
    const b = [...sample];
    for (const s of extra) b[s.cell] = s.color;
    return b;
  }, [extra]);
  const turn: Player = extra.length % 2 === 0 ? SAMPLE.turn : other(SAMPLE.turn);
  const done = !!findWinner(board);
  const e = useMemo(() => evalBreakdown(board, 1), [board]);
  const sum = (f: number[]) => [1, 2, 3, 4].reduce((s, k) => s + f[k] * EVAL_WEIGHTS[k], 0);
  const total = sum(e.black) - sum(e.white);
  return (
    <div className="widget two-col">
      <div>
        <Board
          board={board}
          onPlay={done ? undefined : (cell) => setExtra([...extra, { cell, color: turn }])}
          lastMove={extra[extra.length - 1]?.cell ?? null}
          winLine={findWinner(board)?.line}
          coords={false}
        />
        <div className="widget-controls">
          <button className="btn" onClick={() => setExtra(extra.slice(0, -1))} disabled={!extra.length}>{t('ย้อนตา', 'Undo')}</button>
          <button className="btn" onClick={() => setExtra([])} disabled={!extra.length}>{t('เริ่มใหม่', 'Reset')}</button>
          <span className="muted small">{t('คลิกกระดานเพื่อวางหมากแล้วดูค่าเปลี่ยน', 'Click the board to add stones and watch the numbers change')}</span>
        </div>
      </div>
      <div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('feature: แนว 5 ช่องที่มีหมากเรา k ตัว และไม่มีหมากอีกฝ่าย', 'feature: lines of five with k own stones and no enemy stone')}</th>
              <th>w</th><th>{t('ดำ', 'Black')}</th><th>{t('ขาว', 'White')}</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((k) => (
              <tr key={k}>
                <td>k = {k}</td>
                <td className="mono">{EVAL_WEIGHTS[k]}</td>
                <td className="mono">{e.black[k]}</td>
                <td className="mono">{e.white[k]}</td>
              </tr>
            ))}
            <tr className="total">
              <td>{t('ผลรวมถ่วงน้ำหนัก', 'Weighted sum')}</td><td />
              <td className="mono">{sum(e.black)}</td>
              <td className="mono">{sum(e.white)}</td>
            </tr>
          </tbody>
        </table>
        <div className="eval-total">
          Eval ({t('มุมมองฝ่ายดำ', 'Black’s view')}) = {sum(e.black)} − {sum(e.white)} = <b className="mono">{fmtScore(total)}</b>
        </div>
        <p className="muted small">
          {t(
            'สี่เปิดนับได้ 2 แนว (k = 4 สองครั้ง) ส่วนสี่ปิดนับได้แนวเดียว สามเปิดก็อยู่ในแนว 5 ช่องได้มากกว่าสามปิด ฟังก์ชันจึงแยกรูปแบบเปิดกับปิดได้เองโดยไม่ต้องเขียนกฎแยก',
            'An open four counts twice (two lines with k = 4) while a blocked four counts once, and an open three sits in more lines of five than a closed one. So the function tells open from closed shapes without a separate rule for each.',
          )}
        </p>
      </div>
    </div>
  );
}

interface BenchRow { key: string; label: string; res: SearchResult | null }

/** Same position, same depth, same candidate set: only pruning and order change. */
export function OrderingBench() {
  const { t, num } = useLang();
  const getEngine = useEngine();
  const [depth, setDepth] = useState(4);
  const [rows, setRows] = useState<BenchRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    const eng = getEngine();
    eng.cancel();
    setBusy(true);
    const base: Partial<SearchOptions> = { timeMs: Infinity, minDepth: depth, maxDepth: depth, width: 8, rootWidth: 8, exactRoot: false };
    const variants: [string, string, Partial<SearchOptions>][] = [
      ['mm', t('Minimax ไม่ตัดกิ่ง', 'Minimax, no pruning'), { alphaBeta: false }],
      ['worst', t('α–β ลองตาแย่ก่อน', 'α–β, worst moves first'), { order: 'worst' }],
      ['index', t('α–β เรียงตามตำแหน่งบนกระดาน', 'α–β, board order'), { order: 'index' }],
      ['best', t('α–β ลองตาดีก่อน (move ordering)', 'α–β, best moves first (move ordering)'), { order: 'best' }],
    ];
    const out: BenchRow[] = variants.map(([key, label]) => ({ key, label, res: null }));
    setRows([...out]);
    for (let i = 0; i < variants.length; i++) {
      out[i] = { ...out[i], res: await eng.run(sample, SAMPLE.turn, { ...base, ...variants[i][2] }) };
      setRows([...out]);
    }
    setBusy(false);
  }

  const max = Math.max(1, ...(rows ?? []).map((r) => r.res?.nodes ?? 0));
  return (
    <div className="widget">
      <div className="widget-controls">
        <span className="field-label">{t('ความลึก', 'Depth')}</span>
        <div className="seg small">
          {[3, 4, 5].map((d) => <button key={d} className={depth === d ? 'on' : ''} onClick={() => { setDepth(d); setRows(null); }}>{d}</button>)}
        </div>
        <button className="btn primary" onClick={run} disabled={busy}>{busy ? t('กำลังรัน…', 'Running…') : t('รันการทดลอง', 'Run the experiment')}</button>
        <span className="muted small">{t('ตำแหน่งตัวอย่างด้านบน · 8 ตาต่อ node', 'the sample position above · 8 moves per node')}</span>
      </div>
      {rows && (
        <table className="data-table bench">
          <thead><tr><th>{t('วิธี', 'Method')}</th><th>{t('node ที่ค้น', 'Nodes searched')}</th><th /><th>{t('ค่าที่ได้', 'Value')}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="mono">{r.res ? num(r.res.nodes) : '…'}</td>
                <td className="bar-cell"><div className="bar"><i style={{ width: `${r.res ? Math.max(1, (r.res.nodes / max) * 100) : 0}%` }} /></div></td>
                <td className="mono">{r.res ? fmtScore(r.res.score) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows?.every((r) => r.res) && (
        <p className="muted small">
          {t(
            'ทุกวิธีได้ค่าเท่ากัน เพราะการตัดกิ่งไม่เปลี่ยนคำตอบ ต่างกันแค่ปริมาณงาน ยิ่งลองตาดีก่อน ยิ่งตัดได้มาก',
            'Every method returns the same value, because pruning never changes the answer. Only the amount of work differs: the better the first moves tried, the more gets pruned.',
          )}
        </p>
      )}
    </div>
  );
}

/** Runs the real engine for one second and lists what each iteration cost. */
export function DeepeningDemo() {
  const { t, num } = useLang();
  const getEngine = useEngine();
  const [res, setRes] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    const eng = getEngine();
    eng.cancel();
    setRes(null);
    setBusy(true);
    const r = await eng.run(sample, SAMPLE.turn, { timeMs: 1000, maxDepth: 12 }, setRes);
    setRes(r);
    setBusy(false);
  }

  return (
    <div className="widget">
      <div className="widget-controls">
        <button className="btn primary" onClick={run} disabled={busy}>{busy ? t('กำลังคิด…', 'Thinking…') : t('ให้คิด 1 วินาที', 'Think for 1 second')}</button>
        <span className="muted small">{t('ตำแหน่งตัวอย่างเดิม ฝ่ายดำเดิน', 'the same sample position, Black to move')}</span>
      </div>
      {res && (
        <table className="data-table">
          <thead><tr><th>{t('ความลึก', 'Depth')}</th><th>{t('node สะสม', 'Nodes so far')}</th><th>{t('เวลาสะสม (ms)', 'Time so far (ms)')}</th><th>{t('ตาที่ดีที่สุด', 'Best move')}</th><th>{t('คะแนน', 'Score')}</th></tr></thead>
          <tbody>
            {res.iterations.map((it) => (
              <tr key={it.depth}>
                <td className="mono">{it.depth}</td>
                <td className="mono">{num(it.nodes)}</td>
                <td className="mono">{Math.round(it.timeMs)}</td>
                <td className="mono">{cellLabel(it.best)}</td>
                <td className="mono">{fmtScore(it.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {res && !busy && (
        <p className="muted small">
          {t(
            `หมดเวลาระหว่างค้นชั้นที่ ${res.depth + 1} จึงใช้คำตอบของชั้นที่ ${res.depth} ซึ่งค้นเสร็จสมบูรณ์แล้ว งานของชั้นตื้น ๆ รวมกันยังน้อยกว่าชั้นสุดท้ายชั้นเดียว`,
            `Time ran out during depth ${res.depth + 1}, so the answer from depth ${res.depth}, which finished, is used. All the shallow iterations together cost less than the last one alone.`,
          )}
        </p>
      )}
    </div>
  );
}
