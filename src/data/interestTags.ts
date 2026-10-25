import { Profile } from '../types';

export type TagCategory = 'all' | 'fitness' | 'cultura' | 'estilo' | 'exclusivo' | 'lifestyle';

export interface InterestTag {
  id: string;
  name: string; // e.g. '#Fitness'
  cleanName: string; // e.g. 'Fitness'
  category: TagCategory;
  categoryLabel: string;
  baseInteractions: number;
  userInteractions: number;
  totalInteractions: number;
  trendStatus: 'hot' | 'rising' | 'popular' | 'new';
  trendDelta: string; // e.g. '+34%'
  description: string;
  gradient: string;
  badgeColor: string;
}

export const TAG_CATEGORIES: { id: TagCategory; label: string }[] = [
  { id: 'all', label: 'Todas as Tags' },
  { id: 'fitness', label: '💪 Fitness & Corpo' },
  { id: 'cultura', label: '🎮 Cosplay & Geek' },
  { id: 'estilo', label: '🎨 Estilo & Alternativo' },
  { id: 'exclusivo', label: '💎 VIP & Sensual' },
  { id: 'lifestyle', label: '✨ Lifestyle' },
];

export const INITIAL_INTEREST_TAGS: Omit<InterestTag, 'userInteractions' | 'totalInteractions'>[] = [
  {
    id: 'fitness',
    name: '#Fitness',
    cleanName: 'Fitness',
    category: 'fitness',
    categoryLabel: 'Fitness & Corpo',
    baseInteractions: 2480,
    trendStatus: 'hot',
    trendDelta: '+42%',
    description: 'Rotina de treinos pesados, físicos definidos, academia, crossfit e nutrição',
    gradient: 'from-amber-500 to-orange-500',
    badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  },
  {
    id: 'cosplay',
    name: '#Cosplay',
    cleanName: 'Cosplay',
    category: 'cultura',
    categoryLabel: 'Cosplay & Geek',
    baseInteractions: 2190,
    trendStatus: 'hot',
    trendDelta: '+38%',
    description: 'Fantasias conceituais, personagens de animes, jogos, produções criativas e sensuais',
    gradient: 'from-pink-500 to-rose-500',
    badgeColor: 'text-pink-300 border-pink-500/40 bg-pink-500/10',
  },
  {
    id: 'alternativo',
    name: '#Alternativo',
    cleanName: 'Alternativo',
    category: 'estilo',
    categoryLabel: 'Estilo & Alternativo',
    baseInteractions: 1980,
    trendStatus: 'rising',
    trendDelta: '+29%',
    description: 'Estética underground, personalidade sem tabus, gótico suave, grunge e atitude autêntica',
    gradient: 'from-purple-500 to-indigo-500',
    badgeColor: 'text-purple-300 border-purple-500/40 bg-purple-500/10',
  },
  {
    id: 'boudoir',
    name: '#Boudoir',
    cleanName: 'Boudoir',
    category: 'exclusivo',
    categoryLabel: 'VIP & Sensual',
    baseInteractions: 1820,
    trendStatus: 'rising',
    trendDelta: '+25%',
    description: 'Ensaios fotográficos íntimos, lingeries sofisticadas de renda e jogos de luz',
    gradient: 'from-rose-500 to-red-500',
    badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  },
  {
    id: 'gamer',
    name: '#Gamer',
    cleanName: 'Gamer',
    category: 'cultura',
    categoryLabel: 'Cosplay & Geek',
    baseInteractions: 1640,
    trendStatus: 'rising',
    trendDelta: '+22%',
    description: 'Setups iluminados, streaming, games competitivos, consoles e bate-papo nerd',
    gradient: 'from-cyan-500 to-blue-500',
    badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  },
  {
    id: 'tatuada',
    name: '#Tatuada',
    cleanName: 'Tatuada',
    category: 'estilo',
    categoryLabel: 'Estilo & Alternativo',
    baseInteractions: 1530,
    trendStatus: 'popular',
    trendDelta: '+19%',
    description: 'Tatuagens marcantes, piercings, modificação corporal e arte na pele',
    gradient: 'from-fuchsia-500 to-purple-600',
    badgeColor: 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10',
  },
  {
    id: 'sensual',
    name: '#Sensual',
    cleanName: 'Sensual',
    category: 'exclusivo',
    categoryLabel: 'VIP & Sensual',
    baseInteractions: 1470,
    trendStatus: 'hot',
    trendDelta: '+31%',
    description: 'Encontros provocantes, fotos sem censura no cofre e flerte sem barreiras',
    gradient: 'from-amber-400 to-rose-500',
    badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  },
  {
    id: 'vip',
    name: '#VIP',
    cleanName: 'VIP',
    category: 'exclusivo',
    categoryLabel: 'VIP & Sensual',
    baseInteractions: 1390,
    trendStatus: 'popular',
    trendDelta: '+16%',
    description: 'Criadores verificados com mídias exclusivas no cofre e atendimento prioritário',
    gradient: 'from-yellow-400 to-amber-500',
    badgeColor: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10',
  },
  {
    id: 'praia',
    name: '#Praia',
    cleanName: 'Praia',
    category: 'lifestyle',
    categoryLabel: 'Lifestyle',
    baseInteractions: 1210,
    trendStatus: 'popular',
    trendDelta: '+14%',
    description: 'Pôr do sol à beira-mar, bronzeado, passeios de lancha e clima tropical',
    gradient: 'from-teal-400 to-emerald-500',
    badgeColor: 'text-teal-300 border-teal-500/40 bg-teal-500/10',
  },
  {
    id: 'geek',
    name: '#Geek',
    cleanName: 'Geek',
    category: 'cultura',
    categoryLabel: 'Cosplay & Geek',
    baseInteractions: 1090,
    trendStatus: 'rising',
    trendDelta: '+18%',
    description: 'Séries de ficção científica, mangás, HQs, universos de fantasia e cultura pop',
    gradient: 'from-violet-500 to-fuchsia-500',
    badgeColor: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
  },
  {
    id: 'vinho',
    name: '#Vinho',
    cleanName: 'Vinho',
    category: 'lifestyle',
    categoryLabel: 'Lifestyle',
    baseInteractions: 980,
    trendStatus: 'popular',
    trendDelta: '+11%',
    description: 'Jantares a dois, degustação de rótulos selecionados e conversas sofisticadas',
    gradient: 'from-rose-600 to-purple-800',
    badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  },
  {
    id: 'moda',
    name: '#Moda',
    cleanName: 'Moda',
    category: 'estilo',
    categoryLabel: 'Estilo & Alternativo',
    baseInteractions: 920,
    trendStatus: 'popular',
    trendDelta: '+12%',
    description: 'Produções de moda comercial, alta costura, tendências e desfiles',
    gradient: 'from-emerald-400 to-teal-600',
    badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  },
  {
    id: 'nocturno',
    name: '#Nocturno',
    cleanName: 'Nocturno',
    category: 'lifestyle',
    categoryLabel: 'Lifestyle',
    baseInteractions: 810,
    trendStatus: 'new',
    trendDelta: '+27%',
    description: 'Baladas exclusivas, noites agitadas em rooftops e energia noturna',
    gradient: 'from-blue-600 to-indigo-700',
    badgeColor: 'text-blue-300 border-blue-500/40 bg-blue-500/10',
  },
];

