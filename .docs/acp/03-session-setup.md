# Session Setup

> Creating and loading sessions

Sessions represent a specific conversation or thread between the Client and Agent. Each session maintains its own context, conversation history, and state, allowing multiple independent interactions with the same Agent.

Before creating a session, Clients **MUST** first complete the initialization phase.

## Creating a Session

Clients create a new session by calling the `session/new` method with:

- The working directory for the session
- A list of MCP servers the Agent should connect to

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/new",
  "params": {
    "cwd": "/home/user/project",
    "mcpServers": [
      {
        "name": "filesystem",
        "command": "/path/to/mcp-server",
        "args": ["--stdio"],
        "env": []
      }
    ]
  }
}
```

The Agent **MUST** respond with a unique Session ID:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sessionId": "sess_abc123def456"
  }
}
```

## Loading Sessions

Agents that support the `loadSession` capability allow Clients to resume previous conversations.

### Checking Support

Before attempting to load a session, Clients **MUST** verify that the Agent supports this capability by checking the `loadSession` field in the `initialize` response.

### Loading a Session

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "session/load",
  "params": {
    "sessionId": "sess_789xyz",
    "cwd": "/home/user/project",
    "mcpServers": []
  }
}
```

The Agent **MUST** replay the entire conversation to the Client in the form of `session/update` notifications.

When all conversation entries have been streamed to the Client, the Agent **MUST** respond to the original `session/load` request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": null
}
```

## Session ID

The session ID returned by `session/new` is a unique identifier for the conversation context.

Clients use this ID to:
- Send prompt requests via `session/prompt`
- Cancel ongoing operations via `session/cancel`
- Load previous sessions via `session/load`

## Working Directory

The `cwd` (current working directory) parameter establishes the file system context for the session:

- **MUST** be an absolute path
- **MUST** be used for the session regardless of where the Agent subprocess was spawned
- **SHOULD** serve as a boundary for tool operations on the file system

## MCP Servers

The Model Context Protocol (MCP) allows Agents to access external tools and data sources.

### Stdio Transport

All Agents **MUST** support connecting to MCP servers via stdio:

```json
{
  "name": "filesystem",
  "command": "/path/to/mcp-server",
  "args": ["--stdio"],
  "env": [
    {"name": "API_KEY", "value": "secret123"}
  ]
}
```

### HTTP Transport

When the Agent supports `mcpCapabilities.http`:

```json
{
  "type": "http",
  "name": "api-server",
  "url": "https://api.example.com/mcp",
  "headers": [
    {"name": "Authorization", "value": "Bearer token123"}
  ]
}
```

### SSE Transport (Deprecated)

When the Agent supports `mcpCapabilities.sse` (deprecated by MCP spec):

```json
{
  "type": "sse",
  "name": "event-stream",
  "url": "https://events.example.com/mcp",
  "headers": []
}
```