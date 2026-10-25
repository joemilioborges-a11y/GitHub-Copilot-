import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  CheckCircle2,
  Users,
  DollarSign,
  Radio,
  Lock,
  Trophy,
  Image as ImageIcon,
  FileWarning,
  Activity,
  Clock,
  Sliders,
  Download,
  Rocket,
  Layers,
  AlertTriangle,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  vrSimulatorService,
  VrSimulatorStateSnapshot,
  SimulatorSpeedMultiplier,
  VR_SIMULATOR_WATERMARK,
  VR_SIMULATOR_SHORT_BADGE,
  VR_FINANCIAL_SIMULATION_BADGE,
  PLAY_STORE_DAY_ONE_MODE_LABEL,
} from '../../services/vrSimulatorService';
import { adminAuditService } from '../../services/adminAuditService';

const formatBrlFromCents = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatCreditsFromCents = (cents: number): string => {
  return `${Math.round(cents / 10).toLocaleString('pt-BR')} cr (${formatBrlFromCents(cents)})`;
};

export const VrSimulatorControlPanel: React.FC = () => {
  const [snapshot, setSnapshot] = useState<VrSimulatorStateSnapshot>(() =>
    vrSimulatorService.getStateSnapshot()
  );
  const [activeSubTab, setActiveSubTab] = useState<
    | 'launch_day_one'
    | 'overview'
    | 'reconciliation'
    | 'creators_ranking'
    | 'media_validation'
  >('launch_day_one');
  const [seedInput, setSeedInput] = useState<string>(String(snapshot.seed));
  const [creatorSearch, setCreatorSearch] = useState<string>('');
  const [dailyFansRateInput, setDailyFansRateInput] = useState<number>(
    snapshot.capacityConfig.dailyNewFansRate
  );
  const [maxFansCapInput, setMaxFansCapInput] = useState<number>(
    snapshot.capacityConfig.maxSyntheticFansCap
  );

  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  const handleStartPlayStoreDayOne = () => {
    const parsedSeed = Number.parseInt(seedInput, 10);
    const next = vrSimulatorService.startPlayStoreLaunchDayOne(
      Number.isFinite(parsedSeed) ? parsedSeed : 20261025
    );
    setConfirmResetOpen(false);
    setSnapshot(next);
    adminAuditService.logActivity({
      actorId: 'admin_master',
      actorRole: 'admin',
      action: 'SANDBOX_TOGGLE',
      targetType: 'environment',
      targetId: `launch_d1_${next.seed}`,
      result: 'success',
      reason: `Modo "${PLAY_STORE_DAY_ONE_MODE_LABEL}" iniciado no Dia 1 com 9 módulos auditados e 100 criadores fictícios.`,
      environment: 'sandbox',
    });
  };

  const handlePause = () => {
    const next = vrSimulatorService.pause();
    setSnapshot(next);
  };

  const handleResume = () => {
    const next = vrSimulatorService.resume();
    setSnapshot(next);
  };

  const handleStop = () => {
    const next = vrSimulatorService.stop();
    setSnapshot(next);
    adminAuditService.logActivity({
      actorId: 'admin_master',
      actorRole: 'admin',
      action: 'SANDBOX_TOGGLE',
      targetType: 'environment',
      targetId: `sim_stop_${next.seed}`,
      result: 'success',
      reason: `Simulador VR encerrado manualmente no Dia ${next.currentDay}/${next.totalDays}`,
      environment: 'sandbox',
    });
  };

  const handleStepDays = (days: number) => {
    const next = vrSimulatorService.stepDays(days);
    setSnapshot(next);
    adminAuditService.logActivity({
      actorId: 'admin_master',
      actorRole: 'admin',
      action: 'SANDBOX_TOGGLE',
      targetType: 'environment',
      targetId: `sim_day_${next.currentDay}`,
      result: 'success',
      reason: `Simulador VR avançou +${days} dia(s) até o Dia ${next.currentDay}/${next.totalDays}`,
      environment: 'sandbox',
    });
  };

  const handleComplete30Days = () => {
    const next = vrSimulatorService.advanceToDay(snapshot.totalDays);
    setSnapshot(next);
    adminAuditService.logActivity({
      actorId: 'admin_master',
      actorRole: 'admin',
      action: 'SANDBOX_TOGGLE',
      targetType: 'environment',
      targetId: `sim_cycle_30d_${next.seed}`,
      result: 'success',
      reason: `Ciclo completo de ${next.totalDays} dias simulados concluído com reconciliação ${
        next.latestReconciliation.isBalanced ? 'ÍNTEGRA' : 'DIVERGENTE'
      }`,
      environment: 'sandbox',
    });
  };

  const handleConfirmReset = () => {
    const parsedSeed = Number.parseInt(seedInput, 10);
    const res = vrSimulatorService.resetScenarioWithConfirmation(
      'CONFIRM_SANDBOX_RESET',
      Number.isFinite(parsedSeed) ? parsedSeed : 20261025
    );
    setConfirmResetOpen(false);
    setSnapshot(res.snapshot);
    adminAuditService.logActivity({
      actorId: 'admin_master',
      actorRole: 'admin',
      action: 'SANDBOX_TOGGLE',
      targetType: 'environment',
      targetId: `sim_reset_${res.snapshot.seed}`,
      result: 'success',
      reason: `Sandbox do Simulador VR reiniciado com confirmação explícita (seed ${res.snapshot.seed}; produção intocada).`,
      environment: 'sandbox',
    });
  };

  const handlePlayerAction = (
    assetPath: string,
    mediaType: 'image' | 'video',
    action: 'load' | 'play' | 'pause' | 'end'
  ) => {
    vrSimulatorService.simulateAuthorizedMediaPlayerAction({
      assetPath,
      mediaType,
      action,
    });
    setSnapshot(vrSimulatorService.getStateSnapshot());
  };

  const handleSpeedChange = (speed: SimulatorSpeedMultiplier) => {
    const next = vrSimulatorService.setSpeedMultiplier(speed);
    setSnapshot(next);
  };

  const handleApplyCapacity = () => {
    const next = vrSimulatorService.updateCapacityConfig({
      dailyNewFansRate: dailyFansRateInput,
      maxSyntheticFansCap: maxFansCapInput,
    });
    setSnapshot(next);
  };

  const handleRankingStatusChange = (
    status: 'provisional_simulation' | 'admin_reviewed_simulation' | 'published_simulation'
  ) => {
    const next = vrSimulatorService.setRankingCycleStatus(status);
    setSnapshot(next);
  };

  const handleExportAuditJson = () => {
    const reportPayload = {
      watermark: VR_SIMULATOR_WATERMARK,
      shortBadge: VR_SIMULATOR_SHORT_BADGE,
      financialBadge: VR_FINANCIAL_SIMULATION_BADGE,
      simulationModeLabel: snapshot.simulationModeLabel,
      exportedAtIso: new Date().toISOString(),
      namespace: snapshot.namespace,
      seed: snapshot.seed,
      currentDay: snapshot.currentDay,
      totalDays: snapshot.totalDays,
      initialLaunchState: snapshot.initialLaunchState,
      segregatedLaunchMetrics: snapshot.segregatedLaunchMetrics,
      blockedExternalOperations: snapshot.blockedExternalOperations,
      creatorsCount: snapshot.creators.length,
      fansCount: snapshot.fansCount,
      totals: snapshot.totals,
      reconciliation: snapshot.latestReconciliation,
      dailyFinancialEvolution: snapshot.dailyFinancialEvolution,
      simulatedPayoutRecords: snapshot.simulatedPayoutRecords,
      fanWalletStatements: snapshot.fanWalletStatements,
      mediaValidation: snapshot.mediaValidation,
      monthlyRankingPreview: snapshot.monthlyRankingPreview,
      checkpointsCount: snapshot.checkpoints.length,
    };
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-vr-launch-day1-audit-day-${snapshot.currentDay}-seed-${snapshot.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCreators = snapshot.creators.filter((c) => {
    if (!creatorSearch.trim()) return true;
    const q = creatorSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.creatorId.toLowerCase().includes(q) ||
      c.recognitionCategory.toLowerCase().includes(q)
    );
  });

  const rec = snapshot.latestReconciliation;
  const seg = snapshot.segregatedLaunchMetrics;
  const progressPct = Math.min(
    100,
    Math.round((snapshot.currentDay / Math.max(1, snapshot.totalDays)) * 100)
  );

  const chartData = snapshot.dailyFinancialEvolution.map((d) => ({
    dayLabel: `Dia ${d.simDay}`,
    receitaLiquidaBrl: Number((d.cumulativeNetRecognizedRevenueCents / 100).toFixed(2)),
    repasseCriadores70Brl: Number((d.cumulativeCreatorRemunerationCents / 100).toFixed(2)),
    comissaoPlataforma30Brl: Number((d.cumulativePlatformCommissionCents / 100).toFixed(2)),
    caixaDisponivelBrl: Number((d.availableSimulatedTestCashCents / 100).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Tarja Permanente Obrigatória de Segurança e Isolamento Financeiro */}
      <div className="bg-amber-500/15 border-2 border-amber-500/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                {VR_SIMULATOR_WATERMARK}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                {VR_FINANCIAL_SIMULATION_BADGE}
              </span>
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-black uppercase">
                Modo: {snapshot.simulationModeLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Namespace Isolado:{' '}
              <code className="text-amber-300 font-mono">{snapshot.namespace}</code> • Zero
              movimentação bancária real • Créditos virtuais separados de BRL • Dados de produção
              intocados
            </p>
          </div>
        </div>
        <button
          onClick={handleExportAuditJson}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Exportar Auditoria JSON
        </button>
      </div>

      {/* Barra de Controle do Relógio Simulado (30 Dias) & Modo Lançamento Dia 1 */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-fuchsia-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {PLAY_STORE_DAY_ONE_MODE_LABEL} — Relógio de {snapshot.totalDays} Dias
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  snapshot.clockStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : snapshot.clockStatus === 'running'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                Status: {snapshot.clockStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Data Simulada Atual:{' '}
              <span className="text-zinc-200 font-mono">
                {snapshot.currentSimulatedDateIso.slice(0, 10)}
              </span>{' '}
              • Dia <strong className="text-white">{snapshot.currentDay}</strong> de{' '}
              <strong className="text-white">{snapshot.totalDays}</strong> ({progressPct}%) •
              Ticks Duplicados Bloqueados:{' '}
              <strong className="text-emerald-400">
                {snapshot.duplicateDayTickPreventedCount}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartPlayStoreDayOne}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md"
            >
              <Rocket className="w-3.5 h-3.5" />
              Iniciar Lançamento Play Store — Dia 1
            </button>

            {snapshot.clockStatus === 'running' && (
              <button
                onClick={handlePause}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </button>
            )}
            {snapshot.clockStatus === 'paused' && (
              <button
                onClick={handleResume}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Retomar
              </button>
            )}

            <button
              onClick={() => handleStepDays(1)}
              disabled={snapshot.currentDay >= snapshot.totalDays}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 text-xs font-bold flex items-center gap-1.5 border border-zinc-700"
            >
              <FastForward className="w-3.5 h-3.5 text-fuchsia-400" />
              +1 Dia
            </button>

            <button
              onClick={() => handleStepDays(5)}
              disabled={snapshot.currentDay >= snapshot.totalDays}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 text-xs font-bold flex items-center gap-1.5 border border-zinc-700"
            >
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
              +5 Dias
            </button>

            <button
              onClick={handleComplete30Days}
              disabled={snapshot.currentDay >= snapshot.totalDays}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:opacity-95 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5"
            >
              <FastForward className="w-3.5 h-3.5" />
              Simular até Dia {snapshot.totalDays}
            </button>

            <button
              onClick={handleStop}
              disabled={snapshot.clockStatus === 'terminated' || snapshot.clockStatus === 'idle'}
              className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 disabled:opacity-40 text-rose-200 text-xs font-bold flex items-center gap-1.5 border border-rose-500/40"
            >
              Encerrar
            </button>

            <button
              onClick={() => setConfirmResetOpen(true)}
              className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1.5 border border-zinc-800"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              Resetar
            </button>
          </div>
        </div>

        {/* Confirmação Obrigatória em 2 Passos para Reinicialização Exclusiva do Sandbox */}
        {confirmResetOpen && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-rose-200">
              <strong>Confirmação de Segurança:</strong> Deseja reinicializar apenas os dados do
              cenário de teste no namespace <code className="font-mono">{snapshot.namespace}</code>?
              Nenhum dado de produção será apagado ou modificado.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleConfirmReset}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
              >
                Confirmar Reset do Sandbox
              </button>
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Barra de Progresso dos 30 Dias */}
        <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 via-amber-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Configuração de Seed, Velocidade e Capacidade */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-semibold">Seed PRNG:</span>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              className="w-28 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 font-semibold">Velocidade:</span>
            {([1, 2, 5, 10, 30] as SimulatorSpeedMultiplier[]).map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  snapshot.speedMultiplier === spd
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] text-zinc-400">Fãs/dia:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={dailyFansRateInput}
              onChange={(e) => setDailyFansRateInput(Number(e.target.value) || 10)}
              className="w-16 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">Teto Fãs:</span>
              <input
                type="number"
                min={100}
                max={5000}
                value={maxFansCapInput}
                onChange={(e) => setMaxFansCapInput(Number(e.target.value) || 800)}
                className="w-20 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
              />
            </div>
            <button
              onClick={handleApplyCapacity}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Sub-abas de Observabilidade */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveSubTab('launch_day_one')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            activeSubTab === 'launch_day_one'
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Rocket className="w-4 h-4" />
          Lançamento Play Store — Dia 1 (9 Módulos)
        </button>

        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            activeSubTab === 'reconciliation'
              ? 'bg-teal-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Módulo Financeiro & Evolução 30 Dias (70/30)
        </button>

        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            activeSubTab === 'overview'
              ? 'bg-fuchsia-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Jornadas & Checkpoints (A–G)
        </button>

        <button
          onClick={() => setActiveSubTab('creators_ranking')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            activeSubTab === 'creators_ranking'
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          100 Criadores Sintéticos & Ranking Mensal
        </button>

        <button
          onClick={() => setActiveSubTab('media_validation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
            activeSubTab === 'media_validation'
              ? 'bg-cyan-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Validação de Mídia Autorizada
        </button>
      </div>

      {/* ABA 0: LANÇAMENTO PLAY STORE — DIA 1 */}
      {activeSubTab === 'launch_day_one' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Métricas Segregadas de Lançamento ({VR_SIMULATOR_SHORT_BADGE})
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Distinção estrita entre eventos internos do sandbox e dados preexistentes fora da
                  simulação (nunca somados ou misturados).
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                Contaminação Produção: 0 • Avaliações Falsas: 0
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">Instalações Simuladas (Sandbox)</div>
                <div className="text-xl font-black text-white mt-1">
                  {seg.simulatedInstallsCount}
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">
                  Eventos sintéticos internos (não Play Store real)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">Usuários Fictícios Criados</div>
                <div className="text-xl font-black text-fuchsia-400 mt-1">
                  {seg.syntheticUsersCreatedCount}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  100 criadores + {snapshot.fansCount} fãs (@sim.jobs.invalid)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">Sessões Simuladas</div>
                <div className="text-xl font-black text-cyan-400 mt-1">
                  {seg.simulatedSessionsCount}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Sessões sintéticas acumuladas
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">Usuários Ativos na Simulação</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {seg.activeSimulatedUsersCount}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Contas fictícias com atividade no ciclo
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">Fora do Sandbox (Somente Leitura)</div>
                <div className="text-sm font-black text-zinc-300 mt-1">
                  {seg.externalReadOnlyBaseline.preexistingMockProfilesCount} perfis /{' '}
                  {seg.externalReadOnlyBaseline.productionLedgerEntriesReadOnlyCount} txs
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  Nunca misturado às métricas de teste
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Roteiro de Inicialização Progressiva (9 Etapas Verificadas no Código Real)
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Inspeção real de dependências: funcionalidades parciais ou indisponíveis são
                  identificadas sem falsos resultados de sucesso.
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Cenário: {snapshot.initialLaunchState.scenarioId}
              </span>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {snapshot.initialLaunchState.progressiveActivationSteps.map((step) => (
                <div key={step.stepNumber} className="p-4 hover:bg-zinc-800/30 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{step.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          step.availabilityStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {step.availabilityStatus === 'active'
                          ? 'ATIVO NO SANDBOX'
                          : 'PARCIAL / DEPENDÊNCIA EXTERNA IDENTIFICADA'}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Contas fictícias exercitadas: {step.syntheticAccountsExercisedCount}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">{step.evidenceSummary}</p>

                  {step.unavailableOrPendingDetails && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{step.unavailableOrPendingDetails}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-500 font-mono">
                    Dependências inspecionadas: {step.inspectedDependencies.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
              Proteções de Sandbox & Operações Reais Bloqueadas ({snapshot.blockedExternalOperations.length})
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {snapshot.blockedExternalOperations.map((op) => (
                <div
                  key={op.recordId}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-amber-400 mr-2">
                      [{op.operationCategory}]
                    </span>
                    <span className="text-zinc-300">{op.reason}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] shrink-0">
                    Dia {op.simDay} • {op.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 1: MÓDULO FINANCEIRO, CARTEIRAS VIRTUAIS, RECONCILIAÇÃO 70/30 E EVOLUÇÃO 30 DIAS */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Painel dos 9 Indicadores Financeiros Segregados */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    Módulo Financeiro do Simulador (Centavos Inteiros • 70% Criador / 30% Plataforma)
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase">
                    {VR_FINANCIAL_SIMULATION_BADGE}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Separação estrita entre carteira virtual de créditos dos usuários e receita
                  monetária elegível (zero dupla contagem na compra de créditos).
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                <CheckCircle2 className="w-4 h-4" />
                Divergência de Reconciliação: {formatBrlFromCents(rec.reconciliationDeltaCents)}
              </div>
            </div>

            {/* Grade dos 9 Indicadores Obrigatórios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. Créditos comprados/concedidos vs consumidos */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>1. Carteira de Créditos Virtuais</span>
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base font-black text-amber-300 mt-1">
                  Concedidos/Comprados: {formatCreditsFromCents(rec.totalCreditsPurchasedCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Consumidos: <strong>{formatCreditsFromCents(rec.totalCreditsConsumedCents)}</strong> •
                  Saldo em Carteira: <strong>{formatCreditsFromCents(rec.activeFanWalletCreditsCents)}</strong>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Créditos Estornados aos Fãs: {formatCreditsFromCents(rec.totalCreditsRefundedCents)} •
                  Recargas: {snapshot.totals.creditPurchasesCount}
                </div>
              </div>

              {/* 2. Receita elegível gerada por consumo */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  2. Receita Elegível Gerada por Consumo (100%)
                </div>
                <div className="text-lg font-black text-emerald-400 mt-1">
                  Líq: {formatBrlFromCents(rec.netEligibleRevenueCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Bruta de Consumo: {formatBrlFromCents(rec.grossEligibleRevenueCents)}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Apenas desbloqueios, presentes, ingressos e desafios (compra de crédito excluída)
                </div>
              </div>

              {/* 3. Comissão da plataforma (30%) */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  3. Comissão Líquida da Plataforma (30%)
                </div>
                <div className="text-lg font-black text-cyan-400 mt-1">
                  {formatBrlFromCents(rec.netPlatformShareCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Bruta (30%): {formatBrlFromCents(rec.platformShareGrossCents)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Estornos 30% abatidos: -{formatBrlFromCents(rec.platformShareRefundedCents)}
                </div>
              </div>

              {/* 4. Estornos e ajustes */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  4. Estornos, Reembolsos e Ajustes
                </div>
                <div className="text-lg font-black text-rose-400 mt-1">
                  -{formatBrlFromCents(rec.refundedGrossCents)} ({snapshot.totals.refundsAndReversalsCount} eventos)
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Criador (70%): -{formatBrlFromCents(rec.creatorShareRefundedCents)} • Plataforma (30%): -{formatBrlFromCents(rec.platformShareRefundedCents)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Créditos devolvidos aos fãs com reversão proporcional do Ranking Mensal
                </div>
              </div>

              {/* 5. Remuneração dos criadores (70%) */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  5. Remuneração Acumulada dos Criadores (70%)
                </div>
                <div className="text-lg font-black text-fuchsia-400 mt-1">
                  {formatBrlFromCents(rec.netCreatorShareCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Bruta (70%): {formatBrlFromCents(rec.creatorShareGrossCents)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Saldo Disponível Criadores: {formatBrlFromCents(rec.availableCreatorBalanceCents)}
                </div>
              </div>

              {/* 6. Obrigações pendentes com criadores */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  6. Obrigações Pendentes com Criadores
                </div>
                <div className="text-lg font-black text-amber-300 mt-1">
                  {formatBrlFromCents(rec.pendingCreatorObligationsCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Em Pendentes/Aprovados:{' '}
                  {formatBrlFromCents(
                    rec.pendingCreatorPayoutRequestsCents +
                      rec.approvedUnsettledCreatorPayoutsCents
                  )}
                </div>
                <div className="text-[10px] text-amber-400/90 mt-0.5">
                  Abatido somente quando o saque simulado atinge o estado &quot;completed&quot;
                </div>
              </div>

              {/* 7. Saques simulados por estado */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  7. Saques Simulados por Estado (Ciclo de Vida)
                </div>
                <div className="text-base font-black text-white mt-1">
                  Concluídos: {formatBrlFromCents(rec.settledCreatorPayoutsCents)} ({snapshot.totals.payoutsSettledCount})
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Pendentes: {formatBrlFromCents(rec.pendingCreatorPayoutRequestsCents)} •
                  Aprovados: {formatBrlFromCents(rec.approvedUnsettledCreatorPayoutsCents)} ({snapshot.totals.payoutsApprovedCount})
                </div>
                <div className="text-[10px] text-rose-400 mt-0.5">
                  Rejeitados (obrigação preservada): {formatBrlFromCents(rec.rejectedCreatorPayoutRequestsCents)} ({snapshot.totals.payoutsRejectedCount})
                </div>
              </div>

              {/* 8. Caixa de teste, entradas, saídas e saldo disponível */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  8. Caixa Simulado do Ambiente de Teste
                </div>
                <div className="text-lg font-black text-emerald-300 mt-1">
                  Saldo Disponível: {formatBrlFromCents(rec.availableSimulatedTestCashCents)}
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Caixa Inicial Fictício: {formatBrlFromCents(rec.fictitiousInitialTestCashCents)} •
                  Entradas: +{formatBrlFromCents(rec.simulatedCashInflowsCents)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Saídas Simuladas (Saques Concluídos + Estornos): -{formatBrlFromCents(rec.simulatedCashOutflowsCents)}
                </div>
              </div>

              {/* 9. Divergências de reconciliação */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[11px] text-zinc-400">
                  9. Divergências de Reconciliação (Partidas Dobradas)
                </div>
                <div className="text-lg font-black text-emerald-400 mt-1">
                  {formatBrlFromCents(rec.reconciliationDeltaCents)} ({rec.isBalanced ? 'ZERO DIVERGÊNCIA' : 'ALERTA'})
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5">
                  Duplo Gasto Barrado: {snapshot.totals.doubleSpendBlockedCount} • Solicitações Saque: {snapshot.totals.payoutsRequestedCount}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  8/8 invariantes matemáticos verificados em centavos inteiros
                </div>
              </div>
            </div>

            {/* Invariantes Verificados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-3 border-t border-zinc-800">
              {Object.entries(rec.invariantsPassed).map(([key, passed]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                >
                  <span className="text-zinc-300 font-mono text-[11px] truncate" title={key}>
                    {key}
                  </span>
                  <span
                    className={`font-black text-[11px] ${
                      passed ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Evolução Financeira Diária dos 30 Dias (Série Histórica Derivada por Dia) */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Série Histórica de Evolução Financeira (Dia 1 ao Dia {snapshot.currentDay}) —{' '}
                  {VR_FINANCIAL_SIMULATION_BADGE}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Cada ponto diário é derivado exclusivamente dos lançamentos daquele dia simulado
                  (jamais repete o saldo atual em datas passadas).
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Pontos diários auditados: {snapshot.dailyFinancialEvolution.length} / {snapshot.totalDays}
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950 rounded-xl border border-zinc-800">
                Inicie o <strong>Lançamento Play Store — Dia 1</strong> ou avance os dias para
                visualizar a curva histórica de evolução monetária.
              </div>
            ) : (
              <div className="h-64 w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="dayLabel" stroke="#a1a1aa" fontSize={11} />
                    <YAxis stroke="#a1a1aa" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09090b',
                        borderColor: '#3f3f46',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitaLiquidaBrl"
                      name="Receita Líquida Elegível (R$)"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="repasseCriadores70Brl"
                      name="Repasse Criadores 70% (R$)"
                      stroke="#d946ef"
                      fill="#d946ef"
                      fillOpacity={0.18}
                    />
                    <Area
                      type="monotone"
                      dataKey="comissaoPlataforma30Brl"
                      name="Comissão Plataforma 30% (R$)"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela Diária de Evolução Financeira (30 Dias) */}
            {snapshot.dailyFinancialEvolution.length > 0 && (
              <div className="max-h-72 overflow-y-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Dia / Data</th>
                      <th className="py-2.5 px-3">Créditos Adq. / Cons.</th>
                      <th className="py-2.5 px-3">Rec. Bruta / Estornos</th>
                      <th className="py-2.5 px-3">Rec. Líquida Dia</th>
                      <th className="py-2.5 px-3">30% Plat. / 70% Criad.</th>
                      <th className="py-2.5 px-3">Obrigações Pendentes</th>
                      <th className="py-2.5 px-3">Saques Concluídos Acum.</th>
                      <th className="py-2.5 px-3">Caixa Simulado Disp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70 bg-zinc-900/50">
                    {snapshot.dailyFinancialEvolution.map((pt) => (
                      <tr key={pt.simDay} className="hover:bg-zinc-800/40 font-mono text-[11px]">
                        <td className="py-2 px-3 font-bold text-white">
                          Dia {pt.simDay} ({pt.displayDate})
                        </td>
                        <td className="py-2 px-3 text-amber-300">
                          +{formatBrlFromCents(pt.virtualCreditsCategory.creditsGrantedInDayCents)} / -
                          {formatBrlFromCents(pt.virtualCreditsCategory.creditsConsumedInDayCents)}
                        </td>
                        <td className="py-2 px-3 text-zinc-300">
                          {formatBrlFromCents(pt.dayGrossEligibleRevenueCents)} /{' '}
                          <span className="text-rose-400">
                            -{formatBrlFromCents(pt.dayRefundsAndAdjustmentsCents)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">
                          {formatBrlFromCents(pt.dayNetRecognizedRevenueCents)}
                        </td>
                        <td className="py-2 px-3 text-cyan-300">
                          {formatBrlFromCents(pt.dayPlatformCommissionCents)} /{' '}
                          <span className="text-fuchsia-300">
                            {formatBrlFromCents(pt.dayCreatorRemunerationCents)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-amber-300">
                          {formatBrlFromCents(pt.pendingCreatorObligationsCents)}
                        </td>
                        <td className="py-2 px-3 text-emerald-300">
                          {formatBrlFromCents(pt.cumulativeSimulatedPaidToCreatorsCents)}
                        </td>
                        <td className="py-2 px-3 text-white font-bold">
                          {formatBrlFromCents(pt.availableSimulatedTestCashCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ciclo de Vida dos Saques Simulados & Carteiras de Fãs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase tracking-wider text-white">
                  Saques Simulados de Criadores ({snapshot.simulatedPayoutRecords.length})
                </h5>
                <span className="text-[10px] font-mono text-amber-300">
                  {VR_FINANCIAL_SIMULATION_BADGE}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {snapshot.simulatedPayoutRecords.length === 0 ? (
                  <div className="text-xs text-zinc-400 p-3 bg-zinc-950 rounded-xl">
                    Nenhum saque simulado registrado ainda. Avance até o Dia 5+ para exercitar os
                    estados pending, approved, completed e rejected.
                  </div>
                ) : (
                  snapshot.simulatedPayoutRecords.slice(0, 25).map((p) => (
                    <div
                      key={p.payoutId}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {p.creatorHandle} • {formatBrlFromCents(p.amountCents)}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {p.payoutId} • Transições:{' '}
                          {p.auditTrail.map((t) => t.toStatus).join(' → ')}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : p.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : p.status === 'approved'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase tracking-wider text-white">
                  Amostra de Extratos da Carteira de Créditos (Fãs Sintéticos)
                </h5>
                <span className="text-[10px] font-mono text-emerald-300">
                  Entradas - Saídas + Reembolsos = SaldoFinal
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {snapshot.fanWalletStatements.slice(0, 12).map((fw) => {
                  const isStatementBalanced =
                    fw.inflowsCreditsCents -
                      fw.outflowsCreditsCents +
                      fw.refundedCreditsCents ===
                    fw.finalBalanceCreditsCents;
                  return (
                    <div
                      key={fw.fanId}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{fw.handle}</div>
                        <div className="text-[10px] text-zinc-400">
                          Entradas: +{formatBrlFromCents(fw.inflowsCreditsCents)} | Consumo: -
                          {formatBrlFromCents(fw.outflowsCreditsCents)} | Estornos: +
                          {formatBrlFromCents(fw.refundedCreditsCents)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-300 font-bold">
                          Saldo: {formatBrlFromCents(fw.finalBalanceCreditsCents)}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {isStatementBalanced ? 'EXTRATO ÍNTEGRO' : 'ERRO'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: VISÃO GERAL & JORNADAS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>População Sintética</span>
                <Users className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {snapshot.creators.length} Criadores
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                + <strong className="text-zinc-200">{snapshot.fansCount}</strong> fãs ativos (Teto:{' '}
                {snapshot.capacityConfig.maxSyntheticFansCap})
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Descoberta, Matches & Chat</span>
                <Activity className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {snapshot.totals.matchesCreated} Matches
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {snapshot.totals.messagesSent} msgs •{' '}
                <span className="text-amber-400">
                  {snapshot.totals.blockedInteractionAttempts} bloqueios aplicados
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>2 Fotos Grátis + Álbum Pago</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {snapshot.totals.paidVaultUnlocksCount} Desbloqueios
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {snapshot.totals.freePhotoViewsCount} views grátis •{' '}
                <span className="text-emerald-400">
                  {snapshot.totals.unauthorizedVaultAccessBlocked} acessos sem compra barrados
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Lives (4 Formatos) & Presentes</span>
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {snapshot.totals.giftsSentCount} Presentes
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Ind: {snapshot.totals.livesByFormat.individual} | Bat:{' '}
                {snapshot.totals.livesByFormat.battle} | Palco:{' '}
                {snapshot.totals.livesByFormat.interactive_stage} | Des:{' '}
                {snapshot.totals.livesByFormat.challenge}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Checkpoints Diários do Ciclo ({snapshot.checkpoints.length} / {snapshot.totalDays}{' '}
                dias processados)
              </h4>
              <span className="text-[11px] text-zinc-400">
                Eventos limitados por teto: {snapshot.totals.capacityThrottledEvents}
              </span>
            </div>
            {snapshot.checkpoints.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Nenhum dia simulado executado ainda. Clique em{' '}
                <strong>Iniciar Lançamento Play Store — Dia 1</strong> ou{' '}
                <strong>Simular até Dia 30</strong> acima.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Dia</th>
                      <th className="py-2.5 px-3">Usuários Sintéticos</th>
                      <th className="py-2.5 px-3">Cadastros / Sessões</th>
                      <th className="py-2.5 px-3">Interações</th>
                      <th className="py-2.5 px-3">Bloqueios / Falhas</th>
                      <th className="py-2.5 px-3">Latência / Memória</th>
                      <th className="py-2.5 px-3">Receita Líquida Dia</th>
                      <th className="py-2.5 px-3">Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {snapshot.checkpoints
                      .slice()
                      .reverse()
                      .map((cp) => (
                        <tr key={cp.dayTickKey} className="hover:bg-zinc-800/40">
                          <td className="py-2 px-3 font-bold text-white">Dia {cp.dayNumber}</td>
                          <td className="py-2 px-3 text-zinc-300">
                            {cp.cumulativeSyntheticUsersCount} ({cp.activeCreatorsCount} criadores)
                          </td>
                          <td className="py-2 px-3 text-zinc-300">
                            +{cp.simulatedNewRegistrationsInDay} cad / {cp.simulatedSessionsInDay}{' '}
                            sessões
                          </td>
                          <td className="py-2 px-3 text-zinc-300">{cp.totalInteractionsInDay}</td>
                          <td className="py-2 px-3 text-amber-300 font-mono text-[11px]">
                            {cp.errorsAndFailures.blockedAttemptsCount} bloq /{' '}
                            {cp.errorsAndFailures.unexpectedRuntimeErrorsCount} erros
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-400 text-[11px]">
                            {cp.resourceAndLatencyMetrics.stepExecutionLatencyMs}ms •{' '}
                            {cp.resourceAndLatencyMetrics.estimatedMemoryFootprintKb}KB
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-400">
                            {formatBrlFromCents(cp.dayNetRevenueCents)}
                          </td>
                          <td className="py-2 px-3">
                            {cp.reconciliation.isBalanced ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                Δ R$ 0,00
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                DIVERGENTE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: 100 CRIADORES SINTÉTICOS & RANKING MENSAL */}
      {activeSubTab === 'creators_ranking' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Ranking Mensal Garoto JOBS & Garota JOBS (Simulação de 30 Dias)
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fórmula combinada: 50% Lucro Líquido Elegível + 30% Produção (com tetos anti-spam)
                + 20% Integridade • Inelegíveis/Opt-out:{' '}
                <strong>{snapshot.monthlyRankingPreview.ineligibleOrOptedOutCount}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(
                [
                  ['provisional_simulation', '1. Provisório'],
                  ['admin_reviewed_simulation', '2. Revisado Admin'],
                  ['published_simulation', '3. Publicado (Sandbox)'],
                ] as const
              ).map(([st, label]) => (
                <button
                  key={st}
                  onClick={() => handleRankingStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    snapshot.monthlyRankingPreview.cycleStatus === st
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <h5 className="text-xs font-black uppercase text-fuchsia-300 mb-3">
                Top 5 — Garota JOBS (Sandbox)
              </h5>
              <div className="space-y-2">
                {snapshot.monthlyRankingPreview.garotaJobsTop10.slice(0, 5).map((item) => (
                  <div
                    key={item.creatorId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <div>
                      <span className="font-black text-amber-400 mr-2">#{item.rank}</span>
                      <span className="font-bold text-white">{item.displayName}</span>
                      <span className="text-zinc-500 ml-1.5 font-mono">{item.handle}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400">{item.combinedScore} pts</div>
                      <div className="text-[10px] text-zinc-400">
                        Líq: {formatBrlFromCents(item.netEligibleRevenueCents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <h5 className="text-xs font-black uppercase text-cyan-300 mb-3">
                Top 5 — Garoto JOBS (Sandbox)
              </h5>
              <div className="space-y-2">
                {snapshot.monthlyRankingPreview.garotoJobsTop10.slice(0, 5).map((item) => (
                  <div
                    key={item.creatorId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <div>
                      <span className="font-black text-amber-400 mr-2">#{item.rank}</span>
                      <span className="font-bold text-white">{item.displayName}</span>
                      <span className="text-zinc-500 ml-1.5 font-mono">{item.handle}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400">{item.combinedScore} pts</div>
                      <div className="text-[10px] text-zinc-400">
                        Líq: {formatBrlFromCents(item.netEligibleRevenueCents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Base Inicial Determinística ({filteredCreators.length} / {snapshot.creators.length}{' '}
                Criadores Sintéticos)
              </h4>
              <input
                type="text"
                placeholder="Filtrar por handle, nome ou categoria..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 w-full sm:w-64"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">ID / Handle</th>
                    <th className="py-2 px-3">E-mail Sintético / Doc</th>
                    <th className="py-2 px-3">Categoria</th>
                    <th className="py-2 px-3">2 Fotos Grátis</th>
                    <th className="py-2 px-3">Receita Líquida</th>
                    <th className="py-2 px-3">Saldo Criador (70%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {filteredCreators.slice(0, 50).map((c) => (
                    <tr key={c.creatorId} className="hover:bg-zinc-800/40">
                      <td className="py-2 px-3">
                        <div className="font-bold text-white">{c.displayName}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{c.handle}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-zinc-300">
                        <div>{c.syntheticEmail}</div>
                        <div className="text-zinc-500">{c.syntheticDocumentId}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold">
                          {c.recognitionCategory}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-mono text-[10px]">
                        {c.freeGalleryPhotoPaths.length} públicas + {c.paidVaultAlbumPhotoPaths.length}{' '}
                        cofre
                      </td>
                      <td className="py-2 px-3 font-mono text-zinc-200">
                        {formatBrlFromCents(c.netEligibleRevenueCents)}
                      </td>
                      <td className="py-2 px-3 font-mono text-fuchsia-400">
                        {formatBrlFromCents(c.availableBalanceCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: VALIDAÇÃO HONESTA DE MÍDIA AUTORIZADA (ETAPA 6) */}
      {activeSubTab === 'media_validation' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black uppercase text-white">
                  Diagnóstico Transparente de Mídia do Repositório (Etapa 6)
                </h4>
                <p className="text-xs text-zinc-300 mt-1">
                  {snapshot.mediaValidation.honestDisclosureMessage}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                    Imagens .jpg Autorizadas:{' '}
                    {snapshot.mediaValidation.authorizedImageAssetsCount} / 5 Validadas
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono">
                    Status de Vídeo: {snapshot.mediaValidation.videoPlaybackStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-zinc-800">
              {snapshot.mediaValidation.validatedImagePaths.map((imgPath, idx) => (
                <div
                  key={imgPath}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 space-y-1.5"
                >
                  <img
                    src={imgPath}
                    alt={`Asset autorizado #${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <div className="text-[10px] font-mono text-zinc-400 truncate" title={imgPath}>
                    {imgPath.replace('/src/assets/images/', '')}
                  </div>
                </div>
              ))}
            </div>

            {/* Máquina de Estados do Player de Mídia Autorizada & Live Simulada */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-black uppercase text-cyan-300">
                    Player de Mídia Autorizada & Live Simulada (Estados: Carregando, Reproduzindo,
                    Pausado, Encerrado, Erro)
                  </h5>
                  <p className="text-[11px] text-zinc-400">
                    Ativo atual:{' '}
                    <code className="font-mono text-zinc-200">
                      {snapshot.mediaValidation.playerStateMachine.activeAssetPath}
                    </code>{' '}
                    • Tarja de Live Simulada:{' '}
                    <strong className="text-amber-300">{VR_SIMULATOR_SHORT_BADGE}</strong>
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                    snapshot.mediaValidation.playerStateMachine.currentState === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : snapshot.mediaValidation.playerStateMachine.currentState === 'playing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  Estado do Player: {snapshot.mediaValidation.playerStateMachine.currentState}
                </span>
              </div>

              {snapshot.mediaValidation.playerStateMachine.errorDetail && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 font-mono">
                  {snapshot.mediaValidation.playerStateMachine.errorDetail}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    handlePlayerAction(
                      snapshot.mediaValidation.validatedImagePaths[0],
                      'image',
                      'load'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                >
                  1. Carregar (loading)
                </button>
                <button
                  onClick={() =>
                    handlePlayerAction(
                      snapshot.mediaValidation.validatedImagePaths[0],
                      'image',
                      'play'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                >
                  2. Reproduzir (playing)
                </button>
                <button
                  onClick={() =>
                    handlePlayerAction(
                      snapshot.mediaValidation.validatedImagePaths[0],
                      'image',
                      'pause'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white"
                >
                  3. Pausar (paused)
                </button>
                <button
                  onClick={() =>
                    handlePlayerAction(
                      snapshot.mediaValidation.validatedImagePaths[0],
                      'image',
                      'end'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                >
                  4. Término (ended)
                </button>
                <button
                  onClick={() =>
                    handlePlayerAction(
                      '/src/assets/videos/non_existent_stream.mp4',
                      'video',
                      'play'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-xs font-bold text-rose-200 border border-rose-500/40"
                >
                  5. Testar Vídeo Local Ausente (error)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
