## Executive Summary & Scope
**Objective**: Add a read-only Files panel above the conversation that shows a file tree (left) and a text-only file viewer (right) for the current Space.

**Impact**: Improves visibility and retrieval of saved ideas without leaving the chat. Enables quick review of files created via conversational tools and establishes patterns for future editing and previews.

**Approach**: Introduce a new top section with two panes (left tree, right viewer). Use the existing Spaces Storage endpoints (list/read) with Supabase bearer auth. Lazy-load directories, cache results, and render text content with basic error and binary handling. Push existing conversation and logs below this section.

### In Scope
- [ ] New top Files panel with two panes: tree (left) and text viewer (right)
- [ ] Integrate list/read endpoints with Supabase bearer auth
- [ ] Lazy directory loading (recursive=false) with caching per expanded directory
- [ ] Text-only rendering with size cap and binary notice
- [ ] Accessibility: keyboard navigation and ARIA roles in the tree
- [ ] Error/empty/auth states rendered in-panel
- [ ] Styling aligned with existing Tailwind patterns; fixed split ratio

### Out of Scope
- [ ] File editing, uploads, rename/move/delete
- [ ] Markdown rendering, syntax highlighting, downloads
- [ ] Resizable split (drag handle)

### Success Criteria
- [ ] Files panel renders above chat; chat and logs still function below
- [ ] Selecting a file loads and displays text with correct `Content-Type`
- [ ] Non-text files show a binary notice (no content render)
- [ ] Expanding directories fetches and caches children; subsequent opens are instant
- [ ] Auth failures, invalid paths, and size errors surface with clear messages
- [ ] Keyboard navigation (Up/Down, Left/Right) and ARIA roles announce state


## Implementation Plan

### Phase 1: Layout & Scaffolding (Week 1)
**Goal**: Establish Files panel shell and placement above chat.

- [ ] **Create** **SpacesFilesPanel** - Container for tree + viewer
  - **Files**: `src/app/components/SpacesFilesPanel.tsx`
  - **Dependencies**: None
  - **Validation**: Renders two-pane layout with placeholders
  - **Context**: Single orchestrator component for state and composition

- [ ] **Insert** **Files panel above chat** - Push chat/logs below
  - **Files**: `src/app/demo/page.tsx` (or the page hosting chat)
  - **Dependencies**: Existing chat and logs components
  - **Validation**: Visual verification; no layout regressions
  - **Context**: Wrap page with vertical stack; Files panel on top

### Phase 2: File Tree (Week 1)
**Goal**: Implement lazy-loaded, cached tree with selection.

- [ ] **Create** **SpacesFileTree** - Expand/collapse, selection, keyboard nav
  - **Files**: `src/app/components/SpacesFileTree.tsx`
  - **Dependencies**: `useSpacesFileTree`
  - **Validation**: Can expand a dir and see children; selection updates
  - **Context**: Uses ARIA roles `tree`, `treeitem`, `group`

- [ ] **Create** **useSpacesFileTree** - List API integration + caching
  - **Files**: `src/app/hooks/useSpacesFileTree.ts`
  - **Dependencies**: Supabase access token from client; list endpoint
  - **Validation**: GET to `/api/spaces/:name/files?dir=&recursive=false`; caches by dir
  - **Context**: Maintains `expandedDirs`, `nodesByDir`, loading/error maps

### Phase 3: File Viewer (Week 1)
**Goal**: Load and display selected file as text (with binary notice fallback).

- [ ] **Create** **SpacesFileViewer** - Text viewer with loading/error/empty
  - **Files**: `src/app/components/SpacesFileViewer.tsx`
  - **Dependencies**: `useSpacesFileContent`
  - **Validation**: Selected text file renders; binary shows notice
  - **Context**: Monospace `<pre>` with scroll; truncate large text

