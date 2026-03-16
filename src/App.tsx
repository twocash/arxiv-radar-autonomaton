/**
 * arXiv Radar — Main Application
 *
 * Root component implementing the Autonomaton pattern.
 * Two-column layout: Content (left) and Admin (right).
 *
 * @license CC BY 4.0
 */

import { useState, useCallback } from 'react'
import { useAutonomaton, AutonomatonContext } from './hooks/useAutonomaton'
import { CommandBar } from './components/CommandBar'
import { GlassPipeline } from './components/GlassPipeline'
import { FlywheelFooter } from './components/FlywheelFooter'
import { JidokaAlert } from './components/JidokaAlert'
import { SkillProposals } from './components/SkillProposals'
import { PendingGovernance } from './components/PendingGovernance'
import { LibraryView } from './components/LibraryView'
import { SkillsLibrary } from './components/SkillsLibrary'
import { SettingsPanel } from './components/SettingsPanel'
import { PipelineTrace } from './components/PipelineTrace'
import { WelcomeCard } from './components/WelcomeCard'
import { PipelineProgress } from './components/PipelineProgress'
import type { VoicePresetId } from './config/voices'

// Tab options for main content area
type ContentTab = 'processing' | 'library'

function App() {
  const autonomaton = useAutonomaton()
  const {
    state,
    pipeline,
    startPipeline,
    flywheelStats,
    pendingBriefings,
    skills,
    skillProposals,
    hasUnresolvedHalts,
    unresolvedHalts,
    kaizenProposals,
    settings,
    telemetryLog,
    approveBriefing,
    rejectBriefing,
    approveSkillProposal,
    rejectSkillProposal,
    deprecateSkill,
    deleteSkill,
    resolveJidoka,
    updateSettings,
    transition,
    pipelineAnnotation,
  } = autonomaton

  // Voice preset state (will be moved to app state in future)
  const [voicePreset, setVoicePreset] = useState<VoicePresetId>('quick_scan')

  // Tab state for main content area
  const [activeTab, setActiveTab] = useState<ContentTab>('processing')

  const hasError = pipeline.last_error !== null
  const hasCompletedCycle = flywheelStats.papers_seen > 0

  // ONE-PIECE FLOW: Pipeline Progress stats from pipeline tracking
  const totalPapersThisCycle = pipeline.total_papers_this_cycle
  const processedCount = pipeline.current_paper_index
  const greenCount = state.archived_papers.length
  // In one-piece flow, YELLOW/RED papers are approved immediately, so count from approved briefings
  const yellowCount = state.approved_briefings.filter(b => b.paper.zone === 'yellow').length
  const redCount = state.approved_briefings.filter(b => b.paper.zone === 'red').length

  // Show progress dashboard during active pipeline stages
  // In one-piece flow, show during all active stages including approval
  const showPipelineProgress =
    pipeline.current_stage !== 'idle' &&
    totalPapersThisCycle > 0

  const handleRun = useCallback((_query?: string) => {
    startPipeline()
  }, [startPipeline])

  const handleKaizenSelect = useCallback((proposalId: string, optionAction: string) => {
    transition({ type: 'KAIZEN_OPTION_SELECTED', proposalId, optionAction })
  }, [transition])

  const handleExportTelemetry = useCallback(() => {
    console.log('[App] Telemetry exported')
  }, [])

  const handleReset = useCallback(() => {
    transition({ type: 'RESET_STATE' })
    localStorage.clear()
    window.location.reload()
  }, [transition])

  // Find Kaizen proposal for current halt
  const currentHalt = unresolvedHalts[0]
  const currentKaizen = currentHalt
    ? kaizenProposals.find(k => k.jidoka_event_id === currentHalt.id)
    : undefined

  return (
    <AutonomatonContext.Provider value={autonomaton}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Fixed top: CommandBar + GlassPipeline */}
        <CommandBar
          version="v0.1.0"
          devMode={settings.dev_mode}
          isPolling={pipeline.is_polling}
          pipelineStage={pipeline.current_stage}
          hasUnresolvedHalts={hasUnresolvedHalts}
          voicePreset={voicePreset}
          onVoiceChange={setVoicePreset}
          onRun={handleRun}
        />

        <GlassPipeline
          currentStage={pipeline.current_stage}
          hasError={hasError}
          isPolling={pipeline.is_polling}
          hasUnresolvedHalts={hasUnresolvedHalts}
          hasCompletedCycle={hasCompletedCycle}
          annotation={pipelineAnnotation}
        />

        {/* Two-column body — fills remaining viewport height */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Content — scrolls independently */}
          <main
            className="w-[60%] overflow-y-auto py-6"
            style={{ paddingLeft: '40px', paddingRight: '40px' }}
          >
            <div style={{ maxWidth: '720px' }}>
              {/* Tab Navigation */}
              <div
                className="flex gap-1 mb-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  className="px-4 py-2 font-mono text-sm transition-colors"
                  style={{
                    color: activeTab === 'processing' ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: activeTab === 'processing' ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                  onClick={() => setActiveTab('processing')}
                >
                  Processing
                </button>
                <button
                  className="px-4 py-2 font-mono text-sm transition-colors flex items-center gap-2"
                  style={{
                    color: activeTab === 'library' ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: activeTab === 'library' ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                  onClick={() => setActiveTab('library')}
                >
                  Library
                  {state.approved_briefings.length > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded-sm text-[10px]"
                      style={{
                        backgroundColor: 'rgba(94, 191, 80, 0.1)',
                        color: 'var(--zone-green-text)',
                      }}
                    >
                      {state.approved_briefings.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'processing' ? (
                <>
                  {/* Welcome Card — first run only */}
                  {state.stats.papers_seen === 0 && pipeline.current_stage === 'idle' && (
                    <WelcomeCard settings={settings} />
                  )}

                  {/* Jidoka Alert */}
                  {hasUnresolvedHalts && currentHalt && (
                    <JidokaAlert
                      halt={currentHalt}
                      kaizenProposal={currentKaizen}
                      onResolve={resolveJidoka}
                      onSelectKaizen={handleKaizenSelect}
                    />
                  )}

                  {/* Pipeline Progress — real-time Flywheel economics */}
                  {showPipelineProgress && (
                    <PipelineProgress
                      totalPapers={totalPapersThisCycle}
                      processedCount={processedCount}
                      greenCount={greenCount}
                      yellowCount={yellowCount}
                      redCount={redCount}
                      tier0Count={state.stats.tier0_classifications}
                      tier2Count={state.stats.tier2_classifications}
                      apiCost={state.stats.total_api_cost_usd}
                      currentStage={pipeline.current_stage}
                    />
                  )}

                  {/* Skill Proposals */}
                  <SkillProposals
                    proposals={skillProposals}
                    onApprove={approveSkillProposal}
                    onReject={rejectSkillProposal}
                  />

                  {/* Pending Governance — ONE-PIECE FLOW */}
                  <PendingGovernance
                    briefings={pendingBriefings}
                    pipelineStage={pipeline.current_stage}
                    currentPaperIndex={pipeline.current_paper_index}
                    totalPapers={totalPapersThisCycle}
                    remainingPapers={state.incoming_papers.length}
                    onApprove={approveBriefing}
                    onReject={rejectBriefing}
                  />
                </>
              ) : (
                <LibraryView briefings={state.approved_briefings} />
              )}
            </div>
          </main>

          {/* RIGHT: Admin — scrolls independently */}
          <aside
            className="w-[40%] overflow-y-auto border-l py-6 px-6"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            {/* Pipeline Trace — live telemetry feed */}
            <PipelineTrace entries={telemetryLog} />

            {/* Skills Library */}
            <SkillsLibrary
              skills={skills}
              onDeprecate={deprecateSkill}
              onDelete={deleteSkill}
            />

            {/* Settings */}
            <SettingsPanel
              settings={settings}
              onUpdate={updateSettings}
              onExportTelemetry={handleExportTelemetry}
              onReset={handleReset}
              telemetryCount={telemetryLog.length}
            />

            {/* Debug: State info — only shown in dev mode */}
            {settings.dev_mode && (
              <details className="mt-4">
                <summary
                  className="font-mono text-xs cursor-pointer py-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Debug: State
                </summary>
                <pre
                  className="mt-2 overflow-auto text-xs p-3 rounded"
                  style={{
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-primary)',
                    maxHeight: '300px',
                    fontSize: '10px',
                  }}
                >
                  {JSON.stringify(
                    {
                      pipeline,
                      stats: state.stats,
                      incoming_papers: state.incoming_papers.length,
                      classified_papers: state.classified_papers.length,
                      pending_briefings: pendingBriefings.length,
                      skills: skills.length,
                      skill_proposals: skillProposals.length,
                      kaizen_proposals: kaizenProposals.length,
                      jidoka_halts: state.jidoka_halts.length,
                      telemetry: telemetryLog.length,
                      settings: {
                        ...settings,
                        api_key: settings.api_key ? '***' : null,
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </aside>
        </div>

        {/* Fixed bottom: FlywheelFooter */}
        <FlywheelFooter
          stats={flywheelStats}
          migrationsThisSession={0}
        />
      </div>
    </AutonomatonContext.Provider>
  )
}

export default App
