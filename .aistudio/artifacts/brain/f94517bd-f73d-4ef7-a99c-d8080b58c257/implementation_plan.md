# JOBS — Refinamento do Ranking Financeiro de Criadores

Refinamento da interface do **Ranking Financeiro de Criadores** integrado ao Painel Central Administrativo, adicionando popovers analíticos acessíveis para rastreabilidade contábil de cada indicador, gráficos de barras comparativos de decomposição financeira (Parcela do Criador 70%, Comissão JOBS 30%, Taxas e Estornos) sincronizados ao período ativo e validação automatizada de integridade financeira.

---

## Decisões Confirmadas e Diretrizes Críticas

> [!IMPORTANT]
> As decisões abaixo foram confirmadas na etapa de alinhamento e regem a arquitetura funcional e visual desta entrega:

- **Decisão Confirmada 1 — Modelo Visual de Barras Comparativas**: Adotar **Decomposição Contábil** na célula de ganhos de cada criador, exibindo visualmente a proporção entre **Ganhos Brutos**, **Parcela Líquida do Criador (70%)**, **Taxa da Plataforma JOBS (30%)** e **Estornos/Ajustes**, acompanhada de comparativo direto com o período anterior equivalente quando suportado pelo histórico.
- **Decisão Confirmada 2 — Interação dos Tooltips Analíticos**: Implementar **Popover Acessível** acionado por clique, toque, foco de teclado (`Tab` / `Enter` / `Space`) e fechamento via tecla `Esc` ou clique externo, garantindo leitura completa em dispositivos móveis sem depender apenas de `hover`.
- **Decisão Confirmada 3 — Sincronização Temporal**: Sincronizar automaticamente o cálculo das barras comparativas e dos metadados analíticos com o filtro de período ativo do painel (`Hoje`, `7 Dias`, `14 Dias`, `30 Dias`, `Acumulado`), exibindo indicação explícita quando o histórico de comparação for parcial ou indisponível (especialmente em Produção Real desconectada).

> [!WARNING]
> **Invariantes Contábeis Inegociáveis**:
> - O componente visual consumirá exclusivamente dados apurados pelos serviços financeiros autorizados, sem recalcular regras contábeis de forma autônoma na camada de apresentação e sem jamais mutar o livro-razão (`financialLedger`) durante a renderização.
> - Créditos virtuais (`💎`) permanecem estritamente segregados de moeda fiduciária (`BRL`), sem soma ou mistura de unidades.

---

## 1. Visão Geral e Conceito Central

- **O Que Faz**: Eleva a transparência contábil e a capacidade de inspeção executiva da tabela de classificação financeira de criadores, permitindo ao administrador auditar instantaneamente de onde vem cada cifra, qual fórmula foi aplicada e como a receita bruta gerada por cada criador se decompõe entre repasse líquido (70%), retenção da plataforma (30%), taxas operacionais e estornos.
- **Público-Alvo / Persona**: Administradores financeiros, auditores internos e operadores de conformidade da plataforma JOBS autenticados no Painel Central Administrativo.
- **Valor Principal**: Reduz o tempo de conciliação e auditoria por criador, elimina ambiguidades entre valores brutos, retidos em carência (`D+14`), elegíveis para saque e estornados, e garante rastreabilidade direta até os lançamentos do livro-razão sem sobrecarregar a leitura tabular.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos de Interação do Usuário

