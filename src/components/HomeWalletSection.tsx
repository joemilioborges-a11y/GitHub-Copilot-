import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Eye,
  EyeOff,
  ArrowUpRight,
  FileText,
  Users,
  Video,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Search,
  Filter,
  ChevronRight,
  Coins,
  History,
  RefreshCw,
} from 'lucide-react';
import {
  financialLedger,
  UnifiedWalletSummary,
  UnifiedWalletStatementItem,
  WalletStatementCategoryFilter,
  PixKeyType,
  PayoutRecord,
  LedgerEntry,
} from '../services/ledgerService';
import { runtimeEnvironmentService } from '../services/runtimeEnvironmentService';

export interface HomeWalletSectionProps {
  userId?: string;
  actorUserId?: string;
  userName: string;
  onOpenChallenges?: () => void;
  onOpenCreatorContentStudio?: () => void;
  onOpenReferralModal?: () => void;
  onOpenCreditsWallet?: () => void;
}

const STORAGE_KEY_HIDE_BALANCE = 'jobs_home_wallet_hide_balance_v1';
const STORAGE_KEY_SAVED_PIX = 'jobs_home_wallet_saved_pix_v1';

interface SavedPixDestination {
  pixKeyType: PixKeyType;
  pixKey: string;
}

type WalletStatementStatusFilter =
  | 'all'
  | 'available'
  | 'pending_review'
  | 'payout_reserved'
  | 'payout_released'
  | 'refunded'
  | 'adjusted';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyBrl(valueBrl: number): string {
  return brlFormatter.format(Number.isFinite(valueBrl) ? valueBrl : 0);
}

