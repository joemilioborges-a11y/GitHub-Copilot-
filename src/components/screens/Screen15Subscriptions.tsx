import React, { useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  QrCode,
  Copy,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { UserSubscription, SubscriptionTier } from '../../types';

interface Screen15SubscriptionsProps {
  currentSubscription: UserSubscription;
  onUpgrade: (newSub: UserSubscription) => void;
}

export const Screen15Subscriptions: React.FC<Screen15SubscriptionsProps> = ({
  currentSubscription,
  onUpgrade,
}) => {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('vip');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const plans = [
    {
      id: 'free' as SubscriptionTier,
      name: 'Gratuito',
      badge: 'Básico',
      priceMonthly: 0,
      priceYearly: 0,
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
      name: 'Premium',
      badge: 'Mais Popular',
      priceMonthly: 39.9,
      priceYearly: 29.9,
      description: 'Mais alcance, filtros detalhados e curtidas sem limite diário.',
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
      buttonText: 'Assinar Premium',
      highlight: false,
    },
    {
      id: 'vip' as SubscriptionTier,
      name: 'VIP Exclusivo',
      badge: 'Exclusividade Total',
      priceMonthly: 79.9,
      priceYearly: 59.9,
      description: 'Máxima visibilidade, suporte dedicado 24/7 e selo VIP dourado.',
      features: [
        'Tudo do Plano Premium',
        'Destaque no topo da Descoberta (Spotlight)',
        'Selo VIP Dourado de autenticidade',
        'Confirmação de leitura nas mensagens',
        'Chamadas de vídeo em altíssima definição',
        'Super Interesses ilimitados',
        'Consultoria de bio e fotos por IA',
      ],
      notIncluded: [],
      buttonText: 'Garantir Acesso VIP',
      highlight: true,
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedTier) || plans[2];
  const activePrice = period === 'monthly' ? currentPlan.priceMonthly : currentPlan.priceYearly;

  const handleCheckout = () => {
    if (selectedTier === 'free') return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutSuccess(true);
      const updatedSub: UserSubscription = {
        tier: selectedTier,
        period,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        autoRenew: true,
        priceBrl: activePrice,
        features: currentPlan.features,
      };
      localStorage.setItem('jobs_user_subscription', JSON.stringify(updatedSub));
      onUpgrade(updatedSub);
    }, 1500);
  };

  const simulatedPixCode = `00020126580014br.gov.bcb.pix0136jobs-pay-${Date.now()}520400005303986540${activePrice.toFixed(2)}5802BR5916JOBS PLATAFORMA6009SAO PAULO62070503***6304`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-8">
      {/* Top Banner */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Planos & Assinaturas JOBS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
          Escolha o nível ideal para suas conexões
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Sem taxas ocultas, cancele a qualquer momento direto no aplicativo.
        </p>

        {/* Period Selector (Monthly vs Yearly) */}
        <div className="inline-flex items-center bg-[#12121e] p-1 rounded-2xl border border-white/10 mt-3">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              period === 'monthly'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              period === 'yearly'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Anual</span>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
              Economize 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isSelected = selectedTier === p.id;
          const isCurrent = currentSubscription.tier === p.id;
          const price = period === 'monthly' ? p.priceMonthly : p.priceYearly;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedTier(p.id)}
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
                  Recomendado
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-lg text-white">{p.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-400">{p.badge}</span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-display font-extrabold text-white">
                    {price === 0 ? 'Grátis' : `R$ ${price.toFixed(2)}`}
                  </span>
                  {price > 0 && <span className="text-xs text-slate-400"> /mês</span>}
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
                Checkout Seguro • Plano {currentPlan.name}
              </h3>
              <p className="text-xs text-slate-400">
                Valor total: <strong>R$ {activePrice.toFixed(2)}</strong> ({period === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual com desconto'})
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>

          {checkoutSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-display font-bold text-white">
                Assinatura Ativada com Sucesso!
              </h4>
              <p className="text-xs text-slate-300">
                Seu perfil foi atualizado para o nível <strong>{currentPlan.name}</strong>. Aproveite todos os benefícios exclusivos!
              </p>
            </div>
          ) : (
            <>
              {/* Payment Method Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-[#151524] border-white/5 text-slate-400'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pix Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                      : 'bg-[#151524] border-white/5 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>

              {/* Pix Info */}
              {paymentMethod === 'pix' && (
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 text-center space-y-3">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center">
                    {/* Simulated Pix QR graphic */}
                    <div className="w-full h-full border-4 border-slate-900 grid grid-cols-4 gap-1 p-1">
                      <div className="bg-slate-900 col-span-2 row-span-2" />
                      <div className="bg-slate-900" />
                      <div className="bg-slate-900" />
                      <div className="bg-slate-900" />
                      <div className="bg-slate-900 col-span-2 row-span-2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 max-w-sm mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={simulatedPixCode}
                      className="flex-1 bg-[#151524] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-400 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(simulatedPixCode);
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Número do Cartão</label>
                    <input
                      type="text"
                      defaultValue="•••• •••• •••• 4242"
                      className="w-full bg-[#151524] border border-white/10 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Validade</label>
                      <input
                        type="text"
                        defaultValue="12/28"
                        className="w-full bg-[#151524] border border-white/10 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">CVV</label>
                      <input
                        type="text"
                        defaultValue="888"
                        className="w-full bg-[#151524] border border-white/10 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    <span>Confirmar e Ativar {currentPlan.name} (R$ {activePrice.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
