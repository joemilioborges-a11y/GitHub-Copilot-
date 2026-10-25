/**
 * JOBS — SERVIÇO DO RANKING MENSAL "GAROTO JOBS E GAROTA JOBS"
 *
 * Especificação Funcional Auditável:
 * - Elegibilidade automática baseada em requisitos objetivos verificáveis.
 * - Categorias inclusivas autodeclaradas ('garota_jobs' | 'garoto_jobs' | 'opted_out' | 'unassigned'),
 *   sem inferência por aparência, nome ou comportamento.
 * - Pontuação combinada auditável:
 *     Pontuação Final = (0,50 × Nota Econômica) + (0,30 × Nota de Conteúdo) + (0,20 × Nota de Integridade)
 * - Normalização 0 a 100 por componente, com limites anti-spam e tratamento seguro de dados ausentes
 *   (indicadores desconhecidos nunca recebem nota máxima silenciosamente).
 * - Ciclo mensal com fuso horário contábil explícito (America/Sao_Paulo / UTC-3) e carimbo UTC.
 * - Separação estrita entre Classificação Provisória (candidatos não exibidos como vencedores públicos)
 *   e Publicação Oficial (exige revisão e aprovação administrativa com justificativa).
 * - Isolamento absoluto entre Sandbox (simulação) e Produção.
 * - Prevenção contra fraude (idempotência de transações, diferenciação entre alerta, investigação e
 *   fraude confirmada, direito a revisão e recurso).
 * - Preservação do histórico de ciclos e registro rastreável de correções pós-publicação.
 */

import { adminAuditService, AdminRole } from './adminAuditService';

export type RecognitionCategory = 'garota_jobs' | 'garoto_jobs';
export type CreatorDeclaredCategory = RecognitionCategory | 'opted_out' | 'unassigned';
export type RecognitionEnvironment = 'sandbox' | 'production';

export type CycleLifecycleStatus =
  | 'open_provisional'
  | 'closed_pending_review'
  | 'officially_published'
  | 'review_rejected'
  | 'corrected_republished';

export type FraudReviewStage = 'clean' | 'alert' | 'under_investigation' | 'confirmed_fraud';

export type AppealStatus = 'pending' | 'approved' | 'rejected';

export interface ScoringFormulaConfig {
  version: string;
  economicWeight: number;   // 0.50
  contentWeight: number;    // 0.30
  integrityWeight: number;  // 0.20
  economicBenchmarkBrl: number;
  maxCountedUploadsPerCycle: number;
  maxUploadsPerDayCredit: number;
  maxCountedActiveDays: number;
  maxSafeRefundRatePct: number;
  publishedAt: string;
  isLockedForActiveCycle: boolean;
}

export interface CreatorTransactionRecord {
  transactionId: string;
  idempotencyKey: string;
  creatorId: string;
  grossAmountBrl: number;
  platformCommissionBrl: number;
  gatewayFeeBrl: number;
  refundedAmountBrl: number;
  status: 'posted' | 'pending' | 'cancelled' | 'refunded' | 'chargeback';
  isSyntheticOrTest: boolean;
  environment: RecognitionEnvironment;
  timestamp: string; // ISO UTC
  buyerId: string;
}

export interface CreatorContentActivityRecord {
  contentId: string;
  creatorId: string;
  publishedAt: string; // ISO UTC
  moderationStatus: 'approved' | 'pending' | 'rejected' | 'hidden';
  isDuplicateOrSpam: boolean;
  isSyntheticOrTest: boolean;
  environment: RecognitionEnvironment;
  uniqueUnlocksCount: number;
}

export interface CreatorComplianceProfile {
  creatorId: string;
  publicName: string;
  handle: string;
  avatarUrl: string;
  declaredCategory: CreatorDeclaredCategory;
  categoryUpdatedAt: string;
  accountStatus: 'active' | 'under_review' | 'suspended' | 'blocked';
  kycVerified18Plus: boolean | null;
  consentTermsAccepted: boolean | null;
  verifiedSinceDate: string; // ISO date
  fraudStage: FraudReviewStage;
  fraudNotes?: string;
  unconfirmedReportsCount: number;
  confirmedViolationsCount: number | null; // null = dado ausente/indisponível
  auditTelemetryComplete: boolean | null;  // null = dado ausente/indisponível
  isSyntheticOrTestAccount: boolean;
  environment: RecognitionEnvironment;
}

export interface EligibilityEvaluation {
  isEligible: boolean;
  requiresHumanReview: boolean;
  checklist: {
    accountRegular: boolean;
    kycAndConsentVerified: boolean;
    categoryDeclared: boolean;
    hasValidPeriodActivity: boolean;
    noConfirmedImpediment: boolean;
    environmentValid: boolean;
  };
  ineligibilityReasons: string[];
  reviewWarnings: string[];
}

export interface ComponentScoreBreakdown {
  // Nota Econômica (0 - 100)
  economicScore: number;
  grossConfirmedBrl: number;
  platformCommissionConfirmedBrl: number;
  deductedRefundsAndChargebacksBrl: number;
  deductedGatewayFeesBrl: number;
  netEligiblePlatformRevenueBrl: number;
  excludedPendingBrl: number;
  excludedCancelledOrDuplicateCount: number;
  confirmedRefundRatePct: number;

  // Nota de Conteúdo (0 - 100)
  contentScore: number;
  totalPublishedCount: number;
  validApprovedUploadsCount: number;
  cappedUploadsScoredCount: number;
  excludedSpamOrDuplicateUploadsCount: number;
  validActiveDaysCount: number;
  uniqueBuyersCount: number;

  // Nota de Integridade (0 - 100)
  integrityScore: number;
  kycPoints: number;              // max 40
  zeroViolationPoints: number;    // max 30
  safeRefundRatioPoints: number;  // max 20
  telemetryPoints: number;        // max 10
  missingIntegrityIndicators: string[];

  // Pontuação Combinada Final (0 - 100)
  finalScore: number;
  formulaVersion: string;
  dataSources: string[];
}

export interface RankedCreatorCandidate {
  rank: number | null; // null se inelegível
  creatorId: string;
  publicName: string;
  handle: string;
  avatarUrl: string;
  category: CreatorDeclaredCategory;
  eligibility: EligibilityEvaluation;
  scores: ComponentScoreBreakdown;
  fraudStage: FraudReviewStage;
  verifiedSinceDate: string;
  tieBreakerSummary: string;
}

export interface CreatorAppealRecord {
  appealId: string;
  cycleId: string;
  creatorId: string;
  creatorName: string;
  reason: string;
  submittedAt: string;
  status: AppealStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionJustification?: string;
  environment: RecognitionEnvironment;
}

export interface OfficialWinnerPublicCard {
  category: RecognitionCategory;
  titleLabel: 'Garota JOBS' | 'Garoto JOBS';
  creatorId: string;
  publicName: string;
  handle: string;
  avatarUrl: string;
  finalScore: number;
  cycleId: string;
  periodLabel: string;
  validityLabel: string;
  approvedAt: string;
  approvedBy: string;
  formulaVersion: string;
}

export interface CycleCorrectionRecord {
  correctionId: string;
  cycleId: string;
  correctedAt: string;
  actorId: string;
  actorRole: AdminRole;
  reason: string;
  previousWinners: {
    garota_jobs: OfficialWinnerPublicCard | null;
    garoto_jobs: OfficialWinnerPublicCard | null;
  };
  newWinners: {
    garota_jobs: OfficialWinnerPublicCard | null;
    garoto_jobs: OfficialWinnerPublicCard | null;
  };
}

export interface CycleReviewDecisionRecord {
  decisionId: string;
  cycleId: string;
  action: 'close_period' | 'approve_official' | 'reject_review' | 'request_reanalysis' | 'official_correction';
  actorId: string;
  actorRole: AdminRole;
  justification: string;
  timestamp: string;
  formulaVersion: string;
  previousStatus: CycleLifecycleStatus;
  newStatus: CycleLifecycleStatus;
}

export interface MonthlyRecognitionCycle {
  cycleId: string; // ex: '2026-10'
  periodLabel: string; // ex: 'Outubro 2026'
  validityLabel: string; // ex: '01/11/2026 a 30/11/2026'
  timezone: 'America/Sao_Paulo';
  startAtUtc: string;
  endAtUtc: string;
  lastProvisionalUpdateUtc: string;
  status: CycleLifecycleStatus;
  environment: RecognitionEnvironment;
  formula: ScoringFormulaConfig;
  candidatesGarota: RankedCreatorCandidate[];
  candidatesGaroto: RankedCreatorCandidate[];
  ineligibleCandidates: RankedCreatorCandidate[];
  officialWinners: {
    garota_jobs: OfficialWinnerPublicCard | null;
    garoto_jobs: OfficialWinnerPublicCard | null;
  };
  noWinnerReasons: {
    garota_jobs: string | null;
    garoto_jobs: string | null;
  };
  approvedBy?: string;
  approvedAtUtc?: string;
  approvalJustification?: string;
  reviewHistory: CycleReviewDecisionRecord[];
  correctionHistory: CycleCorrectionRecord[];
}

