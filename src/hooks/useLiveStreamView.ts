/**
 * JOBS — HOOK DE ESTADO DO LIVESTREAMVIEW E SALA DE TRANSMISSÃO
 * 
 * Gerencia a alternância entre a lista de transmissões ('list') e a Sala de Transmissão ('room'),
 * respeitando as convenções arquiteturais do JOBS:
 * - Ciclo de vida determinístico da sala com limpeza estrita de timers e assinaturas ao desmontar.
 * - Isolamento de eventos por transmissão (comentários, likes, presentes).
 * - Identificação explícita do Modo DEMO para transmissão de mídia e eventos em tempo real.
 * - Reutilização do fluxo existente de presentes no ledgerService (divisão 70/30, sem débitos diretos no cliente).
 * - Overlay responsivo, acessível e compatível com teclado.
 */

import { useSyncExternalStore, useRef, useEffect, useCallback } from 'react';
import {
  liveStreamService,
  LiveSessionModel,
  LiveChatMessageItem,
  VirtualGiftItem,
} from '../services/liveStreamService';
import { liveService } from '../services/liveService';

export type LiveStreamViewMode = 'list' | 'room';

export type LiveConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'demo'
  | 'unavailable'
  | 'error';

export interface OverlayLikeEvent {
  id: string;
  liveId: string;
  timestamp: number;
  leftPercent: number;
}

export interface OverlayGiftEvent {
  id: string;
  liveId: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  creditsCost: number;
  senderName: string;
  timestamp: number;
}

export interface UseLiveStreamViewOptions {
  initialLiveId?: string | null;
  initialViewMode?: LiveStreamViewMode;
  userCredits?: number;
  currentUserId?: string;
  currentUserName?: string;
  blockedUserIds?: string[];
  onCreditsUpdated?: (newBalance: number) => void;
  onSendLiveTip?: (stream: LiveSessionModel, amountCredits: number) => void;
}

export interface LiveStreamViewState {
  viewMode: LiveStreamViewMode;
  selectedLiveId: string | null;
  isRoomOpen: boolean;
  currentSession: LiveSessionModel | null;
  sessions: LiveSessionModel[];
  comments: LiveChatMessageItem[];
  recentComments: LiveChatMessageItem[];
  likesCount: number;
  recentLikes: OverlayLikeEvent[];
  giftEvents: OverlayGiftEvent[];
  connectionStatus: LiveConnectionStatus;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  audienceCount: number | null;
  isAudienceReliable: boolean;
}

export interface UseLiveStreamViewReturn extends LiveStreamViewState {
  openLive: (liveId: string) => Promise<boolean>;
  backToList: () => void;
  sendComment: (text: string) => Promise<boolean>;
  sendLike: () => void;
  sendGift: (
    gift: VirtualGiftItem,
    targetBattleCreatorId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  refreshLives: () => void;
  clearError: () => void;
  retryConnection: () => void;
}

const MAX_RECENT_COMMENTS = 12;
const MAX_RECENT_LIKES = 15;
const MAX_RECENT_GIFTS = 5;
const LIKE_ANIMATION_TTL_MS = 2200;
const GIFT_ANIMATION_TTL_MS = 4000;

/**
 * Gerenciador de estado headless compatível com testes automatizados e useSyncExternalStore
 */
export class LiveStreamViewStateManager {
  private options: UseLiveStreamViewOptions;
  private listeners: Set<() => void> = new Set();
  private timers: Set<NodeJS.Timeout | number> = new Set();
  private unsubscribeLiveService?: () => void;
  private lastLikeTimestamp: number = 0;
  private isDisposed: boolean = false;

  private state: LiveStreamViewState;

