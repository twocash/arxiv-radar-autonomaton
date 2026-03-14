/**
 * arXiv Radar — Knowledge Loaders
 *
 * Vite raw imports for knowledge/*.md files.
 * These files are injected as context for Tier 1/2 classification.
 *
 * @license CC BY 4.0
 */

// Raw markdown imports (configured in vite-env.d.ts)
import topicsRaw from '../knowledge/topics.md?raw'
import significanceRaw from '../knowledge/significance.md?raw'
import contrarianRaw from '../knowledge/contrarian.md?raw'

// =============================================================================
// KNOWLEDGE CONTENT
// =============================================================================

export const knowledge = {
  topics: topicsRaw,
  significance: significanceRaw,
  contrarian: contrarianRaw,
} as const

export type KnowledgeKey = keyof typeof knowledge

// =============================================================================
// KNOWLEDGE ACCESSORS
// =============================================================================

/**
 * Get a specific knowledge file's content
 */
export function getKnowledge(key: KnowledgeKey): string {
  return knowledge[key]
}

/**
 * Get all knowledge files concatenated for LLM context injection
 */
export function getAllKnowledge(): string {
  return [
    '# STRATEGIC CONTEXT\n',
    '## Topics of Interest\n',
    knowledge.topics,
    '\n## Significance Criteria\n',
    knowledge.significance,
    '\n## Contrarian Lens\n',
    knowledge.contrarian,
  ].join('\n')
}

/**
 * Get knowledge files for classification context
 * Excludes contrarian lens which is applied as a second pass
 */
export function getClassificationContext(): string {
  return [
    '# CLASSIFICATION CONTEXT\n',
    '## Topics of Interest\n',
    knowledge.topics,
    '\n## Significance Criteria\n',
    knowledge.significance,
  ].join('\n')
}

/**
 * Get contrarian lens for second-pass analysis
 */
export function getContrarianLens(): string {
  return knowledge.contrarian
}
