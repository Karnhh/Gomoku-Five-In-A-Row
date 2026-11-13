import { Link } from 'react-router-dom';
import { useLang } from '../i18n.tsx';

export default function References() {
  const { t } = useLang();
  return (
    <main className="page refs-page">
      <span className="tag">{t('อ้างอิง', 'References')}</span>
      <h1>{t('แหล่งที่มาของเนื้อหา', 'Sources')}</h1>
      <p className="muted intro">
        {t(
          'เนื้อหาทฤษฎีหลักมาจากสไลด์ประกอบการสอนด้านล่าง เว็บนี้ทำขึ้นเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์',
          'The core theory comes from the lecture slides listed below. This site was made for educational, non-commercial purposes.',
        )}
      </p>

      <section className="refs-block">
        <h2>{t('แหล่งข้อมูลหลัก', 'Primary source')}</h2>
        <ol className="refs-list">
          <li>
            <p className="cite">
              Russell, S. <i>Game playing</i> (Chapter 6) [Lecture slides]. {t('สไลด์ประกอบตำรา', 'Slides accompanying')}{' '}
              <i>Artificial Intelligence: A Modern Approach</i>.
            </p>
            <p className="muted small">
              {t(
                'ใช้เป็นแหล่งของ minimax, α–β pruning และคุณสมบัติ O(b^(m/2)), ตัวอย่างงบเวลา 100 วินาที × 10⁴ node/วินาที, cutoff test, evaluation function แบบผลรวมถ่วงน้ำหนัก, ข้อสังเกตว่าค่าที่แน่นอนของ Eval ไม่สำคัญ และ quiescence search',
                'Source for minimax, α–β pruning and its O(b^(m/2)) property, the 100 s × 10⁴ nodes/s budget example, cutoff tests, weighted-sum evaluation functions, the remark that exact Eval values do not matter, and quiescence search.',
              )}
            </p>
          </li>
          <li>
            <p className="cite">
              Russell, S., &amp; Norvig, P. (2003). <i>Artificial Intelligence: A Modern Approach</i> (2nd ed.), Chapter 6. Prentice Hall.
            </p>
            <p className="muted small">
              {t('ตำราที่สไลด์อ้างอิง ระบุไว้เพื่อให้ค้นคว้าต่อ เว็บไซต์ของตำรา: ', 'The textbook the slides are based on, listed for further reading. Book website: ')}
              <a href="https://aima.cs.berkeley.edu/" target="_blank" rel="noreferrer">aima.cs.berkeley.edu</a>
            </p>
          </li>
        </ol>
        <h3>{t('อ่านเพิ่มเติมเกี่ยวกับหมากห้าตัว', 'Further reading on five in a row')}</h3>
        <ol className="refs-list" start={3}>
          <li>
            <p className="cite">
              Allis, L. V., van den Herik, H. J., &amp; Huntjens, M. P. H. (1996). Go-Moku solved by new search techniques. <i>Computational Intelligence, 12</i>(1), 7–23.
            </p>
            <p className="muted small">
              {t('ที่มาของข้อความว่าฝ่ายเดินก่อนชนะได้บนกระดาน 15×15 เมื่อไม่มีกติกาเสริม', 'Source for the statement that the first player wins on a 15×15 board without extra rules.')}
            </p>
          </li>
          <li>
            <p className="cite">
              Allis, L. V. (1994). <i>Searching for Solutions in Games and Artificial Intelligence</i> [PhD thesis]. University of Limburg.
            </p>
            <p className="muted small">
              {t('ที่มาของค่าประมาณขนาด game tree ราว 10⁷⁰', 'Source for the game-tree size estimate of about 10⁷⁰.')}
            </p>
          </li>
        </ol>
      </section>

      <section className="refs-block">
        <h2>{t('ส่วนที่ทำขึ้นเองในเว็บนี้', 'Original to this site')}</h2>
        <ul className="t-list">
          <li>{t('คำอธิบายทั้งหมดเรียบเรียงใหม่ทั้งภาษาไทยและอังกฤษ ไม่ได้คัดลอกข้อความหรือรูปจากสไลด์', 'All explanations were rewritten in Thai and English; no text or images were copied from the slides.')}</li>
          <li>{t('ฟังก์ชัน Eval แบบนับแนว 5 ช่อง และน้ำหนัก 1, 12, 120, 1500', 'The line-of-five counting evaluation function and its weights 1, 12, 120, 1500.')}</li>
          <li>{t('การจำกัดตาที่พิจารณา (ห่างหมากไม่เกิน 2 ช่อง) คะแนนแบบเร็วสำหรับ move ordering และ iterative deepening ซึ่งไม่ได้อยู่ในสไลด์บทที่ 6', 'Candidate limiting (within 2 steps of a stone), the quick score for move ordering, and iterative deepening, which are not in the Chapter 6 slides.')}</li>
          <li>{t('การประมาณเวลาที่ต้องใช้ค้นทั้งต้น (ราว 10⁵⁷ ปี) คำนวณจากขนาด game tree 10⁷⁰ และความเร็วของตัวคำนวณในเว็บนี้ ราว 10⁵ node ต่อวินาที', 'The estimate of the time needed to search the whole tree (about 10⁵⁷ years), computed from a game-tree size of 10⁷⁰ and this site’s engine speed of about 10⁵ nodes per second.')}</li>
          <li>{t('กระดาน แผนภาพ ตัวอย่างรูปแบบหมาก และ demo ทุกชิ้น', 'The board, the diagrams, the pattern examples and every demo.')}</li>
          <li>{t('ตัวเลข 572 แนวคำนวณด้วยโปรแกรมในเว็บนี้และมี unit test ตรวจสอบ ส่วน 549,946 คือจำนวน node ของ game tree ทั้งต้นของ Tic-Tac-Toe ซึ่งหน้าทฤษฎีใช้เปรียบเทียบ', 'The figure of 572 lines is computed by this site’s code and checked by a unit test; 549,946 is the number of nodes in the whole Tic-Tac-Toe game tree, which the Theory page uses for comparison.')}</li>
        </ul>
      </section>

      <section className="refs-block">
        <h2>{t('ฟอนต์และซอฟต์แวร์', 'Fonts and software')}</h2>
        <ul className="t-list">
          <li>IBM Plex Sans Thai, IBM Plex Mono · SIL Open Font License · {t('ผ่าน', 'via')} Google Fonts</li>
          <li>React, React Router, Vite, TypeScript · MIT / Apache-2.0 License</li>
        </ul>
      </section>

      <div className="callout note">
        {t(
          'เว็บนี้ไม่มีส่วนเกี่ยวข้องกับผู้เขียนตำราหรือสำนักพิมพ์ ลิขสิทธิ์ของสไลด์และตำราเป็นของผู้เขียนและสำนักพิมพ์ หากมีข้อผิดพลาดในการอธิบาย เป็นความผิดพลาดของเว็บนี้เอง',
          'This site is not affiliated with the textbook’s authors or publisher. Copyright in the slides and the textbook belongs to their authors and publisher. Any errors in the explanations are this site’s own.',
        )}
      </div>

      <div className="hero-actions">
        <Link to="/theory" className="btn">{t('← กลับไปหน้าทฤษฎี', '← Back to the theory')}</Link>
      </div>
    </main>
  );
}
