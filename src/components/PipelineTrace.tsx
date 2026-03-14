/**
 * PipelineTrace — Live telemetry feed
 *
 * Primary "what is the system doing" visibility tool.
 * Shows every stage transition, classification, halt, resolution.
 * Replaces digging through Debug State or console logs.
 *
 * The user watches the pipeline work in real time.
 *
 * @license CC BY 4.0
 */

import { useEffect, useRef } from 'react'
import type { TelemetryEntry } from '../types/app'

interface Props {
  entries: TelemetryEntry[]
  maxEntries?: number
}

function getEventIcon(entry: TelemetryEntry): { icon: string; color: string } {
  // Jidoka events
  if (entry.jidoka) {
    if (entry.event === 'jidoka_halt') {
      return { icon: '⚠', color: 'var(--zone-red-text)' }
    }
    if (entry.event === 'jidoka_resolved') {
      return { icon: '✓', color: 'var(--zone-green-text)' }
    }
  }

  // Human feedback events
  if (entry.human_feedback) {
    switch (entry.human_feedback) {
      case 'approved':
        return { icon: '✓', color: 'var(--zone-green-text)' }
      case 'rejected':
        return { icon: '✗', color: 'var(--zone-red-text)' }
      case 'edited':
        return { icon: '✎', color: 'var(--zone-yellow-text)' }
      case 'resolved':
        return { icon: '✓', color: 'var(--zone-green-text)' }
    }
  }

  // Stage-specific events
  switch (entry.event) {
    case 'poll_started':
    case 'poll_complete':
      return { icon: '↓', color: 'var(--accent)' }
    case 'paper_classified':
      return { icon: '◆', color: entry.zone === 'green' ? 'var(--zone-green-text)' : entry.zone === 'red' ? 'var(--zone-red-text)' : 'var(--zone-yellow-text)' }
    case 'briefing_compiled':
      return { icon: '◇', color: 'var(--accent)' }
    case 'skill_fired':
      return { icon: '⚡', color: 'var(--zone-green-text)' }
    case 'skill_promoted':
      return { icon: '↑', color: 'var(--zone-green-text)' }
    case 'invalid_transition':
      return { icon: '⚠', color: 'var(--zone-red-text)' }
    default:
      return { icon: '•', color: 'var(--text-muted)' }
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatDetails(entry: TelemetryEntry): string {
  if (entry.arxiv_id) {
    const shortId = entry.arxiv_id.slice(-8)
    if (entry.zone) {
      return `${shortId} → ${entry.zone.toUpperCase()}`
    }
    return shortId
  }
  if (entry.event === 'poll_complete' && entry.details) {
    return entry.details
  }
  if (entry.skill_id) {
    return `skill: ${entry.skill_id.slice(0, 8)}`
  }
  if (entry.details) {
    return entry.details.slice(0, 30)
  }
  return ''
}

export function PipelineTrace({ entries, maxEntries = 50 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom (newest) on new entries
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries.length])

  // Show most recent entries (reversed so newest at bottom with auto-scroll)
  const visibleEntries = entries.slice(-maxEntries)

  return (
    <details open className="mb-4">
      <summary
        className="cursor-pointer select-none text-xs font-medium py-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Pipeline Trace ({entries.length})
      </summary>

      <div
        ref={containerRef}
        className="overflow-y-auto font-mono"
        style={{
          maxHeight: '200px',
          fontSize: '10px',
          lineHeight: '1.4',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          padding: '8px',
        }}
      >
        {visibleEntries.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>
            No events yet. Click RUN to start.
          </div>
        ) : (
          visibleEntries.map((entry, i) => {
            const { icon, color } = getEventIcon(entry)
            return (
              <div
                key={`${entry.ts}-${i}`}
                className="flex items-start gap-2 py-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span style={{ color, width: '12px', flexShrink: 0 }}>{icon}</span>
                <span className="truncate" style={{ minWidth: '80px', maxWidth: '100px' }}>
                  {entry.event}
                </span>
                <span style={{ color: 'var(--text-muted)', minWidth: '70px' }}>
                  {formatTime(entry.ts)}
                </span>
                <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                  {formatDetails(entry)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </details>
  )
}
