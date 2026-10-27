import React, { useState } from 'react';
import {
  Settings,
  User,
  Globe2,
  Bell,
  Volume2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Moon,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UserProfileData } from '../../types';

interface Screen16SettingsProps {
  userProfile: UserProfileData;
  onNavigateToPrivacy: () => void;
  onNavigateToReports: () => void;
  onNavigateToPasswordReset: () => void;
  onLogout: () => void;
  onOpenGlobalVision?: () => void;
  onOpenCreatorContentStudio?: () => void;
}

export const Screen16Settings: React.FC<Screen16SettingsProps> = ({
  userProfile,
  onNavigateToPrivacy,
  onNavigateToReports,
  onNavigateToPasswordReset,
  onLogout,
  onOpenGlobalVision,
  onOpenCreatorContentStudio,
}) => {
  const [language, setLanguage] = useState<'pt' | 'en' | 'es'>('pt');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-rose-500" />
          <h1 className="text-2xl font-display font-extrabold text-white">
            Configurações
          </h1>
        </div>
        <span className="text-xs text-slate-400">JOBS v1.0 Global</span>
      </div>

      {/* Account Section */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <User className="w-4 h-4 text-rose-400" />
          <span>Conta & Credenciais</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141422] border border-white/5">
            <div>
              <div className="font-semibold text-white">{userProfile.name}</div>
              <div className="text-[11px] text-slate-400">emilio.borges@jobs.app</div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verificado +18
            </span>
          </div>

          <button
            onClick={onNavigateToPasswordReset}
            className="w-full p-3 rounded-2xl bg-[#141422] hover:bg-[#1a1a2c] border border-white/5 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-white">Segurança & Senha</div>
                <div className="text-[11px] text-slate-400">Alterar senha de acesso</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {onOpenCreatorContentStudio && (
            <button
              onClick={onOpenCreatorContentStudio}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#1a1224] to-[#141422] hover:border-rose-500/50 border border-rose-500/30 flex items-center justify-between text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-bold text-white">
                    Meu Conteúdo, Publicar Foto/Vídeo & Cofre VIP
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Gerenciar conteúdos gratuitos, exclusivos (49/99 💎) e Cofre VIP (149 💎)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Preferences & Language */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-amber-400" />
          <span>Idioma & Experiência</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141422] border border-white/5">
            <div>
              <div className="font-semibold text-white">Idioma do Aplicativo</div>
              <div className="text-[11px] text-slate-400">Selecione o idioma da interface</div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="pt">Português (Brasil)</option>
              <option value="en">English (US)</option>
              <option value="es">Español (ES)</option>
            </select>
          </div>

          {onOpenGlobalVision && (
            <button
              onClick={onOpenGlobalVision}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-[#141422] border border-amber-500/30 hover:border-amber-400/60 flex items-center justify-between text-left transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow">
                  <Globe2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>Nossa Visão Global 🌎</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Do Brasil para o mundo</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Manifesto, 5 pilares estratégicos e link do Google Play
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          )}

          <label className="flex items-center justify-between p-3 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-white">Sons e Efeitos Sonoros</div>
                <div className="text-[11px] text-slate-400">Feedback sonoro em matches e mensagens</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-rose-400" />
              <div>
                <div className="font-semibold text-white">Notificações Instantâneas</div>
                <div className="text-[11px] text-slate-400">Alertas de novas conexões e chats</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Safety & Compliance Navigation Links */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Privacidade, Dados & Bloqueios</span>
        </h2>

        <button
          onClick={onNavigateToPrivacy}
          className="w-full p-3.5 rounded-2xl bg-[#141422] hover:bg-[#1a1a2c] border border-white/5 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-semibold text-white text-xs">Privacidade & LGPD</div>
              <div className="text-[11px] text-slate-400">Controles de dados, visibilidade e exportação</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={onNavigateToReports}
          className="w-full p-3.5 rounded-2xl bg-[#141422] hover:bg-[#1a1a2c] border border-white/5 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-semibold text-white text-xs">Denúncias & Usuários Bloqueados</div>
              <div className="text-[11px] text-slate-400">Gerenciar contatos bloqueados e protocolos</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Sair da Conta no JOBS</span>
      </button>
    </div>
  );
};
