import React from 'react';
import { Home, Flame, Heart, MessageCircle, User, Layers, Radio } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadMessagesCount: number;
  onOpenScreenSwitcher?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  unreadMessagesCount,
  onOpenScreenSwitcher,
}) => {
  const tabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'discover', label: 'Descoberta', icon: Flame },
    { id: 'lives', label: 'Lives', icon: Radio },
    { id: 'connections', label: 'Conexões', icon: Heart },
    { id: 'messages', label: 'Chat', icon: MessageCircle, badge: unreadMessagesCount },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a10]/95 backdrop-blur-lg border-t border-slate-800/80 pb-safe">
      <div className="grid grid-cols-6 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center relative transition-colors cursor-pointer"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-rose-500 scale-110' : 'text-slate-400'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 ${
                  isActive ? 'text-white font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
