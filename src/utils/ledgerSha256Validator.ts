/**
 * JOBS — VALIDADOR CRIPTOGRÁFICO DE LOGS DE AUDITORIA SHA-256 DO LEDGER
 *
 * Responsabilidades:
 * 1. Construir o payload canônico determinístico (`v1-canonical-sha256`) de cada `LedgerEntry`.
 * 2. Calcular o digest SHA-256 real (FIPS 180-4, 64 caracteres hexadecimais) via `cryptoAudit`.
 * 3. Validar cada entrada sem mutar o histórico, classificando estritamente em:
 *    - `VALID`: Possui hash de referência SHA-256 (64 hex), coincide com o hash calculado e o elo `previousHash` está íntegro.
 *    - `MISMATCH`: Divergência entre o hash calculado e o hash de referência, adulteração de checksum legado ou quebra de `previousHash`.
 *    - `UNAVAILABLE`: Entrada legada/pré-migração sem hash de referência SHA-256 de 64 hex (nunca converte ausência de referência em válido).
 *    - `ERROR`: Campos obrigatórios ausentes, tipos corrompidos ou falha na serialização/cálculo.
 * 4. Garantir controle de acesso administrativo (RBAC) e higienização de metadados sensíveis.
 */

import { canonicalJsonStringify, sha256 } from './cryptoAudit';
import type {
  AccountCurrency,
  LedgerEntry,
  LedgerEntryStatus,
  LedgerOperationType,
} from '../services/ledgerService';

export const LEDGER_SHA256_PROTOCOL_VERSION = 'v1-canonical-sha256' as const;

export type Sha256ValidationStatus = 'VALID' | 'MISMATCH' | 'UNAVAILABLE' | 'ERROR';

export type ChainLinkValidationStatus =
  | 'LINKED'
  | 'GENESIS'
  | 'BROKEN'
  | 'UNVERIFIED_PAGE_BOUNDARY'
  | 'INVALID_PREVIOUS_HASH';

export type LegacyChecksumStatus = 'LEGACY_MATCH' | 'LEGACY_MISMATCH' | 'NOT_APPLICABLE';

export interface CanonicalLedgerAuditPayload {
  protocolVersion: typeof LEDGER_SHA256_PROTOCOL_VERSION;
  id: string;
  idempotencyKey: string;
  transactionId: string | null;
  timestamp: string;
  operationType: LedgerOperationType;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  amountCents: number;
  currency: AccountCurrency;
  status: LedgerEntryStatus;
  actorId: string;
  targetCreatorId: string | null;
  referenceId: string | null;
  isSandbox: boolean;
  previousHash: string;
}

export interface LedgerSha256ValidationResult {
  entryId: string;
  status: Sha256ValidationStatus;
  statusLabel: string;
  statusReason: string;
  protocolVersion: string;
  calculatedSha256Hash: string | null;
  referenceSha256Hash: string | null;
  storedEntryHash: string | null;
  legacyChecksumStatus: LegacyChecksumStatus;
  chainStatus: ChainLinkValidationStatus;
  expectedPreviousHash: string | null;
  actualPreviousHash: string | null;
  canonicalPayloadJson: string | null;
  canonicalFieldsIncluded: string[];
  errorReasons: string[];
  environment: 'sandbox' | 'production';
}

export interface LedgerSha256BatchValidationSummary {
  resultsById: Record<string, LedgerSha256ValidationResult>;
  orderedResults: LedgerSha256ValidationResult[];
  counts: {
    total: number;
    valid: number;
    mismatch: number;
    unavailable: number;
    error: number;
    brokenChainLinks: number;
  };
}

const VALID_CURRENCIES: ReadonlySet<string> = new Set(['CREDITS', 'BRL']);
const VALID_STATUSES: ReadonlySet<string> = new Set(['posted', 'pending', 'voided', 'refunded']);
const VALID_OPERATIONS: ReadonlySet<string> = new Set([
  'CREDIT_PURCHASE',
  'CONTENT_UNLOCK',
  'TIP_GIFT',
  'SUBSCRIPTION_PURCHASE',
  'CREATOR_REVENUE_SHARE',
  'PLATFORM_COMMISSION',
  'REFUND',
  'CHARGEBACK',
  'ADMIN_ADJUSTMENT',
  'PERFORMANCE_REWARD',
  'PAYOUT_RESERVE',
  'PAYOUT_SETTLED',
  'PAYOUT_REVERSAL',
]);

