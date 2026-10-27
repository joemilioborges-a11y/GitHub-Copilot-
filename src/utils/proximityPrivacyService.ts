import { GoogleGenAI } from '@google/genai';
import { Profile } from '../types';
import {
  DiscoveryAndLiveFilterCriteria,
  filterDiscoverProfiles,
} from './discoveryAndLiveFilters';

export function normalizeLocationText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resolução da grade espacial de privacidade: 0.015 graus (~1,66 km na latitude do Brasil).
 * Coordenadas exatas do dispositivo NUNCA são persistidas ou transmitidas.
 */
export const SPATIAL_GRID_RESOLUTION_DEG = 0.015;

export const PROXIMITY_STORAGE_KEY = 'jobs_proximity_privacy_state_v1';

export const ALLOWED_RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100, 500] as const;
export type ProximityRadiusOptionKm = (typeof ALLOWED_RADIUS_OPTIONS_KM)[number];

export interface QuantizedGridCoordinate {
  lat: number;
  lng: number;
  gridCellId: string;
  precisionMetersApprox: number;
  precisionLabel: string;
}

export interface ApproximateNeighborhoodZone {
  zoneId: string;
  cityName: 'São Paulo' | 'Rio de Janeiro' | 'Curitiba' | 'Belo Horizonte';
  neighborhoodName: string;
  displayLabel: string;
  centroid: {
    lat: number;
    lng: number;
  };
  zoneRadiusMeters: number;
  safetyNote: string;
}

export interface ProximityConsentAndState {
  consentGranted: boolean;
  consentTimestamp: string | null;
  proximityEnabled: boolean;
  mode: 'proximity_grid' | 'city_region_fallback';
  selectedCityRegion: string;
  activeZoneId: string;
  quantizedUserGrid: QuantizedGridCoordinate | null;
  radiusKm: number;
  foregroundOnlyConfirmed: boolean;
}

export interface EnrichedProximityProfile {
  profile: Profile;
  approximateZone: ApproximateNeighborhoodZone | null;
  approximateDistanceKm: number | null;
  approximateDistanceLabel: string;
  publicCityLabel: string;
  publicAgeLabel: string;
  publicOrientationLabel: string;
  isZoneHiddenByPrivacy: boolean;
}

export interface ApproximateZoneSummary {
  zone: ApproximateNeighborhoodZone;
  profilesCount: number;
  onlineCount: number;
  verifiedCreatorsCount: number;
  approximateDistanceFromUserKm: number | null;
  approximateDistanceLabel: string;
  profiles: EnrichedProximityProfile[];
}

export interface SafeMeetupPlaceCitation {
  title: string;
  uri: string;
  category: string;
}

export interface ZoneSafeMeetupGuideResult {
  zoneId: string;
  zoneLabel: string;
  summaryText: string;
  citations: SafeMeetupPlaceCitation[];
  source: 'gemini_maps_grounding' | 'curated_public_landmarks';
  queriedCentroid: { lat: number; lng: number };
}

/**
 * Quantiza qualquer par (lat, lng) para uma célula de grade de 1 a 2 km (0.015°).
 * Remove precisão de rua/endereço imediatamente em memória.
 */
export function quantizeCoordinateToGrid(lat: number, lng: number): QuantizedGridCoordinate {
  const clampedLat = Math.max(-90, Math.min(90, Number(lat) || 0));
  const clampedLng = Math.max(-180, Math.min(180, Number(lng) || 0));

  const gridLat = Number(
    (Math.round(clampedLat / SPATIAL_GRID_RESOLUTION_DEG) * SPATIAL_GRID_RESOLUTION_DEG).toFixed(4)
  );
  const gridLng = Number(
    (Math.round(clampedLng / SPATIAL_GRID_RESOLUTION_DEG) * SPATIAL_GRID_RESOLUTION_DEG).toFixed(4)
  );

  const latIdx = Math.round(gridLat / SPATIAL_GRID_RESOLUTION_DEG);
  const lngIdx = Math.round(gridLng / SPATIAL_GRID_RESOLUTION_DEG);

  return {
    lat: gridLat,
    lng: gridLng,
    gridCellId: `GRID_1_2KM_${latIdx}_${lngIdx}`,
    precisionMetersApprox: 1650,
    precisionLabel: 'Grade reduzida de 1 a 2 km',
  };
}

