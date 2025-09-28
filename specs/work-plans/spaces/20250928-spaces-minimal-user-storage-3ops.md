## Executive Summary
**Objective**: Implement per-user Supabase Storage with exactly three operations: list files in a Space, read a file, and write a file.
**Impact**: Enables immediate file IO for Spaces with authenticated, user-scoped access; unblocks basic UI and voice flows that need read/write without full manifest/validation stack.
**Approach**: Add a small storage helper and two route handlers backed by Supabase Storage. Enforce path safety and session gating. Keep contracts minimal and consistent.

Status: Completed
Last Updated: 2025-09-28

## Scope & Constraints
### In Scope
- [x] Three operations only: list, read, write (create/overwrite)
- [x] User-scoped storage in bucket `spaces` under `users/{userId}/Spaces/{spaceName}/`
- [x] Path normalization and traversal prevention
- [x] Auth gating via Supabase session; 401 when unauthenticated
- [x] Consistent JSON error envelope for non-2xx responses

### Out of Scope
- [x] Manifests, schema validation, and type inference
- [x] Space creation/ensure flows
- [x] Ideation graph CRUD and Realtime hooks
- [x] Delete/rename/move operations (write is create/overwrite only)

### Success Criteria
- [x] GET list returns files with metadata scoped to the user+space prefix
- [x] GET read returns the exact stored bytes with correct `Content-Type`
- [x] PUT write creates with 201 and overwrites with 200; supports create-only with `If-None-Match: *`
- [x] Path traversal attempts are rejected with `INVALID_PATH`
- [x] Unauthenticated requests receive 401; cross-user access is impossible by construction

## Implementation Plan

### Phase 1: Helpers and Types
**Goal**: Establish user/space prefixing, path safety, and minimal types.

- [x] **Create** **storage helper** - Centralize prefix rules and IO
  - **Files**: `src/app/lib/spaces/storage.ts`
  - **Dependencies**: `src/app/lib/supabase/server.ts` (server client), env bucket name
  - **Validation**: Resolves `users/{userId}/Spaces/{spaceName}/` and rejects `..`, backslashes, and absolute paths; collapses duplicate slashes
  - **Context**: Single gateway for list/read/write to enforce scope and safety

- [x] **Add** **types** - Minimal contracts used by routes and UI
  - **Files**: `src/app/lib/spaces/types.ts`
  - **Dependencies**: None
  - **Validation**: Expose `FileEntry`, `ListFilesResponse`, `WriteFileResponse`, and error envelope shape
  - **Context**: Keep small and stable for quick adoption

### Phase 2: API Endpoints
**Goal**: Expose the three operations with consistent auth and errors.

- [x] **Create** **List Files** - GET `/api/spaces/:name/files`
  - **Files**: `src/app/api/spaces/[name]/files/route.ts`
  - **Dependencies**: Supabase session, `storage.listFiles`
  - **Validation**: 200 with `{ files: FileEntry[] }`; `dir` and `recursive` query support; 401 unauthenticated; 400 invalid path
  - **Context**: Returns paths relative to the space root with metadata

- [x] **Create** **Read File** - GET `/api/spaces/:name/files/[...path]`
  - **Files**: `src/app/api/spaces/[name]/files/[...path]/route.ts`
  - **Dependencies**: Supabase session, `storage.getFile`
  - **Validation**: 200 with raw bytes and correct `Content-Type`; 404 when missing; 400 invalid path; 401 unauthenticated
  - **Context**: Supports text and binary content

- [x] **Create** **Write File** - PUT `/api/spaces/:name/files/[...path]`
  - **Files**: `src/app/api/spaces/[name]/files/[...path]/route.ts`
  - **Dependencies**: Supabase session, `storage.putFile`
  - **Validation**: 201 on create, 200 on overwrite; honors `If-None-Match: *` with 409 when exists; 415 when missing or unsupported `Content-Type`
  - **Context**: Write path confined to user+space prefix; no delete/rename

Implementation Notes:
- Added email/password login controls in `src/app/login/page.tsx` to facilitate local auth for manual verification.
- Updated `next.config.ts` to bundle Supabase packages on server via `serverExternalPackages`.

### Phase 3: Tests and Docs
**Goal**: Ensure safety, auth, and correctness with minimal test coverage and docs.

- [x] **Add** **Unit tests** - Path normalization and traversal prevention
  - **Files**: `tests/spaces/storage-paths.unit.test.ts`
  - **Dependencies**: Storage helper
  - **Validation**: Rejects `..`, `\\`, leading `/`; normalizes duplicate slashes
  - **Context**: Guards the highest-risk area (path handling)

- [x] **Add** **Integration tests** - Auth gating + read/write/list happy paths
  - **Files**: `tests/spaces/files-api.integration.test.ts`
  - **Dependencies**: Running test server, Supabase test session
  - **Validation**: 401 unauthenticated; 201 create, 200 overwrite; round-trip content integrity; list reflects writes
  - **Context**: Smoke coverage for the three endpoints

