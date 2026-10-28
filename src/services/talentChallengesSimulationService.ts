/**
 * JOBS — SERVIÇO CENTRALIZADO DE SIMULAÇÃO DA SEÇÃO "SEU TALENTO VALE MUITO!"
 *
 * Diretrizes de Engenharia e Segurança Contábil:
 * 1. Dados 100% determinísticos e centralizados (nunca utiliza Math.random() por renderização).
 * 2. Isolamento absoluto do livro-razão financeiro (ledgerService):
 *    - Pontos simulados (Pts/XP) de desafios NÃO representam saldo real em reais (R$)
 *      nem créditos virtuais consumíveis (💎).
 *    - Nenhuma ação deste módulo grava transações no ledgerService ou altera saldos financeiros.
 * 3. Cálculos matemáticos seguros:
 *    - Preserva os valores originais de progresso (currentValue e targetValue).
 *    - Limita visualmente a barra de progresso entre 0% e 100% (visualBarPercent),
 *      mesmo quando o progresso ultrapassa 100% da meta.
 */

import { runtimeEnvironmentService, RuntimeEnvironmentMode } from './runtimeEnvironmentService';
import { exclusiveContentAndInterestService } from './exclusiveContentAndInterestService';
import { matchAndMessagingService } from './matchAndMessagingService';
import { liveStreamService } from './liveStreamService';
import {
  TalentProgressFirestorePayload,
  syncTalentProgressToFirestore,
  auth,
} from '../firebase';

export type TalentParticipantRole = 'produtor_conteudo' | 'colaborador';

export type TalentChallengeStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

export type TalentActionTarget =
  | 'creator_studio'
  | 'discover_connections'
  | 'live_center'
  | 'interactive_challenges'
  | 'referral_network';

export interface TalentProgressMetrics {
  /** Valor numérico original preservado (ex.: 2, 5, 7) */
  currentValue: number;
  /** Meta numérica original preservada (ex.: 3, 5, 2) */
  targetValue: number;
  /** Rótulo legível (ex.: "2 de 3") */
  formattedCounter: string;
  /** Percentual matemático real arredondado (pode ser > 100 se currentValue > targetValue) */
  rawPercent: number;
  /** Percentual travado entre 0 e 100 exclusivamente para a largura visual da barra */
  visualBarPercent: number;
  /** Indica se o valor ultrapassou a meta original */
  isOverTarget: boolean;
  /** Status determinístico coerente com currentValue e targetValue */
  status: TalentChallengeStatus;
}

export interface SimulatedTalentChallengeSeed {
  id:
    | 'criador_em_acao'
    | 'conexao_ativa'
    | 'ao_vivo_no_jobs'
    | 'consistencia_semanal'
    | 'talento_em_destaque';
  title: string;
  objectiveDescription: string;
  currentValue: number;
  targetValue: number;
  unitLabel: string;
  pointsReward: number;
  simulatedDeadline: string;
  campaignPeriod: string;
  completionCriteria: string[];
  actionLabel: string;
  actionTarget: TalentActionTarget;
  categoryBadge: string;
}

export interface ComputedTalentChallenge extends SimulatedTalentChallengeSeed {
  metrics: TalentProgressMetrics;
  statusLabel: string;
}

export interface TalentMainIndicators {
  /** 1. Meu progresso: percentual consolidado de conclusão das metas (0 a 100%) */
  meuProgressoPercent: number;
  /** 2. Desafios ativos: quantidade de desafios em andamento */
  desafiosAtivosCount: number;
  /** Total de desafios concluídos para contexto complementar */
  desafiosConcluidosCount: number;
  /** Total de desafios disponíveis */
  totalDesafiosCount: number;
  /** 3. Pontos conquistados: pontuação acumulada na simulação ou apuração auditada */
  pontosConquistados: number;
  /** Pontuação máxima possível no ciclo */
  pontosTotaisPossiveis: number;
  /** 4. Meta da semana: progresso em relação ao objetivo semanal */
  metaDaSemana: {
    currentValue: number;
    targetValue: number;
    unitLabel: string;
    formattedProgress: string;
    visualBarPercent: number;
    rawPercent: number;
  };
  /** 5. Próxima conquista: objetivo necessário para desbloquear a próxima recompensa elegível */
  proximaConquista: {
    rewardId: string;
    rewardTitle: string;
    pointsNeeded: number;
    targetPoints: number;
    objectiveSummary: string;
    visualBarPercent: number;
  };
}

export interface SimulatedAchievementReward {
  id: string;
  title: string;
  category: 'medalha' | 'nivel' | 'pontos_simulados' | 'reconhecimento_ranking';
  categoryLabel: string;
  description: string;
  requiredPoints: number;
  unlocked: boolean;
  progressPercent: number;
  pointsRemaining: number;
  badgeText: string;
}

export interface AuditedTalentActivitySnapshot {
  userId: string;
  role: TalentParticipantRole;
  environmentMode: RuntimeEnvironmentMode;
  approvedPublishedMediaCount: number;
  collaboratorVerifiedActionsCount: number;
  eligibleMutualAndChatInteractionsCount: number;
  validLiveSessionsCount: number;
  weeklyActiveDaysCount: number;
  eligibleEngagementEventsCount: number;
}

export interface TalentSimulationDashboardState {
  isSimulation: boolean;
  environmentMode: RuntimeEnvironmentMode;
  simulationNotice: string;
  conceptualSeparationNotice: {
    simulatedPoints: string;
    virtualCredits: string;
    realFinancialValues: string;
  };
  role: TalentParticipantRole;
  roleLabel: string;
  cycleLabel: string;
  indicators: TalentMainIndicators;
  challenges: ComputedTalentChallenge[];
  achievements: SimulatedAchievementReward[];
  currentLevel: {
    levelNumber: number;
    levelTitle: string;
    currentPoints: number;
    nextLevelPoints: number;
  };
}

/**
 * Calcula métricas de progresso de forma pura e determinística,
 * preservando currentValue e targetValue originais e limitando a barra visual entre 0% e 100%.
 */
export function calculateTalentProgressMetrics(
  currentValue: number,
  targetValue: number
): TalentProgressMetrics {
  const safeCurrent = Number.isFinite(currentValue) ? Math.max(0, Math.floor(currentValue)) : 0;
  const safeTarget = Number.isFinite(targetValue) ? Math.max(0, Math.floor(targetValue)) : 0;

  if (safeTarget <= 0) {
    return {
      currentValue: safeCurrent,
      targetValue: safeTarget,
      formattedCounter: `${safeCurrent} de ${safeTarget}`,
      rawPercent: 0,
      visualBarPercent: 0,
      isOverTarget: false,
      status: 'nao_iniciado',
    };
  }

  const rawPercent = Math.round((safeCurrent / safeTarget) * 100);
  const visualBarPercent = Math.min(100, Math.max(0, rawPercent));
  const isOverTarget = safeCurrent > safeTarget;

  let status: TalentChallengeStatus = 'em_andamento';
  if (safeCurrent === 0) {
    status = 'nao_iniciado';
  } else if (safeCurrent >= safeTarget) {
    status = 'concluido';
  }

  return {
    currentValue: safeCurrent,
    targetValue: safeTarget,
    formattedCounter: `${safeCurrent} de ${safeTarget}`,
    rawPercent,
    visualBarPercent,
    isOverTarget,
    status,
  };
}

export function getChallengeStatusLabel(status: TalentChallengeStatus): string {
  switch (status) {
    case 'nao_iniciado':
      return 'Não iniciado';
    case 'em_andamento':
      return 'Em andamento';
    case 'concluido':
      return 'Concluído';
  }
}

/**
 * Sementes determinísticas centralizadas por perfil (Produtor de Conteúdo e Colaborador).
 */
const DETERMINISTIC_CHALLENGE_SEEDS: Record<
  TalentParticipantRole,
  SimulatedTalentChallengeSeed[]
