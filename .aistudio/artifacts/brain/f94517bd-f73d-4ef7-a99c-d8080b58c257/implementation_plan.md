# Plano de Implementação — JOBS: Gate Final de Qualidade, Testes e Publicação Android

## 1. Objetivo e Contexto Arquitetural

Executar e consolidar o **Gate Final de Qualidade, Testes, Segurança e Preparação Android** do **JOBS** na branch dedicada `release/gate-final-android-qa` (mantendo `main` intacta em `da72758`), preservando integralmente o `ledgerService`, a regra de divisão financeira **70/30** (`CREATOR_NET_SHARE_RATIO = 0.70`, `PLATFORM_FEE_RATIO = 0.30`) e todas as 18 telas existentes.

O escopo abrange:
- **Inventário completo e verificável das 18 telas reais** (`01_landing` a `18_reports_blocks`) e modais críticos (`LiveStreamView`, `WalletModal`, `ScreenSwitcherModal`).
- **Correção de regressão reproduzida no login por e-mail** (`src/utils/authService.ts`) e suíte automatizada de verificação do Gate Final (`src/utils/finalReleaseGateVerificationTests.ts` integrada ao `scripts/runVerificationTests.ts`).
- **Adequação Android para Google Play Store**:
  - Configuração de `signingConfigs.release` em `android/app/build.gradle` lendo credenciais exclusivamente de variáveis de ambiente (`JOBS_UPLOAD_STORE_FILE`, `JOBS_UPLOAD_STORE_PASSWORD`, `JOBS_UPLOAD_KEY_ALIAS`, `JOBS_UPLOAD_KEY_PASSWORD`) sem segredos hardcoded, com fallback seguro quando ausentes.
  - Permissão de execução (`chmod +x`) no wrapper `android/gradlew`.
  - Declaração das permissões de hardware e mídia (`CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`) e `<uses-feature>` opcionais (`android.hardware.camera`, `android.hardware.microphone`) em `android/app/src/main/AndroidManifest.xml` para suportar Lives e videochamadas WebRTC.
- **Adequação de CI/CD**:
  - Substituição dos templates incompatíveis (`.github/workflows/deno.yml` e `.github/workflows/gradle-publish.yml`) por um workflow unificado `.github/workflows/android-release-gate.yml` que executa `npm ci`, `npm run typecheck`, `npm run test`, `npm run build:android` e `./android/gradlew assembleDebug` com JDK 21 e Android SDK.
- **Auditoria e Relatório Final de Evidências** (`JOBS_GATE_FINAL_QUALIDADE_ANDROID_RELATORIO.md`) com todos os comandos executados, códigos de saída, bloqueios reais de ambiente (ausência de JDK/Android SDK local no container) e checklist da Google Play Console.

---

## 2. Alterações Propostas por Arquivo

### 2.1. Autenticação e Suíte Automatizada do Gate Final (Já aplicadas e validadas na branch `release/gate-final-android-qa`)
- **`src/utils/authService.ts`**:
  - Correção da normalização do identificador no método `login()` para preservar o `@` ao comparar com `a.email.toLowerCase()` e remover apenas `@` inicial (`replace(/^@/, '')`) ao comparar com `a.username`.
- **`src/utils/finalReleaseGateVerificationTests.ts`** & **`scripts/runVerificationTests.ts`**:
  - Suíte automatizada cobrindo:
    - `GATE-18S-01`: Inventário das 18 telas em `ALL_18_SCREENS` e validação de categorias e IDs únicos.
    - `GATE-FUNC-01..04`: Fluxos funcionais de ponta a ponta (cadastro/login por e-mail e username, sessões de Lives e votação segura com bloqueio de duplicidade, proteção de mídias exclusivas com URL assinada, e isolamento financeiro 70/30 + bloqueio de auto-desbloqueio).
    - `GATE-SEC-01..03`: Segurança de rotas Express (`src/serverApp.ts`) contra IDOR (`403`), webhook Pix com assinatura HMAC inválida (`401`), e payout em modo simulação bloqueado (`503` fail-closed).
    - `GATE-AND-01..02`: Verificação da configuração Capacitor/Android (`capacitor.config.ts`, `android/app/build.gradle`, `AndroidManifest.xml` e `variables.gradle`).

### 2.2. Configuração de Build e Permissões Android
- **`android/app/build.gradle`**:
  - Adicionar bloco `signingConfigs { release { ... } }` alimentado apenas por variáveis de ambiente (`System.getenv("JOBS_UPLOAD_STORE_FILE")`, etc.), aplicando `signingConfig signingConfigs.release` em `buildTypes.release` somente quando o keystore de upload estiver configurado no ambiente.
- **`android/app/src/main/AndroidManifest.xml`**:
  - Declarar `<uses-permission android:name="android.permission.CAMERA" />`, `<uses-permission android:name="android.permission.RECORD_AUDIO" />` e `<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />`, além de `<uses-feature android:name="android.hardware.camera" android:required="false" />` e `<uses-feature android:name="android.hardware.microphone" android:required="false" />`.
- **`android/gradlew`**:
  - Garantir bit executável (`chmod +x android/gradlew`, modo `100755` no Git).

### 2.3. Pipeline de CI/CD (`.github/workflows/`)
- **Remover** `.github/workflows/deno.yml` e `.github/workflows/gradle-publish.yml` (templates incompatíveis com Node/Vite/Capacitor).
- **Criar** `.github/workflows/android-release-gate.yml`:
  - Configura Node.js 22 + JDK 21 (`temurin`) + Android SDK.
  - Executa `npm ci`, `npm run typecheck`, `npm run test`, `npm run build:android` e `./android/gradlew -p android assembleDebug`.

### 2.4. Relatório Completo de Auditoria e Evidências
- **`/.aistudio/artifacts/brain/f94517bd-f73d-4ef7-a99c-d8080b58c257/JOBS_GATE_FINAL_QUALIDADE_ANDROID_RELATORIO.md`**:
  - Atualizar o relatório consolidado das Etapas 1 a 6 com o status atualizado de `build.gradle`, `AndroidManifest.xml`, `gradlew`, workflow de CI e resultados dos testes automatizados.

---

## 3. Plano de Verificação

1. **Verificação Estática e Tipagem TypeScript**:
   - Executar `npm run typecheck` (`tsc --noEmit`) e `lint_applet` -> esperado **Exit Code 0**.
2. **Suíte Completa de Testes Automatizados**:
   - Executar `npm run test` (`tsx scripts/runVerificationTests.ts`) -> esperado **100% de aprovação** incluindo os testes de regressão de `AndroidManifest.xml`, `build.gradle` e login por e-mail.
3. **Build Web + Sincronização Capacitor Android**:
   - Executar `npm run build:android` (`vite build && cap sync android`) e `compile_applet` -> esperado **Exit Code 0**.
4. **Verificação do Wrapper Gradle e Diagnóstico Transparente do Ambiente**:
   - Executar `./android/gradlew -p android assembleDebug` diretamente (validando permissão de execução `100755`) e registrar o resultado real do container Linux (bloqueio por ausência de JDK/Android SDK local documentado com transparência).
