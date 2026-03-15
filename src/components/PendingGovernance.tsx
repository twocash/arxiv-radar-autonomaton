/**
 * PendingGovernance — Briefings awaiting human approval
 *
 * Central governance panel showing all pending briefings.
 * Each briefing card shows the paper, zone, and expandable provenance trace.
 *
 * @license CC BY 4.0
 */

import type { DraftBriefing } from '../types/app'
import type { PipelineStage } from '../state/types'
import { BriefingCard } from './BriefingCard'

interface Props {
  briefings: DraftBriefing[]
  pipelineStage: PipelineStage
  onApprove: (briefingId: string) => void
  onReject: (briefingId: string, reason?: string) => void
}

function getEmptyStateMessage(stage: PipelineStage): { title: string; subtitle: string } {
  switch (stage) {
    case 'telemetry':
      return {
        title: 'Fetching papers from arXiv...',
        subtitle: 'Telemetry stage — gathering today\'s submissions',
      }
    case 'recognition':
      return {
        title: 'Classifying papers...',
        subtitle: 'Recognition stage — Tier 0/2 classification in progress',
      }
    case 'compilation':
      return {
        title: 'Generating briefings...',
        subtitle: 'Compilation stage — drafting YELLOW/RED briefings',
      }
    case 'execution':
      return {
        title: 'Executing approved actions...',
        subtitle: 'Execution stage — publishing briefings',
      }
    case 'approval':
    case 'idle':
    default:
      return {
        title: 'All papers processed',
        subtitle: 'Pipeline idle. Click RUN to fetch new papers.',
      }
  }
}

export function PendingGovernance({ briefings, pipelineStage, onApprove, onReject }: Props) {
  const emptyMessage = getEmptyStateMessage(pipelineStage)
  const isActive = pipelineStage !== 'idle' && pipelineStage !== 'approval'

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
        {isActive && briefings.length === 0 && (
          <span
            className="px-2 py-0.5 rounded-sm text-xs animate-pulse"
            style={{
              backgroundColor: 'rgba(212, 98, 26, 0.15)',
              color: 'var(--accent)',
            }}
          >
            {pipelineStage}
          </span>
        )}
      </h2>

      {briefings.length === 0 ? (
        <div className="text-center py-8">
          <p
            className="font-mono text-sm mb-2"
            style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            {emptyMessage.title}
          </p>
          <p
            className="font-mono text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {emptyMessage.subtitle}
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
