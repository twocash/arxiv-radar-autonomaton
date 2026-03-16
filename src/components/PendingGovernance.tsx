/**
 * PendingGovernance — ONE-PIECE FLOW Governance Panel
 *
 * Shows ONE briefing at a time for human approval.
 * In one-piece flow, each YELLOW/RED paper halts here for governance
 * before the next paper is processed.
 *
 * @license CC BY 4.0
 */

import type { DraftBriefing } from '../types/app'
import type { PipelineStage } from '../state/types'
import { BriefingCard } from './BriefingCard'

interface Props {
  briefings: DraftBriefing[]
  pipelineStage: PipelineStage
  currentPaperIndex: number      // ONE-PIECE FLOW: Which paper we're on
  totalPapers: number            // ONE-PIECE FLOW: Total papers this cycle
  remainingPapers: number        // ONE-PIECE FLOW: Papers left to process
  onApprove: (briefingId: string) => void
  onReject: (briefingId: string, reason?: string) => void
}

function getEmptyStateMessage(stage: PipelineStage): { title: string; subtitle: string } {
  switch (stage) {
    case 'telemetry':
      return {
        title: 'Fetching papers from arXiv...',
        subtitle: 'Gathering today\'s research submissions',
      }
    case 'recognition':
      return {
        title: 'Analyzing papers...',
        subtitle: 'Identifying promising developments',
      }
    case 'compilation':
      return {
        title: 'Preparing briefings...',
        subtitle: 'Drafting analysis for notable findings',
      }
    case 'execution':
      return {
        title: 'Saving to library...',
        subtitle: 'Completing this paper\'s journey',
      }
    case 'approval':
    case 'idle':
    default:
      return {
        title: 'Analysis complete',
        subtitle: 'Click RUN to analyze new papers',
      }
  }
}

export function PendingGovernance({
  briefings,
  pipelineStage,
  currentPaperIndex,
  totalPapers,
  remainingPapers,
  onApprove,
  onReject,
}: Props) {
  const emptyMessage = getEmptyStateMessage(pipelineStage)
  const isActive = pipelineStage !== 'idle'
  const hasBriefing = briefings.length > 0

  // ONE-PIECE FLOW: There should be at most 1 briefing
  const currentBriefing = briefings[0]

  return (
    <div className="card">
      {/* ONE-PIECE FLOW: Header shows paper progress */}
      <h2
        className="font-mono text-sm mb-4 flex items-center gap-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        {hasBriefing ? (
          <>
            <span>Needs Your Review</span>
            <span
              className="px-2 py-0.5 rounded-sm text-xs"
              style={{
                backgroundColor: 'rgba(232, 201, 74, 0.1)',
                color: 'var(--zone-yellow-text)',
              }}
            >
              Paper {currentPaperIndex}/{totalPapers}
            </span>
          </>
        ) : (
          <>
            <span>Pipeline Status</span>
            {isActive && (
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
          </>
        )}
      </h2>

      {!hasBriefing ? (
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
        <div>
          {/* ONE-PIECE FLOW: Single briefing card */}
          <BriefingCard
            briefing={currentBriefing}
            onApprove={onApprove}
            onReject={onReject}
          />

          {/* ONE-PIECE FLOW: Show remaining papers */}
          {remainingPapers > 0 && (
            <p
              className="font-mono text-xs mt-4 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              {remainingPapers} paper{remainingPapers !== 1 ? 's' : ''} remaining after this
            </p>
          )}
        </div>
      )}
    </div>
  )
}
