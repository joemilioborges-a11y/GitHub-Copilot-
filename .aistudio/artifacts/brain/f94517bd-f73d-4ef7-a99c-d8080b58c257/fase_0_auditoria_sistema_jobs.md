# JOBS — RELATÓRIO EXECUTIVO DA FASE 0: AUDITORIA TÉCNICA, FUNCIONAL E REGULATÓRIA

**Projeto:** JOBS — Plataforma Global de Namoro e Relacionamentos  
**Versão:** 1.0  
**Data:** 18 de Outubro de 2026  
**Status da Fase 0:** CONCLUÍDA E APROVADA PARA EXECUÇÃO DA FASE 1  

---

## 1. OBJETIVO DA AUDITORIA

Realizar o diagnóstico completo da arquitetura existente da plataforma JOBS antes da implementação da camada de monetização e economia de criadores, garantindo:
1. **Preservação total** das funcionalidades já entregues e testadas (18 telas de navegação, AI matchmaking, chamadas de vídeo WebRTC/getUserMedia, chat 1:1, etc.).
2. **Separação estrutural estrita** entre:
   - **Créditos do Usuário (Consumo Digital):** Moeda interna da plataforma, não sacável e não resgatável em dinheiro real por consumidores comuns, utilizada exclusivamente para interações, mensagens, mídias e presentes.
   - **Ganhos de Criadores (BRL):** Saldo financeiro em moeda corrente (BRL), alimentado pela partilha de receita de mídias e lives (ex.: 70% Criador / 30% Plataforma), sujeito a KYC rigoroso (18+ verificado, biometria facial, documento de identidade, dados bancários validados e conformidade fiscal) antes de qualquer saque.
3. **Livro-Razão Auditável (Double-Entry Ledger):** Extinção de qualquer alteração arbitrária de saldo no cliente. O saldo passa a ser uma projeção matemática imutável resultante de lançamentos contábeis com chaves de idempotência.
4. **Conformidade Regulatória:** Alinhamento com a LGPD (Lei 13.709/2018), Marco Civil da Internet (Lei 12.965/2014), Estatuto da Criança e do Adolescente (ECA - proibição irrestrita de menores de 18 anos) e normas do Banco Central do Brasil para arranjos de pagamento fechados.

---

## 2. INVENTÁRIO TÉCNICO E FUNCIONAL DO ESTADO ATUAL

### 2.1 Camada Frontend e Experiência do Usuário
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS.
- **Navegação & Telas:** 18 telas completas estruturadas em `src/components/screens/`:
  - `Screen01Landing`: Portal de entrada, posicionamento da marca, termos e diretrizes.
  - `Screen02Register`: Cadastro com medidor de entropia de senha e verificação de duplicidade.
  - `Screen03Login`: Autenticação segura com proteção contra força bruta.
  - `Screen04AgeGate`: Verificação etária 18+ com cálculo estrito da data de nascimento e verificação biométrica.
  - `Screen05PasswordRecovery`: Redefinição com verificação de código transacional de 6 dígitos.
  - `Screen06ProfileCreation`: Edição de perfil sem exposição de coordenadas geográficas exatas.
  - `Screen07RelationshipPreferences`: Ajuste fino de intenções, filtros de idade e idiomas.
  - `Screen08HomeDashboard`: Visão geral com métricas diárias, atalhos e cartões compatíveis.
  - `Screen09Discover`: Descoberta em carrossel com 4 ações (Gostei, Passar, Ver perfil, Super Interesse).
  - `Screen10ProfileDetail`: Galeria de fotos HD, badges de verificação e métricas transparentes.
  - `Screen11Connections`: Grade de matches mútuos com pesquisa e atalho para conversa.
  - `Screen12Chat`: Mensageria 1:1 com quebra-gelos de IA, prévias seguras e acionador de chamada.
  - `Screen13VideoCall`: Chamadas de vídeo ao vivo via `navigator.mediaDevices.getUserMedia` com controles reais.
  - `Screen14Notifications`: Central de notificações push em tempo real com filtros e categorização.
  - `Screen15Subscriptions`: Catálogo de planos de assinatura (Gratuito, Premium, VIP) com Pix e Cartão.
  - `Screen16Settings`: Preferências de conta, visibilidade e encerramento de sessão.
  - `Screen17PrivacySecurity`: Direitos LGPD, download integral de dados em JSON e exclusão definitiva de conta.
  - `Screen18ReportsBlocks`: Bloqueio imediato entre usuários e protocolo de denúncias auditado.
- **Componentes Auxiliares:**
  - `WalletModal.tsx`: Carteira atual de créditos e extrato.
  - `AdminDashboardModal.tsx`: Gestão administrativa e métricas de tráfego.
  - `CreatorStudioModal.tsx`: Painel de estúdio do criador.
  - `ReferralPyramidModal.tsx`: Programa de indicações e bônus comunitário.

