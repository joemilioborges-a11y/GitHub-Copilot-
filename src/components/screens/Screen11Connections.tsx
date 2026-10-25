import React, { useState } from 'react';
import {
  Heart,
  Search,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Video,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Profile } from '../../types';

interface Screen11ConnectionsProps {
  connections: Profile[];
  onOpenChat: (profile: Profile) => void;
  onExploreMore: () => void;
}

export const Screen11Connections: React.FC<Screen11ConnectionsProps> = ({
  connections,
  onOpenChat,
  onExploreMore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'online'>('all');

  const filtered = connections.filter((p) => {
    const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInterest = p.interests?.some((i) =>
      i.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchName && !matchInterest) return false;

    if (filterType === 'online') return p.online;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            <h1 className="text-2xl font-display font-extrabold text-white">
              Suas Conexões no JOBS
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Pessoas que demonstraram interesse mútuo e estão conectadas com você.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {connections.length} Conexões
        </span>
      </div>

      {/* New Matches Horizontal Carousel */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Novas Conexões Recentes</span>
        </h2>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {connections.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenChat(p)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-amber-400 to-rose-600 group-hover:scale-105 transition-transform">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-full h-full rounded-full object-cover border-2 border-[#09090d]"
                  />
                </div>
                {p.online && (
                  <span className="absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090d]" />
                )}
                <span className="absolute -top-1 -right-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-rose-600 text-white shadow">
                  Novo
                </span>
              </div>
              <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate max-w-[70px]">
                {p.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou interesse em comum..."
            className="w-full bg-[#12121e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex gap-1.5 bg-[#12121e] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({connections.length})
          </button>
          <button
            onClick={() => setFilterType('online')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'online' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Online Agora
          </button>
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-[#10101a] rounded-2xl border border-white/5 p-6 space-y-3">
            <Heart className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">Nenhuma conexão encontrada com esses termos.</p>
            <p className="text-xs text-slate-400">Continue explorando a descoberta para encontrar novas pessoas.</p>
            <button
              onClick={onExploreMore}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-bold"
            >
              Explorar Descoberta
            </button>
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => onOpenChat(p)}
              className="p-3.5 rounded-2xl bg-[#11111c] border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                  />
                  {p.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#11111c]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors truncate">
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">, {p.age}</span>
                    {p.verified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {p.interests?.[0] ? `Interesse em ${p.interests[0]}` : p.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChat(p);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Conversar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
