/**
 * arXiv Radar — Zone Governance Schema
 * 
 * Defines GREEN/YELLOW/RED zone behavior for paper classification.
 * This is the sovereignty layer — the operator defines what the system
 * can do autonomously. The model cannot override these boundaries.
 * 
 * The zone model is a freedom guarantee, not a traffic light for excitement levels.
 * 
 * @license CC BY 4.0
 */

import { RELEVANCE_THRESHOLDS } from './defaults'

// =============================================================================
// ZONE TYPES
// =============================================================================

export type Zone = 'green' | 'yellow' | 'red'
export type Significance = 'routine' | 'significant' | 'breakthrough'

export interface ZoneDefinition {
  meaning: string
  description: string
  flywheel_eligible: boolean
  allows: string[]
  forbids?: string[]
  requires_approval?: string[]
  requires_human_decision?: boolean
}

export interface ZonesSchema {
  zones: Record<Zone, ZoneDefinition>
}

// =============================================================================
// ZONE SCHEMA
// =============================================================================

export const zonesSchema: ZonesSchema = {
  zones: {
    green: {
      meaning: 'Routine — auto-archive, no human attention needed',
      description: 'Papers that don\'t affect deployment timelines or tier migration. The system handles classification and archival autonomously.',
      flywheel_eligible: true,
      allows: [
        'log_telemetry',
        'archive_paper',
        'update_keyword_stats',
        'execute_cached_skills',
      ],
      forbids: [
        'generate_briefing',
        'send_notification',
        'surface_for_review',
      ],
    },

    yellow: {
      meaning: 'Significant — system proposes, human approves',
      description: 'Papers with tier migration implications or trajectory confirmation. System generates a briefing; human reviews and approves before any action.',
      flywheel_eligible: true,
      allows: [
        'generate_briefing',
        'extract_key_claims',
        'apply_voice_preset',
        'compare_to_archive',
      ],
      requires_approval: [
        'publish_briefing',
        'add_to_digest',
        'send_notification',
        'update_author_watchlist',
      ],
    },

    red: {
      meaning: 'High-consequence — system surfaces information only, human decides',
      description: 'Papers where autonomous action would be irresponsible. Potential tier migration events, Ratchet falsification evidence, or signals requiring strategic judgment. The system surfaces the paper and its implications. The human decides what it means and what to do.',
      flywheel_eligible: false, // Never auto-promote RED zone operations
      allows: [
        'generate_briefing',
        'extract_key_claims',
        'identify_implications',
        'compare_to_prior_art',
        'flag_for_strategic_review',
      ],
      requires_human_decision: true,
      forbids: [
        'auto_archive',
        'batch_process',
        'execute_without_review',
        'promote_to_cached_skill',
      ],
    },
  },
}

// =============================================================================
// JIDOKA TRIGGERS — Digital Jidoka halt conditions
// Governance decisions, not error handling. These live in config, not in code.
// =============================================================================

export const JIDOKA_TRIGGERS = {
  confidence_threshold: 0.25,  // Below this, halt — don't guess
  conflicting_thesis: true,    // Paper matches both "gap closing" and "gap widening"
  unknown_high_signal_entity: true,  // New author/lab with RED-level relevance
  api_failure: true,           // No fallback. No degraded output. Stop.
  malformed_data: true,        // arXiv API returns unexpected structure. Stop.
} as const

// =============================================================================
// ZONE ASSIGNMENT HELPERS
// =============================================================================

export function assignZone(relevanceScore: number, isBreakthrough: boolean): Zone {
  if (isBreakthrough || relevanceScore >= 0.8) {
    return 'red'
  }
  if (relevanceScore >= RELEVANCE_THRESHOLDS.greenMax) {
    return 'yellow'
  }
  return 'green'
}

export function getZoneDefinition(zone: Zone): ZoneDefinition {
  return zonesSchema.zones[zone]
}

export function isActionAllowed(zone: Zone, action: string): boolean {
  const def = zonesSchema.zones[zone]
  if (def.forbids?.includes(action)) return false
  if (def.allows.includes(action)) return true
  if (def.requires_approval?.includes(action)) return true // Allowed but needs approval
  return false
}

export function requiresApproval(zone: Zone, action: string): boolean {
  const def = zonesSchema.zones[zone]
  return def.requires_approval?.includes(action) ?? false
}

export function requiresHumanDecision(zone: Zone): boolean {
  return zonesSchema.zones[zone].requires_human_decision ?? false
}

export function shouldTriggerJidoka(
  confidenceScore: number,
  matchedTopics: string[],
): { halt: boolean; trigger?: string; details?: string } {
  // Confidence below floor
  if (confidenceScore < JIDOKA_TRIGGERS.confidence_threshold) {
    return {
      halt: true,
      trigger: 'confidence_below_threshold',
      details: `Confidence ${confidenceScore} below threshold ${JIDOKA_TRIGGERS.confidence_threshold}. Manual classification required.`,
    }
  }

  // Conflicting thesis evidence — matches both confirming and falsifying topics
  if (
    JIDOKA_TRIGGERS.conflicting_thesis &&
    matchedTopics.includes('gap-closing') &&
    matchedTopics.includes('gap-widening')
  ) {
    return {
      halt: true,
      trigger: 'conflicting_thesis',
      details: 'Paper matches both "gap closing" and "gap widening" — contradictory thesis evidence. Human resolution required.',
    }
  }

  return { halt: false }
}