/**
 * Catálogo oficial de zonas aproximadas de bairro/cidade do JOBS.
 * Todos os centroides já estão quantizados na grade de 0.015° (1–2 km).
 */
export const APPROXIMATE_NEIGHBORHOOD_ZONES: ApproximateNeighborhoodZone[] = [
  {
    zoneId: 'sp_jardins',
    cityName: 'São Paulo',
    neighborhoodName: 'Jardins',
    displayLabel: 'São Paulo • Zona Jardins',
    centroid: {
      lat: quantizeCoordinateToGrid(-23.564, -46.666).lat,
      lng: quantizeCoordinateToGrid(-23.564, -46.666).lng,
    },
    zoneRadiusMeters: 1750,
    safetyNote: 'Zona gastronômica e hoteleira com alto movimento e segurança 24h.',
  },
  {
    zoneId: 'sp_pinheiros',
    cityName: 'São Paulo',
    neighborhoodName: 'Pinheiros',
    displayLabel: 'São Paulo • Zona Pinheiros',
    centroid: {
      lat: quantizeCoordinateToGrid(-23.565, -46.695).lat,
      lng: quantizeCoordinateToGrid(-23.565, -46.695).lng,
    },
    zoneRadiusMeters: 1750,
    safetyNote: 'Polo cultural, cafés especiais e bares movimentados para primeiro encontro.',
  },
  {
    zoneId: 'rj_leblon',
    cityName: 'Rio de Janeiro',
    neighborhoodName: 'Leblon',
    displayLabel: 'Rio de Janeiro • Zona Leblon',
    centroid: {
      lat: quantizeCoordinateToGrid(-22.984, -43.224).lat,
      lng: quantizeCoordinateToGrid(-22.984, -43.224).lng,
    },
    zoneRadiusMeters: 1600,
    safetyNote: 'Orla e polo gastronômico da Rua Dias Ferreira com áreas públicas iluminadas.',
  },
  {
    zoneId: 'rj_ipanema',
    cityName: 'Rio de Janeiro',
    neighborhoodName: 'Ipanema',
    displayLabel: 'Rio de Janeiro • Zona Ipanema',
    centroid: {
      lat: quantizeCoordinateToGrid(-22.984, -43.208).lat,
      lng: quantizeCoordinateToGrid(-22.984, -43.208).lng,
    },
    zoneRadiusMeters: 1600,
    safetyNote: 'Região costeira e lounges ao redor da Praça Nossa Senhora da Paz.',
  },
  {
    zoneId: 'cwb_batel',
    cityName: 'Curitiba',
    neighborhoodName: 'Batel',
    displayLabel: 'Curitiba • Zona Batel',
    centroid: {
      lat: quantizeCoordinateToGrid(-25.442, -49.286).lat,
      lng: quantizeCoordinateToGrid(-25.442, -49.286).lng,
    },
    zoneRadiusMeters: 1700,
    safetyNote: 'Eixo de alta gastronomia, wine bars e shoppings certificados.',
  },
  {
    zoneId: 'cwb_centro_civico',
    cityName: 'Curitiba',
    neighborhoodName: 'Centro Cívico',
    displayLabel: 'Curitiba • Zona Centro Cívico',
    centroid: {
      lat: quantizeCoordinateToGrid(-25.415, -49.269).lat,
      lng: quantizeCoordinateToGrid(-25.415, -49.269).lng,
    },
    zoneRadiusMeters: 1700,
    safetyNote: 'Área próxima ao Museu Oscar Niemeyer, parques e cafés culturais.',
  },
  {
    zoneId: 'bh_savassi',
    cityName: 'Belo Horizonte',
    neighborhoodName: 'Savassi',
    displayLabel: 'Belo Horizonte • Zona Savassi',
    centroid: {
      lat: quantizeCoordinateToGrid(-19.936, -43.935).lat,
      lng: quantizeCoordinateToGrid(-19.936, -43.935).lng,
    },
    zoneRadiusMeters: 1700,
    safetyNote: 'Praça da Savassi e quarteirões de pedestres com bistrôs e lounges.',
  },
];