> = {
  produtor_conteudo: [
    {
      id: 'criador_em_acao',
      title: 'Criador em ação',
      objectiveDescription: 'Publicar 3 conteúdos válidos no perfil ou Cofre VIP durante o ciclo.',
      currentValue: 2,
      targetValue: 3,
      unitLabel: 'conteúdos válidos',
      pointsReward: 300,
      simulatedDeadline: 'Domingo, 23:59 (Simulado)',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Publicar fotos ou vídeos originais aprovados pela moderação.',
        'Incluir legenda descritiva e classificação correta de visibilidade.',
        'Manter a publicação ativa sem violações de diretrizes da comunidade.',
      ],
      actionLabel: 'Abrir Estúdio de Conteúdo',
      actionTarget: 'creator_studio',
      categoryBadge: 'Produção & Conteúdo',
    },
    {
      id: 'conexao_ativa',
      title: 'Conexão ativa',
      objectiveDescription: 'Participar de 5 interações elegíveis com conexões e seguidores no JOBS.',
      currentValue: 5,
      targetValue: 5,
      unitLabel: 'interações elegíveis',
      pointsReward: 250,
      simulatedDeadline: 'Concluído no ciclo atual',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Responder mensagens legítimas de conexões mútuas.',
        'Interagir de forma respeitosa e consensual no feed ou descoberta.',
        'Não utilizar mensagens automatizadas ou repetitivas (anti-spam).',
      ],
      actionLabel: 'Explorar Descoberta',
      actionTarget: 'discover_connections',
      categoryBadge: 'Relacionamento & Comunidade',
    },
    {
      id: 'ao_vivo_no_jobs',
      title: 'Ao vivo no JOBS',
      objectiveDescription: 'Realizar 2 transmissões válidas no módulo de Lives interativas.',
      currentValue: 1,
      targetValue: 2,
      unitLabel: 'transmissões válidas',
      pointsReward: 400,
      simulatedDeadline: 'Restam 3 dias (Simulado)',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Iniciar e concluir transmissão ao vivo com duração mínima de 15 minutos.',
        'Interagir com a audiência da sala mantendo conformidade com a segurança.',
        'Encerrar a sessão sem alertas de moderação.',
      ],
      actionLabel: 'Acessar Central de Lives',
      actionTarget: 'live_center',
      categoryBadge: 'Transmissões ao Vivo',
    },
    {
      id: 'consistencia_semanal',
      title: 'Consistência semanal',
      objectiveDescription: 'Cumprir a meta semanal de atividade mantendo presença regular na plataforma.',
      currentValue: 4,
      targetValue: 5,
      unitLabel: 'dias ativos na semana',
      pointsReward: 350,
      simulatedDeadline: 'Restam 2 dias (Simulado)',
      campaignPeriod: 'Meta da Semana · 5 dias',
      completionCriteria: [
        'Acessar o JOBS e realizar ao menos 1 ação válida em 5 dias distintos da semana.',
        'Manter o perfil atualizado e verificado.',
        'Completar pelo menos uma revisão de metas no painel inicial.',
      ],
      actionLabel: 'Ver Desafios da Comunidade',
      actionTarget: 'interactive_challenges',
      categoryBadge: 'Hábito & Consistência',
    },
    {
      id: 'talento_em_destaque',
      title: 'Talento em destaque',
      objectiveDescription: 'Alcançar uma meta de engajamento válida nos desafios consensuais.',
      currentValue: 0,
      targetValue: 10,
      unitLabel: 'votos/apoios válidos',
      pointsReward: 500,
      simulatedDeadline: 'Fim do mês (Simulado)',
      campaignPeriod: 'Temporada de Destaque · Outubro/2026',
      completionCriteria: [
        'Inscrever participação em desafio consensual ativo.',
        'Alcançar 10 apoios ou votos auditados de usuários verificados.',
        'Respeitar integralmente as regras de autenticidade e não manipulação.',
      ],
      actionLabel: 'Participar dos Desafios',
      actionTarget: 'interactive_challenges',
      categoryBadge: 'Engajamento & Ranking',
    },
  ],
  colaborador: [
    {
      id: 'criador_em_acao',
      title: 'Criador em ação',
      objectiveDescription: 'Publicar 3 conteúdos válidos de apresentação ou portfólio no perfil.',
      currentValue: 1,
      targetValue: 3,
      unitLabel: 'conteúdos válidos',
      pointsReward: 300,
      simulatedDeadline: 'Domingo, 23:59 (Simulado)',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Publicar fotos ou vídeos verificados apresentando seu perfil no JOBS.',
        'Atender aos padrões de qualidade e moderação da plataforma.',
        'Manter perfil público completo para novos membros.',
      ],
      actionLabel: 'Abrir Estúdio de Conteúdo',
      actionTarget: 'creator_studio',
      categoryBadge: 'Perfil & Portfólio',
    },
    {
      id: 'conexao_ativa',
      title: 'Conexão ativa',
      objectiveDescription: 'Participar de 5 interações elegíveis de boas-vindas e rede de indicações.',
      currentValue: 4,
      targetValue: 5,
      unitLabel: 'interações elegíveis',
      pointsReward: 250,
      simulatedDeadline: 'Restam 2 dias (Simulado)',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Compartilhar convite oficial com novos participantes verificados.',
        'Auxiliar conexões indicadas na ativação ética do perfil.',
        'Validar interações orgânicas sem contas duplicadas.',
      ],
      actionLabel: 'Abrir Rede de Colaboradores',
      actionTarget: 'referral_network',
      categoryBadge: 'Expansão & Colaboração',
    },
    {
      id: 'ao_vivo_no_jobs',
      title: 'Ao vivo no JOBS',
      objectiveDescription: 'Realizar 2 transmissões válidas ou sessões de recepção ao vivo.',
      currentValue: 0,
      targetValue: 2,
      unitLabel: 'transmissões válidas',
      pointsReward: 400,
      simulatedDeadline: 'Restam 4 dias (Simulado)',
      campaignPeriod: 'Ciclo Semanal · Outubro/2026',
      completionCriteria: [
        'Realizar ou co-participar de 2 transmissões válidas na Central de Lives.',
        'Cumprir o tempo mínimo de permanência e regras de convivência.',
        'Manter avaliação positiva da comunidade.',
      ],
      actionLabel: 'Acessar Central de Lives',
      actionTarget: 'live_center',
      categoryBadge: 'Transmissões ao Vivo',
    },
    {
      id: 'consistencia_semanal',
      title: 'Consistência semanal',
      objectiveDescription: 'Cumprir a meta semanal de atividade acompanhando sua rede.',
      currentValue: 5,
      targetValue: 5,
      unitLabel: 'dias ativos na semana',
      pointsReward: 350,
      simulatedDeadline: 'Concluído nesta semana',
      campaignPeriod: 'Meta da Semana · 5 dias',
      completionCriteria: [
        'Registrar presença ativa em 5 dias da semana.',
        'Acompanhar painel de metas e orientações de segurança.',
        'Manter índice zero de contestações ou spam.',
      ],
      actionLabel: 'Abrir Rede de Colaboradores',
      actionTarget: 'referral_network',
      categoryBadge: 'Hábito & Consistência',
    },
    {
      id: 'talento_em_destaque',
      title: 'Talento em destaque',
      objectiveDescription: 'Alcançar uma meta de engajamento válida com criadores e desafios.',
      currentValue: 6,
      targetValue: 10,
      unitLabel: 'interações de destaque',
      pointsReward: 500,
      simulatedDeadline: 'Fim do mês (Simulado)',
      campaignPeriod: 'Temporada de Destaque · Outubro/2026',
      completionCriteria: [
        'Apoiar desafios consensuais e criadores verificados.',
        'Atingir 10 participações auditadas no ciclo mensal.',
        'Manter conformidade integral com as diretrizes do JOBS.',
      ],
      actionLabel: 'Participar dos Desafios',
      actionTarget: 'interactive_challenges',
      categoryBadge: 'Engajamento & Ranking',
    },
  ],
};

/**
 * Catálogo determinístico de recompensas e conquistas ilustrativas ("Suas conquistas").
 */
