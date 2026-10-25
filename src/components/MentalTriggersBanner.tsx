import React, { useState, useEffect } from 'react';
import {
  Zap,
  Flame,
  Clock,
  Sparkles,
  Users,
  Coins,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface MentalTriggersBannerProps {
  onOpenWallet: () => void;
  variant?: 'banner' | 'ticker' | 'compact';
  className?: string;
}

const SOCIAL_PROOF_EVENTS = [
  { text: 'Rodrigo (Rio de Janeiro) acabou de recarregar 500 créditos 💎', time: 'Há 12s', icon: 'coins' },
  { text: 'Lucas desbloqueou foto secreta no Cofre VIP de Valentina 🔥', time: 'Há 28s', icon: 'flame' },
  { text: 'Mais de 1.480 pessoas recarregaram créditos hoje no Brasil', time: 'Em alta', icon: 'users' },
  { text: 'Camila acabou de entrar ao vivo em transmissão privativa 🎥', time: 'Agora', icon: 'sparkles' },
  { text: 'Matheus sacou R$ 120,00 via PIX pelo programa de indicação 💸', time: 'Há 2m', icon: 'zap' },
  { text: 'Felipe atingiu o Nível de Prestígio Ouro VIP 👑', time: 'Há 4m', icon: 'sparkles' },
];

export const MentalTriggersBanner: React.FC<MentalTriggersBannerProps> = ({
  onOpenWallet,
  variant = 'banner',
  className = '',
}) => {
  // Countdown timer for scarcity trigger (Starts at 14m 58s)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return 14 * 60 + 58;
  });

  // Rotating social proof index
  const [socialIndex, setSocialIndex] = useState(0);

  // Timer countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 15 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Social proof rotating effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSocialIndex((prev) => (prev + 1) % SOCIAL_PROOF_EVENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const currentEvent = SOCIAL_PROOF_EVENTS[socialIndex];

  if (variant === 'ticker') {
    return (
      <div
        className={`px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs text-slate-300 animate-in fade-in transition-all ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <span className="truncate max-w-[280px] sm:max-w-md font-medium text-slate-200">
          {currentEvent.text}
        </span>
        <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
          {currentEvent.time}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`p-3 rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#18121d] to-rose-950/70 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-left ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Gatilho Promocional +50% Bônus
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/60 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold">
                Expira em {formattedTime}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Recarregue agora e ganhe dobro de créditos para desbloquear fotos íntimas e chats prioritários.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-amber-950 shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>Aproveitar Bônus</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full Promotional Banner with multiple psychological triggers:
  // 1. Scarcity & Countdown
  // 2. Real-time Social Proof Ticker
  // 3. Loss Aversion
  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/80 via-[#181120] to-rose-950/80 border-2 border-amber-500/50 shadow-2xl space-y-3.5 relative overflow-hidden ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Urgency and Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <Flame className="w-3 h-3 fill-slate-950" />
            <span>Oferta Relâmpago VIP</span>
          </span>
          <span className="text-xs text-amber-300/90 font-medium hidden sm:inline">
            Apenas 3 pacotes restantes nesta faixa
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Bônus encerra em:</span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-black/80 border border-amber-400/50 text-amber-300 font-mono font-black text-xs tracking-wider shadow-inner">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Main Pitch: Loss Aversion & Scarcity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-white font-display flex items-center gap-2">
            <span>Turbine suas Conexões com +50% de Créditos Extras</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Perfis com saldo ativo possuem <strong className="text-amber-300">taxa de resposta 3.4x maior</strong> e prioridade imediata nos chats privados dos criadores. Não deixe suas conversas esfriarem.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-xs sm:text-sm transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 shrink-0"
        >
          <Coins className="w-4 h-4 fill-slate-950" />
          <span>Garantir Créditos com Bônus</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live Social Proof Stream Bar */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] text-slate-300 truncate">
            {currentEvent.text}
          </span>
        </div>
        <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
          {currentEvent.time}
        </span>
      </div>
    </div>
  );
};
