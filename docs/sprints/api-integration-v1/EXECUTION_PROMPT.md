# EXECUTION PROMPT: arXiv Radar — API Integration Sprint

## Context

You are executing a sprint on `C:\GitHub\arxiv-test-app\`. This is a **protocol proof** for the Grove Autonomaton Pattern — a self-improving AI pipeline architecture. The app is working. 13 E2E tests pass. The pipeline architecture is complete. This sprint closes gaps between what the Autonomaton Pattern document claims and what the running code demonstrates, adds first-run UX, and wires live APIs.

**Priority stack (execute in order):**
1. Architectural purity (audit fixes)
2. Demo clarity (welcome card + pipeline annotations)
3. Live API wiring (arXiv fetch)
4. Cost flow + routing telemetry

**Read `docs/sprints/api-integration-v1/SPEC.md` and `docs/sprints/api-integration-v1/SPRINTS.md` for full context.**

---

## Architectural Constraints (Non-Negotiable)

These rules cannot be violated under any circumstances:

- **Reactive pipeline.** `useEffect` hooks drive stage transitions. No imperative `runPipeline()`.
- **Private dispatch.** `dispatch` is never exposed. `transition()` is the only mutation path.
- **Andon Gate.** Every transition passes through `runAndonGate()`. No bypass.
- **Config is governance.** Files in `src/config/` define behavior. Do not hardcode behavior that should be declarative.
- **Feed-First telemetry.** Every significant event produces a telemetry entry.

---

## Key Files

| File | Role |
|------|------|
| `src/hooks/useAutonomaton.ts` | Pipeline orchestrator. ALL useEffect hooks. dispatch is PRIVATE. |
| `src/lib/andonGate.ts` | Transition validation. `runAndonGate()` runs on EVERY transition. |
| `src/lib/consoleLog.ts` | Console telemetry. `logTransition()`. |
| `src/services/arxiv.ts` | arXiv fetch — currently stubbed. **Primary target for Epic 3.** |
| `src/services/classifier.ts` | Tier cascade: T0-skill → T0-keyword → T2 LLM. Already implemented. |
| `src/services/compiler.ts` | Briefing compilation. T2 path implemented. Mock path needs voice differentiation. |
| `src/services/telemetry.ts` | Telemetry entry creation. |
| `src/services/jidoka.ts` | Halt creation + Kaizen proposal generation. |
| `src/state/types.ts` | All type definitions. Action types live here. |
| `src/state/reducer.ts` | Pure state reducer. Cost accumulation for BRIEFING_COMPILED already works here. |
| `src/components/GlassPipeline.tsx` | Pipeline visualization. **Target for Epic 2 annotations.** |
| `src/components/App.tsx` | Root layout. Two-column. **Target for WelcomeCard integration.** |
| `src/components/FlywheelFooter.tsx` | Economic proof display — tier distribution + costs. |
| `src/config/defaults.ts` | Watched topics, arXiv categories, config constants. |
| `src/config/voices.ts` | Voice preset definitions with system prompts and example openings. |
| `vite.config.ts` | Vite dev proxy: `/anthropic-api` → `api.anthropic.com`. |


## Design System (Do Not Deviate)

```
Background: #0D0D0D / #121212 / #1A1A1A
Text: #E8E2D9 primary, #B0A898 secondary, #7A7264 muted
Accent: #D4621A amber
Zones: green #2D5A27/#5EBF50, yellow #B8860B/#E8C94A, red #8B2500/#E85A3A
Fonts: Instrument Serif (headings), Fragment Mono (UI/mono), DM Sans (body)
Max border-radius: 2px. Sharp edges. Infrastructure aesthetic.
```

---

## Dev Environment

```bash
cd C:\GitHub\arxiv-test-app
npm run dev          # Dev server → http://localhost:5173/ (or 5181)
npm run build        # Build check
npx playwright test  # 13 E2E tests must pass after every epic
```

---

## Epic 1: Architectural Purity Audit

Execute these four stories in order. After each, run `npm run build` to confirm no regressions.


### 1.1: Telemetry Stage Dev/Live Branch

**File:** `src/hooks/useAutonomaton.ts`

Find the Telemetry stage useEffect (~line 370). It currently looks like:

```typescript
// --- TELEMETRY STAGE: Load papers ---
useEffect(() => {
  const { current_stage, is_polling } = state.pipeline
  if (current_stage !== 'telemetry' || !is_polling) return
  if (processingRef.current.telemetry) return
  console.log('[Pipeline] Telemetry: Loading papers...')
  processingRef.current.telemetry = true
  const papers = loadSeedPapers()
  console.log(`[Pipeline] Telemetry: Loaded ${papers.length} papers`)
  transition({ type: 'POLL_COMPLETE', papers })
  processingRef.current.telemetry = false
}, [state.pipeline.current_stage, state.pipeline.is_polling, transition])
```

Replace with:

```typescript
// --- TELEMETRY STAGE: Load papers ---
useEffect(() => {
  const { current_stage, is_polling } = state.pipeline
  if (current_stage !== 'telemetry' || !is_polling) return
  if (processingRef.current.telemetry) return

  processingRef.current.telemetry = true

  if (state.settings.dev_mode) {
    // DEV MODE: Seed data — sovereignty test (works offline)
    console.log('[Pipeline] Telemetry: Loading seed papers (dev mode)...')
    const papers = loadSeedPapers()
    console.log(`[Pipeline] Telemetry: Loaded ${papers.length} seed papers`)
    transition({ type: 'POLL_COMPLETE', papers })
    processingRef.current.telemetry = false
  } else {
    // LIVE MODE: Fetch from arXiv API
    console.log('[Pipeline] Telemetry: Fetching from arXiv...')
    fetchArxivPapers(ARXIV_CATEGORIES, ARXIV_CONFIG.maxResultsPerPoll)
      .then(papers => {
        console.log(`[Pipeline] Telemetry: Fetched ${papers.length} papers from arXiv`)
        processingRef.current.telemetry = false
        transition({ type: 'POLL_COMPLETE', papers })
      })
      .catch(error => {
        console.error('[Pipeline] Telemetry: arXiv fetch failed:', error)
        processingRef.current.telemetry = false
        const errorMsg = error instanceof Error ? error.message : 'Unknown fetch error'
        const halt: JidokaEvent = {
          id: crypto.randomUUID(),
          stage: 'telemetry',
          trigger: 'api_failure',
          details: `arXiv fetch failed: ${errorMsg}`,
          timestamp: new Date().toISOString(),
          resolved: false,
        }
        dispatch({ type: 'JIDOKA_HALT', event: halt })
        dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(halt) })
      })
  }
}, [state.pipeline.current_stage, state.pipeline.is_polling, state.settings.dev_mode, transition])
```

**Required imports at top of useAutonomaton.ts:**

```typescript
import { loadSeedPapers, fetchArxivPapers } from '../services/arxiv'
import { ARXIV_CATEGORIES, ARXIV_CONFIG } from '../config/defaults'
```

Note: `loadSeedPapers` is already imported. Add `fetchArxivPapers`. Add the config imports.

**IMPORTANT:** The catch block uses `dispatch` directly (not `transition`) because `JIDOKA_HALT` is a universal action and the pipeline is in an error state. This matches the existing pattern in the Recognition and Compilation effects.

**Verify:** Toggle dev mode ON → seed papers load. Toggle dev mode OFF → arXiv fetch attempted (will fail until Epic 3 implements the real fetch, producing a Jidoka halt — which is correct behavior).

---

### 1.2: Mock Compiler Voice Differentiation

**File:** `src/services/compiler.ts` — `mockCompileBriefing()` function


Replace the current `mockCompileBriefing()` function with a version that produces meaningfully different output per voice. The three voices have distinct characteristics:

- **news_brief:** ≤150 words, 8th grade, "what changed → why it matters → what to watch"
- **technical_summary:** ≤250 words, ML background assumed, "method → edge viability → caveats → tier migration impact"  
- **strategic_intel:** ≤100 words, no technical details, "what changed → who benefits → what to watch"

```typescript
export function mockCompileBriefing(
  paper: ClassifiedPaper,
  voicePreset: VoicePresetId
): DraftBriefing {
  const voice = getVoicePreset(voicePreset)
  const topicLabel = paper.matched_topics[0] || 'AI research'
  const zoneLabel = paper.zone.toUpperCase()

  // Voice-specific headline generation
  const headlines: Record<VoicePresetId, string> = {
    news_brief: paper.zone === 'red'
      ? `Local AI just got a signal worth watching: ${paper.title.slice(0, 60)}`
      : `New ${topicLabel} research shifts the deployment calculus`,
    technical_summary: paper.zone === 'red'
      ? `[${zoneLabel}] Tier migration signal: ${paper.title.slice(0, 60)}`
      : `[${zoneLabel}] ${paper.title.slice(0, 80)}`,
    strategic_intel: paper.zone === 'red'
      ? `Strategic signal: cost projection may need revision`
      : `${topicLabel} — trajectory update`,
  }

  // Voice-specific body generation
  const bodies: Record<VoicePresetId, string> = {
    news_brief: `${voice.example_opening || ''}\n\n` +
      `This paper addresses ${paper.matched_topics.join(' and ')}. ` +
      `The findings suggest the gap between frontier and local capability ` +
      `continues to narrow on targeted tasks. ` +
      `Watch for reproduction attempts and real-world deployment benchmarks.`,
    technical_summary: `**Method:** ${paper.title}\n\n` +
      `**Categories:** ${paper.categories.join(', ')}\n\n` +
      `**Edge viability:** Classification pending full analysis. ` +
      `Matched topics: ${paper.matched_topics.join(', ')}. ` +
      `Relevance score: ${paper.relevance_score.toFixed(2)}.\n\n` +
      `**Caveats:** Mock briefing — full analysis requires Tier 2 compilation.\n\n` +
      `**Tier migration impact:** ${paper.zone === 'red' ? 'High — potential timeline acceleration' : 'Moderate — confirms existing trajectory'}.`,
    strategic_intel: paper.zone === 'red'
      ? `A development in ${topicLabel} may accelerate the tier migration timeline. ` +
        `If confirmed, this changes the cost projection for local inference.`
      : `Incremental progress in ${topicLabel}. ` +
        `Trajectory holds. No change to current deployment timeline.`,
  }

  return {
    id: crypto.randomUUID(),
    paper,
    voice_preset: voicePreset,
    headline: headlines[voicePreset],
    body: bodies[voicePreset],
    key_claims: [`${topicLabel} findings suggest ${paper.zone === 'red' ? 'significant' : 'incremental'} progress`],
    caveats: ['Mock briefing generated in dev mode — full analysis requires Tier 2'],
    tier_migration_impact: paper.zone === 'red' ? 'High — potential timeline acceleration' : undefined,
    compiled_at: new Date().toISOString(),
    compiled_by: {
      tier: 0,
      model: 'dev-mode-mock',
      cost_usd: 0,
    },
  }
}
```

**Verify:** Run in dev mode. Switch voice presets. Briefing cards should show noticeably different headlines and body text for the same paper.

---

### 1.3: Classification Cost Accumulation

**File 1:** `src/state/types.ts` — Extend the `PAPER_CLASSIFIED` action type:

Find:
```typescript
| { type: 'PAPER_CLASSIFIED'; paper: ClassifiedPaper }
```
Replace with:
```typescript
| { type: 'PAPER_CLASSIFIED'; paper: ClassifiedPaper; classification_cost_usd?: number }
```

**File 2:** `src/state/reducer.ts` — Accumulate cost in `PAPER_CLASSIFIED` handler:

Find the `case 'PAPER_CLASSIFIED':` block and add cost accumulation:

```typescript
case 'PAPER_CLASSIFIED':
  return {
    ...state,
    classified_papers: [...state.classified_papers, action.paper],
    incoming_papers: state.incoming_papers.filter(
      p => p.arxiv_id !== action.paper.arxiv_id
    ),
    stats: {
      ...state.stats,
      total_api_cost_usd: state.stats.total_api_cost_usd + (action.classification_cost_usd ?? 0),
    },
  }
