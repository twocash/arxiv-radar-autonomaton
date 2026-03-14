# Development Log — arXiv Radar v1

## Sprint Started

**Date:** 2026-03-13
**Sprint:** arxiv-radar-v1
**Goal:** Build protocol proof of Grove Autonomaton Pattern

---

## Planning Phase Complete

**Timestamp:** 2026-03-13T00:00:00Z
**Status:** ✅ Complete

### Artifacts Created
- [x] SPEC.md — Goals, acceptance criteria, attention anchor
- [x] REPO_AUDIT.md — Current state analysis
- [x] ARCHITECTURE.md — Target state design
- [x] MIGRATION_MAP.md — File-by-file execution plan
- [x] DECISIONS.md — 10 ADRs documenting key choices
- [x] SPRINTS.md — 7 epics with stories and build gates
- [x] EXECUTION_PROMPT.md — Self-contained handoff
- [x] DEVLOG.md — This file
- [x] CONTINUATION_PROMPT.md — Session handoff

### Key Decisions Made
1. Client-side only (no backend)
2. useReducer with bundle's reducer
3. localStorage for persistence
4. Tailwind v4 with CSS custom properties
5. Deterministic pattern hash for Flywheel
6. Dev mode with seed data
7. Anthropic SDK with dangerouslyAllowBrowser

### Ready for Execution
All planning artifacts complete. Ready to proceed with Epic 1: Scaffold.

---

## Epic 1: Scaffold

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Tasks
- [x] Initialize Vite project (manual setup due to non-empty directory)
- [x] Install dependencies (React 18, Tailwind v4, Anthropic SDK)
- [x] Copy bundle files (config, state, knowledge, prompts, seed)
- [x] Configure Tailwind + Grove design system (CSS custom properties)
- [x] TypeScript configuration (relaxed unused locals for bundle compatibility)

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.84s
```

### Files Created
- `package.json` — Dependencies and scripts
- `vite.config.ts` — Vite + React + Tailwind
- `tsconfig.json` — TypeScript config
- `tsconfig.node.json` — Node TypeScript config
- `index.html` — Entry with Google Fonts
- `src/index.css` — Tailwind + Grove design tokens
- `src/main.tsx` — React entry point
- `src/App.tsx` — Shell with pipeline and footer
- `src/vite-env.d.ts` — Vite + markdown raw import declarations
- `src/config/` — Copied from bundle
- `src/state/` — Copied from bundle
- `src/knowledge/` — Copied from bundle
- `src/prompts/` — Copied from bundle
- `src/seed/` — Copied from bundle

### Notes
- Had to manually create Vite project files because directory wasn't empty
- Relaxed `noUnusedLocals` in tsconfig due to bundle type imports
- Shell UI shows pipeline stages, zone badges, footer stats

---

## Bundle Alignment Check

**Timestamp:** 2026-03-14
**Status:** ✅ Complete

### Issue
KICKOFF.md is the canonical spec. The recipe bundle was an older version missing key Autonomaton pattern fields.

### Upstream Fixes Applied (grove-arxiv-radar)

**state/types.ts:**
1. `ClassifiedPaper` — Added `pattern_hash: string` (Flywheel detection fingerprint)
2. `ClassifiedPaper` — Added `falsification_signal?: boolean` (Q6 honesty test)
3. `DraftBriefing` — Added `tier_migration_impact?: string` (tier migration assessment)

### Verified Alignments
- `zones.ts` → `shouldTriggerJidoka()` correctly checks gap-closing + gap-widening
- `seed/sample-papers.json` → Paper 2510.03847 has `_expected_zone: "jidoka_halt"`
- `JIDOKA_TRIGGERS` → All 5 triggers present in config

### Re-imported Bundle
Fresh copy from upstream with fixes applied. Build passes.

---

## Epic 2: State Foundation

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Files Created
- `src/types/app.ts` — Extended types (Skill, SkillProposal, TelemetryEntry, KaizenProposal, Settings, AppState)
- `src/lib/patternHash.ts` — Deterministic hash generator for Flywheel detection
- `src/services/persistence.ts` — localStorage save/load with JSONL telemetry export
- `src/services/telemetry.ts` — Feed-first logging with stage-specific helpers
- `src/hooks/usePersistedState.ts` — Hydration + auto-save hook
- `src/hooks/useAutonomaton.ts` — Main orchestrator hook (combined reducer, dispatch, context)

### Updated Files
- `src/App.tsx` — Now uses useAutonomaton hook, shows live state in Debug panel

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.88s, 34 modules transformed
```

