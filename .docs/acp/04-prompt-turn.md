# Prompt Turn

> Understanding the core conversation flow

A prompt turn represents a complete interaction cycle between the Client and Agent, starting with a user message and continuing until the Agent completes its response.

Before sending prompts, Clients **MUST** first complete the initialization phase and session setup.

## The Prompt Turn Lifecycle

1. **User Message**: Client sends `session/prompt` with user message
2. **Agent Processing**: Agent processes the user's message with LLM
3. **Agent Reports Output**: Agent sends `session/update` notifications
4. **Check for Completion**: If no pending tool calls, turn ends
5. **Tool Invocation**: If tools requested, execute and continue
6. **Continue Conversation**: Agent sends results back to LLM

## User Message

The turn begins when the Client sends a `session/prompt`:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc123def456",
    "prompt": [
      {"type": "text", "text": "Can you analyze this code?"},
      {
        "type": "resource",
        "resource": {
          "uri": "file:///home/user/project/main.py",
          "mimeType": "text/x-python",
          "text": "def process_data(items):\n    for item in items:\n        print(item)"
        }
      }
    ]
  }
}
```

## Agent Reports Output

The Agent reports the model's output to the Client via `session/update` notifications.

### Plan

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "plan",
      "entries": [
        {"content": "Check for syntax errors", "priority": "high", "status": "pending"},
        {"content": "Identify potential issues", "priority": "medium", "status": "pending"}
      ]
    }
  }
}
```

### Text Response

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {"type": "text", "text": "I'll analyze your code..."}
    }
  }
}
```

### Tool Call

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

## Check for Completion

If there are no pending tool calls, the turn ends and the Agent responds to the original `session/prompt` request with a `StopReason`:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "stopReason": "end_turn"
  }
}
```

## Tool Invocation and Status Reporting

Before proceeding with execution, the Agent **MAY** request permission via `session/request_permission`:

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
      {"optionId": "reject-once", "name": "Reject", "kind": "reject_once"}
    ]
  }
}
```

The Client responds with the user's decision:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "outcome": {"outcome": "selected", "optionId": "allow-once"}
  }
}
```

As tools execute, Agents send status updates:

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call_update",
      "toolCallId": "call_001",
      "status": "in_progress"
    }
  }
}
```

When tool completes:

```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc123def456",
    "update": {
      "sessionUpdate": "tool_call_update",
      "toolCallId": "call_001",
      "status": "completed",
      "content": [{"type": "content", "content": {"type": "text", "text": "Analysis complete."}}]
    }
  }
}
```

## Stop Reasons

When an Agent stops a turn, it must specify the corresponding `StopReason`:

- `end_turn`: The language model finishes responding without requesting more tools
- `max_tokens`: The maximum token limit is reached
- `max_turn_requests`: The maximum number of model requests in a single turn is exceeded
- `refusal`: The Agent refuses to continue
- `cancelled`: The Client cancels the turn

## Cancellation

Clients **MAY** cancel an ongoing prompt turn by sending a `session/cancel` notification:

```json
{
  "jsonrpc": "2.0",
  "method": "session/cancel",
  "params": {
    "sessionId": "sess_abc123def456"
  }
}
```

When the Agent receives this notification, it **SHOULD** stop all operations and respond with the `cancelled` stop reason.