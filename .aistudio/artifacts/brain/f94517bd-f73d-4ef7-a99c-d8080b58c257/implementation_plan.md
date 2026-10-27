# Plano de Implementação Incremental — Publicação de Fotos/Vídeos, Cofre VIP e Desbloqueio Individual no JOBS

## 1. Diagnóstico e Evidências da Arquitetura Existente

A auditoria realizada no repositório confirmou que o **JOBS** já possui serviços maduros e auditáveis para monetização, proteção de mídia e escrituração contábil:

- **`/src/services/exclusiveContentAndInterestService.ts`**:
  - Catálogo oficial em **Diamantes (`💎`)** (`INITIAL_DIAMOND_SERVICE_CATALOG`):
    - **Desbloqueio Individual de Foto (`INDIVIDUAL_PHOTO_UNLOCK`)**: **`49 💎`**
    - **Desbloqueio Individual de Vídeo (`INDIVIDUAL_VIDEO_UNLOCK`)**: **`99 💎`**
    - **Acesso ao Cofre VIP (`VIP_VAULT_ACCESS`)**: **`149 💎`** por **30 dias** (`vipVaultDurationDays: 30`), sem cobrança recorrente automática e independente de itens avulsos (`INDIVIDUAL_UNLOCK`).
  - Métodos existentes que serão **reutilizados integralmente**:
    - `publishOrCreateMedia(...)`
    - `configureVipVault(...)` e `getCreatorVipVaultConfig(...)`
    - `purchaseIndividualMediaUnlock(...)` e `purchaseVipVaultAccess(...)`
    - `listPublicMediaForProfile(...)` e `getSignedMediaDelivery(...)`
    - `getCreatorEarningsStatement(...)` e `getDiamondWallet(...)`
- **`/src/services/ledgerService.ts` (`financialLedger`)**:
  - Escrituração imutável em centavos (`integer cents`), cadeia de hash SHA-256, chave de idempotência (`idempotencyKey`), separação entre `purchasedDiamonds` (`1 💎 = 10 centavos` internos) e `bonusDiamonds` (`0 centavos`), e split oficial **70% Criador / 20% Receita JOBS / 10% Reserva Operacional** (30% comissão total da plataforma).
- **`/src/services/protectedMediaService.ts`**:
  - Emissão de URLs temporárias assinadas (`SignedTemporaryMediaDelivery`, TTL de 15 minutos) e ocultação de `privateMasterUrl` nas listagens públicas.
- **Lacunas identificadas que serão endereçadas de forma incremental**:
  1. `ExclusiveMonetizationModality` em `exclusiveContentAndInterestService.ts` suporta `'INDIVIDUAL_UNLOCK' | 'VIP_VAULT'`, faltando a modalidade explícita `'FREE'` (`0 💎`) para publicações gratuitas no perfil sem cobrança.
  2. Falta a interface dedicada do criador (`CreatorContentStudioModal.tsx`) para publicar fotos/vídeos com prévia (`safePreviewUrl`), descrição, escolha de modalidade (`Gratuito`, `Desbloqueio Individual 49/99 💎`, `Cofre VIP`), estados de carregamento/sucesso/erro, aba `Meu Conteúdo` e configuração do `Cofre VIP`.
  3. Em `Screen10ProfileDetail.tsx`, a visualização de mídias do perfil precisa ser organizada nas 4 abas definidas (`Gratuito`, `Exclusivo`, `Cofre VIP` e `Desbloqueados`) e exibir um **Modal de Confirmação Pré-Compra** antes de debitar diamantes.

---

## 2. Escopo Incremental da Solução

### 2.1. Evolução de `/src/services/exclusiveContentAndInterestService.ts`
- Expandir `ExclusiveMonetizationModality` para `'FREE' | 'INDIVIDUAL_UNLOCK' | 'VIP_VAULT'`.
- Em `publishOrCreateMedia`:
  - Permitir `modality: 'FREE'` com `priceDiamonds: 0`, `priceCents: 0`, `requiresIndividualUnlock: false` e `requiresVipVaultPass: false`.
  - Manter a validação estrita dos preços oficiais fixos do catálogo (`49 💎` para fotos e `99 💎` para vídeos em `INDIVIDUAL_UNLOCK`; `0 💎` avulso em `VIP_VAULT` pois exige o passe de `149 💎 / 30 dias`).
- Em `listPublicMediaForProfile` e `getSignedMediaDelivery`:
  - Liberar `isUnlockedForViewer: true` e entrega assinada para itens com `modality === 'FREE'` que estejam `PUBLISHED` e `APPROVED` (respeitando bloqueios entre usuários e verificação de idade `+18`).
- Em `purchaseIndividualMediaUnlock`:
  - Impedir qualquer cobrança caso o item seja `modality === 'FREE'`, retornando erro claro caso acionado indevidamente.
- Adicionar método utilitário `listCreatorOwnMedia(creatorId: string)` para que o criador consulte todas as suas publicações (incluindo itens em análise, gratuitos, exclusivos avulsos e do Cofre VIP) com contadores e preços.

