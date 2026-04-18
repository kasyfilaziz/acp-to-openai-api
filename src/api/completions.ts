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

  logger.info('Chat completion request', { body: request.body });

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

  let retryCount = 0;
  const maxRetries = 1;

  while (retryCount <= maxRetries) {
    try {
      let internalSessionId: string;
      let acpSessionId: string;

      if (session_id) {
        const existingId = sessionRegistry.getInternalIdByAcpId(session_id);
        if (!existingId) {
          internalSessionId = sessionRegistry.create(session_id);
        } else {
          internalSessionId = existingId;
        }
        acpSessionId = session_id;
        
        if (!sessionRegistry.lock(internalSessionId)) {
          if (!reply.raw.headersSent) {
            reply.status(409).send(createErrorResponse(
              'invalid_request_error',
              'Session is busy',
              'session_busy'
            ) as OpenAIError);
          }
          return;
        }
      } else {
        const persistentId = sessionRegistry.getPersistentSessionId();
        if (persistentId) {
          acpSessionId = persistentId;
          const existingId = sessionRegistry.getInternalIdByAcpId(acpSessionId);
          if (existingId) {
            internalSessionId = existingId;
          } else {
            internalSessionId = sessionRegistry.create(acpSessionId);
          }
        } else {
          acpSessionId = await agentConnection.createSession();
          internalSessionId = sessionRegistry.create(acpSessionId);
          sessionRegistry.setPersistentSessionId(acpSessionId);
        }

        if (!sessionRegistry.lock(internalSessionId)) {
          if (!reply.raw.headersSent) {
            reply.status(409).send(createErrorResponse(
              'invalid_request_error',
              'Session is busy',
              'session_busy'
            ) as OpenAIError);
          }
          return;
        }
      }

      const contentBlocks = translateMessagesToContentBlocks(messages);
      const responseId = `chatcmpl-${generateId()}`;
      const created = Math.floor(Date.now() / 1000);

      if (stream) {
        let headersSent = false;
        const sendHeaders = () => {
          if (!headersSent && !reply.raw.headersSent) {
            reply.raw.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            });
            headersSent = true;
          }
        };

        let finished = false;
        let chunkCount = 0;

        agentConnection.onSessionUpdate(acpSessionId, (update) => {
          sendHeaders();
          
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
            chunkCount++;
          } else if (update.type === 'end_turn') {
            if (finished) return;
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
            
            sessionRegistry.unlock(internalSessionId);
            agentConnection.removeSessionHandler(acpSessionId);
            logger.info('Chat completion stream finished via end_turn', { id: responseId, session_id: acpSessionId, chunkCount });
          }
        });

        try {
          const stopReason = await agentConnection.prompt(acpSessionId, contentBlocks);
          sendHeaders();
          
          if (!finished) {
            logger.info('Prompt finished but turn not ended via notification, closing stream', { id: responseId, session_id: acpSessionId, stopReason });
            
            const finalChunk: ChatChunk = {
              id: responseId,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{
                index: 0,
                delta: {},
                finish_reason: (stopReason === 'max_tokens' ? 'length' : 'stop') as any
              }]
            };
            
            reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
            reply.raw.write('data: [DONE]\n\n');
            reply.raw.end();
            
            finished = true;
            sessionRegistry.unlock(internalSessionId);
            agentConnection.removeSessionHandler(acpSessionId);
          }
          return; // Success, exit the loop
        } catch (err) {
          sessionRegistry.unlock(internalSessionId);
          agentConnection.removeSessionHandler(acpSessionId);
          
          const errStr = String(err);
          if (!headersSent && retryCount < maxRetries && (errStr.includes('Internal error') || errStr.includes('Session not found'))) {
            logger.warn(`Agent session error, retrying (${retryCount + 1}/${maxRetries})...`, { error: errStr });
            sessionRegistry.setPersistentSessionId('');
            retryCount++;
            continue;
          }
          
          logger.error('Prompt error in stream', { error: errStr });
          if (!headersSent && !reply.raw.headersSent) {
            const errorRes = createErrorResponse('api_error', `Agent error: ${errStr}`, 'agent_protocol_error');
            reply.status(502).send(errorRes as OpenAIError);
          } else if (!finished) {
            reply.raw.write('data: [DONE]\n\n');
            reply.raw.end();
          }
          return;
        }

      } else {
        let fullContent = '';
        let reasoningContent = '';
        let toolCalls: ToolCall[] = [];
        let finished = false;
        let stopReasonStr = 'stop';

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
            stopReasonStr = update.stopReason || 'stop';
            finished = true;
          }
        };

        agentConnection.onSessionUpdate(acpSessionId, handler);

        try {
          const finalStopReason = await agentConnection.prompt(acpSessionId, contentBlocks);
          const finalReason = finished ? stopReasonStr : finalStopReason;
          
          const response = translateResponseToOpenAI(
            fullContent,
            finalReason,
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
          return;
        } catch (err) {
          sessionRegistry.unlock(internalSessionId);
          agentConnection.removeSessionHandler(acpSessionId);
          
          const errStr = String(err);
          if (retryCount < maxRetries && (errStr.includes('Internal error') || errStr.includes('Session not found'))) {
            logger.warn(`Agent session error, retrying (${retryCount + 1}/${maxRetries})...`, { error: errStr });
            sessionRegistry.setPersistentSessionId('');
            retryCount++;
            continue;
          }

          logger.error('Prompt error in non-stream', { error: errStr });
          if (!reply.raw.headersSent) {
            const errorRes = createErrorResponse(
              'api_error',
              `Agent error: ${errStr}`,
              'agent_protocol_error'
            );
            reply.status(502).send(errorRes as OpenAIError);
          }
          return;
        }
      }
    } catch (err) {
      logger.error('Chat completion error', { error: String(err) });
      if (!reply.raw.headersSent) {
        const errorRes = createErrorResponse(
          'api_error',
          `Agent error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'agent_protocol_error'
        );
        reply.status(502).send(errorRes as OpenAIError);
      } else {
        reply.raw.end();
      }
      return;
    }
  }
}

export default handleChatCompletion;
