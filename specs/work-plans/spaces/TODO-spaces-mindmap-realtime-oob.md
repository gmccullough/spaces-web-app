## Executive Summary
**Objective**: Add a per-space realtime mind map powered by out-of-band (OOB) model responses that emit lightweight diffs after every turn, with a simple viewer and a save flow to persist a consolidated snapshot to Supabase storage.

**Impact**: Enables live visualization of key ideas and their relationships during conversations, improving comprehension and navigation without interrupting primary chat.

**Approach**: Trigger an OOB `response.create` after each turn with full conversation context plus prior `mindmap.json` snapshot. The model returns a minimal JSON diff (nodes/edges add/update/remove). The client applies diffs to an in-memory graph (ID-less until persisted). Every 5 diffs, the agent asks to save; on confirmation, persist a single `mindmap.json` snapshot to Supabase.

## Scope & Constraints
### In Scope
- [ ] Realtime OOB analysis after every turn, full conversation context (for now)
- [ ] OOB channel naming and filtering by current space
- [ ] Diff JSON schema (no IDs while unpersisted; labels as keys)
- [ ] Single-file persistence: `spaces/<space-name>/mindmap/mindmap.json`
- [ ] Load prior `mindmap.json` at conversation start as context and local state
- [ ] Viewer: mind map graph in right-side preview; zoom only (no edits)
- [ ] File explorer: special virtual link "Mind Map" for the current space
- [ ] Save flow: "save these ideas" command and periodic prompt after 5 diffs
- [ ] ID assignment on save; stable IDs stored only in snapshot

### Out of Scope (for now)
- [ ] Interactive editing in UI (add/delete/rename nodes/edges)
- [ ] Security/privacy, cost/perf optimization, metrics/alerts, feature flags
- [ ] Undo; separate node/edge files; delta logs (may add later)

### Success Criteria
- [ ] After each turn, client receives OOB event on the mind map channel with valid JSON diff that passes schema validation
- [ ] Viewer updates visually from diffs without page reload; no blocking of main assistant reply
- [ ] On prompt after 5 diffs or user command, snapshot is persisted to `mindmap.json` with stable IDs and updated timestamp
- [ ] On new conversation in same space, prior `mindmap.json` loads and informs OOB concept-matching
- [ ] Channel filtering ensures only events for the active space are applied

---

## Implementation Plan

### Phase 1: Foundations (Schema, Paths, Storage)
- [ ] **Define** **MindMap Diff Schema** - Minimal ID-less ops for realtime
  - **Files**: `src/app/lib/spaces/types.ts` (add types), `src/app/lib/spaces/paths.ts` (add mindmap path const)
  - **Dependencies**: None
  - **Validation**: Types compile; schema examples validate
  - **Context**: Aligns with OOB structured outputs; labels used as keys

- [ ] **Add** **MindMap Snapshot Schema** - Persisted graph structure
  - **Files**: `src/app/lib/spaces/types.ts`
  - **Dependencies**: Diff schema
  - **Validation**: Can serialize/deserialize snapshot; includes `schema_version: "1"`, `space_name`, `updated_at`, `nodes[]`, `edges[]`
  - **Context**: Persist as single file per space

- [ ] **Extend** **Spaces Paths & Storage** - Mind map file utilities
  - **Files**: `src/app/lib/spaces/paths.ts`, `src/app/lib/spaces/storage.ts`
  - **Dependencies**: Supabase client utils
  - **Validation**: `getMindMapPath(spaceName)` returns `spaces/<space-name>/mindmap/mindmap.json`
  - **Context**: Centralized pathing for consistency

### Phase 2: Realtime OOB Integration
- [ ] **Add** **OOB Channel Constants** - Channel + metadata keys
  - **Files**: `src/app/lib/spaces/types.ts` (constants)
  - **Dependencies**: Realtime session hook
  - **Validation**: Constants used across hook and UI
  - **Context**: `channel: "spaces-mindmap"`, metadata includes `spaceName`

- [ ] **Trigger** **OOB Requests After Each Turn** - Full context + prior snapshot
  - **Files**: `src/app/hooks/useRealtimeSession.ts`
  - **Dependencies**: Transcript/session APIs
  - **Validation**: OOB `response.create` fires after both user and assistant turns; includes `metadata.channel`, `metadata.spaceName`
  - **Context**: Does not interfere with primary assistant response

