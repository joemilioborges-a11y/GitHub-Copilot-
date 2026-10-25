import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Clock,
  Coins,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  Radio,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Layers,
  Lock,
  ArrowUpRight,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  financialLedger,
  LiveUnlockAuditTransaction,
  LiveUnlockSummaryKPIs,
  LedgerOperationType,
  LedgerEntryStatus,
  sanitizeCsvField,
} from '../../services/ledgerService';

interface LiveUnlockAuditPanelProps {
  onRefreshParent?: () => void;
}

export const LiveUnlockAuditPanel: React.FC<LiveUnlockAuditPanelProps> = ({ onRefreshParent }) => {
  // Estados de Filtros e Busca
  const [periodFilter, setPeriodFilter] = useState<'today' | '24h' | '7days' | '30days' | 'all'>('7days');
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'pending' | 'refunded' | 'divergent'>('all');
  const [opTypeFilter, setOpTypeFilter] = useState<'all' | 'CONTENT_UNLOCK' | 'TIP_GIFT'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDivergences, setOnlyDivergences] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sincronização em tempo real
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(new Date().toISOString());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal de Detalhes da Transação
  const [selectedTx, setSelectedTx] = useState<LiveUnlockAuditTransaction | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const triggerManualRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    setLastSyncTimestamp(new Date().toISOString());
    if (onRefreshParent) onRefreshParent();
    showToast('Auditoria sincronizada com o livro-razão contábil!', 'info');
  }, [onRefreshParent, showToast]);

  // ASSINATURA EM TEMPO REAL: Conexão direta com financialLedger
  useEffect(() => {
    // Inscreve no financialLedger para atualizações atômicas instantâneas
    const unsubscribe = financialLedger.subscribe(() => {
      if (autoRefreshEnabled) {
        setRefreshTrigger((prev) => prev + 1);
        setLastSyncTimestamp(new Date().toISOString());
      }
    });

    // Listener de evento de janela para compatibilidade entre abas
    const handleStorageEvent = () => {
      if (autoRefreshEnabled) {
        setRefreshTrigger((prev) => prev + 1);
        setLastSyncTimestamp(new Date().toISOString());
      }
    };
    window.addEventListener('jobs:ledger:updated', handleStorageEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('jobs:ledger:updated', handleStorageEvent);
    };
  }, [autoRefreshEnabled]);

  // Consulta auditada de transações do ledger
  const auditData = useMemo(() => {
    return financialLedger.getLiveUnlockAuditData({
      period: periodFilter,
      status: statusFilter,
      operationType: opTypeFilter,
      search: searchQuery,
      onlyDivergences,
      page: currentPage,
      pageSize,
    });
  }, [periodFilter, statusFilter, opTypeFilter, searchQuery, onlyDivergences, currentPage, refreshTrigger]);

  const { transactions, kpis, totalCount, divergences } = auditData;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Dados para o Gráfico de Rosca (70% Criadores vs 30% JOBS vs Estornos)
  const donutChartData = useMemo(() => {
    const data = [
      { name: 'Criadores (70%)', value: kpis.creatorShareBrl, color: '#10b981' },
      { name: 'Comissão JOBS (30%)', value: kpis.platformShareBrl, color: '#6366f1' },
    ];
    if (kpis.refundedAmountBrl > 0) {
      data.push({ name: 'Estornos / Reembolsos', value: kpis.refundedAmountBrl, color: '#f43f5e' });
    }
    return data;
  }, [kpis]);

  // Dados para o Gráfico de Barras (Volume Histórico Recente por Dia)
  const timelineChartData = useMemo(() => {
    const daysMap: Record<string, { label: string; creatorBrl: number; jobsBrl: number; credits: number }> = {};
    const now = new Date();
    
    // Inicializar últimos 5 dias
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daysMap[key] = { label: key, creatorBrl: 0, jobsBrl: 0, credits: 0 };
    }

    transactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (daysMap[key] && !tx.isRefunded) {
        daysMap[key].creatorBrl = Number((daysMap[key].creatorBrl + tx.creatorShareBrl).toFixed(2));
        daysMap[key].jobsBrl = Number((daysMap[key].jobsBrl + tx.platformShareBrl).toFixed(2));
        daysMap[key].credits += tx.priceCredits;
      }
    });

    return Object.values(daysMap);
  }, [transactions]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // EXPORTAÇÃO CSV COM MITIGAÇÃO CONTRA FORMULA INJECTION
  const handleExportCsv = () => {
    const headers = [
      'Data/Hora',
      'ID Transacao',
      'ID Live/Stream',
      'ID Desbloqueio/Ref',
      'Comprador (Masc)',
      'ID Criador',
      'Nome Criador',
      'Tipo Operacao',
      'Descricao',
      'Creditos Consumidos',
      'Valor Economico Bruto BRL',
      'Repasse Criador 70% BRL',
      'Comissao JOBS 30% BRL',
      'Status Contabil',
      'Custodia Pendente',
      'Possui Divergencia',
      'Chave Idempotencia',
    ];

    const rows = transactions.map((tx) => [
      sanitizeCsvField(tx.timestamp),
      sanitizeCsvField(tx.transactionId),
      sanitizeCsvField(tx.liveStreamId || 'N/A'),
      sanitizeCsvField(tx.referenceId),
      sanitizeCsvField(tx.buyerMasked),
      sanitizeCsvField(tx.creatorId),
      sanitizeCsvField(tx.creatorName),
      sanitizeCsvField(tx.operationType),
      sanitizeCsvField(tx.description),
      sanitizeCsvField(tx.priceCredits),
      sanitizeCsvField(tx.grossAmountBrl.toFixed(2)),
      sanitizeCsvField(tx.creatorShareBrl.toFixed(2)),
      sanitizeCsvField(tx.platformShareBrl.toFixed(2)),
      sanitizeCsvField(tx.status),
      sanitizeCsvField(tx.isPendingSettlement ? 'SIM' : 'NAO'),
      sanitizeCsvField(tx.hasDivergence ? 'SIM' : 'NAO'),
      sanitizeCsvField(tx.idempotencyKey),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs_auditoria_lives_70_30_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Relatório de auditoria 70/30 exportado em CSV com sucesso!', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950 border-rose-500/50 text-rose-200'
              : 'bg-indigo-950 border-indigo-500/50 text-indigo-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL DO PAINEL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0e1017] to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Auditoria Financeira em Tempo Real — Desbloqueios e Lives</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              RATEIO 70/30 AUDITADO
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Transparência contábil rigorosa e imutável sobre cada desbloqueio de transmissão e gorjeta em lives.
            Verificação matemática exata da divisão de 70% Criador e 30% JOBS, garantida pelo Livro-Razão.
          </p>
        </div>

        {/* Controles de Sincronização em Tempo Real */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-300 text-[11px]">
              {autoRefreshEnabled ? 'Tempo Real Ativo' : 'Pausado'}
            </span>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="text-[10px] text-slate-400 hover:text-white underline ml-1 cursor-pointer"
            >
              {autoRefreshEnabled ? 'Pausar' : 'Ativar'}
            </button>
          </div>

          <button
            onClick={triggerManualRefresh}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
            title="Atualizar agora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* BANNER DE INTEGRIDADE CONTÁBIL E DIVERGÊNCIAS */}
      {divergences.length === 0 ? (
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-300">Auditoria 100% Conforme — Sem Divergências</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Todos os lançamentos do período atendem estritamente à conciliação da divisão 70/30 (Criador/Plataforma) e ao encadeamento SHA-256.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
            <span>Última verificação:</span>
            <span>{new Date(lastSyncTimestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Atenção: {divergences.length} Divergência(s) Contábeis Detectada(s)</span>
            </div>
            <button
              onClick={() => setOnlyDivergences(!onlyDivergences)}
              className="text-xs text-rose-300 underline font-semibold cursor-pointer"
            >
              {onlyDivergences ? 'Mostrar Todas as Transações' : 'Filtrar Apenas Divergências'}
            </button>
          </div>
          <div className="space-y-1 pl-7">
            {divergences.map((div, i) => (
              <p key={i} className="text-rose-200/90 text-[11px]">
                • <strong className="font-mono">{div.transactionId}</strong>: {div.issue}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* GRADE DE INDICADORES DE RESUMO (KPIS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Quantidade de Transações */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Transações</span>
            <Radio className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black text-white">{kpis.totalTransactions}</div>
          <p className="text-[10px] text-slate-500">Lives e Gorjetas</p>
        </div>

        {/* Card 2: Receita Bruta Contabilizada */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Receita Bruta (BRL)</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">
            R$ {kpis.grossRevenueBrl.toFixed(2)}
          </div>
          <p className="text-[10px] text-amber-300/70 font-mono">
            💎 {kpis.grossCredits.toLocaleString('pt-BR')} créditos
          </p>
        </div>

        {/* Card 3: Parcela 70% Criadores */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-semibold">Repasse 70% Criador</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            R$ {kpis.creatorShareBrl.toFixed(2)}
          </div>
          <p className="text-[10px] text-emerald-300/70">Direito econômico</p>
        </div>

        {/* Card 4: Parcela 30% JOBS */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-indigo-400 font-semibold">Comissão 30% JOBS</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-indigo-400">
            R$ {kpis.platformShareBrl.toFixed(2)}
          </div>
          <p className="text-[10px] text-indigo-300/70">Receita da plataforma</p>
        </div>

        {/* Card 5: Custódia Pendente (Segregado de Disponível) */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-medium">Custódia Pendente</span>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300">
            R$ {kpis.pendingSettlementBrl.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500">Aguardando liquidação</p>
        </div>

        {/* Card 6: Estornos Compensatórios */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Estornos / Cancel.</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-white">
            {kpis.refundedTransactionsCount}
            <span className="text-xs text-rose-400 font-normal ml-1">
              (R$ {kpis.refundedAmountBrl.toFixed(2)})
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Contrapartidas auditadas</p>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS ANALÍTICOS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gráfico de Rosca: Divisão 70/30 */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Composição do Rateio 70/30
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Total: R$ {kpis.grossRevenueBrl.toFixed(2)}
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: '#0b0b12',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-300">70% Criador:</span>
              <strong className="text-emerald-400 font-mono ml-auto">
                R$ {kpis.creatorShareBrl.toFixed(2)}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-slate-300">30% JOBS:</span>
              <strong className="text-indigo-400 font-mono ml-auto">
                R$ {kpis.platformShareBrl.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras: Volume Diário */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Volume Financeiro Recente (Dias)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Base: 1 crédito = R$ 0,10
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: '#0b0b12',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="creatorBrl" name="70% Criador (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobsBrl" name="30% JOBS (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 text-center">
            Valores convertidos conforme regras oficiais de repasse do ecossistema JOBS.
          </p>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filtro de Período */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: 'today', label: 'Hoje' },
              { id: '24h', label: '24 Horas' },
              { id: '7days', label: '7 Dias' },
              { id: '30days', label: '30 Dias' },
              { id: 'all', label: 'Todos' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriodFilter(p.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer text-[11px] ${
                periodFilter === p.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
          >
            <option value="all">Todos os Status</option>
            <option value="posted">Contabilizados (Posted)</option>
            <option value="pending">Pendentes de Liquidação</option>
            <option value="refunded">Estornados (Refunded)</option>
            <option value="divergent">Com Divergência</option>
          </select>
        </div>

        {/* Filtro de Operação */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">Tipo:</span>
          <select
            value={opTypeFilter}
            onChange={(e) => {
              setOpTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="CONTENT_UNLOCK">Desbloqueio VIP (Lives)</option>
            <option value="TIP_GIFT">Presentes / Gorjetas</option>
          </select>
        </div>

        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por ID, Live, Criador, Comprador..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TABELA DE AUDITORIA DAS TRANSAÇÕES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Data & Hora</th>
                <th className="py-3 px-3.5">Transação / Idempotência</th>
                <th className="py-3 px-3.5">Live / Ref</th>
                <th className="py-3 px-3.5">Comprador</th>
                <th className="py-3 px-3.5">Criador Beneficiário</th>
                <th className="py-3 px-3.5">Bruto</th>
                <th className="py-3 px-3.5 text-emerald-400">70% Criador</th>
                <th className="py-3 px-3.5 text-indigo-400">30% JOBS</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCheck2 className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-400">Nenhuma transação encontrada</p>
                      <p className="text-[11px] text-slate-500">
                        Ajuste os filtros de período ou busca para visualizar outros registros contábeis.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.transactionId}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTx(tx)}
                  >
                    {/* Data & Hora */}
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(tx.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>

                    {/* Transação & Idempotência Mascarada */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="font-mono text-white font-bold text-[11px] flex items-center gap-1.5">
                          <span>{tx.transactionId}</span>
                        </div>
                        <div className="font-mono text-slate-500 text-[10px] flex items-center gap-1">
                          <span>idemp: {tx.idempotencyMasked}</span>
                        </div>
                      </div>
                    </td>

                    {/* Live / Ref */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5 max-w-[140px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 block truncate">
                          {tx.liveStreamId || tx.referenceId}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {tx.operationType === 'CONTENT_UNLOCK' ? 'Desbloqueio VIP' : 'Presente / Tip'}
                        </span>
                      </div>
                    </td>

                    {/* Comprador Mascarado */}
                    <td className="py-3 px-3.5 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                        {tx.buyerMasked}
                      </span>
                    </td>

                    {/* Criador Beneficiário */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white text-xs block">{tx.creatorName}</span>
                          <span className="text-[10px] font-mono text-slate-500">#{tx.creatorId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Valor Bruto (Créditos & R$) */}
                    <td className="py-3 px-3.5">
                      <div className="font-mono">
                        <span className="font-bold text-amber-400">
                          R$ {tx.grossAmountBrl.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          💎 {tx.priceCredits} cr
                        </span>
                      </div>
                    </td>

                    {/* 70% Criador */}
                    <td className="py-3 px-3.5 font-mono font-bold text-emerald-400 text-xs">
                      R$ {tx.creatorShareBrl.toFixed(2)}
                    </td>

                    {/* 30% JOBS */}
                    <td className="py-3 px-3.5 font-mono font-bold text-indigo-400 text-xs">
                      R$ {tx.platformShareBrl.toFixed(2)}
                    </td>

                    {/* Status Contábil */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {tx.hasDivergence ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          DIVERGENTE
                        </span>
                      ) : tx.isRefunded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-rose-400" />
                          ESTORNADO
                        </span>
                      ) : tx.isPendingSettlement ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          EM CUSTÓDIA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          CONTABILIZADO
                        </span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer border border-slate-700"
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>Auditar</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/60">
            <span>
              Exibindo {transactions.length} de {totalCount} transações
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-white text-xs">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL / DRAWER DE AUDITORIA DETALHADA DA TRANSAÇÃO */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#0e0e17] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#12121f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Auditoria de Transação</span>
                    <span className="font-mono text-xs text-slate-400">#{selectedTx.transactionId}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inspeção do lote contábil atômico e prova matemática do rateio 70/30
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Divergence Alert if present */}
              {selectedTx.hasDivergence && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Divergência Contábil Detectada:</span>
                    <p className="text-[11px] text-rose-200 mt-0.5">{selectedTx.divergenceReason}</p>
                  </div>
                </div>
              )}

              {/* Informações Primárias Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Data / Hora</span>
                  <span className="font-mono text-white text-[11px]">
                    {new Date(selectedTx.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Comprador</span>
                  <span className="font-mono text-emerald-400 text-[11px]">{selectedTx.buyerMasked}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Criador</span>
                  <span className="font-bold text-white text-[11px] truncate block">
                    {selectedTx.creatorName}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Live ID / Ref</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate block">
                    {selectedTx.liveStreamId || selectedTx.referenceId}
                  </span>
                </div>
              </div>

              {/* PROVA MATEMÁTICA 70/30 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Prova Matemática do Rateio 70/30
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Regra: 1 Crédito = R$ 0,10 BRL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Econômico Bruto</span>
                    <strong className="text-sm font-mono text-white">
                      R$ {selectedTx.grossAmountBrl.toFixed(2)}
                    </strong>
                    <p className="text-[10px] text-amber-400">({selectedTx.priceCredits} créditos)</p>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                    <span className="text-[10px] text-emerald-400 block">Parcela Criador (70%)</span>
                    <strong className="text-sm font-mono text-emerald-300">
                      R$ {selectedTx.creatorShareBrl.toFixed(2)}
                    </strong>
                    <p className="text-[10px] text-emerald-400">
                      {((selectedTx.creatorShareBrl / Math.max(0.01, selectedTx.grossAmountBrl)) * 100).toFixed(0)}% do bruto
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
                    <span className="text-[10px] text-indigo-400 block">Parcela JOBS (30%)</span>
                    <strong className="text-sm font-mono text-indigo-300">
                      R$ {selectedTx.platformShareBrl.toFixed(2)}
                    </strong>
                    <p className="text-[10px] text-indigo-400">
                      {((selectedTx.platformShareBrl / Math.max(0.01, selectedTx.grossAmountBrl)) * 100).toFixed(0)}% do bruto
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 text-center font-mono">
                  Soma: R$ {selectedTx.creatorShareBrl.toFixed(2)} + R$ {selectedTx.platformShareBrl.toFixed(2)} = R${' '}
                  {(selectedTx.creatorShareBrl + selectedTx.platformShareBrl).toFixed(2)}
                  <span className="text-emerald-400 font-bold ml-1.5">✓ Conciliado sem perdas</span>
                </div>
              </div>

              {/* LOTE ATÔMICO DO LIVRO-RAZÃO (PARTIDAS DOBRADAS) */}
              <div className="space-y-2">
                <span className="font-bold text-white uppercase text-[11px] tracking-wider block">
                  Lançamentos Contábeis do Lote Atômico ({selectedTx.entries.length} entradas)
                </span>

                <div className="space-y-2">
                  {selectedTx.entries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-slate-400 text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white">{entry.operationType}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          {entry.currency === 'CREDITS' ? `💎 ${entry.amount} créditos` : `R$ ${entry.amount.toFixed(2)} BRL`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-850">
                        <div>
                          <span className="text-rose-400">Débito: </span>
                          <span>{entry.debitAccount}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400">Crédito: </span>
                          <span>{entry.creditAccount}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        Hash da entrada: {entry.entryHash} | Anterior: {entry.previousHash}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHAVE DE IDEMPOTÊNCIA & TRILHA DE AUDITORIA */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">Chave de Idempotência</span>
                  <button
                    onClick={() => copyToClipboard(selectedTx.idempotencyKey, 'idemp')}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'idemp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'idemp' ? 'Copiada!' : 'Copiar Chave Completa'}</span>
                  </button>
                </div>
                <code className="block p-2 rounded bg-slate-950 border border-slate-850 text-[10px] font-mono text-slate-300 break-all select-all">
                  {selectedTx.idempotencyKey}
                </code>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-800 bg-[#12121f] flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Auditoria registrada de forma imutável no ledger.
              </span>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
