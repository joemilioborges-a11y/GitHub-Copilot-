import React, { useState, useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  PieChart,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Info,
  FileSearch,
  RefreshCw,
  CheckCircle2,
  Coins,
  Scale,
  History,
  Filter,
  Lock,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { financialLedger } from '../../services/ledgerService';
import { monetizationService } from '../../services/monetizationService';
import { vrSimulatorService } from '../../services/vrSimulatorService';
import {
  buildOfficialLedgerRevenueReport,
  buildVrSimulatorRevenueReport,
  RevenueReportDataSource,
  RevenueReportPeriodFilter,
  ServiceRevenueCategoryKey,
  TraceableOriginTransaction,
} from '../../utils/revenueAndEarningsReport';

const formatBrl = (val: number | null | undefined): string => {
  if (val === null || val === undefined || !Number.isFinite(val)) {
    return 'Dados insuficientes';
  }
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const RevenueAndEarningsReportPanel: React.FC = () => {
  const [dataSource, setDataSource] = useState<RevenueReportDataSource>('official_ledger');
  const [period, setPeriod] = useState<RevenueReportPeriodFilter>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ServiceRevenueCategoryKey | 'all'>('all');
  const [inspectingServiceKey, setInspectingServiceKey] = useState<ServiceRevenueCategoryKey | 'all'>('all');
  const [refreshTick, setRefreshTick] = useState(0);

  const report = useMemo(() => {
    void refreshTick;
    if (dataSource === 'vr_simulator_sandbox') {
      const snap = vrSimulatorService.getStateSnapshot();
      const sandboxEntries = vrSimulatorService.getAllSandboxLedgerEntries();
      const simPayouts = vrSimulatorService.getAllSimulatedPayoutRecords();
      return buildVrSimulatorRevenueReport({
        period,
        sandboxEntries,
        sandboxPayouts: simPayouts,
        baseSimulatedDateIso: snap.baseSimulatedDateIso,
        currentSimDay: snap.currentDay,
      });
    }

    const entries = financialLedger.getEntries();
    const payouts = [
      ...financialLedger.getPayoutRecords('production'),
      ...financialLedger.getPayoutRecords('sandbox'),
    ];
    const purchases = monetizationService.getPurchases();

    return buildOfficialLedgerRevenueReport({
      period,
      entriesOverride: entries,
      payoutsOverride: payouts,
      purchasesOverride: purchases,
    });
  }, [dataSource, period, refreshTick]);

  // Dados para o Gráfico de Pizza (Fase 2)
  const pieChartData = useMemo(() => {
    return report.pieChartServices
      .filter((s) => s.grossConfirmedBrl > 0 || s.netRevenueBrl > 0)
      .map((s) => ({
        name: s.shortLabel,
        fullName: s.serviceLabel,
        serviceKey: s.serviceKey,
        value: Number(Math.max(0, s.netRevenueBrl).toFixed(2)),
        grossBrl: s.grossConfirmedBrl,
        refundedBrl: s.refundedBrl,
        netBrl: s.netRevenueBrl,
        creatorShareBrl: s.creatorShareBrl,
        platformCommissionBrl: s.platformCommissionBrl,
        isEligibleFor70_30: s.isEligibleFor70_30,
        transactionsCount: s.transactionsCount,
        colorHex: s.colorHex,
      }));
  }, [report.pieChartServices]);

  // Dados para o Gráfico de Barras Comparativo (Fase 3)
  const filteredBarCategories = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return report.barChartCategories;
    }
    return report.barChartCategories.filter((c) => c.serviceKey === selectedCategoryFilter);
  }, [report.barChartCategories, selectedCategoryFilter]);

  const barChartData = useMemo(() => {
    return filteredBarCategories.map((c) => {
      const cashContributionBrl = c.isCashInflowOnly
        ? c.netRevenueBrl
        : c.platformCommissionBrl !== null
        ? c.platformCommissionBrl
        : 0;
      return {
        name: c.shortLabel,
        fullName: c.serviceLabel,
        serviceKey: c.serviceKey,
        recebidoBruto: c.grossConfirmedBrl,
        estornos: c.refundedBrl,
        receitaLiquida: c.netRevenueBrl,
        obrigacaoCriador70: c.creatorShareBrl ?? 0,
        comissaoOuCaixaJobs: cashContributionBrl,
        txCount: c.transactionsCount,
        isEligibleFor70_30: c.isEligibleFor70_30,
      };
    });
  }, [filteredBarCategories]);

  // Transações rastreáveis filtradas para auditoria (Fase 5)
  const visibleOriginTransactions = useMemo((): TraceableOriginTransaction[] => {
    if (inspectingServiceKey === 'all') {
      return report.originTransactions;
    }
    return report.originTransactions.filter((tx) => tx.serviceKey === inspectingServiceKey);
  }, [report.originTransactions, inspectingServiceKey]);

  const reconciliationCards = useMemo(() => {
    const r = report.reconciliation;
    return [
      r.totalReceived,
      r.totalRefunded,
      r.netRecognizedRevenue,
      r.pendingCreatorObligations,
      r.settledPayouts,
      r.recordedFees,
      r.availableJobsCash,
    ];
  }, [report.reconciliation]);

  return (
    <div
      className="space-y-6 text-slate-200"
      data-testid="revenue-and-earnings-report-panel"
    >
      {/* CABEÇALHO E CONTROLES DE FONTE + PERÍODO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Scale className="w-3.5 h-3.5" />
                Auditoria & Reconciliação 70/30
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Lock className="w-3 h-3 text-cyan-400" />
                Somente Leitura · Histórico Imutável
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Relatório Financeiro de Receitas por Serviço e Geração de Ganhos
            </h3>
            <p className="text-xs text-slate-400">
              Fonte ativa: <span className="text-slate-200 font-semibold">{report.sourceLabel}</span> · Período:{' '}
              <span className="text-emerald-400 font-semibold">{report.periodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Fonte Contábil Isolada */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setDataSource('official_ledger')}
                data-testid="report-source-official-btn"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataSource === 'official_ledger'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Livro-Razão Oficial
              </button>
              <button
                type="button"
                onClick={() => setDataSource('vr_simulator_sandbox')}
                data-testid="report-source-vr-btn"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataSource === 'vr_simulator_sandbox'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sandbox Simulador VR
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Recalcular a partir dos registros atuais"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Filtro de Período */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Período de Apuração:
            </span>
            {(
              [
                { id: 'all', label: 'Todo o Histórico' },
                { id: '30days', label: 'Últimos 30 Dias' },
                { id: '7days', label: 'Últimos 7 Dias' },
                { id: 'today', label: 'Hoje (24h)' },
                { id: 'empty_period', label: 'Período Sem Movimento (Teste)' },
              ] as Array<{ id: RevenueReportPeriodFilter; label: string }>
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                data-testid={`report-period-${p.id}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span>
              Transações auditadas: <strong className="text-white">{report.totalAuditedTransactionsCount}</strong>
            </span>
            <span>
              Duplicidades bloqueadas: <strong className="text-emerald-400">{report.duplicatesIgnoredCount}</strong>
            </span>
            <span>
              Moeda contábil: <strong className="text-cyan-300">{report.currency} (Créditos virtuais isolados)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ALERTA DE PERÍODO SEM DADOS (QUANDO APLICÁVEL) */}
      {!report.hasDataInPeriod && (
        <div
          className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3"
          data-testid="empty-period-banner"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-200">
              Dados insuficientes no período selecionado ({report.periodLabel})
            </p>
            <p className="text-amber-300/90 leading-relaxed">
              {report.emptyPeriodReason ||
                'Não existem lançamentos financeiros registrados no intervalo selecionado. Nenhum saldo atual foi repetido artificialmente em datas sem movimentação.'}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FASE 4 — RECONCILIAÇÃO FINANCEIRA (7 INDICADORES RECONCILIÁVEIS)      */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Reconciliação Financeira e Posição de Caixa (BRL)
            </h4>
            <p className="text-xs text-slate-400">
              Cálculo estrito a partir de registros reais reconciliáveis. O caixa disponível nunca é obtido pela simples soma de comissões e jamais contabiliza créditos virtuais como moeda fiduciária.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
              report.reconciliation.isReconciled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {report.reconciliation.isReconciled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Equação Contábil Reconciliada (Divergência R$ 0,00)
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Divergência Detectada ({report.reconciliation.reconciliationDeltaCents} centavos)
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {reconciliationCards.map((metric) => {
            const isInsufficient = metric.status === 'insufficient_data';
            const isHighlightCash = metric.key === 'available_jobs_cash';
            return (
              <div
                key={metric.key}
                data-testid={`reconciled-metric-${metric.key}`}
                className={`rounded-xl p-3.5 border flex flex-col justify-between gap-2 ${
                  isHighlightCash
                    ? 'bg-emerald-950/25 border-emerald-500/40 sm:col-span-2'
                    : isInsufficient
                    ? 'bg-slate-900/70 border-amber-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {metric.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        isInsufficient
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isInsufficient ? 'Dados insuficientes' : `${metric.traceableCount} reg.`}
                    </span>
                  </div>

                  <div
                    className={`text-lg font-extrabold tracking-tight ${
                      isInsufficient
                        ? 'text-amber-300 text-sm py-1'
                        : isHighlightCash
                        ? 'text-emerald-400 text-xl'
                        : metric.key === 'total_refunded'
                        ? 'text-rose-400'
                        : 'text-white'
                    }`}
                  >
                    {metric.formattedDisplay}
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/70 text-[11px]">
                  <p className="text-slate-300 leading-snug">{metric.explanation}</p>
                  <p className="text-slate-500 font-mono text-[10px]">{metric.formulaSummary}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota de Auditoria sobre Créditos Virtuais e Caixa */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {report.nonEligibleCashInflows.explanation}{' '}
              {report.creatorRewardsAndAdjustments.explanation}
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 shrink-0">
            Split 70/30 Elegível: {formatBrl(report.eligibleTotals.creatorShare70Brl)} (70%) +{' '}
            {formatBrl(report.eligibleTotals.platformCommission30Brl)} (30%) ={' '}
            {formatBrl(report.eligibleTotals.netRevenueBrl)}
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FASE 2 — GRÁFICO DE PIZZA: COMPOSIÇÃO DAS RECEITAS POR SERVIÇO        */}
      {/* ===================================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Composição das Receitas por Serviço (Gráfico de Pizza & Regra 70/30)
            </h4>
            <p className="text-xs text-slate-400">
              Apresenta receita bruta confirmada, estornos contabilizados, receita líquida, parcela de 70% ao criador e comissão de 30% do JOBS exclusivamente nos serviços elegíveis.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Período: <strong className="text-white">{report.periodLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Coluna do Gráfico de Pizza Recharts */}
          <div className="lg:col-span-5 h-72 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {pieChartData.map((entry) => (
                      <Cell key={entry.serviceKey} fill={entry.colorHex} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown, _name: unknown, item: { payload?: typeof pieChartData[number] }) => {
                      const p = item?.payload;
                      const num = typeof value === 'number' ? value : Number(value || 0);
                      if (!p) return [formatBrl(num), 'Receita Líquida'];
                      const splitInfo = p.isEligibleFor70_30
                        ? ` | 70% Criador: ${formatBrl(p.creatorShareBrl)} | 30% JOBS: ${formatBrl(p.platformCommissionBrl)}`
                        : ' | Sem Split 70/30 (Entrada de Caixa)';
                      return [`${formatBrl(num)}${splitInfo}`, p.fullName];
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2 p-6">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-amber-200">Dados insuficientes para o Gráfico de Pizza</p>
                <p className="text-[11px] text-slate-400">
                  Não há receitas confirmadas no período selecionado ({report.periodLabel}).
                </p>
              </div>
            )}
          </div>

          {/* Tabela Detalhada por Serviço (Fase 2) */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <th className="py-2 pr-3">Serviço</th>
                  <th className="py-2 px-2 text-right">Bruta Confirmada</th>
                  <th className="py-2 px-2 text-right">Estornos</th>
                  <th className="py-2 px-2 text-right">Receita Líquida</th>
                  <th className="py-2 px-2 text-right">Criador (70%)</th>
                  <th className="py-2 px-2 text-right">Comissão JOBS (30%)</th>
                  <th className="py-2 px-2 text-center">Qtd.</th>
                  <th className="py-2 pl-2 text-right">Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.barChartCategories.map((srv) => (
                  <tr key={srv.serviceKey} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: srv.colorHex }}
                        />
                        <div>
                          <div className="font-semibold text-white">{srv.shortLabel}</div>
                          <div className="text-[10px] text-slate-400">
                            {srv.isEligibleFor70_30 ? 'Elegível 70/30' : 'Sem Split 70/30'} · {srv.periodLabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-200">
                      {formatBrl(srv.grossConfirmedBrl)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-rose-400">
                      {srv.refundedBrl > 0 ? `- ${formatBrl(srv.refundedBrl)}` : 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                      {formatBrl(srv.netRevenueBrl)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {srv.isEligibleFor70_30 && srv.creatorShareBrl !== null ? (
                        <span className="text-cyan-300 font-semibold">{formatBrl(srv.creatorShareBrl)}</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Não aplicável</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {srv.isEligibleFor70_30 && srv.platformCommissionBrl !== null ? (
                        <span className="text-emerald-400 font-semibold">
                          {formatBrl(srv.platformCommissionBrl)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Não aplicável</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                      {srv.transactionsCount}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectingServiceKey(srv.serviceKey)}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileSearch className="w-3 h-3" />
                        Origem ({srv.originTransactions.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold text-xs">
                  <td className="py-2.5 pr-3 text-emerald-300">
                    Subtotal Serviços Elegíveis (Regra 70/30)
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-white">
                    {formatBrl(report.eligibleTotals.grossConfirmedBrl)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-rose-400">
                    {report.eligibleTotals.refundedBrl > 0
                      ? `- ${formatBrl(report.eligibleTotals.refundedBrl)}`
                      : 'R$ 0,00'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-white">
                    {formatBrl(report.eligibleTotals.netRevenueBrl)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-cyan-300">
                    {formatBrl(report.eligibleTotals.creatorShare70Brl)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-emerald-400">
                    {formatBrl(report.eligibleTotals.platformCommission30Brl)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-white">
                    {report.eligibleTotals.transactionsCount}
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => setInspectingServiceKey('all')}
                      className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Ver todas
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FASE 3 — GRÁFICO DE BARRAS COMPARATIVO POR SERVIÇO E CATEGORIA        */}
      {/* ===================================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Comparativo de Entradas Financeiras, Estornos, Obrigações e Caixa por Serviço
            </h4>
            <p className="text-xs text-slate-400">
              Distingue recebimentos brutos confirmados, estornos separados, receita líquida reconhecida, obrigações com criadores (70%) e comissão/entrada no caixa JOBS.
            </p>
          </div>

          {/* Filtro por Categoria no Gráfico de Barras */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Categoria:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todas ({report.barChartCategories.length})
            </button>
            {report.barChartCategories.map((cat) => (
              <button
                key={cat.serviceKey}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.serviceKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  selectedCategoryFilter === cat.serviceKey
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          {barChartData.some((d) => d.recebidoBruto > 0 || d.estornos > 0 || d.receitaLiquida > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v: number) => `R$ ${v}`}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    const num = typeof value === 'number' ? value : Number(value || 0);
                    return [formatBrl(num), String(name)];
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="recebidoBruto" name="Recebido Bruto Confirmado" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="estornos" name="Estornos Separados" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receitaLiquida" name="Receita Líquida" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="obrigacaoCriador70" name="Obrigação Criador (70%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comissaoOuCaixaJobs" name="Comissão 30% / Entrada Caixa" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-xs font-bold text-amber-200">
                Dados insuficientes para o Gráfico Comparativo de Barras
              </p>
              <p className="text-[11px] text-slate-400">
                Nenhuma entrada financeira confirmada ou estornada para o filtro selecionado ({report.periodLabel}).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FASE 5 — SÉRIE HISTÓRICA POR DATA E RASTREABILIDADE DE TRANSAÇÕES     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Série Histórica Diária Real (Sem repetição artificial de saldo) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                Histórico Diário por Data de Competência
              </h4>
              <p className="text-[11px] text-slate-400">
                Agrupado pelos timestamps reais das transações, sem projetar saldos atuais em datas passadas.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {report.historicalSeries.length} dia(s)
            </span>
          </div>

          {report.historicalSeries.length > 0 ? (
            <div className="max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-1.5">Data</th>
                    <th className="py-1.5 text-right">Bruto</th>
                    <th className="py-1.5 text-right">Estornos</th>
                    <th className="py-1.5 text-right">Líquido 70/30</th>
                    <th className="py-1.5 text-right">Caixa Fiat</th>
                    <th className="py-1.5 text-center">Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.historicalSeries.map((pt) => (
                    <tr key={pt.dateIso} className="hover:bg-slate-800/40">
                      <td className="py-2 font-mono text-slate-200">{pt.dateIso}</td>
                      <td className="py-2 text-right font-mono text-slate-300">
                        {formatBrl(pt.grossConfirmedBrl)}
                      </td>
                      <td className="py-2 text-right font-mono text-rose-400">
                        {pt.refundedBrl > 0 ? `- ${formatBrl(pt.refundedBrl)}` : 'R$ 0,00'}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-emerald-400">
                        {formatBrl(pt.netRecognizedBrl)}
                      </td>
                      <td className="py-2 text-right font-mono text-cyan-300">
                        {formatBrl(pt.fiatCashInBrl)}
                      </td>
                      <td className="py-2 text-center font-mono text-slate-400">
                        {pt.transactionsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Dados insuficientes: nenhuma data com movimentação no período selecionado.
            </div>
          )}
        </div>

        {/* Trilha de Auditoria das Transações de Origem (Fase 5) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-cyan-400" />
                Rastreabilidade das Transações de Origem ({visibleOriginTransactions.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                Cada valor agregado nos gráficos pode ser auditado até seu ID, chave de idempotência e hash SHA-256.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setInspectingServiceKey('all')}
                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  inspectingServiceKey === 'all'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todos ({report.originTransactions.length})
              </button>
              {report.barChartCategories.map((c) => (
                <button
                  key={c.serviceKey}
                  type="button"
                  onClick={() => setInspectingServiceKey(c.serviceKey)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    inspectingServiceKey === c.serviceKey
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {c.shortLabel} ({c.originTransactions.length})
                </button>
              ))}
            </div>
          </div>

          {visibleOriginTransactions.length > 0 ? (
            <div className="max-h-80 overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-1.5 pr-2">ID / Data</th>
                    <th className="py-1.5 px-2">Serviço & Operação</th>
                    <th className="py-1.5 px-2 text-right">Líquido</th>
                    <th className="py-1.5 px-2 text-right">Split 70 / 30</th>
                    <th className="py-1.5 pl-2">Idempotência & Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleOriginTransactions.map((tx) => (
                    <tr key={`${tx.transactionId}_${tx.idempotencyKey}`} className="hover:bg-slate-800/40">
                      <td className="py-2 pr-2 align-top">
                        <div className="font-mono text-[11px] text-white font-semibold">
                          {tx.transactionId}
                        </div>
                        <div className="text-[10px] text-slate-400">{tx.displayDate}</div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            tx.status === 'refunded'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {tx.status === 'refunded' ? 'Estornado' : 'Confirmado'}
                        </span>
                      </td>
                      <td className="py-2 px-2 align-top">
                        <div className="font-semibold text-slate-200">{tx.serviceLabel}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{tx.description}</div>
                        {tx.targetCreatorId && (
                          <div className="text-[10px] text-cyan-400 font-mono">
                            Criador: {tx.targetCreatorId}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono align-top">
                        <div className="font-bold text-white">{formatBrl(tx.netRevenueBrl)}</div>
                        {tx.refundedBrl > 0 && (
                          <div className="text-[10px] text-rose-400">
                            Estorno: -{formatBrl(tx.refundedBrl)}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[11px] align-top">
                        {tx.isEligibleFor70_30 ? (
                          <div>
                            <div className="text-cyan-300">70%: {formatBrl(tx.creatorShareBrl)}</div>
                            <div className="text-emerald-400">
                              30%: {formatBrl(tx.platformCommissionBrl)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Sem Split 70/30</span>
                        )}
                      </td>
                      <td className="py-2 pl-2 align-top font-mono text-[10px] text-slate-400">
                        <div className="truncate max-w-[170px]" title={tx.idempotencyKey}>
                          idemp: {tx.idempotencyKey}
                        </div>
                        {tx.entryHashes[0] && (
                          <div className="truncate max-w-[170px] text-slate-500" title={tx.entryHashes[0]}>
                            sha256: {tx.entryHashes[0].slice(0, 18)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              <span>Nenhuma transação de origem encontrada para o filtro selecionado.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
