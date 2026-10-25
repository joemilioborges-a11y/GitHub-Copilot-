/**
 * JOBS — FLOATING HEARTS OVERLAY (SALA DE TRANSMISSÃO)
 * 
 * Camada de corações flutuantes com animação de feedback visual em tempo real:
 * - Disparo imediato em toques locais e recebimento de curtidas de rede.
 * - Variações orgânicas de tamanho, cor, rotação, duração e posição horizontal.
 * - Deduplicação estrita por id/eventId (mitiga replays e duplicatas).
 * - Isolamento por transmissão (ignora eventos de liveId divergente).
 * - Limite máximo de concorrência com descarte FIFO para preservar performance de 60fps.
 * - Totalmente não-bloqueante: pointer-events-none e select-none.
 * - Acessibilidade: respeita preferências de redução de movimento (prefers-reduced-motion).
 * - Camada 100% de apresentação visual: zero chamadas financeiras ao ledgerService.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Heart } from 'lucide-react';

export interface FloatingHeartEvent {
  id: string;
  liveId: string;
  timestamp: number;
  leftPercent?: number; // 0..100% ou gerado aleatoriamente na lateral direita
  isLocal?: boolean;
}

export interface ActiveFloatingHeart {
  id: string;
  liveId: string;
  leftPercent: number;
  sizePx: number;
  rotationDeg: number;
  colorClass: string;
  durationMs: number;
  isLocal: boolean;
  createdAt: number;
}

const HEART_COLORS = [
  'text-rose-500 fill-rose-500',
  'text-pink-500 fill-pink-500',
  'text-red-500 fill-red-500',
  'text-rose-400 fill-rose-400',
  'text-amber-400 fill-amber-400',
  'text-fuchsia-500 fill-fuchsia-500',
];

export interface FloatingHeartsManagerOptions {
  liveId: string;
  maxConcurrent?: number;
  reducedMotion?: boolean;
  onStateChange?: () => void;
}

export class FloatingHeartsManager {
  private liveId: string;
  private maxConcurrent: number;
  private reducedMotion: boolean;
  private onStateChange?: () => void;

  private activeHearts: ActiveFloatingHeart[] = [];
  private processedIds: Set<string> = new Set();
  private timers: Map<string, NodeJS.Timeout | number> = new Map();
  private isDisposed: boolean = false;

  constructor(options: FloatingHeartsManagerOptions) {
    this.liveId = options.liveId;
    this.maxConcurrent = options.maxConcurrent ?? 20;
    this.reducedMotion = options.reducedMotion ?? false;
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

  public ingestLike(event: FloatingHeartEvent): boolean {
    if (this.isDisposed || !event) return false;

    // Regra 1: Validação de ID e liveId estrito
    if (!event.id || typeof event.id !== 'string') return false;
    if (!event.liveId || event.liveId !== this.liveId) {
      // Rejeita silenciosamente curtidas de outras salas
      return false;
    }

    // Regra 2: Deduplicação estrita (idempotência visual)
    if (this.processedIds.has(event.id)) {
      return false;
    }
    this.processedIds.add(event.id);

    // Se atingiu o limite de concorrência, descarta o coração mais antigo para poupar memória
    if (this.activeHearts.length >= this.maxConcurrent) {
      const oldest = this.activeHearts[0];
      this.removeHeart(oldest.id);
    }

    // Gera variações orgânicas de estética
    // Concentrado na lateral direita (onde fica o botão de like, ex: 75% a 92%) ou espalhado
    const defaultLeft = event.leftPercent !== undefined
      ? event.leftPercent
      : Math.floor(Math.random() * 20) + 75; // 75% a 95% da tela

    const size = Math.floor(Math.random() * 12) + 24; // 24px a 36px
    const rotation = Math.floor(Math.random() * 40) - 20; // -20deg a +20deg
    const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    const durationMs = this.reducedMotion ? 1200 : Math.floor(Math.random() * 600) + 1800; // 1800..2400ms

    const heart: ActiveFloatingHeart = {
      id: event.id,
      liveId: event.liveId,
      leftPercent: defaultLeft,
      sizePx: size,
      rotationDeg: rotation,
      colorClass: color,
      durationMs,
      isLocal: !!event.isLocal,
      createdAt: Date.now(),
    };

    this.activeHearts.push(heart);
    this.notify();

    // Timer de expiração e auto-remoção
    const timer = setTimeout(() => {
      if (this.isDisposed) return;
      this.removeHeart(heart.id);
    }, durationMs);

    this.timers.set(heart.id, timer);
    return true;
  }

  public removeHeart(id: string): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t as any);
      this.timers.delete(id);
    }

    const prevLen = this.activeHearts.length;
    this.activeHearts = this.activeHearts.filter((h) => h.id !== id);
    if (this.activeHearts.length !== prevLen) {
      this.notify();
    }
  }

  public clearAll(): void {
    for (const t of this.timers.values()) {
      clearTimeout(t as any);
    }
    this.timers.clear();
    this.activeHearts = [];
    this.processedIds.clear();
  }

  public dispose(): void {
    this.isDisposed = true;
    this.clearAll();
  }

  public getActiveHearts(): ActiveFloatingHeart[] {
    return [...this.activeHearts];
  }

  public hasProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }

  private notify(): void {
    this.onStateChange?.();
  }
}

export interface FloatingHeartsOverlayProps {
  liveId: string;
  incomingLikes?: FloatingHeartEvent[];
  maxConcurrent?: number;
  className?: string;
}

export const FloatingHeartsOverlay: React.FC<FloatingHeartsOverlayProps> = ({
  liveId,
  incomingLikes = [],
  maxConcurrent = 20,
  className = '',
}) => {
  const [, setTick] = useState(0);
  const managerRef = useRef<FloatingHeartsManager | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // Ciclo de vida do gerenciador
  useEffect(() => {
    const manager = new FloatingHeartsManager({
      liveId,
      maxConcurrent,
      reducedMotion: prefersReducedMotion,
      onStateChange: () => setTick((t) => t + 1),
    });
    managerRef.current = manager;

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, [liveId, maxConcurrent, prefersReducedMotion]);

  // Ingestão de novos eventos de curtidas recebidos
  useEffect(() => {
    if (managerRef.current && incomingLikes.length > 0) {
      for (const like of incomingLikes) {
        managerRef.current.ingestLike(like);
      }
    }
  }, [incomingLikes]);

  const hearts = managerRef.current ? managerRef.current.getActiveHearts() : [];

  if (hearts.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 z-30 overflow-hidden ${className}`}
    >
      {hearts.map((h) => {
        // Animação com suporte a prefers-reduced-motion
        const animStyle: React.CSSProperties = {
          left: `${h.leftPercent}%`,
          bottom: '5.5rem', // Acima dos botões inferiores
          transform: `translateX(-50%) rotate(${h.rotationDeg}deg)`,
          animationDuration: `${h.durationMs}ms`,
        };

        return (
          <div
            key={h.id}
            style={animStyle}
            className={`pointer-events-none absolute drop-shadow-md transition-opacity ${
              prefersReducedMotion
                ? 'animate-pulse opacity-90'
                : 'animate-float-up'
            } ${h.colorClass}`}
          >
            <Heart
              style={{ width: `${h.sizePx}px`, height: `${h.sizePx}px` }}
              className="stroke-white/40 drop-shadow-lg"
            />
          </div>
        );
      })}
    </div>
  );
};
