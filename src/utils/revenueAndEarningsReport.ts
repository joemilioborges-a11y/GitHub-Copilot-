/**
 * JOBS — MOTOR CONTÁBIL DE RECEITAS POR SERVIÇO, GERAÇÃO DE GANHOS E RECONCILIAÇÃO
 *
 * Princípios Obrigatórios (Fases 1 a 5):
 * 1. Não modifica registros financeiros históricos existentes para produzir os gráficos.
 * 2. Aplica a divisão de 70% para o criador e 30% para o JOBS SOMENTE nas transações elegíveis:
 *    - Desbloqueio de Conteúdo / Cofre VIP (`vault_unlock`) -> Elegível 70/30
 *    - Desbloqueio de Transmissão Ao Vivo VIP (`live_unlock`) -> Elegível 70/30
 *    - Presentes Virtuais e Gorjetas em Lives (`live_gifts`) -> Elegível 70/30
 *    - Assinaturas e Desafios Interativos VIP (`subscriptions`) -> Elegível 70/30
 *    Não aplica 70/30 indiscriminadamente sobre Venda de Pacotes de Créditos (`credit_packages_cash_in`)
 *    nem sobre Premiações/Ajustes Administrativos (`creator_rewards_adjustments`).
 * 3. Não utiliza créditos virtuais (`CREDITS`) como dinheiro real (`BRL`).
 * 4. Não soma novamente transações já contabilizadas (deduplicação estrita por `id`, `transactionId` e `idempotencyKey`).
 * 5. Não calcula o saldo disponível do JOBS simplesmente somando comissões: reconcilia entradas reais de caixa,
 *    estornos, repasses liquidados, taxas registradas e obrigações retidas de criadores.
 * 6. Quando não houver dados suficientes para calcular um indicador, retorna status `'insufficient_data'`
 *    com rótulo `"Dados insuficientes"` e explicação técnica do motivo.
 * 7. Cada valor agregado preserva rastreabilidade completa até as transações de origem (`originTransactions`).
 */

import { LedgerEntry, PayoutRecord } from '../services/ledgerService';
import { CreditPurchaseModel } from '../types';
import {
  SandboxLedgerEntry,
  SimulatedCreatorPayoutRecord,
} from '../services/vrSimulatorService';

export type RevenueReportDataSource = 'official_ledger' | 'vr_simulator_sandbox';

export type RevenueReportPeriodFilter =
  | 'today'
  | '7days'
  | '30days'
  | 'all'
  | 'empty_period';

export type ServiceRevenueCategoryKey =
  | 'vault_unlock'
  | 'live_unlock'
  | 'live_gifts'
  | 'subscriptions'
  | 'credit_packages_cash_in'
  | 'creator_rewards_adjustments';

export interface TraceableOriginTransaction {
  transactionId: string;
  timestamp: string;
  displayDate: string;
  serviceKey: ServiceRevenueCategoryKey;
  serviceLabel: string;
  operationType: string;
  description: string;
  actorId: string;
  targetCreatorId: string | null;
  referenceId: string | null;
  idempotencyKey: string;
  status: 'posted' | 'refunded' | 'pending' | 'voided' | 'settled';
  isEligibleFor70_30: boolean;
  creditsConsumed: number;
  grossConfirmedBrl: number;
  refundedBrl: number;
  netRevenueBrl: number;
  creatorShareBrl: number | null;
  platformCommissionBrl: number | null;
  entryIds: string[];
  entryHashes: string[];
  debitAccounts: string[];
  creditAccounts: string[];
}

export interface ServiceRevenueBreakdownItem {
  serviceKey: ServiceRevenueCategoryKey;
  serviceLabel: string;
  shortLabel: string;
  description: string;
  colorHex: string;
  isEligibleFor70_30: boolean;
  isCashInflowOnly: boolean;
  grossConfirmedCents: number;
  refundedCents: number;
  netRevenueCents: number;
  creatorShareCents: number | null;
  platformCommissionCents: number | null;
  grossConfirmedBrl: number;
  refundedBrl: number;
  netRevenueBrl: number;
  creatorShareBrl: number | null;
  platformCommissionBrl: number | null;
  shareOfEligibleNetPct: number;
  shareOfTotalGrossInflowsPct: number;
  transactionsCount: number;
  confirmedTransactionsCount: number;
  refundedTransactionsCount: number;
  periodLabel: string;
  originTransactions: TraceableOriginTransaction[];
}

export interface ReconciledMetricValue {
  key:
    | 'total_received'
    | 'total_refunded'
    | 'net_recognized_revenue'
    | 'pending_creator_obligations'
    | 'settled_payouts'
    | 'recorded_fees'
    | 'available_jobs_cash';
  label: string;
  status: 'available' | 'insufficient_data';
  valueBrl: number | null;
  valueCents: number | null;
  formattedDisplay: string;
  explanation: string;
  formulaSummary: string;
  traceableCount: number;
}

export interface HistoricalDailyServicePoint {
  dateIso: string;
  displayDate: string;
  grossConfirmedBrl: number;
  refundedBrl: number;
  netRecognizedBrl: number;
  creatorObligationAddedBrl: number;
  platformCommissionBrl: number;
  fiatCashInBrl: number;
  payoutsSettledBrl: number;
  transactionsCount: number;
}

export interface RevenueAndEarningsReportResult {
  source: RevenueReportDataSource;
  sourceLabel: string;
  period: RevenueReportPeriodFilter;
  periodLabel: string;
  referenceNowIso: string;
  periodStartIso: string | null;
  periodEndIso: string | null;
  currency: 'BRL';
  virtualCreditsExcludedFromCash: true;
  duplicatesIgnoredCount: number;
  totalAuditedTransactionsCount: number;
  hasDataInPeriod: boolean;
  emptyPeriodReason: string | null;
  /** Serviços que compõem o Gráfico de Pizza (Receitas por Serviço com regra 70/30 explícita) */
  pieChartServices: ServiceRevenueBreakdownItem[];
  /** Categorias completas para o Gráfico de Barras Comparativo (Entradas, Estornos, Líquido, Obrigações e Caixa) */
  barChartCategories: ServiceRevenueBreakdownItem[];
  /** Série histórica real derivada das datas das transações (sem repetir saldo atual em datas anteriores) */
  historicalSeries: HistoricalDailyServicePoint[];
  /** Totais consolidados de receitas elegíveis 70/30 */
  eligibleTotals: {
    grossConfirmedBrl: number;
    refundedBrl: number;
    netRevenueBrl: number;
    creatorShare70Brl: number;
    platformCommission30Brl: number;
    transactionsCount: number;
    isSplitBalanced: boolean;
    splitDeltaCents: number;
  };
    /** 7 Indicadores Reconciliáveis da Fase 4 */
  reconciliation: {
    totalReceived: ReconciledMetricValue;
    totalRefunded: ReconciledMetricValue;
    netRecognizedRevenue: ReconciledMetricValue;
    pendingCreatorObligations: ReconciledMetricValue;
    settledPayouts: ReconciledMetricValue;
    recordedFees: ReconciledMetricValue;
    availableJobsCash: ReconciledMetricValue;
    isReconciled: boolean;
    isLedgerReconciled: boolean;
    reconciliationDeltaCents: number;
    reconciliationNotes: string[];
  };
  nonEligibleCashInflows: {
    grossBrl: number;
    refundedBrl: number;
    netBrl: number;
    explanation: string;
  };
  creatorRewardsAndAdjustments: {
    netBrl: number;
    explanation: string;
  };
  /** Todas as transações de origem rastreáveis no período */
  originTransactions: TraceableOriginTransaction[];
  allOriginTransactions: TraceableOriginTransaction[];
}

