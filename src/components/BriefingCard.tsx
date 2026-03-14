/**
 * BriefingCard — A pending briefing awaiting human approval
 *
 * Displays:
 * - Zone badge (GREEN/YELLOW/RED)
 * - Matched topics
 * - Headline and body
 * - Approve/Edit/Reject actions
 * - Expandable provenance trace (transparency as architecture)
 *
 * @license CC BY 4.0
 */

import { useState } from 'react'
import type { DraftBriefing } from '../types/app'
import { PaperTrace } from './PaperTrace'

interface Props {
  briefing: DraftBriefing
  onApprove: (briefingId: string) => void
  onReject: (briefingId: string, reason?: string) => void
}

export function BriefingCard({ briefing, onApprove, onReject }: Props) {
  const [showTrace, setShowTrace] = useState(false)
  const { paper } = briefing

  return (
    <div
      className="p-4 border"
      style={{
        borderColor: 'var(--border)',
        borderRadius: '2px',
      }}
    >
      {/* Header: Zone + Topics */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`zone-badge zone-badge-${paper.zone}`}>
          {paper.zone.toUpperCase()}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {paper.matched_topics.join(' • ')}
        </span>
        {paper.falsification_signal && (
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(232, 90, 58, 0.1)',
              color: 'var(--zone-red-text)',
            }}
          >
            Q6
          </span>
        )}
      </div>

      {/* Headline */}
      <h3
        className="font-body font-bold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {briefing.headline}
      </h3>

      {/* Body */}
      <p
        className="font-body text-sm mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {briefing.body}
      </p>

      {/* Meta: Tier + Pattern Hash */}
      <div
        className="flex items-center gap-3 mb-3 font-mono text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        <span
          className="px-1.5 py-0.5 rounded-sm"
          style={{
            backgroundColor: briefing.compiled_by.tier === 0
              ? 'rgba(94, 191, 80, 0.1)'
              : 'rgba(232, 201, 74, 0.1)',
            color: briefing.compiled_by.tier === 0
              ? 'var(--zone-green-text)'
              : 'var(--zone-yellow-text)',
          }}
        >
          T{briefing.compiled_by.tier}
        </span>
        {briefing.compiled_by.cost_usd != null && briefing.compiled_by.cost_usd > 0 && (
          <span>${briefing.compiled_by.cost_usd.toFixed(4)}</span>
        )}
        <span>hash:{paper.pattern_hash}</span>
        <span>•</span>
        <span>{paper.arxiv_id}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="btn"
          onClick={() => onApprove(briefing.id)}
          style={{
            borderColor: 'var(--zone-green)',
            color: 'var(--zone-green-text)',
          }}
        >
          ✓ Approve
        </button>
        <button className="btn">
          ✎ Edit
        </button>
        <button
          className="btn"
          onClick={() => onReject(briefing.id)}
          style={{
            borderColor: 'var(--zone-red)',
            color: 'var(--zone-red-text)',
          }}
        >
          ✗ Reject
        </button>

        {/* Trace Toggle */}
        <button
          className="btn ml-auto"
          onClick={() => setShowTrace(!showTrace)}
          style={{
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
          }}
        >
          {showTrace ? '▲ Hide Trace' : '▼ Show Trace'}
        </button>
      </div>

      {/* Expandable Provenance Trace */}
      {showTrace && (
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <PaperTrace arxivId={paper.arxiv_id} />
        </div>
      )}
    </div>
  )
}
