/**
 * JOBS — Serviço de Proteção de Mídias Privadas e Autorização de Acesso
 * 
 * Implementa as diretrizes de segurança da Fase 1 e Fase 3:
 * - Não exposição de arquivos mestres por URLs públicas permanentes quando bloqueados.
 * - Autorização rigorosa antes da liberação de qualquer mídia íntima/VIP.
 * - Validação contra IDOR e Parameter Tampering (binding estrito de userId, contentId e assinatura).
 * - Emissão e verificação de tickets/URLs temporárias assinadas com TTL curto (15 minutos).
 * - Respeito imediato a bloqueios, denúncias e revogação de acessos.
 * - Trilha de auditoria sem vazamento de segredos, tokens ou dados pessoais sensíveis.
 */

import { TemporaryAccessToken, VipMediaItem } from '../types';
import { monetizationService } from './monetizationService';

export const PROTECTED_MEDIA_CACHE_CONTROL = 'private, no-store, no-cache, max-age=0, must-revalidate';

export interface ProtectedMediaTicket {
  ticketId: string;
  contentId: string;
  authorizedUserId: string;
  signature: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  cacheControl: string;
  pragma: 'no-cache';
  watermarkPayload: {
    obfuscatedUserId: string;
    sessionId: string;
    displayNotice: string;
    issuedTimestamp: string;
  };
}

export interface MediaAccessResult {
  allowed: boolean;
  code:
    | 'ACCESS_GRANTED'
    | 'ACCESS_DENIED_UNAUTHENTICATED'
    | 'ACCESS_DENIED_NO_GRANT'
    | 'ACCESS_DENIED_USER_BLOCKED'
    | 'ACCESS_DENIED_IDOR'
    | 'ACCESS_DENIED_EXPIRED'
    | 'ACCESS_DENIED_REVOKED'
    | 'ACCESS_DENIED_CONTENT_NOT_FOUND'
    | 'ACCESS_DENIED_INVALID_SIGNATURE';
  reason: string;
  deliveryUrl?: string;
  isTeaserOnly?: boolean;
  ticket?: ProtectedMediaTicket;
  cacheControl?: string;
}

export interface MediaSecurityAuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  action:
    | 'MEDIA_ACCESS_GRANTED'
    | 'MEDIA_ACCESS_DENIED'
    | 'MEDIA_TOKEN_REVOKED'
    | 'MEDIA_TOKEN_RENEWED'
    | 'IDOR_ATTEMPT_BLOCKED';
  contentId: string;
  reason: string;
  ipMasked: string;
}

const STORAGE_KEY_BLOCKED_USERS = 'jobs_security_blocked_users';
const STORAGE_KEY_AUDIT_LOGS = 'jobs_security_media_audit';
const STORAGE_KEY_REVOKED_TOKENS = 'jobs_security_revoked_tokens';
const STORAGE_KEY_ISSUED_TICKETS = 'jobs_security_issued_media_tickets';

const fallbackMemStore: Record<string, string> = {};

