/**
 * arXiv Radar — Classifier Service
 *
 * Recognition stage: Tier cascade for paper classification.
 * T0 (skills) → T0 (keywords) → T1/T2 (LLM)
 *
 * @license CC BY 4.0
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ArxivPaper, ClassifiedPaper } from '../state/types'
import type { Skill, Settings } from '../types/app'
import type { Zone, Significance } from '../config/zones'
import { WATCHED_TOPICS, RELEVANCE_THRESHOLDS } from '../config/defaults'
import { assignZone, shouldTriggerJidoka } from '../config/zones'
import { generatePatternHash } from '../lib/patternHash'
import { loadSeedPapersWithMetadata } from './arxiv'
import { getClassifyPrompt } from '../lib/loadPrompts'
import { getClassificationContext } from '../lib/loadKnowledge'
import {
  createJidokaHalt,
  createConfidenceHalt,
  createConflictingThesisHalt,
  createMissingApiKeyHalt,
  type JidokaTrigger,
} from './jidoka'
import type { JidokaEvent } from '../state/types'

// Rough pricing estimate (directional, not authoritative)
const COST_PER_INPUT_TOKEN = 0.000003 // ~$3/1M
const COST_PER_OUTPUT_TOKEN = 0.000015 // ~$15/1M

// =============================================================================
// CLASSIFICATION RESULT
// =============================================================================

export interface ClassificationResult {
  success: boolean
  paper?: ClassifiedPaper
  jidokaHalt?: JidokaEvent
  tier: 'T0-skill' | 'T0-keyword' | 'T1' | 'T2' | 'dev-mode'
  cost_usd?: number
}

// =============================================================================
// NOTE: JIDOKA IS NOW STRUCTURAL
// =============================================================================
//
// Jidoka enforcement has moved to the transition layer (useAutonomaton.ts).
// The classifier ONLY does classification. Jidoka guards run automatically
// in transition() before any PAPER_CLASSIFIED action is dispatched.
//
// This is the correct architecture: the classifier is a pure function that
// classifies. The orchestrator enforces governance. Separation of concerns.
// =============================================================================

// =============================================================================
// TIER 0: SKILL MATCHING
// =============================================================================

/**
 * Check if any promoted skill handles this paper
 */
export function matchSkills(
  paper: ArxivPaper,
  skills: Skill[]
): { matched: boolean; skill?: Skill; matchedKeywords: string[]; matchedTopics: string[] } {
  const textToSearch = `${paper.title} ${paper.abstract}`.toLowerCase()

  for (const skill of skills) {
    if (skill.deprecated) continue

    // Check keyword matches
    const matchedKeywords = skill.matched_keywords.filter(kw =>
      textToSearch.includes(kw.toLowerCase())
    )

    if (matchedKeywords.length >= 2) {
      return {
        matched: true,
        skill,
        matchedKeywords,
        matchedTopics: skill.matched_topics,
      }
    }
  }

  return { matched: false, matchedKeywords: [], matchedTopics: [] }
}

// =============================================================================
// TIER 0: KEYWORD MATCHING
// =============================================================================

/**
 * Match paper against watched keywords
 * Returns matched topics and keywords with relevance score
 */
export function matchKeywords(
  paper: ArxivPaper
): { score: number; matchedTopics: string[]; matchedKeywords: string[] } {
  const textToSearch = `${paper.title} ${paper.abstract}`.toLowerCase()

  const matchedTopics: string[] = []
  const matchedKeywords: string[] = []
  let totalScore = 0

  for (const topic of WATCHED_TOPICS) {
    let topicMatches = 0

    for (const keyword of topic.keywords) {
      if (textToSearch.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
        topicMatches++
      }
    }

    if (topicMatches > 0) {
      matchedTopics.push(topic.id)
      // Weight by priority
      const priorityWeight = topic.priority === 'high' ? 1.5 : topic.priority === 'medium' ? 1.0 : 0.5
      totalScore += topicMatches * priorityWeight * 0.1
    }
  }

  // Normalize score to 0-1 range
  const normalizedScore = Math.min(1, totalScore)

  return {
    score: normalizedScore,
    matchedTopics,
    matchedKeywords,
  }
}

