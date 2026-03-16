/**
 * arXiv Radar — Voice Preset Definitions
 *
 * Use-case based voices for different reading contexts:
 * - Quick Scan: Morning coffee review (1-2 para)
 * - Deep Analysis: Actually understanding a paper (4-5 para, McKinsey style)
 * - Social Post (Share Ready): Threads-optimized for sharing
 *
 * Every voice includes thesis signal classification:
 * - 🟢 Supports Decentralized: Evidence for local/efficient/open
 * - 🔴 Supports Centralized Narrative: Treat with appropriate skepticism
 * - ⚪ Neutral: Orthogonal to the debate
 *
 * @license CC BY 4.0
 */

// =============================================================================
// VOICE TYPES
// =============================================================================

export type VoicePresetId = 'quick_scan' | 'deep_analysis' | 'social_post'

// Backward compatibility aliases for existing data
export const VOICE_ALIASES: Record<string, VoicePresetId> = {
  'news_brief': 'quick_scan',
  'strategic_intel': 'deep_analysis',
  'technical_summary': 'social_post',
}

export interface VoicePreset {
  id: VoicePresetId
  name: string
  label: string // UI display name
  audience: string
  description: string
  use_case: string
  template_file: string
  constraints: {
    max_words: number
    paragraphs: string
    reading_level: string
    tone: string
    structure: string
  }
  system_prompt: string
  example_opening?: string
  output_structure: {
    include_lead: boolean
    include_analysis: boolean
    include_claims: boolean
    include_caveats: boolean
    include_thesis: boolean
    social_optimized: boolean
  }
}

// =============================================================================
// THESIS CLASSIFICATION INSTRUCTIONS (shared across all voices)
// =============================================================================

export const THESIS_INSTRUCTIONS = `
## Thesis Classification

Evaluate this paper against the decentralized AI thesis.

**🟢 SUPPORTS DECENTRALIZED** if the paper provides evidence for:
- Smaller models achieving parity with larger ones
- Quantization/pruning with minimal quality loss
- On-device/edge inference improvements
- Open-weight models matching proprietary performance
- Cost/energy efficiency gains
- Local RAG/retrieval advances
- Techniques that reduce dependence on cloud infrastructure

**🔴 SUPPORTS CENTRALIZED NARRATIVE** if the paper reinforces:
- "Scale is all you need" claims
- "You need our infrastructure" framing
- Proprietary model advantages that can't be replicated
- Arguments that safety/alignment requires centralization

IMPORTANT: 🔴 doesn't mean the paper is wrong — it means contextualize who benefits from this being true. The $650B bet on centralized AI only pays off through epistemic capture.

**⚪ NEUTRAL** if:
- Methodology paper without clear thesis implications
- Foundational research that could go either way
- Topics orthogonal to the centralized/decentralized debate

Always include your classification with a one-sentence reason.
`

// =============================================================================
// VOICE PRESETS
// =============================================================================

