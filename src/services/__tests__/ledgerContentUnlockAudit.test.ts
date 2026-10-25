/**
 * JOBS-LEDGER-AUDIT-002: Suíte de Verificação Técnica de Desbloqueio de Conteúdo,
 * Idempotência, Atomicidade e Reconciliação Contábil.
 * 
 * Implementa rigorosamente os 10 cenários obrigatórios definidos na Seção 5 da auditoria:
 * 1. Mesma chave de idempotência enviada 2 vezes para o mesmo desbloqueio.
 * 2. Duas requisições simultâneas/concorrentes com a mesma chave.
 * 3. Mesma chave reutilizada com dados divergentes (conflito de parâmetros).
 * 4. Tentativa de desbloqueio com saldo insuficiente de créditos.
 * 5. Simulação de falha durante a transação (bundle com valor <= 0 ou corrompido).
 * 6. Falha entre o débito e concessão (garantia all-or-nothing do lote atômico).
 * 7. Reembolso/estorno de um desbloqueio anterior (compensatory entry + restituição de créditos).
 * 8. Tentativa repetida de estorno da mesma operação já estornada.
 * 9. Reconciliação do saldo reconstruído a partir do histórico do ledger.
 * 10. Duas operações concorrentes disputando o mesmo saldo limítrofe (prevenção de cheque especial/overdraft).
 */

import { financialLedger, LedgerEntry } from '../ledgerService';

export interface AuditScenarioResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ContentUnlockAuditSummary {
  total: number;
  passed: number;
  failed: number;
  executionDurationMs: number;
  results: AuditScenarioResult[];
}

