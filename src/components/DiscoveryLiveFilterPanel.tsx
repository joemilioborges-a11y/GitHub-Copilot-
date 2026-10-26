import React, { useState, useEffect } from 'react';
import {
  Filter,
  X,
  Check,
  RotateCcw,
  MapPin,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  DiscoveryAndLiveFilterCriteria,
  FilterGenderOption,
  FilterSexualOrientationOption,
  GENDER_FILTER_OPTIONS,
  SEXUAL_ORIENTATION_FILTER_OPTIONS,
  PRESET_LOCATIONS,
  AppliedFilterChip,
  validateFilterCriteria,
  createDefaultFilterCriteria,
} from '../utils/discoveryAndLiveFilters';

export interface DiscoveryLiveFilterPanelProps {
  /** Contexto visual ('discover' | 'lives') */
  context: 'discover' | 'lives';
  /** Critérios atualmente aplicados */
  appliedCriteria: DiscoveryAndLiveFilterCriteria;
  /** Chips de filtros ativos derivados dos critérios aplicados */
  appliedChips: AppliedFilterChip[];
  /** Total de resultados encontrados após filtragem */
  resultsCount: number;
  /** Total disponível antes da filtragem */
  totalAvailableCount: number;
  /** Aviso de limitação de dados opcionais, se aplicável */
  dataLimitationsNotice?: string | null;
  /** Callback acionado ao clicar em "Aplicar filtros" com critérios válidos */
  onApplyFilters: (nextCriteria: DiscoveryAndLiveFilterCriteria) => void;
  /** Callback acionado ao clicar em "Limpar filtros" */
  onClearFilters: () => void;
}

