/**
 * GlassPipeline — 5-stage pipeline indicator
 *
 * Visual representation of the Autonomaton's current state.
 * The "glass" design shows all stages simultaneously with clear status.
 *
 * @license CC BY 4.0
 */

import { useMemo } from 'react'
import type { PipelineStage } from '../types/app'

interface Props {
  currentStage: PipelineStage
  hasError: boolean
  isPolling: boolean
  hasUnresolvedHalts?: boolean
  hasCompletedCycle?: boolean // True if papers have been processed before
  annotation?: string // Rich annotation from orchestrator
  activeZone?: 'green' | 'yellow' | 'red' | null // Zone of paper being processed
}

const STAGES: { id: PipelineStage; label: string; shortLabel: string }[] = [
  { id: 'telemetry', label: 'Telemetry', shortLabel: 'TEL' },
  { id: 'recognition', label: 'Recognition', shortLabel: 'REC' },
  { id: 'compilation', label: 'Compilation', shortLabel: 'CMP' },
  { id: 'approval', label: 'Approval', shortLabel: 'APR' },
  { id: 'execution', label: 'Execution', shortLabel: 'EXE' },
]

type StageStatus = 'complete' | 'active' | 'pending' | 'halt'

function getStageStatus(
  currentStage: PipelineStage,
  stageId: PipelineStage,
  hasError: boolean
): StageStatus {
  const stageOrder = STAGES.map(s => s.id)
  const currentIndex = stageOrder.indexOf(currentStage)
  const stageIndex = stageOrder.indexOf(stageId)

  if (hasError && stageId === currentStage) return 'halt'
  if (stageIndex < currentIndex) return 'complete'
  if (stageIndex === currentIndex && currentStage !== 'idle') return 'active'
  return 'pending'
}

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'complete':
      return <span className="text-[var(--zone-green-text)]">&#x2713;</span>
    case 'active':
      return <span className="text-[var(--accent)]">&#x25CF;</span>
    case 'halt':
      return <span className="text-[var(--zone-red-text)]">&#x26A0;</span>
    default:
      return <span className="text-[var(--text-muted)]">&#x25CB;</span>
  }
}


/**
 * Get zone-aware colors for active stages.
 */
function getActiveColors(zone: 'green' | 'yellow' | 'red' | null | undefined): { bg: string; text: string } {
  switch (zone) {
    case 'yellow':
      return { bg: 'rgba(217, 164, 6, 0.15)', text: 'var(--zone-yellow-text, #D9A406)' };
    case 'red':
      return { bg: 'rgba(232, 90, 58, 0.15)', text: 'var(--zone-red-text, #E85A3A)' };
    case 'green':
      return { bg: 'rgba(94, 191, 80, 0.15)', text: 'var(--zone-green-text, #5EBF50)' };
    default:
      return { bg: 'rgba(212, 98, 26, 0.1)', text: 'var(--accent)' };
  }
}

export function GlassPipeline({
  currentStage,
  hasError,
  isPolling,
  hasUnresolvedHalts = false,
  hasCompletedCycle = false,
  annotation,
  activeZone,
}: Props) {
  const zoneColors = getActiveColors(activeZone)

  // Internal fallback status text (used if no annotation provided)
  const fallbackStatus = useMemo(() => {
    if (hasUnresolvedHalts) return 'HALTED — Awaiting resolution'
    switch (currentStage) {
      case 'telemetry': return 'Loading papers...'
      case 'recognition': return 'Classifying papers...'
      case 'compilation': return 'Generating briefings...'
      case 'approval': return 'Awaiting review'
      case 'execution': return 'Completing cycle...'
      case 'idle':
        return hasCompletedCycle ? 'Awaiting new research' : 'Ready'
      default: return 'Ready'
    }
  }, [currentStage, hasUnresolvedHalts, hasCompletedCycle])

  // Use annotation from orchestrator if provided (has better context)
  const statusText = annotation || fallbackStatus

  return (
    <div
      className="flex items-center gap-1 px-6 py-3 border-b overflow-x-auto"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {STAGES.map((stage, i) => {
        const status = getStageStatus(currentStage, stage.id, hasError)
        const isActive = status === 'active' && isPolling

        return (
          <div key={stage.id} className="flex items-center">
            {i > 0 && (
              <span
                className="mx-2 font-mono text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                →
              </span>
            )}
            <div
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-sm
                font-mono text-xs transition-all duration-100
                ${status === 'halt' ? 'animate-pulse' : ''}
                ${isActive ? 'ring-1 ring-[var(--accent)]' : ''}
              `}
              style={{
                backgroundColor:
                  status === 'active'
                    ? zoneColors.bg
                    : status === 'halt'
                      ? 'rgba(232, 90, 58, 0.1)'
                      : status === 'complete'
                        ? 'rgba(94, 191, 80, 0.05)'
                        : 'transparent',
              }}
            >
              <StageIcon status={status} />
              <span
                className="hidden sm:inline"
                style={{
                  color:
                    status === 'complete'
                      ? 'var(--zone-green-text)'
                      : status === 'active'
                        ? zoneColors.text
                        : status === 'halt'
                          ? 'var(--zone-red-text)'
                          : 'var(--text-muted)',
                }}
              >
                {stage.label}
              </span>
              <span
                className="sm:hidden"
                style={{
                  color:
                    status === 'complete'
                      ? 'var(--zone-green-text)'
                      : status === 'active'
                        ? zoneColors.text
                        : status === 'halt'
                          ? 'var(--zone-red-text)'
                          : 'var(--text-muted)',
                }}
              >
                {stage.shortLabel}
              </span>
            </div>
          </div>
        )
      })}

      {/* Dynamic status text */}
      <span
        className="ml-4 font-mono text-xs"
        style={{
          color: hasUnresolvedHalts
            ? 'var(--zone-red-text)'
            : currentStage === 'idle'
              ? 'var(--text-muted)'
              : 'var(--accent)',
        }}
      >
        {statusText}
      </span>
    </div>
  )
}
