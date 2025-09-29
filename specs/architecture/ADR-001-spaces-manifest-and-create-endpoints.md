# ADR-001: Spaces manifest and create/list endpoints

## Status
Accepted

## Context
We need reliable ordering of Spaces by recent activity, explicit space creation for future initialization, and an agent flow that requires selecting a Space at the start.

## Decision
- Store a `manifest.json` at `users/{userId}/Spaces/{name}/manifest.json` containing `version`, `name`, `created_at`, and `last_updated_at`.
- Add POST `/api/spaces` to create a space by writing the manifest (idempotent).
- Update GET `/api/spaces` to read `last_updated_at` from the manifest and sort by recency; if missing, compute from files once and persist a manifest.
- Bump `last_updated_at` after each successful write in `/api/spaces/[name]/files/*`.
- Add agent tools `list_space_names` and `create_space` and update prompts to enforce Space selection at session start.

## Consequences
### Positive
- O(1) metadata read for recency; avoids recursive scans.
- Explicit create step enables seeded content later.
- Agent UX improves with clear Space selection.

### Negative
- Additional object read/writes for manifests.
- Potential races on concurrent writes (acceptable: last-writer-wins).

## Alternatives Considered
- Derive recency via recursive listing each time: simpler but inefficient at scale.
- Track activity in a DB table: more control, but additional infra and consistency complexity.


