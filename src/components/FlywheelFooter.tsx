/**
 * FlywheelFooter — Sticky footer showing tier distribution and economics
 *
 * The economic proof: shows how skills migrate from Tier 2 to Tier 0,
 * reducing API costs over time. This is the visible payoff of the Flywheel.
 *
 * @license CC BY 4.0
 */

import type { FlywheelDisplayStats } from '../types/app'

interface Props {
  stats: FlywheelDisplayStats
  migrationsThisSession?: number
}

export function FlywheelFooter({ stats, migrationsThisSession = 0 }: Props) {
  const hasMigration = migrationsThisSession > 0

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-t"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Tier Distribution */}
      <div className="flex items-center gap-6 font-mono text-xs">
        {/* Tier 0 Skills + Savings */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(94, 191, 80, 0.1)',
              color: 'var(--zone-green-text)',
            }}
          >
            T0
          </span>
          <span style={{ color: 'var(--zone-green-text)' }}>
            {stats.tier0_skills} skill{stats.tier0_skills !== 1 ? 's' : ''}
          </span>
          {/* Defensible savings: only from skill executions */}
          {stats.skill_executions > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: 'rgba(94, 191, 80, 0.15)',
                color: 'var(--zone-green-text)',
              }}
              title={`${stats.skill_executions} skill executions avoided T2 calls`}
            >
              saved ${stats.estimated_savings.toFixed(3)}
            </span>
          )}
        </div>

        {/* Tier 2 Model + Cost */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(232, 201, 74, 0.1)',
              color: 'var(--zone-yellow-text)',
            }}
          >
            T2
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {stats.tier2_model}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            ${stats.tier2_cost.toFixed(3)}
          </span>
        </div>

        {/* Migration Indicator */}
        {hasMigration && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-sm animate-pulse"
            style={{
              backgroundColor: 'rgba(212, 98, 26, 0.1)',
              color: 'var(--accent)',
            }}
          >
            <span>↑</span>
            <span>{migrationsThisSession} migrated</span>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div
        className="font-mono text-xs flex items-center gap-4"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>
          <span style={{ color: 'var(--text-secondary)' }}>{stats.papers_seen}</span>
          {' '}papers
        </span>
        <span>
          <span style={{ color: 'var(--text-secondary)' }}>{stats.briefings_approved}</span>
          {' '}approved
        </span>
        <span>
          <span style={{ color: 'var(--zone-green-text)' }}>{stats.skills_promoted}</span>
          {' '}skills
        </span>
      </div>
    </footer>
  )
}
