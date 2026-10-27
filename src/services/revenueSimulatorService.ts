/**
 * JOBS — SERVIÇO DO SIMULADOR ADMINISTRATIVO DE RECEITA (FASE 1 / SANDBOX & AUDITORIA)
 *
 * Princípios Obrigatórios:
 * 1. Precisão Matemática em Centavos Inteiros:
 *    - Todos os cálculos monetários operam em centavos inteiros (integer cents), eliminando
 *      erros de ponto flutuante binário (IEEE 754).
 *    - Garantia invariante: c_criadores + c_jobs + c_reserva === B (100% da base).
 * 2. Cenário de Referência Obrigatório:
 *    - Pacote: Inicial (pkg_inicial) | 1.000 vendas | 50 💎 pagos | 0 💎 bônus | R$ 9,90 (990 centavos)
 *    - Receita bruta estimada: R$ 9.900,00 (990.000 centavos)
 *    - Participação bruta estimada dos criadores (70%): R$ 6.930,00 (693.000 centavos)
 *    - Participação bruta estimada do JOBS (20%): R$ 1.980,00 (198.000 centavos)
 *    - Reserva (10%): R$ 990,00 (99.000 centavos)
 *    - Total distribuído: R$ 9.900,00 | Diamantes creditados: 50.000 💎 | Bônus: 0 💎
 * 3. Segregação Conceitual e Contábil (11 Indicadores):
 *    - Jamais apresentar R$ 1.980,00 como lucro líquido, caixa livre ou valor disponível para saque.
 *    - Distinguir diamantes comprados, bônus promocionais (valor fiduciário zero), diamantes consumidos,
 *      valor efetivamente recebido, receita elegível e remuneração de criadores.
 * 4. Isolamento Absoluto entre Sandbox e Produção:
 *    - Nenhuma execução do simulador altera saldos reais no ledgerService, cria saques reais,
 *      credita carteiras reais ou reescreve histórico contábil.
 */

import { financialLedger } from './ledgerService';
import { monetizationService } from './monetizationService';
import { PAID_DIAMOND_REFERENCE_CENTS } from './exclusiveContentAndInterestService';
import { buildOfficialLedgerRevenueReport } from '../utils/revenueAndEarningsReport';

export type SimulatorEnvironment = 'sandbox' | 'production';

export type SimulatorActorRole =
  | 'admin'
  | 'master'
  | 'finance'
  | 'auditor'
  | 'moderator'
  | 'creator'
  | 'user'
  | 'guest';

export type RoundingRemainderPolicy = 'RESERVE_ABSORBS_REMAINDER_CENTS';

export interface RevenueSimulatorInput {
  packageId: string;
  packageName?: string;
  salesQuantity: number; // N >= 0 (inteiro)
  paidDiamondsPerSale: number; // d_pago >= 0 (inteiro)
  bonusDiamondsPerSale: number; // d_bonus >= 0 (inteiro)
  referencePricePerPackageCents: number; // P > 0 em centavos inteiros (ex: 990 = R$ 9,90)
  creatorSharePct: number; // ex: 70
  jobsSharePct: number; // ex: 20
  reserveSharePct: number; // ex: 10
  environment?: SimulatorEnvironment;
  actorId?: string;
  actorRole?: SimulatorActorRole;
  // Dados contábeis adicionais opcionais para apuração de resultado líquido
  hasApprovedAccountingDefinition?: boolean;
  estimatedGatewayFeesCents?: number | null;
  estimatedTaxesCents?: number | null;
  estimatedRefundsAndChargebacksCents?: number | null;
  estimatedOperationalExpensesCents?: number | null;
}

export interface CatalogPriceVerification {
  packageId: string;
  packageFoundInCatalog: boolean;
  catalogPackageName: string;
  referencePricePerPackageCents: number;
  catalogPriceInCents: number | null;
  referencePaidDiamonds: number;
  catalogPaidDiamonds: number | null;
  referenceBonusDiamonds: number;
  catalogBonusDiamonds: number | null;
  hasPriceDivergence: boolean;
  hasDiamondsDivergence: boolean;
  priceDeltaCents: number | null;
  verificationMessage: string;
}

export type SimulatorIndicatorKey =
  | 'estimated_gross_revenue'
  | 'confirmed_sales_revenue'
  | 'creators_gross_share'
  | 'jobs_gross_share'
  | 'operational_reserve'
  | 'registered_fees_and_expenses'
  | 'refunds_chargebacks_contestations'
  | 'pending_creator_obligations'
  | 'reconciled_amount'
  | 'confirmed_available_platform_amount'
  | 'net_result';

export interface SimulatorFinancialIndicator {
  indicatorNumber: number; // 1 a 11
  key: SimulatorIndicatorKey;
  label: string;
  nature: 'simulated_estimate' | 'reconciled_ledger' | 'deductions_and_obligations' | 'net_result';
  status: 'estimated' | 'reconciled' | 'insufficient_data';
  amountCents: number | null;
  amountBrl: number | null;
  formattedDisplay: string;
  isAvailableForWithdrawal: boolean;
  formulaSummary: string;
  explanation: string;
}

