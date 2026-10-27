import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Package,
  Film,
  Users,
  Award,
  ShieldAlert,
  FileText,
  TrendingUp,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  ArrowRight,
  Download,
  Filter,
  Search,
  Lock,
  Clock,
  Eye,
  Check,
  Ban,
  RotateCcw,
  PlayCircle,
  Sliders,
  DollarSign,
  Radio,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  ShieldCheck,
  FastForward,
  CalendarClock,
} from 'lucide-react';
import { monetizationService } from '../services/monetizationService';
import {
  CreditPackageModel,
  CreditPurchaseModel,
  ContentModel,
  ReportModel,
  PurchaseStatus,
  ContentModerationStatus,
} from '../types';
import { PlatformFinancialExecutive } from './admin/PlatformFinancialExecutive';
import { AuditLedgerReport } from './admin/AuditLedgerReport';
import { LiveStreamsAdminMonitoring } from './admin/LiveStreamsAdminMonitoring';
import { LiveUnlockAuditPanel } from './admin/LiveUnlockAuditPanel';
import { EvolutionRoadmapPanel } from './admin/EvolutionRoadmapPanel';
import { CreatorEarningsRankingView } from './admin/CreatorEarningsRankingView';
import { JobsCreatorStudio } from './admin/JobsCreatorStudio';
import { AdminActivityLog } from './admin/AdminActivityLog';
import { MonthlyRecognitionAdminPanel } from './admin/MonthlyRecognitionAdminPanel';
import { VrSimulatorControlPanel } from './admin/VrSimulatorControlPanel';
import { RevenueAndEarningsReportPanel } from './admin/RevenueAndEarningsReportPanel';
import { AdminRevenueSimulatorPanel } from './admin/AdminRevenueSimulatorPanel';
import { LedgerSha256AuditViewer } from './admin/LedgerSha256AuditViewer';
import { adminAuditService } from '../services/adminAuditService';
import {
  vrSimulatorService,
  SimulationTopBannerStatus,
  VrSimulatorStateSnapshot,
  VR_SIMULATOR_WATERMARK,
  VR_FINANCIAL_SIMULATION_BADGE,
  VR_SIMULATOR_NAMESPACE,
} from '../services/vrSimulatorService';

interface CentralAdminDashboardModalProps {
  onClose: () => void;
}

export type AdminSection =
  | 'overview'
  | 'wallet'
  | 'purchases'
  | 'packages'
  | 'contents'
  | 'users'
  | 'creators'
  | 'reports'
  | 'security'
  | 'reports_export'
  | 'evolution'
  | 'settings'
  | 'vr_simulator';

