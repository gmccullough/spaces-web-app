## Executive Summary
**Objective**: Re-render the file tree and preview panes immediately after a successful server-side file save. If the newly saved file is not focused, bring it up in preview automatically.

**Impact**: Improves UX feedback and correctness across all file operations (create/update). Establishes a generic, event-driven pattern that the mind map snapshot saves (`mindmap.json`) will leverage.

**Approach**: Emit a typed `fileSaved` app event on successful persistence. File tree and preview subscribe and revalidate via SWR. Use an `ActiveFileContext` to coordinate preview focus changes. Add lightweight UX notifications and debounce to avoid flicker.

## Scope & Constraints
### In Scope
- [ ] Event-driven refresh on save: `fileSaved({ spaceName, path, etag?, size?, updatedAt? })`
- [ ] Emit from save success path (Supabase storage write or API save completion)
- [ ] Tree revalidation and node reconciliation (preserve expand/collapse)
- [ ] Preview behavior: revalidate if already focused; otherwise switch focus to saved file
- [ ] Space-scoped handling (ignore events for other spaces)
- [ ] Lightweight toast: “Saved <filename>” with optional “View” action
- [ ] Debounce/coalesce multiple rapid saves (100–200 ms)
- [ ] Minimal eventual-consistency handling (single retry/backoff on mismatch)

### Out of Scope (for now)
- [ ] Rename/move flows (treat future rename as create+delete)
- [ ] Offline/queuing, multi-tab sync
- [ ] Bulk operations UX (batch save previews)

### Success Criteria
- [ ] After save, tree updates without manual refresh and expansion state is preserved
- [ ] If saved file wasn’t focused, preview switches to it; if focused, content revalidates without flicker
- [ ] Cross-space events do not affect current space
- [ ] Works for general files and for `mindmap.json` saves

---

## Implementation Plan

### Phase 1: Foundations (Event & Context)
- [ ] **Define** **FileSaved Event Contract** - Single payload used across app
  - **Files**: `src/app/contexts/EventContext.tsx`
  - **Dependencies**: None
  - **Validation**: TS types compile; event is emitted and subscribable
  - **Context**: `{ spaceName: string; path: string; etag?: string; size?: number; updatedAt?: string }`

- [ ] **Create** **ActiveFileContext** - Cross-pane preview focus state
  - **Files**: `src/app/contexts/ActiveFileContext.tsx` (new)
  - **Dependencies**: React context patterns
  - **Validation**: Provides `{ activePath, setActivePath }` to tree/viewer
  - **Context**: Avoid bespoke preview logic in each consumer

- [ ] **Standardize** **SWR Keys** - Tree and file content
  - **Files**: `src/app/hooks/useSpacesFileTree.ts`, `src/app/hooks/useSpacesFileContent.ts`
  - **Dependencies**: SWR
  - **Validation**: Keys documented: `['spaces-tree', spaceName]`, `['spaces-file', spaceName, path]`
  - **Context**: Enables targeted `mutate` on save

### Phase 2: Tree & Content Wiring
- [ ] **Subscribe** **Tree to fileSaved** - Revalidate and reconcile node
  - **Files**: `src/app/hooks/useSpacesFileTree.ts`
  - **Dependencies**: EventContext
  - **Validation**: On `fileSaved` (matching space), call `mutate(['spaces-tree', spaceName])` and preserve expand state
  - **Context**: Debounce to coalesce rapid saves

- [ ] **Subscribe** **Content to fileSaved** - Targeted revalidation
  - **Files**: `src/app/hooks/useSpacesFileContent.ts`
  - **Dependencies**: EventContext
  - **Validation**: If `savedPath === activePath`, revalidate `['spaces-file', spaceName, activePath]`
  - **Context**: Avoid unnecessary refetch when not focused

### Phase 3: Preview Switching & UX
- [ ] **Add** **Save Effects Coordinator** - Bring saved file to preview when not focused
  - **Files**: `src/app/components/SpacesFilesPanel.tsx` (or new `useFileSaveEffects.ts`)
  - **Dependencies**: EventContext, ActiveFileContext
  - **Validation**: On `fileSaved` (matching space) and `savedPath !== activePath`, call `setActivePath(savedPath)`
  - **Context**: Central place for preview handoff logic

- [ ] **Add** **Toast Notification** - Non-blocking confirmation
  - **Files**: Shared toast/util or minimal inline in panel
  - **Dependencies**: Existing notification pattern (if any)
  - **Validation**: Displays “Saved <filename>”; optional “View” triggers `setActivePath(savedPath)`
  - **Context**: UX acknowledgment without extra clicks

### Phase 4: Robustness & Perf
- [ ] **Implement** **Debounce/Coalescing** - Guard against bursts
  - **Files**: Tree/content hooks or coordinator
  - **Dependencies**: Utility debounce
  - **Validation**: Multiple quick saves cause a single tree refresh

- [ ] **Add** **ETag/UpdatedAt Awareness** - Minimal consistency check
  - **Files**: `src/app/lib/spaces/storage.ts` (surface metadata), content hook
  - **Dependencies**: Supabase storage
  - **Validation**: If post-save fetch returns stale data once, retry with small backoff

- [ ] **Enforce** **Space Guards** - Ignore cross-space events
  - **Files**: All subscribers
  - **Dependencies**: Current active space name
  - **Validation**: No preview switching across spaces

