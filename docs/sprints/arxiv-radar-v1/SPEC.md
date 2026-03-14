# arXiv Radar v1 — Protocol Proof Sprint

## Live Status

| Field | Value |
|-------|-------|
| **Current Phase** | Epic 3 Complete — Ready for Epic 4 |
| **Status** | 🟡 In Progress |
| **Blocking Issues** | None |
| **Last Updated** | 2026-03-14 |
| **Next Action** | Execute Epic 4: Flywheel Engine |
| **Attention Anchor** | Re-read before proceeding |

---

## Attention Anchor

**Re-read this block before every major decision.**

- **We are building:** A React app proving the Grove Autonomaton Pattern through arXiv research intelligence
- **Success looks like:** Dev mode demo runs with zero API keys — full pipeline including Jidoka halt and Flywheel skill promotion
- **We are NOT:** Building a production app, mobile responsiveness, multi-user features, or backend
- **Current phase:** Planning
- **Next action:** Complete sprint artifacts, scaffold project

---

## Goal

Build a working React application that implements the COMPLETE Grove Autonomaton Pattern on the arXiv research intelligence domain. This app proves that a recipe bundle composes into a self-improving system — one that gets cheaper, smarter, more autonomous, and more transparent with every interaction.

**This is a protocol proof, not a prototype.** Every architectural claim in the Autonomaton Pattern must be demonstrable in this running application:
- The five architectural commitments
- The seven-principle quality bar
- The Skill Flywheel
- The Jidoka-Kaizen convergence
- The Ratchet economics

**This app will be deleted.** It exists to validate the recipe bundle and reverse-engineer a Foundry generation prompt.

---

## Non-Goals

- No authentication / user accounts
- No database — localStorage only
- No server-side code — direct API calls from client
- No streaming (yet)
- No Notion integration (yet) — log to telemetry
- No mobile responsiveness — desktop tool
- No multi-user / network features — single node proof

---

## Acceptance Criteria

### Core Pipeline (Must Pass)
- [ ] 5-stage pipeline visualized in GlassPipeline component (Telemetry → Recognition → Compilation → Approval → Execution)
- [ ] Dev mode works with zero API keys using seed data (7 papers)
- [ ] Paper classification against 6 strategic questions
- [ ] Zone assignment (GREEN/YELLOW/RED) based on relevance score
- [ ] Briefing compilation in 3 voice presets (news_brief, technical_summary, strategic_intel)

### Jidoka Test (Must Pass)
- [ ] Paper `2510.03847` triggers conflicting thesis halt (matches both Q1 and Q6)
- [ ] JidokaAlert appears with Kaizen proposal
- [ ] Resolution flow works and logs to telemetry
- [ ] Missing API key triggers Jidoka halt with "Switch to dev mode" proposal

### Flywheel Test (Must Pass)
- [ ] Telemetry logs every interaction with `pattern_hash`
- [ ] Approving 3+ papers with same pattern triggers skill proposal
- [ ] Skill approval creates entry in SkillsLibrary
- [ ] Subsequent runs: matching papers handled at Tier 0 (no API call)
- [ ] FlywheelFooter shows tier distribution and cost decline

### Persistence Test (Must Pass)
- [ ] State survives browser refresh (localStorage)
- [ ] Skills persist across sessions
- [ ] Telemetry log persists across sessions

### Economic Proof (Must Pass)
- [ ] FlywheelFooter shows: Tier 0 skills count, total API cost, tier distribution
- [ ] Cost-per-paper declines as skills promote to Tier 0

---

## Pattern Check (Phase 0 — MANDATORY)

### Existing Patterns to Extend

| Requirement | Existing Pattern | Extension Approach |
|-------------|------------------|-------------------|
| State management | Bundle provides `state/reducer.ts` | Extend with `AppState` adding skills, telemetry, settings |
| Zone governance | Bundle provides `config/zones.ts` | Use directly — do not hardcode zone logic |
| Voice presets | Bundle provides `config/voices.ts` | Use directly — load corresponding prompt templates |
| Routing | Bundle provides `config/routing.ts` | Use for tier determination |
| Classification | Bundle provides `prompts/classify-paper.md` | Load as raw text for Tier 2 calls |
| Knowledge context | Bundle provides `knowledge/*.md` | Inject as context for classification and compilation |

### New Patterns Proposed

| Pattern | Justification |
|---------|---------------|
| `services/flywheel.ts` | Skill Flywheel doesn't exist in bundle — it's the app's core differentiator |
| `services/telemetry.ts` | JSONL logging with pattern_hash generation |
| `services/persistence.ts` | localStorage save/load for Async-First principle |
| `lib/patternHash.ts` | Hash generation for Flywheel detection |

---

## Canonical Source Audit (Phase 0.5 — MANDATORY)

| Capability Needed | Canonical Home | Recommendation |
|-------------------|----------------|----------------|
| Zone definitions | `config/zones.ts` | USE — do not duplicate |
| Voice presets | `config/voices.ts` | USE — do not duplicate |
| Routing config | `config/routing.ts` | USE — do not duplicate |
| Keyword topics | `config/defaults.ts` | USE — do not duplicate |
| State types | `state/types.ts` | EXTEND — add Skill, TelemetryEntry, AppState |
| Reducer | `state/reducer.ts` | EXTEND — wrap with useAutomaton hook |
| Prompt templates | `prompts/*.md` | USE — load as raw text via Vite |
| Knowledge files | `knowledge/*.md` | USE — inject as context |
| Seed data | `seed/sample-papers.json` | USE — dev mode pipeline |

**Critical:** The bundle files are READ-ONLY. Copy into `src/` and do not modify originals.

---

## Tech Stack

- **Framework:** React 18+ with TypeScript (Vite)
- **Styling:** Tailwind CSS with Grove design system tokens
- **State:** `useReducer` with bundle's reducer + localStorage persistence
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) for Tier 2
- **No backend.** Client-side app. State persists in localStorage.

---

## Design System (Grove Foundation)

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

**Fonts:** Instrument Serif (headings), Fragment Mono (UI/numbers), DM Sans (body)

**Rules:** No border-radius > 2px. 1px borders. 8px base spacing.

---

## Source Material

Recipe bundle: `C:\GitHub\grove-arxiv-radar\` (READ-ONLY)

Copy into `src/`:
- `config/` — Declarative governance
- `state/` — Types and reducer
- `knowledge/` — Strategic lens
- `prompts/` — LLM prompt templates
- `seed/` — 7 real arXiv papers for testing
