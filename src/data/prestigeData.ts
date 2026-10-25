import { FanTierInfo, FanTierLevel, PrestigePerkDetail } from '../types';

export const PRESTIGE_TIERS: FanTierInfo[] = [
  {
    level: 'bronze',
    name: 'Bronze Pioneiro',
    badge: 'Bronze 🥉',
    medalName: 'Medalha Bronze Pioneiro',
    iconName: 'Medal',
    minCredits: 0,
    nextTierCredits: 250,
    bgGradient: 'from-amber-950/70 via-[#1c120c] to-[#12121a]',
    borderClass: 'border-amber-700/60',
    badgeColorClass: 'bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-amber-100 border-amber-600/70',
    avatarRingClass: 'ring-2 ring-amber-700/70 shadow-sm',
    textColor: 'text-amber-400',
    glowColor: 'rgba(180, 83, 9, 0.25)',
    description: 'Início da sua jornada VIP na plataforma Jhobs.',
    perks: [
      'Acesso ao catálogo de fotos públicas e prévias',
      'Desbloqueio avulso de fotos VIP nos cofres',
      'Chat direto e matches com criadores',
    ],
    detailedPerks: [
      {
        id: 'vault_access_basic',
        title: 'Acesso Básico ao Cofre',
        description: 'Permite desbloquear mídias exclusivas de qualquer criador com créditos.',
        iconName: 'Lock',
        isUnlocked: true,
        category: 'vault',
      },
      {
        id: 'chat_basic',
        title: 'Chat Direto & Matches',
        description: 'Interação por mensagens e envio de mimos para criadores curtidos.',
        iconName: 'MessageCircle',
        isUnlocked: true,
        category: 'chat',
      },
      {
        id: 'history_basic',
        title: 'Histórico & Recibos',
        description: 'Histórico detalhado de transações e comprovantes de recargas.',
        iconName: 'Clock',
        isUnlocked: true,
        category: 'vip',
      },
    ],
  },
  {
    level: 'prata',
    name: 'Prata Conquistador',
    badge: 'Prata VIP 🥈',
    medalName: 'Medalha Prata Conquistador',
    iconName: 'Award',
    minCredits: 250,
    nextTierCredits: 750,
    bgGradient: 'from-slate-800/80 via-[#182030] to-[#12121a]',
    borderClass: 'border-slate-400/70 shadow-slate-900/40',
    badgeColorClass: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border-white font-black shadow-md',
    avatarRingClass: 'ring-2 ring-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.4)]',
    textColor: 'text-slate-200',
    glowColor: 'rgba(203, 213, 225, 0.35)',
    description: 'Apoiador regular com privilégios de destaque em chats e transmissões.',
    perks: [
      'Selo Prata reluzente no perfil e nas mensagens',
      'Destaque na fila de espectadores em transmissões',
      '+5% de bônus em créditos diários no check-in',
      'Todas as vantagens do Nível Bronze',
    ],
    detailedPerks: [
      {
        id: 'badge_silver',
        title: 'Medalha Prata nos Chats',
        description: 'Suas mensagens ganham ícone e moldura prateada visível aos criadores.',
        iconName: 'Award',
        isUnlocked: true,
        category: 'chat',
      },
      {
        id: 'live_priority',
        title: 'Destaque em Transmissões',
        description: 'Seu nome aparece na lista de membros de destaque nas lives ao vivo.',
        iconName: 'Activity',
        isUnlocked: true,
        category: 'visual',
      },
      {
        id: 'bonus_silver',
        title: '+5% Bônus em Check-in',
        description: 'Bônus automático de créditos ao completar desafios da plataforma.',
        iconName: 'Coins',
        isUnlocked: true,
        category: 'vip',
      },
    ],
  },
  {
    level: 'ouro',
    name: 'Ouro Nobreza',
    badge: 'Ouro VIP 🥇',
    medalName: 'Medalha Ouro Nobreza',
    iconName: 'Crown',
    minCredits: 750,
    nextTierCredits: 1500,
    bgGradient: 'from-amber-950/85 via-[#2a1a04] to-[#141424]',
    borderClass: 'border-amber-400/90 shadow-amber-950/60',
    badgeColorClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-950/60',
    avatarRingClass: 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)]',
    textColor: 'text-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    description: 'Apoiador de alto prestígio com acesso preferencial e modo invisível.',
    perks: [
      'Selo Ouro de Prestígio VIP no perfil e nas conversas',
      'Prioridade de resposta de criadores verificados',
      'Modo de Navegação Invisível (visitar perfis sem registro)',
      'Notificações instantâneas push de criadores favoritos',
      'Todas as vantagens do Nível Prata',
    ],
    detailedPerks: [
      {
        id: 'gold_badge',
        title: 'Medalha Dourada de Nobreza',
        description: 'Selo oficial com gradiente ouro e anel luminoso em todas as abas.',
        iconName: 'Crown',
        isUnlocked: true,
        category: 'visual',
      },
      {
        id: 'invisible_mode',
        title: 'Modo Invisível no Discover',
        description: 'Explore perfis e cofres sem que sua visualização seja computada.',
        iconName: 'EyeOff',
        isUnlocked: true,
        category: 'vip',
      },
      {
        id: 'priority_chat',
        title: 'Fila Prioritária de Mensagens',
        description: 'Seus chats são fixados no topo da caixa de entrada do criador.',
        iconName: 'Sparkles',
        isUnlocked: true,
        category: 'chat',
      },
    ],
  },
  {
    level: 'platina',
    name: 'Platina Elite',
    badge: 'Platina Elite 💎',
    medalName: 'Medalha Platina Holográfica',
    iconName: 'Gem',
    minCredits: 1500,
    nextTierCredits: 3000,
    bgGradient: 'from-cyan-950/90 via-[#0a1e2f] to-[#141426]',
    borderClass: 'border-cyan-400/80 shadow-cyan-950/60',
    badgeColorClass: 'bg-gradient-to-r from-cyan-400 via-sky-200 to-teal-400 text-slate-950 border-cyan-300 font-black shadow-xl shadow-cyan-950/70',
    avatarRingClass: 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.7)]',
    textColor: 'text-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.45)',
    description: 'Elite com acesso antecipado a mídias e moldura ciano neon.',
    perks: [
      'Moldura de Avatar Ciano Neon com animação de pulso',
      'Pré-estreia exclusiva de fotos dos cofres 24h antes do público',
      '1 ingresso cortesia mensal para show íntimo de live privada',
      'Canal de suporte e auditoria VIP direto 24/7',
      'Todas as vantagens do Nível Ouro',
    ],
    detailedPerks: [
      {
        id: 'cyan_neon_frame',
        title: 'Moldura Ciano Neon no Avatar',
        description: 'Seu avatar irradia luz ciano holográfica em comentários e perfil.',
        iconName: 'Shield',
        isUnlocked: true,
        category: 'visual',
      },
      {
        id: 'early_vault_access',
        title: 'Pré-estreia no Cofre VIP (24h)',
        description: 'Acesse fotos e vídeos antes do lançamento para os demais usuários.',
        iconName: 'Lock',
        isUnlocked: true,
        category: 'vault',
      },
      {
        id: 'vip_support',
        title: 'Suporte VIP Exclusivo 24/7',
        description: 'Atendimento prioritário sem fila pelo concierge Jhobs.',
        iconName: 'Headphones',
        isUnlocked: true,
        category: 'vip',
      },
    ],
  },
  {
    level: 'diamante',
    name: 'Diamante Imperial',
    badge: 'Diamante Black 👑',
    medalName: 'Medalha Coroa Diamante Imperial',
    iconName: 'Crown',
    minCredits: 3000,
    nextTierCredits: 5000,
    bgGradient: 'from-purple-950/90 via-[#180929] to-[#0e0717]',
    borderClass: 'border-purple-400/90 shadow-purple-950/70',
    badgeColorClass: 'bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 text-slate-950 border-purple-300 font-black shadow-xl shadow-purple-950/80',
    avatarRingClass: 'ring-2 ring-purple-400 shadow-[0_0_24px_rgba(192,132,252,0.8)]',
    textColor: 'text-purple-300',
    glowColor: 'rgba(192, 132, 252, 0.5)',
    description: 'Nível imperial com destaque no topo de rankings e bônus de afinidade.',
    perks: [
      'Selo Diamante Imperial com partículas no avatar',
      'Badge de "Maior Apoiador" nos rankings dos criadores',
      'Multiplicador 2x de compatibilidade nos matches (+90%)',
      '100 créditos de bônus mensal de fidelidade Jhobs',
      'Todas as vantagens do Nível Platina',
    ],
    detailedPerks: [
      {
        id: 'top_supporter_badge',
        title: 'Badge Maior Apoiador',
        description: 'Seu perfil encabeça o ranking VIP dos criadores que você apoia.',
        iconName: 'Star',
        isUnlocked: true,
        category: 'visual',
      },
      {
        id: 'affinity_boost',
        title: 'Boost 2x de Compatibilidade',
        description: 'Algoritmo de descoberta prioriza matches de alta química (+90%).',
        iconName: 'Flame',
        isUnlocked: true,
        category: 'chat',
      },
      {
        id: 'monthly_credits_gift',
        title: 'Mesada VIP: 100 💎/mês',
        description: 'Créditos gratuitos todo dia 1º para desfrutar como preferir.',
        iconName: 'Coins',
        isUnlocked: true,
        category: 'vip',
      },
    ],
  },
  {
    level: 'supremo',
    name: 'Mestre Supremo',
    badge: 'Supremo Celestial 🌌',
    medalName: 'Medalha Celestial Jhobs Royalty',
    iconName: 'Sparkles',
    minCredits: 5000,
    nextTierCredits: null,
    bgGradient: 'from-rose-950/95 via-[#230919] to-[#0d0714]',
    borderClass: 'border-rose-400/90 shadow-rose-950/80',
    badgeColorClass: 'bg-gradient-to-r from-rose-500 via-amber-300 to-purple-500 text-slate-950 border-rose-300 font-black shadow-2xl shadow-rose-950/90',
    avatarRingClass: 'ring-2 ring-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.9)] animate-pulse',
    textColor: 'text-rose-300',
    glowColor: 'rgba(244, 63, 94, 0.6)',
    description: 'Patamar mitológico supremo. Acesso irrestrito e aura real no perfil.',
    perks: [
      'Aura Cósmica Celestial no avatar com animação contínua',
      'Acesso ilimitado e direto a shows íntimos sem fila',
      'Personalização de tema e cor de destaque no perfil',
      'Concierge pessoal dedicado para pedidos e reservas especiais',
      'Todos os benefícios dos patamares anteriores vitalícios',
    ],
    detailedPerks: [
      {
        id: 'cosmic_aura',
        title: 'Aura Cósmica no Perfil',
        description: 'Efeito visual de partículas cósmicas e luz pulsante no seu avatar.',
        iconName: 'Sparkles',
        isUnlocked: true,
        category: 'visual',
      },
      {
        id: 'unlimited_live_pass',
        title: 'Passe Livre em Shows Íntimos',
        description: 'Entre imediatamente em qualquer momento privado ao vivo.',
        iconName: 'Lock',
        isUnlocked: true,
        category: 'vault',
      },
      {
        id: 'concierge_personal',
        title: 'Concierge Pessoal Jhobs',
        description: 'Atendimento exclusivo via canal privativo com a gestão da plataforma.',
        iconName: 'Crown',
        isUnlocked: true,
        category: 'vip',
      },
    ],
  },
];

