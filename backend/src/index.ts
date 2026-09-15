import express from 'express';
import type { Express } from 'express';

async function loadApp(): Promise<Express> {
  try {
    const { createApp } = await import('./app.js');
    return createApp();
  } catch (err) {
    console.error('API failed to start:', err);
    const fallback = express();
    const message =
      err instanceof Error
        ? err.message
            .replace(/^Invalid environment configuration:\s*/, '')
            .replace(/^\s+-\s+/gm, '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .join(' ')
        : 'The API failed to start.';

    fallback.use((_req, res) => {
      res.status(503).json({
        error: {
          code: 'API_UNAVAILABLE',
          message,
        },
      });
    });
    return fallback;
  }
}

const app = await loadApp();

// On Vercel the platform invokes the exported app. Binding a port there can
// crash the function (FUNCTION_INVOCATION_FAILED). Local/dev still listens.
if (!process.env.VERCEL) {
  const { config } = await import('./config/index.js');
  const { prisma } = await import('./common/prisma.js');

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`API listening on port ${config.port} (${config.nodeEnv})`);
    console.log(`Database ${config.databaseLabel}`);
    console.log(
      config.smtp.isConfigured
        ? `Password reset email via SMTP ${config.smtp.host}`
        : 'Password reset email via console (set SMTP_HOST/SMTP_USER/SMTP_PASS to send mail)',
    );
    if (
      config.isProduction &&
      config.corsOrigins.every((origin) => origin === 'http://localhost:3000')
    ) {
      console.warn(
        'CORS_ORIGIN is still localhost. Set it to the Vercel URL after the web app is live.',
      );
    }
  });

  async function shutdown(signal: string) {
    console.log(`\n${signal} received, shutting down.`);

    server.close(async (error) => {
      if (error) {
        console.error('Error while closing the server:', error);
      }
      await prisma.$disconnect();
      process.exit(error ? 1 : 0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export default app;
