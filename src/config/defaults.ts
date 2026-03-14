/**
 * arXiv Radar — Default Configuration
 * 
 * Watched topics organized by six strategic questions.
 * Each question maps to the Ratchet thesis about capability propagation
 * from frontier to local models.
 * 
 * @license CC BY 4.0
 */

// =============================================================================
// WATCHED CATEGORIES
// =============================================================================

export const ARXIV_CATEGORIES = [
  'cs.LG',   // Machine Learning
  'cs.CL',   // Computation and Language
  'cs.AI',   // Artificial Intelligence
  'cs.CV',   // Computer Vision (for efficient vision models)
  'cs.MA',   // Multi-Agent Systems (for governance/autonomy research)
  'cs.CY',   // Computers and Society (for edge deployment sustainability)
] as const

// =============================================================================
// WATCHED TOPICS — Organized by Strategic Question
// =============================================================================

export interface WatchedTopic {
  id: string
  name: string
  keywords: string[]
  priority: 'high' | 'medium' | 'low'
}

export const WATCHED_TOPICS: WatchedTopic[] = [
  // Q1: Is the gap closing?
  // Primary Ratchet evidence: small models matching large on production tasks
  {
    id: 'gap-closing',
    name: 'Is the Gap Closing?',
    keywords: [
      'small language model', 'SLM', 'small model',
      'distillation', 'knowledge distillation',
      'task-specific fine-tuning', 'targeted fine-tuning',
      'per-parameter efficiency', 'parameter efficiency',
      'matching large model', 'outperforming',
      'Phi-4', 'Gemma', 'TinyLlama', 'MobileLLM',
      'compact model', 'efficient model',
      'SLM benchmark', 'small model performance',
      'model compression', 'capability transfer',
    ],
    priority: 'high',
  },

  // Q2: Is the cost falling?
  // Tier migration triggers: cost collapse events
  {
    id: 'cost-falling',
    name: 'Is the Cost Falling?',
    keywords: [
      'quantization', 'quantized', 'GPTQ', 'AWQ', 'GGUF', 'GGML',
      'INT4', 'INT8', 'FP8', 'FP4', 'NVFP4', 'MXFP4',
      '4-bit', '8-bit', '2-bit', '1-bit',
      'low-bit', 'mixed-precision',
      'edge deployment', 'on-device', 'local inference',
      'consumer hardware', 'consumer GPU',
      'inference cost', 'cost per token', 'self-hosted',
      'tokens per second', 'throughput', 'latency optimization',
      'llama.cpp', 'vLLM', 'TensorRT', 'ONNX', 'Core ML',
      'Apple Silicon', 'Metal', 'NPU', 'RTX',
      'energy efficiency', 'energy per request',
      'break-even', 'total cost of ownership',
    ],
    priority: 'high',
  },

  // Q3: Is governance missing?
  // The gap between capability and accountability
  {
    id: 'governance-missing',
    name: 'Is Governance Missing?',
    keywords: [
      'agent autonomy', 'autonomous agent', 'agentic AI',
      'AI governance', 'AI oversight', 'human oversight',
      'levels of autonomy', 'autonomy levels',
      'controllable autonomy', 'execution constraints',
      'cascading failure', 'cascading error',
      'agent safety', 'agent alignment',
      'decision authority', 'process autonomy', 'accountability',
      'zone-based', 'zone model', 'governance framework',
      'human-in-the-loop', 'human approval',
    ],
    priority: 'high',
  },

  // Q4: Is sovereignty possible?
  // Evidence you don't have to rent cognition
  {
    id: 'sovereignty-possible',
    name: 'Is Sovereignty Possible?',
    keywords: [
      'open-weight', 'open weight', 'open source model',
      'Llama', 'Mistral', 'Qwen', 'DeepSeek',
      'self-hosted', 'on-premise', 'data residency',
      'GDPR', 'AI Act', 'regulatory',
      'privacy-preserving', 'data sovereignty',
      'local deployment', 'enterprise deployment',
      'federated', 'decentralized inference',
    ],
    priority: 'medium',
  },

  // Q5: What's the frontier doing?
  // Track the wave the Ratchet rides
  {
    id: 'frontier-tracking',
    name: "What's the Frontier Doing?",
    keywords: [
      'scaling law', 'frontier model', 'foundation model',
      'GPT-5', 'Claude', 'Gemini', 'training breakthrough',
      'mixture of experts', 'MoE', 'state-space model',
      'architecture innovation', 'training efficiency',
      'SLM-LLM collaboration', 'cascade routing',
      'speculative decoding', 'hybrid ecosystem',
    ],
    priority: 'medium',
  },

  // Q6: Is the gap widening? (Falsification Watch)
  // Evidence against the Ratchet thesis — gets equal structural rigor
  {
    id: 'gap-widening',
    name: 'Is the Gap Widening?',
    keywords: [
      'emergent capability', 'emergent abilities',
      'reasoning requires scale', 'scale-dependent',
      'compression limits', 'quantization degradation',
      'distillation limits', 'capability loss',
      'large model only', 'cannot be distilled',
      'diminishing returns', 'compression plateau',
      'long-horizon planning', 'open-domain reasoning',
      'scaling advantage', 'scale-only capability',
    ],
    priority: 'high', // Equal priority to confirming evidence
  },
]

