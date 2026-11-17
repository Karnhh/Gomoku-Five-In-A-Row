import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { boardFromMoves, cellLabel, emptyBoard, other } from '@gomoku/shared/rules';
import type { Player } from '@gomoku/shared/rules';
import type { AdviceInfo, RoomView } from '@gomoku/shared/room';
import Board from '../components/Board.tsx';
import { HintBox, useAdvice } from '../components/Advice.tsx';
import { ApiError, getRoom, joinRoom, saveToken, seatKey, sendMove, sendPause, sendRematch, sendResign, sendUndo } from '../online/api.ts';
import { useLang } from '../i18n.tsx';

const POLL_MS = 1000;
/** shown instead of the position during a time-out, so nobody can study it */
const HIDDEN_BOARD = emptyBoard();

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Room() {
  const { t } = useLang();
  const code = (useParams().code ?? '').toUpperCase();
  const [token, setToken] = useState<string>(() => seatKey(code));
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [problem, setProblem] = useState<'notfound' | 'network' | null>(null);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(true);
  const [copied, setCopied] = useState(false);
  const [resignAsk, setResignAsk] = useState(false);
  const [pauseAsk, setPauseAsk] = useState(false);
  const [pauseSeconds, setPauseSeconds] = useState(30);
  const [hint, setHint] = useState(false);
  const [hintMs, setHintMs] = useState(1000);
  /** counted from one of my moves to the next, then sent with the move */
  const timeChanges = useRef(0);
  const stopPresses = useRef(0);
  const [, setTick] = useState(0);
  /** performance.now() when `room` arrived, to run the clocks between polls */
  const syncedAt = useRef(0);
  const acting = useRef(false);

  const accept = useCallback((v: RoomView) => {
    syncedAt.current = performance.now();
    setRoom((prev) => (prev && prev.game === v.game && prev.version > v.version ? prev : v)); // ignore stale polls
    setProblem(null);
  }, []);

  // take a seat (or learn that we are a spectator), then start polling
  // Every attempt carries the same seat key, so asking twice (React's development
  // double-run, a retry after a lost answer, a refresh) always lands on the same seat.
  useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const key = seatKey(code);
    const attempt = () => {
      joinRoom(code, key)
        .then((r) => {
          if (!alive) return;
          if ('token' in r) { saveToken(code, r.token); setToken(r.token); } else setToken(key);
          setJoined(true);
        })
        .catch((e: ApiError) => {
          if (!alive) return;
          if (e.status === 404) { setProblem('notfound'); return; }
          setProblem('network');
          retry = setTimeout(attempt, 2000);
        });
    };
    attempt();
    return () => { alive = false; clearTimeout(retry); };
  }, [code]);

  useEffect(() => {
    if (!joined) return;
    let alive = true;
    const poll = () => {
      if (acting.current) return; // an action's reply is fresher than a poll
      getRoom(code, token)
        .then((v) => { if (alive) accept(v); })
        .catch((e: ApiError) => { if (alive) setProblem(e.status === 404 ? 'notfound' : 'network'); });
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [joined, code, token, accept]);

  // repaint the running clock a few times a second
  // (a time-out counts down too, even in a game without clocks)
  const ticking = room?.status === 'playing' && (room.minutes > 0 || !!room.pause);
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [ticking]);

  // every poll brings a new array, so key the board on the moves themselves:
  // otherwise the advisor would restart once a second
  const movesKey = room?.moves.join(',') ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = useMemo(() => boardFromMoves(room?.moves ?? []), [movesKey]);
  // Advice is private to this device: a player gets it on their own turn only,
  // a spectator for whoever is to move. The engine runs here, not on the server.
  const adviceTurn: Player = room?.turn ?? 1;
  const adviceActive = hint && room?.status === 'playing' && room.pause?.state !== 'on' && (room.you === null || room.you === room.turn);
  const advice = useAdvice(board, adviceTurn, adviceActive, hintMs);

  // a pending tap belongs to one position only
  const moveCount = room?.moves.length ?? 0;
  useEffect(() => setPending(null), [moveCount, room?.game]);
  useEffect(() => { setResignAsk(false); setPauseAsk(false); }, [room?.status, room?.game]);

  async function act(fn: () => Promise<RoomView>) {
    if (acting.current) return;
    acting.current = true;
    setNotice('');
    try {
      accept(await fn());
    } catch (e) {
      const err = e as ApiError;
      if (err.room) accept(err.room);
      setNotice(err.status === 0
        ? t('ติดต่อ server ไม่ได้ ลองอีกครั้ง', 'Could not reach the server. Try again.')
        : t('ทำรายการไม่สำเร็จ สถานะของห้องเปลี่ยนไปแล้ว', 'That did not go through: the room has changed.'));
    } finally {
      acting.current = false;
    }
  }

  if (problem === 'notfound') {
    return (
      <main className="page">
        <h1>{t('ไม่พบห้องนี้', 'Room not found')}</h1>
        <p className="muted intro">
          {t(`ไม่มีห้องรหัส ${code} รหัสอาจพิมพ์ผิด หรือห้องถูกลบไปแล้วเพราะไม่มีการเล่นเกิน 24 ชั่วโมง`, `There is no room ${code}. The code may be mistyped, or the room was removed after 24 hours without play.`)}
        </p>
        <Link to="/play" className="btn primary">{t('กลับไปสร้างห้องใหม่', 'Back to create a room')}</Link>
      </main>
    );
  }
  if (!room) {
    return (
      <main className="page">
        <div className="loading">
          {problem === 'network'
            ? t('ติดต่อ server ไม่ได้ กำลังลองใหม่…', 'Could not reach the server. Retrying…')
            : t('กำลังเข้าห้อง…', 'Entering the room…')}
        </div>
      </main>
    );
  }

  const you = room.you;
  const playing = room.status === 'playing';
  // time-out: count down locally between polls
  const pause = room.pause;
  const pauseLeft = pause ? pause.msLeft - (performance.now() - syncedAt.current) : 0;
  const pauseOn = playing && pause?.state === 'on' && pauseLeft > 0;
  const pauseAsked = playing && pause?.state === 'asked' && pauseLeft > 0;
  const pauseSecs = Math.max(1, Math.ceil(pauseLeft / 1000));
  const myTurn = playing && you === room.turn && !pauseOn;
  const colorName = (c: Player) => (c === 1 ? t('ดำ', 'Black') : t('ขาว', 'White'));
  const who = (c: Player) => (you === null ? colorName(c) : c === you ? t('คุณ', 'You') : t('เพื่อน', 'Friend'));

  const clock: [number, number] = [room.clock[0], room.clock[1]];
  if (playing && room.minutes > 0 && !pauseOn) clock[room.turn - 1] = Math.max(0, clock[room.turn - 1] - (performance.now() - syncedAt.current));

  const tap = (cell: number) => {
    if (!myTurn || !token) return;
    if (confirm && pending !== cell) { setPending(cell); return; }
    setPending(null);
    // logged with the move: was advice on, for how long, and which rank did the player pick
    const res = hint ? advice.result : null;
    const idx = res ? res.moves.findIndex((m) => m.cell === cell) : -1;
    const info: AdviceInfo = {
      on: hint,
      timeMs: hint ? hintMs : null,
      rank: idx >= 0 ? idx + 1 : null,
      shown: res ? res.moves.length : hint ? 0 : null,
      depth: res ? res.depth : null,
      best: res && res.best >= 0 ? res.best : null,
      score: res && res.moves.length ? res.score : null,
      changes: hint ? timeChanges.current : null,
      stops: hint ? stopPresses.current : null,
      done: hint ? advice.complete : null,
    };
    timeChanges.current = 0;
    stopPresses.current = 0;
    void act(() => sendMove(code, token, cell, info));
  };
  const lastMover: Player | null = room.moves.length ? other(room.turn) : null;
  const canAskUndo = playing && you !== null && lastMover === you && room.undoBy === null;

  const link = `${location.origin}/room/${code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  let status: string;
  if (room.status === 'waiting') {
    status = t('รอเพื่อนเข้าห้อง…', 'Waiting for your friend to join…');
  } else if (playing) {
    if (pending !== null && myTurn) status = t(`แตะ ${cellLabel(pending)} อีกครั้งเพื่อยืนยัน`, `Tap ${cellLabel(pending)} again to confirm`);
    else if (you === null) status = t(`ตาของ${colorName(room.turn)}`, `${colorName(room.turn)} to move`);
    else status = myTurn ? t(`ตาของคุณ (${colorName(room.turn)})`, `Your move (${colorName(room.turn)})`) : t('รอเพื่อนเดิน…', 'Waiting for your friend’s move…');
  } else if (room.winner === 0) {
    status = t('เสมอ กระดานเต็ม', 'Draw: the board is full');
  } else {
    const w = room.winner as Player;
    const loser = other(w);
    // say plainly who won and why, from this viewer's side of the board
    const whoLost = you === null ? colorName(loser) : loser === you ? t('คุณ', 'you') : t('เพื่อน', 'your friend');
    const why = {
      five: t('เรียงครบ 5 ตัว', 'five in a row'),
      time: t(`${whoLost}หมดเวลา`, `${whoLost} ran out of time`),
      resign: t(`${whoLost}ยอมแพ้`, `${whoLost} resigned`),
      draw: '',
    }[room.reason ?? 'five'];
    status = you === null
      ? t(`${colorName(w)}ชนะ · ${why}`, `${colorName(w)} wins · ${why}`)
      : w === you ? t(`คุณชนะ 🎉 · ${why}`, `You win 🎉 · ${why}`) : t(`คุณแพ้ · ${why}`, `You lose · ${why}`);
  }

  const playerCard = (c: Player) => (
    <div className={`player ${playing && room.turn === c ? 'active' : ''} ${room.status === 'finished' && room.winner === c ? 'winner' : ''}`}>
      <span className={`chip-stone ${c === 1 ? 'black' : 'white'}`} />
      <div className="player-info">
        <b>{who(c)} <i className={`dot ${room.online[c - 1] ? 'on' : ''}`} title={room.online[c - 1] ? t('ออนไลน์', 'online') : t('ไม่ได้เชื่อมต่อ', 'not connected')} /></b>
        <span className="muted small">{colorName(c)}{c === 1 ? t(' · เดินก่อน', ' · moves first') : ''}</span>
      </div>
      {room.minutes > 0 && <span className={`clock mono ${clock[c - 1] < 30_000 ? 'low' : ''}`}>{fmt(clock[c - 1])}</span>}
    </div>
  );

  return (
    <main className="page play-page">
      <div className="play-layout">
        <div className="play-board">
          <Board
            board={pauseOn ? HIDDEN_BOARD : board}
            onPlay={myTurn ? tap : undefined}
            lastMove={pauseOn ? null : room.moves[room.moves.length - 1] ?? null}
            winLine={room.winLine}
            heat={pauseOn ? undefined : advice.heat}
            pending={pending !== null && myTurn ? { cell: pending, color: room.turn } : null}
            label={t('กระดานหมากห้าตัว', 'Five-in-a-row board')}
          />
        </div>
        <aside className="play-side">
          <div className="room-head">
            <span className="muted small">{t('รหัสห้อง', 'Room code')}</span>
            <b className="room-code mono">{code}</b>
            <button className="btn sm" onClick={copy}>{copied ? t('คัดลอกแล้ว', 'Copied') : t('คัดลอกลิงก์', 'Copy link')}</button>
            {you === null && <span className="pill">{t('กำลังดู', 'Watching')}</span>}
          </div>
          {room.spectators > 0 && (
            <p className="spectators small">
              <i className="eye" aria-hidden="true" />
              {you === null
                ? t(`ผู้ชมทั้งหมด ${room.spectators} คน (รวมคุณ)`, `${room.spectators} watching (including you)`)
                : t(`มีผู้ชมกำลังดูอยู่ ${room.spectators} คน`, `${room.spectators} ${room.spectators === 1 ? 'spectator is' : 'spectators are'} watching`)}
            </p>
          )}

          {room.status === 'waiting' && (
            <div className="callout">
              {t('ส่งรหัสหรือลิงก์นี้ให้เพื่อน เกมจะเริ่มและนาฬิกาจะเดินทันทีที่เพื่อนเข้าห้อง', 'Send this code or link to your friend. The game and the clock start as soon as they join.')}
              <div className="mono small link-text">{link}</div>
            </div>
          )}

          <div className="players">
            {playerCard(1)}
            {playerCard(2)}
          </div>
          <div className={`status ${room.status === 'finished' ? 'over' : ''}`} role="status" aria-live="polite">{status}</div>

          {playing && room.undoBy !== null && you !== null && token && (
            room.undoBy === you ? (
              <div className="callout ask">
                <span>{t('ส่งคำขอย้อนตาแล้ว รอเพื่อนตอบ', 'Undo requested. Waiting for your friend.')}</span>
                <button className="btn sm" onClick={() => act(() => sendUndo(code, token, 'cancel'))}>{t('ยกเลิกคำขอ', 'Cancel')}</button>
              </div>
            ) : (
              <div className="callout ask">
                <span>{t('เพื่อนขอย้อนตาล่าสุด', 'Your friend asks to take back their last move.')}</span>
                <button className="btn sm primary" onClick={() => act(() => sendUndo(code, token, 'accept'))}>{t('ยอมรับ', 'Accept')}</button>
                <button className="btn sm" onClick={() => act(() => sendUndo(code, token, 'decline'))}>{t('ปฏิเสธ', 'Decline')}</button>
              </div>
            )
          )}
          {playing && room.undoBy !== null && you === null && (
            <div className="callout ask">{t(`${colorName(room.undoBy)}ขอย้อนตา`, `${colorName(room.undoBy)} asked to take back a move`)}</div>
          )}

          {pauseAsked && pause && (
            you === null ? (
              <div className="callout ask">{t(`${colorName(pause.by)}ขอเวลานอก ${pause.seconds} วินาที`, `${colorName(pause.by)} asked for a ${pause.seconds}-second time-out`)}</div>
            ) : pause.by === you ? (
              <div className="callout ask">
                <span>{t(`ขอเวลานอก ${pause.seconds} วินาทีแล้ว รอเพื่อนตอบ (${pauseSecs})`, `Asked for a ${pause.seconds}-second time-out. Waiting for your friend (${pauseSecs})`)}</span>
                <button className="btn sm" onClick={() => act(() => sendPause(code, token, 'cancel'))}>{t('ยกเลิกคำขอ', 'Cancel')}</button>
              </div>
            ) : (
              <div className="callout ask">
                <span>
                  {t(`เพื่อนขอเวลานอก ${pause.seconds} วินาที ตอบภายใน ${pauseSecs} วินาที`, `Your friend asks for a ${pause.seconds}-second time-out. Answer within ${pauseSecs} s`)}
                  <br /><small className="muted">{t('เกมยังเดินต่อระหว่างนี้', 'Play goes on meanwhile.')}</small>
                </span>
                <button className="btn sm primary" onClick={() => act(() => sendPause(code, token, 'accept'))}>{t('ตกลง', 'Agree')}</button>
                <button className="btn sm" onClick={() => act(() => sendPause(code, token, 'decline'))}>{t('ปฏิเสธ', 'Refuse')}</button>
              </div>
            )
          )}

          {room.status === 'finished' && you !== null && token && (
            <div className="callout ask">
              {room.rematchBy === you
                ? <span>{t('ขอเล่นอีกครั้งแล้ว รอเพื่อนตอบรับ', 'Rematch requested. Waiting for your friend.')}</span>
                : (
                  <>
                    <span>{room.rematchBy !== null ? t('เพื่อนขอเล่นอีกครั้ง (สลับสีหมาก)', 'Your friend wants a rematch (colours swap).') : t('เล่นอีกครั้งโดยสลับสีหมาก', 'Play again with colours swapped.')}</span>
                    <button className="btn sm primary" onClick={() => act(() => sendRematch(code, token))}>{room.rematchBy !== null ? t('ตอบรับ', 'Accept') : t('ขอเล่นอีกครั้ง', 'Ask for a rematch')}</button>
                  </>
                )}
            </div>
          )}

          {you !== null && token && (
            <div className="play-actions">
              <button className="btn" disabled={!canAskUndo} onClick={() => act(() => sendUndo(code, token, 'request'))}>{t('ขอย้อนตา', 'Ask to undo')}</button>
              <button className="btn" disabled={!playing || resignAsk} onClick={() => setResignAsk(true)}>{t('ยอมแพ้', 'Resign')}</button>
              <button className="btn wide" disabled={!playing || pauseAsk || pauseAsked || pauseOn} onClick={() => setPauseAsk(true)}>{t('ขอเวลานอก', 'Ask for a time-out')}</button>
            </div>
          )}
          {pauseAsk && playing && you !== null && !pauseAsked && !pauseOn && (
            <div className="callout ask pause-form">
              <label className="pause-range">
                <span>{t(`ขอหยุดเวลา ${pauseSeconds} วินาที`, `Stop the clocks for ${pauseSeconds} seconds`)}</span>
                <input
                  type="range" min={5} max={60} step={5} value={pauseSeconds}
                  onChange={(e) => setPauseSeconds(Number(e.target.value))}
                  aria-label={t('ความยาวของเวลานอก (วินาที)', 'Length of the time-out (seconds)')}
                />
                <small className="muted">{t('เพื่อนมีเวลา 5 วินาทีในการตอบ ระหว่างนั้นเกมเดินต่อตามปกติ ถ้าเพื่อนตกลง นาฬิกาทั้งสองฝ่ายจะหยุดและกระดานจะถูกซ่อน', 'Your friend has 5 seconds to answer, and play goes on meanwhile. If they agree, both clocks stop and the board is hidden.')}</small>
              </label>
              <button className="btn sm primary" onClick={() => { setPauseAsk(false); void act(() => sendPause(code, token, 'request', pauseSeconds)); }}>{t('ส่งคำขอ', 'Send request')}</button>
              <button className="btn sm" onClick={() => setPauseAsk(false)}>{t('ยกเลิก', 'Cancel')}</button>
            </div>
          )}
          {resignAsk && playing && you !== null && (
            <div className="callout ask danger">
              <span>{t('ยอมแพ้เกมนี้ใช่ไหม', 'Resign this game?')}</span>
              <button className="btn sm primary" onClick={() => { setResignAsk(false); void act(() => sendResign(code, token)); }}>{t('ยืนยันยอมแพ้', 'Yes, resign')}</button>
              <button className="btn sm" onClick={() => setResignAsk(false)}>{t('ยกเลิก', 'Cancel')}</button>
            </div>
          )}
          {notice && <p className="notice small">{notice}</p>}
          {problem === 'network' && <p className="notice small">{t('การเชื่อมต่อมีปัญหา กำลังลองใหม่…', 'Connection problem. Retrying…')}</p>}

          {room.status !== 'finished' && (
            <HintBox
              on={hint}
              onToggle={setHint}
              timeMs={hintMs}
              onTime={(ms) => { if (ms !== hintMs) timeChanges.current++; setHintMs(ms); }}
              onStop={() => { stopPresses.current++; }}
              advice={advice}
              active={adviceActive}
              idleText={room.status === 'waiting'
                ? t('จะเริ่มแนะนำเมื่อเกมเริ่ม', 'Advice starts when the game does.')
                : t('จะแนะนำเมื่อถึงตาคุณ', 'Advice appears on your turn.')}
              note={you === null
                ? t('ตัวเลขบนกระดานคืออันดับ 1–5 ของตาที่น่าเดินสำหรับฝ่ายที่กำลังจะเดิน เป็นการประเมิน ไม่ใช่คำตอบที่พิสูจน์แล้ว', 'Numbers on the board rank the top 5 moves for the side to move. It is an estimate, not a proven answer.')
                : t('ตัวเลขบนกระดานคืออันดับ 1–5 ของตาที่น่าเดิน เป็นการประเมิน ไม่ใช่คำตอบที่พิสูจน์แล้ว คำแนะนำแสดงเฉพาะบนเครื่องนี้ เพื่อนไม่เห็น และนาฬิกาของคุณยังเดินระหว่างที่ตัวช่วยคิด', 'Numbers on the board rank the top 5 moves. It is an estimate, not a proven answer. Advice shows on this device only; your friend does not see it, and your clock keeps running while the advisor thinks.')}
            />
          )}

          <label className="check small">
            <input type="checkbox" checked={confirm} onChange={(e) => { setConfirm(e.target.checked); setPending(null); }} />
            <span>{t('แตะสองครั้งเพื่อยืนยันการวางหมาก', 'Tap twice to confirm a move')}</span>
          </label>
          <p className="muted small">
            {t(`เดินไปแล้ว ${room.moves.length} ตา`, `${room.moves.length} moves played`)}
            {' · '}<Link className="inline-link" to="/play">{t('ออกจากห้อง', 'Leave room')}</Link>
          </p>
        </aside>
      </div>
      {pauseOn && pause && (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label={t('เวลานอก', 'Time-out')}>
          <div className="pause-card">
            <span className="tag">{t('เวลานอก', 'Time-out')}</span>
            <div className="pause-count mono" aria-live="off">{pauseSecs}</div>
            <p>
              {you === null
                ? t(`${colorName(pause.by)}ขอเวลานอก ${pause.seconds} วินาที`, `${colorName(pause.by)} asked for a ${pause.seconds}-second time-out`)
                : pause.by === you
                  ? t(`คุณขอเวลานอก ${pause.seconds} วินาที`, `You asked for a ${pause.seconds}-second time-out`)
                  : t(`เพื่อนขอเวลานอก ${pause.seconds} วินาที`, `Your friend asked for a ${pause.seconds}-second time-out`)}
            </p>
            <p className="muted small">{t('นาฬิกาทั้งสองฝ่ายหยุดอยู่ กระดานถูกซ่อนจนกว่าจะหมดเวลานอก แล้วเกมจะเดินต่อเอง', 'Both clocks are stopped. The board is hidden until the time-out ends, then play resumes by itself.')}</p>
          </div>
        </div>
      )}
    </main>
  );
}