```

**File 3:** `src/hooks/useAutonomaton.ts` — Pass cost from classifier result to dispatch.

In the Recognition stage effect, after `classifyPaperService()` resolves successfully, change:

```typescript
transition({ type: 'PAPER_CLASSIFIED', paper: result.paper })
```
to:
```typescript
transition({ type: 'PAPER_CLASSIFIED', paper: result.paper, classification_cost_usd: result.cost_usd })
```

Do the same for `PAPER_ARCHIVED` if it comes from T2 classification.

**Also update `CombinedAction` type** in `src/lib/andonGate.ts` if it separately defines PAPER_CLASSIFIED — ensure the types stay in sync.

**Verify:** After T2 classification (with API key), FlywheelFooter cost is non-zero.


---

### 1.4: Routing Decision Telemetry

**File:** `src/hooks/useAutonomaton.ts` — Recognition stage effect

After `classifyPaperService()` returns, BEFORE dispatching the classification action, log a routing decision:

```typescript
classifyPaperService(nextPaper, state.skills, state.settings).then(result => {
  processingRef.current.recognition = null

  // LOG ROUTING DECISION — makes Cognitive Router auditable
  dispatch({
    type: 'TELEMETRY_LOGGED',
    entry: telemetry.createTelemetryEntry('recognition', 'routing_decision', {
      arxiv_id: nextPaper.arxiv_id,
      tier: result.tier === 'T0-skill' ? 0 : result.tier === 'T0-keyword' ? 0 : result.tier === 'T2' ? 2 : 0,
      details: `Tier ${result.tier}: ${result.tier === 'T0-skill' ? 'Skill match' : result.tier === 'T0-keyword' ? 'Keyword threshold met' : result.tier === 'T2' ? 'LLM classification' : 'Dev mode mock'}`,
      confidence: result.paper?.relevance_score,
      cost_usd: result.cost_usd ?? 0,
    }),
  })

  if (result.success && result.paper) {
    // ... existing classification dispatch
  }
})
```

This makes every routing decision a logged, auditable artifact per Pattern Doc Part III.

**Verify:** Run pipeline, open PipelineTrace. See `routing_decision` entries with tier and reason for each paper.

### Build Gate: Epic 1

```bash
npm run build
npx playwright test    # All 13 existing tests pass
```

Dev mode pipeline still works end-to-end. No regressions.


---

## Epic 2: Demo Clarity

### 2.1: Welcome Card Component

**Create new file:** `src/components/WelcomeCard.tsx`

```typescript
/**
 * WelcomeCard — First-run onboarding
 *
 * Explains what arXiv Radar is and what will happen when the user clicks RUN.
 * Adapts content to current state: dev mode, API key presence.
 * Disappears after first pipeline run (papers_seen > 0).
 *
 * @license CC BY 4.0
 */

