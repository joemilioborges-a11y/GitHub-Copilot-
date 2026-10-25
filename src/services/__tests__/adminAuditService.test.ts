/**
 * JOBS 1.0 — SUÍTE DE TESTES OBRIGATÓRIOS DO LOG DE ATIVIDADES DO ADMINISTRADOR
 * (adminAuditService.test.ts)
 * 
 * Verificações:
 * 1. Registro de ação administrativa autorizada com identificação do autor
 * 2. Registro com resultado 'success', 'failure' e 'denied'
 * 3. Operação de ajuste manual de saldo (BALANCE_ADJUSTMENT)
 * 4. Alteração de parâmetros/configurações financeiras (SETTING_UPDATE)
 * 5. Ativação e desativação do modo de teste / sandbox (TEST_MODE_TOGGLE)
 * 6. Cálculo determinístico de hash FIPS 180-4 SHA-256 e serialização canônica
 * 7. Verificação de integridade da cadeia de eventos intacta
 * 8. Detecção de adulteração: modificação de conteúdo de evento anterior
 * 9. Detecção de adulteração: quebra de elo (previousEventHash adulterado)
 * 10. Detecção de adulteração: remoção de evento intermediário na cadeia
 * 11. Concorrência controlada: enfileiramento sequencial sem forks
 * 12. Sanitização de metadados: mascaramento de senhas, tokens e credenciais
 * 13. Integridade financeira: ausência total de mutação financeira em consultas/verificações
 */

import { adminAuditService, AdminActivityEvent } from '../adminAuditService';
import { canonicalJsonStringify, sha256 } from '../../utils/cryptoAudit';
import { financialLedger } from '../ledgerService';

export interface TestResultItem {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  evidence: string;
  error?: string;
  durationMs: number;
}

export interface AdminAuditTestSuiteSummary {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResultItem[];
}

