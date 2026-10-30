/**
 * JOBS 1.0 — SERVIÇO OFICIAL DO MÓDULO DE LIVES AO VIVO, BATALHAS E RECOMPENSAS
 * 
 * Suporta todos os 4 formatos exigidos pela especificação mestre:
 * 1. Lives Individuais (com modo público e show íntimo VIP desbloqueado por créditos)
 * 2. Batalhas entre Criadores (2 criadores lado a lado, placar determinístico, contagem regressiva)
 * 3. Salas Interativas (palco compartilhado, solicitações de entrada, controles de áudio/vídeo)
 * 4. Desafios e Metas Coletivas (metas de presentes, votações da audiência)
 * 
 * Integrações fundamentais:
 * - Livro-razão financeiro imutável (financialLedger): divisão 70% Criador / 30% Plataforma para presentes elegíveis.
 * - Premiações por desempenho separadas da receita com campanhas e regras versionadas.
 * - Pontos, distintivos e rankings segregados de moeda fiduciária e créditos virtuais.
 * - Adaptador de Streaming identificado expressamente como DEMO até conexão de infraestrutura WebRTC/HLS de produção.
 */

import { financialLedger, LedgerEntry } from './ledgerService';

export type LiveFormat = 'individual' | 'battle' | 'interactive_stage' | 'challenge';

export type LiveSessionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface VirtualGiftItem {
  id: string;
  name: string;
  icon: string;
  creditsCost: number;
  category: 'classico' | 'vip' | 'luxo' | 'lendario';
  animationEffect: string;
  displayOrder: number;
  isActive: boolean;
  description: string;
}

export const OFFICIAL_VIRTUAL_GIFTS: VirtualGiftItem[] = [
  {
    id: 'gift_rose',
    name: 'Rosa Sensual',
    icon: '🌹',
    creditsCost: 29,
    category: 'classico',
    animationEffect: 'floating_rose',
    displayOrder: 1,
    isActive: true,
    description: 'Um gesto carinhoso para chamar a atenção da criadora',
  },
  {
    id: 'gift_drink',
    name: 'Coquetel Cosmopolitan',
    icon: '🍸',
    creditsCost: 49,
    category: 'classico',
    animationEffect: 'clinking_glasses',
    displayOrder: 2,
    isActive: true,
    description: 'Um brinde VIP durante a conversa',
  },
  {
    id: 'gift_champagne',
    name: 'Champagne Moët & Chandon',
    icon: '🍾',
    creditsCost: 79,
    category: 'vip',
    animationEffect: 'champagne_pop',
    displayOrder: 3,
    isActive: true,
    description: 'Comemoração de alta classe para animar o show',
  },
  {
    id: 'gift_fire',
    name: 'Fogo & Paixão',
    icon: '🔥',
    creditsCost: 119,
    category: 'vip',
    animationEffect: 'fire_burst',
    displayOrder: 4,
    isActive: true,
    description: 'Pedido explícito para elevar a temperatura da live',
  },
  {
    id: 'gift_crown',
    name: 'Coroa Imperial VIP',
    icon: '👑',
    creditsCost: 149,
    category: 'luxo',
    animationEffect: 'golden_crown_glow',
    displayOrder: 5,
    isActive: true,
    description: 'Destaque como maior apoiador no topo da transmissão',
  },
  {
    id: 'gift_rocket',
    name: 'Foguete Diamante Supremo',
    icon: '🚀',
    creditsCost: 199,
    category: 'lendario',
    animationEffect: 'rocket_launch_confetti',
    displayOrder: 6,
    isActive: true,
    description: 'Impulso máximo com anúncio em tela cheia e super bônus',
  },
];

export interface LiveChatMessageItem {
  id: string;
  liveStreamId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  giftCost?: number;
  giftIcon?: string;
  giftName?: string;
  isSystemNotice?: boolean;
  timestamp: string;
}

export interface StageParticipant {
  userId: string;
  userName: string;
  avatar: string;
  role: 'host' | 'co_host' | 'guest';
  isMuted: boolean;
  isCameraOff: boolean;
  joinedAt: string;
}

