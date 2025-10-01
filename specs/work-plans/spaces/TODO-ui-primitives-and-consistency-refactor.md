## Executive Summary
**Objective**: Consolidate duplicated UI patterns into reusable primitives and standardize pane behavior across the app, improving consistency, maintainability, and testability.

**Impact**: Reduces code duplication (modals, headers, toggles, toasts, event listeners), simplifies future features, improves a11y, and establishes a stable UI platform for Spaces.

**Approach**: Introduce a small UI primitive library (Modal, Pane, ToggleGroup, IconButton, ToastProvider), unify event/listener patterns, remove magic strings, extract shared utilities, and adopt a consistent directory and styling system. Migrate existing components incrementally in phases with tests.

## Scope & Constraints
### In Scope
- [ ] Consolidate dialogs into a shared `Modal` component and migrate `SpacePickerModal` and Toolbar Settings
- [ ] Create pane scaffold `Pane` and migrate `Transcript`, `MindMapInspector`, `SpacesFilesPanel`
- [ ] Introduce `ToggleGroup`, `IconButton`, `Loader`, `ErrorMessage`, `EmptyState`
- [ ] Add `ToastProvider` and replace ad-hoc toasts
- [ ] Centralize `usePersistentState` and `useEventListener` hooks
- [ ] Replace magic `"__mindmap__"` with a constant or remove from file tree
- [ ] Unify `spaces:fileSaved` listeners via a hook
- [ ] Deduplicate mindmap op normalization into shared util
- [ ] Optional virtualization path for large file trees
- [ ] Directory reshuffle to `components/ui`, `components/panes`, `lib/ui`, `lib/spaces`
- [ ] Standardize icon usage

### Out of Scope
- [ ] Visual redesign or new theming system beyond class consolidation
- [ ] Major feature changes unrelated to refactor scope
- [ ] Non-Spaces domains

### Success Criteria
- [ ] Duplicated modal markup removed; both modals use shared `Modal`
- [ ] Panes share common header/body/footer scaffold with sticky headers
- [ ] All toggles/buttons use standardized variants with consistent classes
- [ ] No raw `window.addEventListener('spaces:fileSaved', ...)` in components; use hook
- [ ] No direct string literals for the Mind Map special path in components
- [ ] Unit tests for all primitives; basic integration tests for migrated panes

## Implementation Plan

### Phase 1: UI Primitives Foundation (Week 1)
**Goal**: Introduce shared primitives and hooks without breaking existing components.

- [ ] **Create** **Modal** - Accessible dialog with backdrop, focus trap, ESC, size variants
  - **Files**: `src/app/components/ui/Modal.tsx`
  - **Dependencies**: None (prefer headless; no extra lib)
  - **Validation**: Opens/closes via props; traps focus; aria attributes pass axe checks
  - **Context**: Replaces duplicated modal markup in Toolbar Settings and Space Picker

- [ ] **Create** **Pane** - Scaffold with `Pane.Header`, `Pane.Actions`, `Pane.Body`, `Pane.Footer`
  - **Files**: `src/app/components/ui/Pane.tsx`
  - **Dependencies**: None
  - **Validation**: Sticky header, scrollable body; consistent padding/typography
  - **Context**: Normalizes `Transcript`, `MindMapInspector`, `SpacesFilesPanel` headers

- [ ] **Create** **ToggleGroup** and **IconButton** primitives
  - **Files**: `src/app/components/ui/ToggleGroup.tsx`, `IconButton.tsx`
  - **Dependencies**: `clsx` (and optionally `class-variance-authority`)
  - **Validation**: Selected/disabled states; keyboard nav; consistent classes
  - **Context**: Replaces ad-hoc toggles in Toolbar and SpacesFilesPanel

- [ ] **Create** **Loader**, **ErrorMessage**, **EmptyState**
  - **Files**: `src/app/components/ui/{Loader,ErrorMessage,EmptyState}.tsx`
  - **Dependencies**: None
  - **Validation**: Reusable consistent visuals
  - **Context**: Replace repeated "Loading…", error, empty markup

