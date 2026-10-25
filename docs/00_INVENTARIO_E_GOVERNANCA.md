# JOBS 1.0 — GOVERNANÇA, AMBIENTES E INVENTÁRIO TÉCNICO INICIAL
**Fase 0 — Plano Técnico Priorizado de Evolução**
**Data de Emissão:** 18 de Outubro de 2026  
**Responsável Técnico:** Líder Técnico & Engenheiro Chefe de Arquitetura

---

## 1. Inventário Técnico Inicial (Tarefa 0.1)

### 1.1 Stack de Frontend & Tecnologias
- **Framework Principal:** React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`)
- **Linguagem & Tipagem:** TypeScript 5.8 / 7.0 (`typescript: ^7.0.2`, `tsc --noEmit` para validação estrita)
- **Bundler & Build Tool:** Vite 8.3 (`vite: ^8.3.0`, `@vitejs/plugin-react: ^6.1.1`)
- **Estilização & Design System:** Tailwind CSS v4 (`tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`)
- **Ícones & Micro-interações:** Lucide React (`lucide-react: ^0.546.0`)
- **Visualização de Dados & Métricas:** Recharts (`recharts: ^3.10.1`)
- **Exportação de Relatórios & PDF:** jsPDF (`jspdf: ^4.2.1`) e jsPDF AutoTable (`jspdf-autotable: ^5.0.9`)
- **Efeitos de Celebração:** Canvas Confetti (`canvas-confetti: ^1.9.4`, `@types/canvas-confetti: ^1.9.0`)
- **IA Generativa & Interações:** Google Gen AI SDK (`@google/genai: ^2.4.0`)
- **Servidor & Runtime:** Node.js 22.x com Express (`express: ^4.21.2`, `tsx: ^4.21.0`)

### 1.2 Estrutura de Diretórios e Componentes
```
├── docs/                             # Documentação técnica, governança e auditoria
├── src/
│   ├── assets/
│   │   └── images/                   # Imagens auditadas de perfis e ensaios
│   ├── components/
│   │   ├── screens/                  # 18 Telas completas da especificação JOBS 1.0
│   │   │   ├── Screen01Landing.tsx
│   │   │   ├── Screen02Register.tsx
│   │   │   ├── Screen03Login.tsx
│   │   │   ├── Screen04AgeGate.tsx
│   │   │   ├── Screen05PasswordRecovery.tsx
│   │   │   ├── Screen06ProfileCreation.tsx
│   │   │   ├── Screen07RelationshipPreferences.tsx
│   │   │   ├── Screen08HomeDashboard.tsx
│   │   │   ├── Screen09Discover.tsx
│   │   │   ├── Screen10ProfileDetail.tsx
│   │   │   ├── Screen11Connections.tsx
│   │   │   ├── Screen12Chat.tsx
│   │   │   ├── Screen13VideoCall.tsx
│   │   │   ├── Screen14Notifications.tsx
│   │   │   ├── Screen15Subscriptions.tsx
│   │   │   ├── Screen16Settings.tsx
│   │   │   ├── Screen17PrivacySecurity.tsx
│   │   │   └── Screen18ReportsBlocks.tsx
│   │   ├── Navbar.tsx                # Barra de navegação com marca JOBS e acesso rápido
│   │   ├── BottomNavigation.tsx      # Navegação móvel responsiva (Android/iOS)
│   │   ├── ScreenSwitcherModal.tsx   # Navegador das 18 telas com 1 clique
│   │   ├── AdminDashboardModal.tsx   # Painel administrativo, moderação e métricas agregadas
│   │   ├── WalletModal.tsx           # Carteira, recargas Stripe/Pix e divisão contábil 50/50
│   │   ├── MatchCelebrationModal.tsx # Celebração de match mútuo
│   │   └── ReferralPyramidModal.tsx  # Programa viral de afiliados e recompensas
│   ├── data/
│   │   ├── mockData.ts               # Dados auditados de perfis, transações e métricas
│   │   ├── interestTags.ts           # Dicionário de tags e interesses
│   │   ├── prestigeData.ts           # Sistema de tiers e medalhas de prestígio
│   │   └── referralData.ts           # Estrutura contábil e níveis de indicação
│   ├── types/
│   │   └── index.ts                  # Interfaces TypeScript centralizadas
│   ├── utils/
│   │   ├── aiMatchmaking.ts          # Algoritmo explicável de afinidade e quebra-gelos
│   │   ├── analytics.ts              # Google Analytics, contadores e telemetria anônima
│   │   ├── pdfExport.ts              # Geração de demonstrativos em PDF
│   │   └── soundEffects.ts           # Efeitos sonoros opcionais
│   ├── App.tsx                       # Orquestrador de estado e telas
│   ├── index.css                     # Configurações globais Tailwind v4
│   └── main.tsx                      # Entrypoint React
├── index.html                        # Meta tags SEO e viewport mobile
├── metadata.json                     # Metadados e permissões da plataforma
├── package.json                      # Dependências e scripts
├── tsconfig.json                     # Configurações de compilação TypeScript
└── vite.config.ts                    # Configuração Vite e alias de caminhos
```

### 1.3 Mapa de Ambientes e Variáveis de Configuração
- **Ambiente de Desenvolvimento:** Servidor local Vite (`port: 3000`, `host: 0.0.0.0`), Cloud Run dev container.
- **Ambiente de Homologação / Staging:** Build estático otimizado (`npm run build -> dist`), deploy em preview container.
- **Ambiente de Produção:** Cloud Run gerenciado com TLS/HTTPS, terminação SSL e CDN.
- **Variáveis de Configuração (armazenadas em `.env.example`, sem segredos no código):**
  - `GEMINI_API_KEY`: Chave de API protegida para chamadas do modelo Gemini (injetada via segredos do ambiente).
  - `APP_URL`: URL canônica do applet no Cloud Run.
  - `DISABLE_HMR`: Flag de controle de recarga a quente no ambiente de compilação.

---

## 2. Fluxo Seguro de Desenvolvimento (Tarefa 0.2)

### 2.1 Estratégia de Branches e Revisão
- `main`: Branch de produção estável. Qualquer alteração exige aprovação de build e lint.
- `staging`: Branch de homologação para validação cruzada entre equipes (QA, UX, Compliance).
- `feature/*`: Branches de funcionalidades específicas alinhadas ao backlog priorizado.

### 2.2 Pipeline de Integração e Verificação (CI/CD)
1. **Linting Estrito:** `npm run lint` (`tsc --noEmit`) para verificação estática de tipos e detecção de quebras de contrato.
2. **Build de Produção:** `npm run build` (`vite build`) para validação de bundling e tree-shaking.
3. **Rollback Imediato:** Capacidade de reverter commits ou tags pontuais sem perda de integridade dos dados armazenados no cliente/servidor.

### 2.3 Gestão de Segredos e Diretrizes Anti-Vazamento
- Nenhuma chave privada, token de webhook ou segredo bancário/PIX deve constar no código do cliente.
- Credenciais sensíveis trafegam exclusivamente por variáveis de ambiente injetadas em tempo de execução via proxy ou segredos de servidor.
