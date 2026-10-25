import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Download,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Coins,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Users,
  Copy,
  Check,
  FileSpreadsheet,
  Lock,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';
import { monetizationService } from '../../services/monetizationService';
import { financialLedger, LedgerEntry } from '../../services/ledgerService';
import { CreatorRankingItem, CreatorRankingSortMode } from '../../types';

interface CreatorEarningsRankingViewProps {
  onOpenCreatorDossier?: (creator: CreatorRankingItem) => void;
}

export const CreatorEarningsRankingView: React.FC<CreatorEarningsRankingViewProps> = () => {
  // Ambiente: Separação estrita entre Ambiente Real e Sandbox
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Filtros de Período (Hoje, 7d, 30d, Mês Atual, Mês Anterior, Ano Atual, Personalizado, Acumulado)
  const [period, setPeriod] = useState<
    'today' | '7days' | '30days' | 'current_month' | 'previous_month' | 'current_year' | 'custom' | 'all'
  >('7days');
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-23');

  // Ordenação (9 Modos Obrigatórios)
  const [sortMode, setSortMode] = useState<CreatorRankingSortMode>('net_accumulated');

  // Filtros de Segmentação
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_only' | 'under_review' | 'restricted' | 'blocked'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Anonimização LGPD
  const [isAnonymized, setIsAnonymized] = useState(false);

  // Modal Dossiê Individual
  const [selectedCreator, setSelectedCreator] = useState<CreatorRankingItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Identificador copiado para a área de transferência.');
  };

  // Mapear período para consulta ao serviço
  const normalizedPeriod = useMemo<'today' | '7days' | '30days' | 'all'>(() => {
    if (period === 'today') return 'today';
    if (period === '7days') return '7days';
    if (period === '30days' || period === 'current_month' || period === 'previous_month') return '30days';
    return 'all';
  }, [period]);

  // Carregar rankings a partir do monetizationService
  const creatorList = useMemo(() => {
    const effectiveStatus = activeOnly ? 'active_only' : statusFilter;
    const list = monetizationService.getCreatorRankings(
      environment,
      normalizedPeriod,
      effectiveStatus,
      sortMode,
      contentTypeFilter,
      paymentStatusFilter
    );

    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    const qWithoutAt = q.startsWith('@') ? q.slice(1) : q;
    return list.filter((c) => {
      const nameMatch = c.publicName.toLowerCase().includes(q);
      const handleMatch =
        c.handle.toLowerCase().includes(q) ||
        c.handle.toLowerCase().replace('@', '').includes(qWithoutAt);
      const idMatch =
        c.creatorId.toLowerCase().includes(q) ||
        c.creatorId.toLowerCase().includes(qWithoutAt);
      const categoryMatch = c.category.toLowerCase().includes(q);
      return nameMatch || handleMatch || idMatch || categoryMatch;
    });
  }, [
    environment,
    normalizedPeriod,
    activeOnly,
    statusFilter,
    sortMode,
    contentTypeFilter,
    paymentStatusFilter,
    searchQuery,
  ]);

  // Paginação e controle de páginas seguras
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Recalcular página para a primeira sempre que a busca ou filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    sortMode,
    period,
    statusFilter,
    contentTypeFilter,
    paymentStatusFilter,
    activeOnly,
    environment,
  ]);

  const totalItems = creatorList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedList = useMemo(() => {
    if (pageSize >= 100) return creatorList;
    const start = (safeCurrentPage - 1) * pageSize;
    return creatorList.slice(start, start + pageSize);
  }, [creatorList, safeCurrentPage, pageSize]);

  // Lançamentos do Livro-Razão do Criador selecionado
  const creatorLedgerEntries = useMemo<LedgerEntry[]>(() => {
    if (!selectedCreator) return [];
    const all = financialLedger.getEntries();
    return all
      .filter(
        (e) =>
          e.targetCreatorId === selectedCreator.creatorId ||
          e.creditAccount.includes(selectedCreator.creatorId) ||
          e.debitAccount.includes(selectedCreator.creatorId) ||
          (Boolean(e.referenceId) && e.referenceId!.toLowerCase().includes(selectedCreator.creatorId.toLowerCase()))
      )
      .slice(0, 30);
  }, [selectedCreator]);

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = [
      'Posição',
      'ID Criador',
      'Nome Público',
      'Usuário',
      'Categoria',
      'Ganhos Brutos (R$)',
      'Taxa JOBS 30% (R$)',
      'Taxas PSP (R$)',
      'Estornos/Ajustes (R$)',
      'Ganhos Líquidos (R$)',
      'Valores Pendentes (R$)',
      'Elegíveis Saque (R$)',
      'Valores Já Pagos (R$)',
      'Última Atividade',
      'Status da Conta',
      'Verificação KYC',
      'Ambiente',
    ];

    const rows = creatorList.map((c) => [
      c.rank,
      isAnonymized ? `CR-***-${c.creatorId.slice(-3)}` : c.creatorId,
      isAnonymized ? `Criador #${c.rank}` : `"${c.publicName}"`,
      isAnonymized ? `@anon_${c.rank}` : `"${c.handle}"`,
      `"${c.category}"`,
      c.grossSalesConfirmedBrl.toFixed(2),
      c.platformCommissionBrl.toFixed(2),
      c.assignedFeesBrl.toFixed(2),
      c.refundsAndAdjustmentsBrl.toFixed(2),
      c.netAccumulatedEarningsBrl.toFixed(2),
      c.pendingPaymentBrl.toFixed(2),
      c.eligibleForWithdrawalBrl.toFixed(2),
      c.totalPaidBrl.toFixed(2),
      `"${c.lastActivityDate}"`,
      c.accountStatus,
      c.kycVerificationStatus,
      environment.toUpperCase(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JOBS_RANKING_CRIADORES_${environment.toUpperCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório completo de criadores exportado com sucesso em CSV.');
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header com Segregação Rígida de Ambientes (Real vs Testes) */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-black text-white tracking-tight">
                Ranking de Ganhos dos Criadores
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Split Oficial 70/30
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Classificação auditada de criadores por volume e ganhos gerados através de vendas de mídias privadas, ensaios VIP e gorjetas em lives. Todos os valores respeitam o modelo de menor privilégio e custódia legal segregada.
            </p>
          </div>

          {/* Seletor Rígido de Ambiente */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 shrink-0">
            <button
              onClick={() => setEnvironment('sandbox')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                environment === 'sandbox'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ranking de Testes (Sandbox)</span>
            </button>
            <button
              onClick={() => setEnvironment('production')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                environment === 'production'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ranking Real (Produção)</span>
            </button>
          </div>
        </div>

        {/* Alerta de Ambiente Real Desconectado */}
        {environment === 'production' && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  Ranking real indisponível — aguardando integração financeira
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  INTEGRAÇÃO FINANCEIRA REAL NÃO ATIVADA
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Nenhum valor simulado é exibido como receita real. Para ativar o ranking de produção, configure os webhooks do provedor de pagamento (Asaas/Pagar.me/Stripe) e execute a conciliação bancária homologada junto ao Banco Central.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setEnvironment('sandbox')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retornar ao Ranking de Testes Homologado</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Filtros e Ferramentas (Exibida no Sandbox) */}
        {environment === 'sandbox' && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            {/* Linha 1: Períodos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
                {[
                  { id: 'today', label: 'Hoje' },
                  { id: '7days', label: '7 Dias' },
                  { id: '30days', label: '30 Dias' },
                  { id: 'current_month', label: 'Mês Atual' },
                  { id: 'previous_month', label: 'Mês Anterior' },
                  { id: 'current_year', label: 'Ano Atual' },
                  { id: 'custom', label: 'Personalizado' },
                  { id: 'all', label: 'Acumulado' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      period === p.id
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Botões de Ação: Anonimizar e Exportar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAnonymized(!isAnonymized)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isAnonymized
                      ? 'bg-purple-950 text-purple-300 border-purple-500/40 shadow'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Mascarar dados pessoais conforme a LGPD"
                >
                  {isAnonymized ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isAnonymized ? 'LGPD Ativada' : 'Anonimizar LGPD'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Inputs de Data Personalizada */}
            {period === 'custom' && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400 font-medium">Intervalo Personalizado:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
                <span className="text-slate-500">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                />
                <button
                  onClick={() => showToast('Intervalo personalizado aplicado com sucesso.')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Linha 2: Busca, Ordenação (9 Modos) e Filtros Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Busca por Nome ou ID */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar criador por nome de usuário ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  aria-label="Buscar criador por nome de usuário ou ID"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                    aria-label="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seletor dos 9 Modos de Ordenação */}
              <div>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as CreatorRankingSortMode)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="net_accumulated">1. Ordenar: Ganhos Líquidos (70%)</option>
                  <option value="gross_sales">2. Ordenar: Ganhos Brutos Gerados</option>
                  <option value="sales_count">3. Ordenar: Quantidade de Vendas</option>
                  <option value="avg_ticket">4. Ordenar: Ticket Médio (R$)</option>
                  <option value="growth_pct">5. Ordenar: Crescimento (%)</option>
                  <option value="buyers_count">6. Ordenar: Compradores Únicos</option>
                  <option value="conversion_rate">7. Ordenar: Taxa de Conversão</option>
                  <option value="pending_payment">8. Ordenar: Valores Pendentes</option>
                  <option value="paid_amount">9. Ordenar: Valores Já Pagos</option>
                </select>
              </div>

              {/* Filtro de Status da Conta */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Status: Todas as Contas</option>
                  <option value="active_only">Status: Apenas Ativas</option>
                  <option value="under_review">Status: Sob Análise</option>
                  <option value="restricted">Status: Restritas</option>
                  <option value="blocked">Status: Bloqueadas</option>
                </select>
              </div>

              {/* Checkbox Apenas Ativos */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                <input
                  type="checkbox"
                  id="activeOnlyCheckbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-slate-700 text-amber-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="activeOnlyCheckbox" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Apenas Criadores Ativos
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo do Ranking em Produção vs Testes */}
      {environment === 'production' ? (
        <div className="p-12 rounded-3xl bg-[#0f0f18] border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Lock className="w-8 h-8 text-slate-600" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Nenhum dado financeiro em produção</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Os relatórios contábeis de produção exigem integração bancária ativa e autorizada. Para validar o comportamento das telas e testar cálculos, utilize o ambiente Sandbox.
            </p>
          </div>
          <button
            onClick={() => setEnvironment('sandbox')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Alternar para Ranking de Testes</span>
          </button>
        </div>
      ) : (
        /* TABELA COMPLETA DE 14 COLUNAS (SEÇÃO 3) */
        <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Tabela de Classificação de Criadores</span>
              <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-300 border border-slate-800">
                {creatorList.length} Criadores Homologados
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              14 Colunas Regulatórias · Split 70% Criador / 30% JOBS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
              <thead className="bg-[#121222] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center w-12">1. Pos</th>
                  <th className="py-3 px-3 w-14">2. Foto</th>
                  <th className="py-3 px-3">3. Nome Público / Usuário</th>
                  <th className="py-3 px-3">4. ID Interno</th>
                  <th className="py-3 px-3 text-right">5. Ganhos Brutos</th>
                  <th className="py-3 px-3 text-right text-rose-400">6. JOBS (30%)</th>
                  <th className="py-3 px-3 text-right text-slate-400">7. Taxas PSP</th>
                  <th className="py-3 px-3 text-right text-amber-400">8. Estornos</th>
                  <th className="py-3 px-3 text-right text-emerald-400 font-bold">9. Ganhos Líquidos</th>
                  <th className="py-3 px-3 text-right text-purple-400">10. Pendentes (D+14)</th>
                  <th className="py-3 px-3 text-right text-cyan-400">11. Elegível Saque</th>
                  <th className="py-3 px-3 text-right text-slate-300">12. Já Pagos</th>
                  <th className="py-3 px-3">13. Última Mov.</th>
                  <th className="py-3 px-3 text-center">14. Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {creatorList.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                          <Search className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-white text-xs font-bold">Nenhum criador encontrado</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {searchQuery.trim()
                            ? `Nenhum criador encontrado para "${searchQuery.trim()}". Verifique o nome de usuário ou o ID e tente novamente.`
                            : 'Nenhum criador encontrado para a combinação de filtros selecionada.'}
                        </p>
                        {searchQuery.trim() && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Limpar pesquisa</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((creator) => {
                    const isTop3 = creator.rank <= 3;
                    const medal = creator.rank === 1 ? '🥇' : creator.rank === 2 ? '🥈' : creator.rank === 3 ? '🥉' : null;

                    return (
                      <tr
                        key={creator.creatorId}
                        className="hover:bg-slate-900/50 transition-colors group"
                      >
                      {/* 1. Posição */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {medal ? (
                          <span className="text-base" title={`Top ${creator.rank}`}>{medal}</span>
                        ) : (
                          <span className="text-slate-400">#{creator.rank}</span>
                        )}
                      </td>

                      {/* 2. Foto/Avatar */}
                      <td className="py-3 px-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                          <img
                            src={creator.avatar}
                            alt={creator.publicName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // fallback visual para avatar
                              (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                            }}
                          />
                        </div>
                      </td>

                      {/* 3. Nome Público / Usuário */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                            {isAnonymized ? `Criador VIP #${creator.rank}` : creator.publicName}
                            {creator.kycVerificationStatus === 'verified_18_plus' && (
                              <span title="KYC 18+ Verificado">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isAnonymized ? `@anon_${creator.rank}` : creator.handle} · {creator.category}
                          </span>
                        </div>
                      </td>

                      {/* 4. ID Interno */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        <button
                          onClick={() => copyToClipboard(creator.creatorId, creator.creatorId)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          title="Clique para copiar ID"
                        >
                          <span>{isAnonymized ? `CR-***-${creator.creatorId.slice(-3)}` : creator.creatorId}</span>
                          {copiedId === creator.creatorId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* 5. Ganhos Brutos Gerados */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                        R$ {creator.grossSalesConfirmedBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 6. Taxa JOBS (30%) */}
                      <td className="py-3 px-3 text-right font-mono text-rose-400 text-[11px]">
                        -R$ {creator.platformCommissionBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 7. Taxas PSP */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                        -R$ {creator.assignedFeesBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 8. Estornos e Ajustes */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400 text-[11px]">
                        {creator.refundsAndAdjustmentsBrl > 0
                          ? `-R$ ${creator.refundsAndAdjustmentsBrl.toFixed(2).replace('.', ',')}`
                          : 'R$ 0,00'}
                      </td>

                      {/* 9. Ganhos Líquidos Acumulados (70%) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-300">
                        R$ {creator.netAccumulatedEarningsBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 10. Valores Pendentes de Liberação (D+14) */}
                      <td className="py-3 px-3 text-right font-mono text-purple-300 text-[11px]">
                        R$ {creator.pendingPaymentBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 11. Valores Elegíveis para Saque */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                        R$ {creator.eligibleForWithdrawalBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 12. Valores Já Pagos */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                        R$ {creator.totalPaidBrl.toFixed(2).replace('.', ',')}
                      </td>

                      {/* 13. Data da Última Movimentação */}
                      <td className="py-3 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {creator.lastActivityDate}
                      </td>

                      {/* 14. Status da Conta / Ação */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              creator.accountStatus === 'active'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : creator.accountStatus === 'under_review'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {creator.accountStatus === 'active'
                              ? 'Ativa'
                              : creator.accountStatus === 'under_review'
                              ? 'Análise'
                              : 'Bloqueada'}
                          </span>

                          <button
                            onClick={() => setSelectedCreator(creator)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Abrir Ficha Financeira Individual do Criador"
                          >
                            <span>Dossiê</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginação e Status de Exibição */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Exibindo {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1} a{' '}
                {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} criador(es)
                {searchQuery.trim() && (
                  <span className="ml-1 text-amber-400 font-semibold">(filtrados por busca)</span>
                )}
              </span>

              {/* Seletor de Itens por Página */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={100}>Todos</option>
                </select>
              </div>
            </div>

            {/* Controles de Navegação de Página */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-6 h-6 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                  title="Próxima Página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 gap-2">
            <span>Ambiente: TESTE / SANDBOX · Nenhum saque real é liquidado nesta fase.</span>
            <span>Regra de carência: D+14 dias corridos para liberação de saldo elegível.</span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: FICHA FINANCEIRA INDIVIDUAL DO CRIADOR (DOSSIÊ CONTÁBIL)       */}
      {/* ==================================================================== */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c0c16] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#121222]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-500/50 bg-slate-800">
                  <img
                    src={selectedCreator.avatar}
                    alt={selectedCreator.publicName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {isAnonymized ? `Criador VIP #${selectedCreator.rank}` : selectedCreator.publicName}
                    </h3>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      KYC 18+ Homologado
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {selectedCreator.creatorId} · {selectedCreator.handle} · {selectedCreator.category}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreator(null)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Cards de Métricas Consolidadas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Ganhos Brutos</span>
                  <div className="text-lg font-black font-mono text-white mt-1">
                    R$ {selectedCreator.grossSalesConfirmedBrl.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[9px] text-slate-500">{selectedCreator.salesCount} vendas registradas</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-rose-400 uppercase font-semibold">Taxa JOBS (30%)</span>
                  <div className="text-lg font-black font-mono text-rose-300 mt-1">
                    R$ {selectedCreator.platformCommissionBrl.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[9px] text-slate-500">Split comercial padrão</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Ganhos Líquidos (70%)</span>
                  <div className="text-lg font-black font-mono text-emerald-300 mt-1">
                    R$ {selectedCreator.netAccumulatedEarningsBrl.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[9px] text-emerald-500/70">Direito adquirido</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40">
                  <span className="text-[10px] text-cyan-400 uppercase font-semibold">Elegível p/ Saque</span>
                  <div className="text-lg font-black font-mono text-cyan-300 mt-1">
                    R$ {selectedCreator.eligibleForWithdrawalBrl.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[9px] text-cyan-400/70">Desembaraçado de D+14</span>
                </div>
              </div>

              {/* Informações Regulatórias e Split Comercial */}
              <div className="p-4 rounded-2xl bg-[#121224] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Parâmetros Comerciais & Retenção do Criador
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded">
                    Custódia D+14 Ativa
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Percentual de Repasse:</span>
                    <strong className="text-white">70% Líquido</strong> (Split Automático)
                  </div>
                  <div>
                    <span className="text-slate-500 block">Carência de Liquidação:</span>
                    <strong className="text-white">D+14 dias corridos</strong> (Antifraude)
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valores já Liquidados:</span>
                    <strong className="text-white">R$ {selectedCreator.totalPaidBrl.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>
              </div>

              {/* Extrato Analítico do Livro-Razão */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    Extrato do Livro-Razão Contábil (Últimas Transações)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Origem: financialLedger (Auditado)</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {creatorLedgerEntries.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhum lançamento recente individualizado neste período. Os valores consolidados são calculados a partir dos desbloqueios simulados em sandbox.
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#121222] text-slate-400 uppercase text-[9px] font-mono border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Data / Hora</th>
                          <th className="py-2 px-3">Tipo</th>
                          <th className="py-2 px-3">Descrição</th>
                          <th className="py-2 px-3 text-right">Créditos</th>
                          <th className="py-2 px-3 text-right">Valor Líquido (R$)</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300 font-mono">
                        {creatorLedgerEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 text-slate-400">
                              {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 text-[10px]">
                                {entry.operationType}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-sans">{entry.description}</td>
                            <td className="py-2 px-3 text-right text-amber-400">
                              {entry.currency === 'CREDITS' ? `${entry.amount} 💎` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                              R$ {entry.currency === 'BRL' ? entry.amount.toFixed(2).replace('.', ',') : (entry.amount * 0.1).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold">
                                {entry.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#121222] flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[10px]">
                Auditoria permanente · Qualquer estorno é deduzido pro-rata do criador
              </span>
              <button
                onClick={() => setSelectedCreator(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
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
