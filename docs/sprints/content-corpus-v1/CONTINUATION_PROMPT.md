# Continuation Prompt: Content & Corpus Rework

## Instant Orientation

| Field | Value |
|-------|-------|
| **Project** | `C:\GitHub\arxiv-radar-content-corpus` |
| **Sprint** | `content-corpus-v1` |
| **Branch** | `sprint/content-corpus-v1` |
| **Current Phase** | Ready for Execution |
| **Status** | 🟡 Planning Complete |
| **Next Action** | Execute Epic 1: Voice System Rework |

---

## Context Reconstruction

### Read These First (In Order)
1. `docs/sprints/content-corpus-v1/SPEC.md` — Live Status + Attention Anchor + Goals
2. `docs/sprints/content-corpus-v1/EXECUTION_PROMPT.md` — Step-by-step execution guide
3. `docs/sprints/content-corpus-v1/DEVLOG.md` — Progress tracking

### Key Decisions Made
1. Three voices: Quick Scan, Deep Analysis, Share Ready (use-case based)
2. Every briefing gets thesis signal (🟢/🔴/⚪)
3. Centralized claims treated skeptically ("Who benefits?")
4. localStorage over SQLite (simpler, sufficient)
5. Threads over X/Twitter (user preference)
6. Tab navigation over routing (simpler)

### What's Done
- [x] Sprint scoped and planned
- [x] SPEC.md created with acceptance criteria
- [x] SPRINTS.md with epic breakdown
- [x] REPO_AUDIT.md with current state analysis
- [x] ARCHITECTURE.md with target state
- [x] MIGRATION_MAP.md with file changes
- [x] DECISIONS.md with ADRs
- [x] EXECUTION_PROMPT.md with step-by-step guide
- [x] Worktree created at `C:\GitHub\arxiv-radar-content-corpus`

### What's Pending
- [ ] Epic 1: Voice System Rework
- [ ] Epic 2: Briefing Content Upgrade
- [ ] Epic 3: Workflow Language
- [ ] Epic 4: Library View
- [ ] Epic 5: Threads Sharing

---

## Resume Instructions

1. Open worktree:
   ```bash
   cd C:\GitHub\arxiv-radar-content-corpus
   ```

2. Verify state:
   ```bash
   git status  # Should be on sprint/content-corpus-v1
   npm run build  # Should pass
   ```

3. Read EXECUTION_PROMPT.md for detailed steps

4. Start with Epic 1: Voice System Rework
   - Modify `src/config/voices.ts`
   - Update `src/components/CommandBar.tsx`

---

## Attention Anchor

**We are building:** A revelatory research tool that surfaces evidence for decentralized AI
**Success looks like:** Engineers question the centralized hype after using this
**We are NOT:** Building a neutral aggregator — the thesis is explicit
**Priority:** Epic 1 (voices) → Epic 2 (content) → Epic 3 (language) → Epic 4 (library) → Epic 5 (sharing)

---

## The Thesis (Core Context)

**Decentralized AI is winning.** The evidence is in the papers.

**Centralized claims are self-serving.** "You need more infrastructure" comes from entities with $650B bets. The "need" is manufactured, not discovered.

**Every briefing signals:**
- 🟢 Supports Decentralized — evidence for local/efficient/open
- 🔴 Supports Centralized — contextualize who benefits
- ⚪ Neutral — orthogonal to debate

---

## Quick Reference

### Sprint Artifacts
```
docs/sprints/content-corpus-v1/
├── SPEC.md           ← Goals, acceptance criteria
├── SPRINTS.md        ← Epic/story breakdown
├── DEVLOG.md         ← Progress tracking
├── REPO_AUDIT.md     ← Current state
├── ARCHITECTURE.md   ← Target state
├── MIGRATION_MAP.md  ← File changes
├── DECISIONS.md      ← ADRs
├── EXECUTION_PROMPT.md ← Step-by-step
└── CONTINUATION_PROMPT.md ← This file
```

### Build Gate
```bash
npm run build
```

### Commit Format
```bash
git commit -m "{type}: {description}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