const ALLOWED_AUDIT_ROLES: ReadonlySet<string> = new Set([
  'admin',
  'auditor',
  'security',
  'master',
  'central_admin',
]);

const SENSITIVE_METADATA_KEY_REGEX =
  /token|secret|password|passwd|authorization|bearer|cookie|session|private_key|apikey|api_key|cpf|cnpj|pixkey|pix_key|card_number|cvv|iban/i;

/**
 * Verifica se o perfil tem permissão explícita para acessar o Visualizador de Logs SHA-256.
 */
export function canAccessSha256AuditViewer(role?: string | null): boolean {
  if (!role || typeof role !== 'string') return false;
  return ALLOWED_AUDIT_ROLES.has(role.trim().toLowerCase());
}

/**
 * Mascara chaves de idempotência ou identificadores extensos na tabela principal,
 * preservando prefixo e sufixo para correlação visual sem expor strings completas na listagem.
 */
export function maskSensitiveIdentifier(
  value: string | undefined | null,
  prefixLength = 8,
  suffixLength = 6
): string {
  if (!value || typeof value !== 'string') return '—';
  const trimmed = value.trim();
  if (trimmed.length <= prefixLength + suffixLength + 3) {
    return trimmed;
  }
  return `${trimmed.slice(0, prefixLength)}…${trimmed.slice(-suffixLength)}`;
}

/**
 * Higieniza metadados para exibição somente leitura no inspetor técnico,
 * ocultando qualquer possível segredo, token ou dado pessoal sensível.
 */
export function sanitizeMetadataForAudit(
  metadata?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED_SENSITIVE_FIELD]';
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitized[key] = sanitizeMetadataForAudit(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Verifica se uma string corresponde a um digest SHA-256 real de 64 caracteres hexadecimais.
 */
export function isRealSha256Hex(hash: unknown): hash is string {
  if (typeof hash !== 'string') return false;
  return /^[0-9a-f]{64}$/i.test(hash.trim());
}

/**
 * Reproduz de forma determinística o checksum legado de 32 bits (`0x...7f8e9a2b...`)
 * usado pelo `ledgerService` antes/em paralelo ao protocolo `v1-canonical-sha256`.
 */
export function computeLegacySimulatedHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `0x${hex}7f8e9a2b${hex}`;
}

/**
 * Verifica se o `entryHash` legado (`0x...7f8e9a2b...`) corresponde aos campos da entrada,
 * considerando as 3 origens históricas do `ledgerService` (atômica padrão, seed inicial e gênesis).
 */
export function verifyLegacyEntryChecksum(entry: LedgerEntry): LegacyChecksumStatus {
  if (!entry || typeof entry.entryHash !== 'string') {
    return 'NOT_APPLICABLE';
  }
  const stored = entry.entryHash.trim();
  if (!stored.startsWith('0x') || !stored.includes('7f8e9a2b')) {
    return 'NOT_APPLICABLE';
  }

  if (entry.id === 'ledg_genesis_001') {
    const expectedGenesis = computeLegacySimulatedHash('genesis_entry_jobs_2026');
    return stored === expectedGenesis ? 'LEGACY_MATCH' : 'LEGACY_MISMATCH';
  }

  const amountCents =
    typeof entry.amountCents === 'number' && Number.isFinite(entry.amountCents)
      ? Math.round(entry.amountCents)
      : Math.round(entry.amount * (entry.currency === 'BRL' ? 100 : 1));
  const normalizedAmount =
    entry.currency === 'BRL' ? Number((amountCents / 100).toFixed(2)) : amountCents;

  // 1. Assinatura atômica padrão (_postTransactionAtomicDirect)
  const standardSign = `${entry.id}:${entry.idempotencyKey}:${entry.timestamp}:${normalizedAmount}:${entry.currency}:${entry.previousHash}`;
  if (stored === computeLegacySimulatedHash(standardSign)) {
    return 'LEGACY_MATCH';
  }

  // 2. Assinatura com entry.amount direto (caso de formatação numérica pré-existente)
  const directAmountSign = `${entry.id}:${entry.idempotencyKey}:${entry.timestamp}:${entry.amount}:${entry.currency}:${entry.previousHash}`;
  if (stored === computeLegacySimulatedHash(directAmountSign)) {
    return 'LEGACY_MATCH';
  }

  // 3. Assinatura de seed histórico (ensureInitialLiveAuditEntries usa baseIdemp sem sufixo _spend/_creator/_plat)
  const baseIdemp = entry.idempotencyKey.replace(/_(spend|creator|plat)$/, '');
  if (baseIdemp !== entry.idempotencyKey) {
    const seedSign = `${entry.id}:${baseIdemp}:${entry.timestamp}:${entry.amount}:${entry.currency}:${entry.previousHash}`;
    if (stored === computeLegacySimulatedHash(seedSign)) {
      return 'LEGACY_MATCH';
    }
  }

  return 'LEGACY_MISMATCH';
}

