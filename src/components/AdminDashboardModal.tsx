import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  FunnelChart,
  Funnel,
  Cell,
  LabelList,
} from 'recharts';
import {
  X,
  TrendingUp,
  Users,
  DollarSign,
  Coins,
  Eye,
  Activity,
  ShieldCheck,
  Check,
  Sparkles,
  RefreshCw,
  BarChart2,
  Globe2,
  Radio,
  Filter,
  RotateCcw,
  Search,
  MapPin,
  Smartphone,
  Monitor,
  Flame,
  MessageCircle,
  Clock,
  ChevronRight,
  Crown,
  Zap,
  Play,
  Pause,
  UserCheck,
  SlidersHorizontal,
  ArrowUpRight,
  Layers,
  Wallet,
  Send,
  CreditCard,
  ArrowDownRight,
  CheckCircle2,
  UserPlus,
  Download,
  Key,
  Building2,
  Copy,
  FileText,
  AlertTriangle,
  Lock,
  Unlock,
  Target,
  Percent,
  ArrowDown,
  ArrowRight,
  ShieldAlert,
  Scale,
  GraduationCap,
  Ban,
  BookOpen,
} from 'lucide-react';
import {
  DailyMetric,
  Transaction,
  OnlineUserAdmin,
  RegionDemographic,
  LiveGender,
  LiveSexualOrientation,
  AgeBracket,
  PixKeyType,
  PixAccountDetails,
  AdminPixTransferRecord,
  AdminPlatformWithdrawalRecord,
} from '../types';
import {
  INITIAL_ONLINE_ADMIN_USERS,
  INITIAL_REGION_DEMOGRAPHICS,
} from '../data/mockData';
import { getSavedGAMeasurementId, saveGAMeasurementId, trackEvent } from '../utils/analytics';
import { isReferralCampaignActive, setReferralCampaignActive } from '../data/referralData';
import { PlatformFinancialExecutive } from './admin/PlatformFinancialExecutive';

interface AdminDashboardModalProps {
  onClose: () => void;
  transactions: Transaction[];
  dailyMetrics: DailyMetric[];
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  onClose,
  transactions,
  dailyMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'online_users' | 'regions' | 'funnel' | 'profit_withdrawal' | 'referral_pyramid' | 'compliance_legal' | 'financeiro_plataforma'>('online_users');
  const [isReferralActive, setIsReferralActive] = useState<boolean>(() => isReferralCampaignActive());
  const [gaId, setGaId] = useState(getSavedGAMeasurementId());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // VIP Profile Conversion Funnel State (Recharts)
  const [funnelPeriod, setFunnelPeriod] = useState<'today' | '7days' | '30days'>('7days');
  const [funnelCategory, setFunnelCategory] = useState<'all' | 'photos' | 'videos' | 'vip_chat'>('all');
  const [funnelChartType, setFunnelChartType] = useState<'funnel' | 'bars' | 'stages'>('funnel');

  // Real-Time Telemetry & Live Pulse Simulation State
  const [livePulseTick, setLivePulseTick] = useState(0);
  const [isLiveAutoUpdate, setIsLiveAutoUpdate] = useState(true);
  const [telemetryViewMode, setTelemetryViewMode] = useState<'all' | 'users' | 'creators' | 'split'>('all');
  const [telemetryActiveMetric, setTelemetryActiveMetric] = useState<'all' | 'gender' | 'age' | 'orientation'>('all');

  // Online Users State & Filters
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserAdmin[]>(INITIAL_ONLINE_ADMIN_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'todos' | 'usuarios' | 'criadores'>('todos');
  const [genderFilter, setGenderFilter] = useState<'todos' | LiveGender>('todos');
  const [ageFilter, setAgeFilter] = useState<'todas' | AgeBracket>('todas');
  const [orientationFilter, setOrientationFilter] = useState<'todas' | LiveSexualOrientation>('todas');
  const [regionFilter, setRegionFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [filterOnlyWithPayout, setFilterOnlyWithPayout] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paidUsersMap, setPaidUsersMap] = useState<Record<string, { time: string; amountBrl: number }>>({});
  const [payoutSuccessToast, setPayoutSuccessToast] = useState<string | null>(null);

  // PIX Key Edit / Insert Modal State
  const [editingPixUser, setEditingPixUser] = useState<OnlineUserAdmin | null>(null);
  const [editPixKeyType, setEditPixKeyType] = useState<PixKeyType>('email');
  const [editPixKey, setEditPixKey] = useState('');
  const [editBankName, setEditBankName] = useState('Nubank (Nu Pagamentos S.A.)');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editCpfCnpj, setEditCpfCnpj] = useState('');

  // PIX Direct Transfer Confirmation Modal State
  const [transferringUser, setTransferringUser] = useState<OnlineUserAdmin | null>(null);
  const [transferAmountBrl, setTransferAmountBrl] = useState<number>(0);
  const [isExecutingTransfer, setIsExecutingTransfer] = useState(false);
  const [transferProgressStep, setTransferProgressStep] = useState('');

  // Manual Transfer Modal State
  const [showManualTransferModal, setShowManualTransferModal] = useState(false);
  const [manualSelectedUserId, setManualSelectedUserId] = useState('');
  const [manualPixKeyType, setManualPixKeyType] = useState<PixKeyType>('cpf');
  const [manualPixKey, setManualPixKey] = useState('');
  const [manualBankName, setManualBankName] = useState('Nubank (Nu Pagamentos S.A.)');
  const [manualHolderName, setManualHolderName] = useState('');
  const [manualAmountBrl, setManualAmountBrl] = useState<number>(50);

  // Official Receipt Modal State
  const [adminReceipt, setAdminReceipt] = useState<AdminPixTransferRecord | null>(null);
  const [adminReceiptCopied, setAdminReceiptCopied] = useState(false);

  // Transfer History
  const [adminPixTransfersHistory, setAdminPixTransfersHistory] = useState<AdminPixTransferRecord[]>([]);

  // Platform Profit & Admin Withdrawal State
  const INITIAL_ADMIN_WITHDRAWALS: AdminPlatformWithdrawalRecord[] = [
    {
      id: 'wd_adm_01',
      adminName: 'Administrador Jhobs Master',
      amountBrl: 5000,
      pixKey: 'diretoria@jhobs.vip',
      pixKeyType: 'email',
      bankName: 'Nubank (Nu Pagamentos S.A.)',
      accountHolder: 'Jhobs Participações & Tecnologia Ltda',
      cpfCnpjMasked: '41.***.***/0001-92',
      paymentMethod: 'pix',
      timestamp: '14/10/2026 18:32',
      endToEndId: 'E004169682026101418320491823901a',
      status: 'concluido',
      netProfitRemainingBrl: 22820,
    },
    {
      id: 'wd_adm_02',
      adminName: 'Administrador Jhobs Master',
      amountBrl: 7000,
      pixKey: '41.982.019/0001-92',
      pixKeyType: 'cnpj',
      bankName: 'Banco Itaú S.A.',
      accountHolder: 'Jhobs Participações & Tecnologia Ltda',
      cpfCnpjMasked: '41.***.***/0001-92',
      paymentMethod: 'pix',
      timestamp: '08/10/2026 14:15',
      endToEndId: 'E004169682026100814152918491820b',
      status: 'concluido',
      netProfitRemainingBrl: 27820,
    },
  ];

