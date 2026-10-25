/**
 * JOBS — GIFT ANIMATION OVERLAY (SALA DE TRANSMISSÃO)
 * 
 * Camada de animação visual de alta fidelidade sobre o vídeo da transmissão ao vivo.
 * Atende com rigor a todas as diretrizes de governança e segurança do JOBS:
 * - Camada puramente visual: zero débitos, zero mutações financeiras, sem chamadas ao ledgerService.
 * - Deduplicação estrita por eventId: previne repetição de animações em rebroadcast ou reconnect.
 * - Isolamento por transmissão: ignora sumariamente eventos com liveId divergente da sala atual.
 * - Fila concorrente controlada: exibe até maxConcurrent (padrão: 3) e enfileira o excedente em FIFO.
 * - Hierarquia estética por categorias/tiers:
 *     * Bronze (Clássico, < 50 créditos)
 *     * Silver (VIP, 50 a 199 créditos)
 *     * Gold (Luxo, 200 a 499 créditos)
 *     * Diamond (Lendário, 500+ créditos)
 * - Container com pointer-events-none: o vídeo e os controles interativos continuam 100% clicáveis.
 * - Acessibilidade: respeita preferências de redução de movimento (prefers-reduced-motion).
 * - Limpeza graciosa ao desmontar ou alternar a live ativa.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Crown, Gem, Flame, Heart, Gift, Award, Star } from 'lucide-react';

export type GiftAnimationTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface GiftOverlayEvent {
  eventId: string;
  liveId: string;
  senderId?: string;
  senderDisplayName?: string;
  senderName?: string;
  senderAvatar?: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  quantity?: number;
  amountCredits?: number;
  creditsCost?: number;
  tier?: GiftAnimationTier;
  timestamp?: number;
  isPrivate?: boolean;
}

export interface ActiveGiftAnimationItem {
  id: string;
  event: GiftOverlayEvent;
  tier: GiftAnimationTier;
  status: 'entering' | 'active' | 'exiting';
  senderDisplay: string;
  credits: number;
  quantity: number;
  durationMs: number;
  createdAt: number;
}

export function resolveGiftTier(cost: number, explicitTier?: GiftAnimationTier): GiftAnimationTier {
  if (explicitTier) return explicitTier;
  if (cost >= 500) return 'diamond';
  if (cost >= 200) return 'gold';
  if (cost >= 50) return 'silver';
  return 'bronze';
}

export const TIER_DURATIONS_MS: Record<GiftAnimationTier, number> = {
  bronze: 3200,
  silver: 3800,
  gold: 4400,
  diamond: 5200,
};

export const TIER_VISUAL_STYLES: Record<
  GiftAnimationTier,
  {
    tierLabel: string;
    borderStyle: string;
    bgStyle: string;
    badgeStyle: string;
    accentTextColor: string;
    highlightGlow: string;
    hasParticles: boolean;
    hasShimmer: boolean;
  }
> = {
  bronze: {
    tierLabel: 'Mimo Carinhoso',
    borderStyle: 'border border-amber-800/40',
    bgStyle: 'bg-slate-950/85 backdrop-blur-md shadow-xl shadow-black/60',
    badgeStyle: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
    accentTextColor: 'text-amber-400',
    highlightGlow: 'rgba(217, 119, 6, 0.2)',
    hasParticles: false,
    hasShimmer: false,
  },
  silver: {
    tierLabel: 'Mimo VIP Especial',
    borderStyle: 'border border-cyan-400/50 shadow-xl shadow-cyan-950/40',
    bgStyle: 'bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-lg shadow-2xl',
    badgeStyle: 'bg-cyan-950/90 text-cyan-200 border border-cyan-500/50 shadow-sm',
    accentTextColor: 'text-cyan-300',
    highlightGlow: 'rgba(6, 182, 212, 0.35)',
    hasParticles: false,
    hasShimmer: true,
  },
  gold: {
    tierLabel: 'VIP LUXO EXCLUSIVO',
    borderStyle: 'border-2 border-amber-400/90 shadow-2xl shadow-amber-500/35 ring-1 ring-amber-300/40',
    bgStyle: 'bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-slate-950/95 backdrop-blur-xl',
    badgeStyle: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-950',
    accentTextColor: 'text-amber-300',
    highlightGlow: 'rgba(245, 158, 11, 0.5)',
    hasParticles: true,
    hasShimmer: true,
  },
  diamond: {
    tierLabel: '★ PRESENTE LENDÁRIO SUPREMO ★',
    borderStyle: 'border-2 border-fuchsia-400/95 shadow-2xl shadow-fuchsia-600/50 ring-2 ring-fuchsia-400/40',
    bgStyle: 'bg-gradient-to-r from-purple-950/95 via-fuchsia-950/90 to-slate-950/95 backdrop-blur-2xl',
    badgeStyle: 'bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-fuchsia-950',
    accentTextColor: 'text-fuchsia-300',
    highlightGlow: 'rgba(217, 70, 239, 0.65)',
    hasParticles: true,
    hasShimmer: true,
  },
};

/**
 * Gerenciador headless de Fila e Deduplicação do Overlay de Presentes.
 * Testável de forma isomórfica sem depender do ciclo de renderização do React.
 */
