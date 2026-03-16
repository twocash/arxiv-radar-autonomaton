# Sprint: Content & Corpus Rework (content-corpus-v1)

## Live Status

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 8: Execution Complete |
| **Status** | ✅ Complete |
| **Blocking Issues** | None |
| **Last Updated** | 2026-03-15 |
| **Next Action** | Manual testing, PR creation |

---

## Attention Anchor

**Re-read this block before every major decision.**

- **We are building:** A revelatory research tool that surfaces evidence for decentralized AI's viability while exposing centralized narratives as self-serving
- **Success looks like:** Engineers who "buy the centralized hype" see real papers, real evidence, and start questioning the $650B bet
- **We are NOT:** Building a neutral aggregator — we have a thesis, and the tool makes it visible
- **Current phase:** Complete
- **Next action:** Manual testing, PR creation

---

## The Thesis

**Decentralized AI is winning.** The evidence is in the papers:
- Smaller models matching larger ones
- Quantization and efficiency breakthroughs
- On-device inference improvements
- Open-weight releases eroding moats
- Cost curves falling faster than predicted

**The counter-narrative is self-serving.** Claims that "you need more infrastructure" or "scale is the only path" come from entities with $650B bets that only pay off through epistemic capture. The goal is grabbing the lion's share of $10T labor and software markets. The "need" for centralized infrastructure is manufactured, not discovered.

**This tool makes the thesis visible.** Every briefing explicitly flags:
- 🟢 **Supports Decentralized:** Evidence that local/efficient/open approaches are viable
- 🔴 **Supports Centralized Narrative:** Claims that reinforce the "you need us" story (treated with appropriate skepticism)
- ⚪ **Neutral:** Doesn't clearly support either direction

---

## Goal

Transform arXiv Radar from a technical demo into a revelatory research tool:

1. **Richer content** — McKinsey researcher + journalist quality briefings with thesis framing
2. **Clearer voices** — Use-case-based voices (Quick Scan, Deep Analysis, Share Ready)
3. **Sticky workflow** — Library view to browse saved research corpus
4. **Human language** — "Save to Library" not "Approve", "62 papers analyzed, 8 promising" not "62 fetched, 8 briefings"
5. **Social sharing** — Share Ready voice with Threads integration

---

## Non-Goals

- SQLite persistence (localStorage is fine for now)
- Full-text search (basic filtering only)
- X/Twitter integration (Threads only)
- Mobile responsiveness
- Backend/API changes
- Pipeline architecture changes

---

## Pattern Check

**Existing patterns to extend:**

| Requirement | Existing Pattern | Extension Approach |
|-------------|------------------|-------------------|
| Voice configuration | `src/config/voices.ts` | Rename voices, expand prompts |
| Briefing structure | `DraftBriefing` type | Add new fields (lead, analysis, thesis_signal) |
| Compilation | `src/services/compiler.ts` | New prompts, richer parsing |
| UI navigation | `src/App.tsx` | Add tab navigation for Processing/Library |
| Workflow actions | `src/components/PendingGovernance.tsx` | Rename buttons, update copy |

**New patterns proposed:** None — all needs met by extending existing.

---

## Acceptance Criteria

### Voice System (P0)
- [ ] Three voices: `quick_scan`, `deep_analysis`, `social_post`
- [ ] Labels in UI: "Quick Scan", "Deep Analysis", "Share Ready"
- [ ] Each voice produces distinctly different output length/tone
- [ ] Social post is Threads-ready (short hook + key points)

### Briefing Content (P0)
- [ ] Deep Analysis produces 4-5 paragraph McKinsey-style briefing
- [ ] Every briefing includes: headline, lead ("why this matters"), analysis, key claims, caveats
- [ ] Every briefing includes thesis signal (🟢/🔴/⚪)
- [ ] Every briefing links to original arXiv paper
- [ ] Quick Scan produces 1-2 paragraph summary with thesis signal
- [ ] Share Ready produces Threads-formatted output

### Library View (P1)
- [ ] Tab navigation: "Processing" | "Library"
- [ ] Library shows all saved briefings in card format
- [ ] Cards are expandable (collapsed = headline + signal, expanded = full)
- [ ] Basic filtering by zone (GREEN/YELLOW/RED) and thesis signal
- [ ] Persists across sessions (localStorage)

### Workflow Language (P1)
- [ ] "Save to Library" replaces "Approve"
- [ ] "Skip" replaces "Reject"
- [ ] "Edit & Save" replaces "Edit"
- [ ] Progress shows: "62 papers analyzed — 8 promising developments"
- [ ] No technical jargon in user-facing copy

### Social Sharing (P2)
- [ ] "Share to Threads" button on Share Ready voice briefings
- [ ] Copies formatted text to clipboard
- [ ] Visual feedback on copy success
- [ ] Opens Threads intent URL (optional)

---

## Voices — Detailed Specification

### Quick Scan
**Use case:** Morning coffee review
**Length:** 1-2 paragraphs
**Tone:** Headlines + so-what, punchy
**Structure:**
```
## [Headline]

[1 paragraph: What happened and why you should care. Include thesis signal.]

**Thesis:** 🟢 Supports decentralized — [one sentence reason]

📄 [Paper Title](url)
```

