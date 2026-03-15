# Sprint Stories: Content & Corpus Rework

## Epic 1: Voice System Rework

### Attention Checkpoint
Before starting this epic, verify:
- [ ] SPEC.md Live Status shows correct phase
- [ ] Build passes: `npm run build`
- [ ] Goal alignment: Voices should map to use cases, not consultant-speak

### Story 1.1: Rename Voice Configuration
**File:** `src/config/voices.ts`
**Task:**
- Rename `news_brief` → `quick_scan`
- Rename `strategic_intel` → `deep_analysis`
- Rename `technical_summary` → `social_post` (Share Ready)
- Update `VoicePresetId` type
- Update display labels
- Update `example_opening` for each voice

**Tests:** Build passes, no type errors

### Story 1.2: Update Voice Prompts
**File:** `src/config/voices.ts`
**Task:**
- `quick_scan`: Prompt for 1-2 para, punchy, thesis-forward
- `deep_analysis`: Prompt for 4-5 para McKinsey style, full structure
- `social_post`: Prompt for Threads format (~300 chars + bullets)

**Tests:** Build passes

### Story 1.3: Update CommandBar Labels
**File:** `src/components/CommandBar.tsx`
**Task:**
- Update voice selector to show "Quick Scan", "Deep Analysis", "Share Ready"
- Ensure selected voice flows through to compilation

**Tests:** Visual verification in browser

### Build Gate
```bash
npm run build
```

---

## Epic 2: Briefing Content Upgrade

### Attention Checkpoint
Before starting this epic, verify:
- [ ] Epic 1 complete
- [ ] Voices renamed and prompts updated
- [ ] Goal: Richer briefings with thesis signal

### Story 2.1: Extend DraftBriefing Type
**File:** `src/state/types.ts`
**Task:**
- Add `lead: string` — the "why this matters" paragraph
- Add `analysis: string` — the 2-3 paragraph body
- Add `thesis_signal: 'supports_decentralized' | 'supports_centralized' | 'neutral'`
- Add `thesis_reason: string` — one sentence explanation
- Add `arxiv_url: string` — link to original paper
- Keep existing fields for backward compatibility

**Tests:** Build passes, no type errors

### Story 2.2: Update Compilation Prompts
**File:** `src/services/compiler.ts`
**Task:**
- Update `generateBriefingPrompt()` for each voice
- Deep Analysis: Full structure with thesis signal
- Quick Scan: Short with thesis signal
- Social Post: Threads-optimized format
- Include thesis classification instructions in prompt

**Tests:** Build passes

### Story 2.3: Parse Richer Response
**File:** `src/services/compiler.ts`
**Task:**
- Update `parseBriefingOutput()` to extract new fields
- Parse thesis signal from response
- Extract arXiv URL from paper data
- Handle graceful fallbacks for missing fields

**Tests:** Build passes, mock compiler produces valid output

### Story 2.4: Update Dev Mode Mock
**File:** `src/services/compiler.ts`
**Task:**
- Update `mockCompileBriefing()` to generate realistic mock data
- Include thesis signal in mock output
- Different mock content per voice

**Tests:** Dev mode produces valid briefings with thesis signals

### Build Gate
```bash
npm run build
```

---

## Epic 3: Workflow Language

### Attention Checkpoint
Before starting this epic, verify:
- [ ] Epic 2 complete
- [ ] Briefings have thesis signals
- [ ] Goal: Human-friendly copy throughout

### Story 3.1: Update PendingGovernance
**File:** `src/components/PendingGovernance.tsx`
**Task:**
- "Approve" → "Save to Library"
- "Reject" → "Skip"
- "Edit" → "Edit & Save"
- "Pending Governance" → "Needs Your Review" or "Review Queue"
- Display thesis signal badge on cards
- Show richer briefing content

**Tests:** Visual verification

### Story 3.2: Update PipelineProgress
**File:** `src/components/PipelineProgress.tsx`
**Task:**
- "X briefings" → "X promising developments"
- "X archived" → "X filtered" or omit
- "All papers processed" → "Analysis complete"
- Make copy human-friendly throughout

**Tests:** Visual verification

