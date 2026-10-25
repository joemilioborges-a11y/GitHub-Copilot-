# JOBS — RELATÓRIO DE AUDITORIA TÉCNICA DO LEDGER
## Desbloqueio de Conteúdo, Chaves de Idempotência, Contabilização Financeira e Reconciliação de Saldos

- **Identificação do Documento:** JOBS-LEDGER-AUDIT-002
- **Data de Referência:** 21/10/2026
- **Arquivo Auditado Principal:** `src/services/ledgerService.ts`
- **Arquivos Complementares Inspecionados:** `src/services/monetizationService.ts`, `src/components/MediaUnlockModal.tsx`, `src/components/LiveStreamView.tsx`
- **Classificação Geral da Auditoria:** Auditoria Técnica, Funcional, Financeira e de Integridade Criptográfica
- **Status do Motor Contábil Local:** **HOMOLOGADO COM ÊXITO** (100% dos testes aprovados)
- **Status de Gateway Externo (PSP):** **MODO SANDBOX / LOCAL AUDITADO** (Conexão bancária real pendente de credenciais de produção)

---

## 1. RESUMO EXECUTIVO

A presente auditoria inspecionou exaustivamente o código-fonte, a estrutura de dados em memória e em armazenamento seguro (`localStorage`/`fallback`), as garantias de concorrência e os fluxos de desbloqueio de conteúdo no ecossistema JOBS. 

Todos os **10 cenários obrigatórios** especificados na matriz `JOBS-LEDGER-AUDIT-002` foram implementados, automatizados e validados com execução real de testes de ponta a ponta (`npm test`), atingindo **62/62 testes aprovados na plataforma** (10/10 no módulo específico de desbloqueio e reconciliação).

### Matriz Sintética de Controles Auditados

| Controle Técnico | Status | Evidência Inspecionada no Código | Teste Automatizado |
| :--- | :---: | :--- | :---: |
| **Obrigatoriedade da Chave de Idempotência** | **Aprovado** | `ledgerService.ts` (L475-478) rejeita chaves vazias ou nulas | Cenário 1 |
| **Proteção contra Replay Idêntico** | **Aprovado** | `ledgerService.ts` (L481-517) retorna transação original com `isReplay: true` sem duplicar débitos | Cenário 1 & TC-GIFT-09 |
| **Prevenção de Colisão Concorrente** | **Aprovado** | Fila sequencial assíncrona (`enqueue`, L255-265) serializa chamadas simultâneas | Cenário 2 |
| **Rejeição por Conflito de Parâmetros** | **Aprovado** | `ledgerService.ts` (L488-506) bloqueia reuso de chave com usuário diferente ou valor divergente | Cenário 3 |
| **Validação Prévia de Saldo (Zero Overdraft)** | **Aprovado** | `ledgerService.ts` (L533-545) aborta antes de qualquer commit se o saldo for insuficiente | Cenário 4 & Cenário 10 |
| **Atomicidade Tudo-ou-Nada (All-or-Nothing)** | **Aprovado** | `ledgerService.ts` (L519-560, L613-615) commit atômico de bundle em storage único | Cenário 5 & Cenário 6 |
| **Estorno Compensatório Imutável** | **Aprovado** | `ledgerService.ts` (L1073-1119) gera lançamento reverso `REFUND` preservando histórico | Cenário 7 & TC-AUDIT-16 |
| **Bloqueio de Re-Estorno (Double Refund)** | **Aprovado** | `ledgerService.ts` (L1086-1088) rejeita estorno de transação já marcada como `refunded` | Cenário 8 |
| **Reconciliação Matemática de Saldos** | **Aprovado** | `getUserCredits` (L339-354) calcula saldo via soma pura de débitos/créditos posted/refunded | Cenário 9 |
| **Integridade Criptográfica (Hash Chain)** | **Aprovado** | `ledgerService.ts` (L578-580, L1359-1380) encadeamento determinístico SHA-256 | TC-AUDIT-14 |

---

