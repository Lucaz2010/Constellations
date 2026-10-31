/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ConstellationNode,
  ConstellationEdge,
  PathMeta,
  AISettings,
} from './types/constellation';
import { ConstellationCanvas } from './components/ConstellationCanvas';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { AIService } from './services/aiService';

export default function App() {
  const [nodes, setNodes] = useState<ConstellationNode[]>([]);
  const [edges, setEdges] = useState<ConstellationEdge[]>([]);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAttemptedSubject, setLastAttemptedSubject] = useState<string | null>(null);

  const [settings] = useState<AISettings>({
    provider: 'gemini-cloud',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'gemma:4b',
    showParticles: false,
    autoConnectOverlaps: true,
  });

  // Method to add a new subject path
  const addPath = useCallback(
    async (subjectName: string, forceOffline: boolean = false) => {
      const cleanName = subjectName.trim();
      if (!cleanName) return;

      if (paths.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
        const existing = paths.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());
        if (existing) {
          setSelectedPathId(existing.id);
          const hubNode = nodes.find((n) => n.id === existing.hubNodeId);
          if (hubNode) setSelectedNode(hubNode);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setLastAttemptedSubject(cleanName);

      try {
        const result = forceOffline
          ? AIService.generateEmergencyOfflineFallback(cleanName)
          : await AIService.generateConstellation(cleanName, settings);

        // Position new cluster
        const pathIndex = paths.length;
        let hubX = 0;
        let hubY = 0;

        if (pathIndex === 1) {
          hubX = 380;
          hubY = 0;
        } else if (pathIndex > 1) {
          const angle = (pathIndex * 2 * Math.PI) / Math.max(paths.length + 1, 4);
          hubX = Math.cos(angle) * 440;
          hubY = Math.sin(angle) * 440;
        }

        const pathId = `path-${cleanName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        const hubId = `hub-${cleanName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        const hubNode: ConstellationNode = {
          id: hubId,
          name: result.subject,
          type: 'hub',
          subject: result.subject,
          description: result.description,
          color: '#3B82F6',
          x: hubX,
          y: hubY,
          vx: 0,
          vy: 0,
          radius: 14,
          importance: 1.0,
          quiz: result.quiz,
          isOfflineFallback: result.isOfflineFallback,
          createdAt: Date.now(),
        };

        const newNodes: ConstellationNode[] = [hubNode];
        const newEdges: ConstellationEdge[] = [];

        const branchCount = result.concepts.length;
        let totalCount = 1;

        result.concepts.forEach((concept, cIdx) => {
          const branchAngle = (cIdx * 2 * Math.PI) / branchCount;
          const branchDist = 130 + (cIdx % 2) * 20;
          const branchId = `concept-${cIdx}-${Date.now()}`;

          const branchX = hubX + Math.cos(branchAngle) * branchDist;
          const branchY = hubY + Math.sin(branchAngle) * branchDist;

          const branchNode: ConstellationNode = {
            id: branchId,
            name: concept.name,
            type: 'concept',
            subject: result.subject,
            parentId: hubId,
            description: concept.description,
            color: '#3B82F6',
            x: branchX,
            y: branchY,
            vx: 0,
            vy: 0,
            radius: 10,
            importance: 0.85,
            subConcepts: concept.subConcepts,
            also_in: concept.also_in,
            quiz: concept.quiz,
            isOfflineFallback: result.isOfflineFallback,
            createdAt: Date.now(),
          };

          newNodes.push(branchNode);
          totalCount++;

          newEdges.push({
            id: `edge-${hubId}-${branchId}`,
            source: hubId,
            target: branchId,
            color: '#3B82F6',
          });

          // Sub-concepts (Level 2)
          if (concept.subConcepts && concept.subConcepts.length > 0) {
            const subCount = concept.subConcepts.length;
            concept.subConcepts.forEach((subName, sIdx) => {
              const subOffsetAngle = branchAngle + ((sIdx - (subCount - 1) / 2) * 0.4);
              const subDist = 80;
              const subId = `sub-${cIdx}-${sIdx}-${Date.now()}`;

              const subX = branchX + Math.cos(subOffsetAngle) * subDist;
              const subY = branchY + Math.sin(subOffsetAngle) * subDist;

              const subNode: ConstellationNode = {
                id: subId,
                name: subName,
                type: 'subconcept',
                subject: result.subject,
                parentId: branchId,
                description: `${subName} is a specific focus area within ${concept.name}.`,
                color: '#64748B',
                x: subX,
                y: subY,
                vx: 0,
                vy: 0,
                radius: 7,
                importance: 0.6,
                quiz: {
                  question: `How does "${subName}" relate to ${concept.name}?`,
                  options: [
                    `It is a concrete subtopic and practical focus within ${concept.name}`,
                    `It has no relation to ${concept.name}`,
                    `It is an obsolete concept with no current application`,
                    `It only exists in speculative fiction`,
                  ],
                  answerIndex: 0,
                  explanation: `"${subName}" is an authentic practical sub-topic of ${concept.name}.`,
                },
                isOfflineFallback: result.isOfflineFallback,
                createdAt: Date.now(),
              };

              newNodes.push(subNode);
              totalCount++;

              newEdges.push({
                id: `edge-${branchId}-${subId}`,
                source: branchId,
                target: subId,
                color: '#64748B',
              });
            });
          }
        });

        setNodes((prev) => [...prev, ...newNodes]);
        setEdges((prev) => [...prev, ...newEdges]);

        const newPath: PathMeta = {
          id: pathId,
          name: result.subject.toLowerCase(),
          color: '#3B82F6',
          hubNodeId: hubId,
          totalNodes: totalCount,
          completedNodes: 0,
          description: result.description,
          isOfflineFallback: result.isOfflineFallback,
        };

        setPaths((prev) => [...prev, newPath]);
        setSelectedPathId(pathId);
        setSelectedNode(hubNode);

        // Auto-discover crossover bridge if 2 paths exist
        if (paths.length === 1) {
          const other = paths[0];
          setTimeout(() => {
            discoverCrossoverBridge(cleanName, other.name);
          }, 600);
        }
      } catch (err: any) {
        console.error('Error creating path:', err);
        setErrorMessage(
          err.message || `Failed to generate constellation for "${cleanName}".`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [paths, nodes, settings]
  );

  // Discover crossover between two paths
  const discoverCrossoverBridge = async (subA: string, subB: string) => {
    try {
      const bridgeData = await AIService.discoverBridge(subA, subB, settings);

      const hubA = nodes.find(
        (n) => n.type === 'hub' && n.subject.toLowerCase() === subA.toLowerCase()
      );
      const hubB = nodes.find(
        (n) => n.type === 'hub' && n.subject.toLowerCase() === subB.toLowerCase()
      );

      const midX = hubA && hubB ? (hubA.x + hubB.x) / 2 : 180;
      const midY = hubA && hubB ? (hubA.y + hubB.y) / 2 : 0;

      const bridgeId = `bridge-${Date.now()}`;
      const bridgeNode: ConstellationNode = {
        id: bridgeId,
        name: bridgeData.bridgeConcept,
        type: 'bridge',
        subject: subA,
        secondarySubject: subB,
        description: bridgeData.explanation,
        explanation: bridgeData.explanation,
        subConcepts: bridgeData.subConcepts,
        realWorldImpact: bridgeData.realWorldImpact,
        color: '#FFFFFF',
        x: midX,
        y: midY,
        vx: 0,
        vy: 0,
        radius: 12,
        importance: 0.99,
        quiz: {
          question: `Why is the crossover between ${subA} and ${subB} significant?`,
          options: [
            bridgeData.realWorldImpact || `It bridges key methodologies and insights from both fields`,
            `They have zero conceptual connection`,
            `It makes both domains harder to understand`,
            `It has no practical real-world use`,
          ],
          answerIndex: 0,
          explanation: bridgeData.explanation,
        },
        createdAt: Date.now(),
      };

      const newEdges: ConstellationEdge[] = [];
      if (hubA) {
        newEdges.push({
          id: `edge-${hubA.id}-${bridgeId}`,
          source: hubA.id,
          target: bridgeId,
          color: '#FFFFFF',
          isBridge: true,
        });
      }
      if (hubB) {
        newEdges.push({
          id: `edge-${hubB.id}-${bridgeId}`,
          source: hubB.id,
          target: bridgeId,
          color: '#FFFFFF',
          isBridge: true,
        });
      }

      setNodes((prev) => [...prev, bridgeNode]);
      setEdges((prev) => [...prev, ...newEdges]);
      setSelectedNode(bridgeNode);
    } catch (err) {
      console.error('Error discovering bridge:', err);
    }
  };

  // Remove path
  const handleRemovePath = (pathId: string) => {
    const targetPath = paths.find((p) => p.id === pathId);
    if (!targetPath) return;

    const norm = targetPath.name.toLowerCase();
    setNodes((prev) =>
      prev.filter(
        (n) =>
          n.subject.toLowerCase() !== norm &&
          n.secondarySubject?.toLowerCase() !== norm
      )
    );
    setEdges((prev) => {
      const remainingNodeIds = new Set(
        nodes
          .filter(
            (n) =>
              n.subject.toLowerCase() !== norm &&
              n.secondarySubject?.toLowerCase() !== norm
          )
          .map((n) => n.id)
      );
      return prev.filter(
        (e) => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
      );
    });
    setPaths((prev) => prev.filter((p) => p.id !== pathId));

    if (selectedNode?.subject.toLowerCase() === norm) {
      setSelectedNode(null);
    }
  };

  // Mark node completed
  const handleCompleteNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isCompleted: true } : n))
    );

    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setPaths((prev) =>
        prev.map((p) => {
          if (p.name.toLowerCase() === node.subject.toLowerCase()) {
            return {
              ...p,
              completedNodes: Math.min(p.totalNodes, p.completedNodes + 1),
            };
          }
          return p;
        })
      );
    }
  };

  // On first mount: Load initial path via AI
  useEffect(() => {
    addPath('Black Holes');
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080E1E] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left Sidebar */}
      <LeftSidebar
        paths={paths}
        selectedPathId={selectedPathId}
        onSelectPath={(pathId) => {
          setSelectedPathId(pathId);
          const p = paths.find((path) => path.id === pathId);
          if (p) {
            const hub = nodes.find((n) => n.id === p.hubNodeId);
            if (hub) setSelectedNode(hub);
          }
        }}
        onAddPath={(name) => addPath(name)}
        onRemovePath={handleRemovePath}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={lastAttemptedSubject ? () => addPath(lastAttemptedSubject) : undefined}
        onUseOfflineFallback={
          lastAttemptedSubject ? () => addPath(lastAttemptedSubject, true) : undefined
        }
        onDiscoverCrossover={
          paths.length >= 2
            ? () => discoverCrossoverBridge(paths[0].name, paths[1].name)
            : undefined
        }
      />

      {/* Main Canvas Graph */}
      <main className="relative flex-1 h-full overflow-hidden">
        <ConstellationCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
        />
      </main>

      {/* Right Sidebar */}
      {selectedNode && (
        <RightSidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onCompleteNode={handleCompleteNode}
        />
      )}
    </div>
  );
}
