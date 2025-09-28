# Business Vision: Conversational Spec Ideation (PM‑First, Non‑Engineer Optimized)

## Executive Summary

**Vision Statement**: Turn messy ideas into runnable specs and code scaffolds in minutes.

**Mission**: Enable any corporate knowledge worker—not just engineers—to explore, refine, and communicate concepts via voice‑first conversation that produces a canonical, executable specification with auto‑generated views and graphs, ready to hand off to code agents.

**Core Value Proposition**: A hands‑free, voice‑driven ideation flow that transforms unstructured thinking into a consistent, canonical JSON spec; renders synchronized Markdown and Mermaid mind maps automatically; and exports to GitHub so PMs can trigger scaffold generation with their preferred code agents.

## Market Opportunity

### Problem Definition
- **Core Problem**: Non‑engineers struggle to move from fuzzy ideas to shareable, structured specs that engineers (or code agents) can act on without rework.
- **Problem Scope**: Widespread across PMs, strategy, marketing, design, innovation, and operations teams who ideate frequently and need crisp artifacts quickly.
- **Current Solutions**: Ad‑hoc notes (Docs/Notion/Obsidian), slideware, whiteboarding/mind‑mapping tools, and generic chat with LLMs.
- **Solution Gaps**: No canonical, executable representation; drift between notes, diagrams, and specs; weak provenance; and no clean “round‑trip” from concept → scaffold.

### Target Market
- **Primary Market**: PM‑first and corporate knowledge workers with creative tasks (ideation, strategy, requirements, comms) who are not engineers.
- **Secondary Markets**: Product marketing, design research, innovation labs, consultants/agency planners.
- **Market Size**: Large segment of enterprise knowledge workers; v1 focuses on early adopters in product orgs for traction and references.
- **Market Trends**: Growing comfort with LLMs in daily workflows; interest in voice interfaces; desire for faster concept‑to‑artifact loops.

## Competitive Positioning

### Competitive Landscape
- **Direct Comparators**: Notion AI, Obsidian (+plugins), Miro/Mind‑map tools, ChatGPT/Claude chats with manual copy‑paste.
- **Indirect Comparators**: Requirements tools and generic documentation systems.
- **Barriers to Entry**: Canonical JSON + generated views, GitHub export path, and voice‑first UX tuned for driving use are non‑trivial to execute well.

### Differentiation Strategy
- **Unique Value**: LLM‑powered concept refinement with integrated visualization/mind‑mapping that stays in sync with a canonical JSON spec; one‑click GitHub export for agent scaffolding.
- **Positioning**: “Spec drift killer for PMs and knowledge workers” that converts conversation into consistent, actionable artifacts.
- **Brand Strategy**: Voice‑first, safety‑minded (usable while driving), opinionated simplicity, and trustworthy provenance.

## Business Model

### Revenue Model
- **Primary**: Free for one space; paid plans based on LLM interaction tiers (usage‑metered).
- **Secondary (later)**: Team/workspace plans, enterprise controls (SSO, private model routing).

### Pricing Strategy
- Tiered by LLM interaction volume to align value and cost; free tier encourages adoption and sharing.

### Unit Economics
- Costs primarily from ASR/LLM/Realtimes; usage tiers cap variable cost exposure per user/workspace.

### Go‑to‑Market Strategy
- **Customer Acquisition**: PM communities, product newsletters, demo videos, and hands‑on templates.
- **Distribution Channels**: Web app + GitHub App for export; encourage sharing of exported repos.
- **Partnership Strategy**: GitHub integration v1; evaluate additional agent providers over time.

## Product Strategy

### Core Product
- **Product Vision**: Voice‑first conversational ideation that compiles to canonical JSON, with Markdown and Mermaid views auto‑generated and always in sync.
- **Key Features**:
  - OpenAI Realtime v1 voice interface, hands‑free usage, barge‑in.
  - Concept refinement tuned for non‑engineers.
  - Auto‑generated Markdown documents and Mermaid mind maps (read‑only in v1).
  - GitHub export so PMs can trigger code scaffolds via their preferred agents.
- **Product Roadmap (v1 stance)**: JSON is canonical; `.md` and graphs are fully auto‑generated; editing “islands” may come later with guardrails.
- **Success Metrics**: Intentionally deferring quantitative KPIs; qualitative goal is delightful, reliable voice UX usable while driving with minimal UI.

### Technology Strategy
- **Technical Approach**: Next.js front‑end; Supabase (Auth/RLS/Realtime/Storage) for data/events; OpenAI Realtime for voice; queue worker for background tasks when needed.
- **Scalability Plan**: Start simple; optimize LLM usage via tiering and caching; evolve provider abstraction later if needed.
- **Innovation Areas**: Voice UX quality (latency, barge‑in), canonical spec fidelity, and GitHub round‑trip ergonomics.

## Growth Strategy

Intentionally deferred for now. Focus is on nailing voice experience and PM‑first product‑market fit before formal growth planning.

## Risk Assessment

### High‑Risk Factors
- **Adoption Risk**: Voice‑first ideation may feel unfamiliar in work settings.
- **Spec Drift Risk**: If JSON ⇄ views fall out of sync, trust erodes.
- **Round‑Trip Risk**: GitHub export → scaffold may disappoint if schemas/prompts are brittle.
- **Cost/Latency Risk**: Realtime voice + LLM can be expensive or laggy without careful guardrails.

### Mitigation Strategies
- **Voice On‑Ramps**: Keyboard‑first parity for critical steps; strong demo flows; driving‑safe UX.
- **Canonical Source**: JSON is single source of truth; `.md`/graphs are generated only.
- **GitHub First**: Optimize a single export path (GitHub) for great v1 ergonomics; expand later.
- **Usage Tiers**: Price by LLM interactions; budget caps and monitoring to keep unit costs predictable.

## Resource Requirements

### Team & Talent
- **Core Team**: 1 PM/UX (voice workflows), 1 FE/Realtime, 1 BE/spec compiler, 0.5 infra.
- **Advisory Needs**: Voice UX, prompt/schema design, and enterprise integration guidance.

### Financial Requirements
- **Funding Needs**: Modest runway to build v1, instrument usage, and iterate voice UX.
- **Use of Funds**: LLM/ASR spend, hosting, GitHub App, basic analytics/observability.

### Technology & Infrastructure
- **Development Resources**: Next.js app, Supabase, OpenAI Realtime, GitHub App.
- **Third‑Party Dependencies**: OpenAI Realtime (v1), GitHub.

## Success Metrics & KPIs

Intentionally deferred. We will rely on qualitative user feedback and usage narratives until the voice experience is outstanding.

## Decision Framework

### Strategic Decisions
- **North Star**: Deliver an outstanding voice conversation interface that minimizes reliance on traditional UI and is usable while driving.
- **Investment Priorities**: Voice UX and canonical JSON > additional features. GitHub v1 export > broader integrations.
- **Feature Prioritization**: PM‑first workflows and shareable artifacts take precedence over engineer‑centric tooling.

### Success Criteria
- **Go/No‑Go Decisions**: Ship when the end‑to‑end voice → JSON → generated views → GitHub export loop feels reliably delightful for non‑engineers.
- **Pivot Indicators**: If voice proves consistently undesirable in target contexts, reconsider interaction model while preserving canonical spec + generated views.

---

*This vision document will evolve as we validate the voice experience with PMs and knowledge workers and refine the GitHub round‑trip.*