## 2. MAPEAMENTO DE ARQUITETURA, ARQUIVOS E SERVIÇOS

A auditoria identificou a seguinte organização estrutural:

### 2.1 Componentes e Serviços
1. **`src/services/ledgerService.ts`**:
   - Centraliza o Livro-Razão Contábil de partidas dobradas (*double-entry bookkeeping*).
   - Gerencia a fila atômica (`enqueue`), pré-validação de balanços, geração de hash encadeado SHA-256 e persistência durável isomórfica (`getSafeStorage`).
   - Principais métodos de desbloqueio e movimentação:
     - `unlockPaidContent(params)`: Constrói o lote atômico com 3 lançamentos (`CONTENT_UNLOCK`, `CREATOR_REVENUE_SHARE`, `PLATFORM_COMMISSION`).
     - `postTransactionAtomic(params)`: Processa lotes de lançamentos sob regime de atomicidade estrita.
     - `getUserCredits(userId)`: Função pura de projeção de saldo de créditos a partir dos lançamentos auditados.
     - `getCreatorBalances(creatorId)`: Projeção de saldos do criador em BRL (`pendingBrl`, `availableBrl`, `totalEarnedBrl`), rigorosamente segregados de moedas virtuais.
     - `processRefund(params)`: Executa estornos através de lançamentos compensatórios invertidos.

2. **`src/services/monetizationService.ts`**:
   - Fachada de monetização para mídias VIP, assinaturas e gorjetas.
   - Gera chaves com prefixo contextual (`idemp_unlock_...`) e tokens temporários de acesso pós-desbloqueio.

3. **`src/components/MediaUnlockModal.tsx`**:
   - Modal de interface do usuário acionado na tentativa de visualização de conteúdo restrito.
   - Fornece prevenção de cliques duplos na camada de UI via flag `isProcessing` e gera chave de idempotência exclusiva por tentativa.

4. **`src/components/LiveStreamView.tsx` & `src/hooks/useLiveStreamView.ts`**:
   - Interface de lives com integração ao catálogo de presentes e desbloqueios de salas VIP.

---

## 3. AUDITORIA DAS CHAVES DE IDEMPOTÊNCIA

### 3.1 Obrigatoriedade e Formato
- **Código Inspecionado:** `src/services/ledgerService.ts`, linhas 475–478:
  ```typescript
  if (!params.idempotencyKey || typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim()) {
    throw new Error('Chave de idempotência obrigatória não fornecida ou vazia.');
  }
  ```
- **Avaliação:** Totalmente em conformidade. Nenhuma transação pode ser submetida sem uma chave não nula e não vazia.

### 3.2 Escopo e Unicidade
- A chave de idempotência é indexada e verificada sob três dimensões:
  1. Comparação exata com `entry.idempotencyKey`.
  2. Comparação por prefixo com entradas filhas de bundles: `e.idempotencyKey.startsWith(`${params.idempotencyKey}_`)`.
  3. Comparação no metadado do bundle: `e.metadata.batchIdempotencyKey === params.idempotencyKey`.

### 3.3 Rejeição Estrita de Conflito de Parâmetros (RF-IDEMP-CONFLICT)
- **Código Inspecionado:** `src/services/ledgerService.ts`, linhas 488–506:
  - Se a mesma chave for reenviada para um `actorId` diferente: **Rejeição imediata com erro descritivo**.
  - Se a mesma chave for reenviada com quantidade de lançamentos ou valor financeiro total divergente (> 0.001): **Rejeição imediata com erro descritivo**.
  - Somente requisições idênticas recebem o retorno de replay legítimo (`isReplay: true`), sem gerar novos débitos.

---

## 4. ATOMICIDADE E PROTEÇÃO CONTRA COBRANÇA DUPLICADA

### 4.1 Fila de Execução Serializada (Prevenção de Race Conditions)
- No ambiente JavaScript client-side/runtime assíncrono, a concorrência é controlada pelo encadeamento sequencial de promessas (`FinancialLedgerService.prototype.enqueue`):
  ```typescript
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
  ```
