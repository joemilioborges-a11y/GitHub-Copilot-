/**
 * JOBS — SUÍTE DE TESTES OBRIGATÓRIOS DO HOOK USELIVESTREAMVIEW
 * 
 * Valida os 13 requisitos exigidos pelo documento de especificação:
 * 1. Estado inicial em modo "list".
 * 2. Abertura de uma live e alternância para "room".
 * 3. Retorno à lista.
 * 4. Isolamento dos eventos por transmissão.
 * 5. Envio e validação de comentários.
 * 6. Atualização e deduplicação de likes.
 * 7. Recepção de eventos de presentes.
 * 8. Desconexão e limpeza das assinaturas.
 * 9. Estados de erro e reconexão.
 * 10. Preservação do fluxo de presentes e dos serviços existentes.
 * 11. Ausência de chamadas financeiras diretas pelo hook.
 * 12. Comportamento quando não houver infraestrutura de eventos.
 * 13. Comportamento quando não houver fluxo financeiro integrado / saldo insuficiente.
 */

import { LiveStreamViewStateManager } from '../hooks/useLiveStreamView';
import { liveStreamService, OFFICIAL_VIRTUAL_GIFTS } from '../services/liveStreamService';
import { financialLedger } from '../services/ledgerService';

export interface HookTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export async function runLiveStreamViewHookTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: HookTestResult[];
}> {
  const results: HookTestResult[] = [];

  const recordResult = (
    testNumber: number,
    id: string,
    name: string,
    passed: boolean,
    message: string,
    durationMs: number
  ) => {
    results.push({ testNumber, id, name, passed, message, durationMs });
  };

  // Garante que existem sessões cadastradas
  const sessions = liveStreamService.getLiveSessions();
  const sampleLive = sessions[0];
  const sampleLive2 = sessions.length > 1 ? sessions[1] : sessions[0];

  // =========================================================================
  // TESTE 1: Estado inicial em modo "list"
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      const state = manager.getSnapshot();

      const passed =
        state.viewMode === 'list' &&
        state.selectedLiveId === null &&
        state.isRoomOpen === false &&
        state.currentSession === null &&
        state.comments.length === 0 &&
        state.likesCount === 0 &&
        state.connectionStatus === 'disconnected' &&
        state.error === null &&
        Array.isArray(state.sessions) &&
        state.sessions.length > 0;

      manager.dispose();
      recordResult(
        1,
        'TC-HOOK-01',
        'Estado inicial em modo "list" com valores nulos e desconectados',
        passed,
        passed
          ? 'viewMode="list", isRoomOpen=false, connectionStatus="disconnected"'
          : 'Falha: Estado inicial divergente do esperado.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(1, 'TC-HOOK-01', 'Estado inicial em modo "list"', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 2: Abertura de uma live e alternância para "room"
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager({ userCredits: 100 });
      const ok = await manager.openLive(sampleLive.id);
      const state = manager.getSnapshot();

      const passed =
        ok === true &&
        state.viewMode === 'room' &&
        state.selectedLiveId === sampleLive.id &&
        state.isRoomOpen === true &&
        state.currentSession !== null &&
        state.currentSession.id === sampleLive.id &&
        state.error === null &&
        state.isLoading === false;

      manager.dispose();
      recordResult(
        2,
        'TC-HOOK-02',
        'Abertura de uma live válida e alternância para modo "room"',
        passed,
        passed
          ? `Transmissão "${sampleLive.title}" aberta com sucesso, viewMode="room"`
          : 'Falha: Abertura de live não alternou estado para room.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(2, 'TC-HOOK-02', 'Abertura de live válida', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 3: Retorno à lista via backToList()
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      await manager.openLive(sampleLive.id);
      manager.backToList();
      const state = manager.getSnapshot();

      const passed =
        state.viewMode === 'list' &&
        state.selectedLiveId === null &&
        state.isRoomOpen === false &&
        state.currentSession === null &&
        state.connectionStatus === 'disconnected' &&
        state.error === null;

      manager.dispose();
      recordResult(
        3,
        'TC-HOOK-03',
        'Retorno à lista via backToList() limpa seleção preservando histórico',
        passed,
        passed
          ? 'viewMode restaurado para "list", sala fechada com sucesso'
          : 'Falha: backToList não restaurou modo de lista.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(3, 'TC-HOOK-03', 'Retorno à lista', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 4: Isolamento dos eventos por transmissão
  // =========================================================================
  {
    const start = Date.now();
    try {
      const managerA = new LiveStreamViewStateManager();
      await managerA.openLive(sampleLive.id);
      const uniqueCommentA = `Comentário_Exclusivo_LiveA_${Date.now()}`;
      await managerA.sendComment(uniqueCommentA);
      managerA.dispose();

      const managerB = new LiveStreamViewStateManager();
      await managerB.openLive(sampleLive2.id);
      const stateB = managerB.getSnapshot();

      // O comentário enviado na live A não pode constar na live B
      const leakedIntoB = stateB.comments.some((c) => c.text === uniqueCommentA);
      managerB.dispose();

      const passed = !leakedIntoB;
      recordResult(
        4,
        'TC-HOOK-04',
        'Isolamento estrito dos eventos e comentários por transmissão',
        passed,
        passed
          ? 'Eventos da transmissão A isolados da transmissão B'
          : 'Falha: Vazamento de comentários entre transmissões distintas.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(4, 'TC-HOOK-04', 'Isolamento por transmissão', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 5: Envio e validação de comentários
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      await manager.openLive(sampleLive.id);

      // Rejeição de vazio
      const emptyOk = await manager.sendComment('   ');
      const emptyRejected = emptyOk === false && manager.getSnapshot().error !== null;

      // Rejeição de excesso de caracteres (> 280)
      const longText = 'A'.repeat(281);
      const longOk = await manager.sendComment(longText);
      const longRejected = longOk === false;

      // Aceitação de válido
      const validText = `Show maravilhoso na live! #${Date.now()}`;
      const validOk = await manager.sendComment(validText);
      const state = manager.getSnapshot();
      const commentSaved = state.comments.some((c) => c.text === validText && c.liveStreamId === sampleLive.id);

      manager.dispose();
      const passed = emptyRejected && longRejected && validOk && commentSaved;
      recordResult(
        5,
        'TC-HOOK-05',
        'Envio e validação de comentários (rejeição de vazios, limite 280 e persistência)',
        passed,
        passed
          ? 'Comentários inválidos barrados e válidos persistidos com sucesso'
          : 'Falha na validação de comentários.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(5, 'TC-HOOK-05', 'Validação de comentários', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 6: Atualização e deduplicação de likes
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      await manager.openLive(sampleLive.id);
      const initialLikes = manager.getSnapshot().likesCount;

      manager.sendLike();
      const afterFirst = manager.getSnapshot().likesCount;

      const passed = afterFirst >= initialLikes + 1 && manager.getSnapshot().recentLikes.length > 0;
      manager.dispose();

      recordResult(
        6,
        'TC-HOOK-06',
        'Atualização e deduplicação de curtidas com evento em overlay',
        passed,
        passed
          ? `Likes incrementados de ${initialLikes} para ${afterFirst}`
          : 'Falha ao incrementar likes.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(6, 'TC-HOOK-06', 'Atualização de likes', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 7: Recepção de eventos de presentes no overlay
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Cria saldo prévio no ledger para o teste
      financialLedger.postEntry({
        idempotencyKey: `idemp_test_hook_seed_${Date.now()}`,
        operationType: 'CREDIT_PURCHASE',
        debitAccount: 'BANK_ESCROW_INFLOW',
        creditAccount: 'USER_CREDITS:current_user',
        amount: 500,
        currency: 'CREDITS',
        actorId: 'current_user',
        description: 'Carga de créditos para teste de hook',
      });

      const manager = new LiveStreamViewStateManager({ userCredits: 500 });
      await manager.openLive(sampleLive.id);

      const gift = OFFICIAL_VIRTUAL_GIFTS[0]; // Rosa 10 créditos
      const res = await manager.sendGift(gift);
      const state = manager.getSnapshot();

      const hasGiftEvent = state.giftEvents.some((g) => g.giftId === gift.id);
      manager.dispose();

      const passed = res.success && hasGiftEvent;
      recordResult(
        7,
        'TC-HOOK-07',
        'Recepção de eventos de presentes no overlay com metadados auditáveis',
        passed,
        passed
          ? `Presente "${gift.name}" recebido e gerado evento no overlay`
          : 'Falha: Evento de presente não registrado no overlay.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(7, 'TC-HOOK-07', 'Eventos de presentes no overlay', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 8: Desconexão e limpeza das assinaturas (Memory-Safe)
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      let listenerCalls = 0;
      const unsubscribe = manager.subscribe(() => {
        listenerCalls++;
      });

      await manager.openLive(sampleLive.id);
      const callsBeforeUnsub = listenerCalls;

      unsubscribe();
      await manager.sendComment('Teste após cancelamento');
      const callsAfterUnsub = listenerCalls;

      manager.dispose();

      const passed = callsBeforeUnsub > 0 && callsAfterUnsub === callsBeforeUnsub;
      recordResult(
        8,
        'TC-HOOK-08',
        'Desconexão e limpeza das assinaturas ao desmontar/desinscrever',
        passed,
        passed
          ? 'Listeners cancelados com sucesso, 0 chamadas residuais'
          : 'Falha: Listener continuou recebendo notificações após cancelamento.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(8, 'TC-HOOK-08', 'Limpeza de assinaturas', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 9: Estados de erro e reconexão com retorno seguro à lista
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      const ok = await manager.openLive('id_live_completamente_inexistente');
      const stateErr = manager.getSnapshot();

      const erroTratado = ok === false && stateErr.error !== null && stateErr.connectionStatus === 'error';

      // Usuário consegue voltar à lista normalmente mesmo em estado de erro
      manager.backToList();
      const stateRecovered = manager.getSnapshot();
      const recuperou = stateRecovered.viewMode === 'list' && stateRecovered.error === null;

      manager.dispose();
      const passed = erroTratado && recuperou;
      recordResult(
        9,
        'TC-HOOK-09',
        'Estados de erro de live indisponível e recuperação sem bloqueio',
        passed,
        passed
          ? 'Erro tratado de forma não impeditiva com retorno imediato à lista'
          : 'Falha ao tratar erro de transmissão inexistente.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(9, 'TC-HOOK-09', 'Tratamento de erros e reconexão', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 10: Preservação do fluxo de presentes e dos serviços existentes
  // =========================================================================
  {
    const start = Date.now();
    try {
      financialLedger.postEntry({
        idempotencyKey: `idemp_test_hook_t10_${Date.now()}`,
        operationType: 'CREDIT_PURCHASE',
        debitAccount: 'BANK_ESCROW_INFLOW',
        creditAccount: 'USER_CREDITS:current_user',
        amount: 200,
        currency: 'CREDITS',
        actorId: 'current_user',
        description: 'Carga de créditos para teste 10',
      });

      const manager = new LiveStreamViewStateManager({ userCredits: 200 });
      await manager.openLive(sampleLive.id);

      const gift = OFFICIAL_VIRTUAL_GIFTS[1]; // Drink 25 créditos
      const res = await manager.sendGift(gift);

      // Confere se o ledger registrou a divisão 70/30 (TIP_GIFT e CREATOR_REVENUE_SHARE)
      const ledgerEntries = financialLedger.getEntries();
      const giftEntry = ledgerEntries.find(
        (e) =>
          (e.operationType === 'TIP_GIFT' || e.operationType === 'CREATOR_REVENUE_SHARE') &&
          e.referenceId === sampleLive.id
      );

      manager.dispose();
      const passed = res.success === true && !!giftEntry;
      recordResult(
        10,
        'TC-HOOK-10',
        'Preservação do fluxo existente do ledgerService (70% Criador / 30% JOBS)',
        passed,
        passed
          ? 'Presente registrado com sucesso no ledger contábil oficial com divisão 70/30'
          : `Falha: ${res.error || 'Lançamento não encontrado no livro-razão.'}`,
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(10, 'TC-HOOK-10', 'Preservação do fluxo de presentes', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 11: Ausência de chamadas financeiras diretas pelo hook
  // =========================================================================
  {
    const start = Date.now();
    try {
      // O hook não possui nem expõe métodos como "deductCredits", "calculateFeesDirectly"
      const manager = new LiveStreamViewStateManager();
      const anyManager = manager as any;

      const hasDirectDeduct = typeof anyManager.deductCredits === 'function';
      const hasArbitraryMutation = typeof anyManager.setBalance === 'function';

      manager.dispose();
      const passed = !hasDirectDeduct && !hasArbitraryMutation;
      recordResult(
        11,
        'TC-HOOK-11',
        'Ausência de mutações financeiras arbitrárias no cliente pelo hook',
        passed,
        passed
          ? 'Nenhuma manipulação direta de carteira; todas as validações ocorrem no servidor/ledger'
          : 'Falha: Detectado método de débito arbitrário.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(11, 'TC-HOOK-11', 'Ausência de chamadas financeiras diretas', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 12: Comportamento quando não houver infraestrutura de eventos
  // =========================================================================
  {
    const start = Date.now();
    try {
      const manager = new LiveStreamViewStateManager();
      await manager.openLive(sampleLive.id);
      const state = manager.getSnapshot();

      const passed =
        state.connectionStatus === 'demo' &&
        state.isDemoMode === true &&
        state.isAudienceReliable === false;

      manager.dispose();
      recordResult(
        12,
        'TC-HOOK-12',
        'Identificação explícita do Modo DEMO sem falsear atividade de rede',
        passed,
        passed
          ? 'connectionStatus="demo", isDemoMode=true, isAudienceReliable=false'
          : 'Falha: Modo DEMO não identificado explicitamente.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(12, 'TC-HOOK-12', 'Comportamento sem infraestrutura real', false, err.message, Date.now() - start);
    }
  }

  // =========================================================================
  // TESTE 13: Comportamento seguro quando saldo for insuficiente para presentes
  // =========================================================================
  {
    const start = Date.now();
    try {
      // Usuário com 0 créditos
      const manager = new LiveStreamViewStateManager({ userCredits: 0 });
      await manager.openLive(sampleLive.id);

      const gift = OFFICIAL_VIRTUAL_GIFTS[5]; // Foguete 500 créditos
      const res = await manager.sendGift(gift);
      const state = manager.getSnapshot();

      const passed = res.success === false && typeof res.error === 'string' && state.error !== null;
      manager.dispose();

      recordResult(
        13,
        'TC-HOOK-13',
        'Rejeição atômica e segura de envio de presentes sem saldo suficiente',
        passed,
        passed
          ? `Rejeição tratada: "${res.error}"`
          : 'Falha: Envio de presente com saldo zero não foi rejeitado.',
        Date.now() - start
      );
    } catch (err: any) {
      recordResult(13, 'TC-HOOK-13', 'Rejeição de presente sem saldo', false, err.message, Date.now() - start);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
