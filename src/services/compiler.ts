/**
 * arXiv Radar — Compiler Service
 *
 * Tier 2 briefing compilation using Anthropic API.
 * Takes a classified paper and produces a voice-appropriate briefing.
 *
 * @license CC BY 4.0
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClassifiedPaper, DraftBriefing } from '../state/types'
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

    // Parse the output into headline and body
    const { headline, body, key_claims, caveats, tier_migration_impact } = parseBriefingOutput(rawOutput)

    // Calculate costs
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const estimatedCost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN)

    const briefing: DraftBriefing = {
      id: crypto.randomUUID(),
      paper,
      voice_preset: voicePreset,
      headline,
      body,
      key_claims,
      caveats,
      tier_migration_impact,
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

/**
 * Parse raw LLM output into structured briefing fields.
 */
function parseBriefingOutput(raw: string): {
  headline: string
  body: string
  key_claims: string[]
  caveats: string[]
  tier_migration_impact?: string
} {
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
  const body = bodyLines.join('\n\n').trim()

  // Extract key claims (sentences that state findings as facts)
  const key_claims = extractKeyClaims(body)

  // Extract caveats (sentences with limiting language)
  const caveats = extractCaveats(body)

  return {
    headline,
    body,
    key_claims,
    caveats,
    tier_migration_impact: undefined, // Could be extracted with more sophisticated parsing
  }
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
 * - news_brief: ≤150 words, 8th grade, "what changed → why it matters → what to watch"
 * - technical_summary: ≤250 words, ML background assumed, method/edge/caveats/tier impact
 * - strategic_intel: ≤100 words, no technical details, business impact focus
 */
export function mockCompileBriefing(
  paper: ClassifiedPaper,
  voicePreset: VoicePresetId
): DraftBriefing {
  const voice = getVoicePreset(voicePreset)
  const topicLabel = paper.matched_topics[0] || 'AI research'
  const zoneLabel = paper.zone.toUpperCase()

  // Voice-specific headline generation
  const headlines: Record<VoicePresetId, string> = {
    news_brief: paper.zone === 'red'
      ? `Local AI just got a signal worth watching: ${paper.title.slice(0, 60)}`
      : `New ${topicLabel} research shifts the deployment calculus`,
    technical_summary: paper.zone === 'red'
      ? `[${zoneLabel}] Tier migration signal: ${paper.title.slice(0, 60)}`
      : `[${zoneLabel}] ${paper.title.slice(0, 80)}`,
    strategic_intel: paper.zone === 'red'
      ? `Strategic signal: cost projection may need revision`
      : `${topicLabel} — trajectory update`,
  }

  // Voice-specific body generation
  const bodies: Record<VoicePresetId, string> = {
    news_brief: `${voice.example_opening || ''}\n\n` +
      `This paper addresses ${paper.matched_topics.join(' and ')}. ` +
      `The findings suggest the gap between frontier and local capability ` +
      `continues to narrow on targeted tasks. ` +
      `Watch for reproduction attempts and real-world deployment benchmarks.`,
    technical_summary: `**Method:** ${paper.title}\n\n` +
      `**Categories:** ${paper.categories.join(', ')}\n\n` +
      `**Edge viability:** Classification pending full analysis. ` +
      `Matched topics: ${paper.matched_topics.join(', ')}. ` +
      `Relevance score: ${paper.relevance_score.toFixed(2)}.\n\n` +
      `**Caveats:** Mock briefing — full analysis requires Tier 2 compilation.\n\n` +
      `**Tier migration impact:** ${paper.zone === 'red' ? 'High — potential timeline acceleration' : 'Moderate — confirms existing trajectory'}.`,
    strategic_intel: paper.zone === 'red'
      ? `A development in ${topicLabel} may accelerate the tier migration timeline. ` +
        `If confirmed, this changes the cost projection for local inference.`
      : `Incremental progress in ${topicLabel}. ` +
        `Trajectory holds. No change to current deployment timeline.`,
  }

  return {
    id: crypto.randomUUID(),
    paper,
    voice_preset: voicePreset,
    headline: headlines[voicePreset],
    body: bodies[voicePreset],
    key_claims: [`${topicLabel} findings suggest ${paper.zone === 'red' ? 'significant' : 'incremental'} progress`],
    caveats: ['Mock briefing generated in dev mode — full analysis requires Tier 2'],
    tier_migration_impact: paper.zone === 'red' ? 'High — potential timeline acceleration' : undefined,
    compiled_at: new Date().toISOString(),
    compiled_by: {
      tier: 0,
      model: 'dev-mode-mock',
      cost_usd: 0,
    },
  }
}
