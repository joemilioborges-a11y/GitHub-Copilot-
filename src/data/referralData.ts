import { ReferralMember, ReferralPyramidData } from '../types';

const REFERRAL_CAMPAIGN_ACTIVE_KEY = 'jhobs_referral_campaign_active';
const USER_REFERRAL_DATA_KEY = 'jhobs_user_referral_data';

// Default initial data for user's viral pyramid network
const INITIAL_REFERRAL_MEMBERS: ReferralMember[] = [
  {
    id: 'ref_01',
    name: 'Matheus Costa',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    level: 1,
    joinedAt: 'Hoje às 18:42',
    creditsPurchased: 500,
    rewardEarnedBrl: 45.0, // R$ 15 fixo + R$ 30 (20% de R$ 150)
    status: 'active',
  },
  {
    id: 'ref_02',
    name: 'Fernanda Rocha',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    level: 1,
    joinedAt: 'Ontem às 22:15',
    creditsPurchased: 250,
    rewardEarnedBrl: 30.0, // R$ 15 fixo + R$ 15
    status: 'active',
  },
  {
    id: 'ref_03',
    name: 'Rodrigo Alencar (Rede de Matheus)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    level: 2,
    joinedAt: 'Ontem às 14:08',
    creditsPurchased: 200,
    rewardEarnedBrl: 15.0, // R$ 5 fixo + R$ 10 (10% de R$ 100)
    status: 'active',
  },
  {
    id: 'ref_04',
    name: 'Lucas P. (Rede Nível 3)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    level: 3,
    joinedAt: 'Há 2 dias',
    creditsPurchased: 100,
    rewardEarnedBrl: 7.5, // R$ 2,50 fixo + R$ 5
    status: 'active',
  },
];

export const INITIAL_USER_REFERRAL_DATA: ReferralPyramidData = {
  userReferralCode: 'JH-89214',
  userReferralLink: 'https://jhobs.vip/convite/JH-89214',
  isCampaignActive: true,
  level1Count: 14,
  level2Count: 38,
  level3Count: 82,
  totalMembersCount: 134,
  totalEarnedBrl: 647.5,
  availableForWithdrawBrl: 425.0, // Pronto para saque via PIX imediato
  totalWithdrawnBrl: 222.5,
  recentReferrals: INITIAL_REFERRAL_MEMBERS,
};

/**
 * Checks if the referral pyramid campaign is currently active in the platform.
 * If disabled by admin, users cannot generate new referral rewards.
 */
export function isReferralCampaignActive(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(REFERRAL_CAMPAIGN_ACTIVE_KEY);
    return saved !== null ? saved === 'true' : true;
  } catch (e) {
    return true;
  }
}

/**
 * Admin action: toggle or set referral campaign active/inactive.
 */
export function setReferralCampaignActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFERRAL_CAMPAIGN_ACTIVE_KEY, String(active));
    window.dispatchEvent(
      new CustomEvent('jhobs:referral_status_changed', { detail: { active } })
    );
  } catch (e) {
    console.error('Failed to update referral campaign status', e);
  }
}

/**
 * Gets user's referral pyramid state from storage.
 */
export function getUserReferralData(): ReferralPyramidData {
  const isCampaignActive = isReferralCampaignActive();
  if (typeof window === 'undefined') {
    return { ...INITIAL_USER_REFERRAL_DATA, isCampaignActive };
  }
  try {
    const saved = localStorage.getItem(USER_REFERRAL_DATA_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, isCampaignActive };
    }
    return { ...INITIAL_USER_REFERRAL_DATA, isCampaignActive };
  } catch (e) {
    return { ...INITIAL_USER_REFERRAL_DATA, isCampaignActive };
  }
}

/**
 * Saves user's referral pyramid data to storage.
 */
export function saveUserReferralData(data: ReferralPyramidData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_REFERRAL_DATA_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent('jhobs:referral_updated', { detail: data })
    );
  } catch (e) {
    console.error('Failed to save referral data', e);
  }
}

