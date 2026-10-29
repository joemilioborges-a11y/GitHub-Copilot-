# JOBS — Relatório de Desbloqueio do Release com CI Verificável (Fases 1 a 5)

**Branch de trabalho**: `release/gate-final-android-qa`
**Branch `main` (intocada)**: `da7275802019442ed17492b513850402409e2565`
**Status da aprovação para publicação na Google Play**: **NÃO APROVADO PARA PUBLICAÇÃO IMEDIATA** (bloqueadores objetivos listados na Fase 5).

---

## Fase 1 — Inspeção Técnica do Ambiente e Repositório

### 1.1 Arquivos inspecionados
- `package.json` e `package-lock.json`
- `tsconfig.json`
- `capacitor.config.ts`
- `android/build.gradle`, `android/variables.gradle`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/gradle/wrapper/gradle-wrapper.properties`, `android/gradlew`
- `.github/workflows/deno.yml` e `.github/workflows/gradle-publish.yml` (presentes no commit `da72758` da `main`)
- `.github/workflows/android-release-gate.yml`
- `scripts/runVerificationTests.ts` e suítes em `src/utils/*VerificationTests.ts`

### 1.2 Gerenciador de pacotes e matriz de versões compatíveis
| Componente | Configuração Encontrada | Evidência no Repositório |
|---|---|---|
| **Gerenciador de Pacotes** | `npm` com lockfile v3 (`package-lock.json`) | `package.json` + `package-lock.json` na raiz |
| **Node.js** | `22.x` | `@types/node: ^22.14.0`, Vite `^8.3.0`, TypeScript `^7.0.2` |
| **Java / JDK** | **JDK 21** (`JavaVersion.VERSION_21`) | `android/capacitor-cordova-android-plugins/build.gradle` e `@capacitor/android: ^8.5.3` |
| **Gradle Wrapper** | `Gradle 8.14.3` + AGP `8.13.0` | `android/gradle/wrapper/gradle-wrapper.properties` e `android/build.gradle` |
| **Android SDK** | `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36` | `android/variables.gradle` |
| **Identificador do Pacote** | `com.jobs.app` (`webDir: 'dist'`) | `capacitor.config.ts` e `android/app/build.gradle` |

### 1.3 Diagnóstico dos workflows legados (em `main`)
- **`.github/workflows/deno.yml`**: configurava `denoland/setup-deno@v2` e executava `deno test`, incompatível com a stack React + Vite + Node.js/TypeScript (`tsx`).
- **`.github/workflows/gradle-publish.yml`**: executava `./gradlew build` na raiz do repositório (onde `./gradlew` não existe; o wrapper fica em `android/gradlew`) e tentava publicar pacotes Maven no GitHub Packages.
- **Solução aplicada na branch `release/gate-final-android-qa`**: remoção dos dois templates incompatíveis e consolidação em `.github/workflows/android-release-gate.yml`.

---

## Fase 2 — Pipeline Web Reprodutível com Captura de Logs

O job **`web-pipeline`** em `.github/workflows/android-release-gate.yml` foi estruturado com `set -o pipefail`, gravação individual de logs em `ci-logs/`, registro de status em `ci-logs/step-status.txt`, anotações `::error` indicando exatamente a etapa que falhou e upload de artefatos (`if: always()`):

1. **Instalação reproduzível (`npm ci`)** -> `ci-logs/01-npm-ci.log`
2. **Execução da suíte de testes (`npm run test`)** -> `ci-logs/02-npm-test.log`
3. **Verificação TypeScript (`npm run typecheck`)** -> `ci-logs/03-typecheck.log`
4. **Build Web de produção (`npm run build`)** -> `ci-logs/04-web-build.log`
5. **Publicação de resumo (`$GITHUB_STEP_SUMMARY`) e upload de `jobs-web-pipeline-logs`**

---

## Fase 3 — Validação Android (`com.jobs.app`)

O job **`android-validation`** (`needs: web-pipeline`) executa em runner `ubuntu-latest` com Node.js 22, JDK 21 (Temurin) e Android SDK (`android-actions/setup-android@v3`):

1. **Build Web + Sincronização Capacitor (`npm ci && npm run build:android`)** -> `ci-logs-android/05-cap-sync-android.log`
2. **Auditoria automatizada do pacote `com.jobs.app`** -> `ci-logs-android/06-android-config-check.log`
   - Confirma `appId: 'com.jobs.app'`, `minSdkVersion = 24`, `targetSdkVersion = 36`, permissões `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` e `<uses-feature android:required="false" />`.
3. **Compilação Android (`./android/gradlew -p android assembleDebug --stacktrace`)** -> `ci-logs-android/07-gradle-assemble-debug.log`
4. **Upload dos logs e do APK de debug (`jobs-android-validation-artifacts`)**

### Pendências identificadas de versão, permissões, ícones e assinatura
- **Versão**: Configurada em `android/app/build.gradle` como `versionCode 1` e `versionName "1.0.0"`. Deve ser incrementada a cada novo upload no Google Play Console.
- **Permissões**: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `READ_MEDIA_IMAGES` e `READ_EXTERNAL_STORAGE (maxSdkVersion=32)` declaradas em `AndroidManifest.xml`, com `<uses-feature>` de câmera e microfone marcadas como `android:required="false"`.
- **Ícones**: A estrutura XML de ícones adaptativos (`mipmap-anydpi-v26/ic_launcher.xml` e `ic_launcher_round.xml`) está presente, porém os PNGs/WebPs em `mipmap-*` ainda são os **ícones padrão do template Capacitor** — devem ser substituídos pela arte oficial da marca JOBS antes da listagem pública na loja.
- **Assinatura de Release**: `android/app/build.gradle` lê `JOBS_UPLOAD_STORE_FILE`, `JOBS_UPLOAD_STORE_PASSWORD`, `JOBS_UPLOAD_KEY_ALIAS` e `JOBS_UPLOAD_KEY_PASSWORD` exclusivamente de variáveis de ambiente. Nenhuma keystore ou senha foi gravada no repositório.

---

## Fase 4 — Cobertura Funcional das 18 Telas e Lacunas Explícitas

| # | ScreenId | Arquivo Físico | Fluxos Críticos Associados | Testes Automatizados Existentes / Adicionados | Lacunas Sem Automação (UI / Nativo) |
|---|---|---|---|---|---|
| 01 | `01_landing` | `Screen01Landing.tsx` | Entrada pública, CTAs para Cadastro/Login | `GATE-18S-01` (inventário e rota `App.tsx`) | Renderização visual DOM/E2E em navegador real |
| 02 | `02_register` | `Screen02Register.tsx` | Cadastro com validação de e-mail único e hash SHA-256+salt | `GATE-FUNC-01` (`authService.register` + bloqueio de duplicidade) | Submissão interativa de formulário DOM |
| 03 | `03_login` | `Screen03Login.tsx` | Login por e-mail ou `@username`, bloqueio de senha inválida | `GATE-FUNC-01` (`authService.login` com e-mail contendo `@` e senha inválida) | Submissão interativa de formulário DOM |
| 04 | `04_age_gate` | `Screen04AgeGate.tsx` | Verificação obrigatória de maioridade (+18) | `GATE-FUNC-01` (`updateAccountProfile({ verified18: true })`) | Fluxo visual de bloqueio para menor de 18 anos no navegador |
| 05 | `05_password_recovery` | `Screen05PasswordRecovery.tsx` | Redefinição de senha com re-hash criptográfico | `GATE-FUNC-01` (`authService.resetPassword` + login pós-reset) | Fluxo de envio de código por e-mail externo (SMTP/transacional) |
| 06 | `06_profile_creation` | `Screen06ProfileCreation.tsx` | Criação de perfil, bio, cidade e fotos | `GATE-FUNC-01` (`updateAccountProfile`) | Upload real de fotos para storage em nuvem |
| 07 | `07_preferences` | `Screen07RelationshipPreferences.tsx` | Preferências de relacionamento e busca | `GATE-FUNC-01` (`updateAccountProfile({ seeking })`) | Interação de sliders/chips na UI |
| 08 | `08_home` | `Screen08HomeDashboard.tsx` | Painel principal, atalhos para Lives, Carteira e Admin | `GATE-18S-01` + `adminAuditVerificationTests.ts` | Teste E2E de navegação clicável no dashboard |
| 09 | `09_discover` | `Screen09Discover.tsx` | Descoberta de perfis, curtidas, privacidade espacial e ranking | `GATE-FUNC-02`, `proximityPrivacyVerificationTests.ts`, `creatorSearchRankingVerificationTests.ts` | Gestos de swipe/cards no DOM |
| 10 | `10_profile_detail` | `Screen10ProfileDetail.tsx` | Perfil detalhado, mídias exclusivas (49/99 💎), Cofre VIP (149 💎), mimo e Super Interesse | `exclusiveContentAndInterestVerificationTests.ts`, `protectedMediaVerificationTests.ts`, `GATE-SEC-03` | Renderização visual de modais de desbloqueio |
| 11 | `11_connections` | `Screen11Connections.tsx` | Lista de matches mútuos confirmados | `GATE-FUNC-02` (`isMutualMatch`, curtida unilateral vs. recíproca) | Interação de abas na UI |
| 12 | `12_chat` | `Screen12Chat.tsx` | Mensagens persistentes 1:1 pós-match | `GATE-FUNC-02` (`sendMessage`, `getMessages`) | WebSocket/tempo real multi-dispositivo |
| 13 | `13_video_call` | `Screen13VideoCall.tsx` | Chamada de vídeo privada (`getUserMedia`), controles de mídia e denúncia | `GATE-FUNC-05` (contrato `getUserMedia`, `onEndCall`, `onReport`) + `GATE-AND-01` (permissões Android) | **Sem teste automatizado de stream WebRTC P2P real** em câmera/microfone físicos |
| 14 | `14_notifications` | `Screen14Notifications.tsx` | Listagem, filtros, marcar como lidas e limpar notificações | `GATE-FUNC-05` (contratos de filtragem, leitura e limpeza) | **Sem teste automatizado de Push Notification nativo (FCM/APNs)** |
| 15 | `15_subscriptions` | `Screen15Subscriptions.tsx` | Planos Gratuito, JOBS Premium (199 💎) e VIP (349 💎) | `GATE-FUNC-05` (`purchaseJobsPremiumSubscription` em sandbox + idempotência) | Renovação recorrente automática no servidor após 30 dias |
| 16 | `16_settings` | `Screen16Settings.tsx` | Configurações de conta, idioma, alertas, estúdio do criador e logout | `GATE-FUNC-05` (contratos de roteamento e logout) | Persistência de preferências de som/idioma no backend |
| 17 | `17_privacy_security` | `Screen17PrivacySecurity.tsx` | Controles de visibilidade, modo invisível, portabilidade LGPD Art. 18 e exclusão de conta | `GATE-FUNC-04` (grade espacial) + `GATE-FUNC-05` (contratos LGPD Art. 18 e exclusão) | Expurgo físico cascata em banco de dados remoto de produção |
| 18 | `18_reports_blocks` | `Screen18ReportsBlocks.tsx` | Bloqueio/desbloqueio de perfis e protocolo de denúncias (`ReportTicket`) | `GATE-FUNC-04` (persistência de bloqueios) + `GATE-FUNC-05` (categorias de denúncia e desbloqueio) | Fila de triagem de denúncias persistida em backend multiusuário |
| Transversal | `LiveStreamView.tsx` | `src/components/LiveStreamView.tsx` | Transmissões ao vivo, desbloqueio pago (70/30), presentes e votação consensual por identidade única | `liveAndAuditVerificationTests.ts` (`LIVE-TDD-VOTE-01..07`) + `GATE-FUNC-03` | Streaming de vídeo RTMP/WebRTC real |
| Transversal | `WalletModal.tsx` | `src/components/WalletModal.tsx` | Carteira de créditos/diamantes, pacotes oficiais, ledger 70/30, saques PIX e anti-IDOR | `ledgerVerificationTests.ts`, `financialHistoryVerificationTests.ts`, `GATE-SEC-01`, `GATE-SEC-02` | Liquidação bancária real homologada com PSP PIX em produção |

---

## Fase 5 — Resultados Reais, Estado Android e Bloqueadores de Publicação

### 5.1 Resultados das etapas executadas localmente
- **`npm run test`**: **378 / 378 asserções aprovadas (100,0%)** em 12 suítes automatizadas (incluindo `GATE-FUNC-05` e `GATE-AND-02`).
- **`npm run typecheck`**: **APROVADO** (`tsc --noEmit` com exit code `0`).
- **`npm run build`**: **APROVADO** (bundle web de produção gerado em `dist/`).
- **`npx cap sync android`**: **APROVADO** (assets web copiados para `android/app/src/main/assets/public`).
- **`./android/gradlew -p android assembleDebug` (no container local)**: **BLOQUEADO POR AMBIENTE** (`ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH`). A compilação real do APK depende da execução do job `android-validation` no GitHub Actions (que provisiona JDK 21 + Android SDK 36).

### 5.2 Bloqueadores restantes antes de autorizar a publicação na Google Play
1. **Execução do workflow `android-release-gate.yml` em runner GitHub Actions com JDK 21 e Android SDK 36**: necessária para comprovar a geração real do artefato `.apk` / `.aab` fora do container sem Java.
2. **Credenciais de Produção do PSP PIX e Segredos de Assinatura Android (`JOBS_UPLOAD_*`)**: o servidor opera corretamente em modo *fail-closed* (`HTTP 503`) para produção enquanto `JOBS_PSP_PIX_PROVIDER_URL`, `JOBS_PSP_PIX_API_TOKEN` e `JOBS_PSP_WEBHOOK_HMAC_SECRET` não estiverem configurados; o build de release assinado exige a keystore de upload via variáveis de ambiente no CI.
3. **Substituição dos ícones padrão do template Capacitor**: atualizar os arquivos em `android/app/src/main/res/mipmap-*` com a identidade visual final do JOBS antes de submeter à loja.
4. **Persistência de Estado em Servidor Multi-Instância**: migrar os registros atualmente mantidos em `localStorage` (como votos de desafios de Lives, mensagens e bloqueios) para banco de dados transacional no backend antes de escalar para múltiplos dispositivos em produção.
