import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Database,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  LogIn,
  FileCheck2,
  X,
} from 'lucide-react';
import {
  TalentParticipantRole,
  AuditedTalentAdminRecord,
  listAuditedTalentSnapshotsForAdmin,
  reconcilePendingLocalTalentAuditsOnAuth,
  syncAuditedTalentActivityToCloud,
} from '../../services/talentChallengesSimulationService';
import {
  auth,
  subscribeToAuthChanges,
  subscribeToAllTalentProgressForAdmin,
  signInWithGoogle,
} from '../../firebase';
import { adminAuditService } from '../../services/adminAuditService';
import type { User as FirebaseUser } from 'firebase/auth';

export interface TalentProgressAdminAuditPanelProps {
  onRefreshParent?: () => void;
}

export const TalentProgressAdminAuditPanel: React.FC<TalentProgressAdminAuditPanelProps> = ({
  onRefreshParent,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [cloudDocs, setCloudDocs] = useState<Array<Record<string, unknown>>>([]);
  const [cloudConnectionState, setCloudConnectionState] = useState<
    'connecting' | 'connected_admin' | 'local_fallback'
  >('connecting');
  const [cloudStatusDetail, setCloudStatusDetail] = useState<string>(
    'Verificando assinatura de leitura administrativa em /talent_progress...'
  );

  // Filtros e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | TalentParticipantRole>('all');
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'firestore_cloud' | 'local_audit_pending'
  >('all');
  const [completionFilter, setCompletionFilter] = useState<
    'all' | 'completed_all' | 'in_progress' | 'not_started'
  >('all');

  // Inspetor JSON e Feedback
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
      setRefreshTick((t) => t + 1);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setCloudConnectionState('connecting');
    const unsubCloud = subscribeToAllTalentProgressForAdmin(
      (docs) => {
        setCloudDocs(docs);
        setCloudConnectionState('connected_admin');
        setCloudStatusDetail(
          `Assinatura Firestore ativa (/talent_progress) · ${docs.length} documento(s) remoto(s) lido(s)`
        );
      },
      (err) => {
        setCloudConnectionState('local_fallback');
        const rawErr = err instanceof Error ? err.message : String(err);
        if (rawErr.includes('Missing or insufficient permissions')) {
          setCloudStatusDetail(
            'Leitura remota restrita a isAdmin() autenticado · Exibindo snapshots auditados localmente na sessão'
          );
        } else {
          setCloudStatusDetail(
            'Modo de inspeção local ativo · Exibindo snapshots auditados da sessão de produção'
          );
        }
      }
    );
    return () => unsubCloud();
  }, [firebaseUser?.uid, refreshTick]);

  const allUnfilteredRecords = useMemo(
    () =>
      listAuditedTalentSnapshotsForAdmin({
        cloudRecords: cloudDocs,
        includeCurrentSessionAudit: true,
      }),
    [cloudDocs, refreshTick, firebaseUser?.uid]
  );

  const filteredRecords = useMemo(
    () =>
      listAuditedTalentSnapshotsForAdmin({
        cloudRecords: cloudDocs,
        includeCurrentSessionAudit: true,
        searchQuery,
        roleFilter,
        sourceFilter,
        completionFilter,
      }),
    [cloudDocs, searchQuery, roleFilter, sourceFilter, completionFilter, refreshTick, firebaseUser?.uid]
  );

  const selectedRecord: AuditedTalentAdminRecord | null = useMemo(() => {
    if (!selectedRecordKey) return filteredRecords[0] || null;
    return (
      filteredRecords.find((r) => r.recordKey === selectedRecordKey) ||
      allUnfilteredRecords.find((r) => r.recordKey === selectedRecordKey) ||
      filteredRecords[0] ||
      null
    );
  }, [selectedRecordKey, filteredRecords, allUnfilteredRecords]);

  const kpiStats = useMemo(() => {
    const total = allUnfilteredRecords.length;
    const cloudCount = allUnfilteredRecords.filter((r) => r.source === 'firestore_cloud').length;
    const localCount = allUnfilteredRecords.filter(
      (r) => r.source === 'local_audit_pending'
    ).length;
    const completedAllCount = allUnfilteredRecords.filter(
      (r) => r.desafiosConcluidosCount >= 5
    ).length;
    const avgPoints =
      total > 0
        ? Math.round(
            allUnfilteredRecords.reduce((acc, r) => acc + r.pontosConquistados, 0) / total
          )
        : 0;
    const allSchemasValid = allUnfilteredRecords.every((r) => r.schemaValidation.valid);

    return {
      total,
      cloudCount,
      localCount,
      completedAllCount,
      avgPoints,
      allSchemasValid,
    };
  }, [allUnfilteredRecords]);

  const handleManualReconcileAndAudit = async () => {
    if (isReconciling) return;
    setIsReconciling(true);
    try {
      if (firebaseUser) {
        const rec = await reconcilePendingLocalTalentAuditsOnAuth(firebaseUser.uid, {
          mode: 'production',
        });
        await adminAuditService.logActivity({
          actorId: firebaseUser.uid,
          actorRole: 'admin',
          action: 'AUDIT_VERIFY',
          targetType: 'user',
          targetId: firebaseUser.uid,
          result: 'success',
          reason:
            'Reconciliação e auditoria manual de snapshots /talent_progress executada pelo painel administrativo',
          metadata: {
            reconciledCount: rec.reconciledCount,
            rolesReconciled: rec.rolesReconciled,
          },
        });
        setFeedbackBanner({
          type: 'success',
          text: rec.message,
        });
      } else {
        const prodRes = await syncAuditedTalentActivityToCloud({
          userId: 'current_user',
          role: 'produtor_conteudo',
          mode: 'production',
        });
        await syncAuditedTalentActivityToCloud({
          userId: 'current_user',
          role: 'colaborador',
          mode: 'production',
        });
        setFeedbackBanner({
          type: 'info',
          text: `${prodRes.message} Faça login com uma conta administrativa verificada para persistir e listar todos os documentos remotos.`,
        });
      }
      setRefreshTick((t) => t + 1);
      if (onRefreshParent) onRefreshParent();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setFeedbackBanner({
        type: 'warning',
        text: `Auditoria local atualizada; aviso na sincronização remota: ${msg.slice(0, 100)}`,
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      setFirebaseUser(user);
      const rec = await reconcilePendingLocalTalentAuditsOnAuth(user.uid, {
        mode: 'production',
      });
      setRefreshTick((t) => t + 1);
      setFeedbackBanner({
        type: 'success',
        text: `Autenticado como ${user.email || user.uid}. ${rec.message}`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setFeedbackBanner({
        type: 'warning',
        text: `Login Google não concluído (${msg.slice(0, 80)}). Mantendo leitura de snapshots locais auditados.`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCopyJson = async () => {
    if (!selectedRecord) return;
    const jsonString = JSON.stringify(selectedRecord.canonicalPayload, null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonString);
      }
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setCopiedJson(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'UserId',
      'CollectionPath',
      'Role',
      'EnvironmentMode',
      'Source',
      'CloudPersisted',
      'DesafiosConcluidos',
      'PontosConquistados',
      'LevelNumber',
      'ApprovedMedia',
      'CollabActions',
      'MutualInteractions',
      'ValidLives',
      'WeeklyActiveDays',
      'EngagementEvents',
      'SchemaValid',
      'UpdatedAtIso',
    ];
    const rows = filteredRecords.map((r) => [
      r.userId,
      r.collectionPath,
      r.role,
      r.environmentMode,
      r.source,
      String(r.cloudPersisted),
      String(r.desafiosConcluidosCount),
      String(r.pontosConquistados),
      String(r.levelNumber),
      String(r.approvedPublishedMediaCount),
      String(r.collaboratorVerifiedActionsCount),
      String(r.eligibleMutualAndChatInteractionsCount),
      String(r.validLiveSessionsCount),
      String(r.weeklyActiveDaysCount),
      String(r.eligibleEngagementEventsCount),
      String(r.schemaValidation.valid),
      r.updatedAtIso,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs_auditoria_talent_progress_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho e Ações de Auditoria */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">Coleção Protegida: /talent_progress/&#123;userId&#125;</span>
            <span aria-hidden="true">·</span>
            <span>Isolamento Contábil: 0 lançamentos em /ledger_entries</span>
            <span aria-hidden="true">·</span>
            <span>Regra: isOwner(userId) || isAdmin()</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Auditoria Administrativa de Progresso de Talentos e Campanhas Sazonais
          </h3>
          <p className="text-xs text-slate-400">
            Inspeção de snapshots auditados em Modo Produção, reconciliação automática pós-login e verificação estrita do schema <code className="text-slate-200 font-mono">isValidTalentProgressSnapshot</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!firebaseUser && (
            <button
              type="button"
              onClick={handleAdminGoogleSignIn}
              disabled={isSigningIn}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isSigningIn ? 'Autenticando...' : 'Entrar com Google (Admin)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleManualReconcileAndAudit}
            disabled={isReconciling}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>
              {isReconciling ? 'Reconciliando...' : 'Reconciliar & Atualizar Snapshots'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Status da Conexão Firestore & Sessão */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          {cloudConnectionState === 'connected_admin' ? (
            <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{cloudStatusDetail}</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
          {firebaseUser
            ? `Sessão Auth: ${firebaseUser.email || firebaseUser.uid}`
            : 'Sessão Auth: Visitante (synced_local_audit ativo)'}
        </div>
      </div>

      {/* Feedback de Reconciliação */}
      {feedbackBanner && (
        <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Strip (Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Snapshots Auditados (Produção)</span>
          <p className="text-2xl font-black text-white font-mono tabular-nums">
            {filteredRecords.length}{' '}
            <span className="text-xs font-normal text-slate-400">
              de {kpiStats.total} registros
            </span>
          </p>
          <p className="text-[11px] text-slate-400 tabular-nums">
            Nuvem: {kpiStats.cloudCount} · Fila Local: {kpiStats.localCount}
          </p>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Ciclos Sazonais Completos (5/5)</span>
          <p className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
            {kpiStats.completedAllCount}
          </p>
          <p className="text-[11px] text-slate-400">
            Participantes com todas as 5 metas cumpridas
          </p>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Média de Pontos Gamificados</span>
          <p className="text-2xl font-black text-amber-400 font-mono tabular-nums">
            {kpiStats.avgPoints.toLocaleString('pt-BR')} pts
          </p>
          <p className="text-[11px] text-slate-400">
            Pontuação não monetária (sem impacto em R$)
          </p>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-xs text-slate-400">Conformidade Firestore Rules</span>
          <p className="text-lg font-black text-sky-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{kpiStats.allSchemasValid ? '100% Válido (12 Campos)' : 'Requer Revisão'}</span>
          </p>
          <p className="text-[11px] text-slate-400">
            environmentMode == &apos;production&apos; verificado
          </p>
        </div>
      </div>

      {/* Barra de Busca e Filtros Combinados */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar userId, papel ou caminho..."
            aria-label="Buscar snapshots de progresso de talentos"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | TalentParticipantRole)}
            aria-label="Filtrar por perspectiva de atuação"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="all">Todas as Perspectivas (Produtor + Colaborador)</option>
            <option value="produtor_conteudo">Produtor de Conteúdo</option>
            <option value="colaborador">Colaborador &amp; Indicador</option>
          </select>
        </div>

        <div>
          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(
                e.target.value as 'all' | 'firestore_cloud' | 'local_audit_pending'
              )
            }
            aria-label="Filtrar por origem do snapshot"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="all">Todas as Origens (Firestore + Auditoria Local)</option>
            <option value="firestore_cloud">Sincronizado no Firestore (synced_cloud)</option>
            <option value="local_audit_pending">
              Auditoria Local Pendente Login (synced_local_audit)
            </option>
          </select>
        </div>

        <div>
          <select
            value={completionFilter}
            onChange={(e) =>
              setCompletionFilter(
                e.target.value as 'all' | 'completed_all' | 'in_progress' | 'not_started'
              )
            }
            aria-label="Filtrar por conclusão de metas"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="all">Todas as Faixas de Conclusão (0 a 5 metas)</option>
            <option value="completed_all">Ciclo Completo (5 de 5 metas)</option>
            <option value="in_progress">Em Andamento (1 a 4 metas)</option>
            <option value="not_started">Iniciante (0 de 5 metas)</option>
          </select>
        </div>
      </div>

      {/* Layout Principal: Tabela de Alta Densidade + Inspetor JSON Canônico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Tabela de Snapshots (2 colunas no desktop) */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              Snapshots Auditados de /talent_progress ({filteredRecords.length})
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Clique em uma linha para inspecionar o JSON
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-white">
                Nenhum snapshot encontrado para os filtros selecionados.
              </p>
              <p>
                Limpe os filtros de busca ou clique em &quot;Reconciliar &amp; Atualizar Snapshots&quot; para recarregar os contadores auditados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setSourceFilter('all');
                  setCompletionFilter('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Participante / Caminho</th>
                    <th className="py-2.5 px-3 font-semibold">Perspectiva</th>
                    <th className="py-2.5 px-3 font-semibold">Origem</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Metas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Contadores (M/C/I/L/D/E)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Pontos / Nv</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredRecords.map((rec) => {
                    const isSelected = selectedRecord?.recordKey === rec.recordKey;
                    return (
                      <tr
                        key={rec.recordKey}
                        onClick={() => setSelectedRecordKey(rec.recordKey)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-rose-950/30' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-white truncate max-w-[170px]">
                            {rec.userId}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[170px]">
                            {rec.collectionPath}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-200 font-medium">{rec.roleLabel}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-semibold ${
                              rec.cloudPersisted ? 'text-sky-400' : 'text-amber-300'
                            }`}
                          >
                            {rec.cloudPersisted ? 'Firestore Nuvem' : 'Auditoria Local'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-white">
                          {rec.desafiosConcluidosCount} de 5
                        </td>
                        <td
                          className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-300 tabular-nums"
                          title="Mídias Aprovadas / Ações Colab / Interações / Lives / Dias Ativos / Engajamento"
                        >
                          {rec.approvedPublishedMediaCount}/{rec.collaboratorVerifiedActionsCount}/
                          {rec.eligibleMutualAndChatInteractionsCount}/{rec.validLiveSessionsCount}/
                          {rec.weeklyActiveDaysCount}/{rec.eligibleEngagementEventsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span className="font-bold text-amber-400">
                            {rec.pontosConquistados.toLocaleString('pt-BR')} pts
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            Nível {rec.levelNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecordKey(rec.recordKey);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Code2 className="w-3 h-3 text-rose-400" />
                            <span>JSON</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inspetor JSON Canônico & Verificador de Regras (1 coluna no desktop) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-rose-400" />
              <h4 className="font-bold text-white">Inspetor de Payload JSON</h4>
            </div>
            {selectedRecord && (
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            )}
          </div>

          {!selectedRecord ? (
            <p className="text-slate-400 py-6 text-center">
              Selecione um registro na tabela ao lado para inspecionar o documento canônico de{' '}
              <code className="font-mono text-slate-200">/talent_progress</code>.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Documento Alvo:</span>
                  <code className="font-mono text-sky-300">{selectedRecord.collectionPath}</code>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status de Persistência:</span>
                  <span
                    className={`font-semibold ${
                      selectedRecord.cloudPersisted ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {selectedRecord.sourceLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Última Auditoria:</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {new Date(selectedRecord.updatedAtIso).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Validação firestore.rules:</span>
                  {selectedRecord.schemaValidation.valid ? (
                    <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Schema Válido ({selectedRecord.schemaValidation.checkedFieldsCount}/12)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Violação Detectada
                    </span>
                  )}
                </div>
              </div>

              <pre
                data-testid="talent-admin-json-inspector"
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed"
              >
                {JSON.stringify(selectedRecord.canonicalPayload, null, 2)}
              </pre>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-200">
                  Garantias de Segurança e Isolamento Contábil:
                </div>
                <p>
                  • Este snapshot contém exclusivamente contadores de gamificação auditados em{' '}
                  <strong className="text-white">Modo Produção</strong>.
                </p>
                <p>
                  • Nenhum valor deste JSON altera saldos em reais (R$), créditos virtuais (💎) ou
                  registros na coleção <code className="font-mono text-slate-300">/ledger_entries</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
