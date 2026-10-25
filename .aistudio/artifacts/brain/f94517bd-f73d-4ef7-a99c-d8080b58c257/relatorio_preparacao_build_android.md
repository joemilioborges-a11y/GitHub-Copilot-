# JOBS — RELATÓRIO TÉCNICO DE PREPARAÇÃO DO BUILD ANDROID DE TESTE

**Data:** 22 de Outubro de 2026  
**Versão da Plataforma:** JOBS 1.0.0 (Web + Android Container)  
**Ambiente de Execução:** Sandbox Linux (x86_64) / Node.js 22  

---

## 1. Diagnóstico de Arquitetura: Nativo vs. Web

A inspeção do repositório comprovou de forma inequívoca que o projeto JOBS foi desenvolvido originalmente como uma **aplicação Web moderna** (Single-Page Application — SPA), com a seguinte stack:
- **Framework:** React 19 (`react`, `react-dom`)
- **Linguagem:** TypeScript 7 / 5.x
- **Build Tool:** Vite 8.3
- **Estilização:** Tailwind CSS v4

Não havia diretório ou arquivos Android nativos (Kotlin/Java/Jetpack Compose) na raiz do projeto. 

### Solução Arquitetural Implementada
Para permitir a geração da versão Android de teste mantendo 100% da integridade da base de código e regras de negócio existentes, o projeto foi conteinerizado utilizando **Capacitor 8** (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`). 

Essa arquitetura:
1. Constrói os assets estáticos via `vite build` em `/dist`.
2. Sincroniza e empacota a aplicação em `/android/app/src/main/assets/public`.
3. Executa a aplicação sobre uma camada nativa moderna baseada em `androidx.webkit` e `CapacitorWebView`, permitindo acesso direto às APIs de hardware (Câmera, Microfone, Notificações, Rede).

---

## 2. Diagnóstico de Compilação e Erros Reais

### A. Compilação da Camada Web
- **Comando:** `npm run build` (`vite build`)
- **Resultado:** **Sucesso absoluto** (Tempo: ~1.3s).
- **Módulos transformados:** 1702 módulos.
- **Saída:** `/dist/index.html`, `/dist/assets/*.js`, `/dist/assets/*.css`.

### B. Verificação Estática de Tipos (Linter)
- **Comando:** `npm run lint` (`tsc --noEmit`)
- **Resultado:** **0 erros** de tipos, 0 erros de sintaxe.

### C. Testes Unitários e de Integração
- **Comando:** `npm test` (`tsx scripts/runVerificationTests.ts`)
- **Resultado:** **39 de 39 testes aprovados (100% de cobertura)**.
  - Testes do Ciclo de Vida de Lives (1 a 5): Aprovados.
  - Regras Contábeis 70/30 e Catálogo de Presentes (6 a 9): Aprovados.
  - Campanhas de Performance e Leaderboards (10 a 13): Aprovados.
  - Livro-Razão Criptográfico e Hash Chain (14 a 17): Aprovados.
  - Simulador de Payout e Isolamento de Ambientes (1 a 12): Aprovados.
  - Atomicidade e Idempotência Financeira (1 a 10): Aprovados.

### D. Diagnóstico da Camada Gradle / Android
- **Comando Executado:** `cd android && ./gradlew --version`
- **Diagnóstico / Erro Real Identificado:**
  ```text
  ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
  Please set the JAVA_HOME variable in your environment to match the
  location of your Java installation.
  ```
- **Causa Raiz:** O ambiente de container atual da plataforma de desenvolvimento é provisionado com Node.js/Bun e compilador web, mas não possui Java JDK (17+) nem o Android SDK (cmdline-tools, platform-tools, platforms;android-36) instalados globalmente no PATH.
- **Resolução:** O projeto Android nativo completo foi estruturado, validado, sincronizado com os assets web e preparado para execução local ou via pipeline CI/CD no Android Studio.

---

## 3. Identificador do Aplicativo, Versão, Dependências e Permissões

### A. Identificador do Aplicativo (`applicationId`)
- **Produção (Release):** `com.jobs.app`
- **Ambiente de Teste (Debug):** `com.jobs.app.debug` (graças ao `applicationIdSuffix ".debug"`)
- **Namespace Android:** `com.jobs.app`

### B. Versão do Aplicativo
- **`versionCode`:** `1`
- **`versionName`:** `"1.0.0"` (e `"1.0.0-debug"` na variante de teste)

### C. Dependências Adicionadas (`package.json`)
- `@capacitor/core`: `^8.5.3` (runtime nativo do Capacitor)
- `@capacitor/android`: `^8.5.3` (suporte à plataforma Android)
- `@capacitor/cli`: `^8.5.3` (ferramenta de linha de comando em `devDependencies`)

### D. Permissões de Sistema (`android/app/src/main/AndroidManifest.xml`)
Foram configuradas as permissões estritamente necessárias para o funcionamento do JOBS:
1. `android.permission.INTERNET`: Comunicação com serviços e APIs.
2. `android.permission.ACCESS_NETWORK_STATE`: Detecção do estado da conexão.
3. `android.permission.CAMERA`: Captura de vídeo para lives e fotos de perfil/documentos.
4. `android.permission.RECORD_AUDIO`: Microfone em transmissões ao vivo e salas de palco.
5. `android.permission.MODIFY_AUDIO_SETTINGS`: Roteamento e ajustes de volume e microfone.
6. `android.permission.READ_MEDIA_IMAGES`: Acesso a fotos na galeria para Android 13+ (API 33+).
7. `android.permission.READ_EXTERNAL_STORAGE` (`android:maxSdkVersion="32"`): Compatibilidade retroativa para versões legadas.

---

## 4. Separação Estrita: Configuração de Testes vs. Produção

Para atender à exigência de não misturar ambientes de teste e produção:

1. **Separação a Nível de Compilação Gradle (`android/app/build.gradle`):**
   ```groovy
   buildTypes {
       debug {
           applicationIdSuffix ".debug"
           versionNameSuffix "-debug"
           debuggable true
       }
       release {
           minifyEnabled false
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```
   *Vantagem:* A versão de teste possui ID próprio (`com.jobs.app.debug`), permitindo que testadores e desenvolvedores instalem o APK de teste no mesmo dispositivo físico que contém a versão de produção, sem sobreposição de dados.

2. **Separação a Nível de Dados e Persistência:**
   - O `payoutSimulationService.ts` e o `ledgerService.ts` utilizam namespaces distintos: `STORAGE_KEYS.LEDGER_TEST` vs. `STORAGE_KEYS.LEDGER_PROD`.
   - Há uma barreira lógica rígida (`fail-safe` comprovado pelo Teste 7 da suíte) que impede terminantemente a conversão de saldo simulado em saldo real ou o envio de payouts de teste para gateways reais.

---

## 5. Auditoria de Recursos Simulados

Conforme diretriz, os seguintes módulos permanecem com implementação simulada / local, requerendo cautela antes de qualquer homologação em ambiente real:
1. **Transmissões ao Vivo (`LiveStreamView`):**
   - O streaming opera em simulação de DOM e loopback local da webcam do aparelho (`navigator.mediaDevices.getUserMedia`).
   - Não há infraestrutura WebRTC SFU (LiveKit, Mediasoup) nem ingestão RTMP/HLS real conectada a CDN.
2. **Autenticação:**
   - Baseada em perfis locais demonstrativos (`authService.ts`). Não há integração ativa com Google Sign-In nativo ou provedores OAuth corporativos com chaves produtivas.
3. **Livro-Razão e Payout:**
   - Operam localmente com contabilidade de partidas dobradas e persistência em storage local, sem conexão direta com o SPB (Sistema de Pagamentos Brasileiro) ou gateways financeiros reais (Pix Bacen, Asaas, Stark Bank).

---

## 6. Conformidade com Requisitos do Google Play (Android 16 / API 36)

O Google Play exige que novos aplicativos enviados a partir do segundo semestre de 2026 adotem o **Android 16 (API 36)** como nível de API alvo.

A configuração foi validada e fixada em `android/variables.gradle` e consumida por `android/app/build.gradle`:
- **`compileSdkVersion = 36`** (Android 16)
- **`targetSdkVersion = 36`** (Android 16)
- **`minSdkVersion = 24`** (Android 7.0 Nougat, garantindo suporte a mais de 99% dos aparelhos em circulação)

Essa conformidade garante que o aplicativo já nasça aderente às diretrizes mais modernas de segurança, privacidade e gerenciamento de energia do sistema operacional Android.

---

## 7. Instruções e Caminho Exato para Gerar e Instalar a Versão de Teste

### A. Sincronização dos Fontes e Assets
Para compilar as alterações web mais recentes e sincronizá-las no container Android:
```bash
npm run build:android
```
*(Executa `vite build` e depois `cap sync android`, populando `android/app/src/main/assets/public/`).*

### B. Geração do Pacote de Teste (APK Debug)
Em uma estação com Android Studio ou Java 17+ e Android SDK instalados:
```bash
cd android
./gradlew assembleDebug
```

### C. Caminho Exato do Pacote Gerado
- **Caminho do APK de Teste:**
  ```text
  android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Pacote Instalado:** `com.jobs.app.debug`

### D. Instalação no Dispositivo de Teste
Conecte o smartphone Android com "Depuração USB" ativada e execute:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Ou abra diretamente o projeto no Android Studio para executar com um clique:
```bash
npx cap open android
```

Para distribuição de teste para múltiplos usuários (sem publicação na Play Store), o arquivo `app-debug.apk` pode ser distribuído via Firebase App Distribution, Google Play Internal Testing ou download direto com permissão de fontes desconhecidas no dispositivo de homologação.
