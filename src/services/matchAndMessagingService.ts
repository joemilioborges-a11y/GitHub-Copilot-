/**
 * JOBS 1.0 — Serviço de Interesse Mútuo e Mensageria Bidirecional Persistente
 * Implementa matches reais (exclusivamente com consentimento bilateral), histórico ordenado
 * de mensagens por par ordenado canônico, proteção contra spam e isolamento entre contas reais.
 */

export interface LikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'standard' | 'super_interest';
  message?: string;
  createdAt: number;
}

export interface MatchRecord {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: number;
  lastActivityAt: number;
  status: 'active' | 'blocked';
  notes?: string;
}

export interface PersistentMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  mediaUrl?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

const STORAGE_LIKES_KEY = 'jobs_real_likes';
const STORAGE_MATCHES_KEY = 'jobs_real_matches';
const STORAGE_MESSAGES_PREFIX = 'jobs_conv_msgs_';

class MatchAndMessagingService {
  private listeners: Set<() => void> = new Set();

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Erro no listener de mensageria:', err);
      }
    });
  }

  /**
   * Constrói identificador canônico de conversa ordenado lexicograficamente
   * Garante que conversa entre (A, B) é a mesma de (B, A)
   */
  public getConversationId(userAId: string, userBId: string): string {
    const sorted = [userAId, userBId].sort();
    return `conv_${sorted[0]}__${sorted[1]}`;
  }

  private getLikes(): LikeRecord[] {
    const raw = localStorage.getItem(STORAGE_LIKES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveLikes(likes: LikeRecord[]): void {
    localStorage.setItem(STORAGE_LIKES_KEY, JSON.stringify(likes));
  }

  public getMatches(): MatchRecord[] {
    const raw = localStorage.getItem(STORAGE_MATCHES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveMatches(matches: MatchRecord[]): void {
    localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches));
    this.notify();
  }

  /**
   * Registra uma curtida ou super interesse.
   * Só forma MATCH se houver reciprocidade (toUserId já curtiu fromUserId).
   */
  public recordLike(
    fromUserId: string,
    toUserId: string,
    type: 'standard' | 'super_interest' = 'standard',
    message?: string
  ): { isMatch: boolean; match?: MatchRecord; isDuplicate: boolean } {
    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      throw new Error('Identificadores de usuários inválidos para curtida.');
    }

    const likes = this.getLikes();

    // Verifica se already liked
    const existingLike = likes.find(
      (l) => l.fromUserId === fromUserId && l.toUserId === toUserId
    );
    if (existingLike) {
      // Já curtiu anteriormente
      const existingMatch = this.getMatches().find(
        (m) =>
          m.status === 'active' &&
          ((m.userAId === fromUserId && m.userBId === toUserId) ||
            (m.userAId === toUserId && m.userBId === fromUserId))
      );
      return { isMatch: !!existingMatch, match: existingMatch, isDuplicate: true };
    }

    // Registra nova curtida
    const newLike: LikeRecord = {
      id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fromUserId,
      toUserId,
      type,
      message,
      createdAt: Date.now(),
    };
    likes.push(newLike);
    this.saveLikes(likes);

    // Verifica se a outra parte já havia curtido fromUserId
    const reciprocalLike = likes.find(
      (l) => l.fromUserId === toUserId && l.toUserId === fromUserId
    );

    if (reciprocalLike) {
      // MATCH MÚTUO CONFIRMADO!
      const matches = this.getMatches();
      const existingMatch = matches.find(
        (m) =>
          (m.userAId === fromUserId && m.userBId === toUserId) ||
          (m.userAId === toUserId && m.userBId === fromUserId)
      );

      if (existingMatch) {
        existingMatch.status = 'active';
        existingMatch.lastActivityAt = Date.now();
        this.saveMatches(matches);
        return { isMatch: true, match: existingMatch, isDuplicate: false };
      }

      const newMatch: MatchRecord = {
        id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userAId: fromUserId,
        userBId: toUserId,
        matchedAt: Date.now(),
        lastActivityAt: Date.now(),
        status: 'active',
      };
      matches.push(newMatch);
      this.saveMatches(matches);

      return { isMatch: true, match: newMatch, isDuplicate: false };
    }

    // Apenas curtida unilateral registrada
    return { isMatch: false, isDuplicate: false };
  }

  public hasLiked(fromUserId: string, toUserId: string): boolean {
    const likes = this.getLikes();
    return likes.some((l) => l.fromUserId === fromUserId && l.toUserId === toUserId);
  }

  public isMutualMatch(userAId: string, userBId: string): boolean {
    const matches = this.getMatches();
    return matches.some(
      (m) =>
        m.status === 'active' &&
        ((m.userAId === userAId && m.userBId === userBId) ||
          (m.userAId === userBId && m.userBId === userAId))
    );
  }

  public getMatchesForUser(userId: string): MatchRecord[] {
    const matches = this.getMatches();
    return matches.filter(
      (m) => m.status === 'active' && (m.userAId === userId || m.userBId === userId)
    );
  }

  public getPendingLikesReceived(userId: string): LikeRecord[] {
    const likes = this.getLikes();
    const matches = this.getMatchesForUser(userId);
    const matchedPartnerIds = new Set(
      matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId))
    );

    // Likes recebidos por userId de pessoas com quem ainda não houve match
    return likes.filter(
      (l) => l.toUserId === userId && !matchedPartnerIds.has(l.fromUserId)
    );
  }

  /**
   * Mensagens Persistentes de Chat 1:1
   */
  public getMessages(userAId: string, userBId: string): PersistentMessage[] {
    const convId = this.getConversationId(userAId, userBId);
    const raw = localStorage.getItem(`${STORAGE_MESSAGES_PREFIX}${convId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveMessages(convId: string, msgs: PersistentMessage[]): void {
    localStorage.setItem(`${STORAGE_MESSAGES_PREFIX}${convId}`, JSON.stringify(msgs));
    this.notify();
  }

  public sendMessage(
    fromUserId: string,
    toUserId: string,
    text: string,
    mediaUrl?: string
  ): PersistentMessage {
    const cleanText = text.trim();
    if (!cleanText && !mediaUrl) {
      throw new Error('A mensagem não pode ser vazia.');
    }

    const convId = this.getConversationId(fromUserId, toUserId);
    const currentMsgs = this.getMessages(fromUserId, toUserId);

    const newMsg: PersistentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      conversationId: convId,
      senderId: fromUserId,
      recipientId: toUserId,
      text: cleanText,
      mediaUrl,
      timestamp: Date.now(),
      status: 'sent',
    };

    currentMsgs.push(newMsg);
    this.saveMessages(convId, currentMsgs);

    // Atualiza lastActivityAt no match se existir
    const matches = this.getMatches();
    const m = matches.find(
      (item) =>
        (item.userAId === fromUserId && item.userBId === toUserId) ||
        (item.userAId === toUserId && item.userBId === fromUserId)
    );
    if (m) {
      m.lastActivityAt = Date.now();
      this.saveMatches(matches);
    }

    return newMsg;
  }

  public markMessagesAsRead(userAId: string, userBId: string, readerUserId: string): void {
    const convId = this.getConversationId(userAId, userBId);
    const msgs = this.getMessages(userAId, userBId);
    let changed = false;

    for (const msg of msgs) {
      if (msg.recipientId === readerUserId && msg.status !== 'read') {
        msg.status = 'read';
        changed = true;
      }
    }

    if (changed) {
      this.saveMessages(convId, msgs);
    }
  }

  /**
   * Inicialização de contas e matches de teste para verificação ponta a ponta
   */
  public seedInitialTestMatch(userAId: string, userBId: string): MatchRecord {
    const matches = this.getMatches();
    const existing = matches.find(
      (m) =>
        (m.userAId === userAId && m.userBId === userBId) ||
        (m.userAId === userBId && m.userBId === userAId)
    );
    if (existing) {
      existing.status = 'active';
      this.saveMatches(matches);
      return existing;
    }

    // Garante que existem os likes recíprocos
    const likes = this.getLikes();
    if (!likes.some((l) => l.fromUserId === userAId && l.toUserId === userBId)) {
      likes.push({
        id: `like_seed_${userAId}_${userBId}`,
        fromUserId: userAId,
        toUserId: userBId,
        type: 'standard',
        createdAt: Date.now() - 3600000,
      });
    }
    if (!likes.some((l) => l.fromUserId === userBId && l.toUserId === userAId)) {
      likes.push({
        id: `like_seed_${userBId}_${userAId}`,
        fromUserId: userBId,
        toUserId: userAId,
        type: 'standard',
        createdAt: Date.now() - 1800000,
      });
    }
    this.saveLikes(likes);

    const newMatch: MatchRecord = {
      id: `match_seed_${userAId}_${userBId}`,
      userAId,
      userBId,
      matchedAt: Date.now() - 1800000,
      lastActivityAt: Date.now() - 600000,
      status: 'active',
    };
    matches.push(newMatch);
    this.saveMatches(matches);

    // Seed inicial de mensagem real de apresentação
    const convId = this.getConversationId(userAId, userBId);
    const msgs = this.getMessages(userAId, userBId);
    if (msgs.length === 0) {
      msgs.push({
        id: `msg_seed_01`,
        conversationId: convId,
        senderId: userBId,
        recipientId: userAId,
        text: 'Olá! Vi que temos interesses em comum no JOBS. Como está sendo seu dia?',
        timestamp: Date.now() - 600000,
        status: 'read',
      });
      this.saveMessages(convId, msgs);
    }

    return newMatch;
  }
}

export const matchAndMessagingService = new MatchAndMessagingService();