// =============================================================================
// WATCHED AUTHORS — Researchers whose work affects tier migration
// =============================================================================

export const WATCHED_AUTHORS: string[] = [
  // Quantization / efficiency researchers
  'Tim Dettmers',
  'Song Han',
  'Ji Lin',
  
  // Local inference infrastructure
  'Georgi Gerganov',
  
  // Open-weight lab leads
  'Yann LeCun',       // Meta AI — open-weight champion
  'Arthur Mensch',    // Mistral
  'Junyang Lin',      // Qwen team lead
  
  // SLM-for-agents thesis
  'Peter Belcak',     // NVIDIA — "SLMs are the Future of Agentic AI"
  'Pavlo Molchanov',  // NVIDIA — SLM deployment research
  
  // Governance / safety researchers
  'Zeynep Engin',     // Dimensional governance for agentic AI
  
  // Frontier lab leads (tracking what Tier 1 looks like in 2 years)
  'Dario Amodei',
  'Demis Hassabis',
  'Noam Shazeer',
]

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const ARXIV_CONFIG = {
  endpoint: 'https://export.arxiv.org/api/query',
  maxResultsPerPoll: 100,
  pollIntervalMs: 24 * 60 * 60 * 1000, // Daily (arXiv updates once per day)
  rateLimitDelayMs: 1000, // 1 second between requests
  sortBy: 'submittedDate',
  sortOrder: 'descending',
} as const

// =============================================================================
// RELEVANCE THRESHOLDS
// =============================================================================

export const RELEVANCE_THRESHOLDS = {
  greenMax: 0.4,    // Below this → GREEN zone (auto-archive, no tier migration signal)
  yellowMax: 0.8,   // Below this → YELLOW zone (trajectory confirmation, generate briefing)
  // >= 0.8 → RED zone (potential tier migration event or falsification evidence)
  jidokaFloor: 0.25, // Below this → pipeline halts, don't guess
} as const

// =============================================================================
// HELPER: Flatten all keywords for Tier 0 matching
// =============================================================================

export function getAllKeywords(): string[] {
  return WATCHED_TOPICS.flatMap(topic => topic.keywords)
}

export function getTopicByKeyword(keyword: string): WatchedTopic | undefined {
  const lower = keyword.toLowerCase()
  return WATCHED_TOPICS.find(topic => 
    topic.keywords.some(k => k.toLowerCase() === lower)
  )
}

export function getTopicById(id: string): WatchedTopic | undefined {
  return WATCHED_TOPICS.find(topic => topic.id === id)
}
