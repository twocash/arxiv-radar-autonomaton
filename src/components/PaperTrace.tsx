/**
 * PaperTrace — Expandable provenance chain for a paper
 *
 * The "transparency as architecture" proof:
 * Can an auditor reconstruct any system decision from telemetry alone?
 *
 * Shows every event in chronological order:
 * - Classification tier decision
 * - Jidoka halts and resolutions
 * - Compilation cost
 * - Human feedback
 * - Skill firings
 *
 * @license CC BY 4.0
 */

import type { TelemetryEntry } from '../types/app'
import { getProvenanceChain } from '../services/telemetry'

interface Props {
  arxivId: string
  /** Optional: pass entries directly instead of fetching */
  entries?: TelemetryEntry[]
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getEventIcon(event: string, jidoka?: boolean): string {
  if (jidoka) return '⚠'

  switch (event) {
    case 'poll_started':
    case 'poll_complete':
      return '📡'
    case 'paper_classified':
      return '🔍'
    case 'skill_fired':
      return '⚡'
    case 'briefing_compiled':
      return '📝'
    case 'briefing_approved':
      return '✓'
    case 'briefing_rejected':
      return '✗'
    case 'briefing_edited':
      return '✎'
    case 'jidoka_halt':
      return '🛑'
    case 'jidoka_resolved':
      return '✓'
    case 'archived':
      return '📦'
    case 'skill_promoted':
      return '↑'
    default:
      return '•'
  }
}

function getEventColor(event: string, jidoka?: boolean): string {
  if (jidoka) return 'var(--zone-red-text)'

  switch (event) {
    case 'briefing_approved':
    case 'jidoka_resolved':
    case 'skill_promoted':
      return 'var(--zone-green-text)'
    case 'briefing_rejected':
    case 'jidoka_halt':
      return 'var(--zone-red-text)'
    case 'skill_fired':
      return 'var(--accent)'
    default:
      return 'var(--text-secondary)'
  }
}

function TraceEntry({ entry }: { entry: TelemetryEntry }) {
  const icon = getEventIcon(entry.event, entry.jidoka)
  const color = getEventColor(entry.event, entry.jidoka)

  return (
    <div
      className="flex items-start gap-3 py-2 border-l-2 pl-3 ml-2"
      style={{ borderColor: color }}
    >
      {/* Icon */}
      <span className="text-sm" style={{ minWidth: '1.25rem' }}>
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Event name */}
          <span
            className="font-mono text-xs font-medium"
            style={{ color }}
          >
            {entry.event.replace(/_/g, ' ')}
          </span>

          {/* Stage badge */}
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
            }}
          >
            {entry.stage}
          </span>

          {/* Timestamp */}
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {formatTimestamp(entry.ts)}
          </span>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {/* Tier */}
          {entry.tier !== undefined && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: entry.tier === 0
                  ? 'rgba(94, 191, 80, 0.1)'
                  : 'rgba(232, 201, 74, 0.1)',
                color: entry.tier === 0
                  ? 'var(--zone-green-text)'
                  : 'var(--zone-yellow-text)',
              }}
            >
              T{entry.tier}
            </span>
          )}

          {/* Zone */}
          {entry.zone && (
            <span className={`zone-badge zone-badge-${entry.zone}`}>
              {entry.zone}
            </span>
          )}

          {/* Cost */}
          {entry.cost_usd !== undefined && entry.cost_usd > 0 && (
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--zone-yellow-text)' }}
            >
              ${entry.cost_usd.toFixed(4)}
            </span>
          )}

          {/* Human feedback */}
          {entry.human_feedback && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: entry.human_feedback === 'approved'
                  ? 'rgba(94, 191, 80, 0.1)'
                  : entry.human_feedback === 'rejected'
                    ? 'rgba(232, 90, 58, 0.1)'
                    : 'rgba(212, 98, 26, 0.1)',
                color: entry.human_feedback === 'approved'
                  ? 'var(--zone-green-text)'
                  : entry.human_feedback === 'rejected'
                    ? 'var(--zone-red-text)'
                    : 'var(--accent)',
              }}
            >
              {entry.human_feedback}
            </span>
          )}

          {/* Skill ID */}
          {entry.skill_id && (
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--accent)' }}
            >
              skill:{entry.skill_id.slice(0, 8)}
            </span>
          )}

          {/* Details */}
          {entry.details && (
            <span
              className="font-mono text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {entry.details}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function PaperTrace({ arxivId, entries: providedEntries }: Props) {
  const entries = providedEntries ?? getProvenanceChain(arxivId)

  if (entries.length === 0) {
    return (
      <div
        className="font-mono text-xs py-2"
        style={{ color: 'var(--text-muted)' }}
      >
        No telemetry entries for this paper.
      </div>
    )
  }

  return (
    <div className="py-2">
      <div
        className="font-mono text-[10px] mb-2 flex items-center gap-2"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>PROVENANCE CHAIN</span>
        <span>•</span>
        <span>{entries.length} events</span>
        <span>•</span>
        <span>{arxivId}</span>
      </div>

      <div className="space-y-0">
        {entries.map((entry, i) => (
          <TraceEntry key={`${entry.ts}-${i}`} entry={entry} />
        ))}
      </div>
    </div>
  )
}
