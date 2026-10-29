import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { financialLedger, PayoutEnvironment } from './services/ledgerService';
import {
  pspWebhookReconciliationService,
  PixWebhookPayload,
} from './services/pspWebhookReconciliationService';
import { financialDomainAdapter } from './services/financialDomainAdapter';
import {
  ai,
  getSafeMeetupRecommendationsServer,
  generateContentServer,
  setupGeminiLiveWebSocket,
} from './server/geminiService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function createFinancialApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  /**
   * ============================================================================
   * ROTAS DO SERVIÇO GEMINI NO SERVIDOR (SERVER-SIDE PROXY & STREAMING)
   * ============================================================================
   */

  /**
   * POST /api/gemini/safe-meetup
   * Executa Maps Grounding seguro no servidor para sugestões de locais públicos.
   * Evita chamadas client-side e protege a API Key.
   */
  app.post('/api/gemini/safe-meetup', async (req, res) => {
    try {
      const { zoneId, neighborhoodName, cityName, centroid } = req.body || {};
      if (!zoneId || !centroid || typeof centroid.lat !== 'number' || typeof centroid.lng !== 'number') {
        res.status(400).json({ error: 'Parâmetros obrigatórios ausentes (zoneId, centroid).' });
        return;
      }

      const result = await getSafeMeetupRecommendationsServer({
        zoneId,
        neighborhoodName: neighborhoodName || 'Região Central',
        cityName: cityName || 'São Paulo',
        centroid,
      });

      res.json(result);
    } catch (err) {
      console.error('[Gemini Route Error /api/gemini/safe-meetup]', err);
      res.status(500).json({
        summaryText: 'Sugestões temporariamente em fallback por indisponibilidade momentânea.',
        citations: [],
        source: 'curated_public_landmarks',
      });
    }
  });

  /**
   * POST /api/gemini/generate
   * Geração de texto geral via Gemini no servidor.
   */
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { contents, systemInstruction, model } = req.body || {};
      if (!contents) {
        res.status(400).json({ error: 'Campo "contents" obrigatório.' });
        return;
      }

      const output = await generateContentServer({
        contents,
        systemInstruction,
        model,
      });

      res.json(output);
    } catch (err) {
      console.error('[Gemini Route Error /api/gemini/generate]', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Falha ao processar com Gemini no servidor.',
      });
    }
  });

  /**
   * POST /api/gemini/stream
   * Geração de conteúdo streaming (Server-Sent Events - SSE).
   */
  app.post('/api/gemini/stream', async (req, res) => {
    try {
      const { contents, systemInstruction, model } = req.body || {};
      if (!contents) {
        res.status(400).json({ error: 'Campo "contents" obrigatório.' });
        return;
      }

      if (!ai) {
        res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const modelToUse = model || 'gemini-3.8-flash';
      const stream = await ai.models.generateContentStream({
        model: modelToUse,
        contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('[Gemini Route Error /api/gemini/stream]', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Erro durante o streaming Gemini.',
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Falha durante o stream' })}\n\n`);
        res.end();
      }
    }
  });

  /**
   * ============================================================================
   * ROTAS DO LIVRO-RAZÃO & AUDITORIA FINANCEIRA (API EXPRESS)
   * ============================================================================
   */

  /**
   * GET /api/ledger/readiness
   * Retorna o diagnóstico oficial dos 9 critérios de prontidão financeira,
   * conciliação de saques e integridade criptográfica SHA-256 do livro-razão.
   */
  app.get('/api/ledger/readiness', (_req, res) => {
    const readiness = pspWebhookReconciliationService.evaluateFinancialReadinessCriteria();
    const integrity = financialLedger.verifyLedgerIntegrity();
    const reconciliationSandbox = pspWebhookReconciliationService.reconcilePayoutRecords('sandbox');
    const reconciliationProd = pspWebhookReconciliationService.reconcilePayoutRecords('production');
    const homologationDiag = pspWebhookReconciliationService.getFailClosedHomologationDiagnostic();

    res.json({
      readiness,
      ledgerIntegrity: integrity,
      reconciliation: {
        sandbox: reconciliationSandbox,
        production: reconciliationProd,
      },
      persistenceComparison: pspWebhookReconciliationService.getPersistenceArchitectureComparison(),
      homologationDiagnostic: homologationDiag,
    });
  });

  /**
   * GET /api/ledger/balance/:userId
   * Retorna o snapshot unificado e segregado por domínio do usuário autenticado.
   */
  app.get('/api/ledger/balance/:userId', (req, res) => {
    const { userId } = req.params;
    const actorUserId = (req.headers['x-actor-user-id'] as string | undefined) || userId;

    if (actorUserId !== userId) {
      res.status(403).json({
        error: 'Acesso negado: um usuário não pode consultar o saldo privado de outro titular.',
      });
      return;
    }

    try {
      const snapshot = financialDomainAdapter.getSegregatedDomainSnapshot(userId);
      res.json(snapshot);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erro ao consultar saldo do livro-razão.',
      });
    }
  });

  /**
   * POST /api/ledger/payouts/request
   * Registra solicitação de saque no livro-razão autoritativo com validação de
   * idempotência, saldo líquido de reservas e titularidade.
   */
  app.post('/api/ledger/payouts/request', async (req, res) => {
    try {
      const actorUserId = req.headers['x-actor-user-id'] as string | undefined;
      const {
        creatorId,
        creatorName,
        amountBrl,
        payoutMethod,
        pixKeyOrAccount,
        idempotencyKey,
        environment,
      } = req.body || {};

      if (!creatorId || !idempotencyKey || typeof amountBrl !== 'number') {
        res.status(400).json({
          error: 'Parâmetros obrigatórios ausentes (creatorId, amountBrl, idempotencyKey).',
        });
        return;
      }

      if (actorUserId && actorUserId !== creatorId) {
        res.status(403).json({
          error: 'Violação de autorização: actorUserId diverge do titular do saque.',
        });
        return;
      }

      const env: PayoutEnvironment = environment === 'production' ? 'production' : 'sandbox';
      const result = await financialLedger.requestPayout({
        creatorId,
        creatorName: creatorName || creatorId,
        amountBrl,
        payoutMethod: payoutMethod || 'PIX',
        pixKeyOrAccount,
        idempotencyKey,
        environment: env,
        actorUserId: actorUserId || creatorId,
        reserveImmediately: true,
      });

      res.status(result.isReplay ? 200 : 201).json(result);
    } catch (err) {
      res.status(422).json({
        error: err instanceof Error ? err.message : 'Falha ao processar solicitação de saque.',
      });
    }
  });

  /**
   * POST /api/ledger/payouts/dispatch
   * Dispara a ordem de saque PIX através do adaptador fail-closed.
   * Recusa determinística com código 'PSP_NOT_CONFIGURED_FOR_PRODUCTION' quando
   * executado para o ambiente de produção sem credenciais SPI reais homologadas.
   */
  app.post('/api/ledger/payouts/dispatch', async (req, res) => {
    try {
      const actorUserId = (req.headers['x-actor-user-id'] as string | undefined) || 'admin';
      const { payoutId, environment } = req.body || {};

      if (!payoutId) {
        res.status(400).json({
          error: 'Parâmetro obrigatório ausente: payoutId.',
        });
        return;
      }

      const env: PayoutEnvironment = environment === 'production' ? 'production' : 'sandbox';
      const dispatchResult = await pspWebhookReconciliationService.dispatchPixPayoutOrder({
        payoutId,
        environment: env,
        actorId: actorUserId,
      });

      if (!dispatchResult.dispatched && dispatchResult.errorCode === 'PSP_NOT_CONFIGURED_FOR_PRODUCTION') {
        res.status(503).json({
          success: false,
          ...dispatchResult,
        });
        return;
      }

      if (!dispatchResult.dispatched && dispatchResult.errorCode === 'PAYOUT_NOT_FOUND') {
        res.status(404).json({
          success: false,
          ...dispatchResult,
        });
        return;
      }

      res.status(200).json({
        success: true,
        ...dispatchResult,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao despachar ordem de saque PIX.',
      });
    }
  });

  /**
   * POST /api/webhooks/pix
   * Endpoint receptor de webhooks PSP PIX com verificação HMAC-SHA256,
   * janela anti-replay, idempotência por eventId e conciliação estrita em centavos.
   */
  app.post('/api/webhooks/pix', async (req, res) => {
    try {
      const signatureHeader = (req.headers['x-psp-signature'] as string) || '';
      const timestampHeader = (req.headers['x-psp-timestamp'] as string) || '';
      const payload = req.body as PixWebhookPayload;

      const result = await pspWebhookReconciliationService.processPixWebhookEvent({
        payload,
        signatureHeader,
        timestampHeader,
        secret: process.env.PSP_WEBHOOK_HMAC_SECRET,
      });

      if (!result.accepted) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      res.status(422).json({
        accepted: false,
        errorReason: err instanceof Error ? err.message : 'Erro interno ao conciliar webhook PIX.',
      });
    }
  });

  return app;
}

export async function startServer() {
  const app = createFinancialApp();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Inicializa o WebSocket Server para a Gemini Live API
  setupGeminiLiveWebSocket(server);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[JOBS Financial & Gemini Server] Listening on http://0.0.0.0:${PORT}`);
  });
}
