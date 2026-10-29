/**
 * Bateria de Testes Automatizados para o Refinamento do Ranking Financeiro de Criadores
 * JOBS - Módulo Administrativo Financeiro & Auditoria Contábil
 */

import { creatorRankingAnalyticalService } from '../services/creatorRankingAnalyticalService';
import { financialLedger } from '../services/ledgerService';
import { monetizationService } from '../services/monetizationService';
import { CreatorRankingItem } from '../types';
import { IndicatorKey } from '../types/creatorFinancialRanking';

export interface RankingRefinementTestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, any>;
}

export interface RankingRefinementTestSuiteSummary {
  timestamp: string;
  durationMs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: RankingRefinementTestResult[];
}

export function runCreatorRankingRefinementTests(): RankingRefinementTestSuiteSummary {
  const startTime = performance.now();
  const results: RankingRefinementTestResult[] = [];

  const runTest = (
    id: string,
    name: string,
    category: string,
    testFn: () => { passed: boolean; error?: string; details?: Record<string, any> }
  ) => {
    const t0 = performance.now();
    try {
      const outcome = testFn();
      results.push({
        id,
        name,
        category,
        passed: outcome.passed,
        durationMs: Number((performance.now() - t0).toFixed(2)),
        error: outcome.error,
        details: outcome.details,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        passed: false,
        durationMs: Number((performance.now() - t0).toFixed(2)),
        error: err?.message || String(err),
      });
    }
  };

  // ==========================================================================
  // 1. TOOLTIP ANALÍTICO & METADADOS CONTÁBEIS (8 DIMENSÕES)
  // ==========================================================================
  runTest(
    'TEST_CR_REF_001',
    'Tooltip Analítico retorna as 8 dimensões contábeis obrigatórias',
    'Tooltips Analíticos',
    () => {
      const meta = creatorRankingAnalyticalService.getIndicatorAuditMetadata(
        'net_accumulated',
        'sandbox',
        '7days'
      );

      const hasName = Boolean(meta.name && meta.name.length > 0);
      const hasSource = Boolean(meta.source && meta.source.includes('financialLedger'));
      const hasFormula = Boolean(meta.formula && meta.formula.includes('0,70'));
      const hasPeriod = Boolean(meta.periodLabel && meta.periodRange);
      const hasTimezone = Boolean(meta.timezone && meta.timezone.includes('America/Sao_Paulo'));
      const hasCurrency = meta.currency === 'BRL';
      const hasStatus = Boolean(meta.financialStatusLabel);
      const hasLimitations = Array.isArray(meta.limitations) && meta.limitations.length >= 2;

      const passed =
        hasName &&
        hasSource &&
        hasFormula &&
        hasPeriod &&
        hasTimezone &&
        hasCurrency &&
        hasStatus &&
        hasLimitations;

      return {
        passed,
        details: {
          name: meta.name,
          source: meta.source,
          formula: meta.formula,
          timezone: meta.timezone,
          currency: meta.currency,
          limitationsCount: meta.limitations.length,
        },
      };
    }
  );

  // ==========================================================================
  // 2. FÓRMULA CONTÁBIL 70/30 E CONSISTÊNCIA MATEMÁTICA
  // ==========================================================================
  runTest(
    'TEST_CR_REF_002',
    'Split contábil: Parcela Criador (70%) + Taxa JOBS (30%) totaliza Vendas Brutas',
    'Regras de Rateio Contábil',
    () => {
      const mockCreator: CreatorRankingItem = {
        rank: 1,
        creatorId: 'creator_test_001',
        publicName: 'Criador Teste',
        handle: '@teste',
        avatar: '',
        category: 'Boudoir',
        grossSalesConfirmedBrl: 1000.0,
        platformCommissionBrl: 300.0,
        assignedFeesBrl: 10.0,
        refundsAndAdjustmentsBrl: 0.0,
        netAccumulatedEarningsBrl: 690.0,
        pendingPaymentBrl: 200.0,
        eligibleForWithdrawalBrl: 490.0,
        totalPaidBrl: 0.0,
        lastActivityDate: new Date().toISOString(),
        accountStatus: 'active',
        kycVerificationStatus: 'verified_18_plus',
        salesCount: 10,
        buyersCount: 8,
        avgTicketBrl: 100.0,
        growthPct: 15.0,
        conversionRatePct: 4.5,
        unlockedMediaCount: 25,
        environment: 'sandbox',
      };

      const series = creatorRankingAnalyticalService.getCreatorComparativeSeries(
        mockCreator,
        'sandbox',
        '7days'
      );

      const gross = series.currentPeriod.grossSalesBrl;
      const creatorShare = series.currentPeriod.creatorShareBrl;
      const platformFee = series.currentPeriod.platformFeeBrl;
      const sum = Number((creatorShare + platformFee).toFixed(2));

      const passed = gross === 1000.0 && creatorShare === 700.0 && platformFee === 300.0 && sum === 1000.0;

      return {
        passed,
        details: {
          gross,
          creatorShare,
          platformFee,
          sum,
        },
      };
    }
  );

  // ==========================================================================
  // 3. AMBIENTE PRODUÇÃO: BLOQUEIO FAIL-SAFE E NENHUM DADO ALUCINADO
  // ==========================================================================
  runTest(
    'TEST_CR_REF_003',
    'Ambiente de Produção reporta Indisponível sem simular ou inventar métricas',
    'Segurança em Produção',
    () => {
      const meta = creatorRankingAnalyticalService.getIndicatorAuditMetadata(
        'gross_sales',
        'production',
        '30days'
      );

      const mockCreator: CreatorRankingItem = {
        rank: 1,
        creatorId: 'creator_prod_001',
        publicName: 'Criador Prod',
        handle: '@prod',
        avatar: '',
        category: 'Fotos',
        grossSalesConfirmedBrl: 0,
        platformCommissionBrl: 0,
        assignedFeesBrl: 0,
        refundsAndAdjustmentsBrl: 0,
        netAccumulatedEarningsBrl: 0,
        pendingPaymentBrl: 0,
        eligibleForWithdrawalBrl: 0,
        totalPaidBrl: 0,
        lastActivityDate: new Date().toISOString(),
        accountStatus: 'active',
        kycVerificationStatus: 'verified_18_plus',
        salesCount: 0,
        buyersCount: 0,
        avgTicketBrl: 0,
        growthPct: 0,
        conversionRatePct: 0,
        unlockedMediaCount: 0,
        environment: 'production',
      };

      const series = creatorRankingAnalyticalService.getCreatorComparativeSeries(
        mockCreator,
        'production',
        '30days'
      );

      const passed =
        meta.isAvailable === false &&
        meta.financialStatus === 'indisponivel' &&
        series.environment === 'production' &&
        series.currentPeriod.hasSufficientHistory === false &&
        series.disclaimer.includes('produção sem integração');

      return {
        passed,
        details: {
          metaAvailable: meta.isAvailable,
          metaStatus: meta.financialStatus,
          seriesEnvironment: series.environment,
          disclaimer: series.disclaimer,
        },
      };
    }
  );

  // ==========================================================================
  // 4. SINCRONIZAÇÃO COM FILTRO TEMPORAL DO PAINEL (7D, 14D, 30D, HOJE)
  // ==========================================================================
  runTest(
    'TEST_CR_REF_004',
    'Sincronização temporal automática com períodos suportados',
    'Filtros Temporais',
    () => {
      const periods = ['today', '7days', '14days', '30days', 'all'];
      let allMatch = true;

      for (const p of periods) {
        const meta = creatorRankingAnalyticalService.getIndicatorAuditMetadata(
          'gross_sales',
          'sandbox',
          p
        );
        if (!meta.periodLabel || !meta.periodRange) {
          allMatch = false;
          break;
        }
      }

      return {
        passed: allMatch,
        details: { periodsTested: periods },
      };
    }
  );

  // ==========================================================================
  // 5. TRATAMENTO DE HISTÓRICO INSUFICIENTE NO PERÍODO ANTERIOR
  // ==========================================================================
  runTest(
    'TEST_CR_REF_005',
    'Ausência de histórico anterior exibe aviso explícito sem zerar saldo',
    'Integridade Histórica',
    () => {
      const mockCreatorNew: CreatorRankingItem = {
        rank: 5,
        creatorId: 'creator_new_user_999',
        publicName: 'Criador Novo',
        handle: '@novo',
        avatar: '',
        category: 'Dança',
        grossSalesConfirmedBrl: 500.0,
        platformCommissionBrl: 150.0,
        assignedFeesBrl: 0,
        refundsAndAdjustmentsBrl: 0,
        netAccumulatedEarningsBrl: 350.0,
        pendingPaymentBrl: 350.0,
        eligibleForWithdrawalBrl: 0,
        totalPaidBrl: 0,
        lastActivityDate: new Date().toISOString(),
        accountStatus: 'active',
        kycVerificationStatus: 'verified_18_plus',
        salesCount: 5,
        buyersCount: 5,
        avgTicketBrl: 100.0,
        growthPct: 0,
        conversionRatePct: 5.0,
        unlockedMediaCount: 10,
        environment: 'sandbox',
      };

      const series = creatorRankingAnalyticalService.getCreatorComparativeSeries(
        mockCreatorNew,
        'sandbox',
        '7days'
      );

      // Deve manter saldo atual (R$ 350) e sinalizar gap histórico no período anterior
      const passed =
        series.currentPeriod.netEarningsBrl === 350.0 &&
        series.hasHistoryGap === true &&
        series.priorPeriod === null &&
        series.deltaPct === null;

      return {
        passed,
        details: {
          currentNet: series.currentPeriod.netEarningsBrl,
          hasHistoryGap: series.hasHistoryGap,
          priorPeriod: series.priorPeriod,
          deltaPct: series.deltaPct,
        },
      };
    }
  );

  // ==========================================================================
  // 6. SEGREGAÇÃO MONETÁRIA (BRL VS CRÉDITOS VIRTUAIS)
  // ==========================================================================
  runTest(
    'TEST_CR_REF_006',
    'Segregação estrita entre Reais (BRL) e Créditos Virtuais',
    'Segregação Patrimonial',
    () => {
      const keys: IndicatorKey[] = [
        'gross_sales',
        'platform_commission',
        'psp_fees',
        'refunds_adjustments',
        'net_accumulated',
        'pending_payment',
        'eligible_withdrawal',
        'total_paid',
      ];

      let allBrl = true;
      for (const k of keys) {
        const meta = creatorRankingAnalyticalService.getIndicatorAuditMetadata(k, 'sandbox', '7days');
        if (meta.currency !== 'BRL') {
          allBrl = false;
        }
      }

      return {
        passed: allBrl,
        details: { indicatorsVerified: keys.length, allBrl },
      };
    }
  );

  // ==========================================================================
  // 7. TRATAMENTO SEGURO DE DIVISÃO POR ZERO
  // ==========================================================================
  runTest(
    'TEST_CR_REF_007',
    'Cálculo de ticket médio e decomposição com vendas zero não gera NaN ou infinito',
    'Tratamento Numérico',
    () => {
      const mockCreatorZero: CreatorRankingItem = {
        rank: 99,
        creatorId: 'creator_zero_sales',
        publicName: 'Criador Zero',
        handle: '@zero',
        avatar: '',
        category: 'Fotos',
        grossSalesConfirmedBrl: 0,
        platformCommissionBrl: 0,
        assignedFeesBrl: 0,
        refundsAndAdjustmentsBrl: 0,
        netAccumulatedEarningsBrl: 0,
        pendingPaymentBrl: 0,
        eligibleForWithdrawalBrl: 0,
        totalPaidBrl: 0,
        lastActivityDate: new Date().toISOString(),
        accountStatus: 'active',
        kycVerificationStatus: 'verified_18_plus',
        salesCount: 0,
        buyersCount: 0,
        avgTicketBrl: 0,
        growthPct: 0,
        conversionRatePct: 0,
        unlockedMediaCount: 0,
        environment: 'sandbox',
      };

      const series = creatorRankingAnalyticalService.getCreatorComparativeSeries(
        mockCreatorZero,
        'sandbox',
        '7days'
      );

      const passed =
        !isNaN(series.currentPeriod.creatorShareBrl) &&
        !isNaN(series.currentPeriod.platformFeeBrl) &&
        !isNaN(series.currentPeriod.netEarningsBrl) &&
        isFinite(series.currentPeriod.grossSalesBrl);

      return {
        passed,
        details: {
          creatorShare: series.currentPeriod.creatorShareBrl,
          platformFee: series.currentPeriod.platformFeeBrl,
          net: series.currentPeriod.netEarningsBrl,
        },
      };
    }
  );

  // ==========================================================================
  // 8. PRESERVAÇÃO DA BUSCA INTELIGENTE E FILTRAGEM
  // ==========================================================================
  runTest(
    'TEST_CR_REF_008',
    'Busca de criadores por ID ou nome preserva consistência das métricas',
    'Filtros e Busca',
    () => {
      const rankings = monetizationService.getCreatorRankings(
        'sandbox',
        '7days',
        'all',
        'net_accumulated',
        'all',
        'all'
      );

      const passed = Array.isArray(rankings) && rankings.length > 0;
      if (passed) {
        const top = rankings[0];
        const series = creatorRankingAnalyticalService.getCreatorComparativeSeries(
          top,
          'sandbox',
          '7days'
        );
        return {
          passed: series.currentPeriod.netEarningsBrl === top.netAccumulatedEarningsBrl,
          details: {
            topCreatorId: top.creatorId,
            rankingNet: top.netAccumulatedEarningsBrl,
            seriesNet: series.currentPeriod.netEarningsBrl,
          },
        };
      }

      return { passed: false, error: 'Lista de rankings em sandbox retornou vazia' };
    }
  );

  // ==========================================================================
  // 9. IMUTABILIDADE DO LIVRO-RAZÃO DURANTE LEITURA
  // ==========================================================================
  runTest(
    'TEST_CR_REF_009',
    'Inspeção do ranking analítico não gera escrituração nem altera o ledger',
    'Imutabilidade do Ledger',
    () => {
      const countBefore = financialLedger.getEntries().length;

      // Executa múltiplas consultas de auditoria e séries
      for (const k of ['gross_sales', 'net_accumulated', 'platform_commission'] as IndicatorKey[]) {
        creatorRankingAnalyticalService.getIndicatorAuditMetadata(k, 'sandbox', '7days');
      }

      const countAfter = financialLedger.getEntries().length;
      const passed = countBefore === countAfter;

      return {
        passed,
        details: { countBefore, countAfter },
      };
    }
  );

  // ==========================================================================
  // 10. PRESERVAÇÃO DE ESTORNOS HISTÓRICOS COM LANÇAMENTO COMPENSATÓRIO
  // ==========================================================================
  runTest(
    'TEST_CR_REF_010',
    'Auditoria de estornos e ajustes confirma débito compensatório no evento',
    'Auditoria Contábil',
    () => {
      const meta = creatorRankingAnalyticalService.getIndicatorAuditMetadata(
        'refunds_adjustments',
        'sandbox',
        '7days'
      );

      const passed =
        meta.formula.includes('Compensatório') &&
        meta.limitations.some((l) => l.includes('Preservação histórica'));

      return {
        passed,
        details: { formula: meta.formula, limitations: meta.limitations },
      };
    }
  );

  const durationMs = Number((performance.now() - startTime).toFixed(2));
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}
