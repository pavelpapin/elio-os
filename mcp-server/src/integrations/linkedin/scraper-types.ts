/**
 * LinkedIn Scraper Types and Constants
 */

export interface ScraperLinkedInProfile {
  name: string;
  headline?: string;
  location?: string;
  about?: string;
  currentCompany?: string;
  currentTitle?: string;
  profileUrl: string;
  photoUrl?: string;
  email?: string;
  connections?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    dates?: string;
  }>;
  skills?: string[];
  raw?: string;
  source: 'api' | 'scrapedo' | 'jina' | 'cache';
}

export interface ScraperLinkedInSearchResult {
  name: string;
  headline?: string;
  profileUrl: string;
  location?: string;
}

// Cache TTL constant
export const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days for profiles
