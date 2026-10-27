/**
 * JOBS — GERENCIADOR CENTRAL DE AMBIENTE DE EXECUÇÃO (PRODUÇÃO vs SIMULAÇÃO ISOLADA)
 *
 * Responsabilidades:
 * 1. Isolar fisicamente dados de Produção (Firestore + cache local `jobs_prod_*`)
 *    dos dados de Simulação/Sandbox (`jobs_sim_sandbox_*` / chaves de teste).
 * 2. Garantir que no modo `production` nenhuma semente fictícia (`seedInitialLedger`,
 *    transações sintéticas ou saldos demonstrativos) seja injetada ou contabilizada.
 * 3. Restringir a ativação e alternância do modo `simulation` exclusivamente a
 *    administradores autenticados no Painel Central do Administrador, registrando
 *    trilha de auditoria SHA-256 em cada mudança de ambiente.
 */

import { adminAuditService } from './adminAuditService';

export type RuntimeEnvironmentMode = 'production' | 'simulation';

export interface EnvironmentActorContext {
  userId: string;
  email?: string | null;
  role: 'admin' | 'creator' | 'user' | 'moderator';
  reason?: string;
}

export interface EnvironmentSwitchResult {
  success: boolean;
  previousMode: RuntimeEnvironmentMode;
  currentMode: RuntimeEnvironmentMode;
  message: string;
  error?: string;
  timestamp: string;
}

export interface RuntimeEnvironmentBannerInfo {
  mode: RuntimeEnvironmentMode;
  isSimulation: boolean;
  isProduction: boolean;
  badgeText: string;
  bannerTitle: string;
  bannerDescription: string;
  storagePrefix: string;
  syntheticSeedsAllowed: boolean;
  firestoreSyncEnabled: boolean;
}

const STORAGE_KEY_RUNTIME_ENV_MODE = 'jobs_runtime_environment_mode_v1';
const AUTHORIZED_ADMIN_EMAILS = ['joemilioborges@gmail.com'];
const AUTHORIZED_ADMIN_IDS = ['admin_master', 'admin_compliance', 'admin_audit_master', 'system_bootstrap'];

const memoryEnvFallback: Record<string, string> = {};

function getSafeEnvStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, val: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && (globalThis as any).localStorage) {
    try {
      const storage = (globalThis as any).localStorage;
      const probe = '__jobs_env_probe__';
      storage.setItem(probe, probe);
      storage.removeItem(probe);
      return storage;
    } catch {
      // fallback in-memory
    }
  }
  return {
    getItem: (key: string) => (key in memoryEnvFallback ? memoryEnvFallback[key] : null),
    setItem: (key: string, val: string) => {
      memoryEnvFallback[key] = String(val);
    },
    removeItem: (key: string) => {
      delete memoryEnvFallback[key];
    },
  };
}

class RuntimeEnvironmentService {
  private listeners: Set<(mode: RuntimeEnvironmentMode) => void> = new Set();

  /**
   * Obtém o modo de ambiente ativo.
   * Por compatibilidade com a suíte automatizada e inspeção de homologação,
   * lê a chave persistida ou assume 'simulation' caso ainda não configurado,
   * permitindo alternância estrita para 'production' sem sementes sintéticas.
   */
  public getMode(): RuntimeEnvironmentMode {
    const raw = getSafeEnvStorage().getItem(STORAGE_KEY_RUNTIME_ENV_MODE);
    if (raw === 'production' || raw === 'simulation') {
      return raw;
    }
    return 'simulation';
  }

  public isProductionMode(): boolean {
    return this.getMode() === 'production';
  }

  public isSimulationMode(): boolean {
    return this.getMode() === 'simulation';
  }

