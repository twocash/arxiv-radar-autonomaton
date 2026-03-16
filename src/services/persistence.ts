/**
 * arXiv Radar — Persistence Service
 *
 * localStorage-based persistence for Async-First principle.
 * State survives browser refresh and session restart.
 *
 * Storage keys:
 * - arxiv-radar-state: Full AppState (minus settings)
 * - arxiv-radar-settings: Settings (separate for security — API key)
 * - arxiv-radar-telemetry: Telemetry log (JSONL for export)
 *
 * @license CC BY 4.0
 */

import type { AppState, Settings, TelemetryEntry } from '../types/app'
import { INITIAL_STATE } from '../state/types'
import { DEFAULT_SETTINGS, INITIAL_APP_STATE } from '../types/app'
import { SEED_SKILLS } from '../config/seedSkills'

// Storage keys
const KEYS = {
  STATE: 'arxiv-radar-state',
  SETTINGS: 'arxiv-radar-settings',
  TELEMETRY: 'arxiv-radar-telemetry',
} as const

// Version for future migrations
const STORAGE_VERSION = 1

// =============================================================================
// STATE PERSISTENCE
// =============================================================================

interface PersistedState {
  version: number
  state: Omit<AppState, 'settings' | 'telemetry_log'>
  persisted_at: string
}

/**
 * Save full app state to localStorage.
 * Settings and telemetry are stored separately.
 */
export function saveState(state: AppState): void {
  try {
    // Extract settings and telemetry (stored separately)
    const { settings, telemetry_log, ...rest } = state

    const persisted: PersistedState = {
      version: STORAGE_VERSION,
      state: rest,
      persisted_at: new Date().toISOString(),
    }

    localStorage.setItem(KEYS.STATE, JSON.stringify(persisted))

    // Save settings separately (API key isolation)
    saveSettings(settings)

    // Save telemetry separately (JSONL format for export)
    saveTelemetry(telemetry_log)
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}

/**
 * Load full app state from localStorage.
 * Returns null if no state exists or state is invalid.
 */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEYS.STATE)
    if (!raw) return null

    const persisted: PersistedState = JSON.parse(raw)

    // Version check for future migrations
    if (persisted.version !== STORAGE_VERSION) {
      console.warn(`State version mismatch: ${persisted.version} !== ${STORAGE_VERSION}`)
      // For now, just use the state as-is
      // Future: Add migration logic here
    }

    // Load settings and telemetry
    const settings = loadSettings()
    const telemetry_log = loadTelemetry()

    // Sanitize pipeline state on hydration
    // is_polling should never persist as true — it's transient runtime state
    const sanitizedState = {
      ...persisted.state,
      pipeline: {
        ...persisted.state.pipeline,
        is_polling: false,
        current_stage: 'idle' as const,
        last_error: null,
      },
    }

    return {
      ...sanitizedState,
      settings,
      telemetry_log,
    } as AppState
  } catch (error) {
    console.error('Failed to load state:', error)
    return null
  }
}

/**
 * Get the full initial state (bundle + app extensions).
 */
export function getInitialState(): AppState {
  return {
    ...INITIAL_STATE,
    ...INITIAL_APP_STATE,
  }
}

// =============================================================================
// SETTINGS PERSISTENCE
// =============================================================================

/**
 * Save settings to localStorage.
 * Stored separately so API key can be excluded from state exports.
 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

/**
 * Load settings from localStorage.
 * Returns default settings if none exist.
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    if (!raw) return DEFAULT_SETTINGS

    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch (error) {
    console.error('Failed to load settings:', error)
    return DEFAULT_SETTINGS
  }
}

// =============================================================================
// TELEMETRY PERSISTENCE
// =============================================================================

/**
 * Save telemetry log to localStorage.
 * Stored as JSON array for simplicity (JSONL on export).
 */
export function saveTelemetry(entries: TelemetryEntry[]): void {
  try {
    localStorage.setItem(KEYS.TELEMETRY, JSON.stringify(entries))
  } catch (error) {
    console.error('Failed to save telemetry:', error)
    // If storage is full, try pruning old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const pruned = entries.slice(-1000) // Keep last 1000 entries
      localStorage.setItem(KEYS.TELEMETRY, JSON.stringify(pruned))
      console.warn('Telemetry pruned to 1000 entries due to storage limits')
    }
  }
}

/**
 * Load telemetry log from localStorage.
 */
export function loadTelemetry(): TelemetryEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.TELEMETRY)
    if (!raw) return []

    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to load telemetry:', error)
    return []
  }
}

/**
 * Append a single telemetry entry.
 * More efficient than saving the full array for single entries.
 */
export function appendTelemetry(entry: TelemetryEntry): void {
  const entries = loadTelemetry()
  entries.push(entry)
  saveTelemetry(entries)
}

/**
 * Export telemetry as JSONL (newline-delimited JSON).
 * This format is standard for log analysis tools.
 */
export function exportTelemetryAsJsonl(): string {
  const entries = loadTelemetry()
  return entries.map(e => JSON.stringify(e)).join('\n')
}

/**
 * Download telemetry as a JSONL file.
 */
export function downloadTelemetry(): void {
  const jsonl = exportTelemetryAsJsonl()
  const blob = new Blob([jsonl], { type: 'application/jsonl' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `arxiv-radar-telemetry-${new Date().toISOString().slice(0, 10)}.jsonl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =============================================================================
// CLEAR / RESET
// =============================================================================

/**
 * Clear all persisted data.
 * Use with confirmation — this is destructive.
 */
export function clearAll(): void {
  localStorage.removeItem(KEYS.STATE)
  localStorage.removeItem(KEYS.SETTINGS)
  localStorage.removeItem(KEYS.TELEMETRY)
}

/**
 * Clear telemetry only.
 */
export function clearTelemetry(): void {
  localStorage.removeItem(KEYS.TELEMETRY)
}

/**
 * Check if any state exists in localStorage.
 */
export function hasPersistedState(): boolean {
  return localStorage.getItem(KEYS.STATE) !== null
}
