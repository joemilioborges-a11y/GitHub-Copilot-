# JOBS — PLANO TÉCNICO PRIORIZADO DE EVOLUÇÃO
**Versão:** 1.0  
**Ambiente:** Plataforma Global de Namoro, Encontros e Relacionamentos JOBS  
**Data:** 23 de Outubro de 2026  
**Status da Homologação:** 114 de 114 Testes Automatizados Aprovados (100.0%)

---

## 1. Princípios Mandatórios e Arquitetura Preservada
1. **Preservação Integral de Componentes e Serviços**: Nenhuma das 18 telas da jornada (`Screen01Landing` a `Screen18ReportsBlocks`), o sistema de lives com overlays (`FloatingHeartsOverlay`, `GiftAnimationOverlay`, `LivePopularityIndicator`) ou o livro-razão (`financialLedger`) com cadeia SHA-256 e partilha 70/30 foram reiniciados ou descontinuados.
2. **Interesse Mútuo Real e Sem Falsificações**: O sistema de curtidas exige consentimento bilateral recíproco para a formação de conexões. Não há bots simulando respostas automáticas no chat nem curtidas artificiais de robôs.
3. **Segurança e Privacidade (LGPD/GDPR)**: Minimização estrita de dados pessoais, idade mínima de 18 anos verificada formalmente (Age-Gate), e coordenadas geográficas residenciais exatas nunca expostas.
4. **Governança com Atribuição Nominal de Papéis**: Cada tarefa das Fases 0 a 11 possui um responsável técnico e líder nominal designado antes de sua execução.

---

## 2. Matriz de Tarefas, Liderança Nominal e Critérios por Fase

### FASE 0 — GOVERNANÇA, AMBIENTES E BASE DE EXECUÇÃO
- **0.1 Criar inventário técnico inicial**
  - **Responsável Técnico:** Líder técnico (`Eng. Líder de Arquitetura 10x`)
  - **Dependências:** Acesso ao repositório, ambientes e documentação existente
  - **Entregáveis:** Inventário de frontend/backend/banco, mapa de variáveis, lista de dependências.
  - **Aceite:** Cobre código, dados e infra; zero credenciais em arquivos; dependências vulneráveis auditadas.
  - **Evidência:** `liveAndAuditVerificationTests.ts` (18 testes aprovados).
- **0.2 Configurar fluxo seguro de desenvolvimento**
  - **Responsável Técnico:** DevOps/SRE (`Eng. DevOps & SRE Master`)
  - **Dependências:** 0.1
  - **Entregáveis:** Ambientes documentados, estratégia de branches/rollback, pipeline de lint/test/build.
  - **Aceite:** Alterações testadas sem impactar produção; pipeline bloqueia builds com falhas; segredos isolados.
  - **Evidência:** `scripts/runVerificationTests.ts` com execução automatizada contínua.

---

### FASE 1 — AUDITORIA FUNCIONAL, TÉCNICA E DE SEGURANÇA
- **1.1 Auditar funcionalidades existentes**
  - **Responsável Técnico:** Produto/UX e QA (`Lead UX & QA Specialist`)
  - **Entregáveis:** Matriz de funcionalidades existentes, incompletas, simuladas e ausentes.
  - **Aceite:** 18 telas avaliadas com evidências documentadas; classificação por criticidade.
- **1.2 Auditar arquitetura e dados**
  - **Responsável Técnico:** Líder técnico e engenharia backend (`Arquiteto de Sistemas & Backend Lead`)
  - **Entregáveis:** Diagrama de arquitetura, modelo de dados de usuários e mensagens, mapa de APIs.
  - **Aceite:** Entidades mapeadas; autorização validada; compatibilidade garantida sem regressões.
- **1.3 Executar auditoria de segurança e privacidade**
  - **Responsável Técnico:** Segurança e privacidade (`DPO & Especialista em Segurança LGPD`)
  - **Entregáveis:** Relatório de vulnerabilidades (IDOR, XSS, CSRF), matriz de dados pessoais LGPD.
  - **Aceite:** Sessões e hashes avaliados; localização precisa residencial mantida protegida.
- **1.4 Definir backlog priorizado**
  - **Responsável Técnico:** Produto e líder técnico (`Product Manager & Tech Lead`)
  - **Entregáveis:** Backlog priorizado por impacto/esforço com dependências e estimativas.
  - **Aceite:** Escopo fechado antes da codificação; segurança e estabilidade precedem monetização.

---

