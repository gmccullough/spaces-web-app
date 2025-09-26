# 20250917-spaces-file-model

## Executive Summary
**Objective**: Define and surface a file-based Space model as the top-level UX unit.
**Impact**: All web/chat interactions start with a Space; consistent context drives navigation and prompting.
**Approach**: Manifest-driven discovery under `/data/<user-id>/<space-name>/manifest.json`; require `index.md` for file spaces. Client selects a Space and renders `index.md` content.

## Scope & Constraints
### In Scope
- [x] Space discovery: list file spaces for the authenticated user via API
- [x] Manifest schema with `type: "file" | "ideation"` (focus shipped: file)
- [x] Require `index.md` for file spaces; render description
- [x] Space picker page (read-only) listing file spaces
- [x] Persist selected Space (localStorage) and expose via context

### Out of Scope
- [x] Space creation from web (MCP only)
- [x] Ideation Space sitemap UI (kept existing)

### Success Criteria
- [x] Selecting a Space is required before viewing content
- [x] Selected Space persists across reload
- [x] Manifest drives UI without server writes

## Implementation

### Discovery & Schema Validation
- API: `GET /spaces/list` (authenticated)
  - Lists file spaces for `current_user.id`
  - Validates each `manifest.json` against `docs/schemas/space_manifest.json` via `json_schemer`
  - Enforces `type == "file"` and presence of `index.md`
  - Response includes `errors` array; returns 422 when no valid spaces and only invalids
- Files:
  - `web/app/controllers/api/spaces_controller.rb`
  - `docs/schemas/space_manifest.json`

### SPA Picker & Rendering
- Route: `/spaces` (behind client AuthGuard)
- Components:
  - SpacePicker: `web/app/react/src/routes/spaces/index.tsx`
  - ActiveSpace context: `web/app/react/src/context/ActiveSpace.tsx`
  - Index renderer: `web/app/react/src/routes/spaces/view.tsx` using `marked` + `DOMPurify`
- Behavior:
  - Fetch `/spaces/list`, humanize names, store selection, render `index.md`
  - Loading/error states added; no writes

### Auth & Layout
- Root `/` redirects to `/spaces` when authenticated (`/ui/session/status`)
- Header shows title + auth actions; breadcrumb visible; centered panel layout on large screens
- Devise pages styled with Tailwind; constrained card width and top spacing

## Testing
- Manual + headed Playwright verification for auth flow and picker
- Server-side validation exercised via API responses (`errors`, 422 on full invalid set)

## Risks & Mitigations
- Directory scan cost → shallow scan, per-user, client cache
- Manifest drift → schema validation with explicit errors
- Auth state → client uses `/ui/session/status`; server guards API

## Completion Checklist
- [x] Spaces list derived from manifests under `/data/<user-id>`
- [x] Picker shows humanized names; user id hidden
- [x] Selecting a space renders `index.md`
- [x] Read-only; no writes from UI
- [x] JSON Schema documented and validated server-side

## Notes & Follow-ups
- Optional: add Mermaid rendering when present in `index.md`
- Optional: CI test wiring for containerized Rails tests
