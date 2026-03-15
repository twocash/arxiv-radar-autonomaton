# Migration Map: Content & Corpus Rework

## Execution Order

```
Epic 1: Voice System
    └─→ voices.ts → CommandBar.tsx

Epic 2: Briefing Content
    └─→ types.ts → compiler.ts

Epic 3: Workflow Language
    └─→ PendingGovernance.tsx → PipelineProgress.tsx

Epic 4: Library View
    └─→ LibraryView.tsx → App.tsx

Epic 5: Sharing
    └─→ ShareButton.tsx → LibraryView.tsx
```

---

## File Changes

### Epic 1: Voice System Rework

#### `src/config/voices.ts`

**Current:**
```typescript
export type VoicePresetId = 'news_brief' | 'strategic_intel' | 'technical_summary'

export const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  news_brief: {
    id: 'news_brief',
    label: 'News Brief',
    // ...
  },
  // ...
}
```

**Target:**
```typescript
export type VoicePresetId = 'quick_scan' | 'deep_analysis' | 'social_post'

// Backward compat aliases
export const VOICE_ALIASES: Record<string, VoicePresetId> = {
  'news_brief': 'quick_scan',
  'strategic_intel': 'deep_analysis',
  'technical_summary': 'social_post',
}

export const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  quick_scan: {
    id: 'quick_scan',
    label: 'Quick Scan',
    description: '1-2 paragraph summary for morning review',
    // New prompts...
  },
  deep_analysis: {
    id: 'deep_analysis',
    label: 'Deep Analysis',
    description: '4-5 paragraph McKinsey-style briefing',
    // New prompts...
  },
  social_post: {
    id: 'social_post',
    label: 'Share Ready',
    description: 'Threads-optimized format for sharing',
    // New prompts...
  },
}
```

#### `src/components/CommandBar.tsx`

**Change:** Update voice selector labels
- "News Brief" → "Quick Scan"
- "Strategic Intel" → "Deep Analysis"
- "Technical Summary" → "Share Ready"

**Lines affected:** ~5-10 (voice selector section)

---

### Epic 2: Briefing Content Upgrade

#### `src/state/types.ts`

**Add to DraftBriefing:**
```typescript
// NEW fields
lead: string
analysis: string
thesis_signal: 'supports_decentralized' | 'supports_centralized' | 'neutral'
thesis_reason: string
arxiv_url: string

// DEPRECATED but kept
body?: string  // Mark as optional
```

**Lines affected:** ~10

#### `src/services/compiler.ts`

**Changes:**

1. `generateBriefingPrompt(paper, voice)` — New prompts per voice with:
   - Thesis classification instructions
   - Inverted pyramid structure
   - Voice-specific length guidance

2. `parseBriefingOutput(raw)` — Extract new fields:
   - Parse `lead` section
   - Parse `analysis` paragraphs
   - Parse `thesis_signal` and `thesis_reason`
   - Set `arxiv_url` from paper

3. `mockCompileBriefing(paper, voice)` — Voice-differentiated mocks:
   - Quick Scan: short mock
   - Deep Analysis: full mock
   - Social Post: Threads-formatted mock

**Lines affected:** ~150-200

---

### Epic 3: Workflow Language

#### `src/components/PendingGovernance.tsx`

**Changes:**
| Current | New |
|---------|-----|
| "Pending Governance" | "Needs Your Review" |
| "Approve" button | "Save to Library" |
| "Reject" button | "Skip" |
| "Edit" button | "Edit & Save" |

**Add:** Thesis signal badge on cards

**Lines affected:** ~30-50

#### `src/components/PipelineProgress.tsx`

**Changes:**
| Current | New |
|---------|-----|
| "X briefings" | "X promising developments" |
| "X archived" | "X filtered" or omit |
| "All papers processed" | "Analysis complete" |

**Lines affected:** ~15-20

---

### Epic 4: Library View

#### `src/components/LibraryView.tsx` (NEW FILE)

**Create:** ~150-200 lines

```typescript
// Components needed:
// - FilterBar (thesis signal filter)
// - BriefingCard (expand/collapse)
// - EmptyState
// - Main LibraryView container
```

#### `src/App.tsx`

**Changes:**

1. Add tab state:
```typescript
const [activeTab, setActiveTab] = useState<'processing' | 'library'>('processing')
```

2. Add TabBar component (inline or extract)

3. Conditional render based on activeTab

**Lines affected:** ~40-50

---

### Epic 5: Sharing

#### `src/components/ShareButton.tsx` (NEW FILE)

**Create:** ~50-70 lines

```typescript
// - Copy to clipboard
// - Visual feedback
// - Threads formatting
```

#### `src/components/LibraryView.tsx`

**Add:** ShareButton to BriefingCard

**Lines affected:** ~10

---

## Rollback Plan

Each epic is independently revertable:

```bash
# If Epic N breaks, revert to pre-epic commit
git log --oneline  # Find commit before epic
git revert HEAD~N..HEAD  # Revert N commits
```

**Safe points:**
- After Epic 1: Voices renamed, no structural changes
- After Epic 2: Briefings richer, backward compat maintained
- After Epic 3: Copy changed, no logic changes
- After Epic 4: New component, toggle-able via tab
- After Epic 5: Additive feature, can hide button

---

## Build Verification

After each epic:
```bash
npm run build
# If tests exist:
npm test
```

**Type safety:** TypeScript will catch:
- Missing VoicePresetId usages
- DraftBriefing field mismatches
- Prop type violations

---

## Files Not Changed

These files should NOT be modified:

| File | Reason |
|------|--------|
| `src/state/reducer.ts` | State logic unchanged |
| `src/hooks/useAutonomaton.ts` | Pipeline flow unchanged |
| `src/lib/andonGate.ts` | State machine unchanged |
| `src/services/classifier.ts` | Classification unchanged |
| `src/services/arxiv.ts` | Fetch logic unchanged |
| `src/components/GlassPipeline.tsx` | Pipeline viz unchanged |
| `src/components/FlywheelFooter.tsx` | Stats display unchanged |
