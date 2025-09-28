## Executive Summary

**Objective**: Persist chat transcripts in Supabase Postgres with strict RLS for debugging and future analysis.

**Impact**: Enables reliable reconstruction of conversations and model behavior using authoritative server-side logs. Improves incident triage and provides a foundation for later analytics without adding UI or event streams now.

**Approach**: Create normalized tables for `chat_sessions`, `chat_messages`, and `model_invocations` with indices and RLS by `spaceId`/`userId`. Instrument server-side message boundaries and model-call boundaries to write records synchronously. Store attachments in Supabase Storage bucket `spaces` and persist only references.

## Scope & Constraints

### In Scope
- [ ] **Database**: Create `chat_sessions`, `chat_messages`, `model_invocations` tables with indices and RLS
- [ ] **Server Logging**: Instrument message and model-call boundaries (no client/UI persistence)
- [ ] **Attachments**: Store paths in Storage bucket `spaces` (objects not duplicated)
- [ ] **Manual Inspection**: We will inspect data directly in the DB (no export tooling)
- [ ] **Tests**: Minimal integration tests to validate writes and RLS

### Out of Scope
- [ ] Event streams and fine-grained step logging
- [ ] Debug UI and dashboards
- [ ] Analytics pipelines and aggregation jobs
- [ ] Export tooling and user-facing viewers

### Success Criteria
- [ ] New sessions create a row in `chat_sessions` with correct `spaceId`/`userId`
- [ ] Each user/assistant message is persisted to `chat_messages` with ordered timestamps
- [ ] Model calls are recorded in `model_invocations` with tokens and latency
- [ ] RLS ensures users can only read/write within their `spaceId` membership
- [ ] Manual SQL queries can reconstruct a session end-to-end

## Implementation Plan

### Phase 1: Database Schema & RLS
**Goal**: Establish normalized schema and enforce RLS by space/user.

- [ ] **Create** **chat_sessions** table
  - **Validation**: Insert/select succeeds; FK integrity enforced; indices present
  - **Context**: Root entity for a conversation session within a space
- [ ] **Create** **chat_messages** table
  - **Validation**: Ordered retrieval by `created_at` reconstructs transcript
  - **Context**: Stores role/content with optional attachments metadata
- [ ] **Create** **model_invocations** table
  - **Validation**: Tokens/latency captured per model call and linked to session/message
  - **Context**: Captures runtime model behavior for debugging
- [ ] **Add** **Indices** on hot paths
  - **Files**: Applied in SQL below
  - **Validation**: Indexes exist; basic EXPLAIN shows index usage on session queries
- [ ] **Enable** **RLS** on all three tables
  - **Validation**: Queries fail without proper role; pass for owner/member
  - **Context**: Restricts access by `space_id` and `user_id`

### Phase 2: Server-Side Logging (Authoritative)
**Goal**: Write messages and model-call records from the server at orchestration boundaries.

- [ ] **Create** **TranscriptLogger interface** and server implementation
  - **Files**: `src/app/lib/` (exact path TBD to match existing patterns)
  - **Dependencies**: Supabase server client in `src/app/lib/supabase/server.ts`
  - **Validation**: Logger writes succeed; meaningful errors surface on failure
  - **Context**: Single entry point to persist transcripts from server logic
- [ ] **Instrument** **supervisorAgent** message boundaries
  - **Files**: `src/app/agentConfigs/chatSupervisor/supervisorAgent.ts`
  - **Validation**: On inbound user message → session/message rows created; on assistant response → message row created
  - **Context**: Central orchestration point that sees user prompts and assistant outputs
- [ ] **Instrument** **model call lifecycle**
  - **Files**: Same orchestration layer where model is invoked
  - **Validation**: On model completion, `model_invocations` row captures provider, model, params, tokens, latency, success/error
  - **Context**: Core for later debugging without event stream
- [ ] **Idempotency** for retries
  - **Files**: Logger uses `request_id`/`message_id` to avoid duplicate inserts
  - **Validation**: Duplicate attempts upsert rather than multiply insert

### Phase 3: Tests & Validation
**Goal**: Ensure writes function and RLS protects data.

- [ ] **Add** **Integration test**: persist-and-read transcript
  - **Files**: `tests/spaces/transcripts.integration.test.ts` (or adjacent domain path)
  - **Validation**: Creates session, adds messages and a model invocation; can read back correctly
- [ ] **Add** **RLS test**: access denied across spaces
  - **Files**: Same test suite
  - **Validation**: User from another space cannot read/modify session rows
- [ ] **Add** **Unit test**: TranscriptLogger contracts
  - **Files**: `tests/spaces/transcript-logger.unit.test.ts`
  - **Validation**: Calls expected DB methods; error propagation is visible

## Technical Architecture

