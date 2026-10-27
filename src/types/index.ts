export interface VipMediaItem {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  priceCredits: number;
  type: 'photo' | 'video';
  durationSec?: number;
  isUnlocked: boolean;
  isRevealed?: boolean;
  likesCount: number;
  unlockCount: number;
  tags?: string[];
}

export interface LiveChatMessage {
  id: string;
  user: string;
  text: string;
  tip?: number;
  timestamp: string;
}

export type LiveGender = 'mulher' | 'homem' | 'trans';
export type LiveSexualOrientation = 'hetero' | 'bi' | 'gay' | 'lesbica' | 'pan';

export interface LiveStream {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  description: string;
  viewerCount: number;
  stage: 'public' | 'intimate_locked' | 'intimate_unlocked';
  priceCreditsToUnlock: number;
  isUnlockedByUser: boolean;
  gender: LiveGender;
  sexualOrientation: LiveSexualOrientation;
  genderLabel: string;
  orientationLabel: string;
  tipGoal: {
    description: string;
    current: number;
    target: number;
  };
  streamMediaUrl: string;
  vipStreamMediaUrl: string;
  tags: string[];
  chatMessages: LiveChatMessage[];
  isBroadcasting: boolean;
}

export interface DiscoverNudeItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  teaserHint: string;
  mediaUrl: string;
  priceCredits: number;
  isUnlocked: boolean;
  isRevealed: boolean;
  revealProgress: number; // 0 to 100
  likesCount: number;
  tags: string[];
  gender: LiveGender;
  sexualOrientation: LiveSexualOrientation;
  genderLabel: string;
  orientationLabel: string;
}

export type ProfileGender = 'mulher' | 'homem' | 'trans';
export type ProfileSexualOrientation = 'hetero' | 'bi' | 'gay' | 'lesbica' | 'pan';

export interface VerifiedCreatorBadgeInfo {
  status: 'verified_creator' | 'trusted_partner' | 'vip_creator';
  label: string;
  badgeLevel: 'standard' | 'premium' | 'elite';
  verificationDate?: string;
  trustScore: number;
  biometricVerified: boolean;
  idDocumentVerified: boolean;
  safeCreatorGuaranteed: boolean;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  distanceKm: number;
  bio: string;
  occupation: string;
  avatar: string;
  photos: string[];
  verified: boolean;
  isCreator?: boolean;
  verifiedBadge?: VerifiedCreatorBadgeInfo;
  relationshipGoal: string;
  interests: string[];
  hobbies: string[];
  musicGenres: string[];
  tags?: string[];
  gender: ProfileGender;
  sexualOrientation: ProfileSexualOrientation;
  genderLabel: string;
  orientationLabel: string;
  zodiacSign?: string;
  heightCm?: number;
  drinking?: string;
  smoking?: string;
  vipMedia: VipMediaItem[];
  online: boolean;
  lastActive: string;
  compatibilityScore?: number;
  rating?: number;
  ratingsCount?: number;
  userRating?: number;
  userReviewText?: string;
  isBoosted?: boolean;
  boostExpiresAt?: string;
  hideAge?: boolean;
  hideCity?: boolean;
  hideSexualOrientation?: boolean;
  approximateZoneId?: string;
  approximateZoneCentroid?: {
    lat: number;
    lng: number;
  };
}

export interface UserProfileData {
  name: string;
  age: number;
  birthDate: string;
  bio: string;
  occupation: string;
  city: string;
  interests: string[];
  hobbies: string[];
  musicGenres: string[];
  zodiacSign: string;
  heightCm: number;
  drinking: string;
  smoking: string;
  seeking: string;
  verified18: boolean;
  isBoosted?: boolean;
  boostExpiresAt?: string;
  boostStartedAt?: string;
}

export interface Message {
  id: string;
  senderId: string; // 'user' or profile id
  text?: string;
  createdAt: string;
  vipMedia?: VipMediaItem;
  tipAmount?: number;
}