  constructor(options: UseLiveStreamViewOptions = {}) {
    this.options = { ...options };

    const initialId = options.initialLiveId || null;
    const initialMode = options.initialViewMode || 'list';
    const initialSession = initialId ? liveStreamService.getSessionById(initialId) : null;
    const initialSessions = liveStreamService.getLiveSessions();

    this.state = {
      viewMode: initialMode,
      selectedLiveId: initialId,
      isRoomOpen: initialMode === 'room' && !!initialId && !!initialSession,
      currentSession: initialSession,
      sessions: initialSessions,
      comments: initialSession ? [...initialSession.chatMessages] : [],
      recentComments: initialSession ? initialSession.chatMessages.slice(-MAX_RECENT_COMMENTS) : [],
      likesCount: initialId ? liveStreamService.getSessionLikes(initialId) : 0,
      recentLikes: [],
      giftEvents: [],
      connectionStatus: initialId && initialMode === 'room' ? 'demo' : 'disconnected',
      isLoading: false,
      error: null,
      isDemoMode: true,
      audienceCount: initialSession?.viewerCount ?? null,
      isAudienceReliable: false,
    };

    // Assina atualizações de sessões do liveService
    this.initLiveServiceSubscription();
  }

  public updateOptions(newOptions: Partial<UseLiveStreamViewOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  private initLiveServiceSubscription(): void {
    this.unsubscribeLiveService = liveService.subscribe((updated) => {
      if (this.isDisposed) return;
      this.setState({ sessions: updated });
      if (this.state.selectedLiveId) {
        const found = updated.find((s) => s.id === this.state.selectedLiveId);
        if (found) {
          this.setState({
            currentSession: found,
            audienceCount: found.viewerCount,
          });
        }
      }
    });
  }

  public getSnapshot = (): LiveStreamViewState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    if (this.isDisposed) return;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // no-op
      }
    }
  }

  private setState(partial: Partial<LiveStreamViewState>): void {
    if (this.isDisposed) return;
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private clearAllTimers(): void {
    for (const t of this.timers) {
      clearTimeout(t as any);
    }
    this.timers.clear();
  }

  // =========================================================================
  // AÇÕES DO HOOK
  // =========================================================================

  public openLive = async (liveId: string): Promise<boolean> => {
    if (!liveId || typeof liveId !== 'string') {
      this.setState({
        error: 'Identificador de transmissão inválido.',
        connectionStatus: 'error',
      });
      return false;
    }

    this.setState({
      isLoading: true,
      error: null,
      connectionStatus: 'connecting',
    });

    try {
      const session = liveStreamService.getSessionById(liveId);
      if (!session) {
        throw new Error('Live indisponível ou não encontrada no sistema.');
      }

      // Bloqueio de usuário
      const blocked = this.options.blockedUserIds || [];
      if (blocked.includes(session.hostCreatorId)) {
        throw new Error('Acesso não permitido: este criador está na sua lista de bloqueios.');
      }

      const sessionLikes = liveStreamService.getSessionLikes(session.id);
      const sessionComments = [...session.chatMessages];

      this.clearAllTimers();

      this.setState({
        viewMode: 'room',
        selectedLiveId: session.id,
        isRoomOpen: true,
        currentSession: session,
        comments: sessionComments,
        recentComments: sessionComments.slice(-MAX_RECENT_COMMENTS),
        likesCount: sessionLikes,
        recentLikes: [],
        giftEvents: [],
        // Modo DEMO simulado explicitamente declarado conforme seção 2.1
        connectionStatus: 'demo',
        isLoading: false,
        audienceCount: session.viewerCount,
        isAudienceReliable: false,
      });

      return true;
    } catch (err: any) {
      this.setState({
        isLoading: false,
        error: err?.message || 'Erro ao carregar transmissão.',
        connectionStatus: 'error',
      });
      return false;
    }
  };

  public backToList = (): void => {
    this.clearAllTimers();
    this.setState({
      viewMode: 'list',
      selectedLiveId: null,
      isRoomOpen: false,
      currentSession: null,
      comments: [],
      recentComments: [],
      likesCount: 0,
      recentLikes: [],
      giftEvents: [],
      connectionStatus: 'disconnected',
      error: null,
      audienceCount: null,
    });
    this.refreshLives();
  };

  public sendComment = async (text: string): Promise<boolean> => {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      this.setState({ error: 'O comentário não pode estar vazio.' });
      return false;
    }

    if (trimmed.length > 280) {
      this.setState({ error: 'O comentário excede o limite máximo de 280 caracteres.' });
      return false;
    }

    if (!this.state.selectedLiveId || !this.state.currentSession) {
      this.setState({ error: 'Nenhuma sala de transmissão ativa no momento.' });
      return false;
    }

    const currentLiveId = this.state.selectedLiveId;
    const userId = this.options.currentUserId || 'current_user';
    const userName = this.options.currentUserName || 'Você';

    try {
      const newMsg: LiveChatMessageItem = {
        id: `msg_${currentLiveId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        liveStreamId: currentLiveId,
        senderId: userId,
        senderName: userName,
        text: trimmed,
        timestamp: 'Agora',
      };

      // Persiste no serviço de sessão
      const updated = liveStreamService.addChatMessage(currentLiveId, newMsg);
      const nextComments = updated ? [...updated.chatMessages] : [...this.state.comments, newMsg];

      this.setState({
        comments: nextComments,
        recentComments: nextComments.slice(-MAX_RECENT_COMMENTS),
        error: null,
      });

      return true;
    } catch (err: any) {
      this.setState({ error: err?.message || 'Falha ao registrar comentário.' });
      return false;
    }
  };

  public sendLike = (): void => {
    if (!this.state.selectedLiveId || this.state.viewMode !== 'room') return;

    const now = Date.now();
    // Rate limit suave para mitigar spam de rede sem travar UI
    if (now - this.lastLikeTimestamp < 80) return;
    this.lastLikeTimestamp = now;

    const liveId = this.state.selectedLiveId;
    const newTotal = liveStreamService.incrementSessionLikes(liveId, 1);

    const likeEvt: OverlayLikeEvent = {
      id: `like_${now}_${Math.random().toString(36).substring(2, 6)}`,
      liveId,
      timestamp: now,
      leftPercent: Math.round(Math.random() * 70 + 15),
    };

    const nextRecent = [...this.state.recentLikes, likeEvt].slice(-MAX_RECENT_LIKES);
    this.setState({
      likesCount: newTotal,
      recentLikes: nextRecent,
    });

    const timer = setTimeout(() => {
      if (this.isDisposed) return;
      this.timers.delete(timer);
      this.setState({
        recentLikes: this.state.recentLikes.filter((item) => item.id !== likeEvt.id),
      });
    }, LIKE_ANIMATION_TTL_MS);

    this.timers.add(timer);
  };

  public sendGift = async (
    gift: VirtualGiftItem,
    targetBattleCreatorId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!this.state.selectedLiveId || !this.state.currentSession) {
      return { success: false, error: 'Nenhuma transmissão selecionada.' };
    }

    const currentLiveId = this.state.selectedLiveId;
    const userCredits = this.options.userCredits ?? 0;

    if (userCredits < gift.creditsCost) {
      const msg = `Saldo insuficiente (${userCredits} créditos disponíveis, necessário ${gift.creditsCost}).`;
      this.setState({ error: msg });
      return { success: false, error: msg };
    }

    try {
      const session = this.state.currentSession;
      const idempKey = `idemp_gift_${currentLiveId}_${gift.id}_${Date.now()}`;
      const targetCreator =
        session.format === 'battle' && targetBattleCreatorId
          ? targetBattleCreatorId
          : session.hostCreatorId;

      const userId = this.options.currentUserId || 'current_user';
      const userName = this.options.currentUserName || 'Você';

      // Reutiliza fluxo oficial do ledgerService (partilha 70/30 e idempotência)
      const res = await liveStreamService.sendVirtualGift({
        sessionId: currentLiveId,
        giftId: gift.id,
        userId,
        userName,
        targetCreatorId: targetCreator,
        idempotencyKey: idempKey,
        targetBattleCreatorId,
      });

      const nextComments = [...res.session.chatMessages];

      // Dispara callbacks de saldo
      if (this.options.onCreditsUpdated) {
        this.options.onCreditsUpdated(res.newCreditsBalance);
      }
      if (this.options.onSendLiveTip) {
        this.options.onSendLiveTip(res.session, gift.creditsCost);
      }

      const giftEvt: OverlayGiftEvent = {
        id: `gift_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        liveId: currentLiveId,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        creditsCost: gift.creditsCost,
        senderName: userName,
        timestamp: Date.now(),
      };

      const nextGifts = [...this.state.giftEvents, giftEvt].slice(-MAX_RECENT_GIFTS);

      this.setState({
        currentSession: res.session,
        comments: nextComments,
        recentComments: nextComments.slice(-MAX_RECENT_COMMENTS),
        giftEvents: nextGifts,
        error: null,
      });

      const timer = setTimeout(() => {
        if (this.isDisposed) return;
        this.timers.delete(timer);
        this.setState({
          giftEvents: this.state.giftEvents.filter((item) => item.id !== giftEvt.id),
        });
      }, GIFT_ANIMATION_TTL_MS);

      this.timers.add(timer);

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Falha ao processar presente virtual.';
      this.setState({ error: msg });
      return { success: false, error: msg };
    }
  };

  public refreshLives = (): void => {
    try {
      const list = liveStreamService.getLiveSessions();
      this.setState({ sessions: list });
      if (this.state.selectedLiveId) {
        const found = list.find((s) => s.id === this.state.selectedLiveId);
        if (found) {
          this.setState({
            currentSession: found,
            comments: [...found.chatMessages],
            recentComments: found.chatMessages.slice(-MAX_RECENT_COMMENTS),
            likesCount: liveStreamService.getSessionLikes(this.state.selectedLiveId),
            audienceCount: found.viewerCount,
          });
        }
      }
    } catch (err: any) {
      this.setState({ error: err?.message || 'Falha ao recarregar transmissões.' });
    }
  };

  public clearError = (): void => {
    this.setState({ error: null });
  };

  public retryConnection = (): void => {
    if (this.state.selectedLiveId) {
      this.openLive(this.state.selectedLiveId);
    } else {
      this.refreshLives();
    }
  };

  public dispose(): void {
    this.isDisposed = true;
    this.clearAllTimers();
    if (this.unsubscribeLiveService) {
      this.unsubscribeLiveService();
      this.unsubscribeLiveService = undefined;
    }
    this.listeners.clear();
  }
}

