import React, { useState } from 'react';
import { FanTierInfo, FanTierLevel } from '../types';
import {
  Medal,
  Award,
  Crown,
  Gem,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Lock,
  Coins,
  ArrowUpRight,
  X,
  Shield,
  Star,
} from 'lucide-react';

import { PRESTIGE_TIERS, getPrestigeTier } from '../data/prestigeData';

export const FAN_TIERS: FanTierInfo[] = PRESTIGE_TIERS;
export const getFanTier = getPrestigeTier;

interface FanTierBadgeProps {
  creditsSpent: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'full_card';
  onOpenWallet?: () => void;
  className?: string;
}

export const FanTierBadge: React.FC<FanTierBadgeProps> = ({
  creditsSpent,
  size = 'md',
  variant = 'badge',
  onOpenWallet,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentTier = getFanTier(creditsSpent);

  // Calculate progress toward next tier
  const nextTier =
    currentTier.nextTierCredits !== null
      ? FAN_TIERS.find((t) => t.minCredits === currentTier.nextTierCredits)
      : null;

  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          ((creditsSpent - currentTier.minCredits) /
            (nextTier.minCredits - currentTier.minCredits)) *
            100
        )
      )
    : 100;

  const creditsRemaining = nextTier ? Math.max(0, nextTier.minCredits - creditsSpent) : 0;

  const renderTierIcon = (level: FanTierLevel, iconClass = 'w-3.5 h-3.5') => {
    switch (level) {
      case 'bronze':
        return <Medal className={iconClass} />;
      case 'prata':
        return <Award className={iconClass} />;
      case 'ouro':
        return <Crown className={iconClass} />;
      case 'platina':
        return <Gem className={iconClass} />;
      case 'diamante':
        return <Shield className={iconClass} />;
      case 'supremo':
        return <Sparkles className={iconClass} />;
      default:
        return <Medal className={iconClass} />;
    }
  };

  if (variant === 'badge') {
    const sizeClasses = {
      xs: 'px-2 py-0.5 text-[9px] gap-1',
      sm: 'px-2.5 py-0.5 text-[10px] gap-1',
      md: 'px-3 py-1 text-xs gap-1.5',
      lg: 'px-3.5 py-1.5 text-sm gap-2',
    };

    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center rounded-full border font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${currentTier.badgeColorClass} ${sizeClasses[size]} ${className}`}
          title={`Nível de Fã: ${currentTier.name} (${creditsSpent} créditos gastos). Clique para ver detalhes e benefícios.`}
        >
          {renderTierIcon(currentTier.level, size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')}
          <span className="tracking-wide uppercase font-display">{currentTier.badge}</span>
          <Sparkles className="w-2.5 h-2.5 opacity-80" />
        </button>

        {/* Modal with Tier Details */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg bg-[#10101a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-5 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 pr-8">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center p-0.5 shadow-lg border ${currentTier.borderClass} ${currentTier.badgeColorClass}`}
                >
                  {renderTierIcon(currentTier.level, 'w-7 h-7 text-current')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Sistema de Prestígio
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">
                    {currentTier.name}
                  </h3>
                  <p className="text-xs text-slate-300">{currentTier.description}</p>
                </div>
              </div>

              {/* Progress to Next Tier */}
              <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Progresso de Prestígio:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {creditsSpent} créditos gastos no total
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nível Atual: {currentTier.badge}</span>
                  {nextTier ? (
                    <span className="text-amber-300 font-semibold">
                      Faltam {creditsRemaining} créditos para {nextTier.badge}
                    </span>
                  ) : (
                    <span className="text-cyan-300 font-bold">Nível Máximo Atingido! 💎</span>
                  )}
                </div>
              </div>

              {/* Perks List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Vantagens Ativas do seu Nível:
                </h4>
                <div className="space-y-1.5">
                  {currentTier.perks.map((perk, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Tiers Overview */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Todos os Níveis de Fã:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {FAN_TIERS.map((tier) => {
                    const isReached = creditsSpent >= tier.minCredits;
                    const isCurrent = currentTier.level === tier.level;
                    return (
                      <div
                        key={tier.level}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-950/40'
                            : isReached
                            ? 'bg-slate-900/80 border-slate-700 opacity-90'
                            : 'bg-black/40 border-slate-800/60 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1 text-white">
                          {renderTierIcon(tier.level, 'w-4 h-4')}
                        </div>
                        <div className="text-xs font-bold text-white">{tier.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {tier.minCredits === 0 ? '0 créditos' : `+${tier.minCredits} 💎`}
                        </div>
                        {isCurrent && (
                          <span className="inline-block mt-1 text-[9px] font-black uppercase text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/40">
                            Atual
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions footer */}
              {onOpenWallet && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onOpenWallet();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Subir de Nível: Adicionar Créditos na Carteira</span>
                </button>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // VARIANT: FULL PRESTIGE CARD
  return (
    <div
      className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br ${currentTier.bgGradient} border ${currentTier.borderClass} shadow-xl relative overflow-hidden space-y-4 ${className}`}
    >
      {/* Background ambient light */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: currentTier.glowColor }}
      />

      {/* Top Row: Tier and Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md ${currentTier.badgeColorClass}`}
          >
            {renderTierIcon(currentTier.level, 'w-6 h-6 text-current')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Badge de Prestígio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/10 text-slate-200 border border-white/15">
                Nível Ativo
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white font-display flex items-center gap-2">
              <span>{currentTier.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${currentTier.badgeColorClass}`}>
                {currentTier.badge}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Total Gasto na Plataforma</span>
            <span className="text-base font-mono font-bold text-amber-300 flex items-center justify-end gap-1">
              <Coins className="w-4 h-4 text-amber-400" />
              {creditsSpent} Créditos
            </span>
          </div>

          {onOpenWallet && (
            <button
              type="button"
              onClick={onOpenWallet}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-950 shrink-0 flex items-center gap-1"
            >
              <span>Recarregar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar towards Next Tier */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Progresso para o próximo nível</span>
          {nextTier ? (
            <span className="text-amber-300 font-semibold font-mono">
              Faltam {creditsRemaining} 💎 para {nextTier.badge}
            </span>
          ) : (
            <span className="text-cyan-300 font-bold font-mono">Patamar Supremo 💎</span>
          )}
        </div>

        <div className="w-full h-2.5 rounded-full bg-black/60 border border-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-300 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Perks and Levels List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 relative z-10">
        {currentTier.perks.slice(0, 4).map((perk, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-slate-200 bg-black/30 p-2 rounded-xl border border-white/5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{perk}</span>
          </div>
        ))}
      </div>

      {/* Tier Selector Buttons (Quick comparison) */}
      <div className="pt-2 flex items-center justify-between gap-1 overflow-x-auto relative z-10">
        {FAN_TIERS.map((tier) => {
          const isCurrent = currentTier.level === tier.level;
          const isReached = creditsSpent >= tier.minCredits;

          return (
            <button
              key={tier.level}
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`flex-1 min-w-[70px] p-2 rounded-xl text-center border transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-amber-400/20 border-amber-400 shadow-md shadow-amber-950/40'
                  : isReached
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-black/30 border-white/5 opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-center justify-center mb-0.5 text-slate-200">
                {renderTierIcon(tier.level, 'w-3.5 h-3.5')}
              </div>
              <div className="text-[11px] font-bold text-white truncate">{tier.name}</div>
              <div className="text-[9px] text-slate-400 font-mono">
                {tier.minCredits === 0 ? '0' : `+${tier.minCredits}`} 💎
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
