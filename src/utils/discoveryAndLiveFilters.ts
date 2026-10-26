/**
 * JOBS — UTILITÁRIO COMPLEMENTAR DE FILTROS PARA DESCOBERTAS E LIVES
 *
 * Responsabilidades:
 * 1. Filtrar perfis em Descobertas e transmissões/criadores em Lives por:
 *    - Sexo (opções do produto + seleção inclusiva + "Todos")
 *    - Orientação sexual (seleção de uma ou mais opções + "Não informado" + "Todos")
 *    - Idade (idade mínima e máxima com validação estrita de intervalo >= 18)
 *    - Localização (cidade ou região com opção "Qualquer localização", sem GPS preciso)
 * 2. Respeitar privacidade (hideSexualOrientation, hideAge, hideCity) e campos opcionais ausentes.
 * 3. Jamais expor orientação sexual ou dados pessoais em URLs, query strings ou logs públicos.
 * 4. Preservar os filtros em memória durante a navegação entre resultados da mesma tela.
 */

import { Profile } from '../types';
import { INITIAL_PROFILES } from '../data/mockData';
import { LiveSessionModel } from '../services/liveStreamService';

export type FilterGenderOption = 'todos' | 'mulher' | 'homem' | 'trans' | 'nao_informado';

export type FilterSexualOrientationOption =
  | 'hetero'
  | 'bi'
  | 'gay'
  | 'lesbica'
  | 'pan'
  | 'nao_informado';

