# JOBS — Visualizador de Logs de Auditoria SHA-256 (Fase 1 + Plano de Implementação)

Adição de um visualizador de auditoria criptográfica de baixo nível ao painel administrativo central (`CentralAdminDashboardModal`), consumindo o histórico do `ledgerService` de forma estritamente somente leitura e realizando validação determinística SHA-256 (FIPS 180-4) com verificação de encadeamento (`previousHash`).

## User Review & Critical Decisions

> [!IMPORTANT]
> **Descoberta Crítica na Fase 1 (Auditoria Criptográfica do Ledger)**:
> A inspeção real do repositório revelou que os registros atuais do `ledgerService` armazenam em `entryHash` o resultado de `computeSha256Simulated(input)` — um checksum bitwise de 32 bits no formato `0x<8hex>7f8e9a2b<8hex>` (26 caracteres), e **não** um digest SHA-256 real de 64 caracteres hexadecimais. Paralelamente, o repositório já possui uma implementação pura e determinística de **SHA-256 real (FIPS 180-4, 64 hex)** e **serialização JSON canônica** (`canonicalJsonStringify` + `sha256` em `cryptoAudit`).
>
> Para cumprir rigorosamente a Fase 4 (*"Nunca converta ausência de referência em status válido"* e *"Se os dados existentes ainda não tiverem hash de referência, documente isso claramente e implemente compatibilidade incremental sem alterar silenciosamente registros históricos"*):
> - **Registros Legados / Pré-existentes (apenas `0x...7f8e9a2b...`)**: Serão classificados honestamente como **`UNAVAILABLE`** (Ausente de Referência SHA-256 de 64 hex) para a validação SHA-256 real, exibindo o hash SHA-256 canônico recém-calculado para inspeção técnica e informando separadamente a integridade do checksum legado (`0x...`) e do encadeamento `previousHash`. Nenhum registro histórico será reescrito silenciosamente.
> - **Novas Transações Atômicas (Compatibilidade Incremental)**: Passarão a gravar também `sha256ReferenceHash` (64 hex reais calculados sobre o payload canônico `v1-canonical-sha256`), mantendo `entryHash` intacto para 100% de retrocompatibilidade com os testes existentes. Essas entradas terão validação **`VALID`** (ou **`MISMATCH`** se adulteradas).

- **Decisão Confirmada 1 — Protocolo Canônico `v1-canonical-sha256`**: Ordenação lexicográfica determinística de chaves via `canonicalJsonStringify` sobre os campos imutáveis da entrada contábil (`id`, `idempotencyKey`, `transactionId`, `timestamp`, `operationType`, `debitAccount`, `creditAccount`, `amountCents`, `currency`, `status`, `actorId`, `targetCreatorId`, `referenceId`, `isSandbox`, `previousHash`), excluindo os próprios campos de assinatura (`entryHash`, `sha256ReferenceHash`, `sha256ProtocolVersion`).
- **Decisão Confirmada 2 — Zero Mutação e Zero Dependências Externas**: O visualizador opera em modo estritamente somente leitura sobre `financialLedger.queryLedger()`, reutilizando o motor criptográfico existente do projeto e `lucide-react`.

---

## Fase 1 — Inventário da Auditoria do Código (Concluída sem Alteração de Arquivos)

1. **Localização e Estrutura do `CentralAdminDashboardModal`**:
   - **Evidência**: Componente principal do painel administrativo com 9 seções modulares. A Seção 9 (`activeSection === 'security'`) possui sub-abas controladas pelo estado `securitySubTab` (`'admin_activity' | 'crypto_ledger' | 'events'`), renderizando atualmente `AdminActivityLog`, `AuditLedgerReport` e a matriz de eventos/RBAC.
   - **Integração Mínima**: Adição da sub-aba `'sha256_audit_viewer'` (*"Logs SHA-256 (Baixo Nível)"*) na Seção 9 (`security`).
2. **Consulta ao Histórico no `ledgerService`**:
   - **Evidência**: O singleton `financialLedger` (`FinancialLedgerService`) expõe `queryLedger(params: LedgerQueryParams): LedgerQueryResult` (suportando paginação `page`/`pageSize`, filtros por `search`, `operationType`, `status`, `currency`, `actorId`, `targetCreatorId`, `startDate`, `endDate`, `idempotencyKey`), além de `getAllEntriesRaw()`, `verifyChainIntegrity()` e `subscribe(listener)`.
