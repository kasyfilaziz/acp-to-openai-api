import { FastifyRequest, FastifyReply } from 'fastify';
import { agentConnection } from '../agents/connection.js';
import type { ModelsResponse } from './types.js';

export async function handleModels(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const agentInfo = agentConnection.getAgentInfo();
  const modelId = agentInfo 
    ? `${agentInfo.name}-${agentInfo.version}` 
    : 'acp-agent-default';
  
  const response: ModelsResponse = {
    object: 'list',
    data: [
      {
        id: modelId,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: agentInfo?.name || 'acp-agent'
      }
    ]
  };
  
  reply.send(response);
}

export default handleModels;