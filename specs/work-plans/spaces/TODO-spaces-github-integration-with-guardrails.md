## Executive Summary & Scope

**Objective**: Add a secure GitHub integration so users can import Markdown from selected repo paths into a Space, edit locally, and commit back via direct commits or PRs, with strict guardrails for large repos and conflict safety.

**Impact**: Enables curated spec collaboration with GitHub while preserving per-user RLS in Supabase Storage and avoiding accidental import of non-spec code or large binaries. Improves workflow by focusing on `.md/.mdx/.json/.mermaid` content and PR-first flows when branch protection is present.

**Approach**: Introduce a GitHub App–based server-side integration. Provide endpoints to discover installations/repos, list a constrained subtree for spec files, import selected files into Space storage, and commit changes back using stored `last_sha` for conflict detection. Enforce guardrails: required prefix selection, file-type/size filters, batch caps, and PR-first in protected branches.

## Scope & Constraints

### In Scope
- [ ] GitHub App server integration (JWT → installation access token; server-only)
- [ ] Endpoints to: list installations, repos, constrained directory tree, import, and commit/PR
- [ ] Storage mapping and link metadata tracking (Supabase table)
- [ ] Guardrails: prefix required, file filters, size and batch caps, conflict-safe commits
- [ ] Minimal UI stubs in Spaces panel for Connect, Import, Commit dialogs
- [ ] Tests (unit/integration) and basic docs

### Out of Scope
- [ ] Full two-way sync or webhooks (may be Phase 3+)
- [ ] Automatic conflict resolution or diff UI (manual guidance only initially)
- [ ] Non-GitHub providers

### Success Criteria
- [ ] Users can connect a GitHub installation and browse/select a repo subtree (specs/docs only)
- [ ] Import writes selected Markdown to Space under per-user prefix; non-spec files rejected
- [ ] Commit back updates the exact mapped paths with `sha` preconditions; conflicts surfaced as 409 with clear options
- [ ] Default PR flow when branch protections exist; direct commit only if allowed
- [ ] Guardrails enforced (caps, filters, prefix) and clearly communicated in UI

## Implementation Plan

### Phase 1: Foundations — App Auth, Types, Config
**Goal**: Establish GitHub App auth and core types with server-only token handling.

