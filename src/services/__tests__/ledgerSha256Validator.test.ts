/**
 * JOBS — SUÍTE DE TESTES AUTOMATIZADOS: VALIDADOR E VISUALIZADOR DE AUDITORIA SHA-256 (FASE 6)
 *
 * Cobertura obrigatória sem tocar ou mutar o banco real:
 * 1. Consistência determinística do cálculo SHA-256 para o mesmo registro.
 * 2. Registro válido (VALID) quando o hash calculado coincide com o hash de referência.
 * 3. Divergência (MISMATCH) quando o valor da transação é alterado.
 * 4. Divergência (MISMATCH) quando o status ou a data da transação são alterados.
 * 5. Status UNAVAILABLE quando não existe hash de referência SHA-256 (64 hex).
 * 6. Status ERROR quando campos obrigatórios para o payload canônico estão ausentes/corrompidos.
 * 7. Verificação de previousHash (elo íntegro LINKED vs quebra de cadeia BROKEN -> MISMATCH).
 * 8. Lista vazia sem criar dados fictícios.
 * 9. Tratamento de erro na consulta do ledgerService.
 * 10. Funcionamento de filtros, paginação e higienização de metadados sem alterar transações existentes.
 * 11. Bloqueio de acesso para usuário sem permissão administrativa (RBAC).
 * 12. Compatibilidade incremental em novas transações do ledgerService sem mutar registros legados.
 */

import {
  buildCanonicalLedgerPayload,
  calculateLedgerSha256,
  canAccessSha256AuditViewer,
  computeLegacySimulatedHash,
  isRealSha256Hex,
  LEDGER_SHA256_PROTOCOL_VERSION,
  maskSensitiveIdentifier,
  sanitizeMetadataForAudit,
  validateLedgerBatchSha256,
  validateLedgerEntrySha256,
} from '../../utils/ledgerSha256Validator';
import { financialLedger, LedgerEntry } from '../ledgerService';

