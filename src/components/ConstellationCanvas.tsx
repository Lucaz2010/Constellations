/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ConstellationNode, ConstellationEdge } from '../types/constellation';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ConstellationCanvasProps {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: ConstellationNode | null) => void;
}

// ---------------------------------------------------------------------------
// Labels: sizes, measuring, placement and collision
// ---------------------------------------------------------------------------

const BACKGROUND = '#080E1E';
const MAX_LABEL_CHARS = 26;
const LINE_HEIGHT = 1.25;
// Selected/hovered nodes reveal nearby labels before the zoom threshold, once they are this big on screen
const FOCUS_MIN_SCREEN_PX = 7;
// Hub and bridge labels grow when zoomed out. Reserve room for that growth down to the
// zoom where concept labels appear, so the bigger label never covers them.
const RESERVE_SCALE = 1.5;
const FIT_PADDING = 110; // px around the graph when fitting; leaves room for outer labels

type LabelType = 'hub' | 'concept' | 'subconcept' | 'bridge';

// minScale: zoom level from which the label is shown (unless the node is in focus).
// minScreenPx: labels that are always shown never shrink below this on-screen size.
const LABEL_STYLE: Record<LabelType, { weight: number; size: number; color: string; gap: number; minScale?: number; minScreenPx?: number }> = {
  hub: { weight: 600, size: 14, color: '#FFFFFF', gap: 22, minScreenPx: 13 },
  concept: { weight: 500, size: 13, color: '#E2E8F0', gap: 16, minScale: 0.62 },
  subconcept: { weight: 400, size: 12, color: '#CBD5E1', gap: 12, minScale: 0.75 },
  bridge: { weight: 700, size: 13, color: '#FFFFFF', gap: 24, minScreenPx: 12 },
};
const BRIDGE_DETAIL = { weight: 600, size: 10, color: '#FCD34D', family: 'monospace', minScale: 0.8 };

type Side = 'right' | 'left' | 'above' | 'below';
type Box = { x0: number; y0: number; x1: number; y1: number };
type Line = { text: string; font: string; size: number; color: string };

const truncate = (s: string) =>
  s.length > MAX_LABEL_CHARS ? s.slice(0, MAX_LABEL_CHARS - 1).trimEnd() + '…' : s;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

let measureCtx: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();
function textWidth(text: string, font: string): number {
  const key = font + '|' + text;
  let w = widthCache.get(key);
  if (w === undefined) {
    measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!measureCtx) return text.length * 7;
    measureCtx.font = font;
    w = measureCtx.measureText(text).width;
    widthCache.set(key, w);
  }
  return w;
}

const typeOf = (n: any): LabelType => (n.type in LABEL_STYLE ? n.type : 'concept');

// Label lines at a given font scale (1 = layout size)
function labelLines(n: any, fontScale = 1, withDetail = true): Line[] {
  const st = LABEL_STYLE[typeOf(n)];
  const size = st.size * fontScale;
  const lines: Line[] = [
    { text: truncate(n.name ?? ''), font: `${st.weight} ${size}px sans-serif`, size, color: st.color },
  ];
  if (n.type === 'bridge' && withDetail) {
    const d = BRIDGE_DETAIL;
    const dSize = d.size * fontScale;
    lines.push({
      text: `CROSSOVER: ${n.subject} x ${n.secondarySubject}`,
      font: `${d.weight} ${dSize}px ${d.family}`,
      size: dSize,
      color: d.color,
    });
  }
  return lines;
}

const blockSize = (lines: Line[]) => ({
  w: Math.max(...lines.map((l) => textWidth(l.text, l.font))),
  h: lines.reduce((sum, l) => sum + l.size * LINE_HEIGHT, 0),
});

// Which side of the star the label goes on.
// - hub: below (its concepts surround it on every side anyway)
// - concept: across the hub→concept line; that line is busy with the hub on one
//   side and the concept's own sub-concepts fanning out on the other
// - sub-concept: away from its concept, so leaf labels point outward like rays
// - bridge: across the line between its two hubs, which it sits on
function sideFor(n: any, parent: { x: number; y: number } | undefined, bridgeAxis?: { dx: number; dy: number }): Side {
  if (n.type === 'hub') return 'below';
  if (n.type === 'bridge') {
    if (!bridgeAxis) return 'above';
    return Math.abs(bridgeAxis.dx) >= Math.abs(bridgeAxis.dy) ? 'above' : 'right';
  }
  if (!parent) return 'right';
  const dx = n.x - parent.x;
  const dy = n.y - parent.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return 'right';
  if (n.type === 'concept') {
    // Mostly horizontal link → label above/below; mostly vertical → left/right (outward)
    if (Math.abs(dx) >= Math.abs(dy)) return dy >= 0 ? 'below' : 'above';
    return dx >= 0 ? 'right' : 'left';
  }
  const cos = dx / len;
  if (cos > 0.38) return 'right';
  if (cos < -0.38) return 'left';
  return dy > 0 ? 'below' : 'above';
}

