import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileCheck2,
  Scale,
  UserCheck,
  Lock,
  RotateCcw,
  MessageSquareWarning,
} from 'lucide-react';
import {
  monthlyRecognitionService,
  RecognitionEnvironment,
  RankedCreatorCandidate,
  FraudReviewStage,
} from '../../services/monthlyRecognitionService';

export const MonthlyRecognitionAdminPanel: React.FC = () => {
  const [environment, setEnvironment] = useState<RecognitionEnvironment>('sandbox');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('2026-10');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'garota_jobs' | 'garoto_jobs' | 'ineligible' | 'appeals'>('garota_jobs');
  const [refreshTick, setRefreshTick] = useState(0);

  // Administrative decision justification inputs
  const [decisionReason, setDecisionReason] = useState('');
  const [appealResolutionReason, setAppealResolutionReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const doRefresh = () => setRefreshTick((t) => t + 1);

  const cycle = useMemo(() => {
    return monthlyRecognitionService.getCycle(selectedCycleId, environment);
  }, [selectedCycleId, environment, refreshTick]);

  const appeals = useMemo(() => {
    return monthlyRecognitionService.getAppeals(environment);
  }, [environment, refreshTick]);

  const handleClosePeriod = () => {
    try {
      monthlyRecognitionService.closeCycleForReview({
        cycleId: selectedCycleId,
        actorId: 'admin_master_01',
        actorRole: 'master',
        justification:
          decisionReason.trim() ||
          `Encerramento contábil do ciclo ${selectedCycleId} para conferência de estornos e elegibilidade.`,
        environment,
      });
      setDecisionReason('');
      doRefresh();
      notify(`Ciclo ${selectedCycleId} fechado e encaminhado para revisão administrativa.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao fechar período.', 'error');
    }
  };

  const handleApproveAndPublish = () => {
    try {
      monthlyRecognitionService.approveAndPublishOfficialCycle({
        cycleId: selectedCycleId,
        actorId: 'admin_master_01',
        actorRole: 'master',
        justification:
          decisionReason.trim() ||
          `Aprovação e homologação oficial do ciclo ${selectedCycleId} após auditoria dos componentes 50/30/20.`,
        environment,
      });
      setDecisionReason('');
      doRefresh();
      notify(`Resultado oficial do ciclo ${selectedCycleId} aprovado e publicado!`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao aprovar publicação oficial.', 'error');
    }
  };

  const handleRejectOrReanalyze = () => {
    try {
      monthlyRecognitionService.rejectOrRequestReanalysis({
        cycleId: selectedCycleId,
        actorId: 'admin_security_lead',
        actorRole: 'security',
        justification:
          decisionReason.trim() ||
          `Solicitada nova análise de transações e alertas antifraude no ciclo ${selectedCycleId}.`,
        environment,
      });
      setDecisionReason('');
      doRefresh();
      notify(`Ciclo ${selectedCycleId} marcado para nova análise administrativa.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao solicitar nova análise.', 'error');
    }
  };

  const handleCorrectOfficialCycle = () => {
    try {
      monthlyRecognitionService.correctOfficialCycle({
        cycleId: selectedCycleId,
        actorId: 'admin_master_01',
        actorRole: 'master',
        reason:
          decisionReason.trim() ||
          `Retificação formal pós-publicação do ciclo ${selectedCycleId} com preservação do histórico anterior.`,
        environment,
      });
      setDecisionReason('');
      doRefresh();
      notify(`Retificação oficial do ciclo ${selectedCycleId} registrada com trilha histórica preservada.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao retificar ciclo oficial.', 'error');
    }
  };

  const handleFraudStageChange = (creatorId: string, newStage: FraudReviewStage) => {
    try {
      monthlyRecognitionService.updateCreatorFraudStage({
        creatorId,
        newStage,
        actorId: 'admin_security_lead',
        actorRole: 'security',
        justification:
          decisionReason.trim() ||
          `Revisão humana de integridade antifraude para '${newStage}' no criador ${creatorId}.`,
        environment,
      });
      doRefresh();
      notify(`Estágio antifraude de '${creatorId}' atualizado para '${newStage}'.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao atualizar estágio antifraude.', 'error');
    }
  };

  const handleResolveAppeal = (appealId: string, decision: 'approved' | 'rejected') => {
    try {
      monthlyRecognitionService.resolveCreatorAppeal({
        appealId,
        decision,
        actorId: 'admin_master_01',
        actorRole: 'master',
        justification:
          appealResolutionReason.trim() ||
          `Decisão administrativa ('${decision}') após conferência de telemetria e documentos do criador.`,
        restoreEligibilityAndTelemetry: decision === 'approved',
        environment,
      });
      setAppealResolutionReason('');
      doRefresh();
      notify(`Recurso ${appealId} julgado como '${decision === 'approved' ? 'Deferido' : 'Indeferido'}'.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao julgar recurso.', 'error');
    }
  };

  const renderCandidateTable = (candidates: RankedCreatorCandidate[]) => {
    if (candidates.length === 0) {
      return (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
          Nenhum candidato elegível encontrado nesta categoria para o período e ambiente selecionados.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
            <tr>
              <th className="py-3 px-3">Pos.</th>
              <th className="py-3 px-3">Criador</th>
              <th className="py-3 px-3">Nota Econômica (50%)</th>
              <th className="py-3 px-3">Nota Conteúdo (30%)</th>
              <th className="py-3 px-3">Nota Integridade (20%)</th>
              <th className="py-3 px-3">Pontuação Final</th>
              <th className="py-3 px-3">Status Antifraude</th>
              <th className="py-3 px-3">Ação de Revisão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {candidates.map((cand) => (
              <tr key={cand.creatorId} className="hover:bg-slate-900/50">
                <td className="py-3 px-3 font-mono font-bold text-amber-400">
                  {cand.rank ? `#${cand.rank}` : '—'}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={cand.avatarUrl}
                      alt={cand.publicName}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                    />
                    <div>
                      <div className="font-bold text-white">{cand.publicName}</div>
                      <div className="text-[11px] text-slate-400">
                        {cand.handle} · Verificado desde {cand.verifiedSinceDate}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono font-bold text-emerald-400">
                    {cand.scores.economicScore.toFixed(2)} pts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Líq. Elegível: R$ {cand.scores.netEligiblePlatformRevenueBrl.toFixed(2)} · Estorno: {cand.scores.confirmedRefundRatePct.toFixed(2)}%
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono font-bold text-sky-400">
                    {cand.scores.contentScore.toFixed(2)} pts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {cand.scores.cappedUploadsScoredCount} uploads válidos · {cand.scores.validActiveDaysCount} dias ativos
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono font-bold text-purple-300">
                    {cand.scores.integrityScore.toFixed(2)} pts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    KYC {cand.scores.kycPoints}/40 · Viol. {cand.scores.zeroViolationPoints}/30 · Tel. {cand.scores.telemetryPoints}/10
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-mono text-sm font-black text-amber-300">
                    {cand.scores.finalScore.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">Fórmula {cand.scores.formulaVersion}</div>
                </td>
                <td className="py-3 px-3">
                  <div className="text-xs font-semibold">
                    {cand.fraudStage === 'clean' && <span className="text-emerald-400">Regular (Limpo)</span>}
                    {cand.fraudStage === 'alert' && <span className="text-amber-300">Alerta em Observação</span>}
                    {cand.fraudStage === 'under_investigation' && (
                      <span className="text-orange-400">Em Investigação Humana</span>
                    )}
                    {cand.fraudStage === 'confirmed_fraud' && (
                      <span className="text-rose-400 font-bold">Fraude Confirmada (Impedido)</span>
                    )}
                  </div>
                  {cand.eligibility.reviewWarnings.length > 0 && (
                    <div className="text-[10px] text-amber-300/90 mt-0.5 max-w-xs">
                      {cand.eligibility.reviewWarnings[0]}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    {cand.fraudStage !== 'clean' && (
                      <button
                        type="button"
                        onClick={() => handleFraudStageChange(cand.creatorId, 'clean')}
                        className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer"
                      >
                        Aprovar Revisão
                      </button>
                    )}
                    {cand.fraudStage !== 'confirmed_fraud' && (
                      <button
                        type="button"
                        onClick={() => handleFraudStageChange(cand.creatorId, 'confirmed_fraud')}
                        className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[10px] font-semibold cursor-pointer"
                      >
                        Confirmar Impedimento
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Governance & Environment Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-amber-400 font-semibold">
              Governança do Programa Mensal · Fórmula {cycle.formula.version} · Fuso {cycle.timezone}
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Ranking Mensal Garoto JOBS e Garota JOBS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Apuração auditável 50% Econômica · 30% Conteúdo · 20% Integridade. Publicação oficial exige revisão humana e justificativa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Environment Selector (Strict Sandbox vs Production Isolation) */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  environment === 'sandbox'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sandbox (Simulação)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  environment === 'production'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Produção (Isolado)
              </button>
            </div>

            {/* Cycle Selector */}
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold cursor-pointer"
            >
              <option value="2026-10">Ciclo Outubro/2026 (Vigente)</option>
              <option value="2026-09">Ciclo Setembro/2026 (Histórico)</option>
            </select>
          </div>
        </div>

        {/* Cycle Status & Administrative Action Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
            <div className="text-slate-400">Estado do Ciclo ({cycle.periodLabel}):</div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              {cycle.status === 'officially_published' || cycle.status === 'corrected_republished' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {cycle.status === 'open_provisional' && 'Classificação Provisória Aberta'}
                {cycle.status === 'closed_pending_review' && 'Fechado · Aguardando Revisão Admin'}
                {cycle.status === 'officially_published' && 'Publicado Oficialmente'}
                {cycle.status === 'review_rejected' && 'Revisão Rejeitada / Em Reanálise'}
                {cycle.status === 'corrected_republished' && 'Retificado e Republicado Oficialmente'}
              </span>
            </div>
            {cycle.approvedBy && (
              <div className="text-[11px] text-slate-400">
                Homologado por <strong className="text-slate-200">{cycle.approvedBy}</strong>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Justificativa obrigatória para aprovar, fechar, rejeitar ou retificar o ciclo..."
              className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />

            {cycle.status === 'open_provisional' && (
              <button
                type="button"
                onClick={handleClosePeriod}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Fechar Período
              </button>
            )}

            {cycle.status !== 'officially_published' && cycle.status !== 'corrected_republished' ? (
              <>
                <button
                  type="button"
                  onClick={handleApproveAndPublish}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Aprovar e Publicar
                </button>
                <button
                  type="button"
                  onClick={handleRejectOrReanalyze}
                  className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Solicitar Nova Análise
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCorrectOfficialCycle}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Registrar Correção Oficial</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category / Inspection Sub-tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('garota_jobs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            selectedCategoryTab === 'garota_jobs'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Garota JOBS ({cycle.candidatesGarota.length} elegíveis)
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('garoto_jobs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            selectedCategoryTab === 'garoto_jobs'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Garoto JOBS ({cycle.candidatesGaroto.length} elegíveis)
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('ineligible')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            selectedCategoryTab === 'ineligible'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Inelegíveis & Motivos ({cycle.ineligibleCandidates.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('appeals')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            selectedCategoryTab === 'appeals'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Recursos e Histórico ({appeals.length})
        </button>
      </div>

      {/* Active Tab Content */}
      {selectedCategoryTab === 'garota_jobs' && renderCandidateTable(cycle.candidatesGarota)}
      {selectedCategoryTab === 'garoto_jobs' && renderCandidateTable(cycle.candidatesGaroto)}

      {selectedCategoryTab === 'ineligible' && (
        <div className="space-y-3">
          {cycle.ineligibleCandidates.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              Nenhum criador inelegível registrado neste ambiente.
            </div>
          ) : (
            cycle.ineligibleCandidates.map((cand) => (
              <div
                key={cand.creatorId}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white">
                    {cand.publicName} ({cand.handle}) · Categoria declarada: {cand.category}
                  </div>
                  <ul className="list-disc pl-4 text-rose-300 space-y-0.5">
                    {cand.eligibility.ineligibilityReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cand.fraudStage === 'confirmed_fraud' && (
                    <button
                      type="button"
                      onClick={() => handleFraudStageChange(cand.creatorId, 'clean')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer"
                    >
                      Reabilitar após Recurso
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedCategoryTab === 'appeals' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <span>Recursos e Solicitações de Revisão dos Criadores</span>
            </h4>

            <input
              type="text"
              value={appealResolutionReason}
              onChange={(e) => setAppealResolutionReason(e.target.value)}
              placeholder="Justificativa da decisão sobre o recurso..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
            />

            <div className="space-y-2.5">
              {appeals.map((app) => (
                <div
                  key={app.appealId}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white">
                      {app.creatorName} ({app.creatorId}) · Ciclo {app.cycleId} · Status: {app.status}
                    </div>
                    <p className="text-slate-300">{app.reason}</p>
                    {app.resolutionJustification && (
                      <p className="text-emerald-400 text-[11px]">
                        Parecer ({app.reviewedBy}): {app.resolutionJustification}
                      </p>
                    )}
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResolveAppeal(app.appealId, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        Deferir e Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveAppeal(app.appealId, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-semibold cursor-pointer"
                      >
                        Indeferir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Decisões e Correções Oficiais do Ciclo */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <h4 className="text-sm font-bold text-white">
              Trilha de Decisões Administrativas e Correções do Ciclo ({cycle.cycleId})
            </h4>
            {cycle.reviewHistory.length === 0 ? (
              <p className="text-slate-400">Nenhuma transição administrativa registrada ainda neste ciclo.</p>
            ) : (
              <div className="space-y-2">
                {cycle.reviewHistory.map((dec) => (
                  <div key={dec.decisionId} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="font-semibold text-white">
                      {dec.action} · {dec.previousStatus} → {dec.newStatus} · Responsável: {dec.actorId} ({dec.actorRole})
                    </div>
                    <div className="text-slate-300 mt-0.5">Justificativa: {dec.justification}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {dec.timestamp} · Fórmula {dec.formulaVersion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default MonthlyRecognitionAdminPanel;