1. **Inspeção de Indicadores via Popover Analítico**:
   - No cabeçalho de cada coluna financeira do ranking (Ganhos Brutos, Taxa JOBS 30%, Taxas PSP, Estornos, Ganhos Líquidos 70%, Pendentes D+14, Elegível para Saque, Já Pagos) e nos indicadores de resumo, um botão informativo acessível (`aria-expanded`, `aria-controls`, área de toque mínima calibrada) abre um popover estruturado.
   - O popover exibe 8 dimensões auditáveis: **Nome do Indicador**, **Origem Oficial dos Dados**, **Regra de Cálculo (Fórmula)**, **Período e Fuso Horário (`America/Sao_Paulo`)**, **Moeda (`BRL` ou `CREDITS` segregados)**, **Status Financeiro**, **Horário da Última Atualização Verificável** e **Limitações / Ressalvas Contábeis**.
   - Caso um indicador não possua fonte ou histórico verificável (por exemplo, em ambiente de Produção Real sem adquirente ativa ou métrica sem cobertura histórica), o popover exibe aviso explícito de **Informação Indisponível / Histórico Incompleto**, sem inventar explicações.

2. **Leitura dos Gráficos de Barras Comparativos por Criador**:
   - Na célula de ganhos de cada linha do ranking, abaixo ou ao lado dos numerais tabulares, é renderizado um **Gráfico de Barras Comparativo Compacto** com duas visões integradas:
     1. **Barras de Decomposição Contábil do Período Ativo**: Três barras horizontais proporcionais lado a lado ou empilhadas com identificação clara e legenda acessível:
        - **Parcela Líquida Criador (70%)** em verde esmeralda (`#10B981`).
        - **Comissão JOBS (30%) + Taxas** em rosa/âmbar institucional (`#F43F5E` / `#F59E0B`).
        - **Estornos e Ajustes Compensatórios** em vermelho alerta (`#EF4444`), destacando visualmente quando houver dedução pro-rata.
     2. **Barra de Comparação com Período Anterior Equivalente**: Indicador compacto comparando o ganho líquido no período selecionado (`7d`, `14d`, `30d`) contra a janela anterior equivalente, com variação percentual (`+18,5%`, `-14,2%` ou `Sem histórico anterior`).
   - Cada barra possui foco próprio por teclado e interação por toque/clique, abrindo o detalhamento com valores exatos formatados em `pt-BR`, período de referência, moeda (`BRL`) e quantidade de transações elegíveis.

3. **Responsividade e Preservação dos Controles Existentes**:
   - Em telas desktop (`1440px`), o mini gráfico integra-se harmoniosamente à célula de ganhos sem alargar excessivamente a tabela.
   - Em telas compactas/móveis, exibe uma barra resumida com botão de toque rápido para expandir os detalhes comparativos.
   - Todos os controles existentes — busca por nome, `@handle` ou `ID`, 9 modos de ordenação, filtros de status/conteúdo/pagamento, anonimização LGPD, paginação segura e dossiê individual — permanecem 100% preservados.

### Identidade Visual e Tema

- **Direção Estética**: *Enterprise Financial Ledger Grid* — superfícies escuras de camada única (`#0F0F18` e `#121222`) com bordas estruturais sutis de `1px` (`border-slate-800`), zero uso de pílulas decorativas para metadados estáticos (metadados separados por pontos tipográficos `·`), e hierarquia numérica estrita.
- **Tipografia e Alinhamento Numérico**:
  - Todos os valores monetários, percentuais, contadores de vendas e timestamps utilizam obrigatoriamente `font-mono` e `tabular-nums` (`font-variant-numeric: tabular-nums`), garantindo alinhamento vertical perfeito de casas decimais entre as linhas.
- **Semântica de Cores e Acessibilidade**:
  - Além das cores semânticas (Esmeralda para líquido do criador, Rosa/Âmbar para retenção JOBS, Vermelho para estornos, Ciano para saldo elegível), todas as barras e indicadores incluem prefixos textuais e rótulos acessíveis (`70% Criador`, `30% JOBS`, `Estorno`) para nunca depender exclusivamente de cor.

---

## 3. Decisões de Produto e Trade-Offs

