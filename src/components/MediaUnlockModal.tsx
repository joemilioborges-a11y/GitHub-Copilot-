import React, { useState } from 'react';
import { VipMediaItem } from '../types';
import {
  X,
  Lock,
  Unlock,
  Coins,
  Heart,
  Gift,
  Sparkles,
  Check,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { monetizationService } from '../services/monetizationService';
import { ProtectedMediaViewer } from './ProtectedMediaViewer';

interface MediaUnlockModalProps {
  media: VipMediaItem;
  creatorName?: string;
  userCredits: number;
  onClose: () => void;
  onConfirmUnlock: (mediaId: string, cost: number) => void;
  onOpenWallet: () => void;
  onSendTip?: (amount: number) => void;
}

export const MediaUnlockModal: React.FC<MediaUnlockModalProps> = ({
  media,
  creatorName = 'Criador VIP',
  userCredits,
  onClose,
  onConfirmUnlock,
  onOpenWallet,
  onSendTip,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [temporaryTokenData, setTemporaryTokenData] = useState<{
    tokenId: string;
    expiresAt: string;
    tokenHash: string;
  } | null>(null);

  const hasEnoughCredits = userCredits >= media.priceCredits;
  const balanceAfter = Math.max(0, userCredits - media.priceCredits);

  // Executa o fluxo de desbloqueio atômico de acordo com RF05
  const handleExecuteUnlock = async () => {
    setIsProcessing(true);
    try {
      const idempotencyKey = `idemp_modal_unlock_${media.id}_${Date.now()}`;
      const res = await monetizationService.unlockContent({
        userId: 'current_user',
        contentId: media.id,
        idempotencyKey,
      });

      setTemporaryTokenData({
        tokenId: res.token.id,
        expiresAt: res.token.expiresAt,
        tokenHash: res.token.tokenHash,
      });

      onConfirmUnlock(media.id, media.priceCredits);
      setShowConfirmStep(false);
    } catch (err: any) {
      alert(err?.message || 'Falha ao processar o desbloqueio no servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTip = (amount: number) => {
    if (userCredits < amount) {
      onOpenWallet();
      return;
    }
    if (onSendTip) onSendTip(amount);
    setTipSuccess(true);
    setTimeout(() => setTipSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#12121a] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d0d14]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              {media.isUnlocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[210px] sm:max-w-[260px]">
                  {media.title}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SANDBOX 18+
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Por {creatorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Container com Proteção Ativa e Marca-D'água */}
        <div className="relative aspect-[3/4] max-h-[440px] w-full bg-black overflow-hidden flex items-center justify-center">
          <ProtectedMediaViewer
            media={media}
            creatorName={creatorName}
            isUnlocked={media.isUnlocked}
            userCredits={userCredits}
            aspectRatio="3/4"
            className="max-h-[440px]"
            showWatermark={true}
          />

          {/* Locked State Overlay */}
          {!media.isUnlocked && !showConfirmStep && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Conteúdo Privado Protegido (+18)</h4>
                <p className="text-xs text-slate-300 max-w-xs mt-1">
                  Prévia autorizada. O arquivo em alta definição é acessado por link temporário criptografado após a confirmação.
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-mono font-bold">
                <Coins className="w-4 h-4" />
                <span>Valor: {media.priceCredits} Créditos</span>
              </div>

              <div className="text-[11px] text-slate-400">
                Seu saldo: <strong className="text-white font-mono">{userCredits} créditos</strong>
              </div>
            </div>
          )}

          {/* Confirm Step Modal Dialog (RF05) */}
          {!media.isUnlocked && showConfirmStep && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-6 z-20 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmação de Desbloqueio Seguro</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Conteúdo selecionado:</span>
                    <span className="font-bold text-white text-right truncate max-w-[180px]">{media.title}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Preço em créditos:</span>
                    <span className="font-bold text-amber-400 font-mono">💎 {media.priceCredits}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Saldo atual da carteira:</span>
                    <span className="font-bold text-white font-mono">{userCredits} créditos</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-300 font-semibold">Saldo após a operação:</span>
                    <span className="font-extrabold text-emerald-400 font-mono">{balanceAfter} créditos</span>
                  </div>
                </div>

                {/* RF05 Mandatory Disclaimer */}
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Aviso de Proteção Digital:</strong> A plataforma reduz o acesso não autorizado através de criptografia e links temporários, mas não consegue impedir completamente capturas de tela ou gravações externas realizadas em outros aparelhos.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={handleExecuteUnlock}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <span>Registrando no Livro-Razão...</span>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Confirmar Desbloqueio (-{media.priceCredits} 💎)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirmStep(false)}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* Unlocked Protected Watermark */}
          {media.isUnlocked && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-[9px] text-white/80 font-mono pointer-events-none flex items-center gap-1 border border-white/10">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>JOBS VIP · Acesso Autorizado</span>
            </div>
          )}
        </div>

        {/* Temporary Token Expiration Info Bar */}
        {media.isUnlocked && temporaryTokenData && (
          <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-200">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Token Temporário Ativo (Válido por 15 minutos)</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400/80">
              {temporaryTokenData.tokenHash.substring(0, 14)}...
            </span>
          </div>
        )}

        {/* Bottom Details & Actions */}
        <div className="p-4 sm:p-5 bg-[#12121a] space-y-4">
          <div>
            <p className="text-xs text-slate-300 leading-relaxed mb-1">{media.description}</p>
            {media.tags && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {media.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* If already unlocked: Reaction & Tip Bar */}
          {media.isUnlocked ? (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isLiked
                      ? 'bg-rose-950/60 border-rose-500 text-rose-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{media.likesCount + (isLiked ? 1 : 0)} curtidas</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Enviar mimo:</span>
                  <button
                    onClick={() => handleTip(20)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    20 💎
                  </button>
                  <button
                    onClick={() => handleTip(50)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    50 💎
                  </button>
                </div>
              </div>

              {tipSuccess && (
                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium">
                  Mimo enviado com sucesso para o criador! ❤️
                </div>
              )}
            </div>
          ) : (
            /* If locked: Confirm Unlock or Recharge */
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {hasEnoughCredits ? (
                <button
                  onClick={() => setShowConfirmStep(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear Agora ({media.priceCredits} Créditos)</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Você precisa de mais {media.priceCredits - userCredits} créditos para desbloquear esta foto.
                    </span>
                  </div>
                  <button
                    onClick={onOpenWallet}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-950"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Adicionar Créditos via PIX / Cartão (Sandbox)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