import type { Settings } from '../types/app'

interface Props {
  settings: Settings
}

export function WelcomeCard({ settings }: Props) {
  const { dev_mode, api_key } = settings
  
  return (
    <div
      className="mb-6 p-6"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '4px solid var(--accent)',
        borderRadius: '2px',
      }}
    >

      {/* Title */}
      <h2
        className="text-xl mb-4"
        style={{
          fontFamily: 'Instrument Serif, serif',
          color: 'var(--text-primary)',
        }}
      >
        arXiv Radar
      </h2>
      <p
        className="text-sm mb-4 font-mono"
        style={{ color: 'var(--accent)' }}
      >
        Research Intelligence for the Cognitive Router Thesis
      </p>

      {/* Thesis explanation */}
      <div
        className="text-sm mb-4 space-y-3"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
        }}
      >

        <p>
          This tool watches arXiv through a specific lens: the Ratchet thesis
          about capability propagation from frontier to local AI models. Every
          paper is evaluated against six strategic questions.
        </p>
        <p>
          The pipeline is transparent. You'll see every stage.
        </p>
        <p>
          The governance is real.{' '}
          <span className="font-mono" style={{ color: 'var(--zone-yellow-text)' }}>YELLOW</span>{' '}
          papers need your approval.{' '}
          <span className="font-mono" style={{ color: 'var(--zone-red-text)' }}>RED</span>{' '}
          papers need your judgment. The system will halt — visibly — when it
          encounters something outside its boundaries.
        </p>
      </div>

      {/* Mode-specific message */}
      <div
        className="text-sm p-3 rounded-sm font-mono"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: dev_mode
            ? 'var(--zone-green-text)'
            : !api_key
              ? 'var(--zone-yellow-text)'
              : 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
      >

        {dev_mode ? (
          <p>
            Dev Mode is active. The pipeline will run on 7 seed papers — real
            arXiv research, pre-loaded. No API key required. One paper will
            trigger a governance halt to demonstrate Digital Jidoka.
          </p>
        ) : !api_key ? (
          <p>
            ⚠ No API key configured. Add your Anthropic API key in Settings to
            enable Tier 2 classification and briefing compilation.
          </p>
        ) : (
          <p>
            Live mode. The pipeline will fetch papers from arXiv and use Claude
            for classification and briefing compilation.
          </p>
        )}
      </div>

      {/* CTA */}
      <p
        className="mt-4 text-sm"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-muted)',
        }}
      >
        Click <span style={{ color: 'var(--accent)' }}>RUN</span> to start the pipeline.
      </p>
    </div>
  )
}
```


**Integration in App.tsx:**

Add import at top:
```typescript
import { WelcomeCard } from './components/WelcomeCard'
```

Add condition before JidokaAlert in the left column `<main>`:
```tsx
<div style={{ maxWidth: '720px' }}>
  {/* Welcome Card — first run only */}
  {state.stats.papers_seen === 0 && pipeline.current_stage === 'idle' && (
    <WelcomeCard settings={settings} />
  )}

  {/* Jidoka Alert */}
  {hasUnresolvedHalts && currentHalt && (
    <JidokaAlert ... />
  )}
  ...
