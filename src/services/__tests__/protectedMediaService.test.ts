/**
 * JOBS — Suíte de Testes Obrigatórios de Proteção de Mídias, Fotos e Vídeos
 * Validação rigorosa dos controles da Fase 1 e Fase 2 da diretriz de segurança.
 */

import { protectedMediaService, obfuscateUserIdForWatermark } from '../protectedMediaService';
import { monetizationService } from '../monetizationService';
import { ContentAccessGrant, TemporaryAccessToken } from '../../types';

export interface ProtectedMediaTestResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface ProtectedMediaTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: ProtectedMediaTestResult[];
}

export async function runProtectedMediaTestSuite(): Promise<ProtectedMediaTestSuiteSummary> {
  const tStart = Date.now();
  const results: ProtectedMediaTestResult[] = [];

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<{ passed: boolean; evidence: string }> | { passed: boolean; evidence: string }
  ) => {
    const t0 = Date.now();
    try {
      const outcome = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: outcome.passed,
        durationMs: Date.now() - t0,
        evidence: outcome.evidence,
      });
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Exceção não tratada durante o teste de segurança.',
        error: err?.message || String(err),
      });
    }
  };

  protectedMediaService.resetSecurityStorageForTesting();

  // =========================================================================
  // TESTE 1: Usuário autorizado consegue visualizar a mídia protegida
  // =========================================================================
  await runTest(
    1,
    'MEDIA_AUTH_01_AUTHORIZED_ACCESS',
    'Usuário autorizado com concessão ativa recebe acesso e ticket com assinatura',
    async () => {
      const userId = `user_auth_${Date.now()}`;
      const contentId = 'cnt_val_01';
      const masterUrl = '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg';

      // Simular concessão ativa no monetizationService
      const grants: ContentAccessGrant[] = (monetizationService as any).getItem('jobs_fase1_access_grants_v1', []);
      grants.push({
        id: `grnt_test_${Date.now()}`,
        contentId,
        userId,
        status: 'active',
        grantedAt: new Date().toISOString(),
      });
      (monetizationService as any).setItem('jobs_fase1_access_grants_v1', grants);

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId,
        contentId,
        rawMasterUrl: masterUrl,
        isContentFree: false,
      });

      const passed = res.allowed === true && res.code === 'ACCESS_GRANTED' && Boolean(res.ticket?.signature);
      return {
        passed,
        evidence: `Acesso deferido: code=${res.code}, ticketId=${res.ticket?.ticketId}, assinatura=${res.ticket?.signature}.`,
      };
    }
  );

  // =========================================================================
  // TESTE 2: Usuário não autorizado recebe acesso negado
  // =========================================================================
  await runTest(
    2,
    'MEDIA_AUTH_02_UNAUTHORIZED_DENIED',
    'Usuário sem concessão ativa recebe acesso estritamente negado (sem vazamento da master)',
    async () => {
      const unauthUserId = `user_unauth_${Date.now()}`;
      const contentId = 'cnt_val_02';
      const masterUrl = '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg';

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: unauthUserId,
        contentId,
        rawMasterUrl: masterUrl,
        isContentFree: false,
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_NO_GRANT' && res.isTeaserOnly === true;
      return {
        passed,
        evidence: `Acesso negado com segurança: code=${res.code}, motivo="${res.reason}". Teaser ativo.`,
      };
    }
  );

  // =========================================================================
  // TESTE 3: Acesso anônimo/sem autenticação é sumariamente bloqueado
  // =========================================================================
  await runTest(
    3,
    'MEDIA_AUTH_03_ANONYMOUS_BLOCKED',
    'Solicitação anônima sem userId é bloqueada no servidor de autorização',
    async () => {
      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: '',
        contentId: 'cnt_val_01',
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_UNAUTHENTICATED';
      return {
        passed,
        evidence: `Bloqueio anônimo bem-sucedido: code=${res.code}, isTeaserOnly=${res.isTeaserOnly}.`,
      };
    }
  );

  // =========================================================================
  // TESTE 4: Detecção e bloqueio de IDOR por adulteração de identificador de mídia
  // =========================================================================
  await runTest(
    4,
    'MEDIA_AUTH_04_IDOR_TAMPER_CONTENT_ID',
    'Tentativa de usar token de um conteúdo para acessar outro (IDOR) é bloqueada',
    async () => {
      const userId = 'user_idor_victim';
      const tokenForContentA: TemporaryAccessToken = {
        id: `tok_a_${Date.now()}`,
        contentId: 'media_photo_01',
        userId,
        accessGrantId: 'grnt_a',
        tokenHash: 'hash_a',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Tenta apresentar esse token para a mídia B
      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId,
        contentId: 'media_photo_02_DIFFERENT',
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        existingToken: tokenForContentA,
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_IDOR';
      return {
        passed,
        evidence: `IDOR bloqueado: code=${res.code}, motivo="${res.reason}". Registro gerado na trilha de auditoria.`,
      };
    }
  );

  // =========================================================================
  // TESTE 5: Detecção e bloqueio de IDOR por adulteração de identificador de usuário
  // =========================================================================
  await runTest(
    5,
    'MEDIA_AUTH_05_IDOR_TAMPER_USER_ID',
    'Tentativa de usar token pertencente a outro usuário é rejeitada com código IDOR',
    async () => {
      const victimUser = 'user_victim';
      const attackerUser = 'user_attacker';
      const tokenBelongingToVictim: TemporaryAccessToken = {
        id: `tok_vic_${Date.now()}`,
        contentId: 'media_private_pack',
        userId: victimUser,
        accessGrantId: 'grnt_vic',
        tokenHash: 'hash_vic',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: attackerUser,
        contentId: 'media_private_pack',
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        existingToken: tokenBelongingToVictim,
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_IDOR';
      return {
        passed,
        evidence: `IDOR entre usuários bloqueado: code=${res.code}, motivo="${res.reason}".`,
      };
    }
  );

  // =========================================================================
  // TESTE 6: Expiração estrita de tokens temporários (TTL de 15 minutos)
  // =========================================================================
  await runTest(
    6,
    'MEDIA_AUTH_06_TOKEN_EXPIRATION',
    'Token temporário com tempo expirado é imediatamente recusado com ACCESS_DENIED_EXPIRED',
    async () => {
      const userId = 'user_expired_test';
      const contentId = 'cnt_exp_01';
      const expiredToken: TemporaryAccessToken = {
        id: `tok_exp_${Date.now()}`,
        contentId,
        userId,
        accessGrantId: 'grnt_exp',
        tokenHash: 'hash_exp',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Vencido há 1 segundo
        createdAt: new Date(Date.now() - 901000).toISOString(),
      };

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId,
        contentId,
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        existingToken: expiredToken,
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_EXPIRED';
      return {
        passed,
        evidence: `Expiração validada: code=${res.code}, expirado em ${expiredToken.expiresAt}.`,
      };
    }
  );

  // =========================================================================
  // TESTE 7: Revogação de acesso (estorno ou encerramento administrativo)
  // =========================================================================
  await runTest(
    7,
    'MEDIA_AUTH_07_TOKEN_REVOCATION',
    'Token revogado manualmente no serviço é barrado com ACCESS_DENIED_REVOKED',
    async () => {
      const tokenId = `tok_to_revoke_${Date.now()}`;
      protectedMediaService.revokeToken(tokenId, 'Estorno contábil confirmado pelo compliance.');

      const token: TemporaryAccessToken = {
        id: tokenId,
        contentId: 'cnt_rev_01',
        userId: 'user_rev_01',
        accessGrantId: 'grnt_rev',
        tokenHash: 'hash_rev',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: 'user_rev_01',
        contentId: 'cnt_rev_01',
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
        existingToken: token,
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_REVOKED';
      return {
        passed,
        evidence: `Revogação efetiva: code=${res.code}, motivo="${res.reason}".`,
      };
    }
  );

  // =========================================================================
  // TESTE 8: Respeito imediato a bloqueios de usuários por moderação
  // =========================================================================
  await runTest(
    8,
    'MEDIA_AUTH_08_USER_BLOCK_ENFORCEMENT',
    'Usuário bloqueado por moderação perde o direito de visualizar qualquer mídia protegida',
    async () => {
      const blockedUser = `user_bad_actor_${Date.now()}`;
      protectedMediaService.blockUserFromMedia(blockedUser, 'Violação reiterada das diretrizes de respeito.');

      const res = protectedMediaService.requestAuthorizedMediaAccess({
        userId: blockedUser,
        contentId: 'cnt_any',
        rawMasterUrl: '/src/assets/images/vip_exclusive_glamour_1791856838011.jpg',
      });

      const passed = res.allowed === false && res.code === 'ACCESS_DENIED_USER_BLOCKED';
      return {
        passed,
        evidence: `Bloqueio por moderação respeitado: code=${res.code}, motivo="${res.reason}".`,
      };
    }
  );

  // =========================================================================
  // TESTE 9: Marca-d'água dissuasória sem exposição de dados pessoais sensíveis
  // =========================================================================
  await runTest(
    9,
    'MEDIA_AUTH_09_SAFE_WATERMARK_PAYLOAD',
    'Marca-d’água utiliza identificador anônimo de sessão sem expor e-mail, telefone ou CPF',
    () => {
      const ticket = protectedMediaService.issueMediaTicket('joemilioborges@gmail.com', 'cnt_vip_photo');
      const obfuscated = obfuscateUserIdForWatermark('joemilioborges@gmail.com');

      const containsSensitive =
        ticket.watermarkPayload.obfuscatedUserId.includes('@') ||
        ticket.watermarkPayload.displayNotice.includes('@') ||
        ticket.watermarkPayload.displayNotice.includes('gmail.com');

      const passed = !containsSensitive && obfuscated.startsWith('USR-');
      return {
        passed,
        evidence: `Payload seguro: obfuscatedId="${ticket.watermarkPayload.obfuscatedUserId}", displayNotice="${ticket.watermarkPayload.displayNotice}". Sem dados pessoais sensíveis expostos.`,
      };
    }
  );

  // =========================================================================
  // TESTE 10: Trilha de auditoria sem registro de segredos ou tokens em texto plano
  // =========================================================================
  await runTest(
    10,
    'MEDIA_AUTH_10_AUDIT_LOG_PRIVACY',
    'Trilha de auditoria registra ações de segurança com IP mascarado e sem segredos',
    () => {
      const logs = protectedMediaService.getSecurityAuditLogs();
      const hasLogs = logs.length > 0;
      const noSecrets = logs.every(
        (l) => !l.reason.includes('jobs_media_secret_salt') && l.ipMasked.includes('***')
      );

      const passed = hasLogs && noSecrets;
      return {
        passed,
        evidence: `${logs.length} eventos registrados na auditoria de segurança com conformidade e anonimização de IP (${logs[0]?.ipMasked}).`,
      };
    }
  );

  const durationMs = Date.now() - tStart;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs,
    results,
  };
}
