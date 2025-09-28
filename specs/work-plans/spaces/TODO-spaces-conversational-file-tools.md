## Executive Summary & Scope
**Objective**: Enable conversational saving of ideas to per-user Space storage by exposing three file IO capabilities (list, read, write) as supervisor-callable tools and wiring them to the new Spaces Storage API endpoints.

**Impact**: Lets agents persist and retrieve user ideas during conversation, unlocking ongoing ideation workflows without adding UI. Establishes safe auth and path patterns for tool calls.

**Approach**: Use the minimal storage endpoints defined in `TODO-spaces-minimal-user-storage-3ops.md` and create three supervisor tools that call them with Supabase bearer auth, consistent error envelopes, and JSON-safe payloads.

### In Scope
- [ ] Three tool calls only: list, read, write (create/overwrite)
- [ ] Auth: Supabase bearer token forwarded by tool executors
- [ ] Path safety: rely on server-side validation; surface errors plainly
- [ ] JSON-safe read response (base64 body + contentType)
- [ ] Agent instructions for confirmation, defaults, and safe behavior

### Out of Scope
- [ ] Any UI affordance (no buttons or panels). All saving is via conversation
- [ ] Delete, rename, move operations
- [ ] Manifests, schema validation, or space provisioning


## Implementation Plan

### Phase 1: API Readiness Alignment
- [ ] Confirm endpoints per `TODO-spaces-minimal-user-storage-3ops.md`:
  - [ ] GET `/api/spaces/:name/files` (supports `dir`, `recursive`)
  - [ ] GET `/api/spaces/:name/files/[...path]` (raw bytes, returns `Content-Type`)
  - [ ] PUT `/api/spaces/:name/files/[...path]` (requires `Content-Type`, honors `If-None-Match: *`)
- [ ] Ensure error envelope for non-2xx: `{ error: { code, message } }`
- [ ] Ensure 401 for unauthenticated; `INVALID_PATH` for traversal; `REQUEST_TOO_LARGE` guard (e.g., 5MB default)

### Phase 2: Auth Propagation for Tool Calls
- [ ] On chat/session init, obtain Supabase `access_token` client-side
- [ ] Pass `access_token` into agent execution context available to tool executors
- [ ] Tool executors include `Authorization: Bearer ${accessToken}` (avoid cookie reliance)
- [ ] Endpoints validate JWT and derive `userId` server-side only

### Phase 3: Supervisor Tools (Schemas + Executors)
- [ ] Define tool: `list_space_files`
  - [ ] Schema: `{ spaceName: string; dir?: string; recursive?: boolean }`
  - [ ] Fetch: GET `/api/spaces/:name/files?dir=&recursive=`
  - [ ] Return: `{ files: FileEntry[] }` as-is; pass through error envelope
- [ ] Define tool: `read_space_file`
  - [ ] Schema: `{ spaceName: string; path: string }`
  - [ ] Fetch: GET `/api/spaces/:name/files/[...path]`
  - [ ] Return: `{ contentBase64: string; contentType: string; size: number }`; pass through errors
- [ ] Define tool: `write_space_file`
  - [ ] Schema: `{ spaceName: string; path: string; content: string; contentType: string; ifNoneMatch?: '*' }`
  - [ ] Fetch: PUT with body bytes; set `Content-Type`; header `If-None-Match: *` when provided
  - [ ] Return: `{ path: string; size: number; contentType: string; etag?: string }`; pass through errors

#### Minimal reference schemas (for clarity)
```json
{
  "list_space_files": {
    "type": "object",
    "properties": {
      "spaceName": { "type": "string" },
      "dir": { "type": "string" },
      "recursive": { "type": "boolean", "default": false }
    },
    "required": ["spaceName"],
    "additionalProperties": false
  },
  "read_space_file": {
    "type": "object",
    "properties": {
      "spaceName": { "type": "string" },
      "path": { "type": "string" }
    },
    "required": ["spaceName", "path"],
    "additionalProperties": false
  },
  "write_space_file": {
    "type": "object",
    "properties": {
      "spaceName": { "type": "string" },
      "path": { "type": "string" },
      "content": { "type": "string" },
      "contentType": { "type": "string" },
      "ifNoneMatch": { "type": "string", "enum": ["*"] }
    },
    "required": ["spaceName", "path", "content", "contentType"],
    "additionalProperties": false
  }
}
```

