/**
 * JOBS — SERVIÇO DE LOG DE ATIVIDADES DO ADMINISTRADOR (ADMIN AUDIT SERVICE)
 * 
 * Arquitetura e Garantias:
 * - Trilha de auditoria persistente, verificável, rastreável e resistente a adulterações.
 * - Hash Chain SHA-256 (FIPS 180-4) com serialização canônica determinística.
 * - Encadeamento estrito via previousEventHash a partir do bloco Gênesis.
 * - Enfileiramento sequencial assíncrono para garantir ordenação estrita sem bifurcações.
 * - Registro granular de sucessos, falhas e tentativas negadas (ACCESS_DENIED).
 * - Sem vazamento de dados sensíveis, senhas, chaves privadas ou tokens.
 * - Limitação técnica documentada: Em ambiente client-side sem WORM/HSM remoto, a garantia é
 *   de "Integridade Verificável e Resistência a Adulterações", permitindo comprovar se qualquer
 *   registro foi alterado, inserido ou removido.
 */

import { sha256, canonicalJsonStringify, GENESIS_PREVIOUS_HASH } from '../utils/cryptoAudit';

export type AdminActionType =
  | 'BALANCE_ADJUSTMENT'
  | 'CONFIG_CHANGE'
  | 'SETTING_UPDATE'
  | 'POLICY_UPDATE'
  | 'SANDBOX_TOGGLE'
  | 'TEST_MODE_TOGGLE'
  | 'PAYOUT_APPROVE'
  | 'PAYOUT_RELEASE'
  | 'PAYOUT_CANCEL'
  | 'REFUND_EXECUTE'
  | 'PERMISSIONS_CHANGE'
  | 'USER_ROLE_CHANGE'
  | 'USER_SUSPEND'
  | 'LEDGER_OPERATION'
  | 'ACCESS_DENIED'
  | 'FINANCIAL_FAILURE'
  | 'AUDIT_VERIFY'
  | 'PURCHASE_APPROVE'
  | 'PURCHASE_DECLINE'
  | 'PACKAGE_UPDATE'
  | 'CONTENT_MODERATE';

export type AdminActionResult = 'success' | 'failure' | 'denied';

export type AdminTargetType =
  | 'wallet'
  | 'credit_package'
  | 'package'
  | 'remuneration_policy'
  | 'payout_record'
  | 'payout'
  | 'ledger_entry'
  | 'ledger'
  | 'admin_user'
  | 'user'
  | 'content'
  | 'purchase'
  | 'setting'
  | 'system_mode'
  | 'admin_panel'
  | 'environment'
  | 'system';

export type AdminRole = 'master' | 'admin' | 'finance' | 'moderator' | 'security' | 'auditor' | 'system';

export interface AdminActivityEvent {
  eventId: string;
  timestamp: string; // ISO 8601 UTC
  actorId: string;
  actorRole: AdminRole;
  action: AdminActionType;
  targetType: AdminTargetType;
  targetId: string;
  result: AdminActionResult;
  reason: string;
  correlationId: string;
  environment: 'production' | 'staging' | 'sandbox';
  beforeHash?: string;
  afterHash?: string;
  previousEventHash: string;
  eventHash: string;
  schemaVersion: '1.0.0';
  metadata?: Record<string, unknown>;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalEvents: number;
  verifiedCount: number;
  brokenEventId?: string;
  errorReason?: string;
  errors: string[];
  tamperedIndex: number | null;
  lastVerifiedTimestamp: string;
  genesisHash: string;
  headHash: string;
}

