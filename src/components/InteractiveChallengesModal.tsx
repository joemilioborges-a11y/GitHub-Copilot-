import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Vote,
  ShieldCheck,
  Flame,
  Filter,
  Users,
  Award,
  Check,
} from 'lucide-react';
import { monetizationService } from '../services/monetizationService';
import { ChallengeModel } from '../types';

interface InteractiveChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onOpenCreatorStudio?: () => void;
}

export const InteractiveChallengesModal: React.FC<InteractiveChallengesModalProps> = ({
  isOpen,
  onClose,
  userId = 'current_user',
  onOpenCreatorStudio,
}) => {
  const [challenges, setChallenges] = useState<ChallengeModel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadChallenges = () => {
    const list = monetizationService.getChallenges();
    setChallenges(list);
    const map: Record<string, boolean> = {};
    for (const c of list) {
      if (c.votedUserIds.includes(userId)) {
        map[c.id] = true;
      }
    }
    setVotedMap(map);
  };

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleVote = (challengeId: string) => {
    try {
      const res = monetizationService.voteChallenge(challengeId, userId);
      setVotedMap((prev) => ({ ...prev, [challengeId]: true }));
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? { ...c, currentVotes: res.newVotes, votedUserIds: [...c.votedUserIds, userId] }
            : c
        )
      );
      showToast('Seu voto voluntário foi computado com sucesso!');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao registrar voto.');
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    if (selectedCategory === 'todos') return true;
    return c.category === selectedCategory;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'estilo_looks':
        return 'Estilo & Looks';
      case 'danca':
        return 'Dança & Coreografia';
      case 'moda_praia':
        return 'Moda Praia & Verão';
      case 'lingerie_sensual':
        return 'Lingerie Sensual';
      default:
        return cat;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0f0f18] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-[#141424] to-[#0c0c14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white font-display">
                  Desafios Interativos Consensuais
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FASE 1 · CONSENSUAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Votações de estilo, dança e moda entre criadores verificados e comunidade
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Regulatory Protection & Anti-Gambling Notice */}
        <div className="px-5 py-3 bg-amber-950/30 border-b border-amber-500/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300">Diretrizes de Proteção e Voluntariedade:</strong> Todos os desafios são estritamente <strong>voluntários</strong>. É terminantemente <strong>proibido qualquer tipo de aposta</strong>, premiação financeira com expectativa de retorno, pressão ou exigência de conteúdo não consensual.
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center animate-in slide-in-from-top-1">
            {toastMessage}
          </div>
        )}

        {/* Categories Bar */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-[#12121e] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Categorias:</span>
          {['todos', 'estilo_looks', 'moda_praia', 'danca', 'lingerie_sensual'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'todos' ? 'Todos os Desafios' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Challenges List */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {filteredChallenges.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">Nenhum desafio ativo nesta categoria.</p>
              <p className="text-xs text-slate-500">Novos desafios consensuais são publicados semanalmente por criadores autorizados.</p>
            </div>
          ) : (
            filteredChallenges.map((ch) => {
              const hasVoted = Boolean(votedMap[ch.id]);
              const progressPct = Math.min(100, Math.round((ch.currentVotes / ch.targetVotes) * 100));

              return (
                <div
                  key={ch.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#141422] border border-slate-800 hover:border-slate-700/80 transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                          {getCategoryLabel(ch.category)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Criado por <strong className="text-slate-200">{ch.creatorName}</strong>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-snug">{ch.title}</h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-amber-400 flex items-center justify-end gap-1">
                        <Vote className="w-3.5 h-3.5" />
                        <span>{ch.currentVotes} votos</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Meta: {ch.targetVotes} votos</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{ch.description}</p>

                  {/* Rules Pill Box */}
                  <div className="p-3 rounded-xl bg-[#0b0b14] border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Regras Oficiais do Desafio
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                      {ch.rules.map((rule, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Progress bar towards goal */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Progresso da Comunidade</span>
                      <strong className="text-rose-400">{progressPct}% atingido</strong>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Participação 100% gratuita e voluntária</span>
                    </div>

                    <button
                      onClick={() => handleVote(ch.id)}
                      disabled={hasVoted}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                        hasVoted
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-lg shadow-rose-950/40 transform active:scale-95'
                      }`}
                    >
                      {hasVoted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Voto Confirmado</span>
                        </>
                      ) : (
                        <>
                          <Vote className="w-3.5 h-3.5" />
                          <span>Votar neste Desafio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0d0d16] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Auditoria JOBS: Votações monitoradas contra bots e automações ilícitas.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