- [ ] **Enforce** **Structured Outputs** - JSON schema contract
  - **Files**: `src/app/hooks/useRealtimeSession.ts`
  - **Dependencies**: Diff schema definition
  - **Validation**: Non-conforming payloads ignored with visible dev log
  - **Context**: Reliability for renderer

- [ ] **Implement** **OOB Event Filter & Reducer** - Apply diffs in-memory
  - **Files**: `src/app/hooks/useRealtimeSession.ts`, `src/app/hooks/useSpacesMindMap.ts` (new)
  - **Dependencies**: Diff schema; space context
  - **Validation**: Only events where `metadata.channel === "spaces-mindmap"` and `metadata.spaceName === currentSpaceName` are reduced
  - **Context**: Maintains ID-less graph; determines existing vs new concept by label match

### Phase 3: Viewer & File Explorer Integration
- [ ] **Create** **MindMapViewer** - Zoom-only mind map renderer
  - **Files**: `src/app/components/MindMapViewer.tsx` (new)
  - **Dependencies**: `react-force-graph` (or alternative), mind map state hook
  - **Validation**: Renders nodes/edges; supports zoom in/out; updates on diffs
  - **Context**: Lightweight visualization without interactivity

- [ ] **Add** **Special File Link** - "Mind Map" virtual entry in explorer
  - **Files**: `src/app/components/SpacesFileTree.tsx`, `src/app/components/SpacesFileViewer.tsx`
  - **Dependencies**: Viewer component; routing to right-side preview
  - **Validation**: Clicking "Mind Map" shows viewer in preview pane for the active space
  - **Context**: Mirrors file opening UX, but data comes from in-memory + snapshot

### Phase 4: Save Flow & Cadence
- [ ] **Track** **Diff Count & Prompt** - Ask after 5 diffs
  - **Files**: `src/app/hooks/useSpacesMindMap.ts` (diff counter), `src/app/hooks/useRealtimeSession.ts` (agent ask)
  - **Dependencies**: OOB/assistant messaging patterns
  - **Validation**: After 5 applied diffs, agent asks: "Save these ideas?"
  - **Context**: Non-blocking; user can dismiss/ignore

- [ ] **Implement** **Save Command** - Consolidate and persist snapshot
  - **Files**: `src/app/hooks/useSpacesMindMap.ts` (consolidation), `src/app/lib/spaces/storage.ts` (persist)
  - **Dependencies**: Supabase storage (If-Match/ETag), current snapshot load
  - **Validation**: Assign stable IDs, write `mindmap.json`, refresh in-memory from saved snapshot
  - **Context**: Single authoritative snapshot; create file if missing by default

### Phase 5: Stabilization & Edge Cases
- [ ] **Handle** **Label Collisions** - Update vs. new label policy
  - **Files**: Reducer logic in `useSpacesMindMap.ts`
  - **Dependencies**: Diff ops semantics
  - **Validation**: If `add_node` collides, treat as `update_node` unless clearly distinct (suffix client-side e.g., "Label (2)")
  - **Context**: Keeps model simple; avoids duplicate concepts

- [ ] **Salience** **Normalization (1–10)** - Relative to existing nodes
  - **Files**: Reducer logic; render scaling in viewer
  - **Dependencies**: OOB-provided salience
  - **Validation**: Visual weight reflects relative salience consistently
  - **Context**: Agent determines value; client respects as-is

- [ ] **Add** **Optimistic Concurrency** - Use ETags
  - **Files**: `src/app/lib/spaces/storage.ts`
  - **Dependencies**: Supabase headers
  - **Validation**: On conflict, retry with latest snapshot merge or prompt user
  - **Context**: Minimizes race conditions for single-file snapshot

---

## Technical Architecture

### Data Contracts
```json
// OOB Diff (ID-less)
{
  "ops": [
    { "type": "add_node", "label": "...", "summary": "...", "keywords": ["..."], "salience": 7 },
    { "type": "update_node", "label": "...", "summary": "...", "keywords": ["..."], "salience": 5 },
    { "type": "add_edge", "sourceLabel": "A", "targetLabel": "B", "relation": "related", "confidence": 0.7 },
    { "type": "remove_edge", "sourceLabel": "A", "targetLabel": "B", "relation": "related" }
  ]
}

// Persisted Snapshot
{
  "schema_version": "1",
  "space_name": "<space-name>",
  "updated_at": "<iso>",
  "nodes": [ { "id": "n1", "label": "...", "summary": "...", "keywords": [], "salience": 7 } ],
  "edges": [ { "id": "e1", "sourceId": "n1", "targetId": "n2", "relation": "related", "confidence": 0.7 } ]
}
```

