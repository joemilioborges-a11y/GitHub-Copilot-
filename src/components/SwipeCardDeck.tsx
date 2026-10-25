import React, { useState, useMemo, useEffect } from 'react';
import { Profile, UserProfileData, ProfileGender, ProfileSexualOrientation } from '../types';
import {
  Heart,
  X,
  Star,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  Music,
  Dumbbell,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Navigation,
  Tag,
  Activity,
  Clock,
  Radio,
  Sliders,
  Check,
  Search,
  Ban,
  Flame,
  Zap,
  Info,
  Hash,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import {
  InterestTag,
  TagCategory,
  TAG_CATEGORIES,
  getDynamicInterestTags,
  trackTagPlatformUsage,
  simulateTagTrendingSurge,
  resetTagPlatformUsage,
  matchesProfileTags,
} from '../data/interestTags';

interface SwipeCardDeckProps {
  profiles: Profile[];
  currentUserProfile: UserProfileData;
  onLike: (profile: Profile) => void;
  onPass: (profile: Profile) => void;
  onSuperLike: (profile: Profile) => void;
  onOpenProfileDetail: (profile: Profile) => void;
  onOpenVipMedia: (profile: Profile, mediaId: string) => void;
  favoriteCreatorIds?: string[];
  onToggleFavorite?: (creatorId: string) => void;
  blockedUserIds?: string[];
  onToggleBlock?: (creatorId: string) => void;
}

export const SwipeCardDeck: React.FC<SwipeCardDeckProps> = ({
  profiles,
  currentUserProfile,
  onLike,
  onPass,
  onSuperLike,
  onOpenProfileDetail,
  onOpenVipMedia,
  favoriteCreatorIds = [],
  onToggleFavorite,
  blockedUserIds = [],
  onToggleBlock,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Filters state (Localização, Idade, Interesses, Conteúdo VIP)
  const [locationSearch, setLocationSearch] = useState('');
  const [ageRangeFilter, setAgeRangeFilter] = useState<'todas' | '18-24' | '25-34' | '35-44' | '45+'>('todas');
  const [onlyVipAvailable, setOnlyVipAvailable] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'vip' | 'compatible'>('all');
  const [genderFilter, setGenderFilter] = useState<'todos' | ProfileGender>('todos');
  const [orientationFilter, setOrientationFilter] = useState<'todas' | ProfileSexualOrientation>('todas');
  const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'online_now' | 'recently_active'>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'distance' | 'interests' | 'status' | 'demographics'>('all');

  // Dynamic Popular Interest Tags State (que mudam conforme o uso da plataforma)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dynamicTags, setDynamicTags] = useState<InterestTag[]>(() => getDynamicInterestTags());
  const [tagCategoryFilter, setTagCategoryFilter] = useState<TagCategory>('all');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagFeedbackMsg, setTagFeedbackMsg] = useState<string | null>(null);
  const [isTagBrowserExpanded, setIsTagBrowserExpanded] = useState(false);

  // Shimmer loading animation state during tag preference changes
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeFilteringLabel, setActiveFilteringLabel] = useState<string | null>(null);

  const triggerFilteringAnimation = (label?: string) => {
    setIsFiltering(true);
    if (label) setActiveFilteringLabel(label);
    setTimeout(() => {
      setIsFiltering(false);
      setActiveFilteringLabel(null);
    }, 450);
  };

  // Sync dynamic tags when platform usage changes anywhere in the app
  useEffect(() => {
    const handleTagUpdate = () => {
      setDynamicTags(getDynamicInterestTags());
    };
    window.addEventListener('jhobs:tag_usage_updated', handleTagUpdate);
    return () => window.removeEventListener('jhobs:tag_usage_updated', handleTagUpdate);
  }, []);

  // Pre-calculate profile match count for each tag so users can see available creators
  const tagProfileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dynamicTags.forEach((tag) => {
      const matchCount = profiles.filter((p) => {
        if (blockedUserIds.includes(p.id)) return false;
        return matchesProfileTags(p, [tag.name]);
      }).length;
      counts[tag.name] = matchCount;
    });
    return counts;
  }, [dynamicTags, profiles, blockedUserIds]);

  // Calculate dynamic compatibility score based on shared hobbies and music
  const calculateCompatibility = (profile: Profile): number => {
    let score = 65; // Base attraction score
    const sharedHobbies = profile.hobbies?.filter((h) => currentUserProfile.hobbies.includes(h)).length || 0;
    const sharedMusic = profile.musicGenres?.filter((m) => currentUserProfile.musicGenres.includes(m)).length || 0;
    score += sharedHobbies * 8;
    score += sharedMusic * 7;
    return Math.min(98, score);
  };

  // Collect all unique interests and their frequency across profiles
  const interestStats = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p) => {
      p.interests?.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
      });
      p.hobbies?.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [profiles]);

  // Real-time filtering by location, age, VIP content, distance, interests, activity status, gender, and sexual orientation
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // 0. Filter out blocked contacts
      if (blockedUserIds.includes(p.id)) return false;

      // 1. Search Location & City query
      if (locationSearch.trim()) {
        const query = locationSearch.trim().toLowerCase();
        const cityMatch = p.city?.toLowerCase().includes(query);
        const nameMatch = p.name?.toLowerCase().includes(query);
        if (!cityMatch && !nameMatch) return false;
      }

      // 2. Age Range filter
      if (ageRangeFilter !== 'todas') {
        if (ageRangeFilter === '18-24' && (p.age < 18 || p.age > 24)) return false;
        if (ageRangeFilter === '25-34' && (p.age < 25 || p.age > 34)) return false;
        if (ageRangeFilter === '35-44' && (p.age < 35 || p.age > 44)) return false;
        if (ageRangeFilter === '45+' && p.age < 45) return false;
      }

      // 3. VIP Content available filter
      if (onlyVipAvailable && (!p.vipMedia || p.vipMedia.length === 0)) return false;

      // 4. Gender filter
      if (genderFilter !== 'todos' && p.gender !== genderFilter) return false;

      // 5. Sexual orientation filter
      if (orientationFilter !== 'todas' && p.sexualOrientation !== orientationFilter) return false;

      // 6. Activity status filter
      if (activityStatusFilter === 'online_now' && !p.online) return false;
      if (activityStatusFilter === 'recently_active') {
        const isRecent =
          p.online ||
          p.lastActive.toLowerCase().includes('min') ||
          p.lastActive.toLowerCase().includes('agora');
        if (!isRecent) return false;
      }

      // 7. Specific Distance filter
      if (maxDistanceKm !== null && p.distanceKm > maxDistanceKm) return false;

      // 8. Interests & Hobbies filter
      if (selectedInterests.length > 0) {
        const hasMatchingInterest = selectedInterests.some((targetInterest) => {
          const matchInterest = p.interests?.some(
            (i) => i.toLowerCase() === targetInterest.toLowerCase()
          );
          const matchHobby = p.hobbies?.some(
            (h) => h.toLowerCase() === targetInterest.toLowerCase()
          );
          return matchInterest || matchHobby;
        });
        if (!hasMatchingInterest) return false;
      }

      // 9. Dynamic Popular Interest Tags filter (e.g. #Fitness, #Cosplay, #Alternativo)
      if (selectedTags.length > 0) {
        if (!matchesProfileTags(p, selectedTags)) return false;
      }

      // 10. Extra filter modes (VIP vault & high compatibility)
      if (filterMode === 'vip' && p.vipMedia.length === 0) return false;
      if (filterMode === 'compatible' && calculateCompatibility(p) < 80) return false;

      return true;
    });
  }, [
    profiles,
    locationSearch,
    ageRangeFilter,
    onlyVipAvailable,
    genderFilter,
    orientationFilter,
    activityStatusFilter,
    maxDistanceKm,
    selectedInterests,
    selectedTags,
    filterMode,
    blockedUserIds,
  ]);

  const isFilterActive =
    locationSearch.trim() !== '' ||
    ageRangeFilter !== 'todas' ||
    onlyVipAvailable ||
    genderFilter !== 'todos' ||
    orientationFilter !== 'todas' ||
    activityStatusFilter !== 'all' ||
    maxDistanceKm !== null ||
    selectedInterests.length > 0 ||
    selectedTags.length > 0 ||
    filterMode !== 'all';

  const activeFiltersCount =
    (locationSearch.trim() !== '' ? 1 : 0) +
    (ageRangeFilter !== 'todas' ? 1 : 0) +
    (onlyVipAvailable ? 1 : 0) +
    (genderFilter !== 'todos' ? 1 : 0) +
    (orientationFilter !== 'todas' ? 1 : 0) +
    (activityStatusFilter !== 'all' ? 1 : 0) +
    (maxDistanceKm !== null ? 1 : 0) +
    selectedInterests.length +
    selectedTags.length +
    (filterMode !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setLocationSearch('');
    setAgeRangeFilter('todas');
    setOnlyVipAvailable(false);
    setGenderFilter('todos');
    setOrientationFilter('todas');
    setActivityStatusFilter('all');
    setMaxDistanceKm(null);
    setSelectedInterests([]);
    setSelectedTags([]);
    setFilterMode('all');
    setCurrentIndex(0);
    triggerFilteringAnimation('Todos os perfis');
  };

  const toggleInterest = (interest: string) => {
    triggerFilteringAnimation(interest);
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
    setCurrentIndex(0);
  };

  const handleToggleTag = (tagWithHash: string) => {
    triggerFilteringAnimation(tagWithHash);
    setSelectedTags((prev) => {
      const isSelected = prev.includes(tagWithHash);
      const next = isSelected ? prev.filter((t) => t !== tagWithHash) : [...prev, tagWithHash];
      if (!isSelected) {
        // Track platform usage increment when user explores this tag
        trackTagPlatformUsage(tagWithHash, 15);
        setTagFeedbackMsg(`Filtro ${tagWithHash} aplicado! Tendência atualizada.`);
        setTimeout(() => setTagFeedbackMsg(null), 2500);
      }
      return next;
    });
    setCurrentIndex(0);
  };

  const currentProfile = filteredProfiles[currentIndex];
  const compatibilityScore = currentProfile ? calculateCompatibility(currentProfile) : 80;

  const handleNextProfile = (action: 'like' | 'pass' | 'superlike') => {
    if (!currentProfile) return;

    if (action === 'like') {
      onLike(currentProfile);
      // Platform usage tracking: likes boost the creator's tags
      const targetTags = currentProfile.tags && currentProfile.tags.length > 0
        ? currentProfile.tags
        : currentProfile.interests;
      if (targetTags && targetTags.length > 0) {
        trackTagPlatformUsage(targetTags, 10);
      }
    }
    if (action === 'pass') onPass(currentProfile);
    if (action === 'superlike') {
      onSuperLike(currentProfile);
      const targetTags = currentProfile.tags && currentProfile.tags.length > 0
        ? currentProfile.tags
        : currentProfile.interests;
      if (targetTags && targetTags.length > 0) {
        trackTagPlatformUsage(targetTags, 25);
      }
    }

    setCurrentPhotoIndex(0);
    if (currentIndex < filteredProfiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProfile) return;
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentProfile.photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProfile) return;
    setCurrentPhotoIndex((prev) => (prev < currentProfile.photos.length - 1 ? prev + 1 : 0));
  };

  // Shared items with user
  const sharedHobbies = currentProfile?.hobbies?.filter((h) => currentUserProfile.hobbies.includes(h)) || [];
  const sharedMusic = currentProfile?.musicGenres?.filter((m) => currentUserProfile.musicGenres.includes(m)) || [];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center space-y-4">
      {/* FILTER CONTROL PANEL */}
      <div className="w-full p-3.5 sm:p-4 rounded-3xl bg-[#12121c] border border-slate-800 shadow-xl space-y-3.5">
        {/* Header: Title, Counts and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span>Filtro de Encontros</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {filteredProfiles.length} {filteredProfiles.length === 1 ? 'perfil encontrado' : 'perfis encontrados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-rose-950/40"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-amber-950/30 transition-colors"
            >
              {isFilterExpanded ? 'Menos filtros' : 'Mais filtros'}
            </button>
          </div>
        </div>

        {/* SECTION 0: TAGS DE INTERESSE POPULARES (MUDAM CONFORME USO DA PLATAFORMA) */}
        <div className="pt-2 border-t border-slate-800/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Tags de Interesse em Alta</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-mono font-normal">
                  Dinâmico
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerFilteringAnimation('Todas as tags');
                    setSelectedTags([]);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition-colors"
                >
                  Limpar ({selectedTags.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsTagBrowserExpanded(!isTagBrowserExpanded)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer transition-colors px-2 py-0.5 rounded-lg hover:bg-amber-950/30"
              >
                <span>{isTagBrowserExpanded ? 'Ocultar catálogo' : 'Ver todas as tags'}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Quick Scroll Ribbon with Popular Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {dynamicTags.slice(0, 10).map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              const matchCount = tagProfileCounts[tag.name] || 0;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.name)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border flex items-center gap-1.5 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-950/40 scale-102 ring-2 ring-amber-400/40'
                      : 'bg-[#181828] text-slate-300 border-slate-700/80 hover:border-amber-500/50 hover:text-white hover:bg-[#1f1f33]'
                  }`}
                  title={`${tag.name}: ${tag.description}`}
                >
                  <span className={isSelected ? 'text-slate-950 font-bold' : 'text-amber-400'}>
                    {tag.trendStatus === 'hot' ? '🔥' : tag.trendStatus === 'rising' ? '📈' : '#'}
                  </span>
                  <span className="font-semibold">{tag.name}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-md font-mono ${
                      isSelected ? 'bg-black/25 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tag.trendDelta}
                  </span>
                  {matchCount > 0 && (
                    <span
                      className={`text-[9px] px-1 rounded-full ${
                        isSelected ? 'bg-black/30 text-amber-950 font-bold' : 'bg-rose-950/60 text-rose-300'
                      }`}
                    >
                      {matchCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic platform feedback toast */}
          {tagFeedbackMsg && (
            <div className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-fadeIn shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
              <span>{tagFeedbackMsg}</span>
            </div>
          )}

          {/* Full Tags Browser Panel (when expanded) */}
          {isTagBrowserExpanded && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-fadeIn">
              {/* Category Filter and Search */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {TAG_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerFilteringAnimation(cat.label);
                        setTagCategoryFilter(cat.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        tagCategoryFilter === cat.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-[#181826] text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Tag Search */}
                <div className="relative sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Buscar tag (#Fitness...)"
                    className="w-full bg-[#0d0d17] border border-slate-700/80 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Tag Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {dynamicTags
                  .filter((tag) => {
                    if (tagCategoryFilter !== 'all' && tag.category !== tagCategoryFilter) return false;
                    if (tagSearchQuery.trim()) {
                      const q = tagSearchQuery.toLowerCase();
                      return tag.name.toLowerCase().includes(q) || tag.description.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((tag) => {
                    const isSelected = selectedTags.includes(tag.name);
                    const matchCount = tagProfileCounts[tag.name] || 0;
                    return (
                      <div
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.name)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/60 border-amber-400 shadow-md'
                            : 'bg-[#161624] border-slate-800 hover:border-slate-700 hover:bg-[#1a1a2c]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 text-sm font-bold">
                              {tag.trendStatus === 'hot' ? '🔥' : tag.trendStatus === 'rising' ? '📈' : '#'}
                            </span>
                            <span className="text-xs font-bold text-white">{tag.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${tag.badgeColor}`}>
                              {tag.categoryLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              {tag.trendDelta}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {tag.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                          <span>{tag.totalInteractions.toLocaleString('pt-BR')} buscas/ações</span>
                          <span className="text-rose-400 font-semibold">
                            {matchCount} {matchCount === 1 ? 'perfil ativo' : 'perfis ativos'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Simulation & Info Tooltip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>A ordem e tendência mudam dinamicamente conforme curtidas, buscas e desbloqueios.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      simulateTagTrendingSurge('cosplay', 120);
                      simulateTagTrendingSurge('alternativo', 90);
                      setTagFeedbackMsg('⚡ Surto de acessos simulado: #Cosplay e #Alternativo subiram nas tendências!');
                      setTimeout(() => setTagFeedbackMsg(null), 3000);
                    }}
                    className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium cursor-pointer flex items-center gap-1 transition-colors"
                    title="Simular interação na plataforma para ver as tags subirem de posição"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Simular Alta (+120 buscas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetTagPlatformUsage();
                      setTagFeedbackMsg('Tendências restauradas para o padrão da plataforma.');
                      setTimeout(() => setTagFeedbackMsg(null), 2500);
                    }}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer text-xs"
                    title="Restaurar valores padrão"
                  >
                    Resetar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar & Quick Toggles: Localização & Conteúdo VIP */}
        <div className="space-y-2 pt-1 border-t border-slate-800/60">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setCurrentIndex(0);
                }}
                placeholder="Buscar por cidade ou localização (ex: São Paulo, Rio...)"
                className="w-full bg-[#0d0d17] border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              {locationSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearch('');
                    setCurrentIndex(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* VIP Content Only Toggle */}
            <button
              type="button"
              onClick={() => {
                setOnlyVipAvailable(!onlyVipAvailable);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                onlyVipAvailable
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40'
                  : 'bg-[#181826] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${onlyVipAvailable ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
              <span>VIP Disponível</span>
            </button>
          </div>

          {/* Age Bracket Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              Idade:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'todas', label: 'Todas as Idades (+18)' },
                { id: '18-24', label: '18 - 24 anos' },
                { id: '25-34', label: '25 - 34 anos' },
                { id: '35-44', label: '35 - 44 anos' },
                { id: '45+', label: '45+ anos' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAgeRangeFilter(opt.id as any);
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                    ageRangeFilter === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-bold'
                      : 'bg-[#181826] text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 1: STATUS DE ATIVIDADE (REAL-TIME TOGGLE) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            Status:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'online_now', label: 'Online Agora', indicator: 'green' },
              { id: 'recently_active', label: 'Ativos Recentes', indicator: 'amber' },
            ].map((opt) => {
              const isSelected = activityStatusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setActivityStatusFilter(opt.id as any);
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-semibold'
                      : 'bg-[#181826] text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {opt.indicator === 'green' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {opt.indicator === 'amber' && (
                    <Clock className="w-3 h-3 text-amber-400" />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DISTÂNCIA MÁXIMA (REAL-TIME SLIDER & TOGGLES) */}
        <div className="space-y-2 pt-1 border-t border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-rose-400" />
              Distância:
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Qualquer', value: null },
                { label: '≤ 5 km', value: 5 },
                { label: '≤ 10 km', value: 10 },
                { label: '≤ 15 km', value: 15 },
                { label: '≤ 25 km', value: 25 },
              ].map((opt, i) => {
                const isSelected = maxDistanceKm === opt.value;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setMaxDistanceKm(opt.value);
                      setCurrentIndex(0);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm font-semibold'
                        : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="flex items-center gap-3 bg-[#0f0f18] p-2 rounded-xl border border-slate-800/80">
            <input
              type="range"
              min="1"
              max="50"
              value={maxDistanceKm ?? 50}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxDistanceKm(val >= 50 ? null : val);
                setCurrentIndex(0);
              }}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs font-mono font-bold text-rose-300 shrink-0 min-w-[75px] text-right">
              {maxDistanceKm !== null ? `≤ ${maxDistanceKm} km` : 'Ilimitado'}
            </span>
          </div>
        </div>

        {/* SECTION 3: INTERESSES & HOBBIES (REAL-TIME MULTI-SELECT TOGGLES) */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-400" />
              Interesses & Estilo:
            </span>
            {selectedInterests.length > 0 && (
              <button
                onClick={() => {
                  setSelectedInterests([]);
                  setCurrentIndex(0);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Limpar ({selectedInterests.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {interestStats.slice(0, isFilterExpanded ? undefined : 8).map(({ name, count }) => {
              const isSelected = selectedInterests.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleInterest(name)}
                  className={`px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-950/40 scale-102'
                      : 'bg-[#181826] text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{name}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-slate-950 font-mono' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: SEXO & OPÇÃO SEXUAL */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20">
            Sexo:
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'mulher', label: 'Mulheres' },
              { id: 'homem', label: 'Homens' },
              { id: 'trans', label: 'Trans' },
            ].map((opt) => {
              const isSelected = genderFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setGenderFilter(opt.id as any);
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm font-semibold'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expanded Mode: Sexual Orientation and VIP options */}
        {isFilterExpanded && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20">
                Opção:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'hetero', label: 'Heterossexual' },
                  { id: 'bi', label: 'Bissexual' },
                  { id: 'gay', label: 'Gay' },
                  { id: 'lesbica', label: 'Lésbica' },
                  { id: 'pan', label: 'Pansexual' },
                ].map((opt) => {
                  const isSelected = orientationFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setOrientationFilter(opt.id as any);
                        setCurrentIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                          : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-20">
                Especial:
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => {
                    setFilterMode(filterMode === 'compatible' ? 'all' : 'compatible');
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                    filterMode === 'compatible'
                      ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Alta Compatibilidade (+80%)</span>
                </button>
                <button
                  onClick={() => {
                    setFilterMode(filterMode === 'vip' ? 'all' : 'vip');
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                    filterMode === 'vip'
                      ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Com Fotos VIP</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ACTIVE FILTER PILLS (QUICK CLEAR) */}
        {isFilterActive && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Ativos:
            </span>

            {activityStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[11px] text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {activityStatusFilter === 'online_now' ? 'Online Agora' : 'Ativos Recentes'}
                <button
                  onClick={() => setActivityStatusFilter('all')}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {maxDistanceKm !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-[11px] text-rose-300">
                <Navigation className="w-2.5 h-2.5" />
                ≤ {maxDistanceKm} km
                <button
                  onClick={() => setMaxDistanceKm(null)}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-950 to-rose-950 border border-amber-500/50 text-[11px] text-amber-200 font-bold shadow-sm"
              >
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedInterests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-[11px] text-amber-300"
              >
                <Tag className="w-2.5 h-2.5" />
                {interest}
                <button
                  onClick={() => toggleInterest(interest)}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {genderFilter !== 'todos' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-300">
                Sexo: {genderFilter}
                <button
                  onClick={() => setGenderFilter('todos')}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {orientationFilter !== 'todas' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-300">
                Opção: {orientationFilter}
                <button
                  onClick={() => setOrientationFilter('todas')}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* SHIMMER LOADING CARD ANIMATION (FILTRANDO RESULTADOS) */}
      {isFiltering ? (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-150">
          <div className="relative w-full aspect-[3/4] max-h-[620px] rounded-3xl overflow-hidden bg-[#131320] border border-amber-500/40 shadow-2xl shadow-black/80 flex flex-col justify-between p-5 sm:p-6 select-none relative">
            {/* Shimmer light sweep beam */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer pointer-events-none z-30" />

            {/* Holographic Radar Scanning Line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_18px_rgba(251,191,36,0.85)] animate-scan-radar pointer-events-none z-30" />

            {/* Dark gradient overlay matching card */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

            {/* Top Floating Badge Skeleton */}
            <div className="flex items-center justify-between z-20">
              <div className="px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-500/50 flex items-center gap-2 backdrop-blur-md shadow-lg shadow-amber-950/40">
                <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="text-xs font-bold text-amber-200">
                  {activeFilteringLabel ? `Filtrando por ${activeFilteringLabel}...` : 'Aplicando tags de interesse...'}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-black/60 border border-slate-700/80 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Atualizando</span>
              </div>
            </div>

            {/* Center Holographic Radar Indicator */}
            <div className="flex flex-col items-center justify-center my-auto text-center space-y-3 z-20">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/15 via-rose-500/15 to-transparent border border-amber-400/50 flex items-center justify-center shadow-xl shadow-amber-950/50">
                <div className="absolute inset-0 rounded-full border border-amber-400/50 animate-ping opacity-50" />
                <div className="absolute -inset-2 rounded-full border border-rose-500/30 animate-pulse" />
                <Sparkles className="w-8 h-8 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Reorganizando Deck de Criadores
                </h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Calculando compatibilidade e aplicando preferências de tags em tempo real
                </p>
              </div>

              {/* Micro Tags Loading Pills */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>

            {/* Bottom Card Content Skeleton with Shimmer */}
            <div className="space-y-3 z-20 pt-4 border-t border-white/10">
              {/* Title & Age Bar Skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-7 w-48 rounded-xl bg-slate-800/80 animate-pulse" />
                <div className="h-6 w-24 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse" />
              </div>

              {/* Demographics / Distance skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 rounded-md bg-slate-800/70 animate-pulse" />
                <div className="h-4 w-2 rounded-full bg-slate-700/60" />
                <div className="h-4 w-20 rounded-md bg-slate-800/70 animate-pulse" />
                <div className="h-4 w-2 rounded-full bg-slate-700/60" />
                <div className="h-4 w-24 rounded-md bg-slate-800/70 animate-pulse" />
              </div>

              {/* Tags Pills Row Skeleton */}
              <div className="flex items-center gap-2 pt-1">
                <div className="h-6 w-20 rounded-lg bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-400/40 animate-pulse" />
                <div className="h-6 w-24 rounded-lg bg-slate-800/70 animate-pulse" />
                <div className="h-6 w-18 rounded-lg bg-slate-800/70 animate-pulse" />
                <div className="h-6 w-16 rounded-lg bg-slate-800/70 animate-pulse" />
              </div>

              {/* Bio lines Skeleton */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-full rounded-md bg-slate-800/50 animate-pulse" />
                <div className="h-3.5 w-4/5 rounded-md bg-slate-800/40 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Subdued Skeleton Action Buttons to prevent layout jumping */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-4 w-full opacity-40 pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-[#181826] border border-slate-800 animate-pulse" />
            <div className="w-13 h-13 rounded-full bg-[#181826] border border-slate-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-[#181826] border border-slate-800 animate-pulse" />
            <div className="w-15 h-15 rounded-full bg-[#181826] border border-rose-950 animate-pulse" />
            <div className="w-11 h-11 rounded-full bg-[#181826] border border-slate-800 animate-pulse" />
          </div>
        </div>
      ) : !currentProfile ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-[#12121a] rounded-3xl border border-slate-800 max-w-md mx-auto my-8 space-y-4">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h3 className="text-xl font-bold text-white">Nenhum perfil encontrado</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Não encontramos pessoas correspondentes a esta combinação de filtros (distância, interesses ou atividade) no momento.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-rose-950 flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpar Filtros e Ver Todos</span>
          </button>
        </div>
      ) : (
        <>
          {/* Main Tinder Card */}
          <div className="relative w-full aspect-[3/4] max-h-[620px] rounded-3xl overflow-hidden bg-[#161622] border border-slate-800 shadow-2xl group select-none">
            {/* Background Image */}
            <img
              src={currentProfile.photos[currentPhotoIndex] || currentProfile.avatar}
              alt={currentProfile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Photo Index Indicator Bars */}
            <div className="absolute top-3 left-3 right-3 flex items-center gap-1.5 z-20">
              {currentProfile.photos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    idx === currentPhotoIndex ? 'bg-white' : 'bg-white/30 backdrop-blur-sm'
                  }`}
                />
              ))}
            </div>

            {/* Tap areas for photo cycling */}
            <button
              onClick={handlePrevPhoto}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNextPhoto}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Floating Badges: Compatibility Match & Verified Creator Blue Check */}
            <div className="absolute top-7 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[62%]">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-rose-500/50 text-xs font-bold text-white shadow-lg">
                <span className="text-rose-400 font-mono">{compatibilityScore}%</span>
                <span className="hidden sm:inline">Match Compatível</span>
                <span className="sm:hidden">Match</span>
              </div>

              {currentProfile.verified && (
                <VerifiedBadge
                  size="xs"
                  variant="pill"
                  creatorName={currentProfile.name}
                  badgeInfo={currentProfile.verifiedBadge}
                  interactive={true}
                />
              )}
            </div>

            {/* Floating VIP Verification Badge on profiles with active vault content */}
            {currentProfile.vipMedia && currentProfile.vipMedia.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenProfileDetail(currentProfile)}
                className="absolute top-7 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-950/90 via-black/85 to-rose-950/90 hover:from-amber-900/90 hover:to-rose-900/90 border border-amber-400/80 backdrop-blur-md text-amber-300 text-xs font-bold shadow-xl shadow-amber-950/50 transition-all hover:scale-105 cursor-pointer group"
                title="Criador Verificado VIP: Possui fotos e vídeos exclusivos no cofre (+18)"
              >
                <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-black uppercase tracking-wider text-[11px] bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                    Selo VIP
                  </span>
                  <span className="text-amber-500/70 font-normal">•</span>
                  <Lock className="w-3 h-3 text-amber-300" />
                  <span className="font-mono text-[11px] text-amber-200 font-bold">
                    {currentProfile.vipMedia.length} no Cofre
                  </span>
                </div>
              </button>
            )}

            {/* Bottom Dark Gradient Scrim */}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent z-10 pointer-events-none" />

            {/* Profile Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-20 flex flex-col text-left">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                {currentProfile.verified && (
                  <div className="flex items-center gap-1.5">
                    <VerifiedBadge
                      size="lg"
                      variant="icon"
                      creatorName={currentProfile.name}
                      badgeInfo={currentProfile.verifiedBadge}
                      interactive={true}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfileDetail(currentProfile);
                      }}
                      className="px-2 py-0.5 rounded-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-[10px] font-bold text-sky-300 uppercase tracking-wider backdrop-blur-sm shadow-sm transition-colors cursor-pointer"
                      title="Ver selo oficial e auditoria"
                    >
                      Criador Verificado
                    </button>
                  </div>
                )}

                {/* VIP Verification Badge beside creator name */}
                {currentProfile.vipMedia && currentProfile.vipMedia.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProfileDetail(currentProfile);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-rose-500/20 hover:from-amber-500/40 hover:to-rose-500/30 border border-amber-400/70 text-amber-300 backdrop-blur-md shadow-md shadow-amber-950/40 transition-all hover:scale-105 cursor-pointer"
                    title="Criador com Cofre VIP ativo: Clique para espiar fotos exclusivas"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent">
                      VIP Ativo
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-200">
                      ({currentProfile.vipMedia.length} mídias)
                    </span>
                  </button>
                )}
              </div>

              {/* Status, Distance, City and Demographics */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mb-2">
                {/* Real-time Activity Status */}
                {currentProfile.online ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online agora
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {currentProfile.lastActive}
                  </span>
                )}

                <span>·</span>

                {/* Specific Distance */}
                <span className="flex items-center gap-1 font-semibold text-rose-300">
                  <Navigation className="w-3 h-3 text-rose-400" />
                  {currentProfile.distanceKm} km
                </span>

                <span>·</span>

                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {currentProfile.city}
                </span>

                <span>·</span>

                <span className="text-amber-300 font-semibold">
                  {currentProfile.genderLabel} · {currentProfile.orientationLabel}
                </span>
              </div>

              {/* Highlighted Tags de Interesse Populares & Hobbies com 1-Click Filter */}
              {((currentProfile.tags && currentProfile.tags.length > 0) || (currentProfile.interests && currentProfile.interests.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  {/* First render explicit #Tags */}
                  {currentProfile.tags?.map((tag, idx) => {
                    const isMatched = selectedTags.includes(tag);
                    return (
                      <button
                        key={`tag-${idx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTag(tag);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                          isMatched
                            ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-950/50 scale-105'
                            : 'bg-black/60 hover:bg-black/85 text-amber-300 border-amber-500/40 hover:border-amber-400'
                        }`}
                        title={`Filtrar criadores com a tag ${tag}`}
                      >
                        <Flame className={`w-2.5 h-2.5 ${isMatched ? 'text-slate-950' : 'text-amber-400'}`} />
                        <span>{tag}</span>
                      </button>
                    );
                  })}

                  {/* Render additional interests */}
                  {currentProfile.interests?.slice(0, currentProfile.tags ? 3 : 5).map((interest, idx) => {
                    const isMatched = selectedInterests.includes(interest);
                    return (
                      <button
                        key={`int-${idx}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInterest(interest);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                          isMatched
                            ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-bold shadow-sm'
                            : 'bg-black/50 hover:bg-black/75 text-slate-300 border-white/10'
                        }`}
                        title={`Filtrar por interesse: ${interest}`}
                      >
                        <Tag className="w-2.5 h-2.5 opacity-70" />
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bio snippet */}
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed mb-3">
                {currentProfile.bio}
              </p>

              {/* VIP Preview Strip */}
              {currentProfile.vipMedia.length > 0 && (
                <div className="pt-2 border-t border-white/10 mb-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Prévia do Cofre VIP (+18):
                    </span>
                    <button
                      onClick={() => onOpenProfileDetail(currentProfile)}
                      className="text-slate-300 hover:text-white underline text-[11px] cursor-pointer"
                    >
                      Ver todas
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {currentProfile.vipMedia.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onOpenVipMedia(currentProfile, item.id)}
                        className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-amber-500/40 cursor-pointer group/media hover:scale-105 transition-transform"
                      >
                        <img
                          src={item.mediaUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover filter blur-[6px] contrast-125"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                          <Lock className="w-3.5 h-3.5 text-amber-300 mb-0.5" />
                          <span className="text-[9px] font-mono font-bold text-amber-300">
                            {item.priceCredits} 💎
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Bar (Pass, Block, Favorite, Like, View) */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-4 w-full">
            {/* Block Button */}
            {onToggleBlock && (
              <button
                type="button"
                onClick={() => {
                  onToggleBlock(currentProfile.id);
                  handleNextProfile('pass');
                }}
                aria-label="Bloquear contato"
                className="w-11 h-11 rounded-full bg-[#181826] border border-rose-950 hover:border-rose-600/70 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer group"
                title={`Bloquear contato ${currentProfile.name}`}
              >
                <Ban className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Pass Button */}
            <button
              onClick={() => handleNextProfile('pass')}
              aria-label="Passar perfil"
              className="w-13 h-13 rounded-full bg-[#181826] border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer group"
              title="Passar perfil"
            >
              <X className="w-6 h-6 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-red-400" />
            </button>

            {/* Favorite Contact Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(currentProfile.id)}
                aria-label="Favoritar contato"
                className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer group ${
                  favoriteCreatorIds.includes(currentProfile.id)
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-[#181826] border-slate-700/80 text-slate-400 hover:text-amber-400 hover:border-amber-500/50'
                }`}
                title={
                  favoriteCreatorIds.includes(currentProfile.id)
                    ? 'Contato favoritado! Clique para desfavoritar'
                    : 'Selecionar contato como favorito ⭐'
                }
              >
                <Star
                  className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                    favoriteCreatorIds.includes(currentProfile.id)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-none'
                  }`}
                />
              </button>
            )}

            {/* Like Button */}
            <button
              onClick={() => handleNextProfile('like')}
              aria-label="Curtir perfil"
              className="w-15 h-15 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-rose-950/60 transition-all hover:scale-110 active:scale-95 cursor-pointer group"
              title="Curtir perfil"
            >
              <Heart className="w-7 h-7 group-hover:scale-110 transition-transform fill-white" />
            </button>

            {/* View Full Profile Modal Button */}
            <button
              onClick={() => onOpenProfileDetail(currentProfile)}
              aria-label="Ver perfil completo"
              className="w-11 h-11 rounded-full bg-[#181826] border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer group"
              title="Ver perfil completo e cofre VIP"
            >
              <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
