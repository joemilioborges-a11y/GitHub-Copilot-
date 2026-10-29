import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Lock,
  CheckCircle2,
  HelpCircle,
  Hash,
  Scale,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  financialLedger,
  DailyFinancialEvolutionResult,
  DailyFinancialMetricPoint,
  PersistentDailySnapshot,
} from '../../services/ledgerService';

interface OfficialFinancialEvolutionChartProps {
  environment: 'sandbox' | 'production';
  period?: '7days' | '14days' | '30days' | 'all';
  onPeriodChange?: (period: '7days' | '14days' | '30days' | 'all') => void;
  onOpenLedger?: () => void;
}

export const OfficialFinancialEvolutionChart: React.FC<OfficialFinancialEvolutionChartProps> = ({
  environment,
  period = '7days',
  onPeriodChange,
  onOpenLedger,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<DailyFinancialMetricPoint | null>(null);
  const [showAuditDocumentation, setShowAuditDocumentation] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Consulta do resultado oficial de evolução histórica
  const evolutionResult: DailyFinancialEvolutionResult = useMemo(() => {
    void refreshTick;
    return financialLedger.getDailyFinancialEvolution(period, environment);
  }, [environment, period, refreshTick]);

  // Validação da cadeia de snapshots diários persistentes (Regra 9)
  const snapshotsAudit = useMemo(() => {
    void refreshTick;
    return financialLedger.verifySnapshotsConsistency(environment);
  }, [environment, refreshTick]);

  const { points, summary } = evolutionResult;
  const isProd = environment === 'production';

  // Formatação monetária segura
  const formatBrl = (val: number | null | undefined): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) {
      return 'N/D';
    }
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Cálculo da escala do gráfico
  const maxAvailableBalance = Math.max(
    1,
    ...points.map((p) => (p.availableBalance !== null ? p.availableBalance : 0))
  );
  const maxNetRevenue = Math.max(
    1,
    ...points.map((p) => (p.netRevenue !== null ? p.netRevenue : 0))
  );
  const chartMaxScale = Math.max(maxAvailableBalance, maxNetRevenue, 10);

  return (
    <div
      data-testid="official-financial-evolution-chart-container"
      className="p-4 sm:p-5 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-4 text-slate-200"
    >
      {/* 1. CABEÇALHO COM IDENTIFICAÇÃO DE FONTE E AMBIENTE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Evolução Histórica Oficial: Receita Líquida e Saldo Disponível</span>
            </h4>
            <span
              data-testid="chart-source-badge"
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300"
            >
              Fonte: {summary.dataSource}
            </span>
            <span
              data-testid="chart-env-badge"
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                isProd
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}
            >
              {isProd ? 'Produção Real' : 'Sandbox Auditado'}
            </span>
            {snapshotsAudit.isConsistent ? (
              <span
                data-testid="snapshots-consistent-badge"
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                title={`Cadeia de ${snapshotsAudit.totalSnapshots} snapshots verificada com SHA-256`}
              >
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Snapshots SHA-256: 100% Íntegros</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Alerta de Consistência nos Snapshots
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Valores verificáveis extraídos progressivamente do livro-razão contábil. Proibida reconstrução retroativa a partir do saldo atual.
          </p>
        </div>

        {/* Controles de Período e Legenda */}
        <div className="flex flex-wrap items-center gap-2">
          {onPeriodChange && (
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              {(['7days', '14days', '30days', 'all'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    period === p ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === '7days' ? '7 Dias' : p === '14days' ? '14 Dias' : p === '30days' ? '30 Dias' : 'Todo o Histórico'}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Recalcular pontos do livro-razão"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. LEGENDA OFICIAL DAS MÉTRICAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-slate-300 font-semibold">Receita Líquida (30% JOBS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500" />
            <span className="text-slate-300 font-semibold">Saldo Disponível (Caixa Livre)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-400/60" />
            <span className="text-slate-400">Dia sem Movimentação (Saldo Mantido)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAuditDocumentation(!showAuditDocumentation)}
          className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showAuditDocumentation ? 'Ocultar Regras Contábeis' : 'Ver Regras Contábeis (1 a 10)'}</span>
        </button>
      </div>

      {/* DOCUMENTAÇÃO DAS REGRAS CONTÁBEIS (SE EXPANDIDA) */}
      {showAuditDocumentation && (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-cyan-300">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>Regras Obrigatórias de Integridade do Histórico Financeiro</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
            <div className="p-2 bg-slate-900/80 rounded-lg space-y-1">
              <strong className="text-white block">1. Semântica da Receita Líquida:</strong>
              <p className="text-slate-400">{summary.metricsSemantics.netRevenueDefinition}</p>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-lg space-y-1">
              <strong className="text-white block">2. Semântica do Saldo Disponível:</strong>
              <p className="text-slate-400">{summary.metricsSemantics.availableBalanceDefinition}</p>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-lg space-y-1">
              <strong className="text-white block">3. Preservação em Dias sem Registros:</strong>
              <p className="text-slate-400">
                Dias sem lançamentos não zeram o saldo disponível. O valor acumulado do dia anterior é preservado progressivamente.
              </p>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-lg space-y-1">
              <strong className="text-white block">4. Tratamento de Estornos Posteriores:</strong>
              <p className="text-slate-400">{summary.metricsSemantics.contingencyPolicy}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESUMO OFICIAL DO PERÍODO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Receita Líquida do Período</span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {formatBrl(summary.totalPeriodNetRevenue)}
          </div>
          <span className="text-[9px] text-slate-500">Média: {formatBrl(summary.averageDailyNetRevenue)}/dia</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Saldo Disponível no Fechamento</span>
          <div className="text-lg font-black text-cyan-300 font-mono">
            {formatBrl(summary.finalAvailableBalance)}
          </div>
          <span className="text-[9px] text-emerald-400 font-semibold">Livre de 70% e reservas</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Dias com Movimentação</span>
          <div className="text-lg font-black text-white font-mono">
            {summary.daysWithMovement} / {summary.totalDays} dias
          </div>
          <span className="text-[9px] text-slate-400">
            {summary.totalDays - summary.daysWithMovement} dias sem movimento (saldo preservado)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Pico Diário de Receita</span>
          <div className="text-lg font-black text-amber-300 font-mono">
            {formatBrl(summary.peakDailyRevenue)}
          </div>
          <span className="text-[9px] text-slate-400 font-mono">{summary.peakDate}</span>
        </div>
      </div>

      {/* 4. VISUALIZAÇÃO GRÁFICA / EMPTY STATE */}
      {isProd && points.length === 0 ? (
        // REGRA 6: Mensagem explícita de histórico insuficiente / ausente em Produção
        <div
          data-testid="production-insufficient-history-card"
          className="p-6 rounded-2xl bg-slate-950 border border-amber-500/40 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h5 className="text-sm font-bold text-white">
              Histórico Financeiro Indisponível em Produção Real
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              O ambiente de Produção Real não possui registros anteriores de liquidação financeira. Conforme as regras contábeis auditadas, é estritamente proibido simular, inventar ou extrapolar pontos gráficos fictícios.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {onOpenLedger && (
              <button
                type="button"
                onClick={onOpenLedger}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inspecionar Livro-Razão</span>
              </button>
            )}
          </div>
        </div>
      ) : points.length === 0 ? (
        // Empty state genérico
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
          Nenhum ponto histórico disponível para o período selecionado.
        </div>
      ) : (
        // Gráfico de Barras Proporcionais Auditadas
        <div className="space-y-2">
          <div
            data-testid="official-financial-evolution-bar-grid"
            className="grid gap-1.5 pt-3 items-end h-40 border-b border-slate-800/80 pb-3"
            style={{
              gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
            }}
          >
            {points.map((pt) => {
              const isNoMovement = pt.reconciliationStatus === 'sem_movimento';
              const netRev = pt.netRevenue ?? 0;
              const availBal = pt.availableBalance ?? 0;

              const heightNetRevPct = Math.max(
                4,
                Math.min(100, Math.round((netRev / chartMaxScale) * 100))
              );
              const heightAvailBalPct = Math.max(
                6,
                Math.min(100, Math.round((availBal / chartMaxScale) * 100))
              );

              const isSelected = selectedPoint?.date === pt.date;

              return (
                <div
                  key={pt.date}
                  data-testid={`point-col-${pt.date}`}
                  onClick={() => setSelectedPoint(pt)}
                  className={`flex flex-col items-center gap-1 h-full justify-end group cursor-pointer transition-all ${
                    isSelected ? 'opacity-100 ring-1 ring-cyan-400 rounded-lg p-0.5' : 'hover:opacity-100'
                  }`}
                  title={`${pt.fullDateLabel}\nReceita Líquida: ${formatBrl(pt.netRevenue)}\nSaldo Disponível: ${formatBrl(pt.availableBalance)}\nStatus: ${pt.reconciliationStatus}${pt.notes ? `\nNota: ${pt.notes}` : ''}`}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-28">
                    {/* Barra de Receita Líquida */}
                    <div
                      data-testid={`bar-netrev-${pt.date}`}
                      className={`w-2.5 sm:w-3.5 rounded-t transition-all ${
                        isNoMovement
                          ? 'bg-emerald-500/30'
                          : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                      }`}
                      style={{ height: `${heightNetRevPct}%` }}
                    />
                    {/* Barra de Saldo Disponível (Preservado progressivamente) */}
                    <div
                      data-testid={`bar-availbal-${pt.date}`}
                      className={`w-2.5 sm:w-3.5 rounded-t transition-all ${
                        isNoMovement
                          ? 'bg-cyan-500/40 border-t border-cyan-300'
                          : 'bg-cyan-500/80 group-hover:bg-cyan-300'
                      }`}
                      style={{ height: `${heightAvailBalPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors truncate">
                    {pt.displayDate}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
            <span>
              Mostrando {points.length} datas oficiais verificáveis ({points[0]?.date} a {points[points.length - 1]?.date})
            </span>
            <span>Clique em qualquer data para inspecionar os valores auditados e hash SHA-256</span>
          </div>
        </div>
      )}

      {/* 5. DOSSIÊ DO PONTO SELECIONADO (INSPEÇÃO DE INTEGRIDADE HISTÓRICA) */}
      {selectedPoint && (
        <div
          data-testid="selected-point-dossier"
          className="p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-white">{selectedPoint.fullDateLabel}</strong>
              <span className="font-mono text-slate-400">({selectedPoint.date})</span>
              <span
                className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                  selectedPoint.reconciliationStatus === 'conciliado'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedPoint.reconciliationStatus === 'sem_movimento'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {selectedPoint.reconciliationStatus === 'conciliado'
                  ? 'Conciliado'
                  : selectedPoint.reconciliationStatus === 'sem_movimento'
                  ? 'Sem Movimentação (Saldo Preservado)'
                  : 'Sem Dados'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPoint(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-slate-900 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Receita Líquida (Dia)</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {formatBrl(selectedPoint.netRevenue)}
              </strong>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Saldo Disponível (Fechamento)</span>
              <strong className="text-cyan-300 font-mono text-sm">
                {formatBrl(selectedPoint.availableBalance)}
              </strong>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Volume Bruto Transacionado</span>
              <strong className="text-white font-mono text-sm">
                {formatBrl(selectedPoint.grossVolume)}
              </strong>
            </div>

            <div className="p-2 bg-slate-900 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Repasse Criadores (70%)</span>
              <strong className="text-purple-300 font-mono text-sm">
                {formatBrl(selectedPoint.creatorShare)}
              </strong>
            </div>
          </div>

          {selectedPoint.notes && (
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{selectedPoint.notes}</span>
            </div>
          )}

          {selectedPoint.sha256Hash && (
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
              <span className="truncate">Hash SHA-256 do Snapshot: {selectedPoint.sha256Hash}</span>
              <span className="text-emerald-400 font-bold shrink-0 ml-2">Auditado</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
