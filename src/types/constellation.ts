/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NodeType = 'hub' | 'concept' | 'subconcept' | 'bridge';

export interface ConceptQuiz {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ConstellationNode {
  id: string;
  name: string;
  type: NodeType;
  subject: string;
  secondarySubject?: string;
  parentId?: string;
  description: string;
  color: string;
  secondaryColor?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  importance: number;
  subConcepts?: string[];
  also_in?: string[];
  explanation?: string;
  realWorldImpact?: string;
  quiz?: ConceptQuiz;
  isCompleted?: boolean;
  isOfflineFallback?: boolean;
  createdAt: number;
}

export interface ConstellationEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  isBridge?: boolean;
  strength?: number;
  label?: string;
}

export interface PathMeta {
  id: string;
  name: string;
  color: string;
  hubNodeId: string;
  totalNodes: number;
  completedNodes: number;
  description: string;
  isOfflineFallback?: boolean;
}

export interface BridgeResult {
  bridgeConcept: string;
  explanation: string;
  subConcepts: string[];
  realWorldImpact: string;
  subjectA: string;
  subjectB: string;
}

export interface ConceptBranch {
  name: string;
  description: string;
  subConcepts: string[];
  also_in?: string[];
  quiz?: ConceptQuiz;
}

// In-depth explanation of one concept, generated on demand when it is selected
export interface DeepDive {
  overview: string;
  keyIdeas: string[];
  example: string;
  whyItMatters: string;
  related: string[];
}

export interface ConstellationGenerationResult {
  subject: string;
  description: string;
  quiz?: ConceptQuiz;
  concepts: ConceptBranch[];
  isOfflineFallback?: boolean;
}

export type AIProvider = 'gemma-local' | 'gemini-cloud' | 'instant-cache';

export interface AISettings {
  provider: AIProvider;
  ollamaUrl: string;
  ollamaModel: string;
  showParticles: boolean;
  autoConnectOverlaps: boolean;
}