- [ ] **Add** **ToastProvider** and `useToast`
  - **Files**: `src/app/components/ui/ToastProvider.tsx`
  - **Dependencies**: None
  - **Validation**: Toaster renders bottom-right; supports action; queueing and auto-dismiss
  - **Context**: Replace local toasts in `SpacesFilesPanel`

- [ ] **Add** **usePersistentState** and **useEventListener** hooks
  - **Files**: `src/app/lib/ui/{usePersistentState,useEventListener}.ts`
  - **Dependencies**: None
  - **Validation**: SSR-safe (guards `window`); localStorage try/catch; add/remove listeners correctly
  - **Context**: Replace ad-hoc persistence (Transcript) and duplicated listeners

### Phase 2: Adopt Primitives in Existing Components (Week 1)
**Goal**: Migrate without changing behavior.

- [ ] **Migrate** **SpacePickerModal** to `Modal`
  - **Files**: `src/app/components/SpacePickerModal.tsx`
  - **Dependencies**: `Modal`
  - **Validation**: Same open/close behavior; Escape/backdrop click handling preserved
  - **Context**: Removes custom backdrop and close handling

- [ ] **Extract & Migrate** **Toolbar Settings** into `SettingsModal` using `Modal`
  - **Files**: `src/app/components/modals/SettingsModal.tsx`, update `Toolbar.tsx`
  - **Dependencies**: `Modal`
  - **Validation**: Same settings controls, props contract unchanged externally
  - **Context**: Removes inline modal markup from `Toolbar`

- [ ] **Migrate** **Transcript**, **MindMapInspector**, **SpacesFilesPanel** to `Pane`
  - **Files**: `src/app/components/{Transcript,MindMapInspector,SpacesFilesPanel}.tsx`
  - **Dependencies**: `Pane`, `Loader/Error/Empty`
  - **Validation**: Sticky header works; no visual regression in spacing and borders
  - **Context**: Consolidate header patterns and scroll regions

- [ ] **Replace** ad-hoc button/toggles with **IconButton** and **ToggleGroup**
  - **Files**: `Toolbar.tsx`, `SpacesFilesPanel.tsx`
  - **Dependencies**: `IconButton`, `ToggleGroup`, `clsx`
  - **Validation**: Identical enabled/disabled/pressed semantics; keyboard operable
  - **Context**: Consistent interaction patterns across the app

### Phase 3: Data-Flow Simplification & Utilities (Week 2)
**Goal**: Remove magic strings, unify event flows, and centralize layout state.

- [ ] **Create** **UILayoutContext** for pane visibility (`events`, `transcript`, `inspector`)
  - **Files**: `src/app/contexts/UILayoutContext.tsx`, update `Toolbar.tsx` and pane consumers
  - **Dependencies**: None
  - **Validation**: Same toggling behavior; fewer props drilled through
  - **Context**: Cleans up `Toolbar` prop surface

- [ ] **Centralize** Mind Map special path
  - **Files**: `src/app/lib/spaces/constants.ts`
  - **Dependencies**: None
  - **Validation**: No inline `"__mindmap__"` literals; import constant
  - **Context**: Optionally remove the tree sentinel and rely on top-level toggle

- [ ] **Unify** file saved event handling via `useSpaceFileSaved`
  - **Files**: `src/app/lib/spaces/useSpaceFileSaved.ts`
  - **Dependencies**: `useEventListener`
  - **Validation**: `SpacesFilesPanel`, `useSpacesFileContent`, `useSpacesFileTree` use the hook; debounce handled centrally
  - **Context**: Removes repeated listener code and timers

- [ ] **Extract** shared mindmap utils (`normalizeOp`, `edgeKey`)
  - **Files**: `src/app/lib/spaces/mindmapUtils.ts`, refactor `useSpacesMindMap`, `MindMapInspector`
  - **Dependencies**: None
  - **Validation**: Logic parity preserved; single source of truth for ops

