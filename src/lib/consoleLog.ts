/**
 * CONSOLE TELEMETRY SURFACE
 *
 * "The audit trail is the learning loop. They are the same thing."
 * — Grove Autonomaton Pattern, Draft 1.3
 *
 * The telemetry log captures everything in localStorage JSONL.
 * This module is the human-readable surface of that same stream.
 *
 * One function (logTransition), one call site (transition()),
 * every stage, every guard check, every halt, every resolution.
 *
 * The naming IS the documentation. Someone watching this console sees:
 * - [Andon Gate] — Every transition passes through the gate
 * - [Pipeline]   — Stage transitions and processing
 * - [Jidoka]     — Halts with reason
 * - [Kaizen]     — Proposals awaiting human judgment
 * - [Flywheel]   — Pattern detection and skill promotion
 *
 * @license CC BY 4.0
 */

import type { PipelineStage, JidokaEvent, ClassifiedPaper } from '../state/types'
import type { CombinedAction, AndonGateResult } from './andonGate'
import type { AppState } from '../types/app'

// =============================================================================
// CONSOLE STYLING
// =============================================================================

const STYLES = {
  andonPass: 'color: #22c55e; font-weight: bold', // green
  andonHalt: 'color: #ef4444; font-weight: bold', // red
  pipeline: 'color: #3b82f6',                      // blue
  jidoka: 'color: #f97316; font-weight: bold',     // orange
  kaizen: 'color: #a855f7',                        // purple
  flywheel: 'color: #14b8a6',                      // teal
  dim: 'color: #6b7280',                           // gray
}

// Fixed-width prefix for alignment (13 chars)
const PREFIX = {
  andon: '[Andon Gate] ',
  pipeline: '[Pipeline]   ',
  jidoka: '[Jidoka]     ',
  kaizen: '[Kaizen]     ',
  flywheel: '[Flywheel]   ',
}

// =============================================================================
// STAGE FORMATTING
// =============================================================================

function capitalize(stage: PipelineStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}

function formatZone(zone: string): string {
  const colors: Record<string, string> = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  }
  return colors[zone] || zone
}

// =============================================================================
// MAIN LOGGING FUNCTION
// =============================================================================

export interface TransitionLogContext {
  action: CombinedAction
  state: AppState
  gateResult: AndonGateResult
  targetStage?: PipelineStage | null
}

/**
 * Log a transition through the Andon Gate.
 *
 * Called once per transition() call. Formats output to make
 * the Toyota concepts visible in real time.
 */
export function logTransition(ctx: TransitionLogContext): void {
  const { action, state, gateResult, targetStage } = ctx
  const currentStage = state.pipeline.current_stage

  // 1. ANDON GATE LINE — Every transition passes through
  if (gateResult.halt && gateResult.event) {
    logAndonHalt(action, gateResult.event)
  } else {
    logAndonPass(action, currentStage, targetStage)
  }

  // 2. ACTION-SPECIFIC LINES
  logActionDetails(action, state, gateResult)
}

/**
 * Log when Andon Gate passes the transition.
 */
function logAndonPass(
  action: CombinedAction,
  currentStage: PipelineStage,
  targetStage?: PipelineStage | null
): void {
  const target = targetStage ? capitalize(targetStage) : currentStage
  const guardInfo = '(guard: passed)'

  console.log(
    `%c${PREFIX.andon}%c✓ ${action.type} → ${target} %c${guardInfo}`,
    STYLES.andonPass,
    STYLES.pipeline,
    STYLES.dim
  )
}

/**
 * Log when Andon Gate halts the transition.
 */
function logAndonHalt(action: CombinedAction, event: JidokaEvent): void {
  console.log(
    `%c${PREFIX.andon}%c✗ ${action.type} → HALT %c(guard: ${event.trigger})`,
    STYLES.andonHalt,
    STYLES.andonHalt,
    STYLES.dim
  )
}

/**
 * Log action-specific details after the Andon Gate line.
 */
