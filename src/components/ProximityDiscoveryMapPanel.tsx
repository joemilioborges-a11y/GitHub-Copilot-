import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  ShieldCheck,
  Navigation,
  Sliders,
  EyeOff,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Lock,
  Compass,
  Users,
  Info,
} from 'lucide-react';
import { Profile } from '../types';
import {
  ALLOWED_RADIUS_OPTIONS_KM,
  APPROXIMATE_NEIGHBORHOOD_ZONES,
  ApproximateZoneSummary,
  EnrichedProximityProfile,
  ProximityConsentAndState,
  ZoneSafeMeetupGuideResult,
  fetchZoneSafeMeetupRecommendations,
  grantProximityConsentForZone,
  requestForegroundApproximateLocation,
  revokeProximityConsent,
  saveProximityConsentState,
} from '../utils/proximityPrivacyService';

interface ProximityDiscoveryMapPanelProps {
  proximityState: ProximityConsentAndState;
  onProximityStateChange: (next: ProximityConsentAndState) => void;
  zoneSummaries: ApproximateZoneSummary[];
  enrichedProfiles: EnrichedProximityProfile[];
  referenceCentroid: { lat: number; lng: number };
  referenceLabel: string;
  onSelectProfile: (profile: Profile) => void;
}

const CITY_FALLBACK_OPTIONS = [
  'São Paulo',
  'Rio de Janeiro',
  'Curitiba',
  'Belo Horizonte',
  'Qualquer localização',
];

