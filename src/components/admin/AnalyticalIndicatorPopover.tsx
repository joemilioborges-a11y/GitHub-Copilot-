import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Info,
  X,
  ShieldCheck,
  Clock,
  Coins,
  Scale,
  Calculator,
  Calendar,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { IndicatorKey, IndicatorAuditMetadata } from '../../types/creatorFinancialRanking';
import { creatorRankingAnalyticalService } from '../../services/creatorRankingAnalyticalService';

interface AnalyticalIndicatorPopoverProps {
  indicatorKey: IndicatorKey;
  environment: 'sandbox' | 'production';
  period: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const AnalyticalIndicatorPopover: React.FC<AnalyticalIndicatorPopoverProps> = ({
  indicatorKey,
  environment,
  period,
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const metadata: IndicatorAuditMetadata = creatorRankingAnalyticalService.getIndicatorAuditMetadata(
    indicatorKey,
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

  const alignmentClass =
    align === 'left'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  const popoverId = `analytical-popover-${indicatorKey}-${environment}`;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={`Auditar indicador contábil: ${metadata.name}`}
        title={`Origem e regras do indicador ${metadata.name}`}
        className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 focus:ring-offset-slate-950 cursor-pointer"
      >
        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-amber-300 transition-colors" />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhamento Contábil: ${metadata.name}`}
          className={`absolute top-full mt-2 z-50 w-80 sm:w-96 p-4 rounded-2xl bg-[#0d0d1a] border border-slate-700/80 shadow-2xl text-slate-200 text-left animate-in fade-in zoom-in-95 duration-150 ${alignmentClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Popover */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-xs font-bold text-white tracking-wide">{metadata.name}</h4>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {environment === 'production' ? 'Ambiente Real · Produção' : 'Ambiente Sandbox · Testes'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar detalhes analíticos"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Estado Indisponível (ex: Produção ou Falta de Dados) */}
          {!metadata.isAvailable ? (
            <div className="py-4 space-y-3">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-300">Informação Indisponível</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {metadata.unavailableReason || 'Histórico incompleto ou integração financeira não conectada.'}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Restrições Contábeis:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  {metadata.limitations.map((limit, idx) => (
                    <li key={idx} className="leading-relaxed">{limit}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* Conteúdo com os 8 Campos Regulatórios */
            <div className="py-3 space-y-3 text-xs divide-y divide-slate-800/70">
              {/* 1. Origem dos Dados */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Database className="w-3 h-3 text-cyan-400" />
                  <span>1. Origem Contábil dos Registros</span>
                </div>
                <p className="text-[11px] font-mono text-slate-200 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  {metadata.source}
                </p>
              </div>

              {/* 2. Regra de Cálculo / Fórmula */}
              <div className="pt-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Calculator className="w-3 h-3 text-emerald-400" />
                  <span>2. Regra de Cálculo Efetiva</span>
                </div>
                <p className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-900/50">
                  {metadata.formula}
                </p>
              </div>

              {/* 3. Período e Fuso Horário */}
              <div className="pt-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>3. Período e Fuso Horário</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <p className="font-semibold text-white">{metadata.periodLabel}</p>
                  <p className="text-[10px] font-mono text-slate-400">{metadata.periodRange}</p>
                  <p className="text-[10px] text-purple-300 font-mono">Fuso: {metadata.timezone}</p>
                </div>
              </div>

              {/* 4. Moeda e Segregação */}
              <div className="pt-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>4. Unidade Monetária</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                    {metadata.currency} (Reais)
                  </span>
                  <span className="text-[10px] text-slate-400">Segregado de Créditos Virtuais</span>
                </div>
              </div>

              {/* 5. Status Financeiro & Atualização */}
              <div className="pt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-400 uppercase">5. Status Contábil:</span>
                  <span className="block text-emerald-400 font-semibold font-mono">
                    {metadata.financialStatusLabel}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-400 uppercase">6. Última Atualização:</span>
                  <span className="block text-slate-300 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                    {metadata.lastUpdated}
                  </span>
                </div>
              </div>

              {/* 6. Limitações e Notas de Auditoria */}
              <div className="pt-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>7. Limitações e Notas de Governança</span>
                </div>
                <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
                  {metadata.limitations.map((lim, idx) => (
                    <li key={idx} className="leading-relaxed text-slate-300">{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Rodapé com aviso auditável */}
          <div className="pt-2 border-t border-slate-800 text-[9px] text-slate-500 flex items-center justify-between font-mono">
            <span>JOBS Financial Engine · Imutável</span>
            <span>Ref: BR-BACEN-2026</span>
          </div>
        </div>
      )}
    </div>
  );
};
