import React, { useState, useEffect } from 'react';
import {
  INITIAL_PROFILES,
  CREDIT_PACKAGES,
  INITIAL_TRANSACTIONS,
  INITIAL_USER_PROFILE,
  INITIAL_DAILY_METRICS,
  INITIAL_LIVE_STREAMS,
  INITIAL_DISCOVER_NUDES,
} from './data/mockData';
import {
  Profile,
  Transaction,
  UserProfileData,
  PushNotification,
  ScreenId,
  UserSubscription,
  ReportTicket,
} from './types';
import { Navbar } from './components/Navbar';
import { BottomNavigation } from './components/BottomNavigation';
import { ScreenSwitcherModal, ALL_18_SCREENS } from './components/ScreenSwitcherModal';
import { WalletModal } from './components/WalletModal';
import { CentralAdminDashboardModal } from './components/CentralAdminDashboardModal';
import { MatchCelebrationModal } from './components/MatchCelebrationModal';
import { ReferralPyramidModal } from './components/ReferralPyramidModal';
import { GlobalVisionModal } from './components/GlobalVisionModal';
import { InteractiveChallengesModal } from './components/InteractiveChallengesModal';
import { CreatorContentStudioModal } from './components/CreatorContentStudioModal';

// 18 Screens Imports
import { Screen01Landing } from './components/screens/Screen01Landing';
import { Screen02Register } from './components/screens/Screen02Register';
import { Screen03Login } from './components/screens/Screen03Login';
import { Screen04AgeGate } from './components/screens/Screen04AgeGate';
import { Screen05PasswordRecovery } from './components/screens/Screen05PasswordRecovery';
import { Screen06ProfileCreation } from './components/screens/Screen06ProfileCreation';
import { Screen07RelationshipPreferences } from './components/screens/Screen07RelationshipPreferences';
import { Screen08HomeDashboard } from './components/screens/Screen08HomeDashboard';
import { Screen09Discover } from './components/screens/Screen09Discover';
import { Screen10ProfileDetail } from './components/screens/Screen10ProfileDetail';
import { Screen11Connections } from './components/screens/Screen11Connections';
import { Screen12Chat } from './components/screens/Screen12Chat';
import { Screen13VideoCall } from './components/screens/Screen13VideoCall';
import { Screen14Notifications } from './components/screens/Screen14Notifications';
import { Screen15Subscriptions } from './components/screens/Screen15Subscriptions';
import { Screen16Settings } from './components/screens/Screen16Settings';
import { Screen17PrivacySecurity } from './components/screens/Screen17PrivacySecurity';
import { Screen18ReportsBlocks } from './components/screens/Screen18ReportsBlocks';
import { LiveStreamView } from './components/LiveStreamView';
import { authService } from './utils/authService';
import { financialLedger } from './services/ledgerService';
import { runtimeEnvironmentService } from './services/runtimeEnvironmentService';
import { matchAndMessagingService } from './services/matchAndMessagingService';
import { exclusiveContentAndInterestService } from './services/exclusiveContentAndInterestService';

import { Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { initGoogleAnalytics, trackPageView, trackEvent } from './utils/analytics';

const INITIAL_PUSH_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'push_1',
    type: 'vip_unlock',
    title: '❤️ Novo Match Mútuo no JOBS!',
    body: 'Você e Valentina demonstraram interesse mútuo. Que tal iniciar uma conversa agora?',
    timestamp: 'Há 5m',
    createdAt: Date.now() - 300000,
    read: false,
    creatorId: 'valentina',
    creatorName: 'Valentina Rossi',
    creatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
    actionUrl: 'messages',
  },
  {
    id: 'push_2',
    type: 'new_message',
    title: 'Nova Mensagem de Camila 💬',
    body: 'Oii! Vi que curtimos vinhos finos e viagens. Como está sendo seu dia?',
    timestamp: 'Há 15m',
    createdAt: Date.now() - 900000,
    read: false,
    creatorId: 'camila',
    creatorName: 'Camila Fernandes',
    creatorAvatar: '/src/assets/images/profile_isabella_1791856837043.jpg',
    actionUrl: 'messages',
  },
  {
    id: 'push_3',
    type: 'system',
    title: '🛡️ Verificação de Segurança 18+ Aprovada',
    body: 'Seu perfil foi auditado e recebeu o selo de maioridade verificada com proteção LGPD.',
    timestamp: 'Hoje',
    createdAt: Date.now() - 3600000,
    read: true,
  },
];

