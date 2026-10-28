import React, { useState, useMemo } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Ban,
  MapPin,
  Briefcase,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Lock,
  Unlock,
  Camera,
  Video,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Profile, UserProfileData } from '../../types';
import { calculateAiCompatibility } from '../../utils/aiMatchmaking';
import {
  exclusiveContentAndInterestService,
  formatDiamondsDisplay,
  PublicExclusiveMediaView,
} from '../../services/exclusiveContentAndInterestService';
import { protectedMediaService } from '../../services/protectedMediaService';
import { authService } from '../../utils/authService';
import { CreatorContentStudioModal, CreatorStudioTab } from '../CreatorContentStudioModal';
import { ProtectedMediaViewer } from '../ProtectedMediaViewer';

interface Screen10ProfileDetailProps {
  profile: Profile;
  userProfile: UserProfileData;
  onClose: () => void;
  onLike: (profile: Profile) => void;
  onStartChat: (profile: Profile) => void;
  onBlock: (profile: Profile) => void;
  onReport: (profile: Profile) => void;
  onOpenCreatorStudio?: (tab?: CreatorStudioTab) => void;
}

type ProfileMediaTab = 'FREE' | 'INDIVIDUAL' | 'VIP_VAULT' | 'UNLOCKED';

interface PendingPurchaseConfirmation {
  type: 'INDIVIDUAL_MEDIA' | 'VIP_VAULT';
  mediaItem?: PublicExclusiveMediaView;
  title: string;
  description: string;
  priceDiamonds: number;
  accessConditionText: string;
}

