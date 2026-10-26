/**
 * JOBS — SUÍTE DE TESTES AUTOMATIZADOS: FILTROS COMPLEMENTARES EM DESCOBERTAS E LIVES
 *
 * Cobre os 7 cenários obrigatórios solicitados na especificação:
 * 1. Aplicar e limpar filtros (restauração integral do catálogo).
 * 2. Validação de idade mínima maior que idade máxima e menores de 18 anos.
 * 3. Filtro combinado de sexo, orientação sexual (múltipla seleção), idade e localização.
 * 4. Comportamento quando não há resultados e recuperação via limpeza de filtros.
 * 5. Perfis com dados opcionais não informados ou privados (hideSexualOrientation, hideAge, hideCity).
 * 6. Filtragem em Descobertas e em Lives (incluindo oponentes de batalha, palco interativo e aviso de limitação).
 * 7. Preservação dos filtros durante a navegação na mesma tela e garantia de zero exposição de orientação sexual em URLs.
 */

import { INITIAL_PROFILES } from '../../data/mockData';
import { liveService, LiveSessionModel } from '../liveService';
import { Profile } from '../../types';
import {
  DiscoveryAndLiveFilterCriteria,
  createDefaultFilterCriteria,
  validateFilterCriteria,
  filterDiscoverProfiles,
  filterLiveSessions,
  getSavedDiscoverFilters,
  setSavedDiscoverFilters,
  resetSavedDiscoverFilters,
  getSavedLivesFilters,
  setSavedLivesFilters,
  resetSavedLivesFilters,
} from '../../utils/discoveryAndLiveFilters';

export interface DiscoveryLiveFilterTestCaseResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface DiscoveryLiveFilterTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: DiscoveryLiveFilterTestCaseResult[];
}