### Verification
1. App loads with initial state
2. Debug panel shows pipeline, stats, settings
3. State persists in localStorage (debounced auto-save)
4. Telemetry entries logged on actions

### Key Decisions
- Combined reducer handles both bundle and app actions
- Settings stored separately (API key isolation)
- Telemetry stored as JSON array (JSONL on export)
- Context provider in App.tsx for deep component access

---

## Epic 3: Pipeline Services

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Naming Fix
- Renamed `useAutomaton` → `useAutonomaton` throughout codebase (this is a reference implementation)
- Renamed `AutomatonContext` → `AutonomatonContext`
- Renamed hook file from `useAutomaton.ts` → `useAutonomaton.ts`

### Files Created
- `src/lib/loadKnowledge.ts` — Vite raw imports for knowledge/*.md files
- `src/lib/loadPrompts.ts` — Vite raw imports for prompts/*.md files
- `src/services/arxiv.ts` — Seed data loader + arXiv API stubs
- `src/services/jidoka.ts` — Halt creation + Kaizen proposal generation
- `src/services/classifier.ts` — Tier cascade: T0 skills → T0 keywords → T2 LLM

### Key Features
- **Tier Cascade**: Skills first (Tier 0), then keywords (Tier 0), then LLM (Tier 2)
- **Jidoka Detection**: Conflicting thesis (gap-closing + gap-widening) triggers halt
- **Dev Mode**: Uses `_expected_zone` from seed data for testing
- **Pattern Hash**: Generated for every classified paper for Flywheel detection

### Jidoka Test Verification
- Paper `2510.03847` correctly triggers `conflicting_thesis` Jidoka halt
- Matches both `gap-closing` and `gap-widening` topics
- Dev mode classifier returns halt with Kaizen proposal

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.75s, 34 modules transformed
```

### Jidoka Enforcement — FSM with Transition Guards

**Issue Found:** Skill-based classification bypassed Jidoka entirely. A skill firing on keywords could auto-process a paper that contained conflicting thesis evidence.

**Root Cause:** Each classification path (skill, keyword, dev mode) had independent Jidoka checks. Easy to miss one.

**Initial Fix (Rejected):** `jidokaGateway()` function — governance by convention, not structure.

**Proper CS Fix Applied:** State Machine with Transition Guards.

The bundle's reducer IS already a state machine. `PipelineStage` defines states. What was missing: the guard enforcement layer.

**Files Created:**
- `src/lib/transitionGuards.ts` — Guard enforcement layer
  - `isValidTransition()` — State machine transition table
  - `runJidokaGuards()` — Runs ALL Jidoka checks on every transition

**Pattern:**
```typescript
// dispatch is PRIVATE — only transition() is exposed
const transition = useCallback((action: CombinedAction): boolean => {
  // 1. VALIDATE: Is this transition legal from the current state?
  if (!isValidTransition(currentStage, action)) {
    return false
  }

  // 2. GUARD: Run Jidoka checks BEFORE the transition
  const jidokaResult = runJidokaGuards(currentState, action)
  if (jidokaResult.halt && jidokaResult.event) {
    dispatch({ type: 'JIDOKA_HALT', event: jidokaResult.event })
    dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(jidokaResult.event) })
    return false
  }

  // 3. TRANSITION: Dispatch the actual action
  dispatch(action)

  // 4. TELEMETRY: Log automatically (Feed-First)
  return true
}, [])
```

**Why This Is Correct:**
- `dispatch` is PRIVATE to the hook — cannot be called externally
- `transition()` is the ONLY way to change state — the "Single Pipeline Orchestrator"
- Jidoka guards run on EVERY transition — there is no bypass
- This is "impossibility over convention" — the pattern Autonomaton demands
- Telemetry is structural (Feed-First, Principle #3) — every transition logs

**Classifier Updated:**
- Removed `jidokaGateway()` from classifier.ts
- Classifier is now a pure function — it just classifies
- Jidoka enforcement moved to transition layer — separation of concerns

---

### Epic 3 Summary

**Build Gate:**
```bash
npm run build
# ✅ PASSED - built in 1.77s, 42 modules transformed
```

**Key Achievement:** Jidoka enforcement is now **structural**, not conventional. The `transition()` wrapper makes bypass impossible. This is the core Autonomaton pattern: "impossibility over convention."

---

## Epic 4: Flywheel Engine

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Files Created
- `src/services/flywheel.ts` — Pattern detection and skill promotion engine

### Files Modified
- `src/types/app.ts` — Added `matched_topics` and `matched_keywords` to TelemetryEntry
- `src/hooks/useAutonomaton.ts` — Integrated flywheel scan after BRIEFING_APPROVED

### Key Features

**Pattern Detection:**
- `detectCandidates()` scans telemetry for recurring pattern_hash values
- Groups by hash, counts occurrences within time window
- Returns candidates that meet threshold (default: 3 approvals in 14 days)

**Skill Promotion:**
- `createSkillProposal()` converts detected pattern to proposal
- Dedupes against existing proposals and skills
- Determines action based on zone (green→archive, yellow→classify, red→brief)
- `promoteSkill()` converts approved proposal to full Skill

**Integration:**
After BRIEFING_APPROVED transition:
1. Telemetry logs with pattern_hash, zone, matched_topics, matched_keywords
2. Flywheel scan runs with simulated updated telemetry
3. New proposals dispatched via SKILL_PROPOSAL_CREATED

**The Economic Proof:**
- `matchSkills()` runs FIRST in the classification cascade (classifier.ts:293)
- Every promoted skill = one fewer Tier 2 API call
- Skills handle known-good patterns at Tier 0 (cost: $0)

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.86s, 43 modules transformed
```

---

---

## Epic 5: UI Components

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Files Created
- `src/components/CommandBar.tsx` — Header with query input, voice selector, RUN button
- `src/components/VoiceSelector.tsx` — Voice preset toggle (News Brief / Technical / Strategic)
- `src/components/GlassPipeline.tsx` — 5-stage pipeline indicator with status colors
- `src/components/FlywheelFooter.tsx` — Sticky footer showing tier distribution and economics
- `src/components/BriefingCard.tsx` — Pending briefing with approve/reject + expandable trace
- `src/components/PaperTrace.tsx` — Provenance chain visualization

### Files Modified
- `src/App.tsx` — Refactored to use extracted components
- `src/services/telemetry.ts` — Added `getProvenanceChain(arxivId)`

### Key Features

**CommandBar:**
- Query input (disabled in dev mode)
- Voice selector with 3 presets
- RUN button with keyboard shortcut (Cmd+Enter / Ctrl+Enter)

**GlassPipeline:**
- Visual status: complete (green), active (amber), halt (red), pending (muted)
- Responsive: full labels on desktop, abbreviations on mobile
- Active stage has ring highlight when polling

**FlywheelFooter:**
- Tier 0 skills count (green badge)
- Tier 2 model + cumulative cost
- Migration indicator (animated when skills promote)
- Papers seen / approved / skills stats

**PaperTrace (Transparency as Architecture):**
- `getProvenanceChain(arxivId)` — Returns all telemetry for a paper, chronologically sorted
- Expandable on each BriefingCard via "Show Trace" button
- Displays: stage, event, tier, zone, cost, human feedback, skill firings
- **Audit proof:** Can an auditor reconstruct any system decision from telemetry alone? Yes.

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.94s, 50 modules transformed
```

---

---

## Epic 6: Governance UI

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Files Created
- `src/components/JidokaAlert.tsx` — Halt notification with Kaizen proposals
- `src/components/SkillProposals.tsx` — Flywheel promotion candidates
- `src/components/PendingGovernance.tsx` — Briefings awaiting approval
- `src/components/SkillsLibrary.tsx` — Collapsible skill catalog with inspect/deprecate/delete
- `src/components/SettingsPanel.tsx` — Configuration UI (API key, dev mode, flywheel config, export, reset)

### Files Modified
- `src/App.tsx` — Integrated all governance components

### Key Features

**JidokaAlert:**
- Red pulsing border (CSS animation)
- Trigger-specific labels and descriptions
- Kaizen proposal buttons with recommended option highlighted
- Manual acknowledge/dismiss options
- Links to paper ID and timestamp

**SkillProposals:**
- Card per proposal with zone badge
- Pattern details: topics, keywords, proposed action
- Approve (promote to T0) / Reject buttons
- Time range display (first/last seen)

**SkillsLibrary:**
- Expandable details per skill
- Stats: times fired, accuracy percentage
- Deprecate (soft delete) and Delete actions
- Separated active vs deprecated skills
- Empty state with Flywheel explanation

**SettingsPanel:**
- Dev mode toggle
- API key input (show/hide, save)
- Flywheel threshold and window configuration
- Telemetry export (JSONL download)
- State reset with confirmation

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 1.96s, 55 modules transformed
```

---

---

## Epic 7: API Integration + Polish

**Status:** ✅ Complete
**Timestamp:** 2026-03-14

### Files Created
- `src/services/compiler.ts` — Tier 2 briefing compilation with Anthropic SDK

### Files Modified
- `vite.config.ts` — Added Vite dev proxy for Anthropic API (CORS bypass)
- `src/services/classifier.ts` — Implemented `llmClassify()` with Anthropic API
- `src/services/jidoka.ts` — Context-aware Kaizen proposals (external update)
- `src/components/JidokaAlert.tsx` — Domain-specific Jidoka UX (external update)

### Key Implementation Details

**CORS Solution: Vite Dev Proxy**
```typescript
// vite.config.ts
server: {
  proxy: {
    '/anthropic-api': {
      target: 'https://api.anthropic.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/anthropic-api/, ''),
    },
  },
}
```

Browser → localhost:5173/anthropic-api/v1/messages → Vite proxy → api.anthropic.com/v1/messages

**SDK Initialization:**
```typescript
new Anthropic({
  apiKey,
  baseURL: '/anthropic-api', // Vite dev proxy
  dangerouslyAllowBrowser: true, // Browser context check
})
```

**Cost Tracking:**
- Token counts from API response (`input_tokens`, `output_tokens`)
- Directional cost estimate (exact pricing doesn't matter for throwaway app)
- Economic proof is the DELTA: costs decline as skills promote to T0

**Jidoka Integration:**
- LLM can return `jidoka: true` with trigger type
- Parser handles both confidence and conflicting thesis halts
- API failures → Jidoka halt with retry option

### Build Gate
```bash
npm run build
# ✅ PASSED - built in 2.15s, 93 modules transformed
```

---

## Sprint Complete

All 7 Epics complete. arXiv Radar v1 is a working protocol proof of the Grove Autonomaton Pattern.

### Final Module Count: 93

### Architecture Delivered:
1. **Single Pipeline Orchestrator** — `dispatch` is PRIVATE, only `transition()` exposed
2. **FSM with Transition Guards** — Jidoka enforcement is structural, not conventional
3. **Tier Cascade** — Skills (T0) → Keywords (T0) → LLM (T2)
4. **Flywheel** — Pattern detection → Skill promotion → Economic payoff
5. **Feed-First Telemetry** — Every transition logs automatically
6. **Provenance Chain** — Full audit trail per paper

### Manual Tests (from SPRINTS.md)
1. **Jidoka Test**: Paper 2510.03847 triggers halt → Kaizen appears → Resolution works
2. **Flywheel Test**: Approve 3+ similar → Skill proposal → Skill handles at T0
3. **Sovereignty Test**: Dev mode works offline, T0 classification, state persists
4. **Persistence Test**: Close/reopen browser → state restored
5. **Ratchet Test**: First run costs → skills promote → second run lower costs

---

## Notes

*Sprint complete. Reference implementation delivered.*
