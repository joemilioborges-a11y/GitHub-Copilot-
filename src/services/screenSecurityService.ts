/**
 * JOBS — Serviço de Controle Dinâmico de Segurança de Tela (FASE 2 — Android FLAG_SECURE & Web Shield)
 *
 * Responsabilidades:
 * - Ativar WindowManager.LayoutParams.FLAG_SECURE no Android ao entrar em telas/modais que exibem
 *   fotos ou vídeos protegidos (via plugin Capacitor `JobsScreenSecurity`).
 * - Remover FLAG_SECURE ao sair de todas as visualizações protegidas ativas (contagem de referência
 *   por escopo `scopeId`, garantindo que se um modal abrir sobre uma tela protegida e fechar,
 *   a flag só seja removida quando o último escopo protegido for encerrado).
 * - Manter registro auditável de transições para verificação automatizada em testes.
 */

import { useEffect } from 'react';

export interface FlagSecureTransitionEvent {
  timestamp: string;
  action: 'ENABLED' | 'DISABLED';
  triggerScopeId: string;
  activeScopesCount: number;
  nativePluginInvoked: boolean;
}

class ScreenSecurityService {
  private activeScopes: Set<string> = new Set();
  private flagSecureEnabled = false;
  private transitions: FlagSecureTransitionEvent[] = [];

  private invokeNativeBridge(enabled: boolean, triggerScopeId: string): boolean {
    let invoked = false;
    try {
      const cap =
        typeof globalThis !== 'undefined' ? (globalThis as any).Capacitor : undefined;
      const plugin = cap?.Plugins?.JobsScreenSecurity;
      if (plugin) {
        if (typeof plugin.setSecureScreen === 'function') {
          plugin.setSecureScreen({ enabled });
          invoked = true;
        } else if (enabled && typeof plugin.enableSecureScreen === 'function') {
          plugin.enableSecureScreen();
          invoked = true;
        } else if (!enabled && typeof plugin.disableSecureScreen === 'function') {
          plugin.disableSecureScreen();
          invoked = true;
        }
      }
    } catch {
      invoked = false;
    }

    if (typeof document !== 'undefined' && document.documentElement) {
      if (enabled) {
        document.documentElement.setAttribute('data-jobs-secure-screen', 'active');
      } else {
        document.documentElement.removeAttribute('data-jobs-secure-screen');
      }
    }

    this.transitions.unshift({
      timestamp: new Date().toISOString(),
      action: enabled ? 'ENABLED' : 'DISABLED',
      triggerScopeId,
      activeScopesCount: this.activeScopes.size,
      nativePluginInvoked: invoked,
    });
    if (this.transitions.length > 200) {
      this.transitions = this.transitions.slice(0, 200);
    }

    return invoked;
  }

  /**
   * Registra um escopo de visualização de mídia protegida e ativa FLAG_SECURE se ainda não estiver ativa.
   */
  public acquireSecureScreen(scopeId: string): boolean {
    const cleanScope = (scopeId || 'default_media_scope').trim();
    const wasEmpty = this.activeScopes.size === 0;
    this.activeScopes.add(cleanScope);

    if (wasEmpty || !this.flagSecureEnabled) {
      this.flagSecureEnabled = true;
      this.invokeNativeBridge(true, cleanScope);
    }

    return this.flagSecureEnabled;
  }

  /**
   * Libera um escopo de visualização de mídia protegida e remove FLAG_SECURE quando nenhum escopo restar.
   */
  public releaseSecureScreen(scopeId: string): boolean {
    const cleanScope = (scopeId || 'default_media_scope').trim();
    const existed = this.activeScopes.delete(cleanScope);

    if (existed && this.activeScopes.size === 0 && this.flagSecureEnabled) {
      this.flagSecureEnabled = false;
      this.invokeNativeBridge(false, cleanScope);
    }

    return this.flagSecureEnabled;
  }

  public isSecureScreenActive(): boolean {
    return this.flagSecureEnabled && this.activeScopes.size > 0;
  }

  public getActiveSecureScopes(): string[] {
    return Array.from(this.activeScopes);
  }

  public getTransitionHistory(): FlagSecureTransitionEvent[] {
    return [...this.transitions];
  }

  public resetForTesting(): void {
    this.activeScopes.clear();
    if (this.flagSecureEnabled) {
      this.flagSecureEnabled = false;
      this.invokeNativeBridge(false, 'test_reset');
    }
    this.transitions = [];
  }
}

export const screenSecurityService = new ScreenSecurityService();

/**
 * Hook React para ativar FLAG_SECURE ao montar/abrir mídia protegida e remover ao desmontar/fechar.
 */
export function useSecureScreen(active: boolean, scopeId: string): void {
  useEffect(() => {
    if (!active) {
      screenSecurityService.releaseSecureScreen(scopeId);
      return;
    }

    screenSecurityService.acquireSecureScreen(scopeId);
    return () => {
      screenSecurityService.releaseSecureScreen(scopeId);
    };
  }, [active, scopeId]);
}