const REWARDS_CATALOG_SEEDS: Array<{
  id: string;
  title: string;
  category: SimulatedAchievementReward['category'];
  categoryLabel: string;
  description: string;
  requiredPoints: number;
  badgeText: string;
}> = [
  {
    id: 'reward_medal_consistencia',
    title: 'Medalha Presença de Ouro',
    category: 'medalha',
    categoryLabel: 'Medalha Ilustrativa',
    description: 'Insígnia visual exibida no perfil simulado ao iniciar sua jornada de metas semanais.',
    requiredPoints: 250,
    badgeText: 'Insígnia de Perfil',
  },
  {
    id: 'reward_nivel_talento_pro',
    title: 'Nível Talento Ascendente II',
    category: 'nivel',
    categoryLabel: 'Evolução de Nível',
    description: 'Desbloqueia moldura temática simulada e selo de evolução contínua na temporada.',
    requiredPoints: 650,
    badgeText: 'Nível 2 Simulado',
  },
  {
    id: 'reward_bonus_pontos_temporada',
    title: 'Marco de 1.000 Pontos de Talento',
    category: 'pontos_simulados',
    categoryLabel: 'Pontos Simulados (XP)',
    description: 'Certificado simbólico de pontuação acumulada nos desafios de engajamento e criação.',
    requiredPoints: 1000,
    badgeText: '1.000 Pts Simulados',
  },
  {
    id: 'reward_destaque_ranking_mensal',
    title: 'Selo de Reconhecimento na Vitrine do Ranking',
    category: 'reconhecimento_ranking',
    categoryLabel: 'Reconhecimento no Ranking',
    description: 'Destaque visual educativo de elegibilidade para a vitrine comunitária do JOBS.',
    requiredPoints: 1450,
    badgeText: 'Destaque Comunitário',
  },
];

const STORAGE_BASE_KEY_WEEKLY_ACTIVITY = 'jobs_talent_weekly_activity_v1';
const STORAGE_BASE_KEY_COLLAB_ACTIONS = 'jobs_talent_collab_actions_v1';

const STATIC_DEMO_MEDIA_IDS = new Set([
  'excl_photo_val_01',
  'excl_video_val_02',
  'excl_vault_val_03',
  'excl_vault_val_04',
  'excl_photo_isa_01',
  'excl_vault_isa_02',
  'excl_free_val_05',
  'excl_free_isa_03',
]);

const STATIC_DEMO_LIVE_IDS = new Set([
  'live_indiv_valentina',
  'live_battle_isabella_camila',
  'live_stage_larissa',
  'live_challenge_gabriel',
]);

const memoryTalentStore: Record<string, string> = {};

function ensureGlobalLocalStorageFallback(): void {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage === 'undefined') {
    (globalThis as any).localStorage = {
      getItem: (key: string) => (key in memoryTalentStore ? memoryTalentStore[key] : null),
      setItem: (key: string, value: string) => {
        memoryTalentStore[key] = String(value);
      },
      removeItem: (key: string) => {
        delete memoryTalentStore[key];
      },
      clear: () => {
        for (const k of Object.keys(memoryTalentStore)) {
          delete memoryTalentStore[k];
        }
      },
      key: (index: number) => Object.keys(memoryTalentStore)[index] ?? null,
      get length() {
        return Object.keys(memoryTalentStore).length;
      },
    };
  }
}

function getSafeTalentStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
} {
  ensureGlobalLocalStorageFallback();
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    try {
      const storage = (globalThis as any).localStorage;
      const probeKey = '__jobs_talent_probe__';
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      return storage;
    } catch {
      // fallback in memory
    }
  }
  return {
    getItem: (key: string) => (key in memoryTalentStore ? memoryTalentStore[key] : null),
    setItem: (key: string, value: string) => {
      memoryTalentStore[key] = String(value);
    },
  };
}

/**
 * Registra presença/atividade diária auditada para o Desafio 4 (Consistência semanal),
 * isolada por namespace de ambiente via runtimeEnvironmentService.
 */
export function recordAuditedDailyTalentActivity(
  userId: string,
  dateIso?: string,
  overrideMode?: RuntimeEnvironmentMode
): string[] {
  const cleanUserId = (userId || 'current_user').trim();
  const mode = overrideMode || runtimeEnvironmentService.getMode();
  const scopedKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_WEEKLY_ACTIVITY,
    mode
  );
  const storage = getSafeTalentStorage();
  let map: Record<string, string[]> = {};
  try {
    const raw = storage.getItem(scopedKey);
    if (raw) {
      map = JSON.parse(raw);
    }
  } catch {
    map = {};
  }

  const dayKey = (dateIso || new Date().toISOString()).slice(0, 10);
  const currentDays = Array.isArray(map[cleanUserId]) ? map[cleanUserId] : [];
  if (!currentDays.includes(dayKey)) {
    currentDays.push(dayKey);
  }
  // Mantém até 7 dias distintos no ciclo semanal vigente
  const normalized = Array.from(new Set(currentDays)).sort().slice(-7);
  map[cleanUserId] = normalized;
  storage.setItem(scopedKey, JSON.stringify(map));
  return normalized;
}

/**
 * Registra uma ação verificada de colaborador/indicador (ex.: indicação qualificada ou curadoria)
 * de forma idempotente por actionId e segregada por ambiente.
 */
export function recordAuditedCollaboratorAction(
  userId: string,
  actionId: string,
  overrideMode?: RuntimeEnvironmentMode
): number {
  const cleanUserId = (userId || 'current_user').trim();
  const cleanActionId = (actionId || '').trim();
  if (!cleanActionId) return 0;

  const mode = overrideMode || runtimeEnvironmentService.getMode();
  const scopedKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_COLLAB_ACTIONS,
    mode
  );
  const storage = getSafeTalentStorage();
  let map: Record<string, string[]> = {};
  try {
    const raw = storage.getItem(scopedKey);
    if (raw) {
      map = JSON.parse(raw);
    }
  } catch {
    map = {};
  }

  const list = Array.isArray(map[cleanUserId]) ? map[cleanUserId] : [];
  if (!list.includes(cleanActionId)) {
    list.push(cleanActionId);
  }
  map[cleanUserId] = list;
  storage.setItem(scopedKey, JSON.stringify(map));
  return list.length;
}

/**
 * Coleta os contadores reais e auditados dos serviços da plataforma para os 5 desafios:
 * 1. criador_em_acao: mídias publicadas e aprovadas (ou ações verificadas de colaborador).
 * 2. conexao_ativa: conexões mútuas ativas, mensagens legítimas sem bloqueio e interesses imediatos confirmados.
 * 3. ao_vivo_no_jobs: transmissões ao vivo válidas (ativas ou concluídas) como host, co-host ou duelo.
 * 4. consistencia_semanal: dias distintos com atividade auditada registrada no ciclo semanal.
 * 5. talento_em_destaque: eventos reais de engajamento (desbloqueios, cofres VIP, interesses imediatos e presentes).
 */
