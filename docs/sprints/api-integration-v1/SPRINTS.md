# arXiv Radar — API Integration Sprint (api-integration-v1)

## Sprint Structure

| Epic | Priority | Description | Gated? |
|------|----------|-------------|--------|
| 1 | P0 | Architectural Purity Audit | Yes |
| 2 | P0 | Demo Clarity (Welcome Card + Pipeline Annotations) | Yes |
| 3 | P0 | Live arXiv Fetch | Yes |
| 4 | P0 | Cost Flow + Routing Telemetry | Yes |
| 5 | P1 | Voice / Warmth Review | Stretch |

---

## Epic 1: Architectural Purity Audit

**Goal:** Close gaps between Pattern Document claims and running code. No new features — only alignment.

### Story 1.1: Telemetry Stage Dev/Live Branch

**Task:** In `src/hooks/useAutonomaton.ts`, modify the Telemetry stage `useEffect` to branch on `settings.dev_mode`. When dev mode is ON, call `loadSeedPapers()`. When OFF, call `fetchArxivPapers()` (which will be implemented in Epic 3 — for now, wire the branch and have it call the existing stub).

**File:** `src/hooks/useAutonomaton.ts` (~line 370)
**Current:** `const papers = loadSeedPapers()` — unconditional
**Target:** 
```typescript
if (state.settings.dev_mode) {
  const papers = loadSeedPapers()
  transition({ type: 'POLL_COMPLETE', papers })
} else {
  fetchArxivPapers(ARXIV_CATEGORIES, ARXIV_CONFIG.maxResultsPerPoll)
    .then(papers => transition({ type: 'POLL_COMPLETE', papers }))
    .catch(error => {
      // Jidoka halt on fetch failure
      const halt: JidokaEvent = { ... }
      dispatch({ type: 'JIDOKA_HALT', event: halt })
    })
}
```

**Tests:**
- E2E: Verify dev mode still loads 7 seed papers after change
- E2E: Verify live mode path is reachable (mock fetch, confirm branch taken)

---

### Story 1.2: Mock Compiler Voice Differentiation

**Task:** Improve `mockCompileBriefing()` in `src/services/compiler.ts` so dev mode produces meaningfully different output per voice preset.

**File:** `src/services/compiler.ts` (`mockCompileBriefing()`)
**Current:** Returns same generic template for all voices.
**Target:** Use the voice preset's `system_prompt` framing and `example_opening` to shape mock output. The three voices should produce noticeably different headlines and body text — news_brief reads like a dispatch, technical_summary reads like an engineering assessment, strategic_intel reads like a board-ready signal.

**Implementation:**
- Read `voice.system_prompt` to extract the voice's persona
- Use `voice.example_opening` if available
- Generate zone-appropriate mock body text that respects the voice's constraints (e.g., strategic_intel max 100 words)
- Keep it deterministic — no API call, but structurally different per voice

**Tests:**
- Unit: Three voice presets produce different headlines for same paper
- E2E: Switch voice in UI, run pipeline, verify briefing cards show different style

---

### Story 1.3: Classification Cost Accumulation

**Task:** Wire T2 classification cost through to `state.stats.total_api_cost_usd`.

**File:** `src/hooks/useAutonomaton.ts` (Recognition stage effect, ~line 400)
**Current:** `classifyPaperService()` returns `ClassificationResult` with `cost_usd`, but only `PAPER_CLASSIFIED` or `PAPER_ARCHIVED` is dispatched — cost is lost.
**Target:** After successful T2 classification, accumulate cost via one of:
- Option A: Add `cost_usd` to the `PAPER_CLASSIFIED` action payload, handle in reducer
- Option B: Dispatch a separate `TELEMETRY_LOGGED` entry with `cost_usd` field that the footer reads

**Recommendation:** Option A is cleaner. Add optional `classification_cost_usd?: number` to `PAPER_CLASSIFIED` action type. Reducer adds it to `stats.total_api_cost_usd`.

