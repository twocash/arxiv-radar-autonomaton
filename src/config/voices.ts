/**
 * arXiv Radar — Voice Preset Definitions
 * 
 * Controls how briefings are written. Each voice has a system prompt,
 * constraints, and example output style.
 * 
 * Voice templates live in prompts/*.md — those are the authoritative source.
 * The system_prompt strings here are inline summaries for quick reference
 * and fallback. See the matching .md file for the full template.
 * 
 * @license CC BY 4.0
 */

// =============================================================================
// VOICE TYPES
// =============================================================================

export type VoicePresetId = 'news_brief' | 'technical_summary' | 'strategic_intel'

export interface VoicePreset {
  id: VoicePresetId
  name: string
  audience: string
  description: string
  template_file: string
  constraints: {
    max_words: number
    reading_level: string
    tone: string
    structure: string
  }
  system_prompt: string
  example_opening?: string
}

// =============================================================================
// VOICE PRESETS
// =============================================================================

export const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  news_brief: {
    id: 'news_brief',
    name: 'News Brief',
    audience: 'General reader, tech-curious professional',
    description: 'Lead with the strategic implication. What changed for people building AI locally?',
    template_file: 'prompts/news-brief.md',
    constraints: {
      max_words: 150,
      reading_level: '8th grade',
      tone: 'Insight-first, accessible, active voice',
      structure: 'Implication → Evidence → What to watch',
    },
    system_prompt: `You are a technology strategist who writes like a journalist.

RULES:
- Lead with the strategic implication. What changed? Why does it matter for people building AI locally?
- Use active voice. Short sentences. 8th grade reading level.
- No jargon without immediate explanation.
- Maximum 150 words.
- Structure: what changed → why it matters → what to watch.
- Never say "researchers say" or "the paper shows" — state the finding as fact.

Write a brief that answers: "What just changed for someone running a Cognitive Router?"`,
    example_opening: 'A 350-million-parameter model just outperformed ChatGPT on tool calling by 3x. The cost of Tier 1 inference dropped again.',
  },

  technical_summary: {
    id: 'technical_summary',
    name: 'Technical Summary',
    audience: 'Engineers evaluating deployment viability, not academic merit',
    description: 'Method → Does it work at edge scale → What\'s the catch → Tier migration impact.',
    template_file: 'prompts/technical-summary.md',
    constraints: {
      max_words: 250,
      reading_level: 'Technical (assume ML background)',
      tone: 'Precise, evaluative, skeptical',
      structure: 'Method → Edge viability → Reproducibility → Caveats → Tier migration impact',
    },
    system_prompt: `You are a senior ML engineer evaluating papers for deployment viability.

RULES:
- Assume reader has ML background. Use technical terms freely.
- Structure: What's the method? → Does it work at edge scale? → Can we reproduce? → What are the caveats? → Tier migration impact.
- Include specific numbers (accuracy %, speedup factor, memory reduction, cost per token).
- Flag missing information (no code, limited benchmarks, tested only on data center hardware).
- Maximum 250 words.
- Be skeptical. Note if results seem too good or only tested at scale.
- Always include: "Tier migration impact" as a closing assessment.

Write a summary that helps engineers decide whether this changes their deployment calculus.`,
    example_opening: 'OPT-350M fine-tuned with SFT achieves 77.55% pass rate on ToolBench, outperforming ChatGPT-CoT (26.00%) and ToolLLaMA-DFS (30.18%). Single epoch, targeted fine-tuning on a 2022-era architecture.',
  },

  strategic_intel: {
    id: 'strategic_intel',
    name: 'Strategic Intel',
    audience: 'Decision-makers, executives, investors',
    description: 'What changed → Who benefits → What to watch. No technical details.',
    // See prompts/strategic-intel.md for the authoritative template
    template_file: 'prompts/strategic-intel.md',
    constraints: {
      max_words: 100,
      reading_level: 'Executive (no technical details)',
      tone: 'Decisive, forward-looking, action-oriented',
      structure: 'What changed → Who benefits → What to watch',
    },
    system_prompt: `You are a strategic advisor briefing an executive on AI infrastructure shifts.

RULES:
- Skip the method. They don't care how it works.
- Focus on: What changed? Who benefits? What should we watch?
- No technical jargon. No accuracy numbers unless dramatically significant.
- Maximum 100 words.
- Frame in terms of cost trajectory, competitive positioning, and tier migration timing.
- The question to answer: "Does this change our cost projection or when we move a task down a tier?"

Write a brief that a CEO reads in 30 seconds and knows what to do.`,
    example_opening: 'Consumer hardware can now run production inference that cost $50,000/month in cloud compute eighteen months ago. The break-even timeline just collapsed from twelve months to four.',
  },
}

// =============================================================================
// VOICE HELPERS
// =============================================================================

export function getVoicePreset(id: VoicePresetId): VoicePreset {
  return VOICE_PRESETS[id]
}

export function getVoiceSystemPrompt(id: VoicePresetId): string {
  return VOICE_PRESETS[id].system_prompt
}

export function getVoiceConstraints(id: VoicePresetId): VoicePreset['constraints'] {
  return VOICE_PRESETS[id].constraints
}

export const DEFAULT_VOICE: VoicePresetId = 'news_brief'

export function listVoicePresets(): Array<{ id: VoicePresetId; name: string; description: string }> {
  return Object.values(VOICE_PRESETS).map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
  }))
}