- [ ] **Create** **GitHub App auth module** - Build App JWT and fetch installation token
  - **Files**: `src/app/lib/github/appAuth.ts`, `src/app/lib/github/types.ts`
  - **Dependencies**: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_BASE64`
  - **Validation**: Can mint a short-lived JWT and exchange for installation token (mock or test repo)
  - **Context**: Tokens stay on server; no client exposure

- [ ] **Create** **GitHub API client** - Minimal REST helpers (installations, repos, contents, trees, commits, PRs)
  - **Files**: `src/app/lib/github/api.ts`
  - **Validation**: Handles rate limit headers and 409/422 error decoding
  - **Context**: Shared by route handlers

- [ ] **Add** **Env config** - Document vars & safe defaults
  - **Files**: `specs/architecture/application-components.md` (append), `.env.example` (if present)
  - **Validation**: Local dev can set required vars without leaking secrets

### Phase 2: Data Model — Link Metadata (Supabase)
**Goal**: Track repo mapping and last known `sha` for conflict-safe updates.

- [ ] **Create** **github_links table** - Per-user, per-space, per-file mapping
  - **Files**: `supabase/sql/2025xxxx_github_integration.sql`
  - **Validation**: Enforces uniqueness `(user_id, space_name, storage_path)`; references `auth.users`
  - **Context**: Stores `repo_full_name`, `branch`, `repo_path`, `last_sha`

```sql
create table github_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_name text not null,
  storage_path text not null,
  repo_full_name text not null,
  branch text not null,
  repo_path text not null,
  last_sha text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, space_name, storage_path)
);
```

### Phase 3: API — Discovery & Listing with Guardrails
**Goal**: Server endpoints to browse only relevant parts of large repos without recursion blast.

- [ ] **Add** `GET /api/github/installations` - List user installations
  - **Files**: `src/app/api/github/installations/route.ts`
  - **Validation**: 200 with installations user can access; 401 when unauthenticated

- [ ] **Add** `GET /api/github/repos?installationId=` - List repos for an installation
  - **Files**: `src/app/api/github/repos/route.ts`
  - **Validation**: 200 list; paginate; respect rate limits

- [ ] **Add** `GET /api/github/tree?repo=&ref=&path=` - Constrained subtree listing
  - **Files**: `src/app/api/github/tree/route.ts`
  - **Guardrails**: Require `path` prefix; filter to extensions: `.md`, `.mdx`, `.json`, `.mermaid`; skip size > 1 MB; cap total results (e.g. 2000)
  - **Validation**: Returns shallow children; expand-on-demand model (no full repo recursion)

### Phase 4: API — Import
**Goal**: Import selected files into Space storage and persist link mappings.

- [ ] **Add** `POST /api/github/import` - Body `{ spaceName, repo, ref, path, include[], prefix? }`
  - **Files**: `src/app/api/github/import/route.ts`
  - **Guardrails**: Require prefix selection (repo path); enforce filters and caps; skip LFS pointers and binaries
  - **Behavior**: Fetch selected files, write to Supabase Storage under `resolveSpacePrefix(user, space)/[prefix/]{repo-relative}` with `Content-Type` inferred; create/update `github_links` rows with `last_sha`
  - **Validation**: 200 with summary `{ imported, skipped, reasons[] }`; errors surfaced with JSON envelope

### Phase 5: API — Commit and PR
**Goal**: Commit modified files back with conflict detection; prefer PR when protections exist.

- [ ] **Add** `POST /api/github/commit` - Body `{ spaceName, paths[], message, targetBranch?, createPr? }`
  - **Files**: `src/app/api/github/commit/route.ts`
  - **Guardrails**: Look up mappings; require `last_sha`; if branch protection detected or `createPr`, create branch `spaces/{space}/{timestamp}` and commit there; open PR to `targetBranch`
  - **Conflict Handling**: On 409, return details and suggest “Pull latest into _upstream/” or PR flow
  - **Validation**: 200 with `{ committed[], conflicted[], prUrl? }`

### Phase 6: UI — Minimal Controls in Spaces Panel
**Goal**: Provide basic user flows to connect, import, and commit with visible guardrails.

- [ ] **Add** GitHub menu to `SpacesFilesPanel` header (Connect, Import…, Commit…)
  - **Files**: `src/app/components/SpacesFilesPanel.tsx` (+ small dialog components under `components/github/`)
  - **Import Dialog**: Installation → Repo → Branch → Required Prefix (folder) → Preview filtered files → Import
  - **Commit Dialog**: Choose changed files in Space → message → PR toggle; show conflicts if any
  - **Validation**: UI prevents repo-root imports; shows caps/filters and progress

### Phase 7: Tests & Docs
**Goal**: Ensure correctness and safety.

- [ ] **Unit Tests**: App auth token creation; API request builder; guardrail filters
  - **Files**: `tests/github/app-auth.unit.test.ts`, `tests/github/filters.unit.test.ts`
  - **Validation**: Deterministic JWT structure; filter accepts/denies per rules

- [ ] **Integration Tests**: Import and commit flows (against test repo or mocked transport)
  - **Files**: `tests/github/import.integration.test.ts`, `tests/github/commit.integration.test.ts`
  - **Validation**: Writes to Storage; creates `github_links`; PUT with prior `sha`; handles 409

- [ ] **Docs**: Update architecture with GitHub component and env vars
  - **Files**: `specs/architecture/application-components.md`
  - **Validation**: Variables and flows documented consistently

## Technical Architecture

### Database Changes
```sql
-- See Phase 2 for full table DDL
```

### Service Interfaces (purpose-only signatures)
```ts
// src/app/lib/github/appAuth.ts
export async function createAppJwt(): Promise<string>;      // Build GitHub App JWT
export async function getInstallationToken(installationId: string): Promise<string>;

