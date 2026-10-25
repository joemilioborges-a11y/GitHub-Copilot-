/**
 * JOBS — LIVE POPULARITY INDICATOR (SALA DE TRANSMISSÃO)
 * 
 * Indicador visual e em tempo real do nível de engajamento da transmissão:
 * - Métrica experimental claramente identificada e documentada.
 * - Reutiliza dados reais da sessão: espectadores simultâneos, curtidas e presentes em créditos.
 * - Escala progressiva transparente em 5 níveis com barra de progresso suave.
 * - Tratamento defensivo contra valores nulos, negativos ou indefinidos.
 * - Totalmente isolado do livro-razão contábil: zero impacto em rankings financeiros ou saldos.
 */

import React, { useMemo } from 'react';
import { Flame, TrendingUp, Sparkles, Award, Star } from 'lucide-react';

export interface LivePopularityParams {
  viewerCount?: number | null;
  likesCount?: number | null;
  totalGiftsCredits?: number | null;
}

export interface PopularityTierConfig {
  level: number;
  label: string;
  minScore: number;
  maxScore: number;
  badgeClass: string;
  barGradient: string;
}

export const POPULARITY_TIERS: PopularityTierConfig[] = [
  {
    level: 1,
    label: 'Aquecendo',
    minScore: 0,
    maxScore: 250,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    barGradient: 'from-slate-500 to-amber-500',
  },
  {
    level: 2,
    label: 'Em Alta',
    minScore: 250,
    maxScore: 750,
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    barGradient: 'from-amber-500 to-rose-500',
  },
  {
    level: 3,
    label: 'Bombando',
    minScore: 750,
    maxScore: 2000,
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    barGradient: 'from-rose-500 to-pink-500',
  },
  {
    level: 4,
    label: 'Super Popular',
    minScore: 2000,
    maxScore: 5000,
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
    barGradient: 'from-pink-500 to-purple-500',
  },
  {
    level: 5,
    label: 'Fenômeno da Noite ★',
    minScore: 5000,
    maxScore: 10000,
    badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 text-slate-950 font-black border-transparent',
    barGradient: 'from-amber-400 via-rose-500 to-purple-500',
  },
];

export interface LivePopularityResult {
  score: number;
  currentLevel: number;
  levelLabel: string;
  badgeClass: string;
  barGradient: string;
  progressPercent: number; // 0..100%
  nextGoalScore: number;
  pointsToNextLevel: number;
  isMaxLevel: boolean;
}

/**
 * Fórmula de cálculo documentada do índice de engajamento da live:
 * Score = (viewers * 2) + (likes * 1) + (giftsCredits * 5)
 */
export function calculateLivePopularity(params: LivePopularityParams): LivePopularityResult {
  const viewers = Math.max(0, Number(params.viewerCount) || 0);
  const likes = Math.max(0, Number(params.likesCount) || 0);
  const gifts = Math.max(0, Number(params.totalGiftsCredits) || 0);

  const rawScore = Math.round(viewers * 2 + likes * 1 + gifts * 5);
  const score = Math.max(0, rawScore);

  let activeTier = POPULARITY_TIERS[0];
  for (let i = POPULARITY_TIERS.length - 1; i >= 0; i--) {
    if (score >= POPULARITY_TIERS[i].minScore) {
      activeTier = POPULARITY_TIERS[i];
      break;
    }
  }

  const isMaxLevel = activeTier.level === POPULARITY_TIERS[POPULARITY_TIERS.length - 1].level;
  const range = activeTier.maxScore - activeTier.minScore;
  const progressInTier = score - activeTier.minScore;
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((progressInTier / range) * 100)));

  const pointsToNext = isMaxLevel ? 0 : Math.max(0, activeTier.maxScore - score);

  return {
    score,
    currentLevel: activeTier.level,
    levelLabel: activeTier.label,
    badgeClass: activeTier.badgeClass,
    barGradient: activeTier.barGradient,
    progressPercent,
    nextGoalScore: activeTier.maxScore,
    pointsToNextLevel: pointsToNext,
    isMaxLevel,
  };
}

export interface LivePopularityIndicatorProps {
  viewerCount?: number | null;
  likesCount?: number | null;
  totalGiftsCredits?: number | null;
  className?: string;
}

export const LivePopularityIndicator: React.FC<LivePopularityIndicatorProps> = ({
  viewerCount,
  likesCount,
  totalGiftsCredits,
  className = '',
}) => {
  const result = useMemo(
    () => calculateLivePopularity({ viewerCount, likesCount, totalGiftsCredits }),
    [viewerCount, likesCount, totalGiftsCredits]
  );

  return (
    <div
      role="status"
      aria-label={`Popularidade da live: ${result.levelLabel}, pontuação: ${result.score}`}
      className={`px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-2.5 max-w-xs ${className}`}
    >
      <div className="shrink-0 flex items-center justify-center">
        {result.currentLevel >= 4 ? (
          <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
        ) : (
          <TrendingUp className="w-4 h-4 text-amber-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] mb-1 leading-none">
          <span className="font-extrabold text-white truncate flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${result.badgeClass}`}
            >
              {result.levelLabel}
            </span>
            <span className="text-slate-400 font-mono text-[9px]">
              ({result.score.toLocaleString('pt-BR')} pts)
            </span>
          </span>

          {!result.isMaxLevel && (
            <span className="text-slate-400 text-[9px] font-mono shrink-0 ml-1">
              {result.progressPercent}%
            </span>
          )}
        </div>

        {/* Barra de Progresso Suave */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
          <div
            style={{ width: `${result.progressPercent}%` }}
            className={`h-full rounded-full bg-gradient-to-r ${result.barGradient} transition-all duration-500 ease-out`}
          />
        </div>
      </div>
    </div>
  );
};
