/**
 * arXiv Radar — Cognitive Routing Configuration
 * 
 * Maps intents to cognitive tiers and their execution rules.
 * Tier 0 = cached/free, Tier 1 = local model, Tier 2 = cloud API, Tier 3 = apex
 * 
 * The Cognitive Router exists because the Ratchet makes downward migration
 * inevitable. This config makes it a config change instead of a rewrite.
 * 
 * @license CC BY 4.0
 */

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export type CognitiveTier = 0 | 1 | 2 | 3

export interface TierDefinition {
  tier: CognitiveTier
  name: string
  description: string
  cost: 'free' | 'local' | 'api' | 'apex'
  latency: 'instant' | 'fast' | 'moderate' | 'slow'
  model_hint?: string
}

export const TIER_DEFINITIONS: Record<CognitiveTier, TierDefinition> = {
  0: {
    tier: 0,
    name: 'Cached Skills',
    description: 'Keyword matching, lookup tables, cached patterns. Free and instant.',
    cost: 'free',
    latency: 'instant',
  },
  1: {
    tier: 1,
    name: 'Local Inference',
    description: 'Classification, scoring, simple extraction. Runs on consumer hardware.',
    cost: 'local',
    latency: 'fast',
    model_hint: 'Llama-3.2-3B, Phi-4-Mini, Gemma-2-9B, Qwen-2.5-7B',
  },
  2: {
    tier: 2,
    name: 'Cloud API',
    description: 'Briefing compilation, claim extraction, voice rewriting, thesis comparison.',
    cost: 'api',
    latency: 'moderate',
    model_hint: 'Claude Sonnet, GPT-4o-mini',
  },
  3: {
    tier: 3,
    name: 'Apex Cognition',
    description: 'Strategic analysis, tier migration assessment, research synthesis.',
    cost: 'apex',
    latency: 'slow',
    model_hint: 'Claude Opus, GPT-4o',
  },
}

// =============================================================================
// INTENT ROUTING
// =============================================================================

export interface IntentRoute {
  intent: string
  tier: CognitiveTier
  description: string
  zone_constraints?: string[]
  flywheel_target?: CognitiveTier
}

export const INTENT_ROUTES: IntentRoute[] = [
  // -------------------------------------------------------------------------
  // Tier 0 — Cached / Free
  // -------------------------------------------------------------------------
  {
    intent: 'keyword_match',
    tier: 0,
    description: 'Match paper against watched keyword lists',
  },
  {
    intent: 'author_lookup',
    tier: 0,
    description: 'Check if authors are on watchlist',
  },
  {
    intent: 'category_filter',
    tier: 0,
    description: 'Filter by arXiv category',
  },
  {
    intent: 'archive_routine',
    tier: 0,
    description: 'Archive GREEN zone papers without processing',
  },
  {
    intent: 'duplicate_check',
    tier: 0,
    description: 'Check if paper ID already processed',
  },
  {
    intent: 'jidoka_halt',
    tier: 0,
    // The cheapest operation: stop everything
    description: 'Halt pipeline on governance boundary violation. Log failure. Wait for human.',
  },

  // -------------------------------------------------------------------------
  // Tier 1 — Local Model
  // -------------------------------------------------------------------------
  {
    intent: 'relevance_score',
    tier: 1,
    description: 'Score paper relevance against six strategic questions (0-1)',
    flywheel_target: 0,
  },
  {
    intent: 'topic_classify',
    tier: 1,
    description: 'Classify paper into strategic question categories',
    flywheel_target: 0,
  },
  {
    intent: 'significance_assess',
    tier: 1,
    description: 'Assess significance level (routine/significant/breakthrough)',
    flywheel_target: 0,
  },
  {
    intent: 'abstract_extract',
    tier: 1,
    description: 'Extract key claims from abstract',
    flywheel_target: 0,
  },

  // -------------------------------------------------------------------------
  // Tier 2 — Cloud API
  // -------------------------------------------------------------------------
  {
    intent: 'generate_briefing',
    tier: 2,
    description: 'Rewrite abstract in selected voice preset',
    zone_constraints: ['yellow', 'red'],
    flywheel_target: 1,
  },
  {
    intent: 'extract_claims',
    tier: 2,
    description: 'Extract specific technical claims with citations',
    zone_constraints: ['yellow', 'red'],
    flywheel_target: 1,
  },
  {
    intent: 'identify_caveats',
    tier: 2,
    description: 'Identify limitations and caveats — apply contrarian lens',
    zone_constraints: ['yellow', 'red'],
  },
  {
    intent: 'compare_prior_work',
    tier: 2,
    description: 'Compare to related papers in archive',
    zone_constraints: ['yellow', 'red'],
  },
  {
    intent: 'apply_voice',
    tier: 2,
    description: 'Apply voice preset to compiled content',
    flywheel_target: 1,
  },
  {
    intent: 'compare_to_ratchet_projection',
    tier: 2,
    // How does this paper compare to the expected capability trajectory?
    description: 'Compare findings to Ratchet projection timeline',
    zone_constraints: ['yellow', 'red'],
  },
  {
    intent: 'evaluate_deployment_viability',
    tier: 2,
    // Could a practitioner use this on consumer hardware today?
    description: 'Assess whether results are deployable on consumer hardware now',
    zone_constraints: ['yellow', 'red'],
  },
  {
    intent: 'flag_falsification_evidence',
    tier: 2,
    // Does this contradict the Ratchet thesis?
    description: 'Evaluate whether paper provides evidence against the Ratchet trajectory',
    zone_constraints: ['yellow', 'red'],
  },

  // -------------------------------------------------------------------------
  // Tier 3 — Apex (RED zone only)
  // -------------------------------------------------------------------------
  {
    intent: 'assess_tier_migration_impact',
    tier: 3,
    // Does this paper change when a task can move down a tier?
    description: 'Analyze whether findings change tier migration timelines',
    zone_constraints: ['red'],
  },
  {
    intent: 'strategic_implications',
    tier: 3,
    description: 'Analyze strategic implications for the distributed AI thesis',
    zone_constraints: ['red'],
  },
  {
    intent: 'research_synthesis',
    tier: 3,
    description: 'Synthesize findings across multiple papers',
    zone_constraints: ['red'],
  },
  {
    intent: 'trend_analysis',
    tier: 3,
    description: 'Identify emerging trends from recent paper clusters',
    zone_constraints: ['red'],
  },
]

// =============================================================================
// ROUTING HELPERS
// =============================================================================

export function getIntentRoute(intent: string): IntentRoute | undefined {
  return INTENT_ROUTES.find(r => r.intent === intent)
}

export function getIntentsByTier(tier: CognitiveTier): IntentRoute[] {
  return INTENT_ROUTES.filter(r => r.tier === tier)
}

export function canPromoteToTier(intent: string): CognitiveTier | undefined {
  const route = getIntentRoute(intent)
  return route?.flywheel_target
}
