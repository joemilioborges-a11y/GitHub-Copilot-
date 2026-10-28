import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  Target,
  Flame,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Video,
  Users,
  PlusCircle,
  ArrowUpRight,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Info,
  Medal,
  Crown,
  Star,
  AlertTriangle,
  Loader2,
  Inbox,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import {
  TalentParticipantRole,
  TalentActionTarget,
  SimulatedTalentChallengeSeed,
  TalentCloudSyncResult,
  getInitialChallengeSeeds,
  buildTalentDashboardStateByEnvironment,
  advanceSimulatedChallengeStep,
  recordAuditedDailyTalentActivity,
  syncAuditedTalentActivityToCloud,
} from '../services/talentChallengesSimulationService';
import { runtimeEnvironmentService, RuntimeEnvironmentMode } from '../services/runtimeEnvironmentService';
import { exclusiveContentAndInterestService } from '../services/exclusiveContentAndInterestService';
import { matchAndMessagingService } from '../services/matchAndMessagingService';

export interface TalentWorthSectionProps {
  userId?: string;
  onNavigate?: (tab: string) => void;
  onOpenChallenges?: () => void;
  onOpenCreatorContentStudio?: () => void;
  onOpenReferralModal?: () => void;
}

type SimulationViewMode = 'normal' | 'loading' | 'empty' | 'error';

