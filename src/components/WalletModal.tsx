import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Check,
  QrCode,
  CreditCard,
  Sparkles,
  Clock,
  Copy,
  ShieldCheck,
  Lock,
  ArrowRight,
  Zap,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Flame,
  RefreshCw,
  PlayCircle,
  ShieldAlert,
  Sliders,
  FileCheck2,
  Unlock,
} from 'lucide-react';
import {
  financialLedger,
  OFFICIAL_CREDIT_PACKAGES,
  CreditPackageConfig,
  LedgerEntry,
} from '../services/ledgerService';
import {
  exclusiveContentAndInterestService,
  UserDiamondWalletState,
} from '../services/exclusiveContentAndInterestService';
import { monetizationService } from '../services/monetizationService';
import { runLedgerVerificationSuite, TestResult } from '../services/__tests__/ledgerService.test';
import { trackEvent, incrementDailyTrafficMetric } from '../utils/analytics';

interface WalletModalProps {
  currentCredits: number;
  onClose: () => void;
  onCreditsUpdated?: (newBalance: number) => void;
  onOpenCreatorStudio?: () => void;
  initialTab?: 'buy' | 'ledger' | 'unlocked' | 'tests' | 'creator_info';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  currentCredits: propCredits,
  onClose,
  onCreditsUpdated,
  onOpenCreatorStudio,
  initialTab = 'buy',
}) => {
  const [mainTab, setMainTab] = useState<'buy' | 'ledger' | 'unlocked' | 'tests' | 'creator_info'>(initialTab);

  // Fonte da verdade: saldo do livro-razão contábil e carteira segregada de diamantes
  const [userBalance, setUserBalance] = useState<number>(() =>
    financialLedger.getUserCredits('current_user')
  );
  const [segregatedWallet, setSegregatedWallet] = useState<UserDiamondWalletState>(() =>
    exclusiveContentAndInterestService.getUserDiamondWallet('current_user')
  );

  // Pacote selecionado
  const [selectedPkg, setSelectedPkg] = useState<CreditPackageConfig>(
    OFFICIAL_CREDIT_PACKAGES[1] || OFFICIAL_CREDIT_PACKAGES[0]
  );

  // Método de pagamento
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'pix'>('pix');
  const [pixCopied, setPixCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    details?: string;
  } | null>(null);

  // Opções de simulação para auditoria de Sandbox
  const [simulationMode, setSimulationMode] = useState<
    'success' | 'pending' | 'failure' | 'idempotency_replay'
  >('success');

  // Filtro do extrato do livro-razão
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'purchases' | 'unlocks' | 'refunds'>('all');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => financialLedger.getEntries());

  // Testes de verificação
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Atualizar saldo reativamente a partir do livro-razão
  const refreshLedger = () => {
    const bal = financialLedger.getUserCredits('current_user');
    setUserBalance(bal);
    setSegregatedWallet(exclusiveContentAndInterestService.getUserDiamondWallet('current_user'));
    setLedgerEntries(financialLedger.getEntries());
    if (onCreditsUpdated) {
      onCreditsUpdated(bal);
    }
  };

  useEffect(() => {
    refreshLedger();
  }, []);

  const pixCode = `00020126580014br.gov.bcb.pix0136jobs-sandbox-${selectedPkg.id}-${Date.now()}5204000053039865405${selectedPkg.priceBrl.toFixed(2)}5802BR5915JOBS PLATAFORMA6009SAO PAULO62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard?.writeText?.(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  // Compra atômica de pacote no livro-razão
  const handleExecutePurchase = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);

    const baseKey = `idemp_${selectedPkg.id}_${Date.now()}`;
    // Se for modo de teste de replay, usa chave fixa para demonstrar idempotência
    const idempotencyKey =
      simulationMode === 'idempotency_replay' ? `idemp_replay_fixed_test_key` : baseKey;

    try {
      const simulatePending = simulationMode === 'pending';
      const simulateFailure = simulationMode === 'failure';

      const res = await financialLedger.purchaseCreditPackage({
        userId: 'current_user',
        packageId: selectedPkg.id,
        packageName: selectedPkg.name,
        creditsToGrant: selectedPkg.totalCredits,
        priceBrl: selectedPkg.priceBrl,
        gateway: paymentMethod,
        idempotencyKey,
        simulatePending,
        simulateFailure,
      });

      if (!res.isReplay && !simulatePending && res.success) {
        exclusiveContentAndInterestService.creditUserDiamonds({
          userId: 'current_user',
          purchasedDiamondsToAdd: selectedPkg.credits,
          bonusDiamondsToAdd: selectedPkg.bonusCredits,
        });
      }

      refreshLedger();

      if (res.isReplay) {
        setFeedbackMessage({
          type: 'warning',
          text: `[PROTEÇÃO DE IDEMPOTÊNCIA ATIVADA] Chave reutilizada (${idempotencyKey}).`,
          details:
            'O livro-razão detectou transação repetida e retornou o registro existente sem creditar saldo duplo.',
        });
      } else if (simulatePending) {
        setFeedbackMessage({
          type: 'info',
          text: 'Pagamento PIX pendente de conciliação do Webhook.',
          details: 'Nenhum crédito foi liberado antes da confirmação bancária definitiva.',
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `+${selectedPkg.totalCredits} 💎 adicionados (${selectedPkg.credits} comprados + ${selectedPkg.bonusCredits} bônus)!`,
          details: `Lançamento contábil registrado no Livro-Razão (#${res.entries[1]?.id}) via ${paymentMethod.toUpperCase()} (Sandbox).`,
        });

        trackEvent('package_purchase_sandbox', {
          packageId: selectedPkg.id,
          credits: selectedPkg.totalCredits,
          priceBrl: selectedPkg.priceBrl,
          gateway: paymentMethod,
        });
        incrementDailyTrafficMetric('creditsSold', selectedPkg.totalCredits);
        incrementDailyTrafficMetric('revenueBrl', selectedPkg.priceBrl);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: 'Falha na transação.',
        details: err?.message || 'Erro durante processamento.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Estorno / Reembolso de teste
  const handleRefundEntry = async (entry: LedgerEntry) => {
    try {
      const refundKey = `idemp_refund_${entry.id}_${Date.now()}`;
      await financialLedger.processRefund({
        originalEntryId: entry.id,
        reason: 'Solicitação de teste em Sandbox de auditoria contábil',
        adminId: 'admin_audit_officer',
        idempotencyKey: refundKey,
      });
      refreshLedger();
      setFeedbackMessage({
        type: 'success',
        text: 'Estorno compensatório registrado com sucesso no livro-razão!',
        details: `O lançamento #${entry.id} foi anulado por lançamento inverso auditado.`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: 'Não foi possível estornar.',
        details: err?.message || 'Erro desconhecido.',
      });
    }
  };

  // Executar suíte de testes de integridade contábil
  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const report = await runLedgerVerificationSuite();
      setTestResults(report.results);
      refreshLedger();
    } finally {
      setIsRunningTests(false);
    }
  };

  // Filtragem de entradas do consumidor (exibe movimentações em 💎 sem expor pernas internas fiduciárias nos comprovantes do cliente)
  const customerCreditEntries = ledgerEntries.filter((e) => e.currency === 'CREDITS');
  const filteredEntries = customerCreditEntries.filter((entry) => {
    if (ledgerFilter === 'purchases') return entry.operationType === 'CREDIT_PURCHASE';
    if (ledgerFilter === 'unlocks') return entry.operationType === 'CONTENT_UNLOCK' || entry.operationType === 'TIP_GIFT';
    if (ledgerFilter === 'refunds') return entry.operationType === 'REFUND';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Carteira — Comprar Créditos (💎)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SANDBOX AUDITADO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Moeda interna da plataforma para serviços, Cofre VIP, mídias e transmissões ao vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Segregated Balance Projection */}
            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Saldo Disponível:</span>
                <span className="text-lg font-extrabold text-amber-400 flex items-center gap-1">
                  💎 {userBalance.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Comprados: <strong className="text-white">{segregatedWallet.purchasedDiamonds} 💎</strong> · Bônus:{' '}
                <strong className="text-emerald-400">{segregatedWallet.bonusDiamonds} 💎</strong> · Consumidos:{' '}
                <strong className="text-rose-300">{segregatedWallet.consumedTotalDiamonds} 💎</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legal & Regulatory Sandbox Banner */}
        <div className="bg-amber-950/30 border-b border-amber-800/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Regra de Conformidade:</strong> Créditos comprados são de uso restrito na plataforma (não sacáveis). Ganhos de criadores são geridos em BRL no Painel do Criador.
            </span>
          </div>
          <button
            onClick={() => setMainTab('creator_info')}
            className="text-[11px] underline font-semibold hover:text-white shrink-0 ml-2"
          >
            Saber mais
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-4 sm:px-6 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => setMainTab('buy')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              mainTab === 'buy'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            Comprar Pacotes
          </button>

          <button
            onClick={() => {
              setMainTab('ledger');
              refreshLedger();
            }}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              mainTab === 'ledger'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Extrato do Livro-Razão ({ledgerEntries.length})
          </button>

          <button
            onClick={() => setMainTab('unlocked')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              mainTab === 'unlocked'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-4 h-4" />
            Conteúdos Desbloqueados
          </button>

          <button
            onClick={() => setMainTab('tests')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              mainTab === 'tests'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            Testes de Idempotência (Fase 1)
          </button>

          <button
            onClick={() => setMainTab('creator_info')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              mainTab === 'creator_info'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Economia Contábil (70/20/10)
          </button>
        </div>

        {/* Feedback Message Bar */}
        {feedbackMessage && (
          <div
            className={`px-4 py-3 mx-4 sm:mx-6 mt-4 rounded-xl border flex items-start gap-3 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : feedbackMessage.type === 'warning'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : feedbackMessage.type === 'info'
                ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : feedbackMessage.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold">{feedbackMessage.text}</p>
              {feedbackMessage.details && <p className="mt-0.5 text-slate-300">{feedbackMessage.details}</p>}
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Comprar Pacotes de Créditos */}
        {mainTab === 'buy' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Escolha seu Pacote de Créditos</h3>
              <p className="text-xs text-slate-400">
                Catálogo oficial calibrado: 1 crédito = R$ 0,10 em valor de serviço na plataforma.
              </p>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {OFFICIAL_CREDIT_PACKAGES.map((pkg) => {
                const isSelected = selectedPkg.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`relative rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-950/30'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm">
                        {pkg.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{pkg.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-rose-400 bg-rose-500' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>

                      <div className="my-2">
                        <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
                          💎 {pkg.totalCredits}
                        </div>
                        {pkg.bonusCredits > 0 ? (
                          <p className="text-[11px] text-emerald-400 font-semibold">
                            {pkg.credits} + {pkg.bonusCredits} Bônus Grátis
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">Sem bônus</p>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {pkg.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Preço:</span>
                      <span className="text-base font-extrabold text-white">
                        R$ {pkg.priceBrl.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Método de Pagamento (Ambiente de Testes)
                </h4>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Criptografia de ponta a ponta
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold">PIX Instantâneo</p>
                    <p className="text-[10px] text-slate-400">Aprovação em segundos</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'stripe'
                      ? 'bg-rose-950/30 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-rose-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Cartão (Stripe)</p>
                    <p className="text-[10px] text-slate-400">Cartão de Crédito Sandbox</p>
                  </div>
                </button>
              </div>

              {/* PIX Details */}
              {paymentMethod === 'pix' && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center shrink-0">
                      <QrCode className="w-24 h-24 text-slate-900" />
                    </div>
                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <p className="text-xs font-bold text-white">Chave PIX Copia e Cola Gerada</p>
                      <p className="text-[11px] text-slate-400">
                        Valor: <strong>R$ {selectedPkg.priceBrl.toFixed(2).replace('.', ',')}</strong> (Pacote {selectedPkg.name})
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          readOnly
                          value={pixCode}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 font-mono w-full truncate"
                        />
                        <button
                          onClick={handleCopyPix}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                        >
                          {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {pixCopied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stripe Details */}
              {paymentMethod === 'stripe' && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                  <p className="font-semibold text-white">Dados Simulados do Cartão (Sandbox)</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Número do Cartão:</span>
                      4242 •••• •••• 4242 (Stripe Test)
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Validade / CVC:</span>
                      12/28 • CVC: 884
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Nenhum dado real de cartão é armazenado na plataforma (Tokenização Zero-PAN).
                  </p>
                </div>
              )}

              {/* Sandbox Simulation Options */}
              <div className="pt-2 border-t border-slate-700/60">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Modo de Auditoria Financeira do Livro-Razão:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="sim_mode"
                      checked={simulationMode === 'success'}
                      onChange={() => setSimulationMode('success')}
                      className="text-rose-500"
                    />
                    <span>
                      <strong>Aprovação Normal</strong> (Créditos concedidos no livro-razão)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="sim_mode"
                      checked={simulationMode === 'idempotency_replay'}
                      onChange={() => setSimulationMode('idempotency_replay')}
                      className="text-rose-500"
                    />
                    <span>
                      <strong>Teste de Idempotência</strong> (Simula clique duplo sem duplicação)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="sim_mode"
                      checked={simulationMode === 'pending'}
                      onChange={() => setSimulationMode('pending')}
                      className="text-rose-500"
                    />
                    <span>
                      <strong>Pagamento Pendente</strong> (Não libera créditos sem confirmação)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-900/70 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="sim_mode"
                      checked={simulationMode === 'failure'}
                      onChange={() => setSimulationMode('failure')}
                      className="text-rose-500"
                    />
                    <span>
                      <strong>Falha / Recusa</strong> (Rejeição imediata sem lançamentos)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                Total a pagar:{' '}
                <strong className="text-white text-sm">
                  R$ {selectedPkg.priceBrl.toFixed(2).replace('.', ',')}
                </strong>{' '}
                por{' '}
                <strong className="text-amber-400 text-sm">{selectedPkg.totalCredits} créditos</strong>
              </div>

              <button
                onClick={handleExecutePurchase}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando no Livro-Razão...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirmar Compra Auditada ({selectedPkg.totalCredits} 💎)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Extrato do Livro-Razão Contábil */}
        {mainTab === 'ledger' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Extrato do Livro-Razão (Double-Entry Ledger)</h3>
                <p className="text-xs text-slate-400">
                  Histórico contábil imutável com chaves de idempotência e hashes de integridade.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLedgerFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    ledgerFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Todas ({ledgerEntries.length})
                </button>
                <button
                  onClick={() => setLedgerFilter('purchases')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    ledgerFilter === 'purchases' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Compras
                </button>
                <button
                  onClick={() => setLedgerFilter('unlocks')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    ledgerFilter === 'unlocks' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Desbloqueios
                </button>
                <button
                  onClick={() => setLedgerFilter('refunds')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    ledgerFilter === 'refunds' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Estornos
                </button>
              </div>
            </div>

            {/* Entries List */}
            <div className="space-y-2.5">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/40 rounded-xl border border-slate-700">
                  <Coins className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Nenhum lançamento contábil encontrado para o filtro.</p>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-xl hover:bg-slate-800 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              entry.operationType === 'CREDIT_PURCHASE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : entry.operationType === 'CONTENT_UNLOCK'
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                : entry.operationType === 'REFUND'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {entry.operationType}
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {entry.id}
                          </span>

                          <span className="text-[10px] text-emerald-400/80 font-mono">
                            Chave: {entry.idempotencyKey.substring(0, 20)}...
                          </span>
                        </div>

                        <p className="font-semibold text-white">{entry.description}</p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            De: <strong className="text-slate-300 font-mono">{entry.debitAccount}</strong>
                          </span>
                          <span>➜</span>
                          <span>
                            Para: <strong className="text-slate-300 font-mono">{entry.creditAccount}</strong>
                          </span>
                          <span>•</span>
                          <span>{new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-amber-400">
                          {`${entry.amount} 💎`}
                        </p>

                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                            entry.status === 'posted'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : entry.status === 'refunded'
                              ? 'bg-rose-500/20 text-rose-300 line-through'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {entry.status}
                        </span>

                        {/* Test Refund Action on Purchases */}
                        {entry.operationType === 'CREDIT_PURCHASE' &&
                          entry.currency === 'CREDITS' &&
                          entry.status === 'posted' && (
                            <div className="mt-2">
                              <button
                                onClick={() => handleRefundEntry(entry)}
                                className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                              >
                                Simular Estorno
                              </button>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Hash: {entry.entryHash.substring(0, 24)}...</span>
                      <span>Hash Anterior: {entry.previousHash.substring(0, 16)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Conteúdos Desbloqueados (RF01, RF05) */}
        {mainTab === 'unlocked' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Conteúdos Autorizados na sua Conta</h3>
                <p className="text-xs text-slate-400">
                  Mídias com concessão de acesso ativa protegidas por token temporário de 15 minutos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {monetizationService
                .getContents()
                .filter((c) => monetizationService.hasAccess('current_user', c.id) || c.isFree)
                .map((content) => (
                  <div
                    key={content.id}
                    className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex gap-3 items-center hover:bg-slate-800 transition-colors"
                  >
                    <img
                      src={content.previewAssetId}
                      alt={content.title}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className="text-xs font-bold text-white truncate">{content.title}</h4>
                      <p className="text-[11px] text-slate-400">Por {content.creatorName}</p>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                        ✓ Acesso Autorizado
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-center gap-2 text-[11px] text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Aviso Legal (RF05):</strong> O acesso ocorre via link temporário criptografado com validação no servidor. A plataforma reduz o acesso indevido, mas não impede capturas externas.
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Suíte de Testes da Fase 1 */}
        {mainTab === 'tests' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Auditoria Automatizada da Fase 1 (Idempotência e Atomicidade)
                </h3>
                <p className="text-xs text-slate-400">
                  Executa baterias reais contra o motor de livro-razão para atestar conformidade.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executando Suíte...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    Executar Verificações
                  </>
                )}
              </button>
            </div>

            {testResults ? (
              <div className="space-y-3">
                {testResults.map((test, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      test.passed
                        ? 'bg-emerald-950/30 border-emerald-600/50 text-emerald-100'
                        : 'bg-rose-950/30 border-rose-600/50 text-rose-100'
                    }`}
                  >
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-white text-sm">{test.testName}</p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {test.durationMs}ms
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300 leading-relaxed">{test.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                <PlayCircle className="w-10 h-10 text-indigo-400 mx-auto" />
                <p className="text-sm font-semibold text-white">
                  Pronto para testar regras contábeis da Fase 1
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Clique no botão acima para verificar idempotência de pagamento, bloqueio atômico de saldo insuficiente, repartição de receitas 70/30 e encadeamento criptográfico.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Economia dos Criadores e Segregação de Ganhos */}
        {mainTab === 'creator_info' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-slate-300">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-400" />
                Princípio de Segregação Financeira JOBS
              </h3>
              <p className="leading-relaxed">
                Na plataforma JOBS, <strong>créditos adquiridos por usuários consumidores</strong> são tokens digitais estritamente utilizáveis dentro da aplicação para liberar mídias, enviar mensagens VIP e presentear criadores em transmissões ao vivo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700/60 space-y-1">
                  <span className="text-amber-400 font-bold block text-sm">Créditos de Consumo (💎)</span>
                  <p className="text-[11px] text-slate-400">
                    • Uso exclusivo na plataforma JOBS.<br />
                    • Não podem ser sacados em dinheiro por consumidores.<br />
                    • Proibição de transações P2P não auditadas.
                  </p>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700/60 space-y-1">
                  <span className="text-emerald-400 font-bold block text-sm">Regra Contábil 70 / 20 / 10 (Base Elegível)</span>
                  <p className="text-[11px] text-slate-400">
                    • <strong>70% Criador</strong> · <strong>20% JOBS</strong> · <strong>10% Reserva Operacional</strong>.<br />
                    • Calculada sobre diamantes pagos consumidos (1 💎 pago = R$ 0,10); bônus têm valor fiduciário zero.<br />
                    • Saques condicionados a KYC 18+ e validação fiscal.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl">
              <div>
                <p className="font-bold text-white">Você é um criador de conteúdo verificado?</p>
                <p className="text-[11px] text-slate-400">
                  Acesse o Creator Studio para gerenciar seus ganhos em BRL, mídias e saques.
                </p>
              </div>

              {onOpenCreatorStudio && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCreatorStudio();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  Abrir Creator Studio
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Livro-Razão Conectado: <strong>100% Auditável e Idempotente</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
