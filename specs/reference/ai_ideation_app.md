# Conversational AI Ideation App

## Concept Overview

A conversational AI-powered application designed to facilitate ideation and product specification. The app enables users to verbally brainstorm new product ideas, while the AI consolidates these ideas into coherent, structured assets. These assets are stored in a platform-agnostic spec repository to support both human review and AI coding agents (e.g., Claude Code) for implementation.

## Core Features

### 1. Conversational Ideation

- **Voice-first interaction**: Users discuss ideas verbally with the AI.
- **Live consolidation**: The AI organizes discussions into structured notes and specifications.
- **Clarification prompts**: The AI asks targeted questions to refine incomplete or ambiguous thoughts.

### 2. Spec Asset Management

- **File formats**: Assets saved as Markdown (`.md`) for human readability and JSON (`.json`) for structured machine use.
- **Spec repository**: A centralized, platform-agnostic repository for storing, exporting, and importing specifications.
- **Version control**: Change tracking and updates across iterations.

### 3. Web UI

- **File tree view**: Explore the repository through a familiar hierarchical structure.
- **Mind map view**: Visualize connected concepts and dependencies.
- **Graph rendering**: Use **Mermaid** as the graphing system to embed smaller graphs directly into `.md` files and render larger graphs dynamically.

### 4. Sub-Agents

- **Background critiques**: Agents can analyze specs asynchronously, providing suggestions or identifying gaps.
- **Deep research tasks**: Sub-agents perform extended research or long-running tool calls without blocking the user.
- **Notion of autonomy**: Agents can be assigned specific domains (e.g., technical feasibility, market validation, design critique).

## Key Differentiators

- **Conversational-first ideation**: Focus on natural, verbal interaction rather than static text input.
- **Human + machine usable assets**: Dual-format saving ensures both AI agents and human collaborators can work seamlessly.
- **Embedded visualization standard**: Adoption of Mermaid aligns with emerging standards and simplifies graph portability.
- **Autonomous sub-agents**: Parallel exploration and critique increases depth and speed of ideation.

## Next Steps

1. Define data schema for `.json` specification assets.
2. Design initial repository structure and version control approach.
3. Prototype the conversational capture flow (voice → AI consolidation → asset creation).
4. Build basic web UI with file tree + embedded Mermaid rendering.
5. Explore sub-agent orchestration framework for background tasks.



## Premortem: Risks, Unknowns, and Pitfalls

### TL;DR — Top 10 Ways This Could Fail

1. **Weak “spec extraction” from voice** → The AI can’t reliably transform messy conversation into clean, structured specs.
2. **Spec drift** → Markdown and JSON fall out of sync; no single source of truth.
3. **Low delta clarity** → Users can’t see what changed or why; trust drops.
4. **Unclear value vs. existing tools** → Feels like a fancy Notion/Obsidian + GPT wrapper.
5. **Mermaid/graph limits** → Large graphs become unreadable, slow, or brittle to edit.
6. **Agent noise** → Sub‑agents produce too much low‑signal critique/research; creates backlog fatigue.
7. **Round‑trip gaps to coding agents** → JSON schema doesn’t map well to Claude Code/other agents; handoffs break.
8. **Cost/latency** → Voice + long‑running agents are expensive; background work feels slow.
9. **Security/IP concerns** → Teams won’t put sensitive specs in a new tool without strong guarantees.
10. **Onboarding friction** → Speaking specs feels awkward in shared spaces; power users default to typing.

---

### Feasibility (Can we build it?)

**Hard parts**

- **Robust voice → structure**: Extracting entities (goals, users, requirements, decisions, risks), relations, and priorities from unstructured speech with few hallucinations.
- **Bidirectional sync MD ⇄ JSON**: Keeping human‑readable Markdown and machine‑readable JSON aligned across edits (including external edits in Git).
- **Graph as a first‑class citizen**: Stable IDs, references, and partial updates without breaking Mermaid snippets embedded in `.md`.
- **Change provenance**: Attributing every change to a person/agent, with rationale and links back to source utterances/research.
- **Sub‑agent orchestration**: Queuing, throttling, cancellation, retries, tool sandboxing, and summarizing long traces into actionable notes.
- **Round‑trip with code agents**: Designing a schema that is specific enough to be executable yet flexible enough for early ideation.