- [ ] **Create** **useSpacesFileContent** - Read API integration
  - **Files**: `src/app/hooks/useSpacesFileContent.ts`
  - **Dependencies**: Supabase access token; read endpoint
  - **Validation**: GET `/api/spaces/:name/files/[...path]` returns bytes; decode base64 to text when `Content-Type` is textual
  - **Context**: Detect text by `contentType.startsWith('text/')` or known textual MIME types

### Phase 4: Auth Integration (Week 2)
**Goal**: Ensure bearer auth and robust unauthenticated states.

- [ ] **Retrieve** **Supabase access token** - Client-side session
  - **Files**: `src/app/lib/supabase/client.ts` usage within hooks
  - **Dependencies**: Supabase client
  - **Validation**: Requests include `Authorization: Bearer <token>`
  - **Context**: Server validates JWT and derives `userId`

- [ ] **Handle** **Unauthenticated state** - Friendly message and CTA
  - **Files**: `SpacesFilesPanel.tsx`
  - **Dependencies**: Session state
  - **Validation**: Shows message instead of tree/viewer when no session
  - **Context**: Consistent with app auth UX

### Phase 5: Accessibility & Styling (Week 2)
**Goal**: A11y-compliant tree and consistent styling.

- [ ] **Add** **Keyboard navigation** - Up/Down select; Left collapse; Right expand
  - **Files**: `SpacesFileTree.tsx`
  - **Dependencies**: None
  - **Validation**: Keyboard-only navigation mirrors mouse behavior
  - **Context**: Manage focus and `aria-selected`, `aria-expanded`

- [ ] **Apply** **Tailwind layout** - Fixed split (30/70), scrollable panes
  - **Files**: `SpacesFilesPanel.tsx`
  - **Dependencies**: Global styles
  - **Validation**: Clean visual hierarchy; no overflow glitches
  - **Context**: Keep performance and readability high

### Phase 6: Testing (Week 2)
**Goal**: Unit + integration coverage for core flows.

- [ ] **Unit** **useSpacesFileTree** - Caching, lazy loading, error states
  - **Files**: `tests/spaces/ui/useSpacesFileTree.unit.test.ts`
  - **Dependencies**: Mock fetch
  - **Validation**: Avoids re-fetch on cached dirs; handles errors
  - **Context**: Table-driven tests for edge cases

- [ ] **Unit** **useSpacesFileContent** - Text detection, base64 decode, size cap
  - **Files**: `tests/spaces/ui/useSpacesFileContent.unit.test.ts`
  - **Dependencies**: Mock fetch
  - **Validation**: Correctly flags binary; truncates large text with notice
  - **Context**: MIME matrix for common types

- [ ] **Integration** **Files panel** - Happy path and error states
  - **Files**: `tests/spaces/ui/files-panel.integration.test.ts`
  - **Dependencies**: Test server; Supabase test session
  - **Validation**: Expand dir, select file, render text; unauthenticated and error envelopes shown
  - **Context**: Smoke coverage for end-to-end behavior


## Technical Architecture

### Components & Hooks
- **Components**:
  - `src/app/components/SpacesFilesPanel.tsx` - Panel container and layout
  - `src/app/components/SpacesFileTree.tsx` - Tree with expand/collapse and selection
  - `src/app/components/SpacesFileViewer.tsx` - Text viewer with loading/error
- **Hooks**:
  - `src/app/hooks/useSpacesFileTree.ts` - Directory listing, lazy load, cache
  - `src/app/hooks/useSpacesFileContent.ts` - File read, decode, text detection

### Endpoint Usage
1) List: GET `/api/spaces/:name/files?dir=&recursive=false` → `{ files: FileEntry[] }`
2) Read: GET `/api/spaces/:name/files/[...path]` → bytes + `Content-Type` → decoded to text for viewer

### Auth & Error Handling
- Include `Authorization: Bearer <access_token>` on all requests
- Surface server errors as JSON envelope messages in-panel
- Unauthenticated: show message instead of tree/viewer

