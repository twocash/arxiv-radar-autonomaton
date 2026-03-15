/**
 * arXiv Radar — Autonomaton Hook
 *
 * The Single Pipeline Orchestrator — the "thin waist" of the hourglass.
 *
 * This hook implements the core Autonomaton pattern:
 * - `dispatch` is PRIVATE. It is not exposed.
 * - `transition()` is the ONLY way to change state.
 * - The Andon Gate runs on EVERY transition. There is no bypass.
 * - Telemetry logs automatically on every transition (Feed-First).
 *
 * "Three files and a loop" — transition() IS the loop.
 *
 * @license CC BY 4.0
 */

import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react'
import { createContext, useContext } from 'react'
import { reducer as bundleReducer } from '../state/reducer'
import type {
  AppState,
  AppAction,
  ArxivRadarAction,
  Skill,
  Settings,
  FlywheelDisplayStats,
  TelemetryEntry,
} from '../types/app'
import type { JidokaEvent, ClassifiedPaper, ArxivPaper } from '../state/types'
import type { Zone } from '../config/zones'
import { generatePatternHash } from '../lib/patternHash'
import { INITIAL_APP_STATE, DEFAULT_SETTINGS } from '../types/app'
import { INITIAL_STATE } from '../state/types'
import { usePersistedState, getHydratedInitialState } from './usePersistedState'
import {
  isValidTransition,
  runAndonGate,
  getTargetStage,
  type CombinedAction,
} from '../lib/andonGate'
import { logTransition, logInvalidTransition } from '../lib/consoleLog'
import * as telemetry from '../services/telemetry'
import { generateKaizenProposal } from '../services/jidoka'
import { runFlywheelScan } from '../services/flywheel'
import { loadSeedPapers, fetchArxivPapers } from '../services/arxiv'
import { ARXIV_CATEGORIES, ARXIV_CONFIG } from '../config/defaults'
import { classifyPaper as classifyPaperService } from '../services/classifier'
import { compileBriefing, mockCompileBriefing } from '../services/compiler'

// =============================================================================
// HUMAN OVERRIDE HELPER — Apply Jidoka resolution to paper classification
// =============================================================================

/**
 * Apply a human's Jidoka resolution to create a ClassifiedPaper.
 *
 * The human has already made a governance decision via Kaizen options.
 * This function translates that decision into a classification.
 *
 * @param paper - The original ArxivPaper that triggered Jidoka
 * @param resolution - The human's selected action (e.g., 'resolve:gap-closing')
 * @returns ClassifiedPaper with human's decision applied
 */
function applyHumanResolution(
  paper: ArxivPaper,
  resolution: string
): ClassifiedPaper {
  // Parse resolution action to determine zone
  let zone: Zone = 'yellow' // safe default

  if (resolution.startsWith('classify:')) {
    // Direct classification: 'classify:yellow', 'classify:red', 'classify:green'
    zone = resolution.split(':')[1] as Zone
  } else if (resolution === 'resolve:gap-closing') {
    // Q1 paper — confirm the thesis, needs briefing with context
    zone = 'yellow'
  } else if (resolution === 'resolve:gap-widening') {
    // Q6 falsification evidence — strategic review required
    zone = 'red'
  } else if (resolution === 'skip:log' || resolution === 'acknowledge') {
    // Skip/acknowledge = archive without action
    zone = 'green'
  }
  // mode:dev, retry, watchlist:* are operational — don't classify

  return {
    ...paper,
    zone,
    relevance_score: 0.5, // Neutral — human decided, not algorithm
    matched_topics: [],
    matched_keywords: [],
    significance: 'routine', // Human override bypasses significance detection
    pattern_hash: generatePatternHash([], zone, []),
    classified_by: {
      tier: 0, // Tier 0 = human decision via Jidoka resolution
      model: 'human_jidoka_resolution',
    },
    classified_at: new Date().toISOString(),
  }
}

// =============================================================================
// COMBINED REDUCER — Pure state transitions
// =============================================================================

/**
 * Combined reducer that handles both bundle actions and app-level actions.
 * This is a PURE function. Side effects (telemetry, guards) happen in transition().
 */
