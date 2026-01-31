/**
 * LinkedIn Parser Functions
 */

import type { ScraperLinkedInProfile, ScraperLinkedInSearchResult } from './scraper-types.js';

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

export function parseGoogleResults(html: string): ScraperLinkedInSearchResult[] {
  const results: ScraperLinkedInSearchResult[] = [];
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

export function parseLinkedInHtml(html: string, url: string, source: 'scrapedo' | 'jina'): ScraperLinkedInProfile {
  const profile: ScraperLinkedInProfile = {
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
    } catch {}
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

export function parseLinkedInContent(content: string, url: string): ScraperLinkedInProfile {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const profile: ScraperLinkedInProfile = {
    name: 'Unknown', profileUrl: url, source: 'jina', raw: content.slice(0, 5000)
  };
  const titleIndex = lines.findIndex(l => l.startsWith('Title:'));
  if (titleIndex >= 0) {
    const titleLine = lines[titleIndex].replace('Title:', '').trim();
    const namePart = titleLine.split(' - ')[0]?.split(' | ')[0];
    if (namePart) profile.name = namePart.trim();
    const headlinePart = titleLine.split(' - ')[1]?.split(' | ')[0];
    if (headlinePart) profile.headline = headlinePart.trim();
  }
  const aboutIndex = lines.findIndex(l => l.toLowerCase().includes('about'));
  if (aboutIndex >= 0 && aboutIndex < lines.length - 1) {
    const aboutLines = [];
    for (let i = aboutIndex + 1; i < Math.min(aboutIndex + 5, lines.length); i++) {
      if (lines[i].length > 20 && !lines[i].includes('Experience')) {
        aboutLines.push(lines[i]);
      } else break;
    }
    if (aboutLines.length) profile.about = aboutLines.join(' ');
  }
  const expIndex = lines.findIndex(l => l.toLowerCase() === 'experience');
  if (expIndex >= 0) {
    profile.experience = [];
    let i = expIndex + 1;
    while (i < lines.length && !['Education', 'Skills', 'Licenses'].includes(lines[i])) {
      const line = lines[i];
      if (line.includes(' at ') || line.includes(' - ')) {
        const parts = line.split(/ at | - /);
        if (parts.length >= 2) {
          profile.experience.push({ title: parts[0].trim(), company: parts[1].trim() });
        }
      }
      i++;
      if (profile.experience.length >= 5) break;
    }
  }
  const locationMatch = content.match(/📍\s*([^\n]+)|Location[:\s]+([^\n]+)/i);
  if (locationMatch) profile.location = (locationMatch[1] || locationMatch[2]).trim();
  if (!profile.currentTitle && profile.experience?.[0]) {
    profile.currentTitle = profile.experience[0].title;
    profile.currentCompany = profile.experience[0].company;
  }
  return profile;
}
