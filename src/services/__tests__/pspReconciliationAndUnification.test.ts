import { financialLedger } from '../ledgerService';
import {
  pspWebhookReconciliationService,
  PixWebhookPayload,
} from '../pspWebhookReconciliationService';
import { financialDomainAdapter } from '../financialDomainAdapter';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FALHA DE ASSERÇÃO: ${message}`);
  }
}

async function runPspReconciliationAndUnificationTests(): Promise<void> {
  console.log('======================================================================');
  console.log('SUÍTE DE TESTES: CONCILIAÇÃO PSP PIX (HMAC), UNIFICAÇÃO E PRONTIDÃO');
  console.log('======================================================================');

  financialLedger.clearPayoutSimulations();
  pspWebhookReconciliationService.clearWebhookHistoryForTesting();

  const uniqueSuffix = Date.now();
  const creatorId = `creator_webhook_test_${uniqueSuffix}`;
  const creatorName = 'Camila Conciliação';
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const webhookSecret = 'test_secret_hmac_jobs_2026';

  // Preparar saldo legítimo no livro-razão (R$ 500,00 disponíveis para o criador)
  await financialLedger.postTransactionAtomic({
    idempotencyKey: `idem_seed_webhook_500_${uniqueSuffix}`,
    description: 'Saldo auditado para testes de conciliação PSP PIX',
    actorId: 'system_auditor',
    entries: [
      {
        operationType: 'PERFORMANCE_REWARD',
        debitAccount: 'PLATFORM_MARKETING_REFERRAL_POOL:brl',
        creditAccount: `CREATOR_AVAILABLE_BRL:${creatorId}`,
        amount: 500.0,
        amountCents: 50000,
        currency: 'BRL',
        targetCreatorId: creatorId,
        referenceId: `ref_seed_500_${uniqueSuffix}`,
        description: 'Saldo auditado para testes de conciliação PSP PIX',
      },
    ],
  });

  // Solicitar e aprovar um saque de R$ 150,00 (15000 centavos) em produção
  const reqRes = await financialLedger.requestPayout({
    creatorId,
    creatorName,
    amountBrl: 150.0,
    payoutMethod: 'PIX',
    pixKeyOrAccount: 'camila@jobs.com.br',
    idempotencyKey: `idem_payout_prod_150_${uniqueSuffix}`,
    environment: 'production',
    actorUserId: creatorId,
  });

  const approvedRes = await financialLedger.approvePayout({
    payoutId: reqRes.payout.id,
    adminId: 'admin_auditor_01',
    idempotencyKey: `idem_approve_prod_150_${uniqueSuffix}`,
    environment: 'production',
  });

  assert(approvedRes.payout.status === 'approved', 'Payout deveria estar em status approved');

  // ---------------------------------------------------------------------------
  // TESTE 1: Rejeição de Webhook com Assinatura HMAC Inválida ou Adulterada
  // ---------------------------------------------------------------------------
  const validPayload: PixWebhookPayload = {
    eventId: `evt_pix_settle_001_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_SETTLED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: reqRes.payout.id,
      idempotencyKey: `idem_webhook_settle_001_${uniqueSuffix}`,
      amountCents: 15000,
      currency: 'BRL',
      externalSettlementRef: 'E18236120202610281230s0987654321',
    },
  };

  const forgedResult = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: validPayload,
    signatureHeader: 'v1=0000000000000000000000000000000000000000000000000000000000000000',
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(forgedResult.accepted === false, 'Teste 1: Webhook com HMAC inválido deve ser rejeitado');
  console.log('✓ Teste 1 passou: Webhook com assinatura HMAC adulterada foi bloqueado e auditado.');

  // ---------------------------------------------------------------------------
  // TESTE 2: Rejeição de Webhook com Divergência de Valor em Centavos
  // ---------------------------------------------------------------------------
  const mismatchedPayload: PixWebhookPayload = {
    ...validPayload,
    eventId: `evt_pix_mismatch_002_${uniqueSuffix}`,
    data: {
      ...validPayload.data,
      amountCents: 14900, // Divergente de 15000 centavos
    },
  };
  const mismatchedSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(mismatchedPayload),
    nowIso,
    webhookSecret
  );

  const mismatchResult = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: mismatchedPayload,
    signatureHeader: mismatchedSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    mismatchResult.accepted === false &&
      Boolean(mismatchResult.errorReason?.includes('Divergência de valor')),
    'Teste 2: Webhook com valor em centavos divergente deve ser bloqueado'
  );
  console.log('✓ Teste 2 passou: Divergência de valor em centavos bloqueada antes de alterar o livro-razão.');

  // ---------------------------------------------------------------------------
  // TESTE 3: Conciliação Completa Autenticada (approved -> released) + Anti-Replay
  // ---------------------------------------------------------------------------
  const validSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(validPayload),
    nowIso,
    webhookSecret
  );

  const settleResult = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: validPayload,
    signatureHeader: validSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(settleResult.accepted === true && settleResult.isReplay === false, 'Teste 3a: Webhook válido deve ser aceito');
  assert(settleResult.payout?.status === 'released', 'Teste 3b: Payout deve transicionar para released');

  // Reenviar exatamente o mesmo evento (ataque de repetição / replay)
  const entriesBeforeReplay = financialLedger.getEntries().length;
  const replayResult = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: validPayload,
    signatureHeader: validSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });
  const entriesAfterReplay = financialLedger.getEntries().length;

  assert(
    replayResult.accepted === true &&
      replayResult.isReplay === true &&
      entriesAfterReplay === entriesBeforeReplay,
    'Teste 3c: Replay do mesmo eventId não pode duplicar lançamentos no livro-razão'
  );
  console.log('✓ Teste 3 passou: Liquidação PIX autenticada e proteção anti-replay comprovadas.');

  // ---------------------------------------------------------------------------
  // TESTE 4: Devolução Pós-Liquidação via Webhook (released -> reversed)
  // ---------------------------------------------------------------------------
  const reversalPayload: PixWebhookPayload = {
    eventId: `evt_pix_reverse_003_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_REVERSED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: reqRes.payout.id,
      idempotencyKey: `idem_webhook_reverse_003_${uniqueSuffix}`,
      amountCents: 15000,
      currency: 'BRL',
      failureOrReversalReason: 'Conta destino encerrada no banco recebedor (devolução SPI)',
    },
  };
  const reversalSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(reversalPayload),
    nowIso,
    webhookSecret
  );

  const reversalResult = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: reversalPayload,
    signatureHeader: reversalSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    reversalResult.accepted === true && reversalResult.payout?.status === 'reversed',
    'Teste 4a: Payout liquidado deve transicionar para reversed após devolução bancária'
  );

  const balanceAfterReversal = financialLedger.getCreatorBalances(creatorId);
  assert(
    balanceAfterReversal.availableBrl === 500.0 && balanceAfterReversal.totalWithdrawnBrl === 0,
    `Teste 4b: Saldo disponível do criador deve ser restaurado para R$ 500,00 após reversão (atual: R$ ${balanceAfterReversal.availableBrl})`
  );
  console.log('✓ Teste 4 passou: Reversão pós-liquidação restaurou o saldo com lançamento compensatório.');

  // ---------------------------------------------------------------------------
  // TESTE 5: Falha Bancária Pré-Liquidação via Webhook (approved -> failed)
  // ---------------------------------------------------------------------------
  const reqFailRes = await financialLedger.requestPayout({
    creatorId,
    creatorName,
    amountBrl: 100.0,
    payoutMethod: 'PIX',
    pixKeyOrAccount: 'chave-invalida@jobs.com.br',
    idempotencyKey: `idem_payout_fail_100_${uniqueSuffix}`,
    environment: 'production',
    actorUserId: creatorId,
  });
  await financialLedger.approvePayout({
    payoutId: reqFailRes.payout.id,
    adminId: 'admin_auditor_01',
    idempotencyKey: `idem_approve_fail_100_${uniqueSuffix}`,
    environment: 'production',
  });

  const failPayload: PixWebhookPayload = {
    eventId: `evt_pix_fail_004_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_FAILED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: reqFailRes.payout.id,
      idempotencyKey: `idem_webhook_fail_004_${uniqueSuffix}`,
      amountCents: 10000,
      currency: 'BRL',
      failureOrReversalReason: 'Chave PIX DICT não localizada para o CPF/CNPJ titular',
    },
  };
  const failSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(failPayload),
    nowIso,
    webhookSecret
  );

  const failWebhookRes = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: failPayload,
    signatureHeader: failSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    failWebhookRes.accepted === true && failWebhookRes.payout?.status === 'failed',
    'Teste 5a: Payout deve transicionar para failed'
  );
  const balanceAfterFail = financialLedger.getCreatorBalances(creatorId);
  assert(
    balanceAfterFail.availableBrl === 500.0,
    'Teste 5b: Saldo disponível deve retornar integralmente após falha antes da liquidação'
  );

  const reconciliationReport = pspWebhookReconciliationService.reconcilePayoutRecords('production');
  assert(
    reconciliationReport.isFullyReconciled === true && reconciliationReport.discrepanciesCount === 0,
    'Teste 5c: Relatório de conciliação não deve apontar discrepâncias'
  );
  console.log('✓ Teste 5 passou: Falha pré-liquidação estornada do escrow e conciliação 100% íntegra.');

  // ---------------------------------------------------------------------------
  // TESTE 6: Unificação via Adaptador de Domínio (Sem Duplicidade / Segregação)
  // ---------------------------------------------------------------------------
  const sync1 = await financialDomainAdapter.syncReferralRewardToLedger({
    userId: creatorId,
    referralMemberId: `ref_member_99_${uniqueSuffix}`,
    referredName: 'Rodrigo Indicado',
    level: 1,
    rewardBrl: 35.0,
  });
  const sync2Replay = await financialDomainAdapter.syncReferralRewardToLedger({
    userId: creatorId,
    referralMemberId: `ref_member_99_${uniqueSuffix}`,
    referredName: 'Rodrigo Indicado',
    level: 1,
    rewardBrl: 35.0,
  });

  assert(sync1.synced === true && sync1.isReplay === false, 'Teste 6a: Primeiro sync de indicação deve registrar no Ledger');
  assert(sync2Replay.isReplay === true, 'Teste 6b: Segundo sync idêntico deve ser tratado como replay sem duplicar');

  const snapshot = financialDomainAdapter.getSegregatedDomainSnapshot(creatorId, 1250);
  assert(
    snapshot.gamification.pointsBalance === 1250 && snapshot.gamification.isWithdrawable === false,
    'Teste 6c: Pontos de gamificação devem permanecer isolados e não sacáveis'
  );
  assert(
    snapshot.virtualCredits.isWithdrawable === false,
    'Teste 6d: Créditos virtuais de consumo devem permanecer não sacáveis'
  );
  assert(
    snapshot.creatorAndCollaboratorLiabilityBrl.availableBrl === 535.0,
    `Teste 6e: Saldo unificado no Ledger deve ser R$ 535,00 (atual: R$ ${snapshot.creatorAndCollaboratorLiabilityBrl.availableBrl})`
  );
  assert(
    snapshot.duplicateIdempotencyKeysDetected === 0 && snapshot.ledgerIntegrityValid === true,
    'Teste 6f: Zero chaves de idempotência duplicadas e cadeia SHA-256 íntegra'
  );
  console.log('✓ Teste 6 passou: Unificação via adaptador sem lançamentos duplicados e com segregação de domínios.');

  // ---------------------------------------------------------------------------
  // TESTE 7: Verificação dos 9 Critérios de Prontidão Financeira
  // ---------------------------------------------------------------------------
  const readiness = pspWebhookReconciliationService.evaluateFinancialReadinessCriteria();
  assert(
    readiness.criteria.length === 9 &&
      readiness.isReadyForRealPixSettlement === false &&
      readiness.overallClassification === 'NÃO VALIDADO PARA LIQUIDAÇÃO FINANCEIRA REAL EM PRODUÇÃO',
    'Teste 7: Governança deve reportar 9 critérios e manter classificação NÃO VALIDADO enquanto PSP real não estiver conectado'
  );
  console.log('✓ Teste 7 passou: Governança dos 9 critérios de prontidão financeira validada.');

  // ---------------------------------------------------------------------------
  // TESTE 8: Unificação de Compra de Pacote e Desbloqueio (monetizationService -> Ledger)
  // ---------------------------------------------------------------------------
  const buyerId = `buyer_unif_${uniqueSuffix}`;
  const purchaseSync1 = await financialDomainAdapter.syncPackagePurchaseToLedger({
    purchaseId: `pur_${uniqueSuffix}`,
    userId: buyerId,
    packageId: 'pkg_popular',
    packageName: 'Popular',
    creditsAmount: 100,
    priceInCents: 4990,
    idempotencyKey: `idemp_pur_${uniqueSuffix}`,
  });
  const purchaseSyncReplay = await financialDomainAdapter.syncPackagePurchaseToLedger({
    purchaseId: `pur_${uniqueSuffix}`,
    userId: buyerId,
    packageId: 'pkg_popular',
    packageName: 'Popular',
    creditsAmount: 100,
    priceInCents: 4990,
    idempotencyKey: `idemp_pur_${uniqueSuffix}`,
  });

  assert(
    purchaseSync1.synced === true && purchaseSync1.isReplay === false,
    'Teste 8a: Primeira sincronização de pacote deve creditar o Ledger'
  );
  assert(
    purchaseSyncReplay.isReplay === true && financialLedger.getUserCredits(buyerId) === 100,
    'Teste 8b: Replay de compra de pacote não pode duplicar créditos no Ledger'
  );

  const unlockSync1 = await financialDomainAdapter.syncContentUnlockToLedger({
    grantId: `grnt_${uniqueSuffix}`,
    userId: buyerId,
    creatorId,
    contentId: 'cnt_val_01',
    contentTitle: 'Ensaio Lingerie de Renda Negra',
    priceInCredits: 49,
    idempotencyKey: `idemp_unl_${uniqueSuffix}`,
  });
  const unlockSyncReplay = await financialDomainAdapter.syncContentUnlockToLedger({
    grantId: `grnt_${uniqueSuffix}`,
    userId: buyerId,
    creatorId,
    contentId: 'cnt_val_01',
    contentTitle: 'Ensaio Lingerie de Renda Negra',
    priceInCredits: 49,
    idempotencyKey: `idemp_unl_${uniqueSuffix}`,
  });

  assert(
    unlockSync1.synced === true &&
      unlockSync1.isReplay === false &&
      unlockSync1.creatorShareCents === 3430 &&
      unlockSync1.platformShareCents === 1470,
    'Teste 8c: Desbloqueio unificado deve dividir 70% Criador (3430 centavos) e 30% JOBS (1470 centavos)'
  );
  assert(
    unlockSyncReplay.isReplay === true && financialLedger.getUserCredits(buyerId) === 51,
    'Teste 8d: Replay de desbloqueio não pode descontar créditos em duplicidade (100 - 49 = 51)'
  );
  console.log('✓ Teste 8 passou: Unificação de compras e desbloqueios (70/30) sem duplicidade validada.');

  // ---------------------------------------------------------------------------
  // TESTE 9: Bloqueio Fail-Closed do Adaptador PSP PIX em Produção sem SPI Real
  // ---------------------------------------------------------------------------
  const dispatchProdRes = await pspWebhookReconciliationService.dispatchPixPayoutOrder({
    payoutId: reqFailRes.payout.id,
    environment: 'production',
    actorId: 'admin_auditor_01',
  });
  assert(
    dispatchProdRes.dispatched === false &&
      dispatchProdRes.errorCode === 'PSP_NOT_CONFIGURED_FOR_PRODUCTION',
    'Teste 9: Disparo de ordem PIX em produção deve ser bloqueado enquanto PSP real do SPI não estiver configurado'
  );
  console.log('✓ Teste 9 passou: Bloqueio fail-closed do adaptador PSP PIX em produção comprovado.');

  // ---------------------------------------------------------------------------
  // TESTE 10: Rejeição de Webhooks Fora de Ordem (Out-of-Order State Guards)
  // ---------------------------------------------------------------------------
  const outOfOrderPayoutReq = await financialLedger.requestPayout({
    creatorId,
    creatorName,
    amountBrl: 80.0,
    payoutMethod: 'PIX',
    pixKeyOrAccount: 'camila@jobs.com.br',
    idempotencyKey: `idem_payout_ooo_80_${uniqueSuffix}`,
    environment: 'production',
    actorUserId: creatorId,
  });

  // Tentar liquidar (PIX_TRANSFER_SETTLED) antes de aprovar (ainda em under_review)
  const settleBeforeApprovePayload: PixWebhookPayload = {
    eventId: `evt_ooo_settle_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_SETTLED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: outOfOrderPayoutReq.payout.id,
      idempotencyKey: `idem_ooo_settle_${uniqueSuffix}`,
      amountCents: 8000,
      currency: 'BRL',
      externalSettlementRef: 'E18236120202610289999s0000111122',
    },
  };
  const settleBeforeApproveSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(settleBeforeApprovePayload),
    nowIso,
    webhookSecret
  );
  const oooSettleRes = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: settleBeforeApprovePayload,
    signatureHeader: settleBeforeApproveSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    oooSettleRes.accepted === false &&
      Boolean(oooSettleRes.errorReason?.includes('fora de ordem')),
    'Teste 10a: PIX_TRANSFER_SETTLED para saque ainda em under_review deve ser rejeitado como fora de ordem'
  );

  // Tentar reverter (PIX_TRANSFER_REVERSED) antes de liquidar
  await financialLedger.approvePayout({
    payoutId: outOfOrderPayoutReq.payout.id,
    adminId: 'admin_auditor_01',
    idempotencyKey: `idem_approve_ooo_80_${uniqueSuffix}`,
    environment: 'production',
  });

  const reverseBeforeSettlePayload: PixWebhookPayload = {
    eventId: `evt_ooo_reverse_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_REVERSED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: outOfOrderPayoutReq.payout.id,
      idempotencyKey: `idem_ooo_reverse_${uniqueSuffix}`,
      amountCents: 8000,
      currency: 'BRL',
      failureOrReversalReason: 'Reversão enviada fora de ordem antes do settled',
    },
  };
  const reverseBeforeSettleSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(reverseBeforeSettlePayload),
    nowIso,
    webhookSecret
  );
  const oooReverseRes = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: reverseBeforeSettlePayload,
    signatureHeader: reverseBeforeSettleSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    oooReverseRes.accepted === false &&
      Boolean(oooReverseRes.errorReason?.includes('fora de ordem')),
    'Teste 10b: PIX_TRANSFER_REVERSED para saque apenas approved (não released) deve ser rejeitado como fora de ordem'
  );
  console.log('✓ Teste 10 passou: Webhooks fora de ordem foram bloqueados sem corromper o livro-razão.');

  // ---------------------------------------------------------------------------
  // TESTE 11: Recuperação Após Indisponibilidade e Checklist Executivo Completo
  // ---------------------------------------------------------------------------
  // Após a rejeição fora de ordem acima, o evento legítimo PIX_TRANSFER_SETTLED chega e deve liquidar normalmente
  const recoverySettlePayload: PixWebhookPayload = {
    eventId: `evt_recovery_settle_${uniqueSuffix}`,
    eventType: 'PIX_TRANSFER_SETTLED',
    timestamp: nowIso,
    environment: 'production',
    providerName: 'bacen_spi_sandbox_mock',
    data: {
      payoutId: outOfOrderPayoutReq.payout.id,
      idempotencyKey: `idem_recovery_settle_${uniqueSuffix}`,
      amountCents: 8000,
      currency: 'BRL',
      externalSettlementRef: 'E18236120202610289999s7777888899',
    },
  };
  const recoverySettleSig = pspWebhookReconciliationService.computeWebhookHmacSignature(
    JSON.stringify(recoverySettlePayload),
    nowIso,
    webhookSecret
  );
  const recoveryRes = await pspWebhookReconciliationService.processPixWebhookEvent({
    payload: recoverySettlePayload,
    signatureHeader: recoverySettleSig,
    timestampHeader: nowIso,
    secret: webhookSecret,
    nowMs,
  });

  assert(
    recoveryRes.accepted === true && recoveryRes.payout?.status === 'released',
    'Teste 11a: Recuperação após tentativa fora de ordem deve processar o evento válido na sequência correta'
  );

  const checklist = pspWebhookReconciliationService.getExecutiveReadinessChecklist();
  const totalChecklistItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  assert(
    checklist.length === 4 && totalChecklistItems === 28,
    `Teste 11b: Checklist Executivo deve conter 4 seções e 28 itens (atual: ${checklist.length} seções, ${totalChecklistItems} itens)`
  );
  // ---------------------------------------------------------------------------
  // TESTE 12: As 6 Verificações Obrigatórias do Bloqueio Fail-Closed (PSP_NOT_CONFIGURED_FOR_PRODUCTION)
  // ---------------------------------------------------------------------------
  console.log('\n--- EXECUTANDO TESTE 12: 6 VERIFICAÇÕES OBRIGATÓRIAS FAIL-CLOSED ---');

  // 12.1 Ponto de bloqueio no código e recusa com código contratual
  const failClosedDispatchRes = await pspWebhookReconciliationService.dispatchPixPayoutOrder({
    payoutId: reqRes.payout.id,
    environment: 'production',
    actorId: 'test_sec_auditor',
  });
  assert(
    failClosedDispatchRes.dispatched === false &&
      failClosedDispatchRes.errorCode === 'PSP_NOT_CONFIGURED_FOR_PRODUCTION',
    'Teste 12.1: dispatchPixPayoutOrder deve recusar com errorCode PSP_NOT_CONFIGURED_FOR_PRODUCTION em produção'
  );

  // 12.2 Recusa com configuração ausente ou inválida
  const invalidConfigCheck = pspWebhookReconciliationService.validateProductionPspConfig({
    contractEnabled: false,
    mtlsConfigured: false,
  });
  assert(
    invalidConfigCheck.valid === false && invalidConfigCheck.missingRequirements.length >= 4,
    'Teste 12.2: validateProductionPspConfig deve reprovar configurações incompletas ou ausentes'
  );

  // 12.3 Zero chamadas externas de pagamento realizadas no cenário de recusa
  assert(
    failClosedDispatchRes.externalCallsAttempted === 0,
    'Teste 12.3: Nenhuma chamada externa de rede pode ser executada sob recusa fail-closed'
  );

  // 12.4 Proteção de credenciais e segredos contra vazamento em logs ou frontend
  const rawLeakPayload = {
    apiKey: 'my_sensitive_key_9999',
    hmacSecret: 'super_secret_hmac_prod_secret_2026',
    mtlsPrivateKey: 'PRIVATE_KEY_DATA_CERT',
    clientSecret: 'secret_oauth_jobs_client_99',
    publicParam: 'public_id_jobs',
  };
  const sanitized = pspWebhookReconciliationService.sanitizePspConfigAndSecrets(rawLeakPayload);
  assert(
    !JSON.stringify(sanitized).includes('super_secret_hmac_prod_secret_2026') &&
      !JSON.stringify(sanitized).includes('PRIVATE_KEY_DATA_CERT') &&
      sanitized.publicParam === 'public_id_jobs',
    'Teste 12.4: sanitizePspConfigAndSecrets deve mascarar todos os segredos sensíveis'
  );

  // 12.5 Falha de configuração não gera confirmação financeira nem saldo fictício em Produção
  const postFailPayouts = financialLedger.getPayoutRecords('production');
  const targetAfterFail = postFailPayouts.find((p) => p.id === reqRes.payout.id);
  assert(
    targetAfterFail?.status !== 'released',
    'Teste 12.5a: Payout recusado nunca pode ser marcado como released'
  );
  assert(
    failClosedDispatchRes.fallbackOccurred === false,
    'Teste 12.5b: Não pode haver fallback silencioso para simulação ou armazenamento local'
  );

  // 12.6 Registro estruturado de evidências de homologação e diagnóstico completo
  const homologationDiagnostic = pspWebhookReconciliationService.getFailClosedHomologationDiagnostic();
  assert(
    homologationDiagnostic.isFailClosedActive === true &&
      homologationDiagnostic.prerequisites.length === 6 &&
      homologationDiagnostic.verifications.length === 6 &&
      homologationDiagnostic.classification === 'NÃO VALIDADO PARA LIQUIDAÇÃO FINANCEIRA REAL EM PRODUÇÃO',
    'Teste 12.6: Diagnóstico de homologação deve conter os 6 pré-requisitos e as 6 verificações com classificação correta'
  );

  console.log('✓ Teste 12 passou: Todas as 6 verificações obrigatórias de bloqueio fail-closed comprovadas!');

  console.log('======================================================================');
  console.log('TODOS OS 12 CENÁRIOS DE CONCILIAÇÃO, UNIFICAÇÃO E HOMOLOGAÇÃO APROVADOS!');
  console.log('======================================================================');
}

runPspReconciliationAndUnificationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
