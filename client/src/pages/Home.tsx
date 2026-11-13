import { Link } from 'react-router-dom';
import Board from '../components/Board.tsx';
import { HOME_POSITION, setupBoard } from '../data/positions.ts';
import { useLang } from '../i18n.tsx';

const board = setupBoard(HOME_POSITION);

export default function Home() {
  const { t } = useLang();
  const features = [
    {
      to: '/play', tag: t('เล่น', 'Play'),
      title: t('กระดานเล่นกับเพื่อน', 'Play with a friend'),
      body: t('กระดาน 15×15 สองคนบนเครื่องเดียว มีนาฬิกาคนละ 5 นาที ย้อนตา และแตะสองครั้งเพื่อยืนยัน', 'A 15×15 board for two on one device, with a 5-minute clock each, undo, and tap-twice-to-confirm.'),
    },
    {
      to: '/theory', tag: t('ทฤษฎี', 'Theory'),
      title: t('ทำไมค้นทั้งต้นไม่ได้', 'Why the full tree is out of reach'),
      body: t('จำกัดตาที่พิจารณา cutoff + Eval, α–β กับ move ordering และ iterative deepening พร้อม demo ที่รันจริง', 'Limiting candidate moves, cutoff + Eval, α–β with move ordering and iterative deepening, with demos that really run.'),
    },
    {
      to: '/patterns', tag: t('รูปแบบหมาก', 'Patterns'),
      title: t('คลังรูปแบบหมาก', 'Pattern library'),
      body: t('สี่เปิด สามเปิด สามแยก และ fork แบบ 4-3, 4-4, 3-3 เปิดบนกระดานวิเคราะห์เพื่อลองเดินต่อได้', 'Open four, open three, split three and the 4-3, 4-4, 3-3 forks. Open any of them on the analysis board.'),
    },
    {
      to: '/analyze', tag: t('ตาต่อไป', 'Next move'),
      title: t('แนะนำตา + heatmap + tree ย่อย', 'Advisor, heatmap and sub-tree'),
      body: t('ตัวคำนวณ α–β ใน Web Worker ให้คะแนนทุกตาที่น่าสนใจ และแสดง tree 2 ชั้นพร้อมกิ่งที่ถูกตัด', 'An α–β engine in a Web Worker scores every promising move and draws a 2-ply tree with its pruned branches.'),
    },
  ];
  const stats = [
    ['5', t('ตัวติดกันเพื่อชนะ', 'in a row to win')],
    ['225', t('จุดตัดบนกระดาน 15×15', 'points on the 15×15 board')],
    ['572', t('แนว 5 ช่องที่เป็นไปได้', 'possible lines of five')],
    ['~10⁷⁰', t('ขนาด game tree โดยประมาณ', 'estimated game-tree size')],
  ];

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>{t('หมากห้าตัว', 'Five in a Row')}</h1>
          <p className="lead">
            {t(
              'เกมกระดาน 15×15 ที่ใครเรียงหมากได้ห้าตัวติดกันก่อนเป็นฝ่ายชนะ เล่นกับเพื่อน ขอคำแนะนำว่าตาต่อไปควรวางตรงไหน และเรียนรู้รูปแบบหมากกับวิธีคิดของ AI ได้ในเว็บนี้',
              'A 15×15 board game where the first to line up five stones wins. Play with a friend, ask where to play next, and learn the key shapes and how the AI thinks.',
            )}
          </p>
          <div className="hero-actions">
            <Link to="/play" className="btn primary">{t('เริ่มเล่น', 'Start playing')}</Link>
            <Link to="/theory" className="btn">{t('อ่านทฤษฎี', 'Read the theory')}</Link>
            <Link to="/manual" className="btn">{t('คู่มือการใช้งาน', 'User manual')}</Link>
          </div>
        </div>
        <div className="hero-board">
          <Board board={board} view={[3, 3, 11, 11]} coords={false} />
        </div>
      </section>

      <section className="features">
        {features.map((f) => (
          <Link key={f.to} to={f.to} className="card feature">
            <span className="tag">{f.tag}</span>
            <h3>{f.title}</h3>
            <p className="muted">{f.body}</p>
            <span className="go">{t('เปิด →', 'Open →')}</span>
          </Link>
        ))}
      </section>

      <section className="stats">
        {stats.map(([n, l]) => (
          <div key={l} className="card stat">
            <div className="num">{n}</div>
            <div className="lbl">{l}</div>
          </div>
        ))}
      </section>

      <section className="card rules-card">
        <h2>{t('กติกาโดยย่อ', 'Rules in brief')}</h2>
        <ul className="t-list">
          <li>{t('กระดานมีเส้น 15×15 วางหมากบนจุดตัดของเส้น', 'The board has 15×15 lines; stones go on the intersections.')}</li>
          <li>{t('หมากดำเดินก่อน แล้วสลับกันวางทีละตัว', 'Black moves first, then the players alternate, one stone each.')}</li>
          <li>{t('ใครเรียงหมากสีตัวเองได้ 5 ตัวติดกันก่อน ในแนวนอน แนวตั้ง หรือแนวทแยง เป็นฝ่ายชนะ และเกมจบทันที', 'The first to get five of their stones in a row, horizontally, vertically or diagonally, wins and the game ends at once.')}</li>
          <li>{t('ถ้ากระดานเต็มโดยไม่มีใครเรียงได้ ถือว่าเสมอ', 'If the board fills up with no five, the game is a draw.')}</li>
        </ul>
      </section>
    </main>
  );
}