export interface GiftOverlayManagerOptions {
  liveId: string;
  maxConcurrent?: number;
  maxQueueSize?: number;
  reducedMotion?: boolean;
  onAnimationComplete?: (eventId: string) => void;
  onStateChange?: () => void;
}

export class GiftOverlayQueueManager {
  private liveId: string;
  private maxConcurrent: number;
  private maxQueueSize: number;
  private reducedMotion: boolean;
  private onAnimationComplete?: (eventId: string) => void;
  private onStateChange?: () => void;

  private activeItems: ActiveGiftAnimationItem[] = [];
  private pendingQueue: GiftOverlayEvent[] = [];
  private processedEventIds: Set<string> = new Set();
  private timers: Map<string, NodeJS.Timeout | number> = new Map();
  private isDisposed: boolean = false;

  constructor(options: GiftOverlayManagerOptions) {
    this.liveId = options.liveId;
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.maxQueueSize = options.maxQueueSize ?? 20;
    this.reducedMotion = options.reducedMotion ?? false;
    this.onAnimationComplete = options.onAnimationComplete;
    this.onStateChange = options.onStateChange;
  }

  public setLiveId(newLiveId: string): void {
    if (this.liveId === newLiveId) return;
    this.clearAll();
    this.liveId = newLiveId;
    this.notify();
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public ingestEvents(events: (GiftOverlayEvent | any)[]): number {
    if (this.isDisposed || !events || !Array.isArray(events)) return 0;
    let accepted = 0;
    for (const raw of events) {
      if (this.enqueueEvent(raw)) {
        accepted++;
      }
    }
    return accepted;
  }

  public enqueueEvent(raw: any): boolean {
    if (this.isDisposed) return false;
    if (!raw) return false;

    const eventId = raw.eventId || raw.id;
    const eventLiveId = raw.liveId;

    // Regra 1: Validação de identificador e liveId estrito
    if (!eventId || typeof eventId !== 'string') return false;
    if (!eventLiveId || eventLiveId !== this.liveId) {
      // Rejeita sumariamente eventos de outras transmissões (TC-04)
      return false;
    }

    // Regra 2: Deduplicação estrita (idempotência visual contra replays e duplicatas - TC-03 & TC-08)
    if (this.processedEventIds.has(eventId)) {
      return false;
    }

    // Validação mínima de dados do presente (TC-05)
    const giftName = raw.giftName || raw.name;
    const giftIcon = raw.giftIcon || raw.icon || '🎁';
    const amountCredits = Number(raw.amountCredits ?? raw.creditsCost ?? 0);
    if (!giftName || amountCredits <= 0) {
      return false;
    }

    const tier = resolveGiftTier(amountCredits, raw.tier);
    const quantity = Number(raw.quantity) > 0 ? Number(raw.quantity) : 1;

    const normalized: GiftOverlayEvent = {
      eventId,
      liveId: eventLiveId,
      senderId: raw.senderId,
      senderDisplayName: raw.senderDisplayName || raw.senderName || 'Apoiador VIP',
      senderName: raw.senderName || raw.senderDisplayName || 'Apoiador VIP',
      senderAvatar: raw.senderAvatar,
      giftId: raw.giftId || 'gift_default',
      giftName,
      giftIcon,
      quantity,
      amountCredits,
      tier,
      timestamp: raw.timestamp || Date.now(),
      isPrivate: !!raw.isPrivate,
    };

    this.processedEventIds.add(eventId);

    // Se há vagas ativas disponíveis, ativa imediatamente
    if (this.activeItems.length < this.maxConcurrent) {
      this.activateItem(normalized);
    } else {
      // Enfileira em FIFO com proteção contra overflow de memória
      if (this.pendingQueue.length >= this.maxQueueSize) {
        this.pendingQueue.shift();
      }
      this.pendingQueue.push(normalized);
      this.notify();
    }

    return true;
  }

  private activateItem(event: GiftOverlayEvent): void {
    const tier = event.tier || resolveGiftTier(event.amountCredits || 0);
    const durationMs = this.reducedMotion ? 2000 : TIER_DURATIONS_MS[tier];
    const senderDisplay = event.isPrivate
      ? 'Fã Secreto VIP'
      : (event.senderDisplayName || event.senderName || 'Apoiador VIP');

    const item: ActiveGiftAnimationItem = {
      id: event.eventId,
      event,
      tier,
      status: 'entering',
      senderDisplay,
      credits: event.amountCredits || 0,
      quantity: event.quantity || 1,
      durationMs,
      createdAt: Date.now(),
    };

    this.activeItems.push(item);
    this.notify();

    // 1. Transição de entrada para ativo
    const enterTimer = setTimeout(() => {
      if (this.isDisposed) return;
      const target = this.activeItems.find((i) => i.id === item.id);
      if (target && target.status === 'entering') {
        target.status = 'active';
        this.notify();
      }
    }, this.reducedMotion ? 50 : 250);

    // 2. Transição de saída (fade-out)
    const exitTimer = setTimeout(() => {
      if (this.isDisposed) return;
      const target = this.activeItems.find((i) => i.id === item.id);
      if (target) {
        target.status = 'exiting';
        this.notify();
      }
    }, Math.max(400, durationMs - 450));

    // 3. Remoção e promoção do próximo item da fila FIFO
    const removeTimer = setTimeout(() => {
      if (this.isDisposed) return;
      this.removeItem(item.id);
    }, durationMs);

    this.timers.set(`${item.id}_enter`, enterTimer);
    this.timers.set(`${item.id}_exit`, exitTimer);
    this.timers.set(`${item.id}_remove`, removeTimer);
  }

  public removeItem(itemId: string): void {
    this.clearTimersForItem(itemId);
    const index = this.activeItems.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      const removed = this.activeItems.splice(index, 1)[0];
      this.onAnimationComplete?.(removed.event.eventId);

      // Puxa o próximo da fila FIFO se houver vaga
      if (this.pendingQueue.length > 0 && this.activeItems.length < this.maxConcurrent) {
        const next = this.pendingQueue.shift()!;
        this.activateItem(next);
      }

      this.notify();
    }
  }