/**
 * Calcula a distância aproximada em quilômetros inteiros usando Haversine
 * exclusivamente sobre coordenadas quantizadas na grade de 1 a 2 km.
 * Nunca retorna frações de quilômetro ou distância menor que 1 km.
 */
export function calculateApproximateDistanceKm(
  origin: { lat: number; lng: number },
  target: { lat: number; lng: number }
): number {
  const qOrigin = quantizeCoordinateToGrid(origin.lat, origin.lng);
  const qTarget = quantizeCoordinateToGrid(target.lat, target.lng);

  const R = 6371; // Raio médio da Terra em km
  const dLat = ((qTarget.lat - qOrigin.lat) * Math.PI) / 180;
  const dLng = ((qTarget.lng - qOrigin.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((qOrigin.lat * Math.PI) / 180) *
      Math.cos((qTarget.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawKm = R * c;

  // Arredondamento obrigatório para inteiro >= 1 km para impedir triangulação
  return Math.max(1, Math.round(rawKm));
}

export function formatApproximateDistanceLabel(
  distanceKm: number | null | undefined,
  hideCity?: boolean
): string {
  if (hideCity) {
    return 'Região oculta';
  }
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) {
    return 'Distância aproximada indisponível';
  }
  const rounded = Math.max(1, Math.round(distanceKm));
  return `~${rounded} km`;
}

/**
 * Resolve a zona aproximada de um perfil com base em `approximateZoneId` ou `city`.
 * Respeita estritamente a flag `hideCity`: se ativa, retorna `null` para não expor no mapa.
 */
export function resolveProfileApproximateZone(
  profile: Pick<Profile, 'city' | 'hideCity' | 'approximateZoneId'>
): ApproximateNeighborhoodZone | null {
  if (profile.hideCity) {
    return null;
  }

  if (profile.approximateZoneId) {
    const byId = APPROXIMATE_NEIGHBORHOOD_ZONES.find(
      (z) => z.zoneId === profile.approximateZoneId
    );
    if (byId) return byId;
  }

  const normalizedCity = normalizeLocationText(profile.city || '');
  if (!normalizedCity) return null;

  // Match por bairro + cidade primeiro
  for (const zone of APPROXIMATE_NEIGHBORHOOD_ZONES) {
    const normNeighborhood = normalizeLocationText(zone.neighborhoodName);
    if (normalizedCity.includes(normNeighborhood)) {
      return zone;
    }
  }

  // Fallback para a primeira zona da cidade correspondente
  for (const zone of APPROXIMATE_NEIGHBORHOOD_ZONES) {
    const normCityName = normalizeLocationText(zone.cityName);
    if (normalizedCity.includes(normCityName)) {
      return zone;
    }
  }

  return null;
}

/**
 * Encontra a zona aproximada mais próxima de uma coordenada quantizada.
 */
export function findNearestApproximateZone(coord: {
  lat: number;
  lng: number;
}): ApproximateNeighborhoodZone {
  let bestZone = APPROXIMATE_NEIGHBORHOOD_ZONES[0];
  let bestDist = Number.POSITIVE_INFINITY;

  for (const zone of APPROXIMATE_NEIGHBORHOOD_ZONES) {
    const dist = calculateApproximateDistanceKm(coord, zone.centroid);
    if (dist < bestDist) {
      bestDist = dist;
      bestZone = zone;
    }
  }
  return bestZone;
}

export function getDefaultProximityState(): ProximityConsentAndState {
  return {
    consentGranted: false,
    consentTimestamp: null,
    proximityEnabled: false,
    mode: 'city_region_fallback',
    selectedCityRegion: 'São Paulo',
    activeZoneId: 'sp_jardins',
    quantizedUserGrid: null,
    radiusKm: 25,
    foregroundOnlyConfirmed: true,
  };
}

export function getProximityConsentState(): ProximityConsentAndState {
  const fallback = getDefaultProximityState();
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(PROXIMITY_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);

    // Garantia de segurança: se houver coord persistida, re-quantiza para grade de 1-2 km
    let safeGrid: QuantizedGridCoordinate | null = null;
    if (
      parsed.consentGranted &&
      parsed.quantizedUserGrid &&
      typeof parsed.quantizedUserGrid.lat === 'number' &&
      typeof parsed.quantizedUserGrid.lng === 'number'
    ) {
      safeGrid = quantizeCoordinateToGrid(
        parsed.quantizedUserGrid.lat,
        parsed.quantizedUserGrid.lng
      );
    }

    const radius = ALLOWED_RADIUS_OPTIONS_KM.includes(parsed.radiusKm)
      ? parsed.radiusKm
      : fallback.radiusKm;

    return {
      consentGranted: Boolean(parsed.consentGranted),
      consentTimestamp:
        typeof parsed.consentTimestamp === 'string' ? parsed.consentTimestamp : null,
      proximityEnabled: Boolean(parsed.consentGranted && parsed.proximityEnabled),
      mode:
        parsed.consentGranted && parsed.proximityEnabled
          ? 'proximity_grid'
          : 'city_region_fallback',
      selectedCityRegion:
        typeof parsed.selectedCityRegion === 'string' && parsed.selectedCityRegion.trim()
          ? parsed.selectedCityRegion
          : fallback.selectedCityRegion,
      activeZoneId:
        typeof parsed.activeZoneId === 'string' &&
        APPROXIMATE_NEIGHBORHOOD_ZONES.some((z) => z.zoneId === parsed.activeZoneId)
          ? parsed.activeZoneId
          : fallback.activeZoneId,
      quantizedUserGrid: safeGrid,
      radiusKm: radius,
      foregroundOnlyConfirmed: true,
    };
  } catch {
    return fallback;
  }
}

export function saveProximityConsentState(
  next: ProximityConsentAndState
): ProximityConsentAndState {
  // Sanitiza qualquer coordenada para garantir que apenas grade 1-2 km seja salva
  const sanitizedGrid =
    next.consentGranted && next.quantizedUserGrid
      ? quantizeCoordinateToGrid(next.quantizedUserGrid.lat, next.quantizedUserGrid.lng)
      : null;

  const sanitized: ProximityConsentAndState = {
    ...next,
    proximityEnabled: Boolean(next.consentGranted && next.proximityEnabled),
    mode:
      next.consentGranted && next.proximityEnabled
        ? 'proximity_grid'
        : 'city_region_fallback',
    quantizedUserGrid: sanitizedGrid,
    foregroundOnlyConfirmed: true,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROXIMITY_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // ignore storage quota errors
  }
  return sanitized;
}

/**
 * Concede consentimento explícito LGPD e ativa a descoberta por proximidade em grade 1–2 km.
 */
export function grantProximityConsentWithCoordinates(
  rawLat: number,
  rawLng: number,
  radiusKm: number = 25
): ProximityConsentAndState {
  const quantized = quantizeCoordinateToGrid(rawLat, rawLng);
  const nearestZone = findNearestApproximateZone(quantized);

  return saveProximityConsentState({
    consentGranted: true,
    consentTimestamp: new Date().toISOString(),
    proximityEnabled: true,
    mode: 'proximity_grid',
    selectedCityRegion: nearestZone.cityName,
    activeZoneId: nearestZone.zoneId,
    quantizedUserGrid: quantized,
    radiusKm: ALLOWED_RADIUS_OPTIONS_KM.includes(radiusKm as any) ? radiusKm : 25,
    foregroundOnlyConfirmed: true,
  });
}

/**
 * Concede consentimento explícito selecionando uma zona aproximada de referência.
 */
export function grantProximityConsentForZone(
  zoneId: string,
  radiusKm: number = 25
): ProximityConsentAndState {
  const zone =
    APPROXIMATE_NEIGHBORHOOD_ZONES.find((z) => z.zoneId === zoneId) ||
    APPROXIMATE_NEIGHBORHOOD_ZONES[0];
  const quantized = quantizeCoordinateToGrid(zone.centroid.lat, zone.centroid.lng);

  return saveProximityConsentState({
    consentGranted: true,
    consentTimestamp: new Date().toISOString(),
    proximityEnabled: true,
    mode: 'proximity_grid',
    selectedCityRegion: zone.cityName,
    activeZoneId: zone.zoneId,
    quantizedUserGrid: quantized,
    radiusKm: ALLOWED_RADIUS_OPTIONS_KM.includes(radiusKm as any) ? radiusKm : 25,
    foregroundOnlyConfirmed: true,
  });
}

/**
 * Revoga o consentimento de localização imediatamente, apaga a célula de grade e ativa
 * o modo alternativo manual por Cidade/Região.
 */
export function revokeProximityConsent(fallbackCity: string = 'São Paulo'): ProximityConsentAndState {
  const zone =
    APPROXIMATE_NEIGHBORHOOD_ZONES.find(
      (z) => normalizeLocationText(z.cityName) === normalizeLocationText(fallbackCity)
    ) || APPROXIMATE_NEIGHBORHOOD_ZONES[0];

  return saveProximityConsentState({
    consentGranted: false,
    consentTimestamp: null,
    proximityEnabled: false,
    mode: 'city_region_fallback',
    selectedCityRegion: zone.cityName,
    activeZoneId: zone.zoneId,
    quantizedUserGrid: null,
    radiusKm: 25,
    foregroundOnlyConfirmed: true,
  });
}

/**
 * Solicita localização apenas em primeiro plano (foreground-only) se e somente se o usuário
 * já tiver confirmado o consentimento explícito na UI.
 */
export async function requestForegroundApproximateLocation(
  explicitConsentConfirmed: boolean,
  radiusKm: number = 25
): Promise<{
  success: boolean;
  state: ProximityConsentAndState;
  notice: string;
}> {
  if (!explicitConsentConfirmed) {
    return {
      success: false,
      state: getProximityConsentState(),
      notice:
        'Consentimento explícito é obrigatório antes de obter ou armazenar localização aproximada.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Coleta aproximada para economia de bateria e privacidade
          timeout: 6000,
          maximumAge: 300000,
        });
      });
      const updated = grantProximityConsentWithCoordinates(
        pos.coords.latitude,
        pos.coords.longitude,
        radiusKm
      );
      return {
        success: true,
        state: updated,
        notice: `Localização quantizada em grade de 1 a 2 km (${updated.quantizedUserGrid?.gridCellId}). Coordenada exata descartada.`,
      };
    } catch {
      const current = getProximityConsentState();
      const updated = grantProximityConsentForZone(current.activeZoneId, radiusKm);
      return {
        success: true,
        state: updated,
        notice:
          'Permissão do navegador indisponível; utilizando centroide aproximado do bairro selecionado na grade de 1 a 2 km.',
      };
    }
  }

  const current = getProximityConsentState();
  const updated = grantProximityConsentForZone(current.activeZoneId, radiusKm);
  return {
    success: true,
    state: updated,
    notice: 'Zona aproximada ativada em grade de 1 a 2 km (apenas em primeiro plano).',
  };
}