export function collectAuditedTalentActivity(
  userId = 'current_user',
  role: TalentParticipantRole = 'produtor_conteudo',
  overrideMode?: RuntimeEnvironmentMode
): AuditedTalentActivitySnapshot {
  const cleanUserId = (userId || 'current_user').trim();
  const environmentMode = overrideMode || runtimeEnvironmentService.getMode();
  const storage = getSafeTalentStorage();

  // 1. Mídias publicadas e aprovadas pelo usuário no exclusiveContentAndInterestService
  const creatorMedia = exclusiveContentAndInterestService
    .listCreatorOwnMedia(cleanUserId)
    .filter((item) => {
      if (item.creatorId !== cleanUserId) return false;
      if (item.state !== 'published' || item.moderationResult !== 'approved') return false;
      if (environmentMode === 'production' && STATIC_DEMO_MEDIA_IDS.has(item.id)) return false;
      return true;
    });
  const approvedPublishedMediaCount = creatorMedia.length;

  // Ações auditadas de colaborador (indicações/curadoria)
  const collabKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_COLLAB_ACTIONS,
    environmentMode
  );
  let collaboratorVerifiedActionsCount = 0;
  try {
    const rawCollab = storage.getItem(collabKey);
    if (rawCollab) {
      const parsed = JSON.parse(rawCollab);
      if (Array.isArray(parsed?.[cleanUserId])) {
        collaboratorVerifiedActionsCount = parsed[cleanUserId].length;
      }
    }
  } catch {
    collaboratorVerifiedActionsCount = 0;
  }

  // 2. Conexões mútuas e interações elegíveis sem bloqueio (matchAndMessagingService + exclusiveContentAndInterestService)
  const activeMatches = matchAndMessagingService
    .getMatchesForUser(cleanUserId)
    .filter((match) => {
      if (environmentMode === 'production' && match.id.startsWith('match_seed_')) return false;
      const partnerId = match.userAId === cleanUserId ? match.userBId : match.userAId;
      return !exclusiveContentAndInterestService.isPairBlocked(cleanUserId, partnerId);
    });

  let eligibleMessagesCount = 0;
  const activeIsoDates = new Set<string>();

  for (const match of activeMatches) {
    const partnerId = match.userAId === cleanUserId ? match.userBId : match.userAId;
    const messages = matchAndMessagingService.getMessages(cleanUserId, partnerId).filter((msg) => {
      if (environmentMode === 'production' && msg.id.startsWith('msg_seed_')) return false;
      return msg.senderId === cleanUserId || msg.recipientId === cleanUserId;
    });
    eligibleMessagesCount += messages.length;
    for (const msg of messages) {
      if (msg.senderId === cleanUserId && Number.isFinite(msg.timestamp)) {
        activeIsoDates.add(new Date(msg.timestamp).toISOString().slice(0, 10));
      }
    }
  }

  const txEnvironmentFilter = environmentMode === 'production' ? 'production' : 'sandbox';
  const confirmedCreatorTxs = exclusiveContentAndInterestService.getMonetizedTransactions({
    creatorOrRecipientId: cleanUserId,
    environment: txEnvironmentFilter,
    pageSize: 100,
  }).items.filter((tx) => tx.paymentStatus === 'confirmed');

  const confirmedBuyerTxs = exclusiveContentAndInterestService.getMonetizedTransactions({
    buyerUserId: cleanUserId,
    environment: txEnvironmentFilter,
    pageSize: 100,
  }).items.filter((tx) => tx.paymentStatus === 'confirmed');

  const confirmedImmediateInterestsCount = [
    ...confirmedCreatorTxs,
    ...confirmedBuyerTxs,
  ].filter((tx) => tx.category === 'IMMEDIATE_INTEREST').length;

  const eligibleMutualAndChatInteractionsCount =
    activeMatches.length + eligibleMessagesCount + confirmedImmediateInterestsCount;

  // 3. Lives válidas no liveStreamService
  const allLiveSessions = liveStreamService.getLiveSessions();
  const validLiveSessions = allLiveSessions.filter((session) => {
    if (session.status !== 'active' && session.status !== 'completed') return false;
    if (environmentMode === 'production' && STATIC_DEMO_LIVE_IDS.has(session.id)) return false;

    const isHost = session.hostCreatorId === cleanUserId;
    const isBattleParticipant =
      session.battleState?.creator1.id === cleanUserId ||
      session.battleState?.creator2.id === cleanUserId;
    const isStageParticipant =
      Array.isArray(session.stageParticipants) &&
      session.stageParticipants.some((p) => p.userId === cleanUserId);

    return isHost || isBattleParticipant || isStageParticipant;
  });
  const validLiveSessionsCount = validLiveSessions.length;

  // 4. Consistência semanal (dias distintos com atividade registrada)
  const weeklyKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_WEEKLY_ACTIVITY,
    environmentMode
  );
  try {
    const rawWeekly = storage.getItem(weeklyKey);
    if (rawWeekly) {
      const parsed = JSON.parse(rawWeekly);
      if (Array.isArray(parsed?.[cleanUserId])) {
        for (const d of parsed[cleanUserId]) {
          if (typeof d === 'string' && d.length >= 10) {
            activeIsoDates.add(d.slice(0, 10));
          }
        }
      }
    }
  } catch {
    // ignore parse error
  }

  for (const media of creatorMedia) {
    if (media.publishedAt) {
      activeIsoDates.add(media.publishedAt.slice(0, 10));
    }
  }
  for (const live of validLiveSessions) {
    if (live.startedAt) {
      activeIsoDates.add(live.startedAt.slice(0, 10));
    }
  }

  const weeklyActiveDaysCount = Math.min(7, activeIsoDates.size);

  // 5. Talento em destaque (engajamento auditado: desbloqueios, cofres VIP, presentes e apoios)
  const uniqueConfirmedTxIds = new Set<string>();
  for (const tx of confirmedCreatorTxs) uniqueConfirmedTxIds.add(tx.id);
  for (const tx of confirmedBuyerTxs) uniqueConfirmedTxIds.add(tx.id);

  const mediaUnlocksSum = creatorMedia.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(item.unlockCount || 0)),
    0
  );

  const eligibleEngagementEventsCount =
    uniqueConfirmedTxIds.size +
    mediaUnlocksSum +
    (role === 'colaborador' ? collaboratorVerifiedActionsCount : 0);

  return {
    userId: cleanUserId,
    role,
    environmentMode,
    approvedPublishedMediaCount,
    collaboratorVerifiedActionsCount,
    eligibleMutualAndChatInteractionsCount,
    validLiveSessionsCount,
    weeklyActiveDaysCount,
    eligibleEngagementEventsCount,
  };
}

/**
 * Retorna uma cópia imutável das sementes iniciais simuladas para o perfil selecionado.
 */
export function getInitialChallengeSeeds(
  role: TalentParticipantRole = 'produtor_conteudo'
): SimulatedTalentChallengeSeed[] {
  return DETERMINISTIC_CHALLENGE_SEEDS[role].map((seed) => ({
    ...seed,
    completionCriteria: [...seed.completionCriteria],
  }));
}

/**
 * Constrói os 5 desafios obrigatórios com contadores reais auditados em modo Produção.
 * Nunca injeta valores fictícios ou aleatórios: um usuário sem histórico inicia em 0.
 */
export function getProductionChallengeSeeds(
  userId = 'current_user',
  role: TalentParticipantRole = 'produtor_conteudo',
  overrideMode: RuntimeEnvironmentMode = 'production'
): SimulatedTalentChallengeSeed[] {
  const snapshot = collectAuditedTalentActivity(userId, role, overrideMode);
  const templates = getInitialChallengeSeeds(role);

  return templates.map((template) => {
    let realCurrentValue = 0;
    switch (template.id) {
      case 'criador_em_acao':
        realCurrentValue =
          role === 'produtor_conteudo'
            ? snapshot.approvedPublishedMediaCount
            : snapshot.collaboratorVerifiedActionsCount + snapshot.approvedPublishedMediaCount;
        break;
      case 'conexao_ativa':
        realCurrentValue = snapshot.eligibleMutualAndChatInteractionsCount;
        break;
      case 'ao_vivo_no_jobs':
        realCurrentValue = snapshot.validLiveSessionsCount;
        break;
      case 'consistencia_semanal':
        realCurrentValue = snapshot.weeklyActiveDaysCount;
        break;
      case 'talento_em_destaque':
        realCurrentValue = snapshot.eligibleEngagementEventsCount;
        break;
    }

    return {
      ...template,
      currentValue: realCurrentValue,
      simulatedDeadline: template.simulatedDeadline.replace(
        /\s*\(Simulado\)/gi,
        ' (Ciclo Vigente)'
      ),
      campaignPeriod: template.campaignPeriod.replace(
        /\s*\(Simulação\)/gi,
        ' (Apuração Auditada)'
      ),
    };
  });
}

