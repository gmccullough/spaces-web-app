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
- [ ] MCP-style prompts/resources registries

### Success Criteria
- [ ] Unified listing returns `{ name, type, path, created_at, description? }` for both types
- [ ] Ensure/create writes valid manifest with `type` and stub `index.md`
- [ ] Validation returns consistent, parseable errors
- [ ] Endpoints protected by Supabase Auth; user-scoped access
- [ ] File APIs support read/write within user scope with traversal prevention

## Implementation Plan

### Phase 1: Schema, Types, and Storage Helpers
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

- [ ] **Create** **spaces/storage.ts** - User-safe storage helpers (Supabase Storage)
  - **Files**: `src/app/lib/spaces/storage.ts`
  - **Dependencies**: Supabase server client; bucket `spaces`
  - **Validation**: Resolves `users/{userId}/Spaces/{spaceName}` prefixes; prevents traversal and cross-user access
  - **Context**: All file IO goes through these helpers

### Phase 2: Core Operations (Server Module)
**Goal**: Implement unified list/read/validate/ensure semantics with `type` mandatory at creation.

- [ ] **Add** **spaces/core.ts** - Core Space operations
  - **Files**: `src/app/lib/spaces/core.ts`
  - **Dependencies**: `storage.ts`, `types.ts`, `ajv` (or `jsonschema`)
  - **Validation**: Functions return typed results, never throw on user errors (structured errors instead)
  - **Context**: Headless library consumed by route handlers and Realtime

- [ ] **Implement** `listSpacesForUser(userId)`
  - **Files**: `src/app/lib/spaces/core.ts`
  - **Dependencies**: `storage.listSpaces`, schema validation, presence of `index.md` and `manifest.json`; `type` read from manifest; if missing, infer by presence of `concepts/`
  - **Validation**: Returns `SpaceSummary[]` with `type` and timestamps; excludes invalids
  - **Context**: Unified list for both types

- [ ] **Implement** `readManifest(userId, spaceName)`
  - **Validation**: Reads and parses manifest; returns `SpaceManifest`
  - **Context**: Used by UI and diagnostics

- [ ] **Implement** `validateManifest(manifest)`
  - **Validation**: Returns `{ valid, errors[] }` with stable codes/messages
  - **Context**: Used by list and creation flows

- [ ] **Implement** `ensureSpace(userId, { name, type, description? })`
  - **Validation**: Normalizes name; creates if missing (writes manifest with mandatory `type` + stub index); returns 409 if exists with different `type`
  - **Context**: Idempotent creation for both types; UI remains read-only but API supports writes now

### Phase 3: API Endpoints (Route Handlers)
**Goal**: Expose unified REST endpoints (auth required) for Spaces and Files.

- [ ] **Create** **GET /api/spaces** (authenticated)
  - **Files**: `src/app/api/spaces/route.ts` (GET)
  - **Dependencies**: Supabase session; `listSpacesForUser`
  - **Validation**: 200 with `{ spaces }`; 401 when unauthenticated
  - **Context**: Unified listing for UI and Realtime

- [ ] **POST /api/spaces/ensure** (authenticated)
  - **Files**: `src/app/api/spaces/ensure/route.ts`
  - **Dependencies**: Supabase session; `ensureSpace`
  - **Validation**: 201 on create, 200 on exists; 409 on cross-type conflict; 400 on invalid name
  - **Context**: Idempotent creation for both types

- [ ] **GET /api/spaces/:name/manifest** (authenticated)
  - **Files**: `src/app/api/spaces/[name]/manifest/route.ts`
  - **Dependencies**: Supabase session; `readManifest`
  - **Validation**: 200 with `{ manifest }`; 404 when space not found
  - **Context**: Diagnostics and UI detail

- [ ] **GET /api/spaces/:name/index** (authenticated)
  - **Files**: `src/app/api/spaces/[name]/index/route.ts`
  - **Dependencies**: Supabase session; storage helper to read `index.md`
  - **Validation**: 200 text/markdown; 404 when missing
  - **Context**: Used by Index renderer

- [ ] **Files API (authenticated)**
  - **Files**: `src/app/api/spaces/[name]/files/route.ts` (GET list, POST create); `src/app/api/spaces/[name]/files/[...path]/route.ts` (GET/PUT/DELETE)
  - **Dependencies**: Supabase session; storage helpers
  - **Validation**: Read/write confined to `users/{userId}/Spaces/{name}`; 400 on invalid path; 403 if outside scope
  - **Context**: Write-capable APIs available now (for Realtime later)

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
// Supabase Storage bucket and user root prefix
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'spaces';
// Prefix convention: users/{userId}/Spaces/{spaceName}
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
- [ ] Unified listing returns both types and excludes invalid manifests (requires `index.md`)
- [ ] Ensure writes valid manifest with `type` + stub index; idempotent; 409 on cross-type
- [ ] Validation returns structured errors
- [ ] /api/(spaces|files) endpoints return 401 when unauthenticated
- [ ] Files API confines to `users/{userId}/Spaces/{name}`; rejects traversal

### New Tests Required
- [ ] **Unit**: Storage path resolution and traversal prevention
- [ ] **Unit**: Manifest validation rules
- [ ] **Integration**: Unified list/ensure/read flows with sample user storage
- [ ] **Integration**: Auth gating for /api/(spaces|files) (401 vs 200/201)
- [ ] **Integration**: Files API read/write confinement and MIME handling

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


