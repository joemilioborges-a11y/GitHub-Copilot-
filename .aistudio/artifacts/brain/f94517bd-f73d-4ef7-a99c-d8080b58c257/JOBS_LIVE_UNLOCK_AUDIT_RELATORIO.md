# JOBS 1.0 — RELATÓRIO DE AUDITORIA CONTÁBIL EM TEMPO REAL: DESBLOQUEIOS DE LIVES (70/30)

**Documento Oficial:** JOBS-AUDIT-LIVE-UNLOCK-003  
**Data de Homologação:** 22 de Outubro de 2026  
**Status do Módulo:** PRODUÇÃO / SANDBOX AUDITADO — 100% CONFORME  
**Componente Central:** `LiveUnlockAuditPanel` integrado à `CentralAdminDashboardModal` (`src/components/admin/LiveUnlockAuditPanel.tsx`)  
**Fonte Única da Verdade:** `financialLedger` (`src/services/ledgerService.ts`)  

---

## 1. Sumário Executivo & Objetivos Atingidos

O módulo **LiveUnlockAuditPanel** foi implementado na Central do Administrador do JOBS como o painel mestre de transparência financeira e auditoria contábil de desbloqueios de transmissões ao vivo (lives individuais, batalhas, salas VIP) e conteúdos pagos/presentes vinculados às transmissões.

### Princípios Rigorosos Aplicados:
1. **Fonte Única da Verdade (Single Source of Truth):**
   - Não foi criado nenhum segundo ledger ou base paralela. Todas as consultas e agregações derivam exclusivamente dos lançamentos imutáveis de partidas dobradas do `financialLedger`.
2. **Painel Estritamente Somente-Leitura (Read-Only Audit):**
   - Nenhuma mutação de saldo, exclusão ou edição direta de registros é permitida pela interface.
   - Operações de cancelamento ou estorno ocorrem unicamente via lançamentos compensatórios de contrapartida (`REFUND`), preservando o histórico integral.
3. **Divisão Matemática 70/30 Auditada e Inviolável:**
   - 70% destinado aos Criadores (`CREATOR_PENDING_BRL` em custódia ou `CREATOR_AVAILABLE_BRL` se liquidado).
   - 30% destinado à comissão da plataforma JOBS (`PLATFORM_REVENUE_BRL`).
   - Cálculo exato centavo a centavo com arredondamento formal a 2 casas decimais.
4. **Segregação Estrita de Moedas e Estados:**
   - Créditos virtuais de usuários (`CREDITS`) são tokens internos não sacáveis (base de conversão econômica: 1 crédito = R$ 0,10).
   - Moeda fiduciária nacional (`BRL`) opera em contas estritamente separadas.
   - Valores em custódia pendente nunca são misturados com saldos liquidados ou disponíveis para saque.
5. **Atualização Reativa em Tempo Real:**
   - Padrão Observer com `financialLedger.subscribe(callback)`: O componente é notificado instantaneamente a cada novo lançamento atômico com recálculo automático sem recarregar a página.
   - Cancelamento limpo na desmontagem (`useEffect return () => unsubscribe()`), prevenindo vazamentos de memória (zero memory leak).
6. **Proteção Contra Vulnerabilidades (CSV Injection):**
   - Função `sanitizeCsvField` neutraliza caracteres perigosos (`=`, `+`, `-`, `@`, `\t`, `\r`) prefixando-os com apóstrofo antes da exportação em formato CSV.
   - Identificadores de usuários (`buyerMasked`) e chaves de idempotência (`idempotencyMasked`) são exibidos com mascaramento protetor de privacidade.

---

## 2. Indicadores de Resumo (KPIs em Tempo Real)

O painel consolida 7 cartões métricos dinâmicos alimentados em tempo real pelo livro-razão:

