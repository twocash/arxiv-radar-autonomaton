# KICKOFF: arXiv Radar — Full Autonomaton Protocol Proof

## What You're Building

A working React application that implements the COMPLETE Grove Autonomaton Pattern on a real domain: arXiv research intelligence. This app proves that a recipe bundle composes into a self-improving system — one that gets cheaper, smarter, more autonomous, and more transparent with every interaction.

**This is a protocol proof, not a prototype.** Every architectural claim in the Autonomaton Pattern must be demonstrable in this running application. The five architectural commitments. The seven-principle quality bar. The Skill Flywheel. The Jidoka-Kaizen convergence. The Ratchet economics. All of it.

**This app will be deleted.** It exists to validate the recipe bundle and reverse-engineer a Foundry generation prompt. Build it clean, build it complete, build it disposable.

## Source Material

The recipe bundle lives at `C:\GitHub\grove-arxiv-radar\`. **Read-only. Do not modify.**

Copy these directories into `src/` during setup:
- `config/` — Declarative governance (routing, zones, voices, defaults)
- `state/` — Types and reducer (includes JidokaEvent types)
- `knowledge/` — Strategic lens (6 questions, significance criteria, contrarian analysis)
- `prompts/` — LLM prompt templates (classify, news-brief, technical-summary, strategic-intel)
- `seed/` — 7 real arXiv papers for testing

Also read `BUILD.md` in that repo for phase-by-phase context.

## Build Location

`C:\GitHub\arxiv-test-app\`

## Tech Stack

- **Framework:** React 18+ with TypeScript (Vite)
- **Styling:** Tailwind CSS with Grove design system tokens
- **State:** `useReducer` with the bundle's reducer + localStorage persistence
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) for Tier 2
- **No backend.** Client-side app. State persists in localStorage across sessions.

---

## THE FIVE ARCHITECTURAL COMMITMENTS

The Autonomaton Pattern defines five commitments plus a Cognitive Router. Every one must be visible in the running app. This is the spec. Do not skip any of them.

### 1. Declarative Behavior Governance

ALL behavior lives in config files, not imperative code. Routing rules, zone classifications, voice presets, skill definitions, approval patterns — all declarative. 

**The test:** Can you change what the system does by editing a config file without changing application code? If no, the feature is incomplete.

The config files from the bundle (`defaults.ts`, `routing.ts`, `zones.ts`, `voices.ts`) ARE the governance layer. The app reads them. It never hardcodes behavior that should live in config.

### 2. Sovereignty Guardrails (The Zone Model)

Every action has an explicit risk classification:

- 🟢 **GREEN** — Autonomous routine. System executes without asking. Confirmed patterns, low-risk ops.
- 🟡 **YELLOW** — Supervised proposals. System proposes, human approves. New skills, medium-risk ops, classification below confidence threshold.
- 🔴 **RED** — Human-only. System surfaces information and waits. Architecture decisions, high-consequence signals.

Zone boundaries are declarative — defined in `zones.ts`, not hardcoded. As trust develops, actions migrate from YELLOW to GREEN. The system earns autonomy through demonstrated reliability, not by assertion. **It can propose expanding boundaries (a YELLOW action). It cannot unilaterally grant itself new authority.**

### 3. The Skill Flywheel — THIS IS THE CORE DIFFERENTIATOR

This is the mechanism that makes the app self-improving. It's also what was missing from the first build attempt. Get this right.

Every interaction generates telemetry. From this telemetry, a six-stage flywheel turns:

1. **OBSERVE** — Log every interaction with structured metadata. Every classification, every approval, every rejection, every zone assignment. Each telemetry entry includes a `pattern_hash` — a fingerprint grouping similar interactions.

2. **DETECT** — Same `pattern_hash` appears 3+ times in 14 days → surface as potential skill. The detection runs on every pipeline completion, scanning the telemetry log for repeating patterns.

3. **PROPOSE** — Draft a skill specification: "You've approved 4 YELLOW papers about quantization with relevance > 0.6 in the last week. Want me to auto-approve that pattern?" The proposal is a structured object: matched keywords, zone, threshold, proposed action.

4. **APPROVE** — The human blesses the PATTERN, not individual instances. One approval enables unlimited future executions. This is a YELLOW-zone action. The skill proposal appears in the UI with approve/reject buttons.

5. **EXECUTE** — The skill runs automatically on matching future intents. It's now a GREEN-zone action. Papers matching the pattern get classified and handled without human review.

6. **REFINE** — Usage data and corrections improve the skill. Skills that stop matching get deprecated. Skills the human overrides get flagged for review. Skills that evolve get updated.

**Implementation:**

```typescript
// A skill is a declarative artifact — inspectable, editable, deletable
interface Skill {
  id: string
  pattern_hash: string
  name: string                    // Human-readable: "Auto-approve quantization papers > 0.6"
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone                      // What zone this skill operates in (GREEN after promotion)
  threshold: number               // Minimum relevance score
  action: 'auto_archive' | 'auto_classify' | 'auto_brief'
  promoted_at: string             // When the human approved it
  promoted_from: Zone             // Was YELLOW, now GREEN
  times_fired: number             // How many times it's executed
  last_fired: string | null
  accuracy: number                // % of times the human didn't override
  deprecated: boolean
}
```

Skills live in a `skills[]` array in persisted state. They are a **library with a card catalog** — the user can inspect every skill, see when it was promoted, how many times it fired, and delete it. The system's intelligence is not a black box.

**The economic proof:** Every skill promotion moves work from Tier 1/2 (costs money) to Tier 0 (free). The UI must show this: a cost curve declining over time, a count of Tier 0 skills growing, and the percentage of papers handled without any API call.

### 4. Feed-First Telemetry

Every interaction generates structured telemetry as its PRIMARY output. Not logging bolted on the side — the mechanism through which the system learns, the Flywheel turns, and the Cognitive Router improves.

```typescript
interface TelemetryEntry {
  ts: string                      // ISO timestamp
  stage: PipelineStage            // Which pipeline stage
  event: string                   // What happened
  arxiv_id?: string
  intent?: string
  tier?: CognitiveTier
  zone?: Zone
  pattern_hash?: string           // Groups similar interactions for Flywheel detection
  confidence?: number
  cost_usd?: number
  human_feedback?: 'approved' | 'rejected' | 'edited' | 'resolved'
  jidoka?: boolean
  skill_id?: string               // If handled by a promoted skill
  details?: string
}
```

The telemetry serves triple duty: **learning** (feeds the Flywheel), **observability** (surfaces system health), **compliance** (produces audit trails). One stream. Not three systems.

Persisted in localStorage as JSONL. Exportable. Every pipeline stage writes a trace. Every jidoka halt writes a trace. Every approval writes a trace. Every skill promotion writes a trace.

### 5. Fail-Fast / Fail-Loud (Digital Jidoka) + Kaizen Proposals

When the pipeline degrades, the system does THREE things:

1. **STOPS.** No confident output from an uncertain pipeline. No degraded fallback. No silent retry.
2. **SURFACES.** The failure includes diagnostic context: which stage failed, what error, what was expected, what to check.
3. **PROPOSES THE FIX.** This is the Kaizen half — the system doesn't just stop, it analyzes the failure and generates a proposed repair as a YELLOW-zone action.

**Jidoka triggers (from `zones.ts`):**
- API key missing/invalid → halt at Telemetry. Kaizen proposal: "Switch to dev mode with seed data" or "Enter API key in settings."
- Classification confidence below 0.25 → halt at Recognition. Kaizen proposal: "Based on keyword analysis, suggest classifying as [zone] because [rationale]."
- Conflicting thesis evidence (paper matches both Q1 and Q6) → halt at Recognition. Kaizen proposal: "Abstract emphasizes constrained tasks — suggest Q1 (gap closing) with Q6 caveat noted."
- Unknown high-signal entity → halt at Recognition. Kaizen proposal: "Add [author/institution] to watchlist?" 
- Malformed arXiv data → halt at Telemetry. Kaizen proposal: "Retry" or "Use cached data."

**Every Kaizen proposal is a YELLOW-zone action.** The system proposes. The human approves or rejects. The resolution is logged to telemetry.

---

## THE COGNITIVE ROUTER

The dispatch layer that makes everything operational. Every interaction passes through it. It reads structured context and makes the dispatch decision: which tier handles this, what zone governs it, what telemetry to capture.

**Four tiers:**
- **Tier 0 — Pattern Cache.** Instant. Free. Private. Matched from promoted skills. No model call. No external dependency. Everything here runs locally.
- **Tier 1 — Cheap Cognition.** Small local models via Ollama (optional). Fractions of a cent. Handles classification and scoring.
- **Tier 2 — Premium Cognition.** Cloud API (Anthropic). Cents per interaction. Handles briefing compilation, claim extraction, voice rewriting.
- **Tier 3 — Apex Cognition.** Reserved for strategic analysis, tier migration assessment. Frontier models, maximum capability.

**The economic insight:** Every Tier 2 interaction that becomes a recognized pattern can become a Tier 0 cached skill — 100x cheaper. The architecture's natural dynamic is to move computation toward cheaper, more local, more sovereign resources. **Every time work migrates down a tier, four things improve simultaneously: cost, privacy, sovereignty, simplicity.** These aren't competing priorities. They're the same optimization expressed four ways.

The FlywheelFooter must make this visible: show the tier distribution shifting over time.

---

## THE SEVEN PRINCIPLES (Quality Bar for Every Feature)

1. **Extended Mind.** The system is part of the human's cognition. Design decisions reduce cognitive load, never add to it.
2. **Pattern-Based Approval.** Approve categories of action, not individual instances. One approval enables unlimited future executions.
3. **Feed-First.** Every interaction generates structured telemetry. Without it, the system can't learn.
4. **Async-First.** State persists in durable storage. Sessions resume. Context carries across browser restarts. The system never forces the human to reconstruct what happened before.
5. **Self-Improving.** The system identifies its own limitations, surfaces them, and dispatches fixes — autonomously for low-risk, with approval for high-risk.
6. **Composable.** Capabilities are pluggable modules. New voices, new knowledge files, new topic groups connect through config, not code changes.
7. **Model Independence.** The cognitive layer is a swappable dependency. Swap Claude for Llama — the zones don't change, the routing doesn't change, the telemetry doesn't change.
8. **Shame-Resistant.** Failure is surfaced without judgment. Rejecting a briefing feels like giving feedback, not punishing the system. Changing voice presets mid-session has zero friction. Jidoka halts say "the system caught something" not "something went wrong."

---

## THE FIVE-STAGE PIPELINE

Every paper traverses the same invariant pipeline. The pipeline doesn't change. Surfaces, models, skills, and capabilities change.

### Stage 1: Telemetry
- **Trigger:** User clicks "Run" or automatic poll
- **Action:** Fetch papers from arXiv API (or `seed/sample-papers.json` in dev mode)
- **Skill Flywheel check:** Before fetching, check if any Tier 0 skills can pre-filter categories
- **Jidoka:** If arXiv API fails or returns malformed data → HALT. Kaizen proposal: "Switch to dev mode" or "Retry"
- **Dispatch:** `START_POLL` → fetch → `POLL_COMPLETE` or `POLL_ERROR`
- **Telemetry log:** `{ stage: "telemetry", event: "poll_complete", count: N }`

### Stage 2: Recognition
- **Action per paper:**
  1. **Tier 0 first:** Check promoted skills. If a skill matches this paper's keywords/topics/authors → apply the skill's zone classification directly. Log `skill_id` in telemetry. Skip LLM entirely. **This is where the Flywheel pays off.**
  2. **Tier 0 keyword matching:** Run against `config/defaults.ts` keyword lists. Author lookup. Category filter.
  3. **Jidoka check (pre-LLM):** `shouldTriggerJidoka()` from `zones.ts`. Conflicting thesis (Q1+Q6)? Confidence below floor? Unknown entity? → HALT with Kaizen proposal.
  4. **Tier 1 (if Ollama available) or Tier 2 (fallback):** Send to model with `prompts/classify-paper.md` + knowledge context. Parse JSON.
  5. **Jidoka check (post-LLM):** If model returns `jidoka: true` → HALT with Kaizen proposal.
  6. **Zone assignment:** `assignZone()` from `zones.ts`
- **Pattern hash generation:** Create a hash from matched_topics + zone + significance. This feeds the Flywheel.
- **Dispatch:** `PAPER_CLASSIFIED` or `PAPER_ARCHIVED` (GREEN) or `JIDOKA_HALT`
- **Telemetry:** `{ stage: "recognition", arxiv_id, zone, tier_used, pattern_hash, skill_id?, jidoka? }`

### Stage 3: Compilation
- **Trigger:** Classified papers with zone YELLOW or RED
- **Action per paper:**
  1. Load voice preset from `config/voices.ts` + prompt template from `prompts/*.md`
  2. Inject ALL knowledge files as context (`topics.md`, `significance.md`, `contrarian.md`)
  3. **Enrich from history:** Pull previously classified papers on same topic from archive. Pull past approvals/rejections from telemetry. This is the Compilation stage doing what the spec says: "accumulated knowledge comes together into a complete picture before inference begins."
  4. Call Tier 2 model with composed prompt
  5. Parse: headline, body, key_claims[], caveats[], tier_migration_impact
- **Dispatch:** `BRIEFING_COMPILED`
- **Telemetry:** `{ stage: "compilation", arxiv_id, voice, tier: 2, cost_usd, pattern_hash }`

### Stage 4: Approval
- **Trigger:** Briefings in `pending_briefings`
- **GREEN papers:** Already handled — auto-archived in Recognition. Never reach this stage.
- **YELLOW papers:** Briefing card with approve/edit/reject. Standard governance.
- **RED papers:** Briefing card with prominent warning: "High-consequence signal. System surfaces information only. Your judgment required." Approve/edit/reject still available, but the framing is different.
- **Skill proposals also surface here:** When the Flywheel detects a repeating pattern, the proposal appears as a special card: "Promote to Tier 0 skill? [Pattern description] — Approved 4/4 times in last 7 days." Approve/reject. This is Pattern-Based Approval (Principle #2).
- **Telemetry:** `{ stage: "approval", arxiv_id, action: "approved|rejected|edited", zone, pattern_hash }`

### Stage 5: Execution
- **Trigger:** Briefing approved (or skill auto-executed for GREEN)
- **Actions:**
  1. Write to telemetry log
  2. Add to approved archive
  3. **Run Flywheel detection:** Scan telemetry for repeating `pattern_hash` values. If threshold met (3+ in 14 days), create a skill proposal. This fires EVERY time — it's how the system learns.
  4. Check for tier migration candidates: if a Tier 2 classification has been approved enough times with same pattern_hash, propose migrating to Tier 1 or Tier 0.
- **Dispatch:** Pipeline returns to idle (or processes next paper)
- **Telemetry:** `{ stage: "execution", arxiv_id, event: "archived", pattern_hash, flywheel_candidates: N }`

---

## STATE PERSISTENCE (Principle #4: Async-First)

The app state MUST survive browser refresh and session restart. Use localStorage.

On every state change, persist the full `ArxivRadarState` (plus `skills[]` and `telemetry[]`) to localStorage. On app load, hydrate from localStorage if available, otherwise use `INITIAL_STATE`.

The user closes the browser Friday, opens it Monday, and the app shows: their approved briefings, their promoted skills, their telemetry history, their flywheel stats. No context loss. This is the Extended Mind requirement: the system never forces the human to reconstruct what happened before.

---

## DEV MODE: Seed Data Pipeline (Zero API Keys Required)

The app MUST run the FULL pipeline — including Flywheel detection — against seed data without any API keys.

**When dev mode is ON:**
1. **Telemetry:** Load `seed/sample-papers.json` (7 real arXiv papers)
2. **Recognition (Tier 0 only):** Keyword matching + `shouldTriggerJidoka()`. Use `_expected_zone` and `_rationale` from seed data as mock classification results.
3. **Jidoka proof:** Paper `2510.03847` MUST trigger a conflicting thesis halt. Kaizen proposal MUST appear suggesting resolution.
4. **Compilation (mock):** Format abstract text using voice constraints. No API needed.
5. **Approval + Flywheel:** Works normally. After approving several papers, the Flywheel MUST detect the pattern and propose a skill.

**The demo sequence (must work with zero API keys):**
1. App loads → Pipeline idle → Previous session state restored from localStorage (or empty on first run)
2. User clicks RUN → 7 papers load
3. Recognition: 2 RED, 3 YELLOW, 1 GREEN auto-archived, 1 JIDOKA HALT
4. JidokaAlert appears with Kaizen proposal for the conflicting thesis paper
5. User resolves → Compilation generates mock briefings
6. User approves several YELLOW papers about quantization/cost
7. Flywheel detects: "You've approved 3 papers matching 'cost-falling' pattern. Promote to Tier 0 skill?"
8. User approves the skill
9. Next RUN: papers matching that pattern skip LLM classification entirely → Tier 0 cached skill handles them
10. FlywheelFooter shows: cost declining, Tier 0 skills growing, tier distribution shifting

**This entire sequence is the protocol proof.**

---

## DESIGN SYSTEM

Grove Foundation design language. Dark, amber-accented, monospace-forward. This looks like infrastructure monitoring, not consumer software.

```css
--bg-primary: #0D0D0D;
--bg-secondary: #121212;
--bg-surface: #1A1A1A;
--bg-elevated: #222222;
--text-primary: #E8E2D9;
--text-secondary: #B0A898;
--text-muted: #7A7264;
--accent: #D4621A;
--accent-hover: #E87A2E;
--zone-green: #2D5A27;     --zone-green-text: #5EBF50;
--zone-yellow: #B8860B;    --zone-yellow-text: #E8C94A;
--zone-red: #8B2500;       --zone-red-text: #E85A3A;
--jidoka-bg: #3D1010;      --jidoka-border: #FF3333;
--border: #2A2A2A;
```

**Fonts (Google Fonts):** Instrument Serif (headings), Fragment Mono (UI labels, pipeline, zones, numbers), DM Sans (body text, briefings).

**Rules:** No border-radius > 2px. 1px borders. Zone badges: zone color at 15% opacity background, zone-colored text. Jidoka: pulsing red border. 8px base spacing unit.

---

## UI COMPONENTS

### Layout
Vertical stack: CommandBar → GlassPipeline → JidokaAlert (conditional) → SkillProposals (conditional) → PendingGovernance → SkillsLibrary (collapsible) → FlywheelFooter (sticky bottom)

### CommandBar
- Left: "arXiv Radar" in Instrument Serif
- Center: Text input ("Brief me on sovereign AI infrastructure...")
- Right: VoiceSelector dropdown → Settings icon → RUN button (amber, also Cmd+Enter)

### GlassPipeline
- Horizontal bar, 5 stages: Telemetry → Recognition → Compilation → Approval → Execution
- Status per stage: [✓] complete, [●] active, [!] jidoka halt, [ ] pending
- Detail text: tier used, paper count, elapsed time
- Jidoka halt: halted stage pulses red, subsequent stages dim
- Compact — one row, dense information

### JidokaAlert
- Appears ABOVE governance section when unresolved halts exist
- Red pulsing left border, dark red background
- Content: "⚠ PIPELINE HALTED" + trigger type + details + paper reference
- **Kaizen proposal section:** The system's suggested resolution with approve/reject buttons
  - Conflicting thesis: "Classify as Q1 with Q6 caveat" / "Classify as Q6 with Q1 caveat" / custom
  - Confidence below threshold: Manual zone dropdown + rationale text
  - API failure: "Switch to dev mode" / "Retry" / "Enter API key"
- Shame-resistant framing: "The system caught something that needs your judgment" not "Error"

### SkillProposals
- Appears when Flywheel has detected promotable patterns
- Card per proposal: pattern description, times approved, proposed action, approve/reject
- Example: "Auto-archive papers matching 'cost-falling' with relevance > 0.6 — approved 4/4 times"
- Approving creates a Skill in the SkillsLibrary and promotes to Tier 0

### PendingGovernance
- Section header: "Pending Governance (N)"
- BriefingCards for each paper in `pending_briefings`
- Empty state: "All papers processed. Pipeline idle."

### BriefingCard
- Zone badge (colored) + matched topic name (from 6 strategic questions)
- Headline (DM Sans bold) + body text (DM Sans regular)
- Source link: arxiv.org/abs/XXXXX
- Compilation metadata: "Compiled Xm ago • Tier 2 • Claude Sonnet • $0.003"
- Actions: [✓ Approve] [✎ Edit] [✗ Reject] — text buttons, not chunky
- Expandable trace [◰]: classification JSON, strategic question scores, matched keywords, pattern_hash

### SkillsLibrary (Collapsible Section)
- Header: "Skills Library (N active)" — click to expand/collapse
- Each skill shows: name, pattern description, zone, times fired, accuracy %, promoted date
- Actions per skill: [Inspect] (shows full skill JSON) [Deprecate] [Delete]
- This is the "library with a card catalog" — the system's intelligence is visible, editable, deletable
- Empty state on first run: "No skills yet. Approve papers to start the Flywheel."

### FlywheelFooter (Sticky Bottom)
- Left: Tier distribution — `🟢 T0: 3 skills | 🟢 T1: Llama-3-8B | 🔵 T2: Sonnet ($0.023 total)`
- Center: Migration indicator — "↓ 2 tasks migrated to Tier 0 this session" or cost trend arrow
- Right: Stats — papers seen, briefings approved, skills promoted, total API cost
- This bar is the economic proof of the Ratchet. The user watches Tier 0 grow and costs decline.

### SettingsPanel
- Slide-out or modal
- API key (localStorage, never logged to telemetry)
- Ollama base URL (default: localhost:11434)
- Dev mode toggle (seed data vs live arXiv)
- Flywheel sensitivity: how many approvals before proposing a skill (default: 3)
- Flywheel window: time window for pattern detection (default: 14 days)
- Telemetry export button (download JSONL)
- Reset button (clear all state + skills + telemetry — with confirmation)

---

## APP ARCHITECTURE

```
src/
├── components/
│   ├── App.tsx                 # Root layout, state provider, keyboard shortcuts
│   ├── CommandBar.tsx          # Query input, voice selector, run button
│   ├── GlassPipeline.tsx      # 5-stage pipeline indicator
│   ├── JidokaAlert.tsx        # Halt notification with Kaizen proposals
│   ├── SkillProposals.tsx     # Flywheel promotion candidates
│   ├── PendingGovernance.tsx   # Briefings awaiting approval
│   ├── BriefingCard.tsx       # Single briefing with zone, trace, actions
│   ├── PaperTrace.tsx         # Expandable classification details
│   ├── SkillsLibrary.tsx     # Inspectable skill catalog
│   ├── FlywheelFooter.tsx    # Tier status, migration, cost tracking
│   ├── VoiceSelector.tsx     # Voice preset dropdown
│   └── SettingsPanel.tsx     # API key, dev mode, flywheel config
├── services/
│   ├── arxiv.ts              # arXiv API client + seed data loader
│   ├── classifier.ts         # Recognition: T0 skills → T0 keywords → T1/T2 LLM
│   ├── compiler.ts           # Compilation: voice prompt + knowledge context → briefing
│   ├── telemetry.ts          # JSONL logging to localStorage, pattern_hash generation
│   ├── jidoka.ts             # Halt creation, Kaizen proposal generation, resolution
│   ├── flywheel.ts           # Pattern detection, skill proposal, promotion, deprecation
│   └── persistence.ts        # Save/load full state to/from localStorage
├── config/                   # ← Copied from bundle (read-only governance)
├── state/                    # ← Copied from bundle (types + reducer)
├── knowledge/                # ← Copied from bundle (loaded as raw text via ?raw)
├── prompts/                  # ← Copied from bundle (loaded as raw text via ?raw)
├── seed/                     # ← Copied from bundle
├── hooks/
│   ├── useAutomaton.ts       # Main orchestrator: reducer + pipeline + flywheel
│   └── usePersistedState.ts  # localStorage hydration + auto-save on state change
├── lib/
│   ├── loadKnowledge.ts      # Vite ?raw imports for .md files
│   ├── loadPrompts.ts        # Vite ?raw imports for prompt templates
│   └── patternHash.ts        # Hash generation from matched_topics + zone + keywords
├── main.tsx
└── index.css                 # Tailwind + CSS custom properties + Google Fonts
```

### Key Service: `services/flywheel.ts`

This is new — didn't exist in the bundle because the bundle is a recipe, not an app.

```typescript
// Core flywheel operations
function generatePatternHash(topics: string[], zone: Zone, keywords: string[]): string
function detectCandidates(telemetry: TelemetryEntry[], window: number, threshold: number): SkillCandidate[]
function createSkillProposal(candidate: SkillCandidate): SkillProposal
function promoteSkill(proposal: SkillProposal): Skill
function matchSkill(paper: ArxivPaper, skills: Skill[]): Skill | null
function deprecateSkill(skillId: string, reason: string): void
function getFlywheelStats(skills: Skill[], telemetry: TelemetryEntry[]): FlywheelStats
```

### Extended State (App adds to bundle types)

The bundle provides `ArxivRadarState`. The app extends it:

```typescript
interface AppState extends ArxivRadarState {
  skills: Skill[]
  skill_proposals: SkillProposal[]
  telemetry_log: TelemetryEntry[]
  settings: {
    api_key: string | null
    ollama_url: string
    dev_mode: boolean
    flywheel_threshold: number     // Default: 3
    flywheel_window_days: number   // Default: 14
  }
}
```

The `useAutomaton` hook wraps the bundle's reducer with additional handling for skills, telemetry, persistence, and flywheel detection.

---

## BUILD PHASES

### Phase 0: Scaffold
```bash
cd C:\GitHub\arxiv-test-app
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install @anthropic-ai/sdk
```

Copy bundle into `src/`:
```powershell
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\config src\config
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\state src\state
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\knowledge src\knowledge
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\prompts src\prompts
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\seed src\seed
```

Set up Tailwind, CSS vars, Google Fonts. Verify blank page renders.

### Phase 1: Core State Machine + Persistence
1. `hooks/usePersistedState.ts` — localStorage hydration + auto-save
2. `hooks/useAutomaton.ts` — `useReducer` with bundle reducer + extended state
3. `services/telemetry.ts` — JSONL logging with `pattern_hash` generation
4. `services/persistence.ts` — save/load full state
5. `lib/patternHash.ts` — hash generation from classification results

**Verify:** State persists across page refresh. Telemetry entries accumulate.

### Phase 2: Recognition Pipeline + Jidoka
1. `services/classifier.ts` — Tier 0 keyword matching from `defaults.ts`
2. `services/jidoka.ts` — halt creation + Kaizen proposal generation
3. Wire dev mode: seed data → T0 classify → jidoka check → mock classification results
4. `lib/loadKnowledge.ts` + `lib/loadPrompts.ts` — Vite `?raw` imports

**Verify:** Run with seed data. Paper 2510.03847 triggers jidoka halt. Other 6 classify correctly. Telemetry logs every step with pattern_hash.

### Phase 3: Flywheel Engine
1. `services/flywheel.ts` — pattern detection, skill proposal, promotion, matching
2. Add `Skill` and `SkillProposal` types to app state
3. Wire flywheel detection into Execution stage (runs after every approval)
4. Wire skill matching into Recognition stage (checks skills BEFORE keyword matching)

**Verify:** Approve 3+ papers with same pattern. Flywheel proposes a skill. Approve the skill. Next run: matching papers handled at Tier 0. Telemetry shows `skill_id`.

### Phase 4: UI Shell
1. `App.tsx` — full layout with all sections
2. `CommandBar.tsx` + `VoiceSelector.tsx`
3. `GlassPipeline.tsx` — reactive to pipeline state
4. `FlywheelFooter.tsx` — tier distribution, cost tracking, migration indicator

**Verify:** Pipeline stages light up during processing. Footer shows correct tier config.

### Phase 5: Governance UI
1. `BriefingCard.tsx` + `PaperTrace.tsx` — zone badge, briefing, actions, expandable trace
2. `PendingGovernance.tsx` — maps pending briefings to cards
3. `JidokaAlert.tsx` — halt notification + Kaizen proposal UI + resolution flow
4. `SkillProposals.tsx` — flywheel promotion candidates with approve/reject
5. `SkillsLibrary.tsx` — collapsible catalog of promoted skills with inspect/deprecate/delete

**Verify:** Full dev mode flow end-to-end. Jidoka fires and resolves. Briefings approve. Skills promote. Library populates.

### Phase 6: Tier 2 API Integration
1. `SettingsPanel.tsx` — API key, dev mode toggle, flywheel config
2. Update `classifier.ts` — add Tier 2 LLM classification path
3. Update `compiler.ts` — add Tier 2 briefing compilation with voice prompts
4. Wire API cost tracking into telemetry + footer

**Verify:** With API key + dev mode OFF: fetch real arXiv papers, LLM classifies, briefings compile in selected voice. Costs show in footer.

### Phase 7: Polish
1. Keyboard shortcuts: Cmd+Enter (run), Cmd+1/2/3 (voice), arrow keys (navigate)
2. Loading states and stage-transition animations
3. Telemetry export button
4. Empty states (first run, no skills yet, no pending)
5. Shame-resistant copy on all failure/rejection states

---

## VERIFICATION TESTS

### The Jidoka Test
1. Dev mode, seed data. Paper 2510.03847 triggers conflicting thesis halt.
2. JidokaAlert appears with Kaizen proposal.
3. `state.jidoka_halts` has unresolved event. `pipeline.last_error` set. `pipeline.current_stage` = `recognition`.
4. Resolve → telemetry logs resolution → pipeline continues.
5. ALSO: Remove API key, dev mode OFF, click RUN → Telemetry stage fires jidoka with Kaizen proposal "Switch to dev mode."

### The Flywheel Test
1. Run dev mode. Approve 3+ papers matching the same pattern (e.g., "cost-falling" topic, YELLOW zone).
2. Flywheel MUST detect the pattern and surface a skill proposal.
3. Approve the skill. SkillsLibrary shows the new skill.
4. Run again. Papers matching the pattern MUST be handled by Tier 0 (skill match) — no API call, no LLM.
5. FlywheelFooter shows: Tier 0 skills count increased, cost-per-paper decreased.
6. Telemetry for the skill-handled paper shows `skill_id` and `tier: 0`.

### The Sovereignty Test
1. Disconnect internet (or mock network failure). Dev mode ON.
2. Tier 0 classification works — keyword matching + skill matching runs locally.
3. Papers classify into zones using cached config.
4. Mock briefings generate without API calls.
5. State persists. Skills fire. Telemetry logs. The app is fully functional for T0/T1.

### The Persistence Test
1. Run the full demo sequence. Approve papers. Promote a skill.
2. Close the browser tab.
3. Reopen. State restored: approved briefings, promoted skills, telemetry history, flywheel stats.
4. The user didn't lose anything. Extended Mind requirement met.

### The Honesty Test
1. Paper 2506.02153 (Q6 falsification) gets `falsification_signal: true` in classification.
2. Paper 2510.03847 halts the pipeline rather than being auto-classified.
3. RED zone papers show strategic review warning.
4. The falsification watch (Q6) gets equal structural rigor to Q1-Q5 in the knowledge layer.

### The Ratchet Test (Economic Proof)
1. First run: all classifications at Tier 2 (API calls). Total cost: $X.
2. Approve patterns. Skills promote to Tier 0.
3. Second run (same or similar papers): some handled at Tier 0 (free). Total cost: $Y < $X.
4. FlywheelFooter shows the cost decline visually.
5. The system got cheaper with use. The Ratchet works.

---

## QUALITY GATE

> "Design is philosophy expressed through constraint."

**Protocol proof:** A developer watching this app can point to every one of the five architectural commitments and say "I see it working." Declarative governance in config files. Sovereignty guardrails classifying every action. The Skill Flywheel proposing, promoting, and executing learned patterns. Feed-first telemetry logging everything. Jidoka stopping the pipeline and Kaizen proposing the fix.

**Economic proof:** The FlywheelFooter shows costs declining and Tier 0 growing. The system gets cheaper with use. The Ratchet works at application scale.

**Transparency proof:** Every skill is inspectable. Every classification has a trace. Every routing decision is logged. The system gets MORE explainable as it learns, not less. Intelligence is a library with a card catalog, not a black box.

**Self-improvement proof:** The system identifies its own patterns (Observe/Detect), proposes its own improvements (Propose), and after human approval, executes them automatically (Execute). It authors its own evolution inside zones the human controls.

---

## WHAT NOT TO BUILD

- No authentication / user accounts
- No database — localStorage only
- No server-side code — direct API calls from client
- No streaming (yet)
- No Notion integration (yet) — log to telemetry
- No mobile responsiveness — desktop tool
- No multi-user / network features — single node proof

---

## SUMMARY

You're building a self-improving research intelligence app that:
1. Loads 7 real arXiv papers
2. Classifies them against 6 strategic questions
3. Triggers a jidoka halt with a Kaizen fix proposal on conflicting evidence
4. Generates briefings in 3 voice presets
5. Presents everything for human governance in a Glass Pipeline UI
6. Learns from every approval via the Skill Flywheel
7. Promotes repeating patterns to Tier 0 cached skills
8. Gets cheaper with every cycle — visible in the UI
9. Persists all state across sessions
10. Surfaces its own failures honestly and proposes fixes

The config files are the governance. The knowledge files are the thesis. The prompts are the voice. The state machine is the protocol. The Skill Flywheel is the engine. The UI makes all of it visible.

Build it.
