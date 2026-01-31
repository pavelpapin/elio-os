/**
 * Grok Research Functions
 */

import type { GrokSearchResponse } from './types.js';
import { getCacheKey, getFromCache, setCache } from './client.js';
import { chat } from './chat.js';

/**
 * Research a topic using Grok's real-time capabilities
 */
export async function research(
  topic: string,
  options: {
    focus?: 'twitter' | 'news' | 'general';
    depth?: 'quick' | 'detailed';
  } = {}
): Promise<GrokSearchResponse> {
  const { focus = 'general', depth = 'detailed' } = options;

  const cacheKey = getCacheKey(`${topic}:${focus}:${depth}`, 'research');
  const cached = getFromCache<GrokSearchResponse>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const systemPrompt = focus === 'twitter'
    ? 'You are a research assistant with real-time access to X/Twitter. Analyze current discussions, trends, and expert opinions on the topic. Include specific tweets, usernames, and engagement metrics when relevant.'
    : focus === 'news'
    ? 'You are a research assistant with access to real-time news. Provide the latest developments, breaking news, and recent analysis on the topic.'
    : 'You are a comprehensive research assistant. Provide thorough analysis using all available real-time data including social media, news, and web sources.';

  const userPrompt = depth === 'quick'
    ? `Briefly summarize the current state of: ${topic}`
    : `Provide a detailed research report on: ${topic}\n\nInclude:\n1. Current state and recent developments\n2. Key players and their positions\n3. Trending discussions and opinions\n4. Data points and statistics if available\n5. Sources and references`;

  const response = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    model: 'grok-3',
    temperature: 0.3,
    max_tokens: depth === 'quick' ? 1024 : 4096
  });

  const result: GrokSearchResponse = {
    answer: response.content,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Analyze Twitter/X trends on a topic
 */
export async function analyzeTrends(
  topic: string,
  options: { timeframe?: '24h' | '7d' | '30d' } = {}
): Promise<GrokSearchResponse> {
  const { timeframe = '7d' } = options;

  const cacheKey = getCacheKey(`${topic}:${timeframe}`, 'trends');
  const cached = getFromCache<GrokSearchResponse>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const response = await chat([
    {
      role: 'system',
      content: 'You are a Twitter/X trend analyst with real-time data access. Analyze trending topics, viral posts, and emerging discussions.'
    },
    {
      role: 'user',
      content: `Analyze X/Twitter trends for "${topic}" over the past ${timeframe}.\n\nProvide:\n1. Trending hashtags and keywords\n2. Most influential voices on this topic\n3. Viral posts and their engagement\n4. Sentiment analysis\n5. Emerging subtopics`
    }
  ], {
    model: 'grok-3',
    temperature: 0.3,
    max_tokens: 2048
  });

  const result: GrokSearchResponse = {
    answer: response.content,
    cached: false
  };

  setCache(cacheKey, result, 30 * 60 * 1000); // 30 min cache for trends
  return result;
}

/**
 * Get expert opinions from X/Twitter
 */
export async function getExpertOpinions(
  topic: string,
  options: { count?: number } = {}
): Promise<GrokSearchResponse> {
  const { count = 5 } = options;

  const cacheKey = getCacheKey(`${topic}:experts:${count}`, 'experts');
  const cached = getFromCache<GrokSearchResponse>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const response = await chat([
    {
      role: 'system',
      content: 'You are a research assistant identifying expert voices on X/Twitter. Find verified experts, thought leaders, and influential accounts discussing the topic.'
    },
    {
      role: 'user',
      content: `Find ${count} expert opinions on "${topic}" from X/Twitter.\n\nFor each expert provide:\n1. Username and name\n2. Their credentials/why they're an expert\n3. Their main position/opinion\n4. Recent relevant tweets\n5. Engagement metrics`
    }
  ], {
    model: 'grok-3',
    temperature: 0.3,
    max_tokens: 2048
  });

  const result: GrokSearchResponse = {
    answer: response.content,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