**Tests:**
- Unit: Reducer accumulates cost when `PAPER_CLASSIFIED` includes cost
- E2E: FlywheelFooter shows non-zero cost after T2 classification (requires API key)


### Story 1.4: Routing Decision Telemetry

**Task:** Add a `routing_decision` telemetry event that fires during Recognition, logging the Cognitive Router's dispatch decision.

**File:** `src/hooks/useAutonomaton.ts` (Recognition effect) and `src/services/telemetry.ts`
**Current:** Telemetry logs `paper_classified` after the fact.
**Target:** Before classification dispatches, log a `routing_decision` entry:
```typescript
{
  stage: 'recognition',
  event: 'routing_decision',
  arxiv_id: paper.arxiv_id,
  tier: result.tier,          // 'T0-skill' | 'T0-keyword' | 'T2' | 'dev-mode'
  details: reason,            // 'Skill match: auto-approve-quantization' or 'Keyword score 0.45 below T0 threshold'
  confidence: result.paper?.relevance_score,
  cost_usd: result.cost_usd,
}
```

This makes the Cognitive Router's decision an auditable artifact per Pattern Doc Part III.

**Tests:**
- Unit: Telemetry entry created for each routing decision
- E2E: PipelineTrace shows routing decision entries

### Build Gate (Epic 1)
```bash
npm run build           # Compiles
npx playwright test     # 13 existing E2E tests pass
```

---

## Epic 2: Demo Clarity

**Goal:** A first-time viewer understands what they're looking at within 10 seconds.

### Story 2.1: Welcome Card Component

**Task:** Create `src/components/WelcomeCard.tsx` per the spec in SPRINT-PROMPT.md.

**File:** New file: `src/components/WelcomeCard.tsx`
**Renders when:** `state.stats.papers_seen === 0` AND `pipeline.current_stage === 'idle'`
**Disappears:** After first `START_POLL` (papers_seen becomes > 0)


**Content (conditional):**

State: dev_mode ON
```
arXiv Radar — Research Intelligence for the Cognitive Router Thesis

This tool watches arXiv through a specific lens: the Ratchet thesis about
capability propagation from frontier to local AI models. Every paper is
evaluated against six strategic questions.

The pipeline is transparent. You'll see every stage.
The governance is real. YELLOW papers need your approval. RED papers need
your judgment. The system will halt — visibly — when it encounters something
outside its boundaries.

Dev Mode is active. The pipeline will run on 7 seed papers — real arXiv
research, pre-loaded. No API key required. One paper will trigger a
governance halt to demonstrate Digital Jidoka.

Click RUN to start the pipeline.
```

State: dev_mode OFF, no API key
```
[Same header + thesis text]

Warning: No API key configured. Add your Anthropic API key in Settings to
enable Tier 2 classification and briefing compilation.

Click RUN to start the pipeline.
```

State: dev_mode OFF, API key present
```
[Same header + thesis text]

Live mode. The pipeline will fetch papers from arXiv and use Claude
for classification and briefing compilation.

Click RUN to start the pipeline.
```

**Design:**
- Amber accent border on left (4px solid `var(--accent)`)
- `var(--bg-surface)` background
- Instrument Serif for the title
- DM Sans for body text
- Fragment Mono for the zone color references
- Max border-radius: 2px
- Renders in the left column (`<main>`) where governance content usually appears

**Integration:** Add to `App.tsx` in the left column, above JidokaAlert. Conditional render based on `state.stats.papers_seen === 0 && pipeline.current_stage === 'idle'`.

**Tests:**
- E2E: Welcome card visible on fresh state
- E2E: Welcome card gone after clicking RUN


---

### Story 2.2: GlassPipeline Stage Annotations

**Task:** Add live context annotations to the GlassPipeline component. The pipeline bar should show what's happening in real time during each active stage.

