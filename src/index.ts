console.log('Starting index.ts...');
import Fastify from 'fastify';
console.log('Imported Fastify');
import { config } from './utils/config.js';
console.log('Imported config');
import logger from './utils/logger.js';
console.log('Imported logger');
import { agentConnection } from './agents/connection.js';
console.log('Imported agentConnection');
import { handleChatCompletion } from './api/completions.js';
console.log('Imported handleChatCompletion');
import { handleModels } from './api/models.js';
console.log('Imported handleModels');
import { createErrorResponse } from './services/translator.js';
console.log('Imported createErrorResponse');
import type { OpenAIError } from './api/types';

console.log('Initializing Fastify...');
const fastify = Fastify({
  logger: false
});
console.log('Fastify initialized');

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

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason: String(reason), stack: (reason as any)?.stack });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: String(error), stack: error.stack });
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function start(): Promise<void> {
  try {
    console.log('Connecting to ACP agent...');
    logger.info('Connecting to ACP agent...');
    await agentConnection.connect();
    console.log('Agent connected successfully');
    logger.info('Agent connected successfully');
    
    console.log(`Starting server on ${config.server.host}:${config.server.port}...`);
    await fastify.listen({ 
      host: config.server.host, 
      port: config.server.port 
    });
    
    console.log(`Server listening on ${config.server.host}:${config.server.port}`);
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
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

console.log('Calling start()...');
start();

export default fastify;