import React, { useState } from 'react';
import { DiscoverNudeItem, LiveGender, LiveSexualOrientation } from '../types';
import { Lock, Unlock, Sparkles, Coins, Heart, Check, Flame, X, Filter, RotateCcw, User, ShieldCheck, EyeOff } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { protectedMediaService, obfuscateUserIdForWatermark } from '../services/protectedMediaService';

interface DiscoverNudesViewProps {
  nudes: DiscoverNudeItem[];
  userCredits: number;
  onPayAndDiscover: (item: DiscoverNudeItem) => void;
  onOpenWallet: () => void;
  onSendTip: (creatorName: string, amount: number) => void;
}

export const DiscoverNudesView: React.FC<DiscoverNudesViewProps> = ({
  nudes,
  userCredits,
  onPayAndDiscover,
  onOpenWallet,
  onSendTip,
}) => {
  const [selectedItem, setSelectedItem] = useState<DiscoverNudeItem | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [tipSuccess, setTipSuccess] = useState<string | null>(null);

  // Filters by Gender / Sex and Sexual Orientation
  const [genderFilter, setGenderFilter] = useState<'todos' | LiveGender>('todos');
  const [orientationFilter, setOrientationFilter] = useState<'todas' | LiveSexualOrientation>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'bloqueados' | 'desbloqueados'>('todos');

  // Filter computation
  const filteredNudes = nudes.filter((item) => {
    const matchGender = genderFilter === 'todos' || item.gender === genderFilter;
    const matchOrientation = orientationFilter === 'todas' || item.sexualOrientation === orientationFilter;
    let matchStatus = true;
    if (statusFilter === 'bloqueados') matchStatus = !item.isUnlocked;
    if (statusFilter === 'desbloqueados') matchStatus = item.isUnlocked;
    return matchGender && matchOrientation && matchStatus;
  });

  const isFilterActive = genderFilter !== 'todos' || orientationFilter !== 'todas' || statusFilter !== 'todos';

  const handleResetFilters = () => {
    setGenderFilter('todos');
    setOrientationFilter('todas');
    setStatusFilter('todos');
  };

  const handleUnlockClick = (item: DiscoverNudeItem) => {
    if (userCredits < item.priceCredits) {
      onOpenWallet();
      return;
    }

    onPayAndDiscover(item);
    setRevealingId(item.id);

    // Progressive uncover animation
    setTimeout(() => {
      setRevealingId(null);
      setSelectedItem({ ...item, isUnlocked: true, isRevealed: true });
    }, 1200);

    trackEvent('nude_discovered_paid', {
      nudeId: item.id,
      title: item.title,
      cost: item.priceCredits,
    });
  };

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSendTip = (creatorName: string, amount: number) => {
    if (userCredits < amount) {
      onOpenWallet();
      return;
    }
    onSendTip(creatorName, amount);
    setTipSuccess(`Presente de ${amount} 💎 enviado para ${creatorName}! ❤️`);
    setTimeout(() => setTipSuccess(null), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#161624] to-rose-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white font-display">
              Nudes VIP & Fotos Sensuais (+18)
            </h1>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Fotos secretas cobertas por névoa misteriosa. Utilize 49 💎 por foto para revelar o conteúdo exclusivo em alta definição.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            Seu Saldo: <strong className="text-amber-400">{userCredits} 💎</strong>
          </div>
          <button
            onClick={onOpenWallet}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md shadow-amber-950"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* FILTER BOX: SEXO & OPÇÃO SEXUAL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121c] border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Filtrar Nudes VIP:</span>
            <span className="text-[11px] text-slate-400 font-normal">
              ({filteredNudes.length} {filteredNudes.length === 1 ? 'conteúdo encontrado' : 'conteúdos encontrados'})
            </span>
          </div>

          <div className="flex items-center gap-3">
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
        </div>

        {/* Filter Row 1: Sexo / Gênero */}
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

        {/* Filter Row 2: Opção / Orientação Sexual */}
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

        {/* Filter Row 3: Status de Desbloqueio */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-24">
            Status:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'bloqueados', label: 'A Descobrir (Com Censura)' },
              { id: 'desbloqueados', label: 'Já Descobertos' },
            ].map((opt) => {
              const isSelected = statusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-700 text-white border-slate-500 shadow-sm font-semibold'
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

      {/* Grid of Discoverable Nudes */}
      {filteredNudes.length === 0 ? (
        <div className="p-12 text-center bg-[#12121c] rounded-3xl border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nenhum Nude VIP encontrado com estes filtros</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não encontramos fotos com os critérios selecionados. Tente alterar ou limpar os filtros de sexo e opção sexual.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-950 flex items-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ver Todos os Nudes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredNudes.map((item) => {
            const isLiked = likedIds.includes(item.id);
            const isRevealing = revealingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.isUnlocked) {
                    setSelectedItem(item);
                  }
                }}
                className="group relative rounded-3xl overflow-hidden bg-[#141420] border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer shadow-xl flex flex-col"
              >
                {/* Media card container com proteção anti-cópia */}
                <div
                  className="relative aspect-[3/4] w-full overflow-hidden bg-black select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={
                      item.isUnlocked
                        ? item.mediaUrl
                        : protectedMediaService.getPublicTeaserUrl({ id: item.id, mediaUrl: item.mediaUrl })
                    }
                    alt={item.title}
                    draggable={false}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-all duration-700 pointer-events-none ${
                      item.isUnlocked
                        ? 'filter-none group-hover:scale-105'
                        : isRevealing
                        ? 'filter blur-[4px] scale-105'
                        : 'filter blur-[24px] brightness-75 scale-110'
                    }`}
                  />

                  {/* Creator Avatar & Tag */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10">
                    <img
                      src={item.creatorAvatar}
                      alt={item.creatorName}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-amber-500"
                    />
                    <span className="text-[11px] font-bold text-white truncate max-w-[90px]">
                      {item.creatorName}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-20">
                    {item.isUnlocked ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold backdrop-blur-md">
                        <Unlock className="w-3 h-3" />
                        Descoberto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-black backdrop-blur-md">
                        <Coins className="w-3 h-3 text-amber-400" />
                        {item.priceCredits} 💎
                      </span>
                    )}
                  </div>

                  {/* Orientation & Gender Pill on Image */}
                  <div className="absolute top-12 left-3 z-20 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-semibold text-rose-300">
                      {item.genderLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-semibold text-amber-300">
                      {item.orientationLabel}
                    </span>
                  </div>

                  {/* Unlocked overlay: Reveal Action or Locked Pay Callout */}
                  {!item.isUnlocked && (
                    <div className="absolute inset-0 z-10 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                      {isRevealing ? (
                        <div className="space-y-2">
                          <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-spin" />
                          <span className="text-xs font-black text-amber-300 font-mono animate-pulse block">
                            Revelando Nude...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                            <Lock className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-black text-white mb-1">
                            Nude a ser Descoberto
                          </span>
                          <p className="text-[10px] text-slate-300 italic max-w-[180px] mb-3">
                            "{item.teaserHint}"
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockClick(item);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-950/40 cursor-pointer flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Pagar & Descobrir ({item.priceCredits} 💎)</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Dark Gradient Scrim */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

                  {/* Card Title on bottom */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 text-left">
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{item.likesCount + (isLiked ? 1 : 0)} curtidas</span>
                      <button
                        onClick={(e) => handleLike(item.id, e)}
                        className="p-1 hover:text-rose-400 cursor-pointer"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL FOR UNLOCKED NUDE */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#12121a] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d0d14]">
              <div className="flex items-center gap-2">
                <img
                  src={selectedItem.creatorAvatar}
                  alt={selectedItem.creatorName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-amber-500"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedItem.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-amber-300">
                    <span>Por {selectedItem.creatorName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{selectedItem.genderLabel} ({selectedItem.orientationLabel})</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pristine Protected Image com Marca-d'água Forense */}
            <div
              className="relative aspect-[3/4] max-h-[520px] w-full bg-black overflow-hidden flex items-center justify-center select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={selectedItem.mediaUrl}
                alt={selectedItem.title}
                draggable={false}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover pointer-events-none"
              />
              {/* Marca-d'água forense diagonal semitransparente */}
              <div
                className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden opacity-25 select-none"
                aria-hidden="true"
              >
                <div className="transform -rotate-25 text-center space-y-6 tracking-widest font-mono text-[10px] font-extrabold text-white/70 drop-shadow">
                  <p>JOBS VIP · {obfuscateUserIdForWatermark('current_user')} · CÓPIA PROIBIDA</p>
                  <p>RASTREAMENTO FORENSE ATIVO</p>
                </div>
              </div>
              <div className="absolute bottom-3 right-3 z-20 px-2 py-1 rounded bg-black/75 backdrop-blur-md text-[9px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>JOBS VIP · {obfuscateUserIdForWatermark('current_user')}</span>
              </div>
            </div>

            {/* Details & Tip Action */}
            <div className="p-4 sm:p-5 space-y-3 bg-[#12121a]">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{selectedItem.teaserHint}"
              </p>

              {tipSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 text-center font-bold">
                  {tipSuccess}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">Gostou da foto? Envie um presente:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendTip(selectedItem.creatorName, 29)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    29 💎
                  </button>
                  <button
                    onClick={() => handleSendTip(selectedItem.creatorName, 49)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
                  >
                    49 💎
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
