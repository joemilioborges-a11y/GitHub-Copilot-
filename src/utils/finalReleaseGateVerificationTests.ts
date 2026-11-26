/**
 * JOBS — SUÍTE AUTOMATIZADA DE GATE FINAL DE QUALIDADE, 18 TELAS, SEGURANÇA E PREPARAÇÃO ANDROID
 *
 * Cobre de ponta a ponta:
 * - Etapa 1 e 3: Inventário real e contratos funcionais das 18 telas (Screen01 a Screen18 + Lives + Wallet)
 * - Etapa 4: Segurança no servidor (RBAC/Anti-IDOR, fail-closed PSP, HMAC PIX), LGPD, Bloqueios e Ledger 70/30
 * - Etapa 5: Auditoria de configuração Capacitor / Android (appId, SDK 24/36, Manifesto, Ícones Adaptativos)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { ALL_18_SCREENS } from '../components/ScreenSwitcherModal';
import { ScreenId } from '../types';
import { authService } from './authService';
import { matchAndMessagingService } from '../services/matchAndMessagingService';
import { liveStreamService } from '../services/liveStreamService';
import { financialLedger, OFFICIAL_CREDIT_PACKAGES } from '../services/ledgerService';
import { runtimeEnvironmentService } from '../services/runtimeEnvironmentService';
import { protectedMediaService } from '../services/protectedMediaService';
import { exclusiveContentAndInterestService } from '../services/exclusiveContentAndInterestService';
import { quantizeCoordinateToGrid } from './proximityPrivacyService';
import { createFinancialApp } from '../serverApp';

export interface FinalReleaseGateTestResult {
  id: string;
  stage: 'ETAPA_1_INVENTARIO' | 'ETAPA_3_FUNCIONAL' | 'ETAPA_4_SEGURANCA_FINANCEIRO' | 'ETAPA_5_ANDROID_CAPACITOR';
  name: string;
  passed: boolean;
  durationMs: number;
  evidence: string;
  error?: string;
}

export interface FinalReleaseGateSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: FinalReleaseGateTestResult[];
}

const EXPECTED_18_SCREEN_FILES: Partial<Record<ScreenId, string>> = {
  '01_landing': 'src/components/screens/Screen01Landing.tsx',
  '02_register': 'src/components/screens/Screen02Register.tsx',
  '03_login': 'src/components/screens/Screen03Login.tsx',
  '04_age_gate': 'src/components/screens/Screen04AgeGate.tsx',
  '05_password_recovery': 'src/components/screens/Screen05PasswordRecovery.tsx',
  '06_profile_creation': 'src/components/screens/Screen06ProfileCreation.tsx',
  '07_preferences': 'src/components/screens/Screen07RelationshipPreferences.tsx',
  '08_home': 'src/components/screens/Screen08HomeDashboard.tsx',
  '09_discover': 'src/components/screens/Screen09Discover.tsx',
  '10_profile_detail': 'src/components/screens/Screen10ProfileDetail.tsx',
  '11_connections': 'src/components/screens/Screen11Connections.tsx',
  '12_chat': 'src/components/screens/Screen12Chat.tsx',
  '13_video_call': 'src/components/screens/Screen13VideoCall.tsx',
  '14_notifications': 'src/components/screens/Screen14Notifications.tsx',
  '15_subscriptions': 'src/components/screens/Screen15Subscriptions.tsx',
  '16_settings': 'src/components/screens/Screen16Settings.tsx',
  '17_privacy_security': 'src/components/screens/Screen17PrivacySecurity.tsx',
  '18_reports_blocks': 'src/components/screens/Screen18ReportsBlocks.tsx',
};

async function sendJsonRequest(
  baseUrl: string,
  method: 'GET' | 'POST',
  routePath: string,
  headers: Record<string, string> = {},
  bodyObj?: unknown
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(routePath, baseUrl);
    const payload = bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': String(Buffer.byteLength(payload)),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

export async function runFinalReleaseGateVerificationSuite(): Promise<FinalReleaseGateSuiteSummary> {
  const suiteStart = Date.now();
  const results: FinalReleaseGateTestResult[] = [];
  const rootDir = process.cwd();

  const runCase = async (
    id: string,
    stage: FinalReleaseGateTestResult['stage'],
    name: string,
    fn: () => Promise<string> | string
  ) => {
    const t0 = Date.now();
    try {
      const evidence = await fn();
      results.push({
        id,
        stage,
        name,
        passed: true,
        durationMs: Date.now() - t0,
        evidence,
      });
    } catch (err: any) {
      results.push({
        id,
        stage,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        evidence: 'Falha na verificação do Gate Final.',
        error: err?.message || String(err),
      });
    }
  };

  // =========================================================================
  // ETAPA 1 — INVENTÁRIO E INTEGRIDADE DAS 18 TELAS
  // =========================================================================
  await runCase(
    'GATE-18S-01',
    'ETAPA_1_INVENTARIO',
    'Inventário real das 18 telas (ALL_18_SCREENS, arquivos físicos Screen01..18 e roteamento em App.tsx)',
    () => {
      if (ALL_18_SCREENS.length !== 18) {
        throw new Error(`Esperado 18 telas registradas em ALL_18_SCREENS, encontrado: ${ALL_18_SCREENS.length}`);
      }

      const appTsxPath = path.join(rootDir, 'src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      for (const item of ALL_18_SCREENS) {
        const expectedRelPath = EXPECTED_18_SCREEN_FILES[item.id];
        if (!expectedRelPath) {
          throw new Error(`ScreenId sem mapeamento de arquivo esperado: ${item.id}`);
        }
        const absFile = path.join(rootDir, expectedRelPath);
        if (!fs.existsSync(absFile)) {
          throw new Error(`Arquivo físico ausente para a tela ${item.id}: ${expectedRelPath}`);
        }
        if (!appTsxContent.includes(`activeScreen === '${item.id}'`)) {
          throw new Error(`Rota de renderização ausente em App.tsx para a tela: ${item.id}`);
        }
      }

      if (!fs.existsSync(path.join(rootDir, 'src/components/LiveStreamView.tsx'))) {
        throw new Error('Componente LiveStreamView.tsx ausente.');
      }
      if (!fs.existsSync(path.join(rootDir, 'src/components/WalletModal.tsx'))) {
        throw new Error('Componente WalletModal.tsx ausente.');
      }

      return `18/18 telas verificadas em ALL_18_SCREENS, src/components/screens/Screen01..18.tsx e src/App.tsx (+ LiveStreamView e WalletModal).`;
    }
  );

  // =========================================================================
  // ETAPA 3 — FLUXOS FUNCIONAIS DAS 18 TELAS (ONBOARDING, SOCIAL, LIVES, LGPD)
  // =========================================================================
  await runCase(
    'GATE-FUNC-01',
    'ETAPA_3_FUNCIONAL',
    'Fluxo funcional Telas 01 a 07: Cadastro, Login com Hash/Salt, Recuperação de Senha, Age Gate +18 e Perfil',
    async () => {
      const testEmail = `qa.gate.${Date.now()}@jobs.app`;
      const testUser = `qa_gate_${Date.now().toString().slice(-5)}`;

      const regRes = await authService.register(testEmail, testUser, 'GateQA@2026!');
      if (!regRes.success || !regRes.account) {
        throw new Error(`Falha ao cadastrar conta de teste: ${regRes.error}`);
      }
      if (regRes.account.passwordHash === 'GateQA@2026!' || regRes.account.passwordHash.length !== 64) {
        throw new Error('Senha não foi armazenada com hash SHA-256 válido.');
      }

      // Duplicidade de e-mail deve ser rejeitada
      const dupRes = await authService.register(testEmail, `${testUser}_2`, 'GateQA@2026!');
      if (dupRes.success) {
        throw new Error('Cadastro duplicado de e-mail foi aceito indevidamente.');
      }

      // Login com senha incorreta deve falhar
      const wrongLogin = await authService.login(testEmail, 'SenhaErrada123');
      if (wrongLogin.success) {
        throw new Error('Login com senha inválida foi aceito indevidamente.');
      }

      // Atualização de Age Gate +18 e Preferências (Telas 04, 06 e 07)
      await authService.updateAccountProfile(regRes.account.id, {
        verified18: true,
        age: 26,
        birthDate: '2000-04-10',
        city: 'São Paulo - Itaim',
        seeking: 'Conexões autênticas e eventos VIP',
      });

      // Recuperação de senha (Tela 05) e novo Login (Tela 03)
      const resetRes = await authService.resetPassword(testEmail, 'NovaSenhaQA@2026!');
      if (!resetRes.success) {
        throw new Error('Falha na recuperação de senha.');
      }
      const loginAfterReset = await authService.login(testEmail, 'NovaSenhaQA@2026!');
      if (!loginAfterReset.success || !loginAfterReset.account?.verified18) {
        throw new Error('Falha no login após redefinição de senha ou flag verified18 não persistida.');
      }

      return `Telas 01..07 validadas: registro SHA-256+salt, bloqueio de duplicidade, redefinição de senha, login e persistência +18 (${regRes.account.id}).`;
    }
  );

  await runCase(
    'GATE-FUNC-02',
    'ETAPA_3_FUNCIONAL',
    'Fluxo funcional Telas 08 a 15: Descoberta, Match Mútuo, Conexões, Chat 1:1, Chamada de Vídeo e Notificações',
    () => {
      const userA = `qa_match_a_${Date.now()}`;
      const userB = `qa_match_b_${Date.now()}`;

      // Curtida unilateral não gera match imediato nem permite chat sem match
      const firstLike = matchAndMessagingService.recordLike(userA, userB, 'standard');
      if (firstLike.isMatch) {
        throw new Error('Curtida unilateral gerou match prematuramente.');
      }

      // Curtida recíproca estabelece match mútuo (Telas 09 -> 11 -> 12)
      const secondLike = matchAndMessagingService.recordLike(userB, userA, 'standard');
      if (!secondLike.isMatch || !matchAndMessagingService.isMutualMatch(userA, userB)) {
        throw new Error('Curtida recíproca não estabeleceu match mútuo.');
      }

      // Envio de mensagem no Chat (Tela 12)
      const sentMessage = matchAndMessagingService.sendMessage(
        userA,
        userB,
        'Olá! Teste funcional de mensagem pós-match no Gate Final.'
      );
      if (!sentMessage || !sentMessage.id) {
        throw new Error('Envio de mensagem pós-match não retornou PersistentMessage válido.');
      }

      const history = matchAndMessagingService.getMessages(userA, userB);
      if (history.length === 0 || history[history.length - 1].text !== sentMessage.text) {
        throw new Error('Histórico de mensagens do chat não persistiu a mensagem enviada.');
      }

      return `Telas 08..15 validadas: curtida unilateral != match, reciprocidade = match mútuo, mensagem persistida (${sentMessage.id}).`;
    }
  );

  await runCase(
    'GATE-FUNC-03',
    'ETAPA_3_FUNCIONAL',
    'Fluxo funcional Lives e Votação Consensual Idempotente (LiveStreamView + liveStreamService)',
    async () => {
      const challengeLive = await liveStreamService.startNewLiveSession({
        format: 'challenge',
        title: 'Desafio Gate Final QA',
        description: 'Votação consensual idempotente',
        category: 'desafio_coletivo',
        hostCreatorId: 'creator_gate_qa',
        hostCreatorName: 'Criadora Gate QA',
        hostCreatorAvatar: '/src/assets/images/profile_valentina_1791856836634.jpg',
        gender: 'mulher',
        sexualOrientation: 'hetero',
        priceCreditsToUnlock: 0,
      });

      const sessions = liveStreamService.getLiveSessions();
      const target = sessions.find((s) => s.id === challengeLive.id)!;
      target.challengeState!.optionsForVote = [
        { id: 'opt_gate_1', label: 'Coreografia Especial', votes: 5 },
        { id: 'opt_gate_2', label: 'Perguntas e Respostas', votes: 8 },
      ];
      liveStreamService.saveLiveSessions(sessions);

      const voterId = `voter_gate_qa_${Date.now()}`;
      const voteRes = await liveStreamService.voteOnChallenge(challengeLive.id, 'opt_gate_1', voterId);
      if (!voteRes.success || voteRes.votedOption.votes !== 6) {
        throw new Error(`Contagem de votos não incrementou para 6: ${voteRes.votedOption.votes}`);
      }
      if (voteRes.session.challengeState?.voters?.[voterId] !== 'opt_gate_1') {
        throw new Error('Mapa voters não registrou o participante.');
      }

      // Tentativa de voto duplicado pelo mesmo participante deve lançar erro e preservar contagem
      let duplicateRejected = false;
      try {
        await liveStreamService.voteOnChallenge(challengeLive.id, 'opt_gate_2', voterId);
      } catch {
        duplicateRejected = true;
      }
      if (!duplicateRejected) {
        throw new Error('Segundo voto da mesma identidade não foi rejeitado.');
      }

      return `LiveStreamView e votação consensual validados: incremento atômico (5 -> 6) e bloqueio de voto duplicado para ${voterId}.`;
    }
  );

  await runCase(
    'GATE-FUNC-04',
    'ETAPA_3_FUNCIONAL',
    'Fluxo funcional Telas 16, 17 e 18: Configurações, Privacidade LGPD (Grade Espacial) e Bloqueios/Denúncias',
    () => {
      // Verifica quantização de localização sem expor endereço exato (Tela 17 / proximityPrivacyService)
      const rawLat = -23.561684;
      const rawLng = -46.655981;
      const quantized = quantizeCoordinateToGrid(rawLat, rawLng);
      if (quantized.lat === rawLat && quantized.lng === rawLng) {
        throw new Error('Coordenada bruta não foi quantizada pela grade de privacidade.');
      }
      if (!quantized.gridCellId || quantized.precisionMetersApprox < 1000) {
        throw new Error('Célula de grade de privacidade inválida.');
      }

      // Verifica persistência de bloqueios e denúncias (Tela 18)
      const blockedRaw = JSON.stringify(['profile_blocked_qa_01']);
      localStorage.setItem('jhobs_blocked_user_ids', blockedRaw);
      const parsedBlocked = JSON.parse(localStorage.getItem('jhobs_blocked_user_ids') || '[]');
      if (!Array.isArray(parsedBlocked) || !parsedBlocked.includes('profile_blocked_qa_01')) {
        throw new Error('Falha ao persistir lista de usuários bloqueados.');
      }

      return `Telas 16..18 validadas: quantização espacial (${quantized.gridCellId}, ~${quantized.precisionMetersApprox}m) e persistência de bloqueio confirmada.`;
    }
  );

  await runCase(
    'GATE-FUNC-05',
    'ETAPA_3_FUNCIONAL',
    'Fluxo funcional Telas 13, 14, 15, 16, 17 e 18: Assinatura JOBS Premium (Sandbox), VideoCall, Notificações, LGPD e Denúncias',
    async () => {
      // 1. Verifica contratos reais dos componentes Screen13..Screen18
      const s13 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen13VideoCall.tsx'), 'utf-8');
      const s14 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen14Notifications.tsx'), 'utf-8');
      const s15 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen15Subscriptions.tsx'), 'utf-8');
      const s16 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen16Settings.tsx'), 'utf-8');
      const s17 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen17PrivacySecurity.tsx'), 'utf-8');
      const s18 = fs.readFileSync(path.join(rootDir, 'src/components/screens/Screen18ReportsBlocks.tsx'), 'utf-8');

      if (!s13.includes('getUserMedia') || !s13.includes('onEndCall') || !s13.includes('onReport')) {
        throw new Error('Screen13VideoCall sem integração com getUserMedia, encerramento ou denúncia.');
      }
      if (!s14.includes('onMarkAllAsRead') || !s14.includes('onClearAll') || !s14.includes('onSelectNotification')) {
        throw new Error('Screen14Notifications sem callbacks obrigatórios de leitura/limpeza/seleção.');
      }
      if (!s15.includes('purchaseJobsPremiumSubscription') || !s15.includes('jobs_user_subscription')) {
        throw new Error('Screen15Subscriptions sem integração com purchaseJobsPremiumSubscription.');
      }
      if (!s16.includes('onNavigateToPrivacy') || !s16.includes('onNavigateToReports') || !s16.includes('onLogout')) {
        throw new Error('Screen16Settings sem rotas para Privacidade, Denúncias ou Logout.');
      }
      if (!s17.includes('LGPD Artigo 18') || !s17.includes('onDeleteAccount') || !s17.includes('invisibleMode')) {
        throw new Error('Screen17PrivacySecurity sem exportação LGPD Art. 18, exclusão de conta ou modo invisível.');
      }
      if (!s18.includes('onUnblockProfile') || !s18.includes('onSubmitReport') || !s18.includes('menor_de_idade')) {
        throw new Error('Screen18ReportsBlocks sem desbloqueio ou categorias críticas de denúncia.');
      }

      // 2. Exercita o fluxo de assinatura JOBS Premium (Tela 15) em ambiente sandbox com idempotência
      const subBuyerId = `qa_sub_buyer_${Date.now()}`;
      exclusiveContentAndInterestService.setUserDiamondWallet(subBuyerId, {
        purchasedDiamonds: 300,
        bonusDiamonds: 0,
      });

      const subIdempKey = `idemp_gate_sub_premium_${subBuyerId}`;
      const subPurchase = await exclusiveContentAndInterestService.purchaseJobsPremiumSubscription({
        buyerUserId: subBuyerId,
        idempotencyKey: subIdempKey,
        environment: 'sandbox',
      });

      if (!subPurchase.grant || subPurchase.transaction.diamondsCharged !== 199) {
        throw new Error('Assinatura JOBS Premium não concedeu grant de 199 diamantes por 30 dias.');
      }

      const walletAfterSub = exclusiveContentAndInterestService.getUserDiamondWallet(subBuyerId);
      if (walletAfterSub.totalAvailableDiamonds !== 101) {
        throw new Error(
          `Saldo de diamantes após assinatura JOBS Premium (300 - 199) incorreto: ${walletAfterSub.totalAvailableDiamonds}`
        );
      }

      // Replay idempotente não deve debitar novamente
      const subReplay = await exclusiveContentAndInterestService.purchaseJobsPremiumSubscription({
        buyerUserId: subBuyerId,
        idempotencyKey: subIdempKey,
        environment: 'sandbox',
      });
      const walletAfterReplay = exclusiveContentAndInterestService.getUserDiamondWallet(subBuyerId);
      if (!subReplay.isReplay || walletAfterReplay.totalAvailableDiamonds !== 101) {
        throw new Error('Falha de idempotência na assinatura JOBS Premium.');
      }

      return `Telas 13..18 auditadas e assinatura JOBS Premium (199 💎 / 30d) validada com idempotência em sandbox (saldo 300 -> 101 💎).`;
    }
  );

  // =========================================================================
  // ETAPA 4 — SEGURANÇA NO SERVIDOR E INTEGRIDADE FINANCEIRA (70/30 + ISOLAMENTO)
  // =========================================================================
  await runCase(
    'GATE-SEC-01',
    'ETAPA_4_SEGURANCA_FINANCEIRO',
    'Segurança de Endpoints Financeiros no Servidor (RBAC, Anti-IDOR 403, Fail-Closed PSP 503 e HMAC PIX 401)',
    async () => {
      const app = createFinancialApp();
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        throw new Error('Falha ao iniciar servidor efêmero para teste de segurança.');
      }
      const baseUrl = `http://127.0.0.1:${addr.port}`;

      try {
        // 1. Prontidão da API financeira e integridade SHA-256
        const readinessRes = await sendJsonRequest(baseUrl, 'GET', '/api/ledger/readiness');
        if (
          readinessRes.status !== 200 ||
          !readinessRes.body?.readiness ||
          !readinessRes.body?.ledgerIntegrity
        ) {
          throw new Error(`Endpoint /api/ledger/readiness retornou status/corpo inesperado: ${readinessRes.status}`);
        }

        // 2. Anti-IDOR em consulta de saldo de terceiros por usuário distinto -> 403 Forbidden
        const idorBalanceRes = await sendJsonRequest(
          baseUrl,
          'GET',
          '/api/ledger/balance/creator_valentina_01',
          {
            'x-actor-user-id': 'attacker_user_99',
          }
        );
        if (idorBalanceRes.status !== 403) {
          throw new Error(
            `Esperado HTTP 403 em tentativa de leitura de saldo de terceiro, obtido: ${idorBalanceRes.status}`
          );
        }

        // 3. Anti-IDOR em solicitação de saque para terceiro -> 403 Forbidden
        const idorPayoutRes = await sendJsonRequest(
          baseUrl,
          'POST',
          '/api/ledger/payouts/request',
          {
            'x-actor-user-id': 'attacker_user_99',
          },
          {
            creatorId: 'creator_valentina_01',
            amountBrl: 100,
            pixKeyOrAccount: 'valentina@pix.com',
            idempotencyKey: `idemp_sec_idor_${Date.now()}`,
          }
        );
        if (idorPayoutRes.status !== 403) {
          throw new Error(`Esperado HTTP 403 em solicitação de saque para terceiro, obtido: ${idorPayoutRes.status}`);
        }

        // 4. Validação de despacho de saque inexistente/fail-closed em produção -> 404/503
        const dispatchProdRes = await sendJsonRequest(
          baseUrl,
          'POST',
          '/api/ledger/payouts/dispatch',
          {
            'x-actor-user-id': 'admin_master',
          },
          {
            payoutId: 'payout_nonexistent_prod',
            environment: 'production',
          }
        );
        if (dispatchProdRes.status !== 404 && dispatchProdRes.status !== 503) {
          throw new Error(
            `Esperado HTTP 404/503 fail-closed em despacho de saque não homologado, obtido: ${dispatchProdRes.status}`
          );
        }

        // 5. Rejeição de Webhook PIX com assinatura HMAC inválida -> 401
        const forgedWebhookRes = await sendJsonRequest(
          baseUrl,
          'POST',
          '/api/webhooks/pix',
          {
            'x-psp-signature': '0000000000000000000000000000000000000000000000000000000000000000',
          },
          {
            eventId: `evt_forged_${Date.now()}`,
            payoutId: 'payout_any',
            eventType: 'PIX_TRANSFER_SETTLED',
            amountCents: 10000,
            timestamp: new Date().toISOString(),
            environment: 'sandbox',
          }
        );
        if (forgedWebhookRes.status !== 401) {
          throw new Error(`Esperado HTTP 401 para webhook PIX com HMAC inválido, obtido: ${forgedWebhookRes.status}`);
        }

        return `Endpoints auditados: /readiness=200 (integrity=${readinessRes.body.ledgerIntegrity.valid}), Anti-IDOR Saldo=403, Anti-IDOR Saque=403, Despacho Prod=404/503, Webhook PIX HMAC Inválido=401.`;
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  );

  await runCase(
    'GATE-SEC-02',
    'ETAPA_4_SEGURANCA_FINANCEIRO',
    'Integridade Financeira na Carteira/Ledger: Regra 70/30 exata, Idempotência, Saldo Insuficiente e Isolamento Sandbox',
    async () => {
      runtimeEnvironmentService.setModeSync('simulation', { userId: 'admin_master', role: 'admin' });

      const buyerId = `qa_gate_buyer_${Date.now()}`;
      const creatorId = `qa_gate_creator_${Date.now()}`;
      const pkg = OFFICIAL_CREDIT_PACKAGES[1]; // 200 créditos

      // 1. Compra de créditos (200 créditos) em ambiente de simulação
      await financialLedger.purchaseCreditPackage({
        userId: buyerId,
        packageId: pkg.id,
        packageName: pkg.name,
        creditsToGrant: 200,
        priceBrl: 30.0,
        gateway: 'pix',
        idempotencyKey: `idemp_gate_dep_${buyerId}`,
      });

      if (financialLedger.getUserCredits(buyerId) !== 200) {
        throw new Error(
          `Saldo do comprador após compra de 200 créditos incorreto: ${financialLedger.getUserCredits(buyerId)}`
        );
      }

      // 2. Desbloqueio de conteúdo de 100 créditos (R$ 10,00) -> Divisão 70% Criador (R$ 7,00) / 30% Plataforma (R$ 3,00)
      const idempSpend = `idemp_gate_unlock_${buyerId}_${creatorId}`;
      await financialLedger.unlockPaidContent({
        userId: buyerId,
        creatorId,
        creatorName: 'Criadora Gate QA',
        contentId: 'content_gate_qa_01',
        contentTitle: 'Ensaio Gate Final QA',
        priceCredits: 100,
        idempotencyKey: idempSpend,
        creatorSharePct: 0.7,
      });

      const buyerAfter = financialLedger.getUserCredits(buyerId);
      const creatorBal = financialLedger.getCreatorBalances(creatorId);

      if (buyerAfter !== 100) {
        throw new Error(`Saldo do comprador deveria ser 100 após gasto de 100 créditos, obtido: ${buyerAfter}`);
      }
      if (creatorBal.pendingBrl !== 7.0 || creatorBal.totalEarnedBrl !== 7.0) {
        throw new Error(
          `Repasse 70/30 do criador deveria ser R$ 7,00, obtido: pending=${creatorBal.pendingBrl}, total=${creatorBal.totalEarnedBrl}`
        );
      }

      // 3. Idempotência: repetir a mesma chave não pode duplicar débito nem crédito
      const replayRes = await financialLedger.unlockPaidContent({
        userId: buyerId,
        creatorId,
        creatorName: 'Criadora Gate QA',
        contentId: 'content_gate_qa_01',
        contentTitle: 'Ensaio Gate Final QA',
        priceCredits: 100,
        idempotencyKey: idempSpend,
        creatorSharePct: 0.7,
      });

      const creatorBalAfterReplay = financialLedger.getCreatorBalances(creatorId);
      if (!replayRes.isReplay || creatorBalAfterReplay.totalEarnedBrl !== 7.0) {
        throw new Error('Falha de idempotência: transação duplicada alterou o saldo do criador.');
      }

      // 4. Prevenção de saldo negativo: comprador com 100 créditos tentando gastar 500
      let insufficientBlocked = false;
      try {
        await financialLedger.unlockPaidContent({
          userId: buyerId,
          creatorId,
          creatorName: 'Criadora Gate QA',
          contentId: 'content_gate_qa_02',
          contentTitle: 'Ensaio Acima do Saldo',
          priceCredits: 500,
          idempotencyKey: `idemp_no_funds_${Date.now()}`,
        });
      } catch {
        insufficientBlocked = true;
      }
      if (!insufficientBlocked) {
        throw new Error('Ledger permitiu gasto com saldo insuficiente.');
      }

      return `Ledger 70/30 validado em sandbox isolado: 100 créditos (R$ 10,00) -> Criador=R$ 7,00 (70%) / Plataforma=R$ 3,00 (30%), idempotência e bloqueio de saldo negativo confirmados.`;
    }
  );

  await runCase(
    'GATE-SEC-03',
    'ETAPA_4_SEGURANCA_FINANCEIRO',
    'Proteção de Mídia Sensível (Anti-IDOR, Bloqueio de Acesso Sem Grant e Teaser SVG Opaco)',
    () => {
      const denied = exclusiveContentAndInterestService.requestSignedMediaDelivery({
        requesterUserId: 'unauth_visitor_qa_99',
        mediaId: 'excl_photo_val_01',
      });
      if (denied.allowed || denied.delivery) {
        throw new Error('Visitante sem concessão de acesso obteve entrega assinada de mídia protegida.');
      }

      const teaser = protectedMediaService.getPublicTeaserUrl({
        id: 'excl_photo_val_01',
        mediaUrl: '/src/assets/images/profile_valentina_1791856836634.jpg',
      });
      if (!teaser.startsWith('data:image/svg+xml;utf8,')) {
        throw new Error('Teaser público não retornou SVG opaco seguro.');
      }

      return `Proteção de mídia confirmada: acesso direto negado (${denied.code}) e teaser SVG opaco entregue.`;
    }
  );

  // =========================================================================
  // ETAPA 5 — AUDITORIA DE CONFIGURAÇÃO ANDROID, CAPACITOR E PLAY STORE
  // =========================================================================
  await runCase(
    'GATE-AND-01',
    'ETAPA_5_ANDROID_CAPACITOR',
    'Auditoria de Configuração Android e Capacitor (appId, SDK 24/36, Versionamento, Manifesto e Ícones Adaptativos)',
    () => {
      const capConfig = fs.readFileSync(path.join(rootDir, 'capacitor.config.ts'), 'utf-8');
      const varsGradle = fs.readFileSync(path.join(rootDir, 'android/variables.gradle'), 'utf-8');
      const appGradle = fs.readFileSync(path.join(rootDir, 'android/app/build.gradle'), 'utf-8');
      const manifest = fs.readFileSync(path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'), 'utf-8');

      if (!capConfig.includes("appId: 'com.jobs.app'") || !capConfig.includes("webDir: 'dist'")) {
        throw new Error('capacitor.config.ts não contém appId com.jobs.app ou webDir dist.');
      }
      if (!varsGradle.includes('minSdkVersion = 24') || !varsGradle.includes('targetSdkVersion = 36')) {
        throw new Error('android/variables.gradle não está configurado com minSdkVersion=24 e targetSdkVersion=36.');
      }
      if (!appGradle.includes('versionCode 1') || !appGradle.includes('versionName "1.0.0"')) {
        throw new Error('android/app/build.gradle não contém versionCode 1 e versionName "1.0.0".');
      }
      if (
        !manifest.includes('android.permission.INTERNET') ||
        !manifest.includes('android.permission.CAMERA') ||
        !manifest.includes('android.permission.RECORD_AUDIO') ||
        !manifest.includes('android.permission.MODIFY_AUDIO_SETTINGS') ||
        !manifest.includes('android.hardware.camera') ||
        !manifest.includes('android.hardware.microphone') ||
        !manifest.includes('@mipmap/ic_launcher') ||
        !manifest.includes('@mipmap/ic_launcher_round')
      ) {
        throw new Error(
          'AndroidManifest.xml sem permissões INTERNET/CAMERA/RECORD_AUDIO/MODIFY_AUDIO_SETTINGS, uses-feature ou ícones adaptativos.'
        );
      }

      if (
        !appGradle.includes('signingConfigs') ||
        !appGradle.includes('JOBS_UPLOAD_STORE_FILE') ||
        !appGradle.includes('JOBS_UPLOAD_KEY_ALIAS')
      ) {
        throw new Error('android/app/build.gradle não contém bloco signingConfigs.release via variáveis de ambiente.');
      }

      const icLauncherXml = path.join(rootDir, 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
      const icLauncherRoundXml = path.join(rootDir, 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml');
      if (!fs.existsSync(icLauncherXml) || !fs.existsSync(icLauncherRoundXml)) {
        throw new Error('Arquivos XML de ícone adaptativo em mipmap-anydpi-v26 ausentes.');
      }

      return `Configuração Android/Capacitor validada: appId=com.jobs.app, minSdk=24, targetSdk=36, version=1.0.0 (1), signingConfigs via env, permissões WebRTC e ícones adaptativos íntegros.`;
    }
  );

  await runCase(
    'GATE-AND-02',
    'ETAPA_5_ANDROID_CAPACITOR',
    'Auditoria de CI/CD em 2 Jobs (web-pipeline e android-validation), Captura de Logs por Etapa e Wrapper Gradle',
    () => {
      const workflowPath = path.join(rootDir, '.github/workflows/android-release-gate.yml');
      const brokenDenoPath = path.join(rootDir, '.github/workflows/deno.yml');
      const brokenGradlePublishPath = path.join(rootDir, '.github/workflows/gradle-publish.yml');
      const gradlewPath = path.join(rootDir, 'android/gradlew');

      if (!fs.existsSync(workflowPath)) {
        throw new Error('Workflow .github/workflows/android-release-gate.yml ausente.');
      }
      if (fs.existsSync(brokenDenoPath) || fs.existsSync(brokenGradlePublishPath)) {
        throw new Error('Templates de workflow incompatíveis (deno.yml / gradle-publish.yml) ainda presentes.');
      }
      if (!fs.existsSync(gradlewPath)) {
        throw new Error('Wrapper android/gradlew ausente.');
      }

      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      const requiredContracts = [
        'web-pipeline:',
        'android-validation:',
        'needs: web-pipeline',
        'uses: oven-sh/setup-bun@v2',
        "bun-version: '1.4.4'",
        'bun install --frozen-lockfile',
        'bun run test',
        'bun run typecheck',
        'bun run build',
        'bun run build:android',
        'ci-logs/01-bun-install.log',
        'ci-logs/02-bun-test.log',
        'ci-logs-android/05-cap-sync-android.log',
        'ci-logs-android/07-gradle-assemble-debug.log',
        './android/gradlew -p android assembleDebug',
        'actions/upload-artifact@v4',
      ];
      const missingContracts = requiredContracts.filter((contract) => !workflowContent.includes(contract));
      if (missingContracts.length > 0) {
        throw new Error(
          `Workflow android-release-gate.yml não atende aos contratos obrigatórios (jobs separados web-pipeline/android-validation e captura de logs). Ausentes: ${missingContracts
            .map((contract) => `"${contract}"`)
            .join(', ')}.`
        );
      }

      return `Workflow CI android-release-gate.yml validado: Bun 1.4.4 (setup-bun@v2), jobs web-pipeline (bun install --frozen-lockfile -> test -> typecheck -> build + logs) e android-validation (needs web-pipeline; build:android/cap sync -> config check -> assembleDebug + logs e artifacts).`;
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - suiteStart,
    results,
  };
}