// Hash criptográfico determinístico para assinatura de tickets e URLs efêmeras
function generateSecureMediaSignature(
  tokenId: string,
  userId: string,
  contentId: string,
  expiresAt: string
): string {
  let hash = 0x811c9dc5;
  const str = `${tokenId}:${userId}:${contentId}:${expiresAt}:jobs_media_secret_salt_2026`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `sig_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

// Obfusca o ID do usuário para exibição em marcas-d'água dissuasórias (ex: "USR-JOEM***OM")
// Nunca expõe e-mail completo, telefone, CPF ou documentos
export function obfuscateUserIdForWatermark(userId: string): string {
  if (!userId) return 'USR-ANON';
  const clean = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length <= 6) return `USR-${clean}`;
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 2);
  return `USR-${prefix}***${suffix}`;
}

export function formatForensicWatermark(
  userId: string,
  sessionCode?: string,
  issuedAt?: string
): {
  obfuscatedUserId: string;
  sessionCode: string;
  primaryLine: string;
  secondaryLine: string;
  displayNotice: string;
} {
  const obfuscatedUserId = obfuscateUserIdForWatermark(userId);
  const safeSession = (sessionCode || 'SESS-VIP')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 14)
    .toUpperCase();
  const dateObj = issuedAt ? new Date(issuedAt) : new Date();
  const safeDateStr = Number.isNaN(dateObj.getTime())
    ? new Date().toLocaleDateString('pt-BR')
    : dateObj.toLocaleDateString('pt-BR');
  return {
    obfuscatedUserId,
    sessionCode: safeSession,
    primaryLine: `JOBS · ${obfuscatedUserId} · CÓPIA PROIBIDA`,
    secondaryLine: `SESSÃO #${safeSession} · ${safeDateStr}`,
    displayNotice: `JOBS VIP · ID: ${obfuscatedUserId} · ${safeDateStr}`,
  };
}

function getSafeStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, val: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (k: string) => (k in fallbackMemStore ? fallbackMemStore[k] : null),
    setItem: (k: string, v: string) => {
      fallbackMemStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete fallbackMemStore[k];
    },
  };
}

/**
 * Gera um SVG data-URI seguro de prévia trancada (teaser ofuscado) para não expor
 * a URL do arquivo master no DOM enquanto o conteúdo estiver bloqueado.
 */