// Label rectangle relative to the node centre
function labelBox(n: any, side: Side, w: number, h: number): Box {
  const st = LABEL_STYLE[typeOf(n)];
  const r = n.radius ?? 8;
  switch (side) {
    case 'right':
      return { x0: st.gap, y0: -h / 2, x1: st.gap + w, y1: h / 2 };
    case 'left':
      return { x0: -st.gap - w, y0: -h / 2, x1: -st.gap, y1: h / 2 };
    case 'below':
      return { x0: -w / 2, y0: r + 4, x1: w / 2, y1: r + 4 + h };
    case 'above':
      return { x0: -w / 2, y0: -r - 4 - h, x1: w / 2, y1: -r - 4 };
  }
}

// Rectangle collision force: keeps star + label boxes from overlapping.
// Same idea as d3.forceCollide, but with rectangles so wide labels get room
// sideways without blowing up the vertical spacing.
function labelCollideForce(getBox: (n: any) => Box, strength = 0.7, pad = 4) {
  let nodes: any[] = [];
  const force = () => {
    const items = nodes
      .filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y))
      .map((n) => {
        const b = getBox(n);
        return { n, x0: n.x + b.x0 - pad, y0: n.y + b.y0 - pad, x1: n.x + b.x1 + pad, y1: n.y + b.y1 + pad };
      })
      .sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];
        if (b.x0 >= a.x1) break; // sorted by x0: nothing further right can overlap
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox <= 0 || oy <= 0) continue;
        // Push apart along the axis with the smaller overlap
        if (ox < oy) {
          const dir = a.x0 + a.x1 < b.x0 + b.x1 ? -1 : 1;
          const s = dir * ox * strength * 0.5;
          a.n.vx += s;
          b.n.vx -= s;
        } else {
          const dir = a.y0 + a.y1 < b.y0 + b.y1 ? -1 : 1;
          const s = dir * oy * strength * 0.5;
          a.n.vy += s;
          b.n.vy -= s;
        }
      }
    }
  };
  force.initialize = (ns: any[]) => {
    nodes = ns;
  };
  return force;
}

// ---------------------------------------------------------------------------

