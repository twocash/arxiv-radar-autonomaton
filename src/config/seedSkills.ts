/**
 * Seed Skills — Pre-launch Training
 *
 * PROVENANCE: On 3/15/2026, we ran 100 papers through this Autonomaton to
 * analyze patterns and surface skills & governance recommendations.
 *
 * WHY SEED SKILLS MATTER:
 * By driving skills down tiers (T2 → T1 → T0), you:
 * - Save money (T0 is free, T2 costs API calls)
 * - Increase sovereignty (your patterns, your rules)
 * - REDUCE dependency on API-first providers
 *
 * This is the Flywheel: human approvals → pattern detection → skill
 * promotion → future savings. The ratchet only turns one direction.
 *
 * Source: 100 papers, pre-launch session (2026-03-15)
 * Method: Autonomaton pattern frequency analysis
 * Threshold: 3+ approvals of same pattern_hash
 *
 * @license CC BY 4.0
 */

import type { Skill } from '../types/app'

/**
 * The "cost_falling" pattern was approved 5 times in the source session.
 * Papers matching this pattern discuss efficiency improvements, quantization,
 * and cost reduction — core signals for the decentralized AI thesis.
 *
 * When this skill fires, it auto-classifies matching papers, avoiding
 * a T2 (cloud) API call. The savings accumulate in the footer.
 */
const COST_FALLING_SKILL: Skill = {
  id: 'seed-cost-falling-001',
  pattern_hash: 'Y29zdF9mYWxs', // base64 of "cost_fall"
  name: 'Efficiency & cost research (pre-launch training)',
  matched_keywords: [
    'efficiency',
    'acceleration',
    'scaling',
    'lightweight',
    'quantization',
    'FP4',
    'consumer GPU',
    'on-premise',
    'local deployment',
    'redundancy elimination',
  ],
  matched_topics: ['cost_falling', 'gap_closing'],
  zone: 'yellow',
  threshold: 0.5,
  action: 'auto_classify',
  promoted_at: '2026-03-15T00:30:00.000Z',
  promoted_from: 'yellow',
  times_fired: 0, // Starts fresh — savings accumulate as it fires
  last_fired: null,
  accuracy: 1.0, // 5/5 approvals in source data
  deprecated: false,
}

/**
 * Seed skills to include in initial state.
 * These ship with the demo to show the Flywheel value immediately.
 */
export const SEED_SKILLS: Skill[] = [
  COST_FALLING_SKILL,
]

/**
 * Provenance metadata for disclosure in UI or documentation.
 */
export const SEED_SKILLS_PROVENANCE = {
  source: 'Pre-launch training session (2026-03-15)',
  papers_analyzed: 100,
  method: 'Autonomaton pattern frequency analysis',
  threshold: '3+ approvals',
  skills_extracted: 1,
  disclosure: `On 3/15, we ran 100 papers through this Autonomaton to analyze patterns
and surface skills & governance recommendations. By driving skills down tiers, you
save money and increase sovereignty — REDUCE dependency on API-first providers.`,
}
