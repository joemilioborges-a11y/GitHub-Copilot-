import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Coins,
  Scale,
  History,
  Lock,
  Info,
  Sliders,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { monetizationService } from '../../services/monetizationService';
import {
  revenueSimulatorService,
  MANDATORY_REFERENCE_SCENARIO,
  SimulatorEnvironment,
  formatCentsToBrl,
} from '../../services/revenueSimulatorService';

export const AdminRevenueSimulatorPanel: React.FC = () => {
  const packages = useMemo(() => monetizationService.getPackages(false), []);

  // Estado inicial configurado estritamente com o Cenário de Referência Obrigatório (Seção 2)
  const [selectedPackageId, setSelectedPackageId] = useState<string>(MANDATORY_REFERENCE_SCENARIO.packageId);
  const [salesQuantity, setSalesQuantity] = useState<number>(MANDATORY_REFERENCE_SCENARIO.salesQuantity);
  const [paidDiamondsPerSale, setPaidDiamondsPerSale] = useState<number>(
    MANDATORY_REFERENCE_SCENARIO.paidDiamondsPerSale
  );
  const [bonusDiamondsPerSale, setBonusDiamondsPerSale] = useState<number>(
    MANDATORY_REFERENCE_SCENARIO.bonusDiamondsPerSale
  );
  const [pricePerPackageCents, setPricePerPackageCents] = useState<number>(
    MANDATORY_REFERENCE_SCENARIO.referencePricePerPackageCents
  );
  const [creatorSharePct, setCreatorSharePct] = useState<number>(MANDATORY_REFERENCE_SCENARIO.creatorSharePct);
  const [jobsSharePct, setJobsSharePct] = useState<number>(MANDATORY_REFERENCE_SCENARIO.jobsSharePct);
  const [reserveSharePct, setReserveSharePct] = useState<number>(MANDATORY_REFERENCE_SCENARIO.reserveSharePct);
  const [environment, setEnvironment] = useState<SimulatorEnvironment>('sandbox');

  // Parâmetros contábeis opcionais para o Indicador 11 (Resultado Líquido)
  const [enableCompleteAccountingDeductions, setEnableCompleteAccountingDeductions] = useState<boolean>(false);
  const [gatewayFeesCents, setGatewayFeesCents] = useState<number>(0);
  const [taxesCents, setTaxesCents] = useState<number>(0);
  const [refundsCents, setRefundsCents] = useState<number>(0);
  const [operationalExpensesCents, setOperationalExpensesCents] = useState<number>(0);

  const [refreshHistoryTick, setRefreshHistoryTick] = useState<number>(0);

  // Selecionar pacote do catálogo e carregar seus parâmetros reais
  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const found = packages.find((p) => p.id === pkgId);
    if (found) {
      setPaidDiamondsPerSale(found.creditsAmount);
      setBonusDiamondsPerSale(found.bonusCredits ?? 0);
      setPricePerPackageCents(found.priceInCents);
    }
  };

  // Restaurar o Cenário de Referência Obrigatório (1.000 vendas × Inicial R$ 9,90 | 70/20/10)
  const handleRestoreMandatoryReferenceScenario = () => {
    setSelectedPackageId(MANDATORY_REFERENCE_SCENARIO.packageId);
    setSalesQuantity(MANDATORY_REFERENCE_SCENARIO.salesQuantity);
    setPaidDiamondsPerSale(MANDATORY_REFERENCE_SCENARIO.paidDiamondsPerSale);
    setBonusDiamondsPerSale(MANDATORY_REFERENCE_SCENARIO.bonusDiamondsPerSale);
    setPricePerPackageCents(MANDATORY_REFERENCE_SCENARIO.referencePricePerPackageCents);
    setCreatorSharePct(MANDATORY_REFERENCE_SCENARIO.creatorSharePct);
    setJobsSharePct(MANDATORY_REFERENCE_SCENARIO.jobsSharePct);
    setReserveSharePct(MANDATORY_REFERENCE_SCENARIO.reserveSharePct);
    setEnvironment('sandbox');
    setEnableCompleteAccountingDeductions(false);
    setGatewayFeesCents(0);
    setTaxesCents(0);
    setRefundsCents(0);
    setOperationalExpensesCents(0);
    setRefreshHistoryTick((prev) => prev + 1);
  };

  const simulationEvaluation = useMemo(() => {
    try {
      const pkgFound = packages.find((p) => p.id === selectedPackageId);
      const res = revenueSimulatorService.runSimulation({
        packageId: selectedPackageId,
        packageName: pkgFound ? pkgFound.name : 'Personalizado',
        salesQuantity,
        paidDiamondsPerSale,
        bonusDiamondsPerSale,
        referencePricePerPackageCents: pricePerPackageCents,
        creatorSharePct,
        jobsSharePct,
        reserveSharePct,
        environment,
        actorId: 'admin_master',
        actorRole: 'admin',
        hasApprovedAccountingDefinition: enableCompleteAccountingDeductions,
        estimatedGatewayFeesCents: enableCompleteAccountingDeductions ? gatewayFeesCents : null,
        estimatedTaxesCents: enableCompleteAccountingDeductions ? taxesCents : null,
        estimatedRefundsAndChargebacksCents: enableCompleteAccountingDeductions ? refundsCents : null,
        estimatedOperationalExpensesCents: enableCompleteAccountingDeductions ? operationalExpensesCents : null,
      });
      return { ok: true as const, result: res, error: null };
    } catch (err: any) {
      return {
        ok: false as const,
        result: null,
        error: err?.message || 'Parâmetros inválidos na simulação.',
      };
    }
  }, [
    packages,
    selectedPackageId,
    salesQuantity,
    paidDiamondsPerSale,
    bonusDiamondsPerSale,
    pricePerPackageCents,
    creatorSharePct,
    jobsSharePct,
    reserveSharePct,
    environment,
    enableCompleteAccountingDeductions,
    gatewayFeesCents,
    taxesCents,
    refundsCents,
    operationalExpensesCents,
  ]);

  const executionLogs = useMemo(() => {
    void refreshHistoryTick;
    void simulationEvaluation;
    return revenueSimulatorService.getExecutionLogs().slice(0, 12);
  }, [refreshHistoryTick, simulationEvaluation]);

  const sumPct = Number((creatorSharePct + jobsSharePct + reserveSharePct).toFixed(2));

  return (
    <div data-testid="admin-revenue-simulator-panel" className="space-y-6">
      {/* Banner Superior de Isolamento Sandbox vs Produção & Aviso Contábil */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-[#11111d] to-slate-900 border border-amber-500/40 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                Simulador Administrativo de Receita (70 / 20 / 10)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ISOLAMENTO ATIVO · ledgerMutated: false
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  environment === 'sandbox'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                AMBIENTE: {environment.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Projeção matemática em centavos inteiros para distribuição de receita bruta de vendas de pacotes.{' '}
              <strong className="text-amber-300">
                Nenhuma simulação altera saldos do Livro-Razão (ledgerService), nem gera saques ou créditos reais.
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="restore-reference-scenario-btn"
              onClick={handleRestoreMandatoryReferenceScenario}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar Cenário Padrão (1.000 × R$ 9,90)
            </button>
          </div>
        </div>

        {/* Alerta explícito sobre a Participação Bruta do JOBS (Seção 3) */}
        <div
          data-testid="jobs-gross-share-warning-banner"
          className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200/90"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Regra de Integridade Financeira:</strong> Os valores projetados são
            estimativas matemáticas <strong>antes</strong> de tarifas de pagamento, tributos, reembolsos, estornos e
            despesas operacionais. A participação bruta estimada do JOBS (ex.: <strong>R$ 1.980,00</strong> no cenário
            de referência) <strong>não representa lucro líquido nem caixa confirmado disponível para saque</strong>.
          </div>
        </div>
      </div>

      {/* Painel de Configuração de Parâmetros (Seção 2 e Seção 4) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-400" />
            <h4 className="text-sm font-bold text-white">Parâmetros Configuráveis da Simulação</h4>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Ambiente de Comparação Contábil:</span>
            <button
              type="button"
              onClick={() => setEnvironment('sandbox')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                environment === 'sandbox'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              Sandbox (Testes)
            </button>
            <button
              type="button"
              onClick={() => setEnvironment('production')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                environment === 'production'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              Produção (Isolado)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pacote do Catálogo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Pacote de Referência
            </label>
            <select
              data-testid="sim-package-select"
              value={selectedPackageId}
              onChange={(e) => handleSelectPackage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {formatCentsToBrl(pkg.priceInCents)} ({pkg.creditsAmount} 💎 + {pkg.bonusCredits} 💎 bônus)
                </option>
              ))}
              <option value="pkg_custom">Personalizado (Parâmetros Livres)</option>
            </select>
          </div>

          {/* 2. Quantidade de Vendas (N) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Quantidade de Vendas (N)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              data-testid="sim-sales-quantity-input"
              value={salesQuantity}
              onChange={(e) => setSalesQuantity(Number.parseInt(e.target.value || '0', 10))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 3. Preço de Referência por Pacote (em Centavos / R$) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Preço por Pacote (Centavos / R$)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                data-testid="sim-price-cents-input"
                value={pricePerPackageCents}
                onChange={(e) => setPricePerPackageCents(Number.parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
              />
              <span className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-emerald-400 shrink-0">
                {formatCentsToBrl(pricePerPackageCents)}
              </span>
            </div>
          </div>

          {/* 4. Diamantes Pagos + Bônus por Venda */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                💎 Pagos / Venda
              </label>
              <input
                type="number"
                min={0}
                step={1}
                data-testid="sim-paid-diamonds-input"
                value={paidDiamondsPerSale}
                onChange={(e) => setPaidDiamondsPerSale(Number.parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                💎 Bônus / Venda
              </label>
              <input
                type="number"
                min={0}
                step={1}
                data-testid="sim-bonus-diamonds-input"
                value={bonusDiamondsPerSale}
                onChange={(e) => setBonusDiamondsPerSale(Number.parseInt(e.target.value || '0', 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Alíquotas de Distribuição (Criadores / JOBS / Reserva = 100%) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
              Participação dos Criadores (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              data-testid="sim-creator-pct-input"
              value={creatorSharePct}
              onChange={(e) => setCreatorSharePct(Number.parseFloat(e.target.value || '0'))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              Participação Bruta JOBS (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              data-testid="sim-jobs-pct-input"
              value={jobsSharePct}
              onChange={(e) => setJobsSharePct(Number.parseFloat(e.target.value || '0'))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Reserva Operacional (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              data-testid="sim-reserve-pct-input"
              value={reserveSharePct}
              onChange={(e) => setReserveSharePct(Number.parseFloat(e.target.value || '0'))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                sumPct === 100
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
              }`}
            >
              <span>Soma das Alíquotas:</span>
              <span>{sumPct}% {sumPct === 100 ? '✓' : '(Exige 100%)'}</span>
            </div>
          </div>
        </div>

        {/* Seção Opcional: Apuração de Deduções para Resultado Líquido (Indicador 11) */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCompleteAccountingDeductions}
                onChange={(e) => setEnableCompleteAccountingDeductions(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Informar tarifas de pagamento, tributos, estornos e despesas operacionais completas (para calcular o
                Indicador 11 — Resultado Líquido)
              </span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {enableCompleteAccountingDeductions
                ? 'Definição contábil ativa'
                : 'Padrão: "Dados insuficientes" no Resultado Líquido'}
            </span>
          </div>

          {enableCompleteAccountingDeductions && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Tarifas de Gateway (Centavos)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={gatewayFeesCents}
                  onChange={(e) => setGatewayFeesCents(Number.parseInt(e.target.value || '0', 10))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 font-mono">{formatCentsToBrl(gatewayFeesCents)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Tributos Estimados (Centavos)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={taxesCents}
                  onChange={(e) => setTaxesCents(Number.parseInt(e.target.value || '0', 10))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 font-mono">{formatCentsToBrl(taxesCents)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Estornos / Chargebacks (Centavos)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={refundsCents}
                  onChange={(e) => setRefundsCents(Number.parseInt(e.target.value || '0', 10))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 font-mono">{formatCentsToBrl(refundsCents)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">
                  Despesas Operacionais (Centavos)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={operationalExpensesCents}
                  onChange={(e) => setOperationalExpensesCents(Number.parseInt(e.target.value || '0', 10))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatCentsToBrl(operationalExpensesCents)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exibição de Erro de Validação (se o administrador inserir parâmetros inválidos) */}
      {!simulationEvaluation.ok && (
        <div
          data-testid="sim-validation-error-box"
          className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/60 flex items-center gap-3 text-xs text-rose-200 font-semibold"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-bold text-white">Simulação bloqueada por regra de validação:</p>
            <p>{simulationEvaluation.error}</p>
          </div>
        </div>
      )}

      {/* Resultados Matemáticos do Cenário e 11 Indicadores Obrigatórios */}
      {simulationEvaluation.ok && simulationEvaluation.result && (
        <>
          {/* Verificação de Conformidade com o Catálogo Vigente */}
          <div
            data-testid="sim-catalog-verification-banner"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              simulationEvaluation.result.catalogVerification.hasPriceDivergence ||
              simulationEvaluation.result.catalogVerification.hasDiamondsDivergence
                ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>Auditoria de Catálogo:</strong>{' '}
                {simulationEvaluation.result.catalogVerification.verificationMessage}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/70 border border-slate-700 shrink-0">
              Política de Arredondamento: {simulationEvaluation.result.roundingPolicy} (resíduo:{' '}
              {simulationEvaluation.result.roundingRemainderCents} centavo)
            </span>
          </div>

          {/* Quadro Principal: Resultado Matemático Esperado (Seção 2 e Seção 3) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0e1220] via-[#0e0e18] to-[#140e1c] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    Demonstrativo Matemático da Simulação — Pacote {simulationEvaluation.result.inputNormalized.packageName}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cálculo determinístico em centavos inteiros para{' '}
                  <strong className="text-white">
                    {simulationEvaluation.result.inputNormalized.salesQuantity.toLocaleString('pt-BR')} vendas
                  </strong>{' '}
                  ao preço de referência de{' '}
                  <strong className="text-white">
                    {formatCentsToBrl(simulationEvaluation.result.inputNormalized.referencePricePerPackageCents)}
                  </strong>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-emerald-400 font-bold">
                Soma Distribuída = 100% ({formatCentsToBrl(simulationEvaluation.result.totalDistributedCents)})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Receita Bruta Estimada */}
              <div
                data-testid="sim-card-gross-revenue"
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1"
              >
                <span className="text-[11px] text-slate-400 font-medium">Receita Bruta Estimada (100%)</span>
                <div className="text-xl font-black text-white font-mono">
                  {formatCentsToBrl(simulationEvaluation.result.grossEstimatedRevenueCents)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {simulationEvaluation.result.grossEstimatedRevenueCents.toLocaleString('pt-BR')} centavos
                </span>
              </div>

              {/* Participação Bruta dos Criadores (70%) */}
              <div
                data-testid="sim-card-creators-share"
                className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-1"
              >
                <span className="text-[11px] text-rose-300 font-medium">
                  Participação Bruta dos Criadores ({simulationEvaluation.result.inputNormalized.creatorSharePct}%)
                </span>
                <div className="text-xl font-black text-rose-400 font-mono">
                  {formatCentsToBrl(simulationEvaluation.result.creatorsGrossShareCents)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {simulationEvaluation.result.creatorsGrossShareCents.toLocaleString('pt-BR')} centavos (Passivo)
                </span>
              </div>

              {/* Participação Bruta Estimada do JOBS (20%) */}
              <div
                data-testid="sim-card-jobs-share"
                className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-1"
              >
                <span className="text-[11px] text-emerald-300 font-medium">
                  Participação Bruta Estimada do JOBS ({simulationEvaluation.result.inputNormalized.jobsSharePct}%)
                </span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {formatCentsToBrl(simulationEvaluation.result.jobsGrossShareCents)}
                </div>
                <span className="text-[10px] text-amber-300 font-semibold block">
                  Estimativa bruta (Não é lucro líquido)
                </span>
              </div>

              {/* Reserva (10%) */}
              <div
                data-testid="sim-card-reserve-share"
                className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1"
              >
                <span className="text-[11px] text-amber-300 font-medium">
                  Reserva ({simulationEvaluation.result.inputNormalized.reserveSharePct}%)
                </span>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {formatCentsToBrl(simulationEvaluation.result.reserveShareCents)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {simulationEvaluation.result.reserveShareCents.toLocaleString('pt-BR')} centavos
                </span>
              </div>

              {/* Diamantes Distribuídos & Bônus */}
              <div
                data-testid="sim-card-diamonds-distributed"
                className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1"
              >
                <span className="text-[11px] text-cyan-300 font-medium">Total de Diamantes Distribuídos</span>
                <div className="text-xl font-black text-cyan-300 font-mono">
                  {simulationEvaluation.result.diamondBreakdown.totalDiamondsDistributed.toLocaleString('pt-BR')} 💎
                </div>
                <span className="text-[10px] text-slate-300 font-mono block">
                  Pagos: {simulationEvaluation.result.diamondBreakdown.totalPaidDiamondsCredited.toLocaleString('pt-BR')} 💎 · Bônus:{' '}
                  {simulationEvaluation.result.diamondBreakdown.totalBonusDiamondsCredited.toLocaleString('pt-BR')} 💎
                </span>
              </div>
            </div>

            {/* Bloco de Relação com a Contabilidade de Diamantes (Seção 6) */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  Segregação Contábil de Diamantes (Pagos vs Bônus Promocional)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Referência unitária de consumo: 1 💎 pago = R$ 0,10 | 1 💎 bônus = R$ 0,00
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {simulationEvaluation.result.diamondBreakdown.accountingWarning}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Diamantes Creditados (Pagos):</span>
                  <strong className="text-white">
                    {simulationEvaluation.result.diamondBreakdown.totalPaidDiamondsCredited.toLocaleString('pt-BR')} 💎
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Bônus Promocionais Emitidos:</span>
                  <strong className="text-amber-300">
                    {simulationEvaluation.result.diamondBreakdown.totalBonusDiamondsCredited.toLocaleString('pt-BR')} 💎 (R$ 0,00 passivo)
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Preço Efetivo / 💎 Distribuído:</span>
                  <strong className="text-cyan-300">
                    R$ {(simulationEvaluation.result.diamondBreakdown.effectivePricePerTotalDiamondCents / 100).toFixed(4).replace('.', ',')}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Total Distribuído (70+20+10):</span>
                  <strong className="text-emerald-400">
                    {formatCentsToBrl(simulationEvaluation.result.totalDistributedCents)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 5: Os 11 Indicadores Financeiros Obrigatórios */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>Separador Contábil: 11 Indicadores Financeiros Obrigatórios</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Distinção rigorosa entre estimativa bruta da simulação, valores efetivamente conciliados no
                  Livro-Razão, obrigações de criadores e resultado líquido.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {simulationEvaluation.result.indicators.map((ind) => {
                const isInsufficient = ind.status === 'insufficient_data';
                const isReconciled = ind.status === 'reconciled';
                return (
                  <div
                    key={ind.key}
                    data-testid={`sim-indicator-${ind.indicatorNumber}-${ind.key}`}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                      isInsufficient
                        ? 'bg-slate-950/80 border-slate-800'
                        : isReconciled
                        ? 'bg-slate-900/90 border-cyan-500/30'
                        : 'bg-slate-900/90 border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{ind.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isInsufficient
                              ? 'bg-slate-800 text-slate-300'
                              : isReconciled
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isInsufficient
                            ? 'Dados Insuficientes'
                            : isReconciled
                            ? 'Conciliado (Ledger)'
                            : 'Estimativa Simulada'}
                        </span>
                      </div>

                      <div
                        className={`text-lg font-black font-mono ${
                          isInsufficient
                            ? 'text-slate-400'
                            : isReconciled
                            ? 'text-cyan-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {ind.formattedDisplay}
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400 block">{ind.formulaSummary}</span>
                      <p className="text-[11px] text-slate-400 leading-snug">{ind.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 7 e 8: Auditoria e Comprovação de Isolamento do Ledger */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  Trilha de Auditoria das Simulações & Verificação de Imutabilidade do Livro-Razão
                </h4>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  Entradas no Ledger antes/depois: {simulationEvaluation.result.isolationCheck.ledgerEntriesBefore} →{' '}
                  {simulationEvaluation.result.isolationCheck.ledgerEntriesAfter} (Integridade SHA-256:{' '}
                  {simulationEvaluation.result.isolationCheck.ledgerIntegrityValid ? 'VÁLIDA' : 'ERRO'})
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-extrabold uppercase text-slate-400">
                    <th className="py-2 pr-3">Execução ID</th>
                    <th className="py-2 px-3">Autor / Perfil</th>
                    <th className="py-2 px-3">Ambiente</th>
                    <th className="py-2 px-3">Cenário (N × Preço)</th>
                    <th className="py-2 px-3">Receita Bruta</th>
                    <th className="py-2 px-3">70% / 20% / 10%</th>
                    <th className="py-2 pl-3">Isolamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {executionLogs.map((log) => (
                    <tr key={log.executionId} className="hover:bg-slate-900/60">
                      <td className="py-2 pr-3 text-slate-300">{log.executionId}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {log.actorId} ({log.actorRole})
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 uppercase text-[10px]">
                          {log.environment}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white">
                        {log.input.salesQuantity.toLocaleString('pt-BR')} ×{' '}
                        {formatCentsToBrl(log.input.referencePricePerPackageCents)} ({log.input.packageName})
                      </td>
                      <td className="py-2 px-3 text-white font-bold">
                        {formatCentsToBrl(log.grossEstimatedRevenueCents)}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {formatCentsToBrl(log.creatorsGrossShareCents)} / {formatCentsToBrl(log.jobsGrossShareCents)} /{' '}
                        {formatCentsToBrl(log.reserveShareCents)}
                      </td>
                      <td className="py-2 pl-3 text-emerald-400">ledgerMutated: false</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
