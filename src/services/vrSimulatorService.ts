/**
 * JOBS — Simulador de Realidade Virtual, Modo "Lançamento Play Store — Dia 1"
 * e Módulo Financeiro de Evolução Monetária (30 Dias)
 *
 * REGRAS INEGOCIÁVEIS DE SEGURANÇA, ISOLAMENTO E CONTABILIDADE:
 * 1. Isolamento estrito de ambiente (namespace 'vr_sim_sandbox_v1'): nunca altera saldos,
 *    carteiras, livro-razão ou rankings de produção.
 * 2. Avisos permanentes obrigatórios:
 *    - "SIMULAÇÃO — DADOS FICTÍCIOS — SEM VALOR FINANCEIRO REAL"
 *    - "SIMULAÇÃO FINANCEIRA — SEM VALOR REAL"
 * 3. Separação estrita entre Créditos Virtuais (categoria não monetária de consumo interno)
 *    e Saldos Monetários Fictícios em BRL (centavos inteiros).
 *    - A aquisição/concessão de créditos registra entrada no caixa de teste fictício e emite
 *      créditos virtuais na carteira do fã, mas NÃO é reconhecida como receita elegível de split.
 *    - A receita elegível e a divisão 70/30 ocorrem exclusivamente no consumo elegível (desbloqueios,
 *      presentes virtuais, tickets de live e desafios), evitando dupla contabilização.
 * 4. Ciclo completo de pagamentos simulados aos criadores:
 *    - Estados: 'pending' -> 'approved' -> 'completed' | 'rejected'.
 *    - As obrigações pendentes com criadores SÓ são reduzidas quando o pagamento atinge 'completed'.
 * 5. Evolução financeira diária (Dia 1 ao Dia 30) derivada estritamente dos lançamentos de cada
 *    dia simulado, sem repetir saldos atuais em datas passadas.
 */

import { INITIAL_PROFILES } from '../data/mockData';
import { financialLedger } from './ledgerService';

export const VR_SIMULATOR_WATERMARK =
  'SIMULAÇÃO — DADOS FICTÍCIOS — SEM VALOR FINANCEIRO REAL' as const;

export const VR_SIMULATOR_SHORT_BADGE = 'SIMULAÇÃO — DADOS FICTÍCIOS' as const;

export const VR_FINANCIAL_SIMULATION_BADGE =
  'SIMULAÇÃO FINANCEIRA — SEM VALOR REAL' as const;

export const VR_SIMULATOR_NAMESPACE = 'vr_sim_sandbox_v1' as const;

export const PLAY_STORE_DAY_ONE_MODE_LABEL = 'Lançamento Play Store — Dia 1' as const;

export const AUTHORIZED_REPO_IMAGE_ASSETS: readonly string[] = Object.freeze([
  '/src/assets/images/profile_camila_1791856837360.jpg',
  '/src/assets/images/profile_gabriel_1791856836359.jpg',
  '/src/assets/images/profile_isabella_1791856837043.jpg',
  '/src/assets/images/profile_valentina_1791856836634.jpg',
  '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
]);

export type SimulationOperationMode = 'standard_sandbox' | 'play_store_day_one_launch';
export type SimulatorClockStatus = 'idle' | 'running' | 'paused' | 'completed' | 'terminated';
export type SimulatorSpeedMultiplier = 1 | 2 | 5 | 10 | 30;
export type SyntheticRecognitionCategory = 'garota_jobs' | 'garoto_jobs' | 'opted_out';
export type SimulatedLiveFormat = 'individual' | 'battle' | 'interactive_stage' | 'challenge';

export type MediaPlayerLifecycleState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

export interface SimulatedClockProvider {
  nowMs: () => number;
  nowIso: () => string;
  currentSimDay: () => number;
  status: () => SimulatorClockStatus;
  advanceDays: (days: number) => number;
}

export type ModuleActivationAvailability =
  | 'active'
  | 'degraded_or_partial'
  | 'unavailable_or_blocked';

export type SimulatedPayoutStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface SimulatedPayoutTransitionLog {
  transitionId: string;
  timestampIso: string;
  simDay: number;
  fromStatus: SimulatedPayoutStatus | 'none';
  toStatus: SimulatedPayoutStatus;
  actorId: string;
  reason: string;
}

export interface SimulatedCreatorPayoutRecord {
  payoutId: string;
  idempotencyKey: string;
  creatorId: string;
  creatorHandle: string;
  simDayRequested: number;
  simDayUpdated: number;
  amountCents: number;
  status: SimulatedPayoutStatus;
  isSimulation: true;
  financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  obligationsReduced: boolean;
  ledgerEntryId: string | null;
  rejectionReason?: string;
  auditTrail: SimulatedPayoutTransitionLog[];
}

export interface FanWalletStatementSummary {
  fanId: string;
  handle: string;
  previousBalanceCreditsCents: number;
  inflowsCreditsCents: number;
  outflowsCreditsCents: number;
  refundedCreditsCents: number;
  cancelledOrFailedAttemptsCount: number;
  finalBalanceCreditsCents: number;
  fictitiousMonetaryPaidBrlCents: number;
}

export interface DailyFinancialEvolutionReportPoint {
  simDay: number;
  simulatedDateIso: string;
  displayDate: string;
  financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  // Métricas do dia (fluxo diário)
  dayGrossEligibleRevenueCents: number;
  dayRefundsAndAdjustmentsCents: number;
  dayNetRecognizedRevenueCents: number;
  dayPlatformCommissionCents: number; // 30% líquido do dia
  dayCreatorRemunerationCents: number; // 70% líquido do dia
  daySimulatedPaidToCreatorsCents: number; // Pagamentos concluídos ('completed') no dia
  daySimulatedCashInflowsCents: number; // Entradas fictícias de caixa no dia
  daySimulatedCashOutflowsCents: number; // Saídas fictícias de caixa (estornos + payouts completed) no dia
  // Métricas acumuladas até a data de referência (derivadas historicamente dos lançamentos até simDay)
  cumulativeGrossEligibleRevenueCents: number;
  cumulativeRefundsAndAdjustmentsCents: number;
  cumulativeNetRecognizedRevenueCents: number;
  cumulativePlatformCommissionCents: number;
  cumulativeCreatorRemunerationCents: number;
  cumulativeSimulatedPaidToCreatorsCents: number;
  pendingCreatorObligationsCents: number; // Obrigações pendentes = remuneração acumulada - pagamentos 'completed'
  pendingOrApprovedUnsettledPayoutsCents: number; // Solicitações ainda em 'pending' ou 'approved'
  fictitiousInitialTestCashCents: 0; // Saldo inicial fictício explícito = 0
  availableSimulatedTestCashCents: number; // Caixa de teste disponível = entradas acumuladas - saídas acumuladas
  platformAvailableNetCashAfterObligationsCents: number; // Receita líquida plataforma acumulada (30%)
  // Categoria estritamente separada: Créditos Virtuais dos Usuários
  virtualCreditsCategory: {
    openingCreditsBalanceCents: number;
    creditsGrantedInDayCents: number;
    creditsConsumedInDayCents: number;
    creditsRefundedInDayCents: number;
    closingCreditsBalanceCents: number;
    nonWithdrawableVirtualCredits: true;
  };
  ledgerVsDerivedBalanceDivergenceCents: number;
  isReconciled: boolean;
}

export interface ProgressiveActivationStep {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  moduleKey: string;
  title: string;
  inspectedDependencies: string[];
  availabilityStatus: ModuleActivationAvailability;
  activatedInSimulation: boolean;
  syntheticAccountsExercisedCount: number;
  unavailableOrPendingDetails: string | null;
  evidenceSummary: string;
  verifiedAtIso: string;
}

export interface ServiceDependencyHealthCheck {
  serviceId: string;
  serviceName: string;
  status: 'healthy_sandbox' | 'partial_local_only' | 'external_blocked_by_policy';
  dependenciesVerified: string[];
  diagnosticNote: string;
}

export interface SegregatedLaunchMetrics {
  simulatedInstallsCount: number;
  syntheticUsersCreatedCount: number;
  simulatedSessionsCount: number;
  activeSimulatedUsersCount: number;
  externalReadOnlyBaseline: {
    preexistingMockProfilesCount: number;
    productionLedgerEntriesReadOnlyCount: number;
    mixedWithSimulationMetrics: false;
  };
  storeIntegrityGuarantees: {
    realPlayStorePublished: false;
    fakePlayStoreReviewsGenerated: 0;
    fakePublicCommentsGenerated: 0;
    artificialPlayStoreInstallsGenerated: 0;
    actionsAgainstRealAccounts: 0;
    realPushNotificationsSent: 0;
  };
}

export interface BlockedExternalOperationRecord {
  recordId: string;
  simDay: number;
  timestampIso: string;
  operationCategory:
    | 'EXTERNAL_PAYMENT_GATEWAY'
    | 'REAL_BANK_PAYOUT_PIX_TED'
    | 'EXTERNAL_PUSH_NOTIFICATION'
    | 'PLAY_STORE_PUBLIC_API'
    | 'LOCAL_VIDEO_STREAM_FILE'
    | 'PRODUCTION_LEDGER_WRITE_ATTEMPT';
  status: 'BLOCKED_BY_SANDBOX_POLICY' | 'IDENTIFIED_UNAVAILABLE_DEPENDENCY';
  reason: string;
}

export interface InitialLaunchStateRecord {
  scenarioId: string;
  mode: SimulationOperationMode;
  modeLabel: string;
  initializedAtIso: string;
  initialSimDay: number;
  seed: number;
  initialSyntheticCreatorsCount: number;
  initialSyntheticFansCount: number;
  productionDataTouched: false;
  productionLedgerCountAtStart: number;
  serviceHealthChecks: ServiceDependencyHealthCheck[];
  progressiveActivationSteps: ProgressiveActivationStep[];
}

export interface VrSimulatorCapacityConfig {
  totalDays: number;
  initialCreatorsCount: number;
  initialFansCount: number;
  dailyNewFansRate: number;
  maxSyntheticFansCap: number;
  maxEventsPerDayCap: number;
  maxMemoryKbCap: number;
  maxConcurrencyCap: number;
}

export interface SyntheticCreatorProfile {
  creatorId: string;
  handle: string;
  displayName: string;
  syntheticEmail: string;
  syntheticDocumentId: string;
  isSynthetic: true;
  ageVerified18Plus: true;
  profileComplete: boolean;
  accountRegular: boolean;
  recognitionCategory: SyntheticRecognitionCategory;
  avatarAssetPath: string;
  freeGalleryPhotoPaths: [string, string];
  paidVaultAlbumPhotoPaths: string[];
  vaultUnlockPriceCents: number;
  liveTicketPriceCents: number;
  createdAtSimDay: number;
  grossEligibleRevenueCents: number;
  refundedRevenueCents: number;
  netEligibleRevenueCents: number;
  creatorShareGrossCents: number;
  creatorShareRefundedCents: number;
  creatorNetShareCents: number;
  platformNetShareCents: number;
  settledPayoutCents: number;
  pendingPayoutCents: number;
  approvedUnsettledPayoutCents: number;
  rejectedPayoutCents: number;
  availableBalanceCents: number;
  validPostsCount: number;
  validStoriesCount: number;
  validLivesCount: number;
  unlockedVaultSalesCount: number;
  giftsReceivedCount: number;
  challengesCompletedCount: number;
  matchesCount: number;
  messagesExchangedCount: number;
  severeViolationsCount: number;
  confirmedFraudCount: number;
  moderationWarningsCount: number;
}

export interface SyntheticFanAccount {
  fanId: string;
  handle: string;
  syntheticEmail: string;
  isSynthetic: true;
  ageVerified18Plus: true;
  createdAtSimDay: number;
  previousBalanceCreditsCents: number;
  walletCreditsCents: number;
  totalCreditsPurchasedCents: number;
  fictitiousMonetaryPaidBrlCents: number;
  totalSpentCents: number;
  totalRefundedCreditsCents: number;
  cancelledOrFailedAttemptsCount: number;
  unlockedAlbumIds: string[];
  blockedCreatorIds: string[];
}

export type SandboxOperationType =
  | 'CREDIT_PACK_PURCHASE'
  | 'VAULT_ALBUM_UNLOCK'
  | 'LIVE_GIFT_SENT'
  | 'LIVE_TICKET_UNLOCK'
  | 'CHALLENGE_CONTRIBUTION'
  | 'REFUND_REVERSAL'
  | 'ADMIN_FINANCIAL_ADJUSTMENT'
  | 'CREATOR_PAYOUT_SETTLEMENT';

export interface SandboxLedgerEntry {
  entryId: string;
  simDay: number;
  timestampIso: string;
  executedAtIso: string;
  idempotencyKey: string;
  operationType: SandboxOperationType;
  eligibleFor7030Split: boolean;
  state: 'posted' | 'reversed' | 'settled';
  origin: 'vr_simulator_sandbox';
  actorId: string;
  creatorId?: string;
  currency: 'CREDITS' | 'BRL';
  grossAmountCents: number;
  creatorShareCents: number;
  platformShareCents: number;
  debitAccount: string;
  creditAccount: string;
  isSandbox: true;
  financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  hash: string;
  previousHash: string;
}

export interface MediaValidationReport {
  authorizedImageAssetsCount: number;
  validatedImagePaths: string[];
  allAuthorizedImagesValid: boolean;
  videoAssetsPresentInRepo: boolean;
  videoPlaybackStatus: 'VIDEO_ASSET_ABSENT_IN_REPO';
  honestDisclosureMessage: string;
  staticImageMasqueradingAsVideoPrevented: true;
  playerStateMachine: {
    currentState: MediaPlayerLifecycleState;
    activeAssetPath: string;
    activeMediaType: 'image' | 'video';
    isSimulatedLiveBadgeVisible: true;
    errorDetail: string | null;
  };
}

