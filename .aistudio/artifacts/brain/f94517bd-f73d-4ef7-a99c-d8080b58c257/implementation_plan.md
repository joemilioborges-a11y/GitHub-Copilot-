# Plano Incremental de Auditoria, Segurança e Preparação para Produção — JOBS

## 1. Diagnóstico Verificado e Lacunas Identificadas

### 1.1 Estado Técnico Comprovado
* **Build (`npm run build`)**: Aprovado (`vite build` sem erros).
* **Typecheck / Lint (`npm run lint`)**: Aprovado (`tsc --noEmit` sem erros).
* **Suíte de Testes (`npm test`)**: 314 de 314 casos aprovados (`100.0%`).
* **Infraestrutura Firebase**: Configurada via singleton em `src/utils/firebaseConfig.ts` (`projectId: gen-lang-client-0491658347`, database nomeado `ai-studio-jhobs-f94517bd-f73d-4ef7-a99c-d8080b58c257`).

### 1.2 Riscos Críticos e Lacunas que Impedem Produção Hoje
1. **Escrita direta pelo cliente em `/ledger_entries` (`firestore.rules`, linha 226)**:
   * `allow create: if (isAdmin() || isSignedIn()) && isValidLedgerSnapshot(...)` permite que qualquer usuário autenticado insira entradas contábeis arbitrariamente no Firestore.
2. **Autoaprovação de moderação de mídia (`firestore.rules`, linhas 163 e 212–215)**:
   * O criador consegue atualizar `moderationStatus` para `'approved'` diretamente pelo cliente sem intervenção administrativa.
3. **Mistura entre Simulação e Produção no `ledgerService` (`src/services/ledgerService.ts`)**:
   * `seedInitialLedger()` e `ensureInitialLiveAuditEntries()` injetam registros sintéticos (`isSandbox: true`) dentro da mesma chave `jobs_financial_ledger_entries_v1` usada pelas operações reais, sem separação física por namespace ou ambiente (`production` no Firestore vs `simulation` em `localStorage`).
4. **Estorno incompleto em `processRefund` (`src/services/ledgerService.ts`, linhas 1881–1927)**:
   * Reverte apenas uma entrada (`originalEntryId`) por vez, podendo deixar `creator_share` e `platform_share` descasados do `spend` se não for executado em lote atômico por `transactionId`.
5. **Acumulação em ponto flutuante e dupla fonte contábil**:
   * `getCreatorBalances` e `getPlatformFinancialSummary` acumulam `entry.amount` em float ao invés de calcular exclusivamente a partir de inteiros (`amountCents`) e derivar unidades na borda. Além disso, `monetizationService.ts` mantém um livro-razão paralelo (`jobs_fase1_wallet_ledger_v1`) que deve ser reconciliado com `ledgerService`.

---

## 2. Arquitetura Proposta e Isolamento de Ambientes

* **Gerenciador Central de Ambiente (`src/services/runtimeEnvironmentService.ts`)**:
  * Define explicitamente o modo de execução: `'production'` (padrão para todos os usuários) ou `'simulation'` (habilitado apenas por administradores autenticados no Painel Admin ou via flag explícita `VITE_JOBS_SIMULATION_ENABLED`).
  * Em modo `'production'`, **nenhuma semente fictícia (`seedInitialLedger`, perfis demo ou transações simuladas)** é carregada ou misturada aos saldos reais, e os registros contábeis/perfis auditados sincronizam com o Firestore.
  * Em modo `'simulation'`, todas as chaves de `localStorage` utilizam o prefixo isolado `jobs_sim_sandbox_*` e exibem um banner fixo de **Ambiente de Simulação / Sandbox Admin** no topo da interface.

---

## 3. Fases de Implementação e Arquivos Afetados

### Fase 1: Isolamento Estrito entre Simulação e Produção + Controle Admin
* **Novo arquivo**: `src/services/runtimeEnvironmentService.ts`
  * Controla o modo ativo (`production` vs `simulation`), valida permissão administrativa para ativar o modo de simulação, provê helper de namespace para `localStorage` (`getScopedStorageKey`) e bloqueia execução de seeds fictícios em produção.
* **Arquivo modificado**: `src/App.tsx`
  * Exibe banner global de alerta sempre que o modo `simulation` estiver ativo para o administrador e restringe os simuladores (`VR 30 Dias`, `Simulador de Receita 70/20/10`, `Simulador de Saques`) exclusivamente ao escopo administrativo de simulação.

