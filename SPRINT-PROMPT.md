# CONTINUATION PROMPT: arXiv Radar — API Integration Sprint

## Context for Claude

You are picking up a test application at `C:\GitHub\arxiv-test-app\`. This is a **protocol proof** for the Grove Autonomaton Pattern — a self-improving AI pipeline architecture.

**Current State:** The pipeline architecture is complete and working. All bugs are fixed. The UI has a two-column layout with live PipelineTrace. Console telemetry shows every transition. 13 E2E tests pass. The terminology is correct (Andon Gate, Jidoka, Kaizen).

**What's Missing:** The app runs entirely on seed data. Real arXiv fetch and real Anthropic API calls are stubbed out. This sprint connects the live APIs.

**GitHub:** https://github.com/twocash/arxiv-radar-autonomaton

---

## Completed Work (Do Not Redo)

All of this is DONE and verified:

| Item | Status |
|------|--------|
| BUG-001 through BUG-012 | All fixed |
| Pipeline reactive architecture | Working (useEffect-driven) |
| Andon Gate (was transitionGuards.ts) | Renamed to `src/lib/andonGate.ts`, function is `runAndonGate()` |
| Console Telemetry | `src/lib/consoleLog.ts` with `logTransition()` |
| Two-column layout | 60/40 split, independent scrolling |
| PipelineTrace component | Live telemetry feed in admin rail |
| Continuous circuit | Pipeline auto-restarts after execution |
| Jidoka on invalid transitions | No silent failures |
| Reject path | Works correctly, doesn't stall |
| E2E tests | 13 tests passing |

---

## Open Sprint Items

### 1. Welcome Card / Onboarding

Before the user clicks RUN for the first time, present a welcome card in the content area. Same visual language as Jidoka alerts and briefing cards.

**Content:**
```
arXiv Radar — Research Intelligence for the Cognitive Router Thesis

This tool watches arXiv through a specific lens: the Ratchet thesis about
capability propagation from frontier to local AI models. Every paper is
evaluated against six strategic questions.

The pipeline is transparent. You'll see every stage.
The governance is real. YELLOW papers need your approval. RED papers need
your judgment. The system will halt — visibly — when it encounters something
outside its boundaries.

[If dev mode ON:]
  Dev Mode is active. The pipeline will run on 7 seed papers — real arXiv
  research, pre-loaded. No API key required. One paper will trigger a
  governance halt to demonstrate Digital Jidoka.

[If dev mode OFF and no API key:]
  Warning: No API key configured. Add your Anthropic API key in Settings to
  enable Tier 2 classification and briefing compilation.

[If dev mode OFF and API key present:]
  Live mode. The pipeline will fetch papers from arXiv and use Claude
  for classification and briefing compilation.

Click RUN to start the pipeline.
```

**Implementation:** New component `WelcomeCard.tsx` that renders when `state.stats.papers_seen === 0` and `pipeline.current_stage === 'idle'`. Disappears after first RUN. Amber accent border on left.

---

### 2. Real arXiv Fetch

`src/services/arxiv.ts` has `fetchArxivPapers()` as a stub returning seed data. Implement real fetch:

- Endpoint: `https://export.arxiv.org/api/query`
- No API key needed (public API)
- Categories from `config/defaults.ts`: `ARXIV_CATEGORIES`
- Parse Atom XML response into `ArxivPaper[]`
- Rate limit: 1 second delay between requests
- Max results: `ARXIV_CONFIG.maxResultsPerPoll` (100)
- **Dev mode ON:** Return seed data (sovereignty test)
- **Dev mode OFF:** Fetch from arXiv, parse, return
- **On failure:** Return Jidoka halt event (not silent fallback)

XML parsing:
```typescript
const parser = new DOMParser()
const doc = parser.parseFromString(xmlText, 'application/xml')
const entries = doc.querySelectorAll('entry')
// Parse each entry: title, abstract (summary), authors, categories, published, arxiv_id, pdf_url, arxiv_url
```

---

### 3. Real Tier 2 Classification + Compilation

Verify that `compiler.ts` and Tier 2 path in `classifier.ts` call the Anthropic API through Vite proxy:

- SDK init: `baseURL: '/anthropic-api'` and `dangerouslyAllowBrowser: true`
- Classify prompt: `src/prompts/classify-paper.md` with knowledge context
- Compilation: Voice template from `src/prompts/*.md` based on preset
- Cost tracking: Read `usage.input_tokens` and `usage.output_tokens`
- Error handling: API failures produce Jidoka halts with Kaizen proposals

Check `vite.config.ts` for proxy configuration.

---

### 4. Voice / Warmth Review (Optional)

Knowledge and prompt files in `src/knowledge/` and `src/prompts/` are copied from the recipe bundle. Review for voice quality:

- `knowledge/topics.md` — Strategic question sections
- `prompts/news-brief.md` — Jim's research voice
- `prompts/technical-summary.md` — Deployment viability framing
- `prompts/strategic-intel.md` — 100 words max, business terms

**Do NOT rewrite.** Note specific lines needing warmth and propose targeted edits. Changes should propagate back to `C:\GitHub\grove-arxiv-radar\`.

---

## Architectural Constraints (Non-Negotiable)

- **Reactive pipeline.** useEffect hooks drive stage transitions. No imperative `runPipeline()`.
- **Private dispatch.** `dispatch` never exposed. `transition()` is the only mutation path.
- **Andon Gate.** Every transition passes through `runAndonGate()`. No bypass.
- **Config is read-only.** Files in `src/config/` copied from recipe bundle. Do not modify.
- **Knowledge files are read-only.** Propose targeted edits, don't rewrite.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAutonomaton.ts` | Pipeline orchestrator, all useEffect hooks |
| `src/lib/andonGate.ts` | Transition validation, `runAndonGate()` |
| `src/lib/consoleLog.ts` | Console telemetry, `logTransition()` |
| `src/services/arxiv.ts` | arXiv fetch (currently stubbed) |
| `src/services/classifier.ts` | Paper classification, Tier 0/1/2 |
| `src/services/compiler.ts` | Briefing compilation via Anthropic API |
| `src/components/PipelineTrace.tsx` | Live telemetry feed |
| `src/components/App.tsx` | Two-column layout, main composition |

---

## Dev Environment

- Dev server: `npm run dev` → `http://localhost:5173/` (or 5181 if 5173 busy)
- Build check: `npm run build`
- E2E tests: `npx playwright test`
- Anthropic proxy: Vite config proxies `/anthropic-api` → `api.anthropic.com`
- Dev mode toggle in Settings panel

---

## Design System

- Background: `#0D0D0D` / `#121212` / `#1A1A1A`
- Text: `#E8E2D9` primary, `#B0A898` secondary, `#7A7264` muted
- Accent: `#D4621A` amber
- Zones: green `#2D5A27`/`#5EBF50`, yellow `#B8860B`/`#E8C94A`, red `#8B2500`/`#E85A3A`
- Fonts: Instrument Serif (headings), Fragment Mono (UI/mono), DM Sans (body)
- Max border-radius: 2px. Sharp edges. Infrastructure aesthetic.

---

## The Goal

Connect the live APIs so the app:
1. Shows welcome card on first load
2. Fetches real papers from arXiv (when dev mode OFF)
3. Classifies via Anthropic API (Tier 2)
4. Compiles briefings via Anthropic API
5. Tracks API costs in footer

The pipeline architecture is solid. This sprint wires it to the real world.
