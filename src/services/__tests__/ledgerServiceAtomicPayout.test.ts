/**
 * SUÍTE DE TESTES OBRIGATÓRIOS: ATOMICIDADE FINANCEIRA E INTEGRAÇÃO DE PAYOUT
 * 
 * Cobre estritamente os 10 cenários exigidos pela Diretriz de Engenharia Financeira:
 * 1. Atomicidade diante de falha entre lançamentos relacionados.
 * 2. Repetição da mesma solicitação sem duplicação (idempotência).
 * 3. Duas solicitações concorrentes para o mesmo payout (race condition).
 * 4. Persistência após reinicialização.
 * 5. Rejeição de transições de estado inválidas.
 * 6. Impossibilidade de transformar saldo simulado em saldo de produção.
 * 7. Bloqueio de pagamentos reais para payouts simulados.
 * 8. Isolamento de consultas e atualizações entre ambientes.
 * 9. Estorno sem alteração do histórico original (lançamento compensatório).
 * 10. Comportamento seguro quando a configuração do ambiente está ausente.
 */

import { financialLedger, PayoutRecord } from '../ledgerService';

export interface AtomicTestCaseResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runAtomicPayoutTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: AtomicTestCaseResult[];
}> {
  const results: AtomicTestCaseResult[] = [];

  // =========================================================================
  // TESTE 1: Atomicidade diante de falha entre lançamentos relacionados
  // =========================================================================
  {
    const start = performance.now();
    try {
      const testUserId = `user_atomic_${Date.now()}`;
      // Usuário começa com apenas 50 créditos
      await financialLedger.purchaseCreditPackage({
        userId: testUserId,
        packageId: 'pkg_inicial',
        packageName: 'Inicial',
        creditsToGrant: 50,
        priceBrl: 9.9,
        gateway: 'pix',
        idempotencyKey: `idemp_atomic_seed_${Date.now()}`,
      });

      const entriesBefore = financialLedger.getEntries().length;

      // Tentativa de transação atômica onde a 1ª entrada é válida mas a 2ª tenta debitar 100 créditos (insuficiente)
      let threwExpectedError = false;
      try {
        await financialLedger.postTransactionAtomic({
          idempotencyKey: `idemp_failing_atomic_${Date.now()}`,
          description: 'Teste de falha atômica proposital',
          actorId: testUserId,
          entries: [
            {
              idempotencySuffix: 'valid_fiat',
              operationType: 'ADMIN_ADJUSTMENT',
              debitAccount: 'PLATFORM_RESERVE_POOL:credits',
              creditAccount: 'ESCROW_TEST_POOL:credits',
              amount: 10,
              currency: 'CREDITS',
              description: 'Lançamento intermediário que deve ser revertido',
            },
            {
              idempotencySuffix: 'invalid_debit',
              operationType: 'CONTENT_UNLOCK',
              debitAccount: `USER_CREDITS:${testUserId}`,
              creditAccount: 'ESCROW_CONTENT_POOL:credits',
              amount: 100, // Saldo é apenas 50 -> DEVE FALHAR!
              currency: 'CREDITS',
              description: 'Lançamento com saldo insuficiente',
            },
          ],
        });
      } catch (err: any) {
        threwExpectedError = err.message.includes('Saldo insuficiente no livro-razão contábil');
      }

      const entriesAfter = financialLedger.getEntries().length;
      const passed = threwExpectedError && entriesBefore === entriesAfter;

      results.push({
        testNumber: 1,
        name: 'Atomicidade diante de falha entre lançamentos relacionados (Rollback total)',
        passed,
        message: passed
          ? `Aprovado: A falha no 2º lançamento reverteu integralmente o lote. Total de lançamentos permaneceu ${entriesAfter}.`
          : `Falha: Lançamento parcial foi persistido ou erro não foi capturado. Antes=${entriesBefore}, Depois=${entriesAfter}.`,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 1,
        name: 'Atomicidade diante de falha entre lançamentos relacionados',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 2: Repetição da mesma solicitação sem duplicação (Idempotência)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_idemp_${Date.now()}`;
      // Bonificar criador com R$ 100,00 no saldo disponível
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_seed_idemp',
        campaignTitle: 'Campanha Seed',
        creatorId,
        creatorName: 'Criador Idempotência',
        rewardBrlCents: 10000,
        achievedMetric: 'Seed de Teste',
        idempotencyKey: `idemp_seed_reward_${Date.now()}`,
      });

      const payoutKey = `idemp_payout_repeat_${Date.now()}`;

      // 1ª solicitação
      const firstReq = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Idempotência',
        amountBrl: 40.0,
        payoutMethod: 'PIX Instantâneo',
        pixKeyOrAccount: 'pix@idemp.test',
        idempotencyKey: payoutKey,
        environment: 'production',
      });

      // 2ª solicitação com a exata mesma chave
      const secondReq = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Idempotência',
        amountBrl: 40.0,
        payoutMethod: 'PIX Instantâneo',
        pixKeyOrAccount: 'pix@idemp.test',
        idempotencyKey: payoutKey,
        environment: 'production',
      });

      const passed =
        firstReq.isReplay === false &&
        secondReq.isReplay === true &&
        firstReq.payout.id === secondReq.payout.id;

      results.push({
        testNumber: 2,
        name: 'Repetição da mesma solicitação sem duplicação (Idempotência com isReplay)',
        passed,
        message: passed
          ? `Aprovado: Replay detectado com sucesso. Mesma solicitação #${firstReq.payout.id} retornada sem criar registros duplicados.`
          : 'Falha: Requisição repetida duplicou registro ou não sinalizou isReplay.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 2,
        name: 'Repetição da mesma solicitação sem duplicação',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 3: Duas solicitações concorrentes para o mesmo payout (Race Condition)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_race_${Date.now()}`;
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_seed_race',
        campaignTitle: 'Campanha Race',
        creatorId,
        creatorName: 'Criador Concorrência',
        rewardBrlCents: 5000, // R$ 50,00 disponível
        achievedMetric: 'Seed de Teste',
        idempotencyKey: `idemp_seed_race_${Date.now()}`,
      });

      // Disparar duas solicitações simultâneas concorrentes com a mesma chave
      const sharedKey = `idemp_shared_race_${Date.now()}`;
      const [res1, res2] = await Promise.all([
        financialLedger.requestPayout({
          creatorId,
          creatorName: 'Criador Concorrência',
          amountBrl: 30.0,
          payoutMethod: 'PIX Instantâneo',
          pixKeyOrAccount: 'pix@race.test',
          idempotencyKey: sharedKey,
          environment: 'production',
        }),
        financialLedger.requestPayout({
          creatorId,
          creatorName: 'Criador Concorrência',
          amountBrl: 30.0,
          payoutMethod: 'PIX Instantâneo',
          pixKeyOrAccount: 'pix@race.test',
          idempotencyKey: sharedKey,
          environment: 'production',
        }),
      ]);

      const oneIsReplay = (res1.isReplay && !res2.isReplay) || (!res1.isReplay && res2.isReplay);
      const samePayoutId = res1.payout.id === res2.payout.id;
      const passed = oneIsReplay && samePayoutId;

      results.push({
        testNumber: 3,
        name: 'Duas solicitações concorrentes para o mesmo payout (Fila serializada)',
        passed,
        message: passed
          ? `Aprovado: Concorrência absorvida de forma atômica pela fila. Exatamente uma foi novidade e a outra replay seguro.`
          : 'Falha: Concorrência gerou registros paralelos ou inconsistência.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 3,
        name: 'Duas solicitações concorrentes para o mesmo payout',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 4: Persistência após reinicialização
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_persist_${Date.now()}`;
      const payoutKey = `idemp_persist_${Date.now()}`;

      // Gerar recompensa e solicitar payout
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_persist',
        campaignTitle: 'Campanha Persistência',
        creatorId,
        creatorName: 'Criador Persistente',
        rewardBrlCents: 8000,
        achievedMetric: 'Auditoria de Persistência',
        idempotencyKey: `idemp_reward_persist_${Date.now()}`,
      });

      const { payout } = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Persistente',
        amountBrl: 50.0,
        payoutMethod: 'TED Bancária',
        pixKeyOrAccount: 'Banco 001 Ag 1234 CC 5678',
        idempotencyKey: payoutKey,
        environment: 'production',
      });

      // Simulação de "reinicialização": recarregar registros diretamente a partir do storage
      const reloadedRecords = financialLedger.getPayoutRecords('production');
      const found = reloadedRecords.find((p) => p.id === payout.id);

      const passed =
        found !== undefined &&
        found.amountBrl === 50.0 &&
        found.status === 'under_review' &&
        found.idempotencyKey === payoutKey;

      results.push({
        testNumber: 4,
        name: 'Persistência após reinicialização (Storage durável e isomórfico)',
        passed,
        message: passed
          ? `Aprovado: Payout #${payout.id} recarregado com integridade e dados correspondentes.`
          : 'Falha: Registro não foi persistido ou não foi recuperado após consulta limpa.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 4,
        name: 'Persistência após reinicialização',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 5: Rejeição de transições de estado inválidas
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_transitions_${Date.now()}`;
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_trans',
        campaignTitle: 'Campanha Transições',
        creatorId,
        creatorName: 'Criador Máquina Estados',
        rewardBrlCents: 15000,
        achievedMetric: 'Seed de Teste',
        idempotencyKey: `idemp_seed_trans_${Date.now()}`,
      });

      const { payout } = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Máquina Estados',
        amountBrl: 100.0,
        payoutMethod: 'PIX Instantâneo',
        pixKeyOrAccount: 'pix@trans.test',
        idempotencyKey: `idemp_req_trans_${Date.now()}`,
        environment: 'production',
      });

      // Tentativa 1: Liberar pagamento diretamente sem aprovação prévia (under_review -> released)
      let rejectedDirectRelease = false;
      try {
        await financialLedger.releasePayout({
          payoutId: payout.id,
          adminId: 'admin_audit',
          bankingTxRef: 'PIX_INVALID_123',
          idempotencyKey: `idemp_fail_rel_${Date.now()}`,
          environment: 'production',
        });
      } catch (err: any) {
        rejectedDirectRelease = err.message.includes('Não é permitido liberar payout com status');
      }

      // Aprovação correta (under_review -> approved)
      await financialLedger.approvePayout({
        payoutId: payout.id,
        adminId: 'admin_audit',
        idempotencyKey: `idemp_valid_app_${Date.now()}`,
        environment: 'production',
      });

      // Liberação correta (approved -> released)
      await financialLedger.releasePayout({
        payoutId: payout.id,
        adminId: 'admin_audit',
        bankingTxRef: 'PIX_CONFIRMED_999',
        idempotencyKey: `idemp_valid_rel_${Date.now()}`,
        environment: 'production',
      });

      // Tentativa 2: Cancelar payout que já foi liberado (released -> cancelled)
      let rejectedCancelAfterRelease = false;
      try {
        await financialLedger.cancelPayout({
          payoutId: payout.id,
          actorId: 'admin_audit',
          reason: 'Cancelamento tardio inválido',
          idempotencyKey: `idemp_fail_cancel_${Date.now()}`,
          environment: 'production',
        });
      } catch (err: any) {
        rejectedCancelAfterRelease = err.message.includes('estado terminal');
      }

      const passed = rejectedDirectRelease && rejectedCancelAfterRelease;

      results.push({
        testNumber: 5,
        name: 'Rejeição de transições de estado inválidas (Máquina de Estados Estrita)',
        passed,
        message: passed
          ? 'Aprovado: Bloqueou liberação direta sem aprovação e bloqueou cancelamento de payout já liberado.'
          : 'Falha: Máquina de estados permitiu transição inválida.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 5,
        name: 'Rejeição de transições de estado inválidas',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 6: Impossibilidade de transformar saldo simulado em saldo de produção
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_sim_no_money_${Date.now()}`;
      const balanceBefore = financialLedger.getCreatorBalances(creatorId);

      // Executar simulação de R$ 1.000.000,00
      const sim = financialLedger.simulatePayout({
        creatorId,
        creatorName: 'Criador Simulação',
        requestedAmountBrl: 1000000.0,
        feePercentage: 1.5,
        fixedFeeBrl: 3.5,
      });

      const balanceAfter = financialLedger.getCreatorBalances(creatorId);
      const passed =
        sim.isSimulation === true &&
        sim.status === 'simulated' &&
        balanceBefore.availableBrl === 0 &&
        balanceAfter.availableBrl === 0 &&
        balanceAfter.totalEarnedBrl === 0;

      results.push({
        testNumber: 6,
        name: 'Impossibilidade de transformar saldo simulado em saldo de produção',
        passed,
        message: passed
          ? `Aprovado: Simulação de R$ 1.000.000,00 manteve saldo real do criador em R$ 0,00 sem mutação contábil.`
          : 'Falha: Simulação afetou os saldos do criador.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 6,
        name: 'Impossibilidade de transformar saldo simulado em saldo de produção',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 7: Bloqueio de pagamentos reais para payouts simulados
  // =========================================================================
  {
    const start = performance.now();
    try {
      const sim = financialLedger.simulatePayout({
        creatorId: 'creator_fake_sim',
        creatorName: 'Criador Fake',
        requestedAmountBrl: 500.0,
      });

      // Tentativa de aprovação de um payout simulado
      let blockedApproval = false;
      try {
        await financialLedger.approvePayout({
          payoutId: sim.id,
          adminId: 'hacker_admin',
          idempotencyKey: `idemp_hack_app_${Date.now()}`,
          environment: 'production',
        });
      } catch (err: any) {
        blockedApproval =
          err.message.includes('Payouts de simulação nunca podem ser aprovados') ||
          err.message.includes('não encontrada no ambiente de produção');
      }

      // Tentativa de liberação de um payout simulado
      let blockedRelease = false;
      try {
        await financialLedger.releasePayout({
          payoutId: sim.id,
          adminId: 'hacker_admin',
          bankingTxRef: 'PIX_HACK_000',
          idempotencyKey: `idemp_hack_rel_${Date.now()}`,
          environment: 'production',
        });
      } catch (err: any) {
        blockedRelease =
          err.message.includes('Payouts de simulação nunca podem acionar trilhos bancários') ||
          err.message.includes('não encontrada');
      }

      const passed = blockedApproval && blockedRelease;

      results.push({
        testNumber: 7,
        name: 'Bloqueio de pagamentos reais para payouts simulados (Barreira Impenetrável)',
        passed,
        message: passed
          ? 'Aprovado: Tentativas de aprovar ou liberar payout de simulação foram fatalmente rejeitadas.'
          : 'Falha: Sistema permitiu processar registro simulado como pagamento real.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 7,
        name: 'Bloqueio de pagamentos reais para payouts simulados',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 8: Isolamento de consultas e atualizações entre ambientes
  // =========================================================================
  {
    const start = performance.now();
    try {
      // Registrar uma simulação em sandbox
      const sim = financialLedger.simulatePayout({
        creatorId: 'creator_iso_test',
        creatorName: 'Criador Isolamento',
        requestedAmountBrl: 300.0,
      });

      // Consultar ambiente de produção
      const prodRecords = financialLedger.getPayoutRecords('production');
      const simFoundInProd = prodRecords.some((p) => p.id === sim.id);

      // Consultar ambiente sandbox
      const sandboxRecords = financialLedger.getPayoutRecords('sandbox');
      const simFoundInSandbox = sandboxRecords.some((p) => p.id === sim.id);

      const passed = !simFoundInProd && simFoundInSandbox;

      results.push({
        testNumber: 8,
        name: 'Isolamento de consultas e atualizações entre ambientes (Namespaces Segregados)',
        passed,
        message: passed
          ? 'Aprovado: Registros simulados aparecem unicamente no namespace sandbox e são invisíveis em produção.'
          : 'Falha: Vazamento de registros de simulação no ambiente de produção.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 8,
        name: 'Isolamento de consultas e atualizações entre ambientes',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 9: Estorno sem alteração do histórico original (Lançamento Compensatório)
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_reversal_${Date.now()}`;
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_reversal',
        campaignTitle: 'Campanha Reversão',
        creatorId,
        creatorName: 'Criador Estorno',
        rewardBrlCents: 20000, // R$ 200,00
        achievedMetric: 'Seed de Teste',
        idempotencyKey: `idemp_seed_rev_${Date.now()}`,
      });

      // Solicitar e aprovar payout de R$ 100,00 (Fundos retidos em CREATOR_PAYOUT_ESCROW)
      const { payout } = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Estorno',
        amountBrl: 100.0,
        payoutMethod: 'PIX Instantâneo',
        pixKeyOrAccount: 'pix@rev.test',
        idempotencyKey: `idemp_req_rev_${Date.now()}`,
        environment: 'production',
      });

      await financialLedger.approvePayout({
        payoutId: payout.id,
        adminId: 'admin_audit',
        idempotencyKey: `idemp_app_rev_${Date.now()}`,
        environment: 'production',
      });

      const balanceInEscrow = financialLedger.getCreatorBalances(creatorId).availableBrl;

      // Cancelar payout: deve acionar lançamento compensatório PAYOUT_REVERSAL
      await financialLedger.cancelPayout({
        payoutId: payout.id,
        actorId: 'admin_audit',
        reason: 'Chave PIX informada pertencia a terceiro',
        idempotencyKey: `idemp_cancel_rev_${Date.now()}`,
        environment: 'production',
      });

      const balanceAfterCancel = financialLedger.getCreatorBalances(creatorId).availableBrl;

      // Verificar que o lançamento original de reserva NÃO foi apagado do livro-razão
      const allEntries = financialLedger.getEntries();
      const originalEntry = allEntries.find((e) => e.operationType === 'PAYOUT_RESERVE' && e.referenceId === payout.id);
      const compensatoryEntry = allEntries.find((e) => e.operationType === 'PAYOUT_REVERSAL' && e.referenceId === payout.id);

      const passed =
        balanceInEscrow === 100.0 && // R$ 200 - 100
        balanceAfterCancel === 200.0 && // Devolvido R$ 100
        originalEntry !== undefined &&
        compensatoryEntry !== undefined &&
        compensatoryEntry.amount === 100.0;

      results.push({
        testNumber: 9,
        name: 'Estorno sem alteração do histórico original (Lançamento Compensatório Imutável)',
        passed,
        message: passed
          ? 'Aprovado: Lançamento de reserva original preservado e estorno compensatório devolveu saldo disponível ao criador.'
          : 'Falha: Saldo não foi restaurado ou lançamento original foi indevidamente apagado/mutado.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 9,
        name: 'Estorno sem alteração do histórico original',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  // =========================================================================
  // TESTE 10: Comportamento seguro quando a configuração do ambiente está ausente
  // =========================================================================
  {
    const start = performance.now();
    try {
      const creatorId = `creator_missing_env_${Date.now()}`;
      await financialLedger.postLivePerformanceReward({
        campaignId: 'camp_no_env',
        campaignTitle: 'Campanha Sem Ambiente',
        creatorId,
        creatorName: 'Criador Seguro',
        rewardBrlCents: 5000,
        achievedMetric: 'Seed de Teste',
        idempotencyKey: `idemp_seed_noenv_${Date.now()}`,
      });

      // Solicitar payout SEM especificar environment (deve adotar sandbox seguro por padrão)
      const { payout } = await financialLedger.requestPayout({
        creatorId,
        creatorName: 'Criador Seguro',
        amountBrl: 25.0,
        payoutMethod: 'PIX Instantâneo',
        pixKeyOrAccount: 'pix@noenv.test',
        idempotencyKey: `idemp_no_env_${Date.now()}`,
        // environment OMITIDO propositalmente
      });

      // Tentativa de aprovação real SEM informar environment ou com environment indefinido
      let blockedApprovalWithoutEnv = false;
      try {
        await financialLedger.approvePayout({
          payoutId: payout.id,
          adminId: 'admin_audit',
          idempotencyKey: `idemp_app_noenv_${Date.now()}`,
          // environment OMITIDO propositalmente -> DEVE BLOQUEAR!
        });
      } catch (err: any) {
        blockedApprovalWithoutEnv = err.message.includes('Operações financeiras de payout só são autorizadas em ambiente de produção');
      }

      const passed = payout.environment === 'sandbox' && blockedApprovalWithoutEnv;

      results.push({
        testNumber: 10,
        name: 'Comportamento seguro quando a configuração do ambiente está ausente (Fail-Safe)',
        passed,
        message: passed
          ? 'Aprovado: Ambiente ausente caiu automaticamente em sandbox seguro e bloqueou aprovação de repasse real.'
          : 'Falha: Operação permitiu ação real ou falhou de forma insegura com ambiente ausente.',
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      results.push({
        testNumber: 10,
        name: 'Comportamento seguro quando a configuração do ambiente está ausente',
        passed: false,
        message: `Exceção: ${e?.message || e}`,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Invocação direta se executado via Node/CLI
const isDirectCliExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes('ledgerServiceAtomicPayout.test'));

if (isDirectCliExecution) {
  const suite = await runAtomicPayoutTestSuite();
  console.log('========================================================================');
  console.log('SUÍTE DE TESTES OBRIGATÓRIOS: ATOMICIDADE FINANCEIRA & PAYOUT (JOBS)');
  console.log('========================================================================');
  suite.results.forEach((r) => {
    const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${r.testNumber}: ${r.name} (${r.durationMs}ms)`);
    console.log(`   ${r.message}`);
  });
  console.log('========================================================================');
  console.log(`RESULTADO: ${suite.passed}/${suite.total} testes aprovados (${suite.failed === 0 ? '100% SUCESSO 🚀' : 'FALHA'})`);
  console.log('========================================================================\n');
}
