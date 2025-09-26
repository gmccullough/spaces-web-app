## Executive Summary
**Objective**: Implement Space-oriented UI: a Space Picker and Index renderer that consume backend Spaces endpoints and reflect the selected Space across the app.
**Impact**: Establishes Spaces as the top-level UX unit; all interactions occur within a selected Space; aligns with legacy design while fitting Next.js + Tailwind stack.
**Approach**: Build lightweight, testable components and hooks using TanStack Query for data, Zustand/Context for selection state, and secure API calls. Render `index.md` with Markdown + optional Mermaid.

## Scope & Constraints
### In Scope
- [ ] Space Picker page and components (read-only)
- [ ] ActiveSpace context/state with persistence
- [ ] Index renderer for selected Space (`index.md`)
- [ ] Error/loading/empty states; accessible UI
- [ ] Integration with Realtime bootstrap (selected Space required)

### Out of Scope
- [ ] Space creation from UI (admin-only via API for now)
- [ ] Ideation mode UI
- [ ] Large interactive graphs (fallback later via React Flow)

### Success Criteria
- [ ] User must select a Space before viewing content
- [ ] Selection persists across reload (localStorage)
- [ ] Picker lists only valid Spaces; errors surfaced clearly
- [ ] Index page renders Markdown safely with Mermaid support (optional toggle)

## Implementation Plan

### Phase 1: Data Hooks and State
**Goal**: Provide typed hooks and global state for Spaces.

- [ ] **Create** **useSpacesList() hook**
  - **Files**: `src/app/hooks/useSpacesList.ts`
  - **Dependencies**: TanStack Query; `/api/spaces/list`
  - **Validation**: Returns `{ spaces, isLoading, error }` with types; surfaces 401 as auth-required state
  - **Context**: Shared by picker and bootstrap flows

- [ ] **Create** **ActiveSpace context/state**
  - **Files**: `src/app/contexts/ActiveSpaceContext.tsx`
  - **Dependencies**: `localStorage`; React context
  - **Validation**: `useActiveSpace()` exposes `{ activeSpace, setActiveSpace, clearActiveSpace }`; clears on logout
  - **Context**: Stored in localStorage; hydrated on mount

### Phase 2: UI Components
**Goal**: Build Space Picker and UI primitives.

- [ ] **Add** **SpaceListItem**
  - **Files**: `src/app/components/SpaceListItem.tsx`
  - **Dependencies**: shadcn/ui or Tailwind primitives
  - **Validation**: Displays name and created_at; keyboard navigable

- [ ] **Add** **SpacePicker**
  - **Files**: `src/app/components/SpacePicker.tsx`
  - **Dependencies**: `useSpacesList`, `useActiveSpace`
  - **Validation**: Shows loading, error, empty states; selecting sets active space and routes
  - **Context**: Mirrors legacy picker behavior

- [ ] **Add** **ActiveSpaceGuard**
  - **Files**: `src/app/components/ActiveSpaceGuard.tsx`
  - **Dependencies**: `useActiveSpace`; Next navigation
  - **Validation**: Redirects to `/spaces` when no selection; otherwise renders children

### Phase 3: Pages & Routing (Behind Auth)
**Goal**: Wire routes and enforce selection.

- [ ] **Create** **/spaces page**
  - **Files**: `src/app/spaces/page.tsx`
  - **Dependencies**: `SpacePicker`
  - **Validation**: Accessible layout; responsive; matches app style; reachable only when authenticated (middleware + layout guard)

- [ ] **Create** **/spaces/view page**
  - **Files**: `src/app/spaces/view/page.tsx`
  - **Dependencies**: `ActiveSpaceGuard`, `IndexRenderer`
  - **Validation**: Renders selected Space index; handles errors; behind auth

### Phase 4: Index Rendering
**Goal**: Safely render Markdown with optional Mermaid.

- [ ] **Add** **IndexRenderer**
  - **Files**: `src/app/components/IndexRenderer.tsx`
  - **Dependencies**: `/api/spaces/manifest` (for title), `/api/files` (for index content) or local reader endpoint (all behind auth)
  - **Validation**: Uses `marked` + `DOMPurify`; Mermaid blocks optionally enabled
  - **Context**: Follow legacy renderer approach while matching current libs

### Phase 5: Realtime Integration
**Goal**: Ensure voice/realtime paths have an active Space.

- [ ] **Update** **session bootstrap**
  - **Files**: `src/app/hooks/useRealtimeSession.ts` (or wrapper)
  - **Dependencies**: `useActiveSpace`
  - **Validation**: Throws or prompts when no active Space; includes Space name in session metadata

## Technical Architecture

### Component Contracts
```typescript
type SpaceSummary = { name: string; path: string; created_at?: string };

// useSpacesList
function useSpacesList(): { spaces: SpaceSummary[] | undefined; isLoading: boolean; error?: Error };

// ActiveSpace context
type ActiveSpace = { name: string } | null;
function useActiveSpace(): { activeSpace: ActiveSpace; setActiveSpace: (s: ActiveSpace) => void; clearActiveSpace: () => void };
```

### Rendering Rules
- Render only after selection; guard routes that require Space context
- Escape HTML; sanitize Markdown output; do not execute scripts
- Mermaid rendering opt-in; detect ```mermaid blocks

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Picker requires selection before view renders
- [ ] Loading, empty, error states visible and accessible
- [ ] Selection persists and hydrates correctly
- [ ] Unauthorized users hitting /spaces or /spaces/view are redirected to /login

### New Tests Required
- [ ] **Unit**: `useSpacesList` query states
- [ ] **Unit**: `ActiveSpaceContext` persistence behavior
- [ ] **Integration**: Route guard redirects when no selection
- [ ] **Integration**: IndexRenderer renders Markdown and Mermaid
- [ ] **Integration**: Middleware redirects unauthenticated requests to /login for /spaces and /api/spaces/*

### Test Documentation Updates
- [ ] **Update** `specs/product/example-domain/tests.md` with Spaces UI coverage

## Risk Assessment & Dependencies

### Risks
- **Auth state mismatch** – Surface 401s; show sign-in prompt
- **XSS via Markdown** – Enforce sanitization; unit test injected content
- **Empty data** – Provide clear empty state; CTA to create Space (future)

### Dependencies
- Backend Spaces endpoints
- Supabase Auth; Next.js routing

## Timeline & Deliverables

### Week 1
- [ ] Hooks + context + SpacePicker
- [ ] Route guard + /spaces page

### Week 2
- [ ] IndexRenderer + /spaces/view
- [ ] Realtime bootstrap integration

## Final Completion Criteria
- [ ] Spaces UI flows operational end-to-end
- [ ] All tests pass; accessibility checks validated
- [ ] Documentation updated; contracts stable