- **Decisão 1: Agregação Determinística Centralizada na Camada de Serviço vs. Cálculo Inline no Componente**
  - *Abordagem Escolhida*: Centralizar o catálogo de metadados analíticos dos indicadores e o cálculo das séries comparativas por criador diretamente no serviço financeiro (`monetizationService` em conjunto com `financialLedger`), entregando objetos tipados prontos para renderização e memoizados via `useMemo`.
  - *Por Quê*: Garante que a interface nunca recalcule a regra `70/30` de forma independente ou divergente do livro-razão, elimina consultas repetidas por linha durante re-renderizações e permite testar toda a lógica matemática e de rastreabilidade de maneira determinística na suíte automatizada.
  - *Alternativas Consideradas*: Calcular proporções e períodos anteriores dentro do JSX de cada linha da tabela foi descartado por violar a regra de integridade financeira e degradar o desempenho da tabela paginada.

- **Decisão 2: Popover Interativo Nativo com Controle de Foco vs. Atributo `title` Nativo do Navegador**
  - *Abordagem Escolhida*: Construir um componente reutilizável de Popover Analítico (`AnalyticalIndicatorPopover`) com suporte a mouse, toque mobile, navegação por teclado (`Tab`, `Enter`, `Escape`) e atributos ARIA completos.
  - *Por Quê*: O atributo `title` nativo não funciona em telas sensíveis ao toque (mobile/tablet), não pode ser focado via teclado e não permite estruturar os 8 campos obrigatórios de rastreabilidade contábil.

---

## 4. Arquitetura Técnica e Estratégia de Dados

### Diagrama de Arquitetura e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CAMADA DE SERVIÇOS E LIVRO-RAZÃO IMUTÁVEL                │
│                                                                            │
│  ┌──────────────────────────────┐      ┌────────────────────────────────┐  │
│  │       financialLedger        │      │      monetizationService       │  │
│  │ (Somente Leitura na Visão)   │─────▶│ • getCreatorRankings()         │  │
│  │ • Partidas Dobradas BRL/CRED │      │ • getIndicatorAuditMetadata()  │  │
│  │ • Isolamento Sandbox / Prod  │      │ • getCreatorComparativeBars()  │  │
│  └──────────────────────────────┘      └───────────────┬────────────────┘  │
└────────────────────────────────────────────────────────┼───────────────────┘
                                                         │
                                      Dados Tipados & Memoizados (useMemo)
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                PAINEL CENTRAL ADMINISTRATIVO (Visualização)                │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │            CreatorEarningsRankingView & PlatformFinancialExecutive   │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │   AnalyticalIndicatorPopover    │  │ CreatorComparativeBarCell │  │  │
│  │  │ • Origem, Fórmula e Período     │  │ • Barra 70% Criador (BRL) │  │  │
│  │  │ • Moeda (BRL vs Créditos)       │  │ • Barra 30% JOBS + Taxas  │  │  │
│  │  │ • Status e Limitações Explícitas│  │ • Barra Estornos / Ajustes│  │  │
│  │  │ • Suporte Clique/Toque/Teclado  │  │ • Comparativo Período Ant.│  │  │
│  │  └─────────────────────────────────┘  └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados e Contratos de Rastreabilidade

1. **Metadados Analíticos de Indicadores (`IndicatorAnalyticalMetadata`)**:
   - `indicatorKey`: Identificador único da métrica (`gross_sales`, `platform_commission_30`, `psp_fees`, `refunds_adjustments`, `net_creator_70`, `pending_d14`, `eligible_withdrawal`, `paid_settled`, `virtual_credits_volume`).
   - `indicatorName`: Nome claro e descritivo do indicador.
   - `dataSource`: Serviço e conta contábil oficial (ex.: `financialLedger · Conta CREATOR_AVAILABLE_BRL`) ou `Indisponível` quando não verificável.
   - `calculationFormula`: Regra matemática real aplicada pelo sistema (ex.: `Bruto Elegível × 70% − Taxas Atribuídas − Estornos Pro-Rata`).
   - `periodLabel` & `timezone`: Intervalo selecionado (`Hoje`, `Últimos 7 dias`, `Últimos 14 dias`, `Últimos 30 dias`, `Acumulado`) no fuso `America/Sao_Paulo (BRT)`.
   - `currency`: `'BRL'` ou `'CREDITS'` (nunca misturados).
   - `financialStatus`: `'liquidado' | 'pendente_custodia' | 'estornado' | 'elegivel_saque' | 'indisponivel'`.
   - `lastVerifiedUpdate`: Timestamp verificável da última apuração.
   - `limitations`: Lista explícita de ressalvas (ex.: ambiente de simulação, carência `D+14` ativa, ausência de registros no período ou falta de homologação em produção).
   - `isSourceAvailable`: Booleano que determina se a origem é comprovada ou se deve exibir o estado de informação indisponível.

