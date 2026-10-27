import React, { useState } from 'react';
import { Profile, VipMediaItem } from '../types';
import {
  X,
  Lock,
  Unlock,
  Heart,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Sparkles,
  Coins,
  Gift,
  Music,
  Dumbbell,
  Compass,
  Star,
  Check,
  Ban,
  UserCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileDetailModalProps {
  profile: Profile;
  onClose: () => void;
  onOpenUnlockModal: (media: VipMediaItem) => void;
  onStartChat: (profile: Profile) => void;
  onSendTip: (profile: Profile, amount: number) => void;
  userCredits: number;
  isFavorite?: boolean;
  onToggleFavorite?: (creatorId: string) => void;
  isBlocked?: boolean;
  onToggleBlock?: (creatorId: string) => void;
  onRateCreator?: (creatorId: string, stars: number, comment?: string) => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  onClose,
  onOpenUnlockModal,
  onStartChat,
  onSendTip,
  userCredits,
  isFavorite = false,
  onToggleFavorite,
  isBlocked = false,
  onToggleBlock,
  onRateCreator,
}) => {
  const [activeTab, setActiveTab] = useState<'vip' | 'public'>('vip');
  const [tipSuccess, setTipSuccess] = useState<string | null>(null);

  // 5-Star Rating State
  const [userStars, setUserStars] = useState<number>(profile.userRating || 0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [reviewTag, setReviewTag] = useState<string>(profile.userReviewText || '');
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string | null>(null);

  const averageRating = profile.rating || 4.9;
  const totalReviews = profile.ratingsCount || 128;

  const handleSendQuickTip = (amount: number) => {
    if (userCredits < amount) {
      alert(`Você precisa de ${amount} 💎 para enviar este presente. Recarregue sua carteira!`);
      return;
    }
    onSendTip(profile, amount);
    setTipSuccess(`Você enviou um presente de ${amount} 💎 para ${profile.name}! ❤️`);
    setTimeout(() => setTipSuccess(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#12121a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0e0e16] shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5 flex-wrap">
              <span>{profile.name}, {profile.age}</span>
              {profile.verified && (
                <div className="flex items-center gap-1.5">
                  <VerifiedBadge
                    size="md"
                    variant="icon"
                    creatorName={profile.name}
                    badgeInfo={profile.verifiedBadge}
                    interactive={true}
                  />
                  <VerifiedBadge
                    size="xs"
                    variant="pill"
                    creatorName={profile.name}
                    badgeInfo={profile.verifiedBadge}
                    interactive={true}
                  />
                </div>
              )}
            </h2>
            <span className="text-xs text-slate-400">· {profile.city}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(profile.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isFavorite
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-950/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
                title={
                  isFavorite
                    ? 'Contato favoritado! Clique para desfavoritar'
                    : 'Selecionar contato como favorito ⭐'
                }
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-slate-950' : 'text-amber-400'}`} />
                <span className="hidden sm:inline">{isFavorite ? 'Favorito ⭐' : 'Favoritar'}</span>
              </button>
            )}

            {onToggleBlock && (
              <button
                type="button"
                onClick={() => onToggleBlock(profile.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isBlocked
                    ? 'bg-rose-950/90 text-rose-300 border-rose-600/70 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-rose-400 hover:border-rose-500/50 hover:bg-slate-700'
                }`}
                title={isBlocked ? 'Desbloquear este contato' : 'Bloquear este contato'}
              >
                {isBlocked ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-rose-300" />
                    <span>Desbloquear</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Bloquear</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Hero Banner / Avatar */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
            <img
              src={profile.avatar}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-amber-300 font-medium">{profile.occupation}</p>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>A {profile.distanceKm} km de distância</span>
                  {profile.zodiacSign && <span>· Signo: {profile.zodiacSign}</span>}
                  {profile.heightCm && <span>· {profile.heightCm} cm</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(profile.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                      isFavorite
                        ? 'bg-amber-400 text-slate-950 shadow-amber-950/40 font-black'
                        : 'bg-black/60 hover:bg-black/80 text-white border border-white/20'
                    }`}
                    title={isFavorite ? 'Contato favoritado! Clique para desfavoritar' : 'Selecionar contato como favorito ⭐'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                    <span>{isFavorite ? 'Favorito ⭐' : 'Favoritar'}</span>
                  </button>
                )}

                {onToggleBlock && (
                  <button
                    type="button"
                    onClick={() => onToggleBlock(profile.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                      isBlocked
                        ? 'bg-rose-950/90 text-rose-300 border border-rose-600/70 shadow-rose-950/50'
                        : 'bg-black/60 hover:bg-black/80 text-white border border-white/20'
                    }`}
                    title={isBlocked ? 'Desbloquear este contato' : 'Bloquear este contato'}
                  >
                    {isBlocked ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-rose-300" />
                        <span>Desbloquear</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5 text-slate-300" />
                        <span>Bloquear</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    onClose();
                    onStartChat(profile);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Conversar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Blocked Contact Warning Card */}
          {isBlocked && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Contato Bloqueado</p>
                  <p className="text-slate-300 text-[11px] leading-tight mt-0.5">
                    Você bloqueou este contato. Você não receberá mensagens ou notificações deste perfil.
                  </p>
                </div>
              </div>
              {onToggleBlock && (
                <button
                  type="button"
                  onClick={() => onToggleBlock(profile.id)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shrink-0 shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              )}
            </div>
          )}

          {/* 5-Star Rating & Reviews Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#141424] border border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-white">
                      {averageRating.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(averageRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      ({totalReviews} avaliações)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Média de notas dadas por membros após conversas, lives e desbloqueios
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/40 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>98% Satisfação</span>
                </span>
              </div>
            </div>

            {/* Interactive User Rating Form */}
            <div className="pt-1 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {userStars > 0 ? 'Sua avaliação enviada:' : 'Deixe sua avaliação de 1 a 5 estrelas:'}
                </span>

                {/* 5 Stars interactive selector */}
                <div className="flex items-center gap-1 bg-[#0e0e18] px-3 py-1.5 rounded-xl border border-slate-800">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoveredStar || userStars) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => {
                          setUserStars(star);
                          if (onRateCreator) {
                            onRateCreator(profile.id, star, reviewTag);
                          }
                          setRatingSuccessMsg(`Você avaliou ${profile.name} com ${star} estrelas! Obrigado.`);
                          setTimeout(() => setRatingSuccessMsg(null), 3500);
                        }}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                        title={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${
                            active
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold font-mono text-amber-300 ml-1.5">
                    {hoveredStar || userStars || ''}{userStars > 0 && !hoveredStar ? '★' : ''}
                  </span>
                </div>
              </div>

              {/* Tag compliments */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Destaques:</span>
                {[
                  '⚡ Responde Rápido',
                  '💎 Conteúdo Impecável',
                  '🔥 Live Incrível',
                  '❤️ Muito Simpática(o)',
                  '✨ Super Atenciosa(o)',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setReviewTag(tag);
                      if (userStars > 0 && onRateCreator) {
                        onRateCreator(profile.id, userStars, tag);
                        setRatingSuccessMsg(`Elogio "${tag}" registrado para ${profile.name}!`);
                        setTimeout(() => setRatingSuccessMsg(null), 3000);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                      reviewTag === tag
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {ratingSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 text-center font-semibold animate-in fade-in duration-200">
                  {ratingSuccessMsg}
                </div>
              )}
            </div>
          </div>

          {/* Quick Tip Alert Notification */}
          {tipSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 text-center font-medium animate-fade-in">
              {tipSuccess}
            </div>
          )}

          {/* Official Verified Creator Trust Card */}
          {profile.verified && (
            <VerifiedBadge
              variant="card"
              creatorName={profile.name}
              badgeInfo={profile.verifiedBadge}
              interactive={true}
            />
          )}

          {/* Bio */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Sobre mim
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed bg-[#161622] p-4 rounded-xl border border-slate-800">
              {profile.bio}
            </p>
          </div>

          {/* Tags de Interesse Populares */}
          {profile.tags && profile.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Tags de Interesse & Estilo</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hobbies & Music details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.hobbies && profile.hobbies.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#161622] border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Hobbies & Atividades</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.hobbies.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.musicGenres && profile.musicGenres.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#161622] border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Music className="w-3.5 h-3.5" />
                  <span>Gostos Musicais</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.musicGenres.map((m, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs border border-slate-700/60">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Lifestyle Details (Sexo, Opção Sexual, Zodiac, Drinking, Smoking, Height) */}
          <div className="p-3.5 rounded-2xl bg-[#141420] border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            {profile.genderLabel && (
              <div>
                <span className="text-[10px] text-slate-500 block">Sexo:</span>
                <span className="font-semibold text-rose-300">{profile.genderLabel}</span>
              </div>
            )}
            {profile.orientationLabel && (
              <div>
                <span className="text-[10px] text-slate-500 block">Opção Sexual:</span>
                <span className="font-semibold text-amber-300">{profile.orientationLabel}</span>
              </div>
            )}
            {profile.drinking && (
              <div>
                <span className="text-[10px] text-slate-500 block">Bebida:</span>
                <span className="font-semibold">{profile.drinking}</span>
              </div>
            )}
            {profile.smoking && (
              <div>
                <span className="text-[10px] text-slate-500 block">Fumo:</span>
                <span className="font-semibold">{profile.smoking}</span>
              </div>
            )}
            {profile.zodiacSign && (
              <div>
                <span className="text-[10px] text-slate-500 block">Signo:</span>
                <span className="font-semibold">{profile.zodiacSign}</span>
              </div>
            )}
            {profile.relationshipGoal && (
              <div>
                <span className="text-[10px] text-slate-500 block">Procurando:</span>
                <span className="font-semibold text-rose-300">{profile.relationshipGoal}</span>
              </div>
            )}
          </div>

          {/* Send Mimo / Tip Bar */}
          <div className="p-4 bg-gradient-to-r from-amber-950/30 to-rose-950/30 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Envie um Presente em Diamantes (💎)</h4>
                <p className="text-[11px] text-slate-400">
                  Demonstre seu interesse e apoie {profile.name} com diamantes da sua carteira
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSendQuickTip(29)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
              >
                29 💎
              </button>
              <button
                onClick={() => handleSendQuickTip(49)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
              >
                49 💎
              </button>
              <button
                onClick={() => handleSendQuickTip(99)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
              >
                99 💎
              </button>
            </div>
          </div>

          {/* Media Tabs: VIP Vault vs Public Photos */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 mb-4 pb-2">
              <button
                onClick={() => setActiveTab('vip')}
                className={`flex items-center gap-2 pb-1 text-sm font-bold cursor-pointer transition-colors ${
                  activeTab === 'vip'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Cofre VIP (+18 Exclusivo · 149 💎 / 30 dias) ({profile.vipMedia.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('public')}
                className={`flex items-center gap-2 pb-1 text-sm font-medium cursor-pointer transition-colors ${
                  activeTab === 'public'
                    ? 'text-white border-b-2 border-rose-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Fotos Públicas ({profile.photos.length})</span>
              </button>
            </div>

            {/* VIP Media Grid */}
            {activeTab === 'vip' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.vipMedia.map((media) => (
                  <div
                    key={media.id}
                    className="relative rounded-2xl overflow-hidden bg-[#161622] border border-amber-500/30 flex flex-col group shadow-lg"
                  >
                    {/* Media Image Container */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                      <img
                        src={media.mediaUrl}
                        alt={media.title}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          media.isUnlocked ? 'filter-none group-hover:scale-105' : 'filter blur-[14px] scale-110'
                        }`}
                      />

                      {/* Locked Overlay */}
                      {!media.isUnlocked && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mb-2 shadow-lg">
                            <Lock className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-semibold text-white mb-1">
                            Conteúdo Restrito (+18)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-full border border-amber-400/30">
                            {media.priceCredits} 💎 para Desbloquear
                          </span>
                        </div>
                      )}

                      {/* Unlocked Badge */}
                      {media.isUnlocked && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          <span>Desbloqueado</span>
                        </div>
                      )}
                    </div>

                    {/* Media Card Info & Actions */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 bg-[#151520]">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">{media.title}</h4>
                        <p className="text-xs text-slate-300 line-clamp-2 mb-2">
                          {media.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[11px] text-slate-400">
                          {media.unlockCount} acessos
                        </span>

                        {media.isUnlocked ? (
                          <button
                            onClick={() => onOpenUnlockModal(media)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Visualizar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenUnlockModal(media)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-950 cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Liberar ({media.priceCredits} 💎)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Public Photos Grid */}
            {activeTab === 'public' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
                  >
                    <img
                      src={photo}
                      alt={`Foto pública ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
