# JOBS 1.0 — AUDITORIA TÉCNICA E MAPEAMENTO DE ENGENHARIA DO LIVESTREAMVIEW
**Fluxo de Vídeo, Protocolo de Transmissão, Sinalização e Endpoints de Backend**

---

## 1. Arquitetura Atual Identificada

Após a inspeção minuciosa dos arquivos `src/components/LiveStreamView.tsx`, `src/services/liveStreamService.ts`, `src/services/liveService.ts`, `src/services/ledgerService.ts` e do ambiente de dependências em `package.json`, a arquitetura atual é classificada conclusivamente como:

> **CENÁRIO 3: Simulador de DOM de Alta Fidelidade com Captura Local de Câmera (`getUserMedia`) e Orquestração Determinística de Estado.**

### Resumo do Diagnóstico:
1. **Captura Local:** Existe invocação real da API de mídia do navegador (`navigator.mediaDevices.getUserMedia({ video: true, audio: true })`) no modal de criação da transmissão do criador (`isCreateLiveOpen`), injetando o `MediaStream` diretamente no elemento `<video ref={localVideoRef} autoPlay playsInline muted />` para retorno local (loopback preview).
2. **Distribuição para Espectadores:** Não há codificação de mídia, nem empacotamento, nem transmissão remota. Os feeds ativos da live (inclusive nos modos Individual, Batalha com split-screen, Palco e Desafios) são renderizados no DOM através de elementos `<img>` que consomem posters estáticos e imagens dos criadores (`streamMediaUrl`, `vipStreamMediaUrl`).
3. **Protocolos Ausentes:** Não há implementação de `RTCPeerConnection`, nem troca de SDP (offer/answer), nem negociação ICE para WebRTC. Também não há biblioteca HLS (`hls.js`), reprodutor de vídeo nativo HLS, nem consumo de playlists `.m3u8` ou segmentos de transporte `.ts`/`.m4s`.
4. **Backend Atual:** A aplicação opera no cliente (Vite SPA) com serviços TypeScript modulares (`liveStreamService.ts`). A persistência das salas, chat, participantes e métricas é gerenciada via `localStorage` e filas seriais assíncronas em memória (`enqueue`).

---

## 2. Evidências Técnicas no Código

| Componente / Arquivo | Linhas | Trecho Inspecionado | Evidência Técnica |
| :--- | :--- | :--- | :--- |
| `LiveStreamView.tsx` | 130–152 | `navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => { localVideoRef.current.srcObject = s; })` | Captura de hardware de câmera e microfone real no cliente, mas restrita exclusivamente à tag `<video>` local de pré-visualização. |
| `LiveStreamView.tsx` | 510–549 | `<img src={isIndividualLocked ? activeSession.vipStreamMediaUrl : ...} className={isIndividualLocked ? 'filter blur-[24px]...' : '...'} />` | A tela principal de reprodução da live utiliza elemento `<img>` com efeito de desfoque CSS (`blur-[24px]`) como simulador de censura do momento íntimo VIP. |
| `LiveStreamView.tsx` | 514–532 | `<div className="w-full h-full grid grid-cols-2 gap-1 bg-black"><img src={creator1.streamUrl} ... /><img src={creator2.streamUrl} ... />` | O formato de Batalha (Duelo entre 2 criadores) divide a tela e renderiza duas imagens simultâneas com placar determinístico. |
| `LiveStreamView.tsx` | 364 & 563 | `<span className="... text-[10px] font-extrabold uppercase">DEMO HD</span>` | Declaração explícita de "Modo DEMO HD" na interface para o usuário. |
| `liveStreamService.ts` | 218–219 | `isDemoStreaming: true, streamingProviderNote: 'Sessão iniciada em Modo DEMO com suporte a câmera local WebRTC'` | Metadados do modelo de dados (`LiveSessionModel`) definindo formalmente o status simulado. |
| `package.json` | 1–55 | Nenhuma dependência `hls.js`, `livekit-client`, `simple-peer`, `socket.io-client` ou similar instalada | Confirmação de ausência de SDKs de streaming remoto em nível de pacote. |

---

## 3. Fluxo de Publicação do Criador

