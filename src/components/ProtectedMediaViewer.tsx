import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  formatForensicWatermark,
} from '../services/protectedMediaService';
import { useSecureScreen } from '../services/screenSecurityService';
import { authService } from '../utils/authService';

interface ProtectedMediaViewerProps {
  media: VipMediaItem;
  creatorName: string;
  isUnlocked: boolean;
  isFreeContent?: boolean;
  preIssuedSignedUrl?: string;
  userCredits?: number;
  currentUserId?: string;
  aspectRatio?: '3/4' | '1/1' | '16/9' | 'auto';
  className?: string;
  onUnlockRequest?: () => void;
  onRenewSignedUrl?: () => string | undefined;
  showWatermark?: boolean;
}

export const ProtectedMediaViewer: React.FC<ProtectedMediaViewerProps> = ({
  media,
  creatorName,
  isUnlocked,
  isFreeContent = false,
  preIssuedSignedUrl,
  currentUserId,
  aspectRatio = '3/4',
  className = '',
  onUnlockRequest,
  onRenewSignedUrl,
  showWatermark = true,
}) => {
  const resolvedUserId =
    currentUserId || authService.getCurrentSession()?.userId || 'current_user';

  const [accessState, setAccessState] = useState<MediaAccessResult | null>(null);
  const [ticket, setTicket] = useState<ProtectedMediaTicket | null>(null);
  const [canvasRendered, setCanvasRendered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fase 2: Ativa FLAG_SECURE no Android ao abrir mídia protegida e remove ao sair
  useSecureScreen(Boolean(isUnlocked), `protected_viewer_${media.id}`);

  const requestOrValidateAccess = useCallback(
    (isRenewal = false) => {
      if (!isUnlocked && !isFreeContent) {
        setAccessState({
          allowed: false,
          code: 'ACCESS_DENIED_NO_GRANT',
          reason: 'Mídia protegida. Desbloqueio com créditos necessário.',
          isTeaserOnly: true,
        });
        setTicket(null);
        return;
      }

      try {
        const res = isRenewal
          ? protectedMediaService.renewMediaTicket({
              userId: resolvedUserId,
              contentId: media.id,
              rawMasterUrl: preIssuedSignedUrl || media.mediaUrl,
              previousTicketId: ticket?.ticketId,
              isContentFree: isFreeContent,
              hasExternalGrant: isUnlocked,
            })
          : protectedMediaService.requestAuthorizedMediaAccess({
              userId: resolvedUserId,
              contentId: media.id,
              rawMasterUrl: preIssuedSignedUrl || media.mediaUrl,
              isContentFree: isFreeContent,
              hasExternalGrant: isUnlocked,
            });

        setAccessState(res);
        if (res.allowed && res.ticket) {
          setTicket(res.ticket);
        } else {
          setTicket(null);
        }
      } catch {
        setAccessState({
          allowed: false,
          code: 'ACCESS_DENIED_NO_GRANT',
          reason: 'Falha na validação de autorização de mídia.',
          isTeaserOnly: true,
        });
      }
    },
    [isUnlocked, isFreeContent, resolvedUserId, media.id, media.mediaUrl, preIssuedSignedUrl, ticket?.ticketId]
  );

  useEffect(() => {
    requestOrValidateAccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, isFreeContent, media.id, media.mediaUrl, preIssuedSignedUrl, resolvedUserId]);

  const wmInfo = formatForensicWatermark(
    resolvedUserId,
    ticket?.watermarkPayload.sessionId,
    ticket?.issuedAt
  );

  // Se bloqueado, usa APENAS o teaser SVG opaco (nunca expõe a URL original no DOM)
  const authorizedDeliverySrc =
    (isUnlocked || isFreeContent) && accessState?.allowed && accessState.deliveryUrl
      ? accessState.deliveryUrl
      : null;

  const lockedTeaserSrc = protectedMediaService.getPublicTeaserUrl({
    id: media.id,
    title: media.title,
  });

  // Fase 3: Renderiza fotos desbloqueadas em <canvas> com marca-d'água forense embutida nos pixels
  useEffect(() => {
    if (media.type === 'video' || !authorizedDeliverySrc || !canvasRef.current) {
      setCanvasRendered(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCanvasRendered(false);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    const drawEmbeddedWatermark = (width: number, height: number) => {
      if (!showWatermark) return;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-24 * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(12, Math.floor(width * 0.026))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;

      const lines = [
        wmInfo.primaryLine,
        wmInfo.secondaryLine,
        'JOBS ANTI-LEAK · RASTREAMENTO FORENSE',
      ];
      lines.forEach((line, idx) => {
        const yOffset = (idx - 1) * Math.max(36, Math.floor(height * 0.09));
        ctx.strokeText(line, 0, yOffset);
        ctx.fillText(line, 0, yOffset);
      });
      ctx.restore();
    };

    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 720;
      const h = img.naturalHeight || 960;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      drawEmbeddedWatermark(w, h);
      setCanvasRendered(true);
    };

    img.onerror = () => {
      if (cancelled) return;
      // Fallback visual em canvas caso a URL simulada (ex: private:// ou cdn-private-sandbox) não carregue via rede
      const w = 720;
      const h = 960;
      canvas.width = w;
      canvas.height = h;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#3b0764');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(media.title || 'Mídia Protegida JOBS', w / 2, h / 2 - 20);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
      ctx.font = '14px monospace';
      ctx.fillText(`Autorizado para ${wmInfo.obfuscatedUserId}`, w / 2, h / 2 + 16);

      drawEmbeddedWatermark(w, h);
      setCanvasRendered(true);
    };

    // Strip ephemeral query params only if loading a local bundled asset path (/src/assets/...)
    const loadableSrc = authorizedDeliverySrc.startsWith('/src/')
      ? authorizedDeliverySrc.split('?')[0]
      : authorizedDeliverySrc;
    img.src = loadableSrc;

    return () => {
      cancelled = true;
    };
  }, [authorizedDeliverySrc, media.type, media.title, showWatermark, wmInfo.obfuscatedUserId, wmInfo.primaryLine, wmInfo.secondaryLine]);

  const handleRenewAccessClick = () => {
    if (onRenewSignedUrl) {
      onRenewSignedUrl();
    }
    requestOrValidateAccess(true);
  };

  const aspectClass =
    aspectRatio === '3/4'
      ? 'aspect-[3/4]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : aspectRatio === '16/9'
      ? 'aspect-video'
      : 'aspect-auto';

  return (
    <div
      data-testid={`protected-media-viewer-${media.id}`}
      data-secure-delivery={authorizedDeliverySrc ? 'signed-ephemeral' : 'locked-teaser'}
      data-cache-control={accessState?.cacheControl || 'private, no-store, no-cache, max-age=0, must-revalidate'}
      className={`relative w-full ${aspectClass} bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Elemento de Mídia Protegido */}
      {authorizedDeliverySrc ? (
        media.type === 'video' ? (
          <video
            data-testid="protected-video-element"
            src={
              authorizedDeliverySrc.startsWith('/src/')
                ? authorizedDeliverySrc.split('?')[0]
                : authorizedDeliverySrc
            }
            controls
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            playsInline
            className="w-full h-full object-cover"
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <canvas
            ref={canvasRef}
            data-testid="protected-photo-canvas"
            data-canvas-rendered={canvasRendered ? 'true' : 'pending'}
            className="w-full h-full object-cover pointer-events-none select-none"
            onContextMenu={(e) => e.preventDefault()}
          />
        )
      ) : (
        <img
          data-testid="protected-locked-teaser-img"
          src={lockedTeaserSrc}
          alt={media.title}
          draggable={false}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-700 pointer-events-none filter blur-[14px] scale-105 brightness-75 contrast-125"
        />
      )}

      {/* Camada Transparente de Proteção Física (Shield Overlay) — Impede arraste direto */}
      <div className="absolute inset-0 z-10 pointer-events-none select-none" />

      {/* ESTADO BLOQUEADO: Teaser SVG Opaco com Chamada de Desbloqueio Seguro */}
      {!isUnlocked && !isFreeContent && (
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
              Ensaio privado de {creatorName}. O arquivo protegido só é liberado mediante autorização de acesso e URL temporária assinada.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <Coins className="w-3.5 h-3.5" />
            <span>Valor: {media.priceCredits} 💎</span>
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
      {(isUnlocked || isFreeContent) && accessState && !accessState.allowed && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Acesso Temporário Expirado ou Restrito</h4>
            <p className="text-xs text-rose-300/90 max-w-xs mt-1">{accessState.reason}</p>
          </div>
          <button
            type="button"
            onClick={handleRenewAccessClick}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renovar Acesso Seguro (0 💎)</span>
          </button>
        </div>
      )}

      {/* ESTADO AUTORIZADO: MARCA-D'ÁGUA DISSUASÓRIA E RASTREAMENTO FORENSE (FASE 3) */}
      {authorizedDeliverySrc && showWatermark && (
        <>
          {/* 1. Marca-d'água diagonal semitransparente com identificador de sessão ofuscado */}
          <div
            data-testid="forensic-watermark-overlay"
            className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden opacity-25 select-none"
            aria-hidden="true"
          >
            <div className="transform -rotate-25 text-center space-y-8 tracking-widest font-mono text-[10px] sm:text-xs font-extrabold text-white/75 drop-shadow">
              <p>{wmInfo.primaryLine}</p>
              <p>{wmInfo.secondaryLine} · RASTREAMENTO FORENSE</p>
              <p>DIREITOS RESERVADOS JOBS</p>
            </div>
          </div>

          {/* 2. Chip de rodapé discreto com selo de acesso autorizado e botão de renovação de token */}
          <div className="absolute bottom-3 right-3 z-30 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-[9px] text-white/90 font-mono flex items-center gap-1.5 border border-emerald-500/30 shadow-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400 pointer-events-none" />
            <span className="pointer-events-none">{wmInfo.displayNotice}</span>
            <button
              type="button"
              onClick={handleRenewAccessClick}
              title="Renovar ticket temporário assinado (TTL 15 min)"
              className="ml-1 text-emerald-300 hover:text-emerald-200 cursor-pointer pointer-events-auto"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* 3. Selo de anti-captura superior */}
          <div className="absolute top-3 right-3 z-30 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[8px] text-slate-300 font-mono pointer-events-none flex items-center gap-1 border border-white/10">
            <EyeOff className="w-2.5 h-2.5 text-amber-400" />
            <span>FLAG_SECURE + Canvas Shield</span>
          </div>
        </>
      )}
    </div>
  );
};
