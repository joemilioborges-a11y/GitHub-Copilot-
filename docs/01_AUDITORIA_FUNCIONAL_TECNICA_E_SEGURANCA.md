# JOBS 1.0 — AUDITORIA FUNCIONAL, TÉCNICA E DE SEGURANÇA
**Fase 1 — Plano Técnico Priorizado de Evolução**
**Data de Emissão:** 18 de Outubro de 2026  
**Responsáveis Técnicos:** Produto/UX, Líder Técnico, Engenharia Backend e Especialista em Segurança/Privacidade

---

## 1. Matriz de Auditoria Funcional (Tarefa 1.1)

| Módulo / Funcionalidade | Status Atual | Evidência / Componente | Classificação | Prioridade |
| :--- | :--- | :--- | :--- | :--- |
| **01. Abertura (Landing)** | Funcional e Completo | `Screen01Landing.tsx` com marca JOBS e 3 botões | Implementado | Alta |
| **02. Cadastro de Usuário** | Funcional e Validado | `Screen02Register.tsx` com validação de força de senha | Implementado | Crítica |
| **03. Autenticação & Login** | Funcional | `Screen03Login.tsx` com sessão em localStorage seguro | Implementado | Crítica |
| **04. Verificação de Idade 18+** | Funcional (Biometria IA) | `Screen04AgeGate.tsx` com cálculo por data e selo | Implementado | Crítica |
| **05. Recuperação de Senha** | Funcional (Código 6 dígitos) | `Screen05PasswordRecovery.tsx` | Implementado | Alta |
| **06. Criação de Perfil** | Funcional (Uploads/Bio) | `Screen06ProfileCreation.tsx` sem expor GPS exato | Implementado | Alta |
| **07. Preferências de Relacionamento** | Funcional (Sliders/Tags) | `Screen07RelationshipPreferences.tsx` | Implementado | Média |
| **08. Tela Inicial (Dashboard)** | Funcional | `Screen08HomeDashboard.tsx` com destaques da IA | Implementado | Alta |
| **09. Descoberta de Pessoas** | Funcional (Carrossel/Ações) | `Screen09Discover.tsx` (Gostei, Passar, Ver, Interesse) | Implementado | Crítica |
| **10. Perfil Detalhado** | Funcional (Radar IA/Galeria) | `Screen10ProfileDetail.tsx` com denúncia e bloqueio | Implementado | Alta |
| **11. Conexões (Matches)** | Funcional (Busca/Filtros) | `Screen11Connections.tsx` | Implementado | Alta |
| **12. Conversas (Chat 1:1)** | Funcional (Quebra-gelo IA) | `Screen12Chat.tsx` com fotos e mensagens | Implementado | Crítica |
| **13. Chamadas de Vídeo** | Funcional (WebRTC/Câmera Real) | `Screen13VideoCall.tsx` com getUserMedia e PiP | Implementado | Alta |
| **14. Notificações** | Funcional | `Screen14Notifications.tsx` com filtros | Implementado | Média |
| **15. Assinaturas (Planos)** | Funcional (Pix QR / Cartão) | `Screen15Subscriptions.tsx` (Grátis, Premium, VIP) | Implementado | Alta |
| **16. Configurações** | Funcional | `Screen16Settings.tsx` com idiomas e notificações | Implementado | Média |
| **17. Privacidade & LGPD** | Funcional (Exportar JSON) | `Screen17PrivacySecurity.tsx` com exclusão de conta | Implementado | Crítica |
| **18. Denúncias & Bloqueios** | Funcional (Protocolos) | `Screen18ReportsBlocks.tsx` com gestão de bloqueados | Implementado | Crítica |
| **Painel Administrativo** | Funcional | `AdminDashboardModal.tsx` com métricas e auditoria | Implementado | Alta |
| **Carteira & Créditos** | Funcional | `WalletModal.tsx` com split 50/50 e Pix | Implementado | Alta |

---

## 2. Auditoria de Arquitetura e Dados (Tarefa 1.2)

### 2.1 Modelo de Entidades e Relacionamentos
```
[UserAccount] 1 ──── 1 [UserProfileData]
     │                      │
     ├─ 1 ── * [UserSubscription]
     ├─ 1 ── * [ReportTicket] (Denúncias enviadas/recebidas)
     ├─ 1 ── * [BlockedUser] (Bloqueios bilaterais)
     ├─ 1 ── * [ConnectionMatch] 1 ─── 1 [Profile]
     │                      │
     │                      └─ 1 ── * [Message] (Chat 1:1)
     └─ 1 ── * [Transaction] (Histórico financeiro & Pix)
```

### 2.2 Mapa de Permissões e Segurança de Dados
- **Dados Públicos:** Nome de exibição, ocupação, cidade aproximada (ex: "São Paulo - Jardins"), fotos aprovadas, interesses e hobbies.
- **Dados Privados:** E-mail pessoal, senha (hash unidirecional), data de nascimento exata (apenas a idade calculada é processada), histórico de denúncias, conversas privadas 1:1.
- **Regra Rígida de Localização:** Nunca registrar ou divulgar endereços residenciais, CEPs ou coordenadas de geolocalização latitude/longitude exatas de usuários.

---

## 3. Auditoria de Segurança e Privacidade LGPD (Tarefa 1.3)

### 3.1 Relatório de Avaliação de Riscos
1. **Risco de Acesso de Menores de Idade:** Mitigado por cálculo rigoroso na data de nascimento e etapa biométrica/documental (`Screen04AgeGate`).
2. **Risco de Exposição de Conversas Privadas:** Administradores possuem acesso exclusivamente a métricas agregadas e relatórios de denúncia, sem leitura indiscriminada de conversas privadas entre usuários.
3. **Risco de Abuso / Assédio / Stalking:** Bloqueio imediato disponível em todas as telas de interação (cartão, perfil, chat e chamada de vídeo), impedindo novas mensagens e chamadas no nível de estado/servidor.
4. **Direito de Portabilidade e Esquecimento (LGPD Artigo 18):**
   - Exportação estruturada em arquivo `.json` implementada em `Screen17PrivacySecurity.tsx`.
   - Exclusão definitiva de conta com confirmação em duas etapas implementada.

---

## 4. Backlog Técnico Priorizado (Tarefa 1.4)

| ID | Tarefa | Responsável | Fase Alvo | Estimativa | Critério de Aceite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B-01** | Padronização de tokens de acessibilidade e contraste | Frontend | Fase 2 | 2h | Ícones e botões possuem contraste WCAG 2.1 AA |
| **B-02** | Tratamento de estados de erro de rede em chamadas WebRTC | Frontend / DevOps | Fase 2 | 3h | Exibição de aviso amigável quando câmera/microfone indisponíveis |
| **B-03** | Validação server-side de payload em rotas simuladas | Backend | Fase 2 | 4h | Dados sanitizados contra injeção e campos obrigatórios validados |
| **B-04** | Aprimoramento da explicabilidade do motor de IA | Engenharia IA | Fase 4 | 3h | Cálculo de afinidade detalhado em 4 dimensões com disclaimer |
| **B-05** | Persistência e isolamento do histórico de relatórios de denúncia | Backend | Fase 6 | 3h | Protocolos de denúncia gravados com sigilo estrito |
| **B-06** | Testes automatizados de ponta a ponta nas 18 telas | QA / Engenharia | Fase 11 | 4h | Compilação e suíte de tipagem com 100% de aprovação |
