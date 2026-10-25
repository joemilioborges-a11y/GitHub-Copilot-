import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LiveStream,
  LiveChatMessage,
  LiveGender,
  LiveSexualOrientation,
} from '../types';
import {
  Radio,
  Users,
  Lock,
  Unlock,
  Coins,
  Gift,
  Flame,
  Send,
  X,
  Sparkles,
  Heart,
  Eye,
  ArrowRight,
  Filter,
  RotateCcw,
  Star,
  Ban,
  Swords,
  Layers,
  Target,
  Trophy,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  ShieldAlert,
  Check,
  AlertTriangle,
  Clock,
  Volume2,
  ThumbsUp,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  liveStreamService,
  LiveSessionModel,
  LiveFormat,
  OFFICIAL_VIRTUAL_GIFTS,
  VirtualGiftItem,
} from '../services/liveStreamService';
import { trackEvent } from '../utils/analytics';
import confetti from 'canvas-confetti';
import { LiveCenter } from './LiveCenter';
import { useLiveStreamView } from '../hooks/useLiveStreamView';
import { GiftAnimationOverlay } from './GiftAnimationOverlay';
import { FloatingHeartsOverlay } from './FloatingHeartsOverlay';
import { LivePopularityIndicator } from './LivePopularityIndicator';

interface LiveStreamViewProps {
  liveStreams?: LiveStream[];
  userCredits: number;
  onUnlockLiveStream?: (streamId: string, costCredits: number) => void;
  onSendLiveTip?: (stream: any, amountCredits: number) => void;
  onOpenWallet: () => void;
  onStartUserLive?: () => void;
  favoriteCreatorIds?: string[];
  onToggleFavorite?: (creatorId: string) => void;
  blockedUserIds?: string[];
  onToggleBlock?: (creatorId: string) => void;
  onCreditsUpdated?: (newBalance: number) => void;
}

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  liveStreams: propStreams = [],
  userCredits,
  onUnlockLiveStream,
  onSendLiveTip,
  onOpenWallet,
  onStartUserLive,
  favoriteCreatorIds = [],
  onToggleFavorite,
  blockedUserIds = [],
  onToggleBlock,
  onCreditsUpdated,
}) => {
  // Hook de gerenciamento do estado da LiveStreamView e Sala de Transmissão
  const {
    viewMode,
    selectedLiveId,
    isRoomOpen,
    currentSession: activeSession,
    sessions,
    comments,
    recentComments,
    likesCount,
    recentLikes,
    giftEvents,
    connectionStatus,
    isLoading: isLiveLoading,
    error: liveError,
    audienceCount,
    isAudienceReliable,
    openLive,
    backToList,
    sendComment,
    sendLike,
    sendGift,
    refreshLives,
    clearError,
  } = useLiveStreamView({
    userCredits,
    blockedUserIds,
    onCreditsUpdated,
    onSendLiveTip,
  });

  // Filtros
  const [activeFormatTab, setActiveFormatTab] = useState<'all' | LiveFormat | 'rankings'>('all');
  const [genderFilter, setGenderFilter] = useState<'todos' | LiveGender>('todos');
  const [orientationFilter, setOrientationFilter] = useState<'todas' | LiveSexualOrientation>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Interações na sala
  const [chatInput, setChatInput] = useState('');
  const [tipAnimation, setTipAnimation] = useState<string | null>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<VirtualGiftItem>(OFFICIAL_VIRTUAL_GIFTS[0]);
  const [selectedBattleTarget, setSelectedBattleTarget] = useState<string | null>(null);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Denúncia
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('assedio');

  // Modal de Criação de Live do Usuário (Broadcast Creator)
  const [isCreateLiveOpen, setIsCreateLiveOpen] = useState(false);
  const [newLiveFormat, setNewLiveFormat] = useState<LiveFormat>('individual');
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveDesc, setNewLiveDesc] = useState('');
  const [newLiveCategory, setNewLiveCategory] = useState<LiveSessionModel['category']>('conversa_vip');
  const [newLivePrice, setNewLivePrice] = useState(50);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeStreamVideoRef = useRef<HTMLVideoElement>(null);

  // Leaderboard
  const leaderboards = useMemo(() => liveStreamService.getCreatorLeaderboard('semana'), []);

  // Recarregar sessões
  const refreshSessions = () => {
    refreshLives();
  };

  // Câmera local quando usuário abre modal de transmissão
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCreateLiveOpen && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          setHasCameraAccess(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setHasCameraAccess(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCreateLiveOpen]);

  // Filtragem de sessões
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (blockedUserIds.includes(s.hostCreatorId)) return false;
      const matchFormat = activeFormatTab === 'all' || s.format === activeFormatTab;
      const matchGender = genderFilter === 'todos' || s.gender === genderFilter;
      const matchOrientation = orientationFilter === 'todas' || s.sexualOrientation === orientationFilter;
      const matchSearch =
        !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hostCreatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchFormat && matchGender && matchOrientation && matchSearch;
    });
  }, [sessions, activeFormatTab, genderFilter, orientationFilter, searchQuery, blockedUserIds]);

  const isFilterActive = genderFilter !== 'todos' || orientationFilter !== 'todas' || searchQuery !== '';

  const handleResetFilters = () => {
    setGenderFilter('todos');
    setOrientationFilter('todas');
    setSearchQuery('');
    setActiveFormatTab('all');
  };

  // Abrir sala de live através do hook useLiveStreamView
  const handleOpenSession = async (session: LiveSessionModel) => {
    const ok = await openLive(session.id);
    if (ok) {
      trackEvent('live_session_opened', {
        sessionId: session.id,
        host: session.hostCreatorName,
        format: session.format,
      });
    }
  };

  // Desbloquear show íntimo individual com créditos
  const handleUnlockIntimateMode = () => {
    if (!activeSession) return;
    if (userCredits < activeSession.priceCreditsToUnlock) {
      onOpenWallet();
      return;
    }

    // Debitar créditos via ledger
    if (onUnlockLiveStream) {
      onUnlockLiveStream(activeSession.id, activeSession.priceCreditsToUnlock);
    }
    refreshLives();

    // Efeito de confetes
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      //
    }

    trackEvent('live_stream_intimate_unlocked', {
      sessionId: activeSession.id,
      cost: activeSession.priceCreditsToUnlock,
    });
  };

  // Enviar Mensagem no Chat através do hook useLiveStreamView com feedback visual
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSession) return;
    setCommentFeedback('sending');
    const ok = await sendComment(chatInput);
    if (ok) {
      setChatInput('');
      setCommentFeedback('sent');
      setTimeout(() => setCommentFeedback('idle'), 1500);
    } else {
      setCommentFeedback('idle');
    }
  };

  // Curtir com feedback visual imediato
  const handleSendLike = () => {
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);
    sendLike();
  };

  // Enviar Presente Virtual Atômico (reutiliza fluxo do ledgerService com 70/30)
  const handleExecuteSendGift = async () => {
    if (!activeSession) return;
    if (userCredits < selectedGift.creditsCost) {
      setIsGiftModalOpen(false);
      onOpenWallet();
      return;
    }

    const res = await sendGift(selectedGift, selectedBattleTarget || undefined);
    if (res.success) {
      setIsGiftModalOpen(false);
      setTipAnimation(`${selectedGift.icon} ${selectedGift.name} (${selectedGift.creditsCost} 💎)`);
      setTimeout(() => setTipAnimation(null), 3500);

      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.7 },
        });
      } catch {
        // no-op
      }
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Criar Nova Live
  const handleCreateLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiveTitle.trim()) return;

    try {
      const newLive = await liveStreamService.startNewLiveSession({
        format: newLiveFormat,
        title: newLiveTitle.trim(),
        description: newLiveDesc.trim() || 'Transmissão ao vivo dos melhores momentos.',
        category: newLiveCategory,
        hostCreatorId: 'current_user',
        hostCreatorName: 'Você (Criador)',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'bi',
        priceCreditsToUnlock: newLiveFormat === 'individual' ? newLivePrice : 0,
      });

      setIsCreateLiveOpen(false);
      setNewLiveTitle('');
      setNewLiveDesc('');
      refreshLives();
      await openLive(newLive.id);
      trackEvent('creator_live_started', { sessionId: newLive.id, format: newLive.format });
    } catch (err: any) {
      alert(err?.message || 'Erro ao iniciar live.');
    }
  };

  // Denúncia
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    liveStreamService.reportLiveSession({
      sessionId: activeSession.id,
      reporterId: 'current_user',
      category: reportCategory,
      reason: reportReason || 'Denúncia de conteúdo realizada pelo espectador',
    });
    setIsReportModalOpen(false);
    setReportReason('');
    alert('Denúncia recebida com sucesso e enviada para a central de moderação.');
  };

  // Verificar se o show individual está bloqueado
  const isIndividualLocked =
    activeSession?.format === 'individual' &&
    activeSession.priceCreditsToUnlock > 0 &&
    !activeSession.isUnlockedByUser;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Start Live CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#151522] to-amber-950/30 border border-rose-500/30 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>Central de Lives</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase">
              MODO DEMO HD
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display">
            Transmissões, Batalhas & Desafios ao Vivo
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Interação em tempo real com criadores. Apoie em batalhas de shows, participe de salas com palco aberto,
            envie presentes virtuais e desbloqueie momentos íntimos com créditos protegidos por livro-razão.
          </p>
        </div>

        <button
          onClick={() => setIsCreateLiveOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-xl shadow-rose-950/60 cursor-pointer shrink-0 flex items-center gap-2 hover:scale-105"
        >
          <Radio className="w-4 h-4" />
          <span>Transmitir ao Vivo</span>
        </button>
      </div>

      {/* STREAMING MODE NOTICE BANNER */}
      <div className="p-3 rounded-2xl bg-[#0e0e18] border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Status de Streaming:</strong> Transmissão de alta fidelidade em <strong>Modo DEMO simulado</strong> com WebRTC local e reprodutor interativo.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>70% Criador / 30% JOBS Ativo</span>
        </div>
      </div>

      {/* FORMAT TABS SELECTOR */}
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-800">
        {[
          { id: 'all', label: 'Todas as Lives', icon: Radio },
          { id: 'individual', label: 'Shows Individuais', icon: Eye },
          { id: 'battle', label: 'Batalhas de Criadores', icon: Swords },
          { id: 'interactive_stage', label: 'Salas com Palco', icon: Layers },
          { id: 'challenge', label: 'Desafios & Metas', icon: Target },
          { id: 'rankings', label: 'Rankings & Pontos', icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeFormatTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFormatTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-extrabold'
                  : 'bg-[#12121c] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW: RANKINGS & PONTOS (Quando selecionado na aba) */}
      {activeFormatTab === 'rankings' ? (
        <div className="p-6 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Ranking de Desempenho & Batalhas</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pontuação auditada por participações, vitórias em duelos e engajamento da comunidade (pontos separados de dinheiro).
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Temporada 2026 · Semanal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141422] text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Criador</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Pontos Totais</th>
                  <th className="px-4 py-3">Batalhas Vencidas</th>
                  <th className="px-4 py-3">Horas ao Vivo</th>
                  <th className="px-4 py-3">Distintivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {leaderboards.map((entry) => (
                  <tr key={entry.creatorId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-base">
                      {entry.rank === 1 ? '🥇 1º' : entry.rank === 2 ? '🥈 2º' : entry.rank === 3 ? '🥉 3º' : `#${entry.rank}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={entry.creatorAvatar}
                          alt={entry.creatorName}
                          className="w-8 h-8 rounded-full object-cover border border-rose-500"
                        />
                        <span className="font-bold text-white">{entry.creatorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{entry.category}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{entry.totalPoints.toLocaleString('pt-BR')} pts</td>
                    <td className="px-4 py-3 font-mono text-slate-200">{entry.battlesWon} vitórias</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{entry.totalLiveHours}h</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
                        {entry.badgeLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <LiveCenter onSelectLive={handleOpenSession} />
      )}

      {/* ERRO DE TRANSMISSÃO TOAST / ALERTA */}
      {liveError && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{liveError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={backToList}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
            >
              Voltar à Lista
            </button>
            <button
              onClick={clearError}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMMERSIVE LIVE ROOM MODAL */}
      {isRoomOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="relative w-full max-w-5xl h-full sm:h-[94vh] bg-[#0c0c14] sm:border sm:border-slate-800 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Top Close / Back to List Button */}
            <button
              onClick={backToList}
              aria-label="Voltar para a lista de lives"
              className="absolute top-4 right-4 z-40 w-9 h-9 rounded-full bg-black/70 hover:bg-black/95 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player Column */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px]">
              {/* Media Stream Video / Fallback Demo Image */}
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {activeSession.format === 'battle' && activeSession.battleState ? (
                  // BATTLE SPLIT SCREEN (2 Criadores Lado a Lado)
                  <div className="w-full h-full grid grid-cols-2 gap-1 bg-black">
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        src={activeSession.battleState.creator1.streamUrl}
                        alt={activeSession.battleState.creator1.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-rose-500/50">
                        {activeSession.battleState.creator1.name} (Placar: {activeSession.battleState.creator1.score})
                      </div>
                    </div>
                    <div className="relative w-full h-full overflow-hidden">
                      <img
                        src={activeSession.battleState.creator2.streamUrl}
                        alt={activeSession.battleState.creator2.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-amber-500/50">
                        {activeSession.battleState.creator2.name} (Placar: {activeSession.battleState.creator2.score})
                      </div>
                    </div>
                  </div>
                ) : (
                  // STANDARD STREAM
                  <img
                    src={
                      isIndividualLocked
                        ? activeSession.vipStreamMediaUrl
                        : activeSession.isUnlockedByUser
                        ? activeSession.vipStreamMediaUrl
                        : activeSession.streamMediaUrl
                    }
                    alt={activeSession.title}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isIndividualLocked ? 'filter blur-[24px] brightness-50 scale-110' : 'filter-none scale-100'
                    }`}
                  />
                )}
              </div>

              {/* OVERLAY: Top Status & Back Controls */}
              <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2">
                <button
                  onClick={backToList}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                  title="Voltar para a lista de transmissões"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Lista</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Ao Vivo</span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-mono font-bold"
                  title="Audiência estimada em Modo DEMO simulado"
                >
                  <Users className="w-3.5 h-3.5 text-rose-400" />
                  <span>{audienceCount ? audienceCount.toLocaleString('pt-BR') : '0'}</span>
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase ml-0.5">DEMO</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                  {connectionStatus === 'connected' ? 'Conectado' : 'DEMO HD'}
                </span>
              </div>

              {/* OVERLAY: Creator Info Card */}
              <div className="absolute top-16 left-4 z-30 flex items-center gap-2.5 p-2 pr-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                <img
                  src={activeSession.hostCreatorAvatar}
                  alt={activeSession.hostCreatorName}
                  className="w-9 h-9 rounded-full object-cover border-2 border-rose-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white">{activeSession.hostCreatorName}</h4>
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="p-1 rounded-full bg-white/10 hover:bg-rose-950 text-slate-300 hover:text-rose-400 transition-colors"
                      title="Denunciar transmissão"
                    >
                      <ShieldAlert className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-300">
                    <span>{activeSession.genderLabel} · {activeSession.orientationLabel}</span>
                  </div>
                </div>
              </div>

              {/* OVERLAY: Battle Timer in Battle mode */}
              {activeSession.format === 'battle' && activeSession.battleState && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/60 text-amber-300 font-mono font-extrabold text-xs flex items-center gap-2 shadow-2xl">
                  <Swords className="w-4 h-4 text-rose-500" />
                  <span>Duelo: 02:22 restantes</span>
                </div>
              )}

              {/* OVERLAY: Indicador de Popularidade em Tempo Real (Mobile & Desktop) */}
              <div className="absolute top-4 right-4 z-30">
                <LivePopularityIndicator
                  viewerCount={audienceCount ?? activeSession.viewerCount}
                  likesCount={likesCount}
                  totalGiftsCredits={activeSession.totalGiftsReceivedCredits}
                />
              </div>

              {/* OVERLAY: Floating Hearts Layer (Variações orgânicas, rate limiting e acessibilidade) */}
              <FloatingHeartsOverlay
                liveId={activeSession.id}
                incomingLikes={recentLikes}
                maxConcurrent={20}
              />

              {/* OVERLAY: Gift Animation Overlay de Alta Fidelidade (Tiers Bronze/Silver/Gold/Diamond) */}
              <GiftAnimationOverlay
                liveId={activeSession.id}
                events={giftEvents}
                maxConcurrent={3}
              />

              {/* Tip floating animation banner */}
              {tipAnimation && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2 animate-bounce">
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Mimo Enviado: {tipAnimation}</span>
                </div>
              )}

              {/* OVERLAY: Lock Paywall for Intimate mode */}
              {isIndividualLocked && (
                <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-rose-600/20 border border-rose-500/60 text-rose-400 flex items-center justify-center mb-3 shadow-2xl animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-black uppercase mb-2">
                    Momento Íntimo Ativado (+18)
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-display max-w-sm mb-2">
                    A criadora tirou a roupa ao vivo!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-5">
                    De acordo com as regras de monetização do JOBS, o momento íntimo exclusivo requer pagamento do ingresso em créditos para continuar assistindo.
                  </p>
                  <div className="space-y-3 w-full max-w-sm">
                    <button
                      onClick={handleUnlockIntimateMode}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 hover:from-amber-300 hover:to-rose-500 text-slate-950 font-black text-xs transition-all shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Desbloquear Show Íntimo ({activeSession.priceCreditsToUnlock} 💎)</span>
                    </button>
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Seu saldo: <strong className="text-white font-mono">{userCredits} créditos</strong></span>
                      <button onClick={onOpenWallet} className="text-amber-400 font-bold hover:underline cursor-pointer">
                        + Recarregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OVERLAY: Stage interactive controls in stage mode */}
              {activeSession.format === 'interactive_stage' && (
                <div className="absolute bottom-18 left-3 right-3 z-30 flex items-center justify-between p-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white">
                      Palco: {activeSession.stageParticipants.length} participantes
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      liveStreamService.requestJoinStage(activeSession.id, {
                        id: 'current_user',
                        name: 'Você',
                        avatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
                      });
                      alert('Solicitação para subir no palco enviada ao anfitrião!');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
                  >
                    Pedir para Subir no Palco
                  </button>
                </div>
              )}

              {/* OVERLAY: Recent Comments (Bottom-Left overlay, limited in memory, non-blocking) */}
              <div className="absolute bottom-16 left-3 max-w-[280px] sm:max-w-xs z-30 pointer-events-none space-y-1.5 overflow-hidden flex flex-col justify-end">
                {recentComments.slice(-4).map((msg) => (
                  <div
                    key={msg.id}
                    className="px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 text-xs text-white shadow-lg pointer-events-auto leading-snug animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <strong className="text-rose-400 mr-1.5">{msg.senderName}:</strong>
                    <span className="text-slate-200">{msg.text}</span>
                  </div>
                ))}
              </div>

              {/* OVERLAY: Bottom Interactive Control Bar */}
              <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2">
                {/* Comment input form with enter submit */}
                <form
                  onSubmit={handleSendChat}
                  className="flex-1 flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-1.5 shadow-2xl focus-within:border-rose-500"
                >
                  <input
                    type="text"
                    placeholder="Enviar mensagem na live..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 outline-none"
                    aria-label="Comentário na transmissão"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || commentFeedback === 'sending'}
                    aria-label="Enviar comentário"
                    className="w-7 h-7 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    {commentFeedback === 'sending' ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : commentFeedback === 'sent' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>

                {/* Like Button com Feedback Visual Orgânico */}
                <button
                  type="button"
                  onClick={handleSendLike}
                  aria-label={`Curtir transmissão (${likesCount} curtidas)`}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/75 hover:bg-rose-950/80 backdrop-blur-md border border-rose-500/40 text-rose-400 font-bold text-xs shadow-2xl transition-all cursor-pointer ${
                    isLikeAnimating ? 'scale-125 border-rose-400 bg-rose-900/60 shadow-rose-500/50' : 'active:scale-90 hover:scale-105'
                  } shrink-0`}
                >
                  <Heart className={`w-4 h-4 fill-rose-500 text-rose-500 ${isLikeAnimating ? 'animate-ping' : ''}`} />
                  <span className="font-mono text-white text-[11px]">{likesCount}</span>
                </button>

                {/* Virtual Gift Button */}
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(true)}
                  aria-label="Enviar presente virtual"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-xs shadow-2xl transition-all cursor-pointer hover:scale-105 shrink-0"
                >
                  <Gift className="w-4 h-4" />
                  <span className="hidden sm:inline">Mimos</span>
                </button>

                {/* Exit Room Button */}
                <button
                  type="button"
                  onClick={backToList}
                  aria-label="Sair da sala"
                  className="p-2 rounded-2xl bg-black/75 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                  title="Sair da sala e voltar à lista"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat & Gifting Sidebar Column (Full History on Desktop) */}
            <div className="w-full md:w-80 bg-[#101018] border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-72 md:h-full shrink-0">
              {/* Header */}
              <div className="p-3 border-b border-slate-800 bg-[#0d0d14] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chat da Live</h4>
                  <span className="text-[10px] text-slate-400">Interaja e envie presentes virtuais</span>
                </div>
                <button
                  onClick={() => setIsGiftModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Mimos 💎</span>
                </button>
              </div>

              {/* Chat Stream (Full Persistent History) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {comments.map((msg) => (
                  <div key={msg.id} className="text-xs">
                    {msg.giftCost ? (
                      <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 font-bold">
                        <span className="text-white">{msg.senderName}:</span> {msg.text}
                      </div>
                    ) : msg.isSystemNotice ? (
                      <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] font-semibold">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="text-slate-300 leading-snug">
                        <strong className="text-rose-400 mr-1.5">{msg.senderName}:</strong>
                        <span>{msg.text}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick tip buttons */}
              <div className="p-2.5 border-t border-slate-800 bg-[#0e0e16] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Envio rápido de presentes:</span>
                  <span className="text-amber-400 font-mono font-bold">{userCredits} 💎</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedGift(OFFICIAL_VIRTUAL_GIFTS[0]);
                      setIsGiftModalOpen(true);
                    }}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    🌹 10
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGift(OFFICIAL_VIRTUAL_GIFTS[1]);
                      setIsGiftModalOpen(true);
                    }}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    🍸 25
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGift(OFFICIAL_VIRTUAL_GIFTS[2]);
                      setIsGiftModalOpen(true);
                    }}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    🍾 50
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGift(OFFICIAL_VIRTUAL_GIFTS[3]);
                      setIsGiftModalOpen(true);
                    }}
                    className="py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 text-[11px] font-black transition-colors cursor-pointer"
                  >
                    🔥 100
                  </button>
                </div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-800 bg-[#0d0d14] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Comente na transmissão..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#161622] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIRTUAL GIFT SELECTION MODAL */}
      {isGiftModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#12121f] border border-slate-700 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Catálogo de Presentes Virtuais</h4>
              </div>
              <button onClick={() => setIsGiftModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Battle Creator selector if in Battle mode */}
            {activeSession.format === 'battle' && activeSession.battleState && (
              <div className="p-3 rounded-2xl bg-black/60 border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 block">
                  Escolha para quem vai o apoio na Batalha (+10 pts por crédito):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBattleTarget(activeSession.battleState!.creator1.id)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                      selectedBattleTarget === activeSession.battleState.creator1.id || !selectedBattleTarget
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-[#181828] text-slate-300 border-slate-700'
                    }`}
                  >
                    {activeSession.battleState.creator1.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBattleTarget(activeSession.battleState!.creator2.id)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                      selectedBattleTarget === activeSession.battleState.creator2.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-[#181828] text-slate-300 border-slate-700'
                    }`}
                  >
                    {activeSession.battleState.creator2.name}
                  </button>
                </div>
              </div>
            )}

            {/* Gift Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
              {OFFICIAL_VIRTUAL_GIFTS.map((gift) => {
                const isSelected = selectedGift.id === gift.id;
                return (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGift(gift)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-rose-950/80 to-[#1e1428] border-rose-500 shadow-lg shadow-rose-950/50 scale-105'
                        : 'bg-[#181828] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-3xl mb-1">{gift.icon}</span>
                    <span className="text-xs font-bold text-white leading-tight">{gift.name}</span>
                    <span className="text-xs font-mono font-bold text-amber-400 mt-1">
                      {gift.creditsCost} 💎
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Balance check & Send button */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Custo: <strong className="text-white font-mono">{selectedGift.creditsCost} créditos</strong></span>
                <span>Seu Saldo: <strong className="text-amber-400 font-mono">{userCredits} créditos</strong></span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Repasse Contábil: <strong>70% Criador (R$ {(selectedGift.creditsCost * 0.1 * 0.7).toFixed(2)})</strong></span>
                <span className="text-blue-400 font-bold">30% JOBS</span>
              </div>

              <button
                onClick={handleExecuteSendGift}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600 hover:from-amber-300 hover:to-rose-500 text-slate-950 font-black text-xs transition-all shadow-xl shadow-rose-950/60 cursor-pointer flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4" />
                <span>Confirmar Envio ({selectedGift.creditsCost} 💎)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LIVE BROADCAST MODAL */}
      {isCreateLiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#12121f] border border-slate-700 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500" />
                <h4 className="text-sm font-bold text-white">Configurar Nova Transmissão Ao Vivo</h4>
              </div>
              <button onClick={() => setIsCreateLiveOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLiveSubmit} className="space-y-4 text-xs">
              {/* Webcam Preview Adapter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  <span>Prévia da Câmera (WebRTC Local):</span>
                </label>
                <div className="relative aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!hasCameraAccess && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-950">
                      <Camera className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="font-bold text-slate-300">Câmera não autorizada ou indisponível</p>
                      <p className="text-[11px] text-slate-500 mt-1">A transmissão utilizará o feed simulado DEMO de alta resolução.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Formato da Transmissão:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'individual', label: 'Individual' },
                    { id: 'battle', label: 'Batalha' },
                    { id: 'interactive_stage', label: 'Palco' },
                    { id: 'challenge', label: 'Desafio' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNewLiveFormat(f.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        newLiveFormat === f.id
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                          : 'bg-[#181828] text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Título da Live:</label>
                <input
                  type="text"
                  placeholder="Ex: Noite de Champagne e Ensaio VIP..."
                  value={newLiveTitle}
                  onChange={(e) => setNewLiveTitle(e.target.value)}
                  required
                  className="w-full bg-[#181828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Descrição e Regras:</label>
                <textarea
                  rows={2}
                  placeholder="Descreva o que vai acontecer na live e a meta para o show íntimo..."
                  value={newLiveDesc}
                  onChange={(e) => setNewLiveDesc(e.target.value)}
                  className="w-full bg-[#181828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                />
              </div>

              {/* Price if Individual */}
              {newLiveFormat === 'individual' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Preço em Créditos para o Show Íntimo:</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={newLivePrice}
                    onChange={(e) => setNewLivePrice(Number(e.target.value))}
                    className="w-full bg-[#181828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400">
                    O ingresso de {newLivePrice} créditos (R$ {(newLivePrice * 0.1).toFixed(2)}) repassará 70% (R$ {(newLivePrice * 0.1 * 0.7).toFixed(2)}) diretamente à sua conta.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateLiveOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-rose-950/50 cursor-pointer"
                >
                  Iniciar Transmissão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#12121f] border border-rose-500/40 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Denunciar Transmissão</h4>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Motivo Principal:</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full bg-[#181828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="assedio">Assédio ou Linguagem Violenta</option>
                  <option value="menor_de_idade">Suspeita de Menor de Idade</option>
                  <option value="fraude">Spam ou Fraude</option>
                  <option value="conteudo_proibido">Conteúdo Proibido / Violação de Regras</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Detalhes Adicionais:</label>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Descreva o que ocorreu durante a live..."
                  className="w-full bg-[#181828] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold"
                >
                  Enviar Denúncia Sigilosa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