/**
 * Filtra perfis combinando:
 * 1. Filtros existentes do JOBS (gênero, orientação sexual, idade >= 18, localização)
 * 2. Contas bloqueadas (`blockedUserIds`)
 * 3. Flags de privacidade do perfil (`hideCity`, `hideAge`, `hideSexualOrientation`)
 * 4. Raio aproximado em grade de 1–2 km (quando proximidade ativa) ou Cidade/Região (quando desativada)
 */
export function filterProfilesWithProximityAndPrivacy(
  profiles: Profile[],
  criteria: DiscoveryAndLiveFilterCriteria,
  proximityState: ProximityConsentAndState,
  blockedUserIds: string[] = []
): {
  enrichedProfiles: EnrichedProximityProfile[];
  zoneSummaries: ApproximateZoneSummary[];
  referenceCentroid: { lat: number; lng: number };
  referenceLabel: string;
} {
  // 1. Aplica os filtros base existentes (sexo, orientação, idade >= 18, localização base)
  const baseFilterResult = filterDiscoverProfiles(profiles, criteria);

  // 2. Remove contas bloqueadas
  const blockedSet = new Set(blockedUserIds);
  const unblockedProfiles = baseFilterResult.filteredProfiles.filter(
    (p) => !blockedSet.has(p.id)
  );

  // 3. Determina o centroide de referência (grade 1-2 km do usuário ou zona da cidade escolhida)
  const activeZone =
    APPROXIMATE_NEIGHBORHOOD_ZONES.find((z) => z.zoneId === proximityState.activeZoneId) ||
    APPROXIMATE_NEIGHBORHOOD_ZONES.find(
      (z) =>
        normalizeLocationText(z.cityName) ===
        normalizeLocationText(proximityState.selectedCityRegion)
    ) ||
    APPROXIMATE_NEIGHBORHOOD_ZONES[0];

  const referenceCentroid =
    proximityState.consentGranted &&
    proximityState.proximityEnabled &&
    proximityState.quantizedUserGrid
      ? {
          lat: proximityState.quantizedUserGrid.lat,
          lng: proximityState.quantizedUserGrid.lng,
        }
      : activeZone.centroid;

  const referenceLabel =
    proximityState.consentGranted && proximityState.proximityEnabled
      ? `${activeZone.displayLabel} (Grade 1–2 km)`
      : `Modo Cidade/Região: ${proximityState.selectedCityRegion}`;

  // 4. Enriquece cada perfil com zona aproximada e distância arredondada, respeitando privacidade
  const enrichedAll: EnrichedProximityProfile[] = unblockedProfiles.map((profile) => {
    const isZoneHidden = Boolean(profile.hideCity);
    const zone = resolveProfileApproximateZone(profile);

    let approxDistKm: number | null = null;
    if (!isZoneHidden && zone) {
      approxDistKm = calculateApproximateDistanceKm(referenceCentroid, zone.centroid);
    }

    return {
      profile,
      approximateZone: isZoneHidden ? null : zone,
      approximateDistanceKm: approxDistKm,
      approximateDistanceLabel: formatApproximateDistanceLabel(approxDistKm, isZoneHidden),
      publicCityLabel: isZoneHidden ? 'Região oculta por privacidade' : profile.city,
      publicAgeLabel: profile.hideAge ? '18+ (Idade oculta)' : `${profile.age}`,
      publicOrientationLabel: profile.hideSexualOrientation
        ? 'Orientação privada'
        : profile.orientationLabel,
      isZoneHiddenByPrivacy: isZoneHidden,
    };
  });

  // 5. Aplica filtro de raio (se proximidade ativa) ou filtro de cidade alternativa
  const filteredEnriched = enrichedAll.filter((item) => {
    if (proximityState.consentGranted && proximityState.proximityEnabled) {
      // Se o perfil ocultou a cidade (`hideCity`), ele não aparece em buscas estritas por raio espacial
      if (item.isZoneHiddenByPrivacy || item.approximateDistanceKm === null) {
        return false;
      }
      return item.approximateDistanceKm <= proximityState.radiusKm;
    }

    // Modo alternativo por Cidade/Região (sem exigir localização do dispositivo)
    const selectedRegionNorm = normalizeLocationText(proximityState.selectedCityRegion);
    if (
      !selectedRegionNorm ||
      selectedRegionNorm === normalizeLocationText('Qualquer localização') ||
      selectedRegionNorm === normalizeLocationText('Todas as regiões')
    ) {
      return true;
    }

    if (item.isZoneHiddenByPrivacy) {
      return false;
    }

    const profileCityNorm = normalizeLocationText(item.profile.city);
    return profileCityNorm.includes(selectedRegionNorm);
  });

  // 6. Agrupa por Zona Aproximada para renderização segura no mapa (nunca plota pino individual exato)
  const zoneSummaries: ApproximateZoneSummary[] = APPROXIMATE_NEIGHBORHOOD_ZONES.map((zone) => {
    const zoneProfiles = filteredEnriched.filter(
      (item) => !item.isZoneHiddenByPrivacy && item.approximateZone?.zoneId === zone.zoneId
    );
    const distFromUser = calculateApproximateDistanceKm(referenceCentroid, zone.centroid);

    return {
      zone,
      profilesCount: zoneProfiles.length,
      onlineCount: zoneProfiles.filter((p) => p.profile.online).length,
      verifiedCreatorsCount: zoneProfiles.filter((p) => p.profile.verified).length,
      approximateDistanceFromUserKm: distFromUser,
      approximateDistanceLabel: formatApproximateDistanceLabel(distFromUser, false),
      profiles: zoneProfiles,
    };
  }).filter((summary) => {
    if (proximityState.consentGranted && proximityState.proximityEnabled) {
      return (
        summary.profilesCount > 0 ||
        (summary.approximateDistanceFromUserKm !== null &&
          summary.approximateDistanceFromUserKm <= proximityState.radiusKm)
      );
    }
    const selectedRegionNorm = normalizeLocationText(proximityState.selectedCityRegion);
    if (
      !selectedRegionNorm ||
      selectedRegionNorm === normalizeLocationText('Qualquer localização') ||
      selectedRegionNorm === normalizeLocationText('Todas as regiões')
    ) {
      return true;
    }
    return normalizeLocationText(summary.zone.cityName).includes(selectedRegionNorm);
  });

  return {
    enrichedProfiles: filteredEnriched,
    zoneSummaries,
    referenceCentroid,
    referenceLabel,
  };
}

