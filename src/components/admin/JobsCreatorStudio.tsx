import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Lock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  DollarSign,
  Camera,
  Video,
  Layers,
  Upload,
} from 'lucide-react';
import {
  exclusiveContentAndInterestService,
  ExclusiveMediaType,
  ExclusiveMonetizationModality,
  calculateSplit70_20_10Cents,
  formatDiamondsDisplay,
} from '../../services/exclusiveContentAndInterestService';

export const JobsCreatorStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'performance' | 'exclusive_vault' | 'editorial' | 'pricing' | 'trust_safety'
  >('performance');
  const [selectedCreatorId, setSelectedCreatorId] = useState<'valentina' | 'isabella'>('valentina');
  const [refreshTick, setRefreshTick] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulário de publicação de foto/vídeo em diamantes (💎)
  const [newMediaType, setNewMediaType] = useState<ExclusiveMediaType>('photo');
  const [newModality, setNewModality] = useState<ExclusiveMonetizationModality>('INDIVIDUAL_UNLOCK');
  const [newCaption, setNewCaption] = useState('');
  const [newPriceDiamondsInput, setNewPriceDiamondsInput] = useState('49');
  const [vaultPriceDiamondsInput, setVaultPriceDiamondsInput] = useState('149');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const creatorSummary = useMemo(
    () => exclusiveContentAndInterestService.getCreatorDashboardSummary(selectedCreatorId, 'sandbox'),
    [selectedCreatorId, refreshTick]
  );

  const platformReconciliation = useMemo(
    () => exclusiveContentAndInterestService.getPlatformReconciliationReport('sandbox'),
    [refreshTick]
  );

  const creatorMediaItems = useMemo(
    () =>
      exclusiveContentAndInterestService.listPublicMediaForProfile({
        creatorId: selectedCreatorId,
        viewerUserId: selectedCreatorId,
        includeNonPublishedForCreatorOrAdmin: true,
      }),
    [selectedCreatorId, refreshTick]
  );

  const vaultConfig = useMemo(
    () => exclusiveContentAndInterestService.getVipVaultConfig(selectedCreatorId),
    [selectedCreatorId, refreshTick]
  );

  const handlePublishNewMedia = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedPriceDiamonds =
        newModality === 'INDIVIDUAL_UNLOCK'
          ? Math.round(Number(newPriceDiamondsInput))
          : 0;
      const item = exclusiveContentAndInterestService.publishOrCreateMedia({
        creatorId: selectedCreatorId,
        creatorName: selectedCreatorId === 'valentina' ? 'Valentina Rossi' : 'Isabella Fontes',
        mediaType: newMediaType,
        modality: newModality,
        caption:
          newCaption.trim() ||
          `${newMediaType === 'video' ? 'Vídeo Exclusivo' : 'Foto Exclusiva'} (${
            newModality === 'VIP_VAULT' ? 'Cofre VIP' : 'Desbloqueio Individual'
          })`,
        priceDiamonds: parsedPriceDiamonds,
        classification: newModality === 'VIP_VAULT' ? 'consensual_nudity_18plus' : 'sensual',
        ageVerified18Plus: true,
        consentDeclared: true,
        safePreviewUrl:
          selectedCreatorId === 'valentina'
            ? '/src/assets/images/profile_valentina_1791856836634.jpg'
            : '/src/assets/images/profile_isabella_1791856837043.jpg',
        privateMasterUrl: `private://vault/${selectedCreatorId}/${Date.now()}_master.${
          newMediaType === 'video' ? 'mp4' : 'jpg'
        }`,
        initialState: 'published',
      });
      setNewCaption('');
      setRefreshTick((t) => t + 1);
      showToast(
        `Mídia publicada com sucesso (${
          item.modality === 'VIP_VAULT' ? 'Cofre VIP' : `Individual ${formatDiamondsDisplay(item.priceDiamonds)}`
        })!`
      );
    } catch (err: any) {
      showToast(err?.message || 'Erro ao publicar mídia.');
    }
  };

  const handleUpdateVaultPrice = () => {
    try {
      const diamonds = Math.round(Number(vaultPriceDiamondsInput));
      const updated = exclusiveContentAndInterestService.updateVipVaultConfig({
        creatorId: selectedCreatorId,
        priceDiamonds: diamonds,
      });
      setRefreshTick((t) => t + 1);
      showToast(`Preço do Cofre VIP atualizado para ${formatDiamondsDisplay(updated.priceDiamonds)} (${updated.durationDays} dias)!`);
    } catch (err: any) {
      showToast(err?.message || 'Preço em diamantes inválido.');
    }
  };

  // Métricas Consolidadas de Performance (Padrão Internacional)
  const performanceKpis = [
    {
      title: 'Impressões Globais de Feed',
      value: '2.480.920',
      change: '+18.4%',
      isPositive: true,
      desc: 'Exibições de cards de criadores e prévias na timeline',
    },
    {
      title: 'Visualizações de Prévia (Teaser)',
      value: '684.210',
      change: '+22.1%',
      isPositive: true,
      desc: 'Interações com mídia em blur ou amostra grátis',
    },
    {
      title: 'Taxa de Conversão Prévia → Desbloqueio',
      value: '28,4%',
      change: '+3.2%',
      isPositive: true,
      desc: 'Percentual de prévias convertidas em pagamento de créditos',
    },
    {
      title: 'Ticket Médio por Desbloqueio',
      value: 'R$ 72,50',
      change: '+5.7%',
      isPositive: true,
      desc: 'Consumo ponderado entre ensaios VIP e vídeos privados',
    },
  ];

  // Calendário Editorial e Agendamento
  const [scheduledPosts] = useState([
    {
      id: 'post_01',
      creator: 'Valentina Rossi',
      title: 'Ensaio Boudoir Iluminação Noturna 4K',
      category: 'Fotos Privadas',
      type: 'photo',
      price: 150,
      scheduledFor: 'Hoje, 21:00',
      status: 'scheduled',
      previewType: 'blur_high',
      exclusivity: 'VIP Black',
    },
    {
      id: 'post_02',
      creator: 'Isabella Fontes',
      title: 'Behind the Scenes & Dança Exclusiva',
      category: 'Vídeos Secretos',
      type: 'video',
      price: 220,
      scheduledFor: 'Amanhã, 18:30',
      status: 'scheduled',
      previewType: 'video_teaser_10s',
      exclusivity: 'Gold VIP',
    },
    {
      id: 'post_03',
      creator: 'Beatriz Lima',
      title: 'Look do Dia & Ensaio Praia Sunset',
      category: 'Desafios de Look',
      type: 'photo',
      price: 80,
      scheduledFor: '25/10/2026, 15:00',
      status: 'draft',
      previewType: 'free_watermark',
      exclusivity: 'Standard',
    },
  ]);

  // Regras de Precificação Dinâmica
  const [pricingRules] = useState([
    {
      id: 'cat_photos',
      label: 'Fotos Sensuais & Boudoir',
      suggestedCredits: 80,
      minCredits: 30,
      maxCredits: 200,
      previewTimeSec: 0,
      autoWatermark: true,
    },
    {
      id: 'cat_videos',
      label: 'Vídeos Exclusivos 4K',
      suggestedCredits: 180,
      minCredits: 80,
      maxCredits: 500,
      previewTimeSec: 10,
      autoWatermark: true,
    },
    {
      id: 'cat_lives',
      label: 'Gorjetas & Presentes em Live',
      suggestedCredits: 50,
      minCredits: 10,
      maxCredits: 1000,
      previewTimeSec: 0,
      autoWatermark: false,
    },
    {
      id: 'cat_challenges',
      label: 'Desafios Interativos de Look',
      suggestedCredits: 120,
      minCredits: 50,
      maxCredits: 350,
      previewTimeSec: 5,
      autoWatermark: true,
    },
  ]);

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header do Creator Studio */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-rose-500" />
              <h3 className="text-xl font-black text-white tracking-tight">
                JOBS Creator Studio
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Padrão Internacional
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Central estratégica de publicação de fotos e vídeos individuais, Cofre VIP independente, regra contábil 70/30 e reconciliação em ambiente Sandbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 shrink-0">
            {[
              { id: 'performance', label: 'Desempenho & Conversão', icon: TrendingUp },
              { id: 'exclusive_vault', label: 'Mídias, Cofre VIP & 70/30', icon: DollarSign },
              { id: 'editorial', label: 'Calendário Editorial', icon: Calendar },
              { id: 'pricing', label: 'Precificação & Paywall', icon: Sliders },
              { id: 'trust_safety', label: 'Trust & Direitos', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUB-ABA 1: DESEMPENHO E CONVERSÃO */}
      {activeTab === 'performance' && (
        <div className="space-y-5">
          {/* Grid de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceKpis.map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#0f0f18] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">{kpi.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold">
                    {kpi.change}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-white">{kpi.value}</div>
                <p className="text-[10px] text-slate-500 leading-tight">{kpi.desc}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de Conversão por Categoria de Mídia */}
          <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  <span>Eficiência de Conversão do Funil: Teaser Blur → Desbloqueio Pago</span>
                </h4>
                <p className="text-xs text-slate-400">Desempenho comparativo por tipo de mídia e exclusividade</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                Média do Sistema: 28,4%
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Vídeos Privados 4K (Teaser de 10s)', rate: 41.2, totalUnlocks: 4890, avgBrl: 'R$ 82,40' },
                { label: 'Cofre VIP Exclusivo (+18 Consentido)', rate: 36.8, totalUnlocks: 3490, avgBrl: 'R$ 49,90' },
                { label: 'Ensaios Fotográficos Individuais (Blur)', rate: 26.8, totalUnlocks: 5640, avgBrl: 'R$ 24,90' },
                { label: 'Envio de Interesse Imediato (Pré-Match)', rate: 23.4, totalUnlocks: 2150, avgBrl: 'R$ 19,90' },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{item.label}</span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-400">{item.totalUnlocks} desbloqueios</span>
                      <span className="text-amber-400 font-bold">{item.avgBrl} ticket</span>
                      <strong className="text-emerald-400 font-bold">{item.rate}% conversão</strong>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${item.rate * 2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA NOVA: PUBLICAÇÃO DE FOTOS/VÍDEOS, COFRE VIP E EXTRATO 70/20/10 */}
      {activeTab === 'exclusive_vault' && (
        <div className="space-y-5">
          {/* Seletor de Criador e Resumo Financeiro 70/20/10 */}
          <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Gestão de Conteúdo Exclusivo, Cofre VIP & Partição Contábil 70/20/10
                </h4>
                <p className="text-xs text-slate-400">
                  Preços ao cliente em 💎 · Contabilidade interna: 70% Criador · 20% Receita JOBS · 10% Reserva Operacional (1 💎 pago = R$ 0,10)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(['valentina', 'isabella'] as const).map((cid) => (
                  <button
                    key={cid}
                    onClick={() => setSelectedCreatorId(cid)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                      selectedCreatorId === cid
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {cid === 'valentina' ? 'Valentina Rossi' : 'Isabella Fontes'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Diamantes Recebidos</span>
                <strong className="text-lg font-mono text-white">
                  {creatorSummary.totalDiamondsReceived} 💎
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  Pagos: {creatorSummary.paidDiamondsReceived} 💎 · Bônus: {creatorSummary.bonusDiamondsReceived} 💎
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
                <span className="text-emerald-400 block text-[10px]">Repasse Criador (70%)</span>
                <strong className="text-lg font-mono text-emerald-300">
                  R$ {creatorSummary.creatorShare70Brl.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  Disponível: R$ {creatorSummary.availableBalanceBrl.toFixed(2)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
                <span className="text-amber-400 block text-[10px]">Receita JOBS (20%)</span>
                <strong className="text-lg font-mono text-amber-300">
                  R$ {creatorSummary.platformShare20Brl.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-500 block">Margem líquida plataforma</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30">
                <span className="text-indigo-400 block text-[10px]">Reserva Operacional (10%)</span>
                <strong className="text-lg font-mono text-indigo-300">
                  R$ {creatorSummary.operationalReserve10Brl.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-500 block">Taxas, antifraude & estornos</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Catálogo Publicado (+18)</span>
                <strong className="text-lg font-mono text-white">
                  {creatorSummary.publishedIndividualPhotosCount +
                    creatorSummary.publishedIndividualVideosCount +
                    creatorSummary.publishedVipVaultItemsCount}{' '}
                  mídias
                </strong>
                <span className="text-[10px] text-amber-300 font-mono block">
                  Cofre VIP: {vaultConfig.priceDiamonds} 💎 ({vaultConfig.durationDays}d)
                </span>
              </div>
            </div>

            {/* Formulário de Publicação de Nova Foto/Vídeo e Configuração do Cofre VIP */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <form
                onSubmit={handlePublishNewMedia}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs"
              >
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Publicar Nova Foto ou Vídeo Exclusivo</span>
                  <span className="text-[10px] font-mono text-emerald-400">+18 & Consentimento Verificados</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Tipo de Conteúdo</label>
                    <select
                      value={newMediaType}
                      onChange={(e) => {
                        const type = e.target.value as ExclusiveMediaType;
                        setNewMediaType(type);
                        setNewPriceDiamondsInput(type === 'video' ? '99' : '49');
                      }}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-white text-xs"
                    >
                      <option value="photo">Foto Exclusiva (Padrão 49 💎)</option>
                      <option value="video">Vídeo Exclusivo (Padrão 99 💎)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Modalidade de Monetização</label>
                    <select
                      value={newModality}
                      onChange={(e) => setNewModality(e.target.value as ExclusiveMonetizationModality)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-white text-xs"
                    >
                      <option value="INDIVIDUAL_UNLOCK">Desbloqueio Individual (💎)</option>
                      <option value="VIP_VAULT">Cofre VIP Independente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Legenda da Publicação</label>
                  <input
                    type="text"
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Ex: Ensaio exclusivo iluminação noturna (+18)"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white text-xs"
                  />
                </div>

                {newModality === 'INDIVIDUAL_UNLOCK' && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Preço Individual em Diamantes (💎)</label>
                    <input
                      type="number"
                      min={1}
                      value={newPriceDiamondsInput}
                      onChange={(e) => setNewPriceDiamondsInput(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                >
                  Publicar Mídia com Preço em Diamantes (💎)
                </button>
              </form>

              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 text-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Configuração do Cofre VIP Independente</span>
                    <span className="text-[10px] font-mono text-amber-300">
                      Atual: {vaultConfig.priceDiamonds} 💎 ({vaultConfig.durationDays} dias)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O acesso ao Cofre VIP é exibido ao cliente exclusivamente em diamantes (padrão 149 💎 por 30 dias).
                    Na contabilidade interna, diamantes pagos geram base elegível (1 💎 pago = R$ 0,10) com partição 70% Criador / 20% JOBS / 10% Reserva Operacional.
                  </p>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Novo Preço do Passe Cofre VIP (💎)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={vaultPriceDiamondsInput}
                        onChange={(e) => setVaultPriceDiamondsInput(e.target.value)}
                        className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateVaultPrice}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        Salvar Preço (💎)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-300 font-bold">
                    Reconciliação Contábil 70/20/10 ({platformReconciliation.isStrictlyReconciled ? '100% Conciliado' : 'Divergente'})
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Diamantes Consumidos (Pagos / Bônus):</span>
                    <span className="text-white">
                      {platformReconciliation.totalPaidDiamondsConsumed} 💎 pagos / {platformReconciliation.totalBonusDiamondsConsumed} 💎 bônus
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Base Fiduciária Líquida Elegível:</span>
                    <span className="text-white">R$ {platformReconciliation.netRecognizedRevenueBrl.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>70% Líquido Criadores:</span>
                    <span>R$ {platformReconciliation.netCreatorObligationsBrl.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>20% Receita JOBS + 10% Reserva:</span>
                    <span>
                      R$ {platformReconciliation.netPlatformShare20Brl.toFixed(2)} + R$ {platformReconciliation.netOperationalReserve10Brl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Mídias Publicadas do Criador */}
            <div className="pt-2 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mídias do Perfil ({creatorMediaItems.length})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {creatorMediaItems.map((item) => {
                  const split = calculateSplit70_20_10Cents(item.priceCents);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{item.caption}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.mediaType.toUpperCase()} ·{' '}
                          {item.modality === 'VIP_VAULT'
                            ? `Incluso no Cofre VIP (${vaultConfig.priceDiamonds} 💎)`
                            : `Avulso ${item.priceDiamonds} 💎 (70% pago: R$ ${split.creatorShareBrl.toFixed(2)})`}{' '}
                          · Estado: {item.state}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono shrink-0">
                        {item.unlockCount} desbloqueios
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: CALENDÁRIO EDITORIAL */}
      {activeTab === 'editorial' && (
        <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Fila de Publicações & Calendário de Lançamentos</span>
              </h4>
              <p className="text-xs text-slate-400">Controle editorial de mídias programadas e rascunhos para publicação nos feeds VIP</p>
            </div>

            <button
              onClick={() => showToast('Janela de agendamento de mídia aberta para os criadores.')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Agendar Nova Mídia</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {scheduledPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 shrink-0">
                    {post.type === 'video' ? <Video className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{post.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                        {post.exclusivity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Por: <strong className="text-slate-300">{post.creator}</strong> · Preço: {post.price} 💎 · Amostra: {post.previewType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Horário Previsto</span>
                    <span className="font-mono text-white text-xs">{post.scheduledFor}</span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                      post.status === 'scheduled'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {post.status === 'scheduled' ? 'Agendado' : 'Rascunho'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: REGRAS DE PRECIFICAÇÃO E PAYWALL */}
      {activeTab === 'pricing' && (
        <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Matriz de Precificação Dinâmica & Regras de Paywall</span>
            </h4>
            <p className="text-xs text-slate-400">
              Pisos e tetos operacionais em créditos virtuais para garantir coerência de mercado e proteger o valor percebido das mídias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pricingRules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{rule.label}</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                    Sugerido: {rule.suggestedCredits} 💎
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Piso Mínimo:</span>
                    <strong className="text-white font-mono">{rule.minCredits} 💎</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Teto Operacional:</span>
                    <strong className="text-white font-mono">{rule.maxCredits} 💎</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                  <span>Prévia Grátis: {rule.previewTimeSec > 0 ? `${rule.previewTimeSec}s de teaser` : 'Blur estático'}</span>
                  <span className={rule.autoWatermark ? 'text-emerald-400' : 'text-slate-500'}>
                    {rule.autoWatermark ? "✓ Marca d'água ativa" : '— Sem marca'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 4: TRUST & SAFETY E PROTEÇÃO DE DIREITOS */}
      {activeTab === 'trust_safety' && (
        <div className="p-5 rounded-3xl bg-[#0f0f18] border border-slate-800 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Proteção de Direitos, Segurança e Integridade Antifraude</span>
            </h4>
            <p className="text-xs text-slate-400">
              Protocolos de segurança técnica para proteção contra vazamentos e verificação de consentimento estrito.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Marca d'Água Estenográfica</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Cada mídia desbloqueada recebe uma marca d'água invisível contendo o ID criptografado do comprador, permitindo rastrear a autoria em caso de vazamento.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">Status: 100% Ativo em Sandbox</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Bloqueio de Screenshot</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Sinalizadores DRM e CSS Shield protegem o canvas contra gravação de tela indevida em navegadores e dispositivos compatíveis.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">Status: Ativo no Player de Mídia</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Consentimento 18+ Compulsório</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Todo criador possui contrato de cessão não exclusiva e verificação biométrica de idade validada antes do primeiro envio.
              </p>
              <span className="text-[10px] text-emerald-400 font-mono block">Status: Homologação KYC Ativa</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

