## Executive Summary & Scope

**Objective**: Introduce explicit Space creation and manifest metadata to enable recency sorting and future initialization data. Ensure agents can list Spaces and require selecting/creating a Space at conversation start.

**Impact**: Faster, reliable Space discovery ordered by activity; groundwork for richer Space metadata (titles, tags) and bootstrap content. Improves agent UX by enforcing Space selection.

**Approach**: 
- Add POST `/api/spaces` to create a Space by writing `manifest.json` under `users/{userId}/Spaces/{name}/`.
- Update GET `/api/spaces` to include `{ name, lastUpdatedAt }` sourced from the manifest; sort by `lastUpdatedAt` desc. Fallback to computing from files once if manifest is missing, then persist it.
- Update file write route to bump `manifest.json.last_updated_at` after successful writes.
- Add agent tool `list_space_names` returning names + recency; update supervisor prompt to require Space choice at kickoff.

## Implementation Phases

### Phase 1: API - Create Space (POST /api/spaces)
- [ ] **Create** `src/app/api/spaces/route.ts` POST handler
  - Validate auth and body `{ name }` using `normalizeSegment(name)`
  - Idempotent: if `manifest.json` exists, 200 `{ created: false }`; else 201 `{ created: true }`
  - Write `manifest.json` with `{ version: 1, name, created_at: now, last_updated_at: now }`
  - Content-Type `application/json; charset=utf-8`
  - Tests: unit + integration (auth required; invalid name; idempotency)

### Phase 2: API - List Spaces with Recency (GET /api/spaces)
- [ ] **Update** GET to return `[{ name, lastUpdatedAt }]` sorted desc
- [ ] **Read** each space's `manifest.json`; if missing, compute max file `updated_at` recursively
- [ ] **Persist** missing manifest with `{ created_at, last_updated_at }` where `created_at` is now or earliest file time if derivable
- [ ] **Limit** recursion depth and total spaces to avoid performance issues; paginate if needed later
- [ ] Tests: unit (sorting, missing manifest fallback), integration (401 handling)

### Phase 3: API - Bump Manifest on File Writes
- [ ] **Update** `PUT /api/spaces/[name]/files/[...path]` success path to bump manifest `last_updated_at = now`
- [ ] **Best-effort**: do not fail the original write if manifest update fails; log error
- [ ] Tests: ensure `last_updated_at` changes after a write

### Phase 4: Client & Agent Tools
- [ ] **Add** `listSpaces()` in `src/app/lib/spaces/client.ts` → GET `/api/spaces` → `{ spaces: [{ name, lastUpdatedAt }] }`
- [ ] **Add** agent tool `list_space_names` returning same payload
- [ ] **Update** supervisor prompt to require kickoff Space selection:
  - Always call `list_space_names` first
  - If any exist: ask the user to choose existing or name a new one
  - If none: ask for new Space name (suggest `ideas`)
  - If new: call create-space endpoint; then proceed

### Phase 5: Documentation & DX
- [ ] **Add** ADR for Space manifests and recency strategy
- [ ] **Update** `specs/architecture/application-components.md` with Space manifest component and flow
- [ ] **Document** agent tool contract and prompt changes in `specs/product/...` as appropriate

## Technical Architecture

- **Storage layout**: `users/{userId}/Spaces/{name}/manifest.json` + files
- **Manifest schema (v1)**:
  ```json
  { "version": 1, "name": "<space>", "created_at": "<ISO>", "last_updated_at": "<ISO>" }
  ```
- **Create Space**: write `manifest.json` (no empty directory in Supabase; manifest asserts existence)
- **List Spaces**: list top-level prefixes; read manifest per prefix; sort
- **Bump on write**: after file upload `upsert: true`, overwrite manifest with new `last_updated_at`
- **Auth**: Supabase session required; RLS scoped to `users/{userId}` prefix

## Testing Strategy Integration

- Unit tests:
  - Create Space: validation, idempotency
  - List Spaces: sorting, fallback behavior
  - Write bump: manifest timestamp updated
- Integration tests:
  - Auth enforcement (401 on unauthenticated)
  - End-to-end: create → list → write → list (recency changes)
- Performance tests (basic): ensure listing remains responsive with N=50 spaces

## Risk Assessment & Dependencies

- **Risks**:
  - Extra storage reads on list (one per space); acceptable for small N
  - Race conditions on manifest bump; last-writer-wins acceptable
  - Missing manifest in legacy spaces; handled with fallback and one-time write
- **Dependencies**:
  - Supabase Storage availability and RLS configuration
  - Existing auth/session middleware

## Discussion & Decision Context

- We prefer a storage-backed manifest to avoid recursive scans and to prepare for richer metadata (titles, tags, templates). A DB table could be added later if cross-object transactional semantics are needed.

## Completion Criteria & Timeline

- [ ] POST `/api/spaces` creates `manifest.json` with correct schema and idempotency
- [ ] GET `/api/spaces` returns `{ spaces: [{ name, lastUpdatedAt }] }` sorted desc; fills missing manifests
- [ ] PUT write bumps manifest `last_updated_at`
- [ ] Agent tool and prompt flow enforce Space selection at start
- [ ] Tests green (unit + integration)
- [ ] Documentation updated (ADR + architecture)


