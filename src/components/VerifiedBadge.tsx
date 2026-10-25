import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  Sparkles,
  X,
  FileCheck2,
  ScanFace,
  Lock,
  UserCheck
} from 'lucide-react';
import { VerifiedCreatorBadgeInfo } from '../types';

export interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'pill' | 'banner' | 'card';
  badgeInfo?: VerifiedCreatorBadgeInfo;
  creatorName?: string;
  showTooltip?: boolean;
  className?: string;
  interactive?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  variant = 'icon',
  badgeInfo,
  creatorName = 'Criador',
  className = '',
  interactive = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Size configurations
  const sizeMap = {
    xs: {
      svg: 'w-3.5 h-3.5',
      check: 'w-2 h-2',
      text: 'text-[10px]',
      padding: 'px-1.5 py-0.5',
    },
    sm: {
      svg: 'w-4 h-4',
      check: 'w-2.5 h-2.5',
      text: 'text-[11px]',
      padding: 'px-2 py-0.5',
    },
    md: {
      svg: 'w-5 h-5',
      check: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-2.5 py-1',
    },
    lg: {
      svg: 'w-6 h-6',
      check: 'w-3.5 h-3.5',
      text: 'text-sm',
      padding: 'px-3 py-1.5',
    },
  };

  const currentSize = sizeMap[size];

  // Default badge information if not provided
  const info: VerifiedCreatorBadgeInfo = badgeInfo || {
    status: 'verified_creator',
    label: 'Criador Verificado',
    badgeLevel: 'premium',
    verificationDate: 'Auditado recentemente',
    trustScore: 99.6,
    biometricVerified: true,
    idDocumentVerified: true,
    safeCreatorGuaranteed: true,
  };

  // The Iconic Blue Check Badge SVG with rosette/scalloped border & center check
  const renderBlueCheckIcon = () => (
    <span
      className={`inline-flex items-center justify-center shrink-0 relative group/badge ${
        interactive ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : ''
      }`}
      onClick={(e) => {
        if (interactive) {
          e.stopPropagation();
          setIsModalOpen(true);
        }
      }}
      title="Selo Azul: Criador Verificado 18+ Oficial Jhobs"
    >
      {/* Outer Subtle Blue Glow */}
      <span className="absolute inset-0 rounded-full bg-sky-400/30 blur-[2px] animate-pulse pointer-events-none" />

      {/* SVG Scalloped / Rosette Blue Check Seal */}
      <svg
        className={`${currentSize.svg} text-sky-400 drop-shadow-sm select-none`}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2L14.4 3.7L17.2 3.1L18.4 5.7L21.1 6.6L20.8 9.5L22.6 11.7L20.8 13.9L21.1 16.8L18.4 17.7L17.2 20.3L14.4 19.7L12 21.4L9.6 19.7L6.8 20.3L5.6 17.7L2.9 16.8L3.2 13.9L1.4 11.7L3.2 9.5L2.9 6.6L5.6 5.7L6.8 3.1L9.6 3.7L12 2Z" fill="#0284c7" />
        <path d="M12 2.6L14.1 4.1L16.6 3.6L17.7 5.9L20.1 6.7L19.8 9.2L21.4 11.2L19.8 13.1L20.1 15.7L17.7 16.5L16.6 18.8L14.1 18.3L12 19.8L9.9 18.3L7.4 18.8L6.3 16.5L3.9 15.7L4.2 13.1L2.6 11.2L4.2 9.2L3.9 6.7L6.3 5.9L7.4 3.6L9.9 4.1L12 2.6Z" fill="#38bdf8" />
        <path d="M10.2 15.2L6.8 11.8L8.1 10.5L10.2 12.6L15.9 6.9L17.2 8.2L10.2 15.2Z" fill="#ffffff" />
      </svg>
    </span>
  );

  return (
    <>
      {/* VARIANT 1: ICON ONLY */}
      {variant === 'icon' && (
        <span className={`inline-flex items-center align-middle ${className}`}>
          {renderBlueCheckIcon()}
        </span>
      )}

      {/* VARIANT 2: PILL / CHIP */}
      {variant === 'pill' && (
        <button
          type="button"
          onClick={(e) => {
            if (interactive) {
              e.stopPropagation();
              setIsModalOpen(true);
            }
          }}
          className={`inline-flex items-center gap-1.5 ${currentSize.padding} rounded-full bg-sky-950/70 border border-sky-500/40 hover:border-sky-400 text-sky-200 font-semibold ${currentSize.text} backdrop-blur-md shadow-sm shadow-sky-950/50 hover:bg-sky-900/60 transition-all cursor-pointer group ${className}`}
        >
          {renderBlueCheckIcon()}
          <span className="tracking-wide text-sky-300 group-hover:text-white transition-colors">
            {info.label || 'Criador Verificado'}
          </span>
          <Sparkles className="w-2.5 h-2.5 text-sky-400 opacity-70 group-hover:opacity-100" />
        </button>
      )}

      {/* VARIANT 3: BANNER / FLOATING HERO BADGE */}
      {variant === 'banner' && (
        <button
          type="button"
          onClick={(e) => {
            if (interactive) {
              e.stopPropagation();
              setIsModalOpen(true);
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 hover:bg-sky-950/90 border border-sky-400/50 backdrop-blur-md text-sky-200 text-xs font-semibold shadow-lg shadow-sky-950/60 transition-all hover:scale-105 cursor-pointer ${className}`}
        >
          {renderBlueCheckIcon()}
          <span>Criador Verificado 18+</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded font-mono font-bold">
            {info.trustScore}% Trust
          </span>
        </button>
      )}

      {/* VARIANT 4: FULL TRUST CARD (For Profile Detail Modal) */}
      {variant === 'card' && (
        <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1524] via-[#0f172a] to-[#090d16] border border-sky-500/30 shadow-xl space-y-3.5 relative overflow-hidden ${className}`}>
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              {renderBlueCheckIcon()}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Selo Oficial de Criador Verificado
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                    Auditado
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Identidade, maioridade 18+ e autenticidade de <strong className="text-slate-200">{creatorName}</strong> 100% verificadas.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-[11px] font-semibold text-sky-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Ver Detalhes
            </button>
          </div>

          {/* Verification Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 relative z-10">
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 p-2 rounded-xl border border-sky-950">
              <ScanFace className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Biometria Facial Confirmada</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 p-2 rounded-xl border border-sky-950">
              <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Documento Oficial 18+ Auditado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 p-2 rounded-xl border border-sky-950">
              <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Criador Confiável Certificado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 p-2 rounded-xl border border-sky-950">
              <Lock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Conteúdo & Shows 100% Autênticos</span>
            </div>
          </div>
        </div>
      )}

      {/* POPUP / MODAL EXPLAINING VERIFIED BLUE CHECK CREDENTIALS */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#0f172a] border border-sky-500/40 rounded-3xl p-6 shadow-2xl text-left space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Glowing Badge */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 p-0.5 shadow-lg shadow-sky-500/30 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-sky-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Criador Verificado</h3>
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                </div>
                <p className="text-xs text-sky-300">
                  Selo de Confiança Jhobs · Perfil Autêntico
                </p>
              </div>
            </div>

            {/* Explanatory text */}
            <p className="text-xs text-slate-300 leading-relaxed bg-[#16213b]/60 p-3.5 rounded-2xl border border-sky-500/20">
              O selo <strong className="text-sky-300">Blue Check</strong> indica que <strong>{creatorName}</strong> passou pelo processo rigoroso de verificação de identidade e maioridade legal da plataforma Jhobs.
            </p>

            {/* Key Trust Guarantees */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Garantias de Verificação:
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <ScanFace className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-200 block">Biometria Facial 3D</strong>
                    <span className="text-slate-400 text-[11px]">
                      A foto e transmissões ao vivo correspondem exatamente à pessoa cadastrada.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <FileCheck2 className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-200 block">Idade 18+ Comprovada</strong>
                    <span className="text-slate-400 text-[11px]">
                      Documento oficial com foto analisado para estrita conformidade com conteúdo adulto.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <UserCheck className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-200 block">Criador Confiável Protegido</strong>
                    <span className="text-slate-400 text-[11px]">
                      Sem histórico de fraudes ou perfis fakes. Transações de créditos e fotos 100% seguras.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics footer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Índice de Confiabilidade:
              </span>
              <span className="font-mono font-bold text-sky-300 text-sm">
                {info.trustScore}% Seguro
              </span>
            </div>

            {/* Action button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-sky-950 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