export const SERVICE_CATEGORY_META: Record<
  ServiceRevenueCategoryKey,
  {
    serviceLabel: string;
    shortLabel: string;
    description: string;
    colorHex: string;
    isEligibleFor70_30: boolean;
    isCashInflowOnly: boolean;
  }
> = {
  vault_unlock: {
    serviceLabel: 'Desbloqueio de Conteúdo / Cofre VIP',
    shortLabel: 'Cofre / Mídia VIP',
    description:
      'Desbloqueio unitário de fotos e vídeos protegidos no cofre dos criadores. Receita elegível para divisão 70% Criador / 30% JOBS.',
    colorHex: '#10b981', // emerald-500
    isEligibleFor70_30: true,
    isCashInflowOnly: false,
  },
  live_unlock: {
    serviceLabel: 'Desbloqueio de Transmissão Ao Vivo VIP',
    shortLabel: 'Ingressos Live VIP',
    description:
      'Acesso pago a salas de transmissão ao vivo, batalhas e shows privados. Receita elegível para divisão 70% Criador / 30% JOBS.',
    colorHex: '#06b6d4', // cyan-500
    isEligibleFor70_30: true,
    isCashInflowOnly: false,
  },
  live_gifts: {
    serviceLabel: 'Presentes Virtuais e Gorjetas em Lives',
    shortLabel: 'Presentes / Gorjetas',
    description:
      'Envio de presentes virtuais e gorjetas durante transmissões ao vivo. Receita elegível para divisão 70% Criador / 30% JOBS.',
    colorHex: '#8b5cf6', // violet-500
    isEligibleFor70_30: true,
    isCashInflowOnly: false,
  },
  subscriptions: {
    serviceLabel: 'Assinaturas e Desafios Interativos VIP',
    shortLabel: 'Assinaturas / Metas',
    description:
      'Assinaturas recorrentes e contribuições em metas/desafios de criadores. Receita elegível para divisão 70% Criador / 30% JOBS.',
    colorHex: '#f59e0b', // amber-500
    isEligibleFor70_30: true,
    isCashInflowOnly: false,
  },
  credit_packages_cash_in: {
    serviceLabel: 'Venda de Pacotes de Créditos (Entrada de Caixa)',
    shortLabel: 'Pacotes (Caixa Bruto)',
    description:
      'Recebimento fiduciário (BRL) na compra de pacotes de créditos. Permanece em custódia (Escrow) até o consumo; NÃO sofre divisão 70/30 no ato da recarga para evitar dupla contagem.',
    colorHex: '#3b82f6', // blue-500
    isEligibleFor70_30: false,
    isCashInflowOnly: true,
  },
  creator_rewards_adjustments: {
    serviceLabel: 'Premiações de Campanhas e Ajustes Auditados',
    shortLabel: 'Premiações / Ajustes',
    description:
      'Bônus de performance e ajustes administrativos diretos ao criador. Alocados 100% conforme regra da campanha, sem comissão de 30% do JOBS.',
    colorHex: '#ec4899', // pink-500
    isEligibleFor70_30: false,
    isCashInflowOnly: false,
  },
};

