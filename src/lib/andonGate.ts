/**
 * THE ANDON GATE
 *
 * Three concepts from Toyota, three roles in the code:
 *
 * JIDOKA (the principle) — Machines detect abnormalities, humans approve fixes.
 *   → See: services/jidoka.ts, state/types.ts (JidokaEvent)
 *
 * ANDON GATE (the mechanism) — THIS FILE. The architectural chokepoint.
 *   Every state transition passes through runAndonGate(). No bypass.
 *   This is what makes Jidoka structural, not aspirational.
 *
 * KAIZEN (the response) — The system proposes the fix, not just the halt.
 *   → See: services/jidoka.ts (generateKaizenProposal), components/JidokaAlert.tsx
 *
 * "Toyoda's andon cord, digitized." — Grove Autonomaton Pattern, Draft 1.3
 *
 * This module provides:
 * 1. Transition validation — Is this transition legal from the current state?
 * 2. Andon Gate — Should this transition halt for human judgment?
 *
 * @license CC BY 4.0
 */

import type { PipelineStage, ArxivRadarAction, JidokaEvent, ArxivPaper, ClassifiedPaper } from '../state/types'
import type { AppState, AppAction } from '../types/app'
import { JIDOKA_TRIGGERS } from '../config/zones'
import { matchKeywords, checkJidoka } from '../services/classifier'
import { createJidokaHalt, createMissingApiKeyHalt } from '../services/jidoka'

// =============================================================================
// TYPES
// =============================================================================

export type CombinedAction = ArxivRadarAction | AppAction

// Type guard for PAPER_CLASSIFIED action
function isPaperClassifiedAction(action: CombinedAction): action is { type: 'PAPER_CLASSIFIED'; paper: ClassifiedPaper } {
  return action.type === 'PAPER_CLASSIFIED'
}

export interface AndonGateResult {
  halt: boolean
  event?: JidokaEvent
}

// =============================================================================
// VALID TRANSITIONS — State machine edges
// =============================================================================

/**
 * Define which actions are valid from which states.
 * This is the state machine's transition table.
 */
const VALID_TRANSITIONS: Record<PipelineStage, string[]> = {
  idle: [
    'START_POLL',
    'SET_STAGE',
    'SETTINGS_UPDATED',
    'STATE_HYDRATED',
    'RESET_STATE',
    // Skill management allowed from idle
    'SKILL_PROPOSAL_CREATED',
    'SKILL_PROPOSAL_APPROVED',
    'SKILL_PROPOSAL_REJECTED',
    'SKILL_DELETED',
    'SKILL_DEPRECATED',
    // Telemetry always allowed
    'TELEMETRY_LOGGED',
    'TELEMETRY_CLEARED',
  ],

  telemetry: [
    'POLL_COMPLETE',
    'POLL_ERROR',
    'SET_STAGE',
    'JIDOKA_HALT',
    'TELEMETRY_LOGGED',
    'RESET_STATE',
  ],

  recognition: [
    'PAPER_CLASSIFIED',
    'PAPER_ARCHIVED',
    'SET_STAGE',
    'JIDOKA_HALT',
    'SKILL_FIRED',
    'TELEMETRY_LOGGED',
    'RESET_STATE',
  ],

  compilation: [
    'BRIEFING_COMPILED',
    'COMPILATION_ERROR',
    'SET_STAGE',
    'JIDOKA_HALT',
    'TELEMETRY_LOGGED',
    'RESET_STATE',
  ],

  approval: [
    'BRIEFING_APPROVED',
    'BRIEFING_REJECTED',
    'BRIEFING_EDITED',
    'SET_STAGE',
    'JIDOKA_HALT',
    'TELEMETRY_LOGGED',
    // Flywheel proposals can appear during approval
    'SKILL_PROPOSAL_CREATED',
    'SKILL_PROPOSAL_APPROVED',
    'SKILL_PROPOSAL_REJECTED',
    'KAIZEN_PROPOSAL_CREATED',
    'KAIZEN_OPTION_SELECTED',
    'RESET_STATE',
  ],

  execution: [
    'SET_STAGE',
    'START_POLL',      // Circuit auto-restart
    'SKILL_PROMOTED',
    'TELEMETRY_LOGGED',
    'RESET_STATE',
  ],
}

// Actions that are ALWAYS valid regardless of state
const UNIVERSAL_ACTIONS = [
  'SETTINGS_UPDATED',
  'TELEMETRY_LOGGED',
  'TELEMETRY_CLEARED',
  'STATE_HYDRATED',
  'JIDOKA_RESOLVE', // Can always resolve a halt
]

/**
 * Check if a transition is valid from the current state.
 */
