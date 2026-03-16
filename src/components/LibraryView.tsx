/**
 * LibraryView — Research Corpus Browser
 *
 * Displays saved briefings with expand/collapse cards.
 * Filters by thesis signal and zone.
 *
 * @license CC BY 4.0
 */

import { useState } from 'react'
import type { ApprovedBriefing, ThesisSignal } from '../state/types'
import type { Zone } from '../config/zones'
import { ShareButton } from './ShareButton'

interface Props {
  briefings: ApprovedBriefing[]
}

// Thesis signal display config
const THESIS_BADGES: Record<ThesisSignal, { emoji: string; label: string; color: string }> = {
  supports_decentralized: { emoji: '🟢', label: 'Decentralized', color: 'var(--zone-green-text)' },
  supports_centralized: { emoji: '🔴', label: 'Centralized', color: 'var(--zone-red-text)' },
  neutral: { emoji: '⚪', label: 'Neutral', color: 'var(--text-muted)' },
}

// Filter options
type ThesisFilter = ThesisSignal | 'all'
type ZoneFilter = Zone | 'all'

export function LibraryView({ briefings }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [thesisFilter, setThesisFilter] = useState<ThesisFilter>('all')
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all')

  // Toggle card expansion
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Apply filters
  const filteredBriefings = briefings.filter(b => {
    if (thesisFilter !== 'all' && b.thesis_signal !== thesisFilter) return false
    if (zoneFilter !== 'all' && b.paper.zone !== zoneFilter) return false
    return true
  })

  // Sort by most recent first
  const sortedBriefings = [...filteredBriefings].sort((a, b) =>
    new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
  )

  // Format date for display
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="card">
      <h2
        className="font-mono text-sm mb-4 flex items-center gap-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>Research Library</span>
        {briefings.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-sm text-xs"
            style={{
              backgroundColor: 'rgba(94, 191, 80, 0.1)',
              color: 'var(--zone-green-text)',
            }}
          >
            {briefings.length} saved
          </span>
        )}
      </h2>

      {/* Filters */}
      {briefings.length > 0 && (
        <div
          className="flex flex-wrap gap-4 mb-4 pb-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Thesis Signal Filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              Thesis:
            </span>
            <div className="flex gap-1">
              {(['all', 'supports_decentralized', 'supports_centralized', 'neutral'] as const).map(option => (
                <button
                  key={option}
                  className="btn px-2 py-1 text-xs"
                  style={{
                    borderColor: thesisFilter === option ? 'var(--accent)' : 'var(--border)',
                    color: thesisFilter === option ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                  onClick={() => setThesisFilter(option)}
                >
                  {option === 'all' ? 'All' : THESIS_BADGES[option].emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Zone Filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              Zone:
            </span>
            <div className="flex gap-1">
              {(['all', 'yellow', 'red'] as const).map(option => (
                <button
                  key={option}
                  className="btn px-2 py-1 text-xs"
                  style={{
                    borderColor: zoneFilter === option ? 'var(--accent)' : 'var(--border)',
                    color: zoneFilter === option ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                  onClick={() => setZoneFilter(option)}
                >
                  {option === 'all' ? 'All' : option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {briefings.length === 0 ? (
        <div className="text-center py-8">
          <p
            className="font-mono text-sm mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Your library is empty
          </p>
          <p
            className="font-mono text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Save promising research to build your corpus
          </p>
        </div>
      ) : sortedBriefings.length === 0 ? (
        <div className="text-center py-8">
          <p
            className="font-mono text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No briefings match the selected filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBriefings.map(briefing => {
            const isExpanded = expandedIds.has(briefing.id)
            const thesis = THESIS_BADGES[briefing.thesis_signal]

            return (
              <div
                key={briefing.id}
                className="p-3 border rounded-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Collapsed Header — always visible */}
                <button
                  className="w-full text-left flex items-start justify-between gap-3"
                  onClick={() => toggleExpanded(briefing.id)}
                >
                  <div className="flex-1 min-w-0">
                    {/* Badges Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`zone-badge zone-badge-${briefing.paper.zone}`}>
                        {briefing.paper.zone.toUpperCase()}
                      </span>
                      <span
                        className="font-mono text-xs"
                        style={{ color: thesis.color }}
                      >
                        {thesis.emoji}
                      </span>
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatDate(briefing.approved_at)}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3
                      className="font-body font-semibold text-sm line-clamp-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {briefing.headline}
                    </h3>
                  </div>

                  {/* Expand/Collapse Indicator */}
                  <span
                    className="font-mono text-xs flex-shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    className="mt-3 pt-3 border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Lead (Why This Matters) */}
                    <p
                      className="font-body text-sm mb-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {briefing.lead || briefing.body}
                    </p>

                    {/* Analysis (if present) */}
                    {briefing.analysis && (
                      <p
                        className="font-body text-sm mb-3"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {briefing.analysis}
                      </p>
                    )}

                    {/* Thesis Reason */}
                    {briefing.thesis_reason && (
                      <p
                        className="font-mono text-xs mb-3 italic"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {thesis.emoji} {briefing.thesis_reason}
                      </p>
                    )}

                    {/* Key Claims */}
                    {briefing.key_claims && briefing.key_claims.length > 0 && (
                      <div className="mb-3">
                        <h4
                          className="font-mono text-xs uppercase tracking-wider mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Key Claims
                        </h4>
                        <ul className="list-disc list-inside">
                          {briefing.key_claims.map((claim, i) => (
                            <li
                              key={i}
                              className="font-body text-xs"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {claim}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Caveats */}
                    {briefing.caveats && briefing.caveats.length > 0 && (
                      <div className="mb-3">
                        <h4
                          className="font-mono text-xs uppercase tracking-wider mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Caveats
                        </h4>
                        <ul className="list-disc list-inside">
                          {briefing.caveats.map((caveat, i) => (
                            <li
                              key={i}
                              className="font-body text-xs"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {caveat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Meta Row: Topics + arXiv Link */}
                    <div
                      className="flex flex-wrap items-center gap-3 font-mono text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>{briefing.paper.matched_topics.join(' • ')}</span>
                      <span>•</span>
                      <a
                        href={briefing.arxiv_url || briefing.paper.arxiv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        View on arXiv →
                      </a>
                    </div>

                    {/* Share Button — only for social_post voice */}
                    {briefing.voice_preset === 'social_post' && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <ShareButton briefing={briefing} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