// =============================================================================
// JIDOKA CHECK
// =============================================================================

/**
 * Check if classification should trigger Jidoka halt
 */
export function checkJidoka(
  confidenceScore: number,
  matchedTopics: string[],
  paperId: string
): { halt: boolean; event?: JidokaEvent } {
  // Check for conflicting thesis FIRST (most important)
  // Paper matches both "gap-closing" (Q1) and "gap-widening" (Q6)
  if (
    matchedTopics.includes('gap-closing') &&
    matchedTopics.includes('gap-widening')
  ) {
    return {
      halt: true,
      event: createConflictingThesisHalt(matchedTopics, paperId),
    }
  }

  // Check confidence threshold
  const jidokaResult = shouldTriggerJidoka(confidenceScore, matchedTopics)
  if (jidokaResult.halt) {
    if (jidokaResult.trigger === 'confidence_below_threshold') {
      return {
        halt: true,
        event: createConfidenceHalt(confidenceScore, paperId),
      }
    }
    if (jidokaResult.trigger === 'conflicting_thesis') {
      return {
        halt: true,
        event: createConflictingThesisHalt(matchedTopics, paperId),
      }
    }
  }

  return { halt: false }
}

// =============================================================================
// DEV MODE CLASSIFICATION
// =============================================================================

/**
 * Mock classification using _expected_zone from seed data.
 * Jidoka is enforced at the transition layer, not here.
 */
export function devModeClassify(paper: ArxivPaper): ClassificationResult {
  // Get expected zone from seed metadata
  const seedPapers = loadSeedPapersWithMetadata()
  const seedPaper = seedPapers.find(p => p.arxiv_id === paper.arxiv_id)
  const expectedZone = seedPaper?._expected_zone

  // First, do keyword matching to get topics
  const keywordMatch = matchKeywords(paper)

  // Determine zone from expected or score
  let zone: Zone
  if (expectedZone && (expectedZone === 'green' || expectedZone === 'yellow' || expectedZone === 'red')) {
    zone = expectedZone
  } else if (expectedZone === 'jidoka_halt') {
    // Expected to halt — let gateway handle it
    zone = 'red' // Will be overridden by gateway
  } else {
    zone = assignZone(keywordMatch.score, keywordMatch.score >= 0.8)
  }

  // Check if this is falsification evidence (Q6)
  const isFalsificationSignal = keywordMatch.matchedTopics.includes('gap-widening')

  // Determine significance
  let significance: Significance
  if (zone === 'red') {
    significance = 'breakthrough'
  } else if (zone === 'yellow') {
    significance = 'significant'
  } else {
    significance = 'routine'
  }

  // Generate pattern hash for Flywheel
  const patternHash = generatePatternHash(
    keywordMatch.matchedTopics,
    zone,
    keywordMatch.matchedKeywords.slice(0, 3)
  )

  const classifiedPaper: ClassifiedPaper = {
    ...paper,
    relevance_score: keywordMatch.score,
    matched_topics: keywordMatch.matchedTopics,
    matched_keywords: keywordMatch.matchedKeywords,
    significance,
    zone,
    pattern_hash: patternHash,
    falsification_signal: isFalsificationSignal,
    classified_at: new Date().toISOString(),
    classified_by: {
      tier: 0, // Dev mode is Tier 0
      model: 'dev-mode-mock',
    },
  }

  // Jidoka is enforced at transition layer, not here
  return {
    success: true,
    paper: classifiedPaper,
    tier: 'dev-mode',
    cost_usd: 0,
  }
}

// =============================================================================
// LLM CLASSIFICATION (Tier 2)
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
function createAnthropicClient(apiKey: string): Anthropic {
  const baseURL = `${window.location.origin}/anthropic-api`
  return new Anthropic({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true, // Required for browser context
  })
}

