import { FastifyRequest, FastifyReply } from 'fastify';
import { agentConnection } from '../agents/connection.js';
import { sessionRegistry } from '../services/session.js';
import {
  translateMessagesToContentBlocks,
  translateResponseToOpenAI,
  createErrorResponse
} from '../services/translator.js';
import type { ChatRequest, ChatResponse, ChatChunk, OpenAIError, ToolCall } from './types.js';
import logger from '../utils/logger.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function handleChatCompletion(
  request: FastifyRequest<{ Body: ChatRequest }>,
  reply: FastifyReply
): Promise<void> {
  const { model, messages, stream = false, session_id } = request.body;

  logger.info('Chat completion request', { request: request.body });

  if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
    const errorRes = createErrorResponse(
      'invalid_request_error',
      'Missing required fields: model and messages are required',
      'missing_fields'
    );
    logger.warn('Chat completion invalid request', { error: errorRes });
    reply.status(400).send(errorRes as OpenAIError);
    return;
  }

  if (!agentConnection.isReady()) {
    const errorRes = createErrorResponse(
      'api_error',
      'Agent not ready',
      'agent_not_ready'
    );
    logger.error('Chat completion agent not ready', { error: errorRes });
    reply.status(503).send(errorRes as OpenAIError);
    return;
  }

  try {
    let internalSessionId: string;
    let acpSessionId: string;

    if (session_id) {
      const existing = sessionRegistry.getByAcpId(session_id);
      if (!existing) {
        reply.status(404).send(createErrorResponse(
          'invalid_request_error',
          'Session not found',
          'session_not_found'
        ) as OpenAIError);
        return;
      }
      
      internalSessionId = session_id;
      acpSessionId = session_id;
      
      if (!sessionRegistry.lock(internalSessionId)) {
        reply.status(409).send(createErrorResponse(
          'invalid_request_error',
          'Session is busy',
          'session_busy'
        ) as OpenAIError);
        return;
      }
    } else {
      acpSessionId = await agentConnection.createSession();
      internalSessionId = sessionRegistry.create(acpSessionId);
      sessionRegistry.lock(internalSessionId);
    }

    const contentBlocks = translateMessagesToContentBlocks(messages);
    const responseId = `chatcmpl-${generateId()}`;
    const created = Math.floor(Date.now() / 1000);

    if (stream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      let finished = false;

      agentConnection.onSessionUpdate(acpSessionId, (update) => {
        if (update.type === 'agent_message_chunk' || update.type === 'thought' || update.type === 'tool_call') {
          const delta: any = {};
          if (update.type === 'agent_message_chunk' && update.content) {
            delta.content = update.content;
          } else if (update.type === 'thought' && update.content) {
            delta.reasoning_content = update.content;
          } else if (update.type === 'tool_call' && update.toolCallId) {
            delta.tool_calls = [{
              index: 0,
              id: update.toolCallId,
              type: 'function',
              function: {
                name: update.toolName || '',
                arguments: update.arguments ? JSON.stringify(update.arguments) : '{}'
              }
            }];
          }

          const chunk = {
            id: responseId,
            object: 'chat.completion.chunk' as string,
            created,
            model,
            choices: [{
              index: 0,
              delta,
              finish_reason: null
            }]
          };
          
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        } else if (update.type === 'end_turn') {
          finished = true;
          let stopReason = update.stopReason === 'max_tokens' ? 'length' : 'stop';
          
          const finalChunk: ChatChunk = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: stopReason as any
            }]
          };
          
          reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          reply.raw.write('data: [DONE]\n\n');
          reply.raw.end();
          logger.info('Chat completion stream finished', { id: responseId, session_id: acpSessionId });
        }
      });

      await agentConnection.prompt(acpSessionId, contentBlocks);

      setTimeout(() => {
        if (!finished) {
          logger.warn('Request timeout, sending final chunk', { id: responseId, session_id: acpSessionId });
          const finalChunk: ChatChunk = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          };
          reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          reply.raw.write('data: [DONE]\n\n');
          reply.raw.end();
        }
      }, 120000);

      return;
    } else {
      let fullContent = '';
      let reasoningContent = '';
      let toolCalls: ToolCall[] = [];
      let finished = false;
      let stopReason = 'stop';
      let checkInterval: NodeJS.Timeout | null = null;

      return new Promise<void>((resolve, reject) => {
        const handler = (update: any) => {
          if (update.type === 'agent_message_chunk' && update.content) {
            fullContent += update.content;
          } else if (update.type === 'thought' && update.content) {
            reasoningContent += update.content;
          } else if (update.type === 'tool_call' && update.toolCallId) {
            toolCalls.push({
              id: update.toolCallId,
              type: 'function',
              function: {
                name: update.toolName || '',
                arguments: update.arguments ? JSON.stringify(update.arguments) : '{}'
              }
            });
          } else if (update.type === 'end_turn') {
            stopReason = update.stopReason || 'stop';
            finished = true;
          }
        };

        agentConnection.onSessionUpdate(acpSessionId, handler);

        agentConnection.prompt(acpSessionId, contentBlocks).then(() => {
          checkInterval = setInterval(() => {
            if (finished) {
              clearInterval(checkInterval!);
              checkInterval = null;
              
              setTimeout(() => {
                const response = translateResponseToOpenAI(
                  fullContent,
                  stopReason,
                  model,
                  acpSessionId,
                  reasoningContent,
                  toolCalls
                );
                
                response.id = responseId;
                response.created = created;

                sessionRegistry.unlock(internalSessionId);
                agentConnection.removeSessionHandler(acpSessionId);
                
                logger.info('Chat completion response', { response });
                reply.send(response);
                resolve();
              }, 100);
            }
          }, 100);

          setTimeout(() => {
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            if (!finished) {
               logger.warn('Chat completion timeout before end_turn', { id: responseId, session_id: acpSessionId });
            }
            const response = translateResponseToOpenAI(
              fullContent,
              stopReason,
              model,
              acpSessionId,
              reasoningContent,
              toolCalls
            );
            
            response.id = responseId;
            response.created = created;

            sessionRegistry.unlock(internalSessionId);
            agentConnection.removeSessionHandler(acpSessionId);
            
            logger.info('Chat completion response (timeout)', { response });
            reply.send(response);
            resolve();
          }, 120000);
        }).catch((err) => {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
          sessionRegistry.unlock(internalSessionId);
          agentConnection.removeSessionHandler(acpSessionId);
          
          logger.error('Prompt error', { error: err.message });
          if (!reply.raw.headersSent) {
            const errorRes = createErrorResponse(
              'api_error',
              `Agent error: ${err.message}`,
              'agent_protocol_error'
            );
            logger.error('Chat completion failed', { error: errorRes });
            reply.status(502).send(errorRes as OpenAIError);
          }
          resolve();
        });
      });
    }
  } catch (err) {
    logger.error('Chat completion error', { error: err });
    if (!reply.raw.headersSent) {
      const errorRes = createErrorResponse(
        'api_error',
        `Agent error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'agent_protocol_error'
      );
      logger.error('Chat completion exception', { error: errorRes });
      reply.status(502).send(errorRes as OpenAIError);
    } else {
      reply.raw.end();
    }
  }
}

export default handleChatCompletion;
