/**
 * LinkedIn HTML/Content Parsers
 */

import type { ScrapedProfile, ScraperSearchResult } from './types.js';
import { parseLinkedInContent } from './content-parser.js';

export { parseLinkedInContent };

/**
 * Normalize LinkedIn URL to standard format
 */
export function normalizeLinkedInUrl(url: string): string | null {
  if (url.startsWith('https://linkedin.com')) {
    url = url.replace('https://linkedin.com', 'https://www.linkedin.com');
  }
  if (url.startsWith('linkedin.com')) url = 'https://www.' + url;
  if (url.startsWith('www.linkedin.com')) url = 'https://' + url;
  if (!url.includes('linkedin.com') && !url.includes('/')) {
    url = `https://www.linkedin.com/in/${url}/`;
  }

  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/);
  if (match) return `https://www.linkedin.com/in/${match[1].toLowerCase()}/`;
  return null;
}

/**
 * Extract location from text snippet
 */
export function extractLocation(text: string): string | undefined {
  const patterns = [
    /(?:located?\s+in|based\s+in|from)\s+([^.]+)/i,
    /([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

/**
 * Parse Google search results for LinkedIn profiles
 */
export function parseGoogleResults(html: string): ScraperSearchResult[] {
  const results: ScraperSearchResult[] = [];
  const urlPattern = /https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-]+)/g;
  const matches = html.matchAll(urlPattern);
  const seen = new Set<string>();

  for (const match of matches) {
    const url = match[0];
    const username = match[1];
    if (seen.has(username)) continue;
    seen.add(username);

    const titleMatch = html.match(new RegExp(`([^<>]{10,100})\\s*[-–]\\s*[^<>]*${username}`, 'i'));
    const name = titleMatch ? titleMatch[1].trim() : username;
    results.push({ name, profileUrl: url, headline: undefined });
    if (results.length >= 10) break;
  }

  return results;
}

/**
 * Parse LinkedIn HTML page (from Scrape.do)
 */
export function parseLinkedInHtml(
  html: string,
  url: string,
  source: 'scrapedo' | 'jina'
): ScrapedProfile {
  const profile: ScrapedProfile = {
    name: 'Unknown', profileUrl: url, source, raw: html.slice(0, 10000)
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const parts = titleMatch[1].split(/\s*[-–|]\s*/);
    if (parts[0]) profile.name = parts[0].trim();
    if (parts[1]) profile.headline = parts[1].trim();
  }

  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.name) profile.name = data.name;
      if (data.jobTitle) profile.headline = data.jobTitle;
      if (data.address?.addressLocality) {
        profile.location = data.address.addressLocality;
        if (data.address.addressCountry) profile.location += ', ' + data.address.addressCountry;
      }
      if (data.worksFor?.name) profile.currentCompany = data.worksFor.name;
    } catch { /* JSON parse failed */ }
  }

  const locationMatch = html.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)/i);
  if (locationMatch && !profile.location) profile.location = locationMatch[1].trim();

  const aboutMatch = html.match(/class="[^"]*summary[^"]*"[^>]*>([^<]+)/i) ||
                     html.match(/About\s*<\/[^>]+>\s*<[^>]+>([^<]{50,500})/i);
  if (aboutMatch) profile.about = aboutMatch[1].trim().slice(0, 500);

  profile.experience = [];
  const expPattern = /class="[^"]*experience[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)/gi;
  let expMatch;
  while ((expMatch = expPattern.exec(html)) !== null && profile.experience.length < 5) {
    profile.experience.push({ title: expMatch[1].trim(), company: expMatch[2].trim() });
  }

  if (!profile.currentTitle && profile.experience[0]) {
    profile.currentTitle = profile.experience[0].title;
    profile.currentCompany = profile.experience[0].company;
  }

  return profile;
}