3. **Modelos Reais de Transação, Estados, Datas, Valores e Identificadores**:
   - **Modelo (`LedgerEntry`)**:
     - Identificadores: `id` (`string`, ex.: `ledg_...`), `idempotencyKey` (`string`), `transactionId?` (`string`), `referenceId?` (`string`), `actorId` (`string`), `targetCreatorId?` (`string`).
     - Data/Hora: `timestamp` (`string` ISO-8601 UTC).
     - Tipo de Operação (`LedgerOperationType`): `'credit_purchase' | 'gift_send' | 'paid_chat_message' | 'content_unlock' | 'live_ticket_purchase' | 'live_pass_purchase' | 'platform_commission' | 'creator_earning_credit' | 'withdrawal_request' | 'withdrawal_settlement' | 'withdrawal_reversal' | 'refund_credit' | 'manual_adjustment' | 'initial_migration'`.
     - Contas de Partida Dobrada (`LedgerAccountCode`): `USER_WALLET_CREDITS`, `CREATOR_AVAILABLE_BRL`, `CREATOR_PENDING_BRL`, `PLATFORM_REVENUE_BRL`, `PLATFORM_TREASURY_CREDITS`, `EXTERNAL_PAYMENT_GATEWAY`, `WITHDRAWAL_ESCROW_BRL`, `SYSTEM_ADJUSTMENT_EQUITY`.
     - Valores e Moeda: `amount` (`number`), `amountCents?` (`number` inteiro em centavos/unidades mínimas), `currency` (`'CREDITS' | 'BRL'`).
     - Status Contábil (`LedgerEntryStatus`): `'posted' | 'pending' | 'voided' | 'refunded'`.
     - Ambiente: `isSandbox` (`boolean` — distingue `sandbox` de `production`), mais `metadata?.environment`.
4. **Hashes Existentes, Referência e Encadeamento Criptográfico**:
   - Cada `LedgerEntry` possui `previousHash` (`string`) e `entryHash` (`string`).
   - O `entryHash` atual é gerado por `computeSha256Simulated(input)` (`0x${hex}7f8e9a2b${hex}` — checksum simulado de 32 bits, 26 caracteres).
   - O projeto já dispõe de SHA-256 real (FIPS 180-4, 64 caracteres hexadecimais minúsculos) e `canonicalJsonStringify` no utilitário de auditoria criptográfica (`cryptoAudit`), atualmente usado pelo `adminAuditService`.
5. **Onde e Quando os Hashes são Criados e Armazenados**:
   - Criados no momento da gravação em `_postTransactionAtomicDirect` (`ledgerService`), na entrada gênesis (`createGenesisEntry`) e nas entradas de seed (`ensureInitialLiveAuditEntries`).
   - Persistidos no `localStorage` sob a chave `jobs_financial_ledger_entries_v1` (com fallback em memória `memoryStorageFallback`).
6. **Persistência, Permissões Administrativas e Testes Existentes**:
   - **Persistência**: `localStorage` (`jobs_financial_ledger_entries_v1` para o ledger financeiro; `jobs_admin_audit_logs_v2` para logs administrativos).
   - **Permissões**: O `CentralAdminDashboardModal` opera sob perfil administrativo e registra sessões via `adminAuditService` (papéis `'admin' | 'auditor' | 'security' | 'master'`). O novo visualizador validará explicitamente a permissão de leitura do operador antes de exibir payloads sensíveis.
   - **Testes Existentes**: Suite executada via `npm test` (`tsx scripts/runVerificationTests.ts`), cobrindo `ledgerService.test.ts`, `ledgerContentUnlockAudit.test.ts`, `adminAuditService.test.ts` e `revenueSimulatorService.test.ts`.
7. **Componentes de Tabela, Filtros e Paginação Disponíveis**:
   - `AuditLedgerReport` e `AdminActivityLog` já estabelecem o padrão visual dark-first (`bg-[#0B0F17]`, bordas `border-white/10`, fontes mono para hashes/IDs, paginação controlada e modal de inspeção técnica).

