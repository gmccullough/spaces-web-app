# mcp-spaces-primitives-and-unified-prompts

## Executive Summary
**Objective**: Canonicalize Spaces in MCP (list/create/read/validate) and deliver a unified, MCP-aware prompt set (unified agent + file/ideation modes + selection flow) so both chat and web rely on one source of truth before the File Tree step.
**Impact**: Eliminates duplicate scanners, enforces manifest invariants, and standardizes chat flows; unblocks UI File Tree by providing stable discovery/creation and prompt behaviors.
**Approach**: Implement `spaces/*` primitives in MCP and author the unified prompt documents. Compute-heavy features (write events, graph/mermaid) are handled in later plans.

## Scope & Constraints
### In Scope
- [x] MCP Spaces primitives (user-scoped; no userId parameters)
  - `spaces.list_file_spaces()`
  - `spaces.list_ideation_spaces()`
  - `spaces.create_file_space({ name, description? })`
  - `spaces.read_manifest({ path })`, `spaces.validate_manifest({ manifest })`
- [x] MCP-native prompts & resources (server-provided)
  - Prompts: `start-ideation-session`, `file-mode-ops`, `ideation-mode-ops`
  - Resources: `guide://ideation/quick-start`, `guide://file-mode/quick-start`
  - Resource templates: `spaces://file/names`, `spaces://ideation/names`, `space://{spaceName}/manifest`, `space-index://{spaceName}`
- [x] Manifest schema reference and examples

### Out of Scope
- [ ] Write-event emission (covered in Live Edit plan)
- [ ] File graph + Mermaid tools (covered in Mermaid Sitemap plan)
- [ ] Directory tree helper (optional in File Tree plan)
- [ ] Any UI implementation (read-only UI plans own that work)
- [ ] Maintaining large standalone prompt markdown files as active system prompts (will be archived as examples)

### Success Criteria
- [ ] MCP exposes `spaces/*` tools with tests and stable contracts
- [ ] File space creation writes valid `manifest.json` + stub `index.md`
- [ ] MCP prompts and resources published via prompts/list, prompts/get, resources/list/templates
- [ ] Legacy prompt markdown files archived as examples

## Implementation Plan

### Phase 1: Manifest Schema & Examples
- [x] **Define** **Space manifest schema**
  - **Files**: `specs/architecture/space-manifest.schema.json`, example manifests under `/data/<user-id>/*/manifest.json`
  - **Validation**: Schema enforces `{ name, type: "file", created_at }` and optional `description`
  - **Context**: Referenced by MCP validation and Rails UI validation

### Phase 2: MCP Spaces Primitives
- [x] **Implement** **list file spaces** – `spaces.list_file_spaces({ userId })`
  - **Files**: MCP server
  - **Dependencies**: Path normalization; shallow scan for `manifest.json`; `index.md` presence
  - **Validation**: Returns `[{ name, path, created_at }]`; invalid manifests excluded

- [x] **Implement** **list file spaces** – `spaces.list_file_spaces()`
  - **Files**: MCP server
  - **Dependencies**: Scope to current authorized user; shallow scan for `manifest.json`; `index.md` presence
  - **Validation**: Returns `[{ name, path, created_at }]`; invalid manifests excluded

- [x] **Implement** **list ideation spaces** – `spaces.list_ideation_spaces()`
  - **Files**: MCP server
  - **Dependencies**: Scope to current authorized user; presence of `/concepts` directory
  - **Validation**: Returns `[{ name, path }]`

- [x] **Implement** **create file space** – `spaces.create_file_space({ name, description? })`
  - **Files**: MCP server
  - **Dependencies**: Scope to current authorized user; normalize + create dirs; write minimal `manifest.json`; stub `index.md`
  - **Validation**: Returns `{ path, manifestPath, indexPath }`; `validate_manifest` passes

- [x] **Implement** **read + validate manifest** – `spaces.read_manifest`, `spaces.validate_manifest`
  - **Files**: MCP server
  - **Validation**: Deterministic diagnostics with stable error codes/messages