export async function runContentUnlockAuditTestSuite(): Promise<ContentUnlockAuditSummary> {
  const startTime = Date.now();
  const results: AuditScenarioResult[] = [];

  // Helper para creditar fundos de teste via método auditado de sandbox
  async function seedUserCredits(userId: string, amount: number, seedKey: string) {
    await financialLedger.purchaseCreditPackage({
      userId,
      packageId: 'pkg_test_seed',
      packageName: 'Seed de Teste',
      creditsToGrant: amount,
      priceBrl: Number((amount * 0.10).toFixed(2)),
      gateway: 'pix',
      idempotencyKey: seedKey,
    });
  }

  // =========================================================================
  // CENÁRIO 1: Mesma chave de idempotência enviada 2 vezes para o mesmo desbloqueio
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc1_usr_${Date.now()}`;
    const creatorId = 'creator_sc1_ana';
    const idempKey = `idemp_sc1_${Date.now()}`;
    await seedUserCredits(userId, 50, `seed_${idempKey}`);

    const res1 = await financialLedger.unlockPaidContent({
      userId,
      creatorId,
      creatorName: 'Ana Clara',
      contentId: 'media_photo_vip_01',
      contentTitle: 'Ensaio VIP 01',
      priceCredits: 20,
      idempotencyKey: idempKey,
    });

    const balAfterFirst = financialLedger.getUserCredits(userId);

    const res2 = await financialLedger.unlockPaidContent({
      userId,
      creatorId,
      creatorName: 'Ana Clara',
      contentId: 'media_photo_vip_01',
      contentTitle: 'Ensaio VIP 01',
      priceCredits: 20,
      idempotencyKey: idempKey,
    });

    const balAfterSecond = financialLedger.getUserCredits(userId);

    const passed =
      res1.success === true &&
      res1.isReplay === false &&
      res2.success === true &&
      res2.isReplay === true &&
      balAfterFirst === 30 &&
      balAfterSecond === 30 &&
      res2.entries.length === res1.entries.length;

    results.push({
      scenarioNumber: 1,
      name: 'Mesma chave de idempotência enviada 2 vezes para o mesmo desbloqueio',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Tentativa 1: isReplay=false, Saldo=30. Tentativa 2: isReplay=true, Saldo=${balAfterSecond}. Nenhum débito adicional executado.`,
      error: passed ? undefined : `Divergência: balAfterFirst=${balAfterFirst}, balAfterSecond=${balAfterSecond}, isReplay=${res2.isReplay}`,
    });
  }

  // =========================================================================
  // CENÁRIO 2: Duas requisições simultâneas/concorrentes com a mesma chave
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc2_usr_${Date.now()}`;
    const creatorId = 'creator_sc2_beatriz';
    const idempKey = `idemp_sc2_concurrent_${Date.now()}`;
    await seedUserCredits(userId, 100, `seed_${idempKey}`);

    const p1 = financialLedger.unlockPaidContent({
      userId,
      creatorId,
      creatorName: 'Beatriz',
      contentId: 'media_video_exclusive',
      contentTitle: 'Backstage Exclusivo',
      priceCredits: 40,
      idempotencyKey: idempKey,
    });

    const p2 = financialLedger.unlockPaidContent({
      userId,
      creatorId,
      creatorName: 'Beatriz',
      contentId: 'media_video_exclusive',
      contentTitle: 'Backstage Exclusivo',
      priceCredits: 40,
      idempotencyKey: idempKey,
    });

    const [out1, out2] = await Promise.all([p1, p2]);
    const finalBalance = financialLedger.getUserCredits(userId);

    // Exatamente uma das requisições deve ser a original e a outra replay, com saldo debitado apenas uma vez (100 - 40 = 60)
    const replayCount = (out1.isReplay ? 1 : 0) + (out2.isReplay ? 1 : 0);
    const passed = (out1.success && out2.success) && replayCount === 1 && finalBalance === 60;

    results.push({
      scenarioNumber: 2,
      name: 'Duas requisições simultâneas/concorrentes com a mesma chave',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Promessas resolvidas em paralelo: replayCount=${replayCount}/2. Saldo inicial=100, final=${finalBalance} (débito único de 40 créditos). Fila atômica serializou a execução.`,
      error: passed ? undefined : `Falha de concorrência: replayCount=${replayCount}, finalBalance=${finalBalance}`,
    });
  }

  // =========================================================================
  // CENÁRIO 3: Mesma chave de idempotência reutilizada com dados divergentes
  // =========================================================================
  {
    const t0 = Date.now();
    const userId1 = `audit_sc3_usr1_${Date.now()}`;
    const userId2 = `audit_sc3_usr2_${Date.now()}`;
    const idempKey = `idemp_sc3_conflict_${Date.now()}`;
    await seedUserCredits(userId1, 100, `seed_u1_${idempKey}`);
    await seedUserCredits(userId2, 100, `seed_u2_${idempKey}`);

    // Primeira transação legítima
    await financialLedger.unlockPaidContent({
      userId: userId1,
      creatorId: 'creator_sc3',
      creatorName: 'Criador 3',
      contentId: 'media_item_03',
      contentTitle: 'Item 03',
      priceCredits: 20,
      idempotencyKey: idempKey,
    });

    // Tentativa A: Reutilização com usuário diferente
    let caughtUserConflict = false;
    let userConflictMsg = '';
    try {
      await financialLedger.unlockPaidContent({
        userId: userId2,
        creatorId: 'creator_sc3',
        creatorName: 'Criador 3',
        contentId: 'media_item_03',
        contentTitle: 'Item 03',
        priceCredits: 20,
        idempotencyKey: idempKey,
      });
    } catch (err: any) {
      caughtUserConflict = true;
      userConflictMsg = err.message || String(err);
    }

    // Tentativa B: Reutilização com mesmo usuário mas valor divergente (50 ao invés de 20)
    let caughtAmountConflict = false;
    let amountConflictMsg = '';
    try {
      await financialLedger.unlockPaidContent({
        userId: userId1,
        creatorId: 'creator_sc3',
        creatorName: 'Criador 3',
        contentId: 'media_item_03',
        contentTitle: 'Item 03',
        priceCredits: 50,
        idempotencyKey: idempKey,
      });
    } catch (err: any) {
      caughtAmountConflict = true;
      amountConflictMsg = err.message || String(err);
    }

    const passed = caughtUserConflict && caughtAmountConflict;

    results.push({
      scenarioNumber: 3,
      name: 'Mesma chave de idempotência reutilizada com dados divergentes',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Conflito de usuário rejeitado: "${userConflictMsg}". Conflito de valor divergente rejeitado: "${amountConflictMsg}".`,
      error: passed ? undefined : `Não houve bloqueio esperado em ambos os casos: user=${caughtUserConflict}, amount=${caughtAmountConflict}`,
    });
  }

  // =========================================================================
  // CENÁRIO 4: Tentativa de desbloqueio com saldo insuficiente de créditos
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc4_usr_${Date.now()}`;
    const idempKey = `idemp_sc4_insufficient_${Date.now()}`;
    await seedUserCredits(userId, 10, `seed_${idempKey}`);

    let caughtError = false;
    let errorMsg = '';
    try {
      await financialLedger.unlockPaidContent({
        userId,
        creatorId: 'creator_sc4',
        creatorName: 'Criador 4',
        contentId: 'media_heavy_pack',
        contentTitle: 'Pacote VIP Completo',
        priceCredits: 50, // Maior que os 10 disponíveis
        idempotencyKey: idempKey,
      });
    } catch (err: any) {
      caughtError = true;
      errorMsg = err.message || String(err);
    }

    const balanceAfter = financialLedger.getUserCredits(userId);
    const passed = caughtError && balanceAfter === 10;

    results.push({
      scenarioNumber: 4,
      name: 'Tentativa de desbloqueio com saldo insuficiente de créditos',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Operação abortada antes do commit: "${errorMsg}". Saldo permaneceu intacto em ${balanceAfter} créditos.`,
      error: passed ? undefined : `Falha: caughtError=${caughtError}, balanceAfter=${balanceAfter}`,
    });
  }

  // =========================================================================
  // CENÁRIO 5: Simulação de falha durante a transação (bundle inválido)
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc5_usr_${Date.now()}`;
    const idempKey = `idemp_sc5_corrupt_${Date.now()}`;
    await seedUserCredits(userId, 40, `seed_${idempKey}`);

    const entriesBefore = financialLedger.getEntries().length;
    let caughtError = false;
    let errorMsg = '';

    // Tentativa de submeter bundle com valor negativo/zero em uma das entradas
    try {
      await financialLedger.postTransactionAtomic({
        idempotencyKey: idempKey,
        description: 'Simulação de transação corrompida',
        actorId: userId,
        entries: [
          {
            idempotencySuffix: 'valid_part',
            operationType: 'CONTENT_UNLOCK',
            debitAccount: `USER_CREDITS:${userId}`,
            creditAccount: 'ESCROW_CONTENT_POOL:credits',
            amount: 10,
            currency: 'CREDITS',
            description: 'Parte válida do lote',
          },
          {
            idempotencySuffix: 'corrupted_part',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'CREATOR_PENDING_BRL:cr_fake',
            amount: -5.00, // Inválido!
            currency: 'BRL',
            description: 'Parte corrompida com valor negativo',
          },
        ],
      });
    } catch (err: any) {
      caughtError = true;
      errorMsg = err.message || String(err);
    }

    const entriesAfter = financialLedger.getEntries().length;
    const balanceAfter = financialLedger.getUserCredits(userId);
    const passed = caughtError && entriesBefore === entriesAfter && balanceAfter === 40;

    results.push({
      scenarioNumber: 5,
      name: 'Simulação de falha durante a transação (bundle com valor inválido)',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Transação rejeitada na pré-validação: "${errorMsg}". Entradas no ledger: ${entriesBefore} -> ${entriesAfter} (zero gravações). Saldo intacto em 40.`,
      error: passed ? undefined : `Falha: caughtError=${caughtError}, deltaEntries=${entriesAfter - entriesBefore}`,
    });
  }

  // =========================================================================
  // CENÁRIO 6: Falha entre o débito e a concessão (Atomicidade All-or-Nothing)
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc6_usr_${Date.now()}`;
    const idempKey = `idemp_sc6_all_or_nothing_${Date.now()}`;
    await seedUserCredits(userId, 30, `seed_${idempKey}`);

    const entriesBefore = financialLedger.getEntries().length;
    let caught = false;

    // Tentativa em lote onde o segundo item exige mais saldo do que o disponível
    try {
      await financialLedger.postTransactionAtomic({
        idempotencyKey: idempKey,
        description: 'Teste all-or-nothing multi-etapa',
        actorId: userId,
        entries: [
          {
            idempotencySuffix: 'step1',
            operationType: 'CONTENT_UNLOCK',
            debitAccount: `USER_CREDITS:${userId}`,
            creditAccount: 'ESCROW_CONTENT_POOL:credits',
            amount: 20,
            currency: 'CREDITS',
            description: 'Etapa 1',
          },
          {
            idempotencySuffix: 'step2_overflow',
            operationType: 'CONTENT_UNLOCK',
            debitAccount: `USER_CREDITS:${userId}`,
            creditAccount: 'ESCROW_CONTENT_POOL:credits',
            amount: 25, // 20 + 25 = 45 > 30 (saldo insuficiente projetado)
            currency: 'CREDITS',
            description: 'Etapa 2 overflow',
          },
        ],
      });
    } catch {
      caught = true;
    }

    const entriesAfter = financialLedger.getEntries().length;
    const finalCredits = financialLedger.getUserCredits(userId);
    const passed = caught && entriesAfter === entriesBefore && finalCredits === 30;

    results.push({
      scenarioNumber: 6,
      name: 'Falha entre o débito e a concessão (Atomicidade All-or-Nothing)',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Rollback completo garantido: nenhuma entrada intermediária gravada. Lançamentos pré/pós = ${entriesBefore}. Saldo preservado integralmente (${finalCredits}).`,
      error: passed ? undefined : `Atomicidade falhou: entriesBefore=${entriesBefore}, entriesAfter=${entriesAfter}, finalCredits=${finalCredits}`,
    });
  }

  // =========================================================================
  // CENÁRIO 7: Reembolso / estorno de um desbloqueio anterior
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc7_usr_${Date.now()}`;
    const creatorId = 'creator_sc7';
    const idempKey = `idemp_sc7_unlock_${Date.now()}`;
    await seedUserCredits(userId, 50, `seed_${idempKey}`);

    const unlockRes = await financialLedger.unlockPaidContent({
      userId,
      creatorId,
      creatorName: 'Criador 7',
      contentId: 'media_refundable_07',
      contentTitle: 'Conteúdo Auditado 07',
      priceCredits: 30,
      idempotencyKey: idempKey,
    });

    const balPostUnlock = financialLedger.getUserCredits(userId); // 20
    const userDebitEntry = unlockRes.entries.find((e) => e.debitAccount === `USER_CREDITS:${userId}`);

    if (!userDebitEntry) {
      throw new Error('Entrada de débito de usuário não localizada para teste de estorno.');
    }

    const refundRes = await financialLedger.processRefund({
      originalEntryId: userDebitEntry.id,
      reason: 'Desacordo comercial ou contestação justificada do usuário',
      adminId: 'admin_compliance_audit',
      idempotencyKey: `idemp_refund_${idempKey}`,
    });

    const balPostRefund = financialLedger.getUserCredits(userId);
    const entries = financialLedger.getEntries();
    const updatedOriginal = entries.find((e) => e.id === userDebitEntry.id);

    const passed =
      balPostUnlock === 20 &&
      refundRes.success === true &&
      refundRes.compensatoryEntry.operationType === 'REFUND' &&
      refundRes.compensatoryEntry.amount === 30 &&
      refundRes.compensatoryEntry.creditAccount === `USER_CREDITS:${userId}` &&
      balPostRefund === 50 &&
      updatedOriginal?.status === 'refunded';

    results.push({
      scenarioNumber: 7,
      name: 'Reembolso / estorno de um desbloqueio anterior',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Desbloqueio custou 30 (saldo foi a 20). Estorno auditado gerou lançamento compensatório inverso (REFUND) de 30 créditos para USER_CREDITS. Saldo restabelecido para 50. Status original atualizado para "refunded".`,
      error: passed ? undefined : `Falha no estorno: balPostUnlock=${balPostUnlock}, balPostRefund=${balPostRefund}, status=${updatedOriginal?.status}`,
    });
  }

  // =========================================================================
  // CENÁRIO 8: Tentativa repetida de estorno da mesma operação já reembolsada
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc8_usr_${Date.now()}`;
    const idempKey = `idemp_sc8_${Date.now()}`;
    await seedUserCredits(userId, 50, `seed_${idempKey}`);

    const unlockRes = await financialLedger.unlockPaidContent({
      userId,
      creatorId: 'creator_sc8',
      creatorName: 'Criador 8',
      contentId: 'media_single_refund',
      contentTitle: 'Mídia Estorno Único',
      priceCredits: 25,
      idempotencyKey: idempKey,
    });

    const userDebitEntry = unlockRes.entries.find((e) => e.debitAccount === `USER_CREDITS:${userId}`)!;

    // Primeiro estorno legítimo
    await financialLedger.processRefund({
      originalEntryId: userDebitEntry.id,
      reason: 'Primeiro estorno legítimo',
      adminId: 'admin_audit',
      idempotencyKey: `idemp_rf1_${idempKey}`,
    });

    // Segundo estorno da mesma entrada (deve ser rejeitado)
    let caughtSecondRefund = false;
    let secondRefundError = '';
    try {
      await financialLedger.processRefund({
        originalEntryId: userDebitEntry.id,
        reason: 'Tentativa indevida de duplo estorno',
        adminId: 'admin_audit',
        idempotencyKey: `idemp_rf2_${idempKey}`,
      });
    } catch (err: any) {
      caughtSecondRefund = true;
      secondRefundError = err.message || String(err);
    }

    const finalBalance = financialLedger.getUserCredits(userId);
    const passed = caughtSecondRefund && finalBalance === 50;

    results.push({
      scenarioNumber: 8,
      name: 'Tentativa repetida de estorno da mesma operação já reembolsada',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Re-estorno bloqueado com sucesso: "${secondRefundError}". Saldo preservado em 50 (sem duplicação de crédito).`,
      error: passed ? undefined : `Falha ao bloquear re-estorno: caught=${caughtSecondRefund}, finalBalance=${finalBalance}`,
    });
  }

  // =========================================================================
  // CENÁRIO 9: Reconciliação do saldo reconstruído a partir do histórico completo
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc9_usr_${Date.now()}`;
    const idempBase = `idemp_sc9_${Date.now()}`;

    // Operação 1: Compra inicial de 100 créditos
    await seedUserCredits(userId, 100, `${idempBase}_buy1`);
    // Operação 2: Desbloqueio 1 (-25)
    await financialLedger.unlockPaidContent({
      userId,
      creatorId: 'cr_sc9',
      creatorName: 'Criador 9',
      contentId: 'media_item_1',
      contentTitle: 'Item 1',
      priceCredits: 25,
      idempotencyKey: `${idempBase}_unlock1`,
    });
    // Operação 3: Desbloqueio 2 (-15)
    await financialLedger.unlockPaidContent({
      userId,
      creatorId: 'cr_sc9',
      creatorName: 'Criador 9',
      contentId: 'media_item_2',
      contentTitle: 'Item 2',
      priceCredits: 15,
      idempotencyKey: `${idempBase}_unlock2`,
    });
    // Operação 4: Compra adicional de 50 créditos
    await seedUserCredits(userId, 50, `${idempBase}_buy2`);
    // Saldo esperado: 100 - 25 - 15 + 50 = 110

    // Cálculo independente através do scan direto de todas as entradas do ledger
    const allEntries = financialLedger.getEntries();
    let independentCreditSum = 0;
    let independentDebitSum = 0;

    for (const e of allEntries) {
      if (e.status !== 'posted') continue;
      if (e.currency !== 'CREDITS') continue;

      if (e.creditAccount === `USER_CREDITS:${userId}`) {
        independentCreditSum += e.amount;
      }
      if (e.debitAccount === `USER_CREDITS:${userId}`) {
        independentDebitSum += e.amount;
      }
    }

    const calculatedBalance = independentCreditSum - independentDebitSum;
    const reportedBalance = financialLedger.getUserCredits(userId);

    const passed =
      independentCreditSum === 150 &&
      independentDebitSum === 40 &&
      calculatedBalance === 110 &&
      reportedBalance === 110;

    results.push({
      scenarioNumber: 9,
      name: 'Reconciliação do saldo reconstruído a partir do histórico completo',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Créditos Totais: 150, Débitos Totais: 40. Balanço reconciliado independente: ${calculatedBalance} créditos. Método getUserCredits: ${reportedBalance} créditos. Discrepância contábil: 0.00.`,
      error: passed ? undefined : `Divergência na reconciliação: calculated=${calculatedBalance}, reported=${reportedBalance}`,
    });
  }

  // =========================================================================
  // CENÁRIO 10: Duas operações simultâneas concorrendo pelo mesmo saldo limítrofe
  // =========================================================================
  {
    const t0 = Date.now();
    const userId = `audit_sc10_usr_${Date.now()}`;
    const idempBase = `idemp_sc10_${Date.now()}`;
    // Usuário tem exatamente 50 créditos
    await seedUserCredits(userId, 50, `${idempBase}_seed`);

    // Dispara simultaneamente duas requisições de 40 créditos com chaves DIFERENTES
    // Como 40 + 40 = 80 > 50, exatamente uma deve ter sucesso e a outra deve ser rejeitada por saldo insuficiente.
    const p1 = financialLedger.unlockPaidContent({
      userId,
      creatorId: 'cr_10_a',
      creatorName: 'Criador 10A',
      contentId: 'media_pack_a',
      contentTitle: 'Pacote A',
      priceCredits: 40,
      idempotencyKey: `${idempBase}_req_A`,
    });

    const p2 = financialLedger.unlockPaidContent({
      userId,
      creatorId: 'cr_10_b',
      creatorName: 'Criador 10B',
      contentId: 'media_pack_b',
      contentTitle: 'Pacote B',
      priceCredits: 40,
      idempotencyKey: `${idempBase}_req_B`,
    });

    const outcomes = await Promise.allSettled([p1, p2]);
    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');
    const finalBalance = financialLedger.getUserCredits(userId);

    const passed = fulfilled.length === 1 && rejected.length === 1 && finalBalance === 10;

    results.push({
      scenarioNumber: 10,
      name: 'Duas operações simultâneas concorrendo pelo mesmo saldo limítrofe',
      passed,
      durationMs: Date.now() - t0,
      evidence: `Saldo inicial: 50. Operações de 40 disparadas em paralelo: 1 aceita, 1 rejeitada por saldo insuficiente. Saldo final exato: ${finalBalance} créditos. Impossibilidade comprovada de saldo negativo (overdraft prevention).`,
      error: passed ? undefined : `Falha no teste de cheque especial: fulfilled=${fulfilled.length}, rejected=${rejected.length}, finalBalance=${finalBalance}`,
    });
  }

  const executionDurationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    executionDurationMs,
    results,
  };
}
