import type { TileRect, Wall, WallTileCalculation, WallTileCell } from "./core";

/** Same geometric precision as the tiling engine; this is not an installation limit. */
const EDGE_EPSILON_MM = 1e-6;

export interface TilePart {
  bounds: TileRect;
  fragments: TileRect[];
  areaM2: number;
  rectangular: boolean;
}

export interface WallCutEntry {
  roomId: string;
  wall: Wall;
  tileNumber: number;
  cell: WallTileCell;
  parts: TilePart[];
  narrowestPart: TilePart;
  minSideMm: number;
}

interface Edge { at: number; start: number; end: number; index: number; side: 0 | 1 }

/** Joins positive shared edges. A corner contact alone cannot make a physical part. */
export function connectedTileParts(fragments: TileRect[]): TilePart[] {
  if (!fragments.length) return [];
  const parent = fragments.map((_, index) => index);
  const rank = fragments.map(() => 0);
  const root = (index: number): number => {
    while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; }
    return index;
  };
  const join = (first: number, second: number) => {
    let a = root(first), b = root(second);
    if (a === b) return;
    if (rank[a] < rank[b]) [a, b] = [b, a];
    parent[b] = a;
    if (rank[a] === rank[b]) rank[a]++;
  };
  const matchEdges = (edges: Edge[]) => {
    edges.sort((a, b) => a.at - b.at);
    for (let start = 0; start < edges.length;) {
      let end = start + 1;
      while (end < edges.length && edges[end].at - edges[start].at <= EDGE_EPSILON_MM) end++;
      const group = edges.slice(start, end);
      const left = group.filter((edge) => edge.side === 0).sort((a, b) => a.start - b.start);
      const right = group.filter((edge) => edge.side === 1).sort((a, b) => a.start - b.start);
      // The engine emits disjoint rectangles, so intervals on one side do not overlap.
      for (let a = 0, b = 0; a < left.length && b < right.length;) {
        const first = left[a], second = right[b];
        if (Math.min(first.end, second.end) - Math.max(first.start, second.start) > EDGE_EPSILON_MM) join(first.index, second.index);
        if (first.end < second.end) a++;
        else if (second.end < first.end) b++;
        else { a++; b++; }
      }
      start = end;
    }
  };
  if (fragments.length > 1) {
    const vertical: Edge[] = [], horizontal: Edge[] = [];
    fragments.forEach((p, index) => {
      vertical.push({ at: p.xMm, start: p.yMm, end: p.yMm + p.heightMm, index, side: 0 }, { at: p.xMm + p.widthMm, start: p.yMm, end: p.yMm + p.heightMm, index, side: 1 });
      horizontal.push({ at: p.yMm, start: p.xMm, end: p.xMm + p.widthMm, index, side: 0 }, { at: p.yMm + p.heightMm, start: p.xMm, end: p.xMm + p.widthMm, index, side: 1 });
    });
    matchEdges(vertical); matchEdges(horizontal);
  }
  const groups = new Map<number, TileRect[]>();
  fragments.forEach((fragment, index) => {
    const id = root(index), group = groups.get(id);
    if (group) group.push(fragment); else groups.set(id, [fragment]);
  });
  return [...groups.values()].map((group): TilePart => {
    let x = Infinity, y = Infinity, right = -Infinity, top = -Infinity, area = 0;
    for (const p of group) {
      x = Math.min(x, p.xMm); y = Math.min(y, p.yMm);
      right = Math.max(right, p.xMm + p.widthMm); top = Math.max(top, p.yMm + p.heightMm);
      area += p.widthMm * p.heightMm;
    }
    const bounds = { xMm: x, yMm: y, widthMm: right - x, heightMm: top - y };
    const boxArea = bounds.widthMm * bounds.heightMm;
    return { bounds, fragments: group, areaM2: area / 1e6, rectangular: Math.abs(boxArea - area) <= Number.EPSILON * Math.max(1, boxArea) * group.length * 4 };
  }).sort((a, b) => a.bounds.yMm - b.bounds.yMm || a.bounds.xMm - b.bounds.xMm);
}

/** One entry per source tile, not per rectangle from opening subtraction. */
export function reviewWallCuts(walls: readonly WallTileCalculation[]): WallCutEntry[] {
  const entries: WallCutEntry[] = [];
  for (const wall of walls) wall.cells.forEach((cell, index) => {
    if (!cell.isCut) return;
    const parts = connectedTileParts(cell.fragments);
    if (!parts.length) return;
    const narrowestPart = parts.reduce((smallest, part) => Math.min(part.bounds.widthMm, part.bounds.heightMm) < Math.min(smallest.bounds.widthMm, smallest.bounds.heightMm) ? part : smallest);
    entries.push({ roomId: wall.roomId, wall: wall.wall, tileNumber: index + 1, cell, parts, narrowestPart, minSideMm: Math.min(narrowestPart.bounds.widthMm, narrowestPart.bounds.heightMm) });
  });
  return entries.sort((a, b) => a.minSideMm - b.minSideMm || a.wall - b.wall || a.tileNumber - b.tileNumber);
}
