# WIP-unified-mcp-server

## Executive Summary & Scope
**Objective**: Provide a single MCP server that unifies filesystem, editor, Spaces, Prompts/Resources/Templates, and Ideation so Claude (and Inspector) can discover and use one coherent surface.

**Impact**: Simplifies configuration (one connection), standardizes discovery (one tools/prompts/resources list), enables cross-feature workflows (e.g., create Space → edit files → ideate) without switching servers.

**In Scope**:
- One MCP server exposing: `fs.*`, `editor.*`, `spaces.*`, `prompts/*`, `resources/*`, `resources/templates/*`, `ideation.*`.
- Streamable HTTP transport at `/mcp` behind OAuth 2.1 (Doorkeeper/JWKS).
- MCP Inspector and Claude flows via Cloudflare origin.

**Out of Scope**:
- Removing/altering existing REST endpoints used by the Rails UI.
- UI changes.

---

## Technical Architecture
- **Transport**: Streamable HTTP MCP server mounted at `/mcp` (same protected origin). No redirects on POST; handle `/mcp` paths directly.
- **Auth**: RS256 via JWKS. Audience MUST equal `<origin>/mcp`. Issuer equals Rails origin.
  - Dev-only fallback: HS256 when `JWT_SECRET` is set and JWKS fails (not in prod).
- **Namespacing**: Keep existing tool names/arg contracts for parity.
- **Adapters vs Inline**:
  - Phase 1: Adapter tools to existing filesystem and text-editor MCP servers (preserve behavior, faster time-to-value).
  - Phase 4 (optional): Inline fs/editor for fewer moving parts and simpler ops.
- **Prompts/Resources**: Published by this server (not static files) to be discoverable via `prompts/list`, `resources/list`, `resources/templates/list`.

### Tool Surface (single server)
- `fs.*`: read_text_file, read_media_file, read_multiple_files, write_file, edit_file, create_directory, list_directory, list_directory_with_sizes, directory_tree, move_file, search_files, get_file_info, list_allowed_directories.
- `editor.*`: get_text_file_contents, edit_text_file_contents.
- `spaces.*`: list_file_spaces, list_ideation_spaces, create_file_space, read_manifest, validate_manifest.
- `prompts/*`: list, get (`start-ideation-session`, `file-mode-ops`, `ideation-mode-ops`).
- `resources/*`: list, get; `resources/templates/*`: list, get.
- `ideation.*`: ensure_space, upsert_concept, add_relation, regenerate_index, generate_mermaid.

### Configuration (local & Cloudflare)
- Container: `cm-mcp` on network `cm-net`; Rails DB via `cm-pg`.
- Env (local):
  - `MCP_CANONICAL_AUDIENCE=http://localhost:10000/mcp`
  - `JWT_ISSUER=http://localhost:10000`
  - `JWKS_URL=http://localhost:10000/.well-known/jwks.json`
- Env (Cloudflare):
  - `MCP_CANONICAL_AUDIENCE=https://$CF_HOST/mcp`
  - `JWT_ISSUER=https://$CF_HOST`
  - `JWKS_URL=https://$CF_HOST/.well-known/jwks.json`
- Dev-only: `JWT_SECRET=<random>` enables HS256 fallback if JWKS fails.

---

## Implementation Plan

### Phase 0: Contracts & ADR
- [ ] **Freeze** tool names and argument schemas across namespaces (`fs`, `editor`, `spaces`, `ideation`, `prompts`, `resources`).
- [ ] **ADR**: Unify MCP surfaces into a single server; audience `/mcp`; risks, rollbacks, and migration notes.

### Phase 1: Tracer bullet and read-only foundations
#### Step 1: Connection + Auth tracer bullet
- [ ] **Create** minimal MCP skeleton at `/mcp` supporting `initialize`, `tools/list`, and a single tool `health.ping` → `{ ok: true }`.
- [ ] **Wire** Nginx route for `/mcp` (no redirects) and `auth_request` to `/_auth`.
- [ ] **Enforce Auth**: RS256 via JWKS; `aud==<origin>/mcp`, `iss==Rails origin` (HS256 dev fallback only when `JWT_SECRET` is set).
- [ ] **Docs**: Update `mcp-auth.md` with tracer-bullet setup and audience path requirement.
  - Tests:
    - Inspector connects and calls `health.ping` successfully.
    - Claude (via CF) connects and calls `health.ping` successfully.
    - `/_auth` returns 204 for valid token; invalid token yields 401; no redirect loops.
  - Acceptance:
    - Claude and Inspector stable for 10 consecutive calls; correct `aud` observed.