### Phase 3: MCP Prompts & Resources (Server-Provided)
- [x] **Publish** **Prompts** – `start-ideation-session`, `file-mode-ops`, `ideation-mode-ops`
  - **Behavior**: User-invoked entry points with typed args; guide Space selection/creation and mode-specific ops
  - **Validation**: Discoverable via `prompts/list`; retrievable via `prompts/get`; argument schemas validated

- [x] **Publish** **Resources** – Compact guides
  - **URIs**: `guide://ideation/quick-start`, `guide://file-mode/quick-start`
  - **Validation**: Discoverable via `resources/list`; MIME type `text/markdown`

- [x] **Publish** **Resource Templates** – Name discovery & Space docs
  - **URIs**: `spaces://file/names`, `spaces://ideation/names`, `space://{spaceName}/manifest`, `space-index://{spaceName}`
  - **Validation**: Discoverable via `resources/templates/list`; arguments support completion (spaceName)

- [x] **Archive** legacy prompt markdown under `prompts/examples/`
  - **Validation**: MCP prompts/resources are the canonical entry points

## Technical Architecture

### Tool Signatures
```javascript
spaces.list_file_spaces() -> [{ name, path, created_at }]
spaces.list_ideation_spaces() -> [{ name, path }]
spaces.create_file_space({ name, description? }) -> { path, manifestPath, indexPath }
spaces.read_manifest({ path }) -> { manifest }
spaces.validate_manifest({ manifest }) -> { valid: boolean, errors: [{ path, message }] }
```

### MCP Tool Definitions (concise JSON Schemas)
```json
{
  "name": "spaces.list_file_spaces",
  "description": "List file spaces for the current user. Use first when selecting a Space. See guide://file-mode/quick-start.",
  "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
  "output": {
    "type": "object",
    "properties": {
      "spaces": {
        "type": "array",
        "items": { "type": "object", "properties": { "name": { "type": "string" }, "path": { "type": "string" }, "created_at": { "type": "string", "format": "date-time" } }, "required": ["name","path"] }
      },
      "nextSteps": { "type": "array", "items": { "type": "string" }, "description": "Hints like: selectSpace, createSpace" },
      "resourceLinks": { "type": "array", "items": { "type": "string" }, "description": "URIs like guide://file-mode/quick-start" }
    },
    "required": ["spaces"]
  }
}
```

```json
{
  "name": "spaces.create_file_space",
  "description": "Create a new file space for the current user (writes manifest.json and stub index.md). Use only when the user explicitly requests creation. See guide://file-mode/quick-start.",
  "inputSchema": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" } }, "required": ["name"] },
  "output": {
    "type": "object",
    "properties": {
      "path": { "type": "string" },
      "manifestPath": { "type": "string" },
      "indexPath": { "type": "string" },
      "nextSteps": { "type": "array", "items": { "type": "string" }, "description": "e.g., openIndex, validateManifest" },
      "resourceLinks": { "type": "array", "items": { "type": "string" }, "description": "e.g., space-index://{spaceName}, space://{spaceName}/manifest" }
    },
    "required": ["path","manifestPath","indexPath"]
  }
}
```

```json
{
  "name": "spaces.read_manifest",
  "description": "Read a Space manifest.json. See guide://file-mode/quick-start.",
  "inputSchema": { "type": "object", "properties": { "path": { "type": "string" } }, "required": ["path"] },
  "output": {
    "type": "object",
    "properties": {
      "manifest": { "type": "object" },
      "relatedResources": { "type": "array", "items": { "type": "string" }, "description": "URIs like space-index://{spaceName}" }
    },
    "required": ["manifest"]
  }
}
```

```json
{
  "name": "spaces.validate_manifest",
  "description": "Validate a Space manifest against server schema. Show concise errors and remediation guides.",
  "inputSchema": { "type": "object", "properties": { "manifest": { "type": "object" } }, "required": ["manifest"] },
  "output": {
    "type": "object",
    "properties": {
      "valid": { "type": "boolean" },
      "errors": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string" }, "message": { "type": "string" } }, "required": ["message"] } },
      "hintResources": { "type": "array", "items": { "type": "string" }, "description": "URIs like guide://file-mode/quick-start" }
    },
    "required": ["valid","errors"]
  }
}
```