### Database Changes (Supabase Postgres)
```sql
-- Sessions
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  user_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  tags jsonb default '{}'::jsonb
);

-- Messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  attachments jsonb default '[]'::jsonb, -- references to Supabase Storage bucket 'spaces'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Model invocations
create table if not exists model_invocations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  message_id uuid references chat_messages(id) on delete set null,
  provider text not null,
  model text not null,
  params jsonb default '{}'::jsonb,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  success boolean,
  error jsonb,
  created_at timestamptz not null default now()
);

-- Indices
create index if not exists idx_chat_sessions_space_started on chat_sessions(space_id, started_at desc);
create index if not exists idx_chat_messages_session_created on chat_messages(session_id, created_at asc);
create index if not exists idx_model_invocations_session_created on model_invocations(session_id, created_at asc);

-- RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table model_invocations enable row level security;

-- Example RLS policies (adapt to your auth schema/memberships)
-- Replace membership check with your actual space membership function/table
create policy chat_sessions_is_member on chat_sessions
  for select using (exists (
    select 1 from space_members m
    where m.space_id = chat_sessions.space_id and m.user_id = auth.uid()
  ));
create policy chat_sessions_owner_insert on chat_sessions
  for insert with check (space_id in (
    select m.space_id from space_members m where m.user_id = auth.uid()
  ));

create policy chat_messages_select on chat_messages
  for select using (exists (
    select 1 from chat_sessions s
    join space_members m on m.space_id = s.space_id and m.user_id = auth.uid()
    where s.id = chat_messages.session_id
  ));
create policy chat_messages_insert on chat_messages
  for insert with check (exists (
    select 1 from chat_sessions s
    join space_members m on m.space_id = s.space_id and m.user_id = auth.uid()
    where s.id = chat_messages.session_id
  ));

create policy model_invocations_select on model_invocations
  for select using (exists (
    select 1 from chat_sessions s
    join space_members m on m.space_id = s.space_id and m.user_id = auth.uid()
    where s.id = model_invocations.session_id
  ));
create policy model_invocations_insert on model_invocations
  for insert with check (exists (
    select 1 from chat_sessions s
    join space_members m on m.space_id = s.space_id and m.user_id = auth.uid()
    where s.id = model_invocations.session_id
  ));
```

### Service Interfaces (server-only)
```javascript
class TranscriptLogger {
  createSession(spaceId, userId, tags)           // Create or reuse a chat session
  logUserMessage(sessionId, messageId, content)  // Persist inbound user message
  logAssistantMessage(sessionId, messageId, content, attachments) // Persist assistant output
  logModelInvocation(sessionId, messageId, info) // Persist provider/model/tokens/latency/success
}
```
**Purpose**: Single server-side interface to persist transcripts, isolating DB details from orchestration code.

### Configuration Updates
- None (reuse existing Supabase server client and `spaces` storage bucket; store attachment references only).

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Existing Spaces tests continue to pass
  - **Files**: `tests/spaces/*.test.ts`
  - **Risk**: Supabase client/server changes could affect auth/session flows
  - **Validation**: Run `npm test` and verify no regressions

### New Tests Required
- [ ] **Integration**: persist and read transcript end-to-end
  - **Purpose**: Validate schema, inserts, and session timeline reconstruction
  - **Implementation**: Use server client to create session/messages and query back
  - **Success Criteria**: Retrieved messages exactly match inserted content/ordering
- [ ] **Integration**: RLS denial across spaces
  - **Purpose**: Ensure isolation
  - **Implementation**: Attempt cross-space read/write; expect failure
  - **Success Criteria**: Access denied errors observed
- [ ] **Unit**: TranscriptLogger behavior
  - **Purpose**: Contract and error propagation
  - **Implementation**: Stub DB calls; assert method contracts
  - **Success Criteria**: Methods call expected inserts; errors bubble up

### Test Documentation Updates
- [ ] **Update** `specs/product/example-domain/tests.md` or domain-appropriate doc with new coverage map
  - **Context**: Document where transcript tests live and what they validate

## Risk Assessment & Dependencies

### High Risk: Data Sensitivity
- **Risk**: Storing raw message content may include sensitive data
- **Impact**: Privacy concerns and potential leakage
- **Mitigation**: Strict RLS; server-side logging only; consider optional redaction later
- **Contingency**: Ability to hard-delete by `session_id` on verified request

## Dependencies & Integration Points

### Critical Dependencies
- [ ] **Supabase Postgres & Auth**: For schema, RLS, and `auth.uid()` in policies
  - **Status**: Available
  - **Timeline**: Immediate
  - **Contingency**: If membership model differs, adjust RLS policies accordingly
- [ ] **Supabase Storage bucket `spaces`**: Store attachments as object references
  - **Status**: Exists
  - **Timeline**: Immediate
  - **Contingency**: If paths change, add migration logic for historical records

### Integration Points
- [ ] **Supervisor Orchestration**: `src/app/agentConfigs/chatSupervisor/supervisorAgent.ts`
  - **Interface**: Call `TranscriptLogger` at inbound/outbound boundaries
  - **Testing Strategy**: Unit test logger calls; integration test end-to-end writes

## Discussion & Decision Context

### Key Discussion Points

#### Alternative Approaches Considered
- **Object storage-only transcripts**
  - **Pros**: Cheap, append-only
  - **Cons**: Poor queryability; harder RLS
  - **Decision**: Rejected for now in favor of normalized DB
- **Event stream with raw append logs**
  - **Pros**: Fine-grained forensic detail
  - **Cons**: Write amplification; storage growth; out of scope
  - **Decision**: Defer; not needed for current debugging goals

#### Context & Timing
- **Why Now**: Need reliable debugging data and future-ready foundation
- **Technical Readiness**: Supabase Postgres and Storage are available; server orchestration points are centralized

#### Future Considerations
- Optional PII redaction at write-time
- Optional `tool_invocations` table if tool-level debugging becomes necessary
- Retention/archival policies once data volume grows

## Timeline & Deliverables

### Week 1: Foundation
- [ ] DB schema created and RLS enabled for three tables
- [ ] Indices added and validated
- [ ] TranscriptLogger server implementation ready

### Week 2: Integration & Tests
- [ ] Orchestration instrumented for messages and model calls
- [ ] Integration and unit tests added and passing
- [ ] Manual SQL cookbook documented for common debug queries

## Final Completion Criteria
- [ ] All planned features work as specified (messages/model calls persisted)
- [ ] All tests pass (existing and new)
- [ ] Documentation updated (this plan + manual SQL cookbook)
- [ ] No breaking changes to existing systems
- [ ] Basic performance preserved (no noticeable latency increase)


