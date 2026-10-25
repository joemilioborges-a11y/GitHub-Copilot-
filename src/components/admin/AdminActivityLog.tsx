import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Hash,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Lock,
  Layers,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import {
  adminAuditService,
  AdminActivityEvent,
  AdminActionType,
  AdminActionResult,
  ChainVerificationResult,
} from '../../services/adminAuditService';

interface AdminActivityLogProps {
  onRefreshParent?: () => void;
}

export const AdminActivityLog: React.FC<AdminActivityLogProps> = ({ onRefreshParent }) => {
  // Filtros de busca e segmentação
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<AdminActionType | 'all'>('all');
  const [selectedResult, setSelectedResult] = useState<AdminActionResult | 'all'>('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState<'all' | 'production' | 'staging' | 'sandbox'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Exibição de Data e Hora: Alternância entre Horário Local e UTC
  const [showUtcTime, setShowUtcTime] = useState(false);

  // Modal / Drawer de Detalhes Canônicos do Evento
  const [selectedEvent, setSelectedEvent] = useState<AdminActivityEvent | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Trigger para recarregar dados
  const [refreshKey, setRefreshKey] = useState(0);
  const handleReload = () => {
    setRefreshKey((k) => k + 1);
    if (onRefreshParent) onRefreshParent();
    showToast('Trilha de auditoria recarregada.');
  };

  // Verificação de Integridade Criptográfica da Cadeia SHA-256
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult>(() =>
    adminAuditService.getLastVerification()
  );

  const handleRunVerification = async () => {
    setIsVerifying(true);
    // Simula ligeiro delay perceptível para evidência de verificação em lote
    setTimeout(() => {
      const result = adminAuditService.verifyChainIntegrity();
      setVerificationResult(result);
      setIsVerifying(false);
      if (result.isValid) {
        showToast(`Cadeia 100% íntegra: ${result.verifiedCount} blocos SHA-256 verificados com sucesso.`, 'success');
      } else {
        showToast(`ALERTA: Violação detectada no evento ${result.brokenEventId}!`, 'error');
      }
    }, 400);
  };

  // Lista de atores disponíveis para o select de filtro
  const distinctActors = useMemo(() => adminAuditService.getDistinctActors(), [refreshKey]);

  // Consulta paginada dos eventos
  const queryData = useMemo(() => {
    return adminAuditService.queryEvents({
      search: searchQuery,
      actorId: selectedActor,
      action: selectedAction,
      result: selectedResult,
      environment: selectedEnvironment,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: currentPage,
      pageSize,
    });
  }, [
    searchQuery,
    selectedActor,
    selectedAction,
    selectedResult,
    selectedEnvironment,
    startDate,
    endDate,
    currentPage,
    pageSize,
    refreshKey,
  ]);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('Hash copiado para a área de transferência.');
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      if (showUtcTime) {
        return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      }
      return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' BRT';
    } catch {
      return iso;
    }
  };

  // Badges e Estilos Visuais
  const getActionBadge = (action: AdminActionType) => {
    switch (action) {
      case 'BALANCE_ADJUSTMENT':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'CONFIG_CHANGE':
        return 'bg-purple-950/70 text-purple-300 border-purple-500/40';
      case 'SANDBOX_TOGGLE':
        return 'bg-sky-950/70 text-sky-300 border-sky-500/40';
      case 'PAYOUT_APPROVE':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'PAYOUT_RELEASE':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40';
      case 'PAYOUT_CANCEL':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40';
      case 'REFUND_EXECUTE':
        return 'bg-orange-950/70 text-orange-300 border-orange-500/40';
      case 'PERMISSIONS_CHANGE':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40';
      case 'LEDGER_OPERATION':
        return 'bg-teal-950/70 text-teal-300 border-teal-500/40';
      case 'ACCESS_DENIED':
        return 'bg-rose-950/80 text-rose-400 border-rose-500/50';
      case 'FINANCIAL_FAILURE':
        return 'bg-red-950/80 text-red-400 border-red-500/50';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getResultBadge = (result: AdminActionResult) => {
    switch (result) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          label: 'Sucesso',
          className: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
        };
      case 'denied':
        return {
          icon: <ShieldAlert className="w-3 h-3 text-rose-400" />,
          label: 'Negado',
          className: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
        };
      case 'failure':
        return {
          icon: <AlertTriangle className="w-3 h-3 text-red-400" />,
          label: 'Falha',
          className: 'bg-red-950/80 text-red-300 border-red-500/50',
        };
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md animate-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/50'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header do Módulo com Indicador Criptográfico Global */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-950 to-slate-900 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <FileCheck2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Log de Atividades do Administrador
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 font-bold border border-rose-500/20">
                  SHA-256 HASH CHAIN
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  READ-ONLY AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Trilha persistente, verificável e resistente a adulterações. Rastreamento canônico de ações administrativas e financeiras.
              </p>
            </div>
          </div>

          {/* Card de Integridade Criptográfica da Cadeia */}
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                verificationResult.isValid
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-rose-950/40 border-rose-500/60 ring-2 ring-rose-500/30'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  verificationResult.isValid ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/50 text-rose-400'
                }`}
              >
                {verificationResult.isValid ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {verificationResult.isValid ? 'Cadeia 100% Verificada' : 'DIVERGÊNCIA DETECTADA'}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                      verificationResult.isValid
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/30 text-rose-300 animate-pulse'
                    }`}
                  >
                    {verificationResult.isValid ? 'Íntegra' : 'Corrompida'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {verificationResult.verifiedCount} de {verificationResult.totalEvents} blocos verificados
                </span>
              </div>

              <button
                type="button"
                onClick={handleRunVerification}
                disabled={isVerifying}
                className="ml-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Executar verificação criptográfica completa sob demanda"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-rose-400' : 'text-slate-400'}`} />
                <span>{isVerifying ? 'Verificando...' : 'Verificar Cadeia'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alerta de Divergência se a cadeia for violada */}
        {!verificationResult.isValid && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/70 text-xs text-rose-200 space-y-1.5 shadow-lg shadow-rose-950/50">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>ALERTA DE SEGURANÇA: Quebra de Integridade na Trilha de Auditoria</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed">
              {verificationResult.errorReason || 'Inconsistência de hash detectada na cadeia encadeada.'}
            </p>
            <span className="text-[10px] text-rose-300 block">
              Evento com problema: <code className="bg-rose-900/60 px-1 py-0.5 rounded">{verificationResult.brokenEventId}</code>
            </span>
          </div>
        )}

        {/* Barra de Filtros e Busca Multicritério */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Busca por Texto / ID / Correlation / Reason */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ID, recurso, hash ou justificativa..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-9 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 p-0.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Administrador */}
            <div>
              <select
                value={selectedActor}
                onChange={(e) => {
                  setSelectedActor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Administrador: Todos</option>
                {distinctActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Ação */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Ação: Todas as Categorias</option>
                <option value="BALANCE_ADJUSTMENT">Ajustes Manuais de Saldo</option>
                <option value="CONFIG_CHANGE">Configurações Financeiras</option>
                <option value="SANDBOX_TOGGLE">Ambiente / Modo Teste</option>
                <option value="PAYOUT_APPROVE">Aprovação de Payout</option>
                <option value="PAYOUT_RELEASE">Liquidação de Payout</option>
                <option value="PAYOUT_CANCEL">Cancelamento de Payout</option>
                <option value="REFUND_EXECUTE">Estornos & Compensações</option>
                <option value="LEDGER_OPERATION">Operações no Livro-Razão</option>
                <option value="PERMISSIONS_CHANGE">Permissões de Acesso</option>
                <option value="ACCESS_DENIED">Tentativas Negadas (Segurança)</option>
                <option value="FINANCIAL_FAILURE">Falhas Financeiras</option>
              </select>
            </div>

            {/* Filtro por Resultado */}
            <div>
              <select
                value={selectedResult}
                onChange={(e) => {
                  setSelectedResult(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Resultado: Todos</option>
                <option value="success">Apenas Sucesso</option>
                <option value="denied">Apenas Negadas (Tentativas Bloqueadas)</option>
                <option value="failure">Apenas Falhas</option>
              </select>
            </div>
          </div>

          {/* Segunda linha de controles: Ambiente, Período e Formato de Horário */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Ambiente */}
              <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
                {[
                  { id: 'all', label: 'Todos Ambientes' },
                  { id: 'sandbox', label: 'Sandbox' },
                  { id: 'production', label: 'Produção' },
                ].map((env) => (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => {
                      setSelectedEnvironment(env.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedEnvironment === env.id
                        ? 'bg-rose-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>

              {/* Toggle Formato de Horário (Local BRT vs UTC) */}
              <button
                type="button"
                onClick={() => setShowUtcTime(!showUtcTime)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showUtcTime
                    ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Alternar entre fuso local e UTC universal"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{showUtcTime ? 'Exibindo: UTC Universal' : 'Exibindo: Horário de Brasília'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReload}
                className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Recarregar trilha"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Eventos de Auditoria */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Eventos Canônicos de Auditoria</span>
            <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-rose-300 border border-slate-800">
              {queryData.total} evento(s) encontrado(s)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Encadeamento: SHA-256 (64 hex) · Previous Event Binding
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="bg-[#121222] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-40">Data & Hora</th>
                <th className="py-3 px-3 w-36">Administrador</th>
                <th className="py-3 px-3 w-44">Ação Sensível</th>
                <th className="py-3 px-3">Recurso & Justificativa</th>
                <th className="py-3 px-3 w-24">Resultado</th>
                <th className="py-3 px-3 w-24">Ambiente</th>
                <th className="py-3 px-3 w-32">Hash do Bloco</th>
                <th className="py-3 px-3 text-center w-20">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
              {queryData.events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Search className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-white text-xs font-bold">Nenhum evento localizado</p>
                      <p className="text-[11px] text-slate-400">
                        Nenhum registro de auditoria corresponde aos filtros ou à pesquisa informada.
                      </p>
                      {(searchQuery || selectedActor !== 'all' || selectedAction !== 'all' || selectedResult !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedActor('all');
                            setSelectedAction('all');
                            setSelectedResult('all');
                            setSelectedEnvironment('all');
                          }}
                          className="mt-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Resetar Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                queryData.events.map((ev, index) => {
                  const resInfo = getResultBadge(ev.result);
                  return (
                    <tr
                      key={ev.eventId}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Índice */}
                      <td className="py-3 px-3 text-center text-slate-500 text-[10px]">
                        {(queryData.page - 1) * queryData.pageSize + index + 1}
                      </td>

                      {/* Data & Hora */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                        {formatTimestamp(ev.timestamp)}
                      </td>

                      {/* Administrador / Ator */}
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            {ev.actorId}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            Cargo: {ev.actorRole}
                          </span>
                        </div>
                      </td>

                      {/* Ação Sensível */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(
                            ev.action
                          )}`}
                        >
                          {ev.action}
                        </span>
                      </td>

                      {/* Recurso e Justificativa */}
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-col max-w-md">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                            <span className="text-slate-500">{ev.targetType}:</span>
                            <span className="text-amber-300">{ev.targetId}</span>
                          </div>
                          <span className="text-xs text-slate-200 line-clamp-1 mt-0.5" title={ev.reason}>
                            {ev.reason}
                          </span>
                        </div>
                      </td>

                      {/* Resultado */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${resInfo.className}`}
                        >
                          {resInfo.icon}
                          <span>{resInfo.label}</span>
                        </span>
                      </td>

                      {/* Ambiente */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ev.environment === 'production'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {ev.environment}
                        </span>
                      </td>

                      {/* Hash Resumido */}
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ev.eventHash, ev.eventId)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group/hash"
                          title="Clique para copiar o SHA-256 completo do evento"
                        >
                          <Hash className="w-2.5 h-2.5 text-slate-500 group-hover/hash:text-rose-400" />
                          <span>{ev.eventHash.substring(0, 10)}...</span>
                          {copiedKey === ev.eventId ? (
                            <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-600 opacity-60 group-hover/hash:opacity-100 ml-0.5" />
                          )}
                        </button>
                      </td>

                      {/* Ações / Dossiê */}
                      <td className="py-3 px-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Examinar metadados canônicos e encadeamento"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 gap-3">
          <div className="flex items-center gap-3">
            <span>
              Exibindo {queryData.total === 0 ? 0 : (queryData.page - 1) * queryData.pageSize + 1} a{' '}
              {Math.min(queryData.page * queryData.pageSize, queryData.total)} de {queryData.total} evento(s)
            </span>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500">Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {queryData.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={queryData.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: queryData.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-6 h-6 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    queryData.page === pageNum
                      ? 'bg-rose-600 text-white font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={queryData.page >= queryData.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(queryData.totalPages, p + 1))}
                className="p-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: DOSSIÊ CRIPTOGRÁFICO DO EVENTO (DETALHES CANÔNICOS) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0c0c16] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#121222]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Dossiê Criptográfico do Evento
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedEvent.eventId}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Registrado em: {formatTimestamp(selectedEvent.timestamp)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Quadro Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Administrador</span>
                  <p className="text-white font-bold">{selectedEvent.actorId}</p>
                  <span className="text-[10px] text-slate-400">Papel: {selectedEvent.actorRole}</span>
                </div>
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Ação & Resultado</span>
                  <p className="text-rose-300 font-bold">{selectedEvent.action}</p>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      selectedEvent.result === 'success'
                        ? 'bg-emerald-950 text-emerald-400'
                        : selectedEvent.result === 'denied'
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {selectedEvent.result}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Recurso Afetado</span>
                  <p className="text-white font-mono truncate">{selectedEvent.targetId}</p>
                  <span className="text-[10px] text-slate-400">Tipo: {selectedEvent.targetType}</span>
                </div>
              </div>

              {/* Justificativa Administrativa */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Justificativa Formal (Motivo)</span>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedEvent.reason}</p>
                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  Correlation ID: <span className="text-slate-400">{selectedEvent.correlationId}</span>
                </div>
              </div>

              {/* Encadeamento Criptográfico SHA-256 */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Provas Criptográficas da Hash Chain
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    FIPS 180-4 SHA-256
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Hash do Evento Anterior (previousEventHash):</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 break-all select-all flex items-center justify-between">
                      <span>{selectedEvent.previousEventHash}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedEvent.previousEventHash, 'prevHash')}
                        className="text-slate-500 hover:text-white ml-2 cursor-pointer"
                        title="Copiar"
                      >
                        {copiedKey === 'prevHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Hash deste Evento (eventHash):</span>
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 break-all select-all flex items-center justify-between font-bold">
                      <span>{selectedEvent.eventHash}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedEvent.eventHash, 'evHash')}
                        className="text-rose-400 hover:text-white ml-2 cursor-pointer"
                        title="Copiar"
                      >
                        {copiedKey === 'evHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {selectedEvent.beforeHash && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Before State Hash:</span>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px] truncate">
                          {selectedEvent.beforeHash}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">After State Hash:</span>
                        <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] truncate">
                          {selectedEvent.afterHash}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadados Autorizados Sanitizados */}
              {selectedEvent.metadata && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Metadados Autorizados (Sanitizados)</span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[10px] overflow-x-auto max-h-40">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#121222] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[10px]">
                Versão do Esquema: {selectedEvent.schemaVersion} · Sem Segredos Expostos
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
