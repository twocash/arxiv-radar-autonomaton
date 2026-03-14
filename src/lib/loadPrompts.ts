/**
 * arXiv Radar — Prompt Loaders
 *
 * Vite raw imports for prompts/*.md files.
 * These are template prompts for Tier 2 LLM calls.
 *
 * @license CC BY 4.0
 */

import type { VoicePresetId } from '../config/voices'

// Raw markdown imports (configured in vite-env.d.ts)
import classifyPaperRaw from '../prompts/classify-paper.md?raw'
import newsBriefRaw from '../prompts/news-brief.md?raw'
import technicalSummaryRaw from '../prompts/technical-summary.md?raw'
import strategicIntelRaw from '../prompts/strategic-intel.md?raw'

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export const prompts = {
  classify: classifyPaperRaw,
  news_brief: newsBriefRaw,
  technical_summary: technicalSummaryRaw,
  strategic_intel: strategicIntelRaw,
} as const

export type PromptKey = keyof typeof prompts

// =============================================================================
// PROMPT ACCESSORS
// =============================================================================

/**
 * Get the classification prompt template
 */
export function getClassifyPrompt(): string {
  return prompts.classify
}

/**
 * Get a voice-specific briefing prompt template
 */
export function getBriefingPrompt(voice: VoicePresetId): string {
  return prompts[voice]
}

/**
 * Get all available voice prompt keys
 */
export function getVoicePromptKeys(): VoicePresetId[] {
  return ['news_brief', 'technical_summary', 'strategic_intel']
}

// =============================================================================
// TEMPLATE INTERPOLATION
// =============================================================================

interface TemplateVars {
  title?: string
  abstract?: string
  authors?: string
  categories?: string
  knowledge?: string
  zone?: string
  relevance_score?: number
  matched_topics?: string
  key_claims?: string
  [key: string]: string | number | undefined
}

/**
 * Interpolate a prompt template with variables
 * Uses {{variable}} syntax
 */
export function interpolatePrompt(
  template: string,
  vars: TemplateVars
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => String(vars[key] ?? `{{${key}}}`)
  )
}
