import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { UserProfileData, UserPrivacySettings } from '../../types';

interface Screen17PrivacySecurityProps {
  userProfile: UserProfileData;
  onDeleteAccount: () => void;
}

export const Screen17PrivacySecurity: React.FC<Screen17PrivacySecurityProps> = ({
  userProfile,
  onDeleteAccount,
}) => {
  const [privacy, setPrivacy] = useState<UserPrivacySettings>({
    hideAge: false,
    hideCity: false,
    invisibleMode: false,
    allowAiAnalysis: true,
    essentialCookiesOnly: false,
    dataSharingThirdParty: false,
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportData = () => {
    const dataToExport = {
      user: userProfile,
      privacySettings: privacy,
      exportedAt: new Date().toISOString(),
      platform: 'JOBS Global Dating 1.0',
      compliance: 'LGPD Artigo 18 - Direito à Portabilidade e Acesso aos Dados',
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dados_jobs_${userProfile.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl font-display font-extrabold text-white">
            Privacidade & Segurança
          </h1>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          LGPD / GDPR
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Você tem controle total sobre quais dados aparecem no JOBS, como sua conta é visualizada e como suas informações são tratadas.
      </p>

      {/* Visibilidade Pública */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Eye className="w-4 h-4 text-rose-400" />
          <span>Visibilidade Pública do Perfil</span>
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div>
              <div className="font-semibold text-white">Ocultar Idade Publicamente</div>
              <div className="text-[11px] text-slate-400">Sua idade não aparecerá nos cartões da descoberta</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.hideAge}
              onChange={(e) => setPrivacy({ ...privacy, hideAge: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div>
              <div className="font-semibold text-white">Ocultar Região / Cidade</div>
              <div className="text-[11px] text-slate-400">Oculta o bairro aproximado nos cartões públicos</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.hideCity}
              onChange={(e) => setPrivacy({ ...privacy, hideCity: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div>
              <div className="font-semibold text-white">Modo Invisível Temporário</div>
              <div className="text-[11px] text-slate-400">Seu perfil não aparece para novos usuários na descoberta</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.invisibleMode}
              onChange={(e) => setPrivacy({ ...privacy, invisibleMode: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Consentimento e Inteligência Artificial */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Consentimentos & Tratamento por IA</span>
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141422] border border-white/5 cursor-pointer">
            <div>
              <div className="font-semibold text-white">Recomendações Personalizadas por IA</div>
              <div className="text-[11px] text-slate-400">Permite cruzar seus interesses para calcular scores explicáveis de afinidade</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.allowAiAnalysis}
              onChange={(e) => setPrivacy({ ...privacy, allowAiAnalysis: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
          </label>

          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>O JOBS nunca vende ou compartilha seus dados pessoais com terceiros para fins publicitários.</span>
          </div>
        </div>
      </div>

      {/* Direitos do Titular (LGPD) */}
      <div className="p-5 rounded-3xl bg-[#0f0f18] border border-white/5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Direitos do Titular (Artigo 18 LGPD)</span>
        </h2>

        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full p-3.5 rounded-2xl bg-[#141422] hover:bg-[#1a1a2c] border border-white/5 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-white text-xs">Baixar Cópia dos Meus Dados (JSON)</div>
                <div className="text-[11px] text-slate-400">Download estruturado de todas as suas informações</div>
              </div>
            </div>
            {downloadSuccess && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Baixado!
              </span>
            )}
          </button>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <div>
                <div className="font-semibold text-rose-300 text-xs">Excluir Conta e Todos os Dados</div>
                <div className="text-[11px] text-rose-400/80">Direito ao esquecimento definitivo</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#12121e] border border-rose-600/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-display font-bold text-lg text-white">
              Excluir conta definitivamente?
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação é <strong>irreversível</strong>. Todas as suas fotos, conversas, matches e informações de perfil serão permanentemente apagados dos nossos servidores.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteAccount();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-lg shadow-rose-950"
              >
                Sim, Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