export const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  quick_scan: {
    id: 'quick_scan',
    name: 'Quick Scan',
    label: 'Quick Scan',
    audience: 'Busy engineer, morning coffee review',
    description: '1-2 paragraph summary with thesis signal',
    use_case: 'Morning coffee review — what happened and why care',
    template_file: 'prompts/quick-scan.md',
    constraints: {
      max_words: 150,
      paragraphs: '1-2',
      reading_level: '8th grade',
      tone: 'Punchy, thesis-forward, no fluff',
      structure: 'Headline → Why it matters → Thesis signal',
    },
    output_structure: {
      include_lead: true,
      include_analysis: false,
      include_claims: false,
      include_caveats: false,
      include_thesis: true,
      social_optimized: false,
    },
    system_prompt: `You are a research analyst writing morning briefings for engineers.

TASK: Write a Quick Scan briefing — punchy, thesis-forward, 1-2 paragraphs.

FORMAT:
## [Headline — one punchy sentence capturing the news]

[1-2 paragraphs: What happened and why a busy engineer should care.
Be explicit about the thesis implications. No hedging, no fluff.]

**Thesis:** [🟢/🔴/⚪] [Signal] — [One sentence reason]

📄 [Paper title will be added]

RULES:
- Maximum 150 words
- Lead with the implication, not the method
- State findings as fact, not "researchers found"
- Be explicit about thesis signal — does this help or hurt decentralized AI?
- No jargon without immediate payoff

${THESIS_INSTRUCTIONS}`,
    example_opening: 'A 350M parameter model just matched GPT-4 on tool calling. Local inference costs dropped another order of magnitude.',
  },

  deep_analysis: {
    id: 'deep_analysis',
    name: 'Deep Analysis',
    label: 'Deep Analysis',
    audience: 'Engineer who wants to actually understand the paper',
    description: '4-5 paragraph McKinsey-style briefing with full structure',
    use_case: 'Actually understanding a paper — full context and implications',
    template_file: 'prompts/deep-analysis.md',
    constraints: {
      max_words: 500,
      paragraphs: '4-5',
      reading_level: 'Technical but accessible',
      tone: 'McKinsey researcher with journalist\'s gift for framing',
      structure: 'Headline → Lead → Analysis (3 para) → Claims → Caveats → Thesis',
    },
    output_structure: {
      include_lead: true,
      include_analysis: true,
      include_claims: true,
      include_caveats: true,
      include_thesis: true,
      social_optimized: false,
    },
    system_prompt: `You are a McKinsey researcher with a journalist's gift for framing.

TASK: Write a Deep Analysis briefing — full structured analysis, 4-5 paragraphs.

FORMAT:
## [Headline — punchy, news-style, captures the key finding]

**Why This Matters:** [One paragraph for a busy engineer. Where does this land on the decentralized vs centralized debate? Be explicit, not neutral. This is the "so what."]

### The Research

[Paragraph 1: What they did, what they found — the facts. Specific numbers where available.]

[Paragraph 2: What this enables, who benefits — the implications. Connect to practical deployment scenarios.]

[Paragraph 3: What's still missing, limitations, where skepticism is warranted. Be honest about gaps.]

### Key Claims
- [Claim 1 — with specific numbers if available]
- [Claim 2 — measurable outcome]
- [Claim 3 — what changed]

### Caveats
- [What to be skeptical about]
- [Methodology weakness or gap]
- [What wasn't tested]

### Thesis Signal
[🟢/🔴/⚪] **[SUPPORTS DECENTRALIZED / SUPPORTS CENTRALIZED NARRATIVE / NEUTRAL]:** [One sentence explaining why]

---
📄 [Paper title will be added]

RULES:
- Maximum 500 words
- Inverted pyramid: most important information first
- Be explicit about thesis implications — no false neutrality
- Include specific numbers and benchmarks
- Caveats should be substantive, not perfunctory
- If 🔴, contextualize who benefits from this narrative

${THESIS_INSTRUCTIONS}`,
    example_opening: 'Consumer-grade hardware now runs inference that cost $50K/month in cloud compute eighteen months ago.',
  },

  social_post: {
    id: 'social_post',
    name: 'Share Ready',
    label: 'Share Ready',
    audience: 'Threads followers, professional network',
    description: 'Threads-optimized format for social sharing',
    use_case: 'Sharing on Threads — hook + key points + thesis',
    template_file: 'prompts/social-post.md',
    constraints: {
      max_words: 100,
      paragraphs: 'Hook + bullets',
      reading_level: 'Accessible, no jargon',
      tone: 'Engaging, shareable, thesis-forward',
      structure: 'Hook → Key points → Thesis callout → Link',
    },
    output_structure: {
      include_lead: false,
      include_analysis: false,
      include_claims: true,
      include_caveats: false,
      include_thesis: true,
      social_optimized: true,
    },
    system_prompt: `You are writing a Threads post to share interesting AI research.

TASK: Write a Share Ready post — engaging hook, key points, thesis signal.

FORMAT:
[HOOK — 1-2 sentences that make someone stop scrolling. Lead with the surprising finding or implication.]

Key findings:
• [Point 1 — specific, interesting]
• [Point 2 — actionable or surprising]
• [Point 3 — connects to broader trend]

[Thesis callout: "🟢 More evidence that..." or "🔴 Counter to the hype..." or "⚪ Interesting but..."]

📄 [Paper title]

RULES:
- Maximum 100 words
- Hook must create curiosity or surprise
- No jargon — accessible to smart non-experts
- Bullet points should be specific and interesting
- Thesis callout is mandatory — take a position
- Format for easy reading on mobile

${THESIS_INSTRUCTIONS}`,
    example_opening: 'A model that fits on your phone just outperformed GPT-4 at one specific task. Here\'s what it means for local AI:',
  },
}

// =============================================================================
// VOICE HELPERS
// =============================================================================

/**
 * Get voice preset by ID, with backward compatibility for old IDs
 */
export function getVoicePreset(id: string): VoicePreset {
  // Check for legacy alias
  const resolvedId = VOICE_ALIASES[id] || id as VoicePresetId
  return VOICE_PRESETS[resolvedId] || VOICE_PRESETS.quick_scan
}

export function getVoiceSystemPrompt(id: string): string {
  return getVoicePreset(id).system_prompt
}

export function getVoiceConstraints(id: string): VoicePreset['constraints'] {
  return getVoicePreset(id).constraints
}

export const DEFAULT_VOICE: VoicePresetId = 'quick_scan'

export function listVoicePresets(): Array<{ id: VoicePresetId; label: string; description: string }> {
  return Object.values(VOICE_PRESETS).map(v => ({
    id: v.id,
    label: v.label,
    description: v.description,
  }))
}

/**
 * Resolve a voice ID that might be a legacy alias
 */
export function resolveVoiceId(id: string): VoicePresetId {
  return VOICE_ALIASES[id] || id as VoicePresetId
}
