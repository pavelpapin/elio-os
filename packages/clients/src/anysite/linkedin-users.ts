/**
 * LinkedIn User Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { LinkedInProfile } from './types.js';

export interface SearchUsersOptions {
  keywords?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company_keywords?: string;
  school_keywords?: string;
  location?: string;
  count?: number;
  timeout?: number;
}

export async function searchUsers(
  options: SearchUsersOptions = {}
): Promise<LinkedInProfile[]> {
  const result = await callTool<{ profiles: LinkedInProfile[] }>('search_linkedin_users', {
    keywords: options.keywords,
    first_name: options.first_name,
    last_name: options.last_name,
    title: options.title,
    company_keywords: options.company_keywords,
    school_keywords: options.school_keywords,
    location: options.location,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.profiles || [];
}

export interface GetProfileOptions {
  with_experience?: boolean;
  with_education?: boolean;
  with_skills?: boolean;
  timeout?: number;
}

export async function getProfile(
  userIdOrUrl: string,
  options: GetProfileOptions = {}
): Promise<LinkedInProfile | null> {
  try {
    return await callTool<LinkedInProfile>('get_linkedin_profile', {
      user: userIdOrUrl,
      with_experience: options.with_experience ?? true,
      with_education: options.with_education ?? true,
      with_skills: options.with_skills ?? true,
      request_timeout: options.timeout || 300
    });
  } catch {
    return null;
  }
}

export async function findUserEmail(
  profileUrl: string,
  timeout?: number
): Promise<string | null> {
  try {
    const result = await callTool<{ email: string }>('find_linkedin_user_email', {
      profile: profileUrl,
      request_timeout: timeout || 300
    });
    return result.email || null;
  } catch {
    return null;
  }
}
