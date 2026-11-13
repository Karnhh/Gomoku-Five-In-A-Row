import { Link } from 'react-router-dom';
import { CandidateDemo, DeepeningDemo, EvalDemo, OrderingBench } from '../components/TheoryWidgets.tsx';
import { useLang } from '../i18n.tsx';

export default function Theory() {
  const { t } = useLang();
  const toc: [string, string][] = [
    ['size', t('1. ทำไมค้นทั้งต้นไม่ได้', '1. Why the full tree is out of reach')],
    ['candidates', t('2. จำกัดตาที่พิจารณา', '2. Limiting candidate moves')],
    ['eval', t('3. Cutoff + Eval', '3. Cutoff + Eval')],
    ['alphabeta', t('4. α–β กับ move ordering', '4. α–β and move ordering')],
    ['deepening', t('5. Iterative deepening', '5. Iterative deepening')],
    ['limits', t('6. ข้อจำกัด', '6. Limits')],
  ];
  return (
    <main className="page theory-page">
      <span className="tag">{t('ทฤษฎี', 'Theory')}</span>
      <h1>{t('เล่นเกมที่ใหญ่เกินกว่าจะค้นจนจบ', 'Playing a game too big to search to the end')}</h1>
      <p className="muted intro">
        {t(
          'ใน Tic-Tac-Toe minimax ค้นได้ถึงใบของ tree ทุกใบ ค่าที่ได้จึงเป็นคำตอบที่แน่นอน หมากห้าตัวใช้ minimax ตัวเดิม แต่ต้องเพิ่มเทคนิคอีก 4 อย่างเพื่อให้ตอบได้ทันเวลา',
          'In Tic-Tac-Toe minimax reaches every leaf of the tree, so its values are exact. Five in a row uses the same minimax, plus four techniques that let it answer in time.',
        )}
      </p>
      <nav className="toc">
        {toc.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <section className="t-section" id="size">
        <h2>{t('1. ทำไมค้นทั้งต้นไม่ได้', '1. Why the full tree is out of reach')}</h2>
        <p>
          {t(
            'Minimax ใช้เวลา O(bᵐ) เมื่อ b คือจำนวนตาที่เลือกได้ต่อครั้ง และ m คือความลึกของเกม Tic-Tac-Toe มี b ไม่เกิน 9 และ m ไม่เกิน 9 ทั้งต้นจึงมีแค่ 549,946 node',
            'Minimax takes O(bᵐ) time, where b is the number of moves available and m is the length of the game. Tic-Tac-Toe has b ≤ 9 and m ≤ 9, so the whole tree is only 549,946 nodes.',
          )}
        </p>
        <table className="data-table">
          <thead><tr><th /><th>Tic-Tac-Toe</th><th>{t('หมากห้าตัว 15×15', 'Five in a row 15×15')}</th></tr></thead>
          <tbody>
            <tr><td>{t('จำนวนช่อง', 'Points')}</td><td className="mono">9</td><td className="mono">225</td></tr>
            <tr><td>{t('ตาที่เลือกได้ในตาแรก (b)', 'Moves on the first turn (b)')}</td><td className="mono">9</td><td className="mono">225</td></tr>
            <tr><td>{t('วิธีวางหมากบนกระดาน (ขอบบน)', 'Ways to fill the board (upper bound)')}</td><td className="mono">3⁹ = 19,683</td><td className="mono">3²²⁵ ≈ 10¹⁰⁷</td></tr>
            <tr><td>{t('ขนาด game tree', 'Game-tree size')}</td><td className="mono">549,946</td><td className="num">{t('ประมาณ 10⁷⁰', 'about 10⁷⁰')}</td></tr>
          </tbody>
        </table>
        <h3>{t('ถ้าจะค้นให้ครบทุกแบบ ต้องรอนานแค่ไหน', 'How long would searching everything take?')}</h3>
        <p>
          {t(
            'ตัวคำนวณในเว็บนี้ค้นได้ราว 10⁵ node ต่อวินาทีบนเครื่องทั่วไป หนึ่งปีมีประมาณ 3 × 10⁷ วินาที จึงค้นได้ปีละราว 3 × 10¹² node การไล่ game tree ขนาด 10⁷⁰ node ให้ครบจึงใช้เวลาราว 10⁵⁷ ปี ขณะที่จักรวาลมีอายุประมาณ 1.4 × 10¹⁰ ปี',
            'The engine on this site searches about 10⁵ nodes per second on an ordinary machine. A year has about 3 × 10⁷ seconds, so that is roughly 3 × 10¹² nodes a year. Walking a game tree of 10⁷⁰ nodes would therefore take about 10⁵⁷ years, while the universe is about 1.4 × 10¹⁰ years old.',
          )}
        </p>
        <table className="data-table">
          <thead><tr><th>{t('สมมติว่า', 'Suppose')}</th><th>{t('node ที่ต้องค้น', 'Nodes to search')}</th><th>{t('เวลาที่ใช้', 'Time needed')}</th><th>{t('เทียบกับอายุจักรวาล', 'Versus the age of the universe')}</th></tr></thead>
          <tbody>
            <tr><td>{t('เว็บนี้ตามที่เป็นอยู่', 'This site as it is')}</td><td className="mono">10⁷⁰</td><td className="num">{t('~10⁵⁷ ปี', '~10⁵⁷ years')}</td><td className="num">{t('10⁴⁷ เท่า', '10⁴⁷ times')}</td></tr>
            <tr><td>{t('เครื่องเร็วขึ้นล้านเท่า', 'A machine a million times faster')}</td><td className="mono">10⁷⁰</td><td className="num">{t('~10⁵¹ ปี', '~10⁵¹ years')}</td><td className="num">{t('10⁴¹ เท่า', '10⁴¹ times')}</td></tr>
            <tr><td>{t('α–β ที่เรียงตาได้สมบูรณ์แบบ', 'α–β with perfect move ordering')}</td><td className="mono">√10⁷⁰ = 10³⁵</td><td className="num">{t('~10²² ปี', '~10²² years')}</td><td className="num">{t('ล้านล้านเท่า', 'a trillion times')}</td></tr>
            <tr><td>{t('ทั้งสองอย่างพร้อมกัน', 'Both at once')}</td><td className="mono">10³⁵</td><td className="num">{t('~10¹⁶ ปี', '~10¹⁶ years')}</td><td className="num">{t('ล้านเท่า', 'a million times')}</td></tr>
          </tbody>
        </table>
        <p className="muted small">
          {t(
            'ตัวเลขเป็นค่าประมาณระดับเลขยกกำลัง แถวที่สามใช้สูตร O(b^(m/2)) ของ α–β ในกรณีดีที่สุด ซึ่งทำจริงไม่ได้ เพราะถ้ารู้ลำดับตาที่สมบูรณ์แบบก็ไม่ต้องค้นแล้ว ข้อสรุปคือความเร็วเครื่องช่วยไม่ได้ ต้องเปลี่ยนวิธีค้น',
            'These are order-of-magnitude estimates. The third row uses α–β’s best-case O(b^(m/2)), which is not achievable in practice: if we knew the perfect order there would be nothing left to search. The conclusion is that speed cannot save us; the method has to change.',
          )}
        </p>
        <p>
          {t(
            'สไลด์บทที่ 6 ยกตัวอย่างงบเวลาไว้ว่า ถ้ามีเวลา 100 วินาทีต่อตา และค้นได้ 10⁴ node ต่อวินาที จะค้นได้ 10⁶ node ต่อตา ตัวเลขนี้ห่างจาก 10⁷⁰ มากจนเครื่องที่เร็วขึ้นล้านเท่าก็ไม่ช่วย สถานการณ์เดียวกับหมากรุก ทางออกมาตรฐานคือ',
            'The Chapter 6 slides give a budget example: with 100 seconds per move and 10⁴ nodes per second, we can search 10⁶ nodes per move. That is so far from 10⁷⁰ that a machine a million times faster would not help. It is the same situation as chess, and the standard way out is:',
          )}
        </p>
        <ul className="t-list">
          <li><b>Cutoff test</b> {t('หยุดค้นเมื่อถึงความลึกที่กำหนด แทนที่จะรอจนเกมจบ', 'stop at a depth limit instead of waiting for the game to end')}</li>
          <li><b>Evaluation function</b> {t('ประเมินว่าตำแหน่งที่หยุดนั้นดีแค่ไหน แทนค่า utility จริง', 'estimate how good the position is, in place of the true utility')}</li>
        </ul>
      </section>

      <section className="t-section" id="candidates">
        <h2>{t('2. จำกัดตาที่พิจารณา', '2. Limiting candidate moves')}</h2>
        <p>
          {t(
            'ลด b ก่อนเป็นอันดับแรก เพราะ b เป็นฐานของ bᵐ ถ้าพิจารณาทั้ง 200 กว่าช่อง การมองล่วงหน้า 4 ตาต้องใช้ 200⁴ = 1.6 พันล้าน node แต่ถ้าเหลือ 10 ช่อง จะใช้แค่ 10⁴ = 10,000 node',
            'Reduce b first, since b is the base of bᵐ. Looking 4 moves ahead over 200-odd points costs 200⁴ = 1.6 billion nodes; over 10 points it costs 10⁴ = 10,000.',
          )}
        </p>
        <CandidateDemo />
      </section>

      <section className="t-section" id="eval">
        <h2>{t('3. Cutoff + Eval', '3. Cutoff + Eval')}</h2>
        <p>
          {t(
            'ตามสไลด์ MinimaxCutoff เหมือน MinimaxValue ทุกอย่าง ยกเว้นสองจุด: เปลี่ยน Terminal? เป็น Cutoff? และเปลี่ยน Utility เป็น Eval',
            'Per the slides, MinimaxCutoff is identical to MinimaxValue except for two things: Terminal? becomes Cutoff?, and Utility becomes Eval.',
          )}
        </p>
        <pre className="code">{`function AlphaBeta(state, depth, α, β):
    if state has five in a row  →  return ±WIN        ← Terminal?
    if depth = 0                →  return Eval(state)  ← Cutoff?
    for each move in Candidates(state), best first:
        v ← −AlphaBeta(Result(state, move), depth − 1, −β, −α)
        α ← max(α, v)
        if α ≥ β  →  break                             ← prune
    return α`}</pre>
        <p>
          {t(
            'สไลด์เสนอ Eval แบบผลรวมเชิงเส้นถ่วงน้ำหนักของ feature: Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s) สำหรับหมากรุก feature คือจำนวนหมากแต่ละชนิด สำหรับหมากห้าตัว เว็บนี้ใช้จำนวน "แนว 5 ช่องที่ยังเรียงได้" แยกตามจำนวนหมากที่มีอยู่ในแนว',
            'The slides propose a weighted linear sum of features: Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s). In chess the features are piece counts. For five in a row this site counts the "lines of five that can still be completed", grouped by how many stones they already hold.',
          )}
        </p>
        <EvalDemo />
        <div className="callout note">
          {t(
            'มีกฎเสริมสองข้อ: ถ้าฝ่ายที่กำลังจะเดินมีแนวที่มี 4 ตัวอยู่แล้ว ให้คะแนนสูงมากเพราะตาหน้าเรียงห้าได้ และถ้าอีกฝ่ายมีเรียงสี่ที่ต้องกันสองจุด ให้คะแนนต่ำมากเพราะกันไม่ทัน',
            'Two extra rules: if the side to move already has a line with 4 stones, the score is very high because it makes five next move; and if the opponent has fours that need two different blocks, the score is very low because both cannot be stopped.',
          )}
        </div>
        <p>
          {t(
            'สไลด์ยังชี้ว่าในเกมที่ไม่มีการสุ่ม ค่าที่แน่นอนของ Eval ไม่สำคัญ สำคัญแค่ลำดับ การแปลงค่าแบบ monotonic ใด ๆ ให้ผลการเลือกตาเหมือนเดิม น้ำหนัก 1, 12, 120, 1500 จึงไม่จำเป็นต้องแม่นยำ ขอแค่เรียงความสำคัญถูก',
            'The slides also point out that in deterministic games the exact Eval values do not matter, only their order: any monotonic transformation picks the same moves. So the weights 1, 12, 120, 1500 need not be precise as long as they rank things correctly.',
          )}
        </p>
      </section>

      <section className="t-section" id="alphabeta">
        <h2>{t('4. α–β กับ move ordering', '4. α–β and move ordering')}</h2>
        <p>
          {t(
            'α–β pruning ตัดกิ่งที่ไม่มีทางเปลี่ยนคำตอบ โดยไม่กระทบผลลัพธ์ สไลด์สรุปว่าประสิทธิภาพขึ้นกับลำดับการลองตา ถ้าเรียงได้สมบูรณ์แบบ เวลาจะเหลือ O(b^(m/2)) ซึ่งเท่ากับค้นได้ลึกขึ้นเป็นสองเท่าในเวลาเท่าเดิม',
            'α–β pruning removes branches that cannot change the answer, without affecting the result. The slides note that its effectiveness depends on move order: with perfect ordering the time drops to O(b^(m/2)), which doubles the depth reachable in the same time.',
          )}
        </p>
        <p>
          {t(
            'เว็บนี้เรียงตาด้วยคะแนนแบบเร็ว: ตาที่ต่อแนวของเราหรือขวางแนวของอีกฝ่ายได้มากจะถูกลองก่อน การทดลองด้านล่างใช้ตำแหน่งเดียวกัน ความลึกเท่ากัน และชุดตาเดียวกัน เปลี่ยนแค่การตัดกิ่งและลำดับ',
            'This site orders moves with a quick score: moves that extend our lines or break the opponent’s are tried first. The experiment below uses the same position, depth and set of moves, and changes only pruning and order.',
          )}
        </p>
        <OrderingBench />
      </section>

      <section className="t-section" id="deepening">
        <h2>{t('5. Iterative deepening', '5. Iterative deepening')}</h2>
        <p>
          {t(
            'เราไม่รู้ล่วงหน้าว่าในเวลา 1 วินาทีจะค้นได้ลึกแค่ไหน จึงค้นลึก 1 ชั้นก่อน แล้ว 2, 3, 4 ไปเรื่อย ๆ จนหมดเวลา แล้วใช้คำตอบของชั้นลึกสุดที่ค้นเสร็จ ดูเหมือนเปลืองเพราะต้องค้นซ้ำ แต่ tree โตแบบ exponential งานของชั้นตื้นทั้งหมดจึงเล็กมากเมื่อเทียบกับชั้นสุดท้าย',
            'We cannot know in advance how deep one second will take us. So the search runs to depth 1, then 2, 3, 4 and so on until time runs out, and uses the answer of the deepest finished iteration. It looks wasteful, but the tree grows exponentially, so all the shallow iterations are tiny next to the last one.',
          )}
        </p>
        <p>
          {t(
            'มีผลพลอยได้: ตาที่ดีที่สุดจากชั้นก่อนหน้าจะถูกลองเป็นตาแรกในชั้นถัดไป ทำให้ α–β ตัดได้มากขึ้น',
            'There is a bonus: the best move from the previous iteration is tried first in the next one, which makes α–β prune more.',
          )}
        </p>
        <DeepeningDemo />
        <p className="muted small">
          {t(
            'การค้นทั้งหมดรันใน Web Worker ซึ่งเป็น thread แยกจากหน้าเว็บ หน้าจอจึงไม่ค้างระหว่างคิด',
            'All searching runs in a Web Worker, a thread separate from the page, so the screen never freezes while it thinks.',
          )}
        </p>
      </section>

      <section className="t-section" id="limits">
        <h2>{t('6. ข้อจำกัด', '6. Limits')}</h2>
        <ul className="t-list">
          <li>
            <b>{t('เป็นการประเมิน ไม่ใช่การพิสูจน์', 'An estimate, not a proof')}</b>{' '}
            {t('คะแนนมาจาก Eval ที่ความลึกจำกัด ถ้าค้นลึกขึ้นอีกชั้น คำแนะนำอาจเปลี่ยน', 'Scores come from Eval at a limited depth. One more ply can change the advice.')}
          </li>
          <li>
            <b>Horizon effect</b>{' '}
            {t('ภัยคุกคามที่อยู่เลยความลึกที่ค้นไปหนึ่งตาจะมองไม่เห็น สไลด์จึงแนะนำ quiescence search คือค้นต่อเมื่อตำแหน่งยังไม่นิ่ง ซึ่งเว็บนี้ยังไม่ได้ทำ', 'A threat one move past the search depth is invisible. The slides suggest quiescence search, searching on while the position is not quiet; this site does not do that yet.')}
          </li>
          <li>
            <b>{t('คะแนนแกว่งระหว่างความลึกคี่กับคู่', 'Scores swing between odd and even depths')}</b>{' '}
            {t('ที่ความลึกคี่ ฝ่ายเราได้เดินมากกว่าอีกฝ่ายหนึ่งตา Eval จึงสูงกว่าที่ความลึกคู่ เห็นได้จากตารางในหัวข้อ 5 ควรเทียบคะแนนที่ความลึกเดียวกันเท่านั้น', 'At odd depths our side has made one more move than the opponent, so Eval comes out higher than at even depths, as the table in section 5 shows. Only compare scores from the same depth.')}
          </li>
          <li>
            <b>{t('ตาที่ถูกตัดออกตั้งแต่ต้น', 'Moves dropped up front')}</b>{' '}
            {t('การเก็บแค่ 10–14 ตาต่อ node ทำให้เร็ว แต่อาจพลาดตาแปลก ๆ ที่ดี', 'Keeping 10–14 moves per node is fast but can miss a good unusual move.')}
          </li>
          <li>
            <b>{t('ฝ่ายเดินก่อนได้เปรียบ', 'The first player has the edge')}</b>{' '}
            {t('หมากห้าตัวแบบไม่มีกติกาเสริมบนกระดาน 15×15 ถูกพิสูจน์แล้วว่าฝ่ายดำชนะได้ถ้าเล่นสมบูรณ์แบบ (Allis และคณะ) โดยใช้เทคนิคค้นหาเฉพาะทาง ไม่ใช่ α–β ทั่วไปแบบในเว็บนี้', 'Five in a row without extra rules on a 15×15 board has been proved a win for Black with perfect play (Allis et al.), using specialised search techniques rather than the plain α–β used here.')}
          </li>
        </ul>
        <div className="hero-actions">
          <Link to="/analyze" className="btn primary">{t('ลองตัวช่วยแนะนำตา →', 'Try the advisor →')}</Link>
          <Link to="/patterns" className="btn">{t('ดูรูปแบบหมาก', 'See the patterns')}</Link>
        </div>
      </section>
    </main>
  );
}
