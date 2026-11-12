import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { First } from '@gomoku/shared/room';
import { createRoom, saveToken } from '../online/api.ts';
import { useLang } from '../i18n.tsx';

/** Create a room (choosing who moves first) or enter a friend's room code. */
export default function OnlineLobby() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [first, setFirst] = useState<First>('random');
  const [minutes, setMinutes] = useState(5);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const firstOptions: [First, string][] = [
    ['me', t('ฉันเดินก่อน', 'Me')],
    ['opponent', t('เพื่อนเดินก่อน', 'My friend')],
    ['random', t('สุ่ม', 'Random')],
  ];

  async function create() {
    setBusy(true);
    setError('');
    try {
      const r = await createRoom(first, minutes);
      saveToken(r.code, r.token);
      navigate(`/room/${r.code}`);
    } catch {
      setError(t('ติดต่อ server ไม่ได้ ตรวจว่าเปิด API ไว้แล้ว (npm run dev:server)', 'Could not reach the server. Check that the API is running (npm run dev:server).'));
      setBusy(false);
    }
  }

  const clean = code.trim().toUpperCase();
  return (
    <section className="card setup-card">
      <h2>{t('เล่นออนไลน์ด้วยรหัสห้อง', 'Online with a room code')}</h2>
      <div className="field">
        <span className="field-label">{t('ใครเดินก่อน (ถือหมากดำ)', 'Who moves first (plays black)')}</span>
        <div className="seg">
          {firstOptions.map(([v, label]) => (
            <button key={v} className={first === v ? 'on' : ''} onClick={() => setFirst(v)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">{t('เวลาคิดรวมของแต่ละคน', 'Total thinking time per player')}</span>
        <div className="seg">
          {[0, 3, 5, 10].map((m) => (
            <button key={m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>
              {m === 0 ? t('ไม่จับเวลา', 'No clock') : t(`${m} นาที`, `${m} min`)}
            </button>
          ))}
        </div>
      </div>
      <button className="btn primary big" onClick={create} disabled={busy}>{busy ? t('กำลังสร้าง…', 'Creating…') : t('สร้างห้อง', 'Create room')}</button>
      {error && <p className="notice small">{error}</p>}

      <form className="join-row" onSubmit={(e) => { e.preventDefault(); if (clean.length === 5) navigate(`/room/${clean}`); }}>
        <label className="field">
          <span className="field-label">{t('หรือใส่รหัสห้องของเพื่อน', 'Or enter your friend’s room code')}</span>
          <input
            className="code-input mono"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5))}
            placeholder="K7P2Q"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label={t('รหัสห้อง', 'Room code')}
          />
        </label>
        <button className="btn" type="submit" disabled={clean.length !== 5}>{t('เข้าห้อง', 'Join')}</button>
      </form>
    </section>
  );
}
