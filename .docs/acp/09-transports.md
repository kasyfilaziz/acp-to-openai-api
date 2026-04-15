# Transports

> Mechanisms for agents and clients to communicate with each other

ACP uses JSON-RPC to encode messages. JSON-RPC messages **MUST** be UTF-8 encoded.

## Stdio Transport

In the **stdio** transport:

- The client launches the agent as a subprocess.
- The agent reads JSON-RPC messages from its standard input (`stdin`) and sends messages to its standard output (`stdout`).
- Messages are individual JSON-RPC requests, notifications, or responses.
- Messages are delimited by newlines (`\n`), and **MUST NOT** contain embedded newlines.
- The agent **MAY** write UTF-8 strings to its standard error (`stderr`) for logging purposes.
- The agent **MUST NOT** write anything to its `stdout` that is not a valid ACP message.
- The client **MUST NOT** write anything to the agent's `stdin` that is not a valid ACP message.

### Message Flow

```
Client -> Agent: Launch subprocess
Loop:
  Client -> Agent: Write to stdin
  Agent -> Client: Write to stdout
  Agent -> Client: Optional logs on stderr (via stderr)
Client -> Agent: Close stdin, terminate subprocess
```

## Streamable HTTP

*In discussion, draft proposal in progress.*

## Custom Transports

Agents and clients **MAY** implement additional custom transport mechanisms. The protocol is transport-agnostic and can be implemented over any communication channel that supports bidirectional message exchange.

Implementers who choose to support custom transports **MUST** ensure they preserve the JSON-RPC message format and lifecycle requirements defined in ACP.