import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Medal,
  Award,
  Crown,
  Gem,
  Sparkles,
  Shield,
  Star,
  CheckCircle2,
  Lock,
  Unlock,
  Coins,
  ArrowUpRight,
  Eye,
  EyeOff,
  Flame,
  Zap,
  Check,
  ChevronRight,
  Info,
  Clock,
  Activity,
  Headphones,
  Sliders,
  HelpCircle,
  X,
} from 'lucide-react';
import { FanTierInfo, FanTierLevel } from '../types';
import {
  PRESTIGE_TIERS,
  getPrestigeTier,
  getPrestigeMedalsList,
  getEquippedMedal,
  setEquippedMedal,
  getPrestigeSettings,
  updatePrestigeSettings,
  PrestigeSettings,
} from '../data/prestigeData';

interface PrestigeSystemPanelProps {
  totalCreditsSpent: number;
  onOpenWallet: () => void;
  onSimulateCreditSpend?: (amount: number) => void;
  className?: string;
}

export const PrestigeSystemPanel: React.FC<PrestigeSystemPanelProps> = ({
  totalCreditsSpent,
  onOpenWallet,
  onSimulateCreditSpend,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'medals' | 'benefits'>('status');
  const [equippedMedalLevel, setEquippedMedalLevelState] = useState<FanTierLevel>(() =>
    getEquippedMedal(totalCreditsSpent)
  );
  const [settings, setSettings] = useState<PrestigeSettings>(() => getPrestigeSettings());
  const [selectedMedalDetail, setSelectedMedalDetail] = useState<FanTierInfo | null>(null);
  const [celebrationToast, setCelebrationToast] = useState<string | null>(null);

  const currentTier = getPrestigeTier(totalCreditsSpent);
  const medalsList = getPrestigeMedalsList(totalCreditsSpent);

  // Equipped tier information
  const equippedTier = PRESTIGE_TIERS.find((t) => t.level === equippedMedalLevel) || currentTier;

  // Next tier computation
  const nextTierIndex = PRESTIGE_TIERS.findIndex((t) => t.level === currentTier.level) + 1;
  const nextTier = nextTierIndex < PRESTIGE_TIERS.length ? PRESTIGE_TIERS[nextTierIndex] : null;

  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          ((totalCreditsSpent - currentTier.minCredits) /
            (nextTier.minCredits - currentTier.minCredits)) *
            100
        )
      )
    : 100;

  const creditsRemaining = nextTier ? Math.max(0, nextTier.minCredits - totalCreditsSpent) : 0;

  // Listen for storage updates
  useEffect(() => {
    const handlePrestigeUpdate = () => {
      setEquippedMedalLevelState(getEquippedMedal(totalCreditsSpent));
      setSettings(getPrestigeSettings());
    };
    window.addEventListener('jhobs:prestige_updated', handlePrestigeUpdate);
    return () => window.removeEventListener('jhobs:prestige_updated', handlePrestigeUpdate);
  }, [totalCreditsSpent]);

  // Handler: Equip medal
  const handleEquipMedal = (level: FanTierLevel) => {
    setEquippedMedal(level);
    setEquippedMedalLevelState(level);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f43f5e', '#38bdf8', '#c084fc'],
      });
    } catch (e) {}

    const tier = PRESTIGE_TIERS.find((t) => t.level === level);
    setCelebrationToast(`Medalha equipada com sucesso: ${tier?.medalName || level}!`);
    setTimeout(() => setCelebrationToast(null), 3000);
  };

  // Handler: Toggle setting
  const handleToggleSetting = (key: keyof PrestigeSettings) => {
    const nextVal = !settings[key];
    const updated = updatePrestigeSettings({ [key]: nextVal });
    setSettings(updated);
  };

  // Handler: Change Aura
  const handleChangeAura = (aura: PrestigeSettings['selectedAura']) => {
    const updated = updatePrestigeSettings({ selectedAura: aura });
    setSettings(updated);
  };

  // Helper to render icon for any tier level
  const renderTierIcon = (level: FanTierLevel, iconClass = 'w-4 h-4') => {
    switch (level) {
      case 'bronze':
        return <Medal className={iconClass} />;
      case 'prata':
        return <Award className={iconClass} />;
      case 'ouro':
        return <Crown className={iconClass} />;
      case 'platina':
        return <Gem className={iconClass} />;
      case 'diamante':
        return <Shield className={iconClass} />;
      case 'supremo':
        return <Sparkles className={iconClass} />;
    }
  };

  return (
    <div
      className={`rounded-3xl bg-[#12121e] border border-amber-500/30 shadow-2xl p-5 sm:p-6 space-y-5 text-left relative overflow-hidden ${className}`}
    >
      {/* Ambient background glow according to active equipped tier */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40 transition-all duration-700"
        style={{ backgroundColor: equippedTier.glowColor }}
      />

      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${equippedTier.badgeColorClass}`}
          >
            {renderTierIcon(equippedTier.level, 'w-6 h-6 text-current animate-pulse')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 font-mono">
                Gamificação & Status VIP
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-display flex items-center gap-2">
              <span>Nível de Prestígio</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${currentTier.badgeColorClass}`}>
                {currentTier.badge}
              </span>
            </h3>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Progresso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'medals'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Medal className="w-3.5 h-3.5" />
            <span>Medalhas ({medalsList.filter((m) => m.isUnlocked).length}/6)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'benefits'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Benefícios</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {celebrationToast && (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-400/50 rounded-2xl text-xs text-amber-200 text-center font-bold animate-in fade-in flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{celebrationToast}</span>
        </div>
      )}

      {/* TAB 1: STATUS & PROGRESSO */}
      {activeTab === 'status' && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-200">
          {/* Main Card with current Tier and Progress */}
          <div
            className={`p-5 rounded-2xl bg-gradient-to-br ${currentTier.bgGradient} border ${currentTier.borderClass} shadow-xl relative overflow-hidden space-y-4`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Patamar de Gastos Atual:</span>
                  <span className="text-xs font-black uppercase text-amber-300 font-mono">
                    {totalCreditsSpent} Créditos Gastos
                  </span>
                </div>
                <h4 className="text-2xl font-black text-white font-display mt-0.5">
                  {currentTier.name}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                  {currentTier.description}
                </p>
              </div>

              {/* Equipped Medal Visual Box */}
              <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3 shrink-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${equippedTier.badgeColorClass} shadow-md`}
                >
                  {renderTierIcon(equippedTier.level, 'w-6 h-6 text-current')}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Medalha Equipada
                  </span>
                  <span className="text-xs font-bold text-white block">
                    {equippedTier.badge}
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium">Exibida no perfil</span>
                </div>
              </div>
            </div>

            {/* Progress Bar towards next tier */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Progresso para o próximo nível</span>
                {nextTier ? (
                  <span className="text-amber-300 font-semibold font-mono flex items-center gap-1">
                    <span>Faltam {creditsRemaining} 💎 para</span>
                    <strong className="text-white">{nextTier.name}</strong>
                  </span>
                ) : (
                  <span className="text-cyan-300 font-bold font-mono">Patamar Supremo Máximo Atingido! 🌌</span>
                )}
              </div>

              <div className="w-full h-3 rounded-full bg-black/70 border border-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-300 transition-all duration-700 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{currentTier.minCredits} 💎</span>
                <span className="font-mono text-amber-200 font-bold">{progressPercent}% Concluído</span>
                <span>{nextTier ? `${nextTier.minCredits} 💎` : '5.000+ 💎'}</span>
              </div>
            </div>

            {/* Highlighted Perks Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {currentTier.perks.slice(0, 3).map((perk, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Simulation & Recharge Bar */}
          <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Simulação de Gastos & Progressão
                </span>
                <span className="text-[11px] text-slate-400">
                  Teste como o prestígio sobe automaticamente ao gastar créditos em mídias VIP e mimos.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onSimulateCreditSpend && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSimulateCreditSpend(250);
                      try {
                        confetti({ particleCount: 35, spread: 50 });
                      } catch (e) {}
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                    title="Simular gasto de 250 créditos na plataforma"
                  >
                    +250 💎
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSimulateCreditSpend(750);
                      try {
                        confetti({ particleCount: 60, spread: 70 });
                      } catch (e) {}
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                    title="Simular gasto de 750 créditos na plataforma"
                  >
                    +750 💎
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onOpenWallet}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-amber-950 flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Recarregar Carteira</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GALERIA DE MEDALHAS VISUAIS (DESBLOQUEÁVEIS) */}
      {activeTab === 'medals' && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Coleção de Medalhas de Prestígio. Equipe qualquer medalha desbloqueada para exibi-la no perfil:
            </span>
            <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
              {medalsList.filter((m) => m.isUnlocked).length} de 6 Desbloqueadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {medalsList.map(({ tier, isUnlocked, isCurrent, creditsNeeded }) => {
              const isEquipped = equippedMedalLevel === tier.level;

              return (
                <div
                  key={tier.level}
                  onClick={() => setSelectedMedalDetail(tier)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group ${
                    isEquipped
                      ? 'bg-gradient-to-br from-amber-950/60 via-[#181826] to-slate-900 border-amber-400 shadow-xl shadow-amber-950/50 ring-2 ring-amber-400/40'
                      : isUnlocked
                      ? 'bg-[#141424] border-slate-700/80 hover:border-slate-500 hover:bg-[#18182c]'
                      : 'bg-black/40 border-slate-800/60 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Top Row: Medal Icon & Unlocked Indicator */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md ${tier.badgeColorClass} group-hover:scale-105 transition-transform`}
                    >
                      {renderTierIcon(tier.level, 'w-6 h-6 text-current')}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isEquipped ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 border border-amber-300 shadow-sm flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Equipada
                        </span>
                      ) : isUnlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          Desbloqueada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Faltam {creditsNeeded} 💎
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {tier.minCredits === 0 ? '0 créditos' : `+${tier.minCredits} 💎 gastos`}
                      </span>
                    </div>
                  </div>

                  {/* Medal Titles & Description */}
                  <div>
                    <h4 className="text-sm font-bold text-white font-display group-hover:text-amber-300 transition-colors">
                      {tier.medalName}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Actions / Equip Button */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-amber-400 font-medium">Ver Vantagens →</span>

                    {isUnlocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipMedal(tier.level);
                        }}
                        disabled={isEquipped}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isEquipped
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-white hover:text-amber-300'
                        }`}
                      >
                        {isEquipped ? 'Equipada no Perfil' : 'Equipar no Perfil'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BENEFÍCIOS EXCLUSIVOS & AURA DO AVATAR */}
      {activeTab === 'benefits' && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-200">
          {/* Avatar Customization & Active Ring Controls */}
          <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Moldura & Aura de Prestígio no Avatar</span>
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Personalize a aura luminosa que envolve seu avatar em comentários, perfil e mensagens.
                </span>
              </div>

              {/* Toggle switch for avatar frame */}
              <button
                type="button"
                onClick={() => handleToggleSetting('avatarFrameEnabled')}
                className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  settings.avatarFrameEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                }`}
                title="Ativar/Desativar moldura luminosa no avatar"
              >
                <div className="w-4 h-4 rounded-full bg-slate-950 shadow-md" />
              </button>
            </div>

            {/* Aura Color Choices */}
            {settings.avatarFrameEnabled && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Estilo de Aura:</span>
                {[
                  { id: 'default', label: 'Padrão do Nível', ring: equippedTier.avatarRingClass },
                  { id: 'gold', label: 'Ouro Nobreza', ring: 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]' },
                  { id: 'cyan', label: 'Ciano Platina', ring: 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]' },
                  { id: 'purple', label: 'Diamante Imperial', ring: 'ring-2 ring-purple-400 shadow-[0_0_18px_rgba(192,132,252,0.8)]' },
                  { id: 'cosmic', label: 'Aura Cósmica', ring: 'ring-2 ring-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.9)] animate-pulse' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChangeAura(opt.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      settings.selectedAura === opt.id
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md'
                        : 'bg-[#181826] text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exclusive Benefits Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Benefit: Modo Invisível */}
            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span>Navegação Invisível no Discover</span>
                  </div>
                  {totalCreditsSpent >= 750 ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSetting('invisibleModeEnabled')}
                      className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                        settings.invisibleModeEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                      title="Ativar/Desativar navegação invisível"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-950 shadow-md" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Requer Ouro VIP (750 💎)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Visite perfis e feeds de criadores sem que sua visualização seja registrada nas métricas de visita.
                </p>
              </div>

              <div className="text-[11px] font-mono text-emerald-400 pt-2 border-t border-slate-800/60">
                {settings.invisibleModeEnabled ? '✓ Modo Invisível Ativo' : '○ Modo Visível Padrão'}
              </div>
            </div>

            {/* Benefit: Selo VIP nas Mensagens */}
            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Award className="w-4 h-4 text-cyan-400" />
                    <span>Medalha de Prestígio nos Chats</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSetting('chatBadgeEnabled')}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                      settings.chatBadgeEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                    title="Exibir medalha de prestígio nas mensagens"
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-950 shadow-md" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Exibe sua medalha ativa ({equippedTier.badge}) ao lado do seu nome em todas as conversas diretas com criadores.
                </p>
              </div>

              <div className="text-[11px] font-mono text-cyan-300 pt-2 border-t border-slate-800/60">
                {settings.chatBadgeEnabled ? `✓ Exibindo: ${equippedTier.badge}` : '○ Oculto nos chats'}
              </div>
            </div>

            {/* Benefit: Pré-estreia de Fotos */}
            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span>Pré-estreia no Cofre VIP (24h)</span>
                  </div>
                  {totalCreditsSpent >= 1500 ? (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      ✓ Desbloqueado
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      Requer Platina (1.500 💎)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Acesso antecipado a fotos e ensaios novos antes de serem liberados publicamente na plataforma.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                {totalCreditsSpent >= 1500 ? 'Benefício VIP Ativo' : `Faltam ${Math.max(0, 1500 - totalCreditsSpent)} créditos`}
              </div>
            </div>

            {/* Benefit: Suporte & Concierge VIP */}
            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Headphones className="w-4 h-4 text-rose-400" />
                    <span>Concierge & Atendimento Prioritário</span>
                  </div>
                  {totalCreditsSpent >= 3000 ? (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      ✓ Desbloqueado
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      Requer Diamante (3.000 💎)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Canal privativo e atendimento preferencial 24h para assistência em recargas, PIX e pedidos especiais.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                {totalCreditsSpent >= 3000 ? 'Concierge Pessoal Disponível' : `Faltam ${Math.max(0, 3000 - totalCreditsSpent)} créditos`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES COMPLETOS DA MEDALHA */}
      {selectedMedalDetail && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedMedalDetail(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#10101a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedMedalDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pr-8">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center p-0.5 shadow-lg border ${selectedMedalDetail.borderClass} ${selectedMedalDetail.badgeColorClass}`}
              >
                {renderTierIcon(selectedMedalDetail.level, 'w-7 h-7 text-current')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Detalhes da Medalha
                  </span>
                  {totalCreditsSpent >= selectedMedalDetail.minCredits ? (
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      Desbloqueada
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400">
                      Bloqueada
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  {selectedMedalDetail.medalName}
                </h3>
                <p className="text-xs text-slate-300">{selectedMedalDetail.description}</p>
              </div>
            </div>

            {/* Requirements and Progress */}
            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Requisito para Desbloqueio:</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedMedalDetail.minCredits === 0 ? 'Livre (Iniciante)' : `${selectedMedalDetail.minCredits} Créditos Gastos`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Seu Total Gasto:</span>
                <span className="font-mono font-bold text-white">
                  {totalCreditsSpent} Créditos
                </span>
              </div>
            </div>

            {/* Perks List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Vantagens e Benefícios Desta Medalha:
              </h4>
              <div className="space-y-1.5">
                {selectedMedalDetail.perks.map((perk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equip Action */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              {totalCreditsSpent >= selectedMedalDetail.minCredits ? (
                <button
                  type="button"
                  onClick={() => {
                    handleEquipMedal(selectedMedalDetail.level);
                    setSelectedMedalDetail(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Equipar Esta Medalha no Perfil</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMedalDetail(null);
                    onOpenWallet();
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Adicionar Créditos para Desbloquear Medalha</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
