/**
 * SUÍTE DE TESTES E VERIFICAÇÃO DA FASE 1: LIVRO-RAZÃO FINANCEIRO JOBS
 * 
 * Executa validações automatizadas de:
 * 1. Atomicidade de lançamentos
 * 2. Idempotência estrita (replays sem duplicação de saldo)
 * 3. Proibição de saldo negativo (insufficient funds)
 * 4. Segregação de contas (Créditos de consumo vs Ganhos do criador em BRL)
 * 5. Verificação da cadeia de hashes contábeis
 */

import { financialLedger, OFFICIAL_CREDIT_PACKAGES } from '../ledgerService';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runLedgerVerificationSuite(): Promise<{
  allPassed: boolean;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // TESTE 1: Idempotência de Compra de Crédito
  {
    const start = performance.now();
    try {
      const testUserId = `test_user_${Date.now()}`;
      const idempotencyKey = `idemp_test_purchase_${Date.now()}`;
      const pkg = OFFICIAL_CREDIT_PACKAGES[0]; // Inicial: 50 créditos

      // Primeira chamada
      const firstRes = await financialLedger.purchaseCreditPackage({
        userId: testUserId,
        packageId: pkg.id,
        packageName: pkg.name,
        creditsToGrant: pkg.credits,
        priceBrl: pkg.priceBrl,
        gateway: 'pix',
        idempotencyKey,
      });

      const balanceAfterFirst = financialLedger.getUserCredits(testUserId);

      // Segunda chamada com mesma chave (simulação de retry de rede ou duplo clique)
      const secondRes = await financialLedger.purchaseCreditPackage({
        userId: testUserId,
        packageId: pkg.id,
        packageName: pkg.name,
        creditsToGrant: pkg.credits,
        priceBrl: pkg.priceBrl,
        gateway: 'pix',
        idempotencyKey,
      });

      const balanceAfterSecond = financialLedger.getUserCredits(testUserId);

      const passed =
        balanceAfterFirst === pkg.credits &&
        balanceAfterSecond === pkg.credits &&
        secondRes.isReplay === true;

      results.push({
        testName: 'Idempotência em Compras de Crédito (Proteção contra Duplicação)',
        passed,
        message: passed
          ? `Aprovado: Saldo permaneceu ${balanceAfterSecond} créditos sem duplicação após replay.`
          : `Falha: Saldo após replay foi ${balanceAfterSecond}, esperado ${pkg.credits}.`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Idempotência em Compras de Crédito',
        passed: false,
        message: `Exceção inesperada: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 2: Bloqueio de Saldo Insuficiente (Atomicidade de Débito)
  {
    const start = performance.now();
    try {
      const poorUserId = `poor_user_${Date.now()}`;
      // Usuário com 0 créditos tentando desbloquear mídia de 100 créditos
      let threwExpectedError = false;
      try {
        await financialLedger.unlockPaidContent({
          userId: poorUserId,
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          contentId: 'media_test_01',
          contentTitle: 'Ensaio Teste',
          priceCredits: 100,
          idempotencyKey: `idemp_insufficient_${Date.now()}`,
        });
      } catch (err: any) {
        threwExpectedError = err.message.includes('Saldo insuficiente no livro-razão contábil');
      }

      results.push({
        testName: 'Prevenção de Saldo Negativo e Bloqueio de Fundos Insuficientes',
        passed: threwExpectedError,
        message: threwExpectedError
          ? 'Aprovado: O livro-razão rejeitou a transação antes do lançamento e manteve integridade.'
          : 'Falha: Não bloqueou transação sem fundos ou mensagem diferente do esperado.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Prevenção de Saldo Negativo',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 3: Segregação de Contas e Divisão 70/30 (Criador vs Plataforma)
  {
    const start = performance.now();
    try {
      const buyerId = `buyer_${Date.now()}`;
      const creatorId = `creator_test_${Date.now()}`;

      // Creditar 200 créditos ao comprador
      await financialLedger.purchaseCreditPackage({
        userId: buyerId,
        packageId: 'pkg_popular',
        packageName: 'Popular',
        creditsToGrant: 200,
        priceBrl: 30.0,
        gateway: 'stripe',
        idempotencyKey: `idemp_fund_buyer_${Date.now()}`,
      });

      // Desbloquear mídia de 100 créditos (Valor econômico: R$ 10,00 -> Criador: R$ 7,00 | JOBS: R$ 3,00)
      await financialLedger.unlockPaidContent({
        userId: buyerId,
        creatorId,
        creatorName: 'Criador Teste',
        contentId: 'content_vip_001',
        contentTitle: 'Mídia VIP Exclusiva',
        priceCredits: 100,
        idempotencyKey: `idemp_unlock_split_${Date.now()}`,
        creatorSharePct: 0.70,
      });

      const buyerBalance = financialLedger.getUserCredits(buyerId);
      const creatorBalance = financialLedger.getCreatorBalances(creatorId);

      const passed =
        buyerBalance === 100 &&
        creatorBalance.pendingBrl === 7.0 &&
        creatorBalance.totalEarnedBrl === 7.0;

      results.push({
        testName: 'Segregação de Contas e Divisão 70% Criador / 30% Plataforma',
        passed,
        message: passed
          ? `Aprovado: Comprador restou com ${buyerBalance} créditos; Criador recebeu R$ ${creatorBalance.pendingBrl.toFixed(2)} em conta separada.`
          : `Falha: Valores divergentes. Comprador=${buyerBalance}, Criador=${creatorBalance.pendingBrl}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Segregação de Contas e Divisão 70/30',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 4: Integridade da Cadeia de Hash
  {
    const start = performance.now();
    try {
      const integrity = financialLedger.verifyLedgerIntegrity();
      results.push({
        testName: 'Auditoria de Cadeia de Hashes Criptográficos do Livro-Razão',
        passed: integrity.isValid,
        message: integrity.isValid
          ? `Aprovado: ${integrity.checkedCount} lançamentos verificados sem qualquer quebra de integridade.`
          : `Falha de integridade: ${integrity.errors.join('; ')}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Auditoria de Cadeia de Hashes',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 5: Módulo Lives 1.0 - Divisão Exata 70/30 de Presentes Virtuais com Liquidação em Centavos
  {
    const start = performance.now();
    try {
      const liveCreatorId = `creator_live_${Date.now()}`;
      const liveSenderId = `sender_live_${Date.now()}`;
      const idempotencyKey = `idemp_live_gift_test_${Date.now()}`;

      // Recarrega usuário com 200 créditos
      await financialLedger.purchaseCreditPackage({
        userId: liveSenderId,
        packageId: 'pkg_popular_150',
        packageName: 'Pacote Teste',
        creditsToGrant: 200,
        priceBrl: 29.90,
        gateway: 'pix',
        idempotencyKey: `idemp_fund_sender_${Date.now()}`,
      });

      // Envia presente virtual de 100 créditos (R$ 10,00 econômicos)
      const giftRes = await financialLedger.postLiveGiftRevenueShare({
        liveId: 'live_test_session_01',
        senderUserId: liveSenderId,
        senderUserName: 'Fã Testador',
        creatorId: liveCreatorId,
        creatorName: 'Valentina Live',
        giftId: 'gift_super_car',
        giftName: 'Carro Esportivo',
        creditsCost: 100,
        priceBrlCents: 1000, // R$ 10,00
        idempotencyKey,
      });

      // Tenta reenviar com mesma chave para validar idempotência
      const replayRes = await financialLedger.postLiveGiftRevenueShare({
        liveId: 'live_test_session_01',
        senderUserId: liveSenderId,
        senderUserName: 'Fã Testador',
        creatorId: liveCreatorId,
        creatorName: 'Valentina Live',
        giftId: 'gift_super_car',
        giftName: 'Carro Esportivo',
        creditsCost: 100,
        priceBrlCents: 1000,
        idempotencyKey,
      });

      const creatorBal = financialLedger.getCreatorBalances(liveCreatorId);
      const passed =
        giftRes.creatorShareCents === 700 && // 70% de 1000 centavos = R$ 7,00
        giftRes.platformCommissionCents === 300 && // 30% de 1000 centavos = R$ 3,00
        giftRes.creatorShareCents + giftRes.platformCommissionCents === 1000 &&
        replayRes.isReplay === true &&
        creatorBal.totalEarnedBrl === 7.0;

      results.push({
        testName: 'Módulo Lives 1.0: Divisão 70/30 de Presentes Virtuais e Idempotência',
        passed,
        message: passed
          ? `Aprovado: Criador recebeu R$ 7,00 (700 centavos), Plataforma R$ 3,00 (300 centavos). Replay detectado sem duplicação.`
          : `Falha: Divisão divergente. Criador=${giftRes.creatorShareCents}c, Plataforma=${giftRes.platformCommissionCents}c, Replay=${replayRes.isReplay}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Módulo Lives 1.0: Divisão 70/30 de Presentes Virtuais',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 6: Módulo Lives 1.0 - Remuneração por Desempenho e Metas (Campanha)
  {
    const start = performance.now();
    try {
      const liveCreatorId = `creator_campaign_${Date.now()}`;
      const idempotencyKey = `idemp_campaign_test_${Date.now()}`;

      const rewardRes = await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_peak_100',
        campaignTitle: 'Audiência de Pico 100+',
        creatorId: liveCreatorId,
        creatorName: 'Criador Prodígio',
        rewardBrlCents: 2500, // R$ 25,00
        achievedMetric: 'Pico de 142 espectadores simultâneos alcançado',
        idempotencyKey,
      });

      const replayRes = await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_peak_100',
        campaignTitle: 'Audiência de Pico 100+',
        creatorId: liveCreatorId,
        creatorName: 'Criador Prodígio',
        rewardBrlCents: 2500,
        achievedMetric: 'Pico de 142 espectadores simultâneos alcançado',
        idempotencyKey,
      });

      const creatorBal = financialLedger.getCreatorBalances(liveCreatorId);
      const passed =
        rewardRes.rewardBrlCents === 2500 &&
        replayRes.isReplay === true &&
        creatorBal.availableBrl === 25.0;

      results.push({
        testName: 'Módulo Lives 1.0: Bonificação de Campanha de Desempenho e Metas',
        passed,
        message: passed
          ? `Aprovado: Bonificação de R$ 25,00 creditada no saldo disponível do criador com idempotência auditada.`
          : `Falha: Recompensa não validada. Saldo=${creatorBal.availableBrl}, Replay=${replayRes.isReplay}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Módulo Lives 1.0: Bonificação de Campanha de Desempenho e Metas',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 7: Estorno Compensatório (Refund) e Dedução de Passivo de Criador + Agregação queryLedger
  {
    const start = performance.now();
    try {
      const buyerId = `buyer_refund_${Date.now()}`;
      const creatorId = `creator_refund_${Date.now()}`;

      await financialLedger.purchaseCreditPackage({
        userId: buyerId,
        packageId: 'pkg_popular_150',
        packageName: 'Popular',
        creditsToGrant: 170,
        priceBrl: 29.90,
        gateway: 'pix',
        idempotencyKey: `idemp_fund_refund_${Date.now()}`,
      });

      const unlockRes = await financialLedger.unlockPaidContent({
        userId: buyerId,
        creatorId,
        creatorName: 'Criador Estorno Teste',
        contentId: 'photo_refund_test_01',
        contentTitle: 'Foto Exclusiva 49 Diamantes',
        priceCredits: 49,
        idempotencyKey: `idemp_unlock_refund_${Date.now()}`,
        creatorSharePct: 0.70,
      });

      const creatorBeforeRefund = financialLedger.getCreatorBalances(creatorId);
      const creatorShareEntry = unlockRes.entries.find(
        (e) => e.operationType === 'CREATOR_REVENUE_SHARE'
      );

      if (!creatorShareEntry) {
        throw new Error('Lançamento CREATOR_REVENUE_SHARE não encontrado.');
      }

      // Executa estorno do lançamento de repasse do criador
      await financialLedger.processRefund({
        originalEntryId: creatorShareEntry.id,
        reason: 'Estorno de auditoria de teste',
        adminId: 'admin_auditor',
        idempotencyKey: `idemp_refund_creator_share_${Date.now()}`,
      });

      const creatorAfterRefund = financialLedger.getCreatorBalances(creatorId);
      const ledgerQuery = financialLedger.queryLedger({ actorId: buyerId });

      const passed =
        creatorBeforeRefund.pendingBrl === 3.43 &&
        creatorAfterRefund.pendingBrl === 0 &&
        creatorAfterRefund.totalEarnedBrl === 0 &&
        creatorAfterRefund.unlockedContentsCount === 0 &&
        ledgerQuery.stats.totalCreditsCredited >= 170 &&
        ledgerQuery.stats.totalCreditsDebited >= 49;

      results.push({
        testName: 'Dedução de Passivo de Criador em Estorno (processRefund) e Agregação queryLedger',
        passed,
        message: passed
          ? `Aprovado: Passivo pendente do criador zerado após estorno (R$ ${creatorBeforeRefund.pendingBrl.toFixed(2)} -> R$ ${creatorAfterRefund.pendingBrl.toFixed(2)}) e queryLedger.stats agregou ${ledgerQuery.stats.totalCreditsCredited} creditados / ${ledgerQuery.stats.totalCreditsDebited} debitados.`
          : `Falha: Antes=${creatorBeforeRefund.pendingBrl}, Depois=${creatorAfterRefund.pendingBrl}, TotalEarned=${creatorAfterRefund.totalEarnedBrl}, Debited=${ledgerQuery.stats.totalCreditsDebited}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Dedução de Passivo de Criador em Estorno (processRefund)',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 8: Minha Carteira - Segregação Colaboradores vs Produtores de Conteúdo e Créditos Virtuais
  {
    const start = performance.now();
    try {
      const walletUserId = `wallet_user_${Date.now()}`;

      // 1. Conceder 100 créditos de consumo (não sacáveis)
      await financialLedger.purchaseCreditPackage({
        userId: walletUserId,
        packageId: 'pkg_inicial',
        packageName: 'Inicial',
        creditsToGrant: 100,
        priceBrl: 19.9,
        gateway: 'pix',
        idempotencyKey: `idemp_wallet_credits_${Date.now()}`,
      });

      // 2. Registrar ganho de Colaborador (R$ 45,00 disponível + R$ 15,00 pendente)
      await financialLedger.recordCollaboratorEarningAtomic({
        userId: walletUserId,
        amountCents: 4500,
        subType: 'referral',
        title: 'Indicação Verificada Nível 1',
        referenceId: 'ref_001',
        idempotencyKey: `idemp_wallet_collab_avail_${Date.now()}`,
      });

      await financialLedger.recordCollaboratorEarningAtomic({
        userId: walletUserId,
        amountCents: 1500,
        subType: 'challenge_goal',
        title: 'Meta Desafio em Análise',
        referenceId: 'goal_002',
        idempotencyKey: `idemp_wallet_collab_pend_${Date.now()}`,
        isPendingReview: true,
      });

      // 3. Registrar ganho de Produtor de Conteúdo (R$ 75,00 disponível)
      await financialLedger.recordContentProducerEarningAtomic({
        userId: walletUserId,
        amountCents: 7500,
        subType: 'vip_vault',
        title: 'Desbloqueio Cofre VIP (70%)',
        referenceId: 'vault_001',
        idempotencyKey: `idemp_wallet_prod_avail_${Date.now()}`,
      });

      const summary = financialLedger.getUnifiedWalletSummary(walletUserId);
      const collabStatement = financialLedger.getUnifiedWalletStatement(walletUserId, 'collaborator');
      const prodStatement = financialLedger.getUnifiedWalletStatement(walletUserId, 'content_producer');

      const passed =
        summary.collaboratorReceivedCents === 4500 &&
        summary.collaboratorPendingCents === 1500 &&
        summary.contentProducerReceivedCents === 7500 &&
        summary.availableBalanceCents === 12000 && // R$ 45,00 + R$ 75,00 = R$ 120,00 (Créditos de consumo não entram no saldo BRL!)
        summary.pendingReviewCents === 1500 &&
        summary.userConsumptionCredits === 100 &&
        collabStatement.length === 2 &&
        prodStatement.length === 1;

      results.push({
        testName: 'Minha Carteira: Segregação Colaboradores vs Produtores de Conteúdo e Isolamento de Créditos',
        passed,
        message: passed
          ? `Aprovado: Colaboradores=R$ ${summary.collaboratorReceivedBrl.toFixed(2)}, Produtores=R$ ${summary.contentProducerReceivedBrl.toFixed(2)}, Disponível=R$ ${summary.availableBalanceBrl.toFixed(2)}, Pendente=R$ ${summary.pendingReviewBrl.toFixed(2)}, Créditos Separados=${summary.userConsumptionCredits} 💎.`
          : `Falha: Resumo divergente: ${JSON.stringify(summary)}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Minha Carteira: Segregação Colaboradores vs Produtores de Conteúdo',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // TESTE 9: Minha Carteira - Solicitação de Saque Atômica, Mínimo R$ 50,00, Tarifa Zero e Idempotência Concorrente
  {
    const start = performance.now();
    try {
      const withdrawUserId = `withdraw_user_${Date.now()}`;

      // Creditar R$ 90,00 disponíveis (R$ 40 Colaborador + R$ 50 Produtor)
      await financialLedger.recordCollaboratorEarningAtomic({
        userId: withdrawUserId,
        amountCents: 4000,
        subType: 'challenge_goal',
        title: 'Meta Desafio Semanal',
        referenceId: 'goal_w_1',
        idempotencyKey: `idemp_w_collab_${Date.now()}`,
      });
      await financialLedger.recordContentProducerEarningAtomic({
        userId: withdrawUserId,
        amountCents: 5000,
        subType: 'media_unlock',
        title: 'Foto Protegida Desbloqueada',
        referenceId: 'media_w_1',
        idempotencyKey: `idemp_w_prod_${Date.now()}`,
      });

      // 1. Deve rejeitar saque abaixo do mínimo de R$ 50,00 (ex: R$ 49,99 = 4999 centavos)
      let rejectedBelowMinimum = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: withdrawUserId,
          userName: 'Criador Teste Saque',
          amountCents: 4999,
          pixKeyType: 'CPF',
          pixKey: '123.456.789-01',
          holderConfirmed: true,
          idempotencyKey: `idemp_w_min_fail_${Date.now()}`,
        });
      } catch (err: any) {
        rejectedBelowMinimum = err.message.includes('mínimo permitido para saque');
      }

      // 2. Deve rejeitar saque acima do saldo disponível (ex: R$ 95,00 > R$ 90,00)
      let rejectedAboveBalance = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: withdrawUserId,
          userName: 'Criador Teste Saque',
          amountCents: 9500,
          pixKeyType: 'CPF',
          pixKey: '123.456.789-01',
          holderConfirmed: true,
          idempotencyKey: `idemp_w_bal_fail_${Date.now()}`,
        });
      } catch (err: any) {
        rejectedAboveBalance = err.message.includes('Saldo disponível insuficiente');
      }

      // 3. Solicitação concorrente válida de R$ 60,00 (6000 centavos) com mesma chave de idempotência
      const validWithdrawKey = `idemp_w_valid_concurrent_${Date.now()}`;
      const [req1, req2] = await Promise.all([
        financialLedger.requestUnifiedWalletPayout({
          userId: withdrawUserId,
          userName: 'Criador Teste Saque',
          amountCents: 6000,
          pixKeyType: 'CPF',
          pixKey: '123.456.789-01',
          holderConfirmed: true,
          idempotencyKey: validWithdrawKey,
        }),
        financialLedger.requestUnifiedWalletPayout({
          userId: withdrawUserId,
          userName: 'Criador Teste Saque',
          amountCents: 6000,
          pixKeyType: 'CPF',
          pixKey: '123.456.789-01',
          holderConfirmed: true,
          idempotencyKey: validWithdrawKey,
        }),
      ]);

      const afterSummary = financialLedger.getUnifiedWalletSummary(withdrawUserId);
      const exactlyOneReplay = (req1.isReplay && !req2.isReplay) || (!req1.isReplay && req2.isReplay);

      const passed =
        rejectedBelowMinimum &&
        rejectedAboveBalance &&
        exactlyOneReplay &&
        req1.payout.id === req2.payout.id &&
        req1.payout.status === 'under_review' && // Não marca como concluído antes do serviço de pagamento
        req1.payout.feeBrl === 0 &&
        req1.payout.netAmountBrl === 60.0 &&
        afterSummary.availableBalanceCents === 3000 && // R$ 90,00 - R$ 60,00 = R$ 30,00 restantes
        afterSummary.payoutReservedCents === 6000; // R$ 60,00 reservados em Escrow

      results.push({
        testName: 'Minha Carteira: Saque Atômico (Mínimo R$ 50,00, Reserva Escrow, Status under_review e Concorrência)',
        passed,
        message: passed
          ? `Aprovado: Rejeitou < R$ 50,00 e > saldo; reservou R$ 60,00 em Escrow (status '${req1.payout.status}', tarifa R$ 0,00), restando R$ 30,00 disponíveis sem duplicar em chamadas concorrentes.`
          : `Falha: min=${rejectedBelowMinimum}, bal=${rejectedAboveBalance}, replay=${exactlyOneReplay}, avail=${afterSummary.availableBalanceCents}, reserved=${afterSummary.payoutReservedCents}`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testName: 'Minha Carteira: Saque Atômico e Concorrência',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}

// Execução direta em CLI / Test Runner somente quando invocado diretamente via processo Node
const isDirectCliExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes('ledgerService.test'));

if (isDirectCliExecution) {
  runLedgerVerificationSuite().then(({ allPassed, results }) => {
    console.log(`\n======================================================`);
    console.log(`SUÍTE DE VERIFICAÇÃO CONTÁBIL E LIVES 1.0 - JOBS`);
    console.log(`======================================================`);
    results.forEach((r, idx) => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} [${idx + 1}/${results.length}] ${r.testName} (${r.durationMs}ms)`);
      console.log(`   ${r.message}`);
    });
    console.log(`======================================================`);
    console.log(`RESULTADO FINAL: ${allPassed ? 'TODOS OS TESTES APROVADOS! 🚀' : 'FALHA EM TESTES'}\n`);
  });
}