// src/app/lib/github/api.ts
export async function listInstallations(): Promise<any[]>;  // Minimal shapes
export async function listRepos(installationId: string, page?: number): Promise<any[]>;
export async function listTree(repo: string, ref: string, path: string): Promise<{ files: Array<{ path: string; size: number; type: 'file'|'dir' }> }>;
export async function getFile(repo: string, ref: string, path: string): Promise<{ content: ArrayBuffer; sha: string; contentType?: string }>;
export async function putFile(params: { repo: string; branch: string; path: string; message: string; contentBase64: string; sha?: string }): Promise<{ sha: string }>;
export async function createPr(params: { repo: string; fromBranch: string; toBranch: string; title: string; body?: string }): Promise<{ url: string }>;
```

### Configuration Updates
```bash
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_BASE64=
# Optional future: webhooks
GITHUB_APP_WEBHOOK_SECRET=
```

### Guardrails (enforced server-side and reflected in UI)
- Required repo path prefix (no repo-root imports)
- Allowlist extensions: `.md`, `.mdx`, `.json`, `.mermaid`
- Max file size 1 MB; skip Git LFS pointer files and binaries
- Cap total listed/imported files per batch (e.g., 2,000)
- Expand-on-demand subtree listing; no global recursive traversal
- Conflict-safe commits with stored `last_sha`; PR-first when protections exist

## Testing Strategy Integration

### Tests That Must Pass for Completion
- [ ] Existing Spaces Files API tests remain green: list/read/write under RLS
- [ ] Path safety and content-type behavior unchanged for non-GitHub flows

### New Tests Required
- [ ] **Unit**: JWT creation, rate-limit/backoff utility, file filter rules
- [ ] **Integration**: Import writes to Storage; `github_links` rows created; commit succeeds with prior `sha`; conflict path returns 409 payload
- [ ] **E2E (optional later)**: Connect → Import → Edit → Commit PR happy path

### Test Documentation Updates
- [ ] Update `specs/product/example-domain/tests.md` with GitHub integration coverage and commands

## Risk Assessment & Dependencies

### High Risk: Large Repos & Rate Limits
- **Risk**: Tree traversal explodes requests; API quotas exceeded
- **Mitigation**: Prefix-required listing, filtered shallow navigation, batch caps, caching, backoff
- **Contingency**: Defer import; instruct narrower prefix; job-queue backgrounding later

### High Risk: Conflicts & Branch Protection
- **Risk**: Stale `sha` (409); direct pushes blocked
- **Mitigation**: Store `last_sha`; surface 409 with clear actions; PR-first when protected
- **Contingency**: Always allow PR path; guide manual merge

### High Risk: Content Leakage
- **Risk**: Importing non-spec files or large binaries
- **Mitigation**: Extension/size allowlist; LFS detection; explicit prefix selection
- **Contingency**: Skip with warnings; require explicit user override in future phases

### Dependencies & Integration Points
- [ ] Supabase Auth + Storage (RLS, `resolveSpacePrefix`)
- [ ] Environment configuration for GitHub App
- [ ] UI: `SpacesFilesPanel` for controls and dialogs

## Discussion & Decision Context

### Key Discussion Points
- GitHub App chosen for least-privilege, server-only tokens; OAuth personal tokens deferred
- Guardrails prioritized to manage giant repos and avoid non-spec content
- PR-first model to respect org policies and protections

### Alternatives Considered
- OAuth app with repo scope — simpler user setup but broader permissions and token exposure → rejected for now
- Full recursive import — easy UX but unsafe at scale → rejected; use prefix+filters

### Future Considerations
- Webhook-based sync for upstream changes; background jobs for long-running imports
- Basic diff/merge UI and link rewriting for images and relative paths

## Timeline & Deliverables

### Week 1: Foundations + Discovery API
- [ ] App auth + minimal API client
- [ ] Installations/Repos/Tree endpoints with guardrails

### Week 2: Import + Commit
- [ ] Import endpoint and `github_links` table
- [ ] Commit/PR endpoint with conflict surfacing

### Week 3: UI + Tests + Docs
- [ ] Minimal UI dialogs wired into Spaces panel
- [ ] Unit + integration tests passing
- [ ] Architecture doc updates (env vars + flows)

## Final Completion Criteria
- [ ] Guardrails enforced end-to-end (prefix, filters, caps, PR-first)
- [ ] Import and commit/PR flows work against a test repo
- [ ] Conflicts surfaced with actionable guidance; no silent overwrites
- [ ] All tests (existing + new) pass; docs updated


