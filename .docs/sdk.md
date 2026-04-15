# TypeScript ACP SDK & HTTP Server Summary

## ACP TypeScript SDK

**Package**: `@agentclientprotocol/sdk`  
**NPM**: https://www.npmjs.com/package/@agentclientprotocol/sdk  
**GitHub**: https://github.com/agentclientprotocol/typescript-sdk  
**Docs**: https://agentclientprotocol.github.io/typescript-sdk  
**License**: Apache 2.0

### Installation

```bash
npm install @agentclientprotocol/sdk
```

### Key Classes

#### AgentSideConnection
For building agent servers that communicate with ACP clients.

```typescript
import { AgentSideConnection } from '@agentclientprotocol/sdk';

const connection = new AgentSideConnection();

// Handle initialize
connection.on('initialize', (request) => {
  return {
    protocolVersion: 1,
    agentCapabilities: {
      loadSession: false,
      promptCapabilities: { image: false, audio: false, embeddedContext: false }
    },
    agentInfo: { name: 'my-agent', version: '1.0.0' },
    authMethods: []
  };
});

// Handle session/new
connection.on('session/new', (request) => {
  return { sessionId: 'sess_xxx' };
});

// Handle session/prompt
connection.on('session/prompt', async (request) => {
  // Send updates
  connection.sendSessionUpdate(request.params.sessionId, {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Processing...' }
  });
  
  return { stopReason: 'end_turn' };
});
```

#### ClientSideConnection
For building clients that communicate with ACP agents.

```typescript
import { ClientSideConnection } from '@agentclientprotocol/sdk';

const connection = new ClientSideConnection();

// Connect to agent subprocess
const agentProcess = spawn('agent-command');
connection.start(agentProcess.stdin, agentProcess.stdout);

// Initialize
await connection.sendRequest('initialize', {
  protocolVersion: 1,
  clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true },
  clientInfo: { name: 'client', version: '1.0.0' }
});
```

### Events & Methods

**Agent Side**:
- `on('initialize', handler)` - Handle initialize request
- `on('session/new', handler)` - Handle new session
- `on('session/prompt', handler)` - Handle prompt request
- `on('session/load', handler)` - Handle load session (optional)
- `on('session/cancel', handler)` - Handle cancel notification
- `sendSessionUpdate(sessionId, update)` - Send session update notification

**Client Side**:
- `start(input, output)` - Start connection
- `sendRequest(method, params)` - Send JSON-RPC request
- `sendNotification(method, params)` - Send notification
- `on('session/update', handler)` - Handle session updates
- `on('session/request_permission', handler)` - Handle permission requests

### Examples

Located in: https://github.com/agentclientprotocol/typescript-sdk/tree/main/src/examples

### Production Reference

- **Gemini CLI**: https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/zed-integration/zedIntegration.ts

---

## HTTP Server: Fastify

**Package**: `fastify`  
**NPM**: https://www.npmjs.com/package/fastify  
**Docs**: https://fastify.dev  
**Benchmark Score**: 85.9 (High reputation)

### Installation

```bash
npm install fastify
```

### Why Fastify?

- Better SSE/streaming support than Express
- High performance (low overhead)
- Built-in schema validation
- Rich plugin ecosystem

### SSE Streaming for OpenAI API

```typescript
import Fastify from 'fastify';

const fastify = Fastify();

fastify.post('/v1/chat/completions', async (request, reply) => {
  const { stream } = request.body;
  
  if (!stream) {
    // Non-streaming response
    return await handleNonStreaming(request.body);
  }
  
  // Streaming response (SSE)
  reply.header('Content-Type', 'text/event-stream');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');
  
  const stream = new ReadableStream({
    start(controller) {
      // Send chunks as SSE
      controller.enqueue(new TextEncoder().encode(
        'data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n'
      ));
      controller.enqueue(new TextEncoder().encode(
        'data: {"choices":[{"delta":{"content":" World"},"index":0}]}\n\n'
      ));
      controller.enqueue(new TextEncoder().encode(
        'data: {"choices":[{"finish_reason":"stop","index":0}]}\n\n'
      ));
      controller.close();
    }
  });
  
  return reply.send(stream);
});

await fastify.listen({ port: 8080 });
```

### Key Patterns

**Sending Streams**:
```javascript
reply.header('Content-Type', 'application/octet-stream');
reply.send(readableStream);
```

**SSE Format**:
```javascript
`data: ${JSON.stringify(chunk)}\n\n`
```

**Raw Response** (for full control):
```javascript
reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream' });
reply.raw.write('data: {"content":"..."}\n\n');
reply.raw.end();
```

---

## Recommended Stack

| Component | Library | Version |
|-----------|---------|---------|
| ACP SDK | `@agentclientprotocol/sdk` | Latest (v0.19.0) |
| HTTP Server | `fastify` | ^5.x |
| Config | `yaml` (js-yaml) | ^2.x |
| TypeScript | `typescript` | ^5.x |

---

## Project Setup

```bash
# Initialize
npm init -y
npm install typescript @types/node ts-node

# ACP SDK
npm install @agentclientprotocol/sdk

# HTTP Server
npm install fastify @fastify/cors

# Config
npm install js-yaml @types/js-yaml
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```