**Unknowns / Proofs Needed**

- **Extraction accuracy**: Can we hit ≥80–90% correct entity/relationship capture on messy dialogs?
- **Merge semantics**: Can we support Git‑style merges on both MD and JSON while preserving graph integrity?
- **Graph scale**: How usable are graphs at 50/200/1000 nodes in the UI and in Markdown-embedded Mermaid?
- **Latency envelope**: End‑to‑end time from speech to updated files (<5s perceived?) while background agents run longer tasks.

**Mitigations**

- Constrain to a **minimal ontology** early (Problem, Audience, Requirement, User Story, Acceptance Criteria, Decision, Risk, Component, API, ResearchFinding), each with **stable IDs**.
- Make **JSON canonical**; Markdown is generated views with fenced blocks that carry **opaque IDs** and **do not hand‑edit critical fields**.
- Ship a **Change Log** (decision record + diff) and **Why** fields; surface diffs inline.
- Use **task receipts** for sub‑agents (queued→running→summarized); require “TL;DR + actionable next step” output contracts.

---

### Desirability (Will people want it?)

**Risks**

- **Perceived as a wrapper** around Notion/Obsidian + GPT; unclear differentiation.
- **Voice mismatch**: Many product folks ideate via typing/diagrams; voice is situational.
- **Trust debt**: If the AI misclassifies or fabricates, users revert to manual tools.
- **Signal overload**: Too many critiques/research notes with low prioritization.

**Mitigations**

- Anchor on **strong deltas**: always show “what changed, why, and by whom.”
- **Personalized workflows**: Keyboard‑first parity; voice is optional, not mandatory.
- **Opinionated templates** mapped to build outputs (e.g., user stories → acceptance tests → scaffolding hints for agents).
- **Triage lanes** for sub‑agent outputs (Critical / Nice‑to‑have / Parked) with inbox‑zero flows.

**Compelling Moments to Target**

- First 10 minutes: speak/type ideas → see a clean spec skeleton, graph view, and a crisp delta log.
- First 1–2 hours: export spec → code agent generates a scaffold or tests that actually run.

---

### Viability (Can it sustain?)

**Risks**

- **Unit economics**: ASR + LLM + background research can be \$\$; idle agents burn money.
- **Vendor dependency**: Model/API changes break extraction or schema mappings.
- **Security/compliance**: Without SSO, roles, audit logs, and private model routing, teams won’t adopt.

**Mitigations**

- **Cost guardrails**: rate limits, budgets, and per‑space quotas; offline/streaming ASR options.
- **Provider abstraction** with evaluation suites and golden prompts per version.
- **Enterprise‑ready**: RBAC, project‑scoped secrets, bring‑your‑own‑cloud options, Git push/pull as primary export.

---

### Architecture Pitfalls

- **Spec drift**: Two sources of truth. → Declare **JSON canonical**, generate MD views; embed view metadata to round‑trip safely.
- **Mermaid fragility**: Large diffs blow up hand‑edited diagrams. → Treat Mermaid blocks as **generated**; hand‑edits only in small, local views.
- **ID stability**: Renames/deletes cause orphaned edges. → Use **immutable IDs** with aliasing; maintain a migration map.
- **Background chaos**: Agents stepping on each other. → **Locks + leases** per node; centralized job queue with priorities and cancellation.
- **Opaque AI changes**: Users can’t audit. → **Provenance ledger** (who/when/why, inputs/outputs, model version) + reversible commits.

---

### Round‑Trip with Coding Agents (Biggest Integration Unknown)

