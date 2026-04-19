import type { ContentBlock } from '@agentclientprotocol/sdk';

export type ACPSessionId = string;
export type ACPToolCallId = string;

export interface SessionState {
  sessionId: ACPSessionId;
  lastAccessed: number;
  isBusy: boolean;
}

export interface AgentInfo {
  name: string;
  version: string;
  sessionLimit?: number;
}

export type ConnectionStatus = 'initializing' | 'ready' | 'error';

export interface SessionUpdateChunk {
  type: 'agent_message_chunk' | 'thought' | 'agent_message' | 'end_turn' | 'tool_call' | 'tool_call_update';
  content?: string;
  toolCallId?: ACPToolCallId;
  toolName?: string;
  toolTitle?: string;
  arguments?: Record<string, unknown>;
  stopReason?: string;
  status?: string;
  output?: any;
}
