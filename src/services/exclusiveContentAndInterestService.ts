/**
 * JOBS — SERVIÇO DE MONETIZAÇÃO EM DIAMANTES (💎), CONTEÚDO EXCLUSIVO, COFRE VIP E INTERESSE IMEDIATO
 *
 * Implementa integralmente:
 * 1. Padronização de preços ao cliente exclusivamente em Diamantes (💎):
 *    - Interesse Imediato: 29 💎 por envio
 *    - Desbloqueio de foto exclusiva: 49 💎 por foto
 *    - Desbloqueio de vídeo exclusivo: 99 💎 por vídeo
 *    - Cofre VIP: 149 💎 por acesso (período de 30 dias e escopo independente explicitamente informados)
 *    - Presentes virtuais: faixa inicial de 29 💎 a 199 💎 com preço individual por presente
 *    - Impulsionar perfil: 49 💎 por impulso (duração informada de 24 horas)
 *    - JOBS Premium: 199 💎 por 30 dias
 * 2. Segregação contábil estrita entre:
 *    - Diamantes comprados (purchasedDiamonds): referência contábil interna 1 💎 pago = R$ 0,10 (10 centavos)
 *    - Bônus promocionais (bonusDiamonds): valor fiduciário ZERO (R$ 0,00), não sacáveis e sem passivo financeiro
 *    - Diamantes consumidos (consumedPurchasedDiamonds + consumedBonusDiamonds)
 *    - Remuneração financeira de criadores em centavos inteiros no livro-razão (financialLedger)
 * 3. Regra Contábil 70 / 20 / 10 sobre a base fiduciária elegível (diamantes pagos consumidos):
 *    - 70% para o criador elegível
 *    - 20% para receita da plataforma JOBS
 *    - 10% para reserva operacional
 * 4. Comprovantes e interfaces do cliente 100% em diamantes (💎), sem expor R$, USD ou EUR ao consumidor.
 */

import { financialLedger, LedgerEntry } from './ledgerService';
import { protectedMediaService, ProtectedMediaTicket } from './protectedMediaService';
import { matchAndMessagingService, PersistentMessage } from './matchAndMessagingService';

export type ExclusiveMediaType = 'photo' | 'video';

export type ExclusiveMonetizationModality = 'FREE' | 'INDIVIDUAL_UNLOCK' | 'VIP_VAULT';

export type ExclusiveMediaLifecycleState =
  | 'draft'
  | 'under_review'
  | 'published'
  | 'blocked'
  | 'removed';

export type ExclusiveContentClassification =
  | 'sensual'
  | 'consensual_nudity_18plus'
  | 'fashion_lingerie';

export type ExclusiveModerationResult =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type MonetizedRevenueCategory =
  | 'INDIVIDUAL_PHOTO_UNLOCK'
  | 'INDIVIDUAL_VIDEO_UNLOCK'
  | 'VIP_VAULT_ACCESS'
  | 'IMMEDIATE_INTEREST'
  | 'VIRTUAL_GIFT'
  | 'PROFILE_BOOST'
  | 'JOBS_PREMIUM_SUBSCRIPTION';

export type SandboxPaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'chargeback';

export type ExecutionEnvironment = 'sandbox' | 'production';

/**
 * Referência interna de precificação contábil: 1 diamante pago = R$ 0,10 (10 centavos).
 * Bônus promocionais possuem valor fiduciário zero (0 centavos).
 */
export const PAID_DIAMOND_REFERENCE_CENTS = 10;

export interface DiamondCatalogGiftItem {
  id: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  category: 'romantic' | 'luxury' | 'royal';
}

export interface DiamondServiceCatalogConfig {
  immediateInterestDiamonds: number;
  individualPhotoUnlockDiamonds: number;
  individualVideoUnlockDiamonds: number;
  vipVaultAccessDiamonds: number;
  vipVaultDurationDays: number;
  vipVaultScopeDescription: string;
  profileBoostDiamonds: number;
  profileBoostDurationHours: number;
  jobsPremiumDiamonds: number;
  jobsPremiumDurationDays: number;
  virtualGiftsRangeMinDiamonds: number;
  virtualGiftsRangeMaxDiamonds: number;
  virtualGifts: DiamondCatalogGiftItem[];
}

export const INITIAL_DIAMOND_SERVICE_CATALOG: DiamondServiceCatalogConfig = {
  immediateInterestDiamonds: 29,
  individualPhotoUnlockDiamonds: 49,
  individualVideoUnlockDiamonds: 99,
  vipVaultAccessDiamonds: 149,
  vipVaultDurationDays: 30,
  vipVaultScopeDescription:
    'Acesso válido por 30 dias exclusivamente às fotos e vídeos do Cofre VIP deste perfil. Independente de mídias avulsas.',
  profileBoostDiamonds: 49,
  profileBoostDurationHours: 24,
  jobsPremiumDiamonds: 199,
  jobsPremiumDurationDays: 30,
  virtualGiftsRangeMinDiamonds: 29,
  virtualGiftsRangeMaxDiamonds: 199,
  virtualGifts: [
    {
      id: 'gift_rosa_veludo',
      name: 'Rosa de Veludo',
      icon: '🌹',
      priceDiamonds: 29,
      category: 'romantic',
    },
    {
      id: 'gift_brinde_cristal',
      name: 'Brinde de Cristal',
      icon: '🥂',
      priceDiamonds: 49,
      category: 'romantic',
    },
    {
      id: 'gift_perfume_noite',
      name: 'Perfume da Noite',
      icon: '✨',
      priceDiamonds: 79,
      category: 'luxury',
    },
    {
      id: 'gift_joia_rubi',
      name: 'Joia Rubi Exclusiva',
      icon: '💍',
      priceDiamonds: 119,
      category: 'luxury',
    },
    {
      id: 'gift_coroa_imperial',
      name: 'Coroa Imperial JOBS',
      icon: '👑',
      priceDiamonds: 199,
      category: 'royal',
    },
  ],
};

export interface UserDiamondWalletState {
  userId: string;
  purchasedDiamonds: number;
  bonusDiamonds: number;
  totalAvailableDiamonds: number;
  consumedPurchasedDiamonds: number;
  consumedBonusDiamonds: number;
  consumedTotalDiamonds: number;
  updatedAt: string;
}

export interface CustomerDiamondReceipt {
  receiptId: string;
  transactionId: string;
  buyerUserId: string;
  serviceCategory: MonetizedRevenueCategory;
  serviceTitle: string;
  diamondsCharged: number;
  formattedPriceDiamonds: string;
  remainingDiamondsBalance: number;
  formattedRemainingBalance: string;
  scopeAndDurationText: string;
  issuedAt: string;
  summaryText: string;
}

export interface ExclusiveMediaItem {
  id: string;
  creatorId: string;
  creatorName: string;
  mediaType: ExclusiveMediaType;
  modality: ExclusiveMonetizationModality;
  caption: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  priceDiamonds: number;
  priceCents: number;
  priceBrl: number;
  currency: 'BRL';
  state: ExclusiveMediaLifecycleState;
  classification: ExclusiveContentClassification;
  moderationResult: ExclusiveModerationResult;
  moderationReason?: string;
  ageVerified18Plus: boolean;
  consentDeclared: boolean;
  ownershipDeclared: boolean;
  safePreviewUrl: string;
  /**
   * Chave/caminho interno privado da mídia original.
   * NUNCA exposto em listagens públicas ou respostas de catálogo sem autorização confirmada.
   */
  privateMasterUrl: string;
  accessRules: {
    requiresIndividualUnlock: boolean;
    requiresVipVaultPass: boolean;
    minimumAge: 18;
  };
  unlockCount: number;
  lastTransactionId?: string;
}

export interface PublicExclusiveMediaView {
  id: string;
  creatorId: string;
  creatorName: string;
  mediaType: ExclusiveMediaType;
  modality: ExclusiveMonetizationModality;
  caption: string;
  publishedAt: string | null;
  priceDiamonds: number;
  priceCents: number;
  priceBrl: number;
  currency: 'BRL';
  state: ExclusiveMediaLifecycleState;
  classification: ExclusiveContentClassification;
  moderationResult: ExclusiveModerationResult;
  ageVerified18Plus: boolean;
  safePreviewUrl: string;
  unlockCount: number;
  isUnlockedForViewer: boolean;
}

export interface CreatorVipVaultConfig {
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  safeCoverPreviewUrl: string;
  priceDiamonds: number;
  durationDays: number;
  scopeDescription: string;
  priceCents: number;
  priceBrl: number;
  currency: 'BRL';
  isActive: boolean;
  ageVerified18Plus: boolean;
  consentDeclared: boolean;
  updatedAt: string;
}

export interface ExclusiveAccessGrantRecord {
  id: string;
  buyerUserId: string;
  creatorId: string;
  grantScope:
    | 'INDIVIDUAL_MEDIA'
    | 'VIP_VAULT'
    | 'IMMEDIATE_INTEREST_CHAT'
    | 'PROFILE_BOOST'
    | 'JOBS_PREMIUM';
  targetId: string; // mediaId para INDIVIDUAL_MEDIA, creatorId para VIP_VAULT, recipientUserId para IMMEDIATE_INTEREST_CHAT
  transactionId: string;
  idempotencyKey: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  expiresAt?: string;
  durationDays?: number;
  durationHours?: number;
  scopeDescription?: string;
  revokedAt?: string;
  revocationReason?: string;
  environment: ExecutionEnvironment;
}

export interface SignedTemporaryMediaDelivery {
  tokenId: string;
  mediaId: string;
  buyerUserId: string;
  creatorId: string;
  modality: ExclusiveMonetizationModality;
  signedTemporaryUrl: string;
  signature: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  ticket: ProtectedMediaTicket;
}

export interface MonetizedTransactionRecord {
  id: string;
  idempotencyKey: string;
  category: MonetizedRevenueCategory;
  buyerUserId: string;
  creatorOrRecipientId: string;
  creatorOrRecipientName: string;
  referenceId: string; // mediaId, vault:creatorId, ou interest:recipientId
  description: string;
  diamondsCharged: number;
  paidDiamondsUsed: number;
  bonusDiamondsUsed: number;
  currency: 'BRL';
  grossAmountCents: number;
  grossAmountBrl: number;
  creatorShareCents: number;
  creatorShareBrl: number;
  platformShare20Cents: number;
  platformShare20Brl: number;
  operationalReserve10Cents: number;
  operationalReserve10Brl: number;
  platformCommissionCents: number;
  platformCommissionBrl: number;
  paymentStatus: SandboxPaymentStatus;
  environment: ExecutionEnvironment;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  refundType?: 'REFUND' | 'CHARGEBACK';
  grantId?: string;
  ledgerEntryIds: string[];
  reversalLedgerEntryIds?: string[];
  customerReceipt?: CustomerDiamondReceipt;
}

export interface ImmediateInterestRecord {
  id: string;
  idempotencyKey: string;
  senderUserId: string;
  recipientUserId: string;
  recipientName: string;
  initialMessage?: string;
  priceDiamonds: number;
  paidDiamondsUsed: number;
  bonusDiamondsUsed: number;
  priceCents: number;
  priceBrl: number;
  creatorShareCents: number;
  platformShare20Cents: number;
  operationalReserve10Cents: number;
  platformCommissionCents: number;
  status: 'confirmed' | 'revoked';
  transactionId: string;
  grantId: string;
  messagingUnlocked: boolean;
  createdAt: string;
  environment: ExecutionEnvironment;
}

export interface Split70_20_10Calculation {
  grossAmountCents: number;
  grossAmountBrl: number;
  creatorShareCents: number;
  creatorShareBrl: number;
  platformShare20Cents: number;
  platformShare20Brl: number;
  operationalReserve10Cents: number;
  operationalReserve10Brl: number;
  platformCommissionCents: number;
  platformCommissionBrl: number;
  isBalanced: boolean;
}

export type Split7030Calculation = Split70_20_10Calculation;

export interface CreatorMonetizationDashboardSummary {
  creatorId: string;
  environment: ExecutionEnvironment;
  currency: 'BRL';
  totalDiamondsReceived: number;
  paidDiamondsReceived: number;
  bonusDiamondsReceived: number;
  grossRevenueCents: number;
  grossRevenueBrl: number;
  refundedCents: number;
  refundedBrl: number;
  netRevenueCents: number;
  netRevenueBrl: number;
  creatorShare70Cents: number;
  creatorShare70Brl: number;
  platformShare20Cents: number;
  platformShare20Brl: number;
  operationalReserve10Cents: number;
  operationalReserve10Brl: number;
  platformCommission30Cents: number;
  platformCommission30Brl: number;
  pendingBalanceCents: number;
  pendingBalanceBrl: number;
  availableBalanceCents: number;
  availableBalanceBrl: number;
  byCategory: Record<
    MonetizedRevenueCategory,
    {
      count: number;
      refundedCount: number;
      diamondsTotal: number;
      paidDiamondsTotal: number;
      bonusDiamondsTotal: number;
      grossCents: number;
      refundedCents: number;
      netCents: number;
      creatorShare70Cents: number;
      platformShare20Cents: number;
      operationalReserve10Cents: number;
      platformCommission30Cents: number;
    }
  >;
  publishedIndividualPhotosCount: number;
  publishedIndividualVideosCount: number;
  publishedVipVaultItemsCount: number;
  publishedFreeItemsCount?: number;
}

export interface PlatformMonetizationReconciliationReport {
  environment: ExecutionEnvironment | 'all';
  currency: 'BRL';
  totalDiamondsConsumed: number;
  totalPaidDiamondsConsumed: number;
  totalBonusDiamondsConsumed: number;
  totalGrossReceivedCents: number;
  totalGrossReceivedBrl: number;
  totalRefundedAndChargebackCents: number;
  totalRefundedAndChargebackBrl: number;
  netRecognizedRevenueCents: number;
  netRecognizedRevenueBrl: number;
  totalCreatorShare70Cents: number;
  totalCreatorShare70Brl: number;
  totalPlatformShare20Cents: number;
  totalPlatformShare20Brl: number;
  totalOperationalReserve10Cents: number;
  totalOperationalReserve10Brl: number;
  totalPlatformCommission30Cents: number;
  totalPlatformCommission30Brl: number;
  netCreatorObligationsCents: number;
  netCreatorObligationsBrl: number;
  netPlatformShare20Cents: number;
  netPlatformShare20Brl: number;
  netOperationalReserve10Cents: number;
  netOperationalReserve10Brl: number;
  netPlatformRetainedCents: number;
  netPlatformRetainedBrl: number;
  isStrictlyReconciled: boolean;
  reconciliationFormulaCheck: {
    grossMinusRefundsEqualsNet: boolean;
    creatorPlusPlatformEqualsNet: boolean;
    split70_20_10EqualsNet: boolean;
    bonusDiamondsZeroFiatLiability: boolean;
    zeroDivergentTransactions: boolean;
  };
  byCategory: Record<
    MonetizedRevenueCategory,
    {
      confirmedCount: number;
      refundedCount: number;
      diamondsConsumed: number;
      paidDiamondsConsumed: number;
      bonusDiamondsConsumed: number;
      grossCents: number;
      refundedCents: number;
      netCents: number;
      creatorShare70Cents: number;
      platformShare20Cents: number;
      operationalReserve10Cents: number;
      platformCommission30Cents: number;
      netCreator70Cents: number;
      netPlatform20Cents: number;
      netReserve10Cents: number;
      netPlatform30Cents: number;
    }
  >;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    code: string;
    title: string;
    description: string;
  }>;
}

const STORAGE_KEY_EXCLUSIVE_MEDIA = 'jobs_excl_media_items_v1';
const STORAGE_KEY_VIP_VAULT_CONFIGS = 'jobs_excl_vip_vault_configs_v1';
const STORAGE_KEY_EXCLUSIVE_GRANTS = 'jobs_excl_access_grants_v1';
const STORAGE_KEY_MONETIZED_TXS = 'jobs_excl_monetized_txs_v1';
const STORAGE_KEY_IMMEDIATE_INTERESTS = 'jobs_excl_immediate_interests_v1';
const STORAGE_KEY_SIGNED_DELIVERIES = 'jobs_excl_signed_deliveries_v1';
const STORAGE_KEY_USER_BLOCKS_PAIRS = 'jobs_excl_user_blocks_pairs_v1';
const STORAGE_KEY_CREATOR_COMPLIANCE = 'jobs_excl_creator_compliance_v1';
const STORAGE_KEY_DIAMOND_CATALOG = 'jobs_excl_diamond_catalog_v1';
const STORAGE_KEY_USER_DIAMOND_WALLETS = 'jobs_excl_user_diamond_wallets_v1';

const DEFAULT_IMMEDIATE_INTEREST_DIAMONDS = INITIAL_DIAMOND_SERVICE_CATALOG.immediateInterestDiamonds; // 29 💎
const DEFAULT_IMMEDIATE_INTEREST_PRICE_CENTS =
  DEFAULT_IMMEDIATE_INTEREST_DIAMONDS * PAID_DIAMOND_REFERENCE_CENTS; // 290 centavos (R$ 2,90 de base interna para 29 💎 pagos)
const MAX_IMMEDIATE_INTEREST_PER_WINDOW = 5;
const IMMEDIATE_INTEREST_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const DEFAULT_SANDBOX_INITIAL_PURCHASED_DIAMONDS = 5000;

const memoryFallbackStore: Record<string, string> = {};

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    try {
      const s = (globalThis as any).localStorage;
      const probe = '__jobs_excl_probe__';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch {
      // fallback
    }
  }
  return {
    getItem: (k: string) => (k in memoryFallbackStore ? memoryFallbackStore[k] : null),
    setItem: (k: string, v: string) => {
      memoryFallbackStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete memoryFallbackStore[k];
    },
  };
}

/**
 * Formata valores exclusivamente em diamantes (💎) para exibição ao cliente final.
 */
export function formatDiamondsDisplay(diamonds: number): string {
  const safe = Math.max(0, Math.round(Number(diamonds) || 0));
  return `${safe} 💎`;
}

/**
 * Função pura e determinística para cálculo da Regra Contábil 70 / 20 / 10 em centavos inteiros:
 * - 70% para o criador elegível
 * - 20% para a receita da plataforma JOBS
 * - 10% para reserva operacional
 * Garante sempre:
 *   creatorShareCents + platformShare20Cents + operationalReserve10Cents === grossAmountCents
 *   platformCommissionCents === platformShare20Cents + operationalReserve10Cents
 */
