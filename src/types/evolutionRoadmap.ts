/**
 * JOBS 1.0 — Tipos e Interfaces do Plano Técnico Priorizado de Evolução
 * Cobre as Fases 0 a 11 com critérios de aceitação, entregáveis, papéis e auditoria contábil/LGPD.
 */

export type PhaseStatus = 'completed' | 'in_progress' | 'planned' | 'blocked';

export type EvolutionPhaseNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface PhaseAcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
  testReference?: string;
  verifiedAt?: string;
}

export interface PhaseDeliverable {
  id: string;
  title: string;
  description: string;
  status: PhaseStatus;
  fileReference?: string;
}

export interface PhaseTestEvidence {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  allPassed: boolean;
  sha256Proof?: string;
  lastRunTimestamp: string;
}

export interface PhaseTask {
  taskNumber: string;
  title: string;
  responsibleRole: string;
  assignedNominalLead: string;
  dependencies: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  status: PhaseStatus;
  testRef?: string;
}

export interface PhaseEvolutionItem {
  phaseNumber: EvolutionPhaseNumber;
  code: string;
  title: string;
  subtitle: string;
  leadRole: string;
  status: PhaseStatus;
  progressPct: number;
  objective: string;
  principles: string[];
  acceptanceCriteria: PhaseAcceptanceCriterion[];
  deliverables: PhaseDeliverable[];
  tasks?: PhaseTask[];
  testEvidence: PhaseTestEvidence;
  securityAndLgpdNotes: string[];
  externalDependencies?: string[];
}

export interface EvolutionSummaryMetrics {
  totalPhases: number;
  completedPhases: number;
  inProgressPhases: number;
  plannedPhases: number;
  overallProgressPct: number;
  totalCriteria: number;
  metCriteria: number;
  totalAutomatedTests: number;
  allTestsPassing: boolean;
  complianceLgpdScore: number;
  financialIntegrityAudited: boolean;
}
