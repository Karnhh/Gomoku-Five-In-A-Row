import { Link } from 'react-router-dom';
import { ONLINE_ENABLED } from '../online/flag.ts';
import { useLang } from '../i18n.tsx';

export default function Manual() {
  const { t } = useLang();
  const U = ({ th, en }: { th: string; en: string }) => <span className="ui">{t(th, en)}</span>;
  const toc: [string, string][] = [
    ['rules', t('1. กติกา', '1. Rules')],
    ['play', t('2. เล่นกับเพื่อน', '2. Play with a friend')],
    ['next', t('3. ตาต่อไป', '3. Next move')],
    ['score', t('4. อ่านคะแนน', '4. Reading the score')],
    ['tree', t('5. Tree ย่อย', '5. Sub-tree')],
    ['other', t('6. หน้าอื่น ๆ', '6. Other pages')],
    ['faq', t('7. คำถามที่พบบ่อย', '7. FAQ')],
  ];
  return (
    <main className="page manual-page">
      <span className="tag">{t('คู่มือการใช้งาน', 'User manual')}</span>
      <h1>{t('วิธีใช้เว็บนี้', 'How to use this site')}</h1>
      <p className="muted intro">
        {t(
          'เว็บนี้มีสองส่วนหลัก: กระดานสำหรับเล่นหมากห้าตัวกับเพื่อน และตัวช่วยที่ประเมินว่าตาต่อไปควรวางตรงไหน',
          'This site has two main parts: a board for playing five in a row with a friend, and an advisor that estimates where to play next.',
        )}
      </p>
      <nav className="toc">{toc.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <section className="t-section" id="rules">
        <h2>{t('1. กติกา', '1. Rules')}</h2>
        <ul className="t-list">
          <li>{t('กระดานมีเส้น 15×15 วางหมากบนจุดตัดของเส้น ไม่ใช่ในช่อง', 'The board has 15×15 lines. Stones go on the intersections, not inside the squares.')}</li>
          <li>{t('หมากดำเดินก่อน แล้วสลับกันวางทีละตัว วางแล้วย้ายไม่ได้', 'Black moves first, then the players alternate. A placed stone never moves.')}</li>
          <li>{t('ใครเรียงหมากสีตัวเองได้ 5 ตัวติดกันก่อน (แนวนอน แนวตั้ง หรือแนวทแยง) ชนะ และเกมจบทันที', 'The first to line up five of their stones (horizontally, vertically or diagonally) wins, and the game ends at once.')}</li>
          <li>{t('ถ้าตาเดียวทำให้เรียงได้เกิน 5 ตัว ก็นับว่าชนะ', 'If a single move makes a line longer than five, it still wins.')}</li>
          <li>{t('ถ้ากระดานเต็มโดยไม่มีใครเรียงได้ ถือว่าเสมอ', 'If the board fills up with no five, the game is a draw.')}</li>
        </ul>
        <p className="muted small">{t('ตำแหน่งบนกระดานเรียกด้วยตัวอักษรคอลัมน์ A–O และเลขแถว 1–15 นับจากล่างขึ้นบน เช่น H8 คือจุดกลางกระดาน', 'Points are named by a column letter A–O and a row number 1–15 counted from the bottom; H8 is the centre.')}</p>
      </section>

      <section className="t-section" id="play">
        <h2>{t('2. เล่นกับเพื่อน', '2. Play with a friend')}</h2>
        <p>{t('เมนู "เล่น" ใช้เล่นสองคนบนเครื่องเดียว ผลัดกันแตะกระดาน', 'The "Play" menu is for two players on one device, taking turns on the same screen.')}</p>
        <h3>{t('ก่อนเริ่มเกม', 'Before the game')}</h3>
        <ol className="steps">
          <li><b>{t('ใครเดินก่อน', 'Who moves first')}</b> {t('เลือกว่าผู้เล่น 1 หรือผู้เล่น 2 ถือหมากดำ หรือให้สุ่ม', 'choose whether Player 1 or Player 2 takes black, or let it be random.')}</li>
          <li><b>{t('เวลาคิด', 'Thinking time')}</b> {t('เวลารวมของแต่ละคนตลอดทั้งเกม: 3, 5 หรือ 10 นาที หรือไม่จับเวลา', 'each player’s total time for the whole game: 3, 5 or 10 minutes, or no clock.')}</li>
          <li><b>{t('แตะสองครั้งเพื่อยืนยัน', 'Tap twice to confirm')}</b> {t('กันการแตะพลาด เหมาะกับมือถือ', 'guards against mis-taps; useful on a phone.')}</li>
          <li><b>{t('คำแนะนำตาต่อไป', 'Next-move advice')}</b> {t('ดูหัวข้อด้านล่าง', 'see below.')}</li>
          <li>{t('กด', 'Press')} <U th="เริ่มเกม" en="Start game" /></li>
        </ol>
        <h3>{t('ระหว่างเล่น', 'During the game')}</h3>
        <ul className="t-list">
          <li><b>{t('วางหมาก', 'Placing a stone')}</b> {t('แตะจุดตัดหนึ่งครั้งจะเห็นหมากโปร่งแสง แตะจุดเดิมอีกครั้งเพื่อวางจริง หรือแตะจุดอื่นเพื่อเปลี่ยนใจ', 'tap an intersection once to see a faint stone, tap the same point again to place it, or tap elsewhere to change your mind.')}</li>
          <li><b>{t('นาฬิกา', 'Clock')}</b> {t('เดินเฉพาะของฝ่ายที่ถึงตา ใครเวลาหมดก่อนแพ้ ตัวเลขเป็นสีแดงเมื่อเหลือไม่ถึง 30 วินาที', 'only the side to move loses time. Whoever runs out loses. The digits turn red under 30 seconds.')}</li>
          <li><U th="ย้อนตา" en="Undo" /> {t('ถอยกลับหนึ่งตา ใช้ได้แม้เกมเพิ่งจบด้วยการเรียงห้า เวลาที่ใช้ไปไม่คืน', 'takes back one move, even right after a five ends the game. Time already used is not returned.')}</li>
          <li><U th="ยอมแพ้" en="Resign" /> {t('ฝ่ายที่ถึงตาเป็นผู้ยอมแพ้', 'the side to move resigns.')}</li>
          <li><U th="เกมใหม่" en="New game" /> {t('เริ่มใหม่ด้วยการตั้งค่าเดิม', 'starts again with the same settings.')} · <U th="ตั้งค่า" en="Settings" /> {t('กลับไปหน้าตั้งค่า', 'goes back to the setup screen.')}</li>
          <li><b>{t('วิเคราะห์ตำแหน่งนี้', 'Analyze this position')}</b> {t('เปิดกระดานปัจจุบันในหน้า "ตาต่อไป"', 'opens the current board on the "Next move" page.')}</li>
        </ul>
        <h3>{t('คำแนะนำตาต่อไประหว่างเล่น', 'Next-move advice during play')}</h3>
        <p>
          {t(
            'ติ๊ก "แสดงคำแนะนำตาต่อไป" ในหน้าตั้งค่าหรือในแผงข้างกระดาน เปิดหรือปิดได้ทุกเมื่อ เมื่อเปิด กระดานจะแสดงวงกลมสีม่วงพร้อมอันดับ 1–5 สำหรับฝ่ายที่กำลังจะเดิน และเลือกเวลาคิดได้ตั้งแต่ 0.3 ถึง 30 วินาที',
            'Tick "Show next-move advice" on the setup screen or in the panel beside the board; it can be switched at any time. When on, the board shows purple circles ranked 1–5 for the side to move, and the thinking time can be set from 0.3 to 30 seconds.',
          )}
        </p>
        <p className="muted small">{t('ทั้งสองคนเห็นคำแนะนำเดียวกัน เพราะใช้จอเดียวกัน และนาฬิกายังเดินระหว่างที่ตัวช่วยคิด', 'Both players see the same advice, since they share a screen, and the clock keeps running while the advisor thinks.')}</p>
        <div className="callout note">
          {ONLINE_ENABLED
            ? t('เล่นออนไลน์: สร้างห้องจากหน้า "เล่น" แล้วส่งรหัส 5 ตัวหรือลิงก์ให้เพื่อน ในห้องออนไลน์เปิดคำแนะนำตาต่อไปได้เช่นกัน โดยจะแสดงเฉพาะตาของคุณและเฉพาะบนเครื่องของคุณ เพื่อนไม่เห็น', 'Online: create a room from the "Play" page and send the 5-character code or the link to your friend. Next-move advice works in an online room too: it shows on your turns only and on your device only, so your friend does not see it.')
            : t('การเล่นออนไลน์จากคนละเครื่องด้วยรหัสห้องยังไม่เปิดให้ใช้', 'Playing online from two devices with a room code is not open yet.')}
        </div>
      </section>

      <section className="t-section" id="next">
        <h2>{t('3. ตาต่อไป', '3. Next move')}</h2>
        <p>{t('เมนู "ตาต่อไป" ใช้จัดกระดานตามเกมที่เล่นอยู่ (ที่นี่หรือที่อื่น) แล้วให้ตัวช่วยประเมินว่าควรวางตรงไหน หน้านี้เริ่มจากกระดานว่าง', 'The "Next move" menu lets you set up the board from a game you are playing (here or elsewhere) and ask the advisor where to play. It starts with an empty board.')}</p>
        <ol className="steps">
          <li><b>{t('ฉันเป็น', 'I am')}</b> {t('เลือก ดำ หรือ ขาว เพื่อรับคำแนะนำเฉพาะตาของคุณ หรือ "ทั้งสองฝ่าย" เพื่อรับคำแนะนำทุกตา', 'pick Black or White to get advice on your turns only, or "Both sides" to get advice on every move.')}</li>
          <li><b>{t('วางหมาก', 'Place')}</b> {t('โหมด "ตามตา" วางดำกับขาวสลับกัน ถ้าจะจัดกระดานเองให้เลือกสีหมากหรือ "ลบ" แล้วระบบจะนับจำนวนหมากเพื่อดูว่าถึงตาใคร', '"Turn order" alternates Black and White. To set up freely pick a colour or "Erase"; the side to move is then worked out from the stone count.')}</li>
          <li>{t('คลิกหมากที่วางแล้วเพื่อลบ', 'Click a stone to remove it.')}</li>
          <li><b>{t('เวลาคิด', 'Time limit')}</b> {t('ยิ่งนาน ตัวช่วยยิ่งมองล่วงหน้าได้ลึก แถบสีม่วงแสดงเวลาที่ใช้ไป กด "หยุดคิด" เพื่อใช้คำตอบล่าสุดได้', 'the longer, the deeper the advisor looks ahead. The purple bar shows the time used; "Stop" keeps the latest answer.')}</li>
          <li>{t('กด', 'Press')} <U th="ลงตาที่แนะนำ" en="Play the suggested move" /> {t('หรือคลิกแถวในรายการเพื่อเดินตานั้น', 'or click a row in the list to play that move.')}</li>
        </ol>
        <ul className="t-list">
          <li><b>Heatmap</b> {t('วงกลมสีม่วงบนกระดาน สีเข้มคือคะแนนสูง ตัวเลขคืออันดับ 1–5 ปิดได้ด้วยช่องติ๊ก Heatmap', 'the purple circles on the board. Darker means a higher score; the numbers are ranks 1–5. The Heatmap checkbox hides them.')}</li>
          <li><b>{t('เมื่อไม่ใช่ตาคุณ', 'When it is not your turn')}</b> {t('วางตาที่อีกฝ่ายเดินจริง หรือกดให้ระบบเดินแทนด้วยตาที่ประเมินว่าดีที่สุด', 'place the opponent’s real move, or let the engine play the move it rates best for them.')}</li>
          <li><U th="สลับฝ่ายเดิน" en="Swap turn" /> {t('ใช้เมื่อระบบเข้าใจผิดว่าถึงตาใคร', 'use it when the side to move is wrong.')} · <U th="ตัวอย่าง" en="Sample" /> {t('โหลดตำแหน่งตัวอย่าง', 'loads a sample position.')}</li>
        </ul>
      </section>

      <section className="t-section" id="score">
        <h2>{t('4. อ่านคะแนน', '4. Reading the score')}</h2>
        <ul className="t-list">
          <li>{t('คะแนนคิดจากมุมมองของฝ่ายที่กำลังจะเดิน ยิ่งมากยิ่งดีสำหรับฝ่ายนั้น', 'The score is from the point of view of the side to move: higher is better for that side.')}</li>
          <li>{t('ค่าบวกคือได้เปรียบ ค่าลบคือเสียเปรียบ ถ้าทุกตาติดลบ ตาที่ติดลบน้อยที่สุดคือตาที่ดีที่สุด', 'Positive means ahead, negative means behind. If every move is negative, the least negative one is best.')}</li>
          <li><b className="mono">WIN</b> / <b className="mono">LOSS</b> {t('คือค้นเจอการบังคับชนะหรือแพ้ภายในความลึกที่ค้น', 'mean a forced win or loss was found within the searched depth.')}</li>
          <li>{t('ตัวเลขไม่มีหน่วย ใช้เทียบว่าตาไหนดีกว่ากันเท่านั้น', 'The number has no unit; it only ranks moves against each other.')}</li>
          <li>{t('บรรทัดใต้คะแนนบอกความลึกที่ค้นได้ จำนวน node ที่ค้น จำนวนกิ่งที่ถูกตัด และเวลาที่ใช้', 'The line under the score gives the depth reached, nodes searched, branches pruned and time used.')}</li>
        </ul>
        <div className="callout note">
          {t(
            'คำแนะนำเป็นการประเมิน ไม่ใช่คำตอบที่พิสูจน์แล้ว ตัวช่วยค้นได้ลึกจำกัดและดูเฉพาะตาที่อยู่ใกล้หมากเดิม รายละเอียดอยู่ในหน้าทฤษฎี',
            'The advice is an estimate, not a proven answer. The advisor searches to a limited depth and only considers moves near existing stones. The Theory page explains why.',
          )}
        </div>
      </section>

      <section className="t-section" id="tree">
        <h2>{t('5. Tree ย่อย', '5. Sub-tree')}</h2>
        <p>{t('ในหน้า "ตาต่อไป" กดแท็บ "Tree ย่อย" เพื่อดู game tree 2 ชั้นจากตำแหน่งปัจจุบัน', 'On the "Next move" page, the "Sub-tree" tab shows a 2-ply game tree from the current position.')}</p>
        <ul className="t-list">
          <li>{t('สามเหลี่ยมชี้ขึ้นคือ MAX (ฝ่ายที่กำลังจะเดิน) สามเหลี่ยมชี้ลงคือ MIN (อีกฝ่าย) สี่เหลี่ยมคือใบที่ให้คะแนนด้วย Eval', 'An upward triangle is MAX (the side to move), a downward triangle is MIN (the opponent), and a box is a leaf scored by Eval.')}</li>
          <li>{t('กล่องเส้นประที่มีรูปกรรไกรคือกิ่งที่ α–β ตัดทิ้ง ไม่ต้องประเมิน', 'A dashed box with scissors is a branch α–β pruned without evaluating.')}</li>
          <li>{t('เส้นหนาสีม่วงคือแนวที่ดีที่สุดของทั้งสองฝ่าย', 'The thick purple line is best play for both sides.')}</li>
          <li>{t('คลิก node เพื่อดูตาเดินบนกระดานเป็นหมากมีหมายเลข แล้วกด "เดินตามนี้แล้วขยายต่อ" เพื่อสร้าง tree ใหม่จากจุดนั้น', 'Click a node to preview its moves as numbered stones, then "Follow and expand" to grow a new tree from there.')}</li>
          <li>{t('"ตาที่พิจารณาต่อ node" กำหนดจำนวนกิ่งต่อ node ตั้งแต่ 3 ถึง 6', '"Moves per node" sets how many branches each node has, from 3 to 6.')}</li>
        </ul>
      </section>

      <section className="t-section" id="other">
        <h2>{t('6. หน้าอื่น ๆ', '6. Other pages')}</h2>
        <ul className="t-list">
          <li><Link className="inline-link" to="/patterns">{t('รูปแบบหมาก', 'Patterns')}</Link> {t('คลังรูปแบบที่ควรรู้ เช่น สี่เปิด สามเปิด และ fork กด "ลองบนกระดานวิเคราะห์" เพื่อเปิดรูปแบบนั้นในหน้า "ตาต่อไป"', 'the shapes worth knowing, such as the open four, open three and forks. "Try on the analysis board" opens a shape on the "Next move" page.')}</li>
          <li><Link className="inline-link" to="/theory">{t('ทฤษฎี', 'Theory')}</Link> {t('อธิบายวิธีที่ตัวช่วยคิด มี demo ที่กดรันได้จริง', 'explains how the advisor thinks, with demos that really run.')}</li>
          <li><Link className="inline-link" to="/references">{t('อ้างอิง', 'References')}</Link> {t('แหล่งที่มาของเนื้อหา', 'where the content comes from.')}</li>
          <li><b>TH / EN</b> {t('ปุ่มมุมขวาบนสลับภาษา เว็บจะจำภาษาที่เลือกไว้', 'the top-right buttons switch language; the choice is remembered.')}</li>
          <li>{t('โหมดมืดเปลี่ยนตามการตั้งค่าของเครื่องโดยอัตโนมัติ', 'Dark mode follows your device setting automatically.')}</li>
        </ul>
      </section>

      <section className="t-section" id="faq">
        <h2>{t('7. คำถามที่พบบ่อย', '7. FAQ')}</h2>
        <h3>{t('ทำไมคะแนนของตำแหน่งเดิมเปลี่ยนไปมา', 'Why does the score of the same position change?')}</h3>
        <p>{t('คะแนนขึ้นกับความลึกที่ค้นได้ ความลึกคี่มักให้คะแนนสูงกว่าความลึกคู่ ควรเทียบคะแนนจากการคิดรอบเดียวกันเท่านั้น ส่วนอันดับของตามักคงเดิม', 'The score depends on the depth reached, and odd depths tend to score higher than even ones. Only compare scores from the same run; the ranking of moves is usually stable.')}</p>
        <h3>{t('ทำไมตัวช่วยไม่แนะนำตาที่อยู่ไกลจากหมาก', 'Why does the advisor never suggest a far-away move?')}</h3>
        <p>{t('ตัวช่วยพิจารณาเฉพาะจุดที่ห่างจากหมากเดิมไม่เกิน 2 ช่อง เพื่อให้คิดได้ทันเวลา', 'It only considers points within 2 steps of an existing stone, so that it can answer in time.')}</p>
        <h3>{t('ให้คิดนานขึ้นแล้วทำไมลึกขึ้นนิดเดียว', 'Why does much more time give only a little more depth?')}</h3>
        <p>{t('แต่ละชั้นที่ลึกขึ้นต้องค้นมากกว่าชั้นก่อนหลายเท่า เวลาเพิ่มสิบเท่าจึงมักได้เพิ่มแค่ 1–2 ชั้น', 'Each extra ply costs several times more than the one before, so ten times the time usually buys only 1–2 plies.')}</p>
        <h3>{t('ปิดหน้าเว็บแล้วเกมหายไหม', 'Is my game kept if I close the page?')}</h3>
        <p>{t('หาย เกมบนเครื่องเดียวไม่ถูกบันทึก ถ้ารีเฟรชหรือปิดหน้าต้องเริ่มใหม่', 'No. A local game is not saved; refreshing or closing the page starts over.')}</p>
        <div className="hero-actions">
          <Link to="/play" className="btn primary">{t('เริ่มเล่น', 'Start playing')}</Link>
          <Link to="/analyze" className="btn">{t('ไปหน้าตาต่อไป', 'Go to Next move')}</Link>
        </div>
      </section>
    </main>
  );
}