export interface DiamondAccountingBreakdown {
  paidDiamondsPerSale: number;
  bonusDiamondsPerSale: number;
  totalDiamondsPerSale: number;
  totalPaidDiamondsCredited: number;
  totalBonusDiamondsCredited: number;
  totalDiamondsDistributed: number;
  bonusPercentageOfTotalDiamonds: number;
  referencePricePerPackageCents: number;
  effectivePricePerPaidDiamondCents: number;
  effectivePricePerTotalDiamondCents: number;
  unitConsumptionReferenceCents: number; // 10 centavos (R$ 0,10) por diamante pago consumido
  maxConsumptionEligibleBaseCents: number; // totalPaidDiamondsCredited * 10 centavos
  bonusDiamondsFiatValueCents: 0; // Bônus promocional SEMPRE tem passivo fiduciário R$ 0,00
  packageSpreadVsConsumptionReferenceCents: number; // B - maxConsumptionEligibleBaseCents
  accountingWarning: string;
}

export interface RevenueSimulationExecutionRecord {
  executionId: string;
  timestamp: string;
  actorId: string;
  actorRole: SimulatorActorRole;
  environment: SimulatorEnvironment;
  isSimulationOnly: true;
  ledgerMutated: false;
  ledgerEntriesCountBefore: number;
  ledgerEntriesCountAfter: number;
  input: RevenueSimulatorInput;
  grossEstimatedRevenueCents: number;
  creatorsGrossShareCents: number;
  jobsGrossShareCents: number;
  reserveShareCents: number;
  totalDistributedCents: number;
  totalPaidDiamondsCredited: number;
  totalBonusDiamondsCredited: number;
  totalDiamondsDistributed: number;
  hasCatalogDivergence: boolean;
}

export interface RevenueSimulatorResult {
  executionId: string;
  timestamp: string;
  environment: SimulatorEnvironment;
  actorId: string;
  actorRole: SimulatorActorRole;
  isSimulationOnly: true;
  ledgerMutated: false;
  disclaimer: string;
  jobsShareWarning: string;
  inputNormalized: Required<
    Pick<
      RevenueSimulatorInput,
      | 'packageId'
      | 'packageName'
      | 'salesQuantity'
      | 'paidDiamondsPerSale'
      | 'bonusDiamondsPerSale'
      | 'referencePricePerPackageCents'
      | 'creatorSharePct'
      | 'jobsSharePct'
      | 'reserveSharePct'
      | 'environment'
    >
  >;
  // Resultados Matemáticos em Centavos Inteiros e BRL
  grossEstimatedRevenueCents: number; // B = N * P
  grossEstimatedRevenueBrl: number;
  creatorsGrossShareCents: number; // 70%
  creatorsGrossShareBrl: number;
  jobsGrossShareCents: number; // 20%
  jobsGrossShareBrl: number;
  reserveShareCents: number; // 10%
  reserveShareBrl: number;
  totalDistributedCents: number; // c_criadores + c_jobs + c_reserva === B
  totalDistributedBrl: number;
  roundingRemainderCents: number;
  roundingPolicy: RoundingRemainderPolicy;
  // Diamantes
  diamondBreakdown: DiamondAccountingBreakdown;
  // Verificação contra o catálogo real
  catalogVerification: CatalogPriceVerification;
  // Os 11 indicadores obrigatórios
  indicators: SimulatorFinancialIndicator[];
  // Verificação de isolamento do Ledger
  isolationCheck: {
    ledgerEntriesBefore: number;
    ledgerEntriesAfter: number;
    ledgerIntegrityValid: boolean;
    ledgerMutated: false;
    productionDataTouched: false;
  };
}

const STORAGE_KEY_REVENUE_SIMULATOR_LOGS = 'jobs_admin_revenue_simulator_logs_v1';

const AUTHORIZED_SIMULATOR_ROLES: SimulatorActorRole[] = ['admin', 'master', 'finance', 'auditor'];

export const MANDATORY_REFERENCE_SCENARIO: RevenueSimulatorInput = {
  packageId: 'pkg_inicial',
  packageName: 'Inicial',
  salesQuantity: 1000,
  paidDiamondsPerSale: 50,
  bonusDiamondsPerSale: 0,
  referencePricePerPackageCents: 990, // R$ 9,90
  creatorSharePct: 70,
  jobsSharePct: 20,
  reserveSharePct: 10,
  environment: 'sandbox',
  actorId: 'admin_master',
  actorRole: 'admin',
  hasApprovedAccountingDefinition: false,
  estimatedGatewayFeesCents: null,
  estimatedTaxesCents: null,
  estimatedRefundsAndChargebacksCents: null,
  estimatedOperationalExpensesCents: null,
};

