# Quickstart: ACP to OpenAI API Middleware

Get started with testing the middleware against an ACP-compatible agent.

## Prerequisites
- Node.js 18+
- An ACP-compatible agent installed (e.g., `gemini-cli`)
- User logged in to the agent CLI (if needed)

## 1. Setup Configuration
Create a `config.yaml` in the root:
```yaml
agent:
  command: "gemini"
  args: ["--stdio"]
  cwd: "/path/to/project"
server:
  host: "0.0.0.0"
  port: 8080
```

## 2. Run the Middleware
```bash
npm run build
npm start
```

## 3. Test Non-Streaming Chat
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "How are you?"}],
    "stream": false
  }'
```

## 4. Test Session Reuse
Take the `session_id` from the previous response:
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Tell me more about it."}],
    "session_id": "REPLACE_WITH_ID"
  }'
```