### MCP Prompts (user-invoked)
```json
{
  "name": "start-ideation-session",
  "title": "Start Ideation Session",
  "description": "Pick or create a Space, then proceed in file or ideation mode with small, confirmed steps. See guide://ideation/quick-start and guide://file-mode/quick-start. Use spaces://file/names and spaces://ideation/names for completion.",
  "arguments": [
    { "name": "mode", "type": "string", "enum": ["file","ideation"], "required": false },
    { "name": "space", "type": "string", "required": false },
    { "name": "create", "type": "object", "required": false, "properties": { "type": { "type": "string", "enum": ["file","ideation"] }, "name": { "type": "string" }, "description": { "type": "string" } } }
  ]
}
```

```json
{
  "name": "file-mode-ops",
  "title": "File Mode: Read & Edit",
  "description": "Operate in a file Space using FS/Editor tools (FS/Editor only). Use small, confirmed writes and compact summaries. Mermaid updates are explicit via files.* tools on request. See guide://file-mode/quick-start.",
  "arguments": [
    { "name": "space", "type": "string", "required": true },
    { "name": "intent", "type": "string", "required": true },
    { "name": "path", "type": "string", "required": false },
    { "name": "section", "type": "string", "required": false }
  ]
}
```

```json
{
  "name": "ideation-mode-ops",
  "title": "Ideation Mode: Concepts & Relations",
  "description": "Propose → confirm → apply concept/relationship changes; regenerate outputs after writes. See guide://ideation/quick-start.",
  "arguments": [
    { "name": "space", "type": "string", "required": true },
    { "name": "concepts", "type": "array", "required": false },
    { "name": "relations", "type": "array", "required": false }
  ]
}
```

### MCP Resources
Direct, read-only resources (user-scoped; no userId arguments):
```json
{
  "uri": "guide://ideation/quick-start",
  "name": "ideation-quick-start",
  "title": "Ideation Quick Start",
  "description": "A compact (≈10 lines) guide for propose→confirm→apply, small diffs, and index regeneration.",
  "mimeType": "text/markdown",
  "exampleContent": "## Ideation Quick Start\n1) Summarize intent.\n2) Propose concepts/relations as bullets.\n3) Ask to proceed.\n4) Apply on yes; regenerate index/diagram.\n5) Report compact delta; offer next steps.\n"
}
```

```json
{
  "uri": "guide://file-mode/quick-start",
  "name": "file-mode-quick-start",
  "title": "File Mode Quick Start",
  "description": "Operate in a file Space using FS/Editor; confirm paths; make small, targeted writes; summarize changes.",
  "mimeType": "text/markdown",
  "exampleContent": "## File Mode Quick Start\n- List or open files, then propose precise edits.\n- Confirm absolute virtual paths before writing.\n- Use small patches; summarize edits in ≤1 line.\n- Mermaid generation is explicit and on request.\n"
}
```

Quick actions (direct resources):
```json
{
  "uri": "guide://actions/file-mode",
  "name": "actions-file-mode",
  "title": "File Mode Quick Actions",
  "description": "Map common intents to tools (read/edit/index).",
  "mimeType": "text/markdown",
  "exampleContent": "- Show root → fs.list_directory({ path: "/" })\n- Open index → fs.read_text_file({ path: "/<space>/index.md" })\n- Add section → editor.edit_text_file_contents(...)\n- Build sitemap → files.build_link_graph → files.generate_mermaid → files.update_index_mermaid\n"
}
```

```json
{
  "uri": "guide://actions/ideation",
  "name": "actions-ideation",
  "title": "Ideation Quick Actions",
  "description": "Map common ideation intents to tools (upsert/relate/regen).",
  "mimeType": "text/markdown",
  "exampleContent": "- Ensure space → ideation.ensure_space({ name })\n- Add concept → ideation.upsert_concept({ space, title, summary })\n- Link concepts → ideation.add_relation({ space, source_slug, type, target_slug })\n- Refresh outputs → ideation.regenerate_index + ideation.generate_mermaid\n"
}
```

