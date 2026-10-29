# Plano de Implementação — CI Verificável para Web e Android (Bun + Capacitor + Gradle)

## 1. Diagnóstico e Evidências da Inspeção Obrigatória

A inspeção completa do estado atual da branch `release/gate-final-android-qa` em comparação com `main` confirmou os seguintes fatos técnicos:

1. **Gerenciador de Pacotes e Lockfile Real (`package.json` + `bun.lock`)**:
   - O repositório utiliza **`bun.lock`** (`lockfileVersion: 2`, 1.357 linhas) como único lockfile versionado. **Não existe `package-lock.json`** no projeto.
   - A versão do Bun instalada no ambiente é **`1.4.4`** (`/usr/local/bin/bun`), acompanhada de Node **`v22.23.4`**.
   - Os scripts reais verificados em `package.json` são:
     - `"test": "tsx scripts/runVerificationTests.ts"`
     - `"typecheck": "tsc --noEmit"`
     - `"build": "vite build"`
   - Qualquer workflow que utilize `npm ci` ou `cache: 'npm'` falha em execução limpa no GitHub Actions devido à ausência de `package-lock.json`. O modo correto e reproduzível para este repositório é `oven-sh/setup-bun@v2` com `bun-version: "1.4.4"` e `bun install --frozen-lockfile`.

2. **Configuração TypeScript, Vite e Capacitor (`tsconfig.json`, `vite.config.ts`, `capacitor.config.ts`)**:
   - `tsconfig.json`: `target: "ES2022"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `noEmit: true`.
   - `vite.config.ts`: plugin `@vitejs/plugin-react` e `@tailwindcss/vite`, gerando saída estática em `dist/`.
   - `capacitor.config.ts`: `appId: 'com.jobs.app'`, `appName: 'Jobs'`, `webDir: 'dist'`.

3. **Estrutura Android e Gradle Wrapper (`android/`)**:
   - `android/gradle/wrapper/gradle-wrapper.properties`: utiliza **`gradle-8.11.1-all.zip`**.
   - `android/build.gradle`: utiliza **`com.android.tools.build:gradle:8.13.0`** (AGP 8.13.0) e `com.google.gms:google-services:4.4.4`.
   - `android/variables.gradle`: `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`.
   - Requisitos de ambiente Android: **JDK 17** (`temurin`) e **Android SDK Platform 36** (`platforms;android-36`, `build-tools;36.0.0`).
   - No container local atual, `java` e `javac` **não estão instalados**, portanto a compilação Gradle (`./gradlew assembleDebug`) não pode ser executada localmente e depende do runner `ubuntu-latest` do GitHub Actions.

4. **Workflows Originais na Branch `main` (`.github/workflows/`)**:
   - `.github/workflows/deno.yml`: executa `deno lint` e `deno test -A` em pushes/PRs para `main` (incompatível com a arquitetura React + Vite + Bun + `scripts/runVerificationTests.ts`).
   - `.github/workflows/gradle-publish.yml`: executa `./gradlew build` e `./gradlew publish` na raiz do repositório no evento `release: [created]` (incompatível porque o Gradle Wrapper reside em `android/gradlew` e não na raiz).
   - Conforme alinhado, **ambos serão restaurados integralmente a partir da `main`** (não removidos) e documentados quanto à sua finalidade e incompatibilidade com o pipeline de validação do app React/Capacitor.

5. **Escopo da Branch `release/gate-final-android-qa` vs `main`**:
   - O `git diff main --stat` identificou modificações anteriores na branch que tocaram arquivos fora do escopo estrito de CI (como `src/components/LiveStreamView.tsx`, `src/hooks/useLiveStreamView.ts`, `src/services/liveStreamService.ts`, `src/utils/authService.ts`, `scripts/runVerificationTests.ts`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, e o workflow anterior `.github/workflows/android-release-gate.yml`).
   - Conforme decisão de escopo, **todas as alterações fora do escopo de CI serão revertidas para o estado idêntico à `main`**, mantendo na branch `release/gate-final-android-qa` exclusivamente os novos workflows de CI dedicados, a permissão executável de `android/gradlew` (se necessária) e a documentação técnica do pipeline.

---

## 2. Plano de Ação Incremental

### Etapa 1 — Higienização de Escopo e Restauração dos Workflows Originais
1. Restaurar `.github/workflows/deno.yml` e `.github/workflows/gradle-publish.yml` exatamente como estão na branch `main`.
2. Reverter para o estado da `main` todos os arquivos de código da aplicação e configurações Android alterados anteriormente fora do escopo de CI (`android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `scripts/runVerificationTests.ts`, `src/components/LiveStreamView.tsx`, `src/hooks/useLiveStreamView.ts`, `src/services/liveStreamService.ts`, `src/utils/authService.ts`, `src/utils/liveAndAuditVerificationTests.ts`), remover `.github/workflows/android-release-gate.yml` e remover o arquivo extra `src/utils/finalReleaseGateVerificationTests.ts`.
3. Confirmar via `git diff main` que **nenhum** arquivo financeiro (`ledgerService.ts`, `financialReadinessService.ts`, `pspConfigService.ts`, `pspWebhookReconciliationService.ts`, `atomicSettlementService.ts`), de regras (`firestore.rules`), de servidor (`server.ts`) ou de interface (`src/App.tsx`) possui qualquer alteração.

### Etapa 2 — Implementação do Pipeline Web Dedicado (`.github/workflows/jobs-web-ci.yml`)
Criar o workflow `.github/workflows/jobs-web-ci.yml` com:
- **Gatilhos**: `push` (branches `main`, `release/**`, `feat/**`, `fix/**`), `pull_request` (branches `main`, `release/**`) e `workflow_dispatch`.
- **Segurança e Concorrência**:
  - `permissions: contents: read` (menor privilégio, sem permissão de escrita ou publicação).
  - `concurrency` agrupado por workflow e ref com `cancel-in-progress: true`.