```
+-----------------------------------------------------------------------------------+
|                            FLUXO ATUAL DO CRIADOR                                 |
+-----------------------------------------------------------------------------------+
  [ Criador ]
       │
       ▼
  Clica em "Transmitir Ao Vivo"
       │
       ▼
  Browser solicita permissão: navigator.mediaDevices.getUserMedia()
       │
  ├─── Se Permitido:
  │    MediaStream anexado a <video ref={localVideoRef}> (Preview local)
  │
  └─── Se Recusado:
       Exibe fallback gráfico: "Câmera não autorizada, feed DEMO será utilizado"
       │
       ▼
  Criador preenche formulário (Título, Formato, Preço em Créditos para Modo Íntimo)
       │
       ▼
  Clica em "Iniciar Transmissão"
       │
       ▼
  Chama liveStreamService.startNewLiveSession()
       │
       ▼
  Grava novo LiveSessionModel em 'jobs_live_sessions_v2' (localStorage)
       │
       ▼
  Transmissão passa a constar no feed público do LiveCenter / LiveStreamView
```

### Limitação do Fluxo Atual:
- Os frames capturados pela câmera local **não são codificados nem enviados para uma infraestrutura de mídia**. Nenhum outro usuário ou dispositivo conectado na rede consegue visualizar o vídeo da câmera do anfitrião; o espectador apenas vê a imagem estática de fallback cadastrada no perfil.

---

## 4. Fluxo de Reprodução do Espectador

```
+-----------------------------------------------------------------------------------+
|                           FLUXO ATUAL DO ESPECTADOR                               |
+-----------------------------------------------------------------------------------+
  [ Espectador ]
       │
       ▼
  Navega pela grade de transmissões (LiveCenter / LiveStreamView)
       │
       ▼
  Seleciona uma sessão ativa (handleOpenSession)
       │
       ▼
  Componente monta o modal de tela cheia (Active Live Session):
       │
       ├─── Formato Normal:
       │    Exibe <img src={streamMediaUrl} />
       │
       ├─── Formato Batalha:
       │    Exibe Grid 2 colunas com <img src={creator1} /> e <img src={creator2} />
       │
       └─── Se a live possui "Momento Íntimo" ativado:
            Verifica isUnlockedByUser:
            ├── Se falso: Aplica blur-[24px] CSS e exibe Paywall com preço em créditos
            └── Se verdadeiro: Remove o blur e exibe a imagem VIP
       │
       ▼
  Interações de Chat & Presentes:
       - Espectador digita no chat ➔ Adiciona ao array chatMessages em memória/localStorage
       - Espectador envia presente ➔ liveStreamService.sendVirtualGift() ➔
         Deduz créditos no financialLedger (70% Criador / 30% Plataforma)
```

---

## 5. Matriz de Endpoints (Existentes vs. Propostos)

### 5.1. Métodos Existentes no Cliente (`liveStreamService.ts` / `ledgerService.ts`)
Estes métodos atualmente executam a regra de negócio localmente no navegador:

| Ação / Método no Código | Tipo Atual | Parâmetros Principais | Resposta / Efeito |
| :--- | :--- | :--- | :--- |
| `getLiveSessions()` | Leitura Local (`localStorage`) | Nenhum | Retorna `LiveSessionModel[]` ativos e agendados |
| `startNewLiveSession(params)` | Mutação Local | `format`, `title`, `priceCreditsToUnlock`, etc. | Cria sessão e grava em `jobs_live_sessions_v2` |
| `endLiveSession(sessionId)` | Mutação Local | `sessionId` | Encerra live, calcula elegibilidade para bônus |
| `sendVirtualGift(params)` | Mutação + Contábil | `sessionId`, `giftId`, `userId`, `idempotencyKey` | Executa débito no ledger, aplica divisão 70/30 |
| `requestJoinStage(sessionId, user)`| Mutação Local | `sessionId`, `user` | Adiciona solicitação de entrada no palco |
| `voteChallengeOption(...)` | Mutação Local | `sessionId`, `optionId`, `userId` | Computa voto na meta coletiva da audiência |
| `sendTip(params)` | Contábil (`ledgerService`) | `creditsAmount`, `idempotencyKey`, etc. | Registra lançamento atômico de dupla entrada |

---

### 5.2. Endpoints de Backend Requeridos para Streaming em Produção (Propostos)

Para transformar o simulador em uma plataforma de streaming real escalável com baixa latência, os seguintes endpoints de backend e sinalização devem ser criados:

| Endpoint Proposto | Método / Protocolo | Finalidade | Payloads e Autenticação |
| :--- | :--- | :--- | :--- |
| `/api/v1/lives` | `POST` (HTTP) | Criar sessão de transmissão e alocar sala no SFU | Bearer Token (JWT Criador) + Payload da Live |
| `/api/v1/lives/:id/token` | `POST` (HTTP) | Obter credencial WebRTC (LiveKit/Mediasoup token) com permissões (publish vs. subscribe) | Bearer Token (JWT Usuário/Espectador) |
| `/api/v1/lives/:id/hls/master.m3u8` | `GET` (CDN / Edge) | Playlist HLS multi-bitrate (1080p, 720p, 480p, 360p) com autenticação via Cookie/Signed URL | Token de sessão assinado para evitar vazamento |
| `/api/v1/lives/:id/stage/requests` | `POST` / `PATCH` | Gestão de pedidos para subir no palco (aceitar/recusar convidados WebRTC) | Bearer Token (JWT Anfitrião) |
| `/api/v1/lives/:id/gifts` | `POST` (Idempotente) | Envio de presente com autorização e transação contábil no backend | Headers: `Idempotency-Key`, `Authorization` |
| `wss://api.jobs.com/signaling` | `WebSocket` | Troca de mensagens de controle em tempo real, SDP/ICE e chat distribuído | Query param `?token=JWT&roomId=...` |

---

## 6. Diagrama de Sequência da Arquitetura Alvo

### Fluxo Híbrido: WebRTC SFU para Criadores/Palco + LL-HLS para Audiência Massiva

```
Criador (Host)             Servidor JOBS           SFU (ex: LiveKit)          CDN / Transcoder           Espectadores
     │                           │                         │                         │                         │
     │── 1. POST /api/lives ────>│                         │                         │                         │
     │<── 2. Room ID + Token ────│                         │                         │                         │
     │                           │                         │                         │                         │
     │── 3. Conexão WebRTC (SDP Offer) ───────────────────>│                         │                         │
     │<── 4. SDP Answer + ICE Candidates ──────────────────│                         │                         │
     │=== 5. Ingestão de Vídeo/Áudio (WebRTC Real) =======>│                         │                         │
     │                           │                         │── 6. Egress RTMP/SRT ──>│                         │
     │                           │                         │                         │── 7. Transcodificação   │
     │                           │                         │                         │      Multi-bitrate      │
     │                           │                         │                         │      LL-HLS (.m3u8)     │
     │                           │                         │                         │                         │
     │                           │<── 8. GET /lives/:id ───────────────────────────────────────────────────────│
     │                           │─── 9. Retorna HLS URL + Signed Token ──────────────────────────────────────>│
     │                           │                         │                         │                         │
     │                           │                         │                         │<── 10. GET master.m3u8 ─│
     │                           │                         │                         │=== 11. Stream LL-HLS ===>
     │                           │                         │                         │    (Latência ~2s)       │
     │                           │                         │                         │                         │
     │<========================= 12. WebSocket (Chat, Presentes, Placar de Batalha) ===========================>│
```

---

## 7. Lacunas Técnicas e de Segurança Identificadas

1. **Vulnerabilidade do Paywall no Cliente (Censura por CSS Blur):**
   - No código atual, a imagem desinibida (`vipStreamMediaUrl`) é enviada ao navegador do espectador mesmo antes do pagamento, sendo obscurecida apenas pela classe Tailwind `blur-[24px]`. Qualquer usuário com conhecimentos básicos de DevTools pode inspecionar o elemento, remover a classe `filter blur-[24px]` e visualizar a mídia sem debitar créditos.
   - *Correção Necessária:* No backend, os segmentos HLS do stream VIP devem ser criptografados (AES-128 ou FairPlay/Widevine) ou segregados em uma trilha de mídia que só fornece as chaves de descriptografia após confirmação contábil no livro-razão.

2. **Ausência de Servidor de Sinalização (Signaling Server):**
   - O chat e o placar de batalha dependem do estado local React. Se dois usuários em navegadores distintos abrirem a live, as mensagens de um não chegam ao outro em tempo real.
   - *Correção Necessária:* Implementação de WebSocket autoritativo com barramento Redis Pub/Sub ou Firestore Listeners para propagação instantânea de chat, presentes e placar.