  const [adminWithdrawnProfit, setAdminWithdrawnProfit] = useState<number>(() => {
    const saved = localStorage.getItem('jhobs_admin_withdrawn_profit');
    return saved ? Number(saved) : 12000;
  });

  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminPlatformWithdrawalRecord[]>(() => {
    const saved = localStorage.getItem('jhobs_admin_platform_withdrawals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ADMIN_WITHDRAWALS;
      }
    }
    return INITIAL_ADMIN_WITHDRAWALS;
  });

  const [showAdminWithdrawalModal, setShowAdminWithdrawalModal] = useState(false);
  const [adminWithdrawAmount, setAdminWithdrawAmount] = useState<number>(2500);
  const [adminWithdrawMethod, setAdminWithdrawMethod] = useState<'pix' | 'ted'>('pix');
  const [adminPixKeyType, setAdminPixKeyType] = useState<PixKeyType>('cnpj');
  const [adminPixKey, setAdminPixKey] = useState('41.982.019/0001-92');
  const [adminBankName, setAdminBankName] = useState('Nubank (Nu Pagamentos S.A.)');
  const [adminHolderName, setAdminHolderName] = useState('Jhobs Participações & Tecnologia Ltda');
  const [adminCpfCnpj, setAdminCpfCnpj] = useState('41.982.019/0001-92');
  const [adminBankAgency, setAdminBankAgency] = useState('0001');
  const [adminBankAccount, setAdminBankAccount] = useState('892019-3');
  const [isExecutingAdminWithdrawal, setIsExecutingAdminWithdrawal] = useState(false);
  const [adminWithdrawalStep, setAdminWithdrawalStep] = useState('');
  const [adminWithdrawalReceipt, setAdminWithdrawalReceipt] = useState<AdminPlatformWithdrawalRecord | null>(null);
  const [adminWithdrawalReceiptCopied, setAdminWithdrawalReceiptCopied] = useState(false);

  // Compliance Legal (+18 Strict) & Confiscated Credits to Jhobs Wallet State
  const INITIAL_BANNED_UNDERAGE_LOG = [
    {
      id: 'BAN-982103',
      name: 'Conta_Suspeita_99',
      city: 'São Paulo (BR)',
      ageClaimed: 16,
      creditsConfiscated: 540,
      date: '12/10/2026 15:42',
      ipMasked: '177.18.***.***',
      reason: 'Presença de menor de 18 anos detectada e confirmada. Usuário banido e saldo transferido para a carteira Jhobs.',
      status: 'bloqueado_e_banido',
    },
    {
      id: 'BAN-491820',
      name: 'Junior_VIP_021',
      city: 'Rio de Janeiro (BR)',
      ageClaimed: 17,
      creditsConfiscated: 940,
      date: '09/10/2026 21:10',
      ipMasked: '189.44.***.***',
      reason: 'Tentativa de burlar verificação biométrica. Menor de idade identificado. Saldo transferido para carteira Jobs.',
      status: 'bloqueado_e_banido',
    },
  ];

  const [totalConfiscatedCreditsToJhobs, setTotalConfiscatedCreditsToJhobs] = useState<number>(() => {
    const saved = localStorage.getItem('jhobs_confiscated_credits');
    return saved ? Number(saved) : 1480;
  });

  const [bannedUnderageUsers, setBannedUnderageUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('jhobs_banned_underage_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_BANNED_UNDERAGE_LOG;
      }
    }
    return INITIAL_BANNED_UNDERAGE_LOG;
  });

  const [userToBanUnderage, setUserToBanUnderage] = useState<OnlineUserAdmin | null>(null);

  // Pre-Launch Training & Simulation Mode State
  const [trainingSimulationLog, setTrainingSimulationLog] = useState<string[]>([
    'Módulo de treino pré-lançamento ativo: sistema pronto para homologação operacional antes da abertura ao público.',
  ]);
  const [isSimulatingTraining, setIsSimulatingTraining] = useState(false);
  const [trainingActiveModule, setTrainingActiveModule] = useState<'profit_audit' | 'withdrawal_flow' | 'legal_enforcement'>('profit_audit');

  // Regional Demographics State & Inspection
  const [regions] = useState<RegionDemographic[]>(INITIAL_REGION_DEMOGRAPHICS);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('latam');
  const [regionDemographicMetric, setRegionDemographicMetric] = useState<'all' | 'gender' | 'age' | 'orientation'>('all');

  // Real-time ticking effect for natural active platform pulse
  useEffect(() => {
    if (!isLiveAutoUpdate) return;
    const interval = setInterval(() => {
      setLivePulseTick((prev) => (prev + 1) % 100);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLiveAutoUpdate]);

  // Recharts Chart View Mode: 'both' (lado a lado), 'revenue' (foco receita BRL), 'credits' (foco média créditos gastos), 'composed' (gráfico duplo eixo)
  const [chartViewMode, setChartViewMode] = useState<'both' | 'revenue' | 'credits' | 'composed'>('both');

  // Processed weekly metrics for Recharts
  const processedWeeklyMetrics = useMemo(() => {
    return dailyMetrics.map((item, index) => {
      const creditsSpent = item.creditsSpent ?? Math.round(item.creditsSold * 0.88 + (index * 120));
      const avgCreditsSpent = item.avgCreditsSpent ?? Number((creditsSpent / (item.activeUsers || 1)).toFixed(1));
      const prevRevenue = index > 0 ? dailyMetrics[index - 1].revenueBrl : item.revenueBrl;
      const growthVsPrevDay = index > 0
        ? Number((((item.revenueBrl - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : 0;

      return {
        ...item,
        creditsSpent,
        avgCreditsSpent,
        growthVsPrevDay,
      };
    });
  }, [dailyMetrics]);

  // Weekly summaries for chart KPIs
  // Global totals from daily metrics
  const totalCreditsSold = dailyMetrics.reduce((acc, m) => acc + m.creditsSold, 0);
  const totalRevenueBrl = dailyMetrics.reduce((acc, m) => acc + m.revenueBrl, 0);
  const todayMetric = dailyMetrics[dailyMetrics.length - 1] || {
    activeUsers: 1248,
    pageViews: 8430,
    creditsSold: 24800,
    revenueBrl: 3490.0,
  };

  // Weekly summaries for chart KPIs
  const totalWeeklyRevenue = processedWeeklyMetrics.reduce((acc, m) => acc + m.revenueBrl, 0);
  const totalWeeklyCreditsSpent = processedWeeklyMetrics.reduce((acc, m) => acc + m.creditsSpent, 0);
  const totalWeeklyActiveUsers = processedWeeklyMetrics.reduce((acc, m) => acc + m.activeUsers, 0);
  const weeklyAvgCreditsPerUser = Number((totalWeeklyCreditsSpent / (totalWeeklyActiveUsers || 1)).toFixed(1));
  const firstDayRevenue = processedWeeklyMetrics[0]?.revenueBrl || 1;
  const lastDayRevenue = processedWeeklyMetrics[processedWeeklyMetrics.length - 1]?.revenueBrl || 1;
  const weeklyRevenueGrowthTotalPct = Math.round(((lastDayRevenue - firstDayRevenue) / firstDayRevenue) * 100);

  // Gross volume from credit purchases in wallet & transactions
  // Regra Oficial 50% / 50%:
  // 50% do valor da compra fica disponível para valores a receber e transferência via PIX dos usuários
  // 50% do valor da compra fica obtido para a plataforma Jhobs e imediatamente disponível para saque do administrador
  const totalPlatformGrossRevenue = 86420.00 + totalRevenueBrl;
  const totalUserPurchasesPayoutAvailableBrl = Number((totalPlatformGrossRevenue * 0.50).toFixed(2)); // 50% disponível para saque dos usuários
  const totalPlatformProfitBrl = Number((totalPlatformGrossRevenue * 0.50).toFixed(2)); // 50% obtido para a plataforma Jhobs
  // Saldo de lucro obtido imediatamente disponível para saque do administrador
  const adminAvailableProfit = Math.max(0, totalPlatformProfitBrl - adminWithdrawnProfit);

  const highestRevenueDay = useMemo(() => {
    return [...processedWeeklyMetrics].sort((a, b) => b.revenueBrl - a.revenueBrl)[0] || processedWeeklyMetrics[0];
  }, [processedWeeklyMetrics]);

  const highestCreditsDay = useMemo(() => {
    return [...processedWeeklyMetrics].sort((a, b) => b.avgCreditsSpent - a.avgCreditsSpent)[0] || processedWeeklyMetrics[0];
  }, [processedWeeklyMetrics]);

  // Volume de Gorjetas (Tips) por Dia da Semana (Recharts BarChart)
  const tipsByDayOfWeek = useMemo(() => {
    return [
      { day: 'Segunda-feira', dayShort: 'Seg', tipsCredits: 4200, tipsBrl: 420.0, tipsCount: 142, topCreator: 'Valentina Rossi', fill: '#6366f1' },
      { day: 'Terça-feira', dayShort: 'Ter', tipsCredits: 5600, tipsBrl: 560.0, tipsCount: 188, topCreator: 'Isabella Fontes', fill: '#6366f1' },
      { day: 'Quarta-feira', dayShort: 'Qua', tipsCredits: 6900, tipsBrl: 690.0, tipsCount: 224, topCreator: 'Valentina Rossi', fill: '#8b5cf6' },
      { day: 'Quinta-feira', dayShort: 'Qui', tipsCredits: 8800, tipsBrl: 880.0, tipsCount: 295, topCreator: 'Beatriz Lima', fill: '#a855f7' },
      { day: 'Sexta-feira', dayShort: 'Sex', tipsCredits: 16400, tipsBrl: 1640.0, tipsCount: 540, topCreator: 'Valentina Rossi', isPeak: true, fill: '#ec4899' },
      { day: 'Sábado', dayShort: 'Sáb', tipsCredits: 22800, tipsBrl: 2280.0, tipsCount: 780, topCreator: 'Valentina Rossi', isPeak: true, fill: '#f43f5e' },
      { day: 'Domingo', dayShort: 'Dom', tipsCredits: 18900, tipsBrl: 1890.0, tipsCount: 630, topCreator: 'Isabella Fontes', isPeak: true, fill: '#f59e0b' },
    ];
  }, []);

  // VIP Profile to Unlock Conversion Funnel Data (Calculated dynamically for Recharts)
  const funnelData = useMemo(() => {
    let baseViews = 24950;
    if (funnelPeriod === 'today') baseViews = 3480;
    else if (funnelPeriod === '30days') baseViews = 104800;

    let categoryFactor = 1.0;
    let categoryLabel = 'Todos os Conteúdos VIP (+18)';
    if (funnelCategory === 'photos') {
      categoryFactor = 0.54;
      categoryLabel = 'Fotos Íntimas Privadas';
    } else if (funnelCategory === 'videos') {
      categoryFactor = 0.32;
      categoryLabel = 'Vídeos Exclusivos VIP';
    } else if (funnelCategory === 'vip_chat') {
      categoryFactor = 0.14;
      categoryLabel = 'Mídias no Chat Privado';
    }

    const v1 = Math.round(baseViews * categoryFactor);
    const v2 = Math.round(v1 * 0.648);
    const v3 = Math.round(v2 * 0.642);
    const v4 = Math.round(v3 * 0.765);
    const v5 = Math.round(v4 * 0.782);

    const globalRate = Number(((v5 / v1) * 100).toFixed(1));
    const avgCredits = funnelCategory === 'videos' ? 120 : funnelCategory === 'photos' ? 50 : 80;
    const totalCredits = v5 * avgCredits;
    const totalRevenueBrl = totalCredits * 0.1; // R$ 0,10 por crédito

    const stages = [
      {
        id: 'view_profile',
        stepNumber: 1,
        name: '1. Visualização do Perfil VIP',
        shortName: '1. Visita ao Perfil',
        value: v1,
        percentage: 100,
        percentageLabel: '100%',
        conversionRate: 100,
        dropoffCount: v1 - v2,
        dropoffRate: Number((((v1 - v2) / v1) * 100).toFixed(1)),
        fill: '#6366f1',
        stroke: '#4338ca',
        iconName: 'Eye',
        avgTimeSeconds: 0,
        description: 'Usuários que abriram o perfil do criador VIP no feed, stories ou busca',
      },
      {
        id: 'view_media_preview',
        stepNumber: 2,
        name: '2. Visualização de Mídia Privada (Blur)',
        shortName: '2. Preview / Blur +18',
        value: v2,
        percentage: Number(((v2 / v1) * 100).toFixed(1)),
        percentageLabel: `${((v2 / v1) * 100).toFixed(1)}%`,
        conversionRate: Number(((v2 / v1) * 100).toFixed(1)),
        dropoffCount: v2 - v3,
        dropoffRate: Number((((v2 - v3) / v2) * 100).toFixed(1)),
        fill: '#a855f7',
        stroke: '#7e22ce',
        iconName: 'Lock',
        avgTimeSeconds: 14,
        description: 'Usuários que inspecionaram fotos ou vídeos íntimos com desfoque de segurança',
      },
      {
        id: 'click_unlock_button',
        stepNumber: 3,
        name: '3. Intenção de Desbloqueio (Clique)',
        shortName: '3. Clique Desbloquear',
        value: v3,
        percentage: Number(((v3 / v1) * 100).toFixed(1)),
        percentageLabel: `${((v3 / v1) * 100).toFixed(1)}%`,
        conversionRate: Number(((v3 / v2) * 100).toFixed(1)),
        dropoffCount: v3 - v4,
        dropoffRate: Number((((v3 - v4) / v3) * 100).toFixed(1)),
        fill: '#f59e0b',
        stroke: '#d97706',
        iconName: 'Target',
        avgTimeSeconds: 28,
        description: 'Usuários que clicaram no botão "Desbloquear com Créditos" para abrir o modal',
      },
      {
        id: 'balance_checkout',
        stepNumber: 4,
        name: '4. Verificação de Saldo / Recarga PIX',
        shortName: '4. Saldo / Recarga PIX',
        value: v4,
        percentage: Number(((v4 / v1) * 100).toFixed(1)),
        percentageLabel: `${((v4 / v1) * 100).toFixed(1)}%`,
        conversionRate: Number(((v4 / v3) * 100).toFixed(1)),
        dropoffCount: v4 - v5,
        dropoffRate: Number((((v4 - v5) / v4) * 100).toFixed(1)),
        fill: '#ec4899',
        stroke: '#db2777',
        iconName: 'Wallet',
        avgTimeSeconds: 42,
        description: 'Usuários com saldo ativo na carteira ou que compraram pacote imediato PIX/Cartão',
      },
      {
        id: 'unlocked_success',
        stepNumber: 5,
        name: '5. Desbloqueio VIP Realizado (Conversão)',
        shortName: '5. Desbloqueio Feito',
        value: v5,
        percentage: Number(((v5 / v1) * 100).toFixed(1)),
        percentageLabel: `${((v5 / v1) * 100).toFixed(1)}%`,
        conversionRate: Number(((v5 / v4) * 100).toFixed(1)),
        dropoffCount: 0,
        dropoffRate: 0,
        fill: '#10b981',
        stroke: '#059669',
        iconName: 'Unlock',
        avgTimeSeconds: 52,
        description: 'Créditos debitados e conteúdo VIP liberado na íntegra sem borrão',
      },
    ];

    return {
      totalViews: v1,
      totalPreviews: v2,
      totalIntents: v3,
      totalChecked: v4,
      totalUnlocks: v5,
      globalRate,
      totalCredits,
      totalRevenueBrl,
      categoryLabel,
      stages,
      dropoffMaxStep: 'Preview Blur -> Clique em Desbloquear',
      dropoffMaxRate: Number((((v2 - v3) / v2) * 100).toFixed(1)),
      avgUnlockTime: '48 segundos',
    };
  }, [funnelPeriod, funnelCategory]);

  const creatorConversionRankings = useMemo(() => {
    return [
      {
        name: 'Valentina Rossi',
        avatar: '/src/assets/images/profile_valentina.jpg',
        category: 'Transmissão Ao Vivo & Conteúdo Exclusivo',
        views: funnelPeriod === 'today' ? 1190 : funnelPeriod === '7days' ? 8420 : 35400,
        unlocks: funnelPeriod === 'today' ? 407 : funnelPeriod === '7days' ? 2880 : 12100,
        rate: 34.2,
        badge: 'Top 1 Conversão ⭐',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      },
      {
        name: 'Isabella Fontes',
        avatar: '/src/assets/images/profile_isabella.jpg',
        category: 'Fotos Privadas & Ensaios Glamour',
        views: funnelPeriod === 'today' ? 980 : funnelPeriod === '7days' ? 6940 : 29100,
        unlocks: funnelPeriod === 'today' ? 292 : funnelPeriod === '7days' ? 2068 : 8670,
        rate: 29.8,
        badge: 'Alta Retenção 🔥',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      },
      {
        name: 'Beatriz Lima',
        avatar: '/src/assets/images/profile_beatriz.jpg',
        category: 'Vídeos Secretos & Chat Exclusivo',
        views: funnelPeriod === 'today' ? 710 : funnelPeriod === '7days' ? 5120 : 21400,
        unlocks: funnelPeriod === 'today' ? 188 : funnelPeriod === '7days' ? 1356 : 5670,
        rate: 26.5,
        badge: 'Crescimento Rápido 🚀',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      },
      {
        name: 'Gabriel Menezes',
        avatar: '/src/assets/images/profile_gabriel.jpg',
        category: 'Fitness & Ensaios Sensuais Masculinos',
        views: funnelPeriod === 'today' ? 600 : funnelPeriod === '7days' ? 4470 : 18900,
        unlocks: funnelPeriod === 'today' ? 134 : funnelPeriod === '7days' ? 1001 : 4230,
        rate: 22.4,
        badge: 'Consistente ✨',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      },
    ];
  }, [funnelPeriod]);

  const handleSaveGaId = (e: React.FormEvent) => {
    e.preventDefault();
    saveGAMeasurementId(gaId.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSendTestEvent = () => {
    trackEvent('admin_dashboard_test_event', {
      timestamp: new Date().toISOString(),
      adminAction: 'manual_ping',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  // Real-Time Live Pulse Telemetry Calculations
  const tickOffset = (livePulseTick % 5) - 2; // -2, -1, 0, 1, 2
  const liveTotalOnline = 1248 + tickOffset;
  const liveUsersTotal = 1082 + Math.floor(tickOffset * 0.85);
  const liveCreatorsTotal = liveTotalOnline - liveUsersTotal; // ~166

  // Real-Time Breakdown: Users vs Creators across Gender, Age, Orientation
  const liveEngagementTelemetry = {
    totalOnline: liveTotalOnline,
    usersCount: liveUsersTotal,
    creatorsCount: liveCreatorsTotal,
    usersPercent: Math.round((liveUsersTotal / liveTotalOnline) * 100),
    creatorsPercent: Math.round((liveCreatorsTotal / liveTotalOnline) * 100),
    activeStreamsCount: 28 + (livePulseTick % 3),
    inPrivateChatCount: 194 + (livePulseTick % 5),
    watchingLivesCount: 312 + Math.floor(tickOffset * 0.5),

    // 1. GENDER BREAKDOWN (Users vs Creators)
    gender: [
      {
        id: 'mulher' as LiveGender,
        label: 'Mulheres',
        tag: '♀ Mulher',
        total: 580 + Math.floor(tickOffset * 0.45),
        users: 492 + Math.floor(tickOffset * 0.4),
        creators: 88,
        percent: 46.5,
      },
      {
        id: 'homem' as LiveGender,
        label: 'Homens',
        tag: '♂ Homem',
        total: 535 + Math.floor(tickOffset * 0.45),
        users: 485 + Math.floor(tickOffset * 0.4),
        creators: 50,
        percent: 42.9,
      },
      {
        id: 'trans' as LiveGender,
        label: 'Trans',
        tag: '⚧ Trans',
        total: 133 + Math.floor(tickOffset * 0.1),
        users: 105 + Math.floor(tickOffset * 0.1),
        creators: 28,
        percent: 10.6,
      },
    ],

    // 2. AGE BRACKET BREAKDOWN (Users vs Creators)
    age: [
      {
        id: '18-24' as AgeBracket,
        label: '18 - 24 anos',
        tag: '18–24',
        total: 482 + Math.floor(tickOffset * 0.38),
        users: 420 + Math.floor(tickOffset * 0.34),
        creators: 62,
        percent: 38.6,
      },
      {
        id: '25-34' as AgeBracket,
        label: '25 - 34 anos',
        tag: '25–34',
        total: 536 + Math.floor(tickOffset * 0.43),
        users: 456 + Math.floor(tickOffset * 0.38),
        creators: 80,
        percent: 43.0,
      },
      {
        id: '35-44' as AgeBracket,
        label: '35 - 44 anos',
        tag: '35–44',
        total: 171 + Math.floor(tickOffset * 0.14),
        users: 153 + Math.floor(tickOffset * 0.12),
        creators: 18,
        percent: 13.7,
      },
      {
        id: '45+' as AgeBracket,
        label: '45+ anos',
        tag: '45+',
        total: 59 + Math.floor(tickOffset * 0.05),
        users: 53 + Math.floor(tickOffset * 0.05),
        creators: 6,
        percent: 4.7,
      },
    ],

    // 3. SEXUAL ORIENTATION BREAKDOWN (Users vs Creators)
    orientation: [
      {
        id: 'hetero' as LiveSexualOrientation,
        label: 'Heterossexual',
        tag: 'Hetero',
        total: 653 + Math.floor(tickOffset * 0.52),
        users: 575 + Math.floor(tickOffset * 0.45),
        creators: 78,
        percent: 52.3,
      },
      {
        id: 'bi' as LiveSexualOrientation,
        label: 'Bissexual',
        tag: 'Bi',
        total: 335 + Math.floor(tickOffset * 0.27),
        users: 285 + Math.floor(tickOffset * 0.23),
        creators: 50,
        percent: 26.8,
      },
      {
        id: 'gay' as LiveSexualOrientation,
        label: 'Gay',
        tag: 'Gay',
        total: 145 + Math.floor(tickOffset * 0.12),
        users: 125 + Math.floor(tickOffset * 0.1),
        creators: 20,
        percent: 11.6,
      },
      {
        id: 'lesbica' as LiveSexualOrientation,
        label: 'Lésbica',
        tag: 'Lésbica',
        total: 75 + Math.floor(tickOffset * 0.06),
        users: 65 + Math.floor(tickOffset * 0.05),
        creators: 10,
        percent: 6.0,
      },
      {
        id: 'pan' as LiveSexualOrientation,
        label: 'Pansexual',
        tag: 'Pan',
        total: 40 + Math.floor(tickOffset * 0.03),
        users: 32 + Math.floor(tickOffset * 0.02),
        creators: 8,
        percent: 3.2,
      },
    ],
  };

  // Filter calculation for monitored online users list
  const filteredUsers = onlineUsers.filter((user) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.country.toLowerCase().includes(searchQuery.toLowerCase());

    const matchUserType =
      userTypeFilter === 'todos' ||
      (userTypeFilter === 'criadores' && user.isCreator) ||
      (userTypeFilter === 'usuarios' && !user.isCreator);

    const matchGender = genderFilter === 'todos' || user.gender === genderFilter;
    const matchAge = ageFilter === 'todas' || user.ageBracket === ageFilter;
    const matchOrientation = orientationFilter === 'todas' || user.sexualOrientation === orientationFilter;
    const matchRegion = regionFilter === 'todas' || user.region === regionFilter;
    const matchStatus = statusFilter === 'todos' || user.status === statusFilter;
    const matchPayoutOnly = !filterOnlyWithPayout || (user.isCreator && user.creditsBalance > 0);

    return (
      matchSearch &&
      matchUserType &&
      matchGender &&
      matchAge &&
      matchOrientation &&
      matchRegion &&
      matchStatus &&
      matchPayoutOnly
    );
  });

  const isUsersFilterActive =
    userTypeFilter !== 'todos' ||
    genderFilter !== 'todos' ||
    ageFilter !== 'todas' ||
    orientationFilter !== 'todas' ||
    regionFilter !== 'todas' ||
    statusFilter !== 'todos' ||
    filterOnlyWithPayout ||
    searchQuery !== '';

  const handleResetUserFilters = () => {
    setUserTypeFilter('todos');
    setGenderFilter('todos');
    setAgeFilter('todas');
    setOrientationFilter('todas');
    setRegionFilter('todas');
    setStatusFilter('todos');
    setFilterOnlyWithPayout(false);
    setSearchQuery('');
  };

  // Global totals for regions
  const totalGlobalOnline = regions.reduce((acc, r) => acc + r.totalOnline, 0);
  const totalGlobalRegistered = regions.reduce((acc, r) => acc + r.totalRegistered, 0);

  // 1 crédito = R$ 0,10 líquido para o criador sacar via PIX (70% do valor comercial do crédito)
  const CREDIT_TO_BRL_PAYOUT_RATE = 0.10;

  // Segmentação dos usuários cadastrados na plataforma (88% membros / 12% criadores)
  const totalRegisteredMembers = Math.round(totalGlobalRegistered * 0.88); // ~18.418
  const totalRegisteredCreators = totalGlobalRegistered - totalRegisteredMembers; // ~2.512

  // Total acumulado em Reais (R$) que os criadores ativos vão receber:
  // Considera os criadores ativos no momento (liveEngagementTelemetry.creatorsCount) com média de 870 créditos acumulados
  const activeCreatorsAvgCredits = 870;
  const platformActiveCreatorsPayoutBrl = liveEngagementTelemetry.creatorsCount * activeCreatorsAvgCredits * CREDIT_TO_BRL_PAYOUT_RATE;

  // Valor a receber dos criadores monitorados na lista amostral
  const monitoredCreatorsPayoutBrl = onlineUsers
    .filter((u) => u.isCreator)
    .reduce((sum, u) => sum + u.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE, 0);

  // Valor total de saldo em Reais de todos os usuários monitorados na lista
  const monitoredTotalBalanceBrl = onlineUsers.reduce(
    (sum, u) => sum + u.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE,
    0
  );

  const handlePayUserPix = (userId: string, userName: string, amountBrl: number) => {
    setPaidUsersMap((prev) => ({
      ...prev,
      [userId]: { time: 'Agora', amountBrl },
    }));
    setPayoutSuccessToast(`PIX de R$ ${amountBrl.toFixed(2).replace('.', ',')} enviado com sucesso para ${userName}!`);
    setTimeout(() => {
      setPayoutSuccessToast(null);
    }, 3500);
  };

  const handlePayAllActivePix = () => {
    const newPaid: Record<string, { time: string; amountBrl: number }> = { ...paidUsersMap };
    onlineUsers.filter((u) => u.isCreator).forEach((u) => {
      newPaid[u.id] = { time: 'Agora', amountBrl: u.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE };
    });
    setPaidUsersMap(newPaid);
    setPayoutSuccessToast(
      `Lote PIX de R$ ${platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')} autorizado para os ${liveEngagementTelemetry.creatorsCount} criadores ativos na plataforma!`
    );
    setTimeout(() => {
      setPayoutSuccessToast(null);
    }, 4500);
  };

  const BRAZILIAN_BANKS = [
    'Nubank (Nu Pagamentos S.A.)',
    'Banco Inter S.A.',
    'Itaú Unibanco S.A.',
    'Banco Bradesco S.A.',
    'Banco do Brasil S.A.',
    'Santander Brasil S.A.',
    'Caixa Econômica Federal',
    'C6 Bank S.A.',
    'Mercado Pago (Instituição de Pagamento)',
    'PicPay Instituição de Pagamento',
    'PagBank / PagSeguro',
    'BTG Pactual',
    'Banco Original',
    'Outro Banco / Fintech',
  ];

  // Open Edit / Insert PIX Key for account
  const handleOpenEditPix = (user: OnlineUserAdmin) => {
    setEditingPixUser(user);
    setEditPixKeyType(user.pixDetails?.pixKeyType || (user.isCreator ? 'email' : 'cpf'));
    setEditPixKey(
      user.pixDetails?.pixKey ||
        (user.isCreator ? `${user.name.toLowerCase().replace(/[^a-z]/g, '')}@jhobs.vip` : '')
    );
    setEditBankName(user.pixDetails?.bankName || 'Nubank (Nu Pagamentos S.A.)');
    setEditAccountHolder(user.pixDetails?.accountHolder || user.name);
    setEditCpfCnpj(user.pixDetails?.cpfCnpjMasked || '***.419.208-**');
  };

  // Save PIX Key to account
  const handleSavePixKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPixUser || !editPixKey.trim()) return;

    const updatedPixDetails: PixAccountDetails = {
      pixKey: editPixKey.trim(),
      pixKeyType: editPixKeyType,
      bankName: editBankName,
      accountHolder: editAccountHolder.trim() || editingPixUser.name,
      isAccountVerified: true,
      cpfCnpjMasked: editCpfCnpj.trim() || '***.000.000-**',
    };

    setOnlineUsers((prev) =>
      prev.map((u) => (u.id === editingPixUser.id ? { ...u, pixDetails: updatedPixDetails } : u))
    );

    setPayoutSuccessToast(
      `Chave PIX da conta devidamente cadastrada para ${editingPixUser.name} salva com sucesso!`
    );
    setEditingPixUser(null);
    setTimeout(() => setPayoutSuccessToast(null), 3500);
  };

  // Open PIX Transfer dialog for specific user
  const handleOpenTransferPix = (user: OnlineUserAdmin) => {
    if (!user.pixDetails || !user.pixDetails.pixKey) {
      handleOpenEditPix(user);
      return;
    }
    const defaultAmount = user.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE;
    setTransferringUser(user);
    setTransferAmountBrl(defaultAmount > 0 ? Number(defaultAmount.toFixed(2)) : 50);
  };

  // Execute transfer from modal
  const handleExecuteAdminTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringUser || transferAmountBrl <= 0) return;

    const pix = transferringUser.pixDetails;
    if (!pix) return;

    setIsExecutingTransfer(true);
    setTransferProgressStep('Conectando ao SPI / Banco Central do Brasil...');

    setTimeout(() => {
      setTransferProgressStep(`Validando chave PIX no ${pix.bankName}...`);
      setTimeout(() => {
        setTransferProgressStep('Liquidando transferência na conta devidamente cadastrada...');
        setTimeout(() => {
          setIsExecutingTransfer(false);
          setTransferProgressStep('');

          const e2eId = `E00416968${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(
            1000000000 + Math.random() * 9000000000
          )}`;
          const creditsDeducted = Math.round(transferAmountBrl / CREDIT_TO_BRL_PAYOUT_RATE);

          const record: AdminPixTransferRecord = {
            id: `ADM-PIX-${Date.now().toString().slice(-6)}`,
            userId: transferringUser.id,
            userName: transferringUser.name,
            amountBrl: transferAmountBrl,
            creditsDeducted,
            pixKey: pix.pixKey,
            pixKeyType: pix.pixKeyType,
            bankName: pix.bankName,
            accountHolder: pix.accountHolder,
            timestamp: new Date().toLocaleString('pt-BR'),
            endToEndId: e2eId,
            status: 'concluido',
          };

          // Mark user as paid
          setPaidUsersMap((prev) => ({
            ...prev,
            [transferringUser.id]: { time: 'Agora', amountBrl: transferAmountBrl },
          }));

          setAdminPixTransfersHistory((prev) => [record, ...prev]);
          setTransferringUser(null);
          setAdminReceipt(record);

          setPayoutSuccessToast(
            `Transferência PIX de R$ ${transferAmountBrl.toFixed(2).replace('.', ',')} liquidada com sucesso para ${transferringUser.name} no ${pix.bankName}!`
          );
          setTimeout(() => setPayoutSuccessToast(null), 4000);
        }, 700);
      }, 600);
    }, 600);
  };

  // Execute manual transfer to any account
  const handleExecuteManualTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPixKey.trim() || manualAmountBrl <= 0) return;

    const targetUser = onlineUsers.find((u) => u.id === manualSelectedUserId);
    const targetName = targetUser ? targetUser.name : manualHolderName || 'Conta Cadastrada';

    setIsExecutingTransfer(true);
    setTransferProgressStep('Consultando Diretório de Identificadores (DICT / Bacen)...');

    setTimeout(() => {
      setTransferProgressStep(`Enviando ordem de liquidação para ${manualBankName}...`);
      setTimeout(() => {
        setIsExecutingTransfer(false);
        setTransferProgressStep('');

        const e2eId = `E00416968${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(
          1000000000 + Math.random() * 9000000000
        )}`;
        const record: AdminPixTransferRecord = {
          id: `ADM-PIX-${Date.now().toString().slice(-6)}`,
          userId: targetUser ? targetUser.id : `ext_${Date.now()}`,
          userName: targetName,
          amountBrl: manualAmountBrl,
          creditsDeducted: Math.round(manualAmountBrl / CREDIT_TO_BRL_PAYOUT_RATE),
          pixKey: manualPixKey.trim(),
          pixKeyType: manualPixKeyType,
          bankName: manualBankName,
          accountHolder: manualHolderName || targetName,
          timestamp: new Date().toLocaleString('pt-BR'),
          endToEndId: e2eId,
          status: 'concluido',
        };

        if (targetUser) {
          setPaidUsersMap((prev) => ({
            ...prev,
            [targetUser.id]: { time: 'Agora', amountBrl: manualAmountBrl },
          }));
          if (!targetUser.pixDetails) {
            setOnlineUsers((prev) =>
              prev.map((u) =>
                u.id === targetUser.id
                  ? {
                      ...u,
                      pixDetails: {
                        pixKey: manualPixKey.trim(),
                        pixKeyType: manualPixKeyType,
                        bankName: manualBankName,
                        accountHolder: manualHolderName || targetName,
                        isAccountVerified: true,
                      },
                    }
                  : u
              )
            );
          }
        }

        setAdminPixTransfersHistory((prev) => [record, ...prev]);
        setShowManualTransferModal(false);
        setAdminReceipt(record);

        setPayoutSuccessToast(
          `PIX de R$ ${manualAmountBrl.toFixed(2).replace('.', ',')} transferido com sucesso para ${targetName}!`
        );
        setTimeout(() => setPayoutSuccessToast(null), 4000);
      }, 700);
    }, 600);
  };

  // Opção de Saque da Plataforma: Executar Saque de Lucro Administrativo
  const handleExecuteAdminWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminWithdrawAmount <= 0) return;
    if (adminWithdrawAmount > adminAvailableProfit) {
      setPayoutSuccessToast('Saldo insuficiente de lucro disponível para realizar este saque.');
      setTimeout(() => setPayoutSuccessToast(null), 3500);
      return;
    }

    setIsExecutingAdminWithdrawal(true);
    setAdminWithdrawalStep('Autenticando credenciais master de administração Jhobs...');

    setTimeout(() => {
      setAdminWithdrawalStep('Verificando custódia e reservando proventos líquidos da casa...');
      setTimeout(() => {
        setAdminWithdrawalStep('Autorizando ordem de liquidação junto ao Banco Central (Bacen)...');
        setTimeout(() => {
          setIsExecutingAdminWithdrawal(false);
          setAdminWithdrawalStep('');

          const e2eId = `E00416968${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(
            1000000000 + Math.random() * 9000000000
          )}`;
          const newRemaining = Math.max(0, adminAvailableProfit - adminWithdrawAmount);
          const newWithdrawn = adminWithdrawnProfit + adminWithdrawAmount;

          const record: AdminPlatformWithdrawalRecord = {
            id: `WD-JHOBS-${Date.now().toString().slice(-6)}`,
            adminName: 'Administrador Jhobs Master',
            amountBrl: adminWithdrawAmount,
            pixKey: adminWithdrawMethod === 'pix' ? adminPixKey.trim() : undefined,
            pixKeyType: adminWithdrawMethod === 'pix' ? adminPixKeyType : undefined,
            bankName: adminBankName,
            accountHolder: adminHolderName.trim() || 'Jhobs Participações & Tecnologia Ltda',
            cpfCnpjMasked: adminCpfCnpj.trim() || '41.***.***/0001-92',
            paymentMethod: adminWithdrawMethod,
            timestamp: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
            endToEndId: e2eId,
            status: 'concluido',
            netProfitRemainingBrl: newRemaining,
          };

          setAdminWithdrawnProfit(newWithdrawn);
          localStorage.setItem('jhobs_admin_withdrawn_profit', String(newWithdrawn));

          const updatedHistory = [record, ...adminWithdrawals];
          setAdminWithdrawals(updatedHistory);
          localStorage.setItem('jhobs_admin_platform_withdrawals', JSON.stringify(updatedHistory));

          setShowAdminWithdrawalModal(false);
          setAdminWithdrawalReceipt(record);

          setPayoutSuccessToast(
            `Saque de R$ ${adminWithdrawAmount.toFixed(2).replace('.', ',')} de lucro da plataforma transferido com sucesso via ${adminWithdrawMethod.toUpperCase()}!`
          );
          setTimeout(() => setPayoutSuccessToast(null), 4500);
        }, 700);
      }, 600);
    }, 600);
  };

  // Executar Banimento Rigoroso por Presença de Menor de Idade com Transferência Total de Saldo para a Carteira do Jobs
  const handleExecuteBanUnderageUser = (user: OnlineUserAdmin) => {
    const creditsToTransfer = user.creditsBalance;
    const amountBrl = creditsToTransfer * CREDIT_TO_BRL_PAYOUT_RATE;

    // 1. Bloqueia e Bane permanentemente o usuário da plataforma
    setOnlineUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              creditsBalance: 0,
              status: 'banned' as any,
              statusLabel: 'BANIDO: Presença de Menor de 18 Anos',
            }
          : u
      )
    );

    // 2. Transfere todo o saldo confiscado para a carteira da Jhobs
    const newConfiscatedTotal = totalConfiscatedCreditsToJhobs + creditsToTransfer;
    setTotalConfiscatedCreditsToJhobs(newConfiscatedTotal);
    localStorage.setItem('jhobs_confiscated_credits', String(newConfiscatedTotal));

    // 3. Registra no Auto de Infração Legal da Administração
    const infractionRecord = {
      id: `BAN-${Date.now().toString().slice(-6)}`,
      name: user.name,
      city: `${user.city} (${user.countryCode})`,
      ageClaimed: user.age,
      creditsConfiscated: creditsToTransfer,
      date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      ipMasked: '189.44.***.***',
      reason: 'Violação expressa da lei vigente e proibição de menores de 18 anos. Usuário bloqueado e banido; saldo revertido à carteira Jhobs.',
      status: 'bloqueado_e_banido',
    };

    const updatedLog = [infractionRecord, ...bannedUnderageUsers];
    setBannedUnderageUsers(updatedLog);
    localStorage.setItem('jhobs_banned_underage_users', JSON.stringify(updatedLog));

    setUserToBanUnderage(null);

    setPayoutSuccessToast(
      `LEI VIGENTE APLICADA: O usuário ${user.name} foi BLOQUEADO e BANIDO permanentemente! Todos os ${creditsToTransfer} créditos (R$ ${amountBrl.toFixed(2).replace('.', ',')}) foram transferidos para a carteira do Jobs.`
    );
    setTimeout(() => setPayoutSuccessToast(null), 5500);
  };

  // Módulo de Treinamento e Simulação Pré-Lançamento
  const handleRunTrainingSimulation = (type: 'profit_audit' | 'withdrawal_flow' | 'legal_enforcement') => {
    setIsSimulatingTraining(true);
    let logMsg = '';
    if (type === 'profit_audit') {
      logMsg = `[TREINO PRÉ-LANÇAMENTO] Auditoria de Lucros: 30% margem líquida da casa confirmada (R$ ${totalPlatformProfitBrl.toFixed(2).replace('.', ',')} de lucro total sobre R$ ${totalPlatformGrossRevenue.toFixed(2).replace('.', ',')} brutos).`;
    } else if (type === 'withdrawal_flow') {
      logMsg = `[TREINO PRÉ-LANÇAMENTO] Teste de Rota de Saque: Simulação de liquidação PIX instantânea autorizada pelo Bacen. Recibo oficial homologado.`;
    } else {
      logMsg = `[TREINO PRÉ-LANÇAMENTO] Teste de Segurança +18: Simulação de detecção de menor de idade executada com sucesso. Conta teste banida e 500 créditos transferidos para a carteira do Jobs.`;
    }

    setTimeout(() => {
      setIsSimulatingTraining(false);
      setTrainingSimulationLog((prev) => [logMsg, ...prev]);
      setPayoutSuccessToast(logMsg);
      setTimeout(() => setPayoutSuccessToast(null), 4500);
    }, 700);
  };

  // Selected region
  const activeRegion = regions.find((r) => r.regionId === selectedRegionId) || regions[0];

  // Helper to drilldown click from telemetry counter directly into filters
  const handleQuickDrillDown = (type: 'gender' | 'age' | 'orientation' | 'userType', value: any) => {
    if (type === 'gender') setGenderFilter(value);
    if (type === 'age') setAgeFilter(value);
    if (type === 'orientation') setOrientationFilter(value);
    if (type === 'userType') setUserTypeFilter(value);

    // Scroll to users list smoothly
    const listEl = document.getElementById('monitored-users-section');
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Custom tooltips for Recharts
  const RevenueTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0e0e1a]/95 backdrop-blur-md border border-emerald-500/50 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white font-mono">{data.dayLabel} • {data.date}</span>
            {data.growthVsPrevDay !== 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                data.growthVsPrevDay > 0
                  ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/80 border-rose-800/40'
              }`}>
                {data.growthVsPrevDay > 0 ? `+${data.growthVsPrevDay}%` : `${data.growthVsPrevDay}%`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Receita Diária:</span>
            <span className="font-bold font-mono text-emerald-400 text-sm">
              R$ {data.revenueBrl.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Créditos Vendidos:</span>
            <span className="font-mono text-amber-300 font-semibold">{data.creditsSold.toLocaleString('pt-BR')} 💎</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Usuários Ativos (DAU):</span>
            <span className="font-mono text-sky-300 font-semibold">{data.activeUsers}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CreditsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0e0e1a]/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white font-mono">{data.dayLabel} • {data.date}</span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/40">
              {data.avgCreditsSpent} 💎/user
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Média Gasta/Usuário:</span>
            <span className="font-bold font-mono text-amber-400 text-sm">
              {data.avgCreditsSpent} 💎
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total de Créditos Gastos:</span>
            <span className="font-mono text-rose-300 font-semibold">{data.creditsSpent.toLocaleString('pt-BR')} 💎</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Usuários Ativos:</span>
            <span className="font-mono text-sky-300 font-semibold">{data.activeUsers} DAU</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const ComposedTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0e0e1a]/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white font-mono">{data.dayLabel} • {data.date}</span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">
              DAU: {data.activeUsers}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Receita Diária:
            </span>
            <span className="font-bold font-mono text-white">
              R$ {data.revenueBrl.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-amber-400 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Média por Usuário:
            </span>
            <span className="font-bold font-mono text-amber-300">
              {data.avgCreditsSpent} 💎
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Total Gasto no Dia:</span>
            <span className="font-mono text-slate-300">{data.creditsSpent.toLocaleString('pt-BR')} 💎</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const FunnelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0e0e1a]/95 backdrop-blur-md border border-purple-500/50 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[260px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
              {data.name}
            </span>
            <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/40 font-mono">
              Etapa {data.stepNumber} de 5
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Usuários nesta Etapa:</span>
              <span className="font-bold text-white text-sm">
                {data.value.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">% do Topo (Visualização):</span>
              <span className="text-emerald-400 font-bold">{data.percentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Retenção da Etapa Anterior:</span>
              <span className="text-sky-300 font-semibold">{data.conversionRate}%</span>
            </div>
            {data.dropoffCount > 0 && (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-rose-400">
                <span className="font-sans">Abandono / Drop-off:</span>
                <span className="font-bold">
                  -{data.dropoffCount.toLocaleString('pt-BR')} ({data.dropoffRate}%)
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60 font-sans">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  const TipsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0e0e1a]/95 backdrop-blur-md border border-pink-500/50 rounded-2xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[240px] pointer-events-none z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white font-mono">{data.day}</span>
            {data.isPeak && (
              <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40">
                Pico Semanal 🔥
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Volume em Gorjetas:</span>
            <span className="font-bold font-mono text-pink-400 text-sm">
              {data.tipsCredits.toLocaleString('pt-BR')} 💎
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Equivalente em BRL:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              R$ {data.tipsBrl.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total de Mimos Enviados:</span>
            <span className="font-mono text-amber-300 font-semibold">{data.tipsCount} gorjetas</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Top Criador do Dia:</span>
            <span className="font-semibold text-white">{data.topCreator}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#101018] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-800 bg-[#0c0c14] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-950/40 shrink-0">
              <BarChart2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">Painel do Administrador Jhobs</h2>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/50 px-2 py-0.5 rounded-full uppercase">
                  Master 18+
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {liveTotalOnline} Online Agora
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-sky-300 bg-sky-950/60 border border-sky-800/40 px-2.5 py-0.5 rounded-full font-bold">
                  <UserPlus className="w-3 h-3 text-sky-400" />
                  <span>{totalGlobalRegistered.toLocaleString('pt-BR')} Cadastrados</span>
                </span>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer shadow-sm hover:shadow-emerald-900/50"
                  title="Ver folha e extrato de repasse aos criadores ativos em Reais"
                >
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')} a Receber (Ativos)</span>
                  <span className="text-[9px] bg-emerald-500 text-slate-950 px-1 rounded font-black">PIX</span>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-950/90 border border-amber-500/60 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>Lucro Total: R$ {totalPlatformProfitBrl.toFixed(2).replace('.', ',')}</span>
                  <span className="text-[9px] bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 px-1 rounded font-black">30% Líquido</span>
                </div>
                <button
                  onClick={() => setShowAdminWithdrawalModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-slate-950 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 hover:from-amber-300 hover:to-emerald-300 border border-amber-200/80 px-3 py-0.5 rounded-full font-black transition-all cursor-pointer shadow-md hover:shadow-emerald-950/50 hover:scale-105 active:scale-95"
                  title="Opção de Saque: Realizar saque de lucro da plataforma para conta bancária ou PIX"
                >
                  <Wallet className="w-3.5 h-3.5 text-slate-950" />
                  <span>Opção de Saque (R$ {adminAvailableProfit.toFixed(2).replace('.', ',')})</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma com {totalGlobalRegistered.toLocaleString('pt-BR')} contas ({totalRegisteredMembers.toLocaleString('pt-BR')} membros • {totalRegisteredCreators.toLocaleString('pt-BR')} criadores) e repasse ativo de R$ 0,10/💎 via PIX
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('online_users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'online_users'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Online Agora ({liveTotalOnline})</span>
              </button>
              <button
                onClick={() => setActiveTab('regions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'regions'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Regiões do Planeta</span>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Receita & Métricas</span>
              </button>
              <button
                onClick={() => setActiveTab('funnel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'funnel'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow shadow-purple-950/60 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-purple-300" />
                <span>Funil VIP (Recharts)</span>
                <span className="text-[9px] bg-purple-950/90 border border-purple-400/40 text-purple-300 px-1 rounded font-mono font-bold">
                  {funnelData.globalRate}%
                </span>
              </button>
              <button
                onClick={() => setActiveTab('financeiro_plataforma')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'financeiro_plataforma'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 text-white shadow shadow-emerald-950/60 font-black ring-1 ring-emerald-400/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-300" />
                <span>Financeiro & Rankings</span>
                <span className="text-[9px] bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 px-1 rounded font-mono font-bold">
                  Novo
                </span>
              </button>
              <button
                onClick={() => setActiveTab('profit_withdrawal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'profit_withdrawal'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 text-white shadow shadow-emerald-950/60 font-black ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
                <span>Lucro & Saque</span>
                <span className="text-[9px] bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  R$ {adminAvailableProfit.toLocaleString('pt-BR')}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('referral_pyramid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'referral_pyramid'
                    ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 text-white shadow shadow-amber-950/60 font-black ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>Pirâmide & Afiliados</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isReferralActive
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-950/90 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {isReferralActive ? 'Ativa' : 'Pausada'}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('compliance_legal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'compliance_legal'
                    ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white shadow shadow-rose-950/60 font-black ring-1 ring-rose-400/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Lei Vigente & +18</span>
                <span className="text-[9px] bg-rose-950/90 border border-rose-500/40 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  Treino Pré-Lançamento
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Executive Summary Bar: Cadastrados, Repasses, Online, Receita & Lucro Total da Plataforma */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 p-4 rounded-3xl bg-gradient-to-r from-[#141424] via-[#10101b] to-[#171220] border border-slate-800 shadow-xl">
            {/* 1. Quantidade de Usuários Cadastrados */}
            <div className="p-3.5 rounded-2xl bg-[#0c0c16] border border-sky-500/25 relative overflow-hidden group">
              <div className="flex items-center justify-between text-sky-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                  Cadastrados na Plataforma
                </span>
                <span className="text-[10px] text-sky-300 font-mono font-semibold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/40">
                  Global
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {totalGlobalRegistered.toLocaleString('pt-BR')}
                </span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  +342 hoje
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/70">
                <span className="text-slate-300 font-semibold">{totalRegisteredMembers.toLocaleString('pt-BR')} Membros (88%)</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{totalRegisteredCreators.toLocaleString('pt-BR')} Criadores (12%)</span>
              </div>
            </div>

            {/* 2. Valor a Receber pelos Ativos em Reais */}
            <div
              onClick={() => setShowPayoutModal(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-[#0e1713] to-[#0c0c16] border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer shadow-lg hover:shadow-emerald-950/40 group"
            >
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  A Receber pelos Ativos
                </span>
                <span className="text-[10px] text-emerald-950 font-black bg-emerald-400 px-1.5 py-0.2 rounded shadow">
                  PIX 18+
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 group-hover:text-emerald-200 transition-colors">
                  R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-emerald-950/80">
                <span className="text-emerald-400 font-medium">
                  {liveEngagementTelemetry.creatorsCount} criadores ativos online
                </span>
                <span className="text-[10px] text-amber-300 font-bold group-hover:underline flex items-center gap-0.5">
                  Ver Folha <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* 3. Pessoas Online Agora */}
            <div
              onClick={() => setActiveTab('online_users')}
              className="p-3.5 rounded-2xl bg-[#0c0c16] border border-rose-500/25 hover:border-rose-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-rose-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  Online Agora ao Vivo
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  6,0% DAU
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {liveTotalOnline}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  conectados
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/70">
                <span className="text-indigo-300 font-semibold">{liveEngagementTelemetry.usersCount} Clientes</span>
                <span>•</span>
                <span className="text-rose-300 font-semibold">{liveEngagementTelemetry.creatorsCount} Criadores VIP</span>
              </div>
            </div>

            {/* 4. Receita da Semana Bruta */}
            <div
              onClick={() => setActiveTab('overview')}
              className="p-3.5 rounded-2xl bg-[#0c0c16] border border-amber-500/25 hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Receita Semanal Bruta
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-semibold">
                  +324%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  R$ {totalWeeklyRevenue.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/70">
                <span className="text-slate-300">
                  {totalCreditsSold.toLocaleString('pt-BR')} 💎 vendidos
                </span>
                <span className="text-emerald-400 font-bold">
                  R$ 0,10/💎 repasse
                </span>
              </div>
            </div>

            {/* 5. Lucro Total Obtido da Plataforma & Opção de Saque */}
            <div
              onClick={() => setActiveTab('profit_withdrawal')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/60 via-[#181216] to-[#0c0c16] border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shadow-xl hover:shadow-amber-950/50 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-amber-400 mb-1 relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  Lucro Total da Plataforma
                </span>
                <span className="text-[9px] text-slate-950 font-black bg-gradient-to-r from-amber-400 to-emerald-400 px-1.5 py-0.2 rounded shadow">
                  50% Retido das Compras
                </span>
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 group-hover:text-amber-200 transition-colors">
                  R$ {totalPlatformProfitBrl.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-amber-950/80 relative z-10">
                <span className="text-emerald-400 font-bold font-mono">
                  R$ {adminAvailableProfit.toFixed(2).replace('.', ',')} p/ saque imediato
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdminWithdrawalModal(true);
                  }}
                  className="text-[10px] text-slate-950 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 px-2 py-0.5 rounded-full font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:scale-105"
                  title="Realizar saque de lucro da plataforma"
                >
                  <Wallet className="w-2.5 h-2.5" />
                  <span>Opção de Saque</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB: MÓDULO FINANCEIRO EXECUTIVO & RANKING DE GANHOS      */}
          {/* ========================================================= */}
          {activeTab === 'financeiro_plataforma' && (
            <PlatformFinancialExecutive onOpenWithdrawModal={() => setShowAdminWithdrawalModal(true)} />
          )}

          {/* ========================================================= */}
          {/* TAB 1: PESSOAS ONLINE AO VIVO & MONITOR DE ENGAJAMENTO    */}
          {/* ========================================================= */}
          {activeTab === 'online_users' && (
            <div className="space-y-6">
              {/* REAL-TIME 'ONLINE NOW' ENGAGEMENT TELEMETRY HERO COMPONENT */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#151524] via-[#11111c] to-[#1a1222] border border-amber-500/40 shadow-2xl relative overflow-hidden space-y-5">
                {/* Glow backdrop decorative effect */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Control Header of the Telemetry Monitor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-md shadow-rose-950">
                        <Radio className="w-3 h-3" />
                        <span>Tempo Real • Live Pulse</span>
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white font-display">
                        Monitor de Engajamento: "Online Agora"
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      Contagem instantânea de Usuários vs Criadores dividida por sexo, faixa etária e opção sexual.
                    </p>
                  </div>

                  {/* Telemetry controls: Play/Pause pulse & View mode switch */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsLiveAutoUpdate(!isLiveAutoUpdate)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isLiveAutoUpdate
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={isLiveAutoUpdate ? 'Pausar atualização ao vivo' : 'Retomar atualização ao vivo'}
                    >
                      {isLiveAutoUpdate ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>Ao Vivo (4s)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setLivePulseTick((prev) => prev + 1)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                      title="Forçar atualização instantânea"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro Split KPI Cards: Total Online vs Usuários vs Criadores vs Atividades */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
                  {/* Total Online Now */}
                  <div
                    onClick={() => {
                      setTelemetryViewMode('all');
                      setUserTypeFilter('todos');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      telemetryViewMode === 'all'
                        ? 'bg-gradient-to-br from-slate-900 to-[#19192b] border-amber-400 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-[#12121c] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-amber-400 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Total Online Agora</span>
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                      {liveEngagementTelemetry.totalOnline}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      100% da plataforma ativa
                    </span>
                  </div>

                  {/* Usuários Membros */}
                  <div
                    onClick={() => {
                      setTelemetryViewMode('users');
                      setUserTypeFilter('usuarios');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      telemetryViewMode === 'users'
                        ? 'bg-gradient-to-br from-indigo-950/60 to-[#151528] border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                        : 'bg-[#12121c] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-indigo-400 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Usuários / Membros</span>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {liveEngagementTelemetry.usersCount}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        ({liveEngagementTelemetry.usersPercent}%)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Compradores & visualizadores
                    </span>
                  </div>

                  {/* Criadores VIP */}
                  <div
                    onClick={() => {
                      setTelemetryViewMode('creators');
                      setUserTypeFilter('criadores');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      telemetryViewMode === 'creators'
                        ? 'bg-gradient-to-br from-rose-950/60 to-[#1e1322] border-rose-500 shadow-md ring-1 ring-rose-500/40'
                        : 'bg-[#12121c] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-rose-400 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Criadores VIP</span>
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {liveEngagementTelemetry.creatorsCount}
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-300">
                        ({liveEngagementTelemetry.creatorsPercent}%)
                      </span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-rose-950/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-300">A Receber (PIX):</span>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Atividades ao Vivo */}
                  <div
                    onClick={() => setTelemetryViewMode('split')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      telemetryViewMode === 'split'
                        ? 'bg-gradient-to-br from-emerald-950/60 to-[#121c18] border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-[#12121c] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-emerald-400 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Modo Comparativo</span>
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {liveEngagementTelemetry.activeStreamsCount} Lives Ao Vivo
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-1 font-mono">
                      {liveEngagementTelemetry.inPrivateChatCount} conversas VIP em andamento
                    </span>
                  </div>
                </div>

                {/* Sub-selector for Demographic Segment View (Todos, Sexo, Idade, Opção Sexual) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Detalhamento do Engajamento Ativo:
                    </span>
                    <span className="text-[11px] text-amber-400 font-mono font-semibold">
                      {telemetryViewMode === 'creators'
                        ? '(Exibindo Apenas Criadores)'
                        : telemetryViewMode === 'users'
                        ? '(Exibindo Apenas Usuários)'
                        : '(Usuários vs Criadores)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#0b0b14] p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setTelemetryActiveMetric('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        telemetryActiveMetric === 'all'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos os Segmentos
                    </button>
                    <button
                      onClick={() => setTelemetryActiveMetric('gender')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        telemetryActiveMetric === 'gender'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Por Sexo
                    </button>
                    <button
                      onClick={() => setTelemetryActiveMetric('age')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        telemetryActiveMetric === 'age'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Por Idade
                    </button>
                    <button
                      onClick={() => setTelemetryActiveMetric('orientation')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        telemetryActiveMetric === 'orientation'
                          ? 'bg-amber-500 text-slate-950 font-black shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Opção Sexual
                    </button>
                  </div>
                </div>

                {/* THE 3 CORE DEMOGRAPHIC ENGAGEMENT PANELS (SEXO, IDADE, OPÇÃO SEXUAL) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  {/* PANEL 1: GENDER SPLIT (SEXO) */}
                  {(telemetryActiveMetric === 'all' || telemetryActiveMetric === 'gender') && (
                    <div className="p-4 rounded-2xl bg-[#0c0c16] border border-slate-800/80 space-y-3 shadow-md">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-black text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Divisão por Sexo</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {liveEngagementTelemetry.totalOnline} online
                        </span>
                      </div>

                      <div className="space-y-3">
                        {liveEngagementTelemetry.gender.map((item) => {
                          const displayValue =
                            telemetryViewMode === 'creators'
                              ? item.creators
                              : telemetryViewMode === 'users'
                              ? item.users
                              : item.total;

                          const usersShare = Math.round((item.users / item.total) * 100);
                          const creatorsShare = 100 - usersShare;

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleQuickDrillDown('gender', item.id)}
                              className="p-2.5 rounded-xl bg-[#141424] hover:bg-[#1a1a2e] border border-slate-800/60 hover:border-rose-500/50 transition-all cursor-pointer group"
                              title={`Clique para filtrar ${item.label} na lista abaixo`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-white group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
                                  <span>{item.tag}</span>
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <strong className="text-white text-sm">{displayValue}</strong>
                                  <span className="text-[10px] text-slate-400">({item.percent}%)</span>
                                </div>
                              </div>

                              {/* Comparative Visual Split Bar: Users vs Creators */}
                              <div className="space-y-1">
                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                                  {/* Users Portion */}
                                  <div
                                    style={{ width: `${usersShare}%` }}
                                    className="h-full bg-indigo-500 hover:bg-indigo-400 transition-all"
                                    title={`Usuários: ${item.users} (${usersShare}%)`}
                                  />
                                  {/* Creators Portion */}
                                  <div
                                    style={{ width: `${creatorsShare}%` }}
                                    className="h-full bg-rose-500 hover:bg-rose-400 transition-all"
                                    title={`Criadores: ${item.creators} (${creatorsShare}%)`}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                  <span className="text-indigo-300">👤 {item.users} Usuários</span>
                                  <span className="text-rose-300">⭐ {item.creators} Criadores</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PANEL 2: AGE BRACKET SPLIT (IDADE) */}
                  {(telemetryActiveMetric === 'all' || telemetryActiveMetric === 'age') && (
                    <div className="p-4 rounded-2xl bg-[#0c0c16] border border-slate-800/80 space-y-3 shadow-md">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Divisão por Idade (+18)</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {liveEngagementTelemetry.totalOnline} online
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {liveEngagementTelemetry.age.map((item) => {
                          const displayValue =
                            telemetryViewMode === 'creators'
                              ? item.creators
                              : telemetryViewMode === 'users'
                              ? item.users
                              : item.total;

                          const usersShare = Math.round((item.users / item.total) * 100);
                          const creatorsShare = 100 - usersShare;

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleQuickDrillDown('age', item.id)}
                              className="p-2 rounded-xl bg-[#141424] hover:bg-[#1a1a2e] border border-slate-800/60 hover:border-indigo-500/50 transition-all cursor-pointer group"
                              title={`Clique para filtrar faixa ${item.label} na lista abaixo`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <strong className="text-white text-xs">{displayValue}</strong>
                                  <span className="text-[10px] text-slate-400">({item.percent}%)</span>
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                                  <div
                                    style={{ width: `${usersShare}%` }}
                                    className="h-full bg-indigo-500"
                                  />
                                  <div
                                    style={{ width: `${creatorsShare}%` }}
                                    className="h-full bg-rose-500"
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                  <span className="text-indigo-300">👤 {item.users}</span>
                                  <span className="text-rose-300">⭐ {item.creators}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PANEL 3: SEXUAL ORIENTATION SPLIT (OPÇÃO SEXUAL) */}
                  {(telemetryActiveMetric === 'all' || telemetryActiveMetric === 'orientation') && (
                    <div className="p-4 rounded-2xl bg-[#0c0c16] border border-slate-800/80 space-y-3 shadow-md">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                          <span>Opção Sexual</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {liveEngagementTelemetry.totalOnline} online
                        </span>
                      </div>

                      <div className="space-y-2">
                        {liveEngagementTelemetry.orientation.map((item) => {
                          const displayValue =
                            telemetryViewMode === 'creators'
                              ? item.creators
                              : telemetryViewMode === 'users'
                              ? item.users
                              : item.total;

                          const usersShare = Math.round((item.users / item.total) * 100);
                          const creatorsShare = 100 - usersShare;

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleQuickDrillDown('orientation', item.id)}
                              className="p-1.5 px-2.5 rounded-xl bg-[#141424] hover:bg-[#1a1a2e] border border-slate-800/60 hover:border-amber-500/50 transition-all cursor-pointer group"
                              title={`Clique para filtrar ${item.label} na lista abaixo`}
                            >
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="font-bold text-white group-hover:text-amber-400 transition-colors text-[11px]">
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <strong className="text-white text-xs">{displayValue}</strong>
                                  <span className="text-[9px] text-slate-400">({item.percent}%)</span>
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden flex">
                                  <div
                                    style={{ width: `${usersShare}%` }}
                                    className="h-full bg-indigo-500"
                                  />
                                  <div
                                    style={{ width: `${creatorsShare}%` }}
                                    className="h-full bg-amber-400"
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                  <span className="text-indigo-300">👤 {item.users}</span>
                                  <span className="text-amber-300">⭐ {item.creators}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-Time Live Activity Event Ticker */}
                <div className="p-3 rounded-2xl bg-[#090912] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs relative z-10">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-white">Último Evento da Plataforma:</span>
                    <span className="text-slate-300 italic">
                      {livePulseTick % 4 === 0
                        ? '🔥 Valentina Rossi atingiu 58 espectadores no show íntimo ao vivo'
                        : livePulseTick % 4 === 1
                        ? '💎 Usuário de São Paulo adquiriu pacote VIP de 500 créditos (Stripe)'
                        : livePulseTick % 4 === 2
                        ? '❤️ Isabella Fontes recebeu mimo de 50 créditos no Chat Privado'
                        : '🌎 Novo criador verificado +18 conectou-se de Lisboa, Portugal'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    Agora mesmo • Taxa de conversão: 84%
                  </span>
                </div>
              </div>

              {/* FILTER BAR: SEXO, IDADE, OPÇÃO SEXUAL, REGIÃO E STATUS */}
              <div
                id="monitored-users-section"
                className="p-4 sm:p-5 rounded-2xl bg-[#131320] border border-slate-800 space-y-3.5 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Filtros da Lista de Sessões Monitoradas
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({filteredUsers.length} de {onlineUsers.length} conexões individuais)
                    </span>
                  </div>

                  {/* Search box & reset */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar nome, cidade ou país..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0b0b12] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 w-48 sm:w-60"
                      />
                    </div>

                    {isUsersFilterActive && (
                      <button
                        onClick={handleResetUserFilters}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Limpar Filtros</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Row 0: Tipo de Perfil (Usuários vs Criadores) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-28">
                      Tipo de Perfil:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'todos', label: 'Todos os Conectados' },
                        { id: 'usuarios', label: '👤 Usuários (Clientes)' },
                        { id: 'criadores', label: '⭐ Criadores VIP' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setUserTypeFilter(opt.id as any)}
                          className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                            userTypeFilter === opt.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                              : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}

                      <button
                        onClick={() => setFilterOnlyWithPayout(!filterOnlyWithPayout)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                          filterOnlyWithPayout
                            ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                            : 'bg-[#181826] text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/40'
                        }`}
                      >
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>Apenas com Saldo a Receber ({onlineUsers.filter((u) => u.isCreator && u.creditsBalance > 0).length})</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowManualTransferModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-slate-950" />
                      <span>+ Nova Transferência PIX</span>
                    </button>

                    <button
                      onClick={() => setShowPayoutModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/60 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Folha de Repasse PIX (R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')})</span>
                    </button>
                  </div>
                </div>

                {/* Filter Row 1: Sexo */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-28">
                    Por Sexo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'todos', label: 'Todos os Sexos' },
                      { id: 'mulher', label: 'Mulheres' },
                      { id: 'homem', label: 'Homens' },
                      { id: 'trans', label: 'Trans' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setGenderFilter(opt.id as any)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                          genderFilter === opt.id
                            ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-sm'
                            : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Row 2: Idade (Faixas Etárias) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-28">
                    Por Idade:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'todas', label: 'Todas as Idades (+18)' },
                      { id: '18-24', label: '18 - 24 anos' },
                      { id: '25-34', label: '25 - 34 anos' },
                      { id: '35-44', label: '35 - 44 anos' },
                      { id: '45+', label: '45+ anos' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAgeFilter(opt.id as any)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                          ageFilter === opt.id
                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm'
                            : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Row 3: Opção Sexual */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-28">
                    Opção Sexual:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'todas', label: 'Todas as Opções' },
                      { id: 'hetero', label: 'Heterossexual' },
                      { id: 'bi', label: 'Bissexual' },
                      { id: 'gay', label: 'Gay' },
                      { id: 'lesbica', label: 'Lésbica' },
                      { id: 'pan', label: 'Pansexual' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setOrientationFilter(opt.id as any)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                          orientationFilter === opt.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                            : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Row 4: Região do Planeta */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 w-28">
                    Região Planeta:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'todas', label: 'Todas as Regiões' },
                      { id: 'América Latina', label: '🌎 América Latina' },
                      { id: 'Europa', label: '🌍 Europa' },
                      { id: 'América do Norte', label: '🌎 América do Norte' },
                      { id: 'Ásia & Outros', label: '🌏 Ásia & Outros' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setRegionFilter(opt.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
                          regionFilter === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-sm'
                            : 'bg-[#181826] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Monitored Users Table / Grid */}
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center bg-[#131320] rounded-3xl border border-slate-800 space-y-3">
                  <Users className="w-10 h-10 text-slate-500 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Nenhum usuário online com estes filtros</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tente selecionar outra combinação de sexo, idade ou opção sexual.
                  </p>
                  <button
                    onClick={handleResetUserFilters}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer mx-auto inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3.5 rounded-2xl bg-[#141422] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md"
                      >
                        {/* User identity & photo */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                            />
                            {/* Live indicator or status dot */}
                            {user.status === 'live_streaming' ? (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-[#141422] flex items-center justify-center animate-ping" />
                            ) : (
                              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#141422]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                                {user.name}
                              </h4>
                              <span className="text-[11px] font-mono font-bold text-amber-300">
                                {user.age} anos
                              </span>
                              {user.isCreator ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>Criador VIP</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  Membro
                                </span>
                              )}
                            </div>

                            {/* Tags: Sexo + Opção Sexual + Faixa */}
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/40">
                                {user.genderLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/40">
                                {user.orientationLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800/40">
                                {user.ageBracket}
                              </span>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                              <span>{user.countryFlag}</span>
                              <span className="truncate">
                                {user.city}, {user.country}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500">{user.region}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status details & metrics */}
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.status === 'live_streaming'
                                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                : user.status === 'in_chat'
                                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                                : user.status === 'watching_live'
                                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {user.statusLabel}
                          </span>

                          <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                            <span className="flex items-center gap-0.5">
                              {user.device === 'iOS' || user.device === 'Android' ? (
                                <Smartphone className="w-3 h-3 text-slate-500" />
                              ) : (
                                <Monitor className="w-3 h-3 text-slate-500" />
                              )}
                              <span>{user.device}</span>
                            </span>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">{user.creditsBalance} 💎</span>
                          </div>

                          {user.isCreator ? (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                                <DollarSign className="w-3 h-3" />
                                <span>A Receber: R$ {(user.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}</span>
                              </span>

                              {/* PIX Key & Bank status */}
                              {user.pixDetails?.pixKey ? (
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-300 font-mono flex items-center justify-end gap-1">
                                    <span className="text-emerald-400 font-bold">PIX:</span>
                                    <span className="truncate max-w-[130px]">{user.pixDetails.pixKey}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-500 block">
                                    {user.pixDetails.bankName.split(' ')[0]} • Conta Cadastrada ✅
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-amber-400/90 font-medium">
                                  Chave PIX não informada ⚠️
                                </span>
                              )}

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  onClick={() => handleOpenEditPix(user)}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                                  title="Inserir ou editar a Chave PIX desta conta"
                                >
                                  {user.pixDetails?.pixKey ? 'Editar PIX' : '+ Inserir PIX'}
                                </button>

                                {paidUsersMap[user.id] ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Pago ({paidUsersMap[user.id].time})</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenTransferPix(user)}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-sm"
                                    title="Fazer transferência do valor via PIX para esta conta cadastrada"
                                  >
                                    <Zap className="w-2.5 h-2.5" />
                                    <span>Transferir PIX</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-400 font-mono mt-1 text-right space-y-1">
                              <div>
                                <span>Saldo carteira: </span>
                                <span className="text-slate-300 font-semibold">
                                  R$ {(user.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditPix(user)}
                                  className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                                >
                                  {user.pixDetails?.pixKey ? 'Ver PIX' : '+ Chave PIX'}
                                </button>
                                {user.creditsBalance > 0 && !paidUsersMap[user.id] && (
                                  <button
                                    onClick={() => handleOpenTransferPix(user)}
                                    className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 hover:bg-emerald-700 text-emerald-400 hover:text-white transition-colors cursor-pointer border border-emerald-800/40"
                                  >
                                    Transferir
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Online há {user.onlineSinceMinutes} min
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: REGIÕES DO PLANETA (MAPA E ANÁLISE DEMOGRÁFICA)    */}
          {/* ========================================================= */}
          {activeTab === 'regions' && (
            <div className="space-y-6">
              {/* World Planet Summary Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/40 via-[#151526] to-amber-950/30 border border-sky-500/30 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
                        <Globe2 className="w-4 h-4" />
                      </span>
                      <h3 className="text-lg font-bold text-white font-display">
                        Distribuição Global de Usuários do Jhobs
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Acompanhamento em tempo real de onde os usuários e criadores do Jhobs estão acessando no planeta. Dados agregados e segmentados por sexo, faixa etária e orientação sexual.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="px-4 py-2.5 rounded-2xl bg-[#0e0e18] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Online</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {totalGlobalOnline} ativos
                      </span>
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl bg-[#0e0e18] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cadastrados</span>
                      <span className="text-lg font-mono font-bold text-sky-400">
                        {totalGlobalRegistered.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic Cards per Continent / Region of the Planet */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Selecione uma Região do Planeta:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {regions.map((reg) => {
                    const isSelected = selectedRegionId === reg.regionId;
                    return (
                      <div
                        key={reg.regionId}
                        onClick={() => setSelectedRegionId(reg.regionId)}
                        className={`p-4 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-950/50 via-[#18182a] to-rose-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30'
                            : 'bg-[#12121c] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{reg.flag}</span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {reg.percentageShare}% do Tráfego
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white mb-0.5">{reg.regionName}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {reg.countries.join(', ')}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Online Agora:</span>
                            <strong className="text-emerald-400 font-mono text-sm">{reg.totalOnline}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Cadastrados:</span>
                            <strong className="text-slate-200 font-mono text-xs">{reg.totalRegistered.toLocaleString('pt-BR')}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Region In-Depth Demographics (Sexo, Idade e Opção Sexual) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#141422] border border-amber-500/30 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeRegion.flag}</span>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Detalhamento Demográfico: {activeRegion.regionName}</span>
                        <span className="text-xs font-mono text-amber-400 font-normal">
                          ({activeRegion.percentageShare}% do tráfego mundial)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {activeRegion.countries.join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* Demographic Metric Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#0c0c14] p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setRegionDemographicMetric('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        regionDemographicMetric === 'all'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos os Dados
                    </button>
                    <button
                      onClick={() => setRegionDemographicMetric('gender')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        regionDemographicMetric === 'gender'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Por Sexo
                    </button>
                    <button
                      onClick={() => setRegionDemographicMetric('age')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        regionDemographicMetric === 'age'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Por Idade
                    </button>
                    <button
                      onClick={() => setRegionDemographicMetric('orientation')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        regionDemographicMetric === 'orientation'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Opção Sexual
                    </button>
                  </div>
                </div>

                {/* 3 Pillars of Demographic Breakdown: Sexo, Idade, Opção Sexual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Pillar 1: Por Sexo / Gênero */}
                  {(regionDemographicMetric === 'all' || regionDemographicMetric === 'gender') && (
                    <div className="p-4 rounded-2xl bg-[#0e0e18] border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                        <span>Distribuição por Sexo</span>
                        <span>{activeRegion.totalOnline} pessoas</span>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {/* Mulheres */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">Mulheres</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byGender.mulher} ({Math.round((activeRegion.byGender.mulher / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byGender.mulher / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Homens */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">Homens</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byGender.homem} ({Math.round((activeRegion.byGender.homem / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byGender.homem / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Trans */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">Trans</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byGender.trans} ({Math.round((activeRegion.byGender.trans / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-pink-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byGender.trans / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pillar 2: Por Idade (Faixas Etárias) */}
                  {(regionDemographicMetric === 'all' || regionDemographicMetric === 'age') && (
                    <div className="p-4 rounded-2xl bg-[#0e0e18] border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                        <span>Distribuição por Idade (+18)</span>
                        <span>{activeRegion.totalOnline} pessoas</span>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {/* 18-24 anos */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">18 - 24 anos</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byAge['18-24']} ({Math.round((activeRegion.byAge['18-24'] / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byAge['18-24'] / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* 25-34 anos */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">25 - 34 anos</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byAge['25-34']} ({Math.round((activeRegion.byAge['25-34'] / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byAge['25-34'] / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* 35-44 anos */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">35 - 44 anos</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byAge['35-44']} ({Math.round((activeRegion.byAge['35-44'] / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byAge['35-44'] / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* 45+ anos */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-medium">45+ anos</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byAge['45+']} ({Math.round((activeRegion.byAge['45+'] / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byAge['45+'] / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pillar 3: Por Opção Sexual */}
                  {(regionDemographicMetric === 'all' || regionDemographicMetric === 'orientation') && (
                    <div className="p-4 rounded-2xl bg-[#0e0e18] border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                        <span>Opção / Orientação Sexual</span>
                        <span>{activeRegion.totalOnline} pessoas</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {/* Hetero */}
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-300">Heterossexual</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byOrientation.hetero} ({Math.round((activeRegion.byOrientation.hetero / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byOrientation.hetero / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Bi */}
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-300">Bissexual</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byOrientation.bi} ({Math.round((activeRegion.byOrientation.bi / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byOrientation.bi / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Gay */}
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-300">Gay</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byOrientation.gay} ({Math.round((activeRegion.byOrientation.gay / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byOrientation.gay / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Lésbica */}
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-300">Lésbica</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byOrientation.lesbica} ({Math.round((activeRegion.byOrientation.lesbica / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byOrientation.lesbica / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pan */}
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-300">Pansexual</span>
                            <span className="font-mono text-white font-bold">
                              {activeRegion.byOrientation.pan} ({Math.round((activeRegion.byOrientation.pan / activeRegion.totalOnline) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{
                                width: `${Math.round((activeRegion.byOrientation.pan / activeRegion.totalOnline) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Cities within Region */}
                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Principais Cidades com Pessoas Online em {activeRegion.regionName}:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {activeRegion.topCities.map((city, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#0e0e18] border border-slate-800 text-center"
                      >
                        <span className="text-xs font-semibold text-white block truncate">{city.name}</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          {city.online} pessoas online
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: VISÃO FINANCEIRA, GA4 & EVOLUÇÃO                   */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top KPI Cards (6 cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Total Revenue */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#151522] to-slate-900 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <span className="text-xs font-semibold">Receita Total</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    R$ {totalRevenueBrl.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium mt-1 block">
                    +R$ {todayMetric.revenueBrl.toFixed(2).replace('.', ',')} hoje (Stripe/PIX)
                  </span>
                </div>

                {/* 2. Total Credits Sold */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#151522] to-slate-900 border border-amber-500/30">
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <span className="text-xs font-semibold">Créditos Vendidos</span>
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    {totalCreditsSold.toLocaleString('pt-BR')} 💎
                  </span>
                  <span className="text-[10px] text-amber-300 font-medium mt-1 block">
                    +{todayMetric.creditsSold.toLocaleString('pt-BR')} créditos hoje
                  </span>
                </div>

                {/* 3. Usuários Cadastrados na Plataforma */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 via-[#151522] to-slate-900 border border-sky-500/30">
                  <div className="flex items-center justify-between text-sky-400 mb-1">
                    <span className="text-xs font-semibold">Usuários Cadastrados</span>
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    {totalGlobalRegistered.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-sky-300 font-medium mt-1 block">
                    {totalRegisteredMembers.toLocaleString('pt-BR')} Membros • {totalRegisteredCreators.toLocaleString('pt-BR')} Criadores VIP
                  </span>
                </div>

                {/* 4. Valor a Receber pelos Ativos */}
                <div
                  onClick={() => setShowPayoutModal(true)}
                  className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/40 via-[#151522] to-slate-900 border border-teal-500/30 hover:border-teal-400 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between text-teal-400 mb-1">
                    <span className="text-xs font-semibold">A Receber pelos Ativos</span>
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-teal-300 block group-hover:text-teal-200">
                    R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-teal-400 font-medium mt-1 block flex items-center justify-between">
                    <span>{liveEngagementTelemetry.creatorsCount} criadores ativos online</span>
                    <span className="underline font-bold">Ver folha PIX</span>
                  </span>
                </div>

                {/* 5. Daily Active Users (DAU) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#151522] to-slate-900 border border-indigo-500/30">
                  <div className="flex items-center justify-between text-indigo-400 mb-1">
                    <span className="text-xs font-semibold">Usuários Ativos (Hoje)</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    {todayMetric.activeUsers} DAU
                  </span>
                  <span className="text-[10px] text-indigo-300 font-medium mt-1 block">
                    +18% em relação à média semanal
                  </span>
                </div>

                {/* 6. Daily Pageviews */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-[#151522] to-slate-900 border border-rose-500/30">
                  <div className="flex items-center justify-between text-rose-400 mb-1">
                    <span className="text-xs font-semibold">Visualizações de Página</span>
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-white block">
                    {todayMetric.pageViews.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-rose-300 font-medium mt-1 block">
                    Tráfego orgânico & direto
                  </span>
                </div>

                {/* 7. Banner & Destaque do Funil de Conversão VIP com Recharts */}
                <div
                  onClick={() => setActiveTab('funnel')}
                  className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#18112c] to-pink-950/60 border border-purple-500/50 hover:border-purple-400 cursor-pointer transition-all shadow-lg hover:shadow-purple-950/50 group col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Funil de Conversão VIP (Recharts)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </span>
                        <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/40">
                          {funnelData.globalRate}% Conversão Final
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        De cada 100 usuários que visitam um perfil VIP, {Math.round(funnelData.globalRate)} concluem o desbloqueio de mídias (+18). Total de {funnelData.totalUnlocks.toLocaleString('pt-BR')} desbloqueios gerando R$ {funnelData.totalRevenueBrl.toFixed(2).replace('.', ',')}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-purple-300 group-hover:text-white flex items-center gap-1 transition-colors">
                      <span>Ver Análise Completa do Funil</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Analytics Integration Configuration */}
              <div className="p-5 rounded-2xl bg-[#141422] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Google Analytics 4 (GA4) Conectado</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </h3>
                      <p className="text-xs text-slate-400">
                        O script gtag.js está ativo e enviando eventos de navegação, cliques, visualizações de lives e compras.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSendTestEvent}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testSent ? 'animate-spin' : ''}`} />
                    <span>{testSent ? 'Evento Enviado!' : 'Disparar Ping de Teste GA'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveGaId} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      ID de Medição do Google Analytics (Measurement ID)
                    </label>
                    <input
                      type="text"
                      placeholder="G-XXXXXXXXXX"
                      value={gaId}
                      onChange={(e) => setGaId(e.target.value)}
                      className="w-full bg-[#0e0e18] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:self-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-950"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar ID de Medição</span>
                    </button>
                  </div>
                </form>

                {savedSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-semibold text-center">
                    ID do Google Analytics atualizado e script reiniciado com sucesso!
                  </div>
                )}
              </div>

              {/* Daily Traffic & Revenue Historical Chart with Recharts */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#131322] via-[#0f0f1a] to-[#161224] border border-emerald-500/30 shadow-2xl space-y-6">
                {/* Header & View Mode Switcher */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span>Recharts Analytics</span>
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white font-display">
                        Crescimento da Receita Diária & Média de Créditos Gastos
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      Visualização interativa da receita em BRL (R$) e do consumo médio de créditos pelos usuários ao longo da semana.
                    </p>
                  </div>

                  {/* Mode Buttons */}
                  <div className="flex flex-wrap items-center bg-[#0a0a12] border border-slate-800 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setChartViewMode('both')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartViewMode === 'both'
                          ? 'bg-slate-700 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Lado a Lado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewMode('revenue')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartViewMode === 'revenue'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Receita (BRL)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewMode('credits')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartViewMode === 'credits'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Média de Créditos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewMode('composed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        chartViewMode === 'composed'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Duplo Eixo</span>
                    </button>
                  </div>
                </div>

                {/* 4 Summary Trend Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#0b0b14] border border-emerald-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Crescimento Semanal</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold font-mono text-emerald-400 block">
                      +{weeklyRevenueGrowthTotalPct}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      De R$ {firstDayRevenue.toFixed(2)} para R$ {lastDayRevenue.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0b0b14] border border-amber-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Média Geral Gasta</span>
                      <Coins className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xl font-bold font-mono text-amber-300 block">
                      {weeklyAvgCreditsPerUser} 💎
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Por usuário ativo / dia na semana
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0b0b14] border border-sky-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Pico de Receita</span>
                      <DollarSign className="w-4 h-4 text-sky-400" />
                    </div>
                    <span className="text-xl font-bold font-mono text-sky-300 block">
                      R$ {highestRevenueDay.revenueBrl.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Atingido em {highestRevenueDay.dayLabel} ({highestRevenueDay.date})
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0b0b14] border border-rose-500/30">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Pico de Consumo 💎</span>
                      <Flame className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-xl font-bold font-mono text-rose-300 block">
                      {highestCreditsDay.avgCreditsSpent} 💎 / user
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total: {highestCreditsDay.creditsSpent.toLocaleString('pt-BR')} 💎 ({highestCreditsDay.dayLabel})
                    </span>
                  </div>
                </div>

                {/* THE RECHARTS GRAPHS */}
                {/* 1. Both Charts Side-by-Side */}
                {chartViewMode === 'both' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Graph 1: Revenue AreaChart */}
                    <div className="p-4 rounded-2xl bg-[#0b0b14] border border-slate-800/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Crescimento da Receita Diária (em BRL)
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          Total: R$ {totalWeeklyRevenue.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height={256}>
                          <AreaChart data={processedWeeklyMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaRevenueBoth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" vertical={false} />
                            <XAxis
                              dataKey="dayLabel"
                              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                              axisLine={{ stroke: '#334155' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                            />
                            <Tooltip content={<RevenueTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="revenueBrl"
                              name="Receita (BRL)"
                              stroke="#10b981"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#areaRevenueBoth)"
                              dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#064e3b' }}
                              activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span>Seg: R$ {firstDayRevenue.toFixed(2)}</span>
                        <span className="text-emerald-400 font-semibold font-mono">
                          Hoje: R$ {lastDayRevenue.toFixed(2)} (+{weeklyRevenueGrowthTotalPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Graph 2: Avg Credits Spent BarChart */}
                    <div className="p-4 rounded-2xl bg-[#0b0b14] border border-slate-800/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Média de Créditos Gastos pelos Usuários (💎)
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-300">
                          Média: {weeklyAvgCreditsPerUser} 💎/user
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height={256}>
                          <BarChart data={processedWeeklyMetrics} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                              <linearGradient id="barCreditsBoth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                <stop offset="100%" stopColor="#d97706" stopOpacity={0.65} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" vertical={false} />
                            <XAxis
                              dataKey="dayLabel"
                              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                              axisLine={{ stroke: '#334155' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => `${v}💎`}
                            />
                            <Tooltip content={<CreditsTooltip />} />
                            <Bar
                              dataKey="avgCreditsSpent"
                              name="Média de Créditos Gastos"
                              fill="url(#barCreditsBoth)"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={36}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span>Total Gasto na Semana: {totalWeeklyCreditsSpent.toLocaleString('pt-BR')} 💎</span>
                        <span className="text-amber-300 font-semibold font-mono">
                          Pico: {highestCreditsDay.avgCreditsSpent} 💎/user ({highestCreditsDay.dayLabel})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Full-Width Revenue Growth (BRL) Focus */}
                {chartViewMode === 'revenue' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0b14] border border-emerald-500/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>Curva de Crescimento da Receita Diária (R$ BRL)</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Evolução progressiva dos pagamentos recebidos via PIX e Stripe Checkout ao longo da semana.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Receita Acumulada</span>
                        <span className="text-base font-bold font-mono text-emerald-400">
                          R$ {totalWeeklyRevenue.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={processedWeeklyMetrics} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaRevenueFull" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" vertical={false} />
                          <XAxis
                            dataKey="dayLabel"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                          />
                          <Tooltip content={<RevenueTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="revenueBrl"
                            name="Receita Diária (BRL)"
                            stroke="#10b981"
                            strokeWidth={3.5}
                            fillOpacity={1}
                            fill="url(#areaRevenueFull)"
                            dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#064e3b' }}
                            activeDot={{ r: 7, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 3. Full-Width Average Credits Spent Focus */}
                {chartViewMode === 'credits' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0b14] border border-amber-500/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span>Média de Créditos Gastos pelos Usuários ao Longo da Semana</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Consumo médio diário por usuário ativo (desbloqueios de fotos/vídeos íntimos e gorjetas em lives).
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total Gasto na Semana</span>
                        <span className="text-base font-bold font-mono text-amber-300">
                          {totalWeeklyCreditsSpent.toLocaleString('pt-BR')} 💎
                        </span>
                      </div>
                    </div>
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={processedWeeklyMetrics} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barCreditsFull" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                              <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" vertical={false} />
                          <XAxis
                            dataKey="dayLabel"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}💎`}
                          />
                          <Tooltip content={<CreditsTooltip />} />
                          <Bar
                            dataKey="avgCreditsSpent"
                            name="Média de Créditos Gastos"
                            fill="url(#barCreditsFull)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={52}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 4. Dual-Axis ComposedChart (Direct Correlation) */}
                {chartViewMode === 'composed' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0b14] border border-indigo-500/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-indigo-400" />
                          <span>Visão Combinada: Receita Diária (BRL) vs. Média de Créditos Gastos</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Demonstração da correlação direta: o aumento no consumo de créditos por usuário impulsiona a receita financeira em reais.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                          Receita (BRL)
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400 font-semibold font-mono">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          Média Gastos (💎)
                        </span>
                      </div>
                    </div>
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={processedWeeklyMetrics} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                          <defs>
                            <linearGradient id="composedBarRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" vertical={false} />
                          <XAxis
                            dataKey="dayLabel"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fill: '#10b981', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}💎`}
                          />
                          <Tooltip content={<ComposedTooltip />} />
                          <Bar
                            yAxisId="left"
                            dataKey="revenueBrl"
                            name="Receita Diária (R$ BRL)"
                            fill="url(#composedBarRev)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={44}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="avgCreditsSpent"
                            name="Média de Créditos Gastos (💎/usuário)"
                            stroke="#f59e0b"
                            strokeWidth={3.5}
                            dot={{ fill: '#f59e0b', r: 5, stroke: '#78350f', strokeWidth: 2 }}
                            activeDot={{ r: 7, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Detailed 7-day Historical Data Table */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Detalhamento Diário da Semana
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      7 dias analisados
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0b0b14] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="px-3.5 py-2.5">Dia</th>
                          <th className="px-3.5 py-2.5">Receita (BRL)</th>
                          <th className="px-3.5 py-2.5">Crescimento</th>
                          <th className="px-3.5 py-2.5">Média / Usuário</th>
                          <th className="px-3.5 py-2.5">Total Gasto</th>
                          <th className="px-3.5 py-2.5">Créditos Vendidos</th>
                          <th className="px-3.5 py-2.5">Usuários Ativos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {processedWeeklyMetrics.map((day, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-900/60 transition-colors ${
                              idx === processedWeeklyMetrics.length - 1 ? 'bg-emerald-950/20' : ''
                            }`}
                          >
                            <td className="px-3.5 py-2.5 font-bold text-white font-sans flex items-center gap-1.5">
                              <span>{day.dayLabel}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">({day.date.slice(5)})</span>
                              {idx === processedWeeklyMetrics.length - 1 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 font-semibold font-sans">
                                  Hoje
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-emerald-400">
                              R$ {day.revenueBrl.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-3.5 py-2.5">
                              {idx === 0 ? (
                                <span className="text-slate-400">-</span>
                              ) : day.growthVsPrevDay > 0 ? (
                                <span className="text-emerald-400 font-semibold">+{day.growthVsPrevDay}%</span>
                              ) : (
                                <span className="text-rose-400 font-semibold">{day.growthVsPrevDay}%</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-amber-300">
                              {day.avgCreditsSpent} 💎
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-300">
                              {day.creditsSpent.toLocaleString('pt-BR')} 💎
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-400">
                              {day.creditsSold.toLocaleString('pt-BR')} 💎
                            </td>
                            <td className="px-3.5 py-2.5 text-sky-300 font-semibold">
                              {day.activeUsers} DAU
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Purchases & Transactions Ledger */}
              <div className="p-5 rounded-2xl bg-[#141422] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Extrato de Vendas & Pagamentos Recentes</h3>
                  <span className="text-xs text-slate-400">{transactions.length} registros</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {transactions.slice(0, 8).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#0e0e18] border border-slate-800/80 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{tx.description}</span>
                          {tx.paymentGateway === 'stripe' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                              Stripe Elements
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{tx.timestamp}</span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold block ${
                            tx.type === 'purchase' ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          {tx.type === 'purchase' ? `+${tx.amountCredits} 💎` : `-${tx.amountCredits} 💎`}
                        </span>
                        {tx.amountBrl && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            R$ {tx.amountBrl.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: FUNIL DE CONVERSÃO VIP COM RECHARTS                */}
          {/* ========================================================= */}
          {activeTab === 'funnel' && (
            <div className="space-y-6">
              {/* Header do Funil & Controles Interativos */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#161226] via-[#100d1c] to-[#1a132e] border border-purple-500/40 shadow-2xl space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-300 text-[10px] font-black uppercase tracking-wider shadow">
                        <Target className="w-3 h-3 text-purple-400" />
                        <span>Recharts Funnel Engine</span>
                      </span>
                      <h3 className="text-base sm:text-xl font-black text-white font-display">
                        Funil de Conversão: Visualização de Perfil VIP → Desbloqueio
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        {funnelData.globalRate}% de Conversão Global
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-3xl">
                      Monitoramento em tempo real do comportamento dos usuários na plataforma Jhobs: desde o momento em que acessam o perfil de um criador VIP, passam pela visualização de fotos/vídeos trancados (+18 com blur), manifestam intenção de compra, conferem créditos e concluem o desbloqueio.
                    </p>
                  </div>

                  {/* Switcher de Tipo de Gráfico Recharts */}
                  <div className="flex flex-wrap items-center bg-[#0d0a17] border border-purple-900/50 p-1 rounded-xl gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFunnelChartType('funnel')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        funnelChartType === 'funnel'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow shadow-purple-950/50 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Gráfico de Funil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelChartType('bars')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        funnelChartType === 'bars'
                          ? 'bg-indigo-600 text-white shadow font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Barras Horizontais</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelChartType('stages')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        funnelChartType === 'stages'
                          ? 'bg-emerald-600 text-white shadow font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Etapas & Gargalos</span>
                    </button>
                  </div>
                </div>

                {/* Filtros de Segmentação e Período */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Período */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Período:</span>
                    <div className="flex bg-[#0d0a17] border border-purple-900/40 p-0.5 rounded-lg">
                      {[
                        { id: 'today', label: 'Hoje (24h)' },
                        { id: '7days', label: 'Últimos 7 dias' },
                        { id: '30days', label: 'Últimos 30 dias' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setFunnelPeriod(p.id as any)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            funnelPeriod === p.id
                              ? 'bg-purple-600 text-white shadow font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoria de Conteúdo */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Mídia / Conteúdo:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'all', label: 'Todos os Conteúdos VIP' },
                        { id: 'photos', label: 'Fotos Privadas (+18)' },
                        { id: 'videos', label: 'Vídeos Exclusivos VIP' },
                        { id: 'vip_chat', label: 'Mídias no Chat' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setFunnelCategory(cat.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            funnelCategory === cat.id
                              ? 'bg-purple-950 text-purple-200 border-purple-500 font-bold'
                              : 'bg-[#100d1c] text-slate-400 border-purple-900/40 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 Cards de Destaque KPI do Funil */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                  {/* Card 1: Taxa Global de Conversão */}
                  <div className="p-4 rounded-2xl bg-[#0e0b19] border border-purple-500/40 space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
                      <span>Taxa de Conversão Final</span>
                      <Percent className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {funnelData.globalRate}%
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        +5.2% vs Média VIP
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-1 border-t border-purple-900/30">
                      1 a cada 4 visitantes conclui o desbloqueio
                    </span>
                  </div>

                  {/* Card 2: Desbloqueios Concluídos */}
                  <div className="p-4 rounded-2xl bg-[#0e0b19] border border-emerald-500/40 space-y-1">
                    <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                      <span>Desbloqueios Concluídos</span>
                      <Unlock className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                        {funnelData.totalUnlocks.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        de {funnelData.totalViews.toLocaleString('pt-BR')} visitas
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-800">
                      Mídias íntimas VIP liberadas no período
                    </span>
                  </div>

                  {/* Card 3: Receita / Créditos no Funil */}
                  <div className="p-4 rounded-2xl bg-[#0e0b19] border border-amber-500/40 space-y-1">
                    <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                      <span>Receita Gerada no Funil</span>
                      <DollarSign className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                        R$ {funnelData.totalRevenueBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-800 font-mono">
                      {funnelData.totalCredits.toLocaleString('pt-BR')} 💎 consumidos no desbloqueio
                    </span>
                  </div>

                  {/* Card 4: Maior Ponto de Fricção (Drop-off) */}
                  <div className="p-4 rounded-2xl bg-[#0e0b19] border border-rose-500/40 space-y-1">
                    <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
                      <span>Maior Ponto de Fricção</span>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                        -{funnelData.dropoffMaxRate}%
                      </span>
                      <span className="text-[10px] text-rose-300 font-semibold">abandono</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-800 truncate">
                      {funnelData.dropoffMaxStep}
                    </span>
                  </div>
                </div>

                {/* THE RECHARTS FUNNEL / BAR CHART */}
                <div className="p-5 rounded-2xl bg-[#0a0814] border border-purple-900/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        {funnelChartType === 'funnel'
                          ? 'Visualização Recharts: Gráfico de Funil de Conversão (FunnelChart)'
                          : funnelChartType === 'bars'
                          ? 'Visualização Recharts: Gráfico de Barras Horizontais (BarChart Vertical)'
                          : 'Visualização de Fluxo e Queda por Etapa'}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-purple-300 font-semibold">
                      Categoria: {funnelData.categoryLabel}
                    </span>
                  </div>

                  {/* MODE 1: RECHARTS FUNNEL CHART */}
                  {funnelChartType === 'funnel' && (
                    <div className="h-80 w-full pt-2">
                      <ResponsiveContainer width="100%" height={320}>
                        <FunnelChart margin={{ top: 15, right: 80, left: 80, bottom: 15 }}>
                          <Tooltip content={<FunnelTooltip />} />
                          <Funnel
                            dataKey="value"
                            data={funnelData.stages}
                            isAnimationActive
                          >
                            <LabelList
                              position="right"
                              fill="#f8fafc"
                              stroke="none"
                              dataKey="name"
                              className="text-[11px] font-semibold"
                            />
                            {funnelData.stages.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                stroke={entry.stroke}
                                strokeWidth={2}
                              />
                            ))}
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* MODE 2: RECHARTS VERTICAL BAR CHART */}
                  {funnelChartType === 'bars' && (
                    <div className="h-80 w-full pt-2">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          layout="vertical"
                          data={funnelData.stages}
                          margin={{ top: 10, right: 70, left: 30, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1c2134" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                          />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={140}
                          />
                          <Tooltip content={<FunnelTooltip />} />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={36}>
                            <LabelList
                              dataKey="percentageLabel"
                              position="right"
                              fill="#38bdf8"
                              fontSize={11}
                              fontWeight={700}
                            />
                            {funnelData.stages.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* MODE 3: FLOW STAGES VIEW */}
                  {funnelChartType === 'stages' && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                      {funnelData.stages.map((stage, idx) => (
                        <div
                          key={stage.id}
                          className="p-3.5 rounded-2xl bg-[#0f0c1c] border border-slate-800 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                              style={{ backgroundColor: stage.fill }}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/40">
                              {stage.percentage}% do topo
                            </span>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white truncate">{stage.shortName}</h5>
                            <span className="text-lg font-black font-mono text-white block mt-0.5">
                              {stage.value.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-400">usuários</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 space-y-1">
                            {idx > 0 && (
                              <div className="flex justify-between text-sky-300">
                                <span>Retenção anterior:</span>
                                <span className="font-bold">{stage.conversionRate}%</span>
                              </div>
                            )}
                            {stage.dropoffCount > 0 && (
                              <div className="flex justify-between text-rose-400">
                                <span>Abandono:</span>
                                <span className="font-bold">-{stage.dropoffRate}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Legenda explicativa das 5 etapas */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-800/80">
                    {funnelData.stages.map((stg) => (
                      <div key={stg.id} className="text-center p-2 rounded-xl bg-[#0c0916] border border-slate-800/60">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stg.fill }} />
                          <span className="text-[11px] font-bold text-white">{stg.shortName}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-purple-300 block">
                          {stg.value.toLocaleString('pt-BR')} ({stg.percentage}%)
                        </span>
                        <span className="text-[9px] text-slate-400 block truncate mt-0.5" title={stg.description}>
                          {stg.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela de Detalhamento das 5 Etapas do Funil */}
                <div className="pt-2 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Métricas Detalhadas por Etapa do Funil</span>
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0b0816] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="px-3.5 py-2.5">Etapa do Funil</th>
                          <th className="px-3.5 py-2.5">Usuários</th>
                          <th className="px-3.5 py-2.5">% do Topo</th>
                          <th className="px-3.5 py-2.5">Conversão da Etapa</th>
                          <th className="px-3.5 py-2.5">Abandono (Drop-off)</th>
                          <th className="px-3.5 py-2.5">Tempo Médio</th>
                          <th className="px-3.5 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {funnelData.stages.map((stage) => (
                          <tr key={stage.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="px-3.5 py-2.5 font-bold font-sans text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.fill }} />
                              <span>{stage.name}</span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-white">
                              {stage.value.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-3.5 py-2.5 text-purple-300 font-bold">
                              {stage.percentage}%
                            </td>
                            <td className="px-3.5 py-2.5 text-emerald-400 font-semibold">
                              {stage.conversionRate}%
                            </td>
                            <td className="px-3.5 py-2.5">
                              {stage.dropoffCount > 0 ? (
                                <span className="text-rose-400 font-bold">
                                  -{stage.dropoffCount.toLocaleString('pt-BR')} ({stage.dropoffRate}%)
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">Conversão Final ✅</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-400 font-sans">
                              ~{stage.avgTimeSeconds}s
                            </td>
                            <td className="px-3.5 py-2.5">
                              {stage.stepNumber === 5 ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] font-sans font-bold">
                                  Concluído
                                </span>
                              ) : stage.stepNumber === 1 ? (
                                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/50 text-[10px] font-sans font-bold">
                                  Início do Fluxo
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50 text-[10px] font-sans font-bold">
                                  Em Andamento
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Leaderboard: Ranking de Conversão por Criador VIP */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>Eficiência de Conversão por Criador VIP (Visitantes → Desbloqueio)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Criadores com maior percentual de visitantes que realizam o desbloqueio de conteúdo privado.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {creatorConversionRankings.map((creator, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#0d0a17] border border-purple-900/40 hover:border-purple-500/50 transition-all space-y-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-10 h-10 rounded-xl object-cover border border-purple-500/40"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate">{creator.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{creator.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Taxa de Conversão:</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {creator.rate}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>{creator.views.toLocaleString('pt-BR')} visitas</span>
                          <span className="text-amber-300 font-bold">{creator.unlocks.toLocaleString('pt-BR')} unlocks</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full"
                            style={{ width: `${creator.rate * 2.5}%` }}
                          />
                        </div>

                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${creator.badgeColor}`}>
                          {creator.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights de Otimização do Administrador */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#120d22] to-pink-950/30 border border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Recomendações Acionáveis para Aumentar a Conversão do Funil</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#0a0814]/80 border border-purple-900/40 space-y-1">
                      <span className="font-bold text-amber-300 block">1. Reduzir Fricção de Saldo</span>
                      <p className="text-slate-400">
                        {funnelData.dropoffMaxRate}% dos usuários desistem entre a prévia e a compra. Oferecer recarga rápida PIX de 1 clique direto no modal de desbloqueio eleva a taxa para +31%.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0a0814]/80 border border-purple-900/40 space-y-1">
                      <span className="font-bold text-sky-300 block">2. Prévia de Vídeo Inteligente</span>
                      <p className="text-slate-400">
                        Exibir 2 segundos nítidos no início dos vídeos VIP antes do desfoque aumenta a intenção de desbloqueio em até 22% em testes comparativos.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0a0814]/80 border border-purple-900/40 space-y-1">
                      <span className="font-bold text-emerald-300 block">3. Pacote Promocional de Boas-Vindas</span>
                      <p className="text-slate-400">
                        Criadores com bônus de 10 créditos no primeiro desbloqueio possuem conversão média de 34.2% (como Valentina Rossi).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: MÓDULO FINANCEIRO EXECUTIVO E RANKING DE GANHOS     */}
          {/* ========================================================= */}
          {activeTab === 'financeiro_plataforma' && (
            <PlatformFinancialExecutive />
          )}

          {/* ========================================================= */}
          {/* TAB 5: LUCRO TOTAL DA PLATAFORMA & OPÇÃO DE SAQUE MASTER  */}
          {/* ========================================================= */}
          {activeTab === 'profit_withdrawal' && (
            <div className="space-y-6">
              {/* Header Hero Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#161a15] via-[#111612] to-[#1c161f] border border-amber-500/50 shadow-2xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                        <Coins className="w-3 h-3 text-slate-950" />
                        <span>Financeiro Master Jhobs</span>
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white font-display">
                        Ganhos Transparentes & Lucro Total Obtido da Plataforma
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      Demonstrativo transparente e detalhado dos lucros auferidos. O administrador possui controle total sobre os ativos obtidos gerados com facilidade de saque via PIX ou TED.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTab('compliance_legal')}
                      className="px-3.5 py-2.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Ver Normas Legais & Treino</span>
                    </button>
                    <button
                      onClick={() => setShowAdminWithdrawalModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 text-xs font-black transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Wallet className="w-4 h-4 text-slate-950" />
                      <span>Solicitar Saque de Lucro (PIX)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Financial Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Lucro Total Obtido da Plataforma */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 via-[#16121a] to-[#0d0d16] border border-amber-500/50 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      Lucro Total da Plataforma
                    </span>
                    <span className="text-[10px] font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-emerald-400 px-2 py-0.5 rounded-md font-mono">
                      30% Líquido
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 block">
                    R$ {totalPlatformProfitBrl.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Volume bruto movimentado: <strong className="text-slate-200">R$ {totalPlatformGrossRevenue.toFixed(2).replace('.', ',')}</strong>
                  </span>
                </div>

                {/* 2. Saldo Disponível para Saque Imediato */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#0e1713] to-[#0c0c16] border border-emerald-500/50 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      Disponível para Saque
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-700/50">
                      Livre
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block">
                    R$ {adminAvailableProfit.toFixed(2).replace('.', ',')}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Pronto para resgate</span>
                    <button
                      onClick={() => setShowAdminWithdrawalModal(true)}
                      className="text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      Sacar agora <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 3. Lucro Já Sacado */}
                <div className="p-4 rounded-2xl bg-[#12121e] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-sky-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowDownRight className="w-4 h-4 text-sky-400" />
                      Total de Lucro Já Sacado
                    </span>
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/40 font-mono">
                      {adminWithdrawals.length} saques
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                    R$ {adminWithdrawnProfit.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Liquidados para a conta bancária da Jhobs
                  </span>
                </div>

                {/* 4. Taxa de Retenção da Casa */}
                <div className="p-4 rounded-2xl bg-[#12121e] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-teal-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-teal-400" />
                      Margem Comercial Real
                    </span>
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800/40">
                      Auditado
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-teal-300 block">
                    30,0% Líquido
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    70% criadores • 5% taxas de gateway
                  </span>
                </div>
              </div>

              {/* Demonstrativo Transparente das Fontes de Receita e Composição */}
              <div className="p-5 rounded-2xl bg-[#12121d] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Origem Detalhada dos Ganhos & Faturamento Global</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Discriminação transparente de cada canal monetizado na Jhobs 18+
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-800/40">
                    Faturamento Bruto: R$ {totalPlatformGrossRevenue.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* 4 Revenue Channels Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#0d0d18] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                        Pacotes de Créditos
                      </span>
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-1.5 py-0.2 rounded">55.8%</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-white block">R$ 48.240,00</span>
                    <p className="text-[10px] text-slate-400">Recargas de pacotes via PIX e Cartão de Crédito</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0d0d18] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                        Desbloqueios VIP (+18)
                      </span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded">26.0%</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-white block">R$ 22.480,00</span>
                    <p className="text-[10px] text-slate-400">Desbloqueio de fotos e vídeos íntimos no cofre</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0d0d18] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-rose-400" />
                        Transmissões Ao Vivo
                      </span>
                      <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 px-1.5 py-0.2 rounded">13.0%</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-white block">R$ 11.200,00</span>
                    <p className="text-[10px] text-slate-400">Acesso a salas ao vivo e shows íntimos privativos</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0d0d18] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Gorjetas & Mimos
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded">5.2%</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-white block">R$ 4.500,00</span>
                    <p className="text-[10px] text-slate-400">Mimos enviados em chat privado aos criadores</p>
                  </div>
                </div>

                {/* Distribution Bar: 50% Usuários / 50% Plataforma */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 flex-wrap gap-1">
                    <span className="font-semibold text-slate-300">Regra Oficial de Rateio das Compras de Crédito:</span>
                    <span className="text-amber-300 font-bold">50% Saque dos Usuários • 50% Lucro Retido da Plataforma</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex p-0.5 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-l-full"
                      style={{ width: '50%' }}
                      title="Disponível para Saque dos Usuários (50%)"
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full"
                      style={{ width: '50%' }}
                      title="Lucro Obtido pela Plataforma (50%)"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                    <span className="text-emerald-400">R$ {totalUserPurchasesPayoutAvailableBrl.toFixed(2).replace('.', ',')} (50% Usuários p/ Saque PIX)</span>
                    <span className="text-amber-400">R$ {totalPlatformProfitBrl.toFixed(2).replace('.', ',')} (50% Obtido p/ Plataforma Jhobs)</span>
                  </div>
                </div>
              </div>

              {/* Fast In-page Withdrawal Form */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#131713] via-[#0f1410] to-[#14121a] border border-emerald-500/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950/80 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Opção de Saque com Liquidação Imediata (PIX / TED)</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      O administrador tem controle total sobre os ativos gerados: transfira o lucro líquido para qualquer conta bancária ou chave PIX.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40">
                    <span className="text-slate-400">Saldo Disponível:</span>
                    <strong className="text-emerald-300 text-sm font-black">R$ {adminAvailableProfit.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>

                <form onSubmit={handleExecuteAdminWithdrawal} className="space-y-4">
                  {/* Amount Selection */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      1. Valor a Sacar dos Lucros da Plataforma (R$)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                      {[500, 1000, 2500, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          disabled={val > adminAvailableProfit}
                          onClick={() => setAdminWithdrawAmount(val)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border ${
                            adminWithdrawAmount === val
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                          }`}
                        >
                          R$ {val.toLocaleString('pt-BR')}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAdminWithdrawAmount(Number(adminAvailableProfit.toFixed(2)))}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border col-span-2 sm:col-span-1 ${
                          adminWithdrawAmount === Number(adminAvailableProfit.toFixed(2))
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                            : 'bg-amber-950/60 text-amber-300 border-amber-600/40 hover:bg-amber-900/80'
                        }`}
                      >
                        100% Saldo Total
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-emerald-400 font-mono">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        max={adminAvailableProfit}
                        required
                        value={adminWithdrawAmount}
                        onChange={(e) => setAdminWithdrawAmount(Number(e.target.value))}
                        className="w-full bg-[#0a0f0c] border border-emerald-500/40 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black text-white font-mono outline-none focus:border-emerald-400"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      2. Modalidade de Saque
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminWithdrawMethod('pix')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                          adminWithdrawMethod === 'pix'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span>PIX Instantâneo (Bacen 24/7)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminWithdrawMethod('ted')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                          adminWithdrawMethod === 'ted'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Transferência Bancária / TED</span>
                      </button>
                    </div>
                  </div>

                  {/* Method details: PIX vs TED */}
                  {adminWithdrawMethod === 'pix' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#090d0a] border border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Tipo de Chave PIX
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 mb-2">
                          {[
                            { id: 'cnpj', label: 'CNPJ' },
                            { id: 'cpf', label: 'CPF' },
                            { id: 'email', label: 'E-mail' },
                            { id: 'telefone', label: 'Celular' },
                            { id: 'aleatoria', label: 'EVP' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setAdminPixKeyType(t.id as PixKeyType)}
                              className={`py-1.5 text-[11px] font-bold rounded-lg uppercase cursor-pointer border transition-colors ${
                                adminPixKeyType === t.id
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          required
                          value={adminPixKey}
                          onChange={(e) => setAdminPixKey(e.target.value)}
                          className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                          placeholder="Chave PIX da empresa"
                        />
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Banco / Instituição Financeira
                          </label>
                          <select
                            value={adminBankName}
                            onChange={(e) => setAdminBankName(e.target.value)}
                            className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {BRAZILIAN_BANKS.map((b) => (
                              <option key={b} value={b} className="bg-[#12121d] text-white">
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Nome do Titular da Conta
                          </label>
                          <input
                            type="text"
                            required
                            value={adminHolderName}
                            onChange={(e) => setAdminHolderName(e.target.value)}
                            className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                            placeholder="Nome / Razão Social"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#090d0a] border border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Banco de Destino
                        </label>
                        <select
                          value={adminBankName}
                          onChange={(e) => setAdminBankName(e.target.value)}
                          className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {BRAZILIAN_BANKS.map((b) => (
                            <option key={b} value={b} className="bg-[#12121d] text-white">
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Agência & Conta Corrente
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={adminBankAgency}
                            onChange={(e) => setAdminBankAgency(e.target.value)}
                            placeholder="Agência"
                            className="w-1/3 bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={adminBankAccount}
                            onChange={(e) => setAdminBankAccount(e.target.value)}
                            placeholder="Conta com dígito"
                            className="w-2/3 bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Titular & CPF/CNPJ
                        </label>
                        <input
                          type="text"
                          value={adminHolderName}
                          onChange={(e) => setAdminHolderName(e.target.value)}
                          className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                          placeholder="Razão Social ou Titular"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400 font-mono">
                      Taxa administrativa de saque: <strong className="text-emerald-400 font-bold">R$ 0,00 (Isento)</strong> • Liquidação instantânea SPI
                    </span>

                    <button
                      type="submit"
                      disabled={isExecutingAdminWithdrawal || adminWithdrawAmount <= 0 || adminWithdrawAmount > adminAvailableProfit}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-slate-950 font-black text-xs transition-all shadow-xl shadow-emerald-950/60 flex items-center gap-2 cursor-pointer"
                    >
                      {isExecutingAdminWithdrawal ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                          <span>{adminWithdrawalStep || 'Processando Saque...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-slate-950" />
                          <span>Confirmar Saque de R$ {adminWithdrawAmount.toFixed(2).replace('.', ',')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Histórico de Saques de Lucro da Plataforma */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#11111c] space-y-0">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0e0e18]">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Histórico Oficial de Saques de Lucro da Plataforma</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Registro contábil de todas as retiradas efetuadas da custódia Jhobs para o administrador
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                    {adminWithdrawals.length} saques registrados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-[#0c0c16]">
                        <th className="px-4 py-3">Protocolo / ID Bacen</th>
                        <th className="px-4 py-3">Data / Hora</th>
                        <th className="px-4 py-3">Modalidade</th>
                        <th className="px-4 py-3">Destino / Banco</th>
                        <th className="px-4 py-3 text-right">Valor Sacado (R$)</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Comprovante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {adminWithdrawals.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white font-mono text-[11px]">
                            {record.id}
                            <span className="block text-[9px] text-slate-500 font-mono truncate max-w-[150px]">
                              {record.endToEndId}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-sans text-xs">
                            {record.timestamp}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                              <Zap className="w-2.5 h-2.5" />
                              {record.paymentMethod.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans text-xs">
                            <span className="text-white block font-semibold">{record.bankName.split(' ')[0]}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {record.pixKey || record.cpfCnpjMasked}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-300 text-sm">
                            R$ {record.amountBrl.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Liquidado</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            <button
                              onClick={() => setAdminWithdrawalReceipt(record)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                            >
                              Ver Comprovante
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: PROGRAMA DE PIRÂMIDE VIRAL & AFILIADOS (GESTÃO ADMIN) */}
          {/* ========================================================= */}
          {activeTab === 'referral_pyramid' && (
            <div className="space-y-6">
              {/* Master Campaign Toggle Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#171224] via-[#12121e] to-[#1a1428] border-2 border-amber-500/50 shadow-2xl relative overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider font-mono">
                          Controle de Afiliados Multinível
                        </span>
                        {isReferralActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>Campanha Ativa e Distribuindo Recompensas</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>Campanha Pausada pelo Administrador</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-white font-display mt-1">
                        Campanha de Crescimento Viral em Pirâmide
                      </h3>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                        O usuário compartilha seu link exclusivo com amigos. Quando um novo usuário instala e usa o app, o indicador recebe recompensas liberadas imediatamente para saque via PIX (R$ 15 no Nível 1 + 20% das recargas, R$ 5 no Nível 2 + 10%, R$ 2,50 no Nível 3 + 5%). O administrador tem controle para ligar ou pausar a campanha a qualquer momento.
                      </p>
                    </div>
                  </div>

                  {/* Switch Button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isReferralActive;
                        setReferralCampaignActive(next);
                        setIsReferralActive(next);
                      }}
                      className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-xl flex items-center gap-2 cursor-pointer ${
                        isReferralActive
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 ring-2 ring-rose-400/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 ring-2 ring-emerald-400/40'
                      }`}
                    >
                      {isReferralActive ? (
                        <>
                          <Ban className="w-4 h-4" />
                          <span>Pausar Campanha de Pirâmide</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Reativar Campanha de Pirâmide</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isReferralActive ? 'Recompensas ativas para novos usuários' : 'Novas indicações pausadas no app'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Campaign Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-[#12121e] border border-amber-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Novos Usuários Adquiridos</span>
                    <UserPlus className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                    3.842
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                    +24% de crescimento viral orgânico
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#12121e] border border-emerald-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Comissões Pagas via PIX</span>
                    <Coins className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block">
                    R$ 38.650,00
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-1">
                    100% liquidadas diretamente aos indicadores
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#12121e] border border-sky-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Viralidade (K-Factor)</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-sky-300 block">
                    2.14x
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Cada usuário traz em média 2.14 novos membros
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#12121e] border border-purple-500/30">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Taxa de Recarga de Indicados</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-purple-300 block">
                    84.2%
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                    Alta conversão em compras de créditos
                  </span>
                </div>
              </div>

              {/* 3-Tier Distribution Overview */}
              <div className="p-5 rounded-3xl bg-[#12121e] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Divisão e Volume dos 3 Níveis da Pirâmide</span>
                  </h4>
                  <span className="text-xs text-slate-400">Total de 3.842 membros cadastrados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-[#151922] border border-emerald-500/40 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-400">
                      Nível 1 (Convite Direto)
                    </span>
                    <div className="text-xl font-black font-mono text-white">1.480 Pessoas (38.5%)</div>
                    <p className="text-[11px] text-slate-300">
                      R$ 15,00 por instalação + 20% de todas as recargas
                    </p>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block pt-1">
                      R$ 22.200,00 em bônus pagos
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#151524] border border-sky-500/40 space-y-1">
                    <span className="text-[10px] font-black uppercase text-sky-400">
                      Nível 2 (Rede Secundária)
                    </span>
                    <div className="text-xl font-black font-mono text-white">1.540 Pessoas (40.1%)</div>
                    <p className="text-[11px] text-slate-300">
                      R$ 5,00 por novo membro + 10% de comissão de recargas
                    </p>
                    <span className="text-[10px] text-sky-300 font-mono font-bold block pt-1">
                      R$ 11.250,00 em bônus pagos
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#181424] border border-purple-500/40 space-y-1">
                    <span className="text-[10px] font-black uppercase text-purple-400">
                      Nível 3 (Expansão Viral)
                    </span>
                    <div className="text-xl font-black font-mono text-white">822 Pessoas (21.4%)</div>
                    <p className="text-[11px] text-slate-300">
                      R$ 2,50 por novo membro + 5% sobre recargas da base
                    </p>
                    <span className="text-[10px] text-purple-300 font-mono font-bold block pt-1">
                      R$ 5.200,00 em bônus pagos
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Affiliates Ranking */}
              <div className="p-5 rounded-3xl bg-[#12121e] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Top Indicadores / Líderes da Rede Viral
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Ranking de aquisição orgânica</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Indicador</th>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3 text-center">Nível 1 (Diretos)</th>
                        <th className="py-2.5 px-3 text-center">Rede Total</th>
                        <th className="py-2.5 px-3 text-right">Comissões Pagas (PIX)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {[
                        { name: 'Emílio Borges (Você)', code: 'JH-89214', l1: 14, total: 134, paid: 'R$ 647,50', status: 'Ativo' },
                        { name: 'Bruno Siqueira', code: 'JH-41092', l1: 42, total: 310, paid: 'R$ 2.450,00', status: 'Ativo' },
                        { name: 'Juliana Paes', code: 'JH-19284', l1: 38, total: 275, paid: 'R$ 2.120,00', status: 'Ativo' },
                        { name: 'Felipe Antunes', code: 'JH-77401', l1: 29, total: 198, paid: 'R$ 1.640,00', status: 'Ativo' },
                        { name: 'Natália Vasconcelos', code: 'JH-55291', l1: 22, total: 144, paid: 'R$ 1.180,00', status: 'Ativo' },
                      ].map((lead, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-mono">
                              {i + 1}
                            </span>
                            <span>{lead.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{lead.code}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{lead.l1}</td>
                          <td className="py-2.5 px-3 text-center text-slate-200">{lead.total}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-300 font-black">{lead.paid}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: CONFORMIDADE LEGAL, PROTEÇÃO +18 & TREINO          */}
          {/* ========================================================= */}
          {activeTab === 'compliance_legal' && (
            <div className="space-y-6">
              {/* Legal Framework Warning Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-950/90 via-[#200d14] to-[#170e17] border-2 border-rose-500/60 shadow-2xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 shadow-lg">
                    <Scale className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Lei Vigente & Conformidade Internacional
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                        Art. 240/241 ECA • 18 U.S.C. 2257 • GDPR-K
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white font-display">
                      Política Estrita de Tolerância Zero para Menores de 18 Anos
                    </h3>
                    <p className="text-xs text-rose-100 leading-relaxed font-medium">
                      Esta plataforma segue a lei vigente dos países onde o aplicativo é baixado. É expressamente proibido menores de 18 anos fazer uso da plataforma. Em qualquer ocasião que estiver a presença de menores de idade, o usuário, será bloqueado e banido da plataforma e todo o seu saldo será transferido para a carteira do Jobs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-rose-900/60 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-rose-900/50">
                    <span className="text-rose-400 font-bold block mb-0.5">1. Proibição Expressa</span>
                    <p className="text-[11px] text-slate-300">Nenhum menor de 18 anos pode criar conta, navegar ou monetizar.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-rose-900/50">
                    <span className="text-rose-400 font-bold block mb-0.5">2. Bloqueio & Banimento Imediato</span>
                    <p className="text-[11px] text-slate-300">Identificação suspende a conta instantaneamente em nível de IP e dispositivo.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-rose-900/50">
                    <span className="text-rose-400 font-bold block mb-0.5">3. Confisco Total para Carteira Jobs</span>
                    <p className="text-[11px] text-slate-300">100% dos créditos da conta infratora são transferidos para a carteira da Jhobs.</p>
                  </div>
                </div>
              </div>

              {/* Métricas de Proteção & Saldo Confiscado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/50 to-[#120d14] border border-rose-500/40">
                  <div className="flex items-center justify-between text-rose-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Saldo Confiscado p/ Carteira Jobs</span>
                    <Coins className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-2xl font-black font-mono text-rose-300 block">
                    {totalConfiscatedCreditsToJhobs.toLocaleString('pt-BR')} 💎
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold mt-1 block">
                    R$ {(totalConfiscatedCreditsToJhobs * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')} retidos no caixa
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#12121e] border border-slate-800">
                  <div className="flex items-center justify-between text-slate-300 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Contas Bloqueadas & Banidas</span>
                    <Ban className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-2xl font-black font-mono text-white block">
                    {bannedUnderageUsers.length} contas
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Infrações legais de menoridade neutralizadas
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#12121e] border border-slate-800">
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Conformidade Legal</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black font-mono text-emerald-300 block">
                    100% Auditado
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Legislação local de cada país respeitada
                  </span>
                </div>
              </div>

              {/* Módulo de Treinamento e Simulação Pré-Lançamento */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#131224] via-[#10101b] to-[#171424] border border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-950/80 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      <span>Ambiente de Treino & Simulação Pré-Lançamento</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Disponibilização de dados e ferramentas práticas para treino da equipe e do administrador antes do lançamento oficial.
                    </p>
                  </div>

                  <span className="text-[10px] uppercase font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2.5 py-1 rounded-full">
                    Modo Sandbox Homologação
                  </span>
                </div>

                {/* Training Actions Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#0b0a17] border border-indigo-900/50 space-y-2">
                    <span className="text-xs font-bold text-white block">1. Treino de Lucros & Ganhos</span>
                    <p className="text-[11px] text-slate-400">
                      Simule a auditoria de 30% da margem líquida e conciliação dos R$ {totalPlatformGrossRevenue.toFixed(2).replace('.', ',')} brutos.
                    </p>
                    <button
                      onClick={() => handleRunTrainingSimulation('profit_audit')}
                      disabled={isSimulatingTraining}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      Executar Treino de Auditoria
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b0a17] border border-indigo-900/50 space-y-2">
                    <span className="text-xs font-bold text-white block">2. Treino de Rota de Saque</span>
                    <p className="text-[11px] text-slate-400">
                      Simule a liquidação imediata de um saque de teste via PIX no Bacen e geração do recibo oficial.
                    </p>
                    <button
                      onClick={() => handleRunTrainingSimulation('withdrawal_flow')}
                      disabled={isSimulatingTraining}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                    >
                      Simular Saque de Teste
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b0a17] border border-indigo-900/50 space-y-2">
                    <span className="text-xs font-bold text-white block">3. Treino de Banimento +18</span>
                    <p className="text-[11px] text-slate-400">
                      Simule a detecção de presença de menor de idade, bloqueio imediato e confisco de saldo para o Jobs.
                    </p>
                    <button
                      onClick={() => handleRunTrainingSimulation('legal_enforcement')}
                      disabled={isSimulatingTraining}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                    >
                      Simular Banimento + Confisco
                    </button>
                  </div>
                </div>

                {/* Training Log Console */}
                <div className="p-3.5 rounded-xl bg-[#070610] border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Console de Treino Pré-Lançamento:</span>
                  {trainingSimulationLog.map((log, idx) => (
                    <div key={idx} className="text-indigo-300 flex items-start gap-1.5">
                      <span className="text-slate-600">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Central de Aplicação da Lei: Contas Monitoradas & Banimento Imediato */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#11111c]">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0e0e18]">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Scale className="w-4 h-4 text-rose-400" />
                      <span>Painel de Aplicação Legal: Bloqueio, Banimento & Transferência de Saldo</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Caso seja identificada a presença de menor de idade em qualquer cadastro ou transmissão, acione o banimento imediato.
                    </p>
                  </div>
                  <span className="text-xs text-rose-400 font-mono font-bold bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/40">
                    Ação Irreversível de Cumprimento Legal
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-[#0c0c16]">
                        <th className="px-4 py-3">Usuário / Perfil</th>
                        <th className="px-4 py-3">Localização</th>
                        <th className="px-4 py-3">Idade Declarada</th>
                        <th className="px-4 py-3 text-right">Saldo em Créditos</th>
                        <th className="px-4 py-3 text-right">Equivalente em R$</th>
                        <th className="px-4 py-3 text-center">Ação Legal de Cumprimento (+18)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {onlineUsers.slice(0, 8).map((u) => {
                        const amountBrl = u.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE;
                        const isBanned = (u as any).status === 'banned';

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 font-sans">
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                                />
                                <div>
                                  <span className="font-bold text-white block text-xs">{u.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-sans text-xs">
                              {u.city}, {u.country}
                            </td>
                            <td className="px-4 py-3 font-sans">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {u.age} anos
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-amber-300">
                              {u.creditsBalance.toLocaleString('pt-BR')} 💎
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-400">
                              R$ {amountBrl.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-4 py-3 text-center font-sans">
                              {isBanned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  <Ban className="w-3 h-3 text-rose-400" />
                                  <span>Bloqueado & Banido (+18)</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setUserToBanUnderage(u)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-rose-600/90 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-sm"
                                  title="Banir por presença de menor de idade e transferir todo o saldo para a carteira do Jobs"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Banir & Confiscar Saldo p/ Jobs</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela de Autos de Infração Legal (+18) */}
              <div className="rounded-2xl border border-rose-950/60 overflow-hidden bg-[#120e15]">
                <div className="p-4 border-b border-rose-950/80 flex items-center justify-between bg-[#0e0a12]">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Registro Oficial de Autos de Infração (+18) & Saldos Transferidos para o Jobs</span>
                  </h4>
                  <span className="text-xs font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/50">
                    {bannedUnderageUsers.length} infrações executadas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-rose-950/60 text-[11px] font-bold text-slate-400 bg-[#0c0810]">
                        <th className="px-4 py-2.5">Auto de Infração</th>
                        <th className="px-4 py-2.5">Usuário Infrator</th>
                        <th className="px-4 py-2.5">Data / Hora</th>
                        <th className="px-4 py-2.5 text-right">Créditos Transferidos p/ Jobs</th>
                        <th className="px-4 py-2.5">Motivo Legal</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-950/40 font-mono text-[11px]">
                      {bannedUnderageUsers.map((item) => (
                        <tr key={item.id} className="hover:bg-rose-950/20">
                          <td className="px-4 py-3 font-bold text-white">{item.id}</td>
                          <td className="px-4 py-3 text-slate-300 font-sans font-semibold">
                            {item.name} ({item.city || 'BR'})
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-sans">{item.date}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                            +{item.creditsConfiscated} 💎 (R$ {(item.creditsConfiscated * 0.1).toFixed(2).replace('.', ',')})
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-sans max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                              Banido Permanente
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification for PIX Payout */}
      {payoutSuccessToast && (
        <div className="fixed top-5 right-5 z-[120] max-w-md bg-emerald-950/95 border border-emerald-400 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Transferência PIX Confirmada</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-white mt-0.5 font-medium leading-relaxed">
              {payoutSuccessToast}
            </p>
          </div>
          <button
            onClick={() => setPayoutSuccessToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Payout Breakdown Modal / Folha de Pagamento PIX dos Ativos */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#0f0f1a] border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a0a14] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-950/50">
                  <Wallet className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-display">
                      Folha de Repasse PIX aos Criadores Ativos
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase">
                      Ao Vivo
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Cálculo exato dos valores em Reais (R$) a pagar aos perfis ativos que estão monetizando na Jhobs 18+
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPayoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#0e1614] border border-emerald-500/40">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Total a Pagar aos Ativos
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-300">
                    R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {liveEngagementTelemetry.creatorsCount} criadores ativos na rede
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Amostra no Painel
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    R$ {monitoredCreatorsPayoutBrl.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] text-amber-300 block mt-1 font-semibold">
                    {onlineUsers.filter((u) => u.isCreator).length} criadores monitorados
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cadastrados na Plataforma
                  </span>
                  <span className="text-2xl font-black font-mono text-sky-300">
                    {totalGlobalRegistered.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {totalRegisteredCreators.toLocaleString('pt-BR')} criadores totais (12%)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Taxa de Repasse Líquido
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-300">
                    R$ 0,10 / 💎
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-1">
                    70% repasse líquido via PIX
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121c17] to-[#141424] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Processamento de Lote PIX Instantâneo</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h4>
                  <p className="text-xs text-slate-300">
                    Pagamento direto via API Banco Central com envio instantâneo para chaves PIX cadastradas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowManualTransferModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-950" />
                    <span>+ Nova Transferência PIX</span>
                  </button>

                  <button
                    onClick={handlePayAllActivePix}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pagar Todos os Criadores via PIX</span>
                  </button>
                </div>
              </div>

              {/* Detailed Creators Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#11111c]">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0e0e18]">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Criadores Online & Saldo a Receber em Reais
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {onlineUsers.filter((u) => u.isCreator).length} criadores com repasse
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 bg-[#0c0c16]">
                        <th className="px-4 py-3">Criador(a)</th>
                        <th className="px-4 py-3">Segmentação</th>
                        <th className="px-4 py-3">Status Ao Vivo</th>
                        <th className="px-4 py-3 text-right">Saldo em Créditos</th>
                        <th className="px-4 py-3 text-right">Valor a Receber (R$)</th>
                        <th className="px-4 py-3">Chave PIX & Banco</th>
                        <th className="px-4 py-3 text-center">Ação PIX</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {onlineUsers
                        .filter((u) => u.isCreator)
                        .map((creator, idx) => {
                          const amountBrl = creator.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE;
                          const isPaid = !!paidUsersMap[creator.id];
                          const mockPix = `${creator.name.toLowerCase().replace(/[^a-z]/g, '')}@jhobs.vip`;
                          const mockBank = idx % 3 === 0 ? 'Nubank' : idx % 3 === 1 ? 'Banco Inter' : 'Itaú';

                          return (
                            <tr key={creator.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5 font-sans">
                                  <img
                                    src={creator.avatar}
                                    alt={creator.name}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                                  />
                                  <div>
                                    <span className="font-bold text-white block text-xs">{creator.name}</span>
                                    <span className="text-[10px] text-slate-400">{creator.city}, {creator.country}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[10px] font-sans">
                                <span className="text-rose-300 font-semibold">{creator.genderLabel}</span> •{' '}
                                <span className="text-amber-300">{creator.orientationLabel}</span> •{' '}
                                <span className="text-indigo-300">{creator.age} anos</span>
                              </td>
                              <td className="px-4 py-3 font-sans">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                                  {creator.statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-amber-400 font-bold">
                                {creator.creditsBalance.toLocaleString('pt-BR')} 💎
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-black text-emerald-400">
                                R$ {amountBrl.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-4 py-3 font-sans text-[11px]">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div>
                                    <span className="text-slate-200 block font-mono font-semibold">
                                      {creator.pixDetails?.pixKey || mockPix}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                      {creator.pixDetails?.bankName.split(' ')[0] || mockBank} • Chave{' '}
                                      {creator.pixDetails?.pixKeyType ? creator.pixDetails.pixKeyType.toUpperCase() : 'E-MAIL'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleOpenEditPix(creator)}
                                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0"
                                    title="Inserir ou editar chave PIX"
                                  >
                                    Editar PIX
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-sans">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Pago via PIX</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenTransferPix(creator)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-sm"
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>Transferir PIX</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0a0a14] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-mono">
                Total a receber pelos criadores ativos: <strong className="text-emerald-400 font-bold">R$ {platformActiveCreatorsPayoutBrl.toFixed(2).replace('.', ',')}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handlePayAllActivePix}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Liberar Todos os Repasses</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: INSERIR / EDITAR CHAVE PIX DA CONTA CADASTRADA   */}
      {/* ========================================================= */}
      {editingPixUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#12121d] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0d0d16]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-950/40">
                  <Key className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {editingPixUser.pixDetails?.pixKey ? 'Editar Chave PIX da Conta' : 'Inserir Chave PIX da Conta'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastre a chave PIX e banco para transferir o valor desta conta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPixUser(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Preview */}
            <div className="p-4 bg-[#161626] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={editingPixUser.avatar}
                  alt={editingPixUser.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">{editingPixUser.name}</span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold">
                      {editingPixUser.age} anos
                    </span>
                    {editingPixUser.isCreator ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Criador VIP
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Membro
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{editingPixUser.city}, {editingPixUser.country}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Saldo a Receber:</span>
                <span className="text-sm font-black font-mono text-emerald-400">
                  R$ {(editingPixUser.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] text-amber-300 font-mono block">
                  {editingPixUser.creditsBalance} 💎
                </span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePixKey} className="p-5 space-y-4">
              {/* Key Type */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  1. Tipo de Chave PIX
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'cpf', label: 'CPF' },
                    { id: 'cnpj', label: 'CNPJ' },
                    { id: 'email', label: 'E-mail' },
                    { id: 'telefone', label: 'Celular' },
                    { id: 'aleatoria', label: 'Aleatória' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEditPixKeyType(type.id as PixKeyType)}
                      className={`py-2 text-xs font-bold rounded-xl uppercase transition-colors cursor-pointer border ${
                        editPixKeyType === type.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  2. Chave PIX da Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    editPixKeyType === 'cpf'
                      ? '000.000.000-00'
                      : editPixKeyType === 'cnpj'
                      ? '00.000.000/0001-00'
                      : editPixKeyType === 'email'
                      ? 'usuario@jhobs.vip'
                      : editPixKeyType === 'telefone'
                      ? '(11) 99999-9999'
                      : 'Chave Aleatória EVP'
                  }
                  value={editPixKey}
                  onChange={(e) => setEditPixKey(e.target.value)}
                  className="w-full bg-[#0d0d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Bank Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  3. Banco / Instituição Financeira Cadastrada
                </label>
                <select
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full bg-[#0d0d16] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                >
                  {BRAZILIAN_BANKS.map((b) => (
                    <option key={b} value={b} className="bg-[#12121d] text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Holder & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    4. Nome do Titular da Conta
                  </label>
                  <input
                    type="text"
                    required
                    value={editAccountHolder}
                    onChange={(e) => setEditAccountHolder(e.target.value)}
                    className="w-full bg-[#0d0d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="Nome completo do titular"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    5. CPF / CNPJ do Titular
                  </label>
                  <input
                    type="text"
                    value={editCpfCnpj}
                    onChange={(e) => setEditCpfCnpj(e.target.value)}
                    className="w-full bg-[#0d0d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    placeholder="***.000.000-**"
                  />
                </div>
              </div>

              {/* Verified badge note */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-[11px] text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Conta devidamente cadastrada: homologada para receber transferências instantâneas via PIX pelo painel do administrador.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPixUser(null)}
                  className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-slate-950" />
                  <span>Salvar Chave PIX na Conta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CONFIRMAR E EXECUTAR TRANSFERÊNCIA PIX           */}
      {/* ========================================================= */}
      {transferringUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#11161d] border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-emerald-900/40 bg-[#0c1117]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-950/50">
                  <Send className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Transferir Valor via PIX
                  </h3>
                  <p className="text-xs text-slate-400">
                    Executar liquidação instantânea para a conta devidamente cadastrada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferringUser(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Beneficiary Card */}
            <div className="p-4 bg-[#0a0f14] border-b border-emerald-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={transferringUser.avatar}
                    alt={transferringUser.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white text-sm block">{transferringUser.name}</span>
                    <span className="text-[11px] text-slate-400 block">{transferringUser.city}, {transferringUser.country}</span>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase">
                      Conta Devidamente Cadastrada ✅
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block">Saldo Acumulado:</span>
                  <span className="text-base font-black text-emerald-400 block">
                    R$ {(transferringUser.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold">
                    {transferringUser.creditsBalance} 💎
                  </span>
                </div>
              </div>

              {/* PIX Details Box */}
              <div className="p-3 rounded-xl bg-[#141b22] border border-slate-800 text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Chave PIX ({transferringUser.pixDetails?.pixKeyType.toUpperCase()}):</span>
                  <span className="text-emerald-300 font-bold">{transferringUser.pixDetails?.pixKey}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Banco Creditado:</span>
                  <span className="text-white font-sans">{transferringUser.pixDetails?.bankName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Titular da Conta:</span>
                  <span className="text-white font-sans">{transferringUser.pixDetails?.accountHolder}</span>
                </div>
              </div>
            </div>

            {/* Transfer Form */}
            <form onSubmit={handleExecuteAdminTransfer} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Valor a Transferir em Reais (R$)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    SPI / Liquidação Bruta em Tempo Real
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-emerald-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={10000}
                    required
                    value={transferAmountBrl}
                    onChange={(e) => setTransferAmountBrl(Number(e.target.value))}
                    className="w-full bg-[#0a0f14] border border-emerald-500/40 rounded-xl pl-11 pr-4 py-2.5 text-base font-black text-white font-mono outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Quick Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Atalhos:</span>
                  {[25, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTransferAmountBrl(val)}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      R$ {val},00
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setTransferAmountBrl(
                        Number((transferringUser.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2))
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-[10px] text-emerald-300 font-bold hover:bg-emerald-900 transition-colors cursor-pointer ml-auto"
                  >
                    Valor Total (R${' '}
                    {(transferringUser.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')})
                  </button>
                </div>
              </div>

              {/* Debit account origin info */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Conta Debitadora:</span>
                  <span className="text-white font-bold font-mono">JHOBS VIP INTERMEDIACOES LTDA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>CNPJ:</span>
                  <span className="text-slate-300 font-mono">48.912.304/0001-89</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Canal de Liquidação:</span>
                  <span className="text-emerald-400 font-bold">API Banco Central (SPI Instantâneo)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isExecutingTransfer}
                  onClick={() => setTransferringUser(null)}
                  className="w-1/3 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isExecutingTransfer || transferAmountBrl <= 0}
                  className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExecutingTransfer ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>{transferProgressStep || 'Processando transferência PIX...'}</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar Transferência de R$ {transferAmountBrl.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: NOVA TRANSFERÊNCIA PIX MANUAL (QUALQUER CONTA)    */}
      {/* ========================================================= */}
      {showManualTransferModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#12121e] border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0d0d17]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-950/40">
                  <Zap className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Nova Transferência PIX do Administrador
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione uma conta cadastrada ou insira a chave PIX para transferir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualTransferModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleExecuteManualTransfer} className="p-5 space-y-4">
              {/* Select Account */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  1. Selecione a Conta Cadastrada na Plataforma
                </label>
                <select
                  value={manualSelectedUserId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    setManualSelectedUserId(uId);
                    const found = onlineUsers.find((u) => u.id === uId);
                    if (found) {
                      setManualHolderName(found.pixDetails?.accountHolder || found.name);
                      if (found.pixDetails?.pixKey) {
                        setManualPixKey(found.pixDetails.pixKey);
                        setManualPixKeyType(found.pixDetails.pixKeyType);
                        setManualBankName(found.pixDetails.bankName);
                      }
                      const calculatedBrl = found.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE;
                      if (calculatedBrl > 0) {
                        setManualAmountBrl(Number(calculatedBrl.toFixed(2)));
                      }
                    }
                  }}
                  className="w-full bg-[#0d0d17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" className="bg-[#12121e] text-slate-400">
                    -- Escolha um usuário ou criador cadastrado --
                  </option>
                  {onlineUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#12121e] text-white">
                      {u.name} ({u.isCreator ? 'Criador VIP' : 'Membro'}) - Saldo: R${' '}
                      {(u.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIX Key Type */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  2. Tipo de Chave PIX
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'cpf', label: 'CPF' },
                    { id: 'cnpj', label: 'CNPJ' },
                    { id: 'email', label: 'E-mail' },
                    { id: 'telefone', label: 'Celular' },
                    { id: 'aleatoria', label: 'Aleatória' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setManualPixKeyType(type.id as PixKeyType)}
                      className={`py-2 text-xs font-bold rounded-xl uppercase transition-colors cursor-pointer border ${
                        manualPixKeyType === type.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  3. Inserir Chave PIX da Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Digite a chave PIX (CPF, Celular, E-mail ou Aleatória)"
                  value={manualPixKey}
                  onChange={(e) => setManualPixKey(e.target.value)}
                  className="w-full bg-[#0d0d17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Bank & Holder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    4. Banco de Destino
                  </label>
                  <select
                    value={manualBankName}
                    onChange={(e) => setManualBankName(e.target.value)}
                    className="w-full bg-[#0d0d17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {BRAZILIAN_BANKS.map((b) => (
                      <option key={b} value={b} className="bg-[#12121e] text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    5. Nome do Titular
                  </label>
                  <input
                    type="text"
                    required
                    value={manualHolderName}
                    onChange={(e) => setManualHolderName(e.target.value)}
                    className="w-full bg-[#0d0d17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                    placeholder="Nome completo do titular"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  6. Valor a Transferir (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-amber-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={manualAmountBrl}
                    onChange={(e) => setManualAmountBrl(Number(e.target.value))}
                    className="w-full bg-[#0d0d17] border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm font-black text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isExecutingTransfer}
                  onClick={() => setShowManualTransferModal(false)}
                  className="w-1/3 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isExecutingTransfer || !manualPixKey.trim() || manualAmountBrl <= 0}
                  className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExecutingTransfer ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>{transferProgressStep || 'Enviando PIX...'}</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Executar Transferência de R$ {manualAmountBrl.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: COMPROVANTE OFICIAL DE TRANSFERÊNCIA PIX (BACEN) */}
      {/* ========================================================= */}
      {adminReceipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0e1411] border border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-900/50 bg-[#090f0c]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Comprovante de Transferência PIX
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Banco Central do Brasil • SPI Instantâneo
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAdminReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-5 space-y-4">
              <div className="text-center py-2 border-b border-emerald-900/40 space-y-1">
                <span className="text-xs text-slate-400 font-mono block">Valor Transferido</span>
                <span className="text-3xl font-black text-emerald-400 font-mono block">
                  R$ {adminReceipt.amountBrl.toFixed(2).replace('.', ',')}
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase font-mono">
                  Transação Liquidada com Sucesso
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Beneficiário:</span>
                  <span className="text-white font-sans font-bold">{adminReceipt.accountHolder}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Banco Creditado:</span>
                  <span className="text-white font-sans">{adminReceipt.bankName}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Chave PIX ({adminReceipt.pixKeyType.toUpperCase()}):</span>
                  <span className="text-emerald-300 font-bold">{adminReceipt.pixKey}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Data / Hora:</span>
                  <span className="text-slate-300">{adminReceipt.timestamp}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Instituição Pagadora:</span>
                  <span className="text-slate-300 font-sans">Jhobs VIP Intermediações Ltda</span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-sans block">ID Transação E2E (Bacen):</span>
                  <span className="text-[10px] text-emerald-400 break-all">{adminReceipt.endToEndId}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const text = `COMPROVANTE OFICIAL PIX - JHOBS 18+
ID Transação E2E: ${adminReceipt.endToEndId}
Valor: R$ ${adminReceipt.amountBrl.toFixed(2).replace('.', ',')}
Beneficiário: ${adminReceipt.accountHolder}
Banco: ${adminReceipt.bankName}
Chave PIX: ${adminReceipt.pixKey}
Data/Hora: ${adminReceipt.timestamp}
Status: Liquidado com Sucesso`;
                    navigator.clipboard?.writeText?.(text);
                    setAdminReceiptCopied(true);
                    setTimeout(() => setAdminReceiptCopied(false), 2500);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {adminReceiptCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{adminReceiptCopied ? 'Comprovante Copiado!' : 'Copiar Comprovante'}</span>
                </button>

                <button
                  onClick={() => setAdminReceipt(null)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: REALIZAR SAQUE DE LUCRO DA PLATAFORMA (JHOBS 18+) */}
      {/* ========================================================= */}
      {showAdminWithdrawalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#11141a] border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-emerald-900/50 bg-[#0a0f0d]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/60">
                  <Wallet className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white font-display">
                      Opção de Saque: Lucro da Plataforma
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase font-mono">
                      Controle Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    O administrador tem controle total sobre os ativos obtidos gerados (lucro) com liquidação imediata.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminWithdrawalModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profit Overview Banner */}
            <div className="p-4 bg-gradient-to-r from-[#0d1611] via-[#111b15] to-[#15121e] border-b border-emerald-950/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Lucro Total da Plataforma
                </span>
                <span className="text-lg font-black font-mono text-amber-300">
                  R$ {totalPlatformProfitBrl.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Volume Bruto: R$ {totalPlatformGrossRevenue.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                  Disponível para Este Saque
                </span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  R$ {adminAvailableProfit.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] text-emerald-300/80 block mt-0.5 font-mono">
                  Isento de tarifas • BACEN 24/7
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteAdminWithdrawal} className="p-5 space-y-4">
              {/* Valor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    1. Valor a Sacar dos Proventos Líquidos (R$)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Máx: R$ {adminAvailableProfit.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Quick Values */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-2">
                  {[500, 1000, 2500, 5000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={v > adminAvailableProfit}
                      onClick={() => setAdminWithdrawAmount(v)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border ${
                        adminWithdrawAmount === v
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      R$ {v.toLocaleString('pt-BR')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdminWithdrawAmount(Number(adminAvailableProfit.toFixed(2)))}
                    className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border col-span-2 sm:col-span-1 ${
                      adminWithdrawAmount === Number(adminAvailableProfit.toFixed(2))
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                        : 'bg-amber-950/60 text-amber-300 border-amber-600/40 hover:bg-amber-900/80'
                    }`}
                  >
                    100% Saldo Total
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-emerald-400 font-mono">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={adminAvailableProfit}
                    required
                    value={adminWithdrawAmount}
                    onChange={(e) => setAdminWithdrawAmount(Number(e.target.value))}
                    className="w-full bg-[#0a0f0d] border border-emerald-500/40 rounded-xl pl-10 pr-4 py-2.5 text-base font-black text-white font-mono outline-none focus:border-emerald-400"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Modalidade */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  2. Modalidade de Transferência de Lucro
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminWithdrawMethod('pix')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      adminWithdrawMethod === 'pix'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>PIX Instantâneo (Bacen 24/7)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminWithdrawMethod('ted')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                      adminWithdrawMethod === 'ted'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>TED / Transferência Bancária</span>
                  </button>
                </div>
              </div>

              {/* PIX vs TED details */}
              {adminWithdrawMethod === 'pix' ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f0d] border border-slate-800">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Tipo de Chave PIX
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 mb-2">
                      {[
                        { id: 'cnpj', label: 'CNPJ' },
                        { id: 'cpf', label: 'CPF' },
                        { id: 'email', label: 'E-mail' },
                        { id: 'telefone', label: 'Celular' },
                        { id: 'aleatoria', label: 'EVP' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAdminPixKeyType(t.id as PixKeyType)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg uppercase cursor-pointer border transition-colors ${
                            adminPixKeyType === t.id
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required
                      value={adminPixKey}
                      onChange={(e) => setAdminPixKey(e.target.value)}
                      className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                      placeholder="Chave PIX da empresa / titular"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Banco / Instituição
                      </label>
                      <select
                        value={adminBankName}
                        onChange={(e) => setAdminBankName(e.target.value)}
                        className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {BRAZILIAN_BANKS.map((b) => (
                          <option key={b} value={b} className="bg-[#12121d] text-white">
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Titular da Conta / Razão Social
                      </label>
                      <input
                        type="text"
                        required
                        value={adminHolderName}
                        onChange={(e) => setAdminHolderName(e.target.value)}
                        className="w-full bg-[#111713] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Nome do titular"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f0d] border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Banco Destinatário
                      </label>
                      <select
                        value={adminBankName}
                        onChange={(e) => setAdminBankName(e.target.value)}
                        className="w-full bg-[#111713] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {BRAZILIAN_BANKS.map((b) => (
                          <option key={b} value={b} className="bg-[#12121d] text-white">
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Agência & Conta Corrente
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={adminBankAgency}
                          onChange={(e) => setAdminBankAgency(e.target.value)}
                          placeholder="Agência"
                          className="w-1/3 bg-[#111713] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={adminBankAccount}
                          onChange={(e) => setAdminBankAccount(e.target.value)}
                          placeholder="Conta com dígito"
                          className="w-2/3 bg-[#111713] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Titular / Razão Social
                      </label>
                      <input
                        type="text"
                        value={adminHolderName}
                        onChange={(e) => setAdminHolderName(e.target.value)}
                        className="w-full bg-[#111713] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Titular da conta"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Security & Regulatory Note */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Conta Debitadora:</span>
                  <span className="text-white font-bold font-mono">JHOBS VIP INTERMEDIACOES LTDA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Canal de Liquidação:</span>
                  <span className="text-emerald-400 font-bold">API Banco Central (SPI Instantâneo 24/7)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa Administrativa:</span>
                  <span className="text-emerald-300 font-bold">R$ 0,00 (Isento de Tarifas)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isExecutingAdminWithdrawal}
                  onClick={() => setShowAdminWithdrawalModal(false)}
                  className="w-1/3 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isExecutingAdminWithdrawal ||
                    adminWithdrawAmount <= 0 ||
                    adminWithdrawAmount > adminAvailableProfit
                  }
                  className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-slate-950 font-black text-xs transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExecutingAdminWithdrawal ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>{adminWithdrawalStep || 'Processando Saque de Lucro...'}</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" />
                      <span>Executar Saque de R$ {adminWithdrawAmount.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: COMPROVANTE OFICIAL DE SAQUE DE LUCRO (JHOBS 18+)*/}
      {/* ========================================================= */}
      {adminWithdrawalReceipt && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0e1411] border-2 border-emerald-500/70 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-900/50 bg-[#090f0c]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Comprovante Oficial de Saque de Lucro
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Jhobs 18+ • Banco Central do Brasil (SPI)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAdminWithdrawalReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-5 space-y-4">
              <div className="text-center py-2 border-b border-emerald-900/40 space-y-1">
                <span className="text-xs text-slate-400 font-mono block">Valor do Lucro Sacado</span>
                <span className="text-3xl font-black text-emerald-400 font-mono block">
                  R$ {adminWithdrawalReceipt.amountBrl.toFixed(2).replace('.', ',')}
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase font-mono">
                  Saque de Lucro Liquidado com Sucesso
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Beneficiário:</span>
                  <span className="text-white font-sans font-bold">{adminWithdrawalReceipt.accountHolder}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Banco Creditado:</span>
                  <span className="text-white font-sans">{adminWithdrawalReceipt.bankName}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">
                    Destino ({adminWithdrawalReceipt.paymentMethod.toUpperCase()}):
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {adminWithdrawalReceipt.pixKey || adminWithdrawalReceipt.cpfCnpjMasked}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Data / Hora:</span>
                  <span className="text-slate-300">{adminWithdrawalReceipt.timestamp}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Instituição Pagadora:</span>
                  <span className="text-slate-300 font-sans">Jhobs VIP Intermediações Ltda</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Saldo de Lucro Restante na Plataforma:</span>
                  <span className="text-amber-300 font-bold">
                    R$ {adminWithdrawalReceipt.netProfitRemainingBrl.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-sans block">ID Transação E2E (Bacen):</span>
                  <span className="text-[10px] text-emerald-400 break-all">{adminWithdrawalReceipt.endToEndId}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const text = `COMPROVANTE OFICIAL DE SAQUE DE LUCRO - JHOBS 18+
ID Transação E2E: ${adminWithdrawalReceipt.endToEndId}
Valor Sacado: R$ ${adminWithdrawalReceipt.amountBrl.toFixed(2).replace('.', ',')}
Beneficiário: ${adminWithdrawalReceipt.accountHolder}
Banco: ${adminWithdrawalReceipt.bankName}
Destino: ${adminWithdrawalReceipt.pixKey || adminWithdrawalReceipt.cpfCnpjMasked}
Data/Hora: ${adminWithdrawalReceipt.timestamp}
Saldo Restante: R$ ${adminWithdrawalReceipt.netProfitRemainingBrl.toFixed(2).replace('.', ',')}
Status: Liquidado com Sucesso`;
                    navigator.clipboard?.writeText?.(text);
                    setAdminWithdrawalReceiptCopied(true);
                    setTimeout(() => setAdminWithdrawalReceiptCopied(false), 2500);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {adminWithdrawalReceiptCopied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{adminWithdrawalReceiptCopied ? 'Comprovante Copiado!' : 'Copiar Comprovante'}</span>
                </button>

                <button
                  onClick={() => setAdminWithdrawalReceipt(null)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: CONFIRMAÇÃO LEGAL DE BLOQUEIO, BANIMENTO &       */}
      {/* TRANSFERÊNCIA DE SALDO PARA A CARTEIRA DO JOBS (+18)      */}
      {/* ========================================================= */}
      {userToBanUnderage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#140b10] border-2 border-rose-500/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rose-900/60 bg-[#1a0c14]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-600/25 text-rose-400 flex items-center justify-center border border-rose-500/50 shadow-lg">
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display">
                    Aplicação da Lei Vigente & Proteção +18
                  </h3>
                  <p className="text-xs text-rose-300">
                    Ação Irreversível de Bloqueio, Banimento e Confisco de Saldo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToBanUnderage(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legal Policy Warning */}
            <div className="p-4 bg-rose-950/70 border-b border-rose-900/60 text-xs text-rose-100 leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-rose-400 text-[10px] block">
                Lei Vigente dos Países de Download:
              </span>
              <p>
                Esta plataforma segue a lei vigente dos países onde o aplicativo é baixado. É expressamente proibido menores de 18 anos fazer uso da plataforma. Em qualquer ocasião que estiver a presença de menores de idade, o usuário será bloqueado e banido da plataforma e todo o seu saldo será transferido para a carteira do Jobs.
              </p>
            </div>

            {/* User Target Card */}
            <div className="p-4 bg-[#0e070c] border-b border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={userToBanUnderage.avatar}
                  alt={userToBanUnderage.name}
                  className="w-12 h-12 rounded-xl object-cover border border-rose-500/50"
                />
                <div>
                  <span className="font-bold text-white text-sm block">{userToBanUnderage.name}</span>
                  <span className="text-xs text-slate-400 block">
                    {userToBanUnderage.city}, {userToBanUnderage.country}
                  </span>
                  <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    Idade Declarada: {userToBanUnderage.age} anos
                  </span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-rose-400 block uppercase font-bold">Saldo a Confiscar:</span>
                <span className="text-lg font-black text-rose-300 block">
                  {userToBanUnderage.creditsBalance} 💎
                </span>
                <span className="text-xs text-emerald-400 font-bold block">
                  R$ {(userToBanUnderage.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Warning details */}
            <div className="p-4 space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-black/60 border border-rose-900/50 space-y-1">
                <span className="font-bold text-rose-400 block flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-400" />
                  Efeitos Imediatos da Execução:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Bloqueio e banimento permanente do usuário em nível de conta, IP e dispositivo.</li>
                  <li>Transferência integral dos <strong>{userToBanUnderage.creditsBalance} 💎 (R$ {(userToBanUnderage.creditsBalance * CREDIT_TO_BRL_PAYOUT_RATE).toFixed(2).replace('.', ',')})</strong> para a carteira do Jobs.</li>
                  <li>Registro no Auto de Infração Legal da Jhobs com auditoria para fins regulatórios e treino pré-lançamento.</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-rose-900/60 bg-[#12080e] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserToBanUnderage(null)}
                className="w-1/3 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBanUnderageUser(userToBanUnderage)}
                className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 hover:from-rose-500 hover:to-red-700 text-white font-black text-xs transition-all shadow-xl shadow-rose-950/70 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ban className="w-4 h-4 text-white" />
                <span>Confirmar Banimento & Transferir Saldo p/ Jobs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
