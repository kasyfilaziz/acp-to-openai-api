# ACP Documentation Index

Documentation for the Agent Client Protocol (ACP).

## Overview & Basics
- [01-overview.md](./01-overview.md) - Protocol overview, communication model, message flow
- [02-initialization.md](./02-initialization.md) - Connection initialization, version negotiation, capabilities
- [09-transports.md](./09-transports.md) - stdio transport mechanism

## Sessions & Prompts
- [03-session-setup.md](./03-session-setup.md) - Creating and loading sessions, MCP servers
- [04-prompt-turn.md](./04-prompt-turn.md) - Prompt turn lifecycle, tool invocation, stop reasons

## Content & Tools
- [05-content.md](./05-content.md) - ContentBlocks: text, image, audio, resource, resource_link
- [06-tool-calls.md](./06-tool-calls.md) - Tool call execution, permission requests, status updates
- [07-file-system.md](./07-file-system.md) - File read/write methods
- [08-terminals.md](./08-terminals.md) - Terminal command execution

## Reference
- [10-schema.md](./10-schema.md) - Quick reference for all methods and data types

## Key Protocol Facts

### Message Format
- JSON-RPC 2.0 over stdio (newline-delimited)
- Each message ends with `\n`
- No embedded newlines in messages

### Communication Flow
1. Initialize connection with `initialize`
2. Create session with `session/new`
3. Send prompts with `session/prompt`
4. Receive updates via `session/update` notifications
5. Get response with `stopReason`

### OpenAI Translation
| ACP | OpenAI |
|-----|--------|
| `session/prompt` | POST /chat/completions |
| `agent_message_chunk` | delta.content |
| `end_turn` | stop |
| `session/request_permission` | Auto-approve (internal) |

### Capabilities
- Client advertises: `fs.readTextFile`, `fs.writeTextFile`, `terminal`
- Agent advertises: `loadSession`, `promptCapabilities`, `mcpCapabilities`, `sessionCapabilities`