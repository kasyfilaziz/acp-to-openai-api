# ACP to OpenAI API Middleware

Bridge **ACP (Agent Client Protocol)** agents to **OpenAI-compatible API**. Enables tools like Open WebUI or AI coding assistants to use ACP agents as LLM providers.

## Features

- **OpenAI-Compatible API**: Works with any OpenAI client
- **Session Management**: Reuse sessions via `session_id`
- **Streaming Support**: SSE streaming for real-time responses
- **Tool Auto-Approval**: Automatically approve tool permissions with logging
- **Configurable**: YAML config + environment variable overrides

## Prerequisites

- Node.js 18+
- An ACP-compatible agent installed (e.g., `gemini-cli`)
- User logged in to the agent CLI

## Quick Start

### 1. Install

```bash
npm install
npm run build
```

### 2. Configure

Create `config.yaml`:

```yaml
agent:
  command: "gemini"
  args:
    - "--stdio"
  cwd: "."

server:
  host: "0.0.0.0"
  port: 8080
```

Or use environment variables:

```bash
export AGENT_COMMAND=gemini
export AGENT_ARGS=--acp
export PORT=8080
```

### 3. Run

```bash
npm start
```

### 4. Test

**Non-streaming chat:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Streaming chat:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

**Session reuse:**
```bash
# Use session_id from previous response
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Continue our chat"}],
    "session_id": "YOUR_SESSION_ID"
  }'
```

**List models:**
```bash
curl http://localhost:8080/v1/models
```

**Health check:**
```bash
curl http://localhost:8080/health
```

## Docker

```bash
docker build -t acp-middleware .
docker run -p 8080:8080 acp-middleware
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | Chat completions |
| GET | `/v1/models` | List models |
| GET | `/health` | Health check |

## Error Responses

Errors follow OpenAI format:

```json
{
  "error": {
    "message": "Error message",
    "type": "invalid_request_error",
    "code": "error_code"
  }
}
```

| HTTP Code | Error Type | Description |
|-----------|------------|-------------|
| 400 | invalid_request_error | Missing required fields |
| 404 | invalid_request_error | Session not found |
| 409 | invalid_request_error | Session is busy |
| 502 | api_error | Agent protocol error |
| 503 | api_error | Agent not ready |

## Logging

Logs are written to `/tmp/acp-middleware/acp-middleware.log`. Sensitive data is automatically redacted.

## License

ISC