function centsToBrl(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function formatBrl(valueBrl: number | null): string {
  if (valueBrl === null || !Number.isFinite(valueBrl)) {
    return 'Dados insuficientes';
  }
  return `R$ ${valueBrl.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getPeriodLabel(period: RevenueReportPeriodFilter): string {
  switch (period) {
    case 'today':
      return 'Hoje (Últimas 24h)';
    case '7days':
      return 'Últimos 7 Dias';
    case '30days':
      return 'Últimos 30 Dias';
    case 'empty_period':
      return 'Período Sem Movimento (Pré-Gênesis)';
    case 'all':
    default:
      return 'Todo o Histórico Auditado';
  }
}

function resolvePeriodBounds(
  period: RevenueReportPeriodFilter,
  referenceNowMs: number
): { startMs: number | null; endMs: number | null } {
  const dayMs = 24 * 60 * 60 * 1000;
  switch (period) {
    case 'today':
      return { startMs: referenceNowMs - dayMs, endMs: referenceNowMs + dayMs };
    case '7days':
      return { startMs: referenceNowMs - 7 * dayMs, endMs: referenceNowMs + dayMs };
    case '30days':
      return { startMs: referenceNowMs - 30 * dayMs, endMs: referenceNowMs + dayMs };
    case 'empty_period':
      // Período anterior à criação do livro-razão (ex.: 2020) para testar períodos sem dados sem inventar valores
      return {
        startMs: new Date('2020-01-01T00:00:00.000Z').getTime(),
        endMs: new Date('2020-01-31T23:59:59.999Z').getTime(),
      };
    case 'all':
    default:
      return { startMs: null, endMs: null };
  }
}

function extractBaseTransactionKey(entry: LedgerEntry): string {
  if (entry.transactionId && entry.transactionId.trim()) {
    return entry.transactionId.trim();
  }
  if (
    entry.metadata &&
    typeof entry.metadata.transactionId === 'string' &&
    entry.metadata.transactionId.trim()
  ) {
    return entry.metadata.transactionId.trim();
  }
  if (
    entry.metadata &&
    typeof entry.metadata.batchIdempotencyKey === 'string' &&
    entry.metadata.batchIdempotencyKey.trim()
  ) {
    return entry.metadata.batchIdempotencyKey.trim();
  }
  return entry.idempotencyKey
    .replace(/_spend$/, '')
    .replace(/_unlock_spend$/, '')
    .replace(/_tip_spend$/, '')
    .replace(/_live_gift_spend$/, '')
    .replace(/_creator$/, '')
    .replace(/_creator_70$/, '')
    .replace(/_creator_share$/, '')
    .replace(/_tip_creator$/, '')
    .replace(/_live_gift_creator$/, '')
    .replace(/_platform$/, '')
    .replace(/_platform_30$/, '')
    .replace(/_platform_share$/, '')
    .replace(/_tip_platform$/, '')
    .replace(/_live_gift_platform$/, '')
    .replace(/_plat$/, '')
    .replace(/_fiat$/, '')
    .replace(/_credits$/, '')
    .replace(/_refund_comp$/, '')
    .replace(/_entry_\d+$/, '');
}

/**
 * Constrói o Relatório Financeiro de Receitas e Geração de Ganhos a partir do Livro-Razão Oficial (`financialLedger`).
 * Permite injeção opcional de registros para testes determinísticos sem alterar o estado persistido.
 */
export function buildOfficialLedgerRevenueReport(params: {
  period?: RevenueReportPeriodFilter;
  entriesOverride?: LedgerEntry[];
  payoutsOverride?: PayoutRecord[];
  purchasesOverride?: CreditPurchaseModel[];
  referenceNowIso?: string;
}): RevenueAndEarningsReportResult {
  const period: RevenueReportPeriodFilter = params.period || 'all';
  const periodLabel = getPeriodLabel(period);
  const referenceNowIso = params.referenceNowIso || new Date().toISOString();
  const referenceNowMs = new Date(referenceNowIso).getTime();
  const { startMs, endMs } = resolvePeriodBounds(period, referenceNowMs);

  const rawEntries = Array.isArray(params.entriesOverride) ? params.entriesOverride : [];
  const rawPayouts = Array.isArray(params.payoutsOverride) ? params.payoutsOverride : [];
  const rawPurchases = Array.isArray(params.purchasesOverride) ? params.purchasesOverride : [];

  // 1. Deduplicação estrita de entradas por ID e chave de idempotência individual
  const seenEntryIds = new Set<string>();
  const seenEntryIdempKeys = new Set<string>();
  const deduplicatedEntries: LedgerEntry[] = [];
  let duplicatesIgnoredCount = 0;

  for (const entry of rawEntries) {
    if (!entry || !entry.id || !entry.idempotencyKey) continue;
    if (seenEntryIds.has(entry.id) || seenEntryIdempKeys.has(entry.idempotencyKey)) {
      duplicatesIgnoredCount += 1;
      continue;
    }
    seenEntryIds.add(entry.id);
    seenEntryIdempKeys.add(entry.idempotencyKey);
    deduplicatedEntries.push(entry);
  }

  // Filtragem temporal das entradas para o período selecionado
  const isWithinPeriod = (isoTimestamp: string): boolean => {
    const tsMs = new Date(isoTimestamp).getTime();
    if (!Number.isFinite(tsMs)) return false;
    if (startMs !== null && tsMs < startMs) return false;
    if (endMs !== null && tsMs > endMs) return false;
    return true;
  };

  // Mapeia estornos compensatórios (REFUND / CHARGEBACK) que apontam para um originalEntryId
  const refundedOriginalEntryIds = new Set<string>();
  for (const e of deduplicatedEntries) {
    if (e.operationType === 'REFUND' || e.operationType === 'CHARGEBACK') {
      const origId =
        (e.metadata?.originalEntryId as string) ||
        (typeof e.referenceId === 'string' ? e.referenceId : '');
      if (origId) {
        refundedOriginalEntryIds.add(origId);
      }
    }
  }

  // 2. Agrupar entradas do período por transação atômica (bundle)
  const entriesInPeriod = deduplicatedEntries.filter((e) => isWithinPeriod(e.timestamp));
  const txGroups = new Map<string, LedgerEntry[]>();

  for (const entry of entriesInPeriod) {
    const baseKey = extractBaseTransactionKey(entry);
    if (!txGroups.has(baseKey)) {
      txGroups.set(baseKey, []);
    }
    txGroups.get(baseKey)!.push(entry);
  }

  // 3. Inicializar acumuladores por categoria de serviço
  const categoryOriginMap: Record<ServiceRevenueCategoryKey, TraceableOriginTransaction[]> = {
    vault_unlock: [],
    live_unlock: [],
    live_gifts: [],
    subscriptions: [],
    credit_packages_cash_in: [],
    creator_rewards_adjustments: [],
  };

  let periodSettledPayoutsFromLedgerCents = 0;
  const seenFiatPurchaseIds = new Set<string>();

  for (const [txKey, group] of txGroups.entries()) {
    // Ignorar grupos que sejam apenas anulações ('voided')
    const activeGroup = group.filter((e) => e.status !== 'voided');
    if (activeGroup.length === 0) continue;

    // Verificar se é Liquidação de Payout (PAYOUT_SETTLED)
    const payoutSettledEntry = activeGroup.find(
      (e) => e.operationType === 'PAYOUT_SETTLED' && e.currency === 'BRL'
    );
    if (payoutSettledEntry) {
      const cents =
        payoutSettledEntry.amountCents ?? Math.round(payoutSettledEntry.amount * 100);
      periodSettledPayoutsFromLedgerCents += cents;
      continue;
    }

    // Ignorar reservas internas de payout (PAYOUT_RESERVE / PAYOUT_REVERSAL) na receita de serviços
    if (
      activeGroup.every(
        (e) =>
          e.operationType === 'PAYOUT_RESERVE' || e.operationType === 'PAYOUT_REVERSAL'
      )
    ) {
      continue;
    }

    // Caso A: Compra de Pacote de Créditos em BRL (Entrada Fiduciária de Caixa)
    const fiatPurchaseEntry = activeGroup.find(
      (e) => e.operationType === 'CREDIT_PURCHASE' && e.currency === 'BRL'
    );
    if (fiatPurchaseEntry) {
      const grossCents =
        fiatPurchaseEntry.amountCents ?? Math.round(fiatPurchaseEntry.amount * 100);
      const isRefunded =
        fiatPurchaseEntry.status === 'refunded' ||
        refundedOriginalEntryIds.has(fiatPurchaseEntry.id) ||
        activeGroup.some(
          (e) => e.operationType === 'REFUND' || e.operationType === 'CHARGEBACK'
        );
      const refundedCents = isRefunded ? grossCents : 0;
      const netCents = grossCents - refundedCents;

      const creditGrantEntry = activeGroup.find(
        (e) => e.operationType === 'CREDIT_PURCHASE' && e.currency === 'CREDITS'
      );

      if (fiatPurchaseEntry.referenceId) {
        seenFiatPurchaseIds.add(fiatPurchaseEntry.referenceId);
      }
      seenFiatPurchaseIds.add(fiatPurchaseEntry.idempotencyKey.replace(/_fiat$/, ''));

      categoryOriginMap.credit_packages_cash_in.push({
        transactionId: txKey,
        timestamp: fiatPurchaseEntry.timestamp,
        displayDate: new Date(fiatPurchaseEntry.timestamp).toLocaleDateString('pt-BR'),
        serviceKey: 'credit_packages_cash_in',
        serviceLabel: SERVICE_CATEGORY_META.credit_packages_cash_in.serviceLabel,
        operationType: 'CREDIT_PURCHASE',
        description: fiatPurchaseEntry.description,
        actorId: fiatPurchaseEntry.actorId,
        targetCreatorId: null,
        referenceId: fiatPurchaseEntry.referenceId || null,
        idempotencyKey: fiatPurchaseEntry.idempotencyKey,
        status: isRefunded ? 'refunded' : 'posted',
        isEligibleFor70_30: false,
        creditsConsumed: creditGrantEntry ? creditGrantEntry.amount : 0,
        grossConfirmedBrl: centsToBrl(grossCents),
        refundedBrl: centsToBrl(refundedCents),
        netRevenueBrl: centsToBrl(netCents),
        creatorShareBrl: null,
        platformCommissionBrl: null,
        entryIds: activeGroup.map((e) => e.id),
        entryHashes: activeGroup.map((e) => e.entryHash),
        debitAccounts: activeGroup.map((e) => e.debitAccount),
        creditAccounts: activeGroup.map((e) => e.creditAccount),
      });
      continue;
    }

    // Importante: Lançamentos isolados de CREDIT_PURCHASE apenas em CREDITS (ex.: bônus de boas-vindas genesis)
    // NÃO são dinheiro real (BRL) e NÃO entram como receita financeira!
    if (
      activeGroup.every(
        (e) => e.operationType === 'CREDIT_PURCHASE' && e.currency === 'CREDITS'
      )
    ) {
      continue;
    }

    // Caso B: Premiações de Desempenho / Ajustes Administrativos em BRL (Não sujeitos a 70/30)
    const rewardOrAdjEntry = activeGroup.find(
      (e) =>
        (e.operationType === 'PERFORMANCE_REWARD' ||
          e.operationType === 'ADMIN_ADJUSTMENT') &&
        e.currency === 'BRL'
    );
    if (rewardOrAdjEntry) {
      const grossCents =
        rewardOrAdjEntry.amountCents ?? Math.round(rewardOrAdjEntry.amount * 100);
      const isRefunded =
        rewardOrAdjEntry.status === 'refunded' ||
        refundedOriginalEntryIds.has(rewardOrAdjEntry.id) ||
        activeGroup.some(
          (e) => e.operationType === 'REFUND' || e.operationType === 'CHARGEBACK'
        );
      const refundedCents = isRefunded ? grossCents : 0;
      const netCents = grossCents - refundedCents;

      categoryOriginMap.creator_rewards_adjustments.push({
        transactionId: txKey,
        timestamp: rewardOrAdjEntry.timestamp,
        displayDate: new Date(rewardOrAdjEntry.timestamp).toLocaleDateString('pt-BR'),
        serviceKey: 'creator_rewards_adjustments',
        serviceLabel: SERVICE_CATEGORY_META.creator_rewards_adjustments.serviceLabel,
        operationType: rewardOrAdjEntry.operationType,
        description: rewardOrAdjEntry.description,
        actorId: rewardOrAdjEntry.actorId,
        targetCreatorId: rewardOrAdjEntry.targetCreatorId || null,
        referenceId: rewardOrAdjEntry.referenceId || null,
        idempotencyKey: rewardOrAdjEntry.idempotencyKey,
        status: isRefunded ? 'refunded' : 'posted',
        isEligibleFor70_30: false,
        creditsConsumed: 0,
        grossConfirmedBrl: centsToBrl(grossCents),
        refundedBrl: centsToBrl(refundedCents),
        netRevenueBrl: centsToBrl(netCents),
        creatorShareBrl: centsToBrl(netCents), // 100% destinado ao criador na premiação, sem split 30%
        platformCommissionBrl: null,
        entryIds: activeGroup.map((e) => e.id),
        entryHashes: activeGroup.map((e) => e.entryHash),
        debitAccounts: activeGroup.map((e) => e.debitAccount),
        creditAccounts: activeGroup.map((e) => e.creditAccount),
      });
      continue;
    }

    // Caso C: Serviços Elegíveis à Divisão 70% Criador / 30% JOBS
    const spendEntry = activeGroup.find(
      (e) =>
        e.operationType === 'CONTENT_UNLOCK' ||
        e.operationType === 'TIP_GIFT' ||
        e.operationType === 'SUBSCRIPTION_PURCHASE'
    );
    const creatorShareEntry = activeGroup.find(
      (e) => e.operationType === 'CREATOR_REVENUE_SHARE' && e.currency === 'BRL'
    );
    const platformCommissionEntry = activeGroup.find(
      (e) => e.operationType === 'PLATFORM_COMMISSION' && e.currency === 'BRL'
    );

    if (!spendEntry && !creatorShareEntry && !platformCommissionEntry) {
      continue;
    }

    const primaryEntry = spendEntry || creatorShareEntry || platformCommissionEntry!;
    const opType = spendEntry ? spendEntry.operationType : primaryEntry.operationType;

    // Classifica qual serviço elegível originou a transação
    let serviceKey: ServiceRevenueCategoryKey = 'vault_unlock';
    if (opType === 'TIP_GIFT') {
      serviceKey = 'live_gifts';
    } else if (opType === 'SUBSCRIPTION_PURCHASE') {
      serviceKey = 'subscriptions';
    } else if (opType === 'CONTENT_UNLOCK') {
      const isLiveUnlock =
        Boolean(primaryEntry.metadata?.isLiveUnlock) ||
        Boolean(primaryEntry.metadata?.liveStreamId) ||
        Boolean(primaryEntry.metadata?.liveId) ||
        (typeof primaryEntry.referenceId === 'string' &&
          primaryEntry.referenceId.startsWith('live_')) ||
        primaryEntry.description.toLowerCase().includes('live');
      serviceKey = isLiveUnlock ? 'live_unlock' : 'vault_unlock';
    }

    const creditsConsumed =
      spendEntry && spendEntry.currency === 'CREDITS' ? spendEntry.amount : 0;

    // Calcula valores em centavos inteiros a partir dos lançamentos reais em BRL (ou conversão padrão 1 cr = 10 centavos)
    const creatorGrossCents = creatorShareEntry
      ? creatorShareEntry.amountCents ?? Math.round(creatorShareEntry.amount * 100)
      : Math.round(creditsConsumed * 10 * 0.7);
    const platformGrossCents = platformCommissionEntry
      ? platformCommissionEntry.amountCents ??
        Math.round(platformCommissionEntry.amount * 100)
      : Math.round(creditsConsumed * 10) - creatorGrossCents;
    const grossConfirmedCents = creatorGrossCents + platformGrossCents;

    const isRefunded =
      primaryEntry.status === 'refunded' ||
      (creatorShareEntry && creatorShareEntry.status === 'refunded') ||
      (platformCommissionEntry && platformCommissionEntry.status === 'refunded') ||
      activeGroup.some((e) => refundedOriginalEntryIds.has(e.id)) ||
      activeGroup.some(
        (e) => e.operationType === 'REFUND' || e.operationType === 'CHARGEBACK'
      );

    const refundedCents = isRefunded ? grossConfirmedCents : 0;
    const netRevenueCents = grossConfirmedCents - refundedCents;
    const netCreatorShareCents = isRefunded ? 0 : creatorGrossCents;
    const netPlatformCommissionCents = isRefunded ? 0 : platformGrossCents;

    categoryOriginMap[serviceKey].push({
      transactionId: txKey,
      timestamp: primaryEntry.timestamp,
      displayDate: new Date(primaryEntry.timestamp).toLocaleDateString('pt-BR'),
      serviceKey,
      serviceLabel: SERVICE_CATEGORY_META[serviceKey].serviceLabel,
      operationType: opType,
      description: primaryEntry.description,
      actorId: primaryEntry.actorId,
      targetCreatorId:
        primaryEntry.targetCreatorId ||
        creatorShareEntry?.targetCreatorId ||
        (primaryEntry.metadata?.creatorId as string) ||
        null,
      referenceId: primaryEntry.referenceId || null,
      idempotencyKey: primaryEntry.idempotencyKey,
      status: isRefunded ? 'refunded' : 'posted',
      isEligibleFor70_30: true,
      creditsConsumed,
      grossConfirmedBrl: centsToBrl(grossConfirmedCents),
      refundedBrl: centsToBrl(refundedCents),
      netRevenueBrl: centsToBrl(netRevenueCents),
      creatorShareBrl: centsToBrl(netCreatorShareCents),
      platformCommissionBrl: centsToBrl(netPlatformCommissionCents),
      entryIds: activeGroup.map((e) => e.id),
      entryHashes: activeGroup.map((e) => e.entryHash),
      debitAccounts: activeGroup.map((e) => e.debitAccount),
      creditAccounts: activeGroup.map((e) => e.creditAccount),
    });
  }

  // Complementa compras de pacotes aprovadas/estornadas em CreditPurchaseModel que ainda não tinham par BRL no razão
  for (const pur of rawPurchases) {
    if (!pur || (pur.status !== 'approved' && pur.status !== 'refunded')) continue;
    if (!isWithinPeriod(pur.createdAt)) continue;
    if (seenFiatPurchaseIds.has(pur.id) || seenFiatPurchaseIds.has(pur.idempotencyKey)) {
      continue;
    }
    seenFiatPurchaseIds.add(pur.id);
    seenFiatPurchaseIds.add(pur.idempotencyKey);

    const grossCents = pur.priceInCents;
    const isRefunded = pur.status === 'refunded';
    const refundedCents = isRefunded ? grossCents : 0;
    const netCents = grossCents - refundedCents;

    categoryOriginMap.credit_packages_cash_in.push({
      transactionId: pur.id,
      timestamp: pur.createdAt,
      displayDate: new Date(pur.createdAt).toLocaleDateString('pt-BR'),
      serviceKey: 'credit_packages_cash_in',
      serviceLabel: SERVICE_CATEGORY_META.credit_packages_cash_in.serviceLabel,
      operationType: 'CREDIT_PURCHASE',
      description: `Compra de Pacote ${pur.packageName} (${pur.creditsAmount} créditos) via ${pur.paymentGateway.toUpperCase()}`,
      actorId: pur.userId,
      targetCreatorId: null,
      referenceId: pur.packageId,
      idempotencyKey: pur.idempotencyKey,
      status: isRefunded ? 'refunded' : 'posted',
      isEligibleFor70_30: false,
      creditsConsumed: pur.creditsAmount,
      grossConfirmedBrl: centsToBrl(grossCents),
      refundedBrl: centsToBrl(refundedCents),
      netRevenueBrl: centsToBrl(netCents),
      creatorShareBrl: null,
      platformCommissionBrl: null,
      entryIds: [pur.id],
      entryHashes: [pur.providerReference || pur.id],
      debitAccounts: [`GATEWAY_${pur.paymentGateway.toUpperCase()}`],
      creditAccounts: ['ESCROW_PAYMENT_GATEWAY'],
    });
  }

  // 4. Construir itens agregados por categoria de serviço
  const categoryOrder: ServiceRevenueCategoryKey[] = [
    'vault_unlock',
    'live_unlock',
    'live_gifts',
    'subscriptions',
    'credit_packages_cash_in',
    'creator_rewards_adjustments',
  ];

  const rawCategoryItems: ServiceRevenueBreakdownItem[] = categoryOrder.map((key) => {
    const meta = SERVICE_CATEGORY_META[key];
    const txs = [...categoryOriginMap[key]].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let grossConfirmedCents = 0;
    let refundedCents = 0;
    let netRevenueCents = 0;
    let creatorShareCents = 0;
    let platformCommissionCents = 0;
    let confirmedTransactionsCount = 0;
    let refundedTransactionsCount = 0;

    for (const tx of txs) {
      const gCents = Math.round(tx.grossConfirmedBrl * 100);
      const rCents = Math.round(tx.refundedBrl * 100);
      const nCents = gCents - rCents;
      grossConfirmedCents += gCents;
      refundedCents += rCents;
      netRevenueCents += nCents;

      if (tx.status === 'refunded') {
        refundedTransactionsCount += 1;
      } else {
        confirmedTransactionsCount += 1;
      }

      if (meta.isEligibleFor70_30) {
        const cCents = tx.creatorShareBrl !== null ? Math.round(tx.creatorShareBrl * 100) : 0;
        const pCents =
          tx.platformCommissionBrl !== null ? Math.round(tx.platformCommissionBrl * 100) : 0;
        creatorShareCents += cCents;
        platformCommissionCents += pCents;
      } else if (key === 'creator_rewards_adjustments') {
        creatorShareCents += nCents;
      }
    }

    return {
      serviceKey: key,
      serviceLabel: meta.serviceLabel,
      shortLabel: meta.shortLabel,
      description: meta.description,
      colorHex: meta.colorHex,
      isEligibleFor70_30: meta.isEligibleFor70_30,
      isCashInflowOnly: meta.isCashInflowOnly,
      grossConfirmedCents,
      refundedCents,
      netRevenueCents,
      creatorShareCents: meta.isEligibleFor70_30 ? creatorShareCents : null,
      platformCommissionCents: meta.isEligibleFor70_30 ? platformCommissionCents : null,
      grossConfirmedBrl: centsToBrl(grossConfirmedCents),
      refundedBrl: centsToBrl(refundedCents),
      netRevenueBrl: centsToBrl(netRevenueCents),
      creatorShareBrl: meta.isEligibleFor70_30 ? centsToBrl(creatorShareCents) : null,
      platformCommissionBrl: meta.isEligibleFor70_30
        ? centsToBrl(platformCommissionCents)
        : null,
      shareOfEligibleNetPct: 0,
      shareOfTotalGrossInflowsPct: 0,
      transactionsCount: txs.length,
      confirmedTransactionsCount,
      refundedTransactionsCount,
      periodLabel,
      originTransactions: txs,
    };
  });

  const totalEligibleNetCents = rawCategoryItems
    .filter((c) => c.isEligibleFor70_30)
    .reduce((acc, c) => acc + c.netRevenueCents, 0);

  const totalGrossAllCategoriesCents = rawCategoryItems.reduce(
    (acc, c) => acc + c.grossConfirmedCents,
    0
  );

  for (const item of rawCategoryItems) {
    if (item.isEligibleFor70_30 && totalEligibleNetCents > 0) {
      item.shareOfEligibleNetPct = Number(
        ((item.netRevenueCents / totalEligibleNetCents) * 100).toFixed(1)
      );
    }
    if (totalGrossAllCategoriesCents > 0) {
      item.shareOfTotalGrossInflowsPct = Number(
        ((item.grossConfirmedCents / totalGrossAllCategoriesCents) * 100).toFixed(1)
      );
    }
  }

  // Totais dos serviços elegíveis 70/30
  const eligibleItems = rawCategoryItems.filter((c) => c.isEligibleFor70_30);
  const eligibleGrossCents = eligibleItems.reduce((acc, c) => acc + c.grossConfirmedCents, 0);
  const eligibleRefundedCents = eligibleItems.reduce((acc, c) => acc + c.refundedCents, 0);
  const eligibleNetCents = eligibleItems.reduce((acc, c) => acc + c.netRevenueCents, 0);
  const eligibleCreator70Cents = eligibleItems.reduce(
    (acc, c) => acc + (c.creatorShareCents || 0),
    0
  );
  const eligiblePlatform30Cents = eligibleItems.reduce(
    (acc, c) => acc + (c.platformCommissionCents || 0),
    0
  );
  const eligibleTxCount = eligibleItems.reduce((acc, c) => acc + c.transactionsCount, 0);
  const splitDeltaCents =
    eligibleNetCents - (eligibleCreator70Cents + eligiblePlatform30Cents);

  // Todas as transações de origem ordenadas por data decrescente
  const allOriginTransactions = rawCategoryItems
    .flatMap((c) => c.originTransactions)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 5. Série histórica diária real (derivada exclusivamente das datas das transações reais, sem repetir saldo atual)
  const dailyMap = new Map<string, HistoricalDailyServicePoint>();
  for (const tx of allOriginTransactions) {
    const dateIso = tx.timestamp.slice(0, 10);
    const displayDate = `${dateIso.slice(8, 10)}/${dateIso.slice(5, 7)}`;
    if (!dailyMap.has(dateIso)) {
      dailyMap.set(dateIso, {
        dateIso,
        displayDate,
        grossConfirmedBrl: 0,
        refundedBrl: 0,
        netRecognizedBrl: 0,
        creatorObligationAddedBrl: 0,
        platformCommissionBrl: 0,
        fiatCashInBrl: 0,
        payoutsSettledBrl: 0,
        transactionsCount: 0,
      });
    }
    const pt = dailyMap.get(dateIso)!;
    pt.transactionsCount += 1;
    if (tx.serviceKey === 'credit_packages_cash_in') {
      pt.fiatCashInBrl = Number((pt.fiatCashInBrl + tx.netRevenueBrl).toFixed(2));
    } else {
      pt.grossConfirmedBrl = Number((pt.grossConfirmedBrl + tx.grossConfirmedBrl).toFixed(2));
      pt.refundedBrl = Number((pt.refundedBrl + tx.refundedBrl).toFixed(2));
      pt.netRecognizedBrl = Number((pt.netRecognizedBrl + tx.netRevenueBrl).toFixed(2));
      pt.creatorObligationAddedBrl = Number(
        (pt.creatorObligationAddedBrl + (tx.creatorShareBrl || 0)).toFixed(2)
      );
      pt.platformCommissionBrl = Number(
        (pt.platformCommissionBrl + (tx.platformCommissionBrl || 0)).toFixed(2)
      );
    }
  }

  const historicalSeries = Array.from(dailyMap.values()).sort((a, b) =>
    a.dateIso.localeCompare(b.dateIso)
  );

  // 6. Reconciliação de Pagamentos, Taxas, Obrigações e Caixa Disponível (Fase 4)
  const payoutsInPeriod = rawPayouts.filter((p) => p && isWithinPeriod(p.createdAt));
  const releasedPayoutsInPeriod = payoutsInPeriod.filter((p) => p.status === 'released');

  const grossSettledPayoutsFromRecordsCents = releasedPayoutsInPeriod.reduce(
    (acc, p) => acc + (p.amountCents ?? Math.round(p.amountBrl * 100)),
    0
  );
  // Evita somar duas vezes caso o PayoutRecord já tenha gerado o lançamento PAYOUT_SETTLED no razão
  const totalGrossSettledPayoutsCents = Math.max(
    periodSettledPayoutsFromLedgerCents,
    grossSettledPayoutsFromRecordsCents
  );

  // Taxas efetivamente registradas nos registros de pagamento do período
  const payoutsWithFee = payoutsInPeriod.filter(
    (p) =>
      p.status !== 'cancelled' &&
      p.status !== 'failed' &&
      typeof p.feeBrl === 'number' &&
      p.feeBrl > 0
  );
  const totalRecordedFeesCents = payoutsWithFee.reduce(
    (acc, p) => acc + Math.round((p.feeBrl || 0) * 100),
    0
  );

  // Valor líquido efetivamente transferido aos criadores após desconto das taxas registradas no repasse
  const totalSettledPayoutsCents = Math.max(
    0,
    totalGrossSettledPayoutsCents - totalRecordedFeesCents
  );

  // Obrigações pendentes com criadores no período/livro-razão (70% líquido + premiações - repasses brutos liquidados)
  const rewardsItem = rawCategoryItems.find(
    (c) => c.serviceKey === 'creator_rewards_adjustments'
  )!;
  const rewardsNetCents = rewardsItem?.netRevenueCents || 0;
  const totalCreatorObligationsGeneratedCents = eligibleCreator70Cents + rewardsNetCents;
  const pendingCreatorObligationsCents = Math.max(
    0,
    totalCreatorObligationsGeneratedCents - totalGrossSettledPayoutsCents
  );

  const fiatCashInItem = rawCategoryItems.find(
    (c) => c.serviceKey === 'credit_packages_cash_in'
  )!;
  const totalServiceGrossCents = eligibleGrossCents + rewardsNetCents;
  const totalServiceRefundedCents = eligibleRefundedCents;
  const totalReceivedCents = totalServiceGrossCents + fiatCashInItem.grossConfirmedCents;
  const totalRefundedCents = totalServiceRefundedCents + fiatCashInItem.refundedCents;

  // Base fiduciária custodiada para reconciliação de caixa:
  // Quando há entradas de caixa de pacotes (fiatCashInItem) suficientes para cobrir as obrigações/consumo,
  // a base de caixa real é a entrada fiduciária líquida de pacotes; caso contrário, utiliza o volume líquido de serviços consumidos.
  const netCashInflowsAfterRefundsCents = Math.max(
    fiatCashInItem.netRevenueCents,
    eligibleNetCents + rewardsNetCents
  );

  const availableJobsCashCents = Math.max(
    0,
    netCashInflowsAfterRefundsCents -
      pendingCreatorObligationsCents -
      totalSettledPayoutsCents -
      totalRecordedFeesCents
  );

  const reconciliationDeltaCents =
    splitDeltaCents +
    (netCashInflowsAfterRefundsCents -
      (pendingCreatorObligationsCents +
        totalSettledPayoutsCents +
        totalRecordedFeesCents +
        availableJobsCashCents));

  const hasDataInPeriod = allOriginTransactions.length > 0;
  const emptyPeriodReason = hasDataInPeriod
    ? null
    : `Dados insuficientes: Nenhum lançamento contábil confirmado foi encontrado no intervalo selecionado (${periodLabel}).`;

  const hasRecordedFeesData = payoutsWithFee.length > 0 && totalRecordedFeesCents > 0;

  const reconciliation = {
    totalReceived: {
      key: 'total_received' as const,
      label: 'Total Recebido e Confirmado',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(totalReceivedCents) : null,
      valueCents: hasDataInPeriod ? totalReceivedCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(totalReceivedCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Serviços em BRL (${formatBrl(centsToBrl(totalServiceGrossCents))}) + Entradas de Caixa de Pacotes (${formatBrl(fiatCashInItem.grossConfirmedBrl)}). Créditos virtuais de boas-vindas excluídos.`
        : emptyPeriodReason!,
      formulaSummary: 'Recebimentos Confirmados (BRL) sem Créditos Virtuais',
      traceableCount: allOriginTransactions.length,
    },
    totalRefunded: {
      key: 'total_refunded' as const,
      label: 'Total Estornado / Cancelado',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(totalRefundedCents) : null,
      valueCents: hasDataInPeriod ? totalRefundedCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(totalRefundedCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Soma de transações revertidas (REFUND / CHARGEBACK) deduzindo proporcionalmente 70% criador e 30% JOBS nas categorias elegíveis.`
        : emptyPeriodReason!,
      formulaSummary: 'Soma de Lançamentos Revertidos (BRL)',
      traceableCount: allOriginTransactions.filter((t) => t.status === 'refunded').length,
    },
    netRecognizedRevenue: {
      key: 'net_recognized_revenue' as const,
      label: 'Receita Líquida Reconhecida (70/30)',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(eligibleNetCents) : null,
      valueCents: hasDataInPeriod ? eligibleNetCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(eligibleNetCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Receita Bruta Elegível (${formatBrl(centsToBrl(eligibleGrossCents))}) menos Estornos Elegíveis (${formatBrl(centsToBrl(eligibleRefundedCents))}). Exatamente igual a 70% Criadores (${formatBrl(centsToBrl(eligibleCreator70Cents))}) + 30% JOBS (${formatBrl(centsToBrl(eligiblePlatform30Cents))}).`
        : emptyPeriodReason!,
      formulaSummary: 'Receita Bruta Elegível − Estornos Elegíveis',
      traceableCount: eligibleTxCount,
    },
    pendingCreatorObligations: {
      key: 'pending_creator_obligations' as const,
      label: 'Obrigações Pendentes com Criadores',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(pendingCreatorObligationsCents) : null,
      valueCents: hasDataInPeriod ? pendingCreatorObligationsCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(pendingCreatorObligationsCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Parcela líquida de 70% devida aos criadores (${formatBrl(centsToBrl(eligibleCreator70Cents))}) + premiações (${formatBrl(centsToBrl(rewardsNetCents))}) menos repasses brutos liquidados (${formatBrl(centsToBrl(totalGrossSettledPayoutsCents))}).`
        : emptyPeriodReason!,
      formulaSummary: '(70% Criadores Líquido + Premiações) − Repasses Liquidados',
      traceableCount: eligibleItems.reduce(
        (acc, c) => acc + c.confirmedTransactionsCount,
        0
      ),
    },
    settledPayouts: {
      key: 'settled_payouts' as const,
      label: 'Pagamentos Efetuados a Criadores',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(totalSettledPayoutsCents) : null,
      valueCents: hasDataInPeriod ? totalSettledPayoutsCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(totalSettledPayoutsCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Valor líquido efetivamente pago a criadores (PAYOUT_SETTLED / released) após dedução de taxas operacionais registradas.`
        : emptyPeriodReason!,
      formulaSummary: 'Repasses Liquidados Brutos − Taxas Efetivamente Registradas',
      traceableCount: releasedPayoutsInPeriod.length,
    },
    recordedFees: {
      key: 'recorded_fees' as const,
      label: 'Taxas Efetivamente Registradas',
      status: hasRecordedFeesData ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasRecordedFeesData ? centsToBrl(totalRecordedFeesCents) : null,
      valueCents: hasRecordedFeesData ? totalRecordedFeesCents : null,
      formattedDisplay: hasRecordedFeesData
        ? formatBrl(centsToBrl(totalRecordedFeesCents))
        : 'Dados insuficientes',
      explanation: hasRecordedFeesData
        ? `Taxas operacionais/bancárias efetivamente registradas em ${payoutsWithFee.length} registro(s) de repasse no período.`
        : 'Dados insuficientes: Nenhuma taxa bancária ou de gateway (feeBrl > 0) foi efetivamente registrada nas liquidações deste período. Taxas não são presumidas nem inventadas.',
      formulaSummary: 'Soma de feeBrl Efetivamente Gravadas nos Registros de Pagamento',
      traceableCount: payoutsWithFee.length,
    },
    availableJobsCash: {
      key: 'available_jobs_cash' as const,
      label: 'Saldo Disponível do JOBS (Caixa Reconciliado)',
      status: hasDataInPeriod ? ('available' as const) : ('insufficient_data' as const),
      valueBrl: hasDataInPeriod ? centsToBrl(availableJobsCashCents) : null,
      valueCents: hasDataInPeriod ? availableJobsCashCents : null,
      formattedDisplay: hasDataInPeriod
        ? formatBrl(centsToBrl(availableJobsCashCents))
        : 'Dados insuficientes',
      explanation: hasDataInPeriod
        ? `Caixa líquido reconciliado após deduzir estornos (${formatBrl(centsToBrl(totalRefundedCents))}), segregar 100% das obrigações pendentes com criadores (${formatBrl(centsToBrl(pendingCreatorObligationsCents))}), descontar pagamentos líquidos (${formatBrl(centsToBrl(totalSettledPayoutsCents))}) e taxas registradas (${formatBrl(centsToBrl(totalRecordedFeesCents))}). Não obtido por soma simples de comissões.`
        : emptyPeriodReason!,
      formulaSummary:
        'Entradas Fiduciárias Líquidas − Obrigações Pendentes Criadores − Pagamentos Líquidos − Taxas',
      traceableCount: allOriginTransactions.length,
    },
    isReconciled: reconciliationDeltaCents === 0,
    isLedgerReconciled: reconciliationDeltaCents === 0,
    reconciliationDeltaCents,
    reconciliationNotes: [
      'A divisão 70% Criador / 30% JOBS é aplicada estritamente sobre serviços de consumo elegíveis (Desbloqueio de Cofre, Desbloqueio de Live, Presentes em Live e Assinaturas).',
      'Compras de pacotes de créditos (CREDIT_PURCHASE) são tratadas como entrada de caixa em custódia (Escrow) e nunca sofrem dupla contagem com o consumo.',
      'Créditos virtuais (CREDITS) de boas-vindas ou saldo interno não sacável são estritamente segregados e jamais somados como moeda fiduciária (BRL).',
    ],
  };

  return {
    source: 'official_ledger',
    sourceLabel: 'Livro-Razão Contábil Oficial (financialLedger)',
    period,
    periodLabel,
    referenceNowIso,
    periodStartIso: startMs !== null ? new Date(startMs).toISOString() : null,
    periodEndIso: endMs !== null ? new Date(endMs).toISOString() : null,
    currency: 'BRL',
    virtualCreditsExcludedFromCash: true,
    duplicatesIgnoredCount,
    totalAuditedTransactionsCount: allOriginTransactions.length,
    hasDataInPeriod,
    emptyPeriodReason,
    pieChartServices: rawCategoryItems.filter(
      (c) => c.isEligibleFor70_30 || c.transactionsCount > 0
    ),
    barChartCategories: rawCategoryItems,
    historicalSeries,
    eligibleTotals: {
      grossConfirmedBrl: centsToBrl(eligibleGrossCents),
      refundedBrl: centsToBrl(eligibleRefundedCents),
      netRevenueBrl: centsToBrl(eligibleNetCents),
      creatorShare70Brl: centsToBrl(eligibleCreator70Cents),
      platformCommission30Brl: centsToBrl(eligiblePlatform30Cents),
      transactionsCount: eligibleTxCount,
      isSplitBalanced: splitDeltaCents === 0,
      splitDeltaCents,
    },
    reconciliation,
    nonEligibleCashInflows: {
      grossBrl: fiatCashInItem.grossConfirmedBrl,
      refundedBrl: fiatCashInItem.refundedBrl,
      netBrl: fiatCashInItem.netRevenueBrl,
      explanation: `Entradas de Caixa de Pacotes (${formatBrl(fiatCashInItem.netRevenueBrl)}) custodiadas em Escrow sem split 70/30 no ato da recarga.`,
    },
    creatorRewardsAndAdjustments: {
      netBrl: rewardsItem.netRevenueBrl,
      explanation: `Premiações e ajustes diretos aos criadores (${formatBrl(rewardsItem.netRevenueBrl)}) alocados 100% sem comissão JOBS.`,
    },
    originTransactions: allOriginTransactions,
    allOriginTransactions,
  };
}

/**
 * Constrói o mesmo Relatório Financeiro a partir do Livro-Razão Isolado do Simulador VR (`vr_sim_sandbox_v1`),
 * mantendo isolamento 100% estrito em relação aos dados de produção.
 */
export function buildVrSimulatorRevenueReport(params: {
  period?: RevenueReportPeriodFilter;
  sandboxEntries: SandboxLedgerEntry[];
  sandboxPayouts?: SimulatedCreatorPayoutRecord[];
  simulatedPayouts?: SimulatedCreatorPayoutRecord[];
  currentSimDay: number;
  baseSimulatedDateIso: string;
}): RevenueAndEarningsReportResult {
  const period: RevenueReportPeriodFilter = params.period || 'all';

  // Converte cada SandboxLedgerEntry em BRL (e compras de pacotes de créditos em centavos fictícios) para LedgerEntry equivalente em memória
  const mappedEntries: LedgerEntry[] = [];
  for (const se of params.sandboxEntries) {
    if (!se) continue;

    if (se.operationType === 'CREDIT_PACK_PURCHASE') {
      // No Simulador VR, a compra de pacote registra entrada no caixa de teste em centavos equivalentes
      mappedEntries.push({
        id: `${se.entryId}_fiat`,
        idempotencyKey: `${se.idempotencyKey}_fiat`,
        transactionId: se.entryId,
        timestamp: se.timestampIso,
        operationType: 'CREDIT_PURCHASE',
        debitAccount: se.debitAccount,
        creditAccount: 'ESCROW_PAYMENT_GATEWAY',
        amount: centsToBrl(se.grossAmountCents),
        amountCents: se.grossAmountCents,
        currency: 'BRL',
        status: 'posted',
        actorId: se.actorId,
        description: `[SIMULAÇÃO DIA ${se.simDay}] Aquisição de Pacote de Créditos (${se.actorId})`,
        isSandbox: true,
        previousHash: se.previousHash,
        entryHash: se.hash,
      });
      continue;
    }

    if (se.currency !== 'BRL') continue;

    if (se.operationType === 'CREATOR_PAYOUT_SETTLEMENT') {
      mappedEntries.push({
        id: se.entryId,
        idempotencyKey: se.idempotencyKey,
        transactionId: se.entryId,
        timestamp: se.timestampIso,
        operationType: 'PAYOUT_SETTLED',
        debitAccount: se.debitAccount,
        creditAccount: se.creditAccount,
        amount: centsToBrl(se.grossAmountCents),
        amountCents: se.grossAmountCents,
        currency: 'BRL',
        status: 'posted',
        actorId: se.actorId,
        targetCreatorId: se.creatorId,
        description: `[SIMULAÇÃO DIA ${se.simDay}] Liquidação de Saque Simulado (${se.creatorId || se.actorId})`,
        isSandbox: true,
        previousHash: se.previousHash,
        entryHash: se.hash,
      });
      continue;
    }

    if (se.operationType === 'REFUND_REVERSAL') {
      // Representa estorno proporcional 70/30 de desbloqueio elegível no simulador VR
      mappedEntries.push(
        {
          id: `${se.entryId}_creator_ref`,
          idempotencyKey: `${se.idempotencyKey}_creator`,
          transactionId: se.entryId,
          timestamp: se.timestampIso,
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: se.debitAccount,
          creditAccount: se.creditAccount,
          amount: centsToBrl(se.creatorShareCents),
          amountCents: se.creatorShareCents,
          currency: 'BRL',
          status: 'refunded',
          actorId: se.actorId,
          targetCreatorId: se.creatorId,
          description: `[SIMULAÇÃO DIA ${se.simDay}] Estorno 70/30 de Transação Elegível (${se.creatorId})`,
          isSandbox: true,
          previousHash: se.previousHash,
          entryHash: se.hash,
        },
        {
          id: `${se.entryId}_plat_ref`,
          idempotencyKey: `${se.idempotencyKey}_platform`,
          transactionId: se.entryId,
          timestamp: se.timestampIso,
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: se.debitAccount,
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: centsToBrl(se.platformShareCents),
          amountCents: se.platformShareCents,
          currency: 'BRL',
          status: 'refunded',
          actorId: se.actorId,
          targetCreatorId: se.creatorId,
          description: `[SIMULAÇÃO DIA ${se.simDay}] Estorno 30% Comissão JOBS (${se.creatorId})`,
          isSandbox: true,
          previousHash: se.previousHash,
          entryHash: se.hash,
        }
      );
      continue;
    }

    // Operações elegíveis 70/30 do Simulador VR
    let mappedOpType: LedgerEntry['operationType'] = 'CONTENT_UNLOCK';
    const metadata: Record<string, unknown> = { simDay: se.simDay };

    if (se.operationType === 'LIVE_GIFT_SENT') {
      mappedOpType = 'TIP_GIFT';
    } else if (se.operationType === 'LIVE_TICKET_UNLOCK') {
      mappedOpType = 'CONTENT_UNLOCK';
      metadata.isLiveUnlock = true;
    } else if (se.operationType === 'CHALLENGE_CONTRIBUTION') {
      mappedOpType = 'SUBSCRIPTION_PURCHASE';
    } else if (se.operationType === 'VAULT_ALBUM_UNLOCK') {
      mappedOpType = 'CONTENT_UNLOCK';
      metadata.isLiveUnlock = false;
    }

    mappedEntries.push(
      {
        id: `${se.entryId}_spend`,
        idempotencyKey: `${se.idempotencyKey}_spend`,
        transactionId: se.entryId,
        timestamp: se.timestampIso,
        operationType: mappedOpType,
        debitAccount: se.debitAccount,
        creditAccount: se.creditAccount,
        amount: Math.round(se.grossAmountCents / 10),
        currency: 'CREDITS',
        status: 'posted',
        actorId: se.actorId,
        targetCreatorId: se.creatorId,
        description: `[SIMULAÇÃO DIA ${se.simDay}] ${se.operationType} (${se.creatorId || se.actorId})`,
        isSandbox: true,
        metadata,
        previousHash: se.previousHash,
        entryHash: se.hash,
      },
      {
        id: `${se.entryId}_creator`,
        idempotencyKey: `${se.idempotencyKey}_creator`,
        transactionId: se.entryId,
        timestamp: se.timestampIso,
        operationType: 'CREATOR_REVENUE_SHARE',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: `CREATOR_AVAILABLE_BRL:${se.creatorId || 'creator'}`,
        amount: centsToBrl(se.creatorShareCents),
        amountCents: se.creatorShareCents,
        currency: 'BRL',
        status: 'posted',
        actorId: se.actorId,
        targetCreatorId: se.creatorId,
        description: `[70% Criador · Dia ${se.simDay}] ${se.operationType}`,
        isSandbox: true,
        metadata,
        previousHash: se.previousHash,
        entryHash: se.hash,
      },
      {
        id: `${se.entryId}_platform`,
        idempotencyKey: `${se.idempotencyKey}_platform`,
        transactionId: se.entryId,
        timestamp: se.timestampIso,
        operationType: 'PLATFORM_COMMISSION',
        debitAccount: 'ESCROW_PAYMENT_GATEWAY',
        creditAccount: 'PLATFORM_REVENUE_BRL',
        amount: centsToBrl(se.platformShareCents),
        amountCents: se.platformShareCents,
        currency: 'BRL',
        status: 'posted',
        actorId: se.actorId,
        targetCreatorId: se.creatorId,
        description: `[30% JOBS · Dia ${se.simDay}] ${se.operationType}`,
        isSandbox: true,
        metadata,
        previousHash: se.previousHash,
        entryHash: se.hash,
      }
    );
  }

  const baseMs = new Date(params.baseSimulatedDateIso).getTime();
  const simNowIso = new Date(
    baseMs + Math.max(1, params.currentSimDay) * 24 * 60 * 60 * 1000
  ).toISOString();

  const report = buildOfficialLedgerRevenueReport({
    period,
    entriesOverride: mappedEntries,
    payoutsOverride: [],
    purchasesOverride: [],
    referenceNowIso: simNowIso,
  });

  return {
    ...report,
    source: 'vr_simulator_sandbox',
    sourceLabel: `Sandbox Isolado do Simulador VR (Dia 1 ao Dia ${params.currentSimDay} — vr_sim_sandbox_v1)`,
  };
}
