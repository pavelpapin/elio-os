/**
 * Twitter/X Type Definitions
 */

export interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  author_name?: string;
  author_username?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  url?: string;
  source?: 'api' | 'scrape';
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  verified?: boolean;
  source?: 'api' | 'scrape';
}

export interface SearchResult {
  tweets: Tweet[];
  cached: boolean;
  query: string;
  result_count: number;
  source: 'api' | 'scrape' | 'cache';
}

export interface Expert {
  user: TwitterUser;
  tweets: Tweet[];
}
