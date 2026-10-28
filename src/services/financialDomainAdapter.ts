/**
 * JOBS 1.0 — ADAPTADOR DE UNIFICAÇÃO DE DOMÍNIO FINANCEIRO
 *
 * Objetivo:
 * Unificar a leitura e o registro de fatos financeiros entre:
 * - `ledgerService` (Fonte Única de Verdade Contábil)
 * - `monetizationService` (Pacotes, Compras, Desbloqueios e Ranking Executivo)
 * - `referralData` (Programa de Indicação Colaborador)
 *
 * Separação Estrita de Domínios:
 * 1. Pontos de Gamificação (não monetários e não conversíveis em BRL)
 * 2. Créditos Virtuais de Consumo (USER_CREDITS — não sacáveis)
 * 3. Receita Reconhecida da Plataforma (PLATFORM_REVENUE / PLATFORM_FEE_REVENUE)
 * 4. Obrigações com Criadores / Colaboradores (CREATOR_AVAILABLE_BRL / CREATOR_PENDING_BRL)
 * 5. Saques Reservados e Liquidados (CREATOR_PAYOUT_ESCROW / BANK_PIX_SETTLEMENT)
 */

import {
  financialLedger,
  PayoutEnvironment,
  PayoutRecord,
  UnifiedWalletSummary,
} from './ledgerService';
import { runtimeEnvironmentService } from './runtimeEnvironmentService';

export interface DomainSegregatedFinancialSnapshot {
  userId: string;
  environment: PayoutEnvironment;
  isSimulation: boolean;
  gamification: {
    pointsBalance: number;
    isMonetary: false;
    isWithdrawable: false;
  };
  virtualCredits: {
    creditsBalance: number;
    currency: 'CREDITS';
    isWithdrawable: false;
    accountingAccount: string;
  };
  creatorAndCollaboratorLiabilityBrl: {
    availableCents: number;
    availableBrl: number;
    pendingD14Cents: number;
    pendingD14Brl: number;
    collaboratorEarnedBrl: number;
    contentProducerEarnedBrl: number;
    currency: 'BRL';
  };
  payoutsAndEscrowBrl: {
    reservedInEscrowCents: number;
    reservedInEscrowBrl: number;
    pendingUnderReviewCents: number;
    pendingUnderReviewBrl: number;
    settledPixCents: number;
    settledPixBrl: number;
    currency: 'BRL';
  };
  duplicateIdempotencyKeysDetected: number;
  ledgerIntegrityValid: boolean;
}

export interface ReferralLedgerSyncResult {
  synced: boolean;
  isReplay: boolean;
  transactionId?: string;
  availableCollaboratorBrl: number;
  totalWithdrawnOrReservedBrl: number;
}

class FinancialDomainAdapterService {
  /**
   * Registra uma recompensa de indicação (referralData) de forma idempotente no
   * financialLedger como ganho líquido disponível (PERFORMANCE_REWARD -> CREATOR_AVAILABLE_BRL),
   * evitando mutação paralela sem lastro contábil.
   */
  public async syncReferralRewardToLedger(params: {
    userId: string;
    referralMemberId: string;
    referredName: string;
    level: 1 | 2 | 3;
    rewardBrl: number;
  }): Promise<ReferralLedgerSyncResult> {
    const idempotencyKey = `adapter_referral_reward_${params.userId}_${params.referralMemberId}`;
    const existingEntries = financialLedger
      .getEntries()
      .filter((e) => e.idempotencyKey.startsWith(idempotencyKey));

    if (existingEntries.length > 0) {
      const wallet = financialLedger.getUnifiedWalletSummary(params.userId, {
        actorUserId: params.userId,
      });
      return {
        synced: true,
        isReplay: true,
        transactionId: existingEntries[0]?.transactionId,
        availableCollaboratorBrl: wallet.availableBalanceBrl,
        totalWithdrawnOrReservedBrl: Number(
          (wallet.payoutReservedBrl + wallet.withdrawnSettledBrl + wallet.pendingReviewBrl).toFixed(2)
        ),
      };
    }

    const amountBrl = Number(params.rewardBrl.toFixed(2));
    const amountCents = Math.round(amountBrl * 100);

    const res = await financialLedger.postTransactionAtomic({
      idempotencyKey,
      description: `Bônus de Indicação Colaborador Nível ${params.level} (${params.referredName})`,
      actorId: params.userId,
      entries: [
        {
          operationType: 'PERFORMANCE_REWARD',
          debitAccount: 'PLATFORM_MARKETING_REFERRAL_POOL:brl',
          creditAccount: `CREATOR_AVAILABLE_BRL:${params.userId}`,
          amount: amountBrl,
          amountCents,
          currency: 'BRL',
          targetCreatorId: params.userId,
          referenceId: params.referralMemberId,
          description: `Bônus de Indicação Nível ${params.level} (${params.referredName})`,
          metadata: {
            originCategory: 'collaborator',
            referralLevel: params.level,
            referredName: params.referredName,
          },
        },
      ],
    });

    const wallet = financialLedger.getUnifiedWalletSummary(params.userId, {
      actorUserId: params.userId,
    });
    return {
      synced: true,
      isReplay: res.isReplay,
      transactionId: res.entries[0]?.transactionId,
      availableCollaboratorBrl: wallet.availableBalanceBrl,
      totalWithdrawnOrReservedBrl: Number(
        (wallet.payoutReservedBrl + wallet.withdrawnSettledBrl + wallet.pendingReviewBrl).toFixed(2)
      ),
    };
  }

