# Implementation Plan: ACP to OpenAI API Middleware

**Branch**: `001-acp-middleware` | **Date**: 2026-04-15 | **Spec**: `/specs/001-acp-middleware/spec.md`
**Input**: Feature specification from `/specs/001-acp-middleware/spec.md`

## Summary

The project implements a middleware that bridges Agent Client Protocol (ACP) agents to an OpenAI-compatible API. It acts as a Fastify-based HTTP server that manages a persistent ACP agent subprocess via stdio. It handles session management (including reuse via `session_id`), protocol translation (OpenAI messages to ACP ContentBlocks), and provides both standard and streaming responses.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+)  
**Primary Dependencies**: `@agentclientprotocol/sdk`, `fastify`, `js-yaml`, `dotenv`  
**Storage**: N/A (Stateless middleware, session context maintained by the ACP Agent)  
**Testing**: Vitest (for unit and integration tests)  
**Target Platform**: Linux server / Containerized Node.js  
**Project Type**: Web-service (OpenAI-compatible API Gateway)  
**Performance Goals**: < 100ms middleware overhead (excluding agent processing time)  
**Constraints**: Absolute protocol fidelity, sanitized logging to `/tmp/acp-middleware`, strict session locking  
**Scale/Scope**: Single persistent agent process, support for multiple concurrent sessions (serialized per session)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Protocol Fidelity | PASS | Using official SDK; plan includes mapping all ContentBlock types. |
| II. Session Control via API | PASS | Supported via optional `session_id` in ChatRequest. |
| III. Security by Design | PASS | Plan includes a redaction layer in the logger. |
| IV. Observability | PASS | Plan uses winston/pino for console + file logging in /tmp. |
| V. Graceful Degradation | PASS | 502/404/409 errors defined in spec/clarifications. |
| VI. Configuration Flexibility | PASS | Using js-yaml + dotenv for flexible config. |
| VII. Testability | PASS | Architected with AgentConnection interface for easy mocking. |

## Project Structure

### Documentation (this feature)

```text
specs/001-acp-middleware/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── agents/             # ACP Agent connection and lifecycle management
│   ├── connection.ts   # Stdio transport management
│   └── types.ts        # ACP specific types
├── api/                # Fastify routes and controllers
│   ├── completions.ts  # /v1/chat/completions logic
│   └── models.ts       # /v1/models logic
├── services/           # Business logic
│   ├── session.ts      # Session registry and state
│   └── translator.ts   # OpenAI <-> ACP format conversion
├── utils/              # Shared utilities
│   ├── logger.ts       # Redacting logger
│   └── config.ts       # YAML/Env config loader
└── index.ts            # Server entry point
```

**Structure Decision**: Option 1 (Single project) is selected as it is a focused middleware utility with no frontend component.

## Complexity Tracking

*No constitution violations detected.*
