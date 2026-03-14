# Architecture Decision Records — arXiv Radar v1

## ADR-001: Client-Side Only Architecture

### Status
Accepted

### Context
The app needs to integrate with:
- arXiv API (read-only, public)
- Anthropic API (requires API key)
- localStorage (for persistence)

A backend would add complexity but provide better API key security.

### Decision
**Client-side only.** No backend. Direct API calls from browser.

### Rationale
1. **Protocol proof, not production:** This app validates the Autonomaton Pattern, not production security
2. **Simplicity:** No deployment complexity, no server costs, no CORS proxy
3. **Sovereignty demonstration:** App runs entirely on user's machine
4. **Anthropic SDK supports browser:** `dangerouslyAllowBrowser: true` flag exists

### Consequences
- API key stored in localStorage (acceptable for demo)
- User responsible for API key security
- arXiv CORS may require browser extension or dev proxy
- No real-time collaboration features

### Alternatives Rejected
- **Cloudflare Worker proxy:** Adds deployment complexity
- **Next.js API routes:** Overkill for protocol proof
- **Electron wrapper:** Too heavy for demo

---

## ADR-002: useReducer over Zustand/Redux

### Status
Accepted

### Context
Need state management for:
- Pipeline status
- Paper queues
- Briefings
- Skills
- Telemetry

The bundle provides a pure reducer.

### Decision
**useReducer with bundle's reducer.** Wrap with custom hook for persistence and flywheel integration.

### Rationale
1. **Bundle compatibility:** The reducer is already written and tested
2. **No dependencies:** useReducer is built into React
3. **Predictable:** Pure functions, easy to debug
4. **Pattern alignment:** Declarative state machine matches Autonomaton philosophy

### Consequences
- No devtools (acceptable for demo)
- Manual persistence layer needed
- Context required for global access (minimal in this app)

### Alternatives Rejected
- **Zustand:** Adds dependency, bundle already has reducer
- **Redux Toolkit:** Overkill, bundle already has reducer
- **Jotai/Recoil:** Atomic state doesn't match pipeline flow

---

## ADR-003: localStorage for Persistence

### Status
Accepted

### Context
State must survive browser refresh (Async-First principle). Options:
- localStorage
- IndexedDB
- External database

### Decision
**localStorage with JSON serialization.** Telemetry stored as JSONL in separate key.

### Rationale
1. **Simplicity:** Synchronous API, no async complexity
2. **Sufficient capacity:** 5-10MB is enough for demo
3. **Browser support:** Universal
4. **Exportable:** Easy to implement "Download telemetry" feature

### Consequences
- 5-10MB limit (may need telemetry pruning for long-term use)
- Synchronous writes (may block UI on large state)
- No query capability (full scan for pattern detection)

### Alternatives Rejected
- **IndexedDB:** Async complexity not justified for demo
- **SQLite (WASM):** Heavy dependency for simple persistence
- **Supabase/Firebase:** Violates client-only constraint

---

## ADR-004: Tailwind CSS v4 with CSS Custom Properties

### Status
Accepted

### Context
Grove design system uses specific colors and tokens. Options:
- Tailwind with config
- CSS-in-JS (Emotion, styled-components)
- Plain CSS
- CSS Modules

### Decision
**Tailwind CSS v4 with CSS custom properties for design tokens.**

### Rationale
1. **Speed:** Utility classes are fast to write
2. **Design system alignment:** Custom properties allow Grove tokens
3. **Vite integration:** @tailwindcss/vite plugin is seamless
4. **No runtime:** Zero JS bundle impact

### Consequences
- Longer className strings
- Some custom CSS needed for zone colors
- Google Fonts loaded separately

### Alternatives Rejected
- **CSS-in-JS:** Runtime overhead, not needed
- **Plain CSS:** Too slow for rapid prototyping
- **CSS Modules:** More boilerplate than Tailwind

---

## ADR-005: Pattern Hash Algorithm

### Status
Accepted

### Context
Flywheel needs to detect repeating patterns. Need a hash function that groups similar papers.

### Decision
**Deterministic hash from sorted array of: matched_topics + zone + top 3 keywords.**

```typescript
function generatePatternHash(
  topics: string[],
  zone: Zone,
  keywords: string[]
): string {
  const parts = [
    ...topics.sort(),
    zone,
    ...keywords.slice(0, 3).sort()
  ]
  return btoa(parts.join('|')).slice(0, 12)
}
```

### Rationale
1. **Deterministic:** Same inputs always produce same hash
2. **Semantic:** Groups papers by topic+zone, not surface features
3. **Human-readable-ish:** Base64 is recognizable
4. **Collision-tolerant:** False positives just mean more manual review