/**
 * Hook de React para conectar componentes à máquina de estado da LiveStreamView
 */
export function useLiveStreamView(
  options: UseLiveStreamViewOptions = {}
): UseLiveStreamViewReturn {
  const managerRef = useRef<LiveStreamViewStateManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new LiveStreamViewStateManager(options);
  }

  // Atualiza opções mutáveis sem recriar instância
  useEffect(() => {
    managerRef.current?.updateOptions(options);
  }, [
    options.userCredits,
    options.blockedUserIds,
    options.onCreditsUpdated,
    options.onSendLiveTip,
    options.currentUserId,
    options.currentUserName,
  ]);

  // Limpeza segura na desmontagem do componente
  useEffect(() => {
    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, []);

  const state = useSyncExternalStore(
    managerRef.current.subscribe,
    managerRef.current.getSnapshot,
    managerRef.current.getSnapshot
  );

  const openLive = useCallback(
    (liveId: string) => managerRef.current!.openLive(liveId),
    []
  );
  const backToList = useCallback(
    () => managerRef.current!.backToList(),
    []
  );
  const sendComment = useCallback(
    (text: string) => managerRef.current!.sendComment(text),
    []
  );
  const sendLike = useCallback(
    () => managerRef.current!.sendLike(),
    []
  );
  const sendGift = useCallback(
    (gift: VirtualGiftItem, target?: string) => managerRef.current!.sendGift(gift, target),
    []
  );
  const refreshLives = useCallback(
    () => managerRef.current!.refreshLives(),
    []
  );
  const clearError = useCallback(
    () => managerRef.current!.clearError(),
    []
  );
  const retryConnection = useCallback(
    () => managerRef.current!.retryConnection(),
    []
  );

  return {
    ...state,
    openLive,
    backToList,
    sendComment,
    sendLike,
    sendGift,
    refreshLives,
    clearError,
    retryConnection,
  };
}