function buildDashboardStateFromSeeds(params: {
  role: TalentParticipantRole;
  seeds: SimulatedTalentChallengeSeed[];
  environmentMode: RuntimeEnvironmentMode;
}): TalentSimulationDashboardState {
  const { role, seeds, environmentMode } = params;
  const isSimulation = environmentMode === 'simulation';

  const computedChallenges: ComputedTalentChallenge[] = seeds.map((seed) => {
    const metrics = calculateTalentProgressMetrics(seed.currentValue, seed.targetValue);
    return {
      ...seed,
      completionCriteria: [...seed.completionCriteria],
      metrics,
      statusLabel: getChallengeStatusLabel(metrics.status),
    };
  });

  const totalDesafiosCount = computedChallenges.length;
  const desafiosAtivosCount = computedChallenges.filter(
    (c) => c.metrics.status === 'em_andamento'
  ).length;
  const desafiosConcluidosCount = computedChallenges.filter(
    (c) => c.metrics.status === 'concluido'
  ).length;

  // Cálculo consolidado de "Meu progresso": média dos percentuais visuais (0 a 100%) de cada desafio
  const sumVisualPercents = computedChallenges.reduce(
    (acc, item) => acc + item.metrics.visualBarPercent,
    0
  );
  const meuProgressoPercent =
    totalDesafiosCount > 0 ? Math.round(sumVisualPercents / totalDesafiosCount) : 0;

  // Cálculo determinístico de Pontos Conquistados (proporcional ao progresso visual de cada desafio)
  const pontosConquistados = computedChallenges.reduce((acc, item) => {
    const earnedForChallenge = Math.round(
      (item.pointsReward * item.metrics.visualBarPercent) / 100
    );
    return acc + earnedForChallenge;
  }, 0);

  const pontosTotaisPossiveis = computedChallenges.reduce(
    (acc, item) => acc + item.pointsReward,
    0
  );

  // Meta da semana vinculada ao desafio 'consistencia_semanal' (ou consolidado se ausente)
  const weeklyChallenge = computedChallenges.find((c) => c.id === 'consistencia_semanal');
  const metaDaSemana = weeklyChallenge
    ? {
        currentValue: weeklyChallenge.metrics.currentValue,
        targetValue: weeklyChallenge.metrics.targetValue,
        unitLabel: weeklyChallenge.unitLabel,
        formattedProgress: `${weeklyChallenge.metrics.currentValue} de ${weeklyChallenge.metrics.targetValue} dias`,
        visualBarPercent: weeklyChallenge.metrics.visualBarPercent,
        rawPercent: weeklyChallenge.metrics.rawPercent,
      }
    : {
        currentValue: desafiosConcluidosCount,
        targetValue: totalDesafiosCount,
        unitLabel: 'metas concluídas',
        formattedProgress: `${desafiosConcluidosCount} de ${totalDesafiosCount} metas`,
        visualBarPercent: meuProgressoPercent,
        rawPercent: meuProgressoPercent,
      };

  // Computa conquistas ("Suas conquistas") com base em pontosConquistados
  const achievements: SimulatedAchievementReward[] = REWARDS_CATALOG_SEEDS.map((reward) => {
    const metrics = calculateTalentProgressMetrics(pontosConquistados, reward.requiredPoints);
    const unlocked = pontosConquistados >= reward.requiredPoints;
    const pointsRemaining = Math.max(0, reward.requiredPoints - pontosConquistados);

    return {
      id: reward.id,
      title: reward.title,
      category: reward.category,
      categoryLabel: reward.categoryLabel,
      description: reward.description,
      requiredPoints: reward.requiredPoints,
      unlocked,
      progressPercent: metrics.visualBarPercent,
      pointsRemaining,
      badgeText: reward.badgeText,
    };
  });

  // Próxima conquista elegível (primeira ainda não desbloqueada ou a última concluída)
  const nextLockedReward = achievements.find((a) => !a.unlocked);
  const proximaConquista = nextLockedReward
    ? {
        rewardId: nextLockedReward.id,
        rewardTitle: nextLockedReward.title,
        pointsNeeded: nextLockedReward.pointsRemaining,
        targetPoints: nextLockedReward.requiredPoints,
        objectiveSummary: `Faltam ${nextLockedReward.pointsRemaining} pts para "${nextLockedReward.title}"`,
        visualBarPercent: nextLockedReward.progressPercent,
      }
    : {
        rewardId: achievements[achievements.length - 1]?.id || 'all_unlocked',
        rewardTitle:
          achievements[achievements.length - 1]?.title || 'Temporada Completa no JOBS',
        pointsNeeded: 0,
        targetPoints:
          achievements[achievements.length - 1]?.requiredPoints || pontosTotaisPossiveis,
        objectiveSummary: isSimulation
          ? 'Todas as conquistas simuladas do ciclo foram desbloqueadas!'
          : 'Todas as conquistas de gamificação do ciclo foram desbloqueadas!',
        visualBarPercent: 100,
      };

  // Nível atual baseado na pontuação gamificada
  let levelNumber = 1;
  let levelTitle = 'Talento Iniciante';
  let nextLevelPoints = 650;

  if (pontosConquistados >= 1450) {
    levelNumber = 4;
    levelTitle = 'Talento Embaixador JOBS';
    nextLevelPoints = 1800;
  } else if (pontosConquistados >= 1000) {
    levelNumber = 3;
    levelTitle = 'Talento Destaque';
    nextLevelPoints = 1450;
  } else if (pontosConquistados >= 650) {
    levelNumber = 2;
    levelTitle = 'Talento Ascendente';
    nextLevelPoints = 1000;
  }

  return {
    isSimulation,
    environmentMode,
    simulationNotice: isSimulation
      ? 'MODO SIMULAÇÃO — DADOS FICTÍCIOS'
      : 'MODO PRODUÇÃO — PROGRESSO AUDITADO',
    conceptualSeparationNotice: {
      simulatedPoints: isSimulation
        ? 'Pontos Simulados (Pts): indicadores gamificados de estudo/engajamento nesta seção. Não possuem valor monetário.'
        : 'Pontos de Gamificação (Pts): indicadores auditados de evolução e selos visuais nesta seção. Não possuem valor monetário e não geram lançamentos no livro-razão.',
      virtualCredits:
        'Créditos Virtuais (💎): fichas internas para presentes e desbloqueios na plataforma.',
      realFinancialValues:
        'Valores Financeiros (R$): saldo contábil auditado exclusivamente na Minha Carteira (ledgerService).',
    },
    role,
    roleLabel:
      role === 'produtor_conteudo' ? 'Produtor de Conteúdo' : 'Colaborador & Indicador',
    cycleLabel: isSimulation
      ? 'Temporada Outubro/2026 (Simulação)'
      : 'Temporada Outubro/2026 (Produção Auditada)',
    indicators: {
      meuProgressoPercent,
      desafiosAtivosCount,
      desafiosConcluidosCount,
      totalDesafiosCount,
      pontosConquistados,
      pontosTotaisPossiveis,
      metaDaSemana,
      proximaConquista,
    },
    challenges: computedChallenges,
    achievements,
    currentLevel: {
      levelNumber,
      levelTitle,
      currentPoints: pontosConquistados,
      nextLevelPoints,
    },
  };
}

/**
 * Constrói o estado completo e coerente da seção "Seu talento vale muito!"
 * em Modo Simulação (preservado para compatibilidade integral com suítes existentes).
 */
export function buildTalentSimulationDashboardState(
  role: TalentParticipantRole = 'produtor_conteudo',
  customSeeds?: SimulatedTalentChallengeSeed[]
): TalentSimulationDashboardState {
  const seeds = customSeeds ? customSeeds : getInitialChallengeSeeds(role);
  return buildDashboardStateFromSeeds({
    role,
    seeds,
    environmentMode: 'simulation',
  });
}

/**
 * Constrói o estado da seção "Seu talento vale muito!" alternando automaticamente
 * entre Simulação (sementes determinísticas) e Produção (contadores reais auditados)
 * conforme o runtimeEnvironmentService.
 */
export function buildTalentDashboardStateByEnvironment(options?: {
  role?: TalentParticipantRole;
  userId?: string;
  mode?: RuntimeEnvironmentMode;
  customSeeds?: SimulatedTalentChallengeSeed[];
}): TalentSimulationDashboardState {
  const role = options?.role || 'produtor_conteudo';
  const userId = options?.userId || 'current_user';
  const environmentMode = options?.mode || runtimeEnvironmentService.getMode();

  if (environmentMode === 'production') {
    const prodSeeds =
      options?.customSeeds ?? getProductionChallengeSeeds(userId, role, 'production');
    return buildDashboardStateFromSeeds({
      role,
      seeds: prodSeeds,
      environmentMode: 'production',
    });
  }

  const simSeeds = options?.customSeeds ?? getInitialChallengeSeeds(role);
  return buildDashboardStateFromSeeds({
    role,
    seeds: simSeeds,
    environmentMode: 'simulation',
  });
}

/**
 * Avança em +1 unidade o progresso de um desafio específico de maneira puramente simulada,
 * permitindo testar transições de "Não iniciado" -> "Em andamento" -> "Concluído" e acima de 100%.
 */
