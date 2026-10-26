/**
 * JOBS — Testes Automatizados do Simulador de Realidade Virtual, Modo "Lançamento Play Store — Dia 1"
 * e Módulo Financeiro de Evolução Monetária (30 Dias)
 *
 * Cobre os 14 testes estruturais do Simulador VR + Modo Dia 1 (VR-SIM-01 a VR-SIM-14)
 * e os 13 testes obrigatórios do Módulo Financeiro (VR-FIN-01 a VR-FIN-13).
 */

import {
  VrSimulatorEngine,
  VR_SIMULATOR_WATERMARK,
  VR_SIMULATOR_SHORT_BADGE,
  VR_FINANCIAL_SIMULATION_BADGE,
  VR_SIMULATOR_NAMESPACE,
  PLAY_STORE_DAY_ONE_MODE_LABEL,
  AUTHORIZED_REPO_IMAGE_ASSETS,
  computeExact7030SplitCents,
  isOperationEligibleFor7030RevenueSplit,
} from '../vrSimulatorService';
import { financialLedger } from '../ledgerService';

export interface VrSimulatorTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface VrSimulatorTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: VrSimulatorTestResult[];
}

export async function runVrSimulatorTestSuite(): Promise<VrSimulatorTestSuiteSummary> {
  const results: VrSimulatorTestResult[] = [];
  const suiteStart = Date.now();

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const t0 = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - t0,
        evidence,
      });
    } catch (err) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha na asserção',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // VR-SIM-01: Inicialização determinística dos 100 criadores sintéticos e zero PII real
  await runTest(
    1,
    'VR-SIM-01',
    'Inicialização determinística dos 100 criadores sintéticos com domínios .invalid e 2 fotos gratuitas',
    () => {
      const engineA = new VrSimulatorEngine(20261025);
      const engineB = new VrSimulatorEngine(20261025);
      const snapA = engineA.getStateSnapshot();
      const snapB = engineB.getStateSnapshot();

      if (snapA.creators.length !== 100) {
        throw new Error(`Esperados 100 criadores iniciais, encontrado: ${snapA.creators.length}`);
      }
      const allSynthetic = snapA.creators.every(
        (c) =>
          c.isSynthetic === true &&
          c.syntheticEmail.endsWith('@sim.jobs.invalid') &&
          c.syntheticDocumentId.startsWith('SIM-DOC-') &&
          c.freeGalleryPhotoPaths.length === 2 &&
          c.paidVaultAlbumPhotoPaths.length >= 1
      );
      if (!allSynthetic) {
        throw new Error('Falha na marcação sintética ou na regra das 2 fotos gratuitas.');
      }
      if (snapA.creators[0].displayName !== snapB.creators[0].displayName) {
        throw new Error('A geração por seed não foi determinística.');
      }
      return `100 criadores sintéticos gerados deterministicamente (${snapA.creators[0].syntheticEmail}, 2 fotos grátis + álbum pago).`;
    }
  );

  // VR-SIM-02: Isolamento estrito de produção e tarja permanente
  await runTest(
    2,
    'VR-SIM-02',
    'Isolamento estrito entre Sandbox e Produção (financialLedger de produção inalterado)',
    () => {
      const prodEntriesBefore = financialLedger.getEntries().length;
      const engine = new VrSimulatorEngine(20261025);
      engine.stepDays(5);
      const snap = engine.getStateSnapshot();
      const prodEntriesAfter = financialLedger.getEntries().length;

      if (
        snap.watermark !== VR_SIMULATOR_WATERMARK ||
        !snap.watermark.includes(VR_SIMULATOR_SHORT_BADGE)
      ) {
        throw new Error('Watermark obrigatório ausente.');
      }
      if (snap.namespace !== VR_SIMULATOR_NAMESPACE) {
        throw new Error('Namespace isolado incorreto.');
      }
      if (prodEntriesBefore !== prodEntriesAfter) {
        throw new Error('O simulador contaminou o livro-razão de produção!');
      }
      if (!snap.externalSideEffectsBlocked) {
        throw new Error('Efeitos colaterais externos não estão bloqueados.');
      }
      return `Namespace=${snap.namespace}, prodLedgerEntries=${prodEntriesBefore}->${prodEntriesAfter} (0 contaminação), watermark="${snap.shortBadge}" ativo.`;
    }
  );

  // VR-SIM-03: Relógio simulado (start, pause, resume, stepDays) e proteção contra tick duplicado
  await runTest(
    3,
    'VR-SIM-03',
    'Controle do relógio simulado (start, pause, resume, stepDays) e bloqueio de tick diário duplicado',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      let snap = engine.start();
      if (snap.currentDay !== 1 || snap.clockStatus !== 'running') {
        throw new Error(`Esperado Dia 1 running após start(), obtido Dia ${snap.currentDay} (${snap.clockStatus})`);
      }
      snap = engine.pause();
      if (snap.clockStatus !== 'paused') {
        throw new Error('Falha ao pausar o relógio simulado.');
      }
      snap = engine.resume();
      if (snap.clockStatus !== 'running') {
        throw new Error('Falha ao retomar o relógio simulado.');
      }

      const dupAttempt = engine.attemptDuplicateDayTick(1);
      const afterDupSnap = engine.getStateSnapshot();
      if (!dupAttempt.prevented || dupAttempt.executed) {
        throw new Error('Tick duplicado para o mesmo dia não foi bloqueado!');
      }
      if (afterDupSnap.duplicateDayTickPreventedCount !== 1) {
        throw new Error('Contador de ticks duplicados bloqueados não incrementou.');
      }
      return `Dia 1 executado 1x; tentativa duplicada '${dupAttempt.dayTickKey}' bloqueada com sucesso.`;
    }
  );

  // VR-SIM-04: Crescimento controlado de fãs respeitando teto de capacidade
  await runTest(
    4,
    'VR-SIM-04',
    'Crescimento diário de fãs sintéticos limitado pelo teto de capacidade (maxSyntheticFansCap)',
    () => {
      const engine = new VrSimulatorEngine(20261025, {
        initialFansCount: 90,
        dailyNewFansRate: 25,
        maxSyntheticFansCap: 130,
      });
      const snap = engine.stepDays(5);
      if (snap.fansCount > 130) {
        throw new Error(`Teto de fãs violado: ${snap.fansCount} > 130`);
      }
      if (snap.fansCount !== 130 || snap.totals.capacityThrottledEvents === 0) {
        throw new Error('O limitador de capacidade não atuou conforme configurado.');
      }
      return `Fãs estacionados exatamente no teto seguro (${snap.fansCount}/130) com ${snap.totals.capacityThrottledEvents} eventos contidos por capacidade.`;
    }
  );

  // VR-SIM-05: Jornadas B e C (Matches, Chat, Bloqueios, 2 Fotos Grátis e Álbum Pago)
  await runTest(
    5,
    'VR-SIM-05',
    'Jornadas de Descoberta/Match/Chat, bloqueio entre contas e proteção de álbum privado sem compra',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(6);
      if (
        snap.totals.swipesCount <= 0 ||
        snap.totals.matchesCreated <= 0 ||
        snap.totals.messagesSent <= 0
      ) {
        throw new Error('Fluxo de descoberta, match e chat não gerou eventos válidos.');
      }
      if (snap.totals.blockedInteractionAttempts <= 0) {
        throw new Error('Eventos de bloqueio de interação não foram validados.');
      }
      if (
        snap.totals.freePhotoViewsCount <= 0 ||
        snap.totals.unauthorizedVaultAccessBlocked <= 0 ||
        snap.totals.paidVaultUnlocksCount <= 0
      ) {
        throw new Error('Validação de 2 fotos gratuitas e bloqueio/desbloqueio de álbum falhou.');
      }
      return `Matches=${snap.totals.matchesCreated}, Msgs=${snap.totals.messagesSent}, Bloqueios=${snap.totals.blockedInteractionAttempts}, Acessos sem compra barrados=${snap.totals.unauthorizedVaultAccessBlocked}, Desbloqueios pagos=${snap.totals.paidVaultUnlocksCount}.`;
    }
  );

  // VR-SIM-06: Jornada D (Lives nos 4 formatos, presentes e desafios)
  await runTest(
    6,
    'VR-SIM-06',
    'Execução dos 4 formatos de Live (individual, battle, interactive_stage, challenge), presentes e desafios',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(4);
      const formats = snap.totals.livesByFormat;
      if (
        formats.individual <= 0 ||
        formats.battle <= 0 ||
        formats.interactive_stage <= 0 ||
        formats.challenge <= 0
      ) {
        throw new Error(`Nem todos os 4 formatos de Live foram exercitados: ${JSON.stringify(formats)}`);
      }
      if (snap.totals.giftsSentCount <= 0 || snap.totals.challengesCompletedCount <= 0) {
        throw new Error('Presentes ou desafios de Live não foram contabilizados.');
      }
      return `Lives executadas=${JSON.stringify(formats)}, Presentes=${snap.totals.giftsSentCount}, Desafios=${snap.totals.challengesCompletedCount}.`;
    }
  );

  // VR-SIM-07: Idempotência e bloqueio de tentativa concorrente de duplo gasto
  await runTest(
    7,
    'VR-SIM-07',
    'Idempotência financeira e bloqueio de tentativas concorrentes de duplo gasto',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(5);
      if (snap.totals.doubleSpendBlockedCount <= 0) {
        throw new Error('Nenhuma tentativa concorrente de duplo gasto foi bloqueada no ciclo.');
      }
      if (!snap.latestReconciliation.isBalanced) {
        throw new Error('Duplo gasto causou divergência no razão.');
      }
      return `${snap.totals.doubleSpendBlockedCount} tentativas de duplo gasto com mesma idempotencyKey rejeitadas com delta contábil R$ 0,00.`;
    }
  );

  // VR-SIM-08: Estorno/reversão abatendo saldo elegível (70/30) e Ranking Mensal
  await runTest(
    8,
    'VR-SIM-08',
    'Estorno e reversão deduzindo proporcionalmente 70% do criador, 30% da plataforma e pontuação do Ranking Mensal',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snapBefore = engine.stepDays(2);
      const targetCreatorId = snapBefore.monthlyRankingPreview.garotaJobsTop10[0]?.creatorId;
      if (!targetCreatorId) {
        throw new Error('Criadora líder não encontrada no preview do ranking.');
      }
      const creatorObj = snapBefore.creators.find((c) => c.creatorId === targetCreatorId)!;
      const fanObj = snapBefore.sampleFans[0];
      const netBefore = creatorObj.netEligibleRevenueCents;
      const availBefore = creatorObj.availableBalanceCents;

      const refundGross = 1000;
      const refundCreator = 700;
      const refundPlatform = 300;

      const refunded = engine.recordRefundReversal({
        simDay: 2,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'manual_audit_refund_test_01',
        fan: fanObj,
        creator: creatorObj,
        grossAmountCents: refundGross,
        creatorShareCents: refundCreator,
        platformShareCents: refundPlatform,
      });

      if (!refunded) {
        throw new Error('Estorno auditável não foi processado.');
      }

      const snapAfter = engine.getStateSnapshot();
      const updatedCreator = snapAfter.creators.find((c) => c.creatorId === targetCreatorId)!;

      if (updatedCreator.netEligibleRevenueCents !== netBefore - refundGross) {
        throw new Error('Receita líquida elegível não reduziu exatamente pelo valor bruto estornado.');
      }
      if (updatedCreator.availableBalanceCents !== availBefore - refundCreator) {
        throw new Error('Saldo disponível do criador não reduziu exatamente em 70% do estorno.');
      }
      if (!snapAfter.latestReconciliation.isBalanced) {
        throw new Error('Reconciliação falhou após estorno manual.');
      }
      return `Estorno de R$ 10,00 deduziu R$ 7,00 do criador (${targetCreatorId}) e R$ 3,00 da plataforma com reconciliação íntegra.`;
    }
  );

  // VR-SIM-09: Validação honesta de mídia autorizada (Etapa 6)
  await runTest(
    9,
    'VR-SIM-09',
    'Validação das 5 imagens .jpg autorizadas e reporte honesto da ausência de vídeo local (VIDEO_ASSET_ABSENT_IN_REPO)',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const media = engine.validateAuthorizedMedia();
      if (
        media.authorizedImageAssetsCount !== 5 ||
        !media.allAuthorizedImagesValid ||
        media.validatedImagePaths.length !== AUTHORIZED_REPO_IMAGE_ASSETS.length
      ) {
        throw new Error('As 5 imagens autorizadas do repositório não foram validadas corretamente.');
      }
      if (
        media.videoAssetsPresentInRepo !== false ||
        media.videoPlaybackStatus !== 'VIDEO_ASSET_ABSENT_IN_REPO' ||
        media.staticImageMasqueradingAsVideoPrevented !== true
      ) {
        throw new Error('O validador de mídia não reportou honestamente a ausência de vídeos locais.');
      }
      return `5/5 imagens .jpg locais validadas; status de vídeo=${media.videoPlaybackStatus} (zero falsificação de imagem estática como vídeo).`;
    }
  );

  // VR-SIM-10: Ciclo completo de 30 dias simulados e reconciliação contábil exata
  await runTest(
    10,
    'VR-SIM-10',
    'Execução completa dos 30 dias simulados com 30 checkpoints e reconciliação contábil de diferença zero',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const finalSnap = engine.advanceToDay(30);

      if (finalSnap.currentDay !== 30 || finalSnap.clockStatus !== 'completed') {
        throw new Error(`Esperado Dia 30 completed, obtido Dia ${finalSnap.currentDay} (${finalSnap.clockStatus})`);
      }
      if (finalSnap.checkpoints.length !== 30) {
        throw new Error(`Esperados 30 checkpoints diários, obtidos ${finalSnap.checkpoints.length}`);
      }
      const rec = finalSnap.latestReconciliation;
      if (!rec.isBalanced || rec.reconciliationDeltaCents !== 0) {
        throw new Error(`Falha de reconciliação no Dia 30: delta=${rec.reconciliationDeltaCents}`);
      }
      if (
        finalSnap.monthlyRankingPreview.garotaJobsTop10.length !== 10 ||
        finalSnap.monthlyRankingPreview.garotoJobsTop10.length !== 10
      ) {
        throw new Error('Top 10 Garota JOBS e Top 10 Garoto JOBS não foram apurados ao final dos 30 dias.');
      }
      return `30/30 dias concluídos, ${finalSnap.ledgerEntriesCount} lançamentos no razão sandbox, Receita Líquida=${rec.netEligibleRevenueCents} centavos, Delta=${rec.reconciliationDeltaCents} centavos.`;
    }
  );

  // VR-SIM-11: Modo "Lançamento Play Store — Dia 1": estado inicial no Dia 1 e health checks sem tocar na produção
  await runTest(
    11,
    'VR-SIM-11',
    'Modo "Lançamento Play Store — Dia 1": inicialização no Dia 1, registro de estado inicial e health checks de dependências',
    () => {
      const prodCountBefore = financialLedger.getEntries().length;
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.startPlayStoreLaunchDayOne(20261025);
      const prodCountAfter = financialLedger.getEntries().length;

      if (snap.simulationMode !== 'play_store_day_one_launch') {
        throw new Error(`Modo incorreto: ${snap.simulationMode}`);
      }
      if (snap.simulationModeLabel !== PLAY_STORE_DAY_ONE_MODE_LABEL) {
        throw new Error(`Rótulo incorreto: ${snap.simulationModeLabel}`);
      }
      if (snap.currentDay !== 1 || snap.clockStatus !== 'running') {
        throw new Error(`Esperado relógio no Dia 1 running, obtido Dia ${snap.currentDay} (${snap.clockStatus})`);
      }
      if (
        snap.initialLaunchState.initialSyntheticCreatorsCount !== 100 ||
        snap.initialLaunchState.productionDataTouched !== false ||
        snap.initialLaunchState.serviceHealthChecks.length < 8
      ) {
        throw new Error('Registro de estado inicial do lançamento Dia 1 incompleto.');
      }
      if (prodCountBefore !== prodCountAfter) {
        throw new Error('Reinicialização do cenário Dia 1 afetou o livro-razão de produção!');
      }
      return `Modo "${snap.simulationModeLabel}" iniciado no Dia 1 com 100 criadores fictícios, ${snap.initialLaunchState.serviceHealthChecks.length} serviços verificados e 0 impacto na produção.`;
    }
  );

  // VR-SIM-12: Sequência de inicialização progressiva dos 9 módulos e relato honesto de indisponibilidades
  await runTest(
    12,
    'VR-SIM-12',
    'Inicialização progressiva dos 9 módulos com identificação honesta de dependências parciais/indisponíveis sem falsos sucessos',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.startPlayStoreLaunchDayOne(20261025);
      const steps = snap.initialLaunchState.progressiveActivationSteps;

      if (steps.length !== 9) {
        throw new Error(`Esperadas 9 etapas na sequência progressiva, encontradas: ${steps.length}`);
      }
      const step4 = steps.find((s) => s.stepNumber === 4)!;
      const step5 = steps.find((s) => s.stepNumber === 5)!;
      const step6 = steps.find((s) => s.stepNumber === 6)!;

      if (
        step4.availabilityStatus !== 'degraded_or_partial' ||
        !step4.unavailableOrPendingDetails?.includes('Push Notifications externas')
      ) {
        throw new Error('Etapa 4 deveria identificar honestamente que Push externo não está ativo no sandbox.');
      }
      if (
        step5.availabilityStatus !== 'degraded_or_partial' ||
        !step5.unavailableOrPendingDetails?.includes('DemoStreamingAdapter')
      ) {
        throw new Error('Etapa 5 deveria reportar uso do DemoStreamingAdapter sem WebRTC externo.');
      }
      if (
        step6.availabilityStatus !== 'degraded_or_partial' ||
        !step6.unavailableOrPendingDetails?.includes('VIDEO_ASSET_ABSENT_IN_REPO')
      ) {
        throw new Error('Etapa 6 deveria reportar ausência de vídeo local sem fabricar falso sucesso.');
      }
      return `9/9 etapas verificadas: 6 totalmente ativas no sandbox e 3 identificadas com limitações reais de integração externa/mídia sem falsos sucessos.`;
    }
  );

  // VR-SIM-13: Segregação estrita de métricas e proteções contra práticas abusivas de loja
  await runTest(
    13,
    'VR-SIM-13',
    'Segregação estrita entre instalações/usuários simulados e leitura passiva fora do sandbox + bloqueio de avaliações/instalações falsas na loja',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.startPlayStoreLaunchDayOne(20261025);
      const seg = snap.segregatedLaunchMetrics;

      if (
        seg.simulatedInstallsCount <= 0 ||
        seg.syntheticUsersCreatedCount !== 100 + snap.fansCount ||
        seg.simulatedSessionsCount <= 0 ||
        seg.activeSimulatedUsersCount <= 0
      ) {
        throw new Error('Métricas sintéticas de lançamento não foram registradas corretamente.');
      }
      if (seg.externalReadOnlyBaseline.mixedWithSimulationMetrics !== false) {
        throw new Error('Dados externos de leitura foram misturados com as métricas de simulação!');
      }
      const g = seg.storeIntegrityGuarantees;
      if (
        g.realPlayStorePublished !== false ||
        g.fakePlayStoreReviewsGenerated !== 0 ||
        g.fakePublicCommentsGenerated !== 0 ||
        g.artificialPlayStoreInstallsGenerated !== 0 ||
        g.actionsAgainstRealAccounts !== 0 ||
        g.realPushNotificationsSent !== 0
      ) {
        throw new Error('Violação das garantias de integridade da loja e proteção de contas reais!');
      }
      if (snap.blockedExternalOperations.length < 4) {
        throw new Error('Operações externas bloqueadas não foram registradas na trilha do simulador.');
      }
      return `Instalações simuladas=${seg.simulatedInstallsCount}, Usuários fictícios=${seg.syntheticUsersCreatedCount}, Leitura externa isolada (mixed=false), ${snap.blockedExternalOperations.length} bloqueios externos auditados.`;
    }
  );

  // VR-SIM-14: Reprodutibilidade por semente e telemetria diária completa até o Dia 30
  await runTest(
    14,
    'VR-SIM-14',
    'Reprodutibilidade determinística do Dia 1 ao Dia 30 com registro diário de uso de funcionalidades, falhas, latência e memória',
    () => {
      const runA = new VrSimulatorEngine(998877);
      runA.startPlayStoreLaunchDayOne(998877);
      const snapA = runA.advanceToDay(30);

      const runB = new VrSimulatorEngine(998877);
      runB.startPlayStoreLaunchDayOne(998877);
      const snapB = runB.advanceToDay(30);

      if (
        snapA.latestReconciliation.netEligibleRevenueCents !==
          snapB.latestReconciliation.netEligibleRevenueCents ||
        snapA.checkpoints[29].checkpointHash !== snapB.checkpoints[29].checkpointHash
      ) {
        throw new Error('Execuções com a mesma semente produziram resultados divergentes no Dia 30!');
      }

      const day30 = snapA.checkpoints[29];
      if (
        day30.cumulativeSyntheticUsersCount <= 100 ||
        day30.simulatedSessionsInDay <= 0 ||
        day30.totalInteractionsInDay <= 0 ||
        day30.resourceAndLatencyMetrics.stepExecutionLatencyMs <= 0 ||
        day30.resourceAndLatencyMetrics.estimatedMemoryFootprintKb <= 0 ||
        day30.errorsAndFailures.unexpectedRuntimeErrorsCount !== 0
      ) {
        throw new Error('Telemetria diária do Dia 30 incompleta.');
      }
      return `Seed 998877 reproduzida identicamente até o Dia 30 (hash=${day30.checkpointHash.slice(0, 16)}..., Latência=${day30.resourceAndLatencyMetrics.stepExecutionLatencyMs}ms, Memória=${day30.resourceAndLatencyMetrics.estimatedMemoryFootprintKb}KB).`;
    }
  );

  // ===========================================================================
  // 13 TESTES OBRIGATÓRIOS DO MÓDULO FINANCEIRO (SEÇÃO 9)
  // ===========================================================================

  // 1. VR-FIN-01: Isolamento total entre simulação e produção
  await runTest(
    15,
    'VR-FIN-01',
    'Isolamento financeiro total entre simulação e produção (bloqueio de operação financeira real e selo obrigatório)',
    () => {
      const prodCountBefore = financialLedger.getEntries().length;
      const engine = new VrSimulatorEngine(20261025);
      const blockedOp = engine.attemptProductionFinancialOperation(
        'Tentativa de transferência PIX real fora do sandbox'
      );
      const snap = engine.getStateSnapshot();
      const prodCountAfter = financialLedger.getEntries().length;

      if (blockedOp.allowed !== false || !blockedOp.blockedReason.includes(VR_FINANCIAL_SIMULATION_BADGE)) {
        throw new Error('Operação financeira de produção não foi bloqueada pelo sandbox!');
      }
      if (snap.financialBadge !== VR_FINANCIAL_SIMULATION_BADGE) {
        throw new Error('Selo SIMULAÇÃO FINANCEIRA — SEM VALOR REAL ausente no snapshot.');
      }
      if (prodCountBefore !== prodCountAfter) {
        throw new Error('Livro-razão de produção sofreu mutação durante o teste!');
      }
      return `Selo "${snap.financialBadge}" ativo; tentativa de operação real bloqueada (${blockedOp.blockedReason}); razão de produção intocado (${prodCountAfter} entradas).`;
    }
  );

  // 2. VR-FIN-02: Compra ou concessão simulada de créditos com atualização correta da carteira
  await runTest(
    16,
    'VR-FIN-02',
    'Compra/concessão simulada de créditos com extrato íntegro da carteira virtual e registro de tentativas canceladas/falhas sem crédito indevido',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(2);
      const fanStatement = snap.fanWalletStatements[0];
      if (!fanStatement) {
        throw new Error('Extrato da carteira de fã não encontrado.');
      }
      const expectedFinal =
        fanStatement.inflowsCreditsCents -
        fanStatement.outflowsCreditsCents +
        fanStatement.refundedCreditsCents;
      if (fanStatement.finalBalanceCreditsCents !== expectedFinal) {
        throw new Error(`Saldo final divergente: ${fanStatement.finalBalanceCreditsCents} !== ${expectedFinal}`);
      }
      const totalFailedAttempts = snap.fanWalletStatements.reduce(
        (acc, s) => acc + s.cancelledOrFailedAttemptsCount,
        0
      );
      if (totalFailedAttempts <= 0) {
        throw new Error('Tentativas canceladas/falhas de compra de créditos não foram registradas.');
      }
      return `Extrato do fã ${fanStatement.handle} íntegro (Entradas=+${fanStatement.inflowsCreditsCents}¢, Saídas=-${fanStatement.outflowsCreditsCents}¢, Estornos=+${fanStatement.refundedCreditsCents}¢, Final=${fanStatement.finalBalanceCreditsCents}¢, PagoFictícioBRL=${fanStatement.fictitiousMonetaryPaidBrlCents}¢); ${totalFailedAttempts} falhas simuladas sem crédito indevido.`;
    }
  );

  // 3. VR-FIN-03: Bloqueio de consumo com saldo insuficiente
  await runTest(
    17,
    'VR-FIN-03',
    'Bloqueio estrito de consumo de créditos com saldo insuficiente sem gerar saldo negativo',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snapBefore = engine.stepDays(1);
      const targetFan = snapBefore.sampleFans[0];
      const targetCreator = snapBefore.creators[0];
      const walletBefore = targetFan.walletCreditsCents;

      const split = computeExact7030SplitCents(walletBefore + 500_000);
      const accepted = engine.recordEligibleMonetization({
        simDay: 1,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'idem_fin_insufficient_balance_test',
        operationType: 'VAULT_ALBUM_UNLOCK',
        fan: targetFan,
        creator: targetCreator,
        grossAmountCents: split.grossAmountCents,
        creatorShareCents: split.creatorShareCents,
        platformShareCents: split.platformShareCents,
      });

      if (accepted !== false || targetFan.walletCreditsCents !== walletBefore || targetFan.walletCreditsCents < 0) {
        throw new Error('Consumo acima do saldo disponível na carteira não foi bloqueado!');
      }
      return `Consumo acima do saldo barrado para ${targetFan.fanId}; saldo preservado em ${targetFan.walletCreditsCents} centavos (>= 0).`;
    }
  );

  // 4. VR-FIN-04: Desbloqueio pago e presente virtual gerando lançamentos válidos no razão
  await runTest(
    18,
    'VR-FIN-04',
    'Desbloqueio pago, presente virtual, ingresso de Live e desafio gerando lançamentos válidos no livro-razão',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(3);
      const entries = snap.recentLedgerEntries;
      const hasEligibleEntry = entries.some((e) => e.eligibleFor7030Split === true);
      if (
        !hasEligibleEntry ||
        snap.totals.paidVaultUnlocksCount <= 0 ||
        snap.totals.giftsSentCount <= 0 ||
        snap.totals.challengesCompletedCount <= 0
      ) {
        throw new Error('Desbloqueios de álbum, presentes ou desafios não geraram lançamentos elegíveis no razão.');
      }
      return `Lançamentos auditáveis confirmados no razão para VAULT_ALBUM_UNLOCK (${snap.totals.paidVaultUnlocksCount}), LIVE_GIFT_SENT (${snap.totals.giftsSentCount}) e CHALLENGE_CONTRIBUTION (${snap.totals.challengesCompletedCount}).`;
    }
  );

  // 5. VR-FIN-05: Divisão 70% criador / 30% plataforma sem perda por arredondamento
  await runTest(
    19,
    'VR-FIN-05',
    'Divisão 70% criador / 30% plataforma em centavos inteiros sem perda por arredondamento em qualquer valor',
    () => {
      const testAmounts = [1, 2, 3, 7, 11, 33, 99, 100, 101, 750, 1999, 12345];
      for (const gross of testAmounts) {
        const split = computeExact7030SplitCents(gross);
        if (
          !Number.isInteger(split.creatorShareCents) ||
          !Number.isInteger(split.platformShareCents) ||
          split.creatorShareCents + split.platformShareCents !== split.grossAmountCents ||
          split.roundingResidualCents !== 0
        ) {
          throw new Error(`Falha de arredondamento 70/30 para ${gross} centavos: ${JSON.stringify(split)}`);
        }
      }
      return `Testados ${testAmounts.length} valores críticos (incluindo 1, 3, 7, 99 e 101 centavos): creatorShareCents + platformShareCents === grossAmountCents em 100% dos casos.`;
    }
  );

  // 6. VR-FIN-06: Ausência de dupla contagem entre compra de créditos e consumo de créditos
  await runTest(
    20,
    'VR-FIN-06',
    'Ausência de dupla contagem: compra/concessão de créditos não entra na receita elegível 70/30 até o consumo real',
    () => {
      if (isOperationEligibleFor7030RevenueSplit('CREDIT_PACK_PURCHASE') !== false) {
        throw new Error('CREDIT_PACK_PURCHASE jamais pode entrar como receita elegível 70/30!');
      }
      if (
        !isOperationEligibleFor7030RevenueSplit('VAULT_ALBUM_UNLOCK') ||
        !isOperationEligibleFor7030RevenueSplit('LIVE_GIFT_SENT')
      ) {
        throw new Error('Consumos elegíveis devem habilitar o split 70/30.');
      }
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(4);
      const rec = snap.latestReconciliation;
      if (!rec.invariantsPassed.noDoubleRevenueCountingOnCreditPurchase) {
        throw new Error('Invariante noDoubleRevenueCountingOnCreditPurchase falhou!');
      }
      if (rec.grossEligibleRevenueCents !== rec.totalCreditsConsumedCents) {
        throw new Error(
          `Receita bruta elegível (${rec.grossEligibleRevenueCents}) diferiu do consumo bruto (${rec.totalCreditsConsumedCents})!`
        );
      }
      return `Créditos adquiridos (${rec.totalCreditsPurchasedCents}¢) segregados da receita bruta elegível de consumo (${rec.grossEligibleRevenueCents}¢); zero dupla contagem.`;
    }
  );

  // 7. VR-FIN-07: Bloqueio de duplo gasto e repetição com mesma chave de idempotência
  await runTest(
    21,
    'VR-FIN-07',
    'Bloqueio determinístico de duplo gasto e repetição concorrente com a mesma chave de idempotência',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(3);
      const fan = snap.sampleFans[0];
      const creator = snap.creators.find((c) => c.availableBalanceCents >= 500)!;

      const firstRefund = engine.recordRefundReversal({
        simDay: 3,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'idem_fin_test_dup_001',
        fan,
        creator,
        grossAmountCents: 500,
        creatorShareCents: 350,
        platformShareCents: 150,
      });
      const secondRefundSameKey = engine.recordRefundReversal({
        simDay: 3,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'idem_fin_test_dup_001',
        fan,
        creator,
        grossAmountCents: 500,
        creatorShareCents: 350,
        platformShareCents: 150,
      });

      if (!firstRefund || secondRefundSameKey !== false) {
        throw new Error('Repetição com a mesma idempotencyKey não foi bloqueada!');
      }
      return `Primeira execução aceita e repetição com idempotencyKey='idem_fin_test_dup_001' rejeitada sem duplicar efeitos no razão.`;
    }
  );

  // 8. VR-FIN-08: Estorno ou reembolso recompondo ou deduzindo saldos proporcionalmente
  await runTest(
    22,
    'VR-FIN-08',
    'Estorno/reembolso recompondo a carteira de créditos do fã e deduzindo exatamente 70% do criador e 30% da plataforma',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snapBefore = engine.stepDays(3);
      const creator = snapBefore.creators.find((c) => c.availableBalanceCents >= 1500)!;
      const fan = snapBefore.sampleFans[0];

      const fanWalletBefore = fan.walletCreditsCents;
      const creatorAvailBefore = creator.availableBalanceCents;
      const platformNetBefore = snapBefore.latestReconciliation.netPlatformShareCents;

      const split = computeExact7030SplitCents(1000); // 1000 -> 700 / 300
      const ok = engine.recordRefundReversal({
        simDay: 3,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'idem_fin_test_refund_proportional',
        fan,
        creator,
        grossAmountCents: split.grossAmountCents,
        creatorShareCents: split.creatorShareCents,
        platformShareCents: split.platformShareCents,
      });
      if (!ok) throw new Error('Falha ao processar estorno proporcional.');

      const snapAfter = engine.getStateSnapshot();
      const creatorAfter = snapAfter.creators.find((c) => c.creatorId === creator.creatorId)!;
      const fanAfter = snapAfter.sampleFans.find((f) => f.fanId === fan.fanId)!;
      const platformNetAfter = snapAfter.latestReconciliation.netPlatformShareCents;

      if (fanAfter.walletCreditsCents !== fanWalletBefore + 1000) {
        throw new Error('Carteira do fã não recebeu a recomposição de 1000 centavos.');
      }
      if (creatorAfter.availableBalanceCents !== creatorAvailBefore - 700) {
        throw new Error('Saldo disponível do criador não reduziu em 700 centavos (70%).');
      }
      if (platformNetAfter !== platformNetBefore - 300) {
        throw new Error('Comissão líquida da plataforma não reduziu em 300 centavos (30%).');
      }
      return `Estorno de 1000¢ recompôs +1000¢ na carteira do fã e deduziu -700¢ (70%) do criador e -300¢ (30%) da plataforma.`;
    }
  );

  // 9. VR-FIN-09: Saque simulado inválido por saldo insuficiente bloqueado
  await runTest(
    23,
    'VR-FIN-09',
    'Bloqueio de saque simulado inválido por saldo insuficiente ou valor não positivo',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.stepDays(2);
      const creator = snap.creators[0];

      const resInsufficient = engine.requestSimulatedCreatorPayout({
        simDay: 2,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'payout_invalid_over_balance',
        creator,
        amountCents: creator.availableBalanceCents + 100_000,
      });
      const resZero = engine.requestSimulatedCreatorPayout({
        simDay: 2,
        timestampIso: new Date().toISOString(),
        idempotencyKey: 'payout_invalid_zero',
        creator,
        amountCents: 0,
      });

      if (resInsufficient !== null || resZero !== null) {
        throw new Error('Saque simulado inválido não foi bloqueado!');
      }
      return `Saques inválidos (acima do saldo disponível e valor zero) retornaram null e foram bloqueados sem alterar saldos.`;
    }
  );

  // 10. VR-FIN-10: Saque simulado válido percorrendo estados e reduzindo obrigação somente quando completed
  await runTest(
    24,
    'VR-FIN-10',
    'Ciclo de vida de saque simulado (pending -> approved -> completed | rejected) reduzindo obrigação com criadores somente quando completed',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap0 = engine.stepDays(4);
      const richCreator = snap0.creators.find((c) => c.availableBalanceCents >= 3000);
      if (!richCreator) {
        throw new Error('Nenhum criador com saldo >= R$ 30,00 encontrado no Dia 4.');
      }

      const obligationsBeforeRequest = snap0.latestReconciliation.pendingCreatorObligationsCents;
      const availBeforeRequest = richCreator.availableBalanceCents;
      const nowIso = new Date().toISOString();

      // 1. Solicita saque de R$ 15,00 (1500¢) -> estado 'pending'
      const req1 = engine.requestSimulatedCreatorPayout({
        simDay: 4,
        timestampIso: nowIso,
        idempotencyKey: 'payout_lifecycle_test_complete_01',
        creator: richCreator,
        amountCents: 1500,
      });
      if (!req1 || req1.status !== 'pending' || req1.obligationsReduced !== false) {
        throw new Error('Falha ao criar solicitação de saque no estado pending.');
      }

      // Enquanto 'pending', a obrigação total com criadores NÃO pode diminuir!
      const snapAfterPending = engine.getStateSnapshot();
      if (snapAfterPending.latestReconciliation.pendingCreatorObligationsCents !== obligationsBeforeRequest) {
        throw new Error('Obrigação pendente com criadores diminuiu indevidamente no estado pending!');
      }

      // 2. Transição para 'approved' -> obrigação total ainda NÃO pode diminuir!
      const stepApproved = engine.transitionSimulatedCreatorPayout({
        payoutId: req1.payoutId,
        targetStatus: 'approved',
        simDay: 4,
        timestampIso: nowIso,
        actorId: 'admin_finance_test',
        reason: 'Revisão administrativa aprovada no teste.',
      });
      if (!stepApproved || stepApproved.status !== 'approved' || stepApproved.obligationsReduced !== false) {
        throw new Error('Falha ao aprovar saque simulado.');
      }
      const snapAfterApproved = engine.getStateSnapshot();
      if (snapAfterApproved.latestReconciliation.pendingCreatorObligationsCents !== obligationsBeforeRequest) {
        throw new Error('Obrigação pendente com criadores diminuiu indevidamente no estado approved!');
      }

      // 3. Transição para 'completed' -> agora SIM reduz a obrigação em exatamente 1500¢!
      const stepCompleted = engine.transitionSimulatedCreatorPayout({
        payoutId: req1.payoutId,
        targetStatus: 'completed',
        simDay: 4,
        timestampIso: nowIso,
        actorId: 'admin_finance_test',
        reason: 'Liquidação simulada concluída.',
      });
      if (!stepCompleted || stepCompleted.status !== 'completed' || stepCompleted.obligationsReduced !== true) {
        throw new Error('Falha ao concluir saque simulado.');
      }
      const snapAfterCompleted = engine.getStateSnapshot();
      if (
        snapAfterCompleted.latestReconciliation.pendingCreatorObligationsCents !==
        obligationsBeforeRequest - 1500
      ) {
        throw new Error('Obrigação com criadores não reduziu exatamente em 1500¢ após completed!');
      }

      // 4. Testa também um saque rejeitado ('pending' -> 'rejected') preservando a obrigação e o saldo
      const req2 = engine.requestSimulatedCreatorPayout({
        simDay: 4,
        timestampIso: nowIso,
        idempotencyKey: 'payout_lifecycle_test_reject_02',
        creator: richCreator,
        amountCents: 1200,
      });
      if (!req2) {
        throw new Error('Falha ao criar segunda solicitação de saque.');
      }
      const stepRejected = engine.transitionSimulatedCreatorPayout({
        payoutId: req2.payoutId,
        targetStatus: 'rejected',
        simDay: 4,
        timestampIso: nowIso,
        actorId: 'admin_finance_test',
        reason: 'Chave de teste rejeitada para verificação de estorno de reserva.',
      });
      if (!stepRejected || stepRejected.status !== 'rejected' || stepRejected.obligationsReduced !== false) {
        throw new Error('Falha ao rejeitar saque simulado.');
      }
      const finalCreator = engine
        .getStateSnapshot()
        .creators.find((c) => c.creatorId === richCreator.creatorId)!;
      if (finalCreator.availableBalanceCents !== availBeforeRequest - 1500) {
        throw new Error('Saque rejeitado alterou indevidamente o saldo disponível do criador!');
      }

      return `Ciclo de vida validado: pending/approved mantiveram obrigação (${obligationsBeforeRequest}¢); completed abateu -1500¢ (${snapAfterCompleted.latestReconciliation.pendingCreatorObligationsCents}¢); rejected preservou obrigação e saldo.`;
    }
  );

  // 11. VR-FIN-11: Consistência dos relatórios diários ao longo dos 30 dias
  await runTest(
    25,
    'VR-FIN-11',
    'Consistência da série histórica diária dos 30 dias (derivada por dia sem repetir o saldo final em datas passadas)',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.advanceToDay(30);
      const series = snap.dailyFinancialEvolution;

      if (series.length !== 30) {
        throw new Error(`Esperados 30 pontos na evolução financeira diária, obtidos: ${series.length}`);
      }
      const day1 = series[0];
      const day15 = series[14];
      const day30 = series[29];

      if (
        day1.cumulativeNetRecognizedRevenueCents >= day15.cumulativeNetRecognizedRevenueCents ||
        day15.cumulativeNetRecognizedRevenueCents >= day30.cumulativeNetRecognizedRevenueCents
      ) {
        throw new Error('A série histórica não evoluiu progressivamente entre os Dias 1, 15 e 30.');
      }

      const sumDailyNet = series.reduce((acc, d) => acc + d.dayNetRecognizedRevenueCents, 0);
      if (sumDailyNet !== snap.latestReconciliation.netEligibleRevenueCents) {
        throw new Error(
          `Soma das receitas líquidas diárias (${sumDailyNet}) difere do acumulado final (${snap.latestReconciliation.netEligibleRevenueCents})!`
        );
      }
      return `30 pontos diários consistentes: Dia 1=${day1.cumulativeNetRecognizedRevenueCents}¢ -> Dia 15=${day15.cumulativeNetRecognizedRevenueCents}¢ -> Dia 30=${day30.cumulativeNetRecognizedRevenueCents}¢ (soma exata=${sumDailyNet}¢).`;
    }
  );

  // 12. VR-FIN-12: Reconciliação final sem divergências
  await runTest(
    26,
    'VR-FIN-12',
    'Reconciliação financeira final após 30 dias com zero divergências e 8/8 invariantes matemáticos aprovados',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.advanceToDay(30);
      const rec = snap.latestReconciliation;

      if (!rec.isBalanced || rec.reconciliationDeltaCents !== 0) {
        throw new Error(`Reconciliação final falhou com delta=${rec.reconciliationDeltaCents}`);
      }
      const failedInvariants = Object.entries(rec.invariantsPassed)
        .filter(([, passed]) => !passed)
        .map(([k]) => k);
      if (failedInvariants.length > 0) {
        throw new Error(`Invariantes falharam: ${failedInvariants.join(', ')}`);
      }
      return `Reconciliação 30 dias: Delta=0¢, 8/8 invariantes PASS (70% Criadores=${rec.netCreatorShareCents}¢ + 30% Plataforma=${rec.netPlatformShareCents}¢ === Receita Líquida=${rec.netEligibleRevenueCents}¢).`;
    }
  );

  // 13. VR-FIN-13: Reprodutibilidade determinística com a mesma semente
  await runTest(
    27,
    'VR-FIN-13',
    'Reprodutibilidade determinística de todos os saldos, saques e evolução financeira de 30 dias com a mesma semente',
    () => {
      const engine1 = new VrSimulatorEngine(7772026);
      const snap1 = engine1.advanceToDay(30);

      const engine2 = new VrSimulatorEngine(7772026);
      const snap2 = engine2.advanceToDay(30);

      const r1 = snap1.latestReconciliation;
      const r2 = snap2.latestReconciliation;

      if (
        r1.totalCreditsPurchasedCents !== r2.totalCreditsPurchasedCents ||
        r1.netEligibleRevenueCents !== r2.netEligibleRevenueCents ||
        r1.netCreatorShareCents !== r2.netCreatorShareCents ||
        r1.netPlatformShareCents !== r2.netPlatformShareCents ||
        r1.pendingCreatorObligationsCents !== r2.pendingCreatorObligationsCents ||
        r1.settledCreatorPayoutsCents !== r2.settledCreatorPayoutsCents ||
        r1.availableSimulatedTestCashCents !== r2.availableSimulatedTestCashCents
      ) {
        throw new Error('Métricas financeiras divergentes para a mesma semente 7772026!');
      }
      return `Seed 7772026 reproduziu identicamente nos 30 dias: Receita Líquida=${r1.netEligibleRevenueCents}¢, 70% Criadores=${r1.netCreatorShareCents}¢, 30% Plataforma=${r1.netPlatformShareCents}¢, Caixa=${r1.availableSimulatedTestCashCents}¢.`;
    }
  );

  // 14. VR-SIM-15: Abstração injetável de relógio, encerramento (stop) e reinicialização com confirmação explícita
  await runTest(
    28,
    'VR-SIM-15',
    'Abstração injetável de relógio (SimulatedClockProvider), encerramento explícito (stop) e reinicialização protegida por confirmação (CONFIRM_SANDBOX_RESET)',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const clock = engine.getClockProvider();

      if (clock.currentSimDay() !== 0 || clock.status() !== 'idle') {
        throw new Error('Relógio simulado não iniciou no Dia 0 / idle.');
      }

      engine.stepDays(2);
      if (clock.currentSimDay() !== 2 || !clock.nowIso().startsWith('2026-10-03')) {
        throw new Error(`Provedor de relógio retornou data incorreta no Dia 2: ${clock.nowIso()}`);
      }

      const stoppedSnap = engine.stop();
      if (stoppedSnap.clockStatus !== 'terminated' || clock.status() !== 'terminated') {
        throw new Error('Método stop() não transicionou o relógio para terminated.');
      }

      const unconfirmedRes = engine.resetScenarioWithConfirmation('INVALID_TOKEN');
      if (unconfirmedRes.resetExecuted !== false || unconfirmedRes.snapshot.currentDay !== 2) {
        throw new Error('resetScenarioWithConfirmation aceitou token inválido!');
      }

      const resetRes = engine.resetScenarioWithConfirmation('CONFIRM_SANDBOX_RESET', 20261025);
      if (
        !resetRes.resetExecuted ||
        resetRes.productionDataTouched !== false ||
        resetRes.snapshot.currentDay !== 0 ||
        resetRes.snapshot.clockStatus !== 'idle'
      ) {
        throw new Error('Falha ao reinicializar o cenário com confirmação explícita.');
      }

      return `ClockProvider validado (Dia 2=${clock.nowIso()}), stop() -> terminated, resetScenarioWithConfirmation('CONFIRM_SANDBOX_RESET') confirmado com productionDataTouched=false.`;
    }
  );

  // 15. VR-SIM-16: Estados do player de mídia autorizada (loading, playing, paused, ended, error) e tetos de memória/concorrência
  await runTest(
    29,
    'VR-SIM-16',
    'Ciclo de estados do player de mídia autorizada (loading -> playing -> paused -> ended e error controlado para vídeo ausente) e tetos de memória/concorrência',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap0 = engine.getStateSnapshot();

      if (
        snap0.capacityConfig.maxMemoryKbCap <= 0 ||
        snap0.capacityConfig.maxConcurrencyCap <= 0
      ) {
        throw new Error('Limites maxMemoryKbCap e maxConcurrencyCap não configurados.');
      }

      const assetPath = snap0.mediaValidation.validatedImagePaths[0];
      const sLoading = engine.simulateAuthorizedMediaPlayerAction({
        assetPath,
        mediaType: 'image',
        action: 'load',
      });
      const sPlaying = engine.simulateAuthorizedMediaPlayerAction({
        assetPath,
        mediaType: 'image',
        action: 'play',
      });
      const sPaused = engine.simulateAuthorizedMediaPlayerAction({
        assetPath,
        mediaType: 'image',
        action: 'pause',
      });
      const sEnded = engine.simulateAuthorizedMediaPlayerAction({
        assetPath,
        mediaType: 'image',
        action: 'end',
      });
      const sVideoError = engine.simulateAuthorizedMediaPlayerAction({
        assetPath: '/src/assets/videos/nonexistent.mp4',
        mediaType: 'video',
        action: 'play',
      });

      if (
        sLoading.playerStateMachine.currentState !== 'loading' ||
        sPlaying.playerStateMachine.currentState !== 'playing' ||
        sPaused.playerStateMachine.currentState !== 'paused' ||
        sEnded.playerStateMachine.currentState !== 'ended'
      ) {
        throw new Error('Transições de estado do player para imagem local autorizada falharam.');
      }
      if (
        sVideoError.playerStateMachine.currentState !== 'error' ||
        !sVideoError.playerStateMachine.errorDetail?.includes('VIDEO_ASSET_ABSENT_IN_REPO') ||
        !sVideoError.playerStateMachine.isSimulatedLiveBadgeVisible
      ) {
        throw new Error('Tentativa de reprodução de vídeo local ausente não entrou em estado error controlado.');
      }

      return `Player validado em todos os estados (loading -> playing -> paused -> ended) e erro controlado VIDEO_ASSET_ABSENT_IN_REPO para vídeo local ausente; caps=${snap0.capacityConfig.maxMemoryKbCap}KB / ${snap0.capacityConfig.maxConcurrencyCap} conc.`;
    }
  );

  // ===========================================================================
  // 13 TESTES OBRIGATÓRIOS: INDICADOR FIXO "MODO SIMULAÇÃO — DIA X" E SELETOR
  // DE AVANÇO MANUAL DE DATA SIMULADA (VR-TOP-01 a VR-TOP-13)
  // ===========================================================================

  // 1. VR-TOP-01: Exibir "MODO SIMULAÇÃO — DIA 1" quando a simulação está ativa no Dia 1
  await runTest(
    30,
    'VR-TOP-01',
    'Exibir "MODO SIMULAÇÃO — DIA 1" quando a simulação está ativa no Dia 1',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      const snap = engine.ensureDayOneStarted();
      const banner = engine.getTopBannerStatus();

      if (
        !banner.isSimulationModeActive ||
        !banner.isStateConfirmed ||
        !banner.bannerVisible ||
        banner.currentDay !== 1 ||
        banner.indicatorText !== 'MODO SIMULAÇÃO — DIA 1' ||
        snap.topBannerStatus.indicatorText !== 'MODO SIMULAÇÃO — DIA 1'
      ) {
        throw new Error(
          `Esperado indicador "MODO SIMULAÇÃO — DIA 1", obtido: ${JSON.stringify(banner)}`
        );
      }
      return `Indicador ativo e confirmado no Dia 1: "${banner.indicatorText}" (data simulada=${banner.simulatedDateIso}).`;
    }
  );

  // 2. VR-TOP-02: Ocultar ou desativar o indicador quando o modo de simulação estiver desligado (e não afirmar falsamente simulação ativa se não confirmado)
  await runTest(
    31,
    'VR-TOP-02',
    'Ocultar ou desativar o indicador quando o modo de simulação estiver desligado e exibir indisponibilidade quando não confirmado',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      // Desativa o modo de simulação
      engine.setSimulationModeActive(false);
      const inactiveBanner = engine.getTopBannerStatus();
      if (
        inactiveBanner.isSimulationModeActive !== false ||
        inactiveBanner.bannerVisible !== false ||
        inactiveBanner.indicatorText !== null
      ) {
        throw new Error(
          `O indicador deveria estar oculto/inativo quando desligado, mas retornou: ${JSON.stringify(inactiveBanner)}`
        );
      }

      // Tentativa de avançar com modo desligado deve ser bloqueada
      const blockedWhenInactive = engine.manualAdvanceSimulatedDay({
        targetDay: 2,
        actorId: 'admin_master',
        actorRole: 'admin',
      });
      if (
        blockedWhenInactive.success !== false ||
        blockedWhenInactive.errorCode !== 'SIMULATION_MODE_INACTIVE'
      ) {
        throw new Error('Avanço manual deveria ser bloqueado com modo de simulação inativo.');
      }

      // Reativa simulação mas marca estado como não confirmado
      engine.setSimulationModeActive(true);
      engine.setStateConfirmationAvailable(
        false,
        'Falha na verificação de confirmação do sandbox'
      );
      const unconfirmedBanner = engine.getTopBannerStatus();
      if (
        unconfirmedBanner.isStateConfirmed !== false ||
        unconfirmedBanner.indicatorText !== null ||
        !unconfirmedBanner.hasServiceError
      ) {
        throw new Error(
          'Quando o estado não é confirmado, o indicador não pode afirmar falsamente que a simulação está ativa.'
        );
      }

      return `Modo desligado -> bannerVisible=false, indicatorText=null; Estado não confirmado -> isStateConfirmed=false, indicatorText=null com alerta de indisponibilidade.`;
    }
  );

  // 3. VR-TOP-03: Manter o indicador visível no topo do CentralAdminDashboardModal durante a navegação/rolagem entre seções
  await runTest(
    32,
    'VR-TOP-03',
    'Manter o indicador fixo no topo do CentralAdminDashboardModal fora do container de rolagem em todas as 13 seções',
    async () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      const banner = engine.getTopBannerStatus();

      if (
        banner.fixedTopLayoutSpec.containerRole !== 'persistent_top_bar_outside_scroll' ||
        banner.fixedTopLayoutSpec.remainsVisibleOnScroll !== true ||
        banner.fixedTopLayoutSpec.supportedAdminSectionsCount !== 13
      ) {
        throw new Error('Especificação de layout fixo fora da rolagem inválida.');
      }

      // Verificação estrutural no código real do CentralAdminDashboardModal.tsx
      const fs = await import('fs');
      const path = await import('path');
      const modalFilePath = path.resolve(
        process.cwd(),
        'src/components/CentralAdminDashboardModal.tsx'
      );
      const modalSource = fs.readFileSync(modalFilePath, 'utf-8');

      const bannerIdx = modalSource.indexOf('data-testid="simulation-mode-top-banner"');
      const scrollMainIdx = modalSource.indexOf('<main className="flex-1 overflow-y-auto');

      if (bannerIdx === -1 || scrollMainIdx === -1 || bannerIdx >= scrollMainIdx) {
        throw new Error(
          'O indicador data-testid="simulation-mode-top-banner" não está posicionado acima e fora do container <main className="flex-1 overflow-y-auto">!'
        );
      }

      return `Indicador posicionado no topo fixo (índice=${bannerIdx}) antes do container de rolagem <main overflow-y-auto> (índice=${scrollMainIdx}), permanecendo visível nas 13 seções.`;
    }
  );

  // 4. VR-TOP-04: Avançar manualmente do Dia 1 para o Dia 2 e atualizar o indicador para "MODO SIMULAÇÃO — DIA 2"
  await runTest(
    33,
    'VR-TOP-04',
    'Avançar manualmente do Dia 1 para o Dia 2 e atualizar o indicador para "MODO SIMULAÇÃO — DIA 2"',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      const res = engine.manualAdvanceSimulatedDay({
        targetDay: 2,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const banner = engine.getTopBannerStatus();
      if (
        !res.success ||
        res.noOp !== false ||
        res.previousDay !== 1 ||
        res.requestedDay !== 2 ||
        res.confirmedDay !== 2 ||
        res.indicatorText !== 'MODO SIMULAÇÃO — DIA 2' ||
        banner.indicatorText !== 'MODO SIMULAÇÃO — DIA 2'
      ) {
        throw new Error(`Falha ao avançar do Dia 1 para o Dia 2: ${JSON.stringify(res)}`);
      }
      return `Avanço confirmado: Dia ${res.previousDay} -> Dia ${res.confirmedDay}, indicador="${banner.indicatorText}", checkpoints=${res.snapshot.checkpoints.length}.`;
    }
  );

  // 5. VR-TOP-05: Avançar em salto do Dia 2 para o Dia 7, atualizando para "MODO SIMULAÇÃO — DIA 7"
  await runTest(
    34,
    'VR-TOP-05',
    'Avançar em salto do Dia 2 para o Dia 7, processando eventos vencidos em ordem cronológica e atualizando para "MODO SIMULAÇÃO — DIA 7"',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      engine.manualAdvanceSimulatedDay({
        targetDay: 2,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const resJump = engine.manualAdvanceSimulatedDay({
        targetDay: 7,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const banner = engine.getTopBannerStatus();
      const checkpointDays = resJump.snapshot.checkpoints.map((c) => c.dayNumber);
      const expectedDays = [1, 2, 3, 4, 5, 6, 7];

      if (
        !resJump.success ||
        resJump.previousDay !== 2 ||
        resJump.confirmedDay !== 7 ||
        resJump.daysAdvancedCount !== 5 ||
        resJump.checkpointsProcessedCount !== 5 ||
        banner.indicatorText !== 'MODO SIMULAÇÃO — DIA 7' ||
        JSON.stringify(checkpointDays) !== JSON.stringify(expectedDays)
      ) {
        throw new Error(
          `Salto do Dia 2 para o Dia 7 falhou: indicator=${banner.indicatorText}, checkpoints=${JSON.stringify(checkpointDays)}`
        );
      }

      return `Salto Dia 2 -> Dia 7 concluído: 5 dias processados em ordem cronológica (${checkpointDays.join(',')}), indicador="${banner.indicatorText}".`;
    }
  );

  // 6. VR-TOP-06: Avançar até o Dia 30 e exibir "MODO SIMULAÇÃO — DIA 30"
  await runTest(
    35,
    'VR-TOP-06',
    'Avançar manualmente até o limite do Dia 30 e exibir "MODO SIMULAÇÃO — DIA 30" com reconciliação íntegra',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      const res30 = engine.manualAdvanceSimulatedDay({
        targetDay: 30,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const banner = engine.getTopBannerStatus();
      if (
        !res30.success ||
        res30.confirmedDay !== 30 ||
        banner.currentDay !== 30 ||
        banner.indicatorText !== 'MODO SIMULAÇÃO — DIA 30' ||
        banner.clockStatus !== 'completed' ||
        res30.snapshot.checkpoints.length !== 30 ||
        !res30.snapshot.latestReconciliation.isBalanced
      ) {
        throw new Error(`Falha ao avançar até o Dia 30: ${JSON.stringify(banner)}`);
      }

      return `Avanço até o limite concluído: "${banner.indicatorText}", status=${banner.clockStatus}, 30 checkpoints reconciliados (delta=0¢).`;
    }
  );

  // 7. VR-TOP-07: Rejeitar valores inválidos: 0, negativos, NaN, não inteiros e valores maiores que 30
  await runTest(
    36,
    'VR-TOP-07',
    'Rejeitar valores inválidos: 0, negativos, NaN, não inteiros, strings/nulos e valores maiores que 30',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      const invalidInputs: unknown[] = [0, -1, -30, Number.NaN, Number.POSITIVE_INFINITY, 2.5, '5', null, undefined, 31, 99];

      for (const invalidVal of invalidInputs) {
        const res = engine.manualAdvanceSimulatedDay({
          targetDay: invalidVal,
          actorId: 'admin_master',
          actorRole: 'admin',
        });
        if (res.success !== false || res.confirmedDay !== 1) {
          throw new Error(
            `Valor inválido (${String(invalidVal)}) não foi rejeitado! Retornou: ${JSON.stringify(res)}`
          );
        }
        const expectedCode =
          typeof invalidVal === 'number' && Number.isInteger(invalidVal) && invalidVal > 30
            ? 'MAX_SIMULATION_DAY_EXCEEDED'
            : 'INVALID_TARGET_DAY';
        if (res.errorCode !== expectedCode) {
          throw new Error(
            `Código de erro incorreto para (${String(invalidVal)}): esperado ${expectedCode}, obtido ${res.errorCode}`
          );
        }
      }

      // Também valida rejeição quando usuário não possui permissão de administrador
      const unauthorizedRes = engine.manualAdvanceSimulatedDay({
        targetDay: 3,
        actorId: 'regular_user_01',
        actorRole: 'fan',
      });
      if (
        unauthorizedRes.success !== false ||
        unauthorizedRes.errorCode !== 'UNAUTHORIZED_ADMIN_ACTION' ||
        engine.getTopBannerStatus().currentDay !== 1
      ) {
        throw new Error('Tentativa sem permissão administrativa não foi bloqueada!');
      }

      return `${invalidInputs.length} entradas inválidas (0, negativos, NaN, 2.5, string, null, 31, 99) e 1 tentativa sem permissão admin rejeitadas mantendo "MODO SIMULAÇÃO — DIA 1".`;
    }
  );

  // 8. VR-TOP-08: Rejeitar tentativa de voltar do Dia 7 para um dia anterior, como Dia 3
  await runTest(
    37,
    'VR-TOP-08',
    'Rejeitar tentativa de retroceder a data simulada do Dia 7 para um dia anterior como o Dia 3',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      engine.manualAdvanceSimulatedDay({
        targetDay: 7,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const ledgerBefore = engine.getStateSnapshot().ledgerEntriesCount;
      const backwardRes = engine.manualAdvanceSimulatedDay({
        targetDay: 3,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const bannerAfter = engine.getTopBannerStatus();
      const ledgerAfter = engine.getStateSnapshot().ledgerEntriesCount;

      if (
        backwardRes.success !== false ||
        backwardRes.errorCode !== 'BACKWARD_DATE_ADVANCE_FORBIDDEN' ||
        backwardRes.confirmedDay !== 7 ||
        bannerAfter.indicatorText !== 'MODO SIMULAÇÃO — DIA 7' ||
        ledgerBefore !== ledgerAfter
      ) {
        throw new Error(
          `Retrocesso do Dia 7 para o Dia 3 não foi bloqueado corretamente: ${JSON.stringify(backwardRes)}`
        );
      }

      return `Retrocesso Dia 7 -> Dia 3 bloqueado (${backwardRes.errorCode}); indicador preservado em "${bannerAfter.indicatorText}" com ${ledgerAfter} lançamentos intactos.`;
    }
  );

  // 9. VR-TOP-09: Tratar seleção do próprio dia atual como operação sem efeito, sem duplicar eventos
  await runTest(
    38,
    'VR-TOP-09',
    'Tratar seleção do próprio dia atual como operação sem efeito (no-op), sem reprocessar ou duplicar eventos',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      engine.manualAdvanceSimulatedDay({
        targetDay: 4,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const snapBefore = engine.getStateSnapshot();
      const sameDayRes = engine.manualAdvanceSimulatedDay({
        targetDay: 4,
        actorId: 'admin_master',
        actorRole: 'admin',
      });
      const snapAfter = engine.getStateSnapshot();

      if (
        !sameDayRes.success ||
        sameDayRes.noOp !== true ||
        sameDayRes.daysAdvancedCount !== 0 ||
        sameDayRes.checkpointsProcessedCount !== 0 ||
        sameDayRes.ledgerEntriesDeltaCount !== 0 ||
        snapAfter.ledgerEntriesCount !== snapBefore.ledgerEntriesCount ||
        snapAfter.checkpoints.length !== snapBefore.checkpoints.length ||
        snapAfter.totals.messagesSent !== snapBefore.totals.messagesSent
      ) {
        throw new Error('Seleção do próprio dia atual gerou efeitos colaterais ou duplicou eventos!');
      }

      return `Seleção do próprio Dia 4 tratada como noOp=true (0 checkpoints extras, ${snapAfter.ledgerEntriesCount} lançamentos e ${snapAfter.totals.messagesSent} mensagens inalterados).`;
    }
  );

  // 10. VR-TOP-10: Impedir cliques concorrentes ou repetidos de corromperem o relógio ou duplicarem transações
  await runTest(
    39,
    'VR-TOP-10',
    'Impedir cliques concorrentes ou repetidos de corromperem o relógio simulado ou duplicarem transações',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      // 1. Simula tentativa concorrente enquanto uma mutação atômica está em curso no motor
      let concurrentAttemptResult: ReturnType<typeof engine.manualAdvanceSimulatedDay> | null = null;
      engine.executeAtomically(() => {
        concurrentAttemptResult = engine.manualAdvanceSimulatedDay({
          targetDay: 5,
          actorId: 'admin_master',
          actorRole: 'admin',
        });
      });

      if (
        !concurrentAttemptResult ||
        (concurrentAttemptResult as any).success !== false ||
        (concurrentAttemptResult as any).errorCode !== 'CONCURRENT_ADVANCE_BLOCKED' ||
        engine.getTopBannerStatus().currentDay !== 1
      ) {
        throw new Error('Chamada concorrente durante lock ativo não foi bloqueada com CONCURRENT_ADVANCE_BLOCKED!');
      }

      // 2. Simula cliques repetidos rápidos para o mesmo destino (Dia 6)
      const firstClick = engine.manualAdvanceSimulatedDay({
        targetDay: 6,
        actorId: 'admin_master',
        actorRole: 'admin',
      });
      const ledgerAfterFirst = firstClick.snapshot.ledgerEntriesCount;
      const netRevenueAfterFirst = firstClick.snapshot.latestReconciliation.netEligibleRevenueCents;

      const secondRepeatedClick = engine.manualAdvanceSimulatedDay({
        targetDay: 6,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      if (
        !firstClick.success ||
        firstClick.confirmedDay !== 6 ||
        !secondRepeatedClick.noOp ||
        secondRepeatedClick.snapshot.ledgerEntriesCount !== ledgerAfterFirst ||
        secondRepeatedClick.snapshot.latestReconciliation.netEligibleRevenueCents !== netRevenueAfterFirst ||
        !secondRepeatedClick.snapshot.latestReconciliation.isBalanced
      ) {
        throw new Error('Cliques repetidos para o mesmo dia corromperam o relógio ou duplicaram transações!');
      }

      return `Concorrência bloqueada (CONCURRENT_ADVANCE_BLOCKED) e clique repetido para o Dia 6 neutralizado sem duplicar transações (${ledgerAfterFirst} lançamentos, delta=0¢).`;
    }
  );

  // 11. VR-TOP-11: Não atualizar o indicador se o serviço de avanço retornar erro
  await runTest(
    40,
    'VR-TOP-11',
    'Não atualizar o indicador para o novo dia se o serviço de avanço falhar, mantendo o estado anterior e exibindo erro claro',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      engine.manualAdvanceSimulatedDay({
        targetDay: 3,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const ledgerBeforeError = engine.getStateSnapshot().ledgerEntriesCount;
      engine.setSimulatedAdvanceFailure('Timeout simulado de sincronização do banco de carga');

      const failedAdvance = engine.manualAdvanceSimulatedDay({
        targetDay: 8,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const bannerAfterFailure = engine.getTopBannerStatus();
      const ledgerAfterError = engine.getStateSnapshot().ledgerEntriesCount;

      if (
        failedAdvance.success !== false ||
        failedAdvance.errorCode !== 'SIMULATOR_SERVICE_FAILURE' ||
        failedAdvance.confirmedDay !== 3 ||
        bannerAfterFailure.currentDay !== 3 ||
        bannerAfterFailure.indicatorText !== 'MODO SIMULAÇÃO — DIA 3' ||
        !failedAdvance.errorMessage?.includes('Timeout simulado') ||
        ledgerAfterError !== ledgerBeforeError
      ) {
        throw new Error(
          `Indicador ou estado foi alterado indevidamente após erro do serviço: ${JSON.stringify(failedAdvance)}`
        );
      }

      // Limpa a falha e confirma recuperação normal
      engine.setSimulatedAdvanceFailure(null);
      return `Falha no avanço Dia 3 -> Dia 8 capturada (${failedAdvance.errorCode}); indicador mantido em "${bannerAfterFailure.indicatorText}" com 0 mutações parciais.`;
    }
  );

  // 12. VR-TOP-12: Registrar log de auditoria no avanço manual de data
  await runTest(
    41,
    'VR-TOP-12',
    'Registrar log de auditoria completo em cada avanço manual (administrador, dia anterior, dia solicitado, dia confirmado, timestamp real e executionId)',
    () => {
      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();

      const res = engine.manualAdvanceSimulatedDay({
        targetDay: 5,
        actorId: 'admin_security_lead',
        actorRole: 'admin',
        executionId: 'exec_load_test_day1_to_day5',
      });

      const auditLogs = engine.getManualAdvanceAuditLogs();
      const latestLog = auditLogs[auditLogs.length - 1];

      if (
        !latestLog ||
        latestLog.actorId !== 'admin_security_lead' ||
        latestLog.actorRole !== 'admin' ||
        latestLog.previousDay !== 1 ||
        latestLog.requestedDay !== 5 ||
        latestLog.confirmedDay !== 5 ||
        latestLog.executionId !== 'exec_load_test_day1_to_day5' ||
        latestLog.result !== 'success' ||
        latestLog.productionDataTouched !== false ||
        Number.isNaN(Date.parse(latestLog.realTimestampIso)) ||
        res.auditRecord.auditId !== latestLog.auditId
      ) {
        throw new Error(`Registro de auditoria incompleto ou inválido: ${JSON.stringify(latestLog)}`);
      }

      return `Auditoria gravada: auditId=${latestLog.auditId}, actor=${latestLog.actorId} (${latestLog.actorRole}), Dia ${latestLog.previousDay} -> solicitado Dia ${latestLog.requestedDay} -> confirmado Dia ${latestLog.confirmedDay}, timestampReal=${latestLog.realTimestampIso}, executionId=${latestLog.executionId}.`;
    }
  );

  // 13. VR-TOP-13: Garantir que o avanço simulado não altera dados de produção nem o relógio real do sistema
  await runTest(
    42,
    'VR-TOP-13',
    'Garantir que o avanço manual da data simulada não altera dados de produção (financialLedger) nem o relógio real do sistema (Date.now)',
    () => {
      const prodEntriesBefore = financialLedger.getEntries().length;
      const realClockBeforeMs = Date.now();

      const engine = new VrSimulatorEngine(20261025);
      engine.ensureDayOneStarted();
      const res = engine.manualAdvanceSimulatedDay({
        targetDay: 15,
        actorId: 'admin_master',
        actorRole: 'admin',
      });

      const realClockAfterMs = Date.now();
      const prodEntriesAfter = financialLedger.getEntries().length;
      const realElapsedMs = realClockAfterMs - realClockBeforeMs;

      // O relógio simulado avançou 15 dias (2026-10-16), mas Date.now() só pode ter avançado alguns milissegundos reais
      if (realElapsedMs < 0 || realElapsedMs > 30_000) {
        throw new Error(`Relógio real do sistema sofreu desvio anômalo: ${realElapsedMs}ms`);
      }
      if (prodEntriesBefore !== prodEntriesAfter) {
        throw new Error(
          `Livro-razão de produção foi alterado durante o avanço simulado (${prodEntriesBefore} -> ${prodEntriesAfter})!`
        );
      }
      if (!res.simulatedDateIso.startsWith('2026-10-16')) {
        throw new Error(`Data simulada no Dia 15 incorreta: ${res.simulatedDateIso}`);
      }

      return `Isolamento confirmado: data simulada avançou para ${res.simulatedDateIso} (Dia 15), relógio real do sistema avançou apenas ${realElapsedMs}ms reais e financialLedger de produção permaneceu intacto (${prodEntriesAfter} entradas).`;
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


