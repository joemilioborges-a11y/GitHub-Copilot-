# JOBS — Relatório Financeiro de Receitas e Geração de Ganhos

Complemento analítico e auditável integrado ao painel administrativo central (`CentralAdminDashboardModal`), apresentando a composição de receitas por serviço, comparativo de entradas e estornos, reconciliação financeira exata e rastreabilidade até as transações de origem no livro-razão sem alterar funcionalidades existentes.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões de Produto e Arquitetura (Defaults Recomendados Aplicados)**
> - **Posicionamento no Painel Administrativo**: O relatório será disponibilizado como uma nova sub-aba dedicada (**"Relatório de Receitas & Geração de Ganhos"**) dentro da seção **Carteira e Créditos** e contará com um botão de acesso direto na seção **Visão Geral**, preservando 100% das abas e componentes existentes.
> - **Fonte Contábil e Isolamento de Ambientes**: O relatório permitirá alternar entre o **Livro-Razão Contábil Oficial (`financialLedger`)** e o **Livro-Razão Isolado do Simulador VR (`vrSimulatorService`)**, nunca misturando transações de origens distintas nem tratando créditos virtuais (`CREDITS`) como moeda fiduciária (`BRL`).

---

### 1. Overview & Core Concept

- **What It Does**: Fornece uma visão contábil e executiva completa das receitas por serviço do JOBS, distinguindo claramente o fluxo de caixa bruto (venda de pacotes de créditos em `BRL`), as transações de consumo elegíveis à divisão **70% criador / 30% JOBS** (Desbloqueios de Cofre/Mídia VIP, Desbloqueios de Transmissões Ao Vivo, Presentes Virtuais em Lives e Assinaturas/Desafios), os estornos contabilizados, as obrigações com criadores, os repasses liquidados, as taxas registradas e o caixa disponível reconciliado.
- **Target Audience / Persona**: Administradores financeiros e auditores da plataforma JOBS que necessitam verificar a origem de cada centavo recebido, a aplicação estrita da regra 70/30 apenas sobre serviços elegíveis e a conciliação matemática com o livro-razão.
- **Key Value**: Elimina dupla contagem entre compra de créditos e consumo de serviços, impede que créditos virtuais sejam somados como dinheiro real e permite inspecionar a lista exata de transações (`id`, `transactionId`, `idempotencyKey`, `timestamp`, `entryHash`) que compõem cada fatia ou barra dos gráficos.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Acesso e Seleção de Escopo**: No `CentralAdminDashboardModal`, o administrador acessa o relatório pela aba **Carteira e Créditos → Receitas & Geração de Ganhos** (ou pelo atalho na **Visão Geral**), escolhe o período temporal (`Hoje`, `7 Dias`, `30 Dias`, `Todo o Histórico` ou `Período Sem Dados` para validação de vazio) e a fonte contábil (`Livro-Razão Oficial` vs `Sandbox VR 30 Dias`).
  2. **Inspeção do Gráfico de Pizza (Composição de Receitas por Serviço)**: Visualiza a participação percentual e monetária (`BRL`) de cada serviço elegível, acompanhada de uma tabela lateral de precisão tabular (`tabular-nums`) exibindo Receita Bruta Confirmada, Estornos/Cancelamentos, Receita Líquida Reconhecida, Parcela do Criador (70%), Comissão JOBS (30%) e Quantidade de Transações.
  3. **Inspeção do Gráfico de Barras (Entradas Financeiras vs Estornos e Obrigações)**: Analisa lado a lado, por categoria de serviço (incluindo Entrada de Caixa de Pacotes de Créditos separada das categorias de consumo 70/30), os Valores Recebidos e Confirmados, Estornos Separados, Receita Líquida, Obrigações com Criadores e Impacto no Caixa.
  4. **Drill-Down de Auditoria Histórica**: Ao clicar em qualquer serviço no gráfico ou na tabela de detalhamento, abre a gaveta/painel de **Rastreabilidade de Transações de Origem**, listando cada lançamento contábil original com data/hora real, identificador, chave de idempotência, contas de débito/crédito e hash SHA-256.
  5. **Painel de Reconciliação Financeira**: Confere os 7 indicadores reconciliáveis (Total Recebido, Total Estornado, Receita Líquida Reconhecida, Obrigações Pendentes com Criadores, Pagamentos Efetuados, Taxas Efetivamente Registradas e Saldo Disponível do JOBS), com exibição transparente de `"Dados insuficientes"` e explicação técnica caso algum indicador não possua cobertura no período selecionado.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Console financeiro executivo de alta densidade e precisão contábil, alinhado à estética escura do painel administrativo JOBS.
  - *Color Palette & Mood*: Superfície neutra escura (`#0A0A10` / `#0F172A`), bordas estruturais sutis de `1px` (`border-slate-800`), e cores semânticas estritas para séries financeiras:
    - Verde Esmeralda (`#10B981`): Receita líquida reconhecida e conciliação íntegra.
    - Ciano (`#06B6D4`): Entrada bruta confirmada e caixa custodiado.
    - Âmbar (`#F59E0B`): Comissão JOBS (30%) e reservas em processamento.
    - Violeta (`#8B5CF6`): Repasse devido aos criadores (70%).
    - Rosa/Carmesim (`#F43F5E`): Estornos, cancelamentos e reversões.
  - *Typography & Hierarchy*: Títulos nítidos sem prefixos mecânicos, metadados limpos separados por `·` e disciplina estrita de algarismos tabulares (`font-mono tabular-nums`) em todos os valores em `BRL`, contadores, percentuais e timestamps.
  - *Component Styling & Layout*: Layout de elevação única (`border border-slate-800 bg-slate-900/80 rounded-2xl`), sem cartões aninhados excessivos nem bordas laterais grossas, priorizando tabelas de alta densidade e gráficos Recharts responsivos.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Segregação Estrita entre Entrada de Caixa (`CREDIT_PURCHASE`) e Receita Elegível 70/30 (`CONTENT_UNLOCK`, `TIP_GIFT`, `SUBSCRIPTION_PURCHASE`)**
  - *Chosen Approach*: Compras de pacotes de créditos são contabilizadas como **Recebimento Bruto de Caixa (Escrow/Float)** e **não** sofrem divisão 70/30 no momento da compra. A divisão **70% criador / 30% JOBS** é aplicada exclusivamente quando o usuário consome créditos em serviços elegíveis de criadores.
  - *Why*: Impede dupla contagem de receita e respeita fielmente o modelo contábil de partidas dobradas já implementado no `ledgerService`.
  - *Alternatives Considered*: Aplicar 70/30 sobre a venda de pacotes foi descartado porque no momento da compra do pacote ainda não há criador destinatário nem serviço prestado.