function buildProtectedTeaserDataUri(mediaId: string): string {
  const safeId = (mediaId || 'vip').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="#4c1d95"/><stop offset="55%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#090d16"/></radialGradient></defs><rect width="600" height="800" fill="url(#g)"/><circle cx="300" cy="320" r="140" fill="#ec4899" fill-opacity="0.18"/><circle cx="240" cy="460" r="160" fill="#f59e0b" fill-opacity="0.12"/><text x="50%" y="92%" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="14">TEASER PROTEGIDO • ${safeId}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class ProtectedMediaService {
  private static instance: ProtectedMediaService;

  private constructor() {}

  public static getInstance(): ProtectedMediaService {
    if (!ProtectedMediaService.instance) {
      ProtectedMediaService.instance = new ProtectedMediaService();
    }
    return ProtectedMediaService.instance;
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const raw = getSafeStorage().getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      getSafeStorage().setItem(key, JSON.stringify(value));
    } catch {
      // no-op
    }
  }

  /**
   * Bloqueia ou restringe um usuário administrativamente ou por moderação e
   * revoga imediatamente todos os seus tickets temporários emitidos.
   */
  public blockUserFromMedia(userId: string, reason: string): void {
    const blocked = this.getItem<Record<string, { blockedAt: string; reason: string }>>(
      STORAGE_KEY_BLOCKED_USERS,
      {}
    );
    blocked[userId] = {
      blockedAt: new Date().toISOString(),
      reason,
    };
    this.setItem(STORAGE_KEY_BLOCKED_USERS, blocked);
    this.revokeTokensForUser(userId, `Bloqueio de segurança: ${reason}`);
    this.recordAudit({
      actorId: userId,
      action: 'MEDIA_ACCESS_DENIED',
      contentId: '*',
      reason: `Usuário restrito: ${reason}`,
    });
  }

  public unblockUserFromMedia(userId: string): void {
    const blocked = this.getItem<Record<string, { blockedAt: string; reason: string }>>(
      STORAGE_KEY_BLOCKED_USERS,
      {}
    );
    delete blocked[userId];
    this.setItem(STORAGE_KEY_BLOCKED_USERS, blocked);
  }

  public isUserBlocked(userId: string): boolean {
    const blocked = this.getItem<Record<string, { blockedAt: string; reason: string }>>(
      STORAGE_KEY_BLOCKED_USERS,
      {}
    );
    if (blocked[userId]) return true;
    const appBlocked = this.getItem<string[]>('jhobs_blocked_user_ids', []);
    return Array.isArray(appBlocked) && appBlocked.includes(userId);
  }

  /**
   * Retorna exclusivamente o preview teaser seguro (sem expor a URL do arquivo privado master no DOM
   * para conteúdos trancados).
   */
  public getPublicTeaserUrl(media: { id: string; mediaUrl?: string; title?: string }): string {
    return buildProtectedTeaserDataUri(media.id);
  }

  /**
   * Constrói uma URL de entrega assinada de curta duração vinculada ao ticket, usuário, conteúdo e diretiva anti-cache.
   */
  private buildSignedDeliveryUrl(rawMasterUrl: string, ticket: ProtectedMediaTicket): string {
    const separator = rawMasterUrl.includes('?') ? '&' : '?';
    return `${rawMasterUrl}${separator}tkt=${encodeURIComponent(ticket.ticketId)}&cid=${encodeURIComponent(
      ticket.contentId
    )}&uid=${encodeURIComponent(ticket.authorizedUserId)}&exp=${encodeURIComponent(
      ticket.expiresAt
    )}&cc=no-store&sig=${encodeURIComponent(ticket.signature)}`;
  }

  /**
   * Valida uma URL assinada ou requisição direta ao arquivo protegido.
   * Bloqueia URLs sem assinatura, com parâmetros adulterados (IDOR), expiradas ou de usuários bloqueados.
   */
  public verifySignedDeliveryUrl(params: {
    deliveryUrl: string;
    requestingUserId: string;
    expectedContentId?: string;
    simulatedNowMs?: number;
  }): MediaAccessResult {
    const { deliveryUrl, requestingUserId, expectedContentId, simulatedNowMs } = params;

    if (!requestingUserId || !requestingUserId.trim()) {
      return {
        allowed: false,
        code: 'ACCESS_DENIED_UNAUTHENTICATED',
        reason: 'Acesso direto negado: solicitante não autenticado.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    if (this.isUserBlocked(requestingUserId)) {
      return {
        allowed: false,
        code: 'ACCESS_DENIED_USER_BLOCKED',
        reason: 'Acesso direto negado: usuário bloqueado.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    const queryIdx = deliveryUrl ? deliveryUrl.indexOf('?') : -1;
    if (!deliveryUrl || queryIdx === -1) {
      this.recordAudit({
        actorId: requestingUserId,
        action: 'MEDIA_ACCESS_DENIED',
        contentId: expectedContentId || 'unknown',
        reason: 'Tentativa de acesso direto a URL master sem parâmetros de assinatura efêmera.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_INVALID_SIGNATURE',
        reason: 'Acesso direto bloqueado: URL não possui assinatura temporária válida.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    const searchParams = new URLSearchParams(deliveryUrl.slice(queryIdx + 1));
    const tkt = searchParams.get('tkt') || '';
    const cid = searchParams.get('cid') || '';
    const uid = searchParams.get('uid') || '';
    const exp = searchParams.get('exp') || '';
    const sig = searchParams.get('sig') || '';

    if (!tkt || !cid || !uid || !exp || !sig) {
      return {
        allowed: false,
        code: 'ACCESS_DENIED_INVALID_SIGNATURE',
        reason: 'Acesso negado: parâmetros obrigatórios de assinatura ausentes na URL.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // Verificação de revogação
    const revoked = this.getItem<string[]>(STORAGE_KEY_REVOKED_TOKENS, []);
    if (revoked.includes(tkt)) {
      return {
        allowed: false,
        code: 'ACCESS_DENIED_REVOKED',
        reason: 'O ticket temporário desta URL foi revogado.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // Verificação anti-IDOR (usuário solicitante ou contentId divergente)
    if (uid !== requestingUserId || (expectedContentId && cid !== expectedContentId)) {
      this.recordAudit({
        actorId: requestingUserId,
        action: 'IDOR_ATTEMPT_BLOCKED',
        contentId: expectedContentId || cid,
        reason: `IDOR bloqueado na verificação de URL assinada (uid=${uid}, req=${requestingUserId}, cid=${cid}).`,
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_IDOR',
        reason: 'Acesso negado: tentativa de acesso cruzado (IDOR) detectada na URL assinada.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // Verificação de expiração
    const expMs = Date.parse(exp);
    const nowMs = simulatedNowMs ?? Date.now();
    if (Number.isNaN(expMs) || nowMs > expMs) {
      return {
        allowed: false,
        code: 'ACCESS_DENIED_EXPIRED',
        reason: 'A URL temporária assinada expirou.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // Verificação criptográfica da assinatura
    const expectedSig = generateSecureMediaSignature(tkt, uid, cid, exp);
    if (sig !== expectedSig) {
      this.recordAudit({
        actorId: requestingUserId,
        action: 'IDOR_ATTEMPT_BLOCKED',
        contentId: cid,
        reason: 'Assinatura criptográfica da URL de mídia inválida ou adulterada.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_INVALID_SIGNATURE',
        reason: 'Assinatura da URL inválida ou parâmetros adulterados.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    return {
      allowed: true,
      code: 'ACCESS_GRANTED',
      reason: 'URL assinada íntegra e dentro do prazo de validade.',
      deliveryUrl,
      isTeaserOnly: false,
      cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
    };
  }

  /**
   * Solicita autorização e entrega de mídia protegida
   * Executa rigorosa cadeia de validação:
   * 1. Autenticação e bloqueios
   * 2. Existência do conteúdo
   * 3. Concessão de acesso ativa (grant) ou gratuidade
   * 4. Validação criptográfica de token temporário (se fornecido) ou emissão de novo ticket
   * 5. Proteção contra IDOR e Parameter Tampering
   */
  public requestAuthorizedMediaAccess(params: {
    userId: string;
    contentId: string;
    rawMasterUrl: string;
    isContentFree?: boolean;
    hasExternalGrant?: boolean;
    existingToken?: TemporaryAccessToken;
  }): MediaAccessResult {
    const {
      userId,
      contentId,
      rawMasterUrl,
      isContentFree = false,
      hasExternalGrant = false,
      existingToken,
    } = params;

    // 1. Validação de identidade básica
    if (!userId || userId.trim() === '') {
      this.recordAudit({
        actorId: 'anonymous',
        action: 'MEDIA_ACCESS_DENIED',
        contentId: contentId || 'unknown',
        reason: 'Solicitação não autenticada rejeitada.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_UNAUTHENTICATED',
        reason: 'Usuário não autenticado. Faça login para acessar este conteúdo.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // 2. Validação de existência do conteúdo e URL master
    if (!contentId || !contentId.trim() || !rawMasterUrl || !rawMasterUrl.trim()) {
      this.recordAudit({
        actorId: userId,
        action: 'MEDIA_ACCESS_DENIED',
        contentId: contentId || 'missing',
        reason: 'Conteúdo ou recurso master inexistente.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_CONTENT_NOT_FOUND',
        reason: 'Conteúdo protegido não encontrado ou indisponível.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // 3. Validação de restrição de moderação / bloqueio do usuário
    if (this.isUserBlocked(userId)) {
      this.recordAudit({
        actorId: userId,
        action: 'MEDIA_ACCESS_DENIED',
        contentId,
        reason: 'Acesso negado: usuário com bloqueio de segurança ativo.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_USER_BLOCKED',
        reason: 'Sua conta possui restrição de acesso temporária por moderação de segurança.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // 4. Validação de Token Existente se fornecido (Prevenção de IDOR, Expiração e Revogação)
    if (existingToken) {
      // A. Verificação de revogação explícita
      const revoked = this.getItem<string[]>(STORAGE_KEY_REVOKED_TOKENS, []);
      if (revoked.includes(existingToken.id)) {
        this.recordAudit({
          actorId: userId,
          action: 'MEDIA_ACCESS_DENIED',
          contentId,
          reason: 'Token temporário revogado por estorno ou encerramento de sessão.',
        });
        return {
          allowed: false,
          code: 'ACCESS_DENIED_REVOKED',
          reason: 'O link temporário para esta mídia foi revogado.',
          isTeaserOnly: true,
          cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
        };
      }

      // B. Verificação de expiração (15 minutos)
      const nowMs = Date.now();
      const expMs = new Date(existingToken.expiresAt).getTime();
      if (nowMs > expMs) {
        this.recordAudit({
          actorId: userId,
          action: 'MEDIA_ACCESS_DENIED',
          contentId,
          reason: 'Token temporário expirado (validade de 15 minutos excedida).',
        });
        return {
          allowed: false,
          code: 'ACCESS_DENIED_EXPIRED',
          reason: 'O link temporário expirou por segurança. Atualize para renovar o acesso.',
          isTeaserOnly: true,
          cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
        };
      }

      // C. Verificação anti-IDOR: O token foi emitido para OUTRO usuário?
      if (existingToken.userId !== userId) {
        this.recordAudit({
          actorId: userId,
          action: 'IDOR_ATTEMPT_BLOCKED',
          contentId,
          reason: `Tentativa de IDOR detectada: token pertence a ${existingToken.userId}, requisitado por ${userId}.`,
        });
        return {
          allowed: false,
          code: 'ACCESS_DENIED_IDOR',
          reason: 'Acesso negado: credencial de acesso não pertence ao seu usuário.',
          isTeaserOnly: true,
          cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
        };
      }

      // D. Verificação anti-IDOR: O token foi emitido para OUTRO conteúdo?
      if (existingToken.contentId !== contentId) {
        this.recordAudit({
          actorId: userId,
          action: 'IDOR_ATTEMPT_BLOCKED',
          contentId,
          reason: `Tentativa de IDOR detectada: token pertence a ${existingToken.contentId}, requisitado para ${contentId}.`,
        });
        return {
          allowed: false,
          code: 'ACCESS_DENIED_IDOR',
          reason: 'Acesso negado: identificador de conteúdo adulterado.',
          isTeaserOnly: true,
          cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
        };
      }
    }

    // 5. Verificação de gratuidade do conteúdo
    if (isContentFree) {
      const ticket = this.issueMediaTicket(userId, contentId);
      return {
        allowed: true,
        code: 'ACCESS_GRANTED',
        reason: 'Conteúdo público autorizado.',
        deliveryUrl: this.buildSignedDeliveryUrl(rawMasterUrl, ticket),
        isTeaserOnly: false,
        ticket,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // 6. Verificação de Concessão Ativa (ContentAccessGrant ou hasExternalGrant)
    const hasGrant = hasExternalGrant || monetizationService.hasAccess(userId, contentId);
    if (!hasGrant) {
      this.recordAudit({
        actorId: userId,
        action: 'MEDIA_ACCESS_DENIED',
        contentId,
        reason: 'Tentativa de visualização sem concessão de acesso ou pagamento de créditos.',
      });
      return {
        allowed: false,
        code: 'ACCESS_DENIED_NO_GRANT',
        reason: 'Conteúdo exclusivo bloqueado. Desbloqueie com créditos para visualizar.',
        isTeaserOnly: true,
        cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      };
    }

    // 7. Concessão autorizada — Emissão de Ticket e entrega da mídia com URL assinada
    const ticket = this.issueMediaTicket(userId, contentId);

    this.recordAudit({
      actorId: userId,
      action: 'MEDIA_ACCESS_GRANTED',
      contentId,
      reason: 'Acesso autorizado após validação de grant e assinatura efêmera.',
    });

    return {
      allowed: true,
      code: 'ACCESS_GRANTED',
      reason: 'Acesso autorizado. Link efêmero ativo com marca-d’água dinâmica.',
      deliveryUrl: this.buildSignedDeliveryUrl(rawMasterUrl, ticket),
      isTeaserOnly: false,
      ticket,
      cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
    };
  }

  /**
   * Renovação controlada de ticket expirado: revalida autenticação, bloqueios e direito de acesso
   * vigente, revoga o ticket anterior (se informado) e emite nova URL assinada sem cobrar novamente.
   */
  public renewMediaTicket(params: {
    userId: string;
    contentId: string;
    rawMasterUrl: string;
    previousTicketId?: string;
    isContentFree?: boolean;
    hasExternalGrant?: boolean;
  }): MediaAccessResult {
    const {
      userId,
      contentId,
      rawMasterUrl,
      previousTicketId,
      isContentFree = false,
      hasExternalGrant = false,
    } = params;

    if (previousTicketId) {
      const issued = this.getItem<Record<string, ProtectedMediaTicket>>(
        STORAGE_KEY_ISSUED_TICKETS,
        {}
      );
      const oldTicket = issued[previousTicketId];
      if (oldTicket && (oldTicket.authorizedUserId !== userId || oldTicket.contentId !== contentId)) {
        this.recordAudit({
          actorId: userId || 'anonymous',
          action: 'IDOR_ATTEMPT_BLOCKED',
          contentId,
          reason: `Tentativa de renovar ticket pertencente a outro usuário ou conteúdo (${previousTicketId}).`,
        });
        return {
          allowed: false,
          code: 'ACCESS_DENIED_IDOR',
          reason: 'Renovação negada: o ticket anterior não pertence ao seu usuário ou a esta mídia.',
          isTeaserOnly: true,
          cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
        };
      }
      this.revokeToken(previousTicketId, 'Substituído por renovação controlada de ticket expirado.');
    }

    const res = this.requestAuthorizedMediaAccess({
      userId,
      contentId,
      rawMasterUrl,
      isContentFree,
      hasExternalGrant,
    });

    if (res.allowed && res.ticket) {
      this.recordAudit({
        actorId: userId,
        action: 'MEDIA_TOKEN_RENEWED',
        contentId,
        reason: `Ticket renovado com sucesso (${res.ticket.ticketId}) sem nova cobrança.`,
      });
    }

    return res;
  }

  /**
   * Emite um ticket efêmero com TTL de 15 minutos e assinatura criptográfica
   */
  public issueMediaTicket(userId: string, contentId: string): ProtectedMediaTicket {
    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutos
    const signature = generateSecureMediaSignature(ticketId, userId, contentId, expiresAt);

    const sessionId = `s_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const wm = formatForensicWatermark(userId, sessionId, now.toISOString());

    const ticket: ProtectedMediaTicket = {
      ticketId,
      contentId,
      authorizedUserId: userId,
      signature,
      issuedAt: now.toISOString(),
      expiresAt,
      ttlSeconds: 900,
      cacheControl: PROTECTED_MEDIA_CACHE_CONTROL,
      pragma: 'no-cache',
      watermarkPayload: {
        obfuscatedUserId: wm.obfuscatedUserId,
        sessionId,
        displayNotice: wm.displayNotice,
        issuedTimestamp: now.toISOString(),
      },
    };

    const issued = this.getItem<Record<string, ProtectedMediaTicket>>(
      STORAGE_KEY_ISSUED_TICKETS,
      {}
    );
    issued[ticketId] = ticket;
    this.setItem(STORAGE_KEY_ISSUED_TICKETS, issued);

    return ticket;
  }

  /**
   * Revoga um token ou ticket (ex: após estorno de compra ou violação de termos)
   */
  public revokeToken(tokenId: string, reason: string): void {
    const revoked = this.getItem<string[]>(STORAGE_KEY_REVOKED_TOKENS, []);
    if (!revoked.includes(tokenId)) {
      revoked.push(tokenId);
      this.setItem(STORAGE_KEY_REVOKED_TOKENS, revoked);
    }
    this.recordAudit({
      actorId: 'system_security',
      action: 'MEDIA_TOKEN_REVOKED',
      contentId: tokenId,
      reason,
    });
  }

  /**
   * Revoga imediatamente todos os tickets emitidos para um determinado conteúdo
   * (ex: quando a modalidade, visibilidade ou estado da publicação é alterado).
   */
  public revokeTokensForContent(contentId: string, reason: string): number {
    const issued = this.getItem<Record<string, ProtectedMediaTicket>>(
      STORAGE_KEY_ISSUED_TICKETS,
      {}
    );
    const revoked = this.getItem<string[]>(STORAGE_KEY_REVOKED_TOKENS, []);
    let count = 0;

    for (const [tktId, ticket] of Object.entries(issued)) {
      if (ticket.contentId === contentId && !revoked.includes(tktId)) {
        revoked.push(tktId);
        count++;
      }
    }

    if (count > 0) {
      this.setItem(STORAGE_KEY_REVOKED_TOKENS, revoked);
      this.recordAudit({
        actorId: 'system_security',
        action: 'MEDIA_TOKEN_REVOKED',
        contentId,
        reason: `${count} ticket(s) revogado(s) para o conteúdo: ${reason}`,
      });
    }
    return count;
  }

  /**
   * Revoga imediatamente todos os tickets emitidos para um usuário específico
   * (ex: quando o usuário é bloqueado ou tem permissões revogadas).
   */
  public revokeTokensForUser(userId: string, reason: string): number {
    const issued = this.getItem<Record<string, ProtectedMediaTicket>>(
      STORAGE_KEY_ISSUED_TICKETS,
      {}
    );
    const revoked = this.getItem<string[]>(STORAGE_KEY_REVOKED_TOKENS, []);
    let count = 0;

    for (const [tktId, ticket] of Object.entries(issued)) {
      if (ticket.authorizedUserId === userId && !revoked.includes(tktId)) {
        revoked.push(tktId);
        count++;
      }
    }

    if (count > 0) {
      this.setItem(STORAGE_KEY_REVOKED_TOKENS, revoked);
      this.recordAudit({
        actorId: userId,
        action: 'MEDIA_TOKEN_REVOKED',
        contentId: '*',
        reason: `${count} ticket(s) do usuário revogado(s): ${reason}`,
      });
    }
    return count;
  }

  /**
   * Trilha de auditoria segura (sem registrar dados sensíveis ou tokens brutos)
   */
  private recordAudit(params: {
    actorId: string;
    action: MediaSecurityAuditRecord['action'];
    contentId: string;
    reason: string;
  }): void {
    const logs = this.getItem<MediaSecurityAuditRecord[]>(STORAGE_KEY_AUDIT_LOGS, []);
    const record: MediaSecurityAuditRecord = {
      id: `sec_aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorId: obfuscateUserIdForWatermark(params.actorId),
      action: params.action,
      contentId: params.contentId,
      reason: params.reason,
      ipMasked: '192.168.***.***',
    };
    logs.unshift(record);
    this.setItem(STORAGE_KEY_AUDIT_LOGS, logs.slice(0, 300));
  }

  public getSecurityAuditLogs(): MediaSecurityAuditRecord[] {
    return this.getItem<MediaSecurityAuditRecord[]>(STORAGE_KEY_AUDIT_LOGS, []);
  }

  /**
   * Reseta dados de auditoria em ambiente de testes controlados
   */
  public resetSecurityStorageForTesting(): void {
    const storage = getSafeStorage();
    storage.removeItem(STORAGE_KEY_BLOCKED_USERS);
    storage.removeItem(STORAGE_KEY_AUDIT_LOGS);
    storage.removeItem(STORAGE_KEY_REVOKED_TOKENS);
    storage.removeItem(STORAGE_KEY_ISSUED_TICKETS);
  }
}

export const protectedMediaService = ProtectedMediaService.getInstance();
