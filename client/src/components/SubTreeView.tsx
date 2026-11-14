import { cellLabel } from '@gomoku/shared/rules';
import { WIN_THRESHOLD } from '../engine/engine.ts';
import type { SubTree, TreeNode } from '../engine/engine.ts';
import { useLang } from '../i18n.tsx';

export function fmtScore(v: number): string {
  if (v >= WIN_THRESHOLD) return 'WIN';
  if (v <= -WIN_THRESHOLD) return 'LOSS';
  const a = Math.abs(v);
  const s = a >= 10_000 ? `${Math.round(a / 1000)}k` : String(a);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : '0';
}

const SLOT = 46;
const Y = [34, 128, 226];

interface Placed { node: TreeNode; x: number; y: number; path: number[]; parent?: Placed }

/** 2-ply tree drawn like the textbook figure: MAX root, MIN replies, Eval leaves. */
export default function SubTreeView({
  tree, selected, onSelect,
}: { tree: SubTree; selected: number[]; onSelect: (path: number[]) => void }) {
  const { t } = useLang();
  const placed: Placed[] = [];
  let slot = 0;
  const kids: Placed[] = [];
  const root: Placed = { node: tree.root, x: 0, y: Y[0], path: [] };
  for (const child of tree.root.children) {
    const c: Placed = { node: child, x: 0, y: Y[1], path: [child.move], parent: root };
    if (child.children.length === 0) {
      c.x = (slot++ + 0.5) * SLOT;
    } else {
      const first = slot;
      for (const leaf of child.children) {
        placed.push({ node: leaf, x: (slot++ + 0.5) * SLOT, y: Y[2], path: [child.move, leaf.move], parent: c });
      }
      c.x = ((first + slot) / 2) * SLOT;
    }
    kids.push(c);
  }
  const width = Math.max(slot, 1) * SLOT;
  root.x = width / 2;
  const all = [root, ...kids, ...placed];
  const isSel = (p: Placed) => p.path.length > 0 && p.path.every((m, i) => selected[i] === m) && p.path.length <= selected.length;

  return (
    <div className="subtree-scroll">
      <svg className="subtree" viewBox={`0 0 ${width} 262`} style={{ minWidth: Math.min(width, 1400) * 0.8 }}>
        {all.filter((p) => p.parent).map((p) => (
          <line
            key={`e${p.path.join('-')}`}
            className={`edge ${p.node.pruned ? 'pruned' : ''} ${p.node.best && p.parent!.node.best ? 'best' : ''}`}
            x1={p.parent!.x} y1={p.parent!.y + (p.parent!.path.length === 0 ? 14 : 12)} x2={p.x} y2={p.y - 14}
          />
        ))}
        {all.map((p) => {
          const depth = p.path.length;
          const n = p.node;
          const cls = `tnode d${depth} ${n.pruned ? 'pruned' : ''} ${n.best ? 'best' : ''} ${isSel(p) ? 'sel' : ''} ${n.win ? 'win' : ''}`;
          const val = n.pruned ? t('ตัด', 'cut') : fmtScore(n.value ?? 0);
          return (
            <g key={`n${p.path.join('-')}`} className={cls} onClick={() => onSelect(p.path)} transform={`translate(${p.x} ${p.y})`}>
              {depth === 0 && <polygon points="0,-18 22,14 -22,14" />}
              {depth === 1 && n.children.length > 0 && <polygon points="0,16 20,-14 -20,-14" />}
              {(depth === 2 || (depth === 1 && n.children.length === 0)) && <rect x={-20} y={-14} width={40} height={28} rx={6} />}
              <text className="tval" y={depth === 0 ? 5 : depth === 1 && n.children.length > 0 ? -3 : 0}>{val}</text>
              {depth > 0 && <text className="tmove" y={depth === 2 ? 27 : -22}>{cellLabel(n.move)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