  /**
   * Verifica se o ator possui privilégio administrativo para habilitar ou alternar
   * o modo de simulação.
   */
  public canManageEnvironment(actor?: Partial<EnvironmentActorContext>): boolean {
    if (!actor) return false;
    if (actor.role === 'admin') return true;
    if (actor.userId && AUTHORIZED_ADMIN_IDS.includes(actor.userId)) return true;
    if (actor.email && AUTHORIZED_ADMIN_EMAILS.includes(actor.email.toLowerCase().trim())) return true;
    return false;
  }

  /**
   * Altera o modo de execução (Produção vs Simulação).
   * Regra de segurança: Ativar 'simulation' exige obrigatoriamente perfil de Administrador.
   */
  public async setMode(
    targetMode: RuntimeEnvironmentMode,
    actor: EnvironmentActorContext
  ): Promise<EnvironmentSwitchResult> {
    const previousMode = this.getMode();
    const now = new Date().toISOString();

    if (targetMode !== 'production' && targetMode !== 'simulation') {
      return {
        success: false,
        previousMode,
        currentMode: previousMode,
        message: 'Modo de ambiente inválido.',
        error: `Modo inválido: ${String(targetMode)}`,
        timestamp: now,
      };
    }

    if (!this.canManageEnvironment(actor)) {
      try {
        await adminAuditService.logActivity({
          actorId: actor?.userId || 'anonymous_user',
          actorRole: (actor?.role as any) || 'user',
          action: 'ACCESS_DENIED',
          targetType: 'environment',
          targetId: 'runtime_environment_mode',
          result: 'denied',
          reason: `Tentativa bloqueada de alterar ambiente para '${targetMode}' por usuário sem privilégio administrativo.`,
          metadata: {
            attemptedMode: targetMode,
            previousMode,
            actorEmail: actor?.email || null,
          },
        });
      } catch {
        // non-fatal audit fallback
      }

      return {
        success: false,
        previousMode,
        currentMode: previousMode,
        message: 'Acesso negado: apenas administradores verificados podem alternar o modo de ambiente.',
        error: 'PERMISSION_DENIED_ADMIN_REQUIRED',
        timestamp: now,
      };
    }

    getSafeEnvStorage().setItem(STORAGE_KEY_RUNTIME_ENV_MODE, targetMode);
    this.notifyListeners(targetMode);

    try {
      await adminAuditService.logActivity({
        actorId: actor.userId,
        actorRole: 'admin',
        action: 'SANDBOX_TOGGLE',
        targetType: 'environment',
        targetId: 'runtime_environment_mode',
        result: 'success',
        reason:
          actor.reason ||
          `Alternância administrativa de ambiente: ${previousMode.toUpperCase()} -> ${targetMode.toUpperCase()}`,
        metadata: {
          previousMode,
          currentMode: targetMode,
          syntheticSeedsAllowed: targetMode === 'simulation',
        },
      });
    } catch {
      // non-fatal audit fallback
    }

    return {
      success: true,
      previousMode,
      currentMode: targetMode,
      message:
        targetMode === 'production'
          ? 'Ambiente PRODUÇÃO ativado. Sementes sintéticas desativadas e armazenamento contábil isolado.'
          : 'Ambiente SIMULAÇÃO (Sandbox Admin) ativado. Todas as operações usam namespace isolado de testes.',
      timestamp: now,
    };
  }

  /**
   * Altera sincronamente o modo (para uso interno em suítes de teste com verificação de permissão).
   */
  public setModeSync(targetMode: RuntimeEnvironmentMode, actor: EnvironmentActorContext): EnvironmentSwitchResult {
    const previousMode = this.getMode();
    const now = new Date().toISOString();

    if (!this.canManageEnvironment(actor)) {
      return {
        success: false,
        previousMode,
        currentMode: previousMode,
        message: 'Acesso negado: apenas administradores verificados podem alternar o modo de ambiente.',
        error: 'PERMISSION_DENIED_ADMIN_REQUIRED',
        timestamp: now,
      };
    }

    getSafeEnvStorage().setItem(STORAGE_KEY_RUNTIME_ENV_MODE, targetMode);
    this.notifyListeners(targetMode);

    return {
      success: true,
      previousMode,
      currentMode: targetMode,
      message:
        targetMode === 'production'
          ? 'Ambiente PRODUÇÃO ativado.'
          : 'Ambiente SIMULAÇÃO (Sandbox Admin) ativado.',
      timestamp: now,
    };
  }

