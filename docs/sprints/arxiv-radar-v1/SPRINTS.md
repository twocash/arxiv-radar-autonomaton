# Sprint Breakdown — arXiv Radar v1

## Overview

7 epics, executed sequentially. Each epic has a build gate that must pass before proceeding.

---

## Epic 1: Project Scaffold

### Attention Checkpoint
Before starting:
- [ ] SPEC.md Live Status shows Phase 0
- [ ] KICKOFF.md read and understood
- [ ] Source bundle location confirmed

### Story 1.1: Initialize Vite Project
**Task:** Create React + TypeScript project with Vite

```bash
cd C:\GitHub\arxiv-test-app
npm create vite@latest . -- --template react-ts
npm install
```

**Verification:** `npm run dev` shows Vite welcome page

### Story 1.2: Install Dependencies
**Task:** Add Tailwind, Anthropic SDK

```bash
npm install -D tailwindcss @tailwindcss/vite
npm install @anthropic-ai/sdk
```

**Verification:** No install errors

### Story 1.3: Copy Bundle Files
**Task:** Copy config, state, knowledge, prompts, seed from bundle

```powershell
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\config src\config
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\state src\state
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\knowledge src\knowledge
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\prompts src\prompts
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\seed src\seed
```

**Verification:** All directories exist in `src/`

### Story 1.4: Configure Tailwind + Design System
**Task:** Set up Tailwind v4 with Grove design tokens

**Files:**
- `vite.config.ts` — Add @tailwindcss/vite plugin
- `src/index.css` — CSS custom properties + Tailwind
- `index.html` — Google Fonts links

**Verification:** `npm run dev` shows styled page, fonts load

### Story 1.5: TypeScript Configuration
**Task:** Configure TypeScript for bundle imports

**Files:**
- `tsconfig.json` — Ensure module resolution works
- `src/vite-env.d.ts` — Add `*.md?raw` declaration

**Verification:** No TypeScript errors on bundle imports

### Build Gate
```bash
npm run build
# Must complete with no errors
```

---

## Epic 2: State Foundation

### Attention Checkpoint
Before starting:
- [ ] Epic 1 build gate passed
- [ ] Re-read SPEC.md Acceptance Criteria

### Story 2.1: Extended Types
**Task:** Create app-specific types extending bundle

**File:** `src/types/app.ts`
- Skill interface
- SkillProposal interface
- TelemetryEntry interface
- KaizenProposal interface
- Settings interface
- AppState extending ArxivRadarState

**Verification:** TypeScript compiles with no errors

### Story 2.2: Pattern Hash Generator
**Task:** Create deterministic hash function for Flywheel

**File:** `src/lib/patternHash.ts`
- `generatePatternHash(topics, zone, keywords)`

**Verification:** Same inputs produce same hash

### Story 2.3: Persistence Service
**Task:** Implement localStorage save/load

**File:** `src/services/persistence.ts`
- `saveState(state: AppState)`
- `loadState(): AppState | null`
- `saveSettings(settings: Settings)`
- `loadSettings(): Settings`
- `clearAll()`

**Verification:** State survives page refresh

### Story 2.4: Telemetry Service
**Task:** Implement JSONL logging

**File:** `src/services/telemetry.ts`
- `logTelemetry(entry: TelemetryEntry)`
- `getTelemetryLog(): TelemetryEntry[]`
- `exportTelemetry(): string` (JSONL format)
- `clearTelemetry()`

**Verification:** Entries persist across refresh, export works

### Story 2.5: Persisted State Hook
**Task:** Hook for hydration and auto-save

**File:** `src/hooks/usePersistedState.ts`
- Hydrate from localStorage on mount
- Auto-save on state change (debounced)

**Verification:** State persists across refresh

### Story 2.6: Automaton Hook
**Task:** Main orchestrator wrapping bundle reducer

**File:** `src/hooks/useAutomaton.ts`
- Wrap bundle reducer with useReducer
- Add persistence
- Add telemetry logging
- Expose pipeline control functions

**Verification:** Dispatch action, refresh, state restored

### Build Gate
```bash
npm run build
# Plus manual test:
# 1. Dispatch START_POLL
# 2. Refresh page
# 3. Verify pipeline.current_stage preserved
```

---

## Epic 3: Pipeline Services

### Attention Checkpoint
Before starting:
- [ ] Epic 2 build gate passed
- [ ] Re-read SPEC.md Jidoka Test criteria

### Story 3.1: Knowledge Loaders
**Task:** Vite raw imports for markdown files

**Files:**
- `src/lib/loadKnowledge.ts` — topics, significance, contrarian
- `src/lib/loadPrompts.ts` — classify-paper, news-brief, technical-summary, strategic-intel