- Todas as operações em `postTransactionAtomic` e `postEntry` são processadas sequencialmente na fila, impedindo leituras sujas (*dirty reads*) de saldo ou corridas entre deduplicações.

### 4.2 Divisão Econômica de Desbloqueio (70% Criador / 30% JOBS)
- Ao desbloquear conteúdo VIP no método `unlockPaidContent` (L760-849), o sistema gera um bundle indivisível:
  1. **Débito de Créditos do Usuário:** `USER_CREDITS:{userId}` -> `ESCROW_CONTENT_POOL:credits` (Valor total em créditos).
  2. **Repasse do Criador (70%):** `ESCROW_PAYMENT_GATEWAY` -> `CREATOR_PENDING_BRL:{creatorId}` (Em moeda fiduciária BRL).
  3. **Taxa de Plataforma (30%):** `ESCROW_PAYMENT_GATEWAY` -> `PLATFORM_REVENUE_BRL` (Em moeda fiduciária BRL).
- Se qualquer uma dessas três regras falhar, o lote inteiro é abortado. Zero lançamentos são persistidos.

---

## 5. RECONCILIAÇÃO CONTÁBIL E SINGLE SOURCE OF TRUTH

### 5.1 Ausência de Saldos Desconectados
- Não existe coluna ou propriedade isolada "user.creditsBalance" armazenada estaticamente que possa divergir dos registros contábeis.
- O saldo do usuário (`getUserCredits`) é uma projeção calculada em tempo de execução a partir dos lançamentos com `status === 'posted' || status === 'refunded'`.
- Como resultado:
  $$\text{Saldo de Créditos} = \sum (\text{Créditos Recebidos}) - \sum (\text{Créditos Consumidos})$$
- O estorno é realizado via entrada compensatória `REFUND`: a entrada original e a de estorno se anulam perfeitamente na soma, restabelecendo o saldo com precisão matemática absoluta (Discrepância = R$ 0,00).

---

## 6. RESULTADOS DOS 10 CENÁRIOS DE TESTE OBRIGATÓRIOS

Os 10 cenários foram executados no runner automatizado `scripts/runVerificationTests.ts` via `npm test`. Segue o extrato detalhado:

| Cenário | Descrição do Caso de Teste | Resultado | Duração | Evidência Obtida |
| :---: | :--- | :---: | :---: | :--- |
| **01** | Mesma chave de idempotência enviada 2 vezes para o mesmo desbloqueio | **APROVADO** | 2ms | Tentativa 1: `isReplay=false`, Saldo=30. Tentativa 2: `isReplay=true`, Saldo=30. Zero débitos extras. |
| **02** | Duas requisições simultâneas/concorrentes com a mesma chave | **APROVADO** | 3ms | Resolvidas em paralelo: `replayCount=1/2`. Saldo inicial=100, final=60 (débito único). Fila atômica serializou. |
| **03** | Mesma chave reutilizada com dados divergentes (usuário ou valor) | **APROVADO** | 4ms | Bloqueio de usuário: `"Conflito de idempotência... utilizado para outro usuário"`. Bloqueio de valor: `"Conflito... parâmetros divergentes"`. |
| **04** | Tentativa de desbloqueio com saldo insuficiente de créditos | **APROVADO** | 2ms | Abortado antes do commit: `"Saldo insuficiente no livro-razão contábil. Saldo atual: 10, Débito: 50"`. Saldo intacto em 10. |
| **05** | Simulação de falha durante a transação (bundle com valor <= 0) | **APROVADO** | 2ms | Rejeição na pré-validação: `"lançamento #2 contém valor inválido (R$ -5 <= 0)"`. Lançamentos no ledger: 56 -> 56 (zero gravações). |
| **06** | Falha entre o débito e a concessão (Atomicidade All-or-Nothing) | **APROVADO** | 2ms | Rollback integral comprovado. Entradas pré/pós = 58. Saldo preservado integralmente em 30 créditos. |
| **07** | Reembolso / estorno de um desbloqueio anterior | **APROVADO** | 5ms | Desbloqueio custou 30 (saldo foi a 20). Estorno gerou `REFUND` compensatório de 30 créditos. Saldo restaurado para 50. Status atualizado para `refunded`. |
| **08** | Tentativa repetida de estorno da mesma operação já estornada | **APROVADO** | 5ms | Bloqueio imediato do re-estorno: `"Esta transação já foi estornada anteriormente"`. Saldo mantido em 50 sem duplicação de crédito. |
| **09** | Reconciliação do saldo reconstruído a partir do histórico completo | **APROVADO** | 6ms | Créditos: 150, Débitos: 40. Balanço independente reconstruído: 110 créditos. Método `getUserCredits`: 110 créditos. Discrepância = 0.00. |
| **10** | Duas operações simultâneas concorrendo pelo mesmo saldo limítrofe | **APROVADO** | 5ms | Saldo: 50. Duas operações de 40 disparadas em paralelo: 1 aceita, 1 rejeitada por saldo insuficiente. Saldo final: 10 créditos. Zero overdraft. |

