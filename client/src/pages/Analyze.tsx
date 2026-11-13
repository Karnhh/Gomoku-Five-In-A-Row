import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { boardFromLabels, cellLabel, emptyBoard, findWinner, isFull, other } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';
import Board from '../components/Board.tsx';
import type { Ghost, HeatCell } from '../components/Board.tsx';
import SubTreeView, { fmtScore } from '../components/SubTreeView.tsx';
import { EngineClient, MAX_DEPTH, THINK_TIMES } from '../engine/client.ts';
import { WIN, WIN_THRESHOLD, buildTree } from '../engine/engine.ts';
import type { SearchResult } from '../engine/engine.ts';
import { SAMPLE } from '../data/positions.ts';
import { useLang } from '../i18n.tsx';

type Brush = 'auto' | 1 | 2 | 0;
interface Snap { board: number[]; turn: Player; last: number | null }

const sampleSnap = (): Snap => ({ board: boardFromLabels(SAMPLE.blacks, SAMPLE.whites), turn: SAMPLE.turn, last: null });

export default function Analyze() {
  const { t, num } = useLang();
  const [params] = useSearchParams();

  // starts from an empty board, unless a position was passed in the link
  const [snap, setSnap] = useState<Snap>(() => {
    const b = params.get('b'), w = params.get('w');
    if (b === null && w === null) return { board: emptyBoard(), turn: 1, last: null };
    return { board: boardFromLabels(b ?? '', w ?? ''), turn: params.get('t') === '2' ? 2 : 1, last: null };
  });
  const [history, setHistory] = useState<Snap[]>([]);
  // 0 = advise both sides: every position gets a suggestion for whoever is to move
  const [me, setMe] = useState<Player | 0>(snap.turn);
  const [brush, setBrush] = useState<Brush>('auto');
  const [tab, setTab] = useState<'advisor' | 'tree'>('advisor');
  const [timeMs, setTimeMs] = useState(1000);
  const [showHeat, setShowHeat] = useState(true);
  const [width, setWidth] = useState(4);
  const [path, setPath] = useState<number[]>([]);
  const [res, setRes] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const engine = useRef<EngineClient | null>(null);

  const { board, turn, last } = snap;
  const won = useMemo(() => findWinner(board), [board]);
  const over = !!won || isFull(board);
  const myTurn = !over && (me === 0 || turn === me);
  const empty = useMemo(() => board.every((c) => c === 0), [board]);

  // advisor: re-run the search in the worker whenever the position changes
  useEffect(() => {
    engine.current ??= new EngineClient();
    const eng = engine.current;
    eng.cancel();
    setRes(null);
    if (over) { setBusy(false); return; }
    setBusy(true);
    setRunId((n) => n + 1);
    let alive = true;
    eng.run(board, turn, { timeMs, maxDepth: MAX_DEPTH }, (r) => { if (alive) setRes(r); })
      .then((r) => { if (alive) { if (r.depth > 0) setRes(r); setBusy(false); } });
    return () => { alive = false; };
  }, [board, turn, timeMs, over]);
  useEffect(() => () => engine.current?.cancel(), []);

  const tree = useMemo(() => (over ? null : buildTree(board, turn, width, 2)), [board, turn, width, over]);
  useEffect(() => setPath([]), [board, turn, width]);

  const commit = (next: Snap) => {
    setHistory((h) => [...h, snap]);
    setSnap(next);
  };
  const place = (cell: number) => {
    if (board[cell] !== 0 || over) return;
    const b = [...board];
    b[cell] = turn;
    commit({ board: b, turn: other(turn), last: cell });
  };
  const play = place;
  const onCell = (cell: number) => {
    if (brush === 'auto' && board[cell] === 0) { place(cell); return; }
    const b = [...board];
    if (brush === 'auto' || brush === 0) {
      if (b[cell] === 0) return;
      b[cell] = 0;
    } else {
      b[cell] = b[cell] === brush ? 0 : brush;
    }
    // after a free edit the side to move follows the stone count, as in a real
    // game: black moves first, so equal counts mean it is black's turn
    const blacks = b.filter((c) => c === 1).length, whites = b.filter((c) => c === 2).length;
    commit({ board: b, turn: blacks <= whites ? 1 : 2, last: null });
  };
  const stop = () => { engine.current?.cancel(); setBusy(false); };
  const playBest = () => { if (res && res.best >= 0) place(res.best); };
  const undo = () => {
    if (!history.length) return;
    setSnap(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };
  const followPath = () => {
    const b = [...board];
    let color = turn;
    for (const cell of path) { b[cell] = color; color = other(color); }
    commit({ board: b, turn: color, last: path[path.length - 1] ?? null });
  };

  const heat: HeatCell[] | undefined = useMemo(() => {
    if (!res || !myTurn || tab !== 'advisor' || !showHeat || res.moves.length === 0) return undefined;
    const scores = res.moves.map((m) => m.score);
    const hi = Math.max(...scores), lo = Math.min(...scores);
    return res.moves.map((m, i) => ({ cell: m.cell, rank: i + 1, t: hi === lo ? 1 : (m.score - lo) / (hi - lo) }));
  }, [res, tab, showHeat, myTurn]);

  const ghosts: Ghost[] | undefined = tab === 'tree' && path.length
    ? path.map((cell, i) => ({ cell, color: i % 2 === 0 ? turn : other(turn), text: String(i + 1) }))
    : undefined;

  const colorName = (c: Player) => (c === 1 ? t('ดำ', 'Black') : t('ขาว', 'White'));
  const describe = (score: number) => {
    if (score >= WIN_THRESHOLD) return t(`${colorName(turn)}บังคับชนะได้ใน ${WIN - score} ตา (ภายในความลึกที่ค้น)`, `${colorName(turn)} can force a win in ${WIN - score} plies (within the searched depth)`);
    if (score <= -WIN_THRESHOLD) return t(`${colorName(turn)}กันไม่ทัน ภายใน ${WIN + score} ตา (เท่าที่ค้นเห็น)`, `${colorName(turn)} cannot hold within ${WIN + score} plies (as far as the search sees)`);
    // Ordinary scores swing with the parity of the search depth, so no verdict
    // such as "Black is better" is drawn from them: only forced results are named.
    return '';
  };

  return (
    <main className="page analyze-page">
      <span className="tag">{t('ตาต่อไป', 'Next move')}</span>
      <h1>{t('ตาต่อไปควรวางตรงไหน', 'Where should I play next?')}</h1>
      <p className="muted intro">
        {t(
          'วางหมากตามเกมที่เล่นอยู่ แล้วเลือกว่าคุณเป็นฝ่ายไหน เมื่อถึงตาคุณ กระดานจะแสดงตาที่น่าเดินพร้อมอันดับ หรือเลือก "ทั้งสองฝ่าย" เพื่อดูคำแนะนำในทุกตา ตัวคำนวณค้นด้วย α–β แบบจำกัดความลึกแล้วให้คะแนนด้วยฟังก์ชัน Eval',
          'Set up the board from the game you are playing and choose your side. On your turn the board shows the promising moves with their ranks, or pick "Both sides" to get advice on every move. The engine runs a depth-limited α–β search and scores positions with an evaluation function.',
        )}
      </p>

      <div className="analyze-layout">
        <div>
          <div className="board-tools top">
            <div className="field-inline">
            <span className="field-label">{t('ฉันเป็น', 'I am')}</span>
            <div className="seg small">
              <button className={me === 1 ? 'on' : ''} onClick={() => setMe(1)}><span className="chip-stone sm black" /> {t('ดำ', 'Black')}</button>
              <button className={me === 2 ? 'on' : ''} onClick={() => setMe(2)}><span className="chip-stone sm white" /> {t('ขาว', 'White')}</button>
              <button className={me === 0 ? 'on' : ''} onClick={() => setMe(0)}>{t('ทั้งสองฝ่าย', 'Both sides')}</button>
            </div>
            </div>
            <div className="field-inline">
            <span className="field-label">{t('วางหมาก', 'Place')}</span>
            <div className="seg small">
              <button className={brush === 'auto' ? 'on' : ''} onClick={() => setBrush('auto')}>{t('ตามตา', 'Turn order')}</button>
              <button className={brush === 1 ? 'on' : ''} onClick={() => setBrush(1)} aria-label={t('ดำ', 'Black')}><span className="chip-stone sm black" /></button>
              <button className={brush === 2 ? 'on' : ''} onClick={() => setBrush(2)} aria-label={t('ขาว', 'White')}><span className="chip-stone sm white" /></button>
              <button className={brush === 0 ? 'on' : ''} onClick={() => setBrush(0)}>{t('ลบ', 'Erase')}</button>
            </div>
            </div>
          </div>
          <Board
            board={board}
            onPlay={onCell}
            clickOccupied
            lastMove={last}
            winLine={won?.line}
            heat={heat}
            ghosts={ghosts}
            label={t('กระดานวิเคราะห์', 'Analysis board')}
          />
          <div className="board-tools">
            <span className="turn-chip"><span className={`chip-stone sm ${turn === 1 ? 'black' : 'white'}`} />{t(`ตาของ${colorName(turn)}`, `${colorName(turn)} to move`)}</span>
            <button className="btn" onClick={undo} disabled={history.length === 0}>↶ {t('ย้อนกลับ', 'Undo')}</button>
            <button className="btn" onClick={() => commit({ board, turn: other(turn), last })} disabled={over}>{t('สลับฝ่ายเดิน', 'Swap turn')}</button>
            <button className="btn" onClick={() => commit({ board: emptyBoard(), turn: 1, last: null })} disabled={empty}>{t('ล้างกระดาน', 'Clear')}</button>
            <button className="btn" onClick={() => commit(sampleSnap())}>{t('ตัวอย่าง', 'Sample')}</button>
          </div>
          <p className="muted small help">
            {t(
              'โหมด "ตามตา" วางดำกับขาวสลับกันตามลำดับการเดินจริง คลิกหมากที่วางแล้วเพื่อลบ ถ้าอยากจัดกระดานเองแบบอิสระ ให้เลือกสีหมากหรือ "ลบ" แล้วระบบจะนับจำนวนหมากเพื่อดูว่าถึงตาใคร (ดำเดินก่อน) ถ้าไม่ตรง กด "สลับฝ่ายเดิน"',
              '"Turn order" places Black and White alternately, as in a real game. Click a stone to remove it. To set up a position freely, pick a colour or "Erase"; the side to move is then worked out from the stone count (Black moves first). If that is wrong, press "Swap turn".',
            )}
          </p>
        </div>

        <div className="analyze-side">
          <div className="seg tabs">
            <button className={tab === 'advisor' ? 'on' : ''} onClick={() => setTab('advisor')}>{t('แนะนำตา + heatmap', 'Advisor + heatmap')}</button>
            <button className={tab === 'tree' ? 'on' : ''} onClick={() => setTab('tree')}>{t('Tree ย่อย', 'Sub-tree')}</button>
          </div>

          {over && (
            <div className="callout">
              {won
                ? t(`${colorName(won.winner)}เรียงครบ 5 ตัวแล้ว เกมจบ กดย้อนตาหรือล้างกระดานเพื่อวิเคราะห์ต่อ`, `${colorName(won.winner)} already has five. Undo or clear the board to keep analysing.`)
                : t('กระดานเต็มแล้ว', 'The board is full.')}
            </div>
          )}

          {!over && !myTurn && tab === 'advisor' && (
            <section className="card panel">
              <b>{t(`ตอนนี้เป็นตาของ${colorName(turn)} ไม่ใช่ตาคุณ`, `It is ${colorName(turn)}'s turn, not yours`)}</b>
              <p className="muted">
                {t(
                  `วางตาที่${colorName(turn)}เดินจริงลงบนกระดาน หรือให้ระบบเดินแทน${colorName(turn)}ด้วยตาที่ประเมินว่าดีที่สุด`,
                  `Place ${colorName(turn)}'s actual move on the board, or let the engine play the move it rates best for ${colorName(turn)}.`,
                )}
              </p>
              <div className="tree-actions">
                <button className="btn" onClick={playBest} disabled={!res}>
                  {res ? t(`ให้${colorName(turn)}เดินตาที่ดีที่สุด (${cellLabel(res.best)})`, `Play ${colorName(turn)}'s best move (${cellLabel(res.best)})`) : t('กำลังคิด…', 'Thinking…')}
                </button>
                <button className="btn" onClick={() => setMe(turn)}>{t(`สลับไปเป็น${colorName(turn)}`, `Switch to ${colorName(turn)}`)}</button>
                <button className="btn" onClick={() => setMe(0)}>{t('แนะนำทั้งสองฝ่าย', 'Advise both sides')}</button>
              </div>
            </section>
          )}

          {myTurn && tab === 'advisor' && (
            <section className="card panel">
              <div className="panel-head">
                <div className="field-inline">
                  <span className="field-label">{t('เวลาคิด', 'Time limit')}</span>
                  <div className="seg small">
                    {THINK_TIMES.map((ms) => (
                      <button key={ms} className={timeMs === ms ? 'on' : ''} onClick={() => setTimeMs(ms)}>{ms / 1000}s</button>
                    ))}
                  </div>
                </div>
                <label className="check">
                  <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
                  <span>Heatmap</span>
                </label>
              </div>

              {busy && (
                <div className="thinking">
                  <div className="progress" role="progressbar" aria-label={t('กำลังคิด', 'Thinking')}>
                    <i key={runId} style={{ animationDuration: `${timeMs}ms` }} />
                  </div>
                  <span className="muted small">
                    {res
                      ? t(`กำลังคิด… ค้นเสร็จแล้วถึงชั้นที่ ${res.depth}`, `Thinking… depth ${res.depth} finished`)
                      : t('กำลังคิด…', 'Thinking…')}
                  </span>
                  <button className="btn sm" onClick={stop} disabled={!res}>{t('หยุดคิด', 'Stop')}</button>
                </div>
              )}
              {res && res.moves.length > 0 && (
                <>
                  <div className="best-row">
                    <div>
                      <div className="muted small">{me === 0
                        ? t(`ตาของ${colorName(turn)} · ตาที่แนะนำ`, `${colorName(turn)} to move · suggested move`)
                        : t(`ถึงตาคุณ (${colorName(turn)}) · ตาที่แนะนำ`, `Your turn (${colorName(turn)}) · suggested move`)}</div>
                      <div className="best-move mono">{cellLabel(res.best)}</div>
                    </div>
                    <div>
                      <div className="muted small">{t('คะแนนประเมิน', 'Evaluation')}</div>
                      <div className="best-score mono">{fmtScore(res.score)}</div>
                    </div>
                    {describe(res.score) && <div className="best-desc">{describe(res.score)}</div>}
                  </div>
                  <button className="btn primary start" onClick={playBest}>{t(`ลงตาที่แนะนำ (${cellLabel(res.best)})`, `Play the suggested move (${cellLabel(res.best)})`)}</button>
                  <div className="meta-row muted small">
                    <span>{t('ลึก', 'depth')} <b className="mono">{res.depth}</b></span>
                    <span>{t('node ที่ค้น', 'nodes')} <b className="mono">{num(res.nodes)}</b></span>
                    <span>{t('กิ่งที่ถูกตัด', 'cutoffs')} <b className="mono">{num(res.cutoffs)}</b></span>
                    <span><b className="mono">{Math.round(res.timeMs)}</b> ms</span>
                  </div>
                  <ol className="move-list">
                    {res.moves.slice(0, 8).map((m, i) => (
                      <li key={m.cell}>
                        <button onClick={() => play(m.cell)} title={t('เดินตานี้', 'Play this move')}>
                          <span className="rank">{i + 1}</span>
                          <b className="mono">{cellLabel(m.cell)}</b>
                          <span className="pv muted small mono">{m.pv.slice(1, 5).map(cellLabel).join(' ')}</span>
                          <span className="mono sc">{fmtScore(m.score)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="muted small">{t('ตัวเลขบนกระดานคืออันดับ 1–5 สีเข้มคือคะแนนสูง · คลิกรายการเพื่อเดินตานั้น · ตัวอักษรจางคือแนวที่คาดว่าจะเดินต่อ', 'Numbers on the board are ranks 1–5; darker means a higher score · click a row to play it · the faint text is the expected continuation')}</p>
                </>
              )}
              <div className="callout note">
                {t(
                  'นี่คือการประเมิน ไม่ใช่คำตอบที่พิสูจน์แล้ว ตัวคำนวณค้นได้ลึกจำกัดและดูเฉพาะตาที่อยู่ใกล้หมากเดิม',
                  'This is an estimate, not a proven answer. The engine searches to a limited depth and only looks at moves near existing stones.',
                )}
              </div>
            </section>
          )}

          {!over && tab === 'tree' && tree && (
            <section className="card panel">
              <div className="panel-head">
                <div className="field-inline">
                  <span className="field-label">{t('ตาที่พิจารณาต่อ node', 'Moves per node')}</span>
                  <div className="seg small">
                    {[3, 4, 5, 6].map((w) => (
                      <button key={w} className={width === w ? 'on' : ''} onClick={() => setWidth(w)}>{w}</button>
                    ))}
                  </div>
                </div>
              </div>
              <SubTreeView tree={tree} selected={path} onSelect={setPath} />
              <div className="tree-legend muted small">
                <span><i className="lg max" /> MAX ({colorName(turn)})</span>
                <span><i className="lg min" /> MIN ({colorName(other(turn))})</span>
                <span><i className="lg leaf" /> Eval</span>
                <span><i className="lg cut" /> {t('ถูกตัด (ไม่ต้องประเมิน)', 'pruned (never evaluated)')}</span>
              </div>
              <div className="meta-row muted small">
                <span>{t('ใบที่ประเมิน', 'leaves evaluated')} <b className="mono">{tree.evaluated}</b> / {tree.leaves}</span>
                <span>{t('ถูกตัด', 'pruned')} <b className="mono">{tree.pruned}</b></span>
                <span>{t('ค่าที่ราก', 'root value')} <b className="mono">{fmtScore(tree.root.value ?? 0)}</b></span>
              </div>
              <div className="tree-actions">
                {path.length === 0
                  ? <span className="muted small">{t('คลิก node เพื่อดูตาเดินบนกระดาน แล้วเดินตามเพื่อขยาย tree ต่อจากจุดนั้น', 'Click a node to preview its moves on the board, then follow it to grow the tree from there.')}</span>
                  : (
                    <>
                      <span className="mono">{path.map(cellLabel).join(' → ')}</span>
                      <button className="btn primary" onClick={followPath}>{t('เดินตามนี้แล้วขยายต่อ', 'Follow and expand')}</button>
                      <button className="btn" onClick={() => setPath([])}>{t('ยกเลิก', 'Clear')}</button>
                    </>
                  )}
              </div>
              <p className="muted small">
                {t(
                  'Tree นี้ลึก 2 ชั้น เลือกเฉพาะตาที่น่าสนใจที่สุด ค่าที่ใบมาจาก Eval ในมุมมองของฝ่ายที่กำลังจะเดิน แล้วส่งค่าขึ้นด้วย minimax เส้นหนาคือแนวที่ดีที่สุดของทั้งสองฝ่าย',
                  'The tree is 2 plies deep and keeps only the most promising moves. Leaf values come from Eval, from the mover’s point of view, and are backed up with minimax. The thick line is best play for both sides.',
                )}
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