/**
 * Valida a presença e integridade estrutural dos campos obrigatórios antes de construir o payload canônico.
 */
export function validateRequiredCanonicalFields(entry: Partial<LedgerEntry> | null | undefined): string[] {
  const errors: string[] = [];
  if (!entry || typeof entry !== 'object') {
    errors.push('Registro de transação nulo ou inválido.');
    return errors;
  }

  if (typeof entry.id !== 'string' || !entry.id.trim()) {
    errors.push('Campo obrigatório "id" ausente ou vazio.');
  }
  if (typeof entry.idempotencyKey !== 'string' || !entry.idempotencyKey.trim()) {
    errors.push('Campo obrigatório "idempotencyKey" ausente ou vazio.');
  }
  if (typeof entry.timestamp !== 'string' || !entry.timestamp.trim() || Number.isNaN(Date.parse(entry.timestamp))) {
    errors.push('Campo obrigatório "timestamp" ausente ou fora do padrão ISO-8601.');
  }
  if (typeof entry.operationType !== 'string' || !VALID_OPERATIONS.has(entry.operationType)) {
    errors.push(`Campo "operationType" inválido ou desconhecido: "${String(entry.operationType)}".`);
  }
  if (typeof entry.debitAccount !== 'string' || !entry.debitAccount.trim()) {
    errors.push('Campo obrigatório "debitAccount" ausente ou vazio.');
  }
  if (typeof entry.creditAccount !== 'string' || !entry.creditAccount.trim()) {
    errors.push('Campo obrigatório "creditAccount" ausente ou vazio.');
  }
  if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount <= 0) {
    errors.push(`Campo obrigatório "amount" inválido (${String(entry.amount)}). Deve ser número finito positivo.`);
  }
  if (
    entry.amountCents !== undefined &&
    (typeof entry.amountCents !== 'number' || !Number.isFinite(entry.amountCents) || entry.amountCents <= 0)
  ) {
    errors.push(`Campo "amountCents" corrompido (${String(entry.amountCents)}).`);
  }
  if (typeof entry.currency !== 'string' || !VALID_CURRENCIES.has(entry.currency)) {
    errors.push(`Campo obrigatório "currency" inválido: "${String(entry.currency)}".`);
  }
  if (typeof entry.status !== 'string' || !VALID_STATUSES.has(entry.status)) {
    errors.push(`Campo obrigatório "status" inválido: "${String(entry.status)}".`);
  }
  if (typeof entry.actorId !== 'string' || !entry.actorId.trim()) {
    errors.push('Campo obrigatório "actorId" ausente ou vazio.');
  }
  if (typeof entry.previousHash !== 'string' || !entry.previousHash.trim()) {
    errors.push('Campo obrigatório "previousHash" ausente ou vazio.');
  }

  return errors;
}

/**
 * Constrói o objeto canônico determinístico para cálculo do SHA-256 (`v1-canonical-sha256`).
 * Normaliza valores monetários e campos opcionais (`null` explícito) para evitar falsos negativos.
 */
export function buildCanonicalLedgerPayload(entry: LedgerEntry): CanonicalLedgerAuditPayload {
  const computedAmountCents =
    typeof entry.amountCents === 'number' && Number.isFinite(entry.amountCents)
      ? Math.round(entry.amountCents)
      : Math.round(entry.amount * (entry.currency === 'BRL' ? 100 : 1));

  const normalizedAmount =
    entry.currency === 'BRL' ? Number((computedAmountCents / 100).toFixed(2)) : computedAmountCents;

  return {
    protocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
    id: entry.id.trim(),
    idempotencyKey: entry.idempotencyKey.trim(),
    transactionId:
      typeof entry.transactionId === 'string' && entry.transactionId.trim()
        ? entry.transactionId.trim()
        : null,
    timestamp: entry.timestamp.trim(),
    operationType: entry.operationType,
    debitAccount: entry.debitAccount.trim(),
    creditAccount: entry.creditAccount.trim(),
    amount: normalizedAmount,
    amountCents: computedAmountCents,
    currency: entry.currency,
    status: entry.status,
    actorId: entry.actorId.trim(),
    targetCreatorId:
      typeof entry.targetCreatorId === 'string' && entry.targetCreatorId.trim()
        ? entry.targetCreatorId.trim()
        : null,
    referenceId:
      typeof entry.referenceId === 'string' && entry.referenceId.trim()
        ? entry.referenceId.trim()
        : null,
    isSandbox: Boolean(entry.isSandbox),
    previousHash: entry.previousHash.trim(),
  };
}

