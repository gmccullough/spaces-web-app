## Executive Summary
**Objective**: Define and implement file system Space management tools behind our Next.js Realtime/API surface, aligned with legacy MCP `spaces/*` primitives and the current app architecture.
**Impact**: Single canonical Space discovery/validation/creation flow used by voice sessions and UI; unblocks Space Picker and Index rendering; sets stable contracts for future editors.
**Approach**: Implement a unified REST API backed by user-scoped Supabase Storage for Space files. Use JSON schema validation and typed errors. Expose read/write endpoints consumable by Realtime later; web UI remains read-only for now.

## Scope & Constraints
### In Scope
- [ ] Unified listing of Spaces for current user (`file` and `ideation`)
- [ ] Manifest read + validation against server schema
- [ ] Space ensure/create with mandatory `type` (writes manifest + stub `index.md`)
- [ ] File read/write APIs scoped to a Space
- [ ] REST endpoints for Spaces and Files (no MCP prompts/resources)
- [ ] Type-safe interfaces and error envelopes

### Out of Scope
- [ ] Ideation graph CRUD (separate plan; Spaces API still lists `ideation`)
- [ ] Any UI components (covered in UI plan)
- [ ] Prompt/resources registries (not using MCP)

### Success Criteria
- [ ] Unified listing returns `{ name, type, path, created_at, description? }` for both types
- [ ] Ensure/create writes valid manifest with `type` and stub `index.md`
- [ ] Validation returns consistent, parseable errors
- [ ] Endpoints protected by Supabase Auth; user-scoped access
- [ ] File APIs support read/write within user scope with traversal prevention

## Implementation Plan

### Phase 1: Schema, Types, and Storage Paths
**Goal**: Establish schema, type contracts, and path safety.

- [ ] **Add** **SpaceManifest Schema** - JSON Schema file for validation
  - **Files**: `specs/architecture/space-manifest.schema.json`
  - **Dependencies**: None
  - **Validation**: Schema matches `{ name, type: "file", created_at, description? }`
  - **Context**: Shared across validation and tests

- [ ] **Create** **spaces/types.ts** - TS interfaces and result envelopes
  - **Files**: `src/app/lib/spaces/types.ts`
  - **Dependencies**: None
  - **Validation**: Exports `SpaceSummary`, `SpaceManifest`, `ValidationError`, API result types
  - **Context**: Single source of truth for server and UI callers

- [ ] **Create** **spaces/paths.ts** - User-safe path resolution helpers
  - **Files**: `src/app/lib/spaces/paths.ts`
  - **Dependencies**: Supabase Auth user id; Node `path`
  - **Validation**: Prevents path traversal; clamps to `/data/<user-id>` root
  - **Context**: All FS access goes through these helpers

### Phase 2: Core Operations (Server Module)
**Goal**: Implement list/read/validate/create aligned to MCP semantics.

- [ ] **Add** **spaces/fs.ts** - Core FS operations
  - **Files**: `src/app/lib/spaces/fs.ts`
  - **Dependencies**: `paths.ts`, `types.ts`, `ajv` (or `jsonschema`), Node `fs/promises`
  - **Validation**: Functions return typed results, never throw on user errors (structured errors instead)
  - **Context**: Headless library consumed by route handlers and Realtime

- [ ] **Implement** `listFileSpacesForUser(userId)`
  - **Files**: `src/app/lib/spaces/fs.ts`
  - **Dependencies**: `paths.userRoot`, schema validation, presence of `index.md`
  - **Validation**: Returns `SpaceSummary[]` sorted by created_at/name; excludes invalids
  - **Context**: Mirrors legacy `spaces.list_file_spaces()` behavior

- [ ] **Implement** `readManifest(userId, spaceName)`
  - **Validation**: Reads and parses manifest; returns `SpaceManifest`
  - **Context**: Used by UI and diagnostics

- [ ] **Implement** `validateManifest(manifest)`
  - **Validation**: Returns `{ valid, errors[] }` with stable codes/messages
  - **Context**: Used by list and creation flows

- [ ] **Implement** `createFileSpace(userId, { name, description? })`
  - **Validation**: Normalizes name, creates dir, writes manifest + stub index; idempotent if exists returns conflict error
  - **Context**: Server-side only; no UI writes without explicit call