| Indicador | Definição Contábil | Regra de Cálculo |
| :--- | :--- | :--- |
| **Transações no Período** | Quantidade de desbloqueios e gorjetas elegíveis | $\sum \text{Transações com spendEntry}$ |
| **Receita Bruta (BRL)** | Valor econômico bruto das transações elegíveis | $\text{Créditos Consumidos} \times 0.10$ |
| **70% Criadores** | Direitos econômicos auferidos pelos criadores de lives | $\text{Receita Bruta} \times 0.70$ (arredondado a centavos) |
| **30% Comissão JOBS** | Receita líquida operacional retida pela plataforma | $\text{Receita Bruta} - \text{Repasse Criadores}$ |
| **Custódia Pendente** | Saldo retido em `CREATOR_PENDING_BRL` aguardando liquidação | $\sum \text{Créditos Criador com conta pendente}$ |
| **Estornos / Cancelamentos** | Volume e contagem de estornos com contrapartida contábil | $\sum \text{Transações com status 'refunded'}$ |
| **Taxa de Conformidade** | Percentual de transações sem divergência matemática | $\frac{\text{Total} - \text{Divergentes}}{\text{Total}} \times 100\%$ |

---

## 3. Arquitetura do Lote Contábil Atômico (Live Unlocks & Tips)

Cada desbloqueio de transmissão ou presente em live gera um lote atômico indivisível de 3 lançamentos (partidas dobradas):

```
                                  [ DESBLOQUEIO DE LIVE ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ Lançamento #1: Débito Usuário ]         [ Lançamento #2 & #3: Split 70/30 BRL ]
             Débito:  USER_CREDITS:{userId}           Débito:  ESCROW_PAYMENT_GATEWAY (Gross BRL)
             Crédito: ESCROW_CONTENT_POOL:credits     Crédito: CREATOR_PENDING_BRL:{creatorId} (70%)
             Moeda:   CREDITS                         Crédito: PLATFORM_REVENUE_BRL (30%)
                                                      Moeda:   BRL
```

### Exemplo de Verificação Matemática:
- **Desbloqueio de Show Íntimo:** 65 Créditos
- **Valor Econômico Bruto:** $65 \times \text{R\$} 0,10 = \text{R\$} 6,50$
- **Parcela Criador (70%):** $\text{R\$} 6,50 \times 0,70 = \text{R\$} 4,55$
- **Comissão JOBS (30%):** $\text{R\$} 6,50 \times 0,30 = \text{R\$} 1,95$
- **Verificação de Soma:** $\text{R\$} 4,55 + \text{R\$} 1,95 = \text{R\$} 6,50$ (Divergência = R$ 0,00)

---

## 4. Evidência dos 12 Cenários de Teste Obrigatórios

Todos os 12 cenários foram executados no runner automatizado (`scripts/runVerificationTests.ts`) com **100% de sucesso**.