export interface PublicRecognitionPayload {
  cycleId: string;
  periodLabel: string;
  validityLabel: string;
  timezone: 'America/Sao_Paulo';
  status: CycleLifecycleStatus;
  isOfficial: boolean;
  environment: RecognitionEnvironment;
  lastProvisionalUpdateUtc: string;
  formula: ScoringFormulaConfig;
  /**
   * Regra crítica (Seção 6):
   * Antes da aprovação administrativa, NÃO expõe nomes de candidatos como vencedores.
   */
  officialWinners: {
    garota_jobs: OfficialWinnerPublicCard | null;
    garoto_jobs: OfficialWinnerPublicCard | null;
  };
  noWinnerReasons: {
    garota_jobs: string | null;
    garoto_jobs: string | null;
  };
  provisionalNotice: string | null;
  rulesSummary: {
    eligibilityCriteria: string[];
    scoringWeights: string[];
    tieBreakers: string[];
  };
}

export interface CreatorOwnRecognitionView {
  creatorId: string;
  publicName: string;
  handle: string;
  declaredCategory: CreatorDeclaredCategory;
  cycleId: string;
  periodLabel: string;
  cycleStatus: CycleLifecycleStatus;
  environment: RecognitionEnvironment;
  rankInCategory: number | null;
  totalEligibleInCategory: number;
  eligibility: EligibilityEvaluation;
  scores: ComponentScoreBreakdown;
  formula: ScoringFormulaConfig;
  improvementTips: string[];
  myAppeals: CreatorAppealRecord[];
}

export const DEFAULT_SCORING_FORMULA: ScoringFormulaConfig = Object.freeze({
  version: 'v1.0.0-PROPOSED-50-30-20',
  economicWeight: 0.5,
  contentWeight: 0.3,
  integrityWeight: 0.2,
  economicBenchmarkBrl: 6500, // Meta de referência mensal de comissão líquida elegível para 100 pts
  maxCountedUploadsPerCycle: 12,
  maxUploadsPerDayCredit: 2,
  maxCountedActiveDays: 15,
  maxSafeRefundRatePct: 2.0,
  publishedAt: '2026-10-01T00:00:00.000Z',
  isLockedForActiveCycle: true,
});

const STORAGE_KEY_SANDBOX_STATE = 'jobs_monthly_recognition_sandbox_v1';
const STORAGE_KEY_PRODUCTION_STATE = 'jobs_monthly_recognition_production_v1';

interface PersistedEnvironmentState {
  profiles: CreatorComplianceProfile[];
  transactions: CreatorTransactionRecord[];
  activities: CreatorContentActivityRecord[];
  cycles: Record<string, MonthlyRecognitionCycle>;
  appeals: CreatorAppealRecord[];
  activeCycleId: string;
}

class MonthlyRecognitionDomainService {
  private getStorageKey(env: RecognitionEnvironment): string {
    return env === 'production' ? STORAGE_KEY_PRODUCTION_STATE : STORAGE_KEY_SANDBOX_STATE;
  }

