# ACP Schema Reference

> Quick reference for JSON-RPC methods and data structures

## Agent Methods (Called by Client)

### initialize
Establishes connection and negotiates protocol capabilities.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {"fs": {"readTextFile": true, "writeTextFile": true}, "terminal": true},
    "clientInfo": {"name": "client", "version": "1.0.0"}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {"loadSession": false, "promptCapabilities": {"image": false, "audio": false, "embeddedContext": false}},
    "agentInfo": {"name": "agent", "version": "1.0.0"},
    "authMethods": []
  }
}
```

### session/new
Creates a new conversation session.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/new",
  "params": {
    "cwd": "/home/user/project",
    "mcpServers": []
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sessionId": "sess_abc123"
  }
}
```

### session/prompt
Sends a user prompt to the agent.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc123",
    "prompt": [{"type": "text", "text": "Hello!"}]
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "stopReason": "end_turn"
  }
}
```

### session/load
Loads an existing session (requires `loadSession` capability).

### session/list
Lists existing sessions (requires `sessionCapabilities.list`).

### session/cancel
Notification to cancel an ongoing prompt turn.

```json
{
  "jsonrpc": "2.0",
  "method": "session/cancel",
  "params": {"sessionId": "sess_abc123"}
}
```

## Client Methods (Implemented by Middleware)

### session/request_permission
Agent requests permission to execute a tool call.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "session/request_permission",
  "params": {
    "sessionId": "sess_abc123",
    "toolCall": {"toolCallId": "call_001"},
    "options": [{"optionId": "allow-once", "name": "Allow once", "kind": "allow_once"}]
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {"outcome": "selected", "optionId": "allow-once"}
  }
}
```

### fs/read_text_file
Reads a text file (requires `fs.readTextFile` capability).

### fs/write_text_file
Writes a text file (requires `fs.writeTextFile` capability).

### terminal/create, terminal/output, terminal/wait_for_exit, terminal/kill, terminal/release
Terminal management methods (requires `terminal` capability).

## Notifications (Agent → Client)

### session/update
Real-time session updates during prompt processing.

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {"type": "text", "text": "Response text..."}
    }
  }
}
```

Session update types:
- `agent_message_chunk`: Text from the model
- `user_message_chunk`: User message content
- `tool_call`: New tool call requested
- `tool_call_update`: Tool call status change
- `plan`: Agent's execution plan
- `available_commands_update`: Available slash commands
- `current_mode_update`: Mode changed
- `session_info_update`: Session metadata changed
- `config_option_update`: Config options changed

## Data Types

### ContentBlock
```json
{"type": "text", "text": "..."}
{"type": "image", "mimeType": "image/png", "data": "..."}
{"type": "audio", "mimeType": "audio/wav", "data": "..."}
{"type": "resource", "resource": {"uri": "...", "text": "..."}}
{"type": "resource_link", "uri": "...", "name": "..."}
```

### StopReason
- `end_turn` → Map to OpenAI `stop`
- `max_tokens` → Map to OpenAI `length`
- `cancelled` → Map to OpenAI `stop`
- `max_turn_requests` → Map to OpenAI `stop`
- `refusal` → Map to OpenAI `stop`

### ToolCallStatus
- `pending`
- `in_progress`
- `completed`
- `failed`

### PermissionOptionKind
- `allow_once`
- `allow_always`
- `reject_once`
- `reject_always`