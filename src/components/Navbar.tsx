import React from 'react';
import {
  Sparkles,
  Coins,
  Flame,
  BarChart2,
  Bell,
  Users,
  Layers,
  Heart,
  Crown,
  Home,
  MessageCircle,
  Radio,
  Globe2,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  creditsBalance: number;
  onOpenWallet: () => void;
  onOpenCreatorStudio: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenReferral?: () => void;
  onOpenScreenSwitcher?: () => void;
  onOpenGlobalVision?: () => void;
  unreadMessagesCount: number;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  creditsBalance,
  onOpenWallet,
  onOpenAdminDashboard,
  onOpenReferral,
  onOpenScreenSwitcher,
  onOpenGlobalVision,
  unreadMessagesCount,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#07070c]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
        {/* Brand Logo & Wordmark */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-white font-display">
              JOBS
            </span>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.5 rounded">
              18+
            </span>
          </div>
        </div>

        {/* Clean Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => onSelectTab('home')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'home'
                ? 'text-white border-b-2 border-rose-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => onSelectTab('discover')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'discover'
                ? 'text-white border-b-2 border-rose-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Descoberta</span>
          </button>

          <button
            onClick={() => onSelectTab('lives')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'lives'
                ? 'text-white border-b-2 border-rose-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span>Lives</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <button
            onClick={() => onSelectTab('connections')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'connections'
                ? 'text-white border-b-2 border-rose-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Conexões</span>
          </button>

          <button
            onClick={() => onSelectTab('messages')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'messages'
                ? 'text-white border-b-2 border-rose-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chat</span>
            {unreadMessagesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('subscriptions')}
            className={`transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
              currentTab === 'subscriptions'
                ? 'text-white border-b-2 border-amber-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Assinaturas</span>
          </button>
        </nav>

        {/* Action Buttons & Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick 18 Screens Switcher Button */}
          {onOpenScreenSwitcher && (
            <button
              onClick={onOpenScreenSwitcher}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-rose-600/20 to-amber-500/20 hover:from-rose-600/30 hover:to-amber-500/30 border border-rose-500/40 rounded-xl transition-all cursor-pointer text-xs font-bold text-rose-300 shadow-sm"
              title="Abrir o Navegador Rápido de Todas as 18 Telas"
            >
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>Telas (18)</span>
            </button>
          )}

          {/* Global Vision Button */}
          {onOpenGlobalVision && (
            <button
              onClick={onOpenGlobalVision}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#12121e] hover:bg-[#181828] border border-white/10 hover:border-amber-400/40 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-300 hover:text-white shadow-sm"
              title="JOBS: Nascemos no Brasil. Nossa Visão é Global! 🌎"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Global 🌎</span>
            </button>
          )}

          {/* Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 bg-[#12121e] hover:bg-slate-800 border border-white/10 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-white"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center font-mono animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Admin Dashboard */}
          {onOpenAdminDashboard && (
            <button
              onClick={onOpenAdminDashboard}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#12121e] hover:bg-slate-800 border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-bold text-amber-300 shadow-sm"
              title="Painel de Administração e Moderação"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Credits & Wallet */}
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-rose-500/10 hover:from-amber-500/20 hover:to-rose-500/20 border border-amber-500/30 rounded-xl transition-all cursor-pointer text-xs font-semibold text-amber-300 shadow-sm"
            title="Carteira & Créditos JOBS"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-white">{creditsBalance}</span>
            <span className="hidden sm:inline text-amber-400/90 text-[11px]">Créditos</span>
          </button>
        </div>
      </div>
    </header>
  );
};