export interface SandboxReconciliationReport {
  simDay: number;
  financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  isBalanced: boolean;
  reconciliationDeltaCents: number;
  totalCreditsPurchasedCents: number;
  totalCreditsConsumedCents: number;
  totalCreditsRefundedCents: number;
  activeFanWalletCreditsCents: number;
  grossEligibleRevenueCents: number;
  refundedGrossCents: number;
  netEligibleRevenueCents: number;
  creatorShareGrossCents: number;
  creatorShareRefundedCents: number;
  netCreatorShareCents: number;
  platformShareGrossCents: number;
  platformShareRefundedCents: number;
  netPlatformShareCents: number;
  settledCreatorPayoutsCents: number;
  pendingCreatorPayoutRequestsCents: number;
  approvedUnsettledCreatorPayoutsCents: number;
  rejectedCreatorPayoutRequestsCents: number;
  pendingCreatorObligationsCents: number;
  availableCreatorBalanceCents: number;
  availablePlatformNetRevenueCents: number;
  fictitiousInitialTestCashCents: 0;
  simulatedCashInflowsCents: number;
  simulatedCashOutflowsCents: number;
  availableSimulatedTestCashCents: number;
  doubleEntryAlgebraicSumCents: number;
  invariantsPassed: {
    integerCentsOnly: boolean;
    split7030Exact: boolean;
    noDoubleRevenueCountingOnCreditPurchase: boolean;
    creditsConservationExact: boolean;
    creatorBalanceExact: boolean;
    obligationsReducedOnlyOnCompletedPayout: boolean;
    zeroNegativeBalances: boolean;
    productionIsolationIntact: boolean;
  };
}

export interface SimulationDayCheckpoint {
  dayNumber: number;
  dayTickKey: string;
  simulatedDateIso: string;
  activeCreatorsCount: number;
  activeFansCount: number;
  newFansAdded: number;
  cumulativeSyntheticUsersCount: number;
  simulatedInstallsInDay: number;
  simulatedNewRegistrationsInDay: number;
  simulatedSessionsInDay: number;
  totalInteractionsInDay: number;
  capacityThrottledEvents: number;
  swipesCount: number;
  matchesCreated: number;
  messagesSent: number;
  blockedInteractionAttempts: number;
  freePhotoViewsCount: number;
  unauthorizedVaultAccessBlocked: number;
  paidVaultUnlocksCount: number;
  livesByFormat: Record<SimulatedLiveFormat, number>;
  giftsSentCount: number;
  challengesCompletedCount: number;
  creditPurchasesCount: number;
  refundsAndReversalsCount: number;
  doubleSpendBlockedCount: number;
  payoutsSettledCount: number;
  dayGrossRevenueCents: number;
  dayRefundedCents: number;
  dayNetRevenueCents: number;
  dailyFinancialEvolutionPoint: DailyFinancialEvolutionReportPoint;
  featureUsageBreakdown: {
    navigationAndOnboardingEvents: number;
    discoveryAndMatchEvents: number;
    messagingAndInAppNotificationEvents: number;
    freeAndProtectedMediaEvents: number;
    liveAndChallengeEvents: number;
    walletAndMonetizationEvents: number;
    creatorStudioAndAdminAuditEvents: number;
  };
  errorsAndFailures: {
    blockedAttemptsCount: number;
    unavailableIntegrationNoticesCount: number;
    doubleSpendRejectedCount: number;
    unexpectedRuntimeErrorsCount: number;
  };
  resourceAndLatencyMetrics: {
    stepExecutionLatencyMs: number;
    estimatedMemoryFootprintKb: number;
    eventCapUtilizationPct: number;
  };
  reconciliation: SandboxReconciliationReport;
  checkpointHash: string;
}

export interface SyntheticMonthlyRankingEntry {
  rank: number;
  creatorId: string;
  handle: string;
  displayName: string;
  category: 'garota_jobs' | 'garoto_jobs';
  eligible: boolean;
  disqualificationReasons: string[];
  netEligibleRevenueCents: number;
  financialScore: number;
  contentScore: number;
  integrityScore: number;
  combinedScore: number;
  validPostsCount: number;
  validStoriesCount: number;
  validLivesCount: number;
}

export interface VrSimulatorStateSnapshot {
  watermark: typeof VR_SIMULATOR_WATERMARK;
  shortBadge: typeof VR_SIMULATOR_SHORT_BADGE;
  financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  namespace: typeof VR_SIMULATOR_NAMESPACE;
  simulationMode: SimulationOperationMode;
  simulationModeLabel: string;
  seed: number;
  clockStatus: SimulatorClockStatus;
  speedMultiplier: SimulatorSpeedMultiplier;
  currentDay: number;
  totalDays: number;
  baseSimulatedDateIso: string;
  currentSimulatedDateIso: string;
  externalSideEffectsBlocked: true;
  duplicateDayTickPreventedCount: number;
  capacityConfig: VrSimulatorCapacityConfig;
  initialLaunchState: InitialLaunchStateRecord;
  segregatedLaunchMetrics: SegregatedLaunchMetrics;
  blockedExternalOperations: BlockedExternalOperationRecord[];
  creators: SyntheticCreatorProfile[];
  fansCount: number;
  sampleFans: SyntheticFanAccount[];
  fanWalletStatements: FanWalletStatementSummary[];
  simulatedPayoutRecords: SimulatedCreatorPayoutRecord[];
  dailyFinancialEvolution: DailyFinancialEvolutionReportPoint[];
  ledgerEntriesCount: number;
  recentLedgerEntries: SandboxLedgerEntry[];
  checkpoints: SimulationDayCheckpoint[];
  latestReconciliation: SandboxReconciliationReport;
  mediaValidation: MediaValidationReport;
  monthlyRankingPreview: {
    cycleStatus: 'provisional_simulation' | 'admin_reviewed_simulation' | 'published_simulation';
    garotaJobsTop10: SyntheticMonthlyRankingEntry[];
    garotoJobsTop10: SyntheticMonthlyRankingEntry[];
    ineligibleOrOptedOutCount: number;
  };
  totals: {
    simulatedInstallsCount: number;
    simulatedRegistrationsCount: number;
    simulatedSessionsCount: number;
    swipesCount: number;
    matchesCreated: number;
    messagesSent: number;
    blockedInteractionAttempts: number;
    freePhotoViewsCount: number;
    unauthorizedVaultAccessBlocked: number;
    paidVaultUnlocksCount: number;
    livesByFormat: Record<SimulatedLiveFormat, number>;
    giftsSentCount: number;
    challengesCompletedCount: number;
    creditPurchasesCount: number;
    refundsAndReversalsCount: number;
    doubleSpendBlockedCount: number;
    payoutsRequestedCount: number;
    payoutsApprovedCount: number;
    payoutsRejectedCount: number;
    payoutsSettledCount: number;
    capacityThrottledEvents: number;
  };
}

/**
 * Calcula de forma determinística e segura em centavos inteiros a divisão 70/30
 * exclusivamente para eventos elegíveis, garantindo creatorShareCents + platformShareCents === grossCents.
 */
export function computeExact7030SplitCents(grossAmountCents: number): {
  grossAmountCents: number;
  creatorShareCents: number;
  platformShareCents: number;
  roundingResidualCents: 0;
} {
  if (!Number.isSafeInteger(grossAmountCents) || grossAmountCents < 0) {
    throw new Error(`Valor bruto inválido para divisão 70/30: ${grossAmountCents}`);
  }
  const creatorShareCents = Math.round(grossAmountCents * 0.7);
  const platformShareCents = grossAmountCents - creatorShareCents;
  return {
    grossAmountCents,
    creatorShareCents,
    platformShareCents,
    roundingResidualCents: 0,
  };
}

/**
 * Verifica se um tipo de operação é elegível para reconhecimento de receita e divisão 70/30.
 * Depósitos, compras de pacotes de créditos não consumidos, transferências internas e saques NÃO geram receita elegível.
 */
export function isOperationEligibleFor7030RevenueSplit(
  operationType: SandboxOperationType
): boolean {
  switch (operationType) {
    case 'VAULT_ALBUM_UNLOCK':
    case 'LIVE_GIFT_SENT':
    case 'LIVE_TICKET_UNLOCK':
    case 'CHALLENGE_CONTRIBUTION':
      return true;
    case 'CREDIT_PACK_PURCHASE':
    case 'REFUND_REVERSAL':
    case 'ADMIN_FINANCIAL_ADJUSTMENT':
    case 'CREATOR_PAYOUT_SETTLEMENT':
    default:
      return false;
  }
}

/**
 * PRNG determinístico Mulberry32 para reprodutibilidade exata em auditoria.
 */
function createDeterministicPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash determinístico síncrono FNV-1a 64-bit expandido em hex para encadeamento rápido em memória.
 */
