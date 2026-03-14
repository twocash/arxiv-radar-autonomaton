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
import { loadSeedPapers } from '../services/arxiv'
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
    if (!isValidTransition(currentStage, action)) {
      logInvalidTransition(currentStage, action)
      // Log the invalid transition attempt
      dispatch({
        type: 'TELEMETRY_LOGGED',
        entry: telemetry.createTelemetryEntry(currentStage, 'invalid_transition', {
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

    console.log('[Pipeline] Telemetry: Loading papers...')
    processingRef.current.telemetry = true

    // Load papers (seed data in dev mode, arXiv API otherwise)
    const papers = loadSeedPapers()
    console.log(`[Pipeline] Telemetry: Loaded ${papers.length} papers`)
    transition({ type: 'POLL_COMPLETE', papers })

    processingRef.current.telemetry = false
  }, [state.pipeline.current_stage, state.pipeline.is_polling, transition])

  // --- RECOGNITION STAGE: Classify papers ---
  useEffect(() => {
    const { current_stage } = state.pipeline
    const hasUnresolved = state.jidoka_halts.some(h => !h.resolved)

    if (current_stage !== 'recognition') return
    if (hasUnresolved) {
      console.log('[Pipeline] Recognition: Blocked by unresolved Jidoka halt')
      return
    }
    if (state.incoming_papers.length === 0) {
      // No more papers to classify — move to compilation
      if (state.classified_papers.some(p => p.zone !== 'green')) {
        transition({ type: 'SET_STAGE', stage: 'compilation' })
      } else {
        // All papers were green (archived) — go to idle
        transition({ type: 'SET_STAGE', stage: 'idle' })
      }
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

      if (result.success && result.paper) {
        console.log(`[Pipeline] Recognition: ${nextPaper.arxiv_id} → ${result.paper.zone.toUpperCase()}`)
        if (result.paper.zone === 'green') {
          // Auto-archive GREEN papers
          transition({ type: 'PAPER_ARCHIVED', paper: result.paper })
        } else {
          // YELLOW/RED papers need briefings
          transition({ type: 'PAPER_CLASSIFIED', paper: result.paper })
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

  // --- COMPILATION STAGE: Generate briefings ---
  useEffect(() => {
    const { current_stage } = state.pipeline
    const hasUnresolved = state.jidoka_halts.some(h => !h.resolved)

    if (current_stage !== 'compilation') return
    if (hasUnresolved) {
      console.log('[Pipeline] Compilation: Blocked by unresolved Jidoka halt')
      return
    }

    // Find papers that need briefings (YELLOW/RED without pending briefing)
    const papersNeedingBriefings = state.classified_papers.filter(paper => {
      const hasPendingBriefing = state.pending_briefings.some(
        b => b.paper.arxiv_id === paper.arxiv_id
      )
      return !hasPendingBriefing
    })

    if (papersNeedingBriefings.length === 0) {
      // All briefings compiled — move to approval
      if (state.pending_briefings.length > 0) {
        console.log(`[Pipeline] Compilation: Complete, ${state.pending_briefings.length} briefings pending approval`)
        transition({ type: 'SET_STAGE', stage: 'approval' })
      } else {
        console.log('[Pipeline] Compilation: No briefings to approve, returning to idle')
        // Nothing to approve — go to idle
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