- **Passos verificáveis**:
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2` com `bun-version: "1.4.4"`
  3. Cache do diretório de cache do Bun ou instalação direta reproduzível
  4. `bun install --frozen-lockfile` (instalando exatamente as versões de `bun.lock`)
  5. `bun run test` (executando `tsx scripts/runVerificationTests.ts` com log completo e resumo no `$GITHUB_STEP_SUMMARY`)
  6. `bun run typecheck` (executando `tsc --noEmit`)
  7. `bun run build` (executando `vite build` e validando a geração de `dist/index.html`)
  8. `actions/upload-artifact@v4` preservando o bundle `dist/` e logs de verificação com retenção curta (`retention-days: 7`, `if: always()`).

### Etapa 3 — Implementação do Pipeline Android Separado (`.github/workflows/jobs-android-ci.yml`)
Criar o workflow `.github/workflows/jobs-android-ci.yml` separado do pipeline Web para isolar falhas de ambiente nativo (JDK/Android SDK/Gradle) das falhas de código TypeScript/React:
- **Gatilhos**: `push` (branches `main`, `release/**`), `pull_request` (branches `main`, `release/**`) e `workflow_dispatch`.
- **Segurança e Concorrência**:
  - `permissions: contents: read`
  - `concurrency` agrupado por workflow e ref com `cancel-in-progress: true`.
- **Passos verificáveis**:
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2` com `bun-version: "1.4.4"`
  3. `bun install --frozen-lockfile`
  4. `bun run build` (gerando `dist/` necessário para o Capacitor)
  5. `actions/setup-java@v4` com `distribution: 'temurin'` e `java-version: '17'`
  6. `android-actions/setup-android@v3` e instalação via `sdkmanager` de `platforms;android-36` e `build-tools;36.0.0` (alinhado com `compileSdkVersion = 36` em `android/variables.gradle`)
  7. `gradle/actions/setup-gradle@v4` para cache seguro do Gradle Wrapper (`8.11.1`)
  8. `bunx cap sync android` (sincronizando `dist/` com `android/app/src/main/assets/public` e validando `capacitor.config.json`)
  9. Garantir permissão de execução (`chmod +x android/gradlew`) e executar `./gradlew assembleDebug --no-daemon --stacktrace` em `working-directory: ./android` (sem exigir keystore de produção nem assinar release sem segredos configurados)
  10. `actions/upload-artifact@v4` do APK de debug (`android/app/build/outputs/apk/debug/app-debug.apk`) com `retention-days: 7`.

### Etapa 4 — Documentação Técnica e Validação Local Reproduzível
1. Criar `docs/CI_WEB_ANDROID_PIPELINE.md` documentando:
   - A arquitetura dos dois novos pipelines (`jobs-web-ci.yml` e `jobs-android-ci.yml`).
   - O motivo técnico pelo qual `deno.yml` e `gradle-publish.yml` foram mantidos intocados (preservação do repositório) mas não validam o aplicativo React + Bun + Capacitor.
   - Os requisitos exatos de runtime (Bun `1.4.4`, Node `22.x`, JDK `17`, Android SDK `36`, Gradle `8.11.1`, AGP `8.13.0`).
2. Executar localmente na branch `release/gate-final-android-qa` os comandos exatos do pipeline que o container suporta:
   - `bun install --frozen-lockfile`
   - `bun run test`
   - `bun run typecheck`
   - `bun run build`
   - `bunx cap sync android`
3. Auditar `git status` e `git diff main` para comprovar que apenas os arquivos autorizados foram adicionados/modificados.

---

## 3. Arquivos que Serão Afetados

### Criados na branch `release/gate-final-android-qa`:
- `.github/workflows/jobs-web-ci.yml` (Pipeline CI Web com Bun `1.4.4` e `bun.lock`)
- `.github/workflows/jobs-android-ci.yml` (Pipeline CI Android com Bun `1.4.4`, Capacitor Sync, JDK 17, Android SDK 36 e `./gradlew assembleDebug`)
- `docs/CI_WEB_ANDROID_PIPELINE.md` (Documentação técnica da arquitetura de CI e diagnóstico dos workflows legados)

### Modificados / Ajustados na branch `release/gate-final-android-qa`:
- `android/gradlew` (apenas permissão executável `100755`, sem alterar conteúdo do script)

### Restaurados para o estado original da `main` (reversão de mudanças fora do escopo):
- `.github/workflows/deno.yml` (restaurado da `main`)
- `.github/workflows/gradle-publish.yml` (restaurado da `main`)
- Remoção de `.github/workflows/android-release-gate.yml` (substituído por `jobs-web-ci.yml` e `jobs-android-ci.yml`)
- Reversão de `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `scripts/runVerificationTests.ts`, `src/components/LiveStreamView.tsx`, `src/hooks/useLiveStreamView.ts`, `src/services/liveStreamService.ts`, `src/utils/authService.ts`, `src/utils/liveAndAuditVerificationTests.ts` e remoção de `src/utils/finalReleaseGateVerificationTests.ts` para garantir zero impacto fora do escopo de CI.

### Arquivos Críticos Garantidamente Intocados:
- `src/services/ledgerService.ts`
- `src/services/financialReadinessService.ts`
- `src/services/pspConfigService.ts`
- `src/services/pspWebhookReconciliationService.ts`
- `src/services/atomicSettlementService.ts`
- `firestore.rules`
- `server.ts`
- `src/App.tsx`