**Verification:** Strings import correctly

### Story 3.2: arXiv Service
**Task:** API client + seed data loader

**File:** `src/services/arxiv.ts`
- `loadSeedPapers(): ArxivPaper[]`
- `fetchArxivPapers(query: string): Promise<ArxivPaper[]>` (for future)

**Verification:** Seed papers load correctly (7 papers)

### Story 3.3: Jidoka Service
**Task:** Halt creation and Kaizen proposals

**File:** `src/services/jidoka.ts`
- `createJidokaHalt(stage, trigger, details, paperId?)`
- `generateKaizenProposal(halt: JidokaEvent)`
- `getKaizenOptions(trigger: JidokaEvent['trigger'])`

**Verification:** Conflicting thesis generates correct proposal options

### Story 3.4: Classifier Service
**Task:** Tier cascade for Recognition stage

**File:** `src/services/classifier.ts`
- `classifyPaper(paper, skills, settings)`
- `matchSkills(paper, skills)` — Tier 0
- `matchKeywords(paper)` — Tier 0
- `checkJidoka(match)` — Check triggers
- `mockClassify(paper)` — Dev mode using _expected_zone
- `llmClassify(paper, knowledge, apiKey)` — Tier 2 (stub for now)

**Verification:**
- Paper 2510.03847 triggers jidoka halt
- Other 6 papers classify to expected zones
- Telemetry logs pattern_hash for each

### Build Gate
```bash
npm run build
# Plus manual test in console:
# 1. Load seed papers
# 2. Classify each
# 3. Verify paper 2510.03847 halts
# 4. Verify others match _expected_zone
```

---

## Epic 4: Flywheel Engine

### Attention Checkpoint
Before starting:
- [ ] Epic 3 build gate passed
- [ ] Re-read SPEC.md Flywheel Test criteria

### Story 4.1: Flywheel Service
**Task:** Pattern detection and skill management

**File:** `src/services/flywheel.ts`
- `generatePatternHash(topics, zone, keywords)` — Re-export from lib
- `detectCandidates(telemetry, windowDays, threshold)`
- `createSkillProposal(candidate)`
- `promoteSkill(proposal)`
- `matchSkill(paper, skills)`
- `deprecateSkill(skillId, reason)`
- `getFlywheelStats(skills, telemetry)`

**Verification:**
- 3+ same pattern_hash entries → candidate detected
- Promotion creates valid Skill object

### Story 4.2: Integrate Flywheel into Automaton
**Task:** Run flywheel detection after approvals

**File:** `src/hooks/useAutomaton.ts` (modify)
- After BRIEFING_APPROVED, scan for flywheel candidates
- Surface proposals in state.skill_proposals
- Handle skill promotion action

**Verification:**
- Approve 3 papers with same pattern
- skill_proposals populated
- Approve proposal → skills[] updated

### Build Gate
```bash
npm run build
# Plus manual test:
# 1. Mock approve 3 papers with same pattern_hash
# 2. Verify skill proposal appears
# 3. Promote skill
# 4. Verify skill in skills[]
# 5. Classify matching paper → handled by skill (Tier 0)
```

---

## Epic 5: UI Components

### Attention Checkpoint
Before starting:
- [ ] Epic 4 build gate passed
- [ ] Re-read SPEC.md UI Components section

### Story 5.1: App Shell
**Task:** Root layout with providers

**File:** `src/components/App.tsx`
- useAutomaton provider
- Vertical layout structure
- Keyboard shortcuts (Cmd+Enter for RUN)

**Verification:** App renders without errors

### Story 5.2: CommandBar
**Task:** Header with query input and controls

**Files:**
- `src/components/CommandBar.tsx`
- `src/components/VoiceSelector.tsx`

**Verification:** Voice selector changes state, RUN button dispatches

### Story 5.3: GlassPipeline
**Task:** 5-stage pipeline indicator

**File:** `src/components/GlassPipeline.tsx`
- Horizontal bar with stage indicators
- Status per stage: complete, active, jidoka halt, pending
- Jidoka halt pulses red

**Verification:** Stages light up during pipeline execution

### Story 5.4: FlywheelFooter
**Task:** Sticky footer with tier distribution

**File:** `src/components/FlywheelFooter.tsx`
- Tier 0 skills count
- Tier 2 model + total cost
- Migration indicator

**Verification:** Stats update as skills promote

### Build Gate
```bash
npm run build && npm run dev
# Visual verification:
# 1. CommandBar renders
# 2. Pipeline renders
# 3. Footer renders
# 4. RUN button triggers pipeline
```

---

## Epic 6: Governance UI

### Attention Checkpoint
Before starting:
- [ ] Epic 5 build gate passed
- [ ] Re-read SPEC.md Governance UI sections

