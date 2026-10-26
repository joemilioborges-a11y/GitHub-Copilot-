/**
 * JOBS — TESTES OBRIGATÓRIOS (FASE 6):
 * RELATÓRIO FINANCEIRO DE RECEITAS POR SERVIÇO, GERAÇÃO DE GANHOS (70/30) E RECONCILIAÇÃO
 */

import { financialLedger, LedgerEntry, PayoutRecord } from '../ledgerService';
import {
  buildOfficialLedgerRevenueReport,
  buildVrSimulatorRevenueReport,
} from '../../utils/revenueAndEarningsReport';
import { vrSimulatorService } from '../vrSimulatorService';

export interface RevenueReportTestCaseResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface RevenueReportTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: RevenueReportTestCaseResult[];
}

function createSampleOfficialEntries(): LedgerEntry[] {
  return [
    // 0. Crédito virtual de boas-vindas (NÃO deve entrar em BRL nem caixa)
    {
      id: 'ledg_virtual_welcome_01',
      idempotencyKey: 'idemp_virtual_welcome_01',
      transactionId: 'tx_welcome_01',
      timestamp: '2026-10-20T10:00:00.000Z',
      operationType: 'CREDIT_PURCHASE',
      debitAccount: 'PLATFORM_TREASURY_CREDITS',
      creditAccount: 'USER_WALLET_CREDITS:user_01',
      amount: 100,
      currency: 'CREDITS',
      status: 'posted',
      actorId: 'user_01',
      description: 'Bônus de boas-vindas em créditos virtuais',
      isSandbox: true,
      previousHash: 'GENESIS_0',
      entryHash: 'HASH_WELCOME_01',
    },
    // 1. Compra confirmada de pacote de créditos em BRL (R$ 100,00 -> Entrada de Caixa, SEM split 70/30)
    {
      id: 'ledg_fiat_pack_01',
      idempotencyKey: 'idemp_pack_buy_01_fiat',
      transactionId: 'tx_pack_buy_01',
      timestamp: '2026-10-21T12:00:00.000Z',
      operationType: 'CREDIT_PURCHASE',
      debitAccount: 'EXTERNAL_PAYMENT_CLEARING_BRL:user_01',
      creditAccount: 'ESCROW_PAYMENT_GATEWAY',
      amount: 100.0,
      amountCents: 10000,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      referenceId: 'pkg_ouro',
      description: 'Compra de pacote de créditos Ouro via PIX',
      isSandbox: true,
      previousHash: 'HASH_WELCOME_01',
      entryHash: 'HASH_PACK_01',
    },
    // 2. Desbloqueio de Conteúdo / Cofre VIP (R$ 50,00 -> Elegível 70/30: R$ 35,00 Criador / R$ 15,00 JOBS)
    {
      id: 'ledg_vault_spend_01',
      idempotencyKey: 'idemp_vault_01_spend',
      transactionId: 'tx_vault_01',
      timestamp: '2026-10-22T14:00:00.000Z',
      operationType: 'CONTENT_UNLOCK',
      debitAccount: 'USER_WALLET_CREDITS:user_01',
      creditAccount: 'PLATFORM_TREASURY_CREDITS',
      amount: 50,
      currency: 'CREDITS',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_alice',
      referenceId: 'album_vip_01',
      description: 'Desbloqueio de Álbum Exclusivo Cofre VIP',
      isSandbox: true,
      previousHash: 'HASH_PACK_01',
      entryHash: 'HASH_VAULT_SPEND_01',
    },
    {
      id: 'ledg_vault_creator_01',
      idempotencyKey: 'idemp_vault_01_creator',
      transactionId: 'tx_vault_01',
      timestamp: '2026-10-22T14:00:00.000Z',
      operationType: 'CREATOR_REVENUE_SHARE',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'CREATOR_AVAILABLE_BRL:creator_alice',
      amount: 35.0,
      amountCents: 3500,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_alice',
      referenceId: 'album_vip_01',
      description: 'Repasse 70% Criador — Álbum Cofre VIP',
      isSandbox: true,
      previousHash: 'HASH_VAULT_SPEND_01',
      entryHash: 'HASH_VAULT_CREATOR_01',
    },
    {
      id: 'ledg_vault_platform_01',
      idempotencyKey: 'idemp_vault_01_platform',
      transactionId: 'tx_vault_01',
      timestamp: '2026-10-22T14:00:00.000Z',
      operationType: 'PLATFORM_COMMISSION',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'PLATFORM_REVENUE_BRL',
      amount: 15.0,
      amountCents: 1500,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_alice',
      referenceId: 'album_vip_01',
      description: 'Comissão 30% JOBS — Álbum Cofre VIP',
      isSandbox: true,
      previousHash: 'HASH_VAULT_CREATOR_01',
      entryHash: 'HASH_VAULT_PLATFORM_01',
    },
    // 3. Desbloqueio de Transmissão Ao Vivo VIP (R$ 20,00 -> Elegível 70/30: R$ 14,00 Criador / R$ 6,00 JOBS)
    {
      id: 'ledg_live_spend_01',
      idempotencyKey: 'idemp_live_01_unlock_spend',
      transactionId: 'tx_live_01',
      timestamp: '2026-10-23T18:00:00.000Z',
      operationType: 'CONTENT_UNLOCK',
      debitAccount: 'USER_WALLET_CREDITS:user_01',
      creditAccount: 'PLATFORM_TREASURY_CREDITS',
      amount: 20,
      currency: 'CREDITS',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'live_stream_99',
      metadata: { isLiveUnlock: true },
      description: 'Ingresso Acesso VIP Sala Ao Vivo',
      isSandbox: true,
      previousHash: 'HASH_VAULT_PLATFORM_01',
      entryHash: 'HASH_LIVE_SPEND_01',
    },
    {
      id: 'ledg_live_creator_01',
      idempotencyKey: 'idemp_live_01_creator_70',
      transactionId: 'tx_live_01',
      timestamp: '2026-10-23T18:00:00.000Z',
      operationType: 'CREATOR_REVENUE_SHARE',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'CREATOR_AVAILABLE_BRL:creator_bella',
      amount: 14.0,
      amountCents: 1400,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'live_stream_99',
      metadata: { isLiveUnlock: true },
      description: 'Repasse 70% Criador — Ingresso Live VIP',
      isSandbox: true,
      previousHash: 'HASH_LIVE_SPEND_01',
      entryHash: 'HASH_LIVE_CREATOR_01',
    },
    {
      id: 'ledg_live_platform_01',
      idempotencyKey: 'idemp_live_01_platform_30',
      transactionId: 'tx_live_01',
      timestamp: '2026-10-23T18:00:00.000Z',
      operationType: 'PLATFORM_COMMISSION',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'PLATFORM_REVENUE_BRL',
      amount: 6.0,
      amountCents: 600,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'live_stream_99',
      metadata: { isLiveUnlock: true },
      description: 'Comissão 30% JOBS — Ingresso Live VIP',
      isSandbox: true,
      previousHash: 'HASH_LIVE_CREATOR_01',
      entryHash: 'HASH_LIVE_PLATFORM_01',
    },
    // 4. Presente Virtual em Live (R$ 10,00 -> Elegível 70/30: R$ 7,00 Criador / R$ 3,00 JOBS)
    {
      id: 'ledg_gift_spend_01',
      idempotencyKey: 'idemp_gift_01_tip_spend',
      transactionId: 'tx_gift_01',
      timestamp: '2026-10-24T20:00:00.000Z',
      operationType: 'TIP_GIFT',
      debitAccount: 'USER_WALLET_CREDITS:user_01',
      creditAccount: 'PLATFORM_TREASURY_CREDITS',
      amount: 10,
      currency: 'CREDITS',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'gift_diamond',
      description: 'Presente Diamante enviado em Live',
      isSandbox: true,
      previousHash: 'HASH_LIVE_PLATFORM_01',
      entryHash: 'HASH_GIFT_SPEND_01',
    },
    {
      id: 'ledg_gift_creator_01',
      idempotencyKey: 'idemp_gift_01_tip_creator',
      transactionId: 'tx_gift_01',
      timestamp: '2026-10-24T20:00:00.000Z',
      operationType: 'CREATOR_REVENUE_SHARE',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'CREATOR_AVAILABLE_BRL:creator_bella',
      amount: 7.0,
      amountCents: 700,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'gift_diamond',
      description: 'Repasse 70% Criador — Presente Live',
      isSandbox: true,
      previousHash: 'HASH_GIFT_SPEND_01',
      entryHash: 'HASH_GIFT_CREATOR_01',
    },
    {
      id: 'ledg_gift_platform_01',
      idempotencyKey: 'idemp_gift_01_tip_platform',
      transactionId: 'tx_gift_01',
      timestamp: '2026-10-24T20:00:00.000Z',
      operationType: 'PLATFORM_COMMISSION',
      debitAccount: 'ESCROW_PAYMENT_GATEWAY',
      creditAccount: 'PLATFORM_REVENUE_BRL',
      amount: 3.0,
      amountCents: 300,
      currency: 'BRL',
      status: 'posted',
      actorId: 'user_01',
      targetCreatorId: 'creator_bella',
      referenceId: 'gift_diamond',
      description: 'Comissão 30% JOBS — Presente Live',
      isSandbox: true,
      previousHash: 'HASH_GIFT_CREATOR_01',
      entryHash: 'HASH_GIFT_PLATFORM_01',
    },
    // 5. Prêmio de Reconhecimento Mensal (R$ 5,00 -> Obrigação Direta 100% Criador, SEM split 70/30)
    {
      id: 'ledg_reward_01',
      idempotencyKey: 'idemp_reward_monthly_01',
      transactionId: 'tx_reward_01',
      timestamp: '2026-10-25T10:00:00.000Z',
      operationType: 'PERFORMANCE_REWARD',
      debitAccount: 'PLATFORM_MARKETING_EXPENSE_BRL',
      creditAccount: 'CREATOR_AVAILABLE_BRL:creator_alice',
      amount: 5.0,
      amountCents: 500,
      currency: 'BRL',
      status: 'posted',
      actorId: 'admin_jobs',
      targetCreatorId: 'creator_alice',
      description: 'Prêmio Reconhecimento Mensal Garota JOBS',
      isSandbox: true,
      previousHash: 'HASH_GIFT_PLATFORM_01',
      entryHash: 'HASH_REWARD_01',
    },
  ];
}