- **Decision 2: Cálculo do Saldo Disponível do JOBS pela Equação de Caixa Custodiado (Não por Soma Simples de Comissões)**
  - *Chosen Approach*: O saldo de caixa disponível do JOBS é derivado dos registros reais de entrada fiduciária confirmada menos estornos fiduciários, menos repasses liquidados aos criadores (`PAYOUT_SETTLED` / `released`), menos taxas efetivamente registradas (`feeBrl`) e segregado das obrigações pendentes com criadores (`CREATOR_PENDING_BRL` + `CREATOR_AVAILABLE_BRL`).
  - *Why*: Atende estritamente à regra da Fase 4 ("Não calcular o caixa disponível simplesmente somando comissões. Não somar novamente transações já contabilizadas. Não utilizar créditos virtuais como dinheiro real").

- **Decision 3: Transparência para Indicadores sem Dados (`"Dados insuficientes"`)**
  - *Chosen Approach*: Quando um filtro de período não possui transações ou quando uma categoria/taxa não apresenta registros confirmados no intervalo selecionado, o indicador exibe explicitamente `"Dados insuficientes"` acompanhado da justificativa contábil, sem inventar valores nem repetir saldos atuais em datas passadas.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        CentralAdminDashboardModal                          │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Seção: Visão Geral (Atalho KPI)  │  │ Seção: Carteira e Créditos     │  │
