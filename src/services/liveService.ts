/**
 * JOBS 1.0 — SERVIÇO DE LIVES (FACHADA E CAMADA DE INTEGRAÇÃO DO LIVECENTER)
 * 
 * Reutiliza e integra-se diretamente ao liveStreamService existente.
 * Fornece:
 * - Consulta e filtragem reativa de sessões ativas, recomendadas e seguidas.
 * - Gerenciamento de assinaturas com pub/sub desacoplado e cancelamento de inscrição (memory-safe).
 * - Fonte de relacionamentos de criadores seguidos integrada ao armazenamento do usuário.
 * - Identificação explícita de fonte DEMO / simulada sem chamadas a carteira ou streaming real.
 */

import {
  liveStreamService,
  LiveSessionModel,
  LiveFormat,
  LiveSessionStatus,
  VirtualGiftItem,
  LiveChatMessageItem,
  OFFICIAL_VIRTUAL_GIFTS,
} from './liveStreamService';

export type {
  LiveSessionModel,
  LiveFormat,
  LiveSessionStatus,
  VirtualGiftItem,
  LiveChatMessageItem,
};
export { OFFICIAL_VIRTUAL_GIFTS };

const STORAGE_KEY_FOLLOWING = 'jobs_following_creators';
const STORAGE_KEY_CONNECTIONS = 'jobs_user_connections';

export type LiveCenterTab = 'ao_vivo' | 'seguindo' | 'recomendadas' | 'buscar';

export interface DataSourceMeta {
  isSimulated: boolean;
  dataSourceLabel: string;
  disclaimer: string;
}

type SessionsListener = (sessions: LiveSessionModel[]) => void;

class LiveService {
  private listeners: Set<SessionsListener> = new Set();
  private storageListenerBound: boolean = false;

  constructor() {
    this.initStorageListener();
  }

  private initStorageListener(): void {
    if (typeof window === 'undefined' || this.storageListenerBound) return;
    this.storageListenerBound = true;
    window.addEventListener('storage', (e) => {
      if (e.key === 'jhobs_live_sessions_v1') {
        this.notifyListeners();
      }
    });
  }

  /**
   * Obtém todas as sessões cadastradas
   */
  public getLiveSessions(): LiveSessionModel[] {
    return liveStreamService.getLiveSessions();
  }

  /**
   * Obtém uma sessão específica por ID
   */
  public getSessionById(sessionId: string): LiveSessionModel | null {
    return liveStreamService.getSessionById(sessionId);
  }

  /**
   * 1. Aba 'Ao vivo': lista de sessões com status ativo
   */
  public getActiveSessions(): LiveSessionModel[] {
    const list = this.getLiveSessions();
    return list.filter((s) => s.status === 'active');
  }

  /**
   * Lista IDs de criadores que o usuário segue
   */
  public getFollowingCreatorIds(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FOLLOWING);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Conexões mútuas do usuário como fonte secundária
      const connRaw = localStorage.getItem(STORAGE_KEY_CONNECTIONS);
      if (connRaw) {
        const parsedConn = JSON.parse(connRaw);
        if (Array.isArray(parsedConn) && parsedConn.length > 0) {
          const ids = parsedConn.map((p: any) => p.id || p.creatorId).filter(Boolean);
          if (ids.length > 0) return ids;
        }
      }
    } catch {
      // Fallback
    }

    // Default inicial de demonstração (criadores conhecidos do mock)
    return ['valentina', 'isabella'];
  }

  /**
   * Alterna estado de seguir/deixar de seguir criador
   */
  public toggleFollowCreator(creatorId: string): boolean {
    const current = new Set(this.getFollowingCreatorIds());
    let isNowFollowing = false;
    if (current.has(creatorId)) {
      current.delete(creatorId);
      isNowFollowing = false;
    } else {
      current.add(creatorId);
      isNowFollowing = true;
    }
    try {
      localStorage.setItem(STORAGE_KEY_FOLLOWING, JSON.stringify(Array.from(current)));
    } catch {
      // no-op
    }
    this.notifyListeners();
    return isNowFollowing;
  }

  public isFollowingCreator(creatorId: string): boolean {
    return this.getFollowingCreatorIds().includes(creatorId);
  }

  /**
   * 2. Aba 'Seguindo': sessões de criadores que o usuário segue
   */
  public getFollowingSessions(customFollowingIds?: string[]): {
    sessions: LiveSessionModel[];
    isDemoFallback: boolean;
  } {
    const all = this.getActiveSessions();
    const followingIds = customFollowingIds && customFollowingIds.length > 0
      ? customFollowingIds
      : this.getFollowingCreatorIds();

    const matches = all.filter((s) => followingIds.includes(s.hostCreatorId));

    if (matches.length > 0) {
      return { sessions: matches, isDemoFallback: false };
    }

    // Se o usuário não segue ninguém com live ativa, retorna seleção de demonstração identificada
    return {
      sessions: all.slice(0, 2),
      isDemoFallback: true,
    };
  }

  /**
   * 3. Aba 'Recomendadas': curadoria baseada em categorias e interesses
   */
  public getRecommendedSessions(): LiveSessionModel[] {
    const all = this.getActiveSessions();
    // Prioriza formatos de maior engajamento (batalhas, desafios, palcos interativos)
    return [...all].sort((a, b) => {
      const priorityA = a.format === 'battle' ? 3 : a.format === 'challenge' ? 2 : 1;
      const priorityB = b.format === 'battle' ? 3 : b.format === 'challenge' ? 2 : 1;
      if (priorityB !== priorityA) return priorityB - priorityA;
      return (b.viewerCount || 0) - (a.viewerCount || 0);
    });
  }

  /**
   * 4. Aba 'Buscar': filtro instantâneo por título, criador e categoria
   */
  public searchSessions(query: string): LiveSessionModel[] {
    const q = (query || '').trim().toLowerCase();
    const all = this.getActiveSessions();
    if (!q) return all;

    return all.filter((s) => {
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchCreator = s.hostCreatorName.toLowerCase().includes(q);
      const matchCategory = s.category.toLowerCase().includes(q);
      const matchTags = Array.isArray(s.tags) && s.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchCreator || matchCategory || matchTags;
    });
  }

  /**
   * Assinatura reativa (pub/sub) com cancelamento seguro no desmontar
   */
  public subscribe(listener: SessionsListener): () => void {
    this.listeners.add(listener);
    // Notifica imediatamente com dados atuais
    try {
      listener(this.getLiveSessions());
    } catch {
      // Ignora erro inicial do listener
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyListeners(): void {
    const sessions = this.getLiveSessions();
    for (const listener of this.listeners) {
      try {
        listener(sessions);
      } catch {
        // Protege contra erros de listeners individuais
      }
    }
  }

  /**
   * Metadados de proveniência de dados (Segurança e isolamento DEMO)
   */
  public getDataSourceMeta(): DataSourceMeta {
    return {
      isSimulated: true,
      dataSourceLabel: 'MODO DEMONSTRAÇÃO',
      disclaimer: 'Os espectadores e transmissões são simulados para fins de demonstração da interface. Não há cobrança nem streaming WebRTC real na central de descoberta.',
    };
  }
}

export const liveService = new LiveService();