/**
 * Calcula o hash SHA-256 real (64 caracteres hexadecimais em caixa baixa) e retorna também o JSON canônico.
 */
export function calculateLedgerSha256(entry: LedgerEntry): {
  canonicalJson: string;
  sha256Hash: string;
  fieldsIncluded: string[];
} {
  const payload = buildCanonicalLedgerPayload(entry);
  const canonicalJson = canonicalJsonStringify(payload);
  const sha256Hash = sha256(canonicalJson).toLowerCase();
  const fieldsIncluded = Object.keys(payload).sort();

  return {
    canonicalJson,
    sha256Hash,
    fieldsIncluded,
  };
}

/**
 * Extrai o hash de referência SHA-256 de 64 caracteres hexadecimais, quando presente na entrada.
 * Nunca confunde o checksum legado (`0x...7f8e9a2b...`) com um digest SHA-256 real.
 */
export function extractReferenceSha256Hash(entry: LedgerEntry): string | null {
  if (isRealSha256Hex(entry.sha256ReferenceHash)) {
    return entry.sha256ReferenceHash.trim().toLowerCase();
  }
  const metaRef = entry.metadata?.sha256ReferenceHash;
  if (isRealSha256Hex(metaRef)) {
    return metaRef.trim().toLowerCase();
  }
  if (isRealSha256Hex(entry.entryHash)) {
    return entry.entryHash.trim().toLowerCase();
  }
  return null;
}

/**
 * Valida uma única entrada do ledger contra seu hash de referência SHA-256 e o elo `previousHash`.
 * Operação 100% pura e somente leitura.
 */
