/**
 * arXiv Radar — Main Application
 *
 * Root component implementing the Autonomaton pattern.
 * Provides the single context for state management.
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
import { SkillsLibrary } from './components/SkillsLibrary'
import { SettingsPanel } from './components/SettingsPanel'
import type { VoicePresetId } from './config/voices'

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
  } = autonomaton

  // Voice preset state (will be moved to app state in future)
  const [voicePreset, setVoicePreset] = useState<VoicePresetId>('news_brief')

  const hasError = pipeline.last_error !== null

  const handleRun = useCallback((_query?: string) => {
    startPipeline()
  }, [startPipeline])

  const handleKaizenSelect = useCallback((proposalId: string, optionAction: string) => {
    transition({ type: 'KAIZEN_OPTION_SELECTED', proposalId, optionAction })
  }, [transition])

  const handleExportTelemetry = useCallback(() => {
    // Export handled in SettingsPanel, just log
    console.log('[App] Telemetry exported')
  }, [])

  const handleReset = useCallback(() => {
    transition({ type: 'RESET_STATE' })
    // Clear localStorage
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
      <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Command Bar */}
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

        {/* Glass Pipeline */}
        <GlassPipeline
          currentStage={pipeline.current_stage}
          hasError={hasError}
          isPolling={pipeline.is_polling}
          hasUnresolvedHalts={hasUnresolvedHalts}
        />

        {/* Jidoka Alert */}
        {hasUnresolvedHalts && currentHalt && (
          <JidokaAlert
            halt={currentHalt}
            kaizenProposal={currentKaizen}
            onResolve={resolveJidoka}
            onSelectKaizen={handleKaizenSelect}
          />
        )}

        {/* Main Content */}
        <main className="px-6 py-6">
          {/* Skill Proposals */}
          <SkillProposals
            proposals={skillProposals}
            onApprove={approveSkillProposal}
            onReject={rejectSkillProposal}
          />

          {/* Pending Governance */}
          <PendingGovernance
            briefings={pendingBriefings}
            onApprove={approveBriefing}
            onReject={rejectBriefing}
          />

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
            <details className="mt-6">
              <summary
                className="font-mono text-xs cursor-pointer py-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Debug: State
              </summary>
              <pre
                className="card mt-2 overflow-auto text-xs"
                style={{
                  color: 'var(--text-muted)',
                  maxHeight: '300px',
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
        </main>

        {/* Flywheel Footer */}
        <FlywheelFooter
          stats={flywheelStats}
          migrationsThisSession={0}
        />
      </div>
    </AutonomatonContext.Provider>
  )
}

export default App