---

## 1. Overview & Core Concept

- **What It Does**: Fornece uma bancada de inspeção criptográfica de baixo nível para auditar cada lançamento do `ledgerService`, recalculando determinísticamente o hash SHA-256 (64 hex) sobre o payload canônico da transação, confrontando-o com o hash de referência (`sha256ReferenceHash` / `entryHash`) e validando o elo `previousHash` da cadeia contábil.
- **Target Audience / Persona**: Engenheiros de segurança, auditores financeiros e administradores master do ecossistema JOBS.
- **Key Value**: Elimina falsos positivos de integridade ao separar claramente validações criptográficas reais SHA-256 (`VALID` / `MISMATCH`) de registros legados sem referência SHA-256 de 64 hex (`UNAVAILABLE`) e de registros com dados corrompidos (`ERROR`).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. O administrador acessa **Segurança & Auditoria (Seção 9)** no `CentralAdminDashboardModal` e seleciona a sub-aba **Visualizador SHA-256 (Baixo Nível)**.
  2. No topo, cartões de telemetria exibem os contadores da página/consulta atual: Total Auditado, `VALID` (Íntegro SHA-256), `MISMATCH` (Divergência Criptográfica), `UNAVAILABLE` (Legado sem Referência SHA-256 64-hex), `ERROR` (Payload Inválido) e Status do Elo (`previousHash`).
  3. O operador filtra por período (`startDate` / `endDate`), tipo de operação, status contábil (`posted`, `pending`, `voided`, `refunded`), status de validação SHA-256 (`VALID`, `MISMATCH`, `UNAVAILABLE`, `ERROR`), ambiente (`production` vs `sandbox`) ou busca textual (`id`, `transactionId`, `idempotencyKey`, `actorId`, hash).
  4. Na tabela de logs, cada linha apresenta truncamento seguro com botão de cópia (`Copy`) para IDs e hashes, além de badges semânticos com ícone + texto para acessibilidade.
  5. Ao clicar em **Inspecionar**, abre-se o painel/modal de detalhes técnicos contendo o JSON canônico exato (`canonicalPayload`), o Hash SHA-256 Calculado (64 hex), o Hash SHA-256 de Referência (quando presente), o Checksum Legado (`entryHash`), o `previousHash` esperado vs. armazenado e o diagnóstico completo.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitário forense de alta precisão, coerente com o tema escuro do `CentralAdminDashboardModal`.
  - *Color Palette & Mood*: Superfícies `bg-[#0B0F17]` e `bg-[#111726]`, bordas `border-white/10`, indicadores semânticos acessíveis (`emerald` para `VALID`, `rose` para `MISMATCH`, `amber` para `UNAVAILABLE`, `red/purple` para `ERROR`).
  - *Typography & Hierarchy*: `Inter` para rótulos e controles; `JetBrains Mono` / `font-mono` com `tabular-nums` para valores monetários, timestamps ISO-8601, chaves de idempotência e digests de 64 caracteres.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Compatibilidade Incremental sem Reescrita Silenciosa do Passado**:
  - *Chosen Approach*: Preservar `entryHash` (`0x...`) intacto em todas as entradas e adicionar `sha256ReferenceHash` (64 hex SHA-256 real) + `sha256ProtocolVersion: 'v1-canonical-sha256'` em novas transações gravadas por `_postTransactionAtomicDirect`. Entradas legadas que possuem apenas `0x...` recebem status `UNAVAILABLE` na coluna de validação SHA-256 real (com diagnóstico auxiliar do checksum legado), nunca sendo convertidas artificialmente em `VALID`.
  - *Why*: Cumpre estritamente a regra da Fase 4 (*"Nunca converta ausência de referência em status válido"* e *"sem alterar silenciosamente registros históricos"*), mantendo 100% dos testes legados passando.
