/**
 * LinkedIn Integration Types
 */

// Re-export from shared credentials
export type { LinkedInCredentials } from '../utils/credentials.js';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  profileUrl: string;
  imageUrl?: string;
  summary?: string;
  currentCompany?: string;
  currentTitle?: string;
  connections?: number;
}

export interface LinkedInSearchResult {
  profiles: LinkedInProfile[];
  total: number;
}

export interface LinkedInCompany {
  id: string;
  name: string;
  industry: string;
  location: string;
  linkedinUrl: string;
  employeeCount?: string;
}

// API Response types
export interface ProxycurlProfileResponse {
  public_identifier?: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  city?: string;
  country?: string;
  profile_pic_url?: string;
  summary?: string;
  experiences?: Array<{
    company?: string;
    title?: string;
    starts_at?: { year: number };
    ends_at?: { year: number } | null;
  }>;
  connections?: number;
}

export interface ProxycurlSearchResponse {
  results?: Array<{
    linkedin_profile_url: string;
    profile: {
      public_identifier: string;
      first_name: string;
      last_name: string;
      headline: string;
      city: string;
      country: string;
    };
  }>;
  total_result_count?: number;
}

export interface ProxycurlCompanySearchResponse {
  results?: Array<{
    linkedin_profile_url: string;
    profile: {
      universal_name_id: string;
      name: string;
      industry: string;
      city: string;
      country: string;
      company_size_on_linkedin: number;
    };
  }>;
}

export interface ProxycurlEmployeesResponse {
  employees?: Array<{
    profile_url: string;
    profile: {
      public_identifier: string;
      first_name: string;
      last_name: string;
      headline: string;
      city: string;
      country: string;
    };
  }>;
}

// Scraper-specific types
export interface ScrapedProfile {
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
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[];
  raw?: string;
  source: 'api' | 'scrapedo' | 'jina' | 'cache';
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string;
  dates?: string;
}

export interface ScraperSearchResult {
  name: string;
  headline?: string;
  profileUrl: string;
  location?: string;
}

export interface FindPersonContext {
  company?: string;
  title?: string;
  location?: string;
}