export const ConstellationCanvas: React.FC<ConstellationCanvasProps> = ({
                                                                          nodes,
                                                                          edges,
                                                                          selectedNodeId,
                                                                          onSelectNode,
                                                                        }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const posRef = useRef(new Map<string, { x: number; y: number }>());
  const hoverRef = useRef<string | null>(null);
  const needFit = useRef(true);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Track the container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  // Fit the view whenever the number of nodes changes
  useEffect(() => {
    needFit.current = true;
  }, [nodes.length]);

  // Copies, so the library never mutates React state; old positions are kept
  const graphData = useMemo(
      () => ({
        nodes: nodes.map((n) => {
          const p = posRef.current.get(n.id);
          return { ...n, ...(p ? { x: p.x, y: p.y } : {}) };
        }),
        links: edges.map((e) => ({ ...e })),
      }),
      [nodes, edges]
  );

  // Lookups on the live (simulated) node objects
  const index = useMemo(() => {
    const byId = new Map<string, any>();
    const hubBySubject = new Map<string, any>();
    for (const n of graphData.nodes as any[]) {
      byId.set(n.id, n);
      if (n.type === 'hub') hubBySubject.set(String(n.subject).toLowerCase(), n);
    }
    return { byId, hubBySubject, hubs: [...hubBySubject.values()] };
  }, [graphData]);

  // Direction of a bridge's hub-to-hub line
  const bridgeAxis = (n: any): { dx: number; dy: number } | undefined => {
    if (n.type !== 'bridge') return undefined;
    const a = index.hubBySubject.get(String(n.subject).toLowerCase());
    const b = index.hubBySubject.get(String(n.secondarySubject).toLowerCase());
    return a && b ? { dx: b.x - a.x, dy: b.y - a.y } : undefined;
  };
  const sideOf = (n: any) => sideFor(n, parentOf(n), bridgeAxis(n));

  const parentOf = (n: any): { x: number; y: number } | undefined => {
    const p = index.byId.get(n.parentId);
    return p && Number.isFinite(p.x) ? p : undefined;
  };

  // Star + label box at layout size (labels count even while hidden, so zooming
  // in never reveals overlapping text)
  const collisionBox = (n: any): Box => {
    const { w, h } = blockSize(labelLines(n, LABEL_STYLE[typeOf(n)].minScreenPx ? RESERVE_SCALE : 1));
    const lb = labelBox(n, sideOf(n), w, h);
    const r = (n.radius ?? 8) + 2;
    return { x0: Math.min(-r, lb.x0), y0: Math.min(-r, lb.y0), x1: Math.max(r, lb.x1), y1: Math.max(r, lb.y1) };
  };

  // Spacing between nodes
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // Label collision does most of the spacing now, so repulsion can stay mild
    fg.d3Force('charge')?.strength(-200);
    fg.d3Force('link')?.distance((l: any) =>
        l.isBridge ? 190 : l.target?.type === 'subconcept' ? 75 : 120
    );
    fg.d3Force('labels', labelCollideForce(collisionBox));
    fg.d3ReheatSimulation?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // Selected / hovered node, its parent and its direct children
  const isFocused = (n: any): boolean => {
    for (const id of [selectedNodeId, hoverRef.current]) {
      if (!id) continue;
      if (n.id === id || n.parentId === id) return true;
      if (index.byId.get(id)?.parentId === n.id) return true;
    }
    return false;
  };

  const labelVisible = (n: any, scale: number) => {
    const st = LABEL_STYLE[typeOf(n)];
    if (st.minScale === undefined) return true;
    if (scale >= st.minScale) return true;
    return isFocused(n) && st.size * scale >= FOCUS_MIN_SCREEN_PX;
  };

  const drawLabel = (n: any, ctx: CanvasRenderingContext2D, scale: number) => {
    if (!labelVisible(n, scale)) return;
    const st = LABEL_STYLE[typeOf(n)];
    // Always-on labels (hubs, bridges) stay readable when zoomed out
    const fontScale = st.minScreenPx ? Math.max(1, st.minScreenPx / (st.size * scale)) : 1;
    const withDetail = n.type !== 'bridge' || scale >= BRIDGE_DETAIL.minScale || isFocused(n);
    const lines = labelLines(n, fontScale, withDetail);
    const { w, h } = blockSize(lines);
    const side = sideOf(n);
    const box = labelBox(n, side, w, h);

    ctx.textBaseline = 'top';
    ctx.textAlign = side === 'right' ? 'left' : side === 'left' ? 'right' : 'center';
    const x = side === 'right' ? n.x + box.x0 : side === 'left' ? n.x + box.x1 : n.x;
    let y = n.y + box.y0;
    // Dark halo behind the text keeps it legible over links and glows
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 / scale;
    ctx.strokeStyle = BACKGROUND;
    for (const line of lines) {
      ctx.font = line.font;
      ctx.strokeText(line.text, x, y);
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, x, y);
      y += line.size * LINE_HEIGHT;
    }
  };

  const paint = (n: any, ctx: CanvasRenderingContext2D, scale: number) => {
    posRef.current.set(n.id, { x: n.x, y: n.y });
    const selected = n.id === selectedNodeId;
    ctx.save();

    if (n.type === 'hub') {
      const glow = ctx.createRadialGradient(n.x, n.y, 4, n.x, n.y, 28);
      glow.addColorStop(0, 'rgba(59,130,246,0.7)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 19, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (n.type === 'concept') {
      const glow = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, 20);
      glow.addColorStop(0, n.isCompleted ? 'rgba(16,185,129,0.7)' : 'rgba(59,130,246,0.7)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = n.isCompleted ? '#10B981' : '#3B82F6';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (n.type === 'subconcept') {
      ctx.fillStyle = n.isCompleted ? '#10B981' : '#64748B';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // bridge
      const pulse = Math.sin(Date.now() / 300) * 4;
      const flare = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, 24 + pulse);
      flare.addColorStop(0, 'rgba(255,255,255,0.95)');
      flare.addColorStop(0.5, 'rgba(230,240,255,0.4)');
      flare.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 24 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    drawLabel(n, ctx, scale);
    ctx.restore();
  };

  // Tooltip only when the label is cut off or hidden at the current zoom
  const tooltipFor = (n: any): string => {
    const scale = fgRef.current?.zoom?.() ?? 1;
    const name = String(n.name ?? '');
    const truncated = truncate(name) !== name;
    return truncated || !labelVisible(n, scale) ? escapeHtml(name) : '';
  };

  const zoomBy = (k: number) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * k, 200);
  };

  return (
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#080E1E] select-none">
        <ForceGraph2D
            ref={fgRef}
            width={size.w}
            height={size.h}
            graphData={graphData as any}
            backgroundColor={BACKGROUND}
            autoPauseRedraw={false}
            cooldownTicks={160}
            nodeCanvasObject={paint as any}
            nodeLabel={tooltipFor as any}
            onNodeHover={(n: any) => {
              hoverRef.current = n?.id ?? null;
            }}
            nodePointerAreaPaint={(n: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x, n.y, Math.max((n.radius || 8) + 8, 14), 0, Math.PI * 2);
              ctx.fill();
            }}
            linkColor={(l: any) =>
                l.isBridge
                    ? '#FFFFFF'
                    : typeof l.target === 'object' && l.target?.type === 'subconcept'
                        ? 'rgba(100,116,139,0.5)'
                        : 'rgba(59,130,246,0.65)'
            }
            linkWidth={(l: any) => (l.isBridge ? 2.2 : 1.4)}
            onNodeClick={(n: any) => {
              const original = nodes.find((x) => x.id === n.id);
              if (original) onSelectNode(original);
            }}
            onEngineStop={() => {
              if (needFit.current && fgRef.current) {
                needFit.current = false;
                fgRef.current.zoomToFit(400, FIT_PADDING);
              }
            }}
        />

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <div className="flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-2xl text-slate-300">
            <button onClick={() => zoomBy(1.3)} title="Zoom In" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => zoomBy(1 / 1.3)} title="Zoom Out" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px bg-slate-700/60 my-1" />
            <button onClick={() => fgRef.current?.zoomToFit(400, FIT_PADDING)} title="Recenter" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
  );
};
