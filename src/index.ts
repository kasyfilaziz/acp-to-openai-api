import Fastify from 'fastify';
import { config } from './utils/config.js';
import logger from './utils/logger.js';
import { agentConnection } from './agents/connection.js';
import { handleChatCompletion } from './api/completions.js';
import { handleModels } from './api/models.js';
import { createErrorResponse } from './services/translator.js';
import type { OpenAIError } from './api/types.js';

const fastify = Fastify({
  logger: false
});

fastify.post('/v1/chat/completions', async (request, reply) => {
  return handleChatCompletion(request as any, reply as any);
});

fastify.get('/v1/models', async (request, reply) => {
  return handleModels(request as any, reply as any);
});

fastify.get('/health', async () => {
  return { status: 'ok', agentReady: agentConnection.isReady() };
});

fastify.setErrorHandler(async (error, request, reply) => {
  logger.error('Unhandled error', { error: String(error), path: request.url });
  
  reply.status(500).send(createErrorResponse(
    'api_error',
    'Internal server error',
    'internal_error'
  ) as OpenAIError);
});

async function start(): Promise<void> {
  try {
    logger.info('Connecting to ACP agent...');
    await agentConnection.connect();
    logger.info('Agent connected successfully');
    
    await fastify.listen({ 
      host: config.server.host, 
      port: config.server.port 
    });
    
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    logger.error('Failed to start server', { error: String(err) });
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down...');
  agentConnection.disconnect();
  await fastify.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export default fastify;