### Story 6.1: JidokaAlert
**Task:** Halt notification with Kaizen proposals

**File:** `src/components/JidokaAlert.tsx`
- Red pulsing border
- Halt details
- Kaizen options as buttons
- Resolution handler

**Verification:** Paper 2510.03847 triggers alert, resolution works

### Story 6.2: SkillProposals
**Task:** Flywheel promotion candidates

**File:** `src/components/SkillProposals.tsx`
- Card per proposal
- Pattern description
- Approve/Reject buttons

**Verification:** Proposals appear after 3 approvals

### Story 6.3: PendingGovernance + BriefingCard
**Task:** Briefings awaiting approval

**Files:**
- `src/components/PendingGovernance.tsx`
- `src/components/BriefingCard.tsx`
- `src/components/PaperTrace.tsx`

**Verification:** Briefings display with zone badges, actions work

### Story 6.4: SkillsLibrary
**Task:** Collapsible skill catalog

**File:** `src/components/SkillsLibrary.tsx`
- Collapsible section
- Skill cards with stats
- Inspect/Deprecate/Delete actions

**Verification:** Skills appear after promotion

### Story 6.5: SettingsPanel
**Task:** Configuration UI

**File:** `src/components/SettingsPanel.tsx`
- API key input
- Dev mode toggle
- Flywheel threshold config
- Telemetry export button
- Reset button

**Verification:** Settings persist, dev mode toggle works

### Build Gate
```bash
npm run build && npm run dev
# Full dev mode flow:
# 1. Click RUN
# 2. Jidoka fires for paper 2510.03847
# 3. Resolve jidoka
# 4. Briefings appear
# 5. Approve 3+ similar papers
# 6. Skill proposal appears
# 7. Approve skill
# 8. Skill in library
```

---

## Epic 7: API Integration + Polish

### Attention Checkpoint
Before starting:
- [ ] Epic 6 build gate passed
- [ ] Re-read SPEC.md Verification Tests

### Story 7.1: Compiler Service
**Task:** Tier 2 briefing compilation

**File:** `src/services/compiler.ts`
- `compileBriefing(paper, voicePreset, knowledge, apiKey)`
- Anthropic SDK integration
- Cost tracking

**Verification:** With API key, briefings compile with real content

### Story 7.2: LLM Classification
**Task:** Tier 2 classification path

**File:** `src/services/classifier.ts` (modify)
- Add `llmClassify` implementation
- Parse JSON response
- Handle errors gracefully

**Verification:** With API key + dev mode off, papers classify via LLM

### Story 7.3: Loading States
**Task:** UI feedback during async operations

**Modifications:**
- GlassPipeline shows active stage
- BriefingCard shows loading state
- RUN button disabled during pipeline

**Verification:** User sees progress during operations

### Story 7.4: Empty States
**Task:** Friendly empty state messages

**Modifications:**
- PendingGovernance: "All papers processed. Pipeline idle."
- SkillsLibrary: "No skills yet. Approve papers to start the Flywheel."

**Verification:** Empty states display appropriately

### Story 7.5: Telemetry Export
**Task:** Download JSONL functionality

**File:** `src/components/SettingsPanel.tsx` (modify)
- Export button triggers download
- Filename includes timestamp

**Verification:** Download produces valid JSONL

### Build Gate (FINAL)
```bash
npm run build
```

**Manual Verification Tests:**

1. **Jidoka Test**
   - [ ] Paper 2510.03847 triggers halt
   - [ ] Kaizen proposal appears
   - [ ] Resolution works

2. **Flywheel Test**
   - [ ] Approve 3+ similar papers
   - [ ] Skill proposal appears
   - [ ] Approved skill handles future matches at Tier 0

3. **Sovereignty Test**
   - [ ] Dev mode works offline
   - [ ] Tier 0 classification works
   - [ ] State persists

4. **Persistence Test**
   - [ ] Close browser, reopen
   - [ ] State restored

5. **Honesty Test**
   - [ ] Q6 falsification gets equal rigor
   - [ ] RED zone shows strategic warning

6. **Ratchet Test**
   - [ ] First run: Tier 2 costs
   - [ ] Skills promote
   - [ ] Second run: lower costs (Tier 0 handling)

---

## Commit Sequence

1. `feat: scaffold vite + tailwind + bundle`
2. `feat: state foundation (types, persistence, telemetry)`
3. `feat: pipeline services (arxiv, classifier, jidoka)`
4. `feat: flywheel engine (detection, promotion)`
5. `feat: UI shell (app, commandbar, pipeline, footer)`
6. `feat: governance UI (jidoka, briefings, skills)`
7. `feat: API integration (compiler, LLM classification)`
8. `feat: polish (loading, empty states, export)`
