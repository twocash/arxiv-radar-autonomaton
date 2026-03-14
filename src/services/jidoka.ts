/**
 * arXiv Radar — Jidoka Service
 *
 * Digital Jidoka: Machines detect abnormalities, humans approve fixes.
 * This is a philosophical position expressed through constraint.
 *
 * @license CC BY 4.0
 */

import type { JidokaEvent, PipelineStage } from '../state/types'
import type { KaizenProposal, KaizenOption } from '../types/app'
import { JIDOKA_TRIGGERS } from '../config/zones'

// =============================================================================
// JIDOKA HALT CREATION
// =============================================================================

export type JidokaTrigger = JidokaEvent['trigger']

/**
 * Create a Jidoka halt event
 *
 * The pipeline doesn't guess. It doesn't retry silently.
 * It halts with full trace and waits for human resolution.
 */
export function createJidokaHalt(
  stage: PipelineStage,
  trigger: JidokaTrigger,
  details: string,
  paperId?: string
): JidokaEvent {
  return {
    id: crypto.randomUUID(),
    stage,
    trigger,
    details,
    paper_id: paperId,
    timestamp: new Date().toISOString(),
    resolved: false,
    resolution: undefined,
  }
}

/**
 * Create a Jidoka halt for low confidence classification
 */
export function createConfidenceHalt(
  confidenceScore: number,
  paperId: string
): JidokaEvent {
  return createJidokaHalt(
    'recognition',
    'confidence_below_threshold',
    `Confidence score ${confidenceScore.toFixed(3)} is below threshold ${JIDOKA_TRIGGERS.confidence_threshold}. Manual classification required.`,
    paperId
  )
}

/**
 * Create a Jidoka halt for conflicting thesis evidence
 */
export function createConflictingThesisHalt(
  matchedTopics: string[],
  paperId: string
): JidokaEvent {
  return createJidokaHalt(
    'recognition',
    'conflicting_thesis',
    `Paper matches contradictory thesis evidence: "${matchedTopics.join('", "')}". This requires human judgment to resolve.`,
    paperId
  )
}

/**
 * Create a Jidoka halt for API failure
 */
export function createApiFailureHalt(
  stage: PipelineStage,
  errorMessage: string
): JidokaEvent {
  return createJidokaHalt(
    stage,
    'api_failure',
    `API call failed: ${errorMessage}. No fallback. No degraded output. Pipeline halted.`
  )
}

/**
 * Create a Jidoka halt for missing API key
 */
export function createMissingApiKeyHalt(): JidokaEvent {
  return createJidokaHalt(
    'recognition',
    'api_failure',
    'No API key configured for Tier 2 classification. Switch to dev mode or provide an API key.'
  )
}

/**
 * Create a Jidoka halt for malformed data
 */
export function createMalformedDataHalt(
  stage: PipelineStage,
  details: string
): JidokaEvent {
  return createJidokaHalt(
    stage,
    'malformed_data',
    `Malformed data received: ${details}. No partial processing. Pipeline halted.`
  )
}

// =============================================================================
// KAIZEN PROPOSALS
// =============================================================================

/**
 * Generate Kaizen proposal options for a Jidoka trigger.
 *
 * Kaizen proposals are INTELLIGENT, CONTEXT-AWARE suggestions.
 * They demonstrate the system understands the domain, not just that
 * something broke. This is the "aha" moment — the system stopped,
 * diagnosed precisely, and proposed a fix only a domain-aware partner would.
 *
 * The distinction: error handling says "something went wrong."
 * Kaizen says "here's what I found, here's why it matters, here's what I'd do."
 */
