# JOBS — Plano Técnico Priorizado de Evolução (Fases 0 a 11)

Plano de arquitetura e engenharia para a evolução incremental da plataforma **JOBS 1.0** para um ecossistema global de relacionamentos, encontros e conexões autênticas, preservando integralmente o código existente, a integridade contábil do `financialLedger`, os fluxos de transmissão ao vivo com overlays interativos e a suite de 98 testes automatizados.

---

## 1. Visão Geral da Arquitetura & Diretrizes Fundamentais

### 1.1 Princípios Inegociáveis
1. **Preservação e Não Regressão**: Nenhuma tela (`Screen01Landing` a `Screen18ReportsBlocks`), serviço contábil (`financialLedger`), motor de live (`FloatingHeartsOverlay`, `GiftAnimationOverlay`, `LivePopularityIndicator`) ou teste existente será descontinuado ou substituído.
2. **Ledger Único e Isomórfico**: O `src/services/ledgerService.ts` com cadeia criptográfica SHA-256 e partilha 70/30 continua sendo a única fonte de verdade contábil.
3. **Transparência e Anti-Farsa**: Nenhum perfil falso, curtidas artificiais de robôs, mensagens fabricadas ou promessas enganosas de algoritmos de afinidade.
4. **Segurança e Privacidade (LGPD/GDPR)**: Minimização de dados, age-gate estrito de 18+ anos, isolamento de credenciais e exportação/exclusão de dados em conformidade legal.
5. **Acessibilidade e Ergonomia Touch-First**: Em conformidade com o design system para mobile touch (zonas ergonômicas de polegar, área de toque mínima de $44 \times 44\text{px}$, suporte a `prefers-reduced-motion` e contrastes WCAG AA).

```
                      +-------------------------------------------------------+
                      |                 JOBS 1.0 ECOSSISTEMA                   |
                      +-------------------------------------------------------+
                                                  |
         +----------------------------------------+----------------------------------------+
         |                                        |                                        |
+--------------------+                  +--------------------+                  +--------------------+
|  Core Dating & UX  |                  | Real-Time & Media  |                  | Finance & Auditing |
|  (18 Screens Flow) |                  | (Lives & WebRTC)   |                  | (Double-Entry LED) |
+--------------------+                  +--------------------+                  +--------------------+
| • Landing & Auth   |                  | • LiveStreamView   |                  | • ledgerService.ts |
| • Profile Wizard   |                  | • FloatingHearts   |                  | • 70/30 Split Rule |
| • Discovery Cards  |                  | • GiftOverlay      |                  | • AuditLedgerReport|
| • Mutual Matches   |                  | • PopularityGauge  |                  | • UnlockAuditPanel |
| • Chat & Safety    |                  | • Real WebRTC Call |                  | • PlatformExecutive|
+--------------------+                  +--------------------+                  +--------------------+
         |                                        |                                        |
         +----------------------------------------+----------------------------------------+
                                                  |
                      +-------------------------------------------------------+
                      |         CENTRAL ADMIN DASHBOARD & ROADMAP TRACKER     |
                      |   • Live Monitor  • Financial Exec  • 11-Phase Audit  |
                      +-------------------------------------------------------+
```

---

## 2. Roteiro de Execução em 11 Fases Priorizadas

### Fase 0 — Governança, Ambientes e Base de Execução
- **Objetivo**: Mapear inventário completo dos ativos técnicos, assegurar pipelines de verificação local e estruturar rastreamento de fases.
- **Entregáveis**:
  - Inventário formal de componentes, rotas e dependências.
  - Script unificado de verificação contínua (`npm test`, `npm run build`, `npm run lint`).
  - Painel interativo de Governança e Evolução dentro do `CentralAdminDashboardModal`.
- **Critérios de Aceitação**: Suite de testes com 100% de aprovação e sem avisos de compilação TypeScript.

