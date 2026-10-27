import React, { useState, useMemo } from 'react';
import { Profile } from '../types';
import {
  Flame,
  MessageCircle,
  Lock,
  Unlock,
  Heart,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Camera,
  Video,
  Eye,
} from 'lucide-react';
import {
  exclusiveContentAndInterestService,
  formatDiamondsDisplay,
} from '../services/exclusiveContentAndInterestService';
import { authService } from '../utils/authService';

interface MatchCelebrationModalProps {
  matchedProfile: Profile;
  onClose: () => void;
  onGoToChat: (profile: Profile) => void;
  onGoToVault: (profile: Profile) => void;
}

export const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  matchedProfile,
  onClose,
  onGoToChat,
  onGoToVault,
}) => {
  const currentUserId = authService.getCurrentSession()?.userId || 'user_emilio_vip';
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [isProcessingVault, setIsProcessingVault] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const vaultConfig = useMemo(
    () => exclusiveContentAndInterestService.getVipVaultConfig(matchedProfile.id),
    [matchedProfile.id, refreshTick]
  );

  const vaultItems = useMemo(
    () =>
      exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: matchedProfile.id,
        viewerUserId: currentUserId,
        modality: 'VIP_VAULT',
      }),
    [matchedProfile.id, currentUserId, refreshTick]
  );

  const hasVaultAccess = useMemo(
    () => exclusiveContentAndInterestService.hasActiveVipVaultAccess(currentUserId, matchedProfile.id),
    [currentUserId, matchedProfile.id, refreshTick]
  );

  const buyerWallet = useMemo(
    () => exclusiveContentAndInterestService.getUserDiamondWallet(currentUserId),
    [currentUserId, refreshTick]
  );

  const totalVaultMediaCount = Math.max(vaultItems.length, matchedProfile.vipMedia?.length || 0);

  // Ação 1 — Mandar mensagem agora (gratuita quando match confirmado e sem bloqueio)
  const handleSendMessageNow = () => {
    const check = exclusiveContentAndInterestService.canUsersExchangeMessages(
      currentUserId,
      matchedProfile.id
    );
    if (!check.allowed) {
      setStatusMessage({
        type: 'error',
        text: check.reason,
      });
      return;
    }
    onGoToChat(matchedProfile);
  };

  // Ação 2 — Ver Cofre VIP
  const handleOpenVipVaultAction = () => {
    setShowVaultModal(true);
    setStatusMessage(null);
  };

  const handlePurchaseVipVault = async () => {
    setIsProcessingVault(true);
    setStatusMessage(null);
    try {
      const res = await exclusiveContentAndInterestService.purchaseVipVaultAccess({
        buyerUserId: currentUserId,
        creatorId: matchedProfile.id,
        idempotencyKey: `idemp_match_vault_${currentUserId}_${matchedProfile.id}`,
        buyerAgeVerified18Plus: true,
        environment: 'sandbox',
      });
      setRefreshTick((t) => t + 1);
      if (res.success) {
        setStatusMessage({
          type: 'ok',
          text:
            res.customerReceipt?.summaryText ||
            `Cofre VIP de ${matchedProfile.name} desbloqueado por ${formatDiamondsDisplay(
              res.transaction.diamondsCharged
            )} (${vaultConfig.durationDays} dias).`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Não foi possível concluir a compra do Cofre VIP.',
      });
    } finally {
      setIsProcessingVault(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
      <div className="relative w-full max-w-md p-6 sm:p-8 bg-[#12121a] border border-rose-500/50 rounded-3xl shadow-2xl text-center overflow-hidden my-auto">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/60 animate-bounce">
          <Flame className="w-9 h-9 fill-white" />
        </div>

        <h2 className="text-3xl font-black text-white font-display tracking-tight mb-1">
          Deu match no JOBS!
        </h2>
        <p className="text-xs text-rose-300 font-medium mb-5">
          Você e <strong className="text-white">{matchedProfile.name}</strong> demonstraram interesse mútuo! A conversa direta está liberada sem custo adicional.
        </p>

        {/* Both Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-rose-500 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
              alt="Você"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
            <Heart className="w-4 h-4 fill-white" />
          </div>

          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl">
            <img
              src={matchedProfile.avatar}
              alt={matchedProfile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs text-left flex items-start gap-2 ${
              statusMessage.type === 'ok'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            {statusMessage.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Painel interno de Prévia / Conteúdo do Cofre VIP */}
        {showVaultModal ? (
          <div className="text-left bg-[#0c0c14] border border-amber-500/40 rounded-2xl p-4 mb-4 space-y-3 relative z-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                {hasVaultAccess ? (
                  <Unlock className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-xs font-extrabold text-white">{vaultConfig.title}</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {hasVaultAccess
                  ? 'Acesso Liberado'
                  : `${formatDiamondsDisplay(vaultConfig.priceDiamonds)} · ${vaultConfig.durationDays}d`}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">{vaultConfig.description}</p>

            <div className="grid grid-cols-2 gap-2">
              {vaultItems.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-[4/3]"
                >
                  <img
                    src={item.safePreviewUrl}
                    alt={item.caption}
                    className={`w-full h-full object-cover transition-all ${
                      hasVaultAccess ? '' : 'blur-md scale-110 brightness-75'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-2 flex flex-col justify-between">
                    <span className="self-start text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/70 text-amber-300 flex items-center gap-1">
                      {item.mediaType === 'video' ? (
                        <Video className="w-2.5 h-2.5" />
                      ) : (
                        <Camera className="w-2.5 h-2.5" />
                      )}
                      {item.mediaType === 'video' ? 'Vídeo VIP' : 'Foto VIP'}
                    </span>
                    <span className="text-[10px] text-white font-medium line-clamp-1">
                      {item.caption}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!hasVaultAccess ? (
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 text-[10px] text-slate-300 flex items-center justify-between font-mono">
                  <span>Preço: {formatDiamondsDisplay(vaultConfig.priceDiamonds)} ({vaultConfig.durationDays} dias)</span>
                  <span>Seu saldo: {formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {vaultConfig.scopeDescription}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePurchaseVipVault}
                    disabled={isProcessingVault}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs transition-all cursor-pointer"
                  >
                    {isProcessingVault
                      ? 'Processando...'
                      : `Desbloquear Cofre VIP (${formatDiamondsDisplay(vaultConfig.priceDiamonds)})`}
                  </button>
                  <button
                    onClick={() => onGoToVault(matchedProfile)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Ver no Perfil
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Acesso ativo ({vaultConfig.durationDays} dias) com URL temporária assinada
                </span>
                <button
                  onClick={() => onGoToVault(matchedProfile)}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Abrir Cofre Completo
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Two Official Post-Match Actions */}
        <div className="space-y-2.5 relative z-10">
          {/* Ação 1 — Mandar mensagem agora */}
          <button
            onClick={handleSendMessageNow}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Mandar mensagem agora</span>
          </button>

          {/* Ação 2 — Ver Cofre VIP */}
          <button
            onClick={handleOpenVipVaultAction}
            className="w-full py-3 px-4 rounded-xl bg-[#1a1a28] hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {hasVaultAccess ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              Ver Cofre VIP de {matchedProfile.name.split(' ')[0]} ({totalVaultMediaCount} mídias ·{' '}
              {hasVaultAccess ? 'Liberado' : `${formatDiamondsDisplay(vaultConfig.priceDiamonds)} / ${vaultConfig.durationDays}d`})
            </span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Continuar Explorando Perfis
          </button>
        </div>
      </div>
    </div>
  );
};

