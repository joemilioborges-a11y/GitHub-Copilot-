import React, { useState } from 'react';
import { Profile, VipMediaItem, ProfileGender, ProfileSexualOrientation } from '../types';
import { Lock, Unlock, Coins, Sparkles, Filter, Heart, Eye, RotateCcw } from 'lucide-react';
import { protectedMediaService } from '../services/protectedMediaService';

interface VaultFeedViewProps {
  profiles: Profile[];
  onOpenUnlockModal: (media: VipMediaItem, creator: Profile) => void;
  userCredits: number;
}

export const VaultFeedView: React.FC<VaultFeedViewProps> = ({
  profiles,
  onOpenUnlockModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked' | 'videos'>('all');
  const [genderFilter, setGenderFilter] = useState<'todos' | ProfileGender>('todos');
  const [orientationFilter, setOrientationFilter] = useState<'todas' | ProfileSexualOrientation>('todas');

  // Flatten all VIP media from all profiles with creator association
  const allVipMediaWithCreator = profiles.flatMap((profile) =>
    profile.vipMedia.map((media) => ({
      media,
      creator: profile,
    }))
  );

  const filteredItems = allVipMediaWithCreator.filter(({ media, creator }) => {
    if (genderFilter !== 'todos' && creator.gender !== genderFilter) return false;
    if (orientationFilter !== 'todas' && creator.sexualOrientation !== orientationFilter) return false;
    if (filter === 'unlocked') return media.isUnlocked;
    if (filter === 'locked') return !media.isUnlocked;
    if (filter === 'videos') return media.type === 'video';
    return true;
  });

  const isFilterActive = genderFilter !== 'todos' || orientationFilter !== 'todas' || filter !== 'all';

  const handleResetFilters = () => {
    setGenderFilter('todos');
    setOrientationFilter('todas');
    setFilter('all');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-display">
            <span>Cofre VIP JOBS (+18)</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acesso ao Cofre VIP por 149 💎 (30 dias, escopo por perfil) ou desbloqueio avulso (Foto 49 💎 · Vídeo 99 💎).
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({allVipMediaWithCreator.length})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              filter === 'locked'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Exclusivos</span>
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              filter === 'unlocked'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Unlock className="w-3 h-3" />
            <span>Desbloqueados</span>
          </button>
        </div>
      </div>

      {/* FILTER BOX: GENDER & SEXUAL ORIENTATION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121c] border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Filtrar por Sexo e Opção Sexual:</span>
            <span className="text-[11px] text-slate-400 font-normal">
              ({filteredItems.length} {filteredItems.length === 1 ? 'mídia' : 'mídias'})
            </span>
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Row 1: Sexo */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-24">
            Por Sexo:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todos', label: 'Todos os Sexos' },
              { id: 'mulher', label: 'Mulheres' },
              { id: 'homem', label: 'Homens' },
              { id: 'trans', label: 'Trans' },
            ].map((opt) => {
              const isSelected = genderFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setGenderFilter(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm font-semibold'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Opção Sexual */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-24">
            Opção Sexual:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todas', label: 'Todas as Opções' },
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
                  onClick={() => setOrientationFilter(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-[#12121a] rounded-3xl border border-slate-800 space-y-4">
          <Lock className="w-10 h-10 text-amber-400/60 mx-auto" />
          <p className="text-sm text-slate-400">Nenhum conteúdo encontrado com os filtros selecionados.</p>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-950 flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar Filtros</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map(({ media, creator }) => (
            <div
              key={`${creator.id}_${media.id}`}
              onClick={() => onOpenUnlockModal(media, creator)}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#14141f] border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer shadow-xl flex flex-col"
            >
              {/* Media image com proteção anti-cópia */}
              <div
                className="relative aspect-[3/4] w-full overflow-hidden bg-black select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={
                    media.isUnlocked
                      ? media.mediaUrl
                      : protectedMediaService.getPublicTeaserUrl(media)
                  }
                  alt={media.title}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-all duration-500 pointer-events-none ${
                    media.isUnlocked
                      ? 'filter-none group-hover:scale-105'
                      : 'filter blur-[18px] scale-110 brightness-80 group-hover:blur-[14px]'
                  }`}
                />

                {/* Creator Chip overlay */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 p-1.5 pr-3 rounded-full bg-black/70 backdrop-blur-md border border-white/10">
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-bold text-white truncate max-w-[100px]">
                    {creator.name}
                  </span>
                </div>

                {/* Locked / Unlocked Pill */}
                <div className="absolute top-3 right-3 z-20">
                  {media.isUnlocked ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md">
                      <Unlock className="w-3 h-3" />
                      Liberado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold backdrop-blur-md">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {media.priceCredits} 💎
                    </span>
                  )}
                </div>

                {/* Orientation & Gender Pill */}
                <div className="absolute top-12 left-3 z-20 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-semibold text-rose-300">
                    {creator.genderLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-semibold text-amber-300">
                    {creator.orientationLabel}
                  </span>
                </div>

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                {/* Center unlock callout if locked */}
                {!media.isUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mb-2 shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white mb-0.5">Clique para Desbloquear</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      {media.priceCredits} 💎
                    </span>
                  </div>
                )}

                {/* Bottom title on card */}
                <div className="absolute bottom-3 left-3 right-3 z-20 text-left">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{media.title}</h3>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                    {media.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