export function calculateSplit70_20_10Cents(grossAmountCents: number): Split70_20_10Calculation {
  if (!Number.isInteger(grossAmountCents) || grossAmountCents < 0) {
    throw new Error(`Valor bruto em centavos inválido: ${grossAmountCents}. Deve ser inteiro não-negativo.`);
  }
  const creatorShareCents = Math.round(grossAmountCents * 0.70);
  const platformCommissionCents = grossAmountCents - creatorShareCents;
  const platformShare20Cents = Math.min(
    platformCommissionCents,
    Math.round(grossAmountCents * 0.20)
  );
  const operationalReserve10Cents = platformCommissionCents - platformShare20Cents;

  const grossAmountBrl = Number((grossAmountCents / 100).toFixed(2));
  const creatorShareBrl = Number((creatorShareCents / 100).toFixed(2));
  const platformShare20Brl = Number((platformShare20Cents / 100).toFixed(2));
  const operationalReserve10Brl = Number((operationalReserve10Cents / 100).toFixed(2));
  const platformCommissionBrl = Number((platformCommissionCents / 100).toFixed(2));

  return {
    grossAmountCents,
    grossAmountBrl,
    creatorShareCents,
    creatorShareBrl,
    platformShare20Cents,
    platformShare20Brl,
    operationalReserve10Cents,
    operationalReserve10Brl,
    platformCommissionCents,
    platformCommissionBrl,
    isBalanced:
      creatorShareCents + platformShare20Cents + operationalReserve10Cents === grossAmountCents &&
      platformShare20Cents + operationalReserve10Cents === platformCommissionCents,
  };
}

/**
 * Alias compatível com suítes existentes que invocam calculateSplit7030Cents,
 * retornando também a decomposição 70% criador / 20% JOBS / 10% reserva operacional.
 */
export function calculateSplit7030Cents(grossAmountCents: number): Split7030Calculation {
  return calculateSplit70_20_10Cents(grossAmountCents);
}