Resource templates (user-scoped; parameters do not include userId):
```json
{
  "uriTemplate": "spaces://file/names",
  "name": "spaces-file-names",
  "title": "File Space Names",
  "description": "Enumerate file Space names for the current user (for completion and pickers).",
  "mimeType": "application/json",
  "parameters": [],
  "exampleOutput": { "names": ["project-alpha", "personal-notes"] }
}
```

```json
{
  "uriTemplate": "spaces://ideation/names",
  "name": "spaces-ideation-names",
  "title": "Ideation Space Names",
  "description": "Enumerate ideation Space names for the current user (for completion and pickers).",
  "mimeType": "application/json",
  "parameters": [],
  "exampleOutput": { "names": ["research-ideas", "product-concepts"] }
}
```

```json
{
  "uriTemplate": "space://{spaceName}/manifest",
  "name": "space-manifest",
  "title": "Space Manifest (file Space)",
  "description": "Read the manifest.json for a file Space owned by the current user.",
  "mimeType": "application/json",
  "parameters": [
    { "name": "spaceName", "type": "string", "description": "File Space name (slug or display name)" }
  ],
  "exampleOutput": {
    "name": "project-alpha",
    "type": "file",
    "created_at": "2025-09-17T12:00:00Z",
    "description": "Alpha project notes"
  }
}
```

```json
{
  "uriTemplate": "space-index://{spaceName}",
  "name": "space-index-md",
  "title": "Space Index.md (file Space)",
  "description": "Read the index.md for a file Space owned by the current user.",
  "mimeType": "text/markdown",
  "parameters": [
    { "name": "spaceName", "type": "string", "description": "File Space name (slug or display name)" }
  ],
  "exampleOutput": "# Project Alpha\nWelcome…\n\n```mermaid\ngraph TD; A-->B;\n```\n"
}
```

Scoping & security notes:
- The server scopes all resource reads to the currently authorized user; `spaceName` is resolved within the user’s namespace.
- No userId should appear in URIs or parameters.

### Manifest Schema (reference)
```
{
  "name": "<space-name>",
  "type": "file",
  "created_at": "<ISO8601>",
  "description": "<optional>"
}
```

## Testing Strategy

### Tests That Must Pass
- [x] Listing excludes invalid manifests and requires `index.md`
- [x] Creation produces valid manifest and stub index
- [x] Validation returns consistent, parseable errors
- [ ] Prompts discovered via `prompts/list` and retrievable via `prompts/get`
- [ ] Resources and templates discovered via `resources/list` and `resources/templates/list`
- [x] Tool outputs include cross-reference fields (nextSteps/resourceLinks/relatedResources/hintResources) where specified

### New Tests Required
- [ ] **Unit**: Path normalization; manifest validation rules
- [ ] **Integration**: List/create/read/validate flows across sample user directories
- [ ] **Prompt Scenarios**: `start-ideation-session`, `file-mode-ops`, `ideation-mode-ops` flows (transcripts)

## Risk Assessment & Dependencies

### Risks
- **Manifest drift** – Mitigate by central schema and tests
- **Path handling errors** – Normalize inputs and clamp to data root
- **Prompt ambiguity** – Strict mode responsibilities and first-turn script

### Dependencies
- Rails UI plan for Spaces already completed (discovery uses same schema)
- Existing MCP FS/Editor/Ideation endpoints remain unchanged

## Timeline & Deliverables

### Week 1
- [ ] Schema + examples
- [ ] Implement `spaces/*` primitives with tests

### Week 2
- [ ] Unified prompt docs authored and reviewed
- [ ] Archive legacy prompt examples

## Final Completion Criteria
- [ ] `spaces/*` tools available, tested, and documented
- [ ] File space creation yields valid `manifest.json` + `index.md`
- [ ] Unified prompt set adopted in chat configuration
- [ ] No regressions in existing endpoints