export interface StageJoinRequest {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface LiveBattleState {
  battleId: string;
  creator1: {
    id: string;
    name: string;
    avatar: string;
    score: number;
    streamUrl: string;
  };
  creator2: {
    id: string;
    name: string;
    avatar: string;
    score: number;
    streamUrl: string;
  };
  durationSeconds: number;
  remainingSeconds: number;
  winnerCreatorId?: string | 'draw';
  status: 'waiting' | 'active' | 'completed';
  rules: string;
}

export interface LiveChallengeState {
  challengeId: string;
  title: string;
  description: string;
  targetMetric: 'credits_gifts' | 'viewers_count' | 'audience_votes';
  targetValue: number;
  currentValue: number;
  rewardDescription: string;
  status: 'active' | 'completed' | 'failed';
  optionsForVote?: { id: string; label: string; votes: number }[];
  voters?: Record<string, string>;
  votedParticipantIds?: string[];
  votedAtTimestamps?: Record<string, string>;
}

export interface PerformanceRewardRule {
  ruleId: string;
  version: string;
  campaignName: string;
  description: string;
  minDurationMinutes: number;
  minAudiencePeak: number;
  minEligibleGiftsBrl: number;
  rewardBrl: number;
  maxCampaignBudgetBrl: number;
  fundingSource: 'JOBS_MARKETING_POOL_2026';
  isActive: boolean;
}

export interface LiveSessionModel {
  id: string;
  format: LiveFormat;
  title: string;
  description: string;
  category: 'conversa_vip' | 'striptease_intimo' | 'batalha_shows' | 'desafio_coletivo';
  hostCreatorId: string;
  hostCreatorName: string;
  hostCreatorAvatar: string;
  status: LiveSessionStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  viewerCount: number;
  peakViewersCount: number;
  gender: 'mulher' | 'homem' | 'trans';
  sexualOrientation: 'hetero' | 'bi' | 'gay' | 'lesbica' | 'pan';
  genderLabel: string;
  orientationLabel: string;
  priceCreditsToUnlock: number;
  isUnlockedByUser: boolean;
  streamMediaUrl: string;
  vipStreamMediaUrl: string;
  tags: string[];
  isBroadcasting: boolean;
  isDemoStreaming: boolean;
  streamingProviderNote: string;
  // Batalhas
  battleState?: LiveBattleState;
  // Palco
  stageParticipants: StageParticipant[];
  stageJoinRequests: StageJoinRequest[];
  // Desafios
  challengeState?: LiveChallengeState;
  // Métricas financeiras e de presentes da sessão
  totalGiftsReceivedCredits: number;
  totalEligibleRevenueBrl: number;
  creatorEarningsBrl: number;
  platformCommissionBrl: number;
  chatMessages: LiveChatMessageItem[];
  // Recompensas de Desempenho
  performanceRewardStatus?:
    | 'ineligible'
    | 'pending_evaluation'
    | 'under_review'
    | 'approved'
    | 'pending_release'
    | 'available'
    | 'rejected'
    | 'reversed';
  performanceRewardAmountBrl?: number;
  appliedRewardRuleVersion?: string;
}

export interface CreatorLeaderboardEntry {
  rank: number;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  category: string;
  totalPoints: number;
  battlesWon: number;
  totalLiveHours: number;
  totalGiftsReceived: number;
  badgeLevel: 'bronze' | 'prata' | 'ouro' | 'diamante' | 'lendario';
  trend: 'up' | 'down' | 'neutral';
}

const STORAGE_KEY_LIVES = 'jobs_live_sessions_v2';
const STORAGE_KEY_CHAT = 'jobs_live_chats_v2';
const STORAGE_KEY_POINTS = 'jobs_live_points_ledger_v2';
const STORAGE_KEY_REPORTS = 'jobs_live_moderation_reports_v2';
const STORAGE_KEY_LIKES = 'jobs_live_likes_v2';

class LiveStreamService {
  private queue: Promise<void> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // ==========================================================================
  // SESSÕES DE LIVE (PERSISTÊNCIA & SEED MULTI-FORMATO)
  // ==========================================================================

  public getLiveSessions(): LiveSessionModel[] {
    const raw = localStorage.getItem(STORAGE_KEY_LIVES);
    if (!raw) {
      return this.seedInitialLiveSessions();
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return this.seedInitialLiveSessions();
    } catch {
      return this.seedInitialLiveSessions();
    }
  }

  public saveLiveSessions(sessions: LiveSessionModel[]): void {
    localStorage.setItem(STORAGE_KEY_LIVES, JSON.stringify(sessions));
  }

  public getSessionById(sessionId: string): LiveSessionModel | null {
    const list = this.getLiveSessions();
    return list.find((s) => s.id === sessionId) || null;
  }

  /**
   * Catálogo de Regras de Premiação por Desempenho (Versionadas)
   */
  public getPerformanceRules(): PerformanceRewardRule[] {
    return [
      {
        ruleId: 'rule_marathon_v1',
        version: '1.2.0',
        campaignName: 'Super Maratona Criador JOBS',
        description: 'Bônus de R$ 50,00 para transmissões válidas acima de 45 minutos com mais de 500 espectadores de pico.',
        minDurationMinutes: 45,
        minAudiencePeak: 500,
        minEligibleGiftsBrl: 30.0,
        rewardBrl: 50.0,
        maxCampaignBudgetBrl: 5000.0,
        fundingSource: 'JOBS_MARKETING_POOL_2026',
        isActive: true,
      },
      {
        ruleId: 'rule_battle_v1',
        version: '1.0.4',
        campaignName: 'Batalha dos Titãs da Madrugada',
        description: 'Premiação de R$ 35,00 para vitórias em disputas com mais de 1000 pontos somados.',
        minDurationMinutes: 10,
        minAudiencePeak: 300,
        minEligibleGiftsBrl: 20.0,
        rewardBrl: 35.0,
        maxCampaignBudgetBrl: 3000.0,
        fundingSource: 'JOBS_MARKETING_POOL_2026',
        isActive: true,
      },
    ];
  }