**File:** `src/components/GlassPipeline.tsx` + `src/hooks/useAutonomaton.ts`

**Current:** A single `statusText` string like "Classifying papers..."
**Target:** Rich annotation that updates per-paper:

| Stage | Annotation Example |
|-------|--------------------|
| telemetry | "Fetching from arXiv..." or "Loading 7 seed papers" |
| recognition | "Classifying 3/7 — Tier 0 keyword match" |
| compilation | "Compiling briefing 2/3 — Tier 2 Sonnet" |
| approval | "3 briefings awaiting review" |
| execution | "Cycle complete — restarting..." |
| idle (first run) | "Ready" |
| idle (after cycle) | "Awaiting new research" |
| HALTED | "HALTED — Conflicting thesis: paper 2510.03847" |

**Implementation approach:**
1. Add a `pipelineAnnotation` computed value in `useAutonomaton.ts` that reads current state and builds the annotation string
2. Pass as prop to `GlassPipeline`
3. Replace the existing `statusText` useMemo with the richer version
4. Include paper count context from `incoming_papers.length` and `classified_papers.length`
5. For Jidoka halts, include the halt trigger type and paper ID

**Design:** Same Fragment Mono font, same color logic. Annotation appears after the stage labels in the pipeline bar. Keep it to one line — dense information, not verbose.

**Tests:**
- E2E: Pipeline shows paper count during recognition
- E2E: Pipeline shows halt details during Jidoka

### Build Gate (Epic 2)
```bash
npm run build
npx playwright test
```

---

## Epic 3: Live arXiv Fetch

**Goal:** `fetchArxivPapers()` fetches real papers from arXiv's public API. Failure produces Jidoka halt.

### Story 3.1: Implement arXiv XML Fetch + Parse

**Task:** Complete the implementation of `fetchArxivPapers()` and `parseArxivResponse()` in `src/services/arxiv.ts`.

**File:** `src/services/arxiv.ts`

**Implementation:**

