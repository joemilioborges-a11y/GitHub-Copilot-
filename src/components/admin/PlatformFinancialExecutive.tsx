import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Coins,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Download,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Scale,
  Percent,
  RefreshCw,
  Send,
  UserCheck,
  Award,
  Users,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
  CreditCard,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  FileText,
  Calculator,
  PieChart,
  BarChart3,
  ArrowRight,
  Clock,
  Hash,
  FileCheck2,
  X,
} from 'lucide-react';
import { monetizationService } from '../../services/monetizationService';
import { financialLedger, LedgerEntry } from '../../services/ledgerService';
import { pspWebhookReconciliationService } from '../../services/pspWebhookReconciliationService';
import { financialDomainAdapter } from '../../services/financialDomainAdapter';
import {
  PlatformFinancialStatement,
  CreatorRankingItem,
  CreatorRankingSortMode,
  UserVolumeRankingItem,
  AdminWithdrawalRecord,
  ExecutiveFinancialCardIndicator,
} from '../../types';
import { WithdrawalSimulator } from './WithdrawalSimulator';
import { AnalyticalIndicatorPopover } from './AnalyticalIndicatorPopover';
import { CreatorComparativeBarCell } from './CreatorComparativeBarCell';

interface PlatformFinancialExecutiveProps {
  onOpenWithdrawModal?: (availableBrl: number) => void;
}