  /**
   * Popula sessões representativas cobrindo todos os 4 formatos exigidos
   */
  private seedInitialLiveSessions(): LiveSessionModel[] {
    const seeds: LiveSessionModel[] = [
      // 1. LIVE INDIVIDUAL
      {
        id: 'live_indiv_valentina',
        format: 'individual',
        title: 'Ensaio Boudoir & Conversas Íntimas no Quarto',
        description: 'Bate-papo sensual, drinks e ensaio ao vivo. Ao tirar a lingerie de seda, entra em modo VIP restrito com créditos!',
        category: 'striptease_intimo',
        hostCreatorId: 'valentina',
        hostCreatorName: 'Valentina Rossi',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        status: 'active',
        startedAt: new Date(Date.now() - 35 * 60000).toISOString(),
        durationSeconds: 2100,
        viewerCount: 1640,
        peakViewersCount: 1890,
        gender: 'mulher',
        sexualOrientation: 'bi',
        genderLabel: 'Mulher',
        orientationLabel: 'Bissexual',
        priceCreditsToUnlock: 65,
        isUnlockedByUser: false,
        streamMediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        vipStreamMediaUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        tags: ['Individual', 'Boudoir', 'Show Íntimo VIP', 'Bissexual'],
        isBroadcasting: true,
        isDemoStreaming: true,
        streamingProviderNote: 'Transmissão em Modo DEMO WebRTC simulado em alta resolução',
        stageParticipants: [],
        stageJoinRequests: [],
        totalGiftsReceivedCredits: 580,
        totalEligibleRevenueBrl: 58.0,
        creatorEarningsBrl: 40.6,
        platformCommissionBrl: 17.4,
        chatMessages: [
          {
            id: 'c_val_1',
            liveStreamId: 'live_indiv_valentina',
            senderId: 'user_marcos',
            senderName: 'Marcos_SP',
            text: 'Que linda Valentina! Já estou com créditos pra ver o show completo!',
            timestamp: 'Há 3 min',
          },
          {
            id: 'c_val_2',
            liveStreamId: 'live_indiv_valentina',
            senderId: 'user_rodrigo',
            senderName: 'Rodrigo_VIP',
            text: 'Enviou 🍾 Champagne Moët & Chandon (50 créditos 💎)!',
            giftCost: 50,
            giftIcon: '🍾',
            giftName: 'Champagne Moët & Chandon',
            timestamp: 'Há 1 min',
          },
        ],
      },

      // 2. BATALHA ENTRE CRIADORES (2 Criadores)
      {
        id: 'live_battle_isabella_camila',
        format: 'battle',
        title: 'Batalha Sensual VIP: Isabella Fontes vs Camila Duarte',
        description: 'Duelo ao vivo de 5 minutos! Quem receber mais apoio e presentes da audiência vence o desafio da noite.',
        category: 'batalha_shows',
        hostCreatorId: 'isabella',
        hostCreatorName: 'Isabella Fontes',
        hostCreatorAvatar: '/src/assets/images/profile_isabella_1791856837043.jpg',
        status: 'active',
        startedAt: new Date(Date.now() - 12 * 60000).toISOString(),
        durationSeconds: 720,
        viewerCount: 2980,
        peakViewersCount: 3200,
        gender: 'mulher',
        sexualOrientation: 'hetero',
        genderLabel: 'Mulher',
        orientationLabel: 'Duelo Feminino',
        priceCreditsToUnlock: 50,
        isUnlockedByUser: true,
        streamMediaUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
        vipStreamMediaUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        tags: ['Batalha', 'Duelo Ao Vivo', 'Isabella vs Camila', 'Presentes'],
        isBroadcasting: true,
        isDemoStreaming: true,
        streamingProviderNote: 'Transmissão em tela dividida simulada DEMO',
        battleState: {
          battleId: 'bat_001_rio_sp',
          creator1: {
            id: 'isabella',
            name: 'Isabella Fontes',
            avatar: '/src/assets/images/profile_isabella_1791856837043.jpg',
            score: 1850,
            streamUrl: '/src/assets/images/profile_isabella_1791856837043.jpg',
          },
          creator2: {
            id: 'camila',
            name: 'Camila Duarte',
            avatar: '/src/assets/images/profile_camila_1791856837360.jpg',
            score: 1620,
            streamUrl: '/src/assets/images/profile_camila_1791856837360.jpg',
          },
          durationSeconds: 300,
          remainingSeconds: 142,
          status: 'active',
          rules: 'Cada 1 crédito em presentes vale 10 pontos na barra da batalha. O criador com mais pontos ao zerar o cronômetro vence.',
        },
        stageParticipants: [],
        stageJoinRequests: [],
        totalGiftsReceivedCredits: 347,
        totalEligibleRevenueBrl: 34.7,
        creatorEarningsBrl: 24.29,
        platformCommissionBrl: 10.41,
        chatMessages: [
          {
            id: 'c_bat_1',
            liveStreamId: 'live_battle_isabella_camila',
            senderId: 'user_felipe',
            senderName: 'Felipe_Rio',
            text: 'Time Isabella com certeza! Manda ver!',
            timestamp: 'Há 2 min',
          },
          {
            id: 'c_bat_2',
            liveStreamId: 'live_battle_isabella_camila',
            senderId: 'user_lucas',
            senderName: 'Lucas_RJ',
            text: 'Enviou 🔥 Fogo & Paixão para Camila (100 créditos 💎)!',
            giftCost: 100,
            giftIcon: '🔥',
            giftName: 'Fogo & Paixão',
            timestamp: 'Há 30 seg',
          },
        ],
      },

      // 3. SALA INTERATIVA COM PALCO (Multi-participantes)
      {
        id: 'live_stage_larissa',
        format: 'interactive_stage',
        title: 'Mesa Redonda Sem Tabus: Flertes, Noite & Fantasias',
        description: 'Sala com palco aberto para convidados! Peça para entrar no palco e converse ao vivo por áudio e vídeo com Larissa e moderadores.',
        category: 'conversa_vip',
        hostCreatorId: 'larissa',
        hostCreatorName: 'Larissa Fox',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        status: 'active',
        startedAt: new Date(Date.now() - 50 * 60000).toISOString(),
        durationSeconds: 3000,
        viewerCount: 920,
        peakViewersCount: 1100,
        gender: 'mulher',
        sexualOrientation: 'bi',
        genderLabel: 'Mulher',
        orientationLabel: 'Bissexual',
        priceCreditsToUnlock: 0,
        isUnlockedByUser: true,
        streamMediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
        vipStreamMediaUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        tags: ['Palco Interativo', 'Voz & Vídeo', 'Múltiplos Convidados'],
        isBroadcasting: true,
        isDemoStreaming: true,
        streamingProviderNote: 'Arquitetura de sala multi-conferência em Modo DEMO',
        stageParticipants: [
          {
            userId: 'larissa',
            userName: 'Larissa Fox (Anfitriã)',
            avatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
            role: 'host',
            isMuted: false,
            isCameraOff: false,
            joinedAt: 'Há 50 min',
          },
          {
            userId: 'gabriel',
            userName: 'Gabriel Menezes',
            avatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
            role: 'co_host',
            isMuted: false,
            isCameraOff: false,
            joinedAt: 'Há 20 min',
          },
        ],
        stageJoinRequests: [
          {
            id: 'req_01',
            userId: 'user_andre',
            userName: 'André Silveira',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            requestedAt: 'Há 2 min',
            status: 'pending',
          },
        ],
        totalGiftsReceivedCredits: 190,
        totalEligibleRevenueBrl: 19.0,
        creatorEarningsBrl: 13.3,
        platformCommissionBrl: 5.7,
        chatMessages: [
          {
            id: 'c_stage_1',
            liveStreamId: 'live_stage_larissa',
            senderId: 'larissa',
            senderName: 'Larissa Fox',
            text: 'Quem quiser subir no palco para conversar é só clicar em "Pedir Palco"!',
            timestamp: 'Há 5 min',
          },
        ],
      },

      // 4. DESAFIO COLETIVO COM META DA AUDIÊNCIA
      {
        id: 'live_challenge_gabriel',
        format: 'challenge',
        title: 'Meta de Audiência: Treino Noturno + Banho Nu na Ducha',
        description: 'Meta coletiva: Quando a sala atingir 400 créditos em presentes coletivos, Gabriel entra na ducha privativa sem toalha!',
        category: 'desafio_coletivo',
        hostCreatorId: 'gabriel',
        hostCreatorName: 'Gabriel Menezes',
        hostCreatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        status: 'active',
        startedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        durationSeconds: 1500,
        viewerCount: 810,
        peakViewersCount: 950,
        gender: 'homem',
        sexualOrientation: 'hetero',
        genderLabel: 'Homem',
        orientationLabel: 'Heterossexual',
        priceCreditsToUnlock: 45,
        isUnlockedByUser: false,
        streamMediaUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        vipStreamMediaUrl: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        tags: ['Desafio Coletivo', 'Meta de Presentes', 'Fitness VIP'],
        isBroadcasting: true,
        isDemoStreaming: true,
        streamingProviderNote: 'Transmissão individual com barra de meta coletiva auditada',
        stageParticipants: [],
        stageJoinRequests: [],
        challengeState: {
          challengeId: 'chal_ducha_01',
          title: 'Meta Coletiva: Entrar Nu na Ducha Privada',
          description: 'Atingir 400 💎 coletivos de mimos na transmissão',
          targetMetric: 'credits_gifts',
          targetValue: 400,
          currentValue: 285,
          rewardDescription: 'Gabriel tira a toalha ao vivo sem censura',
          status: 'active',
          optionsForVote: [
            { id: 'opt_1', label: 'Ducha fria rápida', votes: 142 },
            { id: 'opt_2', label: 'Banho de espuma quente', votes: 238 },
          ],
        },
        totalGiftsReceivedCredits: 285,
        totalEligibleRevenueBrl: 28.5,
        creatorEarningsBrl: 19.95,
        platformCommissionBrl: 8.55,
        chatMessages: [
          {
            id: 'c_chal_1',
            liveStreamId: 'live_challenge_gabriel',
            senderId: 'user_claudia',
            senderName: 'Cláudia_Fit',
            text: 'Faltam só 115 créditos para bater a meta!! Bora pessoal!',
            timestamp: 'Há 1 min',
          },
        ],
      },
    ];

    this.saveLiveSessions(seeds);
    return seeds;
  }

