import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Lock,
  Link2,
  Unlink,
  ChevronLeft,
  ChevronRight,
  FileCode2,
  Info,
  SlidersHorizontal,
  Database,
  X,
} from 'lucide-react';
import {
  financialLedger,
  LedgerEntry,
  LedgerEntryStatus,
  LedgerOperationType,
} from '../../services/ledgerService';
import {
  canAccessSha256AuditViewer,
  LedgerSha256ValidationResult,
  maskSensitiveIdentifier,
  sanitizeMetadataForAudit,
  Sha256ValidationStatus,
  validateLedgerBatchSha256,
} from '../../utils/ledgerSha256Validator';

export interface LedgerSha256AuditViewerProps {
  operatorRole?: string;
  onRefreshParent?: () => void;
  /**
   * Fonte de dados opcional para injeção controlada em testes automatizados,
   * evitando tocar ou mutar o armazenamento real.
   */
  dataSourceOverride?: {
    getEntries: () => LedgerEntry[];
  };
}

const OPERATION_LABELS: Record<LedgerOperationType, string> = {
  CREDIT_PURCHASE: 'Compra de Créditos',
  CONTENT_UNLOCK: 'Desbloqueio de Conteúdo',
  TIP_GIFT: 'Presente / Mimo',
  SUBSCRIPTION_PURCHASE: 'Assinatura VIP',
  CREATOR_REVENUE_SHARE: 'Repasse Criador (70%)',
  PLATFORM_COMMISSION: 'Comissão JOBS (30%)',
  REFUND: 'Estorno de Créditos',
  CHARGEBACK: 'Chargeback',
  ADMIN_ADJUSTMENT: 'Ajuste Administrativo',
  PERFORMANCE_REWARD: 'Bônus de Performance',
  PAYOUT_RESERVE: 'Reserva de Saque',
  PAYOUT_SETTLED: 'Saque Liquidado',
  PAYOUT_REVERSAL: 'Reversão de Saque',
};

const ACCOUNTING_STATUS_LABELS: Record<LedgerEntryStatus, { label: string; badgeClass: string }> = {
  posted: {
    label: 'POSTED (Efetivado)',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
  },
  pending: {
    label: 'PENDING (Pendente)',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
  },
  refunded: {
    label: 'REFUNDED (Estornado)',
    badgeClass: 'bg-sky-950/70 text-sky-300 border-sky-800/80',
  },
  voided: {
    label: 'VOIDED (Anulado)',
    badgeClass: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
  },
};

