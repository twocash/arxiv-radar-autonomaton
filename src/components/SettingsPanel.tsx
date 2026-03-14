/**
 * SettingsPanel — Configuration UI
 *
 * Manages:
 * - API key (for Tier 2 classification)
 * - Dev mode toggle (uses seed data, no API)
 * - Flywheel threshold configuration
 * - Telemetry export
 * - State reset
 *
 * @license CC BY 4.0
 */

import { useState } from 'react'
import type { Settings } from '../types/app'
import { exportTelemetryAsJsonl } from '../services/telemetry'

interface Props {
  settings: Settings
  onUpdate: (settings: Partial<Settings>) => void
  onExportTelemetry: () => void
  onReset: () => void
  telemetryCount: number
}

export function SettingsPanel({
  settings,
  onUpdate,
  onExportTelemetry,
  onReset,
  telemetryCount,
}: Props) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(settings.api_key || '')
  const [confirmReset, setConfirmReset] = useState(false)

  const handleApiKeySave = () => {
    onUpdate({ api_key: apiKeyInput || null })
  }

  const handleExport = () => {
    const jsonl = exportTelemetryAsJsonl()
    const blob = new Blob([jsonl], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arxiv-radar-telemetry-${new Date().toISOString().slice(0, 10)}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
    onExportTelemetry()
  }

  const handleReset = () => {
    if (confirmReset) {
      onReset()
      setConfirmReset(false)
    } else {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
    }
  }

  return (
    <details className="mt-6">
      <summary
        className="font-mono text-sm cursor-pointer py-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Settings
      </summary>

      <div className="card mt-2 space-y-6">
        {/* Dev Mode */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dev_mode}
              onChange={e => onUpdate({ dev_mode: e.target.checked })}
              className="w-4 h-4"
            />
            <div>
              <span
                className="font-mono text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Dev Mode
              </span>
              <p
                className="font-mono text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Uses seed data (7 papers). No API key required.
              </p>
            </div>
          </label>
        </div>

        {/* API Key */}
        <div>
          <label
            className="font-mono text-sm block mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Anthropic API Key
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1"
              disabled={settings.dev_mode}
              style={{ opacity: settings.dev_mode ? 0.5 : 1 }}
            />
            <button
              className="btn"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={settings.dev_mode}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
            <button
              className="btn"
              onClick={handleApiKeySave}
              disabled={settings.dev_mode || apiKeyInput === (settings.api_key || '')}
              style={{
                borderColor: 'var(--zone-green)',
                color: 'var(--zone-green-text)',
              }}
            >
              Save
            </button>
          </div>
          {settings.dev_mode && (
            <p
              className="font-mono text-xs mt-1"
              style={{ color: 'var(--zone-yellow-text)' }}
            >
              Disable dev mode to use API key
            </p>
          )}
        </div>

        {/* Flywheel Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="font-mono text-sm block mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Flywheel Threshold
            </label>
            <input
              type="number"
              min={2}
              max={10}
              value={settings.flywheel_threshold}
              onChange={e => onUpdate({ flywheel_threshold: parseInt(e.target.value) || 3 })}
              className="w-full"
            />
            <p
              className="font-mono text-xs mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Approvals before proposing skill
            </p>
          </div>

          <div>
            <label
              className="font-mono text-sm block mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Flywheel Window (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={settings.flywheel_window_days}
              onChange={e => onUpdate({ flywheel_window_days: parseInt(e.target.value) || 14 })}
              className="w-full"
            />
            <p
              className="font-mono text-xs mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Time window for pattern detection
            </p>
          </div>
        </div>

        {/* Telemetry Export */}
        <div>
          <label
            className="font-mono text-sm block mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Telemetry
          </label>
          <div className="flex items-center gap-4">
            <button className="btn" onClick={handleExport}>
              Export JSONL
            </button>
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {telemetryCount} entries
            </span>
          </div>
        </div>

        {/* Reset */}
        <div
          className="pt-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            className="btn"
            onClick={handleReset}
            style={{
              borderColor: confirmReset ? 'var(--zone-red)' : 'var(--border)',
              color: confirmReset ? 'var(--zone-red-text)' : 'var(--text-secondary)',
            }}
          >
            {confirmReset ? 'Click again to confirm reset' : 'Reset All State'}
          </button>
          <p
            className="font-mono text-xs mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Clears all papers, skills, telemetry. Cannot be undone.
          </p>
        </div>
      </div>
    </details>
  )
}
