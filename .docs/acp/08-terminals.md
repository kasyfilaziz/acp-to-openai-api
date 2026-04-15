# Terminals

> Executing and managing terminal commands

The terminal methods allow Agents to execute shell commands within the Client's environment.

## Checking Support

Before attempting to use terminal methods, Agents **MUST** verify that the Client supports this capability:

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "clientCapabilities": {
      "terminal": true
    }
  }
}
```

If `terminal` is `false` or not present, the Agent **MUST NOT** attempt to call any terminal methods.

## Creating a Terminal

The `terminal/create` method starts a command in a new terminal:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "terminal/create",
  "params": {
    "sessionId": "sess_abc123def456",
    "command": "npm",
    "args": ["test", "--coverage"],
    "env": [{"name": "NODE_ENV", "value": "test"}],
    "cwd": "/home/user/project",
    "outputByteLimit": 1048576
  }
}
```

Parameters:
- `sessionId`: The Session ID
- `command`: The command to execute (required)
- `args`: Array of command arguments
- `env`: Environment variables for the command
- `cwd`: Working directory for the command (absolute path)
- `outputByteLimit`: Maximum number of output bytes to retain

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "terminalId": "term_xyz789"
  }
}
```

## Getting Output

The `terminal/output` method retrieves current terminal output:

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "terminal/output",
  "params": {
    "sessionId": "sess_abc123def456",
    "terminalId": "term_xyz789"
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "output": "Running tests...\n✓ All tests passed (42 total)\n",
    "truncated": false,
    "exitStatus": {"exitCode": 0, "signal": null}
  }
}
```

## Waiting for Exit

The `terminal/wait_for_exit` method returns once the command completes:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "terminal/wait_for_exit",
  "params": {
    "sessionId": "sess_abc123def456",
    "terminalId": "term_xyz789"
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "exitCode": 0,
    "signal": null
  }
}
```

## Killing Commands

The `terminal/kill` method terminates a command without releasing the terminal:

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "terminal/kill",
  "params": {
    "sessionId": "sess_abc123def456",
    "terminalId": "term_xyz789"
  }
}
```

## Releasing Terminals

The `terminal/release` kills the command if still running and releases resources:

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "terminal/release",
  "params": {
    "sessionId": "sess_abc123def456",
    "terminalId": "term_xyz789"
  }
}
```

After release, the TerminalId becomes invalid.

## Embedding in Tool Calls

Terminals can be embedded in tool calls to provide real-time output:

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call",
      "toolCallId": "call_002",
      "title": "Running tests",
      "kind": "execute",
      "status": "in_progress",
      "content": [{"type": "terminal", "terminalId": "term_xyz789"}]
    }
  }
}
```