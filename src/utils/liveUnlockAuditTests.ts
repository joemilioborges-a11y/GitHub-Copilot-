/**
 * JOBS 1.0 — SUÍTE DE TESTES OBRIGATÓRIOS: PAINEL DE AUDITORIA DE DESBLOQUEIOS DE LIVES (70/30)
 * 
 * 12 Cenários de Teste Obrigatórios:
 * 1. Consulta de transações reais do ledger sem dados fictícios/mocados
 * 2. Cálculo exato da divisão 70/30 com precisão de centavos e arredondamento a 2 casas
 * 3. Segregação estrita entre custódia pendente (CREATOR_PENDING_BRL) e liquidado (CREATOR_AVAILABLE_BRL)
 * 4. Diferenciação formal entre créditos virtuais (não-fiduciários) e moeda corrente (BRL)
 * 5. Rejeição e tratamento de transações não-elegíveis ou inválidas
 * 6. Detecção e alerta de divergências contábeis na divisão 70/30
 * 7. Rastreamento e vinculação de estornos compensatórios auditados
 * 8. Proteção estrita contra replay por idempotência (sem duplicação de receita)
 * 9. Notificação reativa em tempo real com subscrição no ledger
 * 10. Desmontagem limpa de subscrição sem vazamento de memória (memory leak)
 * 11. Filtros multicritério (período, liveId, criador, status e busca textual)
 * 12. Sanitização de campos na exportação CSV contra Formula Injection
 */

import {
  financialLedger,
  LiveUnlockAuditTransaction,
  sanitizeCsvField,
  maskUserId,
  maskIdempotencyKey,
} from '../services/ledgerService';

export interface AuditTestCaseResult {
  scenarioNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface LiveUnlockAuditTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  results: AuditTestCaseResult[];
}

