# Feature Specification: ACP to OpenAI API Middleware

**Feature Branch**: `001-acp-middleware`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "ACP to OpenAI API Middleware - bridge ACP agents to OpenAI-compatible API"

## Clarifications

### Session 2026-04-15
- Q: If a request includes a `session_id` that the middleware does not recognize, how should it behave? → A: Return an error (e.g., 404 Session Not Found).
- Q: How should the agent's lifetime be managed? → A: Persistent: One agent process launched at middleware startup, shared across all requests.
- Q: How should agent authentication be handled? → A: Pre-authenticated via system environment (user logs in locally first).
- Q: How should ACP agent protocol errors be mapped? → A: 502 Bad Gateway: Reflect the agent error in the message.
- Q: How should overlapping requests for the same session ID be handled? → A: Reject with a 409 Conflict error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Chat Completion (Priority: P1)

A user sends a chat message through an OpenAI-compatible client (like Open WebUI) to interact with an ACP agent (Gemini CLI) without streaming.

**Why this priority**: This is the core functionality - enabling basic message exchange between OpenAI clients and ACP agents. Without this, nothing else matters.

**Independent Test**: Can be tested by sending a non-streaming POST request to /v1/chat/completions and receiving a valid OpenAI-format response with the agent's reply.

**Acceptance Scenarios**:

1. **Given** the middleware is running and the ACP agent is configured, **When** a user sends a chat completion request with messages and stream=false, **Then** the middleware creates a new session, forwards the message to the agent, and returns the agent's response in OpenAI format.

2. **Given** a valid session ID is provided in the request, **When** a user sends a follow-up message, **Then** the middleware uses the existing session and returns a response that continues the conversation.

3. **Given** the agent is unavailable or times out, **When** a user sends a request, **Then** the middleware returns an OpenAI-format error response without crashing.

---

### User Story 2 - Streaming Chat Completion (Priority: P1)

A user sends a chat message and receives real-time streamed responses from the ACP agent.

**Why this priority**: Many AI clients expect streaming support for better user experience. Without this, users cannot receive incremental responses from the agent.

**Independent Test**: Can be tested by sending a streaming request and receiving SSE (Server-Sent Events) chunks that form complete responses.

**Acceptance Scenarios**:

1. **Given** stream=true in the request, **When** a user sends a chat message, **Then** the middleware returns a streaming response with SSE-formatted chunks containing delta content from the agent.

2. **Given** the agent sends multiple message chunks, **When** streaming is enabled, **Then** each chunk is sent as a separate SSE event with proper formatting.

3. **Given** the agent signals completion (end_turn), **When** streaming, **Then** the final chunk includes finish_reason="stop" to indicate completion.

---

### User Story 3 - Model Information (Priority: P2)

A user queries available models through the OpenAI-compatible /v1/models endpoint.

**Why this priority**: Many clients automatically query the models endpoint to discover available models. Without this, such clients cannot identify the middleware as a valid OpenAI-compatible service.

**Independent Test**: Can be tested by sending GET /v1/models and receiving a valid OpenAI-format response listing available models.

**Acceptance Scenarios**:

1. **Given** the middleware is running, **When** a user sends GET /v1/models, **Then** the middleware returns a valid OpenAI models response with at least one model listed.

2. **Given** the middleware has established a connection to the agent, **When** the models endpoint is queried, **Then** the response includes agent information (name, version) if available.

---

### User Story 4 - Tool Auto-Approval with Logging (Priority: P2)

The middleware automatically approves all tool permission requests from the ACP agent while logging all tool activity.

**Why this priority**: Users want seamless tool execution without manual approval. Logging provides visibility for debugging and auditing.

**Independent Test**: Can be tested by triggering a tool call from the agent and verifying automatic approval + log entry.

**Acceptance Scenarios**:

1. **Given** the agent requests permission to execute a tool, **When** the middleware receives session/request_permission, **Then** it immediately approves the request without user interaction.

2. **Given** a tool is executed, **When** the agent sends tool call updates, **Then** all tool activity is logged to both console and file with timestamps and direction indicators.

3. **Given** a tool fails or returns an error, **When** the middleware receives the error, **Then** it logs the error and continues processing without crashing.

