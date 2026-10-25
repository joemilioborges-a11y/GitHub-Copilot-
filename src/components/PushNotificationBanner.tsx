import React, { useEffect, useState } from 'react';
import { PushNotification } from '../types';
import { X, MessageCircle, Radio, Sparkles, Star, ChevronRight, Volume2, VolumeX } from 'lucide-react';

interface PushNotificationBannerProps {
  notification: PushNotification | null;
  onDismiss: () => void;
  onAction: (notification: PushNotification) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFavorite: boolean;
  onToggleFavorite?: (creatorId: string) => void;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  notification,
  onDismiss,
  onAction,
  soundEnabled,
  onToggleSound,
  isFavorite,
  onToggleFavorite,
}) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 7500; // 7.5 seconds
    const intervalTime = 50;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isHovered) {
        setProgress((prev) => {
          const next = prev - decrement;
          return next > 0 ? next : 0;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification, isHovered]);

  // Safely trigger onDismiss outside of render/updater cycle
  useEffect(() => {
    if (progress <= 0 && notification) {
      const dismissTimeout = setTimeout(() => {
        onDismiss();
      }, 0);
      return () => clearTimeout(dismissTimeout);
    }
  }, [progress, notification, onDismiss]);

  if (!notification) return null;

  const isLive = notification.type === 'live_stream_started';
  const isMessage = notification.type === 'new_message';

  return (
    <div className="fixed top-3 sm:top-5 right-2 sm:right-5 z-[100] max-w-sm sm:max-w-md w-[calc(100vw-1rem)] animate-in slide-in-from-top-6 fade-in duration-300">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl backdrop-blur-xl transition-all cursor-pointer ${
          notification.isFavoriteCreator || isFavorite
            ? 'bg-[#150f24]/95 border-amber-500/60 shadow-amber-950/40'
            : isLive
            ? 'bg-[#1a0f18]/95 border-rose-500/60 shadow-rose-950/40'
            : 'bg-[#101322]/95 border-sky-500/50 shadow-sky-950/30'
        }`}
      >
        {/* Auto-dismiss progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={`h-full transition-all linear duration-75 ${
              notification.isFavoriteCreator || isFavorite
                ? 'bg-amber-400'
                : isLive
                ? 'bg-rose-500'
                : 'bg-sky-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <span>Jhobs VIP Push</span>
                {notification.isFavoriteCreator || isFavorite ? (
                  <span className="text-amber-300 font-bold flex items-center gap-0.5">
                    • <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Favorito
                  </span>
                ) : null}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400 mr-1">{notification.timestamp}</span>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSound();
                }}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title={soundEnabled ? 'Som ativado' : 'Som desativado'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-slate-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Dispensar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div
            onClick={() => onAction(notification)}
            className="flex items-start gap-3 group"
          >
            {/* Avatar with Status badge */}
            <div className="relative shrink-0">
              <img
                src={notification.creatorAvatar || '/src/assets/images/profile_valentina.jpg'}
                alt={notification.creatorName || 'Criador'}
                className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-md group-hover:scale-105 transition-transform"
              />
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white border-2 border-[#12121e] text-[10px] shadow ${
                  isLive ? 'bg-rose-600' : 'bg-sky-500'
                }`}
              >
                {isLive ? <Radio className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
              </div>
            </div>

            {/* Texts */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isLive && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white tracking-wider flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Ao Vivo (+18)
                  </span>
                )}
                {isMessage && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-600 text-white tracking-wider">
                    Mensagem VIP
                  </span>
                )}
                {notification.creatorName && (
                  <span className="text-xs font-bold text-white truncate font-display">
                    {notification.creatorName}
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-100 mt-1 truncate group-hover:text-amber-300 transition-colors">
                {notification.title}
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                {notification.body}
              </p>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10">
            {notification.creatorId && onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(notification.creatorId!);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                  isFavorite
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
                title="Favoritar este criador para receber avisos de lives"
              >
                <Star className={`w-3 h-3 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{isFavorite ? 'Favorito' : 'Favoritar'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAction(notification)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                isLive
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-950/60'
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-950/60'
              }`}
            >
              <span>{isLive ? 'Assistir Transmissão Ao Vivo' : 'Abrir e Responder Mensagem'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
