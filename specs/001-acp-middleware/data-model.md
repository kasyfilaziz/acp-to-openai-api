# Data Model: ACP to OpenAI API Middleware

Entities and state management for the middleware.

## Entities

### Session
In-memory registry of active conversations with the ACP agent.
- `sessionId`: string (canonical ACP session ID)
- `lastAccessed`: timestamp
- `isBusy`: boolean (lock for concurrent requests)

### AgentConnection
Maintains the lifetime of the ACP agent subprocess.
- `process`: ChildProcess
- `connection`: ClientSideConnection (SDK instance)
- `status`: 'initializing' | 'ready' | 'error'

### ChatRequest (OpenAI Schema)
Incoming POST /v1/chat/completions payload.
- `model`: string
- `messages`: Message[]
- `stream`: boolean (optional)
- `session_id`: string (optional, middleware-specific extension)

### ChatResponse (OpenAI Schema)
Outgoing response.
- `id`: string
- `object`: 'chat.completion' | 'chat.completion.chunk'
- `created`: number
- `model`: string
- `choices`: Choice[] | Chunk[]
- `session_id`: string (returned to client)

## State Transitions
1. **Startup**: Spawn Agent -> `initialize`.
2. **New Chat (no session_id)**: `session/new` -> store mapping -> `session/prompt`.
3. **Existing Chat (session_id)**: Check exists -> Lock session -> `session/prompt` -> Unlock.
4. **Agent Crash**: Cleanup registry -> Restart agent.
