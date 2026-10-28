# Evolução da Auditoria em Nuvem de Talentos e Painel Administrativo de Snapshots

Este plano detalha a evolução incremental da sincronização de progresso auditado de talentos com o Cloud Firestore durante transições de autenticação em produção e a adição de um painel administrativo de inspeção de snapshots de campanhas sazonais na seção de Criadores.

---

## User Review & Critical Decisions

As diretrizes de produto e arquitetura confirmadas para esta etapa são:

- **Reconciliação Automática de Snapshots Locais ao Autenticar**: Quando o participante opera em **Modo Produção** sem sessão ativa no Firebase Auth, o snapshot de progresso validado permanece em estado de auditoria local (`synced_local_audit`). Assim que `onAuthStateChanged` detecta uma sessão autenticada, o sistema reconcilia e grava automaticamente os snapshots locais pendentes na coleção protegida de progresso de talentos do usuário autenticado, além de disponibilizar um botão direto de autenticação Google na barra de status de produção.
- **Painel Administrativo de Auditoria Integrado em Criadores**: O painel administrativo central passa a contar com uma aba dedicada dentro da seção **Criadores** para auditar os snapshots de progresso de talentos (`talent_progress`), oferecendo busca textual por identificador ou perfil, filtros combinados (perspectiva de atuação, nível gamificado, metas concluídas e origem Nuvem vs. Auditoria Local) e um inspetor de payload JSON canônico.
- **Isolamento Contábil e de Ambiente Inalterado**: Nenhuma operação de gamificação ou sincronização de progresso gera lançamentos no livro-razão financeiro (`ledger_entries`), e o **Modo Simulação** permanece estritamente bloqueado contra gravações remotas no Firestore.

---

## 1. Overview & Core Concept

A seção **"Seu talento vale muito!"** já apura os 5 desafios obrigatórios a partir dos contadores reais da plataforma quando em Modo Produção e valida cada snapshot contra regras estritas de esquema. No entanto, dois pontos operacionais exigiam evolução:

1. **Continuidade entre Sessão Visitante e Sessão Autenticada**: Como as regras de segurança do banco de dados exigem que o documento pertença ao próprio usuário autenticado (`isOwner`) ou a um administrador verificado (`isAdmin`), um participante que acumula atividade auditada antes de fazer login ficava retido em `synced_local_audit` até acionar manualmente uma nova sincronização após autenticar-se.
2. **Visibilidade Administrativa para Campanhas Sazonais**: Administradores verificados necessitam de uma visão consolidada para inspecionar os snapshots de progresso dos criadores e colaboradores, verificar a integridade dos contadores de mídias aprovadas, conexões, transmissões ao vivo e dias ativos, e auditar o documento bruto sem depender de consultas externas ao console do banco.

---

## 2. User Experience & Visual Design

A interface segue a estética escura de alta precisão do JOBS, com tipografia tabular (`tabular-nums`) para todos os contadores de auditoria, separação semântica clara entre estados de sincronização e hierarquia visual de elevação única.

### A. Controles de Autenticação e Reconciliação na Seção de Talentos (Modo Produção)
- **Indicador de Sessão e Nuvem**: No cabeçalho da seção de talentos, quando em Modo Produção:
  - Se o participante **não estiver autenticado** no Firebase Auth e o snapshot estiver em `synced_local_audit`, exibe a indicação de auditoria local validada acompanhada de uma ação direta **"Entrar com Google para salvar na nuvem"**.
  - Ao concluir a autenticação, um observador reativo dispara imediatamente a reconciliação da fila local para a coleção remota, atualizando o estado visual para **Sincronizado no Firestore** com o horário exato da auditoria e o identificador truncado da sessão ativa.
  - Em ambientes de teste ou janelas restritas onde o popup OAuth possa ser bloqueado pelo navegador, o sistema preserva o snapshot local intacto e exibe diagnóstico claro sem perda de estado.