  private clearTimersForItem(itemId: string): void {
    const keys = [`${itemId}_enter`, `${itemId}_exit`, `${itemId}_remove`];
    for (const k of keys) {
      const t = this.timers.get(k);
      if (t) {
        clearTimeout(t as any);
        this.timers.delete(k);
      }
    }
  }

  public clearAll(): void {
    for (const t of this.timers.values()) {
      clearTimeout(t as any);
    }
    this.timers.clear();
    this.activeItems = [];
    this.pendingQueue = [];
    this.processedEventIds.clear();
  }

  public dispose(): void {
    this.isDisposed = true;
    this.clearAll();
  }

  public getActiveItems(): ActiveGiftAnimationItem[] {
    return [...this.activeItems];
  }

  public getPendingQueue(): GiftOverlayEvent[] {
    return [...this.pendingQueue];
  }

  public getProcessedCount(): number {
    return this.processedEventIds.size;
  }

  public hasProcessed(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  private notify(): void {
    this.onStateChange?.();
  }
}

export interface GiftAnimationOverlayProps {
  liveId: string;
  events?: (GiftOverlayEvent | any)[];
  maxConcurrent?: number;
  onAnimationComplete?: (eventId: string) => void;
  className?: string;
}

export const GiftAnimationOverlay: React.FC<GiftAnimationOverlayProps> = ({
  liveId,
  events = [],
  maxConcurrent = 3,
  onAnimationComplete,
  className = '',
}) => {
  const [, setTick] = useState(0);
  const managerRef = useRef<GiftOverlayQueueManager | null>(null);

  // Detecção de acessibilidade para redução de movimento
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // Inicialização e gerenciamento do ciclo de vida
  useEffect(() => {
    const manager = new GiftOverlayQueueManager({
      liveId,
      maxConcurrent,
      reducedMotion: prefersReducedMotion,
      onAnimationComplete,
      onStateChange: () => setTick((t) => t + 1),
    });
    managerRef.current = manager;

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [liveId, maxConcurrent, prefersReducedMotion, onAnimationComplete]);

  // Ingestão de novos eventos
  useEffect(() => {
    if (managerRef.current && events && events.length > 0) {
      managerRef.current.ingestEvents(events);
    }
  }, [events]);

  const activeItems = managerRef.current ? managerRef.current.getActiveItems() : [];

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Notificações visuais de presentes na live"
      aria-live="polite"
      className={`pointer-events-none select-none absolute inset-0 z-40 overflow-hidden flex flex-col items-center justify-start pt-16 sm:pt-20 px-3 sm:px-4 space-y-2.5 ${className}`}
    >
      {activeItems.map((item) => {
        const visual = TIER_VISUAL_STYLES[item.tier];
        const isEntering = item.status === 'entering';
        const isExiting = item.status === 'exiting';

        // Classes de animação com suporte a prefers-reduced-motion
        const motionClass = prefersReducedMotion
          ? isEntering
            ? 'opacity-0'
            : isExiting
            ? 'opacity-0 transition-opacity duration-200'
            : 'opacity-100 transition-opacity duration-200'
          : isEntering
          ? 'opacity-0 scale-75 -translate-y-4'
          : isExiting
          ? 'opacity-0 scale-90 -translate-y-6 transition-all duration-350 ease-in'
          : 'opacity-100 scale-100 translate-y-0 transition-all duration-300 ease-out';

        return (
          <div
            key={item.id}
            className={`pointer-events-none w-full max-w-sm sm:max-w-md ${motionClass}`}
          >
            <div
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 ${visual.borderStyle} ${visual.bgStyle} transition-all`}
              style={{
                boxShadow: `0 10px 25px -5px ${visual.highlightGlow}`,
              }}
            >
              {/* Shimmer Sweep para tiers Silver, Gold e Diamond */}
              {visual.hasShimmer && !prefersReducedMotion && (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"
                  aria-hidden="true"
                />
              )}

              {/* Partículas decorativas para tiers Gold e Diamond */}
              {visual.hasParticles && !prefersReducedMotion && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                  <div className="absolute top-1 left-8 animate-ping opacity-75">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </div>
                  <div className="absolute bottom-1 right-12 animate-pulse opacity-80">
                    <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
                  </div>
                  {item.tier === 'diamond' && (
                    <div className="absolute top-2 right-6 animate-bounce opacity-85">
                      <Gem className="w-3.5 h-3.5 text-fuchsia-300" />
                    </div>
                  )}
                </div>
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                {/* Ícone e Quantidade do Presente */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner ${
                      item.tier === 'diamond'
                        ? 'bg-fuchsia-950/80 border border-fuchsia-400/60'
                        : item.tier === 'gold'
                        ? 'bg-amber-950/80 border border-amber-400/60'
                        : item.tier === 'silver'
                        ? 'bg-slate-900/90 border border-cyan-400/40'
                        : 'bg-black/60 border border-white/10'
                    }`}
                  >
                    <span className={prefersReducedMotion ? '' : 'animate-bounce duration-1000'}>
                      {item.event.giftIcon}
                    </span>
                  </div>

                  {item.quantity > 1 && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[10px] shadow-md border border-white/40">
                      x{item.quantity}
                    </span>
                  )}
                </div>

                {/* Dados do Remetente e do Presente */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.tier === 'diamond' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-950/90 border border-fuchsia-500/50 text-fuchsia-300 text-[9px] font-black uppercase tracking-wider">
                        <Gem className="w-2.5 h-2.5" />
                        {visual.tierLabel}
                      </span>
                    ) : item.tier === 'gold' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                        <Crown className="w-2.5 h-2.5" />
                        {visual.tierLabel}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        {visual.tierLabel}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-black text-white truncate leading-snug">
                    <span className="text-white hover:underline">{item.senderDisplay}</span>
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                    enviou <strong className={visual.accentTextColor}>{item.event.giftName}</strong>
                  </p>
                </div>

                {/* Badge de Créditos / Valor */}
                <div className="shrink-0 flex flex-col items-end">
                  <div
                    className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-mono font-black tracking-tight flex items-center gap-1 ${visual.badgeStyle}`}
                  >
                    <span>{item.credits}</span>
                    <span className="text-[10px]">💎</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