export const TalentWorthSection: React.FC<TalentWorthSectionProps> = ({
  userId = 'current_user',
  onNavigate,
  onOpenChallenges,
  onOpenCreatorContentStudio,
  onOpenReferralModal,
}) => {
  const [environmentMode, setEnvironmentMode] = useState<RuntimeEnvironmentMode>(() =>
    runtimeEnvironmentService.getMode()
  );
  const [auditRefreshTick, setAuditRefreshTick] = useState(0);
  const [role, setRole] = useState<TalentParticipantRole>('produtor_conteudo');
  const [seedsByRole, setSeedsByRole] = useState<
    Record<TalentParticipantRole, SimulatedTalentChallengeSeed[]>
  >(() => ({
    produtor_conteudo: getInitialChallengeSeeds('produtor_conteudo'),
    colaborador: getInitialChallengeSeeds('colaborador'),
  }));
  const [expandedChallengeIds, setExpandedChallengeIds] = useState<Record<string, boolean>>({
    criador_em_acao: true,
  });
  const [viewMode, setViewMode] = useState<SimulationViewMode>('normal');
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<TalentCloudSyncResult | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    const unsubscribeEnv = runtimeEnvironmentService.subscribe((nextMode) => {
      setEnvironmentMode(nextMode);
      setViewMode('normal');
      setSimulationFeedback(null);
      setAuditRefreshTick((t) => t + 1);
    });
    const unsubscribeExcl = exclusiveContentAndInterestService.subscribe(() => {
      setAuditRefreshTick((t) => t + 1);
    });
    const unsubscribeMatch = matchAndMessagingService.subscribe(() => {
      setAuditRefreshTick((t) => t + 1);
    });
    return () => {
      unsubscribeEnv();
      unsubscribeExcl();
      unsubscribeMatch();
    };
  }, []);

  const isSimulation = environmentMode === 'simulation';

  // Sincronização automática em eventos quando em Modo Produção
  useEffect(() => {
    let active = true;
    if (environmentMode !== 'production') {
      setCloudSyncState(null);
      setIsCloudSyncing(false);
      return;
    }
    setIsCloudSyncing(true);
    syncAuditedTalentActivityToCloud({
      userId,
      role,
      mode: 'production',
    })
      .then((res) => {
        if (active) {
          setCloudSyncState(res);
          setIsCloudSyncing(false);
        }
      })
      .catch(() => {
        if (active) {
          setIsCloudSyncing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [environmentMode, role, userId, auditRefreshTick]);

  const currentSeeds = useMemo(() => {
    if (!isSimulation) return undefined;
    if (viewMode === 'empty') return [];
    return seedsByRole[role];
  }, [seedsByRole, role, viewMode, isSimulation]);

  const dashboardState = useMemo(
    () =>
      buildTalentDashboardStateByEnvironment({
        role,
        userId,
        mode: environmentMode,
        customSeeds: currentSeeds,
      }),
    [role, userId, environmentMode, currentSeeds, auditRefreshTick]
  );

  const toggleExpandChallenge = (challengeId: string) => {
    setExpandedChallengeIds((prev) => ({
      ...prev,
      [challengeId]: !prev[challengeId],
    }));
  };

  const handleAdvanceStep = (challengeId: SimulatedTalentChallengeSeed['id'], title: string) => {
    if (!isSimulation) return;
    setSeedsByRole((prev) => ({
      ...prev,
      [role]: advanceSimulatedChallengeStep(prev[role], challengeId, 1),
    }));
    setSimulationFeedback(
      `Progresso simulado atualizado em "${title}". Nenhum saldo financeiro (R$) ou crédito (💎) foi alterado.`
    );
  };

  const handleResetSimulation = () => {
    setSeedsByRole({
      produtor_conteudo: getInitialChallengeSeeds('produtor_conteudo'),
      colaborador: getInitialChallengeSeeds('colaborador'),
    });
    setViewMode('normal');
    setSimulationFeedback('Dados fictícios restaurados para os valores determinísticos iniciais.');
  };

  const handleSyncProductionProgress = async () => {
    recordAuditedDailyTalentActivity(userId, undefined, 'production');
    setAuditRefreshTick((t) => t + 1);
    setIsCloudSyncing(true);
    const syncResult = await syncAuditedTalentActivityToCloud({
      userId,
      role,
      mode: 'production',
    });
    setCloudSyncState(syncResult);
    setIsCloudSyncing(false);
    setSimulationFeedback(syncResult.message);
  };

  const handleTriggerModuleAction = (target: TalentActionTarget, challengeTitle: string) => {
    if (!isSimulation) {
      recordAuditedDailyTalentActivity(userId, undefined, 'production');
      setAuditRefreshTick((t) => t + 1);
    }
    switch (target) {
      case 'creator_studio':
        if (onOpenCreatorContentStudio) {
          onOpenCreatorContentStudio();
          return;
        }
        break;
      case 'live_center':
        if (onNavigate) {
          onNavigate('live');
          return;
        }
        break;
      case 'discover_connections':
        if (onNavigate) {
          onNavigate('discover');
          return;
        }
        break;
      case 'interactive_challenges':
        if (onOpenChallenges) {
          onOpenChallenges();
          return;
        }
        break;
      case 'referral_network':
        if (onOpenReferralModal) {
          onOpenReferralModal();
          return;
        }
        break;
    }
    setSimulationFeedback(`Ação vinculada ao desafio "${challengeTitle}" selecionada.`);
  };

  const getChallengeIcon = (id: SimulatedTalentChallengeSeed['id']) => {
    switch (id) {
      case 'criador_em_acao':
        return <PlusCircle className="w-5 h-5 text-rose-400" />;
      case 'conexao_ativa':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'ao_vivo_no_jobs':
        return <Video className="w-5 h-5 text-amber-400" />;
      case 'consistencia_semanal':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'talento_em_destaque':
        return <Trophy className="w-5 h-5 text-purple-400" />;
    }
  };

  const getStatusBadgeClasses = (status: 'nao_iniciado' | 'em_andamento' | 'concluido') => {
    switch (status) {
      case 'concluido':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
      case 'em_andamento':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
      case 'nao_iniciado':
        return 'bg-slate-800/80 border-white/15 text-slate-300';
    }
  };

  const { indicators, challenges, achievements, currentLevel } = dashboardState;
  const effectiveViewMode: SimulationViewMode = isSimulation ? viewMode : 'normal';

  return (
    <section
      aria-labelledby="talent-worth-heading"
      className="rounded-3xl bg-gradient-to-br from-[#161224] via-[#121324] to-[#1a131f] border border-amber-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Efeitos sutis de iluminação de fundo */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* =================================================================== */}
      {/* 1. CABEÇALHO DA SEÇÃO + BADGE DE AMBIENTE + SELETOR DE PERFIL       */}
      {/* =================================================================== */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase border ${
                isSimulation
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isSimulation ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {dashboardState.simulationNotice}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold">
              <Crown className="w-3.5 h-3.5 text-rose-400" />
              Nível {currentLevel.levelNumber}: {currentLevel.levelTitle}
            </span>
            {!isSimulation && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  cloudSyncState?.cloudPersisted
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                {isCloudSyncing
                  ? 'Sincronizando Firestore...'
                  : cloudSyncState?.cloudPersisted
                  ? 'Firestore: /talent_progress sincronizado'
                  : 'Auditoria ativa (/talent_progress)'}
                {cloudSyncState?.lastSyncedAtIso && (
                  <span className="text-[10px] text-slate-300 font-normal">
                    •{' '}
                    {new Date(cloudSyncState.lastSyncedAtIso).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </span>
            )}
          </div>

          <h2
            id="talent-worth-heading"
            className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight"
          >
            Seu talento vale muito!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Participe dos desafios, alcance suas metas e acompanhe sua evolução no JOBS.
          </p>
        </div>

        {/* Seletor de Perspectiva (Produtor de Conteúdo vs Colaborador) & Controles por Ambiente */}
        <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Perspectiva de participação"
            className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/10"
          >
            <button
              type="button"
              onClick={() => {
                setRole('produtor_conteudo');
                setSimulationFeedback(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                role === 'produtor_conteudo'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Produtor de Conteúdo
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('colaborador');
                setSimulationFeedback(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                role === 'colaborador'
                  ? 'bg-gradient-to-r from-indigo-400 to-emerald-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Colaborador
            </button>
          </div>

          {isSimulation ? (
            /* Controles de Estado de Interface exclusivos do Modo Simulação */
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold mr-1">Estado UI:</span>
              {(
                [
                  { id: 'normal', label: 'Padrão' },
                  { id: 'loading', label: 'Carregando' },
                  { id: 'empty', label: 'Vazio' },
                  { id: 'error', label: 'Erro' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`px-2 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    viewMode === mode.id
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetSimulation}
                title="Restaurar dados determinísticos iniciais"
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
              </button>
            </div>
          ) : (
            /* Controle de sincronização real em Modo Produção */
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSyncProductionProgress}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sincronizar progresso auditado</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback de Ação */}
      {simulationFeedback && (
        <div
          role="status"
          className="relative z-10 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simulationFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSimulationFeedback(null)}
            className="text-[11px] font-bold text-emerald-300 hover:text-white underline cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TRATAMENTO DE ESTADOS DE CARREGAMENTO E ERRO                        */}
      {/* =================================================================== */}
      {effectiveViewMode === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="relative z-10 py-12 px-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center text-center space-y-3"
        >
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <div className="text-sm font-bold text-white">
            Carregando indicadores e desafios simulados...
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Sincronizando metas determinísticas da temporada para o perfil selecionado.
          </p>
        </div>
      )}

      {effectiveViewMode === 'error' && (
        <div
          role="alert"
          className="relative z-10 p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-white">
                Não foi possível carregar os desafios simulados
              </h3>
              <p className="text-xs text-rose-200/80">
                Este é um estado de falha simulado para validação de resiliência visual. Nenhum dado foi perdido.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('normal')}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-extrabold transition-all cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. OS 5 INDICADORES PRINCIPAIS (CARDS)                              */}
      {/* =================================================================== */}
      {effectiveViewMode !== 'loading' && effectiveViewMode !== 'error' && (
        <>
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Card 1: Meu progresso */}
            <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Meu progresso</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-display font-extrabold text-white">
                  {indicators.meuProgressoPercent}%
                </div>
                <div className="text-[11px] text-slate-400">
                  {indicators.desafiosConcluidosCount} de {indicators.totalDesafiosCount} metas concluídas
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${indicators.meuProgressoPercent}%` }}
                />
              </div>
            </div>

            {/* Card 2: Desafios ativos */}
            <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Desafios ativos</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-display font-extrabold text-amber-300">
                  {indicators.desafiosAtivosCount}
                </div>
                <div className="text-[11px] text-slate-400">
                  Em andamento de {indicators.totalDesafiosCount} disponíveis
                </div>
              </div>
              <div className="text-[10px] font-semibold text-amber-300/90">
                Perfil: {dashboardState.roleLabel}
              </div>
            </div>

            {/* Card 3: Pontos conquistados */}
            <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Pontos conquistados</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                  <Star className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-display font-extrabold text-purple-300">
                  {indicators.pontosConquistados.toLocaleString('pt-BR')}{' '}
                  <span className="text-xs font-bold text-slate-400">pts</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  De {indicators.pontosTotaisPossiveis.toLocaleString('pt-BR')} pts{' '}
                  {isSimulation ? 'na simulação' : 'na temporada'}
                </div>
              </div>
              <div className="text-[10px] font-semibold text-purple-300/90">
                Pontuação gamificada (sem valor R$)
              </div>
            </div>

            {/* Card 4: Meta da semana */}
            <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Meta da semana</span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-display font-extrabold text-white">
                  {indicators.metaDaSemana.formattedProgress}
                </div>
                <div className="text-[11px] text-slate-400">
                  {indicators.metaDaSemana.visualBarPercent}% do objetivo semanal
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${indicators.metaDaSemana.visualBarPercent}%` }}
                />
              </div>
            </div>

            {/* Card 5: Próxima conquista */}
            <div className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Próxima conquista</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-indigo-200 line-clamp-1">
                  {indicators.proximaConquista.rewardTitle}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {indicators.proximaConquista.objectiveSummary}
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-sky-400 rounded-full transition-all duration-300"
                  style={{ width: `${indicators.proximaConquista.visualBarPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* 3. LISTA DE DESAFIOS E METAS                                        */}
          {/* =================================================================== */}
          <div className="relative z-10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Desafios e Metas da Temporada</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhe cada objetivo, consulte os critérios de conclusão e avance sua evolução.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {dashboardState.cycleLabel}
              </span>
            </div>

            {challenges.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center text-center space-y-3">
                <Inbox className="w-8 h-8 text-slate-500" />
                <div className="text-sm font-bold text-white">
                  Nenhum desafio disponível neste estado vazio simulado
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  Restaure o modo padrão para visualizar os 5 desafios de colaboradores e produtores de conteúdo.
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('normal')}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-extrabold transition-all cursor-pointer"
                >
                  Exibir desafios padrão
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {challenges.map((challenge) => {
                  const isExpanded = Boolean(expandedChallengeIds[challenge.id]);
                  const { metrics } = challenge;

                  return (
                    <div
                      key={challenge.id}
                      className="rounded-2xl bg-black/35 border border-white/10 hover:border-white/20 p-4 sm:p-5 transition-all space-y-3.5"
                    >
                      {/* Topo do Desafio */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            {getChallengeIcon(challenge.id)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm sm:text-base font-display font-extrabold text-white">
                                {challenge.title}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClasses(
                                  metrics.status
                                )}`}
                              >
                                {challenge.statusLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-300">
                                {challenge.categoryBadge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {challenge.objectiveDescription}
                            </p>
                          </div>
                        </div>

                        {/* Recompensa em Pontos e Prazo */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-200 text-xs font-extrabold">
                            <Star className="w-3.5 h-3.5 text-purple-400" />
                            +{challenge.pointsReward} {isSimulation ? 'pts simulados' : 'pts'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {challenge.simulatedDeadline}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso e Contadores Numéricos Coerentes */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">
                            Progresso:{' '}
                            <span className="text-amber-300 font-extrabold">
                              {metrics.formattedCounter}
                            </span>{' '}
                            <span className="text-slate-400 font-normal">
                              ({challenge.unitLabel})
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            {metrics.isOverTarget && (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                Meta superada ({metrics.rawPercent}%)
                              </span>
                            )}
                            <span className="font-extrabold text-white">
                              {metrics.visualBarPercent}%
                            </span>
                          </div>
                        </div>

                        <div
                          role="progressbar"
                          aria-valuenow={metrics.visualBarPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progresso do desafio ${challenge.title}`}
                          className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              metrics.status === 'concluido'
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                                : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500'
                            }`}
                            style={{ width: `${metrics.visualBarPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Ações do Desafio e Botão de Expansão de Critérios */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleExpandChallenge(challenge.id)}
                          aria-expanded={isExpanded}
                          className="text-xs font-bold text-slate-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 text-amber-400" />
                              <span>Ocultar critérios e regras</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 text-amber-400" />
                              <span>Ver critérios de conclusão ({challenge.completionCriteria.length})</span>
                            </>
                          )}
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          {isSimulation && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStep(challenge.id, challenge.title)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>+1 etapa (Simular)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleTriggerModuleAction(challenge.actionTarget, challenge.title)
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>{challenge.actionLabel}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Painel Expandido: Critérios de Conclusão e Período */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                            <span className="font-bold text-slate-200">
                              Critérios de conclusão verificáveis:
                            </span>
                            <span>{challenge.campaignPeriod}</span>
                          </div>
                          <ul className="space-y-1.5 text-slate-300">
                            {challenge.completionCriteria.map((criterion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{criterion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* 4. ÁREA DE RECOMPENSAS E INCENTIVO ("SUAS CONQUISTAS")              */}
          {/* =================================================================== */}
          <div className="relative z-10 pt-2 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <span>Suas conquistas</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isSimulation
                    ? 'Recompensas ilustrativas desbloqueadas conforme sua pontuação simulada avança.'
                    : 'Medalhas, níveis e reconhecimentos gamificados desbloqueados por atividade auditada.'}
                </p>
              </div>
              <span className="text-xs font-bold text-purple-300">
                Pontuação atual: {indicators.pontosConquistados.toLocaleString('pt-BR')}{' '}
                {isSimulation ? 'pts simulados' : 'pts'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {achievements.map((reward) => (
                <div
                  key={reward.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    reward.unlocked
                      ? 'bg-gradient-to-br from-amber-500/15 via-black/40 to-emerald-500/10 border-amber-500/40'
                      : 'bg-black/30 border-white/10 opacity-85'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-extrabold text-slate-200">
                        {reward.categoryLabel}
                      </span>
                      {reward.unlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Desbloqueada
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">
                          Meta: {reward.requiredPoints} pts
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-display font-extrabold text-white">
                      {reward.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {reward.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-amber-300">{reward.badgeText}</span>
                      <span className="font-bold text-slate-300">{reward.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          reward.unlocked
                            ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                            : 'bg-gradient-to-r from-purple-400 to-indigo-400'
                        }`}
                        style={{ width: `${reward.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nota de Transparência e Separação Conceitual (Pontos vs Créditos vs R$) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Separação Contábil e Transparência do JOBS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{dashboardState.conceptualSeparationNotice.simulatedPoints}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{dashboardState.conceptualSeparationNotice.virtualCredits}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{dashboardState.conceptualSeparationNotice.realFinancialValues}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