class ExclusiveContentAndInterestService {
  private queue: Promise<void> = Promise.resolve();
  private listeners: Set<() => void> = new Set();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore listener error
      }
    });
  }

  private readJson<T>(key: string, defaultValue: T): T {
    const raw = getStorage().getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    getStorage().setItem(key, JSON.stringify(value));
    this.notify();
  }

  // ==========================================================================
  // CATÁLOGO INICIAL CONFIGURÁVEL EM DIAMANTES (💎) E CARTEIRA SEGREGADA
  // ==========================================================================

  public getDiamondServiceCatalog(): DiamondServiceCatalogConfig {
    const saved = this.readJson<DiamondServiceCatalogConfig | null>(STORAGE_KEY_DIAMOND_CATALOG, null);
    if (saved && typeof saved.immediateInterestDiamonds === 'number') {
      return saved;
    }
    this.writeJson(STORAGE_KEY_DIAMOND_CATALOG, INITIAL_DIAMOND_SERVICE_CATALOG);
    return INITIAL_DIAMOND_SERVICE_CATALOG;
  }

  public updateDiamondServiceCatalog(
    patch: Partial<DiamondServiceCatalogConfig>
  ): DiamondServiceCatalogConfig {
    const current = this.getDiamondServiceCatalog();
    const updated: DiamondServiceCatalogConfig = {
      ...current,
      ...patch,
      virtualGifts: patch.virtualGifts ?? current.virtualGifts,
    };
    if (
      updated.immediateInterestDiamonds <= 0 ||
      updated.individualPhotoUnlockDiamonds <= 0 ||
      updated.individualVideoUnlockDiamonds <= 0 ||
      updated.vipVaultAccessDiamonds <= 0 ||
      updated.profileBoostDiamonds <= 0 ||
      updated.jobsPremiumDiamonds <= 0
    ) {
      throw new Error('Todos os preços em diamantes do catálogo devem ser inteiros positivos.');
    }
    this.writeJson(STORAGE_KEY_DIAMOND_CATALOG, updated);
    return updated;
  }

  public getUserDiamondWallet(userId: string): UserDiamondWalletState {
    const map = this.readJson<Record<string, UserDiamondWalletState>>(STORAGE_KEY_USER_DIAMOND_WALLETS, {});
    if (map[userId]) {
      return map[userId];
    }
    const initial: UserDiamondWalletState = {
      userId,
      purchasedDiamonds: DEFAULT_SANDBOX_INITIAL_PURCHASED_DIAMONDS,
      bonusDiamonds: 0,
      totalAvailableDiamonds: DEFAULT_SANDBOX_INITIAL_PURCHASED_DIAMONDS,
      consumedPurchasedDiamonds: 0,
      consumedBonusDiamonds: 0,
      consumedTotalDiamonds: 0,
      updatedAt: new Date().toISOString(),
    };
    map[userId] = initial;
    this.writeJson(STORAGE_KEY_USER_DIAMOND_WALLETS, map);
    return initial;
  }

  public setUserDiamondWallet(
    userId: string,
    params: {
      purchasedDiamonds: number;
      bonusDiamonds?: number;
      consumedPurchasedDiamonds?: number;
      consumedBonusDiamonds?: number;
    }
  ): UserDiamondWalletState {
    const purchased = Math.max(0, Math.floor(params.purchasedDiamonds));
    const bonus = Math.max(0, Math.floor(params.bonusDiamonds ?? 0));
    const consumedPaid = Math.max(0, Math.floor(params.consumedPurchasedDiamonds ?? 0));
    const consumedBonus = Math.max(0, Math.floor(params.consumedBonusDiamonds ?? 0));

    const map = this.readJson<Record<string, UserDiamondWalletState>>(STORAGE_KEY_USER_DIAMOND_WALLETS, {});
    const state: UserDiamondWalletState = {
      userId,
      purchasedDiamonds: purchased,
      bonusDiamonds: bonus,
      totalAvailableDiamonds: purchased + bonus,
      consumedPurchasedDiamonds: consumedPaid,
      consumedBonusDiamonds: consumedBonus,
      consumedTotalDiamonds: consumedPaid + consumedBonus,
      updatedAt: new Date().toISOString(),
    };
    map[userId] = state;
    this.writeJson(STORAGE_KEY_USER_DIAMOND_WALLETS, map);
    return state;
  }

  public creditUserDiamonds(params: {
    userId: string;
    purchasedDiamondsToAdd: number;
    bonusDiamondsToAdd?: number;
  }): UserDiamondWalletState {
    const current = this.getUserDiamondWallet(params.userId);
    const addPaid = Math.max(0, Math.floor(params.purchasedDiamondsToAdd));
    const addBonus = Math.max(0, Math.floor(params.bonusDiamondsToAdd ?? 0));
    return this.setUserDiamondWallet(params.userId, {
      purchasedDiamonds: current.purchasedDiamonds + addPaid,
      bonusDiamonds: current.bonusDiamonds + addBonus,
      consumedPurchasedDiamonds: current.consumedPurchasedDiamonds,
      consumedBonusDiamonds: current.consumedBonusDiamonds,
    });
  }

  private consumeUserDiamondsInternal(params: {
    userId: string;
    diamondsToConsume: number;
    consumptionOrder?: 'paid_first' | 'bonus_first';
  }): {
    walletAfter: UserDiamondWalletState;
    paidDiamondsUsed: number;
    bonusDiamondsUsed: number;
    eligibleGrossCents: number;
  } {
    const required = Math.max(0, Math.round(params.diamondsToConsume));
    const wallet = this.getUserDiamondWallet(params.userId);

    if (wallet.totalAvailableDiamonds < required) {
      throw new Error(
        `Saldo de diamantes insuficiente: necessário ${required} 💎, disponível ${wallet.totalAvailableDiamonds} 💎.`
      );
    }

    let paidDiamondsUsed = 0;
    let bonusDiamondsUsed = 0;
    const order = params.consumptionOrder || 'paid_first';

    if (order === 'paid_first') {
      paidDiamondsUsed = Math.min(wallet.purchasedDiamonds, required);
      bonusDiamondsUsed = required - paidDiamondsUsed;
    } else {
      bonusDiamondsUsed = Math.min(wallet.bonusDiamonds, required);
      paidDiamondsUsed = required - bonusDiamondsUsed;
    }

    const nextPurchased = wallet.purchasedDiamonds - paidDiamondsUsed;
    const nextBonus = wallet.bonusDiamonds - bonusDiamondsUsed;
    if (nextPurchased < 0 || nextBonus < 0) {
      throw new Error('Operação abortada: saldo de diamantes não pode ficar negativo.');
    }

    const walletAfter = this.setUserDiamondWallet(params.userId, {
      purchasedDiamonds: nextPurchased,
      bonusDiamonds: nextBonus,
      consumedPurchasedDiamonds: wallet.consumedPurchasedDiamonds + paidDiamondsUsed,
      consumedBonusDiamonds: wallet.consumedBonusDiamonds + bonusDiamondsUsed,
    });

    // Regra contábil: somente diamantes comprados (pagos) geram base fiduciária (1 💎 pago = R$ 0,10).
    // Bônus promocionais têm valor fiduciário zero (R$ 0,00).
    const eligibleGrossCents = paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;

    return {
      walletAfter,
      paidDiamondsUsed,
      bonusDiamondsUsed,
      eligibleGrossCents,
    };
  }

  private refundUserDiamondsInternal(params: {
    userId: string;
    paidDiamondsToRestore: number;
    bonusDiamondsToRestore: number;
  }): UserDiamondWalletState {
    const wallet = this.getUserDiamondWallet(params.userId);
    const restorePaid = Math.max(0, Math.round(params.paidDiamondsToRestore));
    const restoreBonus = Math.max(0, Math.round(params.bonusDiamondsToRestore));

    return this.setUserDiamondWallet(params.userId, {
      purchasedDiamonds: wallet.purchasedDiamonds + restorePaid,
      bonusDiamonds: wallet.bonusDiamonds + restoreBonus,
      consumedPurchasedDiamonds: Math.max(0, wallet.consumedPurchasedDiamonds - restorePaid),
      consumedBonusDiamonds: Math.max(0, wallet.consumedBonusDiamonds - restoreBonus),
    });
  }

  private buildCustomerDiamondReceipt(params: {
    transactionId: string;
    buyerUserId: string;
    serviceCategory: MonetizedRevenueCategory;
    serviceTitle: string;
    diamondsCharged: number;
    remainingDiamondsBalance: number;
    scopeAndDurationText: string;
    issuedAt: string;
  }): CustomerDiamondReceipt {
    const formattedPriceDiamonds = formatDiamondsDisplay(params.diamondsCharged);
    const formattedRemainingBalance = formatDiamondsDisplay(params.remainingDiamondsBalance);
    return {
      receiptId: `rcpt_${params.transactionId}`,
      transactionId: params.transactionId,
      buyerUserId: params.buyerUserId,
      serviceCategory: params.serviceCategory,
      serviceTitle: params.serviceTitle,
      diamondsCharged: params.diamondsCharged,
      formattedPriceDiamonds,
      remainingDiamondsBalance: params.remainingDiamondsBalance,
      formattedRemainingBalance,
      scopeAndDurationText: params.scopeAndDurationText,
      issuedAt: params.issuedAt,
      summaryText: `${params.serviceTitle} confirmado por ${formattedPriceDiamonds}. ${params.scopeAndDurationText} Saldo restante: ${formattedRemainingBalance}.`,
    };
  }

  // ==========================================================================
  // SEEDS INICIAIS REAIS E COMPATÍVEIS COM OS PERFIS EXISTENTES
  // ==========================================================================

  private ensureInitialSeeds(): void {
    const catalog = this.getDiamondServiceCatalog();
    const existingMedia = getStorage().getItem(STORAGE_KEY_EXCLUSIVE_MEDIA);
    if (!existingMedia) {
      const now = '2026-10-20T12:00:00.000Z';
      const photoDiamonds = catalog.individualPhotoUnlockDiamonds; // 49 💎
      const videoDiamonds = catalog.individualVideoUnlockDiamonds; // 99 💎
      const photoCents = photoDiamonds * PAID_DIAMOND_REFERENCE_CENTS; // 490c
      const videoCents = videoDiamonds * PAID_DIAMOND_REFERENCE_CENTS; // 990c

      const initialMedia: ExclusiveMediaItem[] = [
        {
          id: 'excl_photo_val_01',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'INDIVIDUAL_UNLOCK',
          caption: 'Ensaio Exclusivo Golden Hour em Florença (Foto Avulsa Alta Resolução)',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: photoDiamonds,
          priceCents: photoCents,
          priceBrl: Number((photoCents / 100).toFixed(2)),
          currency: 'BRL',
          state: 'published',
          classification: 'fashion_lingerie',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          privateMasterUrl: 'private://vault/valentina/master_photo_florence_4k.jpg',
          accessRules: {
            requiresIndividualUnlock: true,
            requiresVipVaultPass: false,
            minimumAge: 18,
          },
          unlockCount: 14,
        },
        {
          id: 'excl_video_val_02',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'video',
          modality: 'INDIVIDUAL_UNLOCK',
          caption: 'Vídeo Exclusivo: Bastidores do Desfile Privado em Milão (4K 60fps)',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: videoDiamonds,
          priceCents: videoCents,
          priceBrl: Number((videoCents / 100).toFixed(2)),
          currency: 'BRL',
          state: 'published',
          classification: 'sensual',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
          privateMasterUrl: 'private://vault/valentina/master_video_milan_backstage_4k.mp4',
          accessRules: {
            requiresIndividualUnlock: true,
            requiresVipVaultPass: false,
            minimumAge: 18,
          },
          unlockCount: 9,
        },
        {
          id: 'excl_vault_val_03',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'VIP_VAULT',
          caption: 'Cofre VIP: Série Sensual Boudoir Noite em Roma #1',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: 0, // Incluso no Passe do Cofre VIP (149 💎)
          priceCents: 0,
          priceBrl: 0,
          currency: 'BRL',
          state: 'published',
          classification: 'consensual_nudity_18plus',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
          privateMasterUrl: 'private://vault/valentina/vip_vault_rome_boudoir_01.jpg',
          accessRules: {
            requiresIndividualUnlock: false,
            requiresVipVaultPass: true,
            minimumAge: 18,
          },
          unlockCount: 28,
        },
        {
          id: 'excl_vault_val_04',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'video',
          modality: 'VIP_VAULT',
          caption: 'Cofre VIP: Vídeo Íntimo Artístico Luz de Velas #2',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: 0, // Incluso no Passe do Cofre VIP (149 💎)
          priceCents: 0,
          priceBrl: 0,
          currency: 'BRL',
          state: 'published',
          classification: 'consensual_nudity_18plus',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          privateMasterUrl: 'private://vault/valentina/vip_vault_candlelight_02.mp4',
          accessRules: {
            requiresIndividualUnlock: false,
            requiresVipVaultPass: true,
            minimumAge: 18,
          },
          unlockCount: 28,
        },
        {
          id: 'excl_photo_isa_01',
          creatorId: 'isabella',
          creatorName: 'Isabella Fontes',
          mediaType: 'photo',
          modality: 'INDIVIDUAL_UNLOCK',
          caption: 'Ensaio Biquíni Dourado Pôr do Sol em Ipanema (Foto Individual)',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: photoDiamonds,
          priceCents: photoCents,
          priceBrl: Number((photoCents / 100).toFixed(2)),
          currency: 'BRL',
          state: 'published',
          classification: 'sensual',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
          privateMasterUrl: 'private://vault/isabella/master_photo_ipanema_sunset.jpg',
          accessRules: {
            requiresIndividualUnlock: true,
            requiresVipVaultPass: false,
            minimumAge: 18,
          },
          unlockCount: 19,
        },
        {
          id: 'excl_vault_isa_02',
          creatorId: 'isabella',
          creatorName: 'Isabella Fontes',
          mediaType: 'photo',
          modality: 'VIP_VAULT',
          caption: 'Cofre VIP Isabella: Ensaio Privado Cobertura Leblon (+18)',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: 0,
          priceCents: 0,
          priceBrl: 0,
          currency: 'BRL',
          state: 'published',
          classification: 'consensual_nudity_18plus',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
          privateMasterUrl: 'private://vault/isabella/vip_vault_leblon_penthouse_01.jpg',
          accessRules: {
            requiresIndividualUnlock: false,
            requiresVipVaultPass: true,
            minimumAge: 18,
          },
          unlockCount: 22,
        },
        {
          id: 'excl_free_val_05',
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          mediaType: 'photo',
          modality: 'FREE',
          caption: 'Conteúdo Gratuito: Café da Manhã em Milão &Look do Dia ✨',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: 0,
          priceCents: 0,
          priceBrl: 0,
          currency: 'BRL',
          state: 'published',
          classification: 'fashion_lingerie',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
          privateMasterUrl: 'private://vault/valentina/free_milan_morning.jpg',
          accessRules: {
            requiresIndividualUnlock: false,
            requiresVipVaultPass: false,
            minimumAge: 18,
          },
          unlockCount: 42,
        },
        {
          id: 'excl_free_isa_03',
          creatorId: 'isabella',
          creatorName: 'Isabella Fontes',
          mediaType: 'photo',
          modality: 'FREE',
          caption: 'Conteúdo Gratuito: Pós-Praia no Leblon ☀️',
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          priceDiamonds: 0,
          priceCents: 0,
          priceBrl: 0,
          currency: 'BRL',
          state: 'published',
          classification: 'sensual',
          moderationResult: 'approved',
          ageVerified18Plus: true,
          consentDeclared: true,
          ownershipDeclared: true,
          safePreviewUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
          privateMasterUrl: 'private://vault/isabella/free_leblon_sun.jpg',
          accessRules: {
            requiresIndividualUnlock: false,
            requiresVipVaultPass: false,
            minimumAge: 18,
          },
          unlockCount: 31,
        },
      ];
      getStorage().setItem(STORAGE_KEY_EXCLUSIVE_MEDIA, JSON.stringify(initialMedia));
    }

    const existingConfigs = getStorage().getItem(STORAGE_KEY_VIP_VAULT_CONFIGS);
    if (!existingConfigs) {
      const now = '2026-10-20T12:00:00.000Z';
      const vaultDiamonds = catalog.vipVaultAccessDiamonds; // 149 💎
      const vaultCents = vaultDiamonds * PAID_DIAMOND_REFERENCE_CENTS; // 1490c
      const vaultBrl = Number((vaultCents / 100).toFixed(2));
      const configs: Record<string, CreatorVipVaultConfig> = {
        valentina: {
          creatorId: 'valentina',
          creatorName: 'Valentina Rossi',
          title: 'Cofre VIP de Valentina Rossi',
          description:
            'Acesso exclusivo por 30 dias às fotos e vídeos sensuais e artísticos (+18) do Cofre VIP de Valentina. Independente de mídias avulsas.',
          safeCoverPreviewUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
          priceDiamonds: vaultDiamonds,
          durationDays: catalog.vipVaultDurationDays,
          scopeDescription: catalog.vipVaultScopeDescription,
          priceCents: vaultCents,
          priceBrl: vaultBrl,
          currency: 'BRL',
          isActive: true,
          ageVerified18Plus: true,
          consentDeclared: true,
          updatedAt: now,
        },
        isabella: {
          creatorId: 'isabella',
          creatorName: 'Isabella Fontes',
          title: 'Cofre VIP de Isabella Fontes',
          description:
            'Coleção reservada por 30 dias de ensaios sensuais e vídeos íntimos consentidos (+18) de Isabella Fontes. Independente de itens avulsos.',
          safeCoverPreviewUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
          priceDiamonds: vaultDiamonds,
          durationDays: catalog.vipVaultDurationDays,
          scopeDescription: catalog.vipVaultScopeDescription,
          priceCents: vaultCents,
          priceBrl: vaultBrl,
          currency: 'BRL',
          isActive: true,
          ageVerified18Plus: true,
          consentDeclared: true,
          updatedAt: now,
        },
      };
      getStorage().setItem(STORAGE_KEY_VIP_VAULT_CONFIGS, JSON.stringify(configs));
    }
  }

  // ==========================================================================
  // BLOQUEIO ENTRE USUÁRIOS E ELEGIBILIDADE (+18 / MODERAÇÃO)
  // ==========================================================================

  public blockUserPair(blockerUserId: string, blockedUserId: string, reason = 'Bloqueio direto entre usuários'): void {
    const pairs = this.readJson<Array<{ blockerId: string; blockedId: string; reason: string; createdAt: string }>>(
      STORAGE_KEY_USER_BLOCKS_PAIRS,
      []
    );
    const exists = pairs.some(
      (p) =>
        (p.blockerId === blockerUserId && p.blockedId === blockedUserId) ||
        (p.blockerId === blockedUserId && p.blockedId === blockerUserId)
    );
    if (!exists) {
      pairs.push({
        blockerId: blockerUserId,
        blockedId: blockedUserId,
        reason,
        createdAt: new Date().toISOString(),
      });
      this.writeJson(STORAGE_KEY_USER_BLOCKS_PAIRS, pairs);
    }

    // Revoga imediatamente qualquer concessão de conversa ou mídia ativa entre o par bloqueado
    const grants = this.getAllAccessGrants();
    let changed = false;
    for (const g of grants) {
      const matchesPair =
        (g.buyerUserId === blockerUserId && (g.creatorId === blockedUserId || g.targetId === blockedUserId)) ||
        (g.buyerUserId === blockedUserId && (g.creatorId === blockerUserId || g.targetId === blockerUserId));
      if (matchesPair && g.status === 'active') {
        g.status = 'revoked';
        g.revokedAt = new Date().toISOString();
        g.revocationReason = `Bloqueio entre usuários: ${reason}`;
        changed = true;
      }
    }
    if (changed) {
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);
    }
  }

  public unblockUserPair(userAId: string, userBId: string): void {
    const pairs = this.readJson<Array<{ blockerId: string; blockedId: string; reason: string; createdAt: string }>>(
      STORAGE_KEY_USER_BLOCKS_PAIRS,
      []
    );
    const filtered = pairs.filter(
      (p) =>
        !(
          (p.blockerId === userAId && p.blockedId === userBId) ||
          (p.blockerId === userBId && p.blockedId === userAId)
        )
    );
    this.writeJson(STORAGE_KEY_USER_BLOCKS_PAIRS, filtered);
  }

  public isPairBlocked(userAId: string, userBId: string): boolean {
    if (protectedMediaService.isUserBlocked(userAId) || protectedMediaService.isUserBlocked(userBId)) {
      return true;
    }
    const pairs = this.readJson<Array<{ blockerId: string; blockedId: string }>>(STORAGE_KEY_USER_BLOCKS_PAIRS, []);
    if (
      pairs.some(
        (p) =>
          (p.blockerId === userAId && p.blockedId === userBId) ||
          (p.blockerId === userBId && p.blockedId === userAId)
      )
    ) {
      return true;
    }
    // Também respeita a lista global jhobs_blocked_user_ids se presente
    const appBlocked = this.readJson<string[]>('jhobs_blocked_user_ids', []);
    if (appBlocked.includes(userAId) || appBlocked.includes(userBId)) {
      return true;
    }
    return false;
  }

  public setCreatorComplianceStatus(params: {
    creatorId: string;
    ageVerified18Plus: boolean;
    consentDeclared: boolean;
    accountSuspended?: boolean;
  }): void {
    const map = this.readJson<
      Record<string, { ageVerified18Plus: boolean; consentDeclared: boolean; accountSuspended: boolean }>
    >(STORAGE_KEY_CREATOR_COMPLIANCE, {});
    map[params.creatorId] = {
      ageVerified18Plus: params.ageVerified18Plus,
      consentDeclared: params.consentDeclared,
      accountSuspended: Boolean(params.accountSuspended),
    };
    this.writeJson(STORAGE_KEY_CREATOR_COMPLIANCE, map);
  }

  public getCreatorComplianceStatus(creatorId: string): {
    ageVerified18Plus: boolean;
    consentDeclared: boolean;
    accountSuspended: boolean;
  } {
    const map = this.readJson<
      Record<string, { ageVerified18Plus: boolean; consentDeclared: boolean; accountSuspended: boolean }>
    >(STORAGE_KEY_CREATOR_COMPLIANCE, {});
    return (
      map[creatorId] || {
        ageVerified18Plus: true,
        consentDeclared: true,
        accountSuspended: false,
      }
    );
  }

  // ==========================================================================
  // 1. PUBLICAÇÃO, MODERAÇÃO E CATÁLOGO DE FOTOS E VÍDEOS
  // ==========================================================================

  public publishOrCreateMedia(params: {
    id?: string;
    creatorId: string;
    creatorName: string;
    mediaType: ExclusiveMediaType;
    modality: ExclusiveMonetizationModality;
    caption: string;
    priceDiamonds?: number;
    priceCents?: number;
    classification: ExclusiveContentClassification;
    ageVerified18Plus: boolean;
    consentDeclared: boolean;
    ownershipDeclared?: boolean;
    safePreviewUrl: string;
    privateMasterUrl: string;
    initialState?: 'draft' | 'under_review' | 'published';
    autoApproveModeration?: boolean;
  }): ExclusiveMediaItem {
    this.ensureInitialSeeds();

    if (!params.creatorId || !params.creatorId.trim()) {
      throw new Error('Identificador do criador é obrigatório.');
    }
    if (!params.caption || !params.caption.trim()) {
      throw new Error('A legenda da mídia é obrigatória.');
    }
    if (params.mediaType !== 'photo' && params.mediaType !== 'video') {
      throw new Error('Tipo de mídia inválido. Use "photo" ou "video".');
    }
    if (
      params.modality !== 'FREE' &&
      params.modality !== 'INDIVIDUAL_UNLOCK' &&
      params.modality !== 'VIP_VAULT'
    ) {
      throw new Error('Modalidade inválida. Use "FREE", "INDIVIDUAL_UNLOCK" ou "VIP_VAULT".');
    }

    // Validação rigorosa de normas da plataforma (+18 e consentimento)
    const creatorCompliance = this.getCreatorComplianceStatus(params.creatorId);
    if (creatorCompliance.accountSuspended) {
      throw new Error('Conta do criador suspensa: publicação de conteúdo monetizado bloqueada.');
    }
    if (!params.ageVerified18Plus || !creatorCompliance.ageVerified18Plus) {
      throw new Error('Violação das normas (+18): verificação de maioridade obrigatória para publicar conteúdo sensual ou exclusivo.');
    }
    if (!params.consentDeclared || !creatorCompliance.consentDeclared) {
      throw new Error('Violação das normas: declaração explícita de consentimento e titularidade de direitos é obrigatória.');
    }

    const catalog = this.getDiamondServiceCatalog();
    let resolvedDiamonds = 0;
    let resolvedCents = 0;

    if (params.modality === 'INDIVIDUAL_UNLOCK') {
      if (params.priceDiamonds !== undefined) {
        if (!Number.isInteger(params.priceDiamonds) || params.priceDiamonds <= 0) {
          throw new Error('Mídia com desbloqueio individual exige preço inteiro positivo em diamantes.');
        }
        resolvedDiamonds = params.priceDiamonds;
        resolvedCents =
          params.priceCents !== undefined && params.priceCents > 0
            ? params.priceCents
            : resolvedDiamonds * PAID_DIAMOND_REFERENCE_CENTS;
      } else if (params.priceCents !== undefined) {
        if (!Number.isInteger(params.priceCents) || params.priceCents <= 0) {
          throw new Error('Mídia com desbloqueio individual exige preço inteiro positivo em centavos.');
        }
        resolvedCents = params.priceCents;
        resolvedDiamonds = Math.max(1, Math.round(resolvedCents / PAID_DIAMOND_REFERENCE_CENTS));
      } else {
        resolvedDiamonds =
          params.mediaType === 'video'
            ? catalog.individualVideoUnlockDiamonds
            : catalog.individualPhotoUnlockDiamonds;
        resolvedCents = resolvedDiamonds * PAID_DIAMOND_REFERENCE_CENTS;
      }
    } else if (params.modality === 'FREE') {
      if (params.priceDiamonds !== undefined && params.priceDiamonds !== 0) {
        throw new Error('Conteúdo gratuito deve possuir preço igual a 0 diamantes.');
      }
      if (params.priceCents !== undefined && params.priceCents !== 0) {
        throw new Error('Conteúdo gratuito deve possuir preço igual a 0 centavos.');
      }
      resolvedDiamonds = 0;
      resolvedCents = 0;
    } else {
      if (params.priceCents !== undefined && (!Number.isInteger(params.priceCents) || params.priceCents < 0)) {
        throw new Error('Preço inválido para mídia do Cofre VIP.');
      }
      if (params.priceDiamonds !== undefined && (!Number.isInteger(params.priceDiamonds) || params.priceDiamonds < 0)) {
        throw new Error('Preço em diamantes inválido para mídia do Cofre VIP.');
      }
      resolvedDiamonds = 0;
      resolvedCents = 0;
    }

    const now = new Date().toISOString();
    const state: ExclusiveMediaLifecycleState = params.initialState || 'published';
    const moderationResult: ExclusiveModerationResult =
      state === 'published' && (params.autoApproveModeration ?? true)
        ? 'approved'
        : state === 'under_review'
        ? 'pending'
        : 'pending';

    const newItem: ExclusiveMediaItem = {
      id: params.id || `excl_${params.mediaType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      mediaType: params.mediaType,
      modality: params.modality,
      caption: params.caption.trim(),
      publishedAt: state === 'published' && moderationResult === 'approved' ? now : null,
      createdAt: now,
      updatedAt: now,
      priceDiamonds: resolvedDiamonds,
      priceCents: resolvedCents,
      priceBrl: Number((resolvedCents / 100).toFixed(2)),
      currency: 'BRL',
      state,
      classification: params.classification,
      moderationResult,
      ageVerified18Plus: params.ageVerified18Plus,
      consentDeclared: params.consentDeclared,
      ownershipDeclared: params.ownershipDeclared ?? true,
      safePreviewUrl: params.safePreviewUrl,
      privateMasterUrl: params.privateMasterUrl,
      accessRules: {
        requiresIndividualUnlock: params.modality === 'INDIVIDUAL_UNLOCK',
        requiresVipVaultPass: params.modality === 'VIP_VAULT',
        minimumAge: 18,
      },
      unlockCount: 0,
    };

    const items = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []);
    const existingIdx = items.findIndex((i) => i.id === newItem.id);
    if (existingIdx >= 0) {
      items[existingIdx] = newItem;
    } else {
      items.unshift(newItem);
    }
    this.writeJson(STORAGE_KEY_EXCLUSIVE_MEDIA, items);
    return newItem;
  }

  public transitionMediaState(params: {
    mediaId: string;
    actorId: string;
    newState: ExclusiveMediaLifecycleState;
    moderationResult?: ExclusiveModerationResult;
    reason?: string;
  }): ExclusiveMediaItem {
    this.ensureInitialSeeds();
    const items = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []);
    const idx = items.findIndex((i) => i.id === params.mediaId);
    if (idx === -1) {
      throw new Error(`Mídia ${params.mediaId} não encontrada.`);
    }

    const item = items[idx];
    const now = new Date().toISOString();

    if (params.newState === 'published') {
      if (!item.ageVerified18Plus || !item.consentDeclared) {
        throw new Error('Não é possível publicar mídia sem verificação +18 e consentimento confirmado.');
      }
      item.moderationResult = params.moderationResult || 'approved';
      if (item.moderationResult !== 'approved') {
        throw new Error('Apenas mídias com moderação aprovada podem entrar no estado publicado.');
      }
      item.publishedAt = item.publishedAt || now;
    } else if (params.newState === 'blocked' || params.newState === 'removed') {
      item.moderationResult = params.moderationResult || 'rejected';
    } else if (params.newState === 'under_review') {
      item.moderationResult = 'pending';
    }

    item.state = params.newState;
    item.moderationReason = params.reason;
    item.updatedAt = now;
    items[idx] = item;
    this.writeJson(STORAGE_KEY_EXCLUSIVE_MEDIA, items);

    // Se bloqueada ou removida, invalida imediatamente os tokens temporários emitidos para esta mídia
    if (params.newState === 'blocked' || params.newState === 'removed') {
      const deliveries = this.readJson<SignedTemporaryMediaDelivery[]>(STORAGE_KEY_SIGNED_DELIVERIES, []);
      for (const d of deliveries) {
        if (d.mediaId === item.id) {
          protectedMediaService.revokeToken(d.tokenId, params.reason || `Mídia ${params.newState}`);
        }
      }
    }

    return item;
  }

  /**
   * Listagem pública segura (NUNCA expõe privateMasterUrl).
   */
  public listPublicMediaForProfile(params: {
    creatorId: string;
    viewerUserId?: string;
    modality?: ExclusiveMonetizationModality;
    includeNonPublishedForCreatorOrAdmin?: boolean;
  }): PublicExclusiveMediaView[] {
    this.ensureInitialSeeds();
    const items = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []);
    const viewerId = params.viewerUserId || 'anonymous';

    return items
      .filter((item) => {
        if (item.creatorId !== params.creatorId) return false;
        if (params.modality && item.modality !== params.modality) return false;
        if (!params.includeNonPublishedForCreatorOrAdmin) {
          return item.state === 'published' && item.moderationResult === 'approved';
        }
        return true;
      })
      .map((item) => ({
        id: item.id,
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        mediaType: item.mediaType,
        modality: item.modality,
        caption: item.caption,
        publishedAt: item.publishedAt,
        priceDiamonds:
          item.priceDiamonds ??
          (item.modality === 'INDIVIDUAL_UNLOCK'
            ? Math.max(1, Math.round(item.priceCents / PAID_DIAMOND_REFERENCE_CENTS))
            : 0),
        priceCents: item.priceCents,
        priceBrl: item.priceBrl,
        currency: item.currency,
        state: item.state,
        classification: item.classification,
        moderationResult: item.moderationResult,
        ageVerified18Plus: item.ageVerified18Plus,
        safePreviewUrl: item.safePreviewUrl,
        unlockCount: item.unlockCount,
        isUnlockedForViewer: this.hasAuthorizedMediaAccess(viewerId, item.id),
      }));
  }

  public listCreatorOwnMedia(creatorId: string): PublicExclusiveMediaView[] {
    return this.listPublicMediaForProfile({
      creatorId,
      viewerUserId: creatorId,
      includeNonPublishedForCreatorOrAdmin: true,
    });
  }

  public getMediaByIdInternal(mediaId: string): ExclusiveMediaItem | null {
    this.ensureInitialSeeds();
    const items = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []);
    return items.find((i) => i.id === mediaId) || null;
  }

  // ==========================================================================
  // 2. CONFIGURAÇÃO E CONSULTA DO COFRE VIP
  // ==========================================================================

  public getVipVaultConfig(creatorId: string): CreatorVipVaultConfig {
    this.ensureInitialSeeds();
    const catalog = this.getDiamondServiceCatalog();
    const configs = this.readJson<Record<string, CreatorVipVaultConfig>>(STORAGE_KEY_VIP_VAULT_CONFIGS, {});
    if (configs[creatorId]) {
      return {
        ...configs[creatorId],
        priceDiamonds:
          configs[creatorId].priceDiamonds ??
          Math.max(1, Math.round(configs[creatorId].priceCents / PAID_DIAMOND_REFERENCE_CENTS)),
        durationDays: configs[creatorId].durationDays ?? catalog.vipVaultDurationDays,
        scopeDescription: configs[creatorId].scopeDescription ?? catalog.vipVaultScopeDescription,
      };
    }
    const vaultDiamonds = catalog.vipVaultAccessDiamonds; // 149 💎
    const vaultCents = vaultDiamonds * PAID_DIAMOND_REFERENCE_CENTS;
    const fallback: CreatorVipVaultConfig = {
      creatorId,
      creatorName: creatorId.charAt(0).toUpperCase() + creatorId.slice(1),
      title: `Cofre VIP de ${creatorId}`,
      description: 'Fotos e vídeos exclusivos sensuais (+18) autorizados pelas normas do JOBS.',
      safeCoverPreviewUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
      priceDiamonds: vaultDiamonds,
      durationDays: catalog.vipVaultDurationDays,
      scopeDescription: catalog.vipVaultScopeDescription,
      priceCents: vaultCents,
      priceBrl: Number((vaultCents / 100).toFixed(2)),
      currency: 'BRL',
      isActive: true,
      ageVerified18Plus: true,
      consentDeclared: true,
      updatedAt: new Date().toISOString(),
    };
    configs[creatorId] = fallback;
    this.writeJson(STORAGE_KEY_VIP_VAULT_CONFIGS, configs);
    return fallback;
  }

  public updateVipVaultConfig(params: {
    creatorId: string;
    creatorName?: string;
    title?: string;
    description?: string;
    priceDiamonds?: number;
    priceCents?: number;
    durationDays?: number;
    scopeDescription?: string;
    isActive?: boolean;
    ageVerified18Plus?: boolean;
    consentDeclared?: boolean;
  }): CreatorVipVaultConfig {
    this.ensureInitialSeeds();
    let resolvedDiamonds: number;
    let resolvedCents: number;

    if (params.priceDiamonds !== undefined) {
      if (!Number.isInteger(params.priceDiamonds) || params.priceDiamonds <= 0) {
        throw new Error('O preço do Cofre VIP em diamantes deve ser um valor inteiro positivo.');
      }
      resolvedDiamonds = params.priceDiamonds;
      resolvedCents =
        params.priceCents !== undefined && params.priceCents > 0
          ? params.priceCents
          : resolvedDiamonds * PAID_DIAMOND_REFERENCE_CENTS;
    } else if (params.priceCents !== undefined) {
      if (!Number.isInteger(params.priceCents) || params.priceCents <= 0) {
        throw new Error('O preço do Cofre VIP deve ser um valor inteiro positivo em centavos.');
      }
      resolvedCents = params.priceCents;
      resolvedDiamonds = Math.max(1, Math.round(resolvedCents / PAID_DIAMOND_REFERENCE_CENTS));
    } else {
      throw new Error('Informe priceDiamonds ou priceCents para atualizar o Cofre VIP.');
    }

    const current = this.getVipVaultConfig(params.creatorId);
    const updated: CreatorVipVaultConfig = {
      ...current,
      creatorName: params.creatorName ?? current.creatorName,
      title: params.title ?? current.title,
      description: params.description ?? current.description,
      priceDiamonds: resolvedDiamonds,
      durationDays: params.durationDays ?? current.durationDays,
      scopeDescription: params.scopeDescription ?? current.scopeDescription,
      priceCents: resolvedCents,
      priceBrl: Number((resolvedCents / 100).toFixed(2)),
      isActive: params.isActive ?? current.isActive,
      ageVerified18Plus: params.ageVerified18Plus ?? current.ageVerified18Plus,
      consentDeclared: params.consentDeclared ?? current.consentDeclared,
      updatedAt: new Date().toISOString(),
    };
    const configs = this.readJson<Record<string, CreatorVipVaultConfig>>(STORAGE_KEY_VIP_VAULT_CONFIGS, {});
    configs[params.creatorId] = updated;
    this.writeJson(STORAGE_KEY_VIP_VAULT_CONFIGS, configs);
    return updated;
  }

  // ==========================================================================
  // 3. VERIFICAÇÃO DE ACESSO ESTRITAMENTE SEPARADA (INDIVIDUAL vs COFRE VIP)
  // ==========================================================================

  public getAllAccessGrants(): ExclusiveAccessGrantRecord[] {
    return this.readJson<ExclusiveAccessGrantRecord[]>(STORAGE_KEY_EXCLUSIVE_GRANTS, []);
  }

  /**
   * Verifica se o comprador possui passe ativo para o Cofre VIP de um criador.
   * NÃO concede acesso a mídias com desbloqueio individual.
   */
  public hasActiveVipVaultAccess(buyerUserId: string, creatorId: string): boolean {
    if (!buyerUserId || !creatorId) return false;
    if (buyerUserId === creatorId) return true;
    if (this.isPairBlocked(buyerUserId, creatorId)) return false;

    const grants = this.getAllAccessGrants();
    const nowMs = Date.now();
    return grants.some((g) => {
      if (g.buyerUserId !== buyerUserId) return false;
      if (g.grantScope !== 'VIP_VAULT') return false;
      if (g.targetId !== creatorId || g.creatorId !== creatorId) return false;
      if (g.status !== 'active') return false;
      if (g.expiresAt && new Date(g.expiresAt).getTime() < nowMs) return false;
      return true;
    });
  }

  /**
   * Verifica se o comprador possui desbloqueio individual ativo para uma mídia específica.
   * NÃO concede acesso ao Cofre VIP nem a outras mídias individuais.
   */
  public hasActiveIndividualMediaUnlock(buyerUserId: string, mediaId: string): boolean {
    if (!buyerUserId || !mediaId) return false;
    const media = this.getMediaByIdInternal(mediaId);
    if (!media) return false;
    if (buyerUserId === media.creatorId) return true;
    if (this.isPairBlocked(buyerUserId, media.creatorId)) return false;

    const grants = this.getAllAccessGrants();
    const nowMs = Date.now();
    return grants.some((g) => {
      if (g.buyerUserId !== buyerUserId) return false;
      if (g.grantScope !== 'INDIVIDUAL_MEDIA') return false;
      if (g.targetId !== mediaId) return false;
      if (g.status !== 'active') return false;
      if (g.expiresAt && new Date(g.expiresAt).getTime() < nowMs) return false;
      return true;
    });
  }

  /**
   * Regra de autorização unificada respeitando a separação absoluta entre modalidades:
   * - Se media.modality === 'INDIVIDUAL_UNLOCK' -> exige grant INDIVIDUAL_MEDIA para este media.id
   * - Se media.modality === 'VIP_VAULT' -> exige grant VIP_VAULT para media.creatorId
   */
  public hasAuthorizedMediaAccess(buyerUserId: string, mediaId: string): boolean {
    const media = this.getMediaByIdInternal(mediaId);
    if (!media) return false;
    if (media.state !== 'published' || media.moderationResult !== 'approved') return false;
    if (this.isPairBlocked(buyerUserId, media.creatorId)) return false;

    if (media.modality === 'FREE') {
      return Boolean(buyerUserId && buyerUserId.trim().length > 0);
    }
    if (media.modality === 'INDIVIDUAL_UNLOCK') {
      return this.hasActiveIndividualMediaUnlock(buyerUserId, media.id);
    }
    if (media.modality === 'VIP_VAULT') {
      return this.hasActiveVipVaultAccess(buyerUserId, media.creatorId);
    }
    return false;
  }

  // ==========================================================================
  // 4. COMPRA DE MÍDIA INDIVIDUAL (FOTO 49 💎 OU VÍDEO 99 💎) — REGRA 70/20/10
  // ==========================================================================

  public async purchaseIndividualMediaUnlock(params: {
    buyerUserId: string;
    mediaId: string;
    idempotencyKey: string;
    clientProvidedPriceDiamonds?: number;
    clientProvidedPriceCents?: number; // Se enviado diferente do preço real do servidor, é rejeitado ou ignorado em favor do servidor
    rejectPriceTampering?: boolean;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    simulatePaymentStatus?: 'confirmed' | 'pending' | 'declined' | 'expired' | 'cancelled';
    buyerAgeVerified18Plus?: boolean;
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    transaction: MonetizedTransactionRecord;
    grant?: ExclusiveAccessGrantRecord;
    delivery?: SignedTemporaryMediaDelivery;
    customerReceipt?: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      this.ensureInitialSeeds();

      if (!params.buyerUserId || !params.buyerUserId.trim()) {
        throw new Error('Identificador do comprador é obrigatório.');
      }
      if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
        throw new Error('Chave de idempotência obrigatória.');
      }
      if (params.buyerAgeVerified18Plus === false) {
        throw new Error('Acesso negado: comprador não possui verificação de maioridade (+18).');
      }

      // 1. Verifica idempotência da transação
      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === params.idempotencyKey);
      if (existingByIdemp) {
        if (existingByIdemp.buyerUserId !== params.buyerUserId || existingByIdemp.referenceId !== params.mediaId) {
          throw new Error('Conflito de idempotência: chave já utilizada para parâmetros diferentes.');
        }
        const grant = this.getAllAccessGrants().find((g) => g.id === existingByIdemp.grantId);
        const delivery =
          existingByIdemp.paymentStatus === 'confirmed'
            ? this.issueSignedMediaDeliveryInternal(params.buyerUserId, params.mediaId)
            : undefined;
        return {
          success: existingByIdemp.paymentStatus === 'confirmed',
          isReplay: true,
          transaction: existingByIdemp,
          grant,
          delivery,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      // 2. Carrega mídia do armazenamento autoritativo (servidor)
      const media = this.getMediaByIdInternal(params.mediaId);
      if (!media) {
        throw new Error('Mídia exclusiva não encontrada.');
      }
      if (media.modality === 'FREE') {
        throw new Error('Conteúdo gratuito já possui acesso liberado e não requer cobrança em diamantes.');
      }
      if (media.modality !== 'INDIVIDUAL_UNLOCK') {
        throw new Error('Esta mídia pertence ao Cofre VIP e não pode ser adquirida como item individual avulso.');
      }
      if (media.state !== 'published' || media.moderationResult !== 'approved') {
        throw new Error(`Mídia indisponível para compra (estado atual: ${media.state}, moderação: ${media.moderationResult}).`);
      }

      // 3. Verifica bloqueio entre comprador e criador
      if (this.isPairBlocked(params.buyerUserId, media.creatorId)) {
        throw new Error('Operação bloqueada: existe restrição ou bloqueio ativo entre o comprador e o criador.');
      }

      const requiredDiamonds =
        media.priceDiamonds ?? Math.max(1, Math.round(media.priceCents / PAID_DIAMOND_REFERENCE_CENTS));

      // 4. Proteção contra manipulação de preço no cliente (Parameter Tampering)
      if (
        params.clientProvidedPriceDiamonds !== undefined &&
        params.clientProvidedPriceDiamonds !== requiredDiamonds
      ) {
        if (params.rejectPriceTampering) {
          throw new Error(
            `Manipulação de preço em diamantes detectada: enviado (${params.clientProvidedPriceDiamonds} 💎) diverge do preço oficial (${requiredDiamonds} 💎).`
          );
        }
      }
      if (
        params.clientProvidedPriceCents !== undefined &&
        params.clientProvidedPriceCents !== media.priceCents
      ) {
        if (params.rejectPriceTampering) {
          throw new Error(
            `Manipulação de preço detectada: valor enviado (${params.clientProvidedPriceCents}) diverge do preço oficial (${media.priceCents}).`
          );
        }
      }

      // 5. Impede cobrança duplicada se o usuário já possui acesso ativo àquela mídia
      if (this.hasActiveIndividualMediaUnlock(params.buyerUserId, media.id)) {
        const previousTx = existingTxs.find(
          (t) =>
            t.buyerUserId === params.buyerUserId &&
            t.referenceId === media.id &&
            t.paymentStatus === 'confirmed'
        );
        if (previousTx) {
          const grant = this.getAllAccessGrants().find((g) => g.id === previousTx.grantId);
          const delivery = this.issueSignedMediaDeliveryInternal(params.buyerUserId, media.id);
          return {
            success: true,
            isReplay: true,
            transaction: previousTx,
            grant,
            delivery,
            customerReceipt: previousTx.customerReceipt,
          };
        }
      }

      const category: MonetizedRevenueCategory =
        media.mediaType === 'video' ? 'INDIVIDUAL_VIDEO_UNLOCK' : 'INDIVIDUAL_PHOTO_UNLOCK';
      const paymentStatus: SandboxPaymentStatus = params.simulatePaymentStatus || 'confirmed';
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const txId = `mtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Se o pagamento não foi confirmado (pending, declined, expired, cancelled), registra tentativa sem liberar acesso nem debitar diamantes
      if (paymentStatus !== 'confirmed') {
        const previewSplit = calculateSplit70_20_10Cents(media.priceCents);
        const unconfirmedTx: MonetizedTransactionRecord = {
          id: txId,
          idempotencyKey: params.idempotencyKey,
          category,
          buyerUserId: params.buyerUserId,
          creatorOrRecipientId: media.creatorId,
          creatorOrRecipientName: media.creatorName,
          referenceId: media.id,
          description: `[${environment.toUpperCase()}] Tentativa (${paymentStatus}) de desbloqueio de ${media.mediaType}: "${media.caption}"`,
          diamondsCharged: requiredDiamonds,
          paidDiamondsUsed: 0,
          bonusDiamondsUsed: 0,
          currency: 'BRL',
          grossAmountCents: previewSplit.grossAmountCents,
          grossAmountBrl: previewSplit.grossAmountBrl,
          creatorShareCents: previewSplit.creatorShareCents,
          creatorShareBrl: previewSplit.creatorShareBrl,
          platformShare20Cents: previewSplit.platformShare20Cents,
          platformShare20Brl: previewSplit.platformShare20Brl,
          operationalReserve10Cents: previewSplit.operationalReserve10Cents,
          operationalReserve10Brl: previewSplit.operationalReserve10Brl,
          platformCommissionCents: previewSplit.platformCommissionCents,
          platformCommissionBrl: previewSplit.platformCommissionBrl,
          paymentStatus,
          environment,
          createdAt: now,
          updatedAt: now,
          ledgerEntryIds: [],
        };
        existingTxs.unshift(unconfirmedTx);
        this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);
        return {
          success: false,
          isReplay: false,
          transaction: unconfirmedTx,
        };
      }

      // 6. Consome diamantes da carteira segregada (impedindo saldo negativo)
      const consumption = this.consumeUserDiamondsInternal({
        userId: params.buyerUserId,
        diamondsToConsume: requiredDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      // Se foram usados 100% diamantes pagos, preserva media.priceCents exato; se houve bônus promocional, somente diamantes pagos geram base fiduciária (1 pago = R$ 0,10; bônus = R$ 0,00)
      const eligibleGrossCents =
        consumption.bonusDiamondsUsed === 0
          ? media.priceCents
          : consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;

      const split = calculateSplit70_20_10Cents(eligibleGrossCents);

      // 7. Registra no Livro-Razão Contábil (Partidas Dobradas 70% Criador / 20% JOBS / 10% Reserva Operacional)
      const ledgerEntriesInput: Array<any> = [];
      if (split.grossAmountCents > 0) {
        ledgerEntriesInput.push(
          {
            idempotencySuffix: 'gross_inflow',
            operationType: 'CONTENT_UNLOCK',
            debitAccount: `SANDBOX_BUYER_PAYMENT:${params.buyerUserId}`,
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: split.grossAmountBrl,
            amountCents: split.grossAmountCents,
            currency: 'BRL',
            targetCreatorId: media.creatorId,
            referenceId: media.id,
            description: `Recebimento Elegível Desbloqueio ${media.mediaType === 'video' ? 'Vídeo' : 'Foto'} "${media.caption}" (${consumption.paidDiamondsUsed} 💎 pagos)`,
            metadata: {
              monetizationCategory: category,
              mediaId: media.id,
              mediaType: media.mediaType,
              modality: 'INDIVIDUAL_UNLOCK',
              environment,
              diamondsCharged: requiredDiamonds,
              paidDiamondsUsed: consumption.paidDiamondsUsed,
              bonusDiamondsUsed: consumption.bonusDiamondsUsed,
              grossAmountCents: split.grossAmountCents,
            },
          },
          {
            idempotencySuffix: 'creator_70',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: `CREATOR_AVAILABLE_BRL:${media.creatorId}`,
            amount: split.creatorShareBrl,
            amountCents: split.creatorShareCents,
            currency: 'BRL',
            targetCreatorId: media.creatorId,
            referenceId: media.id,
            description: `[70% Criador] Desbloqueio ${media.mediaType === 'video' ? 'Vídeo' : 'Foto'} "${media.caption}"`,
            metadata: {
              monetizationCategory: category,
              mediaId: media.id,
              splitPct: 0.70,
              creatorShareCents: split.creatorShareCents,
              environment,
            },
          },
          {
            idempotencySuffix: 'jobs_20',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_REVENUE_BRL',
            amount: split.platformShare20Brl,
            amountCents: split.platformShare20Cents,
            currency: 'BRL',
            targetCreatorId: media.creatorId,
            referenceId: media.id,
            description: `[20% Receita JOBS] Desbloqueio ${media.mediaType === 'video' ? 'Vídeo' : 'Foto'} "${media.caption}"`,
            metadata: {
              monetizationCategory: category,
              mediaId: media.id,
              splitPct: 0.20,
              platformShare20Cents: split.platformShare20Cents,
              environment,
            },
          },
          {
            idempotencySuffix: 'reserve_10',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_OPERATIONAL_RESERVE_BRL',
            amount: split.operationalReserve10Brl,
            amountCents: split.operationalReserve10Cents,
            currency: 'BRL',
            targetCreatorId: media.creatorId,
            referenceId: media.id,
            description: `[10% Reserva Operacional] Desbloqueio ${media.mediaType === 'video' ? 'Vídeo' : 'Foto'} "${media.caption}"`,
            metadata: {
              monetizationCategory: category,
              mediaId: media.id,
              splitPct: 0.10,
              operationalReserve10Cents: split.operationalReserve10Cents,
              environment,
            },
          }
        );
      }

      const ledgerRes =
        ledgerEntriesInput.length > 0
          ? await financialLedger.postTransactionAtomic({
              transactionId: txId,
              idempotencyKey: params.idempotencyKey,
              description: `[SANDBOX] Desbloqueio Individual (${media.mediaType.toUpperCase()}): "${media.caption}"`,
              actorId: params.buyerUserId,
              entries: ledgerEntriesInput,
            })
          : { entries: [], isReplay: false };

      // 8. Cria concessão de acesso exclusiva para o mediaId adquirido
      const grantId = `egrant_ind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grant: ExclusiveAccessGrantRecord = {
        id: grantId,
        buyerUserId: params.buyerUserId,
        creatorId: media.creatorId,
        grantScope: 'INDIVIDUAL_MEDIA',
        targetId: media.id,
        transactionId: txId,
        idempotencyKey: params.idempotencyKey,
        status: 'active',
        grantedAt: now,
        scopeDescription: `Acesso individual permanente à ${media.mediaType === 'video' ? 'vídeo' : 'foto'} "${media.caption}" (independente do Cofre VIP).`,
        environment,
      };
      const grants = this.getAllAccessGrants();
      grants.unshift(grant);
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      // 9. Atualiza contador e referência da mídia
      const allMedia = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []);
      const mIdx = allMedia.findIndex((m) => m.id === media.id);
      if (mIdx >= 0) {
        allMedia[mIdx].unlockCount += 1;
        allMedia[mIdx].lastTransactionId = txId;
        allMedia[mIdx].updatedAt = now;
        this.writeJson(STORAGE_KEY_EXCLUSIVE_MEDIA, allMedia);
      }

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: params.buyerUserId,
        serviceCategory: category,
        serviceTitle: `Desbloqueio de ${media.mediaType === 'video' ? 'Vídeo Exclusivo' : 'Foto Exclusiva'}`,
        diamondsCharged: requiredDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Acesso individual liberado para "${media.caption}" com URL temporária protegida.`,
        issuedAt: now,
      });

      // 10. Salva transação monetizada reconciliável
      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey: params.idempotencyKey,
        category,
        buyerUserId: params.buyerUserId,
        creatorOrRecipientId: media.creatorId,
        creatorOrRecipientName: media.creatorName,
        referenceId: media.id,
        description: `Desbloqueio Individual de ${media.mediaType === 'video' ? 'Vídeo' : 'Foto'}: "${media.caption}"`,
        diamondsCharged: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        grantId,
        ledgerEntryIds: ledgerRes.entries.map((e) => e.id),
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      // 11. Emite URL temporária assinada
      const delivery = this.issueSignedMediaDeliveryInternal(params.buyerUserId, media.id);

      return {
        success: true,
        isReplay: ledgerRes.isReplay,
        transaction: confirmedTx,
        grant,
        delivery,
        customerReceipt,
      };
    });
  }

  // ==========================================================================
  // 5. COMPRA DE ACESSO AO COFRE VIP (149 💎 / 30 DIAS) — REGRA 70/20/10
  // ==========================================================================

  public async purchaseVipVaultAccess(params: {
    buyerUserId: string;
    creatorId: string;
    idempotencyKey: string;
    clientProvidedPriceDiamonds?: number;
    clientProvidedPriceCents?: number;
    rejectPriceTampering?: boolean;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    simulatePaymentStatus?: 'confirmed' | 'pending' | 'declined' | 'expired' | 'cancelled';
    buyerAgeVerified18Plus?: boolean;
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    transaction: MonetizedTransactionRecord;
    grant?: ExclusiveAccessGrantRecord;
    unlockedVaultItemsCount: number;
    customerReceipt?: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      this.ensureInitialSeeds();

      if (!params.buyerUserId || !params.buyerUserId.trim()) {
        throw new Error('Identificador do comprador é obrigatório.');
      }
      if (!params.creatorId || !params.creatorId.trim()) {
        throw new Error('Identificador do criador do Cofre VIP é obrigatório.');
      }
      if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
        throw new Error('Chave de idempotência obrigatória.');
      }
      if (params.buyerAgeVerified18Plus === false) {
        throw new Error('Acesso negado: comprador não possui verificação de maioridade (+18) para adquirir o Cofre VIP.');
      }

      if (this.isPairBlocked(params.buyerUserId, params.creatorId)) {
        throw new Error('Operação bloqueada: existe bloqueio ou restrição ativa entre os usuários.');
      }

      const vaultConfig = this.getVipVaultConfig(params.creatorId);
      if (!vaultConfig.isActive) {
        throw new Error('O Cofre VIP deste perfil não está ativo para novas compras no momento.');
      }

      const creatorCompliance = this.getCreatorComplianceStatus(params.creatorId);
      if (creatorCompliance.accountSuspended || !vaultConfig.ageVerified18Plus || !vaultConfig.consentDeclared) {
        throw new Error('Cofre VIP indisponível por restrição de conformidade ou moderação.');
      }

      const requiredDiamonds =
        vaultConfig.priceDiamonds ?? Math.max(1, Math.round(vaultConfig.priceCents / PAID_DIAMOND_REFERENCE_CENTS));

      if (
        params.clientProvidedPriceDiamonds !== undefined &&
        params.clientProvidedPriceDiamonds !== requiredDiamonds
      ) {
        if (params.rejectPriceTampering) {
          throw new Error(
            `Manipulação de preço em diamantes detectada no Cofre VIP: enviado ${params.clientProvidedPriceDiamonds} 💎, esperado ${requiredDiamonds} 💎.`
          );
        }
      }

      if (
        params.clientProvidedPriceCents !== undefined &&
        params.clientProvidedPriceCents !== vaultConfig.priceCents
      ) {
        if (params.rejectPriceTampering) {
          throw new Error(
            `Manipulação de preço detectada no Cofre VIP: enviado ${params.clientProvidedPriceCents}, esperado ${vaultConfig.priceCents}.`
          );
        }
      }

      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === params.idempotencyKey);
      const vaultItems = this.listPublicMediaForProfile({
        creatorId: params.creatorId,
        viewerUserId: params.buyerUserId,
        modality: 'VIP_VAULT',
      });

      if (existingByIdemp) {
        if (
          existingByIdemp.buyerUserId !== params.buyerUserId ||
          existingByIdemp.creatorOrRecipientId !== params.creatorId
        ) {
          throw new Error('Conflito de idempotência na compra do Cofre VIP.');
        }
        const grant = this.getAllAccessGrants().find((g) => g.id === existingByIdemp.grantId);
        return {
          success: existingByIdemp.paymentStatus === 'confirmed',
          isReplay: true,
          transaction: existingByIdemp,
          grant,
          unlockedVaultItemsCount: existingByIdemp.paymentStatus === 'confirmed' ? vaultItems.length : 0,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      // Verifica se já possui acesso ativo ao Cofre VIP deste criador
      if (this.hasActiveVipVaultAccess(params.buyerUserId, params.creatorId)) {
        const previousTx = existingTxs.find(
          (t) =>
            t.buyerUserId === params.buyerUserId &&
            t.creatorOrRecipientId === params.creatorId &&
            t.category === 'VIP_VAULT_ACCESS' &&
            t.paymentStatus === 'confirmed'
        );
        if (previousTx) {
          const grant = this.getAllAccessGrants().find((g) => g.id === previousTx.grantId);
          return {
            success: true,
            isReplay: true,
            transaction: previousTx,
            grant,
            unlockedVaultItemsCount: vaultItems.length,
            customerReceipt: previousTx.customerReceipt,
          };
        }
      }

      const paymentStatus: SandboxPaymentStatus = params.simulatePaymentStatus || 'confirmed';
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const txId = `mtx_vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (paymentStatus !== 'confirmed') {
        const previewSplit = calculateSplit70_20_10Cents(vaultConfig.priceCents);
        const unconfirmedTx: MonetizedTransactionRecord = {
          id: txId,
          idempotencyKey: params.idempotencyKey,
          category: 'VIP_VAULT_ACCESS',
          buyerUserId: params.buyerUserId,
          creatorOrRecipientId: params.creatorId,
          creatorOrRecipientName: vaultConfig.creatorName,
          referenceId: `vip_vault:${params.creatorId}`,
          description: `[${environment.toUpperCase()}] Tentativa (${paymentStatus}) de compra do ${vaultConfig.title}`,
          diamondsCharged: requiredDiamonds,
          paidDiamondsUsed: 0,
          bonusDiamondsUsed: 0,
          currency: 'BRL',
          grossAmountCents: previewSplit.grossAmountCents,
          grossAmountBrl: previewSplit.grossAmountBrl,
          creatorShareCents: previewSplit.creatorShareCents,
          creatorShareBrl: previewSplit.creatorShareBrl,
          platformShare20Cents: previewSplit.platformShare20Cents,
          platformShare20Brl: previewSplit.platformShare20Brl,
          operationalReserve10Cents: previewSplit.operationalReserve10Cents,
          operationalReserve10Brl: previewSplit.operationalReserve10Brl,
          platformCommissionCents: previewSplit.platformCommissionCents,
          platformCommissionBrl: previewSplit.platformCommissionBrl,
          paymentStatus,
          environment,
          createdAt: now,
          updatedAt: now,
          ledgerEntryIds: [],
        };
        existingTxs.unshift(unconfirmedTx);
        this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);
        return {
          success: false,
          isReplay: false,
          transaction: unconfirmedTx,
          unlockedVaultItemsCount: 0,
        };
      }

      const consumption = this.consumeUserDiamondsInternal({
        userId: params.buyerUserId,
        diamondsToConsume: requiredDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      const eligibleGrossCents =
        consumption.bonusDiamondsUsed === 0
          ? vaultConfig.priceCents
          : consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;

      const split = calculateSplit70_20_10Cents(eligibleGrossCents);

      const ledgerEntriesInput: Array<any> = [];
      if (split.grossAmountCents > 0) {
        ledgerEntriesInput.push(
          {
            idempotencySuffix: 'vault_gross_inflow',
            operationType: 'SUBSCRIPTION_PURCHASE',
            debitAccount: `SANDBOX_BUYER_PAYMENT:${params.buyerUserId}`,
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: split.grossAmountBrl,
            amountCents: split.grossAmountCents,
            currency: 'BRL',
            targetCreatorId: params.creatorId,
            referenceId: `vip_vault:${params.creatorId}`,
            description: `Recebimento Elegível Acesso ao Cofre VIP de ${vaultConfig.creatorName} (${consumption.paidDiamondsUsed} 💎 pagos)`,
            metadata: {
              monetizationCategory: 'VIP_VAULT_ACCESS',
              creatorId: params.creatorId,
              environment,
              diamondsCharged: requiredDiamonds,
              paidDiamondsUsed: consumption.paidDiamondsUsed,
              bonusDiamondsUsed: consumption.bonusDiamondsUsed,
              grossAmountCents: split.grossAmountCents,
            },
          },
          {
            idempotencySuffix: 'vault_creator_70',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: `CREATOR_AVAILABLE_BRL:${params.creatorId}`,
            amount: split.creatorShareBrl,
            amountCents: split.creatorShareCents,
            currency: 'BRL',
            targetCreatorId: params.creatorId,
            referenceId: `vip_vault:${params.creatorId}`,
            description: `[70% Criador] Acesso ao Cofre VIP de ${vaultConfig.creatorName}`,
            metadata: {
              monetizationCategory: 'VIP_VAULT_ACCESS',
              creatorId: params.creatorId,
              splitPct: 0.70,
              creatorShareCents: split.creatorShareCents,
              environment,
            },
          },
          {
            idempotencySuffix: 'vault_jobs_20',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_REVENUE_BRL',
            amount: split.platformShare20Brl,
            amountCents: split.platformShare20Cents,
            currency: 'BRL',
            targetCreatorId: params.creatorId,
            referenceId: `vip_vault:${params.creatorId}`,
            description: `[20% Receita JOBS] Acesso ao Cofre VIP de ${vaultConfig.creatorName}`,
            metadata: {
              monetizationCategory: 'VIP_VAULT_ACCESS',
              creatorId: params.creatorId,
              splitPct: 0.20,
              platformShare20Cents: split.platformShare20Cents,
              environment,
            },
          },
          {
            idempotencySuffix: 'vault_reserve_10',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_OPERATIONAL_RESERVE_BRL',
            amount: split.operationalReserve10Brl,
            amountCents: split.operationalReserve10Cents,
            currency: 'BRL',
            targetCreatorId: params.creatorId,
            referenceId: `vip_vault:${params.creatorId}`,
            description: `[10% Reserva Operacional] Acesso ao Cofre VIP de ${vaultConfig.creatorName}`,
            metadata: {
              monetizationCategory: 'VIP_VAULT_ACCESS',
              creatorId: params.creatorId,
              splitPct: 0.10,
              operationalReserve10Cents: split.operationalReserve10Cents,
              environment,
            },
          }
        );
      }

      const ledgerRes =
        ledgerEntriesInput.length > 0
          ? await financialLedger.postTransactionAtomic({
              transactionId: txId,
              idempotencyKey: params.idempotencyKey,
              description: `[SANDBOX] Compra de Acesso ao Cofre VIP: ${vaultConfig.creatorName}`,
              actorId: params.buyerUserId,
              entries: ledgerEntriesInput,
            })
          : { entries: [], isReplay: false };

      const durationDays = vaultConfig.durationDays || 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const grantId = `egrant_vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grant: ExclusiveAccessGrantRecord = {
        id: grantId,
        buyerUserId: params.buyerUserId,
        creatorId: params.creatorId,
        grantScope: 'VIP_VAULT',
        targetId: params.creatorId,
        transactionId: txId,
        idempotencyKey: params.idempotencyKey,
        status: 'active',
        grantedAt: now,
        expiresAt,
        durationDays,
        scopeDescription: vaultConfig.scopeDescription,
        environment,
      };
      const grants = this.getAllAccessGrants();
      grants.unshift(grant);
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: params.buyerUserId,
        serviceCategory: 'VIP_VAULT_ACCESS',
        serviceTitle: `${vaultConfig.title}`,
        diamondsCharged: requiredDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Acesso válido por ${durationDays} dias às mídias do Cofre VIP de ${vaultConfig.creatorName} (independente de fotos e vídeos avulsos).`,
        issuedAt: now,
      });

      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey: params.idempotencyKey,
        category: 'VIP_VAULT_ACCESS',
        buyerUserId: params.buyerUserId,
        creatorOrRecipientId: params.creatorId,
        creatorOrRecipientName: vaultConfig.creatorName,
        referenceId: `vip_vault:${params.creatorId}`,
        description: `Compra de Acesso ao Cofre VIP de ${vaultConfig.creatorName}`,
        diamondsCharged: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        grantId,
        ledgerEntryIds: ledgerRes.entries.map((e) => e.id),
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      return {
        success: true,
        isReplay: ledgerRes.isReplay,
        transaction: confirmedTx,
        grant,
        unlockedVaultItemsCount: vaultItems.length,
        customerReceipt,
      };
    });
  }

  // ==========================================================================
  // 6. ENTREGA PRIVADA DE MÍDIA COM URL TEMPORÁRIA ASSINADA (PROTEÇÃO CONTRA IDOR)
  // ==========================================================================

  private issueSignedMediaDeliveryInternal(buyerUserId: string, mediaId: string): SignedTemporaryMediaDelivery {
    const media = this.getMediaByIdInternal(mediaId);
    if (!media) {
      throw new Error('Mídia não encontrada para emissão de URL temporária.');
    }

    const ticket = protectedMediaService.issueMediaTicket(buyerUserId, mediaId);
    const signedTemporaryUrl = `https://cdn-private-sandbox.jobs.app/secure-media/${encodeURIComponent(
      media.id
    )}?uid=${encodeURIComponent(buyerUserId)}&tkt=${encodeURIComponent(ticket.ticketId)}&sig=${encodeURIComponent(
      ticket.signature
    )}&exp=${encodeURIComponent(ticket.expiresAt)}`;

    const delivery: SignedTemporaryMediaDelivery = {
      tokenId: ticket.ticketId,
      mediaId: media.id,
      buyerUserId,
      creatorId: media.creatorId,
      modality: media.modality,
      signedTemporaryUrl,
      signature: ticket.signature,
      issuedAt: ticket.issuedAt,
      expiresAt: ticket.expiresAt,
      ttlSeconds: ticket.ttlSeconds,
      ticket,
    };

    const list = this.readJson<SignedTemporaryMediaDelivery[]>(STORAGE_KEY_SIGNED_DELIVERIES, []);
    list.unshift(delivery);
    this.writeJson(STORAGE_KEY_SIGNED_DELIVERIES, list.slice(0, 300));
    return delivery;
  }

  public requestSignedMediaDelivery(params: {
    requesterUserId: string;
    mediaId: string;
    existingTokenId?: string;
    simulatedCurrentTimestampMs?: number;
  }): {
    allowed: boolean;
    code:
      | 'DELIVERY_AUTHORIZED'
      | 'DENIED_UNAUTHENTICATED'
      | 'DENIED_NOT_FOUND'
      | 'DENIED_NOT_PUBLISHED'
      | 'DENIED_USER_BLOCKED'
      | 'DENIED_NO_ACCESS_GRANT'
      | 'DENIED_IDOR_TOKEN_MISMATCH'
      | 'DENIED_TOKEN_EXPIRED'
      | 'DENIED_TOKEN_REVOKED';
    reason: string;
    delivery?: SignedTemporaryMediaDelivery;
  } {
    this.ensureInitialSeeds();

    if (!params.requesterUserId || !params.requesterUserId.trim()) {
      return {
        allowed: false,
        code: 'DENIED_UNAUTHENTICATED',
        reason: 'Usuário não autenticado.',
      };
    }

    const media = this.getMediaByIdInternal(params.mediaId);
    if (!media) {
      return {
        allowed: false,
        code: 'DENIED_NOT_FOUND',
        reason: 'Mídia exclusiva não encontrada.',
      };
    }

    if (media.state !== 'published' || media.moderationResult !== 'approved') {
      return {
        allowed: false,
        code: 'DENIED_NOT_PUBLISHED',
        reason: `Mídia indisponível para acesso (estado: ${media.state}).`,
      };
    }

    if (this.isPairBlocked(params.requesterUserId, media.creatorId)) {
      return {
        allowed: false,
        code: 'DENIED_USER_BLOCKED',
        reason: 'Acesso negado devido a bloqueio ativo entre os perfis.',
      };
    }

    // Se um token existente foi informado, valida contra IDOR, expiração e revogação
    if (params.existingTokenId) {
      const deliveries = this.readJson<SignedTemporaryMediaDelivery[]>(STORAGE_KEY_SIGNED_DELIVERIES, []);
      const found = deliveries.find((d) => d.tokenId === params.existingTokenId);
      if (!found) {
        return {
          allowed: false,
          code: 'DENIED_TOKEN_REVOKED',
          reason: 'Token temporário inexistente ou revogado.',
        };
      }
      if (found.buyerUserId !== params.requesterUserId || found.mediaId !== params.mediaId) {
        return {
          allowed: false,
          code: 'DENIED_IDOR_TOKEN_MISMATCH',
          reason: 'Tentativa de IDOR bloqueada: o token temporário pertence a outro usuário ou mídia.',
        };
      }
      const nowMs = params.simulatedCurrentTimestampMs ?? Date.now();
      if (nowMs > new Date(found.expiresAt).getTime()) {
        return {
          allowed: false,
          code: 'DENIED_TOKEN_EXPIRED',
          reason: 'URL temporária assinada expirada.',
        };
      }
    }

    // Verifica se o usuário tem a concessão correta (Individual vs Cofre VIP)
    if (!this.hasAuthorizedMediaAccess(params.requesterUserId, media.id)) {
      return {
        allowed: false,
        code: 'DENIED_NO_ACCESS_GRANT',
        reason:
          media.modality === 'VIP_VAULT'
            ? 'Acesso negado: você precisa adquirir o Cofre VIP deste criador para acessar esta mídia.'
            : 'Acesso negado: você precisa desbloquear esta mídia individualmente para acessá-la.',
      };
    }

    const delivery = this.issueSignedMediaDeliveryInternal(params.requesterUserId, media.id);
    return {
      allowed: true,
      code: 'DELIVERY_AUTHORIZED',
      reason: 'Acesso autorizado com URL temporária assinada.',
      delivery,
    };
  }

  // ==========================================================================
  // 7. ENVIO DE INTERESSE IMEDIATO (29 💎) E LIBERAÇÃO DE CONVERSA — REGRA 70/20/10
  // ==========================================================================

  public getImmediateInterestPriceDiamonds(): number {
    return this.getDiamondServiceCatalog().immediateInterestDiamonds;
  }

  public getImmediateInterestPriceCents(): number {
    return this.getImmediateInterestPriceDiamonds() * PAID_DIAMOND_REFERENCE_CENTS;
  }

  public hasActiveImmediateInterestGrant(senderUserId: string, recipientUserId: string): boolean {
    if (!senderUserId || !recipientUserId) return false;
    if (this.isPairBlocked(senderUserId, recipientUserId)) return false;

    const grants = this.getAllAccessGrants();
    return grants.some(
      (g) =>
        g.grantScope === 'IMMEDIATE_INTEREST_CHAT' &&
        g.status === 'active' &&
        ((g.buyerUserId === senderUserId && g.targetId === recipientUserId) ||
          (g.buyerUserId === recipientUserId && g.targetId === senderUserId))
    );
  }

  /**
   * Verifica se dois usuários estão autorizados a trocar mensagens:
   * - Match mútuo válido confirmado (gratuito), OU
   * - Interesse imediato pago confirmado e ativo.
   * E em ambos os casos: nenhum bloqueio ativo entre os usuários.
   */
  public canUsersExchangeMessages(userAId: string, userBId: string): {
    allowed: boolean;
    authorizationSource: 'MUTUAL_MATCH' | 'PAID_IMMEDIATE_INTEREST' | 'NONE';
    reason: string;
  } {
    if (!userAId || !userBId || userAId === userBId) {
      return {
        allowed: false,
        authorizationSource: 'NONE',
        reason: 'Identificadores de usuários inválidos para conversa.',
      };
    }

    if (this.isPairBlocked(userAId, userBId)) {
      return {
        allowed: false,
        authorizationSource: 'NONE',
        reason: 'Conversa bloqueada: existe bloqueio ou restrição de segurança entre os perfis.',
      };
    }

    if (matchAndMessagingService.isMutualMatch(userAId, userBId)) {
      return {
        allowed: true,
        authorizationSource: 'MUTUAL_MATCH',
        reason: 'Conversa liberada gratuitamente por match mútuo válido.',
      };
    }

    if (this.hasActiveImmediateInterestGrant(userAId, userBId)) {
      return {
        allowed: true,
        authorizationSource: 'PAID_IMMEDIATE_INTEREST',
        reason: 'Conversa liberada por envio de interesse imediato pago e confirmado.',
      };
    }

    return {
      allowed: false,
      authorizationSource: 'NONE',
      reason: 'Envio de mensagem não autorizado: é necessário ter um match mútuo ou enviar um interesse imediato confirmado.',
    };
  }

  public async sendPaidImmediateInterest(params: {
    senderUserId: string;
    recipientUserId: string;
    recipientName: string;
    idempotencyKey: string;
    initialMessage?: string;
    priceDiamonds?: number;
    priceCents?: number;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    simulatePaymentStatus?: 'confirmed' | 'pending' | 'declined' | 'expired' | 'cancelled';
    senderAgeVerified18Plus?: boolean;
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    transaction?: MonetizedTransactionRecord;
    interestRecord?: ImmediateInterestRecord;
    grant?: ExclusiveAccessGrantRecord;
    sentMessage?: PersistentMessage;
    customerReceipt?: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      this.ensureInitialSeeds();

      const { senderUserId, recipientUserId, recipientName, idempotencyKey } = params;
      if (!senderUserId || !recipientUserId || senderUserId === recipientUserId) {
        throw new Error('Remetente e destinatário inválidos para envio de interesse imediato.');
      }
      if (!idempotencyKey || !idempotencyKey.trim()) {
        throw new Error('Chave de idempotência obrigatória para envio de interesse imediato.');
      }
      if (params.senderAgeVerified18Plus === false) {
        throw new Error('Acesso negado: verificação de maioridade (+18) obrigatória para enviar interesse imediato.');
      }

      // 1. Verifica bloqueio entre usuários
      if (this.isPairBlocked(senderUserId, recipientUserId)) {
        throw new Error('Não é possível enviar interesse imediato: bloqueio ou restrição ativa entre os usuários.');
      }

      const recipientCompliance = this.getCreatorComplianceStatus(recipientUserId);
      if (recipientCompliance.accountSuspended) {
        throw new Error('Perfil destinatário indisponível ou suspenso.');
      }

      // 2. Verifica idempotência antes de checar match/concessão para retornar replay determinístico
      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === idempotencyKey);
      if (existingByIdemp) {
        if (
          existingByIdemp.buyerUserId !== senderUserId ||
          existingByIdemp.creatorOrRecipientId !== recipientUserId
        ) {
          throw new Error('Conflito de idempotência no envio de interesse imediato.');
        }
        const interests = this.readJson<ImmediateInterestRecord[]>(STORAGE_KEY_IMMEDIATE_INTERESTS, []);
        const interestRecord = interests.find((i) => i.transactionId === existingByIdemp.id);
        const grant = this.getAllAccessGrants().find((g) => g.id === existingByIdemp.grantId);
        return {
          success: existingByIdemp.paymentStatus === 'confirmed',
          isReplay: true,
          transaction: existingByIdemp,
          interestRecord,
          grant,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      // 3. Regra obrigatória: NÃO permitir cobrança se a conversa já estiver liberada por match válido
      if (matchAndMessagingService.isMutualMatch(senderUserId, recipientUserId)) {
        throw new Error(
          'Cobrança bloqueada: você e este perfil já possuem um match mútuo ativo. A conversa já está liberada gratuitamente.'
        );
      }

      // 4. Se já enviou interesse imediato ativo para o mesmo destinatário, impede cobrança duplicada
      if (this.hasActiveImmediateInterestGrant(senderUserId, recipientUserId)) {
        const previousTx = existingTxs.find(
          (t) =>
            t.buyerUserId === senderUserId &&
            t.creatorOrRecipientId === recipientUserId &&
            t.category === 'IMMEDIATE_INTEREST' &&
            t.paymentStatus === 'confirmed'
        );
        if (previousTx) {
          const interests = this.readJson<ImmediateInterestRecord[]>(STORAGE_KEY_IMMEDIATE_INTERESTS, []);
          const interestRecord = interests.find((i) => i.transactionId === previousTx.id);
          const grant = this.getAllAccessGrants().find((g) => g.id === previousTx.grantId);
          return {
            success: true,
            isReplay: true,
            transaction: previousTx,
            interestRecord,
            grant,
            customerReceipt: previousTx.customerReceipt,
          };
        }
      }

      // 5. Rate limit anti-spam (máximo de envios por janela)
      const allInterests = this.readJson<ImmediateInterestRecord[]>(STORAGE_KEY_IMMEDIATE_INTERESTS, []);
      const nowMs = Date.now();
      const recentFromSender = allInterests.filter(
        (i) =>
          i.senderUserId === senderUserId &&
          nowMs - new Date(i.createdAt).getTime() < IMMEDIATE_INTEREST_WINDOW_MS
      );
      if (recentFromSender.length >= MAX_IMMEDIATE_INTEREST_PER_WINDOW) {
        throw new Error('Limite anti-abuso atingido: aguarde alguns minutos antes de enviar novos interesses imediatos.');
      }

      const catalog = this.getDiamondServiceCatalog();
      let requiredDiamonds = catalog.immediateInterestDiamonds; // 29 💎
      let explicitPriceCents = requiredDiamonds * PAID_DIAMOND_REFERENCE_CENTS;

      if (params.priceDiamonds !== undefined) {
        requiredDiamonds = params.priceDiamonds;
        explicitPriceCents =
          params.priceCents !== undefined
            ? params.priceCents
            : requiredDiamonds * PAID_DIAMOND_REFERENCE_CENTS;
      } else if (params.priceCents !== undefined) {
        explicitPriceCents = params.priceCents;
        requiredDiamonds = Math.max(1, Math.round(explicitPriceCents / PAID_DIAMOND_REFERENCE_CENTS));
      }

      const paymentStatus: SandboxPaymentStatus = params.simulatePaymentStatus || 'confirmed';
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const txId = `mtx_int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (paymentStatus !== 'confirmed') {
        const previewSplit = calculateSplit70_20_10Cents(explicitPriceCents);
        const unconfirmedTx: MonetizedTransactionRecord = {
          id: txId,
          idempotencyKey,
          category: 'IMMEDIATE_INTEREST',
          buyerUserId: senderUserId,
          creatorOrRecipientId: recipientUserId,
          creatorOrRecipientName: recipientName,
          referenceId: `immediate_interest:${recipientUserId}`,
          description: `[${environment.toUpperCase()}] Tentativa (${paymentStatus}) de Interesse Imediato para ${recipientName}`,
          diamondsCharged: requiredDiamonds,
          paidDiamondsUsed: 0,
          bonusDiamondsUsed: 0,
          currency: 'BRL',
          grossAmountCents: previewSplit.grossAmountCents,
          grossAmountBrl: previewSplit.grossAmountBrl,
          creatorShareCents: previewSplit.creatorShareCents,
          creatorShareBrl: previewSplit.creatorShareBrl,
          platformShare20Cents: previewSplit.platformShare20Cents,
          platformShare20Brl: previewSplit.platformShare20Brl,
          operationalReserve10Cents: previewSplit.operationalReserve10Cents,
          operationalReserve10Brl: previewSplit.operationalReserve10Brl,
          platformCommissionCents: previewSplit.platformCommissionCents,
          platformCommissionBrl: previewSplit.platformCommissionBrl,
          paymentStatus,
          environment,
          createdAt: now,
          updatedAt: now,
          ledgerEntryIds: [],
        };
        existingTxs.unshift(unconfirmedTx);
        this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);
        return {
          success: false,
          isReplay: false,
          transaction: unconfirmedTx,
        };
      }

      const consumption = this.consumeUserDiamondsInternal({
        userId: senderUserId,
        diamondsToConsume: requiredDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      const eligibleGrossCents =
        consumption.bonusDiamondsUsed === 0
          ? explicitPriceCents
          : consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;

      const split = calculateSplit70_20_10Cents(eligibleGrossCents);

      // 6. Registra no livro-razão com divisão 70% destinatário / 20% JOBS / 10% Reserva Operacional
      const ledgerEntriesInput: Array<any> = [];
      if (split.grossAmountCents > 0) {
        ledgerEntriesInput.push(
          {
            idempotencySuffix: 'interest_gross_inflow',
            operationType: 'TIP_GIFT',
            debitAccount: `SANDBOX_BUYER_PAYMENT:${senderUserId}`,
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: split.grossAmountBrl,
            amountCents: split.grossAmountCents,
            currency: 'BRL',
            targetCreatorId: recipientUserId,
            referenceId: `immediate_interest:${recipientUserId}`,
            description: `Recebimento Elegível Interesse Imediato para ${recipientName} (${consumption.paidDiamondsUsed} 💎 pagos)`,
            metadata: {
              monetizationCategory: 'IMMEDIATE_INTEREST',
              senderUserId,
              recipientUserId,
              environment,
              diamondsCharged: requiredDiamonds,
              paidDiamondsUsed: consumption.paidDiamondsUsed,
              bonusDiamondsUsed: consumption.bonusDiamondsUsed,
              grossAmountCents: split.grossAmountCents,
            },
          },
          {
            idempotencySuffix: 'interest_recipient_70',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: `CREATOR_AVAILABLE_BRL:${recipientUserId}`,
            amount: split.creatorShareBrl,
            amountCents: split.creatorShareCents,
            currency: 'BRL',
            targetCreatorId: recipientUserId,
            referenceId: `immediate_interest:${recipientUserId}`,
            description: `[70% Destinatário] Interesse Imediato recebido de ${senderUserId}`,
            metadata: {
              monetizationCategory: 'IMMEDIATE_INTEREST',
              senderUserId,
              recipientUserId,
              splitPct: 0.70,
              creatorShareCents: split.creatorShareCents,
              environment,
            },
          },
          {
            idempotencySuffix: 'interest_jobs_20',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_REVENUE_BRL',
            amount: split.platformShare20Brl,
            amountCents: split.platformShare20Cents,
            currency: 'BRL',
            targetCreatorId: recipientUserId,
            referenceId: `immediate_interest:${recipientUserId}`,
            description: `[20% Receita JOBS] Interesse Imediato para ${recipientName}`,
            metadata: {
              monetizationCategory: 'IMMEDIATE_INTEREST',
              senderUserId,
              recipientUserId,
              splitPct: 0.20,
              platformShare20Cents: split.platformShare20Cents,
              environment,
            },
          },
          {
            idempotencySuffix: 'interest_reserve_10',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_OPERATIONAL_RESERVE_BRL',
            amount: split.operationalReserve10Brl,
            amountCents: split.operationalReserve10Cents,
            currency: 'BRL',
            targetCreatorId: recipientUserId,
            referenceId: `immediate_interest:${recipientUserId}`,
            description: `[10% Reserva Operacional] Interesse Imediato para ${recipientName}`,
            metadata: {
              monetizationCategory: 'IMMEDIATE_INTEREST',
              senderUserId,
              recipientUserId,
              splitPct: 0.10,
              operationalReserve10Cents: split.operationalReserve10Cents,
              environment,
            },
          }
        );
      }

      const ledgerRes =
        ledgerEntriesInput.length > 0
          ? await financialLedger.postTransactionAtomic({
              transactionId: txId,
              idempotencyKey,
              description: `[SANDBOX] Interesse Imediato enviado para ${recipientName}`,
              actorId: senderUserId,
              entries: ledgerEntriesInput,
            })
          : { entries: [], isReplay: false };

      // 7. Cria concessão que libera o envio de mensagem com a pessoa destinatária
      const grantId = `egrant_int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grant: ExclusiveAccessGrantRecord = {
        id: grantId,
        buyerUserId: senderUserId,
        creatorId: recipientUserId,
        grantScope: 'IMMEDIATE_INTEREST_CHAT',
        targetId: recipientUserId,
        transactionId: txId,
        idempotencyKey,
        status: 'active',
        grantedAt: now,
        scopeDescription: `Liberação de conversa direta com ${recipientName} via Interesse Imediato.`,
        environment,
      };
      const grants = this.getAllAccessGrants();
      grants.unshift(grant);
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      // 8. Registra o super_interest no matchAndMessagingService e envia a mensagem inicial se fornecida
      matchAndMessagingService.recordLike(senderUserId, recipientUserId, 'super_interest', params.initialMessage);
      let sentMessage: PersistentMessage | undefined;
      if (params.initialMessage && params.initialMessage.trim()) {
        sentMessage = matchAndMessagingService.sendMessage(
          senderUserId,
          recipientUserId,
          params.initialMessage.trim()
        );
      }

      const interestRecord: ImmediateInterestRecord = {
        id: `iint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotencyKey,
        senderUserId,
        recipientUserId,
        recipientName,
        initialMessage: params.initialMessage?.trim(),
        priceDiamonds: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        priceCents: split.grossAmountCents,
        priceBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        platformShare20Cents: split.platformShare20Cents,
        operationalReserve10Cents: split.operationalReserve10Cents,
        platformCommissionCents: split.platformCommissionCents,
        status: 'confirmed',
        transactionId: txId,
        grantId,
        messagingUnlocked: true,
        createdAt: now,
        environment,
      };
      allInterests.unshift(interestRecord);
      this.writeJson(STORAGE_KEY_IMMEDIATE_INTERESTS, allInterests);

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: senderUserId,
        serviceCategory: 'IMMEDIATE_INTEREST',
        serviceTitle: `Interesse Imediato para ${recipientName}`,
        diamondsCharged: requiredDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Conversa direta liberada com ${recipientName}.`,
        issuedAt: now,
      });

      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey,
        category: 'IMMEDIATE_INTEREST',
        buyerUserId: senderUserId,
        creatorOrRecipientId: recipientUserId,
        creatorOrRecipientName: recipientName,
        referenceId: `immediate_interest:${recipientUserId}`,
        description: `Envio de Interesse Imediato para ${recipientName}`,
        diamondsCharged: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        grantId,
        ledgerEntryIds: ledgerRes.entries.map((e) => e.id),
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      return {
        success: true,
        isReplay: ledgerRes.isReplay,
        transaction: confirmedTx,
        interestRecord,
        grant,
        sentMessage,
        customerReceipt,
      };
    });
  }

  // ==========================================================================
  // 7B. PRESENTES VIRTUAIS (29 A 199 💎), IMPULSIONAR PERFIL (49 💎) E JOBS PREMIUM (199 💎)
  // ==========================================================================

  public async sendVirtualGiftInDiamonds(params: {
    senderUserId: string;
    recipientUserId: string;
    recipientName: string;
    giftId: string;
    idempotencyKey: string;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    gift: DiamondCatalogGiftItem;
    transaction: MonetizedTransactionRecord;
    customerReceipt: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      const catalog = this.getDiamondServiceCatalog();
      const gift = catalog.virtualGifts.find((g) => g.id === params.giftId);
      if (!gift) {
        throw new Error(`Presente virtual "${params.giftId}" não encontrado no catálogo oficial.`);
      }
      if (
        gift.priceDiamonds < catalog.virtualGiftsRangeMinDiamonds ||
        gift.priceDiamonds > catalog.virtualGiftsRangeMaxDiamonds
      ) {
        throw new Error(
          `Preço do presente (${gift.priceDiamonds} 💎) fora da faixa configurada (${catalog.virtualGiftsRangeMinDiamonds} a ${catalog.virtualGiftsRangeMaxDiamonds} 💎).`
        );
      }
      if (this.isPairBlocked(params.senderUserId, params.recipientUserId)) {
        throw new Error('Não é possível enviar presente virtual: bloqueio ativo entre os perfis.');
      }

      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === params.idempotencyKey);
      if (existingByIdemp && existingByIdemp.customerReceipt) {
        return {
          success: true,
          isReplay: true,
          gift,
          transaction: existingByIdemp,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      const consumption = this.consumeUserDiamondsInternal({
        userId: params.senderUserId,
        diamondsToConsume: gift.priceDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      const eligibleGrossCents = consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;
      const split = calculateSplit70_20_10Cents(eligibleGrossCents);
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const txId = `mtx_gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const ledgerEntriesInput: Array<any> = [];
      if (split.grossAmountCents > 0) {
        ledgerEntriesInput.push(
          {
            idempotencySuffix: 'gift_gross_inflow',
            operationType: 'TIP_GIFT',
            debitAccount: `SANDBOX_BUYER_PAYMENT:${params.senderUserId}`,
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: split.grossAmountBrl,
            amountCents: split.grossAmountCents,
            currency: 'BRL',
            targetCreatorId: params.recipientUserId,
            referenceId: `gift:${gift.id}`,
            description: `Presente Virtual "${gift.name}" para ${params.recipientName} (${consumption.paidDiamondsUsed} 💎 pagos)`,
            metadata: {
              monetizationCategory: 'VIRTUAL_GIFT',
              giftId: gift.id,
              diamondsCharged: gift.priceDiamonds,
              paidDiamondsUsed: consumption.paidDiamondsUsed,
              bonusDiamondsUsed: consumption.bonusDiamondsUsed,
            },
          },
          {
            idempotencySuffix: 'gift_creator_70',
            operationType: 'CREATOR_REVENUE_SHARE',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: `CREATOR_AVAILABLE_BRL:${params.recipientUserId}`,
            amount: split.creatorShareBrl,
            amountCents: split.creatorShareCents,
            currency: 'BRL',
            targetCreatorId: params.recipientUserId,
            referenceId: `gift:${gift.id}`,
            description: `[70% Criador] Presente Virtual "${gift.name}"`,
            metadata: { splitPct: 0.70, creatorShareCents: split.creatorShareCents },
          },
          {
            idempotencySuffix: 'gift_jobs_20',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_REVENUE_BRL',
            amount: split.platformShare20Brl,
            amountCents: split.platformShare20Cents,
            currency: 'BRL',
            targetCreatorId: params.recipientUserId,
            referenceId: `gift:${gift.id}`,
            description: `[20% Receita JOBS] Presente Virtual "${gift.name}"`,
            metadata: { splitPct: 0.20, platformShare20Cents: split.platformShare20Cents },
          },
          {
            idempotencySuffix: 'gift_reserve_10',
            operationType: 'PLATFORM_COMMISSION',
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: 'PLATFORM_OPERATIONAL_RESERVE_BRL',
            amount: split.operationalReserve10Brl,
            amountCents: split.operationalReserve10Cents,
            currency: 'BRL',
            targetCreatorId: params.recipientUserId,
            referenceId: `gift:${gift.id}`,
            description: `[10% Reserva Operacional] Presente Virtual "${gift.name}"`,
            metadata: { splitPct: 0.10, operationalReserve10Cents: split.operationalReserve10Cents },
          }
        );
      }

      const ledgerRes =
        ledgerEntriesInput.length > 0
          ? await financialLedger.postTransactionAtomic({
              transactionId: txId,
              idempotencyKey: params.idempotencyKey,
              description: `[SANDBOX] Presente Virtual ${gift.name} enviado para ${params.recipientName}`,
              actorId: params.senderUserId,
              entries: ledgerEntriesInput,
            })
          : { entries: [], isReplay: false };

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: params.senderUserId,
        serviceCategory: 'VIRTUAL_GIFT',
        serviceTitle: `Presente Virtual: ${gift.icon} ${gift.name}`,
        diamondsCharged: gift.priceDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Enviado instantaneamente para ${params.recipientName}.`,
        issuedAt: now,
      });

      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey: params.idempotencyKey,
        category: 'VIRTUAL_GIFT',
        buyerUserId: params.senderUserId,
        creatorOrRecipientId: params.recipientUserId,
        creatorOrRecipientName: params.recipientName,
        referenceId: `gift:${gift.id}`,
        description: `Presente Virtual "${gift.name}" para ${params.recipientName}`,
        diamondsCharged: gift.priceDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        ledgerEntryIds: ledgerRes.entries.map((e) => e.id),
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      return {
        success: true,
        isReplay: ledgerRes.isReplay,
        gift,
        transaction: confirmedTx,
        customerReceipt,
      };
    });
  }

  public async purchaseProfileBoost(params: {
    buyerUserId: string;
    idempotencyKey: string;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    grant: ExclusiveAccessGrantRecord;
    transaction: MonetizedTransactionRecord;
    customerReceipt: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      const catalog = this.getDiamondServiceCatalog();
      const requiredDiamonds = catalog.profileBoostDiamonds; // 49 💎
      const durationHours = catalog.profileBoostDurationHours; // 24 horas

      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === params.idempotencyKey);
      if (existingByIdemp && existingByIdemp.customerReceipt) {
        const grant = this.getAllAccessGrants().find((g) => g.id === existingByIdemp.grantId)!;
        return {
          success: true,
          isReplay: true,
          grant,
          transaction: existingByIdemp,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      const consumption = this.consumeUserDiamondsInternal({
        userId: params.buyerUserId,
        diamondsToConsume: requiredDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      const eligibleGrossCents = consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;
      const split = calculateSplit70_20_10Cents(eligibleGrossCents);
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      const txId = `mtx_boost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grantId = `egrant_boost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const grant: ExclusiveAccessGrantRecord = {
        id: grantId,
        buyerUserId: params.buyerUserId,
        creatorId: 'jobs_platform',
        grantScope: 'PROFILE_BOOST',
        targetId: params.buyerUserId,
        transactionId: txId,
        idempotencyKey: params.idempotencyKey,
        status: 'active',
        grantedAt: now,
        expiresAt,
        durationHours,
        scopeDescription: `Impulsionar Perfil ativo por ${durationHours} horas na Descoberta JOBS.`,
        environment,
      };
      const grants = this.getAllAccessGrants();
      grants.unshift(grant);
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: params.buyerUserId,
        serviceCategory: 'PROFILE_BOOST',
        serviceTitle: 'Impulsionar Perfil JOBS',
        diamondsCharged: requiredDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Destaque de visibilidade ativo por ${durationHours} horas.`,
        issuedAt: now,
      });

      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey: params.idempotencyKey,
        category: 'PROFILE_BOOST',
        buyerUserId: params.buyerUserId,
        creatorOrRecipientId: 'jobs_platform',
        creatorOrRecipientName: 'JOBS Plataforma',
        referenceId: `profile_boost:${params.buyerUserId}`,
        description: `Impulsionar Perfil por ${durationHours} horas`,
        diamondsCharged: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        grantId,
        ledgerEntryIds: [],
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      return {
        success: true,
        isReplay: false,
        grant,
        transaction: confirmedTx,
        customerReceipt,
      };
    });
  }

  public async purchaseJobsPremiumSubscription(params: {
    buyerUserId: string;
    idempotencyKey: string;
    consumptionOrder?: 'paid_first' | 'bonus_first';
    environment?: ExecutionEnvironment;
  }): Promise<{
    success: boolean;
    isReplay: boolean;
    grant: ExclusiveAccessGrantRecord;
    transaction: MonetizedTransactionRecord;
    customerReceipt: CustomerDiamondReceipt;
  }> {
    return this.enqueue(async () => {
      const catalog = this.getDiamondServiceCatalog();
      const requiredDiamonds = catalog.jobsPremiumDiamonds; // 199 💎
      const durationDays = catalog.jobsPremiumDurationDays; // 30 dias

      const existingTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const existingByIdemp = existingTxs.find((t) => t.idempotencyKey === params.idempotencyKey);
      if (existingByIdemp && existingByIdemp.customerReceipt) {
        const grant = this.getAllAccessGrants().find((g) => g.id === existingByIdemp.grantId)!;
        return {
          success: true,
          isReplay: true,
          grant,
          transaction: existingByIdemp,
          customerReceipt: existingByIdemp.customerReceipt,
        };
      }

      const consumption = this.consumeUserDiamondsInternal({
        userId: params.buyerUserId,
        diamondsToConsume: requiredDiamonds,
        consumptionOrder: params.consumptionOrder,
      });

      const eligibleGrossCents = consumption.paidDiamondsUsed * PAID_DIAMOND_REFERENCE_CENTS;
      const split = calculateSplit70_20_10Cents(eligibleGrossCents);
      const environment: ExecutionEnvironment = params.environment || 'sandbox';
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const txId = `mtx_prem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grantId = `egrant_prem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const grant: ExclusiveAccessGrantRecord = {
        id: grantId,
        buyerUserId: params.buyerUserId,
        creatorId: 'jobs_platform',
        grantScope: 'JOBS_PREMIUM',
        targetId: params.buyerUserId,
        transactionId: txId,
        idempotencyKey: params.idempotencyKey,
        status: 'active',
        grantedAt: now,
        expiresAt,
        durationDays,
        scopeDescription: `Assinatura JOBS Premium válida por ${durationDays} dias.`,
        environment,
      };
      const grants = this.getAllAccessGrants();
      grants.unshift(grant);
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      const customerReceipt = this.buildCustomerDiamondReceipt({
        transactionId: txId,
        buyerUserId: params.buyerUserId,
        serviceCategory: 'JOBS_PREMIUM_SUBSCRIPTION',
        serviceTitle: 'Assinatura JOBS Premium',
        diamondsCharged: requiredDiamonds,
        remainingDiamondsBalance: consumption.walletAfter.totalAvailableDiamonds,
        scopeAndDurationText: `Plano JOBS Premium ativo por ${durationDays} dias.`,
        issuedAt: now,
      });

      const confirmedTx: MonetizedTransactionRecord = {
        id: txId,
        idempotencyKey: params.idempotencyKey,
        category: 'JOBS_PREMIUM_SUBSCRIPTION',
        buyerUserId: params.buyerUserId,
        creatorOrRecipientId: 'jobs_platform',
        creatorOrRecipientName: 'JOBS Plataforma',
        referenceId: `jobs_premium:${params.buyerUserId}`,
        description: `Assinatura JOBS Premium por ${durationDays} dias`,
        diamondsCharged: requiredDiamonds,
        paidDiamondsUsed: consumption.paidDiamondsUsed,
        bonusDiamondsUsed: consumption.bonusDiamondsUsed,
        currency: 'BRL',
        grossAmountCents: split.grossAmountCents,
        grossAmountBrl: split.grossAmountBrl,
        creatorShareCents: split.creatorShareCents,
        creatorShareBrl: split.creatorShareBrl,
        platformShare20Cents: split.platformShare20Cents,
        platformShare20Brl: split.platformShare20Brl,
        operationalReserve10Cents: split.operationalReserve10Cents,
        operationalReserve10Brl: split.operationalReserve10Brl,
        platformCommissionCents: split.platformCommissionCents,
        platformCommissionBrl: split.platformCommissionBrl,
        paymentStatus: 'confirmed',
        environment,
        createdAt: now,
        updatedAt: now,
        confirmedAt: now,
        grantId,
        ledgerEntryIds: [],
        customerReceipt,
      };
      existingTxs.unshift(confirmedTx);
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, existingTxs);

      return {
        success: true,
        isReplay: false,
        grant,
        transaction: confirmedTx,
        customerReceipt,
      };
    });
  }

  /**
   * Envio seguro de mensagem que valida se há Match Mútuo ou Interesse Imediato Pago confirmado.
   */
  public sendAuthorizedMessage(params: {
    senderUserId: string;
    recipientUserId: string;
    text: string;
    mediaUrl?: string;
  }): {
    sent: boolean;
    authorizationSource: 'MUTUAL_MATCH' | 'PAID_IMMEDIATE_INTEREST' | 'NONE';
    message?: PersistentMessage;
    errorReason?: string;
  } {
    const authCheck = this.canUsersExchangeMessages(params.senderUserId, params.recipientUserId);
    if (!authCheck.allowed) {
      return {
        sent: false,
        authorizationSource: 'NONE',
        errorReason: authCheck.reason,
      };
    }

    const msg = matchAndMessagingService.sendMessage(
      params.senderUserId,
      params.recipientUserId,
      params.text,
      params.mediaUrl
    );
    return {
      sent: true,
      authorizationSource: authCheck.authorizationSource,
      message: msg,
    };
  }

  // ==========================================================================
  // 8. ESTORNO (REFUND) E CHARGEBACK COM REVERSÃO PROPORCIONAL 70/20/10 E REVOGAÇÃO
  // ==========================================================================

  public async processRefundOrChargeback(params: {
    transactionId: string;
    type: 'REFUND' | 'CHARGEBACK';
    reason: string;
    actorId?: string;
    idempotencyKey?: string;
  }): Promise<{
    refunded: boolean;
    isReplay: boolean;
    transaction: MonetizedTransactionRecord;
    reversalEntries: LedgerEntry[];
    grantRevoked: boolean;
  }> {
    return this.enqueue(async () => {
      const txs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);
      const idx = txs.findIndex((t) => t.id === params.transactionId);
      if (idx === -1) {
        throw new Error(`Transação ${params.transactionId} não encontrada para estorno/chargeback.`);
      }

      const tx = txs[idx];
      if (tx.paymentStatus === 'refunded' || tx.paymentStatus === 'chargeback') {
        return {
          refunded: true,
          isReplay: true,
          transaction: tx,
          reversalEntries: [],
          grantRevoked: true,
        };
      }

      if (tx.paymentStatus !== 'confirmed') {
        throw new Error(`Apenas transações confirmadas podem sofrer ${params.type}. Estado atual: ${tx.paymentStatus}`);
      }

      const refundIdempKey = params.idempotencyKey || `idemp_${params.type.toLowerCase()}_${tx.id}`;
      const now = new Date().toISOString();

      // Reversão proporcional exata: 70% debitado da conta do criador, 20% da receita JOBS, 10% da reserva operacional
      const reversalEntriesInput: Array<any> = [];
      if (tx.grossAmountCents > 0) {
        reversalEntriesInput.push(
          {
            idempotencySuffix: 'rev_creator_70',
            operationType: params.type,
            debitAccount: `CREATOR_AVAILABLE_BRL:${tx.creatorOrRecipientId}`,
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: tx.creatorShareBrl,
            amountCents: tx.creatorShareCents,
            currency: 'BRL',
            targetCreatorId: tx.creatorOrRecipientId,
            referenceId: tx.referenceId,
            description: `[Reversão 70% Criador - ${params.type}] Ref: ${tx.id} (${params.reason})`,
            metadata: {
              originalTransactionId: tx.id,
              monetizationCategory: tx.category,
              reversalSharePct: 0.70,
              creatorShareCents: tx.creatorShareCents,
              environment: tx.environment,
            },
          },
          {
            idempotencySuffix: 'rev_jobs_20',
            operationType: params.type,
            debitAccount: 'PLATFORM_REVENUE_BRL',
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: tx.platformShare20Brl ?? Number(((tx.platformShare20Cents ?? 0) / 100).toFixed(2)),
            amountCents: tx.platformShare20Cents ?? Math.round(tx.grossAmountCents * 0.20),
            currency: 'BRL',
            targetCreatorId: tx.creatorOrRecipientId,
            referenceId: tx.referenceId,
            description: `[Reversão 20% Receita JOBS - ${params.type}] Ref: ${tx.id} (${params.reason})`,
            metadata: {
              originalTransactionId: tx.id,
              monetizationCategory: tx.category,
              reversalSharePct: 0.20,
              platformShare20Cents: tx.platformShare20Cents,
              environment: tx.environment,
            },
          },
          {
            idempotencySuffix: 'rev_reserve_10',
            operationType: params.type,
            debitAccount: 'PLATFORM_OPERATIONAL_RESERVE_BRL',
            creditAccount: 'ESCROW_PAYMENT_GATEWAY',
            amount: tx.operationalReserve10Brl ?? Number(((tx.operationalReserve10Cents ?? 0) / 100).toFixed(2)),
            amountCents:
              tx.operationalReserve10Cents ??
              tx.platformCommissionCents - (tx.platformShare20Cents ?? Math.round(tx.grossAmountCents * 0.20)),
            currency: 'BRL',
            targetCreatorId: tx.creatorOrRecipientId,
            referenceId: tx.referenceId,
            description: `[Reversão 10% Reserva Operacional - ${params.type}] Ref: ${tx.id} (${params.reason})`,
            metadata: {
              originalTransactionId: tx.id,
              monetizationCategory: tx.category,
              reversalSharePct: 0.10,
              operationalReserve10Cents: tx.operationalReserve10Cents,
              environment: tx.environment,
            },
          },
          {
            idempotencySuffix: 'rev_buyer_outflow',
            operationType: params.type,
            debitAccount: 'ESCROW_PAYMENT_GATEWAY',
            creditAccount: `SANDBOX_BUYER_PAYMENT:${tx.buyerUserId}`,
            amount: tx.grossAmountBrl,
            amountCents: tx.grossAmountCents,
            currency: 'BRL',
            targetCreatorId: tx.creatorOrRecipientId,
            referenceId: tx.referenceId,
            description: `[Devolução 100% Comprador - ${params.type}] Ref: ${tx.id}`,
            metadata: {
              originalTransactionId: tx.id,
              monetizationCategory: tx.category,
              grossAmountCents: tx.grossAmountCents,
              environment: tx.environment,
            },
          }
        );
      }

      const ledgerRes =
        reversalEntriesInput.length > 0
          ? await financialLedger.postTransactionAtomic({
              idempotencyKey: refundIdempKey,
              description: `[${params.type}] Estorno proporcional 70/20/10 da transação ${tx.id}: ${params.reason}`,
              actorId: params.actorId || 'admin_reconciliation',
              entries: reversalEntriesInput,
            })
          : { entries: [], isReplay: false };

      // Restaura diamantes na carteira do comprador em caso de REFUND
      if (params.type === 'REFUND' && (tx.paidDiamondsUsed > 0 || tx.bonusDiamondsUsed > 0)) {
        this.refundUserDiamondsInternal({
          userId: tx.buyerUserId,
          paidDiamondsToRestore: tx.paidDiamondsUsed || 0,
          bonusDiamondsToRestore: tx.bonusDiamondsUsed || 0,
        });
      }

      // Revoga a concessão de acesso associada
      let grantRevoked = false;
      const grants = this.getAllAccessGrants();
      for (const g of grants) {
        if (g.transactionId === tx.id || g.id === tx.grantId) {
          g.status = 'revoked';
          g.revokedAt = now;
          g.revocationReason = `${params.type}: ${params.reason}`;
          grantRevoked = true;
        }
      }
      this.writeJson(STORAGE_KEY_EXCLUSIVE_GRANTS, grants);

      // Se era interesse imediato, marca também como revogado
      if (tx.category === 'IMMEDIATE_INTEREST') {
        const interests = this.readJson<ImmediateInterestRecord[]>(STORAGE_KEY_IMMEDIATE_INTERESTS, []);
        for (const i of interests) {
          if (i.transactionId === tx.id) {
            i.status = 'revoked';
            i.messagingUnlocked = false;
          }
        }
        this.writeJson(STORAGE_KEY_IMMEDIATE_INTERESTS, interests);
      }

      // Revoga tokens temporários emitidos para o comprador naquele conteúdo/cofre
      const deliveries = this.readJson<SignedTemporaryMediaDelivery[]>(STORAGE_KEY_SIGNED_DELIVERIES, []);
      for (const d of deliveries) {
        if (
          d.buyerUserId === tx.buyerUserId &&
          (d.mediaId === tx.referenceId || d.creatorId === tx.creatorOrRecipientId)
        ) {
          protectedMediaService.revokeToken(d.tokenId, `${params.type}: ${params.reason}`);
        }
      }

      tx.paymentStatus = params.type === 'CHARGEBACK' ? 'chargeback' : 'refunded';
      tx.refundType = params.type;
      tx.refundReason = params.reason;
      tx.refundedAt = now;
      tx.updatedAt = now;
      tx.reversalLedgerEntryIds = ledgerRes.entries.map((e) => e.id);
      txs[idx] = tx;
      this.writeJson(STORAGE_KEY_MONETIZED_TXS, txs);

      return {
        refunded: true,
        isReplay: ledgerRes.isReplay,
        transaction: tx,
        reversalEntries: ledgerRes.entries,
        grantRevoked,
      };
    });
  }

  // ==========================================================================
  // 9. RELATÓRIOS E RECONCILIAÇÃO CONTÁBIL 70/20/10 (CRIADOR & PAINEL ADMIN)
  // ==========================================================================

  public getMonetizedTransactions(filter?: {
    creatorOrRecipientId?: string;
    buyerUserId?: string;
    category?: MonetizedRevenueCategory;
    environment?: ExecutionEnvironment;
    page?: number;
    pageSize?: number;
  }): {
    items: MonetizedTransactionRecord[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = Math.max(1, filter?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, filter?.pageSize ?? 25));
    const all = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []);

    const filtered = all.filter((tx) => {
      if (filter?.creatorOrRecipientId && tx.creatorOrRecipientId !== filter.creatorOrRecipientId) return false;
      if (filter?.buyerUserId && tx.buyerUserId !== filter.buyerUserId) return false;
      if (filter?.category && tx.category !== filter.category) return false;
      if (filter?.environment && tx.environment !== filter.environment) return false;
      return true;
    });

    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  public getCreatorDashboardSummary(
    creatorId: string,
    environment: ExecutionEnvironment = 'sandbox'
  ): CreatorMonetizationDashboardSummary {
    this.ensureInitialSeeds();
    const allTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []).filter(
      (tx) => tx.creatorOrRecipientId === creatorId && tx.environment === environment
    );

    const categories: MonetizedRevenueCategory[] = [
      'INDIVIDUAL_PHOTO_UNLOCK',
      'INDIVIDUAL_VIDEO_UNLOCK',
      'VIP_VAULT_ACCESS',
      'IMMEDIATE_INTEREST',
      'VIRTUAL_GIFT',
      'PROFILE_BOOST',
      'JOBS_PREMIUM_SUBSCRIPTION',
    ];

    const byCategory = {} as CreatorMonetizationDashboardSummary['byCategory'];
    for (const cat of categories) {
      byCategory[cat] = {
        count: 0,
        refundedCount: 0,
        diamondsTotal: 0,
        paidDiamondsTotal: 0,
        bonusDiamondsTotal: 0,
        grossCents: 0,
        refundedCents: 0,
        netCents: 0,
        creatorShare70Cents: 0,
        platformShare20Cents: 0,
        operationalReserve10Cents: 0,
        platformCommission30Cents: 0,
      };
    }

    let totalDiamondsReceived = 0;
    let paidDiamondsReceived = 0;
    let bonusDiamondsReceived = 0;
    let grossRevenueCents = 0;
    let refundedCents = 0;
    let creatorShare70Cents = 0;
    let platformShare20Cents = 0;
    let operationalReserve10Cents = 0;
    let platformCommission30Cents = 0;

    for (const tx of allTxs) {
      const bucket = byCategory[tx.category];
      const txP20 = tx.platformShare20Cents ?? Math.round(tx.grossAmountCents * 0.20);
      const txR10 = tx.operationalReserve10Cents ?? tx.platformCommissionCents - txP20;
      const dTotal = tx.diamondsCharged ?? 0;
      const dPaid = tx.paidDiamondsUsed ?? 0;
      const dBonus = tx.bonusDiamondsUsed ?? 0;

      if (tx.paymentStatus === 'confirmed') {
        bucket.count += 1;
        bucket.diamondsTotal += dTotal;
        bucket.paidDiamondsTotal += dPaid;
        bucket.bonusDiamondsTotal += dBonus;
        bucket.grossCents += tx.grossAmountCents;
        bucket.netCents += tx.grossAmountCents;
        bucket.creatorShare70Cents += tx.creatorShareCents;
        bucket.platformShare20Cents += txP20;
        bucket.operationalReserve10Cents += txR10;
        bucket.platformCommission30Cents += tx.platformCommissionCents;

        totalDiamondsReceived += dTotal;
        paidDiamondsReceived += dPaid;
        bonusDiamondsReceived += dBonus;
        grossRevenueCents += tx.grossAmountCents;
        creatorShare70Cents += tx.creatorShareCents;
        platformShare20Cents += txP20;
        operationalReserve10Cents += txR10;
        platformCommission30Cents += tx.platformCommissionCents;
      } else if (tx.paymentStatus === 'refunded' || tx.paymentStatus === 'chargeback') {
        bucket.count += 1;
        bucket.refundedCount += 1;
        bucket.grossCents += tx.grossAmountCents;
        bucket.refundedCents += tx.grossAmountCents;

        grossRevenueCents += tx.grossAmountCents;
        refundedCents += tx.grossAmountCents;
      }
    }

    const netRevenueCents = grossRevenueCents - refundedCents;
    const allMedia = this.readJson<ExclusiveMediaItem[]>(STORAGE_KEY_EXCLUSIVE_MEDIA, []).filter(
      (m) => m.creatorId === creatorId && m.state === 'published' && m.moderationResult === 'approved'
    );

    return {
      creatorId,
      environment,
      currency: 'BRL',
      totalDiamondsReceived,
      paidDiamondsReceived,
      bonusDiamondsReceived,
      grossRevenueCents,
      grossRevenueBrl: Number((grossRevenueCents / 100).toFixed(2)),
      refundedCents,
      refundedBrl: Number((refundedCents / 100).toFixed(2)),
      netRevenueCents,
      netRevenueBrl: Number((netRevenueCents / 100).toFixed(2)),
      creatorShare70Cents,
      creatorShare70Brl: Number((creatorShare70Cents / 100).toFixed(2)),
      platformShare20Cents,
      platformShare20Brl: Number((platformShare20Cents / 100).toFixed(2)),
      operationalReserve10Cents,
      operationalReserve10Brl: Number((operationalReserve10Cents / 100).toFixed(2)),
      platformCommission30Cents,
      platformCommission30Brl: Number((platformCommission30Cents / 100).toFixed(2)),
      pendingBalanceCents: 0,
      pendingBalanceBrl: 0,
      availableBalanceCents: creatorShare70Cents,
      availableBalanceBrl: Number((creatorShare70Cents / 100).toFixed(2)),
      byCategory,
      publishedIndividualPhotosCount: allMedia.filter(
        (m) => m.modality === 'INDIVIDUAL_UNLOCK' && m.mediaType === 'photo'
      ).length,
      publishedIndividualVideosCount: allMedia.filter(
        (m) => m.modality === 'INDIVIDUAL_UNLOCK' && m.mediaType === 'video'
      ).length,
      publishedVipVaultItemsCount: allMedia.filter((m) => m.modality === 'VIP_VAULT').length,
      publishedFreeItemsCount: allMedia.filter((m) => m.modality === 'FREE').length,
    };
  }

  public getPlatformReconciliationReport(
    environment: ExecutionEnvironment | 'all' = 'sandbox'
  ): PlatformMonetizationReconciliationReport {
    this.ensureInitialSeeds();
    const allTxs = this.readJson<MonetizedTransactionRecord[]>(STORAGE_KEY_MONETIZED_TXS, []).filter((tx) =>
      environment === 'all' ? true : tx.environment === environment
    );

    const categories: MonetizedRevenueCategory[] = [
      'INDIVIDUAL_PHOTO_UNLOCK',
      'INDIVIDUAL_VIDEO_UNLOCK',
      'VIP_VAULT_ACCESS',
      'IMMEDIATE_INTEREST',
      'VIRTUAL_GIFT',
      'PROFILE_BOOST',
      'JOBS_PREMIUM_SUBSCRIPTION',
    ];

    const byCategory = {} as PlatformMonetizationReconciliationReport['byCategory'];
    for (const cat of categories) {
      byCategory[cat] = {
        confirmedCount: 0,
        refundedCount: 0,
        diamondsConsumed: 0,
        paidDiamondsConsumed: 0,
        bonusDiamondsConsumed: 0,
        grossCents: 0,
        refundedCents: 0,
        netCents: 0,
        creatorShare70Cents: 0,
        platformShare20Cents: 0,
        operationalReserve10Cents: 0,
        platformCommission30Cents: 0,
        netCreator70Cents: 0,
        netPlatform20Cents: 0,
        netReserve10Cents: 0,
        netPlatform30Cents: 0,
      };
    }

    let totalDiamondsConsumed = 0;
    let totalPaidDiamondsConsumed = 0;
    let totalBonusDiamondsConsumed = 0;
    let totalGrossReceivedCents = 0;
    let totalRefundedAndChargebackCents = 0;
    let totalCreatorShare70Cents = 0;
    let totalPlatformShare20Cents = 0;
    let totalOperationalReserve10Cents = 0;
    let totalPlatformCommission30Cents = 0;
    let netCreatorObligationsCents = 0;
    let netPlatformShare20Cents = 0;
    let netOperationalReserve10Cents = 0;
    let netPlatformRetainedCents = 0;
    let divergentCount = 0;
    let bonusWithImproperFiatCount = 0;

    for (const tx of allTxs) {
      const txP20 = tx.platformShare20Cents ?? Math.round(tx.grossAmountCents * 0.20);
      const txR10 = tx.operationalReserve10Cents ?? tx.platformCommissionCents - txP20;

      if (
        tx.creatorShareCents + tx.platformCommissionCents !== tx.grossAmountCents ||
        tx.creatorShareCents + txP20 + txR10 !== tx.grossAmountCents
      ) {
        divergentCount += 1;
      }

      if (tx.bonusDiamondsUsed > 0 && tx.paidDiamondsUsed === 0 && tx.grossAmountCents !== 0) {
        bonusWithImproperFiatCount += 1;
      }

      const bucket = byCategory[tx.category];
      if (tx.paymentStatus === 'confirmed') {
        bucket.confirmedCount += 1;
        bucket.diamondsConsumed += tx.diamondsCharged ?? 0;
        bucket.paidDiamondsConsumed += tx.paidDiamondsUsed ?? 0;
        bucket.bonusDiamondsConsumed += tx.bonusDiamondsUsed ?? 0;
        bucket.grossCents += tx.grossAmountCents;
        bucket.netCents += tx.grossAmountCents;
        bucket.creatorShare70Cents += tx.creatorShareCents;
        bucket.platformShare20Cents += txP20;
        bucket.operationalReserve10Cents += txR10;
        bucket.platformCommission30Cents += tx.platformCommissionCents;
        bucket.netCreator70Cents += tx.creatorShareCents;
        bucket.netPlatform20Cents += txP20;
        bucket.netReserve10Cents += txR10;
        bucket.netPlatform30Cents += tx.platformCommissionCents;

        totalDiamondsConsumed += tx.diamondsCharged ?? 0;
        totalPaidDiamondsConsumed += tx.paidDiamondsUsed ?? 0;
        totalBonusDiamondsConsumed += tx.bonusDiamondsUsed ?? 0;
        totalGrossReceivedCents += tx.grossAmountCents;
        totalCreatorShare70Cents += tx.creatorShareCents;
        totalPlatformShare20Cents += txP20;
        totalOperationalReserve10Cents += txR10;
        totalPlatformCommission30Cents += tx.platformCommissionCents;
        netCreatorObligationsCents += tx.creatorShareCents;
        netPlatformShare20Cents += txP20;
        netOperationalReserve10Cents += txR10;
        netPlatformRetainedCents += tx.platformCommissionCents;
      } else if (tx.paymentStatus === 'refunded' || tx.paymentStatus === 'chargeback') {
        bucket.confirmedCount += 1;
        bucket.refundedCount += 1;
        bucket.grossCents += tx.grossAmountCents;
        bucket.refundedCents += tx.grossAmountCents;
        bucket.creatorShare70Cents += tx.creatorShareCents;
        bucket.platformShare20Cents += txP20;
        bucket.operationalReserve10Cents += txR10;
        bucket.platformCommission30Cents += tx.platformCommissionCents;

        totalGrossReceivedCents += tx.grossAmountCents;
        totalRefundedAndChargebackCents += tx.grossAmountCents;
        totalCreatorShare70Cents += tx.creatorShareCents;
        totalPlatformShare20Cents += txP20;
        totalOperationalReserve10Cents += txR10;
        totalPlatformCommission30Cents += tx.platformCommissionCents;
      }
    }

    const netRecognizedRevenueCents = totalGrossReceivedCents - totalRefundedAndChargebackCents;
    const grossMinusRefundsEqualsNet =
      totalGrossReceivedCents - totalRefundedAndChargebackCents === netRecognizedRevenueCents;
    const creatorPlusPlatformEqualsNet =
      netCreatorObligationsCents + netPlatformRetainedCents === netRecognizedRevenueCents;
    const split70_20_10EqualsNet =
      netCreatorObligationsCents + netPlatformShare20Cents + netOperationalReserve10Cents ===
      netRecognizedRevenueCents;
    const bonusDiamondsZeroFiatLiability = bonusWithImproperFiatCount === 0;
    const zeroDivergentTransactions = divergentCount === 0;

    const alerts: PlatformMonetizationReconciliationReport['alerts'] = [];
    if (!zeroDivergentTransactions || !split70_20_10EqualsNet) {
      alerts.push({
        id: 'alert_divergence',
        severity: 'critical',
        code: 'SPLIT_70_20_10_DIVERGENCE',
        title: 'Divergência de Partição 70/20/10 Detectada',
        description: `${divergentCount} transação(ões) não somam exatamente 100% do valor bruto elegível.`,
      });
    } else {
      alerts.push({
        id: 'alert_reconciled_ok',
        severity: 'info',
        code: 'RECONCILIATION_100_OK',
        title: 'Reconciliação 70/20/10 Íntegra em Centavos',
        description:
          'Todas as transações em diamantes conciliam exatamente 70% Criador + 20% Receita JOBS + 10% Reserva Operacional.',
      });
    }

    const declinedOrFailedCount = allTxs.filter(
      (t) => t.paymentStatus === 'declined' || t.paymentStatus === 'expired'
    ).length;
    if (declinedOrFailedCount > 0) {
      alerts.push({
        id: 'alert_declined_payments',
        severity: 'warning',
        code: 'PAYMENT_DECLINED_ATTEMPTS',
        title: 'Tentativas de Pagamento Não Confirmadas Bloqueadas',
        description: `${declinedOrFailedCount} tentativa(s) recusada(s)/expirada(s) foram retidas sem liberação de acesso nem crédito indevido.`,
      });
    }

    return {
      environment,
      currency: 'BRL',
      totalDiamondsConsumed,
      totalPaidDiamondsConsumed,
      totalBonusDiamondsConsumed,
      totalGrossReceivedCents,
      totalGrossReceivedBrl: Number((totalGrossReceivedCents / 100).toFixed(2)),
      totalRefundedAndChargebackCents,
      totalRefundedAndChargebackBrl: Number((totalRefundedAndChargebackCents / 100).toFixed(2)),
      netRecognizedRevenueCents,
      netRecognizedRevenueBrl: Number((netRecognizedRevenueCents / 100).toFixed(2)),
      totalCreatorShare70Cents,
      totalCreatorShare70Brl: Number((totalCreatorShare70Cents / 100).toFixed(2)),
      totalPlatformShare20Cents,
      totalPlatformShare20Brl: Number((totalPlatformShare20Cents / 100).toFixed(2)),
      totalOperationalReserve10Cents,
      totalOperationalReserve10Brl: Number((totalOperationalReserve10Cents / 100).toFixed(2)),
      totalPlatformCommission30Cents,
      totalPlatformCommission30Brl: Number((totalPlatformCommission30Cents / 100).toFixed(2)),
      netCreatorObligationsCents,
      netCreatorObligationsBrl: Number((netCreatorObligationsCents / 100).toFixed(2)),
      netPlatformShare20Cents,
      netPlatformShare20Brl: Number((netPlatformShare20Cents / 100).toFixed(2)),
      netOperationalReserve10Cents,
      netOperationalReserve10Brl: Number((netOperationalReserve10Cents / 100).toFixed(2)),
      netPlatformRetainedCents,
      netPlatformRetainedBrl: Number((netPlatformRetainedCents / 100).toFixed(2)),
      isStrictlyReconciled:
        grossMinusRefundsEqualsNet &&
        creatorPlusPlatformEqualsNet &&
        split70_20_10EqualsNet &&
        bonusDiamondsZeroFiatLiability &&
        zeroDivergentTransactions,
      reconciliationFormulaCheck: {
        grossMinusRefundsEqualsNet,
        creatorPlusPlatformEqualsNet,
        split70_20_10EqualsNet,
        bonusDiamondsZeroFiatLiability,
        zeroDivergentTransactions,
      },
      byCategory,
      alerts,
    };
  }

  /**
   * Utilitário para limpeza controlada de dados em suítes de testes automatizados.
   */
  public resetForAutomatedTesting(): void {
    const s = getStorage();
    s.removeItem(STORAGE_KEY_EXCLUSIVE_MEDIA);
    s.removeItem(STORAGE_KEY_VIP_VAULT_CONFIGS);
    s.removeItem(STORAGE_KEY_EXCLUSIVE_GRANTS);
    s.removeItem(STORAGE_KEY_MONETIZED_TXS);
    s.removeItem(STORAGE_KEY_IMMEDIATE_INTERESTS);
    s.removeItem(STORAGE_KEY_SIGNED_DELIVERIES);
    s.removeItem(STORAGE_KEY_USER_BLOCKS_PAIRS);
    s.removeItem(STORAGE_KEY_CREATOR_COMPLIANCE);
    s.removeItem(STORAGE_KEY_DIAMOND_CATALOG);
    s.removeItem(STORAGE_KEY_USER_DIAMOND_WALLETS);
    this.ensureInitialSeeds();
  }
}

export const exclusiveContentAndInterestService = new ExclusiveContentAndInterestService();