function combinedReducer(state: AppState, action: CombinedAction): AppState {
  // First, let the bundle reducer handle its actions
  const bundleState = bundleReducer(state, action as ArxivRadarAction)

  // If bundle state changed, merge with app state
  if (bundleState !== state) {
    return {
      ...state,
      ...bundleState,
    }
  }

  // Handle app-level actions
  switch (action.type) {
    // =========================================================================
    // SKILLS
    // =========================================================================

    case 'SKILL_PROPOSAL_CREATED':
      return {
        ...state,
        skill_proposals: [...state.skill_proposals, action.proposal],
      }

    case 'SKILL_PROPOSAL_APPROVED': {
      const proposal = state.skill_proposals.find(p => p.id === action.proposalId)
      if (!proposal) return state

      const newSkill: Skill = {
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

      return {
        ...state,
        skills: [...state.skills, newSkill],
        skill_proposals: state.skill_proposals.filter(p => p.id !== action.proposalId),
        stats: {
          ...state.stats,
          tier0_skills: state.stats.tier0_skills + 1,
        },
      }
    }

    case 'SKILL_PROPOSAL_REJECTED':
      return {
        ...state,
        skill_proposals: state.skill_proposals.filter(p => p.id !== action.proposalId),
      }

    case 'SKILL_FIRED':
      return {
        ...state,
        skills: state.skills.map(s =>
          s.id === action.skillId
            ? {
                ...s,
                times_fired: s.times_fired + 1,
                last_fired: new Date().toISOString(),
              }
            : s
        ),
      }

    case 'SKILL_DEPRECATED':
      return {
        ...state,
        skills: state.skills.map(s =>
          s.id === action.skillId
            ? { ...s, deprecated: true }
            : s
        ),
      }

    case 'SKILL_DELETED':
      return {
        ...state,
        skills: state.skills.filter(s => s.id !== action.skillId),
        stats: {
          ...state.stats,
          tier0_skills: Math.max(0, state.stats.tier0_skills - 1),
        },
      }

    // =========================================================================
    // TELEMETRY
    // =========================================================================

    case 'TELEMETRY_LOGGED':
      return {
        ...state,
        telemetry_log: [...state.telemetry_log, action.entry],
      }

    case 'TELEMETRY_CLEARED':
      return {
        ...state,
        telemetry_log: [],
      }

    // =========================================================================
    // KAIZEN
    // =========================================================================

    case 'KAIZEN_PROPOSAL_CREATED':
      return {
        ...state,
        kaizen_proposals: [...state.kaizen_proposals, action.proposal],
      }

    case 'KAIZEN_OPTION_SELECTED':
      return {
        ...state,
        kaizen_proposals: state.kaizen_proposals.filter(
          p => p.id !== action.proposalId
        ),
      }

    // =========================================================================
    // SETTINGS
    // =========================================================================

    case 'SETTINGS_UPDATED':
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      }

    // =========================================================================
    // HYDRATION
    // =========================================================================

    case 'STATE_HYDRATED':
      return action.state

    default:
      return state
  }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Main hook for the Autonomaton pattern.
 *
 * CRITICAL: `dispatch` is PRIVATE. Only `transition()` is exposed.
 * This is what makes Jidoka impossible to bypass.
 */
export function useAutonomaton() {
  // Initialize with hydrated state
  const initialState = useMemo(() => getHydratedInitialState(), [])

  // Main reducer — dispatch is PRIVATE to this hook
  const [state, dispatch] = useReducer(combinedReducer, initialState)

  // Ref to current state for use in transition() closure
  const stateRef = useRef(state)
  stateRef.current = state

  // Computed value for effect dependency — triggers re-fire when halts resolve
  const unresolvedHaltCount = useMemo(
    () => state.jidoka_halts.filter(h => !h.resolved).length,
    [state.jidoka_halts]
  )

  // ==========================================================================
  // TRANSITION — The ONLY way to change state
  // ==========================================================================

  /**
   * The Single Pipeline Orchestrator.
   *
   * This wraps dispatch. It's the ONLY way to change state.
   * Jidoka guards run on EVERY transition. There is no bypass.
   * Telemetry logs automatically (Feed-First, Principle #3).
   *
   * @returns true if transition succeeded, false if Jidoka halted
   */
  const transition = useCallback((action: CombinedAction): boolean => {
    const currentState = stateRef.current
    const currentStage = currentState.pipeline.current_stage

    // 1. VALIDATE: Is this transition legal from the current state?
    // Invalid transitions MUST fire Jidoka — no silent failures
    if (!isValidTransition(currentStage, action)) {
      logInvalidTransition(currentStage, action)

      // Andon Gate blocked invalid transition — fire Jidoka halt
      const invalidHalt: JidokaEvent = {
        id: crypto.randomUUID(),
        stage: currentStage,
        trigger: 'invalid_transition', // State machine violation — distinct from parser errors
        details: `ANDON GATE: Blocked "${action.type}" during ${currentStage} stage. This action is not valid from this state. Check the state machine definition or investigate why this action fired unexpectedly.`,
        timestamp: new Date().toISOString(),
        resolved: false,
      }

      // Fire Jidoka halt (visible in UI)
      dispatch({ type: 'JIDOKA_HALT', event: invalidHalt })
      dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(invalidHalt) })

      // Log the invalid transition attempt
      dispatch({
        type: 'TELEMETRY_LOGGED',
        entry: telemetry.createTelemetryEntry(currentStage, 'invalid_transition', {
          jidoka: true,
          details: `Attempted: ${action.type}`,
        }),
      })
      return false
    }

    // 2. ANDON GATE: Every transition passes through the gate
    const gateResult = runAndonGate(currentState, action)
    const targetStage = getTargetStage(action)

    // LOG: Single call site for all console telemetry
    logTransition({ action, state: currentState, gateResult, targetStage })

    if (gateResult.halt && gateResult.event) {
      // Transition blocked. Enter JidokaHalt state.
      dispatch({ type: 'JIDOKA_HALT', event: gateResult.event })

      // Generate Kaizen proposal
      const kaizenProposal = generateKaizenProposal(gateResult.event)
      dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: kaizenProposal })

      // Log the halt (Feed-First)
      dispatch({
        type: 'TELEMETRY_LOGGED',
        entry: telemetry.createTelemetryEntry(currentStage, 'jidoka_halt', {
          jidoka: true,
          details: gateResult.event.trigger,
          arxiv_id: gateResult.event.paper_id,
        }),
      })

      return false
    }

    // 3. TRANSITION: Dispatch the actual action
    dispatch(action)

    // 4. TELEMETRY: Log automatically (Feed-First, Principle #3)
    // Extract relevant info for telemetry based on action type
    const telemetryEntry = createTelemetryForAction(action, currentState)
    if (telemetryEntry) {
      dispatch({ type: 'TELEMETRY_LOGGED', entry: telemetryEntry })
    }

    // 5. FLYWHEEL: Scan for patterns after briefing approval
    // This is where promoted skills come from — the economic payoff
    if (action.type === 'BRIEFING_APPROVED' && telemetryEntry) {
      // Simulate updated telemetry for detection
      const updatedTelemetry = [...currentState.telemetry_log, telemetryEntry]

      const newProposals = runFlywheelScan(
        updatedTelemetry,
        currentState.skill_proposals,
        currentState.skills,
        currentState.settings
      )

      // Dispatch each new proposal
      for (const proposal of newProposals) {
        dispatch({ type: 'SKILL_PROPOSAL_CREATED', proposal })
      }
    }

    return true
  }, [])

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  const handleHydrate = useCallback((hydratedState: AppState) => {
    // Hydration bypasses guards — it's restoring saved state
    dispatch({ type: 'STATE_HYDRATED', state: hydratedState })
  }, [])

  const { save } = usePersistedState(state, handleHydrate)

  // ==========================================================================
  // REACTIVE PIPELINE — Effects driven by state transitions
  // ==========================================================================
  //
  // The state machine drives the pipeline. Not an external function.
  // When state changes, effects fire. When effects complete, they call transition().
  // If Jidoka halts, the stage doesn't advance — no effects fire.
  // Resolution changes state — effects resume automatically.
  //

  // Track in-flight operations to prevent double-execution
  const processingRef = useRef<{
    telemetry: boolean
    recognition: string | null  // arxiv_id being processed
    compilation: string | null  // arxiv_id being compiled
  }>({
    telemetry: false,
    recognition: null,
    compilation: null,
  })

  // --- TELEMETRY STAGE: Load papers ---
  useEffect(() => {
    const { current_stage, is_polling } = state.pipeline

    if (current_stage !== 'telemetry' || !is_polling) return
    if (processingRef.current.telemetry) return

    processingRef.current.telemetry = true

    if (state.settings.dev_mode) {
      // DEV MODE: Seed data — sovereignty test (works offline)
      console.log('[Pipeline] Telemetry: Loading seed papers (dev mode)...')
      const papers = loadSeedPapers()
      console.log(`[Pipeline] Telemetry: Loaded ${papers.length} seed papers`)
      transition({ type: 'POLL_COMPLETE', papers })
      processingRef.current.telemetry = false
    } else {
      // LIVE MODE: Fetch from arXiv API
      console.log('[Pipeline] Telemetry: Fetching from arXiv...')
      // Use space-separated OR (URLSearchParams will encode spaces as +, which arXiv understands)
      const categoryQuery = ARXIV_CATEGORIES.map(c => `cat:${c}`).join(' OR ')
      fetchArxivPapers(categoryQuery, ARXIV_CONFIG.maxResultsPerPoll)
        .then(papers => {
          console.log(`[Pipeline] Telemetry: Fetched ${papers.length} papers from arXiv`)
          processingRef.current.telemetry = false

          // NO SILENT FAILURES: 0 papers is an abnormality that requires investigation
          if (papers.length === 0) {
            const halt: JidokaEvent = {
              id: crypto.randomUUID(),
              stage: 'telemetry',
              trigger: 'empty_result',
              details: `arXiv returned 0 papers. Query: "${categoryQuery}". This may indicate a query format issue, API change, or temporary arXiv outage.`,
              timestamp: new Date().toISOString(),
              resolved: false,
            }
            dispatch({ type: 'JIDOKA_HALT', event: halt })
            dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(halt) })
            return
          }

          transition({ type: 'POLL_COMPLETE', papers })
        })
        .catch(error => {
          console.error('[Pipeline] Telemetry: arXiv fetch failed:', error)
          processingRef.current.telemetry = false
          const errorMsg = error instanceof Error ? error.message : 'Unknown fetch error'
          const halt: JidokaEvent = {
            id: crypto.randomUUID(),
            stage: 'telemetry',
            trigger: 'api_failure',
            details: `arXiv fetch failed: ${errorMsg}`,
            timestamp: new Date().toISOString(),
            resolved: false,
          }
          dispatch({ type: 'JIDOKA_HALT', event: halt })
          dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(halt) })
        })
    }
  }, [state.pipeline.current_stage, state.pipeline.is_polling, state.settings.dev_mode, transition])

  // --- RECOGNITION STAGE: Classify ONE paper (One-Piece Flow) ---
  useEffect(() => {
    const { current_stage, current_paper_index, total_papers_this_cycle } = state.pipeline
    const hasUnresolved = state.jidoka_halts.some(h => !h.resolved)

    if (current_stage !== 'recognition') return
    if (hasUnresolved) {
      console.log('[Pipeline] Recognition: Blocked by unresolved Jidoka halt')
      return
    }
    if (state.incoming_papers.length === 0) {
      // ONE-PIECE FLOW: All papers processed — cycle complete
      // The reducer handles stage transitions; we just log
      console.log(`[Pipeline] Recognition: Cycle complete. ${total_papers_this_cycle} papers processed.`)
      return
    }

    const nextPaper = state.incoming_papers[0]
    if (processingRef.current.recognition === nextPaper.arxiv_id) return

    // =========================================================================
    // CHECK FOR HUMAN OVERRIDE — Respect resolved Jidoka decisions
    // =========================================================================
    // If the human has already resolved a Jidoka halt for this paper,
    // use their decision instead of re-classifying (which would re-trigger Jidoka)
    const resolvedHalt = state.jidoka_halts.find(
      h => h.paper_id === nextPaper.arxiv_id && h.resolved && h.resolution
    )

    if (resolvedHalt) {
      console.log(`[Pipeline] Recognition: ${nextPaper.arxiv_id} → HUMAN OVERRIDE (${resolvedHalt.resolution})`)
      processingRef.current.recognition = nextPaper.arxiv_id

      // Apply human's decision
      const classifiedPaper = applyHumanResolution(nextPaper, resolvedHalt.resolution!)

      processingRef.current.recognition = null

      if (classifiedPaper.zone === 'green') {
        transition({ type: 'PAPER_ARCHIVED', paper: classifiedPaper })
      } else {
        transition({ type: 'PAPER_CLASSIFIED', paper: classifiedPaper })
      }
      return
    }

    // =========================================================================
    // NORMAL CLASSIFICATION — May trigger Jidoka if paper has anomalies
    // =========================================================================
    console.log(`[Pipeline] Recognition: Classifying ${nextPaper.arxiv_id} (${state.incoming_papers.length} remaining)`)
    processingRef.current.recognition = nextPaper.arxiv_id

    // Classify the paper
    classifyPaperService(nextPaper, state.skills, state.settings).then(result => {
      processingRef.current.recognition = null

      // LOG ROUTING DECISION — makes Cognitive Router auditable
      dispatch({
        type: 'TELEMETRY_LOGGED',
        entry: telemetry.createTelemetryEntry('recognition', 'routing_decision', {
          arxiv_id: nextPaper.arxiv_id,
          tier: result.tier === 'T0-skill' ? 0 : result.tier === 'T0-keyword' ? 0 : result.tier === 'T2' ? 2 : 0,
          details: `Tier ${result.tier}: ${result.tier === 'T0-skill' ? 'Skill match' : result.tier === 'T0-keyword' ? 'Keyword threshold met' : result.tier === 'T2' ? 'LLM classification' : 'Dev mode mock'}`,
          confidence: result.paper?.relevance_score,
          cost_usd: result.cost_usd ?? 0,
        }),
      })

      if (result.success && result.paper) {
        console.log(`[Pipeline] Recognition: ${nextPaper.arxiv_id} → ${result.paper.zone.toUpperCase()}`)
        if (result.paper.zone === 'green') {
          // Auto-archive GREEN papers
          transition({ type: 'PAPER_ARCHIVED', paper: result.paper, classification_cost_usd: result.cost_usd })
        } else {
          // YELLOW/RED papers need briefings
          transition({ type: 'PAPER_CLASSIFIED', paper: result.paper, classification_cost_usd: result.cost_usd })
        }
      } else if (result.jidokaHalt) {
        console.log(`[Pipeline] Recognition: ${nextPaper.arxiv_id} → JIDOKA (${result.jidokaHalt.trigger})`)
        // Jidoka halt — transition will handle it via guards
        // The halt is already created, dispatch it directly
        dispatch({ type: 'JIDOKA_HALT', event: result.jidokaHalt })
        const kaizenProposal = generateKaizenProposal(result.jidokaHalt)
        dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: kaizenProposal })
      }
    })
  }, [
    state.pipeline.current_stage,
    state.incoming_papers,
    state.jidoka_halts,
    unresolvedHaltCount, // Triggers re-fire when halts resolve
    state.skills,
    state.settings,
    state.classified_papers,
    transition,
  ])

  // --- COMPILATION STAGE: Generate briefing for ONE paper (One-Piece Flow) ---
  useEffect(() => {
    const { current_stage } = state.pipeline
    const hasUnresolved = state.jidoka_halts.some(h => !h.resolved)

    if (current_stage !== 'compilation') return
    if (hasUnresolved) {
      console.log('[Pipeline] Compilation: Blocked by unresolved Jidoka halt')
      return
    }

    // ONE-PIECE FLOW: Should be exactly ONE paper needing a briefing
    // (the one we just classified as YELLOW/RED)
    const papersNeedingBriefings = state.classified_papers.filter(paper => {
      const hasPendingBriefing = state.pending_briefings.some(
        b => b.paper.arxiv_id === paper.arxiv_id
      )
      return !hasPendingBriefing
    })

    if (papersNeedingBriefings.length === 0) {
      // No papers need briefings — this shouldn't happen in one-piece flow
      // but handle gracefully by returning to recognition
      console.log('[Pipeline] Compilation: No papers need briefings, returning to recognition')
      if (state.incoming_papers.length > 0) {
        transition({ type: 'SET_STAGE', stage: 'recognition' })
      } else {
        transition({ type: 'SET_STAGE', stage: 'idle' })
      }
      return
    }

    const nextPaper = papersNeedingBriefings[0]
    if (processingRef.current.compilation === nextPaper.arxiv_id) return

    console.log(`[Pipeline] Compilation: Generating briefing for ${nextPaper.arxiv_id} (${papersNeedingBriefings.length} remaining)`)
    processingRef.current.compilation = nextPaper.arxiv_id

    // Compile the briefing
    if (state.settings.dev_mode) {
      // Dev mode: mock compilation
      const briefing = mockCompileBriefing(nextPaper, state.voice_preset)
      console.log(`[Pipeline] Compilation: ${nextPaper.arxiv_id} → briefing ready (dev mode)`)
      processingRef.current.compilation = null
      transition({ type: 'BRIEFING_COMPILED', briefing })
    } else if (state.settings.api_key) {
      // Real compilation with Anthropic API
      compileBriefing(nextPaper, state.voice_preset, state.settings.api_key).then(result => {
        processingRef.current.compilation = null

        if (result.success && result.briefing) {
          transition({ type: 'BRIEFING_COMPILED', briefing: result.briefing })
        } else {
          // API error — create Jidoka halt
          const halt: JidokaEvent = {
            id: crypto.randomUUID(),
            stage: 'compilation',
            trigger: 'api_failure',
            details: result.error || 'Compilation failed',
            paper_id: nextPaper.arxiv_id,
            timestamp: new Date().toISOString(),
            resolved: false,
          }
          dispatch({ type: 'JIDOKA_HALT', event: halt })
          dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(halt) })
        }
      })
    } else {
      // No API key — Jidoka halt
      processingRef.current.compilation = null
      const halt: JidokaEvent = {
        id: crypto.randomUUID(),
        stage: 'compilation',
        trigger: 'api_failure',
        details: 'No API key configured. Switch to dev mode or provide an API key.',
        paper_id: nextPaper.arxiv_id,
        timestamp: new Date().toISOString(),
        resolved: false,
      }
      dispatch({ type: 'JIDOKA_HALT', event: halt })
      dispatch({ type: 'KAIZEN_PROPOSAL_CREATED', proposal: generateKaizenProposal(halt) })
    }
  }, [
    state.pipeline.current_stage,
    state.classified_papers,
    state.pending_briefings,
    state.jidoka_halts,
    unresolvedHaltCount, // Triggers re-fire when halts resolve
    state.settings,
    state.voice_preset,
    transition,
  ])

  // --- JIDOKA RESOLUTION: Resume pipeline after halt resolution ---
  useEffect(() => {
    const { current_stage } = state.pipeline
    const hasUnresolved = state.jidoka_halts.some(h => !h.resolved)

    // If all halts resolved and we're in a processing stage, the stage effects
    // will automatically pick up where they left off on next render.
    // This effect just ensures we reset processing refs after resolution.
    if (!hasUnresolved && current_stage !== 'idle' && current_stage !== 'approval') {
      // Reset processing state to allow retry
      processingRef.current.telemetry = false
      processingRef.current.recognition = null
      processingRef.current.compilation = null
    }
  }, [state.jidoka_halts, state.pipeline.current_stage])

  // --- EXECUTION STAGE: Complete the 5-stage invariant ---
  // Per Autonomaton whitepaper: every cognitive interaction passes through all 5 stages
  // This stage fires after approval decision, then continues to next paper or idle
  useEffect(() => {
    if (state.pipeline.current_stage !== 'execution') return

    console.log(`[Pipeline] EXECUTION: ${state.incoming_papers.length} papers remaining`)

    // Single clean transition — telemetry handled by transition system
    transition({ type: 'EXECUTION_COMPLETE' })
  }, [state.pipeline.current_stage, state.incoming_papers.length, transition])

  // --- IDLE STAGE: Cycle complete, ready for next run ---
  // ONE-PIECE FLOW: No auto-restart. User clicks RUN when ready.
  useEffect(() => {
    const { current_stage, total_papers_this_cycle } = state.pipeline

    if (current_stage !== 'idle') return
    if (total_papers_this_cycle === 0) return // Initial idle, not post-cycle

    // Log cycle completion
    const greenCount = state.archived_papers.length
    const yellowRedCount = state.approved_briefings.length + state.rejected_briefings.length
    console.log(`[Pipeline] Cycle complete: ${greenCount} GREEN (archived), ${yellowRedCount} YELLOW/RED (reviewed)`)
  }, [
    state.pipeline.current_stage,
    state.pipeline.total_papers_this_cycle,
    state.archived_papers.length,
    state.approved_briefings.length,
    state.rejected_briefings.length,
  ])

  // ==========================================================================
  // PIPELINE CONTROL — All use transition()
  // ==========================================================================

  const startPipeline = useCallback(() => {
    transition({ type: 'START_POLL' })
  }, [transition])

  const setStage = useCallback((stage: AppState['pipeline']['current_stage']) => {
    transition({ type: 'SET_STAGE', stage })
  }, [transition])

  // ==========================================================================
  // JIDOKA RESOLUTION
  // ==========================================================================

  const resolveJidoka = useCallback((eventId: string, resolution: string) => {
    console.log(`[Pipeline] JIDOKA RESOLVED: ${eventId} → ${resolution}`)
    transition({ type: 'JIDOKA_RESOLVE', eventId, resolution })
  }, [transition])

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    transition({ type: 'SETTINGS_UPDATED', settings })
  }, [transition])

  // ==========================================================================
  // SKILLS — All use transition()
  // ==========================================================================

  const approveSkillProposal = useCallback((proposalId: string) => {
    transition({ type: 'SKILL_PROPOSAL_APPROVED', proposalId })
  }, [transition])

  const rejectSkillProposal = useCallback((proposalId: string) => {
    transition({ type: 'SKILL_PROPOSAL_REJECTED', proposalId })
  }, [transition])

  const deprecateSkill = useCallback((skillId: string, reason: string) => {
    transition({ type: 'SKILL_DEPRECATED', skillId, reason })
  }, [transition])

  const deleteSkill = useCallback((skillId: string) => {
    transition({ type: 'SKILL_DELETED', skillId })
  }, [transition])

  // ==========================================================================
  // PAPER & BRIEFING ACTIONS — All use transition()
  // ==========================================================================

  const classifyPaper = useCallback((paper: Parameters<typeof transition>[0] extends { type: 'PAPER_CLASSIFIED' } ? Parameters<typeof transition>[0]['paper'] : never) => {
    return transition({ type: 'PAPER_CLASSIFIED', paper })
  }, [transition])

  const approveBriefing = useCallback((briefingId: string, edits?: Record<string, unknown>) => {
    return transition({ type: 'BRIEFING_APPROVED', briefingId, edits })
  }, [transition])

  const rejectBriefing = useCallback((briefingId: string, reason?: string) => {
    return transition({ type: 'BRIEFING_REJECTED', briefingId, reason })
  }, [transition])

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const flywheelStats = useMemo((): FlywheelDisplayStats => {
    const activeSkills = state.skills.filter(s => !s.deprecated)

    return {
      tier0_skills: activeSkills.length,
      tier2_model: 'Sonnet',
      tier2_cost: state.stats.total_api_cost_usd,
      papers_seen: state.stats.papers_seen,
      briefings_approved: state.stats.briefings_approved,
      skills_promoted: state.skills.length,
      migrations_this_session: 0, // TODO: Track per session
    }
  }, [state.skills, state.stats])

  const hasUnresolvedHalts = useMemo(() => {
    return state.jidoka_halts.some(h => !h.resolved)
  }, [state.jidoka_halts])

  const unresolvedHalts = useMemo(() => {
    return state.jidoka_halts.filter(h => !h.resolved)
  }, [state.jidoka_halts])

  // Pipeline annotation — rich status text for GlassPipeline
  // ONE-PIECE FLOW: Shows "Paper X/Y" progress
  const pipelineAnnotation = useMemo((): string => {
    const { current_stage, current_paper_index, total_papers_this_cycle } = state.pipeline

    if (hasUnresolvedHalts && unresolvedHalts[0]) {
      const halt = unresolvedHalts[0]
      const paperRef = halt.paper_id ? ` — paper ${halt.paper_id}` : ''
      return `HALTED — ${halt.trigger.replace(/_/g, ' ')}${paperRef}`
    }

    // ONE-PIECE FLOW: Show paper progress across all active stages
    const paperProgress = total_papers_this_cycle > 0
      ? `Paper ${current_paper_index + 1}/${total_papers_this_cycle}`
      : ''

    switch (current_stage) {
      case 'telemetry':
        return state.settings.dev_mode ? 'Loading 7 seed papers' : 'Fetching from arXiv...'
      case 'recognition':
        return paperProgress ? `${paperProgress} — classifying` : 'Classifying...'
      case 'compilation':
        return paperProgress ? `${paperProgress} — generating briefing` : 'Generating briefing...'
      case 'approval':
        return paperProgress ? `${paperProgress} — governance required` : 'Governance required'
      case 'idle':
        if (total_papers_this_cycle > 0) {
          // Just finished a cycle
          return `Cycle complete — ${total_papers_this_cycle} papers processed`
        }
        return state.stats.papers_seen > 0 ? 'Awaiting new research' : 'Ready'
      default:
        return 'Ready'
    }
  }, [
    state.pipeline.current_stage,
    state.pipeline.current_paper_index,
    state.pipeline.total_papers_this_cycle,
    state.settings.dev_mode,
    state.stats.papers_seen,
    hasUnresolvedHalts,
    unresolvedHalts,
  ])

  // ==========================================================================
  // RETURN — Note: dispatch is NOT exposed. Only transition.
  // ==========================================================================

  return {
    // State (read-only)
    state,

    // THE SINGLE ORCHESTRATOR — the only way to change state
    transition,

    // Pipeline
    pipeline: state.pipeline,
    startPipeline,
    setStage,

    // Papers & Briefings
    incomingPapers: state.incoming_papers,
    classifiedPapers: state.classified_papers,
    pendingBriefings: state.pending_briefings,
    approvedBriefings: state.approved_briefings,
    archivedPapers: state.archived_papers,
    classifyPaper,
    approveBriefing,
    rejectBriefing,

    // Skills
    skills: state.skills,
    skillProposals: state.skill_proposals,
    approveSkillProposal,
    rejectSkillProposal,
    deprecateSkill,
    deleteSkill,

    // Jidoka
    jidokaHalts: state.jidoka_halts,
    hasUnresolvedHalts,
    unresolvedHalts,
    kaizenProposals: state.kaizen_proposals,
    resolveJidoka,

    // Pipeline annotation (rich status for GlassPipeline)
    pipelineAnnotation,

    // Settings
    settings: state.settings,
    updateSettings,

    // Stats
    stats: state.stats,
    flywheelStats,

    // Voice
    voicePreset: state.voice_preset,

    // Telemetry
    telemetryLog: state.telemetry_log,

    // Persistence
    save,
  }
}

