/**
 * JOBS — SUÍTE DE 12 TESTES OBRIGATÓRIOS: RANKING MENSAL GAROTO JOBS E GAROTA JOBS
 *
 * Verifica de forma determinística todos os 12 cenários exigidos pela Seção 10 da especificação.
 */

import {
  monthlyRecognitionService,
  DEFAULT_SCORING_FORMULA,
  CreatorComplianceProfile,
  CreatorTransactionRecord,
  CreatorContentActivityRecord,
} from '../monthlyRecognitionService';

export interface MonthlyRecognitionTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface MonthlyRecognitionTestSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: MonthlyRecognitionTestResult[];
}

export async function runMonthlyRecognitionTestSuite(): Promise<MonthlyRecognitionTestSummary> {
  const results: MonthlyRecognitionTestResult[] = [];
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
    } catch (err) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        evidence: '',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Reset clean state before running tests
  monthlyRecognitionService.resetEnvironmentState('sandbox');
  monthlyRecognitionService.resetEnvironmentState('production');

  // 1. Elegibilidade automática dos criadores elegíveis
  await runTest(
    1,
    'MR-01-AUTO-ELIGIBILITY',
    'Elegibilidade automática dos criadores elegíveis sem necessidade de inscrição manual',
    () => {
      const cycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const garotaIds = cycle.candidatesGarota.map((c) => c.creatorId);
      const garotoIds = cycle.candidatesGaroto.map((c) => c.creatorId);

      if (!garotaIds.includes('valentina') || !garotaIds.includes('isabella') || !garotaIds.includes('camila')) {
        throw new Error(`Candidatas elegíveis esperadas não incluídas automaticamente: ${garotaIds.join(', ')}`);
      }
      if (!garotoIds.includes('gabriel') || !garotoIds.includes('lucas')) {
        throw new Error(`Candidatos elegíveis esperados não incluídos automaticamente: ${garotoIds.join(', ')}`);
      }
      return `Elegibilidade automática confirmada: Garota JOBS=[${garotaIds.join(', ')}], Garoto JOBS=[${garotoIds.join(', ')}].`;
    }
  );

  // 2. Exclusão correta de criadores inelegíveis, com motivo rastreável
  await runTest(
    2,
    'MR-02-INELIGIBLE-EXCLUSION',
    'Exclusão correta de criadores inelegíveis com motivos documentados e rastreáveis',
    () => {
      const cycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const blocked = cycle.ineligibleCandidates.find((c) => c.creatorId === 'creator_blocked_fraud');
      const noKyc = cycle.ineligibleCandidates.find((c) => c.creatorId === 'creator_incomplete_kyc');

      if (!blocked || blocked.eligibility.isEligible || blocked.eligibility.ineligibilityReasons.length === 0) {
        throw new Error('Conta com fraude confirmada não foi excluída ou está sem motivo rastreável.');
      }
      if (!noKyc || noKyc.eligibility.isEligible || noKyc.eligibility.ineligibilityReasons.length === 0) {
        throw new Error('Conta sem verificação KYC 18+ não foi excluída ou está sem motivo rastreável.');
      }
      return `Excluídos com motivos rastreáveis: creator_blocked_fraud ("${blocked.eligibility.ineligibilityReasons[0]}") e creator_incomplete_kyc ("${noKyc.eligibility.ineligibilityReasons[0]}").`;
    }
  );

  // 3. Cálculo e normalização de cada componente da pontuação (0 a 100)
  await runTest(
    3,
    'MR-03-COMPONENT-NORMALIZATION',
    'Cálculo e normalização de cada componente da pontuação na escala 0 a 100 (com trava anti-spam)',
    () => {
      const baseProfile: CreatorComplianceProfile = {
        creatorId: 'test_norm',
        publicName: 'Creator Norm',
        handle: '@norm',
        avatarUrl: '/avatar.jpg',
        declaredCategory: 'garota_jobs',
        categoryUpdatedAt: '2026-10-01T00:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-01-01',
        fraudStage: 'clean',
        unconfirmedReportsCount: 0,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      };

      // Receita líquida acima do benchmark (deve limitar em 100.00) e 10 uploads no mesmo dia (trava anti-spam = máx 2/dia)
      const txs: CreatorTransactionRecord[] = [
        {
          transactionId: 'tx_norm_1',
          idempotencyKey: 'idem_norm_1',
          creatorId: 'test_norm',
          grossAmountBrl: 50000,
          platformCommissionBrl: 15000,
          gatewayFeeBrl: 500,
          refundedAmountBrl: 0,
          status: 'posted',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-10T12:00:00.000Z',
          buyerId: 'b1',
        },
      ];
      const sameDaySpamUploads: CreatorContentActivityRecord[] = Array.from({ length: 10 }, (_, idx) => ({
        contentId: `spam_${idx}`,
        creatorId: 'test_norm',
        publishedAt: '2026-10-10T14:00:00.000Z',
        moderationStatus: 'approved',
        isDuplicateOrSpam: false,
        isSyntheticOrTest: false,
        environment: 'sandbox',
        uniqueUnlocksCount: 10,
      }));

      const evaluated = monthlyRecognitionService.evaluateCreatorCandidate(
        baseProfile,
        txs,
        sameDaySpamUploads,
        '2026-10-01T00:00:00.000Z',
        '2026-10-31T23:59:59.999Z',
        'sandbox'
      );

      if (evaluated.scores.economicScore !== 100) {
        throw new Error(`Nota econômica deveria ser normalizada em 100, obteve ${evaluated.scores.economicScore}`);
      }
      if (evaluated.scores.cappedUploadsScoredCount !== 2 || evaluated.scores.excludedSpamOrDuplicateUploadsCount !== 8) {
        throw new Error(
          `Trava anti-spam falhou: esperados 2 uploads pontuados no mesmo dia e 8 descartados, obteve ${evaluated.scores.cappedUploadsScoredCount}`
        );
      }
      if (evaluated.scores.integrityScore !== 100) {
        throw new Error(`Nota de integridade deveria ser 100, obteve ${evaluated.scores.integrityScore}`);
      }
      return `Componentes normalizados [0..100]: Econômica=${evaluated.scores.economicScore}, Conteúdo=${evaluated.scores.contentScore} (2/10 uploads pontuados no dia), Integridade=${evaluated.scores.integrityScore}.`;
    }
  );

  // 4. Aplicação correta dos pesos (50/30/20) e dos critérios de desempate
  await runTest(
    4,
    'MR-04-WEIGHTS-AND-TIEBREAKERS',
    'Aplicação exata dos pesos (50% Econômica, 30% Conteúdo, 20% Integridade) e critérios determinísticos de desempate',
    () => {
      const cycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const top = cycle.candidatesGarota[0];
      const expectedFinal = Number(
        (
          0.5 * top.scores.economicScore +
          0.3 * top.scores.contentScore +
          0.2 * top.scores.integrityScore
        ).toFixed(2)
      );
      if (top.scores.finalScore !== expectedFinal) {
        throw new Error(`Fórmula 50/30/20 divergente: esperado ${expectedFinal}, obteve ${top.scores.finalScore}`);
      }

      // Simula dois candidatos empatados em finalScore, desempatando por maior nota econômica e menor estorno
      const candA = {
        ...top,
        creatorId: 'cand_a',
        scores: { ...top.scores, finalScore: 85.0, economicScore: 90.0, confirmedRefundRatePct: 1.5 },
      };
      const candB = {
        ...top,
        creatorId: 'cand_b',
        scores: { ...top.scores, finalScore: 85.0, economicScore: 92.0, confirmedRefundRatePct: 0.5 },
      };
      const sorted = monthlyRecognitionService.sortCandidatesDeterministically([candA, candB]);
      if (sorted[0].creatorId !== 'cand_b') {
        throw new Error('Desempate determinístico falhou ao priorizar maior nota econômica.');
      }
      return `Fórmula validada (${top.publicName}: ${top.scores.finalScore} pts) e desempate determinístico confirmado (#1=${sorted[0].creatorId}).`;
    }
  );

  // 5. Tratamento de transações pendentes, canceladas, duplicadas, estornadas e reembolsadas
  await runTest(
    5,
    'MR-05-TRANSACTION-FILTERING',
    'Descarte de transações pendentes, canceladas e duplicadas (idempotência) e dedução de estornos/reembolsos',
    () => {
      const profile: CreatorComplianceProfile = {
        creatorId: 'tx_tester',
        publicName: 'Tx Tester',
        handle: '@tx.tester',
        avatarUrl: '/a.jpg',
        declaredCategory: 'garoto_jobs',
        categoryUpdatedAt: '2026-10-01T00:00:00.000Z',
        accountStatus: 'active',
        kycVerified18Plus: true,
        consentTermsAccepted: true,
        verifiedSinceDate: '2026-01-01',
        fraudStage: 'clean',
        unconfirmedReportsCount: 0,
        confirmedViolationsCount: 0,
        auditTelemetryComplete: true,
        isSyntheticOrTestAccount: false,
        environment: 'sandbox',
      };

      const txs: CreatorTransactionRecord[] = [
        // Confirmada válida: comissão 1000, taxa 50, reembolso parcial 100 => líq = 850
        {
          transactionId: 'tx_1',
          idempotencyKey: 'idem_unique_1',
          creatorId: 'tx_tester',
          grossAmountBrl: 3333,
          platformCommissionBrl: 1000,
          gatewayFeeBrl: 50,
          refundedAmountBrl: 100,
          status: 'posted',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-10T10:00:00.000Z',
          buyerId: 'b1',
        },
        // Duplicada com mesma chave idempotente => deve ser ignorada
        {
          transactionId: 'tx_1_dup',
          idempotencyKey: 'idem_unique_1',
          creatorId: 'tx_tester',
          grossAmountBrl: 3333,
          platformCommissionBrl: 1000,
          gatewayFeeBrl: 50,
          refundedAmountBrl: 0,
          status: 'posted',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-10T10:01:00.000Z',
          buyerId: 'b1',
        },
        // Pendente => nunca entra na receita confirmada
        {
          transactionId: 'tx_2_pend',
          idempotencyKey: 'idem_unique_2',
          creatorId: 'tx_tester',
          grossAmountBrl: 5000,
          platformCommissionBrl: 1500,
          gatewayFeeBrl: 70,
          refundedAmountBrl: 0,
          status: 'pending',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-11T10:00:00.000Z',
          buyerId: 'b2',
        },
        // Cancelada => ignorada
        {
          transactionId: 'tx_3_canc',
          idempotencyKey: 'idem_unique_3',
          creatorId: 'tx_tester',
          grossAmountBrl: 2000,
          platformCommissionBrl: 600,
          gatewayFeeBrl: 30,
          refundedAmountBrl: 0,
          status: 'cancelled',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-12T10:00:00.000Z',
          buyerId: 'b3',
        },
        // Chargeback integral de R$ 150
        {
          transactionId: 'tx_4_cb',
          idempotencyKey: 'idem_unique_4',
          creatorId: 'tx_tester',
          grossAmountBrl: 500,
          platformCommissionBrl: 150,
          gatewayFeeBrl: 15,
          refundedAmountBrl: 150,
          status: 'chargeback',
          isSyntheticOrTest: false,
          environment: 'sandbox',
          timestamp: '2026-10-13T10:00:00.000Z',
          buyerId: 'b4',
        },
      ];

      const res = monthlyRecognitionService.evaluateCreatorCandidate(
        profile,
        txs,
        [],
        '2026-10-01T00:00:00.000Z',
        '2026-10-31T23:59:59.999Z',
        'sandbox'
      );

      // Líquido esperado: 1000 (comissão tx_1) - 50 (taxa tx_1) - 100 (reembolso tx_1) - 150 (chargeback tx_4) = 700
      if (res.scores.netEligiblePlatformRevenueBrl !== 700) {
        throw new Error(`Receita líquida elegível esperada R$ 700.00, obteve R$ ${res.scores.netEligiblePlatformRevenueBrl}`);
      }
      if (res.scores.excludedPendingBrl !== 5000) {
        throw new Error(`Valor pendente excluído esperado R$ 5000.00, obteve R$ ${res.scores.excludedPendingBrl}`);
      }
      return `Líq. elegível calculado exato: R$ ${res.scores.netEligiblePlatformRevenueBrl.toFixed(2)} (Pendentes excluídos: R$ ${res.scores.excludedPendingBrl.toFixed(2)}, Duplicadas/Canceladas/Estornadas filtradas: ${res.scores.excludedCancelledOrDuplicateCount}).`;
    }
  );

  // 6. Tratamento de dados ausentes ou inválidos sem favorecer indevidamente um candidato
  await runTest(
    6,
    'MR-06-MISSING-DATA-NO-INFLATION',
    'Indicadores de integridade ausentes ou desconhecidos recebem 0 pts e nunca são convertidos em nota máxima',
    () => {
      const cycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const lucas = cycle.candidatesGaroto.find((c) => c.creatorId === 'lucas');
      if (!lucas) throw new Error('Candidato Lucas não encontrado.');

      if (lucas.scores.telemetryPoints !== 0 || !lucas.scores.missingIntegrityIndicators.includes('auditTelemetryComplete')) {
        throw new Error('Indicador ausente (auditTelemetryComplete: null) recebeu pontuação indevida.');
      }
      if (lucas.scores.integrityScore > 90) {
        throw new Error(`Nota de integridade com indicador ausente não pode ultrapassar 90, obteve ${lucas.scores.integrityScore}`);
      }
      return `Indicador ausente 'auditTelemetryComplete' registrado em missingIntegrityIndicators e pontuado com 0 pts (Nota de Integridade de Lucas=${lucas.scores.integrityScore}/100).`;
    }
  );

  // 7. Isolamento absoluto entre sandbox e produção
  await runTest(
    7,
    'MR-07-SANDBOX-PRODUCTION-ISOLATION',
    'Isolamento absoluto entre dados/ciclos de Sandbox e ambiente de Produção',
    () => {
      const sandboxCycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const prodCycle = monthlyRecognitionService.getCycle('2026-10', 'production');

      if (sandboxCycle.candidatesGarota.length === 0) {
        throw new Error('Sandbox deveria conter candidatas de simulação.');
      }
      if (prodCycle.candidatesGarota.length !== 0 || prodCycle.candidatesGaroto.length !== 0) {
        throw new Error('Dados sintéticos de Sandbox vazaram para o ciclo de Produção!');
      }
      return `Isolamento verificado: Sandbox possui ${sandboxCycle.candidatesGarota.length + sandboxCycle.candidatesGaroto.length} candidatos simulados; Produção possui 0 candidatos sintéticos.`;
    }
  );

  // 8. Proteção contra alterações administrativas não autorizadas e bloqueio de mudança de pesos em ciclo ativo
  await runTest(
    8,
    'MR-08-ADMIN-AUTH-AND-WEIGHT-LOCK',
    'Bloqueio de ações administrativas por papéis não autorizados e trava de pesos durante ciclo ativo',
    () => {
      let unauthorizedBlocked = false;
      try {
        monthlyRecognitionService.approveAndPublishOfficialCycle({
          cycleId: '2026-10',
          actorId: 'mod_user_01',
          actorRole: 'moderator',
          justification: 'Tentativa sem permissão',
          environment: 'sandbox',
        });
      } catch {
        unauthorizedBlocked = true;
      }
      if (!unauthorizedBlocked) {
        throw new Error('Moderador sem permissão conseguiu aprovar ciclo oficial.');
      }

      let weightMutationBlocked = false;
      try {
        monthlyRecognitionService.updateScoringFormulaWeights({
          cycleId: '2026-10',
          actorId: 'admin_master_01',
          actorRole: 'master',
          economicWeight: 0.8,
          contentWeight: 0.1,
          integrityWeight: 0.1,
          environment: 'sandbox',
        });
      } catch {
        weightMutationBlocked = true;
      }
      if (!weightMutationBlocked) {
        throw new Error('Pesos da fórmula foram alterados durante um ciclo ativo.');
      }
      return 'Tentativa de aprovação por papel não autorizado negada (ACCESS_DENIED) e mutação de pesos bloqueada durante ciclo ativo.';
    }
  );

  // 9. Aprovação obrigatória antes da publicação oficial (ocultação de vencedores na apuração provisória)
  await runTest(
    9,
    'MR-09-MANDATORY-APPROVAL-BEFORE-PUBLICATION',
    'Ocultação de nomes como vencedores durante classificação provisória e exigência de aprovação administrativa',
    () => {
      const publicBefore = monthlyRecognitionService.getPublicRecognitionView('2026-10', 'sandbox');
      if (
        publicBefore.isOfficial ||
        publicBefore.officialWinners.garota_jobs !== null ||
        publicBefore.officialWinners.garoto_jobs !== null
      ) {
        throw new Error('Nomes de candidatos foram expostos como vencedores antes da aprovação administrativa!');
      }

      monthlyRecognitionService.closeCycleForReview({
        cycleId: '2026-10',
        actorId: 'admin_finance_01',
        actorRole: 'finance',
        justification: 'Fechamento mensal para conferência contábil de Outubro.',
        environment: 'sandbox',
      });

      monthlyRecognitionService.approveAndPublishOfficialCycle({
        cycleId: '2026-10',
        actorId: 'admin_master_01',
        actorRole: 'master',
        justification: 'Homologação oficial de Outubro/2026 após auditoria das notas 50/30/20.',
        environment: 'sandbox',
      });

      const publicAfter = monthlyRecognitionService.getPublicRecognitionView('2026-10', 'sandbox');
      if (
        !publicAfter.isOfficial ||
        !publicAfter.officialWinners.garota_jobs ||
        !publicAfter.officialWinners.garoto_jobs
      ) {
        throw new Error('Vencedores oficiais não foram publicados após aprovação administrativa.');
      }
      return `Antes da aprovação: officialWinners=null (provisório). Após aprovação de admin_master_01: Garota JOBS=${publicAfter.officialWinners.garota_jobs.publicName}, Garoto JOBS=${publicAfter.officialWinners.garoto_jobs.publicName}.`;
    }
  );

  // 10. Preservação do histórico dos ciclos e rastreabilidade das correções oficiais
  await runTest(
    10,
    'MR-10-HISTORY-AND-CORRECTION-TRACEABILITY',
    'Preservação de ciclos anteriores (2026-09) e rastreabilidade de correções em resultados oficiais',
    () => {
      const septCycle = monthlyRecognitionService.getCycle('2026-09', 'sandbox');
      if (septCycle.status !== 'officially_published' || !septCycle.officialWinners.garota_jobs) {
        throw new Error('Ciclo histórico 2026-09 não foi preservado.');
      }

      const correctedOct = monthlyRecognitionService.correctOfficialCycle({
        cycleId: '2026-10',
        actorId: 'admin_master_01',
        actorRole: 'master',
        reason: 'Retificação contábil após deferimento de recurso de telemetria do criador.',
        environment: 'sandbox',
      });

      if (
        correctedOct.status !== 'corrected_republished' ||
        correctedOct.correctionHistory.length !== 1 ||
        !correctedOct.correctionHistory[0].previousWinners.garota_jobs
      ) {
        throw new Error('Registro de correção oficial não preservou o snapshot anterior.');
      }
      return `Ciclo 2026-09 intacto e retificação de 2026-10 gravada em correctionHistory (ID: ${correctedOct.correctionHistory[0].correctionId}).`;
    }
  );

  // 11. Recursos, revisão de suspeitas sem desclassificação automática e ausência de candidatos elegíveis
  await runTest(
    11,
    'MR-11-APPEALS-SUSPICION-AND-NO-WINNER',
    'Preservação de elegibilidade sob suspeita não confirmada, julgamento de recurso e tratamento de ciclo sem candidatos',
    () => {
      // Verifica que Camila ('alert') e Lucas ('under_investigation') não foram desclassificados automaticamente
      const octCycle = monthlyRecognitionService.getCycle('2026-10', 'sandbox');
      const camila = octCycle.candidatesGarota.find((c) => c.creatorId === 'camila');
      const lucas = octCycle.candidatesGaroto.find((c) => c.creatorId === 'lucas');
      if (!camila || !lucas) {
        throw new Error('Criadores sob alerta/investigação foram desclassificados sumariamente sem decisão humana.');
      }

      // Julga o recurso pendente de Lucas aprovando a restauração de telemetria
      const appeals = monthlyRecognitionService.getAppeals('sandbox');
      const lucasAppeal = appeals.find((a) => a.creatorId === 'lucas');
      if (!lucasAppeal) throw new Error('Recurso de Lucas não encontrado.');

      monthlyRecognitionService.resolveCreatorAppeal({
        appealId: lucasAppeal.appealId,
        decision: 'approved',
        actorId: 'admin_master_01',
        actorRole: 'master',
        justification: 'Telemetria validada manualmente pela engenharia de segurança.',
        restoreEligibilityAndTelemetry: true,
        environment: 'sandbox',
      });

      // Verifica ausência de candidatos elegíveis em produção (não fabrica vencedor)
      const prodCycle = monthlyRecognitionService.getCycle('2026-10', 'production');
      if (
        prodCycle.officialWinners.garota_jobs !== null ||
        prodCycle.officialWinners.garoto_jobs !== null ||
        !prodCycle.noWinnerReasons.garota_jobs
      ) {
        throw new Error('Ciclo sem candidatos elegíveis fabricou resultado indevido.');
      }

      return `Suspeitas não geraram exclusão automática; recurso ${lucasAppeal.appealId} deferido; ciclo sem candidatos informa: "${prodCycle.noWinnerReasons.garota_jobs}".`;
    }
  );

  // 12. Autorização de acesso aos dados apresentados publicamente e no Creator Studio
  await runTest(
    12,
    'MR-12-CREATOR-STUDIO-ACCESS-CONTROL',
    'Restrição de acesso a dados individuais de terceiros no Creator Studio (Menor Privilégio)',
    () => {
      const ownView = monthlyRecognitionService.getCreatorStudioRecognitionView({
        requesterId: 'valentina',
        requesterRole: 'creator',
        targetCreatorId: 'valentina',
        cycleId: '2026-10',
        environment: 'sandbox',
      });
      if (ownView.creatorId !== 'valentina') {
        throw new Error('Criadora não conseguiu consultar seus próprios dados.');
      }

      let thirdPartyBlocked = false;
      try {
        monthlyRecognitionService.getCreatorStudioRecognitionView({
          requesterId: 'valentina',
          requesterRole: 'creator',
          targetCreatorId: 'isabella',
          cycleId: '2026-10',
          environment: 'sandbox',
        });
      } catch {
        thirdPartyBlocked = true;
      }

      if (!thirdPartyBlocked) {
        throw new Error('Criadora conseguiu acessar métricas individuais detalhadas de terceiro sem autorização!');
      }
      return 'Acesso próprio deferido (valentina) e consulta cruzada a dados individuais de terceiro (isabella) bloqueada com segurança.';
    }
  );

  // Restaura estado padrão do Sandbox ao final da suíte para a interface permanecer no estado inicial esperado
  monthlyRecognitionService.resetEnvironmentState('sandbox');
  monthlyRecognitionService.resetEnvironmentState('production');

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
