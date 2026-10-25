import React, { useState } from 'react';
import {
  ShieldAlert,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  X,
  Lock,
  UserX,
  FileCheck2,
} from 'lucide-react';
import { ReportTicket, ReportCategory, Profile } from '../../types';

interface Screen18ReportsBlocksProps {
  blockedProfiles: Profile[];
  reports: ReportTicket[];
  onUnblockProfile: (profileId: string) => void;
  onSubmitReport: (newReport: Omit<ReportTicket, 'id' | 'createdAt' | 'status'>) => void;
  availableProfilesToReport: Profile[];
}

export const Screen18ReportsBlocks: React.FC<Screen18ReportsBlocksProps> = ({
  blockedProfiles,
  reports,
  onUnblockProfile,
  onSubmitReport,
  availableProfilesToReport,
}) => {
  const [activeTab, setActiveTab] = useState<'blocked' | 'reports'>('blocked');
  const [modalOpen, setModalOpen] = useState(false);
  const [targetProfileId, setTargetProfileId] = useState(availableProfilesToReport[0]?.id || '');
  const [category, setCategory] = useState<ReportCategory>('assedio');
  const [description, setDescription] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const categoryLabels: Record<ReportCategory, string> = {
    assedio: 'Assédio ou Linguagem Inapropriada',
    perfil_falso: 'Perfil Falso ou Golpe (Catfishing)',
    menor_de_idade: 'Suspeita de Menor de 18 Anos',
    spam_ou_fraude: 'Spam, Links Externos ou Fraude Financeira',
    conteudo_ofensivo: 'Fotos Ofensivas ou Sem Consentimento',
    outros: 'Outra Violação dos Termos',
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const target = availableProfilesToReport.find((p) => p.id === targetProfileId);
    if (!target) return;

    onSubmitReport({
      reportedProfileId: target.id,
      reportedProfileName: target.name,
      reportedProfileAvatar: target.avatar,
      category,
      categoryLabel: categoryLabels[category],
      description: description.trim(),
    });

    setModalOpen(false);
    setDescription('');
    setSuccessNotice(`Denúncia protocolada sob sigilo contra ${target.name}. A moderação do JOBS analisará em até 24h.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h1 className="text-2xl font-display font-extrabold text-white">
            Denúncias & Bloqueios
          </h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Denúncia</span>
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Gerencie contatos bloqueados e consulte o status das investigações conduzidas pela moderação do JOBS.
      </p>

      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#12121e] rounded-2xl border border-white/5">
        <button
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'blocked'
              ? 'bg-white/15 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ban className="w-3.5 h-3.5 text-rose-400" />
          <span>Contatos Bloqueados ({blockedProfiles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-white/15 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Histórico de Denúncias ({reports.length})</span>
        </button>
      </div>

      {/* TAB 1: BLOCKED CONTACTS */}
      {activeTab === 'blocked' && (
        <div className="space-y-3">
          {blockedProfiles.length === 0 ? (
            <div className="text-center py-12 bg-[#0f0f18] rounded-2xl border border-white/5 p-6 space-y-2">
              <UserX className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Nenhum contato bloqueado no momento.</p>
              <p className="text-xs text-slate-400">
                Você pode bloquear qualquer usuário diretamente pelo perfil ou pela conversa.
              </p>
            </div>
          ) : (
            blockedProfiles.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-[#11111c] border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-10 h-10 rounded-full object-cover grayscale opacity-60 border border-white/10"
                  />
                  <div>
                    <span className="font-bold text-xs text-white block">{p.name}</span>
                    <span className="text-[11px] text-slate-400">Bloqueado para interações</span>
                  </div>
                </div>

                <button
                  onClick={() => onUnblockProfile(p.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: REPORTS HISTORY */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-12 bg-[#0f0f18] rounded-2xl border border-white/5 p-6 space-y-2">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Nenhuma denúncia enviada.</p>
              <p className="text-xs text-slate-400">
                Se presenciar qualquer infração ou comportamento abusivo, informe nossa moderação.
              </p>
            </div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#11111c] border border-white/5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500 uppercase">
                    Protocolo #{r.id.slice(-6)}
                  </span>
                  <span
                    className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                      r.status === 'resolvida'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : r.status === 'em_analise'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {r.status === 'resolvida'
                      ? 'Resolvida / Ação Aplicada'
                      : r.status === 'em_analise'
                      ? 'Em Investigação Ativa'
                      : 'Pendente de Triagem'}
                  </span>
                </div>

                <div className="font-bold text-white text-sm">
                  Denúncia contra: {r.reportedProfileName}
                </div>
                <div className="text-rose-300 font-semibold text-xs">
                  Motivo: {r.categoryLabel}
                </div>
                <p className="text-slate-300 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
                  "{r.description || 'Detalhamento fornecido à equipe de segurança.'}"
                </p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Enviada em {r.createdAt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: New Report */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12121e] border border-rose-600/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="font-display font-bold text-base text-white">
                  Protocolar Denúncia Sigilosa
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Usuário a ser denunciado
                </label>
                <select
                  value={targetProfileId}
                  onChange={(e) => setTargetProfileId(e.target.value)}
                  className="w-full bg-[#181827] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  {availableProfilesToReport.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Categoria da Infração
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  className="w-full bg-[#181827] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição detalhada do ocorrido
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique o que aconteceu para auxiliar nossos moderadores..."
                  className="w-full bg-[#181827] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Garantia de Sigilo: A pessoa denunciada nunca saberá quem enviou esta denúncia.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white shadow-lg shadow-rose-950"
                >
                  Enviar Denúncia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
