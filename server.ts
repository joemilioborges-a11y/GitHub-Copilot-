import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);

// Verifica se já está sob o loader tsx ou já foi inicializado
const isTsxActive =
  process.env.__TSX_BOOTSTRAPPED === '1' ||
  process.execArgv.some((arg) => arg.includes('tsx'));

if (isTsxActive) {
  const { startServer: runner } = await import('./src/serverApp');
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    runner().catch((err) => {
      console.error('[JOBS Financial Server] Startup error:', err);
      process.exit(1);
    });
  }
} else {
  // Bootstrap automático com tsx para compatibilidade total com "node server.ts" em produção Cloud Run
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', __filename, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        __TSX_BOOTSTRAPPED: '1',
      },
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

export async function createFinancialApp() {
  const { createFinancialApp: appFactory } = await import('./src/serverApp');
  return appFactory();
}

export async function startServer() {
  const { startServer: runner } = await import('./src/serverApp');
  return runner();
}
