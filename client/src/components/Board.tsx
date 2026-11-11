import { CELLS, SIZE, cellLabel, colOf, rowOf } from '@gomoku/shared/rules';
import type { Board as BoardData, Player } from '@gomoku/shared/rules';

const STEP = 32;
const PAD = 30;
const FULL = PAD * 2 + STEP * (SIZE - 1);
const STARS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
const COLS = 'ABCDEFGHIJKLMNO';

const x = (cell: number) => PAD + colOf(cell) * STEP;
const y = (cell: number) => PAD + rowOf(cell) * STEP;

export interface HeatCell { cell: number; /** 0..1, 1 = best */ t: number; rank: number }
export interface Mark { cell: number; kind: 'key' | 'block' }
export interface Ghost { cell: number; color: Player; text?: string }

interface Props {
  board: BoardData;
  onPlay?: (cell: number) => void;
  lastMove?: number | null;
  winLine?: number[] | null;
  /** stone waiting for a second tap to confirm */
  pending?: Ghost | null;
  heat?: HeatCell[];
  marks?: Mark[];
  ghosts?: Ghost[];
  /** highlight these empty points (candidate moves) */
  dots?: number[];
  /** crop to [row0, col0, row1, col1] (inclusive) for small diagrams */
  view?: [number, number, number, number];
  coords?: boolean;
  /** also report clicks on stones (for erasing while setting up a position) */
  clickOccupied?: boolean;
  label?: string;
}

function Stone({ cell, color, cls = '', text }: { cell: number; color: Player; cls?: string; text?: string }) {
  return (
    <g className={`stone ${color === 1 ? 'black' : 'white'} ${cls}`}>
      <circle cx={x(cell)} cy={y(cell)} r={13.5} />
      {text && <text x={x(cell)} y={y(cell)} className="stone-text">{text}</text>}
    </g>
  );
}

export default function Board({
  board, onPlay, lastMove, winLine, pending, heat, marks, ghosts, dots, view, coords = true, clickOccupied, label,
}: Props) {
  let vb = `0 0 ${FULL} ${FULL}`;
  if (view) {
    const [r0, c0, r1, c1] = view;
    const half = STEP / 2 + 3;
    vb = `${PAD + c0 * STEP - half} ${PAD + r0 * STEP - half} ${(c1 - c0) * STEP + half * 2} ${(r1 - r0) * STEP + half * 2}`;
  }
  const lines = [];
  for (let i = 0; i < SIZE; i++) {
    const p = PAD + i * STEP;
    lines.push(<line key={`h${i}`} x1={PAD} y1={p} x2={FULL - PAD} y2={p} />);
    lines.push(<line key={`v${i}`} x1={p} y1={PAD} x2={p} y2={FULL - PAD} />);
  }
  const win = new Set(winLine ?? []);
  const cells = Array.from({ length: CELLS }, (_, i) => i);

  return (
    <svg className={`goban ${onPlay ? 'playable' : ''}`} viewBox={vb} role="img" aria-label={label ?? 'Board'}>
      <rect className="goban-bg" x={0} y={0} width={FULL} height={FULL} rx={10} />
      <g className="goban-lines">{lines}</g>
      {STARS.map(([r, c]) => <circle key={`${r}-${c}`} className="goban-star" cx={PAD + c * STEP} cy={PAD + r * STEP} r={3} />)}
      {coords && !view && (
        <g className="goban-coords">
          {Array.from({ length: SIZE }, (_, i) => (
            <g key={i}>
              <text x={PAD + i * STEP} y={FULL - 8}>{COLS[i]}</text>
              <text x={10} y={PAD + i * STEP}>{SIZE - i}</text>
            </g>
          ))}
        </g>
      )}

      {dots?.map((cell) => <circle key={cell} className="goban-dot" cx={x(cell)} cy={y(cell)} r={5} />)}

      {heat?.map((h) => (
        <g key={h.cell} className={`heat ${h.rank === 1 ? 'top' : ''}`}>
          <circle cx={x(h.cell)} cy={y(h.cell)} r={12.5} style={{ opacity: 0.18 + 0.7 * h.t }} />
          {h.rank <= 5 && <text x={x(h.cell)} y={y(h.cell)}>{h.rank}</text>}
        </g>
      ))}

      {cells.map((cell) => board[cell] ? (
        <Stone key={cell} cell={cell} color={board[cell] as Player} cls={win.has(cell) ? 'win' : ''} />
      ) : null)}

      {lastMove != null && board[lastMove] !== 0 && (
        <circle className={`last-mark ${board[lastMove] === 1 ? 'on-black' : 'on-white'}`} cx={x(lastMove)} cy={y(lastMove)} r={4} />
      )}

      {ghosts?.map((g) => <Stone key={g.cell} cell={g.cell} color={g.color} cls="ghost" text={g.text} />)}
      {pending && <Stone cell={pending.cell} color={pending.color} cls="pending" />}

      {marks?.map((m) => (
        <g key={m.cell} className={`mark ${m.kind}`}>
          <circle cx={x(m.cell)} cy={y(m.cell)} r={9} />
          <text x={x(m.cell)} y={y(m.cell)}>{m.kind === 'key' ? '★' : '✕'}</text>
        </g>
      ))}

      {onPlay && cells.map((cell) => board[cell] === 0 || clickOccupied ? (
        <circle
          key={cell}
          className="hit"
          cx={x(cell)} cy={y(cell)} r={STEP / 2}
          onClick={() => onPlay(cell)}
        >
          <title>{cellLabel(cell)}</title>
        </circle>
      ) : null)}
    </svg>
  );
}
