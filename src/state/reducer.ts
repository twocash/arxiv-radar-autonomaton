/**
 * arXiv Radar — State Reducer
 * 
 * Pure state machine for the Autonomaton pipeline.
 * 
 * @license CC BY 4.0
 */

import type { 
  ArxivRadarState, 
  ArxivRadarAction,
  DraftBriefing,
  ApprovedBriefing,
  RejectedBriefing,
  JidokaEvent,
} from './types'
import { INITIAL_STATE } from './types'

export function reducer(state: ArxivRadarState, action: ArxivRadarAction): ArxivRadarState {
  switch (action.type) {
    // =========================================================================
    // PIPELINE CONTROL
    // =========================================================================
    
    case 'START_POLL':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          current_stage: 'telemetry',
          is_polling: true,
          last_error: null,
        },
      }

    case 'POLL_COMPLETE': {
      // Filter out papers we've already processed (archived or briefed)
      const seenIds = new Set([
        ...state.archived_papers.map(p => p.arxiv_id),
        ...state.approved_briefings.map(b => b.paper.arxiv_id),
        ...state.rejected_briefings.map(r => r.draft.paper.arxiv_id),
      ])
      const newPapers = action.papers.filter(p => !seenIds.has(p.arxiv_id))

      // If no new papers, stay in idle (circuit waits for next poll)
      if (newPapers.length === 0) {
        return {
          ...state,
          pipeline: {
            ...state.pipeline,
            current_stage: 'idle',
            is_polling: false,
            last_poll: new Date().toISOString(),
          },
        }
      }

      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          current_stage: 'recognition',
          is_polling: false,
          last_poll: new Date().toISOString(),
        },
        incoming_papers: newPapers,
        stats: {
          ...state.stats,
          papers_seen: state.stats.papers_seen + newPapers.length,
        },
      }
    }

    case 'POLL_ERROR':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          current_stage: 'idle',
          is_polling: false,
          last_error: action.error,
        },
      }

    case 'SET_STAGE':
      return {
        ...state,
        pipeline: { ...state.pipeline, current_stage: action.stage },
      }

    // =========================================================================
    // CLASSIFICATION
    // =========================================================================
    
    case 'PAPER_CLASSIFIED':
      return {
        ...state,
        classified_papers: [...state.classified_papers, action.paper],
        incoming_papers: state.incoming_papers.filter(
          p => p.arxiv_id !== action.paper.arxiv_id
        ),
      }

    case 'PAPER_ARCHIVED':
      return {
        ...state,
        archived_papers: [...state.archived_papers, action.paper],
        // Remove from both queues — paper may come from either incoming (direct archive)
        // or classified (post-briefing archive)
        incoming_papers: state.incoming_papers.filter(
          p => p.arxiv_id !== action.paper.arxiv_id
        ),
        classified_papers: state.classified_papers.filter(
          p => p.arxiv_id !== action.paper.arxiv_id
        ),
      }

    // =========================================================================
    // COMPILATION
    // =========================================================================
    
    case 'BRIEFING_COMPILED':
      return {
        ...state,
        pending_briefings: [...state.pending_briefings, action.briefing],
        classified_papers: state.classified_papers.filter(
          p => p.arxiv_id !== action.briefing.paper.arxiv_id
        ),
        pipeline: { ...state.pipeline, current_stage: 'approval' },
        stats: {
          ...state.stats,
          total_api_cost_usd: state.stats.total_api_cost_usd + 
            (action.briefing.compiled_by.cost_usd ?? 0),
        },
      }

    case 'COMPILATION_ERROR':
      // Log error but continue processing other papers
      console.error(`Compilation failed for ${action.paperId}: ${action.error}`)
      return state

    // =========================================================================
    // APPROVAL FLOW
    // =========================================================================
    
    case 'BRIEFING_APPROVED': {
      const draft = state.pending_briefings.find(b => b.id === action.briefingId)
      if (!draft) return state

      const approved: ApprovedBriefing = {
        ...draft,
        ...(action.edits ?? {}),
        approved_at: new Date().toISOString(),
        approved_by: 'human',
        edits_made: !!action.edits,
      }

      const remainingPending = state.pending_briefings.filter(b => b.id !== action.briefingId)

      // Determine next stage:
      // - More briefings to approve → stay in approval
      // - No more pending, but papers still need briefings → back to compilation
      // - All done → execution
      const papersWithBriefings = new Set([
        ...remainingPending.map(b => b.paper.arxiv_id),
        ...state.approved_briefings.map(b => b.paper.arxiv_id),
        draft.paper.arxiv_id, // The one we just approved
      ])
      const papersNeedingBriefings = state.classified_papers.filter(
        p => !papersWithBriefings.has(p.arxiv_id)
      )

      let nextStage: 'approval' | 'compilation' | 'execution' = 'execution'
      if (remainingPending.length > 0) {
        nextStage = 'approval'
      } else if (papersNeedingBriefings.length > 0) {
        nextStage = 'compilation'
      }

      return {
        ...state,
        pending_briefings: remainingPending,
        approved_briefings: [...state.approved_briefings, approved],
        pipeline: { ...state.pipeline, current_stage: nextStage },
        stats: {
          ...state.stats,
          briefings_approved: state.stats.briefings_approved + 1,
        },
      }
    }

    case 'BRIEFING_REJECTED': {
      const draft = state.pending_briefings.find(b => b.id === action.briefingId)
      if (!draft) return state

      const rejected: RejectedBriefing = {
        draft,
        rejected_at: new Date().toISOString(),
        reason: action.reason,
      }

      const remainingPending = state.pending_briefings.filter(b => b.id !== action.briefingId)

      // Determine next stage (same logic as BRIEFING_APPROVED)
      const papersWithBriefings = new Set([
        ...remainingPending.map(b => b.paper.arxiv_id),
        ...state.approved_briefings.map(b => b.paper.arxiv_id),
        ...state.rejected_briefings.map(r => r.draft.paper.arxiv_id),
        draft.paper.arxiv_id, // The one we just rejected
      ])
      const papersNeedingBriefings = state.classified_papers.filter(
        p => !papersWithBriefings.has(p.arxiv_id)
      )

      let nextStage: 'approval' | 'compilation' | 'execution' = 'execution'
      if (remainingPending.length > 0) {
        nextStage = 'approval'
      } else if (papersNeedingBriefings.length > 0) {
        nextStage = 'compilation'
      }

      return {
        ...state,
        pending_briefings: remainingPending,
        rejected_briefings: [...state.rejected_briefings, rejected],
        pipeline: { ...state.pipeline, current_stage: nextStage },
        stats: {
          ...state.stats,
          briefings_rejected: state.stats.briefings_rejected + 1,
        },
      }
    }

    case 'BRIEFING_EDITED':
      return {
        ...state,
        pending_briefings: state.pending_briefings.map(b =>
          b.id === action.briefingId ? { ...b, ...action.changes } : b
        ),
      }

    // =========================================================================
    // CONFIG
    // =========================================================================
    
    case 'SET_VOICE_PRESET':
      return { ...state, voice_preset: action.preset }

    // =========================================================================
    // FLYWHEEL
    // =========================================================================
    
    case 'SKILL_PROMOTED':
      console.log(`Skill promoted: ${action.intent} from T${action.fromTier} to T${action.toTier}`)
      return {
        ...state,
        stats: {
          ...state.stats,
          tier0_skills: action.toTier === 0 
            ? state.stats.tier0_skills + 1 
            : state.stats.tier0_skills,
        },
      }

    // =========================================================================
    // JIDOKA — Pipeline halt and resolution
    // =========================================================================
    
    case 'JIDOKA_HALT':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          current_stage: action.event.stage,
          last_error: action.event.details,
        },
        jidoka_halts: [...state.jidoka_halts, action.event],
      }

    case 'JIDOKA_RESOLVE': {
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          // Leave current_stage where it is — the operator decides what happens next
          last_error: null,
        },
        jidoka_halts: state.jidoka_halts.map(e =>
          e.id === action.eventId
            ? { ...e, resolved: true, resolution: action.resolution }
            : e
        ),
      }
    }

    // =========================================================================
    // RESET
    // =========================================================================
    
    case 'CLEAR_QUEUES':
      return {
        ...state,
        incoming_papers: [],
        classified_papers: [],
        pending_briefings: [],
      }

    case 'RESET_STATE':
      return INITIAL_STATE

    default:
      return state
  }
}

export { INITIAL_STATE }
