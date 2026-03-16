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
// Note: File names kept for backward compat, mapped to new voice IDs
import classifyPaperRaw from '../prompts/classify-paper.md?raw'
import quickScanRaw from '../prompts/news-brief.md?raw'       // Was news-brief
import deepAnalysisRaw from '../prompts/strategic-intel.md?raw' // Was strategic-intel
import socialPostRaw from '../prompts/technical-summary.md?raw' // Was technical-summary

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export const prompts = {
  classify: classifyPaperRaw,
  // New voice IDs mapped to existing prompt files
  quick_scan: quickScanRaw,
  deep_analysis: deepAnalysisRaw,
  social_post: socialPostRaw,
  // Legacy aliases for backward compat
  news_brief: quickScanRaw,
  technical_summary: socialPostRaw,
  strategic_intel: deepAnalysisRaw,
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
  return prompts[voice] || prompts.quick_scan
}

/**
 * Get all available voice prompt keys
 */
export function getVoicePromptKeys(): VoicePresetId[] {
  return ['quick_scan', 'deep_analysis', 'social_post']
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
