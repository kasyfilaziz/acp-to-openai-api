# ACP to OpenAI API Middleware Constitution

## Core Principles

### I. Protocol Fidelity
The middleware MUST accurately translate between OpenAI API format and ACP protocol without loss or corruption of messages. All ContentBlock types MUST be supported. Session state MUST be preserved correctly across requests.

**Rationale**: Users expect seamless integration - the middleware should be transparent to both the OpenAI client and the ACP agent.

### II. Session Control via API
Session creation and management MUST be controllable through chat request parameters. Clients MUST be able to specify `session_id` to reuse existing sessions or create new sessions on-demand.

**Rationale**: Full control over agent sessions enables: conversation continuity, parallel conversations, session debugging, and resource management.

### III. Security by Design
The middleware MUST NOT expose sensitive data through logs or error messages. API keys, tokens, and session IDs MUST be redacted in logs. Error responses MUST follow OpenAI format without leaking internal implementation details.

**Rationale**: Security vulnerabilities often come from improper logging. Following OpenAI error format ensures compatibility with existing clients.

### IV. Observability
All requests to/from the ACP agent MUST be logged with timestamps, direction indicators, and sanitized content. Logs MUST be written to both console (for real-time debugging) and file (for persistent auditing).

**Rationale**: Troubleshooting ACP integration requires visibility into message flow. File logs enable post-incident analysis.

### V. Graceful Degradation
The middleware MUST handle agent failures gracefully: connection timeouts, protocol errors, and unexpected messages must not crash the server. All errors MUST return valid OpenAI-compatible error responses.

**Rationale**: Production systems must remain available even when the agent fails. Users should receive actionable error messages.

### VI. Configuration Flexibility
Agent configuration (command, arguments, working directory) MUST be configurable via both config.yaml and environment variables, with environment variables taking precedence.

**Rationale**: Containerized deployments require environment-based configuration. Dynamic overrides enable testing with different agents.

### VII. Testability
The middleware MUST be designed for automated testing: clear interfaces, mockable ACP connections, and integration test coverage for critical paths.

**Rationale**: Without tests, refactoring becomes risky. Integration tests validate end-to-end protocol translation.

## Technology Standards

**Language**: TypeScript (Node.js 18+)  
**ACP SDK**: @agentclientprotocol/sdk (latest stable)  
**HTTP Server**: Fastify 5.x  
**Configuration**: YAML (js-yaml) + dotenv  
**Logging**: winston or console + fs (file rotation in /tmp)  

**Required Dependencies**:
- `@agentclientprotocol/sdk` - ACP protocol implementation
- `fastify` - HTTP server with SSE support
- `js-yaml` - YAML config parsing
- `dotenv` - Environment variable loading

## Development Workflow

**Session Control**:
- Accept optional `session_id` in chat request
- If provided: use existing session, return session_id in response
- If not provided: create new session, return session_id in response

**Log Location**:
- Console: colored output with timestamps
- File: `{LOG_DIR}/requests-{date}.log` and `{LOG_DIR}/errors-{date}.log`
- Default LOG_DIR: `/tmp/acp-middleware`

**Error Format**: OpenAI-compliant JSON:
```json
{"error": {"message": "...", "type": "invalid_request_error"}}
```

## Governance

**Constitution Supremacy**: This constitution supersedes all other development practices unless explicitly amended.

**Amendment Procedure**:
1. Propose change with rationale and impact analysis
2. Document in project memory
3. Version bump according to semantic rules:
   - MAJOR: Remove or redefine core principles
   - MINOR: Add new principle or expand guidance
   - PATCH: Clarifications, wording fixes
4. Update dependent templates

**Compliance Review**: All PRs must verify:
- Protocol translation correctness
- Logging sanitization
- Error handling completeness
- Session management functionality

**Runtime Guidance**: Use `README.md` for development and deployment instructions.

**Version**: 1.0.0 | **Ratified**: 2026-04-15 | **Last Amended**: 2026-04-15