```typescript
export async function fetchArxivPapers(
  categories: readonly string[],
  maxResults: number = 50
): Promise<ArxivPaper[]> {
  // Build query: cat:cs.LG OR cat:cs.CL OR cat:cs.AI OR ...
  const catQuery = categories.map(c => `cat:${c}`).join('+OR+')
  const url = buildQueryUrl(catQuery, maxResults)
  
  // Rate limit: 1 second delay
  await new Promise(r => setTimeout(r, ARXIV_CONFIG.rateLimitDelayMs))
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status} ${response.statusText}`)
  }
  
  const xml = await response.text()
  return parseArxivResponse(xml)
}
```

**XML Parsing (`parseArxivResponse`):**
```typescript
export function parseArxivResponse(xml: string): ArxivPaper[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const entries = doc.querySelectorAll('entry')
  
  return Array.from(entries).map(entry => {
    const id = entry.querySelector('id')?.textContent ?? ''
    const arxivId = id.replace('http://arxiv.org/abs/', '')
    
    return {
      arxiv_id: arxivId,
      title: (entry.querySelector('title')?.textContent ?? '').trim().replace(/\n/g, ' '),
      abstract: (entry.querySelector('summary')?.textContent ?? '').trim(),
      authors: Array.from(entry.querySelectorAll('author name')).map(n => n.textContent ?? ''),
      categories: Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term') ?? ''),
      published: entry.querySelector('published')?.textContent ?? '',
      updated: entry.querySelector('updated')?.textContent ?? '',
      pdf_url: `https://arxiv.org/pdf/${arxivId}`,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    }
  })
}
```

**Jidoka on failure:** Handled in the orchestrator (Story 1.1). If `fetchArxivPapers()` throws, the catch block creates a Jidoka halt with trigger `api_failure` and Kaizen proposals: "Switch to dev mode" / "Retry".

**Tests:**
- Unit: `parseArxivResponse()` correctly parses sample Atom XML fixture
- Unit: `buildQueryUrl()` builds correct URL with categories
- E2E: With dev mode OFF and network available, pipeline loads real papers


### Build Gate (Epic 3)
```bash
npm run build
npx playwright test
# Manual: Toggle dev mode OFF, click RUN, verify real papers load
```

---

## Epic 4: Cost Flow + Routing Telemetry

**Goal:** Make the Ratchet economics visible. FlywheelFooter shows real numbers.

### Story 4.1: Wire Classification Cost to Stats

**Task:** Per Story 1.3, add `classification_cost_usd` to `PAPER_CLASSIFIED` action. Update reducer to accumulate it.

**File:** `src/state/types.ts` (action type), `src/state/reducer.ts` (accumulation)
**Changes:**
1. Extend `PAPER_CLASSIFIED` action: `{ type: 'PAPER_CLASSIFIED'; paper: ClassifiedPaper; classification_cost_usd?: number }`
2. In reducer, `case 'PAPER_CLASSIFIED'`: add `classification_cost_usd ?? 0` to `stats.total_api_cost_usd`
3. In orchestrator Recognition effect: pass `result.cost_usd` when dispatching

### Story 4.2: Routing Decision Telemetry Events

**Task:** Per Story 1.4, fire `routing_decision` telemetry from the Recognition effect.

**File:** `src/hooks/useAutonomaton.ts` (Recognition effect)
**When:** After `classifyPaperService()` returns, before dispatching classification
**Content:** Tier used, reason string, confidence score, cost

### Story 4.3: FlywheelFooter Verification

**Task:** Verify footer displays accurate accumulated costs and tier distribution.

**File:** `src/components/FlywheelFooter.tsx`
**Check:** The `stats.tier2_cost` field in `FlywheelDisplayStats` maps to `state.stats.total_api_cost_usd`. Confirm this flows correctly from both classification and compilation costs.

### Build Gate (Epic 4)
```bash
npm run build
npx playwright test
# Manual: Run with API key, verify footer shows non-zero cost
# Manual: Check PipelineTrace for routing_decision entries
```



---

## Epic 5: Voice / Warmth Review (Stretch — Not Gated)

**Goal:** Review knowledge and prompt files for voice quality. Propose targeted line-level edits. Do NOT rewrite files.

### Story 5.1: Knowledge File Review

**Files:**
- `src/knowledge/topics.md` — Strategic question sections
- `src/knowledge/significance.md` — Signal strength criteria
- `src/knowledge/contrarian.md` — Falsification analysis framing

**Review criteria:**
- Does each section read as Jim's strategic voice? (Direct, active, insight-first)
- Are the six strategic questions framed as decisions, not academic questions?
- Does the contrarian analysis frame (Q6) get equal structural rigor to confirming evidence?

**Output:** List of specific line-level edits with before/after. No rewrites.

### Story 5.2: Prompt Template Review

**Files:**
- `src/prompts/classify-paper.md` — Classification instructions for T2 LLM
- `src/prompts/news-brief.md` — News brief voice template
- `src/prompts/technical-summary.md` — Technical summary voice template
- `src/prompts/strategic-intel.md` — Strategic intel voice template (100 words max)

**Review criteria:**
- Does each prompt produce output consistent with its voice preset constraints?
- Are the instructions unambiguous for the LLM?
- Does the classification prompt correctly instruct the LLM to return `jidoka: true` when conflicting thesis evidence appears?

**Output:** List of specific line-level edits. Flag for propagation to `C:\GitHub\grove-arxiv-radar\`.

### Build Gate (Epic 5)
No build gate — review only. Edits documented but not applied this sprint.

---

## Sprint Summary

| Artifact | Lines | Status |
|----------|-------|--------|
| SPEC.md | ~142 | Complete |
| SPRINTS.md | ~390 | Complete |
| EXECUTION_PROMPT.md | ~911 | Complete |
