import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Coins,
  Heart,
  Lock,
  Sparkles,
  MapPin,
  Settings,
  User,
  BarChart2,
  Music,
  Dumbbell,
  Compass,
  Check,
  ArrowDownRight,
  Wallet,
  Ban,
  Star,
  Shield,
  Clock,
  Calendar,
  MessageCircle,
  Activity,
  TrendingUp,
  Flame,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { UserProfileData, Profile } from '../types';
import { AVAILABLE_HOBBIES, AVAILABLE_MUSIC_GENRES, AVAILABLE_ZODIAC } from '../data/mockData';
import { trackEvent } from '../utils/analytics';
import { FanTierBadge } from './FanTierBadge';
import { PrestigeSystemPanel } from './PrestigeSystemPanel';
import {
  PRESTIGE_TIERS,
  getPrestigeTier,
  getEquippedMedal,
  getPrestigeSettings,
  PrestigeSettings,
} from '../data/prestigeData';
import { getUserReferralData, isReferralCampaignActive } from '../data/referralData';
import { FanTierLevel } from '../types';

interface UserProfileViewProps {
  userProfile: UserProfileData;
  onUpdateProfile: (updated: UserProfileData) => void;
  userCredits: number;
  unlockedCount: number;
  totalCreditsSpent?: number;
  onOpenWallet: () => void;
  onOpenCreatorStudio: () => void;
  onOpenAdminDashboard: () => void;
  onOpenWithdrawPix?: () => void;
  onOpenReferral?: () => void;
  onSimulateCreditSpend?: (amount: number) => void;
  profiles?: Profile[];
  blockedUserIds?: string[];
  onToggleBlock?: (creatorId: string) => void;
  favoriteCreatorIds?: string[];
  onToggleFavorite?: (creatorId: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfile,
  onUpdateProfile,
  userCredits,
  unlockedCount,
  totalCreditsSpent = 350,
  onOpenWallet,
  onOpenCreatorStudio,
  onOpenAdminDashboard,
  onOpenWithdrawPix,
  onOpenReferral,
  onSimulateCreditSpend,
  profiles = [],
  blockedUserIds = [],
  onToggleBlock,
  favoriteCreatorIds = [],
  onToggleFavorite,
}) => {
  const [formData, setFormData] = useState<UserProfileData>(userProfile);
  const [savedMsg, setSavedMsg] = useState(false);
  const [activityView, setActivityView] = useState<'days' | 'hours' | 'stacked'>('days');

  // Viral Referral Pyramid State
  const [referralData, setReferralData] = useState(() => getUserReferralData());
  const [isReferralActive, setIsReferralActive] = useState(() => isReferralCampaignActive());

  useEffect(() => {
    const handleRefUpdate = () => {
      setReferralData(getUserReferralData());
      setIsReferralActive(isReferralCampaignActive());
    };
    window.addEventListener('jhobs:referral_updated', handleRefUpdate);
    window.addEventListener('jhobs:referral_status_changed', handleRefUpdate);
    return () => {
      window.removeEventListener('jhobs:referral_updated', handleRefUpdate);
      window.removeEventListener('jhobs:referral_status_changed', handleRefUpdate);
    };
  }, []);

  // Equipped Prestige Tier and user settings
  const [equippedTierLevel, setEquippedTierLevel] = useState<FanTierLevel>(() =>
    getEquippedMedal(totalCreditsSpent)
  );
  const [prestigeSettings, setPrestigeSettings] = useState<PrestigeSettings>(() =>
    getPrestigeSettings()
  );

  const currentTier = getPrestigeTier(totalCreditsSpent);
  const equippedTier =
    PRESTIGE_TIERS.find((t) => t.level === equippedTierLevel) || currentTier;

  // Listen to prestige changes across the app
  useEffect(() => {
    const handlePrestigeUpdate = () => {
      setEquippedTierLevel(getEquippedMedal(totalCreditsSpent));
      setPrestigeSettings(getPrestigeSettings());
    };
    window.addEventListener('jhobs:prestige_updated', handlePrestigeUpdate);
    return () => window.removeEventListener('jhobs:prestige_updated', handlePrestigeUpdate);
  }, [totalCreditsSpent]);

  interface ActivityDataPoint {
    timeLabel: string;
    subLabel: string;
    messages: number;
    profileInteractions: number;
    total: number;
    isPeak?: boolean;
  }

  // Activity distribution data for recharts visualization
  const weeklyActivityData: ActivityDataPoint[] = [
    { timeLabel: 'Seg', subLabel: 'Segunda-feira', messages: 14, profileInteractions: 22, total: 36 },
    { timeLabel: 'Ter', subLabel: 'Terça-feira', messages: 18, profileInteractions: 25, total: 43 },
    { timeLabel: 'Qua', subLabel: 'Quarta-feira', messages: 16, profileInteractions: 28, total: 44 },
    { timeLabel: 'Qui', subLabel: 'Quinta-feira', messages: 24, profileInteractions: 36, total: 60 },
    { timeLabel: 'Sex', subLabel: 'Sexta-feira', messages: 35, profileInteractions: 52, total: 87, isPeak: true },
    { timeLabel: 'Sáb', subLabel: 'Sábado', messages: 42, profileInteractions: 58, total: 100, isPeak: true },
    { timeLabel: 'Dom', subLabel: 'Domingo', messages: 28, profileInteractions: 40, total: 68 },
  ];

  const hourlyActivityData: ActivityDataPoint[] = [
    { timeLabel: '00h-04h', subLabel: 'Madrugada VIP', messages: 28, profileInteractions: 42, total: 70, isPeak: true },
    { timeLabel: '04h-08h', subLabel: 'Alvorada', messages: 5, profileInteractions: 9, total: 14 },
    { timeLabel: '08h-12h', subLabel: 'Manhã', messages: 14, profileInteractions: 21, total: 35 },
    { timeLabel: '12h-15h', subLabel: 'Almoço', messages: 22, profileInteractions: 31, total: 53 },
    { timeLabel: '15h-18h', subLabel: 'Tarde', messages: 19, profileInteractions: 28, total: 47 },
    { timeLabel: '18h-21h', subLabel: 'Início Noite', messages: 34, profileInteractions: 48, total: 82 },
    { timeLabel: '21h-00h', subLabel: 'Pico Noturno', messages: 46, profileInteractions: 64, total: 110, isPeak: true },
  ];

  const toggleHobby = (hobby: string) => {
    setFormData((prev) => {
      const exists = prev.hobbies.includes(hobby);
      const nextHobbies = exists
        ? prev.hobbies.filter((h) => h !== hobby)
        : [...prev.hobbies, hobby];
      return { ...prev, hobbies: nextHobbies };
    });
  };

  const toggleMusic = (genre: string) => {
    setFormData((prev) => {
      const exists = prev.musicGenres.includes(genre);
      const nextGenres = exists
        ? prev.musicGenres.filter((g) => g !== genre)
        : [...prev.musicGenres, genre];
      return { ...prev, musicGenres: nextGenres };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    trackEvent('user_profile_updated', {
      hobbiesCount: formData.hobbies.length,
      musicCount: formData.musicGenres.length,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Quick Access Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#181828] to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Administrador Jhobs</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                Painel Master
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Acompanhe pessoas online ao vivo, distribuição pelas regiões do planeta (por sexo, idade e opção sexual), tráfego do GA4 e receitas.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAdminDashboard}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer shadow-md shadow-amber-950 shrink-0 flex items-center justify-center gap-1.5"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Abrir Painel Admin</span>
        </button>
      </div>

      {/* Profile Card Header with Prestige Aura and Medal */}
      <div className="p-6 rounded-3xl bg-[#12121a] border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left relative overflow-hidden">
        {/* Ambient Prestige Glow behind avatar */}
        {prestigeSettings.avatarFrameEnabled && (
          <div
            className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 transition-all duration-700"
            style={{ backgroundColor: equippedTier.glowColor }}
          />
        )}

        <div className="relative">
          {prestigeSettings.avatarFrameEnabled && (
            <div
              className="absolute -inset-1.5 rounded-full blur-sm opacity-70 animate-pulse pointer-events-none"
              style={{ backgroundColor: equippedTier.glowColor }}
            />
          )}
          <div
            className={`w-24 h-24 rounded-full p-1 relative z-10 transition-all ${
              prestigeSettings.avatarFrameEnabled
                ? equippedTier.avatarRingClass
                : 'bg-gradient-to-tr from-rose-500 via-amber-500 to-rose-600'
            }`}
          >
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-slate-200 overflow-hidden">
              <User className="w-12 h-12 text-slate-400" />
            </div>
          </div>

          <div
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-sky-500 text-white shadow-md z-20"
            title="Verificado +18"
          >
            <ShieldCheck className="w-4 h-4" />
          </div>

          {/* Equipped Prestige Medal Mini Badge */}
          {prestigeSettings.chatBadgeEnabled && (
            <div
              className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full border text-[9px] font-black shadow-lg z-20 flex items-center gap-1 ${equippedTier.badgeColorClass}`}
              title={`Medalha Equipada: ${equippedTier.medalName}`}
            >
              <span>{equippedTier.badge.split(' ')[1] || '🎖️'}</span>
              <span className="hidden sm:inline uppercase text-[8px]">{equippedTier.level}</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1 relative z-10">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white font-display">
              {formData.name}, {formData.age}
            </h2>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full">
              Verificado +18
            </span>
            {/* Prestige Fan Tier Badge */}
            <FanTierBadge creditsSpent={totalCreditsSpent} size="sm" onOpenWallet={onOpenWallet} />
            {/* Equipped Medal Tag */}
            {equippedTierLevel && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${equippedTier.badgeColorClass}`}
                title={`Medalha Equipada: ${equippedTier.medalName}`}
              >
                <span>🎖️</span>
                <span>{equippedTier.medalName}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{formData.city} · Membro VIP Jhobs · Nível {currentTier.name}</span>
          </p>
          <p className="text-xs text-slate-300 italic pt-1">{formData.bio}</p>
        </div>

        <button
          onClick={onOpenWallet}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-amber-950/40 hover:scale-105 transition-transform relative z-10"
        >
          <Coins className="w-4 h-4" />
          <span>{userCredits} 💎</span>
        </button>
      </div>

      {/* Gamified Prestige Level System & Perks Panel */}
      <PrestigeSystemPanel
        totalCreditsSpent={totalCreditsSpent}
        onOpenWallet={onOpenWallet}
        onSimulateCreditSpend={onSimulateCreditSpend}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#141420] border border-slate-800 text-center">
          <span className="text-2xl font-mono font-bold text-amber-400">{unlockedCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Fotos Desbloqueadas</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#141420] border border-slate-800 text-center">
          <span className="text-2xl font-mono font-bold text-rose-400">4</span>
          <span className="text-[11px] text-slate-400 block mt-1">Matches Ativos</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#141420] border border-slate-800 text-center">
          <span className="text-2xl font-mono font-bold text-emerald-400">100%</span>
          <span className="text-[11px] text-slate-400 block mt-1">Idade +18 Verificada</span>
        </div>
      </div>

      {/* Programa de Afiliados e Pirâmide Viral: Indique & Ganhe no PIX */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#171124] via-[#12121e] to-[#1a1428] border-2 border-amber-500/40 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-amber-950/40 shrink-0">
              <div className="w-full h-full bg-[#12121e] rounded-[14px] flex items-center justify-center text-amber-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase font-mono tracking-wider">
                  Pirâmide de Afiliados
                </span>
                {isReferralActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Recompensas Ativas</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                    Pausado pelo Admin
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white font-display mt-1">
                Indique Amigos & Ganhe Dinheiro via PIX
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed mt-0.5">
                Envie seu link exclusivo. Assim que a pessoa instalar e usar o app, você recebe R$ 15,00 + comissões de recargas liberadas imediatamente para saque no seu banco!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {onOpenReferral && (
              <button
                type="button"
                onClick={onOpenReferral}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-950/50 flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Ver Minha Pirâmide & Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 relative z-10 font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Membros na Rede:</span>
            <span className="text-sm font-black text-white">{referralData.totalMembersCount} amigos</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Nível 1 (Diretos):</span>
            <span className="text-sm font-black text-emerald-400">{referralData.level1Count} pessoas</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">Total Ganho:</span>
            <span className="text-sm font-black text-amber-300">R$ {referralData.totalEarnedBrl.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
            <span className="text-[10px] text-emerald-300 block font-sans font-bold">Pronto p/ Saque PIX:</span>
            <span className="text-sm font-black text-emerald-400">R$ {referralData.availableForWithdrawBrl.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      {/* Activity Summary & Connection Habits with Recharts BarChart */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#12121e] border border-amber-500/30 shadow-xl space-y-5">
        {/* Header & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <BarChart2 className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white font-display">
                Resumo de Atividade & Hábitos de Conexão
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualize em quais dias e horários você tem maior engajamento no envio de mensagens e interação com perfis.
            </p>
          </div>

          {/* View mode toggle */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActivityView('days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activityView === 'days'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dias da Semana</span>
            </button>
            <button
              type="button"
              onClick={() => setActivityView('hours')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activityView === 'hours'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Horários do Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setActivityView('stacked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activityView === 'stacked'
                  ? 'bg-rose-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Empilhado (Total)</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Dia Mais Ativo</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-base font-extrabold text-amber-400 font-display block">Sábado</span>
            <span className="text-[10px] text-slate-400">100 interações registradas</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Horário de Pico</span>
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            </div>
            <span className="text-base font-extrabold text-rose-400 font-display block">21h às 00h</span>
            <span className="text-[10px] text-slate-400">Pico Noturno (+42% chats)</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Chats Enviados</span>
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-base font-extrabold text-white font-mono block">177 msgs</span>
            <span className="text-[10px] text-emerald-400 font-semibold">+18% esta semana</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Interações Perfis</span>
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="text-base font-extrabold text-white font-mono block">261 ações</span>
            <span className="text-[10px] text-slate-400">Curtidas & Desbloqueios</span>
          </div>
        </div>

        {/* Recharts BarChart Canvas */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block shadow-sm shadow-amber-500" />
                <span>Envio de Mensagens (Chats)</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block shadow-sm shadow-rose-500" />
                <span>Interação com Perfis (Curtidas & Nudes)</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {activityView === 'hours' ? 'Ciclo Diário de 24 horas' : 'Ciclo Semanal'}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activityView === 'hours' ? hourlyActivityData : weeklyActivityData}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const currentDataset = activityView === 'hours' ? hourlyActivityData : weeklyActivityData;
                      const item = currentDataset.find((d) => d.timeLabel === label);

                      return (
                        <div className="bg-[#0f0f18]/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[170px]">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-bold text-white font-display">
                              {item ? `${item.timeLabel} · ${item.subLabel}` : label}
                            </span>
                            {item?.isPeak && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🔥 Pico
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-amber-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <MessageCircle className="w-3.5 h-3.5" /> Mensagens:
                            </span>
                            <span className="font-mono font-bold">
                              {payload.find((p: any) => p.dataKey === 'messages')?.value || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-rose-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5" /> Interações Perfis:
                            </span>
                            <span className="font-mono font-bold">
                              {payload.find((p: any) => p.dataKey === 'profileInteractions')?.value || 0}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-slate-300 font-bold">
                            <span>Total de Ações:</span>
                            <span className="font-mono text-emerald-400">
                              {((Number(payload.find((p: any) => p.dataKey === 'messages')?.value) || 0) +
                                (Number(payload.find((p: any) => p.dataKey === 'profileInteractions')?.value) || 0))}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                  formatter={(value) => (
                    <span className="text-slate-300 text-xs">
                      {value === 'messages' ? 'Mensagens (Chats)' : 'Interações com Perfis (Curtidas / Nudes)'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="messages"
                  fill="#f59e0b"
                  stackId={activityView === 'stacked' ? 'a' : undefined}
                  radius={activityView === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  name="messages"
                />
                <Bar
                  dataKey="profileInteractions"
                  fill="#f43f5e"
                  stackId={activityView === 'stacked' ? 'a' : undefined}
                  radius={[6, 6, 0, 0]}
                  name="profileInteractions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insight Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-rose-950/20 border border-amber-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs leading-relaxed text-slate-300">
            <strong className="text-amber-300">Momento de Maior Retorno no Jhobs:</strong> Sua taxa de resposta imediata em mensagens é <strong className="text-white">3.4x maior</strong> nas noites de <strong className="text-white">Sexta e Sábado</strong> a partir das <strong className="text-rose-400">21:00</strong>. Esse é o momento ideal para conversar, enviar mimos e desbloquear novidades no cofre VIP.
          </div>
        </div>
      </div>

      {/* Quick Creator Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Monetize fotos no seu cofre pessoal</span>
          </h3>
          <p className="text-xs text-slate-400">
            Receba créditos e solicite saques diretamente para sua chave PIX.
          </p>
        </div>
        <button
          onClick={onOpenCreatorStudio}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md shadow-amber-950"
        >
          Estúdio Criador
        </button>
      </div>

      {/* Direct User Value & PIX Bank Transfer Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#101b16] to-[#12121e] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              <span>Carteira de Diamantes & Repasses de Criador</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-900/90 text-emerald-300 border border-emerald-700/50 uppercase">
              Auditado 70/20/10
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Saldo disponível para consumo em serviços: <strong className="text-emerald-400 font-mono font-bold">{userCredits} 💎</strong>. Diamantes promocionais (bônus) são exclusivos para uso na plataforma e não são sacáveis.
          </p>
          <span className="text-[11px] text-slate-400 block">
            Repasses via PIX aplicam-se exclusivamente aos ganhos auditados de criadores sobre diamantes comprados (pagos) consumidos.
          </span>
        </div>

        <button
          onClick={onOpenWithdrawPix || onOpenWallet}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Consultar Carteira & Repasses</span>
        </button>
      </div>

      {/* Comprehensive Profile Customization Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-[#12121a] border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Personalização Completa do Perfil & Compatibilidade</span>
          </h3>
          <span className="text-[11px] text-slate-400">Campos usados para calcular % de match</span>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 text-center font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Perfil e preferências salvas com sucesso!</span>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Seu Nome / Como quer ser chamado</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Profissão / Ocupação</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Biografia Provocante</label>
          <textarea
            rows={2}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-rose-500"
          />
        </div>

        {/* Section: Hobbies Customization */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Seus Hobbies & Atividades Favoritas
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            Selecione o que você curte fazer no tempo livre para conectar com pessoas com a mesma sintonia:
          </p>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_HOBBIES.map((hobby) => {
              const isSelected = formData.hobbies.includes(hobby);
              return (
                <button
                  key={hobby}
                  type="button"
                  onClick={() => toggleHobby(hobby)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {hobby}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Music Styles */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Estilos de Música Favoritos
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            A trilha sonora perfeita para um encontro ou esquenta:
          </p>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_MUSIC_GENRES.map((genre) => {
              const isSelected = formData.musicGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleMusic(genre)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                      : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Custom Fields (Signo, Altura, Bebida, Fumo, O que busca) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Signo</label>
            <select
              value={formData.zodiacSign}
              onChange={(e) => setFormData({ ...formData, zodiacSign: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
            >
              {AVAILABLE_ZODIAC.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Altura (cm)</label>
            <input
              type="number"
              min={140}
              max={220}
              value={formData.heightCm}
              onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Bebida</label>
            <select
              value={formData.drinking}
              onChange={(e) => setFormData({ ...formData, drinking: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
            >
              <option value="Socialmente">Socialmente</option>
              <option value="Apenas bons vinhos">Apenas bons vinhos</option>
              <option value="Aos finais de semana">Aos finais de semana</option>
              <option value="Não bebo">Não bebo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Fumo</label>
            <select
              value={formData.smoking}
              onChange={(e) => setFormData({ ...formData, smoking: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
            >
              <option value="Não fumo">Não fumo</option>
              <option value="Ocasionalmente">Ocasionalmente</option>
              <option value="Fumo">Fumo</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">O que busca no Jhobs</label>
            <input
              type="text"
              value={formData.seeking}
              onChange={(e) => setFormData({ ...formData, seeking: e.target.value })}
              className="w-full bg-[#181826] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-rose-950 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Salvar Detalhes do Perfil</span>
        </button>
      </form>
    </div>
  );
};
