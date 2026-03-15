# Execution Prompt — arXiv Radar v1

## Quick Start

You are building a React application that proves the Grove Autonomaton Pattern. This is a protocol proof, not a prototype.

**Project:** `C:\GitHub\arxiv-test-app\`
**Source Bundle:** `C:\GitHub\grove-arxiv-radar\` (READ-ONLY — copy, don't modify)

---

## Attention Anchoring Protocol

**Before any major decision, re-read:**
1. `SPEC.md` Live Status block
2. `SPEC.md` Attention Anchor block

**After every 10 tool calls:**
- Check: Am I still pursuing the stated goal?
- If uncertain: Re-read SPEC.md Goals and Acceptance Criteria

**Before committing:**
- Verify: Does this change satisfy Acceptance Criteria?

---

## What You're Building

A self-improving research intelligence app that:
1. Loads 7 real arXiv papers (seed data in dev mode)
2. Classifies them against 6 strategic questions
3. Triggers Jidoka halt on conflicting evidence
4. Generates briefings in 3 voice presets
5. Presents everything for human governance
6. Learns from approvals via the Skill Flywheel
7. Promotes patterns to Tier 0 cached skills
8. Gets cheaper with every cycle
9. Persists all state across sessions

---

## Execution Sequence

Execute epics in order. Do not skip build gates.

### Epic 1: Scaffold

```bash
cd C:\GitHub\arxiv-test-app
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install @anthropic-ai/sdk
```

Copy bundle:
```powershell
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\config src\config
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\state src\state
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\knowledge src\knowledge
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\prompts src\prompts
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\seed src\seed
```

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Create `src/index.css`:
```css
@import "tailwindcss";

:root {
  --bg-primary: #0D0D0D;
  --bg-secondary: #121212;
  --bg-surface: #1A1A1A;
  --bg-elevated: #222222;
  --text-primary: #E8E2D9;
  --text-secondary: #B0A898;
  --text-muted: #7A7264;
  --accent: #D4621A;
  --accent-hover: #E87A2E;
  --zone-green: #2D5A27;
  --zone-green-text: #5EBF50;
  --zone-yellow: #B8860B;
  --zone-yellow-text: #E8C94A;
  --zone-red: #8B2500;
  --zone-red-text: #E85A3A;
  --jidoka-bg: #3D1010;
  --jidoka-border: #FF3333;
  --border: #2A2A2A;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'DM Sans', system-ui, sans-serif;
}
```

Add to `index.html` (in `<head>`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fragment+Mono&family=Instrument+Serif&display=swap" rel="stylesheet">
```

Add to `src/vite-env.d.ts`:
```typescript
declare module '*.md?raw' {
  const content: string
  export default content
}
```

**Build Gate:** `npm run build` passes

---

### Epic 2: State Foundation

Create `src/types/app.ts`:
```typescript
import type { ArxivRadarState, PipelineStage } from '../state/types'
import type { Zone } from '../config/zones'
import type { CognitiveTier } from '../config/routing'

export interface Skill {
  id: string
  pattern_hash: string
  name: string
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone
  threshold: number
  action: 'auto_archive' | 'auto_classify' | 'auto_brief'
  promoted_at: string
  promoted_from: Zone
  times_fired: number
  last_fired: string | null
  accuracy: number
  deprecated: boolean
}

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

export interface TelemetryEntry {
  ts: string
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

export interface Settings {
  api_key: string | null
  ollama_url: string
  dev_mode: boolean
  flywheel_threshold: number
  flywheel_window_days: number
}

export interface AppState extends ArxivRadarState {
  skills: Skill[]
  skill_proposals: SkillProposal[]
  telemetry_log: TelemetryEntry[]
  kaizen_proposals: KaizenProposal[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  api_key: null,
  ollama_url: 'http://localhost:11434',
  dev_mode: true,
  flywheel_threshold: 3,
  flywheel_window_days: 14,
}
```

Create services and hooks per ARCHITECTURE.md.

**Build Gate:** State persists across page refresh

---

### Epic 3: Pipeline Services

Key file: `src/services/classifier.ts`

Must implement tier cascade:
1. Check Tier 0 skills
2. Check Tier 0 keywords (from config/defaults.ts)
3. Check Jidoka triggers (from config/zones.ts)
4. If dev mode: use _expected_zone from seed
5. Else: call LLM

**Critical:** Paper `2510.03847` MUST trigger Jidoka halt (conflicting thesis).

**Build Gate:** Seed data classifies correctly, Jidoka fires

---

### Epic 4: Flywheel Engine

Key file: `src/services/flywheel.ts`

Pattern hash: `btoa([...topics.sort(), zone, ...keywords.slice(0,3).sort()].join('|')).slice(0,12)`

Detection: Scan telemetry for pattern_hash appearing 3+ times in 14 days.

**Build Gate:** 3 approvals → proposal appears → approve → skill handles future matches

---

### Epic 5-7: UI Components

See ARCHITECTURE.md for component contracts.

**Critical UI patterns:**
- Zone badges: background at 15% opacity, colored text
- Jidoka: pulsing red border, dark red background
- Fragment Mono for all numbers and pipeline text
- Instrument Serif for "arXiv Radar" heading
- 8px base spacing, 1px borders, max 2px border-radius

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/hooks/useAutomaton.ts` | Main orchestrator |
| `src/services/classifier.ts` | Tier cascade |
| `src/services/flywheel.ts` | Pattern detection |
| `src/services/jidoka.ts` | Halt management |
| `src/components/App.tsx` | Root layout |

---

## Verification Tests

### The Jidoka Test
1. Dev mode, seed data
2. Paper 2510.03847 triggers conflicting thesis halt
3. JidokaAlert appears
4. Resolve → pipeline continues

### The Flywheel Test
1. Approve 3+ papers with same pattern
2. Proposal appears
3. Approve → skill in library
4. Next run: matching papers → Tier 0

### The Persistence Test
1. Run demo, approve papers, promote skill
2. Close browser
3. Reopen → state restored

---

## Post-Epic Verification

After each epic:
```bash
npm run build
```

Update DEVLOG.md:
```markdown
## Epic N Complete

**Timestamp:** {ISO timestamp}
**Build:** PASS/FAIL
**Tests:** Description of what was verified
**Notes:** Any surprises or follow-up needed
```

Update SPEC.md Live Status:
```markdown
**Current Phase:** Phase N+1
**Last Updated:** {timestamp}
**Next Action:** {next epic description}
```

---

## Success Criteria

The app is complete when:

1. **Protocol proof:** Every architectural commitment is visible and working
2. **Economic proof:** FlywheelFooter shows costs declining, Tier 0 growing
3. **Transparency proof:** Every skill inspectable, every classification traced
4. **Self-improvement proof:** Flywheel proposes, human approves, system executes

**The demo sequence must work with zero API keys.**
