# ACP to OpenAI API Middleware

Middleware that bridges **ACP (Agent Client Protocol)** agents to **OpenAI-compatible API**. Enables tools like Open WebUI or AI coding assistants to use ACP agents as LLM providers.

## Overview

This middleware acts as a translation layer:

```
OpenAI-compatible Client (Open WebUI, etc.)
         │
         ▼
┌────────────────────────┐
│  HTTP Server           │  ← Fastify (port 8080)
│  /v1/chat/completions  │
│  /v1/models            │
└──────────┬─────────────┘
           │ JSON-RPC (stdio)
           ▼
┌────────────────────────┐
│  ACP Agent             │  ← @agentclientprotocol/sdk
│  (subprocess)         │
└────────────────────────┘
```

## Features

- **OpenAI Compatible API**: Works with any OpenAI API client
- **Streaming Support**: Full SSE streaming for real-time responses
- **Session Management**: Per-request session creation
- **Tool Auto-Approval**: Automatically approves tool permissions
- **Configurable**: Agent command and arguments via config.yaml

## Requirements

- Node.js 18+
- TypeScript
- An ACP-compatible agent (e.g., Claude Code, Gemini CLI, or similar)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Agent

Edit `config.yaml`:

```yaml
agent:
  command: "claude"        # or path to your ACP agent
  args: ["--print"]        # agent-specific arguments
  cwd: "/tmp"              # working directory

server:
  host: "0.0.0.0"
  port: 8080
```

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### POST /v1/chat/completions

Send chat messages to the ACP agent.

**Request:**
```json
{
  "model": "any-model",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "any-model",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help?"
      },
      "finish_reason": "stop"
    }
  ]
}
```

### GET /v1/models

List available models (returns agent info).

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `agent.command` | Agent executable command | Required |
| `agent.args` | Agent command arguments | `[]` |
| `agent.cwd` | Working directory | `"/tmp"` |
| `server.host` | Server host | `"0.0.0.0"` |
| `server.port` | Server port | `8080` |

## Documentation

- **ACP Protocol**: https://agentclientprotocol.com/protocol/overview
- **Protocol Docs**: `.docs/acp/`
- **SDK Reference**: `.docs/sdk.md`
- **OpenAI API**: `.docs/openapi.with-code-samples.yml`

## License

Apache 2.0
