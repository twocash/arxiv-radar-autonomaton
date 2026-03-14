/**
 * arXiv Radar — Flywheel Service
 *
 * Pattern detection and skill promotion engine.
 * The economic proof: promoted skills = fewer API calls.
 *
 * Detection flow:
 * 1. Scan telemetry for recurring pattern_hash values
 * 2. Group by hash, count occurrences in time window
 * 3. If threshold met, create SkillProposal
 * 4. Human approves → Skill promoted → Future matches handled at Tier 0
 *
 * @license CC BY 4.0
 */

import type {
  TelemetryEntry,
  SkillProposal,
  Skill,
  PatternCandidate,
  Settings,
} from '../types/app'
import type { Zone } from '../config/zones'

// Re-export for convenience
export { generatePatternHash, patternsMatch } from '../lib/patternHash'
export { matchSkills } from './classifier'

// =============================================================================
// PATTERN DETECTION
// =============================================================================

/**
 * Scan telemetry for recurring patterns within a time window.
 * Returns candidates that meet the threshold.
 *
 * @param telemetry - Full telemetry log
 * @param windowDays - How far back to look (default: 14)
 * @param threshold - Minimum occurrences to propose (default: 3)
 * @returns Pattern candidates that meet threshold
 */
export function detectCandidates(
  telemetry: TelemetryEntry[],
  windowDays: number = 14,
  threshold: number = 3
): PatternCandidate[] {
  // Calculate window start
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - windowDays)
  const windowStartISO = windowStart.toISOString()

  // Filter to approved classifications within window
  const relevantEntries = telemetry.filter(entry =>
    entry.ts >= windowStartISO &&
    entry.event === 'briefing_approved' &&
    entry.pattern_hash &&
    entry.zone
  )

  // Group by pattern_hash
  const patternGroups = new Map<string, TelemetryEntry[]>()

  for (const entry of relevantEntries) {
    const hash = entry.pattern_hash!
    const group = patternGroups.get(hash) || []
    group.push(entry)
    patternGroups.set(hash, group)
  }

  // Convert groups that meet threshold to candidates
  const candidates: PatternCandidate[] = []

  for (const [hash, entries] of patternGroups) {
    if (entries.length >= threshold) {
      // Sort by timestamp to get first/last seen
      const sorted = [...entries].sort((a, b) => a.ts.localeCompare(b.ts))

      // Extract common data from first entry (all should have same pattern)
      const firstEntry = sorted[0]

      // Aggregate matched keywords and topics from all entries
      // Use Sets to dedupe, then convert back to arrays
      const topicsSet = new Set<string>()
      const keywordsSet = new Set<string>()

      for (const entry of entries) {
        if (entry.matched_topics) {
          entry.matched_topics.forEach(t => topicsSet.add(t))
        }
        if (entry.matched_keywords) {
          entry.matched_keywords.forEach(k => keywordsSet.add(k))
        }
      }

      candidates.push({
        pattern_hash: hash,
        times_seen: entries.length,
        first_seen: sorted[0].ts,
        last_seen: sorted[sorted.length - 1].ts,
        matched_topics: Array.from(topicsSet).sort(),
        matched_keywords: Array.from(keywordsSet).sort(),
        zone: firstEntry.zone as Zone,
        paper_ids: entries.map(e => e.arxiv_id).filter(Boolean) as string[],
      })
    }
  }

  // Sort by times_seen descending
  return candidates.sort((a, b) => b.times_seen - a.times_seen)
}

// =============================================================================
// SKILL PROPOSAL CREATION
// =============================================================================

/**
 * Create a skill proposal from a detected pattern candidate.
 */
export function createSkillProposal(
  candidate: PatternCandidate,
  existingProposals: SkillProposal[] = [],
  existingSkills: Skill[] = []
): SkillProposal | null {
  // Don't propose if already proposed
  if (existingProposals.some(p => p.pattern_hash === candidate.pattern_hash)) {
    return null
  }

  // Don't propose if already a skill
  if (existingSkills.some(s => s.pattern_hash === candidate.pattern_hash)) {
    return null
  }

  // Generate descriptive name from pattern
  const name = generateProposalName(candidate)

  // Determine action based on zone
  const action = determineProposedAction(candidate.zone)

  const proposal: SkillProposal = {
    id: crypto.randomUUID(),
    pattern_hash: candidate.pattern_hash,
    name,
    description: `Detected pattern with ${candidate.times_seen} approvals. Papers matching this pattern can be auto-processed.`,
    matched_keywords: candidate.matched_keywords,
    matched_topics: candidate.matched_topics,
    zone: candidate.zone,
    times_seen: candidate.times_seen,
    first_seen: candidate.first_seen,
    last_seen: candidate.last_seen,
    proposed_action: action,
  }

  return proposal
}

