# Architectural Decision Records: Content & Corpus Rework

## ADR-001: Use-Case Based Voice System

### Status
Accepted

### Context
The current voice system uses consultant-speak labels ("News Brief", "Strategic Intel", "Technical Summary") that don't communicate what each voice produces or when to use it.

### Decision
Rename voices to use-case labels:
- `quick_scan` — "Quick Scan" for morning coffee review
- `deep_analysis` — "Deep Analysis" for actually understanding a paper
- `social_post` — "Share Ready" for Threads sharing

### Consequences
- Users immediately understand what each voice produces
- Voice selection becomes intuitive
- Backward compatibility maintained via aliases

### Alternatives Considered
1. **Perspective-based** ("The Opportunity", "The Threat", "The Evidence") — Rejected: too abstract
2. **Length-based** ("Short", "Medium", "Long") — Rejected: doesn't convey purpose

---

## ADR-002: Explicit Thesis Signal

### Status
Accepted

### Context
The tool has a thesis: decentralized AI is winning. Currently, briefings are neutral summaries that don't surface whether a paper supports or challenges this thesis.

### Decision
Every briefing includes a thesis signal:
- 🟢 `supports_decentralized` — evidence for local/efficient/open
- 🔴 `supports_centralized` — narrative that reinforces "you need us" (treated skeptically)
- ⚪ `neutral` — orthogonal to the debate

### Consequences
- Users see the editorial angle explicitly
- Centralized claims are contextualized, not neutralized
- Classification prompts include thesis evaluation

### Alternatives Considered
1. **Hidden editorial** — Reject: dishonest, users deserve to know the lens
2. **Numerical score** — Rejected: false precision, binary is clearer
3. **No thesis** — Rejected: defeats the purpose of the tool

---

## ADR-003: Skeptical Framing of Centralized Claims

### Status
Accepted

### Context
Claims like "you need more infrastructure" or "scale is all you need" are often self-serving — they come from entities with $650B bets that only pay off if centralization wins.

### Decision
When a paper supports the centralized narrative (🔴), the briefing should:
1. Flag it explicitly
2. Contextualize: "Who benefits from this being true?"
3. Not treat it as neutral evidence

### Consequences
- Centralized claims aren't amplified uncritically
- Users develop appropriate skepticism
- Editorial stance is visible, not hidden

### Alternatives Considered
1. **Equal treatment** — Rejected: false balance, not all claims are equal
2. **Exclude centralized papers** — Rejected: filter bubble, users should see counter-evidence

---

## ADR-004: localStorage Over SQLite

### Status
Accepted

### Context
The Library view needs persistence for saved briefings. Options:
- localStorage (already in use)
- SQLite (more powerful)

### Decision
Use localStorage for v1.

### Consequences
- No new dependencies
- Limited to ~5MB (sufficient for hundreds of briefings)
- No query capability beyond filtering
- Can migrate to SQLite later if needed

### Alternatives Considered
1. **SQLite (better-sqlite3)** — Deferred: adds complexity, not needed for demo
2. **IndexedDB** — Rejected: more complex API, overkill for this use case

---

## ADR-005: Threads Over X/Twitter

### Status
Accepted

### Context
Social sharing needs a target platform. Options:
- X/Twitter
- Threads
- LinkedIn
- Generic clipboard

### Decision
Primary target: Threads. Implementation: copy to clipboard with Threads-optimized formatting.

### Consequences
- Aligns with user preference (explicitly stated: "I hate X/Grok")
- Simple implementation (clipboard copy)
- User can paste anywhere, Threads formatting works best there

### Alternatives Considered
1. **X/Twitter** — Rejected: user preference
2. **Multi-platform** — Deferred: start simple, expand if needed

---

## ADR-006: Tab Navigation Over Routes

### Status
Accepted

### Context
Two views (Processing and Library) need navigation. Options:
- React Router with URL paths
- Simple tab state in component

### Decision
Use component state for tab navigation. No URL routing.

### Consequences
- Simpler implementation
- No new dependencies
- Tab state resets on refresh (acceptable for demo)
- Can add routing later if needed

### Alternatives Considered
1. **React Router** — Rejected: overkill for two tabs
2. **URL hash** — Rejected: unnecessary complexity

---

## ADR-007: Backward-Compatible Briefing Schema

### Status
Accepted

### Context
Adding new fields to DraftBriefing could break existing briefings in localStorage.

### Decision
All new fields are optional or have fallbacks:
- `lead` → defaults to empty string
- `analysis` → falls back to old `body` field
- `thesis_signal` → defaults to `'neutral'`
- `arxiv_url` → computed from `briefing.paper.arxiv_url`

### Consequences
- Existing saved briefings continue to render
- No migration script needed
- Gradual adoption as new briefings are created

### Alternatives Considered
1. **Breaking change** — Rejected: would lose user's saved corpus
2. **Migration script** — Rejected: complexity not warranted

---

## ADR-008: Voice Aliases for Migration

### Status
Accepted

### Context
Renaming voice IDs would break existing briefings that reference old IDs.

### Decision
Maintain alias mapping:
```typescript
const VOICE_ALIASES = {
  'news_brief': 'quick_scan',
  'strategic_intel': 'deep_analysis',
  'technical_summary': 'social_post',
}
```

### Consequences
- Old briefings render correctly
- Voice selection uses new IDs
- Aliases can be removed in future version

### Alternatives Considered
1. **Hard rename** — Rejected: breaks existing data
2. **Keep old IDs** — Rejected: misses opportunity to improve UX
