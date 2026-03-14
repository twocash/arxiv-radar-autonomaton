/**
 * arXiv Radar — Telemetry Service
 *
 * Feed-first telemetry: every interaction generates structured telemetry
 * as its PRIMARY output. This is not logging bolted on the side —
 * it's the mechanism through which the system learns.
 *
 * Telemetry serves triple duty:
 * 1. LEARNING — Feeds the Flywheel for pattern detection
 * 2. OBSERVABILITY — Surfaces system health
 * 3. COMPLIANCE — Produces audit trails
 *
 * @license CC BY 4.0
 */

import type { TelemetryEntry, PipelineStage, Zone, CognitiveTier } from '../types/app'
import { appendTelemetry, loadTelemetry, exportTelemetryAsJsonl } from './persistence'

// =============================================================================
// TELEMETRY CREATION
// =============================================================================

/**
 * Create a telemetry entry with required fields.
 */
export function createTelemetryEntry(
  stage: PipelineStage,
  event: string,
  details?: Partial<Omit<TelemetryEntry, 'ts' | 'stage' | 'event'>>
): TelemetryEntry {
  return {
    ts: new Date().toISOString(),
    stage,
    event,
    ...details,
  }
}

/**
 * Log a telemetry entry (persists to localStorage).
 */
export function logTelemetry(entry: TelemetryEntry): void {
  appendTelemetry(entry)
}

/**
 * Create and log a telemetry entry in one call.
 */
export function log(
  stage: PipelineStage,
  event: string,
  details?: Partial<Omit<TelemetryEntry, 'ts' | 'stage' | 'event'>>
): TelemetryEntry {
  const entry = createTelemetryEntry(stage, event, details)
  logTelemetry(entry)
  return entry
}

// =============================================================================
// STAGE-SPECIFIC LOGGING HELPERS
// =============================================================================

/**
 * Log telemetry stage start.
 */
export function logPollStart(): TelemetryEntry {
  return log('telemetry', 'poll_started')
}

/**
 * Log successful poll completion.
 */
export function logPollComplete(paperCount: number): TelemetryEntry {
  return log('telemetry', 'poll_complete', {
    details: `Fetched ${paperCount} papers`,
  })
}

/**
 * Log poll error.
 */
export function logPollError(error: string): TelemetryEntry {
  return log('telemetry', 'poll_error', {
    details: error,
    jidoka: true,
  })
}

/**
 * Log paper classification.
 */
export function logClassification(
  arxivId: string,
  zone: Zone,
  tier: CognitiveTier,
  patternHash: string,
  skillId?: string
): TelemetryEntry {
  return log('recognition', 'paper_classified', {
    arxiv_id: arxivId,
    zone,
    tier,
    pattern_hash: patternHash,
    skill_id: skillId,
  })
}

/**
 * Log Jidoka halt.
 */
export function logJidokaHalt(
  stage: PipelineStage,
  trigger: string,
  arxivId?: string
): TelemetryEntry {
  return log(stage, 'jidoka_halt', {
    arxiv_id: arxivId,
    jidoka: true,
    details: trigger,
  })
}

/**
 * Log Jidoka resolution.
 */
export function logJidokaResolution(
  eventId: string,
  resolution: string
): TelemetryEntry {
  return log('recognition', 'jidoka_resolved', {
    human_feedback: 'resolved',
    details: `${eventId}: ${resolution}`,
  })
}

/**
 * Log briefing compilation.
 */
export function logCompilation(
  arxivId: string,
  voice: string,
  tier: CognitiveTier,
  costUsd: number,
  patternHash: string
): TelemetryEntry {
  return log('compilation', 'briefing_compiled', {
    arxiv_id: arxivId,
    tier,
    cost_usd: costUsd,
    pattern_hash: patternHash,
    details: `voice: ${voice}`,
  })
}

/**
 * Log briefing approval/rejection.
 */
export function logApproval(
  arxivId: string,
  action: 'approved' | 'rejected' | 'edited',
  zone: Zone,
  patternHash: string
): TelemetryEntry {
  return log('approval', `briefing_${action}`, {
    arxiv_id: arxivId,
    zone,
    pattern_hash: patternHash,
    human_feedback: action,
  })
}

/**
 * Log execution completion.
 */
export function logExecution(
  arxivId: string,
  patternHash: string,
  flywheelCandidates: number
): TelemetryEntry {
  return log('execution', 'archived', {
    arxiv_id: arxivId,
    pattern_hash: patternHash,
    details: `flywheel_candidates: ${flywheelCandidates}`,
  })
}

/**
 * Log skill promotion.
 */
export function logSkillPromotion(
  skillId: string,
  patternHash: string,
  fromZone: Zone
): TelemetryEntry {
  return log('execution', 'skill_promoted', {
    skill_id: skillId,
    pattern_hash: patternHash,
    details: `promoted from ${fromZone} to GREEN`,
  })
}

/**
 * Log skill firing.
 */
export function logSkillFired(
  skillId: string,
  arxivId: string,
  patternHash: string
): TelemetryEntry {
  return log('recognition', 'skill_fired', {
    arxiv_id: arxivId,
    skill_id: skillId,
    pattern_hash: patternHash,
    tier: 0,
  })
}

// =============================================================================
// TELEMETRY QUERIES
// =============================================================================

/**
 * Get all telemetry entries.
 */
export function getTelemetryLog(): TelemetryEntry[] {
  return loadTelemetry()
}

/**
 * Get entries for a specific stage.
 */
export function getEntriesByStage(stage: PipelineStage): TelemetryEntry[] {
  return loadTelemetry().filter(e => e.stage === stage)
}

/**
 * Get entries for a specific pattern hash.
 */
export function getEntriesByPatternHash(patternHash: string): TelemetryEntry[] {
  return loadTelemetry().filter(e => e.pattern_hash === patternHash)
}

/**
 * Get the full provenance chain for a paper.
 * This is the "transparency as architecture" proof:
 * Can an auditor reconstruct any system decision from telemetry alone?
 *
 * Returns all events related to a paper in chronological order:
 * - Classification tier decision
 * - Jidoka halts and resolutions
 * - Compilation cost
 * - Human feedback (approve/reject/edit)
 * - Skill firings
 */
export function getProvenanceChain(arxivId: string): TelemetryEntry[] {
  return loadTelemetry()
    .filter(e => e.arxiv_id === arxivId)
    .sort((a, b) => a.ts.localeCompare(b.ts))
}

/**
 * Get entries within a time window.
 */
export function getEntriesInWindow(days: number): TelemetryEntry[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  return loadTelemetry().filter(e => e.ts >= cutoffIso)
}

/**
 * Count occurrences of a pattern hash within a time window.
 */
export function countPatternOccurrences(
  patternHash: string,
  days: number
): number {
  const entries = getEntriesInWindow(days)
  return entries.filter(
    e => e.pattern_hash === patternHash && e.human_feedback === 'approved'
  ).length
}

/**
 * Get all unique pattern hashes with their counts.
 */
export function getPatternHashCounts(
  days: number
): Map<string, number> {
  const entries = getEntriesInWindow(days).filter(
    e => e.pattern_hash && e.human_feedback === 'approved'
  )

  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (entry.pattern_hash) {
      counts.set(entry.pattern_hash, (counts.get(entry.pattern_hash) || 0) + 1)
    }
  }

  return counts
}

// =============================================================================
// EXPORT
// =============================================================================

export { exportTelemetryAsJsonl }
