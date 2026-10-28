# JOBS — Evolução Auditada da Seção “Minha Carteira” na Tela Inicial

Consolidação incremental do cartão **“Minha Carteira”** imediatamente abaixo do banner de boas-vindas da tela inicial, conectado como projeção somente leitura ao livro-razão contábil de partidas dobradas (`financialLedger`), exibindo **Saldo disponível**, **Saldo pendente**, **Total recebido**, **Última movimentação**, **Ver extrato** e **Solicitar saque** com validação de elegibilidade, idempotência e bloqueio de acesso entre usuários.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram alinhadas na etapa de esclarecimento e governam o comportamento contábil, visual e de segurança desta entrega:

- **Decisão Confirmada 1 — Comportamento do botão “Solicitar saque” abaixo do mínimo (R$ 50,00)**: O botão permanece acessível para transparência operacional; quando o saldo disponível for inferior a R$ 50,00 (`5000` centavos) ou faltar requisito de elegibilidade, o modal exibe claramente os critérios pendentes (valor mínimo, limite diário, titularidade PIX e saldo atual) e mantém a submissão bloqueada no cliente e no motor contábil.
- **Decisão Confirmada 2 — Escopo do modal “Ver extrato” (BRL vs. Créditos)**: O extrato da Minha Carteira apresenta de forma dedicada as movimentações financeiras em Reais (`BRL`) — diferenciando entradas de colaboradores, repasses 70% de produtores de conteúdo, solicitações de saque (`PAYOUT_RESERVE`), liquidações (`PAYOUT_SETTLED`), estornos (`REFUND` / `PAYOUT_REVERSAL`) e ajustes (`ADMIN_ADJUSTMENT`) — e oferece um atalho integrado para abrir o extrato específico de Créditos de Consumo (`💎`), preservando a segregação contábil.
- **Decisão Confirmada 3 — Controle de Autorização e Isolamento de Usuário**: Todas as leituras de resumo, consultas de extrato e solicitações de saque validam a identidade da sessão autenticada (`actorId` / `userId` autorizado), bloqueando e auditando qualquer tentativa de consulta ou saque sobre a carteira de terceiros.

---

### 1. Overview & Core Concept

- **What It Does**: Apresenta logo abaixo do banner principal da tela inicial um painel financeiro confiável e responsivo (**Minha Carteira**) que reflete em tempo real a posição fiduciária (`BRL`) do usuário autenticado a partir do livro-razão SHA-256, sem manter saldos paralelos na interface e sem misturar créditos virtuais de consumo (`💎`) com valores elegíveis para saque.
- **Target Audience / Persona**: Criadores de conteúdo, colaboradores de indicação/desafios e membros autenticados da plataforma JOBS que acompanham seus ganhos, retenções antifraude (`D+14`), última transação registrada e solicitações de saque via PIX.
- **Key Value**: Transparência contábil auditável (exibindo exatamente o que está disponível, o que está pendente em retenção/escrow, o total histórico recebido sem duplicidades e a última movimentação), combinada com proteção rigorosa contra solicitações duplicadas, condições de corrida e acesso cruzado entre contas.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Consulta Imediata na Home**: Logo abaixo do banner de boas-vindas, o usuário visualiza o cartão **Minha Carteira** com badge explícito do ambiente ativo (*Ambiente Sandbox* vs. *Produção Auditada* — com aviso claro de que o motor contábil atual opera localmente sem liquidação bancária externa automática), botão de privacidade (*Ocultar/Mostrar saldo*) e os 4 indicadores centrais:
     - **Saldo disponível**: valor confirmado em `CREATOR_AVAILABLE_BRL` elegível para saque.
     - **Saldo pendente**: soma transparente de valores em retenção antifraude (`D+14`) e reservas de saque em processamento (*Escrow*).
     - **Total recebido**: total histórico acumulado de entradas válidas confirmadas, livre de duplicidades e deduzido de estornos.
     - **Última movimentação**: cartão compacto exibindo descrição, data/horário, direção/valor (`+` / `-` em `BRL`), identificador de referência e status real da transação mais recente (ou estado informativo quando ainda não houver movimentações no ambiente).
  2. **Acesso ao Extrato Financeiro (“Ver extrato”)**: Ao acionar **Ver extrato**, abre-se o modal de histórico detalhado com busca textual, filtro por categoria (*Todos*, *Colaboradores*, *Produtores 70%*, *Saques PIX*, *Estornos e Ajustes*) e filtro por status (*Disponível*, *Pendente / Em análise*, *Saque solicitado*, *Saque liquidado*, *Estornado*), exibindo data/hora, tipo, descrição, valor/moeda (`BRL`), status, referência (`referenceId` / `transactionId`) e chave de idempotência mascarada, além de atalho direto para a carteira de Créditos (`💎`).
  3. **Fluxo de Saque (“Solicitar saque”)**: Ao acionar **Solicitar saque**, o modal verifica autenticação, autorização e elegibilidade (`availableBalanceCents >= 5000`). Se elegível, guia o usuário em 3 etapas (*Formulário PIX com cálculo prévio de valor bruto, tarifa R$ 0,00 e valor líquido estimado* $\rightarrow$ *Revisão e Confirmação Explícita com chave de idempotência* $\rightarrow$ *Comprovante de Solicitação em status Em Análise / under_review*). Se o saldo for inferior a R$ 50,00, exibe o painel informativo de requisitos com o botão de envio desabilitado.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark luxury fintech integrado à estética do JOBS (`#131726` a `#101320`), com superfícies de elevação única e bordas sutis (`border-emerald-500/25` e `border-white/10`).
  - *Color Palette & Mood*: Esmeralda (`emerald-400`) para saldo disponível e entradas confirmadas; Âmbar (`amber-300`) para retenções pendentes e avisos de ambiente Sandbox; Azul-celeste (`sky-300`) para reservas de saque em processamento (*Escrow*); Roxo (`purple-300`) exclusivamente para o indicador segregado de créditos de consumo (`💎`).
  - *Typography & Hierarchy*: Números financeiros sempre alinhados com `tabular-nums` (`font-display` para saldos principais e `font-mono` para identificadores de transação, protocolos e chaves de idempotência).
