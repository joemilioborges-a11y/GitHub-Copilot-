import React, { useState } from 'react';
import {
  Heart,
  Sliders,
  Compass,
  Languages,
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { UserProfileData } from '../../types';

interface Screen07RelationshipPreferencesProps {
  initialData: UserProfileData;
  onSuccess: (data: Partial<UserProfileData>) => void;
}

const RELATIONSHIP_GOALS = [
  'Namoro sério',
  'Conhecer pessoas novas',
  'Amizade e encontros',
  'Relacionamento aberto',
  'Casamento & Futuro a dois',
  'Encontros VIP & Química',
];

const AVAILABLE_INTERESTS = [
  'Vinhos Finos',
  'Gastronomia',
  'Viagens Internacionais',
  'Vida Noturna & Baladas',
  'Cinema & Séries',
  'Arte Contemporânea',
  'Praia & Barco',
  'Música ao Vivo',
  'Fotografia',
  'Livros & Filosofia',
  'Tecnologia & Inovação',
  'Moda & Alta Costura',
];

const AVAILABLE_LANGUAGES = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Italiano',
  'Alemão',
];

export const Screen07RelationshipPreferences: React.FC<Screen07RelationshipPreferencesProps> = ({
  initialData,
  onSuccess,
}) => {
  const [goal, setGoal] = useState(initialData.seeking || 'Namoro sério');
  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(38);
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    initialData.interests?.length ? initialData.interests : ['Vinhos Finos', 'Viagens Internacionais', 'Gastronomia']
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Português', 'Inglês']);

  const toggleInterest = (item: string) => {
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleLanguage = (item: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess({
      seeking: goal,
      interests: selectedInterests,
    });
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="w-full max-w-xl bg-[#0f0f17] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-400 p-[2px]">
              <div className="w-full h-full bg-[#0d0d14] rounded-[9px] flex items-center justify-center font-display font-black text-white text-base">
                J
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white">Preferências & Afinidade</span>
              <span className="block text-[10px] text-slate-400">Calibração do Algoritmo IA</span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Passo 4 de 4
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Objetivo de Relacionamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>O que você está buscando no JOBS?</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIP_GOALS.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    goal === g
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-950'
                      : 'bg-[#151522] border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{g}</span>
                    {goal === g && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Faixa Etária e Distância */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#141420] border border-white/5">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Faixa Etária Desejada</span>
                <span className="text-rose-400">{minAge} a {maxAge} anos</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={18}
                  max={60}
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge - 1))}
                  className="w-full accent-rose-500"
                />
                <input
                  type="range"
                  min={18}
                  max={60}
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge + 1))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Distância Máxima</span>
                <span className="text-amber-400">Até {maxDistance} km</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Interesses Selecionáveis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Seus Interesses Principais</span>
              </label>
              <span className="text-[11px] text-slate-400">{selectedInterests.length} selecionados</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_INTERESTS.map((item) => {
                const isSelected = selectedInterests.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Idiomas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>Idiomas que você fala</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSel = selectedLanguages.includes(lang);
                return (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-semibold'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
          >
            <span>Concluir Configurações & Iniciar Descoberta</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
