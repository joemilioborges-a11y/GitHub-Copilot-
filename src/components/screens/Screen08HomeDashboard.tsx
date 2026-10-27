import React from 'react';
import {
  Sparkles,
  Heart,
  MessageCircle,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sliders,
  Crown,
  Lock,
  UserCheck,
  Video,
  Trophy,
  Coins,
} from 'lucide-react';
import { Profile, UserProfileData, UserSubscription } from '../../types';
import { calculateAiCompatibility } from '../../utils/aiMatchmaking';
import { MonthlyRecognitionPublicSection } from '../MonthlyRecognitionPublicSection';

interface Screen08HomeDashboardProps {
  userProfile: UserProfileData;
  subscription: UserSubscription;
  profiles: Profile[];
  matchesCount: number;
  unreadCount: number;
  onNavigate: (tab: string) => void;
  onSelectProfile: (profile: Profile) => void;
  onOpenChallenges?: () => void;
  onOpenWallet?: () => void;
  onOpenCreatorContentStudio?: () => void;
}

export const Screen08HomeDashboard: React.FC<Screen08HomeDashboardProps> = ({
  userProfile,
  subscription,
  profiles,
  matchesCount,
  unreadCount,
  onNavigate,
  onSelectProfile,
  onOpenChallenges,
  onOpenWallet,
  onOpenCreatorContentStudio,
}) => {
  // Take top 4 compatible profiles
  const recommendedProfiles = profiles.slice(0, 4).map((p) => {
    const ai = calculateAiCompatibility(userProfile, p);
    return { profile: p, ai };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-[#12121e] to-slate-900 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>JOBS Dashboard 1.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
              Olá, {userProfile.name.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              A inteligência artificial encontrou novas pessoas compatíveis com seu estilo de vida em {userProfile.city}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('subscriptions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                subscription.tier === 'vip'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-md'
                  : subscription.tier === 'premium'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="capitalize">Plano {subscription.tier}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('connections')}
          className="p-4 rounded-2xl bg-[#0f0f18] border border-white/5 hover:border-rose-500/40 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Conexões</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{matchesCount}</div>
          <div className="text-[11px] text-slate-400">Matches mútuos ativos</div>
        </button>

        <button
          onClick={() => onNavigate('messages')}
          className="p-4 rounded-2xl bg-[#0f0f18] border border-white/5 hover:border-indigo-500/40 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Mensagens</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{unreadCount > 0 ? unreadCount : 1}</div>
          <div className="text-[11px] text-slate-400">Conversas não lidas</div>
        </button>

        <button
          onClick={() => onNavigate('discover')}
          className="p-4 rounded-2xl bg-[#0f0f18] border border-white/5 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Descoberta</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-amber-400">{profiles.length}</div>
          <div className="text-[11px] text-slate-400">Perfis na sua região</div>
        </button>
      </div>

      {/* Quick Access: Desafios Interativos Consensuais & Carteira JOBS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {onOpenChallenges && (
          <div
            onClick={onOpenChallenges}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#181228] to-[#120f20] border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Desafios Consensuais</h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    18+
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Votações voluntárias de estilo e moda · Sem apostas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        {onOpenWallet && (
          <div
            onClick={onOpenWallet}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#1e1510] to-[#140f0c] border border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Carteira & Créditos JOBS</h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    TESTES
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Consultar saldo, extrato e pacotes simulados</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        {onOpenCreatorContentStudio && (
          <div
            onClick={onOpenCreatorContentStudio}
            className="sm:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-[#1c1122] via-[#151226] to-[#1d1512] border border-rose-500/35 hover:border-rose-500/60 transition-all cursor-pointer flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/40 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">
                    Meu Conteúdo, Publicar Foto/Vídeo & Cofre VIP
                  </h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    49 💎 / 99 💎 / 149 💎
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Publique fotos e vídeos gratuitos, exclusivos avulsos ou no seu Cofre VIP com repasse 70%
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>

      {/* Seção Pública Oficial: Garoto JOBS e Garota JOBS */}
      <MonthlyRecognitionPublicSection
        onSelectCreatorProfile={(creatorId) => {
          const found = profiles.find((p) => p.id === creatorId);
          if (found) onSelectProfile(found);
        }}
      />

      {/* Destaques Recomendados pela IA */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-display font-bold text-white">Destaques Recomendados por IA</h2>
          </div>
          <button
            onClick={() => onNavigate('discover')}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recommendedProfiles.map(({ profile, ai }) => (
            <div
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className="p-3.5 rounded-2xl bg-[#11111c] border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer flex gap-3.5 group"
            >
              <img
                src={profile.avatar || profile.photos[0]}
                alt={profile.name}
                className="w-20 h-24 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm text-white truncate flex items-center gap-1">
                    <span>{profile.name}</span>
                    <span className="text-xs text-slate-400 font-normal">, {profile.age}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {ai.overallScore}% Afinidade
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mb-2">{profile.occupation || profile.city}</p>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-black/20 p-1.5 rounded-lg border border-white/5">
                  {ai.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Button to Start Discover */}
      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('discover')}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
        >
          <Flame className="w-5 h-5 fill-current" />
          <span>Iniciar Descoberta de Perfis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Safety & Compliance Card */}
      <div className="p-4 rounded-2xl bg-[#0c0c14] border border-emerald-500/20 flex items-start gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-slate-200 mb-0.5">Comunidade Protegida & Respeitosa</div>
          <div>
            O JOBS proíbe assédio e exige consentimento mútuo. Perfis suspeitos podem ser denunciados e bloqueados a qualquer momento com garantia de confidencialidade.
          </div>
        </div>
      </div>
    </div>
  );
};
