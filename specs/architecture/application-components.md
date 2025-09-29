# Application Components

## Technology Stack (AI Ideation App MVP)

### Core Frameworks
- **Frontend**: Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui
- **State/Data**: Zustand (ephemeral UI state) + TanStack Query (server data)
- **Backend**: Next.js Route Handlers (Node.js) for API surface

### Voice & Realtime
- **Voice**: OpenAI Agents SDK (browser WebRTC) + OpenAI Realtime API (full‑duplex, barge‑in)
- **Realtime Events → UI**: Supabase Realtime (Postgres WAL) to push node/edge/event changes

### Database & Storage
- **Primary Database**: Supabase Postgres (with RLS)
- **Storage**: Supabase Storage (audio, exports)
  - Spaces: per-user prefixes with `manifest.json` per space for metadata (created_at, last_updated_at)

### Jobs & Sub‑agents
- **Queue**: Upstash QStash (HTTP queue)
- **Workers**: Lightweight Node worker (Render/Fly) for background sub‑agents

### Graphs & Visuals
- **Small graphs**: Mermaid (embedded in Markdown views)
- **Large/interactive**: React Flow (fallback in UI for bigger graphs)

### Exports
- **GitHub App**: Commits canonical JSON + generated Markdown to a repo

## Third‑Party Services

### Authentication & User Management
- **Service**: Supabase Auth
- **Purpose**: Auth, sessions, RLS enforcement, project‑scoped secrets

### External APIs & Integrations
- **OpenAI Realtime**: Low‑latency conversational loop over WebRTC
- **Upstash QStash**: Background job queue for sub‑agents
- **GitHub App**: Export commits for `.json` and `.md` spec assets

### Media & Asset Management
- **Supabase Storage**: Audio segments, exports, and generated artifacts

## Environment Configuration

### Required Environment Variables

```bash
# App
APP_URL=                                # Public URL (e.g., Vercel domain)
NODE_ENV=                               # development | production

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=              # Server-side ops (RLS-aware)

# OpenAI Realtime / Agents SDK
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-XX

# Upstash QStash
QSTASH_URL=
QSTASH_TOKEN=

# GitHub App (Export)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_BASE64=
GITHUB_APP_INSTALLATION_ID=
GITHUB_EXPORT_REPO=                     # org/repo for exports

# Security / Ops
JWT_SECRET=                             # If applicable for server hooks
RATE_LIMIT_BUDGET_DAILY=                # Per-project LLM/agent budget
```

### Environment Setup Notes
- Store secrets in `.env.local` for local development; never commit secrets
- Use project‑scoped secrets; client receives ephemeral tokens only
- Keep OPENAI keys server‑side; issue ephemeral Realtime tokens from backend
- Prefer `NEXT_PUBLIC_*` vars only for non‑secret UI config

## Architecture Patterns

### Canonical Data & Views
- **Canonical Source**: JSON graph (nodes, edges, events, changelog)
- **Generated Views**: Markdown sections and Mermaid blocks derived from JSON
- **Mermaid Policy**: Treat Mermaid blocks as generated; hand‑edit only small local views

### API Design (Route Handlers)
- RESTful endpoints with consistent JSON envelopes and error formats
- Idempotent event submission with unique IDs and version checks

### Event Model (One Lane for Everything)
All mutations—human or agent—flow through a single event envelope for provenance and idempotency:

```json
{
  "id": "evt_01HW...",
  "project_id": "p_123",
  "type": "spec.add_requirement",
  "actor": { "kind": "user|agent", "id": "u_42|critic_v1" },
  "causation_id": "evt_01HV...",
  "correlation_id": "conv_77",
  "ts": "2025-09-26T16:12:08Z",
  "payload": { /* type-specific */ }
}
```

### Security Considerations
- Supabase Auth + RLS; project‑scoped secrets
- Idempotency keys; `nodes.version` checks; reject stale patches
- Short `pg_advisory_xact_lock(entity_id)` to avoid races during applies
- Provenance ledger: who/when/why, inputs/outputs, model version
- Rate limits and per‑project budgets for LLM/agent usage

## Minimal Data Model (Supabase)

- `projects(id, name, owner_id, repo_url, created_at)`
- `nodes(id, project_id, type, props jsonb, version int, created_at, updated_at)`
- `edges(id, project_id, src, dst, label, props jsonb)`
- `events(id, project_id, type, actor jsonb, payload jsonb, causation_id, correlation_id, ts)`
- `changelog(id, project_id, entity_id, patch jsonb, rationale text, actor jsonb, ts)`
- `jobs(id, project_id, kind, status, input jsonb, output jsonb, budget_ms, started_at, finished_at)`
- (optional) `views(project_id, kind, content text, checksum, ts)`

## API Surface (Initial)

- `POST /api/realtime/session` → ephemeral token for browser voice session
- `POST /api/spec-events` → validate + compile + persist + publish
- `GET  /api/graph` → canonical JSON graph (selectors for subgraphs)
- `GET  /api/files` → generated Markdown list + content (with Mermaid blocks)
- `POST /api/export` → enqueue GitHub commit job
- `POST /api/spaces` → create Space (writes manifest.json, idempotent)
- `GET  /api/spaces` → list Spaces with recency via manifest; sorted desc
- `GET  /api/spaces/{name}/files` → list files within a Space
- `GET  /api/spaces/{name}/files/{...path}` → read file
- `PUT  /api/spaces/{name}/files/{...path}` → write file (bumps manifest.last_updated_at)
- `POST /api/jobs/create` → create background job; worker handles `/jobs/run`

## Deployment Architecture

### Production Setup
- Frontend on Vercel or similar; API via Next.js Route Handlers
- Worker deployed on Render/Fly; QStash HTTP triggers
- Supabase for DB/Auth/Storage/Realtime
- GitHub App for export automation

### Monitoring & Observability
- Application logging + error tracking; OpenAI + QStash request IDs
- Performance monitoring; WAL → client update latency (<400ms target)
- Health checks for worker and API endpoints

## Development Guidelines

### Local Development
1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Configure required environment variables
4. Start Next.js dev server; run worker locally as needed
5. Use Supabase local stack or hosted project

### Testing Strategy
- Unit tests for spec compiler and event validation
- Integration tests for API endpoints and DB transactions
- End‑to‑end tests for conversational loop and UI event updates
- Performance tests for WAL→UI latency and queue throughput

---

*This document reflects the AI Ideation App MVP architecture and should evolve with implementation.*