export async function runRevenueAndEarningsReportTestSuite(): Promise<RevenueReportTestSuiteSummary> {
  const suiteStart = Date.now();
  const results: RevenueReportTestCaseResult[] = [];

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const start = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - start,
        evidence,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        evidence: 'Falha na asserção',
        error: message,
      });
    }
  };

  // TESTE 1: Agregação por serviço e distinção entre serviços elegíveis e entradas de caixa
  await runTest(
    1,
    'REV-REP-01',
    'Agregação por serviço (Cofre VIP, Lives VIP, Presentes, Assinaturas, Pacotes e Prêmios)',
    () => {
      const entries = createSampleOfficialEntries();
      const report = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: entries,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      const vault = report.barChartCategories.find((c) => c.serviceKey === 'vault_unlock')!;
      const live = report.barChartCategories.find((c) => c.serviceKey === 'live_unlock')!;
      const gifts = report.barChartCategories.find((c) => c.serviceKey === 'live_gifts')!;
      const packs = report.barChartCategories.find((c) => c.serviceKey === 'credit_packages_cash_in')!;
      const rewards = report.barChartCategories.find(
        (c) => c.serviceKey === 'creator_rewards_adjustments'
      )!;

      if (vault.netRevenueBrl !== 50 || live.netRevenueBrl !== 20 || gifts.netRevenueBrl !== 10) {
        throw new Error(
          `Valores líquidos incorretos por serviço: vault=${vault.netRevenueBrl}, live=${live.netRevenueBrl}, gifts=${gifts.netRevenueBrl}`
        );
      }
      if (packs.netRevenueBrl !== 100) {
        throw new Error(`Entrada de pacotes incorreta: ${packs.netRevenueBrl}`);
      }
      if (rewards.netRevenueBrl !== 5) {
        throw new Error(`Prêmios de criadores incorretos: ${rewards.netRevenueBrl}`);
      }

      return `Vault=R$ ${vault.netRevenueBrl.toFixed(2)}, Live=R$ ${live.netRevenueBrl.toFixed(2)}, Gifts=R$ ${gifts.netRevenueBrl.toFixed(2)}, Packs=R$ ${packs.netRevenueBrl.toFixed(2)}, Rewards=R$ ${rewards.netRevenueBrl.toFixed(2)}`;
    }
  );

  // TESTE 2: Divisão 70/30 aplicada SOMENTE nas transações elegíveis
  await runTest(
    2,
    'REV-REP-02',
    'Divisão 70% Criador / 30% JOBS restrita às transações elegíveis (nunca em pacotes ou prêmios)',
    () => {
      const entries = createSampleOfficialEntries();
      const report = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: entries,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      // Total elegível: 50 + 20 + 10 = R$ 80,00 -> 70% = R$ 56,00 | 30% = R$ 24,00
      if (
        report.eligibleTotals.netRevenueBrl !== 80 ||
        report.eligibleTotals.creatorShare70Brl !== 56 ||
        report.eligibleTotals.platformCommission30Brl !== 24 ||
        !report.eligibleTotals.isSplitBalanced
      ) {
        throw new Error(
          `Split 70/30 elegível inválido: net=${report.eligibleTotals.netRevenueBrl}, 70%=${report.eligibleTotals.creatorShare70Brl}, 30%=${report.eligibleTotals.platformCommission30Brl}`
        );
      }

      const packs = report.barChartCategories.find((c) => c.serviceKey === 'credit_packages_cash_in')!;
      const rewards = report.barChartCategories.find(
        (c) => c.serviceKey === 'creator_rewards_adjustments'
      )!;

      if (
        packs.isEligibleFor70_30 !== false ||
        packs.creatorShareBrl !== null ||
        packs.platformCommissionBrl !== null
      ) {
        throw new Error('Venda de pacotes de créditos não deve receber divisão 70/30.');
      }

      if (
        rewards.isEligibleFor70_30 !== false ||
        rewards.creatorShareBrl !== null ||
        rewards.platformCommissionBrl !== null
      ) {
        throw new Error('Prêmios/ajustes não devem receber divisão 70/30.');
      }

      return `Receita Elegível=R$ 80,00 -> 70% Criador=R$ 56,00 + 30% JOBS=R$ 24,00; Pacotes (R$ 100,00) e Prêmios (R$ 5,00) isolados com split=null`;
    }
  );

  // TESTE 3: Contabilização de estornos e cancelamentos por serviço
  await runTest(
    3,
    'REV-REP-03',
    'Contabilização separada de estornos e abatimento proporcional na receita líquida e obrigações',
    () => {
      const entries = createSampleOfficialEntries();
      // Adicionar um desbloqueio de Cofre VIP estornado de R$ 30,00 (R$ 21,00 criador + R$ 9,00 plataforma)
      entries.push(
        {
          id: 'ledg_vault_ref_creator',
          idempotencyKey: 'idemp_vault_ref_02_creator',
          transactionId: 'tx_vault_ref_02',
          timestamp: '2026-10-25T15:00:00.000Z',
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'CREATOR_AVAILABLE_BRL:creator_alice',
          amount: 21.0,
          amountCents: 2100,
          currency: 'BRL',
          status: 'refunded',
          actorId: 'user_01',
          targetCreatorId: 'creator_alice',
          description: 'Estorno de desbloqueio Cofre VIP (70%)',
          isSandbox: true,
          previousHash: 'HASH_REWARD_01',
          entryHash: 'HASH_REF_CREATOR_02',
        },
        {
          id: 'ledg_vault_ref_platform',
          idempotencyKey: 'idemp_vault_ref_02_platform',
          transactionId: 'tx_vault_ref_02',
          timestamp: '2026-10-25T15:00:00.000Z',
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE_BRL',
          amount: 9.0,
          amountCents: 900,
          currency: 'BRL',
          status: 'refunded',
          actorId: 'user_01',
          targetCreatorId: 'creator_alice',
          description: 'Estorno de comissão Cofre VIP (30%)',
          isSandbox: true,
          previousHash: 'HASH_REF_CREATOR_02',
          entryHash: 'HASH_REF_PLATFORM_02',
        }
      );

      const report = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: entries,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      const vault = report.barChartCategories.find((c) => c.serviceKey === 'vault_unlock')!;
      if (vault.grossConfirmedBrl !== 80 || vault.refundedBrl !== 30 || vault.netRevenueBrl !== 50) {
        throw new Error(
          `Falha no cálculo de estorno do Cofre VIP: bruto=${vault.grossConfirmedBrl}, estornado=${vault.refundedBrl}, líquido=${vault.netRevenueBrl}`
        );
      }
      if (vault.creatorShareBrl !== 35 || vault.platformCommissionBrl !== 15) {
        throw new Error(
          `Split líquido pós-estorno incorreto: criador=${vault.creatorShareBrl}, plataforma=${vault.platformCommissionBrl}`
        );
      }

      return `Cofre VIP Bruto=R$ 80,00 (R$ 50 confirmado + R$ 30 revertido), Estornado=R$ 30,00, Líquido=R$ 50,00 (70% Criador=R$ 35,00 | 30% JOBS=R$ 15,00)`;
    }
  );

  // TESTE 4: Bloqueio de duplicidades e exclusão de créditos virtuais
  await runTest(
    4,
    'REV-REP-04',
    'Deduplicação estrita de lançamentos repetidos e exclusão de créditos virtuais do caixa BRL',
    () => {
      const baseEntries = createSampleOfficialEntries();
      // Duplicar intencionalmente 3 lançamentos
      const withDuplicates = [...baseEntries, baseEntries[1], baseEntries[3], baseEntries[4]];

      const report = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: withDuplicates,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      if (report.duplicatesIgnoredCount !== 3) {
        throw new Error(
          `Esperava 3 duplicidades ignoradas, mas obteve ${report.duplicatesIgnoredCount}`
        );
      }
      // Os totais devem permanecer idênticos aos sem duplicatas
      if (report.eligibleTotals.netRevenueBrl !== 80) {
        throw new Error(
          `Duplicidade contaminou a receita líquida elegível: ${report.eligibleTotals.netRevenueBrl}`
        );
      }
      if (!report.virtualCreditsExcludedFromCash) {
        throw new Error('Flag virtualCreditsExcludedFromCash deveria ser true');
      }

      return `3 lançamentos duplicados bloqueados; 100 créditos virtuais de boas-vindas excluídos do caixa BRL`;
    }
  );

  // TESTE 5: Período sem dados e indicador sem cobertura ("Dados insuficientes")
  await runTest(
    5,
    'REV-REP-05',
    'Exibição de "Dados insuficientes" em períodos sem movimentação e em taxas não registradas',
    () => {
      const entries = createSampleOfficialEntries();
      const emptyReport = buildOfficialLedgerRevenueReport({
        period: 'empty_period',
        entriesOverride: entries,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      if (emptyReport.hasDataInPeriod !== false) {
        throw new Error('hasDataInPeriod deveria ser false para empty_period');
      }
      if (emptyReport.reconciliation.totalReceived.status !== 'insufficient_data') {
        throw new Error('totalReceived em período vazio deveria ter status insufficient_data');
      }
      if (emptyReport.reconciliation.totalReceived.formattedDisplay !== 'Dados insuficientes') {
        throw new Error(
          `formattedDisplay deveria ser "Dados insuficientes", obteve: ${emptyReport.reconciliation.totalReceived.formattedDisplay}`
        );
      }
      if (emptyReport.historicalSeries.length !== 0) {
        throw new Error('Série histórica em período vazio não deve repetir saldos passados');
      }

      // Em período com dados mas sem taxas bancárias nos payouts, recordedFees deve informar "Dados insuficientes"
      const activeReportNoFees = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: entries,
        payoutsOverride: [],
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });
      if (
        activeReportNoFees.reconciliation.recordedFees.status !== 'insufficient_data' ||
        activeReportNoFees.reconciliation.recordedFees.formattedDisplay !== 'Dados insuficientes'
      ) {
        throw new Error(
          'recordedFees sem registros de taxa deveria retornar status insufficient_data ("Dados insuficientes")'
        );
      }

      return `Período vazio -> hasDataInPeriod=false e "Dados insuficientes"; Taxas sem registros -> status="insufficient_data" com justificativa explícita`;
    }
  );

  // TESTE 6: Reconciliação de Caixa com repasses, taxas, obrigações e rastreabilidade histórica
  await runTest(
    6,
    'REV-REP-06',
    'Reconciliação completa de caixa (Entradas - Estornos - Obrigações - Repasses - Taxas) e imutabilidade do Ledger',
    () => {
      const entries = createSampleOfficialEntries();
      const payouts: PayoutRecord[] = [
        {
          id: 'payout_real_01',
          idempotencyKey: 'idemp_payout_real_01',
          creatorId: 'creator_alice',
          creatorName: 'Alice VIP',
          amountBrl: 20.0,
          amountCents: 2000,
          feeBrl: 1.5,
          netAmountBrl: 18.5,
          currency: 'BRL',
          status: 'released',
          environment: 'production',
          isSimulation: false,
          payoutMethod: 'PIX',
          createdAt: '2026-10-25T16:00:00.000Z',
          updatedAt: '2026-10-25T16:05:00.000Z',
          releasedAt: '2026-10-25T16:05:00.000Z',
          auditTrail: [],
        },
      ];

      const ledgerEntriesBefore = financialLedger.getEntries().length;

      const report = buildOfficialLedgerRevenueReport({
        period: 'all',
        entriesOverride: entries,
        payoutsOverride: payouts,
        purchasesOverride: [],
        referenceNowIso: '2026-10-26T00:00:00.000Z',
      });

      const ledgerEntriesAfter = financialLedger.getEntries().length;
      if (ledgerEntriesBefore !== ledgerEntriesAfter) {
        throw new Error('O relatório modificou indevidamente o estado do livro-razão.');
      }

      // Verificação matemática da reconciliação:
      // Total recebido em caixa (pacote R$ 100,00) = R$ 100,00
      // Total de obrigações geradas para criadores = R$ 56,00 (70% elegível) + R$ 5,00 (prêmio) = R$ 61,00
      // Pagamento liquidado ao criador = R$ 20,00 (dos quais R$ 18,50 líquidos ao criador + R$ 1,50 taxa registrada)
      // Obrigações pendentes com criadores = R$ 61,00 - R$ 20,00 = R$ 41,00
      // Caixa disponível do JOBS = R$ 100,00 (recebido) - R$ 0,00 (estornos) - R$ 41,00 (obrigações pendentes) - R$ 18,50 (líquido pago) - R$ 1,50 (taxa) = R$ 39,00
      const rec = report.reconciliation;
      if (!rec.isReconciled || rec.reconciliationDeltaCents !== 0) {
        throw new Error(
          `Reconciliação falhou: delta=${rec.reconciliationDeltaCents} centavos`
        );
      }
      if (rec.pendingCreatorObligations.valueBrl !== 41) {
        throw new Error(
          `Obrigações pendentes incorretas: esperava 41, obteve ${rec.pendingCreatorObligations.valueBrl}`
        );
      }
      if (rec.settledPayouts.valueBrl !== 18.5) {
        throw new Error(
          `Pagamentos efetuados líquidos incorretos: esperava 18.5, obteve ${rec.settledPayouts.valueBrl}`
        );
      }
      if (rec.recordedFees.valueBrl !== 1.5) {
        throw new Error(
          `Taxas registradas incorretas: esperava 1.5, obteve ${rec.recordedFees.valueBrl}`
        );
      }
      if (rec.availableJobsCash.valueBrl !== 39) {
        throw new Error(
          `Saldo disponível do JOBS incorreto: esperava 39, obteve ${rec.availableJobsCash.valueBrl}`
        );
      }

      // Verificar também integração de leitura do Sandbox do Simulador VR sem mutação
      const vrSnap = vrSimulatorService.getStateSnapshot();
      const vrReport = buildVrSimulatorRevenueReport({
        period: 'all',
        sandboxEntries: vrSimulatorService.getAllSandboxLedgerEntries(),
        sandboxPayouts: vrSimulatorService.getAllSimulatedPayoutRecords(),
        baseSimulatedDateIso: vrSnap.baseSimulatedDateIso,
        currentSimDay: vrSnap.currentDay,
      });
      if (vrReport.source !== 'vr_simulator_sandbox' || !vrReport.reconciliation.isReconciled) {
        throw new Error('Relatório do Simulador VR não reconciliou corretamente.');
      }

      return `Caixa JOBS=R$ 39,00 reconciliado (Recebido R$ 100,00 - Obrigações Pendentes R$ 41,00 - Pago Líquido R$ 18,50 - Taxas R$ 1,50); Rastreabilidade=${report.originTransactions.length} transações; Ledger inalterado (${ledgerEntriesAfter} entradas)`;
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
