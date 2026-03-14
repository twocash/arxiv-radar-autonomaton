# Continuation Prompt: arXiv Radar v1

## Instant Orientation

| Field | Value |
|-------|-------|
| **Project** | `C:\GitHub\arxiv-test-app\` |
| **Sprint** | arxiv-radar-v1 |
| **Current Phase** | Planning Complete — Ready for Execution |
| **Status** | 🟡 Ready to Start Epic 1 |
| **Next Action** | Execute Epic 1: Scaffold |

---

## Context Reconstruction

### Read These First (In Order)
1. `docs/sprints/arxiv-radar-v1/SPEC.md` — Live Status + Attention Anchor + Goals
2. `docs/sprints/arxiv-radar-v1/DEVLOG.md` — Last entries
3. `docs/sprints/arxiv-radar-v1/SPRINTS.md` — Epic 1 details

### Source Bundle Location
`C:\GitHub\grove-arxiv-radar\` — READ-ONLY, copy to `src/`

### Key Decisions Made
1. **Client-side only** — No backend, direct API calls
2. **useReducer** — Bundle's reducer, wrapped with useAutomaton hook
3. **localStorage** — State, telemetry, settings persistence
4. **Tailwind v4** — CSS custom properties for Grove design tokens
5. **Pattern hash** — `btoa([...topics, zone, ...keywords].join('|')).slice(0,12)`
6. **Dev mode** — Seed data with `_expected_zone` for testing
7. **Anthropic SDK** — `dangerouslyAllowBrowser: true` for browser usage

### What's Done
- [x] All 9 sprint artifacts created
- [x] Architecture designed
- [x] Epic/story breakdown complete
- [x] ADRs documented

### What's Pending
- [ ] Epic 1: Scaffold (Vite + Tailwind + bundle copy)
- [ ] Epic 2: State Foundation (types, persistence, hooks)
- [ ] Epic 3: Pipeline Services (classifier, jidoka, arxiv)
- [ ] Epic 4: Flywheel Engine
- [ ] Epic 5: UI Shell
- [ ] Epic 6: Governance UI
- [ ] Epic 7: API Integration + Polish

---

## Resume Instructions

1. Read `SPEC.md` Live Status and Attention Anchor
2. Read `SPRINTS.md` Epic 1 section
3. Execute scaffold commands:

```bash
cd C:\GitHub\arxiv-test-app
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install @anthropic-ai/sdk
```

4. Copy bundle directories:

```powershell
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\config src\config
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\state src\state
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\knowledge src\knowledge
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\prompts src\prompts
Copy-Item -Recurse C:\GitHub\grove-arxiv-radar\seed src\seed
```

5. Configure Tailwind and design system per EXECUTION_PROMPT.md

---

## Attention Anchor

**We are building:** A React app proving the Grove Autonomaton Pattern through arXiv research intelligence

**Success looks like:** Dev mode demo runs with zero API keys — full pipeline including Jidoka halt and Flywheel skill promotion

**We are NOT:** Building a production app, mobile responsiveness, multi-user features, or backend

**Current phase:** Ready for Execution

**Next action:** Execute Epic 1: Scaffold

---

## Sprint Artifacts

All artifacts in `docs/sprints/arxiv-radar-v1/`:

| Artifact | Purpose |
|----------|---------|
| `SPEC.md` | Goals, acceptance criteria, attention anchor |
| `REPO_AUDIT.md` | Current state analysis |
| `ARCHITECTURE.md` | Target state design |
| `MIGRATION_MAP.md` | File-by-file execution plan |
| `DECISIONS.md` | 10 ADRs |
| `SPRINTS.md` | 7 epics with stories |
| `EXECUTION_PROMPT.md` | Self-contained handoff |
| `DEVLOG.md` | Execution tracking |
| `CONTINUATION_PROMPT.md` | This file |

---

## Verification Tests (Final)

After all epics complete, verify:

1. **Jidoka Test** — Paper 2510.03847 halts pipeline
2. **Flywheel Test** — 3 approvals → skill proposal → Tier 0 handling
3. **Sovereignty Test** — Works offline in dev mode
4. **Persistence Test** — State survives browser restart
5. **Honesty Test** — Q6 falsification gets equal rigor
6. **Ratchet Test** — Costs decline as skills promote