/**
 * Curadoria local de pontos públicos reais e seguros por zona (fallback imediato e auditável)
 */
const CURATED_SAFE_MEETUP_PLACES: Record<string, SafeMeetupPlaceCitation[]> = {
  sp_jardins: [
    {
      title: 'Rua Oscar Freire & Cafés dos Jardins — São Paulo',
      uri: 'https://www.google.com/maps/search/?api=1&query=Rua+Oscar+Freire+Jardins+Sao+Paulo',
      category: 'Gastronomia & Passeio Público',
    },
    {
      title: 'MASP — Museu de Arte de São Paulo (Av. Paulista)',
      uri: 'https://www.google.com/maps/search/?api=1&query=MASP+Avenida+Paulista+Sao+Paulo',
      category: 'Cultura & Encontro Diurno Seguro',
    },
  ],
  sp_pinheiros: [
    {
      title: 'Rua dos Pinheiros — Polo Gastronômico & Wine Bars',
      uri: 'https://www.google.com/maps/search/?api=1&query=Rua+dos+Pinheiros+Sao+Paulo',
      category: 'Restaurantes & Lounges Públicos',
    },
    {
      title: 'Instituto Tomie Ohtake — Pinheiros',
      uri: 'https://www.google.com/maps/search/?api=1&query=Instituto+Tomie+Ohtake+Pinheiros+Sao+Paulo',
      category: 'Arte, Café & Arquitetura',
    },
  ],
  rj_leblon: [
    {
      title: 'Rua Dias Ferreira — Polo Gastronômico do Leblon',
      uri: 'https://www.google.com/maps/search/?api=1&query=Rua+Dias+Ferreira+Leblon+Rio+de+Janeiro',
      category: 'Alta Gastronomia & Bistrôs',
    },
    {
      title: 'Mirante do Leblon & Orla Posto 12',
      uri: 'https://www.google.com/maps/search/?api=1&query=Mirante+do+Leblon+Rio+de+Janeiro',
      category: 'Orla Pública Iluminada',
    },
  ],
  rj_ipanema: [
    {
      title: 'Praça Nossa Senhora da Paz & Lounges de Ipanema',
      uri: 'https://www.google.com/maps/search/?api=1&query=Praca+Nossa+Senhora+da+Paz+Ipanema+Rio+de+Janeiro',
      category: 'Gastronomia & Sunset',
    },
    {
      title: 'Arpoador & Orla de Ipanema Posto 9',
      uri: 'https://www.google.com/maps/search/?api=1&query=Pedra+do+Arpoador+Ipanema+Rio+de+Janeiro',
      category: 'Ponto Turístico Público',
    },
  ],
  cwb_batel: [
    {
      title: 'Alameda Dom Pedro II & Pátio Batel — Curitiba',
      uri: 'https://www.google.com/maps/search/?api=1&query=Patio+Batel+Curitiba',
      category: 'Shopping, Cafés & Segurança Privada',
    },
    {
      title: 'Praça da Espanha — Batel',
      uri: 'https://www.google.com/maps/search/?api=1&query=Praca+da+Espanha+Batel+Curitiba',
      category: 'Gastronomia & Wine Bars',
    },
  ],
  cwb_centro_civico: [
    {
      title: 'Museu Oscar Niemeyer (MON) & Café do Museu',
      uri: 'https://www.google.com/maps/search/?api=1&query=Museu+Oscar+Niemeyer+Curitiba',
      category: 'Cultura & Encontro Público',
    },
    {
      title: 'Passeio Público & Centro Cívico de Curitiba',
      uri: 'https://www.google.com/maps/search/?api=1&query=Centro+Civico+Curitiba',
      category: 'Lazer & Cafés',
    },
  ],
  bh_savassi: [
    {
      title: 'Praça Diogo de Vasconcelos (Praça da Savassi)',
      uri: 'https://www.google.com/maps/search/?api=1&query=Praca+da+Savassi+Belo+Horizonte',
      category: 'Quarteirões de Pedestres & Cafés',
    },
    {
      title: 'Circuito Liberdade & Pátio Savassi',
      uri: 'https://www.google.com/maps/search/?api=1&query=Patio+Savassi+Belo+Horizonte',
      category: 'Cultura, Bistrôs & Segurança',
    },
  ],
};

