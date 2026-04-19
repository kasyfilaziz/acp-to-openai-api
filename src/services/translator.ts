import type { ContentBlock } from '@agentclientprotocol/sdk';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | any[] | Record<string, any> | null;
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
    reasoning_content?: string;
    tool_calls?: any[];
  };
  finish_reason: string | null;
}

export interface OpenAIChunkChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    reasoning_content?: string;
    tool_calls?: any[];
  };
  finish_reason: string | null;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  session_id?: string;
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChunkChoice[];
}

export function translateMessagesToContentBlocks(
  messages: { role: string; content: string | any[] | Record<string, any> | null }[]
): ContentBlock[] {
  // Find the last message with the 'user' role
  // We only send the last message because the ACP agent is stateful and maintains its own history.
  const userMessages = messages.filter(msg => msg.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1];

  const extractText = (content: any): string => {
    if (typeof content === 'string') return content;
    if (!content) return '';

    // Handle array of blocks
    if (Array.isArray(content)) {
      return content
        .map(block => (block.type === 'text' ? block.text : ''))
        .filter(Boolean)
        .join('\n');
    }

    // Handle object with numeric keys (sometimes arrays are serialized this way)
    if (typeof content === 'object') {
      const keys = Object.keys(content).sort((a, b) => Number(a) - Number(b));
      // Check if it's indeed numeric keys
      const allNumeric = keys.every(k => !isNaN(Number(k)));
      if (allNumeric && keys.length > 0) {
        return keys
          .map(k => {
             const block = content[k];
             return block.type === 'text' ? block.text : '';
          })
          .filter(Boolean)
          .join('\n');
      }

      // Handle single block as object
      if (content.type === 'text' && content.text) {
        return content.text;
      }
    }

    return '';
  };

  if (lastUserMsg) {
    const textContent = extractText(lastUserMsg.content);
    if (textContent.trim()) {
      return [{
        type: 'text',
        text: textContent
      }];
    }
  }

  // Fallback to the very last message if no user message is found, or an empty block
  const lastMsg = messages[messages.length - 1];
  if (lastMsg) {
    const textContent = extractText(lastMsg.content);
    if (textContent.trim()) {
       return [{
        type: 'text',
        text: textContent
      }];
    }
  }

  return [{ type: 'text', text: '' }];
}

export function translateContentBlockToText(block: ContentBlock): string {
  if (block.type === 'text') {
    return block.text || '';
  }
  return '';
}

export function translateChunkToOpenAI(
  chunk: { type: string; content?: string; stopReason?: string; toolCallId?: string; toolName?: string; arguments?: Record<string, unknown> },
  model: string
): ChatCompletionChunk {
  const id = `chatcmpl-${generateId()}`;
  const created = Math.floor(Date.now() / 1000);
  
  const delta: { role?: string; content?: string; reasoning_content?: string; tool_calls?: Array<any> } = {};
  
  if (chunk.type === 'agent_message_chunk' && chunk.content) {
    delta.content = chunk.content;
  } else if (chunk.type === 'thought' && chunk.content) {
    delta.reasoning_content = chunk.content;
  } else if (chunk.type === 'tool_call' && chunk.toolCallId) {
    delta.tool_calls = [{
      index: 0,
      id: chunk.toolCallId,
      type: 'function',
      function: {
        name: chunk.toolName || '',
        arguments: chunk.arguments ? JSON.stringify(chunk.arguments) : '{}'
      }
    }];
  }
  
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: chunk.type === 'end_turn' ? 'stop' : null
      }
    ]
  };
}

export function translateResponseToOpenAI(
  content: string,
  finishReason: string,
  model: string,
  sessionId: string,
  reasoningContent?: string,
  toolCalls?: Array<any>
): ChatCompletion {
  const id = `chatcmpl-${generateId()}`;
  const created = Math.floor(Date.now() / 1000);
  
  const message: any = {
    role: 'assistant',
    content
  };
  
  if (reasoningContent) {
    message.reasoning_content = reasoningContent;
  }
  
  if (toolCalls && toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  let finalFinishReason = finishReason === 'end_turn' ? 'stop' : finishReason === 'max_tokens' ? 'length' : 'stop';
  if (toolCalls && toolCalls.length > 0 && finishReason !== 'end_turn') {
    finalFinishReason = 'tool_calls';
  }
  
  return {
    id,
    object: 'chat.completion',
    created,
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: finalFinishReason
      }
    ],
    session_id: sessionId
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function createErrorResponse(
  type: string,
  message: string,
  code?: string,
  param?: string
): object {
  return {
    error: {
      message,
      type,
      code,
      param
    }
  };
}