export interface AdminAuditQueryFilter {
  search?: string;
  actorId?: string;
  action?: AdminActionType | 'all';
  result?: AdminActionResult | 'all';
  environment?: 'production' | 'staging' | 'sandbox' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditQueryResult {
  events: AdminActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  integrity: ChainVerificationResult;
}

const STORAGE_KEY_ADMIN_AUDIT_LOGS = 'jobs_admin_activity_audit_chain_v1';
const STORAGE_KEY_AUDIT_CHECKPOINT = 'jobs_admin_audit_head_checkpoint_v1';

// Armazenamento isomórfico resiliente
function getSafeStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && (globalThis as any).localStorage) {
    try {
      const storage = (globalThis as any).localStorage;
      const testKey = '__audit_probe__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return storage;
    } catch {
      // Fallback para memória
    }
  }
  const memStore: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in memStore ? memStore[k] : null),
    setItem: (k: string, v: string) => { memStore[k] = String(v); },
    removeItem: (k: string) => { delete memStore[k]; },
  };
}

export class AdminAuditService {
  private static instance: AdminAuditService;
  private queue: Promise<any> = Promise.resolve();
  private lastVerificationCache: ChainVerificationResult | null = null;

  private constructor() {
    this.ensureGenesisSeed();
  }

  public static getInstance(): AdminAuditService {
    if (!AdminAuditService.instance) {
      AdminAuditService.instance = new AdminAuditService();
    }
    return AdminAuditService.instance;
  }

