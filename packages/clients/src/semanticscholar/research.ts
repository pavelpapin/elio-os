/**
 * Semantic Scholar Research Functions
 */

import { searchPapers } from './papers.js';
import type { Paper, ResearchResult } from './types.js';

/**
 * Research a topic - find highly cited papers
 */
export async function researchTopic(
  topic: string,
  options: {
    years?: string;
    minCitations?: number;
    limit?: number;
  } = {}
): Promise<ResearchResult> {
  const { years, minCitations = 10, limit = 20 } = options;

  // Search for papers
  const searchResult = await searchPapers(topic, {
    limit,
    year: years,
  });

  // Filter by citations and sort
  const papers = searchResult.papers
    .filter((p) => p.citationCount >= minCitations)
    .sort((a, b) => b.citationCount - a.citationCount);

  // Count author appearances
  const topAuthors = countTopAuthors(papers);

  // Generate summary
  const summary = buildSummary(topic, papers, topAuthors, minCitations);

  return { papers, topAuthors, summary };
}

/**
 * Count top authors from papers
 */
function countTopAuthors(
  papers: Paper[]
): Array<{ name: string; paperCount: number }> {
  const authorCounts = new Map<string, number>();

  for (const paper of papers) {
    for (const author of paper.authors) {
      authorCounts.set(author.name, (authorCounts.get(author.name) || 0) + 1);
    }
  }

  return [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, paperCount]) => ({ name, paperCount }));
}

/**
 * Build research summary
 */
function buildSummary(
  topic: string,
  papers: Paper[],
  topAuthors: Array<{ name: string; paperCount: number }>,
  minCitations: number
): string {
  if (papers.length === 0) {
    return `No papers found for "${topic}" with more than ${minCitations} citations.`;
  }

  const top = papers[0];
  return (
    `Found ${papers.length} papers on "${topic}". ` +
    `Top paper: "${top.title}" (${top.citationCount} citations, ${top.year}). ` +
    `Key authors: ${topAuthors.map((a) => a.name).join(', ')}.`
  );
}