export function advanceSimulatedChallengeStep(
  seeds: SimulatedTalentChallengeSeed[],
  challengeId: SimulatedTalentChallengeSeed['id'],
  stepIncrement = 1
): SimulatedTalentChallengeSeed[] {
  const safeIncrement = Number.isFinite(stepIncrement) ? Math.max(1, Math.floor(stepIncrement)) : 1;
  return seeds.map((seed) => {
    if (seed.id !== challengeId) return seed;
    return {
      ...seed,
      currentValue: seed.currentValue + safeIncrement,
    };
  });
}

export type TalentCloudSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced_cloud'
  | 'synced_local_audit'
  | 'blocked_simulation'
  | 'error';

export interface TalentCloudSyncResult {
  status: TalentCloudSyncStatus;
  cloudPersisted: boolean;
  collectionPath: string | null;
  lastSyncedAtIso: string | null;
  payload: TalentProgressFirestorePayload | null;
  message: string;
}

const lastTalentSyncStateByUserAndRole = new Map<string, TalentCloudSyncResult>();
const STORAGE_BASE_KEY_PENDING_LOCAL_AUDITS = 'jobs_talent_pending_local_audits_v1';

export interface TalentProgressSchemaValidationResult {
  valid: boolean;
  checkedFieldsCount: number;
  violations: string[];
}

export interface AuditedTalentAdminRecord {
  recordKey: string;
  userId: string;
  role: TalentParticipantRole;
  roleLabel: string;
  environmentMode: 'production';
  source: 'firestore_cloud' | 'local_audit_pending';
  sourceLabel: string;
  cloudPersisted: boolean;
  collectionPath: string;
  approvedPublishedMediaCount: number;
  collaboratorVerifiedActionsCount: number;
  eligibleMutualAndChatInteractionsCount: number;
  validLiveSessionsCount: number;
  weeklyActiveDaysCount: number;
  eligibleEngagementEventsCount: number;
  pontosConquistados: number;
  levelNumber: number;
  desafiosConcluidosCount: number;
  updatedAtIso: string;
  schemaValidation: TalentProgressSchemaValidationResult;
  canonicalPayload: TalentProgressFirestorePayload;
}

export interface TalentAuthReconciliationResult {
  authenticatedUid: string;
  reconciledCount: number;
  rolesReconciled: TalentParticipantRole[];
  results: TalentCloudSyncResult[];
  message: string;
}

function loadPendingLocalAuditQueue(): Record<string, TalentCloudSyncResult> {
  const storage = getSafeTalentStorage();
  const scopedKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_PENDING_LOCAL_AUDITS,
    'production'
  );
  try {
    const raw = storage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, TalentCloudSyncResult>;
      }
    }
  } catch {
    // ignore storage parse failure
  }
  return {};
}

function savePendingLocalAuditQueue(queue: Record<string, TalentCloudSyncResult>): void {
  const storage = getSafeTalentStorage();
  const scopedKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_PENDING_LOCAL_AUDITS,
    'production'
  );
  storage.setItem(scopedKey, JSON.stringify(queue));
}

function migrateLocalAuditedCountersToAuthenticatedUid(
  fromUserId: string,
  targetUid: string
): void {
  const cleanFrom = (fromUserId || '').trim();
  const cleanTarget = (targetUid || '').trim();
  if (!cleanFrom || !cleanTarget || cleanFrom === cleanTarget) return;

  const storage = getSafeTalentStorage();

  // 1. Migra dias ativos na semana em produção
  const weeklyKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_WEEKLY_ACTIVITY,
    'production'
  );
  try {
    const rawWeekly = storage.getItem(weeklyKey);
    if (rawWeekly) {
      const weeklyMap = JSON.parse(rawWeekly) as Record<string, string[]>;
      const fromDays = Array.isArray(weeklyMap[cleanFrom]) ? weeklyMap[cleanFrom] : [];
      const toDays = Array.isArray(weeklyMap[cleanTarget]) ? weeklyMap[cleanTarget] : [];
      if (fromDays.length > 0) {
        weeklyMap[cleanTarget] = Array.from(new Set([...toDays, ...fromDays]))
          .sort()
          .slice(-7);
        storage.setItem(weeklyKey, JSON.stringify(weeklyMap));
      }
    }
  } catch {
    // ignore
  }

  // 2. Migra ações verificadas de colaborador em produção
  const collabKey = runtimeEnvironmentService.getScopedStorageKey(
    STORAGE_BASE_KEY_COLLAB_ACTIONS,
    'production'
  );
  try {
    const rawCollab = storage.getItem(collabKey);
    if (rawCollab) {
      const collabMap = JSON.parse(rawCollab) as Record<string, string[]>;
      const fromActions = Array.isArray(collabMap[cleanFrom]) ? collabMap[cleanFrom] : [];
      const toActions = Array.isArray(collabMap[cleanTarget]) ? collabMap[cleanTarget] : [];
      if (fromActions.length > 0) {
        collabMap[cleanTarget] = Array.from(new Set([...toActions, ...fromActions]));
        storage.setItem(collabKey, JSON.stringify(collabMap));
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Valida se um payload de progresso de talentos atende integralmente às restrições
 * da função server-side `isValidTalentProgressSnapshot` em `firestore.rules`.
 */
export function validateTalentProgressSnapshotSchema(
  candidate: Partial<TalentProgressFirestorePayload> | Record<string, unknown>
): TalentProgressSchemaValidationResult {
  const violations: string[] = [];
  const data = (candidate || {}) as Record<string, unknown>;

  if (typeof data.userId !== 'string' || data.userId.length < 1 || data.userId.length > 128) {
    violations.push('userId deve ser string entre 1 e 128 caracteres.');
  }
  if (data.role !== 'produtor_conteudo' && data.role !== 'colaborador') {
    violations.push('role deve ser "produtor_conteudo" ou "colaborador".');
  }
  if (data.environmentMode !== 'production') {
    violations.push('environmentMode deve ser estritamente "production".');
  }

  const checkIntRange = (field: string, min: number, max: number) => {
    const val = data[field];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < min || val > max) {
      violations.push(`${field} deve ser inteiro entre ${min} e ${max}.`);
    }
  };

  checkIntRange('approvedPublishedMediaCount', 0, 1000000);
  checkIntRange('collaboratorVerifiedActionsCount', 0, 1000000);
  checkIntRange('eligibleMutualAndChatInteractionsCount', 0, 1000000);
  checkIntRange('validLiveSessionsCount', 0, 1000000);
  checkIntRange('weeklyActiveDaysCount', 0, 7);
  checkIntRange('eligibleEngagementEventsCount', 0, 1000000);
  checkIntRange('pontosConquistados', 0, 1000000);
  checkIntRange('levelNumber', 1, 10);
  checkIntRange('desafiosConcluidosCount', 0, 5);

  return {
    valid: violations.length === 0,
    checkedFieldsCount: 12,
    violations,
  };
}

/**
 * Constrói o payload canônico e validado para a coleção protegida /talent_progress/{userId}.
 * Bloqueia imediatamente qualquer tentativa de construção em Modo Simulação.
 */
export function buildAuditedTalentFirestorePayload(
  userId = 'current_user',
  role: TalentParticipantRole = 'produtor_conteudo',
  mode: RuntimeEnvironmentMode = runtimeEnvironmentService.getMode()
): TalentProgressFirestorePayload {
  if (mode !== 'production') {
    throw new Error(
      'ISOLATION_GUARD: Proibido construir payload de /talent_progress em Modo Simulação.'
    );
  }

  const resolvedUserId =
    (userId && userId !== 'current_user' ? userId : auth.currentUser?.uid || 'current_user')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128) || 'current_user';

  const snapshot = collectAuditedTalentActivity(resolvedUserId, role, 'production');
  const dashboardState = buildTalentDashboardStateByEnvironment({
    role,
    userId: resolvedUserId,
    mode: 'production',
  });

  const clampInt = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(Number.isFinite(val) ? val : min)));

  return {
    userId: resolvedUserId,
    role,
    environmentMode: 'production',
    approvedPublishedMediaCount: clampInt(snapshot.approvedPublishedMediaCount, 0, 1000000),
    collaboratorVerifiedActionsCount: clampInt(
      snapshot.collaboratorVerifiedActionsCount,
      0,
      1000000
    ),
    eligibleMutualAndChatInteractionsCount: clampInt(
      snapshot.eligibleMutualAndChatInteractionsCount,
      0,
      1000000
    ),
    validLiveSessionsCount: clampInt(snapshot.validLiveSessionsCount, 0, 1000000),
    weeklyActiveDaysCount: clampInt(snapshot.weeklyActiveDaysCount, 0, 7),
    eligibleEngagementEventsCount: clampInt(snapshot.eligibleEngagementEventsCount, 0, 1000000),
    pontosConquistados: clampInt(dashboardState.indicators.pontosConquistados, 0, 1000000),
    levelNumber: clampInt(dashboardState.currentLevel.levelNumber, 1, 10),
    desafiosConcluidosCount: clampInt(dashboardState.indicators.desafiosConcluidosCount, 0, 5),
  };
}

