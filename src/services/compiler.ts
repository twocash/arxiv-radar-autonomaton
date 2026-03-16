/**
 * arXiv Radar — Compiler Service
 *
 * Tier 2 briefing compilation using Anthropic API.
 * Takes a classified paper and produces a voice-appropriate briefing.
 *
 * @license CC BY 4.0
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClassifiedPaper, DraftBriefing, ThesisSignal } from '../state/types'
import type { VoicePresetId } from '../config/voices'
import { getVoicePreset } from '../config/voices'
import { getBriefingPrompt, interpolatePrompt } from '../lib/loadPrompts'
import { getClassificationContext } from '../lib/loadKnowledge'

// =============================================================================
// TYPES
// =============================================================================

export interface CompilationResult {
  success: boolean
  briefing?: DraftBriefing
  error?: string
  cost: {
    input_tokens: number
    output_tokens: number
    estimated_usd: number
  }
}

// Rough pricing estimate (directional, not authoritative)
const COST_PER_INPUT_TOKEN = 0.000003 // ~$3/1M
const COST_PER_OUTPUT_TOKEN = 0.000015 // ~$15/1M

// =============================================================================
// ANTHROPIC CLIENT
// =============================================================================

/**
 * Create Anthropic client with Vite dev proxy
 *
 * Why absolute URL: The Anthropic SDK uses `new URL(path, baseURL)` internally.
 * Relative paths like '/anthropic-api' fail because URL constructor requires
 * a valid base. Using window.location.origin makes it work in any environment
 * (localhost:5173 in dev, production domain in prod).
 *
 * Why Vite proxy: Browser CORS blocks direct calls to api.anthropic.com.
 * Vite proxies /anthropic-api → https://api.anthropic.com with proper headers.
 */
function createClient(apiKey: string): Anthropic {
  const baseURL = `${window.location.origin}/anthropic-api`
  return new Anthropic({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true, // Required for browser context
  })
}

// =============================================================================
// BRIEFING COMPILATION
// =============================================================================

/**
 * Compile a briefing for a classified paper using Tier 2 LLM.
 */
export async function compileBriefing(
  paper: ClassifiedPaper,
  voicePreset: VoicePresetId,
  apiKey: string
): Promise<CompilationResult> {
  const client = createClient(apiKey)
  const voice = getVoicePreset(voicePreset)

  // Build the prompt
  const template = getBriefingPrompt(voicePreset)
  const knowledge = getClassificationContext()

  const userMessage = interpolatePrompt(template, {
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors.join(', '),
    categories: paper.categories.join(', '),
    zone: paper.zone,
    relevance_score: paper.relevance_score,
    matched_topics: paper.matched_topics.join(', '),
    knowledge,
  })

  // Add explicit paper context at the end
  const fullUserMessage = `${userMessage}

---

## Paper to Brief

**Title:** ${paper.title}

**Authors:** ${paper.authors.join(', ')}

**Categories:** ${paper.categories.join(', ')}

**Zone:** ${paper.zone.toUpperCase()} (relevance: ${paper.relevance_score.toFixed(2)})

**Matched Topics:** ${paper.matched_topics.join(', ')}

**Abstract:**
${paper.abstract}

---

Write the briefing now. Follow the voice template rules exactly.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: voice.system_prompt,
      messages: [
        { role: 'user', content: fullUserMessage },
      ],
    })

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text content in response',
        cost: { input_tokens: 0, output_tokens: 0, estimated_usd: 0 },
      }
    }

    const rawOutput = textContent.text

    // Parse the output into structured fields
    const parsed = parseBriefingOutput(rawOutput)

    // Calculate costs
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const estimatedCost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN)

    const briefing: DraftBriefing = {
      id: crypto.randomUUID(),
      paper,
      voice_preset: voicePreset,
      headline: parsed.headline,
      lead: parsed.lead,
      analysis: parsed.analysis,
      thesis_signal: parsed.thesis_signal,
      thesis_reason: parsed.thesis_reason,
      arxiv_url: paper.arxiv_url,
      key_claims: parsed.key_claims,
      caveats: parsed.caveats,
      body: parsed.body, // Keep for backward compat
      compiled_at: new Date().toISOString(),
      compiled_by: {
        tier: 2,
        model: response.model,
        cost_usd: estimatedCost,
      },
    }

    return {
      success: true,
      briefing,
      cost: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_usd: estimatedCost,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: errorMessage,
      cost: { input_tokens: 0, output_tokens: 0, estimated_usd: 0 },
    }
  }
}

// =============================================================================
// OUTPUT PARSING
// =============================================================================

interface ParsedBriefing {
  headline: string
  lead: string
  analysis: string
  thesis_signal: ThesisSignal
  thesis_reason: string
  key_claims: string[]
  caveats: string[]
  body?: string // Legacy field for backward compat
}

/**
 * Parse raw LLM output into structured briefing fields.
 *
 * Expected format:
 * ## Headline
 * **Why This Matters:** Lead paragraph
 * ### The Research
 * Analysis paragraphs...
 * ### Key Claims
 * - claim 1
 * ### Caveats
 * - caveat 1
 * ### Thesis Signal
 * 🟢/🔴/⚪ **SIGNAL:** reason
 */
function parseBriefingOutput(raw: string): ParsedBriefing {
  const lines = raw.trim().split('\n')

  // Find headline (usually first non-empty line, may start with ** or #)
  let headline = ''
  let bodyStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line) {
      // Remove markdown formatting
      headline = line
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/^#+\s*/, '')
        .trim()
      bodyStartIndex = i + 1
      break
    }
  }

  // Body is everything after the headline
  const bodyLines = lines.slice(bodyStartIndex).filter(l => l.trim())
  const fullBody = bodyLines.join('\n').trim()

  // Extract structured sections
  const lead = extractSection(fullBody, 'Why This Matters') ||
               extractSection(fullBody, 'Thesis') ||
               extractFirstParagraph(fullBody)

  const analysis = extractSection(fullBody, 'The Research') ||
                   extractSection(fullBody, 'Analysis') ||
                   fullBody

  // Extract thesis signal
  const { signal, reason } = extractThesisSignal(fullBody)

  // Extract key claims (from ### Key Claims section or by parsing)
  const key_claims = extractBulletSection(fullBody, 'Key Claims') ||
                     extractBulletSection(fullBody, 'Key findings') ||
                     extractKeyClaims(fullBody)

  // Extract caveats
  const caveats = extractBulletSection(fullBody, 'Caveats') ||
                  extractCaveats(fullBody)

  return {
    headline,
    lead,
    analysis,
    thesis_signal: signal,
    thesis_reason: reason,
    key_claims,
    caveats,
    body: fullBody, // Keep for backward compat
  }
}

/**
 * Extract a named section from markdown body.
 */
function extractSection(body: string, sectionName: string): string {
  const regex = new RegExp(`(?:^|\\n)(?:#+\\s*|\\*\\*)?${sectionName}[:\\s]*\\*?\\*?\\s*([\\s\\S]*?)(?=\\n#+|\\n\\*\\*|$)`, 'i')
  const match = body.match(regex)
  if (match) {
    return match[1].trim().replace(/^\*\*|\*\*$/g, '')
  }
  return ''
}

/**
 * Extract bullet points from a named section.
 */
function extractBulletSection(body: string, sectionName: string): string[] | null {
  const sectionContent = extractSection(body, sectionName)
  if (!sectionContent) return null

  const bullets = sectionContent
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)

  return bullets.length > 0 ? bullets : null
}

