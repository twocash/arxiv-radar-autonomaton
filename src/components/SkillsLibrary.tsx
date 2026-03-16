/**
 * SkillsLibrary — Collapsible skill catalog
 *
 * Shows all promoted skills with their stats:
 * - Times fired (how often it handled papers)
 * - Accuracy (% of times human didn't override)
 * - Deprecated status
 *
 * Skills are declarative artifacts — inspectable, editable, deletable.
 *
 * @license CC BY 4.0
 */

import { useState } from 'react'
import type { Skill } from '../types/app'

interface Props {
  skills: Skill[]
  onDeprecate: (skillId: string, reason: string) => void
  onDelete: (skillId: string) => void
}

function SkillCard({
  skill,
  onDeprecate,
  onDelete,
}: {
  skill: Skill
  onDeprecate: () => void
  onDelete: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className="p-3 border"
      style={{
        borderColor: skill.deprecated ? 'var(--text-muted)' : 'var(--zone-green)',
        borderRadius: '2px',
        opacity: skill.deprecated ? 0.6 : 1,
        backgroundColor: skill.deprecated
          ? 'transparent'
          : 'rgba(94, 191, 80, 0.03)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs px-2 py-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(94, 191, 80, 0.1)',
              color: 'var(--zone-green-text)',
            }}
          >
            T0
          </span>
          {skill.deprecated && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: 'rgba(122, 114, 100, 0.2)',
                color: 'var(--text-muted)',
              }}
            >
              DEPRECATED
            </span>
          )}
        </div>

        {/* Stats */}
        <div
          className="flex items-center gap-3 font-mono text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>
            <span style={{ color: 'var(--text-secondary)' }}>{skill.times_fired}</span>x fired
          </span>
          <span>
            <span style={{ color: skill.accuracy >= 90 ? 'var(--zone-green-text)' : 'var(--zone-yellow-text)' }}>
              {skill.accuracy}%
            </span> accuracy
          </span>
        </div>
      </div>

      {/* Name */}
      <h4
        className="font-mono text-sm mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {skill.name}
      </h4>

      {/* Action type */}
      <p
        className="font-mono text-xs mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Action: {skill.action.replace(/_/g, ' ')}
      </p>

      {/* Toggle details */}
      <button
        className="font-mono text-[10px] mb-2"
        style={{ color: 'var(--accent)' }}
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? '▲ Hide details' : '▼ Show details'}
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div
          className="mt-2 pt-2 border-t space-y-1"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Provenance for seed skills */}
          {skill.id.startsWith('seed-') && (
            <div
              className="mb-2 p-2 rounded-sm font-mono text-[10px] italic"
              style={{
                backgroundColor: 'rgba(212, 98, 26, 0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              Pre-launch training: 100 papers analyzed, governance patterns surfaced.
              Skills like this save money and keep data local.
            </div>
          )}
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pattern:</span> {skill.pattern_hash}
          </p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Topics:</span> {skill.matched_topics.join(', ') || 'none'}
          </p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Keywords:</span> {skill.matched_keywords.join(', ') || 'none'}
          </p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Threshold:</span> {skill.threshold}
          </p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Promoted:</span> {new Date(skill.promoted_at).toLocaleDateString()} from {skill.promoted_from.toUpperCase()}
          </p>
          {skill.last_fired && (
            <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last fired:</span> {new Date(skill.last_fired).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {!skill.deprecated && (
          <button
            className="btn"
            onClick={onDeprecate}
            style={{
              borderColor: 'var(--zone-yellow)',
              color: 'var(--zone-yellow-text)',
            }}
          >
            Deprecate
          </button>
        )}
        <button
          className="btn"
          onClick={onDelete}
          style={{
            borderColor: 'var(--zone-red)',
            color: 'var(--zone-red-text)',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export function SkillsLibrary({ skills, onDeprecate, onDelete }: Props) {
  const activeSkills = skills.filter(s => !s.deprecated)
  const deprecatedSkills = skills.filter(s => s.deprecated)

  return (
    <details className="mt-6" open={skills.length > 0}>
      <summary
        className="font-mono text-sm cursor-pointer py-2 flex items-center gap-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>Skills Library</span>
        <span
          className="px-2 py-0.5 rounded-sm text-xs"
          style={{
            backgroundColor: 'rgba(94, 191, 80, 0.1)',
            color: 'var(--zone-green-text)',
          }}
        >
          {activeSkills.length} active
        </span>
        {deprecatedSkills.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-sm text-xs"
            style={{
              backgroundColor: 'rgba(122, 114, 100, 0.1)',
              color: 'var(--text-muted)',
            }}
          >
            {deprecatedSkills.length} deprecated
          </span>
        )}
      </summary>

      <div className="card mt-2">
        {skills.length === 0 ? (
          <div className="text-center py-8">
            <p
              className="font-mono text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              No skills yet
            </p>
            <p
              className="font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Approve papers to start the Flywheel. After 3+ approvals with the
              same pattern, the system will propose promoting it to a Tier 0 skill.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active skills first */}
            {activeSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onDeprecate={() => onDeprecate(skill.id, 'manual')}
                onDelete={() => onDelete(skill.id)}
              />
            ))}

            {/* Deprecated skills */}
            {deprecatedSkills.length > 0 && (
              <>
                <div
                  className="font-mono text-[10px] pt-2 mt-2 border-t"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Deprecated
                </div>
                {deprecatedSkills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onDeprecate={() => {}}
                    onDelete={() => onDelete(skill.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
