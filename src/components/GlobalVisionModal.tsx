/**
 * JOBS — MODAL DE VISÃO ESTRATÉGICA & EXPANSÃO GLOBAL
 * 
 * Manifesto Oficial: "Nascemos no Brasil. Nossa Visão é Global!"
 * Apresenta a visão de conectar pessoas sem fronteiras, os 5 pilares estratégicos
 * e disponibiliza o link de instalação e compartilhamento internacional do Google Play.
 */

import React, { useState } from 'react';
import {
  Globe2,
  X,
  Rocket,
  ShieldCheck,
  Cpu,
  Layers,
  Heart,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
} from 'lucide-react';

interface GlobalVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalVisionModal: React.FC<GlobalVisionModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Link oficial de distribuição global do JOBS
  const officialInstallUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobs.app';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(officialInstallUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'JOBS — Do Brasil para o Mundo 🌎',
          text: 'Conheça o JOBS: plataforma global de conexões autênticas, relacionamentos e encontros. Nascemos no Brasil, nossa visão é global!',
          url: officialInstallUrl,
        });
      } catch {
        // no-op se usuário cancelar
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0a0a12] border border-white/10 shadow-2xl text-slate-100 flex flex-col custom-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-vision-title"
      >
        {/* Background Ambience Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-600/15 via-amber-500/10 to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-5 sm:p-6 bg-[#0a0a12]/95 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/50">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>Manifesto Estratégico</span>
              </div>
              <h2 id="global-vision-title" className="text-lg sm:text-xl font-display font-black text-white leading-tight">
                Nascemos no Brasil. Nossa Visão é Global! 🌎
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Manifesto Banner */}
          <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-950/40 via-[#121220] to-indigo-950/30 border border-rose-500/20 shadow-xl space-y-3">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
              O <strong className="text-white font-bold">JOBS</strong> nasce no Brasil, mas não foi pensado para ficar limitado às fronteiras brasileiras.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Nossa visão é construir uma plataforma capaz de <strong className="text-rose-300">conectar pessoas</strong>, criar relacionamentos, aproximar culturas e abrir novas oportunidades em qualquer lugar do mundo.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
              <span>🇧🇷 Brasil</span>
              <span className="text-slate-500">→</span>
              <span>🇵🇹 Portugal</span>
              <span className="text-slate-500">→</span>
              <span>🇺🇸 EUA</span>
              <span className="text-slate-500">→</span>
              <span>🇯🇵 Japão</span>
              <span className="text-slate-500">→</span>
              <span>Mundo 🌐</span>
            </div>
          </div>

          {/* 5 Pilares de Expansão Global */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span>Nossos 5 Pilares de Expansão Global</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pilar 1 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-rose-500/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Globe2 className="w-4 h-4 text-rose-400" />
                  <span>1. Alcance Internacional</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Facilitar a descoberta e o acesso ao JOBS em diferentes países, permitindo conexões autênticas sem barreiras geográficas.
                </p>
              </div>

              {/* Pilar 2 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Heart className="w-4 h-4 text-amber-400" />
                  <span>2. Experiência Multilíngue</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Preparar a plataforma para diferentes idiomas e especificidades culturais, garantindo acolhimento e fluidez universal.
                </p>
              </div>

              {/* Pilar 3 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>3. Tecnologia Escalável</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Construir uma infraestrutura robusta, de alta performance e resiliência capaz de suportar o crescimento global contínuo.
                </p>
              </div>

              {/* Pilar 4 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>4. IA Responsável & Privacidade</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Evoluir algoritmos de afinidade inteligentes com ética, segurança, transparência e privacidade rigorosa dos dados.
                </p>
              </div>

              {/* Pilar 5 (Full width) */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>5. Expansão Sustentável & Compliance Local</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Adaptar ecossistemas de pagamento, ferramentas de moderação humana e automatizada, suporte e requisitos legais conforme a regulamentação de cada mercado.
                </p>
              </div>
            </div>
          </div>

          {/* Action Box: Google Play & Global Install Link */}
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#131322] via-[#16162a] to-[#131322] border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-rose-400" />
                  <span>Levar o link do JOBS a todos os cantos do planeta</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compartilhe a página oficial e o instalador verificado com amigos no Brasil e no exterior.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                Google Play Ready
              </span>
            </div>

            {/* Link Box with Copy Button */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300">
              <span className="flex-1 truncate select-all">{officialInstallUrl}</span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                onClick={handleShare}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar JOBS Global</span>
              </button>

              <a
                href="https://play.google.com/store/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Acessar Google Play</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Footer Statement */}
          <div className="text-center pt-2 pb-1">
            <p className="text-xs text-slate-400 font-semibold italic">
              "O Brasil é o nosso ponto de partida. O mundo é o horizonte."
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              JOBS — do Brasil para o mundo. 🌎 Conectando pessoas sem fronteiras.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