/**
 * Extract first paragraph (for lead fallback).
 */
function extractFirstParagraph(body: string): string {
  const paragraphs = body.split(/\n\n+/).filter(p => p.trim())
  return paragraphs[0]?.trim() || ''
}

/**
 * Extract thesis signal and reason from body.
 */
function extractThesisSignal(body: string): { signal: ThesisSignal; reason: string } {
  // Look for emoji indicators
  if (body.includes('🟢') || body.toLowerCase().includes('supports decentralized')) {
    const reason = extractThesisReason(body, '🟢') ||
                   extractThesisReason(body, 'SUPPORTS DECENTRALIZED') ||
                   'Evidence for local/efficient AI advancement'
    return { signal: 'supports_decentralized', reason }
  }

  if (body.includes('🔴') || body.toLowerCase().includes('supports centralized')) {
    const reason = extractThesisReason(body, '🔴') ||
                   extractThesisReason(body, 'SUPPORTS CENTRALIZED') ||
                   'Reinforces centralized narrative'
    return { signal: 'supports_centralized', reason }
  }

  if (body.includes('⚪') || body.toLowerCase().includes('neutral')) {
    const reason = extractThesisReason(body, '⚪') ||
                   extractThesisReason(body, 'NEUTRAL') ||
                   'Orthogonal to the centralized/decentralized debate'
    return { signal: 'neutral', reason }
  }

  // Default based on content analysis
  return { signal: 'neutral', reason: 'Thesis signal not explicitly stated' }
}

/**
 * Extract the reason following a thesis signal marker.
 */
