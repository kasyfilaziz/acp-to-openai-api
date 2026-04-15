# AGENTS.md - ACP to OpenAI API Middleware

This project is a **greenfield implementation** - no existing code.

---

## Project Purpose
Middleware that bridges **ACP (Agent Client Protocol)** agents to **OpenAI-compatible API**. Enables tools like Open WebUI or AI coding assistants to use ACP agents as LLM providers.

**Primary references:**
- ACP Protocol: https://agentclientprotocol.com/protocol/overview
- ACP SDK: `@agentclientprotocol/sdk` (npm: @agentclientprotocol/sdk)
- OpenAI API: `.docs/openapi.with-code-samples.yml`
- Detailed docs: `.docs/acp/` and `.docs/sdk.md`

---

## Tech Stack

| Component | Package | Purpose |
|-----------|---------|---------|
| Language | TypeScript/Node.js | - |
| ACP SDK | `@agentclientprotocol/sdk` | Implement AgentSideConnection |
| HTTP Server | `fastify` | SSE streaming support |
| Config | `js-yaml` + `config.yaml` | Agent configuration |

---

## Implementation Roadmap

### Phase 1: Core Infrastructure
1. Initialize: `npm init -y && npm install typescript @types/node ts-node @agentclientprotocol/sdk fastify js-yaml`
2. Create `config.yaml` (agent command, args, cwd)
3. Use `AgentSideConnection` from SDK to handle ACP communication
4. Create HTTP server with Fastify

### Phase 2: Chat Completions
- `POST /v1/chat/completions` endpoint
- Translate OpenAI `messages` → ACP `ContentBlock[]`
- Per-request session (`session/new`)

### Phase 3: Streaming
- SSE: `Content-Type: text/event-stream`
- Map `agent_message_chunk` → `delta.content`
- Map `end_turn` → `finish_reason: stop`

### Phase 4: Tools
- Auto-approve `session/request_permission` (return allow immediately)

### Phase 5: Models
- `GET /v1/models` endpoint

---

## Critical Protocol Facts

- **Transport**: JSON-RPC 2.0 over stdio (newline-delimited `\n`)
- **Flow**: `initialize` → `session/new` → `session/prompt` → `session/update` → response
- **SDK Pattern**:
  ```typescript
  import { AgentSideConnection } from '@agentclientprotocol/sdk';
  const conn = new AgentSideConnection();
  conn.on('initialize', handler);
  conn.on('session/new', handler);
  conn.on('session/prompt', handler);
  conn.sendSessionUpdate(sessionId, update);
  ```

---

## Key Constraints

- ACP messages are newline-delimited (NOT array-wrapped)
- Session: Per-request for Phase 1 (stateless)
- Tools: Auto-approve internally (don't proxy to client)
- Model: Pass through; ACP agents choose their own model

---

## Commands

```bash
# Development
npx ts-node src/index.ts

# Build
npx tsc

# Run (after build)
node dist/index.js
```