export const HomeWalletSection: React.FC<HomeWalletSectionProps> = ({
  userId = 'current_user',
  actorUserId,
  userName,
  onOpenCreditsWallet,
}) => {
  const effectiveActorId = actorUserId ?? userId;

  const [walletAccessError, setWalletAccessError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [summary, setSummary] = useState<UnifiedWalletSummary>(() => {
    try {
      return financialLedger.getUnifiedWalletSummary(userId, {
        actorUserId: effectiveActorId,
      });
    } catch {
      return {
        userId,
        environment: runtimeEnvironmentService.isSimulationMode() ? 'sandbox' : 'production',
        isSimulation: runtimeEnvironmentService.isSimulationMode(),
        ledgerModeLabel: 'Acesso restrito ao titular autenticado',
        currency: 'BRL',
        availableBalanceCents: 0,
        availableBalanceBrl: 0,
        totalPendingCents: 0,
        totalPendingBrl: 0,
        totalReceivedPeriodCents: 0,
        totalReceivedPeriodBrl: 0,
        collaboratorReceivedCents: 0,
        collaboratorReceivedBrl: 0,
        collaboratorPendingCents: 0,
        collaboratorPendingBrl: 0,
        contentProducerReceivedCents: 0,
        contentProducerReceivedBrl: 0,
        contentProducerPendingCents: 0,
        contentProducerPendingBrl: 0,
        pendingReviewCents: 0,
        pendingReviewBrl: 0,
        payoutReservedCents: 0,
        payoutReservedBrl: 0,
        withdrawnSettledCents: 0,
        withdrawnSettledBrl: 0,
        minimumWithdrawalCents: 5000,
        minimumWithdrawalBrl: 50,
        maximumDailyWithdrawalCents: 1000000,
        maximumDailyWithdrawalBrl: 10000,
        verifiedPixFeeCents: 0,
        verifiedPixFeeBrl: 0,
        estimatedSettlementSla: 'Até 1 dia útil após validação antifraude',
        userConsumptionCredits: 0,
        lastTransaction: null,
        lastUpdatedIso: new Date().toISOString(),
      };
    }
  });

  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_HIDE_BALANCE) === 'true';
    } catch {
      return false;
    }
  });

  // Modais: Saque e Extrato Detalhado
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Estado do fluxo de Saque
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'confirm' | 'receipt'>('form');
  const [amountInput, setAmountInput] = useState<string>('50,00');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('CPF');
  const [pixKeyInput, setPixKeyInput] = useState<string>('');
  const [holderConfirmed, setHolderConfirmed] = useState<boolean>(true);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [completedPayout, setCompletedPayout] = useState<{
    payout: PayoutRecord;
    ledgerEntry: LedgerEntry;
    isReplay: boolean;
  } | null>(null);

  // Estado do Extrato Detalhado
  const [statementCategory, setStatementCategory] = useState<WalletStatementCategoryFilter>('all');
  const [statementStatusFilter, setStatementStatusFilter] =
    useState<WalletStatementStatusFilter>('all');
  const [statementSearch, setStatementSearch] = useState<string>('');

  const refreshWalletData = useCallback(() => {
    setIsRefreshing(true);
    try {
      const nextSummary = financialLedger.getUnifiedWalletSummary(userId, {
        actorUserId: effectiveActorId,
      });
      setSummary(nextSummary);
      setWalletAccessError(null);
    } catch (err: any) {
      setWalletAccessError(
        err?.message || 'Não foi possível carregar os dados financeiros desta carteira.'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, effectiveActorId]);

  useEffect(() => {
    refreshWalletData();
    const unsubLedger = financialLedger.subscribe(() => {
      refreshWalletData();
    });
    const unsubEnv = runtimeEnvironmentService.subscribe(() => {
      refreshWalletData();
    });
    return () => {
      unsubLedger();
      unsubEnv();
    };
  }, [refreshWalletData]);

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY_SAVED_PIX);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as SavedPixDestination;
        if (parsed.pixKeyType && parsed.pixKey) {
          setPixKeyType(parsed.pixKeyType);
          setPixKeyInput(parsed.pixKey);
        }
      }
    } catch {
      // ignora erro de leitura de storage
    }
  }, []);

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_HIDE_BALANCE, String(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  const renderMonetaryValue = (valueBrl: number) => {
    if (hideBalance) return 'R$ ••••••';
    return formatCurrencyBrl(valueBrl);
  };

  // Conversão segura do input monetário para centavos inteiros
  const parsedWithdrawCents = useMemo(() => {
    const cleaned = amountInput.replace(/[^\d.,]/g, '').replace(',', '.');
    const numeric = Number.parseFloat(cleaned);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.round(numeric * 100);
  }, [amountInput]);

  const parsedWithdrawBrl = useMemo(() => {
    return Number((parsedWithdrawCents / 100).toFixed(2));
  }, [parsedWithdrawCents]);

  const pixValidation = useMemo(() => {
    return financialLedger.validatePixDestination(pixKeyType, pixKeyInput);
  }, [pixKeyType, pixKeyInput]);

  const authCheck = useMemo(() => {
    return financialLedger.verifyWalletAccessAuthorization(
      userId,
      effectiveActorId,
      'WALLET_UI_CHECK'
    );
  }, [userId, effectiveActorId]);

  const canWithdrawNow =
    authCheck.authorized &&
    !walletAccessError &&
    summary.availableBalanceCents >= summary.minimumWithdrawalCents;

  const missingForMinimumCents = Math.max(
    0,
    summary.minimumWithdrawalCents - summary.availableBalanceCents
  );
  const missingForMinimumBrl = Number((missingForMinimumCents / 100).toFixed(2));

  const openWithdrawModal = () => {
    setWithdrawError(null);
    setCompletedPayout(null);
    setWithdrawStep('form');
    const defaultBrl =
      summary.availableBalanceCents >= summary.minimumWithdrawalCents
        ? (summary.availableBalanceCents / 100).toFixed(2).replace('.', ',')
        : '50,00';
    setAmountInput(defaultBrl);
    setActiveIdempotencyKey(
      `idemp_home_withdraw_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    );
    setIsWithdrawModalOpen(true);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    if (!authCheck.authorized) {
      setWithdrawError(
        authCheck.reason || 'Usuário não autenticado ou sem permissão para solicitar saque.'
      );
      return;
    }

    if (parsedWithdrawCents < summary.minimumWithdrawalCents) {
      setWithdrawError(
        `O valor mínimo para saque é ${formatCurrencyBrl(summary.minimumWithdrawalBrl)}.`
      );
      return;
    }

    if (parsedWithdrawCents > summary.maximumDailyWithdrawalCents) {
      setWithdrawError(
        `O valor solicitado excede o limite diário de ${formatCurrencyBrl(
          summary.maximumDailyWithdrawalBrl
        )}.`
      );
      return;
    }

    if (parsedWithdrawCents > summary.availableBalanceCents) {
      setWithdrawError(
        `Saldo disponível insuficiente. Seu saldo disponível para saque é ${formatCurrencyBrl(
          summary.availableBalanceBrl
        )}.`
      );
      return;
    }

    if (!pixValidation.valid) {
      setWithdrawError(
        pixValidation.errorMessage || 'Informe uma chave PIX válida antes de continuar.'
      );
      return;
    }

    if (!holderConfirmed) {
      setWithdrawError(
        'Confirme que a chave PIX pertence ao mesmo titular desta conta para prosseguir.'
      );
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY_SAVED_PIX,
        JSON.stringify({ pixKeyType, pixKey: pixKeyInput })
      );
    } catch {
      // no-op
    }

    setWithdrawStep('confirm');
  };

  const handleConfirmWithdraw = async () => {
    if (isSubmittingWithdraw) return;
    setIsSubmittingWithdraw(true);
    setWithdrawError(null);

    try {
      const result = await financialLedger.requestUnifiedWalletPayout({
        userId,
        actorUserId: effectiveActorId,
        userName: userName || 'Usuário JOBS',
        amountCents: parsedWithdrawCents,
        pixKeyType,
        pixKey: pixKeyInput,
        holderConfirmed,
        idempotencyKey: activeIdempotencyKey,
        environment: summary.environment,
      });

      setSummary(result.updatedSummary);
      setCompletedPayout({
        payout: result.payout,
        ledgerEntry: result.ledgerEntry,
        isReplay: result.isReplay,
      });
      setWithdrawStep('receipt');
    } catch (err: any) {
      setWithdrawError(
        err?.message || 'Não foi possível registrar a solicitação de saque. Tente novamente.'
      );
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Lista filtrada para o modal de extrato
  const statementItems = useMemo(() => {
    if (walletAccessError || !authCheck.authorized) return [];
    try {
      const rawItems = financialLedger.getUnifiedWalletStatement(userId, statementCategory, {
        actorUserId: effectiveActorId,
      });
      return rawItems.filter((item) => {
        if (statementStatusFilter !== 'all' && item.status !== statementStatusFilter) {
          return false;
        }
        if (statementSearch.trim()) {
          const q = statementSearch.trim().toLowerCase();
          return (
            item.description.toLowerCase().includes(q) ||
            item.transactionId.toLowerCase().includes(q) ||
            item.referenceId.toLowerCase().includes(q) ||
            item.categoryLabel.toLowerCase().includes(q) ||
            item.subTypeLabel.toLowerCase().includes(q) ||
            item.operationType.toLowerCase().includes(q)
          );
        }
        return true;
      });
    } catch {
      return [];
    }
  }, [
    userId,
    effectiveActorId,
    authCheck.authorized,
    walletAccessError,
    statementCategory,
    statementStatusFilter,
    statementSearch,
    summary.lastUpdatedIso,
  ]);

  const statementTotals = useMemo(() => {
    let creditsCents = 0;
    let debitsCents = 0;
    for (const item of statementItems) {
      if (item.direction === 'credit' && item.status !== 'refunded') {
        creditsCents += item.amountCents;
      } else if (item.direction === 'debit') {
        debitsCents += item.amountCents;
      }
    }
    return {
      creditsBrl: Number((creditsCents / 100).toFixed(2)),
      debitsBrl: Number((debitsCents / 100).toFixed(2)),
    };
  }, [statementItems]);

  const lastTx = summary.lastTransaction;

  return (
    <section aria-label="Minha Carteira" className="space-y-4">
      {/* =================================================================== */}
      {/* CARTÃO PRINCIPAL: MINHA CARTEIRA                                    */}
      {/* =================================================================== */}
      <div className="rounded-3xl bg-gradient-to-br from-[#131726] via-[#101320] to-[#181224] border border-emerald-500/25 shadow-2xl overflow-hidden relative">
        <div className="absolute -right-12 -top-12 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-5 sm:p-6 relative z-10 space-y-5">
          {/* Cabeçalho da Carteira */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
                    Minha Carteira
                  </h2>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      summary.isSimulation
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    }`}
                  >
                    {summary.isSimulation ? 'Ambiente Sandbox' : 'Produção Auditada'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{summary.ledgerModeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshWalletData}
                title="Atualizar saldos a partir do livro-razão"
                aria-label="Atualizar saldos da carteira"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={toggleHideBalance}
                aria-label={
                  hideBalance ? 'Revelar valores da carteira' : 'Ocultar valores da carteira'
                }
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {hideBalance ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mostrar saldo</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ocultar saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alerta de erro de acesso ou carregamento */}
          {walletAccessError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs font-semibold flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{walletAccessError}</span>
            </div>
          )}

          {/* Bloco Principal: Saldo Disponível, Saldo Pendente, Total Recebido + Botões de Ação */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/35 border border-white/10 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Indicador 1: Saldo Disponível */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Saldo disponível</span>
                </div>
                <div
                  data-testid="wallet-available-balance"
                  className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight tabular-nums"
                >
                  {renderMonetaryValue(summary.availableBalanceBrl)}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>
                    Mínimo para saque:{' '}
                    <strong className="text-emerald-300 tabular-nums">
                      {formatCurrencyBrl(summary.minimumWithdrawalBrl)}
                    </strong>{' '}
                    (PIX isento de tarifa)
                  </span>
                  <span className="hidden sm:inline text-slate-600">·</span>
                  <span>
                    status:{' '}
                    <strong className={canWithdrawNow ? 'text-emerald-300' : 'text-amber-300'}>
                      {canWithdrawNow
                        ? 'Elegível para solicitar saque'
                        : `Faltam ${formatCurrencyBrl(missingForMinimumBrl)} para o mínimo`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Botões Principais: Solicitar saque & Ver extrato */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="wallet-withdraw-btn"
                  onClick={openWithdrawModal}
                  disabled={Boolean(walletAccessError)}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Solicitar saque</span>
                </button>

                <button
                  type="button"
                  data-testid="wallet-statement-btn"
                  onClick={() => setIsStatementModalOpen(true)}
                  disabled={Boolean(walletAccessError)}
                  className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-slate-300" />
                  <span>Ver extrato</span>
                </button>
              </div>
            </div>

            {/* Indicadores 2 e 3: Saldo Pendente & Total Recebido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Saldo pendente</span>
                  </div>
                  <div
                    data-testid="wallet-pending-balance"
                    className="text-lg sm:text-xl font-display font-extrabold text-white tabular-nums"
                  >
                    {renderMonetaryValue(summary.totalPendingBrl)}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    Retenção D+14: {renderMonetaryValue(summary.pendingReviewBrl)} · Reserva de
                    saque: {renderMonetaryValue(summary.payoutReservedBrl)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total recebido</span>
                  </div>
                  <div
                    data-testid="wallet-total-received"
                    className="text-lg sm:text-xl font-display font-extrabold text-white tabular-nums"
                  >
                    {renderMonetaryValue(summary.totalReceivedPeriodBrl)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Entradas históricas confirmadas em BRL (sem duplicidades)
                  </div>
                </div>
              </div>
            </div>

            {/* Indicador 4: Última Movimentação */}
            <div
              data-testid="wallet-last-transaction"
              className="p-3.5 rounded-xl bg-[#0d101d]/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-200">Última movimentação</span>
                    {lastTx && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(lastTx.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-emerald-300">{lastTx.statusLabel}</span>
                      </>
                    )}
                  </div>

                  {lastTx ? (
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {lastTx.description}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      Nenhuma movimentação financeira registrada neste ambiente até o momento.
                    </div>
                  )}
                </div>
              </div>

              {lastTx && (
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div
                    className={`text-sm font-display font-extrabold tabular-nums ${
                      lastTx.direction === 'credit' ? 'text-emerald-400' : 'text-sky-300'
                    }`}
                  >
                    {lastTx.direction === 'credit' ? '+' : '-'}{' '}
                    {renderMonetaryValue(lastTx.amountBrl)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStatementCategory('all');
                      setStatementStatusFilter('all');
                      setIsStatementModalOpen(true);
                    }}
                    className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    Ref: {lastTx.referenceId}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Segregação de Origens: Colaboradores vs Produtores de Conteúdo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: Valores recebidos de colaboradores */}
            <div className="p-4 rounded-2xl bg-[#141829]/90 border border-indigo-500/25 hover:border-indigo-500/45 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Valores recebidos de colaboradores
                  </span>
                  <div
                    data-testid="wallet-collaborator-received"
                    className="text-xl sm:text-2xl font-display font-extrabold text-white tabular-nums"
                  >
                    {renderMonetaryValue(summary.collaboratorReceivedBrl)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatementCategory('collaborator');
                    setIsStatementModalOpen(true);
                  }}
                  className="text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>Detalhar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
                <span>Indicações verificadas, comissões e metas de desafios</span>
                {summary.collaboratorPendingBrl > 0 && (
                  <span className="text-amber-300 font-semibold shrink-0 ml-2 tabular-nums">
                    + {renderMonetaryValue(summary.collaboratorPendingBrl)} pendente
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Valores recebidos de produtores de conteúdo */}
            <div className="p-4 rounded-2xl bg-[#1a1426]/90 border border-rose-500/25 hover:border-rose-500/45 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                    <Video className="w-3.5 h-3.5 text-rose-400" />
                    Valores recebidos de produtores de conteúdo
                  </span>
                  <div
                    data-testid="wallet-producer-received"
                    className="text-xl sm:text-2xl font-display font-extrabold text-white tabular-nums"
                  >
                    {renderMonetaryValue(summary.contentProducerReceivedBrl)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatementCategory('content_producer');
                    setIsStatementModalOpen(true);
                  }}
                  className="text-[11px] text-rose-300 hover:text-rose-200 font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>Detalhar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
                <span>Repasse líquido 70% de fotos/vídeos VIP e presentes em lives</span>
                {summary.contentProducerPendingBrl > 0 && (
                  <span className="text-amber-300 font-semibold shrink-0 ml-2 tabular-nums">
                    + {renderMonetaryValue(summary.contentProducerPendingBrl)} em retenção
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Linha de Estados Contábeis Complementares (Retenção D+14, Reserva Escrow e Créditos Separados) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Pendente / Em análise
                  </div>
                  <div className="text-xs font-bold text-amber-300 tabular-nums">
                    {renderMonetaryValue(summary.pendingReviewBrl)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Retenção D+14</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Saques em processamento
                  </div>
                  <div className="text-xs font-bold text-sky-300 tabular-nums">
                    {renderMonetaryValue(summary.payoutReservedBrl)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Reserva Escrow</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Créditos de consumo (Não sacáveis)
                  </div>
                  <div className="text-xs font-bold text-purple-300 tabular-nums">
                    {hideBalance ? '••• 💎' : `${summary.userConsumptionCredits} 💎`}
                  </div>
                </div>
              </div>
              {onOpenCreditsWallet && (
                <button
                  type="button"
                  onClick={onOpenCreditsWallet}
                  className="text-[10px] font-bold text-purple-300 hover:text-purple-200 underline cursor-pointer"
                >
                  Recarregar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL DE SOLICITAÇÃO DE SAQUE ("SOLICITAR SAQUE")                   */}
      {/* =================================================================== */}
      {isWithdrawModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#111422] border border-white/15 shadow-2xl overflow-hidden">
            {/* Topo do Modal */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#15192b]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="withdraw-modal-title"
                    className="text-base font-display font-extrabold text-white"
                  >
                    Solicitar Saque PIX
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {summary.isSimulation
                      ? 'Ambiente Sandbox · Reserva contábil sem transferência bancária externa'
                      : 'Ambiente de Produção · Reserva contábil sujeita à validação antifraude'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Resumo de Saldo Disponível e Regras Reais */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">Saldo disponível para saque</div>
                  <div className="text-xl font-display font-extrabold text-emerald-400 tabular-nums">
                    {formatCurrencyBrl(summary.availableBalanceBrl)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Valor mínimo / Tarifa PIX</div>
                  <div className="text-sm font-bold text-white tabular-nums">
                    {formatCurrencyBrl(summary.minimumWithdrawalBrl)} ·{' '}
                    <span className="text-emerald-300">Tarifa R$ 0,00</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{summary.estimatedSettlementSla}</div>
                </div>
              </div>

              {/* Aviso de Requisitos Pendentes quando saldo disponível < R$ 50,00 */}
              {!canWithdrawNow && (
                <div
                  data-testid="withdraw-eligibility-warning"
                  className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs space-y-1.5"
                >
                  <div className="font-bold flex items-center gap-2 text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Requisitos de Elegibilidade para Saque</span>
                  </div>
                  <p className="leading-relaxed">
                    Para solicitar um saque via PIX, é necessário possuir saldo disponível confirmado
                    de pelo menos{' '}
                    <strong>{formatCurrencyBrl(summary.minimumWithdrawalBrl)}</strong>. No momento,
                    seu saldo disponível é{' '}
                    <strong>{formatCurrencyBrl(summary.availableBalanceBrl)}</strong> (faltam{' '}
                    <strong>{formatCurrencyBrl(missingForMinimumBrl)}</strong>).
                  </p>
                  {summary.totalPendingBrl > 0 && (
                    <p className="text-[11px] text-amber-300/90">
                      Você possui <strong>{formatCurrencyBrl(summary.totalPendingBrl)}</strong> em
                      saldo pendente aguardando confirmação ou liberação de retenção D+14.
                    </p>
                  )}
                </div>
              )}

              {withdrawError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* ETAPA 1: FORMULÁRIO DE SAQUE */}
              {withdrawStep === 'form' && (
                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Valor que deseja sacar (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white font-display font-bold text-lg tabular-nums focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setAmountInput('50,00')}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 cursor-pointer"
                      >
                        Mínimo (R$ 50,00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountInput('100,00')}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 cursor-pointer"
                      >
                        R$ 100,00
                      </button>
                      {summary.availableBalanceCents >= 5000 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAmountInput(
                              (summary.availableBalanceCents / 100).toFixed(2).replace('.', ',')
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 cursor-pointer"
                        >
                          Sacar Tudo ({formatCurrencyBrl(summary.availableBalanceBrl)})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seleção e Validação da Chave PIX */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-300">
                      Destino de recebimento PIX (Mesma titularidade)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'] as PixKeyType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPixKeyType(type)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            pixKeyType === type
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {type === 'EMAIL'
                            ? 'E-mail'
                            : type === 'PHONE'
                            ? 'Celular'
                            : type === 'RANDOM'
                            ? 'Aleatória'
                            : type}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={pixKeyInput}
                      onChange={(e) => setPixKeyInput(e.target.value)}
                      placeholder={
                        pixKeyType === 'CPF'
                          ? '000.000.000-00'
                          : pixKeyType === 'CNPJ'
                          ? '00.000.000/0001-00'
                          : pixKeyType === 'EMAIL'
                          ? 'seuemail@dominio.com.br'
                          : pixKeyType === 'PHONE'
                          ? '(11) 99999-9999'
                          : 'Chave aleatória EVP de 32 caracteres'
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400"
                    />
                    {pixKeyInput.trim().length > 0 && (
                      <div
                        className={`text-[11px] flex items-center gap-1.5 ${
                          pixValidation.valid ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {pixValidation.valid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Chave validada: {pixValidation.maskedKey}</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{pixValidation.errorMessage}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirmação de Titularidade */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={holderConfirmed}
                      onChange={(e) => setHolderConfirmed(e.target.checked)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Confirmo que a chave PIX informada está vinculada ao meu próprio CPF/CNPJ
                      cadastrado e validado na plataforma JOBS.
                    </span>
                  </label>

                  {/* Simulação de Valor Líquido */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Valor bruto solicitado:</span>
                      <span className="font-bold text-white tabular-nums">
                        {formatCurrencyBrl(parsedWithdrawBrl)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Tarifa PIX Verificado:</span>
                      <span className="font-bold text-emerald-400">R$ 0,00 (Isento)</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-white border-t border-white/10 pt-1.5">
                      <span>Valor líquido estimado a receber:</span>
                      <span className="text-emerald-400 tabular-nums">
                        {formatCurrencyBrl(parsedWithdrawBrl)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!canWithdrawNow}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Revisar Operação</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ETAPA 2: CONFIRMAÇÃO COM RESUMO DA OPERAÇÃO */}
              {withdrawStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs">
                    <div className="text-sm font-extrabold text-white mb-1">
                      Confirme os dados da solicitação de saque
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beneficiário:</span>
                      <span className="font-bold text-white">{userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destino PIX validado:</span>
                      <span className="font-bold text-emerald-300">
                        {pixKeyType} · {pixValidation.maskedKey}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor bruto do saque:</span>
                      <span className="font-bold text-white tabular-nums">
                        {formatCurrencyBrl(parsedWithdrawBrl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tarifa aplicável:</span>
                      <span className="font-bold text-emerald-400">R$ 0,00</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold border-t border-white/10 pt-2">
                      <span className="text-white">Valor líquido a receber:</span>
                      <span className="text-emerald-400 tabular-nums">
                        {formatCurrencyBrl(parsedWithdrawBrl)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Prazo operacional estimado:</span>
                      <span className="text-slate-200 font-semibold">
                        {summary.estimatedSettlementSla}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Chave de Idempotência:</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {activeIdempotencyKey.slice(0, 22)}...
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                    <strong>Transparência Contábil:</strong> Ao confirmar, o valor será reservado
                    atomicamente no livro-razão (status <em>Em análise / under_review</em>). A
                    solicitação não representa transferência bancária já concluída até a liquidação
                    final.
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawStep('form')}
                      disabled={isSubmittingWithdraw}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Voltar e editar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmWithdraw}
                      disabled={isSubmittingWithdraw}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isSubmittingWithdraw
                          ? 'Registrando no Livro-Razão...'
                          : 'Confirmar Solicitação de Saque'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 3: COMPROVANTE DE SOLICITAÇÃO REGISTRADA */}
              {withdrawStep === 'receipt' && completedPayout && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-sm font-extrabold text-white">
                        Solicitação de saque registrada com sucesso!
                      </div>
                      <p className="text-xs text-emerald-200 leading-relaxed">
                        O valor de{' '}
                        <strong>{formatCurrencyBrl(completedPayout.payout.netAmountBrl)}</strong>{' '}
                        foi reservado de forma atômica no livro-razão e encontra-se com status{' '}
                        <strong>Em análise (under_review)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Protocolo da Solicitação:</span>
                      <span className="font-mono font-bold text-white">
                        {completedPayout.payout.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lançamento no Livro-Razão:</span>
                      <span className="font-mono text-slate-200">
                        {completedPayout.ledgerEntry?.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Atual:</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                        Em Análise Antifraude (Reserva Escrow)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destino PIX:</span>
                      <span className="font-semibold text-white">
                        {completedPayout.payout.payoutMethod} ·{' '}
                        {completedPayout.payout.pixKeyOrAccount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ambiente:</span>
                      <span className="font-bold uppercase text-amber-300">
                        {completedPayout.payout.environment}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                    >
                      Concluir e Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE EXTRATO DETALHADO ("VER EXTRATO")                          */}
      {/* =================================================================== */}
      {isStatementModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="statement-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-3xl rounded-3xl bg-[#101320] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Cabeçalho do Extrato */}
            <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#15192b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="statement-modal-title"
                    className="text-base sm:text-lg font-display font-extrabold text-white"
                  >
                    Extrato Detalhado — Minha Carteira (BRL)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico imutável auditado pelo Livro-Razão SHA-256 · Entradas, saídas,
                    estornos, ajustes e saques
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenCreditsWallet && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatementModalOpen(false);
                      onOpenCreditsWallet();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 text-purple-300" />
                    <span>Extrato de Créditos (💎)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de Filtros e Resumo */}
            <div className="p-4 border-b border-white/10 bg-black/30 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'collaborator', label: 'Colaboradores' },
                    { id: 'content_producer', label: 'Produtores (70%)' },
                    { id: 'payout', label: 'Solicitações de Saque' },
                    { id: 'refund', label: 'Estornos' },
                    { id: 'adjustment', label: 'Ajustes' },
                  ] as Array<{ id: WalletStatementCategoryFilter; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatementCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      statementCategory === tab.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                    placeholder="Buscar por descrição, tipo, referência ou ID da transação..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statementStatusFilter}
                    onChange={(e) =>
                      setStatementStatusFilter(e.target.value as WalletStatementStatusFilter)
                    }
                    className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">Todos os status</option>
                    <option value="available">Disponível para Saque</option>
                    <option value="pending_review">Pendente / Retenção D+14</option>
                    <option value="payout_reserved">Solicitação de Saque (Escrow)</option>
                    <option value="payout_released">Saque Liquidado</option>
                    <option value="refunded">Estornado</option>
                    <option value="adjusted">Ajuste Auditado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Entradas no filtro</span>
                  <strong className="text-emerald-400 tabular-nums">
                    + {formatCurrencyBrl(statementTotals.creditsBrl)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Saídas / Reservas</span>
                  <strong className="text-sky-300 tabular-nums">
                    - {formatCurrencyBrl(statementTotals.debitsBrl)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Saldo Disponível Atual</span>
                  <strong className="text-white tabular-nums">
                    {formatCurrencyBrl(summary.availableBalanceBrl)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Lista de Lançamentos */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {statementItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum lançamento contábil encontrado para os filtros selecionados.
                </div>
              ) : (
                statementItems.map((item: UnifiedWalletStatementItem) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-slate-200">{item.categoryLabel}</span>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-400 font-semibold">{item.subTypeLabel}</span>
                        <span className="text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={`font-bold ${
                            item.status === 'available' || item.status === 'payout_released'
                              ? 'text-emerald-300'
                              : item.status === 'pending_review'
                              ? 'text-amber-300'
                              : item.status === 'refunded'
                              ? 'text-rose-300'
                              : 'text-sky-300'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {item.description}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>
                          {new Date(item.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>Ref: {item.referenceId}</span>
                        <span>ID: {item.id}</span>
                        <span>Idemp: {item.idempotencyKeyMasked}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div
                        className={`text-base font-display font-extrabold tabular-nums ${
                          item.direction === 'credit' ? 'text-emerald-400' : 'text-sky-300'
                        }`}
                      >
                        {item.direction === 'credit' ? '+' : '-'}{' '}
                        {formatCurrencyBrl(item.amountBrl)} ({item.currency})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.isSandbox ? 'Sandbox Auditado' : 'Produção Auditada'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