export const ProximityDiscoveryMapPanel: React.FC<ProximityDiscoveryMapPanelProps> = ({
  proximityState,
  onProximityStateChange,
  zoneSummaries,
  enrichedProfiles,
  referenceCentroid,
  referenceLabel,
  onSelectProfile,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    proximityState.activeZoneId || 'sp_jardins'
  );
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [safeMeetupGuide, setSafeMeetupGuide] = useState<ZoneSafeMeetupGuideResult | null>(
    null
  );
  const [loadingGrounding, setLoadingGrounding] = useState(false);

  // Chave lida exclusivamente de variável de ambiente Vite (nunca hardcoded)
  const googleMapsApiKey = (
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || ''
  ).trim();
  const hasValidMapsApiKey =
    Boolean(googleMapsApiKey) &&
    googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    googleMapsApiKey.length > 10;

  const selectedZoneSummary =
    zoneSummaries.find((s) => s.zone.zoneId === selectedZoneId) ||
    zoneSummaries[0] ||
    null;

  useEffect(() => {
    let active = true;
    setLoadingGrounding(true);
    fetchZoneSafeMeetupRecommendations(selectedZoneId)
      .then((res) => {
        if (active) {
          setSafeMeetupGuide(res);
          setLoadingGrounding(false);
        }
      })
      .catch(() => {
        if (active) setLoadingGrounding(false);
      });
    return () => {
      active = false;
    };
  }, [selectedZoneId]);

  const handleConfirmConsentAndForegroundGps = async () => {
    const result = await requestForegroundApproximateLocation(
      true,
      proximityState.radiusKm
    );
    onProximityStateChange(result.state);
    setSelectedZoneId(result.state.activeZoneId);
    setStatusNotice(result.notice);
    setConsentModalOpen(false);
  };

  const handleConfirmConsentForSelectedZone = (zoneId: string) => {
    const updated = grantProximityConsentForZone(zoneId, proximityState.radiusKm);
    onProximityStateChange(updated);
    setSelectedZoneId(updated.activeZoneId);
    setStatusNotice(
      `Descoberta por proximidade ativada na grade de 1 a 2 km (${updated.quantizedUserGrid?.gridCellId}).`
    );
    setConsentModalOpen(false);
  };

  const handleDisableProximity = () => {
    const revoked = revokeProximityConsent(proximityState.selectedCityRegion);
    onProximityStateChange(revoked);
    setStatusNotice(
      'Descoberta por proximidade desativada. Coordenada quantizada removida e modo Cidade/Região ativado.'
    );
  };

  const handleRadiusChange = (radiusKm: number) => {
    const updated = saveProximityConsentState({
      ...proximityState,
      radiusKm,
    });
    onProximityStateChange(updated);
  };

  const handleCityRegionFallbackChange = (city: string) => {
    const matchingZone =
      APPROXIMATE_NEIGHBORHOOD_ZONES.find((z) => z.cityName === city) ||
      APPROXIMATE_NEIGHBORHOOD_ZONES[0];
    const updated = saveProximityConsentState({
      ...proximityState,
      selectedCityRegion: city,
      activeZoneId: matchingZone.zoneId,
    });
    onProximityStateChange(updated);
    setSelectedZoneId(matchingZone.zoneId);
  };

  const handleZoneSelection = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (proximityState.consentGranted && proximityState.proximityEnabled) {
      const updated = grantProximityConsentForZone(zoneId, proximityState.radiusKm);
      onProximityStateChange(updated);
    }
  };

  return (
    <div
      className="space-y-3 rounded-3xl bg-[#0d0d17] border border-white/10 p-3.5 shadow-2xl"
      data-testid="proximity-discovery-map-panel"
    >
      {/* Cabeçalho de Segurança e Status de Privacidade Espacial */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white">
                Mapa de Zonas Aproximadas (Grade 1–2 km)
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                Sem GPS Exato
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{referenceLabel}</p>
          </div>
        </div>

        {proximityState.consentGranted && proximityState.proximityEnabled ? (
          <button
            type="button"
            onClick={handleDisableProximity}
            data-testid="disable-proximity-btn"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Desativar Proximidade (Usar Cidade)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConsentModalOpen(true)}
            data-testid="enable-proximity-consent-btn"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Ativar Proximidade (Consentimento LGPD)</span>
          </button>
        )}
      </div>

      {statusNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-emerald-300 hover:text-white text-[10px] font-bold"
          >
            OK
          </button>
        </div>
      )}

      {/* Controle de Raio de Busca vs Alternativa Cidade/Região */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#131322] p-3 rounded-2xl border border-white/5">
        {proximityState.consentGranted && proximityState.proximityEnabled ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-rose-400" />
                Raio de Busca Aproximado:
              </span>
              <span className="font-bold text-rose-400">
                {proximityState.radiusKm === 500
                  ? 'Todas as zonas (500 km)'
                  : `Até ~${proximityState.radiusKm} km`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ALLOWED_RADIUS_OPTIONS_KM.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRadiusChange(r)}
                  data-testid={`radius-option-${r}`}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                    proximityState.radiusKm === r
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {r === 500 ? 'Todas' : `~${r} km`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Alternativa por Cidade / Região (Sem GPS):
            </label>
            <select
              value={proximityState.selectedCityRegion}
              onChange={(e) => handleCityRegionFallbackChange(e.target.value)}
              data-testid="city-fallback-select"
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              {CITY_FALLBACK_OPTIONS.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Zona de Referência Ativa (Grade 1–2 km):
          </label>
          <select
            value={selectedZoneId}
            onChange={(e) => handleZoneSelection(e.target.value)}
            data-testid="active-zone-select"
            className="w-full rounded-xl bg-slate-900 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
          >
            {APPROXIMATE_NEIGHBORHOOD_ZONES.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.displayLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Superfície do Mapa de Zonas Aproximadas (Google Maps SDK ou Radar de Zonas Aproximadas) */}
      <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-white/10 bg-[#090d16]">
        {hasValidMapsApiKey ? (
          <APIProvider apiKey={googleMapsApiKey}>
            <Map
              defaultCenter={referenceCentroid}
              center={
                selectedZoneSummary?.zone.centroid || referenceCentroid
              }
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {zoneSummaries.map((summary) => (
                <AdvancedMarker
                  key={summary.zone.zoneId}
                  position={summary.zone.centroid}
                  onClick={() => setSelectedZoneId(summary.zone.zoneId)}
                >
                  <div
                    className={`px-2.5 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md transition-transform cursor-pointer flex items-center gap-1.5 ${
                      selectedZoneId === summary.zone.zoneId
                        ? 'bg-rose-600/95 border-white text-white scale-105'
                        : 'bg-slate-950/90 border-rose-500/50 text-slate-100'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <div className="text-[10px] leading-tight">
                      <div className="font-bold">{summary.zone.neighborhoodName}</div>
                      <div className="text-[9px] opacity-90">
                        {summary.profilesCount} perfil(is) • {summary.approximateDistanceLabel}
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

              {selectedZoneSummary && (
                <InfoWindow
                  position={selectedZoneSummary.zone.centroid}
                  onCloseClick={() => {}}
                >
                  <div className="text-slate-900 p-1 max-w-[200px] space-y-1">
                    <div className="font-bold text-xs">
                      {selectedZoneSummary.zone.displayLabel}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Zona aproximada (raio ~{(selectedZoneSummary.zone.zoneRadiusMeters / 1000).toFixed(1)} km). Nenhum endereço exato é exibido.
                    </div>
                    <div className="text-[11px] font-semibold text-rose-600">
                      {selectedZoneSummary.profilesCount} perfil(is) na região •{' '}
                      {selectedZoneSummary.approximateDistanceLabel}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* Visualizador de Zonas Aproximadas quando chave de navegador não está definida */
          <div className="w-full h-full relative flex flex-col justify-between p-3 bg-[radial-gradient(circle_at_center,#1e1b38_0%,#090d16_75%)]">
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] text-slate-300 font-semibold">
                Malha Espacial Ofuscada (Células de 1–2 km)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 font-bold">
                {enrichedProfiles.length} perfil(is) elegíveis
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 my-auto z-10 max-h-40 overflow-y-auto pr-1">
              {zoneSummaries.map((summary) => {
                const isSelected = summary.zone.zoneId === selectedZoneId;
                return (
                  <button
                    key={summary.zone.zoneId}
                    type="button"
                    onClick={() => setSelectedZoneId(summary.zone.zoneId)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600/25 border-rose-400 text-white shadow-lg'
                        : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">
                        {summary.zone.neighborhoodName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 shrink-0">
                        {summary.approximateDistanceLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {summary.zone.cityName}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className="text-rose-300 font-semibold">
                        {summary.profilesCount} perfil(is)
                      </span>
                      {summary.onlineCount > 0 && (
                        <span className="text-emerald-400">
                          • {summary.onlineCount} online
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between z-10 bg-black/50 px-2.5 py-1 rounded-lg border border-white/5">
              <span>Proteção anti-triangulação ativa (0.015° grid)</span>
              <span>Coordenadas exatas nunca armazenadas</span>
            </div>
          </div>
        )}
      </div>

      {/* Perfis Encontrados na Zona Aproximada / Filtro Ativo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Perfis por Zona Aproximada ({enrichedProfiles.length})
            </span>
          </h4>
          <span className="text-[10px] text-slate-400">
            Distâncias arredondadas (~km)
          </span>
        </div>

        {enrichedProfiles.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#131322] border border-white/5 text-center space-y-1">
            <p className="text-xs font-semibold text-white">
              Nenhum perfil dentro deste raio ou região
            </p>
            <p className="text-[11px] text-slate-400">
              Amplie o raio de busca aproximada ou selecione todas as regiões.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {enrichedProfiles.map((item) => (
              <div
                key={item.profile.id}
                onClick={() => onSelectProfile(item.profile)}
                data-testid={`proximity-profile-card-${item.profile.id}`}
                className="p-2.5 rounded-2xl bg-[#131322] hover:bg-[#19192e] border border-white/10 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={item.profile.avatar}
                    alt={item.profile.name}
                    className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {item.profile.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        , {item.publicAgeLabel}
                      </span>
                      {item.profile.verified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{item.publicCityLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                    {item.approximateDistanceLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Maps Grounding: Locais Públicos Seguros para Encontros no Bairro */}
      {safeMeetupGuide && (
        <div
          className="p-3 rounded-2xl bg-[#121324] border border-indigo-500/30 space-y-2"
          data-testid="maps-grounding-safe-meetup-box"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Pontos Públicos Seguros para Encontro ({safeMeetupGuide.zoneLabel})
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold">
              Google Maps Grounding
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {loadingGrounding
              ? 'Consultando referências públicas da região...'
              : safeMeetupGuide.summaryText}
          </p>

          {safeMeetupGuide.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {safeMeetupGuide.citations.map((place, idx) => (
                <a
                  key={`${place.title}_${idx}`}
                  href={place.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>{place.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-75" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Consentimento Explícito LGPD (Opt-In antes de obter localização) */}
      {consentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          data-testid="proximity-consent-modal"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#12121f] border border-rose-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white">
                  Consentimento de Localização Aproximada (LGPD)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Privacidade por padrão • Sem coordenadas exatas
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-[#18182a] p-3.5 rounded-2xl border border-white/5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Grade reduzida de 1 a 2 km:</strong> Sua posição é arredondada imediatamente para uma malha de bairro (0.015°). Endereços e coordenadas exatas são descartados.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Apenas durante o uso (Foreground):</strong> O JOBS nunca coleta localização em segundo plano.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Controle reversível:</strong> Você pode desativar a qualquer momento e usar a busca manual por Cidade/Região.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirmConsentAndForegroundGps}
                data-testid="confirm-foreground-gps-consent-btn"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold cursor-pointer shadow-lg"
              >
                Autorizar Localização Aproximada (Grade 1–2 km)
              </button>

              <button
                type="button"
                onClick={() => handleConfirmConsentForSelectedZone(selectedZoneId)}
                data-testid="confirm-zone-only-consent-btn"
                className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Usar Apenas o Centroide da Zona Selecionada (Sem GPS)
              </button>

              <button
                type="button"
                onClick={() => setConsentModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Continuar no Modo Cidade/Região
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
