/**
 * CommandBar — Header with query input and pipeline controls
 *
 * The command center for the Autonomaton. Contains:
 * - Logo and version
 * - Query input (for arXiv search)
 * - Voice preset selector
 * - RUN button (triggers pipeline)
 *
 * Keyboard shortcut: Cmd+Enter (Mac) or Ctrl+Enter (Windows) to RUN
 *
 * @license CC BY 4.0
 */

import { useEffect, useCallback, useState, useMemo } from 'react'
import { VoiceSelector } from './VoiceSelector'
import type { VoicePresetId } from '../config/voices'
import type { PipelineStage } from '../state/types'

interface Props {
  version: string
  devMode: boolean
  isPolling: boolean
  pipelineStage: PipelineStage
  hasUnresolvedHalts: boolean
  voicePreset: VoicePresetId
  onVoiceChange: (voice: VoicePresetId) => void
  onRun: (query?: string) => void
}

export function CommandBar({
  version,
  devMode,
  isPolling,
  pipelineStage,
  hasUnresolvedHalts,
  voicePreset,
  onVoiceChange,
  onRun,
}: Props) {
  const [query, setQuery] = useState('')

  // Derive button state from pipeline state
  const buttonState = useMemo(() => {
    if (hasUnresolvedHalts) return 'halted'
    if (isPolling || ['telemetry', 'recognition', 'compilation'].includes(pipelineStage)) return 'running'
    return 'idle'
  }, [hasUnresolvedHalts, isPolling, pipelineStage])

  const isDisabled = buttonState !== 'idle'

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to run
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isDisabled) {
          onRun(query || undefined)
        }
      }
    },
    [isDisabled, onRun, query]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDisabled) {
      onRun(query || undefined)
    }
  }

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Logo + Version */}
      <div className="flex items-center gap-4">
        <h1
          className="font-heading text-2xl"
          style={{ color: 'var(--text-primary)' }}
        >
          arXiv Radar
        </h1>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: devMode ? 'rgba(232, 201, 74, 0.1)' : 'rgba(94, 191, 80, 0.1)',
            color: devMode ? 'var(--zone-yellow-text)' : 'var(--zone-green-text)',
          }}
        >
          {version} • {devMode ? 'Dev' : 'Live'}
        </span>
      </div>

      {/* Query Input + Controls */}
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        {/* Query Input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={devMode ? 'Using seed data...' : 'arXiv query (e.g., "small language models")'}
            disabled={devMode || isPolling}
            className="w-64 pr-8"
            style={{
              opacity: devMode ? 0.5 : 1,
            }}
          />
          {query && !devMode && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          )}
        </div>

        {/* Voice Selector */}
        <VoiceSelector value={voicePreset} onChange={onVoiceChange} />

        {/* RUN Button */}
        <button
          type="submit"
          className={`btn min-w-24 ${buttonState === 'halted' ? '' : 'btn-primary'}`}
          disabled={isDisabled}
          style={buttonState === 'halted' ? {
            backgroundColor: 'rgba(232, 90, 58, 0.2)',
            color: 'var(--zone-red-text)',
            borderColor: 'var(--zone-red-text)',
          } : undefined}
        >
          {buttonState === 'running' ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">◌</span>
              Running
            </span>
          ) : buttonState === 'halted' ? (
            <span className="flex items-center gap-2">
              ⚠ HALTED
            </span>
          ) : (
            <span className="flex items-center gap-2">
              RUN
              <span className="text-[10px] opacity-70">⌘↵</span>
            </span>
          )}
        </button>
      </form>
    </header>
  )
}