### Story 3.3: Audit All User-Facing Strings
**Files:** Various components
**Task:**
- Search for "archived", "briefing", "approve", "reject"
- Replace with human-friendly alternatives
- Ensure consistency

**Tests:** Visual verification, grep for old terms

### Build Gate
```bash
npm run build
```

---

## Epic 4: Library View

### Attention Checkpoint
Before starting this epic, verify:
- [ ] Epics 1-3 complete
- [ ] Briefings display correctly with thesis signals
- [ ] Goal: Sticky corpus view for saved research

### Story 4.1: Add Tab Navigation
**File:** `src/App.tsx`
**Task:**
- Add tab component: "Processing" | "Library"
- Default to Processing tab
- Tab state persists in component (not URL)
- Style tabs to match design system

**Tests:** Tabs render, clicking switches view

### Story 4.2: Create LibraryView Component
**File:** `src/components/LibraryView.tsx` (NEW)
**Task:**
- Display `approved_briefings` from state
- Card layout with expand/collapse
- Collapsed: headline + thesis signal badge + date
- Expanded: full briefing content
- Empty state: "Your library is empty. Save promising research."

**Tests:** Component renders, expand/collapse works

### Story 4.3: Add Filtering
**File:** `src/components/LibraryView.tsx`
**Task:**
- Filter by thesis signal (🟢/🔴/⚪ or All)
- Filter by zone (YELLOW/RED or All)
- Filter controls at top of Library view
- Filter state in component

**Tests:** Filters work correctly

### Story 4.4: Wire to App State
**File:** `src/App.tsx`
**Task:**
- Pass `approved_briefings` to LibraryView
- Ensure state updates propagate
- Library reflects saves immediately

**Tests:** Save briefing → appears in Library

### Build Gate
```bash
npm run build
```

---

## Epic 5: Threads Sharing

### Attention Checkpoint
Before starting this epic, verify:
- [ ] Epics 1-4 complete
- [ ] Library view working
- [ ] Goal: Easy sharing for Share Ready voice

### Story 5.1: Create ShareButton Component
**File:** `src/components/ShareButton.tsx` (NEW)
**Task:**
- Button: "Share to Threads"
- onClick: Copy formatted text to clipboard
- Visual feedback: "Copied!" toast or button text change
- Only shown for `social_post` voice briefings

**Tests:** Component renders, clipboard copy works

### Story 5.2: Format for Threads
**File:** `src/components/ShareButton.tsx`
**Task:**
- Format briefing content for Threads
- Include emoji, line breaks
- Truncate if needed
- Include paper title/link

**Tests:** Copied text is Threads-ready

### Story 5.3: Integrate ShareButton
**Files:** `src/components/LibraryView.tsx`, `src/components/PendingGovernance.tsx`
**Task:**
- Add ShareButton to briefing cards
- Show only when voice is `social_post`
- Position appropriately in card layout

**Tests:** Button appears, sharing works

### Build Gate
```bash
npm run build
```

---

## Final Verification

### Build + Visual
```bash
npm run build
```

### Manual Test Script
1. **Voice Selection:**
   - [ ] Select "Quick Scan" → produces short briefings
   - [ ] Select "Deep Analysis" → produces long McKinsey briefings
   - [ ] Select "Share Ready" → produces Threads format

2. **Thesis Signal:**
   - [ ] Briefings show 🟢/🔴/⚪ thesis signal
   - [ ] Signal includes one-sentence reason

3. **Workflow Language:**
   - [ ] "Save to Library" button works
   - [ ] "Skip" button works
   - [ ] Progress shows "X promising developments"

4. **Library View:**
   - [ ] Tab navigation works
   - [ ] Saved briefings appear
   - [ ] Expand/collapse works
   - [ ] Filtering works

5. **Sharing:**
   - [ ] "Share to Threads" copies text
   - [ ] Visual feedback on copy

---

## Commit Strategy

After each epic:
```bash
git add -A
git commit -m "{type}: {description}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

Commit types:
- `feat:` for new functionality
- `refactor:` for restructuring
- `fix:` for bug fixes
- `chore:` for config/cleanup
