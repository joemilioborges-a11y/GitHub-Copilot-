/**
 * SUÍTE DE AUDITORIA AUTOMATIZADA: MINHA CARTEIRA (Screen08HomeDashboard + ledgerService)
 *
 * Valida os 10 requisitos obrigatórios de integridade financeira, extrato, saque e segurança:
 * 1. Exibição do saldo correto para o usuário autenticado.
 * 2. Separação entre saldo disponível, saldo pendente (Retenção D+14 + Escrow) e créditos 💎.
 * 3. Atualização imediata do resumo e da Última Movimentação após movimentação válida.
 * 4. Extrato com valores, datas, referências e estados coerentes (entradas, saídas, estornos, ajustes e saques).
 * 5. Bloqueio de saque sem saldo elegível (< R$ 50,00 ou acima do disponível).
 * 6. Proteção contra solicitações duplicadas (idempotência e concorrência).
 * 7. Tratamento de falhas (PIX inválido / titularidade) e manutenção de saque em status pendente (under_review).
 * 8. Isolamento entre dados reais (production) e simulados (sandbox).
 * 9. Bloqueio e auditoria de acesso indevido aos dados financeiros de outros usuários.
 * 10. Preservação do histórico imutável diante de estornos e ajustes contábeis.
 */

import { financialLedger } from '../ledgerService';
import { runtimeEnvironmentService } from '../runtimeEnvironmentService';

export interface HomeWalletAuditCaseResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runHomeWalletAuditTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: HomeWalletAuditCaseResult[];
}> {
  const results: HomeWalletAuditCaseResult[] = [];
  const initialMode = runtimeEnvironmentService.getMode();
  const adminActor = {
    userId: 'admin_master',
    role: 'admin' as const,
    reason: 'Auditoria automatizada Minha Carteira',
  };

  // Garantir ambiente simulation controlado no início da bateria
  await runtimeEnvironmentService.setMode('simulation', adminActor);

  // =========================================================================
  // TESTE 1: Exibição do saldo correto para o usuário autenticado
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_auth_${Date.now()}`;
      await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 6500, // R$ 65,00
        subType: 'media_unlock',
        title: 'Foto Exclusiva HD Desbloqueada',
        referenceId: `ref_t1_${Date.now()}`,
        idempotencyKey: `idemp_t1_${Date.now()}`,
      });

      const summary = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });

      const passed =
        summary.userId === uid &&
        summary.availableBalanceCents === 6500 &&
        summary.availableBalanceBrl === 65.0 &&
        summary.totalReceivedPeriodCents === 6500 &&
        summary.lastTransaction !== null &&
        summary.lastTransaction.amountCents === 6500;

      results.push({
        testNumber: 1,
        name: 'Exibição do saldo correto para o usuário autenticado',
        passed,
        message: passed
          ? `Aprovado: Saldo disponível R$ ${summary.availableBalanceBrl.toFixed(2)}, Total recebido R$ ${summary.totalReceivedPeriodBrl.toFixed(2)} e última transação reconciliados.`
          : `Falha: Resumo divergente (${JSON.stringify(summary)}).`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 1,
        name: 'Exibição do saldo correto para o usuário autenticado',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 2: Separação entre saldo disponível, saldo pendente e créditos 💎
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_seg_${Date.now()}`;

      // 1. Ganho disponível: R$ 80,00
      await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 8000,
        subType: 'vip_vault',
        title: 'Assinatura Cofre VIP',
        referenceId: `ref_seg_avail_${Date.now()}`,
        idempotencyKey: `idemp_seg_avail_${Date.now()}`,
        isPendingReview: false,
      });

      // 2. Ganho pendente (Retenção D+14): R$ 35,00
      await financialLedger.recordCollaboratorEarningAtomic({
        userId: uid,
        amountCents: 3500,
        subType: 'referral',
        title: 'Indicação em período de validação antifraude',
        referenceId: `ref_seg_pend_${Date.now()}`,
        idempotencyKey: `idemp_seg_pend_${Date.now()}`,
        isPendingReview: true,
      });

      // 3. Compra de 50 créditos de consumo (💎) -> NÃO pode somar ao saldo BRL
      await financialLedger.purchaseCreditPackage({
        userId: uid,
        packageId: 'pkg_inicial',
        packageName: 'Inicial',
        creditsToGrant: 50,
        priceBrl: 9.9,
        gateway: 'pix',
        idempotencyKey: `idemp_seg_cred_${Date.now()}`,
      });

      const summary = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });

      const passed =
        summary.availableBalanceCents === 8000 &&
        summary.pendingReviewCents === 3500 &&
        summary.totalPendingCents === 3500 &&
        summary.userConsumptionCredits === 50 &&
        summary.totalReceivedPeriodCents === 8000;

      results.push({
        testNumber: 2,
        name: 'Separação entre saldo disponível, saldo pendente e créditos virtuais',
        passed,
        message: passed
          ? `Aprovado: Disponível=R$ ${summary.availableBalanceBrl.toFixed(2)}, Pendente=R$ ${summary.totalPendingBrl.toFixed(2)} e Créditos=${summary.userConsumptionCredits} 💎 estritamente segregados.`
          : 'Falha: Mistura indevida entre saldos disponíveis, pendentes ou créditos.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 2,
        name: 'Separação entre saldo disponível, saldo pendente e créditos virtuais',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 3: Atualização após uma movimentação válida e notificação reativa
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_reactive_${Date.now()}`;
      let notificationsCount = 0;
      const unsub = financialLedger.subscribe(() => {
        notificationsCount += 1;
      });

      const before = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });
      await financialLedger.recordCollaboratorEarningAtomic({
        userId: uid,
        amountCents: 2500, // R$ 25,00
        subType: 'challenge_goal',
        title: 'Recompensa Colaborador Auditada',
        referenceId: `ref_react_${Date.now()}`,
        idempotencyKey: `idemp_react_${Date.now()}`,
      });
      unsub();

      const after = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });

      const passed =
        before.availableBalanceCents === 0 &&
        after.availableBalanceCents === 2500 &&
        notificationsCount >= 1 &&
        after.lastTransaction?.description.includes('Recompensa Colaborador Auditada') === true;

      results.push({
        testNumber: 3,
        name: 'Atualização imediata após uma movimentação válida',
        passed,
        message: passed
          ? `Aprovado: Saldo atualizado de R$ 0,00 para R$ ${after.availableBalanceBrl.toFixed(2)} com ${notificationsCount} evento(s) reativo(s).`
          : 'Falha: Saldo ou última movimentação não atualizou após o lançamento.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 3,
        name: 'Atualização imediata após uma movimentação válida',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 4: Extrato com valores, datas, referências e estados coerentes
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_stmt_${Date.now()}`;

      await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 10000, // R$ 100,00
        subType: 'live_gift',
        title: 'Presente Super Coroa em Live',
        referenceId: 'ref_live_gift_01',
        idempotencyKey: `idemp_stmt_1_${Date.now()}`,
      });

      await financialLedger.requestUnifiedWalletPayout({
        userId: uid,
        actorUserId: uid,
        userName: 'Criador Extrato',
        amountCents: 5000, // R$ 50,00
        pixKeyType: 'CPF',
        pixKey: '123.456.789-01',
        holderConfirmed: true,
        idempotencyKey: `idemp_stmt_payout_${Date.now()}`,
      });

      const allItems = financialLedger.getUnifiedWalletStatement(uid, 'all', { actorUserId: uid });
      const payoutItems = financialLedger.getUnifiedWalletStatement(uid, 'payout', {
        actorUserId: uid,
      });

      const hasCreditItem = allItems.some(
        (i) =>
          i.direction === 'credit' &&
          i.amountCents === 10000 &&
          i.referenceId === 'ref_live_gift_01' &&
          i.currency === 'BRL' &&
          i.status === 'available'
      );
      const hasPayoutReserveItem =
        payoutItems.length === 1 &&
        payoutItems[0].direction === 'debit' &&
        payoutItems[0].amountCents === 5000 &&
        payoutItems[0].status === 'payout_reserved';

      const passed = allItems.length === 2 && hasCreditItem && hasPayoutReserveItem;

      results.push({
        testNumber: 4,
        name: 'Extrato com valores, datas, referências e estados coerentes',
        passed,
        message: passed
          ? 'Aprovado: Extrato diferenciou entrada confirmada (+R$ 100,00) e solicitação de saque em reserva (-R$ 50,00) com referências íntegras.'
          : 'Falha: Inconsistência nos itens ou filtros do extrato financeiro.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 4,
        name: 'Extrato com valores, datas, referências e estados coerentes',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 5: Bloqueio de saque sem saldo elegível (< R$ 50,00 ou insuficiente)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_lowbal_${Date.now()}`;
      // Saldo de apenas R$ 30,00 (abaixo do mínimo de R$ 50,00)
      await financialLedger.recordCollaboratorEarningAtomic({
        userId: uid,
        amountCents: 3000,
        subType: 'referral',
        title: 'Indicação Inicial',
        referenceId: 'ref_low_01',
        idempotencyKey: `idemp_low_${Date.now()}`,
      });

      let blockedBelowMinimum = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Usuário Saldo Baixo',
          amountCents: 3000,
          pixKeyType: 'CPF',
          pixKey: '12345678901',
          holderConfirmed: true,
          idempotencyKey: `idemp_try_30_${Date.now()}`,
        });
      } catch (err: any) {
        blockedBelowMinimum = err.message.includes('abaixo do mínimo permitido');
      }

      let blockedInsufficient = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Usuário Saldo Baixo',
          amountCents: 6000, // >= 50,00 mas maior que os 30,00 disponíveis
          pixKeyType: 'CPF',
          pixKey: '12345678901',
          holderConfirmed: true,
          idempotencyKey: `idemp_try_60_${Date.now()}`,
        });
      } catch (err: any) {
        blockedInsufficient = err.message.includes('Saldo disponível insuficiente');
      }

      const summaryAfter = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });
      const passed =
        blockedBelowMinimum &&
        blockedInsufficient &&
        summaryAfter.availableBalanceCents === 3000 &&
        summaryAfter.payoutReservedCents === 0;

      results.push({
        testNumber: 5,
        name: 'Bloqueio de saque sem saldo elegível (< R$ 50,00 ou saldo insuficiente)',
        passed,
        message: passed
          ? 'Aprovado: Saques abaixo de R$ 50,00 e acima do saldo disponível foram bloqueados sem alterar o saldo.'
          : 'Falha: Validação de valor mínimo ou saldo disponível falhou.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 5,
        name: 'Bloqueio de saque sem saldo elegível',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 6: Proteção contra solicitações duplicadas (Idempotência e Concorrência)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_idemp_${Date.now()}`;
      await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 12000, // R$ 120,00
        subType: 'media_unlock',
        title: 'Desbloqueio Álbum Premium',
        referenceId: 'ref_idemp_album',
        idempotencyKey: `idemp_seed_120_${Date.now()}`,
      });

      const sharedWithdrawKey = `idemp_withdraw_dup_${Date.now()}`;
      const [req1, req2] = await Promise.all([
        financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Criador Idempotente',
          amountCents: 7000, // R$ 70,00
          pixKeyType: 'EMAIL',
          pixKey: 'criador@jobs.app',
          holderConfirmed: true,
          idempotencyKey: sharedWithdrawKey,
        }),
        financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Criador Idempotente',
          amountCents: 7000,
          pixKeyType: 'EMAIL',
          pixKey: 'criador@jobs.app',
          holderConfirmed: true,
          idempotencyKey: sharedWithdrawKey,
        }),
      ]);

      const summary = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });
      const oneReplay = (req1.isReplay && !req2.isReplay) || (!req1.isReplay && req2.isReplay);
      const passed =
        oneReplay &&
        req1.payout.id === req2.payout.id &&
        summary.availableBalanceCents === 5000 && // 12000 - 7000 = 5000 (debitado uma única vez)
        summary.payoutReservedCents === 7000;

      results.push({
        testNumber: 6,
        name: 'Proteção contra solicitações duplicadas e concorrência no saque',
        passed,
        message: passed
          ? `Aprovado: Duas chamadas concorrentes geraram um único saque #${req1.payout.id} e preservaram saldo disponível em R$ 50,00.`
          : 'Falha: Duplicidade de saque não foi contida pela chave de idempotência.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 6,
        name: 'Proteção contra solicitações duplicadas e concorrência no saque',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 7: Tratamento de falhas e manutenção de status pendente (under_review)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_validation_${Date.now()}`;
      await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 9000, // R$ 90,00
        subType: 'vip_vault',
        title: 'Cofre VIP Mensal',
        referenceId: 'ref_val_90',
        idempotencyKey: `idemp_val_90_${Date.now()}`,
      });

      // 1. Chave PIX inválida deve falhar
      let rejectedInvalidPix = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Criador Validação',
          amountCents: 5000,
          pixKeyType: 'CPF',
          pixKey: '111.111.111-11', // CPF inválido (dígitos repetidos)
          holderConfirmed: true,
          idempotencyKey: `idemp_bad_pix_${Date.now()}`,
        });
      } catch (err: any) {
        rejectedInvalidPix = err.message.includes('CPF inválido');
      }

      // 2. Titularidade não confirmada deve falhar
      let rejectedUnconfirmedHolder = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: uid,
          actorUserId: uid,
          userName: 'Criador Validação',
          amountCents: 5000,
          pixKeyType: 'CPF',
          pixKey: '123.456.789-09',
          holderConfirmed: false,
          idempotencyKey: `idemp_no_holder_${Date.now()}`,
        });
      } catch (err: any) {
        rejectedUnconfirmedHolder = err.message.includes('mesma titularidade');
      }

      // 3. Solicitação válida deve ficar em 'under_review' (pendente), nunca 'released' automaticamente
      const validReq = await financialLedger.requestUnifiedWalletPayout({
        userId: uid,
        actorUserId: uid,
        userName: 'Criador Validação',
        amountCents: 5000,
        pixKeyType: 'CPF',
        pixKey: '123.456.789-09',
        holderConfirmed: true,
        idempotencyKey: `idemp_ok_req_${Date.now()}`,
      });

      const passed =
        rejectedInvalidPix &&
        rejectedUnconfirmedHolder &&
        validReq.payout.status === 'under_review' &&
        validReq.updatedSummary.payoutReservedCents === 5000 &&
        validReq.updatedSummary.withdrawnSettledCents === 0;

      results.push({
        testNumber: 7,
        name: 'Tratamento de falhas de validação e solicitação mantida como pendente (under_review)',
        passed,
        message: passed
          ? 'Aprovado: PIX inválido e titularidade ausente foram rejeitados; solicitação válida permaneceu em under_review sem simular transferência concluída.'
          : 'Falha: Validação de PIX/titularidade ou status da solicitação incorreto.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 7,
        name: 'Tratamento de falhas de validação e transações pendentes',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 8: Isolamento rigoroso entre dados reais (production) e simulados (sandbox)
  // =========================================================================
  {
    const start = performance.now();
    try {
      // Em simulação, 'current_user' recebe os seeds demonstrativos
      await runtimeEnvironmentService.setMode('simulation', adminActor);
      const simSummary = financialLedger.getUnifiedWalletSummary('current_user', {
        actorUserId: 'current_user',
      });

      // Ao alternar para produção, nenhum seed sintético deve vazar
      await runtimeEnvironmentService.setMode('production', adminActor);
      const prodUser = `prod_clean_user_${Date.now()}`;
      const prodSummary = financialLedger.getUnifiedWalletSummary(prodUser, {
        actorUserId: prodUser,
      });

      const passed =
        simSummary.isSimulation === true &&
        simSummary.availableBalanceCents > 0 &&
        prodSummary.isSimulation === false &&
        prodSummary.environment === 'production' &&
        prodSummary.availableBalanceCents === 0 &&
        prodSummary.totalPendingCents === 0 &&
        prodSummary.lastTransaction === null;

      results.push({
        testNumber: 8,
        name: 'Isolamento entre dados reais (Produção) e simulados (Sandbox)',
        passed,
        message: passed
          ? 'Aprovado: Modo Produção iniciou com R$ 0,00 e sem seeds sintéticos do modo Sandbox.'
          : 'Falha: Vazamento de dados entre os ambientes Sandbox e Produção.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 8,
        name: 'Isolamento entre dados reais e simulados',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    } finally {
      await runtimeEnvironmentService.setMode('simulation', adminActor);
    }
  }

  // =========================================================================
  // TESTE 9: Bloqueio de acesso indevido aos dados de outros usuários
  // =========================================================================
  {
    const start = performance.now();
    try {
      const victimUserId = `victim_user_${Date.now()}`;
      const attackerUserId = `attacker_user_${Date.now()}`;

      await financialLedger.recordContentProducerEarningAtomic({
        userId: victimUserId,
        amountCents: 15000,
        subType: 'media_unlock',
        title: 'Receita Privada do Titular',
        referenceId: 'ref_priv_01',
        idempotencyKey: `idemp_priv_${Date.now()}`,
      });

      let blockedSummaryRead = false;
      try {
        financialLedger.getUnifiedWalletSummary(victimUserId, {
          actorUserId: attackerUserId,
        });
      } catch (err: any) {
        blockedSummaryRead = err.message.includes('Acesso negado');
      }

      let blockedStatementRead = false;
      try {
        financialLedger.getUnifiedWalletStatement(victimUserId, 'all', {
          actorUserId: attackerUserId,
        });
      } catch (err: any) {
        blockedStatementRead = err.message.includes('Acesso negado');
      }

      let blockedCrossUserPayout = false;
      try {
        await financialLedger.requestUnifiedWalletPayout({
          userId: victimUserId,
          actorUserId: attackerUserId,
          userName: 'Invasor',
          amountCents: 5000,
          pixKeyType: 'CPF',
          pixKey: '12345678909',
          holderConfirmed: true,
          idempotencyKey: `idemp_attack_${Date.now()}`,
        });
      } catch (err: any) {
        blockedCrossUserPayout = err.message.includes('Acesso negado');
      }

      // Verificar que a tentativa foi registrada no log de auditoria
      const auditLogs = financialLedger.getAuditLogs();
      const loggedUnauthorizedAttempt = auditLogs.some(
        (log) => log.action === 'UNAUTHORIZED_WALLET_ACCESS_BLOCKED'
      );

      const passed =
        blockedSummaryRead &&
        blockedStatementRead &&
        blockedCrossUserPayout &&
        loggedUnauthorizedAttempt;

      results.push({
        testNumber: 9,
        name: 'Bloqueio e auditoria de acesso indevido aos dados financeiros de outros usuários',
        passed,
        message: passed
          ? 'Aprovado: Consultas de saldo, extrato e tentativas de saque por outro usuário foram bloqueadas e auditadas.'
          : 'Falha: Controle de autorização permitiu leitura ou saque cruzado entre contas.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 9,
        name: 'Bloqueio de acesso indevido aos dados de outros usuários',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 10: Preservação do histórico imutável diante de estornos e ajustes
  // =========================================================================
  {
    const start = performance.now();
    try {
      const uid = `user_wallet_immutable_${Date.now()}`;
      const earningRes = await financialLedger.recordContentProducerEarningAtomic({
        userId: uid,
        amountCents: 6000, // R$ 60,00
        subType: 'media_unlock',
        title: 'Conteúdo Original Antes de Estorno',
        referenceId: 'ref_imm_60',
        idempotencyKey: `idemp_imm_60_${Date.now()}`,
      });

      // Executar estorno compensatório oficial
      await financialLedger.processRefund({
        originalEntryId: earningRes.entry.id,
        reason: 'Estorno auditado de teste',
        adminId: 'admin_auditor',
        idempotencyKey: `idemp_refund_imm_${Date.now()}`,
      });

      const summary = financialLedger.getUnifiedWalletSummary(uid, { actorUserId: uid });
      const statement = financialLedger.getUnifiedWalletStatement(uid, 'all', {
        actorUserId: uid,
      });
      const refundItems = financialLedger.getUnifiedWalletStatement(uid, 'refund', {
        actorUserId: uid,
      });

      const passed =
        summary.availableBalanceCents === 0 &&
        statement.length === 2 && // Entrada original preservada + lançamento compensatório de estorno
        refundItems.length >= 1;

      results.push({
        testNumber: 10,
        name: 'Preservação de histórico imutável no extrato após estorno compensatório',
        passed,
        message: passed
          ? 'Aprovado: Registro original mantido no extrato e lançamento compensatório zerou o saldo disponível de forma rastreável.'
          : 'Falha: Histórico original foi removido ou saldo não refletiu o estorno.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 10,
        name: 'Preservação de histórico imutável no extrato após estorno',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // Restaurar modo de ambiente original
  await runtimeEnvironmentService.setMode(initialMode, adminActor);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

const isDirectCliExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes('homeWalletSectionAudit.test'));

if (isDirectCliExecution) {
  const suite = await runHomeWalletAuditTestSuite();
  console.log('========================================================================');
  console.log('SUÍTE DE AUDITORIA: MINHA CARTEIRA (Screen08HomeDashboard + ledgerService)');
  console.log('========================================================================');
  suite.results.forEach((r) => {
    const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${r.testNumber}: ${r.name} (${r.durationMs}ms)`);
    console.log(`   ${r.message}`);
  });
  console.log('========================================================================');
  console.log(
    `RESULTADO: ${suite.passed}/${suite.total} testes aprovados (${
      suite.failed === 0 ? '100% SUCESSO' : 'FALHA'
    })`
  );
  console.log('========================================================================\n');
  if (suite.failed > 0) {
    process.exit(1);
  }
}
