# Migration Map — arXiv Radar v1

## Overview

This is a greenfield build. No migration of existing code — only copying the bundle and building new files.

---

## Phase 0: Scaffold

### Files to Create

| File | Action | Notes |
|------|--------|-------|
| `package.json` | CREATE | Vite + React + TypeScript + Tailwind + Anthropic SDK |
| `vite.config.ts` | CREATE | Standard Vite React config |
| `tsconfig.json` | CREATE | Standard TypeScript config |
| `tailwind.config.ts` | CREATE | Tailwind v4 config (minimal) |
| `index.html` | CREATE | Entry HTML with Google Fonts |
| `src/main.tsx` | CREATE | React entry point |
| `src/index.css` | CREATE | Tailwind + CSS custom properties |
| `src/vite-env.d.ts` | CREATE | Vite TypeScript declarations |

### Bundle Copy Operations

```powershell
# From C:\GitHub\grove-arxiv-radar\ to C:\GitHub\arxiv-test-app\src\

Copy-Item -Recurse config src\config
Copy-Item -Recurse state src\state
Copy-Item -Recurse knowledge src\knowledge
Copy-Item -Recurse prompts src\prompts
Copy-Item -Recurse seed src\seed
```

### Verification

```bash
npm run dev
# Should show blank page with no errors
```

---

## Phase 1: Core State Machine + Persistence

### Files to Create

| File | Action | Dependencies |
|------|--------|--------------|
| `src/types/app.ts` | CREATE | Extended types: Skill, TelemetryEntry, AppState, Settings |
| `src/services/persistence.ts` | CREATE | localStorage save/load |
| `src/services/telemetry.ts` | CREATE | JSONL logging, pattern_hash |
| `src/hooks/usePersistedState.ts` | CREATE | Hydration + auto-save |
| `src/hooks/useAutomaton.ts` | CREATE | Main orchestrator hook |
| `src/lib/patternHash.ts` | CREATE | Hash generation |

### Verification

```typescript
// Console test:
// 1. Dispatch action
// 2. Refresh page
// 3. Verify state restored
```

---

## Phase 2: Recognition Pipeline + Jidoka

### Files to Create

| File | Action | Dependencies |
|------|--------|--------------|
| `src/services/classifier.ts` | CREATE | T0 skills → T0 keywords → T1/T2 |
| `src/services/jidoka.ts` | CREATE | Halt creation + Kaizen proposals |
| `src/services/arxiv.ts` | CREATE | arXiv API + seed loader |
| `src/lib/loadKnowledge.ts` | CREATE | Vite ?raw imports |
| `src/lib/loadPrompts.ts` | CREATE | Vite ?raw imports |

### Verification

```
1. Run with seed data
2. Paper 2510.03847 triggers jidoka halt
3. Other 6 papers classify correctly
4. Telemetry logs every step with pattern_hash
```

---

## Phase 3: Flywheel Engine

### Files to Create

| File | Action | Dependencies |
|------|--------|--------------|
| `src/services/flywheel.ts` | CREATE | Pattern detection, skill proposal, promotion |

### Modify

| File | Change |
|------|--------|
| `src/hooks/useAutomaton.ts` | Add flywheel detection after approval |
| `src/types/app.ts` | Already includes Skill, SkillProposal |

### Verification

```
1. Approve 3+ papers with same pattern
2. Flywheel proposes skill
3. Approve skill → appears in skills[]
4. Next run: matching papers handled at Tier 0
```

---

## Phase 4: UI Shell

### Files to Create

| File | Action | Notes |
|------|--------|-------|
| `src/components/App.tsx` | CREATE | Root layout, providers, keyboard shortcuts |
| `src/components/CommandBar.tsx` | CREATE | Query input, voice selector, run button |
| `src/components/VoiceSelector.tsx` | CREATE | Dropdown for voice presets |
| `src/components/GlassPipeline.tsx` | CREATE | 5-stage pipeline indicator |
| `src/components/FlywheelFooter.tsx` | CREATE | Tier distribution, cost tracking |