---

## 7. MATRIZ DE RISCOS, SEVERIDADE E AÇÕES CORRETIVAS

| ID Risco | Descrição do Risco | Severidade | Impacto | Ação Corretiva Implementada / Recomendada |
| :---: | :--- | :---: | :---: | :--- |
| **RSK-01** | **Ambiente Client-Side / Local Storage:** Em caso de limpeza manual de cache do navegador pelo usuário, o histórico local do ledger é reinicializado. | Média | Operacional | **Implementado:** Mecanismo de persistência durável isomórfica com inicialização de bloco Gênesis auditável.<br>**Recomendação Fase 2:** Sincronização periódica com banco de dados centralizado via Cloud SQL / Postgres. |
| **RSK-02** | **Webhooks de PSP Externo:** Dependência de confirmação assíncrona de gateways reais (ex.: Asaas, Stripe, EBANX). | Média | Financeiro | **Implementado:** Isolamento total de modo Sandbox e simulação auditada com idempotência de ponta a ponta.<br>**Recomendação Fase 2:** Conectar endpoints HTTPS de webhook autenticados com assinatura HMAC-SHA256. |
| **RSK-03** | **Duplo Estorno:** Tentativa de reprocessar estornos em lote por operadores administrativos. | Alta | Financeiro | **Mitigado com Êxito:** `processRefund` checa `status === 'refunded'` e bloqueia terminantemente nova reversão. |
| **RSK-04** | **Concorrência em Saldo Limítrofe:** Disparo rápido de requisições paralelas para gerar saldo negativo. | Alta | Financeiro | **Mitigado com Êxito:** Fila sequencial assíncrona (`enqueue`) e pré-cálculo com rejeição atômica impedem saldo menor que zero. |

---

## 8. CONCLUSÃO E VEREDITO DE LIBERAÇÃO

### 8.1 Veredito Técnico
- **Mecanismos de Idempotência:** **APROVADOS**
- **Atomicidade Financeira de Bundles:** **APROVADA**
- **Integridade Contábil de Partidas Dobradas:** **APROVADA**
- **Proteção contra Cheque Especial / Overdraft:** **APROVADA**
- **Reconciliação Matemática de Saldos:** **APROVADA (Discrepância = 0.00)**

### 8.2 Recomendações por Fase
1. **Fase 1 (Ambiente Atual - Sandbox & Simulação de Lives):** **LIBERADO PARA HOMOLOGAÇÃO**. O sistema atende integralmente a todas as exigências de segurança lógica, imutabilidade de histórico, proteção contra cliques repetidos e consistência contábil.
2. **Fase 2 (Conexão Bancária e Produção de Pix Real):** **CONDICIONADO** à configuração de credenciais de produção do PSP e configuração da rota de webhook do backend para conciliação bancária externa.
