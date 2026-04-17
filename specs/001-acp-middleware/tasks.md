---

description: "Task list for ACP to OpenAI API Middleware feature implementation"
---

# Tasks: ACP to OpenAI API Middleware

**Input**: Design documents from `/specs/001-acp-middleware/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure folders: src/agents, src/api, src/services, src/utils, tests/unit, tests/integration per plan.md
- [x] T002 Initialize npm project and install dependencies: fastify, @agentclientprotocol/sdk, js-yaml, dotenv, vitest, typescript
- [x] T003 [P] Configure tsconfig.json for NodeNext and Vitest config in vitest.config.ts
- [x] T004 [P] Create initial redacting logger utility in src/utils/logger.ts (Principle III & IV)
- [x] T005 [P] Implement YAML/Env configuration loader in src/utils/config.ts (Principle VI)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement persistent ACP Agent connection lifecycle in src/agents/connection.ts (FR-016)
- [x] T007 Create in-memory session registry and locking logic in src/services/session.ts (FR-017, Data Model)
- [x] T008 Setup Fastify server entry point and basic error mapping in src/index.ts (Principle V)
- [x] T009 [P] Create base translator service for OpenAI <-> ACP format in src/services/translator.ts (FR-002)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Chat Completion (Priority: P1) 🎯 MVP

**Goal**: Enable non-streaming chat exchange using persistent sessions.

**Independent Test**: POST to /v1/chat/completions with stream=false and receive a valid OpenAI JSON response with assistant content.

### Implementation for User Story 1

- [x] T010 [P] [US1] Define ChatRequest and ChatResponse Zod/JSON schemas in src/api/types.ts
- [x] T011 [US1] Implement chat completions controller for POST /v1/chat/completions in src/api/completions.ts
- [x] T012 [US1] Implement message translation (role/content to ContentBlocks) in src/services/translator.ts (FR-002)
- [x] T013 [US1] Implement session/new logic and ID mapping in src/services/session.ts (FR-004, FR-005)
- [x] T014 [US1] Add 404 (Session Not Found) and 409 (Conflict/Busy) error handling (FR-015, FR-017)
- [x] T015 [US1] Create integration test for non-streaming chat in tests/integration/completions.test.ts

**Checkpoint**: User Story 1 is functional - basic chat works without streaming.

---

## Phase 4: User Story 2 - Streaming Chat Completion (Priority: P1)

**Goal**: Real-time streamed responses using SSE.

**Independent Test**: POST to /v1/chat/completions with stream=true and receive SSE events starting with `data:`.

### Implementation for User Story 2

- [x] T016 [US2] Implement SSE response formatting in src/api/completions.ts (FR-006)
- [x] T017 [US2] Implement listener for session/update notifications in src/agents/connection.ts (FR-003)
- [x] T018 [US2] Translate ACP agent_message_chunk to OpenAI chat.completion.chunk in src/services/translator.ts
- [x] T019 [US2] Map ACP stopReason to OpenAI finish_reason in src/services/translator.ts (FR-007)
- [x] T020 [US2] Create integration test for streaming chat in tests/integration/streaming.test.ts

**Checkpoint**: User Story 2 is functional - real-time streaming is enabled.

---

## Phase 5: User Story 3 - Model Information (Priority: P2)

**Goal**: Expose agent capabilities via standard models endpoint.

**Independent Test**: GET /v1/models returns the configured ACP agent info.

### Implementation for User Story 3

- [x] T021 [US3] Implement models controller for GET /v1/models in src/api/models.ts (FR-011)
- [x] T022 [US3] Capture agentInfo during initialization and expose it through models service
- [x] T023 [US3] Create contract test for models endpoint in tests/integration/models.test.ts

---

## Phase 6: User Story 4 - Tool Auto-Approval with Logging (Priority: P2)

**Goal**: Seamless tool execution with full audit trail.

**Independent Test**: Trigger a tool call from agent and verify immediate approval in logs.

### Implementation for User Story 4

- [x] T024 [US4] Implement auto-approval handler for session/request_permission in src/agents/connection.ts (FR-008)
- [x] T025 [US4] Add detailed logging for tool_call and tool_call_update in src/utils/logger.ts (SC-004)
- [x] T026 [US4] Add unit tests for logger redaction in tests/unit/logger.test.ts

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Reliability and usability improvements

- [x] T027 [P] Implement graceful shutdown handling for the agent subprocess in src/index.ts
- [x] T028 [P] Add Dockerfile for easy deployment per plan.md
- [x] T029 Complete README.md with configuration and testing guide from quickstart.md
- [x] T030 Final end-to-end manual validation with Gemini CLI as the agent

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001-T005. BLOCKS all user stories.
- **User Stories (Phase 3+)**: Depends on Foundation. US2 depends on translator logic from US1.
- **Polish (Final Phase)**: Depends on all stories.

### Parallel Opportunities

- T003, T004, T005 in Setup can run together.
- T009 can start as soon as connection logic is drafted.
- T010 can be done while service layer is being built.
- Different developers can work on US1 and US3/US4 simultaneously once Foundation is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundation.
2. Implement US1 (Non-streaming chat).
3. **STOP and VALIDATE**: Verify using `curl` as per quickstart.md.

### Incremental Delivery

1. Deploy MVP (US1).
2. Add Streaming (US2).
3. Add Metadata endpoints (US3).
4. Harden tool security/logging (US4).

---

## Notes

- ACP protocol fidelity is paramount (Principle I).
- Ensure all logs in `/tmp/acp-middleware` are rotated or managed (SC-003).
- All JSON-RPC errors from agent MUST be mapped to 502 Bad Gateway (Clarification).

---

## Summary

- **Total Task Count**: 30 tasks
- **Task Count Per User Story**:
  - US1 (Basic Chat): 6 tasks
  - US2 (Streaming): 5 tasks
  - US3 (Models): 3 tasks
  - US4 (Tool Auto-Approval): 3 tasks
  - Setup: 5 tasks
  - Foundational: 4 tasks
  - Polish: 4 tasks
- **Parallel Opportunities**:
  - Phase 1 tasks T003, T004, T005 can run in parallel
  - US1 and US3/US4 can be worked on in parallel once Foundation is done
- **Independent Test Criteria**:
  - US1: POST /v1/chat/completions (stream=false) returns valid response
  - US2: POST /v1/chat/completions (stream=true) returns SSE chunks
  - US3: GET /v1/models returns valid model list
  - US4: Tool calls auto-approved with log entries
- **MVP Scope**: User Stories 1 and 2 (P1) - Basic Chat + Streaming