### Realtime OOB
- **Channel**: `spaces-mindmap`
- **Metadata**: `{ spaceName: "<current-space-name>" }`
- **Filtering**: Client reduces events only when `metadata.channel === "spaces-mindmap"` and `metadata.spaceName === currentSpaceName`
- **Trigger**: After every user and assistant turn
- **Context fed to model**: Full conversation (for now) + distilled or full `mindmap.json`

### Service/Hook Interfaces (signatures)
```ts
// OOB trigger and handler
function requestMindMapOOBAnalysis(params: { spaceName: string; conversationMessages: any[]; priorSnapshot?: MindMapSnapshot }): void

function applyMindMapDiff(state: MindMapState, diff: MindMapDiff): MindMapState

// Persistence
function loadMindMapSnapshot(spaceName: string): Promise<MindMapSnapshot | null>
function saveMindMapSnapshot(spaceName: string, state: MindMapState): Promise<MindMapSnapshot>

// Viewer state
function useSpacesMindMap(spaceName: string): { state: MindMapState; applyDiff: (d: MindMapDiff) => void; diffCount: number; resetDiffCount: () => void }
```

### Storage Layout (Supabase Storage)
- `spaces/<space-name>/mindmap/mindmap.json` (created by default if missing)
- Use `If-Match` with ETag for updates when available

### UI Integration
- Special virtual file entry "Mind Map" in explorer for the active space
- Right-side preview renders `MindMapViewer` (zoom only)
- Rendering library: `react-force-graph` (2D) or `graphology + sigma` (choose one; initial: `react-force-graph`)

---

## Testing Strategy
Note: We are in dev; minimal automated testing now, but include basic coverage anchors for future.

### Tests That Must Pass for Completion
- [ ] Existing spaces storage/path unit tests remain green (no regressions)

### New Tests (lightweight, optional in dev)
- [ ] **Unit**: Path helper for mind map file returns correct path
- [ ] **Unit**: Diff reducer applies `add_node`, `update_node`, `add_edge`, `remove_edge` as expected
- [ ] **Integration**: Load-then-save snapshot roundtrip preserves data shape

### Test Documentation Updates
- [ ] Update `specs/product/example-domain/tests.md` later if this becomes a covered domain

---

## Risk Assessment & Dependencies

### Risks
- **Schema conformance**: Non-JSON outputs from OOB → Mitigate with strict response_format and client validation
- **Label collisions**: Multiple concepts share label → Treat as update or suffix label client-side
- **Race conditions**: Concurrent saves → Use ETags and retry fetch-merge-save

### Dependencies
- Realtime session events and transcript hooks
- Supabase storage availability and ETag support
- React graph renderer library availability

---

## Discussion & Decision Context
- Lightweight realtime hints, per space, one large mind map entity
- Load `mindmap.json` as prior context at conversation start
- OOB returns diffs; trigger after every turn; full conversation context (for now)
- Agent determines existing concept vs new (label-based), chooses when to create new label
- Salience is 1–10, relative to existing items in the graph
- Save cadence: prompt after 5 diffs; on "save these ideas" persist full snapshot
- Single-file snapshot (`mindmap.json`), not separate node/edge files; create by default
- No UI edits; zoom-only viewer; no undo
- Space identity in filesystem uses `space-name`

---

## Timeline & Deliverables

### Phase 1 (Day 1)
- [ ] Types, paths, and storage helpers implemented

### Phase 2 (Day 2)
- [ ] OOB trigger, schema wiring, event filtering, and reducer

### Phase 3 (Day 3)
- [ ] Viewer and file explorer integration

### Phase 4 (Day 4)
- [ ] Save flow (ask after 5 diffs, consolidate, persist, reload)

### Phase 5 (Day 5)
- [ ] Stabilization: collisions, salience visuals, optimistic concurrency

### Final Completion Criteria
- [ ] OOB diffs apply live without disrupting main chat
- [ ] Mind map viewer renders and updates for the active space
- [ ] "Save these ideas" persists `mindmap.json` and reloads state
- [ ] Prior snapshot loads at conversation start and informs OOB analysis
- [ ] All in-scope items checked off above


