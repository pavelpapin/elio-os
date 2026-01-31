/**
 * Exa.ai Research Functions
 * Higher-level research operations
 */

import { search, searchAndContents } from './search.js';
import type { ExaResult, ResearchResult } from './types.js';

/**
 * Research a topic using Exa's semantic search
 */
export async function researchTopic(
  topic: string,
  options: {
    numResults?: number;
    includeNews?: boolean;
    includePapers?: boolean;
  } = {}
): Promise<ResearchResult> {
  const { numResults = 10, includeNews = true, includePapers = true } = options;

  // Main search with content
  const mainSearch = await searchAndContents(topic, {
    numResults,
    text: { maxCharacters: 2000 },
    highlights: { numSentences: 3, highlightsPerUrl: 2 },
  });

  let news: ExaResult[] | undefined;
  let papers: ExaResult[] | undefined;

  // News search
  if (includeNews) {
    try {
      const newsSearch = await search(topic, {
        category: 'news',
        numResults: 5,
      });
      news = newsSearch.results;
    } catch {
      // Silently ignore news search failures
    }
  }

  // Research papers
  if (includePapers) {
    try {
      const paperSearch = await search(topic, {
        category: 'research paper',
        numResults: 5,
      });
      papers = paperSearch.results;
    } catch {
      // Silently ignore paper search failures
    }
  }

  // Generate summary
  const summary = buildResearchSummary(
    topic,
    mainSearch.results,
    news,
    papers
  );

  return {
    results: mainSearch.results,
    news,
    papers,
    summary,
    cached: mainSearch.cached,
  };
}

/**
 * Find authoritative sources on a topic
 */
export async function findAuthoritativeSources(
  topic: string,
  options: { numResults?: number } = {}
): Promise<ExaResult[]> {
  const { numResults = 10 } = options;

  const result = await searchAndContents(topic, {
    numResults,
    includeDomains: [
      'wikipedia.org',
      'nature.com',
      'science.org',
      'arxiv.org',
      'nytimes.com',
      'bbc.com',
      'reuters.com',
      'stanford.edu',
      'mit.edu',
      'harvard.edu',
    ],
    text: { maxCharacters: 1500 },
    highlights: true,
  });

  return result.results;
}

/**
 * Build research summary string
 */
function buildResearchSummary(
  topic: string,
  results: ExaResult[],
  news?: ExaResult[],
  papers?: ExaResult[]
): string {
  const totalResults = results.length + (news?.length || 0) + (papers?.length || 0);
  const topResult = results[0];

  let summary = `Found ${totalResults} results for "${topic}". `;

  if (topResult) {
    summary += `Top: "${topResult.title}" (score: ${topResult.score.toFixed(2)}). `;
  }

  if (news?.length) {
    summary += `${news.length} news articles. `;
  }

  if (papers?.length) {
    summary += `${papers.length} research papers.`;
  }

  return summary;
}