### 2.2. Novo Componente `/src/components/CreatorContentStudioModal.tsx`
- Central de criação e gestão de conteúdo do perfil/criador com navegação clara entre:
  - **Publicar Foto** e **Publicar Vídeo**:
    - Seleção de arquivo local (com leitura segura em Data URL / Object URL) ou URL de mídia, prévia visual imediata (`safePreviewUrl` + prévia da mídia), título, descrição/legenda, classificação (`sensual`, `fashion_lingerie`, `consensual_nudity_18plus`) e declarações obrigatórias de maioridade (`+18`) e consentimento.
    - Escolha da modalidade:
      - **Conteúdo Gratuito (`0 💎`)**
      - **Conteúdo Exclusivo / Desbloqueio Individual (`49 💎` Foto / `99 💎` Vídeo)**
      - **Cofre VIP (incluso no Passe de 30 dias — `149 💎`)**
    - Estados explícitos de **Carregando**, **Publicação Concluída** (somente após persistência confirmada no serviço) e **Erro**.
  - **Meu Conteúdo**:
    - Listagem e filtros por modalidade (`Todos`, `Conteúdo Gratuito`, `Exclusivo / Pago`, `Cofre VIP`), exibindo status (`Publicado`, `Em análise`, `Rejeitado`), modalidade, preço em `💎` e total de desbloqueios.
  - **Cofre VIP**:
    - Configuração do título, descrição e status ativo do Cofre VIP do criador (`configureVipVault`), listagem dos itens vinculados ao Cofre VIP e transparência sobre o passe de 30 dias (`149 💎`, sem renovação automática).

### 2.3. Evolução de `/src/components/screens/Screen10ProfileDetail.tsx`
- Organizar a vitrine de conteúdos do perfil nas **4 abas selecionadas**:
  1. **Gratuito** (`modality === 'FREE'`)
  2. **Exclusivo** (`modality === 'INDIVIDUAL_UNLOCK'`)
  3. **Cofre VIP** (`modality === 'VIP_VAULT'`)
  4. **Desbloqueados** (todos os itens já liberados ou adquiridos pelo visitante atual)
- Implementar **Modal de Confirmação Pré-Compra** antes de efetivar qualquer cobrança (`Desbloqueio Individual` de `49 💎` / `99 💎` ou `Passe Cofre VIP` de `149 💎`), apresentando:
  - Título, descrição e tipo da mídia/acesso;
  - Preço oficial em `💎`;
  - Saldo disponível atual do usuário em `💎` e saldo projetado após a compra;
  - Regra de acesso (vitalício para item avulso enquanto disponível na plataforma; 30 dias corridos sem renovação automática para Cofre VIP);
  - Botões de **Cancelar** e **Confirmar Desbloqueio**.
- Incluir botão de acesso rápido ao **Estúdio de Conteúdo & Cofre VIP** (`CreatorContentStudioModal`).

### 2.4. Atalhos no Próprio Perfil, Dashboard e Configurações
- **`/src/components/screens/Screen06ProfileCreation.tsx`**: botão/card para abrir o Estúdio de Publicação (`Publicar foto`, `Publicar vídeo`, `Meu conteúdo`, `Cofre VIP`) diretamente na tela de edição do próprio perfil.
- **`/src/components/screens/Screen08HomeDashboard.tsx`**: atalho rápido no Dashboard para `Meu Conteúdo & Cofre VIP`.
- **`/src/components/screens/Screen16Settings.tsx`**: atalho na seção de conta/criador para gerenciar publicações e Cofre VIP.
- **`/src/App.tsx`**: integração do estado global do modal `CreatorContentStudioModal` para abertura a partir do Perfil, Dashboard ou Configurações.

### 2.5. Testes Automatizados de Segurança e Integridade Financeira
- Criar `/src/services/__tests__/creatorContentAndVipVault.test.ts` e registrá-lo em `/scripts/runVerificationTests.ts` cobrindo:
  1. Publicação de foto e vídeo nas modalidades `FREE`, `INDIVIDUAL_UNLOCK` (`49 💎` / `99 💎`) e `VIP_VAULT`;
  2. Acesso imediato e sem cobrança a conteúdo `FREE` e bloqueio de tentativa de cobrança em item gratuito;
  3. Desbloqueio individual com saldo suficiente e verificação do split **70% criador / 20% JOBS / 10% reserva** no `financialLedger`;
  4. Bloqueio de compra com saldo insuficiente sem alterar carteira ou ledger;
  5. Idempotência e prevenção de cobrança duplicada para o mesmo item já desbloqueado;
  6. Proteção de `privateMasterUrl` contra acesso não autorizado em itens `INDIVIDUAL_UNLOCK` e `VIP_VAULT`;
  7. Isolamento entre diamantes de simulação/bônus e compras auditadas no ledger.

---

## 3. Arquivos que Serão Afetados

1. `/src/services/exclusiveContentAndInterestService.ts` *(modificação incremental)*
2. `/src/components/CreatorContentStudioModal.tsx` *(novo componente)*
3. `/src/components/screens/Screen10ProfileDetail.tsx` *(modificação incremental — 4 abas + confirmação pré-compra + botão estúdio)*
4. `/src/components/screens/Screen06ProfileCreation.tsx` *(modificação incremental — atalho no próprio perfil)*
5. `/src/components/screens/Screen08HomeDashboard.tsx` *(modificação incremental — atalho no Dashboard)*
6. `/src/components/screens/Screen16Settings.tsx` *(modificação incremental — atalho nas Configurações)*
7. `/src/App.tsx` *(modificação incremental — conexão do `CreatorContentStudioModal`)*
8. `/src/services/__tests__/creatorContentAndVipVault.test.ts` *(novo arquivo de testes)*
9. `/scripts/runVerificationTests.ts` *(registro da nova suíte de testes)*
