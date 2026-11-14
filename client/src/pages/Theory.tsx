import { Link } from 'react-router-dom';
import MinimaxDemo from '../components/MinimaxDemo.tsx';
import { CandidateDemo, DeepeningDemo, EvalDemo, OrderingBench } from '../components/TheoryWidgets.tsx';
import { useLang } from '../i18n.tsx';

export default function Theory() {
  const { t } = useLang();
  const toc: [string, string][] = [
    ['tree', t('1. เกมในสายตาของ AI', '1. The game as an AI sees it')],
    ['minimax', t('2. Minimax', '2. Minimax')],
    ['pruning', t('3. α–β pruning', '3. α–β pruning')],
    ['size', t('4. ทำไมค้นทั้งต้นไม่ได้', '4. Why the full tree is out of reach')],
    ['candidates', t('5. จำกัดตาที่พิจารณา', '5. Limiting candidate moves')],
    ['eval', t('6. Cutoff + Eval', '6. Cutoff + Eval')],
    ['ordering', t('7. Move ordering', '7. Move ordering')],
    ['deepening', t('8. Iterative deepening', '8. Iterative deepening')],
    ['limits', t('9. ข้อจำกัด', '9. Limits')],
  ];
  return (
    <main className="page theory-page">
      <span className="tag">{t('ทฤษฎี', 'Theory')}</span>
      <h1>{t('AI เลือกตาเดินอย่างไร', 'How the AI chooses a move')}</h1>
      <p className="muted intro">
        {t(
          'หน้านี้อธิบายวิธีคิดของตัวช่วยแนะนำตาตั้งแต่ต้น ข้อ 1–3 คือพื้นฐานที่ใช้ได้กับเกมกระดานสองคนทุกเกม ข้อ 4–8 คือสิ่งที่ต้องเพิ่มเมื่อเกมใหญ่เกินกว่าจะคิดไปจนจบเกมได้ ไม่ต้องมีพื้นมาก่อน',
          'This page explains how the move advisor thinks, from the beginning. Sections 1–3 are the basics, which apply to any two-player board game. Sections 4–8 are what has to be added when a game is too big to think through to the end. No background is needed.',
        )}
      </p>
      <nav className="toc">
        {toc.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <section className="t-section" id="tree">
        <h2>{t('1. เกมในสายตาของ AI', '1. The game as an AI sees it')}</h2>
        <p>
          {t(
            'หมากห้าตัวเป็นเกมที่มีผู้เล่นสองคนผลัดกันเดิน ทั้งสองฝ่ายเห็นกระดานทั้งหมด ไม่มีการสุ่มอย่างลูกเต๋าหรือไพ่ และถ้าฝ่ายหนึ่งชนะ อีกฝ่ายก็แพ้ เกมแบบนี้ (เช่นเดียวกับหมากรุก หมากฮอส และโกะ) คิดด้วยวิธีเดียวกันได้ทั้งหมด',
            'Five in a row is a game where two players take turns, both see the whole board, nothing is random (no dice, no cards), and one side’s win is the other’s loss. Games of this kind, like chess, checkers and Go, can all be reasoned about in the same way.',
          )}
        </p>
        <p>
          {t(
            'วิธีนั้นคือการมองล่วงหน้า: "ถ้าฉันเดินตรงนี้ เขาจะตอบตรงไหนได้บ้าง แล้วฉันจะตอบต่อยังไง" เมื่อเขียนความเป็นไปได้ทั้งหมดออกมาจะได้แผนภาพที่แตกกิ่งออกไปเรื่อย ๆ เรียกว่า game tree',
            'That way is to look ahead: "if I play here, where can they answer, and what do I do then?" Writing all the possibilities down gives a diagram that keeps branching, called a game tree.',
          )}
        </p>
        <table className="data-table">
          <thead><tr><th>{t('คำ', 'Term')}</th><th>{t('ความหมาย', 'Meaning')}</th></tr></thead>
          <tbody>
            <tr><td><b>{t('ราก (root)', 'Root')}</b></td><td>{t('ตำแหน่งบนกระดานตอนนี้', 'the position on the board right now')}</td></tr>
            <tr><td><b>{t('กิ่ง', 'Branch')}</b></td><td>{t('ตาเดินหนึ่งตา', 'one move')}</td></tr>
            <tr><td><b>Node</b></td><td>{t('ตำแหน่งที่เกิดขึ้นหลังเดินตามกิ่งนั้น', 'the position reached after that move')}</td></tr>
            <tr><td><b>{t('ใบ (leaf)', 'Leaf')}</b></td><td>{t('ตำแหน่งที่เราหยุดมองต่อ เช่น เกมจบแล้ว แต่ละใบมีคะแนนกำกับ', 'a position where we stop looking, for example because the game is over; each leaf carries a score')}</td></tr>
            <tr><td><b>Ply</b></td><td>{t('การเดินหนึ่งครั้งของฝ่ายใดฝ่ายหนึ่ง "มองล่วงหน้า 2 ply" คือเราเดินหนึ่งตาและเขาตอบหนึ่งตา', 'one move by one player; "looking 2 plies ahead" means one move of ours and one reply')}</td></tr>
            <tr><td><b>MAX {t('และ', 'and')} MIN</b></td><td>{t('ชื่อเรียกผู้เล่นสองฝ่าย คะแนนคิดจากมุมของ MAX เสมอ MAX จึงอยากได้คะแนนมากที่สุด ส่วน MIN อยากให้น้อยที่สุด', 'the names of the two players. Scores are always from MAX’s side, so MAX wants the highest score and MIN wants the lowest')}</td></tr>
          </tbody>
        </table>
        <p className="muted small">
          {t(
            'ในเว็บนี้ MAX คือฝ่ายที่กำลังจะเดิน ซึ่งเป็นฝ่ายที่ตัวช่วยกำลังแนะนำตาให้',
            'On this site MAX is the side about to move, the side the advisor is choosing a move for.',
          )}
        </p>
      </section>

      <section className="t-section" id="minimax">
        <h2>{t('2. Minimax', '2. Minimax')}</h2>
        <p>
          {t(
            'Minimax คือวิธีเลือกตาเดินโดยสมมติว่าคู่แข่งจะเล่นดีที่สุดเสมอ เราไม่หวังให้เขาพลาด แต่เลือกตาที่ให้ผลดีที่สุดในกรณีที่เขาตอบได้ดีที่สุด วิธีคิดเริ่มจากใบแล้วไล่กลับขึ้นมาหาราก:',
            'Minimax chooses a move by assuming the opponent always plays their best. We do not hope for a mistake; we pick the move with the best outcome given their best reply. The reasoning starts at the leaves and works back up to the root:',
          )}
        </p>
        <ol className="steps">
          <li>{t('ใบแต่ละใบมีคะแนนอยู่แล้ว', 'Each leaf already has a score.')}</li>
          <li>{t('ที่ node ของ MIN (ตาของคู่แข่ง) ค่าของ node คือค่าที่น้อยที่สุดในบรรดาลูกของมัน เพราะคู่แข่งจะเลือกทางที่แย่ที่สุดสำหรับเรา', 'At a MIN node (the opponent’s turn) the value is the smallest value among its children, because the opponent picks what is worst for us.')}</li>
          <li>{t('ที่ node ของ MAX (ตาของเรา) ค่าของ node คือค่าที่มากที่สุดในบรรดาลูกของมัน', 'At a MAX node (our turn) the value is the largest value among its children.')}</li>
          <li>{t('ที่ราก เราเดินตาที่นำไปสู่ลูกที่มีค่ามากที่สุด', 'At the root we play the move leading to the child with the largest value.')}</li>
        </ol>
        <p>{t('ลองกดไล่ดูทีละขั้นในต้นไม้ตัวอย่างนี้ ซึ่งมองล่วงหน้า 2 ply:', 'Step through this example tree, which looks 2 plies ahead:')}</p>
        <MinimaxDemo alphaBeta={false} />
        <p>
          {t(
            'สังเกตว่าตา C มีใบค่า 14 ซึ่งสูงที่สุดในต้นไม้ แต่ minimax ไม่เลือก C เพราะคู่แข่งจะไม่ยอมให้เราไปถึงใบนั้น เขาจะตอบให้เราได้แค่ 2',
            'Notice that move C has a leaf worth 14, the highest in the tree, yet minimax does not choose C: the opponent will not let us reach that leaf and will answer so that we get only 2.',
          )}
        </p>
        <table className="data-table">
          <thead><tr><th>{t('คุณสมบัติของ minimax', 'Properties of minimax')}</th><th /></tr></thead>
          <tbody>
            <tr><td>{t('หาคำตอบได้เสมอไหม', 'Does it always find an answer?')}</td><td>{t('ได้ ถ้า tree มีขนาดจำกัด', 'Yes, if the tree is finite')}</td></tr>
            <tr><td>{t('คำตอบดีที่สุดไหม', 'Is the answer the best one?')}</td><td>{t('ใช่ เมื่อคู่แข่งเล่นดีที่สุด', 'Yes, against an opponent who plays their best')}</td></tr>
            <tr><td>{t('เวลาที่ใช้', 'Time')}</td><td><span className="mono">O(bᵐ)</span> {t('เมื่อ b คือจำนวนตาที่เลือกได้ต่อครั้ง และ m คือจำนวน ply ที่มองไป', 'where b is the number of moves available each turn and m is the number of plies looked ahead')}</td></tr>
            <tr><td>{t('หน่วยความจำที่ใช้', 'Memory')}</td><td><span className="mono">O(bm)</span> {t('เพราะค้นลงไปทีละเส้นทาง', 'because it explores one path at a time')}</td></tr>
          </tbody>
        </table>
        <p>
          {t(
            'ปัญหาอยู่ที่เวลา O(bᵐ): ต้นไม้ตัวอย่างมี b = 3 และ m = 2 จึงมีแค่ 3² = 9 ใบ แต่จำนวนใบโตเร็วมากเมื่อ b หรือ m เพิ่มขึ้น ข้อ 3 จะลดงานโดยไม่เปลี่ยนคำตอบ และข้อ 4 จะแสดงว่าสำหรับหมากห้าตัว แค่นั้นยังไม่พอ',
            'The trouble is the O(bᵐ) time. The example has b = 3 and m = 2, so only 3² = 9 leaves, but the number of leaves grows very fast as b or m increases. Section 3 cuts the work without changing the answer, and section 4 shows that for five in a row even that is not enough.',
          )}
        </p>
      </section>

      <section className="t-section" id="pruning">
        <h2>{t('3. α–β pruning', '3. α–β pruning')}</h2>
        <p>
          {t(
            'ในตัวอย่างข้างบน พอเห็นใบแรกของ B มีค่า 2 เราก็รู้แล้วว่า B ให้เราได้ไม่เกิน 2 ขณะที่ A ให้ 3 แน่นอน ใบที่เหลือของ B จะเป็นเท่าไรก็ไม่เปลี่ยนการตัดสินใจ จึงไม่จำเป็นต้องดู การข้ามกิ่งแบบนี้เรียกว่า α–β pruning',
            'In the example above, as soon as B’s first leaf turns out to be 2 we know B gives us at most 2, while A gives 3 for certain. Whatever B’s other leaves are cannot change the decision, so there is no need to look at them. Skipping branches like this is called α–β pruning.',
          )}
        </p>
        <MinimaxDemo alphaBeta />
        <p>
          {t(
            'ชื่อนี้มาจากค่าสองค่าที่อัลกอริทึมจำไว้ระหว่างค้น:',
            'The name comes from two values the algorithm keeps while searching:',
          )}
        </p>
        <ul className="t-list">
          <li><b>α</b> {t('คือค่าที่ดีที่สุดที่ MAX รับประกันได้แล้วจากทางเลือกที่ดูไป (ในตัวอย่างคือ 3 หลังจากดู A จบ)', 'is the best value MAX can already guarantee from the choices seen so far (3 in the example, once A is finished).')}</li>
          <li><b>β</b> {t('คือค่าที่ดีที่สุดที่ MIN รับประกันได้แล้ว ซึ่งใช้ตัดกิ่งในชั้นของ MAX ด้วยเหตุผลเดียวกันแต่กลับด้าน', 'is the best value MIN can already guarantee; it prunes at MAX’s levels by the same argument, mirrored.')}</li>
        </ul>
        <p>{t('เมื่อ α มากกว่าหรือเท่ากับ β ที่ node ใด ก็เลิกดูลูกที่เหลือของ node นั้นได้', 'Whenever α is greater than or equal to β at a node, its remaining children can be dropped.')}</p>
        <div className="callout note">
          {t(
            'สองข้อที่ควรจำ: การตัดกิ่งไม่เปลี่ยนคำตอบ ได้ค่าเท่ากับ minimax ทุกครั้ง และปริมาณที่ตัดได้ขึ้นกับลำดับการดู ถ้าในตัวอย่างดู C ก่อน A จะตัดอะไรไม่ได้เลยในตอนแรก เรื่องลำดับนี้อยู่ในข้อ 7',
            'Two things to remember. Pruning never changes the answer: the value is always the same as minimax. And how much gets pruned depends on the order of looking: had the example looked at C before A, nothing could have been pruned at first. Ordering is the subject of section 7.',
          )}
        </div>
      </section>

      <section className="t-section" id="size">
        <h2>{t('4. ทำไมค้นทั้งต้นไม่ได้', '4. Why the full tree is out of reach')}</h2>
        <p>
          {t(
            'ถ้าค้นไปจนจบเกมทุกเส้นทาง คำตอบของ minimax จะถูกต้องแน่นอน เกมเล็กทำแบบนั้นได้ เช่น Tic-Tac-Toe (โอเอกซ์ 3×3) มี b ไม่เกิน 9 และเกมยาวไม่เกิน 9 ตา ทั้งต้นจึงมีแค่ 549,946 node ซึ่งคอมพิวเตอร์ไล่ครบได้ในเสี้ยววินาที หมากห้าตัวต่างออกไปมาก',
            'If every line were searched to the end of the game, the minimax answer would be exactly right. Small games allow that: Tic-Tac-Toe (noughts and crosses on 3×3) has b ≤ 9 and lasts at most 9 moves, so its whole tree is only 549,946 nodes, which a computer walks through in a fraction of a second. Five in a row is very different.',
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
            'ลองตั้งงบเวลาแบบใจกว้างดู ถ้ามีเวลา 100 วินาทีต่อตา และค้นได้ 10⁴ node ต่อวินาที จะค้นได้ 10⁶ node ต่อตา ตัวเลขนี้ห่างจาก 10⁷⁰ มากจนเครื่องที่เร็วขึ้นล้านเท่าก็ไม่ช่วย สถานการณ์เดียวกับหมากรุก ทางออกมาตรฐานคือ',
            'Take a generous budget: with 100 seconds per move and 10⁴ nodes per second, we can search 10⁶ nodes per move. That is so far from 10⁷⁰ that a machine a million times faster would not help. It is the same situation as chess, and the standard way out is:',
          )}
        </p>
        <ul className="t-list">
          <li><b>Cutoff test</b> {t('หยุดค้นเมื่อถึงความลึกที่กำหนด แทนที่จะรอจนเกมจบ', 'stop at a depth limit instead of waiting for the game to end')}</li>
          <li><b>Evaluation function</b> {t('ประเมินว่าตำแหน่งที่หยุดนั้นดีแค่ไหน แทนค่า utility จริง', 'estimate how good the position is, in place of the true utility')}</li>
        </ul>
      </section>

      <section className="t-section" id="candidates">
        <h2>{t('5. จำกัดตาที่พิจารณา', '5. Limiting candidate moves')}</h2>
        <p>
          {t(
            'ลด b ก่อนเป็นอันดับแรก เพราะ b เป็นฐานของ bᵐ ถ้าพิจารณาทั้ง 200 กว่าช่อง การมองล่วงหน้า 4 ตาต้องใช้ 200⁴ = 1.6 พันล้าน node แต่ถ้าเหลือ 10 ช่อง จะใช้แค่ 10⁴ = 10,000 node',
            'Reduce b first, since b is the base of bᵐ. Looking 4 moves ahead over 200-odd points costs 200⁴ = 1.6 billion nodes; over 10 points it costs 10⁴ = 10,000.',
          )}
        </p>
        <CandidateDemo />
      </section>

      <section className="t-section" id="eval">
        <h2>{t('6. Cutoff + Eval', '6. Cutoff + Eval')}</h2>
        <p>
          {t(
            'การค้นแบบจำกัดความลึกเหมือน minimax เดิมทุกอย่าง ยกเว้นสองจุด จุดแรก แทนที่จะถามว่า "เกมจบหรือยัง" (terminal test) ก็ถามว่า "ถึงความลึกที่กำหนดหรือยัง" (cutoff test) จุดที่สอง แทนที่จะใช้คะแนนจริงตอนจบเกม (utility) ก็ใช้ค่าประมาณจากฟังก์ชันประเมิน (Eval)',
            'A depth-limited search is the same minimax as before except for two things. First, instead of asking "is the game over?" (the terminal test) it asks "has the depth limit been reached?" (the cutoff test). Second, instead of the true score at the end of the game (the utility) it uses an estimate from an evaluation function (Eval).',
          )}
        </p>
        <pre className="code">{`function Search(state, depth, α, β):        value for the side to move
    if the last move made five  →  return −WIN         ← Terminal?  (the side to move has lost)
    if depth = 0                →  return Eval(state)   ← Cutoff?
    for each move in Candidates(state), best first:
        v ← −Search(Result(state, move), depth − 1, −β, −α)
        α ← max(α, v)
        if α ≥ β  →  break                              ← prune
    return α`}</pre>
        <p className="muted small">
          {t(
            'โค้ดนี้เขียนในรูปที่เรียกว่า negamax ซึ่งให้ผลเหมือน minimax กับ α–β ในข้อ 2–3 ทุกประการ แทนที่จะแยกกรณี MAX กับ MIN ฟังก์ชันจะคืนค่าจากมุมของ "ฝ่ายที่กำลังจะเดิน" เสมอ ทุกฝ่ายจึงเลือกค่ามากที่สุดเหมือนกัน และเมื่อสลับฝ่ายก็กลับเครื่องหมายของค่า (สิ่งที่ดีสำหรับเราเท่ากับแย่สำหรับเขา) ส่วน α กับ β ก็สลับที่กันและกลับเครื่องหมายด้วย',
            'This is written in the form called negamax, which gives exactly the same result as the minimax with α–β of sections 2–3. Instead of separate MAX and MIN cases, the function always returns the value from the point of view of the side to move, so both sides simply take the largest value; when the side changes, the sign of the value flips (what is good for us is bad for them), and α and β swap places and change sign too.',
          )}
        </p>
        <p>
          {t(
            'รูปแบบของ Eval ที่ใช้กันทั่วไปคือผลรวมเชิงเส้นถ่วงน้ำหนักของ feature: Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s) สำหรับหมากรุก feature คือจำนวนหมากแต่ละชนิด สำหรับหมากห้าตัว เว็บนี้ใช้จำนวน "แนว 5 ช่องที่ยังเรียงได้" แยกตามจำนวนหมากที่มีอยู่ในแนว',
            'A common form of Eval is a weighted linear sum of features: Eval(s) = w₁f₁(s) + w₂f₂(s) + … + wₙfₙ(s). In chess the features are piece counts. For five in a row this site counts the "lines of five that can still be completed", grouped by how many stones they already hold.',
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
            'ในเกมที่ไม่มีการสุ่ม ค่าที่แน่นอนของ Eval ไม่สำคัญ สำคัญแค่ลำดับ การแปลงค่าแบบ monotonic ใด ๆ ให้ผลการเลือกตาเหมือนเดิม น้ำหนัก 1, 12, 120, 1500 จึงไม่จำเป็นต้องแม่นยำ ขอแค่เรียงความสำคัญถูก',
            'In deterministic games the exact Eval values do not matter, only their order: any monotonic transformation picks the same moves. So the weights 1, 12, 120, 1500 need not be precise as long as they rank things correctly.',
          )}
        </p>
      </section>

      <section className="t-section" id="ordering">
        <h2>{t('7. Move ordering', '7. Move ordering')}</h2>
        <p>
          {t(
            'ข้อ 3 แสดงว่า α–β ตัดได้มากเมื่อเจอตาที่ดีก่อน ถ้าเรียงลำดับได้สมบูรณ์แบบ เวลาจะลดจาก O(bᵐ) เหลือ O(b^(m/2)) ซึ่งเท่ากับค้นได้ลึกขึ้นเป็นสองเท่าในเวลาเท่าเดิม การเดาว่าตาไหนน่าจะดีแล้วลองตานั้นก่อนจึงคุ้มมาก เรียกว่า move ordering',
            'Section 3 showed that α–β prunes a lot when a good move is found early. With perfect ordering the time drops from O(bᵐ) to O(b^(m/2)), which doubles the depth reachable in the same time. So it pays to guess which moves are likely to be good and try those first. This is called move ordering.',
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
        <h2>{t('8. Iterative deepening', '8. Iterative deepening')}</h2>
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
        <h2>{t('9. ข้อจำกัด', '9. Limits')}</h2>
        <ul className="t-list">
          <li>
            <b>{t('เป็นการประเมิน ไม่ใช่การพิสูจน์', 'An estimate, not a proof')}</b>{' '}
            {t('คะแนนมาจาก Eval ที่ความลึกจำกัด ถ้าค้นลึกขึ้นอีกชั้น คำแนะนำอาจเปลี่ยน', 'Scores come from Eval at a limited depth. One more ply can change the advice.')}
          </li>
          <li>
            <b>Horizon effect</b>{' '}
            {t('ภัยคุกคามที่อยู่เลยความลึกที่ค้นไปหนึ่งตาจะมองไม่เห็น วิธีแก้ที่ใช้กันคือ quiescence search คือค้นต่อเมื่อตำแหน่งยังไม่นิ่ง ซึ่งเว็บนี้ยังไม่ได้ทำ', 'A threat one move past the search depth is invisible. The usual remedy is quiescence search, searching on while the position is not quiet; this site does not do that yet.')}
          </li>
          <li>
            <b>{t('คะแนนแกว่งระหว่างความลึกคี่กับคู่', 'Scores swing between odd and even depths')}</b>{' '}
            {t('ที่ความลึกคี่ ฝ่ายเราได้เดินมากกว่าอีกฝ่ายหนึ่งตา Eval จึงสูงกว่าที่ความลึกคู่ เห็นได้จากตารางในข้อ 8 ควรเทียบคะแนนที่ความลึกเดียวกันเท่านั้น', 'At odd depths our side has made one more move than the opponent, so Eval comes out higher than at even depths, as the table in section 8 shows. Only compare scores from the same depth.')}
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
        <p>
          {t(
            'อยากเห็นต้นไม้ของตำแหน่งจริงบนกระดาน ให้เปิดหน้า "ตาต่อไป" แล้วกดแท็บ "Tree ย่อย" จะเห็นต้นไม้ 2 ply แบบเดียวกับข้อ 2–3 พร้อมค่า Eval ที่ใบและกิ่งที่ถูกตัด',
            'To see the tree of a real position on the board, open the "Next move" page and press the "Sub-tree" tab: it shows a 2-ply tree like the one in sections 2–3, with Eval values on the leaves and the pruned branches.',
          )}
        </p>
        <div className="hero-actions">
          <Link to="/analyze" className="btn primary">{t('ลองตัวช่วยแนะนำตา →', 'Try the advisor →')}</Link>
          <Link to="/patterns" className="btn">{t('ดูรูปแบบหมาก', 'See the patterns')}</Link>
        </div>
      </section>
    </main>
  );
}
