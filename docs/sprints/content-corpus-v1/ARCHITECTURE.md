# Architecture: Content & Corpus Rework

## Target State Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  arXiv Radar                                                    │
│  [Processing]  [Library]                      Quick Scan ▼      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Processing View                    │    Library View           │
│  - Pipeline visualization           │    - Saved briefings      │
│  - Review queue                     │    - Filter by signal     │
│  - Save/Skip actions                │    - Expand/collapse      │
│                                     │    - Share to Threads     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Extended DraftBriefing

```typescript
interface DraftBriefing {
  // Existing fields
  id: string
  paper: ClassifiedPaper
  voice_preset: VoicePresetId
  headline: string
  compiled_at: string
  compiled_by: { tier: CognitiveTier; model: string; cost_usd?: number }

  // NEW: Structured content
  lead: string                    // "Why This Matters" paragraph
  analysis: string                // 2-3 paragraph body (inverted pyramid)
  key_claims: string[]            // Bullet points with specifics
  caveats: string[]               // Skepticism warranted

  // NEW: Thesis signal
  thesis_signal: ThesisSignal
  thesis_reason: string           // One sentence explanation

  // NEW: Direct link
  arxiv_url: string               // Pulled from paper for convenience

  // DEPRECATED (keep for backward compat)
  body?: string                   // Old unstructured field
  tier_migration_impact?: string  // Rarely used
}

type ThesisSignal =
  | 'supports_decentralized'      // 🟢
  | 'supports_centralized'        // 🔴 (treat skeptically)
  | 'neutral'                     // ⚪

type VoicePresetId =
  | 'quick_scan'                  // Was: news_brief
  | 'deep_analysis'               // Was: strategic_intel
  | 'social_post'                 // Was: technical_summary
```

### Voice Configuration

```typescript
interface VoicePreset {
  id: VoicePresetId
  label: string                   // UI display name
  description: string             // What this voice produces
  target_length: 'short' | 'medium' | 'long'
  system_prompt: string           // Full system prompt for compilation
  output_structure: {
    include_lead: boolean
    include_analysis: boolean
    include_claims: boolean
    include_caveats: boolean
    include_thesis: boolean
    social_optimized: boolean
  }
}
```

---

## Voice Definitions

### Quick Scan
```yaml
id: quick_scan
label: "Quick Scan"
description: "1-2 paragraph summary for morning review"
target_length: short
output_structure:
  include_lead: true
  include_analysis: false
  include_claims: false
  include_caveats: false
  include_thesis: true
  social_optimized: false
```

### Deep Analysis
```yaml
id: deep_analysis
label: "Deep Analysis"
description: "4-5 paragraph McKinsey-style briefing"
target_length: long
output_structure:
  include_lead: true
  include_analysis: true
  include_claims: true
  include_caveats: true
  include_thesis: true
  social_optimized: false
```

### Social Post (Share Ready)
```yaml
id: social_post
label: "Share Ready"
description: "Threads-optimized format for sharing"
target_length: short
output_structure:
  include_lead: false
  include_analysis: false
  include_claims: true    # As bullet points
  include_caveats: false
  include_thesis: true
  social_optimized: true
```

---

## Compilation Prompts

### Thesis Signal Instructions (All Voices)

```markdown
## Thesis Classification

Evaluate this paper against the decentralized AI thesis:

**SUPPORTS DECENTRALIZED (🟢)** if the paper provides evidence for:
- Smaller models achieving parity with larger ones
- Quantization/efficiency with minimal quality loss
- On-device/edge inference improvements
- Open-weight models matching proprietary
- Cost/energy efficiency gains
- Local RAG/retrieval advances

**SUPPORTS CENTRALIZED NARRATIVE (🔴)** if the paper reinforces:
- "Scale is all you need" claims
- "You need our infrastructure" framing
- Proprietary advantages over open approaches
- Centralization for safety arguments

Note: 🔴 doesn't mean wrong — it means contextualize who benefits.

**NEUTRAL (⚪)** if:
- Methodology paper without clear thesis implications
- Orthogonal to centralized/decentralized debate
```

### Deep Analysis Prompt Structure