  // ==========================================================================
  // OPERAÇÕES DE TRANSMISSÃO (CRIAR, INICIAR, ENCERRAR)
  // ==========================================================================

  /**
   * Sufixo aleatório criptograficamente seguro (crypto.randomUUID ou getRandomValues,
   * disponíveis em navegadores e no WebView do Capacitor). O contador monotônico
   * garante distinção mesmo no fallback sem Web Crypto.
   */
  private idFallbackCounter = 0;

  private randomIdSuffix(): string {
    const webCrypto = (globalThis as any).crypto;
    if (webCrypto && typeof webCrypto.randomUUID === 'function') {
      return webCrypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
      const bytes = webCrypto.getRandomValues(new Uint8Array(6)) as Uint8Array;
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    this.idFallbackCounter += 1;
    return `${this.idFallbackCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Gera `live_<formato>_<timestamp>_<sufixo>` garantindo unicidade contra as sessões persistidas.
   * Preserva o prefixo `live_<formato>_` usado por ledger e filtros.
   */
  private generateUniqueSessionId(format: LiveFormat, existing: LiveSessionModel[]): string {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = `live_${format}_${Date.now()}_${this.randomIdSuffix()}`;
      if (!existing.some((s) => s.id === candidate)) {
        return candidate;
      }
    }
    throw new Error(`Não foi possível gerar um identificador único para a sessão de live após ${MAX_ATTEMPTS} tentativas.`);
  }

  public async startNewLiveSession(params: {
    format: LiveFormat;
    title: string;
    description: string;
    category: LiveSessionModel['category'];
    hostCreatorId: string;
    hostCreatorName: string;
    hostCreatorAvatar: string;
    gender: 'mulher' | 'homem' | 'trans';
    sexualOrientation: 'hetero' | 'bi' | 'gay' | 'lesbica' | 'pan';
    priceCreditsToUnlock: number;
    opponentCreatorId?: string;
    opponentCreatorName?: string;
    opponentCreatorAvatar?: string;
  }): Promise<LiveSessionModel> {
    return this.enqueue(async () => {
      const sessions = this.getLiveSessions();
      const newId = this.generateUniqueSessionId(params.format, sessions);

      let battleState: LiveBattleState | undefined;
      if (params.format === 'battle' && params.opponentCreatorId) {
        battleState = {
          battleId: `bat_${Date.now()}_${this.randomIdSuffix()}`,
          creator1: {
            id: params.hostCreatorId,
            name: params.hostCreatorName,
            avatar: params.hostCreatorAvatar,
            score: 0,
            streamUrl: params.hostCreatorAvatar,
          },
          creator2: {
            id: params.opponentCreatorId,
            name: params.opponentCreatorName || 'Criador Oponente',
            avatar: params.opponentCreatorAvatar || params.hostCreatorAvatar,
            score: 0,
            streamUrl: params.opponentCreatorAvatar || params.hostCreatorAvatar,
          },
          durationSeconds: 300,
          remainingSeconds: 300,
          status: 'active',
          rules: '1 crédito = 10 pontos de batalha. Quem acumular mais pontos ao fim dos 5 min vence.',
        };
      }

      let challengeState: LiveChallengeState | undefined;
      if (params.format === 'challenge') {
        challengeState = {
          challengeId: `chal_${Date.now()}_${this.randomIdSuffix()}`,
          title: params.title,
          description: params.description,
          targetMetric: 'credits_gifts',
          targetValue: 300,
          currentValue: 0,
          rewardDescription: 'Show exclusivo de comemoração ao vivo',
          status: 'active',
        };
      }

      const newSession: LiveSessionModel = {
        id: newId,
        format: params.format,
        title: params.title,
        description: params.description,
        category: params.category,
        hostCreatorId: params.hostCreatorId,
        hostCreatorName: params.hostCreatorName,
        hostCreatorAvatar: params.hostCreatorAvatar,
        status: 'active',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        viewerCount: 1,
        peakViewersCount: 1,
        gender: params.gender,
        sexualOrientation: params.sexualOrientation,
        genderLabel: params.gender === 'mulher' ? 'Mulher' : params.gender === 'homem' ? 'Homem' : 'Trans',
        orientationLabel: params.sexualOrientation.toUpperCase(),
        priceCreditsToUnlock: params.priceCreditsToUnlock,
        isUnlockedByUser: true, // criador já tem acesso a sua própria live
        streamMediaUrl: params.hostCreatorAvatar,
        vipStreamMediaUrl: params.hostCreatorAvatar,
        tags: [params.format.toUpperCase(), 'Ao Vivo', 'Criador JOBS'],
        isBroadcasting: true,
        isDemoStreaming: true,
        streamingProviderNote: 'Sessão iniciada em Modo DEMO com suporte a câmera local WebRTC',
        battleState,
        challengeState,
        stageParticipants: [
          {
            userId: params.hostCreatorId,
            userName: `${params.hostCreatorName} (Anfitrião)`,
            avatar: params.hostCreatorAvatar,
            role: 'host',
            isMuted: false,
            isCameraOff: false,
            joinedAt: 'Agora',
          },
        ],
        stageJoinRequests: [],
        totalGiftsReceivedCredits: 0,
        totalEligibleRevenueBrl: 0,
        creatorEarningsBrl: 0,
        platformCommissionBrl: 0,
        chatMessages: [
          {
            id: `sys_start_${Date.now()}`,
            liveStreamId: newId,
            senderId: 'system',
            senderName: 'JOBS Lives',
            text: `🔴 Transmissão iniciada por ${params.hostCreatorName}. Bem-vindos!`,
            isSystemNotice: true,
            timestamp: 'Agora',
          },
        ],
      };

      const updated = [newSession, ...sessions];
      this.saveLiveSessions(updated);
      return newSession;
    });
  }

  public async endLiveSession(sessionId: string): Promise<LiveSessionModel> {
    return this.enqueue(async () => {
      const sessions = this.getLiveSessions();
      const target = sessions.find((s) => s.id === sessionId);
      if (!target) {
        throw new Error(`Sessão de live não encontrada: ${sessionId}`);
      }

      target.status = 'completed';
      target.isBroadcasting = false;
      target.endedAt = new Date().toISOString();

      // Avaliação automática de elegibilidade para premiação por desempenho
      const rules = this.getPerformanceRules();
      const matchingRule = rules.find((r) => r.isActive);

      if (matchingRule) {
        const durationMinutes = Math.round(target.durationSeconds / 60);
        const isEligible =
          durationMinutes >= matchingRule.minDurationMinutes &&
          target.peakViewersCount >= matchingRule.minAudiencePeak;

        target.appliedRewardRuleVersion = matchingRule.version;
        if (isEligible) {
          target.performanceRewardStatus = 'pending_evaluation';
          target.performanceRewardAmountBrl = matchingRule.rewardBrl;
        } else {
          target.performanceRewardStatus = 'ineligible';
          target.performanceRewardAmountBrl = 0;
        }
      }

      this.saveLiveSessions(sessions);
      return target;
    });
  }

  // ==========================================================================
  // ENVIO DE PRESENTES VIRTUAIS & DIVISÃO 70/30 NO LEDGER
  // ==========================================================================

  public async sendVirtualGift(params: {
    sessionId: string;
    giftId: string;
    userId: string;
    userName: string;
    targetCreatorId: string;
    idempotencyKey: string;
    targetBattleCreatorId?: string; // em batalhas, para quem vai a pontuação
  }): Promise<{
    success: boolean;
    gift: VirtualGiftItem;
    newCreditsBalance: number;
    creatorEarnedBrl: number;
    platformCommissionBrl: number;
    session: LiveSessionModel;
    isReplay?: boolean;
  }> {
    return this.enqueue(async () => {
      const gift = OFFICIAL_VIRTUAL_GIFTS.find((g) => g.id === params.giftId && g.isActive);
      if (!gift) {
        throw new Error(`Presente virtual não encontrado ou inativo: ${params.giftId}`);
      }

      const sessions = this.getLiveSessions();
      const session = sessions.find((s) => s.id === params.sessionId);
      if (!session) {
        throw new Error(`Sessão de live não encontrada: ${params.sessionId}`);
      }

      if (session.status !== 'active') {
        throw new Error(`Esta transmissão já foi encerrada ou não está ativa para receber presentes.`);
      }

      // Validação prévia de saldo no livro-razão contábil
      const currentCredits = financialLedger.getUserCredits(params.userId);
      if (currentCredits < gift.creditsCost) {
        throw new Error(
          `Saldo insuficiente no livro-razão contábil. Saldo atual: ${currentCredits} créditos, Presente: ${gift.creditsCost} créditos.`
        );
      }

      // Execução atômica no livro-razão (70% Criador / 30% Plataforma)
      const tipRes = await financialLedger.sendTip({
        userId: params.userId,
        creatorId: params.targetCreatorId,
        creatorName: session.hostCreatorName,
        liveStreamId: session.id,
        creditsAmount: gift.creditsCost,
        idempotencyKey: params.idempotencyKey,
        message: `Presente Virtual: ${gift.name} (${gift.icon})`,
      });

      // Cálculo de receita da sessão
      const economicValueBrl = Number((gift.creditsCost * 0.10).toFixed(2));
      const creatorShareBrl = Number((economicValueBrl * 0.70).toFixed(2));
      const platformShareBrl = Number((economicValueBrl * 0.30).toFixed(2));

      session.totalGiftsReceivedCredits += gift.creditsCost;
      session.totalEligibleRevenueBrl = Number((session.totalEligibleRevenueBrl + economicValueBrl).toFixed(2));
      session.creatorEarningsBrl = Number((session.creatorEarningsBrl + creatorShareBrl).toFixed(2));
      session.platformCommissionBrl = Number((session.platformCommissionBrl + platformShareBrl).toFixed(2));

      // Se for Batalha, computar pontos no criador escolhido
      if (session.format === 'battle' && session.battleState && session.battleState.status === 'active') {
        const pointsAdded = gift.creditsCost * 10;
        const targetId = params.targetBattleCreatorId || session.battleState.creator1.id;
        if (targetId === session.battleState.creator1.id) {
          session.battleState.creator1.score += pointsAdded;
        } else {
          session.battleState.creator2.score += pointsAdded;
        }
      }

      // Se for Desafio Coletivo, computar meta
      if (session.format === 'challenge' && session.challengeState && session.challengeState.status === 'active') {
        session.challengeState.currentValue += gift.creditsCost;
        if (session.challengeState.currentValue >= session.challengeState.targetValue) {
          session.challengeState.status = 'completed';
        }
      }

      // Adicionar mensagem no chat da live
      const chatMsg: LiveChatMessageItem = {
        id: `gift_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        liveStreamId: session.id,
        senderId: params.userId,
        senderName: params.userName,
        text: `Enviou ${gift.icon} ${gift.name} (${gift.creditsCost} créditos 💎)!`,
        giftCost: gift.creditsCost,
        giftIcon: gift.icon,
        giftName: gift.name,
        timestamp: 'Agora',
      };
      session.chatMessages = [...session.chatMessages, chatMsg];

      // Computar pontos de engajamento do usuário (1 crédito = 5 pontos de fã, não monetizáveis)
      this.addFanParticipationPoints(params.userId, gift.creditsCost * 5);

      this.saveLiveSessions(sessions);

      return {
        success: true,
        gift,
        newCreditsBalance: tipRes.newCreditsBalance,
        creatorEarnedBrl: tipRes.creatorEarnedBrl,
        platformCommissionBrl: platformShareBrl,
        session,
      };
    });
  }

  // ==========================================================================
  // SALAS INTERATIVAS (PALCO, PERMISSÕES, ENTRADA E SAÍDA)
  // ==========================================================================

  public async requestJoinStage(sessionId: string, user: { id: string; name: string; avatar: string }): Promise<void> {
    const sessions = this.getLiveSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Live não encontrada');

    const alreadyInStage = session.stageParticipants.some((p) => p.userId === user.id);
    if (alreadyInStage) throw new Error('Usuário já está no palco');

    const alreadyRequested = session.stageJoinRequests.some((r) => r.userId === user.id && r.status === 'pending');
    if (alreadyRequested) return;

    session.stageJoinRequests.push({
      id: `req_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      requestedAt: 'Agora',
      status: 'pending',
    });

    this.saveLiveSessions(sessions);
  }

  public async approveStageRequest(sessionId: string, requestId: string): Promise<void> {
    const sessions = this.getLiveSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Live não encontrada');

    const req = session.stageJoinRequests.find((r) => r.id === requestId);
    if (!req) return;

    req.status = 'approved';
    session.stageParticipants.push({
      userId: req.userId,
      userName: req.userName,
      avatar: req.avatar,
      role: 'guest',
      isMuted: false,
      isCameraOff: false,
      joinedAt: 'Agora',
    });

    this.saveLiveSessions(sessions);
  }

  public async removeParticipantFromStage(sessionId: string, userId: string): Promise<void> {
    const sessions = this.getLiveSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    session.stageParticipants = session.stageParticipants.filter((p) => p.userId !== userId);
    this.saveLiveSessions(sessions);
  }

  // ==========================================================================
  // DESAFIOS & VOTAÇÃO
  // ==========================================================================

  /**
   * Registra voto consensual em opção de desafio coletivo de Live.
   * 
   * Requisitos de integridade:
   * 1. Identidade do participante obrigatória (não vazia).
   * 2. Sessão de transmissão ativa e transmitindo.
   * 3. Desafio presente e com status ativo.
   * 4. Opção de voto existente no catálogo do desafio.
   * 5. Prevenção estrita contra votos duplicados pela mesma identidade.
   * 6. Persistência atômica da contagem e do registro rastreável do votante.
   * 
   * Limitação documentada:
   * A persistência em localStorage atua como proteção e integridade no cliente (anti-duplicação local).
   * Em produção com infraestrutura dedicada, a validação autoritativa deve ser complementada
   * por verificação assinada no servidor de backend/Firestore.
   */
  public async voteOnChallenge(
    sessionId: string,
    optionId: string,
    participantId: string
  ): Promise<{
    success: boolean;
    session: LiveSessionModel;
    votedOption: { id: string; label: string; votes: number };
    participantId: string;
  }> {
    return this.enqueue(async () => {
      // 1. Identidade do participante obrigatória
      if (!participantId || typeof participantId !== 'string' || participantId.trim() === '') {
        throw new Error('Identidade do participante é obrigatória para registrar o voto no desafio.');
      }
      const trimmedParticipantId = participantId.trim();

      // 2. Transmissão existente
      const sessions = this.getLiveSessions();
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new Error(`Sessão de transmissão não encontrada: ${sessionId}`);
      }

      // 3. Transmissão ativa
      if (session.status !== 'active' || !session.isBroadcasting) {
        throw new Error('Transmissão encerrada ou inativa. Votação de desafios indisponível.');
      }

      // 4. Desafio existente e ativo
      if (!session.challengeState) {
        throw new Error('Esta transmissão não possui um desafio interativo configurado.');
      }

      if (session.challengeState.status !== 'active') {
        throw new Error('Desafio inativo ou já finalizado. Votos não são mais aceitos.');
      }

      // 5. Opções configuradas e opção existente
      if (!session.challengeState.optionsForVote || session.challengeState.optionsForVote.length === 0) {
        throw new Error('Não há opções de votação configuradas para este desafio.');
      }

      const opt = session.challengeState.optionsForVote.find((o) => o.id === optionId);
      if (!opt) {
        throw new Error(`Opção de votação inexistente no desafio: ${optionId}`);
      }

      // 6. Prevenção contra voto duplicado
      const votersMap = session.challengeState.voters || {};
      const votedList = session.challengeState.votedParticipantIds || [];
      const hasVoted = Boolean(votersMap[trimmedParticipantId]) || votedList.includes(trimmedParticipantId);

      if (hasVoted) {
        throw new Error(
          `Voto duplicado rejeitado. O participante "${trimmedParticipantId}" já registrou seu voto neste desafio.`
        );
      }

      // 7. Modificação e persistência atômica
      opt.votes += 1;

      // Se métrica for contagem de votos da audiência, incrementa progresso
      if (session.challengeState.targetMetric === 'audience_votes') {
        session.challengeState.currentValue += 1;
        if (session.challengeState.currentValue >= session.challengeState.targetValue) {
          session.challengeState.status = 'completed';
        }
      }

      // Registro rastreável do votante
      if (!session.challengeState.voters) {
        session.challengeState.voters = {};
      }
      session.challengeState.voters[trimmedParticipantId] = optionId;

      if (!session.challengeState.votedParticipantIds) {
        session.challengeState.votedParticipantIds = [];
      }
      session.challengeState.votedParticipantIds.push(trimmedParticipantId);

      if (!session.challengeState.votedAtTimestamps) {
        session.challengeState.votedAtTimestamps = {};
      }
      session.challengeState.votedAtTimestamps[trimmedParticipantId] = new Date().toISOString();

      this.saveLiveSessions(sessions);

      return {
        success: true,
        session,
        votedOption: opt,
        participantId: trimmedParticipantId,
      };
    });
  }

  /**
   * Consulta se um participante já registrou voto no desafio da sessão
   */
  public hasParticipantVoted(sessionId: string, participantId: string): boolean {
    if (!participantId || typeof participantId !== 'string') return false;
    const session = this.getSessionById(sessionId);
    if (!session || !session.challengeState) return false;
    const trimmed = participantId.trim();
    const voters = session.challengeState.voters || {};
    const votedList = session.challengeState.votedParticipantIds || [];
    return Boolean(voters[trimmed]) || votedList.includes(trimmed);
  }

  // ==========================================================================
  // PONTOS, RANKINGS & DISTINTIVOS (NÃO MONETIZÁVEIS)
  // ==========================================================================

  public addFanParticipationPoints(userId: string, points: number): void {
    const raw = localStorage.getItem(STORAGE_KEY_POINTS) || '{}';
    try {
      const map = JSON.parse(raw);
      map[userId] = (map[userId] || 0) + points;
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(map));
    } catch {
      // no-op
    }
  }

  public getCreatorLeaderboard(period: 'hoje' | 'semana' | 'mes' | 'geral' = 'semana'): CreatorLeaderboardEntry[] {
    return [
      {
        rank: 1,
        creatorId: 'valentina',
        creatorName: 'Valentina Rossi',
        creatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        category: 'Boudoir & Shows VIP',
        totalPoints: 12450,
        battlesWon: 14,
        totalLiveHours: 32.5,
        totalGiftsReceived: 1240,
        badgeLevel: 'lendario',
        trend: 'up',
      },
      {
        rank: 2,
        creatorId: 'isabella',
        creatorName: 'Isabella Fontes',
        creatorAvatar: '/src/assets/images/profile_isabella_1791856837043.jpg',
        category: 'Moda & Batalhas Sensuais',
        totalPoints: 10890,
        battlesWon: 11,
        totalLiveHours: 28.0,
        totalGiftsReceived: 980,
        badgeLevel: 'diamante',
        trend: 'up',
      },
      {
        rank: 3,
        creatorId: 'camila',
        creatorName: 'Camila Duarte',
        creatorAvatar: '/src/assets/images/profile_camila_1791856837360.jpg',
        category: 'Conversas & Shows Femininos',
        totalPoints: 8940,
        battlesWon: 8,
        totalLiveHours: 24.2,
        totalGiftsReceived: 720,
        badgeLevel: 'ouro',
        trend: 'neutral',
      },
      {
        rank: 4,
        creatorId: 'gabriel',
        creatorName: 'Gabriel Menezes',
        creatorAvatar: '/src/assets/images/profile_gabriel_1791856836359.jpg',
        category: 'Fitness & Desafios Noturnos',
        totalPoints: 6720,
        battlesWon: 6,
        totalLiveHours: 19.5,
        totalGiftsReceived: 510,
        badgeLevel: 'prata',
        trend: 'down',
      },
      {
        rank: 5,
        creatorId: 'larissa',
        creatorName: 'Larissa Fox',
        creatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        category: 'Cosplay & Mesas Redondas',
        totalPoints: 5410,
        battlesWon: 4,
        totalLiveHours: 16.0,
        totalGiftsReceived: 420,
        badgeLevel: 'bronze',
        trend: 'up',
      },
    ];
  }

  // ==========================================================================
  // MODERAÇÃO DE LIVES
  // ==========================================================================

  public reportLiveSession(params: {
    sessionId: string;
    reporterId: string;
    reason: string;
    category: string;
  }): void {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS) || '[]';
    try {
      const list = JSON.parse(raw);
      list.unshift({
        id: `rep_live_${Date.now()}`,
        ...params,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(list));
    } catch {
      // no-op
    }
  }

  public getModerationReports(): any[] {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // CHAT & LIKES DE TRANSMISSÃO
  // ==========================================================================

  public addChatMessage(sessionId: string, message: LiveChatMessageItem): LiveSessionModel | null {
    const sessions = this.getLiveSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    session.chatMessages = [...session.chatMessages, message];
    this.saveLiveSessions(sessions);
    return session;
  }

  public getSessionLikes(sessionId: string): number {
    const raw = localStorage.getItem(STORAGE_KEY_LIKES) || '{}';
    try {
      const map = JSON.parse(raw);
      if (typeof map[sessionId] === 'number') return map[sessionId];
      const session = this.getSessionById(sessionId);
      const initial = session ? Math.max(12, Math.round(session.viewerCount * 0.4)) : 0;
      map[sessionId] = initial;
      localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(map));
      return initial;
    } catch {
      return 0;
    }
  }

  public incrementSessionLikes(sessionId: string, amount: number = 1): number {
    const raw = localStorage.getItem(STORAGE_KEY_LIKES) || '{}';
    try {
      const map = JSON.parse(raw);
      const current = typeof map[sessionId] === 'number' ? map[sessionId] : this.getSessionLikes(sessionId);
      const next = current + Math.max(1, amount);
      map[sessionId] = next;
      localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(map));
      return next;
    } catch {
      return 1;
    }
  }
}

export const liveStreamService = new LiveStreamService();