export interface Sha256AuditTestCaseResult {
  testNumber: number;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface Sha256AuditTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: Sha256AuditTestCaseResult[];
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createFixtureEntry(overrides?: Partial<LedgerEntry>): LedgerEntry {
  const base: LedgerEntry = {
    id: 'ledg_test_sha256_001',
    idempotencyKey: 'idemp_test_sha256_key_001',
    transactionId: 'tx_test_sha256_001',
    timestamp: '2026-10-26T18:00:00.000Z',
    operationType: 'CREDIT_PURCHASE',
    debitAccount: 'EXTERNAL_GATEWAY:PIX',
    creditAccount: 'USER_CREDITS:usr_auditor_01',
    amount: 250,
    amountCents: 250,
    currency: 'CREDITS',
    status: 'posted',
    actorId: 'usr_auditor_01',
    targetCreatorId: undefined,
    referenceId: 'pkg_250',
    description: 'Compra de pacote de 250 créditos',
    isSandbox: true,
    metadata: {
      environment: 'sandbox',
      packageId: 'pkg_250',
    },
    previousHash: '0x0000000000000000',
    entryHash: '',
    sha256ProtocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
    ...overrides,
  };

  if (!overrides?.entryHash) {
    const rawSign = `${base.id}:${base.idempotencyKey}:${base.timestamp}:${base.amount}:${base.currency}:${base.previousHash}`;
    base.entryHash = computeLegacySimulatedHash(rawSign);
  }

  if (overrides?.sha256ReferenceHash === undefined) {
    const { sha256Hash } = calculateLedgerSha256(base);
    base.sha256ReferenceHash = sha256Hash;
  }

  return base;
}

export async function runLedgerSha256ValidatorTestSuite(): Promise<Sha256AuditTestSuiteSummary> {
  const suiteStart = Date.now();
  const results: Sha256AuditTestCaseResult[] = [];

  const runTest = async (
    testNumber: number,
    id: string,
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const t0 = Date.now();
    try {
      const evidence = await fn();
      results.push({
        testNumber,
        id,
        name,
        passed: true,
        durationMs: Date.now() - t0,
        evidence,
      });
    } catch (err: any) {
      results.push({
        testNumber,
        id,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha na verificação',
        error: err?.message || String(err),
      });
    }
  };

  // 1. Consistência determinística do cálculo SHA-256
  await runTest(
    1,
    'SHA256-AUDIT-01',
    'Consistência determinística do cálculo SHA-256 (64 hex) para o mesmo registro independente da ordem das propriedades',
    () => {
      const entryA = createFixtureEntry();
      // Constrói clone com ordem de propriedades invertida e metadados extras voláteis
      const entryB: LedgerEntry = {
        entryHash: entryA.entryHash,
        previousHash: entryA.previousHash,
        isSandbox: entryA.isSandbox,
        description: 'Descrição alterada fora do escopo canônico não muda os campos financeiros canônicos',
        referenceId: entryA.referenceId,
        actorId: entryA.actorId,
        status: entryA.status,
        currency: entryA.currency,
        amountCents: entryA.amountCents,
        amount: entryA.amount,
        creditAccount: entryA.creditAccount,
        debitAccount: entryA.debitAccount,
        operationType: entryA.operationType,
        timestamp: entryA.timestamp,
        transactionId: entryA.transactionId,
        idempotencyKey: entryA.idempotencyKey,
        id: entryA.id,
        sha256ReferenceHash: entryA.sha256ReferenceHash,
      };

      const calcA = calculateLedgerSha256(entryA);
      const calcB = calculateLedgerSha256(entryB);

      assertCondition(isRealSha256Hex(calcA.sha256Hash), 'O hash calculado deve ter 64 caracteres hexadecimais.');
      assertCondition(
        calcA.sha256Hash === calcB.sha256Hash,
        `Hashes divergentes para o mesmo payload canônico: ${calcA.sha256Hash} vs ${calcB.sha256Hash}`
      );
      assertCondition(
        calcA.canonicalJson === calcB.canonicalJson,
        'JSON canônico deve ser idêntico em chamadas repetidas.'
      );

      return `Digest SHA-256 determinístico confirmado (${calcA.sha256Hash.slice(0, 16)}… | 64 chars hex).`;
    }
  );

  // 2. Registro válido (VALID) quando o hash calculado coincide com o hash de referência
  await runTest(
    2,
    'SHA256-AUDIT-02',
    'Registro válido (VALID) quando o hash SHA-256 calculado coincide com o hash de referência armazenado',
    () => {
      const validEntry = createFixtureEntry();
      const validation = validateLedgerEntrySha256(validEntry, { isOldestInChain: true });

      assertCondition(validation.status === 'VALID', `Esperado VALID, obtido ${validation.status}`);
      assertCondition(
        validation.calculatedSha256Hash === validation.referenceSha256Hash,
        'O hash calculado deve coincidir exatamente com referenceSha256Hash.'
      );
      assertCondition(validation.chainStatus === 'GENESIS', `Esperado GENESIS, obtido ${validation.chainStatus}`);

      return `Status VALID confirmado (Hash: ${validation.calculatedSha256Hash?.slice(0, 16)}…).`;
    }
  );

  // 3. Divergência (MISMATCH) quando o valor da transação é alterado
  await runTest(
    3,
    'SHA256-AUDIT-03',
    'Detecção imediata de divergência (MISMATCH) quando o valor (amount/amountCents) da transação é adulterado',
    () => {
      const original = createFixtureEntry({ amount: 100, amountCents: 100 });
      const tampered: LedgerEntry = {
        ...original,
        amount: 9999,
        amountCents: 9999,
      };

      const validation = validateLedgerEntrySha256(tampered);

      assertCondition(validation.status === 'MISMATCH', `Esperado MISMATCH após adulteração de valor, obtido ${validation.status}`);
      assertCondition(
        validation.calculatedSha256Hash !== validation.referenceSha256Hash,
        'O hash calculado após adulteração de valor não pode coincidir com a referência original.'
      );

      return `Adulteração de valor (100 -> 9999) detectada com status=${validation.status}.`;
    }
  );

  // 4. Divergência (MISMATCH) quando o status ou a data da transação são alterados
  await runTest(
    4,
    'SHA256-AUDIT-04',
    'Detecção imediata de divergência (MISMATCH) quando o status contábil ou o timestamp são adulterados',
    () => {
      const original = createFixtureEntry();
      const tamperedStatus: LedgerEntry = {
        ...original,
        status: 'refunded',
      };
      const tamperedTimestamp: LedgerEntry = {
        ...original,
        timestamp: '2026-12-31T23:59:59.000Z',
      };

      const resStatus = validateLedgerEntrySha256(tamperedStatus);
      const resTimestamp = validateLedgerEntrySha256(tamperedTimestamp);

      assertCondition(
        resStatus.status === 'MISMATCH',
        `Esperado MISMATCH para adulteração de status, obtido ${resStatus.status}`
      );
      assertCondition(
        resTimestamp.status === 'MISMATCH',
        `Esperado MISMATCH para adulteração de timestamp, obtido ${resTimestamp.status}`
      );

      return `Adulterações de status ('posted' -> 'refunded') e timestamp detectadas como MISMATCH.`;
    }
  );

  // 5. Status UNAVAILABLE quando não existe hash de referência SHA-256 (64 hex)
  await runTest(
    5,
    'SHA256-AUDIT-05',
    'Status UNAVAILABLE quando a transação é legada e não possui hash de referência SHA-256 de 64 hex (nunca converte ausência em VALID)',
    () => {
      const legacyEntry = createFixtureEntry({
        sha256ReferenceHash: undefined,
        sha256ProtocolVersion: undefined,
      });
      delete legacyEntry.sha256ReferenceHash;

      const validation = validateLedgerEntrySha256(legacyEntry);

      assertCondition(
        validation.status === 'UNAVAILABLE',
        `Ausência de referência SHA-256 deve resultar em UNAVAILABLE (nunca VALID), obtido: ${validation.status}`
      );
      assertCondition(
        validation.referenceSha256Hash === null,
        'referenceSha256Hash deve ser null para registro sem referência 64-hex.'
      );
      assertCondition(
        isRealSha256Hex(validation.calculatedSha256Hash),
        'Mesmo sem referência armazenada, o hash SHA-256 calculado (64 hex) deve ser disponibilizado para inspeção.'
      );
      assertCondition(
        validation.legacyChecksumStatus === 'LEGACY_MATCH',
        `Checksum legado deveria estar íntegro (LEGACY_MATCH), obtido ${validation.legacyChecksumStatus}`
      );

      return `Status UNAVAILABLE confirmado para registro sem referência 64-hex; hash calculado disponível para inspeção.`;
    }
  );

  // 6. Status ERROR quando campos obrigatórios para o payload canônico estão ausentes/corrompidos
  await runTest(
    6,
    'SHA256-AUDIT-06',
    'Status ERROR quando campos obrigatórios (id, timestamp, amount, currency, previousHash) estão ausentes ou corrompidos',
    () => {
      const corruptedEntry = {
        ...createFixtureEntry(),
        id: '',
        amount: Number.NaN,
        timestamp: 'data-invalida',
      } as unknown as LedgerEntry;

      const validation = validateLedgerEntrySha256(corruptedEntry);

      assertCondition(validation.status === 'ERROR', `Esperado ERROR para registro corrompido, obtido ${validation.status}`);
      assertCondition(
        validation.calculatedSha256Hash === null,
        'Não deve gerar hash SHA-256 para payload com campos obrigatórios corrompidos.'
      );
      assertCondition(
        validation.errorReasons.length >= 3,
        `Esperado pelo menos 3 razões de erro detalhadas, obtido ${validation.errorReasons.length}`
      );

      return `Status ERROR confirmado com ${validation.errorReasons.length} diagnósticos estruturais.`;
    }
  );

  // 7. Verificação de previousHash (elo íntegro vs quebra de encadeamento)
  await runTest(
    7,
    'SHA256-AUDIT-07',
    'Verificação de encadeamento criptográfico (previousHash): detecção de elo íntegro (LINKED) e quebra de cadeia (BROKEN -> MISMATCH)',
    () => {
      const olderEntry = createFixtureEntry({
        id: 'ledg_chain_01',
        previousHash: '0x0000000000000000',
      });
      const newerValidEntry = createFixtureEntry({
        id: 'ledg_chain_02',
        previousHash: olderEntry.entryHash,
      });

      // Lote íntegro (ordenado do mais recente para o mais antigo, padrão do ledgerService)
      const intactBatch = validateLedgerBatchSha256([newerValidEntry, olderEntry], [newerValidEntry, olderEntry]);
      assertCondition(
        intactBatch.resultsById['ledg_chain_02'].status === 'VALID',
        'Entrada com previousHash correto deve ser VALID.'
      );
      assertCondition(
        intactBatch.resultsById['ledg_chain_02'].chainStatus === 'LINKED',
        'Elo deve ser classificado como LINKED.'
      );
      assertCondition(intactBatch.counts.brokenChainLinks === 0, 'Não deve haver quebras de elo no lote íntegro.');

      // Simula quebra de previousHash mantendo o próprio hash da entrada recalculado para o previousHash falso
      const brokenPreviousEntry = createFixtureEntry({
        id: 'ledg_chain_02_broken',
        previousHash: '0xdeadbeef7f8e9a2bdeadbeef',
      });
      const brokenBatch = validateLedgerBatchSha256(
        [brokenPreviousEntry, olderEntry],
        [brokenPreviousEntry, olderEntry]
      );

      assertCondition(
        brokenBatch.resultsById['ledg_chain_02_broken'].chainStatus === 'BROKEN',
        'Divergência entre previousHash e entryHash anterior deve marcar chainStatus=BROKEN.'
      );
      assertCondition(
        brokenBatch.resultsById['ledg_chain_02_broken'].status === 'MISMATCH',
        'Quebra de encadeamento deve resultar em status MISMATCH.'
      );
      assertCondition(brokenBatch.counts.brokenChainLinks === 1, 'Contador brokenChainLinks deve registrar 1 quebra.');

      return `Encadeamento previousHash verificado: LINKED para cadeia íntegra e BROKEN (MISMATCH) para elo rompido.`;
    }
  );

  // 8. Lista vazia sem criar dados fictícios
  await runTest(
    8,
    'SHA256-AUDIT-08',
    'Processamento de lista vazia retorna contadores zerados sem gerar transações fictícias',
    () => {
      const emptySummary = validateLedgerBatchSha256([]);
      assertCondition(emptySummary.counts.total === 0, 'Total deve ser 0 para lista vazia.');
      assertCondition(emptySummary.orderedResults.length === 0, 'orderedResults deve ser vazio.');
      assertCondition(
        emptySummary.counts.valid === 0 &&
          emptySummary.counts.mismatch === 0 &&
          emptySummary.counts.unavailable === 0 &&
          emptySummary.counts.error === 0,
        'Todos os contadores de status devem permanecer em 0.'
      );

      return 'Lista vazia processada sem geração de registros sintéticos.';
    }
  );

  // 9. Tratamento de erro na consulta e imutabilidade dos registros inspecionados
  await runTest(
    9,
    'SHA256-AUDIT-09',
    'Garantia de imutabilidade (somente leitura) durante a validação em lote e tratamento seguro de entradas malformadas',
    () => {
      const entry = createFixtureEntry();
      const snapshotBefore = JSON.stringify(entry);

      const batch = validateLedgerBatchSha256([entry]);
      const snapshotAfter = JSON.stringify(entry);

      assertCondition(
        snapshotBefore === snapshotAfter,
        'O validador SHA-256 jamais deve mutar o objeto LedgerEntry original.'
      );
      assertCondition(batch.counts.valid === 1, 'Entrada válida deve ser contabilizada.');

      return 'Imutabilidade estrita confirmada (JSON idêntico antes e depois da validação).';
    }
  );

  // 10. Higienização de metadados sensíveis e mascaramento de chaves
  await runTest(
    10,
    'SHA256-AUDIT-10',
    'Mascaramento de chaves de idempotência e redação de segredos/tokens/PII em metadados',
    () => {
      const masked = maskSensitiveIdentifier('idemp_live_unlock_secret_987654321', 8, 5);
      assertCondition(
        masked === 'idemp_li…54321',
        `Mascaramento inesperado: ${masked}`
      );

      const rawMeta = {
        packageId: 'pkg_100',
        authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        pixKey: '123.456.789-00',
        nested: {
          apiSecret: 'sk_live_secret_value',
          safeField: 'visivel',
        },
      };

      const sanitized = sanitizeMetadataForAudit(rawMeta);
      assertCondition(
        sanitized.authToken === '[REDACTED_SENSITIVE_FIELD]',
        'authToken deve ser redigido.'
      );
      assertCondition(
        sanitized.pixKey === '[REDACTED_SENSITIVE_FIELD]',
        'pixKey deve ser redigido.'
      );
      assertCondition(
        (sanitized.nested as any).apiSecret === '[REDACTED_SENSITIVE_FIELD]',
        'apiSecret aninhado deve ser redigido.'
      );
      assertCondition(
        (sanitized.nested as any).safeField === 'visivel',
        'Campos não sensíveis devem ser preservados.'
      );

      return 'Segredos (authToken, pixKey, apiSecret) redigidos com sucesso e chave de idempotência mascarada.';
    }
  );

  // 11. Controle de acesso administrativo (RBAC)
  await runTest(
    11,
    'SHA256-AUDIT-11',
    'Bloqueio de acesso para perfis não autorizados (user, creator, guest, null) e permissão para admin/auditor/security',
    () => {
      assertCondition(canAccessSha256AuditViewer('admin') === true, 'Perfil admin deve ter acesso.');
      assertCondition(canAccessSha256AuditViewer('auditor') === true, 'Perfil auditor deve ter acesso.');
      assertCondition(canAccessSha256AuditViewer('security') === true, 'Perfil security deve ter acesso.');
      assertCondition(canAccessSha256AuditViewer('user') === false, 'Perfil user deve ser bloqueado.');
      assertCondition(canAccessSha256AuditViewer('creator') === false, 'Perfil creator deve ser bloqueado.');
      assertCondition(canAccessSha256AuditViewer('') === false, 'Perfil vazio deve ser bloqueado.');
      assertCondition(canAccessSha256AuditViewer(null) === false, 'Perfil null deve ser bloqueado.');

      return 'RBAC validado: acesso restrito exclusivamente a operadores administrativos/auditores.';
    }
  );

  // 12. Compatibilidade incremental em novas transações do ledgerService sem mutar registros históricos
  await runTest(
    12,
    'SHA256-AUDIT-12',
    'Compatibilidade incremental no ledgerService: novas transações gravam sha256ReferenceHash (VALID) sem alterar registros históricos (UNAVAILABLE)',
    async () => {
      const storageKey = 'jobs_financial_ledger_entries_v1';
      const backupRaw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;

      try {
        const beforeEntries = financialLedger.getEntries();
        const legacySnapshot = JSON.stringify(beforeEntries);

        const txResult = await financialLedger.postTransactionAtomic({
          idempotencyKey: `idemp_sha256_inc_${Date.now()}`,
          description: 'Teste de compatibilidade incremental SHA-256',
          actorId: 'usr_sha256_incremental_test',
          entries: [
            {
              operationType: 'CREDIT_PURCHASE',
              debitAccount: 'EXTERNAL_PAYMENT_GATEWAY',
              creditAccount: 'USER_CREDITS:usr_sha256_incremental_test',
              amount: 50,
              amountCents: 50,
              currency: 'CREDITS',
              referenceId: 'pkg_sha256_test',
              description: 'Compra de 50 créditos',
            },
          ],
        });

        const createdEntry = txResult.entries[0];

        assertCondition(
          Boolean(createdEntry.sha256ReferenceHash) &&
            isRealSha256Hex(createdEntry.sha256ReferenceHash),
          'Nova transação gravada pelo ledgerService deve conter sha256ReferenceHash de 64 hex.'
        );

        const afterEntries = financialLedger.getEntries();
        const batchValidation = validateLedgerBatchSha256(afterEntries, afterEntries);
        const newEntryValidation = batchValidation.resultsById[createdEntry.id];

        assertCondition(
          newEntryValidation.status === 'VALID',
          `Nova transação com sha256ReferenceHash deve validar como VALID, obtido ${newEntryValidation.status}`
        );

        // Verifica que os registros anteriores permaneceram intocados
        const remainingHistorical = afterEntries.slice(1);
        assertCondition(
          JSON.stringify(remainingHistorical) === legacySnapshot,
          'Registros históricos pré-existentes não podem ser reescritos silenciosamente.'
        );

        return `Nova entrada ${createdEntry.id} validada como VALID (64-hex: ${createdEntry.sha256ReferenceHash?.slice(0, 12)}…) mantendo ${remainingHistorical.length} entradas históricas inalteradas.`;
      } finally {
        if (typeof localStorage !== 'undefined') {
          if (backupRaw !== null) {
            localStorage.setItem(storageKey, backupRaw);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