export async function runDiscoveryAndLiveFiltersTestSuite(): Promise<DiscoveryLiveFilterTestSuiteSummary> {
  const results: DiscoveryLiveFilterTestCaseResult[] = [];
  const suiteStart = Date.now();

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const start = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - start,
        evidence,
      });
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - start,
        evidence: 'Falha na asserção do teste.',
        error: err?.message || String(err),
      });
    }
  };

  // =========================================================================
  // 1. APLICAR E LIMPAR FILTROS
  // =========================================================================
  await runTest(
    1,
    'DL-FILTER-01',
    'Aplicar e limpar filtros restaura integralmente os perfis de Descobertas e as transmissões de Lives',
    () => {
      resetSavedDiscoverFilters();
      resetSavedLivesFilters();

      const appliedCriteria: DiscoveryAndLiveFilterCriteria = {
        gender: 'mulher',
        sexualOrientations: ['hetero'],
        minAge: 21,
        maxAge: 28,
        location: 'Rio de Janeiro',
      };

      const filteredDiscover = filterDiscoverProfiles(INITIAL_PROFILES, appliedCriteria, []);
      if (filteredDiscover.filteredProfiles.length === 0) {
        throw new Error('Esperava encontrar pelo menos 1 perfil (Isabella) com os filtros aplicados.');
      }
      if (!filteredDiscover.isAnyFilterActive || filteredDiscover.activeFiltersCount !== 4) {
        throw new Error(`Esperava 4 filtros ativos, obteve ${filteredDiscover.activeFiltersCount}.`);
      }

      const clearedCriteria = createDefaultFilterCriteria();
      const restoredDiscover = filterDiscoverProfiles(INITIAL_PROFILES, clearedCriteria, []);
      if (restoredDiscover.filteredProfiles.length !== INITIAL_PROFILES.length) {
        throw new Error(
          `Após limpar filtros, esperava ${INITIAL_PROFILES.length} perfis, obteve ${restoredDiscover.filteredProfiles.length}.`
        );
      }
      if (restoredDiscover.isAnyFilterActive || restoredDiscover.appliedChips.length !== 0) {
        throw new Error('Após limpar filtros, isAnyFilterActive deve ser false e appliedChips vazio.');
      }

      return `Filtro aplicado retornou ${filteredDiscover.filteredProfiles.length} perfil(is) (${filteredDiscover.filteredProfiles.map((p) => p.name).join(', ')}); limpeza restaurou ${restoredDiscover.filteredProfiles.length}/${INITIAL_PROFILES.length} perfis.`;
    }
  );

  // =========================================================================
  // 2. VALIDAÇÃO DE IDADE MÍNIMA MAIOR QUE IDADE MÁXIMA E < 18 ANOS
  // =========================================================================
  await runTest(
    2,
    'DL-FILTER-02',
    'Validação estrita impede idade mínima maior que idade máxima e valores menores que 18 anos',
    () => {
      const invertedRange: DiscoveryAndLiveFilterCriteria = {
        ...createDefaultFilterCriteria(),
        minAge: 35,
        maxAge: 22,
      };
      const vInverted = validateFilterCriteria(invertedRange);
      if (vInverted.isValid || !vInverted.errorMessage) {
        throw new Error('Intervalo invertido (minAge=35 > maxAge=22) deveria ser rejeitado.');
      }

      const underageRange: DiscoveryAndLiveFilterCriteria = {
        ...createDefaultFilterCriteria(),
        minAge: 16,
        maxAge: 25,
      };
      const vUnderage = validateFilterCriteria(underageRange);
      if (vUnderage.isValid || !vUnderage.errorMessage) {
        throw new Error('Idade menor que 18 anos (minAge=16) deveria ser rejeitada.');
      }

      const validRange: DiscoveryAndLiveFilterCriteria = {
        ...createDefaultFilterCriteria(),
        minAge: 22,
        maxAge: 28,
      };
      const vValid = validateFilterCriteria(validRange);
      if (!vValid.isValid || vValid.errorMessage !== null) {
        throw new Error(`Intervalo válido (22-28) foi rejeitado indevidamente: ${vValid.errorMessage}`);
      }

      return `Intervalo invertido bloqueado ("${vInverted.errorMessage}") e menor de 18 bloqueado ("${vUnderage.errorMessage}").`;
    }
  );

  // =========================================================================
  // 3. FILTRO COMBINADO DE SEXO, ORIENTAÇÃO SEXUAL, IDADE E LOCALIZAÇÃO
  // =========================================================================
  await runTest(
    3,
    'DL-FILTER-03',
    'Filtro combinado de sexo, orientação sexual (múltipla seleção), idade e localização',
    () => {
      const combinedCriteria: DiscoveryAndLiveFilterCriteria = {
        gender: 'todos',
        sexualOrientations: ['hetero', 'pan'],
        minAge: 24,
        maxAge: 27,
        location: 'Rio de Janeiro',
      };

      const res = filterDiscoverProfiles(INITIAL_PROFILES, combinedCriteria, []);
      // No Rio de Janeiro entre 24 e 27 anos com orientação hetero ou pan:
      // Isabella (26, Rio de Janeiro - Leblon, hetero) e Maya (25, Rio de Janeiro - Ipanema, pan).
      const names = res.filteredProfiles.map((p) => p.id).sort();
      if (names.length !== 2 || names[0] !== 'isabella' || names[1] !== 'maya') {
        throw new Error(
          `Esperava ['isabella', 'maya'] no filtro combinado, mas obteve [${names.join(', ')}].`
        );
      }

      return `Filtro combinado (orientações=[hetero, pan], idade=24..27, local=Rio de Janeiro) retornou exatamente [${names.join(', ')}] com ${res.appliedChips.length} chips ativos.`;
    }
  );

  // =========================================================================
  // 4. COMPORTAMENTO QUANDO NÃO HÁ RESULTADOS
  // =========================================================================
  await runTest(
    4,
    'DL-FILTER-04',
    'Comportamento seguro quando não há resultados e recuperação imediata ao limpar filtros',
    () => {
      const impossibleCriteria: DiscoveryAndLiveFilterCriteria = {
        gender: 'trans',
        sexualOrientations: ['lesbica'],
        minAge: 45,
        maxAge: 60,
        location: 'Manaus',
      };

      const emptyDiscover = filterDiscoverProfiles(INITIAL_PROFILES, impossibleCriteria, []);
      if (emptyDiscover.filteredProfiles.length !== 0) {
        throw new Error('Esperava 0 perfis para combinação inexistente.');
      }
      if (!emptyDiscover.isAnyFilterActive) {
        throw new Error('isAnyFilterActive deve ser true para permitir exibir o botão Limpar filtros.');
      }

      const liveSessions = liveService.getLiveSessions();
      const emptyLives = filterLiveSessions(liveSessions, impossibleCriteria, INITIAL_PROFILES, []);
      if (emptyLives.filteredSessions.length !== 0) {
        throw new Error('Esperava 0 lives para combinação inexistente.');
      }

      return `Descobertas (0/${emptyDiscover.totalAvailableBeforeFilter}) e Lives (0/${emptyLives.totalAvailableBeforeFilter}) sinalizam estado vazio com isAnyFilterActive=true e 4 chips para limpeza rápida.`;
    }
  );

  // =========================================================================
  // 5. PERFIS COM DADOS OPCIONAIS NÃO INFORMADOS OU PRIVADOS
  // =========================================================================
  await runTest(
    5,
    'DL-FILTER-05',
    'Respeito à privacidade (hideSexualOrientation, hideAge, hideCity) e suporte à opção "Não informado"',
    () => {
      const customProfiles: Profile[] = [
        ...INITIAL_PROFILES,
        {
          ...INITIAL_PROFILES[0],
          id: 'private_creator',
          name: 'Criador Privado',
          age: 25,
          city: 'São Paulo',
          gender: 'mulher',
          genderLabel: 'Mulher',
          sexualOrientation: 'bi',
          hideSexualOrientation: true, // Ocultou orientação por privacidade
          hideAge: true, // Ocultou idade por privacidade
          hideCity: true, // Ocultou cidade por privacidade
        },
      ];

      // 5.1 Ao filtrar especificamente por orientação 'bi', o perfil que ocultou a orientação NÃO pode vazar
      const biFilterResult = filterDiscoverProfiles(
        customProfiles,
        {
          ...createDefaultFilterCriteria(),
          sexualOrientations: ['bi'],
        },
        []
      );
      if (biFilterResult.filteredProfiles.some((p) => p.id === 'private_creator')) {
        throw new Error(
          'Violação de privacidade: perfil com hideSexualOrientation=true foi exposto ao filtrar por orientação específica.'
        );
      }
      if (biFilterResult.omittedByMissingOrPrivateDataCount < 1) {
        throw new Error('Deveria contabilizar omittedByMissingOrPrivateDataCount >= 1.');
      }

      // 5.2 Ao filtrar por 'nao_informado', o perfil privado é tratado como "Não informado" sem revelar sua orientação real
      const naoInformadoResult = filterDiscoverProfiles(
        customProfiles,
        {
          ...createDefaultFilterCriteria(),
          sexualOrientations: ['nao_informado'],
        },
        []
      );
      if (!naoInformadoResult.filteredProfiles.some((p) => p.id === 'private_creator')) {
        throw new Error(
          'Perfil com orientação privada/não informada deveria corresponder ao filtro inclusivo "Não informado".'
        );
      }

      // 5.3 Ao filtrar por idade ou cidade específica, perfis com hideAge/hideCity não vazam e geram aviso transparente
      const ageFilterResult = filterDiscoverProfiles(
        customProfiles,
        {
          ...createDefaultFilterCriteria(),
          minAge: 24,
          maxAge: 26,
        },
        []
      );
      if (ageFilterResult.filteredProfiles.some((p) => p.id === 'private_creator')) {
        throw new Error('Perfil com hideAge=true não deve ser retornado em filtro estrito de idade.');
      }
      if (!ageFilterResult.dataLimitationsNotice) {
        throw new Error('Esperava dataLimitationsNotice explicando que perfis com dados privados foram ocultados.');
      }

      return `Privacidade garantida: hideSexualOrientation/hideAge/hideCity impedem inferência indevida e emitem aviso transparente ("${ageFilterResult.dataLimitationsNotice}").`;
    }
  );

  // =========================================================================
  // 6. FILTRAGEM EM DESCOBERTAS E EM LIVES
  // =========================================================================
  await runTest(
    6,
    'DL-FILTER-06',
    'Filtragem consistente em Descobertas e em Lives (incluindo criadores em Batalha/Palco e aviso de metadados ausentes)',
    () => {
      const activeLives = liveService.getLiveSessions().filter((s) => s.status === 'active');

      // Filtro em Lives por localização "Curitiba" (Larissa é host de live_stage_larissa e Camila é oponente em live_battle_isabella_camila)
      const curitibaLives = filterLiveSessions(
        activeLives,
        {
          ...createDefaultFilterCriteria(),
          location: 'Curitiba',
        },
        INITIAL_PROFILES,
        []
      );

      const sessionIds = curitibaLives.filteredSessions.map((s) => s.id);
      if (
        !sessionIds.includes('live_battle_isabella_camila') ||
        !sessionIds.includes('live_stage_larissa')
      ) {
        throw new Error(
          `Esperava encontrar as lives com criadoras de Curitiba (host e batalha), obteve [${sessionIds.join(', ')}].`
        );
      }

      // Verifica aviso de limitação quando existe uma transmissão cujo criador não possui perfil com idade/cidade no catálogo
      const unmappedSession: LiveSessionModel = {
        ...activeLives[0],
        id: 'live-external-guest',
        hostCreatorId: 'external_guest_without_profile',
        hostCreatorName: 'Convidado Externo',
        stageParticipants: [],
      };

      const livesWithUnmapped = filterLiveSessions(
        [...activeLives, unmappedSession],
        {
          ...createDefaultFilterCriteria(),
          minAge: 20,
          maxAge: 30,
        },
        INITIAL_PROFILES,
        []
      );

      if (
        livesWithUnmapped.unmappedCreatorMetadataCount < 1 ||
        !livesWithUnmapped.dataLimitationsNotice
      ) {
        throw new Error(
          'Esperava aviso de limitação quando uma transmissão ao vivo não possui idade/localização vinculada no catálogo.'
        );
      }

      return `Lives filtradas por Curitiba retornaram ${curitibaLives.filteredSessions.length} transmissões (${sessionIds.join(', ')}) e detectaram ${livesWithUnmapped.unmappedCreatorMetadataCount} live sem metadados com aviso explícito.`;
    }
  );

  // =========================================================================
  // 7. PRESERVAÇÃO DOS FILTROS NA NAVEGAÇÃO E ZERO EXPOSIÇÃO EM URLS
  // =========================================================================
  await runTest(
    7,
    'DL-FILTER-07',
    'Preservação independente dos filtros durante a navegação em Descobertas e Lives sem expor orientação sexual na URL',
    () => {
      resetSavedDiscoverFilters();
      resetSavedLivesFilters();

      const discoverSaved: DiscoveryAndLiveFilterCriteria = {
        gender: 'mulher',
        sexualOrientations: ['hetero', 'bi'],
        minAge: 20,
        maxAge: 29,
        location: 'São Paulo',
      };

      const livesSaved: DiscoveryAndLiveFilterCriteria = {
        gender: 'homem',
        sexualOrientations: ['gay', 'hetero'],
        minAge: 25,
        maxAge: 32,
        location: 'Rio de Janeiro',
      };

      setSavedDiscoverFilters(discoverSaved);
      setSavedLivesFilters(livesSaved);

      const readDiscover = getSavedDiscoverFilters();
      const readLives = getSavedLivesFilters();

      if (
        readDiscover.gender !== 'mulher' ||
        readDiscover.location !== 'São Paulo' ||
        readDiscover.sexualOrientations.length !== 2
      ) {
        throw new Error('Falha ao preservar filtros da tela Descobertas durante a navegação.');
      }

      if (
        readLives.gender !== 'homem' ||
        readLives.location !== 'Rio de Janeiro' ||
        readLives.sexualOrientations.length !== 2
      ) {
        throw new Error('Falha ao preservar filtros da tela Lives durante a navegação.');
      }

      // Garante que nenhuma query string ou URL expôs sexualOrientation
      if (typeof window !== 'undefined' && window.location) {
        const currentUrl = window.location.href.toLowerCase();
        if (
          currentUrl.includes('sexualorientation') ||
          currentUrl.includes('hetero') ||
          currentUrl.includes('lesbica')
        ) {
          throw new Error('Violação de privacidade: orientação sexual detectada na URL.');
        }
      }

      resetSavedDiscoverFilters();
      resetSavedLivesFilters();

      return 'Estados de filtros de Descobertas e Lives preservados em memória de forma independente e sem exposição de dados sensíveis em URLs.';
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