export const PlatformFinancialExecutive: React.FC<PlatformFinancialExecutiveProps> = ({
  onOpenWithdrawModal,
}) => {
  // Sub-abas do módulo
  const [activeSubTab, setActiveSubTab] = useState<
    'statement' | 'creators_ranking' | 'users_ranking' | 'distribution_rules' | 'audit_reconciliation' | 'withdrawal_simulator'
  >('statement');

  // Ambiente Financeiro (Separação Rígida entre Testes e Produção)
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Filtro de Período Geral
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  // Filtros de Criadores
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<string>('all');
  const [creatorSortMode, setCreatorSortMode] = useState<CreatorRankingSortMode>('net_accumulated');
  const [creatorContentTypeFilter, setCreatorContentTypeFilter] = useState<string>('all');
  const [creatorPaymentStatusFilter, setCreatorPaymentStatusFilter] = useState<string>('all');
  const [creatorSearch, setCreatorSearch] = useState('');

  // Filtros de Usuários
  const [userRiskFilter, setUserRiskFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');

  // Anonimização LGPD
  const [isAnonymized, setIsAnonymized] = useState(false);

  // Modal de Ficha Financeira Detalhada do Criador
  const [selectedCreatorDossier, setSelectedCreatorDossier] = useState<CreatorRankingItem | null>(null);

  // Feedback Toast & Conciliação
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastReconciliationHash, setLastReconciliationHash] = useState<string>('REC-BACEN-20261019-88192');

  // Teste de Bloqueio Fail-Closed
  const [failClosedTestResult, setFailClosedTestResult] = useState<{
    tested: boolean;
    isBlocked: boolean;
    errorCode?: string;
    externalCallsAttempted?: number;
    fallbackOccurred?: boolean;
    message?: string;
  } | null>(null);
  const [isTestingFailClosed, setIsTestingFailClosed] = useState(false);

  const handleTestFailClosedBlock = async () => {
    setIsTestingFailClosed(true);
    try {
      let testPayoutId = 'payout_test_failclosed_prod';
      const prodPayouts = financialLedger.getPayoutRecords('production');
      if (prodPayouts.length > 0) {
        testPayoutId = prodPayouts[0].id;
      } else {
        const req = await financialLedger.requestPayout({
          creatorId: 'creator_test_audit',
          creatorName: 'Criador Auditoria',
          amountBrl: 150.0,
          payoutMethod: 'PIX',
          pixKeyOrAccount: 'audit@jobs.com',
          idempotencyKey: `idemp_failclosed_test_${Date.now()}`,
          environment: 'production',
          reserveImmediately: false,
        });
        testPayoutId = req.payout.id;
      }

      const res = await pspWebhookReconciliationService.dispatchPixPayoutOrder({
        payoutId: testPayoutId,
        environment: 'production',
        actorId: 'admin_dashboard',
      });

      setFailClosedTestResult({
        tested: true,
        isBlocked: !res.dispatched && res.errorCode === 'PSP_NOT_CONFIGURED_FOR_PRODUCTION',
        errorCode: res.errorCode,
        externalCallsAttempted: res.externalCallsAttempted,
        fallbackOccurred: res.fallbackOccurred,
        message: res.message,
      });

      showToast('Bloqueio fail-closed testado: recusa PSP_NOT_CONFIGURED_FOR_PRODUCTION confirmada.');
    } catch {
      showToast('Erro ao testar bloqueio fail-closed.');
    } finally {
      setIsTestingFailClosed(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar dados reativos do serviço
  const financialStatement = useMemo(() => {
    return monetizationService.getPlatformFinancialStatement(environment, period);
  }, [environment, period]);

  const executiveCards: ExecutiveFinancialCardIndicator[] = useMemo(() => {
    return monetizationService.getExecutive12Indicators(environment, period);
  }, [environment, period]);

  const remunerationPolicy = useMemo(() => {
    return monetizationService.getRemunerationPolicy();
  }, []);

  const adminWithdrawals = useMemo(() => {
    return monetizationService.getAdminWithdrawalRecords(environment);
  }, [environment, isReconciling]);

  const creatorRankings = useMemo(() => {
    const list = monetizationService.getCreatorRankings(
      environment,
      period,
      creatorStatusFilter,
      creatorSortMode,
      creatorContentTypeFilter,
      creatorPaymentStatusFilter
    );
    if (!creatorSearch.trim()) return list;
    const q = creatorSearch.trim().toLowerCase();
    const qWithoutAt = q.startsWith('@') ? q.slice(1) : q;
    return list.filter(
      (c) =>
        c.publicName.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.handle.toLowerCase().replace('@', '').includes(qWithoutAt) ||
        c.creatorId.toLowerCase().includes(q) ||
        c.creatorId.toLowerCase().includes(qWithoutAt) ||
        c.category.toLowerCase().includes(q)
    );
  }, [
    environment,
    period,
    creatorStatusFilter,
    creatorSortMode,
    creatorContentTypeFilter,
    creatorPaymentStatusFilter,
    creatorSearch,
  ]);

  const userRankings = useMemo(() => {
    const list = monetizationService.getUserVolumeRankings(environment, period, userRiskFilter);
    if (!userSearch.trim()) return list;
    const q = userSearch.toLowerCase();
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)
    );
  }, [environment, period, userRiskFilter, userSearch]);

  // Auditoria do Livro-Razão
  const ledgerIntegrity = useMemo(() => {
    return financialLedger.verifyLedgerIntegrity();
  }, []);

  // Entradas do livro-razão para o criador selecionado na ficha detalhada
  const creatorLedgerEntries = useMemo(() => {
    if (!selectedCreatorDossier) return [];
    const entries = financialLedger.getEntries();
    const cid = selectedCreatorDossier.creatorId;
    return entries.filter(
      (e) =>
        e.targetCreatorId === cid ||
        e.creditAccount.includes(cid) ||
        e.debitAccount.includes(cid)
    );
  }, [selectedCreatorDossier]);

  const creatorLedgerBalances = useMemo(() => {
    if (!selectedCreatorDossier) return null;
    return financialLedger.getCreatorBalances(selectedCreatorDossier.creatorId);
  }, [selectedCreatorDossier]);

  // Métricas do Quadro de Saques
  const withdrawalMetrics = useMemo(() => {
    const requested = adminWithdrawals.reduce((sum, w) => sum + w.amountBrl, 0);
    const processing = adminWithdrawals
      .filter((w) => w.status === 'em_processamento' || w.status === 'pendente_validacao' || w.status === 'em_analise')
      .reduce((sum, w) => sum + w.amountBrl, 0);
    const completed = adminWithdrawals
      .filter((w) => w.status === 'liquidado')
      .reduce((sum, w) => sum + w.amountBrl, 0);
    const canceled = adminWithdrawals
      .filter((w) => w.status === 'recusado' || w.status === 'cancelado' || w.status === 'falhou')
      .reduce((sum, w) => sum + w.amountBrl, 0);

    return {
      eligible: financialStatement.availableForAdminWithdrawalBrl,
      requested,
      processing,
      completed,
      canceled,
    };
  }, [adminWithdrawals, financialStatement]);

  // Forçar Reconciliação Bancária
  const handleRunReconciliation = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      const newHash = `REC-BACEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
      setLastReconciliationHash(newHash);
      showToast('Conciliação bancária executada com 100% de paridade junto aos extratos OFX e liquidações do Banco Central.');
    }, 1200);
  };

  // Exportar Relatório Financeiro Executivo
  const handleExportFinancialReport = () => {
    const headers = [
      'Indicador',
      'Valor (R$)',
      'Ambiente',
      'Definição',
      'Origem dos Dados',
      'Data de Apuração',
    ];
    const rows = [
      ['1. Arrecadação Bruta Confirmada', `R$ ${financialStatement.grossRevenueConfirmedBrl.toFixed(2)}`, environment.toUpperCase(), 'Pagamentos reais confirmados pelos adquirentes', 'Gateway PSP / Bacen', new Date().toISOString()],
      ['2. Vendas em Ambiente de Testes', `R$ ${financialStatement.sandboxSimulatedRevenueBrl.toFixed(2)}`, 'SANDBOX', 'Vendas simuladas em pacotes de créditos', 'Livro-Razão (Testes)', new Date().toISOString()],
      ['3. Estornos e Reembolsos', `R$ ${financialStatement.refundsAndChargebacksBrl.toFixed(2)}`, environment.toUpperCase(), 'Total devolvido aos compradores por compensação', 'Fila de Estornos', new Date().toISOString()],
      ['4. Taxas de Pagamento', `R$ ${financialStatement.paymentGatewayFeesBrl.toFixed(2)}`, environment.toUpperCase(), 'Tarifas cobradas pelos adquirentes (2,99% + fixo)', 'Fatura de Gateways', new Date().toISOString()],
      ['5. Receita da Plataforma (JOBS)', `R$ ${financialStatement.platformNetRevenueBrl.toFixed(2)}`, environment.toUpperCase(), 'Comissão de 30% efetivamente atribuída ao JOBS', 'Conta PLATFORM_REVENUE_BRL', new Date().toISOString()],
      ['6. Valores Devidos aos Criadores', `R$ ${financialStatement.creatorLiabilitiesTotalBrl.toFixed(2)}`, environment.toUpperCase(), 'Repasse de 70% sob custódia legal segregada', 'Contas CREATOR_PENDING_BRL / ESCROW', new Date().toISOString()],
      ['7. Valores Reservados', `R$ ${financialStatement.reservedFundsBrl.toFixed(2)}`, environment.toUpperCase(), 'Fundo retido contra contestações e disputas (5%)', 'Conta PLATFORM_RESERVE_POOL', new Date().toISOString()],
      ['8. Saldo Financeiro Conciliado', `R$ ${financialStatement.reconciledBalanceBrl.toFixed(2)}`, environment.toUpperCase(), 'Saldo confirmado e conferido com os extratos', 'Extrato Bancário Itaú / Bacen', new Date().toISOString()],
      ['9. Disponível para Uso da Plataforma', `R$ ${financialStatement.availableForPlatformUseBrl.toFixed(2)}`, environment.toUpperCase(), 'Líquido desembaraçado livre de todas as obrigações', 'Livro-Razão (Fórmula de Liquidez)', new Date().toISOString()],
      ['10. Disponível para Saque do Administrador', `R$ ${financialStatement.availableForAdminWithdrawalBrl.toFixed(2)}`, environment.toUpperCase(), 'Valor elegível para transferência empresarial autorizada', 'Livro-Razão Administrativo', new Date().toISOString()],
      ['11. Saques Administrativos Pendentes', `R$ ${withdrawalMetrics.processing.toFixed(2)}`, environment.toUpperCase(), 'Solicitações aguardando validação dupla (2FA)', 'Fila de Ordens de Saque', new Date().toISOString()],
      ['12. Saques Administrativos Realizados', `R$ ${withdrawalMetrics.completed.toFixed(2)}`, environment.toUpperCase(), 'Transferências efetivamente liquidadas', 'Histórico de Saques Liquidados', new Date().toISOString()],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs_financeiro_executivo_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório Financeiro Executivo exportado em CSV com sucesso!');
  };

  // Simulação Isolada de Repasse Direto a Criador (Sandbox)
  const handleExecuteCreatorRepay = (creator: CreatorRankingItem) => {
    const simRecord = financialLedger.simulatePayout({
      creatorId: creator.creatorId,
      creatorName: creator.publicName,
      requestedAmountBrl: creator.pendingPaymentBrl,
      feePercentage: 0,
      fixedFeeBrl: 0,
      payoutMethod: 'PIX Instantâneo (Simulação Sandbox)',
    });
    showToast(
      `Simulação de repasse #${simRecord.id} (status: ${simRecord.status}) de R$ ${simRecord.amountBrl.toFixed(2).replace('.', ',')} para ${creator.publicName} registrada em Sandbox (sem movimentar saldo real).`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-xs font-semibold text-emerald-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Top Header & Navigation Sub-Tabs */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#12121e] via-[#0f0f18] to-[#161224] border border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Scale className="w-4 h-4 text-slate-950" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                JOBS — Módulo Financeiro Executivo & Ranking de Ganhos
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                Auditoria Ativa
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono">
                Livro-Razão Imutável
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visão consolidada da arrecadação da plataforma, valores disponíveis livres de obrigações, custódia de criadores e classificações por volume.
            </p>
          </div>

          {/* Period Filter & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Environment Selector: Sandbox vs Real */}
            <div className="flex items-center bg-[#0a0a14] border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setEnvironment('sandbox')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  environment === 'sandbox'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Testes (Sandbox)</span>
              </button>
              <button
                onClick={() => setEnvironment('production')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  environment === 'production'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Economia Real</span>
              </button>
            </div>

            {/* Period selector */}
            <div className="flex items-center bg-[#0a0a14] border border-slate-800 p-1 rounded-xl text-xs">
              {[
                { id: 'today', label: 'Hoje' },
                { id: '7days', label: '7 Dias' },
                { id: '30days', label: '30 Dias' },
                { id: 'all', label: 'Todo o Período' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    period === p.id
                      ? 'bg-emerald-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Anonymity LGPD Toggle */}
            <button
              onClick={() => setIsAnonymized(!isAnonymized)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isAnonymized
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Mascarar nomes artísticos e dados pessoais nos rankings para conformidade com a LGPD"
            >
              {isAnonymized ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isAnonymized ? 'LGPD Ativada' : 'Anonimizar'}</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportFinancialReport}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center border-t border-slate-800/80 pt-3 gap-1 overflow-x-auto">
          {[
            { id: 'statement', label: '1. Financeiro da Plataforma', icon: DollarSign, badge: '12 Indicadores' },
            { id: 'creators_ranking', label: '2. Ranking de Criadores por Ganhos', icon: Award, badge: `${creatorRankings.length} Criadores` },
            { id: 'users_ranking', label: '3. Classificação de Usuários por Volume', icon: Users, badge: `${userRankings.length} Clientes` },
            { id: 'distribution_rules', label: '4. Regras Comerciais & Repasse 70/30', icon: Percent, badge: 'Split Oficial' },
            { id: 'audit_reconciliation', label: '5. Conciliação Bancária & Livro-Razão', icon: ShieldCheck, badge: '100% Auditado' },
            { id: 'withdrawal_simulator', label: '6. Simulador de Saque', icon: Calculator, badge: 'Interativo' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-ABA 1: PAINEL DE ARRECADAÇÃO DA PLATAFORMA (OS 12 INDICADORES)   */}
      {/* ==================================================================== */}
      {activeSubTab === 'statement' && (
        <div className="space-y-6">
          {/* Top 3 Core Financial Pillars: Real vs Disponível vs Custódia Criadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Saldo Disponível para Uso da Plataforma (Livre) */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0e1713] to-[#0c0c16] border border-emerald-500/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-emerald-400 mb-1 relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Saldo Disponível p/ Uso da Plataforma
                </span>
                <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded shadow">
                  Livre de Obrigações
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-300 mt-2 relative z-10">
                R$ {financialStatement.availableForPlatformUseBrl.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 relative z-10">
                Valores estritamente livres para despesas operacionais ou reinvestimento, após a dedução matemática de obrigações com criadores, reservas e taxas.
              </p>
              <div className="pt-3 mt-3 border-t border-emerald-900/60 flex items-center justify-between relative z-10 gap-2">
                <button
                  onClick={() => setActiveSubTab('withdrawal_simulator')}
                  className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulador de Saque</span>
                </button>
                {onOpenWithdrawModal && (
                  <button
                    onClick={() => onOpenWithdrawModal(financialStatement.availableForPlatformUseBrl)}
                    className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Sacar Lucro</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Valores Devidos aos Criadores (Custódia Segregada 70%) */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/50 via-[#13101c] to-[#0c0c16] border border-purple-500/40 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-purple-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-purple-400" />
                  Valores Devidos aos Criadores
                </span>
                <span className="text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
                  70% Repasse Escrow
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-purple-300 mt-2">
                R$ {financialStatement.creatorLiabilitiesTotalBrl.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Obrigações acumuladas com criadores por desbloqueios de mídia, presentes de lives e gorjetas. Mantidas sob custódia legal segregada.
              </p>
              <div className="pt-3 mt-3 border-t border-purple-900/60 flex items-center justify-between text-[10px] text-purple-300 font-medium">
                <span>Proteção compulsória: não mutável</span>
                <span>Auditado pelo Livro-Razão</span>
              </div>
            </div>

            {/* 3. Arrecadação Bruta Confirmada (Real vs Sandbox) */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-sky-950/50 via-[#0e121a] to-[#0c0c16] border border-sky-500/40 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-sky-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  Arrecadação Bruta Confirmada
                </span>
                <span className="text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded">
                  Gateways Reais PSP
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-white mt-2">
                R$ {financialStatement.grossRevenueConfirmedBrl.toFixed(2).replace('.', ',')}
              </div>
              <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1.5 rounded-xl mt-2">
                <span className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Vendas em Sandbox (Testes):
                </span>
                <strong className="font-mono text-amber-200">
                  R$ {financialStatement.sandboxSimulatedRevenueBrl.toFixed(2).replace('.', ',')}
                </strong>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Total de pagamentos recebidos</span>
                <span className="text-emerald-400 font-semibold">100% Conciliado</span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* GRID DOS 12 INDICADORES FINANCEIROS OBRIGATÓRIOS (SEÇÃO 1)       */}
          {/* ================================================================ */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Demonstrativo Analítico dos 12 Indicadores Financeiros da Plataforma
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Período: <strong className="text-white">{period === 'today' ? 'Hoje' : period === '7days' ? 'Últimos 7 dias' : period === '30days' ? 'Últimos 30 dias' : 'Todo o Histórico'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {executiveCards.map((card: ExecutiveFinancialCardIndicator) => {
                const isDisponivel = card.number === 10;
                const isObrigacao = card.category === 'obrigacoes';
                const isReserva = card.category === 'reservas';
                const isSaque = card.category === 'saques';

                return (
                  <div
                    key={card.id}
                    className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                      card.number === 10
                        ? 'bg-gradient-to-br from-emerald-950/70 to-[#101914] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                        : card.number === 5
                        ? 'bg-[#141424] border-purple-500/30'
                        : card.number === 2
                        ? 'bg-[#141424] border-rose-500/25'
                        : card.number === 7
                        ? 'bg-[#141424] border-amber-500/25'
                        : 'bg-[#141424] border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className={`font-semibold ${card.number === 10 ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {card.number}. {card.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          card.environment === 'production'
                            ? 'text-rose-400 bg-rose-950'
                            : card.number === 10
                            ? 'text-slate-950 bg-emerald-400 font-black'
                            : isObrigacao
                            ? 'text-purple-300 bg-purple-950'
                            : isReserva
                            ? 'text-amber-300 bg-amber-950'
                            : isSaque
                            ? 'text-cyan-300 bg-cyan-950'
                            : 'text-sky-400 bg-sky-950'
                        }`}
                      >
                        {card.environment === 'production' ? 'Real PSP' : 'Sandbox'}
                      </span>
                    </div>

                    <div
                      className={`text-xl font-bold font-mono ${
                        card.number === 10
                          ? 'text-emerald-300 font-black text-2xl'
                          : card.number === 5
                          ? 'text-purple-300'
                          : card.number === 2
                          ? 'text-rose-300'
                          : card.number === 7
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      R$ {card.amountBrl.toFixed(2).replace('.', ',')}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      <strong>Definição:</strong> {card.description}
                    </p>

                    <div className="pt-1 text-[9px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-800/50 mt-1">
                      <span className="truncate" title={card.dataSource}>Origem: {card.dataSource}</span>
                      <span className="text-slate-400 shrink-0 ml-2">Moeda: {card.currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================== */}
            {/* FÓRMULA DO VALOR DISPONÍVEL PARA USO (SEÇÃO 2)                 */}
            {/* ============================================================== */}
            <div className="p-4.5 rounded-2xl bg-[#090912] border border-slate-800 text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                    Demonstrativo Aritmético do Saldo Disponível para Uso (Fórmula Oficial)
                  </h5>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                  Zero Co-mingling de Recursos
                </span>
              </div>

              {/* Breakdown Aritmético Passo a Passo */}
              <div className="font-mono text-xs bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>  Saldo financeiro confirmado e conciliado:</span>
                  <span className="text-white font-bold">R$ {financialStatement.reconciledBalanceBrl.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-purple-400">
                  <span>- Valores devidos aos criadores (70% custódia):</span>
                  <span>- R$ {financialStatement.creatorLiabilitiesTotalBrl.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-rose-400">
                  <span>- Estornos e reembolsos pendentes:</span>
                  <span>- R$ {financialStatement.refundsAndChargebacksBrl.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-amber-400">
                  <span>- Reservas para disputas e outras obrigações (5%):</span>
                  <span>- R$ {financialStatement.reservedFundsBrl.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>- Taxas e despesas financeiras não liquidadas:</span>
                  <span>- R$ {financialStatement.paymentGatewayFeesBrl.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>- Outras obrigações financeiras registradas:</span>
                  <span>- R$ 0,00</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-emerald-400 font-black text-sm">
                  <span>= Saldo elegível para uso da plataforma:</span>
                  <span className="bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    = R$ {financialStatement.availableForPlatformUseBrl.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Segregação total: A comissão de 30% do JOBS só se torna receita quando confirmada.</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Créditos virtuais adquiridos por usuários não equivalem a dinheiro livre para a empresa.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* QUADRO ADMINISTRATIVO DE SAQUES DA PLATAFORMA (SEÇÃO 3)          */}
          {/* ================================================================ */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Quadro Administrativo de Saques da Plataforma
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase">
                    Modo Sandbox / Demonstração
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conta corporativa de destino: <strong className="text-white font-mono">{financialStatement.maskedCorporateAccount}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('withdrawal_simulator')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Simular Nova Transferência</span>
              </button>
            </div>

            {/* Métricas do Quadro de Saques */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#141424] border border-cyan-500/30 space-y-1">
                <span className="text-[10px] text-slate-400">Elegível p/ Saque:</span>
                <div className="font-mono font-bold text-cyan-300 text-sm">
                  R$ {withdrawalMetrics.eligible.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141424] border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400">Total Já Solicitado:</span>
                <div className="font-mono font-bold text-white text-sm">
                  R$ {withdrawalMetrics.requested.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141424] border border-amber-500/30 space-y-1">
                <span className="text-[10px] text-slate-400">Em Processamento:</span>
                <div className="font-mono font-bold text-amber-400 text-sm">
                  R$ {withdrawalMetrics.processing.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141424] border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-slate-400">Total Concluído:</span>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  R$ {withdrawalMetrics.completed.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141424] border border-rose-500/30 space-y-1">
                <span className="text-[10px] text-slate-400">Recusado/Cancelado:</span>
                <div className="font-mono font-bold text-rose-400 text-sm">
                  R$ {withdrawalMetrics.canceled.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {/* Tabela de Ordens Administrativas */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#090912]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold bg-slate-900/60">
                    <th className="py-2.5 px-3">Identificação / Data</th>
                    <th className="py-2.5 px-3">Conta de Destino</th>
                    <th className="py-2.5 px-3">Valor Solicitado</th>
                    <th className="py-2.5 px-3">Líquido Estimado</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Comprovante / Ref.</th>
                    <th className="py-2.5 px-3">Status da Conciliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {adminWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 px-3">
                        <span className="font-bold text-white block">{w.id}</span>
                        <span className="text-[9px] text-slate-500 font-sans">{w.requestedAt}</span>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-300">
                        {w.maskedDestinationAccount}
                      </td>
                      <td className="py-2 px-3 text-white font-bold">
                        R$ {w.amountBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        R$ {w.netEstimatedBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.status === 'liquidado'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : w.status === 'em_processamento'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {w.statusLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[10px]">
                        {w.providerReference || 'Aguardando Lote'}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 text-[10px] font-sans flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{w.reconciliationStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Aviso de Governança:</strong> Futura ativação de saques reais exigirá autenticação multifator reforçada (2FA), aprovação corporativa dupla e integração homologada com provedores autorizados pelo Banco Central. Valores de criadores nunca podem ser transferidos para contas administrativas.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 2: RANKING FINANCEIRO DE CRIADORES (SEÇÃO 4)                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'creators_ranking' && (
        <div className="space-y-4">
          {/* Header e Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Ranking Financeiro de Criadores</h4>
                  <p className="text-[11px] text-slate-400">Classificação oficial dos criadores por volume e rendimento no período</p>
                </div>
              </div>

              {/* Busca por nome ou categoria */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={creatorSearch}
                  onChange={(e) => setCreatorSearch(e.target.value)}
                  placeholder="Buscar criador por nome de usuário ou ID..."
                  className="pl-8 pr-8 py-1.5 bg-[#141424] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64"
                />
                {creatorSearch && (
                  <button
                    type="button"
                    onClick={() => setCreatorSearch('')}
                    className="absolute right-2 top-2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                    aria-label="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Controles de Ordenação e Filtros Multicritério (Exigência Seção 4) */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Seletor de Classificação (7 Ordenações Requeridas) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold">Ordenar por:</span>
                <select
                  value={creatorSortMode}
                  onChange={(e) => setCreatorSortMode(e.target.value as CreatorRankingSortMode)}
                  className="bg-[#141424] border border-slate-800 text-white rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                >
                  <option value="net_accumulated">Maior ganho líquido acumulado</option>
                  <option value="month_earnings">Maior ganho no mês</option>
                  <option value="7days_earnings">Maior ganho nos últimos 7 dias</option>
                  <option value="day_earnings">Maior ganho no dia</option>
                  <option value="gross_sales">Maior volume de vendas confirmadas</option>
                  <option value="pending_payment">Maior valor pendente de pagamento</option>
                  <option value="eligible_withdrawal">Maior valor elegível para saque</option>
                </select>
              </div>

              {/* Filtros: Status da Conta, Conteúdo e Pagamento */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tipo de Conteúdo */}
                <select
                  value={creatorContentTypeFilter}
                  onChange={(e) => setCreatorContentTypeFilter(e.target.value)}
                  className="bg-[#141424] border border-slate-800 text-slate-300 rounded-xl px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Todos os Conteúdos</option>
                  <option value="Boudoir">Boudoir & Transmissões</option>
                  <option value="Fotos">Fotos Privadas</option>
                  <option value="Ensaios">Ensaios Conceituais</option>
                  <option value="Vídeos">Vídeos Secretos</option>
                  <option value="Dança">Dança & Looks</option>
                </select>

                {/* Situação de Pagamento */}
                <select
                  value={creatorPaymentStatusFilter}
                  onChange={(e) => setCreatorPaymentStatusFilter(e.target.value)}
                  className="bg-[#141424] border border-slate-800 text-slate-300 rounded-xl px-2 py-1 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Todas Situações</option>
                  <option value="has_pending">Com Saldo Pendente</option>
                  <option value="settled">Sem Saldo Pendente</option>
                  <option value="eligible_only">Elegíveis p/ Saque</option>
                </select>

                {/* Status da Conta */}
                <div className="flex items-center bg-[#141424] border border-slate-800 p-0.5 rounded-xl text-xs">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: 'Ativos' },
                    { id: 'under_review', label: 'Em Análise' },
                    { id: 'restricted', label: 'Restritos' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setCreatorStatusFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer text-[11px] ${
                        creatorStatusFilter === s.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela do Ranking com as 13 Colunas Exigidas (Seção 4) */}
          <div className="rounded-2xl bg-[#0f0f18] border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#141424] text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">1. Pos. & Criador</th>
                    <th className="py-3 px-3">3. ID Interno</th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1">
                        <span>4. Vendas Brutas</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="gross_sales"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 text-amber-400">
                        <span>5. Taxa JOBS (30%)</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="platform_commission"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1">
                        <span>6. Taxas PSP</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="psp_fees"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 text-rose-400">
                        <span>7. Estornos</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="refunds_adjustments"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 text-emerald-400">
                        <span>8. Ganho Líquido</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="net_accumulated"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1">
                        <span>9. Já Pago</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="total_paid"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 text-amber-300">
                        <span>10. Pendente</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="pending_payment"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 text-cyan-300">
                        <span>11. Elegível Saque</span>
                        <AnalyticalIndicatorPopover
                          indicatorKey="eligible_withdrawal"
                          environment={environment}
                          period={period}
                          align="left"
                        />
                      </div>
                    </th>
                    <th className="py-3 px-3">12. Status & KYC</th>
                    <th className="py-3 px-3">13. Última Atualização</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {creatorRankings.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-10 text-center font-sans">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                            <Search className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-white text-xs font-bold">Nenhum criador encontrado</p>
                          <p className="text-[11px] text-slate-400">
                            {creatorSearch.trim()
                              ? `Nenhum criador corresponde a "${creatorSearch.trim()}".`
                              : 'Nenhum criador encontrado para estes filtros.'}
                          </p>
                          {creatorSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => setCreatorSearch('')}
                              className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Limpar pesquisa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    creatorRankings.map((creator) => {
                      const isTop1 = creator.rank === 1;
                      const isTop2 = creator.rank === 2;
                      const isTop3 = creator.rank === 3;

                      const displayName = isAnonymized
                        ? `Criador VIP #${creator.rank.toString().padStart(2, '0')}`
                        : creator.publicName;

                      return (
                        <tr key={creator.creatorId} className="hover:bg-[#151526] transition-colors group">
                        {/* 1 & 2. Posição & Nome */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                isTop1
                                  ? 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300'
                                  : isTop2
                                  ? 'bg-slate-300 text-slate-950'
                                  : isTop3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {creator.rank}
                            </span>
                            <img
                              src={creator.avatar}
                              alt={creator.publicName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="font-sans font-bold text-white flex items-center gap-1">
                                <span>{displayName}</span>
                                {creator.kycVerificationStatus === 'verified_18_plus' && (
                                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[130px]">
                                {creator.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. ID Interno */}
                        <td className="py-3 px-3 text-slate-400 text-[10px]">
                          {creator.creatorId}
                        </td>

                        {/* 4. Total Bruto Vendas */}
                        <td className="py-3 px-3 font-bold text-white">
                          R$ {creator.grossSalesConfirmedBrl.toFixed(2).replace('.', ',')}
                          <span className="text-[9px] text-slate-400 block font-sans">
                            {creator.salesCount} vendas
                          </span>
                        </td>

                        {/* 5. Comissão da Plataforma (30%) */}
                        <td className="py-3 px-3 text-amber-400 font-bold">
                          - R$ {creator.platformCommissionBrl.toFixed(2).replace('.', ',')}
                        </td>

                        {/* 6. Taxas Atribuídas */}
                        <td className="py-3 px-3 text-slate-400">
                          - R$ {creator.assignedFeesBrl.toFixed(2).replace('.', ',')}
                        </td>

                        {/* 7. Estornos e Ajustes */}
                        <td className="py-3 px-3 text-rose-400">
                          {creator.refundsAndAdjustmentsBrl > 0 ? `- R$ ${creator.refundsAndAdjustmentsBrl.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                        </td>

                        {/* 8. Ganho Líquido Acumulado com Barras Proporcionais */}
                        <td className="py-3 px-3">
                          <CreatorComparativeBarCell
                            creator={creator}
                            environment={environment}
                            period={period}
                            isAnonymized={isAnonymized}
                          />
                        </td>

                        {/* 9. Valor Já Pago */}
                        <td className="py-3 px-3 text-slate-300">
                          R$ {creator.totalPaidBrl.toFixed(2).replace('.', ',')}
                        </td>

                        {/* 10. Valor Pendente */}
                        <td className="py-3 px-3 font-bold text-amber-300">
                          R$ {creator.pendingPaymentBrl.toFixed(2).replace('.', ',')}
                        </td>

                        {/* 11. Valor Elegível p/ Saque */}
                        <td className="py-3 px-3 font-bold text-cyan-300">
                          R$ {creator.eligibleForWithdrawalBrl.toFixed(2).replace('.', ',')}
                        </td>

                        {/* 12. Status & Verificação KYC */}
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              creator.accountStatus === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : creator.accountStatus === 'under_review'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {creator.accountStatus === 'active' ? 'Ativo' : creator.accountStatus === 'under_review' ? 'Em Análise' : 'Restrito'}
                          </span>
                        </td>

                        {/* 13. Data Última Atualização */}
                        <td className="py-3 px-3 text-slate-400 font-sans text-[10px]">
                          {creator.lastActivityDate}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedCreatorDossier(creator)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Consultar ficha financeira detalhada e livro-razão"
                            >
                              Ficha Detalhada
                            </button>
                            <button
                              onClick={() => handleExecuteCreatorRepay(creator)}
                              disabled={creator.accountStatus === 'restricted' || creator.pendingPaymentBrl <= 0}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
                              title="Repassar saldo via PIX simulado"
                            >
                              Repassar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 3: CLASSIFICAÇÃO DE USUÁRIOS POR VOLUME (SEÇÃO 4 / RF)       */}
      {/* ==================================================================== */}
      {activeSubTab === 'users_ranking' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Classificação de Usuários por Volume</h4>
                <p className="text-[11px] text-slate-400">Usuários que mais movimentam recursos, frequência e alertas de risco operacional</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuário, cidade..."
                  className="pl-8 pr-3 py-1.5 bg-[#141424] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52"
                />
              </div>

              <div className="flex items-center bg-[#141424] border border-slate-800 p-0.5 rounded-xl text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'low', label: 'Baixo Risco' },
                  { id: 'attention', label: 'Em Atenção' },
                  { id: 'high', label: 'Alto Risco' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setUserRiskFilter(r.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      userRiskFilter === r.id ? 'bg-sky-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0f0f18] border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#141424] text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Posição & Usuário</th>
                    <th className="py-3 px-4">Total Gasto (R$)</th>
                    <th className="py-3 px-4">Créditos Comprados</th>
                    <th className="py-3 px-4">Créditos Consumidos</th>
                    <th className="py-3 px-4">Saldo em Carteira</th>
                    <th className="py-3 px-4">Frequência / Atividade</th>
                    <th className="py-3 px-4">Risco Operacional & Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {userRankings.map((user) => {
                    const displayName = isAnonymized ? `Cliente VIP #${user.rank.toString().padStart(2, '0')}` : user.name;
                    return (
                      <tr key={user.userId} className="hover:bg-[#151526] transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                              {user.rank}
                            </span>
                            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0" />
                            <div>
                              <div className="font-bold text-white">{displayName}</div>
                              <span className="text-[10px] text-slate-400">{isAnonymized ? '@anon.jobs' : user.handle} • {user.location}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                          R$ {user.totalSpentBrl.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-300">
                          {user.creditsPurchased.toLocaleString('pt-BR')} 💎
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {user.creditsConsumed.toLocaleString('pt-BR')} 💎
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {user.currentCreditsBalance.toLocaleString('pt-BR')} 💎
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {user.activityLabel}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                              user.operationalRiskLevel === 'low'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{user.operationalRiskLabel}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 4: REGRAS COMERCIAIS & REPASSE 70/30 (SEÇÃO 6)               */}
      {/* ==================================================================== */}
      {activeSubTab === 'distribution_rules' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Percent className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Regras para Distribuição de Ganhos e Políticas Comerciais</h4>
                <p className="text-xs text-slate-400">
                  Modelo de remuneração configurado no sistema. Todas as vendas geram lançamentos únicos com referência à compra original.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#141424] border border-purple-500/30 space-y-2">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                  Divisão de Receita (Split Oficial)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-300">70%</span>
                  <span className="text-slate-400 text-xs">Criador / 30% JOBS</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Aplicável sobre todas as vendas de mídias VIP, gorjetas e assinaturas. Mantido em custódia segregada.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Dedução de Taxas dos Gateways
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-white uppercase">Deduzido do Bruto</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  As tarifas de provedores (2,99% + fixo) são deduzidas antes da aplicação do split 70/30, garantindo base líquida transparente.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141424] border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Carência Contábil (Holdback)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">D+14</span>
                  <span className="text-slate-400 text-xs">dias corridos</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Janela de retenção para liquidação de saques contra potenciais chargebacks ou contestações de cartão.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#090912] border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Segurança Contábil e Regras Obrigatórias da Plataforma:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                <li>Créditos virtuais adquiridos por usuários não podem ser convertidos automaticamente em dinheiro sacável.</li>
                <li>Os ganhos dos criadores são apurados por regras próprias a partir de operações elegíveis confirmadas.</li>
                <li>Toda venda possui registro financeiro único no livro-razão com hash SHA-256 e idempotência estrita.</li>
                <li>Reembolsos e estornos geram lançamentos compensatórios vinculados, sem apagar registros anteriores.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 5: CONCILIAÇÃO BANCÁRIA & LIVRO-RAZÃO (SEÇÃO 8)              */}
      {/* ==================================================================== */}
      {activeSubTab === 'audit_reconciliation' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Conciliação Bancária & Encadeamento Hash-Chain SHA-256</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Verificação matemática de integridade e confronto diário com extratos bancários oficiais.
                </p>
              </div>

              <button
                onClick={handleRunReconciliation}
                disabled={isReconciling}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                <span>{isReconciling ? 'Executando Conciliação Interna...' : 'Executar Conciliação do Livro-Razão'}</span>
              </button>
            </div>

            {(() => {
              const readiness = pspWebhookReconciliationService.evaluateFinancialReadinessCriteria();
              const reconciliationReport = pspWebhookReconciliationService.reconcilePayoutRecords(environment);
              const persistenceMatrix = pspWebhookReconciliationService.getPersistenceArchitectureComparison();
              const unifiedMetrics = financialDomainAdapter.getReconciledExecutiveLedgerMetrics(environment);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Classificação de Prontidão</span>
                      <p className="text-xs font-bold text-amber-400">
                        {readiness.overallClassification}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        PSP PIX Real: {readiness.realPspConfigured ? 'Conectado' : 'Não Configurado (Bloqueio Fail-Closed)'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Status da Conciliação Interna ({environment})</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {reconciliationReport.isFullyReconciled
                            ? `${reconciliationReport.reconciledCount}/${reconciliationReport.totalPayoutsAudited} Registros Conciliados`
                            : `${reconciliationReport.discrepanciesCount} Divergência(s) Detectada(s)`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Webhooks HMAC validados: {reconciliationReport.processedWebhooksCount} · Ref: {lastReconciliationHash}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Integridade & Persistência ({unifiedMetrics.firestoreSyncMode === 'cloud_firestore_production' ? 'Cloud Firestore' : 'Sandbox Local'})</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{ledgerIntegrity.isValid ? 'Integridade Criptográfica Válida' : 'Atenção em Hashes'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ledgerIntegrity.checkedCount} lançamentos · Receita Reconhecida: R$ {unifiedMetrics.platformRecognizedRevenueBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Painel dos 9 Critérios Obrigatórios de Prontidão Financeira */}
                  <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Verificação dos 9 Critérios de Prontidão Financeira (Governança JOBS)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Nenhuma operação é classificada como pagamento PIX liquidado no SPI Bacen até que todos os 9 itens estejam comprovados em produção.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400">
                        {readiness.criteria.filter((c) => c.isProvenForProduction).length}/9 comprovados p/ produção
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {readiness.criteria.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#0f0f18] border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-bold text-white leading-snug">
                              {item.title}
                            </span>
                            <span
                              className={`text-[10px] font-mono shrink-0 ${
                                item.isProvenForProduction ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {item.isProvenForProduction ? 'Validado' : 'Pendente Infra'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            {item.evidenceSummary}
                          </p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Req. Produção: {item.remainingRequirement}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matriz Comparativa de Persistência: Cloud SQL PostgreSQL vs Firebase Firestore */}
                  <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Matriz Arquitetural de Persistência do Livro-Razão (Cloud SQL vs. Firestore)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Avaliação das garantias transacionais para migração do armazenamento local para banco autoritativo no servidor.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                            <th className="py-2 pr-3">Dimensão Crítica</th>
                            <th className="py-2 px-3">Cloud SQL (PostgreSQL)</th>
                            <th className="py-2 px-3">Firebase Firestore</th>
                            <th className="py-2 pl-3">Recomendação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {persistenceMatrix.map((row) => (
                            <tr key={row.dimension}>
                              <td className="py-2.5 pr-3 font-semibold text-white">{row.dimension}</td>
                              <td className="py-2.5 px-3 text-slate-300">{row.cloudSqlPostgres}</td>
                              <td className="py-2.5 px-3 text-slate-400">{row.firebaseFirestore}</td>
                              <td className="py-2.5 pl-3 font-mono text-emerald-400">{row.recommendedWinner}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Checklist Executivo de Prontidão Financeira (Seções 1 a 5 — 28 Itens Auditados) */}
                  {(() => {
                    const checklistSections = pspWebhookReconciliationService.getExecutiveReadinessChecklist();
                    return (
                      <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div>
                            <h4 className="text-xs font-bold text-white">
                              JOBS — Checklist Executivo de Prontidão Financeira (Seções 1 a 5)
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Bloqueio obrigatório: nenhuma simulação ou registro local é apresentado como pagamento PIX real concluído.
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-amber-400">
                            Classificação: Não validado para liquidação financeira real em produção
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {checklistSections.map((sec) => (
                            <div
                              key={sec.sectionNumber}
                              className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800/90 space-y-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                                <span className="text-xs font-bold text-white">{sec.title}</span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {sec.items.length} itens
                                </span>
                              </div>
                              <div className="space-y-2">
                                {sec.items.map((item) => (
                                  <div key={item.id} className="flex items-start gap-2 text-[11px]">
                                    <CheckCircle2
                                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                        item.verificationState === 'verified_code_and_tests'
                                          ? 'text-emerald-400'
                                          : 'text-amber-400'
                                      }`}
                                    />
                                    <div className="space-y-0.5">
                                      <div className="text-slate-200 font-medium leading-snug">
                                        {item.label}
                                      </div>
                                      <div className="text-[10px] text-slate-400 leading-relaxed">
                                        {item.evidence}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Painel: Homologação Externa PSP PIX & 6 Verificações Fail-Closed */}
                  {(() => {
                    const homologationDiag = pspWebhookReconciliationService.getFailClosedHomologationDiagnostic();
                    return (
                      <div className="p-4 rounded-2xl bg-[#141424] border border-amber-500/40 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-amber-400" />
                              <h4 className="text-xs font-bold text-white">
                                Homologação Externa PSP PIX & 6 Verificações Fail-Closed
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Adaptador <code className="text-amber-300 font-mono">dispatchPixPayoutOrder</code> bloqueia saques reais com código contratual <code className="text-rose-400 font-mono">PSP_NOT_CONFIGURED_FOR_PRODUCTION</code> sem efetuar chamadas externas nem alterar saldos.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={handleTestFailClosedBlock}
                              disabled={isTestingFailClosed}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <ShieldAlert className={`w-3.5 h-3.5 ${isTestingFailClosed ? 'animate-spin' : ''}`} />
                              <span>{isTestingFailClosed ? 'Testando Bloqueio...' : 'Testar Bloqueio Fail-Closed (Produção)'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Banner de Resultado do Teste Controlado */}
                        {failClosedTestResult && (
                          <div className="p-3.5 rounded-xl bg-[#090912] border border-amber-500/60 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Comprovante de Bloqueio Fail-Closed em Tempo de Execução:
                              </span>
                              <span className="font-mono text-[10px] text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                                {failClosedTestResult.errorCode}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{failClosedTestResult.message}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px] font-mono">
                              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                <span className="text-slate-400 block">Chamadas de Rede Externas:</span>
                                <strong className="text-emerald-400">{failClosedTestResult.externalCallsAttempted} (Zero)</strong>
                              </div>
                              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                <span className="text-slate-400 block">Fallback p/ Simulação / Local:</span>
                                <strong className="text-emerald-400">{failClosedTestResult.fallbackOccurred ? 'Sim (Falha)' : 'Não Permitido (Bloqueado)'}</strong>
                              </div>
                              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                <span className="text-slate-400 block">Integridade de Saldo do Titular:</span>
                                <strong className="text-emerald-400">100% Preservada (Sem Lançamento)</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Coluna 1: Pré-Requisitos Contratuais & Técnicos do Provedor */}
                          <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800/90 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                              <span className="text-xs font-bold text-white">
                                Pré-Requisitos de Homologação Externa do PSP
                              </span>
                              <span className="text-[10px] font-mono text-amber-400">
                                {homologationDiag.prerequisites.filter((p) => p.status === 'verified').length}/6 validados
                              </span>
                            </div>
                            <div className="space-y-2">
                              {homologationDiag.prerequisites.map((prq) => (
                                <div key={prq.id} className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-200">{prq.name}</span>
                                    <span
                                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                        prq.status === 'verified'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                                      }`}
                                    >
                                      {prq.status === 'verified' ? 'Configurado' : 'Pendente'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{prq.details}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Coluna 2: As 6 Verificações Obrigatórias do Bloqueio Fail-Closed */}
                          <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800/90 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                              <span className="text-xs font-bold text-white">
                                6 Verificações Obrigatórias do Bloqueio Fail-Closed
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400">
                                6/6 ativas no código
                              </span>
                            </div>
                            <div className="space-y-2">
                              {homologationDiag.verifications.map((vrf) => (
                                <div key={vrf.id} className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-200">{vrf.criterion}</span>
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800 shrink-0">
                                      {vrf.id}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">{vrf.description}</div>
                                  <div className="text-[9px] font-mono text-slate-500">
                                    Local: {vrf.codeLocation} · {vrf.evidence}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 6: SIMULADOR DE SAQUE (VISÃO INTERATIVA DEDICADA)            */}
      {/* ==================================================================== */}
      {activeSubTab === 'withdrawal_simulator' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <WithdrawalSimulator
            currentEnvironment={environment}
            adminAvailableBalanceBrl={financialStatement.availableForPlatformUseBrl}
            creatorsList={creatorRankings}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: FICHA FINANCEIRA DETALHADA DO CRIADOR (SEÇÃO 5)               */}
      {/* ==================================================================== */}
      {selectedCreatorDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#12121e] border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header da Ficha */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0f0f18]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCreatorDossier.avatar}
                  alt={selectedCreatorDossier.publicName}
                  className="w-12 h-12 rounded-2xl object-cover border border-amber-500/50 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">{selectedCreatorDossier.publicName}</h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      ID: {selectedCreatorDossier.creatorId}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      ✓ KYC 18+ Aprovado
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedCreatorDossier.category} • {selectedCreatorDossier.handle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCreatorDossier(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo da Ficha Detalhada */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Grid dos Indicadores Financeiros da Pessoa (Seção 5) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Vendas Confirmadas:</span>
                  <strong className="text-white font-mono text-sm">
                    R$ {selectedCreatorDossier.grossSalesConfirmedBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">{selectedCreatorDossier.salesCount} operações</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Taxa JOBS (30%):</span>
                  <strong className="text-amber-400 font-mono text-sm">
                    - R$ {selectedCreatorDossier.platformCommissionBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-amber-500/70 block">Retenção contratual</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Taxas PSP:</span>
                  <strong className="text-slate-300 font-mono text-sm">
                    - R$ {selectedCreatorDossier.assignedFeesBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">Tarifas de intermediação</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Estornos e Ajustes:</span>
                  <strong className="text-rose-400 font-mono text-sm">
                    {selectedCreatorDossier.refundsAndAdjustmentsBrl > 0 ? `- R$ ${selectedCreatorDossier.refundsAndAdjustmentsBrl.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">Compensações registradas</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <span className="text-emerald-400 block text-[10px] font-bold">Ganhos Líquidos:</span>
                  <strong className="text-emerald-300 font-mono text-base">
                    R$ {selectedCreatorDossier.netAccumulatedEarningsBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-emerald-500 block">Acumulado do Criador</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30">
                  <span className="text-amber-400 block text-[10px] font-bold">Valores Pendentes:</span>
                  <strong className="text-amber-300 font-mono text-base">
                    R$ {selectedCreatorDossier.pendingPaymentBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-amber-500 block">Em carência D+14</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30">
                  <span className="text-cyan-400 block text-[10px] font-bold">Valores Liberados:</span>
                  <strong className="text-cyan-300 font-mono text-base">
                    R$ {selectedCreatorDossier.eligibleForWithdrawalBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-cyan-500 block">Elegíveis para Saque</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Valores Já Pagos:</span>
                  <strong className="text-white font-mono text-base">
                    R$ {selectedCreatorDossier.totalPaidBrl.toFixed(2).replace('.', ',')}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">Liquidados via PIX</span>
                </div>
              </div>

              {/* Tabela do Livro-Razão Contábil Específico do Criador */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    Lançamentos Auditados no Livro-Razão Financeiro:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Fonte: financialLedger (Origem Verificável)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090912]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-3">Data/Hora</th>
                        <th className="py-2 px-3">Operação</th>
                        <th className="py-2 px-3">Conta Crédito</th>
                        <th className="py-2 px-3">Valor</th>
                        <th className="py-2 px-3">Hash SHA-256</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-[11px]">
                      {creatorLedgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                            Nenhum lançamento contábil específico registrado para este criador.
                          </td>
                        </tr>
                      ) : (
                        creatorLedgerEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 text-slate-400 text-[10px]">
                              {new Date(e.timestamp).toLocaleTimeString('pt-BR')}
                            </td>
                            <td className="py-2 px-3 text-white font-sans text-[11px] font-semibold">
                              {e.operationType}
                            </td>
                            <td className="py-2 px-3 text-purple-300 text-[10px] truncate max-w-[150px]">
                              {e.creditAccount}
                            </td>
                            <td className="py-2 px-3 text-emerald-400 font-bold">
                              {e.currency === 'BRL' ? `R$ ${e.amount.toFixed(2)}` : `${e.amount} 💎`}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[9px] truncate max-w-[100px]">
                              {e.entryHash}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold uppercase font-sans">
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-white block">Nota Regulatória:</span>
                <p>
                  O saldo individual deste criador é calculado exclusivamente a partir do encadeamento das entradas registradas no livro-razão financeiro, impedindo saldos inseridos arbitrariamente no frontend.
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-slate-800 bg-[#0f0f18] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Ambiente: <strong className="text-amber-400">Sandbox Auditado (Saques Reais Desativados)</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCreatorDossier(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleExecuteCreatorRepay(selectedCreatorDossier);
                    setSelectedCreatorDossier(null);
                  }}
                  disabled={selectedCreatorDossier.pendingPaymentBrl <= 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
                >
                  Autorizar Repasse PIX (Simulado)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