```
========================================================================
JOBS — TESTES OBRIGATÓRIOS: AUDITORIA DE DESBLOQUEIOS DE LIVES (70/30)
========================================================================

✅ [PASS] Cenário 1 [SCENARIO_01_REAL_LEDGER_DATA]: Consulta de transações reais do ledger sem dados fictícios (7ms)
    EVIDÊNCIA: Transações auditadas: 12. Transação validada com 3 lançamentos atômicos reais.

✅ [PASS] Cenário 2 [SCENARIO_02_EXACT_70_30_SPLIT]: Cálculo exato da divisão 70/30 com precisão de centavos (3ms)
    EVIDÊNCIA: Bruto: R$ 6.50 | Criador: R$ 4.55 | JOBS: R$ 1.95 | Soma = 100%

✅ [PASS] Cenário 3 [SCENARIO_03_PENDING_SETTLEMENT_SEGREGATION]: Segregação estrita entre custódia pendente e saldo liquidado (2ms)
    EVIDÊNCIA: KPI Custódia Pendente: R$ 25.90 segregado de saldo liquidado.

✅ [PASS] Cenário 4 [SCENARIO_04_CURRENCY_BOUNDARY]: Diferenciação formal entre créditos virtuais e moeda corrente BRL (1ms)
    EVIDÊNCIA: 36 lançamentos em CREDITS e 55 em BRL auditados sem mistura de tipos.

✅ [PASS] Cenário 5 [SCENARIO_05_REJECT_INVALID_TRANSACTIONS]: Rejeição e tratamento de transações não-elegíveis ou inválidas (1ms)
    EVIDÊNCIA: Transação inválida com valor zero ou negativo rejeitada com sucesso (Zero-Fault Pre-Validation).

✅ [PASS] Cenário 6 [SCENARIO_06_DIVERGENCE_DETECTION]: Detecção e alerta de divergências contábeis na divisão 70/30 (4ms)
    EVIDÊNCIA: Divergência identificada com precisão: "Divergência matemática 70/30: Criador (R$ 5.00) + JOBS (R$ 3.00) = R$ 8.00 ≠ Bruto R$ 10.00"

✅ [PASS] Cenário 7 [SCENARIO_07_REFUND_COMPENSATORY_TRACKING]: Rastreamento e vinculação de estornos compensatórios auditados (9ms)
    EVIDÊNCIA: Transação estornada com sucesso. Entrada compensatória vinculada ao id original.

✅ [PASS] Cenário 8 [SCENARIO_08_IDEMPOTENCY_REPLAY_PROTECTION]: Proteção estrita contra replay por idempotência (11ms)
    EVIDÊNCIA: Idempotência garantida: reenvio retornou isReplay=true com saldo inalterado.

✅ [PASS] Cenário 9 [SCENARIO_09_REALTIME_SUBSCRIPTION]: Notificação reativa em tempo real com subscrição no ledger (2ms)
    EVIDÊNCIA: Subscrição em tempo real acionada imediatamente ao postar entrada no livro-razão.

✅ [PASS] Cenário 10 [SCENARIO_10_CLEAN_UNMOUNT_NO_LEAK]: Desmontagem limpa de subscrição sem vazamento de memória (2ms)
    EVIDÊNCIA: Desinscrição verificada: callback foi removido do Set de ouvintes com sucesso.

✅ [PASS] Cenário 11 [SCENARIO_11_MULTICRITERIA_FILTERING]: Filtros multicritério (período, liveId, criador, status e busca) (2ms)
    EVIDÊNCIA: Filtro por "valentina" isolou 3 registros de 17 no total.

✅ [PASS] Cenário 12 [SCENARIO_12_CSV_FORMULA_INJECTION_PROTECTION]: Sanitização de campos na exportação CSV contra Formula Injection (1ms)
    EVIDÊNCIA: Proteção CSV completa: caracteres =,+,-,@,\t,\r escapados com apóstrofo e dados sensíveis mascarados.

========================================================================
RESUMO CONSOLIDADO DA PLATAFORMA JOBS:
Total de Casos de Teste: 98
Aprovados:              98 (100.0%)
Falhas:                 0
Tempo Total:            133ms
========================================================================
```

---

## 5. Recursos Visuais & Usabilidade

1. **Gráficos Analíticos com Recharts:**
   - Gráfico de Rosca animado destacando a partilha 70% Criadores / 30% JOBS / Estornos.
   - Gráfico de Barras histórico demonstrando o volume diário em BRL e créditos.
2. **Gaveta / Modal de Detalhes da Transação:**
   - Visualização minuciosa de cada lançamento (contas de débito, crédito, moedas e valores).
   - Prova visual com cálculo $70\% + 30\% = 100\%$ centavo a centavo.
   - Hash SHA-256 e previousHash para auditoria criptográfica.
3. **Filtros e Busca Integrados:**
   - Períodos: Hoje, 24h, 7 dias, 30 dias e Todos.
   - Status: Contabilizados, Pendentes, Estornados e Divergentes.
   - Tipo de Operação: Desbloqueios VIP e Presentes/Gorjetas.
   - Busca em tempo real por múltiplos campos (ID, Live, Criador, Comprador).
   - Alternância rápida para exibir apenas divergências contábeis.
4. **Exportação Segura em CSV:**
   - Botão "Exportar CSV Seguro" gera arquivo pronto para conciliação contábil externa com proteção nativa contra injeção de fórmulas.
