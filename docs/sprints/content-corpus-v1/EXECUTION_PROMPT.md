# Execution Prompt: Content & Corpus Rework

## Instant Orientation

**Project:** `C:\GitHub\arxiv-radar-content-corpus`
**Sprint:** `content-corpus-v1`
**Branch:** `sprint/content-corpus-v1`
**Current Phase:** Ready for Execution
**Next Action:** Execute Epic 1 (Voice System Rework)

---

## Attention Anchoring Protocol

Before any major decision, re-read:
1. `docs/sprints/content-corpus-v1/SPEC.md` — Live Status + Attention Anchor
2. `docs/sprints/content-corpus-v1/SPEC.md` — Acceptance Criteria

After every 10 tool calls:
- Check: Am I still pursuing the stated goal?
- If uncertain: Re-read SPEC.md Goals and Acceptance Criteria

Before committing:
- Verify: Does this change satisfy Acceptance Criteria?

---

## The Mission

Transform arXiv Radar from a technical demo into a revelatory research tool that surfaces evidence for decentralized AI's viability while exposing centralized narratives as self-serving.

### Success Looks Like
- Engineers who "buy the centralized hype" see real papers, real evidence
- Every briefing has a thesis signal (🟢/🔴/⚪)
- Three distinct voices for different use cases
- Library view for browsing saved research
- Human-friendly language throughout

### We Are NOT
- Building a neutral aggregator — we have a thesis
- Changing the pipeline architecture
- Adding SQLite (localStorage is fine)
- Supporting X/Twitter (Threads only)

---

## Pre-Execution Verification

```bash
cd C:\GitHub\arxiv-radar-content-corpus
git status  # Should be on sprint/content-corpus-v1
npm run build  # Should pass
```

---

## Epic 1: Voice System Rework

### Files to Modify
1. `src/config/voices.ts`
2. `src/components/CommandBar.tsx`

### Step 1.1: Read Current Voice Config
```bash
cat src/config/voices.ts
```

### Step 1.2: Rename Voice IDs and Labels

**In `src/config/voices.ts`:**

```typescript
// Change type
export type VoicePresetId = 'quick_scan' | 'deep_analysis' | 'social_post'

// Add aliases for backward compat
export const VOICE_ALIASES: Record<string, VoicePresetId> = {
  'news_brief': 'quick_scan',
  'strategic_intel': 'deep_analysis',
  'technical_summary': 'social_post',
}

// Rename presets
export const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  quick_scan: {
    id: 'quick_scan',
    label: 'Quick Scan',
    description: '1-2 paragraph summary for morning review',
    // Update system_prompt for thesis-forward, punchy output
  },
  deep_analysis: {
    id: 'deep_analysis',
    label: 'Deep Analysis',
    description: '4-5 paragraph McKinsey-style briefing',
    // Update system_prompt for full structured output
  },
  social_post: {
    id: 'social_post',
    label: 'Share Ready',
    description: 'Threads-optimized format for sharing',
    // Update system_prompt for social formatting
  },
}
```

### Step 1.3: Update CommandBar
- Change voice button labels to match new names
- Ensure voice selection still works

### Step 1.4: Build Gate
```bash
npm run build
```

### Step 1.5: Commit
```bash
git add -A
git commit -m "feat(voices): rename to use-case based system

- quick_scan: Morning coffee review (was news_brief)
- deep_analysis: McKinsey-style briefing (was strategic_intel)
- social_post: Threads-ready format (was technical_summary)
- Add VOICE_ALIASES for backward compatibility

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Epic 2: Briefing Content Upgrade

### Files to Modify
1. `src/state/types.ts`
2. `src/services/compiler.ts`

### Step 2.1: Extend DraftBriefing Type

**In `src/state/types.ts`:**

Add to `DraftBriefing`:
```typescript
// Structured content
lead: string
analysis: string

// Thesis signal
thesis_signal: 'supports_decentralized' | 'supports_centralized' | 'neutral'
thesis_reason: string