</div>
```

**Verify:** Fresh state (clear localStorage or reset) → Welcome Card visible. Click RUN → Welcome Card disappears. Refresh → Welcome Card gone (papers_seen persisted).

---

### 2.2: GlassPipeline Stage Annotations

**File 1:** `src/hooks/useAutonomaton.ts` — Add computed annotation.

Add a `useMemo` near the other computed values:


```typescript
const pipelineAnnotation = useMemo((): string => {
  const { current_stage } = state.pipeline
  
  if (hasUnresolvedHalts && unresolvedHalts[0]) {
    const halt = unresolvedHalts[0]
    const paperRef = halt.paper_id ? ` — paper ${halt.paper_id}` : ''
    return `HALTED — ${halt.trigger.replace(/_/g, ' ')}${paperRef}`
  }
  
  switch (current_stage) {
    case 'telemetry':
      return state.settings.dev_mode ? 'Loading 7 seed papers' : 'Fetching from arXiv...'
    case 'recognition': {
      const total = state.incoming_papers.length + state.classified_papers.length + state.archived_papers.length
      const remaining = state.incoming_papers.length
      const processed = total - remaining
      return remaining > 0
        ? `Classifying ${processed + 1}/${total}`
        : 'Classification complete'
    }
    case 'compilation': {
      const pending = state.classified_papers.length
      return pending > 0
        ? `Compiling briefing — ${pending} remaining`
        : 'Compilation complete'
    }
    case 'approval':
      return `${state.pending_briefings.length} briefing${state.pending_briefings.length !== 1 ? 's' : ''} awaiting review`
    case 'execution':
      return 'Cycle complete — restarting...'
    case 'idle':
      return state.stats.papers_seen > 0 ? 'Awaiting new research' : 'Ready'
    default:
      return 'Ready'
  }
}, [
  state.pipeline.current_stage,
  state.settings.dev_mode,
  state.incoming_papers.length,
  state.classified_papers.length,
  state.archived_papers.length,
  state.pending_briefings.length,
  state.stats.papers_seen,
  hasUnresolvedHalts,
  unresolvedHalts,
])
```

Add `pipelineAnnotation` to the hook return object.

**File 2:** `src/components/GlassPipeline.tsx` — Replace the internal `statusText` useMemo.

Add a new prop:
```typescript
interface Props {
  currentStage: PipelineStage
  hasError: boolean
  isPolling: boolean
  hasUnresolvedHalts?: boolean
  hasCompletedCycle?: boolean
  annotation?: string  // NEW: Rich annotation from orchestrator
}
```

Replace the `statusText` useMemo with the prop:
```typescript
const displayText = props.annotation || statusText
```

Or better: delete the internal `statusText` entirely and use only `annotation`. The orchestrator has better context.

**File 3:** `src/App.tsx` — Pass the annotation:
```tsx
<GlassPipeline
  currentStage={pipeline.current_stage}
  hasError={hasError}
  isPolling={pipeline.is_polling}
  hasUnresolvedHalts={hasUnresolvedHalts}
  hasCompletedCycle={hasCompletedCycle}
  annotation={autonomaton.pipelineAnnotation}
