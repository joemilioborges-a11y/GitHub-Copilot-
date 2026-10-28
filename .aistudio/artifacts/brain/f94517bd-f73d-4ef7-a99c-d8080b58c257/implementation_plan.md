# JOBS — Homologação Externa e Bloqueio Fail-Closed de Pagamentos PIX

Fortalecimento do adaptador de pagamentos PIX (`dispatchPixPayoutOrder`) com validação determinística de configuração de produção, sanitização de credenciais e segredos HMAC contra exposição em logs ou interface, endpoint de backend para despacho controlado e comprovação automatizada das 6 verificações obrigatórias, mantendo a classificação oficial `NÃO VALIDADO PARA LIQUIDAÇÃO FINANCEIRA REAL EM PRODUÇÃO`.

## User Review & Critical Decisions

> [!IMPORTANT]
> Nenhuma operação em Produção será enviada a provedores externos nem poderá cair em fallback silencioso para simulação ou armazenamento local. Sempre que a configuração contratual e técnica do PSP participante do SPI não estiver validada no servidor, o adaptador recusará a operação de forma *fail-closed* com o código `PSP_NOT_CONFIGURED_FOR_PRODUCTION`, preservando intactos o estado do saque e os saldos contábeis.

- **Decisão Confirmada 1 (Validador Fail-Closed, Sanitização de Segredos e Rota Express)**: Implementar validação estrita de pré-requisitos de produção (mTLS, OAuth 2.0, ISPB, segredo HMAC e evidência de homologação), mascaramento automático de credenciais/segredos em trilhas de auditoria e rota de backend para disparo controlado de ordens PIX.
- **Decisão Confirmada 2 (Automação das 6 Verificações Obrigatórias)**: Comprovar na suíte automatizada todos os 6 cenários obrigatórios: ponto exato do bloqueio, recusa com configuração ausente ou inválida, zero chamadas externas realizadas, não exposição de segredos em logs/respostas, preservação inalterada do estado e saldo em Produção, e registro estruturado de evidências de homologação.
- **Decisão Confirmada 3 (Painel de Verificação Fail-Closed e Homologação no Admin)**: Adicionar ao Painel Financeiro Executivo um bloco de auditoria das 6 verificações obrigatórias e dos pré-requisitos de homologação externa do PSP PIX.

---

## 1. Overview & Core Concept

- **O Que Faz**: Garante que solicitações de saque em Produção sejam recusadas de modo determinístico (*fail-closed*) com o erro contratual `PSP_NOT_CONFIGURED_FOR_PRODUCTION` enquanto a contratação, o mTLS/OAuth 2.0, a rotação de segredos HMAC e o termo de homologação do PSP não estiverem integralmente validados no servidor, sem jamás recorrer a simulação como fallback nem alterar saldos ou estados de liquidação.
- **Público-Alvo / Persona**: Engenheiros de segurança, auditores financeiros e administradores executivos responsáveis pela governança de pagamentos e prevenção de liquidações fictícias.
- **Valor Principal**: Elimina qualquer possibilidade de falso positivo de pagamento PIX em Produção, garante zero chamadas externas não autorizadas, impede vazamento de segredos em logs ou respostas de frontend e documenta de forma auditável cada um dos 6 critérios de verificação obrigatória.

---

## 2. User Experience & Visual Design

- **Fluxos de Auditoria no Painel Financeiro Executivo**:
  1. Na aba **Conciliação & Hash-Chain**, o administrador visualiza o painel **Homologação Externa PSP PIX & Verificações Fail-Closed**, contendo o estado dos 6 pré-requisitos contratuais/técnicos do provedor e o resultado em tempo real das 6 verificações obrigatórias do bloqueio `PSP_NOT_CONFIGURED_FOR_PRODUCTION`.
  2. Um botão de ação **Testar Bloqueio Fail-Closed (Produção)** permite executar uma verificação controlada que comprova a recusa determinística (`PSP_NOT_CONFIGURED_FOR_PRODUCTION`), confirmando zero chamadas HTTP externas (`externalNetworkCallsCount: 0`), preservação integral do status do saque (`approved` / `under_review`, nunca `released`) e ausência de exposição de segredos.
