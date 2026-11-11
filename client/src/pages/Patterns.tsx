import { Link } from 'react-router-dom';
import Board from '../components/Board.tsx';
import type { Mark } from '../components/Board.tsx';
import { PATTERNS, analyzeLink, cells, setupBoard } from '../data/positions.ts';
import type { Pattern } from '../data/positions.ts';
import { useLang } from '../i18n.tsx';

function PatternCard({ p }: { p: Pattern }) {
  const { t, m } = useLang();
  const board = setupBoard(p.setup);
  const marks: Mark[] = [
    ...cells(p.keys ?? '').map((cell) => ({ cell, kind: 'key' as const })),
    ...cells(p.blocks ?? '').map((cell) => ({ cell, kind: 'block' as const })),
  ];
  return (
    <article className="card pattern" id={p.id}>
      <div className="pattern-board">
        <Board board={board} view={p.view} marks={marks} coords={false} label={m(p.name)} />
      </div>
      <div className="pattern-body">
        <h3>{m(p.name)}</h3>
        <p className="muted">{m(p.desc)}</p>
        <Link className="btn" to={analyzeLink(board, p.setup.turn)}>{t('ลองบนกระดานวิเคราะห์ →', 'Try on the analysis board →')}</Link>
      </div>
    </article>
  );
}

export default function Patterns() {
  const { t } = useLang();
  return (
    <main className="page">
      <span className="tag">{t('รูปแบบหมาก', 'Patterns')}</span>
      <h1>{t('คลังรูปแบบหมาก', 'Pattern library')}</h1>
      <p className="muted intro">
        {t(
          'รูปแบบเหล่านี้คือสิ่งที่ทั้งคนและฟังก์ชัน Eval ใช้มองกระดาน ตัวอย่างทั้งหมดเป็นของฝ่ายดำ',
          'These shapes are how both people and the evaluation function read the board. All examples show Black’s stones.',
        )}
      </p>
      <div className="legend-row muted small">
        <span><i className="lg key">★</i> {t('จุดที่ฝ่ายดำควรเดิน', 'where Black should play')}</span>
        <span><i className="lg block">✕</i> {t('จุดที่ฝ่ายขาวต้องกัน', 'where White must block')}</span>
      </div>

      <h2 className="section-title">{t('รูปแบบพื้นฐาน', 'Basic shapes')}</h2>
      <div className="pattern-grid">
        {PATTERNS.filter((p) => p.group === 'basic').map((p) => <PatternCard key={p.id} p={p} />)}
      </div>

      <h2 className="section-title">{t('Fork: บีบให้กันสองทางพร้อมกัน', 'Forks: two threats at once')}</h2>
      <p className="muted">
        {t(
          'อีกฝ่ายเดินได้ทีละตา ถ้าตาเดียวของเราสร้างภัยคุกคามสองแนว เขาจะกันได้แค่แนวเดียว นี่คือวิธีชนะหลักของเกมนี้',
          'The opponent gets one move at a time. If one move of ours creates two threats, only one can be stopped. This is the main way games are won.',
        )}
      </p>
      <div className="pattern-grid">
        {PATTERNS.filter((p) => p.group === 'fork').map((p) => <PatternCard key={p.id} p={p} />)}
      </div>

      <div className="callout note">
        {t(
          'ลำดับความเร่งด่วนเมื่อถึงตาเรา: (1) ถ้าเรียงห้าได้ให้เรียงเลย (2) ถ้าอีกฝ่ายมีสี่ ต้องกัน (3) ถ้าเรามีสามเปิด ให้ต่อเป็นสี่เปิด (4) ถ้าอีกฝ่ายมีสามเปิด ต้องกัน (5) มองหา fork',
          'Priorities on your move: (1) make five if you can; (2) block an enemy four; (3) turn your open three into an open four; (4) block an enemy open three; (5) look for a fork.',
        )}
      </div>
    </main>
  );
}
