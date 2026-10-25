import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  X,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Hash,
  Clock,
  Coins,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Lock,
} from 'lucide-react';
import {
  financialLedger,
  LedgerEntry,
  LedgerOperationType,
  LedgerEntryStatus,
  AccountCurrency,
} from '../../services/ledgerService';

interface AuditLedgerReportProps {
  onRefreshParent?: () => void;
}

export const AuditLedgerReport: React.FC<AuditLedgerReportProps> = ({ onRefreshParent }) => {
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<LedgerOperationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<LedgerEntryStatus | 'all'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<AccountCurrency | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [idempotencySearch, setIdempotencySearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal / Drawer de Detalhes de um Lançamento
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal de Estorno Compensatório Auditado
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Toast Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Trigger para recarregar dados
  const [refreshCount, setRefreshCount] = useState(0);
  const reloadData = () => {
    setRefreshCount((c) => c + 1);
    if (onRefreshParent) onRefreshParent();
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Consulta do livro-razão com paginação e filtros reais
  const queryResult = useMemo(() => {
    return financialLedger.queryLedger({
      search: searchQuery,
      operationType: selectedOperation,
      status: selectedStatus,
      currency: selectedCurrency,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      idempotencyKey: idempotencySearch || undefined,
      page: currentPage,
      pageSize,
    });
  }, [
    searchQuery,
    selectedOperation,
    selectedStatus,
    selectedCurrency,
    startDate,
    endDate,
    idempotencySearch,
    currentPage,
    refreshCount,
  ]);

  // Verificação de Integridade Criptográfica (Hash Chain)
  const integrity = useMemo(() => {
    return financialLedger.verifyLedgerIntegrity();
  }, [refreshCount]);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Executar Estorno Compensatório
  const handleExecuteCompensatoryRefund = async () => {
    if (!selectedEntry) return;
    if (!refundReason.trim()) {
      showToast('Por favor, informe a justificativa formal para o estorno.', 'error');
      return;
    }

    setIsProcessingRefund(true);
    try {
      const refundIdempKey = `idemp_refund_${selectedEntry.id}_${Date.now()}`;
      const res = await financialLedger.processRefund({
        originalEntryId: selectedEntry.id,
        reason: refundReason.trim(),
        adminId: 'admin_audit_master',
        idempotencyKey: refundIdempKey,
      });

      showToast(`Estorno compensatório lançado com sucesso! Ref: ${res.compensatoryEntry.id}`, 'success');
      setIsRefundModalOpen(false);
      setRefundReason('');
      setSelectedEntry(null);
      reloadData();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao processar estorno.', 'error');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Download do Relatório CSV Seguro
  const handleDownloadCsv = () => {
    try {
      const csvContent = financialLedger.exportLedgerCsv({
        search: searchQuery,
        operationType: selectedOperation,
        status: selectedStatus,
        currency: selectedCurrency,
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_auditoria_jobs_ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Relatório CSV seguro exportado com proteção contra injeção de fórmulas!', 'success');
    } catch (err: any) {
      showToast('Falha ao exportar CSV: ' + (err?.message || err), 'error');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedOperation('all');
    setSelectedStatus('all');
    setSelectedCurrency('all');
    setStartDate('');
    setEndDate('');
    setIdempotencySearch('');
    setCurrentPage(1);
  };

  const formatOperationBadge = (op: LedgerOperationType) => {
    switch (op) {
      case 'CREDIT_PURCHASE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">COMPRA CRÉDITO</span>;
      case 'CONTENT_UNLOCK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800">DESBLOQUEIO</span>;
      case 'TIP_GIFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">PRESENTE LIVE</span>;
      case 'CREATOR_REVENUE_SHARE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800">70% CRIADOR</span>;
      case 'PLATFORM_COMMISSION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-400 border border-blue-800">30% JOBS</span>;
      case 'PERFORMANCE_REWARD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-400 border border-purple-800">PREMIAÇÃO DESEMP.</span>;
      case 'REFUND':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-700">ESTORNO COMPENSATÓRIO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{op}</span>;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200'
              : 'bg-blue-950/80 border-blue-500 text-blue-200'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Banner & Integrity Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#12121e] via-[#10101c] to-[#0c0c16] border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-white">Relatório de Auditoria Contábil</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              FONTE OFICIAL: ledgerService
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Registros append-only imutáveis com encadeamento criptográfico determinístico (hash chain).
            Nenhum saldo ou transação é editado diretamente; estornos e correções geram lançamentos compensatórios vinculados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={reloadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
            title="Recalcular métricas a partir do livro-razão"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            title="Exportar CSV com sanitização contra fórmula injection"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV Seguro</span>
          </button>
        </div>
      </div>

      {/* Hash Chain Integrity Badge */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
        integrity.isValid
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
          : 'bg-rose-950/50 border-rose-500 text-rose-300'
      }`}>
        <div className="flex items-center gap-2">
          {integrity.isValid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {integrity.isValid ? 'Cadeia de Hashes Criptográficos Íntegra' : 'ALERTA DE INCONSISTÊNCIA CONTÁBIL'}
            </span>
            <span className="text-[11px] text-slate-400 ml-2">
              ({integrity.checkedCount} lançamentos encadeados verificados sem quebra de imutabilidade)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
            Hash Anterior ⇄ Hash Atual
          </span>
          <span className="text-emerald-400 font-bold">100% Auditável</span>
        </div>
      </div>

      {/* Indicadores Consolidados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-slate-400">Total de Registros</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {queryResult.stats.totalEntries}
          </div>
          <div className="text-[10px] text-slate-500">Lançamentos no ledger</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-emerald-400 font-semibold">Confirmadas (Posted)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            {queryResult.stats.postedCount}
          </div>
          <div className="text-[10px] text-slate-500">Operações liquidadas</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-amber-400 font-semibold">Pendentes</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            {queryResult.stats.pendingCount}
          </div>
          <div className="text-[10px] text-slate-500">Aguardando confirmação</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-rose-400 font-semibold">Estornadas (Refunded)</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
            {queryResult.stats.refundedCount}
          </div>
          <div className="text-[10px] text-slate-500">Compensadas por estorno</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-purple-400 font-semibold">Créditos em Circulação</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">
            {financialLedger.getPlatformFinancialSummary().totalCreditsInCirculation} 💎
          </div>
          <div className="text-[10px] text-slate-500">Créditos de consumo ativos</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <div className="text-[11px] text-teal-400 font-semibold">Escrow Gateways</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-0.5">
            R$ {financialLedger.getPlatformFinancialSummary().totalFiatEscrowBrl.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[10px] text-slate-500">Valores fiduciários em BRL</div>
        </div>
      </div>

      {/* Filtros da Tabela */}
      <div className="p-4 rounded-xl bg-[#0e0e18] border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca textual por ID ou descrição */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar ID exato, descrição ou ator..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#141422] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
            />
          </div>

          {/* Chave de idempotência */}
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por Chave de Idempotência..."
              value={idempotencySearch}
              onChange={(e) => {
                setIdempotencySearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#141422] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Tipo de Operação */}
          <div>
            <select
              value={selectedOperation}
              onChange={(e) => {
                setSelectedOperation(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-[#141422] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">Todos os Tipos de Operação</option>
              <option value="CREDIT_PURCHASE">Compra de Créditos</option>
              <option value="CONTENT_UNLOCK">Desbloqueio de Mídia VIP</option>
              <option value="TIP_GIFT">Presente Virtual em Live</option>
              <option value="CREATOR_REVENUE_SHARE">Repasse Criador (70%)</option>
              <option value="PLATFORM_COMMISSION">Comissão JOBS (30%)</option>
              <option value="PERFORMANCE_REWARD">Premiação por Desempenho</option>
              <option value="REFUND">Estorno Compensatório</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-[#141422] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="posted">Confirmadas (Posted)</option>
              <option value="pending">Pendentes (Pending)</option>
              <option value="refunded">Estornadas (Refunded)</option>
              <option value="voided">Anuladas (Voided)</option>
            </select>
          </div>
        </div>

        {/* Linha 2 de filtros: datas e reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Intervalo de Datas:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#141422] border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs outline-none focus:border-rose-500"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#141422] border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs outline-none focus:border-rose-500"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>
      </div>

      {/* Tabela de Lançamentos de Auditoria */}
      <div className="rounded-xl border border-slate-800 bg-[#0d0d16] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12121e] text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID Lançamento</th>
                <th className="px-4 py-3">Data e Hora (BRT / UTC)</th>
                <th className="px-4 py-3">Operação</th>
                <th className="px-4 py-3">Valor / Moeda</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contas (Débito ➔ Crédito)</th>
                <th className="px-4 py-3">Chave Idempotência</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {queryResult.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-sans">
                    <FileCheck2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-bold text-white">Nenhum lançamento contábil encontrado</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca ou limpar os filtros.
                    </p>
                  </td>
                </tr>
              ) : (
                queryResult.entries.map((entry) => {
                  const dt = new Date(entry.timestamp);
                  const brtTime = dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                  const isCredits = entry.currency === 'CREDITS';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="px-4 py-3 text-rose-400 font-bold whitespace-nowrap">
                        {entry.id}
                      </td>

                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-[11px]">
                        <div>{brtTime}</div>
                        <div className="text-[10px] text-slate-500 font-sans">BRT (UTC-3)</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatOperationBadge(entry.operationType)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isCredits ? (
                          <span className="text-amber-400 font-bold">
                            {entry.amount} 💎 Créditos
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            R$ {entry.amount.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.status === 'posted' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            POSTED
                          </span>
                        ) : entry.status === 'refunded' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            REFUNDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            {entry.status.toUpperCase()}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-slate-400 max-w-xs truncate">
                        <span className="text-slate-300">{entry.debitAccount}</span>
                        <span className="text-rose-400 mx-1">➔</span>
                        <span className="text-slate-300">{entry.creditAccount}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-400 text-[11px] max-w-[140px] truncate">
                        {entry.idempotencyKey}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-400" />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {queryResult.totalPages > 1 && (
          <div className="p-3 bg-[#10101c] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Mostrando <strong className="text-white">{queryResult.entries.length}</strong> de{' '}
              <strong className="text-white">{queryResult.totalCount}</strong> lançamentos filtrados
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="font-mono text-slate-300 px-2">
                Página {queryResult.currentPage} de {queryResult.totalPages}
              </span>

              <button
                disabled={currentPage >= queryResult.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(queryResult.totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER / MODAL DE DETALHES DE UM LANÇAMENTO CONTÁBIL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#0f0f1a] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#141422] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-rose-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Dossiê de Auditoria do Lançamento</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedEntry.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status and Action banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Status do Registro:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {formatOperationBadge(selectedEntry.operationType)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {selectedEntry.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedEntry.status === 'posted' && (
                  <button
                    onClick={() => setIsRefundModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Emitir Estorno Compensatório</span>
                  </button>
                )}
              </div>

              {/* Grid of properties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#121220] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Valor e Moeda</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {selectedEntry.currency === 'CREDITS'
                      ? `${selectedEntry.amount} 💎 Créditos Virtuais`
                      : `R$ ${selectedEntry.amount.toFixed(2).replace('.', ',')} BRL`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121220] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Data e Hora (Fuso Horário)</span>
                  <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                    {new Date(selectedEntry.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (BRT)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    ISO: {selectedEntry.timestamp}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121220] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Conta Débito</span>
                  <span className="text-xs font-mono text-rose-300 font-bold mt-0.5 block break-all">
                    {selectedEntry.debitAccount}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121220] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Conta Crédito</span>
                  <span className="text-xs font-mono text-emerald-300 font-bold mt-0.5 block break-all">
                    {selectedEntry.creditAccount}
                  </span>
                </div>
              </div>

              {/* Idempotency Key & Actor */}
              <div className="p-3.5 rounded-xl bg-[#121220] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Chave de Idempotência:</span>
                  <button
                    onClick={() => copyToClipboard(selectedEntry.idempotencyKey, 'idemp')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-sans"
                  >
                    {copiedKey === 'idemp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'idemp' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-black/60 font-mono text-slate-200 text-xs break-all">
                  {selectedEntry.idempotencyKey}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Ator Responsável (Mascarado):</span>
                    <span className="text-slate-300 font-mono">{selectedEntry.actorId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Referência da Operação:</span>
                    <span className="text-slate-300 font-mono">{selectedEntry.referenceId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Descrição & Regra Contábil Aplicada */}
              <div className="p-3.5 rounded-xl bg-[#121220] border border-slate-800 space-y-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                  Regra Contábil & Descrição Oficial:
                </span>
                <p className="text-xs text-slate-200">{selectedEntry.description}</p>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-[11px] text-slate-400">
                  <strong>Contrato Contábil:</strong> {
                    selectedEntry.operationType === 'CONTENT_UNLOCK' || selectedEntry.operationType === 'TIP_GIFT'
                      ? 'Divisão Comercial 70/30 (70% repasse líquido do criador em BRL, 30% comissão oficial JOBS)'
                      : selectedEntry.operationType === 'PERFORMANCE_REWARD'
                      ? 'Premiação por Desempenho com regra versionada financiada pelo Pool de Marketing'
                      : selectedEntry.operationType === 'REFUND'
                      ? 'Lançamento compensatório reverso que anula o saldo contábil sem apagar a transação original'
                      : 'Emissão de créditos virtuais intransferíveis para uso interno'
                  }
                </div>
              </div>

              {/* Hash Chain Cryptographic Integrity */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assinatura Criptográfica Encadeada (Imutabilidade Append-Only):</span>
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-500">previousHash: </span>
                    <span className="text-slate-400 break-all">{selectedEntry.previousHash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">entryHash: </span>
                    <span className="text-emerald-400 font-bold break-all">{selectedEntry.entryHash}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#141422] flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESTORNO COMPENSATÓRIO AUDITADO */}
      {isRefundModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#12121f] border border-rose-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Confirmação de Estorno Compensatório</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Em conformidade com as regras de imutabilidade, o lançamento original <strong>{selectedEntry.id}</strong>{' '}
              <strong>NÃO será apagado</strong>. Um lançamento de estorno inverso será registrado no livro-razão e
              vinculado ao registro anterior.
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400">Lançamento a Estornar: <strong className="text-white">{selectedEntry.id}</strong></div>
              <div className="text-slate-400">Valor a Reverter: <strong className="text-amber-400">{selectedEntry.amount} {selectedEntry.currency}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Justificativa Formal para Auditoria (Obrigatório):
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Contestação autorizada por operador de testes ou duplicidade em sandbox..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-[#181828] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                disabled={isProcessingRefund}
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isProcessingRefund || !refundReason.trim()}
                onClick={handleExecuteCompensatoryRefund}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/60 cursor-pointer flex items-center gap-2"
              >
                {isProcessingRefund ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirmar Estorno Auditado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