export function validateLedgerEntrySha256(
  entry: LedgerEntry,
  options?: {
    expectedPreviousHash?: string | null;
    isOldestInChain?: boolean;
  }
): LedgerSha256ValidationResult {
  const environment: 'sandbox' | 'production' =
    entry?.metadata?.environment === 'production' || entry?.isSandbox === false
      ? 'production'
      : 'sandbox';

  const validationErrors = validateRequiredCanonicalFields(entry);
  if (validationErrors.length > 0) {
    return {
      entryId: typeof entry?.id === 'string' && entry.id ? entry.id : 'INVALID_ENTRY_ID',
      status: 'ERROR',
      statusLabel: 'Erro de Dados (ERROR)',
      statusReason: validationErrors.join(' '),
      protocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
      calculatedSha256Hash: null,
      referenceSha256Hash: null,
      storedEntryHash: typeof entry?.entryHash === 'string' ? entry.entryHash : null,
      legacyChecksumStatus: 'NOT_APPLICABLE',
      chainStatus: 'INVALID_PREVIOUS_HASH',
      expectedPreviousHash: options?.expectedPreviousHash ?? null,
      actualPreviousHash: typeof entry?.previousHash === 'string' ? entry.previousHash : null,
      canonicalPayloadJson: null,
      canonicalFieldsIncluded: [],
      errorReasons: validationErrors,
      environment,
    };
  }

  try {
    const { canonicalJson, sha256Hash, fieldsIncluded } = calculateLedgerSha256(entry);
    const referenceSha256 = extractReferenceSha256Hash(entry);
    const legacyChecksumStatus = verifyLegacyEntryChecksum(entry);

    // Avaliação do elo de encadeamento (previousHash)
    let chainStatus: ChainLinkValidationStatus = 'UNVERIFIED_PAGE_BOUNDARY';
    const isGenesis =
      entry.id === 'ledg_genesis_001' ||
      entry.previousHash === '0x0000000000000000' ||
      entry.previousHash === '0x0000000000000000000000000000000000000000000000000000000000000000';

    if (options?.isOldestInChain && isGenesis) {
      chainStatus = 'GENESIS';
    } else if (typeof options?.expectedPreviousHash === 'string' && options.expectedPreviousHash.length > 0) {
      chainStatus =
        entry.previousHash === options.expectedPreviousHash ? 'LINKED' : 'BROKEN';
    } else if (isGenesis && options?.isOldestInChain !== false) {
      chainStatus = 'GENESIS';
    }

    // 1. Se o elo previousHash estiver quebrado em relação à entrada anterior conhecida -> MISMATCH
    if (chainStatus === 'BROKEN') {
      return {
        entryId: entry.id,
        status: 'MISMATCH',
        statusLabel: 'Quebra de Cadeia / Divergência (MISMATCH)',
        statusReason: `Quebra de encadeamento criptográfico: previousHash armazenado (${entry.previousHash}) difere do hash da entrada anterior (${options?.expectedPreviousHash}).`,
        protocolVersion: entry.sha256ProtocolVersion || LEDGER_SHA256_PROTOCOL_VERSION,
        calculatedSha256Hash: sha256Hash,
        referenceSha256Hash: referenceSha256,
        storedEntryHash: entry.entryHash || null,
        legacyChecksumStatus,
        chainStatus,
        expectedPreviousHash: options?.expectedPreviousHash ?? null,
        actualPreviousHash: entry.previousHash,
        canonicalPayloadJson: canonicalJson,
        canonicalFieldsIncluded: fieldsIncluded,
        errorReasons: [],
        environment,
      };
    }

    // 2. Se possui hash de referência SHA-256 real (64 hex), compara diretamente
    if (referenceSha256) {
      const isMatch = sha256Hash === referenceSha256;
      const isLegacyTampered = legacyChecksumStatus === 'LEGACY_MISMATCH';

      if (isMatch && !isLegacyTampered) {
        return {
          entryId: entry.id,
          status: 'VALID',
          statusLabel: 'Válido SHA-256 (VALID)',
          statusReason:
            'O hash SHA-256 calculado (64 hex) coincide exatamente com o hash de referência armazenado e o elo da cadeia está íntegro.',
          protocolVersion: entry.sha256ProtocolVersion || LEDGER_SHA256_PROTOCOL_VERSION,
          calculatedSha256Hash: sha256Hash,
          referenceSha256Hash: referenceSha256,
          storedEntryHash: entry.entryHash || null,
          legacyChecksumStatus,
          chainStatus,
          expectedPreviousHash: options?.expectedPreviousHash ?? null,
          actualPreviousHash: entry.previousHash,
          canonicalPayloadJson: canonicalJson,
          canonicalFieldsIncluded: fieldsIncluded,
          errorReasons: [],
          environment,
        };
      }

      return {
        entryId: entry.id,
        status: 'MISMATCH',
        statusLabel: 'Divergência SHA-256 (MISMATCH)',
        statusReason: !isMatch
          ? 'O hash SHA-256 calculado a partir dos campos atuais diverge do hash de referência SHA-256 armazenado (possível adulteração de payload).'
          : 'O hash SHA-256 coincide, porém o checksum de encadeamento entryHash apresenta divergência.',
        protocolVersion: entry.sha256ProtocolVersion || LEDGER_SHA256_PROTOCOL_VERSION,
        calculatedSha256Hash: sha256Hash,
        referenceSha256Hash: referenceSha256,
        storedEntryHash: entry.entryHash || null,
        legacyChecksumStatus,
        chainStatus,
        expectedPreviousHash: options?.expectedPreviousHash ?? null,
        actualPreviousHash: entry.previousHash,
        canonicalPayloadJson: canonicalJson,
        canonicalFieldsIncluded: fieldsIncluded,
        errorReasons: [],
        environment,
      };
    }

    // 3. Sem referência SHA-256 de 64 hex (registro legado):
    // Se até mesmo o checksum legado (0x...) foi corrompido por adulteração dos campos -> MISMATCH
    if (legacyChecksumStatus === 'LEGACY_MISMATCH') {
      return {
        entryId: entry.id,
        status: 'MISMATCH',
        statusLabel: 'Adulteração Detectada (MISMATCH)',
        statusReason:
          'Registro legado sem referência SHA-256 de 64 hex, mas com divergência confirmada no checksum original entryHash (dados alterados após gravação).',
        protocolVersion: 'legacy-simulated-32bit',
        calculatedSha256Hash: sha256Hash,
        referenceSha256Hash: null,
        storedEntryHash: entry.entryHash || null,
        legacyChecksumStatus,
        chainStatus,
        expectedPreviousHash: options?.expectedPreviousHash ?? null,
        actualPreviousHash: entry.previousHash,
        canonicalPayloadJson: canonicalJson,
        canonicalFieldsIncluded: fieldsIncluded,
        errorReasons: [],
        environment,
      };
    }

    // 4. Registro legado íntegro no checksum antigo, mas ausente de referência SHA-256 de 64 hex -> UNAVAILABLE
    // Regra Fase 4: "Nunca converta ausência de referência em status válido."
    return {
      entryId: entry.id,
      status: 'UNAVAILABLE',
      statusLabel: 'Sem Referência SHA-256 (UNAVAILABLE)',
      statusReason:
        'Transação pré-migração sem hash de referência SHA-256 de 64 caracteres hexadecimais. O hash SHA-256 canônico foi calculado para inspeção, mas a ausência de referência não é convertida em status VALID.',
      protocolVersion: 'legacy-simulated-32bit',
      calculatedSha256Hash: sha256Hash,
      referenceSha256Hash: null,
      storedEntryHash: entry.entryHash || null,
      legacyChecksumStatus,
      chainStatus,
      expectedPreviousHash: options?.expectedPreviousHash ?? null,
      actualPreviousHash: entry.previousHash,
      canonicalPayloadJson: canonicalJson,
      canonicalFieldsIncluded: fieldsIncluded,
      errorReasons: [],
      environment,
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    return {
      entryId: entry?.id || 'UNKNOWN_ID',
      status: 'ERROR',
      statusLabel: 'Falha de Cálculo (ERROR)',
      statusReason: `Exceção durante a serialização ou cálculo SHA-256: ${message}`,
      protocolVersion: LEDGER_SHA256_PROTOCOL_VERSION,
      calculatedSha256Hash: null,
      referenceSha256Hash: null,
      storedEntryHash: entry?.entryHash || null,
      legacyChecksumStatus: 'NOT_APPLICABLE',
      chainStatus: 'INVALID_PREVIOUS_HASH',
      expectedPreviousHash: options?.expectedPreviousHash ?? null,
      actualPreviousHash: entry?.previousHash || null,
      canonicalPayloadJson: null,
      canonicalFieldsIncluded: [],
      errorReasons: [message],
      environment,
    };
  }
}

/**
 * Valida um lote de entradas do ledger (ordenadas da mais recente para a mais antiga, padrão do `ledgerService`),
 * verificando também o encadeamento `previousHash` contra o mapa completo ou adjacente da cadeia.
 */
export function validateLedgerBatchSha256(
  entriesNewestFirst: LedgerEntry[],
  fullChainEntriesNewestFirst?: LedgerEntry[]
): LedgerSha256BatchValidationSummary {
  const resultsById: Record<string, LedgerSha256ValidationResult> = {};
  const orderedResults: LedgerSha256ValidationResult[] = [];

  // Mapa opcional de id -> { expectedPreviousHash, isOldestInChain } construído a partir da cadeia completa
  const chainContextById = new Map<
    string,
    { expectedPreviousHash: string | null; isOldestInChain: boolean }
  >();

  const referenceChain = fullChainEntriesNewestFirst || entriesNewestFirst;
  for (let i = 0; i < referenceChain.length; i++) {
    const current = referenceChain[i];
    const olderNeighbor = i + 1 < referenceChain.length ? referenceChain[i + 1] : null;
    if (current && typeof current.id === 'string') {
      chainContextById.set(current.id, {
        expectedPreviousHash: olderNeighbor ? olderNeighbor.entryHash : null,
        isOldestInChain: olderNeighbor === null && Boolean(fullChainEntriesNewestFirst),
      });
    }
  }

  let valid = 0;
  let mismatch = 0;
  let unavailable = 0;
  let error = 0;
  let brokenChainLinks = 0;

  for (let i = 0; i < entriesNewestFirst.length; i++) {
    const entry = entriesNewestFirst[i];
    const context =
      entry && typeof entry.id === 'string' ? chainContextById.get(entry.id) : undefined;

    const result = validateLedgerEntrySha256(entry, {
      expectedPreviousHash: context?.expectedPreviousHash ?? null,
      isOldestInChain: context?.isOldestInChain ?? false,
    });

    if (entry?.id) {
      resultsById[entry.id] = result;
    }
    orderedResults.push(result);

    if (result.status === 'VALID') valid++;
    else if (result.status === 'MISMATCH') mismatch++;
    else if (result.status === 'UNAVAILABLE') unavailable++;
    else error++;

    if (result.chainStatus === 'BROKEN') {
      brokenChainLinks++;
    }
  }

  return {
    resultsById,
    orderedResults,
    counts: {
      total: entriesNewestFirst.length,
      valid,
      mismatch,
      unavailable,
      error,
      brokenChainLinks,
    },
  };
}
