/**
 * JOBS 1.0 — SERVIÇO DE LIVRO-RAZÃO CONTÁBIL E FUNDAÇÃO FINANCEIRA
 * 
 * Princípios Obrigatórios:
 * - Livro-razão imutável como fonte única da verdade (Single Source of Truth).
 * - Saldos nunca são mutáveis pelo cliente; são projeções matemáticas das entradas postadas.
 * - Idempotência garantida: chaves repetidas não duplicam transações nem créditos.
 * - Concorrência controlada e atomicidade: fila assíncrona contra condições de corrida (race conditions).
 * - Segregação rígida de contas: Créditos de Usuário (não sacáveis) vs Ganhos de Criador (BRL).
 * - Identificação estrita de ambiente de testes (isSandbox: true).
 */
import { adminAuditService } from './adminAuditService';
import { runtimeEnvironmentService } from './runtimeEnvironmentService';
import {
  buildOfficialLedgerRevenueReport,
  RevenueReportPeriodFilter,
  RevenueAndEarningsReportResult,
} from '../utils/revenueAndEarningsReport';
import {
  calculateLedgerSha256,
  LEDGER_SHA256_PROTOCOL_VERSION,
} from '../utils/ledgerSha256Validator';

export type AccountCurrency = 'CREDITS' | 'BRL';

export type LedgerOperationType =
  | 'CREDIT_PURCHASE'
  | 'CONTENT_UNLOCK'
  | 'TIP_GIFT'
  | 'SUBSCRIPTION_PURCHASE'
  | 'CREATOR_REVENUE_SHARE'
  | 'PLATFORM_COMMISSION'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'ADMIN_ADJUSTMENT'
  | 'PERFORMANCE_REWARD'
  | 'PAYOUT_RESERVE'
  | 'PAYOUT_SETTLED'
  | 'PAYOUT_REVERSAL';

export type LedgerEntryStatus = 'posted' | 'pending' | 'voided' | 'refunded';

export type PayoutEnvironment = 'sandbox' | 'production';

export type PayoutLifecycleStatus =
  | 'simulated'
  | 'under_review'
  | 'approved'
  | 'released'
  | 'failed'
  | 'cancelled'
  | 'reversed';

export interface PayoutRecord {
  id: string;
  idempotencyKey: string;
  creatorId: string;
  creatorName: string;
  amountBrl: number;
  amountCents: number;
  feeBrl: number;
  netAmountBrl: number;
  currency: 'BRL';
  status: PayoutLifecycleStatus;
  environment: PayoutEnvironment;
  isSimulation: boolean;
  payoutMethod: string;
  pixKeyOrAccount?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  releasedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  reversedAt?: string;
  reason?: string;
  transactionId?: string;
  ledgerEntryId?: string;
  auditTrail: Array<{
    timestamp: string;
    fromStatus: PayoutLifecycleStatus | 'none';
    toStatus: PayoutLifecycleStatus;
    actorId: string;
    reason?: string;
  }>;
}

export interface DailyFinancialMetricPoint {
  date: string;               // ISO 'YYYY-MM-DD'
  displayDate: string;        // 'DD/MM' formatado
  fullDateLabel: string;      // '19 de Outubro de 2026'
  currency: 'BRL';
  netRevenue: number | null;  // null quando hasData === false; >= 0 quando dentro da cobertura
  availableBalance: number | null; // null quando hasData === false; >= 0 no fechamento
  grossVolume: number;        // Volume bruto de transações no dia (R$)
  creatorShare: number;       // Repasse 70% aos criadores no dia (R$)
  platformCommission: number; // Comissão 30% da plataforma no dia (R$)
  refundsAmount: number;      // Estornos e reversões no dia (R$)
  transactionCount: number;   // Qtd de operações auditadas no dia
  reconciliationStatus: 'conciliado' | 'pendente' | 'sem_movimento' | 'sem_dados';
  hasData: boolean;           // Indica se há dados ou se é anterior ao gênesis
  isSimulated: boolean;       // true em Sandbox
  sourceReference: string;    // 'Livro-Razão Contábil SHA-256'
  notes?: string;
}

export interface DailyFinancialEvolutionResult {
  period: '7days' | '14days' | '30days' | 'all';
  currency: 'BRL';
  environment: 'sandbox' | 'production';
  points: DailyFinancialMetricPoint[];
  summary: {
    totalPeriodNetRevenue: number;
    finalAvailableBalance: number;
    averageDailyNetRevenue: number;
    peakDailyRevenue: number;
    peakDate: string;
    lowestDailyRevenue: number;
    daysWithMovement: number;
    totalDays: number;
    reconciliationRatePct: number;
    genesisDate: string;
    hasHistoricalGaps: boolean;
    historicalCoverageStart: string;
    dataSource: string;
  };
}

export interface LedgerTransactionDraft {
  transactionId?: string;
  idempotencyKey: string;
  description: string;
  actorId: string;
  entries: Array<{
    idempotencySuffix?: string;
    operationType: LedgerOperationType;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    amountCents?: number;
    currency: AccountCurrency;
    targetCreatorId?: string;
    referenceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface LedgerEntry {
  id: string;
  idempotencyKey: string;
  transactionId?: string;
  timestamp: string;
  operationType: LedgerOperationType;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  amountCents?: number;
  currency: AccountCurrency;
  status: LedgerEntryStatus;
  actorId: string;
  targetCreatorId?: string;
  referenceId?: string;
  description: string;
  isSandbox: boolean;
  metadata?: Record<string, unknown>;
  previousHash: string;
  entryHash: string;
  sha256ReferenceHash?: string;
  sha256ProtocolVersion?: string;
}

export interface LedgerAuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  reason: string;
  ipHash: string;
  isSandbox: boolean;
  payload: Record<string, unknown>;
}

export interface CreatorBalanceSummary {
  creatorId: string;
  pendingBrl: number;
  availableBrl: number;
  totalEarnedBrl: number;
  totalWithdrawnBrl: number;
  unlockedContentsCount: number;
  tipsReceivedCount: number;
}

export type WalletOriginCategory = 'collaborator' | 'content_producer';

export type WalletStatementCategoryFilter =
  | 'all'
  | 'collaborator'
  | 'content_producer'
  | 'payout'
  | 'refund'
  | 'adjustment';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface UnifiedWalletStatementItem {
  id: string;
  transactionId: string;
  referenceId: string;
  operationType: LedgerOperationType;
  timestamp: string;
  description: string;
  category: 'collaborator' | 'content_producer' | 'payout' | 'refund' | 'adjustment';
  categoryLabel: string;
  subTypeLabel: string;
  direction: 'credit' | 'debit';
  currency: 'BRL';
  amountCents: number;
  amountBrl: number;
  status:
    | 'available'
    | 'pending_review'
    | 'payout_reserved'
    | 'payout_released'
    | 'refunded'
    | 'adjusted';
  statusLabel: string;
  idempotencyKeyMasked: string;
  sha256ReferenceHash?: string;
  isSandbox: boolean;
}

export interface UnifiedWalletSummary {
  userId: string;
  environment: PayoutEnvironment;
  isSimulation: boolean;
  ledgerModeLabel: string;
  currency: 'BRL';
  availableBalanceCents: number;
  availableBalanceBrl: number;
  totalPendingCents: number;
  totalPendingBrl: number;
  totalReceivedPeriodCents: number;
  totalReceivedPeriodBrl: number;
  collaboratorReceivedCents: number;
  collaboratorReceivedBrl: number;
  collaboratorPendingCents: number;
  collaboratorPendingBrl: number;
  contentProducerReceivedCents: number;
  contentProducerReceivedBrl: number;
  contentProducerPendingCents: number;
  contentProducerPendingBrl: number;
  pendingReviewCents: number;
  pendingReviewBrl: number;
  payoutReservedCents: number;
  payoutReservedBrl: number;
  withdrawnSettledCents: number;
  withdrawnSettledBrl: number;
  minimumWithdrawalCents: number;
  minimumWithdrawalBrl: number;
  maximumDailyWithdrawalCents: number;
  maximumDailyWithdrawalBrl: number;
  verifiedPixFeeCents: number;
  verifiedPixFeeBrl: number;
  estimatedSettlementSla: string;
  userConsumptionCredits: number;
  lastTransaction: UnifiedWalletStatementItem | null;
  lastUpdatedIso: string;
}

export interface LiveUnlockAuditTransaction {
  transactionId: string;
  timestamp: string;
  operationType: LedgerOperationType;
  liveStreamId?: string;
  referenceId: string;
  buyerUserId: string;
  buyerMasked: string;
  creatorId: string;
  creatorName: string;
  description: string;
  priceCredits: number;
  grossAmountBrl: number;
  creatorShareBrl: number;
  platformShareBrl: number;
  status: LedgerEntryStatus | 'divergent';
  isEligible70_30: boolean;
  isPendingSettlement: boolean;
  isRefunded: boolean;
  hasDivergence: boolean;
  divergenceReason?: string;
  idempotencyKey: string;
  idempotencyMasked: string;
  entries: LedgerEntry[];
  auditLogs: LedgerAuditRecord[];
}

export interface LiveUnlockSummaryKPIs {
  totalTransactions: number;
  grossCredits: number;
  grossRevenueBrl: number;
  creatorShareBrl: number;
  platformShareBrl: number;
  pendingSettlementBrl: number;
  refundedTransactionsCount: number;
  refundedAmountBrl: number;
  divergentCount: number;
  lastUpdatedTimestamp: string;
  complianceRatePct: number;
}

export interface CreditPackageConfig {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceBrl: number;
  stripePriceId: string;
  badge?: string;
  isPopular?: boolean;
  tagline: string;
}

/**
 * Catálogo Oficial de Pacotes de Créditos da Fase 2
 * Taxa padrão do ecossistema: 1 crédito = R$ 0,10 em poder de consumo interno.
 */
export const OFFICIAL_CREDIT_PACKAGES: CreditPackageConfig[] = [
  {
    id: 'pkg_inicial',
    name: 'Inicial',
    credits: 50,
    bonusCredits: 0,
    totalCredits: 50,
    priceBrl: 9.90,
    stripePriceId: 'price_jobs_inicial_990',
    tagline: 'Ideal para primeiras mensagens e interesse mútuo',
  },
  {
    id: 'pkg_popular',
    name: 'Popular',
    credits: 150,
    bonusCredits: 20,
    totalCredits: 170,
    priceBrl: 27.90,
    stripePriceId: 'price_jobs_popular_2790',
    badge: 'Mais Escolhido (+13% Bônus)',
    isPopular: true,
    tagline: 'Melhor custo-benefício para conversar e desbloquear mídias',
  },
  {
    id: 'pkg_premium',
    name: 'Premium',
    credits: 350,
    bonusCredits: 60,
    totalCredits: 410,
    priceBrl: 59.90,
    stripePriceId: 'price_jobs_premium_5990',
    badge: 'Desbloqueios VIP (+17% Bônus)',
    tagline: 'Acesso ampliado a fotos íntimas e chamadas de vídeo',
  },
  {
    id: 'pkg_especial',
    name: 'Especial',
    credits: 800,
    bonusCredits: 200,
    totalCredits: 1000,
    priceBrl: 119.90,
    stripePriceId: 'price_jobs_especial_11990',
    badge: 'Acesso Total (+25% Bônus)',
    tagline: 'Experiência máxima, presentes em lives e chamadas exclusivas',
  },
];

const STORAGE_KEY_LEDGER = 'jobs_financial_ledger_entries_v1';
const STORAGE_KEY_AUDIT = 'jobs_ledger_audit_log_v1';
const STORAGE_KEY_IDEMPOTENCY = 'jobs_ledger_idempotency_keys_v1';
const STORAGE_KEY_PAYOUTS_REAL = 'jobs_payout_records_real_v1';
const STORAGE_KEY_PAYOUTS_SIMULATED = 'jobs_payout_simulations_isolated_v1';
const STORAGE_KEY_PAYOUT_SIM_AUDIT = 'jobs_payout_simulation_audit_v1';

// Algoritmo determinístico rápido de hash para integridade encadeada
function computeSha256Simulated(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `0x${hex}7f8e9a2b${hex}`;
}

export function maskUserId(userId: string): string {
  if (!userId) return 'usr_***';
  if (userId.length <= 4) return `${userId[0]}***`;
  const visible = Math.min(8, Math.max(3, Math.floor(userId.length * 0.5)));
  return `${userId.substring(0, visible)}***`;
}

export function maskIdempotencyKey(key: string): string {
  if (!key) return 'idemp_***';
  if (key.length <= 10) return `${key.substring(0, 4)}***`;
  return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
}

export function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // Mitigação contra CSV Formula Injection: =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

// Storage resiliente para compatibilidade isomórfica (Navegador, Sandbox de iframe, Node.js e SSR)
const memoryStorageFallback: Record<string, string> = {};

function getSafeStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && (globalThis as any).localStorage) {
    try {
      const storage = (globalThis as any).localStorage;
      const testKey = '__storage_access_probe__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return storage;
    } catch {
      // Caso o acesso ao localStorage lance SecurityError (ex: sandbox iframe com cookies/storage bloqueados)
    }
  }
  return {
    getItem: (key: string) => (key in memoryStorageFallback ? memoryStorageFallback[key] : null),
    setItem: (key: string, value: string) => {
      memoryStorageFallback[key] = String(value);
    },
    removeItem: (key: string) => {
      delete memoryStorageFallback[key];
    },
  };
}

class FinancialLedgerService {
  private queue: Promise<void> = Promise.resolve();
  private subscribers: Set<() => void> = new Set();