export async function runLiveUnlockAuditTestSuite(): Promise<LiveUnlockAuditTestSuiteSummary> {
  const startTime = Date.now();
  const results: AuditTestCaseResult[] = [];

  const runScenario = async (
    scenarioNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string>
  ) => {
    const t0 = Date.now();
    try {
      const evidence = await fn();
      results.push({
        scenarioNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - t0,
        evidence,
      });
    } catch (err: any) {
      results.push({
        scenarioNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha durante validação contábil',
        error: err?.message || String(err),
      });
    }
  };

  // ========================================================================
  // CENÁRIO 1: Consulta de transações reais do ledger sem dados fictícios
  // ========================================================================
  await runScenario(
    1,
    'SCENARIO_01_REAL_LEDGER_DATA',
    'Consulta de transações reais do ledger sem dados fictícios',
    async () => {
      // Postar uma transação real de teste
      const testIdemp = `idemp_audit_test_s1_${Date.now()}`;
      await financialLedger.unlockLiveStream({
        userId: 'current_user',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        liveStreamId: 'live_test_s1',
        liveTitle: 'Show Teste Cenário 1',
        priceCredits: 50,
        idempotencyKey: testIdemp,
      });

      const audit = financialLedger.getLiveUnlockAuditData({ period: 'all' });
      if (!audit || !audit.transactions || audit.transactions.length === 0) {
        throw new Error('Nenhuma transação retornada pelo ledger contábil.');
      }

      const match = audit.transactions.find((t) => t.idempotencyKey.includes(testIdemp));
      if (!match) {
        throw new Error(`Transação ${testIdemp} não foi encontrada no relatório consolidado.`);
      }

      // Validar que possui lançamentos reais associados
      if (!match.entries || match.entries.length < 3) {
        throw new Error('Transação não contém o lote contábil atômico com lançamentos complementares.');
      }

      return `Transações auditadas: ${audit.transactions.length}. Transação ${match.transactionId} validada com ${match.entries.length} lançamentos.`;
    }
  );

  // ========================================================================
  // CENÁRIO 2: Cálculo exato da divisão 70/30 com precisão de centavos
  // ========================================================================
  await runScenario(
    2,
    'SCENARIO_02_EXACT_70_30_SPLIT',
    'Cálculo exato da divisão 70/30 com precisão de centavos',
    async () => {
      // 65 créditos = R$ 6,50 bruto -> Criador (70%) = R$ 4,55, JOBS (30%) = R$ 1,95
      const priceCredits = 65;
      const idemp = `idemp_audit_test_s2_${Date.now()}`;
      const res = await financialLedger.unlockLiveStream({
        userId: 'current_user',
        creatorId: 'isabella',
        creatorName: 'Isabella Fontes',
        liveStreamId: 'live_battle_s2',
        liveTitle: 'Batalha 70/30 Centavos',
        priceCredits,
        idempotencyKey: idemp,
      });

      const grossBrl = Number((priceCredits * 0.10).toFixed(2));
      const expectedCreator = 4.55;
      const expectedPlatform = 1.95;

      if (res.creatorEarnedBrl !== expectedCreator) {
        throw new Error(`Parcela do criador divergente: obtido ${res.creatorEarnedBrl}, esperado ${expectedCreator}`);
      }
      if (res.platformEarnedBrl !== expectedPlatform) {
        throw new Error(`Comissão JOBS divergente: obtido ${res.platformEarnedBrl}, esperado ${expectedPlatform}`);
      }

      const sum = Number((res.creatorEarnedBrl + res.platformEarnedBrl).toFixed(2));
      if (sum !== grossBrl) {
        throw new Error(`Soma 70/30 (${sum}) difere do valor econômico bruto (${grossBrl})`);
      }

      return `Bruto: R$ ${grossBrl.toFixed(2)} | Criador: R$ ${res.creatorEarnedBrl.toFixed(2)} | JOBS: R$ ${res.platformEarnedBrl.toFixed(2)} | Soma = 100%`;
    }
  );

  // ========================================================================
  // CENÁRIO 3: Segregação estrita entre custódia pendente e saldo liquidado
  // ========================================================================
  await runScenario(
    3,
    'SCENARIO_03_PENDING_SETTLEMENT_SEGREGATION',
    'Segregação estrita entre custódia pendente e saldo liquidado',
    async () => {
      const audit = financialLedger.getLiveUnlockAuditData({ period: 'all' });
      const pendingTxs = audit.transactions.filter((t) => t.isPendingSettlement && !t.isRefunded);

      for (const tx of pendingTxs) {
        const creatorEntry = tx.entries.find((e) => e.operationType === 'CREATOR_REVENUE_SHARE');
        if (creatorEntry && !creatorEntry.creditAccount.startsWith('CREATOR_PENDING_BRL:')) {
          throw new Error(`Transação pendente creditada indevidamente em conta ${creatorEntry.creditAccount}`);
        }
      }

      return `KPI Custódia Pendente: R$ ${audit.kpis.pendingSettlementBrl.toFixed(2)} segregado de saldo liquidado.`;
    }
  );

  // ========================================================================
  // CENÁRIO 4: Diferenciação formal entre créditos virtuais e moeda fiduciária
  // ========================================================================
  await runScenario(
    4,
    'SCENARIO_04_CURRENCY_BOUNDARY',
    'Diferenciação formal entre créditos virtuais e moeda corrente BRL',
    async () => {
      const entries = financialLedger.getEntries();
      const creditEntries = entries.filter((e) => e.currency === 'CREDITS');
      const brlEntries = entries.filter((e) => e.currency === 'BRL');

      for (const e of creditEntries) {
        if (e.creditAccount.includes('BRL') || e.debitAccount.includes('BRL')) {
          throw new Error(`Violação de moeda: Crédito virtual movimentado em conta BRL (${e.id})`);
        }
      }

      for (const e of brlEntries) {
        if (e.creditAccount.includes('credits') || e.debitAccount.includes('credits')) {
          throw new Error(`Violação de moeda: BRL movimentado em conta de créditos virtuais (${e.id})`);
        }
      }

      return `${creditEntries.length} lançamentos em CREDITS e ${brlEntries.length} em BRL auditados sem mistura de tipos.`;
    }
  );

  // ========================================================================
  // CENÁRIO 5: Rejeição e tratamento de transações não-elegíveis ou inválidas
  // ========================================================================
  await runScenario(
    5,
    'SCENARIO_05_REJECT_INVALID_TRANSACTIONS',
    'Rejeição e tratamento de transações não-elegíveis ou inválidas',
    async () => {
      let rejected = false;
      try {
        await financialLedger.unlockLiveStream({
          userId: 'current_user',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          liveStreamId: 'live_invalid_zero',
          liveTitle: 'Zero Credits',
          priceCredits: 0,
          idempotencyKey: `idemp_zero_${Date.now()}`,
        });
      } catch (err: any) {
        rejected = true;
      }

      if (!rejected) {
        throw new Error('Livro-razão permitiu transação com 0 créditos.');
      }

      return 'Transação inválida com valor zero ou negativo rejeitada com sucesso (Zero-Fault Pre-Validation).';
    }
  );

  // ========================================================================
  // CENÁRIO 6: Detecção e alerta de divergências contábeis na divisão 70/30
  // ========================================================================
  await runScenario(
    6,
    'SCENARIO_06_DIVERGENCE_DETECTION',
    'Detecção e alerta de divergências contábeis na divisão 70/30',
    async () => {
      // Simular um lote com divergência matemática forçada em teste
      const divergentIdemp = `idemp_forced_div_${Date.now()}`;
      await financialLedger.postTransactionAtomic({
        idempotencyKey: divergentIdemp,
        description: '[TESTE DIVERGÊNCIA] Lote com split incorreto para validação do auditor',
        actorId: 'current_user',
        entries: [
          {
            idempotencySuffix: 'spend',
            operationType: 'CONTENT_UNLOCK',
            debitAccount: 'USER_CREDITS:current_user',
            creditAccount: 'ESCROW_CONTENT_POOL:credits',
            amount: 100, // R$ 10,00 bruto
            currency: 'CREDITS',
            targetCreatorId: 'valentina',
            referenceId: 'live_div_test',
            description: 'Desbloqueio com split incorreto proposital',
            metadata: { isLiveUnlock: true },
          },
          {
            idempotencySuffix: 'creator',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'CREATOR_PENDING_BRL:valentina',
            amount: 5.00, // 50% em vez de 70% (deveria ser 7.00)
            currency: 'BRL',
            targetCreatorId: 'valentina',
            description: 'Repasse divergente 50%',
          },
          {
            idempotencySuffix: 'plat',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_REVENUE_BRL',
            amount: 3.00, // 30% (Soma = 8.00 != 10.00 -> Faltam 2.00)
            currency: 'BRL',
            targetCreatorId: 'valentina',
            description: 'Comissão 30%',
          },
        ],
      });

      const audit = financialLedger.getLiveUnlockAuditData({ period: 'all' });
      const foundDiv = audit.divergences.find((d) => d.transactionId.includes(divergentIdemp) || d.issue.includes('Divergência matemática'));

      if (!foundDiv) {
        throw new Error('Mecanismo de auditoria falhou ao detectar a divergência contábil injetada.');
      }

      return `Divergência identificada com precisão: "${foundDiv.issue}"`;
    }
  );

  // ========================================================================
  // CENÁRIO 7: Rastreamento e vinculação de estornos compensatórios auditados
  // ========================================================================
  await runScenario(
    7,
    'SCENARIO_07_REFUND_COMPENSATORY_TRACKING',
    'Rastreamento e vinculação de estornos compensatórios auditados',
    async () => {
      // 1. Criar transação para estornar
      const idemp = `idemp_to_refund_${Date.now()}`;
      const res = await financialLedger.unlockLiveStream({
        userId: 'current_user',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        liveStreamId: 'live_refund_target',
        liveTitle: 'Transação para Estorno',
        priceCredits: 20,
        idempotencyKey: idemp,
      });

      const spendEntry = res.entries.find((e) => e.operationType === 'CONTENT_UNLOCK');
      if (!spendEntry) throw new Error('Entrada original de desbloqueio não encontrada.');

      // 2. Executar estorno compensatório
      const refundRes = await financialLedger.processRefund({
        originalEntryId: spendEntry.id,
        reason: 'Teste de auditoria de estorno compensatório',
        adminId: 'admin_audit_s7',
        idempotencyKey: `idemp_ref_s7_${Date.now()}`,
      });

      if (!refundRes.success || !refundRes.compensatoryEntry) {
        throw new Error('Falha ao processar lançamento de estorno.');
      }

      const audit = financialLedger.getLiveUnlockAuditData({ period: 'all' });
      const refundedTx = audit.transactions.find((t) => t.entries.some((e) => e.id === spendEntry.id));

      if (!refundedTx || !refundedTx.isRefunded) {
        throw new Error('Transação estornada não foi marcada com status refunded na auditoria.');
      }

      return `Transação estornada com sucesso. Entrada compensatória: ${refundRes.compensatoryEntry.id}.`;
    }
  );

  // ========================================================================
  // CENÁRIO 8: Proteção estrita contra replay por idempotência
  // ========================================================================
  await runScenario(
    8,
    'SCENARIO_08_IDEMPOTENCY_REPLAY_PROTECTION',
    'Proteção estrita contra replay por idempotência',
    async () => {
      const fixedIdemp = `idemp_fixed_replay_${Date.now()}`;
      const firstCall = await financialLedger.unlockLiveStream({
        userId: 'current_user',
        creatorId: 'camila',
        creatorName: 'Camila Duarte',
        liveStreamId: 'live_replay_check',
        liveTitle: 'Teste Replay Idempotência',
        priceCredits: 40,
        idempotencyKey: fixedIdemp,
      });

      if (firstCall.isReplay) {
        throw new Error('Primeira chamada marcada incorretamente como replay.');
      }

      const balanceAfterFirst = financialLedger.getUserCredits('current_user');

      // Segunda chamada com a mesma chave (deve ser replay idêntico sem novo débito)
      const secondCall = await financialLedger.unlockLiveStream({
        userId: 'current_user',
        creatorId: 'camila',
        creatorName: 'Camila Duarte',
        liveStreamId: 'live_replay_check',
        liveTitle: 'Teste Replay Idempotência',
        priceCredits: 40,
        idempotencyKey: fixedIdemp,
      });

      if (!secondCall.isReplay) {
        throw new Error('Segunda chamada com mesma idempotência não foi identificada como replay.');
      }

      const balanceAfterSecond = financialLedger.getUserCredits('current_user');
      if (balanceAfterSecond !== balanceAfterFirst) {
        throw new Error('Saldo foi debitado novamente na repetição da chave de idempotência.');
      }

      return 'Idempotência garantida: reenvio retornou isReplay=true com saldo inalterado.';
    }
  );

  // ========================================================================
  // CENÁRIO 9: Notificação reativa em tempo real com subscrição no ledger
  // ========================================================================
  await runScenario(
    9,
    'SCENARIO_09_REALTIME_SUBSCRIPTION',
    'Notificação reativa em tempo real com subscrição no ledger',
    async () => {
      let notified = false;
      const unsubscribe = financialLedger.subscribe(() => {
        notified = true;
      });

      // Postar uma operação no ledger para disparar notificação
      await financialLedger.postEntry({
        idempotencyKey: `idemp_realtime_ping_${Date.now()}`,
        operationType: 'ADMIN_ADJUSTMENT',
        debitAccount: 'PLATFORM_RESERVE_POOL:credits',
        creditAccount: 'ESCROW_CONTENT_POOL:credits',
        amount: 1,
        currency: 'CREDITS',
        actorId: 'test_realtime',
        description: 'Ping em tempo real',
      });

      unsubscribe();

      if (!notified) {
        throw new Error('Listener de subscrição não foi disparado ao commitar nova entrada.');
      }

      return 'Subscrição em tempo real acionada imediatamente ao postar entrada no livro-razão.';
    }
  );

  // ========================================================================
  // CENÁRIO 10: Desmontagem limpa de subscrição sem vazamento de memória
  // ========================================================================
  await runScenario(
    10,
    'SCENARIO_10_CLEAN_UNMOUNT_NO_LEAK',
    'Desmontagem limpa de subscrição sem vazamento de memória',
    async () => {
      let callCount = 0;
      const unsubscribe = financialLedger.subscribe(() => {
        callCount++;
      });

      // Cancelar imediatamente (simulando useEffect unmount)
      unsubscribe();

      // Postar lançamento
      await financialLedger.postEntry({
        idempotencyKey: `idemp_unmount_ping_${Date.now()}`,
        operationType: 'ADMIN_ADJUSTMENT',
        debitAccount: 'PLATFORM_RESERVE_POOL:credits',
        creditAccount: 'ESCROW_CONTENT_POOL:credits',
        amount: 1,
        currency: 'CREDITS',
        actorId: 'test_unmount',
        description: 'Teste pós cancelamento de subscrição',
      });

      if (callCount > 0) {
        throw new Error('Listener continuou sendo executado após chamar unsubscribe (Memory Leak).');
      }

      return 'Desinscrição verificada: callback foi removido do Set de ouvintes com sucesso.';
    }
  );

  // ========================================================================
  // CENÁRIO 11: Filtros multicritério (período, liveId, criador, status)
  // ========================================================================
  await runScenario(
    11,
    'SCENARIO_11_MULTICRITERIA_FILTERING',
    'Filtros multicritério (período, liveId, criador, status e busca)',
    async () => {
      const allAudit = financialLedger.getLiveUnlockAuditData({ period: 'all' });
      const valentinaAudit = financialLedger.getLiveUnlockAuditData({
        period: 'all',
        search: 'valentina',
      });

      for (const tx of valentinaAudit.transactions) {
        const matches =
          tx.creatorId.toLowerCase().includes('valentina') ||
          tx.creatorName.toLowerCase().includes('valentina') ||
          (tx.liveStreamId && tx.liveStreamId.includes('valentina'));
        if (!matches) {
          throw new Error(`Resultado do filtro não contém o termo buscado "valentina": ${tx.transactionId}`);
        }
      }

      return `Filtro por "valentina" isolou ${valentinaAudit.transactions.length} registros de ${allAudit.totalCount} no total.`;
    }
  );

  // ========================================================================
  // CENÁRIO 12: Sanitização de campos na exportação CSV contra Formula Injection
  // ========================================================================
  await runScenario(
    12,
    'SCENARIO_12_CSV_FORMULA_INJECTION_PROTECTION',
    'Sanitização de campos na exportação CSV contra Formula Injection',
    async () => {
      // Testar caracteres perigosos no início: =, +, -, @, \t, \r
      const dangerousInputs = [
        '=cmd|"/C calc"!A0',
        '+2+5',
        '-5+2',
        '@SUM(1,1)',
        '\t123',
        '\r456',
      ];

      for (const inp of dangerousInputs) {
        const sanitized = sanitizeCsvField(inp);
        if (!sanitized.startsWith("'")) {
          throw new Error(`Campo perigoso "${inp}" não foi protegido com apóstrofo: "${sanitized}"`);
        }
      }

      // Testar campo seguro
      const safe = sanitizeCsvField('Valentina Rossi');
      if (safe !== 'Valentina Rossi') {
        throw new Error(`Campo seguro foi corrompido: "${safe}"`);
      }

      // Testar mascaramento
      const maskedUser = maskUserId('user_marcos_sp');
      if (maskedUser.includes('marcos_sp')) {
        throw new Error(`Mascaramento de usuário incompleto: ${maskedUser}`);
      }

      const maskedKey = maskIdempotencyKey('idemp_seed_unlock_val_01_spend');
      if (maskedKey.length > 25) {
        throw new Error(`Chave de idempotência não foi compactada: ${maskedKey}`);
      }

      return 'Proteção CSV completa: caracteres =,+,-,@,\t,\r escapados com apóstrofo e dados sensíveis mascarados.';
    }
  );

  const durationMs = Date.now() - startTime;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    durationMs,
    timestamp: new Date().toISOString(),
    results,
  };
}
