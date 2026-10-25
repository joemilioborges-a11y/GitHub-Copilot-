import React, { useState } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Ban,
  MapPin,
  Briefcase,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Profile, UserProfileData } from '../../types';
import { calculateAiCompatibility } from '../../utils/aiMatchmaking';

interface Screen10ProfileDetailProps {
  profile: Profile;
  userProfile: UserProfileData;
  onClose: () => void;
  onLike: (profile: Profile) => void;
  onStartChat: (profile: Profile) => void;
  onBlock: (profile: Profile) => void;
  onReport: (profile: Profile) => void;
}

export const Screen10ProfileDetail: React.FC<Screen10ProfileDetailProps> = ({
  profile,
  userProfile,
  onClose,
  onLike,
  onStartChat,
  onBlock,
  onReport,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = profile.photos?.length ? profile.photos : [profile.avatar];

  const ai = calculateAiCompatibility(userProfile, profile);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl flex justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-[#0d0d16] border-x sm:border border-white/10 sm:rounded-3xl shadow-2xl min-h-screen sm:min-h-0 flex flex-col relative">
        {/* Top Floating Controls */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onReport(profile)}
              className="p-2 rounded-full bg-black/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
              title="Denunciar este perfil com sigilo"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button
              onClick={() => onBlock(profile)}
              className="p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Bloquear usuário"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gallery Carousel */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-900 overflow-hidden">
          <img
            src={photos[photoIndex]}
            alt={profile.name}
            className="w-full h-full object-cover"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPhotoIndex((prev) => (prev + 1 < photos.length ? prev + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 px-2 py-1 rounded-full">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i === photoIndex ? 'bg-rose-500' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {profile.name}
                </h1>
                <span className="text-xl sm:text-2xl text-slate-300 font-normal">, {profile.age}</span>
                {profile.verified && (
                  <ShieldCheck className="w-6 h-6 text-rose-400 fill-rose-500/20 shrink-0" />
                )}
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {profile.online ? 'Online agora' : 'Visto recentemente'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{profile.city}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.occupation}</span>
              </div>
            </div>
          </div>

          {/* AI Compatibility Deep Analysis Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#131322] to-[#10101b] border border-amber-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-display font-bold text-sm text-white">
                  Compatibilidade IA Explicável
                </span>
              </div>
              <span className="text-sm font-extrabold text-amber-400 font-display">
                {ai.overallScore}% Afinidade
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
              "{ai.explanation}"
            </p>

            {/* Breakdown Bars */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Interesses em Comum</span>
                  <span className="text-white font-semibold">{ai.interestsScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${ai.interestsScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Objetivos de Vida</span>
                  <span className="text-white font-semibold">{ai.goalsScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ai.goalsScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Estilo de Vida</span>
                  <span className="text-white font-semibold">{ai.lifestyleScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ai.lifestyleScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Sinergia de Perfil</span>
                  <span className="text-white font-semibold">{ai.communicationScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${ai.communicationScore}%` }} />
                </div>
              </div>
            </div>

            {/* Ethical Disclaimer */}
            <p className="text-[10px] text-slate-400 pt-1 leading-normal italic">
              {ai.disclaimer}
            </p>
          </div>

          {/* Bio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sobre mim
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed bg-[#11111c] p-4 rounded-2xl border border-white/5">
              {profile.bio}
            </p>
          </div>

          {/* Interesses & Hobbies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Interesses e Hobbies
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Detalhes de Estilo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Buscando</span>
              <span className="font-semibold text-white">{profile.relationshipGoal || 'Conexões Reais'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Signo</span>
              <span className="font-semibold text-white">{profile.zodiacSign || 'Escorpião'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Bebida</span>
              <span className="font-semibold text-white">{profile.drinking || 'Socialmente'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Distância</span>
              <span className="font-semibold text-white">~{profile.distanceKm || 4} km</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="sticky bottom-0 p-4 bg-[#0d0d16]/95 backdrop-blur-lg border-t border-white/10 flex items-center gap-3">
          <button
            onClick={() => onLike(profile)}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Heart className="w-5 h-5 fill-current" />
            <span>Curtir este Perfil</span>
          </button>

          <button
            onClick={() => onStartChat(profile)}
            className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-display font-bold text-sm border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            <span>Mensagem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