### Phase 3: API Endpoints (Route Handlers)
**Goal**: Expose typed endpoints for internal consumption, fully behind auth.

- [ ] **Create** **GET /api/spaces/list** (authenticated)
  - **Files**: `src/app/api/spaces/list/route.ts`
  - **Dependencies**: Supabase session (server helper); `listFileSpacesForUser`
  - **Validation**: 200 with `{ spaces }`; 401 when unauthenticated (no fallback)
  - **Context**: For Space Picker and Realtime session bootstrap

- [ ] **Create** **POST /api/spaces/create** (authenticated)
  - **Files**: `src/app/api/spaces/create/route.ts`
  - **Dependencies**: Supabase session; `createFileSpace`
  - **Validation**: 201 with `{ path, manifestPath, indexPath }`; 409 on conflict; 400 on invalid name
  - **Context**: Admin/explicit creation only

- [ ] **Create** **GET /api/spaces/manifest** (authenticated)
  - **Files**: `src/app/api/spaces/manifest/route.ts`
  - **Dependencies**: Supabase session; `readManifest`
  - **Validation**: 200 with `{ manifest }`; 404 when space not found
  - **Context**: Diagnostics and UI detail

### Phase 4: Realtime Integration Hooks
**Goal**: Provide helper for Realtime session bootstrap to ensure Space selection.

- [ ] **Add** **ensureSpaceSelected(session)**
  - **Files**: `src/app/lib/spaces/integration.ts`
  - **Dependencies**: Endpoints above or direct module calls
  - **Validation**: Requires authenticated session; returns selected space from session/localStorage hint; errors if none
  - **Context**: Voice sessions must operate within a Space

## Technical Architecture

### Service Interfaces (Signatures)
```typescript
export type SpaceManifest = {
  name: string;
  type: 'file';
  created_at: string; // ISO8601
  description?: string;
};

export type SpaceSummary = {
  name: string;
  path: string;
  created_at?: string;
};

export type ValidationIssue = { path?: string; code?: string; message: string };

export function listFileSpacesForUser(userId: string): Promise<SpaceSummary[]>;
export function readManifest(userId: string, spaceName: string): Promise<SpaceManifest>;
export function validateManifest(manifest: SpaceManifest): { valid: boolean; errors: ValidationIssue[] };
export function createFileSpace(userId: string, input: { name: string; description?: string }): Promise<{ path: string; manifestPath: string; indexPath: string }>; 
```

### Configuration
```ts
// Root where user data is stored (local dev only; prod may use storage adapter)
export const DATA_ROOT = process.env.DATA_ROOT || path.join(process.cwd(), 'data');
```

### Middleware Gating (concept)
```ts
// src/middleware.ts
// Protect /spaces routes and /api/spaces/* endpoints behind Supabase auth
// if request.path.startsWith('/spaces') || request.path.startsWith('/api/spaces')
//   get user from Supabase cookies; if none → redirect('/login?next=' + req.nextUrl)
// else next()
```

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Listing excludes invalid manifests and requires `index.md`
- [ ] Creation writes valid manifest + stub index
- [ ] Validation returns structured errors
- [ ] All /api/spaces/* endpoints return 401 when unauthenticated

### New Tests Required
- [ ] **Unit**: Path normalization and traversal prevention
- [ ] **Unit**: Manifest validation rules
- [ ] **Integration**: List/create/read flows with sample user dirs
- [ ] **Integration**: Auth gating for /api/spaces/* (401 vs 200/201)

### Test Documentation Updates
- [ ] **Update** `specs/product/example-domain/tests.md` with Spaces domain coverage additions

## Risk Assessment & Dependencies

### Risks
- **Path handling errors** – Mitigate by centralized `paths.ts` and tests
- **Manifest drift** – Single schema source; CI validation
- **Auth leakage** – Enforce Supabase session check in route handlers

### Dependencies
- Supabase Auth session in API context
- Node FS access (or adapter later)

## Timeline & Deliverables

### Week 1
- [ ] Schema + types + paths helpers
- [ ] Core FS ops implemented and covered by unit tests

### Week 2
- [ ] API endpoints wired with integration tests
- [ ] Realtime integration helper

## Final Completion Criteria
- [ ] Endpoints available and documented
- [ ] Contracts stable and used by Realtime/UI
- [ ] Tests pass; no regressions
- [ ] Docs updated; schema checked in