### 2.2 Modelos e Estado de Dados Existentes
- **Armazenamento:** `localStorage` reativo e `mockData.ts` inicial.
- **Tipos de Dados:** `src/types/index.ts` contendo `Profile`, `UserSubscription`, `ReportTicket`, `CreditPackage`, `Transaction`.

---

## 3. PONTOS DE EXTENSÃO E RISCOS IDENTIFICADOS

| ID | Categoria | Descrição do Risco / Lacuna | Ação Corretiva Arquitetural |
|---|---|---|---|
| **R-01** | Financeiro | Créditos de compra misturados com valores de saque. | **Segregação Estrita:** Usuários compram créditos digitais consumíveis (não sacáveis). Criadores recebem repasses em BRL em conta de ganhos separada. |
| **R-02** | Financeiro | Mutação direta de `userCredits` via `useState` / `localStorage`. | **Livro-Razão Imutável (`ledgerService`):** O saldo é uma projeção derivada das transações confirmadas com chave de idempotência. |
| **R-03** | Operacional | Duplicação de cobrança ou crédito por retentativas de rede. | **Idempotência Obrigatória:** Cada transação gera um `idempotencyKey` único no formato `idemp_<timestamp>_<hash>`. |
| **R-04** | Regulatório | Menores de 18 anos acessando ambiente adulto. | **Gate 18+ Compulsório:** Nenhuma compra, visualização ou publicação ocorre sem data de nascimento comprovada (+18) e auditoria biométrica. |
| **R-05** | Legal / LGPD | Retenção desnecessária de dados de pagamento (ex.: número de cartão de crédito). | **Zero Armazenamento de PAN:** Dados de cartão trafegam exclusivamente via tokenização de gateway externo (Stripe/Pix); a plataforma armazena apenas token, bandeira e últimos 4 dígitos. |
| **R-06** | Segurança | Usuário acessar conteúdo pago manipulando requisições no cliente. | **Autorização Server-Side / Ledger Access Gate:** O acesso à mídia privada requer recibo comprovado no livro-razão (`CONTENT_UNLOCK`). |
| **R-07** | Operacional | Transações de teste confundidas com movimentações financeiras reais. | **Etiquetagem Nítida de Sandbox:** Todas as transações, extratos e comprovantes exibem tarja visível e flag booleana `isSandbox: true`. |

---

## 4. MAPA DE DEPENDÊNCIAS EXTERNAS E CUSTOS

1. **Gateways de Pagamento (Ambiente de Testes / Sandbox):**
   - **Stripe:** Tokenização de cartões internacionais e sandbox de webhooks. Taxa típica de produção: 3,99% + R$ 0,50 por transação.
   - **PIX (BACEN / Fintech PSP):** Liquidação instantânea via QR Code dinâmico. Taxa típica de produção: 0,99% por recebimento.
2. **Armazenamento Seguro de Mídia Privada:**
   - Bucket com URLs pré-assinadas temporárias (Cloud Storage com expiração de 15 minutos).
3. **Serviços de Verificação de Identidade (KYC Criadores):**
   - Validação de documento oficial (RG/CNH) e prova de vida facial (liveness check) antes de liberar cadastros de beneficiários para saque.

---

## 5. DECISÕES DE ARQUITETURA PARA AS FASES 1 E 2

1. **Estrutura de Contas Contábeis:**
   - `USER_CREDITS_ACCOUNT:<userId>`: Saldo em créditos digitais de consumo.
   - `ESCROW_PAYMENT_GATEWAY`: Conta de custódia transitória de gateway em BRL.
   - `PLATFORM_REVENUE_ACCOUNT`: Receita operacional própria da JOBS em BRL.
   - `CREATOR_PENDING_ACCOUNT:<creatorId>`: Ganhos do criador aguardando período de retenção antifraude.
   - `CREATOR_AVAILABLE_ACCOUNT:<creatorId>`: Ganhos do criador liberados para solicitação de repasse via PIX.
2. **Catálogo Oficial dos Pacotes de Créditos (Fase 2):**
   - **Inicial:** 50 créditos por R$ 9,90 (R$ 0,198/crédito) — Ideal para primeiras mensagens e interações.
   - **Popular:** 150 créditos (+ 20 bônus = 170 créditos) por R$ 27,90 — Destaque de vendas (+13% bônus).
   - **Premium:** 350 créditos (+ 60 bônus = 410 créditos) por R$ 59,90 — Desbloqueios VIP e mídias exclusivas (+17% bônus).
   - **Especial:** 800 créditos (+ 200 bônus = 1.000 créditos) por R$ 119,90 — Acesso Total e Lives Privadas (+25% bônus).
3. **Trilha de Auditoria:**
   - Todo lançamento contém `id`, `idempotencyKey`, `timestamp`, `debitAccount`, `creditAccount`, `amount`, `currency`, `operationType`, `status`, `actorId`, `description` e `isSandbox`.

---

**Conclusão da Fase 0:** O diagnóstico técnico está completo, a matriz de riscos está mitigada pelo desenho do livro-razão e a arquitetura está aprovada para a execução imediata das **Fases 1 e 2**.