- **Interactive Feedback & Motion**:
  - Estados claros para carregamento, ausência de movimentações (especialmente em modo Produção recém-inicializado), bloqueio por falta de saldo mínimo e mensagens de erro ou confirmação de idempotência.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Projeção Contábil Unificada com Centavos Inteiros (`amountCents`)**:
  - *Chosen Approach*: Derivar **Saldo disponível**, **Saldo pendente**, **Total recebido** e **Última movimentação** diretamente das entradas imutáveis do `financialLedger` em centavos inteiros, sincronizado em tempo real via `financialLedger.subscribe` e `runtimeEnvironmentService.subscribe`.
  - *Why*: Elimina divergências de ponto flutuante (`IEEE 754`), impede que a interface mantenha estado financeiro próprio e garante que a alternância entre Simulação e Produção reflita imediatamente os dados isolados de cada ambiente.
  - *Alternatives Considered*: Armazenar contadores de saldo no estado local do componente React ou somar valores na camada visual — descartado por violar a integridade contábil.
- **Decision 2 — Autorização e Isolamento de Carteira por Sessão (`Actor Authorization Gate`)**:
  - *Chosen Approach*: Validar no serviço contábil se o `actorId` autenticado corresponde ao titular da carteira consultada ou movimentada (`userId`), rejeitando e registrando no log de auditoria qualquer tentativa de leitura ou saque de outro usuário.
  - *Why*: Cumpre o princípio do menor privilégio e impede exposição ou movimentação indevida de dados financeiros de terceiros.
- **Decision 3 — Transparência sobre Natureza do Serviço de Saque**:
  - *Chosen Approach*: Manter o registro atômico `PAYOUT_RESERVE` com status `'under_review'` (transferindo o valor de `CREATOR_AVAILABLE_BRL` para `CREATOR_PAYOUT_ESCROW`) e informar explicitamente na interface que a solicitação cria uma reserva contábil sujeita à liquidação, sem simular transferência bancária concluída.
  - *Why*: Impede que uma solicitação pendente seja apresentada como dinheiro enviado ou pago.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Screen08HomeDashboard (Home)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Welcome Banner (Saudação, Cidade, Plano Atual)                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ HomeWalletSection ("Minha Carteira" — Abaixo do Banner)                │  │
│  │  ├─ Indicadores Principais (tabular-nums + modo Ocultar Saldo):        │  │
│  │  │   • Saldo Disponível (BRL)      • Saldo Pendente (Retenção+Escrow)  │  │
│  │  │   • Total Recebido (BRL)        • Última Movimentação (Resumo+Data) │  │
│  │  ├─ Segregação de Origens: Colaboradores vs. Produtores (70%)          │  │
│  │  ├─ Créditos Virtuais Segregados (💎 Não sacáveis -> abre WalletModal) │  │
│  │  └─ Ações Principais: [Ver extrato]  |  [Solicitar saque]              │  │
│  └───────────────┬────────────────────────────────────────┬───────────────┘  │
└──────────────────┼────────────────────────────────────────┼──────────────────┘
                   │                                        │
                   ▼                                        ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ Modal: Extrato Financeiro (BRL)     │  │ Modal: Solicitar Saque PIX          │
│ • Filtros: Origem, Status e Busca   │  │ • Verificação de Auth & Saldo >= 50 │
│ • Entradas, Saídas, Estornos,       │  │ • Etapa 1: Valor, PIX e Líquido     │
│   Ajustes e Solicitações de Saque   │  │ • Etapa 2: Confirmação Explícita    │
│ • ID de Referência & Idempotência   │  │ • Etapa 3: Protocolo (under_review) │
└──────────────────┬──────────────────┘  └──────────────────┬──────────────────┘
                   │                                        │
                   └───────────────────┬────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 financialLedger (FinancialLedgerService)                     │