const INITIAL_REPORTS: ReportTicket[] = [
  {
    id: 'rep_101',
    reportedProfileId: 'fake_bot_01',
    reportedProfileName: 'Usuário Suspeito #402',
    category: 'spam_ou_fraude',
    categoryLabel: 'Spam, Links Externos ou Fraude',
    description: 'Enviou links externos suspeitos repetidamente no chat.',
    createdAt: 'Ontem às 22:15',
    status: 'resolvida',
    resolutionNote: 'Perfil analisado pela equipe de segurança e banido permanentemente.',
  },
];

export default function App() {
  // Current active screen among the 18 screens
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => {
    const isVerified = localStorage.getItem('jhobs_age_verified') === 'true';
    return isVerified ? '08_home' : '01_landing';
  });

  // Modal switcher for all 18 screens
  const [isScreenSwitcherOpen, setIsScreenSwitcherOpen] = useState(false);
  const [isGlobalVisionOpen, setIsGlobalVisionOpen] = useState(false);

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => {
    const saved = localStorage.getItem('jhobs_user_profile_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_USER_PROFILE;
      }
    }
    return INITIAL_USER_PROFILE;
  });

  // User subscription
  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    const saved = localStorage.getItem('jobs_user_subscription');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // default free
      }
    }
    return {
      tier: 'premium',
      period: 'monthly',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      autoRenew: true,
      priceBrl: 0,
      features: [
        'Curtidas ilimitadas diárias',
        'Ver quem curtiu seu perfil',
        'Filtros avançados (distância, idiomas, hábitos)',
        '5 Super Interesses por semana',
      ],
    };
  });

  // Profiles and connections
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('jhobs_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PROFILES;
      }
    }
    return INITIAL_PROFILES;
  });

  // Blocked user IDs
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('jhobs_blocked_user_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Mutual connections
  const [connections, setConnections] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('jobs_user_connections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return profiles.slice(0, 3);
      }
    }
    return profiles.slice(0, 3); // initial connections
  });

  // Reports history
  const [reports, setReports] = useState<ReportTicket[]>(() => {
    const saved = localStorage.getItem('jobs_user_reports');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_REPORTS;
      }
    }
    return INITIAL_REPORTS;
  });

  // Selected profile for Detail modal or screen
  const [detailProfile, setDetailProfile] = useState<Profile | null>(profiles[0] || null);

  // Active chat and video call partners
  const [activeChatPartner, setActiveChatPartner] = useState<Profile>(profiles[0]);
  const [activeVideoCallPartner, setActiveVideoCallPartner] = useState<Profile>(profiles[0]);

  // Match celebration
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_PUSH_NOTIFICATIONS);

  // Credits & Wallet - Fonte única da verdade: Livro-Razão Contábil
  const [userCredits, setUserCredits] = useState<number>(() => {
    return financialLedger.getUserCredits('current_user');
  });
  const [creatorCredits, setCreatorCredits] = useState<number>(() => {
    const saved = localStorage.getItem('jhobs_creator_credits');
    return saved ? Number(saved) : 520;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isChallengesModalOpen, setIsChallengesModalOpen] = useState(false);
  const [isCreatorContentStudioOpen, setIsCreatorContentStudioOpen] = useState(false);

  useEffect(() => {
    initGoogleAnalytics();
    trackPageView(activeScreen);
    const currentUid = authService.getCurrentSession()?.userId || 'user_emilio_vip';
    if (runtimeEnvironmentService.shouldSeedSyntheticData()) {
      matchAndMessagingService.seedInitialTestMatch(currentUid, 'valentina');
      matchAndMessagingService.recordLike('isabella', currentUid, 'standard');
    }
  }, [activeScreen]);

  useEffect(() => {
    const syncCredits = () => {
      setUserCredits(financialLedger.getUserCredits('current_user'));
    };
    const unsubLedger = financialLedger.subscribe(syncCredits);
    const unsubEnv = runtimeEnvironmentService.subscribe(syncCredits);
    return () => {
      unsubLedger();
      unsubEnv();
    };
  }, []);

  // Filter unblocked profiles
  const visibleProfiles = profiles.filter((p) => !blockedUserIds.includes(p.id));
  const blockedProfilesList = profiles.filter((p) => blockedUserIds.includes(p.id));

  // Current logged in user ID
  const currentUserId = authService.getCurrentSession()?.userId || 'user_emilio_vip';

  // Like handler com validação estrita de interesse mútuo
  const handleLike = (profile: Profile) => {
    trackEvent('profile_like', { profileId: profile.id });
    const result = matchAndMessagingService.recordLike(currentUserId, profile.id, 'standard');

    if (result.isMatch) {
      // MATCH MÚTUO CONFIRMADO PELAS DUAS PARTES!
      if (!connections.some((c) => c.id === profile.id)) {
        setConnections((prev) => {
          const next = [profile, ...prev];
          localStorage.setItem('jobs_user_connections', JSON.stringify(next));
          return next;
        });
      }
      setMatchedProfile(profile);

      // Notificação oficial de match mútuo
      const newPush: PushNotification = {
        id: `match_${Date.now()}`,
        type: 'vip_unlock',
        title: `❤️ Novo Match Mútuo com ${profile.name}!`,
        body: 'Vocês dois demonstraram interesse recíproco no JOBS. A conversa privativa foi desbloqueada!',
        timestamp: 'Agora',
        createdAt: Date.now(),
        read: false,
        creatorId: profile.id,
        creatorName: profile.name,
        creatorAvatar: profile.avatar,
        actionUrl: 'messages',
      };
      setNotifications((prev) => [newPush, ...prev]);
    } else {
      // Curtida unilateral registrada
      const newPush: PushNotification = {
        id: `like_sent_${Date.now()}`,
        type: 'system',
        title: `Curtida enviada para ${profile.name}`,
        body: 'Sua intenção foi registrada. Assim que a outra pessoa demonstrar interesse mútuo, um match será estabelecido.',
        timestamp: 'Agora',
        createdAt: Date.now(),
        read: true,
      };
      setNotifications((prev) => [newPush, ...prev]);
    }
  };

  const handlePass = (profile: Profile) => {
    trackEvent('profile_pass', { profileId: profile.id });
  };

  const handleSendInterest = (profile: Profile, message?: string) => {
    trackEvent('profile_super_interest', { profileId: profile.id, message });
    if (matchAndMessagingService.isMutualMatch(currentUserId, profile.id)) {
      if (message && message.trim()) {
        matchAndMessagingService.sendMessage(currentUserId, profile.id, message.trim());
      }
      setActiveChatPartner(profile);
      setActiveScreen('12_chat');
      return;
    }

    exclusiveContentAndInterestService
      .sendPaidImmediateInterest({
        senderUserId: currentUserId,
        recipientUserId: profile.id,
        recipientName: profile.name,
        idempotencyKey: `idemp_discover_interest_${currentUserId}_${profile.id}`,
        initialMessage: message?.trim() || `Olá ${profile.name}! Enviei um interesse imediato no JOBS.`,
        senderAgeVerified18Plus: true,
        environment: 'sandbox',
      })
      .then(() => {
        if (!connections.some((c) => c.id === profile.id)) {
          setConnections((prev) => {
            const next = [profile, ...prev];
            localStorage.setItem('jobs_user_connections', JSON.stringify(next));
            return next;
          });
        }
        setActiveChatPartner(profile);
        setActiveScreen('12_chat');
      })
      .catch((err) => {
        console.error('Erro ao enviar interesse imediato:', err);
      });
  };

  const handleBlockUser = (profile: Profile) => {
    const updated = [...blockedUserIds, profile.id];
    setBlockedUserIds(updated);
    localStorage.setItem('jhobs_blocked_user_ids', JSON.stringify(updated));
    setActiveScreen('18_reports_blocks');
  };

  const handleUnblockProfile = (profileId: string) => {
    const updated = blockedUserIds.filter((id) => id !== profileId);
    setBlockedUserIds(updated);
    localStorage.setItem('jhobs_blocked_user_ids', JSON.stringify(updated));
  };

  const handleSubmitReport = (newRep: Omit<ReportTicket, 'id' | 'createdAt' | 'status'>) => {
    const reportTicket: ReportTicket = {
      ...newRep,
      id: `rep_${Date.now()}`,
      createdAt: 'Hoje',
      status: 'pendente',
    };
    setReports((prev) => {
      const next = [reportTicket, ...prev];
      localStorage.setItem('jobs_user_reports', JSON.stringify(next));
      return next;
    });
  };

  // Synchronize Tab identifier with screen mapping
  const currentTab = (() => {
    switch (activeScreen) {
      case '08_home':
        return 'home';
      case '09_discover':
      case '10_profile_detail':
        return 'discover';
      case 'lives':
        return 'lives';
      case '11_connections':
        return 'connections';
      case '12_chat':
      case '13_video_call':
        return 'messages';
      case '14_notifications':
        return 'notifications';
      case '15_subscriptions':
        return 'subscriptions';
      case '16_settings':
      case '17_privacy_security':
      case '18_reports_blocks':
        return 'profile';
      default:
        return 'home';
    }
  })();

  const handleSelectTab = (tab: string) => {
    switch (tab) {
      case 'home':
        setActiveScreen('08_home');
        break;
      case 'discover':
        setActiveScreen('09_discover');
        break;
      case 'lives':
        setActiveScreen('lives');
        break;
      case 'connections':
        setActiveScreen('11_connections');
        break;
      case 'messages':
        setActiveScreen('12_chat');
        break;
      case 'subscriptions':
        setActiveScreen('15_subscriptions');
        break;
      case 'profile':
        setActiveScreen('16_settings');
        break;
      default:
        setActiveScreen('08_home');
    }
  };

  const isFullBleedScreen =
    activeScreen === '01_landing' ||
    activeScreen === '02_register' ||
    activeScreen === '03_login' ||
    activeScreen === '04_age_gate' ||
    activeScreen === '05_password_recovery' ||
    activeScreen === '06_profile_creation' ||
    activeScreen === '07_preferences' ||
    activeScreen === '13_video_call';

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navbar: Shown on authenticated main views */}
      {!isFullBleedScreen && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          creditsBalance={userCredits}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenCreatorStudio={() => setIsAdminDashboardOpen(true)}
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          onOpenReferral={() => setIsReferralModalOpen(true)}
          onOpenScreenSwitcher={() => setIsScreenSwitcherOpen(true)}
          onOpenGlobalVision={() => setIsGlobalVisionOpen(true)}
          unreadMessagesCount={1}
          unreadNotificationsCount={notifications.filter((n) => !n.read).length}
          onOpenNotifications={() => setActiveScreen('14_notifications')}
        />
      )}

      {/* Main Screen Content Body */}
      <main className={`flex-1 ${!isFullBleedScreen ? 'pb-24 pt-2' : ''}`}>
        {/* ======================================================== */}
        {/* SCREEN 01: Abertura do Aplicativo                        */}
        {/* ======================================================== */}
        {activeScreen === '01_landing' && (
          <Screen01Landing
            onExplore={() => setActiveScreen('09_discover')}
            onRegister={() => setActiveScreen('02_register')}
            onLogin={() => setActiveScreen('03_login')}
            onOpenPrivacyTerms={() => setActiveScreen('17_privacy_security')}
            onOpenGlobalVision={() => setIsGlobalVisionOpen(true)}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 02: Cadastro                                      */}
        {/* ======================================================== */}
        {activeScreen === '02_register' && (
          <Screen02Register
            onSuccess={(data) => {
              setUserProfile((prev) => ({ ...prev, name: data.username }));
              setActiveScreen('04_age_gate');
            }}
            onGoToLogin={() => setActiveScreen('03_login')}
            onOpenTerms={() => setActiveScreen('17_privacy_security')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 03: Login                                         */}
        {/* ======================================================== */}
        {activeScreen === '03_login' && (
          <Screen03Login
            onSuccess={async () => {
              const session = authService.getCurrentSession();
              if (session) {
                const accounts = await authService.getAccounts();
                const cur = accounts.find((a) => a.id === session.userId);
                if (cur && cur.profileData) {
                  setUserProfile(cur.profileData);
                  localStorage.setItem('jhobs_user_profile_data', JSON.stringify(cur.profileData));
                }
              }
              setActiveScreen('08_home');
            }}
            onGoToRegister={() => setActiveScreen('02_register')}
            onGoToPasswordRecovery={() => setActiveScreen('05_password_recovery')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 04: Verificação de Idade                          */}
        {/* ======================================================== */}
        {activeScreen === '04_age_gate' && (
          <Screen04AgeGate
            onSuccess={({ birthDate, age }) => {
              setUserProfile((prev) => {
                const updated = { ...prev, birthDate, age, verified18: true };
                localStorage.setItem('jhobs_user_profile_data', JSON.stringify(updated));
                const session = authService.getCurrentSession();
                if (session) {
                  authService.updateAccountProfile(session.userId, { birthDate, age, verified18: true });
                }
                return updated;
              });
              setActiveScreen('06_profile_creation');
            }}
            onExit={() => setActiveScreen('01_landing')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 05: Recuperação de Senha                          */}
        {/* ======================================================== */}
        {activeScreen === '05_password_recovery' && (
          <Screen05PasswordRecovery onGoToLogin={() => setActiveScreen('03_login')} />
        )}

        {/* ======================================================== */}
        {/* SCREEN 06: Criação de Perfil                             */}
        {/* ======================================================== */}
        {activeScreen === '06_profile_creation' && (
          <Screen06ProfileCreation
            initialData={userProfile}
            onOpenCreatorContentStudio={() => setIsCreatorContentStudioOpen(true)}
            onSuccess={(updated) => {
              setUserProfile((prev) => {
                const next = { ...prev, ...updated };
                localStorage.setItem('jhobs_user_profile_data', JSON.stringify(next));
                const session = authService.getCurrentSession();
                if (session) {
                  authService.updateAccountProfile(session.userId, updated);
                }
                return next;
              });
              setActiveScreen('07_preferences');
            }}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 07: Preferências de Relacionamento                */}
        {/* ======================================================== */}
        {activeScreen === '07_preferences' && (
          <Screen07RelationshipPreferences
            initialData={userProfile}
            onSuccess={(updated) => {
              setUserProfile((prev) => {
                const next = { ...prev, ...updated };
                localStorage.setItem('jhobs_user_profile_data', JSON.stringify(next));
                const session = authService.getCurrentSession();
                if (session) {
                  authService.updateAccountProfile(session.userId, updated);
                }
                return next;
              });
              setActiveScreen('08_home');
            }}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 08: Tela Inicial (Dashboard)                      */}
        {/* ======================================================== */}
        {activeScreen === '08_home' && (
          <Screen08HomeDashboard
            userProfile={userProfile}
            subscription={subscription}
            profiles={visibleProfiles}
            matchesCount={connections.length}
            unreadCount={1}
            onNavigate={(dest) => {
              if (dest === 'discover') setActiveScreen('09_discover');
              else if (dest === 'connections') setActiveScreen('11_connections');
              else if (dest === 'messages') setActiveScreen('12_chat');
              else if (dest === 'subscriptions') setActiveScreen('15_subscriptions');
            }}
            onSelectProfile={(p) => {
              setDetailProfile(p);
              setActiveScreen('10_profile_detail');
            }}
            onOpenChallenges={() => setIsChallengesModalOpen(true)}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenCreatorContentStudio={() => setIsCreatorContentStudioOpen(true)}
            onOpenReferralModal={() => setIsReferralModalOpen(true)}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 09: Descoberta de Pessoas                         */}
        {/* ======================================================== */}
        {activeScreen === '09_discover' && (
          <Screen09Discover
            profiles={visibleProfiles}
            userProfile={userProfile}
            onLike={handleLike}
            onPass={handlePass}
            onViewProfile={(p) => {
              setDetailProfile(p);
              setActiveScreen('10_profile_detail');
            }}
            onSendInterest={handleSendInterest}
            onOpenPreferences={() => setActiveScreen('07_preferences')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 10: Perfil Detalhado                              */}
        {/* ======================================================== */}
        {activeScreen === '10_profile_detail' && detailProfile && (
          <Screen10ProfileDetail
            profile={detailProfile}
            userProfile={userProfile}
            onClose={() => setActiveScreen('09_discover')}
            onLike={(p) => {
              handleLike(p);
              setActiveScreen('09_discover');
            }}
            onStartChat={(p) => {
              setActiveChatPartner(p);
              setActiveScreen('12_chat');
            }}
            onBlock={handleBlockUser}
            onReport={(p) => {
              setActiveScreen('18_reports_blocks');
            }}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 11: Conexões (Matches)                            */}
        {/* ======================================================== */}
        {activeScreen === '11_connections' && (
          <Screen11Connections
            connections={connections}
            onOpenChat={(p) => {
              setActiveChatPartner(p);
              setActiveScreen('12_chat');
            }}
            onExploreMore={() => setActiveScreen('09_discover')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 12: Conversas (Chat 1:1)                          */}
        {/* ======================================================== */}
        {activeScreen === '12_chat' && (
          <Screen12Chat
            partner={activeChatPartner}
            userProfile={userProfile}
            currentUserId={currentUserId}
            onBack={() => setActiveScreen('11_connections')}
            onStartVideoCall={(partner) => {
              setActiveVideoCallPartner(partner);
              setActiveScreen('13_video_call');
            }}
            onBlockUser={handleBlockUser}
            onReportUser={() => setActiveScreen('18_reports_blocks')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 13: Chamadas de Vídeo Ao Vivo                     */}
        {/* ======================================================== */}
        {activeScreen === '13_video_call' && (
          <Screen13VideoCall
            partner={activeVideoCallPartner}
            onEndCall={() => setActiveScreen('12_chat')}
            onReport={() => setActiveScreen('18_reports_blocks')}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 14: Notificações                                  */}
        {/* ======================================================== */}
        {activeScreen === '14_notifications' && (
          <Screen14Notifications
            notifications={notifications}
            onSelectNotification={(n) => {
              if (n.creatorId) {
                const found = profiles.find((p) => p.id === n.creatorId);
                if (found) {
                  setActiveChatPartner(found);
                  setActiveScreen('12_chat');
                  return;
                }
              }
              setActiveScreen('08_home');
            }}
            onMarkAllAsRead={() =>
              setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
            }
            onClearAll={() => setNotifications([])}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 15: Assinaturas (Monetização)                     */}
        {/* ======================================================== */}
        {activeScreen === '15_subscriptions' && (
          <Screen15Subscriptions
            currentSubscription={subscription}
            onUpgrade={(newSub) => setSubscription(newSub)}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 16: Configurações                                 */}
        {/* ======================================================== */}
        {activeScreen === '16_settings' && (
          <Screen16Settings
            userProfile={userProfile}
            onNavigateToPrivacy={() => setActiveScreen('17_privacy_security')}
            onNavigateToReports={() => setActiveScreen('18_reports_blocks')}
            onNavigateToPasswordReset={() => setActiveScreen('05_password_recovery')}
            onOpenGlobalVision={() => setIsGlobalVisionOpen(true)}
            onOpenCreatorContentStudio={() => setIsCreatorContentStudioOpen(true)}
            onLogout={() => {
              authService.logout();
              localStorage.removeItem('jobs_auth_user');
              setActiveScreen('01_landing');
            }}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 17: Privacidade & Segurança (LGPD)                */}
        {/* ======================================================== */}
        {activeScreen === '17_privacy_security' && (
          <Screen17PrivacySecurity
            userProfile={userProfile}
            onDeleteAccount={() => {
              localStorage.clear();
              setActiveScreen('01_landing');
            }}
          />
        )}

        {/* ======================================================== */}
        {/* SCREEN 18: Denúncias e Bloqueios                         */}
        {/* ======================================================== */}
        {activeScreen === '18_reports_blocks' && (
          <Screen18ReportsBlocks
            blockedProfiles={blockedProfilesList}
            reports={reports}
            onUnblockProfile={handleUnblockProfile}
            onSubmitReport={handleSubmitReport}
            availableProfilesToReport={visibleProfiles}
          />
        )}

        {/* ======================================================== */}
        {/* LIVES AO VIVO, BATALHAS E RECOMPENSAS                    */}
        {/* ======================================================== */}
        {activeScreen === 'lives' && (
          <LiveStreamView
            liveStreams={INITIAL_LIVE_STREAMS}
            userCredits={userCredits}
            onUnlockLiveStream={(streamId, cost) => {
              const live = INITIAL_LIVE_STREAMS.find((s) => s.id === streamId);
              financialLedger
                .unlockLiveStream({
                  userId: 'current_user',
                  creatorId: live?.creatorId || 'valentina',
                  creatorName: live?.creatorName || 'Valentina Rossi',
                  liveStreamId: streamId,
                  liveTitle: live?.title || `Live VIP #${streamId}`,
                  priceCredits: cost,
                  idempotencyKey: `idemp_live_unlock_${streamId}_${Date.now()}`,
                })
                .then((res) => {
                  setUserCredits(res.newCreditsBalance);
                })
                .catch((err) => {
                  console.error('Falha contábil ao desbloquear live:', err);
                });
            }}
            onSendLiveTip={(stream, amount) => {
              setUserCredits(financialLedger.getUserCredits('current_user'));
            }}
            onOpenWallet={() => setIsWalletOpen(true)}
            onStartUserLive={() => {}}
            onCreditsUpdated={(newBal) => setUserCredits(newBal)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isFullBleedScreen && (
        <BottomNavigation
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          unreadMessagesCount={1}
          onOpenScreenSwitcher={() => setIsScreenSwitcherOpen(true)}
        />
      )}

      {/* Floating 18-Screens Fast Switcher Pill (Always accessible for easy inspection) */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
        <button
          onClick={() => setIsScreenSwitcherOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white text-xs font-extrabold border border-rose-500/50 shadow-2xl shadow-rose-950/60 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Layers className="w-4 h-4 text-rose-400" />
          <span>Ver 18 Telas</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* Screen Switcher Modal */}
      <ScreenSwitcherModal
        isOpen={isScreenSwitcherOpen}
        onClose={() => setIsScreenSwitcherOpen(false)}
        currentScreen={activeScreen}
        onSelectScreen={(screenId) => setActiveScreen(screenId)}
      />

      {/* Match Celebration Modal */}
      {matchedProfile && (
        <MatchCelebrationModal
          matchedProfile={matchedProfile}
          onClose={() => setMatchedProfile(null)}
          onGoToChat={(p) => {
            setMatchedProfile(null);
            setActiveChatPartner(p);
            setActiveScreen('12_chat');
          }}
          onGoToVault={(p) => {
            setMatchedProfile(null);
            setDetailProfile(p);
            setActiveScreen('10_profile_detail');
          }}
        />
      )}

      {/* Wallet Modal (Integrado ao Livro-Razão Contábil - Fases 1 & 2) */}
      {isWalletOpen && (
        <WalletModal
          onClose={() => setIsWalletOpen(false)}
          currentCredits={userCredits}
          onCreditsUpdated={(newBal) => setUserCredits(newBal)}
          onOpenCreatorStudio={() => {
            setIsWalletOpen(false);
            setIsAdminDashboardOpen(true);
          }}
          initialTab="buy"
        />
      )}

      {/* Painel Central do Administrador JOBS (12 Módulos & Fases 0 a 10) */}
      {isAdminDashboardOpen && (
        <CentralAdminDashboardModal onClose={() => setIsAdminDashboardOpen(false)} />
      )}

      {/* Referral Pyramid Modal */}
      {isReferralModalOpen && (
        <ReferralPyramidModal
          onClose={() => setIsReferralModalOpen(false)}
          onOpenWallet={() => setIsWalletOpen(true)}
          onWithdrawPixDirect={(amountBrl, pixKey, pixType, bank) => {
            const newTx: Transaction = {
              id: `tx_ref_${Date.now()}`,
              type: 'payout',
              amountCredits: Math.round(amountBrl * 10),
              amountBrl: amountBrl,
              description: `Saque de Recompensa de Afiliados JOBS via PIX - ${bank}`,
              timestamp: 'Agora',
            };
            setTransactions((prev) => [newTx, ...prev]);
          }}
        />
      )}

      {/* Global Vision & Expansion Modal (Do Brasil para o Mundo 🌎) */}
      <GlobalVisionModal
        isOpen={isGlobalVisionOpen}
        onClose={() => setIsGlobalVisionOpen(false)}
      />

      {/* Desafios Interativos Consensuais (+18) — Fase 1 (Etapas 5 e 9) */}
      <InteractiveChallengesModal
        isOpen={isChallengesModalOpen}
        onClose={() => setIsChallengesModalOpen(false)}
        userId={currentUserId}
      />

      {/* Estúdio de Publicação de Fotos/Vídeos, Meu Conteúdo e Cofre VIP */}
      <CreatorContentStudioModal
        isOpen={isCreatorContentStudioOpen}
        onClose={() => setIsCreatorContentStudioOpen(false)}
        creatorId="valentina"
        creatorName={userProfile.name || 'Valentina Rossi'}
      />
    </div>
  );
}
