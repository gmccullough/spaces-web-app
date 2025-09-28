<!-- Completed work plan migrated from TODO-spaces-conversational-file-tools.md on 2025-09-28 -->
## Executive Summary & Scope
**Objective**: Enable conversational saving of ideas to per-user Space storage by exposing three file IO capabilities (list, read, write) as supervisor-callable tools and wiring them to the new Spaces Storage API endpoints.

**Impact**: Agents can persist and retrieve user ideas during conversation, unblocking ideation workflows without UI changes. Safe auth/path patterns established for tool calls.

**Approach**: Minimal storage endpoints + supervisor tools using Supabase bearer auth, consistent error envelopes, and JSON-safe read payloads.

### In Scope
- [x] list/read/write tools
- [x] Supabase bearer auth in executors
- [x] Path safety via server-side validation
- [x] JSON-safe read response (base64 + contentType)
- [x] Supervisor guidance for confirmation, defaults, safe behavior

### Out of Scope
- [x] UI affordances (conversation-only)
- [x] Delete/rename/move
- [x] Manifests/schema validation/space provisioning

## Implementation Summary
- Endpoints: GET list, GET read, PUT write implemented with auth gating, path normalization, error envelopes, and size guard.
- Client wrappers: list/read/write with bearer auth, base64 read output, and path normalization.
- Supervisor tools: `list_space_files`, `read_space_file`, `write_space_file` with schemas; executor enforces required params and returns MISSING_PARAM errors when needed.
- Prompts: Supervisor and chat prompts updated to ideation context with Spaces guidance.

## Testing
- Unit: Added wrappers tests for headers, normalization, and base64 handling.
- Integration: Skipped placeholder; manual verification performed.

## Completion Criteria
- [x] Conversational flows save, read, and list files per spec
- [x] Supervisor instructions updated and validated in live conversation
- [x] No UI save affordance; conversation-driven only


