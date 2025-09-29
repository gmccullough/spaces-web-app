## Executive Summary
**Objective**: Enable users to find and open files by natural language or approximate names within a Space using a fuzzy search tool.
**Impact**: Reduces friction locating files, supports vague/partial queries (e.g., "P 51 Mustang"), improves agent usability and speed.
**Approach**: Add a server-side fuzzy filename search endpoint and a corresponding agent tool. Rank results with normalization and thresholds; auto-open when high confidence, otherwise disambiguate.

## Scope & Constraints
### In Scope
- [ ] Fuzzy filename search API scoped to a single Space
- [ ] Supervisor tool to search, then open a selected match
- [ ] Client-side helper to call the search endpoint
- [ ] Decision logic to auto-open or ask user to choose
- [ ] Tests across unit, integration, and E2E
- [ ] Documentation (ADR + specs)

### Out of Scope
- [ ] Full-text content search inside files
- [ ] Cross-space global search
- [ ] Streaming/paginated results for very large Spaces (future)

### Success Criteria
- [ ] Query like "P 51 Mustang" returns the expected file among top results with score ≥ 0.8
- [ ] Single clear top match auto-opens; otherwise agent asks to choose among top 3–5
- [ ] Integration tests validate auth, RLS, and parameter handling
- [ ] E2E covers natural language prompt leading to open in viewer

## Implementation Plan

### Phase 1: API Surface & Contracts
**Goal**: Define interfaces, request/response contracts, and supervisor tool shape.
- [ ] **Define** **Search Endpoint Contract** - GET `/api/spaces/:name/files/search`
  - **Files**: `src/app/api/spaces/[name]/files/search/route.ts` (new)
  - **Dependencies**: `listFiles`, auth via `createServerSupabase`
  - **Validation**: OpenAPI-like inline schema; returns `{ matches: [{ path, name, score, size?, contentType?, updatedAt? }] }`
  - **Context**: Accepts `query`, `dir?`, `recursive?`, `limit?`, `minScore?`
- [ ] **Add** **Client Function** - `searchSpaceFiles(spaceName, query, opts?)`
  - **Files**: `src/app/lib/spaces/client.ts`
  - **Dependencies**: Auth header helper; endpoint
  - **Validation**: Unit tests for parameter serialization and error envelopes
- [ ] **Add** **Supervisor Tool** - `search_space_files`
  - **Files**: `src/app/agentConfigs/chatSupervisor/supervisorAgent.ts`
  - **Dependencies**: Client function; tool list wiring
  - **Validation**: Tool schema matches API; handles errors and empty results

### Phase 2: Server Fuzzy Search Logic
**Goal**: Implement robust, efficient fuzzy ranking over filenames/paths.
- [ ] **Create** **Fuzzy Scorer Utility** - name/path normalization + scoring
  - **Files**: `src/app/lib/spaces/search.ts` (new)
  - **Dependencies**: None external; reuse normalization patterns from paths
  - **Validation**: Unit tests for normalization (case, punctuation, diacritics, separators)
- [ ] **Implement** **Search Handler** - integrate list→score→filter→sort→limit
  - **Files**: `src/app/api/spaces/[name]/files/search/route.ts`
  - **Dependencies**: `listFiles`, scorer; auth; RLS via storage
  - **Validation**: Integration tests for auth, recursion, dir filter, limit/minScore
- [ ] **Add** **Performance Guardrails** - cap list results, early exits
  - **Files**: same as above
  - **Dependencies**: None
  - **Validation**: Handles large spaces without timeouts in tests

### Phase 3: Agent Decision Logic & UI Wiring
**Goal**: Provide a smooth UX to find and open files.
- [ ] **Add** **Decision Logic** - auto-open vs. disambiguate
  - **Files**: `src/app/agentConfigs/chatSupervisor/supervisorAgent.ts`
  - **Dependencies**: `read_space_file`; existing list/write tools
  - **Validation**: Clear rules: auto-open if top ≥ 0.85 and gap ≥ 0.1; else ask