export interface DiscoveryAndLiveFilterCriteria {
  gender: FilterGenderOption;
  /** Lista vazia [] representa "Todos" (qualquer orientação sexual, incluindo não informado) */
  sexualOrientations: FilterSexualOrientationOption[];
  minAge: number | null;
  maxAge: number | null;
  /** 'all' ou string vazia representa "Qualquer localização" */
  location: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

export interface AppliedFilterChip {
  key: 'gender' | 'sexualOrientations' | 'age' | 'location';
  label: string;
}

export interface FilteredProfilesResult {
  filteredProfiles: Profile[];
  totalAvailableBeforeFilter: number;
  activeFiltersCount: number;
  isAnyFilterActive: boolean;
  appliedChips: AppliedFilterChip[];
  validation: FilterValidationResult;
  omittedByMissingOrPrivateDataCount: number;
  dataLimitationsNotice: string | null;
}

export interface FilteredLivesResult {
  filteredSessions: LiveSessionModel[];
  totalAvailableBeforeFilter: number;
  activeFiltersCount: number;
  isAnyFilterActive: boolean;
  appliedChips: AppliedFilterChip[];
  validation: FilterValidationResult;
  omittedByMissingOrPrivateDataCount: number;
  unmappedCreatorMetadataCount: number;
  dataLimitationsNotice: string | null;
}

export const GENDER_FILTER_OPTIONS: ReadonlyArray<{
  value: FilterGenderOption;
  label: string;
}> = [
  { value: 'todos', label: 'Todos' },
  { value: 'mulher', label: 'Mulher' },
  { value: 'homem', label: 'Homem' },
  { value: 'trans', label: 'Trans' },
  { value: 'nao_informado', label: 'Não informado' },
];

export const SEXUAL_ORIENTATION_FILTER_OPTIONS: ReadonlyArray<{
  value: FilterSexualOrientationOption;
  label: string;
}> = [
  { value: 'hetero', label: 'Heterossexual' },
  { value: 'bi', label: 'Bissexual' },
  { value: 'gay', label: 'Gay / Homossexual' },
  { value: 'lesbica', label: 'Lésbica' },
  { value: 'pan', label: 'Pansexual' },
  { value: 'nao_informado', label: 'Não informado' },
];

export const PRESET_LOCATIONS: ReadonlyArray<string> = [
  'Qualquer localização',
  'São Paulo',
  'Rio de Janeiro',
  'Curitiba',
  'Belo Horizonte',
];

export const DEFAULT_FILTER_CRITERIA: Readonly<DiscoveryAndLiveFilterCriteria> = Object.freeze({
  gender: 'todos',
  sexualOrientations: [],
  minAge: null,
  maxAge: null,
  location: 'all',
});

export function createDefaultFilterCriteria(): DiscoveryAndLiveFilterCriteria {
  return {
    gender: 'todos',
    sexualOrientations: [],
    minAge: null,
    maxAge: null,
    location: 'all',
  };
}

/**
 * Normaliza texto para comparação insensível a maiúsculas/minúsculas e acentuação.
 */
export function normalizeTextForFilter(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Valida os critérios de filtro, impedindo intervalos de idade inválidos (ex: minAge > maxAge ou < 18).
 */
export function validateFilterCriteria(
  criteria: DiscoveryAndLiveFilterCriteria
): FilterValidationResult {
  const { minAge, maxAge } = criteria;

  if (minAge !== null && minAge !== undefined) {
    if (typeof minAge !== 'number' || !Number.isFinite(minAge)) {
      return {
        isValid: false,
        errorMessage: 'A idade mínima informada é inválida.',
      };
    }
    if (minAge < 18) {
      return {
        isValid: false,
        errorMessage: 'A idade mínima permitida no JOBS (+18) é de 18 anos.',
      };
    }
    if (minAge > 120) {
      return {
        isValid: false,
        errorMessage: 'A idade mínima não pode exceder 120 anos.',
      };
    }
  }

  if (maxAge !== null && maxAge !== undefined) {
    if (typeof maxAge !== 'number' || !Number.isFinite(maxAge)) {
      return {
        isValid: false,
        errorMessage: 'A idade máxima informada é inválida.',
      };
    }
    if (maxAge < 18) {
      return {
        isValid: false,
        errorMessage: 'A idade máxima deve ser de pelo menos 18 anos.',
      };
    }
    if (maxAge > 120) {
      return {
        isValid: false,
        errorMessage: 'A idade máxima não pode exceder 120 anos.',
      };
    }
  }

  if (
    minAge !== null &&
    minAge !== undefined &&
    maxAge !== null &&
    maxAge !== undefined &&
    minAge > maxAge
  ) {
    return {
      isValid: false,
      errorMessage:
        'Intervalo de idade inválido: a idade mínima não pode ser maior que a idade máxima.',
    };
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}

/**
 * Constrói a lista de chips visuais representando os filtros ativos.
 */
export function buildAppliedFilterChips(
  criteria: DiscoveryAndLiveFilterCriteria
): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = [];

  if (criteria.gender && criteria.gender !== 'todos') {
    const found = GENDER_FILTER_OPTIONS.find((g) => g.value === criteria.gender);
    chips.push({
      key: 'gender',
      label: `Sexo: ${found ? found.label : criteria.gender}`,
    });
  }

  if (Array.isArray(criteria.sexualOrientations) && criteria.sexualOrientations.length > 0) {
    const labels = criteria.sexualOrientations.map((val) => {
      const found = SEXUAL_ORIENTATION_FILTER_OPTIONS.find((o) => o.value === val);
      return found ? found.label : val;
    });
    chips.push({
      key: 'sexualOrientations',
      label: `Orientação: ${labels.join(', ')}`,
    });
  }

  const hasMinAge = criteria.minAge !== null && criteria.minAge !== undefined;
  const hasMaxAge = criteria.maxAge !== null && criteria.maxAge !== undefined;
  if (hasMinAge || hasMaxAge) {
    if (hasMinAge && hasMaxAge) {
      chips.push({
        key: 'age',
        label: `Idade: ${criteria.minAge} a ${criteria.maxAge} anos`,
      });
    } else if (hasMinAge) {
      chips.push({
        key: 'age',
        label: `Idade: A partir de ${criteria.minAge} anos`,
      });
    } else if (hasMaxAge) {
      chips.push({
        key: 'age',
        label: `Idade: Até ${criteria.maxAge} anos`,
      });
    }
  }

  const normalizedLoc = normalizeTextForFilter(criteria.location);
  if (
    normalizedLoc &&
    normalizedLoc !== 'all' &&
    normalizedLoc !== 'qualquer localizacao' &&
    normalizedLoc !== 'todas'
  ) {
    chips.push({
      key: 'location',
      label: `Localização: ${criteria.location.trim()}`,
    });
  }

  return chips;
}

/**
 * Resolve o sexo público de um registro respeitando dados opcionais.
 */
function resolvePublicGender(rawGender?: string | null): FilterGenderOption {
  if (!rawGender || typeof rawGender !== 'string') return 'nao_informado';
  const norm = rawGender.trim().toLowerCase();
  if (norm === 'mulher' || norm === 'homem' || norm === 'trans') {
    return norm;
  }
  return 'nao_informado';
}

/**
 * Resolve a orientação sexual pública respeitando flags de privacidade e campos não informados.
 */
function resolvePublicSexualOrientation(
  rawOrientation?: string | null,
  hideSexualOrientation?: boolean
): FilterSexualOrientationOption {
  if (hideSexualOrientation === true) {
    return 'nao_informado';
  }
  if (!rawOrientation || typeof rawOrientation !== 'string') {
    return 'nao_informado';
  }
  const norm = rawOrientation.trim().toLowerCase();
  if (
    norm === 'hetero' ||
    norm === 'bi' ||
    norm === 'gay' ||
    norm === 'lesbica' ||
    norm === 'pan'
  ) {
    return norm;
  }
  return 'nao_informado';
}

/**
 * Filtra a lista de perfis da tela Descobertas (Screen09Discover).
 */
export function filterDiscoverProfiles(
  profiles: Profile[],
  criteria: DiscoveryAndLiveFilterCriteria,
  blockedUserIds: string[] = []
): FilteredProfilesResult {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const availableProfiles = safeProfiles.filter((p) => p && !blockedUserIds.includes(p.id));
  const validation = validateFilterCriteria(criteria);
  const appliedChips = buildAppliedFilterChips(criteria);
  const activeFiltersCount = appliedChips.length;
  const isAnyFilterActive = activeFiltersCount > 0;

  if (!validation.isValid) {
    return {
      filteredProfiles: [],
      totalAvailableBeforeFilter: availableProfiles.length,
      activeFiltersCount,
      isAnyFilterActive,
      appliedChips,
      validation,
      omittedByMissingOrPrivateDataCount: 0,
      dataLimitationsNotice: validation.errorMessage,
    };
  }

  let omittedByMissingOrPrivateDataCount = 0;

  const hasMinAge = criteria.minAge !== null && criteria.minAge !== undefined;
  const hasMaxAge = criteria.maxAge !== null && criteria.maxAge !== undefined;
  const isAgeFilterActive = hasMinAge || hasMaxAge;

  const normalizedLocationFilter = normalizeTextForFilter(criteria.location);
  const isLocationFilterActive =
    Boolean(normalizedLocationFilter) &&
    normalizedLocationFilter !== 'all' &&
    normalizedLocationFilter !== 'qualquer localizacao' &&
    normalizedLocationFilter !== 'todas';

  const isOrientationFilterActive =
    Array.isArray(criteria.sexualOrientations) && criteria.sexualOrientations.length > 0;

  const filteredProfiles = availableProfiles.filter((profile) => {
    // 1. Filtro de Sexo
    if (criteria.gender !== 'todos') {
      const profileGender = resolvePublicGender(profile.gender);
      if (profileGender !== criteria.gender) {
        return false;
      }
    }

    // 2. Filtro de Orientação Sexual (uma ou mais opções + Não informado + respeito à privacidade)
    if (isOrientationFilterActive) {
      const publicOrientation = resolvePublicSexualOrientation(
        profile.sexualOrientation,
        profile.hideSexualOrientation
      );
      if (!criteria.sexualOrientations.includes(publicOrientation)) {
        if (publicOrientation === 'nao_informado') {
          omittedByMissingOrPrivateDataCount += 1;
        }
        return false;
      }
    }

    // 3. Filtro de Idade (mínima e máxima)
    if (isAgeFilterActive) {
      const hasValidPublicAge =
        profile.hideAge !== true &&
        typeof profile.age === 'number' &&
        Number.isFinite(profile.age) &&
        profile.age >= 18;

      if (!hasValidPublicAge) {
        omittedByMissingOrPrivateDataCount += 1;
        return false;
      }

      if (hasMinAge && profile.age < (criteria.minAge as number)) {
        return false;
      }
      if (hasMaxAge && profile.age > (criteria.maxAge as number)) {
        return false;
      }
    }

    // 4. Filtro de Localização (Cidade ou Região, sem GPS preciso)
    if (isLocationFilterActive) {
      const hasValidPublicCity =
        profile.hideCity !== true &&
        typeof profile.city === 'string' &&
        profile.city.trim().length > 0;

      if (!hasValidPublicCity) {
        omittedByMissingOrPrivateDataCount += 1;
        return false;
      }

      const normalizedProfileCity = normalizeTextForFilter(profile.city);
      if (!normalizedProfileCity.includes(normalizedLocationFilter)) {
        return false;
      }
    }

    return true;
  });

  const dataLimitationsNotice =
    omittedByMissingOrPrivateDataCount > 0
      ? `${omittedByMissingOrPrivateDataCount} perfil(is) com dados opcionais não informados ou ocultos por privacidade não pôde/puderam ser verificado(s) para todos os filtros restritivos ativos.`
      : null;

  return {
    filteredProfiles,
    totalAvailableBeforeFilter: availableProfiles.length,
    activeFiltersCount,
    isAnyFilterActive,
    appliedChips,
    validation,
    omittedByMissingOrPrivateDataCount,
    dataLimitationsNotice,
  };
}

/**
 * Filtra as transmissões ao vivo (LiveSessionModel) cruzando com os dados públicos
 * dos criadores correspondentes (INITIAL_PROFILES ou catálogo injetado).
 */
export function filterLiveSessions(
  sessions: LiveSessionModel[],
  criteria: DiscoveryAndLiveFilterCriteria,
  profilesCatalog: Profile[] = INITIAL_PROFILES,
  blockedUserIds: string[] = []
): FilteredLivesResult {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const availableSessions = safeSessions.filter(
    (s) => s && !blockedUserIds.includes(s.hostCreatorId)
  );
  const validation = validateFilterCriteria(criteria);
  const appliedChips = buildAppliedFilterChips(criteria);
  const activeFiltersCount = appliedChips.length;
  const isAnyFilterActive = activeFiltersCount > 0;

  if (!validation.isValid) {
    return {
      filteredSessions: [],
      totalAvailableBeforeFilter: availableSessions.length,
      activeFiltersCount,
      isAnyFilterActive,
      appliedChips,
      validation,
      omittedByMissingOrPrivateDataCount: 0,
      unmappedCreatorMetadataCount: 0,
      dataLimitationsNotice: validation.errorMessage,
    };
  }

  // Mapa rápido de criadores para enriquecer idade e localização sem inventar dados
  const profileById = new Map<string, Profile>();
  if (Array.isArray(profilesCatalog)) {
    for (const p of profilesCatalog) {
      if (p && p.id) {
        profileById.set(p.id.toLowerCase(), p);
      }
    }
  }

  const hasMinAge = criteria.minAge !== null && criteria.minAge !== undefined;
  const hasMaxAge = criteria.maxAge !== null && criteria.maxAge !== undefined;
  const isAgeFilterActive = hasMinAge || hasMaxAge;

  const normalizedLocationFilter = normalizeTextForFilter(criteria.location);
  const isLocationFilterActive =
    Boolean(normalizedLocationFilter) &&
    normalizedLocationFilter !== 'all' &&
    normalizedLocationFilter !== 'qualquer localizacao' &&
    normalizedLocationFilter !== 'todas';

  const isOrientationFilterActive =
    Array.isArray(criteria.sexualOrientations) && criteria.sexualOrientations.length > 0;

  let omittedByMissingOrPrivateDataCount = 0;
  let unmappedCreatorMetadataCount = 0;

  const filteredSessions = availableSessions.filter((session) => {
    const hostProfile = profileById.get((session.hostCreatorId || '').toLowerCase());

    // Co-participantes de batalha ou palco para permitir encontrar qualquer criador ao vivo na transmissão
    const secondaryCreatorIds: string[] = [];
    if (session.battleState) {
      if (session.battleState.creator1?.id) secondaryCreatorIds.push(session.battleState.creator1.id);
      if (session.battleState.creator2?.id) secondaryCreatorIds.push(session.battleState.creator2.id);
    }
    if (Array.isArray(session.stageParticipants)) {
      for (const sp of session.stageParticipants) {
        if (sp?.userId) secondaryCreatorIds.push(sp.userId);
      }
    }

    const candidateProfiles: Profile[] = [];
    if (hostProfile) candidateProfiles.push(hostProfile);
    for (const cid of secondaryCreatorIds) {
      const found = profileById.get(cid.toLowerCase());
      if (found && !candidateProfiles.some((cp) => cp.id === found.id)) {
        candidateProfiles.push(found);
      }
    }

    // 1. Filtro de Sexo
    if (criteria.gender !== 'todos') {
      const sessionGender = resolvePublicGender(session.gender || hostProfile?.gender);
      const anyParticipantMatchesGender =
        sessionGender === criteria.gender ||
        candidateProfiles.some((cp) => resolvePublicGender(cp.gender) === criteria.gender);

      if (!anyParticipantMatchesGender) {
        return false;
      }
    }

    // 2. Filtro de Orientação Sexual
    if (isOrientationFilterActive) {
      const hostOrientation = resolvePublicSexualOrientation(
        hostProfile?.hideSexualOrientation ? undefined : session.sexualOrientation || hostProfile?.sexualOrientation,
        hostProfile?.hideSexualOrientation
      );
      const anyParticipantMatchesOrientation =
        criteria.sexualOrientations.includes(hostOrientation) ||
        candidateProfiles.some((cp) =>
          criteria.sexualOrientations.includes(
            resolvePublicSexualOrientation(cp.sexualOrientation, cp.hideSexualOrientation)
          )
        );

      if (!anyParticipantMatchesOrientation) {
        if (hostOrientation === 'nao_informado') {
          omittedByMissingOrPrivateDataCount += 1;
        }
        return false;
      }
    }

    // 3. Filtro de Idade (consultado no perfil real do criador; se inexistente, informa limitação sem inventar idade)
    if (isAgeFilterActive) {
      const profilesWithPublicAge = candidateProfiles.filter(
        (cp) =>
          cp.hideAge !== true &&
          typeof cp.age === 'number' &&
          Number.isFinite(cp.age) &&
          cp.age >= 18
      );

      if (profilesWithPublicAge.length === 0) {
        unmappedCreatorMetadataCount += 1;
        omittedByMissingOrPrivateDataCount += 1;
        return false;
      }

      const matchesAge = profilesWithPublicAge.some((cp) => {
        if (hasMinAge && cp.age < (criteria.minAge as number)) return false;
        if (hasMaxAge && cp.age > (criteria.maxAge as number)) return false;
        return true;
      });

      if (!matchesAge) {
        return false;
      }
    }

    // 4. Filtro de Localização (consultado no perfil real do criador; se inexistente, informa limitação sem inventar cidade)
    if (isLocationFilterActive) {
      const profilesWithPublicCity = candidateProfiles.filter(
        (cp) =>
          cp.hideCity !== true &&
          typeof cp.city === 'string' &&
          cp.city.trim().length > 0
      );

      if (profilesWithPublicCity.length === 0) {
        unmappedCreatorMetadataCount += 1;
        omittedByMissingOrPrivateDataCount += 1;
        return false;
      }

      const matchesCity = profilesWithPublicCity.some((cp) =>
        normalizeTextForFilter(cp.city).includes(normalizedLocationFilter)
      );

      if (!matchesCity) {
        return false;
      }
    }

    return true;
  });

  let dataLimitationsNotice: string | null = null;
  if (unmappedCreatorMetadataCount > 0) {
    dataLimitationsNotice = `${unmappedCreatorMetadataCount} transmissão(ões) de criador(es) sem idade ou localização pública vinculada no cadastro não pôde/puderam ser incluída(s) no filtro específico.`;
  } else if (omittedByMissingOrPrivateDataCount > 0) {
    dataLimitationsNotice = `${omittedByMissingOrPrivateDataCount} transmissão(ões) com dados opcionais ocultos por privacidade não correspondeu/corresponderam ao filtro restritivo.`;
  }

  return {
    filteredSessions,
    totalAvailableBeforeFilter: availableSessions.length,
    activeFiltersCount,
    isAnyFilterActive,
    appliedChips,
    validation,
    omittedByMissingOrPrivateDataCount,
    unmappedCreatorMetadataCount,
    dataLimitationsNotice,
  };
}

/**
 * Estado em memória (isolado de URLs e logs externos por privacidade) para preservar
 * os filtros durante a navegação entre os resultados e sub-telas de Descobertas e Lives.
 */
let savedDiscoverFilters: DiscoveryAndLiveFilterCriteria = createDefaultFilterCriteria();
let savedLivesFilters: DiscoveryAndLiveFilterCriteria = createDefaultFilterCriteria();

const discoverFilterListeners = new Set<(criteria: DiscoveryAndLiveFilterCriteria) => void>();
const livesFilterListeners = new Set<(criteria: DiscoveryAndLiveFilterCriteria) => void>();

export function getSavedDiscoverFilters(): DiscoveryAndLiveFilterCriteria {
  return {
    ...savedDiscoverFilters,
    sexualOrientations: [...savedDiscoverFilters.sexualOrientations],
  };
}

export function setSavedDiscoverFilters(next: DiscoveryAndLiveFilterCriteria): void {
  savedDiscoverFilters = {
    gender: next.gender || 'todos',
    sexualOrientations: Array.isArray(next.sexualOrientations)
      ? [...next.sexualOrientations]
      : [],
    minAge: next.minAge ?? null,
    maxAge: next.maxAge ?? null,
    location: typeof next.location === 'string' && next.location.trim() ? next.location.trim() : 'all',
  };
  for (const listener of discoverFilterListeners) {
    try {
      listener(getSavedDiscoverFilters());
    } catch {
      // ignora erro de listener
    }
  }
}

export function resetSavedDiscoverFilters(): DiscoveryAndLiveFilterCriteria {
  const def = createDefaultFilterCriteria();
  setSavedDiscoverFilters(def);
  return def;
}

export function subscribeDiscoverFilters(
  listener: (criteria: DiscoveryAndLiveFilterCriteria) => void
): () => void {
  discoverFilterListeners.add(listener);
  return () => {
    discoverFilterListeners.delete(listener);
  };
}

export function getSavedLivesFilters(): DiscoveryAndLiveFilterCriteria {
  return {
    ...savedLivesFilters,
    sexualOrientations: [...savedLivesFilters.sexualOrientations],
  };
}

export function setSavedLivesFilters(next: DiscoveryAndLiveFilterCriteria): void {
  savedLivesFilters = {
    gender: next.gender || 'todos',
    sexualOrientations: Array.isArray(next.sexualOrientations)
      ? [...next.sexualOrientations]
      : [],
    minAge: next.minAge ?? null,
    maxAge: next.maxAge ?? null,
    location: typeof next.location === 'string' && next.location.trim() ? next.location.trim() : 'all',
  };
  for (const listener of livesFilterListeners) {
    try {
      listener(getSavedLivesFilters());
    } catch {
      // ignora erro de listener
    }
  }
}

export function resetSavedLivesFilters(): DiscoveryAndLiveFilterCriteria {
  const def = createDefaultFilterCriteria();
  setSavedLivesFilters(def);
  return def;
}

export function subscribeLivesFilters(
  listener: (criteria: DiscoveryAndLiveFilterCriteria) => void
): () => void {
  livesFilterListeners.add(listener);
  return () => {
    livesFilterListeners.delete(listener);
  };
}
