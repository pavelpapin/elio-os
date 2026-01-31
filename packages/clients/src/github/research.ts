/**
 * GitHub Research Functions
 */

import { Repository, ProjectResearch } from './types.js';
import { searchRepos } from './search.js';

/**
 * Research a topic on GitHub
 */
export async function researchTopic(
  topic: string,
  options: {
    language?: string;
    minStars?: number;
    limit?: number;
  } = {}
): Promise<ProjectResearch> {
  const { language, minStars = 100, limit = 20 } = options;

  const result = await searchRepos(topic, {
    language,
    minStars,
    sort: 'stars',
    limit
  });

  const languages: Record<string, number> = {};
  for (const repo of result.items) {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }

  const topProjects = result.items.slice(0, 5).map(repo => ({
    name: repo.full_name,
    url: repo.html_url,
    stars: repo.stargazers_count,
    description: repo.description,
    language: repo.language
  }));

  const totalStars = result.items.reduce((sum, r) => sum + r.stargazers_count, 0);
  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const summary = result.items.length > 0
    ? `Found ${result.total_count} repos for "${topic}". ` +
      `Top: ${topProjects[0]?.name} (${topProjects[0]?.stars.toLocaleString()} stars). ` +
      `Total stars: ${totalStars.toLocaleString()}. ` +
      `Top languages: ${topLanguages.join(', ')}.`
    : `No repositories found for "${topic}" with more than ${minStars} stars.`;

  return {
    repositories: result.items,
    topProjects,
    languages,
    summary,
    cached: result.cached
  };
}

/**
 * Find trending repos
 */
export async function getTrending(
  options: {
    language?: string;
    since?: 'daily' | 'weekly' | 'monthly';
    limit?: number;
  } = {}
): Promise<Repository[]> {
  const { language, since = 'weekly', limit = 10 } = options;

  const days = since === 'daily' ? 1 : since === 'weekly' ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateStr = date.toISOString().split('T')[0];

  const result = await searchRepos(`created:>${dateStr}`, {
    language,
    sort: 'stars',
    limit
  });

  return result.items;
}
