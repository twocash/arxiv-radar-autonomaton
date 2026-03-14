# Repository Audit — arXiv Radar v1

## Overview

This sprint involves TWO repositories:

1. **Target:** `C:\GitHub\arxiv-test-app\` — Where we build the app (nearly empty)
2. **Source Bundle:** `C:\GitHub\grove-arxiv-radar\` — Recipe bundle (READ-ONLY)

---

## Target Repository: arxiv-test-app

### Current State

```
arxiv-test-app/
├── KICKOFF.md                    ← Sprint specification (617 lines)
├── .claude/
│   └── settings.local.json       ← Claude Code settings
└── docs/
    └── sprints/
        └── arxiv-radar-v1/       ← This sprint's artifacts
```

**Status:** Greenfield. No existing code to migrate. No patterns to preserve.

### Git Status

- Branch: `master`
- Main branch: `claude/autonomaton-hello-world-TRBH5`
- Status: Untracked directory (not yet committed)

---

## Source Bundle: grove-arxiv-radar

### Structure

```
grove-arxiv-radar/
├── config/
│   ├── index.ts                  ← Barrel export
│   ├── defaults.ts               ← 6 strategic question topic groups + keywords
│   ├── zones.ts                  ← GREEN/YELLOW/RED zone definitions + Jidoka triggers
│   ├── routing.ts                ← Cognitive tier definitions + intent routing
│   └── voices.ts                 ← 3 voice presets (news_brief, technical_summary, strategic_intel)
├── state/
│   ├── types.ts                  ← Domain types (ArxivPaper, ClassifiedPaper, DraftBriefing, etc.)
│   └── reducer.ts                ← Pure state machine for pipeline
├── knowledge/
│   ├── topics.md                 ← 6 strategic questions explained
│   ├── significance.md           ← Significance criteria
│   └── contrarian.md             ← Falsification lens
├── prompts/
│   ├── classify-paper.md         ← Classification prompt template
│   ├── news-brief.md             ← News brief voice template
│   ├── technical-summary.md      ← Technical summary template
│   └── strategic-intel.md        ← Strategic intel template
├── seed/
│   └── sample-papers.json        ← 7 real arXiv papers for testing
├── README.md
├── BUILD.md                      ← Build guide
├── BUNDLE.md
└── CC-HANDOFF.md
```

### Key Files Analysis

#### config/defaults.ts
- Defines 6 `WatchedTopic` groups aligned to strategic questions (Q1-Q6)
- Each topic has `id`, `name`, `keywords[]`, `priority`
- Provides `WATCHED_AUTHORS[]` for author tracking
- Provides `RELEVANCE_THRESHOLDS` for zone assignment
- Exports helpers: `getAllKeywords()`, `getTopicByKeyword()`, `getTopicById()`

#### config/zones.ts
- Defines `Zone` type: `'green' | 'yellow' | 'red'`
- Defines `Significance` type: `'routine' | 'significant' | 'breakthrough'`
- `zonesSchema` declaratively defines what each zone allows/forbids
- `JIDOKA_TRIGGERS` config for halt conditions
- Exports helpers: `assignZone()`, `shouldTriggerJidoka()`, etc.

#### config/routing.ts
- Defines `CognitiveTier`: `0 | 1 | 2 | 3`
- `TIER_DEFINITIONS` maps tiers to cost/latency characteristics
- `INTENT_ROUTES` maps intents to tiers with zone constraints
- Exports helpers: `getIntentRoute()`, `getIntentsByTier()`, `canPromoteToTier()`

#### config/voices.ts
- Defines 3 voice presets with constraints and system prompts
- Each preset specifies: audience, max_words, reading_level, tone, structure
- Exports helpers: `getVoicePreset()`, `getVoiceSystemPrompt()`, `listVoicePresets()`

#### state/types.ts
- `PipelineStage`: 'idle' | 'telemetry' | 'recognition' | 'compilation' | 'approval' | 'execution'
- `JidokaEvent`: Halt event with trigger type, details, resolution
- `ArxivPaper`: Raw paper from API
- `ClassifiedPaper`: Paper after classification with zone, relevance, topics
- `DraftBriefing`: Briefing awaiting approval
- `ApprovedBriefing`: Approved briefing with metadata
- `ArxivRadarState`: Full app state
- `ArxivRadarAction`: Union of all actions
- `INITIAL_STATE`: Starting state

#### state/reducer.ts
- Pure reducer function handling all actions
- Pipeline control: START_POLL, POLL_COMPLETE, POLL_ERROR, SET_STAGE
- Classification: PAPER_CLASSIFIED, PAPER_ARCHIVED
- Compilation: BRIEFING_COMPILED, COMPILATION_ERROR
- Approval: BRIEFING_APPROVED, BRIEFING_REJECTED, BRIEFING_EDITED
- Jidoka: JIDOKA_HALT, JIDOKA_RESOLVE
- Config: SET_VOICE_PRESET
- Flywheel: SKILL_PROMOTED

#### seed/sample-papers.json
- 7 real arXiv papers with metadata
- Each has `_strategic_question`, `_expected_zone`, `_rationale` for testing
- Paper `2510.03847` is designed to trigger Jidoka halt (matches both Q1 and Q6)

---

## What the Bundle Provides vs. What We Build

| Capability | Bundle Provides | We Build |
|------------|-----------------|----------|
| State machine | `reducer.ts` + types | `useAutomaton` hook wrapping it |
| Zone governance | `zones.ts` | Use directly |
| Routing config | `routing.ts` | Use directly |
| Voice presets | `voices.ts` | Use directly |
| Keyword topics | `defaults.ts` | Use directly |
| Knowledge context | `knowledge/*.md` | Load as raw text |
| Prompt templates | `prompts/*.md` | Load as raw text |
| Seed data | `sample-papers.json` | Use for dev mode |
| Skill Flywheel | — | `services/flywheel.ts` |
| Telemetry | — | `services/telemetry.ts` |
| Persistence | — | `services/persistence.ts` |
| Pattern hash | — | `lib/patternHash.ts` |
| UI components | — | All components |
| Anthropic API client | — | `services/compiler.ts` |
| arXiv API client | — | `services/arxiv.ts` |

---

## Technical Debt

**None.** This is a greenfield build.

---

## Dependencies to Add

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@anthropic-ai/sdk": "^0.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x"
  }
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Anthropic API CORS | High | High | Use browser-compatible SDK or proxy |
| localStorage size limits | Low | Medium | Prune old telemetry entries |
| Bundle TypeScript compatibility | Low | Medium | May need minor type adjustments |
| Vite raw import handling | Low | Low | Well-documented feature |
