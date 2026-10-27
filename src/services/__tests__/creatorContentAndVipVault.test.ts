/**
 * JOBS — SUÍTE DE TESTES AUTOMATIZADOS: PUBLICAÇÃO NO PERFIL, COFRE VIP E DESBLOQUEIO INDIVIDUAL
 *
 * Valida:
 * 1. Publicação de foto e vídeo no perfil (Gratuito, Desbloqueio Individual e Cofre VIP)
 * 2. Conteúdo gratuito (0 💎) liberado sem cobrança e bloqueio de tentativa de cobrança
 * 3. Desbloqueio individual com saldo suficiente (49 💎 foto / 99 💎 vídeo) e split 70/20/10
 * 4. Bloqueio de compra com saldo insuficiente
 * 5. Prevenção de cobrança duplicada para o mesmo item já desbloqueado
 * 6. Tratamento de falha durante compra ou publicação
 * 7. Proteção contra acesso não autorizado a conteúdo bloqueado (ocultação de privateMasterUrl)
 * 8. Coerência entre carteira do comprador, saldo do criador e registros do ledgerService
 */

import {
  exclusiveContentAndInterestService,
  INITIAL_DIAMOND_SERVICE_CATALOG,
} from '../exclusiveContentAndInterestService';

export interface CreatorContentVipVaultTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface CreatorContentVipVaultSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: CreatorContentVipVaultTestResult[];
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runCreatorContentAndVipVaultTestSuite(): Promise<CreatorContentVipVaultSuiteSummary> {
  const suiteStart = Date.now();
  const results: CreatorContentVipVaultTestResult[] = [];

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
        evidence: 'Falha na asserção',
        error: err?.message || String(err),
      });
    }
  };

  exclusiveContentAndInterestService.resetForAutomatedTesting();

  await runTest(
    1,
    'CCV-01',
    'Publicação de foto e vídeo no perfil nas modalidades Gratuito (0 💎), Exclusivo (49/99 💎) e Cofre VIP',
    () => {
      const freePhoto = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'ccv_free_photo_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'FREE',
        caption: 'Foto Gratuita no Perfil',
        classification: 'fashion_lingerie',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_free.jpg',
        privateMasterUrl: 'private://vault/valentina/ccv_free_01.jpg',
      });

      const indPhoto = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'ccv_ind_photo_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Foto Exclusiva Avulsa 49 Diamantes',
        priceDiamonds: INITIAL_DIAMOND_SERVICE_CATALOG.individualPhotoUnlockDiamonds,
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_ind_photo.jpg',
        privateMasterUrl: 'private://vault/valentina/ccv_ind_photo_01.jpg',
      });

      const indVideo = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'ccv_ind_video_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'video',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Vídeo Exclusivo Avulso 99 Diamantes',
        priceDiamonds: INITIAL_DIAMOND_SERVICE_CATALOG.individualVideoUnlockDiamonds,
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_ind_video.jpg',
        privateMasterUrl: 'private://vault/valentina/ccv_ind_video_01.mp4',
      });

      const vaultVideo = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'ccv_vault_video_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'video',
        modality: 'VIP_VAULT',
        caption: 'Vídeo Exclusivo Cofre VIP',
        classification: 'consensual_nudity_18plus',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_vault_video.jpg',
        privateMasterUrl: 'private://vault/valentina/ccv_vault_video_01.mp4',
      });

      const ownList = exclusiveContentAndInterestService.listCreatorOwnMedia('valentina');
      assertCondition(freePhoto.priceDiamonds === 0 && freePhoto.modality === 'FREE', 'Foto gratuita deve ter 0 💎');
      assertCondition(indPhoto.priceDiamonds === 49, 'Foto individual deve custar 49 💎');
      assertCondition(indVideo.priceDiamonds === 99, 'Vídeo individual deve custar 99 💎');
      assertCondition(vaultVideo.modality === 'VIP_VAULT' && vaultVideo.priceDiamonds === 0, 'Item do Cofre VIP deve ter modality VIP_VAULT');
      assertCondition(ownList.some((m) => m.id === freePhoto.id), 'Meu Conteúdo deve listar a publicação');

      return `Publicações persistidas: FREE (0 💎), Foto Individual (${indPhoto.priceDiamonds} 💎), Vídeo Individual (${indVideo.priceDiamonds} 💎) e Cofre VIP`;
    }
  );

  await runTest(
    2,
    'CCV-02',
    'Conteúdo gratuito liberado sem cobrança e bloqueio de tentativa de cobrança em diamantes',
    async () => {
      const hasAccess = exclusiveContentAndInterestService.hasAuthorizedMediaAccess(
        'viewer_free_user',
        'ccv_free_photo_01'
      );
      assertCondition(hasAccess, 'Visitante autenticado deve ter acesso imediato ao conteúdo gratuito');

      const delivery = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'viewer_free_user',
        mediaId: 'ccv_free_photo_01',
      });
      assertCondition(
        delivery.allowed && Boolean(delivery.delivery?.signedTemporaryUrl),
        'Conteúdo gratuito deve emitir entrega assinada sem exigir pagamento'
      );

      let chargeBlockedOnFree = false;
      try {
        await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'viewer_free_user',
          mediaId: 'ccv_free_photo_01',
          idempotencyKey: 'idemp_free_charge_attempt',
        });
      } catch {
        chargeBlockedOnFree = true;
      }
      assertCondition(chargeBlockedOnFree, 'Tentativa de cobrar diamantes em conteúdo gratuito deve ser bloqueada');

      return `Acesso gratuito liberado (0 💎) e tentativa de cobrança bloqueada com sucesso`;
    }
  );

  await runTest(
    3,
    'CCV-03',
    'Desbloqueio individual de Foto (49 💎) e Vídeo (99 💎) com saldo suficiente e repasse 70/20/10',
    async () => {
      exclusiveContentAndInterestService.setUserDiamondWallet('buyer_ccv_03', {
        purchasedDiamonds: 200,
        bonusDiamonds: 0,
      });

      const photoUnlock = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_ccv_03',
        mediaId: 'ccv_ind_photo_01',
        idempotencyKey: 'idemp_ccv_photo_49',
        buyerAgeVerified18Plus: true,
      });

      const videoUnlock = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_ccv_03',
        mediaId: 'ccv_ind_video_01',
        idempotencyKey: 'idemp_ccv_video_99',
        buyerAgeVerified18Plus: true,
      });

      const walletAfter = exclusiveContentAndInterestService.getUserDiamondWallet('buyer_ccv_03');
      assertCondition(photoUnlock.success && videoUnlock.success, 'Ambos desbloqueios devem ter sucesso');
      assertCondition(
        walletAfter.totalAvailableDiamonds === 200 - 49 - 99,
        `Saldo restante deve ser 52 💎, obtido ${walletAfter.totalAvailableDiamonds} 💎`
      );
      // 49 💎 = 490c -> 343c criador (70%) / 98c JOBS (20%) / 49c reserva (10%)
      assertCondition(
        photoUnlock.transaction.creatorShareCents === 343 &&
          photoUnlock.transaction.platformShare20Cents === 98 &&
          photoUnlock.transaction.operationalReserve10Cents === 49,
        'Split 70/20/10 da foto de 49 💎 incorreto'
      );
      // 99 💎 = 990c -> 693c criador (70%) / 198c JOBS (20%) / 99c reserva (10%)
      assertCondition(
        videoUnlock.transaction.creatorShareCents === 693 &&
          videoUnlock.transaction.platformShare20Cents === 198 &&
          videoUnlock.transaction.operationalReserve10Cents === 99,
        'Split 70/20/10 do vídeo de 99 💎 incorreto'
      );

      return `Foto (49 💎 -> 343c/98c/49c) e Vídeo (99 💎 -> 693c/198c/99c) desbloqueados; saldo final=52 💎`;
    }
  );

  await runTest(
    4,
    'CCV-04',
    'Bloqueio de compra com saldo insuficiente sem alterar carteira ou liberar acesso',
    async () => {
      exclusiveContentAndInterestService.setUserDiamondWallet('buyer_low_balance', {
        purchasedDiamonds: 30,
        bonusDiamonds: 0,
      });

      let rejectedInsufficient = false;
      try {
        await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'buyer_low_balance',
          mediaId: 'ccv_ind_photo_01', // requer 49 💎
          idempotencyKey: 'idemp_ccv_low_bal_01',
        });
      } catch (err: any) {
        rejectedInsufficient = String(err?.message || err).includes('insuficiente');
      }

      const walletAfter = exclusiveContentAndInterestService.getUserDiamondWallet('buyer_low_balance');
      const hasAccess = exclusiveContentAndInterestService.hasAuthorizedMediaAccess(
        'buyer_low_balance',
        'ccv_ind_photo_01'
      );
      assertCondition(rejectedInsufficient, 'Deve rejeitar compra com saldo insuficiente');
      assertCondition(walletAfter.totalAvailableDiamonds === 30, 'Saldo da carteira deve permanecer intacto (30 💎)');
      assertCondition(!hasAccess, 'Acesso deve permanecer bloqueado');

      return `Compra de 49 💎 com saldo de 30 💎 bloqueada; saldo intacto (30 💎) e acesso negado`;
    }
  );

  await runTest(
    5,
    'CCV-05',
    'Prevenção de cobrança duplicada para o mesmo item já desbloqueado (mesma chave ou nova chave)',
    async () => {
      const walletBefore = exclusiveContentAndInterestService.getUserDiamondWallet('buyer_ccv_03');

      // Tentativa com nova chave de idempotência para o mesmo item já desbloqueado por buyer_ccv_03
      const secondAttempt = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_ccv_03',
        mediaId: 'ccv_ind_photo_01',
        idempotencyKey: 'idemp_ccv_photo_49_duplicate_attempt',
      });

      const walletAfter = exclusiveContentAndInterestService.getUserDiamondWallet('buyer_ccv_03');
      assertCondition(secondAttempt.success && secondAttempt.isReplay, 'Deve retornar replay sem nova cobrança');
      assertCondition(
        walletAfter.totalAvailableDiamonds === walletBefore.totalAvailableDiamonds,
        'Nenhum diamante adicional pode ser debitado em item já desbloqueado'
      );

      return `Recompra do item ccv_ind_photo_01 retornou isReplay=true com 0 💎 debitados (saldo=${walletAfter.totalAvailableDiamonds} 💎)`;
    }
  );

  await runTest(
    6,
    'CCV-06',
    'Tratamento de falha durante publicação inválida ou pagamento recusado',
    async () => {
      let rejectedEmptyCaption = false;
      try {
        exclusiveContentAndInterestService.publishOrCreateMedia({
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'INDIVIDUAL_UNLOCK',
          caption: '   ',
          classification: 'sensual',
          ageVerified18Plus: true,
          consentDeclared: true,
          safePreviewUrl: '/prev.jpg',
          privateMasterUrl: 'private://m.jpg',
        });
      } catch {
        rejectedEmptyCaption = true;
      }
      assertCondition(rejectedEmptyCaption, 'Publicação sem descrição válida deve falhar');

      const declinedPurchase = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_declined_ccv',
        mediaId: 'ccv_ind_video_01',
        idempotencyKey: 'idemp_ccv_declined_01',
        simulatePaymentStatus: 'declined',
      });
      assertCondition(
        !declinedPurchase.success &&
          !exclusiveContentAndInterestService.hasAuthorizedMediaAccess('buyer_declined_ccv', 'ccv_ind_video_01'),
        'Falha na confirmação não deve liberar acesso'
      );

      return `Publicação inválida rejeitada e falha de pagamento retida sem liberar acesso`;
    }
  );

  await runTest(
    7,
    'CCV-07',
    'Proteção contra acesso não autorizado a conteúdo bloqueado e ocultação de privateMasterUrl',
    () => {
      const publicList = exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: 'valentina',
        viewerUserId: 'unauthorized_visitor_01',
      });

      const lockedInd = publicList.find((m) => m.id === 'ccv_ind_photo_01');
      const lockedVault = publicList.find((m) => m.id === 'ccv_vault_video_01');

      assertCondition(Boolean(lockedInd) && !lockedInd!.isUnlockedForViewer, 'Item individual deve estar bloqueado');
      assertCondition(Boolean(lockedVault) && !lockedVault!.isUnlockedForViewer, 'Item do Cofre VIP deve estar bloqueado');
      assertCondition(!('privateMasterUrl' in (lockedInd as any)), 'privateMasterUrl jamais deve vazar na listagem');

      const deniedInd = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'unauthorized_visitor_01',
        mediaId: 'ccv_ind_photo_01',
      });
      const deniedVault = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'unauthorized_visitor_01',
        mediaId: 'ccv_vault_video_01',
      });

      assertCondition(
        !deniedInd.allowed && deniedInd.code === 'DENIED_NO_ACCESS_GRANT',
        'Entrega assinada deve ser negada para item individual não comprado'
      );
      assertCondition(
        !deniedVault.allowed && deniedVault.code === 'DENIED_NO_ACCESS_GRANT',
        'Entrega assinada deve ser negada para item do Cofre VIP sem passe ativo'
      );

      return `privateMasterUrl oculto e entregas negadas (${deniedInd.code}) para visitante sem desbloqueio`;
    }
  );

  await runTest(
    8,
    'CCV-08',
    'Coerência contábil entre carteira do comprador, extrato do criador (70%) e reconciliação 70/20/10 do ledgerService',
    () => {
      const creatorSummary = exclusiveContentAndInterestService.getCreatorDashboardSummary('valentina', 'sandbox');
      const platformReport = exclusiveContentAndInterestService.getPlatformReconciliationReport('sandbox');

      assertCondition(
        creatorSummary.totalDiamondsReceived === 49 + 99,
        `Criadora deveria ter recebido 148 💎, obtido ${creatorSummary.totalDiamondsReceived} 💎`
      );
      assertCondition(
        creatorSummary.creatorShare70Cents === 343 + 693,
        `Repasse 70% da criadora deveria ser 1036 centavos, obtido ${creatorSummary.creatorShare70Cents}c`
      );
      assertCondition(
        platformReport.isStrictlyReconciled &&
          platformReport.reconciliationFormulaCheck.split70_20_10EqualsNet &&
          platformReport.reconciliationFormulaCheck.zeroDivergentTransactions,
        'Relatório de reconciliação da plataforma deve estar 100% conciliado'
      );

      return `Coerência comprovada: Criadora recebeu 148 💎 (70% = ${creatorSummary.creatorShare70Cents}c), JOBS 20% = ${creatorSummary.platformShare20Cents}c, Reserva 10% = ${creatorSummary.operationalReserve10Cents}c`;
    }
  );

  exclusiveContentAndInterestService.resetForAutomatedTesting();

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