// Convenience
arxiv_url: string
```

### Step 2.2: Update Compilation Prompts

**In `src/services/compiler.ts`:**

Update `generateBriefingPrompt()` with thesis instructions:

```typescript
const THESIS_INSTRUCTIONS = `
## Thesis Classification

Evaluate against the decentralized AI thesis:

🟢 SUPPORTS DECENTRALIZED if evidence for:
- Smaller models matching larger
- Efficiency breakthroughs
- On-device improvements
- Open-weight parity
- Cost reduction

🔴 SUPPORTS CENTRALIZED NARRATIVE if reinforces:
- "Scale is all you need"
- "You need our infrastructure"
- Proprietary advantages

Note: 🔴 means contextualize who benefits, not that it's wrong.

⚪ NEUTRAL if orthogonal to the debate.
`
```

### Step 2.3: Update Response Parsing

**In `src/services/compiler.ts`:**

Update `parseBriefingOutput()` to extract:
- `lead` section
- `analysis` paragraphs
- `thesis_signal` (parse 🟢/🔴/⚪)
- `thesis_reason`

### Step 2.4: Update Mock Compiler

**In `src/services/compiler.ts`:**

Update `mockCompileBriefing()` to produce voice-differentiated mocks with thesis signals.

### Step 2.5: Build Gate
```bash
npm run build
```

### Step 2.6: Commit
```bash
git add -A
git commit -m "feat(compiler): rich briefings with thesis signal

- Extended DraftBriefing with lead, analysis, thesis fields
- New compilation prompts with thesis classification
- Voice-differentiated output structure
- McKinsey + journalist quality for deep_analysis

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Epic 3: Workflow Language

### Files to Modify
1. `src/components/PendingGovernance.tsx`
2. `src/components/PipelineProgress.tsx`

### Step 3.1: Update PendingGovernance

- "Approve" → "Save to Library"
- "Reject" → "Skip"
- "Edit" → "Edit & Save"
- Add thesis signal badge to cards

### Step 3.2: Update PipelineProgress

- "X briefings" → "X promising developments"
- "X archived" → "X filtered" or omit
- Human-friendly copy throughout

### Step 3.3: Build Gate
```bash
npm run build
```

### Step 3.4: Commit
```bash
git add -A
git commit -m "refactor(ui): human-friendly workflow language

- Save to Library / Skip / Edit & Save
- 'X promising developments' instead of 'X briefings'
- Thesis signal badges on governance cards

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Epic 4: Library View

### Files to Create/Modify
1. `src/components/LibraryView.tsx` (NEW)
2. `src/App.tsx`

### Step 4.1: Create LibraryView Component

```typescript
// src/components/LibraryView.tsx
interface Props {
  briefings: ApprovedBriefing[]
  onShare: (briefing: ApprovedBriefing) => void
}

// Include:
// - FilterBar (thesis signal filter)
// - BriefingCard (expand/collapse)
// - EmptyState
```

### Step 4.2: Add Tab Navigation to App

```typescript
const [activeTab, setActiveTab] = useState<'processing' | 'library'>('processing')

// Render tabs
// Conditional content based on activeTab
```

### Step 4.3: Build Gate
```bash
npm run build
```

### Step 4.4: Commit
```bash
git add -A
git commit -m "feat(library): saved research corpus view

- Tab navigation: Processing | Library
- LibraryView with expand/collapse cards
- Filter by thesis signal
- Empty state when no saved briefings

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Epic 5: Threads Sharing

### Files to Create/Modify
1. `src/components/ShareButton.tsx` (NEW)
2. `src/components/LibraryView.tsx`

### Step 5.1: Create ShareButton

```typescript
// Copy to clipboard with Threads formatting
// Visual feedback on success
// Only show for social_post voice
```

### Step 5.2: Integrate into LibraryView

Add ShareButton to BriefingCard.

### Step 5.3: Build Gate
```bash
npm run build
```

### Step 5.4: Commit
```bash
git add -A
git commit -m "feat(sharing): Threads integration

- ShareButton with clipboard copy
- Threads-optimized formatting
- Visual feedback on copy success

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Final Verification

```bash
npm run build
```

### Manual Test
1. Select "Quick Scan" → Run → Short briefings with thesis signal
2. Select "Deep Analysis" → Run → Full McKinsey briefings
3. Select "Share Ready" → Run → Threads format
4. Save briefing → Switch to Library → Briefing appears
5. Filter by thesis → Works
6. Share to Threads → Copies formatted text

---

## Post-Sprint

```bash
git push origin sprint/content-corpus-v1

# Create PR
gh pr create --title "Content & Corpus Rework" --body "..."
```

Update DEVLOG.md with completion status.

---

## Reference Files

Read these for context if needed:
- `docs/sprints/content-corpus-v1/SPEC.md` — Goals and acceptance criteria
- `docs/sprints/content-corpus-v1/ARCHITECTURE.md` — Target state
- `docs/sprints/content-corpus-v1/MIGRATION_MAP.md` — File changes
- `docs/sprints/content-corpus-v1/DECISIONS.md` — Why decisions were made
