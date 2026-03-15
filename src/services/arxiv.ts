/**
 * arXiv Radar — arXiv Service
 *
 * Handles loading seed papers for dev mode and fetching from arXiv API.
 *
 * @license CC BY 4.0
 */

import type { ArxivPaper } from '../state/types'
import { ARXIV_CONFIG } from '../config/defaults'
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

/** arXiv API base URL (proxied through Vite to avoid CORS) */
const ARXIV_API_BASE = '/arxiv-api/api/query'

/** Default query parameters */
const DEFAULT_QUERY_PARAMS = {
  sortBy: 'lastUpdatedDate',
  sortOrder: 'descending',
  maxResults: 50,
}

/**
 * Fetch papers from arXiv API
 */
export async function fetchArxivPapers(
  query: string,
  maxResults: number = 50
): Promise<ArxivPaper[]> {
  const url = buildQueryUrl(query, maxResults)

  // Rate limit: arXiv requests 1 second delay between requests
  await new Promise(resolve => setTimeout(resolve, ARXIV_CONFIG.rateLimitDelayMs))

  console.log(`[arXiv] Fetching: ${url}`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`arXiv API returned ${response.status}: ${response.statusText}`)
  }

  const xml = await response.text()
  const papers = parseArxivResponse(xml)
  console.log(`[arXiv] Parsed ${papers.length} papers`)
  return papers
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
 */
export function parseArxivResponse(xml: string): ArxivPaper[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent?.slice(0, 200)}`)
  }

  const entries = doc.querySelectorAll('entry')

  return Array.from(entries).map(entry => {
    const rawId = entry.querySelector('id')?.textContent ?? ''
    // arXiv IDs come as URLs: http://arxiv.org/abs/2506.01234v1
    // Strip to just the ID portion
    const arxivId = rawId
      .replace('http://arxiv.org/abs/', '')
      .replace('https://arxiv.org/abs/', '')
      .replace(/v\d+$/, '') // Strip version suffix

    const title = (entry.querySelector('title')?.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ') // Collapse whitespace/newlines

    const abstract = (entry.querySelector('summary')?.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ')

    const authors = Array.from(entry.querySelectorAll('author name'))
      .map(n => n.textContent?.trim() ?? '')
      .filter(Boolean)

    const categories = Array.from(entry.querySelectorAll('category'))
      .map(c => c.getAttribute('term') ?? '')
      .filter(Boolean)

    const published = entry.querySelector('published')?.textContent ?? ''
    const updated = entry.querySelector('updated')?.textContent ?? published

    // PDF link from <link> elements
    const links = Array.from(entry.querySelectorAll('link'))
    const pdfLink = links.find(l => l.getAttribute('title') === 'pdf')
    const pdfUrl = pdfLink?.getAttribute('href') ?? `https://arxiv.org/pdf/${arxivId}`

    return {
      arxiv_id: arxivId,
      title,
      abstract,
      authors,
      categories,
      published,
      updated,
      pdf_url: pdfUrl,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    }
  })
}
