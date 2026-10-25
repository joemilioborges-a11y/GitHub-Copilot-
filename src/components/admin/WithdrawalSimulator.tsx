import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Wallet,
  Percent,
  Coins,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  FileText,
  BookmarkPlus,
  Clock,
  ArrowDownRight,
  Sparkles,
  Download,
  Trash2,
  HelpCircle,
  X,
  ChevronRight,
  Building2,
  Info,
  Check,
} from 'lucide-react';
import {
  WithdrawalSimulationEnvironment,
  WithdrawalSimulationTarget,
  WithdrawalSimulationMethod,
  WithdrawalSimulationInput,
  WithdrawalSimulationResult,
  WithdrawalSimulationRecord,
  CreatorRankingItem,
} from '../../types';
import { monetizationService } from '../../services/monetizationService';

interface WithdrawalSimulatorProps {
  currentEnvironment?: WithdrawalSimulationEnvironment;
  adminAvailableBalanceBrl: number;
  creatorsList?: CreatorRankingItem[];
  onSimulationRecorded?: (record: WithdrawalSimulationRecord) => void;
}

export const WithdrawalSimulator: React.FC<WithdrawalSimulatorProps> = ({
  currentEnvironment = 'sandbox',
  adminAvailableBalanceBrl,
  creatorsList = [],
  onSimulationRecorded,
}) => {
  // Estado do Ambiente (Sincronizado ou independente)
  const [environment, setEnvironment] = useState<WithdrawalSimulationEnvironment>(currentEnvironment);
  useEffect(() => {
    setEnvironment(currentEnvironment);
  }, [currentEnvironment]);

  // Alvo do saque: Administrador da Plataforma vs Criador
  const [targetType, setTargetType] = useState<WithdrawalSimulationTarget>('admin');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

  // Parâmetros de Simulação
  const [requestedAmountStr, setRequestedAmountStr] = useState<string>('1500.00');
  const [feePercentageStr, setFeePercentageStr] = useState<string>('1.50');
  const [fixedFeeStr, setFixedFeeStr] = useState<string>('3.50');
  const [payoutMethod, setPayoutMethod] = useState<WithdrawalSimulationMethod>('pix_instant');

  // Controle de Interface
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSavedList, setShowSavedList] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<WithdrawalSimulationRecord[]>([]);

  // Carregar criadores reais se não passados via props
  const creators = useMemo(() => {
    if (creatorsList && creatorsList.length > 0) return creatorsList;
    return monetizationService.getCreatorRankings(environment, 'all');
  }, [creatorsList, environment]);

  // Criador selecionado atualmente
  const selectedCreator = useMemo(() => {
    if (targetType !== 'creator') return null;
    if (!selectedCreatorId && creators.length > 0) return creators[0];
    return creators.find((c) => c.creatorId === selectedCreatorId) || creators[0] || null;
  }, [targetType, selectedCreatorId, creators]);

  // Calcular o Saldo Elegível Disponível de acordo com o alvo e ambiente
  const eligibleBalanceBrl = useMemo(() => {
    if (environment === 'production') {
      // Produção: Integração real não conectada -> 0 real conciliado
      return 0;
    }
    if (targetType === 'admin') {
      return adminAvailableBalanceBrl;
    }
    if (selectedCreator) {
      return selectedCreator.eligibleForWithdrawalBrl;
    }
    return 0;
  }, [environment, targetType, adminAvailableBalanceBrl, selectedCreator]);

  // Definir prazo estimado padrão pelo método
  const estimatedProcessingTime = useMemo(() => {
    switch (payoutMethod) {
      case 'pix_instant':
        return 'Instantâneo via PIX (até 3 minutos)';
      case 'ted_banco':
        return 'Até 1 dia útil (D+1 bancário)';
      case 'conta_pagamento':
        return 'Imediato (crédito em subconta)';
      case 'lote_agendado':
        return 'Liquidação em Lote (D+2 programado)';
      default:
        return 'Instantâneo via PIX';
    }
  }, [payoutMethod]);

  // Executar Simulação em Tempo Real
  const simulationResult: WithdrawalSimulationResult = useMemo(() => {
    const requested = parseFloat(requestedAmountStr.replace(',', '.'));
    const feePct = parseFloat(feePercentageStr.replace(',', '.'));
    const fixedFee = parseFloat(fixedFeeStr.replace(',', '.'));

    const input: WithdrawalSimulationInput = {
      environment,
      targetType,
      creatorId: selectedCreator?.creatorId,
      creatorName: selectedCreator?.publicName,
      eligibleBalanceBrl,
      requestedAmountBrl: isNaN(requested) ? 0 : requested,
      feePercentage: isNaN(feePct) ? 0 : feePct,
      fixedFeeBrl: isNaN(fixedFee) ? 0 : fixedFee,
      estimatedProcessingTime,
      payoutMethod,
    };

    return monetizationService.simulateWithdrawal(input);
  }, [
    environment,
    targetType,
    selectedCreator,
    eligibleBalanceBrl,
    requestedAmountStr,
    feePercentageStr,
    fixedFeeStr,
    estimatedProcessingTime,
    payoutMethod,
  ]);

  // Carregar registros salvos na montagem
  useEffect(() => {
    setSavedRecords(monetizationService.getWithdrawalSimulationRecords());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Atalhos de porcentagem de saldo
  const handleApplyPercentage = (pct: number) => {
    if (eligibleBalanceBrl <= 0) {
      setRequestedAmountStr('0.00');
      return;
    }
    const val = Number(((eligibleBalanceBrl * pct) / 100).toFixed(2));
    setRequestedAmountStr(val.toFixed(2));
  };

  // Botão: Limpar Simulação (Requirement 5)
  const handleResetSimulation = () => {
    setRequestedAmountStr('1500.00');
    setFeePercentageStr('1.50');
    setFixedFeeStr('3.50');
    setPayoutMethod('pix_instant');
    setTargetType('admin');
    showToast('Campos do simulador restaurados para os valores padrão.');
  };

  // Botão: Simular Saque (Requirement 5)
  const handleExecuteSimulation = () => {
    showToast('Simulação executada com sucesso. Resultados atualizados em tempo real.');
  };

  // Botão: Registrar Simulação (Requirement 5 & 6)
  const handleSaveSimulation = () => {
    if (!simulationResult.isValid) {
      showToast('Não é possível registrar uma simulação com parâmetros inválidos.');
      return;
    }
    const record = monetizationService.saveWithdrawalSimulationRecord(simulationResult);
    setSavedRecords(monetizationService.getWithdrawalSimulationRecords());
    if (onSimulationRecorded) {
      onSimulationRecorded(record);
    }
    showToast(`Simulação ${record.id} gravada no histórico como: SEM MOVIMENTAÇÃO FINANCEIRA.`);
  };

  // Limpar Histórico de Simulações
  const handleClearHistory = () => {
    monetizationService.clearWithdrawalSimulationRecords();
    setSavedRecords([]);
    showToast('Histórico de simulações limpo.');
  };

  // Exportar Simulações Salvas para CSV
  const handleExportSimulationsCsv = () => {
    if (savedRecords.length === 0) {
      showToast('Nenhuma simulação para exportar.');
      return;
    }
    const headers = [
      'ID Simulação',
      'Data/Hora',
      'Ambiente',
      'Beneficiário',
      'Valor Solicitado (R$)',
      'Total Tarifas (R$)',
      'Valor Líquido (R$)',
      'Saldo Restante (R$)',
      'Método',
      'Prazo',
      'Status Operacional',
    ];
    const rows = savedRecords.map((r) => [
      r.id,
      r.timestamp,
      r.environment === 'production' ? 'PRODUÇÃO' : 'TESTE/SANDBOX',
      r.targetName,
      r.requestedAmountBrl.toFixed(2),
      r.totalFeesBrl.toFixed(2),
      r.netAmountBrl.toFixed(2),
      r.remainingBalanceBrl.toFixed(2),
      r.payoutMethod,
      r.processingTime,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs_simulacoes_saque_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportação de simulações em CSV concluída!');
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#121320] via-[#0d0d16] to-[#14121e] border border-amber-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-300 border border-amber-500/60 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 1. CABEÇALHO DO SIMULADOR & AMBIENTE                                */}
      {/* ================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Calculator className="w-4 h-4 text-slate-950" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>SIMULADOR DE SAQUE FINANCEIRO</span>
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                environment === 'sandbox'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              }`}
            >
              {environment === 'sandbox' ? '• AMBIENTE TESTES (SANDBOX)' : '• ECONOMIA REAL (PRODUÇÃO)'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-mono font-semibold border border-slate-700">
              Fórmula Segura · Sem Débito em Conta
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Simulação em tempo real de taxas percentuais, tarifas fixas, valor líquido e projeção de saldo restante sem qualquer movimentação financeira ou bancária.
          </p>
        </div>

        {/* Controles de Ambiente & Histórico */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#090912] border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setEnvironment('sandbox')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                environment === 'sandbox'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Testes
            </button>
            <button
              onClick={() => setEnvironment('production')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                environment === 'production'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Produção
            </button>
          </div>

          <button
            onClick={() => setShowSavedList(!showSavedList)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showSavedList
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulações ({savedRecords.length})</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MENSAGEM FIXA OBRIGATÓRIA (ITEM 7 DA ESPECIFICAÇÃO)                */}
      {/* ================================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3 relative z-10">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-extrabold text-amber-300 tracking-wide uppercase text-[11px]">
            Aviso Regulatório Obrigatório
          </p>
          <p className="text-slate-300 font-medium leading-relaxed">
            “Esta ferramenta é um simulador. Os valores, tarifas e prazos apresentados dependem das configurações e das condições efetivas do serviço financeiro. Nenhuma transferência é realizada por esta simulação.”
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. CAMPOS DO SIMULADOR (FORMULÁRIO INTERATIVO)                     */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* Painel Esquerdo: Inputs de Configuração (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Seletor de Tipo de Saque: Administrador vs Criador */}
          <div className="p-4 rounded-2xl bg-[#090912]/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Tipo de Simulação de Saque
              </span>
              <span className="text-[10px] text-slate-400">Origem dos fundos</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('admin')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'admin'
                    ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Saque do Administrador</span>
                </div>
                <span className="text-[10px] font-normal text-slate-400">
                  Lucro livre da plataforma
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('creator')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'creator'
                    ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-300 border-purple-500/60 shadow-md ring-1 ring-purple-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span>Ganhos de Criador</span>
                </div>
                <span className="text-[10px] font-normal text-slate-400">
                  Repasse de mídias e gorjetas (70%)
                </span>
              </button>
            </div>

            {/* Seletor de Criador (quando tipo for criador) */}
            {targetType === 'creator' && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Selecionar Criador Registrado:</span>
                  <span className="text-[11px] text-purple-400 font-mono">
                    {creators.length} criadores no sistema
                  </span>
                </label>
                <select
                  value={selectedCreator?.creatorId || ''}
                  onChange={(e) => setSelectedCreatorId(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  {creators.map((c) => (
                    <option key={c.creatorId} value={c.creatorId}>
                      {c.publicName} ({c.handle}) — Elegível: R$ {c.eligibleForWithdrawalBrl.toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Saldo Elegível Disponível (Card de Referência) */}
          <div className="p-4 rounded-2xl bg-[#090912]/80 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Saldo Disponível Elegível para Saque
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                R$ {eligibleBalanceBrl.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {environment === 'production'
                  ? 'Integração bancária real não ativada. Saldo real: R$ 0,00.'
                  : targetType === 'admin'
                  ? 'Saldo livre desembaraçado da plataforma apurado pelo livro-razão.'
                  : `Saldo liberado para retirada de ${selectedCreator?.publicName || 'criador'}.`}
              </p>
            </div>

            {/* Botões Rápidos de Porcentagem */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold">Aplicar do Saldo:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: '25%', pct: 25 },
                  { label: '50%', pct: 50 },
                  { label: '75%', pct: 75 },
                  { label: '100%', pct: 100 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleApplyPercentage(item.pct)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-bold font-mono transition-all cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Valor a Simular & Parâmetros de Tarifas */}
          <div className="p-4 rounded-2xl bg-[#090912]/80 border border-slate-800 space-y-4">
            {/* Input de Valor Solicitado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Valor que Deseja Simular (R$):</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {simulationResult.requestedAmountBrl > 0
                    ? `R$ ${simulationResult.requestedAmountBrl.toFixed(2).replace('.', ',')}`
                    : 'R$ 0,00'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={requestedAmountStr}
                  onChange={(e) => setRequestedAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-base font-black font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Tarifas Configuráveis (Percentual + Fixa) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              {/* Taxa Percentual (%) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3 text-sky-400" />
                    Taxa Percentual (%):
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">Configurável</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={feePercentageStr}
                    onChange={(e) => setFeePercentageStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    %
                  </span>
                </div>
              </div>

              {/* Tarifa Fixa (R$) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    Tarifa Fixa (R$):
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Por Ordem</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={fixedFeeStr}
                    onChange={(e) => setFixedFeeStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Canal e Método de Saque Simulado */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  Método de Saque & Prazo Estimado:
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {estimatedProcessingTime}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'pix_instant', label: 'PIX Direto', time: 'Instantâneo' },
                  { id: 'ted_banco', label: 'TED Bancário', time: 'D+1 útil' },
                  { id: 'conta_pagamento', label: 'Subconta', time: 'Imediato' },
                  { id: 'lote_agendado', label: 'Lote D+2', time: 'D+2 prog.' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayoutMethod(m.id as any)}
                    className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                      payoutMethod === m.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <div>{m.label}</div>
                    <div className="text-[9px] text-slate-500 font-normal">{m.time}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Resultados em Tempo Real & Validação (5 Colunas) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* 4 Cartões de Resultados em Tempo Real */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Valor Solicitado (Bruto) */}
              <div className="p-3.5 rounded-2xl bg-[#090912] border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Solicitado
                </span>
                <div className="text-lg sm:text-xl font-black font-mono text-white mt-1">
                  R$ {simulationResult.requestedAmountBrl.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Bruto desejado</span>
              </div>

              {/* Card 2: Total de Tarifas Estimadas */}
              <div className="p-3.5 rounded-2xl bg-[#090912] border border-slate-800">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Total de Tarifas
                </span>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-300 mt-1">
                  R$ {simulationResult.totalEstimatedFeesBrl.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {simulationResult.feePercentageApplied}% + R$ {simulationResult.estimatedFixedFeeBrl.toFixed(2)}
                </span>
              </div>

              {/* Card 3: Valor Líquido Estimado a Receber */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#0e1713] border border-emerald-500/50 shadow-md">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Líquido Estimado
                </span>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-300 mt-1">
                  R$ {simulationResult.netEstimatedAmountBrl.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[10px] text-emerald-400/80 mt-0.5 block">A receber</span>
              </div>

              {/* Card 4: Saldo Restante Estimado */}
              <div className="p-3.5 rounded-2xl bg-[#090912] border border-slate-800">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                  Saldo Restante
                </span>
                <div
                  className={`text-lg sm:text-xl font-black font-mono mt-1 ${
                    simulationResult.remainingBalanceBrl < 0 ? 'text-rose-400' : 'text-sky-300'
                  }`}
                >
                  R$ {simulationResult.remainingBalanceBrl.toFixed(2).replace('.', ',')}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Após o saque</span>
              </div>
            </div>

            {/* Banner Dinâmico de Validação */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                simulationResult.isValid
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : simulationResult.validationStatus === 'no_real_balance'
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}
            >
              {simulationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : simulationResult.validationStatus === 'no_real_balance' ? (
                <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-extrabold uppercase tracking-wide text-[10px]">
                  {simulationResult.isValid
                    ? 'Status da Validação: Simulação Válida'
                    : simulationResult.validationStatus === 'above_balance'
                    ? 'Status: Valor Acima do Saldo Elegível'
                    : simulationResult.validationStatus === 'fees_exceed_amount'
                    ? 'Status: Tarifas Superam o Valor'
                    : simulationResult.validationStatus === 'zero_or_negative'
                    ? 'Status: Valor Zero ou Negativo'
                    : simulationResult.validationStatus === 'no_real_balance'
                    ? 'Status: Modo Produção (Sem Movimentação Real)'
                    : 'Status: Dados Incompletos'}
                </span>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {simulationResult.validationMessage}
                </p>
              </div>
            </div>

            {/* Resumo Rápido da Memória de Cálculo */}
            <div className="p-3.5 rounded-2xl bg-[#090912]/80 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Taxa percentual ({simulationResult.feePercentageApplied}%):</span>
                <span className="font-mono text-slate-200 font-bold">
                  R$ {simulationResult.estimatedPercentageFeeBrl.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Tarifa fixa de liquidação:</span>
                <span className="font-mono text-slate-200 font-bold">
                  R$ {simulationResult.estimatedFixedFeeBrl.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-300 font-bold">
                <span>Total de custos operacionais:</span>
                <span className="font-mono text-amber-300">
                  R$ {simulationResult.totalEstimatedFeesBrl.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Simulador (Requirement 5) */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Botão 1: SIMULAR SAQUE */}
              <button
                type="button"
                onClick={handleExecuteSimulation}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-950" />
                <span>SIMULAR SAQUE</span>
              </button>

              {/* Botão 2: LIMPAR SIMULAÇÃO */}
              <button
                type="button"
                onClick={handleResetSimulation}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>LIMPAR</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Botão 3: VER DETALHAMENTO */}
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>DETALHAMENTO</span>
              </button>

              {/* Botão 4: REGISTRAR SIMULAÇÃO */}
              <button
                type="button"
                onClick={handleSaveSimulation}
                disabled={!simulationResult.isValid}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  simulationResult.isValid
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 cursor-pointer'
                    : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>REGISTRAR</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. HISTÓRICO DE SIMULAÇÕES REGISTRADAS (EXPANSÍVEL)                */}
      {/* ================================================================== */}
      {showSavedList && (
        <div className="pt-4 border-t border-slate-800 space-y-3 relative z-10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Simulações Registradas na Sessão ({savedRecords.length})
              </h4>
              <span className="text-[10px] bg-slate-800 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded font-mono">
                Sem Movimentação Financeira
              </span>
            </div>
            <div className="flex items-center gap-2">
              {savedRecords.length > 0 && (
                <>
                  <button
                    onClick={handleExportSimulationsCsv}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-800 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px] font-semibold flex items-center gap-1 border border-rose-800/40 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Limpar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {savedRecords.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#090912] border border-slate-800/80 text-center space-y-1">
              <p className="text-xs text-slate-400">Nenhuma simulação registrada até o momento.</p>
              <p className="text-[11px] text-slate-500">
                Ajuste os valores desejados e clique em “REGISTRAR” para salvar o registro auditável.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#090912]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold bg-slate-900/60">
                    <th className="py-2.5 px-3">ID / Data</th>
                    <th className="py-2.5 px-3">Ambiente</th>
                    <th className="py-2.5 px-3">Beneficiário</th>
                    <th className="py-2.5 px-3">Valor Solicitado</th>
                    <th className="py-2.5 px-3">Tarifas</th>
                    <th className="py-2.5 px-3">Valor Líquido</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {savedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-bold text-white">{r.id}</div>
                        <div className="text-[9px] text-slate-500 font-sans">{r.timestamp}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            r.environment === 'production'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {r.environment === 'production' ? 'PRODUÇÃO' : 'SANDBOX'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-300">{r.targetName}</td>
                      <td className="py-2 px-3 text-white font-bold">
                        R$ {r.requestedAmountBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-amber-400">
                        R$ {r.totalFeesBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        R$ {r.netAmountBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. MODAL DE MEMÓRIA DE CÁLCULO & DETALHAMENTO (VER DETALHAMENTO)   */}
      {/* ================================================================== */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e0e18] border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#121220]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Memória de Cálculo e Detalhamento da Simulação
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Fórmulas matemáticas auditáveis e parâmetros operacionais aplicados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Resumo da Ordem Simulada */}
              <div className="p-3.5 rounded-2xl bg-[#090912] border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ambiente:</span>
                  <span className="font-bold text-amber-300 uppercase">
                    {simulationResult.environment === 'production' ? 'Produção Real' : 'Testes Sandbox'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Beneficiário:</span>
                  <span className="font-bold text-white truncate block">{simulationResult.targetName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Data e Horário:</span>
                  <span className="font-mono text-slate-300 text-[11px]">{simulationResult.simulatedAt}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Método de Liquidação:</span>
                  <span className="font-bold text-slate-200">{simulationResult.payoutMethodLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Prazo Estimado:</span>
                  <span className="font-bold text-emerald-400">{simulationResult.estimatedProcessingTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status Validação:</span>
                  <span className="font-bold text-sky-400">{simulationResult.validationStatus}</span>
                </div>
              </div>

              {/* Tabela de Passos e Fórmulas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Demonstrativo Passo a Passo da Fórmula
                </span>
                <div className="space-y-2 font-mono text-xs">
                  {simulationResult.calculationMemory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0a0a14] border border-slate-800 space-y-1 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
                        <span className="font-bold text-amber-300">{item.step}</span>
                        {item.note && <span className="text-[10px] text-slate-500">{item.note}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Fórmula: {item.formula}</span>
                        <span className="font-bold text-white text-xs">{item.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso Legal de Auditoria */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-slate-300 space-y-1 font-sans">
                <p className="font-bold text-amber-300">Garantia de Não Movimentação Financeira:</p>
                <p className="text-slate-400 leading-relaxed">
                  Esta memória de cálculo é gerada com base nos parâmetros configurados na interface administrativa e nos saldos apurados pelo livro-razão auditável. A execução desta simulação não altera os saldos conciliados da Jhobs Tecnologia S.A., não debita carteiras virtuais e não emite ordens de pagamento no Sistema de Pagamentos Brasileiro (SPB).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end bg-[#121220]">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
