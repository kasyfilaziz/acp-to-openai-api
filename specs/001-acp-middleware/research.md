# Research: ACP to OpenAI API Middleware

This document consolidates technical research for the implementation of the middleware.

## Decision: SDK Integration for Persistent Agent
**Decision**: Use `ClientSideConnection` from `@agentclientprotocol/sdk` to manage the stdio lifecycle once at startup.
**Rationale**: Re-initializing the agent for each request would be too slow. The agent maintains its own session pool, so a single process is sufficient.
**Alternatives Considered**: `AgentSideConnection` (only for the agent itself), spawning raw subprocesses (not type-safe).

## Decision: Fastify SSE for Streaming
**Decision**: Use Fastify's native `reply.raw` or a dedicated SSE plugin (e.g., `@fastify/sse-v2`) to stream `sessionUpdate` chunks.
**Rationale**: Fastify provides better streaming performance than Express. We need to manually format the chunks to match OpenAI's `data: ...\n\n` format.
**Alternatives Considered**: Standard HTTP chunked transfer-encoding (too low-level).

## Decision: OpenAI Error Mapping
**Decision**: Follow the standard OpenAI `error` payload format for all non-200 responses.
**Rationale**: Maintains compatibility with clients like Open WebUI.
**Mappings**:
- **404**: `{"error": {"message": "Session not found", "type": "invalid_request_error", "code": "session_not_found"}}`
- **409**: `{"error": {"message": "Session is busy", "type": "invalid_request_error", "code": "session_busy"}}`
- **502**: `{"error": {"message": "ACP agent error", "type": "api_error", "code": "agent_protocol_error", "param": "original_jsonrpc_error"}}`