export function formatCentsToBrl(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return 'Dados insuficientes';
  }
  const brl = cents / 100;
  return brl.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function centsToBrlNumber(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

class RevenueSimulatorDomainService {
  private getStoredLogs(): RevenueSimulationExecutionRecord[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_REVENUE_SIMULATOR_LOGS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveStoredLogs(logs: RevenueSimulationExecutionRecord[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_REVENUE_SIMULATOR_LOGS, JSON.stringify(logs.slice(0, 200)));
  }

  public getReferenceScenarioInput(environment: SimulatorEnvironment = 'sandbox'): RevenueSimulatorInput {
    return {
      ...MANDATORY_REFERENCE_SCENARIO,
      environment,
    };
  }

  public getExecutionLogs(): RevenueSimulationExecutionRecord[] {
    return this.getStoredLogs();
  }

  public clearExecutionLogsForTesting(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_REVENUE_SIMULATOR_LOGS);
    }
  }

  /**
   * Verifica o preço e a composição de diamantes de um pacote em relação ao catálogo configurado.
   */
  public verifyPackageAgainstCatalog(input: {
    packageId: string;
    referencePricePerPackageCents: number;
    paidDiamondsPerSale: number;
    bonusDiamondsPerSale: number;
  }): CatalogPriceVerification {
    const packages = monetizationService.getPackages(false);
    const found = packages.find((p) => p.id === input.packageId);

    if (!found) {
      return {
        packageId: input.packageId,
        packageFoundInCatalog: false,
        catalogPackageName: 'Pacote Personalizado (Fora do Catálogo)',
        referencePricePerPackageCents: input.referencePricePerPackageCents,
        catalogPriceInCents: null,
        referencePaidDiamonds: input.paidDiamondsPerSale,
        catalogPaidDiamonds: null,
        referenceBonusDiamonds: input.bonusDiamondsPerSale,
        catalogBonusDiamonds: null,
        hasPriceDivergence: true,
        hasDiamondsDivergence: true,
        priceDeltaCents: null,
        verificationMessage: `Pacote "${input.packageId}" não encontrado no catálogo oficial. Simulação executada como cenário customizado.`,
      };
    }

    const hasPriceDivergence = found.priceInCents !== input.referencePricePerPackageCents;
    const hasDiamondsDivergence =
      found.creditsAmount !== input.paidDiamondsPerSale || found.bonusCredits !== input.bonusDiamondsPerSale;
    const priceDeltaCents = input.referencePricePerPackageCents - found.priceInCents;

    const notes: string[] = [];
    if (!hasPriceDivergence && !hasDiamondsDivergence) {
      notes.push(
        `Conforme catálogo vigente (${found.name}: ${formatCentsToBrl(found.priceInCents)} | ${found.creditsAmount} 💎 pagos + ${found.bonusCredits} 💎 bônus).`
      );
    } else {
      if (hasPriceDivergence) {
        notes.push(
          `DIVERGÊNCIA DE PREÇO: Valor simulado (${formatCentsToBrl(input.referencePricePerPackageCents)}) difere do catálogo atual (${formatCentsToBrl(found.priceInCents)}).`
        );
      }
      if (hasDiamondsDivergence) {
        notes.push(
          `DIVERGÊNCIA DE DIAMANTES: Simulado (${input.paidDiamondsPerSale} 💎 + ${input.bonusDiamondsPerSale} 💎 bônus) difere do catálogo (${found.creditsAmount} 💎 + ${found.bonusCredits} 💎 bônus).`
        );
      }
    }

    return {
      packageId: found.id,
      packageFoundInCatalog: true,
      catalogPackageName: found.name,
      referencePricePerPackageCents: input.referencePricePerPackageCents,
      catalogPriceInCents: found.priceInCents,
      referencePaidDiamonds: input.paidDiamondsPerSale,
      catalogPaidDiamonds: found.creditsAmount,
      referenceBonusDiamonds: input.bonusDiamondsPerSale,
      catalogBonusDiamonds: found.bonusCredits ?? 0,
      hasPriceDivergence,
      hasDiamondsDivergence,
      priceDeltaCents,
      verificationMessage: notes.join(' '),
    };
  }

  /**
   * Valida todos os parâmetros do simulador antes de qualquer cálculo.
   * Rejeita valores negativos, preços <= 0, soma de alíquotas != 100% e perfis sem permissão administrativa.
   */
  public validateInput(input: RevenueSimulatorInput): void {
    const actorRole: SimulatorActorRole = input.actorRole || 'admin';
    if (!AUTHORIZED_SIMULATOR_ROLES.includes(actorRole)) {
      throw new Error(
        `Acesso negado ao Simulador Administrativo de Receita: o perfil "${actorRole}" não possui permissão administrativa.`
      );
    }

    if (
      typeof input.salesQuantity !== 'number' ||
      !Number.isFinite(input.salesQuantity) ||
      !Number.isInteger(input.salesQuantity) ||
      input.salesQuantity < 0
    ) {
      throw new Error(
        `Quantidade de vendas inválida (${input.salesQuantity}). O número de vendas (N) deve ser um inteiro maior ou igual a zero.`
      );
    }

    if (
      typeof input.referencePricePerPackageCents !== 'number' ||
      !Number.isFinite(input.referencePricePerPackageCents) ||
      !Number.isInteger(input.referencePricePerPackageCents) ||
      input.referencePricePerPackageCents <= 0
    ) {
      throw new Error(
        `Preço de referência inválido (${input.referencePricePerPackageCents} centavos). O preço por pacote (P) deve ser um inteiro positivo em centavos.`
      );
    }

    if (
      typeof input.paidDiamondsPerSale !== 'number' ||
      !Number.isFinite(input.paidDiamondsPerSale) ||
      !Number.isInteger(input.paidDiamondsPerSale) ||
      input.paidDiamondsPerSale < 0
    ) {
      throw new Error(
        `Quantidade de diamantes pagos por venda inválida (${input.paidDiamondsPerSale}). Deve ser um inteiro maior ou igual a zero.`
      );
    }

    if (
      typeof input.bonusDiamondsPerSale !== 'number' ||
      !Number.isFinite(input.bonusDiamondsPerSale) ||
      !Number.isInteger(input.bonusDiamondsPerSale) ||
      input.bonusDiamondsPerSale < 0
    ) {
      throw new Error(
        `Quantidade de diamantes de bônus por venda inválida (${input.bonusDiamondsPerSale}). Deve ser um inteiro maior ou igual a zero.`
      );
    }

    if (input.paidDiamondsPerSale + input.bonusDiamondsPerSale <= 0) {
      throw new Error('O pacote deve conter ao menos 1 diamante distribuído por venda.');
    }

    if (
      typeof input.creatorSharePct !== 'number' ||
      !Number.isFinite(input.creatorSharePct) ||
      input.creatorSharePct < 0 ||
      typeof input.jobsSharePct !== 'number' ||
      !Number.isFinite(input.jobsSharePct) ||
      input.jobsSharePct < 0 ||
      typeof input.reserveSharePct !== 'number' ||
      !Number.isFinite(input.reserveSharePct) ||
      input.reserveSharePct < 0
    ) {
      throw new Error('Os percentuais de participação (Criadores, JOBS e Reserva) devem ser números não negativos.');
    }

    const creatorBps = Math.round(input.creatorSharePct * 100);
    const jobsBps = Math.round(input.jobsSharePct * 100);
    const reserveBps = Math.round(input.reserveSharePct * 100);
    const totalBps = creatorBps + jobsBps + reserveBps;

    if (totalBps !== 10000) {
      throw new Error(
        `Soma de percentuais inválida (${(totalBps / 100).toFixed(2)}%). A soma de Criadores (${input.creatorSharePct}%), JOBS (${input.jobsSharePct}%) e Reserva (${input.reserveSharePct}%) deve ser exatamente 100%.`
      );
    }

    const optionalDeductions = [
      { name: 'tarifas de gateway', val: input.estimatedGatewayFeesCents },
      { name: 'tributos', val: input.estimatedTaxesCents },
      { name: 'estornos e contestações', val: input.estimatedRefundsAndChargebacksCents },
      { name: 'despesas operacionais', val: input.estimatedOperationalExpensesCents },
    ];

    for (const item of optionalDeductions) {
      if (item.val !== null && item.val !== undefined) {
        if (!Number.isFinite(item.val) || !Number.isInteger(item.val) || item.val < 0) {
          throw new Error(`Valor inválido para ${item.name} (${item.val}). Deve ser inteiro não negativo em centavos.`);
        }
      }
    }
  }

  /**
   * Executa a simulação financeira em centavos inteiros sem alterar saldos ou registros do ledgerService.
   */
  public runSimulation(rawInput?: Partial<RevenueSimulatorInput>): RevenueSimulatorResult {
    const input: RevenueSimulatorInput = {
      ...MANDATORY_REFERENCE_SCENARIO,
      ...rawInput,
    };

    // Snapshot do livro-razão ANTES da execução para comprovar imutabilidade
    const ledgerEntriesBefore = financialLedger.getEntries().length;

    this.validateInput(input);

    const environment: SimulatorEnvironment = input.environment || 'sandbox';
    const actorId = input.actorId || 'admin_master';
    const actorRole: SimulatorActorRole = input.actorRole || 'admin';

    const catalogVerification = this.verifyPackageAgainstCatalog({
      packageId: input.packageId,
      referencePricePerPackageCents: input.referencePricePerPackageCents,
      paidDiamondsPerSale: input.paidDiamondsPerSale,
      bonusDiamondsPerSale: input.bonusDiamondsPerSale,
    });

    const packageName = input.packageName || catalogVerification.catalogPackageName || 'Inicial';

    // 1. Receita Bruta Estimada em Centavos Inteiros: B = N * P
    const N = input.salesQuantity;
    const P = input.referencePricePerPackageCents;
    const B = N * P;

    // 2. Divisão em Centavos Inteiros com Política Determinística de Arredondamento
    const creatorBps = Math.round(input.creatorSharePct * 100);
    const jobsBps = Math.round(input.jobsSharePct * 100);
    const reserveBps = Math.round(input.reserveSharePct * 100);

    const rawCreatorsCents = Math.floor((B * creatorBps) / 10000);
    const rawJobsCents = Math.floor((B * jobsBps) / 10000);
    const rawReserveCents = Math.floor((B * reserveBps) / 10000);

    const remainderCents = B - (rawCreatorsCents + rawJobsCents + rawReserveCents);

    let creatorsGrossShareCents = rawCreatorsCents;
    let jobsGrossShareCents = rawJobsCents;
    let reserveShareCents = rawReserveCents;

    // Política determinística: o resíduo de arredondamento (0, 1 ou 2 centavos) é absorvido pela Reserva
    // (ou pela primeira parcela com alíquota > 0 caso a Reserva seja 0%).
    if (remainderCents !== 0) {
      if (reserveBps > 0) {
        reserveShareCents += remainderCents;
      } else if (jobsBps > 0) {
        jobsGrossShareCents += remainderCents;
      } else {
        creatorsGrossShareCents += remainderCents;
      }
    }

    const totalDistributedCents = creatorsGrossShareCents + jobsGrossShareCents + reserveShareCents;

    // 3. Contabilidade de Diamantes (Pagos vs Bônus)
    const totalPaidDiamondsCredited = N * input.paidDiamondsPerSale;
    const totalBonusDiamondsCredited = N * input.bonusDiamondsPerSale;
    const totalDiamondsDistributed = totalPaidDiamondsCredited + totalBonusDiamondsCredited;
    const totalDiamondsPerSale = input.paidDiamondsPerSale + input.bonusDiamondsPerSale;

    const effectivePricePerPaidDiamondCents =
      totalPaidDiamondsCredited > 0 ? Number((B / totalPaidDiamondsCredited).toFixed(4)) : 0;
    const effectivePricePerTotalDiamondCents =
      totalDiamondsDistributed > 0 ? Number((B / totalDiamondsDistributed).toFixed(4)) : 0;
    const bonusPercentageOfTotalDiamonds =
      totalDiamondsDistributed > 0
        ? Number(((totalBonusDiamondsCredited / totalDiamondsDistributed) * 100).toFixed(2))
        : 0;

    const maxConsumptionEligibleBaseCents = totalPaidDiamondsCredited * PAID_DIAMOND_REFERENCE_CENTS;
    const packageSpreadVsConsumptionReferenceCents = B - maxConsumptionEligibleBaseCents;

    const diamondBreakdown: DiamondAccountingBreakdown = {
      paidDiamondsPerSale: input.paidDiamondsPerSale,
      bonusDiamondsPerSale: input.bonusDiamondsPerSale,
      totalDiamondsPerSale,
      totalPaidDiamondsCredited,
      totalBonusDiamondsCredited,
      totalDiamondsDistributed,
      bonusPercentageOfTotalDiamonds,
      referencePricePerPackageCents: P,
      effectivePricePerPaidDiamondCents,
      effectivePricePerTotalDiamondCents,
      unitConsumptionReferenceCents: PAID_DIAMOND_REFERENCE_CENTS,
      maxConsumptionEligibleBaseCents,
      bonusDiamondsFiatValueCents: 0,
      packageSpreadVsConsumptionReferenceCents,
      accountingWarning:
        totalBonusDiamondsCredited > 0
          ? `Este cenário inclui ${totalBonusDiamondsCredited.toLocaleString('pt-BR')} 💎 de bônus promocional (R$ 0,00 de valor fiduciário). Diamantes de bônus jamais devem ser multiplicados por R$ 0,10 como receita distribuível.`
          : `Cenário sem bônus promocional (${totalPaidDiamondsCredited.toLocaleString('pt-BR')} 💎 pagos). Preço efetivo de aquisição do pacote: R$ ${(effectivePricePerPaidDiamondCents / 100).toFixed(3).replace('.', ',')} por 💎 vs referência unitária de consumo de R$ 0,10 por 💎 pago.`,
    };

    // 4. Leitura Somente-Leitura dos Dados Conciliados Reais do Livro-Razão para Comparação
    const ledgerReport = buildOfficialLedgerRevenueReport({ period: 'all' });
    const confirmedSalesCents =
      environment === 'production'
        ? 0
        : ledgerReport.reconciliation.totalReceived.valueCents ?? 0;
    const reconciledRefundsCents =
      environment === 'production'
        ? 0
        : ledgerReport.reconciliation.totalRefunded.valueCents ?? 0;
    const pendingCreatorObligationsCents =
      environment === 'production'
        ? 0
        : ledgerReport.reconciliation.pendingCreatorObligations.valueCents ?? 0;
    const reconciledNetRevenueCents =
      environment === 'production'
        ? 0
        : ledgerReport.reconciliation.netRecognizedRevenue.valueCents ?? 0;
    const confirmedAvailablePlatformCents =
      environment === 'production'
        ? 0
        : ledgerReport.reconciliation.availableJobsCash.valueCents ?? 0;

    // Verificação se existem dados contábeis completos para cálculo do Resultado Líquido (Indicador 11)
    const hasAllDeductionInputs =
      input.hasApprovedAccountingDefinition === true &&
      input.estimatedGatewayFeesCents !== null &&
      input.estimatedGatewayFeesCents !== undefined &&
      input.estimatedTaxesCents !== null &&
      input.estimatedTaxesCents !== undefined &&
      input.estimatedRefundsAndChargebacksCents !== null &&
      input.estimatedRefundsAndChargebacksCents !== undefined &&
      input.estimatedOperationalExpensesCents !== null &&
      input.estimatedOperationalExpensesCents !== undefined;

    const totalExplicitFeesAndExpensesCents = hasAllDeductionInputs
      ? (input.estimatedGatewayFeesCents ?? 0) +
        (input.estimatedTaxesCents ?? 0) +
        (input.estimatedOperationalExpensesCents ?? 0)
      : null;

    const explicitRefundsCents =
      input.estimatedRefundsAndChargebacksCents !== null &&
      input.estimatedRefundsAndChargebacksCents !== undefined
        ? input.estimatedRefundsAndChargebacksCents
        : reconciledRefundsCents;

    const netResultCents = hasAllDeductionInputs
      ? jobsGrossShareCents -
        (input.estimatedGatewayFeesCents ?? 0) -
        (input.estimatedTaxesCents ?? 0) -
        (input.estimatedRefundsAndChargebacksCents ?? 0) -
        (input.estimatedOperationalExpensesCents ?? 0)
      : null;

    // 5. Construção dos 11 Indicadores Obrigatórios (Seção 5)
    const indicators: SimulatorFinancialIndicator[] = [
      {
        indicatorNumber: 1,
        key: 'estimated_gross_revenue',
        label: '1. Receita bruta estimada',
        nature: 'simulated_estimate',
        status: 'estimated',
        amountCents: B,
        amountBrl: centsToBrlNumber(B),
        formattedDisplay: formatCentsToBrl(B),
        isAvailableForWithdrawal: false,
        formulaSummary: `B = N (${N.toLocaleString('pt-BR')}) × P (${formatCentsToBrl(P)})`,
        explanation:
          'Estimativa matemática bruta das vendas parametrizadas no simulador, antes de tarifas de gateway, tributos, estornos e despesas.',
      },
      {
        indicatorNumber: 2,
        key: 'confirmed_sales_revenue',
        label: '2. Receita confirmada de vendas',
        nature: 'reconciled_ledger',
        status: 'reconciled',
        amountCents: confirmedSalesCents,
        amountBrl: centsToBrlNumber(confirmedSalesCents),
        formattedDisplay: formatCentsToBrl(confirmedSalesCents),
        isAvailableForWithdrawal: false,
        formulaSummary: 'Entradas confirmadas no Livro-Razão (excluindo projeções do simulador)',
        explanation:
          environment === 'production'
            ? 'Em Produção sem gateway liquidado, a receita confirmada é R$ 0,00. A projeção do simulador não altera vendas confirmadas.'
            : 'Total de vendas efetivamente postadas e confirmadas no Livro-Razão de testes, separado da estimativa simulada.',
      },
      {
        indicatorNumber: 3,
        key: 'creators_gross_share',
        label: `3. Participação bruta dos criadores (${input.creatorSharePct}%)`,
        nature: 'simulated_estimate',
        status: 'estimated',
        amountCents: creatorsGrossShareCents,
        amountBrl: centsToBrlNumber(creatorsGrossShareCents),
        formattedDisplay: formatCentsToBrl(creatorsGrossShareCents),
        isAvailableForWithdrawal: false,
        formulaSummary: `c_criadores = B × ${input.creatorSharePct}%`,
        explanation:
          'Parcela bruta estimada destinada à remuneração de criadores sobre o cenário simulado. Constitui passivo/obrigação com terceiros e não pertence ao caixa próprio do JOBS.',
      },
      {
        indicatorNumber: 4,
        key: 'jobs_gross_share',
        label: `4. Participação bruta estimada do JOBS (${input.jobsSharePct}%)`,
        nature: 'simulated_estimate',
        status: 'estimated',
        amountCents: jobsGrossShareCents,
        amountBrl: centsToBrlNumber(jobsGrossShareCents),
        formattedDisplay: formatCentsToBrl(jobsGrossShareCents),
        isAvailableForWithdrawal: false,
        formulaSummary: `c_jobs = B × ${input.jobsSharePct}%`,
        explanation:
          'Participação bruta estimada da plataforma antes de tarifas de pagamento, tributos, reembolsos, estornos e despesas operacionais. NÃO representa lucro líquido nem valor disponível para saque.',
      },
      {
        indicatorNumber: 5,
        key: 'operational_reserve',
        label: `5. Reserva operacional / contábil (${input.reserveSharePct}%)`,
        nature: 'simulated_estimate',
        status: 'estimated',
        amountCents: reserveShareCents,
        amountBrl: centsToBrlNumber(reserveShareCents),
        formattedDisplay: formatCentsToBrl(reserveShareCents),
        isAvailableForWithdrawal: false,
        formulaSummary: `c_reserva = B × ${input.reserveSharePct}% (+ ajuste de resíduo: ${remainderCents} centavo(s))`,
        explanation:
          'Reserva técnica estimada de 10% para contingências operacionais, antifraude, variações de pacotes e segurança contábil.',
      },
      {
        indicatorNumber: 6,
        key: 'registered_fees_and_expenses',
        label: '6. Tarifas e despesas registradas',
        nature: 'deductions_and_obligations',
        status: totalExplicitFeesAndExpensesCents !== null ? 'estimated' : 'insufficient_data',
        amountCents: totalExplicitFeesAndExpensesCents,
        amountBrl:
          totalExplicitFeesAndExpensesCents !== null
            ? centsToBrlNumber(totalExplicitFeesAndExpensesCents)
            : null,
        formattedDisplay:
          totalExplicitFeesAndExpensesCents !== null
            ? formatCentsToBrl(totalExplicitFeesAndExpensesCents)
            : 'Dados insuficientes',
        isAvailableForWithdrawal: false,
        formulaSummary: 'Tarifas de Gateway + Tributos + Despesas Operacionais registradas',
        explanation:
          totalExplicitFeesAndExpensesCents !== null
            ? 'Soma das tarifas de processamento, tributos e despesas operacionais informadas para dedução.'
            : 'Dados insuficientes: tarifas de gateway, alíquotas tributárias e despesas operacionais reais não estão integralmente registradas neste cenário.',
      },
      {
        indicatorNumber: 7,
        key: 'refunds_chargebacks_contestations',
        label: '7. Estornos, reembolsos e contestações',
        nature: 'deductions_and_obligations',
        status:
          input.estimatedRefundsAndChargebacksCents !== null &&
          input.estimatedRefundsAndChargebacksCents !== undefined
            ? 'estimated'
            : 'reconciled',
        amountCents: explicitRefundsCents,
        amountBrl: centsToBrlNumber(explicitRefundsCents),
        formattedDisplay: formatCentsToBrl(explicitRefundsCents),
        isAvailableForWithdrawal: false,
        formulaSummary: 'Reembolsos + Chargebacks + Contestações deduzidos',
        explanation:
          'Total de transações estornadas, reembolsadas ou contestadas que reduzem a base financeira distribuível.',
      },
      {
        indicatorNumber: 8,
        key: 'pending_creator_obligations',
        label: '8. Obrigações pendentes com criadores',
        nature: 'deductions_and_obligations',
        status: 'reconciled',
        amountCents: pendingCreatorObligationsCents,
        amountBrl: centsToBrlNumber(pendingCreatorObligationsCents),
        formattedDisplay: formatCentsToBrl(pendingCreatorObligationsCents),
        isAvailableForWithdrawal: false,
        formulaSummary: 'Ganhos de criadores creditados no Livro-Razão e ainda não liquidados',
        explanation:
          'Passivo fiduciário retido em custódia pertencente aos criadores no Livro-Razão oficial. Jamais pode ser sacado pela administração como caixa próprio.',
      },
      {
        indicatorNumber: 9,
        key: 'reconciled_amount',
        label: '9. Valor conciliado (Livro-Razão)',
        nature: 'reconciled_ledger',
        status: 'reconciled',
        amountCents: reconciledNetRevenueCents,
        amountBrl: centsToBrlNumber(reconciledNetRevenueCents),
        formattedDisplay: formatCentsToBrl(reconciledNetRevenueCents),
        isAvailableForWithdrawal: false,
        formulaSummary: 'Receita Confirmada no Ledger − Estornos Conciliados',
        explanation:
          'Volume líquido efetivamente conciliado no Livro-Razão imutável SHA-256. Mantido estritamente separado das estimativas do simulador.',
      },
      {
        indicatorNumber: 10,
        key: 'confirmed_available_platform_amount',
        label: '10. Valor disponível confirmado para a plataforma',
        nature: 'reconciled_ledger',
        status: 'reconciled',
        amountCents: confirmedAvailablePlatformCents,
        amountBrl: centsToBrlNumber(confirmedAvailablePlatformCents),
        formattedDisplay: formatCentsToBrl(confirmedAvailablePlatformCents),
        isAvailableForWithdrawal: environment === 'production' && confirmedAvailablePlatformCents > 0,
        formulaSummary: 'Caixa Conciliado − Obrigações de Criadores − Repasses − Tarifas',
        explanation:
          'Saldo fiduciário efetivamente conciliado e livre de obrigações de terceiros no Livro-Razão. A estimativa simulada de 20% (R$ 1.980,00) NÃO compõe este saldo.',
      },
      {
        indicatorNumber: 11,
        key: 'net_result',
        label: '11. Resultado líquido',
        nature: 'net_result',
        status: netResultCents !== null ? 'estimated' : 'insufficient_data',
        amountCents: netResultCents,
        amountBrl: netResultCents !== null ? centsToBrlNumber(netResultCents) : null,
        formattedDisplay: netResultCents !== null ? formatCentsToBrl(netResultCents) : 'Dados insuficientes',
        isAvailableForWithdrawal: false,
        formulaSummary:
          'Participação Bruta JOBS − Tarifas de Gateway − Tributos − Estornos − Despesas Operacionais',
        explanation:
          netResultCents !== null
            ? 'Resultado líquido estimado após dedução de tarifas, tributos, estornos e despesas operacionais parametrizadas.'
            : 'Dados insuficientes: o resultado líquido exige definição contábil aprovada e preenchimento completo de tarifas de pagamento, tributos, estornos e despesas operacionais.',
      },
    ];

    // Snapshot do livro-razão DEPOIS da execução para garantir isolamento absoluto
    const ledgerEntriesAfter = financialLedger.getEntries().length;
    const ledgerIntegrity = financialLedger.verifyLedgerIntegrity();

    if (ledgerEntriesBefore !== ledgerEntriesAfter) {
      throw new Error('VIOLAÇÃO CRÍTICA DE ISOLAMENTO: O simulador alterou o número de entradas do Livro-Razão.');
    }

    const executionId = `rev_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    const executionRecord: RevenueSimulationExecutionRecord = {
      executionId,
      timestamp,
      actorId,
      actorRole,
      environment,
      isSimulationOnly: true,
      ledgerMutated: false,
      ledgerEntriesCountBefore: ledgerEntriesBefore,
      ledgerEntriesCountAfter: ledgerEntriesAfter,
      input: {
        ...input,
        packageName,
        environment,
        actorId,
        actorRole,
      },
      grossEstimatedRevenueCents: B,
      creatorsGrossShareCents,
      jobsGrossShareCents,
      reserveShareCents,
      totalDistributedCents,
      totalPaidDiamondsCredited,
      totalBonusDiamondsCredited,
      totalDiamondsDistributed,
      hasCatalogDivergence:
        catalogVerification.hasPriceDivergence || catalogVerification.hasDiamondsDivergence,
    };

    const existingLogs = this.getStoredLogs();
    this.saveStoredLogs([executionRecord, ...existingLogs]);

    return {
      executionId,
      timestamp,
      environment,
      actorId,
      actorRole,
      isSimulationOnly: true,
      ledgerMutated: false,
      disclaimer:
        'SIMULAÇÃO ADMINISTRATIVA DE RECEITA (SOMENTE ESTIMATIVA MATEMÁTICA): Nenhum saldo real de usuário, criador ou plataforma foi alterado no ledgerService. Nenhum saque ou lançamento contábil foi gerado.',
      jobsShareWarning: `A participação bruta estimada do JOBS (${formatCentsToBrl(jobsGrossShareCents)}) é uma projeção matemática antes de tarifas de pagamento, tributos, reembolsos, estornos e despesas operacionais. Não representa lucro líquido nem caixa disponível confirmado.`,
      inputNormalized: {
        packageId: input.packageId,
        packageName,
        salesQuantity: N,
        paidDiamondsPerSale: input.paidDiamondsPerSale,
        bonusDiamondsPerSale: input.bonusDiamondsPerSale,
        referencePricePerPackageCents: P,
        creatorSharePct: input.creatorSharePct,
        jobsSharePct: input.jobsSharePct,
        reserveSharePct: input.reserveSharePct,
        environment,
      },
      grossEstimatedRevenueCents: B,
      grossEstimatedRevenueBrl: centsToBrlNumber(B),
      creatorsGrossShareCents,
      creatorsGrossShareBrl: centsToBrlNumber(creatorsGrossShareCents),
      jobsGrossShareCents,
      jobsGrossShareBrl: centsToBrlNumber(jobsGrossShareCents),
      reserveShareCents,
      reserveShareBrl: centsToBrlNumber(reserveShareCents),
      totalDistributedCents,
      totalDistributedBrl: centsToBrlNumber(totalDistributedCents),
      roundingRemainderCents: remainderCents,
      roundingPolicy: 'RESERVE_ABSORBS_REMAINDER_CENTS',
      diamondBreakdown,
      catalogVerification,
      indicators,
      isolationCheck: {
        ledgerEntriesBefore,
        ledgerEntriesAfter,
        ledgerIntegrityValid: ledgerIntegrity.isValid,
        ledgerMutated: false,
        productionDataTouched: false,
      },
    };
  }
}

export const revenueSimulatorService = new RevenueSimulatorDomainService();