function extractThesisReason(body: string, marker: string): string {
  const regex = new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^:]*[:—\\-]?\\s*(.+?)(?:\\n|$)`, 'i')
  const match = body.match(regex)
  if (match) {
    return match[1].trim().replace(/^\*+|\*+$/g, '')
  }
  return ''
}

/**
 * Extract key claims from body text.
 */
function extractKeyClaims(body: string): string[] {
  const sentences = body.split(/[.!?]/).map(s => s.trim()).filter(Boolean)

  // Key claims are typically short, assertive sentences
  const claims = sentences.filter(s =>
    s.length > 20 &&
    s.length < 200 &&
    !s.toLowerCase().includes('may') &&
    !s.toLowerCase().includes('might') &&
    !s.toLowerCase().includes('could') &&
    !s.toLowerCase().includes('however') &&
    !s.toLowerCase().includes('although')
  )

  return claims.slice(0, 3) // Max 3 key claims
}

/**
 * Extract caveats from body text.
 */
function extractCaveats(body: string): string[] {
  const sentences = body.split(/[.!?]/).map(s => s.trim()).filter(Boolean)

  // Caveats use limiting language
  const caveats = sentences.filter(s =>
    s.toLowerCase().includes('however') ||
    s.toLowerCase().includes('although') ||
    s.toLowerCase().includes('caveat') ||
    s.toLowerCase().includes('limitation') ||
    s.toLowerCase().includes('note that') ||
    s.toLowerCase().includes('keep in mind')
  )

  return caveats.slice(0, 2) // Max 2 caveats
}

// =============================================================================
// DEV MODE MOCK
// =============================================================================

/**
 * Mock compilation for dev mode (no API call).
 *
 * Produces meaningfully different output per voice:
 * - quick_scan: 1-2 para, punchy, thesis-forward
 * - deep_analysis: 4-5 para, McKinsey style, full structure
 * - social_post: Threads-optimized, hook + bullets + thesis
 */
export function mockCompileBriefing(
  paper: ClassifiedPaper,
  voicePreset: VoicePresetId
): DraftBriefing {
  const topicLabel = paper.matched_topics[0] || 'AI research'

  // Determine thesis signal based on paper characteristics
  const thesisSignal: ThesisSignal = paper.zone === 'red'
    ? 'supports_decentralized'
    : paper.relevance_score > 0.7
    ? 'supports_decentralized'
    : 'neutral'

  const thesisReason = thesisSignal === 'supports_decentralized'
    ? 'Evidence for local/efficient AI advancement'
    : 'Orthogonal to the centralized/decentralized debate'

  // Voice-specific content generation
  const content: Record<VoicePresetId, {
    headline: string
    lead: string
    analysis: string
  }> = {
    quick_scan: {
      headline: paper.zone === 'red'
        ? `Local AI just got a signal worth watching: ${paper.title.slice(0, 60)}`
        : `New ${topicLabel} research shifts the deployment calculus`,
      lead: `This paper addresses ${paper.matched_topics.join(' and ')}. ` +
        `The findings suggest the gap between frontier and local capability ` +
        `continues to narrow on targeted tasks. Watch for reproduction attempts.`,
      analysis: '',
    },
    deep_analysis: {
      headline: paper.zone === 'red'
        ? `Strategic signal: ${paper.title.slice(0, 60)}`
        : `${topicLabel} — new evidence for the trajectory`,
      lead: `This paper on ${paper.matched_topics.join(' and ')} signals continued progress toward local AI viability. ` +
        `For engineers building with the Cognitive Router pattern, this is relevant signal.`,
      analysis: `The paper addresses ${paper.title}. Categories: ${paper.categories.join(', ')}. ` +
        `Relevance score: ${paper.relevance_score.toFixed(2)}.\n\n` +
        `This type of research ${paper.zone === 'red' ? 'significantly advances' : 'incrementally supports'} the thesis ` +
        `that local inference can match or exceed cloud capabilities on targeted tasks.\n\n` +
        `Limitations remain: this is a mock briefing in dev mode. Full analysis requires Tier 2 compilation.`,
    },
    social_post: {
      headline: paper.zone === 'red'
        ? `🔴 This just changed the game for local AI 👇`
        : `New research in ${topicLabel} — here's what it means:`,
      lead: `${paper.matched_topics[0] || 'AI'} progress continues. ` +
        `Gap between local and frontier narrowing. Watch for real-world deployment.`,
      analysis: '',
    },
  }

  const selected = content[voicePreset]

  return {
    id: crypto.randomUUID(),
    paper,
    voice_preset: voicePreset,
    headline: selected.headline,
    lead: selected.lead,
    analysis: selected.analysis,
    thesis_signal: thesisSignal,
    thesis_reason: thesisReason,
    arxiv_url: paper.arxiv_url,
    key_claims: [
      `${topicLabel} findings suggest ${paper.zone === 'red' ? 'significant' : 'incremental'} progress`,
      `Local inference capabilities continue to improve`,
      `Cost trajectory favors decentralized deployment`,
    ],
    caveats: [
      'Mock briefing generated in dev mode — full analysis requires Tier 2',
      'Results should be verified against original paper',
    ],
    body: `${selected.lead}\n\n${selected.analysis}`, // Legacy field
    compiled_at: new Date().toISOString(),
    compiled_by: {
      tier: 0,
      model: 'dev-mode-mock',
      cost_usd: 0,
    },
  }
}
