# Architecture — arXiv Radar v1

## Target Directory Structure

```
src/
├── components/
│   ├── App.tsx                   # Root layout, state provider, keyboard shortcuts
│   ├── CommandBar.tsx            # Query input, voice selector, run button
│   ├── GlassPipeline.tsx         # 5-stage pipeline indicator
│   ├── JidokaAlert.tsx           # Halt notification with Kaizen proposals
│   ├── SkillProposals.tsx        # Flywheel promotion candidates
│   ├── PendingGovernance.tsx     # Briefings awaiting approval
│   ├── BriefingCard.tsx          # Single briefing with zone, trace, actions
│   ├── PaperTrace.tsx            # Expandable classification details
│   ├── SkillsLibrary.tsx         # Inspectable skill catalog
│   ├── FlywheelFooter.tsx        # Tier status, migration, cost tracking
│   ├── VoiceSelector.tsx         # Voice preset dropdown
│   └── SettingsPanel.tsx         # API key, dev mode, flywheel config
├── services/
│   ├── arxiv.ts                  # arXiv API client + seed data loader
│   ├── classifier.ts             # Recognition: T0 skills → T0 keywords → T1/T2 LLM
│   ├── compiler.ts               # Compilation: voice prompt + knowledge context → briefing
│   ├── telemetry.ts              # JSONL logging to localStorage, pattern_hash generation
│   ├── jidoka.ts                 # Halt creation, Kaizen proposal generation, resolution
│   ├── flywheel.ts               # Pattern detection, skill proposal, promotion, deprecation
│   └── persistence.ts            # Save/load full state to/from localStorage
├── config/                       # ← Copied from bundle (read-only governance)
│   ├── index.ts
│   ├── defaults.ts
│   ├── zones.ts
│   ├── routing.ts
│   └── voices.ts
├── state/                        # ← Copied from bundle (types + reducer)
│   ├── types.ts
│   └── reducer.ts
├── knowledge/                    # ← Copied from bundle (loaded as raw text via ?raw)
│   ├── topics.md
│   ├── significance.md
│   └── contrarian.md
├── prompts/                      # ← Copied from bundle (loaded as raw text via ?raw)
│   ├── classify-paper.md
│   ├── news-brief.md
│   ├── technical-summary.md
│   └── strategic-intel.md
├── seed/                         # ← Copied from bundle
│   └── sample-papers.json
├── hooks/
│   ├── useAutomaton.ts           # Main orchestrator: reducer + pipeline + flywheel
│   └── usePersistedState.ts      # localStorage hydration + auto-save on state change
├── lib/
│   ├── loadKnowledge.ts          # Vite ?raw imports for .md files
│   ├── loadPrompts.ts            # Vite ?raw imports for prompt templates
│   └── patternHash.ts            # Hash generation from matched_topics + zone + keywords
├── types/
│   └── app.ts                    # Extended types: Skill, TelemetryEntry, AppState, Settings
├── main.tsx                      # React entry point
└── index.css                     # Tailwind + CSS custom properties + Google Fonts
```

---

## Data Flow

### Five-Stage Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐
│  TELEMETRY  │───▶│ RECOGNITION │───▶│ COMPILATION │───▶│  APPROVAL  │───▶│ EXECUTION │
└─────────────┘    └─────────────┘    └─────────────┘    └────────────┘    └───────────┘
       │                  │                  │                 │                 │
       ▼                  ▼                  ▼                 ▼                 ▼
   Fetch or         T0: Skills         Tier 2:          Human         Log + Archive
   Load Seed        T0: Keywords       Claude API       Approve/       + Flywheel
                    T1/T2: LLM                          Reject         Detection
```

### Tier Cascade (Recognition)

```
┌─────────────────────────────────────────────────────────────────┐
│                      RECOGNITION STAGE                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Check Tier 0 Skills                                         │
│     └─▶ If skill matches → apply zone, skip LLM                 │
│                                                                 │
│  2. Check Tier 0 Keywords                                       │
│     └─▶ Match against config/defaults.ts                        │
│     └─▶ Check shouldTriggerJidoka()                             │
│                                                                 │
│  3. If Jidoka triggered → HALT                                  │
│     └─▶ Dispatch JIDOKA_HALT action                             │
│     └─▶ Generate Kaizen proposal                                │
│                                                                 │
│  4. If dev mode → Use _expected_zone from seed data             │
│     Else → Call Tier 1/2 LLM with classify-paper.md             │
│                                                                 │
│  5. Generate pattern_hash for Flywheel                          │
│     └─▶ Hash(matched_topics + zone + keywords)                  │
│                                                                 │
│  6. Assign zone via assignZone()                                │
│     └─▶ GREEN → auto-archive                                    │
│     └─▶ YELLOW/RED → proceed to Compilation                     │
└─────────────────────────────────────────────────────────────────┘
```

### Flywheel Detection (Execution Stage)

```
After every approval:
  1. Log TelemetryEntry with pattern_hash
  2. Scan telemetry for repeating pattern_hash values
  3. If same pattern_hash appears 3+ times in 14 days:
     └─▶ Create SkillProposal
     └─▶ Surface in SkillProposals component
  4. If user approves proposal:
     └─▶ Create Skill in skills[]
     └─▶ Future matching papers → Tier 0 (free)
