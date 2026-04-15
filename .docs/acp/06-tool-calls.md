# Tool Calls

> How Agents report tool call execution

Tool calls represent actions that language models request Agents to perform during a prompt turn.

Agents report tool calls through `session/update` notifications.

## Creating Tool Calls

When the language model requests a tool invocation, the Agent reports it to the Client:

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call",
      "toolCallId": "call_001",
      "title": "Reading configuration file",
      "kind": "read",
      "status": "pending"
    }
  }
}
```

## Tool Call Properties

- `toolCallId`: A unique identifier for this tool call
- `title`: A human-readable title describing what the tool is doing
- `kind`: The category of tool being invoked:
  - `read` - Reading files or data
  - `edit` - Modifying files or content
  - `delete` - Removing files or data
  - `move` - Moving or renaming files
  - `search` - Searching for information
  - `execute` - Running commands or code
  - `think` - Internal reasoning or planning
  - `fetch` - Retrieving external data
  - `other` - Other tool types
- `status`: Current execution status (defaults to `pending`)
- `content`: Content produced by the tool call
- `locations`: File locations affected by this tool call
- `rawInput`: The raw input parameters sent to the tool
- `rawOutput`: The raw output returned by the tool

## Updating Tool Calls

As tools execute, Agents send updates:

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call_update",
      "toolCallId": "call_001",
      "status": "in_progress",
      "content": [{"type": "content", "content": {"type": "text", "text": "Found 3 files..."}}]
    }
  }
}
```

## Requesting Permission

The Agent **MAY** request permission from the user before executing a tool call by calling `session/request_permission`:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "session/request_permission",
  "params": {
    "sessionId": "sess_abc123def456",
    "toolCall": {"toolCallId": "call_001"},
    "options": [
      {"optionId": "allow-once", "name": "Allow once", "kind": "allow_once"},
      {"optionId": "allow-always", "name": "Always allow", "kind": "allow_always"},
      {"optionId": "reject-once", "name": "Reject", "kind": "reject_once"},
      {"optionId": "reject-always", "name": "Always reject", "kind": "reject_always"}
    ]
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {"outcome": "selected", "optionId": "allow-once"}
  }
}
```

If cancelled:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {"outcome": "cancelled"}
  }
}
```

## Tool Call Status

- `pending`: Tool call hasn't started yet
- `in_progress`: Tool call is currently running
- `completed`: Tool call completed successfully
- `failed`: Tool call failed with an error

## Tool Call Content Types

### Regular Content

```json
{"type": "content", "content": {"type": "text", "text": "Analysis complete."}}
```

### Diffs

```json
{
  "type": "diff",
  "path": "/home/user/project/src/config.json",
  "oldText": "{\n  \"debug\": false\n}",
  "newText": "{\n  \"debug\": true\n}"
}
```

### Terminals

```json
{"type": "terminal", "terminalId": "term_xyz789"}
```

## Following the Agent

Tool calls can report file locations they're working with:

```json
{"path": "/home/user/project/src/main.py", "line": 42}
```