const EQUIPPED_MEDAL_KEY = 'jhobs_equipped_prestige_medal';
const PRESTIGE_SETTINGS_KEY = 'jhobs_prestige_settings';

export interface PrestigeSettings {
  avatarFrameEnabled: boolean;
  chatBadgeEnabled: boolean;
  invisibleModeEnabled: boolean;
  selectedAura: 'default' | 'gold' | 'cyan' | 'purple' | 'cosmic';
}

export const DEFAULT_PRESTIGE_SETTINGS: PrestigeSettings = {
  avatarFrameEnabled: true,
  chatBadgeEnabled: true,
  invisibleModeEnabled: false,
  selectedAura: 'default',
};

/**
 * Returns the active prestige tier based on total credits spent.
 */
export function getPrestigeTier(creditsSpent: number): FanTierInfo {
  for (let i = PRESTIGE_TIERS.length - 1; i >= 0; i--) {
    if (creditsSpent >= PRESTIGE_TIERS[i].minCredits) {
      return PRESTIGE_TIERS[i];
    }
  }
  return PRESTIGE_TIERS[0];
}

/**
 * Returns list of all medals with unlocked status and progress percentage.
 */
export function getPrestigeMedalsList(creditsSpent: number) {
  const currentTier = getPrestigeTier(creditsSpent);

  return PRESTIGE_TIERS.map((tier) => {
    const isUnlocked = creditsSpent >= tier.minCredits;
    const isCurrent = currentTier.level === tier.level;

    let progressPercent = 0;
    if (isUnlocked) {
      progressPercent = 100;
    } else {
      progressPercent = Math.min(100, Math.max(0, (creditsSpent / tier.minCredits) * 100));
    }

    const creditsNeeded = Math.max(0, tier.minCredits - creditsSpent);

    return {
      tier,
      isUnlocked,
      isCurrent,
      progressPercent: Math.round(progressPercent),
      creditsNeeded,
    };
  });
}