### Verification

```
1. Pipeline stages light up during processing
2. Footer shows correct tier config
3. Keyboard shortcuts work (Cmd+Enter)
```

---

## Phase 5: Governance UI

### Files to Create

| File | Action | Notes |
|------|--------|-------|
| `src/components/JidokaAlert.tsx` | CREATE | Halt notification + Kaizen UI |
| `src/components/SkillProposals.tsx` | CREATE | Flywheel promotion candidates |
| `src/components/PendingGovernance.tsx` | CREATE | Section for pending briefings |
| `src/components/BriefingCard.tsx` | CREATE | Single briefing with actions |
| `src/components/PaperTrace.tsx` | CREATE | Expandable classification details |
| `src/components/SkillsLibrary.tsx` | CREATE | Collapsible skill catalog |

### Verification

```
Full dev mode flow:
1. Jidoka fires and resolves
2. Briefings approve
3. Skills promote
4. Library populates
```

---

## Phase 6: Tier 2 API Integration

### Files to Create

| File | Action | Notes |
|------|--------|-------|
| `src/components/SettingsPanel.tsx` | CREATE | API key, dev mode toggle |

### Modify

| File | Change |
|------|--------|
| `src/services/classifier.ts` | Add Tier 2 LLM classification path |
| `src/services/compiler.ts` | CREATE — Tier 2 briefing compilation |

### Verification

```
1. Enter API key, disable dev mode
2. Fetch real arXiv papers
3. LLM classifies
4. Briefings compile in selected voice
5. Costs show in footer
```

---

## Phase 7: Polish

### Modify

| File | Change |
|------|--------|
| `src/components/App.tsx` | Loading states, empty states |
| `src/components/SettingsPanel.tsx` | Telemetry export button |
| All components | Shame-resistant copy |

### Verification

```
All verification tests from KICKOFF.md:
- Jidoka test
- Flywheel test
- Sovereignty test
- Persistence test
- Honesty test
- Ratchet test
```

---

## File Creation Order (Execution Sequence)

### Epic 1: Scaffold
1. `npm create vite@latest . -- --template react-ts`
2. Install dependencies
3. Copy bundle directories
4. `src/index.css` — Tailwind + design tokens
5. `index.html` — Google Fonts

### Epic 2: State Foundation
1. `src/types/app.ts`
2. `src/lib/patternHash.ts`
3. `src/services/persistence.ts`
4. `src/services/telemetry.ts`
5. `src/hooks/usePersistedState.ts`
6. `src/hooks/useAutomaton.ts`

### Epic 3: Pipeline Services
1. `src/lib/loadKnowledge.ts`
2. `src/lib/loadPrompts.ts`
3. `src/services/arxiv.ts`
4. `src/services/jidoka.ts`
5. `src/services/classifier.ts`

### Epic 4: Flywheel
1. `src/services/flywheel.ts`
2. Update `src/hooks/useAutomaton.ts`

### Epic 5: UI Components
1. `src/components/App.tsx`
2. `src/components/CommandBar.tsx`
3. `src/components/VoiceSelector.tsx`
4. `src/components/GlassPipeline.tsx`
5. `src/components/FlywheelFooter.tsx`
6. `src/components/JidokaAlert.tsx`
7. `src/components/SkillProposals.tsx`
8. `src/components/PendingGovernance.tsx`
9. `src/components/BriefingCard.tsx`
10. `src/components/PaperTrace.tsx`
11. `src/components/SkillsLibrary.tsx`
12. `src/components/SettingsPanel.tsx`

### Epic 6: API Integration
1. `src/services/compiler.ts`
2. Update `src/services/classifier.ts`

### Epic 7: Polish
1. Keyboard shortcuts
2. Loading states
3. Empty states
4. Telemetry export

---

## Rollback Plan

This is a greenfield build. Rollback = delete and restart.

```powershell
# Nuclear option
Remove-Item -Recurse -Force C:\GitHub\arxiv-test-app\*
```