### B. Aba de Auditoria de Progresso de Talentos em Criadores (Painel Central Admin)
- **Navegação Contextual**: Integrada como sub-aba na seção **7. Criadores** do Painel Central do Administrador.
- **Resumo Executivo de Auditoria (KPI Strip)**:
  - Total de snapshots auditados disponíveis (Nuvem Firestore + Auditoria Local da sessão).
  - Quantidade de participantes com todas as 5 metas concluídas no ciclo.
  - Pontuação gamificada média (claramente rotulada como pontuação não monetária).
  - Status da assinatura em tempo real com o banco de dados (`Ativa · Admin Verificado` ou `Leitura Local · Requer Admin Autenticado`).
- **Barra de Busca e Filtros Combinados**:
  - Campo de busca instantânea por `userId` ou categoria de perfil.
  - Filtro por perspectiva: **Todos**, **Produtor de Conteúdo** ou **Colaborador**.
  - Filtro por origem do registro: **Todos**, **Firestore (Nuvem)** ou **Auditoria Local**.
  - Filtro por faixa de conclusão de metas: **Todas**, **Ciclo Completo (5/5)**, **Em Andamento (1–4/5)** ou **Iniciante (0/5)**.
- **Grade de Dados de Alta Densidade & Inspetor JSON**:
  - Tabela com alinhamento numérico tabular exibindo: Participante (`userId`), Perspectiva, Nível Gamificado, Metas Concluídas (`0 de 5` a `5 de 5`), Contadores Auditados (Mídias, Ações Colab, Interações, Lives, Dias Ativos, Engajamento), Pontos (`Pts`), Origem/Status e Horário da última atualização.
  - Ação **"Inspecionar JSON"** em cada linha, abrindo um painel lateral ou gaveta expansível que exibe o payload canônico validado contra o esquema `TalentProgressSnapshot`, a chave de coleção `/talent_progress/{userId}` e o selo de conformidade de isolamento contábil (zero vínculo com `ledger_entries`).
  - Ação de **Exportação CSV** dos snapshots filtrados para conciliação de campanhas sazonais.

---

## 3. Key Product Decisions & Trade-Offs

- **Fila de Reconciliação Local Determinística vs. Gravação Anônima**:
  - *Decisão*: Manter o bloqueio contra gravações anônimas no banco de dados e armazenar o snapshot validado em fila local (`synced_local_audit`) até que `onAuthStateChanged` confirme um `uid` real.
  - *Justificativa*: Preserva o princípio do menor privilégio nas regras de segurança (`isOwner(userId) || isAdmin()`), evita poluição de documentos órfãos no Firestore e garante que nenhuma atividade legítima realizada antes do login seja perdida.
- **Leitura Administrativa Híbrida (Tempo Real Nuvem + Snapshots Locais Auditados)**:
  - *Decisão*: O painel administrativo assina a coleção remota `/talent_progress` quando o administrador está autenticado no Firebase Auth e, complementarmente, mescla os snapshots auditados localmente em memória/storage da sessão de produção, identificando explicitamente a origem de cada registro (`cloud` vs. `local_audit`).
  - *Justificativa*: Permite que o administrador audite tanto os registros persistidos no Firestore quanto o snapshot de produção corrente durante auditorias locais sem simular ou fabricar dados de nuvem.

---

## 4. Technical Architecture & Data Strategy

### A. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE INTERFACE (UI)                             │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │   Seção "Seu talento vale muito!"  │  │  Painel Central Admin          │  │
│  │   - Status Nuvem / Auditoria Local │  │  (Seção 7: Criadores)          │  │
│  │   - Botão Login Google (Produção)  │  │  - Aba Auditoria de Talentos   │  │
│  │   - Sincronização Manual & Auto    │  │  - Busca, Filtros & JSON View  │  │
│  └─────────────────┬──────────────────┘  └───────────────┬────────────────┘  │
└────────────────────┼─────────────────────────────────────┼───────────────────┘
                     │                                     │
                     ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               SERVIÇO DE AUDITORIA E RECONCILIAÇÃO DE TALENTOS               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ • Coleta determinística dos 5 desafios (Mídias, Chat, Lives, Semana)   │  │
