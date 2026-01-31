/**
 * Community Research Functions
 * Combined Reddit + HN research
 */

import { searchReddit } from './reddit.js';
import { searchHN } from './hackernews.js';
import type { CommunityResearch, ResearchOptions } from './types.js';

/**
 * Research a topic across Reddit and HN
 */
export async function researchTopic(
  topic: string,
  options: ResearchOptions = {}
): Promise<CommunityResearch> {
  const { redditLimit = 10, hnLimit = 10, subreddits } = options;

  // Parallel fetches
  const [redditResult, hnResult] = await Promise.all([
    searchReddit(topic, { limit: redditLimit, sort: 'top', time: 'year' }),
    searchHN(topic, { limit: hnLimit }),
  ]);

  // Find unique subreddits
  const foundSubreddits = [
    ...new Set(redditResult.posts.map((p) => p.subreddit)),
  ];

  // Generate summary
  const summary = buildSummary(
    topic,
    redditResult.posts.length,
    hnResult.stories.length,
    redditResult.posts[0],
    hnResult.stories[0]
  );

  return {
    reddit: {
      posts: redditResult.posts,
      subreddits: subreddits || foundSubreddits,
    },
    hackernews: {
      stories: hnResult.stories,
    },
    summary,
    cached: redditResult.cached && hnResult.cached,
  };
}

/**
 * Build research summary
 */
function buildSummary(
  topic: string,
  redditCount: number,
  hnCount: number,
  topReddit?: { title: string; score: number; subreddit: string },
  topHN?: { title: string; score: number; descendants: number }
): string {
  const totalPosts = redditCount + hnCount;
  let summary = `Found ${totalPosts} discussions on "${topic}". `;

  if (topReddit) {
    summary += `Top Reddit: "${topReddit.title}" `;
    summary += `(${topReddit.score} points, r/${topReddit.subreddit}). `;
  }

  if (topHN) {
    summary += `Top HN: "${topHN.title}" `;
    summary += `(${topHN.score} points, ${topHN.descendants} comments).`;
  }

  return summary;
}
