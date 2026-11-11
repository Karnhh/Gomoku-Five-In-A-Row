import { boardFromLabels, cellLabel, parseLabel } from '@gomoku/shared/rules';
import type { Board, Player } from '@gomoku/shared/rules';
import type { Msg } from '../i18n.tsx';

export interface Setup { blacks: string; whites: string; turn: Player }

export const setupBoard = (s: Setup): number[] => boardFromLabels(s.blacks, s.whites);

/** Link to the analysis board with a position loaded, e.g. /analyze?b=H8.I9&w=G8&t=1 */
export function analyzeLink(board: Board, turn: Player): string {
  const b: string[] = [], w: string[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 1) b.push(cellLabel(i));
    else if (board[i] === 2) w.push(cellLabel(i));
  }
  return `/analyze?b=${b.join('.')}&w=${w.join('.')}&t=${turn}`;
}

export const cells = (labels: string): number[] =>
  labels.split(/\s+/).filter(Boolean).map((l) => parseLabel(l)!).filter((c) => c !== null);

/** A quiet middle-game position used by the theory demos. Black to move. */
export const SAMPLE: Setup = { blacks: 'H8 I9 G9 H10', whites: 'H9 G8 J10 I8', turn: 1 };

export const HOME_POSITION: Setup = { blacks: 'H8 I9 G9 H10 J8 F8', whites: 'H9 G8 J10 I8 G10 I7', turn: 1 };

export interface Pattern {
  id: string;
  group: 'basic' | 'fork';
  name: Msg;
  desc: Msg;
  setup: Setup;
  /** ★ points: where the side to move should play */
  keys?: string;
  /** ✕ points: where the defender must answer */
  blocks?: string;
  view: [number, number, number, number];
}

const ROW: [number, number, number, number] = [5, 2, 9, 12];
const FORK: [number, number, number, number] = [2, 2, 9, 12];

export const PATTERNS: Pattern[] = [
  {
    id: 'five', group: 'basic',
    name: { th: 'เรียงห้า', en: 'Five' },
    desc: {
      th: 'หมากสีเดียวกัน 5 ตัวติดกันในแนวนอน แนวตั้ง หรือแนวทแยง จบเกมทันที',
      en: 'Five stones of one colour in a row, horizontally, vertically or diagonally. The game ends at once.',
    },
    setup: { blacks: 'E8 F8 G8 H8 I8', whites: 'E9 F9 G9 H7', turn: 2 },
    view: ROW,
  },
  {
    id: 'open-four', group: 'basic',
    name: { th: 'สี่เปิด (open four)', en: 'Open four' },
    desc: {
      th: 'เรียงสี่ที่ปลายว่างทั้งสองด้าน อีกฝ่ายกันได้ทีละด้านเดียว จึงชนะแน่นอนในตาถัดไป',
      en: 'Four in a row with both ends empty. The opponent can block only one end, so it wins next move.',
    },
    setup: { blacks: 'F8 G8 H8 I8', whites: 'F9 G9 H7', turn: 1 },
    keys: 'E8 J8',
    view: ROW,
  },
  {
    id: 'four', group: 'basic',
    name: { th: 'สี่ปิด (four)', en: 'Four (one end blocked)' },
    desc: {
      th: 'เรียงสี่ที่ถูกกันไว้ด้านหนึ่ง เหลือจุดชนะจุดเดียว อีกฝ่ายต้องกันจุดนั้นทันที เป็นตาบังคับ',
      en: 'Four in a row with one end blocked. There is one winning point, and the opponent is forced to take it.',
    },
    setup: { blacks: 'F8 G8 H8 I8', whites: 'E8 G9 H7', turn: 2 },
    blocks: 'J8',
    view: ROW,
  },
  {
    id: 'open-three', group: 'basic',
    name: { th: 'สามเปิด (open three)', en: 'Open three' },
    desc: {
      th: 'เรียงสามที่ปลายว่างทั้งสองด้าน ถ้าปล่อยไว้จะกลายเป็นสี่เปิด จึงต้องกันตั้งแต่ตอนนี้',
      en: 'Three in a row with both ends empty. Left alone it becomes an open four, so it has to be blocked now.',
    },
    setup: { blacks: 'G8 H8 I8', whites: 'G9 H7', turn: 1 },
    keys: 'F8 J8',
    view: ROW,
  },
  {
    id: 'split-three', group: 'basic',
    name: { th: 'สามแยก (split three)', en: 'Split three' },
    desc: {
      th: 'สามตัวที่มีช่องว่างคั่นกลางหนึ่งช่อง อันตรายเท่าสามเปิด แต่สังเกตยากกว่า',
      en: 'Three stones with one gap inside. As dangerous as an open three, but easier to miss.',
    },
    setup: { blacks: 'F8 G8 I8', whites: 'G9 H7', turn: 1 },
    keys: 'H8',
    view: ROW,
  },
  {
    id: 'closed-three', group: 'basic',
    name: { th: 'สามปิด (closed three)', en: 'Closed three' },
    desc: {
      th: 'เรียงสามที่ถูกกันไว้ด้านหนึ่ง ต่อได้เป็นแค่สี่ปิด ยังไม่ต้องรีบกัน',
      en: 'Three in a row with one end blocked. It can only become a blocked four, so there is no hurry to answer.',
    },
    setup: { blacks: 'G8 H8 I8', whites: 'F8 H7', turn: 1 },
    view: ROW,
  },
  {
    id: 'fork-43', group: 'fork',
    name: { th: 'Fork 4-3', en: '4-3 fork' },
    desc: {
      th: 'ตาเดียวได้ทั้งเรียงสี่และสามเปิด อีกฝ่ายต้องกันสี่ก่อน แล้วสามเปิดจะกลายเป็นสี่เปิด',
      en: 'One move makes a four and an open three. The opponent must block the four, then the three becomes an open four.',
    },
    setup: { blacks: 'F8 G8 H8 I9 I10', whites: 'E8 F10 G11 J12', turn: 1 },
    keys: 'I8',
    view: FORK,
  },
  {
    id: 'fork-44', group: 'fork',
    name: { th: 'Fork 4-4', en: '4-4 fork' },
    desc: {
      th: 'ตาเดียวได้เรียงสี่สองแนว มีจุดชนะสองจุด อีกฝ่ายกันได้จุดเดียว',
      en: 'One move makes two fours. There are two winning points and the opponent can take only one.',
    },
    setup: { blacks: 'F8 G8 H8 I9 I10 I11', whites: 'E8 I12 G10 K9', turn: 1 },
    keys: 'I8',
    view: FORK,
  },
  {
    id: 'fork-33', group: 'fork',
    name: { th: 'Fork 3-3', en: '3-3 fork' },
    desc: {
      th: 'ตาเดียวได้สามเปิดสองแนว อีกฝ่ายกันได้แนวเดียว อีกแนวจะกลายเป็นสี่เปิด',
      en: 'One move makes two open threes. The opponent can stop one, and the other becomes an open four.',
    },
    setup: { blacks: 'G8 H8 I9 I10', whites: 'G10 K10 F9', turn: 1 },
    keys: 'I8',
    view: FORK,
  },
];
