# TODO - Spaces Picker Modal and Header Flow

## Executive Summary & Scope
**Objective**: Replace the current spaces dropdown with a breadcrumb header "Spaces > [space name]" and a Space Picker modal shown on first load (before conversation init). Modal offers an oversized "Just talk" button and a chronologically sorted list of existing spaces (newest → oldest). Selection gates conversation initialization: "Just talk" follows today’s default flow; selecting a space primes the conversation with that space.

**Out of scope**: Creating spaces in this UI (creation remains a conversation action), unrelated styling refactors, cross-tab persistence beyond current session.

**Key requirements (confirmed)**
- Header: "Spaces > [space name]"; clicking "Spaces" opens picker modal.
- First page load: modal opens automatically, blocks until a selection is made; not dismissible.
- After a conversation has started: modal acts as a switcher and is dismissible (outside click and Escape).
- Source of truth: existing `GET /api/spaces`.
- Ordering: newest to oldest.
- Empty state: show only the "Just talk" primary button.
- Accessibility: true dialog semantics, focus trap, keyboard support (Tab, Shift+Tab, Enter/Space, Escape when allowed).
- Space name max display length: 200 chars (truncate with ellipsis, show full in tooltip/title attribute).
- No "create new space" affordance in this UI.

## Implementation Plan

### Phase 1: Foundation and UX wiring
- [ ] Add `SpaceSelectionContext` to manage selection and gating state: `selectedSpace`, `hasMadeInitialSelection`, `isFirstLoadBlocking`, `openPicker()`, `closePicker()`, `selectJustTalk()`, `selectSpace()`.
- [ ] Render breadcrumb header `Spaces > [Selected or "Just talk"]` in the main layout.
- [ ] Make the `Spaces` crumb a button with proper keyboard and ARIA labeling to open the modal.
- [ ] Ensure SSR/CSR alignment to avoid flicker: initial `isFirstLoadBlocking` computed before conversation init.

### Phase 2: Space Picker Modal component
- [ ] Create `SpacePickerModal` with dialog semantics (role, aria-labelledby, focus trap, return-focus-on-close).
- [ ] Oversized primary button at top: "Just talk".
- [ ] Below, clickable rows for spaces (newest → oldest).
- [ ] Truncate names beyond 200 chars with ellipsis; show full value on hover via `title`.
- [ ] Row click selects the space and closes modal.
- [ ] First load: non-dismissible (disable outside click/Escape; no close button).
- [ ] In-conversation: allow dismiss via outside click and Escape.

### Phase 3: Data fetching and sorting
- [ ] Implement `useSpacesList()` (or extend existing client) to call `GET /api/spaces`.
- [ ] Sort newest → oldest using a timestamp field (prefer `createdAt`, fallback `updatedAt` if needed).
- [ ] Surface loading and error states visibly (fail fast and visibly per dev rules).
- [ ] Empty list: only show the "Just talk" button.

### Phase 4: Conversation gating and priming
- [ ] Block conversation/session initialization until `hasMadeInitialSelection === true`.
- [ ] "Just talk": initialize conversation exactly as today with `selectedSpace = null`.
- [ ] Selecting a space: set `selectedSpace = { id, name }` and pass into the existing initialization/priming path (e.g., supervisor input/context).
- [ ] Guard consumers that assume initialized session (events, transcripts, file panel) until selection.

### Phase 5: Remove dropdown and finalize header
- [ ] Remove existing spaces dropdown from UI (e.g., in `SpacesFilesPanel.tsx` or related).
- [ ] Replace with header crumb + modal trigger.
- [ ] Remove unused props/state and dead code.

### Phase 6: Styling, accessibility, and polish
- [ ] Keyboard: Tab order, Enter/Space activation on rows/buttons, Escape (when allowed).
- [ ] ARIA: labelled dialog, focus trap, announcement on open/close, restore focus to trigger.
- [ ] Responsive layout; long lists scroll; maintain oversized CTA prominence.
- [ ] Align visuals with current design tokens/components.

### Phase 7: Testing
- [ ] Unit tests: sorting newest → oldest; name truncation; gating state machine transitions.
- [ ] Integration tests: `useSpacesList()` calls `GET /api/spaces`; error surfaced; empty state renders only "Just talk".
- [ ] E2E tests: 
  - [ ] First-load: modal opens, is non-dismissible, and blocks until selection.
  - [ ] "Just talk": starts default conversation.
  - [ ] Space selection: primes conversation with that space.
  - [ ] After init: modal can be reopened via header, dismissible via outside click/Escape; header shows `Spaces > [name]` or `Spaces > Just talk`.

## Technical Architecture

### Components & Hooks
- `SpaceSelectionContext`
  - State: `selectedSpace: { id: string; name: string } | null`, `hasMadeInitialSelection: boolean`, `isFirstLoadBlocking: boolean`.
  - Actions: `selectJustTalk()`, `selectSpace(space)`, `openPicker()`, `closePicker()`.
- `SpacePickerModal`
  - Props: `isOpen`, `isBlocking`, `onSelectJustTalk`, `onSelectSpace`, `spaces`, `loading`, `error`.
- `useSpacesList()`
  - Returns: `{ spaces, loading, error }` with newest → oldest ordering.

### Conversation integration points
- Gate conversation init in the bootstrap path (e.g., `useRealtimeSession` or equivalent) until selection occurs.
- Pass selected space context into the supervisor/assistant initialization path to prime the conversation.

### Data contracts
- `GET /api/spaces` must expose a sortable timestamp (`createdAt` preferred). If only IDs/names are returned, sort using provided timestamp field or adjust API to include one.

## Testing Strategy Integration
- Maintain all existing tests.
- Add unit/integration/E2E per Phase 7; include test IDs for modal elements/rows.
- Verify non-dismissible behavior on first load consistently.
- Optionally run axe checks for dialog a11y in tests if feasible.

## Risk Assessment & Dependencies
**Risks**
- Early session initialization assumptions could lead to race conditions. Mitigation: explicit gating flag and null guards.
- API may not provide `createdAt`. Mitigation: use `updatedAt` or adjust API; document choice.
- SSR/CSR mismatch may cause UI flicker. Mitigation: derive initial blocking state before any init side effects.

**Dependencies**
- Spaces API client/utilities (e.g., `src/app/lib/spaces/client.ts`).
- Session/event initialization flows (e.g., `useRealtimeSession`, `EventContext`).

## Discussion & Decision Context
- Ordering: newest → oldest (confirmed).
- Data source: existing `GET /api/spaces` (confirmed).
- Empty state: only "Just talk" (confirmed).
- First-load: non-dismissible until choice (confirmed).
- Dismiss after init: outside click and Escape (confirmed).
- Accessibility: full dialog semantics (confirmed).
- Name length: 200 chars max display with tooltip (confirmed).
- No create-space in this UI (confirmed).

## Completion Criteria & Timeline
- [ ] Header shows `Spaces > [space name]` or `Spaces > Just talk`.
- [ ] Picker opens on first load, blocks until selection; non-dismissible on first load.
- [ ] "Just talk" initializes current default conversation flow.
- [ ] Selecting a space primes conversation with that space.
- [ ] Spaces list is newest → oldest; empty state shows only "Just talk".
- [ ] Old dropdown removed; no dead code left behind.
- [ ] Accessibility verified (keyboard + ARIA semantics).
- [ ] Unit, integration, and E2E tests added and passing.
- [ ] Architecture/product docs updated as needed.

> See `specs/architecture/application-components.md` for UI context and `specs/work-plans/README.md` for process guidance.
