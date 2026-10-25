import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Video,
  Image as ImageIcon,
  ShieldAlert,
  Ban,
  ArrowLeft,
  Sparkles,
  Check,
  CheckCheck,
  ShieldCheck,
  Lock,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Profile, UserProfileData } from '../../types';
import { calculateAiCompatibility } from '../../utils/aiMatchmaking';
import {
  matchAndMessagingService,
  PersistentMessage,
} from '../../services/matchAndMessagingService';

interface Screen12ChatProps {
  partner: Profile;
  userProfile: UserProfileData;
  currentUserId?: string;
  onBack: () => void;
  onStartVideoCall: (partner: Profile) => void;
  onBlockUser: (partner: Profile) => void;
  onReportUser: (partner: Profile) => void;
}

export const Screen12Chat: React.FC<Screen12ChatProps> = ({
  partner,
  userProfile,
  currentUserId = 'user_emilio_vip',
  onBack,
  onStartVideoCall,
  onBlockUser,
  onReportUser,
}) => {
  const [activeAccount, setActiveAccount] = useState<string>(currentUserId);
  const [messages, setMessages] = useState<PersistentMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ai = calculateAiCompatibility(userProfile, partner);

  // Carrega mensagens e inscreve para atualizações reativas reais
  const loadMessages = () => {
    const list = matchAndMessagingService.getMessages(activeAccount, partner.id);
    setMessages(list);
    matchAndMessagingService.markMessagesAsRead(activeAccount, partner.id, activeAccount);
  };

  useEffect(() => {
    loadMessages();
    const unsubscribe = matchAndMessagingService.subscribe(() => {
      loadMessages();
    });
    return () => {
      unsubscribe();
    };
  }, [activeAccount, partner.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    try {
      matchAndMessagingService.sendMessage(activeAccount, partner.id, text.trim());
      setInputText('');
      loadMessages();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar mensagem.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A fotografia deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        matchAndMessagingService.sendMessage(
          activeAccount,
          partner.id,
          '📷 [Fotografia privada compartilhada]',
          dataUrl
        );
        showToast('Fotografia enviada com sucesso com consentimento mútuo.');
        loadMessages();
      } catch (err: any) {
        showToast('Erro ao enviar fotografia.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-5rem)] flex flex-col bg-[#0b0b12] border-x border-white/10 sm:rounded-2xl overflow-hidden shadow-2xl">
      {/* Hidden File Input for Real Photo Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Toast */}
      {feedbackToast && (
        <div className="px-4 py-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between shrink-0 animate-in slide-in-from-top-1">
          <span>{feedbackToast}</span>
          <button onClick={() => setFeedbackToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="p-3.5 bg-[#10101b] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src={partner.avatar}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            {partner.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#10101b]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white truncate">{partner.name}</span>
              {partner.verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium block">
              {partner.online ? 'Online agora' : 'Visto recentemente'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onStartVideoCall(partner)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950 transition-colors cursor-pointer"
            title="Iniciar chamada de vídeo privativa"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Vídeo</span>
          </button>

          <button
            onClick={() => onReportUser(partner)}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors cursor-pointer"
            title="Denunciar esta conversa"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            onClick={() => onBlockUser(partner)}
            className="p-2 rounded-xl bg-white/5 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
            title="Bloquear usuário"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Account Verification & Audit Switcher Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Mensagens reais sem robôs • Criptografia em repouso</span>
        </div>

        {/* Switcher para teste com duas contas reais */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-slate-500 hidden sm:inline">Conta ativa:</span>
          <button
            onClick={() => {
              setActiveAccount(activeAccount === 'user_emilio_vip' ? 'user_mariana_jobs' : 'user_emilio_vip');
            }}
            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/20 flex items-center gap-1 cursor-pointer"
            title="Alternar entre contas de teste para validar a troca de mensagens"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>{activeAccount === 'user_emilio_vip' ? 'Emilio (Você)' : 'Mariana (Você)'}</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Match celebration badge inside chat */}
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Conexão Bilateral Confirmada • {ai.overallScore}% Afinidade</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs text-slate-400">Nenhuma mensagem trocada ainda.</p>
            <p className="text-[11px] text-slate-500">Envie uma saudação para iniciar a conversa com {partner.name}.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === activeAccount;
            const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-tr-none'
                      : 'bg-[#181827] text-slate-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  {m.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20">
                      <img
                        src={m.mediaUrl}
                        alt="Fotografia autorizada"
                        className="w-full max-h-56 object-cover"
                      />
                    </div>
                  )}
                  <p>{m.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                      isMe ? 'text-rose-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      m.status === 'read' ? (
                        <span title="Lida"><CheckCheck className="w-3 h-3 text-blue-200" /></span>
                      ) : (
                        <span title="Enviada"><Check className="w-3 h-3 text-rose-200" /></span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Icebreaker Suggestions */}
      {messages.length <= 2 && ai.icebreakers.length > 0 && (
        <div className="px-3 py-2 bg-[#0e0e18] border-t border-white/5 shrink-0">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Quebra-gelo sugerido pela IA:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {ai.icebreakers.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] hover:bg-amber-500/20 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Bar */}
      <div className="p-3 bg-[#10101b] border-t border-white/10 shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Compartilhar foto do dispositivo"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Conversar com ${partner.name}...`}
          className="flex-1 bg-[#181827] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-950 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
