// A small game tree to step through: plain minimax, or the same search with
// α–β pruning. The numbers are the 2-ply example used in the Chapter 6 slides
// (3, 12, 8 / 2, 4, 6 / 14, 5, 2).
import { useMemo, useState } from 'react';
import { useLang } from '../i18n.tsx';
import type { Msg } from '../i18n.tsx';

const LEAVES = [[3, 12, 8], [2, 4, 6], [14, 5, 2]];
const NAMES = ['A', 'B', 'C'];

type LeafState = 'unseen' | 'seen' | 'pruned';

interface Frame {
  leaf: LeafState[];
  /** text inside each MIN node: '' (not started), '≤3' (in progress) or '3' (final) */
  min: string[];
  minState: ('idle' | 'open' | 'done' | 'cut')[];
  root: string;
  /** index of the best MIN node found so far, or -1 */
  best: number;
  /** what the step is about: a leaf index 0–8, 'm0'..'m2' for a MIN node, or null */
  focus: number | string | null;
  seen: number;
  finished: boolean;
  msg: Msg;
}

/** Run the search once and record every step, so the view only has to show frame n. */
export function buildFrames(alphaBeta: boolean): Frame[] {
  const out: Frame[] = [];
  const leaf: LeafState[] = new Array(9).fill('unseen');
  const min = ['', '', ''];
  const minState: Frame['minState'] = ['idle', 'idle', 'idle'];
  let root = '';
  let alpha = -Infinity;
  let best = -1;
  let seen = 0;
  const snap = (focus: Frame['focus'], msg: Msg, finished = false) =>
    out.push({ leaf: [...leaf], min: [...min], minState: [...minState], root, best, focus, seen, finished, msg });

  snap(null, {
    th: 'เราเป็น MAX และถึงตาเรา มีตาให้เลือก 3 ตา คือ A, B และ C หลังจากนั้น MIN (คู่แข่ง) ตอบได้ 3 แบบ ตัวเลขที่ใบคือคะแนนของเราเมื่อไปถึงตำแหน่งนั้น ยิ่งมากยิ่งดีสำหรับเรา กด "ถัดไป" เพื่อไล่ดูทีละใบ',
    en: 'We are MAX and it is our move. There are three moves: A, B and C. After each, MIN (the opponent) has three replies. The number on a leaf is our score if play reaches it: higher is better for us. Press "Next" to go through the leaves.',
  });

  for (let i = 0; i < 3; i++) {
    const N = NAMES[i];
    let v = Infinity;
    let cut = false;
    minState[i] = 'open';
    for (let j = 0; j < 3; j++) {
      const k = i * 3 + j;
      const x = LEAVES[i][j];
      leaf[k] = 'seen';
      seen++;
      v = Math.min(v, x);
      min[i] = `≤${v}`;
      const base: Msg = {
        th: `ดูใบค่า ${x} ใต้ ${N} MIN จะเลือกคำตอบที่ทำให้เราได้น้อยที่สุด ตอนนี้ ${N} จึงมีค่าไม่เกิน ${v}`,
        en: `Look at leaf ${x} under ${N}. MIN picks the reply that gives us the least, so ${N} is worth at most ${v} now.`,
      };
      const canPrune = alphaBeta && best >= 0 && v <= alpha && j < 2;
      if (canPrune) {
        snap(k, base);
        const rest = LEAVES[i].slice(j + 1);
        for (let r = j + 1; r < 3; r++) leaf[i * 3 + r] = 'pruned';
        minState[i] = 'cut';
        snap(`m${i}`, {
          th: `เรามี ${NAMES[best]} ที่ได้ ${alpha} แน่นอนอยู่แล้ว ส่วน ${N} ให้เราได้ไม่เกิน ${v} ไม่ว่าใบที่เหลือจะเป็นเท่าไร เราก็จะไม่เลือก ${N} จึงข้ามใบ ${rest.join(' และ ')} ได้โดยคำตอบไม่เปลี่ยน นี่คือการตัดกิ่ง`,
          en: `We already have ${alpha} for certain from ${NAMES[best]}, and ${N} can give us at most ${v}. Whatever the remaining leaves hold, we will not choose ${N}, so leaves ${rest.join(' and ')} can be skipped without changing the answer. This is pruning.`,
        });
        cut = true;
        break;
      }
      if (alphaBeta && best >= 0 && j < 2) {
        snap(k, {
          th: `${base.th} ซึ่งยังมากกว่า ${alpha} ที่เราได้จาก ${NAMES[best]} จึงยังตัดไม่ได้ ต้องดูต่อ`,
          en: `${base.en} That is still more than the ${alpha} we have from ${NAMES[best]}, so we cannot prune yet.`,
        });
      } else {
        snap(k, base);
      }
    }
    if (!cut) {
      min[i] = `${v}`;
      minState[i] = 'done';
      const improved = v > alpha;
      const prevBest = best;
      if (improved) { alpha = v; best = i; }
      root = i < 2 ? `≥${alpha}` : `${alpha}`;
      const tail = alphaBeta ? ` (α = ${alpha})` : '';
      snap(`m${i}`, improved
        ? {
          th: `${N} ดูครบแล้ว ถ้าเราเดิน ${N} MIN จะตอบให้เราได้ ${v} ซึ่งดีที่สุดเท่าที่เจอ เราจึงรับประกันได้อย่างน้อย ${alpha}${tail}`,
          en: `${N} is finished. If we play ${N}, MIN answers so that we get ${v}. That is the best so far, so we are guaranteed at least ${alpha}${tail}.`,
        }
        : {
          th: `${N} ดูครบแล้ว ถ้าเราเดิน ${N} MIN จะตอบให้เราได้ ${v} ซึ่งไม่ดีกว่า ${alpha} ที่ได้จาก ${NAMES[prevBest]} เราจึงยังเลือก ${NAMES[prevBest]}${tail}`,
          en: `${N} is finished. If we play ${N}, MIN answers so that we get ${v}, which is no better than the ${alpha} from ${NAMES[prevBest]}. We still prefer ${NAMES[prevBest]}${tail}.`,
        });
    } else {
      root = i < 2 ? `≥${alpha}` : `${alpha}`;
    }
  }

  root = `${alpha}`;
  snap(null, alphaBeta
    ? {
      th: `ได้คำตอบเดิม คือเดิน ${NAMES[best]} ได้ค่า ${alpha} แต่ดูเพียง ${seen} จาก 9 ใบ การตัดกิ่งไม่เปลี่ยนคำตอบ เปลี่ยนแค่ปริมาณงาน และยิ่งเจอตาที่ดีเร็ว ก็ยิ่งตัดได้มาก`,
      en: `The answer is the same: play ${NAMES[best]} for a value of ${alpha}, but only ${seen} of the 9 leaves were looked at. Pruning never changes the answer, only the amount of work, and the sooner a good move is found, the more can be pruned.`,
    }
    : {
      th: `ดูครบทั้ง 9 ใบ ค่า minimax ของรากคือ ${alpha} ตาที่ดีที่สุดคือ ${NAMES[best]} นี่คือผลที่ดีที่สุดที่เรารับประกันได้ เมื่อคู่แข่งก็เล่นดีที่สุดเช่นกัน`,
      en: `All 9 leaves have been looked at. The minimax value of the root is ${alpha} and the best move is ${NAMES[best]}. This is the best result we can guarantee when the opponent also plays their best.`,
    }, true);
  return out;
}