│  • Controle de Acesso: valida sessão/actorId contra acesso a outros usuários │
│  • Fila Assíncrona Serializada (enqueue) + Chave de Idempotência             │
│  • Isolamento Simulação vs. Produção (runtimeEnvironmentService)             │
│  • Contas BRL: CREATOR_AVAILABLE_BRL | CREATOR_PENDING_BRL | PAYOUT_ESCROW   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `UnifiedWalletSummary`: expandido com `totalPendingCents` / `totalPendingBrl` (consolidando `pendingReviewCents` de retenção D+14 + `payoutReservedCents` de saques em análise, mantendo também os campos individuais detalhados) e `lastTransaction: UnifiedWalletStatementItem | null` (representando a transação BRL mais recente do usuário com descrição, timestamp ISO, direção, valor, status e referência).
  - `UnifiedWalletStatementItem`: inclui `referenceId` explícito, `operationType`, `category` (`collaborator | content_producer | payout | refund | adjustment`), `direction` (`credit | debit`) e `status` (`available | pending_review | payout_reserved | payout_released | refunded`).
  - `WalletAccessAuthorization`: verificação no `financialLedger` que garante que um usuário comum só possa consultar ou operar sua própria carteira, lançando erro auditado em caso de tentativa de acesso cruzado (`UNAUTHORIZED_WALLET_ACCESS`).

- **Interactive Component & State Mapping**:
  - **Assinatura Reativa Dupla**: `HomeWalletSection` subscreve simultaneamente a `financialLedger.subscribe` e `runtimeEnvironmentService.subscribe`, atualizando instantaneamente o resumo e o extrato após qualquer desbloqueio, meta, estorno, solicitação de saque ou troca de modo (Simulação $\leftrightarrow$ Produção).
  - **Bloco “Última movimentação”**: renderizado no cartão principal com descrição truncada segura, data/hora formatada (`pt-BR`), badge de status real (*Disponível*, *Em Retenção*, *Saque em Análise*, *Liquidado*, *Estornado*), valor em `BRL` (respeitando o modo *Ocultar saldo*) e botão rápido para inspecionar no extrato. Quando não houver movimentações (ex.: conta nova em Produção), exibe mensagem clara *"Nenhuma movimentação financeira registrada neste ambiente"*.
  - **Validação de Saque em Dupla Camada**:
    - Na UI: se `availableBalanceCents < 5000`, o modal **Solicitar saque** exibe um aviso estruturado informando o saldo disponível atual, o valor mínimo exigido (`R$ 50,00`) e o valor faltante para habilitação, mantendo o avanço para confirmação desabilitado.
    - No `financialLedger`: `requestUnifiedWalletPayout` valida `actorId === userId`, `amountCents >= 5000`, `amountCents <= 1000000`, `availableBalanceCents >= amountCents`, formato da chave PIX e `idempotencyKey`, debitando `CREATOR_AVAILABLE_BRL` e creditando `CREATOR_PAYOUT_ESCROW` com status `'under_review'`.

- **Bateria Obrigatória de Testes Automatizados (10 Cenários Auditáveis)**:
  1. Exibição do saldo correto (`availableBalanceBrl`, `totalReceivedPeriodBrl`, `lastTransaction`) para o usuário autenticado.
  2. Separação contábil exata entre saldo disponível (`CREATOR_AVAILABLE_BRL`) e saldo pendente (`CREATOR_PENDING_BRL` + `CREATOR_PAYOUT_ESCROW`), além da separação de créditos `💎`.
  3. Atualização reativa imediata após uma movimentação válida (novo repasse de produtor ou colaborador).
  4. Extrato financeiro com valores, datas, referências, direções e estados coerentes (entradas, saídas, estornos, ajustes e saques).
  5. Bloqueio de solicitação de saque quando o saldo disponível for inferior ao mínimo elegível (`< R$ 50,00`) ou insuficiente.
  6. Proteção de idempotência contra solicitações de saque duplicadas (`isReplay: true` sem duplo débito) e concorrência serializada.
  7. Tratamento de falhas de validação (chave PIX inválida, titularidade não confirmada) e manutenção do saque em estado pendente (`under_review`) sem liquidar falsamente.
  8. Isolamento rigoroso entre dados simulados (`sandbox`) e ambiente de `production` (zero seeds sintéticos em produção).
  9. Bloqueio de acesso indevido aos dados financeiros e saques de outros usuários (`Cross-User Access Protection`).
  10. Verificação de integridade e compatibilidade com a `Screen08HomeDashboard` via suíte de testes, `lint_applet` e `compile_applet`.
