# Logical Components Architecture

**Purpose**: High-level architectural components for the Conversational AI Ideation App

This document outlines the key logical components, primary flows, and interaction patterns for the MVP.

## Architecture Overview

The app enables conversational ideation (voice and text) and compiles those into a canonical JSON spec graph with generated Markdown/Mermaid views. All mutations—human or agent—flow through a single event lane for provenance and idempotency.

**Primary Interface**: Web app (Next.js). Voice via OpenAI Realtime (WebRTC) with barge‑in.

The architecture centers on 4 flows:

1. **Realtime Conversational Loop**: Browser ↔ OpenAI Realtime; partial transcripts → tool calls → SpecEvents
2. **Spec Compilation**: Event validation/merge → nodes/edges/changelog → view generation (Markdown/Mermaid)
3. **Realtime UI Updates**: Supabase WAL → Realtime push → selective re‑render
4. **Sub‑agent Orchestration**: Background jobs (critique/research) → AgentEvents → same compiler lane

## Core Logical Components

### 1. VoiceConsole (UI)
**Purpose**: Initiate/terminate voice sessions, show VU meter, transcript, and barge‑in controls
**Assessment**: MVP; depends on ephemeral token endpoint

#### Capabilities
- Connects to `/api/realtime/session` to obtain ephemeral tokens
- Streams audio and receives partial transcripts; displays TTS output
- Triggers client‑side actions to submit SpecEvents to server

### 2. SpecEventCompiler (Server)
**Purpose**: Single entry point for all events; validates, merges, persists, and publishes
**Assessment**: Critical path; must be idempotent and race‑safe

#### Capabilities
- Validates event envelope and payload schema
- Applies patches to `nodes`/`edges`; increments `nodes.version`
- Writes `events` and `changelog`; regenerates impacted Markdown/Mermaid views
- Publishes changes via Supabase Realtime; enqueues sub‑agent jobs when needed

### 3. Canonical Graph Store (DB)
**Purpose**: Source of truth (JSON graph)
**Assessment**: Central; design for stable IDs and drift detection

#### Entities
- `nodes(id, project_id, type, props jsonb, version int, ...)`
- `edges(id, project_id, src, dst, label, props jsonb)`
- `events(...)`, `changelog(...)`, `jobs(...)`, optional `views(...)`

### 4. Views Generator (Server)
**Purpose**: Generate Markdown sections and Mermaid blocks from graph deltas
**Assessment**: Generated content carries opaque IDs and checksums

#### Capabilities
- Produces small local Mermaid views; large graphs defer to React Flow
- Embeds opaque IDs/checksums for safe round‑trip and drift detection

### 5. Realtime Notifier (DB→UI)
**Purpose**: Push selective updates to clients
**Assessment**: Targets 200–400ms re‑render after change

#### Capabilities
- Uses Supabase Realtime (WAL) to emit change signals
- UI applies optimistic updates and reconciles on server confirm

### 6. Jobs & Sub‑agents (Worker)
**Purpose**: Background critiques, research, and talkback
**Assessment**: Bounded by budgets; must summarize with actionable next steps

#### Capabilities
- QStash scheduled/HTTP jobs for agent tasks
- Returns `agent.*` events to `/api/spec-events` (same compiler lane)
- Emits task receipts (queued→running→summarized) with budgets and outcomes

### 7. Export Service (Server)
**Purpose**: Commit `.json` + `.md` to GitHub via App install
**Assessment**: External dependency; least‑privilege access

#### Capabilities
- `/api/export` enqueues a job to build commit content
- Signs exports; tracks provenance for audit

## Data Flow Architecture

### Realtime Conversational Flow
```
Browser (WebRTC) → OpenAI Realtime → tool call → POST /api/spec-events →
Compiler (validate/merge) → DB upsert (nodes/edges/events/changelog) →
Supabase Realtime (WAL) → UI selective re‑render
```

### Sub‑agent Flow
```
Compiler → enqueue job (QStash) → Worker → AgentEvents → POST /api/spec-events →
Compiler (same lane) → DB + Realtime → UI
```

### Export Flow
```
User → POST /api/export → enqueue export job → GitHub App commit → link surfaced in UI
```

### Key Architectural Principles
1. **JSON Canonical**: Graph is the single source of truth; Markdown/Mermaid are generated
2. **One Event Lane**: All mutations use the same event envelope for provenance/idempotency
3. **Idempotency & Locks**: Unique IDs, version checks, short advisory locks during apply
4. **Provenance & Auditing**: Who/when/why with model versions and inputs/outputs
5. **Budgets & Guardrails**: Per‑project budget, per‑job `budget_ms`, queue depth caps

## Component Interaction Patterns

### Evented Compilation Pattern
- Input: `spec.*` or `agent.*` events
- Process: validate → apply → persist → publish → generate views
- Benefits: auditability, conflict control, realtime UX

### Drift‑Resistant Views Pattern
- Generated Markdown/Mermaid carry opaque IDs and checksums
- Detect drift; regenerate rather than hand‑edit critical fields

### Cross‑Component Data Sharing
- UI consumes DB projections via Realtime signals and `/api/graph`
- Workers use `/api/spec-events` to submit changes back to compiler
- Export service reads canonical graph and generated views

This architecture enables reliable conversational ideation with transparent diffs, exportable artifacts, and safe background autonomy.

## Readiness Assessment

### Overall Architecture Completion: **0% → evolves with implementation**

### Priority Development Areas
1. **Core Loop** (Critical for MVP)
   - `/api/realtime/session`, `/api/spec-events`, DB schema, WAL→UI wiring
2. **Compiler & ChangeLog** (Critical for trust)
   - Patch application, idempotency, provenance, view generation
3. **Export & Large Graphs** (Usability)
   - React Flow fallback, GitHub export path
4. **Sub‑agents & Budgets** (Depth)
   - QStash worker, receipts, inbox accept/reject

### Recommended Delivery Slices
- Slice 1: Voice + SpecEvents + Graph JSON + Mermaid snapshot
- Slice 2: Compiler + ChangeLog + FileTree + generated MD
- Slice 3: React Flow fallback + Realtime subscriptions + GitHub export
- Slice 4: Critic sub‑agent + budgets + agent inbox

---

*Keep this document current as components land and interfaces stabilize.*