### Consequences
- Keywords limited to top 3 (prevents over-specificity)
- Zone included (GREEN patterns are different from YELLOW)
- No cryptographic security (not needed)

### Alternatives Rejected
- **MD5/SHA:** Overkill, not semantically meaningful
- **Embedding similarity:** Requires model call, defeats Tier 0
- **Title hash:** Too specific, won't detect patterns

---

## ADR-006: Dev Mode with Seed Data

### Status
Accepted

### Context
App must demonstrate full pipeline without API keys. The bundle provides 7 seed papers with expected classifications.

### Decision
**Dev mode uses seed data with mock classification results.** `_expected_zone` and `_rationale` fields provide ground truth.

### Rationale
1. **Zero-dependency demo:** Proves the app without external services
2. **Deterministic testing:** Same papers always produce same results
3. **Jidoka proof:** Paper 2510.03847 is designed to trigger conflict
4. **Flywheel proof:** Multiple "cost-falling" papers enable skill promotion

### Consequences
- Mock compilation (format abstract, no LLM)
- 7 papers only (sufficient for demo)
- `_` prefixed fields indicate test metadata

### Alternatives Rejected
- **Mock API server:** Adds complexity
- **Recorded responses:** Still needs recording infrastructure
- **Random generation:** Not semantically meaningful

---

## ADR-007: Anthropic SDK with dangerouslyAllowBrowser

### Status
Accepted

### Context
Need to call Claude API from browser. Options:
- Direct fetch
- Anthropic SDK with browser flag
- Backend proxy

### Decision
**Anthropic SDK with `dangerouslyAllowBrowser: true`.**

### Rationale
1. **Type safety:** SDK provides TypeScript types
2. **Retry logic:** SDK handles rate limiting
3. **Streaming support:** Built-in (for future use)
4. **Official:** Supported by Anthropic

### Consequences
- API key exposed in browser (acceptable for demo)
- User must trust the app with their key
- Key stored in localStorage (separate from state export)

### Alternatives Rejected
- **Direct fetch:** Manual retry, no types, more code
- **Backend proxy:** Violates client-only constraint

---

## ADR-008: Vite Raw Imports for Markdown

### Status
Accepted

### Context
Need to load prompt templates and knowledge files as strings for injection into LLM context.

### Decision
**Vite `?raw` suffix for importing markdown as strings.**

```typescript
import classifyPrompt from '../prompts/classify-paper.md?raw'
import topicsKnowledge from '../knowledge/topics.md?raw'
```

### Rationale
1. **Build-time:** Content embedded in bundle
2. **Type-safe:** Vite provides string type
3. **No runtime fetch:** Faster, no async
4. **Standard Vite:** Well-documented feature

### Consequences
- Bundle size includes markdown (small)
- Changes require rebuild
- Need `*.md` declaration in vite-env.d.ts

### Alternatives Rejected
- **Fetch at runtime:** Adds async complexity
- **JSON embedding:** Extra processing step
- **Webpack raw-loader:** Not using Webpack

---

## ADR-009: Kaizen Proposals as Structured Data

### Status
Accepted

### Context
When Jidoka halts the pipeline, the system should propose fixes. How to represent these proposals?

### Decision
**KaizenProposal type with structured options array.**

```typescript
interface KaizenProposal {
  id: string
  jidoka_event_id: string
  description: string
  options: KaizenOption[]
}

interface KaizenOption {
  label: string
  action: string
  is_recommended: boolean
}
```

### Rationale
1. **Declarative:** UI can render any proposal generically
2. **Auditable:** Selected option logged to telemetry
3. **Extensible:** New proposal types don't need UI changes
4. **Shameless:** Options presented neutrally, no "error" framing

### Consequences
- More complex than simple string
- Requires proposal generation logic
- Actions must be interpretable by resolution handler

### Alternatives Rejected
- **Free-form text:** Not actionable
- **Fixed proposal types:** Not extensible
- **LLM-generated proposals:** Adds API cost to failure path

---

## ADR-010: Flywheel Threshold Configuration

### Status
Accepted

### Context
When should the Flywheel propose a skill? Fixed threshold or configurable?

### Decision
**Configurable via Settings.** Default: 3 approvals in 14 days.

### Rationale
1. **User control:** Different workflows have different patterns
2. **Testable:** Can lower threshold for demo
3. **Conservative default:** 3 is enough signal without over-learning

### Consequences
- Settings UI needed
- Validation required (threshold > 0, window > 0)
- Stored in localStorage with other settings

### Alternatives Rejected
- **Fixed threshold:** Not adaptable to user workflow
- **Dynamic/ML threshold:** Overkill for demo
- **No threshold:** Would spam proposals
