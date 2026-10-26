import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  liveService,
  LiveSessionModel,
  LiveCenterTab,
  DataSourceMeta,
} from '../services/liveService';
import {
  Radio,
  Users,
  Search,
  Sparkles,
  Heart,
  Eye,
  Info,
  RefreshCw,
  AlertCircle,
  Play,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Flame,
  Swords,
  Mic,
  Target,
  ArrowRight,
  Filter,
  X,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import { INITIAL_PROFILES } from '../data/mockData';
import { DiscoveryLiveFilterPanel } from './DiscoveryLiveFilterPanel';
import {
  DiscoveryAndLiveFilterCriteria,
  filterLiveSessions,
  getSavedLivesFilters,
  setSavedLivesFilters,
  resetSavedLivesFilters,
  subscribeLivesFilters,
} from '../utils/discoveryAndLiveFilters';

export interface LiveCenterProps {
  /** Ação acionada para abrir a sala da live selecionada na navegação existente */
  onSelectLive?: (session: LiveSessionModel) => void;
  /** Callback para alternar aba ativa externamente se necessário */
  onTabChange?: (tab: LiveCenterTab) => void;
  /** Aba inicial */
  initialTab?: LiveCenterTab;
  /** Filtro opcional de formato vindo da barra superior de LiveStreamView */
  formatFilter?: 'all' | LiveSessionModel['format'];
  /** Lista opcional de criadores bloqueados */
  blockedUserIds?: string[];
  /** Classes CSS adicionais */
  className?: string;
}

export const LiveCenter: React.FC<LiveCenterProps> = ({
  onSelectLive,
  onTabChange,
  initialTab = 'ao_vivo',
  formatFilter = 'all',
  blockedUserIds = [],
  className = '',
}) => {
  // Estado das abas
  const [activeTab, setActiveTab] = useState<LiveCenterTab>(initialTab);

  // Termo de busca instantânea
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sessões reativas do liveService
  const [sessions, setSessions] = useState<LiveSessionModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Criadores seguidos
  const [followingIds, setFollowingIds] = useState<string[]>(() =>
    liveService.getFollowingCreatorIds()
  );

  // Estado sincronizado dos filtros de Lives preservado durante a navegação
  const [filterCriteria, setFilterCriteria] = useState<DiscoveryAndLiveFilterCriteria>(() =>
    getSavedLivesFilters()
  );

  useEffect(() => {
    return subscribeLivesFilters((updated) => {
      setFilterCriteria(updated);
    });
  }, []);

  // Mapa rápido de perfis para exibir cidade/idade pública nos cartões
  const creatorProfilesMap = useMemo(() => {
    const map = new Map<string, (typeof INITIAL_PROFILES)[number]>();
    for (const p of INITIAL_PROFILES) {
      map.set(p.id.toLowerCase(), p);
    }
    return map;
  }, []);

  // Metadados de proveniência de dados (Segurança e isolamento DEMO)
  const meta: DataSourceMeta = useMemo(() => liveService.getDataSourceMeta(), []);

  // Assinatura e cancelamento reativo no liveService
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Carrega estado inicial
      const initial = liveService.getLiveSessions();
      setSessions(initial);
      setIsLoading(false);
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar as lives disponíveis.');
      setIsLoading(false);
    }

    // Assina atualizações do serviço
    const unsubscribe = liveService.subscribe((updatedSessions) => {
      try {
        setSessions(updatedSessions);
        setFollowingIds(liveService.getFollowingCreatorIds());
      } catch (err: any) {
        setLoadError(err?.message || 'Falha ao sincronizar dados da central.');
      }
    });

    // Desmontagem: cancela assinatura para evitar vazamentos de memória
    return () => {
      unsubscribe();
    };
  }, []);

  // Notifica mudança de aba
  const handleTabClick = (tab: LiveCenterTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Alternar seguir criador
  const handleToggleFollow = useCallback((e: React.MouseEvent, creatorId: string) => {
    e.stopPropagation();
    liveService.toggleFollowCreator(creatorId);
    setFollowingIds(liveService.getFollowingCreatorIds());
  }, []);

  // Abrir sala de live
  const handleCardClick = (session: LiveSessionModel) => {
    if (onSelectLive) {
      onSelectLive(session);
    }
  };

  const handleApplyFilters = (nextCriteria: DiscoveryAndLiveFilterCriteria) => {
    setSavedLivesFilters(nextCriteria);
    setFilterCriteria(nextCriteria);
  };

  const handleClearFilters = () => {
    const reset = resetSavedLivesFilters();
    setFilterCriteria(reset);
    if (searchQuery) {
      setSearchQuery('');
    }
  };

  // Filtragem dos dados conforme a aba ativa + filtros complementares (Sexo, Orientação, Idade, Localização)
  const { tabSessions, isFollowingFallback } = useMemo(() => {
    let result: LiveSessionModel[] = [];
    let isFallback = false;

    const formatFiltered =
      formatFilter && formatFilter !== 'all'
        ? sessions.filter((s) => s.format === formatFilter)
        : sessions;

    switch (activeTab) {
      case 'ao_vivo':
        result = formatFiltered.filter((s) => s.status === 'active');
        break;

      case 'seguindo': {
        const matches = formatFiltered.filter(
          (s) => s.status === 'active' && followingIds.includes(s.hostCreatorId)
        );
        if (matches.length > 0) {
          result = matches;
        } else {
          // Se o usuário ainda não segue ninguém com live ativa, apresenta seleção DEMO identificada
          result = formatFiltered.filter((s) => s.status === 'active').slice(0, 2);
          isFallback = true;
        }
        break;
      }

      case 'recomendadas':
        result = [...formatFiltered]
          .filter((s) => s.status === 'active')
          .sort((a, b) => {
            const pA = a.format === 'battle' ? 3 : a.format === 'challenge' ? 2 : 1;
            const pB = b.format === 'battle' ? 3 : b.format === 'challenge' ? 2 : 1;
            if (pB !== pA) return pB - pA;
            return (b.viewerCount || 0) - (a.viewerCount || 0);
          });
        break;

      case 'buscar': {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
          result = formatFiltered.filter((s) => s.status === 'active');
        } else {
          result = formatFiltered.filter((s) => {
            const inTitle = s.title.toLowerCase().includes(q);
            const inCreator = s.hostCreatorName.toLowerCase().includes(q);
            const inCategory = s.category.toLowerCase().includes(q);
            const inTags =
              Array.isArray(s.tags) && s.tags.some((t) => t.toLowerCase().includes(q));
            return inTitle || inCreator || inCategory || inTags;
          });
        }
        break;
      }
    }

    return { tabSessions: result, isFollowingFallback: isFallback };
  }, [sessions, activeTab, followingIds, searchQuery, formatFilter]);

  const filterResult = useMemo(
    () => filterLiveSessions(tabSessions, filterCriteria, INITIAL_PROFILES, blockedUserIds),
    [tabSessions, filterCriteria, blockedUserIds]
  );

  const displayedSessions = filterResult.filteredSessions;

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100 ${className}`}
      data-testid="live-center"
    >
      {/* ======================================================== */}
      {/* 1. CABEÇALHO FUTURISTA JOBS LIVE                          */}
      {/* ======================================================== */}
      <header className="mb-6 border-b border-cyan-500/20 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-violet-600/20 to-transparent border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-950/40">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                  JOBS LIVE
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Central de Descoberta de Lives e Transmissões em Tempo Real
                </p>
              </div>
            </div>
          </div>

          {/* Indicador Explícito de Modo Demonstração */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-inner"
              title="Ambiente de demonstração com espectadores e transmissões simuladas. Nenhuma chamada de streaming real ou transação financeira é executada nesta central."
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="tracking-wide uppercase font-bold text-[11px]">
                {meta.dataSourceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer de isolamento seguro e transparência */}
        <div className="mt-3 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            {meta.disclaimer} Todos os números de audiência possuem identificação explícita de simulação (DEMO).
          </span>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. NAVEGAÇÃO POR ABAS FUNCIONAIS (4 ABAS)                */}
      {/* ======================================================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md overflow-x-auto scrollbar-none">
          {/* Aba 1: Ao vivo */}
          <button
            type="button"
            onClick={() => handleTabClick('ao_vivo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[44px] ${
              activeTab === 'ao_vivo'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30 border border-cyan-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400" />
            <span>Ao vivo</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-black/30 font-mono">
              {sessions.filter((s) => s.status === 'active').length}
            </span>
          </button>

          {/* Aba 2: Seguindo */}
          <button
            type="button"
            onClick={() => handleTabClick('seguindo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[44px] ${
              activeTab === 'seguindo'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-900/30 border border-violet-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Heart className="w-4 h-4 text-violet-300" />
            <span>Seguindo</span>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-black/30 font-mono">
              {followingIds.length}
            </span>
          </button>

          {/* Aba 3: Recomendadas */}
          <button
            type="button"
            onClick={() => handleTabClick('recomendadas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[44px] ${
              activeTab === 'recomendadas'
                ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-lg shadow-cyan-900/30 border border-cyan-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Recomendadas</span>
          </button>

          {/* Aba 4: Buscar */}
          <button
            type="button"
            onClick={() => handleTabClick('buscar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[44px] ${
              activeTab === 'buscar'
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-cyan-300 shadow-lg shadow-slate-900/40 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2.5 PAINEL DE FILTROS COMPLEMENTARES (LIVES E CRIADORES) */}
      {/* ======================================================== */}
      <div className="mb-6">
        <DiscoveryLiveFilterPanel
          context="lives"
          appliedCriteria={filterCriteria}
          appliedChips={filterResult.appliedChips}
          resultsCount={displayedSessions.length}
          totalAvailableCount={filterResult.totalAvailableBeforeFilter}
          dataLimitationsNotice={filterResult.dataLimitationsNotice}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* ======================================================== */}
      {/* 3. CAMPO DE PESQUISA (QUANDO NA ABA BUSCAR)              */}
      {/* ======================================================== */}
      {activeTab === 'buscar' && (
        <div className="mb-6 animate-fadeIn">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, criador ou categoria (ex: Batalha, Valentina, Striptease)..."
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Filtragem instantânea em tempo real</span>
            {searchQuery && (
              <span>
                {displayedSessions.length}{' '}
                {displayedSessions.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alertas informativos de abas específicas */}
      {activeTab === 'seguindo' && isFollowingFallback && (
        <div className="mb-5 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-violet-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-violet-400 shrink-0" />
          <span>
            Você ainda não segue criadores com transmissão aberta no momento. Exibindo sugestões em{' '}
            <strong>MODO DEMONSTRAÇÃO</strong>. Use o botão &quot;Seguir&quot; nos cartões para personalizar sua lista.
          </span>
        </div>
      )}

      {activeTab === 'recomendadas' && (
        <div className="mb-5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Recomendações baseadas na popularidade de categorias e formatos ativos (Batalhas, Palcos e Metas). Dados simulados de demonstração.
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ESTADOS: CARREGAMENTO, ERRO, VAZIO OU GRADE DE CARDS   */}
      {/* ======================================================== */}
      {isLoading ? (
        // Estado de Carregamento
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 animate-pulse space-y-3"
            >
              <div className="h-48 rounded-xl bg-slate-800/80" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-800 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        // Estado de Erro
        <div className="rounded-2xl bg-rose-950/30 border border-rose-500/40 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Erro ao Carregar Lives</h3>
          <p className="text-sm text-slate-300 mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              setSessions(liveService.getLiveSessions());
              setIsLoading(false);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      ) : displayedSessions.length === 0 ? (
        // Estado Vazio / Sem Resultados
        <div
          className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-10 text-center max-w-md mx-auto"
          data-testid="lives-empty-filter-state"
        >
          <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            {filterResult.isAnyFilterActive
              ? 'Nenhuma Transmissão ou Criador Encontrado'
              : activeTab === 'buscar'
              ? 'Nenhuma Live Encontrada'
              : 'Nenhuma Live Ativa Nesta Aba'}
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            {filterResult.isAnyFilterActive
              ? 'Não há transmissões ao vivo que atendam simultaneamente aos filtros selecionados (sexo, orientação sexual, idade ou localização). Limpe ou amplie os filtros para visualizar todas as salas.'
              : activeTab === 'buscar'
              ? `Nenhum resultado correspondente a "${searchQuery}". Tente pesquisar por outro termo ou categoria.`
              : 'Não há sessões ativas nesta categoria no momento.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {filterResult.isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                data-testid="lives-empty-clear-filters-btn"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-cyan-950/40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
            {activeTab === 'buscar' && searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2.5 rounded-xl bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/50 text-xs font-bold transition-all cursor-pointer"
              >
                Limpar Busca
              </button>
            )}
          </div>
        </div>
      ) : (
        // Grade de Cartões de Lives (Mobile First: 1 col -> Tablet: 2 cols -> Desktop: 3 cols)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSessions.map((session) => {
            const isFollowing = followingIds.includes(session.hostCreatorId);
            const creatorProfile = creatorProfilesMap.get(session.hostCreatorId.toLowerCase());

            // Formatação do formato de transmissão
            const formatConfig = {
              battle: {
                label: 'Batalha',
                icon: Swords,
                color: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
              },
              interactive_stage: {
                label: 'Palco Interativo',
                icon: Mic,
                color: 'text-violet-400 border-violet-500/30 bg-violet-950/40',
              },
              challenge: {
                label: 'Meta Coletiva',
                icon: Target,
                color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
              },
              individual: {
                label: 'Show VIP',
                icon: Flame,
                color: 'text-rose-400 border-rose-500/30 bg-rose-950/40',
              },
            }[session.format] || {
              label: 'Live',
              icon: Radio,
              color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
            };

            const FormatIcon = formatConfig.icon;

            return (
              <article
                key={session.id}
                onClick={() => handleCardClick(session)}
                className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/20 hover:border-cyan-400/60 p-4 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/30 flex flex-col justify-between cursor-pointer focus-within:ring-2 focus-within:ring-cyan-400"
              >
                <div>
                  {/* Topo do Card: Mídia/Thumbnail com Badges */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 mb-3">
                    <img
                      src={session.streamMediaUrl || session.hostCreatorAvatar}
                      alt={session.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback seguro anti-broken image
                        (e.target as HTMLImageElement).src = session.hostCreatorAvatar;
                      }}
                    />

                    {/* Gradiente Scrim */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                    {/* Badges Superiores */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {/* Indicador de Status "AO VIVO" */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/95 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>AO VIVO</span>
                      </div>

                      {/* Selo Explícito "DEMO" */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[10px] font-extrabold uppercase shadow-md">
                        <span>DEMO</span>
                      </div>
                    </div>

                    {/* Badges Inferiores da Thumbnail */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
                      {/* Formato */}
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md ${formatConfig.color}`}
                      >
                        <FormatIcon className="w-3 h-3" />
                        <span>{formatConfig.label}</span>
                      </div>

                      {/* Contagem de Espectadores com Identificação Simulada */}
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-slate-200 text-[11px] font-mono tabular-nums"
                        title="Audiência simulada para fins de demonstração (DEMO)"
                      >
                        <Users className="w-3 h-3 text-cyan-400" />
                        <span>{session.viewerCount?.toLocaleString('pt-BR') || 0}</span>
                        <span className="text-[9px] text-amber-300 font-sans font-bold">simulados</span>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Criador */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={session.hostCreatorAvatar}
                        alt={session.hostCreatorName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-cyan-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {session.hostCreatorName}
                          {creatorProfile && !creatorProfile.hideAge && creatorProfile.age ? (
                            <span className="ml-1 text-[10px] font-normal text-slate-400">
                              • {creatorProfile.age}a
                            </span>
                          ) : null}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <span>{session.category || 'Transmissão Ao Vivo'}</span>
                          {creatorProfile && !creatorProfile.hideCity && creatorProfile.city ? (
                            <span className="inline-flex items-center gap-0.5 text-cyan-300/90">
                              • <MapPin className="w-2.5 h-2.5 inline" /> {creatorProfile.city}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    {/* Botão Seguir / Seguindo (Navegação de Relacionamento) */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, session.hostCreatorId)}
                      className={`min-h-[40px] px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
                        isFollowing
                          ? 'bg-violet-950/60 text-violet-300 border-violet-500/40 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-violet-600 hover:text-white hover:border-violet-400'
                      }`}
                      title={isFollowing ? 'Deixar de seguir criador' : 'Seguir criador'}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3 text-violet-400" />
                          <span>Seguindo</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Seguir</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Título da Transmissão */}
                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 mb-3 group-hover:text-cyan-300 transition-colors">
                    {session.title}
                  </h3>
                </div>

                {/* Rodapé do Card: Ação para Abrir a Sala da Live */}
                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono text-[10px] text-slate-300">
                      {session.tags?.[0] || 'Interativo'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(session);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-950/40 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer min-h-[40px]"
                  >
                    <span>Abrir Sala</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
