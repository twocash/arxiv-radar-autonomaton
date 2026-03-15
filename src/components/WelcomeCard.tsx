/**
 * WelcomeCard — First-run onboarding
 *
 * Explains what arXiv Radar is and what will happen when the user clicks RUN.
 * Adapts content to current state: dev mode, API key presence.
 * Disappears after first pipeline run (papers_seen > 0).
 *
 * @license CC BY 4.0
 */

import type { Settings } from '../types/app'

interface Props {
  settings: Settings
}

export function WelcomeCard({ settings }: Props) {
  const { dev_mode, api_key } = settings
  
  return (
    <div
      className="mb-6 p-6"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '4px solid var(--accent)',
        borderRadius: '2px',
      }}
    >

      {/* Title */}
      <h2
        className="text-xl mb-4"
        style={{
          fontFamily: 'Instrument Serif, serif',
          color: 'var(--text-primary)',
        }}
      >
        arXiv Radar
      </h2>
      <p
        className="text-sm mb-4 font-mono"
        style={{ color: 'var(--accent)' }}
      >
        Research Intelligence for the-grove.ai's Ratchet Thesis
      </p>

      {/* Thesis explanation */}
      <div
        className="text-sm mb-4 space-y-3"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
        }}
      >

        <p>
          This tool watches arXiv through a specific lens: the Ratchet thesis
          about capability propagation from frontier to local AI models. Every
          paper is evaluated against six strategic questions.
        </p>
        <p>
          The pipeline is transparent. You'll see every stage.
        </p>
        <p>
          The governance is real.{' '}
          <span className="font-mono" style={{ color: 'var(--zone-yellow-text)' }}>YELLOW</span>{' '}
          papers need your approval.{' '}
          <span className="font-mono" style={{ color: 'var(--zone-red-text)' }}>RED</span>{' '}
          papers need your judgment. The system will halt — visibly — when it
          encounters something outside its boundaries.
        </p>
      </div>

      {/* Mode-specific message */}
      <div
        className="text-sm p-3 rounded-sm font-mono"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: dev_mode
            ? 'var(--zone-green-text)'
            : !api_key
              ? 'var(--zone-yellow-text)'
              : 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
      >

        {dev_mode ? (
          <p>
            Dev Mode is active. The pipeline will run on 7 seed papers — real
            arXiv research, pre-loaded. No API key required. One paper will
            trigger a governance halt to demonstrate Digital Jidoka.
          </p>
        ) : !api_key ? (
          <p>
            ⚠ No API key configured. Add your Anthropic API key in Settings to
            enable Tier 2 classification and briefing compilation.
          </p>
        ) : (
          <p>
            Live mode. The pipeline will fetch papers from arXiv and use Claude
            for classification and briefing compilation.
          </p>
        )}
      </div>

      {/* CTA */}
      <p
        className="mt-4 text-sm"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--text-muted)',
        }}
      >
        Click <span style={{ color: 'var(--accent)' }}>RUN</span> to start the pipeline.
      </p>
    </div>
  )
}
