import React, { useState, useEffect, useMemo } from 'react';
import { CreatorUpload } from '../types';
import {
  X,
  DollarSign,
  Upload,
  Lock,
  CheckCircle2,
  TrendingUp,
  Eye,
  ArrowDownRight,
  QrCode,
  Sparkles,
  Target,
  Brain,
  Sliders,
  Trophy,
  Award,
  Flame,
  Users,
  Gift,
  AlertCircle,
  RefreshCw,
  Zap,
  PartyPopper,
  ChevronRight,
  Info,
  Check,
  Copy,
  FileText,
  Send,
  History,
  Radio,
  Swords,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { financialLedger } from '../services/ledgerService';
import { liveStreamService } from '../services/liveStreamService';

interface CreatorStudioModalProps {
  onClose: () => void;
  creatorBalanceCredits: number;
  onWithdrawPix: (amountCredits: number, pixKey: string, pixType: string, bankName?: string) => void;
  onPublishMedia: (newMedia: {
    title: string;
    description: string;
    mediaUrl: string;
    priceCredits: number;
  }) => void;
}

export type GoalMode = 'smart' | 'manual';
export type SmartTrend = 'conservative' | 'balanced' | 'aggressive';

export interface ContentUnlockRecord {
  id: string;
  mediaTitle: string;
  mediaType: 'nude' | 'ensaio_vip' | 'video_privado' | 'mimo';
  userName: string;
  userAvatar: string;
  creditsPaid: number;
  earningsBrl: number;
  timestamp: string;
  status: 'liquidado';
}

interface SavedGoalsConfig {
  mode: GoalMode;
  smartTrend: SmartTrend;
  manualCredits: number;
  manualVipUnlocks: number;
  manualRetention: number;
  manualTips: number;
}

const STORAGE_KEY = 'jhobs_creator_goals_config_v2';

export const CreatorStudioModal: React.FC<CreatorStudioModalProps> = ({
  onClose,
  creatorBalanceCredits,
  onWithdrawPix,
  onPublishMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'goals' | 'lives_challenges' | 'upload' | 'withdraw'>('dashboard');

  // Creator Balance & Financial Conversion (1 credit = R$ 0,10 net creator payout)
  const creditValueBrl = 0.10;
  const [localCreatorBalance, setLocalCreatorBalance] = useState<number>(creatorBalanceCredits);

  useEffect(() => {
    setLocalCreatorBalance(creatorBalanceCredits);
  }, [creatorBalanceCredits]);

  const balanceBrl = (localCreatorBalance * creditValueBrl).toFixed(2).replace('.', ',');

  // Goals & Smart targets state
  const [goalMode, setGoalMode] = useState<GoalMode>('smart');
  const [smartTrend, setSmartTrend] = useState<SmartTrend>('balanced');
  const [manualCredits, setManualCredits] = useState<number>(5000);
  const [manualVipUnlocks, setManualVipUnlocks] = useState<number>(40);
  const [manualRetention, setManualRetention] = useState<number>(15);
  const [manualTips, setManualTips] = useState<number>(800);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Integração Dinâmica: Lives e Livro-Razão Contábil
  const [liveSessions, setLiveSessions] = useState(() => liveStreamService.getLiveSessions());
  const [creatorLedgerSummary, setCreatorLedgerSummary] = useState(() =>
    financialLedger.getCreatorBalances('current_user')
  );
  const performanceRules = useMemo(() => liveStreamService.getPerformanceRules(), []);

  useEffect(() => {
    if (activeTab === 'lives_challenges' || activeTab === 'dashboard') {
      setLiveSessions(liveStreamService.getLiveSessions());
      setCreatorLedgerSummary(financialLedger.getCreatorBalances('current_user'));
    }
  }, [activeTab]);

  const totalLiveHours = useMemo(() => {
    return (liveSessions.length * 0.75 + 32).toFixed(1);
  }, [liveSessions]);

  const peakLiveViewers = useMemo(() => {
    const maxViewers = Math.max(...liveSessions.map((s) => s.viewerCount || 0), 0);
    return maxViewers > 0 ? maxViewers : 1890;
  }, [liveSessions]);

  const liveGiftsDiamonds = useMemo(() => {
    const fromTips = creatorLedgerSummary.tipsReceivedCount * 45;
    return fromTips > 0 ? fromTips : 1240;
  }, [creatorLedgerSummary]);

  const liveNetPayoutBrl = useMemo(() => {
    return creatorLedgerSummary.totalEarnedBrl > 0
      ? creatorLedgerSummary.totalEarnedBrl.toFixed(2).replace('.', ',')
      : '86,80';
  }, [creatorLedgerSummary]);

  // Content Unlock Transactions (Nudes & VIP media sold to users)
  const [unlockHistory, setUnlockHistory] = useState<ContentUnlockRecord[]>([
    {
      id: 'unl_01',
      mediaTitle: 'Nude Íntimo no Closet Sensual (+18)',
      mediaType: 'nude',
      userName: 'Rodrigo Siqueira',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      creditsPaid: 75,
      earningsBrl: 7.50,
      timestamp: 'Há 14 min',
      status: 'liquidado',
    },
    {
      id: 'unl_02',
      mediaTitle: 'Ensaio Secreto Espelho & Renda',
      mediaType: 'ensaio_vip',
      userName: 'Matheus Costa',
      userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      creditsPaid: 100,
      earningsBrl: 10.00,
      timestamp: 'Há 48 min',
      status: 'liquidado',
    },
    {
      id: 'unl_03',
      mediaTitle: 'Mimo VIP no Chat Privativo',
      mediaType: 'mimo',
      userName: 'Lucas Prado',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      creditsPaid: 50,
      earningsBrl: 5.00,
      timestamp: 'Há 2 horas',
      status: 'liquidado',
    },
    {
      id: 'unl_04',
      mediaTitle: 'Vídeo Privado Banheira de Espuma (+18)',
      mediaType: 'video_privado',
      userName: 'Gabriel Menezes',
      userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      creditsPaid: 150,
      earningsBrl: 15.00,
      timestamp: 'Ontem às 22:15',
      status: 'liquidado',
    },
  ]);

  // Celebration state
  const [celebrationToast, setCelebrationToast] = useState<{
    title: string;
    description: string;
    type: string;
  } | null>(null);

  // Load saved goals configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedGoalsConfig = JSON.parse(saved);
        if (parsed.mode) setGoalMode(parsed.mode);
        if (parsed.smartTrend) setSmartTrend(parsed.smartTrend);
        if (parsed.manualCredits) setManualCredits(parsed.manualCredits);
        if (parsed.manualVipUnlocks) setManualVipUnlocks(parsed.manualVipUnlocks);
        if (parsed.manualRetention) setManualRetention(parsed.manualRetention);
        if (parsed.manualTips) setManualTips(parsed.manualTips);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save changes to localStorage
  const saveGoalsConfig = (
    mode: GoalMode,
    trend: SmartTrend,
    credits: number,
    unlocks: number,
    retention: number,
    tips: number
  ) => {
    try {
      const config: SavedGoalsConfig = {
        mode,
        smartTrend: trend,
        manualCredits: credits,
        manualVipUnlocks: unlocks,
        manualRetention: retention,
        manualTips: tips,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 2200);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCredits, setPriceCredits] = useState(75);
  const [selectedPresetImage, setSelectedPresetImage] = useState('/src/assets/images/vip_exclusive_glamour_1791856838011.jpg');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Withdraw state
  const [pixType, setPixType] = useState('cpf');
  const [pixKey, setPixKey] = useState('418.902.138-09');
  const [pixBank, setPixBank] = useState('Nubank (Nu Pagamentos S.A.)');
  const [withdrawCredits, setWithdrawCredits] = useState(creatorBalanceCredits > 0 ? creatorBalanceCredits : 100);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [withdrawProgressStep, setWithdrawProgressStep] = useState('');
  const [receiptCopied, setReceiptCopied] = useState(false);
  const [withdrawReceipt, setWithdrawReceipt] = useState<{
    id: string;
    endToEndId: string;
    amountBrl: number;
    creditsDeducted: number;
    pixKey: string;
    pixType: string;
    bank: string;
    date: string;
  } | null>(null);

  // Platform smart trend calculations based on Jhobs overall engagement data
  const smartTrendData: Record<
    SmartTrend,
    {
      title: string;
      label: string;
      trendGrowth: string;
      targetCredits: number;
      targetVipUnlocks: number;
      targetRetention: number;
      targetTips: number;
      description: string;
      badgeColor: string;
    }
  > = {
    conservative: {
      title: 'Crescimento Moderado',
      label: 'Meta Automática: +15%',
      trendGrowth: '+15%',
      targetCredits: 3500,
      targetVipUnlocks: 30,
      targetRetention: 10,
      targetTips: 500,
      description: 'Ideal para novos criadores. Baseada no volume regular de novos visitantes e 1 publicação VIP por semana.',
      badgeColor: 'border-blue-500/40 text-blue-400 bg-blue-950/40',
    },
    balanced: {
      title: 'Tendência Alta Demanda',
      label: 'Recomendada pela Plataforma: +35%',
      trendGrowth: '+35%',
      targetCredits: 5500,
      targetVipUnlocks: 45,
      targetRetention: 15,
      targetTips: 850,
      description: 'Alinhada à média de crescimento da plataforma no mês (+35% no consumo de mídia VIP e gorjetas nos chats).',
      badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-950/40',
    },
    aggressive: {
      title: 'Top Creator / Destaque',
      label: 'Aceleração Máxima: +70%',
      trendGrowth: '+70%',
      targetCredits: 12000,
      targetVipUnlocks: 90,
      targetRetention: 30,
      targetTips: 2000,
      description: 'Projetada para perfis com fotos regulares no cofre e impulsionamento ativo no deck de encontros.',
      badgeColor: 'border-rose-500/40 text-rose-400 bg-rose-950/40',
    },
  };

  // Current creator achievements tracking (simulated real-time stats)
  const currentStats = {
    creditsEarnedThisMonth: Math.max(3400, creatorBalanceCredits + 2100),
    vipUnlocksThisMonth: 28,
    activeFansRetention: 12,
    tipsReceivedThisMonth: 620,
  };

  // Determine active target values
  const activeTargets =
    goalMode === 'smart'
      ? {
          credits: smartTrendData[smartTrend].targetCredits,
          vipUnlocks: smartTrendData[smartTrend].targetVipUnlocks,
          retention: smartTrendData[smartTrend].targetRetention,
          tips: smartTrendData[smartTrend].targetTips,
        }
      : {
          credits: manualCredits,
          vipUnlocks: manualVipUnlocks,
          retention: manualRetention,
          tips: manualTips,
        };

  // Progress percentages
  const creditsProgress = Math.min(100, Math.round((currentStats.creditsEarnedThisMonth / activeTargets.credits) * 100));
  const vipUnlocksProgress = Math.min(100, Math.round((currentStats.vipUnlocksThisMonth / activeTargets.vipUnlocks) * 100));
  const retentionProgress = Math.min(100, Math.round((currentStats.activeFansRetention / activeTargets.retention) * 100));
  const tipsProgress = Math.min(100, Math.round((currentStats.tipsReceivedThisMonth / activeTargets.tips) * 100));

  // Audio effect for celebration
  const playCelebrationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.38);
      });
    } catch {
      // Ignore audio context block
    }
  };

  // Trigger celebration animation and toast
  const fireCelebration = (goalTitle: string, currentVal: number, targetVal: number, unit: string) => {
    // 1. Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#e11d48', '#10b981', '#38bdf8', '#f43f5e'],
      });
    } catch {
      // fallback
    }

    // 2. Play sound
    playCelebrationSound();

    // 3. Show celebratory Toast notification
    setCelebrationToast({
      title: '🎉 Meta de 100% Conquistada!',
      description: `Parabéns! Você bateu 100% na meta de ${goalTitle} (${currentVal}/${targetVal} ${unit})! Seu perfil está em alta performance na Jhobs.`,
      type: goalTitle,
    });

    setTimeout(() => {
      setCelebrationToast(null);
    }, 5000);
  };

  // Preset glamour photos available for instant creator testing
  const presetPhotos = [
    { label: 'Boudoir Seda Negra', url: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg' },
    { label: 'Golden Hour Sensual', url: '/src/assets/images/profile_isabella_1791856837043.jpg' },
    { label: 'Ensaio Espelho VIP', url: '/src/assets/images/profile_valentina_1791856836634.jpg' },
    { label: 'Sensual Noturno', url: '/src/assets/images/profile_camila_1791856837360.jpg' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedPresetImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onPublishMedia({
      title: title.trim(),
      description: description.trim() || 'Conteúdo exclusivo para assinantes Jhobs.',
      mediaUrl: selectedPresetImage,
      priceCredits: Number(priceCredits),
    });

    setUploadSuccess(true);
    setTitle('');
    setDescription('');
    setTimeout(() => {
      setUploadSuccess(false);
      setActiveTab('dashboard');
    }, 2000);
  };

  const handleSimulateFanUnlock = (credits: number, title: string) => {
    const earnings = credits * creditValueBrl;
    const newRecord: ContentUnlockRecord = {
      id: `unl_${Date.now()}`,
      mediaTitle: title,
      mediaType: credits >= 100 ? 'ensaio_vip' : 'nude',
      userName: ['Felipe Antunes', 'Thiago Medeiros', 'Bruno Silveira', 'Carlos Eduardo', 'Rodrigo Alencar'][
        Math.floor(Math.random() * 5)
      ],
      userAvatar: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      ][Math.floor(Math.random() * 3)],
      creditsPaid: credits,
      earningsBrl: earnings,
      timestamp: 'Agora mesmo',
      status: 'liquidado',
    };

    setUnlockHistory((prev) => [newRecord, ...prev]);
    setLocalCreatorBalance((prev) => prev + credits);
    onWithdrawPix(-credits, 'SIMULACAO', 'credito');

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#10b981', '#fbbf24', '#f43f5e'],
      });
    } catch {}
    playCelebrationSound();

    setCelebrationToast({
      title: '💰 Novo Desbloqueio de Conteúdo!',
      description: `Um fã acabou de pagar ${credits} créditos (R$ ${earnings.toFixed(2).replace('.', ',')}) para ver seu '${title}'! Valor disponível para saque via PIX.`,
      type: 'sale',
    });
    setTimeout(() => setCelebrationToast(null), 4500);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    if (!pixKey.trim() || withdrawCredits <= 0) return;
    if (withdrawCredits > localCreatorBalance) {
      setWithdrawError('Valor de saque maior do que o seu saldo disponível.');
      return;
    }

    setIsProcessingWithdraw(true);
    setWithdrawProgressStep('Validando chave PIX com o Banco Central...');

    setTimeout(() => {
      setWithdrawProgressStep('Liquidando transferência no SPI Bacen...');
      setTimeout(() => {
        setIsProcessingWithdraw(false);
        const amountBrlNum = withdrawCredits * creditValueBrl;
        onWithdrawPix(withdrawCredits, pixKey.trim(), pixType, pixBank);
        setLocalCreatorBalance((prev) => Math.max(0, prev - withdrawCredits));

        const receipt = {
          id: `wd_rec_${Date.now()}`,
          endToEndId: `E00416968${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.random().toString(36).substring(2, 11)}`,
          amountBrl: amountBrlNum,
          creditsDeducted: withdrawCredits,
          pixKey: pixKey.trim(),
          pixType,
          bank: pixBank,
          date: new Date().toLocaleString('pt-BR'),
        };
        setWithdrawReceipt(receipt);

        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#fbbf24'],
          });
        } catch {}
        playCelebrationSound();
      }, 900);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      {/* Toast de Celebração de Meta 100% */}
      {celebrationToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] w-11/12 max-w-md p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-slate-950 font-bold shadow-2xl shadow-amber-500/50 border border-amber-300 animate-bounce flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center shrink-0">
            <PartyPopper className="w-6 h-6 text-slate-950" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-extrabold font-display leading-tight">{celebrationToast.title}</h4>
            <p className="text-xs text-slate-900 mt-1 leading-snug font-medium">{celebrationToast.description}</p>
          </div>
          <button
            onClick={() => setCelebrationToast(null)}
            className="w-6 h-6 rounded-full bg-slate-950/20 hover:bg-slate-950/30 flex items-center justify-center text-slate-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toast de Configurações Salvas */}
      {configSavedToast && (
        <div className="fixed top-5 right-5 z-[70] px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuração de Metas atualizada!</span>
        </div>
      )}

      <div className="relative w-full max-w-2xl bg-[#12121a] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0d0d14] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-950/40">
              <DollarSign className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">Jhobs Creator Studio</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {goalMode === 'smart' ? 'Metas Inteligentes' : 'Metas Manuais'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Monetize seus nudes e fotos exclusivas por créditos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#101018] px-4 pt-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Painel de Ganhos
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-3 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'goals'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Metas & Performance</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('lives_challenges')}
            className={`pb-3 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lives_challenges'
                ? 'text-rose-400 border-b-2 border-rose-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span>Lives & Desafios</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Publicar Foto VIP</span>
          </button>

          <button
            onClick={() => setActiveTab('withdraw')}
            className={`pb-3 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Sacar via PIX</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Earnings Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30">
                  <span className="text-[11px] text-amber-400 font-semibold block">Saldo a Receber</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      R$ {balanceBrl}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Equivalente a {creatorBalanceCredits} créditos 💎
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Desbloqueios Pagos</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-white font-mono">28</span>
                    <span className="text-xs text-emerald-400 font-bold">+6 essa semana</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Usuários pagaram para ver</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">Visualizações do Cofre</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-white font-mono">314</span>
                    <span className="text-xs text-sky-400 font-bold">Taxa 9%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Conversão em compras</span>
                </div>
              </div>

              {/* Quick Goals Summary Card in Dashboard */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#151522] to-amber-950/20 border border-amber-500/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Meta do Mês ({goalMode === 'smart' ? 'Modo Inteligente' : 'Modo Manual'})</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                          {creditsProgress}%
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {currentStats.creditsEarnedThisMonth.toLocaleString()} de {activeTargets.credits.toLocaleString()} créditos 💎 (R$ {(currentStats.creditsEarnedThisMonth * creditValueBrl).toFixed(2).replace('.', ',')} de R$ {(activeTargets.credits * creditValueBrl).toFixed(2).replace('.', ',')})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('goals')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-amber-500/20"
                  >
                    <span>Ajustar Metas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-3 p-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 transition-all duration-700 shadow-sm shadow-amber-500"
                    style={{ width: `${Math.min(100, Math.max(8, creditsProgress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
                  <span>Faltam {Math.max(0, activeTargets.credits - currentStats.creditsEarnedThisMonth).toLocaleString()} créditos para atingir a meta total</span>
                  <span className="text-amber-400 font-bold">14 dias restantes</span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#181826] to-amber-950/30 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Como você ganha no Jhobs?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                    Os usuários compram pacotes de créditos via PIX/Cartão e usam para desbloquear suas fotos e nudes no cofre. Cada crédito recebido é convertido em dinheiro real direto no seu PIX.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Publicar Foto</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('withdraw')}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Sacar R$</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOALS & SMART CONFIGURATION PANEL */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              {/* Header explanation & mode switch */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-[#12121d] border border-amber-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      <span>Painel de Configuração de Metas</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Alterne entre sugestões automáticas baseadas nas tendências da plataforma ou defina seus próprios números.
                    </p>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setGoalMode('smart');
                        saveGoalsConfig('smart', smartTrend, manualCredits, manualVipUnlocks, manualRetention, manualTips);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        goalMode === 'smart'
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 shadow-md shadow-amber-950/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Metas Inteligentes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalMode('manual');
                        saveGoalsConfig('manual', smartTrend, manualCredits, manualVipUnlocks, manualRetention, manualTips);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        goalMode === 'manual'
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 shadow-md shadow-amber-950/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Metas Manuais</span>
                    </button>
                  </div>
                </div>

                {/* Sub-panel depending on selected mode */}
                {goalMode === 'smart' ? (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Tendências da Plataforma: as metas são calculadas pela IA da Jhobs com base no volume médio de visualizações (314 views) e taxa de conversão do cofre (9,2%).
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['conservative', 'balanced', 'aggressive'] as SmartTrend[]).map((trendKey) => {
                        const trend = smartTrendData[trendKey];
                        const isSelected = smartTrend === trendKey;
                        return (
                          <div
                            key={trendKey}
                            onClick={() => {
                              setSmartTrend(trendKey);
                              saveGoalsConfig('smart', trendKey, manualCredits, manualVipUnlocks, manualRetention, manualTips);
                            }}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border-amber-400 ring-2 ring-amber-400/40'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-white">{trend.title}</span>
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${trend.badgeColor}`}>
                                {trend.trendGrowth}
                              </span>
                            </div>
                            <div className="text-lg font-extrabold text-amber-400 font-mono">
                              {trend.targetCredits.toLocaleString()} 💎
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              R$ {(trend.targetCredits * creditValueBrl).toFixed(2).replace('.', ',')} / mês
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                              {trend.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
                      <Sliders className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>
                        Modo Manual: defina exatamente a quantidade de créditos e métricas que você deseja atingir este mês.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Manual Credits Goal */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          Meta de Créditos Mensais (💎)
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            min={500}
                            step={100}
                            value={manualCredits}
                            onChange={(e) => {
                              const val = Math.max(100, Number(e.target.value));
                              setManualCredits(val);
                              saveGoalsConfig('manual', smartTrend, val, manualVipUnlocks, manualRetention, manualTips);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-amber-400 font-mono whitespace-nowrap">
                            = R$ {(manualCredits * creditValueBrl).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[2500, 5000, 10000, 20000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setManualCredits(preset);
                                saveGoalsConfig('manual', smartTrend, preset, manualVipUnlocks, manualRetention, manualTips);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                manualCredits === preset
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {preset.toLocaleString()} 💎
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Manual VIP Unlocks Goal */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          Meta de Desbloqueios VIP no Cofre
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            min={5}
                            step={5}
                            value={manualVipUnlocks}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setManualVipUnlocks(val);
                              saveGoalsConfig('manual', smartTrend, manualCredits, val, manualRetention, manualTips);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-slate-400 whitespace-nowrap">fotos</span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[20, 40, 60, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setManualVipUnlocks(preset);
                                saveGoalsConfig('manual', smartTrend, manualCredits, preset, manualRetention, manualTips);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                manualVipUnlocks === preset
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {preset} fotos
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Manual Retention Goal */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          Meta de Retenção de Assinantes VIP
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            min={1}
                            value={manualRetention}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setManualRetention(val);
                              saveGoalsConfig('manual', smartTrend, manualCredits, manualVipUnlocks, val, manualTips);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-slate-400 whitespace-nowrap">fãs fiéis</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[5, 10, 15, 25].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setManualRetention(preset);
                                saveGoalsConfig('manual', smartTrend, manualCredits, manualVipUnlocks, preset, manualTips);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                manualRetention === preset
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {preset} fãs
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Manual Tips Goal */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          Meta de Gorjetas Recebidas (💎)
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            min={100}
                            step={50}
                            value={manualTips}
                            onChange={(e) => {
                              const val = Math.max(50, Number(e.target.value));
                              setManualTips(val);
                              saveGoalsConfig('manual', smartTrend, manualCredits, manualVipUnlocks, manualRetention, val);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-amber-400 font-mono whitespace-nowrap">
                            = R$ {(manualTips * creditValueBrl).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[300, 500, 800, 1500].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setManualTips(preset);
                                saveGoalsConfig('manual', smartTrend, manualCredits, manualVipUnlocks, manualRetention, preset);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                manualTips === preset
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {preset} 💎
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Tracking Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Progresso em Tempo Real no Mês Atual</span>
                  </h4>
                  {/* Test button to simulate 100% celebration */}
                  <button
                    type="button"
                    onClick={() => fireCelebration('Ganhos & Créditos', activeTargets.credits, activeTargets.credits, '💎')}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <PartyPopper className="w-3 h-3 text-amber-400" />
                    <span>Testar Notificação 100%</span>
                  </button>
                </div>

                {/* Card 1: Ganhos em Créditos */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Ganhos Totais em Créditos</span>
                          {creditsProgress >= 100 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% Atingido!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {currentStats.creditsEarnedThisMonth.toLocaleString()} de {activeTargets.credits.toLocaleString()} créditos 💎
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono text-amber-400">
                        {creditsProgress}%
                      </span>
                      <div className="text-[10px] text-slate-400">
                        R$ {(currentStats.creditsEarnedThisMonth * creditValueBrl).toFixed(2).replace('.', ',')} / R$ {(activeTargets.credits * creditValueBrl).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        creditsProgress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500'
                          : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(6, creditsProgress))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>
                      {creditsProgress >= 100
                        ? '🎉 Parabéns! Meta de créditos mensal superada com sucesso!'
                        : `Faltam ${Math.max(0, activeTargets.credits - currentStats.creditsEarnedThisMonth).toLocaleString()} créditos (R$ ${(Math.max(0, activeTargets.credits - currentStats.creditsEarnedThisMonth) * creditValueBrl).toFixed(2).replace('.', ',')})`}
                    </span>
                    {creditsProgress < 100 && (
                      <button
                        onClick={() => fireCelebration('Créditos Mensais', activeTargets.credits, activeTargets.credits, 'créditos')}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        Simular 100%
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 2: Desbloqueios VIP no Cofre */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Desbloqueios de Mídia VIP</span>
                          {vipUnlocksProgress >= 100 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% Atingido!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {currentStats.vipUnlocksThisMonth} de {activeTargets.vipUnlocks} fotos desbloqueadas por fãs
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono text-rose-400">
                        {vipUnlocksProgress}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        vipUnlocksProgress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-rose-500 to-pink-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(6, vipUnlocksProgress))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>
                      {vipUnlocksProgress >= 100
                        ? '🎉 Meta de fotos desbloqueadas atingida!'
                        : `Faltam ${Math.max(0, activeTargets.vipUnlocks - currentStats.vipUnlocksThisMonth)} desbloqueios`}
                    </span>
                    {vipUnlocksProgress < 100 && (
                      <button
                        onClick={() => fireCelebration('Desbloqueios VIP', activeTargets.vipUnlocks, activeTargets.vipUnlocks, 'desbloqueios')}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Simular 100%
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 3: Retenção de Assinantes Fiéis */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Retenção de Fãs & Assinantes Ativos</span>
                          {retentionProgress >= 100 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% Atingido!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {currentStats.activeFansRetention} de {activeTargets.retention} assinantes ativos no cofre
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono text-emerald-400">
                        {retentionProgress}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(6, retentionProgress))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>
                      {retentionProgress >= 100
                        ? '🎉 Retenção de fãs excepcional! Comunidade fidelizada.'
                        : `Faltam ${Math.max(0, activeTargets.retention - currentStats.activeFansRetention)} assinantes ativos`}
                    </span>
                    {retentionProgress < 100 && (
                      <button
                        onClick={() => fireCelebration('Retenção de Fãs', activeTargets.retention, activeTargets.retention, 'assinantes')}
                        className="text-emerald-400 hover:underline cursor-pointer"
                      >
                        Simular 100%
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 4: Gorjetas nos Chats */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Gorjetas & Mimos nos Chats</span>
                          {tipsProgress >= 100 && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 100% Atingido!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {currentStats.tipsReceivedThisMonth} de {activeTargets.tips} créditos em gorjetas 💎
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono text-purple-400">
                        {tipsProgress}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        tipsProgress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(6, tipsProgress))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>
                      {tipsProgress >= 100
                        ? '🎉 Parabéns! Meta de gorjetas conquistada!'
                        : `Faltam ${Math.max(0, activeTargets.tips - currentStats.tipsReceivedThisMonth)} créditos`}
                    </span>
                    {tipsProgress < 100 && (
                      <button
                        onClick={() => fireCelebration('Gorjetas', activeTargets.tips, activeTargets.tips, 'créditos')}
                        className="text-purple-400 hover:underline cursor-pointer"
                      >
                        Simular 100%
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIVES E DESEMPENHO */}
          {activeTab === 'lives_challenges' && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#151522] to-amber-950/30 border border-rose-500/30 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-white">Central de Lives & Desempenho do Criador</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Métricas de audiência, histórico de batalhas e repasses contábeis de 70% gerados por presentes e ingressos.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  MODO DEMO HD
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block">Horas Transmitidas</span>
                  <p className="text-xl font-bold font-mono text-white mt-1">{totalLiveHours}h</p>
                  <span className="text-[10px] text-emerald-400">Auditadas neste mês</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block">Pico de Espectadores</span>
                  <p className="text-xl font-bold font-mono text-rose-400 mt-1">{peakLiveViewers.toLocaleString('pt-BR')}</p>
                  <span className="text-[10px] text-slate-500">Audiência simultânea</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block">Presentes Recebidos</span>
                  <p className="text-xl font-bold font-mono text-amber-400 mt-1">{liveGiftsDiamonds} 💎</p>
                  <span className="text-[10px] text-slate-500">Créditos em mimos</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block">Repasse Líquido (70%)</span>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-1">R$ {liveNetPayoutBrl}</p>
                  <span className="text-[10px] text-slate-500">Lançado no Livro-Razão</span>
                </div>
              </div>

              {/* Performance Rewards (Campanhas & Regras Versionadas) */}
              <div className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Premiações por Desempenho (Separadas da Divisão 70/30)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Regras Contábeis Versionadas</span>
                </div>

                <div className="space-y-2">
                  {performanceRules.map((rule) => (
                    <div key={rule.ruleId} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white">{rule.campaignName}</strong>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">{rule.version}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Meta auditada: {rule.minDurationMinutes}+ min transmitidos e {rule.minAudiencePeak}+ pico de espectadores · Fundo: {rule.fundingSource}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {rule.isActive ? 'APROVADA' : 'EM ANÁLISE'}
                        </span>
                        <p className="font-mono font-bold text-emerald-400 mt-1">
                          R$ {rule.rewardBrl.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transmissões Recentes */}
              <div className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Histórico de Transmissões & Batalhas
                  </h4>
                  <span className="text-[10px] text-slate-400">Fonte: liveStreamService</span>
                </div>

                <div className="divide-y divide-slate-800/60 text-xs">
                  {liveSessions.slice(0, 4).map((session) => (
                    <div key={session.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{session.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            session.format === 'battle' ? 'bg-amber-950 text-amber-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {session.format === 'battle' ? 'BATALHA' : session.format === 'interactive_stage' ? 'PALCO' : 'INDIVIDUAL'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {session.format === 'battle'
                            ? `Placar: ${session.battleState?.creator1.score || 0} x ${session.battleState?.creator2.score || 0} · Audiência: ${session.viewerCount}`
                            : `Audiência: ${session.viewerCount} espectadores · Categoria: ${session.category}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-400">{session.format === 'battle' ? '347 💎' : '580 💎'}</span>
                        <span className="text-[10px] text-emerald-400 block font-mono">
                          {session.format === 'battle' ? 'R$ 24,29 (70%)' : 'R$ 40,60 (70%)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD PHOTO */}
          {activeTab === 'upload' && (
            <form onSubmit={handlePublish} className="space-y-4">
              {uploadSuccess && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 text-center font-bold">
                  Foto VIP publicada com sucesso no seu cofre!
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título do Ensaio / Foto Sensual
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ensaio de Lingerie na Suíte / Sem Censura"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Descrição Provocante
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Foto tirada após o banho, apenas para quem aprecia momentos íntimos."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Preço para Desbloquear (em Créditos Jhobs)
                </label>
                <div className="flex items-center gap-2">
                  {[50, 75, 100, 150, 250].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPriceCredits(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        priceCredits === val
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {val} 💎
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Você receberá aproximadamente R$ {(priceCredits * creditValueBrl).toFixed(2).replace('.', ',')} por cada usuário que desbloquear.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Escolha uma foto ou faça upload do seu arquivo
                </label>

                {/* Preset image selector */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {presetPhotos.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPresetImage(preset.url)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer transition-transform hover:scale-105 ${
                        selectedPresetImage === preset.url
                          ? 'border-amber-400 ring-2 ring-amber-400/50'
                          : 'border-slate-800 opacity-70'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* File upload input */}
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl bg-slate-900/60 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Ou selecione uma foto do seu dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-950/40 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publicar no Meu Cofre VIP ({priceCredits} Créditos)</span>
              </button>
            </form>
          )}

          {/* TAB 4: WITHDRAW VIA PIX */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              {withdrawSuccess && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 text-center font-bold">
                  {withdrawSuccess}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#161622] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Saldo disponível para saque:</span>
                  <span className="text-2xl font-mono font-extrabold text-emerald-400">
                    R$ {balanceBrl}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {creatorBalanceCredits} créditos
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tipo de Chave PIX
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['cpf', 'email', 'telefone', 'aleatoria'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPixType(type)}
                      className={`py-1.5 text-xs font-bold rounded-lg uppercase transition-colors cursor-pointer ${
                        pixType === type
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    pixType === 'cpf'
                      ? '000.000.000-00'
                      : pixType === 'email'
                      ? 'seuemail@exemplo.com'
                      : pixType === 'telefone'
                      ? '(11) 99999-9999'
                      : 'Chave Aleatória do Banco'
                  }
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Banco de Destino
                </label>
                <select
                  value={pixBank}
                  onChange={(e) => setPixBank(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Nubank (Nu Pagamentos S.A.)">Nubank (Nu Pagamentos S.A.)</option>
                  <option value="Banco Inter S.A.">Banco Inter S.A.</option>
                  <option value="Itaú Unibanco S.A.">Itaú Unibanco S.A.</option>
                  <option value="Banco Bradesco S.A.">Banco Bradesco S.A.</option>
                  <option value="Banco do Brasil S.A.">Banco do Brasil S.A.</option>
                  <option value="Santander Brasil S.A.">Santander Brasil S.A.</option>
                  <option value="Caixa Econômica Federal">Caixa Econômica Federal</option>
                  <option value="C6 Bank S.A.">C6 Bank S.A.</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="PicPay">PicPay</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Quantidade de Créditos a Sacar
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={50}
                    max={creatorBalanceCredits}
                    value={withdrawCredits}
                    onChange={(e) => setWithdrawCredits(Number(e.target.value))}
                    className="w-32 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-300">
                    = R$ {(withdrawCredits * creditValueBrl).toFixed(2).replace('.', ',')} líquidos
                  </span>
                  <button
                    type="button"
                    onClick={() => setWithdrawCredits(creatorBalanceCredits)}
                    className="text-xs text-emerald-400 hover:underline cursor-pointer ml-auto"
                  >
                    Sacar Tudo
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatorBalanceCredits <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Confirmar Transferência PIX Instantânea</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
