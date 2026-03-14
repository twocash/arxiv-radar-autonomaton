/**
 * PendingGovernance — Briefings awaiting human approval
 *
 * Central governance panel showing all pending briefings.
 * Each briefing card shows the paper, zone, and expandable provenance trace.
 *
 * @license CC BY 4.0
 */

import type { DraftBriefing } from '../types/app'
import { BriefingCard } from './BriefingCard'

interface Props {
  briefings: DraftBriefing[]
  onApprove: (briefingId: string) => void
  onReject: (briefingId: string, reason?: string) => void
}

export function PendingGovernance({ briefings, onApprove, onReject }: Props) {
  return (
    <div className="card">
      <h2
        className="font-mono text-sm mb-4 flex items-center gap-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>Pending Governance</span>
        {briefings.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-sm text-xs"
            style={{
              backgroundColor: 'rgba(232, 201, 74, 0.1)',
              color: 'var(--zone-yellow-text)',
            }}
          >
            {briefings.length}
          </span>
        )}
      </h2>

      {briefings.length === 0 ? (
        <div className="text-center py-8">
          <p
            className="font-mono text-sm mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            All papers processed
          </p>
          <p
            className="font-mono text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Pipeline idle. Click RUN to fetch new papers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefings.map(briefing => (
            <BriefingCard
              key={briefing.id}
              briefing={briefing}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