/>
```

**Verify:** Run dev mode pipeline. Watch the annotation update per-paper during Recognition. Confirm halt shows trigger type and paper ID.


### Build Gate: Epic 2

```bash
npm run build
npx playwright test
# Manual: Clear localStorage, reload — WelcomeCard visible
# Manual: Click RUN — WelcomeCard disappears, annotation updates per-stage
```

---

## Epic 3: Live arXiv Fetch

### 3.1: Implement fetchArxivPapers + parseArxivResponse

**File:** `src/services/arxiv.ts`

Replace the stub `fetchArxivPapers()` and `parseArxivResponse()` with real implementations:

```typescript
/**
 * Fetch papers from arXiv API
 */
export async function fetchArxivPapers(
  categories: readonly string[],
  maxResults: number = 50
): Promise<ArxivPaper[]> {
  // Build query: cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.AI+...
  const catQuery = categories.map(c => `cat:${c}`).join('+OR+')
  const url = buildQueryUrl(catQuery, maxResults)
  
  // Rate limit: 1 second delay (arXiv requests this)
  await new Promise(resolve => setTimeout(resolve, ARXIV_CONFIG.rateLimitDelayMs))
  
  console.log(`[arXiv] Fetching: ${url}`)
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`arXiv API returned ${response.status}: ${response.statusText}`)
  }
  
  const xml = await response.text()
  const papers = parseArxivResponse(xml)
  console.log(`[arXiv] Parsed ${papers.length} papers`)
  return papers
}

