import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Coins,
  RefreshCw,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { VipMediaItem } from '../types';
import {
  protectedMediaService,
  MediaAccessResult,
  ProtectedMediaTicket,
} from '../services/protectedMediaService';

interface ProtectedMediaViewerProps {
  media: VipMediaItem;
  creatorName: string;
  isUnlocked: boolean;
  userCredits?: number;
  currentUserId?: string;
  aspectRatio?: '3/4' | '1/1' | '16/9' | 'auto';
  className?: string;
  onUnlockRequest?: () => void;
  showWatermark?: boolean;
}

export const ProtectedMediaViewer: React.FC<ProtectedMediaViewerProps> = ({
  media,
  creatorName,
  isUnlocked,
  userCredits = 0,
  currentUserId = 'current_user',
  aspectRatio = '3/4',
  className = '',
  onUnlockRequest,
  showWatermark = true,
}) => {
  const [accessState, setAccessState] = useState<MediaAccessResult | null>(null);
  const [ticket, setTicket] = useState<ProtectedMediaTicket | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Solicita autorização de acesso ao serviço de proteção quando a mídia está liberada
  useEffect(() => {
    if (!isUnlocked) {
      setAccessState({
        allowed: false,
        code: 'ACCESS_DENIED_NO_GRANT',
        reason: 'Mídia protegida. Desbloqueio com créditos necessário.',
        isTeaserOnly: true,
      });
      setTicket(null);
      return;
    }

    setIsLoadingAuth(true);
    try {
      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: currentUserId,
        contentId: media.id,
        rawMasterUrl: media.mediaUrl,
        isContentFree: false,
      });

      setAccessState(res);
      if (res.allowed && res.ticket) {
        setTicket(res.ticket);
      }
    } catch {
      setAccessState({
        allowed: false,
        code: 'ACCESS_DENIED_NO_GRANT',
        reason: 'Falha na validação de autorização de mídia.',
        isTeaserOnly: true,
      });
    } finally {
      setIsLoadingAuth(false);
    }
  }, [isUnlocked, media.id, media.mediaUrl, currentUserId]);

  const aspectClass =
    aspectRatio === '3/4'
      ? 'aspect-[3/4]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : aspectRatio === '16/9'
      ? 'aspect-video'
      : 'aspect-auto';

  // Se bloqueado, usa APENAS a URL de teaser autorizada (nunca o arquivo master descriptografado)
  const displaySrc = isUnlocked && accessState?.allowed && accessState.deliveryUrl
    ? accessState.deliveryUrl
    : protectedMediaService.getPublicTeaserUrl(media);

  return (
    <div
      className={`relative w-full ${aspectClass} bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
      onContextMenu={(e) => {
        // Bloqueio de clique direito para impedir o menu de contexto "Salvar imagem como"
        e.preventDefault();
      }}
    >
      {/* Elemento de Mídia Protegido */}
      {media.type === 'video' && isUnlocked && accessState?.allowed ? (
        <video
          src={displaySrc}
          controls
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          playsInline
          className="w-full h-full object-cover"
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        <img
          src={displaySrc}
          alt={media.title}
          draggable={false}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-all duration-700 pointer-events-none ${
            isUnlocked && accessState?.allowed
              ? 'filter-none scale-100'
              : 'filter blur-[26px] scale-110 brightness-75 contrast-125'
          }`}
        />
      )}

      {/* Camada Transparente de Proteção Física (Shield Overlay) */}
      {/* Impede arraste direto do elemento no navegador */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ WebkitTouchCallout: 'none' }}
      />

      {/* ESTADO BLOQUEADO: Teaser com Chamada de Desbloqueio Seguro */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center shadow-xl">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Proteção Ativa de Mídia</span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-white line-clamp-1">
              {media.title}
            </h4>
            <p className="text-[11px] text-slate-300 max-w-xs mt-1">
              Ensaio privado de {creatorName}. O arquivo protegido em alta definição só é liberado mediante autorização de acesso criptografada.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <Coins className="w-3.5 h-3.5" />
            <span>Valor: {media.priceCredits} Créditos</span>
          </div>

          {onUnlockRequest && (
            <button
              onClick={onUnlockRequest}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Desbloquear Agora</span>
            </button>
          )}
        </div>
      )}

      {/* ESTADO DESBLOQUEADO MAS COM ACESSO NEGADO POR SEGURANÇA (ex: token expirado, IDOR ou revogação) */}
      {isUnlocked && accessState && !accessState.allowed && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Acesso Não Autorizado ao Arquivo</h4>
            <p className="text-xs text-rose-300/90 max-w-xs mt-1">{accessState.reason}</p>
          </div>
          <button
            onClick={() => {
              if (onUnlockRequest) onUnlockRequest();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renovar Acesso</span>
          </button>
        </div>
      )}

      {/* ESTADO AUTORIZADO: MARCA-D'ÁGUA DISSUASÓRIA E RASTREAMENTO FORENSE (FASE 3) */}
      {isUnlocked && accessState?.allowed && showWatermark && (
        <>
          {/* 1. Marca-d'água diagonal semitransparente com identificador de sessão */}
          <div
            className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden opacity-25 select-none"
            aria-hidden="true"
          >
            <div className="transform -rotate-25 text-center space-y-8 tracking-widest font-mono text-[10px] sm:text-xs font-extrabold text-white/70 drop-shadow">
              <p>JOBS · {ticket?.watermarkPayload.obfuscatedUserId || 'USR-VIP'} · CÓPIA PROIBIDA</p>
              <p>SESSÃO #{ticket?.watermarkPayload.sessionId || 'SESS-ACT'} · RASTREAMENTO FORENSE</p>
              <p>DIREITOS RESERVADOS JOBS</p>
            </div>
          </div>

          {/* 2. Chip de rodapé discreto com selo de acesso autorizado */}
          <div className="absolute bottom-3 right-3 z-30 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-[9px] text-white/90 font-mono pointer-events-none flex items-center gap-1.5 border border-emerald-500/30 shadow-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{ticket?.watermarkPayload.displayNotice || 'JOBS VIP · Acesso Autorizado'}</span>
          </div>

          {/* 3. Selo de anti-captura superior */}
          <div className="absolute top-3 right-3 z-30 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[8px] text-slate-300 font-mono pointer-events-none flex items-center gap-1 border border-white/10">
            <EyeOff className="w-2.5 h-2.5 text-amber-400" />
            <span>Anti-Leak Protected</span>
          </div>
        </>
      )}
    </div>
  );
};