```markdown
You are a McKinsey researcher with a journalist's gift for framing.

Generate a briefing for this arXiv paper:
Title: {title}
Abstract: {abstract}

## Output Structure

### Headline
One punchy sentence capturing the news value.

### Why This Matters
One paragraph for a busy engineer. Where does this land on the
decentralized vs centralized debate? Be explicit, not neutral.

### The Research
Para 1: What they did, what they found (facts)
Para 2: What this enables, who benefits (implications)
Para 3: Limitations, what's missing (skepticism)

### Key Claims
- Claim with specific numbers
- Measurable outcome
- What changed

### Caveats
- What to be skeptical about
- Methodology weakness

### Thesis Signal
One of: 🟢 SUPPORTS DECENTRALIZED / 🔴 SUPPORTS CENTRALIZED / ⚪ NEUTRAL
Followed by: one sentence reason
```

---

## Component Architecture

### App.tsx (Modified)

```tsx
function App() {
  const [activeTab, setActiveTab] = useState<'processing' | 'library'>('processing')

  return (
    <AutonomatonContext.Provider value={autonomaton}>
      <div className="min-h-screen flex flex-col">
        <CommandBar ... />
        <GlassPipeline ... />

        {/* Tab Navigation */}
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          tabs={['Processing', 'Library']}
        />

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">
          <main className="w-[60%] ...">
            {activeTab === 'processing' ? (
              <>
                <WelcomeCard ... />
                <JidokaAlert ... />
                <PipelineProgress ... />
                <SkillProposals ... />
                <PendingGovernance ... />  {/* Updated labels */}
              </>
            ) : (
              <LibraryView
                briefings={approved_briefings}
                onShare={handleShare}
              />
            )}
          </main>
          <aside className="w-[40%] ...">
            {/* Unchanged: PipelineTrace, SkillsLibrary, Settings */}
          </aside>
        </div>

        <FlywheelFooter ... />
      </div>
    </AutonomatonContext.Provider>
  )
}
```

### LibraryView.tsx (New)

```tsx
interface Props {
  briefings: ApprovedBriefing[]
  onShare: (briefing: ApprovedBriefing) => void
}

function LibraryView({ briefings, onShare }: Props) {
  const [filter, setFilter] = useState<ThesisSignal | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = briefings.filter(b =>
    filter === 'all' || b.thesis_signal === filter
  )

  return (
    <div>
      <FilterBar filter={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        filtered.map(briefing => (
          <BriefingCard
            key={briefing.id}
            briefing={briefing}
            expanded={expandedId === briefing.id}
            onToggle={() => setExpandedId(
              expandedId === briefing.id ? null : briefing.id
            )}
            onShare={() => onShare(briefing)}
          />
        ))
      )}
    </div>
  )
}
```

### ShareButton.tsx (New)

```tsx
interface Props {
  briefing: ApprovedBriefing
  className?: string
}

function ShareButton({ briefing, className }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const text = formatForThreads(briefing)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Only show for social_post voice
  if (briefing.voice_preset !== 'social_post') return null

  return (
    <button onClick={handleShare} className={className}>
      {copied ? '✓ Copied!' : 'Share to Threads'}
    </button>
  )
}

function formatForThreads(briefing: ApprovedBriefing): string {
  const signal = briefing.thesis_signal === 'supports_decentralized'
    ? '🟢'
    : briefing.thesis_signal === 'supports_centralized'
    ? '🔴'
    : '⚪'

  return `${briefing.headline}

${briefing.key_claims.map(c => `• ${c}`).join('\n')}

${signal} ${briefing.thesis_reason}

📄 ${briefing.arxiv_url}`
}
```

---

## State Flow

```
User clicks "Save to Library"
         ↓
dispatch({ type: 'BRIEFING_APPROVED', briefingId })
         ↓
reducer adds to approved_briefings[]
         ↓
localStorage persists via useLocalStorage
         ↓
LibraryView receives updated briefings
         ↓
Card appears in Library tab
```

No new state shape required — `approved_briefings` already exists.

---

## Backward Compatibility

### DraftBriefing Migration

Old briefings (without new fields) will render with fallbacks:
- `lead` → empty string
- `analysis` → use old `body` field
- `thesis_signal` → `'neutral'`
- `thesis_reason` → `''`
- `arxiv_url` → `briefing.paper.arxiv_url`

### Voice ID Migration

```typescript
// In voices.ts, maintain aliases
const VOICE_ALIASES: Record<string, VoicePresetId> = {
  'news_brief': 'quick_scan',
  'strategic_intel': 'deep_analysis',
  'technical_summary': 'social_post',
}
```