#### Step 2: Prompts/Resources skeleton (trivial)
- [ ] **Add** `prompts.list` / `resources.list` with a single trivial item each; `get` returns simple static content.
  - Tests:
    - Inspector and Claude enumerate and fetch both items.
  - Acceptance:
    - Both clients display and retrieve items with no auth regressions.

#### Step 3: Filesystem (read-only, adapter)
- [ ] **Add** `fs.list_allowed_directories`, `fs.get_file_info`, `fs.read_text_file` via adapters.
- [ ] **Clamp** to the global dev root only (read-only; no writes yet).
  - Tests:
    - Inspector and Claude list and read a known file under `./data`.
  - Acceptance:
    - Stable reads across both clients.

#### Step 4: Editor (read-only)
- [ ] **Add** `editor.get_text_file_contents` (no edits yet).
  - Tests:
    - Inspector and Claude fetch file contents that match `fs.read_text_file`.
  - Acceptance:
    - Parity between fs/editor reads.

#### Step 5: Spaces (read-only discovery)
- [ ] **Implement** `spaces.list_file_spaces` and `spaces.list_ideation_spaces` using current gateway logic (path normalization, schema validation; invalid manifests excluded).
  - Tests:
    - Inspector and Claude list spaces from `./data`; validation errors surface as errors (not hidden).
  - Acceptance:
    - Lists match expected directory state and schema.

### Phase 2: Per-User Data Scoping (before any writes)
- [ ] **Resolve userId per request**
  - Prefer `sub`; fallback to `uid`/`resource_owner_id`; if needed, introspect `/oauth/token/info`.
  - On success set `request.state.user_id` and `request.state.user_root=/data/{userId}`; 401 if missing.
- [ ] **Path mapping & clamping**
  - Make `_virtual_to_physical` / `_physical_to_virtual` read `user_root` instead of global root.
  - Clamp all paths to `user_root`; reject or clamp escapes.
- [ ] **Scope Spaces/Ideation to user_root**
  - Compute `SPACES_ROOT={user_root}/Spaces` per request.
  - Update `_find_file_spaces`, `spaces.create_file_space`, `_ensure_space_dirs`, index/mermaid generators.
- [ ] **Scope resources/templates to user_root**
  - Resolve `space://{name}/manifest` and `space-index://{name}` within `user_root`.
- [ ] **FS/Editor confinement**
  - `list_allowed_directories` returns only `user_root`.
  - Adapters remain unchanged; path mapping enforces confinement.
- [ ] **MCP entrypoint guard**
  - After this step, `/mcp` handlers require resolved `user_root` before `initialize`, `tools/*`, `resources/*`, `prompts/*`.
- [ ] **Minimal tests/docs**
  - Two-token isolation (A cannot read/write B).
  - Space creation appears under `user_root` and is discoverable only for that user.
  - Add short scoping note to `specs/architecture/mcp-auth.md`.

### Phase 3: Writes enabled (fs/editor + spaces create)
#### Step 7: Filesystem + Editor writes
- [ ] **Add** `fs.write_file`, `fs.edit_file`, and `editor.edit_text_file_contents` (mutations confined to `user_root`).
  - Tests:
    - Writes land under `user_root` and are readable by the same token; forbidden outside.
  - Acceptance:
    - Edits succeed; isolation preserved.

#### Step 8: Spaces create (file spaces)
- [ ] **Implement** `spaces.create_file_space` writing `manifest.json` + `index.md` under `user_root`.
  - Tests:
    - Create → list → read manifest; visible only to the same token.
  - Acceptance:
    - Idempotency on re-create; schema valid.

### Phase 4: Prompts/Resources full registry
- [ ] **Publish** full prompts/resources/templates from the registry currently in `gateway.py`.
  - Tests:
    - Inspector/Claude enumerate and fetch all; any space-bound templates resolve within `user_root`.
  - Acceptance:
    - No missing items; errors surface clearly.

### Phase 5: Ideation minimal flow
- [ ] **Implement** `ideation.ensure_space`, `ideation.upsert_concept`, `ideation.regenerate_index`, `ideation.generate_mermaid` using existing writers and generators, enforcing `type=="ideation"`.
  - Tests:
    - Create ideation space; upsert two concepts; add relation; regenerate index + mermaid; validate files under `user_root/Spaces/<name>`.
  - Acceptance:
    - Dedup logic works; artifacts exist as expected.

### Phase 6: Unified Spaces API (single ensure/list; manifests + index for all)
- [ ] **Unify create/list under Spaces**
  - `spaces.ensure_space(name, type, description?)` → idempotent; creates or returns existing. `type` ∈ {"file","ideation"}.
  - `spaces.list_spaces()` → returns all spaces for the user: `[ { name, type, path, created_at, description? } ]`.
  - Names are globally unique across types. Ensuring with a different `type` than existing → 409 `{ existingType }`.
