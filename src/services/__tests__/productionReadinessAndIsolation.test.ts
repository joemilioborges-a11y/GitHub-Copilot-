/**
 * JOBS — SUÍTE DE TESTES OBRIGATÓRIOS: AUDITORIA DE PRODUÇÃO, ISOLAMENTO DE AMBIENTES,
 * ESTORNO ATÔMICO MULTI-PERNAS E ENDURECIMENTO DE SEGURANÇA (FIRESTORE RULES & LEDGER)
 */

import * as fs from 'fs';
import * as path from 'path';
import { financialLedger } from '../ledgerService';
import { monetizationService } from '../monetizationService';
import { runtimeEnvironmentService } from '../runtimeEnvironmentService';

export interface ProductionReadinessTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ProductionReadinessTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ProductionReadinessTestResult[];
}

export async function runProductionReadinessAndIsolationTestSuite(): Promise<ProductionReadinessTestSuiteSummary> {
  const startTime = Date.now();
  const results: ProductionReadinessTestResult[] = [];

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
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha na asserção de prontidão para produção.',
        error: err?.message || String(err),
      });
    } finally {
      // Sempre restaura o modo 'simulation' ao final de cada teste para não afetar outras suítes
      runtimeEnvironmentService.setModeSync('simulation', {
        userId: 'admin_master',
        role: 'admin',
      });
    }
  };

  // =========================================================================
  // TESTE 1: Bloqueio de sementes sintéticas (seedInitialLedger / Live seeds) em Produção
  // =========================================================================
  await runTest(
    1,
    'PROD-ISO-01',
    'Bloqueio estrito de sementes sintéticas e créditos fictícios no modo Produção',
    async () => {
      runtimeEnvironmentService.clearProductionLocalCache({
        userId: 'admin_master',
        role: 'admin',
      });

      const switchRes = await runtimeEnvironmentService.setMode('production', {
        userId: 'admin_master',
        role: 'admin',
        reason: 'Teste automatizado PROD-ISO-01',
      });

      if (!switchRes.success || runtimeEnvironmentService.getMode() !== 'production') {
        throw new Error('Falha ao alternar para modo production.');
      }

      // Tenta forçar seed de live audit em produção
      financialLedger.ensureInitialLiveAuditEntries();

      const prodEntries = financialLedger.getEntries();
      const prodUserCredits = financialLedger.getUserCredits('current_user');
      const prodWallet = monetizationService.getWallet('user_prod_clean_01');

      if (prodEntries.length !== 0) {
        throw new Error(`Esperado 0 lançamentos sintéticos em produção, encontrado: ${prodEntries.length}`);
      }
      if (prodUserCredits !== 0) {
        throw new Error(`Esperado 0 créditos iniciais em produção, encontrado: ${prodUserCredits}`);
      }
      if (prodWallet.balance !== 0) {
        throw new Error(`Carteira nova em produção recebeu saldo fictício: ${prodWallet.balance}`);
      }

      return `Modo production verificado: 0 entradas sintéticas, current_user=0 créditos, nova carteira=0 créditos (shouldSeedSyntheticData=${runtimeEnvironmentService.shouldSeedSyntheticData()}).`;
    }
  );

  // =========================================================================
  // TESTE 2: Isolamento físico bidirecional entre Simulação e Produção
  // =========================================================================
  await runTest(
    2,
    'PROD-ISO-02',
    'Isolamento físico total entre transações de Simulação (Sandbox) e Produção',
    async () => {
      const testUser = `usr_iso_${Date.now()}`;
      const creatorId = `cr_iso_${Date.now()}`;

      // 1. No modo Simulação, compra 200 créditos e desbloqueia conteúdo (40 créditos)
      runtimeEnvironmentService.setModeSync('simulation', {
        userId: 'admin_master',
        role: 'admin',
      });

      await financialLedger.purchaseCreditPackage({
        userId: testUser,
        packageId: 'pkg_popular',
        packageName: 'Popular Sandbox',
        creditsToGrant: 200,
        priceBrl: 27.9,
        gateway: 'pix',
        idempotencyKey: `idemp_sim_buy_${testUser}`,
      });

      await financialLedger.unlockPaidContent({
        userId: testUser,
        creatorId,
        creatorName: 'Criadora Sandbox',
        contentId: 'cnt_sim_01',
        contentTitle: 'Foto Sandbox',
        priceCredits: 40,
        idempotencyKey: `idemp_sim_unlock_${testUser}`,
      });

      const simCredits = financialLedger.getUserCredits(testUser);
      const simCreatorBal = financialLedger.getCreatorBalances(creatorId).pendingBrl;

      // 2. Alterna para Produção e verifica que o usuário e criador têm saldo ZERO em Produção
      runtimeEnvironmentService.setModeSync('production', {
        userId: 'admin_master',
        role: 'admin',
      });

      const prodCreditsBefore = financialLedger.getUserCredits(testUser);
      const prodCreatorBalBefore = financialLedger.getCreatorBalances(creatorId).pendingBrl;

      if (prodCreditsBefore !== 0 || prodCreatorBalBefore !== 0) {
        throw new Error(
          `Vazamento de Simulação para Produção detectado! prodCredits=${prodCreditsBefore}, prodCreator=${prodCreatorBalBefore}`
        );
      }

      // 3. Executa compra real em Produção (50 créditos) e verifica que tem isSandbox=false
      const prodBuy = await financialLedger.purchaseCreditPackage({
        userId: testUser,
        packageId: 'pkg_inicial',
        packageName: 'Inicial Produção',
        creditsToGrant: 50,
        priceBrl: 9.9,
        gateway: 'pix',
        idempotencyKey: `idemp_prod_buy_${testUser}`,
      });

      const prodCreditsAfter = financialLedger.getUserCredits(testUser);
      const hasAnySandboxFlagInProd = prodBuy.entries.some((e) => e.isSandbox === true);

      // 4. Retorna para Simulação e comprova que o saldo de Simulação permaneceu 160 (não somou os 50 de produção)
      runtimeEnvironmentService.setModeSync('simulation', {
        userId: 'admin_master',
        role: 'admin',
      });
      const simCreditsAfter = financialLedger.getUserCredits(testUser);

      if (simCredits !== 160 || prodCreditsAfter !== 50 || simCreditsAfter !== 160 || hasAnySandboxFlagInProd) {
        throw new Error(
          `Isolamento falhou: simCredits=${simCredits}, prodCreditsAfter=${prodCreditsAfter}, simCreditsAfter=${simCreditsAfter}, hasAnySandboxFlagInProd=${hasAnySandboxFlagInProd}`
        );
      }

      return `Isolamento comprovado: Saldo Sandbox=${simCreditsAfter} créditos (isSandbox=true) | Saldo Produção=${prodCreditsAfter} créditos (isSandbox=false) | Zero contaminação cruzada.`;
    }
  );

  // =========================================================================
  // TESTE 3: Controle de Acesso RBAC para alternância do Modo de Simulação
  // =========================================================================
  await runTest(
    3,
    'PROD-ISO-03',
    'Restrição exclusiva ao Painel Admin para alternar entre Simulação e Produção',
    async () => {
      runtimeEnvironmentService.setModeSync('production', {
        userId: 'admin_master',
        role: 'admin',
      });

      // Tentativa por usuário comum (deve ser negada)
      const userAttempt = await runtimeEnvironmentService.setMode('simulation', {
        userId: 'regular_user_99',
        role: 'user',
        email: 'usuario.comum@exemplo.com',
      });

      // Tentativa por criador (deve ser negada)
      const creatorAttempt = await runtimeEnvironmentService.setMode('simulation', {
        userId: 'valentina',
        role: 'creator',
        email: 'valentina@exemplo.com',
      });

      const modeAfterUnauthorized = runtimeEnvironmentService.getMode();

      // Tentativa por administrador verificado (deve ser aceita)
      const adminAttempt = await runtimeEnvironmentService.setMode('simulation', {
        userId: 'admin_master',
        role: 'admin',
        email: 'joemilioborges@gmail.com',
      });

      if (
        userAttempt.success !== false ||
        creatorAttempt.success !== false ||
        modeAfterUnauthorized !== 'production' ||
        adminAttempt.success !== true ||
        runtimeEnvironmentService.getMode() !== 'simulation'
      ) {
        throw new Error('Falha no controle de acesso RBAC do runtimeEnvironmentService.');
      }

      return `Tentativas de 'user' e 'creator' bloqueadas (error=${userAttempt.error}); ambiente permaneceu 'production' até autorização explícita de 'admin'.`;
    }
  );

  // =========================================================================
  // TESTE 4: Estorno Atômico Multi-Pernas (Reversão integral de 100%: Spend + 70% Criador + 30% JOBS)
  // =========================================================================
  await runTest(
    4,
    'PROD-FIN-04',
    'Estorno atômico multi-pernas revertendo integralmente créditos do usuário, repasse 70% do criador e comissão 30% JOBS',
    async () => {
      const buyerId = `usr_atomic_ref_${Date.now()}`;
      const creatorId = `cr_atomic_ref_${Date.now()}`;
      const idempUnlock = `idemp_atomic_unlock_${Date.now()}`;

      await financialLedger.purchaseCreditPackage({
        userId: buyerId,
        packageId: 'pkg_popular',
        packageName: 'Pacote Teste Estorno',
        creditsToGrant: 100,
        priceBrl: 10.0,
        gateway: 'pix',
        idempotencyKey: `seed_${idempUnlock}`,
      });

      // Desbloqueio de 99 créditos (R$ 9,90 bruto -> R$ 6,93 criador 70% + R$ 2,97 JOBS 30%)
      const unlockRes = await financialLedger.unlockPaidContent({
        userId: buyerId,
        creatorId,
        creatorName: 'Criadora Teste Estorno',
        contentId: 'media_vip_99',
        contentTitle: 'Vídeo Cofre VIP 99',
        priceCredits: 99,
        idempotencyKey: idempUnlock,
      });

      const buyerAfterUnlock = financialLedger.getUserCredits(buyerId); // 1
      const creatorBeforeRefund = financialLedger.getCreatorBalances(creatorId); // pendingBrl = 6.93

      const spendEntry = unlockRes.entries.find((e) => e.currency === 'CREDITS')!;

      // Executa o estorno atômico a partir da entrada de gasto
      const refundRes = await financialLedger.processRefund({
        originalEntryId: spendEntry.id,
        reason: 'Estorno atômico completo multi-pernas (auditoria de produção)',
        adminId: 'admin_master',
        idempotencyKey: `idemp_full_refund_${idempUnlock}`,
      });

      const buyerAfterRefund = financialLedger.getUserCredits(buyerId); // 100
      const creatorAfterRefund = financialLedger.getCreatorBalances(creatorId); // pendingBrl = 0, totalEarnedBrl = 0

      // Verifica se todas as 3 pernas originais foram marcadas como 'refunded'
      const allEntries = financialLedger.getEntries();
      const originalTxLegs = allEntries.filter(
        (e) => e.transactionId === spendEntry.transactionId && e.operationType !== 'REFUND'
      );
      const allOriginalLegsMarkedRefunded =
        originalTxLegs.length === 3 && originalTxLegs.every((e) => e.status === 'refunded');

      if (
        buyerAfterUnlock !== 1 ||
        creatorBeforeRefund.pendingBrl !== 6.93 ||
        refundRes.reversedLegsCount !== 3 ||
        buyerAfterRefund !== 100 ||
        creatorAfterRefund.pendingBrl !== 0 ||
        creatorAfterRefund.totalEarnedBrl !== 0 ||
        !allOriginalLegsMarkedRefunded
      ) {
        throw new Error(
          `Estorno multi-pernas incompleto: reversedLegs=${refundRes.reversedLegsCount}, buyerAfter=${buyerAfterRefund}, creatorPendingAfter=${creatorAfterRefund.pendingBrl}, allMarked=${allOriginalLegsMarkedRefunded}`
        );
      }

      return `3 pernas revertidas atomicamente: Usuário restituído (1 -> 100 💎), Criador zerado (R$ 6,93 -> R$ ${creatorAfterRefund.pendingBrl.toFixed(2)}), 3/3 pernas originais com status='refunded'.`;
    }
  );

  // =========================================================================
  // TESTE 5: Aritmética Estrita em Centavos Inteiros (Prevenção de Float Drift IEEE-754)
  // =========================================================================
  await runTest(
    5,
    'PROD-FIN-05',
    'Precisão aritmética em centavos inteiros (amountCents) sem desvio de ponto flutuante IEEE-754',
    async () => {
      const userId = `usr_cents_${Date.now()}`;
      const creatorId = `cr_cents_${Date.now()}`;

      await financialLedger.purchaseCreditPackage({
        userId,
        packageId: 'pkg_especial',
        packageName: 'Seed Centavos',
        creditsToGrant: 500,
        priceBrl: 50.0,
        gateway: 'pix',
        idempotencyKey: `seed_cents_${userId}`,
      });

      // Executa 3 desbloqueios consecutivos com valores que geram dízimas/frações em float (1, 2 e 3 créditos -> R$ 0,07 + R$ 0,14 + R$ 0,21 = R$ 0,42 exatos)
      // Nota: em IEEE-754 float puro, 0.07 + 0.14 + 0.21 = 0.42000000000000004
      for (const [idx, credits] of [1, 2, 3].entries()) {
        await financialLedger.unlockPaidContent({
          userId,
          creatorId,
          creatorName: 'Criadora Precisão',
          contentId: `cnt_prec_${idx}`,
          contentTitle: `Item ${idx}`,
          priceCredits: credits,
          idempotencyKey: `idemp_prec_${userId}_${idx}`,
        });
      }

      const creatorBal = financialLedger.getCreatorBalances(creatorId);
      if (creatorBal.pendingBrl !== 0.42 || creatorBal.totalEarnedBrl !== 0.42) {
        throw new Error(
          `Desvio de centavos detectado: esperado R$ 0.42, obtido pendingBrl=${creatorBal.pendingBrl}, totalEarnedBrl=${creatorBal.totalEarnedBrl}`
        );
      }

      return `Soma de repasses fracionários (R$ 0,07 + R$ 0,14 + R$ 0,21) = R$ ${creatorBal.pendingBrl.toFixed(2)} exatos em centavos inteiros.`;
    }
  );

  // =========================================================================
  // TESTE 6: Auditoria Estática das Regras de Segurança do Firestore (firestore.rules)
  // =========================================================================
  await runTest(
    6,
    'PROD-SEC-06',
    'Verificação de endurecimento de firestore.rules (bloqueio de escrita em /ledger_entries e anti-autoaprovação em /media_items)',
    async () => {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

      // 1. Verificar que /ledger_entries não permite create por isSignedIn() aberto
      const ledgerBlockMatch = rulesContent.match(/match\s+\/ledger_entries\/\{entryId\}\s*\{([\s\S]*?)\}/);
      if (!ledgerBlockMatch) {
        throw new Error('Bloco match /ledger_entries/{entryId} não encontrado em firestore.rules.');
      }
      const ledgerBlock = ledgerBlockMatch[1];
      const hasAdminOnlyCreate =
        ledgerBlock.includes('allow create: if isAdmin() && isValidLedgerSnapshot') &&
        !ledgerBlock.includes('allow create: if (isAdmin() || isSignedIn())');

      if (!hasAdminOnlyCreate) {
        throw new Error('Vulnerabilidade em /ledger_entries: escrita direta para isSignedIn() ainda presente.');
      }

      // 2. Verificar que /media_items exige moderationStatus == 'pending' para isOwner
      const mediaBlockMatch = rulesContent.match(/match\s+\/media_items\/\{mediaId\}\s*\{([\s\S]*?)\}/);
      if (!mediaBlockMatch) {
        throw new Error('Bloco match /media_items/{mediaId} não encontrado em firestore.rules.');
      }
      const mediaBlock = mediaBlockMatch[1];
      const enforcesPendingForOwner =
        mediaBlock.includes("request.resource.data.moderationStatus == 'pending'") &&
        mediaBlock.includes('isValidMediaItem(request.resource.data, mediaId)');

      if (!enforcesPendingForOwner) {
        throw new Error('Vulnerabilidade em /media_items: criador pode autoaprovar conteúdo sem revisão admin.');
      }

      return `firestore.rules auditado: /ledger_entries restrito a isAdmin() na criação; /media_items força moderationStatus == 'pending' para criadores.`;
    }
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: Date.now() - startTime,
    results,
  };
}