export function isValidTransition(
  currentStage: PipelineStage,
  action: CombinedAction
): boolean {
  // Universal actions are always valid
  if (UNIVERSAL_ACTIONS.includes(action.type)) {
    return true
  }

  // Check the transition table
  const validActions = VALID_TRANSITIONS[currentStage] ?? []
  return validActions.includes(action.type)
}

// =============================================================================
// JIDOKA GUARDS — Run BEFORE every transition
// =============================================================================

/**
 * Run all Jidoka guards for a given state and action.
 * Returns { halt: true, event } if the transition should be blocked.
 *
 * These guards are STRUCTURAL. They run on every transition.
 * There is no code path that skips them.
 */
export function runAndonGate(
  state: AppState,
  action: CombinedAction
): AndonGateResult {
  // Guard 1: API key required for non-dev mode Tier 2 operations
  if (shouldCheckApiKey(state, action)) {
    if (!state.settings.api_key && !state.settings.dev_mode) {
      return {
        halt: true,
        event: createMissingApiKeyHalt(),
      }
    }
  }

  // Guard 2: Paper classification triggers — handled in Guard 4 below

  // Guard 3: REMOVED — Don't check papers during POLL_COMPLETE
  // Papers should flow into incoming_papers, and Jidoka fires during
  // Recognition when each paper is classified. Blocking POLL_COMPLETE
  // causes papers to be lost entirely.

  // Guard 4: Confidence threshold on classification
  if (isPaperClassifiedAction(action)) {
    // Check confidence threshold
    if (action.paper.relevance_score < JIDOKA_TRIGGERS.confidence_threshold) {
      return {
        halt: true,
        event: createJidokaHalt(
          'recognition',
          'confidence_below_threshold',
          `Confidence ${action.paper.relevance_score.toFixed(3)} below threshold ${JIDOKA_TRIGGERS.confidence_threshold}`,
          action.paper.arxiv_id
        ),
      }
    }

    // Also check for conflicting thesis on the classified paper
    const result = checkPaperJidoka(action.paper)
    if (result.halt) {
      return result
    }
  }

  // No guards triggered
  return { halt: false }
}

/**
 * Check if a paper should trigger Jidoka.
 */
function checkPaperJidoka(paper: ArxivPaper | { arxiv_id: string; matched_topics?: string[] }): AndonGateResult {
  // If paper already has matched_topics (even empty), trust it — this paper
  // was already classified (possibly by human override). Don't re-run
  // keyword matching which would re-trigger Jidoka.
  if ('matched_topics' in paper) {
    // Only check if there are actual topics to check
    if (paper.matched_topics && paper.matched_topics.length > 0) {
      const jidokaCheck = checkJidoka(
        0.5, // Default score for pre-classified
        paper.matched_topics,
        paper.arxiv_id
      )
      if (jidokaCheck.halt && jidokaCheck.event) {
        return { halt: true, event: jidokaCheck.event }
      }
    }
    // Paper has matched_topics (even empty) — trust the classification
    return { halt: false }
  }

  // For raw ArxivPaper without matched_topics, do keyword matching
  if ('abstract' in paper) {
    const keywordMatch = matchKeywords(paper)
    const jidokaCheck = checkJidoka(
      keywordMatch.score,
      keywordMatch.matchedTopics,
      paper.arxiv_id
    )
    if (jidokaCheck.halt && jidokaCheck.event) {
      return { halt: true, event: jidokaCheck.event }
    }
  }

  return { halt: false }
}

/**
 * Check if this action requires an API key.
 */
function shouldCheckApiKey(state: AppState, action: CombinedAction): boolean {
  // Actions that require API key when not in dev mode
  const apiRequiredActions = [
    'BRIEFING_COMPILED', // Compilation uses Tier 2
  ]

  return apiRequiredActions.includes(action.type)
}

// =============================================================================
// STAGE DETERMINATION
// =============================================================================

/**
 * Determine the target stage after an action.
 * Used to validate the transition makes sense.
 */
export function getTargetStage(action: CombinedAction): PipelineStage | null {
  switch (action.type) {
    case 'START_POLL':
      return 'telemetry'
    case 'POLL_COMPLETE':
      return 'recognition'
    case 'PAPER_CLASSIFIED':
      return 'compilation' // Or stay in recognition if more papers
    case 'BRIEFING_COMPILED':
      return 'approval'
    case 'BRIEFING_APPROVED':
      return 'execution'
    case 'JIDOKA_HALT':
      return null // Special state, handled by halt logic
    case 'SET_STAGE':
      return action.stage
    default:
      return null // Action doesn't change stage
  }
}