/**
 * Consulta sugestões de locais públicos seguros para encontros na zona aproximada
 * utilizando Gemini Maps Grounding (`gemini-2.5-flash` com `googleMaps` tool).
 * Envia apenas o centroide público da zona aproximada (nunca coordenadas privadas).
 */
export async function fetchZoneSafeMeetupRecommendations(
  zoneId: string
): Promise<ZoneSafeMeetupGuideResult> {
  const zone =
    APPROXIMATE_NEIGHBORHOOD_ZONES.find((z) => z.zoneId === zoneId) ||
    APPROXIMATE_NEIGHBORHOOD_ZONES[0];

  const curatedFallback = CURATED_SAFE_MEETUP_PLACES[zone.zoneId] || [];

  const apiKey =
    (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      zoneId: zone.zoneId,
      zoneLabel: zone.displayLabel,
      summaryText: `Locais públicos verificados em ${zone.displayLabel} recomendados para um primeiro encontro seguro: ${zone.safetyNote}`,
      citations: curatedFallback,
      source: 'curated_public_landmarks',
      queriedCentroid: zone.centroid,
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Recomende 3 lugares públicos seguros, bem iluminados e conceituados (restaurantes, cafés ou centros culturais) na região de ${zone.neighborhoodName}, em ${zone.cityName}, ideais para um primeiro encontro seguro entre adultos. Seja conciso em português.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: zone.centroid.lat,
              longitude: zone.centroid.lng,
            },
          },
        },
      },
    });

    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundedCitations: SafeMeetupPlaceCitation[] = [];

    for (const chunk of chunks) {
      const mapsChunk = (chunk as any)?.maps;
      if (mapsChunk?.uri && mapsChunk?.title) {
        groundedCitations.push({
          title: String(mapsChunk.title),
          uri: String(mapsChunk.uri),
          category: 'Google Maps Verificado',
        });
      }
    }

    return {
      zoneId: zone.zoneId,
      zoneLabel: zone.displayLabel,
      summaryText:
        response.text ||
        `Sugestões públicas verificadas em ${zone.displayLabel}: ${zone.safetyNote}`,
      citations: groundedCitations.length > 0 ? groundedCitations : curatedFallback,
      source: 'gemini_maps_grounding',
      queriedCentroid: zone.centroid,
    };
  } catch {
    return {
      zoneId: zone.zoneId,
      zoneLabel: zone.displayLabel,
      summaryText: `Locais públicos verificados em ${zone.displayLabel} recomendados para um primeiro encontro seguro: ${zone.safetyNote}`,
      citations: curatedFallback,
      source: 'curated_public_landmarks',
      queriedCentroid: zone.centroid,
    };
  }
}
