/**
 * arXiv Radar — Extended Application Types
 *
 * Types that extend the bundle's core types with Flywheel, Telemetry,
 * and Settings required by the Autonomaton Pattern.
 *
 * @license CC BY 4.0
 */

import type {
  ArxivRadarState,
  PipelineStage,
  ClassifiedPaper,
} from '../state/types'
import type { Zone } from '../config/zones'
import type { CognitiveTier } from '../config/routing'

// =============================================================================
// SKILL — Promoted pattern from Flywheel
// A skill is a declarative artifact — inspectable, editable, deletable
// =============================================================================

export interface Skill {
  id: string
  pattern_hash: string
  name: string                      // Human-readable: "Auto-approve quantization papers > 0.6"
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone                        // What zone this skill operates in (GREEN after promotion)
  threshold: number                 // Minimum relevance score
  action: 'auto_archive' | 'auto_classify' | 'auto_brief'
  promoted_at: string               // ISO timestamp
  promoted_from: Zone               // Was YELLOW, now GREEN
  times_fired: number               // How many times it's executed
  last_fired: string | null
  accuracy: number                  // % of times the human didn't override
  deprecated: boolean
}

// =============================================================================
// SKILL PROPOSAL — Flywheel detection candidate
// =============================================================================

export interface SkillProposal {
  id: string
  pattern_hash: string
  name: string
  description: string
  matched_keywords: string[]
  matched_topics: string[]
  zone: Zone
  times_seen: number
  first_seen: string
  last_seen: string
  proposed_action: Skill['action']
}

// =============================================================================
// TELEMETRY — Feed-first logging
// Every interaction generates structured telemetry as its PRIMARY output
// =============================================================================

export interface TelemetryEntry {
  ts: string                        // ISO timestamp
  stage: PipelineStage              // Which pipeline stage
  event: string                     // What happened
  arxiv_id?: string
  intent?: string
  tier?: CognitiveTier
  zone?: Zone
  pattern_hash?: string             // Groups similar interactions for Flywheel detection
  matched_topics?: string[]         // For Flywheel skill proposals
  matched_keywords?: string[]       // For Flywheel skill proposals
  confidence?: number
  cost_usd?: number
  human_feedback?: 'approved' | 'rejected' | 'edited' | 'resolved'
  jidoka?: boolean
  skill_id?: string                 // If handled by a promoted skill
  details?: string
}

// =============================================================================
// KAIZEN — Proposals attached to Jidoka halts
// The system doesn't just stop — it proposes the fix
// =============================================================================

export interface KaizenProposal {
  id: string
  jidoka_event_id: string
  description: string
  options: KaizenOption[]
}

export interface KaizenOption {
  label: string
  action: string                    // Interpretable action string
  is_recommended: boolean
}

// =============================================================================
// SETTINGS — User configuration
// =============================================================================

export interface Settings {
  api_key: string | null
  ollama_url: string
  dev_mode: boolean
  flywheel_threshold: number        // How many approvals before proposing skill (default: 3)
  flywheel_window_days: number      // Time window for pattern detection (default: 14)
}

export const DEFAULT_SETTINGS: Settings = {
  api_key: null,
  ollama_url: 'http://localhost:11434',
  dev_mode: true,
  flywheel_threshold: 3,
  flywheel_window_days: 14,
}

// =============================================================================
// EXTENDED APP STATE
// Extends bundle's ArxivRadarState with Flywheel, Telemetry, Settings
// =============================================================================

export interface AppState extends ArxivRadarState {
  skills: Skill[]
  skill_proposals: SkillProposal[]
  telemetry_log: TelemetryEntry[]
  kaizen_proposals: KaizenProposal[]
  settings: Settings
}

// =============================================================================
// EXTENDED INITIAL STATE
// =============================================================================

export const INITIAL_APP_STATE: Omit<AppState, keyof ArxivRadarState> = {
  skills: [],
  skill_proposals: [],
  telemetry_log: [],
  kaizen_proposals: [],
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// EXTENDED ACTIONS
// Actions beyond the bundle's ArxivRadarAction
// =============================================================================

export type AppAction =
  // Skills
  | { type: 'SKILL_PROPOSAL_CREATED'; proposal: SkillProposal }
  | { type: 'SKILL_PROPOSAL_APPROVED'; proposalId: string }
  | { type: 'SKILL_PROPOSAL_REJECTED'; proposalId: string }
  | { type: 'SKILL_FIRED'; skillId: string; paperId: string }
  | { type: 'SKILL_DEPRECATED'; skillId: string; reason: string }
  | { type: 'SKILL_DELETED'; skillId: string }

  // Telemetry
  | { type: 'TELEMETRY_LOGGED'; entry: TelemetryEntry }
  | { type: 'TELEMETRY_CLEARED' }

  // Kaizen
  | { type: 'KAIZEN_PROPOSAL_CREATED'; proposal: KaizenProposal }
  | { type: 'KAIZEN_OPTION_SELECTED'; proposalId: string; optionAction: string }

  // Settings
  | { type: 'SETTINGS_UPDATED'; settings: Partial<Settings> }

  // Hydration
  | { type: 'STATE_HYDRATED'; state: AppState }

// =============================================================================
// FLYWHEEL STATS — For FlywheelFooter display
// =============================================================================

export interface FlywheelDisplayStats {
  tier0_skills: number
  tier2_model: string
  tier2_cost: number
  papers_seen: number
  briefings_approved: number
  skills_promoted: number
  migrations_this_session: number
  // Defensible savings: skill executions × avg briefing cost
  skill_executions: number      // Total times skills fired (avoided T2 calls)
  estimated_savings: number     // USD saved by skill executions
}

// =============================================================================
// PATTERN CANDIDATE — Intermediate type for Flywheel detection
// =============================================================================

export interface PatternCandidate {
  pattern_hash: string
  times_seen: number
  first_seen: string
  last_seen: string
  matched_topics: string[]
  matched_keywords: string[]
  zone: Zone
  paper_ids: string[]
}

// =============================================================================
// RE-EXPORTS for convenience
// =============================================================================

export type {
  ArxivRadarState,
  ArxivRadarAction,
  ArxivPaper,
  ClassifiedPaper,
  DraftBriefing,
  ApprovedBriefing,
  RejectedBriefing,
  JidokaEvent,
  PipelineStage,
  PipelineStatus,
  FlywheelStats,
} from '../state/types'

export type { Zone, Significance } from '../config/zones'
export type { CognitiveTier } from '../config/routing'
export type { VoicePresetId } from '../config/voices'