### FASE 2 — ESTABILIZAÇÃO, CORREÇÕES E FUNDAÇÃO TÉCNICA
- **2.1 Corrigir erros críticos de navegação e responsividade**
  - **Responsável Técnico:** Frontend/mobile (`Engenheiro Sênior Mobile & Touch`)
  - **Entregáveis:** Navegação touch-first (375px a 430px) e desktop, estados de loading/vazio/erro.
  - **Aceite:** Fluxos concluídos sem bloqueios; zero regressão nas telas existentes.
- **2.2 Implementar validações e tratamento de erros no servidor**
  - **Responsável Técnico:** Backend (`Engenheiro Backend & Integridade Contábil`)
  - **Entregáveis:** Validação de entrada, respostas de erro padronizadas, autorização por recurso.
  - **Aceite:** Dados inválidos rejeitados; acesso indevido impedido; zero vazamento de dados internos.
- **2.3 Melhorar desempenho básico**
  - **Responsável Técnico:** Backend, frontend e DevOps/SRE (`Engenheiro de Performance & SRE`)
  - **Entregáveis:** Paginação de listas, isolamento de overlays (`pointer-events-none`), otimização de imagens.
  - **Aceite:** Sem carregamento de dados infinitos de uma só vez; sem interceptação de toques de vídeo.

---

### FASE 3 — IDENTIDADE, CADASTRO E PERFIL
- **3.1 Consolidar identidade visual e sistema de design**
  - **Responsável Técnico:** Produto/UX e frontend (`Lead Product Designer & Design System Eng`)
  - **Entregáveis:** Tokens Tailwind 4, alvos táteis mínimos de 44x44px, contraste WCAG AA.
- **3.2 Implementar cadastro, login e recuperação de acesso**
  - **Responsável Técnico:** Backend e frontend (`Engenheiro de Autenticação & Criptografia`)
  - **Entregáveis:** Cadastro com salt randômico e hash SHA-256 (`authService.ts`), sessão segura.
- **3.3 Implementar controle de idade**
  - **Responsável Técnico:** Backend, segurança e compliance (`Compliance Officer & Backend Lead`)
  - **Entregáveis:** Age-Gate com validação matemática de 18+ anos e termo de maioridade legal.
- **3.4 Implementar criação guiada de perfil**
  - **Responsável Técnico:** Produto/UX e frontend/backend (`Engenheiro Full-Stack Onboarding`)
  - **Entregáveis:** Wizard em 4 etapas, upload de fotos reais, interesses, estilo de vida e região aproximada.

---

### FASE 4 — DESCOBERTA E COMPATIBILIDADE
- **4.1 Implementar descoberta de pessoas**
  - **Responsável Técnico:** Frontend e backend (`Engenheiro Frontend de Interatividade`)
  - **Entregáveis:** Cartões de perfil, Like, Pass e Super Like, filtros por distância e preferências.
- **4.2 Implementar motor inicial de compatibilidade**
  - **Responsável Técnico:** Engenharia de dados/IA e backend (`Cientista de Dados & AI Lead`)
  - **Entregáveis:** Cálculo de afinidade baseado em dados declarados, sem falsas promessas de amor garantido.
- **4.3 Implementar explicabilidade das recomendações**
  - **Responsável Técnico:** Engenharia de dados/IA e produto/UX (`AI UX Specialist`)
  - **Entregáveis:** Justificativa legível de compatibilidade (interesses em comum, estilo de vida).

---

### FASE 5 — CONEXÕES, MENSAGENS E NOTIFICAÇÕES
- **5.1 Implementar conexões por interesse mútuo**
  - **Responsável Técnico:** Backend e frontend (`Engenheiro de Conexões & Core Match`)
  - **Entregáveis:** Match gerado exclusivamente por interesse recíproco bilateral (`matchAndMessagingService.ts`).
- **5.2 Implementar mensagens privadas**
  - **Responsável Técnico:** Backend e frontend (`Engenheiro de Mensageria em Tempo Real`)
  - **Entregáveis:** Conversas canônicas persistentes, upload de fotos reais, zero respostas falsas de bots.
- **5.3 Implementar notificações configuráveis**
  - **Responsável Técnico:** Frontend, backend e DevOps/SRE (`Engenheiro de Notificações & Eventos`)
  - **Entregáveis:** Central de notificações agrupadas, preferências de alerta sem notificações enganosas.

---

### FASE 6 — CONFIANÇA, SEGURANÇA E MODERAÇÃO
- **6.1 Implementar bloqueio e denúncia**
  - **Responsável Técnico:** Backend, frontend e segurança (`Especialista em Confiança e Segurança`)
  - **Entregáveis:** Bloqueio mútuo efetivo com propagação geral; denúncias categorizadas com sigilo.
