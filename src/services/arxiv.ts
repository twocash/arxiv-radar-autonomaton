/**
 * arXiv Radar — arXiv Service
 *
 * Handles loading seed papers for dev mode and fetching from arXiv API.
 *
 * @license CC BY 4.0
 */

import type { ArxivPaper } from '../state/types'
import samplePapers from '../seed/sample-papers.json'

// =============================================================================
// SEED DATA — Dev Mode
// =============================================================================

/**
 * Extended seed paper interface with test metadata
 */
interface SeedPaper extends ArxivPaper {
  _strategic_question?: string
  _expected_zone?: string
  _rationale?: string
}

/**
 * Load seed papers for dev mode testing
 * Returns 7 papers with expected behaviors for verification
 */
export function loadSeedPapers(): ArxivPaper[] {
  // Cast to typed array and strip test metadata
  const papers = samplePapers as SeedPaper[]

  return papers.map(({
    _strategic_question,
    _expected_zone,
    _rationale,
    ...paper
  }) => paper)
}

/**
 * Get seed papers with test metadata intact
 * Used for verification tests
 */
export function loadSeedPapersWithMetadata(): SeedPaper[] {
  return samplePapers as SeedPaper[]
}

/**
 * Get the expected zone for a seed paper (for testing)
 */
export function getExpectedZone(arxivId: string): string | undefined {
  const papers = samplePapers as SeedPaper[]
  const paper = papers.find(p => p.arxiv_id === arxivId)
  return paper?._expected_zone
}

/**
 * Get the Jidoka test paper (2510.03847)
 */
export function getJidokaTestPaper(): ArxivPaper | undefined {
  const papers = loadSeedPapers()
  return papers.find(p => p.arxiv_id === '2510.03847')
}

// =============================================================================
// ARXIV API — Live Mode (Future Implementation)
// =============================================================================

/** arXiv API base URL */
const ARXIV_API_BASE = 'https://export.arxiv.org/api/query'

/** Default query parameters */
const DEFAULT_QUERY_PARAMS = {
  sortBy: 'lastUpdatedDate',
  sortOrder: 'descending',
  maxResults: 50,
}

/**
 * Fetch papers from arXiv API
 *
 * TODO: Implement in Epic 7 when API integration is added
 * For now, returns seed papers in dev mode
 */
export async function fetchArxivPapers(
  query: string,
  maxResults: number = 50
): Promise<ArxivPaper[]> {
  // Placeholder for future arXiv API integration
  // In dev mode or when API fails, returns seed papers
  console.warn('[arXiv] API fetch not yet implemented. Returning seed papers.')
  return loadSeedPapers()
}

/**
 * Build arXiv API query URL
 */
export function buildQueryUrl(query: string, maxResults: number): string {
  const params = new URLSearchParams({
    search_query: query,
    sortBy: DEFAULT_QUERY_PARAMS.sortBy,
    sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
    max_results: String(maxResults),
  })

  return `${ARXIV_API_BASE}?${params.toString()}`
}

/**
 * Parse arXiv API Atom XML response into papers
 *
 * TODO: Implement XML parsing in Epic 7
 */
export function parseArxivResponse(xml: string): ArxivPaper[] {
  // Placeholder - will parse Atom XML format
  console.warn('[arXiv] XML parsing not yet implemented.')
  return []
}
