# Plano de Implementação — Proteção de Fotos e Vídeos dos Usuários (JOBS)

## 1. Escopo e Diretrizes Arquiteturais

Este plano estrutura a evolução incremental da proteção de mídias de usuários no **JOBS**, cobrindo controle de acesso no backend/serviços, proteção de tela nativa no Android (`FLAG_SECURE` dinâmico), endurecimento de visualização na Web (renderização em `<canvas>` para fotos, player de vídeo restrito, teaser SVG opaco para itens bloqueados e marca-d'água forense dinâmica) e validação automatizada.

- **Restrição Inegociável (Fase 4):** O arquivo `src/services/ledgerService.ts` e as regras financeiras (divisão 70/20/10, pacotes de diamantes e carteiras) **não serão modificados**.
- **Limitação Real de Plataforma Documentada:** Na Web, nenhuma aplicação consegue impedir fotografias externas da tela (câmera física apontada para o monitor) ou capturas realizadas diretamente pelo sistema operacional fora do navegador. As camadas de URL temporária assinada, renderização em `<canvas>`, bloqueio de interações nativas de salvamento e marca-d'água forense dinâmica atuam como controle de acesso, redução de superfície e dissuasão/rastreabilidade.

---

## 2. Fase 1 — Controle de Acesso, URLs Assinadas e Miniaturas Seguras

### 2.1. Endurecimento do Serviço de Mídia Protegida (`src/services/protectedMediaService.ts`)
- **Política de Cache e Metadados de Entrega:** Incluir cabeçalhos/políticas explícitas de não retenção (`Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate` e `Pragma: no-cache`) nos descritores de entrega de mídia assinada (`ProtectedMediaTicket` e `AuthorizedMediaAccessResponse`).
- **Renovação Controlada de Ticket Expirado (`renewMediaTicket`):** Permitir que um usuário autenticado que ainda detenha permissão válida (mídia gratuita de perfil não bloqueado, mídia individual comprada ou Cofre VIP ativo) renove um ticket expirado sem reprocessar cobrança financeira, gerando novo `ticketId`, nova assinatura HMAC/hash e novo TTL de 15 minutos (900 segundos).
- **Revogação Automática por Mudança de Permissão ou Visibilidade:** Adicionar `revokeTokensForContent(contentId, reason)` e `revokeTokensForCreator(creatorId, reason)` para invalidar imediatamente todas as URLs temporárias emitidas caso o criador altere a modalidade da mídia (ex.: de `FREE` para `INDIVIDUAL_UNLOCK` ou `VIP_VAULT`), despublique/remova o item ou suspenda o Cofre VIP.
- **Segregação Estrita de Miniaturas (`getPublicTeaserUrl`):** Garantir que qualquer item bloqueado receba exclusivamente o placeholder SVG opaco codificado em memória (`data:image/svg+xml...`) com metadados mínimos, sem jamais expor a URL original ou reutilizar um token de mídia completa.

### 2.2. Sincronização com Catálogo e Entregas Exclusivas (`src/services/exclusiveContentAndInterestService.ts`)
- **Revogação em Mudança de Modalidade/Permissão:** Garantir que alterações de estado (`transitionMediaState`) ou de modalidade/visibilidade revoguem imediatamente os registros em `SignedTemporaryMediaDelivery` e em `protectedMediaService`.
- **Renovação de Entrega Assinada (`renewSignedMediaDelivery`):** Expor método dedicado que revalida autenticação, ausência de bloqueio mútuo (`isPairBlocked`), estado `published + approved` e vigência do grant antes de emitir uma nova URL temporária assinada quando o token anterior expirar.

### 2.3. Regras de Segurança do Firestore (`firestore.rules`)
- Adicionar regras explícitas para as coleções de metadados de concessão e entregas assinadas (`media_access_grants` e `signed_media_deliveries`), assegurando que somente o próprio comprador autenticado (`request.auth.uid == resource.data.buyerUserId`) ou o criador titular possa ler seus próprios registros de acesso, bloqueando leitura pública ou cruzada (anti-IDOR no banco).

---

## 3. Fase 2 — Proteção Dinâmica no Android (`FLAG_SECURE`)

### 3.1. Plugin Nativo Capacitor no Android (`android/app/src/main/java/com/jobs/app/MainActivity.java`)
- Substituir a aplicação estática e indiscriminada de `FLAG_SECURE` no `onCreate` por um plugin Capacitor embutido (`JobsScreenSecurityPlugin`) registrado na `MainActivity`, com suporte a:
  - `enableSecureScreen()`: aplica `getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE)` na UI Thread ao entrar em qualquer tela ou modal que exiba mídia protegida (impedindo screenshot, gravação de tela e miniatura no seletor de aplicativos recentes do Android).
  - `disableSecureScreen()`: executa `getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE)` na UI Thread quando o usuário sai de todas as telas/modais de mídia protegida, evitando bloqueio indevido em telas comuns (ex.: configurações, carteira ou login).

### 3.2. Serviço Bridge TypeScript com Contagem de Referência (`src/services/screenSecurityService.ts`)
- Criar `src/services/screenSecurityService.ts` com um gerenciador de escopos ativos (`acquireSecureScreenScope(scopeId)` / `releaseSecureScreenScope(scopeId)`) e hook React `useSecureScreen(isActive, scopeName)`:
  - Ativa `FLAG_SECURE` imediatamente quando o primeiro componente de mídia protegida entra em exibição (`activeScopes.size === 1`).
  - Mantém `FLAG_SECURE` ativo se houver sobreposição (ex.: aba Cofre aberta + modal de visualização aberto) e só remove a flag quando o último escopo protegido é desmontado (`activeScopes.size === 0`).
  - Registra estado auditável para inspeção automatizada nos testes de ciclo de vida.

---

## 4. Fase 3 — Proteção e Dissuasão na Web (Canvas, Vídeo e Marca-d'Água)

### 4.1. Evolução do Visualizador Protegido (`src/components/ProtectedMediaViewer.tsx`)
- **Renderização de Fotos em `<canvas>`:** Em vez de manter uma tag `<img src="...">` exposta no DOM para fotos desbloqueadas, carregar a imagem a partir da URL autorizada em memória e desenhá-la em um elemento `<canvas>` responsivo com a marca-d'água forense dinâmica renderizada diretamente nos pixels do canvas (além da camada de proteção contra clique direito, `dragstart`, `selectstart`, `copy` e `contextmenu`).
- **Player de Vídeo Endurecido:** Quando `mediaType === 'video'`, renderizar `<video controls controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()}>` envolto pelo escudo anti-captura e sobreposto pela marca-d'água forense dinâmica.
- **Marca-d'Água Forense Dinâmica sem PII Sensível:** Exibir identificador ofuscado do visualizador (`obfuscateUserIdForWatermark(viewerUserId)`), código curto do ticket/sessão (`ticketId`) e carimbo de tempo compacto, sem expor e-mail, CPF, telefone ou token bruto.
- **Tratamento de Expiração e Renovação Transparente:** Monitorar o TTL do ticket assinado e oferecer renovação imediata (`Renovar Acesso Seguro`) ou renovação automática se o usuário ainda detiver direito de acesso, bloqueando a exibição imediatamente caso a permissão tenha sido revogada ou o usuário tenha sido bloqueado.

### 4.2. Fechamento de Vazamentos de URL nos Componentes de UI
- **`src/components/ChatView.tsx`:**
  - Quando `msg.vipMedia.isUnlocked === false`, substituir `<img src={msg.vipMedia.mediaUrl} />` por `protectedMediaService.getPublicTeaserUrl(...)` (teaser SVG opaco sem expor a URL real no DOM).
  - Quando `msg.vipMedia.isUnlocked === true`, emitir ticket assinado via `protectedMediaService` e exibir a mídia através do componente protegido com marca-d'água dinâmica e `useSecureScreen`.
- **`src/components/screens/Screen10ProfileDetail.tsx`:**
  - Nas abas `Exclusivo` (`INDIVIDUAL`) e `Cofre VIP` (`VIP_VAULT`), quando `item.isUnlockedForViewer === false`, usar `protectedMediaService.getPublicTeaserUrl({ id: item.id, title: item.caption })` em vez de expor a imagem no DOM apenas com filtro CSS `blur`.
  - Ao abrir/visualizar mídia gratuita ou desbloqueada (foto ou vídeo), abrir o modal/visualizador `ProtectedMediaViewer` integrado com a URL temporária assinada, suporte a renovação de token expirado, marca-d'água dinâmica com ID real ofuscado e ativação de `useSecureScreen`.
- **`src/components/VaultFeedView.tsx` e `src/components/DiscoverNudesView.tsx`:**
  - Nos cards da grade, não expor `media.mediaUrl` diretamente sem ticket ativo; nos itens bloqueados manter `getPublicTeaserUrl` e nos itens desbloqueados/modal utilizar URL temporária assinada e o ID real da sessão autenticada (`authService.getCurrentSession()?.userId`) na marca-d'água e no `ProtectedMediaViewer`.

---

## 5. Fase 4 e Fase 5 — Testes Automatizados e Validação (`src/services/__tests__/protectedMediaSecurity.test.ts`)

Criar suíte dedicada de testes automatizados cobrindo todos os cenários exigidos, sem alterar o `ledgerService.ts`:
1. **Acesso autorizado:** emissão de URL temporária assinada com TTL de 15 minutos e política `Cache-Control: private, no-store`.
2. **Bloqueio de usuário não autenticado:** recusa imediata (`UNAUTHENTICATED`) ao tentar requisitar URL assinada ou renovar ticket.
3. **Bloqueio de usuário sem permissão (Anti-IDOR):** usuário B tentando acessar mídia exclusiva não desbloqueada ou tentando usar `ticketId`/assinatura emitida para o usuário A (`DENIED_IDOR_TOKEN_MISMATCH` / `INVALID_OR_EXPIRED_TICKET`).
4. **Expiração e renovação de URL temporária:** rejeição após o TTL de 15 minutos (`DENIED_TOKEN_EXPIRED`) e renovação controlada bem-sucedida (`renewSignedMediaDelivery` / `renewMediaTicket`) apenas enquanto a concessão permanecer ativa.
5. **Revogação imediata por bloqueio ou mudança de permissão:** invalidação instantânea dos tickets emitidos quando há bloqueio entre criador e visualizador (`blockUserPair` / `blockUser`) ou quando a mídia muda de estado/permissão.
6. **Segregação de miniatura/teaser:** verificação de que itens bloqueados retornam apenas o teaser SVG opaco (`data:image/svg+xml...`) e nunca expõem `privateMasterUrl` ou `mediaUrl` original.
7. **Ciclo de vida do `FLAG_SECURE` dinâmico (`screenSecurityService`):** ativação ao entrar em escopo protegido, manutenção durante múltiplos escopos simultâneos e remoção exata ao sair de todas as telas protegidas.
8. **Marca-d'água forense segura:** verificação de que o texto gerado contém apenas identificadores ofuscados e código de sessão, sem vazar dados pessoais sensíveis.

---

## 6. Resumo dos Arquivos Afetados

- `src/services/protectedMediaService.ts` (renovação de ticket, política `no-store`, revogação por mídia/criador, geração de marca-d'água forense com sessão)
- `src/services/exclusiveContentAndInterestService.ts` (renovação de URL temporária assinada e revogação automática de tokens ao alterar modalidade/visibilidade)
- `src/services/screenSecurityService.ts` *(novo)* (gerenciador de ciclo de vida do `FLAG_SECURE` no Android com hook `useSecureScreen`)
- `android/app/src/main/java/com/jobs/app/MainActivity.java` (plugin Capacitor `JobsScreenSecurity` para ativar/remover `FLAG_SECURE` por tela protegida)
- `src/components/ProtectedMediaViewer.tsx` (renderização de fotos em `<canvas>` com marca-d'água embutida, suporte a `<video>` protegido, renovação de URL expirada e integração com `useSecureScreen`)
- `src/components/ChatView.tsx` (substituição de imagem borrada exposta no DOM por teaser opaco seguro e visualização protegida ao desbloquear)
- `src/components/screens/Screen10ProfileDetail.tsx` (teaser opaco para mídias bloqueadas e modal `ProtectedMediaViewer` com URL assinada e renovação para fotos e vídeos desbloqueados)
- `src/components/VaultFeedView.tsx` (uso de URL temporária assinada, `useSecureScreen` e ID real do usuário autenticado)
- `src/components/DiscoverNudesView.tsx` (uso de `ProtectedMediaViewer`, URL temporária assinada, `useSecureScreen` e ID real do usuário autenticado)
- `firestore.rules` (regras anti-IDOR para documentos de concessão e entregas assinadas de mídia)
- `src/services/__tests__/protectedMediaSecurity.test.ts` *(novo)* (suíte completa de testes de segurança de mídia, expiração, renovação, revogação, anti-IDOR e ciclo de vida `FLAG_SECURE`)
