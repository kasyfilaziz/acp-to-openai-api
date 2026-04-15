# Initialization

> How all Agent Client Protocol connections begin

The Initialization phase allows Clients and Agents to negotiate protocol versions, capabilities, and authentication methods.

## Flow

1. Client connects to Agent (spawns subprocess)
2. Client sends `initialize` request
3. Agent responds with negotiated protocol version and capabilities
4. Connection is ready for session setup

## Initialize Request

Before a Session can be created, Clients **MUST** initialize the connection by calling the `initialize` method with:

- The latest protocol version supported
- The capabilities supported
- Optionally, client info (name, title, version)

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      },
      "terminal": true
    },
    "clientInfo": {
      "name": "my-client",
      "title": "My Client",
      "version": "1.0.0"
    }
  }
}
```

## Initialize Response

The Agent **MUST** respond with the chosen protocol version and the capabilities it supports:

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "loadSession": true,
      "promptCapabilities": {
        "image": true,
        "audio": true,
        "embeddedContext": true
      },
      "mcpCapabilities": {
        "http": true,
        "sse": true
      }
    },
    "agentInfo": {
      "name": "my-agent",
      "title": "My Agent",
      "version": "1.0.0"
    },
    "authMethods": []
  }
}
```

## Protocol Version

The protocol versions are a single integer that identifies a **MAJOR** protocol version. This version is only incremented when breaking changes are introduced.

### Version Negotiation

The `initialize` request **MUST** include the latest protocol version the Client supports.

If the Agent supports the requested version, it **MUST** respond with the same version. Otherwise, the Agent **MUST** respond with the latest version it supports.

If the Client does not support the version specified by the Agent in the `initialize` response, the Client **SHOULD** close the connection and inform the user about it.

## Capabilities

Capabilities describe features supported by the Client and the Agent.

All capabilities included in the `initialize` request are **OPTIONAL**. Clients and Agents **SHOULD** support all possible combinations of their peer's capabilities.

### Client Capabilities

The Client **SHOULD** specify whether it supports the following capabilities:

#### File System
- `readTextFile`: The `fs/read_text_file` method is available.
- `writeTextFile`: The `fs/write_text_file` method is available.

#### Terminal
- `terminal`: All `terminal/*` methods are available, allowing the Agent to execute and manage shell commands.

### Agent Capabilities

- `loadSession`: Whether the `session/load` method is available (default: false).
- `promptCapabilities`: Object indicating the different types of content that may be included in `session/prompt` requests.
  - `image`: The prompt may include `ContentBlock::Image` (default: false)
  - `audio`: The prompt may include `ContentBlock::Audio` (default: false)
  - `embeddedContext`: The prompt may include `ContentBlock::Resource` (default: false)
- `mcpCapabilities`: MCP capabilities supported by the agent.
  - `http`: The Agent supports connecting to MCP servers over HTTP.
  - `sse`: The Agent supports connecting to MCP servers over SSE.
- `sessionCapabilities`: Session-related capabilities.

### Session Capabilities

As a baseline, all Agents **MUST** support `session/new`, `session/prompt`, `session/cancel`, and `session/update`.

Optionally, they **MAY** support other session methods and notifications.

## Implementation Information

Both Clients and Agents **SHOULD** provide information about their implementation in the `clientInfo` and `agentInfo` fields:

- `name`: Intended for programmatic or logical use
- `title`: Intended for UI and end-user contexts
- `version`: Version of the implementation