- **Decision 2 — Paginação Controlada + Validação Sob Demanda**:
  - *Chosen Approach*: Consumir `financialLedger.queryLedger({ page, pageSize, ... })` com lotes enxutos (ex.: 15 ou 25 registros por página) e validar o lote visível + verificação de elo `previousHash` com memoização determinística.
  - *Why*: Evita bloquear a thread principal ou carregar/re-hashear milhares de entradas desnecessariamente a cada renderização.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CentralAdminDashboardModal (Seção 9)                     │
│  Sub-abas: [AdminActivityLog] | [AuditLedgerReport] | [LedgerSha256Viewer] │
└─────────────────────────────────────────┬──────────────────────────────────┘
                                          │ (Somente Leitura)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        LedgerSha256AuditViewer                             │
│  • Filtros: Período, OperationType, Status Contábil, Status SHA-256,       │
│             Ambiente (Prod/Sandbox), Busca livre (ID / Hash / Idempotency) │
│  • Tabela Paginada com Badges Acessíveis (Ícone + Texto) + Cópia Segura    │
│  • Painel Técnico de Inspeção (Payload Canônico, SHA-256 64-hex, Cadeia)   │
└───────────────────┬─────────────────────────────────────┬──────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────────┐
│     financialLedger (ledgerService)   │ │      ledgerSha256Validator       │
│  • queryLedger(params)                │ │  • buildCanonicalLedgerPayload() │
│  • getEntryById(id)                   │ │  • calculateLedgerSha256()       │
│  • Gravação incremental de            │ │  • validateLedgerEntrySha256()   │
│    sha256ReferenceHash em novas tx    │ │  • validateLedgerBatchSha256()   │
└───────────────────────────────────────┘ └───────────────┬──────────────────┘
                                                          │
                                                          ▼
                                          ┌──────────────────────────────────┐
                                          │     cryptoAudit (FIPS 180-4)     │
                                          │  • canonicalJsonStringify()      │
                                          │  • sha256() -> 64 hex chars      │
                                          └──────────────────────────────────┘
```

### Data Model & Validation States (`LedgerSha256ValidationResult`)

- **`status: 'VALID' | 'MISMATCH' | 'UNAVAILABLE' | 'ERROR'`**:
  - **`VALID`**: O registro possui hash de referência SHA-256 de 64 hex (`sha256ReferenceHash` ou `entryHash` em formato 64-hex), o `calculatedSha256Hash` coincide exatamente com o hash de referência, e o elo `previousHash` (quando o registro anterior está disponível) é íntegro.
  - **`MISMATCH`**: O `calculatedSha256Hash` diverge do hash de referência SHA-256 armazenado, **ou** o checksum legado `entryHash` (`0x...`) foi adulterado em relação aos dados da entrada, **ou** há quebra confirmada no encadeamento `previousHash`.
  - **`UNAVAILABLE`**: Os campos obrigatórios são válidos e o `calculatedSha256Hash` (64 hex) foi calculado com sucesso, porém o registro é legado/pré-migração e não possui `sha256ReferenceHash` (64 hex) para comparação criptográfica SHA-256 (possuindo apenas checksum simulado `0x...` íntegro ou ausente).
  - **`ERROR`**: Campos obrigatórios ausentes/corrompidos (`id` vazio, `timestamp` inválido, `amount` `NaN`/negativo, `currency` inválida) que impedem a construção determinística do payload canônico.

### Interactive Component & State Mapping

- **Verificação de Permissão RBAC**: Valida o papel do operador administrativo (`admin`, `auditor`, `security`, `master`); caso um perfil não autorizado tente renderizar o componente, exibe bloqueio seguro sem consultar nem expor dados do ledger.
- **Mascaramento de Dados Sensíveis**: Chaves de idempotência e metadados potencialmente sensíveis são mascarados por padrão na tabela e higienizados no inspetor técnico (ocultando tokens, chaves privadas ou PII, caso presentes em `metadata`).
- **Suite de Testes Automatizados (Fase 6)**: Cobertura integral dos 12 cenários exigidos (consistência determinística, `VALID`, `MISMATCH` por adulteração de valor/status/timestamp, `UNAVAILABLE` para ausência de referência SHA-256 64-hex, `ERROR` para payload corrompido, quebra de `previousHash`, lista vazia, erro na fonte, filtros/paginação e bloqueio de acesso não autorizado) sem tocar no banco real.