export interface Conversation {
  profileId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface CreditPackage {
  id: string;
  credits: number;
  bonusCredits: number;
  priceBrl: number;
  stripePriceId?: string;
  isPopular?: boolean;
  badge?: string;
}

export interface Transaction {
  id: string;
  type: 'purchase' | 'unlock' | 'tip' | 'payout';
  amountCredits: number;
  amountBrl?: number;
  description: string;
  timestamp: string;
  paymentGateway?: 'stripe' | 'pix';
  stripePaymentIntentId?: string;
  userName?: string;
  status?: string;
}

export interface CreatorUpload {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  priceCredits: number;
  unlockCount: number;
  totalEarnedCredits: number;
  createdAt: string;
}

export interface DailyMetric {
  date: string;
  dayLabel: string;
  activeUsers: number;
  pageViews: number;
  creditsSold: number;
  revenueBrl: number;
  creditsSpent?: number;
  avgCreditsSpent?: number;
}

export interface AdminAnalyticsData {
  totalRevenueBrl: number;
  totalCreditsSold: number;
  dailyActiveUsers: number;
  todayPageViews: number;
  totalRegisteredUsers: number;
  totalVipUnlocks: number;
  gaMeasurementId: string;
  dailyMetrics: DailyMetric[];
}

export type AgeBracket = '18-24' | '25-34' | '35-44' | '45+';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface PixAccountDetails {
  pixKey: string;
  pixKeyType: PixKeyType;
  bankName: string;
  accountHolder: string;
  isAccountVerified: boolean;
  cpfCnpjMasked?: string;
}

export interface AdminPixTransferRecord {
  id: string;
  userId: string;
  userName: string;
  amountBrl: number;
  creditsDeducted: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  bankName: string;
  accountHolder: string;
  timestamp: string;
  endToEndId: string;
  status: 'concluido' | 'processando';
}

export interface AdminPlatformWithdrawalRecord {
  id: string;
  adminName: string;
  amountBrl: number;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  bankName: string;
  accountHolder: string;
  cpfCnpjMasked: string;
  paymentMethod: 'pix' | 'ted';
  timestamp: string;
  endToEndId: string;
  status: 'concluido' | 'processando';
  netProfitRemainingBrl: number;
}

export interface OnlineUserAdmin {
  id: string;
  name: string;
  avatar: string;
  age: number;
  ageBracket: AgeBracket;
  gender: LiveGender;
  genderLabel: string;
  sexualOrientation: LiveSexualOrientation;
  orientationLabel: string;
  city: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  region: 'América Latina' | 'América do Norte' | 'Europa' | 'Ásia & Outros';
  status: 'live_streaming' | 'watching_live' | 'in_chat' | 'browsing';
  statusLabel: string;
  device: 'iOS' | 'Android' | 'Desktop';
  onlineSinceMinutes: number;
  creditsBalance: number;
  isCreator: boolean;
  pixDetails?: PixAccountDetails;
}

export interface RegionDemographic {
  regionId: string;
  regionName: string;
  countries: string[];
  flag: string;
  totalOnline: number;
  totalRegistered: number;
  percentageShare: number;
  byGender: {
    mulher: number;
    homem: number;
    trans: number;
  };
  byAge: {
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45+': number;
  };
  byOrientation: {
    hetero: number;
    bi: number;
    gay: number;
    lesbica: number;
    pan: number;
  };
  topCities: { name: string; online: number }[];
}

export interface CreatorRating {
  id: string;
  creatorId: string;
  userId: string;
  userName: string;
  stars: number;
  comment?: string;
  tag?: string;
  timestamp: string;
}

export type PushNotificationType =
  | 'new_message'
  | 'live_stream_started'
  | 'vip_unlock'
  | 'creator_tip'
  | 'system';

export interface PushNotification {
  id: string;
  type: PushNotificationType;
  title: string;
  body: string;
  timestamp: string;
  createdAt: number;
  read: boolean;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  actionUrl?: 'messages' | 'lives' | 'discover_nudes' | 'vault' | 'discover' | 'profile';
  isFavoriteCreator?: boolean;
  metadata?: {
    streamId?: string;
    messageText?: string;
    tipAmount?: number;
    vipPreviewUrl?: string;
  };
}

export type FanTierLevel = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante' | 'supremo';

export interface PrestigePerkDetail {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
  category: 'visual' | 'chat' | 'vault' | 'vip';
}

export interface FanTierInfo {
  level: FanTierLevel;
  name: string;
  badge: string;
  medalName: string;
  iconName: string;
  minCredits: number;
  nextTierCredits: number | null;
  bgGradient: string;
  borderClass: string;
  badgeColorClass: string;
  avatarRingClass: string;
  textColor: string;
  glowColor: string;
  description: string;
  perks: string[];
  detailedPerks?: PrestigePerkDetail[];
}

export interface ReferralMember {
  id: string;
  name: string;
  avatar: string;
  level: 1 | 2 | 3;
  joinedAt: string;
  creditsPurchased: number;
  rewardEarnedBrl: number;
  status: 'active' | 'pending';
}

export interface ReferralPyramidData {
  userReferralCode: string;
  userReferralLink: string;
  isCampaignActive: boolean;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalMembersCount: number;
  totalEarnedBrl: number;
  availableForWithdrawBrl: number;
  totalWithdrawnBrl: number;
  recentReferrals: ReferralMember[];
}

export type SubscriptionTier = 'free' | 'premium' | 'vip';

export interface UserSubscription {
  tier: SubscriptionTier;
  period: 'monthly' | 'yearly';
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  priceBrl: number;
  features: string[];
}

export type ReportCategory =
  | 'assedio'
  | 'perfil_falso'
  | 'menor_de_idade'
  | 'spam_ou_fraude'
  | 'conteudo_ofensivo'
  | 'outros';

export interface ReportTicket {
  id: string;
  reportedProfileId: string;
  reportedProfileName: string;
  reportedProfileAvatar?: string;
  category: ReportCategory;
  categoryLabel: string;
  description: string;
  createdAt: string;
  status: 'pendente' | 'em_analise' | 'resolvida';
  resolutionNote?: string;
}

export interface UserPrivacySettings {
  hideAge: boolean;
  hideCity: boolean;
  invisibleMode: boolean;
  allowAiAnalysis: boolean;
  essentialCookiesOnly: boolean;
  dataSharingThirdParty: boolean;
  enableProximityDiscovery?: boolean;
  proximityRadiusKm?: number;
}

export type ScreenId =
  | '01_landing'
  | '02_register'
  | '03_login'
  | '04_age_gate'
  | '05_password_recovery'
  | '06_profile_creation'
  | '07_preferences'
  | '08_home'
  | '09_discover'
  | '10_profile_detail'
  | '11_connections'
  | '12_chat'
  | '13_video_call'
  | '14_notifications'
  | '15_subscriptions'
  | '16_settings'
  | '17_privacy_security'
  | '18_reports_blocks'
  | 'lives';

// ============================================================================
// JOBS — FASE 1: MODELO DE DOMÍNIO DE CARTEIRA, CRÉDITOS E CONTEÚDOS EXCLUSIVOS
// ============================================================================

export type UserRole = 'user' | 'creator' | 'moderator' | 'admin' | 'test_operator';
export type AgeVerificationStatus = 'unverified' | 'pending' | 'verified_18_plus' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'under_review';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ageVerificationStatus: AgeVerificationStatus;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreditWallet {
  id: string;
  userId: string;
  balance: number;
  currencyType: 'virtual_credits_non_withdrawable';
  createdAt: string;
  updatedAt: string;
}

export interface CreditPackageModel {
  id: string;
  name: string;
  creditsAmount: number;
  bonusCredits?: number;
  priceInCents: number; // Armazenado estritamente em centavos no servidor
  isActive: boolean;
  displayOrder: number;
  tagline?: string;
  badge?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseStatus = 'pending' | 'approved' | 'declined' | 'refunded';

export interface CreditPurchaseModel {
  id: string;
  userId: string;
  userName?: string;
  packageId: string;
  packageName?: string;
  creditsAmount: number;
  priceInCents: number;
  status: PurchaseStatus;
  testTransaction: boolean; // Sempre true nesta fase de testes
  idempotencyKey: string;
  providerReference: string;
  paymentGateway: 'pix' | 'stripe';
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

export type ContentModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type ContentType =
  | 'photo_sensual'
  | 'photo_fashion_lingerie'
  | 'video_exclusive'
  | 'entertainment_challenge';

export interface ContentModel {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  description: string;
  contentType: ContentType;
  previewAssetId: string; // URL da prévia autorizada com blur/teaser
  privateAssetId: string; // URL do arquivo privado protegido (nunca pública)
  priceInCredits: number;
  isFree: boolean;
  moderationStatus: ContentModerationStatus;
  ageRestricted: boolean; // Sempre true para recursos adultos 18+
  likesCount: number;
  unlockCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentAccessGrant {
  id: string;
  contentId: string;
  userId: string;
  purchaseId?: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export type WalletLedgerEntryType =
  | 'credit_purchase'
  | 'content_unlock'
  | 'refund'
  | 'adjustment';

export interface WalletLedgerEntryModel {
  id: string;
  userId: string;
  walletId: string;
  type: WalletLedgerEntryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: 'purchase' | 'content' | 'admin' | 'refund';
  referenceId: string;
  idempotencyKey: string;
  createdAt: string;
  description?: string;
  isSandbox: boolean;
}

export interface TemporaryAccessToken {
  id: string;
  contentId: string;
  userId: string;
  accessGrantId: string;
  tokenHash: string;
  expiresAt: string; // Curto tempo de expiração (15 minutos)
  usedAt?: string;
  createdAt: string;
}

export interface ChallengeModel {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  category: 'estilo_looks' | 'danca' | 'moda_praia' | 'lingerie_sensual';
  rules: string[];
  targetVotes: number;
  currentVotes: number;
  status: 'active' | 'completed' | 'draft';
  ageRestricted: boolean;
  isVoluntary: boolean;
  votedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportModel {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'content' | 'user' | 'creator';
  targetId: string;
  targetName: string;
  reason: string;
  category: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'high' | 'medium' | 'low';
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLogModel {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  entityType: 'wallet' | 'purchase' | 'content' | 'grant' | 'package' | 'moderation' | 'user';
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// JOBS — MÓDULO FINANCEIRO EXECUTIVO E RANKING DE GANHOS
// ============================================================================

export interface PlatformFinancialStatement {
  grossRevenueConfirmedBrl: number;
  sandboxSimulatedRevenueBrl: number;
  refundsAndChargebacksBrl: number;
  paymentGatewayFeesBrl: number;
  platformNetRevenueBrl: number; // 30% comissão oficial JOBS
  creatorLiabilitiesTotalBrl: number; // 70% repasse devido a criadores
  reservedFundsBrl: number; // Fundo de reserva e disputas
  reconciledBalanceBrl: number; // Saldo financeiro conciliado com gateways
  availableForPlatformUseBrl: number; // Saldo elegível para uso administrativo
  availableForAdminWithdrawalBrl: number; // Valor elegível para saque empresarial
  adminPendingWithdrawalsBrl: number;
  adminCompletedWithdrawalsBrl: number;
  adminCanceledWithdrawalsBrl: number;
  maskedCorporateAccount: string;
  isSandbox: boolean;
  lastReconciliationDate: string;
}

export type AdminWithdrawalStatus =
  | 'nao_solicitado'
  | 'pendente_validacao'
  | 'em_analise'
  | 'aprovado'
  | 'em_processamento'
  | 'liquidado'
  | 'recusado'
  | 'cancelado'
  | 'falhou';

export interface AdminWithdrawalRecord {
  id: string;
  amountBrl: number;
  availableBeforeBrl: number;
  applicableFeesBrl: number;
  netEstimatedBrl: number;
  requestedAt: string;
  completedAt?: string;
  maskedDestinationAccount: string;
  bankName: string;
  status: AdminWithdrawalStatus;
  statusLabel: string;
  providerReference?: string;
  reconciliationStatus: string;
  environment: 'sandbox' | 'production';
  actorId: string;
  justification: string;
  twoFactorApproved: boolean;
  approvalHistory: {
    timestamp: string;
    actor: string;
    action: string;
    notes: string;
  }[];
}

export interface RemunerationPolicyConfig {
  creatorPercentage: number; // padrão 70%
  platformPercentage: number; // padrão 30%
  gatewayFeeDeduction: 'deduct_from_gross' | 'platform_absorbs' | 'creator_absorbs';
  refundTreatment: 'pro_rata' | 'creator_charged' | 'platform_guarantee';
  retentionDays: number; // prazo de retenção (ex: 14 dias)
  minimumWithdrawalBrl: number; // valor mínimo de saque (ex: R$ 50,00)
  maximumDailyWithdrawalBrl: number; // limite operacional diário (ex: R$ 10.000,00)
  roundingRule: 'round_half_up' | 'floor' | 'ceil';
  lastUpdated: string;
  updatedBy: string;
}

export interface ExecutiveFinancialCardIndicator {
  id: string;
  number: number;
  title: string;
  description: string;
  amountBrl: number;
  period: string;
  currency: 'BRL' | 'USD' | 'EUR';
  environment: 'sandbox' | 'production';
  dataSource: string;
  category: 'receita' | 'obrigacoes' | 'reservas' | 'disponibilidade' | 'saques';
  isEstimated: boolean;
  isRealConnected: boolean;
}

export interface StrategicRoadmapPhase {
  code: string;
  title: string;
  description: string;
  statusReal: 'concluida' | 'em_andamento' | 'planejada' | 'bloqueada';
  progressPct: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  executedTests: string[];
  evidences: string[];
  risks: string[];
  pendingItems: string[];
  nextAction: string;
}

export type CreatorRankingSortMode =
  | 'net_accumulated'
  | 'month_earnings'
  | '7days_earnings'
  | 'day_earnings'
  | 'gross_sales'
  | 'sales_count'
  | 'avg_ticket'
  | 'growth_pct'
  | 'buyers_count'
  | 'conversion_rate'
  | 'pending_payment'
  | 'eligible_withdrawal'
  | 'paid_amount';

export interface CreatorRankingItem {
  rank: number;
  creatorId: string;
  publicName: string;
  handle: string;
  avatar: string;
  category: string;
  grossSalesConfirmedBrl: number;
  platformCommissionBrl: number; // 30%
  assignedFeesBrl: number; // taxas aplicáveis
  refundsAndAdjustmentsBrl: number; // estornos e ajustes
  netAccumulatedEarningsBrl: number; // ganhos líquidos acumulados
  pendingPaymentBrl: number; // valores pendentes de liberação
  eligibleForWithdrawalBrl: number; // valores elegíveis para saque
  totalPaidBrl: number; // valores já pagos
  lastActivityDate: string;
  accountStatus: 'active' | 'under_review' | 'restricted' | 'blocked';
  kycVerificationStatus: 'verified_18_plus' | 'pending' | 'rejected';
  salesCount: number;
  buyersCount: number;
  avgTicketBrl: number;
  growthPct: number;
  conversionRatePct: number;
  unlockedMediaCount: number;
  environment: 'sandbox' | 'production';
}

export interface UserVolumeRankingItem {
  rank: number;
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  location: string;
  totalSpentBrl: number;
  creditsPurchased: number;
  creditsConsumed: number;
  currentCreditsBalance: number;
  activityLevel: 'muito_alta' | 'alta' | 'moderada' | 'baixa';
  activityLabel: string;
  lastPurchaseDate: string;
  operationalRiskLevel: 'low' | 'attention' | 'high';
  operationalRiskLabel: string;
  chargebackAlertsCount: number;
  accountStatus: 'active' | 'under_review' | 'restricted' | 'blocked';
  ageVerified18: boolean;
  membershipTier: 'vip_black' | 'gold' | 'silver' | 'standard';
  environment: 'sandbox' | 'production';
}

// ============================================================================
// SIMULADOR DE SAQUE FINANCEIRO (MÓDULO EXECUTIVO)
// ============================================================================

export type WithdrawalSimulationEnvironment = 'sandbox' | 'production';
export type WithdrawalSimulationTarget = 'admin' | 'creator';
export type WithdrawalSimulationMethod =
  | 'pix_instant'
  | 'ted_banco'
  | 'conta_pagamento'
  | 'lote_agendado';

export interface WithdrawalSimulationInput {
  environment: WithdrawalSimulationEnvironment;
  targetType: WithdrawalSimulationTarget;
  creatorId?: string;
  creatorName?: string;
  eligibleBalanceBrl: number;
  requestedAmountBrl: number;
  feePercentage: number; // ex: 1.5%
  fixedFeeBrl: number; // ex: 3.50
  estimatedProcessingTime: string;
  payoutMethod: WithdrawalSimulationMethod;
}

export interface WithdrawalSimulationCalculationStep {
  step: string;
  formula: string;
  result: string;
  note?: string;
}

export type WithdrawalValidationStatus =
  | 'valid'
  | 'above_balance'
  | 'zero_or_negative'
  | 'fees_exceed_amount'
  | 'incomplete_data'
  | 'no_real_balance';

export interface WithdrawalSimulationResult {
  isValid: boolean;
  validationStatus: WithdrawalValidationStatus;
  validationMessage: string;
  environment: WithdrawalSimulationEnvironment;
  targetType: WithdrawalSimulationTarget;
  targetName: string;
  eligibleBalanceBeforeBrl: number;
  requestedAmountBrl: number;
  feePercentageApplied: number;
  estimatedPercentageFeeBrl: number;
  estimatedFixedFeeBrl: number;
  totalEstimatedFeesBrl: number;
  netEstimatedAmountBrl: number;
  remainingBalanceBrl: number;
  estimatedProcessingTime: string;
  payoutMethod: WithdrawalSimulationMethod;
  payoutMethodLabel: string;
  calculationMemory: WithdrawalSimulationCalculationStep[];
  simulatedAt: string;
  disclaimer: string;
}

export interface WithdrawalSimulationRecord {
  id: string; // ex: SIM-20261019-9482
  timestamp: string;
  actorId: string;
  environment: WithdrawalSimulationEnvironment;
  targetType: WithdrawalSimulationTarget;
  targetName: string;
  requestedAmountBrl: number;
  totalFeesBrl: number;
  netAmountBrl: number;
  remainingBalanceBrl: number;
  payoutMethod: string;
  processingTime: string;
  status: 'SIMULAÇÃO — SEM MOVIMENTAÇÃO FINANCEIRA';
  disclaimer: string;
}


