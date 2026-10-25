import React from 'react';
import {
  X,
  Layers,
  Sparkles,
  Smartphone,
  UserCheck,
  KeyRound,
  UserPlus,
  Sliders,
  Home,
  Flame,
  Info,
  Heart,
  MessageCircle,
  Video,
  Bell,
  Crown,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { ScreenId } from '../types';

interface ScreenSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

interface ScreenItem {
  id: ScreenId;
  number: string;
  title: string;
  category: 'onboarding' | 'main' | 'communication' | 'settings_security';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_18_SCREENS: ScreenItem[] = [
  {
    id: '01_landing',
    number: '01',
    title: 'Abertura do Aplicativo',
    category: 'onboarding',
    description: 'Landing page inicial com marca JOBS, proposta e os 3 botões solicitados',
    icon: Sparkles,
  },
  {
    id: '02_register',
    number: '02',
    title: 'Cadastro',
    category: 'onboarding',
    description: 'Cadastro com e-mail, senha com medidor de força, @username e termos',
    icon: UserPlus,
  },
  {
    id: '03_login',
    number: '03',
    title: 'Login',
    category: 'onboarding',
    description: 'Autenticação segura, lembrar-me e acesso rápido de demonstração',
    icon: KeyRound,
  },
  {
    id: '04_age_gate',
    number: '04',
    title: 'Verificação de Idade',
    category: 'onboarding',
    description: 'Acesso restrito +18, cálculo por nascimento e auditoria biométrica',
    icon: UserCheck,
  },
  {
    id: '05_password_recovery',
    number: '05',
    title: 'Recuperação de Senha',
    category: 'onboarding',
    description: 'Envio de código de segurança por e-mail, validação e nova senha',
    icon: KeyRound,
  },
  {
    id: '06_profile_creation',
    number: '06',
    title: 'Criação de Perfil',
    category: 'onboarding',
    description: 'Fotografias, apresentação (bio), ocupação e cidade aproximada sem GPS',
    icon: Smartphone,
  },
  {
    id: '07_preferences',
    number: '07',
    title: 'Preferências de Relacionamento',
    category: 'onboarding',
    description: 'Objetivos de relacionamento, faixa etária, distância, interesses e idiomas',
    icon: Sliders,
  },
  {
    id: '08_home',
    number: '08',
    title: 'Tela Inicial (Dashboard)',
    category: 'main',
    description: 'Resumo de conexões, matches, destaques diários recomendados por IA',
    icon: Home,
  },
  {
    id: '09_discover',
    number: '09',
    title: 'Descoberta de Pessoas',
    category: 'main',
    description: 'Cartões fluidos com fotos, afinidade IA explicável, Gostei, Passar e Interesse',
    icon: Flame,
  },
  {
    id: '10_profile_detail',
    number: '10',
    title: 'Perfil Detalhado',
    category: 'main',
    description: 'Galeria HD, bio completa, análise profunda da IA, denúncia e bloqueio',
    icon: Info,
  },
  {
    id: '11_connections',
    number: '11',
    title: 'Conexões (Matches)',
    category: 'communication',
    description: 'Matches mútuos recentes em carrossel, filtros e busca por interesse',
    icon: Heart,
  },
  {
    id: '12_chat',
    number: '12',
    title: 'Conversas (Chat 1:1)',
    category: 'communication',
    description: 'Chat individual, status online, quebra-gelos de IA, fotos e botão de vídeo',
    icon: MessageCircle,
  },
  {
    id: '13_video_call',
    number: '13',
    title: 'Chamadas de Vídeo',
    category: 'communication',
    description: 'Vídeo ao vivo (câmera real/stream HD), microfone mudo, câmera on/off e timer',
    icon: Video,
  },
  {
    id: '14_notifications',
    number: '14',
    title: 'Notificações',
    category: 'communication',
    description: 'Central com abas de matches, mensagens, curtidas e avisos do sistema',
    icon: Bell,
  },
  {
    id: '15_subscriptions',
    number: '15',
    title: 'Assinaturas (Monetização)',
    category: 'main',
    description: 'Planos Gratuito, Premium e VIP, comparativo e checkout com Pix e Cartão',
    icon: Crown,
  },
  {
    id: '16_settings',
    number: '16',
    title: 'Configurações',
    category: 'settings_security',
    description: 'Preferências de conta, idiomas, sons, alertas e atalhos de segurança',
    icon: Settings,
  },
  {
    id: '17_privacy_security',
    number: '17',
    title: 'Privacidade e Segurança',
    category: 'settings_security',
    description: 'LGPD, visibilidade pública, consentimentos de IA, exportar dados e excluir conta',
    icon: ShieldCheck,
  },
  {
    id: '18_reports_blocks',
    number: '18',
    title: 'Denúncias e Bloqueios',
    category: 'settings_security',
    description: 'Gerenciamento de bloqueados, histórico de protocolos e nova denúncia sigilosa',
    icon: ShieldAlert,
  },
];

export const ScreenSwitcherModal: React.FC<ScreenSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
}) => {
  if (!isOpen) return null;

  const categories = [
    { id: 'onboarding', label: '1. Onboarding, Auth & Perfil (01 a 07)' },
    { id: 'main', label: '2. Descoberta, Home & Assinaturas (08, 09, 10, 15)' },
    { id: 'communication', label: '3. Conexões, Chat, Vídeo & Alertas (11 a 14)' },
    { id: 'settings_security', label: '4. Configurações, LGPD & Denúncias (16 a 18)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl">
      <div className="w-full max-w-3xl bg-[#0e0e17] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#12121e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-400 p-[2px]">
              <div className="w-full h-full bg-[#0d0d14] rounded-[9px] flex items-center justify-center font-display font-black text-white text-sm">
                18
              </div>
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white">
                Navegador das 18 Telas JOBS 1.0
              </h2>
              <p className="text-xs text-slate-400">
                Selecione qualquer uma das 18 telas especificadas para visualização imediata.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List by Categories */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {categories.map((cat) => {
            const screensInCat = ALL_18_SCREENS.filter((s) => s.category === cat.id);
            return (
              <div key={cat.id} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 px-1">
                  {cat.label}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {screensInCat.map((s) => {
                    const Icon = s.icon;
                    const isActive = currentScreen === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectScreen(s.id);
                          onClose();
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 group ${
                          isActive
                            ? 'bg-rose-500/15 border-rose-500 text-white shadow-md'
                            : 'bg-[#131322] border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isActive
                              ? 'bg-rose-600 text-white'
                              : 'bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10'
                          }`}
                        >
                          {s.number}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-xs text-white group-hover:text-rose-400 transition-colors truncate">
                              {s.title}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-600 text-white shadow">
                                Ativa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal">
                            {s.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#10101a] border-t border-white/10 text-center text-xs text-slate-400">
          Você também pode navegar naturalmente pelos botões e fluxos da aplicação.
        </div>
      </div>
    </div>
  );
};
