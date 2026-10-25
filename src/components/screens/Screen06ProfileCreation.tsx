import React, { useState } from 'react';
import {
  User,
  MapPin,
  Briefcase,
  Camera,
  Upload,
  Sparkles,
  ArrowRight,
  Shield,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { UserProfileData } from '../../types';

interface Screen06ProfileCreationProps {
  initialData: UserProfileData;
  onSuccess: (data: Partial<UserProfileData>) => void;
}

const DEFAULT_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
];

export const Screen06ProfileCreation: React.FC<Screen06ProfileCreationProps> = ({
  initialData,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState(initialData.name || 'Emilio Borges');
  const [occupation, setOccupation] = useState(initialData.occupation || 'Empresário');
  const [city, setCity] = useState(initialData.city || 'São Paulo - Jardins');
  const [bio, setBio] = useState(
    initialData.bio || 'Apreciador de boa gastronomia, viagens internacionais e conversas autênticas.'
  );
  const [heightCm, setHeightCm] = useState(initialData.heightCm || 180);
  const [zodiacSign, setZodiacSign] = useState(initialData.zodiacSign || 'Touro');
  const [photos, setPhotos] = useState<string[]>(DEFAULT_SAMPLE_PHOTOS.slice(0, 3));
  const [hideAge, setHideAge] = useState(false);
  const [hideCity, setHideCity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotos((prev) => [event.target!.result as string, ...prev.slice(0, 3)]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    if (photos.length <= 1) {
      setError('Mantenha pelo menos uma fotografia principal no seu perfil.');
      return;
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Informe seu nome de exibição.');
      return;
    }
    if (!bio.trim() || bio.length < 15) {
      setError('Escreva uma apresentação pessoal de pelo menos 15 caracteres.');
      return;
    }
    if (!city.trim()) {
      setError('Informe sua cidade ou região aproximada.');
      return;
    }

    onSuccess({
      name: displayName,
      occupation,
      city,
      bio,
      heightCm,
      zodiacSign,
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
              <span className="font-display font-bold text-lg text-white">Criar Perfil JOBS</span>
              <span className="block text-[10px] text-slate-400">Apresentação & Fotografias</span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Passo 3 de 4
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-700/50 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Fotografias do Perfil (Principal e Galeria)
              </label>
              <span className="text-[11px] text-slate-400">{photos.length}/4 fotos</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-slate-900"
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white shadow">
                      Principal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-rose-500/60 flex flex-col items-center justify-center text-slate-400 hover:text-rose-400 cursor-pointer bg-white/5 transition-colors">
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px]">Adicionar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Fotos com boa iluminação e rosto nítido geram até 3x mais conexões compatíveis.
            </p>
          </div>

          {/* Nome & Ocupação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome de exibição
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome ou apelido"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Profissão / Ocupação
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ex: Arquiteto, Advogado"
                  className="w-full bg-[#151522] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Cidade Aproximada (com aviso LGPD) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cidade ou Região Aproximada
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo - Jardins, Rio de Janeiro - Zona Sul"
                className="w-full bg-[#151522] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Proteção LGPD: Nunca compartilhamos seu endereço residencial ou coordenadas GPS exatas.</span>
            </div>
          </div>

          {/* Apresentação Pessoal (Bio) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Apresentação Pessoal (Bio)
              </label>
              <span className="text-[10px] text-slate-400">{bio.length}/500</span>
            </div>
            <textarea
              rows={3}
              value={bio}
              maxLength={500}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você, seu estilo de vida e o que torna seus momentos especiais..."
              className="w-full bg-[#151522] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Altura & Signo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Altura (cm)</label>
              <input
                type="number"
                min={130}
                max={220}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full bg-[#151522] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Signo</label>
              <select
                value={zodiacSign}
                onChange={(e) => setZodiacSign(e.target.value)}
                className="w-full bg-[#151522] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Áries">Áries</option>
                <option value="Touro">Touro</option>
                <option value="Gêmeos">Gêmeos</option>
                <option value="Câncer">Câncer</option>
                <option value="Leão">Leão</option>
                <option value="Virgem">Virgem</option>
                <option value="Libra">Libra</option>
                <option value="Escorpião">Escorpião</option>
                <option value="Sagitário">Sagitário</option>
                <option value="Capricórnio">Capricórnio</option>
                <option value="Aquário">Aquário</option>
                <option value="Peixes">Peixes</option>
              </select>
            </div>
          </div>

          {/* Privacidade do Perfil */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Controles de Privacidade no Perfil
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideAge}
                  onChange={(e) => setHideAge(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <span className="text-slate-300 text-[11px]">Ocultar idade publicamente</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideCity}
                  onChange={(e) => setHideCity(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <span className="text-slate-300 text-[11px]">Ocultar cidade no cartão inicial</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continuar para Preferências</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
