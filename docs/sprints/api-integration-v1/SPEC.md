# arXiv Radar — API Integration Sprint (api-integration-v1)

## Live Status

| Field | Value |
|-------|-------|
| **Current Phase** | Planning Complete — Ready for Execution |
| **Status** | 🟡 Ready |
| **Blocking Issues** | None |
| **Last Updated** | 2026-03-14 |
| **Next Action** | Execute Epic 1: Architectural Purity Audit |
| **Attention Anchor** | Re-read before proceeding |

---

## Attention Anchor

**Re-read this block before every major decision.**

- **We are building:** The "glass pipeline" — wiring a working Autonomaton protocol proof to live APIs
- **Success looks like:** A CTO watching over someone's shoulder can point at each of the five architectural commitments and see them working — in both dev mode AND live mode
- **We are NOT:** Building production infrastructure, fixing the Vite proxy for prod builds, or rewriting voice templates
- **Priority stack:** (1) Architectural purity, (2) Demo clarity, (3) Live API wiring, (4) Voice review
- **Known constraint:** Vite proxy (`/anthropic-api`) only works in dev server — flagged, not fixing this sprint

---

## Goal

Close the gap between what the Autonomaton Pattern document claims and what the running arXiv Radar app demonstrates. Three workstreams:

1. **Architectural purity** — Audit every service file against the five commitments. Fix gaps where the code diverges from the pattern doc's promises (cost accumulation, Cognitive Router audit trail, Telemetry stage dev/live branching).

2. **Demo clarity** — Add Welcome Card for first-run onboarding, add real-time stage annotations to GlassPipeline so a first-time viewer understands what's happening without explanation.

3. **Live API wiring** — Connect the arXiv public API (XML parsing, rate limiting, Jidoka on failure) and confirm the Anthropic API path (already implemented in classifier/compiler, needs orchestrator wiring).

---

## Non-Goals

- Production build proxy solution (Vite dev server sufficient for demo)
- Voice template rewrites (propose edits only, propagate to recipe bundle separately)
- Mobile responsiveness
- Backend/database
- Streaming API responses
- New pipeline stages or state machine changes

---

## Domain Contract

**Applicable contract:** None (this is a standalone protocol proof, not Grove bedrock)
**Autonomaton Pattern alignment:** All changes must preserve the five architectural commitments. No bypass of Andon Gate. No exposure of dispatch. No hardcoded behavior that should be declarative.

---

## Architectural Gap Analysis

Findings from code audit against the five commitments in the Pattern Document (Draft 1.3):

### Gap 1: Telemetry Stage Hardcoded to Seed Data
**File:** `src/hooks/useAutonomaton.ts` (line ~370)
**Claim:** "Dev mode returns seed data. Live mode fetches from arXiv."
**Reality:** The Telemetry stage effect calls `loadSeedPapers()` unconditionally. There is no branch for `settings.dev_mode`. The Cognitive Router's sovereignty test — that the same architecture serves both modes via config, not code — is broken at the orchestrator level.
**Fix:** Branch on `settings.dev_mode` in the Telemetry effect. Dev mode calls `loadSeedPapers()`. Live mode calls `fetchArxivPapers()`.

### Gap 2: arXiv Fetch Not Implemented
**File:** `src/services/arxiv.ts`
**Claim:** "Build Your First Grove Autonomaton in a Weekend" — the app fetches real papers
**Reality:** `fetchArxivPapers()` logs a warning and returns seed data. `parseArxivResponse()` returns empty array.
**Fix:** Implement real XML fetch/parse with rate limiting and Jidoka halt on failure.

### Gap 3: Cost Accumulation Missing in Classification Path
**File:** `src/hooks/useAutonomaton.ts` (Recognition effect)
**Claim:** "Track API costs in footer" — the Ratchet economics must be visible
**Reality:** The classifier returns `cost_usd` in `ClassificationResult`, but the Recognition effect dispatches `PAPER_CLASSIFIED` without writing cost to stats. Only `BRIEFING_COMPILED` writes cost (via the reducer). T2 classification costs are invisible.
**Fix:** Add a `CLASSIFICATION_COST` action or accumulate cost when dispatching `PAPER_CLASSIFIED` from T2.

