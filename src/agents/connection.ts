import { ClientSideConnection, ndJsonStream } from '@agentclientprotocol/sdk';
import type { Agent, Client } from '@agentclientprotocol/sdk';
import type { ContentBlock, SessionNotification, StopReason } from '@agentclientprotocol/sdk';
import { spawn, ChildProcess } from 'child_process';
import { Writable, Readable } from 'node:stream';
import { config } from '../utils/config.js';
import logger from '../utils/logger.js';
import type { AgentInfo, ConnectionStatus, SessionUpdateChunk } from './types.js';

type ConnectionEventHandler = (update: SessionUpdateChunk) => void;
type PermissionHandler = (sessionId: string, toolName: string, args: Record<string, unknown>) => Promise<boolean>;

interface SessionUpdatePayload {
  sessionId: string;
  update: {
    sessionUpdate: string;
    content?: ContentBlock;
    stopReason?: StopReason;
    [key: string]: unknown;
  };
}

class ACPClient implements Client {
  private updateHandlers: Map<string, ConnectionEventHandler> = new Map();
  private permissionHandler: PermissionHandler = async () => true;
  private resolveInit: ((value: unknown) => void) | null = null;
  private rejectInit: ((reason: unknown) => void) | null = null;
  private initPromise: Promise<unknown>;

  constructor() {
    this.initPromise = new Promise((resolve, reject) => {
      this.resolveInit = resolve;
      this.rejectInit = reject;
    });
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    const payload = params as unknown as SessionUpdatePayload;
    const sessionId = payload.sessionId || 'default';
    const handler = this.updateHandlers.get(sessionId);
    
    if (handler) {
      const update = payload.update;
      
      if (update.sessionUpdate === 'agent_message_chunk' && update.content) {
        if (update.content.type === 'text' && update.content.text) {
          handler({ type: 'agent_message_chunk', content: update.content.text });
        }
      } else if (update.sessionUpdate === 'thought' && update.content) {
        if (update.content.type === 'text' && update.content.text) {
          handler({ type: 'thought', content: update.content.text });
        }
      } else if (update.sessionUpdate === 'tool_call') {
        handler({ 
          type: 'tool_call', 
          toolCallId: update.toolCallId as string,
          toolName: update.title as string,
          arguments: update.rawInput as Record<string, unknown>
        });
      } else if (update.stopReason) {
        handler({ type: 'end_turn', stopReason: update.stopReason });
      }
    }
  }

  async requestPermission(params: { sessionId: string; toolName: string; args?: Record<string, unknown> }): Promise<{ outcome: 'allow' | 'deny' }> {
    logger.info('Tool permission requested', { 
      sessionId: params.sessionId, 
      toolName: params.toolName 
    });
    
    const approved = await this.permissionHandler(
      params.sessionId,
      params.toolName,
      params.args || {}
    );
    
    if (approved) {
      logger.info('Auto-approving tool permission', { toolName: params.toolName });
      return { outcome: 'allow' };
    } else {
      logger.warn('Auto-denying tool permission', { toolName: params.toolName });
      return { outcome: 'deny' };
    }
  }

  setPermissionHandler(handler: PermissionHandler): void {
    this.permissionHandler = handler;
  }

  onSessionUpdate(sessionId: string, handler: ConnectionEventHandler): void {
    this.updateHandlers.set(sessionId, handler);
  }

  removeSessionHandler(sessionId: string): void {
    this.updateHandlers.delete(sessionId);
  }

  resolveInitialization(info: AgentInfo): void {
    if (this.resolveInit) {
      this.resolveInit(info);
    }
  }

  rejectInitialization(err: Error): void {
    if (this.rejectInit) {
      this.rejectInit(err);
    }
  }

  getInitPromise(): Promise<unknown> {
    return this.initPromise;
  }
}

export class AgentConnection {
  private connection: ClientSideConnection | null = null;
  private process: ChildProcess | null = null;
  private status: ConnectionStatus = 'initializing';
  private agentInfo: AgentInfo | null = null;
  private client: ACPClient | null = null;

  async connect(): Promise<void> {
    if (this.status === 'ready') {
      return;
    }

    logger.info('Starting ACP agent process', { 
      command: config.agent.command, 
      args: config.agent.args 
    });

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(config.agent.command, config.agent.args, {
          cwd: config.agent.cwd,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        if (!this.process.stdin || !this.process.stdout) {
          throw new Error('Failed to create stdio streams');
        }

        const input = Writable.toWeb(this.process.stdin);
        const output = Readable.toWeb(this.process.stdout);
        const stream = ndJsonStream(input, output);
        this.client = new ACPClient();
        this.connection = new ClientSideConnection(() => this.client as Client, stream);

        this.client.getInitPromise().then((info) => {
          this.agentInfo = info as AgentInfo;
          this.status = 'ready';
          resolve();
        }).catch((err) => {
          this.status = 'error';
          reject(err);
        });

        this.connection.initialize({
          protocolVersion: 1,
          capabilities: {
            tools: {},
            fs: { readTextFile: true, writeTextFile: true },
            terminal: {}
          },
          clientInfo: {
            name: 'acp-to-openai-middleware',
            version: '1.0.0'
          }
        }).then((response) => {
          logger.info('Agent initialized', response);
          if (this.client) {
            this.client.resolveInitialization({
              name: response.agentInfo?.name || 'acp-agent',
              version: response.agentInfo?.version || '1.0.0'
            });
          }
        }).catch((err) => {
          logger.error('Failed to initialize agent', { error: err });
          if (this.client) {
            this.client.rejectInitialization(err instanceof Error ? err : new Error(String(err)));
          }
        });

        this.process.on('error', (err) => {
          logger.error('Agent process error', { error: err.message });
          this.status = 'error';
          if (this.client) {
            this.client.rejectInitialization(err);
          }
        });

        this.process.on('exit', (code) => {
          logger.info('Agent process exited', { code });
          this.status = 'error';
        });

      } catch (err) {
        logger.error('Failed to start agent process', { error: err });
        this.status = 'error';
        reject(err);
      }
    });
  }

  async createSession(): Promise<string> {
    if (!this.connection || this.status !== 'ready') {
      throw new Error('Agent connection not ready');
    }

    const response = await this.connection.newSession({
      cwd: process.cwd(),
      mcpServers: []
    });
    return response.sessionId;
  }

  async prompt(sessionId: string, messages: ContentBlock[]): Promise<void> {
    if (!this.connection || this.status !== 'ready') {
      throw new Error('Agent connection not ready');
    }

    await this.connection.prompt({
      sessionId,
      prompt: messages
    });
  }

  onSessionUpdate(sessionId: string, handler: ConnectionEventHandler): void {
    if (this.client) {
      this.client.onSessionUpdate(sessionId, handler);
    }
  }

  removeSessionHandler(sessionId: string): void {
    if (this.client) {
      this.client.removeSessionHandler(sessionId);
    }
  }

  setPermissionHandler(handler: PermissionHandler): void {
    if (this.client) {
      this.client.setPermissionHandler(handler);
    }
  }

  getAgentInfo(): AgentInfo | null {
    return this.agentInfo;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  disconnect(): void {
    if (this.connection) {
      (this.connection as any).close();
    }
    if (this.process) {
      this.process.kill();
    }
    this.status = 'error';
    this.connection = null;
    this.process = null;
    this.client = null;
    logger.info('Agent connection disconnected');
  }
}

export const agentConnection = new AgentConnection();

export default agentConnection;