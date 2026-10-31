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

export const ConstellationCanvas: React.FC<ConstellationCanvasProps> = ({
                                                                          nodes,
                                                                          edges,
                                                                          selectedNodeId,
                                                                          onSelectNode,
                                                                        }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const posRef = useRef(new Map<string, { x: number; y: number }>());
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

  // Spacing between nodes
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-220);
    fg.d3Force('link')?.distance((l: any) =>
        l.isBridge ? 190 : l.target?.type === 'subconcept' ? 70 : 120
    );
  }, [graphData]);

  const paint = (n: any, ctx: CanvasRenderingContext2D) => {
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
      ctx.font = '600 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(n.name, n.x + 22, n.y);
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
      ctx.font = '500 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(n.name, n.x + 16, n.y);
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
      ctx.font = '400 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(n.name, n.x + 12, n.y);
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
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(n.name, n.x + 24, n.y - 6);
      ctx.font = '600 10px monospace';
      ctx.fillStyle = '#FCD34D';
      ctx.fillText(`CROSSOVER: ${n.subject} x ${n.secondarySubject}`, n.x + 24, n.y + 10);
    }
    ctx.restore();
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
            backgroundColor="#080E1E"
            autoPauseRedraw={false}
            cooldownTicks={120}
            nodeCanvasObject={paint as any}
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
                fgRef.current.zoomToFit(400, 80);
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
            <button onClick={() => fgRef.current?.zoomToFit(400, 80)} title="Recenter" className="p-2 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
  );
};