/**
 * Sincroniza o snapshot auditado de collectAuditedTalentActivity com a coleção protegida
 * /talent_progress/{userId} no Cloud Firestore quando em Modo Produção.
 * Mantém isolamento total em relação ao Modo Simulação e à coleção /ledger_entries.
 */
export async function syncAuditedTalentActivityToCloud(options?: {
  userId?: string;
  role?: TalentParticipantRole;
  mode?: RuntimeEnvironmentMode;
  overrideAuthenticatedUid?: string;
  cloudWriter?: (
    payload: TalentProgressFirestorePayload,
    overrideAuthenticatedUid?: string
  ) => Promise<boolean>;
}): Promise<TalentCloudSyncResult> {
  const role = options?.role || 'produtor_conteudo';
  const mode = options?.mode || runtimeEnvironmentService.getMode();
  const effectiveAuthUid = options?.overrideAuthenticatedUid || auth.currentUser?.uid;
  const rawUserId =
    options?.userId && options.userId !== 'current_user'
      ? options.userId
      : effectiveAuthUid || 'current_user';
  const safeUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || 'current_user';
  const stateKey = `${safeUserId}:${role}`;

  if (mode !== 'production') {
    const blockedResult: TalentCloudSyncResult = {
      status: 'blocked_simulation',
      cloudPersisted: false,
      collectionPath: null,
      lastSyncedAtIso: null,
      payload: null,
      message:
        'Sincronização na nuvem bloqueada: Modo Simulação isolado de /talent_progress no Firestore.',
    };
    lastTalentSyncStateByUserAndRole.set(stateKey, blockedResult);
    return blockedResult;
  }

  const nowIso = new Date().toISOString();
  const payload = buildAuditedTalentFirestorePayload(safeUserId, role, 'production');
  const collectionPath = `/talent_progress/${payload.userId}`;
  const writer = options?.cloudWriter || syncTalentProgressToFirestore;

  try {
    const cloudPersisted = await writer(payload, effectiveAuthUid);
    const result: TalentCloudSyncResult = {
      status: cloudPersisted ? 'synced_cloud' : 'synced_local_audit',
      cloudPersisted,
      collectionPath,
      lastSyncedAtIso: nowIso,
      payload,
      message: cloudPersisted
        ? `Snapshot auditado sincronizado no Firestore (${collectionPath}) sem impacto em /ledger_entries.`
        : `Snapshot auditado validado localmente (${collectionPath}); autentique-se para persistência em nuvem.`,
    };
    lastTalentSyncStateByUserAndRole.set(stateKey, result);

    const pendingQueue = loadPendingLocalAuditQueue();
    if (!cloudPersisted) {
      pendingQueue[stateKey] = result;
    } else {
      delete pendingQueue[stateKey];
      delete pendingQueue[`current_user:${role}`];
    }
    savePendingLocalAuditQueue(pendingQueue);

    return result;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const fallbackResult: TalentCloudSyncResult = {
      status: 'error',
      cloudPersisted: false,
      collectionPath,
      lastSyncedAtIso: nowIso,
      payload,
      message: `Auditoria local preservada; falha na gravação remota em ${collectionPath}: ${errMsg.slice(0, 120)}`,
    };
    lastTalentSyncStateByUserAndRole.set(stateKey, fallbackResult);
    const pendingQueue = loadPendingLocalAuditQueue();
    pendingQueue[stateKey] = fallbackResult;
    savePendingLocalAuditQueue(pendingQueue);
    return fallbackResult;
  }
}

export function getLastAuditedTalentSyncState(
  userId = 'current_user',
  role: TalentParticipantRole = 'produtor_conteudo'
): TalentCloudSyncResult | null {
  const safeUserId =
    (userId && userId !== 'current_user' ? userId : auth.currentUser?.uid || 'current_user')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128) || 'current_user';
  const key = `${safeUserId}:${role}`;
  if (lastTalentSyncStateByUserAndRole.has(key)) {
    return lastTalentSyncStateByUserAndRole.get(key) || null;
  }
  const pendingQueue = loadPendingLocalAuditQueue();
  return pendingQueue[key] || null;
}

/**
 * Reconcilia automaticamente todos os snapshots locais pendentes (synced_local_audit)
 * para a conta autenticada no Firebase Auth quando em Modo Produção.
 */
export async function reconcilePendingLocalTalentAuditsOnAuth(
  authenticatedUid: string,
  options?: {
    preferredRole?: TalentParticipantRole;
    mode?: RuntimeEnvironmentMode;
    cloudWriter?: (
      payload: TalentProgressFirestorePayload,
      overrideAuthenticatedUid?: string
    ) => Promise<boolean>;
  }
): Promise<TalentAuthReconciliationResult> {
  const cleanUid = (authenticatedUid || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const mode = options?.mode || runtimeEnvironmentService.getMode();

  if (!cleanUid || cleanUid === 'current_user' || mode !== 'production') {
    return {
      authenticatedUid: cleanUid || 'unauthenticated',
      reconciledCount: 0,
      rolesReconciled: [],
      results: [],
      message:
        mode !== 'production'
          ? 'Reconciliação ignorada: ambiente em Modo Simulação.'
          : 'Nenhum usuário autenticado elegível para reconciliação.',
    };
  }

  const pendingQueue = loadPendingLocalAuditQueue();
  const rolesToReconcile = new Set<TalentParticipantRole>();

  if (options?.preferredRole) {
    rolesToReconcile.add(options.preferredRole);
  }

  for (const [stateKey, item] of Object.entries(pendingQueue)) {
    if (item && !item.cloudPersisted && item.payload?.environmentMode === 'production') {
      const [recordedUserId, recordedRole] = stateKey.split(':');
      if (recordedUserId && recordedUserId !== cleanUid) {
        migrateLocalAuditedCountersToAuthenticatedUid(recordedUserId, cleanUid);
      }
      if (recordedRole === 'produtor_conteudo' || recordedRole === 'colaborador') {
        rolesToReconcile.add(recordedRole);
      }
    }
  }

  for (const [stateKey, item] of lastTalentSyncStateByUserAndRole.entries()) {
    if (item && !item.cloudPersisted && item.payload?.environmentMode === 'production') {
      const [recordedUserId, recordedRole] = stateKey.split(':');
      if (recordedUserId && recordedUserId !== cleanUid) {
        migrateLocalAuditedCountersToAuthenticatedUid(recordedUserId, cleanUid);
      }
      if (recordedRole === 'produtor_conteudo' || recordedRole === 'colaborador') {
        rolesToReconcile.add(recordedRole);
      }
    }
  }

  // Garante migração de contadores registrados sob 'current_user' antes do login
  migrateLocalAuditedCountersToAuthenticatedUid('current_user', cleanUid);

  if (rolesToReconcile.size === 0) {
    rolesToReconcile.add('produtor_conteudo');
  }

  const results: TalentCloudSyncResult[] = [];
  const rolesReconciled: TalentParticipantRole[] = [];

  for (const role of rolesToReconcile) {
    const syncRes = await syncAuditedTalentActivityToCloud({
      userId: cleanUid,
      role,
      mode: 'production',
      overrideAuthenticatedUid: cleanUid,
      cloudWriter: options?.cloudWriter,
    });
    results.push(syncRes);
    if (syncRes.cloudPersisted) {
      rolesReconciled.push(role);
      // Limpa entradas locais anteriores de visitantes
      for (const key of Object.keys(pendingQueue)) {
        if (key.endsWith(`:${role}`)) {
          delete pendingQueue[key];
        }
      }
      lastTalentSyncStateByUserAndRole.delete(`current_user:${role}`);
    }
  }

  savePendingLocalAuditQueue(pendingQueue);

  return {
    authenticatedUid: cleanUid,
    reconciledCount: rolesReconciled.length,
    rolesReconciled,
    results,
    message:
      rolesReconciled.length > 0
        ? `Snapshots locais reconciliados automaticamente no Firestore (/talent_progress/${cleanUid}) para ${rolesReconciled.length} perspectiva(s).`
        : `Snapshot auditado validado para ${cleanUid}.`,
  };
}

function normalizeTimestampIso(raw: unknown, fallbackIso: string): string {
  if (!raw) return fallbackIso;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    const maybeTs = raw as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      try {
        return maybeTs.toDate().toISOString();
      } catch {
        return fallbackIso;
      }
    }
    if (typeof maybeTs.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000).toISOString();
    }
  }
  return fallbackIso;
}

