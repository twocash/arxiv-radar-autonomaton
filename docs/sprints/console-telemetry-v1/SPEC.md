# Feature: Console Telemetry Surface

## Live Status

| Field | Value |
|-------|-------|
| **Current Phase** | Complete |
| **Status** | ✅ Complete |
| **Blocking Issues** | None |
| **Last Updated** | 2026-03-14T10:30:00Z |
| **Next Action** | N/A |

## Attention Anchor

**We are building:** Human-readable console surface for the telemetry stream
**Success looks like:** Every transition logged with format that makes Toyota concepts visible
**We are NOT:** Changing telemetry storage, adding new state, or modifying the pipeline flow
**Current phase:** Implementation

## Goal

The audit trail IS the learning loop. The telemetry log captures everything but it's buried in localStorage JSONL. The console should be the human-readable surface of that same stream.

One function (`logTransition`), one call site (inside `transition()`), zero new state.

## Non-Goals

- Changing telemetry persistence
- Adding debug panels or UI
- Modifying pipeline flow or guards

## Pattern Check

**Existing pattern to extend:** Console logging already exists (scattered `console.log` calls)
**Canonical home:** New file `src/lib/consoleLog.ts` — dedicated logging module

## Acceptance Criteria

- [x] Single `logTransition()` function in `src/lib/consoleLog.ts`
- [x] Single call site in `transition()` function
- [x] Format makes Toyota concepts visible:
  - `[Andon Gate]` for guard checks
  - `[Pipeline]` for stage transitions
  - `[Jidoka]` for halts
  - `[Kaizen]` for proposals
  - `[Flywheel]` for skill patterns
- [x] Build passes
- [x] E2E tests pass (11/11)

## Log Format Specification

```
[Andon Gate] ✓ START_POLL → telemetry (guard: passed)
[Pipeline]   Telemetry → Loading 7 seed papers
[Andon Gate] ✗ PAPER_CLASSIFIED → HALT (guard: conflicting_thesis)
[Jidoka]     Pipeline halted: Q1 + Q6 contradictory evidence
[Kaizen]     3 options proposed. Awaiting human judgment.
[Andon Gate] ✓ JIDOKA_RESOLVE → recognition resumed
[Flywheel]   Pattern detected: cost-falling (3/3 threshold)
[Flywheel]   Skill promoted: "Auto-archive cost-falling > 0.6"
```

## Implementation Notes

- Use CSS styling for console colors (green ✓, red ✗)
- Prefix width fixed at 13 chars for alignment
- Stage names capitalized (Telemetry, Recognition, etc.)
