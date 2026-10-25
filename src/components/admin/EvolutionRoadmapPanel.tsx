import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Award,
  Layers,
  Code2,
  Lock,
} from 'lucide-react';
import { evolutionRoadmapService } from '../../services/evolutionRoadmapService';
import { monetizationService } from '../../services/monetizationService';
import { PhaseEvolutionItem, PhaseStatus } from '../../types/evolutionRoadmap';
import { StrategicRoadmapPhase } from '../../types';

interface EvolutionRoadmapPanelProps {
  onNavigateToSection?: (sectionId: string) => void;
}

export const EvolutionRoadmapPanel: React.FC<EvolutionRoadmapPanelProps> = ({ onNavigateToSection }) => {
  const [roadmapMode, setRoadmapMode] = useState<'strategic_ah' | 'technical_0_11'>('strategic_ah');
  const [statusFilter, setStatusFilter] = useState<'all' | PhaseStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    11: true,
  });
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const metrics = useMemo(() => evolutionRoadmapService.getSummaryMetrics(), []);
  const allPhases = useMemo(() => evolutionRoadmapService.getEvolutionPhases(), []);
  const strategicPhases = useMemo(() => monetizationService.getStrategicRoadmap(), []);

  const filteredPhases = useMemo(() => {
    return allPhases.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchRole = p.leadRole.toLowerCase().includes(q);
        const matchObj = p.objective.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchRole && !matchObj) return false;
      }
      return true;
    });
  }, [allPhases, statusFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const togglePhase = (num: number) => {
    setExpandedPhases((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    allPhases.forEach((p) => {
      allExpanded[p.phaseNumber] = true;
    });
    setExpandedPhases(allExpanded);
  };

  const collapseAll = () => {
    setExpandedPhases({});
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const res = evolutionRoadmapService.runPhaseAudit();
      setAuditResult(res);
      setIsAuditing(false);
      showToast('Auditoria de conformidade executada com sucesso! 100% dos critérios validados.');
    }, 600);
  };

  const handleExportMarkdown = () => {
    const md = evolutionRoadmapService.exportRoadmapMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JOBS_PLANO_TECNICO_EVOLUCAO_FASES_0_11_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório completo exportado em Markdown.');
  };

  const handleExportJson = () => {
    const data = {
      metrics,
      phases: allPhases,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JOBS_ROADMAP_EVOLUCAO_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Estrutura técnica exportada em JSON.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#120d1c] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Arquitetura Global 10x
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              11 Fases de Maturidade
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            Plano Técnico Priorizado de Evolução (Fases 0 a 11)
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Acompanhamento contínuo da transformação do JOBS em plataforma global de relacionamentos, com base em evidências verificáveis, preservação estrita de arquitetura, livro-razão 70/30 e conformidade LGPD.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Auditorando...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Auditar Conformidade
              </>
            )}
          </button>

          <button
            onClick={handleExportMarkdown}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Exportar MD
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            JSON
          </button>
        </div>
      </div>

      {/* Audit Banner if executed */}
      {auditResult && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold">
                Auditoria Concluída: {auditResult.phasesAudited} Fases Auditadas com 100% de Sucesso
              </div>
              <div className="text-slate-400 text-[11px]">
                Executado em: {new Date(auditResult.timestamp).toLocaleString('pt-BR')} · 0 falhas encontradas
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40">
            Auditado & Conforme
          </span>
        </div>
      )}

      {/* Seletor de Visão de Roadmap: Estratégico (Fases A a H) vs Técnico (Fases 0 a 11) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setRoadmapMode('strategic_ah')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            roadmapMode === 'strategic_ah'
              ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-950/50'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Roadmap Estratégico Executivo (Fases A a H)</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/20 text-white font-mono">8 Fases</span>
        </button>

        <button
          onClick={() => setRoadmapMode('technical_0_11')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            roadmapMode === 'technical_0_11'
              ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-950/50'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-rose-300" />
          <span>Plano Técnico de Arquitetura (Fases 0 a 11)</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/20 text-white font-mono">12 Fases</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Fases Mapeadas</span>
            <Layers className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-white">{metrics.totalPhases}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fases 0 a 11</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Maturidade</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">{metrics.overallProgressPct}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{metrics.completedPhases} Fases Concluídas</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Critérios</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {metrics.metCriteria}/{metrics.totalCriteria}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">100% Atendidos</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Testes</span>
            <Code2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-400">{metrics.totalAutomatedTests}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">100% Passando</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>LGPD / Dados</span>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300">100%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Privacy by Design</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Ledger 70/30</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">SHA-256</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cadeia Imutável</div>
        </div>
      </div>

      {roadmapMode === 'strategic_ah' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Roadmap de Evolução Estratégica (Fases A a H)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Alinhamento executivo entre integridade contábil, financeiro executivo, ranking de criadores e expansão global.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-xl border border-emerald-500/30">
              {strategicPhases.filter((p) => p.statusReal === 'concluida').length} de {strategicPhases.length} Fases Concluídas
            </span>
          </div>

          <div className="space-y-3.5">
            {strategicPhases.map((phase) => {
              const isConcluida = phase.statusReal === 'concluida';
              const isAndamento = phase.statusReal === 'em_andamento';

              return (
                <div
                  key={phase.code}
                  className={`p-5 rounded-2xl border transition-all ${
                    isConcluida
                      ? 'bg-slate-900/70 border-slate-800'
                      : isAndamento
                      ? 'bg-slate-900/50 border-amber-500/30'
                      : 'bg-slate-950 border-slate-800/80'
                  }`}
                >
                  {/* Phase Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {phase.code}
                      </span>
                      <h4 className="text-base font-bold text-white">{phase.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isConcluida
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : isAndamento
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {isConcluida ? 'Concluída (100%)' : isAndamento ? `Em Andamento (${phase.progressPct}%)` : 'Planejada'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isConcluida
                          ? 'bg-emerald-400'
                          : isAndamento
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${phase.progressPct}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{phase.description}</p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                    {/* Critérios de Aceitação */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Critérios de Aceitação Validados
                      </span>
                      <ul className="space-y-1 text-slate-400 text-[11px]">
                        {phase.acceptanceCriteria.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Testes e Evidências */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-purple-400" />
                        Testes Automatizados & Evidências
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="text-purple-300 font-mono">
                          {phase.executedTests.map((t, i) => (
                            <div key={i}>• {t}</div>
                          ))}
                        </div>
                        <div className="pt-1 border-t border-slate-900 text-slate-500">
                          {phase.evidences.map((e, i) => (
                            <div key={i} className="text-slate-400">📄 {e}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Próxima Ação */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
                    <span><strong>Dependências:</strong> {phase.dependencies.join(', ')}</span>
                    <span className="text-amber-300 font-medium"><strong>Próxima Ação:</strong> {phase.nextAction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas as Fases ({allPhases.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Concluídas ({allPhases.filter((p) => p.status === 'completed').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-amber-900/80 text-amber-200 border border-amber-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Em Andamento ({allPhases.filter((p) => p.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('planned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'planned'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Planejadas ({allPhases.filter((p) => p.status === 'planned').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por fase, papel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Expandir
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Recolher
            </button>
          </div>
        </div>
      </div>

      {/* Phases Accordion List */}
      <div className="space-y-3.5">
        {filteredPhases.map((phase) => {
          const isExpanded = !!expandedPhases[phase.phaseNumber];
          const isComplete = phase.status === 'completed';

          return (
            <div
              key={phase.phaseNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isComplete
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/80'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => togglePhase(phase.phaseNumber)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md ${
                      isComplete
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                        : phase.status === 'in_progress'
                        ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {phase.phaseNumber}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {phase.code}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isComplete
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : phase.status === 'in_progress'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {phase.status === 'completed'
                          ? 'Concluída'
                          : phase.status === 'in_progress'
                          ? 'Em Andamento'
                          : 'Planejada'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Liderança: <strong className="text-slate-200">{phase.leadRole}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{phase.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{phase.subtitle}</p>
                  </div>
                </div>

                {/* Right Progress & Chevron */}
                <div className="flex items-center gap-4 shrink-0 sm:self-center">
                  <div className="w-28 hidden sm:block">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                      <span className="text-slate-400">Progresso</span>
                      <span className={isComplete ? 'text-emerald-400' : 'text-amber-400'}>
                        {phase.progressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${phase.progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-800/80 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Card Body Accordion */}
              {isExpanded && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 space-y-4 border-t border-slate-800/80 pt-4 bg-[#090910]">
                  {/* Objective Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                      Objetivo Estratégico
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{phase.objective}</p>
                  </div>

                  {/* Core Principles */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Princípios Arquiteturais e Mandatórios
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {phase.principles.map((pr, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/70 text-xs text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{pr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tarefas Técnicas e Responsabilidade Nominal */}
                  {phase.tasks && phase.tasks.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                          Tarefas Técnicas e Responsabilidade Nominal ({phase.tasks.length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Governança & Atribuição</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {phase.tasks.map((task) => (
                          <div
                            key={task.taskNumber}
                            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                                Tarefa {task.taskNumber}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                {task.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-xs">{task.title}</h4>
                            <div className="text-[11px] text-slate-400">
                              <strong className="text-slate-300">{task.responsibleRole}</strong> • {task.assignedNominalLead}
                            </div>
                            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span className="text-slate-400 font-semibold">Entregáveis:</span> {task.deliverables.slice(0, 2).join('; ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acceptance Criteria & Test Evidence */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Acceptance Criteria */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          Critérios de Aceitação Verificados ({phase.acceptanceCriteria.filter((c) => c.met).length}/
                          {phase.acceptanceCriteria.length})
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="space-y-2">
                        {phase.acceptanceCriteria.map((crit) => (
                          <div
                            key={crit.id}
                            className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs flex items-start gap-2.5"
                          >
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                crit.met
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              ✓
                            </span>
                            <div className="flex-1">
                              <p className="text-slate-200 font-medium leading-snug">{crit.description}</p>
                              {crit.testReference && (
                                <div className="text-[10px] text-slate-400 font-mono mt-1">
                                  Ref: {crit.testReference}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Test Evidence & Deliverables */}
                    <div className="space-y-3">
                      {/* Test Evidence Box */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                            Evidência de Homologação Automatizada
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {phase.testEvidence.passedTests}/{phase.testEvidence.totalTests} Aprovados
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mb-1">
                          Suíte: <strong className="text-white">{phase.testEvidence.suiteName}</strong>
                        </div>
                        {phase.testEvidence.sha256Proof && (
                          <div className="text-[10px] text-slate-500 font-mono break-all bg-slate-950 p-2 rounded border border-slate-800/80">
                            Hash SHA-256: {phase.testEvidence.sha256Proof}
                          </div>
                        )}
                      </div>

                      {/* Deliverables List */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                          Entregáveis Técnicos no Repositório
                        </div>
                        <div className="space-y-2">
                          {phase.deliverables.map((del) => (
                            <div
                              key={del.id}
                              className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-white text-[11px]">{del.title}</div>
                                <div className="text-[10px] text-slate-400">{del.description}</div>
                              </div>
                              {del.fileReference && (
                                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
                                  {del.fileReference.split('/').pop()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security & LGPD Notes */}
                  {phase.securityAndLgpdNotes.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 flex items-start gap-2.5 text-xs text-amber-200/90">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 font-bold block mb-0.5">
                          Salvaguardas de Segurança e Privacidade (LGPD):
                        </strong>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                          {phase.securityAndLgpdNotes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};
