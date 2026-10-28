import React, { useState, useEffect } from 'react';
import { Profile, Message, VipMediaItem } from '../types';
import {
  Send,
  Lock,
  Unlock,
  Coins,
  Gift,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Star,
  Ban,
  ShieldAlert,
  UserCheck,
  Search,
  X,
} from 'lucide-react';
import { ProtectedMediaViewer } from './ProtectedMediaViewer';
import { authService } from '../utils/authService';

interface ChatViewProps {
  profiles: Profile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  userCredits: number;
  onUnlockMedia: (mediaId: string, cost: number) => void;
  onOpenWallet: () => void;
  onOpenProfileDetail: (profile: Profile) => void;
  onSendTip: (profile: Profile, amount: number) => void;
  favoriteCreatorIds?: string[];
  onToggleFavorite?: (creatorId: string) => void;
  onIncomingMessage?: (sender: Profile, text: string) => void;
  blockedUserIds?: string[];
  onToggleBlock?: (creatorId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  userCredits,
  onUnlockMedia,
  onOpenWallet,
  onOpenProfileDetail,
  onSendTip,
  favoriteCreatorIds = [],
  onToggleFavorite,
  onIncomingMessage,
  blockedUserIds = [],
  onToggleBlock,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<{ [key: string]: Message[] }>(() => {
    // Initial mock chat messages for profiles
    return {
      valentina: [
        {
          id: 'm1',
          senderId: 'valentina',
          text: 'Oi! Adorei que demos match no Jhobs. Estava olhando suas fotos aqui...',
          createdAt: '19:42'
        },
        {
          id: 'm2',
          senderId: 'valentina',
          text: 'Tirei essa foto agora à tarde no meu closet. Quer ver? Deixei no privado 🙈',
          createdAt: '19:43',
          vipMedia: {
            id: 'val_chat_secret',
            title: 'Prévia Secreta no Espelho',
            description: 'Foto sensual exclusiva enviada diretamente no chat.',
            mediaUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
            priceCredits: 60,
            type: 'photo',
            isUnlocked: false,
            likesCount: 120,
            unlockCount: 45
          }
        }
      ],
      isabella: [
        {
          id: 'i1',
          senderId: 'isabella',
          text: 'Oii! Você também mora por aqui perto do Leblon? Adoro tomar um drink no pôr do sol.',
          createdAt: 'Ontem'
        },
        {
          id: 'i2',
          senderId: 'isabella',
          text: 'Deixei umas fotos quentes no meu cofre VIP se quiser me conhecer melhor ✨',
          createdAt: 'Ontem'
        }
      ],
      camila: [
        {
          id: 'c1',
          senderId: 'camila',
          text: 'Olá! Sou um pouco misteriosa no início, mas adoro boas conversas com pessoas maduras.',
          createdAt: '18:15'
        }
      ],
      gabriel: [
        {
          id: 'g1',
          senderId: 'gabriel',
          text: 'E aí! Curtindo o app? Se quiser marcar um treino ou tomar uma cerveja artesanal, só falar.',
          createdAt: '17:30'
        }
      ]
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [contactsTab, setContactsTab] = useState<'all' | 'favorites' | 'blocked'>('all');
  const [contactToBlock, setContactToBlock] = useState<Profile | null>(null);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const activeMessages = (activeProfile && conversations[activeProfile.id]) || [];

  const isContactBlocked = Boolean(activeProfile && blockedUserIds.includes(activeProfile.id));
  const isContactFavorite = Boolean(activeProfile && favoriteCreatorIds.includes(activeProfile.id));

  // Contacts counts
  const favoriteCount = profiles.filter((p) => favoriteCreatorIds.includes(p.id) && !blockedUserIds.includes(p.id)).length;
  const blockedCount = profiles.filter((p) => blockedUserIds.includes(p.id)).length;
  const nonBlockedCount = profiles.filter((p) => !blockedUserIds.includes(p.id)).length;

  const filteredProfiles = profiles.filter((p) => {
    // 1. Search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCity = p.city?.toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }

    // 2. Tab filter
    if (contactsTab === 'favorites') {
      return favoriteCreatorIds.includes(p.id) && !blockedUserIds.includes(p.id);
    }
    if (contactsTab === 'blocked') {
      return blockedUserIds.includes(p.id);
    }
    return !blockedUserIds.includes(p.id);
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeProfile || isContactBlocked) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      senderId: 'user',
      text: inputText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations((prev) => ({
      ...prev,
      [activeProfile.id]: [...(prev[activeProfile.id] || []), userMsg]
    }));

    setInputText('');

    // Simulate match reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        'Adorei sua mensagem! O que mais você gosta de fazer para relaxar?',
        'Você é bem direto, gosto de atitude assim 🔥',
        'Se você desbloquear minha foto no cofre prometo mandar mais uma exclusiva para você!',
        'Quer marcar de tomar um vinho qualquer dia desses?'
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const replyMsg: Message = {
        id: `rep_${Date.now()}`,
        senderId: activeProfile.id,
        text: randomResponse,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations((prev) => ({
        ...prev,
        [activeProfile.id]: [...(prev[activeProfile.id] || []), replyMsg]
      }));

      if (onIncomingMessage) {
        onIncomingMessage(activeProfile, randomResponse);
      }
    }, 1800);
  };

  const handleUnlockInChat = (media: VipMediaItem) => {
    if (userCredits < media.priceCredits) {
      onOpenWallet();
      return;
    }

    onUnlockMedia(media.id, media.priceCredits);

    // Update conversation local unlocked state
    setConversations((prev) => {
      const currentList = prev[activeProfile.id] || [];
      const updatedList = currentList.map((m) => {
        if (m.vipMedia && m.vipMedia.id === media.id) {
          return {
            ...m,
            vipMedia: { ...m.vipMedia, isUnlocked: true }
          };
        }
        return m;
      });
      return { ...prev, [activeProfile.id]: updatedList };
    });
  };

  const handleSendChatTip = (amount: number) => {
    if (userCredits < amount) {
      onOpenWallet();
      return;
    }
    onSendTip(activeProfile, amount);

    const tipMsg: Message = {
      id: `tip_${Date.now()}`,
      senderId: 'user',
      text: `🎁 Enviou um mimo de ${amount} créditos 💎`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tipAmount: amount
    };

    setConversations((prev) => ({
      ...prev,
      [activeProfile.id]: [...(prev[activeProfile.id] || []), tipMsg]
    }));

    // Match thankful reply
    setTimeout(() => {
      const thankMsg: Message = {
        id: `thx_${Date.now()}`,
        senderId: activeProfile.id,
        text: `Nossa, muito obrigada pelo mimo de ${amount} créditos! Você é um querido ❤️ Vou separar um conteúdo bem especial para você.`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversations((prev) => ({
        ...prev,
        [activeProfile.id]: [...(prev[activeProfile.id] || []), thankMsg]
      }));
    }, 1200);
  };

  return (
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)] flex rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800 bg-[#0e0e16] shadow-2xl">
      {/* Matches List (Sidebar) */}
      <div
        className={`w-full md:w-80 border-r border-slate-800 bg-[#12121a] flex flex-col shrink-0 ${
          activeProfile ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-display">Contatos & Mensagens</h2>
            <span className="text-[10px] text-slate-400 font-mono">
              {filteredProfiles.length} {filteredProfiles.length === 1 ? 'contato' : 'contatos'}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => setContactsTab('all')}
              className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center ${
                contactsTab === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#181826] text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos ({nonBlockedCount})
            </button>
            <button
              type="button"
              onClick={() => setContactsTab('favorites')}
              className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-0.5 ${
                contactsTab === 'favorites'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-[#181826] text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Star className={`w-3 h-3 ${contactsTab === 'favorites' ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
              <span>Favoritos ({favoriteCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setContactsTab('blocked')}
              className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-0.5 ${
                contactsTab === 'blocked'
                  ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold'
                  : 'bg-[#181826] text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
            >
              <Ban className="w-3 h-3 text-rose-400" />
              <span>Bloq ({blockedCount})</span>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
          {filteredProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <p className="text-xs">
                {contactsTab === 'favorites'
                  ? 'Nenhum contato favoritado ainda.'
                  : contactsTab === 'blocked'
                  ? 'Nenhum contato bloqueado.'
                  : 'Nenhum contato encontrado.'}
              </p>
              {contactsTab === 'favorites' && (
                <p className="text-[10px] text-slate-500">
                  Clique na estrela ao lado de um contato para marcá-lo como favorito.
                </p>
              )}
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const isSelected = p.id === activeProfile?.id;
              const isFav = favoriteCreatorIds.includes(p.id);
              const isBlocked = blockedUserIds.includes(p.id);
              const msgs = conversations[p.id] || [];
              const lastMsg = isBlocked
                ? '🚫 Contato bloqueado'
                : (msgs[msgs.length - 1]?.text || 'Deu match recente!');

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProfile(p.id)}
                  className={`flex items-center gap-2.5 p-3 hover:bg-[#181824] transition-colors cursor-pointer group ${
                    isSelected ? 'bg-[#181826] border-l-2 border-rose-500' : ''
                  } ${isBlocked ? 'opacity-65' : ''}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className={`w-11 h-11 rounded-full object-cover border ${
                        isBlocked ? 'border-rose-800/80 grayscale' : isFav ? 'border-amber-400' : 'border-slate-700'
                      }`}
                    />
                    {p.online && !isBlocked && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#12121a]" />
                    )}
                    {isBlocked && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-rose-600 border border-[#12121a] flex items-center justify-center text-white text-[8px] font-bold">
                        ✕
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                        {p.name}
                        {p.verified && <CheckCircle2 className="w-3 h-3 text-sky-400" />}
                        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                      </span>
                      {isBlocked ? (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 px-1 rounded border border-rose-900/60">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">{p.vipMedia.length} VIP</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{lastMsg}</p>
                  </div>

                  {/* Favorite Toggle Icon on Row */}
                  {onToggleFavorite && !isBlocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(p.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                        isFav
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-slate-600 hover:text-amber-400 opacity-40 group-hover:opacity-100'
                      }`}
                      title={isFav ? 'Remover dos favoritos' : 'Selecionar contato como favorito ⭐'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation Pane */}
      {activeProfile ? (
        <div className="flex-1 flex flex-col bg-[#0b0b12] min-w-0">
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-slate-800 bg-[#12121a] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectProfile('')}
                className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div
                onClick={() => onOpenProfileDetail(activeProfile)}
                className="relative cursor-pointer shrink-0"
              >
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                {activeProfile.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#12121a]" />
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{activeProfile.name}, {activeProfile.age}</span>
                  {activeProfile.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {activeProfile.online ? 'Online agora' : activeProfile.lastActive}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Favorite Button */}
              {onToggleFavorite && activeProfile && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(activeProfile.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isContactFavorite
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                  title={
                    isContactFavorite
                      ? 'Contato favoritado! Clique para remover dos favoritos'
                      : 'Selecionar contato como favorito ⭐'
                  }
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      isContactFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isContactFavorite ? 'Favorito ⭐' : 'Favoritar'}
                  </span>
                </button>
              )}

              {/* Block / Unblock Button */}
              {onToggleBlock && activeProfile && (
                <button
                  type="button"
                  onClick={() => {
                    if (isContactBlocked) {
                      onToggleBlock(activeProfile.id);
                    } else {
                      setContactToBlock(activeProfile);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isContactBlocked
                      ? 'bg-rose-950/80 text-rose-300 border-rose-600/60 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-rose-400 hover:border-rose-500/50 hover:bg-slate-700'
                  }`}
                  title={isContactBlocked ? 'Desbloquear este contato' : 'Bloquear este contato'}
                >
                  {isContactBlocked ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-rose-300" />
                      <span className="hidden sm:inline">Desbloquear</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Bloquear</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => handleSendChatTip(25)}
                disabled={isContactBlocked}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Enviar Mimo de 25 Créditos"
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mimo (25 💎)</span>
              </button>

              <button
                onClick={() => onOpenProfileDetail(activeProfile)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver Perfil & Cofre</span>
              </button>
            </div>
          </div>

          {/* Blocked Contact Warning Bar */}
          {isContactBlocked && (
            <div className="bg-rose-950/50 border-b border-rose-500/40 p-3 sm:px-4 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Contato Bloqueado:</strong> Você bloqueou este contato. Você não receberá novas mensagens ou chamadas de {activeProfile.name}.
                </span>
              </div>
              {onToggleBlock && (
                <button
                  type="button"
                  onClick={() => onToggleBlock(activeProfile.id)}
                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeMessages.map((msg) => {
              const isUser = msg.senderId === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Tip Badge */}
                  {msg.tipAmount && (
                    <div className="p-2.5 mb-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{msg.text}</span>
                    </div>
                  )}

                  {/* Standard Text Bubble */}
                  {!msg.tipAmount && msg.text && (
                    <div
                      className={`max-w-[85%] sm:max-w-md p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-br-xs shadow-md shadow-rose-950/40'
                          : 'bg-[#181826] text-slate-200 border border-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Locked / Unlocked VIP Media in Chat (Proteção Fase 1, 2 e 3) */}
                  {msg.vipMedia && (
                    <div className="mt-2 max-w-xs rounded-2xl overflow-hidden border border-amber-500/40 bg-[#161622] shadow-xl">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                        <ProtectedMediaViewer
                          media={msg.vipMedia}
                          creatorName={activeProfile?.name || 'Criador VIP'}
                          isUnlocked={Boolean(msg.vipMedia.isUnlocked && !isContactBlocked)}
                          userCredits={userCredits}
                          currentUserId={authService.getCurrentSession()?.userId || 'current_user'}
                          aspectRatio="auto"
                          className="aspect-[4/3]"
                          onUnlockRequest={() => handleUnlockInChat(msg.vipMedia!)}
                          showWatermark={true}
                        />
                        {msg.vipMedia.isUnlocked && !isContactBlocked && (
                          <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/40 pointer-events-none">
                            <Unlock className="w-3 h-3" />
                            <span>Desbloqueada</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <p className="text-xs font-bold text-white mb-2">{msg.vipMedia.title}</p>
                        {!msg.vipMedia.isUnlocked ? (
                          <button
                            onClick={() => handleUnlockInChat(msg.vipMedia!)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Desbloquear ({msg.vipMedia.priceCredits} 💎)</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Visualização protegida com marca-d’água ativa
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.createdAt}</span>
                </div>
              );
            })}

            {/* Match Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-[#181826] border border-slate-800 max-w-[120px]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] text-slate-400 ml-1">digitando...</span>
              </div>
            )}
          </div>

          {/* Quick Chat Suggestions */}
          <div className="px-4 py-2 border-t border-slate-800/60 bg-[#0e0e16] flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] text-slate-500 shrink-0">Sugestões:</span>
            {[
              'Você é muito charmosa 😍',
              'Qual seu lugar favorito na cidade?',
              'Bora tomar um vinho hoje?',
              'Suas fotos do cofre são lindas!'
            ].map((text, i) => (
              <button
                key={i}
                onClick={() => setInputText(text)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer border border-slate-700/60"
              >
                {text}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-slate-800 bg-[#12121a] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              disabled={isContactBlocked}
              placeholder={
                isContactBlocked
                  ? `Você bloqueou ${activeProfile.name}. Desbloqueie acima para voltar a conversar.`
                  : `Mensagem para ${activeProfile.name}...`
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#181826] border border-slate-800 disabled:bg-slate-900/60 disabled:cursor-not-allowed disabled:text-slate-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isContactBlocked}
              className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-md shadow-rose-950"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <p>Selecione um match para iniciar a conversa.</p>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {contactToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12121c] border border-rose-500/40 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Bloquear {contactToBlock.name}?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ao bloquear, este contato não poderá mais te enviar mensagens, não aparecerá na aba Encontros e todas as notificações deste contato serão silenciadas.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactToBlock(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onToggleBlock) {
                    onToggleBlock(contactToBlock.id);
                  }
                  setContactToBlock(null);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-rose-950 flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Bloquear</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