/**
 * LLM classification response from Claude
 */
interface LLMClassificationResponse {
  relevance_score: number
  matched_topics?: string[]
  matched_keywords?: string[]
  significance?: 'routine' | 'significant' | 'breakthrough'
  zone?: 'green' | 'yellow' | 'red'
  strategic_questions?: {
    gap_closing?: number
    cost_falling?: number
    governance_missing?: number
    sovereignty_possible?: number
    frontier_tracking?: number
    gap_widening?: number
  }
  falsification_signal?: boolean
  jidoka?: boolean
  jidoka_trigger?: 'confidence_below_threshold' | 'conflicting_thesis'
  rationale?: string
}

/**
 * LLM classification for Tier 2
 * Uses Anthropic API via Vite dev proxy to classify papers
 */
export async function llmClassify(
  paper: ArxivPaper,
  _knowledge: string, // Unused - we load knowledge directly
  apiKey: string
): Promise<ClassificationResult> {
  const client = createAnthropicClient(apiKey)

  // Build the system prompt with classification instructions and knowledge
  const classifyPrompt = getClassifyPrompt()
  const knowledgeContext = getClassificationContext()
  const systemPrompt = `${classifyPrompt}\n\n${knowledgeContext}`

  // Build the user message with paper details
  const userMessage = `## Paper to Classify

**Title:** ${paper.title}

**Authors:** ${paper.authors.join(', ')}

**Categories:** ${paper.categories.join(', ')}

**Abstract:**
${paper.abstract}

---

Return the JSON classification now. Follow the instructions exactly.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    })

    // Calculate cost
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const estimatedCost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN)

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        jidokaHalt: createJidokaHalt(
          'recognition',
          'malformed_data',
          'No text content in LLM response',
          paper.arxiv_id
        ),
        tier: 'T2',
        cost_usd: estimatedCost,
      }
    }

    // Parse JSON from response
    const rawOutput = textContent.text
    let parsed: LLMClassificationResponse

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawOutput.trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return {
        success: false,
        jidokaHalt: createJidokaHalt(
          'recognition',
          'malformed_data',
          `Failed to parse LLM classification response: ${rawOutput.slice(0, 200)}`,
          paper.arxiv_id
        ),
        tier: 'T2',
        cost_usd: estimatedCost,
      }
    }

    // Check if LLM returned Jidoka flag
    if (parsed.jidoka) {
      if (parsed.jidoka_trigger === 'conflicting_thesis') {
        return {
          success: false,
          jidokaHalt: createConflictingThesisHalt(
            parsed.matched_topics || [],
            paper.arxiv_id
          ),
          tier: 'T2',
          cost_usd: estimatedCost,
        }
      }
      if (parsed.jidoka_trigger === 'confidence_below_threshold') {
        return {
          success: false,
          jidokaHalt: createConfidenceHalt(
            parsed.relevance_score || 0,
            paper.arxiv_id
          ),
          tier: 'T2',
          cost_usd: estimatedCost,
        }
      }
      // Generic Jidoka halt
      return {
        success: false,
        jidokaHalt: createJidokaHalt(
          'recognition',
          'confidence_below_threshold',
          parsed.rationale || 'LLM flagged for human review',
          paper.arxiv_id
        ),
        tier: 'T2',
        cost_usd: estimatedCost,
      }
    }

    // Build classified paper
    const zone: Zone = parsed.zone || assignZone(parsed.relevance_score, false)
    const matchedTopics = parsed.matched_topics || []
    const matchedKeywords = parsed.matched_keywords || []
    const patternHash = generatePatternHash(
      matchedTopics,
      zone,
      matchedKeywords.slice(0, 3)
    )

    const classifiedPaper: ClassifiedPaper = {
      ...paper,
      relevance_score: parsed.relevance_score,
      matched_topics: matchedTopics,
      matched_keywords: matchedKeywords,
      significance: parsed.significance || 'routine',
      zone,
      pattern_hash: patternHash,
      falsification_signal: parsed.falsification_signal || false,
      classified_at: new Date().toISOString(),
      classified_by: {
        tier: 2,
        model: response.model,
      },
    }

    return {
      success: true,
      paper: classifiedPaper,
      tier: 'T2',
      cost_usd: estimatedCost,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      jidokaHalt: createJidokaHalt(
        'recognition',
        'api_failure',
        `Anthropic API error: ${errorMessage}`,
        paper.arxiv_id
      ),
      tier: 'T2',
      cost_usd: 0,
    }
  }
}

// =============================================================================
// MAIN CLASSIFIER
// =============================================================================

/**
 * Classify a paper through the tier cascade:
 * T0 (skills) → T0 (keywords) → T1/T2 (LLM)
 */
export async function classifyPaper(
  paper: ArxivPaper,
  skills: Skill[],
  settings: Settings
): Promise<ClassificationResult> {
  // DEV MODE: Use mock classification
  if (settings.dev_mode) {
    return devModeClassify(paper)
  }

  // TIER 0: Check promoted skills first
  const skillMatch = matchSkills(paper, skills)
  if (skillMatch.matched && skillMatch.skill) {
    const patternHash = skillMatch.skill.pattern_hash

    // Generate classified paper from skill
    const classifiedPaper: ClassifiedPaper = {
      ...paper,
      relevance_score: 0.7, // Skills fire at known good relevance
      matched_topics: skillMatch.matchedTopics,
      matched_keywords: skillMatch.matchedKeywords,
      significance: 'routine', // Skills handle routine cases
      zone: skillMatch.skill.zone,
      pattern_hash: patternHash,
      classified_at: new Date().toISOString(),
      classified_by: {
        tier: 0,
        model: `skill:${skillMatch.skill.id}`,
      },
    }

    // Jidoka is enforced at transition layer, not here
    return {
      success: true,
      paper: classifiedPaper,
      tier: 'T0-skill',
      cost_usd: 0,
    }
  }

  // TIER 0: Keyword matching
  const keywordMatch = matchKeywords(paper)

  // If we have strong keyword matches, classify at Tier 0
  if (keywordMatch.score >= RELEVANCE_THRESHOLDS.yellowMax) {
    // High confidence from keywords alone
    const zone = assignZone(keywordMatch.score, keywordMatch.score >= 0.8)
    const isFalsificationSignal = keywordMatch.matchedTopics.includes('gap-widening')
    const patternHash = generatePatternHash(
      keywordMatch.matchedTopics,
      zone,
      keywordMatch.matchedKeywords.slice(0, 3)
    )

    const classifiedPaper: ClassifiedPaper = {
      ...paper,
      relevance_score: keywordMatch.score,
      matched_topics: keywordMatch.matchedTopics,
      matched_keywords: keywordMatch.matchedKeywords,
      significance: zone === 'red' ? 'breakthrough' : zone === 'yellow' ? 'significant' : 'routine',
      zone,
      pattern_hash: patternHash,
      falsification_signal: isFalsificationSignal,
      classified_at: new Date().toISOString(),
      classified_by: {
        tier: 0,
      },
    }

    // Jidoka is enforced at transition layer, not here
    return {
      success: true,
      paper: classifiedPaper,
      tier: 'T0-keyword',
      cost_usd: 0,
    }
  }

  // TIER 2: LLM classification needed
  if (!settings.api_key) {
    return {
      success: false,
      jidokaHalt: createMissingApiKeyHalt(),
      tier: 'T2',
      cost_usd: 0,
    }
  }

  // LLM classification with Anthropic API
  return llmClassify(paper, getClassificationContext(), settings.api_key)
}

// =============================================================================
// BATCH CLASSIFICATION
// =============================================================================

/**
 * Classify multiple papers
 */
export async function classifyPapers(
  papers: ArxivPaper[],
  skills: Skill[],
  settings: Settings
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = []

  for (const paper of papers) {
    const result = await classifyPaper(paper, skills, settings)
    results.push(result)
  }

  return results
}