3. **Sobrecarga de Conexões (P2P Mesh vs. SFU):**
   - Transmissões ao vivo no nicho do JOBS reúnem de centenas a milhares de espectadores simultâneos. Uma arquitetura WebRTC P2P tradicional é inviável (exigiria que o criador fizesse upload para cada espectador individualmente). É indispensável adotar SFU (Selective Forwarding Unit) ou empacotamento HLS para a audiência passiva.

4. **Captura Local sem Limpeza de Tracks em Erros Inesperados:**
   - Em `LiveStreamView.tsx` (linhas 147-151), a limpeza dos tracks de câmera ocorre apenas no unmount do hook `[isCreateLiveOpen]`. Se houver crash ou navegação de rota externa, a luz da webcam pode permanecer ativa em alguns navegadores.

---

## 8. Verificação do Sistema Contábil e Testes

Durante a auditoria, todas as suítes de teste existentes foram validadas:
- **Total de Testes:** 39 testes unitários e de integração contábil executados via Vitest.
- **Resultado:** **39 aprovados, 0 falhas (100% de sucesso)**.
- **Módulos Testados:**
  1. `financialLedger.test.ts` (Idempotência, segregação BRL/Créditos, estornos compensatórios, atomicidade de saques e divisão 70/30).
  2. `payoutSimulation.test.ts` (Isolamento total de simulação, barreira contra movimentação de capital fiduciário real, cálculo de taxas e regras antifraude).

---

## 9. Plano de Migração Incremental (Sem Regressões)

### **Fase 1: WebSocket Signaling & WebRTC SFU para Criadores e Palco (Sprints 1 e 2)**
- **Meta:** Permitir que o criador transmita sua câmera de verdade e interaja com até 4 convidados no palco.
- **Passos:**
  1. Integrar serviço de SFU (LiveKit Cloud ou instância auto-hospedada Mediasoup/Janus).
  2. Implementar rota no backend `/api/v1/lives/:id/token` gerando JWT de sala para o criador publicar (`canPublish: true`) e para os participantes do palco.
  3. No `LiveStreamView.tsx`, substituir o preview isolado pelo hook `@livekit/components-react` ou adapter nativo `RTCPeerConnection`.

### **Fase 2: Transcodificação LL-HLS para Audiência Massiva (Sprints 3 e 4)**
- **Meta:** Escalar para milhares de espectadores com custo de banda reduzido e latência ultra-baixa (< 3 segundos).
- **Passos:**
  1. Configurar Egress do SFU para empacotar a transmissão em RTMP/HLS multi-bitrate via AWS IVS ou Cloudflare Stream.
  2. Integrar reprodutor de vídeo nativo (Video.js ou Plyr com `hls.js`) no player do espectador.
  3. Implementar controle de acesso ao stream VIP: o servidor de streaming só emite o manifesto `.m3u8` da trilha sem censura mediante validação do token emitido pelo `financialLedger`.

### **Fase 3: Sincronização em Tempo Real de Batalhas e Presentes (Sprint 5)**
- **Meta:** Garantir que o placar da batalha seja 100% sincronizado entre todos os espectadores com atraso nulo.
- **Passos:**
  1. O envio de presentes continua passando pelo `financialLedger.sendTip()` para integridade contábil.
  2. Ao confirmar o débito com sucesso, o backend dispara evento via WebSocket para o canal da live (`{ type: 'GIFT_SENT', gift, newScore }`).
  3. O placar de ambos os criadores é atualizado no HUD da transmissão via WebSockets simultaneamente.

---

## 10. Conclusão Técnica Conclusiva

O componente `LiveStreamView` do JOBS possui uma interface de altíssimo nível, fluxos de gamificação bem estruturados (Batalhas, Palco, Metas e Presentes Virtuais) e integração contábil exemplar com o livro-razão (`financialLedger`), operando atualmente sob a modalidade de **Simulador de DOM de Alta Fidelidade com Captura Local `getUserMedia`**.

A infraestrutura está perfeitamente preparada para a migração incremental para streaming real de produção seguindo o padrão híbrido da indústria: **WebRTC SFU para o anfitrião e palco interativo**, combinado com **LL-HLS distribuído via CDN para a audiência massiva**, garantindo escalabilidade, proteção de direitos autorais contra inspeção de DOM e integridade financeira rigorosa.