### Gap 4: No Routing Decision Telemetry
**File:** `src/hooks/useAutonomaton.ts` (createTelemetryForAction)
**Claim:** "Every routing decision is itself a logged, auditable artifact" (Pattern Doc, Part III)
**Reality:** Telemetry logs events (paper classified, briefing compiled) but not the routing decision itself — why Tier 0 vs Tier 2, what the confidence was at dispatch time, what the Cognitive Router considered.
**Fix:** Add a `routing_decision` telemetry event type that fires during Recognition with: tier selected, reason (skill match / keyword match / LLM needed), confidence at decision point.

### Gap 5: Mock Compiler Ignores Voice Differentiation
**File:** `src/services/compiler.ts` (`mockCompileBriefing()`)
**Claim:** "Swapping configuration changes behavior without code changes" (Declarative Sovereignty)
**Reality:** Dev mode mock returns the same generic template regardless of voice preset. The three voices produce nearly identical output in dev mode, undermining the Composable principle.
**Fix:** Use voice preset's `example_opening` and `system_prompt` to generate meaningfully different mock briefings per voice.

### Gap 6: GlassPipeline Shows Stage Names but Not Live Context
**File:** `src/components/GlassPipeline.tsx`
**Claim:** The pipeline is "transparent — you'll see every stage"
**Reality:** The pipeline bar shows dots and stage names with a single status string. A first-time viewer can't see what's actually happening (e.g., "Classifying paper 3/7 — Tier 0 keyword match").
**Fix:** Add stage annotation props carrying live context from the orchestrator.

### Gap 7: No Welcome Card / First-Run Experience
**File:** `src/App.tsx`
**Claim:** The app should be self-explanatory
**Reality:** Cold load shows an empty two-column layout with no guidance. User must know to click RUN.
**Fix:** New `WelcomeCard.tsx` component per SPRINT-PROMPT.md spec.

---

## Acceptance Criteria

### Architectural Purity (Must Pass — Gated)
- [ ] Telemetry stage branches on `settings.dev_mode` — seed data in dev, `fetchArxivPapers()` in live
- [ ] Classification cost from T2 flows through to `state.stats.total_api_cost_usd`
- [ ] Routing decision telemetry fires during Recognition with tier, reason, confidence
- [ ] Mock compiler produces meaningfully different output per voice preset
- [ ] All 13 existing E2E tests still pass after changes

### Demo Clarity (Must Pass — Gated)
- [ ] Welcome Card appears on first load when pipeline is idle and no papers processed
- [ ] Welcome Card disappears after first RUN
- [ ] Welcome Card content adapts to dev mode state and API key presence
- [ ] GlassPipeline shows live context during active stages (paper count, tier, progress)
- [ ] A person seeing the app for the first time understands what it does within 10 seconds

### Live API Wiring (Must Pass — Gated)
- [ ] `fetchArxivPapers()` fetches real papers from `export.arxiv.org/api/query`
- [ ] Atom XML parsed correctly into `ArxivPaper[]` (title, abstract, authors, categories, dates, urls)
- [ ] 1-second rate limit between requests honored
- [ ] arXiv fetch failure produces Jidoka halt with Kaizen proposal ("Switch to dev mode" / "Retry")
- [ ] With API key + dev mode OFF: real arXiv papers → T2 classification → T2 briefing → approval
- [ ] FlywheelFooter shows real accumulated API costs

### Voice Review (Stretch — Not Gated)
- [ ] Knowledge and prompt files reviewed for voice quality
- [ ] Specific line-level edit proposals documented (not rewrites)
- [ ] Proposals flagged for propagation back to `C:\GitHub\grove-arxiv-radar\`

---

## Known Constraints

**Vite Proxy Limitation:** The `/anthropic-api` proxy in `vite.config.ts` only works during `npm run dev`. Production builds (`npm run build`) cannot proxy API calls. For this sprint, the dev server demo is sufficient. A future sprint would add environment variable configuration for direct API calls in production.

**arXiv API Rate Limiting:** The arXiv API is public and free but requests aggressive rate limiting (3-second wait recommended in their docs, we use 1-second). Repeated rapid polling may get the IP temporarily blocked. The Jidoka halt on fetch failure handles this gracefully.