### Phase 4: Supervisor Instruction Updates
- [ ] Add guidance to ask for confirmation before overwriting existing files
- [ ] Default save location to `ideas/` unless user specifies a different dir
- [ ] Default filename format: `YYYYMMDD-HHmm-<short-title>.md` (kebab-case)
- [ ] Prefer `text/markdown; charset=utf-8` for idea notes; switch to appropriate `Content-Type` and base64 if binary
- [ ] If path ambiguity exists, call `list_space_files` first, then confirm with user
- [ ] If server returns `INVALID_PATH`, explain briefly and ask for a safe path

### Phase 5: File Conventions and Behaviors (Conversation-Only)
- [ ] Conversation controls saving flow; no UI affordance will be built
- [ ] When user hasn’t specified a name, propose a sensible default and confirm
- [ ] Respect `If-None-Match: *` when user asks to "only create if new"
- [ ] Avoid destructive operations; no delete/rename in scope

### Phase 6: Testing Strategy Integration
- [ ] Unit tests: tool executors
  - [ ] Validate parameter shaping and headers (auth + content-type)
  - [ ] Read: convert bytes to base64; compute `size`
  - [ ] Error pass-through unchanged
- [ ] Integration tests: conversational tool flows
  - [ ] write → read round-trip integrity for markdown idea
  - [ ] list reflects new file
  - [ ] `If-None-Match: *` returns 409 on existing path
  - [ ] 401 when missing/invalid bearer token
  - [ ] `INVALID_PATH`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_TOO_LARGE` surfaced

### Phase 7: Rollout Sequence
- [ ] Verify endpoints behavior and error envelopes in dev
- [ ] Implement executors + schemas; wire `access_token` context
- [ ] Update supervisor instructions
- [ ] Add tests (unit + integration) and ensure they pass
- [ ] Release to dev; validate manual conversational save flows


## Technical Architecture

### Components and Interfaces
- Supervisor tools call Next API routes for Spaces Storage
- Auth via Supabase `Authorization: Bearer <access_token>` header
- Read returns binary; executors convert to base64 for JSON safety
- Errors are not transformed; pass server envelope through

### Endpoint Mapping
1) list → GET `/api/spaces/:name/files` → `{ files: FileEntry[] }`
2) read → GET `/api/spaces/:name/files/[...path]` → bytes + `Content-Type` → `{ contentBase64, contentType, size }`
3) write → PUT `/api/spaces/:name/files/[...path]` → `{ path, size, contentType, etag? }`


## Testing Strategy

### Tests That Must Pass
- [ ] Auth gating: 401 on all three calls when unauthenticated
- [ ] Path safety: traversal yields `INVALID_PATH`
- [ ] Write semantics: 201 create, 200 overwrite, 409 with `If-None-Match: *` when exists
- [ ] Read: round-trip content and `Content-Type` preserved
- [ ] List: includes newly written files with metadata

### New Tests Required
- [ ] Unit: executors parameterization, headers, base64 conversion, error pass-through
- [ ] Integration: conversation-driven flows invoking list/read/write


## Risk Assessment & Dependencies

### Risks
- Path handling mistakes → rely on centralized server validation; keep executor simple
- Auth leakage → never derive `userId` client-side; always send bearer token and let server derive
- Binary handling → base64 encoding; large files rejected with clear error

### Dependencies
- Supabase Auth in app and server contexts
- Spaces storage endpoints from `TODO-spaces-minimal-user-storage-3ops.md`


## Discussion & Decision Context
- Chose conversation-only saving to keep UX focused and reduce surface area
- JSON-safe read output simplifies tool chaining without streaming
- Executors avoid path normalization logic to prevent drift from server rules


## Completion Criteria & Timeline

### Completion Criteria
- [ ] Conversational flows can save, read back, and list idea files in a Space
- [ ] All required tests pass (unit + integration)
- [ ] Supervisor instructions updated and verified in a live conversation
- [ ] No UI save affordance shipped; all saving happens via conversation

### Timeline
- Week 1: finalize endpoints, implement tools + auth plumbing
- Week 2: tests, instruction polish, manual conversational validation