### Fase 1 — Auditoria Funcional, Técnica e de Segurança
- **Objetivo**: Mapear a conformidade de dados, vetores de vulnerabilidade, políticas de LGPD e dependências de terceiros.
- **Entregáveis**:
  - Matriz de segurança cobrindo autenticação, sanitização de inputs de chat e cabeçalhos de segurança.
  - Auditoria de dados sensíveis e conformidade com anonimização de IP e geolocalização aproximada.
- **Critérios de Aceitação**: Nenhuma credencial em texto puro; geolocalização restrita a raio por cidade/bairro.

### Fase 2 — Estabilização, Correções e Fundação Técnica
- **Objetivo**: Endurecer o tratamento de falhas em rede, paginação de mensagens e resiliência offline do feed e chats.
- **Entregáveis**:
  - Interceptors e tratadores de erro resilientes com retry exponencial em chamadas de API.
  - Paginação cursor-based para feeds de descoberta e históricos de mensagens.
- **Critérios de Aceitação**: App mantém estado íntegro em caso de oscilação de conectividade sem crashes.

### Fase 3 — Identidade, Cadastro e Perfil
- **Objetivo**: Aprimorar o fluxo de onboarding com verificação de maioridade (18+), selo opcional de autenticidade e wizard guiado de perfil.
- **Entregáveis**:
  - Age-gate com validação de data de nascimento e termo formal de maioridade.
  - Fluxo de verificação fotográfica (selfie liveness opcional) com selo de verificado no perfil.
  - Seletor de interesses categorizados, estilos de vida e preferências relacionais.
- **Critérios de Aceitação**: Usuários menores de 18 anos são impedidos no cliente e no servidor.

### Fase 4 — Descoberta e Compatibilidade Explicável
- **Objetivo**: Mecanismo de recomendação baseado em interesses em comum, proximidade geográfica e afinidade declarada, com explicabilidade ética.
- **Entregáveis**:
  - Motor de matching transparente com tags explicativas (ex: *"Vocês dois amam trilhas e jazz"*).
  - Filtros avançados com ordenação por afinidade real, sem indução de escassez artificial.
- **Critérios de Aceitação**: O card de perfil exibe o índice de compatibilidade com justificativa legível.

### Fase 5 — Conexões, Mensagens e Notificações Éticas
- **Objetivo**: Mensagens 1:1 desbloqueadas exclusivamente por interesse mútuo (*Match*), com anti-spam e consentimento contínuo.
- **Entregáveis**:
  - Chat seguro em tempo real com indicador de digitação, confirmação de leitura opt-in e bloqueio imediato.
  - Moderação ativa contra compartilhamento indevido de links e comportamentos abusivos.
- **Critérios de Aceitação**: Usuários só podem trocar mensagens diretas após consentimento mútuo.

### Fase 6 — Confiança, Segurança e Moderação
- **Objetivo**: Ferramental robusto de denúncias, triagem administrativa de segurança e consentimento explícito.
- **Entregáveis**:
  - Central de Denúncias no Admin com histórico, categorização e ações de suspensão preventiva.
  - Painel de Gestão de Consentimentos e Direitos do Titular (LGPD/GDPR: exportação e esquecimento).
- **Critérios de Aceitação**: Denúncias entram em fila prioritária no painel administrativo com trilha de auditoria.

### Fase 7 — Chamadas de Vídeo em Tempo Real (WebRTC)
- **Objetivo**: Chamadas de vídeo ponta a ponta com consentimento recíproco, controles de câmera/microfone e sem falsas transmissões simuladas.
- **Entregáveis**:
  - Módulo WebRTC nativo com fallback de áudio e visualização de sinalização P2P.
  - Botão de pânico e encerramento com um toque com opção de bloqueio pós-chamada.
- **Critérios de Aceitação**: Conexão peer-to-peer real com controle de permissão e sem falsas simulações.

