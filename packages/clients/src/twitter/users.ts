/**
 * Twitter/X User Functions
 */

import { duckduckgoSearch } from '../webscraping/index.js';
import { cache, apiRequest, getBearerToken, isApiExhausted } from './client.js';
import { searchTweets, parseTweetFromSearchResult } from './search.js';
import type { Tweet, TwitterUser, Expert } from './types.js';

/**
 * Get user profile
 */
export async function getUser(username: string): Promise<TwitterUser | null> {
  const cleanUsername = username.replace('@', '');
  const cacheKey = cache.key(cleanUsername, 'user');

  const cached = cache.get(cacheKey) as TwitterUser | null;
  if (cached) return cached;

  // Try API first
  if (!isApiExhausted() && getBearerToken()) {
    try {
      const params = new URLSearchParams({
        'user.fields': 'description,public_metrics,verified',
      });

      interface ApiResponse {
        data?: {
          id: string;
          name: string;
          username: string;
          description?: string;
          public_metrics?: TwitterUser['public_metrics'];
          verified?: boolean;
        };
      }

      const response = await apiRequest<ApiResponse>(
        `/users/by/username/${cleanUsername}`,
        params
      );

      if (response.data) {
        const user: TwitterUser = { ...response.data, source: 'api' };
        cache.set(cacheKey, user, 60 * 60 * 1000);
        return user;
      }
    } catch {
      // Fall through to scrape
    }
  }

  // DuckDuckGo fallback
  try {
    const results = await duckduckgoSearch(`site:x.com/${cleanUsername}`, 3);
    if (results.length === 0) return null;

    const nameMatch = results[0].title.match(/^([^(|@]+)/);
    const user: TwitterUser = {
      id: cleanUsername,
      name: nameMatch ? nameMatch[1].trim() : cleanUsername,
      username: cleanUsername,
      description: results[0].snippet,
      source: 'scrape',
    };
    cache.set(cacheKey, user, 60 * 60 * 1000);
    return user;
  } catch {
    return null;
  }
}

/**
 * Get recent tweets from a user
 */
export async function getUserTweets(
  userId: string,
  options: { max_results?: number } = {}
): Promise<Tweet[]> {
  const maxResults = Math.min(options.max_results || 10, 10);
  const username = userId;

  // Try API first
  if (!isApiExhausted() && getBearerToken()) {
    try {
      const params = new URLSearchParams({
        max_results: String(maxResults),
        'tweet.fields': 'created_at,public_metrics',
      });

      interface ApiResponse {
        data?: Array<{
          id: string;
          text: string;
          created_at?: string;
          public_metrics?: Tweet['public_metrics'];
        }>;
      }

      const response = await apiRequest<ApiResponse>(`/users/${userId}/tweets`, params);
      return (response.data || []).map((t) => ({
        id: t.id,
        text: t.text,
        created_at: t.created_at,
        public_metrics: t.public_metrics,
        author_id: userId,
        url: `https://x.com/${username}/status/${t.id}`,
        source: 'api' as const,
      }));
    } catch {
      // Fall through to scrape
    }
  }

  // DuckDuckGo fallback
  try {
    const results = await duckduckgoSearch(
      `site:x.com/${username} from:${username}`,
      maxResults * 2
    );
    const tweets: Tweet[] = [];
    for (const result of results) {
      const tweet = parseTweetFromSearchResult(result);
      if (tweet && tweet.author_username === username && tweets.length < maxResults) {
        tweets.push(tweet);
      }
    }
    return tweets;
  } catch {
    return [];
  }
}

/**
 * Find experts/thought leaders on a topic
 */
export async function findExperts(
  topic: string,
  options: { min_followers?: number; max_experts?: number } = {}
): Promise<Expert[]> {
  const minFollowers = options.min_followers || 5000;
  const maxExperts = options.max_experts || 5;

  const searchResult = await searchTweets(`${topic} -is:retweet lang:en`, {
    max_results: 10,
  });

  const usernames = [
    ...new Set(searchResult.tweets.map((t) => t.author_username).filter(Boolean)),
  ] as string[];

  const experts: Expert[] = [];

  for (const username of usernames.slice(0, maxExperts + 2)) {
    if (experts.length >= maxExperts) break;

    const user = await getUser(username);
    if (!user) continue;

    const followers = user.public_metrics?.followers_count || 0;
    if (followers >= minFollowers) {
      experts.push({
        user,
        tweets: searchResult.tweets.filter((t) => t.author_username === username),
      });
    }
  }

  return experts;
}