│  └────────────────┬─────────────────┘  └───────────────┬────────────────┘  │
│                   └─────────────────┬──────────────────┘                   │
│                                     ▼                                      │
│              ┌──────────────────────────────────────────────┐              │
│              │        RevenueAndEarningsReportPanel         │              │
│              │  • Filtro de Período (Hoje/7d/30d/Todos)     │              │
│              │  • Seletor de Fonte (Razão Oficial / VR)     │              │
│              ├──────────────────────┬───────────────────────┤              │
│              │ Gráfico de Pizza     │ Gráfico de Barras     │              │
│              │ (Recharts PieChart)  │ (Recharts BarChart)   │              │
│              │ Composição Elegível  │ Bruto vs Estornos vs  │              │
│              │ + Split 70% / 30%    │ Líquido vs Obrigações │              │
│              ├──────────────────────┴───────────────────────┤              │
│              │ Painel de Reconciliação Financeira (7 KPIs)  │              │
│              ├──────────────────────────────────────────────┤              │
│              │ Gaveta/Tabela de Rastreabilidade Histórica   │              │
│              │ (Transações de Origem, Idempotência e Hash)  │              │
│              └──────────────────────┬───────────────────────┘              │
└─────────────────────────────────────┼──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             Motor de Agregação e Reconciliação (ledgerService)             │
│  • Agrupa LedgerEntry por transactionId / idempotencyKey sem duplicidade   │
│  • Classifica serviços reais:                                              │
│    1. Desbloqueio de Conteúdo / Cofre VIP (Elegível 70/30)                 │
│    2. Desbloqueio de Transmissão Ao Vivo VIP (Elegível 70/30)              │
│    3. Presentes Virtuais e Gorjetas em Lives (Elegível 70/30)              │
│    4. Assinaturas e Desafios VIP (Elegível 70/30)                          │
│    5. Venda de Pacotes de Créditos (Entrada de Caixa BRL — Sem 70/30)      │
│    6. Recompensas / Ajustes Administrativos (100% Alocado — Sem 30% JOBS)  │
│  • Concilia PayoutRecord (pagamentos liquidados e taxas feeBrl reais)      │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Agrupamento por Serviço (`ServiceRevenueBreakdownItem`)**:
    - `serviceKey`: `'vault_unlock' | 'live_unlock' | 'live_gifts' | 'subscriptions' | 'credit_packages_cash_in' | 'creator_rewards_adjustments'`
    - `serviceLabel`: nome real auditado do serviço no sistema.
    - `isEligibleFor70_30`: `boolean` indicando se aplica a regra 70% criador / 30% JOBS.
    - `grossConfirmedBrl`: valor bruto confirmado em `BRL` (centavos convertidos com precisão).
    - `refundedBrl`: estornos e cancelamentos contabilizados na categoria.
    - `netRevenueBrl`: receita líquida reconhecida (`grossConfirmedBrl - refundedBrl`).
    - `creatorShareBrl`: parcela de 70% devida ao criador (ou `null` quando não aplicável à categoria, como na entrada bruta de pacotes não consumidos).
    - `platformCommissionBrl`: comissão de 30% do JOBS (ou `null` quando não aplicável).
    - `transactionsCount`: quantidade de transações únicas deduplicadas por chave de idempotência/transação.
    - `originTransactions`: lista rastreável das transações originais (`transactionId`, `timestamp`, `actorId`, `targetCreatorId`, `grossBrl`, `refundedBrl`, `netBrl`, `creatorShareBrl`, `platformShareBrl`, `status`, `idempotencyKey`, `entryIds`, `entryHashes`).
  - **Indicadores de Reconciliação (`FinancialReconciliationSummary`)**:
    - `totalReceivedBrl`: entradas fiduciárias confirmadas + consumo econômico auditado sem dupla soma.
    - `totalRefundedBrl`: total de estornos e reversões registradas.
    - `netRecognizedRevenueBrl`: receita líquida reconhecida pelas regras contábeis.
    - `pendingCreatorObligationsBrl`: saldo pendente + disponível ainda não sacado pelos criadores (`CREATOR_PENDING_BRL` + `CREATOR_AVAILABLE_BRL`).
    - `settledCreatorPayoutsBrl`: repasses efetivamente liquidados (`released` / `PAYOUT_SETTLED`).
    - `recordedFeesBrl`: taxas bancárias/operacionais efetivamente registradas nos registros de pagamento (`PayoutRecord.feeBrl`); exibe status `"insufficient_data"` com explicação caso não existam taxas aplicáveis no período.
    - `availablePlatformCashBrl`: saldo de caixa disponível do JOBS reconciliado a partir do caixa real custodiado, deduzindo estornos, repasses pagos, taxas e obrigações retidas de criadores.

- **Interactive Component & State Mapping**:
  - **Seletores de Período**: Filtragem cronológica real pelo `timestamp` ISO de cada `LedgerEntry` (`today`, `7days`, `30days`, `all`, além de filtro de data customizada para inspecionar intervalos específicos ou períodos sem movimento).
  - **Interação nos Gráficos e Tabelas**: Clicar em uma fatia do Gráfico de Pizza, em uma barra do Gráfico de Barras ou no botão `"Ver transações de origem"` filtra imediatamente a tabela inferior de auditoria para exibir apenas os lançamentos que compõem aquele total.
  - **Verificação de Duplicidade e Integridade**: Indicador de paridade matemática validando em tempo real que `Receita Líquida Elegível === Parcela Criadores (70%) + Comissão JOBS (30%)` e que nenhuma chave de idempotência foi contabilizada em duplicidade.
