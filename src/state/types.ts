/**
 * arXiv Radar — Domain Types
 * 
 * Type definitions for papers, briefings, and application state.
 * 
 * @license CC BY 4.0
 */

import type { Zone, Significance } from '../config/zones'
import type { VoicePresetId } from '../config/voices'
import type { CognitiveTier } from '../config/routing'

// =============================================================================
// PIPELINE STAGES
// =============================================================================

export type PipelineStage = 
  | 'idle'
  | 'telemetry'
  | 'recognition'
  | 'compilation'
  | 'approval'
  | 'execution'

// =============================================================================
// JIDOKA — Digital Jidoka halt events
// Machines detect abnormalities, humans approve fixes.
// =============================================================================

export interface JidokaEvent {
  id: string
  stage: PipelineStage
  trigger: 'confidence_below_threshold' | 'conflicting_thesis' | 'unknown_entity' | 'api_failure' | 'malformed_data' | 'empty_result' | 'invalid_transition'
  details: string
  paper_id?: string
  timestamp: string
  resolved: boolean
  resolution?: string
}

// =============================================================================
// PAPER TYPES
// =============================================================================

/** Raw paper from arXiv API */
export interface ArxivPaper {
  arxiv_id: string
  title: string
  abstract: string
  authors: string[]
  categories: string[]
  published: string // ISO date
  updated: string   // ISO date
  pdf_url: string
  arxiv_url: string
}

/** Paper after classification */
export interface ClassifiedPaper extends ArxivPaper {
  relevance_score: number      // 0-1
  matched_topics: string[]     // Topic IDs from defaults.ts
  matched_keywords: string[]   // Specific keywords found
  significance: Significance   // routine | significant | breakthrough
  zone: Zone                   // green | yellow | red
  pattern_hash: string         // Fingerprint for Flywheel detection (topics + zone + keywords)
  falsification_signal?: boolean // True if paper matches Q6 (gap-widening) — the Honesty Test
  classified_at: string        // ISO timestamp
  classified_by: {
    tier: CognitiveTier
    model?: string
  }
}

// =============================================================================
// BRIEFING TYPES
// =============================================================================

/** Briefing awaiting approval */
export interface DraftBriefing {
  id: string
  paper: ClassifiedPaper
  voice_preset: VoicePresetId
  headline: string
  body: string
  key_claims: string[]
  caveats: string[]
  tier_migration_impact?: string // Assessment of how this affects tier migration timelines
  compiled_at: string
  compiled_by: {
    tier: CognitiveTier
    model: string
    cost_usd?: number
  }
}

/** Briefing after approval */
export interface ApprovedBriefing extends DraftBriefing {
  approved_at: string
  approved_by: 'human' | 'auto'
  edits_made: boolean
  execution_target?: 'notion' | 'log' | 'email'
}

/** Rejected briefing (for analytics) */
export interface RejectedBriefing {
  draft: DraftBriefing
  rejected_at: string
  reason?: string
}

// =============================================================================
// APPLICATION STATE
// =============================================================================

export interface PipelineStatus {
  current_stage: PipelineStage
  is_polling: boolean
  last_poll: string | null
  last_error: string | null
  // One-piece flow tracking
  total_papers_this_cycle: number    // Papers fetched at start of cycle
  current_paper_index: number        // Which paper we're processing (0-based)
}

export interface FlywheelStats {
  tier0_skills: number
  papers_seen: number
  briefings_approved: number
  briefings_rejected: number
  total_api_cost_usd: number
  // Real-time classification tracking for Flywheel economics visibility
  tier0_classifications: number  // Papers classified by T0 (free, instant)
  tier2_classifications: number  // Papers classified by T2 (cloud, costs money)
}

export interface ArxivRadarState {
  pipeline: PipelineStatus
  voice_preset: VoicePresetId
  
  // Queues
  incoming_papers: ArxivPaper[]
  classified_papers: ClassifiedPaper[]
  pending_briefings: DraftBriefing[]
  
  // Archives
  approved_briefings: ApprovedBriefing[]
  archived_papers: ClassifiedPaper[] // GREEN zone auto-archived
  rejected_briefings: RejectedBriefing[]
  
  // Analytics
  stats: FlywheelStats
  
  // Jidoka — pipeline halt events awaiting human resolution
  jidoka_halts: JidokaEvent[]
}

// =============================================================================
// ACTIONS
// =============================================================================

export type ArxivRadarAction =
  // Pipeline control
  | { type: 'START_POLL' }
  | { type: 'POLL_COMPLETE'; papers: ArxivPaper[] }
  | { type: 'POLL_ERROR'; error: string }
  | { type: 'SET_STAGE'; stage: PipelineStage }
  
  // Classification
  | { type: 'PAPER_CLASSIFIED'; paper: ClassifiedPaper; classification_cost_usd?: number }
  | { type: 'PAPER_ARCHIVED'; paper: ClassifiedPaper; classification_cost_usd?: number }
  
  // Compilation
  | { type: 'BRIEFING_COMPILED'; briefing: DraftBriefing }
  | { type: 'COMPILATION_ERROR'; paperId: string; error: string }
  
  // Approval flow
  | { type: 'BRIEFING_APPROVED'; briefingId: string; edits?: Partial<DraftBriefing> }
  | { type: 'BRIEFING_REJECTED'; briefingId: string; reason?: string }
  | { type: 'BRIEFING_EDITED'; briefingId: string; changes: Partial<DraftBriefing> }
  
  // Config
  | { type: 'SET_VOICE_PRESET'; preset: VoicePresetId }
  
  // Flywheel
  | { type: 'SKILL_PROMOTED'; intent: string; fromTier: CognitiveTier; toTier: CognitiveTier }
  
  // Jidoka — pipeline halt and resolution
  | { type: 'JIDOKA_HALT'; event: JidokaEvent }
  | { type: 'JIDOKA_RESOLVE'; eventId: string; resolution: string }
  
  // Execution
  | { type: 'EXECUTION_COMPLETE' }

  // Reset
  | { type: 'CLEAR_QUEUES' }
  | { type: 'RESET_STATE' }

// =============================================================================
// INITIAL STATE
// =============================================================================

export const INITIAL_STATE: ArxivRadarState = {
  pipeline: {
    current_stage: 'idle',
    is_polling: false,
    last_poll: null,
    last_error: null,
    total_papers_this_cycle: 0,
    current_paper_index: 0,
  },
  voice_preset: 'quick_scan',
  incoming_papers: [],
  classified_papers: [],
  pending_briefings: [],
  approved_briefings: [],
  archived_papers: [],
  rejected_briefings: [],
  jidoka_halts: [],
  stats: {
    tier0_skills: 0,
    papers_seen: 0,
    briefings_approved: 0,
    briefings_rejected: 0,
    total_api_cost_usd: 0,
    tier0_classifications: 0,
    tier2_classifications: 0,
  },
}