export function getKaizenOptions(trigger: JidokaTrigger): KaizenOption[] {
  switch (trigger) {
    case 'confidence_below_threshold':
      return [
        {
          label: 'Surface for review as YELLOW — low confidence warrants human eyes',
          action: 'classify:yellow',
          is_recommended: true,
        },
        {
          label: 'Auto-archive as GREEN — likely noise, not worth review time',
          action: 'classify:green',
          is_recommended: false,
        },
        {
          label: 'Escalate to RED — the ambiguity itself may be the signal',
          action: 'classify:red',
          is_recommended: false,
        },
      ]

    case 'conflicting_thesis':
      return [
        {
          label: 'Primary claim is constrained-task superiority → classify as Q1 (gap closing) with Q6 caveat in briefing',
          action: 'resolve:gap-closing',
          is_recommended: true,
        },
        {
          label: 'Limits section is the real signal → classify as Q6 (falsification) for strategic review',
          action: 'resolve:gap-widening',
          is_recommended: false,
        },
        {
          label: 'Both signals are structurally important → RED for deep analysis. This paper may define the Tier 0/1 vs Tier 2/3 boundary.',
          action: 'classify:red',
          is_recommended: false,
        },
      ]

    case 'unknown_entity':
      return [
        {
          label: 'Add to watchlist — new source producing tier-migration-relevant work',
          action: 'watchlist:add',
          is_recommended: true,
        },
        {
          label: 'Not relevant to the six strategic questions — dismiss',
          action: 'watchlist:dismiss',
          is_recommended: false,
        },
      ]

    case 'api_failure':
      return [
        {
          label: 'Run on seed data — Tier 0 classification works without any API. Proves sovereignty.',
          action: 'mode:dev',
          is_recommended: true,
        },
        {
          label: 'Retry the API call',
          action: 'retry',
          is_recommended: false,
        },
      ]

    case 'malformed_data':
      return [
        {
          label: 'Log the malformed payload and skip — the trace preserves the evidence',
          action: 'skip:log',
          is_recommended: true,
        },
        {
          label: 'Retry the fetch — arXiv may have had a transient issue',
          action: 'retry',
          is_recommended: false,
        },
      ]

    default:
      return [
        {
          label: 'Acknowledge and continue',
          action: 'acknowledge',
          is_recommended: true,
        },
      ]
  }
}

/**
 * Generate a Kaizen proposal for a Jidoka halt
 */
export function generateKaizenProposal(halt: JidokaEvent): KaizenProposal {
  const options = getKaizenOptions(halt.trigger)

  const descriptions: Record<JidokaTrigger, string> = {
    confidence_below_threshold: 'The classification model couldn\'t reach a confident assessment. Rather than guessing and routing this paper through the wrong governance path, the pipeline stopped. Low confidence often means the paper sits at the boundary between strategic questions — which is itself useful information.',
    conflicting_thesis: 'This paper contains evidence that BOTH supports and challenges the Ratchet thesis. It demonstrates small models matching large ones on constrained tasks (Q1: gap closing) while explicitly identifying capabilities that may not migrate downward (Q6: gap widening). The pipeline stopped because classifying contradictory thesis evidence autonomously would be irresponsible. This is governance working, not an error.',
    unknown_entity: 'A new author or institution is producing work that scores highly on the strategic questions, but isn\'t on the watchlist. The pipeline stopped to ask: is this a new signal source worth tracking, or noise? Adding them to the watchlist means their future papers get automatic attention.',
    api_failure: 'The Tier 2 API is unreachable. The pipeline stopped — no fallback to degraded output, no cached guess, no silent retry. This is Digital Jidoka: the system tells you exactly what broke instead of pretending everything is fine. Tier 0 classification still works locally.',
    malformed_data: 'The arXiv API returned data the parser couldn\'t handle. Rather than processing partial or corrupted data and producing unreliable classifications, the pipeline stopped. The malformed payload is preserved in the telemetry trace for debugging.',
  }

  return {
    id: crypto.randomUUID(),
    jidoka_event_id: halt.id,
    description: descriptions[halt.trigger],
    options,
  }
}

// =============================================================================
// RESOLUTION HELPERS
// =============================================================================

/**
 * Mark a Jidoka halt as resolved
 */
export function resolveHalt(
  halt: JidokaEvent,
  resolution: string
): JidokaEvent {
  return {
    ...halt,
    resolved: true,
    resolution,
  }
}

/**
 * Check if halt is blocking pipeline progress
 */
export function isBlocking(halt: JidokaEvent): boolean {
  return !halt.resolved
}

/**
 * Get blocking halts from a list
 */
export function getBlockingHalts(halts: JidokaEvent[]): JidokaEvent[] {
  return halts.filter(isBlocking)
}