- **Identidade Visual & Tema**:
  - *Direção Estética*: Console financeiro corporativo de alta densidade em modo escuro (`#0F0F18` / `#141424`) com bordas de 1px (`border-slate-800`) e profundidade única.
  - *Paleta de Cores*: Superfícies neutras frias (60% `#090912`, 30% `#141424`) e 10% de acento semântico pareado com rótulos explícitos (`text-amber-400` para bloqueio preventivo *fail-closed*, `text-emerald-400` para invariantes verificados e `text-rose-400` para recusas de segurança).
  - *Tipografia & Hierarquia*: Títulos enxutos sem prefixos mecânicos e valores monetários, contadores de chamadas externas, códigos de erro e identificadores em fonte monoespaçada com numerais tabulares (`font-mono tabular-nums`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Validação Estrita de Configuração de Produção + Zero Fallback para Simulação**
  - *Abordagem Escolhida*: Avaliar explicitamente a configuração de produção (`validateProductionPspConfig`) exigindo habilitação contratual, certificado mTLS, credenciais OAuth 2.0, segredo HMAC de produção e identificador de homologação. Se ausente, incompleta ou inválida em `production`, `dispatchPixPayoutOrder` aborta antes de qualquer transporte de rede, registra auditoria sanitizada e retorna `PSP_NOT_CONFIGURED_FOR_PRODUCTION`.
  - *Por Quê*: Impede que configurações parciais ou variáveis de ambiente malformadas disparem chamadas externas ou induzam fallback para o fluxo de `sandbox`.
- **Decisão 2: Sanitização Determinística de Credenciais e Segredos**
  - *Abordagem Escolhida*: Implementar um sanitizador de metadados e mensagens (`sanitizePspConfigAndSecrets`) que remove ou mascara qualquer chave sensível (`clientSecret`, `hmacSecret`, `mtlsPrivateKey`, `accessToken`, `authorization`, `apiKey`) antes de gravar no `adminAuditService`, retornar respostas da API ou exibir diagnósticos na interface.
  - *Por Quê*: Cumpre a exigência de que credenciais e segredos jamais sejam expostos em logs ou no frontend, mesmo durante falhas de configuração.
- **Decisão 3: Preservação Intacta de Estado Contábil sob Recusa Fail-Closed**
  - *Abordagem Escolhida*: Quando `dispatchPixPayoutOrder` recusa uma operação em Produção, o registro de saque mantém seu estado anterior (`under_review` ou `approved`), não gera lançamento `PAYOUT_SETTLED`, não cria saldo fictício e incrementa zero chamadas no transporte externo (`externalCallsExecuted: 0`).
  - *Por Quê*: Garante que uma falha de configuração nunca gere confirmação financeira nem corrompa a rastreabilidade ou a idempotência do livro-razão.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagrama de Arquitetura e Bloqueio Fail-Closed**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 PAINEL FINANCEIRO EXECUTIVO (Admin UI)                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Bloco: Homologação Externa PSP PIX & 6 Verificações Fail-Closed        │  │
│  │  • Status dos 6 Pré-Requisitos PSP (mTLS, OAuth2, HMAC, Homologação)   │  │
│  │  • Status das 6 Verificações Obrigatórias + Botão de Teste Controlado  │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│           API EXPRESS BACKEND & SERVIÇO DE CONCILIAÇÃO PSP PIX               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ POST /api/ledger/payouts/dispatch  ──►  dispatchPixPayoutOrder()       │  │
│  │                                                                        │  │
│  │  1. validateProductionPspConfig()  ──►  Verifica mTLS, OAuth2, HMAC    │  │
│  │  2. sanitizePspConfigAndSecrets()  ──►  Redige segredos de logs/UI     │  │
│  │  3. Guarda Fail-Closed (Produção):                                     │  │
│  │     • Recusa imediata: errorCode = "PSP_NOT_CONFIGURED_FOR_PRODUCTION" │  │
│  │     • Zero chamadas externas (externalCallsAttempted === 0)            │  │
│  │     • Zero fallback para Sandbox / localStorage                        │  │
│  │     • Estado do Payout e saldos do Ledger permanecem inalterados       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Modelo de Dados e Verificação**:
  - `PspProductionConfigInput`: Estrutura opcional para avaliação de configuração contendo `providerName`, `contractEnabled`, `mtlsConfigured`, `oauth2Configured`, `hmacSecretConfigured`, `homologationEvidenceId`, além de possíveis campos sensíveis submetidos a teste de sanitização.
  - `FailClosedVerificationReport`: Relatório estruturado das 6 verificações obrigatórias (`blockPointLocation`, `rejectedOnMissingOrInvalidConfig`, `zeroExternalCallsVerified`, `secretsRedactedVerified`, `ledgerAndStatusUnchangedVerified`, `homologationPrerequisitesStatus`), permitindo inspeção tanto pela suíte automatizada quanto pelo painel executivo.
- **Mapeamento de Componentes e Estados Interativos**:
  - O método `getFailClosedHomologationDiagnostic()` consolida os 6 pré-requisitos contratuais/técnicos do PSP e o status das 6 verificações obrigatórias.
  - O endpoint `POST /api/ledger/payouts/dispatch` no servidor Express expõe o adaptador `dispatchPixPayoutOrder` com retorno HTTP `503 Service Unavailable` e código `PSP_NOT_CONFIGURED_FOR_PRODUCTION` quando invocado para `production`, garantindo resposta uniforme sem vazar variáveis de ambiente.
