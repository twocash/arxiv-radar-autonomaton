# Repository Audit: Content & Corpus Rework

## Current State Analysis

### Voice System
**Location:** `src/config/voices.ts`

Current voices:
- `news_brief` — "News Brief" (default)
- `strategic_intel` — "Strategic Intel"
- `technical_summary` — "Technical Summary"

**Issues:**
- Names are consultant-speak, not use-case driven
- Prompts don't vary meaningfully in length/depth
- No thesis framing in any voice
- No social sharing optimization

### Briefing Structure
**Location:** `src/state/types.ts`

```typescript
interface DraftBriefing {
  id: string
  paper: ClassifiedPaper
  voice_preset: VoicePresetId
  headline: string
  body: string
  key_claims: string[]
  caveats: string[]
  tier_migration_impact?: string
  compiled_at: string
  compiled_by: { tier, model, cost_usd }
}
```

**Issues:**
- No `lead` paragraph (the "why this matters")
- No `analysis` structured content
- No `thesis_signal` field
- No direct `arxiv_url` (buried in paper object)
- `body` is unstructured text blob

### Compilation Service
**Location:** `src/services/compiler.ts`

**Issues:**
- `generateBriefingPrompt()` doesn't vary much by voice
- `parseBriefingOutput()` extracts minimal structure
- Mock compiler produces same generic output for all voices
- No thesis framing in prompts

### UI Components

**PendingGovernance.tsx:**
- Shows "Approve" / "Reject" / "Edit" buttons
- Displays headline + body
- No thesis signal display
- Technical language throughout

**PipelineProgress.tsx:**
- Shows "X briefings" / "X archived"
- Technical metrics (tier counts, API cost)
- No human-friendly framing

**CommandBar.tsx:**
- Voice selector with current labels
- No description of what each voice produces

**App.tsx:**
- Single view (Processing)
- No tab navigation
- No Library view for saved briefings

### State Shape
**Location:** `src/state/types.ts`, `src/types/app.ts`

- `approved_briefings: ApprovedBriefing[]` — exists but not displayed
- No dedicated corpus/library state
- localStorage persistence exists via `useLocalStorage`

---

## Files Inventory

### Must Modify
| File | Change Scope |
|------|--------------|
| `src/config/voices.ts` | Rename voices, new prompts |
| `src/services/compiler.ts` | New prompts, richer parsing |
| `src/state/types.ts` | Extend DraftBriefing |
| `src/components/PendingGovernance.tsx` | New labels, thesis display |
| `src/components/PipelineProgress.tsx` | Human-friendly copy |
| `src/components/CommandBar.tsx` | New voice labels |
| `src/App.tsx` | Tab navigation, Library integration |

### Must Create
| File | Purpose |
|------|---------|
| `src/components/LibraryView.tsx` | Saved research corpus view |
| `src/components/ShareButton.tsx` | Threads sharing |

### Reference Only
| File | Why |
|------|-----|
| `src/hooks/useAutonomaton.ts` | Understand state flow |
| `src/state/reducer.ts` | Understand action handlers |
| `src/lib/andonGate.ts` | Understand valid transitions |

---

## Technical Debt Noted

1. **Voice prompts are thin** — Don't leverage the full capability of the model
2. **Briefing parsing is fragile** — Splits on newlines, doesn't handle edge cases
3. **No thesis awareness** — Classification doesn't consider decentralized vs centralized
4. **approved_briefings invisible** — Data exists but no UI to view it
5. **Copy is technical** — "Approve", "archived", "briefings" instead of human language

---

## Patterns to Preserve

1. **Declarative voice config** — Keep voice definitions in config, not code
2. **Pipeline architecture** — Don't change the 5-stage flow
3. **State machine** — Don't add new stages or bypass Andon Gate
4. **localStorage persistence** — Keep using existing pattern
5. **Flywheel economics** — Keep tier tracking visible