/**
 * Gets user's equipped medal identifier from localStorage.
 */
export function getEquippedMedal(creditsSpent: number): FanTierLevel {
  if (typeof window === 'undefined') return getPrestigeTier(creditsSpent).level;
  try {
    const saved = localStorage.getItem(EQUIPPED_MEDAL_KEY);
    const activeTier = getPrestigeTier(creditsSpent);
    // User can only equip a medal they have unlocked
    if (saved) {
      const found = PRESTIGE_TIERS.find((t) => t.level === saved);
      if (found && creditsSpent >= found.minCredits) {
        return found.level;
      }
    }
    return activeTier.level;
  } catch (e) {
    return getPrestigeTier(creditsSpent).level;
  }
}

/**
 * Saves user's equipped medal to localStorage.
 */
export function setEquippedMedal(level: FanTierLevel): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EQUIPPED_MEDAL_KEY, level);
    window.dispatchEvent(new CustomEvent('jhobs:prestige_updated', { detail: { equippedMedal: level } }));
  } catch (e) {
    console.error('Failed to save equipped medal', e);
  }
}

/**
 * Gets user prestige settings (avatar frame, invisible mode, etc.).
 */
export function getPrestigeSettings(): PrestigeSettings {
  if (typeof window === 'undefined') return DEFAULT_PRESTIGE_SETTINGS;
  try {
    const saved = localStorage.getItem(PRESTIGE_SETTINGS_KEY);
    return saved ? { ...DEFAULT_PRESTIGE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PRESTIGE_SETTINGS;
  } catch (e) {
    return DEFAULT_PRESTIGE_SETTINGS;
  }
}

/**
 * Updates user prestige settings.
 */
export function updatePrestigeSettings(partial: Partial<PrestigeSettings>): PrestigeSettings {
  if (typeof window === 'undefined') return DEFAULT_PRESTIGE_SETTINGS;
  try {
    const current = getPrestigeSettings();
    const updated = { ...current, ...partial };
    localStorage.setItem(PRESTIGE_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('jhobs:prestige_updated', { detail: { settings: updated } }));
    return updated;
  } catch (e) {
    return DEFAULT_PRESTIGE_SETTINGS;
  }
}