function logActionDetails(
  action: CombinedAction,
  state: AppState,
  gateResult: AndonGateResult
): void {
  switch (action.type) {
    // Pipeline flow
    case 'START_POLL':
      console.log(
        `%c${PREFIX.pipeline}%cIdle → Starting poll cycle`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    case 'POLL_COMPLETE':
      console.log(
        `%c${PREFIX.pipeline}%cTelemetry → POLL_COMPLETE (${action.papers.length} papers)`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    case 'PAPER_CLASSIFIED': {
      const paper = action.paper as ClassifiedPaper
      const total = state.incoming_papers.length + state.classified_papers.length + 1
      const done = state.classified_papers.length + 1
      console.log(
        `%c${PREFIX.pipeline}%cRecognition → Classified ${done}/${total}: ${paper.arxiv_id} ${formatZone(paper.zone)}`,
        STYLES.pipeline,
        STYLES.dim
      )
      break
    }

    case 'PAPER_ARCHIVED': {
      const paper = action.paper as ClassifiedPaper
      console.log(
        `%c${PREFIX.pipeline}%cRecognition → Archived: ${paper.arxiv_id} (green zone)`,
        STYLES.pipeline,
        STYLES.dim
      )
      break
    }

    case 'BRIEFING_COMPILED':
      console.log(
        `%c${PREFIX.pipeline}%cCompilation → Briefing ready: "${action.briefing.headline.slice(0, 40)}..."`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    case 'BRIEFING_APPROVED':
      console.log(
        `%c${PREFIX.pipeline}%cApproval → Briefing approved: ${action.briefingId}`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    case 'BRIEFING_REJECTED':
      console.log(
        `%c${PREFIX.pipeline}%cApproval → Briefing rejected: ${action.briefingId}`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    // Jidoka
    case 'JIDOKA_HALT':
      console.log(
        `%c${PREFIX.jidoka}%cPipeline halted: ${action.event.details}`,
        STYLES.jidoka,
        STYLES.dim
      )
      break

    case 'JIDOKA_RESOLVE':
      console.log(
        `%c${PREFIX.andon}%c✓ JIDOKA_RESOLVE → Pipeline resumed %c(resolution: ${action.resolution})`,
        STYLES.andonPass,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    // Kaizen
    case 'KAIZEN_PROPOSAL_CREATED': {
      const optionCount = action.proposal.options.length
      console.log(
        `%c${PREFIX.kaizen}%c${optionCount} options proposed. Awaiting human judgment.`,
        STYLES.kaizen,
        STYLES.dim
      )
      break
    }

    case 'KAIZEN_OPTION_SELECTED':
      console.log(
        `%c${PREFIX.kaizen}%cHuman selected: ${action.optionAction}`,
        STYLES.kaizen,
        STYLES.dim
      )
      break

    // Flywheel / Skills
    case 'SKILL_PROPOSAL_CREATED':
      console.log(
        `%c${PREFIX.flywheel}%cPattern detected: ${action.proposal.pattern_hash} (threshold met). Proposing skill.`,
        STYLES.flywheel,
        STYLES.dim
      )
      break

    case 'SKILL_PROPOSAL_APPROVED':
      console.log(
        `%c${PREFIX.flywheel}%cSkill approved: ${action.proposalId}`,
        STYLES.flywheel,
        STYLES.dim
      )
      break

    case 'SKILL_FIRED': {
      const skill = state.skills.find(s => s.id === action.skillId)
      const skillName = skill?.name || action.skillId
      console.log(
        `%c${PREFIX.flywheel}%cSkill fired: "${skillName}" on ${action.paperId}`,
        STYLES.flywheel,
        STYLES.dim
      )
      break
    }

    case 'SKILL_PROMOTED':
      console.log(
        `%c${PREFIX.flywheel}%cSkill promoted: "${action.intent}" T${action.fromTier} → T${action.toTier}`,
        STYLES.flywheel,
        STYLES.dim
      )
      break

    // Settings & Hydration (quiet)
    case 'SETTINGS_UPDATED':
    case 'STATE_HYDRATED':
    case 'TELEMETRY_LOGGED':
    case 'TELEMETRY_CLEARED':
      // Silent — these are internal bookkeeping
      break

    // Stage changes
    case 'SET_STAGE':
      console.log(
        `%c${PREFIX.pipeline}%cStage → ${capitalize(action.stage)}`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    // Reset
    case 'RESET_STATE':
      console.log(
        `%c${PREFIX.pipeline}%cState reset to initial`,
        STYLES.pipeline,
        STYLES.dim
      )
      break

    default:
      // Catch-all for any unhandled action types
      console.log(
        `%c${PREFIX.pipeline}%c${action.type}`,
        STYLES.pipeline,
        STYLES.dim
      )
  }

  // Log Jidoka details separately when halt occurs (after KAIZEN_PROPOSAL_CREATED)
  if (gateResult.halt && gateResult.event) {
    console.log(
      `%c${PREFIX.jidoka}%cPipeline halted: ${gateResult.event.details}`,
      STYLES.jidoka,
      STYLES.dim
    )
  }
}

/**
 * Log an invalid transition attempt.
 */
export function logInvalidTransition(
  currentStage: PipelineStage,
  action: CombinedAction
): void {
  console.log(
    `%c${PREFIX.andon}%c✗ INVALID: ${action.type} not allowed from ${capitalize(currentStage)}`,
    STYLES.andonHalt,
    STYLES.dim
  )
}
