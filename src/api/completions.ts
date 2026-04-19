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
        let toolCallSent = false;
        let contentSent = false;
        let nextToolCallIndex = 0;

        agentConnection.onSessionUpdate(acpSessionId, (update) => {
          sendHeaders();
          
          if (update.type === 'agent_message_chunk' || update.type === 'thought' || update.type === 'tool_call' || update.type === 'tool_call_update') {
            const delta: any = {};
            
            if (update.type === 'agent_message_chunk' && update.content) {
              delta.content = update.content;
              contentSent = true;
            } else if (update.type === 'thought' && update.content) {
              // If we already started sending actual response content, 
              // we append thoughts to content to avoid UI interleaving errors.
              if (contentSent) {
                delta.content = `\n> 💭 **Thought**: ${update.content}\n`;
              } else {
                delta.reasoning_content = update.content;
              }
            } else if (update.type === 'tool_call' && update.arguments) {
              const argStr = JSON.stringify(update.arguments);
              const toolInfo = `\n> 🛠️ **Internal Tool Call**: I am executing \`${update.toolName}\` with parameters: \`${argStr}\`\n`;
              
              if (contentSent) {
                delta.content = toolInfo;
              } else {
                delta.reasoning_content = toolInfo;
              }
            } else if (update.type === 'tool_call_update') {
              let toolResult = '';
              if (update.status === 'completed') {
                const outputStr = typeof update.output === 'string' ? update.output : JSON.stringify(update.output || '');
                const displayOut = outputStr ? `\n> \`\`\`\n> ${outputStr.length > 500 ? outputStr.substring(0, 500) + '... (truncated)' : outputStr}\n> \`\`\`` : '';
                toolResult = `\n> ✅ **Result**: The tool \`${update.toolName}\` finished processing successfully.${displayOut}\n`;
              } else if (update.status === 'failed') {
                toolResult = `\n> ❌ **Error**: The tool \`${update.toolName}\` encountered an issue during execution.\n`;
              }

              if (toolResult) {
                if (contentSent) {
                  delta.content = toolResult;
                } else {
                  delta.reasoning_content = toolResult;
                }
              }
            }

            if (Object.keys(delta).length === 0) return;

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
            
            let stopReason = 'stop';
            if (update.stopReason === 'max_tokens') {
              stopReason = 'length';
            } else if (toolCallSent) {
              stopReason = 'tool_calls';
            }
            
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
            logger.info('Chat completion stream finished via end_turn', { id: responseId, session_id: acpSessionId, chunkCount, stopReason });
          }
        });

        try {
          const stopReason = await agentConnection.prompt(acpSessionId, contentBlocks);
          sendHeaders();
          
          if (!finished) {
            logger.info('Prompt finished but turn not ended via notification, closing stream', { id: responseId, session_id: acpSessionId, stopReason });
            
            let finalStopReason = (stopReason === 'max_tokens' ? 'length' : 'stop');
            if (toolCallSent) {
              finalStopReason = 'tool_calls';
            }

            const finalChunk: ChatChunk = {
              id: responseId,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{
                index: 0,
                delta: {},
                finish_reason: finalStopReason as any
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
          logger.debug('Handler received update', { type: update.type, hasContent: !!update.content });
          if (update.type === 'agent_message_chunk' && update.content) {
            fullContent += update.content;
          } else if (update.type === 'thought' && update.content) {
            logger.debug('Accumulating reasoning content', { length: update.content.length });
            reasoningContent += update.content;
          } else if (update.type === 'tool_call' && update.arguments) {
            const argStr = JSON.stringify(update.arguments);
            reasoningContent += `\n> 🛠️ **Internal Tool Call**: I am executing \`${update.toolName}\` with parameters: \`${argStr}\`\n`;
          } else if (update.type === 'tool_call_update') {
            if (update.status === 'completed') {
              const outputStr = typeof update.output === 'string' ? update.output : JSON.stringify(update.output || '');
              const displayOut = outputStr ? `\n> \`\`\`\n> ${outputStr.length > 500 ? outputStr.substring(0, 500) + '... (truncated)' : outputStr}\n> \`\`\`` : '';
              reasoningContent += `\n> ✅ **Result**: The tool \`${update.toolName}\` finished processing successfully.${displayOut}\n`;
            } else if (update.status === 'failed') {
              reasoningContent += `\n> ❌ **Error**: The tool \`${update.toolName}\` encountered an issue during execution.\n`;
            }
          } else if (update.type === 'end_turn') {
            stopReasonStr = update.stopReason || 'stop';
            finished = true;
          }
        };

        agentConnection.onSessionUpdate(acpSessionId, handler);

        try {
          const finalStopReason = await agentConnection.prompt(acpSessionId, contentBlocks);
          const finalReason = finished ? stopReasonStr : finalStopReason;
          
          // If no content but reasoning exists, or if we have interleaved content,
          // we ensure the final response is informative.
          if (!fullContent && reasoningContent) {
            fullContent = "Task processed.";
          }

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
