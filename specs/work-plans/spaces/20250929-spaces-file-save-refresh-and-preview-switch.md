## Executive Summary
**Objective**: Re-render the file tree and preview panes immediately after a successful server-side file save. If the newly saved file is not focused, bring it up in preview automatically.

**Impact**: Improves UX feedback and correctness across all file operations (create/update). Establishes a generic, event-driven pattern that the mind map snapshot saves (`mindmap.json`) will leverage.

**Approach**: Emit a typed `fileSaved` app event on successful persistence. File tree and preview subscribe and revalidate via SWR. Use direct listeners and shared state in `SpacesFilesPanel` to coordinate preview focus changes. Add lightweight UX notifications and debounce to avoid flicker.

## Scope & Constraints
### In Scope
- [x] Event-driven refresh on save: `fileSaved({ spaceName, path, etag?, size?, updatedAt? })`
- [x] Emit from save success path (Supabase storage write or API save completion)
- [x] Tree revalidation and node reconciliation (preserve expand/collapse)
- [x] Preview behavior: revalidate if already focused; otherwise switch focus to saved file
- [x] Space-scoped handling (ignore events for other spaces)
- [x] Lightweight toast: “Saved <filename>” with optional “View” action
- [x] Debounce/coalesce multiple rapid saves (100–200 ms)
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
- [x] **Define** **FileSaved Event Contract** - Single payload used across app
  - **Files**: `src/app/contexts/EventContext.tsx`
  - **Validation**: TS types compile; event is emitted and subscribable

- [ ] **Create** **ActiveFileContext** - Cross-pane preview focus state (deferred; not required)
  - **Files**: `src/app/contexts/ActiveFileContext.tsx` (new)

- [x] **Standardize** **SWR Keys** - Tree and file content
  - **Files**: `src/app/hooks/useSpacesFileTree.ts`, `src/app/hooks/useSpacesFileContent.ts`

### Phase 2: Tree & Content Wiring
- [x] **Subscribe** **Tree to fileSaved** - Revalidate and reconcile node (forced refresh root+parent)
- [x] **Subscribe** **Content to fileSaved** - Targeted revalidation when focused

### Phase 3: Preview Switching & UX
- [x] **Add** **Save Effects Coordinator** - Bring saved file to preview when not focused (`SpacesFilesPanel`)
- [x] **Add** **Toast Notification** - Non-blocking confirmation with “View”
- [x] **Selection Highlight** - Light blue highlight for selected file row and matching preview background

### Phase 4: Robustness & Perf
- [x] **Implement** **Debounce/Coalescing** - Guard against bursts
- [ ] **Add** **ETag/UpdatedAt Awareness** - Minimal consistency check (future)
- [x] **Enforce** **Space Guards** - Ignore cross-space events

### Phase 5: Testing & Polish
- [x] **Write** **Unit Tests** - Event emission and listeners (client dispatch verified)
- [ ] **Write** **Integration Test** - Simulated save → refresh + preview
- [x] **Add** **Dev Logs** - Visible during development

---

## Technical Architecture (as implemented)

- Event emitted via browser `CustomEvent('spaces:fileSaved', { detail })` after successful write in `src/app/lib/spaces/client.ts`.
- Tree and content hooks subscribe via `window.addEventListener('spaces:fileSaved', ...)` with space-scoped filtering and debounced refresh.
- Preview switching handled in `SpacesFilesPanel` by setting `selectedPath` when the saved file differs from the current selection.
- Toast: ephemeral, auto-dismiss after 3s, with “View” action.
- Path normalization: avoid nested other-space prefixes during writes.

## Testing Strategy

### Tests That Must Pass for Completion
- [x] Existing spaces domain tests remain green
- [ ] Manifest/list tests validate timestamp changes on write (planned)

### New Tests
- [x] **Unit**: Event is dispatched after successful write
- [x] **Unit**: Tree/content subscribers handle `fileSaved` appropriately
- [ ] **Integration**: Save triggers tree update and preview switch

## Final Completion Criteria
- [ ] Tree refreshes automatically after saves; expand state preserved
- [ ] Preview revalidates when focused; switches when not focused
- [ ] Cross-space events ignored; no unintended preview changes
- [ ] Works seamlessly for `mindmap.json` snapshot saves
- [ ] All existing and new tests pass; documentation updated