/**
 * Parse arXiv Atom XML response into ArxivPaper[]
 */
export function parseArxivResponse(xml: string): ArxivPaper[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  
  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent?.slice(0, 200)}`)
  }
  
  const entries = doc.querySelectorAll('entry')
  
  return Array.from(entries).map(entry => {
    const rawId = entry.querySelector('id')?.textContent ?? ''
    // arXiv IDs come as URLs: http://arxiv.org/abs/2506.01234v1
    // Strip to just the ID portion
    const arxivId = rawId
      .replace('http://arxiv.org/abs/', '')
      .replace('https://arxiv.org/abs/', '')
      .replace(/v\d+$/, '') // Strip version suffix
    
    const title = (entry.querySelector('title')?.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ') // Collapse whitespace/newlines
    
    const abstract = (entry.querySelector('summary')?.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    
    const authors = Array.from(entry.querySelectorAll('author name'))
      .map(n => n.textContent?.trim() ?? '')
      .filter(Boolean)
    
    const categories = Array.from(entry.querySelectorAll('category'))
      .map(c => c.getAttribute('term') ?? '')
      .filter(Boolean)
```

```typescript
    const published = entry.querySelector('published')?.textContent ?? ''
    const updated = entry.querySelector('updated')?.textContent ?? ''
    
    // PDF link from <link> elements
    const links = Array.from(entry.querySelectorAll('link'))
    const pdfLink = links.find(l => l.getAttribute('title') === 'pdf')
    const pdfUrl = pdfLink?.getAttribute('href') ?? `https://arxiv.org/pdf/${arxivId}`
    
    return {
      arxiv_id: arxivId,
      title,
      abstract,
      authors,
      categories,
      published,
      updated,
      pdf_url: pdfUrl,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    }
  })
}
```

**Keep `loadSeedPapers()` and other seed functions intact.** They're used by dev mode.

**Verify:**
```bash
# Quick test in browser console (after dev server running):
fetch('https://export.arxiv.org/api/query?search_query=cat:cs.LG&max_results=5&sortBy=submittedDate&sortOrder=descending')
  .then(r => r.text())
  .then(console.log)
```

Then: Toggle dev mode OFF in settings, click RUN. Real papers should load. If no API key, compilation will Jidoka halt — that's correct.

### Build Gate: Epic 3

```bash
npm run build
npx playwright test
# Manual: Dev mode OFF → RUN → papers from arXiv load in pipeline
# Manual: Dev mode ON → RUN → seed papers load (no change)
```


---

## Epic 4: Cost Flow + Routing Telemetry

This epic is mostly wiring work — connecting data that already exists to places it needs to be visible.

### 4.1: Verify Cost Flow End-to-End

The compilation path already accumulates cost. Check this is working:

**File:** `src/state/reducer.ts` — `BRIEFING_COMPILED` case

Confirm this line exists:
```typescript
total_api_cost_usd: state.stats.total_api_cost_usd + 
  (action.briefing.compiled_by.cost_usd ?? 0),