  private getDefaultSandboxSeed(): PersistedEnvironmentState {
    const profiles: CreatorComplianceProfile[] = [
      {
        creatorId: 'valentina',
        publicName: 'Valentina Rossi',
        handle: '@valentina.rossi',
        avatarUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        declaredCategory: 'garota_jobs',
        categoryUpdatedAt: '2026-10-01T10:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2025-11-10',
        fraudStage: 'clean',
        unconfirmedReportsCount: 0,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'isabella',
        publicName: 'Isabella Fontes',
        handle: '@isabella.fontes',
        avatarUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
        declaredCategory: 'garota_jobs',
        categoryUpdatedAt: '2026-10-01T11:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-01-15',
        fraudStage: 'clean',
        unconfirmedReportsCount: 1, // Alerta não confirmado: NÃO reduz integridade nem desclassifica
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'camila',
        publicName: 'Camila Duarte',
        handle: '@camila.duarte',
        avatarUrl: '/src/assets/images/profile_camila_1791856837360.jpg',
        declaredCategory: 'garota_jobs',
        categoryUpdatedAt: '2026-10-02T09:30:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-02-20',
        fraudStage: 'alert',
        fraudNotes: 'Pico atípico de compras noturnas em observação passiva (sem bloqueio automático).',
        unconfirmedReportsCount: 1,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'gabriel',
        publicName: 'Gabriel Menezes',
        handle: '@gabriel.menezes',
        avatarUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        declaredCategory: 'garoto_jobs',
        categoryUpdatedAt: '2026-10-01T12:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2025-12-05',
        fraudStage: 'clean',
        unconfirmedReportsCount: 0,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'lucas',
        publicName: 'Lucas Ferraz',
        handle: '@lucas.ferraz',
        avatarUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        declaredCategory: 'garoto_jobs',
        categoryUpdatedAt: '2026-10-01T14:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-03-10',
        fraudStage: 'under_investigation',
        fraudNotes: 'Auditoria preventiva de estorno cruzado — elegibilidade mantida até decisão humana.',
        unconfirmedReportsCount: 2,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: null, // Indicador indisponível -> 0 pts (nunca nota máxima silenciosa)
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'creator_blocked_fraud',
        publicName: 'Conta Desclassificada #88',
        handle: '@auditoria.88',
        avatarUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        declaredCategory: 'garota_jobs',
        categoryUpdatedAt: '2026-10-01T08:00:00.000Z',
        accountStatus: 'blocked',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-05-01',
        fraudStage: 'confirmed_fraud',
        fraudNotes: 'Auto-compra confirmada com cartões de teste estornados após revisão humana.',
        unconfirmedReportsCount: 4,
        confirmedViolationsCount: 2,
        auditTelemetryComplete: false,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
      {
        creatorId: 'creator_incomplete_kyc',
        publicName: 'Rafael Costa',
        handle: '@rafael.costa',
        avatarUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        declaredCategory: 'garoto_jobs',
        categoryUpdatedAt: '2026-10-03T10:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: false, // Inelegível: KYC 18+ pendente
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-09-12',
        fraudStage: 'clean',
        unconfirmedReportsCount: 0,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      },
    ];

    const transactions: CreatorTransactionRecord[] = [
      // Valentina (Outubro 2026)
      {
        transactionId: 'tx_val_oct_01',
        idempotencyKey: 'idem_val_oct_01',
        creatorId: 'valentina',
        grossAmountBrl: 14500,
        platformCommissionBrl: 4350,
        gatewayFeeBrl: 180,
        refundedAmountBrl: 50,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-10T15:00:00.000Z',
        buyerId: 'buyer_01',
      },
      {
        transactionId: 'tx_val_oct_02',
        idempotencyKey: 'idem_val_oct_02',
        creatorId: 'valentina',
        grossAmountBrl: 7200,
        platformCommissionBrl: 2160,
        gatewayFeeBrl: 90,
        refundedAmountBrl: 0,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-18T19:30:00.000Z',
        buyerId: 'buyer_02',
      },
      // Transação pendente de Valentina (NÃO deve entrar na nota econômica confirmada)
      {
        transactionId: 'tx_val_oct_pending',
        idempotencyKey: 'idem_val_oct_pending',
        creatorId: 'valentina',
        grossAmountBrl: 3500,
        platformCommissionBrl: 1050,
        gatewayFeeBrl: 45,
        refundedAmountBrl: 0,
        status: 'pending',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-22T21:00:00.000Z',
        buyerId: 'buyer_03',
      },
      // Isabella (Outubro 2026)
      {
        transactionId: 'tx_isa_oct_01',
        idempotencyKey: 'idem_isa_oct_01',
        creatorId: 'isabella',
        grossAmountBrl: 16200,
        platformCommissionBrl: 4860,
        gatewayFeeBrl: 210,
        refundedAmountBrl: 60,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-12T18:00:00.000Z',
        buyerId: 'buyer_04',
      },
      // Camila (Outubro 2026)
      {
        transactionId: 'tx_cam_oct_01',
        idempotencyKey: 'idem_cam_oct_01',
        creatorId: 'camila',
        grossAmountBrl: 11800,
        platformCommissionBrl: 3540,
        gatewayFeeBrl: 150,
        refundedAmountBrl: 40,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-14T20:00:00.000Z',
        buyerId: 'buyer_05',
      },
      // Gabriel (Outubro 2026)
      {
        transactionId: 'tx_gab_oct_01',
        idempotencyKey: 'idem_gab_oct_01',
        creatorId: 'gabriel',
        grossAmountBrl: 15400,
        platformCommissionBrl: 4620,
        gatewayFeeBrl: 195,
        refundedAmountBrl: 0,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-11T16:20:00.000Z',
        buyerId: 'buyer_06',
      },
      {
        transactionId: 'tx_gab_oct_02',
        idempotencyKey: 'idem_gab_oct_02',
        creatorId: 'gabriel',
        grossAmountBrl: 4800,
        platformCommissionBrl: 1440,
        gatewayFeeBrl: 60,
        refundedAmountBrl: 0,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-19T22:10:00.000Z',
        buyerId: 'buyer_07',
      },
      // Lucas (Outubro 2026)
      {
        transactionId: 'tx_luc_oct_01',
        idempotencyKey: 'idem_luc_oct_01',
        creatorId: 'lucas',
        grossAmountBrl: 11200,
        platformCommissionBrl: 3360,
        gatewayFeeBrl: 140,
        refundedAmountBrl: 120,
        status: 'posted',
        isSyntheticOrTest: false,
        environment: 'sandbox',
        timestamp: '2026-10-15T19:00:00.000Z',
        buyerId: 'buyer_08',
      },
    ];

    const activities: CreatorContentActivityRecord[] = [
      // Valentina: 10 conteúdos aprovados em dias distintos
      ...Array.from({ length: 10 }, (_, idx) => ({
        contentId: `cnt_val_${idx + 1}`,
        creatorId: 'valentina',
        publishedAt: `2026-10-${String(idx + 2).padStart(2, '0')}T18:00:00.000Z`,
        moderationStatus: 'approved' as const,
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox' as const,
        uniqueUnlocksCount: 38,
      })),
      // Isabella: 8 conteúdos aprovados
      ...Array.from({ length: 8 }, (_, idx) => ({
        contentId: `cnt_isa_${idx + 1}`,
        creatorId: 'isabella',
        publishedAt: `2026-10-${String(idx + 3).padStart(2, '0')}T19:00:00.000Z`,
        moderationStatus: 'approved' as const,
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox' as const,
        uniqueUnlocksCount: 32,
      })),
      // Camila: 6 conteúdos aprovados + 2 spam descartados
      ...Array.from({ length: 6 }, (_, idx) => ({
        contentId: `cnt_cam_${idx + 1}`,
        creatorId: 'camila',
        publishedAt: `2026-10-${String(idx + 4).padStart(2, '0')}T20:00:00.000Z`,
        moderationStatus: 'approved' as const,
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox' as const,
        uniqueUnlocksCount: 25,
      })),
      {
        contentId: 'cnt_cam_spam_1',
        creatorId: 'camila',
        publishedAt: '2026-10-09T20:05:00.000Z',
        moderationStatus: 'approved',
        isDuplicateOrSpam: true,
        isSyntheticOrTest: false,
        environment: 'sandbox',
        uniqueUnlocksCount: 0,
      },
      // Gabriel: 9 conteúdos aprovados
      ...Array.from({ length: 9 }, (_, idx) => ({
        contentId: `cnt_gab_${idx + 1}`,
        creatorId: 'gabriel',
        publishedAt: `2026-10-${String(idx + 2).padStart(2, '0')}T17:00:00.000Z`,
        moderationStatus: 'approved' as const,
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox' as const,
        uniqueUnlocksCount: 30,
      })),
      // Lucas: 6 conteúdos aprovados
      ...Array.from({ length: 6 }, (_, idx) => ({
        contentId: `cnt_luc_${idx + 1}`,
        creatorId: 'lucas',
        publishedAt: `2026-10-${String(idx + 5).padStart(2, '0')}T17:00:00.000Z`,
        moderationStatus: 'approved' as const,
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox' as const,
        uniqueUnlocksCount: 20,
      })),
      // Conta bloqueada (tem atividade mas está bloqueada por fraude confirmada)
      {
        contentId: 'cnt_fraud_1',
        creatorId: 'creator_blocked_fraud',
        publishedAt: '2026-10-05T12:00:00.000Z',
        moderationStatus: 'approved',
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox',
        uniqueUnlocksCount: 5,
      },
    ];

    // Ciclo Histórico Oficial Homologado: Setembro 2026 ('2026-09')
    const cycle202609: MonthlyRecognitionCycle = {
      cycleId: '2026-09',
      periodLabel: 'Setembro 2026',
      validityLabel: '01/10/2026 a 31/10/2026',
      timezone: 'America/Sao_Paulo',
      startAtUtc: '2026-09-01T03:00:00.000Z',
      endAtUtc: '2026-10-01T02:59:59.999Z',
      lastProvisionalUpdateUtc: '2026-10-01T12:00:00.000Z',
      status: 'officially_published',
      environment: 'sandbox',
      formula: { ...DEFAULT_SCORING_FORMULA },
      candidatesGarota: [],
      candidatesGaroto: [],
      ineligibleCandidates: [],
      officialWinners: {
        garota_jobs: {
          category: 'garota_jobs',
          titleLabel: 'Garota JOBS',
          creatorId: 'valentina',
          publicName: 'Valentina Rossi',
          handle: '@valentina.rossi',
          avatarUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          finalScore: 94.85,
          cycleId: '2026-09',
          periodLabel: 'Setembro 2026',
          validityLabel: ' Outubro 2026 (01/10 a 31/10/2026)',
          approvedAt: '2026-10-01T14:30:00.000Z',
          approvedBy: 'admin_master_01',
          formulaVersion: DEFAULT_SCORING_FORMULA.version,
        },
        garoto_jobs: {
          category: 'garoto_jobs',
          titleLabel: 'Garoto JOBS',
          creatorId: 'gabriel',
          publicName: 'Gabriel Menezes',
          handle: '@gabriel.menezes',
          avatarUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
          finalScore: 91.4,
          cycleId: '2026-09',
          periodLabel: 'Setembro 2026',
          validityLabel: 'Outubro 2026 (01/10 a 31/10/2026)',
          approvedAt: '2026-10-01T14:30:00.000Z',
          approvedBy: 'admin_master_01',
          formulaVersion: DEFAULT_SCORING_FORMULA.version,
        },
      },
      noWinnerReasons: {
        garota_jobs: null,
        garoto_jobs: null,
      },
      approvedBy: 'admin_master_01',
      approvedAtUtc: '2026-10-01T14:30:00.000Z',
      approvalJustification:
        'Ciclo de Setembro/2026 conciliado sem divergências contábeis e com conformidade KYC 18+ verificada.',
      reviewHistory: [
        {
          decisionId: 'dec_202609_close',
          cycleId: '2026-09',
          action: 'close_period',
          actorId: 'admin_finance_01',
          actorRole: 'finance',
          justification: 'Encerramento contábil do período de Setembro/2026 após janela de conciliação.',
          timestamp: '2026-10-01T12:00:00.000Z',
          formulaVersion: DEFAULT_SCORING_FORMULA.version,
          previousStatus: 'open_provisional',
          newStatus: 'closed_pending_review',
        },
        {
          decisionId: 'dec_202609_approve',
          cycleId: '2026-09',
          action: 'approve_official',
          actorId: 'admin_master_01',
          actorRole: 'master',
          justification:
            'Ciclo de Setembro/2026 conciliado sem divergências contábeis e com conformidade KYC 18+ verificada.',
          timestamp: '2026-10-01T14:30:00.000Z',
          formulaVersion: DEFAULT_SCORING_FORMULA.version,
          previousStatus: 'closed_pending_review',
          newStatus: 'officially_published',
        },
      ],
      correctionHistory: [],
    };

    const appeals: CreatorAppealRecord[] = [
      {
        appealId: 'app_lucas_oct_01',
        cycleId: '2026-10',
        creatorId: 'lucas',
        creatorName: 'Lucas Ferraz',
        reason:
          'Solicito atualização da telemetria de auditoria da minha conta verificada para cômputo dos 10 pontos de completude no ciclo de Outubro.',
        submittedAt: '2026-10-23T16:40:00.000Z',
        status: 'pending',
        environment: 'sandbox',
      },
    ];

    const state: PersistedEnvironmentState = {
      profiles,
      transactions,
      activities,
      cycles: {
        '2026-09': cycle202609,
      },
      appeals,
      activeCycleId: '2026-10',
    };

    // Calcula e popula o ciclo ativo '2026-10' (em apuração provisória)
    state.cycles['2026-10'] = this.computeCycleFromState(state, '2026-10', 'sandbox');
    // Popula também os candidatos históricos em '2026-09'
    const computedSept = this.computeCycleFromState(state, '2026-09', 'sandbox', {
      useOctoberDataForSeptPreview: true,
    });
    state.cycles['2026-09'].candidatesGarota = computedSept.candidatesGarota;
    state.cycles['2026-09'].candidatesGaroto = computedSept.candidatesGaroto;
    state.cycles['2026-09'].ineligibleCandidates = computedSept.ineligibleCandidates;

    return state;
  }

  private getDefaultProductionSeed(): PersistedEnvironmentState {
    // Em produção, nenhum dado sintético ou de sandbox entra no cálculo!
    const emptyState: PersistedEnvironmentState = {
      profiles: [],
      transactions: [],
      activities: [],
      cycles: {},
      appeals: [],
      activeCycleId: '2026-10',
    };
    emptyState.cycles['2026-10'] = this.computeCycleFromState(emptyState, '2026-10', 'production');
    return emptyState;
  }

  private loadState(env: RecognitionEnvironment): PersistedEnvironmentState {
    const key = this.getStorageKey(env);
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      try {
        return JSON.parse(raw) as PersistedEnvironmentState;
      } catch {
        // Fallback para seed
      }
    }
    const seed = env === 'production' ? this.getDefaultProductionSeed() : this.getDefaultSandboxSeed();
    this.saveState(env, seed);
    return seed;
  }