  /**
   * Registra uma solicitação de saque originada pelo módulo de indicação (referralData)
   * diretamente na máquina de estados de payouts do financialLedger (status: 'under_review'),
   * garantindo idempotência e bloqueio de saldo concorrente.
   */
  public async requestReferralPayoutThroughLedger(params: {
    userId: string;
    userName: string;
    amountBrl: number;
    pixKey: string;
    pixType: string;
    bankName: string;
    idempotencyKey: string;
    environment?: PayoutEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    payout?: PayoutRecord;
    requestProtocol: string;
    remainingAvailableBrl: number;
  }> {
    const env: PayoutEnvironment =
      params.environment ??
      (runtimeEnvironmentService.isSimulationMode() ? 'sandbox' : 'production');

    // Garante que o saldo de demonstração inicial do colaborador exista no Ledger caso seja o primeiro saque em sandbox
    const currentSummary = financialLedger.getCreatorBalances(params.userId);
    if (currentSummary.availableBrl < params.amountBrl && env === 'sandbox') {
      const shortfallBrl = Number((params.amountBrl - currentSummary.availableBrl + 50).toFixed(2));
      await financialLedger.postTransactionAtomic({
        idempotencyKey: `adapter_seed_referral_balance_${params.userId}`,
        description: 'Sincronização inicial de saldo de indicações (Sandbox Seed)',
        actorId: params.userId,
        entries: [
          {
            operationType: 'PERFORMANCE_REWARD',
            debitAccount: 'PLATFORM_MARKETING_REFERRAL_POOL:brl',
            creditAccount: `CREATOR_AVAILABLE_BRL:${params.userId}`,
            amount: shortfallBrl,
            amountCents: Math.round(shortfallBrl * 100),
            currency: 'BRL',
            targetCreatorId: params.userId,
            referenceId: `seed_ref_sync_${params.userId}`,
            description: 'Sincronização inicial de saldo de indicações (Sandbox Seed)',
            metadata: { originCategory: 'collaborator' },
          },
        ],
      });
    }

    const payoutRes = await financialLedger.requestPayout({
      creatorId: params.userId,
      creatorName: params.userName,
      amountBrl: params.amountBrl,
      payoutMethod: `PIX (${params.pixType} - ${params.bankName})`,
      pixKeyOrAccount: params.pixKey,
      idempotencyKey: params.idempotencyKey,
      environment: env,
      actorUserId: params.userId,
      reserveImmediately: true,
    });

    const updatedWallet = financialLedger.getUnifiedWalletSummary(params.userId, {
      actorUserId: params.userId,
    });

    return {
      success: Boolean(payoutRes.payout),
      isReplay: payoutRes.isReplay,
      payout: payoutRes.payout,
      requestProtocol: `REQ-REF-${payoutRes.payout.id.toUpperCase()}`,
      remainingAvailableBrl: updatedWallet.availableBalanceBrl,
    };
  }

  /**
   * Retorna a fotografia unificada e segregada por domínio para qualquer usuário/criador,
   * comprovando a separação entre pontos de gamificação, créditos de consumo,
   * passivo de criadores e saques liquidados.
   */
  public getSegregatedDomainSnapshot(
    userId: string,
    gamificationPoints = 0
  ): DomainSegregatedFinancialSnapshot {
    const env: PayoutEnvironment = runtimeEnvironmentService.isSimulationMode()
      ? 'sandbox'
      : 'production';
    const wallet: UnifiedWalletSummary = financialLedger.getUnifiedWalletSummary(userId, {
      actorUserId: userId,
    });
    const creditsBalance = financialLedger.getUserCredits(userId);
    const integrity = financialLedger.verifyLedgerIntegrity();

    // Auditar se existem chaves de idempotência duplicadas no livro-razão
    const entries = financialLedger.getEntries();
    const seenKeys = new Set<string>();
    let duplicateCount = 0;
    for (const entry of entries) {
      if (seenKeys.has(entry.idempotencyKey)) {
        duplicateCount += 1;
      } else {
        seenKeys.add(entry.idempotencyKey);
      }
    }

    return {
      userId,
      environment: env,
      isSimulation: env === 'sandbox',
      gamification: {
        pointsBalance: Math.max(0, Math.floor(gamificationPoints)),
        isMonetary: false,
        isWithdrawable: false,
      },
      virtualCredits: {
        creditsBalance,
        currency: 'CREDITS',
        isWithdrawable: false,
        accountingAccount: `USER_CREDITS:${userId}`,
      },
      creatorAndCollaboratorLiabilityBrl: {
        availableCents: wallet.availableBalanceCents,
        availableBrl: wallet.availableBalanceBrl,
        pendingD14Cents: wallet.totalPendingCents,
        pendingD14Brl: wallet.totalPendingBrl,
        collaboratorEarnedBrl: wallet.collaboratorReceivedBrl,
        contentProducerEarnedBrl: wallet.contentProducerReceivedBrl,
        currency: 'BRL',
      },
      payoutsAndEscrowBrl: {
        reservedInEscrowCents: wallet.payoutReservedCents,
        reservedInEscrowBrl: wallet.payoutReservedBrl,
        pendingUnderReviewCents: wallet.pendingReviewCents,
        pendingUnderReviewBrl: wallet.pendingReviewBrl,
        settledPixCents: wallet.withdrawnSettledCents,
        settledPixBrl: wallet.withdrawnSettledBrl,
        currency: 'BRL',
      },
      duplicateIdempotencyKeysDetected: duplicateCount,
      ledgerIntegrityValid: integrity.isValid && duplicateCount === 0,
    };
  }

  /**
   * Unifica compras aprovadas do monetizationService com o livro-razão (financialLedger),
   * garantindo idempotência determinística por purchaseId e evitando duplicidade de saldo.
   */
  public async syncPackagePurchaseToLedger(params: {
    purchaseId: string;
    userId: string;
    packageId: string;
    packageName: string;
    creditsAmount: number;
    priceInCents: number;
    idempotencyKey: string;
  }): Promise<{ synced: boolean; isReplay: boolean; transactionId?: string }> {
    const ledgerIdempKey = `adapter_monetization_purchase_${params.idempotencyKey}`;
    const existing = financialLedger
      .getEntries()
      .filter((e) => e.idempotencyKey.startsWith(ledgerIdempKey));

    if (existing.length > 0) {
      return {
        synced: true,
        isReplay: true,
        transactionId: existing[0]?.transactionId,
      };
    }

    const creditsInt = Math.max(1, Math.round(params.creditsAmount));
    const res = await financialLedger.postTransactionAtomic({
      idempotencyKey: ledgerIdempKey,
      description: `Compra Unificada de Pacote ${params.packageName} (${creditsInt} créditos)`,
      actorId: params.userId,
      entries: [
        {
          operationType: 'CREDIT_PURCHASE',
          debitAccount: 'PLATFORM_RESERVE_POOL:credits',
          creditAccount: `USER_CREDITS:${params.userId}`,
          amount: creditsInt,
          amountCents: creditsInt,
          currency: 'CREDITS',
          referenceId: params.purchaseId,
          description: `Créditos emitidos — Pacote ${params.packageName} (#${params.purchaseId})`,
          metadata: {
            sourceModule: 'monetizationService',
            packageId: params.packageId,
            priceInCents: params.priceInCents,
          },
        },
      ],
    });

    return {
      synced: true,
      isReplay: res.isReplay,
      transactionId: res.entries[0]?.transactionId,
    };
  }

  /**
   * Unifica desbloqueios de conteúdo exclusivo do monetizationService com o livro-razão
   * (financialLedger), aplicando a regra oficial 70% Criador / 30% Plataforma em centavos inteiros.
   */
  public async syncContentUnlockToLedger(params: {
    grantId: string;
    userId: string;
    creatorId: string;
    contentId: string;
    contentTitle: string;
    priceInCredits: number;
    idempotencyKey: string;
  }): Promise<{
    synced: boolean;
    isReplay: boolean;
    creatorShareCents: number;
    platformShareCents: number;
    transactionId?: string;
  }> {
    if (params.priceInCredits <= 0) {
      return {
        synced: true,
        isReplay: false,
        creatorShareCents: 0,
        platformShareCents: 0,
      };
    }

    const ledgerIdempKey = `adapter_monetization_unlock_${params.idempotencyKey}`;
    const existing = financialLedger
      .getEntries()
      .filter(
        (e) =>
          e.idempotencyKey === ledgerIdempKey || e.idempotencyKey.startsWith(`${ledgerIdempKey}_`)
      );

    // Cada crédito de consumo equivale a R$ 1,00 (100 centavos) na tabela padrão de mídias exclusivas
    const grossCents = Math.round(params.priceInCredits * 100);
    const creatorShareCents = Math.round(grossCents * 0.7);
    const platformShareCents = grossCents - creatorShareCents;

    if (existing.length > 0) {
      return {
        synced: true,
        isReplay: true,
        creatorShareCents,
        platformShareCents,
        transactionId: existing[0]?.transactionId,
      };
    }

    // Garante que o usuário tenha lastro de créditos no financialLedger caso a carteira tenha sido iniciada pelo seed local da Fase 1
    const currentLedgerCredits = financialLedger.getUserCredits(params.userId);
    if (currentLedgerCredits < params.priceInCredits && runtimeEnvironmentService.isSimulationMode()) {
      const topUpCredits = params.priceInCredits - currentLedgerCredits + 50;
      await financialLedger.postTransactionAtomic({
        idempotencyKey: `adapter_seed_credits_sync_${params.userId}_${params.idempotencyKey}`,
        description: 'Sincronização de lastro de créditos da carteira Fase 1 (Sandbox)',
        actorId: params.userId,
        entries: [
          {
            operationType: 'CREDIT_PURCHASE',
            debitAccount: 'PLATFORM_RESERVE_POOL:credits',
            creditAccount: `USER_CREDITS:${params.userId}`,
            amount: topUpCredits,
            amountCents: topUpCredits,
            currency: 'CREDITS',
            referenceId: `sync_wallet_${params.userId}`,
            description: 'Sincronização automática de créditos de consumo (Sandbox)',
          },
        ],
      });
    }

    const res = await financialLedger.postTransactionAtomic({
      idempotencyKey: ledgerIdempKey,
      description: `Desbloqueio Unificado de Conteúdo "${params.contentTitle}" (70% Criador / 30% JOBS)`,
      actorId: params.userId,
      entries: [
        {
          operationType: 'CONTENT_UNLOCK',
          debitAccount: `USER_CREDITS:${params.userId}`,
          creditAccount: 'ESCROW_CONTENT_POOL:credits',
          amount: params.priceInCredits,
          amountCents: params.priceInCredits,
          currency: 'CREDITS',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          idempotencySuffix: 'spend',
          description: `Consumo de ${params.priceInCredits} créditos em "${params.contentTitle}"`,
        },
        {
          operationType: 'CREATOR_REVENUE_SHARE',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: `CREATOR_AVAILABLE_BRL:${params.creatorId}`,
          amount: Number((creatorShareCents / 100).toFixed(2)),
          amountCents: creatorShareCents,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          idempotencySuffix: 'creator_70',
          description: `[70% Repasse Criador] Desbloqueio "${params.contentTitle}"`,
          metadata: {
            originCategory: 'content_producer',
            grantId: params.grantId,
            splitPct: 0.7,
          },
        },
        {
          operationType: 'PLATFORM_COMMISSION',
          debitAccount: 'ESCROW_PAYMENT_GATEWAY',
          creditAccount: 'PLATFORM_REVENUE:brl',
          amount: Number((platformShareCents / 100).toFixed(2)),
          amountCents: platformShareCents,
          currency: 'BRL',
          targetCreatorId: params.creatorId,
          referenceId: params.contentId,
          idempotencySuffix: 'platform_30',
          description: `[30% Comissão JOBS] Desbloqueio "${params.contentTitle}"`,
          metadata: {
            grantId: params.grantId,
            splitPct: 0.3,
          },
        },
      ],
    });

    return {
      synced: true,
      isReplay: res.isReplay,
      creatorShareCents,
      platformShareCents,
      transactionId: res.entries[0]?.transactionId,
    };
  }

  /**
   * Apura métricas contábeis reconciliadas diretamente a partir do livro-razão (financialLedger)
   * para unificar a leitura do painel executivo sem criar fontes paralelas de verdade.
   */
  public getReconciledExecutiveLedgerMetrics(environment: PayoutEnvironment = 'sandbox'): {
    environment: PayoutEnvironment;
    totalLedgerEntries: number;
    platformRecognizedRevenueCents: number;
    platformRecognizedRevenueBrl: number;
    creatorAvailableLiabilityCents: number;
    creatorAvailableLiabilityBrl: number;
    creatorPendingLiabilityCents: number;
    creatorPendingLiabilityBrl: number;
    payoutEscrowReservedCents: number;
    payoutEscrowReservedBrl: number;
    payoutSettledCents: number;
    payoutSettledBrl: number;
    firestoreSyncMode: 'local_sandbox_only' | 'cloud_firestore_production';
  } {
    const entries = financialLedger
      .getEntries()
      .filter((e) => (environment === 'production' ? !e.isSandbox : e.isSandbox));
    const payouts = financialLedger.getPayoutRecords(environment);

    let platformRevenueCents = 0;
    let creatorAvailCents = 0;
    let creatorPendCents = 0;
    let escrowCents = 0;

    for (const entry of entries) {
      if (entry.currency !== 'BRL') continue;
      if (entry.status !== 'posted' && entry.status !== 'refunded') continue;
      const cents =
        typeof entry.amountCents === 'number'
          ? Math.round(entry.amountCents)
          : Math.round(entry.amount * 100);

      if (entry.creditAccount.startsWith('PLATFORM_REVENUE') || entry.operationType === 'PLATFORM_COMMISSION') {
        platformRevenueCents += cents;
      }
      if (entry.creditAccount.startsWith('CREATOR_AVAILABLE_BRL:')) {
        creatorAvailCents += cents;
      }
      if (entry.debitAccount.startsWith('CREATOR_AVAILABLE_BRL:')) {
        creatorAvailCents -= cents;
      }
      if (entry.creditAccount.startsWith('CREATOR_PENDING_BRL:')) {
        creatorPendCents += cents;
      }
      if (entry.debitAccount.startsWith('CREATOR_PENDING_BRL:')) {
        creatorPendCents -= cents;
      }
      if (entry.creditAccount.startsWith('CREATOR_PAYOUT_ESCROW:')) {
        escrowCents += cents;
      }
      if (entry.debitAccount.startsWith('CREATOR_PAYOUT_ESCROW:')) {
        escrowCents -= cents;
      }
    }

    const settledPayoutsCents = payouts
      .filter((p) => p.status === 'released')
      .reduce((acc, p) => acc + p.amountCents, 0);

    return {
      environment,
      totalLedgerEntries: entries.length,
      platformRecognizedRevenueCents: Math.max(0, platformRevenueCents),
      platformRecognizedRevenueBrl: Number((Math.max(0, platformRevenueCents) / 100).toFixed(2)),
      creatorAvailableLiabilityCents: Math.max(0, creatorAvailCents),
      creatorAvailableLiabilityBrl: Number((Math.max(0, creatorAvailCents) / 100).toFixed(2)),
      creatorPendingLiabilityCents: Math.max(0, creatorPendCents),
      creatorPendingLiabilityBrl: Number((Math.max(0, creatorPendCents) / 100).toFixed(2)),
      payoutEscrowReservedCents: Math.max(0, escrowCents),
      payoutEscrowReservedBrl: Number((Math.max(0, escrowCents) / 100).toFixed(2)),
      payoutSettledCents: settledPayoutsCents,
      payoutSettledBrl: Number((settledPayoutsCents / 100).toFixed(2)),
      firestoreSyncMode:
        environment === 'production' ? 'cloud_firestore_production' : 'local_sandbox_only',
    };
  }
}

export const financialDomainAdapter = new FinancialDomainAdapterService();
