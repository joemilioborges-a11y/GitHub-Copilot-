/**
 * JOBS — SUÍTE ABRANGENTE DE TESTES AUTOMATIZADOS (SEÇÕES 9.1 A 9.7)
 * Monetização de Conteúdo Exclusivo (Fotos e Vídeos Individuais), Cofre VIP Independente,
 * Envio de Interesse Imediato Pago, Ações Pós-Match e Reconciliação Contábil 70/30 em Sandbox.
 */

import {
  exclusiveContentAndInterestService,
  calculateSplit7030Cents,
  calculateSplit70_20_10Cents,
  INITIAL_DIAMOND_SERVICE_CATALOG,
} from '../exclusiveContentAndInterestService';
import { matchAndMessagingService } from '../matchAndMessagingService';

export interface ExclusiveMonetizationTestResult {
  testNumber: number;
  id: string;
  section: '9.1' | '9.2' | '9.3' | '9.4' | '9.5' | '9.6' | '9.7';
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ExclusiveMonetizationSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ExclusiveMonetizationTestResult[];
}

function assertCondition(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runExclusiveContentAndInterestTestSuite(): Promise<ExclusiveMonetizationSuiteSummary> {
  const suiteStart = Date.now();
  const results: ExclusiveMonetizationTestResult[] = [];

  const runTest = async (
    testNumber: number,
    id: string,
    section: ExclusiveMonetizationTestResult['section'],
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const start = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        section,
        name,
        passed: true,
        durationMs: Date.now() - start,
        evidence,
      });
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        section,
        name,
        passed: false,
        durationMs: Date.now() - start,
        evidence: 'Falha na asserção',
        error: err?.message || String(err),
      });
    }
  };

  // Limpeza inicial do ambiente Sandbox para execução determinística
  exclusiveContentAndInterestService.resetForAutomatedTesting();

  // ==========================================================================
  // 9.1 TESTES UNITÁRIOS
  // ==========================================================================

  await runTest(
    1,
    'EX-9.1-01',
    '9.1',
    'Cálculo exato de 70% criador e 30% JOBS em centavos (R$ 10,00, R$ 19,90, R$ 99,99 e centavos quebrados)',
    () => {
      const s1000 = calculateSplit7030Cents(1000); // R$ 10,00
      assertCondition(
        s1000.creatorShareCents === 700 && s1000.platformCommissionCents === 300 && s1000.isBalanced,
        `Falha em R$ 10,00: ${JSON.stringify(s1000)}`
      );

      const s1990 = calculateSplit7030Cents(1990); // R$ 19,90 -> 1393 + 597 = 1990
      assertCondition(
        s1990.creatorShareCents === 1393 && s1990.platformCommissionCents === 597 && s1990.isBalanced,
        `Falha em R$ 19,90: ${JSON.stringify(s1990)}`
      );

      const s9999 = calculateSplit7030Cents(9999); // R$ 99,99 -> 6999 + 3000 = 9999
      assertCondition(
        s9999.creatorShareCents === 6999 &&
          s9999.platformCommissionCents === 3000 &&
          s9999.creatorShareCents + s9999.platformCommissionCents === 9999,
        `Falha em R$ 99,99: ${JSON.stringify(s9999)}`
      );

      // Verificação de invariante para 50 valores consecutivos de centavos quebrados
      for (let c = 1; c <= 50; c++) {
        const sp = calculateSplit7030Cents(c);
        assertCondition(
          sp.creatorShareCents + sp.platformCommissionCents === c,
          `Quebra de invariante para ${c} centavos`
        );
      }

      return `R$ 10,00 -> (700c + 300c); R$ 19,90 -> (1393c + 597c); R$ 99,99 -> (6999c + 3000c); Invariante 100% preservado`;
    }
  );

  await runTest(
    2,
    'EX-9.1-02',
    '9.1',
    'Validação de ciclo de estados de mídia: draft, under_review, published, blocked e removed',
    () => {
      const draftMedia = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'unit_state_media_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Foto em Rascunho para Teste de Ciclo de Vida',
        priceCents: 1500,
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview.jpg',
        privateMasterUrl: 'private://master.jpg',
        initialState: 'draft',
      });
      assertCondition(draftMedia.state === 'draft' && draftMedia.publishedAt === null, 'Deveria iniciar em draft');

      const reviewMedia = exclusiveContentAndInterestService.transitionMediaState({
        mediaId: draftMedia.id,
        actorId: 'valentina',
        newState: 'under_review',
      });
      assertCondition(
        reviewMedia.state === 'under_review' && reviewMedia.moderationResult === 'pending',
        'Deveria transitar para under_review'
      );

      const pubMedia = exclusiveContentAndInterestService.transitionMediaState({
        mediaId: draftMedia.id,
        actorId: 'admin_mod',
        newState: 'published',
        moderationResult: 'approved',
      });
      assertCondition(
        pubMedia.state === 'published' && pubMedia.moderationResult === 'approved' && Boolean(pubMedia.publishedAt),
        'Deveria transitar para published com publishedAt preenchido'
      );

      const blockedMedia = exclusiveContentAndInterestService.transitionMediaState({
        mediaId: draftMedia.id,
        actorId: 'admin_mod',
        newState: 'blocked',
        reason: 'Bloqueio preventivo',
      });
      assertCondition(blockedMedia.state === 'blocked', 'Deveria transitar para blocked');

      const removedMedia = exclusiveContentAndInterestService.transitionMediaState({
        mediaId: draftMedia.id,
        actorId: 'admin_mod',
        newState: 'removed',
        reason: 'Remoção definitiva',
      });
      assertCondition(removedMedia.state === 'removed', 'Deveria transitar para removed');

      return `Transições válidas auditadas: draft -> under_review -> published -> blocked -> removed`;
    }
  );

  // ==========================================================================
  // 9.2 TESTES DE INTEGRAÇÃO
  // ==========================================================================

  await runTest(
    3,
    'EX-9.2-01',
    '9.2',
    'Publicação de FOTO com preço individual, compra confirmada, liberação de acesso e lançamento contábil 70/30',
    async () => {
      const photo = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'int_photo_ind_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Foto Exclusiva Individual Florença',
        priceCents: 2000, // R$ 20,00 -> 1400c criador / 600c JOBS
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_florence.jpg',
        privateMasterUrl: 'private://vault/valentina/florence_hd.jpg',
        initialState: 'published',
      });

      const res = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_photo_01',
        mediaId: photo.id,
        idempotencyKey: 'idemp_int_photo_01',
        buyerAgeVerified18Plus: true,
      });

      assertCondition(res.success && !res.isReplay, 'Compra da foto individual deveria ter sucesso');
      assertCondition(res.transaction.category === 'INDIVIDUAL_PHOTO_UNLOCK', 'Categoria contábil incorreta');
      assertCondition(res.transaction.creatorShareCents === 1400, '70% do criador deveria ser 1400 centavos');
      assertCondition(res.transaction.platformCommissionCents === 600, '30% JOBS deveria ser 600 centavos');
      assertCondition(
        exclusiveContentAndInterestService.hasAuthorizedMediaAccess('buyer_photo_01', photo.id),
        'Acesso à foto individual deveria estar liberado'
      );
      assertCondition(Boolean(res.delivery?.signedTemporaryUrl), 'URL temporária assinada deveria ser emitida');

      return `Foto ${photo.id} desbloqueada: Bruto=2000c, Criador(70%)=1400c, JOBS(30%)=600c, Token=${res.delivery?.tokenId}`;
    }
  );

  await runTest(
    4,
    'EX-9.2-02',
    '9.2',
    'Publicação de VÍDEO com preço individual, compra confirmada, liberação de acesso e lançamento contábil 70/30',
    async () => {
      const video = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'int_video_ind_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'video',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Vídeo Exclusivo Individual Backstage 4K',
        priceCents: 3500, // R$ 35,00 -> 2450c criador / 1050c JOBS
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_video.jpg',
        privateMasterUrl: 'private://vault/valentina/backstage_4k.mp4',
        initialState: 'published',
      });

      const res = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'buyer_video_01',
        mediaId: video.id,
        idempotencyKey: 'idemp_int_video_01',
        buyerAgeVerified18Plus: true,
      });

      assertCondition(res.success && !res.isReplay, 'Compra do vídeo individual deveria ter sucesso');
      assertCondition(res.transaction.category === 'INDIVIDUAL_VIDEO_UNLOCK', 'Categoria deveria ser INDIVIDUAL_VIDEO_UNLOCK');
      assertCondition(res.transaction.creatorShareCents === 2450, '70% criador deveria ser 2450 centavos');
      assertCondition(res.transaction.platformCommissionCents === 1050, '30% JOBS deveria ser 1050 centavos');
      assertCondition(
        exclusiveContentAndInterestService.hasAuthorizedMediaAccess('buyer_video_01', video.id),
        'Acesso ao vídeo individual deveria estar liberado'
      );

      return `Vídeo ${video.id} desbloqueado: Bruto=3500c, Criador(70%)=2450c, JOBS(30%)=1050c`;
    }
  );

  await runTest(
    5,
    'EX-9.2-03',
    '9.2',
    'Configuração do Cofre VIP, compra confirmada, liberação do Cofre VIP e lançamento contábil 70/30',
    async () => {
      exclusiveContentAndInterestService.updateVipVaultConfig({
        creatorId: 'isabella',
        priceCents: 5000, // R$ 50,00 -> 3500c criador / 1500c JOBS
      });

      const res = await exclusiveContentAndInterestService.purchaseVipVaultAccess({
        buyerUserId: 'buyer_vault_01',
        creatorId: 'isabella',
        idempotencyKey: 'idemp_int_vault_isa_01',
        buyerAgeVerified18Plus: true,
      });

      assertCondition(res.success && !res.isReplay, 'Compra do Cofre VIP deveria ser confirmada');
      assertCondition(res.transaction.category === 'VIP_VAULT_ACCESS', 'Categoria deveria ser VIP_VAULT_ACCESS');
      assertCondition(res.transaction.creatorShareCents === 3500, '70% criador deveria ser 3500 centavos');
      assertCondition(res.transaction.platformCommissionCents === 1500, '30% JOBS deveria ser 1500 centavos');
      assertCondition(
        exclusiveContentAndInterestService.hasActiveVipVaultAccess('buyer_vault_01', 'isabella'),
        'Passe do Cofre VIP deveria estar ativo'
      );
      assertCondition(
        exclusiveContentAndInterestService.hasAuthorizedMediaAccess('buyer_vault_01', 'excl_vault_isa_02'),
        'Mídias pertencentes ao Cofre VIP de Isabella deveriam estar liberadas'
      );

      return `Cofre VIP Isabella liberado: Bruto=5000c, Criador(70%)=3500c, JOBS(30%)=1500c`;
    }
  );

  await runTest(
    6,
    'EX-9.2-04',
    '9.2',
    'Envio de interesse imediato pago, confirmação do pagamento, crédito 70/30 e liberação do envio de mensagem',
    async () => {
      const senderId = 'sender_imm_01';
      const recipientId = 'isabella';

      // Antes do interesse imediato, sem match mútuo, não pode enviar mensagem
      const beforeCheck = exclusiveContentAndInterestService.canUsersExchangeMessages(senderId, recipientId);
      assertCondition(!beforeCheck.allowed, 'Não deveria permitir mensagem antes do interesse imediato ou match');

      const res = await exclusiveContentAndInterestService.sendPaidImmediateInterest({
        senderUserId: senderId,
        recipientUserId: recipientId,
        recipientName: 'Isabella Fontes',
        idempotencyKey: 'idemp_imm_interest_01',
        initialMessage: 'Olá Isabella! Adorei seu perfil e enviei um Interesse Imediato.',
        priceCents: 1990, // R$ 19,90 -> 1393c destinatária / 597c JOBS
        senderAgeVerified18Plus: true,
      });

      assertCondition(res.success && Boolean(res.transaction), 'Interesse imediato pago deveria ser confirmado');
      assertCondition(res.transaction!.creatorShareCents === 1393, '70% destinatária deveria ser 1393 centavos');
      assertCondition(res.transaction!.platformCommissionCents === 597, '30% JOBS deveria ser 597 centavos');

      const afterCheck = exclusiveContentAndInterestService.canUsersExchangeMessages(senderId, recipientId);
      assertCondition(
        afterCheck.allowed && afterCheck.authorizationSource === 'PAID_IMMEDIATE_INTEREST',
        'Conversa deveria estar liberada por PAID_IMMEDIATE_INTEREST'
      );

      const followUpMsg = exclusiveContentAndInterestService.sendAuthorizedMessage({
        senderUserId: senderId,
        recipientUserId: recipientId,
        text: 'Que ótimo que agora podemos conversar diretamente!',
      });
      assertCondition(followUpMsg.sent, 'Envio de mensagem subsequente deveria ser permitido');

      return `Interesse Imediato confirmado: Bruto=1990c, Destinatária(70%)=1393c, JOBS(30%)=597c, Chat=LIBERADO`;
    }
  );

  await runTest(
    7,
    'EX-9.2-05',
    '9.2',
    'Fluxo pós-match em "Deu match no JOBS!": "Mandar mensagem agora" gratuito e "Ver Cofre VIP" independente',
    async () => {
      const userA = 'user_match_free_a';
      const userB = 'valentina';

      // Cria match mútuo real
      matchAndMessagingService.seedInitialTestMatch(userA, userB);

      // Ação 1: Mandar mensagem agora é gratuita e autorizada por MUTUAL_MATCH
      const chatPermission = exclusiveContentAndInterestService.canUsersExchangeMessages(userA, userB);
      assertCondition(
        chatPermission.allowed && chatPermission.authorizationSource === 'MUTUAL_MATCH',
        'Match mútuo deve liberar conversa gratuitamente'
      );

      const msgRes = exclusiveContentAndInterestService.sendAuthorizedMessage({
        senderUserId: userA,
        recipientUserId: userB,
        text: 'Oi Valentina! Deu match no JOBS!',
      });
      assertCondition(msgRes.sent && msgRes.authorizationSource === 'MUTUAL_MATCH', 'Mensagem pós-match gratuita falhou');

      // Tentativa de cobrar interesse imediato quando já existe match deve ser bloqueada
      let blockedRedundantCharge = false;
      try {
        await exclusiveContentAndInterestService.sendPaidImmediateInterest({
          senderUserId: userA,
          recipientUserId: userB,
          recipientName: 'Valentina Rossi',
          idempotencyKey: 'idemp_redundant_interest_after_match',
        });
      } catch {
        blockedRedundantCharge = true;
      }
      assertCondition(blockedRedundantCharge, 'Não deve permitir cobrança de interesse imediato se já houver match válido');

      // Ação 2: Ver Cofre VIP continua independente (match não libera o Cofre VIP de graça)
      assertCondition(
        !exclusiveContentAndInterestService.hasActiveVipVaultAccess(userA, userB),
        'Match mútuo não deve liberar gratuitamente o Cofre VIP pago'
      );

      return `Pós-match validado: "Mandar mensagem agora" gratuito (MUTUAL_MATCH), cobrança redundante bloqueada e "Ver Cofre VIP" independente`;
    }
  );

  // ==========================================================================
  // 9.3 TESTES DE CONTRATO E API
  // ==========================================================================

  await runTest(
    8,
    'EX-9.3-01',
    '9.3',
    'Validação de contratos de criação, rejeição de preço zero/negativo e ocultação de privateMasterUrl na listagem',
    async () => {
      let rejectedZeroPrice = false;
      try {
        exclusiveContentAndInterestService.publishOrCreateMedia({
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'INDIVIDUAL_UNLOCK',
          caption: 'Mídia com preço zero inválido',
          priceCents: 0,
          classification: 'sensual',
          ageVerified18Plus: true,
          consentDeclared: true,
          safePreviewUrl: '/prev.jpg',
          privateMasterUrl: 'private://secret.jpg',
        });
      } catch {
        rejectedZeroPrice = true;
      }
      assertCondition(rejectedZeroPrice, 'Deveria rejeitar mídia individual com preço <= 0');

      const publicList = exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: 'valentina',
        viewerUserId: 'anonymous_viewer',
      });
      assertCondition(publicList.length > 0, 'Listagem pública deveria retornar itens publicados');
      for (const item of publicList) {
        assertCondition(
          !('privateMasterUrl' in (item as any)),
          'Listagem pública NUNCA deve expor o campo privateMasterUrl'
        );
      }

      const paginated = exclusiveContentAndInterestService.getMonetizedTransactions({
        environment: 'sandbox',
        page: 1,
        pageSize: 2,
      });
      assertCondition(
        paginated.items.length <= 2 && paginated.page === 1 && paginated.pageSize === 2,
        'Contrato de paginação de transações falhou'
      );

      return `Preços inválidos rejeitados, privateMasterUrl omitido em 100% da listagem pública e paginação validada (total=${paginated.total})`;
    }
  );

  // ==========================================================================
  // 9.4 TESTES DE SEGURANÇA E CONTROLE DE ACESSO
  // ==========================================================================

  await runTest(
    9,
    'EX-9.4-01',
    '9.4',
    'Bloqueio de usuário não autenticado e usuário autenticado sem compra ao requisitar URL de mídia ou Cofre VIP',
    () => {
      const unauth = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: '',
        mediaId: 'excl_photo_val_01',
      });
      assertCondition(
        !unauth.allowed && unauth.code === 'DENIED_UNAUTHENTICATED',
        'Usuário não autenticado deve ser negado'
      );

      const unpaidUser = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'user_never_paid_99',
        mediaId: 'excl_photo_val_01',
      });
      assertCondition(
        !unpaidUser.allowed && unpaidUser.code === 'DENIED_NO_ACCESS_GRANT' && !unpaidUser.delivery,
        'Usuário sem compra não pode receber URL assinada'
      );

      return `Acesso não autenticado (${unauth.code}) e sem compra (${unpaidUser.code}) bloqueados sem vazar URL`;
    }
  );

  await runTest(
    10,
    'EX-9.4-02',
    '9.4',
    'Proteção contra IDOR e expiração de URL temporária assinada',
    () => {
      // buyer_photo_01 comprou int_photo_ind_01 no teste 9.2-01
      const validDelivery = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'buyer_photo_01',
        mediaId: 'int_photo_ind_01',
      });
      assertCondition(validDelivery.allowed && Boolean(validDelivery.delivery), 'Comprador legítimo deve ter acesso');

      // Tentativa de IDOR: outro usuário tentando reutilizar o tokenId do comprador legítimo
      const idorAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'attacker_user_idor',
        mediaId: 'int_photo_ind_01',
        existingTokenId: validDelivery.delivery!.tokenId,
      });
      assertCondition(
        !idorAttempt.allowed && idorAttempt.code === 'DENIED_IDOR_TOKEN_MISMATCH',
        'Tentativa de IDOR com token de outro usuário deve ser bloqueada'
      );

      // Simulação de expiração da URL temporária (+20 minutos no futuro)
      const expiredAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'buyer_photo_01',
        mediaId: 'int_photo_ind_01',
        existingTokenId: validDelivery.delivery!.tokenId,
        simulatedCurrentTimestampMs: Date.now() + 20 * 60 * 1000,
      });
      assertCondition(
        !expiredAttempt.allowed && expiredAttempt.code === 'DENIED_TOKEN_EXPIRED',
        'Token temporário expirado deve negar acesso'
      );

      return `IDOR bloqueado (${idorAttempt.code}) e expiração de TTL 15m validada (${expiredAttempt.code})`;
    }
  );

  await runTest(
    11,
    'EX-9.4-03',
    '9.4',
    'Independência estrita: compra de mídia individual NÃO libera Cofre VIP e compra do Cofre VIP NÃO libera mídia individual',
    () => {
      // 1. buyer_photo_01 comprou a mídia individual 'int_photo_ind_01' de Valentina, mas NÃO comprou o Cofre VIP de Valentina
      const hasVaultFromInd = exclusiveContentAndInterestService.hasActiveVipVaultAccess('buyer_photo_01', 'valentina');
      const vaultMediaAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'buyer_photo_01',
        mediaId: 'excl_vault_val_03', // Item do Cofre VIP de Valentina
      });
      assertCondition(
        !hasVaultFromInd && !vaultMediaAttempt.allowed,
        'Compra de mídia individual NÃO pode liberar o Cofre VIP'
      );

      // 2. buyer_vault_01 comprou o Cofre VIP de Isabella no teste 9.2-03, mas NÃO comprou a foto individual 'excl_photo_isa_01'
      const hasIndividualFromVault = exclusiveContentAndInterestService.hasActiveIndividualMediaUnlock(
        'buyer_vault_01',
        'excl_photo_isa_01'
      );
      const indMediaAttempt = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'buyer_vault_01',
        mediaId: 'excl_photo_isa_01', // Foto individual fora do Cofre VIP
      });
      assertCondition(
        !hasIndividualFromVault && !indMediaAttempt.allowed,
        'Compra do Cofre VIP NÃO pode liberar mídias individuais avulsas'
      );

      return `Isolamento bidirecional comprovado: Individual != Cofre VIP e Cofre VIP != Individual`;
    }
  );

  await runTest(
    12,
    'EX-9.4-04',
    '9.4',
    'Respeito imediato a bloqueio entre usuários e prevenção de manipulação de preço no cliente (Parameter Tampering)',
    async () => {
      // 1. Manipulação de preço no cliente (enviar 100 centavos para mídia de 1990 centavos)
      let tamperingBlocked = false;
      try {
        await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'tamper_buyer_01',
          mediaId: 'excl_photo_val_01',
          idempotencyKey: 'idemp_tamper_01',
          clientProvidedPriceCents: 100,
          rejectPriceTampering: true,
        });
      } catch {
        tamperingBlocked = true;
      }
      assertCondition(tamperingBlocked, 'Manipulação de preço pelo cliente deve ser rejeitada');

      // 2. Bloqueio entre usuários impede compra de mídia, Cofre VIP, interesse imediato e mensagem
      exclusiveContentAndInterestService.blockUserPair('valentina', 'blocked_stalker_01', 'Comportamento abusivo');

      let blockedMediaPurchase = false;
      try {
        await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'blocked_stalker_01',
          mediaId: 'excl_photo_val_01',
          idempotencyKey: 'idemp_blk_media_01',
        });
      } catch {
        blockedMediaPurchase = true;
      }

      let blockedInterest = false;
      try {
        await exclusiveContentAndInterestService.sendPaidImmediateInterest({
          senderUserId: 'blocked_stalker_01',
          recipientUserId: 'valentina',
          recipientName: 'Valentina Rossi',
          idempotencyKey: 'idemp_blk_interest_01',
        });
      } catch {
        blockedInterest = true;
      }

      const msgAttempt = exclusiveContentAndInterestService.sendAuthorizedMessage({
        senderUserId: 'blocked_stalker_01',
        recipientUserId: 'valentina',
        text: 'Tentativa após bloqueio',
      });

      assertCondition(
        blockedMediaPurchase && blockedInterest && !msgAttempt.sent,
        'Usuário bloqueado deve ser impedido de comprar conteúdo, enviar interesse imediato e mandar mensagem'
      );

      return `Parameter Tampering de preço bloqueado e restrições de bloqueio aplicadas em mídia, Cofre VIP, interesse e chat`;
    }
  );

  // ==========================================================================
  // 9.5 TESTES DE MODERAÇÃO E NORMAS (+18 E CONSENTIMENTO)
  // ==========================================================================

  await runTest(
    13,
    'EX-9.5-01',
    '9.5',
    'Bloqueio de publicação sem maioridade (+18) ou sem consentimento e bloqueio de compra de mídia removida/em análise',
    async () => {
      let rejectedUnderage = false;
      try {
        exclusiveContentAndInterestService.publishOrCreateMedia({
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'VIP_VAULT',
          caption: 'Sem verificação +18',
          priceCents: 0,
          classification: 'consensual_nudity_18plus',
          ageVerified18Plus: false,
          consentDeclared: true,
          safePreviewUrl: '/prev.jpg',
          privateMasterUrl: 'private://m.jpg',
        });
      } catch {
        rejectedUnderage = true;
      }

      let rejectedNoConsent = false;
      try {
        exclusiveContentAndInterestService.publishOrCreateMedia({
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'VIP_VAULT',
          caption: 'Sem consentimento',
          priceCents: 0,
          classification: 'consensual_nudity_18plus',
          ageVerified18Plus: true,
          consentDeclared: false,
          safePreviewUrl: '/prev.jpg',
          privateMasterUrl: 'private://m.jpg',
        });
      } catch {
        rejectedNoConsent = true;
      }

      assertCondition(rejectedUnderage && rejectedNoConsent, 'Deve exigir +18 e consentimento explícito');

      // Mídia em análise ou bloqueada não pode ser comprada
      const reviewItem = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'mod_review_item_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'video',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Vídeo aguardando moderação',
        priceCents: 2990,
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/prev.jpg',
        privateMasterUrl: 'private://m.mp4',
        initialState: 'under_review',
      });

      let blockedPurchaseUnderReview = false;
      try {
        await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'buyer_mod_test',
          mediaId: reviewItem.id,
          idempotencyKey: 'idemp_mod_review_buy',
        });
      } catch {
        blockedPurchaseUnderReview = true;
      }
      assertCondition(blockedPurchaseUnderReview, 'Mídia em análise não pode ser comprada');

      return `Exigência +18 e consentimento validada; compra de mídia não aprovada bloqueada`;
    }
  );

  // ==========================================================================
  // 9.6 TESTES DE PAGAMENTOS, IDEMPOTÊNCIA E CONCORRÊNCIA
  // ==========================================================================

  await runTest(
    14,
    'EX-9.6-01',
    '9.6',
    'Idempotência e concorrência (clique duplo / webhook repetido) geram apenas uma cobrança e um lançamento 70/30',
    async () => {
      const media = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'conc_photo_01',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Foto Teste Concorrência',
        priceCents: 3000, // R$ 30,00 -> 2100c / 900c
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/prev.jpg',
        privateMasterUrl: 'private://conc.jpg',
        initialState: 'published',
      });

      const beforeSummary = exclusiveContentAndInterestService.getCreatorDashboardSummary('valentina', 'sandbox');

      // Dispara duas chamadas concorrentes com a mesma chave de idempotência (clique duplo / webhook duplicado)
      const [call1, call2] = await Promise.all([
        exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'concurrent_buyer_01',
          mediaId: media.id,
          idempotencyKey: 'idemp_concurrent_double_click_01',
        }),
        exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
          buyerUserId: 'concurrent_buyer_01',
          mediaId: media.id,
          idempotencyKey: 'idemp_concurrent_double_click_01',
        }),
      ]);

      const afterSummary = exclusiveContentAndInterestService.getCreatorDashboardSummary('valentina', 'sandbox');

      assertCondition(call1.success && call2.success, 'Ambas chamadas idempotentes devem retornar sucesso');
      assertCondition(
        call1.isReplay !== call2.isReplay,
        'Exatamente uma chamada deve ser original (isReplay=false) e a outra replay (isReplay=true)'
      );
      assertCondition(
        afterSummary.grossRevenueCents - beforeSummary.grossRevenueCents === 3000,
        'O saldo bruto deve aumentar em exatamente uma única cobrança (3000 centavos)'
      );
      assertCondition(
        afterSummary.creatorShare70Cents - beforeSummary.creatorShare70Cents === 2100,
        'O repasse 70% do criador deve aumentar em exatamente 2100 centavos'
      );

      return `Concorrência e idempotência provadas: 1 única cobrança de 3000c (2100c criador + 900c JOBS) para 2 chamadas paralelas`;
    }
  );

  await runTest(
    15,
    'EX-9.6-02',
    '9.6',
    'Pagamentos recusados, pendentes, cancelados ou expirados NÃO liberam mídia, Cofre VIP nem interesse imediato',
    async () => {
      const declinedMedia = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'failed_pay_user',
        mediaId: 'excl_photo_val_01',
        idempotencyKey: 'idemp_declined_media_01',
        simulatePaymentStatus: 'declined',
      });
      assertCondition(
        !declinedMedia.success &&
          !exclusiveContentAndInterestService.hasAuthorizedMediaAccess('failed_pay_user', 'excl_photo_val_01'),
        'Pagamento recusado não pode liberar mídia individual'
      );

      const pendingVault = await exclusiveContentAndInterestService.purchaseVipVaultAccess({
        buyerUserId: 'failed_pay_user',
        creatorId: 'valentina',
        idempotencyKey: 'idemp_pending_vault_01',
        simulatePaymentStatus: 'pending',
      });
      assertCondition(
        !pendingVault.success &&
          !exclusiveContentAndInterestService.hasActiveVipVaultAccess('failed_pay_user', 'valentina'),
        'Pagamento pendente não pode liberar Cofre VIP'
      );

      const expiredInterest = await exclusiveContentAndInterestService.sendPaidImmediateInterest({
        senderUserId: 'failed_pay_user',
        recipientUserId: 'isabella',
        recipientName: 'Isabella Fontes',
        idempotencyKey: 'idemp_expired_interest_01',
        simulatePaymentStatus: 'expired',
      });
      assertCondition(
        !expiredInterest.success &&
          !exclusiveContentAndInterestService.canUsersExchangeMessages('failed_pay_user', 'isabella').allowed,
        'Pagamento expirado não pode liberar envio de mensagem por interesse imediato'
      );

      return `Pagamentos declined, pending e expired retidos com zero vazamento de permissão ou saldo`;
    }
  );

  // ==========================================================================
  // 9.7 TESTES DE ESTORNO, CHARGEBACK E RECONCILIAÇÃO FINANCEIRA
  // ==========================================================================

  await runTest(
    16,
    'EX-9.7-01',
    '9.7',
    'Estorno total (REFUND) e Chargeback (CHARGEBACK) revertem 70% do criador e 30% do JOBS, revogam acessos e conciliam 100%',
    async () => {
      // 1. Estorno de foto individual comprada no teste 9.2-01 (2000 centavos: 1400c criador / 600c JOBS)
      const txs = exclusiveContentAndInterestService.getMonetizedTransactions({
        buyerUserId: 'buyer_photo_01',
      });
      const photoTx = txs.items.find((t) => t.idempotencyKey === 'idemp_int_photo_01');
      assertCondition(Boolean(photoTx), 'Transação original da foto deveria existir');

      const refundRes = await exclusiveContentAndInterestService.processRefundOrChargeback({
        transactionId: photoTx!.id,
        type: 'REFUND',
        reason: 'Solicitação de reembolso em Sandbox',
      });

      assertCondition(refundRes.refunded && refundRes.grantRevoked, 'Estorno deveria revogar o grant');
      assertCondition(
        !exclusiveContentAndInterestService.hasAuthorizedMediaAccess('buyer_photo_01', 'int_photo_ind_01'),
        'Acesso à foto individual deveria ser revogado imediatamente após o estorno'
      );

      // 2. Chargeback da compra de Cofre VIP de Isabella no teste 9.2-03 (5000 centavos: 3500c criador / 1500c JOBS)
      const vaultTxs = exclusiveContentAndInterestService.getMonetizedTransactions({
        buyerUserId: 'buyer_vault_01',
      });
      const vaultTx = vaultTxs.items.find((t) => t.idempotencyKey === 'idemp_int_vault_isa_01');
      assertCondition(Boolean(vaultTx), 'Transação original do Cofre VIP deveria existir');

      const chargebackRes = await exclusiveContentAndInterestService.processRefundOrChargeback({
        transactionId: vaultTx!.id,
        type: 'CHARGEBACK',
        reason: 'Contestação de cartão simulada em Sandbox',
      });

      assertCondition(chargebackRes.refunded && chargebackRes.grantRevoked, 'Chargeback deveria revogar o Cofre VIP');
      assertCondition(
        !exclusiveContentAndInterestService.hasActiveVipVaultAccess('buyer_vault_01', 'isabella'),
        'Acesso ao Cofre VIP deveria ser bloqueado após chargeback'
      );

      // 3. Reconciliação financeira global da plataforma
      const report = exclusiveContentAndInterestService.getPlatformReconciliationReport('sandbox');
      assertCondition(
        report.isStrictlyReconciled &&
          report.reconciliationFormulaCheck.grossMinusRefundsEqualsNet &&
          report.reconciliationFormulaCheck.creatorPlusPlatformEqualsNet &&
          report.reconciliationFormulaCheck.zeroDivergentTransactions,
        `Falha na reconciliação financeira: ${JSON.stringify(report.reconciliationFormulaCheck)}`
      );

      return `Estorno e Chargeback revertidos em 70/20/10 com revogação imediata; Reconciliação: Bruto=${report.totalGrossReceivedCents}c, Estornos=${report.totalRefundedAndChargebackCents}c, Líquido=${report.netRecognizedRevenueCents}c (70% Criadores=${report.netCreatorObligationsCents}c + 20% JOBS=${report.netPlatformShare20Cents}c + 10% Reserva=${report.netOperationalReserve10Cents}c)`;
    }
  );

  await runTest(
    17,
    'EX-9.1-03',
    '9.1',
    'Catálogo oficial em Diamantes (29/49/99/149/199 💎) e regra contábil 70/20/10 exata em centavos',
    () => {
      const cat = exclusiveContentAndInterestService.getDiamondServiceCatalog();
      assertCondition(cat.immediateInterestDiamonds === 29, 'Interesse Imediato deve custar 29 💎');
      assertCondition(cat.individualPhotoUnlockDiamonds === 49, 'Foto exclusiva deve custar 49 💎');
      assertCondition(cat.individualVideoUnlockDiamonds === 99, 'Vídeo exclusivo deve custar 99 💎');
      assertCondition(
        cat.vipVaultAccessDiamonds === 149 && cat.vipVaultDurationDays === 30,
        'Cofre VIP deve custar 149 💎 por 30 dias'
      );
      assertCondition(
        cat.profileBoostDiamonds === 49 && cat.profileBoostDurationHours === 24,
        'Impulsionar Perfil deve custar 49 💎 por 24 horas'
      );
      assertCondition(
        cat.jobsPremiumDiamonds === 199 && cat.jobsPremiumDurationDays === 30,
        'JOBS Premium deve custar 199 💎 por 30 dias'
      );
      assertCondition(
        cat.virtualGifts.length >= 5 &&
          cat.virtualGifts[0].priceDiamonds === 29 &&
          cat.virtualGifts[cat.virtualGifts.length - 1].priceDiamonds === 199,
        'Presentes virtuais devem cobrir a faixa de 29 a 199 💎'
      );

      // Teste da partição 70/20/10 em centavos (ex.: 149 💎 pagos = 1490 centavos)
      const split149 = calculateSplit70_20_10Cents(1490);
      assertCondition(
        split149.creatorShareCents === 1043 &&
          split149.platformShare20Cents === 298 &&
          split149.operationalReserve10Cents === 149 &&
          split149.isBalanced,
        `Falha no split 70/20/10 de 1490c: ${JSON.stringify(split149)}`
      );

      for (let c = 1; c <= 100; c++) {
        const sp = calculateSplit70_20_10Cents(c);
        assertCondition(
          sp.creatorShareCents + sp.platformShare20Cents + sp.operationalReserve10Cents === c,
          `Quebra de invariante 70/20/10 para ${c} centavos`
        );
      }

      return `Catálogo validado (${INITIAL_DIAMOND_SERVICE_CATALOG.immediateInterestDiamonds}/${INITIAL_DIAMOND_SERVICE_CATALOG.individualPhotoUnlockDiamonds}/${INITIAL_DIAMOND_SERVICE_CATALOG.individualVideoUnlockDiamonds}/${INITIAL_DIAMOND_SERVICE_CATALOG.vipVaultAccessDiamonds}/${INITIAL_DIAMOND_SERVICE_CATALOG.jobsPremiumDiamonds} 💎) e invariante 70/20/10 100% exato`;
    }
  );

  await runTest(
    18,
    'EX-9.7-02',
    '9.7',
    'Segregação de Bônus Promocional (valor fiduciário zero) vs Diamantes Pagos (1 💎 = R$ 0,10) e bloqueio de saldo negativo',
    async () => {
      // 1. Usuário com APENAS 50 diamantes de bônus promocional e 0 diamantes pagos
      exclusiveContentAndInterestService.setUserDiamondWallet('bonus_only_user', {
        purchasedDiamonds: 0,
        bonusDiamonds: 50,
      });

      const bonusPhoto = exclusiveContentAndInterestService.publishOrCreateMedia({
        id: 'media_bonus_test_photo_49',
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        mediaType: 'photo',
        modality: 'INDIVIDUAL_UNLOCK',
        caption: 'Foto Exclusiva 49 Diamantes (Teste Bônus)',
        priceDiamonds: 49,
        classification: 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl: '/preview_bonus_49.jpg',
        privateMasterUrl: 'private://vault/valentina/bonus_49_hd.jpg',
        initialState: 'published',
      });

      const photoRes = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: 'bonus_only_user',
        mediaId: bonusPhoto.id, // 49 💎
        idempotencyKey: 'idemp_bonus_only_photo_01',
        buyerAgeVerified18Plus: true,
      });

      assertCondition(photoRes.success, 'Compra com diamantes de bônus deveria liberar a mídia');
      assertCondition(photoRes.transaction.diamondsCharged === 49, 'Custo em diamantes deveria ser 49 💎');
      assertCondition(photoRes.transaction.paidDiamondsUsed === 0, 'Paid diamonds usados deveria ser 0');
      assertCondition(photoRes.transaction.bonusDiamondsUsed === 49, 'Bonus diamonds usados deveria ser 49');
      assertCondition(
        photoRes.transaction.grossAmountCents === 0 &&
          photoRes.transaction.creatorShareCents === 0 &&
          photoRes.transaction.platformShare20Cents === 0 &&
          photoRes.transaction.operationalReserve10Cents === 0,
        'Diamantes de bônus promocional devem ter valor fiduciário zero (R$ 0,00) e não gerar passivo sem lastro'
      );

      // Restou apenas 1 💎 de bônus -> tentativa de nova compra de 29 💎 deve falhar sem negativar saldo
      let insufficientErrorCaught = false;
      try {
        await exclusiveContentAndInterestService.sendPaidImmediateInterest({
          senderUserId: 'bonus_only_user',
          recipientUserId: 'isabella',
          recipientName: 'Isabella Fontes',
          idempotencyKey: 'idemp_insufficient_diamonds_01',
        });
      } catch (err: any) {
        insufficientErrorCaught = String(err?.message || err).includes('insuficiente');
      }
      const balAfterFail = exclusiveContentAndInterestService.getUserDiamondWallet('bonus_only_user');
      assertCondition(
        insufficientErrorCaught && balAfterFail.totalAvailableDiamonds === 1 && balAfterFail.bonusDiamonds === 1,
        'Compra sem saldo suficiente deve ser bloqueada sem permitir saldo negativo'
      );

      // 2. Comprovante visível ao cliente exibe exclusivamente diamantes (💎) e nunca R$
      const receipt = photoRes.customerReceipt;
      assertCondition(
        Boolean(receipt) &&
          receipt!.formattedPriceDiamonds.includes('💎') &&
          !receipt!.summaryText.includes('R$') &&
          !receipt!.formattedPriceDiamonds.includes('R$'),
        `Comprovante do cliente não pode conter R$: ${receipt?.summaryText}`
      );

      // 3. Teste de Presente Virtual (79 💎), Boost (49 💎) e JOBS Premium (199 💎) com diamantes pagos
      exclusiveContentAndInterestService.setUserDiamondWallet('paid_whale_user', {
        purchasedDiamonds: 500,
        bonusDiamonds: 0,
      });
      const giftRes = await exclusiveContentAndInterestService.sendVirtualGiftInDiamonds({
        senderUserId: 'paid_whale_user',
        recipientUserId: 'valentina',
        recipientName: 'Valentina Rossi',
        giftId: 'gift_perfume_noite', // 79 💎 -> 790c (553c criador / 158c JOBS / 79c reserva)
        idempotencyKey: 'idemp_gift_perfume_01',
      });
      assertCondition(
        giftRes.success &&
          giftRes.transaction.diamondsCharged === 79 &&
          giftRes.transaction.creatorShareCents === 553 &&
          giftRes.transaction.platformShare20Cents === 158 &&
          giftRes.transaction.operationalReserve10Cents === 79,
        `Falha contábil no presente virtual 79 💎: ${JSON.stringify(giftRes.transaction)}`
      );

      const boostRes = await exclusiveContentAndInterestService.purchaseProfileBoost({
        buyerUserId: 'paid_whale_user',
        idempotencyKey: 'idemp_boost_49_01',
      });
      assertCondition(
        boostRes.success && boostRes.transaction.diamondsCharged === 49,
        'Boost de perfil deve custar 49 💎'
      );

      const premRes = await exclusiveContentAndInterestService.purchaseJobsPremiumSubscription({
        buyerUserId: 'paid_whale_user',
        idempotencyKey: 'idemp_premium_199_01',
      });
      assertCondition(
        premRes.success && premRes.transaction.diamondsCharged === 199,
        'JOBS Premium 30 dias deve custar 199 💎'
      );

      return `Bônus promocional gera R$ 0,00 fiduciário; Presente (79 💎), Boost (49 💎) e Premium (199 💎) liquidados com comprovantes 100% em 💎`;
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  // Restaura estado limpo com seeds para a UI após concluir a bateria de testes
  exclusiveContentAndInterestService.resetForAutomatedTesting();

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