/**
 * Lista, valida e filtra todos os snapshots auditados de /talent_progress/{userId}
 * para inspeção administrativa na aba de Criadores do CentralAdminDashboardModal.
 * Jamais inclui registros de Modo Simulação.
 */
export function listAuditedTalentSnapshotsForAdmin(options?: {
  cloudRecords?: Array<Record<string, unknown>>;
  includeCurrentSessionAudit?: boolean;
  searchQuery?: string;
  roleFilter?: 'all' | TalentParticipantRole;
  sourceFilter?: 'all' | 'firestore_cloud' | 'local_audit_pending';
  completionFilter?: 'all' | 'completed_all' | 'in_progress' | 'not_started';
}): AuditedTalentAdminRecord[] {
  const recordsMap = new Map<string, AuditedTalentAdminRecord>();
  const nowIso = new Date().toISOString();
  const clampInt = (val: unknown, min: number, max: number) => {
    const num = Number(val);
    return Math.max(min, Math.min(max, Math.round(Number.isFinite(num) ? num : min)));
  };

  // 1. Processa registros vindos diretamente da coleção /talent_progress no Firestore
  const cloudRecords = Array.isArray(options?.cloudRecords) ? options.cloudRecords : [];
  for (const docData of cloudRecords) {
    if (!docData || docData.environmentMode !== 'production') continue;
    const userId = String(docData.userId || docData.id || '').trim();
    if (!userId) continue;
    const role: TalentParticipantRole =
      docData.role === 'colaborador' ? 'colaborador' : 'produtor_conteudo';

    const canonicalPayload: TalentProgressFirestorePayload = {
      userId,
      role,
      environmentMode: 'production',
      approvedPublishedMediaCount: clampInt(docData.approvedPublishedMediaCount, 0, 1000000),
      collaboratorVerifiedActionsCount: clampInt(
        docData.collaboratorVerifiedActionsCount,
        0,
        1000000
      ),
      eligibleMutualAndChatInteractionsCount: clampInt(
        docData.eligibleMutualAndChatInteractionsCount,
        0,
        1000000
      ),
      validLiveSessionsCount: clampInt(docData.validLiveSessionsCount, 0, 1000000),
      weeklyActiveDaysCount: clampInt(docData.weeklyActiveDaysCount, 0, 7),
      eligibleEngagementEventsCount: clampInt(docData.eligibleEngagementEventsCount, 0, 1000000),
      pontosConquistados: clampInt(docData.pontosConquistados, 0, 1000000),
      levelNumber: clampInt(docData.levelNumber, 1, 10),
      desafiosConcluidosCount: clampInt(docData.desafiosConcluidosCount, 0, 5),
    };

    const recordKey = `cloud:${userId}:${role}`;
    recordsMap.set(recordKey, {
      ...canonicalPayload,
      recordKey,
      roleLabel: role === 'produtor_conteudo' ? 'Produtor de Conteúdo' : 'Colaborador & Indicador',
      source: 'firestore_cloud',
      sourceLabel: 'Firestore (Nuvem)',
      cloudPersisted: true,
      collectionPath: `/talent_progress/${userId}`,
      updatedAtIso: normalizeTimestampIso(docData.updatedAt || docData.createdAt, nowIso),
      schemaValidation: validateTalentProgressSnapshotSchema(canonicalPayload),
      canonicalPayload,
    });
  }

  // 2. Processa snapshots locais auditados em memória e na fila de produção
  const pendingQueue = loadPendingLocalAuditQueue();
  const combinedLocalEntries: Array<[string, TalentCloudSyncResult]> = [
    ...Object.entries(pendingQueue),
    ...Array.from(lastTalentSyncStateByUserAndRole.entries()),
  ];

  for (const [, syncResult] of combinedLocalEntries) {
    if (!syncResult || !syncResult.payload) continue;
    if (syncResult.payload.environmentMode !== 'production') continue;
    const p = syncResult.payload;
    const cloudKey = `cloud:${p.userId}:${p.role}`;
    if (recordsMap.has(cloudKey)) continue;

    const isCloud = syncResult.cloudPersisted || syncResult.status === 'synced_cloud';
    const recordKey = `${isCloud ? 'cloud' : 'local'}:${p.userId}:${p.role}`;
    recordsMap.set(recordKey, {
      ...p,
      recordKey,
      roleLabel:
        p.role === 'produtor_conteudo' ? 'Produtor de Conteúdo' : 'Colaborador & Indicador',
      source: isCloud ? 'firestore_cloud' : 'local_audit_pending',
      sourceLabel: isCloud ? 'Firestore (Nuvem)' : 'Auditoria Local (Pendente Login)',
      cloudPersisted: isCloud,
      collectionPath: syncResult.collectionPath || `/talent_progress/${p.userId}`,
      updatedAtIso: syncResult.lastSyncedAtIso || nowIso,
      schemaValidation: validateTalentProgressSnapshotSchema(p),
      canonicalPayload: p,
    });
  }

  // 3. Se solicitado (padrão no painel admin), garante apuração auditada da sessão ativa em produção
  if (options?.includeCurrentSessionAudit !== false && recordsMap.size === 0) {
    const activeUid = auth.currentUser?.uid || 'current_user';
    for (const role of ['produtor_conteudo', 'colaborador'] as const) {
      const payload = buildAuditedTalentFirestorePayload(activeUid, role, 'production');
      const recordKey = `local:${payload.userId}:${role}`;
      recordsMap.set(recordKey, {
        ...payload,
        recordKey,
        roleLabel:
          role === 'produtor_conteudo' ? 'Produtor de Conteúdo' : 'Colaborador & Indicador',
        source: 'local_audit_pending',
        sourceLabel: 'Auditoria Local (Sessão Atual)',
        cloudPersisted: false,
        collectionPath: `/talent_progress/${payload.userId}`,
        updatedAtIso: nowIso,
        schemaValidation: validateTalentProgressSnapshotSchema(payload),
        canonicalPayload: payload,
      });
    }
  }

  let list = Array.from(recordsMap.values());

  // Aplicação determinística dos filtros
  const roleFilter = options?.roleFilter || 'all';
  if (roleFilter !== 'all') {
    list = list.filter((item) => item.role === roleFilter);
  }

  const sourceFilter = options?.sourceFilter || 'all';
  if (sourceFilter !== 'all') {
    list = list.filter((item) => item.source === sourceFilter);
  }

  const completionFilter = options?.completionFilter || 'all';
  if (completionFilter === 'completed_all') {
    list = list.filter((item) => item.desafiosConcluidosCount >= 5);
  } else if (completionFilter === 'in_progress') {
    list = list.filter(
      (item) => item.desafiosConcluidosCount >= 1 && item.desafiosConcluidosCount < 5
    );
  } else if (completionFilter === 'not_started') {
    list = list.filter((item) => item.desafiosConcluidosCount === 0);
  }

  const queryText = (options?.searchQuery || '').trim().toLowerCase();
  if (queryText) {
    list = list.filter(
      (item) =>
        item.userId.toLowerCase().includes(queryText) ||
        item.roleLabel.toLowerCase().includes(queryText) ||
        item.collectionPath.toLowerCase().includes(queryText) ||
        item.sourceLabel.toLowerCase().includes(queryText)
    );
  }

  return list.sort((a, b) => {
    if (b.pontosConquistados !== a.pontosConquistados) {
      return b.pontosConquistados - a.pontosConquistados;
    }
    return b.updatedAtIso.localeCompare(a.updatedAtIso);
  });
}


