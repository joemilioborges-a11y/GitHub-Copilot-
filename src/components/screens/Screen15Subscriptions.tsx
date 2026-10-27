import React, { useState, useMemo } from 'react';
import {
  Crown,
  Check,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { UserSubscription, SubscriptionTier } from '../../types';
import {
  exclusiveContentAndInterestService,
  formatDiamondsDisplay,
} from '../../services/exclusiveContentAndInterestService';
import { authService } from '../../utils/authService';

interface Screen15SubscriptionsProps {
  currentSubscription: UserSubscription;
  onUpgrade: (newSub: UserSubscription) => void;
}

export const Screen15Subscriptions: React.FC<Screen15SubscriptionsProps> = ({
  currentSubscription,
  onUpgrade,
}) => {
  const currentUserId = authService.getCurrentSession()?.userId || 'user_emilio_vip';
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('premium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [receiptSummary, setReceiptSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [walletRefresh, setWalletRefresh] = useState(0);

  const catalog = useMemo(
    () => exclusiveContentAndInterestService.getDiamondServiceCatalog(),
    [walletRefresh]
  );

  const buyerWallet = useMemo(
    () => exclusiveContentAndInterestService.getUserDiamondWallet(currentUserId),
    [currentUserId, walletRefresh]
  );

  const plans = [
    {
      id: 'free' as SubscriptionTier,
      name: 'Gratuito',
      badge: 'Básico',
      priceDiamonds: 0,
      durationDays: 30,
      description: 'Ideal para conhecer a plataforma e iniciar conexões autênticas.',
      features: [
        'Cadastro e perfil público',
        'Descoberta de perfis da região',
        'Conexões mútuas ilimitadas',
        'Conversas básicas após match',
        'Verificação de idade +18 inclusa',
      ],
      notIncluded: [
        'Filtros avançados de estilo de vida',
        'Ver quem curtiu seu perfil',
        'Destaque Spotlight no feed',
        'Chamadas de vídeo em HD',
      ],
      buttonText: 'Plano Atual',
      highlight: false,
    },
    {
      id: 'premium' as SubscriptionTier,
      name: 'JOBS Premium',
      badge: 'Mais Popular',
      priceDiamonds: catalog.jobsPremiumDiamonds, // 199 💎 por 30 dias
      durationDays: catalog.jobsPremiumDurationDays,
      description: 'Mais alcance, filtros detalhados e curtidas sem limite diário por 30 dias.',
      features: [
        'Tudo do Plano Gratuito',
        'Curtidas ilimitadas diárias',
        'Ver quem curtiu seu perfil',
        'Filtros avançados (distância, idiomas, hábitos)',
        '5 Super Interesses por semana',
        'Voltar perfil anterior (Rewind)',
      ],
      notIncluded: [
        'Destaque de visibilidade Spotlight',
        'Selo VIP Dourado no perfil',
        'Chamadas em vídeo HD com suporte dedicado',
      ],
      buttonText: `Assinar JOBS Premium (${formatDiamondsDisplay(catalog.jobsPremiumDiamonds)})`,
      highlight: true,
    },
    {
      id: 'vip' as SubscriptionTier,
      name: 'VIP Exclusivo',
      badge: 'Exclusividade Total',
      priceDiamonds: 349,
      durationDays: 30,
      description: 'Máxima visibilidade, suporte dedicado 24/7 e selo VIP dourado por 30 dias.',
      features: [
        'Tudo do Plano JOBS Premium',
        'Destaque no topo da Descoberta (Spotlight)',
        'Selo VIP Dourado de autenticidade',
        'Confirmação de leitura nas mensagens',
        'Chamadas de vídeo em altíssima definição',
        'Super Interesses ilimitados',
        'Consultoria de bio e fotos por IA',
      ],
      notIncluded: [],
      buttonText: `Garantir Acesso VIP (${formatDiamondsDisplay(349)})`,
      highlight: false,
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedTier) || plans[1];

  const handleCheckout = async () => {
    if (selectedTier === 'free') return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await exclusiveContentAndInterestService.purchaseJobsPremiumSubscription({
        buyerUserId: currentUserId,
        idempotencyKey: `idemp_sub_${selectedTier}_${currentUserId}_${Date.now()}`,
        environment: 'sandbox',
      });
      setWalletRefresh((t) => t + 1);
      setIsProcessing(false);
      setCheckoutSuccess(true);
      setReceiptSummary(res.customerReceipt.summaryText);

      const updatedSub: UserSubscription = {
        tier: selectedTier,
        period: 'monthly',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + currentPlan.durationDays * 86400000).toISOString(),
        autoRenew: true,
        priceBrl: 0,
        features: currentPlan.features,
      };
      localStorage.setItem('jobs_user_subscription', JSON.stringify(updatedSub));
      onUpgrade(updatedSub);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Saldo de diamantes insuficiente para ativar assinatura.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-8">
      {/* Top Banner */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Planos & Assinaturas em Diamantes 💎</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
          Escolha o nível ideal para suas conexões
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Ative instantaneamente com os diamantes da sua carteira JOBS. Vigência de 30 dias.
        </p>

        <div className="inline-flex items-center gap-2 bg-[#12121e] px-4 py-2 rounded-2xl border border-amber-500/30 mt-3 text-xs">
          <span className="text-slate-300">Seu Saldo Disponível:</span>
          <strong className="font-mono text-amber-300">
            {formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}
          </strong>
          <span className="text-[11px] text-slate-500 font-mono">
            (Comprados: {buyerWallet.purchasedDiamonds} 💎 · Bônus: {buyerWallet.bonusDiamonds} 💎)
          </span>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isSelected = selectedTier === p.id;
          const isCurrent = currentSubscription.tier === p.id;

          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedTier(p.id);
                setCheckoutSuccess(false);
                setErrorMessage(null);
              }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? p.highlight
                    ? 'bg-gradient-to-b from-[#18131e] to-[#110f18] border-amber-500 shadow-xl shadow-amber-950/30'
                    : 'bg-[#151524] border-rose-500 shadow-xl shadow-rose-950/30'
                  : 'bg-[#0f0f18] border-white/5 hover:border-white/20'
              }`}
            >
              {p.highlight && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-rose-500 text-slate-950 font-black text-[10px] uppercase px-3 py-1 rounded-bl-xl shadow">
                  Oficial Catálogo
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-lg text-white">{p.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-400">{p.badge}</span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-display font-extrabold text-white">
                    {p.priceDiamonds === 0 ? 'Grátis' : formatDiamondsDisplay(p.priceDiamonds)}
                  </span>
                  {p.priceDiamonds > 0 && (
                    <span className="text-xs text-slate-400"> / {p.durationDays} dias</span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  {p.description}
                </p>

                {/* Features list */}
                <div className="space-y-2.5 text-xs mb-6">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {p.notIncluded.map((ni, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-500 line-through">
                      <span className="w-4 h-4 shrink-0 text-center">•</span>
                      <span>{ni}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isCurrent
                    ? 'bg-white/10 text-slate-300'
                    : isSelected
                    ? p.highlight
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950'
                      : 'bg-rose-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {isCurrent ? 'Plano Ativo' : p.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout Box if Paid Plan is Selected */}
      {selectedTier !== 'free' && (
        <div className="p-6 rounded-3xl bg-[#11111d] border border-white/10 max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Ativação com Carteira de Diamantes • {currentPlan.name}
              </h3>
              <p className="text-xs text-slate-400">
                Custo total: <strong>{formatDiamondsDisplay(currentPlan.priceDiamonds)}</strong> · Vigência:{' '}
                <strong>{currentPlan.durationDays} dias</strong>
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {checkoutSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-display font-bold text-white">
                Assinatura Ativada em Diamantes!
              </h4>
              <p className="text-xs text-slate-300">
                {receiptSummary ||
                  `Seu perfil foi atualizado para o nível ${currentPlan.name} por ${currentPlan.durationDays} dias.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Plano selecionado:</span>
                  <strong className="text-white">{currentPlan.name}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Período de acesso:</span>
                  <strong className="text-white">{currentPlan.durationDays} dias</strong>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Débito na carteira:</span>
                  <strong>{formatDiamondsDisplay(currentPlan.priceDiamonds)}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Saldo atual:</span>
                  <span>{formatDiamondsDisplay(buyerWallet.totalAvailableDiamonds)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCheckout}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-display font-bold text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processando ativação segura...</span>
                ) : (
                  <>
                    <span>
                      Confirmar e Ativar {currentPlan.name} ({formatDiamondsDisplay(currentPlan.priceDiamonds)})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