- **Risk**: Our JSON is either too vague (not actionable) or too prescriptive (brittle).
- **Mitigation**: Define **task‑oriented export profiles** (e.g., `scaffold_profile`, `test_profile`, `api_profile`) that code agents opt‑into. Include **executable examples** and **acceptance tests** so agents can verify success.

---

### Security & IP

- **Unknowns**: Customer data residency, private model routing, legal exposure of generated research.
- **Mitigations**: Workspace‑level encryption at rest, redact PII, policy‑driven model selection (public vs. private), and **signed exports**.

---

### Go/No‑Go Signals (Kill Criteria)

- **Extraction**: <75% entity/relationship accuracy on benchmarked messy sessions after 3 iterations.
- **Delta clarity**: Users cannot confidently explain changes in <30s during tests.
- **Round‑trip**: Code agent can’t produce a useful scaffold from our spec in 2–3 representative projects.
- **Unit cost**: Median session >\$3 or P95 latency >10s for core actions.
- **Engagement**: <20% weekly active creators after week 2 in pilot.

---

### Early Experiments (to De‑risk Fast)

1. **Golden Path Demo**: 15‑minute voice+type session → JSON canonical spec → MD views → graph → diff log. Success = user says “this replaced my doc + diagramming work.”
2. **Round‑Trip Pilot**: Export profile → Claude Code (or similar) produces a runnable scaffold; capture failures to refine schema.
3. **Graph Scale Test**: Auto‑generate 50/200/1000‑node projects; measure render time, edit success, and user comprehension.
4. **Agent Inbox Trial**: Run 3 sub‑agents (feasibility, market scan, risk) on a medium spec; measure %items accepted and time‑to‑decision.
5. **Cost+Latency Budgeting**: Instrument every step; enforce budgets and fallbacks (e.g., summarization tiers, cached research).

---

### Open Questions

- What **minimal ontology** is enough for v1 without overfitting to a single build style?
- Which **export profiles** unlock the biggest “wow” with code agents?
- Where does **hand‑editing** live: small local Mermaid views only, or also structured fields with guardrails?
- What is the **default collaboration model** (solo creator, small team, open source)?
- Do we need **on‑prem or BYO‑cloud** to earn trust with early adopters?



## Realtime Architecture & Event-Driven MVP (Assumes OpenAI Realtime, always-on)

### Goals

- **Fast conversational loop** with barge-in and low latency.
- **Event-driven UI** that re-renders within \~200–400ms after a change.
- **Background sub-agents** that enqueue results back into the same event lane.
- **Portable specs**: JSON is canonical; Markdown/Mermaid are generated views.

### MVP Stack (opinionated for speed)

- **Frontend**: Next.js (App Router, TS) + Tailwind + shadcn/ui; Zustand (ephemeral UI) + TanStack Query (server data).
- **Voice**: OpenAI Agents SDK (browser WebRTC) + Realtime API (full-duplex, barge-in).
- **DB/Auth/Storage**: Supabase Postgres (+ RLS) + Auth + Storage (audio, exports).
- **Events → UI**: Supabase Realtime (Postgres WAL) to push node/edge/event changes.
- **Jobs/Sub‑agents**: Upstash QStash (HTTP queue) + lightweight Node worker (Fly/Render). Optional Upstash Redis Pub/Sub for ultra‑fast ephemeral notifications.
- **Graphs/visuals**: Mermaid for small subgraphs in MD; **React Flow** fallback for larger/interactive graphs.
- **Exports**: GitHub App for committing `.json` + `.md` to a repo.

### Realtime Flow (happy path)

1. **Browser connects** to Realtime via Agents SDK (WebRTC). Ephemeral token from `/api/realtime/session` (keys never hit client).
2. **User speaks** → partial transcripts stream; chunk boundaries trigger tool call that emits a **SpecEvent** (typed JSON) back to our API.
3. **Spec compiler (server)** validates/merges event → upserts **nodes/edges** (stable IDs) → writes **events + changelog** → regenerates affected **views** (MD sections, Mermaid blocks).
4. **UI updates**: DB tx emits WAL updates; clients subscribed via **Supabase Realtime** receive change signals and re-render selectively. Optimistic UI applies deltas, then reconciles.
5. **Sub‑agents**: compiler enqueues **jobs** (e.g., critic, research). Worker returns **AgentEvents** (suggested patches or talkback) → same `/api/spec-events` → same compiler path → same UI updates.