```

---

## Extended Types (src/types/app.ts)

```typescript
import type { ArxivRadarState, TelemetryEntry as BundleTelemetryEntry } from '../state/types'
import type { Zone } from '../config/zones'

// Skill — promoted pattern from Flywheel
export interface Skill {
  id: string
  pattern_hash: string
  name: string                      // Human-readable
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone
  threshold: number                 // Minimum relevance score
  action: 'auto_archive' | 'auto_classify' | 'auto_brief'
  promoted_at: string               // ISO timestamp
  promoted_from: Zone               // Was YELLOW, now GREEN
  times_fired: number
  last_fired: string | null
  accuracy: number                  // % of times human didn't override
  deprecated: boolean
}

// Skill proposal from Flywheel detection
export interface SkillProposal {
  id: string
  pattern_hash: string
  name: string
  description: string
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone
  times_seen: number
  first_seen: string
  last_seen: string
  proposed_action: Skill['action']
}

// Telemetry entry for logging
export interface TelemetryEntry {
  ts: string                        // ISO timestamp
  stage: PipelineStage
  event: string
  arxiv_id?: string
  intent?: string
  tier?: CognitiveTier
  zone?: Zone
  pattern_hash?: string
  confidence?: number
  cost_usd?: number
  human_feedback?: 'approved' | 'rejected' | 'edited' | 'resolved'
  jidoka?: boolean
  skill_id?: string
  details?: string
}

// Kaizen proposal attached to Jidoka halt
export interface KaizenProposal {
  id: string
  jidoka_event_id: string
  description: string
  options: KaizenOption[]
}

export interface KaizenOption {
  label: string
  action: string
  is_recommended: boolean
}

// App settings
export interface Settings {
  api_key: string | null
  ollama_url: string
  dev_mode: boolean
  flywheel_threshold: number        // Default: 3
  flywheel_window_days: number      // Default: 14
}

// Extended app state
export interface AppState extends ArxivRadarState {
  skills: Skill[]
  skill_proposals: SkillProposal[]
  telemetry_log: TelemetryEntry[]
  kaizen_proposals: KaizenProposal[]
  settings: Settings
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  api_key: null,
  ollama_url: 'http://localhost:11434',
  dev_mode: true,
  flywheel_threshold: 3,
  flywheel_window_days: 14,
}
```

---

## Component Architecture

### Layout (App.tsx)

```
┌──────────────────────────────────────────────────────────────────┐
│  CommandBar                                                       │
│  [arXiv Radar]  [Brief me on...        ]  [Voice ▼]  [⚙]  [RUN] │
├──────────────────────────────────────────────────────────────────┤
│  GlassPipeline                                                    │
│  [✓] Telemetry → [●] Recognition → [ ] Compilation → ...        │
├──────────────────────────────────────────────────────────────────┤
│  JidokaAlert (if unresolved halts)                               │
│  ⚠ PIPELINE HALTED — Conflicting thesis evidence                 │
│  [Resolve as Q1] [Resolve as Q6] [Custom]                        │
├──────────────────────────────────────────────────────────────────┤
│  SkillProposals (if proposals exist)                             │
│  Promote to Tier 0: "Auto-archive quantization papers > 0.6"     │
│  [Approve] [Reject]                                              │
├──────────────────────────────────────────────────────────────────┤
│  PendingGovernance                                               │
│  ┌─ BriefingCard ───────────────────────────────────────────┐   │
│  │ 🟡 YELLOW • Q2: Cost Falling                              │   │
│  │ Consumer GPU inference matches cloud at 1/40th cost       │   │
│  │ [✓ Approve] [✎ Edit] [✗ Reject]                          │   │
│  └──────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│  SkillsLibrary (collapsible)                                     │
│  Skills Library (3 active) ▼                                     │
│  • Auto-archive quantization > 0.6 — fired 12x — 100% accuracy  │
├──────────────────────────────────────────────────────────────────┤
│  FlywheelFooter (sticky)                                         │
│  🟢 T0: 3 skills | 🔵 T2: Sonnet ($0.023) | ↓ 2 migrated        │
└──────────────────────────────────────────────────────────────────┘
```

### State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        useAutomaton()                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  AppState   │◀───│   reducer   │◀───│   ArxivRadarAction  │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        ▲              │
│         ▼                                        │              │
│  ┌─────────────┐                          ┌─────────────┐      │
│  │ persistence │                          │  dispatch   │      │
│  │ (localStorage)                         │  (actions)  │      │
│  └─────────────┘                          └─────────────┘      │
│         │                                        ▲              │
│         ▼                                        │              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  telemetry  │───▶│  flywheel   │───▶│  skill_proposals    │ │
│  │  (log)      │    │  (detect)   │    │  (surface)          │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Contracts

### services/flywheel.ts

```typescript
// Pattern hash generation
function generatePatternHash(
  topics: string[],
  zone: Zone,
  keywords: string[]
): string