// =============================================================================
// TELEMETRY HELPER — Creates entry based on action type
// =============================================================================

function createTelemetryForAction(
  action: CombinedAction,
  state: AppState
): TelemetryEntry | null {
  const stage = state.pipeline.current_stage

  switch (action.type) {
    case 'START_POLL':
      return telemetry.createTelemetryEntry('telemetry', 'poll_started')

    case 'POLL_COMPLETE':
      return telemetry.createTelemetryEntry('telemetry', 'poll_complete', {
        details: `${action.papers.length} papers`,
      })

    case 'PAPER_CLASSIFIED':
      return telemetry.createTelemetryEntry('recognition', 'paper_classified', {
        arxiv_id: action.paper.arxiv_id,
        zone: action.paper.zone,
        pattern_hash: action.paper.pattern_hash,
        tier: action.paper.classified_by.tier,
      })

    case 'BRIEFING_COMPILED':
      return telemetry.createTelemetryEntry('compilation', 'briefing_compiled', {
        arxiv_id: action.briefing.paper.arxiv_id,
        cost_usd: action.briefing.compiled_by.cost_usd,
      })

    case 'BRIEFING_APPROVED': {
      // Find the briefing to get pattern_hash and zone for Flywheel detection
      const briefing = state.pending_briefings.find(b => b.id === action.briefingId)
      return telemetry.createTelemetryEntry('approval', 'briefing_approved', {
        human_feedback: 'approved',
        arxiv_id: briefing?.paper.arxiv_id,
        pattern_hash: briefing?.paper.pattern_hash,
        zone: briefing?.paper.zone,
        matched_topics: briefing?.paper.matched_topics,
        matched_keywords: briefing?.paper.matched_keywords,
      })
    }

    case 'BRIEFING_REJECTED':
      return telemetry.createTelemetryEntry('approval', 'briefing_rejected', {
        human_feedback: 'rejected',
        details: action.reason,
      })

    case 'SKILL_PROPOSAL_APPROVED': {
      const proposal = state.skill_proposals.find(p => p.id === action.proposalId)
      if (proposal) {
        return telemetry.createTelemetryEntry('execution', 'skill_promoted', {
          pattern_hash: proposal.pattern_hash,
        })
      }
      return null
    }

    case 'SKILL_FIRED':
      return telemetry.createTelemetryEntry('recognition', 'skill_fired', {
        skill_id: action.skillId,
        arxiv_id: action.paperId,
        tier: 0,
      })

    case 'JIDOKA_RESOLVE':
      return telemetry.createTelemetryEntry(stage, 'jidoka_resolved', {
        human_feedback: 'resolved',
        details: action.resolution,
      })

    case 'EXECUTION_COMPLETE':
      return telemetry.createTelemetryEntry('execution', 'stage_complete', {
        details: `${state.incoming_papers.length} papers remaining`,
      })

    default:
      // Not all actions need telemetry
      return null
  }
}

// =============================================================================
// CONTEXT — For deep component trees
// =============================================================================

type AutonomatonContextType = ReturnType<typeof useAutonomaton>

export const AutonomatonContext = createContext<AutonomatonContextType | null>(null)

export function useAutonomatonContext() {
  const context = useContext(AutonomatonContext)
  if (!context) {
    throw new Error('useAutonomatonContext must be used within AutonomatonProvider')
  }
  return context
}