### Event Model (one lane for everything)

All mutations—human or agent—flow through the same envelope for provenance and idempotency:

```json
{
  "id":"evt_01HW...",
  "project_id":"p_123",
  "type":"spec.add_requirement",
  "actor":{"kind":"user|agent","id":"u_42|critic_v1"},
  "causation_id":"evt_01HV...",
  "correlation_id":"conv_77",
  "ts":"2025-09-26T16:12:08Z",
  "payload":{ /* type-specific */ }
}
```

Derived types: `spec.*`, `agent.critique.*`, `agent.talkback`, `system.*`.

### Minimal Data Model (Supabase)

- `projects(id, name, owner_id, repo_url, created_at)`
- `nodes(id, project_id, type, props jsonb, version int, created_at, updated_at)`
- `edges(id, project_id, src, dst, label, props jsonb)`
- `events(id, project_id, type, actor jsonb, payload jsonb, causation_id, correlation_id, ts)`
- `changelog(id, project_id, entity_id, patch jsonb, rationale text, actor jsonb, ts)`
- `jobs(id, project_id, kind, status, input jsonb, output jsonb, budget_ms, started_at, finished_at)`
- *(optional)* `views(project_id, kind, content text, checksum, ts)`

> **Canon:** JSON graph is the source of truth. Markdown/Mermaid are generated views with opaque IDs and checksums to detect drift.

### API Surface (Next.js Route Handlers)

- `POST /api/realtime/session` → ephemeral token for browser voice session.
- `POST /api/spec-events` → validate + compile + persist + publish.
- `GET  /api/graph` → canonical JSON graph (with selectors for subgraphs).
- `GET  /api/files` → generated MD list + content (includes Mermaid fenced blocks).
- `POST /api/export` → enqueue GitHub commit job.
- `POST /api/jobs/create` → create background job; **Worker** handles `/jobs/run`.

### UI Components (initial set)

- **VoiceConsole**: connect/disconnect, VU meter, transcript, barge‑in.
- **SpecEventFeed**: pending → applied events; accept/reject for agent suggestions.
- **DiffPanel**: human‑readable deltas from `changelog.patch` + rationale.
- **GraphView**: Mermaid ≤ \~60 nodes; auto‑fallback to **React Flow** above threshold.
- **FileTree + MarkdownPane**: read‑only generated MD in v1; edit islands later.
- **ExportButton**: triggers `/api/export` and shows commit link.

### Performance & Cost Budgets (v1 targets)

- **UI re-render** after change: **200–400ms** (tx → WAL push → client apply).
- **Voice loop** (chunk close → TTS first audio): **<1.2s**.
- **Idle control**: auto‑pause TTS and lower ASR rate after N seconds silence.
- **Budgets**: per‑project daily LLM/agent budget; per‑job `budget_ms`; queue depth cap.

### Guardrails & Ops

- **Idempotency**: unique `events.id` + `nodes.version` checks; reject stale patches or auto‑merge.
- **Locks**: short `pg_advisory_xact_lock(entity_id)` during apply to avoid races.
- **Provenance**: store audio segment pointers + transcript ranges in `events.payload`.
- **Security**: Supabase Auth + RLS; project‑scoped secrets; GitHub App with least privilege.

### MVP Delivery Plan (4 slices)

1. **Voice + SpecEvents + Graph JSON + Mermaid snapshot** (core loop working).
2. **Compiler + ChangeLog + FileTree + generated MD**.
3. **React Flow fallback + Realtime subscriptions + GitHub export**.
4. **Critic sub‑agent (QStash + worker) + budgets + agent inbox (accept/reject) + talkback.**

