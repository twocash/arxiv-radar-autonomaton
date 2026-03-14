/**
 * arXiv Radar — Persisted State Hook
 *
 * Implements Principle #4: Async-First
 * State persists in durable storage. Sessions resume.
 * Context carries across browser restarts.
 *
 * @license CC BY 4.0
 */

import { useEffect, useRef, useCallback } from 'react'
import type { AppState } from '../types/app'
import { saveState, loadState, getInitialState, hasPersistedState } from '../services/persistence'

// Debounce delay for auto-save (ms)
const SAVE_DEBOUNCE_MS = 500

/**
 * Hook that provides state hydration and auto-save functionality.
 *
 * @param state - Current app state
 * @param onHydrate - Callback when state is hydrated from localStorage
 * @returns Object with save function and hydration status
 */
export function usePersistedState(
  state: AppState,
  onHydrate: (state: AppState) => void
) {
  const isHydrated = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate on mount
  useEffect(() => {
    if (isHydrated.current) return

    const persisted = loadState()
    if (persisted) {
      onHydrate(persisted)
      console.log('[Persistence] State hydrated from localStorage')
    } else {
      console.log('[Persistence] No persisted state found, using initial state')
    }

    isHydrated.current = true
  }, [onHydrate])

  // Auto-save on state change (debounced)
  useEffect(() => {
    // Don't save until we've hydrated
    if (!isHydrated.current) return

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      saveState(state)
      // console.log('[Persistence] State saved')
    }, SAVE_DEBOUNCE_MS)

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state])

  // Manual save function
  const save = useCallback(() => {
    saveState(state)
    console.log('[Persistence] State saved (manual)')
  }, [state])

  return {
    save,
    isHydrated: isHydrated.current,
    hasPersistedState: hasPersistedState(),
  }
}

/**
 * Get initial state for the app.
 * Checks localStorage first, falls back to default.
 */
export function getHydratedInitialState(): AppState {
  const persisted = loadState()
  if (persisted) {
    console.log('[Persistence] Using hydrated state')
    return persisted
  }
  console.log('[Persistence] Using initial state')
  return getInitialState()
}
