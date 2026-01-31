/**
 * Community Connector Types
 * Reddit and Hacker News types
 */

// ============ Reddit Types ============

export interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  upvote_ratio?: number;
  num_comments: number;
  created_utc: number;
  is_self: boolean;
  link_flair_text?: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  permalink: string;
  replies?: RedditComment[];
}

export interface RedditSearchResult {
  posts: RedditPost[];
  cached: boolean;
}

export interface RedditSearchOptions {
  subreddit?: string;
  sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}

export interface SubredditOptions {
  sort?: 'hot' | 'new' | 'top' | 'rising';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}

// ============ HN Types ============

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants: number;
  time: number;
  type: 'story' | 'job' | 'ask' | 'show';
  kids?: number[];
}

export interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  kids?: number[];
  parent: number;
}

export interface HNSearchResult {
  stories: HNStory[];
  cached: boolean;
}

export interface HNSearchOptions {
  tags?: 'story' | 'comment' | 'poll' | 'show_hn' | 'ask_hn';
  numericFilters?: string;
  limit?: number;
}

// ============ Combined Types ============

export interface CommunityResearch {
  reddit: {
    posts: RedditPost[];
    subreddits: string[];
  };
  hackernews: {
    stories: HNStory[];
  };
  summary: string;
  cached: boolean;
}

export interface ResearchOptions {
  redditLimit?: number;
  hnLimit?: number;
  subreddits?: string[];
}
