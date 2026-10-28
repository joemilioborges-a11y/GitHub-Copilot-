/**
 * JOBS — SUÍTE DE TESTES AUTOMATIZADOS: SEÇÃO "SEU TALENTO VALE MUITO!"
 * Pode ser executada isoladamente via:
 *   npx tsx src/services/__tests__/talentChallengesSimulation.test.ts
 * Ou integrada na suíte principal via:
 *   npm test
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  calculateTalentProgressMetrics,
  getInitialChallengeSeeds,
  buildTalentSimulationDashboardState,
  buildTalentDashboardStateByEnvironment,
  advanceSimulatedChallengeStep,
  recordAuditedDailyTalentActivity,
  recordAuditedCollaboratorAction,
  buildAuditedTalentFirestorePayload,
  syncAuditedTalentActivityToCloud,
} from '../talentChallengesSimulationService';
import { financialLedger } from '../ledgerService';
import { runtimeEnvironmentService } from '../runtimeEnvironmentService';
import { exclusiveContentAndInterestService } from '../exclusiveContentAndInterestService';
import { matchAndMessagingService } from '../matchAndMessagingService';
import { liveStreamService } from '../liveStreamService';

export interface TalentSimulationTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface TalentSimulationTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TalentSimulationTestResult[];
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runTalentChallengesSimulationTestSuite(): Promise<TalentSimulationTestSuiteSummary> {
  const results: TalentSimulationTestResult[] = [];
  const suiteStart = Date.now();

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
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        evidence: 'Falha na asserção.',
        error: err?.message || String(err),
      });
    }
  };

  // Teste 1: Progresso zero, parcial, completo e acima de 100% (preservação do valor original + trava visual 0-100%)
  await runTest(
    1,
    'TALENT-SIM-001',
    'Cálculo seguro de percentuais (zero, parcial, 100% e >100% com trava visual sem alterar valor original)',
    () => {
      const zero = calculateTalentProgressMetrics(0, 10);
      assertCondition(
        zero.currentValue === 0 &&
          zero.targetValue === 10 &&
          zero.rawPercent === 0 &&
          zero.visualBarPercent === 0 &&
          zero.status === 'nao_iniciado',
        `Falha no cálculo zero: ${JSON.stringify(zero)}`
      );

      const partial = calculateTalentProgressMetrics(2, 3);
      assertCondition(
        partial.currentValue === 2 &&
          partial.targetValue === 3 &&
          partial.formattedCounter === '2 de 3' &&
          partial.rawPercent === 67 &&
          partial.visualBarPercent === 67 &&
          partial.status === 'em_andamento',
        `Falha no cálculo parcial: ${JSON.stringify(partial)}`
      );

      const complete = calculateTalentProgressMetrics(5, 5);
      assertCondition(
        complete.currentValue === 5 &&
          complete.targetValue === 5 &&
          complete.rawPercent === 100 &&
          complete.visualBarPercent === 100 &&
          !complete.isOverTarget &&
          complete.status === 'concluido',
        `Falha no cálculo 100%: ${JSON.stringify(complete)}`
      );

      const overTarget = calculateTalentProgressMetrics(7, 5);
      assertCondition(
        overTarget.currentValue === 7 &&
          overTarget.targetValue === 5 &&
          overTarget.formattedCounter === '7 de 5' &&
          overTarget.rawPercent === 140 &&
          overTarget.visualBarPercent === 100 &&
          overTarget.isOverTarget === true &&
          overTarget.status === 'concluido',
        `Falha no cálculo >100%: ${JSON.stringify(overTarget)}`
      );

      const zeroTarget = calculateTalentProgressMetrics(3, 0);
      assertCondition(
        Number.isFinite(zeroTarget.visualBarPercent) && zeroTarget.visualBarPercent === 0,
        'Meta zero não deve produzir NaN ou Infinity.'
      );

      return `Zero=${zero.visualBarPercent}%, Parcial=${partial.formattedCounter} (${partial.visualBarPercent}%), Completo=${complete.visualBarPercent}%, Acima=${overTarget.formattedCounter} (raw=${overTarget.rawPercent}%, barra=${overTarget.visualBarPercent}%).`;
    }
  );

  // Teste 2: Integridade dos 5 indicadores principais e dos 5 desafios obrigatórios
  await runTest(
    2,
    'TALENT-SIM-002',
    'Validação dos 5 indicadores principais e dos 5 desafios obrigatórios (Produtor e Colaborador)',
    () => {
      const producerState = buildTalentSimulationDashboardState('produtor_conteudo');
      const collabState = buildTalentSimulationDashboardState('colaborador');

      const expectedIds = [
        'criador_em_acao',
        'conexao_ativa',
        'ao_vivo_no_jobs',
        'consistencia_semanal',
        'talento_em_destaque',
      ];

      assertCondition(
        producerState.challenges.length === 5 &&
          expectedIds.every((id, i) => producerState.challenges[i].id === id),
        'Lista de desafios do Produtor de Conteúdo não contém exatamente os 5 desafios obrigatórios.'
      );
      assertCondition(
        collabState.challenges.length === 5 &&
          expectedIds.every((id, i) => collabState.challenges[i].id === id),
        'Lista de desafios do Colaborador não contém exatamente os 5 desafios obrigatórios.'
      );

      // Verifica determinismo (duas chamadas seguidas geram exatamente os mesmos números)
      const producerStateSecondCall = buildTalentSimulationDashboardState('produtor_conteudo');
      assertCondition(
        producerState.indicators.meuProgressoPercent ===
          producerStateSecondCall.indicators.meuProgressoPercent &&
          producerState.indicators.pontosConquistados ===
            producerStateSecondCall.indicators.pontosConquistados,
        'Os indicadores não são determinísticos entre renderizações.'
      );

      return `Produtor: progresso=${producerState.indicators.meuProgressoPercent}%, ativos=${producerState.indicators.desafiosAtivosCount}, pontos=${producerState.indicators.pontosConquistados} pts | Colaborador: progresso=${collabState.indicators.meuProgressoPercent}%, ativos=${collabState.indicators.desafiosAtivosCount}, pontos=${collabState.indicators.pontosConquistados} pts.`;
    }
  );

  // Teste 3: Evolução determinística de etapas e atualização de "Suas conquistas"
  await runTest(
    3,
    'TALENT-SIM-003',
    'Avanço determinístico de desafio (+1 etapa) e coerência com Pontos Conquistados e Suas Conquistas',
    () => {
      let seeds = getInitialChallengeSeeds('produtor_conteudo');
      const initialState = buildTalentSimulationDashboardState('produtor_conteudo', seeds);

      // Avança 'criador_em_acao' de 2/3 para 3/3 (concluído)
      seeds = advanceSimulatedChallengeStep(seeds, 'criador_em_acao', 1);
      const updatedState = buildTalentSimulationDashboardState('produtor_conteudo', seeds);

      const criadorChallenge = updatedState.challenges.find((c) => c.id === 'criador_em_acao')!;
      assertCondition(
        criadorChallenge.metrics.currentValue === 3 &&
          criadorChallenge.metrics.status === 'concluido' &&
          criadorChallenge.metrics.visualBarPercent === 100,
        `Desafio 'criador_em_acao' deveria estar concluído com 3 de 3: ${JSON.stringify(
          criadorChallenge.metrics
        )}`
      );
      assertCondition(
        updatedState.indicators.pontosConquistados > initialState.indicators.pontosConquistados,
        'Pontos conquistados deveriam aumentar após avançar uma etapa.'
      );

      return `Progresso de 'Criador em ação' avançou para ${criadorChallenge.metrics.formattedCounter} (${criadorChallenge.statusLabel}); pontos subiram de ${initialState.indicators.pontosConquistados} para ${updatedState.indicators.pontosConquistados} pts.`;
    }
  );

  // Teste 4: Isolamento absoluto do livro-razão financeiro (ledgerService)
  await runTest(
    4,
    'TALENT-SIM-004',
    'Isolamento contábil absoluto: simulações de talento não alteram saldos nem gravam entradas no ledgerService',
    () => {
      const testUserId = 'talent_isolation_audit_user';
      const summaryBefore = financialLedger.getUnifiedWalletSummary(testUserId);
      const entriesCountBefore = financialLedger.getEntries().length;

      let seeds = getInitialChallengeSeeds('produtor_conteudo');
      seeds = advanceSimulatedChallengeStep(seeds, 'criador_em_acao', 5);
      seeds = advanceSimulatedChallengeStep(seeds, 'ao_vivo_no_jobs', 3);
      const simState = buildTalentSimulationDashboardState('produtor_conteudo', seeds);

      const summaryAfter = financialLedger.getUnifiedWalletSummary(testUserId);
      const entriesCountAfter = financialLedger.getEntries().length;

      assertCondition(
        entriesCountBefore === entriesCountAfter &&
          summaryBefore.availableBalanceCents === summaryAfter.availableBalanceCents &&
          summaryBefore.totalReceivedPeriodCents === summaryAfter.totalReceivedPeriodCents,
        'Violação de isolamento: a simulação de desafios alterou o livro-razão financeiro.'
      );
      assertCondition(
        simState.isSimulation === true &&
          simState.simulationNotice.includes('MODO SIMULAÇÃO'),
        'Selo obrigatório de simulação ausente no estado do módulo.'
      );

      return `Ledger intacto (entradas antes=${entriesCountBefore}, depois=${entriesCountAfter}; saldo R$=${summaryAfter.availableBalanceBrl}). Aviso ativo: "${simState.simulationNotice}".`;
    }
  );

  // Teste 5: Alternância entre Simulação e Produção via runtimeEnvironmentService + Zero dados fictícios em Produção
  await runTest(
    5,
    'TALENT-PROD-005',
    'Alternância automática Simulação <-> Produção via runtimeEnvironmentService sem vazar sementes sintéticas',
    () => {
      const adminActor = {
        userId: 'admin_audit_talent',
        role: 'admin' as const,
        isAuthenticated: true,
      };
      const previousMode = runtimeEnvironmentService.getMode();

      try {
        runtimeEnvironmentService.setModeSync('production', adminActor);
        const freshProdUserId = `fresh_prod_user_${Date.now()}`;
        const prodState = buildTalentDashboardStateByEnvironment({
          role: 'produtor_conteudo',
          userId: freshProdUserId,
        });

        assertCondition(
          prodState.isSimulation === false &&
            prodState.environmentMode === 'production' &&
            prodState.simulationNotice === 'MODO PRODUÇÃO — PROGRESSO AUDITADO',
          `Estado de produção inválido: ${JSON.stringify({
            isSimulation: prodState.isSimulation,
            environmentMode: prodState.environmentMode,
            simulationNotice: prodState.simulationNotice,
          })}`
        );

        assertCondition(
          prodState.indicators.meuProgressoPercent === 0 &&
            prodState.indicators.pontosConquistados === 0 &&
            prodState.challenges.every(
              (c) => c.metrics.currentValue === 0 && c.metrics.status === 'nao_iniciado'
            ),
          `Usuário novo em produção não deve herdar sementes fictícias: ${JSON.stringify(
            prodState.indicators
          )}`
        );

        // Alterna de volta para simulação e verifica restauração das sementes determinísticas
        runtimeEnvironmentService.setModeSync('simulation', adminActor);
        const simState = buildTalentDashboardStateByEnvironment({
          role: 'produtor_conteudo',
          userId: freshProdUserId,
        });

        assertCondition(
          simState.isSimulation === true &&
            simState.environmentMode === 'simulation' &&
            simState.indicators.pontosConquistados > 0,
          'Modo simulação deveria exibir as sementes determinísticas de demonstração.'
        );

        return `Produção iniciada limpa (0% / 0 pts em todos os 5 desafios para ${freshProdUserId}); retorno ao Modo Simulação restaurou ${simState.indicators.pontosConquistados} pts simulados.`;
      } finally {
        runtimeEnvironmentService.setModeSync(previousMode, adminActor);
      }
    }
  );

  // Teste 6: Conexão real dos 5 desafios aos serviços auditados em Produção + Isolamento contábil do ledgerService
  await runTest(
    6,
    'TALENT-PROD-006',
    'Progressão auditada dos 5 desafios em Produção (Conteúdo, Conexões, Lives, Consistência e Destaque) sem impacto no ledgerService',
    () => {
      const testCreatorId = `prod_creator_${Date.now()}`;
      const testPartnerId = `prod_partner_${Date.now()}`;

      const ledgerEntriesBefore = financialLedger.getEntries().length;
      const walletBefore = financialLedger.getUnifiedWalletSummary(testCreatorId);

      // 1. Desafio 'criador_em_acao': publica 2 conteúdos aprovados
      const media1 = exclusiveContentAndInterestService.publishOrCreateMedia({
        creatorId: testCreatorId,
        creatorName: 'Criadora Auditada',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Ensaio autoral auditado #1',
        priceDiamonds: 49,
        classification: 'fashion_lingerie',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        privateMasterUrl: 'private://vault/prod/photo_1.jpg',
        initialState: 'published',
        autoApproveModeration: true,
      });
      exclusiveContentAndInterestService.publishOrCreateMedia({
        creatorId: testCreatorId,
        creatorName: 'Criadora Auditada',
        mediaType: 'video',
        modality: 'FREE',
        caption: 'Bastidores gratuitos #2',
        classification: 'fashion_lingerie',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        privateMasterUrl: 'private://vault/prod/video_2.mp4',
        initialState: 'published',
        autoApproveModeration: true,
      });

      // 2. Desafio 'conexao_ativa': forma match mútuo e envia mensagem legítima
      matchAndMessagingService.recordLike(testCreatorId, testPartnerId, 'standard');
      matchAndMessagingService.recordLike(testPartnerId, testCreatorId, 'standard');
      matchAndMessagingService.sendMessage(
        testCreatorId,
        testPartnerId,
        'Olá! Obrigada por acompanhar meu trabalho no JOBS.'
      );

      // 3. Desafio 'ao_vivo_no_jobs': registra 1 sessão de live válida para testCreatorId
      const currentSessions = liveStreamService.getLiveSessions();
      liveStreamService.saveLiveSessions([
        ...currentSessions,
        {
          id: `live_prod_${testCreatorId}_01`,
          format: 'individual',
          title: 'Live Oficial de Produção',
          description: 'Transmissão auditada',
          category: 'conversa_vip',
          hostCreatorId: testCreatorId,
          hostCreatorName: 'Criadora Auditada',
          hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
          status: 'completed',
          startedAt: '2026-10-25T20:00:00.000Z',
          endedAt: '2026-10-25T21:00:00.000Z',
          durationSeconds: 3600,
          viewerCount: 120,
          peakViewersCount: 180,
          gender: 'mulher',
          sexualOrientation: 'bi',
          genderLabel: 'Mulher',
          orientationLabel: 'Bissexual',
          priceCreditsToUnlock: 0,
          isUnlockedByUser: true,
          streamMediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          vipStreamMediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          tags: ['Produção'],
          isBroadcasting: false,
          isDemoStreaming: false,
          streamingProviderNote: 'Sessão auditada',
          stageParticipants: [],
          stageJoinRequests: [],
          totalGiftsReceivedCredits: 0,
          totalEligibleRevenueBrl: 0,
          creatorEarningsBrl: 0,
          platformCommissionBrl: 0,
          chatMessages: [],
        },
      ]);

      // 4. Desafio 'consistencia_semanal': registra presença auditada em 3 datas distintas
      recordAuditedDailyTalentActivity(testCreatorId, '2026-10-24', 'production');
      recordAuditedDailyTalentActivity(testCreatorId, '2026-10-25', 'production');
      recordAuditedDailyTalentActivity(testCreatorId, '2026-10-26', 'production');

      // 5. Desafio 'talento_em_destaque' e perspectiva colaborador
      recordAuditedCollaboratorAction(testCreatorId, 'referral_verified_01', 'production');

      const prodState = buildTalentDashboardStateByEnvironment({
        role: 'produtor_conteudo',
        userId: testCreatorId,
        mode: 'production',
      });

      const chCriador = prodState.challenges.find((c) => c.id === 'criador_em_acao')!;
      const chConexao = prodState.challenges.find((c) => c.id === 'conexao_ativa')!;
      const chLive = prodState.challenges.find((c) => c.id === 'ao_vivo_no_jobs')!;
      const chConsistencia = prodState.challenges.find((c) => c.id === 'consistencia_semanal')!;

      assertCondition(
        chCriador.metrics.currentValue === 2 && chCriador.metrics.status === 'em_andamento',
        `Esperado 2 mídias em 'criador_em_acao', obtido: ${chCriador.metrics.currentValue}`
      );
      assertCondition(
        chConexao.metrics.currentValue >= 2 && chConexao.metrics.status === 'em_andamento',
        `Esperado >=2 interações em 'conexao_ativa', obtido: ${chConexao.metrics.currentValue}`
      );
      assertCondition(
        chLive.metrics.currentValue === 1 && chLive.metrics.status === 'em_andamento',
        `Esperado 1 live em 'ao_vivo_no_jobs', obtido: ${chLive.metrics.currentValue}`
      );
      assertCondition(
        chConsistencia.metrics.currentValue >= 3 &&
          chConsistencia.metrics.status === 'em_andamento',
        `Esperado >=3 dias em 'consistencia_semanal', obtido: ${chConsistencia.metrics.currentValue}`
      );

      // Verifica perspectiva colaborador com ação auditada
      const collabProdState = buildTalentDashboardStateByEnvironment({
        role: 'colaborador',
        userId: testCreatorId,
        mode: 'production',
      });
      const chDestaqueCollab = collabProdState.challenges.find(
        (c) => c.id === 'talento_em_destaque'
      )!;
      assertCondition(
        chDestaqueCollab.metrics.currentValue >= 1,
        `Esperado >=1 destaque para colaborador auditado, obtido: ${chDestaqueCollab.metrics.currentValue}`
      );

      // Garante zero mutações no livro-razão financeiro
      const ledgerEntriesAfter = financialLedger.getEntries().length;
      const walletAfter = financialLedger.getUnifiedWalletSummary(testCreatorId);
      assertCondition(
        ledgerEntriesBefore === ledgerEntriesAfter &&
          walletBefore.availableBalanceCents === walletAfter.availableBalanceCents,
        'A apuração de desafios em produção não deve alterar o livro-razão financeiro.'
      );

      return `Produção auditada (${ media1.id }): Criador=${chCriador.metrics.formattedCounter}, Conexão=${chConexao.metrics.formattedCounter}, Live=${chLive.metrics.formattedCounter}, Consistência=${chConsistencia.metrics.formattedCounter}, Pontos=${prodState.indicators.pontosConquistados} pts | Ledger inalterado (${ledgerEntriesAfter} entradas).`;
    }
  );

  // Teste 7: Sincronização com /talent_progress/{userId} em Produção, bloqueio em Simulação e isolamento de /ledger_entries
  await runTest(
    7,
    'TALENT-CLOUD-007',
    'Sincronização estruturada de collectAuditedTalentActivity para /talent_progress/{userId} em Produção e bloqueio estrito em Simulação',
    async () => {
      const syncUserId = `cloud_talent_user_${Date.now()}`;
      const ledgerBefore = financialLedger.getEntries().length;

      // 1. Deve bloquear tentativa de sincronização em Modo Simulação
      const blockedSimSync = await syncAuditedTalentActivityToCloud({
        userId: syncUserId,
        role: 'produtor_conteudo',
        mode: 'simulation',
      });
      assertCondition(
        blockedSimSync.status === 'blocked_simulation' &&
          blockedSimSync.cloudPersisted === false &&
          blockedSimSync.payload === null,
        `Modo simulação deveria bloquear sincronização Firestore: ${JSON.stringify(blockedSimSync)}`
      );

      let threwOnSimPayload = false;
      try {
        buildAuditedTalentFirestorePayload(syncUserId, 'produtor_conteudo', 'simulation');
      } catch {
        threwOnSimPayload = true;
      }
      assertCondition(
        threwOnSimPayload,
        'buildAuditedTalentFirestorePayload deve rejeitar modo simulation.'
      );

      // 2. Em Modo Produção, constrói e sincroniza o snapshot auditado com schema estrito
      recordAuditedDailyTalentActivity(syncUserId, '2026-10-27', 'production');
      recordAuditedCollaboratorAction(syncUserId, 'collab_cloud_sync_01', 'production');

      const prodSync = await syncAuditedTalentActivityToCloud({
        userId: syncUserId,
        role: 'colaborador',
        mode: 'production',
      });

      assertCondition(
        (prodSync.status === 'synced_cloud' || prodSync.status === 'synced_local_audit') &&
          prodSync.collectionPath === `/talent_progress/${syncUserId}` &&
          prodSync.payload !== null &&
          prodSync.payload.environmentMode === 'production' &&
          prodSync.payload.userId === syncUserId &&
          prodSync.payload.role === 'colaborador' &&
          prodSync.payload.weeklyActiveDaysCount >= 1 &&
          prodSync.payload.collaboratorVerifiedActionsCount >= 1 &&
          prodSync.payload.pontosConquistados > 0,
        `Snapshot de produção inválido em syncAuditedTalentActivityToCloud: ${JSON.stringify(
          prodSync
        )}`
      );

      const ledgerAfter = financialLedger.getEntries().length;
      assertCondition(
        ledgerBefore === ledgerAfter,
        'Sincronização com /talent_progress jamais deve gravar em /ledger_entries ou ledgerService.'
      );

      return `Simulação bloqueada (${blockedSimSync.status}); Produção validada para ${prodSync.collectionPath} (pontos=${prodSync.payload?.pontosConquistados}, diasAtivos=${prodSync.payload?.weeklyActiveDaysCount}) | Ledger intacto (${ledgerAfter} entradas).`;
    }
  );

  // Teste 8: Auditoria estática de firestore.rules e firebase-blueprint.json para /talent_progress/{userId}
  await runTest(
    8,
    'TALENT-RULES-008',
    'Validação server-side em firestore.rules e firebase-blueprint.json para /talent_progress/{userId} e isolamento de /ledger_entries',
    () => {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      const blueprintContent = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));

      assertCondition(
        rulesContent.includes('function isValidTalentProgressSnapshot(data, userId)') &&
          rulesContent.includes('match /talent_progress/{userId}') &&
          rulesContent.includes("data.environmentMode == 'production'") &&
          rulesContent.includes('allow get, list: if isOwner(userId) || isAdmin();') &&
          rulesContent.includes('allow delete: if false;'),
        'firestore.rules não contém as regras estritas esperadas para /talent_progress/{userId}.'
      );

      assertCondition(
        Boolean(blueprintContent.entities?.TalentProgressSnapshot) &&
          Boolean(blueprintContent.firestore?.['/talent_progress/{userId}']),
        'firebase-blueprint.json não declara TalentProgressSnapshot e /talent_progress/{userId}.'
      );

      return 'firestore.rules (isValidTalentProgressSnapshot + match /talent_progress/{userId}) e firebase-blueprint.json verificados com bloqueio de deleção e exigência estrita de environmentMode == production.';
    }
  );

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}

// Execução direta via CLI (npx tsx src/services/__tests__/talentChallengesSimulation.test.ts)
const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('talentChallengesSimulation.test');

if (isDirectRun) {
  runTalentChallengesSimulationTestSuite().then((summary) => {
    console.log('========================================================================');
    console.log('JOBS — TESTES AUTOMATIZADOS: SEÇÃO "SEU TALENTO VALE MUITO!"');
    console.log('========================================================================');
    for (const r of summary.results) {
      const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
      console.log(`${icon} Teste ${r.testNumber} [${r.id}]: ${r.name} (${r.durationMs}ms)`);
      console.log(`    EVIDÊNCIA: ${r.evidence}`);
      if (!r.passed && r.error) {
        console.log(`    ERRO: ${r.error}`);
      }
    }
    console.log(`\nResultado: ${summary.passed}/${summary.total} aprovados (${summary.durationMs}ms)\n`);
    if (summary.failed > 0) {
      process.exit(1);
    }
  });
}