- [ ] **Wire** **Open Action to Viewer** - ensure open selects in tree and loads viewer
  - **Files**: `src/app/components/SpacesFileTree.tsx`, `src/app/components/SpacesFileViewer.tsx`, events/hooks as needed
  - **Dependencies**: Existing `useSpacesFileContent`, `useSpacesFileTree`
  - **Validation**: On confirm, tree highlights selection and viewer renders content

## Technical Architecture

### Endpoint Interface (Reference Only)
- GET `/api/spaces/:name/files/search`
  - Query params: `query` (required), `dir?`, `recursive?` (default true), `limit?` (default 20), `minScore?` (default 0.5)
  - Response: `{ matches: Array<{ path, name, score, size?, contentType?, updatedAt? }> }`

### Tool Interface (Reference Only)
- `search_space_files({ spaceName, query, dir?, recursive?, limit?, minScore? })`
  - Returns same shape as endpoint

### Scoring Heuristics
- Case/diacritics-insensitive; token/kebab/camel normalization
- Prefix/suffix and substring boosts; token overlap weighting
- Path penalties vs filename focus; stable tie-break by updatedAt desc

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] `tests/spaces/spaces-client.unit.test.ts` - existing client behavior unaffected
- [ ] `tests/spaces/files-api.integration.test.ts` - existing list/read/write unaffected

### New Tests Required
- [ ] **Unit**: scorer normalization and ranking edge cases
  - **Files**: `tests/spaces/search-scoring.unit.test.ts`
  - **Success Criteria**: Expected ordering and scores for common variants
- [ ] **Integration**: endpoint behavior and permissions
  - **Files**: `tests/spaces/files-search-api.integration.test.ts`
  - **Success Criteria**: Auth required; dir/recursive honored; limit/minScore enforced
- [ ] **E2E**: natural language search and open workflow
  - **Files**: `tests/spaces/file-search-open.e2e.test.ts`
  - **Success Criteria**: Query "P 51 Mustang" finds and opens expected file, disambiguates when needed

### Test Documentation Updates
- [ ] **Update** `specs/product/example-domain/tests.md` - Add search coverage outline for Spaces domain
  - **Context**: Document how to run new tests and affected areas

## Risk Assessment & Dependencies

### High Risk: Large Spaces Performance
- **Risk**: Listing thousands of files increases latency
- **Mitigation**: Limit recursion or apply server-side caps; future pagination
- **Contingency**: Fallback to directory-scoped search with prompt to refine

### Dependencies & Integration Points
- [ ] Supabase Storage availability and RLS policies (unchanged)
- [ ] Existing Spaces list/read/write APIs and hooks

## Discussion & Decision Context

### Key Discussion Points
- Fuzzy vs. exact search trade-offs; threshold defaults
- Auto-open thresholds vs. prompting frequency
- Directory scoping vs. global-in-space search

### Alternatives Considered
- Client-side fuzzy search (rejected due to auth/list duplication and payload size)
- Full-text search index (future; out of scope)

### Context & Timing
- Builds on recent Spaces file tooling; improves daily usability

### Future Considerations
- Global cross-space search; pagination/streaming; result caching

## Timeline & Deliverables

### Week 1: Contracts & Server Logic
- [ ] Endpoint contract and client function defined
- [ ] Scorer utility implemented with unit tests
- [ ] Endpoint integration tests passing

### Week 2: Agent & UI Flow + E2E
- [ ] Supervisor tool + decision logic wired
- [ ] Viewer/tree integration complete
- [ ] E2E passing for search-and-open flows

## Final Completion Criteria
- [ ] Functionality: Search and open via agent works per scope
- [ ] Testing: New tests passing; no regressions
- [ ] Documentation: ADR + specs updated
- [ ] Integration: No breaking changes to existing Spaces APIs
- [ ] Performance: Endpoint responds < 500ms for typical Spaces (≤ 500 files)
