import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { financialLedger, PayoutEnvironment } from './src/services/ledgerService';
import {
  pspWebhookReconciliationService,
  PixWebhookPayload,
} from './src/services/pspWebhookReconciliationService';
import { financialDomainAdapter } from './src/services/financialDomainAdapter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createFinancialApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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

    res.json({
      readiness,
      ledgerIntegrity: integrity,
      reconciliation: {
        sandbox: reconciliationSandbox,
        production: reconciliationProd,
      },
      persistenceComparison: pspWebhookReconciliationService.getPersistenceArchitectureComparison(),
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

async function startServer() {
  const app = createFinancialApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JOBS Financial Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

// Só inicia o listener HTTP automaticamente quando executado diretamente como entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer().catch((err) => {
    console.error('[JOBS Financial Server] Startup error:', err);
    process.exit(1);
  });
}