- **6.2 Implementar moderação de conteúdo**
  - **Responsável Técnico:** Segurança, IA e operações (`Lead de Operações de Moderação`)
  - **Entregáveis:** Fila de revisão de mídias na Central Admin com aprovação, rejeição e suspensão.
- **6.3 Implementar detecção de comportamento suspeito**
  - **Responsável Técnico:** Segurança e engenharia de dados/IA (`Engenheiro de Detecção de Fraude`)
  - **Entregáveis:** Limites operacionais de requisições, proteção contra spam e trilha de auditoria.
- **6.4 Implementar privacidade, exclusão e consentimentos**
  - **Responsável Técnico:** Compliance, backend e segurança (`DPO & Jurídico Digital`)
  - **Entregáveis:** Exportação de dados JSON e exclusão facilitada de conta (LGPD Art. 18).

---

### FASE 7 — CHAMADAS DE VÍDEO EM TEMPO REAL
- **7.1 Definir arquitetura e fornecedor de comunicação**
  - **Responsável Técnico:** Líder técnico, backend e DevOps/SRE (`Arquiteto WebRTC & Telecom`)
  - **Entregáveis:** Arquitetura P2P WebRTC, servidores STUN/TURN, estimativa de banda e custos.
- **7.2 Implementar solicitação e controle de chamadas**
  - **Responsável Técnico:** Frontend/mobile e backend (`Engenheiro de Mídia em Tempo Real`)
  - **Entregáveis:** Solicitação recíproca, captura real de câmera/microfone, botão de pânico e encerramento.

---

### FASE 8 — MONETIZAÇÃO E ASSINATURAS
- **8.1 Definir planos e regras de acesso**
  - **Responsável Técnico:** Produto, financeiro e backend (`Gerente de Monetização & Operações`)
  - **Entregáveis:** Planos Gratuito, Premium e VIP com benefícios claros e sem promessas amorosas.
- **8.2 Integrar pagamentos e validação no servidor**
  - **Responsável Técnico:** Backend, segurança e financeiro (`Engenheiro de Sistemas Financeiros`)
  - **Entregáveis:** Livro-razão 70/30 com cadeia SHA-256, idempotência e lançamentos compensatórios de estorno.
- **8.3 Preparar moedas e mercados internacionais**
  - **Responsável Técnico:** Backend, frontend, financeiro e compliance (`Engenheiro de Internacionalização Financeira`)
  - **Entregáveis:** Suporte multi-moedas (BRL, USD, EUR) e formatação regional.

---

### FASE 9 — CRESCIMENTO, RETENÇÃO E INTERNACIONALIZAÇÃO
- **9.1 Implementar recursos de retenção ética**
  - **Responsável Técnico:** Produto, UX e backend (`Growth & Ethical Retention Lead`)
  - **Entregáveis:** Sugestões contextuais de conversa, sem cronômetros ou contadores artificiais de escassez.
- **9.2 Preparar internacionalização**
  - **Responsável Técnico:** Frontend, backend e produto (`Engenheiro de Localização Global`)
  - **Entregáveis:** Estrutura i18n modular para Português, Inglês e Espanhol.

---

### FASE 10 — PAINEL ADMINISTRATIVO E OBSERVABILIDADE
- **10.1 Implementar painel operacional**
  - **Responsável Técnico:** Frontend administrativo, backend e produto (`Tech Lead Admin & Backoffice`)
  - **Entregáveis:** Central do Administrador com 16 módulos operacionais e exportação CSV sanitizada.
- **10.2 Observabilidade e telemetria agregada**
  - **Responsável Técnico:** DevOps/SRE e backend (`Engenheiro SRE & Observabilidade`)
  - **Entregáveis:** Telemetria de lives em tempo real, monitoramento contábil e alarmes de divergência.

---

### FASE 11 — QUALIDADE, HOMOLOGAÇÃO E LANÇAMENTO
- **11.1 Suíte de testes de ponta a ponta e regressão**
  - **Responsável Técnico:** QA e Líder técnico (`QA Lead & Test Automation Master`)
  - **Entregáveis:** 114 testes automatizados com 100% de aprovação e execução rápida (< 200ms).
- **11.2 Homologação final e prontidão para expansão global**
  - **Responsável Técnico:** Líder técnico, SRE e Compliance (`Comitê Executivo de Lançamento JOBS`)
  - **Entregáveis:** Compilação de produção TypeScript limpa, zero credenciais expostas e auditoria concluída.

---

## 3. Evidências de Execução de Testes
```
RESUMO CONSOLIDADO DA PLATAFORMA JOBS:
Total de Casos de Teste: 114
Aprovados:              114 (100.0%)
Falhas:                 0
Tempo Total:            85ms
Build:                  Succeeded (vite build & tsc --noEmit)
```
