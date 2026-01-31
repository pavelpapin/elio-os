/**
 * GitHub Connector Types
 */

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license?: { name: string };
  owner: {
    login: string;
    avatar_url: string;
    type: 'User' | 'Organization';
  };
}

export interface CodeResult {
  name: string;
  path: string;
  sha: string;
  html_url: string;
  repository: {
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
  };
  text_matches?: Array<{
    fragment: string;
    matches: Array<{ text: string; indices: number[] }>;
  }>;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
  user: { login: string };
  labels: Array<{ name: string; color: string }>;
  repository_url: string;
}

export interface User {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  type: 'User' | 'Organization';
}

export interface SearchResponse<T> {
  items: T[];
  total_count: number;
  cached: boolean;
}

export interface ProjectResearch {
  repositories: Repository[];
  topProjects: Array<{
    name: string;
    url: string;
    stars: number;
    description: string | null;
    language: string | null;
  }>;
  languages: Record<string, number>;
  summary: string;
  cached: boolean;
}