- [ ] **Reshuffle** directories for clarity
  - **Files**: Move components to `components/ui`, `components/panes`, `components/modals`; hooks to `lib/ui`; constants/utils to `lib/spaces`
  - **Dependencies**: Update imports
  - **Validation**: Build passes; imports resolve

### Phase 4: Visual Consistency & Icons (Week 2)
**Goal**: Standardize icons and classes.

- [ ] **Standardize** on Radix icons (or a thin `Icon` wrapper)
  - **Files**: Replace inline `MicIcon`, `GearIcon` with Radix equivalents via `IconButton`
  - **Dependencies**: `@radix-ui/react-icons`
  - **Validation**: Visual parity; consistent sizing and color application

- [ ] **Adopt** `clsx` (+ optional `cva`) for variant classes
  - **Files**: Update `IconButton`, `ToggleGroup`, `Pane` variants
  - **Dependencies**: `clsx` (add dependency if not present)
  - **Validation**: Consistent variant naming and class application

### Phase 5: Performance, A11y, and Testing (Week 2)
**Goal**: Ensure quality with tests and guardrails; add opt-in performance improvement.

- [ ] **Optional**: Virtualize file list for large trees
  - **Files**: `SpacesFileTree.tsx` (conditional virtualization)
  - **Dependencies**: Consider `react-virtual` or simple windowing
  - **Validation**: Smooth scroll with >1k items; no selection regressions

- [ ] **A11y**: Focus management and ARIA roles for `Modal`, `ToggleGroup`, and `Tree`
  - **Files**: UI primitives and `SpacesFileTree`
  - **Dependencies**: None
  - **Validation**: Passes basic axe checks; keyboard navigation works

- [ ] **Tests**: Unit, integration, and E2E coverage
  - **Files**: `tests/ui/{modal,pane,toggle,toast}.unit.test.tsx`, `tests/ui/spaces-file-tree.unit.test.tsx`, `tests/e2e/ui-basic.spec.ts`
  - **Dependencies**: `@testing-library/react`, Playwright/Cypress (as available)
  - **Validation**: CI green; coverage added for primitives and migrations

## Technical Architecture

### Directory Structure (Target)
```
src/app/
  components/
    ui/
      Modal.tsx
      Pane.tsx
      ToggleGroup.tsx
      IconButton.tsx
      Loader.tsx
      ErrorMessage.tsx
      EmptyState.tsx
      ToastProvider.tsx
    panes/
      TranscriptPane.tsx    (migrated)
      MindMapInspectorPane.tsx
      SpacesFilesPane.tsx
    modals/
      SpacePickerModal.tsx  (migrated)
      SettingsModal.tsx
  contexts/
    UILayoutContext.tsx
  lib/
    ui/
      usePersistentState.ts
      useEventListener.ts
    spaces/
      constants.ts          (e.g., MINDMAP_VIRTUAL_PATH)
      mindmapUtils.ts       (normalizeOp, edgeKey, etc.)
      useSpaceFileSaved.ts
```

### Hook/Component Signatures (high-level)
```tsx
// Modal
type ModalProps = { isOpen: boolean; onClose: () => void; title?: string; size?: 'sm'|'md'|'lg' }; 
function Modal(props: ModalProps): JSX.Element

// Pane
type PaneProps = { children: React.ReactNode };
Pane.Header: (p: { title: string; actions?: React.ReactNode }) => JSX.Element
Pane.Body: (p: { children: React.ReactNode }) => JSX.Element
Pane.Footer: (p: { children?: React.ReactNode }) => JSX.Element

// ToggleGroup
type ToggleGroupProps = { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };

// IconButton
type IconButtonProps = { icon: React.ReactNode; variant?: 'ghost'|'primary'|'danger'; size?: 'sm'|'md'; ariaLabel: string };

// usePersistentState
function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void]

// useEventListener
function useEventListener<K extends keyof WindowEventMap>(type: K, handler: (ev: WindowEventMap[K]) => any): void

// useSpaceFileSaved
function useSpaceFileSaved(spaceName: string | undefined, onFileSaved: (e: { spaceName: string; path: string }) => void, opts?: { debounceMs?: number }): void
```

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Existing Spaces tests remain green
  - **Files**: `tests/spaces/*`
  - **Risk**: Import path reshuffle could break tests
  - **Validation**: `npm test` succeeds; affected tests updated as needed