### Deep Analysis
**Use case:** Actually understanding a paper
**Length:** 4-5 paragraphs
**Tone:** McKinsey researcher with journalist's gift for framing
**Structure:**
```
## [Headline — punchy, news-style]

**Why This Matters:** [1 paragraph — the "so what" for a busy engineer.
Where does this land on the thesis? Be explicit, not neutral.]

### The Research

[Para 1: What they did, what they found — the facts]

[Para 2: What this enables, who benefits — the implications]

[Para 3: What's still missing, limitations, skepticism warranted]

### Key Claims
- [Claim 1 — with specific numbers if available]
- [Claim 2 — measurable outcome]
- [Claim 3 — what changed]

### Caveats
- [What to be skeptical about]
- [Methodology weakness]
- [What wasn't tested]

### Thesis Signal
🟢 **SUPPORTS DECENTRALIZED:** [reason]
— OR —
🔴 **SUPPORTS CENTRALIZED NARRATIVE:** [reason + appropriate skepticism]
— OR —
⚪ **NEUTRAL:** [why it doesn't clearly support either]

---
📄 [Paper Title](arxiv_url)
Classified: YELLOW | Confidence: 0.78 | Tier: T2
```

### Share Ready (Social Post)
**Use case:** Sharing on Threads
**Length:** ~300 chars main + 3-4 follow-up points
**Tone:** Engaging, accessible, thesis-forward
**Structure:**
```
[HOOK — 1-2 sentences that make someone stop scrolling]

Key findings:
• [Point 1]
• [Point 2]
• [Point 3]

[Thesis callout: "More evidence that..." or "Counter to the hype..."]

📄 [short url or title]
```

---

## Thesis Signal Classification

**Integrated into compilation prompt. Classifier considers:**

### 🟢 Supports Decentralized
- Smaller models achieving parity with larger ones
- Quantization/pruning with minimal quality loss
- On-device inference breakthroughs
- Open-weight models matching proprietary
- Efficiency gains (cost per token, energy per inference)
- Local RAG/retrieval advances
- Edge deployment success stories

### 🔴 Supports Centralized Narrative (Treat Skeptically)
- "Scale is all you need" claims
- "You need our infrastructure" framing
- Proprietary data moat arguments
- Claims that closed > open (often self-serving)
- "Safety requires centralization" arguments

**Note:** 🔴 doesn't mean the paper is wrong — it means the briefing should contextualize the claim within the broader narrative. Who benefits from this being true?

### ⚪ Neutral
- Methodology papers without clear thesis implications
- Foundational research that could go either way
- Topics orthogonal to the centralized/decentralized debate

---

## UI Copy Changes

| Current | New |
|---------|-----|
| "News Brief" | "Quick Scan" |
| "Strategic Intel" | "Deep Analysis" |
| "Technical Summary" | "Share Ready" |
| "Approve" | "Save to Library" |
| "Reject" | "Skip" |
| "Edit" | "Edit & Save" |
| "8 briefings" | "8 promising developments" |
| "54 archived" | "54 filtered out" or omit entirely |
| "Pending Governance" | "Review Queue" or "Needs Your Review" |
| "All papers processed" | "Analysis complete" |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/voices.ts` | Rename voices, new prompts, new structure |
| `src/services/compiler.ts` | New compilation prompts, richer parsing, thesis signal |
| `src/state/types.ts` | Extend `DraftBriefing` with new fields |
| `src/components/PendingGovernance.tsx` | New button labels, richer card display |
| `src/components/PipelineProgress.tsx` | Human-friendly copy |
| `src/components/CommandBar.tsx` | New voice labels |
| `src/App.tsx` | Tab navigation, Library view integration |
| `src/components/LibraryView.tsx` | NEW — saved research corpus view |
| `src/components/ShareButton.tsx` | NEW — Threads sharing |

---

## Epic Breakdown

### Epic 1: Voice System Rework (~2-3 hrs)
- Rename voices in config
- Update prompts with new structure
- Update CommandBar labels
- Verify voice selection flows through to compilation

### Epic 2: Briefing Content Upgrade (~3-4 hrs)
- Extend DraftBriefing type
- New compilation prompts (all three voices)
- Parse richer Anthropic response
- Add thesis signal logic
- Include arXiv link

### Epic 3: Workflow Language (~1 hr)
- Update PendingGovernance buttons and copy
- Update PipelineProgress messaging
- Audit all user-facing strings

### Epic 4: Library View (~3-4 hrs)
- Tab navigation in App.tsx
- LibraryView component
- Card display with expand/collapse
- Basic filtering (zone, thesis signal)
- Wire to approved_briefings state

### Epic 5: Threads Sharing (~1-2 hrs)
- ShareButton component
- Copy to clipboard
- Threads intent URL
- Visual feedback

---

## Verification

### Build Gate
```bash
npm run build && npm test
```

### Manual Verification
1. Select "Quick Scan" → Run pipeline → Briefings are short, punchy
2. Select "Deep Analysis" → Run pipeline → Briefings are 4-5 para, thesis-explicit
3. Select "Share Ready" → Run pipeline → Output is Threads-formatted
4. "Save to Library" a briefing → Switch to Library tab → Briefing appears
5. "Skip" a briefing → Does NOT appear in Library
6. Filter Library by thesis signal → Works
7. Click "Share to Threads" → Copies formatted text, shows feedback

---

## Architectural Notes

- **Declarative sovereignty preserved** — voices defined in config, not hardcoded
- **Pipeline unchanged** — this is content/UI, not architecture
- **Thesis is editorial** — we're not hiding it, we're making it visible
- **localStorage sufficient** — can add SQLite later if corpus grows
