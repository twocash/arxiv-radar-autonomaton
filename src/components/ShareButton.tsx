/**
 * ShareButton — Copy briefing to clipboard for Threads sharing
 *
 * Formats briefing content for social sharing.
 * Shows visual feedback on copy.
 *
 * @license CC BY 4.0
 */

import { useState, useCallback } from 'react'
import type { DraftBriefing, ApprovedBriefing } from '../state/types'

interface Props {
  briefing: DraftBriefing | ApprovedBriefing
}

/**
 * Format briefing content for Threads.
 * Produces a short, punchy format optimized for social sharing.
 */
function formatForThreads(briefing: DraftBriefing | ApprovedBriefing): string {
  const lines: string[] = []

  // Thesis signal emoji at the start
  const thesisEmoji = {
    supports_decentralized: '🟢',
    supports_centralized: '🔴',
    neutral: '⚪',
  }[briefing.thesis_signal] || '⚪'

  // Zone indicator
  const zoneEmoji = briefing.paper.zone === 'red' ? '🔴' : '🟡'

  // Opening hook with zone and thesis
  lines.push(`${zoneEmoji} ${thesisEmoji} New research signal:`)
  lines.push('')

  // Headline (truncate if too long)
  const headline = briefing.headline.length > 120
    ? briefing.headline.slice(0, 117) + '...'
    : briefing.headline
  lines.push(`**${headline}**`)
  lines.push('')

  // Lead/Why This Matters (truncate to fit Threads)
  const lead = briefing.lead || briefing.body || ''
  const truncatedLead = lead.length > 200
    ? lead.slice(0, 197) + '...'
    : lead
  lines.push(truncatedLead)
  lines.push('')

  // Thesis reason (key insight)
  if (briefing.thesis_reason) {
    lines.push(`${thesisEmoji} ${briefing.thesis_reason}`)
    lines.push('')
  }

  // Topics as hashtags
  const hashtags = briefing.paper.matched_topics
    .slice(0, 3)
    .map(topic => `#${topic.replace(/[^a-zA-Z0-9]/g, '')}`)
    .join(' ')
  if (hashtags) {
    lines.push(hashtags)
    lines.push('')
  }

  // arXiv link
  const arxivUrl = briefing.arxiv_url || briefing.paper.arxiv_url
  lines.push(`📄 ${arxivUrl}`)

  return lines.join('\n')
}

export function ShareButton({ briefing }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = formatForThreads(briefing)

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [briefing])

  return (
    <button
      className="btn flex items-center gap-1.5"
      onClick={handleCopy}
      style={{
        borderColor: copied ? 'var(--zone-green)' : 'var(--accent)',
        color: copied ? 'var(--zone-green-text)' : 'var(--accent)',
      }}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <span>📱</span>
          <span>Share</span>
        </>
      )}
    </button>
  )
}
