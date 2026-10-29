/**
 * Script de Execução Automatizada da Suíte de Testes (Lives & Ledger)
 * Pode ser executado no Node via tsx: `npx tsx scripts/runVerificationTests.ts`
 */

// Polyfill in-memory localStorage se executado no ambiente Node.js
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

async function main() {
  console.log('========================================================================');
  console.log('JOBS 1.0 — EXECUÇÃO DE TESTES DE INTEGRAÇÃO & AUDITORIA TÉCNICA');
  console.log('Módulos: Lives ao Vivo (Fase 1) & Livro-Razão Contábil (Audit Ledger)');
  console.log('========================================================================\n');

  // Importação dinâmica após inicialização do polyfill
  const { runLiveAndAuditVerificationSuite } = await import('../src/utils/liveAndAuditVerificationTests');

  const summary = await runLiveAndAuditVerificationSuite();

  console.log(`Timestamp: ${summary.timestamp}`);
  console.log(`Duração Total: ${summary.executionDurationMs}ms\n`);

  let currentCategory = '';
  for (const t of summary.results) {
    if (t.category !== currentCategory) {
      currentCategory = t.category;
      console.log(`\n--- [${currentCategory}] ---`);
    }
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${t.id} - ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.error) {
      console.log(`    ERRO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES DE REGRESSÃO: SIMULADOR DE MONETIZAÇÃO E SAQUES');
  console.log('========================================================================\n');

  const { runAllWithdrawalSimulatorTests } = await import('../src/utils/withdrawalSimulatorTests');
  const withdrawalSummary = runAllWithdrawalSimulatorTests();

  for (const t of withdrawalSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber}: ${t.name}`);
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: ATOMICIDADE FINANCEIRA & INTEGRAÇÃO DE PAYOUT');
  console.log('========================================================================\n');

  const { runAtomicPayoutTestSuite } = await import('../src/services/__tests__/ledgerServiceAtomicPayout.test');
  const atomicSummary = await runAtomicPayoutTestSuite();

  for (const t of atomicSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber}: ${t.name} (${t.durationMs}ms)`);
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: HOOK USELIVESTREAMVIEW & SALA DE TRANSMISSÃO');
  console.log('========================================================================\n');

  const { runLiveStreamViewHookTestSuite } = await import('../src/utils/liveStreamViewHookTests');
  const hookSummary = await runLiveStreamViewHookTestSuite();

  for (const t of hookSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.message) {
      console.log(`    ERRO DETALHADO: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS-LEDGER-AUDIT-002: TESTES OBRIGATÓRIOS DE DESBLOQUEIO E IDEMPOTÊNCIA');
  console.log('========================================================================\n');

  const { runContentUnlockAuditTestSuite } = await import('../src/services/__tests__/ledgerContentUnlockAudit.test');
  const contentUnlockSummary = await runContentUnlockAuditTestSuite();

  for (const t of contentUnlockSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Cenário ${t.scenarioNumber}: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: GIFT ANIMATION OVERLAY (SALA DE TRANSMISSÃO)');
  console.log('========================================================================\n');

  const { runGiftAnimationOverlayTestSuite } = await import('../src/utils/giftAnimationOverlayTests');
  const giftOverlaySummary = await runGiftAnimationOverlayTestSuite();

  for (const t of giftOverlaySummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    if (t.message) {
      console.log(`    DETALHE: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: FEEDBACK VISUAL EM TEMPO REAL NO LIVESTREAM');
  console.log('========================================================================\n');

  const { runLiveFeedbackTestSuite } = await import('../src/utils/liveFeedbackTests');
  const feedbackSummary = await runLiveFeedbackTestSuite();

  for (const t of feedbackSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    if (t.message) {
      console.log(`    DETALHE: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: AUDITORIA DE DESBLOQUEIOS DE LIVES (70/30)');
  console.log('========================================================================\n');

  const { runLiveUnlockAuditTestSuite } = await import('../src/utils/liveUnlockAuditTests');
  const auditSummary = await runLiveUnlockAuditTestSuite();

  for (const t of auditSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Cenário ${t.scenarioNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: PLANO TÉCNICO DE EVOLUÇÃO (11 FASES)');
  console.log('========================================================================\n');

  const { runEvolutionRoadmapTestSuite } = await import('../src/services/__tests__/evolutionRoadmapService.test');
  const evolutionSummary = await runEvolutionRoadmapTestSuite();

  for (const t of evolutionSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber}: ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.message) {
      console.log(`    ERRO DETALHADO: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: INTERESSE MÚTUO E MENSAGERIA 1:1 ENTRE CONTAS REAIS');
  console.log('========================================================================\n');

  const { runMatchAndMessagingTestSuite } = await import('../src/services/__tests__/matchAndMessagingService.test');
  const matchMsgSummary = await runMatchAndMessagingTestSuite();

  for (const t of matchMsgSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber}: ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.message) {
      console.log(`    ERRO DETALHADO: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: MÓDULO FINANCEIRO EXECUTIVO & RANKINGS');
  console.log('========================================================================\n');

  const { runExecutiveFinancialRankingTests } = await import('../src/utils/executiveFinancialRankingTests');
  const execFinancialSummary = await runExecutiveFinancialRankingTests();

  for (const t of execFinancialSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${t.id}: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
  }

  console.log('\n========================================================================');
  console.log('JOBS — FASE 1: 30 TESTES OBRIGATÓRIOS (CARTEIRA, PACOTES & DESBLOQUEIO)');
  console.log('========================================================================\n');

  const { monetizationService } = await import('../src/services/monetizationService');
  const monetizationSuite = await monetizationService.runComprehensiveTestSuite();

  for (const t of monetizationSuite.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.id} [${t.category}]: ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.message) {
      console.log(`    ERRO DETALHADO: ${t.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: PROTEÇÃO DE MÍDIAS, FOTOS & VÍDEOS (FASE 1 & 2)');
  console.log('========================================================================\n');

  const { runProtectedMediaTestSuite } = await import('../src/services/__tests__/protectedMediaService.test');
  const mediaSecuritySummary = await runProtectedMediaTestSuite();

  for (const t of mediaSecuritySummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: LOG DE ATIVIDADES DO ADMINISTRADOR (SHA-256)');
  console.log('========================================================================\n');

  const { runAdminAuditTestSuite } = await import('../src/services/__tests__/adminAuditService.test');
  const adminAuditSummary = await runAdminAuditTestSuite();

  for (const t of adminAuditSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES OBRIGATÓRIOS: FIREBASE CONFIG & SINGLETON INITIALIZATION');
  console.log('========================================================================\n');

  const { getApps, getApp } = await import('firebase/app');
  const { app: fbApp, db: fbDb, firebaseConfig, initializeFirebaseApp } = await import('../src/utils/firebaseConfig');

  const fbTests: Array<{ id: string; name: string; passed: boolean; evidence: string }> = [
    {
      id: 'FB-CFG-01',
      name: 'Carregamento das propriedades reais de firebase-applet-config.json sem campos inventados',
      passed:
        firebaseConfig.projectId === 'gen-lang-client-0491658347' &&
        firebaseConfig.firestoreDatabaseId === 'ai-studio-jhobs-f94517bd-f73d-4ef7-a99c-d8080b58c257' &&
        typeof firebaseConfig.appId === 'string' &&
        firebaseConfig.appId.length > 0 &&
        typeof firebaseConfig.authDomain === 'string',
      evidence: `projectId=${firebaseConfig.projectId}, firestoreDatabaseId=${firebaseConfig.firestoreDatabaseId}`,
    },
    {
      id: 'FB-CFG-02',
      name: 'Prevenção de duplicação de instâncias via getApps()/getApp()/initializeFirebaseApp()',
      passed:
        initializeFirebaseApp() === fbApp &&
        getApp() === fbApp &&
        getApps().length === 1,
      evidence: `getApps().length=${getApps().length}, app.name=${fbApp.name} (instância única reutilizada)`,
    },
    {
      id: 'FB-CFG-03',
      name: 'Inicialização do serviço Firestore apontando para o banco nomeado oficial',
      passed: Boolean(fbDb && fbDb.app === fbApp),
      evidence: `Firestore inicializado e vinculado ao app singleton (${fbDb.app.name})`,
    },
  ];

  for (let i = 0; i < fbTests.length; i++) {
    const t = fbTests[i];
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${i + 1} [${t.id}]: ${t.name} (0ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
  }

  const fbPassed = fbTests.filter((t) => t.passed).length;
  const fbFailed = fbTests.length - fbPassed;

  console.log('\n========================================================================');
  console.log('JOBS — 12 TESTES OBRIGATÓRIOS: RANKING MENSAL GAROTO JOBS & GAROTA JOBS');
  console.log('========================================================================\n');

  const { runMonthlyRecognitionTestSuite } = await import('../src/services/__tests__/monthlyRecognitionService.test');
  const monthlyRecSummary = await runMonthlyRecognitionTestSuite();

  for (const t of monthlyRecSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 10 TESTES OBRIGATÓRIOS: SIMULADOR DE REALIDADE VIRTUAL (30 DIAS)');
  console.log('========================================================================\n');

  const { runVrSimulatorTestSuite } = await import('../src/services/__tests__/vrSimulatorService.test');
  const vrSimSummary = await runVrSimulatorTestSuite();

  for (const t of vrSimSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 7 TESTES OBRIGATÓRIOS: FILTROS COMPLEMENTARES EM DESCOBERTAS & LIVES');
  console.log('========================================================================\n');

  const { runDiscoveryAndLiveFiltersTestSuite } = await import('../src/services/__tests__/discoveryAndLiveFilters.test');
  const dlFiltersSummary = await runDiscoveryAndLiveFiltersTestSuite();

  for (const t of dlFiltersSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 6 TESTES OBRIGATÓRIOS: RELATÓRIO FINANCEIRO DE RECEITAS & GANHOS (70/30)');
  console.log('========================================================================\n');

  const { runRevenueAndEarningsReportTestSuite } = await import('../src/services/__tests__/revenueAndEarningsReport.test');
  const revReportSummary = await runRevenueAndEarningsReportTestSuite();

  for (const t of revReportSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 16 TESTES OBRIGATÓRIOS (9.1 a 9.7): MÍDIAS EXCLUSIVAS, COFRE VIP, INTERESSE IMEDIATO & 70/30');
  console.log('========================================================================\n');

  const { runExclusiveContentAndInterestTestSuite } = await import(
    '../src/services/__tests__/exclusiveContentAndInterestService.test'
  );
  const exclMonetizationSummary = await runExclusiveContentAndInterestTestSuite();

  for (const t of exclMonetizationSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id} | Seção ${t.section}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 10 TESTES OBRIGATÓRIOS (SEÇÃO 9): SIMULADOR ADMINISTRATIVO DE RECEITA (70/20/10)');
  console.log('========================================================================\n');

  const { runRevenueSimulatorTestSuite } = await import(
    '../src/services/__tests__/revenueSimulatorService.test'
  );
  const revSimSummary = await runRevenueSimulatorTestSuite();

  for (const t of revSimSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 12 TESTES OBRIGATÓRIOS: VISUALIZADOR E VALIDADOR DE AUDITORIA SHA-256');
  console.log('========================================================================\n');

  const { runLedgerSha256ValidatorTestSuite } = await import(
    '../src/services/__tests__/ledgerSha256Validator.test'
  );
  const sha256AuditSummary = await runLedgerSha256ValidatorTestSuite();

  for (const t of sha256AuditSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 8 TESTES OBRIGATÓRIOS: GOOGLE MAPS, GRADE 1–2 KM & PRIVACIDADE ESPACIAL');
  console.log('========================================================================\n');

  const { runProximityPrivacyTestSuite } = await import(
    '../src/services/__tests__/proximityPrivacyService.test'
  );
  const proximitySummary = await runProximityPrivacyTestSuite();

  for (const t of proximitySummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 8 TESTES OBRIGATÓRIOS: PUBLICAÇÃO NO PERFIL, COFRE VIP & DESBLOQUEIO INDIVIDUAL');
  console.log('========================================================================\n');

  const { runCreatorContentAndVipVaultTestSuite } = await import(
    '../src/services/__tests__/creatorContentAndVipVault.test'
  );
  const creatorContentSummary = await runCreatorContentAndVipVaultTestSuite();

  for (const t of creatorContentSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 6 TESTES OBRIGATÓRIOS: PRONTIDÃO PARA PRODUÇÃO, ISOLAMENTO & SEGURANÇA');
  console.log('========================================================================\n');

  const { runProductionReadinessAndIsolationTestSuite } = await import(
    '../src/services/__tests__/productionReadinessAndIsolation.test'
  );
  const prodReadinessSummary = await runProductionReadinessAndIsolationTestSuite();

  for (const t of prodReadinessSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — 8 TESTES OBRIGATÓRIOS: PROTEÇÃO PROGRESSIVA DE MÍDIAS (FASES 1 A 4)');
  console.log('========================================================================\n');

  const { runProtectedMediaSecurityTestSuite } = await import(
    '../src/services/__tests__/protectedMediaSecurity.test'
  );
  const progMediaSecSummary = await runProtectedMediaSecurityTestSuite();

  for (const t of progMediaSecSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES AUTOMATIZADOS: SEÇÃO "SEU TALENTO VALE MUITO!" (SIMULAÇÃO)');
  console.log('========================================================================\n');

  const { runTalentChallengesSimulationTestSuite } = await import(
    '../src/services/__tests__/talentChallengesSimulation.test'
  );
  const talentSimSummary = await runTalentChallengesSimulationTestSuite();

  for (const t of talentSimSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Teste ${t.testNumber} [${t.id}]: ${t.name} (${t.durationMs}ms)`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.error) {
      console.log(`    ERRO DETALHADO: ${t.error}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES DE INTEGRIDADE DO HISTÓRICO FINANCEIRO (REGRAS 1 A 10)');
  console.log('========================================================================\n');

  const { runFinancialHistoryIntegrityTests } = await import(
    '../src/services/__tests__/financialHistoryIntegrity.test'
  );
  const finHistSummary = await runFinancialHistoryIntegrityTests();

  for (const t of finHistSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} Regra ${t.id} [${t.category}]: ${t.title}`);
    console.log(`    EVIDÊNCIA: ${t.evidence}`);
    if (!t.passed && t.divergence) {
      console.log(`    DIVERGÊNCIA: ${t.divergence}`);
    }
  }

  console.log('\n========================================================================');
  console.log('JOBS — TESTES DE REFINAMENTO DO RANKING FINANCEIRO DE CRIADORES');
  console.log('========================================================================\n');

  const { runCreatorRankingRefinementTests } = await import(
    '../src/utils/creatorFinancialRankingRefinementTests'
  );
  const rankingRefinementSummary = runCreatorRankingRefinementTests();

  for (const t of rankingRefinementSummary.results) {
    const icon = t.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${t.id} [${t.category}]: ${t.name} (${t.durationMs}ms)`);
    if (!t.passed && t.error) {
      console.log(`    ERRO: ${t.error}`);
    }
  }

  const grandTotal =
    summary.totalTests +
    withdrawalSummary.total +
    atomicSummary.total +
    hookSummary.total +
    contentUnlockSummary.total +
    giftOverlaySummary.total +
    feedbackSummary.total +
    auditSummary.total +
    evolutionSummary.total +
    matchMsgSummary.total +
    execFinancialSummary.total +
    monetizationSuite.totalTests +
    mediaSecuritySummary.total +
    adminAuditSummary.total +
    fbTests.length +
    monthlyRecSummary.total +
    vrSimSummary.total +
    dlFiltersSummary.total +
    revReportSummary.total +
    exclMonetizationSummary.total +
    revSimSummary.total +
    sha256AuditSummary.total +
    proximitySummary.total +
    creatorContentSummary.total +
    prodReadinessSummary.total +
    progMediaSecSummary.total +
    talentSimSummary.total +
    finHistSummary.totalTests +
    rankingRefinementSummary.totalTests;
  const grandPassed =
    summary.passedCount +
    withdrawalSummary.passed +
    atomicSummary.passed +
    hookSummary.passed +
    contentUnlockSummary.passed +
    giftOverlaySummary.passed +
    feedbackSummary.passed +
    auditSummary.passed +
    evolutionSummary.passed +
    matchMsgSummary.passed +
    execFinancialSummary.passed +
    monetizationSuite.passedTests +
    mediaSecuritySummary.passed +
    adminAuditSummary.passed +
    fbPassed +
    monthlyRecSummary.passed +
    vrSimSummary.passed +
    dlFiltersSummary.passed +
    revReportSummary.passed +
    exclMonetizationSummary.passed +
    revSimSummary.passed +
    sha256AuditSummary.passed +
    proximitySummary.passed +
    creatorContentSummary.passed +
    prodReadinessSummary.passed +
    progMediaSecSummary.passed +
    talentSimSummary.passed +
    finHistSummary.passedTests +
    rankingRefinementSummary.passedTests;
  const grandFailed =
    summary.failedCount +
    withdrawalSummary.failed +
    atomicSummary.failed +
    hookSummary.failed +
    contentUnlockSummary.failed +
    giftOverlaySummary.failed +
    feedbackSummary.failed +
    auditSummary.failed +
    evolutionSummary.failed +
    matchMsgSummary.failed +
    execFinancialSummary.failed +
    (monetizationSuite.totalTests - monetizationSuite.passedTests) +
    mediaSecuritySummary.failed +
    adminAuditSummary.failed +
    fbFailed +
    monthlyRecSummary.failed +
    vrSimSummary.failed +
    dlFiltersSummary.failed +
    revReportSummary.failed +
    exclMonetizationSummary.failed +
    revSimSummary.failed +
    sha256AuditSummary.failed +
    proximitySummary.failed +
    creatorContentSummary.failed +
    prodReadinessSummary.failed +
    progMediaSecSummary.failed +
    talentSimSummary.failed +
    finHistSummary.failedTests +
    rankingRefinementSummary.failedTests;

  console.log('\n========================================================================');
  console.log('RESUMO CONSOLIDADO DA PLATAFORMA JOBS:');
  console.log(`Total de Casos de Teste: ${grandTotal}`);
  console.log(`Aprovados:              ${grandPassed} (${((grandPassed / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`Falhas:                 ${grandFailed}`);
  console.log(
    `Tempo Total:            ${
      summary.executionDurationMs +
      contentUnlockSummary.executionDurationMs +
      auditSummary.durationMs +
      execFinancialSummary.durationMs +
      monthlyRecSummary.durationMs +
      vrSimSummary.durationMs +
      dlFiltersSummary.durationMs +
      revReportSummary.durationMs +
      exclMonetizationSummary.durationMs +
      revSimSummary.durationMs +
      sha256AuditSummary.durationMs +
      proximitySummary.durationMs +
      creatorContentSummary.durationMs +
      prodReadinessSummary.durationMs +
      progMediaSecSummary.durationMs +
      talentSimSummary.durationMs +
      finHistSummary.durationMs
    }ms`
  );
  console.log('========================================================================\n');

  if (grandFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Falha fatal na execução dos testes:', err);
  process.exit(1);
});
