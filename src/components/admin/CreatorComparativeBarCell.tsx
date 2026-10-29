import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  PieChart,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { CreatorRankingItem } from '../../types';
import { creatorRankingAnalyticalService } from '../../services/creatorRankingAnalyticalService';
import { CreatorEarningsComparativeSeries } from '../../types/creatorFinancialRanking';

interface CreatorComparativeBarCellProps {
  creator: CreatorRankingItem;
  environment: 'sandbox' | 'production';
  period: string;
  isAnonymized?: boolean;
}

export const CreatorComparativeBarCell: React.FC<CreatorComparativeBarCellProps> = ({
  creator,
  environment,
  period,
  isAnonymized = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const series: CreatorEarningsComparativeSeries = creatorRankingAnalyticalService.getCreatorComparativeSeries(
    creator,
    environment,
    period
  );

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Fechar ao pressionar a tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const { currentPeriod, priorPeriod, deltaPct, deltaAbsoluteBrl, hasHistoryGap } = series;

  // Calcular porcentagens da barra empilhada
  // Gross = 100%. Se Gross > 0, 70% Criador, 30% JOBS, e estornos
  const gross = currentPeriod.grossSalesBrl;
  const refunds = currentPeriod.refundsBrl;
  const totalBase = gross > 0 ? gross : 1;

  const creatorSharePct = gross > 0 ? Math.min(100, (currentPeriod.creatorShareBrl / totalBase) * 100) : 0;
  const platformFeePct = gross > 0 ? Math.min(100, (currentPeriod.platformFeeBrl / totalBase) * 100) : 0;
  const refundsPct = gross > 0 ? Math.min(100, (refunds / totalBase) * 100) : 0;

  const popoverId = `comparative-bar-popover-${creator.creatorId}`;

  return (
    <div ref={containerRef} className="relative flex flex-col items-end gap-1 min-w-[130px]">
      {/* Botão Interativo com Visualização Compacta da Barra */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={`Ver decomposição contábil e histórico comparativo de ${
          isAnonymized ? `Criador #${creator.rank}` : creator.publicName
        }`}
        className="w-full text-right p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition-colors cursor-pointer group"
      >
        {/* Valor Principal em destaque */}
        <div className="flex items-center justify-end gap-1.5 font-mono">
          <span className="font-bold text-emerald-300 text-xs tabular-nums group-hover:text-emerald-200 transition-colors">
            R$ {creator.netAccumulatedEarningsBrl.toFixed(2).replace('.', ',')}
          </span>

          {/* Badge de Comparação Temporal */}
          {environment === 'production' ? (
            <span className="text-[9px] text-slate-500 font-sans" title="Integração de produção pendente">
              Prod
            </span>
          ) : deltaPct !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded ${
                deltaPct > 0
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                  : deltaPct < 0
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                  : 'text-slate-400 bg-slate-900 border border-slate-800'
              }`}
              title={`Variação vs período anterior: ${deltaPct > 0 ? '+' : ''}${deltaPct}%`}
            >
              {deltaPct > 0 ? (
                <ArrowUpRight className="w-2.5 h-2.5" />
              ) : deltaPct < 0 ? (
                <ArrowDownRight className="w-2.5 h-2.5" />
              ) : (
                <Minus className="w-2.5 h-2.5" />
              )}
              <span>{Math.abs(deltaPct)}%</span>
            </span>
          ) : (
            <span
              className="text-[9px] text-slate-500 font-mono bg-slate-900/60 px-1 py-0.2 rounded border border-slate-800/60"
              title="Sem histórico anterior para o período selecionado"
            >
              1º ciclo
            </span>
          )}
        </div>

        {/* Barra Proporcional de Decomposição Contábil: 70% Criador / 30% JOBS / Estornos */}
        <div className="w-full mt-1.5 bg-slate-950 rounded-full h-1.5 overflow-hidden flex border border-slate-800/80">
          {gross > 0 ? (
            <>
              {/* Parcela Criador (70%) */}
              <div
                style={{ width: `${creatorSharePct}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Parcela Criador (70%): R$ ${currentPeriod.creatorShareBrl.toFixed(2).replace('.', ',')}`}
              />
              {/* Taxa JOBS (30%) */}
              <div
                style={{ width: `${platformFeePct}%` }}
                className="bg-rose-500/80 h-full transition-all duration-300"
                title={`Taxa JOBS (30%): R$ ${currentPeriod.platformFeeBrl.toFixed(2).replace('.', ',')}`}
              />
              {/* Estornos / Ajustes */}
              {refundsPct > 0 && (
                <div
                  style={{ width: `${refundsPct}%` }}
                  className="bg-amber-400 h-full transition-all duration-300"
                  title={`Estornos: R$ ${refunds.toFixed(2).replace('.', ',')}`}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-slate-800 h-full" title="Sem movimentação no período" />
          )}
        </div>

        {/* Legenda ultracompacta acessível */}
        <div className="flex items-center justify-between text-[8px] text-slate-500 mt-0.5 font-mono">
          <span className="text-emerald-400/80">70% Criador</span>
          <span className="text-rose-400/80">30% JOBS</span>
        </div>
      </button>

      {/* Popover Detalhado de Decomposição e Comparativo */}
      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="true"
          aria-label={`Decomposição Contábil de ${
            isAnonymized ? `Criador VIP #${creator.rank}` : creator.publicName
          }`}
          className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 p-4 rounded-2xl bg-[#0e0e1c] border border-slate-700 shadow-2xl text-slate-200 text-left animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Topo do Popover */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs font-bold text-white">Decomposição Contábil</h4>
              </div>
              <p className="text-[10px] text-slate-400">
                {isAnonymized ? `Criador VIP #${creator.rank}` : creator.publicName} · {series.currentPeriod.periodLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar comparativo financeiro"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Se ambiente for Produção */}
          {environment === 'production' ? (
            <div className="py-4 space-y-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-white">Produção Sem Dados Reais</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Os dados contábeis de produção exigem integração bancária ativa com split automatizado via gateway homologado.
                </p>
              </div>
            </div>
          ) : (
            /* Conteúdo Sandbox com decomposição real */
            <div className="py-2.5 space-y-3 text-xs">
              {/* Decomposição do Período Atual */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Período Vigente ({currentPeriod.periodLabel})
                </span>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Vendas Brutas (100%):</span>
                    <span className="font-bold text-white">
                      R$ {currentPeriod.grossSalesBrl.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Parcela Criador (70%):
                    </span>
                    <span className="font-bold">
                      R$ {currentPeriod.creatorShareBrl.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                      Taxa JOBS (30%):
                    </span>
                    <span>
                      -R$ {currentPeriod.platformFeeBrl.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {currentPeriod.refundsBrl > 0 && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        Estornos / Ajustes:
                      </span>
                      <span>
                        -R$ {currentPeriod.refundsBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-white font-bold text-xs">
                    <span>Ganhos Líquidos:</span>
                    <span className="text-emerald-300">
                      R$ {currentPeriod.netEarningsBrl.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparativo com Período Anterior */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comparativo com Período Anterior
                </span>

                {priorPeriod && priorPeriod.hasSufficientHistory ? (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Líquido Período Anterior:</span>
                      <span className="text-slate-300">
                        R$ {priorPeriod.netEarningsBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Variação Absoluta:</span>
                      <span
                        className={`font-bold ${
                          (deltaAbsoluteBrl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {(deltaAbsoluteBrl || 0) >= 0 ? '+' : ''}R${' '}
                        {(deltaAbsoluteBrl || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Variação Percentual:</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          (deltaPct || 0) >= 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {(deltaPct || 0) >= 0 ? '+' : ''}
                        {deltaPct}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-2 text-[10px] text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      {hasHistoryGap
                        ? 'Sem registros contábeis no período anterior correspondente para gerar cálculo delta.'
                        : 'Histórico insuficiente para comparação temporal direta.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Nota de Governança */}
              <div className="text-[9px] text-slate-500 leading-relaxed font-sans">
                {series.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