2. **Série Comparativa por Criador (`CreatorEarningsComparativeSeries`)**:
   - `creatorId`: Identificador do criador.
   - `currentPeriodLabel` & `previousPeriodLabel`: Rótulos das janelas comparadas (ex.: `Últimos 7 dias` vs `7 dias anteriores`).
   - `currency`: `'BRL'`.
   - `hasHistoricalData`: Indica se há registros confirmados para sustentar a comparação.
   - `bars`: Lista de barras estruturadas contendo:
     - `key`: `'creator_net_70' | 'platform_commission_30' | 'refunds_adjustments' | 'previous_period_net'`.
     - `label`: Rótulo legível e acessível.
     - `amountBrl`: Valor exato em Reais (`number`).
     - `proportionPct`: Proporção visual normalizada (`0` a `100%`) em relação ao volume bruto do período, tratando valores zero e negativos com segurança visual.
     - `periodReference`: Intervalo temporal exato da barra.
     - `definition`: Descrição contábil exibida no tooltip individual da barra.
   - `periodDeltaPct`: Variação percentual calculada entre o período atual e o anterior equivalente (`null` quando o histórico anterior for ausente ou zero).
   - `creditsMovedCount`: Volume de créditos virtuais de origem mantido em campo informativo separado, sem somar ao valor em `BRL`.

### Mapeamento de Interações e Suíte de Testes (12 Verificações Obrigatórias)

A suíte automatizada validará todas as 12 exigências técnicas e contábeis antes da aprovação:
1. **Tooltip com origem e fórmula corretas** para todos os indicadores financeiros da tabela.
2. **Tratamento de indicador com origem indisponível**, garantindo exibição de mensagem explícita sem dados inventados.
3. **Comparação de períodos equivalentes** (`7d` atual vs `7d` anterior, `14d` vs `14d`, `30d` vs `30d`).
4. **Tratamento seguro de valores zero, variações negativas e históricos ausentes** (como em Produção Real desconectada).
5. **Contabilização correta de estornos, pendências (`D+14`) e bloqueio de transações duplicadas** por idempotência.
6. **Separação rigorosa entre `BRL` e créditos virtuais (`CREDITS`)**, comprovando ausência de soma cruzada.
7. **Aplicação exclusiva da regra `70/30` em transações elegíveis**, respeitando taxas e deduções configuradas.
8. **Preservação integral de busca (nome, `@handle`, `ID`), filtros, 9 modos de ordenação e paginação**.
9. **Acessibilidade de interação** (suporte a abertura/fechamento via clique, toque, foco de teclado e tecla `Escape` com atributos ARIA).
10. **Responsividade e integridade de layout** nas células da tabela (versão compacta e detalhamento sob demanda).
11. **Autorização e menor privilégio**, garantindo ausência de exposição de segredos, queries SQL, chaves PIX completas ou PII não autorizada nos tooltips.
12. **Imutabilidade absoluta do livro-razão (`financialLedger`)**, comprovando que consultar rankings, abrir tooltips e renderizar gráficos de barras mantém o número de entradas, hashes SHA-256 e saldos 100% inalterados.