---

### Edge Cases

- **Agent process terminates**: Return 500 Internal Server Error with OpenAI-format message.
- **Malformed agent messages**: Log warning and skip chunk (streaming) or return 502 (non-streaming).
- **Concurrent requests**: Reject overlapping requests for the same session ID with a 409 Conflict error. Support multiple independent sessions concurrently.
- **Token limits**: Return finish_reason: length if agent signals limit reached.
- **Unsupported formats**: Log error and gracefully skip non-text content blocks (images/audio).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The middleware MUST accept POST requests to /v1/chat/completions following the OpenAI chat completion API schema.
- **FR-002**: The middleware MUST translate OpenAI message format (role, content) to ACP ContentBlock format for sending to the agent.
- **FR-003**: The middleware MUST translate ACP session/update notifications (agent_message_chunk) to OpenAI streaming format (delta.content).
- **FR-004**: The middleware MUST support optional session_id in chat requests to either create new sessions or reuse existing ones.
- **FR-005**: The middleware MUST return session_id in the response when a new session is created (for session control).
- **FR-006**: The middleware MUST support streaming responses via SSE (text/event-stream) when stream=true.
- **FR-007**: The middleware MUST map ACP stop reasons (end_turn, max_tokens, cancelled, etc.) to OpenAI finish_reason values (stop, length).
- **FR-008**: The middleware MUST auto-approve all session/request_permission calls from the agent without requiring user input.
- **FR-009**: The middleware MUST log all requests and responses to both console and file (in /tmp directory).
- **FR-010**: The middleware MUST return a 502 Bad Gateway error if the ACP agent returns a protocol-level JSON-RPC error.
- **FR-011**: The middleware MUST accept GET requests to /v1/models and return a valid OpenAI models response.
- **FR-012**: The middleware MUST pass through the model field from the request to the response without modification.
- **FR-013**: The middleware MUST load agent configuration from config.yaml with environment variable overrides (AGENT_COMMAND, AGENT_ARGS, LOG_DIR).
- **FR-014**: The middleware MUST use the current working directory (cwd) for agent process execution.
- **FR-015**: The middleware MUST return a 404 error if a provided `session_id` does not exist or has expired.
- **FR-016**: The middleware MUST maintain a single persistent ACP agent subprocess that is shared across all incoming requests and sessions.
- **FR-017**: The middleware MUST reject any incoming request for a `session_id` that is already processing an active request with a 409 Conflict error.

### Key Entities

- **ChatRequest**: Input to /v1/chat/completions containing model, messages, stream flag, optional session_id
- **ChatResponse**: Output from /v1/chat/completions in OpenAI format with choices, content, finish_reason
- **Session**: ACP session state maintained per session_id, contains conversation history
- **AgentConnection**: Wrapper around ACP client connection managing stdio communication
- **ContentBlock**: ACP message content format (text, image, audio, resource, resource_link)
- **SessionUpdate**: ACP notification format for agent_message_chunk, tool_call, tool_call_update

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can send a chat completion request and receive a valid response within 30 seconds (assuming agent responds).
- **SC-002**: Streaming requests deliver incremental responses to the client as the agent generates content.
- **SC-003**: All request/response activity is logged to both console and file for debugging.
- **SC-004**: Tool permission requests are auto-approved with logging, enabling seamless agent tool usage.
- **SC-005**: The middleware returns proper OpenAI-format error responses for invalid requests and agent failures.
- **SC-006**: Session reuse works correctly - subsequent requests with the same session_id continue the conversation.
- **SC-007**: The models endpoint returns a valid response that OpenAI-compatible clients can parse.

## Assumptions

- Users have an ACP-compatible agent installed (Gemini CLI for initial focus).
- The ACP agent is pre-authenticated in the environment where the middleware is launched (e.g., user is logged in via their local CLI).
- Users will configure the agent command in config.yaml or via environment variables.
- The middleware runs on a system with Node.js 18+ available.
- ACP agent communication over stdio is reliable (no network issues between middleware and agent).
- Users have access to /tmp directory for log files.
- OpenAI-compatible clients expect standard OpenAI API response formats.
- No authentication is required for API access (left open per user request).