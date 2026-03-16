# DEVLOG: Content & Corpus Rework

## Sprint Start
**Date:** 2026-03-15
**Goal:** Transform arXiv Radar from technical demo to revelatory research tool

---

## Session 1: Sprint Planning

**Started:** 2026-03-15 17:30
**Status:** ✅ Complete

### What Happened
- Brainstormed voice system rework (use-case based vs consultant-speak)
- Defined thesis framing (decentralized vs centralized narrative)
- Key insight: "Infrastructure requirements increasing" is manufactured need, not discovered truth
- Scoped 5 epics, ~12 hours total
- Created SPEC.md and SPRINTS.md

### Key Decisions
1. Three voices: Quick Scan, Deep Analysis, Share Ready
2. Thesis signal on every briefing (🟢/🔴/⚪)
3. Library view for saved corpus (Processing | Library tabs)
4. "Share to Threads" (not X/Twitter)
5. localStorage sufficient (no SQLite for now)
6. Centralized claims treated with appropriate skepticism

### Artifacts Created
- `docs/sprints/content-corpus-v1/SPEC.md`
- `docs/sprints/content-corpus-v1/SPRINTS.md`
- `docs/sprints/content-corpus-v1/DEVLOG.md` (this file)

### Next Action
Execute Epic 1: Voice System Rework

---

## Epic Progress Tracker

| Epic | Status | Notes |
|------|--------|-------|
| 1: Voice System Rework | ✅ Complete | ef01806 |
| 2: Briefing Content Upgrade | ✅ Complete | 9aed72f |
| 3: Workflow Language | ✅ Complete | da95dd7 |
| 4: Library View | ✅ Complete | 64f8a18 |
| 5: Threads Sharing | ✅ Complete | 4aa0f86 |

---

## Session 2: Sprint Execution

**Started:** 2026-03-15 (continued session)
**Status:** ✅ Complete

### What Happened

**Epic 1: Voice System Rework**
- Rewrote `src/config/voices.ts` with use-case based voices
- New voice IDs: `quick_scan`, `deep_analysis`, `social_post`
- Added `VOICE_ALIASES` for backward compatibility
- Added `THESIS_INSTRUCTIONS` constant shared across voices
- Fixed build errors in App.tsx, VoiceSelector.tsx, loadPrompts.ts, compiler.ts, types.ts

**Epic 2: Briefing Content Upgrade**
- Added `ThesisSignal` type to types.ts
- Extended `DraftBriefing` with: lead, analysis, thesis_signal, thesis_reason, arxiv_url
- Rewrote `parseBriefingOutput()` with structured section extraction
- Added `extractSection`, `extractBulletSection`, `extractThesisSignal` helpers
- Updated `mockCompileBriefing()` with new structure

**Epic 3: Workflow Language**
- Updated BriefingCard: thesis signal badges, "Save to Library"/"Skip"/"Edit & Save"
- Updated PendingGovernance: "Needs Your Review" header, stage-aware messaging
- Updated PipelineProgress: "filtered/promising/strategic" zone labels

**Epic 4: Library View**
- Created `LibraryView.tsx` component
- Tab navigation in App.tsx: Processing | Library
- Expand/collapse cards with thesis signal, date
- Filtering by thesis signal (🟢/🔴/⚪) and zone (YELLOW/RED)
- Badge showing saved briefing count

**Epic 5: Threads Sharing**
- Created `ShareButton.tsx` component
- Formats briefing for Threads: emoji, hashtags, truncation, arXiv link
- Integrated in BriefingCard and LibraryView
- Visual feedback: "Copied!" state for 2 seconds
- Only shown when `voice_preset === 'social_post'`

### Files Modified/Created

**Modified:**
- `src/config/voices.ts` - Complete rewrite
- `src/state/types.ts` - Added ThesisSignal, extended DraftBriefing
- `src/services/compiler.ts` - Structured parsing, thesis signals
- `src/components/BriefingCard.tsx` - Thesis badges, share button
- `src/components/PendingGovernance.tsx` - Stage-aware messaging
- `src/components/PipelineProgress.tsx` - Human-friendly labels
- `src/App.tsx` - Tab navigation

**Created:**
- `src/components/LibraryView.tsx` - Research corpus browser
- `src/components/ShareButton.tsx` - Threads sharing

### Verification

- `npm run build` passes
- All 5 commits pushed to `sprint/content-corpus-v1` branch

### Next Action

Sprint complete. Ready for manual testing and PR creation.

---