### Phase 5: Testing & Polish
- [ ] **Write** **Unit Tests** - Event wiring and hook behavior
  - **Files**: `tests/spaces/` (new files)
  - **Dependencies**: Jest setup
  - **Validation**: Tree refreshes on `fileSaved`; content revalidates when focused; preview switches when not focused

- [ ] **Write** **Integration Test** - Simulated save → refresh + preview
  - **Files**: `tests/spaces/` (integration)
  - **Dependencies**: Existing API save mocks/integration harness
  - **Validation**: After save completion, tree updates and preview shows new file

- [ ] **Add** **Dev Logs** - Useful debug outputs gated to dev
  - **Files**: Subscribers/coordinator
  - **Validation**: Log `fileSaved` payloads and actions

---

## Technical Architecture

### Event Contract (Type Only)
```ts
type FileSavedEvent = {
  spaceName: string;
  path: string;
  etag?: string;
  size?: number;
  updatedAt?: string; // ISO; aligns with manifest `last_updated_at`
};

// EventContext additions (signatures only)
function emitFileSaved(e: FileSavedEvent): void
function onFileSaved(handler: (e: FileSavedEvent) => void): () => void
```

### Active Preview State
```ts
type ActiveFileContext = {
  activePath: string | null;
  setActivePath: (path: string) => void;
}
```

### SWR Keys
```ts
// Tree
['spaces-tree', spaceName]

// File content
['spaces-file', spaceName, path]
```

### Integration Points
- Save emit site: `src/app/lib/spaces/storage.ts` (after successful write)
- Tree refresh: `src/app/hooks/useSpacesFileTree.ts`
- Content refresh: `src/app/hooks/useSpacesFileContent.ts`
- Preview switch: `SpacesFilesPanel.tsx` (or `useFileSaveEffects`)

---

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Existing spaces domain tests remain green
  - **Files**: `tests/spaces/storage-paths.unit.test.ts`, `tests/spaces/spaces-client.unit.test.ts`, `tests/spaces/files-api.integration.test.ts`
  - **Risk**: Path regressions; API contract changes
  - **Validation**: All pass unchanged

- [ ] Manifest/list tests validate timestamp changes on write
  - **Context**: Aligns UI with `updatedAt/last_updated_at` for refresh decisions

### New Tests Required
- [ ] **Unit**: Tree subscriber calls `mutate` on matching-space `fileSaved`
  - **Purpose**: Verify refresh trigger
  - **Implementation**: Mock EventContext + SWR mutate
  - **Success Criteria**: One refresh per debounced burst

- [ ] **Unit**: Content subscriber revalidates only when saved path is focused
  - **Purpose**: Prevent unnecessary fetches
  - **Implementation**: Simulate activePath; assert mutate is conditional
  - **Success Criteria**: Revalidation occurs only when expected

- [ ] **Unit**: Coordinator switches preview when not focused
  - **Purpose**: Ensure preview handoff
  - **Implementation**: Mock ActiveFileContext; emit event
  - **Success Criteria**: `setActivePath(savedPath)` called

- [ ] **Integration**: Simulated save triggers tree update and preview switch
  - **Purpose**: End-to-end behavior
  - **Implementation**: Use existing save flow; assert UI state changes
  - **Success Criteria**: Tree shows file; preview displays new content

### Test Documentation Updates
- [ ] Update later if this becomes a covered product domain (N/A now)

---

## Risk Assessment & Dependencies

### Risks
- **Eventual consistency**: Post-save fetch may briefly return stale content
  - **Mitigation**: Single retry with small backoff; use `etag/updatedAt` checks
- **Burst saves**: Multiple quick saves could cause redundant refreshes
  - **Mitigation**: Debounce/coalesce refresh triggers (100–200 ms)
- **Cross-space events**: Wrong space preview switches
  - **Mitigation**: Strict spaceName filtering in all subscribers

### Dependencies
- Supabase storage write path and response metadata (`etag`, `last_updated_at`)
- Spaces files API (`src/app/api/spaces/[name]/files/...`)
- Mind map plan will emit `fileSaved` for `mindmap.json` saves

---

## Discussion & Decision Context

### Key Decision Points
- **Event-driven vs polling**: Chose event-driven for immediacy and simplicity
- **Global preview state**: Centralized `ActiveFileContext` to avoid bespoke coupling
- **SWR-based revalidation**: Reuse existing patterns; precise cache invalidation

### Context & Timing
- **Why now**: Foundational to `@TODO-spaces-mindmap-realtime-oob.md` snapshot saves; improves overall UX immediately
- **Technical readiness**: Existing hooks and API endpoints enable minimal integration

### Future Considerations
- “Follow saves” toggle to opt-out of auto-preview switching
- Rename/move semantics; multi-tab synchronization

---

## Timeline & Deliverables

### Day 1: Foundations & Wiring
- [ ] Event contract, ActiveFileContext, SWR keys defined
- [ ] Tree and content subscribers wired with space guards

### Day 2: Preview & Robustness
- [ ] Coordinator for preview switching + toast UX
- [ ] Debounce and minimal retry/backoff implemented

## Final Completion Criteria
- [ ] Tree refreshes automatically after saves; expand state preserved
- [ ] Preview revalidates when focused; switches when not focused
- [ ] Cross-space events ignored; no unintended preview changes
- [ ] Works seamlessly for `mindmap.json` snapshot saves
- [ ] All existing and new tests pass; documentation updated


