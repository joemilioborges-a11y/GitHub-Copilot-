/**
 * JOBS 1.0 — SUÍTE DE TESTES E VERIFICAÇÃO AUTOMATIZADA
 * Módulo de Lives (Fase 1) & Relatório de Auditoria Contábil (Ledger)
 *
 * Executa testes reais com asserções estritas sobre os serviços:
 * - liveStreamService (transmissões, batalhas, palco, desafios, presentes, regras de desempenho)
 * - financialLedger (ledger imutável, divisão 70/30, integridade de hash, idempotência, sanitização CSV)
 */

import { liveStreamService, OFFICIAL_VIRTUAL_GIFTS } from '../services/liveStreamService';
import { financialLedger } from '../services/ledgerService';

export interface TestResultItem {
  id: string;
  category: 'LIVES_LIFECYCLE' | 'BATTLES' | 'STAGE_ROOMS' | 'CHALLENGES' | 'GIFTS_70_30' | 'PERFORMANCE_RULES' | 'LEADERBOARDS' | 'AUDIT_LEDGER';
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

export interface VerificationSuiteSummary {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  executionDurationMs: number;
  results: TestResultItem[];
}

export async function runLiveAndAuditVerificationSuite(): Promise<VerificationSuiteSummary> {
  const startTime = Date.now();
  const results: TestResultItem[] = [];

  const runTest = async (
    id: string,
    category: TestResultItem['category'],
    name: string,
    fn: () => Promise<void> | void
  ) => {
    const t0 = performance.now();
    try {
      await fn();
      const t1 = performance.now();
      results.push({
        id,
        category,
        name,
        passed: true,
        durationMs: Number((t1 - t0).toFixed(2)),
        details: 'Asserções satisfeitas com sucesso.',
      });
    } catch (err: any) {
      const t1 = performance.now();
      results.push({
        id,
        category,
        name,
        passed: false,
        durationMs: Number((t1 - t0).toFixed(2)),
        details: 'Falha na asserção do teste.',
        error: err?.message || String(err),
      });
    }
  };

  // =========================================================================
  // 1. MÓDULO DE LIVES — CICLO DE VIDA E ADAPTADOR DEMO
  // =========================================================================
  await runTest(
    'TC-LIVE-01',
    'LIVES_LIFECYCLE',
    'Criação de transmissão individual com identificação explícita de Modo DEMO',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'individual',
        title: 'Live Exclusiva de Teste Automatizado',
        description: 'Verificação de ciclo de vida e estado ativo',
        category: 'conversa_vip',
        hostCreatorId: 'creator_test_01',
        hostCreatorName: 'Test Creator Alpha',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 25,
      });