function truncateHash(hash: string | null | undefined, start = 10, end = 8): string {
  if (!hash) return '—';
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

export const LedgerSha256AuditViewer: React.FC<LedgerSha256AuditViewerProps> = ({
  operatorRole = 'admin',
  onRefreshParent,
  dataSourceOverride,
}) => {
  // Filtros controlados (Fase 5)
  const [searchQuery, setSearchQuery] = useState('');
  const [operationFilter, setOperationFilter] = useState<LedgerOperationType | 'all'>('all');
  const [accountingStatusFilter, setAccountingStatusFilter] = useState<LedgerEntryStatus | 'all'>('all');
  const [validationStatusFilter, setValidationStatusFilter] = useState<Sha256ValidationStatus | 'all'>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'sandbox' | 'production'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Paginação e atualização controlada
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado de cópia para área de transferência e modal de inspeção
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null);
  const [inspectedEntryId, setInspectedEntryId] = useState<string | null>(null);

  const hasPermission = useMemo(() => canAccessSha256AuditViewer(operatorRole), [operatorRole]);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshNonce((prev) => prev + 1);
    if (onRefreshParent) {
      onRefreshParent();
    }
    setTimeout(() => setIsRefreshing(false), 180);
  }, [onRefreshParent]);

  const handleCopy = useCallback((key: string, value: string | null | undefined) => {
    if (!value) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedFieldKey(key);
    setTimeout(() => {
      setCopiedFieldKey((prev) => (prev === key ? null : prev));
    }, 1600);
  }, []);

  // Consulta somente leitura e validação criptográfica com tratamento de erro
  const auditDataState = useMemo(() => {
    if (!hasPermission) {
      return {
        error: null as string | null,
        allEntriesCount: 0,
        filteredEntries: [] as Array<{ entry: LedgerEntry; validation: LedgerSha256ValidationResult }>,
        paginatedItems: [] as Array<{ entry: LedgerEntry; validation: LedgerSha256ValidationResult }>,
        totalPages: 1,
        safePage: 1,
        summaryCounts: {
          total: 0,
          valid: 0,
          mismatch: 0,
          unavailable: 0,
          error: 0,
          brokenChainLinks: 0,
        },
      };
    }

    try {
      // 1. Obtém entradas da fonte de dados (override de teste ou API oficial do ledgerService)
      let baseEntries: LedgerEntry[] = [];
      let fullChainEntries: LedgerEntry[] = [];

      if (dataSourceOverride) {
        fullChainEntries = dataSourceOverride.getEntries();
        baseEntries = [...fullChainEntries];
      } else {
        fullChainEntries = financialLedger.getEntries();
        const queryResult = financialLedger.queryLedger({
          operationType: operationFilter,
          status: accountingStatusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: 1,
          pageSize: Math.max(fullChainEntries.length, 1),
        });
        baseEntries = queryResult.entries;
      }

      // Se estamos usando dataSourceOverride, aplicamos os filtros equivalentes do queryLedger
      if (dataSourceOverride) {
        if (operationFilter !== 'all') {
          baseEntries = baseEntries.filter((e) => e?.operationType === operationFilter);
        }
        if (accountingStatusFilter !== 'all') {
          baseEntries = baseEntries.filter((e) => e?.status === accountingStatusFilter);
        }
        if (startDate) {
          const startMs = new Date(startDate).getTime();
          if (!Number.isNaN(startMs)) {
            baseEntries = baseEntries.filter((e) => new Date(e.timestamp).getTime() >= startMs);
          }
        }
        if (endDate) {
          const endMs = new Date(endDate).getTime();
          if (!Number.isNaN(endMs)) {
            baseEntries = baseEntries.filter((e) => new Date(e.timestamp).getTime() <= endMs + 86400000);
          }
        }
      }

      // 2. Filtro de ambiente (Sandbox vs Produção)
      if (environmentFilter !== 'all') {
        baseEntries = baseEntries.filter((e) => {
          const env =
            e?.metadata?.environment === 'production' || e?.isSandbox === false
              ? 'production'
              : 'sandbox';
          return env === environmentFilter;
        });
      }

      // 3. Validação criptográfica SHA-256 e verificação de elo previousHash na cadeia completa
      const batchValidation = validateLedgerBatchSha256(baseEntries, fullChainEntries);

      let combined = baseEntries.map((entry, idx) => ({
        entry,
        validation: batchValidation.orderedResults[idx],
      }));

      // 4. Filtro textual amplo (inclui ID, transactionId, idempotencyKey, actorId, hashes)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        combined = combined.filter(({ entry, validation }) => {
          const idMatch = (entry?.id || '').toLowerCase().includes(q);
          const txMatch = (entry?.transactionId || '').toLowerCase().includes(q);
          const idempMatch = (entry?.idempotencyKey || '').toLowerCase().includes(q);
          const actorMatch = (entry?.actorId || '').toLowerCase().includes(q);
          const refIdMatch = (entry?.referenceId || '').toLowerCase().includes(q);
          const calcHashMatch = (validation.calculatedSha256Hash || '').toLowerCase().includes(q);
          const refHashMatch = (validation.referenceSha256Hash || '').toLowerCase().includes(q);
          const entryHashMatch = (entry?.entryHash || '').toLowerCase().includes(q);
          return (
            idMatch ||
            txMatch ||
            idempMatch ||
            actorMatch ||
            refIdMatch ||
            calcHashMatch ||
            refHashMatch ||
            entryHashMatch
          );
        });
      }

      // Contadores consolidados antes de filtrar pelo status de validação específico
      const summaryCounts = {
        total: combined.length,
        valid: combined.filter((item) => item.validation.status === 'VALID').length,
        mismatch: combined.filter((item) => item.validation.status === 'MISMATCH').length,
        unavailable: combined.filter((item) => item.validation.status === 'UNAVAILABLE').length,
        error: combined.filter((item) => item.validation.status === 'ERROR').length,
        brokenChainLinks: combined.filter((item) => item.validation.chainStatus === 'BROKEN').length,
      };

      // 5. Filtro por status de validação SHA-256
      if (validationStatusFilter !== 'all') {
        combined = combined.filter((item) => item.validation.status === validationStatusFilter);
      }

      const totalPages = Math.max(1, Math.ceil(combined.length / pageSize));
      const safePage = Math.min(Math.max(1, currentPage), totalPages);
      const startIndex = (safePage - 1) * pageSize;
      const paginatedItems = combined.slice(startIndex, startIndex + pageSize);

      return {
        error: null as string | null,
        allEntriesCount: fullChainEntries.length,
        filteredEntries: combined,
        paginatedItems,
        totalPages,
        safePage,
        summaryCounts,
      };
    } catch (err: any) {
      return {
        error: err?.message || 'Erro inesperado ao consultar ou validar os registros do ledger.',
        allEntriesCount: 0,
        filteredEntries: [] as Array<{ entry: LedgerEntry; validation: LedgerSha256ValidationResult }>,
        paginatedItems: [] as Array<{ entry: LedgerEntry; validation: LedgerSha256ValidationResult }>,
        totalPages: 1,
        safePage: 1,
        summaryCounts: {
          total: 0,
          valid: 0,
          mismatch: 0,
          unavailable: 0,
          error: 0,
          brokenChainLinks: 0,
        },
      };
    }
  }, [
    hasPermission,
    dataSourceOverride,
    operationFilter,
    accountingStatusFilter,
    validationStatusFilter,
    environmentFilter,
    startDate,
    endDate,
    searchQuery,
    currentPage,
    pageSize,
    refreshNonce,
  ]);

  const inspectedItem = useMemo(() => {
    if (!inspectedEntryId) return null;
    return (
      auditDataState.filteredEntries.find((item) => item.entry.id === inspectedEntryId) || null
    );
  }, [inspectedEntryId, auditDataState.filteredEntries]);

  // Bloqueio estrito de permissão administrativa (RBAC)
  if (!hasPermission) {
    return (
      <div
        data-testid="sha256-audit-unauthorized"
        className="p-6 bg-slate-950 border border-rose-900/70 rounded-2xl text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-base font-bold text-white">
          Acesso Restrito — Visualizador Criptográfico SHA-256
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          O perfil atual (<span className="font-mono text-rose-300">{operatorRole || 'anônimo'}</span>)
          não possui privilégios de auditoria de baixo nível. Apenas operadores com função{' '}
          <span className="font-mono text-slate-200">admin</span>,{' '}
          <span className="font-mono text-slate-200">auditor</span> ou{' '}
          <span className="font-mono text-slate-200">security</span> podem inspecionar hashes do
          livro-razão.
        </p>
      </div>
    );
  }

  const renderValidationBadge = (validation: LedgerSha256ValidationResult) => {
    switch (validation.status) {
      case 'VALID':
        return (
          <span
            data-testid={`sha256-status-badge-${validation.entryId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/70"
            title={validation.statusReason}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>VALID (SHA-256 Íntegro)</span>
          </span>
        );
      case 'MISMATCH':
        return (
          <span
            data-testid={`sha256-status-badge-${validation.entryId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-950/90 text-rose-300 border border-rose-700"
            title={validation.statusReason}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>MISMATCH (Divergente)</span>
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span
            data-testid={`sha256-status-badge-${validation.entryId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/70"
            title={validation.statusReason}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>UNAVAILABLE (Sem Ref. 64-Hex)</span>
          </span>
        );
      case 'ERROR':
      default:
        return (
          <span
            data-testid={`sha256-status-badge-${validation.entryId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-950/90 text-purple-200 border border-purple-700"
            title={validation.statusReason}
          >
            <XCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>ERROR (Dados Inválidos)</span>
          </span>
        );
    }
  };

  const renderChainBadge = (validation: LedgerSha256ValidationResult) => {
    if (validation.chainStatus === 'LINKED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
          <Link2 className="w-3 h-3" /> Elo Íntegro
        </span>
      );
    }
    if (validation.chainStatus === 'GENESIS') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400">
          <Database className="w-3 h-3" /> Bloco Gênesis
        </span>
      );
    }
    if (validation.chainStatus === 'BROKEN') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
          <Unlink className="w-3 h-3" /> Elo Quebrado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <Link2 className="w-3 h-3" /> Fronteira / Isolado
      </span>
    );
  };

  return (
    <div data-testid="ledger-sha256-audit-viewer" className="space-y-4">
      {/* Cabeçalho Técnico e Aviso de Fronteira de Confiança (Fase 5) */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold uppercase">
                FIPS 180-4 • SHA-256 (64-HEX)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                Protocolo: v1-canonical-sha256
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 text-[10px] font-bold">
                MODO SOMENTE LEITURA
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-cyan-400 shrink-0" />
              Visualizador de Logs de Auditoria SHA-256 (Baixo Nível)
            </h3>
            <p className="text-xs text-slate-400">
              Inspeção determinística das transações do <code className="text-slate-200">ledgerService</code>.
              Recalcula o digest SHA-256 sobre o payload canônico e confronta com o hash de referência e o
              encadeamento <code className="text-slate-200">previousHash</code> sem alterar registros.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={handleManualRefresh}
              data-testid="sha256-refresh-btn"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar Validação
            </button>
          </div>
        </div>

        {/* Nota obrigatória sobre validação no cliente vs integridade no backend */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-start gap-2 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Nota de Fronteira de Segurança:</strong> A verificação
            SHA-256 executada no navegador comprova a consistência matemática dos registros recebidos e
            detecta adulterações locais ou quebras de encadeamento (<code className="text-slate-300">previousHash</code>).
            Registros legados pré-migração que possuem apenas o checksum simulado de 32 bits (
            <code className="text-amber-300">0x…7f8e9a2b…</code>) são reportados como{' '}
            <strong className="text-amber-300">UNAVAILABLE</strong> (ausência de referência SHA-256 de 64
            hex), nunca sendo convertidos artificialmente em status válido.
          </div>
        </div>
      </div>

      {/* Cartões de Resumo de Validação (Fase 3 e Fase 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            Registros Filtrados
          </span>
          <div className="text-lg font-black text-white font-mono mt-0.5" data-testid="sha256-count-total">
            {auditDataState.summaryCounts.total}
          </div>
          <span className="text-[10px] text-slate-500">
            de {auditDataState.allEntriesCount} no ledger
          </span>
        </div>

        <div className="p-3 bg-emerald-950/25 border border-emerald-800/50 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> VALID (SHA-256)
          </span>
          <div className="text-lg font-black text-emerald-300 font-mono mt-0.5" data-testid="sha256-count-valid">
            {auditDataState.summaryCounts.valid}
          </div>
          <span className="text-[10px] text-emerald-400/80">Ref. 64-hex confirmada</span>
        </div>

        <div className="p-3 bg-rose-950/25 border border-rose-800/60 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> MISMATCH
          </span>
          <div className="text-lg font-black text-rose-300 font-mono mt-0.5" data-testid="sha256-count-mismatch">
            {auditDataState.summaryCounts.mismatch}
          </div>
          <span className="text-[10px] text-rose-400/80">Divergência / Adulterado</span>
        </div>

        <div className="p-3 bg-amber-950/25 border border-amber-800/50 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> UNAVAILABLE
          </span>
          <div className="text-lg font-black text-amber-300 font-mono mt-0.5" data-testid="sha256-count-unavailable">
            {auditDataState.summaryCounts.unavailable}
          </div>
          <span className="text-[10px] text-amber-400/80">Legado sem ref. 64-hex</span>
        </div>

        <div className="p-3 bg-purple-950/25 border border-purple-800/50 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-purple-300 font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
          <div className="text-lg font-black text-purple-200 font-mono mt-0.5" data-testid="sha256-count-error">
            {auditDataState.summaryCounts.error}
          </div>
          <span className="text-[10px] text-purple-300/80">Campos inválidos/ausentes</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <Link2 className="w-3 h-3 text-cyan-400" /> Quebras de Elo
          </span>
          <div
            className={`text-lg font-black font-mono mt-0.5 ${
              auditDataState.summaryCounts.brokenChainLinks > 0 ? 'text-rose-400' : 'text-cyan-300'
            }`}
            data-testid="sha256-count-broken-links"
          >
            {auditDataState.summaryCounts.brokenChainLinks}
          </div>
          <span className="text-[10px] text-slate-500">Verificação previousHash</span>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa (Fase 5) */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            Filtros de Auditoria de Baixo Nível
          </span>
          {(searchQuery ||
            operationFilter !== 'all' ||
            accountingStatusFilter !== 'all' ||
            validationStatusFilter !== 'all' ||
            environmentFilter !== 'all' ||
            startDate ||
            endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOperationFilter('all');
                setAccountingStatusFilter('all');
                setValidationStatusFilter('all');
                setEnvironmentFilter('all');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Busca por ID, Hash, Chave de Idempotência */}
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por ID, hash SHA-256, chave de idempotência ou ator..."
              data-testid="sha256-search-input"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Status de Validação SHA-256 */}
          <div>
            <select
              value={validationStatusFilter}
              onChange={(e) => {
                setValidationStatusFilter(e.target.value as Sha256ValidationStatus | 'all');
                setCurrentPage(1);
              }}
              data-testid="sha256-filter-validation-status"
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Status SHA-256: Todos</option>
              <option value="VALID">VALID (SHA-256 Íntegro)</option>
              <option value="MISMATCH">MISMATCH (Divergente)</option>
              <option value="UNAVAILABLE">UNAVAILABLE (Sem Ref. 64-Hex)</option>
              <option value="ERROR">ERROR (Dados Inválidos)</option>
            </select>
          </div>

          {/* Tipo de Operação */}
          <div>
            <select
              value={operationFilter}
              onChange={(e) => {
                setOperationFilter(e.target.value as LedgerOperationType | 'all');
                setCurrentPage(1);
              }}
              data-testid="sha256-filter-operation"
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Operação: Todas</option>
              {Object.entries(OPERATION_LABELS).map(([opCode, label]) => (
                <option key={opCode} value={opCode}>
                  {label} ({opCode})
                </option>
              ))}
            </select>
          </div>

          {/* Status Contábil */}
          <div>
            <select
              value={accountingStatusFilter}
              onChange={(e) => {
                setAccountingStatusFilter(e.target.value as LedgerEntryStatus | 'all');
                setCurrentPage(1);
              }}
              data-testid="sha256-filter-accounting-status"
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Status Contábil: Todos</option>
              <option value="posted">POSTED (Efetivado)</option>
              <option value="pending">PENDING (Pendente)</option>
              <option value="refunded">REFUNDED (Estornado)</option>
              <option value="voided">VOIDED (Anulado)</option>
            </select>
          </div>

          {/* Ambiente (Sandbox vs Produção) */}
          <div>
            <select
              value={environmentFilter}
              onChange={(e) => {
                setEnvironmentFilter(e.target.value as 'all' | 'sandbox' | 'production');
                setCurrentPage(1);
              }}
              data-testid="sha256-filter-environment"
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Ambiente: Todos</option>
              <option value="sandbox">SANDBOX (Simulação/Teste)</option>
              <option value="production">PRODUCTION (Produção)</option>
            </select>
          </div>
        </div>

        {/* Filtro de Período (Data Inicial e Data Final) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 shrink-0">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 shrink-0">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <label className="text-[11px] text-slate-400">Itens por página:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tratamento de Erro na Fonte de Dados */}
      {auditDataState.error && (
        <div
          data-testid="sha256-datasource-error"
          className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-200"
        >
          <div className="flex items-center gap-2.5">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="block text-rose-300">Falha ao consultar histórico do Ledger</strong>
              <span>{auditDataState.error}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold cursor-pointer shrink-0"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Tabela de Logs de Auditoria SHA-256 (Fase 3) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {auditDataState.paginatedItems.length === 0 ? (
          <div
            data-testid="sha256-empty-state"
            className="p-8 text-center space-y-2 text-slate-400 text-xs"
          >
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">
              Nenhuma transação encontrada para os critérios selecionados.
            </p>
            <p className="text-[11px] text-slate-500">
              O visualizador não gera registros fictícios. Ajuste os filtros ou realize uma operação no
              sistema para inspecionar novos lançamentos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">ID Transação / Ambiente</th>
                  <th className="py-3 px-3">Data / Hora (UTC)</th>
                  <th className="py-3 px-3">Operação & Status</th>
                  <th className="py-3 px-3 text-right">Valor & Moeda</th>
                  <th className="py-3 px-3">Chave Idempotência</th>
                  <th className="py-3 px-3">Hash Referência (64-Hex)</th>
                  <th className="py-3 px-3">Hash Calculado (SHA-256)</th>
                  <th className="py-3 px-3">Elo (previousHash)</th>
                  <th className="py-3 px-3">Status Validação SHA-256</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {auditDataState.paginatedItems.map(({ entry, validation }) => {
                  const accountingMeta = ACCOUNTING_STATUS_LABELS[entry.status] || {
                    label: String(entry.status || 'UNKNOWN'),
                    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
                  };
                  const formattedAmount =
                    entry.currency === 'BRL'
                      ? `R$ ${Number(entry.amount || 0).toFixed(2)}`
                      : `${entry.amount || 0} CREDITS`;

                  return (
                    <tr
                      key={entry.id}
                      data-testid={`sha256-row-${entry.id}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. ID da Transação + Ambiente */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold" title={entry.id}>
                            {truncateHash(entry.id, 12, 6)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`id_${entry.id}`, entry.id)}
                            className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                            title="Copiar ID da entrada"
                          >
                            {copiedFieldKey === `id_${entry.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              validation.environment === 'production'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/70'
                            }`}
                          >
                            {validation.environment === 'production' ? 'PRODUCTION' : 'SANDBOX'}
                          </span>
                          {entry.transactionId && (
                            <span className="text-[10px] text-slate-500" title={entry.transactionId}>
                              tx: {truncateHash(entry.transactionId, 6, 4)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Data e Hora */}
                      <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                        <div>
                          {!Number.isNaN(Date.parse(entry.timestamp))
                            ? new Date(entry.timestamp).toLocaleString('pt-BR')
                            : 'Timestamp Inválido'}
                        </div>
                        <div className="text-[10px] text-slate-500">{entry.timestamp || '—'}</div>
                      </td>

                      {/* 3. Tipo de Operação & Status Contábil */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-200">
                          {OPERATION_LABELS[entry.operationType] || entry.operationType || 'DESCONHECIDO'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${accountingMeta.badgeClass}`}
                          >
                            {accountingMeta.label}
                          </span>
                        </div>
                      </td>

                      {/* 4. Valor e Moeda */}
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                        <div
                          className={`font-bold ${
                            entry.currency === 'BRL' ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {formattedAmount}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {entry.amountCents ?? '—'} {entry.currency === 'BRL' ? 'centavos' : 'unid.'}
                        </div>
                      </td>

                      {/* 5. Chave de Idempotência (Mascarada por segurança) */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span title="Mascarado na listagem por segurança">
                            {maskSensitiveIdentifier(entry.idempotencyKey, 8, 5)}
                          </span>
                          {entry.idempotencyKey && (
                            <button
                              type="button"
                              onClick={() => handleCopy(`idemp_${entry.id}`, entry.idempotencyKey)}
                              className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                              title="Copiar chave de idempotência"
                            >
                              {copiedFieldKey === `idemp_${entry.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">Ator: {entry.actorId || '—'}</div>
                      </td>

                      {/* 6. Hash de Referência SHA-256 */}
                      <td className="py-2.5 px-3 font-mono">
                        {validation.referenceSha256Hash ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-emerald-300"
                              title={`Referência SHA-256 (64 hex): ${validation.referenceSha256Hash}`}
                            >
                              {truncateHash(validation.referenceSha256Hash, 8, 8)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`ref_${entry.id}`, validation.referenceSha256Hash)
                              }
                              className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                              title="Copiar Hash SHA-256 de Referência"
                            >
                              {copiedFieldKey === `ref_${entry.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-amber-300/90 text-[10px]">
                            <span className="font-bold block">Ausente (Legado)</span>
                            <span className="text-slate-500" title={entry.entryHash}>
                              entryHash: {truncateHash(entry.entryHash, 8, 6)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 7. Hash Calculado SHA-256 (64 hex) */}
                      <td className="py-2.5 px-3 font-mono">
                        {validation.calculatedSha256Hash ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-cyan-300"
                              title={`SHA-256 Calculado (64 hex): ${validation.calculatedSha256Hash}`}
                            >
                              {truncateHash(validation.calculatedSha256Hash, 8, 8)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`calc_${entry.id}`, validation.calculatedSha256Hash)
                              }
                              className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                              title="Copiar Hash SHA-256 Calculado"
                            >
                              {copiedFieldKey === `calc_${entry.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-purple-300 text-[10px] font-bold">
                            Não calculado (Erro de payload)
                          </span>
                        )}
                      </td>

                      {/* 8. Elo previousHash */}
                      <td className="py-2.5 px-3 font-mono">
                        <div>{renderChainBadge(validation)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5" title={entry.previousHash}>
                          {truncateHash(entry.previousHash, 8, 6)}
                        </div>
                      </td>

                      {/* 9. Status de Validação SHA-256 (Ícone + Texto + Cor Semântica) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderValidationBadge(validation)}
                      </td>

                      {/* 10. Ação: Inspecionar Detalhes Técnicos */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectedEntryId(entry.id)}
                          data-testid={`sha256-inspect-btn-${entry.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspecionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginação */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            Exibindo{' '}
            <span className="font-mono font-bold text-white">
              {auditDataState.paginatedItems.length}
            </span>{' '}
            de{' '}
            <span className="font-mono font-bold text-white">
              {auditDataState.filteredEntries.length}
            </span>{' '}
            registros auditados (Página{' '}
            <span className="font-mono font-bold text-cyan-400">{auditDataState.safePage}</span> de{' '}
            <span className="font-mono font-bold text-white">{auditDataState.totalPages}</span>)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={auditDataState.safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={auditDataState.safePage >= auditDataState.totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(auditDataState.totalPages, p + 1))
              }
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal / Painel de Inspeção Técnica de Baixo Nível (Fase 5) */}
      {inspectedItem && (
        <div
          data-testid="sha256-inspection-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    INSPEÇÃO FORENSE SHA-256
                  </span>
                  {renderValidationBadge(inspectedItem.validation)}
                </div>
                <h4 className="text-sm font-bold text-white font-mono mt-1">
                  ID: {inspectedItem.entry.id}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEntryId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Diagnóstico da Validação */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Diagnóstico Técnico de Validação
                </span>
                <p className="text-slate-200 font-medium">
                  {inspectedItem.validation.statusReason}
                </p>
                {inspectedItem.validation.errorReasons.length > 0 && (
                  <ul className="list-disc list-inside text-rose-400 font-mono text-[11px] pt-1">
                    {inspectedItem.validation.errorReasons.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Comparação de Hashes */}
              <div className="grid grid-cols-1 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase mb-1">
                    <span>Hash SHA-256 Calculado (FIPS 180-4 • 64 Hex)</span>
                    {inspectedItem.validation.calculatedSha256Hash && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            'modal_calc_hash',
                            inspectedItem.validation.calculatedSha256Hash
                          )
                        }
                        className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    )}
                  </div>
                  <div className="text-cyan-300 break-all text-[11px] font-bold">
                    {inspectedItem.validation.calculatedSha256Hash || 'N/A (Erro nos campos de entrada)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase mb-1">
                    <span>Hash SHA-256 de Referência Armazenado (64 Hex)</span>
                    {inspectedItem.validation.referenceSha256Hash && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('modal_ref_hash', inspectedItem.validation.referenceSha256Hash)
                        }
                        className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    )}
                  </div>
                  <div
                    className={`break-all text-[11px] font-bold ${
                      inspectedItem.validation.referenceSha256Hash
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {inspectedItem.validation.referenceSha256Hash ||
                      'AUSENTE — Registro pré-migração sem hash SHA-256 de 64 caracteres hexadecimais (Status: UNAVAILABLE).'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">
                      Checksum de Elo Armazenado (entryHash)
                    </span>
                    <div className="text-slate-200 break-all text-[11px]">
                      {inspectedItem.validation.storedEntryHash || '—'}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Status Checksum Legado: {inspectedItem.validation.legacyChecksumStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">
                      Encadeamento Criptográfico (previousHash)
                    </span>
                    <div className="text-slate-200 break-all text-[11px]">
                      Armazenado: {inspectedItem.validation.actualPreviousHash || '—'}
                    </div>
                    {inspectedItem.validation.expectedPreviousHash && (
                      <div className="text-slate-400 break-all text-[10px] mt-1">
                        Esperado (Entrada Anterior): {inspectedItem.validation.expectedPreviousHash}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Campos utilizados na serialização canônica */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payload Canônico Determinístico ({inspectedItem.validation.protocolVersion})
                  </span>
                  {inspectedItem.validation.canonicalPayloadJson && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          'modal_canonical_json',
                          inspectedItem.validation.canonicalPayloadJson
                        )
                      }
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <Copy className="w-3 h-3" /> Copiar JSON Canônico
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Campos ordenados lexicograficamente:{' '}
                  <span className="font-mono text-slate-200">
                    {inspectedItem.validation.canonicalFieldsIncluded.join(', ') || 'Nenhum'}
                  </span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-200 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {inspectedItem.validation.canonicalPayloadJson ||
                    '// Payload canônico não pôde ser construído devido a erro nos campos obrigatórios.'}
                </pre>
              </div>

              {/* Metadados Higienizados (Sem exposição de segredos ou PII) */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Metadados da Transação (Higienizados / Somente Leitura)
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                  {JSON.stringify(sanitizeMetadataForAudit(inspectedItem.entry.metadata), null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Operação somente leitura • Nenhuma transação pode ser editada ou excluída</span>
              <button
                type="button"
                onClick={() => setInspectedEntryId(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Fechar Inspeção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
