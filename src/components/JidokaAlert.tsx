/**
 * JidokaAlert — Halt notification with Kaizen proposals
 *
 * When the Autonomaton detects something requiring human judgment,
 * it halts and presents this alert with proposed fixes (Kaizen).
 *
 * The system doesn't just stop — it proposes the fix.
 *
 * @license CC BY 4.0
 */

import type { JidokaEvent, KaizenProposal, TelemetryEntry } from '../types/app'

interface Props {
  halt: JidokaEvent
  kaizenProposal?: KaizenProposal
  onResolve: (eventId: string, resolution: string) => void
  onSelectKaizen?: (proposalId: string, optionAction: string) => void
  traceContext?: TelemetryEntry[] // Telemetry entries for this paper
}

function getTriggerLabel(trigger: JidokaEvent['trigger']): string {
  switch (trigger) {
    case 'conflicting_thesis':
      return 'Contradictory Evidence Detected'
    case 'confidence_below_threshold':
      return 'Classification Uncertain'
    case 'api_failure':
      return 'Tier 2 Unreachable'
    case 'unknown_entity':
      return 'New Signal Source'
    case 'malformed_data':
      return 'Data Integrity Check Failed'
    case 'empty_result':
      return 'No Papers Returned'
    case 'invalid_transition':
      return 'State Machine Violation'
    default:
      return String(trigger).replace(/_/g, ' ')
  }
}

function getTriggerDescription(trigger: JidokaEvent['trigger']): string {
  // This is the framing line — explains WHY the system stopped at a high level.
  // The detailed diagnosis comes from the Kaizen proposal description.
  switch (trigger) {
    case 'conflicting_thesis':
      return 'The system identified evidence on both sides of the core thesis in a single paper. Autonomous classification would be irresponsible.'
    case 'confidence_below_threshold':
      return 'The system couldn\'t reach confident classification. Rather than guessing your governance path, it stopped to ask.'
    case 'api_failure':
      return 'Tier 2 cognition is unavailable. The system halted instead of producing degraded output — that\'s the governance layer working.'
    case 'unknown_entity':
      return 'A new research source is producing high-signal work. The system paused to let you decide if it\'s worth tracking.'
    case 'malformed_data':
      return 'Incoming data failed integrity checks. The system stopped rather than processing unreliable information.'
    case 'empty_result':
      return 'The data source returned nothing. The system stopped to investigate rather than silently continuing with no work.'
    case 'invalid_transition':
      return 'The pipeline tried to execute an action that isn\'t valid from the current state. This is the Andon Gate catching a logic bug.'
    default:
      return 'The system detected something outside its governance boundaries and stopped for your judgment.'
  }
}

export function JidokaAlert({ halt, kaizenProposal, onResolve, onSelectKaizen, traceContext = [] }: Props) {
  const hasKaizen = kaizenProposal && kaizenProposal.options.length > 0

  return (
    <div
      className="jidoka-alert mb-6 p-4"
      style={{ borderRadius: '2px' }}
    >
      {/* Header — this is governance, not an error */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="font-mono text-sm font-bold tracking-wide"
          style={{ color: 'var(--zone-red-text)' }}
        >
          PIPELINE HALTED — YOUR JUDGMENT REQUIRED
        </span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm"
          style={{
            backgroundColor: 'rgba(232, 90, 58, 0.2)',
            color: 'var(--zone-red-text)',
          }}
        >
          {getTriggerLabel(halt.trigger)}
        </span>
      </div>

      {/* Framing line — what happened, one sentence */}
      <p
        className="text-sm mb-3"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
      >
        {getTriggerDescription(halt.trigger)}
      </p>

      {/* Detailed diagnosis from Kaizen proposal */}
      {hasKaizen && kaizenProposal.description && (
        <div
          className="mb-3 px-3 py-2 rounded-sm"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderLeft: '2px solid var(--accent)',
          }}
        >
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            {kaizenProposal.description}
          </p>
        </div>
      )}

      {/* Raw details for provenance — collapsible */}
      {halt.details && (
        <details className="mb-3">
          <summary
            className="font-mono text-[10px] cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            diagnostic trace
          </summary>
          <p
            className="font-mono text-[10px] mt-1 px-3 py-2 rounded-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              color: 'var(--text-muted)',
            }}
          >
            {halt.details}
          </p>
        </details>
      )}

      {/* Kaizen Proposals — the system's recommended actions */}
      {hasKaizen && (
        <div className="mb-4">
          <p
            className="font-mono text-[10px] tracking-wider mb-2"
            style={{ color: 'var(--accent)' }}
          >
            KAIZEN — SYSTEM RECOMMENDS
          </p>
          <div className="flex flex-col gap-2">
            {kaizenProposal.options.map((option, i) => (
              <button
                key={i}
                className={`
                  text-left px-3 py-2 rounded-sm border text-xs cursor-pointer transition-all duration-100 active:scale-[0.98]
                  ${option.is_recommended
                    ? 'bg-[rgba(212,98,26,0.1)] border-[var(--accent)] hover:bg-[rgba(212,98,26,0.25)]'
                    : 'bg-[rgba(0,0,0,0.2)] border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)]'
                  }
                `}
                style={{
                  color: option.is_recommended ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}
                onClick={() => {
                  onSelectKaizen?.(kaizenProposal.id, option.action)
                  onResolve(halt.id, option.action)
                }}
              >
                {option.label}
                {option.is_recommended && (
                  <span
                    className="ml-2 font-mono text-[10px]"
                    style={{ color: 'var(--accent)' }}
                  >
                    ← recommended
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Resolution — only shows if no Kaizen proposals */}
      {!hasKaizen && (
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() => onResolve(halt.id, 'acknowledged')}
          >
            Acknowledge & Continue
          </button>
        </div>
      )}

      {/* Pipeline Trace Context — telemetry for this paper */}
      {traceContext.length > 0 && (
        <details className="mb-3">
          <summary
            className="font-mono text-[10px] cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            pipeline trace context ({traceContext.length} events)
          </summary>
          <div
            className="mt-1 px-3 py-2 rounded-sm max-h-32 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          >
            {traceContext.map((entry, i) => (
              <div
                key={i}
                className="font-mono text-[10px] py-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <span style={{ color: 'var(--accent)' }}>
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                {' '}{entry.event}
                {entry.confidence !== undefined && (
                  <span style={{ color: 'var(--zone-yellow-text)' }}>
                    {' '}(conf: {entry.confidence.toFixed(2)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Provenance metadata — bottom of the alert */}
      <div
        className="font-mono text-[10px] mt-3 flex items-center gap-3"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>halted at {halt.stage} stage</span>
        <span>•</span>
        <span>{new Date(halt.timestamp).toLocaleTimeString()}</span>
        {halt.paper_id && (
          <>
            <span>•</span>
            <span>{halt.paper_id}</span>
          </>
        )}
      </div>

    </div>
  )
}