│  │ • Fila de snapshots pendentes (synced_local_audit) em Modo Produção    │  │
│  │ • Listener de transição de Auth: reconcilia fila local -> uid real     │  │
│  │ • Agregador de leitura administrativa (Snapshots Nuvem + Local Audit)  │  │
│  └─────────────────┬─────────────────────────────────────┬────────────────┘  │
└────────────────────┼─────────────────────────────────────┼───────────────────┘
                     │                                     │
                     ▼                                     ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────────┐
│     FIREBASE AUTH & CLOUD FIRESTORE   │  │      GUARDA DE ISOLAMENTO         │
│                                       │  │                                   │
│ • onAuthStateChanged / Google Sign-In │  │ • Bloqueia Modo Simulação         │
│ • Coleção: /talent_progress/{userId}  │  │ • Zero escrita em /ledger_entries │
│ • Regras: isOwner(userId) || isAdmin()│  │ • Pontos (Pts) != R$ / 💎         │
└───────────────────────────────────────┘  └───────────────────────────────────┘
```

### B. Data Model & Reconciliação

1. **Registro de Snapshot Auditado para Inspeção Administrativa (`AuditedTalentAdminRecord`)**:
   - `userId`: Identificador do participante (`uid` do Firebase Auth ou identificador local auditado).
   - `role`: `'produtor_conteudo' | 'colaborador'`.
   - `environmentMode`: `'production'` (registros de simulação nunca entram na listagem administrativa de produção).
   - `source`: `'firestore_cloud' | 'local_audit_pending'`.
   - `cloudPersisted`: Booleano indicando confirmação de gravação remota no Firestore.
   - `collectionPath`: Caminho canônico `/talent_progress/{userId}`.
   - `approvedPublishedMediaCount`, `collaboratorVerifiedActionsCount`, `eligibleMutualAndChatInteractionsCount`, `validLiveSessionsCount`, `weeklyActiveDaysCount`, `eligibleEngagementEventsCount`: Contadores inteiros não negativos auditados.
   - `pontosConquistados`: Pontuação gamificada (`0` a `1000000`).
   - `levelNumber`: Nível gamificado (`1` a `10`).
   - `desafiosConcluidosCount`: Total de desafios concluídos (`0` a `5`).
   - `updatedAtIso`: Carimbo de tempo ISO da última auditoria/sincronização.
   - `schemaValid`: Verificação local de conformidade estrita com `isValidTalentProgressSnapshot`.

2. **Assinatura de Listagem Administrativa no Firestore**:
   - Adição de um leitor/assinante para a coleção `/talent_progress` ordenado ou limitado com tratamento seguro de permissões (`OperationType.LIST`), permitindo que administradores autenticados recebam atualizações em tempo real dos documentos gravados na nuvem e que sessões sem privilégio remoto de admin operem de forma resiliente exibindo o diagnóstico de permissão e os snapshots locais auditados.

### C. Interactive State & Action Mapping

- **Transição `synced_local_audit` $\rightarrow$ `synced_cloud` ao Autenticar**:
  - Quando o usuário clica em **"Entrar com Google"** na seção de talentos (ou quando o estado de autenticação do Firebase muda de `null` para um `FirebaseUser` válido enquanto em Modo Produção), o serviço migra os contadores auditados e dispara automaticamente a gravação de `/talent_progress/{user.uid}` para as perspectivas com snapshot local pendente, atualizando o estado da interface para `synced_cloud`.
- **Filtros e Inspetor JSON no Painel Administrativo**:
  - Alterar o texto de busca ou qualquer seletor de filtro recalcula imediatamente a lista exibida e os contadores de resumo sem recarregar a página.
  - Clicar em **"Ver JSON"** abre o inspetor detalhado do registro selecionado, com opção de copiar o JSON auditado para a área de transferência e verificar todos os 14 campos exigidos pela regra `isValidTalentProgressSnapshot`.
  - Clicar em **"Sincronizar Agora"** dentro do painel administrativo (quando autenticado) força uma nova rodada de reconciliação com o Firestore e registra a ação no log de auditoria administrativa.
