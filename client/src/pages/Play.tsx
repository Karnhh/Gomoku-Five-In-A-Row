import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { boardFromMoves, cellLabel, isFull, isValidMove, winningLine } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';
import Board from '../components/Board.tsx';
import OnlineLobby from '../components/OnlineLobby.tsx';
import { HintBox, useAdvice } from '../components/Advice.tsx';
import { ONLINE_ENABLED } from '../online/flag.ts';
import { analyzeLink } from '../data/positions.ts';
import { useLang } from '../i18n.tsx';

type First = 'p1' | 'p2' | 'random';
interface Settings { first: First; minutes: number; confirm: boolean; /** show the engine's suggestion for the side to move */ hint: boolean; hintMs: number }

interface Result {
  /** 0 = draw */
  winner: Player | 0;
  reason: 'five' | 'time' | 'resign' | 'draw';
  line?: number[];
}

interface Game {
  /** which player (0 or 1) holds black */
  blackIs: 0 | 1;
  moves: number[];
  /** ms left for [black, white] */
  clock: [number, number];
  result: Result | null;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Play() {
  const { t } = useLang();
  const [settings, setSettings] = useState<Settings>({ first: 'random', minutes: 5, confirm: true, hint: false, hintMs: 1000 });
  const [game, setGame] = useState<Game | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const lastTick = useRef(0);

  const board = useMemo(() => boardFromMoves(game?.moves ?? []), [game?.moves]);
  const turn: Player = game && game.moves.length % 2 === 1 ? 2 : 1;
  const timed = settings.minutes > 0;
  const running = !!game && !game.result;

  // chess clock: only the side to move loses time
  useEffect(() => {
    if (!running || !timed) return;
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      setGame((g) => {
        if (!g || g.result) return g;
        const side = g.moves.length % 2; // 0 black, 1 white
        const clock: [number, number] = [g.clock[0], g.clock[1]];
        clock[side] = Math.max(0, clock[side] - dt);
        const result: Result | null = clock[side] <= 0 ? { winner: side === 0 ? 2 : 1, reason: 'time' } : null;
        return { ...g, clock, result };
      });
    }, 200);
    return () => clearInterval(id);
  }, [running, timed, turn]);

  // optional advice: the same engine as the "Next move" page, for whoever is to move
  const { hint, hintMs } = settings;
  const advice = useAdvice(board, turn, running && hint, hintMs);

  function start() {
    const blackIs: 0 | 1 = settings.first === 'p1' ? 0 : settings.first === 'p2' ? 1 : Math.random() < 0.5 ? 0 : 1;
    const ms = settings.minutes * 60_000;
    setGame({ blackIs, moves: [], clock: [ms, ms], result: null });
    setPending(null);
  }

  function place(cell: number) {
    setPending(null);
    setGame((g) => {
      if (!g || g.result) return g;
      const b = boardFromMoves(g.moves);
      if (!isValidMove(b, cell)) return g;
      const mover: Player = g.moves.length % 2 === 0 ? 1 : 2;
      b[cell] = mover;
      const line = winningLine(b, cell);
      const result: Result | null = line
        ? { winner: mover, reason: 'five', line }
        : isFull(b) ? { winner: 0, reason: 'draw' } : null;
      return { ...g, moves: [...g.moves, cell], result };
    });
  }

  function tap(cell: number) {
    if (!running) return;
    if (!settings.confirm || pending === cell) place(cell);
    else setPending(cell);
  }

  function undo() {
    setPending(null);
    setGame((g) => {
      if (!g || g.moves.length === 0) return g;
      if (g.result && g.result.reason !== 'five' && g.result.reason !== 'draw') return g;
      return { ...g, moves: g.moves.slice(0, -1), result: null };
    });
  }

  function resign() {
    setPending(null);
    setGame((g) => (g && !g.result ? { ...g, result: { winner: g.moves.length % 2 === 0 ? 2 : 1, reason: 'resign' } } : g));
  }

  // ---------- setup screen ----------
  if (!game) {
    const firstOptions: [First, string][] = [
      ['p1', t('ผู้เล่น 1 เดินก่อน', 'Player 1 first')],
      ['p2', t('ผู้เล่น 2 เดินก่อน', 'Player 2 first')],
      ['random', t('สุ่ม', 'Random')],
    ];
    return (
      <main className="page play-setup">
        <span className="tag">{t('เล่นกับเพื่อน', 'Play with a friend')}</span>
        <h1>{t('หมากห้าตัว', 'Five in a Row')}</h1>
        <p className="muted intro">
          {t(
            'กระดาน 15×15 วางหมากบนจุดตัดของเส้น หมากดำเดินก่อน ใครเรียงได้ 5 ตัวติดกันก่อน (แนวนอน แนวตั้ง หรือแนวทแยง) เป็นฝ่ายชนะ',
            'A 15×15 board; stones go on the line intersections. Black moves first. The first to line up five (horizontally, vertically or diagonally) wins.',
          )}
        </p>

        <div className="setup-grid">
          <section className="card setup-card">
            <h2>{t('สองคนบนเครื่องเดียว', 'Two players, one device')}</h2>
            <div className="field">
              <span className="field-label">{t('ใครเดินก่อน (ถือหมากดำ)', 'Who moves first (plays black)')}</span>
              <div className="seg">
                {firstOptions.map(([v, label]) => (
                  <button key={v} className={settings.first === v ? 'on' : ''} onClick={() => setSettings((s) => ({ ...s, first: v }))}>{label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">{t('เวลาคิดรวมของแต่ละคน', 'Total thinking time per player')}</span>
              <div className="seg">
                {[0, 3, 5, 10].map((m) => (
                  <button key={m} className={settings.minutes === m ? 'on' : ''} onClick={() => setSettings((s) => ({ ...s, minutes: m }))}>
                    {m === 0 ? t('ไม่จับเวลา', 'No clock') : t(`${m} นาที`, `${m} min`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={settings.hint} onChange={(e) => setSettings((s) => ({ ...s, hint: e.target.checked }))} />
              <span>{t('แสดงคำแนะนำตาต่อไป (เปิดหรือปิดระหว่างเล่นได้)', 'Show next-move advice (can be switched during play)')}</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.confirm} onChange={(e) => setSettings((s) => ({ ...s, confirm: e.target.checked }))} />
              <span>{t('แตะสองครั้งเพื่อยืนยันการวางหมาก', 'Tap twice to confirm a move')}</span>
            </label>
            <button className="btn primary big" onClick={start}>{t('เริ่มเกม', 'Start game')}</button>
          </section>

          {ONLINE_ENABLED ? <OnlineLobby /> : (
            <section className="card setup-card soon">
              <h2>{t('เล่นออนไลน์ด้วยรหัสห้อง', 'Online with a room code')} <span className="pill">{t('เร็ว ๆ นี้', 'Coming soon')}</span></h2>
              <p className="muted">
                {t(
                  'สร้างห้องแล้วส่งรหัสให้เพื่อนเพื่อเล่นจากคนละเครื่อง ส่วนนี้ยังไม่เปิดให้ใช้',
                  'Create a room and send the code to a friend to play from two devices. This is not open yet.',
                )}
              </p>
              <button className="btn" disabled>{t('สร้างห้อง', 'Create room')}</button>
            </section>
          )}
        </div>
      </main>
    );
  }

  // ---------- game screen ----------
  const names = [t('ผู้เล่น 1', 'Player 1'), t('ผู้เล่น 2', 'Player 2')];
  const nameOf = (color: Player) => names[color === 1 ? game.blackIs : 1 - game.blackIs];
  const colorName = (color: Player) => (color === 1 ? t('ดำ', 'Black') : t('ขาว', 'White'));
  const res = game.result;
  const canUndo = game.moves.length > 0 && (!res || res.reason === 'five' || res.reason === 'draw');

  let status: string;
  if (!res) {
    status = pending !== null
      ? t(`แตะ ${cellLabel(pending)} อีกครั้งเพื่อยืนยัน`, `Tap ${cellLabel(pending)} again to confirm`)
      : t(`ตาของ${nameOf(turn)} (${colorName(turn)})`, `${nameOf(turn)} to move (${colorName(turn)})`);
  } else if (res.winner === 0) {
    status = t('เสมอ กระดานเต็ม', 'Draw: the board is full');
  } else {
    const why = {
      five: t('เรียงครบ 5 ตัว', 'five in a row'),
      time: t('อีกฝ่ายหมดเวลา', 'opponent ran out of time'),
      resign: t('อีกฝ่ายยอมแพ้', 'opponent resigned'),
      draw: '',
    }[res.reason];
    status = t(`${nameOf(res.winner)} (${colorName(res.winner)}) ชนะ · ${why}`, `${nameOf(res.winner)} (${colorName(res.winner)}) wins · ${why}`);
  }

  const playerCard = (color: Player) => (
    <div className={`player ${!res && turn === color ? 'active' : ''} ${res && res.winner === color ? 'winner' : ''}`}>
      <span className={`chip-stone ${color === 1 ? 'black' : 'white'}`} />
      <div className="player-info">
        <b>{nameOf(color)}</b>
        <span className="muted small">{colorName(color)}{color === 1 ? t(' · เดินก่อน', ' · moves first') : ''}</span>
      </div>
      {timed && <span className={`clock mono ${game.clock[color - 1] < 30_000 ? 'low' : ''}`}>{fmt(game.clock[color - 1])}</span>}
    </div>
  );

  return (
    <main className="page play-page">
      <div className="play-layout">
        <div className="play-board">
          <Board
            board={board}
            onPlay={running ? tap : undefined}
            lastMove={game.moves[game.moves.length - 1] ?? null}
            winLine={res?.line}
            heat={advice.heat}
            pending={pending !== null && running ? { cell: pending, color: turn } : null}
            label={t('กระดานหมากห้าตัว', 'Five-in-a-row board')}
          />
        </div>
        <aside className="play-side">
          <div className="players">
            {playerCard(1)}
            {playerCard(2)}
          </div>
          <div className={`status ${res ? 'over' : ''}`} role="status" aria-live="polite">{status}</div>
          <HintBox
            on={hint}
            onToggle={(on) => setSettings((s) => ({ ...s, hint: on }))}
            timeMs={hintMs}
            onTime={(ms) => setSettings((s) => ({ ...s, hintMs: ms }))}
            advice={advice}
            active={running && hint}
            note={t(
              'ตัวเลขบนกระดานคืออันดับ 1–5 ของตาที่น่าเดินสำหรับฝ่ายที่กำลังจะเดิน เป็นการประเมิน ไม่ใช่คำตอบที่พิสูจน์แล้ว ทั้งสองคนเห็นคำแนะนำเดียวกัน',
              'Numbers on the board rank the top 5 moves for the side to move. It is an estimate, not a proven answer, and both players see the same advice.',
            )}
          />
          <div className="play-actions">
            <button className="btn" onClick={undo} disabled={!canUndo}>{t('ย้อนตา', 'Undo')}</button>
            <button className="btn" onClick={resign} disabled={!!res}>{t('ยอมแพ้', 'Resign')}</button>
            <button className="btn primary" onClick={start}>{t('เกมใหม่', 'New game')}</button>
            <button className="btn" onClick={() => { setGame(null); setPending(null); }}>{t('ตั้งค่า', 'Settings')}</button>
          </div>
          <p className="muted small">
            {t(`เดินไปแล้ว ${game.moves.length} ตา`, `${game.moves.length} moves played`)}
            {game.moves.length > 0 && <> · <Link className="inline-link" to={analyzeLink(board, turn)}>{t('วิเคราะห์ตำแหน่งนี้ →', 'Analyze this position →')}</Link></>}
          </p>
        </aside>
      </div>
    </main>
  );
}
