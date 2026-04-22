import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import http from 'http';
import { env } from './config/env';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profiles';
import { discoveryRoutes } from './routes/discovery';
import { matchRoutes } from './routes/matches';
import { messageRoutes } from './routes/messages';
import { safetyRoutes } from './routes/safety';
import { verificationRoutes } from './routes/verification';
import { createSocketServer } from './websocket/socketServer';
import { startMatchExpiryWorker, scheduleMatchExpiry } from './workers/matchExpiryWorker';

const app = Fastify({ logger: env.NODE_ENV !== 'test' });

async function start() {
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(profileRoutes, { prefix: '/api/v1/profiles' });
  await app.register(discoveryRoutes, { prefix: '/api/v1/discovery' });
  await app.register(matchRoutes, { prefix: '/api/v1/matches' });
  await app.register(messageRoutes, { prefix: '/api/v1/messages' });
  await app.register(safetyRoutes, { prefix: '/api/v1/safety' });
  await app.register(verificationRoutes, { prefix: '/api/v1/verification' });

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Error handler
  app.setErrorHandler((error, req, reply) => {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.message });
    }
    app.log.error(error);
    reply.code(error.statusCode ?? 500).send({ error: error.message });
  });

  const httpServer = http.createServer(app.server);
  createSocketServer(httpServer);

  // Start background workers
  startMatchExpiryWorker();
  await scheduleMatchExpiry();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on port ${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