### Fase 8 — Monetização, Planos e Livro-Razão Multi-Moedas
- **Objetivo**: Planos Free, Premium e VIP integrados com clareza contábil no livro-razão 70/30 já existente.
- **Entregáveis**:
  - Tabela de planos com benefícios transparentes (destaques, filtros expandidos, presentes de lives).
  - Lançamentos no `financialLedger` diferenciando receita líquida da plataforma, impostos e obrigações.
- **Critérios de Aceitação**: Cada assinatura ou desbloqueio gera evento no ledger mantendo a integridade SHA-256.

### Fase 9 — Crescimento, Retenção Ética e Internacionalização
- **Objetivo**: Preparação multi-idioma (Português, Inglês, Espanhol), conversão de moedas (BRL, USD, EUR) e notificações respeitosas.
- **Entregáveis**:
  - Sistema de internacionalização (i18n) modular.
  - Notificações baseadas em eventos reais de usuários reais.
- **Critérios de Aceitação**: Troca instantânea de idioma e moeda sem perda de estado ou reinicialização.

### Fase 10 & 11 — Painel Administrativo, Observabilidade, Qualidade e Lançamento
- **Objetivo**: Painel consolidado com métricas de produto (DAU/MAU, retenção, liquidez contábil), testes de carga e checklist final de homologação.
- **Entregáveis**:
  - Dashboard Executivo unificado conectando métricas operacionais, segurança e finanças.
  - Relatório final de conformidade para auditoria externa.
- **Critérios de Aceitação**: Todos os indicadores reconciliados e suite de testes com 100% de sucesso.

---

## 3. Alterações Propostas no Código (File-by-File)

### 3.1 Novos Módulos de Governança e Evolução
- **`src/types/evolutionRoadmap.ts`**: Definição das interfaces de estado, marcos, evidências de testes e itens de auditoria para cada uma das 11 fases.
- **`src/services/evolutionRoadmapService.ts`**: Serviço para persistência de estado das fases, coleta de métricas de cobertura de código e auditoria de conformidade.
- **`src/components/admin/EvolutionRoadmapPanel.tsx`**: Componente visual moderno e responsivo, integrado como nova aba no `CentralAdminDashboardModal`, permitindo aos administradores inspecionar o progresso das 11 fases, auditar critérios de aceitação e verificar relatórios de conformidade.

### 3.2 Extensão Segura do Dashboard Administrativo
- **`src/components/admin/CentralAdminDashboardModal.tsx`**: Adição da aba `"evolution"` ("Evolução 11 Fases") sem alterar as abas existentes (`overview`, `liveMonitor`, `financialExec`, `unlockAudit`, `securityAudits`).

### 3.3 Suíte de Testes e Verificação
- **`src/services/__tests__/evolutionRoadmapService.test.ts`**: Testes automatizados para garantir validação de regras de transição de fase, persistência de evidências e integridade dos critérios de aceitação.
- **`scripts/runVerificationTests.ts`**: Inclusão dos novos testes na suíte de homologação contínua.

---

## 4. Plano de Verificação e Evidências

### 4.1 Testes Automatizados
```bash
# Executar a suíte de testes de integridade contábil e de componentes
npm test

# Validação estrita do compilador TypeScript
npm run lint

# Verificação de build de produção
npm run build
```

### 4.2 Verificação Manual e Critérios de Aceitação
1. **Navegação no Painel**: Abrir a Central do Administrador pelo menu principal ou botão de atalho e selecionar a aba "Evolução 11 Fases".
2. **Auditoria das Fases**: Inspecionar os detalhes das Fases 0 a 11, verificando os critérios cumpridos, os marcos planejados e a ausência de simulações enganosas.
3. **Não-Regressão**: Navegar pelas telas de Descoberta, Chat, Lives com corações flutuantes, presentes animados e painéis financeiros (`PlatformFinancialExecutive` e `LiveUnlockAuditPanel`), confirmando a operação contínua e sem erros.