  private saveState(env: RecognitionEnvironment, state: PersistedEnvironmentState): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.getStorageKey(env), JSON.stringify(state));
    }
  }

  public resetEnvironmentState(env: RecognitionEnvironment): void {
    const seed = env === 'production' ? this.getDefaultProductionSeed() : this.getDefaultSandboxSeed();
    this.saveState(env, seed);
  }

  // ==========================================================================
  // CÁLCULO PURO, DETERMINÍSTICO E AUDITÁVEL DOS COMPONENTES E ELEGIBILIDADE
  // ==========================================================================

  public evaluateCreatorCandidate(
    profile: CreatorComplianceProfile,
    allTransactions: CreatorTransactionRecord[],
    allActivities: CreatorContentActivityRecord[],
    cycleStartUtc: string,
    cycleEndUtc: string,
    environment: RecognitionEnvironment,
    formula: ScoringFormulaConfig = DEFAULT_SCORING_FORMULA
  ): RankedCreatorCandidate {
    const startMs = new Date(cycleStartUtc).getTime();
    const endMs = new Date(cycleEndUtc).getTime();

    // 1. Filtragem estrita por ambiente, período e isolamento de dados sintéticos em produção
    const creatorTxs = allTransactions.filter((tx) => {
      if (tx.creatorId !== profile.creatorId) return false;
      if (tx.environment !== environment) return false;
      if (environment === 'production' && tx.isSyntheticOrTest) return false;
      const tMs = new Date(tx.timestamp).getTime();
      return !Number.isNaN(tMs) && tMs >= startMs && tMs <= endMs;
    });

    const creatorActivities = allActivities.filter((act) => {
      if (act.creatorId !== profile.creatorId) return false;
      if (act.environment !== environment) return false;
      if (environment === 'production' && act.isSyntheticOrTest) return false;
      const aMs = new Date(act.publishedAt).getTime();
      return !Number.isNaN(aMs) && aMs >= startMs && aMs <= endMs;
    });

    // 2. Desduplicação idempotente de transações (prevenção de contagem duplicada)
    const seenIdempotencyKeys = new Set<string>();
    const uniqueTxs: CreatorTransactionRecord[] = [];
    let excludedCancelledOrDuplicateCount = 0;

    for (const tx of creatorTxs) {
      const key = tx.idempotencyKey || tx.transactionId;
      if (!key || seenIdempotencyKeys.has(key)) {
        excludedCancelledOrDuplicateCount++;
        continue;
      }
      seenIdempotencyKeys.add(key);
      uniqueTxs.push(tx);
    }

    // 3. Cálculo da Nota Econômica (0 a 100) — Peso 50%
    let grossConfirmedBrl = 0;
    let platformCommissionConfirmedBrl = 0;
    let deductedRefundsAndChargebacksBrl = 0;
    let deductedGatewayFeesBrl = 0;
    let excludedPendingBrl = 0;

    for (const tx of uniqueTxs) {
      const gross = Number.isFinite(tx.grossAmountBrl) && tx.grossAmountBrl > 0 ? tx.grossAmountBrl : 0;
      const comm =
        Number.isFinite(tx.platformCommissionBrl) && tx.platformCommissionBrl > 0 ? tx.platformCommissionBrl : 0;
      const fee = Number.isFinite(tx.gatewayFeeBrl) && tx.gatewayFeeBrl > 0 ? tx.gatewayFeeBrl : 0;
      const refund =
        Number.isFinite(tx.refundedAmountBrl) && tx.refundedAmountBrl > 0 ? tx.refundedAmountBrl : 0;

      if (tx.status === 'posted') {
        grossConfirmedBrl += gross;
        platformCommissionConfirmedBrl += comm;
        deductedGatewayFeesBrl += fee;
        deductedRefundsAndChargebacksBrl += refund;
      } else if (tx.status === 'pending') {
        // Valores pendentes NUNCA entram como receita confirmada
        excludedPendingBrl += gross;
      } else if (tx.status === 'refunded' || tx.status === 'chargeback') {
        // Transação integralmente estornada/reembolsada: desconta os custos/estornos elegíveis
        deductedRefundsAndChargebacksBrl += refund > 0 ? refund : comm;
        excludedCancelledOrDuplicateCount++;
      } else {
        // cancelled
        excludedCancelledOrDuplicateCount++;
      }
    }

    const netEligiblePlatformRevenueBrl = Number(
      Math.max(
        0,
        platformCommissionConfirmedBrl - deductedRefundsAndChargebacksBrl - deductedGatewayFeesBrl
      ).toFixed(2)
    );

    const confirmedRefundRatePct =
      grossConfirmedBrl > 0
        ? Number(((deductedRefundsAndChargebacksBrl / grossConfirmedBrl) * 100).toFixed(2))
        : 0;

    const rawEconomicRatio =
      formula.economicBenchmarkBrl > 0 ? (netEligiblePlatformRevenueBrl / formula.economicBenchmarkBrl) * 100 : 0;
    const economicScore = Number(Math.min(100, Math.max(0, rawEconomicRatio)).toFixed(2));

    // 4. Cálculo da Nota de Conteúdo (0 a 100) — Peso 30%
    // Evita premiar repetição artificial, spam ou volume excessivo no mesmo dia
    const seenContentIds = new Set<string>();
    const uploadsPerDayCount = new Map<string, number>();
    let validApprovedUploadsCount = 0;
    let cappedUploadsScoredCount = 0;
    let excludedSpamOrDuplicateUploadsCount = 0;
    let uniqueBuyersSum = 0;

    for (const act of creatorActivities) {
      if (!act.contentId || seenContentIds.has(act.contentId) || act.isDuplicateOrSpam) {
        excludedSpamOrDuplicateUploadsCount++;
        continue;
      }
      seenContentIds.add(act.contentId);

      if (act.moderationStatus !== 'approved') {
        excludedSpamOrDuplicateUploadsCount++;
        continue;
      }

      validApprovedUploadsCount++;
      const dayKey = act.publishedAt.slice(0, 10);
      const currentDayUploads = uploadsPerDayCount.get(dayKey) || 0;

      if (currentDayUploads < formula.maxUploadsPerDayCredit) {
        uploadsPerDayCount.set(dayKey, currentDayUploads + 1);
        if (cappedUploadsScoredCount < formula.maxCountedUploadsPerCycle) {
          cappedUploadsScoredCount++;
        }
      } else {
        // Excedeu limite diário anti-spam
        excludedSpamOrDuplicateUploadsCount++;
      }

      if (Number.isFinite(act.uniqueUnlocksCount) && act.uniqueUnlocksCount > 0) {
        uniqueBuyersSum += Math.min(50, act.uniqueUnlocksCount);
      }
    }

    const validActiveDaysCount = Math.min(formula.maxCountedActiveDays, uploadsPerDayCount.size);

    // Subcomponentes da nota de conteúdo:
    // - 50 pts por produção válida até o teto do ciclo (maxCountedUploadsPerCycle)
    // - 30 pts por consistência de dias ativos (maxCountedActiveDays)
    // - 20 pts por alcance validado (compradores únicos, teto 200)
    const uploadPts =
      formula.maxCountedUploadsPerCycle > 0
        ? Math.min(50, (cappedUploadsScoredCount / formula.maxCountedUploadsPerCycle) * 50)
        : 0;
    const activeDaysPts =
      formula.maxCountedActiveDays > 0
        ? Math.min(30, (validActiveDaysCount / formula.maxCountedActiveDays) * 30)
        : 0;
    const buyersPts = Math.min(20, (uniqueBuyersSum / 200) * 20);

    const contentScore = Number(Math.min(100, Math.max(0, uploadPts + activeDaysPts + buyersPts)).toFixed(2));

    // 5. Cálculo da Nota de Integridade e Conformidade (0 a 100) — Peso 20%
    // Regra crítica: indicador desconhecido/indisponível (null/undefined) NUNCA vira nota máxima silenciosamente!
    const missingIntegrityIndicators: string[] = [];

    let kycPoints = 0;
    if (profile.kycVerified18Plus === null || profile.consentTermsAccepted === null) {
      missingIntegrityIndicators.push('kycVerified18Plus_or_consent');
      kycPoints = 0;
    } else if (profile.kycVerified18Plus === true && profile.consentTermsAccepted === true) {
      kycPoints = 40;
    }

    let zeroViolationPoints = 0;
    if (profile.confirmedViolationsCount === null || typeof profile.confirmedViolationsCount !== 'number') {
      missingIntegrityIndicators.push('confirmedViolationsCount');
      zeroViolationPoints = 0; // Não assume nota máxima quando indicador está indisponível
    } else if (profile.confirmedViolationsCount === 0) {
      // Denúncias não confirmadas (unconfirmedReportsCount) NÃO reduzem pontos como culpa comprovada!
      zeroViolationPoints = 30;
    } else {
      zeroViolationPoints = Math.max(0, 30 - profile.confirmedViolationsCount * 15);
    }

    let safeRefundRatioPoints = 0;
    if (grossConfirmedBrl <= 0 && validApprovedUploadsCount === 0) {
      safeRefundRatioPoints = 0;
    } else if (confirmedRefundRatePct <= formula.maxSafeRefundRatePct) {
      safeRefundRatioPoints = 20;
    } else {
      const excess = confirmedRefundRatePct - formula.maxSafeRefundRatePct;
      safeRefundRatioPoints = Number(Math.max(0, 20 - excess * 4).toFixed(2));
    }

    let telemetryPoints = 0;
    if (profile.auditTelemetryComplete === null || typeof profile.auditTelemetryComplete !== 'boolean') {
      missingIntegrityIndicators.push('auditTelemetryComplete');
      telemetryPoints = 0;
    } else if (profile.auditTelemetryComplete === true) {
      telemetryPoints = 10;
    }

    const integrityScore = Number(
      Math.min(100, Math.max(0, kycPoints + zeroViolationPoints + safeRefundRatioPoints + telemetryPoints)).toFixed(2)
    );

    // 6. Pontuação Combinada Final
    const finalScore = Number(
      (
        formula.economicWeight * economicScore +
        formula.contentWeight * contentScore +
        formula.integrityWeight * integrityScore
      ).toFixed(2)
    );

    // 7. Avaliação de Elegibilidade Automática (Seção 3)
    const ineligibilityReasons: string[] = [];
    const reviewWarnings: string[] = [];

    const environmentValid =
      profile.environment === environment && !(environment === 'production' && profile.isSyntheticOrTestAccount);
    if (!environmentValid) {
      ineligibilityReasons.push('Conta de teste/sandbox isolada da apuração oficial de produção.');
    }

    const accountRegular = profile.accountStatus === 'active' || profile.accountStatus === 'under_review';
    if (!accountRegular) {
      ineligibilityReasons.push(`Conta com impedimento cadastral confirmado (status: ${profile.accountStatus}).`);
    }

    const kycAndConsentVerified = profile.kycVerified18Plus === true && profile.consentTermsAccepted === true;
    if (!kycAndConsentVerified) {
      ineligibilityReasons.push('Verificação de maioridade 18+ (KYC) ou termo de consentimento pendente.');
    }

    const categoryDeclared =
      profile.declaredCategory === 'garota_jobs' || profile.declaredCategory === 'garoto_jobs';
    if (!categoryDeclared) {
      ineligibilityReasons.push(
        profile.declaredCategory === 'opted_out'
          ? 'Criador optou por não participar da divulgação pública (opt-out).'
          : 'Categoria de participação (Garoto JOBS / Garota JOBS) ainda não autodeclarada.'
      );
    }

    const hasValidPeriodActivity = netEligiblePlatformRevenueBrl > 0 || validApprovedUploadsCount > 0;
    if (!hasValidPeriodActivity) {
      ineligibilityReasons.push('Sem atividade válida (conteúdo aprovado ou transação confirmada) no período apurado.');
    }

    const noConfirmedImpediment =
      profile.fraudStage !== 'confirmed_fraud' &&
      (profile.confirmedViolationsCount === null || profile.confirmedViolationsCount === 0);
    if (!noConfirmedImpediment) {
      ineligibilityReasons.push(
        'Impedimento definitivo confirmado após processo de revisão administrativa (violação ou fraude comprovada).'
      );
    }

    // Não desclassificar alguém apenas por suspeita automática (alert / under_investigation)!
    const requiresHumanReview =
      profile.fraudStage === 'alert' ||
      profile.fraudStage === 'under_investigation' ||
      profile.accountStatus === 'under_review' ||
      profile.unconfirmedReportsCount > 0;

    if (profile.fraudStage === 'alert' || profile.fraudStage === 'under_investigation') {
      reviewWarnings.push(
        `Alerta antifraude (${profile.fraudStage}): mantido elegível sob presunção de boa-fé; exige revisão humana antes da homologação.`
      );
    }
    if (missingIntegrityIndicators.length > 0) {
      reviewWarnings.push(
        `Indicadores de integridade ausentes (${missingIntegrityIndicators.join(', ')}) pontuados com 0 pts (sem bonificação silenciosa).`
      );
    }

    const isEligible =
      environmentValid &&
      accountRegular &&
      kycAndConsentVerified &&
      categoryDeclared &&
      hasValidPeriodActivity &&
      noConfirmedImpediment;

    return {
      rank: null,
      creatorId: profile.creatorId,
      publicName: profile.publicName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      category: profile.declaredCategory,
      eligibility: {
        isEligible,
        requiresHumanReview,
        checklist: {
          accountRegular,
          kycAndConsentVerified,
          categoryDeclared,
          hasValidPeriodActivity,
          noConfirmedImpediment,
          environmentValid,
        },
        ineligibilityReasons,
        reviewWarnings,
      },
      scores: {
        economicScore,
        grossConfirmedBrl: Number(grossConfirmedBrl.toFixed(2)),
        platformCommissionConfirmedBrl: Number(platformCommissionConfirmedBrl.toFixed(2)),
        deductedRefundsAndChargebacksBrl: Number(deductedRefundsAndChargebacksBrl.toFixed(2)),
        deductedGatewayFeesBrl: Number(deductedGatewayFeesBrl.toFixed(2)),
        netEligiblePlatformRevenueBrl,
        excludedPendingBrl: Number(excludedPendingBrl.toFixed(2)),
        excludedCancelledOrDuplicateCount,
        confirmedRefundRatePct,
        contentScore,
        totalPublishedCount: creatorActivities.length,
        validApprovedUploadsCount,
        cappedUploadsScoredCount,
        excludedSpamOrDuplicateUploadsCount,
        validActiveDaysCount,
        uniqueBuyersCount: uniqueBuyersSum,
        integrityScore,
        kycPoints,
        zeroViolationPoints,
        safeRefundRatioPoints,
        telemetryPoints,
        missingIntegrityIndicators,
        finalScore,
        formulaVersion: formula.version,
        dataSources: [
          `Livro-Razão Contábil (${environment.toUpperCase()})`,
          'Catálogo de Mídias & Moderação 18+',
          'Conformidade KYC & Auditoria Antifraude',
        ],
      },
      fraudStage: profile.fraudStage,
      verifiedSinceDate: profile.verifiedSinceDate,
      tieBreakerSummary: `Final: ${finalScore.toFixed(2)} | Econ: ${economicScore.toFixed(2)} | Estorno: ${confirmedRefundRatePct.toFixed(2)}% | Integ: ${integrityScore.toFixed(2)} | Desde: ${profile.verifiedSinceDate}`,
    };
  }

  /**
   * Ordenação determinística com critérios de desempate publicados antecipadamente (Seção 4 e 5):
   * 1. Maior pontuação final (finalScore)
   * 2. Maior nota econômica (economicScore / netEligiblePlatformRevenueBrl)
   * 3. Menor taxa de estorno confirmada (confirmedRefundRatePct)
   * 4. Maior nota de integridade (integrityScore)
   * 5. Data de verificação mais antiga (verifiedSinceDate)
   * 6. Ordem alfabética determinística do creatorId
   */
  public sortCandidatesDeterministically(candidates: RankedCreatorCandidate[]): RankedCreatorCandidate[] {
    const sorted = [...candidates].sort((a, b) => {
      if (b.scores.finalScore !== a.scores.finalScore) {
        return b.scores.finalScore - a.scores.finalScore;
      }
      if (b.scores.economicScore !== a.scores.economicScore) {
        return b.scores.economicScore - a.scores.economicScore;
      }
      if (b.scores.netEligiblePlatformRevenueBrl !== a.scores.netEligiblePlatformRevenueBrl) {
        return b.scores.netEligiblePlatformRevenueBrl - a.scores.netEligiblePlatformRevenueBrl;
      }
      if (a.scores.confirmedRefundRatePct !== b.scores.confirmedRefundRatePct) {
        return a.scores.confirmedRefundRatePct - b.scores.confirmedRefundRatePct;
      }
      if (b.scores.integrityScore !== a.scores.integrityScore) {
        return b.scores.integrityScore - a.scores.integrityScore;
      }
      if (a.verifiedSinceDate !== b.verifiedSinceDate) {
        return a.verifiedSinceDate.localeCompare(b.verifiedSinceDate);
      }
      return a.creatorId.localeCompare(b.creatorId);
    });

    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  private computeCycleFromState(
    state: PersistedEnvironmentState,
    cycleId: string,
    environment: RecognitionEnvironment,
    options?: { useOctoberDataForSeptPreview?: boolean }
  ): MonthlyRecognitionCycle {
    const existing = state.cycles[cycleId];
    const formula = existing?.formula ? { ...existing.formula } : { ...DEFAULT_SCORING_FORMULA };

    const isSept = cycleId === '2026-09';
    const startAtUtc = isSept && !options?.useOctoberDataForSeptPreview
      ? '2026-09-01T03:00:00.000Z'
      : '2026-10-01T03:00:00.000Z';
    const endAtUtc = isSept && !options?.useOctoberDataForSeptPreview
      ? '2026-10-01T02:59:59.999Z'
      : '2026-11-01T02:59:59.999Z';

    const evaluated = state.profiles.map((prof) =>
      this.evaluateCreatorCandidate(
        prof,
        state.transactions,
        state.activities,
        startAtUtc,
        endAtUtc,
        environment,
        formula
      )
    );

    const eligibleGarota = this.sortCandidatesDeterministically(
      evaluated.filter((c) => c.eligibility.isEligible && c.category === 'garota_jobs')
    );
    const eligibleGaroto = this.sortCandidatesDeterministically(
      evaluated.filter((c) => c.eligibility.isEligible && c.category === 'garoto_jobs')
    );
    const ineligible = evaluated.filter((c) => !c.eligibility.isEligible);

    const noWinnerGarota =
      eligibleGarota.length === 0
        ? 'Não houve candidatas elegíveis que cumprissem os requisitos mínimos no período.'
        : null;
    const noWinnerGaroto =
      eligibleGaroto.length === 0
        ? 'Não houve candidatos elegíveis que cumprissem os requisitos mínimos no período.'
        : null;

    return {
      cycleId,
      periodLabel: isSept ? 'Setembro 2026' : 'Outubro 2026',
      validityLabel: isSept ? '01/10/2026 a 31/10/2026' : '01/11/2026 a 30/11/2026',
      timezone: 'America/Sao_Paulo',
      startAtUtc: isSept ? '2026-09-01T03:00:00.000Z' : '2026-10-01T03:00:00.000Z',
      endAtUtc: isSept ? '2026-10-01T02:59:59.999Z' : '2026-11-01T02:59:59.999Z',
      lastProvisionalUpdateUtc: new Date().toISOString(),
      status: existing?.status || 'open_provisional',
      environment,
      formula,
      candidatesGarota: eligibleGarota,
      candidatesGaroto: eligibleGaroto,
      ineligibleCandidates: ineligible,
      officialWinners: existing?.officialWinners || {
        garota_jobs: null,
        garoto_jobs: null,
      },
      noWinnerReasons: {
        garota_jobs: noWinnerGarota,
        garoto_jobs: noWinnerGaroto,
      },
      approvedBy: existing?.approvedBy,
      approvedAtUtc: existing?.approvedAtUtc,
      approvalJustification: existing?.approvalJustification,
      reviewHistory: existing?.reviewHistory || [],
      correctionHistory: existing?.correctionHistory || [],
    };
  }

  // ==========================================================================
  // CONSULTAS PÚBLICAS, DO CRIADOR E ADMINISTRATIVAS (COM CONTROLE DE ACESSO)
  // ==========================================================================

  public getCycle(cycleId = '2026-10', environment: RecognitionEnvironment = 'sandbox'): MonthlyRecognitionCycle {
    const state = this.loadState(environment);
    const current = state.cycles[cycleId];
    if (!current || current.status === 'open_provisional' || current.status === 'closed_pending_review') {
      const refreshed = this.computeCycleFromState(state, cycleId, environment);
      state.cycles[cycleId] = refreshed;
      this.saveState(environment, state);
      return refreshed;
    }
    return current;
  }

  public getAllCycles(environment: RecognitionEnvironment = 'sandbox'): MonthlyRecognitionCycle[] {
    const state = this.loadState(environment);
    // Atualiza o ciclo ativo
    state.cycles[state.activeCycleId] = this.computeCycleFromState(state, state.activeCycleId, environment);
    this.saveState(environment, state);
    return Object.values(state.cycles).sort((a, b) => b.cycleId.localeCompare(a.cycleId));
  }

  /**
   * Seção 6 — Exibição Pública na Tela Inicial:
   * - Se o ciclo solicitado estiver homologado ('officially_published' ou 'corrected_republished'),
   *   retorna os vencedores oficiais.
   * - Se o ciclo vigente ainda estiver em apuração provisória ('open_provisional' ou 'closed_pending_review'),
   *   NÃO exibe nomes de candidatos como vencedores daquele ciclo antes da aprovação!
   */
  public getPublicRecognitionView(
    cycleId = '2026-09',
    environment: RecognitionEnvironment = 'sandbox'
  ): PublicRecognitionPayload {
    const cycle = this.getCycle(cycleId, environment);
    const isOfficial =
      cycle.status === 'officially_published' || cycle.status === 'corrected_republished';

    return {
      cycleId: cycle.cycleId,
      periodLabel: cycle.periodLabel,
      validityLabel: cycle.validityLabel,
      timezone: cycle.timezone,
      status: cycle.status,
      isOfficial,
      environment: cycle.environment,
      lastProvisionalUpdateUtc: cycle.lastProvisionalUpdateUtc,
      formula: cycle.formula,
      officialWinners: isOfficial
        ? cycle.officialWinners
        : {
            garota_jobs: null,
            garoto_jobs: null,
          },
      noWinnerReasons: cycle.noWinnerReasons,
      provisionalNotice: isOfficial
        ? null
        : `Classificação Provisória em Apuração (${cycle.periodLabel}): Os candidatos permanecem ocultos como vencedores até o fechamento contábil e a revisão administrativa oficial.`,
      rulesSummary: {
        eligibilityCriteria: [
          'Participação automática para todas as contas regulares com verificação 18+ (KYC) e termo de consentimento ativo.',
          'Categoria ("Garota JOBS" ou "Garoto JOBS") autodeclarada de forma inclusiva e transparente pelo próprio criador.',
          'Atividade válida registrada dentro do mês de competência (mídias aprovadas ou transações confirmadas).',
          'Alertas automáticos não geram desclassificação sumária; apenas impedimentos confirmados após revisão humana excluem candidatos.',
        ],
        scoringWeights: [
          '50% — Nota Econômica: receita líquida elegível confirmada para a plataforma, descontando estornos, reembolsos e taxas de gateway.',
          '30% — Nota de Conteúdo: publicações válidas aprovadas, dias ativos e alcance real (com trava anti-spam de até 2 uploads/dia e 12/mês).',
          '20% — Nota de Integridade: conformidade KYC 18+, ausência de violações confirmadas, taxa de estorno segura (<2%) e telemetria completa.',
        ],
        tieBreakers: [
          '1º Maior Pontuação Combinada Final (0 a 100)',
          '2º Maior Nota Econômica Líquida Elegível',
          '3º Menor Taxa de Estornos/Reembolsos no Período',
          '4º Maior Nota de Integridade e Conformidade',
          '5º Data de Verificação KYC mais antiga',
        ],
      },
    };
  }

  /**
   * Seção 6 & 10 (Teste 12) — Experiência no Creator Studio com restrição de acesso:
   * Um criador pode consultar apenas seus próprios indicadores detalhados; tentativas de consultar
   * dados individuais detalhados de terceiros sem permissão de administrador são negadas.
   */
  public getCreatorStudioRecognitionView(params: {
    requesterId: string;
    requesterRole: 'creator' | 'admin' | 'master';
    targetCreatorId: string;
    cycleId?: string;
    environment?: RecognitionEnvironment;
  }): CreatorOwnRecognitionView {
    const env = params.environment || 'sandbox';
    const cycleId = params.cycleId || '2026-10';

    const mappedRequester = params.requesterId === 'current_user' ? 'valentina' : params.requesterId;
    const mappedTarget = params.targetCreatorId === 'current_user' ? 'valentina' : params.targetCreatorId;

    const isAdmin = params.requesterRole === 'admin' || params.requesterRole === 'master';
    if (!isAdmin && mappedRequester !== mappedTarget) {
      throw new Error(
        'ACESSO NEGADO (Menor Privilégio): Criadores não têm permissão para visualizar métricas detalhadas individuais de terceiros.'
      );
    }

    const state = this.loadState(env);
    const cycle = this.getCycle(cycleId, env);

    const allCandidates = [
      ...cycle.candidatesGarota,
      ...cycle.candidatesGaroto,
      ...cycle.ineligibleCandidates,
    ];
    const candidate = allCandidates.find((c) => c.creatorId === mappedTarget);
    if (!candidate) {
      throw new Error(`Criador '${mappedTarget}' não encontrado no ciclo ${cycleId} (${env}).`);
    }

    const categoryList =
      candidate.category === 'garota_jobs'
        ? cycle.candidatesGarota
        : candidate.category === 'garoto_jobs'
        ? cycle.candidatesGaroto
        : [];

    const tips: string[] = [];
    if (candidate.scores.cappedUploadsScoredCount < cycle.formula.maxCountedUploadsPerCycle) {
      tips.push(
        `Publique mais ${cycle.formula.maxCountedUploadsPerCycle - candidate.scores.cappedUploadsScoredCount} conteúdos aprovados em dias distintos (máx. ${cycle.formula.maxUploadsPerDayCredit}/dia) para atingir os 50 pts de produção.`
      );
    }
    if (candidate.scores.missingIntegrityIndicators.length > 0) {
      tips.push(
        `Regularize os indicadores pendentes (${candidate.scores.missingIntegrityIndicators.join(', ')}) para destravar até 100 pts na Nota de Integridade.`
      );
    }
    if (candidate.scores.excludedPendingBrl > 0) {
      tips.push(
        `Você possui R$ ${candidate.scores.excludedPendingBrl.toFixed(2)} em transações pendentes de liquidação que serão computadas assim que confirmadas.`
      );
    }
    if (tips.length === 0) {
      tips.push(
        'Seus indicadores de integridade e consistência estão excelentes! Mantenha o índice de estornos abaixo de 2% para preservar a vantagem nos critérios de desempate.'
      );
    }

    const myAppeals = state.appeals.filter((a) => a.creatorId === mappedTarget && a.cycleId === cycleId);

    return {
      creatorId: candidate.creatorId,
      publicName: candidate.publicName,
      handle: candidate.handle,
      declaredCategory: candidate.category,
      cycleId: cycle.cycleId,
      periodLabel: cycle.periodLabel,
      cycleStatus: cycle.status,
      environment: env,
      rankInCategory: candidate.rank,
      totalEligibleInCategory: categoryList.length,
      eligibility: candidate.eligibility,
      scores: candidate.scores,
      formula: cycle.formula,
      improvementTips: tips,
      myAppeals,
    };
  }

  /**
   * Mecanismo inclusivo e transparente para o próprio criador ou admin atualizar a categoria de participação
   * ('garota_jobs' | 'garoto_jobs' | 'opted_out') sem inferência automática.
   */
  public updateCreatorCategoryDeclaration(params: {
    creatorId: string;
    newCategory: CreatorDeclaredCategory;
    actorId: string;
    actorRole: 'creator' | 'admin' | 'master';
    reason: string;
    environment?: RecognitionEnvironment;
  }): CreatorComplianceProfile {
    const env = params.environment || 'sandbox';
    const mappedCreatorId = params.creatorId === 'current_user' ? 'valentina' : params.creatorId;
    const mappedActorId = params.actorId === 'current_user' ? 'valentina' : params.actorId;

    const isAdmin = params.actorRole === 'admin' || params.actorRole === 'master';
    if (!isAdmin && mappedActorId !== mappedCreatorId) {
      throw new Error('ACESSO NEGADO: Apenas o próprio criador ou um administrador autorizado pode alterar a categoria.');
    }

    const state = this.loadState(env);
    const profile = state.profiles.find((p) => p.creatorId === mappedCreatorId);
    if (!profile) {
      throw new Error(`Perfil de criador '${mappedCreatorId}' não encontrado.`);
    }

    profile.declaredCategory = params.newCategory;
    profile.categoryUpdatedAt = new Date().toISOString();

    state.cycles[state.activeCycleId] = this.computeCycleFromState(state, state.activeCycleId, env);
    this.saveState(env, state);

    return profile;
  }

  // ==========================================================================
  // GOVERNANÇA ADMINISTRATIVA, REVISÃO, HOMOLOGAÇÃO, CORREÇÃO E RECURSOS
  // ==========================================================================

  private assertAdminAuthorized(actorId: string, actorRole: AdminRole, actionName: string, targetId: string): void {
    const allowedRoles: AdminRole[] = ['master', 'admin', 'finance', 'security'];
    if (!actorId || !allowedRoles.includes(actorRole)) {
      void adminAuditService.logActivity({
        actorId: actorId || 'anonymous',
        actorRole: actorRole || 'moderator',
        action: 'ACCESS_DENIED',
        targetType: 'system',
        targetId,
        result: 'denied',
        reason: `Tentativa não autorizada de executar '${actionName}' no Ranking Mensal Garoto & Garota JOBS.`,
        environment: 'sandbox',
      });
      throw new Error(
        `ACESSO NEGADO: O perfil '${actorRole}' (${actorId}) não possui privilégio administrativo para executar '${actionName}'.`
      );
    }
  }

  /**
   * Impede alteração dos pesos da fórmula durante um ciclo ativo em andamento (Seção 4).
   */
  public updateScoringFormulaWeights(params: {
    cycleId: string;
    actorId: string;
    actorRole: AdminRole;
    economicWeight: number;
    contentWeight: number;
    integrityWeight: number;
    environment?: RecognitionEnvironment;
  }): ScoringFormulaConfig {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'UPDATE_SCORING_FORMULA', params.cycleId);

    const state = this.loadState(env);
    const cycle = this.getCycle(params.cycleId, env);

    if (cycle.formula.isLockedForActiveCycle || cycle.status !== 'review_rejected') {
      throw new Error(
        'OPERAÇÃO BLOQUEADA: Os pesos da fórmula de pontuação não podem ser alterados durante um ciclo ativo ou já publicado.'
      );
    }

    const sum = Number((params.economicWeight + params.contentWeight + params.integrityWeight).toFixed(2));
    if (sum !== 1.0) {
      throw new Error(`A soma dos pesos deve ser exatamente 1.00 (recebido: ${sum}).`);
    }

    cycle.formula = {
      ...cycle.formula,
      economicWeight: params.economicWeight,
      contentWeight: params.contentWeight,
      integrityWeight: params.integrityWeight,
      version: `v1.1.0-CUSTOM-${Math.round(params.economicWeight * 100)}-${Math.round(params.contentWeight * 100)}-${Math.round(params.integrityWeight * 100)}`,
    };
    state.cycles[params.cycleId] = this.computeCycleFromState(state, params.cycleId, env);
    this.saveState(env, state);
    return cycle.formula;
  }

  /**
   * Fecha o período de apuração provisória e encaminha para revisão administrativa obrigatória.
   */
  public closeCycleForReview(params: {
    cycleId: string;
    actorId: string;
    actorRole: AdminRole;
    justification: string;
    environment?: RecognitionEnvironment;
  }): MonthlyRecognitionCycle {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'CLOSE_MONTHLY_CYCLE', params.cycleId);

    if (!params.justification || params.justification.trim().length < 5) {
      throw new Error('Justificativa administrativa obrigatória (mínimo de 5 caracteres) para fechar o ciclo.');
    }

    const state = this.loadState(env);
    const cycle = this.computeCycleFromState(state, params.cycleId, env);
    const prevStatus = cycle.status;

    cycle.status = 'closed_pending_review';
    cycle.reviewHistory.push({
      decisionId: `dec_${Date.now()}_close`,
      cycleId: params.cycleId,
      action: 'close_period',
      actorId: params.actorId,
      actorRole: params.actorRole,
      justification: params.justification.trim(),
      timestamp: new Date().toISOString(),
      formulaVersion: cycle.formula.version,
      previousStatus: prevStatus,
      newStatus: 'closed_pending_review',
    });

    state.cycles[params.cycleId] = cycle;
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CONFIG_CHANGE',
      targetType: 'system',
      targetId: `cycle_${params.cycleId}`,
      result: 'success',
      reason: `Fechamento do ciclo mensal ${params.cycleId} para revisão: ${params.justification.trim()}`,
      environment: env,
    });

    return cycle;
  }

  /**
   * Aprova e publica oficialmente o resultado mensal após revisão humana (Seção 5 e 7).
   */
  public approveAndPublishOfficialCycle(params: {
    cycleId: string;
    actorId: string;
    actorRole: AdminRole;
    justification: string;
    environment?: RecognitionEnvironment;
  }): MonthlyRecognitionCycle {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'APPROVE_OFFICIAL_CYCLE', params.cycleId);

    if (!params.justification || params.justification.trim().length < 8) {
      throw new Error(
        'Justificativa administrativa detalhada é obrigatória para homologar e publicar oficialmente o ranking mensal.'
      );
    }

    const state = this.loadState(env);
    const cycle = this.computeCycleFromState(state, params.cycleId, env);
    const prevStatus = cycle.status;

    if (prevStatus === 'officially_published' || prevStatus === 'corrected_republished') {
      throw new Error(
        'Este ciclo já foi publicado oficialmente. Para alterar um resultado homologado, utilize o protocolo rastreável de Correção Oficial (correctOfficialCycle).'
      );
    }

    const nowIso = new Date().toISOString();
    const topGarota = cycle.candidatesGarota[0] || null;
    const topGaroto = cycle.candidatesGaroto[0] || null;

    cycle.officialWinners = {
      garota_jobs: topGarota
        ? {
            category: 'garota_jobs',
            titleLabel: 'Garota JOBS',
            creatorId: topGarota.creatorId,
            publicName: topGarota.publicName,
            handle: topGarota.handle,
            avatarUrl: topGarota.avatarUrl,
            finalScore: topGarota.scores.finalScore,
            cycleId: cycle.cycleId,
            periodLabel: cycle.periodLabel,
            validityLabel: cycle.validityLabel,
            approvedAt: nowIso,
            approvedBy: params.actorId,
            formulaVersion: cycle.formula.version,
          }
        : null,
      garoto_jobs: topGaroto
        ? {
            category: 'garoto_jobs',
            titleLabel: 'Garoto JOBS',
            creatorId: topGaroto.creatorId,
            publicName: topGaroto.publicName,
            handle: topGaroto.handle,
            avatarUrl: topGaroto.avatarUrl,
            finalScore: topGaroto.scores.finalScore,
            cycleId: cycle.cycleId,
            periodLabel: cycle.periodLabel,
            validityLabel: cycle.validityLabel,
            approvedAt: nowIso,
            approvedBy: params.actorId,
            formulaVersion: cycle.formula.version,
          }
        : null,
    };

    cycle.status = 'officially_published';
    cycle.approvedBy = params.actorId;
    cycle.approvedAtUtc = nowIso;
    cycle.approvalJustification = params.justification.trim();

    cycle.reviewHistory.push({
      decisionId: `dec_${Date.now()}_approve`,
      cycleId: params.cycleId,
      action: 'approve_official',
      actorId: params.actorId,
      actorRole: params.actorRole,
      justification: params.justification.trim(),
      timestamp: nowIso,
      formulaVersion: cycle.formula.version,
      previousStatus: prevStatus,
      newStatus: 'officially_published',
    });

    state.cycles[params.cycleId] = cycle;
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'POLICY_UPDATE',
      targetType: 'system',
      targetId: `cycle_${params.cycleId}`,
      result: 'success',
      reason: `Homologação oficial Garoto & Garota JOBS (${params.cycleId}): ${params.justification.trim()}`,
      environment: env,
      metadata: {
        garotaWinner: cycle.officialWinners.garota_jobs?.creatorId || 'none',
        garotoWinner: cycle.officialWinners.garoto_jobs?.creatorId || 'none',
        formulaVersion: cycle.formula.version,
      },
    });

    return cycle;
  }

  /**
   * Rejeita ou solicita nova análise da classificação provisória com justificativa obrigatória.
   */
  public rejectOrRequestReanalysis(params: {
    cycleId: string;
    actorId: string;
    actorRole: AdminRole;
    justification: string;
    environment?: RecognitionEnvironment;
  }): MonthlyRecognitionCycle {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'REJECT_OR_REANALYZE_CYCLE', params.cycleId);

    if (!params.justification || params.justification.trim().length < 5) {
      throw new Error('Justificativa obrigatória para solicitar nova análise ou rejeitar homologação.');
    }

    const state = this.loadState(env);
    const cycle = this.getCycle(params.cycleId, env);
    const prevStatus = cycle.status;

    cycle.status = 'review_rejected';
    cycle.reviewHistory.push({
      decisionId: `dec_${Date.now()}_reanalysis`,
      cycleId: params.cycleId,
      action: 'request_reanalysis',
      actorId: params.actorId,
      actorRole: params.actorRole,
      justification: params.justification.trim(),
      timestamp: new Date().toISOString(),
      formulaVersion: cycle.formula.version,
      previousStatus: prevStatus,
      newStatus: 'review_rejected',
    });

    state.cycles[params.cycleId] = cycle;
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CONFIG_CHANGE',
      targetType: 'system',
      targetId: `cycle_${params.cycleId}`,
      result: 'success',
      reason: `Solicitação de reanálise do ciclo ${params.cycleId}: ${params.justification.trim()}`,
      environment: env,
    });

    return cycle;
  }

  /**
   * Seção 5 — Protocolo de Correção Oficial Pós-Publicação:
   * Não reescreve um resultado oficial silenciosamente; preserva o snapshot anterior em correctionHistory,
   * exige justificativa formal, responsável e data, e recalcula com base nos dados atualizados.
   */
  public correctOfficialCycle(params: {
    cycleId: string;
    actorId: string;
    actorRole: AdminRole;
    reason: string;
    environment?: RecognitionEnvironment;
  }): MonthlyRecognitionCycle {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'CORRECT_OFFICIAL_CYCLE', params.cycleId);

    if (!params.reason || params.reason.trim().length < 10) {
      throw new Error(
        'Para retificar um resultado oficial já publicado, é obrigatório informar o motivo detalhado (mín. 10 caracteres).'
      );
    }

    const state = this.loadState(env);
    const existing = state.cycles[params.cycleId];
    if (
      !existing ||
      (existing.status !== 'officially_published' && existing.status !== 'corrected_republished')
    ) {
      throw new Error('Apenas ciclos já publicados oficialmente podem passar por retificação formal.');
    }

    const previousWinnersSnapshot = {
      garota_jobs: existing.officialWinners.garota_jobs ? { ...existing.officialWinners.garota_jobs } : null,
      garoto_jobs: existing.officialWinners.garoto_jobs ? { ...existing.officialWinners.garoto_jobs } : null,
    };

    const recomputed = this.computeCycleFromState(state, params.cycleId, env, {
      useOctoberDataForSeptPreview: params.cycleId === '2026-09',
    });

    const nowIso = new Date().toISOString();
    const topGarota = recomputed.candidatesGarota[0] || null;
    const topGaroto = recomputed.candidatesGaroto[0] || null;

    const newWinners = {
      garota_jobs: topGarota
        ? {
            category: 'garota_jobs' as const,
            titleLabel: 'Garota JOBS' as const,
            creatorId: topGarota.creatorId,
            publicName: topGarota.publicName,
            handle: topGarota.handle,
            avatarUrl: topGarota.avatarUrl,
            finalScore: topGarota.scores.finalScore,
            cycleId: recomputed.cycleId,
            periodLabel: recomputed.periodLabel,
            validityLabel: recomputed.validityLabel,
            approvedAt: nowIso,
            approvedBy: params.actorId,
            formulaVersion: recomputed.formula.version,
          }
        : null,
      garoto_jobs: topGaroto
        ? {
            category: 'garoto_jobs' as const,
            titleLabel: 'Garoto JOBS' as const,
            creatorId: topGaroto.creatorId,
            publicName: topGaroto.publicName,
            handle: topGaroto.handle,
            avatarUrl: topGaroto.avatarUrl,
            finalScore: topGaroto.scores.finalScore,
            cycleId: recomputed.cycleId,
            periodLabel: recomputed.periodLabel,
            validityLabel: recomputed.validityLabel,
            approvedAt: nowIso,
            approvedBy: params.actorId,
            formulaVersion: recomputed.formula.version,
          }
        : null,
    };

    const correctionRecord: CycleCorrectionRecord = {
      correctionId: `corr_${Date.now()}`,
      cycleId: params.cycleId,
      correctedAt: nowIso,
      actorId: params.actorId,
      actorRole: params.actorRole,
      reason: params.reason.trim(),
      previousWinners: previousWinnersSnapshot,
      newWinners,
    };

    recomputed.status = 'corrected_republished';
    recomputed.officialWinners = newWinners;
    recomputed.approvedBy = params.actorId;
    recomputed.approvedAtUtc = nowIso;
    recomputed.approvalJustification = `[RETIFICAÇÃO OFICIAL] ${params.reason.trim()}`;
    recomputed.correctionHistory = [...(existing.correctionHistory || []), correctionRecord];
    recomputed.reviewHistory = [
      ...(existing.reviewHistory || []),
      {
        decisionId: `dec_${Date.now()}_correction`,
        cycleId: params.cycleId,
        action: 'official_correction',
        actorId: params.actorId,
        actorRole: params.actorRole,
        justification: params.reason.trim(),
        timestamp: nowIso,
        formulaVersion: recomputed.formula.version,
        previousStatus: existing.status,
        newStatus: 'corrected_republished',
      },
    ];

    state.cycles[params.cycleId] = recomputed;
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'POLICY_UPDATE',
      targetType: 'system',
      targetId: `cycle_${params.cycleId}`,
      result: 'success',
      reason: `Retificação oficial de ciclo publicado (${params.cycleId}): ${params.reason.trim()}`,
      environment: env,
    });

    return recomputed;
  }

  /**
   * Revisão humana de suspeita / fraude e submissão / julgamento de recurso (Seção 3, 7 e 8).
   */
  public submitCreatorAppeal(params: {
    cycleId: string;
    creatorId: string;
    reason: string;
    environment?: RecognitionEnvironment;
  }): CreatorAppealRecord {
    const env = params.environment || 'sandbox';
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('Descreva o motivo do recurso/revisão (mínimo de 5 caracteres).');
    }

    const mappedCreatorId = params.creatorId === 'current_user' ? 'valentina' : params.creatorId;
    const state = this.loadState(env);
    const profile = state.profiles.find((p) => p.creatorId === mappedCreatorId);
    if (!profile) {
      throw new Error(`Criador '${mappedCreatorId}' não localizado.`);
    }

    const appeal: CreatorAppealRecord = {
      appealId: `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cycleId: params.cycleId,
      creatorId: mappedCreatorId,
      creatorName: profile.publicName,
      reason: params.reason.trim(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
      environment: env,
    };

    state.appeals.unshift(appeal);
    this.saveState(env, state);
    return appeal;
  }

  public resolveCreatorAppeal(params: {
    appealId: string;
    decision: 'approved' | 'rejected';
    actorId: string;
    actorRole: AdminRole;
    justification: string;
    restoreEligibilityAndTelemetry?: boolean;
    environment?: RecognitionEnvironment;
  }): CreatorAppealRecord {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'RESOLVE_CREATOR_APPEAL', params.appealId);

    if (!params.justification || params.justification.trim().length < 5) {
      throw new Error('Justificativa obrigatória para julgar o recurso do criador.');
    }

    const state = this.loadState(env);
    const appeal = state.appeals.find((a) => a.appealId === params.appealId);
    if (!appeal) {
      throw new Error(`Recurso '${params.appealId}' não encontrado.`);
    }

    appeal.status = params.decision;
    appeal.reviewedBy = params.actorId;
    appeal.reviewedAt = new Date().toISOString();
    appeal.resolutionJustification = params.justification.trim();

    if (params.decision === 'approved' && params.restoreEligibilityAndTelemetry) {
      const profile = state.profiles.find((p) => p.creatorId === appeal.creatorId);
      if (profile) {
        profile.fraudStage = 'clean';
        profile.accountStatus = 'active';
        profile.confirmedViolationsCount = 0;
        profile.auditTelemetryComplete = true;
      }
    }

    state.cycles[appeal.cycleId] = this.computeCycleFromState(state, appeal.cycleId, env);
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CONFIG_CHANGE',
      targetType: 'user',
      targetId: appeal.creatorId,
      result: 'success',
      reason: `Recurso ${appeal.appealId} julgado como '${params.decision}': ${params.justification.trim()}`,
      environment: env,
    });

    return appeal;
  }

  public updateCreatorFraudStage(params: {
    creatorId: string;
    newStage: FraudReviewStage;
    actorId: string;
    actorRole: AdminRole;
    justification: string;
    environment?: RecognitionEnvironment;
  }): CreatorComplianceProfile {
    const env = params.environment || 'sandbox';
    this.assertAdminAuthorized(params.actorId, params.actorRole, 'UPDATE_FRAUD_REVIEW_STAGE', params.creatorId);

    if (!params.justification || params.justification.trim().length < 5) {
      throw new Error('Justificativa obrigatória para atualizar o estágio de revisão antifraude.');
    }

    const state = this.loadState(env);
    const profile = state.profiles.find((p) => p.creatorId === params.creatorId);
    if (!profile) {
      throw new Error(`Criador '${params.creatorId}' não encontrado.`);
    }

    profile.fraudStage = params.newStage;
    profile.fraudNotes = params.justification.trim();
    if (params.newStage === 'confirmed_fraud') {
      profile.accountStatus = 'blocked';
      profile.confirmedViolationsCount = Math.max(1, profile.confirmedViolationsCount || 0);
    } else if (params.newStage === 'clean') {
      if (profile.accountStatus === 'blocked') {
        profile.accountStatus = 'active';
      }
      profile.confirmedViolationsCount = 0;
    }

    state.cycles[state.activeCycleId] = this.computeCycleFromState(state, state.activeCycleId, env);
    this.saveState(env, state);

    void adminAuditService.logActivity({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'USER_SUSPEND',
      targetType: 'user',
      targetId: params.creatorId,
      result: 'success',
      reason: `Estágio antifraude alterado para '${params.newStage}': ${params.justification.trim()}`,
      environment: env,
    });

    return profile;
  }

  public getAppeals(environment: RecognitionEnvironment = 'sandbox'): CreatorAppealRecord[] {
    return this.loadState(environment).appeals;
  }
}

export const monthlyRecognitionService = new MonthlyRecognitionDomainService();
export default monthlyRecognitionService;