### Fase 2: Endurecimento de Segurança no Firestore (`firestore.rules`)
* **Arquivo modificado**: `firestore.rules`
  * **Coleção `/ledger_entries/{entryId}`**: Remover `isSignedIn()` da regra `allow create`; restringir criação de snapshots de auditoria contábil exclusivamente a operadores autorizados (`isAdmin()`) com validação de hash SHA-256 (`sha256ReferenceHash`) e `serverTimestamp()`.
  * **Coleção `/media_items/{mediaId}`**: Na criação (`allow create`), exigir `request.resource.data.moderationStatus == 'pending'`. Na atualização pelo criador (`isOwner`), exigir que `moderationStatus` permaneça inalterado ou volte para `'pending'`, reservando `'approved'` e `'rejected'` exclusivamente para `isAdmin()`.
  * **Coleção `/users/{userId}`**: Garantir validação estrita de tamanho e campos públicos sem vazamento de PII ou localização exata.

### Fase 3: Endurecimento Contábil do `ledgerService` e Unificação com `monetizationService`
* **Arquivo modificado**: `src/services/ledgerService.ts`
  * **Segregação Física de Storage**: Separar completamente o armazenamento de `simulation` (`jobs_sim_sandbox_ledger_entries_v1`) do armazenamento de `production` (`jobs_prod_ledger_entries_v1` + sincronização de snapshots auditáveis no Firestore em `/ledger_entries`). Desativar `seedInitialLedger()` no modo `production`.
  * **Estorno Atômico Multi-Pernas (`processTransactionRefundAtomic`)**: Refatorar `processRefund` para localizar todas as pernas vinculadas ao mesmo `transactionId` (`spend`, `creator_share`, `platform_share`, `platform_reserve`) e gerar entradas compensatórias (`refund` e reversões proporcionais) em um único lote atômico idempotente, impedindo saldo negativo de criador sem registro de débito pendente.
  * **Aritmética Estrita em Centavos (`amountCents`)**: Eliminar somas em ponto flutuante (`entry.amount`) dentro de `getCreatorBalances` e `getPlatformFinancialSummary`, calculando saldos inteiramente em `amountCents` (inteiros) e mantendo a separação contábil entre créditos virtuais, bônus promocionais (`0c`), receita bruta, repasse a criadores (70%), receita operacional JOBS (20%) e reserva de segurança (10%).
* **Arquivo modificado**: `src/services/monetizationService.ts`
  * Sincronizar compras de pacotes e desbloqueios com o namespace ativo do `runtimeEnvironmentService` e garantir reconciliação direta com `ledgerService`.

### Fase 4: Sincronização de Produção no Firestore (`src/firebase.ts`)
* **Arquivo modificado**: `src/firebase.ts`
  * Adicionar funções de persistência e leitura segura para produção no Firestore (sincronização de snapshots auditáveis de `/ledger_entries` por admin e leitura segura de saldo/transações do próprio usuário autenticado), preservando tratamento estruturado de erros (`handleFirestoreError`) e fallback resiliente.

### Fase 5: Testes Automatizados de Isolamento, Estorno Atômico e Segurança
* **Novo arquivo**: `src/services/__tests__/productionReadinessAndIsolation.test.ts`
  * Testa:
    1. Isolamento total entre `simulation` e `production` (transações de simulação nunca alteram saldos ou relatórios de produção).
    2. Bloqueio de seeds fictícios em modo `production`.
    3. Estorno atômico completo das pernas (`spend` + `creator_share` + `platform_share`) e bloqueio de estorno duplicado (idempotência).
    4. Precisão aritmética em centavos (`amountCents`) sem desvio de ponto flutuante.
    5. Restrição de acesso ao modo de simulação apenas para perfil administrativo.
* **Arquivo modificado**: `scripts/runVerificationTests.ts`
  * Inclui a nova suíte `productionReadinessAndIsolation.test.ts` na execução oficial do `npm test`.

---

## 4. Critérios de Aceitação e Estratégia de Reversão

* **Critérios de Aceitação**:
  1. `npm run lint` (`tsc --noEmit`) com 0 erros.
  2. `npm run build` (`vite build`) concluído com sucesso.
  3. `npm test` com 100% de aprovação (todos os 314 testes existentes preservados + novos testes de isolamento e estorno atômico).
  4. Regras `firestore.rules` validadas e implantadas sem permitir escrita direta de usuários comuns em `/ledger_entries` nem autoaprovação em `/media_items`.
* **Estratégia de Reversão (Rollback)**:
  * Todas as mudanças de storage preservam compatibilidade retroativa com as chaves existentes no modo de simulação e testes; qualquer alteração pode ser revertida isoladamente por arquivo (`runtimeEnvironmentService.ts`, `ledgerService.ts`, `firestore.rules`) sem perda de dados históricos.
