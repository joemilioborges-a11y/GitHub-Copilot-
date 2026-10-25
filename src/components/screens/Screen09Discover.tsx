import React, { useState } from 'react';
import {
  Heart,
  X,
  Info,
  Sparkles,
  Zap,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  MessageCircle,
  Filter,
} from 'lucide-react';
import { Profile, UserProfileData } from '../../types';
import { calculateAiCompatibility } from '../../utils/aiMatchmaking';

interface Screen09DiscoverProps {
  profiles: Profile[];
  userProfile: UserProfileData;
  onLike: (profile: Profile) => void;
  onPass: (profile: Profile) => void;
  onViewProfile: (profile: Profile) => void;
  onSendInterest: (profile: Profile, message?: string) => void;
  onOpenPreferences: () => void;
}

export const Screen09Discover: React.FC<Screen09DiscoverProps> = ({
  profiles,
  userProfile,
  onLike,
  onPass,
  onViewProfile,
  onSendInterest,
  onOpenPreferences,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');

  const currentProfile = profiles[currentIndex] || null;

  const handleNextCard = () => {
    setCurrentPhotoIndex(0);
    setCurrentIndex((prev) => (prev + 1 < profiles.length ? prev + 1 : 0));
  };

  const handleLike = () => {
    if (!currentProfile) return;
    onLike(currentProfile);
    handleNextCard();
  };

  const handlePass = () => {
    if (!currentProfile) return;
    onPass(currentProfile);
    handleNextCard();
  };

  const handleSendSuperInterest = () => {
    if (!currentProfile) return;
    onSendInterest(currentProfile, interestMessage);
    setInterestModalOpen(false);
    setInterestMessage('');
    handleNextCard();
  };

  if (!currentProfile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Flame className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-bold text-white">Você viu todos os perfis por enquanto!</h2>
        <p className="text-xs text-slate-400">
          Ajuste suas preferências de busca para encontrar mais conexões em outras regiões ou faixas etárias.
        </p>
        <button
          onClick={onOpenPreferences}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
        >
          Ajustar Preferências
        </button>
      </div>
    );
  }

  const ai = calculateAiCompatibility(userProfile, currentProfile);
  const profilePhotos = currentProfile.photos?.length ? currentProfile.photos : [currentProfile.avatar];
  const photoUrl = profilePhotos[currentPhotoIndex] || currentProfile.avatar;

  return (
    <div className="max-w-md mx-auto px-4 py-2">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Flame className="w-4 h-4 text-rose-500 fill-current" />
          <span className="font-bold text-white">Descoberta JOBS</span>
          <span className="text-[11px] text-slate-400">({currentIndex + 1} de {profiles.length})</span>
        </div>
        <button
          onClick={onOpenPreferences}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Filtros e Preferências"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 group select-none">
        {/* Photo Display */}
        <img
          src={photoUrl}
          alt={currentProfile.name}
          className="w-full h-full object-cover transition-transform duration-500"
        />

        {/* Carousel Photo Indicator Bars */}
        {profilePhotos.length > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {profilePhotos.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i === currentPhotoIndex ? 'bg-white shadow' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Tap areas for photo carousel */}
        {profilePhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : profilePhotos.length - 1));
              }}
              className="absolute left-0 top-12 bottom-28 w-1/3 z-10 opacity-0"
              aria-label="Foto anterior"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex((prev) => (prev + 1 < profilePhotos.length ? prev + 1 : 0));
              }}
              className="absolute right-0 top-12 bottom-28 w-1/3 z-10 opacity-0"
              aria-label="Próxima foto"
            />
          </>
        )}

        {/* AI Explainable Compatibility Pill */}
        <div className="absolute top-6 left-3 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{ai.overallScore}% Afinidade IA</span>
          </div>
        </div>

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

        {/* Profile Card Information */}
        <div className="absolute bottom-20 left-4 right-4 z-20 text-white space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-extrabold tracking-tight">
              {currentProfile.name}
            </h2>
            <span className="text-xl font-normal text-slate-300">, {currentProfile.age}</span>
            {currentProfile.verified && (
              <ShieldCheck className="w-5 h-5 text-rose-400 fill-rose-500/20 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{currentProfile.city}</span>
            <span className="text-slate-500">•</span>
            <span>{currentProfile.occupation}</span>
          </div>

          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
            {currentProfile.bio}
          </p>

          {/* Common Interests Badges */}
          {ai.commonInterests.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {ai.commonInterests.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[10px] font-semibold"
                >
                  ★ {item} em comum
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The 4 Core Required Action Buttons */}
        <div className="absolute bottom-3 left-4 right-4 z-30 flex items-center justify-between gap-2.5">
          {/* 1. Passar */}
          <button
            onClick={handlePass}
            className="w-12 h-12 rounded-full bg-slate-900/90 border border-white/20 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
            title="Passar"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 2. Ver Perfil */}
          <button
            onClick={() => onViewProfile(currentProfile)}
            className="px-4 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <Info className="w-4 h-4 text-rose-400" />
            <span>Ver perfil</span>
          </button>

          {/* 3. Enviar Interesse (Super Like) */}
          <button
            onClick={() => setInterestModalOpen(true)}
            className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
            title="Enviar interesse com mensagem"
          >
            <Zap className="w-5 h-5 fill-current" />
          </button>

          {/* 4. Gostei */}
          <button
            onClick={handleLike}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white flex items-center justify-center shadow-xl shadow-rose-900/60 transition-transform active:scale-90 cursor-pointer"
            title="Gostei"
          >
            <Heart className="w-7 h-7 fill-current" />
          </button>
        </div>
      </div>

      {/* Modal for "Enviar Interesse" with quick message */}
      {interestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#12121e] border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-current" />
                <h3 className="font-display font-bold text-base text-white">
                  Enviar Interesse para {currentProfile.name}
                </h3>
              </div>
              <button
                onClick={() => setInterestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Destaque seu interesse enviando uma primeira mensagem antes mesmo do match!
            </p>

            {/* AI Suggested Icebreaker */}
            {ai.icebreakers.length > 0 && (
              <div
                onClick={() => setInterestMessage(ai.icebreakers[0])}
                className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 cursor-pointer hover:bg-amber-500/20 transition-colors"
              >
                <span className="block text-[10px] font-bold text-amber-400 uppercase mb-1">
                  💡 Sugestão de quebra-gelo IA:
                </span>
                "{ai.icebreakers[0]}"
              </div>
            )}

            <textarea
              rows={3}
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Escreva algo gentil e autêntico..."
              className="w-full bg-[#181828] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />

            <button
              onClick={handleSendSuperInterest}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-display font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Enviar Interesse Imediato</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