const STORAGE_KEY = 'jhobs_interest_tag_weights_v2';

/**
 * Retrieves the stored interaction increments for each tag.
 */
export function getStoredTagInteractions(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse stored tag interactions', e);
    return {};
  }
}

/**
 * Returns dynamic interest tags with live user usage computed and re-ordered by total interaction volume.
 */
export function getDynamicInterestTags(): InterestTag[] {
  const stored = getStoredTagInteractions();

  const tags: InterestTag[] = INITIAL_INTEREST_TAGS.map((tag) => {
    const userInteractions = stored[tag.id] || 0;
    const totalInteractions = tag.baseInteractions + userInteractions;

    // Dynamically calculate trend delta based on usage boost
    let trendDelta = tag.trendDelta;
    if (userInteractions > 0) {
      const boostPct = Math.round((userInteractions / tag.baseInteractions) * 100);
      const baseNum = parseInt(tag.trendDelta.replace(/[^0-9]/g, ''), 10) || 15;
      trendDelta = `+${baseNum + boostPct}%`;
    }

    // Dynamic status elevation: if a tag had significant recent user usage, elevate to 'hot'
    let trendStatus = tag.trendStatus;
    if (userInteractions >= 60) {
      trendStatus = 'hot';
    } else if (userInteractions >= 25 && trendStatus !== 'hot') {
      trendStatus = 'rising';
    }

    return {
      ...tag,
      userInteractions,
      totalInteractions,
      trendDelta,
      trendStatus,
    };
  });

  // Sort by total interactions descending (dynamic ranking based on platform usage)
  return tags.sort((a, b) => b.totalInteractions - a.totalInteractions);
}

