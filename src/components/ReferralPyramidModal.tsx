import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Share2,
  Users,
  Coins,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Sparkles,
  QrCode,
  DollarSign,
  TrendingUp,
  Award,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  MessageCircle,
  ExternalLink,
  Send,
} from 'lucide-react';
import {
  getUserReferralData,
  isReferralCampaignActive,
  simulateNewReferralJoin,
  withdrawReferralEarnings,
  getReferralShareCopy,
} from '../data/referralData';
import { ReferralPyramidData, PixKeyType } from '../types';
import { trackEvent } from '../utils/analytics';

interface ReferralPyramidModalProps {
  onClose: () => void;
  onOpenWallet?: () => void;
  onWithdrawPixDirect?: (amountBrl: number, pixKey: string, pixType: string, bank: string) => void;
}

const BRAZILIAN_BANKS = [
  'Nubank (Nu Pagamentos S.A.)',
  'Banco Inter S.A.',
  'Itaú Unibanco S.A.',
  'Banco Bradesco S.A.',
  'Banco do Brasil S.A.',
  'Santander Brasil S.A.',
  'Caixa Econômica Federal',
  'C6 Bank S.A.',
  'Mercado Pago',
  'PicPay',
];

export const ReferralPyramidModal: React.FC<ReferralPyramidModalProps> = ({
  onClose,
  onOpenWallet,
  onWithdrawPixDirect,
}) => {
  const [data, setData] = useState<ReferralPyramidData>(() => getUserReferralData());
  const [isCampaignActive, setIsCampaignActive] = useState<boolean>(() => isReferralCampaignActive());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCopyText, setCopiedCopyText] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // PIX Withdrawal from Referral Rewards State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(() =>
    Math.min(data.availableForWithdrawBrl, 150)
  );
  const [pixType, setPixType] = useState<PixKeyType>('cpf');
  const [pixKey, setPixKey] = useState('389.412.871-04');
  const [bankName, setBankName] = useState(BRAZILIAN_BANKS[0]);
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [withdrawReceipt, setWithdrawReceipt] = useState<{
    amountBrl: number;
    endToEndId: string;
    pixKey: string;
    bank: string;
    timestamp: string;
  } | null>(null);

  // Sync state when storage or custom event changes
  useEffect(() => {
    const handleUpdate = () => {
      setData(getUserReferralData());
      setIsCampaignActive(isReferralCampaignActive());
    };
    window.addEventListener('jhobs:referral_updated', handleUpdate);
    window.addEventListener('jhobs:referral_status_changed', handleUpdate);
    return () => {
      window.removeEventListener('jhobs:referral_updated', handleUpdate);
      window.removeEventListener('jhobs:referral_status_changed', handleUpdate);
    };
  }, []);

  const shareCopy = getReferralShareCopy(data.userReferralLink);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(data.userReferralLink);
    setCopiedLink(true);
    setToastMsg('Link exclusivo copiado! Envie para seus contatos.');
    setTimeout(() => {
      setCopiedLink(false);
      setToastMsg(null);
    }, 3000);
  };

  const handleCopyFullPromoText = () => {
    navigator.clipboard?.writeText?.(shareCopy.fullText);
    setCopiedCopyText(true);
    setToastMsg('Texto promocional completo copiado com sucesso!');
    setTimeout(() => {
      setCopiedCopyText(false);
      setToastMsg(null);
    }, 3000);
  };

  const handleSimulateNewFriend = () => {
    if (!isCampaignActive) {
      setToastMsg('A campanha está desativada no momento pelo administrador.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    const res = simulateNewReferralJoin(1);
    setData(getUserReferralData());

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#fbbf24', '#f43f5e', '#38bdf8'],
      });
    } catch (e) {}

    setToastMsg(
      `🎉 Novo usuário entrou pelo seu link! +R$ ${res.rewardBrl.toFixed(2).replace('.', ',')} adicionados para saque via PIX!`
    );
    setTimeout(() => setToastMsg(null), 4000);
    trackEvent('referral_simulate_new_friend', { rewardBrl: res.rewardBrl });
  };

  const handleExecuteWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > data.availableForWithdrawBrl) return;

    setIsProcessingWithdraw(true);

    setTimeout(() => {
      setIsProcessingWithdraw(false);
      const res = withdrawReferralEarnings(withdrawAmount, pixKey, pixType, bankName);
      setData(getUserReferralData());

      setWithdrawReceipt({
        amountBrl: withdrawAmount,
        endToEndId: res.endToEndId,
        pixKey,
        bank: bankName,
        timestamp: new Date().toLocaleString('pt-BR'),
      });

      if (onWithdrawPixDirect) {
        onWithdrawPixDirect(withdrawAmount, pixKey, pixType, bankName);
      }

      trackEvent('referral_rewards_withdrawn_pix', { amountBrl: withdrawAmount, pixKey, bankName, status: 'under_review' });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0f0f18] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 relative z-10 bg-[#121220]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-amber-950/50 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#12121e] rounded-[14px] flex items-center justify-center text-amber-400">
                <Share2 className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  Programa de Afiliados & Pirâmide Viral
                </span>
                {isCampaignActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Campanha Ativa</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>Pausada pelo Administrador</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                Indique Amigos & Ganhe em Pirâmide
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-left relative z-10 flex-1">
          {/* Toast Msg */}
          {toastMsg && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-500/50 text-xs text-emerald-300 text-center font-bold animate-in fade-in flex items-center justify-center gap-2 shadow-lg">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Alert if Campaign is Paused by Admin */}
          {!isCampaignActive && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-[#1c0f16] to-rose-950/80 border border-rose-500/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 space-y-1">
                <strong className="text-white block font-bold">
                  Campanha de Recompensas Temporariamente Pausada pelo Administrador
                </strong>
                <p className="leading-relaxed">
                  O administrador pausou as novas inscrições de afiliados para encerramento do ciclo mensal de apuração. Seu saldo acumulado de R$ {data.availableForWithdrawBrl.toFixed(2).replace('.', ',')} permanece 100% seguro e pode ser sacado normalmente via PIX a qualquer momento.
                </p>
              </div>
            </div>
          )}

          {/* Top KPI Balance Row with PIX Withdrawal Button */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#101b16] border border-emerald-500/50 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Disponível para Saque PIX</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block">
                R$ {data.availableForWithdrawBrl.toFixed(2).replace('.', ',')}
              </span>
              <button
                type="button"
                onClick={() => setShowWithdrawForm(true)}
                disabled={data.availableForWithdrawBrl <= 0}
                className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Sacar via PIX Agora</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ganhos Totais Acumulados</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 block">
                R$ {data.totalEarnedBrl.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-slate-400 block pt-1 font-mono">
                R$ {data.totalWithdrawnBrl.toFixed(2).replace('.', ',')} já transferidos para seu banco
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#141424] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tamanho da sua Rede</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                {data.totalMembersCount} Pessoas
              </span>
              <span className="text-[11px] text-slate-400 block pt-1 font-mono">
                {data.level1Count} diretos • {data.level2Count} nível 2 • {data.level3Count} nível 3
              </span>
            </div>
          </div>

          {/* Form Modal: PIX Withdrawal Form */}
          {showWithdrawForm && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#121b14] via-[#0d1410] to-[#14121e] border-2 border-emerald-500/60 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Transferir Ganhos da Pirâmide para sua Chave PIX
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawForm(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {withdrawReceipt ? (
                <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Solicitação de Saque Registrada — Em Análise</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sua solicitação foi protocolada para revisão de conformidade. A liquidação bancária depende de confirmação do provedor de pagamentos.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Valor Solicitado:</span>
                      <strong className="text-amber-300 text-sm">
                        R$ {withdrawReceipt.amountBrl.toFixed(2).replace('.', ',')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Banco Informado:</span>
                      <span className="text-white">{withdrawReceipt.bank}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Protocolo Interno da Solicitação (Status: Em Análise):</span>
                      <span className="text-[10px] text-slate-400 break-all">{withdrawReceipt.endToEndId}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawReceipt(null);
                      setShowWithdrawForm(false);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteWithdraw} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Valor do Saque (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        max={data.availableForWithdrawBrl}
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="w-full bg-[#0a0f0c] border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-mono font-bold outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tipo da Chave PIX</label>
                      <select
                        value={pixType}
                        onChange={(e) => setPixType(e.target.value as PixKeyType)}
                        className="w-full bg-[#0a0f0c] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      >
                        <option value="cpf">CPF</option>
                        <option value="telefone">Celular / Telefone</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Chave Aleatória (EVP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Chave PIX</label>
                      <input
                        type="text"
                        required
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="w-full bg-[#0a0f0c] border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Banco de Destino</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-[#0a0f0c] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {BRAZILIAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingWithdraw || withdrawAmount <= 0}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingWithdraw ? (
                      <span>Transferindo via PIX...</span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Confirmar Transferência de R$ {withdrawAmount.toFixed(2).replace('.', ',')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Visual 3-Tier Pyramid Diagram */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#121220] border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Estrutura de Ganhos em 3 Níveis
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Como Funciona a Pirâmide de Recompensas Jhobs
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Ganhos automáticos e comissões vitalícias
              </span>
            </div>

            {/* Diagram */}
            <div className="flex flex-col items-center space-y-3 pt-2">
              {/* Level 0: You */}
              <div className="w-full max-w-sm p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-2 border-amber-400/70 text-center shadow-lg shadow-amber-950/40">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  👑 Topo da Pirâmide
                </div>
                <div className="text-sm font-black text-white">Você (Embaixador Master)</div>
                <div className="text-[11px] text-amber-200 mt-0.5">
                  Recebe comissões instantâneas de toda a sua rede abaixo
                </div>
              </div>

              {/* Connecting line */}
              <div className="w-0.5 h-4 bg-gradient-to-b from-amber-400 to-emerald-400" />

              {/* Level 1 */}
              <div className="w-full max-w-md p-3.5 rounded-2xl bg-[#161b24] border border-emerald-500/50 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      1º
                    </span>
                    <div>
                      <strong className="text-xs text-white block">Nível 1: Seus Convidados Diretos</strong>
                      <span className="text-[11px] text-slate-400">{data.level1Count} amigos cadastrados</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-400 block font-mono">
                      R$ 15,00 + 20%
                    </span>
                    <span className="text-[10px] text-slate-400">por amigo + comissão de recargas</span>
                  </div>
                </div>
              </div>

              {/* Connecting line */}
              <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-400 to-sky-400" />

              {/* Level 2 */}
              <div className="w-full max-w-lg p-3.5 rounded-2xl bg-[#161626] border border-sky-500/40 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                      2º
                    </span>
                    <div>
                      <strong className="text-xs text-white block">Nível 2: Amigos dos seus Amigos</strong>
                      <span className="text-[11px] text-slate-400">{data.level2Count} membros na rede</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-sky-300 block font-mono">
                      R$ 5,00 + 10%
                    </span>
                    <span className="text-[10px] text-slate-400">por nova adesão + comissão</span>
                  </div>
                </div>
              </div>

              {/* Connecting line */}
              <div className="w-0.5 h-4 bg-gradient-to-b from-sky-400 to-purple-400" />

              {/* Level 3 */}
              <div className="w-full max-w-xl p-3.5 rounded-2xl bg-[#191426] border border-purple-500/40 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs">
                      3º
                    </span>
                    <div>
                      <strong className="text-xs text-white block">Nível 3: Expansão Viral da Base</strong>
                      <span className="text-[11px] text-slate-400">{data.level3Count} membros multiplicando</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-purple-300 block font-mono">
                      R$ 2,50 + 5%
                    </span>
                    <span className="text-[10px] text-slate-400">sobre todas as recargas da base</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Promotional Propaganda Card & Sharing Links */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1c1424] via-[#14121a] to-[#12121e] border-2 border-amber-500/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                  Material de Propaganda Pronta
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Seu Link Exclusivo & Texto de Alta Conversão
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Código: {data.userReferralCode}
              </span>
            </div>

            {/* Quick Link Copy Field */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Link Pessoal de Divulgação:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.userReferralLink}
                  className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!isCampaignActive}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 disabled:opacity-40"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-2">
                Compartilhar Imediatamente com 1 Clique:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href={isCampaignActive ? shareCopy.whatsappUrl : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md ${
                    !isCampaignActive ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={isCampaignActive ? shareCopy.telegramUrl : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md ${
                    !isCampaignActive ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </a>

                <a
                  href={isCampaignActive ? shareCopy.twitterUrl : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 ${
                    !isCampaignActive ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span>X / Twitter</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyFullPromoText}
                  disabled={!isCampaignActive}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-40"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedCopyText ? 'Copiado!' : 'Copiar Copy'}</span>
                </button>
              </div>
            </div>

            {/* Promotional Banner Preview */}
            <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">
                Prévia da Propaganda Enviada aos Amigos:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                "{shareCopy.fullText}"
              </p>
            </div>
          </div>

          {/* Interactive Simulation Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#131b14] to-[#121220] border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <strong className="text-xs text-white block font-bold">
                  Simulador de Conversão em Tempo Real
                </strong>
                <p className="text-[11px] text-slate-400">
                  Teste o que acontece quando alguém acessa seu link, instala o app e realiza a primeira recarga.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateNewFriend}
              disabled={!isCampaignActive}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simular Novo Amigo Entrando</span>
            </button>
          </div>

          {/* Recent Referral Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Membros Recentes na sua Rede ({data.recentReferrals.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Atualizado em tempo real</span>
            </div>

            <div className="space-y-2">
              {data.recentReferrals.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-2xl bg-[#141424] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold truncate">{member.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            member.level === 1
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : member.level === 2
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          Nível {member.level}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {member.joinedAt} • {member.creditsPurchased} créditos recarregados
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono text-emerald-400 block">
                      +R$ {member.rewardEarnedBrl.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">
                      Creditado no PIX ✅
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d0d16] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 text-center sm:text-left">
            Os saques do programa de indicação são processados instantaneamente via chave PIX para qualquer banco brasileiro.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