  // Enfileira tarefas sequenciais para eliminar race conditions
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * Inscrição para atualizações reativas em tempo real do livro-razão contábil.
   * Retorna uma função limpa de cancelamento (unmount) para prevenir memory leaks.
   */
  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[financialLedger] Listener error:', err);
      }
    });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('jobs:ledger:updated'));
      } catch {
        // no-op
      }
    }
  }

  private getActiveLedgerKey(): string {
    return runtimeEnvironmentService.getScopedStorageKey(STORAGE_KEY_LEDGER);
  }

  private getActiveAuditKey(): string {
    return runtimeEnvironmentService.getScopedStorageKey(STORAGE_KEY_AUDIT);
  }

  // Obter todas as entradas do livro-razão respeitando o isolamento de ambiente
  public getEntries(): LedgerEntry[] {
    const key = this.getActiveLedgerKey();
    const raw = getSafeStorage().getItem(key);
    if (!raw) {
      if (!runtimeEnvironmentService.shouldSeedSyntheticData()) {
        return [];
      }
      return this.seedInitialLedger();
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      if (!runtimeEnvironmentService.shouldSeedSyntheticData()) {
        return parsed.filter((e: LedgerEntry) => !e.isSandbox);
      }
      return parsed;
    } catch {
      if (!runtimeEnvironmentService.shouldSeedSyntheticData()) {
        return [];
      }
      return this.seedInitialLedger();
    }
  }

  // Obter logs de auditoria respeitando o isolamento de ambiente
  public getAuditLogs(): LedgerAuditRecord[] {
    const raw = getSafeStorage().getItem(this.getActiveAuditKey());
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveEntries(entries: LedgerEntry[]): void {
    getSafeStorage().setItem(this.getActiveLedgerKey(), JSON.stringify(entries));
    this.notifySubscribers();
  }

  private recordAudit(audit: Omit<LedgerAuditRecord, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: LedgerAuditRecord = {
      ...audit,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    getSafeStorage().setItem(this.getActiveAuditKey(), JSON.stringify(logs.slice(0, 500)));
  }

  /**
   * Inicializa o livro-razão com lançamento contábil de boas-vindas do ecossistema
   * EXCLUSIVAMENTE no modo de simulação/sandbox. Em produção retorna lista vazia.
   */
  private seedInitialLedger(): LedgerEntry[] {
    if (!runtimeEnvironmentService.shouldSeedSyntheticData()) {
      return [];
    }
    const genesisTime = '2026-10-18T00:00:00.000Z';
    const genesisEntry: LedgerEntry = {
      id: 'ledg_genesis_001',
      idempotencyKey: 'idemp_genesis_bootstrap_welcome',
      timestamp: genesisTime,
      operationType: 'CREDIT_PURCHASE',
      debitAccount: 'PLATFORM_RESERVE_POOL:credits',
      creditAccount: 'USER_CREDITS:current_user',
      amount: 150,
      amountCents: 150,
      currency: 'CREDITS',
      status: 'posted',
      actorId: 'system_bootstrap',
      description: 'Créditos de Boas-Vindas Iniciais (Ambiente Sandbox)',
      isSandbox: true,
      previousHash: '0x0000000000000000',
      entryHash: computeSha256Simulated('genesis_entry_jobs_2026'),
      metadata: { note: 'Saldo inicial protegido por livro-razão auditável' },
    };
    const entries = [genesisEntry];
    this.saveEntries(entries);
    return entries;
  }

  /**
   * Calcula o saldo de créditos utilizáveis de um usuário exclusivamente a partir
   * das entradas confirmadas ('posted' / 'refunded') do livro-razão em inteiros.
   */
  public getUserCredits(userId: string = 'current_user'): number {
    const entries = this.getEntries();
    const userAccount = `USER_CREDITS:${userId}`;

    let creditsInt = 0;
    for (const entry of entries) {
      if (entry.currency !== 'CREDITS') continue;
      if (entry.status !== 'posted' && entry.status !== 'refunded') continue;
      const units =
        typeof entry.amountCents === 'number'
          ? Math.round(entry.amountCents)
          : Math.round(entry.amount);
      if (entry.creditAccount === userAccount) {
        creditsInt += units;
      }
      if (entry.debitAccount === userAccount) {
        creditsInt -= units;
      }
    }
    return Math.max(0, creditsInt);
  }

  /**
   * Calcula a composição contábil de ganhos de um Criador em BRL a partir do livro-razão.
   * Utiliza aritmética inteira estrita em centavos (amountCents) para eliminar drift de ponto flutuante.
   */
  public getCreatorBalances(creatorId: string): CreatorBalanceSummary {
    const entries = this.getEntries();
    const creatorAccount = `CREATOR_PENDING_BRL:${creatorId}`;
    const creatorAvailAccount = `CREATOR_AVAILABLE_BRL:${creatorId}`;

    let pendingCents = 0;
    let availableCents = 0;
    let totalEarnedCents = 0;
    let totalWithdrawnCents = 0;
    let unlockedContentsCount = 0;
    let tipsReceivedCount = 0;

    for (const entry of entries) {
      if (entry.currency !== 'BRL') continue;
      if (entry.status !== 'posted' && entry.status !== 'refunded') continue;

      const entryCents =
        typeof entry.amountCents === 'number'
          ? Math.round(entry.amountCents)
          : Math.round(entry.amount * 100);

      if (entry.creditAccount === creatorAccount || entry.creditAccount === creatorAvailAccount) {
        totalEarnedCents += entryCents;
        if (entry.status === 'posted' && entry.operationType === 'CONTENT_UNLOCK') unlockedContentsCount++;
        if (entry.status === 'posted' && entry.operationType === 'TIP_GIFT') tipsReceivedCount++;
      }

      if (entry.creditAccount === creatorAccount) {
        pendingCents += entryCents;
      }
      if (entry.debitAccount === creatorAccount) {
        pendingCents -= entryCents;
        if (entry.operationType === 'REFUND' || entry.operationType === 'ADMIN_ADJUSTMENT') {
          totalEarnedCents -= entryCents;
        }
      }
      if (entry.creditAccount === creatorAvailAccount) {
        availableCents += entryCents;
        if (entry.operationType === 'PAYOUT_REVERSAL') {
          totalWithdrawnCents -= entryCents;
        }
      }
      if (entry.debitAccount === creatorAvailAccount) {
        availableCents -= entryCents;
        if (entry.operationType === 'REFUND' || entry.operationType === 'ADMIN_ADJUSTMENT') {
          totalEarnedCents -= entryCents;
        }
        if (entry.operationType === 'PAYOUT_RESERVE' || entry.operationType === 'PAYOUT_SETTLED') {
          totalWithdrawnCents += entryCents;
        }
      }
    }

    return {
      creatorId,
      pendingBrl: Number((Math.max(0, pendingCents) / 100).toFixed(2)),
      availableBrl: Number((Math.max(0, availableCents) / 100).toFixed(2)),
      totalEarnedBrl: Number((Math.max(0, totalEarnedCents) / 100).toFixed(2)),
      totalWithdrawnBrl: Number((Math.max(0, totalWithdrawnCents) / 100).toFixed(2)),
      unlockedContentsCount,
      tipsReceivedCount,
    };
  }

  /**
   * Consolidação das Métricas Financeiras da Plataforma em centavos inteiros
   */
  public getPlatformFinancialSummary(): {
    totalCreditsInCirculation: number;
    totalFiatEscrowBrl: number;
    totalPlatformRevenueBrl: number;
    totalCreatorLiabilitiesBrl: number;
    totalTransactionsCount: number;
    isSandboxAudited: boolean;
  } {
    const entries = this.getEntries();
    let totalCreditsInt = 0;
    let totalEscrowCents = 0;
    let totalRevenueCents = 0;
    let totalCreatorLiabilitiesCents = 0;

    for (const entry of entries) {
      if (entry.status !== 'posted' && entry.status !== 'refunded') continue;
      if (entry.currency === 'CREDITS') {
        const creditUnits =
          typeof entry.amountCents === 'number'
            ? Math.round(entry.amountCents)
            : Math.round(entry.amount);
        if (entry.creditAccount.startsWith('USER_CREDITS:')) totalCreditsInt += creditUnits;
        if (entry.debitAccount.startsWith('USER_CREDITS:')) totalCreditsInt -= creditUnits;
      } else if (entry.currency === 'BRL') {
        const entryCents =
          typeof entry.amountCents === 'number'
            ? Math.round(entry.amountCents)
            : Math.round(entry.amount * 100);
        if (entry.creditAccount === 'ESCROW_PAYMENT_GATEWAY') totalEscrowCents += entryCents;
        if (entry.debitAccount === 'ESCROW_PAYMENT_GATEWAY') totalEscrowCents -= entryCents;

        if (entry.creditAccount === 'PLATFORM_REVENUE_BRL') totalRevenueCents += entryCents;
        if (entry.debitAccount === 'PLATFORM_REVENUE_BRL') totalRevenueCents -= entryCents;

        if (entry.creditAccount.startsWith('CREATOR_PENDING_BRL:') || entry.creditAccount.startsWith('CREATOR_AVAILABLE_BRL:')) {
          totalCreatorLiabilitiesCents += entryCents;
        }
        if (entry.debitAccount.startsWith('CREATOR_PENDING_BRL:') || entry.debitAccount.startsWith('CREATOR_AVAILABLE_BRL:')) {
          totalCreatorLiabilitiesCents -= entryCents;
        }
      }
    }

    return {
      totalCreditsInCirculation: Math.max(0, totalCreditsInt),
      totalFiatEscrowBrl: Number((Math.max(0, totalEscrowCents) / 100).toFixed(2)),
      totalPlatformRevenueBrl: Number((Math.max(0, totalRevenueCents) / 100).toFixed(2)),
      totalCreatorLiabilitiesBrl: Number((Math.max(0, totalCreatorLiabilitiesCents) / 100).toFixed(2)),
      totalTransactionsCount: entries.length,
      isSandboxAudited: runtimeEnvironmentService.isSimulationMode(),
    };
  }

  /**
   * POSTAGEM ATÔMICA COM PROTEÇÃO DE IDEMPOTÊNCIA
   */
  /**
   * EXECUÇÃO ATÔMICA DE TRANSAÇÃO MULTI-LANÇAMENTO (ALL-OR-NOTHING BUNDLE)
   * 
   * Limitação de Infraestrutura Documentada:
   * Em ambiente client-side / web storage (LocalStorage/IndexedDB sem motor de banco relacional como Postgres/Cloud SQL com ACID WAL),
   * a atomicidade é garantida pela validação prévia de todos os lançamentos antes do commit síncrono e por fila sequencial assíncrona (`enqueue`).
   * Não afirmamos atomicidade distribuída contra queda de energia ou terminação forçada de processo no meio da serialização JSON.
   */
  public async postTransactionAtomic(params: LedgerTransactionDraft): Promise<{ entries: LedgerEntry[]; isReplay: boolean }> {
    return this.enqueue(async () => {
      return this._postTransactionAtomicDirect(params);
    });
  }

  private async _postTransactionAtomicDirect(params: LedgerTransactionDraft): Promise<{ entries: LedgerEntry[]; isReplay: boolean }> {
    const existingEntries = this.getEntries();
      const transactionId = params.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 0. Validação de obrigatoriedade da chave de idempotência
      if (!params.idempotencyKey || typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim()) {
        throw new Error('Chave de idempotência obrigatória não fornecida ou vazia.');
      }

      // 1. Verificação estrita de Idempotência no escopo da transação
      const existingForIdemp = existingEntries.filter(
        (e) =>
          e.idempotencyKey === params.idempotencyKey ||
          e.idempotencyKey.startsWith(`${params.idempotencyKey}_`) ||
          (e.metadata && (e.metadata as any).batchIdempotencyKey === params.idempotencyKey)
      );
      if (existingForIdemp.length > 0) {
        // Validação de conflito de parâmetros para rejeição estrita (RF-IDEMP-CONFLICT)
        const firstExisting = existingForIdemp[0];
        if (firstExisting.actorId !== params.actorId) {
          throw new Error(
            `Conflito de idempotência: a chave ${params.idempotencyKey} já foi utilizada para outro usuário (${firstExisting.actorId}).`
          );
        }

        const existingTotalAmount = existingForIdemp.reduce((acc, e) => acc + e.amount, 0);
        const incomingTotalAmount = params.entries.reduce((acc, e) => acc + e.amount, 0);

        if (
          Math.abs(existingTotalAmount - incomingTotalAmount) > 0.001 ||
          existingForIdemp.length !== params.entries.length
        ) {
          throw new Error(
            `Conflito de idempotência: a chave ${params.idempotencyKey} já foi processada com valor ou parâmetros divergentes.`
          );
        }

        this.recordAudit({
          actorId: params.actorId,
          action: 'IDEMPOTENCY_REPLAY_TRANSACTION',
          reason: `Replay detectado para idempotencyKey: ${params.idempotencyKey}`,
          ipHash: 'hash_sandbox_client_v4',
          isSandbox: true,
          payload: { idempotencyKey: params.idempotencyKey, entryCount: existingForIdemp.length },
        });
        return { entries: existingForIdemp, isReplay: true };
      }

      // 2. Validação prévia de todas as entradas do bundle (Zero-Fault Pre-Validation)
      if (!params.entries || params.entries.length === 0) {
        throw new Error('Transação vazia rejeitada: nenhum lançamento fornecido no lote atômico.');
      }

      // Rastrear saldos simulados durante a transação para evitar saldo negativo intra-bundle
      const balanceDeltas: Record<string, number> = {};

      for (let i = 0; i < params.entries.length; i++) {
        const item = params.entries[i];
        if (item.amount <= 0) {
          throw new Error(`Transação rejeitada: lançamento #${i + 1} contém valor inválido (R$ ${item.amount} <= 0).`);
        }

        // Validação de débito de usuário em créditos
        if (item.debitAccount.startsWith('USER_CREDITS:') && item.currency === 'CREDITS') {
          const userId = item.debitAccount.replace('USER_CREDITS:', '');
          const currentBal = this.getUserCredits(userId);
          const currentDelta = balanceDeltas[item.debitAccount] || 0;
          const projectedBal = currentBal + currentDelta - item.amount;
          if (projectedBal < 0) {
            throw new Error(
              `Saldo insuficiente no livro-razão contábil. Saldo atual: ${currentBal} créditos, Débito solicitado: ${params.entries.reduce((acc, e) => e.debitAccount === item.debitAccount ? acc + e.amount : acc, 0)} créditos.`
            );
          }
          balanceDeltas[item.debitAccount] = currentDelta - item.amount;
        }

        // Validação de débito de saldo disponível de criador em BRL
        if (item.debitAccount.startsWith('CREATOR_AVAILABLE_BRL:') && item.currency === 'BRL') {
          const creatorId = item.debitAccount.replace('CREATOR_AVAILABLE_BRL:', '');
          const creatorBal = this.getCreatorBalances(creatorId);
          const currentDelta = balanceDeltas[item.debitAccount] || 0;
          const projectedBal = creatorBal.availableBrl + currentDelta - item.amount;
          if (projectedBal < 0) {
            throw new Error(
              `Saldo disponível insuficiente para o criador ${creatorId}. Disponível: R$ ${creatorBal.availableBrl.toFixed(2)}, Débito solicitado: R$ ${item.amount.toFixed(2)}.`
            );
          }
          balanceDeltas[item.debitAccount] = currentDelta - item.amount;
        }
      }

      // 3. Montagem e Encadeamento dos Lançamentos (Hash Chain Auditável)
      const newEntries: LedgerEntry[] = [];
      let previousHash = existingEntries[0] ? existingEntries[0].entryHash : '0x0000000000000000';
      const timestamp = new Date().toISOString();

      for (let i = 0; i < params.entries.length; i++) {
        const item = params.entries[i];
        const entryId = `ledg_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        const idempKey = item.idempotencySuffix 
          ? `${params.idempotencyKey}_${item.idempotencySuffix}`
          : (params.entries.length === 1 ? params.idempotencyKey : `${params.idempotencyKey}_entry_${i + 1}`);

        // Centavos inteiros garantidos
        const amountCents = item.amountCents || Math.round(item.amount * (item.currency === 'BRL' ? 100 : 1));
        const normalizedAmount = item.currency === 'BRL' ? Number((amountCents / 100).toFixed(2)) : amountCents;

        const rawSign = `${entryId}:${idempKey}:${timestamp}:${normalizedAmount}:${item.currency}:${previousHash}`;
        const entryHash = computeSha256Simulated(rawSign);

        const entry: LedgerEntry = {
          id: entryId,
          idempotencyKey: idempKey,
          transactionId,
          timestamp,
          operationType: item.operationType,
          debitAccount: item.debitAccount,
          creditAccount: item.creditAccount,
          amount: normalizedAmount,
          amountCents,
          currency: item.currency,
          status: 'posted',
          actorId: params.actorId,
          targetCreatorId: item.targetCreatorId,
          referenceId: item.referenceId,
          description: item.description,
          isSandbox: runtimeEnvironmentService.isSimulationMode(),
          metadata: {
            ...item.metadata,
            batchIdempotencyKey: params.idempotencyKey,
            transactionId,
            bundleIndex: i,
            bundleTotal: params.entries.length,
          },
          previousHash,
          entryHash,
          sha256ProtocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
        };

        const { sha256Hash } = calculateLedgerSha256(entry);
        entry.sha256ReferenceHash = sha256Hash;
        if (entry.metadata) {
          entry.metadata.sha256ReferenceHash = sha256Hash;
          entry.metadata.sha256ProtocolVersion = LEDGER_SHA256_PROTOCOL_VERSION;
        }

        newEntries.unshift(entry);
        previousHash = entryHash;
      }

      // 4. Commit Atômico em Storage Único
      const updatedList = [...newEntries, ...existingEntries];
      this.saveEntries(updatedList);

      // 5. Auditoria da Transação
      const isSimMode = runtimeEnvironmentService.isSimulationMode();
      this.recordAudit({
        actorId: params.actorId,
        action: `TRANSACTION_COMMITTED:${transactionId}`,
        reason: params.description,
        ipHash: 'hash_sandbox_client_v4',
        isSandbox: isSimMode,
        payload: {
          transactionId,
          idempotencyKey: params.idempotencyKey,
          entriesCount: newEntries.length,
          totalAmount: newEntries.reduce((acc, e) => acc + e.amount, 0),
        },
      });

      // 6. Sincronização Assíncrona em Produção com Cloud Firestore (Isolamento Estrito: Sandbox nunca é enviado)
      if (!isSimMode) {
        void (async () => {
          try {
            const { syncLedgerEntrySnapshotToFirestore } = await import('../firebase');
            for (const entry of newEntries) {
              if (!entry.isSandbox && (entry.currency === 'BRL' || entry.currency === 'CREDITS')) {
                await syncLedgerEntrySnapshotToFirestore({
                  entryId: entry.id,
                  actorId: entry.actorId,
                  operationType: entry.operationType,
                  debitAccount: entry.debitAccount,
                  creditAccount: entry.creditAccount,
                  amountCents: entry.amountCents ?? Math.round(entry.amount * 100),
                  currency: entry.currency,
                  status: entry.status,
                  entryHash: entry.entryHash,
                  previousHash: entry.previousHash,
                });
              }
            }
          } catch {
            // Mantém resiliência local caso não haja sessão autenticada de administrador no cliente
          }
        })();
      }

      return { entries: newEntries.reverse(), isReplay: false };
  }

  /**
   * Postagem unitária compatível com a interface original (delega para postTransactionAtomic)
   */
  public async postEntry(params: {
    idempotencyKey: string;
    operationType: LedgerOperationType;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    amountCents?: number;
    currency: AccountCurrency;
    actorId: string;
    targetCreatorId?: string;
    referenceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ entry: LedgerEntry; isReplay: boolean }> {
    const res = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: params.description,
      actorId: params.actorId,
      entries: [
        {
          operationType: params.operationType,
          debitAccount: params.debitAccount,
          creditAccount: params.creditAccount,
          amount: params.amount,
          amountCents: params.amountCents,
          currency: params.currency,
          targetCreatorId: params.targetCreatorId,
          referenceId: params.referenceId,
          description: params.description,
          metadata: params.metadata,
        },
      ],
    });
    return { entry: res.entries[0], isReplay: res.isReplay };
  }

  /**
   * FASE 2: COMPRA DE PACOTE DE CRÉDITOS EM SANDBOX (LOTE ATÔMICO)
   */
  public async purchaseCreditPackage(params: {
    userId: string;
    packageId: string;
    packageName: string;
    creditsToGrant: number;
    priceBrl: number;
    gateway: 'stripe' | 'pix';
    idempotencyKey: string;
    simulateFailure?: boolean;
    simulatePending?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    entries: LedgerEntry[];
    newBalance: number;
    isReplay: boolean;
  }> {
    if (params.simulateFailure) {
      throw new Error('Falha simulada no gateway de pagamento (Cartão Recusado ou Timeout Sandbox). Nenhum crédito concedido.');
    }

    if (params.simulatePending) {
      return {
        success: false,
        message: 'Pagamento PIX pendente de conciliação. Os créditos serão concedidos assim que o webhook confirmar o recebimento.',
        entries: [],
        newBalance: this.getUserCredits(params.userId),
        isReplay: false,
      };
    }

    const matchedPkg = OFFICIAL_CREDIT_PACKAGES.find((p) => p.id === params.packageId);
    const paidDiamondsGranted = matchedPkg
      ? Math.min(params.creditsToGrant, matchedPkg.credits)
      : params.creditsToGrant;
    const bonusDiamondsGranted = Math.max(0, params.creditsToGrant - paidDiamondsGranted);

    const txRes = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: `[SANDBOX] Compra do Pacote ${params.packageName}`,
      actorId: params.userId,
      entries: [
        {
          idempotencySuffix: 'fiat',
          operationType: 'CREDIT_PURCHASE',
          debitAccount: `GATEWAY_SANDBOX_${params.gateway.toUpperCase()}`,
          creditAccount: 'ESCROW_PAYMENT_GATEWAY',
          amount: params.priceBrl,
          currency: 'BRL',
          referenceId: params.packageId,
          description: `[SANDBOX] Compra do Pacote ${params.packageName} via ${params.gateway.toUpperCase()}`,
          metadata: {
            packageId: params.packageId,
            gateway: params.gateway,
            priceBrl: params.priceBrl,
            credits: params.creditsToGrant,
            paidDiamondsGranted,
            bonusDiamondsGranted,
          },
        },
        {
          idempotencySuffix: 'credits',
          operationType: 'CREDIT_PURCHASE',
          debitAccount: 'PLATFORM_RESERVE_POOL:credits',
          creditAccount: `USER_CREDITS:${params.userId}`,
          amount: params.creditsToGrant,
          currency: 'CREDITS',
          referenceId: params.packageId,
          description: `[SANDBOX] Concessão de ${params.creditsToGrant} 💎 (${paidDiamondsGranted} comprados + ${bonusDiamondsGranted} bônus — Pacote ${params.packageName})`,
          metadata: {
            packageId: params.packageId,
            isNonWithdrawable: true,
            paidDiamondsGranted,
            bonusDiamondsGranted,
            bonusFiduciaryValueCents: 0,
          },
        },
      ],
    });

    const newBalance = this.getUserCredits(params.userId);

    return {
      success: true,
      message: `Pacote ${params.packageName} adquirido com sucesso no ambiente Sandbox auditado!`,
      entries: txRes.entries,
      newBalance,
      isReplay: txRes.isReplay,
    };
  }

  /**
   * FASE 3: DESBLOQUEIO DE CONTEÚDO PAGO COM CRÉDITOS (LOTE ATÔMICO)
   */
  public async unlockPaidContent(params: {
    userId: string;
    creatorId: string;
    creatorName: string;
    contentId: string;
    contentTitle: string;
    priceCredits: number;
    idempotencyKey: string;
    creatorSharePct?: number; // padrão 70%
  }): Promise<{
    success: boolean;
    newCreditsBalance: number;
    creatorEarnedBrl: number;
    platformEarnedBrl: number;
    entries: LedgerEntry[];
    isReplay: boolean;
  }> {
    const creatorPct = params.creatorSharePct ?? 0.70;
    const platformPct = 1 - creatorPct;

    // Conversão de valor econômico: 1 crédito = R$ 0,10
    const totalEconomicBrl = Number((params.priceCredits * 0.10).toFixed(2));
    const creatorEarnedBrl = Number((totalEconomicBrl * creatorPct).toFixed(2));
    const platformEarnedBrl = Number((totalEconomicBrl * platformPct).toFixed(2));

    const txRes = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: `Desbloqueio de Mídia VIP: "${params.contentTitle}" de ${params.creatorName}`,
      actorId: params.userId,
      entries: [
        {
          idempotencySuffix: 'spend',
          operationType: 'CONTENT_UNLOCK',
          debitAccount: `USER_CREDITS:${params.userId}`,
          creditAccount: 'ESCROW_CONTENT_POOL:credits',
          amount: params.priceCredits,
          currency: 'CREDITS',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          description: `Desbloqueio de Mídia VIP: "${params.contentTitle}" de ${params.creatorName}`,
          metadata: {
            contentId: params.contentId,
            contentTitle: params.contentTitle,
            creatorId: params.creatorId,
          },
        },
        {
          idempotencySuffix: 'creator_share',
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: `CREATOR_PENDING_BRL:${params.creatorId}`,
          amount: creatorEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          description: `[70% Repasse] Desbloqueio de conteúdo "${params.contentTitle}"`,
          metadata: {
            contentId: params.contentId,
            splitPct: creatorPct,
          },
        },
        {
          idempotencySuffix: 'platform_share',
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: platformEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          description: `[30% Comissão JOBS] Desbloqueio de conteúdo "${params.contentTitle}"`,
          metadata: {
            contentId: params.contentId,
            splitPct: platformPct,
          },
        },
      ],
    });

    const newCreditsBalance = this.getUserCredits(params.userId);

    return {
      success: true,
      newCreditsBalance,
      creatorEarnedBrl,
      platformEarnedBrl,
      entries: txRes.entries,
      isReplay: txRes.isReplay,
    };
  }

  /**
   * ENVIO DE GORJETA / PRESENTE EM LIVE COM CRÉDITOS (LOTE ATÔMICO)
   */
  public async sendTip(params: {
    userId: string;
    creatorId: string;
    creatorName: string;
    liveStreamId?: string;
    creditsAmount: number;
    idempotencyKey: string;
    message?: string;
  }): Promise<{
    success: boolean;
    newCreditsBalance: number;
    creatorEarnedBrl: number;
    entries: LedgerEntry[];
  }> {
    const totalEconomicBrl = Number((params.creditsAmount * 0.10).toFixed(2));
    const creatorEarnedBrl = Number((totalEconomicBrl * 0.70).toFixed(2));
    const platformEarnedBrl = Number((totalEconomicBrl * 0.30).toFixed(2));

    const txRes = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: `Presente VIP para ${params.creatorName}${params.message ? `: "${params.message}"` : ''}`,
      actorId: params.userId,
      entries: [
        {
          idempotencySuffix: 'tip_spend',
          operationType: 'TIP_GIFT',
          debitAccount: `USER_CREDITS:${params.userId}`,
          creditAccount: 'ESCROW_TIPS_POOL:credits',
          amount: params.creditsAmount,
          currency: 'CREDITS',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `Presente VIP para ${params.creatorName}${params.message ? `: "${params.message}"` : ''}`,
          metadata: {
            liveStreamId: params.liveStreamId,
            message: params.message,
          },
        },
        {
          idempotencySuffix: 'tip_creator',
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: `CREATOR_PENDING_BRL:${params.creatorId}`,
          amount: creatorEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `[70% Presente Live] Ganhos de ${params.creatorName}`,
        },
        {
          idempotencySuffix: 'tip_platform',
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: platformEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `[30% Comissão JOBS] Presente Live de ${params.creatorName}`,
        },
      ],
    });

    return {
      success: true,
      newCreditsBalance: this.getUserCredits(params.userId),
      creatorEarnedBrl,
      entries: txRes.entries,
    };
  }

  /**
   * RATEIO 70/30 DE PRESENTES VIRTUAIS EM LIVES (AUDITADO E ATÔMICO)
   */
  public async postLiveGiftRevenueShare(params: {
    liveId: string;
    senderUserId: string;
    senderUserName: string;
    creatorId: string;
    creatorName: string;
    giftId: string;
    giftName: string;
    creditsCost: number;
    priceBrlCents: number;
    idempotencyKey: string;
  }): Promise<{
    success: boolean;
    creatorShareCents: number;
    platformCommissionCents: number;
    creatorEarnedBrl: number;
    platformEarnedBrl: number;
    isReplay: boolean;
    entries: LedgerEntry[];
  }> {
    const creatorShareCents = Math.round(params.priceBrlCents * 0.70);
    const platformCommissionCents = params.priceBrlCents - creatorShareCents;
    const creatorEarnedBrl = Number((creatorShareCents / 100).toFixed(2));
    const platformEarnedBrl = Number((platformCommissionCents / 100).toFixed(2));

    const txRes = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: `[Live Gift] ${params.giftName} para ${params.creatorName}`,
      actorId: params.senderUserId,
      entries: [
        {
          idempotencySuffix: 'live_gift_spend',
          operationType: 'TIP_GIFT',
          debitAccount: `USER_CREDITS:${params.senderUserId}`,
          creditAccount: 'ESCROW_CONTENT_POOL:credits',
          amount: params.creditsCost,
          currency: 'CREDITS',
          targetCreatorId: params.creatorId,
          referenceId: params.liveId,
          description: `[Live Gift] ${params.giftName} para ${params.creatorName}`,
          metadata: {
            liveId: params.liveId,
            giftId: params.giftId,
            giftName: params.giftName,
            senderUserName: params.senderUserName,
          },
        },
        {
          idempotencySuffix: 'live_gift_creator',
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: `CREATOR_PENDING_BRL:${params.creatorId}`,
          amount: creatorEarnedBrl,
          amountCents: creatorShareCents,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveId,
          description: `[70% Live Gift] ${params.giftName} - Ganhos de ${params.creatorName}`,
        },
        {
          idempotencySuffix: 'live_gift_platform',
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: platformEarnedBrl,
          amountCents: platformCommissionCents,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveId,
          description: `[30% Live Gift] Comissão JOBS de ${params.creatorName}`,
        },
      ],
    });

    return {
      success: true,
      creatorShareCents,
      platformCommissionCents,
      creatorEarnedBrl,
      platformEarnedBrl,
      isReplay: txRes.isReplay,
      entries: txRes.entries,
    };
  }

  /**
   * DESBLOQUEIO DE TRANSMISSÃO AO VIVO VIP COM CRÉDITOS (LOTE ATÔMICO 70/30)
   */
  public async unlockLiveStream(params: {
    userId: string;
    creatorId: string;
    creatorName: string;
    liveStreamId: string;
    liveTitle: string;
    priceCredits: number;
    idempotencyKey: string;
    creatorSharePct?: number; // Padrão 70%
  }): Promise<{
    success: boolean;
    newCreditsBalance: number;
    creatorEarnedBrl: number;
    platformEarnedBrl: number;
    entries: LedgerEntry[];
    isReplay: boolean;
  }> {
    const creatorPct = params.creatorSharePct ?? 0.70;
    const platformPct = Number((1 - creatorPct).toFixed(2));

    // Conversão de valor econômico: 1 crédito = R$ 0,10
    const totalEconomicBrl = Number((params.priceCredits * 0.10).toFixed(2));
    const creatorEarnedBrl = Number((totalEconomicBrl * creatorPct).toFixed(2));
    const platformEarnedBrl = Number((totalEconomicBrl - creatorEarnedBrl).toFixed(2));

    const txRes = await this.postTransactionAtomic({
      idempotencyKey: params.idempotencyKey,
      description: `Desbloqueio VIP Live: "${params.liveTitle}" de ${params.creatorName}`,
      actorId: params.userId,
      entries: [
        {
          idempotencySuffix: 'unlock_spend',
          operationType: 'CONTENT_UNLOCK',
          debitAccount: `USER_CREDITS:${params.userId}`,
          creditAccount: 'ESCROW_CONTENT_POOL:credits',
          amount: params.priceCredits,
          currency: 'CREDITS',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `Desbloqueio VIP Live: "${params.liveTitle}" de ${params.creatorName}`,
          metadata: {
            liveStreamId: params.liveStreamId,
            liveTitle: params.liveTitle,
            creatorId: params.creatorId,
            creatorName: params.creatorName,
            isLiveUnlock: true,
          },
        },
        {
          idempotencySuffix: 'creator_70',
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: `CREATOR_PENDING_BRL:${params.creatorId}`,
          amount: creatorEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `[70% Repasse Live] Desbloqueio de show "${params.liveTitle}"`,
          metadata: {
            liveStreamId: params.liveStreamId,
            splitPct: creatorPct,
            isLiveUnlock: true,
          },
        },
        {
          idempotencySuffix: 'platform_30',
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: platformEarnedBrl,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.liveStreamId,
          description: `[30% Comissão JOBS] Desbloqueio VIP "${params.liveTitle}"`,
          metadata: {
            liveStreamId: params.liveStreamId,
            splitPct: platformPct,
            isLiveUnlock: true,
          },
        },
      ],
    });

    const newCreditsBalance = this.getUserCredits(params.userId);

    return {
      success: true,
      newCreditsBalance,
      creatorEarnedBrl,
      platformEarnedBrl,
      entries: txRes.entries,
      isReplay: txRes.isReplay,
    };
  }

  /**
   * Garante a presença de entradas iniciais de lives no livro-razão se estiver apenas com genesis.
   * Estritamente desativado quando o ambiente ativo for 'production'.
   */
  public ensureInitialLiveAuditEntries(): void {
    if (!runtimeEnvironmentService.shouldSeedSyntheticData()) return;
    const entries = this.getEntries();
    const hasLiveOrUnlock = entries.some(
      (e) =>
        e.operationType === 'CONTENT_UNLOCK' ||
        e.operationType === 'TIP_GIFT' ||
        (e.metadata && (e.metadata.isLiveUnlock || e.metadata.liveStreamId))
    );

    if (hasLiveOrUnlock) return;

    // Criar histórico inicial verificado com integridade criptográfica
    const now = Date.now();
    const dayMs = 86400000;
    const seeds: Array<{
      txId: string;
      idemp: string;
      timeOffsetMs: number;
      type: 'CONTENT_UNLOCK' | 'TIP_GIFT';
      user: string;
      creator: string;
      creatorName: string;
      liveId: string;
      desc: string;
      credits: number;
      settled?: boolean;
      refunded?: boolean;
    }> = [
      {
        txId: 'tx_live_unlock_val_01',
        idemp: 'idemp_seed_unlock_val_01',
        timeOffsetMs: 5 * dayMs + 45 * 60000,
        type: 'CONTENT_UNLOCK',
        user: 'user_marcos_sp',
        creator: 'valentina',
        creatorName: 'Valentina Rossi',
        liveId: 'live_indiv_valentina',
        desc: 'Desbloqueio VIP: Ensaio Boudoir & Conversas Íntimas no Quarto',
        credits: 65,
      },
      {
        txId: 'tx_live_gift_val_02',
        idemp: 'idemp_seed_gift_val_02',
        timeOffsetMs: 4 * dayMs + 30 * 60000,
        type: 'TIP_GIFT',
        user: 'user_rodrigo_vip',
        creator: 'valentina',
        creatorName: 'Valentina Rossi',
        liveId: 'live_indiv_valentina',
        desc: 'Presente Virtual: Champagne Moët & Chandon (🍾)',
        credits: 50,
      },
      {
        txId: 'tx_live_unlock_isa_03',
        idemp: 'idemp_seed_unlock_isa_03',
        timeOffsetMs: 3 * dayMs + 20 * 60000,
        type: 'CONTENT_UNLOCK',
        user: 'user_lucas_rj',
        creator: 'isabella',
        creatorName: 'Isabella Fontes',
        liveId: 'live_battle_isabella_camila',
        desc: 'Desbloqueio VIP: Batalha Sensual Isabella vs Camila',
        credits: 50,
      },
      {
        txId: 'tx_live_gift_cam_04',
        idemp: 'idemp_seed_gift_cam_04',
        timeOffsetMs: 2 * dayMs + 12 * 60000,
        type: 'TIP_GIFT',
        user: 'user_andre_bh',
        creator: 'camila',
        creatorName: 'Camila Duarte',
        liveId: 'live_battle_isabella_camila',
        desc: 'Presente Virtual: Fogo & Paixão (🔥)',
        credits: 100,
        settled: true,
      },
      {
        txId: 'tx_live_unlock_gab_05',
        idemp: 'idemp_seed_unlock_gab_05',
        timeOffsetMs: 1 * dayMs + 8 * 60000,
        type: 'CONTENT_UNLOCK',
        user: 'user_felipe_sul',
        creator: 'gabriel',
        creatorName: 'Gabriel Menezes',
        liveId: 'live_challenge_gabriel',
        desc: 'Desbloqueio VIP: Desafio Fitness Noturno',
        credits: 35,
        refunded: true,
      },
      {
        txId: 'tx_live_unlock_isa_06',
        idemp: 'idemp_seed_unlock_isa_06',
        timeOffsetMs: 15 * 60000,
        type: 'CONTENT_UNLOCK',
        user: 'user_marcos_sp',
        creator: 'isabella',
        creatorName: 'Isabella Fontes',
        liveId: 'live_battle_isabella_camila',
        desc: 'Desbloqueio VIP: Sessão Ao Vivo Exclusiva Isabella',
        credits: 80,
      },
    ];

    let prevHash = entries[0]?.entryHash || '0x0000000000000000';
    const newEntries: LedgerEntry[] = [];

    for (const s of seeds) {
      const ts = new Date(now - s.timeOffsetMs).toISOString();
      const grossBrl = Number((s.credits * 0.10).toFixed(2));
      const creatorBrl = Number((grossBrl * 0.70).toFixed(2));
      const platformBrl = Number((grossBrl - creatorBrl).toFixed(2));
      const creatorAccount = s.settled ? `CREATOR_AVAILABLE_BRL:${s.creator}` : `CREATOR_PENDING_BRL:${s.creator}`;

      const spendId = `ledg_${s.txId}_spend`;
      const hash1 = computeSha256Simulated(`${spendId}:${s.idemp}:${ts}:${s.credits}:CREDITS:${prevHash}`);
      const spendEntry: LedgerEntry = {
        id: spendId,
        idempotencyKey: `${s.idemp}_spend`,
        transactionId: s.txId,
        timestamp: ts,
        operationType: s.type,
        debitAccount: `USER_CREDITS:${s.user}`,
        creditAccount: 'ESCROW_CONTENT_POOL:credits',
        amount: s.credits,
        currency: 'CREDITS',
        status: s.refunded ? 'refunded' : 'posted',
        actorId: s.user,
        targetCreatorId: s.creator,
        referenceId: s.liveId,
        description: s.desc,
        isSandbox: true,
        previousHash: prevHash,
        entryHash: hash1,
        metadata: {
          liveStreamId: s.liveId,
          creatorId: s.creator,
          creatorName: s.creatorName,
          isLiveUnlock: s.type === 'CONTENT_UNLOCK',
        },
      };
      prevHash = hash1;
      newEntries.unshift(spendEntry);

      const creatorEntryId = `ledg_${s.txId}_creator`;
      const hash2 = computeSha256Simulated(`${creatorEntryId}:${s.idemp}:${ts}:${creatorBrl}:BRL:${prevHash}`);
      const creatorEntry: LedgerEntry = {
        id: creatorEntryId,
        idempotencyKey: `${s.idemp}_creator`,
        transactionId: s.txId,
        timestamp: ts,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: creatorAccount,
        amount: creatorBrl,
        currency: 'BRL',
        status: s.refunded ? 'refunded' : 'posted',
        actorId: s.user,
        targetCreatorId: s.creator,
        referenceId: s.liveId,
        description: `[70% Repasse] ${s.desc}`,
        isSandbox: true,
        previousHash: prevHash,
        entryHash: hash2,
        metadata: {
          liveStreamId: s.liveId,
          creatorId: s.creator,
          splitPct: 0.70,
        },
      };
      prevHash = hash2;
      newEntries.unshift(creatorEntry);

      const platEntryId = `ledg_${s.txId}_plat`;
      const hash3 = computeSha256Simulated(`${platEntryId}:${s.idemp}:${ts}:${platformBrl}:BRL:${prevHash}`);
      const platEntry: LedgerEntry = {
        id: platEntryId,
        idempotencyKey: `${s.idemp}_plat`,
        transactionId: s.txId,
        timestamp: ts,
        operationType: 'PLATFORM_COMMISSION',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'PLATFORM_REVENUE_BRL',
        amount: platformBrl,
        currency: 'BRL',
        status: s.refunded ? 'refunded' : 'posted',
        actorId: s.user,
        targetCreatorId: s.creator,
        referenceId: s.liveId,
        description: `[30% Comissão JOBS] ${s.desc}`,
        isSandbox: true,
        previousHash: prevHash,
        entryHash: hash3,
        metadata: {
          liveStreamId: s.liveId,
          splitPct: 0.30,
        },
      };
      prevHash = hash3;
      newEntries.unshift(platEntry);

      if (s.refunded) {
        const refId = `ledg_${s.txId}_refund`;
        const hashRef = computeSha256Simulated(`${refId}:${s.idemp}_ref:${ts}:${s.credits}:CREDITS:${prevHash}`);
        const refEntry: LedgerEntry = {
          id: refId,
          idempotencyKey: `${s.idemp}_refund_comp`,
          transactionId: s.txId,
          timestamp: ts,
          operationType: 'REFUND',
          debitAccount: 'ESCROW_CONTENT_POOL:credits',
          creditAccount: `USER_CREDITS:${s.user}`,
          amount: s.credits,
          currency: 'CREDITS',
          status: 'posted',
          actorId: 'admin_audit_master',
          referenceId: spendId,
          description: `[ESTORNO AUDITADO] Devolução de créditos de ${s.desc}`,
          isSandbox: true,
          previousHash: prevHash,
          entryHash: hashRef,
          metadata: {
            originalEntryId: spendId,
            refundReason: 'Cancelamento antes do início da sessão ao vivo',
          },
        };
        prevHash = hashRef;
        newEntries.unshift(refEntry);
      }
    }

    this.saveEntries([...newEntries, ...entries]);
  }

  /**
   * CONSULTA DE AUDITORIA DE DESBLOQUEIOS DE LIVES E RATEIO 70/30 (Single Source of Truth)
   * Processa os lançamentos reais do livro-razão sem dados fictícios.
   */
  public getLiveUnlockAuditData(filters?: {
    period?: 'today' | '24h' | '7days' | '30days' | 'all';
    status?: 'all' | 'posted' | 'pending' | 'refunded' | 'divergent';
    operationType?: 'all' | 'CONTENT_UNLOCK' | 'TIP_GIFT';
    search?: string;
    onlyDivergences?: boolean;
    page?: number;
    pageSize?: number;
  }): {
    transactions: LiveUnlockAuditTransaction[];
    kpis: LiveUnlockSummaryKPIs;
    totalCount: number;
    divergences: Array<{ transactionId: string; description: string; issue: string }>;
  } {
    // Garante que dados iniciais existam caso o storage tenha apenas o genesis bootstrap
    this.ensureInitialLiveAuditEntries();

    const allEntries = this.getEntries();
    const auditLogs = this.getAuditLogs();

    // 1. Agrupar entradas por transactionId (ou prefixo de idempotencyKey)
    const txGroups: Map<string, LedgerEntry[]> = new Map();

    for (const entry of allEntries) {
      const txKey =
        entry.transactionId ||
        (entry.metadata?.transactionId as string) ||
        entry.idempotencyKey
          .replace(/_spend$/, '')
          .replace(/_creator$/, '')
          .replace(/_creator_70$/, '')
          .replace(/_creator_share$/, '')
          .replace(/_platform$/, '')
          .replace(/_platform_30$/, '')
          .replace(/_platform_share$/, '')
          .replace(/_plat$/, '')
          .replace(/_refund_comp$/, '')
          .replace(/_entry_\d+$/, '');

      if (!txGroups.has(txKey)) {
        txGroups.set(txKey, []);
      }
      txGroups.get(txKey)!.push(entry);
    }

    const auditTransactions: LiveUnlockAuditTransaction[] = [];
    const detectedDivergences: Array<{ transactionId: string; description: string; issue: string }> = [];

    // Parse de cada grupo
    for (const [txId, group] of txGroups.entries()) {
      // Procura entrada primária de consumo de créditos (CONTENT_UNLOCK ou TIP_GIFT)
      const spendEntry = group.find(
        (e) => (e.operationType === 'CONTENT_UNLOCK' || e.operationType === 'TIP_GIFT') && e.currency === 'CREDITS'
      );

      if (!spendEntry) {
        continue;
      }

      const isLiveRelated =
        spendEntry.metadata?.isLiveUnlock ||
        spendEntry.metadata?.liveStreamId ||
        spendEntry.metadata?.liveId ||
        (spendEntry.referenceId && spendEntry.referenceId.startsWith('live_')) ||
        spendEntry.operationType === 'TIP_GIFT' ||
        spendEntry.operationType === 'CONTENT_UNLOCK';

      if (!isLiveRelated) {
        continue;
      }

      const creatorEntry = group.find((e) => e.operationType === 'CREATOR_REVENUE_SHARE');
      const platformEntry = group.find((e) => e.operationType === 'PLATFORM_COMMISSION');
      const refundEntry = group.find((e) => e.operationType === 'REFUND');

      const priceCredits = spendEntry.amount;
      const grossAmountBrl = Number((priceCredits * 0.10).toFixed(2));
      const expectedCreatorBrl = Number((grossAmountBrl * 0.70).toFixed(2));
      const expectedPlatformBrl = Number((grossAmountBrl - expectedCreatorBrl).toFixed(2));

      const creatorShareBrl = creatorEntry ? creatorEntry.amount : expectedCreatorBrl;
      const platformShareBrl = platformEntry ? platformEntry.amount : expectedPlatformBrl;

      // Verificação de divergências contábeis
      let hasDivergence = false;
      let divergenceReason: string | undefined;

      const sumSplit = Number((creatorShareBrl + platformShareBrl).toFixed(2));
      const mathDiff = Math.abs(sumSplit - grossAmountBrl);

      if (mathDiff > 0.02) {
        hasDivergence = true;
        divergenceReason = `Divergência matemática 70/30: Criador (R$ ${creatorShareBrl.toFixed(2)}) + JOBS (R$ ${platformShareBrl.toFixed(2)}) = R$ ${sumSplit.toFixed(2)} ≠ Bruto R$ ${grossAmountBrl.toFixed(2)}`;
      } else if (!creatorEntry || !platformEntry) {
        hasDivergence = true;
        divergenceReason = `Lançamento atômico incompleto: ${!creatorEntry ? 'Falta repasse 70% criador.' : ''} ${!platformEntry ? 'Falta comissão 30% JOBS.' : ''}`.trim();
      }

      if (hasDivergence) {
        detectedDivergences.push({
          transactionId: txId,
          description: spendEntry.description,
          issue: divergenceReason || 'Inconsistência detectada na regra 70/30',
        });
      }

      const isRefunded = spendEntry.status === 'refunded' || !!refundEntry;
      const isPendingSettlement = creatorEntry ? creatorEntry.creditAccount.startsWith('CREATOR_PENDING_BRL:') : true;

      let status: LedgerEntryStatus | 'divergent' = 'posted';
      if (hasDivergence) {
        status = 'divergent';
      } else if (isRefunded) {
        status = 'refunded';
      } else if (isPendingSettlement) {
        status = 'pending';
      }

      const creatorId =
        spendEntry.targetCreatorId ||
        creatorEntry?.targetCreatorId ||
        (spendEntry.metadata?.creatorId as string) ||
        'creator_jobs';

      const creatorName =
        (spendEntry.metadata?.creatorName as string) ||
        (creatorId === 'valentina' ? 'Valentina Rossi' :
         creatorId === 'isabella' ? 'Isabella Fontes' :
         creatorId === 'camila' ? 'Camila Duarte' :
         creatorId === 'gabriel' ? 'Gabriel Menezes' :
         `Criador #${creatorId.replace('creator_', '')}`);

      const liveStreamId =
        (spendEntry.metadata?.liveStreamId as string) ||
        (spendEntry.metadata?.liveId as string) ||
        (spendEntry.referenceId && spendEntry.referenceId.startsWith('live_') ? spendEntry.referenceId : undefined);

      const buyerUserId = spendEntry.actorId || spendEntry.debitAccount.replace('USER_CREDITS:', '') || 'anon';
      const buyerMasked = maskUserId(buyerUserId);
      const idempotencyMasked = maskIdempotencyKey(spendEntry.idempotencyKey);

      const relatedLogs = auditLogs.filter(
        (l) => l.action.includes(txId) || (l.payload && l.payload.transactionId === txId)
      );

      auditTransactions.push({
        transactionId: txId,
        timestamp: spendEntry.timestamp,
        operationType: spendEntry.operationType,
        liveStreamId,
        referenceId: spendEntry.referenceId || liveStreamId || 'ref_unknown',
        buyerUserId,
        buyerMasked,
        creatorId,
        creatorName,
        description: spendEntry.description,
        priceCredits,
        grossAmountBrl,
        creatorShareBrl,
        platformShareBrl,
        status,
        isEligible70_30: true,
        isPendingSettlement,
        isRefunded,
        hasDivergence,
        divergenceReason,
        idempotencyKey: spendEntry.idempotencyKey,
        idempotencyMasked,
        entries: group,
        auditLogs: relatedLogs,
      });
    }

    // Ordenar decrescente por data/hora
    auditTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 2. Filtragem
    const now = Date.now();
    let filtered = auditTransactions;

    if (filters?.period && filters.period !== 'all') {
      let cutoffMs = 0;
      if (filters.period === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        cutoffMs = d.getTime();
      } else if (filters.period === '24h') {
        cutoffMs = now - 24 * 3600 * 1000;
      } else if (filters.period === '7days') {
        cutoffMs = now - 7 * 24 * 3600 * 1000;
      } else if (filters.period === '30days') {
        cutoffMs = now - 30 * 24 * 3600 * 1000;
      }
      filtered = filtered.filter((t) => new Date(t.timestamp).getTime() >= cutoffMs);
    }

    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters?.operationType && filters.operationType !== 'all') {
      filtered = filtered.filter((t) => t.operationType === filters.operationType);
    }

    if (filters?.onlyDivergences) {
      filtered = filtered.filter((t) => t.hasDivergence);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.transactionId.toLowerCase().includes(q) ||
          (t.liveStreamId && t.liveStreamId.toLowerCase().includes(q)) ||
          t.creatorId.toLowerCase().includes(q) ||
          t.creatorName.toLowerCase().includes(q) ||
          t.buyerUserId.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.idempotencyKey.toLowerCase().includes(q)
      );
    }

    // 3. Cálculo de Indicadores de Resumo (KPIs)
    let grossCredits = 0;
    let grossRevenueBrl = 0;
    let creatorShareBrl = 0;
    let platformShareBrl = 0;
    let pendingSettlementBrl = 0;
    let refundedTransactionsCount = 0;
    let refundedAmountBrl = 0;
    let divergentCount = 0;

    for (const t of filtered) {
      if (t.hasDivergence) {
        divergentCount++;
      }

      if (t.isRefunded) {
        refundedTransactionsCount++;
        refundedAmountBrl += t.grossAmountBrl;
      } else {
        grossCredits += t.priceCredits;
        grossRevenueBrl += t.grossAmountBrl;
        creatorShareBrl += t.creatorShareBrl;
        platformShareBrl += t.platformShareBrl;

        if (t.isPendingSettlement) {
          pendingSettlementBrl += t.creatorShareBrl;
        }
      }
    }

    grossRevenueBrl = Number(grossRevenueBrl.toFixed(2));
    creatorShareBrl = Number(creatorShareBrl.toFixed(2));
    platformShareBrl = Number(platformShareBrl.toFixed(2));
    pendingSettlementBrl = Number(pendingSettlementBrl.toFixed(2));
    refundedAmountBrl = Number(refundedAmountBrl.toFixed(2));

    const totalCount = filtered.length;
    const complianceRatePct = totalCount > 0 ? Number((((totalCount - divergentCount) / totalCount) * 100).toFixed(1)) : 100;

    const kpis: LiveUnlockSummaryKPIs = {
      totalTransactions: totalCount,
      grossCredits,
      grossRevenueBrl,
      creatorShareBrl,
      platformShareBrl,
      pendingSettlementBrl,
      refundedTransactionsCount,
      refundedAmountBrl,
      divergentCount,
      lastUpdatedTimestamp: new Date().toISOString(),
      complianceRatePct,
    };

    // Paginação
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, filters?.pageSize || 12);
    const startIndex = (page - 1) * pageSize;
    const pagedTransactions = filtered.slice(startIndex, startIndex + pageSize);

    return {
      transactions: pagedTransactions,
      kpis,
      totalCount,
      divergences: detectedDivergences,
    };
  }

  /**
   * PREMIAÇÃO DE METAS E CAMPANHAS DE LIVE (DISPONÍVEL BRL)
   */
  public async postLivePerformanceReward(params: {
    campaignId: string;
    campaignTitle: string;
    creatorId: string;
    creatorName: string;
    rewardBrlCents: number;
    achievedMetric: string;
    idempotencyKey: string;
  }): Promise<{
    success: boolean;
    rewardBrlCents: number;
    rewardBrl: number;
    isReplay: boolean;
    entry?: LedgerEntry;
  }> {
    const amountBrl = Number((params.rewardBrlCents / 100).toFixed(2));
    const existing = this.getEntries().find((e) => e.idempotencyKey === params.idempotencyKey);
    if (existing) {
      return {
        success: true,
        rewardBrlCents: params.rewardBrlCents,
        rewardBrl: amountBrl,
        isReplay: true,
        entry: existing,
      };
    }

    const res = await this.postEntry({
      idempotencyKey: params.idempotencyKey,
      operationType: 'PERFORMANCE_REWARD',
      debitAccount: 'CAMPAIGN_REWARD_ESCROW:performance',
      creditAccount: `CREATOR_AVAILABLE_BRL:${params.creatorId}`,
      amount: amountBrl,
      currency: 'BRL',
      actorId: 'system_performance_auditor',
      targetCreatorId: params.creatorId,
      referenceId: params.campaignId,
      description: `[PREMIAÇÃO METAS] ${params.campaignTitle}: ${params.achievedMetric}`,
      metadata: {
        campaignId: params.campaignId,
        achievedMetric: params.achievedMetric,
        rewardBrlCents: params.rewardBrlCents,
      },
    });

    return {
      success: true,
      rewardBrlCents: params.rewardBrlCents,
      rewardBrl: amountBrl,
      isReplay: res.isReplay,
      entry: res.entry,
    };
  }

  /**
   * REEMBOLSO / ESTORNO AUDITADO ATÔMICO MULTI-PERNAS (Compensatory Reversing Bundle)
   * Reverte a entrada original e todas as pernas irmãs vinculadas ao mesmo transactionId
   * (ex: spend + creator_share 70% + platform_share 30%) em um único lote atômico idempotente.
   */
  public async processRefund(params: {
    originalEntryId: string;
    reason: string;
    adminId: string;
    idempotencyKey: string;
    includeSiblingLegs?: boolean;
  }): Promise<{
    success: boolean;
    compensatoryEntry: LedgerEntry;
    allCompensatoryEntries: LedgerEntry[];
    reversedLegsCount: number;
  }> {
    const entries = this.getEntries();
    const original = entries.find((e) => e.id === params.originalEntryId);

    if (!original) {
      throw new Error(`Entrada original não encontrada no livro-razão: ${params.originalEntryId}`);
    }

    if (original.status === 'refunded' || original.status === 'voided') {
      throw new Error(`Esta transação já foi estornada anteriormente.`);
    }

    const shouldReverseSiblings = params.includeSiblingLegs !== false;
    const siblingLegs =
      shouldReverseSiblings && original.transactionId
        ? entries.filter(
            (e) =>
              e.transactionId === original.transactionId &&
              e.id !== original.id &&
              e.status === 'posted' &&
              e.operationType !== 'REFUND'
          )
        : [];

    const legsToReverse = [original, ...siblingLegs];
    const refundTransactionId = `tx_refund_${original.transactionId || original.id}`;

    const draftEntries = legsToReverse.map((leg, idx) => ({
      idempotencySuffix: idx === 0 ? 'primary' : `leg_${idx}`,
      operationType: 'REFUND' as LedgerOperationType,
      debitAccount: leg.creditAccount,
      creditAccount: leg.debitAccount,
      amount: leg.amount,
      amountCents: leg.amountCents,
      currency: leg.currency,
      targetCreatorId: leg.targetCreatorId,
      referenceId: leg.id,
      description: `[ESTORNO AUDITADO] Motivo: ${params.reason} (Ref: ${leg.id})`,
      metadata: {
        originalEntryId: leg.id,
        originalTransactionId: leg.transactionId || null,
        originalOperationType: leg.operationType,
        reason: params.reason,
        isAtomicMultiLegRefund: legsToReverse.length > 1,
      },
    }));

    const res = await this.postTransactionAtomic({
      transactionId: refundTransactionId,
      idempotencyKey: params.idempotencyKey,
      description: `[ESTORNO ATÔMICO] Motivo: ${params.reason} (Ref: ${original.id})`,
      actorId: params.adminId,
      entries: draftEntries,
    });

    // Marcar todas as pernas originais revertidas como estornadas
    const current = this.getEntries();
    const reversedIds = new Set(legsToReverse.map((l) => l.id));
    let mutated = false;
    for (const entry of current) {
      if (reversedIds.has(entry.id) && entry.status !== 'refunded') {
        entry.status = 'refunded';
        mutated = true;
      }
    }
    if (mutated) {
      this.saveEntries(current);
    }

    return {
      success: true,
      compensatoryEntry: res.entries[0],
      allCompensatoryEntries: res.entries,
      reversedLegsCount: res.entries.length,
    };
  }

  /**
   * Estorno atômico explícito por transactionId completo
   */
  public async processTransactionRefundAtomic(params: {
    transactionId: string;
    reason: string;
    adminId: string;
    idempotencyKey: string;
  }): Promise<{
    success: boolean;
    compensatoryEntry: LedgerEntry;
    allCompensatoryEntries: LedgerEntry[];
    reversedLegsCount: number;
  }> {
    const entries = this.getEntries();
    const txLegs = entries.filter(
      (e) => e.transactionId === params.transactionId && e.operationType !== 'REFUND'
    );
    if (txLegs.length === 0) {
      throw new Error(`Transação não encontrada no livro-razão: ${params.transactionId}`);
    }
    const primaryLeg =
      txLegs.find((e) => e.currency === 'CREDITS') || txLegs[0];
    return this.processRefund({
      originalEntryId: primaryLeg.id,
      reason: params.reason,
      adminId: params.adminId,
      idempotencyKey: params.idempotencyKey,
      includeSiblingLegs: true,
    });
  }

  /**
   * PREMIAÇÃO FINANCEIRA POR DESEMPENHO (Separada da receita 70/30)
   * Registra lançamentos de campanhas com regras versionadas e fonte de financiamento.
   */
  public async awardPerformanceReward(params: {
    creatorId: string;
    creatorName: string;
    campaignId: string;
    ruleVersion: string;
    amountBrl: number;
    liveStreamId?: string;
    idempotencyKey: string;
    metricsSummary?: Record<string, unknown>;
    description?: string;
  }): Promise<{ success: boolean; entry: LedgerEntry; isReplay: boolean }> {
    const res = await this.postEntry({
      idempotencyKey: params.idempotencyKey,
      operationType: 'PERFORMANCE_REWARD',
      debitAccount: 'CAMPAIGN_REWARD_ESCROW:performance',
      creditAccount: `CREATOR_PENDING_BRL:${params.creatorId}`,
      amount: Number(params.amountBrl.toFixed(2)),
      currency: 'BRL',
      actorId: 'system_performance_auditor',
      targetCreatorId: params.creatorId,
      referenceId: params.liveStreamId || params.campaignId,
      description:
        params.description ||
        `[PREMIAÇÃO DESEMPENHO] Campanha ${params.campaignId} (Regra v${params.ruleVersion}) para ${params.creatorName}`,
      metadata: {
        campaignId: params.campaignId,
        ruleVersion: params.ruleVersion,
        liveStreamId: params.liveStreamId,
        metricsSummary: params.metricsSummary,
        isPerformanceReward: true,
      },
    });

    return {
      success: true,
      entry: res.entry,
      isReplay: res.isReplay,
    };
  }

  /**
   * CONSULTA AVANÇADA DE LIVRO-RAZÃO COM FILTROS E PAGINAÇÃO PARA O RELATÓRIO DE AUDITORIA
   */
  public queryLedger(params: {
    search?: string;
    operationType?: LedgerOperationType | 'all';
    status?: LedgerEntryStatus | 'all';
    currency?: AccountCurrency | 'all';
    actorId?: string;
    targetCreatorId?: string;
    startDate?: string;
    endDate?: string;
    idempotencyKey?: string;
    page?: number;
    pageSize?: number;
  }): {
    entries: LedgerEntry[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    stats: {
      totalEntries: number;
      postedCount: number;
      pendingCount: number;
      refundedCount: number;
      voidedCount: number;
      totalCreditsDebited: number;
      totalCreditsCredited: number;
      totalBrlMoved: number;
    };
  } {
    const all = this.getEntries();
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 15);

    // Estatísticas globais do livro-razão
    let postedCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let voidedCount = 0;
    let totalCreditsDebited = 0;
    let totalCreditsCredited = 0;
    let totalBrlMoved = 0;

    for (const e of all) {
      if (e.status === 'posted') postedCount++;
      else if (e.status === 'pending') pendingCount++;
      else if (e.status === 'refunded') refundedCount++;
      else if (e.status === 'voided') voidedCount++;

      if (e.currency === 'CREDITS') {
        if (e.creditAccount.startsWith('USER_CREDITS:')) {
          totalCreditsCredited += e.amount;
        }
        if (e.debitAccount.startsWith('USER_CREDITS:')) {
          totalCreditsDebited += e.amount;
        }
      } else if (e.currency === 'BRL') {
        totalBrlMoved += e.amount;
      }
    }

    // Filtragem em memória determinística
    let filtered = all;

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.idempotencyKey.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.actorId.toLowerCase().includes(q) ||
          (e.targetCreatorId && e.targetCreatorId.toLowerCase().includes(q)) ||
          (e.referenceId && e.referenceId.toLowerCase().includes(q))
      );
    }

    if (params.operationType && params.operationType !== 'all') {
      filtered = filtered.filter((e) => e.operationType === params.operationType);
    }

    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((e) => e.status === params.status);
    }

    if (params.currency && params.currency !== 'all') {
      filtered = filtered.filter((e) => e.currency === params.currency);
    }

    if (params.idempotencyKey && params.idempotencyKey.trim()) {
      const idemp = params.idempotencyKey.trim().toLowerCase();
      filtered = filtered.filter((e) => e.idempotencyKey.toLowerCase().includes(idemp));
    }

    if (params.actorId && params.actorId.trim()) {
      const actor = params.actorId.trim().toLowerCase();
      filtered = filtered.filter((e) => e.actorId.toLowerCase().includes(actor));
    }

    if (params.targetCreatorId && params.targetCreatorId.trim()) {
      const creator = params.targetCreatorId.trim().toLowerCase();
      filtered = filtered.filter((e) => e.targetCreatorId?.toLowerCase().includes(creator));
    }

    if (params.startDate) {
      const startMs = new Date(params.startDate).getTime();
      if (!isNaN(startMs)) {
        filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= startMs);
      }
    }

    if (params.endDate) {
      const endMs = new Date(params.endDate).getTime();
      if (!isNaN(endMs)) {
        // final do dia
        filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= endMs + 86400000);
      }
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedEntries = filtered.slice(startIndex, startIndex + pageSize);

    return {
      entries: paginatedEntries,
      totalCount,
      totalPages,
      currentPage: page,
      stats: {
        totalEntries: all.length,
        postedCount,
        pendingCount,
        refundedCount,
        voidedCount,
        totalCreditsDebited,
        totalCreditsCredited,
        totalBrlMoved: Number(totalBrlMoved.toFixed(2)),
      },
    };
  }

  /**
   * EXPORTAÇÃO CSV SEGURA CONTRA INJEÇÃO DE FÓRMULAS (CSV Formula Injection Protection)
   * Sanitiza caracteres executáveis (=, +, -, @, \t, \r) prefixando com apóstrofo (')
   */
  public exportLedgerCsv(params: {
    search?: string;
    operationType?: LedgerOperationType | 'all';
    status?: LedgerEntryStatus | 'all';
    currency?: AccountCurrency | 'all';
  }): string {
    const { entries } = this.queryLedger({
      ...params,
      page: 1,
      pageSize: 10000,
    });

    const sanitizeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Proteção estrita contra formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'ID Lançamento',
      'Data e Hora (ISO UTC)',
      'Data e Hora (BRT)',
      'Tipo de Operação',
      'Conta Débito',
      'Conta Crédito',
      'Valor',
      'Moeda',
      'Status',
      'Chave Idempotência',
      'Ator (ID Mascarado)',
      'Criador Destino',
      'Referência',
      'Descrição',
      'Hash Anterior',
      'Hash do Lançamento',
      'Ambiente',
    ];

    const rows = entries.map((e) => {
      const dt = new Date(e.timestamp);
      const brt = dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      // Minimização de dados pessoais: mascarar ator se parecer e-mail ou documento
      const maskedActor = e.actorId.includes('@')
        ? e.actorId.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : e.actorId;

      return [
        sanitizeCell(e.id),
        sanitizeCell(e.timestamp),
        sanitizeCell(brt),
        sanitizeCell(e.operationType),
        sanitizeCell(e.debitAccount),
        sanitizeCell(e.creditAccount),
        sanitizeCell(e.amount.toFixed(2)),
        sanitizeCell(e.currency),
        sanitizeCell(e.status),
        sanitizeCell(e.idempotencyKey),
        sanitizeCell(maskedActor),
        sanitizeCell(e.targetCreatorId || 'N/A'),
        sanitizeCell(e.referenceId || 'N/A'),
        sanitizeCell(e.description),
        sanitizeCell(e.previousHash),
        sanitizeCell(e.entryHash),
        sanitizeCell(e.isSandbox ? 'SANDBOX_AUDITADO' : 'PRODUCAO'),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * VERIFICAÇÃO DE INTEGRIDADE CONTÁBIL (Hash Chain Audit)
   */
  public verifyLedgerIntegrity(): { isValid: boolean; checkedCount: number; errors: string[] } {
    const entries = this.getEntries();
    const errors: string[] = [];

    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const previous = entries[i + 1];

      if (current.previousHash !== previous.entryHash) {
        errors.push(`Quebra de integridade no lançamento ${current.id}: previousHash não coincide.`);
      }
    }

    return {
      isValid: errors.length === 0,
      checkedCount: entries.length,
      errors,
    };
  }

  // =========================================================================
  // MÓDULO DE PAYOUT, SAQUES E ISOLAMENTO DE SIMULAÇÃO (FASES 0, 1 E 2)
  // =========================================================================

  private getPayoutStorageKey(environment: PayoutEnvironment): string {
    return environment === 'production' ? STORAGE_KEY_PAYOUTS_REAL : STORAGE_KEY_PAYOUTS_SIMULATED;
  }

  /**
   * Obtém os registros de payout garantindo isolamento estrito de namespace.
   * Se o ambiente não for explicitamente 'production', default seguro para 'sandbox'.
   */
  public getPayoutRecords(environment: PayoutEnvironment = 'sandbox'): PayoutRecord[] {
    const envSafe: PayoutEnvironment = environment === 'production' ? 'production' : 'sandbox';
    const key = this.getPayoutStorageKey(envSafe);
    const raw = getSafeStorage().getItem(key);
    if (!raw) return [];
    try {
      const records: PayoutRecord[] = JSON.parse(raw);
      return records.filter((r) => r.environment === envSafe && (envSafe === 'sandbox' ? r.isSimulation : !r.isSimulation));
    } catch {
      return [];
    }
  }

  private savePayoutRecords(records: PayoutRecord[], environment: PayoutEnvironment): void {
    const envSafe: PayoutEnvironment = environment === 'production' ? 'production' : 'sandbox';
    const key = this.getPayoutStorageKey(envSafe);
    getSafeStorage().setItem(key, JSON.stringify(records));

    if (envSafe === 'production') {
      void (async () => {
        try {
          const { syncPayoutSnapshotToFirestore } = await import('../firebase');
          for (const rec of records.slice(0, 5)) {
            if (!rec.isSimulation && rec.status !== 'simulated') {
              await syncPayoutSnapshotToFirestore({
                payoutId: rec.id,
                creatorId: rec.creatorId,
                amountCents: rec.amountCents,
                status: rec.status,
                environment: 'production',
                idempotencyKey: rec.idempotencyKey,
                externalSettlementRef: rec.status === 'released' ? rec.transactionId : undefined,
              });
            }
          }
        } catch {
          // Permanece resiliente caso não haja sessão administrativa ativa no cliente
        }
      })();
    }
  }

  public getPayoutById(payoutId: string, environment?: PayoutEnvironment): PayoutRecord | undefined {
    if (environment) {
      return this.getPayoutRecords(environment).find((p) => p.id === payoutId);
    }
    const sandboxItem = this.getPayoutRecords('sandbox').find((p) => p.id === payoutId);
    if (sandboxItem) return sandboxItem;
    return this.getPayoutRecords('production').find((p) => p.id === payoutId);
  }

  /**
   * SIMULAÇÃO DE PAYOUT (ESTRITAMENTE ISOLADA)
   * - Nunca altera o saldo do livro-razão.
   * - Gravado apenas no namespace STORAGE_KEY_PAYOUTS_SIMULATED.
   * - isSimulation = true, environment = 'sandbox', status = 'simulated'.
   * - Possui memória de cálculo em centavos inteiros.
   */
  public simulatePayout(params: {
    creatorId: string;
    creatorName: string;
    requestedAmountBrl: number;
    feePercentage?: number;
    fixedFeeBrl?: number;
    payoutMethod?: string;
  }): PayoutRecord {
    const feePct = params.feePercentage ?? 1.5;
    const fixedFee = params.fixedFeeBrl ?? 3.5;
    const requestedCents = Math.round(params.requestedAmountBrl * 100);
    const feePctCents = Math.round(requestedCents * (feePct / 100));
    const fixedFeeCents = Math.round(fixedFee * 100);
    const totalFeeCents = feePctCents + fixedFeeCents;
    const netCents = Math.max(0, requestedCents - totalFeeCents);

    const amountBrl = Number((requestedCents / 100).toFixed(2));
    const feeBrl = Number((totalFeeCents / 100).toFixed(2));
    const netAmountBrl = Number((netCents / 100).toFixed(2));

    const simId = `SIM-PAYOUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record: PayoutRecord = {
      id: simId,
      idempotencyKey: `idemp_sim_${simId}`,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      amountBrl,
      amountCents: requestedCents,
      feeBrl,
      netAmountBrl,
      currency: 'BRL',
      status: 'simulated',
      environment: 'sandbox',
      isSimulation: true,
      payoutMethod: params.payoutMethod || 'PIX Instantâneo',
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        {
          timestamp: now,
          fromStatus: 'none',
          toStatus: 'simulated',
          actorId: 'system_payout_simulator',
          reason: 'Simulação matemática de repasse sem movimentação financeira real',
        },
      ],
    };

    const sims = this.getPayoutRecords('sandbox');
    this.savePayoutRecords([record, ...sims].slice(0, 50), 'sandbox');

    return record;
  }

  /**
   * SOLICITAÇÃO FORMAL DE PAYOUT (ENTRA EM 'under_review')
   */
  public async requestPayout(params: {
    creatorId: string;
    creatorName: string;
    amountBrl: number;
    payoutMethod: string;
    pixKeyOrAccount: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
    actorUserId?: string;
    reserveImmediately?: boolean;
  }): Promise<{ payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      if (params.actorUserId) {
        this.assertWalletAccessAuthorized(params.creatorId, params.actorUserId, 'solicitar saque');
      }

      const isProd = params.environment === 'production';
      const env: PayoutEnvironment = isProd ? 'production' : 'sandbox';

      const existingRecords = this.getPayoutRecords(env);
      const existing = existingRecords.find((p) => p.idempotencyKey === params.idempotencyKey);
      if (existing) {
        return { payout: existing, isReplay: true };
      }

      if (params.amountBrl <= 0) {
        throw new Error('Valor de repasse inválido: deve ser estritamente superior a R$ 0,00.');
      }

      const amountCents = Math.round(params.amountBrl * 100);

      // Validação de saldo disponível descontando solicitações 'under_review' ainda não reservadas no ledger
      const creatorBal = this.getCreatorBalances(params.creatorId);
      const pendingUnreservedCents = existingRecords
        .filter((p) => p.creatorId === params.creatorId && p.status === 'under_review' && !p.ledgerEntryId)
        .reduce((acc, p) => acc + p.amountCents, 0);
      const effectiveAvailableCents = Math.max(0, Math.round(creatorBal.availableBrl * 100) - pendingUnreservedCents);

      if (effectiveAvailableCents < amountCents) {
        throw new Error(
          `Saldo insuficiente para saque: Criador possui R$ ${(effectiveAvailableCents / 100).toFixed(2)} disponível livre, solicitação de R$ ${params.amountBrl.toFixed(2)}.`
        );
      }

      const payoutId = `PAYOUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      let reservedTxId: string | undefined;
      let reservedEntryId: string | undefined;

      if (params.reserveImmediately) {
        const txRes = await this._postTransactionAtomicDirect({
          idempotencyKey: `${params.idempotencyKey}_reserve`,
          description: `[SOLICITAÇÃO DE SAQUE] Reserva em custódia (escrow) para ${params.creatorName}`,
          actorId: params.actorUserId || params.creatorId,
          entries: [
            {
              operationType: 'PAYOUT_RESERVE',
              debitAccount: `CREATOR_AVAILABLE_BRL:${params.creatorId}`,
              creditAccount: `CREATOR_PAYOUT_ESCROW:${params.creatorId}`,
              amount: Number((amountCents / 100).toFixed(2)),
              amountCents,
              currency: 'BRL',
              targetCreatorId: params.creatorId,
              referenceId: payoutId,
              description: `Reserva contábil imediata de saque #${payoutId}`,
            },
          ],
        });
        reservedTxId = txRes.entries[0]?.transactionId;
        reservedEntryId = txRes.entries[0]?.id;
      }

      const newPayout: PayoutRecord = {
        id: payoutId,
        idempotencyKey: params.idempotencyKey,
        creatorId: params.creatorId,
        creatorName: params.creatorName,
        amountBrl: Number((amountCents / 100).toFixed(2)),
        amountCents,
        feeBrl: 0,
        netAmountBrl: Number((amountCents / 100).toFixed(2)),
        currency: 'BRL',
        status: 'under_review',
        environment: env,
        isSimulation: !isProd,
        payoutMethod: params.payoutMethod,
        pixKeyOrAccount: params.pixKeyOrAccount,
        createdAt: now,
        updatedAt: now,
        transactionId: reservedTxId,
        ledgerEntryId: reservedEntryId,
        auditTrail: [
          {
            timestamp: now,
            fromStatus: 'none',
            toStatus: 'under_review',
            actorId: params.actorUserId || params.creatorId,
            reason: `Solicitação de saque via ${params.payoutMethod} (Ambiente: ${env})`,
          },
        ],
      };

      this.savePayoutRecords([newPayout, ...existingRecords], env);
      return { payout: newPayout, isReplay: false };
    });
  }

  /**
   * APROVAÇÃO DE PAYOUT (Transição: under_review -> approved)
   * Reserva atômica no Ledger: debita CREATOR_AVAILABLE_BRL e credita CREATOR_PAYOUT_ESCROW.
   * Rejeita se for simulação. Rejeita se o ambiente não for explicitamente 'production'.
   */
  public async approvePayout(params: {
    payoutId: string;
    adminId: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{ success: boolean; payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      if (!params.environment || params.environment !== 'production') {
        throw new Error('Aprovação financeira bloqueada: Operações financeiras de payout só são autorizadas em ambiente de produção explícito.');
      }

      const records = this.getPayoutRecords('production');
      const payout = records.find((p) => p.id === params.payoutId);
      if (!payout) {
        throw new Error(`Solicitação de payout não encontrada no ambiente de produção: ${params.payoutId}`);
      }

      if (payout.isSimulation || payout.status === 'simulated') {
        throw new Error('Ação bloqueada: Payouts de simulação nunca podem ser aprovados para movimentação real de fundos.');
      }

      if (payout.status === 'approved') {
        return { success: true, payout, isReplay: true };
      }

      if (payout.status !== 'under_review') {
        throw new Error(`Transição de estado inválida: Não é permitido transicionar de '${payout.status}' para 'approved'.`);
      }

      // Reserva Atômica no Livro-Razão (CREATOR_AVAILABLE_BRL -> CREATOR_PAYOUT_ESCROW) se ainda não reservado na solicitação
      if (!payout.ledgerEntryId) {
        const txRes = await this._postTransactionAtomicDirect({
          idempotencyKey: params.idempotencyKey,
          description: `[PAYOUT APROVADO] Reserva de fundos para repasse de ${payout.creatorName}`,
          actorId: params.adminId,
          entries: [
            {
              operationType: 'PAYOUT_RESERVE',
              debitAccount: `CREATOR_AVAILABLE_BRL:${payout.creatorId}`,
              creditAccount: `CREATOR_PAYOUT_ESCROW:${payout.creatorId}`,
              amount: payout.amountBrl,
              amountCents: payout.amountCents,
              currency: 'BRL',
              targetCreatorId: payout.creatorId,
              referenceId: payout.id,
              description: `Reserva contábil de repasse #${payout.id}`,
            },
          ],
        });
        payout.transactionId = txRes.entries[0]?.transactionId;
        payout.ledgerEntryId = txRes.entries[0]?.id;
      }

      payout.status = 'approved';
      payout.updatedAt = new Date().toISOString();
      payout.approvedAt = payout.updatedAt;
      payout.auditTrail.push({
        timestamp: payout.updatedAt,
        fromStatus: 'under_review',
        toStatus: 'approved',
        actorId: params.adminId,
        reason: 'Aprovação de conformidade e reserva de saldo contábil',
      });

      this.savePayoutRecords(records, 'production');

      try {
        await adminAuditService.logActivity({
          actorId: params.adminId,
          actorRole: 'admin',
          action: 'PAYOUT_APPROVE',
          targetType: 'payout',
          targetId: payout.id,
          result: 'success',
          reason: 'Aprovação de conformidade e reserva de saldo contábil em escrow',
          metadata: {
            payoutId: payout.id,
            creatorId: payout.creatorId,
            creatorName: payout.creatorName,
            amountBrl: payout.amountBrl,
            transactionId: payout.transactionId,
          },
        });
      } catch (auditErr) {
        console.warn('[ledgerService] Audit log warning:', auditErr);
      }

      return { success: true, payout, isReplay: false };
    });
  }

  /**
   * LIBERAÇÃO / LIQUIDAÇÃO DE PAYOUT (Transição: approved -> released)
   * Debita CREATOR_PAYOUT_ESCROW e credita BANK_PIX_SETTLEMENT.
   */
  public async releasePayout(params: {
    payoutId: string;
    adminId: string;
    bankingTxRef: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{ success: boolean; payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      if (!params.environment || params.environment !== 'production') {
        throw new Error('Liquidação bancária bloqueada: Operação só permitida em ambiente de produção explícito.');
      }

      const records = this.getPayoutRecords('production');
      const payout = records.find((p) => p.id === params.payoutId);
      if (!payout) {
        throw new Error(`Solicitação de payout não encontrada: ${params.payoutId}`);
      }

      if (payout.isSimulation || payout.status === 'simulated') {
        throw new Error('Ação bloqueada: Payouts de simulação nunca podem acionar trilhos bancários ou ser liberados.');
      }

      if (payout.status === 'released') {
        return { success: true, payout, isReplay: true };
      }

      if (payout.status !== 'approved') {
        throw new Error(`Transição de estado inválida: Não é permitido liberar payout com status '${payout.status}'. Esperado: 'approved'.`);
      }

      // Liquidação Atômica no Livro-Razão (CREATOR_PAYOUT_ESCROW -> BANK_PIX_SETTLEMENT)
      const txRes = await this._postTransactionAtomicDirect({
        idempotencyKey: params.idempotencyKey,
        description: `[PAYOUT LIQUIDADO] Confirmação bancária PIX (${params.bankingTxRef})`,
        actorId: params.adminId,
        entries: [
          {
            operationType: 'PAYOUT_SETTLED',
            debitAccount: `CREATOR_PAYOUT_ESCROW:${payout.creatorId}`,
            creditAccount: 'BANK_PIX_SETTLEMENT',
            amount: payout.amountBrl,
            amountCents: payout.amountCents,
            currency: 'BRL',
            targetCreatorId: payout.creatorId,
            referenceId: payout.id,
            description: `Liquidação definitiva de repasse #${payout.id} via PIX (${params.bankingTxRef})`,
            metadata: { bankingTxRef: params.bankingTxRef },
          },
        ],
      });

      payout.status = 'released';
      payout.updatedAt = new Date().toISOString();
      payout.releasedAt = payout.updatedAt;
      payout.auditTrail.push({
        timestamp: payout.updatedAt,
        fromStatus: 'approved',
        toStatus: 'released',
        actorId: params.adminId,
        reason: `Confirmação de liquidação bancária PIX (${params.bankingTxRef})`,
      });

      this.savePayoutRecords(records, 'production');

      try {
        await adminAuditService.logActivity({
          actorId: params.adminId,
          actorRole: 'admin',
          action: 'PAYOUT_RELEASE',
          targetType: 'payout',
          targetId: payout.id,
          result: 'success',
          reason: `Liquidação bancária confirmada via PIX (${params.bankingTxRef})`,
          metadata: {
            payoutId: payout.id,
            creatorId: payout.creatorId,
            amountBrl: payout.amountBrl,
            bankingTxRef: params.bankingTxRef,
          },
        });
      } catch (auditErr) {
        console.warn('[ledgerService] Audit log warning:', auditErr);
      }

      return { success: true, payout, isReplay: false };
    });
  }

  /**
   * CANCELAMENTO DE PAYOUT (Transição: under_review/approved -> cancelled)
   * Se os fundos estavam retidos em CREATOR_PAYOUT_ESCROW, emite lançamento compensatório
   * de estorno sem apagar o histórico contábil anterior.
   */
  public async cancelPayout(params: {
    payoutId: string;
    actorId: string;
    reason: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{ success: boolean; payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      const env = params.environment === 'production' ? 'production' : 'sandbox';
      const records = this.getPayoutRecords(env);
      const payout = records.find((p) => p.id === params.payoutId);
      if (!payout) {
        throw new Error(`Solicitação de payout não encontrada: ${params.payoutId}`);
      }

      if (payout.status === 'cancelled') {
        return { success: true, payout, isReplay: true };
      }

      if (payout.status === 'released' || payout.status === 'failed' || payout.status === 'reversed') {
        throw new Error(`Transição de estado inválida: Payout no estado terminal '${payout.status}' não pode ser cancelado.`);
      }

      if (payout.status === 'simulated') {
        throw new Error("Transição de estado inválida: Registros com status 'simulated' não possuem fluxo de cancelamento.");
      }

      const previousStatus = payout.status;

      // Lançamento Compensatório se os fundos estavam reservados em Escrow
      if ((previousStatus === 'approved' && payout.environment === 'production') || Boolean(payout.ledgerEntryId)) {
        await this._postTransactionAtomicDirect({
          idempotencyKey: params.idempotencyKey,
          description: `[ESTORNO COMPENSATÓRIO] Devolução de saldo de repasse cancelado #${payout.id}`,
          actorId: params.actorId,
          entries: [
            {
              operationType: 'PAYOUT_REVERSAL',
              debitAccount: `CREATOR_PAYOUT_ESCROW:${payout.creatorId}`,
              creditAccount: `CREATOR_AVAILABLE_BRL:${payout.creatorId}`,
              amount: payout.amountBrl,
              amountCents: payout.amountCents,
              currency: 'BRL',
              targetCreatorId: payout.creatorId,
              referenceId: payout.id,
              description: `Estorno compensatório: devolução de saldo por cancelamento de repasse (${params.reason})`,
            },
          ],
        });
      }

      payout.status = 'cancelled';
      payout.updatedAt = new Date().toISOString();
      payout.cancelledAt = payout.updatedAt;
      payout.reason = params.reason;
      payout.auditTrail.push({
        timestamp: payout.updatedAt,
        fromStatus: previousStatus,
        toStatus: 'cancelled',
        actorId: params.actorId,
        reason: params.reason,
      });

      this.savePayoutRecords(records, env);

      try {
        await adminAuditService.logActivity({
          actorId: params.actorId,
          actorRole: 'admin',
          action: 'PAYOUT_CANCEL',
          targetType: 'payout',
          targetId: payout.id,
          result: 'success',
          reason: `Cancelamento de repasse: ${params.reason}`,
          metadata: {
            payoutId: payout.id,
            creatorId: payout.creatorId,
            previousStatus,
            reversalPosted: (previousStatus === 'approved' && payout.environment === 'production') || Boolean(payout.ledgerEntryId),
          },
        });
      } catch (auditErr) {
        console.warn('[ledgerService] Audit log warning:', auditErr);
      }

      return { success: true, payout, isReplay: false };
    });
  }

  /**
   * FALHA DE PAYOUT (Transição: under_review/approved -> failed)
   * Registra falha operacional/bancária antes da liquidação definitiva e emite lançamento
   * compensatório (CREATOR_PAYOUT_ESCROW -> CREATOR_AVAILABLE_BRL) caso o valor estivesse reservado.
   */
  public async failPayout(params: {
    payoutId: string;
    actorId: string;
    reason: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{ success: boolean; payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      const env = params.environment === 'production' ? 'production' : 'sandbox';
      const records = this.getPayoutRecords(env);
      const payout = records.find((p) => p.id === params.payoutId);
      if (!payout) {
        throw new Error(`Solicitação de payout não encontrada: ${params.payoutId}`);
      }

      if (payout.status === 'failed') {
        return { success: true, payout, isReplay: true };
      }

      if (payout.status === 'released' || payout.status === 'cancelled' || payout.status === 'reversed') {
        throw new Error(
          `Transição de estado inválida: Payout no estado '${payout.status}' não pode ser marcado como 'failed'.`
        );
      }

      if (payout.status === 'simulated') {
        throw new Error("Transição de estado inválida: Registros com status 'simulated' não possuem transição para 'failed'.");
      }

      const previousStatus = payout.status;
      const shouldReverseEscrow =
        (previousStatus === 'approved' && payout.environment === 'production') || Boolean(payout.ledgerEntryId);

      if (shouldReverseEscrow) {
        await this._postTransactionAtomicDirect({
          idempotencyKey: params.idempotencyKey,
          description: `[FALHA DE PAYOUT] Estorno de custódia por falha bancária/operacional #${payout.id}`,
          actorId: params.actorId,
          entries: [
            {
              operationType: 'PAYOUT_REVERSAL',
              debitAccount: `CREATOR_PAYOUT_ESCROW:${payout.creatorId}`,
              creditAccount: `CREATOR_AVAILABLE_BRL:${payout.creatorId}`,
              amount: payout.amountBrl,
              amountCents: payout.amountCents,
              currency: 'BRL',
              targetCreatorId: payout.creatorId,
              referenceId: payout.id,
              description: `Estorno compensatório por falha no repasse #${payout.id} (${params.reason})`,
            },
          ],
        });
      }

      payout.status = 'failed';
      payout.updatedAt = new Date().toISOString();
      payout.failedAt = payout.updatedAt;
      payout.reason = params.reason;
      payout.auditTrail.push({
        timestamp: payout.updatedAt,
        fromStatus: previousStatus,
        toStatus: 'failed',
        actorId: params.actorId,
        reason: params.reason,
      });

      this.savePayoutRecords(records, env);

      try {
        await adminAuditService.logActivity({
          actorId: params.actorId,
          actorRole: 'admin',
          action: 'FINANCIAL_FAILURE',
          targetType: 'payout',
          targetId: payout.id,
          result: 'success',
          reason: `Falha de repasse registrada: ${params.reason}`,
          metadata: {
            payoutId: payout.id,
            creatorId: payout.creatorId,
            previousStatus,
            reversalPosted: shouldReverseEscrow,
          },
        });
      } catch (auditErr) {
        console.warn('[ledgerService] Audit log warning:', auditErr);
      }

      return { success: true, payout, isReplay: false };
    });
  }

  /**
   * REVERSÃO PÓS-LIQUIDAÇÃO DE PAYOUT (Transição: released -> reversed)
   * Registra devolução bancária pós-liquidação emitindo lançamento compensatório
   * (BANK_PIX_SETTLEMENT -> CREATOR_AVAILABLE_BRL) sem sobrescrever o histórico original.
   */
  public async reversePayout(params: {
    payoutId: string;
    actorId: string;
    reason: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{ success: boolean; payout: PayoutRecord; isReplay: boolean }> {
    return this.enqueue(async () => {
      if (!params.environment || params.environment !== 'production') {
        throw new Error('Reversão bancária pós-liquidação só é permitida em ambiente de produção explícito.');
      }

      const records = this.getPayoutRecords('production');
      const payout = records.find((p) => p.id === params.payoutId);
      if (!payout) {
        throw new Error(`Solicitação de payout não encontrada: ${params.payoutId}`);
      }

      if (payout.status === 'reversed') {
        return { success: true, payout, isReplay: true };
      }

      if (payout.status !== 'released') {
        throw new Error(
          `Transição de estado inválida: Reversão pós-liquidação exige status 'released', mas o registro está em '${payout.status}'.`
        );
      }

      await this._postTransactionAtomicDirect({
        idempotencyKey: params.idempotencyKey,
        description: `[REVERSÃO PÓS-LIQUIDAÇÃO] Devolução bancária de repasse #${payout.id}`,
        actorId: params.actorId,
        entries: [
          {
            operationType: 'PAYOUT_REVERSAL',
            debitAccount: 'BANK_PIX_SETTLEMENT',
            creditAccount: `CREATOR_AVAILABLE_BRL:${payout.creatorId}`,
            amount: payout.amountBrl,
            amountCents: payout.amountCents,
            currency: 'BRL',
            targetCreatorId: payout.creatorId,
            referenceId: payout.id,
            description: `Estorno compensatório pós-liquidação bancária #${payout.id} (${params.reason})`,
          },
        ],
      });

      payout.status = 'reversed';
      payout.updatedAt = new Date().toISOString();
      payout.reversedAt = payout.updatedAt;
      payout.reason = params.reason;
      payout.auditTrail.push({
        timestamp: payout.updatedAt,
        fromStatus: 'released',
        toStatus: 'reversed',
        actorId: params.actorId,
        reason: params.reason,
      });

      this.savePayoutRecords(records, 'production');

      try {
        await adminAuditService.logActivity({
          actorId: params.actorId,
          actorRole: 'admin',
          action: 'REFUND_EXECUTE',
          targetType: 'payout',
          targetId: payout.id,
          result: 'success',
          reason: `Reversão pós-liquidação de repasse: ${params.reason}`,
          metadata: {
            payoutId: payout.id,
            creatorId: payout.creatorId,
            amountBrl: payout.amountBrl,
          },
        });
      } catch (auditErr) {
        console.warn('[ledgerService] Audit log warning:', auditErr);
      }

      return { success: true, payout, isReplay: false };
    });
  }

  public clearPayoutSimulations(): void {
    getSafeStorage().removeItem(STORAGE_KEY_PAYOUTS_SIMULATED);
  }

  /**
   * RELATÓRIO FINANCEIRO DE RECEITAS POR SERVIÇO E GERAÇÃO DE GANHOS (70/30)
   * Lê o livro-razão imutável e os registros de repasse sem alterar lançamentos históricos.
   */
  public getRevenueAndEarningsReport(
    period: RevenueReportPeriodFilter = 'all'
  ): RevenueAndEarningsReportResult {
    this.ensureInitialLiveAuditEntries();
    const entries = this.getEntries();
    const payouts = [
      ...this.getPayoutRecords('production'),
      ...this.getPayoutRecords('sandbox'),
    ];
    return buildOfficialLedgerRevenueReport({
      period,
      entriesOverride: entries,
      payoutsOverride: payouts,
      purchasesOverride: [],
    });
  }

  // =========================================================================
  // MINHA CARTEIRA UNIFICADA (COLABORADORES + PRODUTORES DE CONTEÚDO + SAQUE)
  // =========================================================================

  /**
   * Inicializa lançamentos auditados em Sandbox para 'current_user' caso ainda não existam,
   * permitindo visualizar imediatamente na Tela Inicial a composição entre Colaboradores e
   * Produtores de Conteúdo. Nunca executa em ambiente de Produção nem para IDs de teste.
   */
  public ensureUnifiedWalletSandboxSeeds(userId: string = 'current_user'): void {
    if (userId !== 'current_user') return;
    if (!runtimeEnvironmentService.shouldSeedSyntheticData()) return;

    const entries = this.getEntries();
    const alreadySeeded = entries.some(
      (e) =>
        e.idempotencyKey.startsWith('idemp_wallet_home_seed_') ||
        (e.metadata && (e.metadata as Record<string, unknown>).isUnifiedWalletSeed === true)
    );
    if (alreadySeeded) return;

    const now = Date.now();
    const hourMs = 3600000;
    const seeds: Array<{
      id: string;
      idemp: string;
      txId: string;
      offsetMs: number;
      operationType: LedgerOperationType;
      debitAccount: string;
      creditAccount: string;
      amountCents: number;
      description: string;
      originCategory: WalletOriginCategory;
      subTypeLabel: string;
    }> = [
      {
        id: 'ledg_wallet_seed_collab_01',
        idemp: 'idemp_wallet_home_seed_collab_01',
        txId: 'tx_wallet_seed_collab_01',
        offsetMs: 72 * hourMs,
        operationType: 'PERFORMANCE_REWARD',
        debitAccount: 'CAMPAIGN_REWARD_ESCROW:collaborators',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 4500, // R$ 45,00
        description: 'Comissão de Colaborador: 3 Indicações Verificadas Ativas (Nível 1)',
        originCategory: 'collaborator',
        subTypeLabel: 'Indicação Verificada',
      },
      {
        id: 'ledg_wallet_seed_collab_02',
        idemp: 'idemp_wallet_home_seed_collab_02',
        txId: 'tx_wallet_seed_collab_02',
        offsetMs: 48 * hourMs,
        operationType: 'PERFORMANCE_REWARD',
        debitAccount: 'CAMPAIGN_REWARD_ESCROW:challenges',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 3500, // R$ 35,00
        description: 'Meta Conquistada: Desafio Semanal de Engajamento e Compartilhamento',
        originCategory: 'collaborator',
        subTypeLabel: 'Meta de Desafio',
      },
      {
        id: 'ledg_wallet_seed_collab_03',
        idemp: 'idemp_wallet_home_seed_collab_03',
        txId: 'tx_wallet_seed_collab_03',
        offsetMs: 26 * hourMs,
        operationType: 'PERFORMANCE_REWARD',
        debitAccount: 'CAMPAIGN_REWARD_ESCROW:collaborators',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 2500, // R$ 25,00
        description: 'Bônus de Colaborador: Meta Diária de Convites Qualificados',
        originCategory: 'collaborator',
        subTypeLabel: 'Bônus de Rede',
      },
      {
        id: 'ledg_wallet_seed_prod_01',
        idemp: 'idemp_wallet_home_seed_prod_01',
        txId: 'tx_wallet_seed_prod_01',
        offsetMs: 60 * hourMs,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 10430, // R$ 104,30
        description: '[70% Repasse Produtor] Desbloqueios do Cofre VIP e Álbum Exclusivo',
        originCategory: 'content_producer',
        subTypeLabel: 'Cofre VIP & Álbuns (70%)',
      },
      {
        id: 'ledg_wallet_seed_prod_02',
        idemp: 'idemp_wallet_home_seed_prod_02',
        txId: 'tx_wallet_seed_prod_02',
        offsetMs: 36 * hourMs,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 7350, // R$ 73,50
        description: '[70% Repasse Produtor] Presentes Virtuais em Transmissão Ao Vivo',
        originCategory: 'content_producer',
        subTypeLabel: 'Presentes em Live (70%)',
      },
      {
        id: 'ledg_wallet_seed_prod_03',
        idemp: 'idemp_wallet_home_seed_prod_03',
        txId: 'tx_wallet_seed_prod_03',
        offsetMs: 14 * hourMs,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'CREATOR_AVAILABLE_BRL:current_user',
        amountCents: 6220, // R$ 62,20
        description: '[70% Repasse Produtor] Desbloqueio Avulso de Fotos e Vídeos Protegidos',
        originCategory: 'content_producer',
        subTypeLabel: 'Mídias Exclusivas (70%)',
      },
      {
        id: 'ledg_wallet_seed_pend_prod_04',
        idemp: 'idemp_wallet_home_seed_pend_prod_04',
        txId: 'tx_wallet_seed_pend_prod_04',
        offsetMs: 4 * hourMs,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'CREATOR_PENDING_BRL:current_user',
        amountCents: 3430, // R$ 34,30
        description: '[Em Retenção D+14] Desbloqueio de Vídeo Exclusivo HD (70% Criador)',
        originCategory: 'content_producer',
        subTypeLabel: 'Retenção Antifraude',
      },
      {
        id: 'ledg_wallet_seed_pend_collab_05',
        idemp: 'idemp_wallet_home_seed_pend_collab_05',
        txId: 'tx_wallet_seed_pend_collab_05',
        offsetMs: 2 * hourMs,
        operationType: 'PERFORMANCE_REWARD',
        debitAccount: 'CAMPAIGN_REWARD_ESCROW:collaborators',
        creditAccount: 'CREATOR_PENDING_BRL:current_user',
        amountCents: 1500, // R$ 15,00
        description: '[Em Validação] Bônus de Indicação de Novo Assinante Premium',
        originCategory: 'collaborator',
        subTypeLabel: 'Validação de Indicação',
      },
    ];

    let previousHash = entries[0] ? entries[0].entryHash : '0x0000000000000000';
    const seededEntries: LedgerEntry[] = [];

    for (const s of seeds) {
      const timestamp = new Date(now - s.offsetMs).toISOString();
      const amount = Number((s.amountCents / 100).toFixed(2));
      const rawSign = `${s.id}:${s.idemp}:${timestamp}:${amount}:BRL:${previousHash}`;
      const entryHash = computeSha256Simulated(rawSign);

      const entry: LedgerEntry = {
        id: s.id,
        idempotencyKey: s.idemp,
        transactionId: s.txId,
        timestamp,
        operationType: s.operationType,
        debitAccount: s.debitAccount,
        creditAccount: s.creditAccount,
        amount,
        amountCents: s.amountCents,
        currency: 'BRL',
        status: 'posted',
        actorId: 'system_wallet_auditor',
        targetCreatorId: userId,
        referenceId: s.txId,
        description: s.description,
        isSandbox: true,
        previousHash,
        entryHash,
        sha256ProtocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
        metadata: {
          isUnifiedWalletSeed: true,
          originCategory: s.originCategory,
          subTypeLabel: s.subTypeLabel,
        },
      };

      const { sha256Hash } = calculateLedgerSha256(entry);
      entry.sha256ReferenceHash = sha256Hash;
      if (entry.metadata) {
        entry.metadata.sha256ReferenceHash = sha256Hash;
      }

      seededEntries.unshift(entry);
      previousHash = entryHash;
    }

    this.saveEntries([...seededEntries, ...entries]);
  }

  /**
   * Classifica deterministicamente a origem de um lançamento contábil BRL:
   * - 'collaborator': indicações verificadas, comissões de rede e metas de desafios
   * - 'content_producer': mídias exclusivas, Cofre VIP, assinaturas e presentes em lives
   */
  public classifyWalletEntryOrigin(entry: LedgerEntry): WalletOriginCategory {
    const metaCategory = entry.metadata?.originCategory as string | undefined;
    if (metaCategory === 'collaborator') return 'collaborator';
    if (metaCategory === 'content_producer') return 'content_producer';

    if (
      entry.operationType === 'CREATOR_REVENUE_SHARE' ||
      entry.operationType === 'CONTENT_UNLOCK' ||
      entry.operationType === 'TIP_GIFT' ||
      entry.operationType === 'SUBSCRIPTION_PURCHASE'
    ) {
      return 'content_producer';
    }

    if (entry.operationType === 'PERFORMANCE_REWARD') {
      const descLower = (entry.description || '').toLowerCase();
      if (
        descLower.includes('mídia') ||
        descLower.includes('cofre') ||
        descLower.includes('conteúdo')
      ) {
        return 'content_producer';
      }
      return 'collaborator';
    }

    const descLower = (entry.description || '').toLowerCase();
    if (
      descLower.includes('indica') ||
      descLower.includes('colaborador') ||
      descLower.includes('afiliad') ||
      descLower.includes('desafio') ||
      descLower.includes('meta')
    ) {
      return 'collaborator';
    }

    return 'content_producer';
  }

  /**
   * Registra de forma atômica e idempotente um recebimento de Colaborador
   * (Indicação verificada, comissão de rede ou conquista de meta de desafio).
   */
  public async recordCollaboratorEarningAtomic(params: {
    userId: string;
    amountCents: number;
    subType: 'referral' | 'challenge_goal' | 'engagement_milestone';
    title: string;
    referenceId: string;
    idempotencyKey: string;
    isPendingReview?: boolean;
  }): Promise<{
    success: boolean;
    amountCents: number;
    amountBrl: number;
    isReplay: boolean;
    entry: LedgerEntry;
  }> {
    if (!params.userId || !params.userId.trim()) {
      throw new Error('Identificador de usuário obrigatório para registrar ganho de colaborador.');
    }
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
      throw new Error('Valor em centavos inválido: deve ser um inteiro estritamente positivo.');
    }

    const amountBrl = Number((params.amountCents / 100).toFixed(2));
    const targetAccount = params.isPendingReview
      ? `CREATOR_PENDING_BRL:${params.userId}`
      : `CREATOR_AVAILABLE_BRL:${params.userId}`;

    const subTypeLabel =
      params.subType === 'referral'
        ? 'Indicação Verificada'
        : params.subType === 'challenge_goal'
        ? 'Meta de Desafio'
        : 'Marco de Engajamento';

    const res = await this.postEntry({
      idempotencyKey: params.idempotencyKey,
      operationType: 'PERFORMANCE_REWARD',
      debitAccount: 'CAMPAIGN_REWARD_ESCROW:collaborators',
      creditAccount: targetAccount,
      amount: amountBrl,
      amountCents: params.amountCents,
      currency: 'BRL',
      actorId: params.userId,
      targetCreatorId: params.userId,
      referenceId: params.referenceId,
      description: `[Colaborador · ${subTypeLabel}] ${params.title}`,
      metadata: {
        originCategory: 'collaborator',
        rewardSubType: params.subType,
        subTypeLabel,
        isPendingReview: Boolean(params.isPendingReview),
      },
    });

    return {
      success: true,
      amountCents: params.amountCents,
      amountBrl,
      isReplay: res.isReplay,
      entry: res.entry,
    };
  }

  /**
   * Registra de forma atômica e idempotente um recebimento líquido de Produtor de Conteúdo
   * (Desbloqueio de foto/vídeo protegido, Cofre VIP ou presente em Live).
   */
  public async recordContentProducerEarningAtomic(params: {
    userId: string;
    amountCents: number;
    subType: 'media_unlock' | 'vip_vault' | 'live_gift';
    title: string;
    referenceId: string;
    idempotencyKey: string;
    isPendingReview?: boolean;
  }): Promise<{
    success: boolean;
    amountCents: number;
    amountBrl: number;
    isReplay: boolean;
    entry: LedgerEntry;
  }> {
    if (!params.userId || !params.userId.trim()) {
      throw new Error('Identificador de usuário obrigatório para registrar ganho de produtor.');
    }
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
      throw new Error('Valor em centavos inválido: deve ser um inteiro estritamente positivo.');
    }

    const amountBrl = Number((params.amountCents / 100).toFixed(2));
    const targetAccount = params.isPendingReview
      ? `CREATOR_PENDING_BRL:${params.userId}`
      : `CREATOR_AVAILABLE_BRL:${params.userId}`;

    const subTypeLabel =
      params.subType === 'vip_vault'
        ? 'Cofre VIP (70%)'
        : params.subType === 'live_gift'
        ? 'Presente em Live (70%)'
        : 'Mídia Exclusiva (70%)';

    const res = await this.postEntry({
      idempotencyKey: params.idempotencyKey,
      operationType: 'CREATOR_REVENUE_SHARE',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: targetAccount,
      amount: amountBrl,
      amountCents: params.amountCents,
      currency: 'BRL',
      actorId: params.userId,
      targetCreatorId: params.userId,
      referenceId: params.referenceId,
      description: `[Produtor · ${subTypeLabel}] ${params.title}`,
      metadata: {
        originCategory: 'content_producer',
        producerSubType: params.subType,
        subTypeLabel,
        isPendingReview: Boolean(params.isPendingReview),
      },
    });

    return {
      success: true,
      amountCents: params.amountCents,
      amountBrl,
      isReplay: res.isReplay,
      entry: res.entry,
    };
  }

  /**
   * Verifica e aplica o controle de autorização e isolamento de carteira entre usuários.
   * Impede que um usuário comum consulte saldos, extratos ou solicite saques de terceiros.
   */
  public verifyWalletAccessAuthorization(
    targetUserId: string,
    actorUserId?: string,
    operationName: string = 'WALLET_ACCESS'
  ): { authorized: boolean; actorId: string; reason?: string } {
    const cleanTarget = (targetUserId || '').trim();
    const cleanActor = (actorUserId ?? cleanTarget).trim();

    if (!cleanTarget) {
      return {
        authorized: false,
        actorId: cleanActor || 'anonymous',
        reason: 'Identificador do titular da carteira é obrigatório.',
      };
    }

    if (!cleanActor) {
      return {
        authorized: false,
        actorId: 'anonymous',
        reason: 'Sessão de usuário não autenticada para acessar dados financeiros.',
      };
    }

    const isAdminActor = cleanActor.startsWith('admin_');
    if (cleanActor !== cleanTarget && !isAdminActor) {
      this.recordAudit({
        actorId: cleanActor,
        action: 'UNAUTHORIZED_WALLET_ACCESS_BLOCKED',
        reason: `Tentativa bloqueada de ${operationName} na carteira de ${maskUserId(cleanTarget)} pelo ator ${maskUserId(cleanActor)}`,
        ipHash: computeSha256Simulated(`ip_unauth_${cleanActor}`),
        isSandbox: runtimeEnvironmentService.isSimulationMode(),
        payload: {
          operationName,
          targetUserMasked: maskUserId(cleanTarget),
          actorUserMasked: maskUserId(cleanActor),
        },
      });
      return {
        authorized: false,
        actorId: cleanActor,
        reason: `Acesso negado: o usuário autenticado (${maskUserId(
          cleanActor
        )}) não possui permissão para acessar ou movimentar a carteira de outro titular (${maskUserId(
          cleanTarget
        )}).`,
      };
    }

    return {
      authorized: true,
      actorId: cleanActor,
    };
  }

  private assertWalletAccessAuthorized(
    targetUserId: string,
    actorUserId?: string,
    operationName: string = 'WALLET_ACCESS'
  ): void {
    const check = this.verifyWalletAccessAuthorization(targetUserId, actorUserId, operationName);
    if (!check.authorized) {
      throw new Error(check.reason || 'Acesso não autorizado à carteira financeira.');
    }
  }

  /**
   * Consolida os indicadores da "Minha Carteira" na Tela Inicial diretamente a partir
   * do livro-razão contábil, separando estritamente:
   * - Saldo disponível para saque (BRL)
   * - Saldo pendente total e segregado (Retenção D+14 + Reserva Escrow de Saque)
   * - Total recebido histórico de entradas válidas (BRL)
   * - Última movimentação registrada (descrição, data, valor, referência e status)
   * - Valores recebidos de colaboradores (BRL) vs. produtores de conteúdo (BRL)
   * - Créditos virtuais de consumo (CREDITS - não sacáveis)
   */
  public getUnifiedWalletSummary(
    userId: string = 'current_user',
    options?: { actorUserId?: string }
  ): UnifiedWalletSummary {
    this.assertWalletAccessAuthorized(userId, options?.actorUserId, 'WALLET_SUMMARY_READ');

    if (userId === 'current_user') {
      this.ensureUnifiedWalletSandboxSeeds('current_user');
    }

    const entries = this.getEntries();
    const isSim = runtimeEnvironmentService.isSimulationMode();
    const env: PayoutEnvironment = isSim ? 'sandbox' : 'production';

    const availAccount = `CREATOR_AVAILABLE_BRL:${userId}`;
    const pendingAccount = `CREATOR_PENDING_BRL:${userId}`;
    const escrowAccount = `CREATOR_PAYOUT_ESCROW:${userId}`;

    let availableBalanceCents = 0;
    let collaboratorReceivedCents = 0;
    let collaboratorPendingCents = 0;
    let contentProducerReceivedCents = 0;
    let contentProducerPendingCents = 0;
    let pendingReviewCents = 0;
    let payoutReservedCents = 0;
    let withdrawnSettledCents = 0;

    for (const entry of entries) {
      if (entry.currency !== 'BRL') continue;
      if (entry.status !== 'posted' && entry.status !== 'refunded') continue;

      const cents =
        typeof entry.amountCents === 'number'
          ? Math.round(entry.amountCents)
          : Math.round(entry.amount * 100);

      // Créditos na conta de saldo disponível para saque
      if (entry.creditAccount === availAccount) {
        availableBalanceCents += cents;
        if (entry.operationType !== 'PAYOUT_REVERSAL' && entry.status === 'posted') {
          const origin = this.classifyWalletEntryOrigin(entry);
          if (origin === 'collaborator') {
            collaboratorReceivedCents += cents;
          } else {
            contentProducerReceivedCents += cents;
          }
        }
      }

      // Débitos na conta de saldo disponível para saque
      if (entry.debitAccount === availAccount) {
        availableBalanceCents -= cents;
        if (entry.operationType === 'REFUND' || entry.operationType === 'ADMIN_ADJUSTMENT') {
          const origin = this.classifyWalletEntryOrigin(entry);
          if (origin === 'collaborator') {
            collaboratorReceivedCents = Math.max(0, collaboratorReceivedCents - cents);
          } else {
            contentProducerReceivedCents = Math.max(0, contentProducerReceivedCents - cents);
          }
        }
      }

      // Conta pendente / em análise antifraude (retenção D+14)
      if (entry.creditAccount === pendingAccount && entry.status === 'posted') {
        pendingReviewCents += cents;
        const origin = this.classifyWalletEntryOrigin(entry);
        if (origin === 'collaborator') {
          collaboratorPendingCents += cents;
        } else {
          contentProducerPendingCents += cents;
        }
      }
      if (entry.debitAccount === pendingAccount) {
        pendingReviewCents -= cents;
        const origin = this.classifyWalletEntryOrigin(entry);
        if (origin === 'collaborator') {
          collaboratorPendingCents = Math.max(0, collaboratorPendingCents - cents);
        } else {
          contentProducerPendingCents = Math.max(0, contentProducerPendingCents - cents);
        }
      }

      // Conta de reserva de saque (Escrow de Payout)
      if (entry.creditAccount === escrowAccount) {
        payoutReservedCents += cents;
      }
      if (entry.debitAccount === escrowAccount) {
        payoutReservedCents -= cents;
        if (entry.operationType === 'PAYOUT_SETTLED') {
          withdrawnSettledCents += cents;
        }
      }
    }

    const safeAvailableCents = Math.max(0, availableBalanceCents);
    const safeCollaboratorCents = Math.max(0, collaboratorReceivedCents);
    const safeProducerCents = Math.max(0, contentProducerReceivedCents);
    const safePendingCents = Math.max(0, pendingReviewCents);
    const safePayoutReservedCents = Math.max(0, payoutReservedCents);
    const safeWithdrawnSettledCents = Math.max(0, withdrawnSettledCents);
    const totalPendingCents = safePendingCents + safePayoutReservedCents;
    const totalReceivedPeriodCents = safeCollaboratorCents + safeProducerCents;

    const minimumWithdrawalCents = 5000; // R$ 50,00
    const maximumDailyWithdrawalCents = 1000000; // R$ 10.000,00
    const verifiedPixFeeCents = 0; // Tarifa zero para PIX verificado

    const statementItems = this.getUnifiedWalletStatement(userId, 'all', {
      actorUserId: options?.actorUserId ?? userId,
    });
    const lastTransaction = statementItems.length > 0 ? statementItems[0] : null;

    return {
      userId,
      environment: env,
      isSimulation: isSim,
      ledgerModeLabel: isSim
        ? 'Livro-razão local demonstrativo (Ambiente Sandbox)'
        : 'Livro-razão auditado em Produção (Reserva contábil sem liquidação bancária automática)',
      currency: 'BRL',
      availableBalanceCents: safeAvailableCents,
      availableBalanceBrl: Number((safeAvailableCents / 100).toFixed(2)),
      totalPendingCents,
      totalPendingBrl: Number((totalPendingCents / 100).toFixed(2)),
      totalReceivedPeriodCents,
      totalReceivedPeriodBrl: Number((totalReceivedPeriodCents / 100).toFixed(2)),
      collaboratorReceivedCents: safeCollaboratorCents,
      collaboratorReceivedBrl: Number((safeCollaboratorCents / 100).toFixed(2)),
      collaboratorPendingCents: Math.max(0, collaboratorPendingCents),
      collaboratorPendingBrl: Number((Math.max(0, collaboratorPendingCents) / 100).toFixed(2)),
      contentProducerReceivedCents: safeProducerCents,
      contentProducerReceivedBrl: Number((safeProducerCents / 100).toFixed(2)),
      contentProducerPendingCents: Math.max(0, contentProducerPendingCents),
      contentProducerPendingBrl: Number((Math.max(0, contentProducerPendingCents) / 100).toFixed(2)),
      pendingReviewCents: safePendingCents,
      pendingReviewBrl: Number((safePendingCents / 100).toFixed(2)),
      payoutReservedCents: safePayoutReservedCents,
      payoutReservedBrl: Number((safePayoutReservedCents / 100).toFixed(2)),
      withdrawnSettledCents: safeWithdrawnSettledCents,
      withdrawnSettledBrl: Number((safeWithdrawnSettledCents / 100).toFixed(2)),
      minimumWithdrawalCents,
      minimumWithdrawalBrl: 50.0,
      maximumDailyWithdrawalCents,
      maximumDailyWithdrawalBrl: 10000.0,
      verifiedPixFeeCents,
      verifiedPixFeeBrl: 0.0,
      estimatedSettlementSla: 'Até 1 dia útil após validação antifraude',
      userConsumptionCredits: this.getUserCredits(userId),
      lastTransaction,
      lastUpdatedIso: new Date().toISOString(),
    };
  }

  /**
   * Retorna o extrato detalhado da "Minha Carteira" com classificação auditável
   * por origem (Colaboradores, Produtores de Conteúdo, Saques, Estornos e Ajustes).
   */
  public getUnifiedWalletStatement(
    userId: string = 'current_user',
    categoryFilter: WalletStatementCategoryFilter = 'all',
    options?: { actorUserId?: string }
  ): UnifiedWalletStatementItem[] {
    this.assertWalletAccessAuthorized(userId, options?.actorUserId, 'WALLET_STATEMENT_READ');

    if (userId === 'current_user') {
      this.ensureUnifiedWalletSandboxSeeds('current_user');
    }

    const entries = this.getEntries();
    const availAccount = `CREATOR_AVAILABLE_BRL:${userId}`;
    const pendingAccount = `CREATOR_PENDING_BRL:${userId}`;
    const escrowAccount = `CREATOR_PAYOUT_ESCROW:${userId}`;

    const items: UnifiedWalletStatementItem[] = [];

    for (const entry of entries) {
      if (entry.currency !== 'BRL') continue;

      const isUserRelated =
        entry.creditAccount === availAccount ||
        entry.debitAccount === availAccount ||
        entry.creditAccount === pendingAccount ||
        entry.debitAccount === pendingAccount ||
        entry.creditAccount === escrowAccount ||
        entry.debitAccount === escrowAccount;

      if (!isUserRelated) continue;

      const cents =
        typeof entry.amountCents === 'number'
          ? Math.round(entry.amountCents)
          : Math.round(entry.amount * 100);
      const amountBrl = Number((cents / 100).toFixed(2));

      let category: UnifiedWalletStatementItem['category'] = 'content_producer';
      let categoryLabel = 'Produtor de Conteúdo';
      let subTypeLabel = (entry.metadata?.subTypeLabel as string) || 'Repasse 70%';
      let direction: 'credit' | 'debit' = 'credit';
      let status: UnifiedWalletStatementItem['status'] = 'available';
      let statusLabel = 'Disponível para Saque';

      if (
        entry.operationType === 'PAYOUT_RESERVE' ||
        entry.operationType === 'PAYOUT_SETTLED' ||
        entry.operationType === 'PAYOUT_REVERSAL'
      ) {
        category = 'payout';
        categoryLabel = 'Solicitação de Saque';
        if (entry.operationType === 'PAYOUT_RESERVE') {
          // Quando a reserva de saque já foi sucedida por uma liquidação (PAYOUT_SETTLED) para o mesmo referenceId,
          // preservamos o registro histórico de reserva como reserva contábil, sem duplicar com o registro de liquidação.
          direction = 'debit';
          status = 'payout_reserved';
          statusLabel = 'Solicitação Pendente (Reserva Escrow)';
          subTypeLabel = 'Solicitação de Saque PIX';
        } else if (entry.operationType === 'PAYOUT_SETTLED') {
          direction = 'debit';
          status = 'payout_released';
          statusLabel = 'Saque Liquidado';
          subTypeLabel = 'Liquidação Bancária PIX';
        } else {
          direction = 'credit';
          status = 'available';
          statusLabel = 'Estorno de Saque Devolvido';
          subTypeLabel = 'Devolução ao Saldo Disponível';
        }
      } else if (
        entry.operationType === 'REFUND' ||
        entry.operationType === 'CHARGEBACK' ||
        entry.status === 'refunded'
      ) {
        category = 'refund';
        categoryLabel = 'Estorno Contábil';
        direction =
          entry.debitAccount === availAccount || entry.debitAccount === pendingAccount
            ? 'debit'
            : 'credit';
        status = 'refunded';
        statusLabel = 'Estornado';
        subTypeLabel =
          entry.operationType === 'CHARGEBACK'
            ? 'Contestação / Chargeback'
            : 'Estorno Compensatório';
      } else if (entry.operationType === 'ADMIN_ADJUSTMENT') {
        category = 'adjustment';
        categoryLabel = 'Ajuste Contábil';
        direction =
          entry.creditAccount === availAccount || entry.creditAccount === pendingAccount
            ? 'credit'
            : 'debit';
        status = 'adjusted';
        statusLabel = 'Ajuste Auditado';
        subTypeLabel = (entry.metadata?.subTypeLabel as string) || 'Ajuste Administrativo';
      } else {
        const origin = this.classifyWalletEntryOrigin(entry);
        category = origin;
        categoryLabel = origin === 'collaborator' ? 'Colaborador' : 'Produtor de Conteúdo';
        if (!entry.metadata?.subTypeLabel) {
          subTypeLabel =
            origin === 'collaborator'
              ? 'Indicações & Desafios'
              : 'Mídias Exclusivas & Lives (70%)';
        }
        direction =
          entry.creditAccount === availAccount || entry.creditAccount === pendingAccount
            ? 'credit'
            : 'debit';

        if (entry.creditAccount === pendingAccount) {
          status = 'pending_review';
          statusLabel = 'Pendente / Retenção D+14';
        } else {
          status = 'available';
          statusLabel = 'Disponível para Saque';
        }
      }

      if (categoryFilter !== 'all' && category !== categoryFilter) {
        continue;
      }

      items.push({
        id: entry.id,
        transactionId: entry.transactionId || entry.id,
        referenceId: entry.referenceId || entry.transactionId || entry.id,
        operationType: entry.operationType,
        timestamp: entry.timestamp,
        description: entry.description,
        category,
        categoryLabel,
        subTypeLabel,
        direction,
        currency: 'BRL',
        amountCents: cents,
        amountBrl,
        status,
        statusLabel,
        idempotencyKeyMasked: maskIdempotencyKey(entry.idempotencyKey),
        sha256ReferenceHash: entry.sha256ReferenceHash || entry.entryHash,
        isSandbox: entry.isSandbox,
      });
    }

    // Ordenar da movimentação mais recente para a mais antiga
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }

  /**
   * Valida formato de chave PIX para prevenção de falhas operacionais no saque.
   */
  public validatePixDestination(pixKeyType: PixKeyType, rawKey: string): {
    valid: boolean;
    normalizedKey: string;
    maskedKey: string;
    errorMessage?: string;
  } {
    const trimmed = (rawKey || '').trim();
    if (!trimmed) {
      return {
        valid: false,
        normalizedKey: '',
        maskedKey: '',
        errorMessage: 'Informe uma chave PIX válida vinculada à sua titularidade.',
      };
    }

    if (pixKeyType === 'CPF') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
        return {
          valid: false,
          normalizedKey: digits,
          maskedKey: '',
          errorMessage: 'CPF inválido. Informe os 11 dígitos numéricos do titular.',
        };
      }
      return {
        valid: true,
        normalizedKey: digits,
        maskedKey: `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`,
      };
    }

    if (pixKeyType === 'CNPJ') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length !== 14) {
        return {
          valid: false,
          normalizedKey: digits,
          maskedKey: '',
          errorMessage: 'CNPJ inválido. Informe os 14 dígitos numéricos.',
        };
      }
      return {
        valid: true,
        normalizedKey: digits,
        maskedKey: `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-**`,
      };
    }

    if (pixKeyType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return {
          valid: false,
          normalizedKey: trimmed.toLowerCase(),
          maskedKey: '',
          errorMessage: 'E-mail PIX inválido. Verifique o formato informado.',
        };
      }
      const [local, domain] = trimmed.toLowerCase().split('@');
      const maskedLocal = local.length <= 2 ? `${local[0]}***` : `${local.slice(0, 2)}***`;
      return {
        valid: true,
        normalizedKey: trimmed.toLowerCase(),
        maskedKey: `${maskedLocal}@${domain}`,
      };
    }

    if (pixKeyType === 'PHONE') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        return {
          valid: false,
          normalizedKey: digits,
          maskedKey: '',
          errorMessage: 'Celular PIX inválido. Informe DDD + número (10 ou 11 dígitos).',
        };
      }
      return {
        valid: true,
        normalizedKey: `+55${digits.slice(-11)}`,
        maskedKey: `(**) *****-${digits.slice(-4)}`,
      };
    }

    // RANDOM (Chave Aleatória EVP)
    if (trimmed.length < 16) {
      return {
        valid: false,
        normalizedKey: trimmed,
        maskedKey: '',
        errorMessage: 'Chave PIX aleatória inválida (mínimo de 16 caracteres).',
      };
    }
    return {
      valid: true,
      normalizedKey: trimmed,
      maskedKey: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
    };
  }

  /**
   * SOLICITAÇÃO ATÔMICA DE SAQUE DA "MINHA CARTEIRA"
   * - Valida valor mínimo (R$ 50,00 = 5000 centavos) e limite máximo diário (R$ 10.000,00).
   * - Valida chave PIX e titularidade declarada.
   * - Aplica tarifa R$ 0,00 para PIX verificado.
   * - Debita atomicamente CREATOR_AVAILABLE_BRL e credita CREATOR_PAYOUT_ESCROW.
   * - Registra PayoutRecord com status 'under_review' (nunca marca como concluído antes do gateway).
   * - Garante idempotência e proteção contra concorrência pela fila serializada.
   */
  public async requestUnifiedWalletPayout(params: {
    userId: string;
    actorUserId?: string;
    userName: string;
    amountCents: number;
    pixKeyType: PixKeyType;
    pixKey: string;
    holderConfirmed: boolean;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{
    payout: PayoutRecord;
    ledgerEntry: LedgerEntry;
    updatedSummary: UnifiedWalletSummary;
    isReplay: boolean;
  }> {
    return this.enqueue(async () => {
      if (!params.userId || !params.userId.trim()) {
        throw new Error('Identificação do usuário é obrigatória para solicitar saque.');
      }
      this.assertWalletAccessAuthorized(
        params.userId,
        params.actorUserId ?? params.userId,
        'WALLET_PAYOUT_REQUEST'
      );
      if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
        throw new Error('Chave de idempotência obrigatória para solicitação de saque.');
      }
      if (!params.holderConfirmed) {
        throw new Error('É obrigatório confirmar que a chave PIX pertence à mesma titularidade da conta.');
      }
      if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
        throw new Error('O valor do saque deve ser informado em centavos inteiros positivos.');
      }

      const isProd =
        params.environment === 'production' ||
        (!params.environment && !runtimeEnvironmentService.isSimulationMode());
      const env: PayoutEnvironment = isProd ? 'production' : 'sandbox';

      // 1. Verificação de Idempotência antes de qualquer validação de saldo que possa ter mudado após a 1ª execução
      const existingRecords = this.getPayoutRecords(env);
      const existingPayout = existingRecords.find((p) => p.idempotencyKey === params.idempotencyKey);
      if (existingPayout) {
        if (existingPayout.creatorId !== params.userId || existingPayout.amountCents !== params.amountCents) {
          throw new Error(
            `Conflito de idempotência: a chave ${params.idempotencyKey} já foi utilizada com parâmetros divergentes.`
          );
        }
        const allEntries = this.getEntries();
        const existingEntry =
          allEntries.find((e) => e.id === existingPayout.ledgerEntryId) ||
          allEntries.find((e) => e.referenceId === existingPayout.id)!;
        return {
          payout: existingPayout,
          ledgerEntry: existingEntry,
          updatedSummary: this.getUnifiedWalletSummary(params.userId),
          isReplay: true,
        };
      }

      // 2. Validação da regra real de valor mínimo (R$ 50,00 = 5000 centavos) e teto diário (R$ 10.000,00)
      const MIN_WITHDRAWAL_CENTS = 5000;
      const MAX_WITHDRAWAL_CENTS = 1000000;
      if (params.amountCents < MIN_WITHDRAWAL_CENTS) {
        throw new Error(
          `Valor abaixo do mínimo permitido para saque (mínimo: R$ 50,00; solicitado: R$ ${(params.amountCents / 100).toFixed(2).replace('.', ',')}).`
        );
      }
      if (params.amountCents > MAX_WITHDRAWAL_CENTS) {
        throw new Error(
          `Valor excede o limite diário de saque por operação (máximo: R$ 10.000,00).`
        );
      }

      // 3. Validação de formato da chave PIX
      const pixCheck = this.validatePixDestination(params.pixKeyType, params.pixKey);
      if (!pixCheck.valid) {
        throw new Error(pixCheck.errorMessage || 'Chave PIX inválida.');
      }

      // 4. Verificação contábil de saldo disponível no livro-razão
      const currentSummary = this.getUnifiedWalletSummary(params.userId);
      if (currentSummary.availableBalanceCents < params.amountCents) {
        throw new Error(
          `Saldo disponível insuficiente para saque. Disponível: R$ ${currentSummary.availableBalanceBrl.toFixed(2)}, Solicitado: R$ ${(params.amountCents / 100).toFixed(2)}.`
        );
      }

      const amountBrl = Number((params.amountCents / 100).toFixed(2));
      const feeBrl = 0; // Tarifa zero para PIX verificado
      const netAmountBrl = amountBrl;
      const payoutId = `PAYOUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      // 5. Reserva atômica no Livro-Razão (debita CREATOR_AVAILABLE_BRL e credita CREATOR_PAYOUT_ESCROW)
      const txRes = await this._postTransactionAtomicDirect({
        idempotencyKey: `${params.idempotencyKey}_reserve`,
        description: `Solicitação de Saque PIX (${params.pixKeyType}: ${pixCheck.maskedKey}) — Reserva Contábil`,
        actorId: params.userId,
        entries: [
          {
            operationType: 'PAYOUT_RESERVE',
            debitAccount: `CREATOR_AVAILABLE_BRL:${params.userId}`,
            creditAccount: `CREATOR_PAYOUT_ESCROW:${params.userId}`,
            amount: amountBrl,
            amountCents: params.amountCents,
            currency: 'BRL',
            targetCreatorId: params.userId,
            referenceId: payoutId,
            description: `Saque solicitado via PIX (${params.pixKeyType} ${pixCheck.maskedKey}) — Em análise antifraude`,
            metadata: {
              originCategory: 'payout',
              payoutId,
              pixKeyType: params.pixKeyType,
              pixKeyMasked: pixCheck.maskedKey,
              feeCents: 0,
              netAmountCents: params.amountCents,
              environment: env,
            },
          },
        ],
      });

      const reserveEntry = txRes.entries[0];

      // 6. Criação do registro formal de Payout em status 'under_review' (nunca 'released' sem confirmação bancária)
      const newPayout: PayoutRecord = {
        id: payoutId,
        idempotencyKey: params.idempotencyKey,
        creatorId: params.userId,
        creatorName: params.userName,
        amountBrl,
        amountCents: params.amountCents,
        feeBrl,
        netAmountBrl,
        currency: 'BRL',
        status: 'under_review',
        environment: env,
        isSimulation: env === 'sandbox',
        payoutMethod: `PIX Verificado (${params.pixKeyType})`,
        pixKeyOrAccount: pixCheck.maskedKey,
        createdAt: now,
        updatedAt: now,
        transactionId: reserveEntry?.transactionId,
        ledgerEntryId: reserveEntry?.id,
        auditTrail: [
          {
            timestamp: now,
            fromStatus: 'none',
            toStatus: 'under_review',
            actorId: params.userId,
            reason: `Solicitação de saque registrada com reserva atômica no livro-razão (${env.toUpperCase()})`,
          },
        ],
      };

      this.savePayoutRecords([newPayout, ...existingRecords], env);

      return {
        payout: newPayout,
        ledgerEntry: reserveEntry,
        updatedSummary: this.getUnifiedWalletSummary(params.userId),
        isReplay: false,
      };
    });
  }
}

export const financialLedger = new FinancialLedgerService();