/**
 * Generate human-readable name for a pattern.
 */
function generateProposalName(candidate: PatternCandidate): string {
  const topicPart = candidate.matched_topics.length > 0
    ? candidate.matched_topics.slice(0, 2).join(' + ')
    : 'General'

  const zonePart = candidate.zone === 'green'
    ? 'routine'
    : candidate.zone === 'yellow'
      ? 'notable'
      : 'critical'

  return `Auto-handle ${zonePart} ${topicPart} papers`
}

/**
 * Determine appropriate action based on zone.
 * Green → auto_archive (low signal, skip)
 * Yellow → auto_classify (medium signal, fast-track)
 * Red → auto_brief (high signal, priority processing)
 */
function determineProposedAction(zone: Zone): Skill['action'] {
  switch (zone) {
    case 'green':
      return 'auto_archive'
    case 'yellow':
      return 'auto_classify'
    case 'red':
      return 'auto_brief'
    default:
      return 'auto_classify'
  }
}

// =============================================================================
// SKILL LIFECYCLE
// =============================================================================

/**
 * Convert an approved proposal into a full Skill.
 * Called when user approves a SkillProposal.
 */
export function promoteSkill(proposal: SkillProposal): Skill {
  return {
    id: crypto.randomUUID(),
    pattern_hash: proposal.pattern_hash,
    name: proposal.name,
    matched_keywords: proposal.matched_keywords,
    matched_topics: proposal.matched_topics,
    zone: 'green', // Promoted skills operate in GREEN zone
    threshold: 0.5, // Default threshold
    action: proposal.proposed_action,
    promoted_at: new Date().toISOString(),
    promoted_from: proposal.zone,
    times_fired: 0,
    last_fired: null,
    accuracy: 100, // Starts at 100%
    deprecated: false,
  }
}

/**
 * Create a deprecated skill record.
 * Skills aren't deleted — they're deprecated with a reason.
 */
export function deprecateSkill(skill: Skill, reason: string): Skill {
  return {
    ...skill,
    deprecated: true,
  }
}

// =============================================================================
// FLYWHEEL STATS
// =============================================================================

/**
 * Calculate Flywheel statistics for display.
 */
export function getFlywheelStats(
  skills: Skill[],
  telemetry: TelemetryEntry[],
  settings: Settings
): {
  active_skills: number
  deprecated_skills: number
  total_skill_firings: number
  api_calls_saved: number // Estimated
  patterns_detected: number
  pending_proposals: number
} {
  const activeSkills = skills.filter(s => !s.deprecated)
  const deprecatedSkills = skills.filter(s => s.deprecated)

  // Count total skill firings
  const totalFireings = activeSkills.reduce((sum, s) => sum + s.times_fired, 0)

  // Estimate API calls saved (each firing would have been a Tier 2 call)
  const apiCallsSaved = totalFireings

  // Count patterns that could become skills
  const candidates = detectCandidates(
    telemetry,
    settings.flywheel_window_days,
    settings.flywheel_threshold
  )

  return {
    active_skills: activeSkills.length,
    deprecated_skills: deprecatedSkills.length,
    total_skill_firings: totalFireings,
    api_calls_saved: apiCallsSaved,
    patterns_detected: candidates.length,
    pending_proposals: candidates.length,
  }
}

// =============================================================================
// FLYWHEEL SCAN — Main entry point
// =============================================================================

/**
 * Run a full Flywheel scan after briefing approval.
 * Returns new proposals that should be added to state.
 */
export function runFlywheelScan(
  telemetry: TelemetryEntry[],
  existingProposals: SkillProposal[],
  existingSkills: Skill[],
  settings: Settings
): SkillProposal[] {
  // Detect candidates
  const candidates = detectCandidates(
    telemetry,
    settings.flywheel_window_days,
    settings.flywheel_threshold
  )

  // Convert to proposals (filtering already-proposed/promoted)
  const newProposals: SkillProposal[] = []

  for (const candidate of candidates) {
    const proposal = createSkillProposal(candidate, existingProposals, existingSkills)
    if (proposal) {
      newProposals.push(proposal)
    }
  }

  return newProposals
}