### Rendering & Limits
- Treat as text if `contentType.startsWith('text/')` or common textual MIME (e.g., `application/json`, `application/markdown`)
- Cap displayed text (e.g., first 1–2MB) with truncation notice
- Binary: display “Binary file (content type …) not displayed.”


## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Auth gating: unauthenticated state handled (no requests fired; message shown)
- [ ] Lazy loading: directories fetched once and cached; re-open is instant
- [ ] Selection: viewer shows text for text files and binary notice otherwise
- [ ] Error surfacing: `UNAUTHORIZED`, `INVALID_PATH`, `REQUEST_TOO_LARGE` rendered clearly

### New Tests Required
- [ ] **Unit**: `useSpacesFileTree` (caching, errors, parameter shaping)
- [ ] **Unit**: `useSpacesFileContent` (MIME detection, base64 decode, truncation)
- [ ] **Integration**: Files panel (expand → list; select → view; auth/error states)

### Test Documentation Updates
- [ ] **Update** `specs/product/example-domain/tests.md` - Add Files panel UI coverage outline
  - **Context**: Documents UI-side visibility of Spaces file IO
  - **Dependencies**: Underlying endpoints from storage work plan


## Risk Assessment & Dependencies

### High Risk: API Latency / Large Trees
- **Risk**: Deep hierarchies or slow responses degrade UX
- **Impact**: Perceived slowness, scroll jank
- **Mitigation**: Lazy load, loading indicators, caching
- **Contingency**: Optional `recursive=true` fetch for shallow structures (future)

### High Risk: Large Files / Memory
- **Risk**: Very large text files stall the UI
- **Impact**: Unresponsive viewer
- **Mitigation**: Truncation and size cap; warn user
- **Contingency**: Add download-only behavior for very large files (future)

### High Risk: Auth Token Availability
- **Risk**: Token not present during initial render
- **Impact**: Unauthorized errors or flicker
- **Mitigation**: Gate requests on session readiness; show unauthenticated message
- **Contingency**: Retry fetch when session appears

## Dependencies & Integration Points
- [ ] Spaces Storage endpoints (list/read) from `TODO-spaces-minimal-user-storage-3ops.md`
- [ ] Supabase client session accessible in UI runtime
- [ ] Existing chat/log components accept being pushed below Files panel


## Discussion & Decision Context

### Alternative Approaches Considered
- **Recursive full-tree load**
  - **Pros**: Simpler UI logic
  - **Cons**: Slow for large trees; unnecessary network
  - **Decision**: Prefer lazy load for scalability

- **Markdown/syntax preview**
  - **Pros**: Richer viewing
  - **Cons**: Scope increase; perf and security considerations
  - **Decision**: Defer; ship text-only first

- **Resizable split**
  - **Pros**: Better UX control
  - **Cons**: Extra complexity; not critical for v1
  - **Decision**: Defer to future

### Context & Timing
- Built after conversational storage tools to surface saved artifacts
- Minimal risk to existing chat flows; clear value to users immediately

### Future Considerations
- Editing and uploads; markdown preview; search/filter; resizable split


## Timeline & Deliverables

### Week 1: Layout, Tree, Viewer
- [ ] Files panel scaffolding + placement above chat
- [ ] Lazy-loaded tree with caching and selection
- [ ] Text viewer with binary notice and truncation

### Week 2: Auth, A11y, Tests
- [ ] Bearer auth integration + unauthenticated state UX
- [ ] Keyboard navigation + ARIA roles; Tailwind polish
- [ ] Unit + integration tests passing; test docs updated

## Final Completion Criteria
- [ ] Functionality: Files panel (tree + viewer) works as specified; chat unaffected
- [ ] Testing: Unit/integration tests pass; key error paths covered
- [ ] Documentation: Test docs updated; limitations and behaviors documented
- [ ] Integration: No breaking changes to existing routes; uses bearer auth properly
- [ ] Performance: No noticeable regressions in page responsiveness