  /**
   * Enfileiramento sequencial para garantir atomicidade no cálculo encadeado
   */
  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next;
    return next;
  }

  /**
   * Inicializa o bloco Gênesis caso o storage esteja vazio
   */
  private ensureGenesisSeed(): void {
    const storage = getSafeStorage();
    const raw = storage.getItem(STORAGE_KEY_ADMIN_AUDIT_LOGS);
    if (!raw) {
      const genesisTimestamp = '2026-10-24T00:00:00.000Z';
      const genesisPayload: Omit<AdminActivityEvent, 'eventHash'> = {
        eventId: 'aev_genesis_000000',
        timestamp: genesisTimestamp,
        actorId: 'system_root',
        actorRole: 'system',
        action: 'CONFIG_CHANGE',
        targetType: 'system',
        targetId: 'genesis_block',
        result: 'success',
        reason: 'Inicialização da Trilha de Auditoria Criptográfica do JOBS',
        correlationId: 'corr_genesis_root',
        environment: 'sandbox',
        beforeHash: sha256('system_uninitialized'),
        afterHash: sha256('system_initialized_active'),
        previousEventHash: GENESIS_PREVIOUS_HASH,
        schemaVersion: '1.0.0',
        metadata: {
          chainVersion: '1.0.0',
          algorithm: 'SHA-256',
          encoding: 'canonical-json',
          securityProfile: 'tamper-evident-chain',
        },
      };

      const eventHash = this.computeEventHash(genesisPayload);
      const genesisEvent: AdminActivityEvent = {
        ...genesisPayload,
        eventHash,
      };

      storage.setItem(STORAGE_KEY_ADMIN_AUDIT_LOGS, JSON.stringify([genesisEvent]));
      storage.setItem(STORAGE_KEY_AUDIT_CHECKPOINT, eventHash);
    }
  }

  /**
   * Recupera a lista completa de eventos ordenada cronologicamente (gênesis primeiro, head no fim)
   */
  /**
   * Recupera a lista completa de eventos ordenada cronologicamente (gênesis primeiro, head no fim)
   */
  public getEventsChain(): AdminActivityEvent[] {
    const storage = getSafeStorage();
    const raw = storage.getItem(STORAGE_KEY_ADMIN_AUDIT_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AdminActivityEvent[];
    } catch {
      return [];
    }
  }

  public getAllEvents(): AdminActivityEvent[] {
    return this.getEventsChain();
  }

  /**
   * Salva a cadeia no storage de forma protegida
   */
  private saveEventsChain(chain: AdminActivityEvent[]): void {
    const storage = getSafeStorage();
    storage.setItem(STORAGE_KEY_ADMIN_AUDIT_LOGS, JSON.stringify(chain));
    if (chain.length > 0) {
      storage.setItem(STORAGE_KEY_AUDIT_CHECKPOINT, chain[chain.length - 1].eventHash);
    }
  }

  /**
   * Calcula o hash SHA-256 da serialização canônica do evento (excluindo eventHash)
   */
  public computeEventHash(eventWithoutHash: Omit<AdminActivityEvent, 'eventHash'>): string {
    const canonicalStr = canonicalJsonStringify(eventWithoutHash);
    return sha256(canonicalStr);
  }

  /**
   * Registra uma ação administrativa sensível com encadeamento criptográfico estrito
   */
  public async logActivity(params: {
    actorId: string;
    actorRole?: AdminRole;
    action: AdminActionType;
    targetType?: AdminTargetType;
    targetId?: string;
    result: AdminActionResult;
    reason?: string;
    correlationId?: string;
    environment?: 'production' | 'staging' | 'sandbox';
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<AdminActivityEvent> {
    return this.enqueue(async () => {
      const chain = this.getEventsChain();
      const previousEvent = chain[chain.length - 1];
      const previousEventHash = previousEvent ? previousEvent.eventHash : GENESIS_PREVIOUS_HASH;

      const eventId = `aev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();
      const correlationId = params.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const environment = params.environment || 'sandbox';

      // Hashes de estado pré e pós, se informados
      const beforeHash = params.beforeState !== undefined ? sha256(canonicalJsonStringify(params.beforeState)) : undefined;
      const afterHash = params.afterState !== undefined ? sha256(canonicalJsonStringify(params.afterState)) : undefined;

      // Sanitização de metadados para evitar vazamento de dados confidenciais
      const safeMetadata: Record<string, unknown> = {};
      if (params.metadata) {
        for (const [k, v] of Object.entries(params.metadata)) {
          // Bloqueio explícito de segredos
          const lowerK = k.toLowerCase();
          if (lowerK.includes('password') || lowerK.includes('token') || lowerK.includes('secret') || lowerK.includes('cvv')) {
            safeMetadata[k] = '[REDACTED_SECRET]';
          } else {
            safeMetadata[k] = v;
          }
        }
      }

      const eventPayload: Omit<AdminActivityEvent, 'eventHash'> = {
        eventId,
        timestamp,
        actorId: params.actorId,
        actorRole: params.actorRole || 'admin',
        action: params.action,
        targetType: params.targetType || 'system',
        targetId: params.targetId || 'system',
        result: params.result,
        reason: params.reason || '',
        correlationId,
        environment,
        beforeHash,
        afterHash,
        previousEventHash,
        schemaVersion: '1.0.0',
        metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
      };

      const eventHash = this.computeEventHash(eventPayload);
      const newEvent: AdminActivityEvent = {
        ...eventPayload,
        eventHash,
      };

      chain.push(newEvent);
      this.saveEventsChain(chain);

      // Invalida cache de verificação
      this.lastVerificationCache = null;

      return newEvent;
    });
  }

  /**
   * VERIFICAÇÃO CRIPTOGRÁFICA DA CADEIA DE EVENTOS
   * Percorre todos os blocos do gênesis ao head:
   * 1. Recalcula o hash SHA-256 da serialização canônica de cada bloco.
   * 2. Compara o hash recalculado com o eventHash armazenado.
   * 3. Compara previousEventHash com o eventHash do bloco anterior.
   * Detecta com precisão matemática: alteração de dados, deleção, quebra de encadeamento ou injeção.
   */
  public verifyChainIntegrity(customEvents?: AdminActivityEvent[]): ChainVerificationResult {
    const events = customEvents || this.getEventsChain();
    const timestampNow = new Date().toISOString();

    if (events.length === 0) {
      return {
        isValid: false,
        totalEvents: 0,
        verifiedCount: 0,
        errorReason: 'Cadeia de auditoria vazia.',
        errors: ['Cadeia de auditoria vazia.'],
        tamperedIndex: null,
        lastVerifiedTimestamp: timestampNow,
        genesisHash: 'none',
        headHash: 'none',
      };
    }

    const genesis = events[0];
    const genesisPayload: Omit<AdminActivityEvent, 'eventHash'> = { ...genesis };
    delete (genesisPayload as any).eventHash;
    const computedGenesisHash = this.computeEventHash(genesisPayload);

    if (computedGenesisHash !== genesis.eventHash) {
      const err = `Adulteração detectada no Bloco Gênesis (${genesis.eventId}): hash recalculado divergente.`;
      return {
        isValid: false,
        totalEvents: events.length,
        verifiedCount: 0,
        brokenEventId: genesis.eventId,
        errorReason: err,
        errors: [err],
        tamperedIndex: 0,
        lastVerifiedTimestamp: timestampNow,
        genesisHash: genesis.eventHash,
        headHash: events[events.length - 1].eventHash,
      };
    }

    if (genesis.previousEventHash !== GENESIS_PREVIOUS_HASH) {
      const err = `Bloco Gênesis com previousEventHash inválido (${genesis.previousEventHash}).`;
      return {
        isValid: false,
        totalEvents: events.length,
        verifiedCount: 0,
        brokenEventId: genesis.eventId,
        errorReason: err,
        errors: [err],
        tamperedIndex: 0,
        lastVerifiedTimestamp: timestampNow,
        genesisHash: genesis.eventHash,
        headHash: events[events.length - 1].eventHash,
      };
    }

    let verifiedCount = 1;

    for (let i = 1; i < events.length; i++) {
      const current = events[i];
      const previous = events[i - 1];

      // 1. Encadeamento: previousEventHash deve ser idêntico ao eventHash anterior
      if (current.previousEventHash !== previous.eventHash) {
        const err = `Quebra de elo criptográfico no evento #${i + 1} (${current.eventId}): previousEventHash (${current.previousEventHash.substring(0, 16)}...) não confere com o hash do evento anterior (${previous.eventHash.substring(0, 16)}...).`;
        return {
          isValid: false,
          totalEvents: events.length,
          verifiedCount,
          brokenEventId: current.eventId,
          errorReason: err,
          errors: [err],
          tamperedIndex: i,
          lastVerifiedTimestamp: timestampNow,
          genesisHash: genesis.eventHash,
          headHash: events[events.length - 1].eventHash,
        };
      }

      // 2. Integridade de Conteúdo: recalcula o hash canônico
      const payload: Omit<AdminActivityEvent, 'eventHash'> = { ...current };
      delete (payload as any).eventHash;
      const expectedHash = this.computeEventHash(payload);

      if (expectedHash !== current.eventHash) {
        const err = `Violação de integridade no evento #${i + 1} (${current.eventId}): conteúdo adulterado. Hash recalculado (${expectedHash.substring(0, 16)}...) diverge do assinado (${current.eventHash.substring(0, 16)}...).`;
        return {
          isValid: false,
          totalEvents: events.length,
          verifiedCount,
          brokenEventId: current.eventId,
          errorReason: err,
          errors: [err],
          tamperedIndex: i,
          lastVerifiedTimestamp: timestampNow,
          genesisHash: genesis.eventHash,
          headHash: events[events.length - 1].eventHash,
        };
      }

      verifiedCount++;
    }

    const result: ChainVerificationResult = {
      isValid: true,
      totalEvents: events.length,
      verifiedCount,
      errors: [],
      tamperedIndex: null,
      lastVerifiedTimestamp: timestampNow,
      genesisHash: genesis.eventHash,
      headHash: events[events.length - 1].eventHash,
    };

    if (!customEvents) {
      this.lastVerificationCache = result;
    }

    return result;
  }

  /**
   * Retorna a última verificação em cache ou executa uma nova
   */
  public getLastVerification(): ChainVerificationResult {
    if (!this.lastVerificationCache) {
      this.lastVerificationCache = this.verifyChainIntegrity();
    }
    return this.lastVerificationCache;
  }

  /**
   * Consulta filtrada e paginada para o componente de visualização
   */
  public queryEvents(filter: AdminAuditQueryFilter = {}): AdminAuditQueryResult {
    const all = this.getEventsChain();
    // Exibe em ordem decrescente (mais recentes primeiro)
    const reversed = [...all].reverse();

    const search = filter.search ? filter.search.trim().toLowerCase() : '';

    const filtered = reversed.filter((ev) => {
      if (filter.actorId && filter.actorId !== 'all' && ev.actorId !== filter.actorId) {
        return false;
      }
      if (filter.action && filter.action !== 'all' && ev.action !== filter.action) {
        return false;
      }
      if (filter.result && filter.result !== 'all' && ev.result !== filter.result) {
        return false;
      }
      if (filter.environment && filter.environment !== 'all' && ev.environment !== filter.environment) {
        return false;
      }
      if (filter.startDate && new Date(ev.timestamp) < new Date(filter.startDate)) {
        return false;
      }
      if (filter.endDate && new Date(ev.timestamp) > new Date(filter.endDate)) {
        return false;
      }

      if (search) {
        const matchesEventId = ev.eventId ? ev.eventId.toLowerCase().includes(search) : false;
        const matchesTargetId = ev.targetId ? ev.targetId.toLowerCase().includes(search) : false;
        const matchesCorrelation = ev.correlationId ? ev.correlationId.toLowerCase().includes(search) : false;
        const matchesReason = ev.reason ? ev.reason.toLowerCase().includes(search) : false;
        const matchesActor = ev.actorId ? ev.actorId.toLowerCase().includes(search) : false;
        const matchesHash = ev.eventHash ? ev.eventHash.toLowerCase().includes(search) : false;
        if (!matchesEventId && !matchesTargetId && !matchesCorrelation && !matchesReason && !matchesActor && !matchesHash) {
          return false;
        }
      }

      return true;
    });

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, filter.pageSize || 10);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const events = filtered.slice(start, start + pageSize);

    return {
      events,
      total,
      page: safePage,
      pageSize,
      totalPages,
      integrity: this.getLastVerification(),
    };
  }

  /**
   * Lista única de atores registrados para preenchimento de filtros
   */
  public getDistinctActors(): string[] {
    const chain = this.getEventsChain();
    const set = new Set<string>();
    for (const ev of chain) {
      set.add(ev.actorId);
    }
    return Array.from(set).sort();
  }

  /**
   * Utilitário exclusivo para testes controlados:
   * Simula adulteração de evento sem afetar o storage real da aplicação
   */
  public createTamperedChainForTesting(tamperType: 'tamper_content' | 'break_link' | 'remove_event'): AdminActivityEvent[] {
    const realChain = this.getEventsChain();
    // Clona profundamente
    const copy: AdminActivityEvent[] = JSON.parse(JSON.stringify(realChain));

    if (copy.length < 2) {
      // Adiciona um evento temporário para permitir o teste
      copy.push({
        eventId: 'aev_test_temp_01',
        timestamp: new Date().toISOString(),
        actorId: 'admin_test',
        actorRole: 'finance',
        action: 'BALANCE_ADJUSTMENT',
        targetType: 'wallet',
        targetId: 'user_target_99',
        result: 'success',
        reason: 'Teste temporário',
        correlationId: 'corr_test_01',
        environment: 'sandbox',
        previousEventHash: copy[0].eventHash,
        schemaVersion: '1.0.0',
        eventHash: 'will_be_recalculated',
      });
      copy[copy.length - 1].eventHash = this.computeEventHash(copy[copy.length - 1]);
    }

    const targetIdx = Math.min(1, copy.length - 1);

    if (tamperType === 'tamper_content') {
      // Modifica o campo "reason" sem recalcular o eventHash
      copy[targetIdx].reason = 'VALOR FRAUDADO ADULTERADO DIRETAMENTE NO BANCO';
    } else if (tamperType === 'break_link') {
      // Modifica o previousEventHash rompendo a cadeia
      copy[targetIdx].previousEventHash = '0xbad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0bad0';
    } else if (tamperType === 'remove_event') {
      // Remove um evento do meio
      if (copy.length >= 3) {
        copy.splice(1, 1);
      } else {
        copy[targetIdx].previousEventHash = '0xmissing000000000000000000000000000000000000000000000000000000';
      }
    }

    return copy;
  }
}

export const adminAuditService = AdminAuditService.getInstance();