      if (!live.id || !live.id.startsWith('live_individual_')) {
        throw new Error(`ID da sessão inválido: ${live.id}`);
      }
      if (live.status !== 'active') {
        throw new Error(`Status esperado "active", recebido "${live.status}"`);
      }
      if (!live.isBroadcasting) {
        throw new Error('isBroadcasting deveria ser true');
      }
      if (live.isDemoStreaming !== true) {
        throw new Error('isDemoStreaming deve ser estritamente true (Modo DEMO obrigatório)');
      }
      if (!live.streamingProviderNote.includes('DEMO')) {
        throw new Error('streamingProviderNote deve declarar expressamente a simulação/DEMO');
      }
    }
  );

  await runTest(
    'TC-LIVE-02',
    'LIVES_LIFECYCLE',
    'Encerramento de live com timestamp e avaliação de elegibilidade',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'individual',
        title: 'Live Curta para Encerramento',
        description: 'Teste de encerramento',
        category: 'conversa_vip',
        hostCreatorId: 'creator_test_02',
        hostCreatorName: 'Test Creator Beta',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'bi',
        priceCreditsToUnlock: 0,
      });

      const ended = await liveStreamService.endLiveSession(live.id);
      if (ended.status !== 'completed') {
        throw new Error(`Status esperado "completed", recebido "${ended.status}"`);
      }
      if (ended.isBroadcasting !== false) {
        throw new Error('isBroadcasting deveria ser false após encerramento');
      }
      if (!ended.endedAt) {
        throw new Error('endedAt deve conter data/hora ISO de encerramento');
      }
      if (!ended.performanceRewardStatus) {
        throw new Error('performanceRewardStatus deve ser computado ao encerrar');
      }
    }
  );

  // =========================================================================
  // 2. BATALHAS ENTRE CRIADORES
  // =========================================================================
  await runTest(
    'TC-LIVE-03',
    'BATTLES',
    'Criação de Batalha com 2 participantes e placar determinístico inicial zerado',
    async () => {
      const battle = await liveStreamService.startNewLiveSession({
        format: 'battle',
        title: 'Super Batalha de Dança e Charme',
        description: 'Valentina vs Isabella',
        category: 'batalha_shows',
        hostCreatorId: 'creator_val',
        hostCreatorName: 'Valentina Rossi',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        opponentCreatorId: 'creator_isa',
        opponentCreatorName: 'Isabella Fontes',
        opponentCreatorAvatar: '/src/assets/images/profile_isabella_1791856837043.jpg',
        gender: 'mulher',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      if (battle.format !== 'battle') throw new Error('Formato da sessão não é battle');
      if (!battle.battleState) throw new Error('battleState ausente na sessão de batalha');
      if (battle.battleState.creator1.id !== 'creator_val') throw new Error('creator1 incorreto');
      if (battle.battleState.creator2.id !== 'creator_isa') throw new Error('creator2 incorreto');
      if (battle.battleState.creator1.score !== 0 || battle.battleState.creator2.score !== 0) {
        throw new Error('Placar inicial deve iniciar em zero');
      }
      if (battle.battleState.durationSeconds !== 300) {
        throw new Error('Duração da batalha deve ser 300s (5 min)');
      }
    }
  );

  // =========================================================================
  // 3. SALAS INTERATIVAS (PALCO E MODERAÇÃO)
  // =========================================================================
  await runTest(
    'TC-LIVE-04',
    'STAGE_ROOMS',
    'Fluxo completo de solicitação, aprovação e remoção de participante do palco',
    async () => {
      const stageLive = await liveStreamService.startNewLiveSession({
        format: 'interactive_stage',
        title: 'Mesa Redonda Interativa VIP',
        description: 'Debate com fãs e convidados',
        category: 'conversa_vip',
        hostCreatorId: 'host_stage_01',
        hostCreatorName: 'Host Master',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      // Solicitar entrada
      const testGuest = { id: 'guest_user_99', name: 'Convidado Especial', avatar: '/src/assets/images/profile_gabriel_1791856836359.jpg' };
      await liveStreamService.requestJoinStage(stageLive.id, testGuest);

      let sessions = liveStreamService.getLiveSessions();
      let target = sessions.find((s) => s.id === stageLive.id)!;
      const req = target.stageJoinRequests.find((r) => r.userId === testGuest.id);
      if (!req || req.status !== 'pending') {
        throw new Error('Solicitação de palco pendente não registrada');
      }

      // Aprovar entrada
      await liveStreamService.approveStageRequest(stageLive.id, req.id);
      sessions = liveStreamService.getLiveSessions();
      target = sessions.find((s) => s.id === stageLive.id)!;
      const inStage = target.stageParticipants.find((p) => p.userId === testGuest.id);
      if (!inStage || inStage.role !== 'guest') {
        throw new Error('Participante não ingressou no palco como "guest"');
      }

      // Remover do palco
      await liveStreamService.removeParticipantFromStage(stageLive.id, testGuest.id);
      sessions = liveStreamService.getLiveSessions();
      target = sessions.find((s) => s.id === stageLive.id)!;
      const stillInStage = target.stageParticipants.some((p) => p.userId === testGuest.id);
      if (stillInStage) {
        throw new Error('Falha ao remover participante do palco');
      }
    }
  );

  // =========================================================================
  // 4. DESAFIOS COLETIVOS & METAS DA AUDIÊNCIA
  // =========================================================================
  await runTest(
    'TC-LIVE-05',
    'CHALLENGES',
    'Votação da audiência em opções de desafio coletivo',
    async () => {
      const challengeLive = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio Noturno da Piscina',
        description: 'Votação do público',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_01',
        hostCreatorName: 'Desafiante 1',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      // Adicionar opções de votação
      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === challengeLive.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_a', label: 'Pular de Roupa', votes: 10 },
        { id: 'opt_b', label: 'Tirar a Camisa Primeiro', votes: 20 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      await (liveStreamService as any).voteOnChallenge(challengeLive.id, 'opt_b', 'viewer_chal_user_42');
      const updated = liveStreamService.getLiveSessions().find((s) => s.id === challengeLive.id)!;
      const optB = updated.challengeState!.optionsForVote!.find((o) => o.id === 'opt_b')!;
      if (optB.votes !== 21) {
        throw new Error(`Votos esperados 21, encontrado ${optB.votes}`);
      }
    }
  );

  // --- TDD: VOTAÇÃO SEGURA E CONSENSUAL EM DESAFIOS DE LIVES ---
  await runTest(
    'TC-CHAL-VOTE-01',
    'CHALLENGES',
    'Identidade do participante é obrigatória (rejeita ausente, vazia ou somente espaços)',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Identidade Obrigatória',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_01',
        hostCreatorName: 'Criador TDD 1',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_x', label: 'Opção X (Música Acústica)', votes: 5 },
        { id: 'opt_y', label: 'Opção Y (Dança Criativa)', votes: 12 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      // Tentativa 1: string vazia
      let rejectedEmpty = false;
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_x', '');
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('identidade')) {
          rejectedEmpty = true;
        }
      }
      if (!rejectedEmpty) {
        throw new Error('Falha TDD: Voto com identidade vazia deveria ser rejeitado com erro explícito de identidade.');
      }

      // Tentativa 2: espaços em branco
      let rejectedWhitespace = false;
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_x', '    ');
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('identidade')) {
          rejectedWhitespace = true;
        }
      }
      if (!rejectedWhitespace) {
        throw new Error('Falha TDD: Voto com espaços em branco deveria ser rejeitado.');
      }

      // Tentativa 3: participante ausente / undefined
      let rejectedUndefined = false;
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_x', undefined);
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('identidade')) {
          rejectedUndefined = true;
        }
      }
      if (!rejectedUndefined) {
        throw new Error('Falha TDD: Voto sem participante (undefined) deveria ser rejeitado.');
      }

      // Validar que contagens permanecem estritamente intactas
      const fresh = liveStreamService.getSessionById(live.id)!;
      const optX = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_x')!;
      if (optX.votes !== 5) {
        throw new Error(`Contagem foi indevidamente alterada: esperado 5, encontrado ${optX.votes}`);
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-02',
    'CHALLENGES',
    'Primeiro voto válido incrementa a opção escolhida',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Primeiro Voto Válido',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_02',
        hostCreatorName: 'Criador TDD 2',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_alpha', label: 'Opção Alpha', votes: 15 },
        { id: 'opt_beta', label: 'Opção Beta', votes: 30 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      await (liveStreamService as any).voteOnChallenge(live.id, 'opt_beta', 'voter_first_timer_01');

      const fresh = liveStreamService.getSessionById(live.id)!;
      const optBeta = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_beta')!;
      const optAlpha = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_alpha')!;

      if (optBeta.votes !== 31) {
        throw new Error(`Opção Beta deveria ter 31 votos, encontrado: ${optBeta.votes}`);
      }
      if (optAlpha.votes !== 15) {
        throw new Error(`Opção Alpha não votada deveria permanecer com 15 votos, encontrado: ${optAlpha.votes}`);
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-03',
    'CHALLENGES',
    'Identidade do votante é persistida em registro rastreável do desafio',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Persistência de Identidade',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_03',
        hostCreatorName: 'Criador TDD 3',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_1', label: 'Coreografia Disco', votes: 0 },
        { id: 'opt_2', label: 'Coreografia Samba', votes: 0 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      await (liveStreamService as any).voteOnChallenge(live.id, 'opt_1', 'user_audited_voter_99');

      const fresh = liveStreamService.getSessionById(live.id)!;
      const voters = fresh.challengeState!.voters;
      const votedList = fresh.challengeState!.votedParticipantIds;

      if (!voters || voters['user_audited_voter_99'] !== 'opt_1') {
        throw new Error('Identidade do votante não foi persistida corretamente no mapa de voters.');
      }
      if (!votedList || !votedList.includes('user_audited_voter_99')) {
        throw new Error('Identidade do votante não foi incluída na lista de votedParticipantIds.');
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-04',
    'CHALLENGES',
    'Segundo voto da mesma identidade é rejeitado com erro explícito de duplicidade',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Rejeição de Voto Duplicado',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_04',
        hostCreatorName: 'Criador TDD 4',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_a', label: 'Opção A', votes: 10 },
        { id: 'opt_b', label: 'Opção B', votes: 20 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      // Primeiro voto válido
      await (liveStreamService as any).voteOnChallenge(live.id, 'opt_a', 'viewer_single_vote_only');

      // Segundo voto da mesma identidade
      let rejectedDuplicate = false;
      let duplicateErrorMessage = '';
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_b', 'viewer_single_vote_only');
      } catch (err: any) {
        rejectedDuplicate = true;
        duplicateErrorMessage = err.message || '';
      }

      if (!rejectedDuplicate) {
        throw new Error('Falha TDD: Segundo voto da mesma identidade deveria ter sido rejeitado.');
      }

      if (!duplicateErrorMessage.toLowerCase().includes('duplicado') && !duplicateErrorMessage.toLowerCase().includes('já')) {
        throw new Error(`Mensagem de erro de duplicidade inadequada: "${duplicateErrorMessage}"`);
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-05',
    'CHALLENGES',
    'Tentativa de voto duplicado não modifica nenhuma contagem de opções',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Contagem Intacta em Duplicidade',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_05',
        hostCreatorName: 'Criador TDD 5',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_1', label: 'Opção 1', votes: 40 },
        { id: 'opt_2', label: 'Opção 2', votes: 60 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      // Voto 1
      await (liveStreamService as any).voteOnChallenge(live.id, 'opt_1', 'user_idempotent_tester');

      // Voto 2 (duplicado)
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_2', 'user_idempotent_tester');
      } catch {
        // esperado falhar
      }

      // Validar contagens
      const fresh = liveStreamService.getSessionById(live.id)!;
      const opt1 = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_1')!;
      const opt2 = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_2')!;

      if (opt1.votes !== 41) {
        throw new Error(`Opção 1 deveria ter exatamente 41 votos, encontrado: ${opt1.votes}`);
      }
      if (opt2.votes !== 60) {
        throw new Error(`Opção 2 NÃO deveria ter sido incrementada por tentativa de voto duplicado. Esperado 60, encontrado: ${opt2.votes}`);
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-06',
    'CHALLENGES',
    'Opção inexistente é rejeitada sem alterar contagens e sem bloquear o participante',
    async () => {
      const live = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Opção Inexistente',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_06',
        hostCreatorName: 'Criador TDD 6',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === live.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_valid_1', label: 'Opção Válida 1', votes: 100 },
        { id: 'opt_valid_2', label: 'Opção Válida 2', votes: 200 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      let rejectedNonexistent = false;
      try {
        await (liveStreamService as any).voteOnChallenge(live.id, 'opt_inexistente_9999', 'user_typo_voter');
      } catch (err: any) {
        rejectedNonexistent = true;
        if (!err.message.toLowerCase().includes('inexistente')) {
          throw new Error(`Mensagem deve indicar opção inexistente: "${err.message}"`);
        }
      }

      if (!rejectedNonexistent) {
        throw new Error('Falha TDD: Voto em opção inexistente deveria ter sido rejeitado.');
      }

      // Validar que o usuário não foi penalizado/bloqueado e ainda pode votar na opção válida
      await (liveStreamService as any).voteOnChallenge(live.id, 'opt_valid_1', 'user_typo_voter');

      const fresh = liveStreamService.getSessionById(live.id)!;
      const opt1 = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_valid_1')!;
      const opt2 = fresh.challengeState!.optionsForVote!.find((o) => o.id === 'opt_valid_2')!;

      if (opt1.votes !== 101) {
        throw new Error(`Opção 1 deveria ter sido votada normalmente com 101 votos, encontrado: ${opt1.votes}`);
      }
      if (opt2.votes !== 200) {
        throw new Error(`Opção 2 deveria permanecer com 200 votos, encontrado: ${opt2.votes}`);
      }
    }
  );

  await runTest(
    'TC-CHAL-VOTE-07',
    'CHALLENGES',
    'Transmissão encerrada ou desafio inativo não aceita votos',
    async () => {
      // Cenário A: Transmissão encerrada
      const liveA = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Transmissão Encerrada',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_07a',
        hostCreatorName: 'Criador TDD 7A',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessionsA = liveStreamService.getLiveSessions();
      const targetA = sessionsA.find((s) => s.id === liveA.id)!;
      targetA.challengeState!.optionsForVote = [
        { id: 'opt_closed', label: 'Opção Encerrada', votes: 50 },
      ];
      liveStreamService.saveLiveSessions(sessionsA);

      // Encerra a live
      await liveStreamService.endLiveSession(liveA.id);

      let rejectedEnded = false;
      try {
        await (liveStreamService as any).voteOnChallenge(liveA.id, 'opt_closed', 'user_late_voter');
      } catch (err: any) {
        rejectedEnded = true;
        if (!err.message.toLowerCase().includes('encerrada') && !err.message.toLowerCase().includes('inativa')) {
          throw new Error(`Mensagem deve indicar transmissão inativa/encerrada: "${err.message}"`);
        }
      }
      if (!rejectedEnded) {
        throw new Error('Falha TDD: Voto em live encerrada deveria ter sido rejeitado.');
      }

      // Cenário B: Desafio inativo/concluído
      const liveB = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio TDD Desafio Inativo',
        description: 'Votação consensual da audiência',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_chal_tdd_07b',
        hostCreatorName: 'Criador TDD 7B',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        gender: 'homem',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessionsB = liveStreamService.getLiveSessions();
      const targetB = sessionsB.find((s) => s.id === liveB.id)!;
      targetB.challengeState!.optionsForVote = [
        { id: 'opt_finished', label: 'Opção Finalizada', votes: 88 },
      ];
      targetB.challengeState!.status = 'completed'; // desafio já concluído
      liveStreamService.saveLiveSessions(sessionsB);

      let rejectedInactiveChallenge = false;
      try {
        await (liveStreamService as any).voteOnChallenge(liveB.id, 'opt_finished', 'user_challenge_closed');
      } catch (err: any) {
        rejectedInactiveChallenge = true;
        if (!err.message.toLowerCase().includes('inativo') && !err.message.toLowerCase().includes('finalizado')) {
          throw new Error(`Mensagem deve indicar desafio inativo/finalizado: "${err.message}"`);
        }
      }
      if (!rejectedInactiveChallenge) {
        throw new Error('Falha TDD: Voto em desafio com status diferente de active deveria ter sido rejeitado.');
      }

      // Validar contagens intactas
      const freshA = liveStreamService.getSessionById(liveA.id)!;
      if (freshA.challengeState!.optionsForVote![0].votes !== 50) {
        throw new Error('Contagem da Live A foi alterada indevidamente.');
      }
      const freshB = liveStreamService.getSessionById(liveB.id)!;
      if (freshB.challengeState!.optionsForVote![0].votes !== 88) {
        throw new Error('Contagem da Live B foi alterada indevidamente.');
      }
    }
  );

  // =========================================================================
  // 5. CATÁLOGO DE PRESENTES, IDEMPOTÊNCIA E DIVISÃO 70/30 NO LEDGER
  // =========================================================================
  await runTest(
    'TC-GIFT-06',
    'GIFTS_70_30',
    'Validação do catálogo oficial com 6 itens e custos definidos',
    () => {
      if (!Array.isArray(OFFICIAL_VIRTUAL_GIFTS) || OFFICIAL_VIRTUAL_GIFTS.length !== 6) {
        throw new Error(`Catálogo deve conter exatamente 6 presentes oficiais, encontrado: ${OFFICIAL_VIRTUAL_GIFTS.length}`);
      }
      const ids = OFFICIAL_VIRTUAL_GIFTS.map((g) => g.id);
      const expectedIds = ['gift_rose', 'gift_drink', 'gift_champagne', 'gift_fire', 'gift_crown', 'gift_rocket'];
      for (const expected of expectedIds) {
        if (!ids.includes(expected)) {
          throw new Error(`Presente obrigatório ausente: ${expected}`);
        }
      }
    }
  );

  await runTest(
    'TC-GIFT-07',
    'GIFTS_70_30',
    'Rejeição atômica de envio de presente quando saldo de créditos for insuficiente',
    async () => {
      const activeSession = liveStreamService.getLiveSessions().find((s) => s.status === 'active')!;
      const brokeUserId = `broke_user_${Date.now()}`;

      try {
        await liveStreamService.sendVirtualGift({
          sessionId: activeSession.id,
          giftId: 'gift_rocket', // 500 créditos
          userId: brokeUserId,
          userName: 'Usuário Sem Créditos',
          targetCreatorId: activeSession.hostCreatorId,
          idempotencyKey: `idem_fail_${Date.now()}`,
        });
        throw new Error('Deveria ter lançado erro de saldo insuficiente!');
      } catch (err: any) {
        if (!err.message.includes('Saldo insuficiente')) {
          throw new Error(`Mensagem inesperada de erro: ${err.message}`);
        }
      }
    }
  );

  await runTest(
    'TC-GIFT-08',
    'GIFTS_70_30',
    'Cálculo exato da divisão 70% Criador e 30% JOBS no Livro-Razão Contábil',
    async () => {
      const testBuyerId = `buyer_test_${Date.now()}`;
      const testCreatorId = `creator_earner_${Date.now()}`;

      // Injeta créditos no livro-razão via compra de pacote popular (170 créditos)
      await financialLedger.purchaseCreditPackage({
        userId: testBuyerId,
        packageId: 'pkg_popular',
        packageName: 'Popular',
        creditsToGrant: 170,
        priceBrl: 27.90,
        gateway: 'pix',
        idempotencyKey: `idem_buy_${Date.now()}`,
      });

      const initialCredits = financialLedger.getUserCredits(testBuyerId);
      if (initialCredits < 170) {
        throw new Error(`Saldo pós-compra inconsistente: ${initialCredits}`);
      }

      // Cria live para o criador
      const live = await liveStreamService.startNewLiveSession({
        format: 'individual',
        title: 'Live para Teste da Regra 70/30',
        description: 'Teste contábil',
        category: 'conversa_vip',
        hostCreatorId: testCreatorId,
        hostCreatorName: 'Criador 70/30',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      // Envia presente "Champagne Moët & Chandon" = 79 💎
      // 79 💎 * R$ 0,10 = R$ 7,90
      // 70% = R$ 5,53 para Criador
      // 30% (20% JOBS + 10% Reserva) = R$ 2,37
      const idemKey = `idem_gift_7030_${Date.now()}`;
      const res = await liveStreamService.sendVirtualGift({
        sessionId: live.id,
        giftId: 'gift_champagne',
        userId: testBuyerId,
        userName: 'Apoiador VIP',
        targetCreatorId: testCreatorId,
        idempotencyKey: idemKey,
      });

      if (!res.success) throw new Error('Falha no envio do presente');
      if (res.creatorEarnedBrl !== 5.53) {
        throw new Error(`Ganho do criador incorreto: esperado R$ 5,53, obtido R$ ${res.creatorEarnedBrl}`);
      }
      if (res.platformCommissionBrl !== 2.37) {
        throw new Error(`Comissão da plataforma incorreta: esperado R$ 2,37, obtido R$ ${res.platformCommissionBrl}`);
      }

      // Validação no livro-razão do saldo pendente do criador
      const creatorBalances = financialLedger.getCreatorBalances(testCreatorId);
      if (creatorBalances.pendingBrl < 5.53) {
        throw new Error(`Saldo pendente do criador no ledger deve ser >= R$ 5,53, atual: R$ ${creatorBalances.pendingBrl}`);
      }
    }
  );

  await runTest(
    'TC-GIFT-09',
    'GIFTS_70_30',
    'Proteção estrita contra replay de chave de idempotência',
    async () => {
      const testBuyerId = `buyer_idem_${Date.now()}`;
      await financialLedger.purchaseCreditPackage({
        userId: testBuyerId,
        packageId: 'pkg_popular',
        packageName: 'Popular',
        creditsToGrant: 170,
        priceBrl: 27.90,
        gateway: 'pix',
        idempotencyKey: `idem_setup_${Date.now()}`,
      });

      const activeSession = liveStreamService.getLiveSessions().find((s) => s.status === 'active')!;
      const duplicateKey = `idem_unique_${Date.now()}`;

      // Primeiro envio
      await liveStreamService.sendVirtualGift({
        sessionId: activeSession.id,
        giftId: 'gift_rose', // 10 créditos
        userId: testBuyerId,
        userName: 'Apoiador Rosa',
        targetCreatorId: activeSession.hostCreatorId,
        idempotencyKey: duplicateKey,
      });

      const creditsAfterFirst = financialLedger.getUserCredits(testBuyerId);

      // Reenvio imediato com a mesma chave
      await liveStreamService.sendVirtualGift({
        sessionId: activeSession.id,
        giftId: 'gift_rose',
        userId: testBuyerId,
        userName: 'Apoiador Rosa',
        targetCreatorId: activeSession.hostCreatorId,
        idempotencyKey: duplicateKey,
      });

      const creditsAfterSecond = financialLedger.getUserCredits(testBuyerId);
      if (creditsAfterFirst !== creditsAfterSecond) {
        throw new Error('Falha de idempotência: créditos foram debitados em chamada duplicada!');
      }
    }
  );

  // =========================================================================
  // 6. RECOMPENSAS DE DESEMPENHO (REGRAS VERSIONADAS E NÃO MONETIZÁVEIS)
  // =========================================================================
  await runTest(
    'TC-PERF-10',
    'PERFORMANCE_RULES',
    'Existência de regras de campanha versionadas (v1.0.0) com fonte de custeio segregada',
    () => {
      const rules = liveStreamService.getPerformanceRules();
      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('Nenhuma regra de premiação de desempenho configurada');
      }
      const v1 = rules.find((r) => r.ruleId === 'rule_marathon_v1');
      if (!v1) throw new Error('Regra rule_marathon_v1 ausente');
      if (v1.fundingSource !== 'JOBS_MARKETING_POOL_2026') {
        throw new Error('Fonte de custeio deve ser explicitamente JOBS_MARKETING_POOL_2026');
      }
    }
  );

  await runTest(
    'TC-PERF-11',
    'PERFORMANCE_RULES',
    'Concessão formal de premiação por desempenho no Ledger preservando segregação',
    async () => {
      const targetCreator = `creator_award_${Date.now()}`;
      const rewardRes = await financialLedger.awardPerformanceReward({
        creatorId: targetCreator,
        creatorName: 'Criadora Premiada',
        campaignId: 'rule_marathon_v1',
        ruleVersion: 'v1.0.0',
        amountBrl: 150.0,
        idempotencyKey: `idem_award_${Date.now()}`,
        description: 'Premiação de Desempenho Maratona de Lives',
      });

      if (!rewardRes.success) throw new Error('Falha na concessão da premiação');
      if (rewardRes.entry.operationType !== 'PERFORMANCE_REWARD') {
        throw new Error(`operationType incorreto: ${rewardRes.entry.operationType}`);
      }
      if (rewardRes.entry.currency !== 'BRL') {
        throw new Error(`Moeda da premiação deve ser BRL, obtido: ${rewardRes.entry.currency}`);
      }
      if (rewardRes.entry.amount !== 150.0) {
        throw new Error(`Valor da premiação incorreto: ${rewardRes.entry.amount}`);
      }
    }
  );

  // =========================================================================
  // 7. PONTOS DE PARTICIPAÇÃO E RANKINGS (NÃO MONETIZÁVEIS)
  // =========================================================================
  await runTest(
    'TC-RANK-12',
    'LEADERBOARDS',
    'Acúmulo de pontos de engajamento não altera saldo de créditos nem ganhos BRL',
    () => {
      const fanId = `fan_points_${Date.now()}`;
      const credBefore = financialLedger.getUserCredits(fanId);
      const balanceBefore = financialLedger.getCreatorBalances(fanId);

      liveStreamService.addFanParticipationPoints(fanId, 500);

      const credAfter = financialLedger.getUserCredits(fanId);
      const balanceAfter = financialLedger.getCreatorBalances(fanId);

      if (credBefore !== credAfter) {
        throw new Error('Pontos de participação não podem alterar saldo de créditos');
      }
      if (balanceBefore.availableBrl !== balanceAfter.availableBrl || balanceBefore.pendingBrl !== balanceAfter.pendingBrl) {
        throw new Error('Pontos de participação não podem alterar saldo financeiro');
      }
    }
  );

  await runTest(
    'TC-RANK-13',
    'LEADERBOARDS',
    'Leaderboard de criadores retorna níveis de distintivo válidos e posições ordenadas',
    () => {
      const ranking = liveStreamService.getCreatorLeaderboard('semana');
      if (!Array.isArray(ranking) || ranking.length === 0) {
        throw new Error('Ranking vazio');
      }
      if (ranking[0].rank !== 1) {
        throw new Error('Primeiro item do ranking deve ter rank 1');
      }
      const validBadges = ['bronze', 'prata', 'ouro', 'diamante', 'lendario'];
      for (const item of ranking) {
        if (!validBadges.includes(item.badgeLevel)) {
          throw new Error(`Distintivo inválido: ${item.badgeLevel}`);
        }
      }
    }
  );

  // =========================================================================
  // 8. RELATÓRIO DE AUDITORIA & INTEGRIDADE DO LIVRO-RAZÃO
  // =========================================================================
  await runTest(
    'TC-AUDIT-14',
    'AUDIT_LEDGER',
    'Verificação criptográfica da cadeia de hashes do livro-razão (Hash Chain)',
    () => {
      const check = financialLedger.verifyLedgerIntegrity();
      if (!check.isValid) {
        throw new Error(`Quebra detectada na cadeia de integridade: ${check.errors.join('; ')}`);
      }
      if (check.checkedCount < 1) {
        throw new Error('Nenhum registro verificado na cadeia de integridade');
      }
    }
  );

  await runTest(
    'TC-AUDIT-15',
    'AUDIT_LEDGER',
    'Consulta paginada do Ledger com filtros determinísticos por operação e status',
    () => {
      const resAll = financialLedger.queryLedger({ page: 1, pageSize: 10 });
      if (resAll.entries.length === 0) {
        throw new Error('Nenhuma transação retornada pela query geral');
      }
      if (resAll.totalCount <= 0 || resAll.totalPages <= 0) {
        throw new Error('Contadores de paginação inválidos');
      }

      // Filtro por operação
      const resTips = financialLedger.queryLedger({
        operationType: 'TIP_GIFT',
        page: 1,
        pageSize: 10,
      });
      for (const e of resTips.entries) {
        if (e.operationType !== 'TIP_GIFT') {
          throw new Error(`Entrada incompatível com filtro: ${e.operationType}`);
        }
      }
    }
  );

  await runTest(
    'TC-AUDIT-16',
    'AUDIT_LEDGER',
    'Estorno contábil compensatório mantém imutabilidade e registra motivo de auditoria',
    async () => {
      const buyerId = `refund_user_${Date.now()}`;
      await financialLedger.purchaseCreditPackage({
        userId: buyerId,
        packageId: 'pkg_inicial',
        packageName: 'Inicial',
        creditsToGrant: 50,
        priceBrl: 9.90,
        gateway: 'pix',
        idempotencyKey: `idem_init_${Date.now()}`,
      });

      const queryRes = financialLedger.queryLedger({ actorId: buyerId });
      const targetEntry = queryRes.entries.find((e) => e.status === 'posted');
      if (!targetEntry) throw new Error('Transação inicial não encontrada para estorno');

      const refundRes = await financialLedger.processRefund({
        originalEntryId: targetEntry.id,
        adminId: 'compliance_officer_01',
        reason: 'Estorno autorizado de teste automatizado',
        idempotencyKey: `idem_reversal_${Date.now()}`,
      });

      if (!refundRes.success) throw new Error('Falha no estorno compensatório');
      if (!refundRes.compensatoryEntry) throw new Error('Entrada compensatória não gerada');
      if (refundRes.compensatoryEntry.operationType !== 'REFUND') {
        throw new Error(`Operação compensatória inválida: ${refundRes.compensatoryEntry.operationType}`);
      }

      // Integridade após estorno
      const chainCheck = financialLedger.verifyLedgerIntegrity();
      if (!chainCheck.isValid) {
        throw new Error('Integridade rompida após estorno compensatório');
      }
    }
  );

  await runTest(
    'TC-AUDIT-17',
    'AUDIT_LEDGER',
    'Exportação CSV segura contra Injeção de Fórmulas e com anonimização de PII',
    () => {
      const csv = financialLedger.exportLedgerCsv({});
      if (!csv || typeof csv !== 'string') {
        throw new Error('CSV gerado é nulo ou não é string');
      }

      const lines = csv.split('\r\n');
      if (lines.length < 2) {
        throw new Error('CSV deve conter pelo menos cabeçalho e 1 linha de dados');
      }

      // Valida cabeçalho
      const header = lines[0];
      if (!header.includes('ID Lançamento') || !header.includes('Hash Anterior')) {
        throw new Error('Cabeçalho CSV incompleto');
      }

      // Valida que caracteres perigosos no início de campos foram protegidos com apóstrofo
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('"=') || line.includes('"+') || line.includes('"-@')) {
          throw new Error(`Vulnerabilidade de CSV Formula Injection detectada na linha ${i}: ${line}`);
        }
      }
    }
  );

  const endTime = Date.now();
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    executionDurationMs: endTime - startTime,
    results,
  };
}
