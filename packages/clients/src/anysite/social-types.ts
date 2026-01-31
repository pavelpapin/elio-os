/**
 * AnySite Types - Social Media (LinkedIn, Instagram, Twitter, Reddit)
 */

// LinkedIn
export interface LinkedInProfile {
  urn?: string;
  name?: string;
  headline?: string;
  location?: string;
  connections?: number;
  experience?: Array<{
    company: string;
    title: string;
    duration?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
  }>;
  skills?: string[];
}

export interface LinkedInCompany {
  urn?: string;
  name?: string;
  description?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  website?: string;
  followers?: number;
}

export interface LinkedInPost {
  urn: string;
  text?: string;
  author?: string;
  likes?: number;
  comments?: number;
  reposts?: number;
  timestamp?: string;
}

export interface LinkedInJob {
  id: string;
  title: string;
  company?: string;
  location?: string;
  type?: string;
  posted?: string;
  url?: string;
}

// Instagram
export interface InstagramPost {
  id: string;
  url?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  timestamp?: string;
  media_type?: 'image' | 'video' | 'carousel';
}

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  followers?: number;
  following?: number;
  posts_count?: number;
  is_verified?: boolean;
}

// Twitter/X
export interface TwitterPost {
  id: string;
  text: string;
  author?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  timestamp?: string;
  url?: string;
}

export interface TwitterUser {
  id?: string;
  username: string;
  name?: string;
  bio?: string;
  followers?: number;
  following?: number;
  tweets?: number;
  verified?: boolean;
}

// Reddit
export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  author?: string;
  score?: number;
  comments_count?: number;
  url?: string;
  selftext?: string;
  created?: string;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score?: number;
  created?: string;
  replies?: RedditComment[];
}