export const Screen10ProfileDetail: React.FC<Screen10ProfileDetailProps> = ({
  profile,
  userProfile,
  onClose,
  onLike,
  onStartChat,
  onBlock,
  onReport,
}) => {
  const currentUserId = authService.getCurrentSession()?.userId || 'user_emilio_vip';
  const [photoIndex, setPhotoIndex] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<ProfileMediaTab>('INDIVIDUAL');
  const [showVipVaultPanel, setShowVipVaultPanel] = useState(false);
  const [showImmediateInterestModal, setShowImmediateInterestModal] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingPurchaseConfirmation | null>(null);
  const [isCreatorStudioOpen, setIsCreatorStudioOpen] = useState(false);
  const [creatorStudioInitialTab, setCreatorStudioInitialTab] =
    useState<CreatorStudioTab>('publish_photo');
  const [interestMessage, setInterestMessage] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [activeSignedUrlByMediaId, setActiveSignedUrlByMediaId] = useState<Record<string, string>>({});
  const [activeTokenIdByMediaId, setActiveTokenIdByMediaId] = useState<Record<string, string>>({});
  const [activeViewerMediaItem, setActiveViewerMediaItem] = useState<PublicExclusiveMediaView | null>(null);

  const photos = profile.photos?.length ? profile.photos : [profile.avatar];
  const ai = calculateAiCompatibility(userProfile, profile);

  const catalog = useMemo(
    () => exclusiveContentAndInterestService.getDiamondServiceCatalog(),
    [refreshTick]
  );

  const buyerWallet = useMemo(
    () => exclusiveContentAndInterestService.getUserDiamondWallet(currentUserId),
    [currentUserId, refreshTick]
  );

  const freeMediaList = useMemo(
    () =>
      exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: profile.id,
        viewerUserId: currentUserId,
        modality: 'FREE',
      }),
    [profile.id, currentUserId, refreshTick]
  );

  const individualMediaList = useMemo(
    () =>
      exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: profile.id,
        viewerUserId: currentUserId,
        modality: 'INDIVIDUAL_UNLOCK',
      }),
    [profile.id, currentUserId, refreshTick]
  );

  const vipVaultMediaList = useMemo(
    () =>
      exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: profile.id,
        viewerUserId: currentUserId,
        modality: 'VIP_VAULT',
      }),
    [profile.id, currentUserId, refreshTick]
  );

  const unlockedMediaList = useMemo(
    () =>
      [...freeMediaList, ...individualMediaList, ...vipVaultMediaList].filter(
        (item) => item.isUnlockedForViewer
      ),
    [freeMediaList, individualMediaList, vipVaultMediaList]
  );

  const vaultConfig = useMemo(
    () => exclusiveContentAndInterestService.getVipVaultConfig(profile.id),
    [profile.id, refreshTick]
  );

  const hasVipVaultAccess = useMemo(
    () => exclusiveContentAndInterestService.hasActiveVipVaultAccess(currentUserId, profile.id),
    [currentUserId, profile.id, refreshTick]
  );

  const messagingPermission = useMemo(
    () => exclusiveContentAndInterestService.canUsersExchangeMessages(currentUserId, profile.id),
    [currentUserId, profile.id, refreshTick]
  );

  const interestPriceDiamonds = exclusiveContentAndInterestService.getImmediateInterestPriceDiamonds();

  const requestIndividualMediaConfirmation = (item: PublicExclusiveMediaView) => {
    setFeedbackBanner(null);
    setPendingConfirmation({
      type: 'INDIVIDUAL_MEDIA',
      mediaItem: item,
      title: `Desbloquear ${item.mediaType === 'video' ? 'Vídeo Exclusivo' : 'Foto Exclusiva'}`,
      description: item.caption,
      priceDiamonds: item.priceDiamonds,
      accessConditionText:
        'Desbloqueio único individual para este conteúdo específico (independente do Cofre VIP), com entrega via URL temporária assinada.',
    });
  };

  const requestVipVaultConfirmation = () => {
    setFeedbackBanner(null);
    setPendingConfirmation({
      type: 'VIP_VAULT',
      title: `Desbloquear ${vaultConfig.title}`,
      description: vaultConfig.description,
      priceDiamonds: vaultConfig.priceDiamonds,
      accessConditionText: `Passe válido por ${vaultConfig.durationDays} dias corridos para todas as mídias do Cofre VIP deste perfil. Sem renovação automática e independente de mídias avulsas.`,
    });
  };

  const handleUnlockIndividualMedia = async (mediaId: string) => {
    setFeedbackBanner(null);
    setPendingConfirmation(null);
    try {
      const res = await exclusiveContentAndInterestService.purchaseIndividualMediaUnlock({
        buyerUserId: currentUserId,
        mediaId,
        idempotencyKey: `idemp_ind_${currentUserId}_${mediaId}`,
        buyerAgeVerified18Plus: true,
        environment: 'sandbox',
      });
      setRefreshTick((t) => t + 1);
      if (res.success && res.delivery) {
        setActiveSignedUrlByMediaId((prev) => ({
          ...prev,
          [mediaId]: res.delivery!.signedTemporaryUrl,
        }));
        setActiveTokenIdByMediaId((prev) => ({
          ...prev,
          [mediaId]: res.delivery!.tokenId,
        }));
        setFeedbackBanner({
          type: 'success',
          text:
            res.customerReceipt?.summaryText ||
            `Mídia individual desbloqueada por ${formatDiamondsDisplay(res.transaction.diamondsCharged)}! URL temporária assinada ativa.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao desbloquear mídia individual.',
      });
    }
  };

  const handlePurchaseVipVault = async () => {
    setFeedbackBanner(null);
    setPendingConfirmation(null);
    try {
      const res = await exclusiveContentAndInterestService.purchaseVipVaultAccess({
        buyerUserId: currentUserId,
        creatorId: profile.id,
        idempotencyKey: `idemp_vault_${currentUserId}_${profile.id}`,
        buyerAgeVerified18Plus: true,
        environment: 'sandbox',
      });
      setRefreshTick((t) => t + 1);
      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          text:
            res.customerReceipt?.summaryText ||
            `Cofre VIP desbloqueado por ${formatDiamondsDisplay(res.transaction.diamondsCharged)} (${vaultConfig.durationDays} dias). Mídias avulsas permanecem independentes.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao adquirir Cofre VIP.',
      });
    }
  };

  const handleViewFreeOrUnlockedMedia = (item: PublicExclusiveMediaView) => {
    setFeedbackBanner(null);
    const res = exclusiveContentAndInterestService.requestSignedMediaDelivery({
      requesterUserId: currentUserId,
      mediaId: item.id,
    });
    if (res.allowed && res.delivery) {
      setActiveSignedUrlByMediaId((prev) => ({
        ...prev,
        [item.id]: res.delivery!.signedTemporaryUrl,
      }));
      setActiveTokenIdByMediaId((prev) => ({
        ...prev,
        [item.id]: res.delivery!.tokenId,
      }));
      setActiveViewerMediaItem(item);
      setFeedbackBanner({
        type: 'success',
        text: `Visualização protegida autorizada para "${item.caption}" (sem cobrança adicional).`,
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        text: res.reason,
      });
    }
  };

  const handleRenewSignedUrlForItem = (item: PublicExclusiveMediaView): string | undefined => {
    const res = exclusiveContentAndInterestService.renewSignedMediaDelivery({
      requesterUserId: currentUserId,
      mediaId: item.id,
      previousTokenId: activeTokenIdByMediaId[item.id],
    });
    if (res.allowed && res.delivery) {
      setActiveSignedUrlByMediaId((prev) => ({
        ...prev,
        [item.id]: res.delivery!.signedTemporaryUrl,
      }));
      setActiveTokenIdByMediaId((prev) => ({
        ...prev,
        [item.id]: res.delivery!.tokenId,
      }));
      return res.delivery.signedTemporaryUrl;
    }
    return undefined;
  };

  const handleSendGift = async (giftId: string) => {
    setFeedbackBanner(null);
    try {
      const res = await exclusiveContentAndInterestService.sendVirtualGiftInDiamonds({
        senderUserId: currentUserId,
        recipientUserId: profile.id,
        recipientName: profile.name,
        giftId,
        idempotencyKey: `idemp_gift_${currentUserId}_${profile.id}_${giftId}_${Date.now()}`,
        environment: 'sandbox',
      });
      setRefreshTick((t) => t + 1);
      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          text: res.customerReceipt.summaryText,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao enviar presente virtual.',
      });
    }
  };

  const handleConfirmImmediateInterest = async () => {
    setFeedbackBanner(null);
    try {
      const res = await exclusiveContentAndInterestService.sendPaidImmediateInterest({
        senderUserId: currentUserId,
        recipientUserId: profile.id,
        recipientName: profile.name,
        idempotencyKey: `idemp_interest_${currentUserId}_${profile.id}`,
        initialMessage: interestMessage.trim() || `Olá ${profile.name}! Enviei um Interesse Imediato para conversarmos no JOBS.`,
        senderAgeVerified18Plus: true,
        environment: 'sandbox',
      });
      setRefreshTick((t) => t + 1);
      setShowImmediateInterestModal(false);
      if (res.success && res.transaction) {
        setFeedbackBanner({
          type: 'success',
          text:
            res.customerReceipt?.summaryText ||
            `Interesse Imediato confirmado por ${formatDiamondsDisplay(res.transaction.diamondsCharged)}! Conversa liberada com ${profile.name}.`,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao processar envio de interesse imediato.',
      });
    }
  };

  const handleOpenChatSafely = () => {
    const check = exclusiveContentAndInterestService.canUsersExchangeMessages(currentUserId, profile.id);
    if (!check.allowed) {
      setShowImmediateInterestModal(true);
      setFeedbackBanner({
        type: 'error',
        text: `Para enviar mensagem antes do match mútuo, utilize o envio de Interesse Imediato (${formatDiamondsDisplay(interestPriceDiamonds)}).`,
      });
      return;
    }
    onStartChat(profile);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl flex justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-[#0d0d16] border-x sm:border border-white/10 sm:rounded-3xl shadow-2xl min-h-screen sm:min-h-0 flex flex-col relative">
        {/* Top Floating Controls */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCreatorStudioInitialTab('publish_photo');
                setIsCreatorStudioOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer shadow-lg"
              title="Publicar fotos, vídeos ou configurar Cofre VIP"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Publicar & Cofre VIP</span>
            </button>
            <button
              onClick={() => onReport(profile)}
              className="p-2 rounded-full bg-black/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
              title="Denunciar este perfil com sigilo"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                exclusiveContentAndInterestService.blockUserPair(currentUserId, profile.id, 'Bloqueio pelo perfil');
                onBlock(profile);
              }}
              className="p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Bloquear usuário"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gallery Carousel */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-900 overflow-hidden">
          <img
            src={photos[photoIndex]}
            alt={profile.name}
            className="w-full h-full object-cover"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPhotoIndex((prev) => (prev + 1 < photos.length ? prev + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 px-2 py-1 rounded-full">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i === photoIndex ? 'bg-rose-500' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {profile.name}
                </h1>
                <span className="text-xl sm:text-2xl text-slate-300 font-normal">, {profile.age}</span>
                {profile.verified && (
                  <ShieldCheck className="w-6 h-6 text-rose-400 fill-rose-500/20 shrink-0" />
                )}
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {profile.online ? 'Online agora' : 'Visto recentemente'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{profile.city}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.occupation}</span>
              </div>
            </div>
          </div>

          {feedbackBanner && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              }`}
            >
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedbackBanner.text}</span>
            </div>
          )}

          {/* Barra de Saldo da Carteira de Diamantes + Atalhos de Criação */}
          <div className="p-3 rounded-2xl bg-[#141424] border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-300 font-extrabold">Sua Carteira JOBS:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-mono font-bold border border-amber-500/30">
                {formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Comprados: {buyerWallet.purchasedDiamonds} 💎 · Bônus: {buyerWallet.bonusDiamonds} 💎
              </span>
              <button
                onClick={() => {
                  setCreatorStudioInitialTab('my_content');
                  setIsCreatorStudioOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] cursor-pointer"
              >
                Meu Conteúdo
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* MODAL DE CONFIRMAÇÃO PRÉ-COMPRA EM DIAMANTES (💎)                 */}
          {/* ================================================================= */}
          {pendingConfirmation && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#181224] border-2 border-amber-500/60 shadow-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-extrabold text-white">
                    Confirmar Desbloqueio em Diamantes
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-extrabold border border-amber-500/40">
                  {formatDiamondsDisplay(pendingConfirmation.priceDiamonds)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                <div className="font-bold text-white">{pendingConfirmation.title}</div>
                <div className="text-slate-300">{pendingConfirmation.description}</div>
                <div className="text-[11px] text-amber-200 pt-1">
                  <strong>Condição de acesso:</strong> {pendingConfirmation.accessConditionText}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="block text-slate-400">Preço Oficial</span>
                  <strong className="text-amber-300">
                    {formatDiamondsDisplay(pendingConfirmation.priceDiamonds)}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="block text-slate-400">Saldo Atual</span>
                  <strong className="text-white">
                    {formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <span className="block text-slate-400">Saldo Após Compra</span>
                  <strong
                    className={
                      buyerWallet.totalAvailableDiamonds >= pendingConfirmation.priceDiamonds
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {buyerWallet.totalAvailableDiamonds >= pendingConfirmation.priceDiamonds
                      ? formatDiamondsDisplay(
                          buyerWallet.totalAvailableDiamonds - pendingConfirmation.priceDiamonds
                        )
                      : 'Saldo Insuficiente'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingConfirmation(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      pendingConfirmation.type === 'INDIVIDUAL_MEDIA' &&
                      pendingConfirmation.mediaItem
                    ) {
                      handleUnlockIndividualMedia(pendingConfirmation.mediaItem.id);
                    } else if (pendingConfirmation.type === 'VIP_VAULT') {
                      handlePurchaseVipVault();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-xs cursor-pointer"
                >
                  Confirmar e Desbloquear ({formatDiamondsDisplay(pendingConfirmation.priceDiamonds)})
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VITRINE DE CONTEÚDO EM 4 ABAS: GRATUITO, EXCLUSIVO, COFRE VIP, DESBLOQUEADOS */}
          {/* ================================================================= */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('FREE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeMediaTab === 'FREE'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg'
                      : 'bg-[#141422] text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/40'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Gratuito ({freeMediaList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMediaTab('INDIVIDUAL')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeMediaTab === 'INDIVIDUAL'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-[#141422] text-rose-300 border border-rose-500/30 hover:bg-rose-950/40'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Exclusivo ({individualMediaList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMediaTab('VIP_VAULT');
                    setShowVipVaultPanel(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeMediaTab === 'VIP_VAULT'
                      ? 'bg-amber-500 text-slate-950 shadow-lg'
                      : 'bg-[#141422] text-amber-300 border border-amber-500/30 hover:bg-amber-950/40'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Cofre VIP ({vipVaultMediaList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMediaTab('UNLOCKED')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeMediaTab === 'UNLOCKED'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'bg-[#141422] text-indigo-300 border border-indigo-500/30 hover:bg-indigo-950/40'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Desbloqueados ({unlockedMediaList.length})</span>
                </button>
              </div>
            </div>

            {/* ABA 1: CONTEÚDO GRATUITO */}
            {activeMediaTab === 'FREE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Conteúdo Gratuito do Perfil
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Fotos e vídeos abertos publicados por {profile.name} (0 💎 · sem cobrança)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Acesso Livre (0 💎)
                  </span>
                </div>

                {freeMediaList.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#11111c] border border-white/10 text-center text-xs text-slate-400">
                    Nenhum conteúdo gratuito publicado ainda neste perfil.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {freeMediaList.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl overflow-hidden bg-[#11111c] border border-emerald-500/30 flex flex-col justify-between"
                      >
                        <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                          <img
                            src={item.safePreviewUrl}
                            alt={item.caption}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 left-2.5">
                            <span className="px-2 py-0.5 rounded bg-black/80 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              {item.mediaType === 'video' ? (
                                <Video className="w-3 h-3" />
                              ) : (
                                <Camera className="w-3 h-3" />
                              )}
                              {item.mediaType === 'video' ? 'Vídeo Gratuito' : 'Foto Gratuita'}
                            </span>
                          </div>
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white font-mono text-[11px] font-extrabold">
                              0 💎
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 space-y-2">
                          <p className="text-xs font-semibold text-white">{item.caption}</p>
                          <button
                            type="button"
                            onClick={() => handleViewFreeOrUnlockedMedia(item)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>
                              {activeSignedUrlByMediaId[item.id]
                                ? 'Visualização Ativa (0 💎)'
                                : 'Visualizar Conteúdo Gratuito'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: CONTEÚDO EXCLUSIVO / DESBLOQUEIO INDIVIDUAL */}
            {activeMediaTab === 'INDIVIDUAL' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Fotos e Vídeos com Desbloqueio Individual
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cada item avulso possui preço próprio em diamantes (independente do Cofre VIP)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                    Foto {formatDiamondsDisplay(catalog.individualPhotoUnlockDiamonds)} · Vídeo{' '}
                    {formatDiamondsDisplay(catalog.individualVideoUnlockDiamonds)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {individualMediaList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden bg-[#11111c] border border-white/10 flex flex-col justify-between"
                    >
                      <div
                        className="relative aspect-[16/10] bg-slate-900 overflow-hidden select-none"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <img
                          src={
                            item.isUnlockedForViewer
                              ? item.safePreviewUrl
                              : protectedMediaService.getPublicTeaserUrl({
                                  id: item.id,
                                  title: item.caption,
                                })
                          }
                          alt={item.caption}
                          draggable={false}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover pointer-events-none transition-all ${
                            item.isUnlockedForViewer ? '' : 'blur-md scale-105 brightness-75'
                          }`}
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold uppercase flex items-center gap-1">
                            {item.mediaType === 'video' ? (
                              <Video className="w-3 h-3 text-rose-400" />
                            ) : (
                              <Camera className="w-3 h-3 text-amber-400" />
                            )}
                            {item.mediaType === 'video' ? 'Vídeo Exclusivo' : 'Foto Exclusiva'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white font-mono text-[11px] font-extrabold">
                            {formatDiamondsDisplay(item.priceDiamonds)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2.5">
                        <p className="text-xs font-semibold text-white leading-snug">{item.caption}</p>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <span>Desbloqueio Único Individual</span>
                          <span>Independente do Cofre VIP</span>
                        </div>

                        {item.isUnlockedForViewer ? (
                          <div className="space-y-1.5">
                            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-1">
                                <Unlock className="w-3.5 h-3.5" />
                                Desbloqueado
                              </span>
                              <span className="font-mono text-[10px] truncate max-w-[140px]">
                                {activeSignedUrlByMediaId[item.id] ? 'Token Assinado Ativo' : 'Acesso Confirmado'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewFreeOrUnlockedMedia(item)}
                              className="w-full py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 font-bold text-xs cursor-pointer"
                            >
                              Visualizar Mídia Protegida
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => requestIndividualMediaConfirmation(item)}
                            className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>
                              Desbloquear {item.mediaType === 'video' ? 'Vídeo' : 'Foto'} (
                              {formatDiamondsDisplay(item.priceDiamonds)})
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: COFRE VIP INDEPENDENTE */}
            {activeMediaTab === 'VIP_VAULT' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#191522] to-[#110f19] border border-amber-500/40 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasVipVaultAccess ? (
                      <Unlock className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>{vaultConfig.title}</span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          +18 Consentido
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {formatDiamondsDisplay(vaultConfig.priceDiamonds)} · Validade de {vaultConfig.durationDays} dias ·{' '}
                        {vipVaultMediaList.length} mídias no cofre (independente de mídias avulsas)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowVipVaultPanel((prev) => !prev)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showVipVaultPanel ? 'Ocultar Detalhes' : 'Ver Cofre VIP'}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{vaultConfig.description}</p>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
                    <strong>Escopo e Condições:</strong> {vaultConfig.scopeDescription}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vipVaultMediaList.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex flex-col"
                      >
                        <div
                          className="relative aspect-[16/10] bg-slate-900 overflow-hidden select-none"
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          <img
                            src={
                              item.isUnlockedForViewer
                                ? item.safePreviewUrl
                                : protectedMediaService.getPublicTeaserUrl({
                                    id: item.id,
                                    title: item.caption,
                                  })
                            }
                            alt={item.caption}
                            draggable={false}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover pointer-events-none transition-all ${
                              item.isUnlockedForViewer ? '' : 'blur-lg scale-110 brightness-75'
                            }`}
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/80 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              {item.mediaType === 'video' ? (
                                <Video className="w-3 h-3" />
                              ) : (
                                <Camera className="w-3 h-3" />
                              )}
                              {item.mediaType === 'video' ? 'Vídeo Cofre VIP' : 'Foto Cofre VIP'}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-white">{item.caption}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Status: {item.isUnlockedForViewer ? 'Liberado' : 'Incluso no Cofre VIP'}</span>
                            <span>+18 Verificado</span>
                          </div>
                          {item.isUnlockedForViewer && (
                            <button
                              type="button"
                              onClick={() => handleViewFreeOrUnlockedMedia(item)}
                              className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[11px] cursor-pointer"
                            >
                              Visualizar no Player Protegido
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!hasVipVaultAccess ? (
                    <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">
                          Acesso ao Cofre VIP: {formatDiamondsDisplay(vaultConfig.priceDiamonds)} · {vaultConfig.durationDays} dias
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Inclui todas as {vipVaultMediaList.length} mídias do Cofre VIP. Não inclui fotos/vídeos avulsos.
                        </div>
                      </div>
                      <button
                        onClick={requestVipVaultConfirmation}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer shrink-0"
                      >
                        Desbloquear Cofre VIP ({formatDiamondsDisplay(vaultConfig.priceDiamonds)})
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                      <span>Você possui acesso vigente ao Cofre VIP de {profile.name} ({vaultConfig.durationDays} dias).</span>
                      <span className="font-mono text-[10px] uppercase">URL Temporária Protegida</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 4: DESBLOQUEADOS PELO VISITANTE */}
            {activeMediaTab === 'UNLOCKED' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Seus Conteúdos Liberados neste Perfil
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Reúne os itens gratuitos e todas as mídias exclusivas ou do Cofre VIP que você já desbloqueou
                    </p>
                  </div>
                </div>

                {unlockedMediaList.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#11111c] border border-white/10 text-center text-xs text-slate-400">
                    Você ainda não possui itens desbloqueados neste perfil.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {unlockedMediaList.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl overflow-hidden bg-[#11111c] border border-indigo-500/30 flex flex-col justify-between"
                      >
                        <div className="relative aspect-[16/10] bg-slate-900">
                          <img
                            src={item.safePreviewUrl}
                            alt={item.caption}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded bg-black/80 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              {item.modality === 'FREE'
                                ? 'Gratuito'
                                : item.modality === 'VIP_VAULT'
                                ? 'Cofre VIP Liberado'
                                : 'Exclusivo Desbloqueado'}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 space-y-2">
                          <p className="text-xs font-semibold text-white">{item.caption}</p>
                          <button
                            type="button"
                            onClick={() => handleViewFreeOrUnlockedMedia(item)}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs cursor-pointer"
                          >
                            {activeSignedUrlByMediaId[item.id]
                              ? 'URL Temporária Assinada Ativa'
                              : 'Abrir Mídia Protegida'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* SEÇÃO 3: PRESENTES VIRTUAIS EM DIAMANTES (29 💎 A 199 💎)         */}
          {/* ================================================================= */}
          <div className="p-4 rounded-2xl bg-[#11111c] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Enviar Presente Virtual para {profile.name}
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                Faixa oficial: {formatDiamondsDisplay(catalog.virtualGiftsRangeMinDiamonds)} a{' '}
                {formatDiamondsDisplay(catalog.virtualGiftsRangeMaxDiamonds)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {catalog.virtualGifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift.id)}
                  className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-center space-y-1 transition-all cursor-pointer"
                >
                  <div className="text-lg">{gift.icon}</div>
                  <div className="text-[11px] font-semibold text-white truncate">{gift.name}</div>
                  <div className="text-[11px] font-mono font-extrabold text-amber-300">
                    {formatDiamondsDisplay(gift.priceDiamonds)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Compatibility Deep Analysis Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#131322] to-[#10101b] border border-amber-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-display font-bold text-sm text-white">
                  Compatibilidade IA Explicável
                </span>
              </div>
              <span className="text-sm font-extrabold text-amber-400 font-display">
                {ai.overallScore}% Afinidade
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
              "{ai.explanation}"
            </p>

            {/* Breakdown Bars */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Interesses em Comum</span>
                  <span className="text-white font-semibold">{ai.interestsScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${ai.interestsScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Objetivos de Vida</span>
                  <span className="text-white font-semibold">{ai.goalsScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ai.goalsScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Estilo de Vida</span>
                  <span className="text-white font-semibold">{ai.lifestyleScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ai.lifestyleScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Sinergia de Perfil</span>
                  <span className="text-white font-semibold">{ai.communicationScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${ai.communicationScore}%` }} />
                </div>
              </div>
            </div>

            {/* Ethical Disclaimer */}
            <p className="text-[10px] text-slate-400 pt-1 leading-normal italic">
              {ai.disclaimer}
            </p>
          </div>

          {/* Bio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sobre mim
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed bg-[#11111c] p-4 rounded-2xl border border-white/5">
              {profile.bio}
            </p>
          </div>

          {/* Interesses & Hobbies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Interesses e Hobbies
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Detalhes de Estilo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Buscando</span>
              <span className="font-semibold text-white">{profile.relationshipGoal || 'Conexões Reais'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Signo</span>
              <span className="font-semibold text-white">{profile.zodiacSign || 'Escorpião'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Bebida</span>
              <span className="font-semibold text-white">{profile.drinking || 'Socialmente'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11111c] border border-white/5">
              <span className="text-[10px] text-slate-400 block">Distância</span>
              <span className="font-semibold text-white">~{profile.distanceKm || 4} km</span>
            </div>
          </div>

          {/* Modal / Card de Confirmação de Envio de Interesse Imediato */}
          {showImmediateInterestModal && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#151226] border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-extrabold text-white">
                    Enviar interesse imediato para {profile.name}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {formatDiamondsDisplay(interestPriceDiamonds)}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Demonstre interesse imediato antes do match e <strong>libere o envio de mensagem direta</strong> para{' '}
                {profile.name} assim que a confirmação em diamantes for concluída.
              </p>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>Custo do envio: {formatDiamondsDisplay(interestPriceDiamonds)}</span>
                <span>Seu saldo: {formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}</span>
              </div>

              <textarea
                value={interestMessage}
                onChange={(e) => setInterestMessage(e.target.value)}
                placeholder={`Escreva uma primeira mensagem especial para ${profile.name}...`}
                rows={2}
                className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowImmediateInterestModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImmediateInterest}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-xs cursor-pointer"
                >
                  Confirmar e Liberar Conversa ({formatDiamondsDisplay(interestPriceDiamonds)})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="sticky bottom-0 p-4 bg-[#0d0d16]/95 backdrop-blur-lg border-t border-white/10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onLike(profile)}
            className="flex-1 min-w-[140px] py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-xs sm:text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Curtir Perfil</span>
          </button>

          {!messagingPermission.allowed && (
            <button
              onClick={() => setShowImmediateInterestModal(true)}
              className="flex-1 min-w-[170px] py-3.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Enviar interesse imediato ({formatDiamondsDisplay(interestPriceDiamonds)})</span>
            </button>
          )}

          <button
            onClick={handleOpenChatSafely}
            className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs sm:text-sm border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-indigo-400" />
            <span>
              {messagingPermission.allowed ? 'Mandar mensagem agora' : 'Mensagem'}
            </span>
          </button>
        </div>
        <CreatorContentStudioModal
          isOpen={isCreatorStudioOpen}
          onClose={() => setIsCreatorStudioOpen(false)}
          creatorId={profile.id}
          creatorName={profile.name}
          initialTab={creatorStudioInitialTab}
          onPublished={() => setRefreshTick((t) => t + 1)}
        />

        {/* Modal de Visualização Protegida (Canvas + Marca-d'água Forense + FLAG_SECURE + Renovação de URL Assinada) */}
        {activeViewerMediaItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-2xl overflow-y-auto">
            <div className="relative w-full max-w-lg bg-[#12121a] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d0d14]">
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {activeViewerMediaItem.caption}
                  </h4>
                  <p className="text-[11px] text-amber-300">
                    Por {activeViewerMediaItem.creatorName} · Entrega Assinada Temporária (TTL 15 min)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewerMediaItem(null)}
                  aria-label="Fechar Visualizador Protegido"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full bg-black">
                <ProtectedMediaViewer
                  media={{
                    id: activeViewerMediaItem.id,
                    title: activeViewerMediaItem.caption,
                    description: activeViewerMediaItem.caption,
                    mediaUrl: activeViewerMediaItem.safePreviewUrl,
                    priceCredits: activeViewerMediaItem.priceDiamonds,
                    type: activeViewerMediaItem.mediaType,
                    isUnlocked: activeViewerMediaItem.isUnlockedForViewer,
                    likesCount: 0,
                    unlockCount: activeViewerMediaItem.unlockCount,
                  }}
                  creatorName={activeViewerMediaItem.creatorName}
                  isUnlocked={activeViewerMediaItem.isUnlockedForViewer}
                  isFreeContent={activeViewerMediaItem.modality === 'FREE'}
                  preIssuedSignedUrl={activeSignedUrlByMediaId[activeViewerMediaItem.id]}
                  currentUserId={currentUserId}
                  aspectRatio="3/4"
                  onRenewSignedUrl={() => handleRenewSignedUrlForItem(activeViewerMediaItem)}
                  showWatermark={true}
                />
              </div>

              <div className="p-3.5 bg-[#0d0d14] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Cache-Control: private, no-store, no-cache</span>
                <span className="text-emerald-400 font-mono">FLAG_SECURE + Marca-d’água Ativos</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