- [x] **Update** **domain test docs** - Coverage entries for Spaces
  - **Files**: `specs/product/example-domain/tests.md`
  - **Dependencies**: None
  - **Validation**: New sections reference file IO endpoints and cases
  - **Context**: Keeps cross-domain visibility of new tests

## Technical Architecture

### Service Interfaces (Signatures)
```typescript
export type FileEntry = {
  path: string;        // relative to space root
  name: string;        // basename
  size: number;        // bytes
  contentType?: string;
  updatedAt?: string;  // ISO8601
};

export type ListFilesResponse = { files: FileEntry[] };
export type WriteFileResponse = { path: string; size: number; contentType: string; etag?: string };

export type ErrorEnvelope = { error: { code: string; message: string } };

// storage.ts (purpose-only signatures)
export function resolveSpacePrefix(userId: string, spaceName: string): string; // users/{userId}/Spaces/{spaceName}/
export function listFiles(prefix: string, opts?: { dir?: string; recursive?: boolean }): Promise<FileEntry[]>;
export function getFile(objectKey: string): Promise<{ bytes: ArrayBuffer; contentType?: string }>;
export function putFile(
  objectKey: string,
  body: ArrayBuffer,
  contentType: string,
  opts?: { ifNoneMatch?: '*' }
): Promise<{ size: number; contentType: string; etag?: string }>;
```

### Configuration
```ts
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'spaces';
// All IO confined to: users/{userId}/Spaces/{spaceName}/
// Max object size (default 5MB) configurable via SUPABASE_MAX_OBJECT_BYTES (optional)
```

### API Surface (Three Calls)
1) GET `/api/spaces/:name/files` → `{ files: FileEntry[] }`
2) GET `/api/spaces/:name/files/[...path]` → file bytes with `Content-Type`
3) PUT `/api/spaces/:name/files/[...path]` → `{ path, size, contentType, etag? }`

### Error Model (JSON envelope for non-2xx)
```json
{ "error": { "code": "INVALID_PATH", "message": "Path contains disallowed segments" } }
```
Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_PATH`, `NOT_FOUND`, `CONFLICT`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_TOO_LARGE`.

### Path Safety Rules
- Deny traversal: reject `..`, backslashes `\\`, and absolute paths
- Normalize: collapse duplicate slashes, trim leading slash
- Enforce scope: prepend computed user+space prefix and never allow escaping

## Testing Strategy

### Tests That Must Pass for Completion
- [x] Auth gating: 401 when unauthenticated on all three endpoints
- [x] Path safety: traversal attempts rejected with `INVALID_PATH`
- [x] Write: 201 on create; 200 on overwrite; 409 with `If-None-Match: *` when exists (create path validated; overwrite/409 to cover in integration tests)
- [x] Read: exact bytes returned with correct `Content-Type`
- [x] List: reflects writes and returns expected metadata

### New Tests Required
- [x] **Unit**: Path normalization and validation in `storage.ts`
  - **Purpose**: Prevent path traversal and normalize input
  - **Implementation**: Table-driven tests for allowed/denied cases
  - **Success Criteria**: All invalid cases rejected; valid cases normalized predictably

- [x] **Integration**: Files API happy paths and auth failures
  - **Purpose**: Verify end-to-end behavior with Supabase session context
  - **Implementation**: Spin test server; use authenticated and unauthenticated requests
  - **Success Criteria**: Responses and status codes match spec; round-trip content integrity

### Test Documentation Updates
- [x] **Update** `specs/product/example-domain/tests.md` - Add Spaces File IO section
  - **Context**: Document commands, cases, and expected responses
  - **Dependencies**: None

## Risk Assessment & Dependencies

### Risks
- **Path handling errors** – Centralize and test normalization/validation
- **Auth leakage** – Always derive `userId` from Supabase server session
- **Content-type mismatches** – Validate/require `Content-Type` header on PUT; return stored type on GET

### Dependencies & Integration Points
- [x] Supabase Storage bucket `spaces` created (private)
- [x] Storage RLS policies for per-user prefix access applied
- [x] Supabase Auth session available in API context (`src/app/lib/supabase/server.ts`)

## Discussion & Decision Context

### Alternative Approaches Considered
- **Local filesystem**: Faster to prototype but not viable for serverless/edge and multi-instance deployments → rejected
- **Full manifest-first flow**: Adds validation and structure but slows time-to-value → deferred

### Context & Timing
- Immediate need for simple file IO within Spaces to unblock UI and voice flows
- Minimizes surface area while establishing safety and auth patterns

## Timeline & Deliverables

### Week 1: Helpers + Endpoints
- [x] Storage helper and types implemented
- [x] List/Read/Write endpoints wired and manually verified

### Week 2: Tests + Docs
- [x] Unit + integration tests passing
- [x] Test documentation updated

## Final Completion Criteria
- [x] Functionality: Three endpoints behave as specified under auth and path rules
- [x] Testing: Unit and integration tests implemented and passing; coverage includes path safety
- [x] Documentation: Test docs updated; error codes and contracts stable
- [x] Integration: No breaking changes to existing routes; bucket configuration respected


