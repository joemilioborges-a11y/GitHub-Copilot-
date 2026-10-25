import React from 'react';
import { Profile } from '../types';
import { Flame, MessageCircle, Lock, Heart, X, Sparkles } from 'lucide-react';

interface MatchCelebrationModalProps {
  matchedProfile: Profile;
  onClose: () => void;
  onGoToChat: (profile: Profile) => void;
  onGoToVault: (profile: Profile) => void;
}

export const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  matchedProfile,
  onClose,
  onGoToChat,
  onGoToVault,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
      <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#12121a] border border-rose-500/50 rounded-3xl shadow-2xl text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/60 animate-bounce">
          <Flame className="w-9 h-9 fill-white" />
        </div>

        <h2 className="text-3xl font-black text-white font-display tracking-tight mb-1">
          Deu Match no Jhobs!
        </h2>
        <p className="text-xs text-rose-300 font-medium mb-6">
          Você e <strong className="text-white">{matchedProfile.name}</strong> se curtiram mutuamente!
        </p>

        {/* Both Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-rose-500 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
              alt="Você"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
            <Heart className="w-4 h-4 fill-white" />
          </div>

          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl">
            <img
              src={matchedProfile.avatar}
              alt={matchedProfile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => onGoToChat(matchedProfile)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Mandar Mensagem Agora</span>
          </button>

          {matchedProfile.vipMedia.length > 0 && (
            <button
              onClick={() => onGoToVault(matchedProfile)}
              className="w-full py-3 px-4 rounded-xl bg-[#1a1a28] hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Cofre VIP de {matchedProfile.name.split(' ')[0]} ({matchedProfile.vipMedia.length} mídias)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Continuar Deslizando Perfis
          </button>
        </div>
      </div>
    </div>
  );
};
