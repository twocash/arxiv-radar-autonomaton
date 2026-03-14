/**
 * arXiv Radar — Pattern Hash Generator
 *
 * Creates deterministic fingerprints for Flywheel detection.
 * Same inputs always produce the same hash.
 *
 * The hash groups similar papers by semantic features (topics + zone + keywords),
 * not surface features like title. This enables pattern detection across papers
 * that address the same strategic question in the same way.
 *
 * @license CC BY 4.0
 */

import type { Zone } from '../config/zones'

/**
 * Generate a deterministic pattern hash from classification results.
 *
 * Hash components (in order):
 * 1. Sorted topic IDs (e.g., 'cost-falling', 'gap-closing')
 * 2. Zone (green | yellow | red)
 * 3. Top 3 sorted keywords (prevents over-specificity)
 *
 * @param topics - Matched topic IDs from classification
 * @param zone - Assigned zone
 * @param keywords - Matched keywords (will use top 3 sorted)
 * @returns 12-character base64 hash
 */
export function generatePatternHash(
  topics: string[],
  zone: Zone,
  keywords: string[]
): string {
  // Sort topics for determinism
  const sortedTopics = [...topics].sort()

  // Take top 3 keywords, sorted (prevents over-specificity)
  const topKeywords = [...keywords]
    .slice(0, 3)
    .sort()

  // Combine into pipe-delimited string
  const parts = [
    ...sortedTopics,
    zone,
    ...topKeywords,
  ]

  const combined = parts.join('|')

  // Base64 encode and truncate to 12 chars for readability
  // btoa is available in browser environments
  const hash = btoa(combined).slice(0, 12)

  return hash
}

/**
 * Check if two pattern hashes match.
 * Simple equality check, but extracted for semantics.
 */
export function patternsMatch(hash1: string, hash2: string): boolean {
  return hash1 === hash2
}

/**
 * Decode a pattern hash back to its components (for debugging).
 * Note: This only works if the hash wasn't truncated too much.
 */
export function decodePatternHash(hash: string): {
  topics: string[]
  zone: Zone
  keywords: string[]
} | null {
  try {
    // Pad the base64 string if needed
    const padded = hash + '=='.slice(0, (4 - (hash.length % 4)) % 4)
    const decoded = atob(padded)
    const parts = decoded.split('|')

    // Find the zone (it's the only part that's green/yellow/red)
    const zoneIndex = parts.findIndex(p =>
      p === 'green' || p === 'yellow' || p === 'red'
    )

    if (zoneIndex === -1) return null

    return {
      topics: parts.slice(0, zoneIndex),
      zone: parts[zoneIndex] as Zone,
      keywords: parts.slice(zoneIndex + 1),
    }
  } catch {
    return null
  }
}
