import React, { useState, useMemo } from 'react';
import {
  X,
  Camera,
  Video,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  FolderOpen,
  ShieldCheck,
  Crown,
  Eye,
  PlusCircle,
} from 'lucide-react';
import {
  exclusiveContentAndInterestService,
  ExclusiveMediaType,
  ExclusiveMonetizationModality,
  ExclusiveContentClassification,
  formatDiamondsDisplay,
} from '../services/exclusiveContentAndInterestService';

export type CreatorStudioTab =
  | 'publish_photo'
  | 'publish_video'
  | 'my_content'
  | 'vip_vault';

export type MyContentSubFilter = 'ALL' | 'FREE' | 'INDIVIDUAL_UNLOCK' | 'VIP_VAULT';

interface CreatorContentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  initialTab?: CreatorStudioTab;
  onPublished?: () => void;
}

const SAMPLE_PREVIEWS = [
  {
    label: 'Editorial Golden Hour',
    url: '/src/assets/images/profile_valentina_1791856836634.jpg',
  },
  {
    label: 'Glamour VIP Noite',
    url: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
  },
  {
    label: 'Ensaio Solar Ipanema',
    url: '/src/assets/images/profile_isabella_1791856837043.jpg',
  },
];

export const CreatorContentStudioModal: React.FC<CreatorContentStudioModalProps> = ({
  isOpen,
  onClose,
  creatorId: propCreatorId,
  creatorName: propCreatorName,
  initialTab = 'publish_photo',
  onPublished,
}) => {
  const [activeTab, setActiveTab] = useState<CreatorStudioTab>(initialTab);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(propCreatorId || 'valentina');
  const [contentFilter, setContentFilter] = useState<MyContentSubFilter>('ALL');
  const [refreshTick, setRefreshTick] = useState(0);

  // Publish form states
  const [caption, setCaption] = useState('');
  const [modality, setModality] = useState<ExclusiveMonetizationModality>('INDIVIDUAL_UNLOCK');
  const [classification, setClassification] =
    useState<ExclusiveContentClassification>('fashion_lingerie');
  const [previewUrl, setPreviewUrl] = useState<string>(SAMPLE_PREVIEWS[0].url);
  const [selectedFileName, setSelectedFileName] = useState<string>('editorial_golden_hour_4k.jpg');
  const [ageVerified18Plus, setAgeVerified18Plus] = useState(true);
  const [consentDeclared, setConsentDeclared] = useState(true);

  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  const resolvedCreatorName = useMemo(() => {
    if (selectedCreatorId === propCreatorId) return propCreatorName || 'Meu Perfil JOBS';
    if (selectedCreatorId === 'valentina') return 'Valentina Rossi';
    if (selectedCreatorId === 'isabella') return 'Isabella Fontes';
    return propCreatorName || selectedCreatorId;
  }, [selectedCreatorId, propCreatorId, propCreatorName]);

  const catalog = useMemo(
    () => exclusiveContentAndInterestService.getDiamondServiceCatalog(),
    [refreshTick]
  );

  const creatorMedia = useMemo(
    () => exclusiveContentAndInterestService.listCreatorOwnMedia(selectedCreatorId),
    [selectedCreatorId, refreshTick]
  );

  const filteredCreatorMedia = useMemo(() => {
    if (contentFilter === 'ALL') return creatorMedia;
    return creatorMedia.filter((item) => item.modality === contentFilter);
  }, [creatorMedia, contentFilter]);

  const vaultConfig = useMemo(
    () => exclusiveContentAndInterestService.getVipVaultConfig(selectedCreatorId),
    [selectedCreatorId, refreshTick]
  );

  const creatorSummary = useMemo(
    () => exclusiveContentAndInterestService.getCreatorDashboardSummary(selectedCreatorId, 'sandbox'),
    [selectedCreatorId, refreshTick]
  );

  const [vaultTitle, setVaultTitle] = useState(vaultConfig.title);
  const [vaultDescription, setVaultDescription] = useState(vaultConfig.description);
  const [vaultActive, setVaultActive] = useState(vaultConfig.isActive);
  const [vaultSaveFeedback, setVaultSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeMediaType: ExclusiveMediaType =
    activeTab === 'publish_video' ? 'video' : 'photo';

  const officialFixedPriceDiamonds =
    modality === 'FREE'
      ? 0
      : modality === 'VIP_VAULT'
      ? 0
      : activeMediaType === 'video'
      ? catalog.individualVideoUnlockDiamonds
      : catalog.individualPhotoUnlockDiamonds;

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setPublishStatus('idle');
    setPublishFeedback(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setPreviewUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishStatus('loading');
    setPublishFeedback(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (!previewUrl || !previewUrl.trim()) {
        throw new Error('Selecione uma mídia válida para visualizar a prévia antes de publicar.');
      }

      const ext = activeMediaType === 'video' ? 'mp4' : 'jpg';
      const privateMasterKey = `private://vault/${selectedCreatorId}/${activeMediaType}_${Date.now()}_${selectedFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;

      const created = exclusiveContentAndInterestService.publishOrCreateMedia({
        creatorId: selectedCreatorId,
        creatorName: resolvedCreatorName,
        mediaType: activeMediaType,
        modality,
        caption: caption.trim(),
        priceDiamonds: modality === 'INDIVIDUAL_UNLOCK' ? officialFixedPriceDiamonds : 0,
        classification,
        ageVerified18Plus,
        consentDeclared,
        ownershipDeclared: true,
        safePreviewUrl: previewUrl,
        privateMasterUrl: privateMasterKey,
        initialState: 'published',
        autoApproveModeration: true,
      });

      // Verifica se o registro foi efetivamente persistido antes de declarar sucesso
      const verifiedSaved = exclusiveContentAndInterestService.getMediaByIdInternal(created.id);
      if (!verifiedSaved) {
        throw new Error(
          'Falha de persistência: o arquivo não pôde ser confirmado no armazenamento local seguro.'
        );
      }

      setPublishStatus('success');
      setPublishFeedback(
        modality === 'FREE'
          ? `Publicação gratuita ("${verifiedSaved.caption}") salva e liberada com sucesso no perfil (0 💎).`
          : modality === 'INDIVIDUAL_UNLOCK'
          ? `${
              activeMediaType === 'video' ? 'Vídeo exclusivo' : 'Foto exclusiva'
            } ("${verifiedSaved.caption}") publicado com desbloqueio individual por ${formatDiamondsDisplay(
              verifiedSaved.priceDiamonds
            )}!`
          : `Mídia ("${verifiedSaved.caption}") adicionada ao Cofre VIP (inclusa no passe de ${formatDiamondsDisplay(
              catalog.vipVaultAccessDiamonds
            )} / ${catalog.vipVaultDurationDays} dias)!`
      );
      setCaption('');
      setRefreshTick((t) => t + 1);
      if (onPublished) onPublished();
    } catch (err: any) {
      setPublishStatus('error');
      setPublishFeedback(
        err?.message || 'Não foi possível concluir a publicação. Verifique os campos e tente novamente.'
      );
    }
  };

  const handleSaveVaultSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setVaultSaveFeedback(null);
    try {
      const updated = exclusiveContentAndInterestService.updateVipVaultConfig({
        creatorId: selectedCreatorId,
        creatorName: resolvedCreatorName,
        title: vaultTitle.trim() || `Cofre VIP de ${resolvedCreatorName}`,
        description: vaultDescription.trim(),
        priceDiamonds: catalog.vipVaultAccessDiamonds,
        durationDays: catalog.vipVaultDurationDays,
        isActive: vaultActive,
        ageVerified18Plus: true,
        consentDeclared: true,
      });
      setRefreshTick((t) => t + 1);
      if (onPublished) onPublished();
      setVaultSaveFeedback({
        type: 'success',
        text: `Cofre VIP atualizado (${formatDiamondsDisplay(updated.priceDiamonds)} por ${
          updated.durationDays
        } dias · Status: ${updated.isActive ? 'Ativo' : 'Pausado'}).`,
      });
    } catch (err: any) {
      setVaultSaveFeedback({
        type: 'error',
        text: err?.message || 'Erro ao salvar configurações do Cofre VIP.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl bg-[#0d0d16] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171226] via-[#121220] to-[#19131d] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-white flex items-center gap-2">
                <span>Estúdio de Publicação & Cofre VIP</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  70% Criador / 30% JOBS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Publique fotos e vídeos gratuitos, exclusivos avulsos ({formatDiamondsDisplay(catalog.individualPhotoUnlockDiamonds)} /{' '}
                {formatDiamondsDisplay(catalog.individualVideoUnlockDiamonds)}) ou no Cofre VIP ({formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCreatorId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedCreatorId(nextId);
                const nextVault = exclusiveContentAndInterestService.getVipVaultConfig(nextId);
                setVaultTitle(nextVault.title);
                setVaultDescription(nextVault.description);
                setVaultActive(nextVault.isActive);
                setPublishStatus('idle');
                setPublishFeedback(null);
              }}
              className="bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              title="Selecionar perfil de publicação"
            >
              <option value={propCreatorId}>Meu Perfil ({propCreatorName})</option>
              {propCreatorId !== 'valentina' && (
                <option value="valentina">Perfil Criadora: Valentina Rossi</option>
              )}
              {propCreatorId !== 'isabella' && (
                <option value="isabella">Perfil Criadora: Isabella Fontes</option>
              )}
            </select>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-[#10101c] border-b border-white/10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('publish_photo');
              setPublishStatus('idle');
              setPublishFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'publish_photo'
                ? 'border-rose-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-rose-400" />
            <span>Publicar foto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('publish_video');
              setPublishStatus('idle');
              setPublishFeedback(null);
            }}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'publish_video'
                ? 'border-rose-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>Publicar vídeo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_content')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_content'
                ? 'border-rose-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meu conteúdo ({creatorMedia.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vip_vault')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'vip_vault'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Cofre VIP</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* =============================================================== */}
          {/* ABA 1 & 2: PUBLICAR FOTO OU VÍDEO                               */}
          {/* =============================================================== */}
          {(activeTab === 'publish_photo' || activeTab === 'publish_video') && (
            <form onSubmit={handlePublishSubmit} className="space-y-5">
              {/* Status Banners: Carregando, Concluído, Erro */}
              {publishStatus === 'loading' && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  <span>Validando conformidade +18 e salvando mídia de forma segura...</span>
                </div>
              )}

              {publishStatus === 'success' && publishFeedback && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">Publicação concluída e confirmada!</div>
                      <div>{publishFeedback}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('my_content')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    Ver em Meu Conteúdo
                  </button>
                </div>
              )}

              {publishStatus === 'error' && publishFeedback && (
                <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300">Falha na publicação</div>
                    <div>{publishFeedback}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Coluna Esquerda: Seleção de Mídia e Prévia */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Selecionar {activeMediaType === 'video' ? 'Vídeo' : 'Foto'} & Prévia Segura
                  </label>

                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                    <img
                      src={previewUrl}
                      alt="Prévia da publicação"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-[10px] font-bold uppercase flex items-center gap-1">
                        {activeMediaType === 'video' ? (
                          <Video className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Camera className="w-3 h-3 text-rose-400" />
                        )}
                        Prévia ({activeMediaType === 'video' ? 'Vídeo' : 'Foto'})
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/80 text-amber-300 font-mono text-xs font-extrabold border border-amber-500/30">
                        {modality === 'FREE'
                          ? 'Gratuito (0 💎)'
                          : modality === 'VIP_VAULT'
                          ? `Cofre VIP (${formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)})`
                          : formatDiamondsDisplay(officialFixedPriceDiamonds)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-rose-400" />
                      <span>Selecionar arquivo do dispositivo</span>
                      <input
                        type="file"
                        accept={activeMediaType === 'video' ? 'video/*,image/*' : 'image/*'}
                        onChange={handleLocalFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                      {selectedFileName}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 block">
                      Ou escolha uma capa de demonstração verificada:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {SAMPLE_PREVIEWS.map((sample) => (
                        <button
                          key={sample.url}
                          type="button"
                          onClick={() => {
                            setPreviewUrl(sample.url);
                            setSelectedFileName(
                              `${sample.label.toLowerCase().replace(/\s+/g, '_')}.${
                                activeMediaType === 'video' ? 'mp4' : 'jpg'
                              }`
                            );
                          }}
                          className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                            previewUrl === sample.url
                              ? 'border-rose-500 bg-rose-500/10'
                              : 'border-white/10 bg-black/40 hover:border-white/25'
                          }`}
                        >
                          <img
                            src={sample.url}
                            alt={sample.label}
                            className="w-full h-12 object-cover rounded-lg mb-1"
                          />
                          <span className="block text-[10px] text-slate-300 truncate">
                            {sample.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Modalidade, Descrição e Conformidade */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      2. Modalidade de Acesso & Preço Oficial
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setModality('FREE')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          modality === 'FREE'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white'
                            : 'bg-[#141422] border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold">Conteúdo gratuito</div>
                            <div className="text-[11px] text-slate-400">
                              Acesso livre para visitantes autenticados (+18) sem cobrança
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-emerald-300">0 💎</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModality('INDIVIDUAL_UNLOCK')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          modality === 'INDIVIDUAL_UNLOCK'
                            ? 'bg-rose-950/40 border-rose-500 text-white'
                            : 'bg-[#141422] border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold">
                              Conteúdo exclusivo / pago (Desbloqueio individual)
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Preço oficial fixo do catálogo · Repasse de 70% ao criador
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-rose-300">
                          {formatDiamondsDisplay(
                            activeMediaType === 'video'
                              ? catalog.individualVideoUnlockDiamonds
                              : catalog.individualPhotoUnlockDiamonds
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModality('VIP_VAULT')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          modality === 'VIP_VAULT'
                            ? 'bg-amber-950/40 border-amber-500 text-white'
                            : 'bg-[#141422] border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold">Cofre VIP</div>
                            <div className="text-[11px] text-slate-400">
                              Incluso no Passe de {catalog.vipVaultDurationDays} dias (independente de itens avulsos)
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-amber-300">
                          Passe {formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      3. Descrição / Legenda da Publicação
                    </label>
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={`Descreva sua ${
                        activeMediaType === 'video' ? 'produção em vídeo' : 'fotografia'
                      } para seu perfil...`}
                      className="w-full rounded-2xl bg-[#141422] border border-white/10 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Classificação de Conteúdo
                      </label>
                      <select
                        value={classification}
                        onChange={(e) =>
                          setClassification(e.target.value as ExclusiveContentClassification)
                        }
                        className="w-full rounded-xl bg-[#141422] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="fashion_lingerie">Moda / Lingerie / Lifestyle</option>
                        <option value="sensual">Ensaio Sensual Artístico</option>
                        <option value="consensual_nudity_18plus">Conteúdo Íntimo Consentido (+18)</option>
                      </select>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 flex flex-col justify-center">
                      <span className="text-white font-semibold">Proteção de Mídia Ativa</span>
                      <span>Entrega via URL temporária assinada (TTL 15 min)</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ageVerified18Plus}
                        onChange={(e) => setAgeVerified18Plus(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span>Confirmo maioridade verificada (+18) para todas as pessoas na mídia.</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentDeclared}
                        onChange={(e) => setConsentDeclared(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span>Declaro titularidade e consentimento explícito para exibição no JOBS.</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={publishStatus === 'loading'}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-display font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      Confirmar e Publicar {activeMediaType === 'video' ? 'Vídeo' : 'Foto'} (
                      {modality === 'FREE'
                        ? 'Gratuito · 0 💎'
                        : modality === 'VIP_VAULT'
                        ? 'Cofre VIP'
                        : formatDiamondsDisplay(officialFixedPriceDiamonds)}
                      )
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* ABA 3: MEU CONTEÚDO (FILTROS GRATUITO, EXCLUSIVO, COFRE VIP)    */}
          {/* =============================================================== */}
          {activeTab === 'my_content' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setContentFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      contentFilter === 'ALL'
                        ? 'bg-white text-slate-950'
                        : 'bg-[#141422] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    Todos ({creatorMedia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('FREE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      contentFilter === 'FREE'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-[#141422] text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    Conteúdo gratuito (
                    {creatorMedia.filter((m) => m.modality === 'FREE').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('INDIVIDUAL_UNLOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      contentFilter === 'INDIVIDUAL_UNLOCK'
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#141422] text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    Conteúdo exclusivo / pago (
                    {creatorMedia.filter((m) => m.modality === 'INDIVIDUAL_UNLOCK').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('VIP_VAULT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      contentFilter === 'VIP_VAULT'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-[#141422] text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    Cofre VIP (
                    {creatorMedia.filter((m) => m.modality === 'VIP_VAULT').length})
                  </button>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Diamantes Recebidos: <strong className="text-amber-300">{formatDiamondsDisplay(creatorSummary.totalDiamondsReceived)}</strong>
                </div>
              </div>

              {filteredCreatorMedia.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#141422] border border-white/10 text-center space-y-2">
                  <p className="text-sm font-bold text-white">Nenhuma publicação encontrada nesta modalidade</p>
                  <p className="text-xs text-slate-400">
                    Utilize as abas "Publicar foto" ou "Publicar vídeo" acima para adicionar conteúdos ao seu perfil.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredCreatorMedia.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden bg-[#141422] border border-white/10 flex flex-col justify-between"
                    >
                      <div className="relative aspect-[16/10] bg-slate-900">
                        <img
                          src={item.safePreviewUrl}
                          alt={item.caption}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold uppercase flex items-center gap-1">
                            {item.mediaType === 'video' ? (
                              <Video className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Camera className="w-3 h-3 text-rose-400" />
                            )}
                            {item.mediaType === 'video' ? 'Vídeo' : 'Foto'}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                              item.modality === 'FREE'
                                ? 'bg-emerald-600/90 text-white'
                                : item.modality === 'VIP_VAULT'
                                ? 'bg-amber-500/90 text-slate-950'
                                : 'bg-rose-600/90 text-white'
                            }`}
                          >
                            {item.modality === 'FREE'
                              ? 'Gratuito (0 💎)'
                              : item.modality === 'VIP_VAULT'
                              ? `Cofre VIP (${formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)})`
                              : formatDiamondsDisplay(item.priceDiamonds)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <p className="text-xs font-semibold text-white line-clamp-2">{item.caption}</p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>
                            Estado:{' '}
                            <strong className="text-emerald-400 uppercase">{item.state}</strong>
                          </span>
                          <span>Acessos/Desbloqueios: {item.unlockCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* ABA 4: COFRE VIP (CONFIGURAÇÃO E CONTEÚDOS DO COFRE)            */}
          {/* =============================================================== */}
          {activeTab === 'vip_vault' && (
            <div className="space-y-5">
              {vaultSaveFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
                    vaultSaveFeedback.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {vaultSaveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{vaultSaveFeedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <form
                  onSubmit={handleSaveVaultSettings}
                  className="p-4 rounded-2xl bg-[#141422] border border-amber-500/30 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Configurar Cofre VIP</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                      {formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)} / {catalog.vipVaultDurationDays} dias
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Título do Cofre VIP
                    </label>
                    <input
                      type="text"
                      value={vaultTitle}
                      onChange={(e) => setVaultTitle(e.target.value)}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Descrição e Escopo para Visitantes
                    </label>
                    <textarea
                      rows={3}
                      value={vaultDescription}
                      onChange={(e) => setVaultDescription(e.target.value)}
                      className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-300 space-y-1">
                    <div className="font-bold text-amber-300">Regras Oficiais do Cofre VIP:</div>
                    <div>• Preço oficial do passe: {formatDiamondsDisplay(catalog.vipVaultAccessDiamonds)} por {catalog.vipVaultDurationDays} dias corridos.</div>
                    <div>• Sem cobrança recorrente automática ao expirar.</div>
                    <div>• Independente de fotos e vídeos publicados com desbloqueio individual ({formatDiamondsDisplay(catalog.individualPhotoUnlockDiamonds)} / {formatDiamondsDisplay(catalog.individualVideoUnlockDiamonds)}).</div>
                  </div>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10 cursor-pointer">
                    <span className="text-xs font-semibold text-white">
                      Cofre VIP ativo para novos desbloqueios
                    </span>
                    <input
                      type="checkbox"
                      checked={vaultActive}
                      onChange={(e) => setVaultActive(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 w-4 h-4"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                    >
                      Salvar Configurações do Cofre VIP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModality('VIP_VAULT');
                        setActiveTab('publish_photo');
                      }}
                      className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                    >
                      + Adicionar Mídia ao Cofre
                    </button>
                  </div>
                </form>

                {/* Resumo de Conteúdos no Cofre VIP */}
                <div className="p-4 rounded-2xl bg-[#141422] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Mídias Atuais no Cofre VIP (
                      {creatorMedia.filter((m) => m.modality === 'VIP_VAULT').length})
                    </h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {creatorMedia
                      .filter((m) => m.modality === 'VIP_VAULT')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3"
                        >
                          <img
                            src={item.safePreviewUrl}
                            alt={item.caption}
                            className="w-14 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.caption}
                            </div>
                            <div className="text-[10px] font-mono text-amber-300">
                              {item.mediaType === 'video' ? 'Vídeo Cofre VIP' : 'Foto Cofre VIP'} ·{' '}
                              {item.unlockCount} acessos
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