- [ ] **Manifests for both types**
  - Write `manifest.json` at space root for both types: `{ name, type, created_at, description? }`.
  - Validate manifests on read/list; reject invalid types.
- [ ] **Root index for both types**
  - Maintain `index.md` at the space root for both types.
  - File: authored index.md as today.
  - Ideation: generated/sketched index.md summarizing the space and linking to concepts/graph.
- [ ] **Ideation directories & artifacts**
  - Keep `concepts/`, `relations/`, `diagrams/` directory structure.
  - Maintain `concepts/index.json` and generate `diagrams/graph.mmd` on demand or after mutating ops.
  - All ideation ops must validate `type=="ideation"` via manifest.
- [ ] **Resources (unified)**
  - `space://{spaceName}/manifest` → application/json (both types).
  - `space-index://{spaceName}` → text/markdown (root index.md for both types).
- [ ] **Remove redundant tools**
  - Remove `spaces.create_file_space`, `spaces.list_file_spaces`, `spaces.list_ideation_spaces` in favor of the unified API.
  - Keep prompts; adjust copy to recommend `spaces.ensure_space` first, then file vs ideation flows.
- [ ] **Tests**
  - ensure_space idempotency; cross-type conflict returns 409.
  - list_spaces returns both types with manifest data.
  - ideation ops fail fast if `type!=ideation`.
  - resource templates resolve correctly for both types within `user_root`.

### Phase 7: Stability & Integration Tests
- [ ] **Inspector**: Guided OAuth; verify prompts/resources discovery; run fs/editor ops; test spaces and ideation flows end-to-end.
- [ ] **Claude** (via CF): Connect; execute file read/edit, create space, ideation upsert/link, refresh mermaid.
- [ ] **Integration Tests**:
  - [ ] tools.list contains all expected namespaces.
  - [ ] prompts.list/get returns unified set with argument schemas.
  - [ ] resources/templates list/get resolve Space names, manifests, and index.md.
  - [ ] spaces.*: invalid manifests excluded; create produces valid manifest+index; validation errors parseable.
  - [ ] ideation.*: dedupe by title/alias; edges append; index and mermaid regenerate.

### Phase 8: Inline (optional) & Consolidation
- [ ] **Inline** fs/editor into the unified server to eliminate adapters (keep behavior parity).
- [ ] **Harden** error surfaces and timeouts; add metrics hooks for tools/call latency.
- [ ] **Docs**: Make unified MCP the canonical Claude entry; leave REST for Rails UI.

---

## Testing Strategy Integration
- Unit: manifest validation, path normalization, resource template resolution.
- Integration: end-to-end Spaces/Ideation flows, prompts/resources discovery, fs/editor adapters.
- Inspector/Claude manual verification via CF.

### Required to Pass
- [ ] Single MCP connection lists all tools across namespaces.
- [ ] Prompts/resources/templates discoverable and retrievable.
- [ ] Spaces create/list/validate works and enforces schema.
- [ ] Ideation upsert/link regenerates index and mermaid; duplicates prevented.
- [ ] OAuth through CF: `/_auth` → 204 on valid token; aud=`<origin>/mcp`.

---

## Risks & Mitigations
- **Auth mismatch (audience/issuer)** → enforce `/mcp` aud; include CF runbook.
- **Parity drift between REST and MCP** → shared schemas; integration tests; one registry for prompts/resources.
- **Adapter fragility** → phase 3 inline option; retries/timeouts around downstream calls.
- **Performance** → streamable HTTP; consider batching for read_multiple_files and list APIs.

## Dependencies
- Existing gateway logic for Spaces and Ideation.
- Upstream fs and editor MCP servers (for Phase 1 adapters).
- Rails AS (Doorkeeper), Nginx proxy, Cloudflare tunnel.

## Completion Criteria
- [ ] Unified MCP server exposes all planned tools and prompts/resources/templates.
- [ ] Inspector shows unified surface; flows execute without switching servers.
- [ ] Claude connects via CF and completes file + ideation workflows.
- [ ] REST endpoints remain functional for Rails UI.
- [ ] Docs updated (`mcp-auth.md`, architecture rules run section).

## Timeline (target)
- **Week 1**: ADR + skeleton + adapters + spaces.* + prompts/resources/templates.
- **Week 2**: ideation.* + tests + Inspector/Claude verification.
- **Week 3 (opt)**: inline fs/editor; polish; finalize docs.
