/**
 * BriefingCard — A pending briefing awaiting human review
 *
 * Displays:
 * - Zone badge (YELLOW/RED) + Thesis signal (🟢/🔴/⚪)
 * - Matched topics
 * - Headline and lead (structured content)
 * - Save to Library / Edit & Save / Skip actions
 * - Expandable provenance trace (transparency as architecture)
 *
 * @license CC BY 4.0
 */

import { useState } from 'react'
import type { DraftBriefing } from '../types/app'
import { PaperTrace } from './PaperTrace'
import { ShareButton } from './ShareButton'

interface Props {
  briefing: DraftBriefing
  onApprove: (briefingId: string) => void
  onReject: (briefingId: string, reason?: string) => void
}

// Thesis signal display
const THESIS_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  supports_decentralized: { emoji: '🟢', label: 'Decentralized', color: 'var(--zone-green-text)' },
  supports_centralized: { emoji: '🔴', label: 'Centralized', color: 'var(--zone-red-text)' },
  neutral: { emoji: '⚪', label: 'Neutral', color: 'var(--text-muted)' },
}

export function BriefingCard({ briefing, onApprove, onReject }: Props) {
  const [showTrace, setShowTrace] = useState(false)
  const { paper } = briefing
  const thesis = THESIS_BADGES[briefing.thesis_signal] || THESIS_BADGES.neutral

  return (
    <div
      className="p-4 border"
      style={{
        borderColor: 'var(--border)',
        borderRadius: '2px',
      }}
    >
      {/* Header: Zone + Thesis Signal + Topics */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`zone-badge zone-badge-${paper.zone}`}>
          {paper.zone.toUpperCase()}
        </span>
        <span
          className="font-mono text-xs px-1.5 py-0.5 rounded-sm"
          style={{ color: thesis.color }}
          title={briefing.thesis_reason}
        >
          {thesis.emoji} {thesis.label}
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

      {/* Lead (Why This Matters) - prefer lead, fall back to body */}
      <p
        className="font-body text-sm mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {briefing.lead || briefing.body}
      </p>

      {/* Thesis Reason */}
      {briefing.thesis_reason && (
        <p
          className="font-mono text-xs mb-3 italic"
          style={{ color: 'var(--text-muted)' }}
        >
          {thesis.emoji} {briefing.thesis_reason}
        </p>
      )}

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
          ✓ Save to Library
        </button>
        <button className="btn">
          ✎ Edit & Save
        </button>
        <button
          className="btn"
          onClick={() => onReject(briefing.id)}
          style={{
            borderColor: 'var(--text-muted)',
            color: 'var(--text-muted)',
          }}
        >
          Skip
        </button>

        {/* Share Button — only for social_post voice */}
        {briefing.voice_preset === 'social_post' && (
          <ShareButton briefing={briefing} />
        )}

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
