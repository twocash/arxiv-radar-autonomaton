/**
 * VoiceSelector — Briefing voice preset picker
 *
 * Controls how briefings are written: News Brief, Technical Summary, or Strategic Intel.
 * Each voice targets a different audience and reading level.
 *
 * @license CC BY 4.0
 */

import { listVoicePresets, type VoicePresetId } from '../config/voices'

interface Props {
  value: VoicePresetId
  onChange: (voice: VoicePresetId) => void
}

export function VoiceSelector({ value, onChange }: Props) {
  const voices = listVoicePresets()

  return (
    <div className="flex items-center gap-1">
      {voices.map(voice => (
        <button
          key={voice.id}
          onClick={() => onChange(voice.id)}
          className={`
            px-3 py-1.5 font-mono text-xs rounded-sm
            transition-all duration-150
            ${value === voice.id
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
            }
          `}
          title={voice.description}
        >
          {voice.label}
        </button>
      ))}
    </div>
  )
}