export const DiscoveryLiveFilterPanel: React.FC<DiscoveryLiveFilterPanelProps> = ({
  context,
  appliedCriteria,
  appliedChips,
  resultsCount,
  totalAvailableCount,
  dataLimitationsNotice,
  onApplyFilters,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Rascunho local dentro do painel antes de clicar em "Aplicar filtros"
  const [draftGender, setDraftGender] = useState<FilterGenderOption>(appliedCriteria.gender);
  const [draftOrientations, setDraftOrientations] = useState<FilterSexualOrientationOption[]>(
    appliedCriteria.sexualOrientations
  );
  const [draftMinAgeInput, setDraftMinAgeInput] = useState<string>(
    appliedCriteria.minAge !== null ? String(appliedCriteria.minAge) : ''
  );
  const [draftMaxAgeInput, setDraftMaxAgeInput] = useState<string>(
    appliedCriteria.maxAge !== null ? String(appliedCriteria.maxAge) : ''
  );
  const [draftLocation, setDraftLocation] = useState<string>(
    appliedCriteria.location === 'all' ? '' : appliedCriteria.location
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sincroniza rascunho quando appliedCriteria mudar externamente (ex: Limpar filtros)
  useEffect(() => {
    setDraftGender(appliedCriteria.gender);
    setDraftOrientations([...appliedCriteria.sexualOrientations]);
    setDraftMinAgeInput(appliedCriteria.minAge !== null ? String(appliedCriteria.minAge) : '');
    setDraftMaxAgeInput(appliedCriteria.maxAge !== null ? String(appliedCriteria.maxAge) : '');
    setDraftLocation(appliedCriteria.location === 'all' ? '' : appliedCriteria.location);
    setValidationError(null);
  }, [appliedCriteria]);

  const toggleOrientationOption = (option: FilterSexualOrientationOption) => {
    setDraftOrientations((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const selectAllOrientations = () => {
    setDraftOrientations([]);
  };

  const buildDraftCriteria = (): DiscoveryAndLiveFilterCriteria => {
    const parsedMin =
      draftMinAgeInput.trim() === '' ? null : Number.parseInt(draftMinAgeInput.trim(), 10);
    const parsedMax =
      draftMaxAgeInput.trim() === '' ? null : Number.parseInt(draftMaxAgeInput.trim(), 10);

    return {
      gender: draftGender,
      sexualOrientations: [...draftOrientations],
      minAge: parsedMin,
      maxAge: parsedMax,
      location: draftLocation.trim() === '' ? 'all' : draftLocation.trim(),
    };
  };

  const handleApplyClick = () => {
    const candidate = buildDraftCriteria();
    const validation = validateFilterCriteria(candidate);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Intervalo de filtro inválido.');
      return;
    }

    setValidationError(null);
    onApplyFilters(candidate);
    setIsOpen(false);
  };

  const handleClearClick = () => {
    const reset = createDefaultFilterCriteria();
    setDraftGender(reset.gender);
    setDraftOrientations([]);
    setDraftMinAgeInput('');
    setDraftMaxAgeInput('');
    setDraftLocation('');
    setValidationError(null);
    onClearFilters();
  };

  const handleRemoveSingleChip = (key: AppliedFilterChip['key']) => {
    const next: DiscoveryAndLiveFilterCriteria = {
      ...appliedCriteria,
      sexualOrientations: [...appliedCriteria.sexualOrientations],
    };
    if (key === 'gender') next.gender = 'todos';
    if (key === 'sexualOrientations') next.sexualOrientations = [];
    if (key === 'age') {
      next.minAge = null;
      next.maxAge = null;
    }
    if (key === 'location') next.location = 'all';

    onApplyFilters(next);
  };

  const isAnyActive = appliedChips.length > 0;
  const accentColor = context === 'discover' ? 'rose' : 'cyan';

  return (
    <div
      className="w-full space-y-2.5 mb-3"
      data-testid={`filter-section-${context}`}
    >
      {/* Barra Compacta Superior: Botão "Filtros", Contador e Atalho Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            data-testid={`toggle-filters-btn-${context}`}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-md ${
              isOpen || isAnyActive
                ? context === 'discover'
                  ? 'bg-rose-600/20 border-rose-500/60 text-rose-200 shadow-rose-950/40'
                  : 'bg-cyan-600/20 border-cyan-400/60 text-cyan-200 shadow-cyan-950/40'
                : 'bg-[#12121e] hover:bg-[#19192a] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {isAnyActive && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  context === 'discover'
                    ? 'bg-rose-500 text-white'
                    : 'bg-cyan-400 text-slate-950'
                }`}
              >
                {appliedChips.length}
              </span>
            )}
          </button>

          {isAnyActive && (
            <button
              type="button"
              onClick={handleClearClick}
              data-testid={`quick-clear-filters-btn-${context}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Exibindo <strong className="text-white">{resultsCount}</strong> de{' '}
          <strong className="text-slate-300">{totalAvailableCount}</strong>{' '}
          {context === 'discover' ? 'perfis' : 'transmissões'}
        </div>
      </div>

      {/* Chips Visuais de Filtros Ativos */}
      {isAnyActive && (
        <div
          className="flex flex-wrap items-center gap-1.5 pt-0.5"
          data-testid={`active-filter-chips-${context}`}
        >
          {appliedChips.map((chip) => (
            <span
              key={chip.key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                accentColor === 'rose'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveSingleChip(chip.key)}
                className="hover:text-white cursor-pointer"
                title={`Remover filtro ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Aviso transparente quando dados opcionais/privados não permitirem verificar algum registro */}
      {dataLimitationsNotice && isAnyActive && (
        <div
          data-testid={`filter-limitation-notice-${context}`}
          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2"
        >
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{dataLimitationsNotice}</span>
        </div>
      )}

      {/* Painel Expansível de Filtros */}
      {isOpen && (
        <div
          data-testid={`filter-panel-${context}`}
          className="p-4 sm:p-5 rounded-2xl bg-[#10101b]/95 border border-white/15 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className={`w-4 h-4 ${
                  accentColor === 'rose' ? 'text-rose-400' : 'text-cyan-400'
                }`}
              />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {context === 'discover'
                  ? 'Filtrar Perfis em Descobertas'
                  : 'Filtrar Transmissões e Criadores ao Vivo'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              aria-label="Fechar painel de filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. SEXO */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              1. Sexo
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_FILTER_OPTIONS.map((opt) => {
                const selected = draftGender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftGender(opt.value)}
                    data-testid={`filter-gender-${opt.value}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selected
                        ? accentColor === 'rose'
                          ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                          : 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                        : 'bg-[#171726] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ORIENTAÇÃO SEXUAL (Múltipla Seleção + Não informado + Todos) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                2. Orientação Sexual (uma ou mais opções)
              </label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Privacidade protegida
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={selectAllOrientations}
                data-testid="filter-orientation-todos"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  draftOrientations.length === 0
                    ? accentColor === 'rose'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                      : 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                    : 'bg-[#171726] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                }`}
              >
                {draftOrientations.length === 0 && <Check className="w-3 h-3" />}
                <span>Todos</span>
              </button>

              {SEXUAL_ORIENTATION_FILTER_OPTIONS.map((opt) => {
                const isSelected = draftOrientations.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOrientationOption(opt.value)}
                    data-testid={`filter-orientation-${opt.value}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? accentColor === 'rose'
                          ? 'bg-rose-500/25 text-rose-200 border-rose-400 shadow-sm'
                          : 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-sm'
                        : 'bg-[#171726] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. IDADE (Mínima e Máxima com validação) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              3. Faixa Etária (+18 anos)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] text-slate-400 mb-1">Idade mínima</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  placeholder="18"
                  value={draftMinAgeInput}
                  onChange={(e) => {
                    setDraftMinAgeInput(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid={`filter-min-age-${context}`}
                  className="w-full bg-[#171726] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 mb-1">Idade máxima</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  placeholder="Qualquer"
                  value={draftMaxAgeInput}
                  onChange={(e) => {
                    setDraftMaxAgeInput(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid={`filter-max-age-${context}`}
                  className="w-full bg-[#171726] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* 4. LOCALIZAÇÃO (Cidade ou região, sem GPS preciso) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                4. Localização (Cidade ou Região)
              </label>
              <span className="text-[10px] text-slate-400">Sem coleta de GPS</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_LOCATIONS.map((loc) => {
                const isAll = loc === 'Qualquer localização';
                const selected = isAll
                  ? draftLocation.trim() === ''
                  : draftLocation.trim().toLowerCase() === loc.toLowerCase();
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setDraftLocation(isAll ? '' : loc)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      selected
                        ? accentColor === 'rose'
                          ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                          : 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-[#171726] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                placeholder="Qualquer localização (ou digite cidade/bairro, ex: São Paulo, Leblon)..."
                data-testid={`filter-location-input-${context}`}
                className="w-full bg-[#171726] border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {draftLocation && (
                <button
                  type="button"
                  onClick={() => setDraftLocation('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Voltar para Qualquer localização"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Alerta de erro de validação (ex: idade mínima > máxima) */}
          {validationError && (
            <div
              data-testid={`filter-validation-error-${context}`}
              className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Ações do Painel: Aplicar filtros & Limpar filtros */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleClearClick}
              data-testid={`panel-clear-filters-btn-${context}`}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>

            <button
              type="button"
              onClick={handleApplyClick}
              data-testid={`panel-apply-filters-btn-${context}`}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                accentColor === 'rose'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar filtros</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