export async function runAdminAuditTestSuite(): Promise<AdminAuditTestSuiteSummary> {
  const startTime = Date.now();
  const results: TestResultItem[] = [];

  const recordResult = (
    testNumber: number,
    id: string,
    name: string,
    passed: boolean,
    evidence: string,
    testStart: number,
    error?: string
  ) => {
    results.push({
      testNumber,
      id,
      name,
      passed,
      evidence,
      error,
      durationMs: Date.now() - testStart,
    });
  };

  // Teste 1: Registro de ação administrativa autorizada com identidade do autor
  {
    const t0 = Date.now();
    try {
      const event = await adminAuditService.logActivity({
        actorId: 'admin_security_lead',
        actorRole: 'admin',
        action: 'POLICY_UPDATE',
        targetType: 'setting',
        targetId: 'withdrawal_holdback',
        result: 'success',
        reason: 'Ajuste de conformidade regulatória Bacen D+14',
        metadata: { holdbackDays: 14 },
      });

      const pass =
        event.actorId === 'admin_security_lead' &&
        event.actorRole === 'admin' &&
        event.action === 'POLICY_UPDATE' &&
        event.schemaVersion === '1.0.0' &&
        event.eventHash.length === 64;

      recordResult(
        1,
        'AUDIT-01',
        'Registro de ação administrativa autorizada com identidade do autor',
        pass,
        `Evento ${event.eventId} gravado com autor=${event.actorId}, papel=${event.actorRole}, hash=${event.eventHash.slice(0, 16)}...`,
        t0
      );
    } catch (err: any) {
      recordResult(1, 'AUDIT-01', 'Registro de ação autorizada', false, '', t0, err?.message);
    }
  }

  // Teste 2: Registro de ações com resultados 'success', 'failure' e 'denied'
  {
    const t0 = Date.now();
    try {
      const eSuccess = await adminAuditService.logActivity({
        actorId: 'admin_test_operator',
        action: 'USER_ROLE_CHANGE',
        targetType: 'user',
        targetId: 'user_cand_99',
        result: 'success',
        reason: 'Promoção para moderador júnior',
      });

      const eFailure = await adminAuditService.logActivity({
        actorId: 'admin_test_operator',
        action: 'USER_SUSPEND',
        targetType: 'user',
        targetId: 'user_cand_99',
        result: 'failure',
        reason: 'Falha na validação de permissão de suspensão',
      });

      const eDenied = await adminAuditService.logActivity({
        actorId: 'unauthorized_guest_account',
        actorRole: 'system',
        action: 'ACCESS_DENIED',
        targetType: 'admin_panel',
        targetId: 'financial_settings',
        result: 'denied',
        reason: 'Tentativa de acesso a rota administrativa sem privilégios RBAC',
      });

      const pass =
        eSuccess.result === 'success' &&
        eFailure.result === 'failure' &&
        eDenied.result === 'denied' &&
        eDenied.action === 'ACCESS_DENIED';

      recordResult(
        2,
        'AUDIT-02',
        'Registro consistente dos resultados success, failure e denied',
        pass,
        `Resultados validados: success (${eSuccess.eventId}), failure (${eFailure.eventId}), denied (${eDenied.eventId})`,
        t0
      );
    } catch (err: any) {
      recordResult(2, 'AUDIT-02', 'Resultados success, failure, denied', false, '', t0, err?.message);
    }
  }

  // Teste 3: Registro de operação de ajuste manual de saldo
  {
    const t0 = Date.now();
    try {
      const event = await adminAuditService.logActivity({
        actorId: 'admin_compliance_officer',
        actorRole: 'admin',
        action: 'BALANCE_ADJUSTMENT',
        targetType: 'ledger',
        targetId: 'acc_creator_brl_c1',
        result: 'success',
        reason: 'Ajuste compensatório de conciliação contábil pós-contestação',
        metadata: {
          previousBalanceBrl: 1500.0,
          adjustmentDeltaBrl: 50.0,
          newBalanceBrl: 1550.0,
          compensatoryLedgerTxId: 'tx_adj_comp_987',
        },
      });

      const pass =
        event.action === 'BALANCE_ADJUSTMENT' &&
        event.targetType === 'ledger' &&
        event.metadata?.adjustmentDeltaBrl === 50.0;

      recordResult(
        3,
        'AUDIT-03',
        'Registro de ajuste manual de saldo (BALANCE_ADJUSTMENT)',
        pass,
        `Ajuste registrado: delta=R$ 50.00, tx=${event.metadata?.compensatoryLedgerTxId}, hash=${event.eventHash.slice(0, 16)}...`,
        t0
      );
    } catch (err: any) {
      recordResult(3, 'AUDIT-03', 'Ajuste manual de saldo', false, '', t0, err?.message);
    }
  }

  // Teste 4: Registro de alteração de configurações financeiras
  {
    const t0 = Date.now();
    try {
      const event = await adminAuditService.logActivity({
        actorId: 'admin_master',
        actorRole: 'admin',
        action: 'SETTING_UPDATE',
        targetType: 'setting',
        targetId: 'creator_revenue_share_split',
        result: 'success',
        reason: 'Confirmação da política fundamental de 70% criador / 30% plataforma',
        metadata: {
          creatorSplitPct: 70,
          platformSplitPct: 30,
          policyDocumentRef: 'POL-FIN-2026-V1',
        },
      });

      const pass =
        event.action === 'SETTING_UPDATE' &&
        event.metadata?.creatorSplitPct === 70 &&
        event.metadata?.platformSplitPct === 30;

      recordResult(
        4,
        'AUDIT-04',
        'Registro de alteração de parâmetros financeiros (SETTING_UPDATE)',
        pass,
        `Configuração registrada: split 70/30 confirmado, docRef=${event.metadata?.policyDocumentRef}`,
        t0
      );
    } catch (err: any) {
      recordResult(4, 'AUDIT-04', 'Alteração de configurações financeiras', false, '', t0, err?.message);
    }
  }

  // Teste 5: Registro de alternância de modo de teste / sandbox
  {
    const t0 = Date.now();
    try {
      const event = await adminAuditService.logActivity({
        actorId: 'admin_qa_lead',
        actorRole: 'admin',
        action: 'TEST_MODE_TOGGLE',
        targetType: 'system_mode',
        targetId: 'sandbox_environment',
        result: 'success',
        reason: 'Ativação formal de isolamento sandbox para bateria de testes',
        metadata: {
          sandboxActive: true,
          realPayoutsBlocked: true,
          virtualCreditsActive: true,
        },
      });

      const pass =
        event.action === 'TEST_MODE_TOGGLE' &&
        event.environment === 'sandbox' &&
        event.metadata?.realPayoutsBlocked === true;

      recordResult(
        5,
        'AUDIT-05',
        'Registro de modo de teste / sandbox (TEST_MODE_TOGGLE)',
        pass,
        `Modo Sandbox registrado: realPayoutsBlocked=true, environment=${event.environment}`,
        t0
      );
    } catch (err: any) {
      recordResult(5, 'AUDIT-05', 'Modo de teste / sandbox', false, '', t0, err?.message);
    }
  }

  // Teste 6: Cálculo determinístico de hash FIPS 180-4 SHA-256 e serialização canônica
  {
    const t0 = Date.now();
    try {
      const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
      const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

      const canonA = canonicalJsonStringify(objA);
      const canonB = canonicalJsonStringify(objB);

      const hashA = sha256(canonA);
      const hashB = sha256(canonB);

      // Conhecido vetor de teste NIST para SHA-256 ("" -> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)
      const emptyHash = sha256('');
      const nistEmptySha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const pass =
        canonA === canonB &&
        hashA === hashB &&
        hashA.length === 64 &&
        emptyHash === nistEmptySha256;

      recordResult(
        6,
        'AUDIT-06',
        'Cálculo determinístico SHA-256 e ordenação canônica FIPS 180-4',
        pass,
        `NIST SHA-256("") validado exato: ${emptyHash}. Serializações canonA===canonB (${hashA.slice(0, 16)}...)`,
        t0
      );
    } catch (err: any) {
      recordResult(6, 'AUDIT-06', 'Cálculo determinístico SHA-256', false, '', t0, err?.message);
    }
  }

  // Teste 7: Verificação da integridade da cadeia de eventos intacta
  {
    const t0 = Date.now();
    try {
      const verification = adminAuditService.verifyChainIntegrity();

      const pass =
        verification.isValid === true &&
        verification.totalEvents >= 8 &&
        verification.errors.length === 0 &&
        verification.tamperedIndex === null;

      recordResult(
        7,
        'AUDIT-07',
        'Verificação da integridade da cadeia de auditoria intacta',
        pass,
        `Cadeia íntegra: ${verification.verifiedCount} eventos validados consecutivamente, 0 erros.`,
        t0
      );
    } catch (err: any) {
      recordResult(7, 'AUDIT-07', 'Verificação da cadeia intacta', false, '', t0, err?.message);
    }
  }

  // Teste 8: Detecção de adulteração: modificação de conteúdo em evento anterior
  {
    const t0 = Date.now();
    try {
      const events = adminAuditService.getAllEvents();
      // Criar cópia adulterando o conteúdo do evento no meio da cadeia
      const tamperedEvents: AdminActivityEvent[] = JSON.parse(JSON.stringify(events));
      const targetIdx = Math.floor(tamperedEvents.length / 2);
      tamperedEvents[targetIdx].reason = 'ADULTERACAO_MALICIOSA_DE_TEXTO';

      const verification = adminAuditService.verifyChainIntegrity(tamperedEvents);

      const pass =
        verification.isValid === false &&
        verification.tamperedIndex === targetIdx &&
        verification.errors.some((e) => e.includes('conteúdo adulterado') || e.includes('diverge'));

      recordResult(
        8,
        'AUDIT-08',
        'Detecção matemática de alteração de conteúdo em evento histórico',
        pass,
        `Adulteração detectada com precisão no índice ${verification.tamperedIndex}: ${verification.errors[0]}`,
        t0
      );
    } catch (err: any) {
      recordResult(8, 'AUDIT-08', 'Detecção de alteração de conteúdo', false, '', t0, err?.message);
    }
  }

  // Teste 9: Detecção de adulteração: quebra de elo anterior (previousEventHash adulterado)
  {
    const t0 = Date.now();
    try {
      const events = adminAuditService.getAllEvents();
      const tamperedEvents: AdminActivityEvent[] = JSON.parse(JSON.stringify(events));
      const targetIdx = 3;
      tamperedEvents[targetIdx].previousEventHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const verification = adminAuditService.verifyChainIntegrity(tamperedEvents);

      const pass =
        verification.isValid === false &&
        verification.errors.length > 0;

      recordResult(
        9,
        'AUDIT-09',
        'Detecção de quebra de elo (previousEventHash inválido)',
        pass,
        `Quebra de elo identificada no índice ${verification.tamperedIndex}: ${verification.errors[0]}`,
        t0
      );
    } catch (err: any) {
      recordResult(9, 'AUDIT-09', 'Detecção de quebra de elo', false, '', t0, err?.message);
    }
  }

  // Teste 10: Detecção de adulteração: remoção de evento intermediário na cadeia
  {
    const t0 = Date.now();
    try {
      const events = adminAuditService.getAllEvents();
      const tamperedEvents: AdminActivityEvent[] = JSON.parse(JSON.stringify(events));
      // Remover um evento no meio da cadeia
      tamperedEvents.splice(2, 1);

      const verification = adminAuditService.verifyChainIntegrity(tamperedEvents);

      const pass =
        verification.isValid === false &&
        verification.errors.length > 0;

      recordResult(
        10,
        'AUDIT-10',
        'Detecção de remoção/deleção de evento intermediário da cadeia',
        pass,
        `Supressão de evento detectada: elo quebrado com o evento subsequente. Erro: ${verification.errors[0]}`,
        t0
      );
    } catch (err: any) {
      recordResult(10, 'AUDIT-10', 'Detecção de remoção de evento', false, '', t0, err?.message);
    }
  }

  // Teste 11: Concorrência controlada: enfileiramento sequencial sem forks
  {
    const t0 = Date.now();
    try {
      // Disparar 5 gravações simultâneas
      const promises = [
        adminAuditService.logActivity({ actorId: 'admin_conc_1', action: 'AUDIT_VERIFY', result: 'success' }),
        adminAuditService.logActivity({ actorId: 'admin_conc_2', action: 'AUDIT_VERIFY', result: 'success' }),
        adminAuditService.logActivity({ actorId: 'admin_conc_3', action: 'AUDIT_VERIFY', result: 'success' }),
        adminAuditService.logActivity({ actorId: 'admin_conc_4', action: 'AUDIT_VERIFY', result: 'success' }),
        adminAuditService.logActivity({ actorId: 'admin_conc_5', action: 'AUDIT_VERIFY', result: 'success' }),
      ];

      const created = await Promise.all(promises);
      const postVerification = adminAuditService.verifyChainIntegrity();

      const pass =
        created.length === 5 &&
        postVerification.isValid === true &&
        postVerification.errors.length === 0;

      recordResult(
        11,
        'AUDIT-11',
        'Concorrência controlada: enfileiramento sequencial assíncrono sem forks',
        pass,
        `5 eventos concorrentes gravados sequencialmente sem criar bifurcações na cadeia SHA-256.`,
        t0
      );
    } catch (err: any) {
      recordResult(11, 'AUDIT-11', 'Concorrência controlada', false, '', t0, err?.message);
    }
  }

  // Teste 12: Sanitização de metadados: mascaramento de senhas e tokens
  {
    const t0 = Date.now();
    try {
      const event = await adminAuditService.logActivity({
        actorId: 'admin_security_bot',
        action: 'PAYOUT_APPROVE',
        result: 'success',
        metadata: {
          secretToken: 'secret_abc123456789',
          userPassword: 'plaintextPassword123!',
          safeField: 'valor_seguro',
        },
      });

      const pass =
        event.metadata?.secretToken === '[REDACTED_SECRET]' &&
        event.metadata?.userPassword === '[REDACTED_SECRET]' &&
        event.metadata?.safeField === 'valor_seguro';

      recordResult(
        12,
        'AUDIT-12',
        'Sanitização e mascaramento estrito de senhas, chaves e tokens nos metadados',
        pass,
        `Campos confidenciais mascarados para [REDACTED_SECRET], preservando metadados seguros.`,
        t0
      );
    } catch (err: any) {
      recordResult(12, 'AUDIT-12', 'Sanitização de metadados', false, '', t0, err?.message);
    }
  }

  // Teste 13: Integridade financeira: ausência total de mutação contábil em consultas de log
  {
    const t0 = Date.now();
    try {
      const preLedgerCount = financialLedger.getEntries().length;
      const preBalance = financialLedger.getCreatorBalances('c1');

      // Executar múltiplas operações de leitura e auditoria no log
      adminAuditService.queryEvents({ page: 1, pageSize: 20 });
      adminAuditService.queryEvents({ action: 'PURCHASE_APPROVE' });
      adminAuditService.queryEvents({ search: 'admin' });
      adminAuditService.verifyChainIntegrity();

      const postLedgerCount = financialLedger.getEntries().length;
      const postBalance = financialLedger.getCreatorBalances('c1');

      const pass =
        preLedgerCount === postLedgerCount &&
        preBalance.availableBrl === postBalance.availableBrl &&
        preBalance.totalEarnedBrl === postBalance.totalEarnedBrl;

      recordResult(
        13,
        'AUDIT-13',
        'Garantia de leitura estritamente passiva: zero mutações financeiras no livro-razão',
        pass,
        `Contagem de lançamentos (${postLedgerCount}) e saldos de criador mantidos 100% inalterados.`,
        t0
      );
    } catch (err: any) {
      recordResult(13, 'AUDIT-13', 'Garantia de leitura passiva', false, '', t0, err?.message);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    suiteName: 'Admin Activity Log & Tamper-Resistant Hash Chain',
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: Date.now() - startTime,
    results,
  };
}
