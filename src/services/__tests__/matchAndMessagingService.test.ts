import { matchAndMessagingService } from '../matchAndMessagingService';

export interface MatchMessagingTestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export interface MatchMessagingTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  executionDurationMs: number;
  results: MatchMessagingTestResult[];
}

export async function runMatchAndMessagingTestSuite(): Promise<MatchMessagingTestSuiteSummary> {
  const start = performance.now();
  const results: MatchMessagingTestResult[] = [];

  const runTest = (num: number, name: string, fn: () => boolean | void) => {
    const t0 = performance.now();
    try {
      const res = fn();
      const passed = res !== false;
      results.push({
        testNumber: num,
        name,
        passed,
        durationMs: Math.round(performance.now() - t0),
      });
    } catch (err: any) {
      results.push({
        testNumber: num,
        name,
        passed: false,
        message: err?.message || String(err),
        durationMs: Math.round(performance.now() - t0),
      });
    }
  };

  // Setup: IDs únicos para este teste
  const userAlpha = `user_alpha_${Date.now()}`;
  const userBeta = `user_beta_${Date.now()}`;
  const userGamma = `user_gamma_${Date.now()}`;

  // Teste 1: Curtida unilateral não forma match automático
  runTest(1, 'Curtida unilateral não forma match falso (Consentimento Unilateral)', () => {
    const res = matchAndMessagingService.recordLike(userAlpha, userBeta, 'standard');
    if (res.isMatch !== false) throw new Error('Curtida unilateral não deve gerar match.');
    if (matchAndMessagingService.isMutualMatch(userAlpha, userBeta) !== false) {
      throw new Error('isMutualMatch deve retornar false para curtida unilateral.');
    }
  });

  // Teste 2: Curtida recíproca forma Match Mútuo autêntico
  runTest(2, 'Curtida recíproca forma Match Mútuo legítimo (Consentimento Bilateral)', () => {
    // userBeta curte userAlpha de volta
    const res = matchAndMessagingService.recordLike(userBeta, userAlpha, 'standard');
    if (res.isMatch !== true) throw new Error('Curtida recíproca deve resultar em match.');
    if (!res.match) throw new Error('Objeto de match deve ser retornado.');
    if (matchAndMessagingService.isMutualMatch(userAlpha, userBeta) !== true) {
      throw new Error('isMutualMatch deve retornar true após curtida recíproca.');
    }
  });

  // Teste 3: Proteção contra duplicação de likes (Idempotência)
  runTest(3, 'Idempotência em curtidas repetidas', () => {
    const dupRes = matchAndMessagingService.recordLike(userAlpha, userBeta, 'standard');
    if (dupRes.isDuplicate !== true) {
      throw new Error('Segunda tentativa de curtir deve indicar isDuplicate: true.');
    }
  });

  // Teste 4: Identificador canônico ordenado de conversa
  runTest(4, 'Identificador de conversa ordenado simetricamente (A, B) == (B, A)', () => {
    const conv1 = matchAndMessagingService.getConversationId('user_abc', 'user_xyz');
    const conv2 = matchAndMessagingService.getConversationId('user_xyz', 'user_abc');
    if (conv1 !== conv2) throw new Error(`Identificadores divergentes: ${conv1} vs ${conv2}`);
    if (conv1 !== 'conv_user_abc__user_xyz') throw new Error(`Formato canônico incorreto: ${conv1}`);
  });

  // Teste 5: Envio de mensagem persistente de Alpha para Beta
  runTest(5, 'Envio de mensagem persistente entre duas contas reais', () => {
    const msg = matchAndMessagingService.sendMessage(
      userAlpha,
      userBeta,
      'Olá Beta! Nosso match mútuo é 100% autêntico.'
    );
    if (!msg.id) throw new Error('Mensagem deve ter ID.');
    if (msg.senderId !== userAlpha) throw new Error('senderId incorreto.');
    if (msg.recipientId !== userBeta) throw new Error('recipientId incorreto.');

    const msgsForAlpha = matchAndMessagingService.getMessages(userAlpha, userBeta);
    const msgsForBeta = matchAndMessagingService.getMessages(userBeta, userAlpha);

    if (msgsForAlpha.length !== 1 || msgsForBeta.length !== 1) {
      throw new Error('A mensagem deve estar disponível em ambas as consultas de par.');
    }
    if (msgsForAlpha[0].text !== 'Olá Beta! Nosso match mútuo é 100% autêntico.') {
      throw new Error('Conteúdo da mensagem corrompido.');
    }
  });

  // Teste 6: Resposta real de Beta para Alpha (Diálogo bidirecional sem bots)
  runTest(6, 'Diálogo bidirecional real entre duas contas (sem robôs fictícios)', () => {
    matchAndMessagingService.sendMessage(
      userBeta,
      userAlpha,
      'Oi Alpha! Recebi sua mensagem com sucesso.'
    );

    const dialog = matchAndMessagingService.getMessages(userAlpha, userBeta);
    if (dialog.length !== 2) throw new Error(`Esperado 2 mensagens, encontrado ${dialog.length}`);
    if (dialog[0].senderId !== userAlpha || dialog[1].senderId !== userBeta) {
      throw new Error('Ordem cronológica ou remetentes incorretos no diálogo.');
    }
  });

  // Teste 7: Compartilhamento de fotografia autorizada
  runTest(7, 'Envio de fotografia autorizada com mediaUrl preservada', () => {
    const photoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const photoMsg = matchAndMessagingService.sendMessage(
      userAlpha,
      userBeta,
      '📷 [Fotografia privada compartilhada]',
      photoDataUrl
    );
    if (!photoMsg.mediaUrl) throw new Error('mediaUrl ausente na mensagem de mídia.');

    const msgs = matchAndMessagingService.getMessages(userAlpha, userBeta);
    const last = msgs[msgs.length - 1];
    if (last.mediaUrl !== photoDataUrl) throw new Error('Fotografia não preservada na conversa.');
  });

  // Teste 8: Leitura de mensagens atualiza status para 'read'
  runTest(8, 'Confirmação de leitura (markMessagesAsRead) atualiza status', () => {
    matchAndMessagingService.markMessagesAsRead(userAlpha, userBeta, userBeta);
    const msgs = matchAndMessagingService.getMessages(userAlpha, userBeta);
    const receivedByBeta = msgs.filter((m) => m.recipientId === userBeta);
    for (const m of receivedByBeta) {
      if (m.status !== 'read') throw new Error(`Mensagem ${m.id} deveria estar com status 'read'.`);
    }
  });

  // Teste 9: Consulta de curtidas pendentes recebidas
  runTest(9, 'Consulta de curtidas pendentes recebidas (Quem curtiu você)', () => {
    // userGamma curte userAlpha unilateralmente
    matchAndMessagingService.recordLike(userGamma, userAlpha, 'standard');
    const pendings = matchAndMessagingService.getPendingLikesReceived(userAlpha);
    const found = pendings.find((p) => p.fromUserId === userGamma);
    if (!found) throw new Error('userGamma deveria aparecer nas curtidas pendentes recebidas por userAlpha.');
  });

  const duration = Math.round(performance.now() - start);
  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    executionDurationMs: duration,
    results,
  };
}
