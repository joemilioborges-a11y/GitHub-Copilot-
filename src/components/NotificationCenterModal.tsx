import React, { useState } from 'react';
import { PushNotification } from '../types';
import {
  X,
  Bell,
  MessageCircle,
  Radio,
  Star,
  Check,
  Trash2,
  Settings,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotification[];
  onSelectNotification: (notif: PushNotification) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onTriggerSimulatedPush: (type: 'message' | 'live' | 'favorite') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoSimulateEnabled: boolean;
  onToggleAutoSimulate: () => void;
  onlyFavoritesEnabled: boolean;
  onToggleOnlyFavorites: () => void;
  favoriteCreatorIds: string[];
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
  onMarkAllAsRead,
  onClearAll,
  onTriggerSimulatedPush,
  soundEnabled,
  onToggleSound,
  autoSimulateEnabled,
  onToggleAutoSimulate,
  onlyFavoritesEnabled,
  onToggleOnlyFavorites,
  favoriteCreatorIds,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'messages' | 'lives' | 'favorites'>('all');
  const [showSettings, setShowSettings] = useState(false);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'messages') return n.type === 'new_message';
    if (activeTab === 'lives') return n.type === 'live_stream_started';
    if (activeTab === 'favorites') {
      return n.isFavoriteCreator || (n.creatorId && favoriteCreatorIds.includes(n.creatorId));
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#11111a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0c0c14] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Bell className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-display">
                  Central de Notificações Push
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white font-mono animate-pulse">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Avisos instantâneos de novas mensagens e criadores ao vivo (+18)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Configurações de Notificação"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Drawer / Panel */}
        {showSettings && (
          <div className="p-4 bg-[#141424] border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Preferências de Alerta & Push
              </span>
              <span className="text-[10px] text-slate-400">Salvo no navegador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  <div>
                    <span className="font-semibold block text-white">Chime Sonoro</span>
                    <span className="text-[10px] text-slate-400">
                      {soundEnabled ? 'Áudio ativado' : 'Silenciado'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono">
                  {soundEnabled ? 'LIGADO' : 'DESL'}
                </span>
              </button>

              {/* Periodic Auto Simulation Toggle */}
              <button
                type="button"
                onClick={onToggleAutoSimulate}
                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer ${
                  autoSimulateEnabled
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${autoSimulateEnabled ? 'text-rose-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="font-semibold block text-white">Simulação Contínua</span>
                    <span className="text-[10px] text-slate-400">
                      {autoSimulateEnabled ? 'Alertas a cada 40s' : 'Desativada'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono">
                  {autoSimulateEnabled ? 'ATIVO' : 'PAUSADO'}
                </span>
              </button>

              {/* Only Favorites Toggle */}
              <button
                type="button"
                onClick={onToggleOnlyFavorites}
                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer sm:col-span-2 ${
                  onlyFavoritesEnabled
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${onlyFavoritesEnabled ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                  <div>
                    <span className="font-semibold block text-white">Filtrar Apenas Criadores Favoritos</span>
                    <span className="text-[10px] text-slate-400">
                      {onlyFavoritesEnabled
                        ? `Apenas alertas de ${favoriteCreatorIds.length} criadores favoritados`
                        : 'Receber alertas de todos os criadores populares e favoritos'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono">
                  {onlyFavoritesEnabled ? 'FILTRADO' : 'TODOS'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Simulator Bar */}
        <div className="p-3 bg-[#0e0e18] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-slate-300">Testar Push Agora:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTriggerSimulatedPush('message')}
              className="px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              <span>+ Mensagem VIP</span>
            </button>

            <button
              type="button"
              onClick={() => onTriggerSimulatedPush('live')}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Radio className="w-3 h-3 text-rose-400" />
              <span>+ Live 18+</span>
            </button>

            <button
              type="button"
              onClick={() => onTriggerSimulatedPush('favorite')}
              className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>+ Favorito</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="p-3 bg-[#10101b] border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'messages'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>Mensagens</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lives')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'lives'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Lives Ao Vivo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'favorites'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Favoritos</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                title="Marcar todas como lidas"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Lidas</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                title="Limpar histórico de notificações"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2.5 flex-1 max-h-[58vh]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-xs">Nenhuma notificação encontrada nesta aba.</p>
              <button
                type="button"
                onClick={() => onTriggerSimulatedPush('message')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerar Notificação de Teste</span>
              </button>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isLive = n.type === 'live_stream_started';
              const isMsg = n.type === 'new_message';

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onSelectNotification(n);
                    onClose();
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group ${
                    !n.read
                      ? isLive
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                        : 'bg-sky-950/20 border-sky-500/40 hover:border-sky-400'
                      : 'bg-[#0f0f18] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Creator Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={n.creatorAvatar || '/src/assets/images/profile_valentina.jpg'}
                      alt={n.creatorName || 'Avatar'}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                        isLive ? 'bg-rose-600' : 'bg-sky-500'
                      }`}
                    >
                      {isLive ? <Radio className="w-2 h-2" /> : <MessageCircle className="w-2 h-2" />}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {n.creatorName || n.title}
                        </span>
                        {n.isFavoriteCreator && (
                          <span className="text-[10px] text-amber-300 flex items-center gap-0.5 font-bold">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            Favorito
                          </span>
                        )}
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {n.timestamp}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {n.body}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        {isLive ? (
                          <span className="text-rose-400 flex items-center gap-1">
                            <Radio className="w-3 h-3" /> Transmissão Ao Vivo (+18)
                          </span>
                        ) : (
                          <span className="text-sky-400 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> Mensagem Privada VIP
                          </span>
                        )}
                      </span>

                      <span className="text-[10px] font-bold text-slate-300 group-hover:text-white flex items-center gap-0.5">
                        <span>{isLive ? 'Assistir' : 'Abrir conversa'}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
