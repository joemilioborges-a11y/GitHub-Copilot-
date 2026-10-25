import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  ShieldCheck,
  Clock,
  BookOpen,
  CheckCircle2,
  X,
  UserCheck,
  ChevronRight,
  Lock,
  Scale,
} from 'lucide-react';
import {
  monthlyRecognitionService,
  PublicRecognitionPayload,
  OfficialWinnerPublicCard,
} from '../services/monthlyRecognitionService';

interface MonthlyRecognitionPublicSectionProps {
  onSelectCreatorProfile?: (creatorId: string) => void;
}

export const MonthlyRecognitionPublicSection: React.FC<MonthlyRecognitionPublicSectionProps> = ({
  onSelectCreatorProfile,
}) => {
  const [selectedCycleId, setSelectedCycleId] = useState<'2026-09' | '2026-10'>('2026-09');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const publicData: PublicRecognitionPayload = useMemo(() => {
    return monthlyRecognitionService.getPublicRecognitionView(selectedCycleId, 'sandbox');
  }, [selectedCycleId]);

  const formatUtcToBrt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderWinnerCard = (
    categoryTitle: 'Garota JOBS' | 'Garoto JOBS',
    winner: OfficialWinnerPublicCard | null,
    noWinnerReason: string | null,
    isOfficial: boolean
  ) => {
    if (!isOfficial) {
      return (
        <div className="p-5 rounded-2xl bg-[#0d0d16] border border-white/10 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-amber-300 font-semibold tracking-wide">
                {categoryTitle} · {publicData.periodLabel}
              </div>
              <h4 className="text-base font-display font-bold text-white mt-1">
                Apuração Provisória em Andamento
              </h4>
            </div>
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Conforme as regras de governança do programa, os nomes dos candidatos permanecem protegidos durante a apuração provisória e somente são divulgados como vencedores após o fechamento mensal e a revisão administrativa.
          </p>

          <div className="pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Estado: Classificação Provisória</span>
            <span>Fuso: {publicData.timezone} (BRT)</span>
          </div>
        </div>
      );
    }

    if (!winner) {
      return (
        <div className="p-5 rounded-2xl bg-[#0d0d16] border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs text-slate-400 font-semibold">
              {categoryTitle} · {publicData.periodLabel}
            </div>
            <h4 className="text-base font-display font-bold text-white mt-1">
              Sem vencedor homologado no período
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {noWinnerReason || 'Não houve candidatos elegíveis que cumprissem os requisitos publicados no período.'}
          </p>
        </div>
      );
    }

    return (
      <div
        onClick={() => onSelectCreatorProfile?.(winner.creatorId)}
        className={`p-5 rounded-2xl bg-[#0d0d16] border border-amber-500/25 hover:border-amber-400/50 transition-all flex flex-col justify-between space-y-4 ${
          onSelectCreatorProfile ? 'cursor-pointer group' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <img
            src={winner.avatarUrl}
            alt={winner.publicName}
            className="w-16 h-16 rounded-2xl object-cover border border-amber-400/40 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{winner.titleLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Ciclo {winner.periodLabel}</span>
            </div>
            <h4 className="text-lg font-display font-bold text-white truncate mt-0.5 flex items-center gap-1.5">
              <span>{winner.publicName}</span>
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            </h4>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{winner.handle}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-mono font-semibold">
                {winner.finalScore.toFixed(2)} pts
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            <span>Validade do Título: </span>
            <strong className="text-slate-200 font-medium">{winner.validityLabel.trim()}</strong>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resultado Oficial Homologado</span>
            {onSelectCreatorProfile && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Garoto JOBS e Garota JOBS"
      className="p-5 sm:p-6 rounded-3xl bg-[#0b0b13] border border-white/10 space-y-5"
    >
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span>Reconhecimento Público Mensal</span>
              <span aria-hidden="true">·</span>
              <span>
                {publicData.isOfficial
                  ? 'Classificação Oficial Publicada'
                  : 'Classificação Provisória em Apuração'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Ambiente de Simulação Auditado</span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-white mt-0.5">
              Garoto JOBS e Garota JOBS
            </h2>
          </div>
        </div>

        {/* Interactive Cycle Selector & Rules Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-[#141422] rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setSelectedCycleId('2026-09')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedCycleId === '2026-09'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Vencedores Vigentes (Set/26)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycleId('2026-10')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedCycleId === '2026-10'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ciclo Atual (Out/26)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Regras e Critérios</span>
          </button>
        </div>
      </div>

      {/* Provisional Warning Banner when viewing an unapproved cycle */}
      {!publicData.isOfficial && publicData.provisionalNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">{publicData.provisionalNotice}</div>
            <div className="text-[11px] text-slate-400">
              Última atualização da apuração provisória: {formatUtcToBrt(publicData.lastProvisionalUpdateUtc)} BRT · Fórmula {publicData.formula.version}
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid: Garota JOBS & Garoto JOBS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderWinnerCard(
          'Garota JOBS',
          publicData.officialWinners.garota_jobs,
          publicData.noWinnerReasons.garota_jobs,
          publicData.isOfficial
        )}
        {renderWinnerCard(
          'Garoto JOBS',
          publicData.officialWinners.garoto_jobs,
          publicData.noWinnerReasons.garoto_jobs,
          publicData.isOfficial
        )}
      </div>

      {/* Footer Metadata Line */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div>
          Participação automática de criadores elegíveis · Sem inscrição manual · Sem premiação financeira automática nesta fase
        </div>
        <div>
          Fórmula auditável: 50% Econômica · 30% Conteúdo · 20% Integridade
        </div>
      </div>

      {/* Modal de Regras Públicas, Elegibilidade e Fórmula 50/30/20 */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e18] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 text-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="text-xs text-amber-400 font-semibold">
                  Regulamento Oficial e Transparência Algorítmica
                </div>
                <h3 className="text-lg font-display font-bold text-white mt-0.5">
                  Regras do Ranking Mensal Garoto JOBS e Garota JOBS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#141424] border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>1. Fórmula de Pontuação Combinada ({publicData.formula.version})</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px] bg-black/30 p-2.5 rounded-xl border border-white/5">
                  Pontuação Final = (0,50 × Nota Econômica) + (0,30 × Nota de Conteúdo) + (0,20 × Nota de Integridade)
                </p>
                <ul className="space-y-1.5 text-slate-300 list-disc pl-4">
                  {publicData.rulesSummary.scoringWeights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-[#141424] border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Elegibilidade Automática e Categorias Inclusivas</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 list-disc pl-4">
                  {publicData.rulesSummary.eligibilityCriteria.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-[#141424] border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-rose-400" />
                  <span>3. Critérios Objetivos de Desempate e Homologação</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc pl-4">
                  {publicData.rulesSummary.tieBreakers.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-slate-400 pt-1">
                  Caso uma categoria não possua candidatos elegíveis no período, o ciclo registra oficialmente a ausência de vencedor sem fabricar resultados.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
export default MonthlyRecognitionPublicSection;