```

It does. Good. The compilation cost path works.

Now verify the classification cost path from Story 1.3 is wired:
1. `state/types.ts` — `PAPER_CLASSIFIED` has `classification_cost_usd?`
2. `state/reducer.ts` — `PAPER_CLASSIFIED` case accumulates it
3. `useAutonomaton.ts` — Recognition effect passes `result.cost_usd`


### 4.2: FlywheelFooter Displays Real Numbers

**File:** `src/hooks/useAutonomaton.ts` — `flywheelStats` useMemo

Confirm `tier2_cost` maps to `state.stats.total_api_cost_usd`:
```typescript
const flywheelStats = useMemo((): FlywheelDisplayStats => {
  const activeSkills = state.skills.filter(s => !s.deprecated)
  return {
    tier0_skills: activeSkills.length,
    tier2_model: 'Sonnet',
    tier2_cost: state.stats.total_api_cost_usd,  // ← Must reflect both classification + compilation
    papers_seen: state.stats.papers_seen,
    briefings_approved: state.stats.briefings_approved,
    skills_promoted: state.skills.length,
    migrations_this_session: 0,
  }
}, [state.skills, state.stats])
```

This should already work once classification costs flow through from Story 1.3. Verify visually.

### 4.3: Routing Decision Telemetry in PipelineTrace

**Verify:** After the routing_decision telemetry from Story 1.4, check that `PipelineTrace.tsx` displays these entries properly. The component renders all telemetry entries — confirm `routing_decision` events render with their `details` field visible.

**File:** `src/components/PipelineTrace.tsx`

Check how entries are rendered. If the component only shows specific event types, add `routing_decision` to the display list.


### Build Gate: Epic 4

```bash
npm run build
npx playwright test
# Manual: Run with API key + dev mode OFF
#   → FlywheelFooter shows non-zero cost
#   → PipelineTrace shows routing_decision entries
# Manual: Run in dev mode
#   → Cost stays at $0.000 (no API calls)
#   → Routing decisions show tier: dev-mode
```

---

## Final Verification Sequence

After all four epics are complete, run this full sequence:

### Test 1: Dev Mode (Zero API Keys)

1. Clear localStorage (`localStorage.clear()` in console, reload)
2. Confirm dev mode is ON in settings
3. **Welcome Card visible** with dev mode message
4. Click RUN
5. **Welcome Card disappears**
6. **GlassPipeline annotation:** "Loading 7 seed papers" → "Classifying 1/7" → updates per paper
7. Paper `2510.03847` triggers **Jidoka halt** — pipeline annotation shows "HALTED — conflicting thesis"
8. **JidokaAlert** appears with Kaizen proposal
9. Resolve the halt
10. Pipeline resumes — compilation generates **voice-differentiated** mock briefings
11. Approve several YELLOW papers about the same topic
12. **Flywheel** detects pattern and proposes skill
13. Approve skill — **SkillsLibrary** shows new entry
14. **FlywheelFooter** shows: T0: 1 skill, T2: $0.000, papers: 7
15. Click RUN again — skill-matched papers handled at T0


### Test 2: Live Mode (With API Key)

1. Enter Anthropic API key in Settings
2. Toggle dev mode OFF
3. Click RUN
4. **GlassPipeline annotation:** "Fetching from arXiv..."
5. Real papers load from arXiv
6. Recognition classifies papers — **routing_decision** telemetry visible in PipelineTrace
7. Compilation generates briefings via Anthropic API
8. **FlywheelFooter** shows non-zero cost
9. Approve briefings
10. Pipeline completes cycle

### Test 3: Live Mode Without API Key (Jidoka)

1. Remove API key from Settings
2. Toggle dev mode OFF
3. Click RUN
4. arXiv fetch succeeds (no key needed)
5. Papers load into Recognition
6. T0 keyword matching classifies what it can
7. Papers needing T2 classification → **Jidoka halt** (missing API key)
8. Kaizen proposal: "Switch to dev mode" or "Enter API key"
9. Resolve by switching to dev mode → pipeline recovers

### Test 4: Persistence

1. Run dev mode, approve papers, promote a skill
2. Close browser tab
3. Reopen — state restored: skills, telemetry, approved briefings
4. Welcome Card does NOT appear (papers_seen > 0)

### Test 5: Network Failure (arXiv Down)

1. Dev mode OFF, API key present
2. Disconnect network (or block arXiv in dev tools)
3. Click RUN
4. **Jidoka halt** at Telemetry stage: "arXiv fetch failed"
5. Kaizen proposal: "Switch to dev mode" or "Retry"
6. Resolve by switching to dev mode


---

## Troubleshooting

### "dispatch is not defined" in Telemetry catch block
The catch block in Story 1.1 uses `dispatch` directly for Jidoka halts. This is correct — `dispatch` is available inside the hook scope, just not exposed externally. The existing Recognition and Compilation effects already use this pattern for error handling.

### arXiv returns 0 papers
The arXiv API returns papers from the last few days. If querying over a weekend or holiday, results may be empty. This is not an error — the pipeline should handle 0 papers gracefully (POLL_COMPLETE with empty array → idle state). The reducer already handles this case.

### Anthropic API returns 401
API key is invalid or expired. This should produce a Jidoka halt via the existing error handling in `classifier.ts` and `compiler.ts`. Verify the Vite proxy is running (`npm run dev`, not serving a production build).

### E2E tests fail after changes
The existing 13 tests run against the app in dev mode. If the Telemetry stage branch (Story 1.1) breaks dev mode behavior, tests will fail. Always verify dev mode still calls `loadSeedPapers()` when `dev_mode` is true.

### Pipeline stuck after Jidoka resolution
Check `processingRef.current` — the resolution effect in useAutonomaton.ts resets all processing flags when halts clear. If the pipeline doesn't resume, verify `unresolvedHaltCount` is recalculated after resolution (it's a useMemo dependency).

### Welcome Card doesn't disappear
WelcomeCard renders when `state.stats.papers_seen === 0 && pipeline.current_stage === 'idle'`. After START_POLL, the stage changes to `telemetry`. After POLL_COMPLETE, `papers_seen` increments. Either condition should hide the card. Check that both conditions are in the render guard.


---

## Known Constraints (Do Not Fix This Sprint)

1. **Vite proxy limitation.** `/anthropic-api` proxy only works during `npm run dev`. Production builds cannot call the Anthropic API. Future sprint: add `VITE_ANTHROPIC_BASE_URL` env var that defaults to the proxy in dev and a direct URL in production.

2. **arXiv rate limiting.** The arXiv API recommends 3-second delays. We use 1 second. Aggressive polling may result in temporary IP blocks. The Jidoka halt on fetch failure handles this gracefully.

3. **No Tier 1 (Ollama).** The tier cascade skips from T0 straight to T2. Ollama integration is a future sprint. The architecture supports it — just add a branch in `classifyPaper()` that checks for `settings.ollama_url`.

4. **Mock briefing quality.** The voice-differentiated mocks (Story 1.2) use hardcoded templates, not LLM generation. They demonstrate the principle of declarative voice control but aren't production-quality briefings.

5. **No CORS handling for arXiv in production.** The arXiv fetch works fine in dev (Vite proxy or direct browser fetch to arXiv — arXiv allows CORS). If deployed to a different origin, CORS may become an issue. Not relevant for local demo.

---

## Quality Gate

> "Design is philosophy expressed through constraint."

This sprint passes when:

- A CTO watching a demo can point to each of the five architectural commitments and see them working
- The same codebase runs in dev mode (zero API keys) and live mode (real APIs) with only a config toggle
- Every routing decision is a logged, auditable artifact in the telemetry
- The FlywheelFooter shows real cost numbers declining as skills promote
- Jidoka halts produce Kaizen proposals for every failure mode (missing key, fetch failure, conflicting thesis)
- The Welcome Card makes the app self-explanatory on first load
- The GlassPipeline annotation tells the story of what's happening in real time

The pattern document says "build one in a weekend." This app is the proof that claim is real.