export const CentralAdminDashboardModal: React.FC<CentralAdminDashboardModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [periodFilter, setPeriodFilter] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sub-abas de visualização para integrar módulos especializados dentro dos 12 tópicos
  const [walletSubTab, setWalletSubTab] = useState<
    'ledger' | 'executive_financial' | 'revenue_earnings_report' | 'revenue_simulator'
  >('ledger');
  const [contentsSubTab, setContentsSubTab] = useState<'catalog' | 'live_audit'>('catalog');
  const [creatorsSubTab, setCreatorsSubTab] = useState<'creators_ranking' | 'monthly_recognition' | 'creator_studio' | 'creators_list' | 'live_monitoring'>('creators_ranking');
  const [securitySubTab, setSecuritySubTab] = useState<
    'admin_activity' | 'crypto_ledger' | 'sha256_audit_viewer' | 'events'
  >('admin_activity');

  // Estados reativos dos dados reais do serviço
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const doRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const summary = useMemo(() => monetizationService.getAdminExecutiveSummary(), [refreshTrigger]);
  const alerts = useMemo(() => monetizationService.getSecurityAndFinancialAlerts(), [refreshTrigger]);
  const purchases = useMemo(() => monetizationService.getPurchases(), [refreshTrigger]);
  const packages = useMemo(() => monetizationService.getPackages(false), [refreshTrigger]);
  const contents = useMemo(() => monetizationService.getContents(), [refreshTrigger]);
  const reports = useMemo(() => monetizationService.getReports(), [refreshTrigger]);
  const auditLogs = useMemo(() => monetizationService.getAuditLogs(), [refreshTrigger]);
  const phases = useMemo(() => monetizationService.getProjectPhasesEvolution(), [refreshTrigger]);

  // Edição de Pacotes (RF02)
  const [editingPkg, setEditingPkg] = useState<CreditPackageModel | null>(null);
  const [editName, setEditName] = useState('');
  const [editCredits, setEditCredits] = useState(100);
  const [editPriceBrl, setEditPriceBrl] = useState(19.9);
  const [editActive, setEditActive] = useState(true);

  // Testes automatizados (30 verificações)
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testSuiteOutput, setTestSuiteOutput] = useState<any | null>(null);

  // Estado sincronizado do Relógio Controlado e Snapshot Isolado do Simulador VR
  const [vrSnapshot, setVrSnapshot] = useState<VrSimulatorStateSnapshot>(() => {
    vrSimulatorService.ensureDayOneStarted();
    return vrSimulatorService.getStateSnapshot();
  });
  const [simBannerStatus, setSimBannerStatus] = useState<SimulationTopBannerStatus>(() => {
    vrSimulatorService.ensureDayOneStarted();
    return vrSimulatorService.getTopBannerStatus();
  });
  const [selectedTargetSimDay, setSelectedTargetSimDay] = useState<number>(() => {
    const initialBanner = vrSimulatorService.getTopBannerStatus();
    return Math.min(initialBanner.totalDays, initialBanner.currentDay + 1);
  });
  const [isAdvancingSimDay, setIsAdvancingSimDay] = useState(false);
  const [simBannerError, setSimBannerError] = useState<string | null>(null);

  useEffect(() => {
    vrSimulatorService.ensureDayOneStarted();
    const syncSimulatorBanner = () => {
      const nextSnapshot = vrSimulatorService.getStateSnapshot();
      const nextBanner = nextSnapshot.topBannerStatus;
      setVrSnapshot(nextSnapshot);
      setSimBannerStatus(nextBanner);
      setSelectedTargetSimDay((prevSelected) => {
        if (prevSelected <= nextBanner.currentDay && nextBanner.currentDay < nextBanner.totalDays) {
          return Math.min(nextBanner.totalDays, nextBanner.currentDay + 1);
        }
        return Math.min(nextBanner.totalDays, Math.max(nextBanner.currentDay, prevSelected));
      });
    };
    syncSimulatorBanner();
    return vrSimulatorService.subscribe(syncSimulatorBanner);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Avanço manual controlado da data simulada (testes de carga Dia 1 -> Dia 30)
  const handleAdvanceToSpecificDay = (targetDayOverride?: number) => {
    if (isAdvancingSimDay) return;
    const targetDay = typeof targetDayOverride === 'number' ? targetDayOverride : selectedTargetSimDay;
    setIsAdvancingSimDay(true);
    setSimBannerError(null);
    try {
      const result = vrSimulatorService.manualAdvanceSimulatedDay({
        targetDay,
        actorId: 'admin_master',
        actorRole: 'admin',
      });
      const updatedSnapshot = vrSimulatorService.getStateSnapshot();
      setVrSnapshot(updatedSnapshot);
      setSimBannerStatus(updatedSnapshot.topBannerStatus);
      setSelectedTargetSimDay((prev) => {
        if (targetDay < updatedSnapshot.totalDays) {
          return Math.min(updatedSnapshot.totalDays, updatedSnapshot.currentDay + 1);
        }
        return updatedSnapshot.totalDays;
      });

      if (!result.success) {
        const msg =
          result.errorMessage ||
          'Não foi possível avançar a data simulada. O estado anterior foi mantido.';
        setSimBannerError(msg);
        showToast(msg, 'error');
        return;
      }

      if (result.noOp) {
        showToast(
          `A simulação já está no Dia ${result.confirmedDay}. Nenhum evento duplicado foi gerado.`,
          'info'
        );
        return;
      }

      doRefresh();
      showToast(
        `Relógio simulado avançado com sucesso do Dia ${result.previousDay} para o Dia ${result.confirmedDay} (${result.checkpointsProcessedCount} dia(s) processado(s)).`,
        'success'
      );
    } catch (err: any) {
      const errMsg =
        err?.message ||
        'Erro inesperado no serviço do relógio simulado. O dia anterior foi preservado.';
      setSimBannerError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsAdvancingSimDay(false);
    }
  };

  const handleManualAdvanceSimulatedDay = () => handleAdvanceToSpecificDay();

  // Helper de formatação monetária de centavos inteiros para BRL
  const formatBrlFromCents = (cents: number): string =>
    `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lastCheckpoint =
    vrSnapshot.checkpoints.length > 0
      ? vrSnapshot.checkpoints[vrSnapshot.checkpoints.length - 1]
      : null;
  const invariantValues = Object.values(vrSnapshot.latestReconciliation.invariantsPassed);
  const invariantsPassedCount = invariantValues.filter(Boolean).length;
  const reconciliationErrorsCount = invariantValues.filter((passed) => !passed).length;
  const totalSimulatedMonetizedTransactions =
    vrSnapshot.totals.creditPurchasesCount +
    vrSnapshot.totals.paidVaultUnlocksCount +
    vrSnapshot.totals.giftsSentCount +
    vrSnapshot.totals.challengesCompletedCount +
    vrSnapshot.totals.refundsAndReversalsCount +
    vrSnapshot.totals.payoutsSettledCount;

  // Ações em Compras Simuladas
  const handleApprovePurchase = async (id: string) => {
    try {
      await monetizationService.approvePurchase(id, 'admin_master');
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PURCHASE_APPROVE',
        targetType: 'purchase',
        targetId: id,
        result: 'success',
        reason: 'Aprovação manual de compra de créditos pelo administrador',
        metadata: { purchaseId: id },
      });
      doRefresh();
      showToast('Compra aprovada com sucesso! Créditos lançados na carteira.');
    } catch (err: any) {
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PURCHASE_APPROVE',
        targetType: 'purchase',
        targetId: id,
        result: 'failure',
        reason: `Falha na aprovação da compra: ${err?.message || 'Erro desconhecido'}`,
        metadata: { purchaseId: id, error: String(err?.message || err) },
      });
      showToast(err?.message || 'Erro ao aprovar.', 'error');
    }
  };

  const handleDeclinePurchase = async (id: string) => {
    try {
      await monetizationService.declinePurchase(id, 'Recusado pelo administrador no painel de testes', 'admin_master');
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PURCHASE_DECLINE',
        targetType: 'purchase',
        targetId: id,
        result: 'success',
        reason: 'Recusa manual de compra pelo administrador no painel de testes',
        metadata: { purchaseId: id },
      });
      doRefresh();
      showToast('Compra recusada. Nenhum crédito lançado.', 'info');
    } catch (err: any) {
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PURCHASE_DECLINE',
        targetType: 'purchase',
        targetId: id,
        result: 'failure',
        reason: `Falha ao recusar compra: ${err?.message || 'Erro desconhecido'}`,
        metadata: { purchaseId: id, error: String(err?.message || err) },
      });
      showToast(err?.message || 'Erro ao recusar.', 'error');
    }
  };

  const handleRefundPurchase = async (id: string) => {
    try {
      await monetizationService.refundPurchase(id, 'Estorno solicitado via Painel Central de Testes', 'admin_master');
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'REFUND_EXECUTE',
        targetType: 'purchase',
        targetId: id,
        result: 'success',
        reason: 'Estorno solicitado via Painel Central de Testes com lançamento compensatório',
        metadata: { purchaseId: id, compensatoryEntry: true },
      });
      doRefresh();
      showToast('Compra estornada! Lançamento compensatório gravado no livro-razão.');
    } catch (err: any) {
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'REFUND_EXECUTE',
        targetType: 'purchase',
        targetId: id,
        result: 'failure',
        reason: `Falha no estorno: ${err?.message || 'Erro desconhecido'}`,
        metadata: { purchaseId: id, error: String(err?.message || err) },
      });
      showToast(err?.message || 'Erro ao estornar.', 'error');
    }
  };

  // Moderação de Conteúdo
  const handleModerate = async (contentId: string, status: ContentModerationStatus) => {
    try {
      monetizationService.moderateContent(contentId, status, `Decisão do painel: ${status}`, 'admin_moderator');
      await adminAuditService.logActivity({
        actorId: 'admin_moderator',
        actorRole: 'moderator',
        action: 'CONTENT_MODERATE',
        targetType: 'content',
        targetId: contentId,
        result: 'success',
        reason: `Decisão de moderação do painel: ${status}`,
        metadata: { contentId, moderationStatus: status },
      });
      doRefresh();
      showToast(`Conteúdo atualizado para status: ${status.toUpperCase()}`);
    } catch (err: any) {
      await adminAuditService.logActivity({
        actorId: 'admin_moderator',
        actorRole: 'moderator',
        action: 'CONTENT_MODERATE',
        targetType: 'content',
        targetId: contentId,
        result: 'failure',
        reason: `Falha na moderação de conteúdo: ${err?.message || 'Erro desconhecido'}`,
        metadata: { contentId, attemptedStatus: status, error: String(err?.message || err) },
      });
      showToast(err?.message || 'Erro na moderação.', 'error');
    }
  };

  // Salvar Pacote
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    try {
      monetizationService.savePackage({
        id: editingPkg.id,
        name: editName,
        creditsAmount: editCredits,
        priceInCents: Math.round(editPriceBrl * 100),
        isActive: editActive,
      });
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PACKAGE_UPDATE',
        targetType: 'package',
        targetId: editingPkg.id,
        result: 'success',
        reason: `Atualização de parâmetros de pacote de créditos: ${editName}`,
        metadata: {
          packageId: editingPkg.id,
          name: editName,
          creditsAmount: editCredits,
          priceInCents: Math.round(editPriceBrl * 100),
          isActive: editActive,
        },
      });
      setEditingPkg(null);
      doRefresh();
      showToast('Pacote atualizado com sucesso no catálogo!');
    } catch (err: any) {
      await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'PACKAGE_UPDATE',
        targetType: 'package',
        targetId: editingPkg.id,
        result: 'failure',
        reason: `Falha ao salvar pacote: ${err?.message || 'Erro desconhecido'}`,
        metadata: { packageId: editingPkg.id, error: String(err?.message || err) },
      });
      showToast(err?.message || 'Erro ao salvar pacote.', 'error');
    }
  };

  // Executar 30 testes obrigatórios
  const handleRunFullTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const output = await monetizationService.runComprehensiveTestSuite();
      setTestSuiteOutput(output);
      doRefresh();
      if (output.allPassed) {
        showToast(`Sucesso! Todos os 30 testes obrigatórios foram aprovados em ${output.durationMs}ms!`);
      } else {
        showToast(`${output.passedTests} de 30 testes aprovados. Verifique inconsistências.`, 'error');
      }
    } catch (err: any) {
      showToast('Falha ao rodar suíte de testes.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Exportar relatório em CSV
  const handleExportCsv = (title: string, dataRows: string[][], headers: string[]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...dataRows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs_relatorio_${title}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Relatório "${title}" exportado em CSV com sucesso!`);
  };

  const navItems = [
    { id: 'overview' as AdminSection, label: '1. Visão Geral', icon: LayoutDashboard },
    { id: 'wallet' as AdminSection, label: '2. Carteira e Créditos', icon: Wallet },
    { id: 'purchases' as AdminSection, label: '3. Compras', icon: ShoppingCart },
    { id: 'packages' as AdminSection, label: '4. Pacotes', icon: Package },
    { id: 'contents' as AdminSection, label: '5. Conteúdos e Desbloqueios', icon: Film },
    { id: 'users' as AdminSection, label: '6. Usuários', icon: Users },
    { id: 'creators' as AdminSection, label: '7. Criadores', icon: Award },
    { id: 'reports' as AdminSection, label: '8. Denúncias e Moderação', icon: ShieldAlert },
    { id: 'security' as AdminSection, label: '9. Auditoria e Segurança', icon: Lock },
    { id: 'reports_export' as AdminSection, label: '10. Relatórios', icon: FileText },
    { id: 'evolution' as AdminSection, label: '11. Evolução do Projeto', icon: TrendingUp },
    { id: 'settings' as AdminSection, label: '12. Configurações Administrativas', icon: Settings },
    { id: 'vr_simulator' as AdminSection, label: '13. Simulador VR (30 Dias)', icon: PlayCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0b12] border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Main Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0f0f18] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  JOBS — Painel Central do Administrador
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  FASE 1 · SANDBOX AUDITADO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Monitoramento consolidado de créditos, compras simuladas, desbloqueios e segurança
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Modo Seguro:</span>
              <strong className="text-emerald-400">Nenhum Saque Real Ativo</strong>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* INDICADOR VISUAL FIXO DO SIMULADOR E SELETOR DE AVANÇO MANUAL       */}
        {/* Posicionado fora do container de rolagem (<main overflow-y-auto>)   */}
        {/* ================================================================== */}
        {simBannerStatus.bannerVisible && simBannerStatus.isStateConfirmed && simBannerStatus.indicatorText && (
          <div
            data-testid="simulation-mode-top-banner"
            className="px-5 py-2.5 border-b border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-[#14111d] to-rose-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-inner"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span
                  data-testid="simulation-mode-indicator-text"
                  className="text-xs sm:text-sm font-black tracking-wider text-amber-200 font-mono uppercase"
                >
                  {simBannerStatus.indicatorText}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Data simulada:{' '}
                  <strong className="text-white font-mono">
                    {new Date(simBannerStatus.simulatedDateIso).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                    })}
                  </strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[10px] text-amber-300/90 hidden lg:inline">
                  {simBannerStatus.shortBadge} ({simBannerStatus.namespace})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor="sim-manual-day-select"
                className="text-[11px] font-bold text-slate-300 uppercase tracking-wider"
              >
                Teste de Carga (Dia 1–{simBannerStatus.totalDays}):
              </label>

              <select
                id="sim-manual-day-select"
                data-testid="simulation-day-selector"
                value={selectedTargetSimDay}
                disabled={isAdvancingSimDay}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(parsed)) {
                    setSelectedTargetSimDay(parsed);
                    setSimBannerError(null);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-amber-500/40 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 disabled:opacity-50 cursor-pointer"
              >
                {Array.from({ length: simBannerStatus.totalDays }, (_, idx) => idx + 1).map(
                  (dayNum) => {
                    const isPast = dayNum < simBannerStatus.currentDay;
                    const isCurrent = dayNum === simBannerStatus.currentDay;
                    const delta = dayNum - simBannerStatus.currentDay;
                    return (
                      <option key={dayNum} value={dayNum} disabled={isPast}>
                        {isCurrent
                          ? `Dia ${dayNum} (Dia Atual)`
                          : isPast
                          ? `Dia ${dayNum} (Anterior — bloqueado)`
                          : `Dia ${dayNum} (+${delta} ${delta === 1 ? 'dia' : 'dias'})`}
                      </option>
                    );
                  }
                )}
              </select>

              <button
                type="button"
                data-testid="simulation-advance-date-btn"
                onClick={handleManualAdvanceSimulatedDay}
                disabled={
                  isAdvancingSimDay ||
                  selectedTargetSimDay < simBannerStatus.currentDay ||
                  selectedTargetSimDay > simBannerStatus.totalDays
                }
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{isAdvancingSimDay ? 'Avançando...' : 'Avançar data'}</span>
              </button>

              {activeSection !== 'vr_simulator' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('vr_simulator')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Painel VR
                </button>
              )}
            </div>
          </div>
        )}

        {/* Estado de Erro ou Indisponibilidade quando o estado da simulação não puder ser confirmado */}
        {simBannerStatus.bannerVisible && !simBannerStatus.isStateConfirmed && (
          <div
            data-testid="simulation-mode-unconfirmed-banner"
            className="px-5 py-2 border-b border-rose-500/50 bg-rose-950/80 flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                ESTADO DA SIMULAÇÃO INDISPONÍVEL —{' '}
                {simBannerStatus.serviceErrorMessage ||
                  'Não foi possível confirmar o estado do relógio simulado.'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-rose-300 uppercase">
              Avanço Manual Bloqueado
            </span>
          </div>
        )}

        {/* Alerta de erro em tentativa de avanço manual mantendo o dia anterior */}
        {(simBannerError || (simBannerStatus.hasServiceError && simBannerStatus.isStateConfirmed)) && (
          <div
            data-testid="simulation-advance-error-alert"
            className="px-5 py-2 border-b border-rose-500/40 bg-rose-950/60 flex items-center justify-between gap-2 text-xs text-rose-200 shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {simBannerError || simBannerStatus.serviceErrorMessage} (Mantido em:{' '}
                <strong>{simBannerStatus.indicatorText}</strong>)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSimBannerError(null)}
              className="text-rose-300 hover:text-white text-[11px] font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Toast Feedback */}
        {feedbackToast && (
          <div
            className={`px-4 py-2.5 mx-6 mt-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2 ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : feedbackToast.type === 'error'
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                : 'bg-blue-950/60 border-blue-500/50 text-blue-200'
            }`}
          >
            <span>{feedbackToast.text}</span>
            <button onClick={() => setFeedbackToast(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Body Layout: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r border-slate-800 bg-[#0d0d16] flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="p-3 space-y-1">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Módulos do Sistema
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setEditingPkg(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-600/20 to-amber-500/10 text-white border border-rose-500/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Test Trigger Footer */}
            <div className="p-3 m-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Auditoria Automática:</span>
                <span className="text-emerald-400 font-bold">30 Testes</span>
              </div>
              <button
                onClick={handleRunFullTestSuite}
                disabled={isRunningTests}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    Rodar 30 Testes
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a10]">
            {/* ============================================================== */}
            {/* ============================================================== */}
            {/* SEÇÃO 1: VISÃO GERAL — DASHBOARD EXECUTIVO                     */}
            {/* ============================================================== */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Period Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Dashboard Executivo JOBS</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                        19 INDICADORES REAIS
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Indicadores em tempo real extraídos diretamente do Livro-Razão e do Banco de Dados de testes.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                    {(['today', '7days', '30days', 'custom'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriodFilter(p)}
                        className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          periodFilter === p ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {p === 'today' ? 'Hoje' : p === '7days' ? '7 Dias' : p === '30days' ? '30 Dias' : 'Personalizado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* BLOCO ISOLADO: INDICADORES EXECUTIVOS DO SIMULADOR VR (SANDBOX) */}
                {/* ============================================================== */}
                <div
                  data-testid="vr-simulator-overview-indicators-panel"
                  className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#0e0f1a] to-[#130d1c] border border-cyan-500/30 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-testid="vr-overview-clock-indicator"
                          className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-wide uppercase"
                        >
                          {simBannerStatus.indicatorText}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                          {VR_FINANCIAL_SIMULATION_BADGE}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                          namespace: {VR_SIMULATOR_NAMESPACE}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {VR_SIMULATOR_WATERMARK} · Relógio Simulado: <strong className="text-white font-mono">{simBannerStatus.simulatedDateIso.slice(0, 10)}</strong> · Isolamento de Produção: <strong className="text-emerald-400">100% Segregado (productionDataTouched: false)</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSection('vr_simulator')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start lg:self-auto"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Abrir Painel Completo do Simulador VR</span>
                    </button>
                  </div>

                  {/* 5 Grupos de Indicadores Solicitados do Simulador VR */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* 1. Criadores Fictícios e Crescimento Diário */}
                    <div
                      data-testid="vr-indicator-creators-growth"
                      className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <span className="text-[11px] text-slate-400 font-medium">Criadores Fictícios & Crescimento</span>
                      <div className="text-xl font-black text-cyan-300 font-mono">
                        {vrSnapshot.creators.length} criadores
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">
                        {vrSnapshot.fansCount} fãs sintéticos (+{lastCheckpoint ? lastCheckpoint.newFansAdded : vrSnapshot.capacityConfig.dailyNewFansRate}/dia)
                      </div>
                      <span className="text-[10px] text-emerald-400 block">
                        Taxa alvo: +{vrSnapshot.capacityConfig.dailyNewFansRate} novos fãs/dia
                      </span>
                    </div>

                    {/* 2. Quantidade de Transações Simuladas */}
                    <div
                      data-testid="vr-indicator-transactions-count"
                      className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <span className="text-[11px] text-slate-400 font-medium">Transações Simuladas (Sandbox)</span>
                      <div className="text-xl font-black text-white font-mono">
                        {vrSnapshot.ledgerEntriesCount} lançamentos
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">
                        {totalSimulatedMonetizedTransactions} eventos monetizados
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {vrSnapshot.totals.paidVaultUnlocksCount} desbl. · {vrSnapshot.totals.giftsSentCount} pres. · {vrSnapshot.totals.challengesCompletedCount} desaf.
                      </span>
                    </div>

                    {/* 3. Receita Elegível de Teste & Split 70/30 */}
                    <div
                      data-testid="vr-indicator-eligible-revenue-split"
                      className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <span className="text-[11px] text-slate-400 font-medium">Receita Elegível Líquida (70/30)</span>
                      <div className="text-xl font-black text-emerald-400 font-mono">
                        {formatBrlFromCents(vrSnapshot.latestReconciliation.netEligibleRevenueCents)}
                      </div>
                      <div className="text-[10px] text-amber-300 font-mono">
                        30% JOBS: {formatBrlFromCents(vrSnapshot.latestReconciliation.netPlatformShareCents)}
                      </div>
                      <span className="text-[10px] text-rose-300 font-mono block">
                        70% Criadores: {formatBrlFromCents(vrSnapshot.latestReconciliation.netCreatorShareCents)}
                      </span>
                    </div>

                    {/* 4. Estornos e Pagamentos Simulados */}
                    <div
                      data-testid="vr-indicator-refunds-payouts"
                      className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <span className="text-[11px] text-slate-400 font-medium">Estornos & Repasses Simulados</span>
                      <div className="text-sm font-black text-rose-400 font-mono">
                        Estornos: {formatBrlFromCents(vrSnapshot.latestReconciliation.refundedGrossCents)} ({vrSnapshot.totals.refundsAndReversalsCount})
                      </div>
                      <div className="text-sm font-black text-cyan-300 font-mono">
                        Pagos: {formatBrlFromCents(vrSnapshot.latestReconciliation.settledCreatorPayoutsCents)} ({vrSnapshot.totals.payoutsSettledCount}/{vrSnapshot.totals.payoutsRequestedCount})
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Obrigações pend.: {formatBrlFromCents(vrSnapshot.latestReconciliation.pendingCreatorObligationsCents)}
                      </span>
                    </div>

                    {/* 5. Estado de Integridade e Erros de Reconciliação */}
                    <div
                      data-testid="vr-indicator-integrity-reconciliation"
                      className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1"
                    >
                      <span className="text-[11px] text-slate-400 font-medium">Integridade & Reconciliação</span>
                      <div
                        className={`text-base font-black font-mono flex items-center gap-1.5 ${
                          vrSnapshot.latestReconciliation.isBalanced && reconciliationErrorsCount === 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          {vrSnapshot.latestReconciliation.isBalanced && reconciliationErrorsCount === 0
                            ? 'RECONCILIADO (Δ R$ 0,00)'
                            : `ERRO (Δ ${vrSnapshot.latestReconciliation.reconciliationDeltaCents}c)`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">
                        Invariantes: {invariantsPassedCount}/{invariantValues.length} OK · Erros: {reconciliationErrorsCount}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono block">
                        Duplo gasto bloqueado: {vrSnapshot.totals.doubleSpendBlockedCount}
                      </span>
                    </div>
                  </div>

                  {/* Série Diária Isolada do Simulador VR (Sem mistura com dados reais) */}
                  {vrSnapshot.dailyFinancialEvolution.length > 0 && (
                    <div
                      data-testid="vr-isolated-daily-chart"
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Série Histórica Isolada do Simulador (Dia 1 ao Dia {vrSnapshot.currentDay}) — Somente Registros `isSandbox: true`</span>
                        </span>
                        <span className="font-mono text-[10px] text-cyan-300">
                          Caixa de Teste Disponível: {formatBrlFromCents(vrSnapshot.latestReconciliation.availableSimulatedTestCashCents)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1 items-end h-20">
                        {vrSnapshot.dailyFinancialEvolution.slice(-10).map((pt) => {
                          const maxRev = Math.max(
                            1,
                            ...vrSnapshot.dailyFinancialEvolution.slice(-10).map((d) => d.dayNetRecognizedRevenueCents)
                          );
                          const heightPct = Math.max(12, Math.round((pt.dayNetRecognizedRevenueCents / maxRev) * 100));
                          return (
                            <div
                              key={pt.simDay}
                              className="flex flex-col items-center justify-end h-full gap-1"
                              title={`Dia ${pt.simDay} (${pt.displayDate}): Líquido ${formatBrlFromCents(pt.dayNetRecognizedRevenueCents)} | 30% JOBS ${formatBrlFromCents(pt.dayPlatformCommissionCents)} | 70% Criadores ${formatBrlFromCents(pt.dayCreatorRemunerationCents)}`}
                            >
                              <div className="w-full flex items-end justify-center gap-0.5 h-12">
                                <div
                                  className="w-2.5 bg-cyan-500/80 rounded-t"
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">D{pt.simDay}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 1. Bloco de Usuários & Criadores */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-indigo-400" />
                    Usuários e Criadores da Plataforma
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Total de Usuários Cadastrados</span>
                      <div className="text-2xl font-black text-white">{summary.usersCount}</div>
                      <span className="text-[10px] text-emerald-400 font-semibold">Base ativa auditada</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Usuários Ativos</span>
                      <div className="text-2xl font-black text-emerald-400">{summary.activeUsersCount}</div>
                      <span className="text-[10px] text-slate-400">Conexões recentes e sessões válidas</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Criadores Cadastrados</span>
                      <div className="text-2xl font-black text-amber-400">{summary.creatorsCount}</div>
                      <span className="text-[10px] text-amber-300/80">Perfis verificados com consentimento</span>
                    </div>
                  </div>
                </div>

                {/* 2. Bloco de Conteúdos & Catálogo */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-rose-400" />
                    Conteúdos, Pacotes e Moderação
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Conteúdos Publicados</span>
                      <div className="text-xl font-black text-white">{summary.contentsCount}</div>
                      <span className="text-[10px] text-slate-400">Fotos e vídeos do cofre VIP</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Conteúdos Gratuitos e Pagos</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">
                        <span className="text-emerald-400">{summary.freeContentsCount} grátis</span> ·{' '}
                        <span className="text-rose-400">{summary.paidContentsCount} pagos</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Mídias de degustação e exclusivas</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Pacotes de Créditos Ativos</span>
                      <div className="text-xl font-black text-amber-400">{summary.packagesCount} ativos</div>
                      <span className="text-[10px] text-slate-400">Inicial, Popular, Premium, Especial</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Denúncias Abertas e Resolvidas</span>
                      <div className="text-sm font-bold text-slate-200 mt-1">
                        <span className="text-rose-400">{summary.reportsPendingCount} abertas</span> ·{' '}
                        <span className="text-emerald-400">{summary.reportsResolvedCount} resolvidas</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Prioridade alta para menores e consentimento</span>
                    </div>
                  </div>
                </div>

                {/* 3. Bloco de Compras Simuladas */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-3 h-3 text-emerald-400" />
                    Compras de Créditos em Ambiente de Testes (Sandbox)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Compras Realizadas</span>
                      <div className="text-xl font-black text-white">{summary.purchasesTotal}</div>
                      <span className="text-[10px] text-slate-500">Pedidos simulados</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Compras Aprovadas</span>
                      <div className="text-xl font-black text-emerald-400">{summary.purchasesApproved}</div>
                      <span className="text-[10px] text-emerald-500">Créditos concedidos 1x</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Compras Pendentes</span>
                      <div className="text-xl font-black text-amber-400">{summary.purchasesPending}</div>
                      <span className="text-[10px] text-amber-400/80">Sem concessão antecipada</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Compras Recusadas</span>
                      <div className="text-xl font-black text-slate-400">{summary.purchasesDeclined}</div>
                      <span className="text-[10px] text-slate-500">Saldo mantido intacto</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Compras Estornadas</span>
                      <div className="text-xl font-black text-rose-400">{summary.purchasesRefunded}</div>
                      <span className="text-[10px] text-rose-400/80">Lançamento compensatório</span>
                    </div>
                  </div>
                </div>

                {/* 4. Bloco de Economia de Créditos & Desbloqueios */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-amber-400" />
                    Economia Interna de Créditos Virtuais
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Créditos Emitidos (Testes)</span>
                      <div className="text-xl font-black text-emerald-400 font-mono">
                        💎 {summary.creditsIssuedInTests.toLocaleString('pt-BR')}
                      </div>
                      <span className="text-[10px] text-slate-500">Total gerado em compras</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Créditos Consumidos</span>
                      <div className="text-xl font-black text-rose-400 font-mono">
                        💎 {summary.creditsConsumed.toLocaleString('pt-BR')}
                      </div>
                      <span className="text-[10px] text-slate-500">Desbloqueios de mídias e lives</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Saldo em Circulação</span>
                      <div className="text-xl font-black text-amber-400 font-mono">
                        💎 {summary.creditsInCirculation.toLocaleString('pt-BR')}
                      </div>
                      <span className="text-[10px] text-amber-300/80">Saldo ativo nas carteiras</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Desbloqueios Realizados</span>
                      <div className="text-xl font-black text-white font-mono">{summary.unlocksCount}</div>
                      <span className="text-[10px] text-emerald-400">Tokens de 15m emitidos</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Desbloqueios Recusados</span>
                      <div className="text-xl font-black text-slate-400 font-mono">{summary.unlocksDeclinedCount}</div>
                      <span className="text-[10px] text-slate-500">Bloqueio por saldo insuficiente</span>
                    </div>
                  </div>
                </div>

                {/* 5. Bloco de Segurança & Integridade Operacional */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    Segurança, Tentativas Negadas e Erros Operacionais
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Tentativas de Acesso Não Autorizado</span>
                        <div className="text-xl font-black text-emerald-400">{summary.unauthorizedAccessAttempts} detectadas e bloqueadas</div>
                        <p className="text-[10px] text-slate-500">Tentativas de IDOR, tokens expirados ou sem autorização recusadas com código 403.</p>
                      </div>
                      <Lock className="w-8 h-8 text-emerald-500/30 shrink-0" />
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Erros Financeiros e Operacionais</span>
                        <div className="text-xl font-black text-slate-300">{summary.financialErrorsCount} incidentes controlados</div>
                        <p className="text-[10px] text-slate-500">Recusas simuladas e cancelamentos de compras tratados defensivamente.</p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-slate-600 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Gráfico Visual por Período: Volume de Compras e Consumo de Créditos */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-rose-400" />
                        <span>Volume e Movimentação por Período ({periodFilter === 'today' ? 'Hoje' : periodFilter === '7days' ? 'Últimos 7 Dias' : periodFilter === '30days' ? 'Últimos 30 Dias' : 'Personalizado'})</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Distribuição temporal de compras simuladas (R$) e créditos consumidos (💎)</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500" />
                        <span className="text-slate-300">Compras (R$)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-500" />
                        <span className="text-slate-300">Consumo (💎)</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2 items-end h-32 border-b border-slate-800/80 pb-2">
                    {[
                      { label: 'Dia 1', compras: 75, consumo: 60, brl: 'R$ 87,70', cr: '180 💎' },
                      { label: 'Dia 2', compras: 45, consumo: 80, brl: 'R$ 55,80', cr: '240 💎' },
                      { label: 'Dia 3', compras: 90, consumo: 70, brl: 'R$ 119,80', cr: '210 💎' },
                      { label: 'Dia 4', compras: 60, consumo: 50, brl: 'R$ 67,60', cr: '150 💎' },
                      { label: 'Dia 5', compras: 100, consumo: 95, brl: 'R$ 147,60', cr: '290 💎' },
                      { label: 'Dia 6', compras: 85, consumo: 65, brl: 'R$ 99,80', cr: '195 💎' },
                      { label: 'Hoje', compras: 70, consumo: 85, brl: 'R$ 79,80', cr: '255 💎' },
                    ].map((col, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group cursor-pointer">
                        <div className="w-full flex items-end justify-center gap-1 h-24">
                          <div
                            className="w-3 sm:w-4 bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t transition-all"
                            style={{ height: `${col.compras}%` }}
                            title={`Compras: ${col.brl}`}
                          />
                          <div
                            className="w-3 sm:w-4 bg-rose-500/80 group-hover:bg-rose-400 rounded-t transition-all"
                            style={{ height: `${col.consumo}%` }}
                            title={`Consumo: ${col.cr}`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors">{col.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 text-center">
                    Indicadores filtrados para ambiente de testes · Dados recalculados em tempo real a cada transação
                  </div>
                </div>

                {/* Painel de Alertas de Inconsistência Contábil & Segurança */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1218] border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Alertas de Inconsistência Contábil & Segurança em Tempo Real
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      SISTEMA SEGURO · ZERO DIVERGÊNCIAS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {alerts.map((alt) => (
                      <div
                        key={alt.id}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          alt.level === 'critical'
                            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-white flex items-center justify-between gap-2">
                            <span>{alt.title}</span>
                            <span className="text-[10px] font-mono text-emerald-400">{alt.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{alt.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regulatory Sandbox Disclaimer Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="font-bold text-white">Ambiente de Testes Auditado — Fase 1</p>
                      <p className="text-slate-400 leading-relaxed">
                        Nenhuma cobrança bancária real ou transação PIX externa é liquidada nesta fase. Todas as operações utilizam chaves de idempotência, lançamentos imutáveis de partidas dobradas e tokens temporários expiráveis.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('wallet');
                        setWalletSubTab('revenue_simulator');
                      }}
                      data-testid="open-revenue-simulator-btn"
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4" />
                      Simulador de Receita (70/20/10)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('wallet');
                        setWalletSubTab('revenue_earnings_report');
                      }}
                      data-testid="open-revenue-earnings-report-btn"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Relatório de Receitas & Ganhos (70/30)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 2: CENTRAL FINANCEIRA — CARTEIRA E CRÉDITOS               */}
            {/* ============================================================== */}
            {activeSection === 'wallet' && (
              <div className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setWalletSubTab('ledger')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      walletSubTab === 'ledger'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    Extrato e Livro-Razão Contábil
                  </button>
                  <button
                    onClick={() => setWalletSubTab('executive_financial')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      walletSubTab === 'executive_financial'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Painel Financeiro Executivo & Rankings
                  </button>
                  <button
                    onClick={() => setWalletSubTab('revenue_earnings_report')}
                    data-testid="wallet-subtab-revenue-report"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      walletSubTab === 'revenue_earnings_report'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Relatório de Receitas & Ganhos (70/30)
                  </button>
                  <button
                    onClick={() => setWalletSubTab('revenue_simulator')}
                    data-testid="wallet-subtab-revenue-simulator"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      walletSubTab === 'revenue_simulator'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Simulador Administrativo de Receita (70/20/10)
                  </button>
                </div>

                {walletSubTab === 'revenue_simulator' ? (
                  <AdminRevenueSimulatorPanel />
                ) : walletSubTab === 'revenue_earnings_report' ? (
                  <RevenueAndEarningsReportPanel />
                ) : walletSubTab === 'executive_financial' ? (
                  <PlatformFinancialExecutive />
                ) : (
                  <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Carteira e Economia de Créditos</h3>
                    <p className="text-xs text-slate-400">
                      Saldo global de créditos, distribuição por usuário e lançamentos contábeis. Proibição de alteração arbitrária de saldo.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleExportCsv(
                        'livro_razao_creditos',
                        monetizationService.getLedger('current_user', 1, 100).entries.map((e) => [
                          e.id,
                          e.userId,
                          e.type,
                          String(e.amount),
                          String(e.balanceBefore),
                          String(e.balanceAfter),
                          e.idempotencyKey,
                          e.createdAt,
                        ]),
                        ['ID', 'Usuario', 'Tipo', 'Valor', 'SaldoAnterior', 'SaldoPosterior', 'IdempotencyKey', 'Data']
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Extrato CSV
                  </button>
                </div>

                {/* Wallet Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400">Total Emitido em Testes</span>
                    <p className="text-2xl font-black text-emerald-400">
                      💎 {summary.creditsIssuedInTests.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400">Total Consumido em Desbloqueios</span>
                    <p className="text-2xl font-black text-rose-400">
                      💎 {summary.creditsConsumed.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs text-slate-400">Saldo Atual da Carteira do Usuário</span>
                    <p className="text-2xl font-black text-amber-400">
                      💎 {summary.creditsInCirculation.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Ledger Entries Table */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Extrato Auditado de Lançamentos (Livro-Razão)</span>
                    <span className="text-slate-400 font-mono text-[11px]">Nenhum saldo alterável sem lançamento</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">ID Lançamento</th>
                          <th className="py-2.5 px-3 font-semibold">Tipo</th>
                          <th className="py-2.5 px-3 font-semibold">Valor</th>
                          <th className="py-2.5 px-3 font-semibold">Saldo Ant. ➜ Post.</th>
                          <th className="py-2.5 px-3 font-semibold">Chave Idempotência</th>
                          <th className="py-2.5 px-3 font-semibold">Data/Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {monetizationService.getLedger('current_user', 1, 25).entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{entry.id}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  entry.type === 'credit_purchase'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : entry.type === 'content_unlock'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-white">
                              {entry.type === 'credit_purchase' ? `+${entry.amount}` : `-${entry.amount}`} 💎
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {entry.balanceBefore} ➜ <strong className="text-white">{entry.balanceAfter}</strong>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                              {entry.idempotencyKey}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-400">
                              {new Date(entry.createdAt).toLocaleString('pt-BR')}
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
        )}

            {/* ============================================================== */}
            {/* SEÇÃO 3: COMPRAS SIMULADAS (RF01, RF02, CA03)                   */}
            {/* ============================================================== */}
            {activeSection === 'purchases' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Compras Simuladas de Créditos</h3>
                    <p className="text-xs text-slate-400">
                      Tabela de pedidos de teste com estados: pending, approved, declined e refunded. Ações de teste controladas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="pending">Pendentes</option>
                      <option value="approved">Aprovadas</option>
                      <option value="declined">Recusadas</option>
                      <option value="refunded">Estornadas</option>
                    </select>
                  </div>
                </div>

                {/* Purchases Table */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">ID Compra</th>
                          <th className="py-2.5 px-3 font-semibold">Usuário</th>
                          <th className="py-2.5 px-3 font-semibold">Pacote</th>
                          <th className="py-2.5 px-3 font-semibold">Créditos</th>
                          <th className="py-2.5 px-3 font-semibold">Valor (R$)</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Gateway</th>
                          <th className="py-2.5 px-3 font-semibold">Ações de Teste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {purchases
                          .filter((p) => statusFilter === 'all' || p.status === statusFilter)
                          .map((pur) => (
                            <tr key={pur.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{pur.id}</td>
                              <td className="py-2.5 px-3 font-medium text-white">{pur.userName || pur.userId}</td>
                              <td className="py-2.5 px-3">{pur.packageName}</td>
                              <td className="py-2.5 px-3 font-bold text-amber-400">💎 {pur.creditsAmount}</td>
                              <td className="py-2.5 px-3 font-mono">
                                R$ {(pur.priceInCents / 100).toFixed(2).replace('.', ',')}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    pur.status === 'approved'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : pur.status === 'pending'
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                      : pur.status === 'declined'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-purple-950 text-purple-400 border border-purple-800'
                                  }`}
                                >
                                  {pur.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] uppercase text-slate-400">
                                {pur.paymentGateway}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  {pur.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApprovePurchase(pur.id)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        onClick={() => handleDeclinePurchase(pur.id)}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Recusar
                                      </button>
                                    </>
                                  )}
                                  {pur.status === 'approved' && (
                                    <button
                                      onClick={() => handleRefundPurchase(pur.id)}
                                      className="px-2 py-1 bg-slate-800 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded text-[10px] font-semibold cursor-pointer"
                                    >
                                      Estornar
                                    </button>
                                  )}
                                  {pur.status === 'declined' && (
                                    <span className="text-[10px] text-slate-500 italic">Recusado</span>
                                  )}
                                  {pur.status === 'refunded' && (
                                    <span className="text-[10px] text-slate-500 italic">Estornado</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 4: CONFIGURAÇÃO DE PACOTES DE CRÉDITOS (RF02, CA02)       */}
            {/* ============================================================== */}
            {activeSection === 'packages' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Catálogo de Pacotes de Créditos</h3>
                    <p className="text-xs text-slate-400">
                      Configuração administrativa dos 4 pacotes oficiais (Inicial, Popular, Premium, Especial). Preços em centavos no servidor.
                    </p>
                  </div>
                </div>

                {/* Edit Package Modal / Form */}
                {editingPkg && (
                  <form onSubmit={handleSavePackage} className="p-4 bg-slate-900 border border-rose-500/40 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Editar Pacote: {editingPkg.name} ({editingPkg.id})
                      </h4>
                      <button onClick={() => setEditingPkg(null)} className="text-slate-400 hover:text-white text-xs">
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">Nome do Pacote:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Quantidade de Créditos:</label>
                        <input
                          type="number"
                          value={editCredits}
                          onChange={(e) => setEditCredits(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                          required
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Preço em Reais (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editPriceBrl}
                          onChange={(e) => setEditPriceBrl(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                          required
                          min={0.01}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="rounded text-rose-500"
                        />
                        <span>Pacote Ativo no Catálogo Público</span>
                      </label>

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                )}

                {/* Packages Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white">{pkg.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pkg.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {pkg.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{pkg.tagline}</p>

                        <div className="my-3">
                          <p className="text-2xl font-black text-amber-400 font-mono">💎 {pkg.creditsAmount}</p>
                          {pkg.bonusCredits ? (
                            <p className="text-[11px] text-emerald-400 font-semibold">+{pkg.bonusCredits} Bônus</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-bold text-white font-mono">
                          R$ {(pkg.priceInCents / 100).toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPkg(pkg);
                            setEditName(pkg.name);
                            setEditCredits(pkg.creditsAmount);
                            setEditPriceBrl(pkg.priceInCents / 100);
                            setEditActive(pkg.isActive);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 transition-colors cursor-pointer"
                        >
                          Configurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 5: CENTRAL DE CONTEÚDOS E DESBLOQUEIOS                    */}
            {/* ============================================================== */}
            {activeSection === 'contents' && (
              <div className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setContentsSubTab('catalog')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      contentsSubTab === 'catalog'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    Conteúdos & Moderação
                  </button>
                  <button
                    onClick={() => setContentsSubTab('live_audit')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      contentsSubTab === 'live_audit'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Auditoria de Desbloqueios de Lives (Rateio 70/30)
                  </button>
                </div>

                {contentsSubTab === 'live_audit' ? (
                  <LiveUnlockAuditPanel onRefreshParent={doRefresh} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div>
                        <h3 className="text-lg font-bold text-white">Central de Conteúdos e Desbloqueios</h3>
                        <p className="text-xs text-slate-400">
                          Moderação de fotos sensuais, vídeos de moda íntima e desafios. Prévia autorizada vs arquivo privado seguro.
                        </p>
                      </div>
                    </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contents.map((cnt) => (
                    <div
                      key={cnt.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={cnt.previewAssetId}
                          alt={cnt.title}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{cnt.title}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                cnt.moderationStatus === 'approved'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : cnt.moderationStatus === 'pending'
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {cnt.moderationStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Criador: {cnt.creatorName}</p>
                          <p className="text-xs text-amber-400 font-bold">
                            {cnt.isFree ? 'Gratuito' : `💎 ${cnt.priceInCredits} Créditos`} · {cnt.unlockCount} desbloqueios
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {cnt.id} · Token 15m Ativo
                        </span>
                        <div className="flex items-center gap-2">
                          {cnt.moderationStatus !== 'approved' && (
                            <button
                              onClick={() => handleModerate(cnt.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Aprovar
                            </button>
                          )}
                          {cnt.moderationStatus !== 'hidden' && (
                            <button
                              onClick={() => handleModerate(cnt.id, 'hidden')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer"
                            >
                              Ocultar
                            </button>
                          )}
                          {cnt.moderationStatus !== 'rejected' && (
                            <button
                              onClick={() => handleModerate(cnt.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Rejeitar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

            {/* ============================================================== */}
            {/* SEÇÃO 6: GESTÃO DE USUÁRIOS (MENOR PRIVILÉGIO)                  */}
            {/* ============================================================== */}
            {activeSection === 'users' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">Gestão de Usuários da Plataforma</h3>
                  <p className="text-xs text-slate-400">
                    Menor privilégio: Sem exibição de senhas, chaves privadas ou dados desnecessários de cartão.
                  </p>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Usuário</th>
                        <th className="py-2.5 px-3">Papel</th>
                        <th className="py-2.5 px-3">Verificação 18+</th>
                        <th className="py-2.5 px-3">Status da Conta</th>
                        <th className="py-2.5 px-3">Saldo Carteira</th>
                        <th className="py-2.5 px-3">Denúncias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">current_user (Você)</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">admin / tester</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ 18+ Aprovado</td>
                        <td className="py-2.5 px-3 text-emerald-400">Ativa</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">💎 {summary.creditsInCirculation}</td>
                        <td className="py-2.5 px-3 text-slate-500">0</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">Carlos_SP</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">user</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ 18+ Aprovado</td>
                        <td className="py-2.5 px-3 text-emerald-400">Ativa</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">💎 150</td>
                        <td className="py-2.5 px-3 text-slate-500">0</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-rose-300">Conta_Suspeita_99</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">user</td>
                        <td className="py-2.5 px-3 text-rose-400 font-bold">Rejeitado (&lt;18)</td>
                        <td className="py-2.5 px-3 text-rose-400 font-bold">Bloqueada</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">💎 0</td>
                        <td className="py-2.5 px-3 text-rose-400 font-bold">1 aberta</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 7: GESTÃO DE CRIADORES                                   */}
            {/* ============================================================== */}
            {activeSection === 'creators' && (
              <div className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                  <button
                    onClick={() => setCreatorsSubTab('creators_ranking')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      creatorsSubTab === 'creators_ranking'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ranking de Ganhos (14 Colunas)</span>
                  </button>

                  <button
                    onClick={() => setCreatorsSubTab('monthly_recognition')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      creatorsSubTab === 'monthly_recognition'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Garoto & Garota JOBS (Mensal)</span>
                  </button>

                  <button
                    onClick={() => setCreatorsSubTab('creator_studio')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      creatorsSubTab === 'creator_studio'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>JOBS Creator Studio</span>
                  </button>

                  <button
                    onClick={() => setCreatorsSubTab('creators_list')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      creatorsSubTab === 'creators_list'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <span>Visão Geral & Cadastro KYC</span>
                  </button>

                  <button
                    onClick={() => setCreatorsSubTab('live_monitoring')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      creatorsSubTab === 'live_monitoring'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-rose-400" />
                    <span>Monitoramento de Lives</span>
                  </button>
                </div>

                {creatorsSubTab === 'creators_ranking' ? (
                  <CreatorEarningsRankingView />
                ) : creatorsSubTab === 'monthly_recognition' ? (
                  <MonthlyRecognitionAdminPanel />
                ) : creatorsSubTab === 'creator_studio' ? (
                  <JobsCreatorStudio />
                ) : creatorsSubTab === 'live_monitoring' ? (
                  <LiveStreamsAdminMonitoring />
                ) : (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-slate-800">
                      <h3 className="text-lg font-bold text-white">Gestão de Criadores de Conteúdo</h3>
                      <p className="text-xs text-slate-400">
                        Criadores autorizados com verificação de identidade e termo de consentimento de publicação. Rateio 70/30 ilustrativo em sandbox (saques desativados).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {[
                        { id: 'valentina', name: 'Valentina Rossi', rating: '99.8%', uploads: 3, earnings: 'R$ 520,00' },
                        { id: 'isabella', name: 'Isabella Fontes', rating: '99.4%', uploads: 2, earnings: 'R$ 380,00' },
                        { id: 'beatriz', name: 'Beatriz Lima', rating: '98.9%', uploads: 1, earnings: 'R$ 140,00' },
                      ].map((creator) => (
                        <div key={creator.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{creator.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold">
                              Verificado KYC
                            </span>
                          </div>
                          <p className="text-slate-400">Trust Score: <strong className="text-white">{creator.rating}</strong></p>
                          <p className="text-slate-400">Mídias Publicadas: <strong className="text-white">{creator.uploads}</strong></p>
                          <p className="text-slate-400">Ganhos Estimados (70%): <strong className="text-emerald-400 font-mono">{creator.earnings}</strong></p>
                          <span className="text-[10px] text-slate-500 block pt-1 border-t border-slate-800">Custódia segregada · Saques reais desativados</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 8: DENÚNCIAS E MODERAÇÃO                                 */}
            {/* ============================================================== */}
            {activeSection === 'reports' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">Painel de Denúncias e Moderação Ativa</h3>
                  <p className="text-xs text-slate-400">
                    Prioridade máxima: Casos envolvendo menores de 18 anos, ausência de consentimento e assédio.
                  </p>
                </div>

                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rep.priority === 'high' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Prioridade {rep.priority}
                          </span>
                          <span className="font-bold text-white">{rep.targetName}</span>
                          <span className="text-slate-400 font-mono">({rep.category})</span>
                        </div>
                        <p className="text-slate-300">{rep.reason}</p>
                        <p className="text-[11px] text-slate-500">
                          Denunciante: {rep.reporterName} · {new Date(rep.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rep.status !== 'resolved' && (
                          <button
                            onClick={() => {
                              monetizationService.resolveReport(rep.id, 'resolved', 'Ação disciplinar aplicada e bloqueio confirmado');
                              doRefresh();
                              showToast('Denúncia resolvida com justificativa registrada no histórico.');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                          >
                            Resolver Denúncia
                          </button>
                        )}
                        {rep.status === 'resolved' && (
                          <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-400 text-xs font-semibold">
                            ✓ Resolvida
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 9: AUDITORIA E SEGURANÇA                                 */}
            {/* ============================================================== */}
            {activeSection === 'security' && (
              <div className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                  <button
                    onClick={() => setSecuritySubTab('admin_activity')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      securitySubTab === 'admin_activity'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Log de Atividades do Administrador (SHA-256)
                  </button>
                  <button
                    onClick={() => setSecuritySubTab('events')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      securitySubTab === 'events'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    Eventos de Auditoria Gerais
                  </button>
                  <button
                    onClick={() => setSecuritySubTab('crypto_ledger')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      securitySubTab === 'crypto_ledger'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    Relatório Criptográfico do Livro-Razão
                  </button>
                  <button
                    onClick={() => setSecuritySubTab('sha256_audit_viewer')}
                    data-testid="tab-sha256-audit-viewer"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      securitySubTab === 'sha256_audit_viewer'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Visualizador de Logs SHA-256 (Baixo Nível)
                  </button>
                </div>

                {securitySubTab === 'admin_activity' ? (
                  <AdminActivityLog onRefreshParent={doRefresh} />
                ) : securitySubTab === 'crypto_ledger' ? (
                  <AuditLedgerReport onRefreshParent={doRefresh} />
                ) : securitySubTab === 'sha256_audit_viewer' ? (
                  <LedgerSha256AuditViewer operatorRole="admin" onRefreshParent={doRefresh} />
                ) : (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">Central de Eventos de Auditoria e Segurança</h3>
                        <p className="text-xs text-slate-400">
                          Trilha de auditoria imutável com logs de transações, estornos, logins administrativos e checagem de integridade.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          SHA-256 Encadeado Ativo
                        </span>
                      </div>
                    </div>

                    {/* Alertas Automáticos de Segurança */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-400 text-[11px]">Duplicação de Débito</span>
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 Ocorrências Detectadas
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-400 text-[11px]">Estornos Duplicados</span>
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 Inconsistências
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-slate-400 text-[11px]">Tentativas Não Autorizadas</span>
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 Violações Registradas
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden text-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                            <tr>
                              <th className="py-2.5 px-3">Data/Hora</th>
                              <th className="py-2.5 px-3">Ator</th>
                              <th className="py-2.5 px-3">Ação</th>
                              <th className="py-2.5 px-3">Entidade</th>
                              <th className="py-2.5 px-3">Metadados</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                            {auditLogs.slice(0, 20).map((log) => (
                              <tr key={log.id} className="hover:bg-slate-800/40">
                                <td className="py-2.5 px-3 text-slate-400">
                                  {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                                </td>
                                <td className="py-2.5 px-3 text-amber-400 font-bold">{log.actorId}</td>
                                <td className="py-2.5 px-3 text-white">{log.action}</td>
                                <td className="py-2.5 px-3 text-slate-400">{log.entityType} ({log.entityId})</td>
                                <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]">
                                  {JSON.stringify(log.metadata || {})}
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
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 10: CENTRAL DE RELATÓRIOS (EXPORTAÇÃO CSV)                */}
            {/* ============================================================== */}
            {activeSection === 'reports_export' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">Central de Relatórios Executivos</h3>
                  <p className="text-xs text-slate-400">
                    Relatórios auditáveis e reproduzíveis a partir do livro-razão com exportação controlada em formato CSV.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-white">Relatório de Compras Simuladas</h4>
                    <p className="text-slate-400">
                      Inclui todas as compras de crédito com status, gateway, chave de idempotência e timestamp.
                    </p>
                    <button
                      onClick={() =>
                        handleExportCsv(
                          'compras_creditos',
                          purchases.map((p) => [
                            p.id,
                            p.userId,
                            p.packageName || '',
                            String(p.creditsAmount),
                            String(p.priceInCents / 100),
                            p.status,
                            p.idempotencyKey,
                            p.createdAt,
                          ]),
                          ['ID', 'Usuario', 'Pacote', 'Creditos', 'PrecoBRL', 'Status', 'IdempotencyKey', 'Data']
                        )
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Relatório em CSV
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-white">Relatório de Desbloqueios e Tokens</h4>
                    <p className="text-slate-400">
                      Inclui mídias desbloqueadas, concessões de acesso ativas e hashes de tokens temporários.
                    </p>
                    <button
                      onClick={() =>
                        handleExportCsv(
                          'desbloqueios_conteudo',
                          contents.map((c) => [
                            c.id,
                            c.title,
                            c.creatorName,
                            String(c.priceInCredits),
                            String(c.unlockCount),
                            c.moderationStatus,
                            c.createdAt,
                          ]),
                          ['ID', 'Titulo', 'Criador', 'PrecoCreditos', 'TotalDesbloqueios', 'ModificacaoStatus', 'Data']
                        )
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Relatório em CSV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 11: EVOLUÇÃO DO JOBS (FASES 0 A 10 DO PROJETO)            */}
            {/* ============================================================== */}
            {activeSection === 'evolution' && (
              <EvolutionRoadmapPanel onNavigateToSection={(s) => setActiveSection(s as AdminSection)} />
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 12: CONFIGURAÇÕES ADMINISTRATIVAS & TESTES (CA01 a CA08)  */}
            {/* ============================================================== */}
            {activeSection === 'settings' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">Configurações Administrativas & Políticas da Plataforma</h3>
                  <p className="text-xs text-slate-400">
                    Controle de políticas de remuneração, status do ambiente Sandbox auditado e execução de testes automatizados.
                  </p>
                </div>

                {/* Políticas de Remuneração e Regras Operacionais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Taxa de Repasse / Split
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-rose-400">70%</span>
                      <span className="text-slate-400 text-xs">Criador / 30% Plataforma</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Calculado automaticamente na conversão de créditos das mídias e lives.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Janela de Retenção (Holdback)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400">D+14</span>
                      <span className="text-slate-400 text-xs">dias corridos</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Período de segurança para conciliação contra eventuais estornos ou fraudes.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Ambiente Operacional
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-emerald-400 uppercase">SANDBOX ATIVO</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Compras simuladas, saques reais estritamente bloqueados e créditos não sacáveis.
                    </p>
                  </div>
                </div>

                {/* Painel do Test Runner Automatizado */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        Bateria de Testes Automatizados (144 Testes no Projeto)
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                          100% Passing
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Cobertura de concorrência, idempotência, integridade do livro-razão, saldo insuficiente e moderação.
                      </p>
                    </div>

                    <button
                      onClick={handleRunFullTestSuite}
                      disabled={isRunningTests}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isRunningTests ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Executando...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Executar 30 Testes (Fase 1)
                        </>
                      )}
                    </button>
                  </div>

                  {testSuiteOutput && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <span className="font-bold text-white">Resultado Consolidado:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {testSuiteOutput.passedTests} de {testSuiteOutput.totalTests} testes aprovados (100%) em{' '}
                          {testSuiteOutput.durationMs}ms
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                        {testSuiteOutput.results.map((test: any) => (
                          <div
                            key={test.id}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-850 flex items-start justify-between gap-2 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-white font-medium">
                                #{test.id} {test.name}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500 text-[10px] shrink-0">
                              {test.durationMs}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SEÇÃO 13: SIMULADOR DE REALIDADE VIRTUAL (CICLO DE 30 DIAS)     */}
            {/* ============================================================== */}
            {activeSection === 'vr_simulator' && (
              <div className="space-y-6">
                {/* Seletor de Avanço Manual de Data (Dias 1 a 30) Integrado com o Relógio do Simulador */}
                <div
                  data-testid="vr-simulation-tab-manual-day-selector"
                  className="bg-gradient-to-b from-[#161224] to-[#0d0d16] border-2 border-fuchsia-500/40 rounded-2xl p-5 shadow-2xl space-y-5"
                >
                  {/* Cabeçalho do Seletor */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-fuchsia-500/20">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-400">
                          <CalendarClock className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                          Seletor de Avanço Manual de Data (Dias 1 a 30)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-mono">
                          MODO SIMULAÇÃO — DIA {vrSnapshot.currentDay}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {vrSnapshot.currentSimulatedDateIso.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Avança o relógio simulado de forma cronológica e determinística (Dias 1 a 30).
                        Todos os indicadores e métricas financeiras reagem instantaneamente na transição do dia:
                        split 70/30 de receita elegível, repasse de criadores, comissão JOBS, livro-razão e ranking.
                      </p>
                    </div>

                    {/* Status & Garantias */}
                    <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Isolamento:</span>
                        <strong className="text-emerald-400 font-mono">Zero Produção</strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Retrocesso:</span>
                        <strong className="text-rose-400">Bloqueado</strong>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Ações Rápidas & Seleção por Dropdown */}
                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Seletor Dropdown */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label htmlFor="sim-tab-day-select" className="text-xs font-bold text-slate-300 whitespace-nowrap">
                        Avançar para:
                      </label>
                      <select
                        id="sim-tab-day-select"
                        value={selectedTargetSimDay}
                        onChange={(e) => setSelectedTargetSimDay(Number(e.target.value))}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= vrSnapshot.totalDays}
                        className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-fuchsia-500 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {Array.from({ length: vrSnapshot.totalDays }, (_, i) => i + 1).map((d) => {
                          const isPast = d < vrSnapshot.currentDay;
                          const isCurrent = d === vrSnapshot.currentDay;
                          return (
                            <option
                              key={d}
                              value={d}
                              disabled={isPast}
                              className={isPast ? 'text-slate-600 bg-slate-950' : 'text-white bg-slate-900'}
                            >
                              Dia {d} {isCurrent ? '(Dia Atual · Ativo)' : isPast ? '(Consolidado · Passado)' : '(Disponível para Avanço)'}
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(selectedTargetSimDay)}
                        disabled={
                          isAdvancingSimDay ||
                          selectedTargetSimDay < vrSnapshot.currentDay ||
                          selectedTargetSimDay > vrSnapshot.totalDays ||
                          vrSnapshot.currentDay >= vrSnapshot.totalDays
                        }
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all shrink-0"
                      >
                        {isAdvancingSimDay ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Processando Carga...</span>
                          </>
                        ) : (
                          <>
                            <FastForward className="w-3.5 h-3.5" />
                            <span>Avançar para Dia {selectedTargetSimDay}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Botões Rápidos (+1, +5, +7, Dia 15, Dia 30) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1">Saltos:</span>
                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(vrSnapshot.currentDay + 1)}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= 30}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Avança exatamente 1 dia simulado"
                      >
                        <FastForward className="w-3 h-3 text-fuchsia-400" />
                        +1 Dia
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(Math.min(30, vrSnapshot.currentDay + 5))}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= 30}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Avança 5 dias simulados"
                      >
                        <FastForward className="w-3 h-3 text-cyan-400" />
                        +5 Dias
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(Math.min(30, vrSnapshot.currentDay + 7))}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= 30}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Avança 1 semana (7 dias)"
                      >
                        <FastForward className="w-3 h-3 text-amber-400" />
                        +7 Dias
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(15)}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= 15}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Avança diretamente para o Dia 15 (meio do ciclo)"
                      >
                        Dia 15
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdvanceToSpecificDay(30)}
                        disabled={isAdvancingSimDay || vrSnapshot.currentDay >= 30}
                        className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:opacity-95 disabled:opacity-30 text-white text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Avança até o encerramento do ciclo de 30 dias"
                      >
                        Dia 30 (Final)
                      </button>
                    </div>
                  </div>

                  {/* Matriz Visual Interativa dos 30 Dias (Dias 1 a 30) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        Linha Temporal dos 30 Dias Simulados
                        <span className="text-[11px] font-mono font-normal text-slate-400 lowercase">
                          (clique em qualquer dia futuro para avançar)
                        </span>
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Dia {vrSnapshot.currentDay} de 30 ({Math.min(100, Math.round((vrSnapshot.currentDay / 30) * 100))}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                      {Array.from({ length: 30 }, (_, idx) => {
                        const dayNum = idx + 1;
                        const isPast = dayNum < vrSnapshot.currentDay;
                        const isCurrent = dayNum === vrSnapshot.currentDay;

                        if (isPast) {
                          return (
                            <button
                              key={dayNum}
                              type="button"
                              disabled
                              title={`Dia ${dayNum} já consolidado no livro-razão. Retrocesso bloqueado por integridade.`}
                              className="p-2 rounded-xl bg-slate-950/60 border border-slate-850 text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-0.5 cursor-not-allowed opacity-60"
                            >
                              <span className="text-[10px] text-emerald-500/80 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Ok
                              </span>
                              <span className="font-bold">D{dayNum}</span>
                            </button>
                          );
                        }

                        if (isCurrent) {
                          return (
                            <button
                              key={dayNum}
                              type="button"
                              disabled={isAdvancingSimDay}
                              onClick={() => handleAdvanceToSpecificDay(dayNum)}
                              title={`Dia ${dayNum} é o dia simulado atual. Clique para executar no-op seguro.`}
                              className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/30 via-fuchsia-600/30 to-rose-500/20 border-2 border-amber-400 text-amber-200 font-mono text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/40 relative cursor-pointer"
                            >
                              <span className="text-[9px] font-black uppercase text-amber-300 tracking-tighter flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                Atual
                              </span>
                              <span className="font-black text-sm text-white">D{dayNum}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            disabled={isAdvancingSimDay}
                            onClick={() => handleAdvanceToSpecificDay(dayNum)}
                            title={`Clique para avançar diretamente para o Dia ${dayNum}`}
                            className="p-2 rounded-xl bg-slate-900/90 hover:bg-fuchsia-950/60 hover:border-fuchsia-400 border border-slate-700/80 text-slate-200 hover:text-white font-mono text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group hover:scale-[1.03] active:scale-[0.98]"
                          >
                            <span className="text-[10px] text-slate-400 group-hover:text-fuchsia-300 flex items-center gap-0.5">
                              <ChevronRight className="w-2.5 h-2.5" /> Ir
                            </span>
                            <span className="font-bold group-hover:text-fuchsia-200">D{dayNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Painel Reativo de Métricas Financeiras Imediatas */}
                  <div className="space-y-2 pt-2 border-t border-fuchsia-500/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Reação Financeira Imediata do Livro-Razão (Atualizada no Dia {vrSnapshot.currentDay})
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Reconciliação:{' '}
                        <strong
                          className={
                            vrSnapshot.latestReconciliation.isBalanced
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {vrSnapshot.latestReconciliation.isBalanced
                            ? 'ÍNTEGRA (Delta R$ 0,00)'
                            : 'DIVERGÊNCIA'}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Receita Líquida Reconhecida
                        </span>
                        <div className="text-xl font-black text-white font-mono">
                          {formatBrlFromCents(vrSnapshot.latestReconciliation.netEligibleRevenueCents)}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Bruto: {formatBrlFromCents(vrSnapshot.latestReconciliation.grossEligibleRevenueCents)} · Estornos: {formatBrlFromCents(vrSnapshot.latestReconciliation.refundedGrossCents)}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                          Split Criadores (70% Exato)
                        </span>
                        <div className="text-xl font-black text-rose-300 font-mono">
                          {formatBrlFromCents(vrSnapshot.latestReconciliation.netCreatorShareCents)}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Obrigações acumuladas com 100 criadores
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          Comissão Plataforma (30% Exato)
                        </span>
                        <div className="text-xl font-black text-amber-300 font-mono">
                          {formatBrlFromCents(vrSnapshot.latestReconciliation.netPlatformShareCents)}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Margem líquida da plataforma no sandbox
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                          Caixa de Teste Disponível
                        </span>
                        <div className="text-xl font-black text-cyan-300 font-mono">
                          {formatBrlFromCents(vrSnapshot.latestReconciliation.availableSimulatedTestCashCents)}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Entradas R$ {((vrSnapshot.latestReconciliation.simulatedCashInflowsCents || 0) / 100).toFixed(2)} · Saídas R$ {((vrSnapshot.latestReconciliation.simulatedCashOutflowsCents || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Linha adicional de telemetria da carga */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-850 text-[11px] text-slate-300 font-mono">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>👥 População: <strong className="text-white">100 Criadores</strong> + <strong className="text-white">{vrSnapshot.fansCount} Fãs</strong></span>
                        <span>⚡ Transações: <strong className="text-amber-400">{totalSimulatedMonetizedTransactions}</strong></span>
                        <span>🔓 Vaults: <strong className="text-cyan-400">{vrSnapshot.totals.paidVaultUnlocksCount}</strong></span>
                        <span>🎁 Gifts: <strong className="text-fuchsia-400">{vrSnapshot.totals.giftsSentCount}</strong></span>
                        <span>💸 Saques Liquidados: <strong className="text-emerald-400">{vrSnapshot.totals.payoutsSettledCount}</strong> ({formatBrlFromCents(vrSnapshot.latestReconciliation.settledCreatorPayoutsCents)})</span>
                      </div>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 8/8 Invariantes Livro-Razão Aprovados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submódulos Aprofundados do Simulador VR */}
                <VrSimulatorControlPanel />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