/**
 * Records platform usage for given tag(s) (e.g. from tag clicks, profile likes, superlikes, or unlocks).
 */
export function trackTagPlatformUsage(tagIdentifiers: string | string[], weight: number = 10): void {
  if (typeof window === 'undefined') return;
  const list = Array.isArray(tagIdentifiers) ? tagIdentifiers : [tagIdentifiers];
  if (list.length === 0) return;

  try {
    const stored = getStoredTagInteractions();
    let hasChanges = false;

    list.forEach((raw) => {
      const clean = raw.replace(/^#/, '').toLowerCase().trim();
      // Find matching tag in registry
      const matched = INITIAL_INTEREST_TAGS.find(
        (t) => t.id === clean || t.cleanName.toLowerCase() === clean
      );
      const tagId = matched ? matched.id : clean;
      stored[tagId] = (stored[tagId] || 0) + weight;
      hasChanges = true;
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      // Dispatch custom event so UI components can re-render immediately
      window.dispatchEvent(new CustomEvent('jhobs:tag_usage_updated', { detail: { tags: list, weight } }));
    }
  } catch (e) {
    console.error('Error tracking tag platform usage:', e);
  }
}

/**
 * Simulates a usage surge for a tag (for testing / demonstrating dynamic platform shifts).
 */
export function simulateTagTrendingSurge(tagId: string, surgeCount: number = 80): void {
  trackTagPlatformUsage(tagId, surgeCount);
}

/**
 * Resets tag usage interactions back to platform defaults.
 */
export function resetTagPlatformUsage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('jhobs:tag_usage_updated', { detail: { reset: true } }));
  } catch (e) {
    console.error('Error resetting tag usage:', e);
  }
}

/**
 * Normalizes a string for hashtag/interest matching (removes accents, lowercase, removes #).
 */
function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .replace(/^#/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks if a profile matches any of the selected interest tags.
 */
export function matchesProfileTags(profile: Profile, selectedTags: string[]): boolean {
  if (!selectedTags || selectedTags.length === 0) return true;

  const profileTokens: string[] = [];

  // 1. Explicit tags
  if (profile.tags) {
    profile.tags.forEach((t) => profileTokens.push(normalizeForMatch(t)));
  }

  // 2. Interests
  if (profile.interests) {
    profile.interests.forEach((i) => profileTokens.push(normalizeForMatch(i)));
  }

  // 3. Hobbies
  if (profile.hobbies) {
    profile.hobbies.forEach((h) => profileTokens.push(normalizeForMatch(h)));
  }

  // 4. VIP media tags
  if (profile.vipMedia) {
    profile.vipMedia.forEach((m) => {
      m.tags?.forEach((t) => profileTokens.push(normalizeForMatch(t)));
    });
  }

  // 5. Bio and occupation tokens
  const bioNorm = normalizeForMatch(profile.bio || '');
  const occNorm = normalizeForMatch(profile.occupation || '');
  const goalNorm = normalizeForMatch(profile.relationshipGoal || '');

  return selectedTags.some((selectedTag) => {
    const target = normalizeForMatch(selectedTag);

    // Direct match with profile tokens
    const tokenMatch = profileTokens.some(
      (token) => token === target || token.includes(target) || target.includes(token)
    );
    if (tokenMatch) return true;

    // Fulltext match in bio, occupation, or goal
    if (bioNorm.includes(target) || occNorm.includes(target) || goalNorm.includes(target)) {
      return true;
    }

    // Specialized keyword mappings
    if (target === 'fitness' && (bioNorm.includes('treino') || bioNorm.includes('personal') || occNorm.includes('fitness') || profileTokens.includes('musculacao'))) {
      return true;
    }
    if (target === 'cosplay' && (bioNorm.includes('cosplay') || bioNorm.includes('fantasia') || bioNorm.includes('personagem') || occNorm.includes('cosplayer'))) {
      return true;
    }
    if (target === 'alternativo' && (bioNorm.includes('sem tabus') || bioNorm.includes('autentica') || bioNorm.includes('livre') || occNorm.includes('arquiteta'))) {
      return true;
    }
    if (target === 'gamer' && (bioNorm.includes('game') || bioNorm.includes('jogos') || profileTokens.includes('games / videogames'))) {
      return true;
    }
    if (target === 'boudoir' && (profileTokens.includes('boudoir') || bioNorm.includes('seda') || profileTokens.includes('lingerie'))) {
      return true;
    }

    return false;
  });
}
