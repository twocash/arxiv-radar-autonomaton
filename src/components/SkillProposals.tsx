/**
 * SkillProposals — Flywheel promotion candidates
 *
 * When the Flywheel detects a recurring pattern (3+ approvals with same hash),
 * it proposes promoting that pattern to a Tier 0 skill.
 *
 * Approved skills handle future matches automatically — no API call needed.
 * This is the economic payoff made visible.
 *
 * @license CC BY 4.0
 */

import type { SkillProposal } from '../types/app'

interface Props {
  proposals: SkillProposal[]
  onApprove: (proposalId: string) => void
  onReject: (proposalId: string) => void
}

function formatAction(action: SkillProposal['proposed_action']): string {
  switch (action) {
    case 'auto_archive':
      return 'Auto-archive (skip briefing)'
    case 'auto_classify':
      return 'Auto-classify (fast-track)'
    case 'auto_brief':
      return 'Auto-brief (priority processing)'
    default:
      return action
  }
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: SkillProposal
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div
      className="p-4 border"
      style={{
        borderColor: 'var(--accent)',
        borderRadius: '2px',
        backgroundColor: 'rgba(212, 98, 26, 0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: 'rgba(212, 98, 26, 0.2)',
            color: 'var(--accent)',
          }}
        >
          FLYWHEEL
        </span>
        <span className={`zone-badge zone-badge-${proposal.zone}`}>
          {proposal.zone.toUpperCase()}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {proposal.times_seen} approvals
        </span>
      </div>

      {/* Name */}
      <h3
        className="font-mono text-sm font-medium mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {proposal.name}
      </h3>

      {/* Description */}
      <p
        className="font-mono text-xs mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {proposal.description}
      </p>

      {/* Details */}
      <div
        className="flex flex-wrap gap-3 mb-3 font-mono text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {/* Topics */}
        {proposal.matched_topics.length > 0 && (
          <span>
            Topics: {proposal.matched_topics.join(', ')}
          </span>
        )}

        {/* Keywords */}
        {proposal.matched_keywords.length > 0 && (
          <span>
            Keywords: {proposal.matched_keywords.slice(0, 3).join(', ')}
            {proposal.matched_keywords.length > 3 && '...'}
          </span>
        )}

        {/* Action */}
        <span style={{ color: 'var(--zone-green-text)' }}>
          → {formatAction(proposal.proposed_action)}
        </span>
      </div>

      {/* Pattern Hash */}
      <p
        className="font-mono text-[10px] mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Pattern: {proposal.pattern_hash}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="btn"
          onClick={onApprove}
          style={{
            borderColor: 'var(--zone-green)',
            color: 'var(--zone-green-text)',
          }}
        >
          ↑ Promote to T0
        </button>
        <button
          className="btn"
          onClick={onReject}
        >
          Reject
        </button>
      </div>

      {/* Time range */}
      <p
        className="font-mono text-[10px] mt-3"
        style={{ color: 'var(--text-muted)' }}
      >
        First seen: {new Date(proposal.first_seen).toLocaleDateString()} •
        Last seen: {new Date(proposal.last_seen).toLocaleDateString()}
      </p>
    </div>
  )
}

export function SkillProposals({ proposals, onApprove, onReject }: Props) {
  if (proposals.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h2
        className="font-mono text-sm mb-4 flex items-center gap-2"
        style={{ color: 'var(--accent)' }}
      >
        <span>Skill Proposals</span>
        <span
          className="px-2 py-0.5 rounded-sm text-xs"
          style={{
            backgroundColor: 'rgba(212, 98, 26, 0.1)',
          }}
        >
          {proposals.length}
        </span>
      </h2>

      <div className="space-y-4">
        {proposals.map(proposal => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onApprove={() => onApprove(proposal.id)}
            onReject={() => onReject(proposal.id)}
          />
        ))}
      </div>
    </div>
  )
}
