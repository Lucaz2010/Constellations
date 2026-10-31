/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const isDraggingNodeRef = useRef<string | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<ConstellationNode | null>(null);

  const animFrameIdRef = useRef<number | null>(null);

  const centerView = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    if (nodes.length === 0) {
      cameraRef.current = { x: width / 2, y: height / 2, zoom: 1 };
      setZoomLevel(1);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const graphWidth = Math.max(maxX - minX + 260, 420);
    const graphHeight = Math.max(maxY - minY + 260, 420);

    const fitZoom = Math.min(
      (width * 0.85) / graphWidth,
      (height * 0.85) / graphHeight,
      1.15
    );
    const clampedZoom = Math.max(0.45, Math.min(fitZoom, 1.2));

    cameraRef.current = {
      x: width / 2 - centerX * clampedZoom,
      y: height / 2 - centerY * clampedZoom,
      zoom: clampedZoom,
    };
    setZoomLevel(clampedZoom);
  }, [nodes]);

  // Recenter whenever hubs count changes or initial load
  const prevHubCountRef = useRef(0);
  useEffect(() => {
    const hubCount = nodes.filter((n) => n.type === 'hub').length;
    if (hubCount > 0 && hubCount !== prevHubCountRef.current) {
      prevHubCountRef.current = hubCount;
      centerView();
    }
  }, [nodes, centerView]);

  const handleZoom = (factor: number) => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const currentZoom = cameraRef.current.zoom;
    const newZoom = Math.max(0.3, Math.min(currentZoom * factor, 2.5));

    const cx = width / 2;
    const cy = height / 2;

    const wx = (cx - cameraRef.current.x) / currentZoom;
    const wy = (cy - cameraRef.current.y) / currentZoom;

    cameraRef.current.zoom = newZoom;
    cameraRef.current.x = cx - wx * newZoom;
    cameraRef.current.y = cy - wy * newZoom;

    setZoomLevel(newZoom);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.016;

      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // Force simulation step
      const nodeMap = new Map<string, ConstellationNode>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // Gentle repulsive force
      const kRepulsion = 3800;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (isDraggingNodeRef.current === a.id) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy + 80;
          const dist = Math.sqrt(distSq);

          let mult = 1;
          if (a.type === 'hub' || b.type === 'hub') mult = 2.4;
          if (a.type === 'bridge' || b.type === 'bridge') mult = 2.0;

          const force = (kRepulsion * mult) / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (isDraggingNodeRef.current !== a.id) {
            a.vx += fx * 0.08;
            a.vy += fy * 0.08;
          }
          if (isDraggingNodeRef.current !== b.id) {
            b.vx -= fx * 0.08;
            b.vy -= fy * 0.08;
          }
        }
      }

      // Edge spring attraction
      edges.forEach((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Level 1: 140px, Level 2 (subconcept): 90px, Bridge: 200px
        let targetDist = 140;
        if (tgt.type === 'subconcept') targetDist = 85;
        if (edge.isBridge) targetDist = 190;

        const spring = (dist - targetDist) * 0.02;
        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;

        if (isDraggingNodeRef.current !== src.id) {
          src.vx += fx;
          src.vy += fy;
        }
        if (isDraggingNodeRef.current !== tgt.id) {
          tgt.vx -= fx;
          tgt.vy -= fy;
        }
      });

      // Damping
      const damping = 0.86;
      nodes.forEach((n) => {
        if (isDraggingNodeRef.current === n.id) {
          n.vx = 0;
          n.vy = 0;
          return;
        }
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= damping;
        n.vy *= damping;
      });

      // Clear Canvas with sleek midnight navy matching screenshot
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#080E1E';
      ctx.fillRect(0, 0, width, height);

      // Subtle celestial vignette
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        60,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#0D1630');
      bgGrad.addColorStop(0.6, '#080E1E');
      bgGrad.addColorStop(1, '#050914');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Camera
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(cameraRef.current.x, cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

      // Draw Edges (Clean aesthetic lines matching screenshot)
      edges.forEach((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (edge.isBridge) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          ctx.save();
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.stroke();
          ctx.restore();
        } else if (tgt.type === 'subconcept') {
          // Subtle grey line for subconcepts (as in screenshot)
          ctx.strokeStyle = tgt.isCompleted ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          // Primary branch line (deep blue as in screenshot)
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;

        ctx.save();

        // 1. HUB NODE (Primary topic, e.g. "Black Holes", "Cooking", "Italy")
        if (node.type === 'hub') {
          // Radial outer glow
          const glow = ctx.createRadialGradient(node.x, node.y, 4, node.x, node.y, 28);
          glow.addColorStop(0, 'rgba(59, 130, 246, 0.7)');
          glow.addColorStop(0.6, 'rgba(59, 130, 246, 0.25)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 28, 0, Math.PI * 2);
          ctx.fill();

          // Outer circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#3B82F6';
          ctx.fill();

          // Inner white core
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 19, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Label beside / under node
          ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(node.name, node.x + 22, node.y);
          ctx.shadowBlur = 0;
        }

        // 2. LEVEL 1 CONCEPT (e.g. "Formation", "Structure", "Cooking Basics")
        else if (node.type === 'concept') {
          // Blue glow
          const glow = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, 20);
          glow.addColorStop(0, 'rgba(59, 130, 246, 0.7)');
          glow.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
          ctx.fill();

          // Node body
          ctx.beginPath();
          ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = node.isCompleted ? '#10B981' : '#3B82F6';
          ctx.fill();

          // Center white dot
          ctx.beginPath();
          ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Label
          ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected || isHovered ? '#FFFFFF' : '#E2E8F0';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(node.name, node.x + 16, node.y);
          ctx.shadowBlur = 0;
        }

        // 3. LEVEL 2 SUBCONCEPT (e.g. "Stellar Collapse", "Knife Skills")
        else if (node.type === 'subconcept') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = node.isCompleted ? '#10B981' : isHovered ? '#94A3B8' : '#64748B';
          ctx.fill();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }

          // Label
          ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected || isHovered ? '#FFFFFF' : '#CBD5E1';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(node.name, node.x + 12, node.y);
          ctx.shadowBlur = 0;
        }

        // 4. CROSSOVER BRIDGE (Between two overlapping paths!)
        else if (node.type === 'bridge') {
          const pulse = Math.sin(time * 3) * 4;
          const flare = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, 24 + pulse);
          flare.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          flare.addColorStop(0.5, 'rgba(230, 240, 255, 0.4)');
          flare.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = flare;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 24 + pulse, 0, Math.PI * 2);
          ctx.fill();

          // 4-point star cross flare
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(node.x - 22, node.y);
          ctx.lineTo(node.x + 22, node.y);
          ctx.moveTo(node.x, node.y - 22);
          ctx.lineTo(node.x, node.y + 22);
          ctx.stroke();

          // Core
          ctx.beginPath();
          ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(node.name, node.x + 24, node.y - 6);

          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#FCD34D';
          ctx.fillText(`CROSSOVER: ${node.subject} ✕ ${node.secondarySubject}`, node.x + 24, node.y + 10);
        }

        ctx.restore();
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [nodes, edges, selectedNodeId]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const screenToWorld = (screenX: number, screenY: number) => {
    const worldX = (screenX - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (screenY - cameraRef.current.y) / cameraRef.current.zoom;
    return { x: worldX, y: worldY };
  };

  const getNodeAtPosition = (screenX: number, screenY: number): ConstellationNode | null => {
    const { x, y } = screenToWorld(screenX, screenY);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const hitRadius = Math.max(node.radius + 14, 24);
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    lastMousePosRef.current = { x: clientX, y: clientY };

    const hit = getNodeAtPosition(clientX, clientY);
    if (hit) {
      isDraggingNodeRef.current = hit.id;
      onSelectNode(hit);
    } else {
      isPanningRef.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const dx = clientX - lastMousePosRef.current.x;
    const dy = clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: clientX, y: clientY };

    if (isDraggingNodeRef.current) {
      const dragged = nodes.find((n) => n.id === isDraggingNodeRef.current);
      if (dragged) {
        dragged.x += dx / cameraRef.current.zoom;
        dragged.y += dy / cameraRef.current.zoom;
        dragged.vx = 0;
        dragged.vy = 0;
      }
    } else if (isPanningRef.current) {
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
    } else {
      const hit = getNodeAtPosition(clientX, clientY);
      hoveredNodeRef.current = hit;
    }
  };

  const handlePointerUp = () => {
    isDraggingNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const currentZoom = cameraRef.current.zoom;
    const newZoom = Math.max(0.3, Math.min(currentZoom * zoomFactor, 2.5));

    const wx = (mouseX - cameraRef.current.x) / currentZoom;
    const wy = (mouseY - cameraRef.current.y) / currentZoom;

    cameraRef.current.zoom = newZoom;
    cameraRef.current.x = mouseX - wx * newZoom;
    cameraRef.current.y = mouseY - wy * newZoom;

    setZoomLevel(newZoom);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#080E1E] select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <div className="flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-2xl text-slate-300">
          <button
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
            className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
            className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-700/60 my-1" />
          <button
            onClick={centerView}
            title="Recenter Map"
            className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