const RANDOM_NAMES = [
  'Bruno Siqueira',
  'Juliana Paes',
  'Tiago Medeiros',
  'Larissa Duarte',
  'Guilherme Prado',
  'Natália Vasconcelos',
  'Felipe Antunes',
  'Camila Vargas',
];

const RANDOM_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
];

/**
 * Simulates a new friend joining via the user's pyramid referral link.
 * Generates instant cash reward directly into PIX withdrawable balance!
 */
export function simulateNewReferralJoin(level: 1 | 2 | 3 = 1): {
  member: ReferralMember;
  rewardBrl: number;
  newTotalAvailable: number;
} {
  const current = getUserReferralData();

  const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const randomAvatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
  const randomPurchasedCredits = [150, 250, 500, 1000][Math.floor(Math.random() * 4)];

  let instantBonus = 15.0; // Level 1
  let commissionPct = 0.20; // 20%
  if (level === 2) {
    instantBonus = 5.0;
    commissionPct = 0.10;
  } else if (level === 3) {
    instantBonus = 2.5;
    commissionPct = 0.05;
  }

  const commission = (randomPurchasedCredits * 0.10) * commissionPct;
  const totalReward = Number((instantBonus + commission).toFixed(2));

  const newMember: ReferralMember = {
    id: `ref_${Date.now()}`,
    name: randomName,
    avatar: randomAvatar,
    level,
    joinedAt: 'Agora mesmo',
    creditsPurchased: randomPurchasedCredits,
    rewardEarnedBrl: totalReward,
    status: 'active',
  };

  const updated: ReferralPyramidData = {
    ...current,
    level1Count: level === 1 ? current.level1Count + 1 : current.level1Count,
    level2Count: level === 2 ? current.level2Count + 1 : current.level2Count,
    level3Count: level === 3 ? current.level3Count + 1 : current.level3Count,
    totalMembersCount: current.totalMembersCount + 1,
    totalEarnedBrl: Number((current.totalEarnedBrl + totalReward).toFixed(2)),
    availableForWithdrawBrl: Number((current.availableForWithdrawBrl + totalReward).toFixed(2)),
    recentReferrals: [newMember, ...current.recentReferrals.slice(0, 9)],
  };

  saveUserReferralData(updated);

  return {
    member: newMember,
    rewardBrl: totalReward,
    newTotalAvailable: updated.availableForWithdrawBrl,
  };
}

/**
 * Executes withdrawal of referral rewards to bank account via PIX.
 */
export function withdrawReferralEarnings(
  amountBrl: number,
  pixKey: string,
  pixType: string,
  bank: string
): { success: boolean; endToEndId: string; newBalance: number } {
  const current = getUserReferralData();
  const validAmount = Math.min(amountBrl, current.availableForWithdrawBrl);

  const newAvailable = Math.max(0, current.availableForWithdrawBrl - validAmount);
  const newWithdrawn = current.totalWithdrawnBrl + validAmount;

  const updated: ReferralPyramidData = {
    ...current,
    availableForWithdrawBrl: Number(newAvailable.toFixed(2)),
    totalWithdrawnBrl: Number(newWithdrawn.toFixed(2)),
  };

  saveUserReferralData(updated);

  const endToEndId = `E${Date.now()}902148${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    endToEndId,
    newBalance: updated.availableForWithdrawBrl,
  };
}

/**
 * Pre-formatted promotional copies for WhatsApp, Telegram, and social networks.
 */
export function getReferralShareCopy(link: string) {
  const headline = '🔥 Venha para o Jhobs 18+ e ganhe 50 créditos no cadastro!';
  const fullText = `🔥 Olha esse app que acabei de conhecer! No Jhobs 18+ tem matches com pessoas reais, transmissões de lives ao vivo e fotos exclusivas nos cofres VIP.

Cadastre-se pelo meu link exclusivo e comece com bônus de boas-vindas:
👉 ${link}

Aproveite que é 100% gratuito e seguro! 💎`;

  return {
    headline,
    fullText,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(fullText)}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`,
  };
}