const MIN_X = [100, 280, 460];
const LEAF_DX = [-56, 0, 56];
const ROOT = { x: 280, y: 34 };
const MIN_Y = 122;
const LEAF_Y = 212;

export default function MinimaxDemo({ alphaBeta }: { alphaBeta: boolean }) {
  const { t, m } = useLang();
  const frames = useMemo(() => buildFrames(alphaBeta), [alphaBeta]);
  const [step, setStep] = useState(0);
  const f = frames[Math.min(step, frames.length - 1)];
  const last = frames.length - 1;

  return (
    <div className="widget">
      <svg className="mm-tree" viewBox="0 0 560 250" role="img" aria-label={t('ต้นไม้เกมตัวอย่าง 2 ชั้น', 'A 2-ply example game tree')}>
        <text className="mm-side" x={8} y={ROOT.y + 4}>MAX</text>
        <text className="mm-side" x={8} y={MIN_Y + 4}>MIN</text>

        {MIN_X.map((x, i) => (
          <line
            key={`r${i}`}
            className={`mm-edge ${f.finished && f.best === i ? 'best' : ''} ${f.minState[i] === 'idle' ? 'dim' : ''}`}
            x1={ROOT.x} y1={ROOT.y + 18} x2={x} y2={MIN_Y - 18}
          />
        ))}
        {MIN_X.map((x, i) => LEAF_DX.map((dx, j) => {
          const st = f.leaf[i * 3 + j];
          return (
            <line
              key={`l${i}${j}`}
              className={`mm-edge ${st === 'pruned' ? 'pruned' : st === 'unseen' ? 'dim' : ''}`}
              x1={x} y1={MIN_Y + 20} x2={x + dx} y2={LEAF_Y - 14}
            />
          );
        }))}

        <g className={`mm-node max ${f.root ? 'on' : ''} ${f.finished ? 'final' : ''}`}>
          <polygon points={`${ROOT.x},${ROOT.y - 22} ${ROOT.x + 28},${ROOT.y + 18} ${ROOT.x - 28},${ROOT.y + 18}`} />
          <text x={ROOT.x} y={ROOT.y + 7}>{f.root}</text>
        </g>

        {MIN_X.map((x, i) => (
          <g key={`m${i}`} className={`mm-node min ${f.minState[i]} ${f.focus === `m${i}` ? 'focus' : ''} ${f.finished && f.best === i ? 'final' : ''}`}>
            <polygon points={`${x - 26},${MIN_Y - 18} ${x + 26},${MIN_Y - 18} ${x},${MIN_Y + 20}`} />
            <text x={x} y={MIN_Y - 3}>{f.min[i]}</text>
            <text className="mm-name" x={x + 34} y={MIN_Y - 6}>{NAMES[i]}</text>
          </g>
        ))}

        {MIN_X.map((x, i) => LEAF_DX.map((dx, j) => {
          const k = i * 3 + j;
          return (
            <g key={`f${k}`} className={`mm-leaf ${f.leaf[k]} ${f.focus === k ? 'focus' : ''}`}>
              <rect x={x + dx - 19} y={LEAF_Y - 14} width={38} height={28} rx={6} />
              <text x={x + dx} y={LEAF_Y + 1}>{LEAVES[i][j]}</text>
              {f.leaf[k] === 'pruned' && <text className="mm-cut" x={x + dx} y={LEAF_Y + 30}>{t('ตัด', 'cut')}</text>}
            </g>
          );
        }))}
      </svg>

      <p className="step-msg" aria-live="polite">{m(f.msg)}</p>

      <div className="widget-controls">
        <button className="btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{t('← ก่อนหน้า', '← Back')}</button>
        <button className="btn primary" onClick={() => setStep(Math.min(last, step + 1))} disabled={step >= last}>{t('ถัดไป →', 'Next →')}</button>
        <button className="btn" onClick={() => setStep(last)} disabled={step >= last}>{t('ไปขั้นสุดท้าย', 'Skip to the end')}</button>
        <button className="btn" onClick={() => setStep(0)} disabled={step === 0}>{t('เริ่มใหม่', 'Restart')}</button>
        <span className="muted small">
          {t(`ขั้นที่ ${step} จาก ${last} · ดูไปแล้ว ${f.seen} จาก 9 ใบ`, `Step ${step} of ${last} · ${f.seen} of 9 leaves looked at`)}
        </span>
      </div>
    </div>
  );
}