// Scan telemetry for repeating patterns
function detectCandidates(
  telemetry: TelemetryEntry[],
  windowDays: number,
  threshold: number
): SkillCandidate[]

// Create proposal from candidate
function createSkillProposal(candidate: SkillCandidate): SkillProposal

// Promote proposal to skill
function promoteSkill(proposal: SkillProposal): Skill

// Check if paper matches any skill
function matchSkill(paper: ArxivPaper, skills: Skill[]): Skill | null

// Mark skill as deprecated
function deprecateSkill(skillId: string, reason: string): void

// Get flywheel statistics
function getFlywheelStats(
  skills: Skill[],
  telemetry: TelemetryEntry[]
): FlywheelStats
```

### services/jidoka.ts

```typescript
// Create halt event
function createJidokaHalt(
  stage: PipelineStage,
  trigger: JidokaEvent['trigger'],
  details: string,
  paperId?: string
): JidokaEvent

// Generate Kaizen proposal for halt
function generateKaizenProposal(halt: JidokaEvent): KaizenProposal

// Resolve halt with selected option
function resolveHalt(
  haltId: string,
  resolution: string
): void
```

### services/classifier.ts

```typescript
// Classify paper through tier cascade
async function classifyPaper(
  paper: ArxivPaper,
  skills: Skill[],
  settings: Settings
): Promise<ClassificationResult>

// Tier 0: Skill matching
function matchSkills(paper: ArxivPaper, skills: Skill[]): Skill | null

// Tier 0: Keyword matching
function matchKeywords(paper: ArxivPaper): KeywordMatch

// Check jidoka triggers
function checkJidoka(match: KeywordMatch): JidokaCheck

// Tier 2: LLM classification (if needed)
async function llmClassify(
  paper: ArxivPaper,
  knowledge: string,
  apiKey: string
): Promise<LLMClassification>
```

### services/compiler.ts

```typescript
// Compile briefing for paper
async function compileBriefing(
  paper: ClassifiedPaper,
  voicePreset: VoicePresetId,
  knowledge: string,
  apiKey: string
): Promise<DraftBriefing>
```

---

## Persistence Schema (localStorage)

```typescript
// Key: 'arxiv-radar-state'
interface PersistedState {
  version: 1
  state: AppState
  persisted_at: string
}

// Key: 'arxiv-radar-telemetry'
// Stored as newline-delimited JSON (JSONL)
// Each line is a TelemetryEntry

// Key: 'arxiv-radar-settings'
// Stored separately so API key can be excluded from state export
interface PersistedSettings {
  api_key: string | null
  ollama_url: string
  dev_mode: boolean
  flywheel_threshold: number
  flywheel_window_days: number
}
```

---

## API Integration

### Anthropic SDK (Browser)

```typescript
import Anthropic from '@anthropic-ai/sdk'

// Direct browser usage (requires dangerouslyAllowBrowser)
const client = new Anthropic({
  apiKey: settings.api_key,
  dangerouslyAllowBrowser: true
})

// Classification call
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: classifyPrompt,
  messages: [{ role: 'user', content: paperContext }]
})
```

### arXiv API (Dev Mode Bypass)

```typescript
// Dev mode: load seed data
import seedPapers from '../seed/sample-papers.json'

// Production: fetch from arXiv
const ARXIV_ENDPOINT = 'https://export.arxiv.org/api/query'
// Note: May need CORS proxy in browser
```