### New Tests Required
- [ ] Unit tests: `Modal`, `Pane`, `ToggleGroup`, `IconButton`, `ToastProvider`, `usePersistentState`
  - **Purpose**: Validate behavior and a11y basics; variant classes
  - **Implementation**: `@testing-library/react` with jest/jsdom
  - **Success Criteria**: Open/close, focus trap, role/labels, variant class assertions

- [ ] Unit test: `SpacesFileTree` keyboard navigation and selection
  - **Purpose**: Arrow keys, enter behavior
  - **Implementation**: Simulate keydown; assert selected item and callbacks
  - **Success Criteria**: Matches current behavior

- [ ] Integration/E2E: Basic navigation through modals and panes
  - **Purpose**: Ensure migrations didn’t regress UX
  - **Implementation**: Playwright/Cypress (if configured)
  - **Success Criteria**: Open/close Space Picker; toggle panes; copy transcript

### Test Documentation Updates
- [ ] Update domain test docs if present; otherwise add brief coverage notes in this plan’s follow-up PR description

## Risk Assessment & Dependencies

### High Risk: Behavioral Regressions
- **Risk**: Migrations subtly change keyboard or focus behavior
- **Mitigation**: Add a11y-focused unit tests; manual keyboard QA; axe checks
- **Contingency**: Feature flags/scoped rollout of primitives per pane

### Medium Risk: Scope Creep
- **Risk**: Expanding into design overhaul
- **Mitigation**: Keep visuals as-is; focus on structure and consistency
- **Contingency**: Split follow-up plan for visual changes

### Medium Risk: Import Path Churn
- **Risk**: Directory reshuffle breaks imports
- **Mitigation**: Batch refactors with TS compile checks; incremental PRs
- **Contingency**: Use index barrels temporarily during transition

### Dependencies & Integration Points
- [ ] `clsx` (and optional `class-variance-authority`) for variants
- [ ] `@radix-ui/react-icons` for icon consistency
- [ ] Existing Tailwind config and styles

## Discussion & Decision Context

### Alternative Approaches Considered
- **Component library adoption** (e.g., Radix UI Primitives, HeadlessUI)
  - **Pros**: Mature a11y, quicker
  - **Cons**: Bundle size, styling alignment, dependency lock-in
  - **Decision**: Start with light custom primitives; revisit library adoption later

- **Keep ad-hoc components**
  - **Pros**: Zero migration effort
  - **Cons**: Ongoing duplication and inconsistency
  - **Decision**: Not chosen; consolidation is needed now

### Context & Timing
- Work reduces maintenance friction and accelerates Spaces features in near term.

### Future Considerations
- Theming system and design tokens; potential migration to a headless component library if needed.

## Timeline & Deliverables

### Week 1
- [ ] Phase 1 completed (primitives, hooks)
- [ ] Phase 2 migrations for `SpacePickerModal`, Toolbar Settings, `Transcript`

### Week 2
- [ ] Phase 2 migrations for `MindMapInspector`, `SpacesFilesPanel`
- [ ] Phase 3 utilities, constants, event hook, directory reshuffle
- [ ] Phase 4 icon and variant consolidation
- [ ] Phase 5 tests and a11y checks

## Final Completion Criteria
- [ ] All primitives implemented and adopted by target components
- [ ] No remaining duplicated modal/header/toggle/toast patterns
- [ ] Tests added and passing; CI green
- [ ] a11y scans pass for modals/toggles/trees
- [ ] Documentation updated (this plan and PR notes)


