/**
 * JOBS — SUÍTE DE TESTES OBRIGATÓRIOS: PROTEÇÃO PROGRESSIVA DE FOTOS E VÍDEOS (FASES 1, 2, 3 E 4)
 * Valida URLs temporárias assinadas (TTL 900s), Cache-Control no-store, proteção anti-IDOR,
 * renovação controlada sem nova cobrança, revogação imediata por bloqueio ou mudança de estado,
 * segregação de teaser SVG opaco, controle dinâmico de FLAG_SECURE no Android e marca-d'água forense sem PII.
 */

import {
  protectedMediaService,
  PROTECTED_MEDIA_CACHE_CONTROL,
  formatForensicWatermark,
  obfuscateUserIdForWatermark,
} from '../protectedMediaService';
import { exclusiveContentAndInterestService } from '../exclusiveContentAndInterestService';
import { screenSecurityService } from '../screenSecurityService';

export interface ProtectedMediaSecurityTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ProtectedMediaSecurityTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ProtectedMediaSecurityTestResult[];
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runProtectedMediaSecurityTestSuite(): Promise<ProtectedMediaSecurityTestSuiteSummary> {
  const startTime = Date.now();
  const results: ProtectedMediaSecurityTestResult[] = [];

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const t0 = Date.now();
    try {
      protectedMediaService.resetSecurityStorageForTesting();
      exclusiveContentAndInterestService.resetForAutomatedTesting();
      screenSecurityService.resetForTesting();

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
        evidence: 'Falha na asserção de proteção progressiva de mídias.',
        error: err?.message || String(err),
      });
    }
  };

  // =========================================================================
  // TESTE 1: Usuário autorizado consegue visualizar a mídia com Cache-Control no-store e TTL 900s
  // =========================================================================
  await runTest(
    1,
    'PM-PROG-01',
    'Usuário autorizado obtém URL temporária assinada com Cache-Control no-store e TTL de 900s',
    async () => {
      const buyerId = 'usr_authorized_viewer_01';
      const mediaId = 'excl_photo_val_01'; // 49 💎

      const purchase = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: buyerId,
        mediaId,
        idempotencyKey: `idemp_sec_auth_${Date.now()}`,
        buyerAgeVerified18Plus: true,
      });

      assertCondition(purchase.success === true, 'Compra de desbloqueio individual deveria ter sucesso.');
      assertCondition(Boolean(purchase.delivery), 'Entrega assinada deveria estar presente.');
      assertCondition(
        purchase.delivery?.cacheControl === PROTECTED_MEDIA_CACHE_CONTROL,
        `Cache-Control incorreto: ${purchase.delivery?.cacheControl}`
      );
      assertCondition(purchase.delivery?.ttlSeconds === 900, `TTL esperado 900s, obtido ${purchase.delivery?.ttlSeconds}`);
      assertCondition(
        Boolean(purchase.delivery?.signedTemporaryUrl.includes('tkt=') && purchase.delivery?.signedTemporaryUrl.includes('sig=')),
        'URL assinada deve conter ticket e assinatura HMAC/FNV.'
      );

      const deliveryCheck = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        existingTokenId: purchase.delivery?.tokenId,
      });
      assertCondition(deliveryCheck.allowed === true && deliveryCheck.code === 'DELIVERY_AUTHORIZED', 'Verificação de entrega autorizada falhou.');

      return `Entrega autorizada: token=${purchase.delivery?.tokenId}, TTL=${purchase.delivery?.ttlSeconds}s, Cache-Control="${purchase.delivery?.cacheControl}".`;
    }
  );

  // =========================================================================
  // TESTE 2: Usuário não autenticado tem acesso negado
  // =========================================================================
  await runTest(
    2,
    'PM-PROG-02',
    'Usuário não autenticado tem acesso negado na emissão e na verificação de URL assinada',
    () => {
      const res1 = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: '',
        mediaId: 'excl_photo_val_01',
      });
      assertCondition(res1.allowed === false && res1.code === 'DENIED_UNAUTHENTICATED', 'Deveria negar com DENIED_UNAUTHENTICATED.');

      const res2 = protectedMediaService.requestAuthorizedMediaAccess({
        userId: '   ',
        contentId: 'excl_photo_val_01',
        rawMasterUrl: 'private://vault/valentina/master_photo_florence_4k.jpg',
      });
      assertCondition(
        res2.allowed === false && res2.code === 'ACCESS_DENIED_UNAUTHENTICATED' && !res2.deliveryUrl,
        'Deveria negar com ACCESS_DENIED_UNAUTHENTICATED e sem deliveryUrl.'
      );

      return `Solicitações anônimas bloqueadas com códigos ${res1.code} e ${res2.code} (nenhuma URL entregue).`;
    }
  );

  // =========================================================================
  // TESTE 3: Usuário autenticado sem permissão não acessa mídia exclusiva/Cofre VIP e recebe teaser SVG opaco
  // =========================================================================
  await runTest(
    3,
    'PM-PROG-03',
    'Usuário autenticado sem permissão tem acesso negado à mídia exclusiva e Cofre VIP e recebe teaser SVG opaco sem expor URL original',
    () => {
      const unauthUser = 'usr_without_grant_99';

      const indAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: unauthUser,
        mediaId: 'excl_photo_val_01',
      });
      assertCondition(
        indAttempt.allowed === false && indAttempt.code === 'DENIED_NO_ACCESS_GRANT' && !indAttempt.delivery,
        'Deveria negar acesso a item de desbloqueio individual não adquirido.'
      );

      const vaultAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: unauthUser,
        mediaId: 'excl_vault_val_03',
      });
      assertCondition(
        vaultAttempt.allowed === false && vaultAttempt.code === 'DENIED_NO_ACCESS_GRANT' && !vaultAttempt.delivery,
        'Deveria negar acesso a item do Cofre VIP não adquirido.'
      );

      const teaser = protectedMediaService.getPublicTeaserUrl({
        id: 'excl_photo_val_01',
        mediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
      });
      assertCondition(teaser.startsWith('data:image/svg+xml;utf8,'), 'Teaser público deve ser SVG inline opaco.');
      assertCondition(
        !teaser.includes('profile_valentina') && !teaser.includes('.jpg'),
        'Teaser público não pode vazar nome de arquivo ou caminho da mídia original.'
      );

      return `Acesso negado (${indAttempt.code}) para Individual e Cofre VIP; teaser SVG opaco gerado sem expor a URL original.`;
    }
  );

  // =========================================================================
  // TESTE 4: Proteção anti-IDOR (alteração de ID de usuário, mídia ou assinatura na URL)
  // =========================================================================
  await runTest(
    4,
    'PM-PROG-04',
    'Proteção anti-IDOR bloqueia adulteração de ID de usuário, ID de conteúdo ou assinatura na URL',
    async () => {
      const legitimateBuyer = 'usr_legit_buyer_10';
      const attackerUser = 'usr_attacker_idor_20';
      const mediaId = 'excl_photo_val_01';

      const purchase = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: legitimateBuyer,
        mediaId,
        idempotencyKey: `idemp_idor_test_${Date.now()}`,
        buyerAgeVerified18Plus: true,
      });
      const validTokenId = purchase.delivery!.tokenId;

      // 1. Atacante tenta reutilizar o tokenId do comprador legítimo
      const idorByUser = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: attackerUser,
        mediaId,
        existingTokenId: validTokenId,
      });
      assertCondition(
        idorByUser.allowed === false && idorByUser.code === 'DENIED_IDOR_TOKEN_MISMATCH',
        'Falha ao bloquear IDOR por troca de usuário.'
      );

      // 2. Comprador legítimo tenta reutilizar o tokenId da foto 01 para acessar o vídeo 02
      const idorByMedia = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: legitimateBuyer,
        mediaId: 'excl_video_val_02',
        existingTokenId: validTokenId,
      });
      assertCondition(
        idorByMedia.allowed === false && idorByMedia.code === 'DENIED_IDOR_TOKEN_MISMATCH',
        'Falha ao bloquear IDOR por troca de mediaId.'
      );

      // 3. Adulteração de assinatura na URL direta
      const authRes = protectedMediaService.requestAuthorizedMediaAccess({
        userId: legitimateBuyer,
        contentId: mediaId,
        rawMasterUrl: 'private://vault/valentina/master_photo_florence_4k.jpg',
        hasExternalGrant: true,
      });
      const tamperedUrl = (authRes.deliveryUrl || '').replace(/sig=sig_[0-9a-f]+/, 'sig=sig_deadbeef');
      const sigCheck = protectedMediaService.verifySignedDeliveryUrl({
        deliveryUrl: tamperedUrl,
        requestingUserId: legitimateBuyer,
        expectedContentId: mediaId,
      });
      assertCondition(
        sigCheck.allowed === false && sigCheck.code === 'ACCESS_DENIED_INVALID_SIGNATURE',
        'Falha ao bloquear adulteração de assinatura na URL.'
      );

      return `3 vetores anti-IDOR bloqueados: user mismatch (${idorByUser.code}), media mismatch (${idorByMedia.code}) e assinatura adulterada (${sigCheck.code}).`;
    }
  );

  // =========================================================================
  // TESTE 5: Expiração de URL assinada e renovação controlada sem nova cobrança
  // =========================================================================
  await runTest(
    5,
    'PM-PROG-05',
    'URL assinada expirada é rejeitada e renovação controlada funciona apenas para quem continua autorizado sem nova cobrança',
    async () => {
      const buyerId = 'usr_renewal_buyer_01';
      const mediaId = 'excl_photo_val_01';

      const walletBefore = exclusiveContentAndInterestService.getUserDiamondWallet(buyerId);
      const purchase = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: buyerId,
        mediaId,
        idempotencyKey: `idemp_renew_${Date.now()}`,
        buyerAgeVerified18Plus: true,
      });
      const walletAfterPurchase = exclusiveContentAndInterestService.getUserDiamondWallet(buyerId);
      assertCondition(
        walletAfterPurchase.totalAvailableDiamonds === walletBefore.totalAvailableDiamonds - 49,
        'Cobrança inicial de 49 diamantes não registrada corretamente.'
      );

      const initialTokenId = purchase.delivery!.tokenId;
      const futureAfter16MinMs = Date.now() + 16 * 60 * 1000;

      // 1. Verifica expiração após 16 minutos (> 15 min de TTL)
      const expiredCheck = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        existingTokenId: initialTokenId,
        simulatedCurrentTimestampMs: futureAfter16MinMs,
      });
      assertCondition(
        expiredCheck.allowed === false && expiredCheck.code === 'DENIED_TOKEN_EXPIRED',
        'Token deveria expirar após 16 minutos.'
      );

      // 2. Renovação controlada para comprador legítimo emite novo token e revoga o anterior sem cobrar diamantes
      const renewed = exclusiveContentAndInterestService.renewSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        previousTokenId: initialTokenId,
      });
      assertCondition(
        renewed.allowed === true && renewed.code === 'DELIVERY_AUTHORIZED' && renewed.delivery?.tokenId !== initialTokenId,
        'Renovação legítima deveria emitir novo token autorizado.'
      );

      const walletAfterRenewal = exclusiveContentAndInterestService.getUserDiamondWallet(buyerId);
      assertCondition(
        walletAfterRenewal.totalAvailableDiamonds === walletAfterPurchase.totalAvailableDiamonds,
        'Renovação de URL assinada NÃO pode cobrar diamantes novamente.'
      );

      // Token antigo foi revogado na renovação
      const oldTokenReused = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        existingTokenId: initialTokenId,
      });
      assertCondition(
        oldTokenReused.allowed === false && oldTokenReused.code === 'DENIED_TOKEN_REVOKED',
        'Token substituído na renovação deveria constar como revogado.'
      );

      // 3. Usuário sem permissão não consegue renovar
      const unauthorizedRenewal = exclusiveContentAndInterestService.renewSignedMediaDelivery({
        requesterUserId: 'usr_stranger_no_grant',
        mediaId,
      });
      assertCondition(
        unauthorizedRenewal.allowed === false && unauthorizedRenewal.code === 'DENIED_NO_ACCESS_GRANT',
        'Usuário sem direito de acesso não pode renovar URL assinada.'
      );

      return `Expiração em +16min (${expiredCheck.code}), renovação controlada sem cobrança extra (${initialTokenId} -> ${renewed.delivery?.tokenId}) e revogação do token anterior comprovadas.`;
    }
  );

  // =========================================================================
  // TESTE 6: Revogação imediata por bloqueio entre usuários ou mudança de modalidade/estado
  // =========================================================================
  await runTest(
    6,
    'PM-PROG-06',
    'Bloqueio entre usuários ou mudança de modalidade/estado da mídia revoga imediatamente os tokens emitidos',
    async () => {
      const buyerId = 'usr_block_revocation_01';
      const creatorId = 'valentina';
      const mediaId = 'excl_photo_val_01';

      const purchase = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: buyerId,
        mediaId,
        idempotencyKey: `idemp_revoke_blk_${Date.now()}`,
        buyerAgeVerified18Plus: true,
      });
      const issuedTokenId = purchase.delivery!.tokenId;

      // 1. Criadora bloqueia o comprador -> revoga grant e tokens imediatamente
      exclusiveContentAndInterestService.blockUserPair(
        creatorId,
        buyerId,
        'Comportamento inadequado no chat'
      );

      const accessAfterBlock = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        existingTokenId: issuedTokenId,
      });
      assertCondition(
        accessAfterBlock.allowed === false && accessAfterBlock.code === 'DENIED_USER_BLOCKED',
        'Acesso deveria ser negado imediatamente após bloqueio entre usuários.'
      );

      // Mesmo após desbloquear o par, o token emitido antes do bloqueio continua revogado
      exclusiveContentAndInterestService.unblockUserPair(creatorId, buyerId);
      const oldTokenAfterUnblock = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: buyerId,
        mediaId,
        existingTokenId: issuedTokenId,
      });
      assertCondition(
        oldTokenAfterUnblock.allowed === false && oldTokenAfterUnblock.code === 'DENIED_TOKEN_REVOKED',
        'Token emitido antes do bloqueio deve permanecer permanentemente revogado.'
      );

      // 2. Mudança de modalidade de um item gratuito para INDIVIDUAL_UNLOCK revoga tokens anteriores daquele item
      const freeDelivery = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'usr_free_reader',
        mediaId: 'excl_free_val_05',
      });
      assertCondition(freeDelivery.allowed === true, 'Item gratuito deveria emitir token inicial.');
      const freeTokenId = freeDelivery.delivery!.tokenId;

      exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'excl_free_val_05',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        priceDiamonds: 49,
        caption: 'Conteúdo convertido para Exclusivo Individual (49 💎)',
        classification: 'fashion_lingerie',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        privateMasterUrl: 'private://vault/valentina/free_milan_morning.jpg',
      });

      const afterModalityChange = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'usr_free_reader',
        mediaId: 'excl_free_val_05',
        existingTokenId: freeTokenId,
      });
      assertCondition(
        afterModalityChange.allowed === false && afterModalityChange.code === 'DENIED_TOKEN_REVOKED',
        'Mudança de modalidade deveria revogar tokens anteriores do item.'
      );

      return `Revogação imediata verificada tanto por bloqueio de usuário (${accessAfterBlock.code}) quanto por mudança de modalidade (${afterModalityChange.code}).`;
    }
  );

  // =========================================================================
  // TESTE 7: Fase 2 — Gerenciamento dinâmico de FLAG_SECURE no Android por escopo
  // =========================================================================
  await runTest(
    7,
    'PM-PROG-07',
    'Fase 2 (Android): screenSecurityService ativa FLAG_SECURE ao abrir escopos de mídia protegida e remove somente ao fechar o último escopo',
    () => {
      const calls: boolean[] = [];
      (globalThis as any).Capacitor = {
        Plugins: {
          JobsScreenSecurity: {
            setSecureScreen: ({ enabled }: { enabled: boolean }) => {
              calls.push(enabled);
            },
          },
        },
      };

      try {
        assertCondition(screenSecurityService.isSecureScreenActive() === false, 'Estado inicial deve ser inativo.');

        // Abre galeria protegida (escopo 1)
        screenSecurityService.acquireSecureScreen('vault_feed_grid');
        assertCondition(screenSecurityService.isSecureScreenActive() === true, 'Deveria ativar com escopo 1.');
        assertCondition(calls.length === 1 && calls[0] === true, 'Plugin nativo deveria receber setSecureScreen(true).');

        // Abre modal de visualização em tela cheia sobre a galeria (escopo 2)
        screenSecurityService.acquireSecureScreen('protected_viewer_excl_photo_val_01');
        assertCondition(screenSecurityService.getActiveSecureScopes().length === 2, 'Deveria ter 2 escopos ativos.');
        assertCondition(calls.length === 1, 'Não deve invocar plugin nativo redundantemente quando já ativo.');

        // Fecha o modal mas continua na galeria protegida -> FLAG_SECURE permanece ativa!
        screenSecurityService.releaseSecureScreen('protected_viewer_excl_photo_val_01');
        assertCondition(screenSecurityService.isSecureScreenActive() === true, 'Deveria permanecer ativo enquanto restar escopo.');

        // Sai da galeria protegida -> último escopo encerrado, remove FLAG_SECURE!
        screenSecurityService.releaseSecureScreen('vault_feed_grid');
        assertCondition(screenSecurityService.isSecureScreenActive() === false, 'Deveria desativar ao encerrar último escopo.');
        assertCondition(
          calls.length === 2 && calls[0] === true && calls[1] === false,
          'Plugin nativo deveria receber setSecureScreen(false) ao sair de todos os escopos.'
        );

        return `FLAG_SECURE gerenciado por contagem de referência: chamadas nativas=[${calls.join(', ')}] para 2 escopos sobrepostos.`;
      } finally {
        delete (globalThis as any).Capacitor;
      }
    }
  );

  // =========================================================================
  // TESTE 8: Fase 3 — Marca-d'água forense dinâmica com ID ofuscado sem PII sensível
  // =========================================================================
  await runTest(
    8,
    'PM-PROG-08',
    'Fase 3 (Web): Marca-d’água forense gera código de sessão e ID ofuscado sem expor dados pessoais sensíveis (e-mail, CPF, telefone)',
    () => {
      const rawEmailUserId = 'joemilio.borges+vip@gmail.com';
      const obfuscated = obfuscateUserIdForWatermark(rawEmailUserId);
      const wm = formatForensicWatermark(rawEmailUserId, 's_99aabb', '2026-10-27T12:00:00.000Z');

      assertCondition(/^USR-[A-Z0-9]{4}\*\*\*[A-Z0-9]{2}$/.test(obfuscated), `Formato ofuscado inválido: ${obfuscated}`);
      assertCondition(
        !wm.primaryLine.includes('@') && !wm.primaryLine.includes('gmail') && !wm.displayNotice.includes('@'),
        'Marca-d’água não pode conter endereço de e-mail nem domínio.'
      );
      assertCondition(wm.secondaryLine.includes('SESSÃO #S_99AABB'), 'Linha secundária deve conter código de sessão.');

      return `Marca-d'água gerada sem PII: primaryLine="${wm.primaryLine}" | secondaryLine="${wm.secondaryLine}".`;
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
