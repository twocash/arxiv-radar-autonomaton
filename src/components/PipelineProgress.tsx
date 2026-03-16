/**
 * PipelineProgress — Real-time Flywheel Economics Dashboard
 *
 * Shows live progress during pipeline execution:
 * - Papers processed / total
 * - Zone distribution (GREEN/YELLOW/RED)
 * - Tier breakdown (T0 local vs T2 cloud)
 * - Running API cost
 *
 * Visible during telemetry, recognition, and compilation stages.
 * Hides when pipeline is idle or in approval (governance cards take over).
 *
 * @license CC BY 4.0
 */

interface Props {
  totalPapers: number
  processedCount: number
  greenCount: number
  yellowCount: number
  redCount: number
  tier0Count: number
  tier2Count: number
  apiCost: number
  currentStage: string
}

export function PipelineProgress({
  totalPapers,
  processedCount,
  greenCount,
  yellowCount,
  redCount,
  tier0Count,
  tier2Count,
  apiCost,
  currentStage,
}: Props) {
  const progressPercent = totalPapers > 0 ? Math.round((processedCount / totalPapers) * 100) : 0

  // Stage-specific status text
  const stageText = {
    telemetry: 'Fetching from arXiv...',
    recognition: `Analyzing ${processedCount}/${totalPapers} papers`,
    compilation: 'Preparing analysis...',
    execution: 'Saving to library...',
  }[currentStage] || 'Processing...'

  return (
    <div
      className="mb-6 p-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '4px solid var(--accent)',
        borderRadius: '2px',
      }}
    >
      {/* Header row: Stage + Progress */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-mono text-xs uppercase tracking-wider"
          style={{ color: 'var(--accent)' }}
        >
          {stageText}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {progressPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-sm mb-4 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 font-mono text-xs">
        {/* Papers count */}
        <div style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)' }}>{totalPapers}</span> papers
        </div>

        {/* Tier breakdown */}
        <div className="flex gap-3">
          <span style={{ color: 'var(--zone-green-text)' }}>
            T0: {tier0Count}
          </span>
          <span style={{ color: 'var(--zone-yellow-text)' }}>
            T2: {tier2Count}
          </span>
        </div>

        {/* Cost */}
        {apiCost > 0 && (
          <span style={{ color: 'var(--text-muted)' }}>
            ${apiCost.toFixed(4)}
          </span>
        )}
      </div>

      {/* Zone distribution */}
      {processedCount > 0 && (
        <div
          className="flex gap-4 mt-3 pt-3 font-mono text-xs"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span style={{ color: 'var(--zone-green-text)' }}>
            {greenCount} filtered
          </span>
          <span style={{ color: 'var(--zone-yellow-text)' }}>
            {yellowCount} promising
          </span>
          {redCount > 0 && (
            <span style={{ color: 'var(--zone-red-text)' }}>
              {redCount} strategic
            </span>
          )}
        </div>
      )}
    </div>
  )
}
