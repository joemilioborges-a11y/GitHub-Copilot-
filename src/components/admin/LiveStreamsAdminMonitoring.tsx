import React, { useState, useMemo } from 'react';
import {
  Radio,
  Users,
  Gift,
  Flame,
  Swords,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Lock,
  Unlock,
  Ban,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  liveStreamService,
  LiveSessionModel,
  LiveFormat,
} from '../../services/liveStreamService';

export const LiveStreamsAdminMonitoring: React.FC = () => {
  const [sessions, setSessions] = useState<LiveSessionModel[]>(() => liveStreamService.getLiveSessions());
  const [selectedFormat, setSelectedFormat] = useState<LiveFormat | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<LiveSessionModel | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const reload = () => {
    setSessions(liveStreamService.getLiveSessions());
  };

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleForceEndLive = async (sessionId: string) => {
    try {
      await liveStreamService.endLiveSession(sessionId);
      reload();
      showToast('Transmissão encerrada administrativamente com sucesso.');
      setSelectedSession(null);
    } catch (e: any) {
      //
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchFormat = selectedFormat === 'all' || s.format === selectedFormat;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchSearch =
        !search.trim() ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.hostCreatorName.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      return matchFormat && matchStatus && matchSearch;
    });
  }, [sessions, selectedFormat, statusFilter, search]);

  const stats = useMemo(() => {
    let totalLive = 0;
    let totalViewers = 0;
    let totalCredits = 0;
    let totalCreatorBrl = 0;
    let totalPlatformBrl = 0;

    for (const s of sessions) {
      if (s.status === 'active') {
        totalLive++;
        totalViewers += s.viewerCount;
      }
      totalCredits += s.totalGiftsReceivedCredits;
      totalCreatorBrl += s.creatorEarningsBrl;
      totalPlatformBrl += s.platformCommissionBrl;
    }

    return {
      totalLive,
      totalViewers,
      totalCredits,
      totalCreatorBrl: Number(totalCreatorBrl.toFixed(2)),
      totalPlatformBrl: Number(totalPlatformBrl.toFixed(2)),
    };
  }, [sessions]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/80 text-emerald-200 text-xs font-semibold">
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12121e] border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>Ao Vivo</span>
            </span>
            <h3 className="text-base font-extrabold text-white">Central de Monitoramento de Lives & Batalhas</h3>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhamento em tempo real de transmissões individuais, batalhas, salas interativas e metas coletivas.
          </p>
        </div>

        <button
          onClick={reload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Sessões</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Lives Ativas</span>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            {stats.totalLive}
          </div>
          <span className="text-[10px] text-slate-500">Transmissões no ar</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Espectadores Totais</span>
          <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-rose-400" />
            {stats.totalViewers.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500">Público simultâneo</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Presentes Enviados</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            {stats.totalCredits} 💎
          </div>
          <span className="text-[10px] text-slate-500">Créditos em mimos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">70% Criadores</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            R$ {stats.totalCreatorBrl.toFixed(2).replace('.', ',')}
          </div>
          <span className="text-[10px] text-slate-500">Repasse líquido em BRL</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f0f18] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">30% Comissão JOBS</span>
          <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
            R$ {stats.totalPlatformBrl.toFixed(2).replace('.', ',')}
          </div>
          <span className="text-[10px] text-slate-500">Receita da plataforma</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0e0e18] border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por criador ou título da live..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141422] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
            />
          </div>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as any)}
            className="bg-[#141422] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="all">Todos os Formatos</option>
            <option value="individual">Lives Individuais</option>
            <option value="battle">Batalhas de Criadores</option>
            <option value="interactive_stage">Salas Interativas (Palco)</option>
            <option value="challenge">Desafios & Metas</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#141422] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ao Vivo Agora</option>
            <option value="completed">Encerradas</option>
          </select>
        </div>

        <div className="text-slate-400 text-[11px]">
          {filteredSessions.length} {filteredSessions.length === 1 ? 'sessão listada' : 'sessões listadas'}
        </div>
      </div>

      {/* Grid of Live Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map((session) => {
          const isLive = session.status === 'active';
          return (
            <div
              key={session.id}
              className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isLive ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        AO VIVO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                        ENCERRADA
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181828] text-slate-300 border border-slate-700">
                      {session.format === 'battle'
                        ? '⚔️ Batalha'
                        : session.format === 'interactive_stage'
                        ? '🎙️ Palco'
                        : session.format === 'challenge'
                        ? '🎯 Meta'
                        : '👤 Individual'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                    <Users className="w-3.5 h-3.5 text-rose-400" />
                    <span>{session.viewerCount.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <img
                    src={session.hostCreatorAvatar}
                    alt={session.hostCreatorName}
                    className="w-9 h-9 rounded-full object-cover border border-rose-500"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{session.hostCreatorName}</h4>
                    <span className="text-[10px] text-slate-400">{session.genderLabel} · {session.orientationLabel}</span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed">
                  {session.title}
                </h3>

                {/* Battle mini banner */}
                {session.format === 'battle' && session.battleState && (
                  <div className="p-2 rounded-xl bg-black/60 border border-amber-500/30 text-[11px] space-y-1">
                    <div className="flex justify-between font-bold text-amber-300">
                      <span>{session.battleState.creator1.name}: {session.battleState.creator1.score}</span>
                      <span>vs</span>
                      <span>{session.battleState.creator2.name}: {session.battleState.creator2.score}</span>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-slate-500 block">Presentes</span>
                    <strong className="text-amber-400">{session.totalGiftsReceivedCredits} 💎</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">70% Criador</span>
                    <strong className="text-emerald-400">R$ {session.creatorEarningsBrl.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">30% JOBS</span>
                    <strong className="text-blue-400">R$ {session.platformCommissionBrl.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  ID: {session.id}
                </span>

                {isLive && (
                  <button
                    onClick={() => handleForceEndLive(session.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold border border-rose-800 transition-colors cursor-pointer"
                  >
                    Encerrar Forçado
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