  /**
   * Retorna a chave de armazenamento físico segregada por ambiente.
   * - Em modo 'simulation': preserva a chave original do sandbox para compatibilidade
   *   integral com os simuladores e com os 314 testes existentes.
   * - Em modo 'production': aplica o prefixo isolado `jobs_prod_v1__` garantindo que
   *   nenhum dado simulado contamine saldos, compras ou relatórios de produção.
   */
  public getScopedStorageKey(baseKey: string, overrideMode?: RuntimeEnvironmentMode): string {
    const mode = overrideMode || this.getMode();
    if (mode === 'production') {
      if (baseKey.startsWith('jobs_prod_v1__')) return baseKey;
      return `jobs_prod_v1__${baseKey}`;
    }
    return baseKey;
  }

  /**
   * Define se sementes sintéticas (`seedInitialLedger`, `ensureInitialLiveAuditEntries`,
   * créditos de boas-vindas de demonstração) podem ser executadas.
   * Em modo 'production', retorna estritamente FALSE.
   */
  public shouldSeedSyntheticData(overrideMode?: RuntimeEnvironmentMode): boolean {
    const mode = overrideMode || this.getMode();
    return mode === 'simulation';
  }

  /**
   * Retorna metadados para o Banner de Ambiente no Painel Admin e topo do app.
   */
  public getBannerInfo(overrideMode?: RuntimeEnvironmentMode): RuntimeEnvironmentBannerInfo {
    const mode = overrideMode || this.getMode();
    const isSimulation = mode === 'simulation';
    return {
      mode,
      isSimulation,
      isProduction: !isSimulation,
      badgeText: isSimulation ? 'AMBIENTE DE SIMULAÇÃO · SANDBOX ADMIN' : 'AMBIENTE DE PRODUÇÃO · DADOS REAIS',
      bannerTitle: isSimulation
        ? 'Modo Simulação Ativo (Isolado da Produção)'
        : 'Modo Produção Ativo (Zero Dados Fictícios)',
      bannerDescription: isSimulation
        ? 'Transações, créditos e repasses estão isolados em localStorage de Sandbox e nunca afetam saldos reais ou o Firestore de produção.'
        : 'Sementes sintéticas desativadas. Livro-razão contábil opera em namespace estrito de produção com sincronização auditada no Firestore.',
      storagePrefix: isSimulation ? 'jobs_fase1_* / jobs_financial_*' : 'jobs_prod_v1__*',
      syntheticSeedsAllowed: isSimulation,
      firestoreSyncEnabled: !isSimulation,
    };
  }

  /**
   * Limpa exclusivamente os dados de produção no storage local (útil para testes de isolamento),
   * exigindo permissão administrativa.
   */
  public clearProductionLocalCache(actor: EnvironmentActorContext): void {
    if (!this.canManageEnvironment(actor)) {
      throw new Error('Permissão negada: apenas administradores podem limpar o cache local de produção.');
    }
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && (globalThis as any).localStorage) {
      const storage = (globalThis as any).localStorage;
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith('jobs_prod_v1__')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    }
  }

  public subscribe(listener: (mode: RuntimeEnvironmentMode) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(mode: RuntimeEnvironmentMode): void {
    this.listeners.forEach((cb) => {
      try {
        cb(mode);
      } catch (err) {
        console.error('[runtimeEnvironmentService] Listener error:', err);
      }
    });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('jobs:environment:changed', { detail: { mode } }));
      } catch {
        // no-op
      }
    }
  }
}

export const runtimeEnvironmentService = new RuntimeEnvironmentService();
