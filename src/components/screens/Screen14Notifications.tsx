import React, { useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  CheckCheck,
  Trash2,
  Filter,
} from 'lucide-react';
import { PushNotification } from '../../types';

interface Screen14NotificationsProps {
  notifications: PushNotification[];
  onSelectNotification: (notif: PushNotification) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const Screen14Notifications: React.FC<Screen14NotificationsProps> = ({
  notifications,
  onSelectNotification,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [filter, setFilter] = useState<'all' | 'matches' | 'messages' | 'system'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'matches') return n.type === 'vip_unlock' || n.title.includes('Match') || n.title.includes('Conexão');
    if (filter === 'messages') return n.type === 'new_message';
    if (filter === 'system') return n.type === 'system' || n.title.includes('Segurança');
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-rose-500" />
            <h1 className="text-2xl font-display font-extrabold text-white">
              Notificações
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhe matches, mensagens e alertas de segurança em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Marcar todas como lidas"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Marcar Lidas</span>
          </button>
          <button
            onClick={onClearAll}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            filter === 'all'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('messages')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            filter === 'messages'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Mensagens
        </button>
        <button
          onClick={() => setFilter('matches')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            filter === 'matches'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Matches & Curtidas
        </button>
        <button
          onClick={() => setFilter('system')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            filter === 'system'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Segurança
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#11111c] rounded-2xl border border-white/5 p-6 space-y-2">
            <Bell className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">Nenhuma notificação no momento.</p>
            <p className="text-xs text-slate-400">Você será avisado assim que alguém interagir com seu perfil.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectNotification(item)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                item.read
                  ? 'bg-[#10101a] border-white/5 text-slate-400'
                  : 'bg-[#151524] border-rose-500/30 text-white shadow-md'
              }`}
            >
              <div className="relative shrink-0 mt-0.5">
                {item.creatorAvatar ? (
                  <img
                    src={item.creatorAvatar}
                    alt={item.creatorName || 'JOBS'}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                {!item.read && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-xs text-white truncate">{item.title}</h3>
                  <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {item.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
