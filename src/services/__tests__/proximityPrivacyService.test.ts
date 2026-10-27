import { INITIAL_PROFILES } from '../../data/mockData';
import { DEFAULT_FILTER_CRITERIA } from '../../utils/discoveryAndLiveFilters';
import {
  SPATIAL_GRID_RESOLUTION_DEG,
  calculateApproximateDistanceKm,
  fetchZoneSafeMeetupRecommendations,
  filterProfilesWithProximityAndPrivacy,
  formatApproximateDistanceLabel,
  getDefaultProximityState,
  grantProximityConsentForZone,
  grantProximityConsentWithCoordinates,
  quantizeCoordinateToGrid,
  requestForegroundApproximateLocation,
  resolveProfileApproximateZone,
  revokeProximityConsent,
} from '../../utils/proximityPrivacyService';

export interface ProximityTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ProximityTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ProximityTestResult[];
}

export async function runProximityPrivacyTestSuite(): Promise<ProximityTestSuiteSummary> {
  const results: ProximityTestResult[] = [];
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
        evidence: 'Falha na asserção',
        error: err?.message || String(err),
      });
    }
  };

  // Teste 1: Quantização em grade de 1 a 2 km (0.015°)
  await runTest(
    1,
    'PROX-MAP-01',
    'Quantização espacial em grade de 1 a 2 km (0.015°) descarta coordenadas exatas de endereço',
    () => {
      const rawA = { lat: -23.5641892, lng: -46.6662918 };
      const rawB = { lat: -23.5639104, lng: -46.6658123 }; // Mesmo quarteirão/bairro
      const qA = quantizeCoordinateToGrid(rawA.lat, rawA.lng);
      const qB = quantizeCoordinateToGrid(rawB.lat, rawB.lng);

      if (qA.lat !== qB.lat || qA.lng !== qB.lng || qA.gridCellId !== qB.gridCellId) {
        throw new Error('Coordenadas próximas no mesmo quarteirão deveriam convergir para a mesma célula 1-2 km');
      }
      if (qA.lat === rawA.lat || qA.lng === rawA.lng) {
        throw new Error('Coordenada exata de alta precisão não foi truncada para a grade');
      }
      return `raw=(${rawA.lat}, ${rawA.lng}) -> grid=(${qA.lat}, ${qA.lng}) cell=${qA.gridCellId} res=${SPATIAL_GRID_RESOLUTION_DEG}°`;
    }
  );

  // Teste 2: Cálculo Haversine sobre grade com arredondamento inteiro >= 1 km (~X km)
  await runTest(
    2,
    'PROX-MAP-02',
    'Cálculo de distância Haversine opera sobre grade 1–2 km e aplica piso mínimo de ~1 km contra triangulação',
    () => {
      const sameCellDist = calculateApproximateDistanceKm(
        { lat: -23.5641, lng: -46.6661 },
        { lat: -23.5642, lng: -46.6662 }
      );
      const jardinesToPinheiros = calculateApproximateDistanceKm(
        { lat: -23.564, lng: -46.666 },
        { lat: -23.565, lng: -46.695 }
      );
      const label = formatApproximateDistanceLabel(jardinesToPinheiros, false);

      if (sameCellDist < 1 || !Number.isInteger(sameCellDist)) {
        throw new Error(`Distância mínima deve ser inteiro >= 1 km, obtido: ${sameCellDist}`);
      }
      if (!Number.isInteger(jardinesToPinheiros) || !label.startsWith('~')) {
        throw new Error(`Rótulo inválido: ${label}`);
      }
      return `Mesma célula=${formatApproximateDistanceLabel(sameCellDist)}, Jardins->Pinheiros=${label}`;
    }
  );

  // Teste 3: Consentimento explícito LGPD obrigatório antes de obter localização
  await runTest(
    3,
    'PROX-MAP-03',
    'Bloqueio de coleta de localização sem consentimento explícito prévio (Opt-In LGPD)',
    async () => {
      revokeProximityConsent('São Paulo');
      const res = await requestForegroundApproximateLocation(false, 25);
      if (res.success || res.state.consentGranted || res.state.proximityEnabled) {
        throw new Error('Coleta deveria ser negada quando explicitConsentConfirmed=false');
      }
      return `success=${res.success}, consentGranted=${res.state.consentGranted}, mode=${res.state.mode}`;
    }
  );

  // Teste 4: Concessão e revogação imediata de consentimento com limpeza da grade
  await runTest(
    4,
    'PROX-MAP-04',
    'Concessão e revogação de consentimento limpam a célula quantizada e ativam fallback por Cidade/Região',
    () => {
      const granted = grantProximityConsentWithCoordinates(-23.564189, -46.666291, 10);
      if (!granted.consentGranted || !granted.quantizedUserGrid) {
        throw new Error('Falha ao conceder consentimento com coordenadas quantizadas');
      }
      const revoked = revokeProximityConsent('Curitiba');
      if (
        revoked.consentGranted ||
        revoked.proximityEnabled ||
        revoked.quantizedUserGrid !== null ||
        revoked.mode !== 'city_region_fallback'
      ) {
        throw new Error('Revogação não limpou completamente os dados de localização');
      }
      return `Granted cell=${granted.quantizedUserGrid.gridCellId} -> Revoked grid=${revoked.quantizedUserGrid}, mode=${revoked.mode}, city=${revoked.selectedCityRegion}`;
    }
  );

  // Teste 5: Proteção estrita da flag hideCity
  await runTest(
    5,
    'PROX-MAP-05',
    'Perfis com hideCity=true nunca expõem bairro no mapa nem distância calculada',
    () => {
      const hiddenProfile = {
        ...INITIAL_PROFILES[0],
        id: 'val_hidden_city',
        hideCity: true,
      };
      const resolvedZone = resolveProfileApproximateZone(hiddenProfile);
      if (resolvedZone !== null) {
        throw new Error('Perfil com hideCity=true não deve resolver zona aproximada no mapa');
      }

      const fallbackState = getDefaultProximityState();
      fallbackState.selectedCityRegion = 'Qualquer localização';

      const filtered = filterProfilesWithProximityAndPrivacy(
        [hiddenProfile],
        DEFAULT_FILTER_CRITERIA,
        fallbackState,
        []
      );

      const enriched = filtered.enrichedProfiles[0];
      if (
        !enriched ||
        !enriched.isZoneHiddenByPrivacy ||
        enriched.approximateZone !== null ||
        enriched.approximateDistanceKm !== null
      ) {
        throw new Error('Perfil com hideCity=true vazou zona ou distância aproximada');
      }

      return `hideCity=true -> zone=${enriched.approximateZone}, distance=${enriched.approximateDistanceLabel}, publicCity="${enriched.publicCityLabel}"`;
    }
  );

  // Teste 6: Exclusão de contas bloqueadas
  await runTest(
    6,
    'PROX-MAP-06',
    'Usuários bloqueados são excluídos das zonas aproximadas do mapa e da listagem por proximidade',
    () => {
      const state = grantProximityConsentForZone('sp_jardins', 50);
      const withoutBlock = filterProfilesWithProximityAndPrivacy(
        INITIAL_PROFILES,
        DEFAULT_FILTER_CRITERIA,
        state,
        []
      );
      const withBlock = filterProfilesWithProximityAndPrivacy(
        INITIAL_PROFILES,
        DEFAULT_FILTER_CRITERIA,
        state,
        ['valentina']
      );

      const foundBlocked = withBlock.enrichedProfiles.some(
        (p) => p.profile.id === 'valentina'
      );
      if (foundBlocked || withBlock.enrichedProfiles.length >= withoutBlock.enrichedProfiles.length) {
        throw new Error('Perfil bloqueado continuou visível na descoberta por proximidade');
      }
      return `Sem bloqueio=${withoutBlock.enrichedProfiles.length} perfis em SP; Com bloqueio('valentina')=${withBlock.enrichedProfiles.length} perfil`;
    }
  );

  // Teste 7: Combinação de raio espacial com filtros existentes (gênero, orientação, idade >= 18)
  await runTest(
    7,
    'PROX-MAP-07',
    'Filtro de raio espacial (10 km vs 500 km) respeita filtros de gênero, orientação sexual e idade >= 18',
    () => {
      const spState10Km = grantProximityConsentForZone('sp_jardins', 10);
      const spResult10Km = filterProfilesWithProximityAndPrivacy(
        INITIAL_PROFILES,
        {
          ...DEFAULT_FILTER_CRITERIA,
          gender: 'mulher',
        },
        spState10Km,
        []
      );

      const spState500Km = grantProximityConsentForZone('sp_jardins', 500);
      const spResult500Km = filterProfilesWithProximityAndPrivacy(
        INITIAL_PROFILES,
        {
          ...DEFAULT_FILTER_CRITERIA,
          gender: 'mulher',
        },
        spState500Km,
        []
      );

      if (
        spResult10Km.enrichedProfiles.length !== 1 ||
        spResult10Km.enrichedProfiles[0].profile.id !== 'valentina'
      ) {
        throw new Error(
          `Esperado apenas Valentina (mulher em SP dentro de 10 km), obtido: ${spResult10Km.enrichedProfiles.map((p) => p.profile.id).join(',')}`
        );
      }
      if (spResult500Km.enrichedProfiles.length <= spResult10Km.enrichedProfiles.length) {
        throw new Error('Ampliar o raio para 500 km deveria incluir perfis de outras capitais próximas');
      }

      return `Raio 10km (SP + Mulher)=${spResult10Km.enrichedProfiles.length} perfil (Valentina); Raio 500km=${spResult500Km.enrichedProfiles.length} perfis`;
    }
  );

  // Teste 8: Google Maps Grounding Safe Meetup Guide usa apenas o centroide da zona aproximada
  await runTest(
    8,
    'PROX-MAP-08',
    'Guia de locais públicos seguros (Google Maps Grounding) consulta apenas centroide da zona aproximada',
    async () => {
      const guide = await fetchZoneSafeMeetupRecommendations('sp_jardins');
      if (
        !guide.zoneId ||
        guide.citations.length === 0 ||
        !guide.citations[0].uri.includes('google.com/maps')
      ) {
        throw new Error('Guia de locais seguros não retornou citações válidas do Google Maps');
      }
      return `zone=${guide.zoneLabel}, source=${guide.source}, places=${guide.citations.length} (${guide.citations[0].title})`;
    }
  );

  // Restaura estado padrão limpo ao final dos testes
  revokeProximityConsent('São Paulo');

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