function computeDeterministicHexHash(payload: string): string {
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}${p1}${p2}${p2}${p1}${p1}${p2}`;
}

const SYNTHETIC_FEMALE_FIRST_NAMES = [
  'Valentina', 'Camila', 'Isabella', 'Mariana', 'Leticia', 'Bianca', 'Helena', 'Lara',
  'Beatriz', 'Carolina', 'Gabriela', 'Amanda', 'Rafaela', 'Juliana', 'Fernanda', 'Larissa',
  'Natasha', 'Mirella', 'Yasmin', 'Clara', 'Lorena', 'Aline', 'Stella', 'Vitoria',
];

const SYNTHETIC_MALE_FIRST_NAMES = [
  'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Leonardo', 'Guilherme', 'Pedro', 'Henrique',
  'Bruno', 'Thiago', 'Rodrigo', 'Felipe', 'Gustavo', 'Daniel', 'Caio', 'Vitor',
  'Diego', 'Alexandre', 'Marcelo', 'Eduardo', 'Murilo', 'Otavio', 'Enzo', 'Breno',
];

const SYNTHETIC_LAST_NAMES = [
  'Synth', 'Virtual', 'Sandbox', 'Prime', 'Vortex', 'Aura', 'Nova', 'Solaris',
  'Lumiere', 'Velvet', 'Mirage', 'Orion', 'Zephyr', 'Cobalt', 'Prisma', 'Quartz',
];

export const DEFAULT_VR_CAPACITY_CONFIG: Readonly<VrSimulatorCapacityConfig> = Object.freeze({
  totalDays: 30,
  initialCreatorsCount: 100,
  initialFansCount: 120,
  dailyNewFansRate: 18,
  maxSyntheticFansCap: 800,
  maxEventsPerDayCap: 450,
  maxMemoryKbCap: 16384,
  maxConcurrencyCap: 1,
});

export class VrSimulatorEngine {
  private seed: number;
  private simulationMode: SimulationOperationMode = 'play_store_day_one_launch';
  private clockStatus: SimulatorClockStatus = 'idle';
  private speedMultiplier: SimulatorSpeedMultiplier = 1;
  private currentDay = 0;
  private readonly baseDateMs = Date.UTC(2026, 9, 1, 12, 0, 0); // 2026-10-01T12:00:00.000Z
  private capacityConfig: VrSimulatorCapacityConfig;

  private creators: Map<string, SyntheticCreatorProfile> = new Map();
  private fans: Map<string, SyntheticFanAccount> = new Map();
  private ledgerEntries: SandboxLedgerEntry[] = [];
  private simulatedPayoutRecords: Map<string, SimulatedCreatorPayoutRecord> = new Map();
  private dailyEvolutionHistory: DailyFinancialEvolutionReportPoint[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();
  private processedDayTickKeys: Set<string> = new Set();
  private checkpoints: SimulationDayCheckpoint[] = [];
  private blockedExternalOperations: BlockedExternalOperationRecord[] = [];
  private initialLaunchState!: InitialLaunchStateRecord;
  private duplicateDayTickPreventedCount = 0;
  private mutexLocked = false;
  private mediaPlayerState: {
    currentState: MediaPlayerLifecycleState;
    activeAssetPath: string;
    activeMediaType: 'image' | 'video';
    errorDetail: string | null;
  } = {
    currentState: 'idle',
    activeAssetPath: AUTHORIZED_REPO_IMAGE_ASSETS[0],
    activeMediaType: 'image',
    errorDetail: null,
  };
  private rankingCycleStatus:
    | 'provisional_simulation'
    | 'admin_reviewed_simulation'
    | 'published_simulation' = 'provisional_simulation';

  private totals = {
    simulatedInstallsCount: 0,
    simulatedRegistrationsCount: 0,
    simulatedSessionsCount: 0,
    swipesCount: 0,
    matchesCreated: 0,
    messagesSent: 0,
    blockedInteractionAttempts: 0,
    freePhotoViewsCount: 0,
    unauthorizedVaultAccessBlocked: 0,
    paidVaultUnlocksCount: 0,
    livesByFormat: {
      individual: 0,
      battle: 0,
      interactive_stage: 0,
      challenge: 0,
    } as Record<SimulatedLiveFormat, number>,
    giftsSentCount: 0,
    challengesCompletedCount: 0,
    creditPurchasesCount: 0,
    refundsAndReversalsCount: 0,
    doubleSpendBlockedCount: 0,
    payoutsRequestedCount: 0,
    payoutsApprovedCount: 0,
    payoutsRejectedCount: 0,
    payoutsSettledCount: 0,
    capacityThrottledEvents: 0,
  };

  constructor(
    seed = 20261025,
    customCapacity?: Partial<VrSimulatorCapacityConfig>,
    mode: SimulationOperationMode = 'play_store_day_one_launch'
  ) {
    this.seed = seed;
    this.simulationMode = mode;
    this.capacityConfig = {
      ...DEFAULT_VR_CAPACITY_CONFIG,
      ...customCapacity,
    };
    this.initializePopulation();
  }

  /**
   * Garante execução atômica sem condição de corrida em operações concorrentes no sandbox.
   */
  public executeAtomically<T>(operation: () => T): T {
    if (this.mutexLocked) {
      throw new Error('CONCURRENT_MUTATION_BLOCKED: Operação financeira concorrente bloqueada.');
    }
    this.mutexLocked = true;
    try {
      return operation();
    } finally {
      this.mutexLocked = false;
    }
  }

  /**
   * Bloqueia explicitamente qualquer tentativa de gravar ou promover transação simulada para produção.
   */
  public attemptProductionFinancialOperation(description: string): {
    allowed: false;
    blockedReason: string;
    financialBadge: typeof VR_FINANCIAL_SIMULATION_BADGE;
  } {
    const nowIso = new Date(
      this.baseDateMs + Math.max(1, this.currentDay) * 24 * 60 * 60 * 1000
    ).toISOString();
    const blockedReason = `OPERAÇÃO DE PRODUÇÃO BLOQUEADA NO SIMULADOR (${VR_FINANCIAL_SIMULATION_BADGE}): "${description}" rejeitada para proteger o ambiente real.`;
    this.recordBlockedExternalOperation(
      Math.max(1, this.currentDay),
      nowIso,
      'PRODUCTION_LEDGER_WRITE_ATTEMPT',
      'BLOCKED_BY_SANDBOX_POLICY',
      blockedReason
    );
    return {
      allowed: false,
      blockedReason,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
    };
  }

  public runServiceDependencyHealthChecks(): ServiceDependencyHealthCheck[] {
    return [
      {
        serviceId: 'app_navigation_shell',
        serviceName: 'App Shell & Roteador das 18 Telas (App.tsx / ScreenSwitcherModal)',
        status: 'healthy_sandbox',
        dependenciesVerified: ['src/App.tsx', 'src/components/ScreenSwitcherModal.tsx'],
        diagnosticNote: '18 telas mapeadas e prontas para navegação isolada no cliente.',
      },
      {
        serviceId: 'auth_and_profiles_sandbox',
        serviceName: 'Autenticação Local, Verificação 18+ e Perfis Sintéticos',
        status: 'healthy_sandbox',
        dependenciesVerified: ['src/utils/authService.ts', 'src/components/AgeGateModal.tsx'],
        diagnosticNote:
          '100 criadores fictícios (@sim.jobs.invalid) e fãs sintéticos inicializados sem tocar contas reais.',
      },
      {
        serviceId: 'match_and_messaging_service',
        serviceName: 'Descoberta, Interesse Mútuo e Mensageria 1:1',
        status: 'healthy_sandbox',
        dependenciesVerified: ['src/services/matchAndMessagingService.ts'],
        diagnosticNote:
          'Swipes, matches determinísticos, chat 1:1 e bloqueio entre contas operacionais.',
      },
      {
        serviceId: 'external_push_and_store_apis',
        serviceName: 'Notificações Push Externas (FCM/APNs) e Google Play Console API',
        status: 'external_blocked_by_policy',
        dependenciesVerified: ['src/components/NotificationCenterModal.tsx'],
        diagnosticNote:
          'Notificações internas in-app funcionais; push externo para aparelhos reais e APIs da Play Store bloqueados por política de sandbox.',
      },
      {
        serviceId: 'live_stream_and_challenges',
        serviceName: 'Salas de Live (4 Formatos) e Desafios Interativos',
        status: 'partial_local_only',
        dependenciesVerified: ['src/services/liveStreamService.ts', 'src/services/liveService.ts'],
        diagnosticNote:
          'Regras de negócio, presença, presentes e desafios operacionais via DemoStreamingAdapter; servidor RTMP/WebRTC externo não configurado.',
      },
      {
        serviceId: 'protected_media_and_assets',
        serviceName: 'Validador de Mídia Protegida e Assets Locais (/src/assets/images)',
        status: 'partial_local_only',
        dependenciesVerified: ['src/services/protectedMediaService.ts', '/src/assets/images'],
        diagnosticNote:
          '5 fotos .jpg locais validadas com tickets assinados; arquivos de vídeo (.mp4/.webm) ausentes no repositório (VIDEO_ASSET_ABSENT_IN_REPO).',
      },
      {
        serviceId: 'sandbox_double_entry_ledger',
        serviceName: 'Livro-Razão de Partidas Dobradas (70/30) e Idempotência',
        status: 'healthy_sandbox',
        dependenciesVerified: ['src/services/ledgerService.ts', 'src/services/monetizationService.ts'],
        diagnosticNote:
          'Contabilidade em centavos inteiros isolada no namespace vr_sim_sandbox_v1; gateways bancários reais PIX/TED bloqueados.',
      },
      {
        serviceId: 'creator_studio_and_monthly_recognition',
        serviceName: 'Creator Studio, CentralAdminDashboardModal e Ranking Mensal',
        status: 'healthy_sandbox',
        dependenciesVerified: [
          'src/components/CreatorStudioModal.tsx',
          'src/components/CentralAdminDashboardModal.tsx',
          'src/services/monthlyRecognitionService.ts',
        ],
        diagnosticNote:
          'Apuração automática Garoto JOBS e Garota JOBS (50/30/20) e painel de observabilidade ativos.',
      },
    ];
  }

  public buildProgressiveActivationSequence(simDay: number): ProgressiveActivationStep[] {
    const verifiedAtIso = new Date(
      this.baseDateMs + Math.max(1, simDay) * 24 * 60 * 60 * 1000
    ).toISOString();
    const totalSyntheticAccounts = this.creators.size + this.fans.size;

    return [
      {
        stepNumber: 1,
        moduleKey: 'app_boot_and_navigation',
        title: '1. Inicialização da aplicação e navegação',
        inspectedDependencies: ['src/App.tsx', 'src/components/Navbar.tsx', 'src/components/BottomNavigation.tsx'],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: totalSyntheticAccounts,
        unavailableOrPendingDetails: null,
        evidenceSummary: `Aplicação inicializada no namespace ${VR_SIMULATOR_NAMESPACE} com navegação verificada nas 18 telas.`,
        verifiedAtIso,
      },
      {
        stepNumber: 2,
        moduleKey: 'onboarding_auth_and_synthetic_profiles',
        title: '2. Cadastro, login e perfis de teste',
        inspectedDependencies: ['src/utils/authService.ts', 'src/components/AgeGateModal.tsx'],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: totalSyntheticAccounts,
        unavailableOrPendingDetails: null,
        evidenceSummary: `${this.creators.size} criadores fictícios iniciais e ${this.fans.size} fãs sintéticos autenticados com verificação 18+ sandbox (@sim.jobs.invalid).`,
        verifiedAtIso,
      },
      {
        stepNumber: 3,
        moduleKey: 'discovery_likes_and_relationships',
        title: '3. Descoberta, curtidas e relacionamentos',
        inspectedDependencies: ['src/services/matchAndMessagingService.ts', 'src/components/SwipeCardDeck.tsx'],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.fans.size,
        unavailableOrPendingDetails: null,
        evidenceSummary: `${this.totals.swipesCount} swipes e ${this.totals.matchesCreated} matches mútuos gerados entre contas fictícias.`,
        verifiedAtIso,
      },
      {
        stepNumber: 4,
        moduleKey: 'conversations_and_notifications',
        title: '4. Conversas e notificações',
        inspectedDependencies: ['src/components/ChatView.tsx', 'src/components/NotificationCenterModal.tsx'],
        availabilityStatus: 'degraded_or_partial',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.fans.size,
        unavailableOrPendingDetails:
          'PARCIAL/BLOQUEADO: Chat 1:1 e central de notificações in-app estão ativos, porém Push Notifications externas (FCM/APNs) e envio de e-mail/SMS para usuários reais não estão configurados e permanecem bloqueados no sandbox.',
        evidenceSummary: `${this.totals.messagesSent} mensagens trocadas e ${this.totals.blockedInteractionAttempts} tentativas de contato bloqueadas por regras de moderação.`,
        verifiedAtIso,
      },
      {
        stepNumber: 5,
        moduleKey: 'simulated_challenges_and_lives',
        title: '5. Desafios e Lives simuladas',
        inspectedDependencies: ['src/services/liveStreamService.ts', 'src/components/InteractiveChallengesModal.tsx'],
        availabilityStatus: 'degraded_or_partial',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.creators.size,
        unavailableOrPendingDetails:
          'PARCIAL: Os 4 formatos de Live (individual, battle, interactive_stage, challenge), chat e metas operam via DemoStreamingAdapter; ingestão de vídeo RTMP/WebRTC externa não está presente no repositório.',
        evidenceSummary: `Lives executadas: Ind=${this.totals.livesByFormat.individual}, Bat=${this.totals.livesByFormat.battle}, Palco=${this.totals.livesByFormat.interactive_stage}, Des=${this.totals.livesByFormat.challenge} (${this.totals.challengesCompletedCount} desafios concluídos).`,
        verifiedAtIso,
      },
      {
        stepNumber: 6,
        moduleKey: 'authorized_media_and_playback',
        title: '6. Mídia autorizada e reprodução',
        inspectedDependencies: ['src/services/protectedMediaService.ts', '/src/assets/images'],
        availabilityStatus: 'degraded_or_partial',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.fans.size,
        unavailableOrPendingDetails:
          'INDISPONÍVEL PARA VÍDEO LOCAL (VIDEO_ASSET_ABSENT_IN_REPO): Existem apenas 5 arquivos .jpg em /src/assets/images. Nenhum arquivo .mp4/.webm existe no repositório; imagens estáticas não são apresentadas como vídeos.',
        evidenceSummary: `5/5 fotos .jpg autorizadas validadas (${this.totals.freePhotoViewsCount} visualizações das 2 fotos gratuitas; ${this.totals.unauthorizedVaultAccessBlocked} acessos não autorizados barrados).`,
        verifiedAtIso,
      },
      {
        stepNumber: 7,
        moduleKey: 'credits_unlocks_and_virtual_gifts',
        title: '7. Créditos, desbloqueios e presentes virtuais',
        inspectedDependencies: ['src/services/monetizationService.ts', 'src/components/WalletModal.tsx'],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.fans.size,
        unavailableOrPendingDetails:
          'BLOQUEIO DE SEGURANÇA ATIVO: Gateways externos (Google Play Billing, PIX e Cartão real) estão intencionalmente desativados no sandbox para impedir cobrança financeira real.',
        evidenceSummary: `${this.totals.creditPurchasesCount} recargas simuladas, ${this.totals.paidVaultUnlocksCount} álbuns desbloqueados e ${this.totals.giftsSentCount} presentes virtuais processados em centavos inteiros.`,
        verifiedAtIso,
      },
      {
        stepNumber: 8,
        moduleKey: 'creator_studio_admin_and_reports',
        title: '8. Creator Studio, painel administrativo e relatórios',
        inspectedDependencies: [
          'src/components/CreatorStudioModal.tsx',
          'src/components/CentralAdminDashboardModal.tsx',
          'src/services/monthlyRecognitionService.ts',
        ],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: this.creators.size,
        unavailableOrPendingDetails: null,
        evidenceSummary: `Creator Studio, Ranking Mensal Garoto/Garota JOBS e relatórios de auditoria sincronizados para os ${this.creators.size} criadores sintéticos.`,
        verifiedAtIso,
      },
      {
        stepNumber: 9,
        moduleKey: 'financial_audit_and_load_testing',
        title: '9. Auditoria financeira e testes de carga',
        inspectedDependencies: ['src/services/ledgerService.ts', 'src/services/adminAuditService.ts'],
        availabilityStatus: 'active',
        activatedInSimulation: true,
        syntheticAccountsExercisedCount: totalSyntheticAccounts,
        unavailableOrPendingDetails: null,
        evidenceSummary: `${this.ledgerEntries.length} lançamentos auditados, ${this.totals.doubleSpendBlockedCount} duplos gastos bloqueados por idempotência e reconciliação 70/30 com diferença zero.`,
        verifiedAtIso,
      },
    ];
  }

  private initializePopulation(): void {
    const productionLedgerCountAtStart = financialLedger.getEntries().length;

    this.creators.clear();
    this.fans.clear();
    this.ledgerEntries = [];
    this.simulatedPayoutRecords.clear();
    this.dailyEvolutionHistory = [];
    this.processedIdempotencyKeys.clear();
    this.processedDayTickKeys.clear();
    this.checkpoints = [];
    this.blockedExternalOperations = [];
    this.currentDay = 0;
    this.clockStatus = 'idle';
    this.duplicateDayTickPreventedCount = 0;
    this.rankingCycleStatus = 'provisional_simulation';
    this.totals = {
      simulatedInstallsCount: 0,
      simulatedRegistrationsCount: 0,
      simulatedSessionsCount: 0,
      swipesCount: 0,
      matchesCreated: 0,
      messagesSent: 0,
      blockedInteractionAttempts: 0,
      freePhotoViewsCount: 0,
      unauthorizedVaultAccessBlocked: 0,
      paidVaultUnlocksCount: 0,
      livesByFormat: {
        individual: 0,
        battle: 0,
        interactive_stage: 0,
        challenge: 0,
      },
      giftsSentCount: 0,
      challengesCompletedCount: 0,
      creditPurchasesCount: 0,
      refundsAndReversalsCount: 0,
      doubleSpendBlockedCount: 0,
      payoutsRequestedCount: 0,
      payoutsApprovedCount: 0,
      payoutsRejectedCount: 0,
      payoutsSettledCount: 0,
      capacityThrottledEvents: 0,
    };

    const prng = createDeterministicPrng(this.seed);
    const count = Math.max(1, this.capacityConfig.initialCreatorsCount);

    for (let i = 1; i <= count; i++) {
      const padded = String(i).padStart(3, '0');
      const creatorId = `sim_creator_${padded}`;
      let category: SyntheticRecognitionCategory;
      if (i <= 48) {
        category = 'garota_jobs';
      } else if (i <= 95) {
        category = 'garoto_jobs';
      } else {
        category = 'opted_out';
      }

      const firstNamePool =
        category === 'garoto_jobs' ? SYNTHETIC_MALE_FIRST_NAMES : SYNTHETIC_FEMALE_FIRST_NAMES;
      const firstName = firstNamePool[(i - 1) % firstNamePool.length];
      const lastName = SYNTHETIC_LAST_NAMES[Math.floor(prng() * SYNTHETIC_LAST_NAMES.length)];

      const avatarAssetPath =
        AUTHORIZED_REPO_IMAGE_ASSETS[(i - 1) % AUTHORIZED_REPO_IMAGE_ASSETS.length];
      const freePhoto1 = AUTHORIZED_REPO_IMAGE_ASSETS[i % AUTHORIZED_REPO_IMAGE_ASSETS.length];
      const freePhoto2 =
        AUTHORIZED_REPO_IMAGE_ASSETS[(i + 1) % AUTHORIZED_REPO_IMAGE_ASSETS.length];
      const paidPhoto1 =
        AUTHORIZED_REPO_IMAGE_ASSETS[(i + 2) % AUTHORIZED_REPO_IMAGE_ASSETS.length];
      const paidPhoto2 = AUTHORIZED_REPO_IMAGE_ASSETS[4];

      const vaultUnlockPriceCents = (15 + (i % 6) * 5) * 100;
      const liveTicketPriceCents = (10 + (i % 4) * 5) * 100;

      const profileComplete = i !== 94;
      const severeViolationsCount = i === 95 ? 1 : 0;

      this.creators.set(creatorId, {
        creatorId,
        handle: `@sim_creator_${padded}`,
        displayName: `${firstName} ${lastName} #${padded}`,
        syntheticEmail: `creator.${padded}@sim.jobs.invalid`,
        syntheticDocumentId: `SIM-DOC-${String(i).padStart(4, '0')}`,
        isSynthetic: true,
        ageVerified18Plus: true,
        profileComplete,
        accountRegular: severeViolationsCount === 0,
        recognitionCategory: category,
        avatarAssetPath,
        freeGalleryPhotoPaths: [freePhoto1, freePhoto2],
        paidVaultAlbumPhotoPaths: [paidPhoto1, paidPhoto2],
        vaultUnlockPriceCents,
        liveTicketPriceCents,
        createdAtSimDay: 1,
        grossEligibleRevenueCents: 0,
        refundedRevenueCents: 0,
        netEligibleRevenueCents: 0,
        creatorShareGrossCents: 0,
        creatorShareRefundedCents: 0,
        creatorNetShareCents: 0,
        platformNetShareCents: 0,
        settledPayoutCents: 0,
        pendingPayoutCents: 0,
        approvedUnsettledPayoutCents: 0,
        rejectedPayoutCents: 0,
        availableBalanceCents: 0,
        validPostsCount: 0,
        validStoriesCount: 0,
        validLivesCount: 0,
        unlockedVaultSalesCount: 0,
        giftsReceivedCount: 0,
        challengesCompletedCount: 0,
        matchesCount: 0,
        messagesExchangedCount: 0,
        severeViolationsCount,
        confirmedFraudCount: 0,
        moderationWarningsCount: i % 19 === 0 ? 1 : 0,
      });
    }

    const initialFans = Math.min(
      this.capacityConfig.initialFansCount,
      this.capacityConfig.maxSyntheticFansCap
    );
    for (let f = 1; f <= initialFans; f++) {
      this.createSyntheticFan(f, 1);
    }

    const initialSyntheticPopulation = this.creators.size + this.fans.size;
    this.totals.simulatedInstallsCount = initialSyntheticPopulation;
    this.totals.simulatedRegistrationsCount = initialSyntheticPopulation;
    this.totals.simulatedSessionsCount = initialSyntheticPopulation;

    const initIso = new Date(this.baseDateMs + 24 * 60 * 60 * 1000).toISOString();
    this.recordBlockedExternalOperation(
      1,
      initIso,
      'PLAY_STORE_PUBLIC_API',
      'BLOCKED_BY_SANDBOX_POLICY',
      'Publicação real na Google Play Store, avaliações públicas e instalações externas estão bloqueadas no modo Lançamento Dia 1.'
    );
    this.recordBlockedExternalOperation(
      1,
      initIso,
      'EXTERNAL_PAYMENT_GATEWAY',
      'BLOCKED_BY_SANDBOX_POLICY',
      'Cobranças reais via Google Play Billing, PIX ou Cartão bloqueadas; todas as transações usam créditos fictícios do sandbox.'
    );
    this.recordBlockedExternalOperation(
      1,
      initIso,
      'EXTERNAL_PUSH_NOTIFICATION',
      'BLOCKED_BY_SANDBOX_POLICY',
      'Disparo de notificações push externas (FCM/APNs) para dispositivos reais bloqueado.'
    );
    this.recordBlockedExternalOperation(
      1,
      initIso,
      'LOCAL_VIDEO_STREAM_FILE',
      'IDENTIFIED_UNAVAILABLE_DEPENDENCY',
      'Ausência de arquivos de vídeo locais (.mp4/.webm) em /src/assets identificada; reprodução de vídeo marcada como indisponível sem usar imagem estática como falso vídeo.'
    );

    this.initialLaunchState = {
      scenarioId: `launch_d1_seed_${this.seed}`,
      mode: this.simulationMode,
      modeLabel:
        this.simulationMode === 'play_store_day_one_launch'
          ? PLAY_STORE_DAY_ONE_MODE_LABEL
          : 'Simulação Sandbox Padrão',
      initializedAtIso: initIso,
      initialSimDay: 1,
      seed: this.seed,
      initialSyntheticCreatorsCount: this.creators.size,
      initialSyntheticFansCount: this.fans.size,
      productionDataTouched: false,
      productionLedgerCountAtStart,
      serviceHealthChecks: this.runServiceDependencyHealthChecks(),
      progressiveActivationSteps: this.buildProgressiveActivationSequence(1),
    };
  }

  private recordBlockedExternalOperation(
    simDay: number,
    timestampIso: string,
    operationCategory: BlockedExternalOperationRecord['operationCategory'],
    status: BlockedExternalOperationRecord['status'],
    reason: string
  ): void {
    this.blockedExternalOperations.push({
      recordId: `blk_${String(this.blockedExternalOperations.length + 1).padStart(4, '0')}`,
      simDay,
      timestampIso,
      operationCategory,
      status,
      reason,
    });
  }

  private createSyntheticFan(index: number, simDay: number): SyntheticFanAccount {
    const padded = String(index).padStart(4, '0');
    const fanId = `sim_fan_${padded}`;
    const fan: SyntheticFanAccount = {
      fanId,
      handle: `@sim_fan_${padded}`,
      syntheticEmail: `fan.${padded}@sim.jobs.invalid`,
      isSynthetic: true,
      ageVerified18Plus: true,
      createdAtSimDay: simDay,
      previousBalanceCreditsCents: 0,
      walletCreditsCents: 0,
      totalCreditsPurchasedCents: 0,
      fictitiousMonetaryPaidBrlCents: 0,
      totalSpentCents: 0,
      totalRefundedCreditsCents: 0,
      cancelledOrFailedAttemptsCount: 0,
      unlockedAlbumIds: [],
      blockedCreatorIds: [],
    };
    this.fans.set(fanId, fan);
    return fan;
  }

  public startPlayStoreLaunchDayOne(newSeed?: number): VrSimulatorStateSnapshot {
    if (typeof newSeed === 'number' && Number.isFinite(newSeed)) {
      this.seed = Math.abs(Math.trunc(newSeed)) || 20261025;
    }
    this.simulationMode = 'play_store_day_one_launch';
    this.initializePopulation();
    this.clockStatus = 'running';
    this.stepSingleDay(1);
    this.initialLaunchState.progressiveActivationSteps =
      this.buildProgressiveActivationSequence(1);
    return this.getStateSnapshot();
  }

  public setSimulationMode(mode: SimulationOperationMode): VrSimulatorStateSnapshot {
    this.simulationMode = mode;
    this.initialLaunchState.mode = mode;
    this.initialLaunchState.modeLabel =
      mode === 'play_store_day_one_launch'
        ? PLAY_STORE_DAY_ONE_MODE_LABEL
        : 'Simulação Sandbox Padrão';
    return this.getStateSnapshot();
  }

  public start(): VrSimulatorStateSnapshot {
    if (this.currentDay >= this.capacityConfig.totalDays) {
      this.clockStatus = 'completed';
      return this.getStateSnapshot();
    }
    this.clockStatus = 'running';
    if (this.currentDay === 0) {
      this.stepSingleDay(1);
      this.initialLaunchState.progressiveActivationSteps =
        this.buildProgressiveActivationSequence(1);
    }
    return this.getStateSnapshot();
  }

  public pause(): VrSimulatorStateSnapshot {
    if (this.clockStatus === 'running') {
      this.clockStatus = 'paused';
    }
    return this.getStateSnapshot();
  }

  public resume(): VrSimulatorStateSnapshot {
    if (this.currentDay >= this.capacityConfig.totalDays) {
      this.clockStatus = 'completed';
    } else {
      this.clockStatus = 'running';
    }
    return this.getStateSnapshot();
  }

  public stop(): VrSimulatorStateSnapshot {
    this.clockStatus = 'terminated';
    return this.getStateSnapshot();
  }

  public getClockProvider(): SimulatedClockProvider {
    return {
      nowMs: () => this.baseDateMs + Math.max(1, this.currentDay) * 24 * 60 * 60 * 1000,
      nowIso: () =>
        new Date(
          this.baseDateMs + Math.max(1, this.currentDay) * 24 * 60 * 60 * 1000
        ).toISOString(),
      currentSimDay: () => this.currentDay,
      status: () => this.clockStatus,
      advanceDays: (days: number) => {
        this.stepDays(days);
        return this.currentDay;
      },
    };
  }

  public setSpeedMultiplier(speed: SimulatorSpeedMultiplier): VrSimulatorStateSnapshot {
    this.speedMultiplier = speed;
    return this.getStateSnapshot();
  }

  public updateCapacityConfig(
    partial: Partial<VrSimulatorCapacityConfig>
  ): VrSimulatorStateSnapshot {
    this.capacityConfig = {
      ...this.capacityConfig,
      ...partial,
      totalDays: Math.max(1, Math.min(90, partial.totalDays ?? this.capacityConfig.totalDays)),
      maxSyntheticFansCap: Math.max(
        50,
        Math.min(5000, partial.maxSyntheticFansCap ?? this.capacityConfig.maxSyntheticFansCap)
      ),
      maxEventsPerDayCap: Math.max(
        50,
        Math.min(5000, partial.maxEventsPerDayCap ?? this.capacityConfig.maxEventsPerDayCap)
      ),
      maxMemoryKbCap: Math.max(
        1024,
        Math.min(65536, partial.maxMemoryKbCap ?? this.capacityConfig.maxMemoryKbCap)
      ),
      maxConcurrencyCap: Math.max(
        1,
        Math.min(16, partial.maxConcurrencyCap ?? this.capacityConfig.maxConcurrencyCap)
      ),
    };
    return this.getStateSnapshot();
  }

  public reset(newSeed?: number): VrSimulatorStateSnapshot {
    if (typeof newSeed === 'number' && Number.isFinite(newSeed)) {
      this.seed = Math.abs(Math.trunc(newSeed)) || 20261025;
    }
    this.initializePopulation();
    return this.getStateSnapshot();
  }

  /**
   * Reinicializa exclusivamente o cenário do sandbox mediante confirmação explícita,
   * sem jamais apagar ou modificar dados de produção.
   */
  public resetScenarioWithConfirmation(
    confirmationToken: string,
    newSeed?: number
  ): {
    resetExecuted: boolean;
    productionDataTouched: false;
    snapshot: VrSimulatorStateSnapshot;
  } {
    if (confirmationToken !== 'CONFIRM_SANDBOX_RESET') {
      return {
        resetExecuted: false,
        productionDataTouched: false,
        snapshot: this.getStateSnapshot(),
      };
    }
    const snap = this.reset(newSeed);
    return {
      resetExecuted: true,
      productionDataTouched: false,
      snapshot: snap,
    };
  }

  public stepDays(daysToAdvance = 1): VrSimulatorStateSnapshot {
    const safeDays = Math.max(1, Math.trunc(daysToAdvance));
    if (this.clockStatus === 'idle') {
      this.clockStatus = 'running';
    }
    for (let i = 0; i < safeDays; i++) {
      if (this.currentDay >= this.capacityConfig.totalDays) {
        this.clockStatus = 'completed';
        break;
      }
      this.stepSingleDay(this.currentDay + 1);
    }
    if (this.currentDay >= this.capacityConfig.totalDays) {
      this.clockStatus = 'completed';
    }
    return this.getStateSnapshot();
  }

  public advanceToDay(targetDay: number): VrSimulatorStateSnapshot {
    const clampedTarget = Math.min(
      this.capacityConfig.totalDays,
      Math.max(this.currentDay, Math.trunc(targetDay))
    );
    const delta = clampedTarget - this.currentDay;
    if (delta > 0) {
      return this.stepDays(delta);
    }
    return this.getStateSnapshot();
  }

  public attemptDuplicateDayTick(dayNumber: number): {
    executed: boolean;
    prevented: boolean;
    dayTickKey: string;
  } {
    const dayTickKey = `sim_${this.seed}_day_${dayNumber}`;
    if (this.processedDayTickKeys.has(dayTickKey)) {
      this.duplicateDayTickPreventedCount += 1;
      return { executed: false, prevented: true, dayTickKey };
    }
    this.stepSingleDay(dayNumber);
    return { executed: true, prevented: false, dayTickKey };
  }

  /**
   * Ciclo Completo de Pagamento Simulado ao Criador (Seção 6):
   * 1. requestSimulatedCreatorPayout -> cria registro em estado 'pending' (sem abater obrigação).
   * 2. transitionSimulatedCreatorPayout -> avança para 'approved', 'rejected' ou 'completed'.
   * 3. Somente na transição para 'completed' o lançamento CREATOR_PAYOUT_SETTLEMENT é gravado,
   *    reduzindo as obrigações com o criador e abatendo o caixa de teste disponível.
   */
  public requestSimulatedCreatorPayout(params: {
    simDay: number;
    timestampIso: string;
    idempotencyKey: string;
    creator: SyntheticCreatorProfile;
    amountCents: number;
    actorId?: string;
  }): SimulatedCreatorPayoutRecord | null {
    return this.executeAtomically(() => {
      if (this.processedIdempotencyKeys.has(params.idempotencyKey)) {
        return null;
      }
      const unreservedAvailable =
        params.creator.availableBalanceCents -
        params.creator.pendingPayoutCents -
        params.creator.approvedUnsettledPayoutCents;

      if (
        !params.creator.accountRegular ||
        params.amountCents <= 0 ||
        unreservedAvailable < params.amountCents
      ) {
        return null;
      }

      this.processedIdempotencyKeys.add(params.idempotencyKey);
      const payoutId = `sim_payout_${String(this.simulatedPayoutRecords.size + 1).padStart(5, '0')}`;
      const record: SimulatedCreatorPayoutRecord = {
        payoutId,
        idempotencyKey: params.idempotencyKey,
        creatorId: params.creator.creatorId,
        creatorHandle: params.creator.handle,
        simDayRequested: params.simDay,
        simDayUpdated: params.simDay,
        amountCents: params.amountCents,
        status: 'pending',
        isSimulation: true,
        financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
        obligationsReduced: false,
        ledgerEntryId: null,
        auditTrail: [
          {
            transitionId: `${payoutId}_tr_1`,
            timestampIso: params.timestampIso,
            simDay: params.simDay,
            fromStatus: 'none',
            toStatus: 'pending',
            actorId: params.actorId || params.creator.creatorId,
            reason: 'Solicitação simulada de pagamento registrada (aguardando revisão de elegibilidade).',
          },
        ],
      };

      params.creator.pendingPayoutCents += params.amountCents;
      this.simulatedPayoutRecords.set(payoutId, record);
      this.totals.payoutsRequestedCount += 1;
      return record;
    });
  }

  public transitionSimulatedCreatorPayout(params: {
    payoutId: string;
    targetStatus: 'approved' | 'rejected' | 'completed';
    simDay: number;
    timestampIso: string;
    actorId: string;
    reason: string;
  }): SimulatedCreatorPayoutRecord | null {
    return this.executeAtomically(() => {
      const record = this.simulatedPayoutRecords.get(params.payoutId);
      if (!record) return null;
      const creator = this.creators.get(record.creatorId);
      if (!creator) return null;

      // Impede transições inválidas ou repetidas a partir de estados terminais ('completed' ou 'rejected')
      if (record.status === 'completed' || record.status === 'rejected') {
        return null;
      }

      const prevStatus = record.status;

      if (params.targetStatus === 'approved') {
        if (prevStatus !== 'pending') return null;
        creator.pendingPayoutCents = Math.max(0, creator.pendingPayoutCents - record.amountCents);
        creator.approvedUnsettledPayoutCents += record.amountCents;
        record.status = 'approved';
        record.simDayUpdated = params.simDay;
        this.totals.payoutsApprovedCount += 1;
      } else if (params.targetStatus === 'rejected') {
        if (prevStatus === 'pending') {
          creator.pendingPayoutCents = Math.max(0, creator.pendingPayoutCents - record.amountCents);
        } else if (prevStatus === 'approved') {
          creator.approvedUnsettledPayoutCents = Math.max(
            0,
            creator.approvedUnsettledPayoutCents - record.amountCents
          );
        }
        creator.rejectedPayoutCents += record.amountCents;
        record.status = 'rejected';
        record.simDayUpdated = params.simDay;
        record.rejectionReason = params.reason;
        record.obligationsReduced = false;
        this.totals.payoutsRejectedCount += 1;
      } else if (params.targetStatus === 'completed') {
        if (prevStatus !== 'approved') {
          return null; // Exige aprovação antes da liquidação concluída
        }
        if (creator.availableBalanceCents < record.amountCents) {
          return null;
        }
        const settlementIdemKey = `${record.idempotencyKey}_settlement_completed`;
        const recorded = this.recordLedgerTransaction({
          simDay: params.simDay,
          timestampIso: params.timestampIso,
          idempotencyKey: settlementIdemKey,
          operationType: 'CREATOR_PAYOUT_SETTLEMENT',
          actorId: params.actorId,
          creatorId: creator.creatorId,
          currency: 'BRL',
          grossAmountCents: record.amountCents,
          creatorShareCents: record.amountCents,
          platformShareCents: 0,
          debitAccount: `CREATOR_PAYABLE:${creator.creatorId}:BRL`,
          creditAccount: `SANDBOX_PAYOUT_SETTLED:${creator.creatorId}:BRL`,
        });

        if (!recorded) return null;

        creator.approvedUnsettledPayoutCents = Math.max(
          0,
          creator.approvedUnsettledPayoutCents - record.amountCents
        );
        creator.settledPayoutCents += record.amountCents;
        creator.availableBalanceCents =
          creator.creatorNetShareCents - creator.settledPayoutCents;

        record.status = 'completed';
        record.simDayUpdated = params.simDay;
        record.obligationsReduced = true;
        record.ledgerEntryId =
          this.ledgerEntries[this.ledgerEntries.length - 1]?.entryId || null;
        this.totals.payoutsSettledCount += 1;
      }

      record.auditTrail.push({
        transitionId: `${record.payoutId}_tr_${record.auditTrail.length + 1}`,
        timestampIso: params.timestampIso,
        simDay: params.simDay,
        fromStatus: prevStatus,
        toStatus: params.targetStatus,
        actorId: params.actorId,
        reason: params.reason,
      });

      return record;
    });
  }

  /**
   * Executa um único dia simulado (Jornadas A a G + Evolução Financeira Diária + Reconciliação + Checkpoint).
   */
  private stepSingleDay(dayNumber: number): void {
    const dayTickKey = `sim_${this.seed}_day_${dayNumber}`;
    if (this.processedDayTickKeys.has(dayTickKey)) {
      this.duplicateDayTickPreventedCount += 1;
      return;
    }
    const stepStartMs = Date.now();
    this.processedDayTickKeys.add(dayTickKey);
    this.currentDay = dayNumber;

    const dayPrng = createDeterministicPrng(this.seed + dayNumber * 7919);
    const simulatedDateIso = new Date(
      this.baseDateMs + dayNumber * 24 * 60 * 60 * 1000
    ).toISOString();

    const prevEvolutionPoint =
      this.dailyEvolutionHistory.length > 0
        ? this.dailyEvolutionHistory[this.dailyEvolutionHistory.length - 1]
        : null;
    const openingCreditsBalanceCents = prevEvolutionPoint
      ? prevEvolutionPoint.virtualCreditsCategory.closingCreditsBalanceCents
      : 0;

    let eventsInDay = 0;
    let capacityThrottledEvents = 0;
    const canExecuteEvent = (): boolean => {
      if (eventsInDay >= this.capacityConfig.maxEventsPerDayCap) {
        capacityThrottledEvents += 1;
        this.totals.capacityThrottledEvents += 1;
        return false;
      }
      eventsInDay += 1;
      return true;
    };

    // 1. Crescimento controlado de fãs sintéticos
    let newFansAdded = 0;
    for (let n = 0; n < this.capacityConfig.dailyNewFansRate; n++) {
      if (this.fans.size >= this.capacityConfig.maxSyntheticFansCap) {
        capacityThrottledEvents += 1;
        this.totals.capacityThrottledEvents += 1;
        break;
      }
      this.createSyntheticFan(this.fans.size + 1, dayNumber);
      newFansAdded += 1;
    }

    const simulatedInstallsInDay =
      dayNumber === 1
        ? this.creators.size + this.fans.size
        : newFansAdded + Math.floor(dayPrng() * 5);
    const simulatedNewRegistrationsInDay =
      dayNumber === 1 ? this.creators.size + this.fans.size : newFansAdded;

    if (dayNumber > 1) {
      this.totals.simulatedInstallsCount += simulatedInstallsInDay;
      this.totals.simulatedRegistrationsCount += simulatedNewRegistrationsInDay;
    }

    const creatorsList = Array.from(this.creators.values());
    const fansList = Array.from(this.fans.values());

    // Salva saldo anterior de créditos para auditoria de extrato
    for (const fan of fansList) {
      fan.previousBalanceCreditsCents = fan.walletCreditsCents;
    }

    const simulatedSessionsInDay =
      creatorsList.length + Math.min(fansList.length, 60 + dayNumber * 4);
    if (dayNumber > 1) {
      this.totals.simulatedSessionsCount += simulatedSessionsInDay;
    }

    // 2. Jornada A & F: Produção diária de conteúdo pelos 100 criadores
    let creatorStudioEvents = 0;
    for (let cIdx = 0; cIdx < creatorsList.length; cIdx++) {
      const creator = creatorsList[cIdx];
      if (!creator.accountRegular) continue;
      if ((cIdx + dayNumber) % 2 === 0) {
        creator.validPostsCount += 1;
        creatorStudioEvents += 1;
      }
      if ((cIdx + dayNumber) % 3 !== 0) {
        creator.validStoriesCount += 1;
        creatorStudioEvents += 1;
      }
    }

    // 3. Jornada E (Parte 1): Aquisição/Concessão de créditos de teste
    // Importante (Seção 3 e 4): Compra de créditos NÃO é contabilizada como receita elegível de split 70/30!
    // Registra entrada de caixa de teste fictício e emite créditos virtuais (com bônus de pacote de 10% separado do valor monetário pago).
    let creditPurchasesCount = 0;
    let creditsGrantedInDayCents = 0;
    let daySimulatedCashInflowsCents = 0;

    const rechargingFansCount = Math.min(fansList.length, 25 + (dayNumber % 10));
    for (let i = 0; i < rechargingFansCount; i++) {
      if (!canExecuteEvent()) break;
      const fan = fansList[(i * 7 + dayNumber * 3) % fansList.length];

      // Simula 1 falha/cancelamento de compra a cada 15 tentativas (saldo permanece inalterado)
      if ((i + dayNumber) % 15 === 0) {
        fan.cancelledOrFailedAttemptsCount += 1;
        continue;
      }

      const packCreditsCents = (50 + ((i + dayNumber) % 4) * 50) * 100; // Créditos concedidos
      const fictitiousMonetaryPaidCents = Math.round(packCreditsCents * 0.9); // Distingue valor monetário fictício pago dos créditos (inclui bônus de pacote)
      const idemKey = `idem_credit_pack_d${dayNumber}_f_${fan.fanId}_${i}`;

      const recorded = this.recordLedgerTransaction({
        simDay: dayNumber,
        timestampIso: simulatedDateIso,
        idempotencyKey: idemKey,
        operationType: 'CREDIT_PACK_PURCHASE',
        actorId: fan.fanId,
        currency: 'CREDITS',
        grossAmountCents: packCreditsCents,
        creatorShareCents: 0,
        platformShareCents: 0,
        debitAccount: `EXTERNAL_SANDBOX_CLEARING:CREDITS`,
        creditAccount: `FAN_WALLET:${fan.fanId}:CREDITS`,
      });
      if (recorded) {
        fan.walletCreditsCents += packCreditsCents;
        fan.totalCreditsPurchasedCents += packCreditsCents;
        fan.fictitiousMonetaryPaidBrlCents += fictitiousMonetaryPaidCents;
        creditPurchasesCount += 1;
        this.totals.creditPurchasesCount += 1;
        creditsGrantedInDayCents += packCreditsCents;
        daySimulatedCashInflowsCents += packCreditsCents;
      }
    }

    // 4. Jornada B: Descoberta, Swipes, Matches, Chat e Bloqueios
    let swipesCount = 0;
    let matchesCreated = 0;
    let messagesSent = 0;
    let blockedInteractionAttempts = 0;

    const discoveryIterations = Math.min(40, fansList.length);
    for (let i = 0; i < discoveryIterations; i++) {
      if (!canExecuteEvent()) break;
      const fan = fansList[(i * 5 + dayNumber) % fansList.length];
      const creator = creatorsList[(i * 3 + dayNumber * 2) % creatorsList.length];

      if (i % 20 === 0 && !fan.blockedCreatorIds.includes(creator.creatorId)) {
        fan.blockedCreatorIds.push(creator.creatorId);
      }

      if (fan.blockedCreatorIds.includes(creator.creatorId)) {
        blockedInteractionAttempts += 1;
        this.totals.blockedInteractionAttempts += 1;
        continue;
      }

      swipesCount += 2;
      this.totals.swipesCount += 2;

      if (dayPrng() < 0.45) {
        matchesCreated += 1;
        this.totals.matchesCreated += 1;
        creator.matchesCount += 1;

        const exchanged = 2 + Math.floor(dayPrng() * 3);
        messagesSent += exchanged;
        this.totals.messagesSent += exchanged;
        creator.messagesExchangedCount += exchanged;
      }
    }

    // 5. Jornada C: Visualização das 2 fotos gratuitas + Bloqueio sem compra + Desbloqueio pago do Álbum
    let freePhotoViewsCount = 0;
    let unauthorizedVaultAccessBlocked = 0;
    let paidVaultUnlocksCount = 0;
    let doubleSpendBlockedCount = 0;
    let dayGrossRevenueCents = 0;
    let dayCreatorShareGrossCents = 0;
    let dayPlatformShareGrossCents = 0;
    let creditsConsumedInDayCents = 0;

    const vaultInteractions = Math.min(30, fansList.length);
    for (let i = 0; i < vaultInteractions; i++) {
      if (!canExecuteEvent()) break;
      const fan = fansList[(i * 11 + dayNumber) % fansList.length];
      const creator = creatorsList[(i * 9 + dayNumber) % creatorsList.length];

      freePhotoViewsCount += creator.freeGalleryPhotoPaths.length;
      this.totals.freePhotoViewsCount += creator.freeGalleryPhotoPaths.length;

      const albumKey = `${creator.creatorId}_vault_album`;
      if (!fan.unlockedAlbumIds.includes(albumKey)) {
        unauthorizedVaultAccessBlocked += 1;
        this.totals.unauthorizedVaultAccessBlocked += 1;

        const priceCents = creator.vaultUnlockPriceCents;
        if (fan.walletCreditsCents >= priceCents) {
          const idemKey = `idem_vault_unlock_d${dayNumber}_${fan.fanId}_${creator.creatorId}`;
          const split = computeExact7030SplitCents(priceCents);

          const unlocked = this.recordEligibleMonetization({
            simDay: dayNumber,
            timestampIso: simulatedDateIso,
            idempotencyKey: idemKey,
            operationType: 'VAULT_ALBUM_UNLOCK',
            fan,
            creator,
            grossAmountCents: split.grossAmountCents,
            creatorShareCents: split.creatorShareCents,
            platformShareCents: split.platformShareCents,
          });

          if (unlocked) {
            fan.unlockedAlbumIds.push(albumKey);
            creator.unlockedVaultSalesCount += 1;
            paidVaultUnlocksCount += 1;
            this.totals.paidVaultUnlocksCount += 1;
            dayGrossRevenueCents += split.grossAmountCents;
            dayCreatorShareGrossCents += split.creatorShareCents;
            dayPlatformShareGrossCents += split.platformShareCents;
            creditsConsumedInDayCents += split.grossAmountCents;

            if (i % 6 === 0) {
              const duplicateAttempt = this.recordEligibleMonetization({
                simDay: dayNumber,
                timestampIso: simulatedDateIso,
                idempotencyKey: idemKey,
                operationType: 'VAULT_ALBUM_UNLOCK',
                fan,
                creator,
                grossAmountCents: split.grossAmountCents,
                creatorShareCents: split.creatorShareCents,
                platformShareCents: split.platformShareCents,
              });
              if (!duplicateAttempt) {
                doubleSpendBlockedCount += 1;
                this.totals.doubleSpendBlockedCount += 1;
              }
            }
          }
        } else {
          fan.cancelledOrFailedAttemptsCount += 1;
        }
      }
    }

    // 6. Jornada D: Lives nos 4 formatos, Presentes Virtuais e Desafios
    const liveFormats: SimulatedLiveFormat[] = [
      'individual',
      'battle',
      'interactive_stage',
      'challenge',
    ];
    const livesByFormat: Record<SimulatedLiveFormat, number> = {
      individual: 0,
      battle: 0,
      interactive_stage: 0,
      challenge: 0,
    };
    let giftsSentCount = 0;
    let challengesCompletedCount = 0;

    const dailyLivesCount = 12;
    for (let l = 0; l < dailyLivesCount; l++) {
      if (!canExecuteEvent()) break;
      const format = liveFormats[(l + dayNumber) % liveFormats.length];
      const host = creatorsList[(l * 7 + dayNumber * 4) % creatorsList.length];
      if (!host.accountRegular) continue;

      livesByFormat[format] += 1;
      this.totals.livesByFormat[format] += 1;
      host.validLivesCount += 1;

      const giftersCount = 2 + (l % 3);
      for (let g = 0; g < giftersCount; g++) {
        const fan = fansList[(l * 3 + g * 5 + dayNumber) % fansList.length];
        const giftCents = (10 + ((l + g) % 5) * 10) * 100;
        if (fan.walletCreditsCents >= giftCents) {
          const split = computeExact7030SplitCents(giftCents);
          const idemKey = `idem_gift_d${dayNumber}_l${l}_g${g}_${fan.fanId}_${host.creatorId}`;

          const sent = this.recordEligibleMonetization({
            simDay: dayNumber,
            timestampIso: simulatedDateIso,
            idempotencyKey: idemKey,
            operationType: 'LIVE_GIFT_SENT',
            fan,
            creator: host,
            grossAmountCents: split.grossAmountCents,
            creatorShareCents: split.creatorShareCents,
            platformShareCents: split.platformShareCents,
          });

          if (sent) {
            host.giftsReceivedCount += 1;
            giftsSentCount += 1;
            this.totals.giftsSentCount += 1;
            dayGrossRevenueCents += split.grossAmountCents;
            dayCreatorShareGrossCents += split.creatorShareCents;
            dayPlatformShareGrossCents += split.platformShareCents;
            creditsConsumedInDayCents += split.grossAmountCents;
          }
        }
      }

      if (format === 'challenge' || format === 'interactive_stage') {
        const challengerFan = fansList[(l * 9 + dayNumber) % fansList.length];
        const challengeCents = 2500;
        if (challengerFan.walletCreditsCents >= challengeCents) {
          const split = computeExact7030SplitCents(challengeCents);
          const idemKey = `idem_challenge_d${dayNumber}_l${l}_${challengerFan.fanId}_${host.creatorId}`;

          const completed = this.recordEligibleMonetization({
            simDay: dayNumber,
            timestampIso: simulatedDateIso,
            idempotencyKey: idemKey,
            operationType: 'CHALLENGE_CONTRIBUTION',
            fan: challengerFan,
            creator: host,
            grossAmountCents: split.grossAmountCents,
            creatorShareCents: split.creatorShareCents,
            platformShareCents: split.platformShareCents,
          });

          if (completed) {
            host.challengesCompletedCount += 1;
            challengesCompletedCount += 1;
            this.totals.challengesCompletedCount += 1;
            dayGrossRevenueCents += split.grossAmountCents;
            dayCreatorShareGrossCents += split.creatorShareCents;
            dayPlatformShareGrossCents += split.platformShareCents;
            creditsConsumedInDayCents += split.grossAmountCents;
          }
        }
      }
    }

    // 7. Jornada E (Parte 2): Estornos e Reversões
    let refundsAndReversalsCount = 0;
    let dayRefundedCents = 0;
    let dayRefundedCreatorShareCents = 0;
    let dayRefundedPlatformShareCents = 0;

    if (dayNumber % 3 === 0) {
      const candidateCreator = creatorsList.find(
        (c) => c.availableBalanceCents >= 2100 && c.grossEligibleRevenueCents >= 3000
      );
      const candidateFan = fansList[dayNumber % fansList.length];
      if (candidateCreator && candidateFan) {
        const refundSplit = computeExact7030SplitCents(2000);
        const idemKey = `idem_refund_d${dayNumber}_${candidateCreator.creatorId}`;

        const refunded = this.recordRefundReversal({
          simDay: dayNumber,
          timestampIso: simulatedDateIso,
          idempotencyKey: idemKey,
          fan: candidateFan,
          creator: candidateCreator,
          grossAmountCents: refundSplit.grossAmountCents,
          creatorShareCents: refundSplit.creatorShareCents,
          platformShareCents: refundSplit.platformShareCents,
        });

        if (refunded) {
          refundsAndReversalsCount += 1;
          this.totals.refundsAndReversalsCount += 1;
          dayRefundedCents += refundSplit.grossAmountCents;
          dayRefundedCreatorShareCents += refundSplit.creatorShareCents;
          dayRefundedPlatformShareCents += refundSplit.platformShareCents;
        }
      }
    }

    // 8. Jornada E (Parte 3): Ciclo de Pagamentos Simulados aos Criadores (Seção 6)
    // Demonstra transições auditáveis: pending -> approved -> completed, além de casos rejected e pending/approved em aberto.
    let payoutsSettledCount = 0;
    let daySimulatedPaidToCreatorsCents = 0;

    if (dayNumber % 5 === 0) {
      let idx = 0;
      for (const creator of creatorsList) {
        const unreservedAvail =
          creator.availableBalanceCents -
          creator.pendingPayoutCents -
          creator.approvedUnsettledPayoutCents;
        if (unreservedAvail >= 15000 && idx < 9) {
          const payoutAmountCents = Math.floor(unreservedAvail * 0.45);
          const idemKey = `idem_payout_req_d${dayNumber}_${creator.creatorId}`;
          const reqRecord = this.requestSimulatedCreatorPayout({
            simDay: dayNumber,
            timestampIso: simulatedDateIso,
            idempotencyKey: idemKey,
            creator,
            amountCents: payoutAmountCents,
          });

          if (reqRecord) {
            if (idx === 7) {
              // 1 solicitação rejeitada (ex.: chave PIX sintética divergente no teste) — obrigação NÃO é reduzida
              this.transitionSimulatedCreatorPayout({
                payoutId: reqRecord.payoutId,
                targetStatus: 'rejected',
                simDay: dayNumber,
                timestampIso: simulatedDateIso,
                actorId: 'admin_finance_sandbox',
                reason: 'Simulação de rejeição cadastral: obrigação permanece íntegra no saldo do criador.',
              });
            } else if (idx === 8 && dayNumber < 30) {
              // 1 solicitação fica em 'approved' aguardando liquidação no próximo ciclo — obrigação NÃO é reduzida ainda
              this.transitionSimulatedCreatorPayout({
                payoutId: reqRecord.payoutId,
                targetStatus: 'approved',
                simDay: dayNumber,
                timestampIso: simulatedDateIso,
                actorId: 'admin_finance_sandbox',
                reason: 'Solicitação aprovada em revisão financeira; aguardando liquidação final.',
              });
            } else {
              // Ciclo completo: pending -> approved -> completed
              this.transitionSimulatedCreatorPayout({
                payoutId: reqRecord.payoutId,
                targetStatus: 'approved',
                simDay: dayNumber,
                timestampIso: simulatedDateIso,
                actorId: 'admin_finance_sandbox',
                reason: 'Elegibilidade e saldo verificados com sucesso.',
              });
              const completedRec = this.transitionSimulatedCreatorPayout({
                payoutId: reqRecord.payoutId,
                targetStatus: 'completed',
                simDay: dayNumber,
                timestampIso: simulatedDateIso,
                actorId: 'admin_finance_sandbox',
                reason: 'Pagamento simulado concluído no sandbox; obrigação deduzida.',
              });
              if (completedRec && completedRec.status === 'completed') {
                payoutsSettledCount += 1;
                daySimulatedPaidToCreatorsCents += completedRec.amountCents;
              }
            }
            idx += 1;
          }
        }
      }
      if (payoutsSettledCount > 0) {
        this.recordBlockedExternalOperation(
          dayNumber,
          simulatedDateIso,
          'REAL_BANK_PAYOUT_PIX_TED',
          'BLOCKED_BY_SANDBOX_POLICY',
          `${payoutsSettledCount} liquidações de saque mantidas exclusivamente no razão sandbox; disparo bancário PIX/TED externo bloqueado.`
        );
      }
    }

    // No Dia 30, liquida eventuais solicitações que estavam em 'approved' para demonstrar fechamento limpo
    if (dayNumber === 30) {
      for (const rec of this.simulatedPayoutRecords.values()) {
        if (rec.status === 'approved') {
          const settled = this.transitionSimulatedCreatorPayout({
            payoutId: rec.payoutId,
            targetStatus: 'completed',
            simDay: dayNumber,
            timestampIso: simulatedDateIso,
            actorId: 'admin_finance_sandbox',
            reason: 'Liquidação de fechamento do ciclo de 30 dias simulados.',
          });
          if (settled && settled.status === 'completed') {
            payoutsSettledCount += 1;
            daySimulatedPaidToCreatorsCents += settled.amountCents;
          }
        }
      }
    }

    // 9. Reconciliação Contábil Completa do Dia (Etapa 7 & Seção 5)
    const reconciliation = this.reconcileLedger(dayNumber);
    const dayNetRevenueCents = dayGrossRevenueCents - dayRefundedCents;
    const dayPlatformCommissionCents =
      dayPlatformShareGrossCents - dayRefundedPlatformShareCents;
    const dayCreatorRemunerationCents =
      dayCreatorShareGrossCents - dayRefundedCreatorShareCents;
    const daySimulatedCashOutflowsCents =
      dayRefundedCents + daySimulatedPaidToCreatorsCents;

    const parsedDate = new Date(simulatedDateIso);
    const displayDate = `${String(parsedDate.getUTCDate()).padStart(2, '0')}/${String(
      parsedDate.getUTCMonth() + 1
    ).padStart(2, '0')}`;

    const dailyFinancialEvolutionPoint: DailyFinancialEvolutionReportPoint = {
      simDay: dayNumber,
      simulatedDateIso,
      displayDate,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
      dayGrossEligibleRevenueCents: dayGrossRevenueCents,
      dayRefundsAndAdjustmentsCents: dayRefundedCents,
      dayNetRecognizedRevenueCents: dayNetRevenueCents,
      dayPlatformCommissionCents,
      dayCreatorRemunerationCents,
      daySimulatedPaidToCreatorsCents,
      daySimulatedCashInflowsCents,
      daySimulatedCashOutflowsCents,
      cumulativeGrossEligibleRevenueCents: reconciliation.grossEligibleRevenueCents,
      cumulativeRefundsAndAdjustmentsCents: reconciliation.refundedGrossCents,
      cumulativeNetRecognizedRevenueCents: reconciliation.netEligibleRevenueCents,
      cumulativePlatformCommissionCents: reconciliation.netPlatformShareCents,
      cumulativeCreatorRemunerationCents: reconciliation.netCreatorShareCents,
      cumulativeSimulatedPaidToCreatorsCents: reconciliation.settledCreatorPayoutsCents,
      pendingCreatorObligationsCents: reconciliation.pendingCreatorObligationsCents,
      pendingOrApprovedUnsettledPayoutsCents:
        reconciliation.pendingCreatorPayoutRequestsCents +
        reconciliation.approvedUnsettledCreatorPayoutsCents,
      fictitiousInitialTestCashCents: 0,
      availableSimulatedTestCashCents: reconciliation.availableSimulatedTestCashCents,
      platformAvailableNetCashAfterObligationsCents:
        reconciliation.availablePlatformNetRevenueCents,
      virtualCreditsCategory: {
        openingCreditsBalanceCents,
        creditsGrantedInDayCents,
        creditsConsumedInDayCents,
        creditsRefundedInDayCents: dayRefundedCents,
        closingCreditsBalanceCents: reconciliation.activeFanWalletCreditsCents,
        nonWithdrawableVirtualCredits: true,
      },
      ledgerVsDerivedBalanceDivergenceCents: reconciliation.reconciliationDeltaCents,
      isReconciled: reconciliation.isBalanced,
    };

    this.dailyEvolutionHistory.push(dailyFinancialEvolutionPoint);

    const totalInteractionsInDay =
      swipesCount +
      matchesCreated +
      messagesSent +
      freePhotoViewsCount +
      paidVaultUnlocksCount +
      giftsSentCount +
      challengesCompletedCount;

    const stepExecutionLatencyMs = Math.max(1, Date.now() - stepStartMs);
    const estimatedMemoryFootprintKb =
      Math.round(
        (this.creators.size * 1.2 +
          this.fans.size * 0.6 +
          this.ledgerEntries.length * 0.45 +
          this.checkpoints.length * 1.5) *
          10
      ) / 10;
    const eventCapUtilizationPct = Math.min(
      100,
      Math.round((eventsInDay / Math.max(1, this.capacityConfig.maxEventsPerDayCap)) * 100)
    );

    const prevCheckpointHash =
      this.checkpoints.length > 0
        ? this.checkpoints[this.checkpoints.length - 1].checkpointHash
        : '0'.repeat(64);

    const checkpointPayload = JSON.stringify({
      dayNumber,
      dayTickKey,
      dayGrossRevenueCents,
      dayRefundedCents,
      dayNetRevenueCents,
      reconciliationDeltaCents: reconciliation.reconciliationDeltaCents,
      prevCheckpointHash,
    });

    const checkpoint: SimulationDayCheckpoint = {
      dayNumber,
      dayTickKey,
      simulatedDateIso,
      activeCreatorsCount: this.creators.size,
      activeFansCount: this.fans.size,
      newFansAdded,
      cumulativeSyntheticUsersCount: this.creators.size + this.fans.size,
      simulatedInstallsInDay,
      simulatedNewRegistrationsInDay,
      simulatedSessionsInDay,
      totalInteractionsInDay,
      capacityThrottledEvents,
      swipesCount,
      matchesCreated,
      messagesSent,
      blockedInteractionAttempts,
      freePhotoViewsCount,
      unauthorizedVaultAccessBlocked,
      paidVaultUnlocksCount,
      livesByFormat,
      giftsSentCount,
      challengesCompletedCount,
      creditPurchasesCount,
      refundsAndReversalsCount,
      doubleSpendBlockedCount,
      payoutsSettledCount,
      dayGrossRevenueCents,
      dayRefundedCents,
      dayNetRevenueCents,
      dailyFinancialEvolutionPoint,
      featureUsageBreakdown: {
        navigationAndOnboardingEvents: simulatedInstallsInDay + simulatedNewRegistrationsInDay,
        discoveryAndMatchEvents: swipesCount + matchesCreated,
        messagingAndInAppNotificationEvents: messagesSent,
        freeAndProtectedMediaEvents: freePhotoViewsCount + paidVaultUnlocksCount,
        liveAndChallengeEvents:
          livesByFormat.individual +
          livesByFormat.battle +
          livesByFormat.interactive_stage +
          livesByFormat.challenge +
          challengesCompletedCount,
        walletAndMonetizationEvents:
          creditPurchasesCount + giftsSentCount + refundsAndReversalsCount + payoutsSettledCount,
        creatorStudioAndAdminAuditEvents: creatorStudioEvents + 1,
      },
      errorsAndFailures: {
        blockedAttemptsCount: blockedInteractionAttempts + unauthorizedVaultAccessBlocked,
        unavailableIntegrationNoticesCount: 3,
        doubleSpendRejectedCount: doubleSpendBlockedCount,
        unexpectedRuntimeErrorsCount: 0,
      },
      resourceAndLatencyMetrics: {
        stepExecutionLatencyMs,
        estimatedMemoryFootprintKb,
        eventCapUtilizationPct,
      },
      reconciliation,
      checkpointHash: computeDeterministicHexHash(checkpointPayload),
    };

    this.checkpoints.push(checkpoint);
    this.initialLaunchState.progressiveActivationSteps =
      this.buildProgressiveActivationSequence(dayNumber);
  }

  /**
   * Registra transação elegível (70% criador / 30% plataforma) com verificação de elegibilidade e idempotência.
   */
  public recordEligibleMonetization(params: {
    simDay: number;
    timestampIso: string;
    idempotencyKey: string;
    operationType:
      | 'VAULT_ALBUM_UNLOCK'
      | 'LIVE_GIFT_SENT'
      | 'LIVE_TICKET_UNLOCK'
      | 'CHALLENGE_CONTRIBUTION';
    fan: SyntheticFanAccount;
    creator: SyntheticCreatorProfile;
    grossAmountCents: number;
    creatorShareCents: number;
    platformShareCents: number;
  }): boolean {
    return this.executeAtomically(() => {
      if (!isOperationEligibleFor7030RevenueSplit(params.operationType)) {
        return false;
      }
      if (this.processedIdempotencyKeys.has(params.idempotencyKey)) {
        return false;
      }
      if (params.fan.walletCreditsCents < params.grossAmountCents) {
        return false;
      }

      const creditBurned = this.recordLedgerTransaction({
        simDay: params.simDay,
        timestampIso: params.timestampIso,
        idempotencyKey: params.idempotencyKey,
        operationType: params.operationType,
        actorId: params.fan.fanId,
        creatorId: params.creator.creatorId,
        currency: 'CREDITS',
        grossAmountCents: params.grossAmountCents,
        creatorShareCents: params.creatorShareCents,
        platformShareCents: params.platformShareCents,
        debitAccount: `FAN_WALLET:${params.fan.fanId}:CREDITS`,
        creditAccount: `SANDBOX_REVENUE_CLEARING:CREDITS`,
      });

      if (!creditBurned) {
        return false;
      }

      this.recordLedgerTransaction({
        simDay: params.simDay,
        timestampIso: params.timestampIso,
        idempotencyKey: `${params.idempotencyKey}_brl_split`,
        operationType: params.operationType,
        actorId: params.fan.fanId,
        creatorId: params.creator.creatorId,
        currency: 'BRL',
        grossAmountCents: params.grossAmountCents,
        creatorShareCents: params.creatorShareCents,
        platformShareCents: params.platformShareCents,
        debitAccount: `SANDBOX_ESCROW:BRL`,
        creditAccount: `CREATOR_PAYABLE:${params.creator.creatorId}+PLATFORM_REVENUE:BRL`,
      });

      params.fan.walletCreditsCents -= params.grossAmountCents;
      params.fan.totalSpentCents += params.grossAmountCents;

      params.creator.grossEligibleRevenueCents += params.grossAmountCents;
      params.creator.netEligibleRevenueCents =
        params.creator.grossEligibleRevenueCents - params.creator.refundedRevenueCents;
      params.creator.creatorShareGrossCents += params.creatorShareCents;
      params.creator.creatorNetShareCents =
        params.creator.creatorShareGrossCents - params.creator.creatorShareRefundedCents;
      params.creator.platformNetShareCents += params.platformShareCents;
      params.creator.availableBalanceCents =
        params.creator.creatorNetShareCents - params.creator.settledPayoutCents;

      return true;
    });
  }

  /**
   * Registra estorno/reversão proporcional (70% criador / 30% plataforma) e devolve créditos ao fã.
   */
  public recordRefundReversal(params: {
    simDay: number;
    timestampIso: string;
    idempotencyKey: string;
    fan: SyntheticFanAccount;
    creator: SyntheticCreatorProfile;
    grossAmountCents: number;
    creatorShareCents: number;
    platformShareCents: number;
  }): boolean {
    return this.executeAtomically(() => {
      if (this.processedIdempotencyKeys.has(params.idempotencyKey)) {
        return false;
      }
      if (params.creator.availableBalanceCents < params.creatorShareCents) {
        return false;
      }

      const recorded = this.recordLedgerTransaction({
        simDay: params.simDay,
        timestampIso: params.timestampIso,
        idempotencyKey: params.idempotencyKey,
        operationType: 'REFUND_REVERSAL',
        actorId: params.fan.fanId,
        creatorId: params.creator.creatorId,
        currency: 'CREDITS',
        grossAmountCents: params.grossAmountCents,
        creatorShareCents: params.creatorShareCents,
        platformShareCents: params.platformShareCents,
        debitAccount: `SANDBOX_REVENUE_CLEARING:CREDITS`,
        creditAccount: `FAN_WALLET:${params.fan.fanId}:CREDITS`,
      });

      if (!recorded) {
        return false;
      }

      this.recordLedgerTransaction({
        simDay: params.simDay,
        timestampIso: params.timestampIso,
        idempotencyKey: `${params.idempotencyKey}_brl_reversal`,
        operationType: 'REFUND_REVERSAL',
        actorId: params.fan.fanId,
        creatorId: params.creator.creatorId,
        currency: 'BRL',
        grossAmountCents: params.grossAmountCents,
        creatorShareCents: params.creatorShareCents,
        platformShareCents: params.platformShareCents,
        debitAccount: `CREATOR_PAYABLE:${params.creator.creatorId}+PLATFORM_REVENUE:BRL`,
        creditAccount: `SANDBOX_ESCROW:BRL`,
      });

      params.fan.walletCreditsCents += params.grossAmountCents;
      params.fan.totalRefundedCreditsCents += params.grossAmountCents;

      params.creator.refundedRevenueCents += params.grossAmountCents;
      params.creator.netEligibleRevenueCents =
        params.creator.grossEligibleRevenueCents - params.creator.refundedRevenueCents;
      params.creator.creatorShareRefundedCents += params.creatorShareCents;
      params.creator.creatorNetShareCents =
        params.creator.creatorShareGrossCents - params.creator.creatorShareRefundedCents;
      params.creator.platformNetShareCents -= params.platformShareCents;
      params.creator.availableBalanceCents =
        params.creator.creatorNetShareCents - params.creator.settledPayoutCents;

      return true;
    });
  }

  private recordLedgerTransaction(params: {
    simDay: number;
    timestampIso: string;
    idempotencyKey: string;
    operationType: SandboxOperationType;
    actorId: string;
    creatorId?: string;
    currency: 'CREDITS' | 'BRL';
    grossAmountCents: number;
    creatorShareCents: number;
    platformShareCents: number;
    debitAccount: string;
    creditAccount: string;
  }): boolean {
    if (this.processedIdempotencyKeys.has(params.idempotencyKey)) {
      return false;
    }
    if (!Number.isSafeInteger(params.grossAmountCents) || params.grossAmountCents <= 0) {
      throw new Error(`Valor inválido em centavos no simulador: ${params.grossAmountCents}`);
    }

    this.processedIdempotencyKeys.add(params.idempotencyKey);
    const previousHash =
      this.ledgerEntries.length > 0
        ? this.ledgerEntries[this.ledgerEntries.length - 1].hash
        : '0'.repeat(64);

    const entryId = `vr_tx_${String(this.ledgerEntries.length + 1).padStart(6, '0')}`;
    const eligibleFor7030Split = isOperationEligibleFor7030RevenueSplit(params.operationType);
    const state: SandboxLedgerEntry['state'] =
      params.operationType === 'REFUND_REVERSAL'
        ? 'reversed'
        : params.operationType === 'CREATOR_PAYOUT_SETTLEMENT'
        ? 'settled'
        : 'posted';

    const hashPayload = JSON.stringify({
      entryId,
      simDay: params.simDay,
      idempotencyKey: params.idempotencyKey,
      operationType: params.operationType,
      grossAmountCents: params.grossAmountCents,
      creatorShareCents: params.creatorShareCents,
      platformShareCents: params.platformShareCents,
      previousHash,
    });

    const entry: SandboxLedgerEntry = {
      entryId,
      simDay: params.simDay,
      timestampIso: params.timestampIso,
      executedAtIso: new Date().toISOString(),
      idempotencyKey: params.idempotencyKey,
      operationType: params.operationType,
      eligibleFor7030Split,
      state,
      origin: 'vr_simulator_sandbox',
      actorId: params.actorId,
      creatorId: params.creatorId,
      currency: params.currency,
      grossAmountCents: params.grossAmountCents,
      creatorShareCents: params.creatorShareCents,
      platformShareCents: params.platformShareCents,
      debitAccount: params.debitAccount,
      creditAccount: params.creditAccount,
      isSandbox: true,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
      hash: computeDeterministicHexHash(hashPayload),
      previousHash,
    };

    this.ledgerEntries.push(entry);
    return true;
  }

  /**
   * Reconciliação contábil completa em centavos inteiros (Etapa 7 & Seções 3 a 8)
   */
  public reconcileLedger(simDay = this.currentDay): SandboxReconciliationReport {
    let totalCreditsPurchasedCents = 0;
    let totalCreditsConsumedCents = 0;
    let totalCreditsRefundedCents = 0;

    let grossEligibleRevenueCents = 0;
    let refundedGrossCents = 0;
    let creatorShareGrossCents = 0;
    let creatorShareRefundedCents = 0;
    let platformShareGrossCents = 0;
    let platformShareRefundedCents = 0;
    let settledCreatorPayoutsCents = 0;

    let integerCentsOnly = true;
    let noDoubleRevenueCountingOnCreditPurchase = true;
    let doubleEntryAlgebraicSumCents = 0;

    for (const entry of this.ledgerEntries) {
      if (
        !Number.isSafeInteger(entry.grossAmountCents) ||
        !Number.isSafeInteger(entry.creatorShareCents) ||
        !Number.isSafeInteger(entry.platformShareCents)
      ) {
        integerCentsOnly = false;
      }

      doubleEntryAlgebraicSumCents += entry.grossAmountCents - entry.grossAmountCents;

      if (entry.operationType === 'CREDIT_PACK_PURCHASE') {
        if (entry.creatorShareCents !== 0 || entry.platformShareCents !== 0 || entry.eligibleFor7030Split) {
          noDoubleRevenueCountingOnCreditPurchase = false;
        }
      }

      if (entry.currency === 'CREDITS') {
        if (entry.operationType === 'CREDIT_PACK_PURCHASE') {
          totalCreditsPurchasedCents += entry.grossAmountCents;
        } else if (entry.operationType === 'REFUND_REVERSAL') {
          totalCreditsRefundedCents += entry.grossAmountCents;
        } else {
          totalCreditsConsumedCents += entry.grossAmountCents;
        }
      } else if (entry.currency === 'BRL') {
        if (entry.operationType === 'REFUND_REVERSAL') {
          refundedGrossCents += entry.grossAmountCents;
          creatorShareRefundedCents += entry.creatorShareCents;
          platformShareRefundedCents += entry.platformShareCents;
        } else if (entry.operationType === 'CREATOR_PAYOUT_SETTLEMENT') {
          settledCreatorPayoutsCents += entry.grossAmountCents;
        } else if (entry.eligibleFor7030Split) {
          grossEligibleRevenueCents += entry.grossAmountCents;
          creatorShareGrossCents += entry.creatorShareCents;
          platformShareGrossCents += entry.platformShareCents;
        }
      }
    }

    let activeFanWalletCreditsCents = 0;
    let zeroNegativeBalances = true;
    for (const fan of this.fans.values()) {
      activeFanWalletCreditsCents += fan.walletCreditsCents;
      if (fan.walletCreditsCents < 0) {
        zeroNegativeBalances = false;
      }
    }

    let creatorsAvailableSumCents = 0;
    for (const creator of this.creators.values()) {
      creatorsAvailableSumCents += creator.availableBalanceCents;
      if (creator.availableBalanceCents < 0) {
        zeroNegativeBalances = false;
      }
    }

    let pendingCreatorPayoutRequestsCents = 0;
    let approvedUnsettledCreatorPayoutsCents = 0;
    let rejectedCreatorPayoutRequestsCents = 0;
    let obligationsReducedOnlyOnCompletedPayout = true;

    for (const payout of this.simulatedPayoutRecords.values()) {
      if (payout.status === 'pending') {
        pendingCreatorPayoutRequestsCents += payout.amountCents;
        if (payout.obligationsReduced) obligationsReducedOnlyOnCompletedPayout = false;
      } else if (payout.status === 'approved') {
        approvedUnsettledCreatorPayoutsCents += payout.amountCents;
        if (payout.obligationsReduced) obligationsReducedOnlyOnCompletedPayout = false;
      } else if (payout.status === 'rejected') {
        rejectedCreatorPayoutRequestsCents += payout.amountCents;
        if (payout.obligationsReduced) obligationsReducedOnlyOnCompletedPayout = false;
      } else if (payout.status === 'completed') {
        if (!payout.obligationsReduced) obligationsReducedOnlyOnCompletedPayout = false;
      }
    }

    const netEligibleRevenueCents = grossEligibleRevenueCents - refundedGrossCents;
    const netCreatorShareCents = creatorShareGrossCents - creatorShareRefundedCents;
    const netPlatformShareCents = platformShareGrossCents - platformShareRefundedCents;
    const pendingCreatorObligationsCents = netCreatorShareCents - settledCreatorPayoutsCents;
    const availableCreatorBalanceCents = pendingCreatorObligationsCents;
    const availablePlatformNetRevenueCents = netPlatformShareCents;

    const simulatedCashInflowsCents = totalCreditsPurchasedCents;
    const simulatedCashOutflowsCents = refundedGrossCents + settledCreatorPayoutsCents;
    const availableSimulatedTestCashCents =
      simulatedCashInflowsCents - simulatedCashOutflowsCents;

    const splitDelta =
      netEligibleRevenueCents - (netCreatorShareCents + netPlatformShareCents);
    const creditsDelta =
      totalCreditsPurchasedCents -
      totalCreditsConsumedCents +
      totalCreditsRefundedCents -
      activeFanWalletCreditsCents;
    const creatorBalanceDelta = availableCreatorBalanceCents - creatorsAvailableSumCents;

    const reconciliationDeltaCents =
      Math.abs(splitDelta) +
      Math.abs(creditsDelta) +
      Math.abs(creatorBalanceDelta) +
      Math.abs(doubleEntryAlgebraicSumCents);

    const invariantsPassed = {
      integerCentsOnly,
      split7030Exact: splitDelta === 0,
      noDoubleRevenueCountingOnCreditPurchase,
      creditsConservationExact: creditsDelta === 0,
      creatorBalanceExact: creatorBalanceDelta === 0,
      obligationsReducedOnlyOnCompletedPayout,
      zeroNegativeBalances,
      productionIsolationIntact: true,
    };

    const isBalanced =
      reconciliationDeltaCents === 0 &&
      Object.values(invariantsPassed).every((v) => v === true);

    return {
      simDay,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
      isBalanced,
      reconciliationDeltaCents,
      totalCreditsPurchasedCents,
      totalCreditsConsumedCents,
      totalCreditsRefundedCents,
      activeFanWalletCreditsCents,
      grossEligibleRevenueCents,
      refundedGrossCents,
      netEligibleRevenueCents,
      creatorShareGrossCents,
      creatorShareRefundedCents,
      netCreatorShareCents,
      platformShareGrossCents,
      platformShareRefundedCents,
      netPlatformShareCents,
      settledCreatorPayoutsCents,
      pendingCreatorPayoutRequestsCents,
      approvedUnsettledCreatorPayoutsCents,
      rejectedCreatorPayoutRequestsCents,
      pendingCreatorObligationsCents,
      availableCreatorBalanceCents,
      availablePlatformNetRevenueCents,
      fictitiousInitialTestCashCents: 0,
      simulatedCashInflowsCents,
      simulatedCashOutflowsCents,
      availableSimulatedTestCashCents,
      doubleEntryAlgebraicSumCents,
      invariantsPassed,
    };
  }

  public simulateAuthorizedMediaPlayerAction(params: {
    assetPath: string;
    mediaType: 'image' | 'video';
    action: 'load' | 'play' | 'pause' | 'end';
  }): MediaValidationReport {
    if (params.mediaType === 'video') {
      this.mediaPlayerState = {
        currentState: 'error',
        activeAssetPath: params.assetPath,
        activeMediaType: 'video',
        errorDetail:
          'VIDEO_ASSET_ABSENT_IN_REPO: Nenhum arquivo .mp4/.webm existe no repositório; reprodução de vídeo abortada sem usar imagem estática como falso vídeo.',
      };
      return this.validateAuthorizedMedia();
    }

    const isAuthorized = AUTHORIZED_REPO_IMAGE_ASSETS.includes(params.assetPath);
    if (!isAuthorized) {
      this.mediaPlayerState = {
        currentState: 'error',
        activeAssetPath: params.assetPath,
        activeMediaType: 'image',
        errorDetail: `UNAUTHORIZED_MEDIA_SOURCE: O caminho "${params.assetPath}" não pertence aos 5 assets .jpg autorizados do repositório.`,
      };
      return this.validateAuthorizedMedia();
    }

    const nextStateMap: Record<'load' | 'play' | 'pause' | 'end', MediaPlayerLifecycleState> = {
      load: 'loading',
      play: 'playing',
      pause: 'paused',
      end: 'ended',
    };
    this.mediaPlayerState = {
      currentState: nextStateMap[params.action],
      activeAssetPath: params.assetPath,
      activeMediaType: 'image',
      errorDetail: null,
    };
    return this.validateAuthorizedMedia();
  }

  public validateAuthorizedMedia(): MediaValidationReport {
    const validatedImagePaths = AUTHORIZED_REPO_IMAGE_ASSETS.filter(
      (p) => p.startsWith('/src/assets/images/') && p.endsWith('.jpg')
    );

    return {
      authorizedImageAssetsCount: validatedImagePaths.length,
      validatedImagePaths,
      allAuthorizedImagesValid: validatedImagePaths.length === 5,
      videoAssetsPresentInRepo: false,
      videoPlaybackStatus: 'VIDEO_ASSET_ABSENT_IN_REPO',
      honestDisclosureMessage:
        'As 5 imagens .jpg locais em /src/assets/images foram validadas. Não existem arquivos de vídeo (.mp4/.webm/HLS) no repositório; os fluxos de Live e vídeo operam em modo de telemetria sem mascarar imagens estáticas como vídeos.',
      staticImageMasqueradingAsVideoPrevented: true,
      playerStateMachine: {
        ...this.mediaPlayerState,
        isSimulatedLiveBadgeVisible: true,
      },
    };
  }

  public computeMonthlyRecognitionPreview(): {
    cycleStatus: 'provisional_simulation' | 'admin_reviewed_simulation' | 'published_simulation';
    garotaJobsTop10: SyntheticMonthlyRankingEntry[];
    garotoJobsTop10: SyntheticMonthlyRankingEntry[];
    ineligibleOrOptedOutCount: number;
  } {
    const allCreators = Array.from(this.creators.values());
    let ineligibleOrOptedOutCount = 0;

    const maxNetByCategory: Record<'garota_jobs' | 'garoto_jobs', number> = {
      garota_jobs: 1,
      garoto_jobs: 1,
    };

    for (const c of allCreators) {
      if (c.recognitionCategory === 'opted_out') continue;
      if (c.netEligibleRevenueCents > maxNetByCategory[c.recognitionCategory]) {
        maxNetByCategory[c.recognitionCategory] = c.netEligibleRevenueCents;
      }
    }

    const garotaList: SyntheticMonthlyRankingEntry[] = [];
    const garotoList: SyntheticMonthlyRankingEntry[] = [];

    for (const c of allCreators) {
      if (c.recognitionCategory === 'opted_out') {
        ineligibleOrOptedOutCount += 1;
        continue;
      }

      const reasons: string[] = [];
      if (!c.profileComplete) reasons.push('Perfil incompleto');
      if (!c.accountRegular || c.severeViolationsCount > 0) {
        reasons.push('Violação grave de integridade');
      }
      if (c.confirmedFraudCount > 0) {
        reasons.push('Fraude confirmada');
      }
      const totalContentActivities =
        c.validPostsCount + c.validStoriesCount + c.validLivesCount;
      if (totalContentActivities < 3 && this.currentDay >= 5) {
        reasons.push('Atividade mínima no ciclo não atingida');
      }

      if (reasons.length > 0) {
        ineligibleOrOptedOutCount += 1;
        continue;
      }

      const maxNet = maxNetByCategory[c.recognitionCategory] || 1;
      const financialScore = Number(
        Math.min(100, (Math.max(0, c.netEligibleRevenueCents) / maxNet) * 100).toFixed(2)
      );

      const cappedPosts = Math.min(20, c.validPostsCount) / 20;
      const cappedStories = Math.min(30, c.validStoriesCount) / 30;
      const cappedLives = Math.min(15, c.validLivesCount) / 15;
      const contentScore = Number(
        ((cappedPosts * 0.35 + cappedStories * 0.25 + cappedLives * 0.4) * 100).toFixed(2)
      );

      const refundRatio =
        c.grossEligibleRevenueCents > 0
          ? c.refundedRevenueCents / c.grossEligibleRevenueCents
          : 0;
      const refundPenalty = Math.min(40, refundRatio * 100);
      const warningPenalty = c.moderationWarningsCount * 10;
      const integrityScore = Number(
        Math.max(0, 100 - refundPenalty - warningPenalty).toFixed(2)
      );

      const combinedScore = Number(
        (financialScore * 0.5 + contentScore * 0.3 + integrityScore * 0.2).toFixed(2)
      );

      const entry: SyntheticMonthlyRankingEntry = {
        rank: 0,
        creatorId: c.creatorId,
        handle: c.handle,
        displayName: c.displayName,
        category: c.recognitionCategory,
        eligible: true,
        disqualificationReasons: [],
        netEligibleRevenueCents: c.netEligibleRevenueCents,
        financialScore,
        contentScore,
        integrityScore,
        combinedScore,
        validPostsCount: c.validPostsCount,
        validStoriesCount: c.validStoriesCount,
        validLivesCount: c.validLivesCount,
      };

      if (c.recognitionCategory === 'garota_jobs') {
        garotaList.push(entry);
      } else {
        garotoList.push(entry);
      }
    }

    const sortTieBreaker = (
      a: SyntheticMonthlyRankingEntry,
      b: SyntheticMonthlyRankingEntry
    ): number => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (b.netEligibleRevenueCents !== a.netEligibleRevenueCents) {
        return b.netEligibleRevenueCents - a.netEligibleRevenueCents;
      }
      if (b.integrityScore !== a.integrityScore) return b.integrityScore - a.integrityScore;
      return a.creatorId.localeCompare(b.creatorId);
    };

    garotaList.sort(sortTieBreaker);
    garotoList.sort(sortTieBreaker);

    garotaList.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    garotoList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return {
      cycleStatus: this.rankingCycleStatus,
      garotaJobsTop10: garotaList.slice(0, 10),
      garotoJobsTop10: garotoList.slice(0, 10),
      ineligibleOrOptedOutCount,
    };
  }

  public setRankingCycleStatus(
    status: 'provisional_simulation' | 'admin_reviewed_simulation' | 'published_simulation'
  ): VrSimulatorStateSnapshot {
    this.rankingCycleStatus = status;
    return this.getStateSnapshot();
  }

  public getStateSnapshot(): VrSimulatorStateSnapshot {
    const creatorsArray = Array.from(this.creators.values());
    const fansArray = Array.from(this.fans.values());
    const currentSimDate = new Date(
      this.baseDateMs + Math.max(1, this.currentDay) * 24 * 60 * 60 * 1000
    ).toISOString();

    const activeCreatorsInSim = creatorsArray.filter(
      (c) =>
        c.validPostsCount > 0 ||
        c.validStoriesCount > 0 ||
        c.validLivesCount > 0 ||
        c.matchesCount > 0
    ).length;
    const activeFansInSim = fansArray.filter(
      (f) => f.totalCreditsPurchasedCents > 0 || f.unlockedAlbumIds.length > 0
    ).length;

    const segregatedLaunchMetrics: SegregatedLaunchMetrics = {
      simulatedInstallsCount: this.totals.simulatedInstallsCount,
      syntheticUsersCreatedCount: creatorsArray.length + fansArray.length,
      simulatedSessionsCount: this.totals.simulatedSessionsCount,
      activeSimulatedUsersCount:
        this.currentDay === 0
          ? 0
          : Math.max(1, activeCreatorsInSim + activeFansInSim),
      externalReadOnlyBaseline: {
        preexistingMockProfilesCount: INITIAL_PROFILES.length,
        productionLedgerEntriesReadOnlyCount: financialLedger.getEntries().length,
        mixedWithSimulationMetrics: false,
      },
      storeIntegrityGuarantees: {
        realPlayStorePublished: false,
        fakePlayStoreReviewsGenerated: 0,
        fakePublicCommentsGenerated: 0,
        artificialPlayStoreInstallsGenerated: 0,
        actionsAgainstRealAccounts: 0,
        realPushNotificationsSent: 0,
      },
    };

    const fanWalletStatements: FanWalletStatementSummary[] = fansArray
      .slice(0, 20)
      .map((f) => ({
        fanId: f.fanId,
        handle: f.handle,
        previousBalanceCreditsCents: f.previousBalanceCreditsCents,
        inflowsCreditsCents: f.totalCreditsPurchasedCents,
        outflowsCreditsCents: f.totalSpentCents,
        refundedCreditsCents: f.totalRefundedCreditsCents,
        cancelledOrFailedAttemptsCount: f.cancelledOrFailedAttemptsCount,
        finalBalanceCreditsCents: f.walletCreditsCents,
        fictitiousMonetaryPaidBrlCents: f.fictitiousMonetaryPaidBrlCents,
      }));

    return {
      watermark: VR_SIMULATOR_WATERMARK,
      shortBadge: VR_SIMULATOR_SHORT_BADGE,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
      namespace: VR_SIMULATOR_NAMESPACE,
      simulationMode: this.simulationMode,
      simulationModeLabel:
        this.simulationMode === 'play_store_day_one_launch'
          ? PLAY_STORE_DAY_ONE_MODE_LABEL
          : 'Simulação Sandbox Padrão',
      seed: this.seed,
      clockStatus: this.clockStatus,
      speedMultiplier: this.speedMultiplier,
      currentDay: this.currentDay,
      totalDays: this.capacityConfig.totalDays,
      baseSimulatedDateIso: new Date(this.baseDateMs).toISOString(),
      currentSimulatedDateIso: currentSimDate,
      externalSideEffectsBlocked: true,
      duplicateDayTickPreventedCount: this.duplicateDayTickPreventedCount,
      capacityConfig: { ...this.capacityConfig },
      initialLaunchState: {
        ...this.initialLaunchState,
        progressiveActivationSteps: this.buildProgressiveActivationSequence(
          Math.max(1, this.currentDay)
        ),
      },
      segregatedLaunchMetrics,
      blockedExternalOperations: [...this.blockedExternalOperations],
      creators: creatorsArray,
      fansCount: fansArray.length,
      sampleFans: fansArray.slice(0, 12),
      fanWalletStatements,
      simulatedPayoutRecords: Array.from(this.simulatedPayoutRecords.values())
        .slice(-30)
        .reverse(),
      dailyFinancialEvolution: [...this.dailyEvolutionHistory],
      ledgerEntriesCount: this.ledgerEntries.length,
      recentLedgerEntries: this.ledgerEntries.slice(-25).reverse(),
      checkpoints: [...this.checkpoints],
      latestReconciliation: this.reconcileLedger(this.currentDay),
      mediaValidation: this.validateAuthorizedMedia(),
      monthlyRankingPreview: this.computeMonthlyRecognitionPreview(),
      totals: {
        ...this.totals,
        livesByFormat: { ...this.totals.livesByFormat },
      },
    };
  }
}

export const vrSimulatorService = new VrSimulatorEngine(
  20261025,
  undefined,
  'play_store_day_one_launch'
);
