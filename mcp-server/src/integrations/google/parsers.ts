/**
 * Google Search HTML Parsers
 * Helper functions for parsing and extracting data from Google search results
 */

import type { GoogleSearchResult } from './types.js';

/**
 * Parse Google search results HTML
 */
export function parseGoogleHtml(html: string): GoogleSearchResult[] {
  const results: GoogleSearchResult[] = [];

  // Pattern for search result blocks
  // Google uses data-* attributes and nested divs

  // Find all result links with their context
  const linkPattern = /<a[^>]+href="\/url\?q=([^"&]+)[^"]*"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;
  const titlePattern = /<h3[^>]*>([^<]+)<\/h3>/gi;
  const snippetPattern = /<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+(?:<[^>]+>[^<]+)*)<\/div>/gi;

  // Alternative: look for result containers
  const containerPattern = /<div[^>]*class="[^"]*g[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;

  let match;
  let position = 0;

  // Try to find structured results
  while ((match = containerPattern.exec(html)) !== null && position < 30) {
    const container = match[1];

    // Extract URL
    const urlMatch = container.match(/href="([^"]+)"/);
    if (!urlMatch) continue;

    let url = urlMatch[1];
    if (url.startsWith('/url?q=')) {
      url = decodeURIComponent(url.replace('/url?q=', '').split('&')[0]);
    }

    // Skip Google's own pages
    if (url.includes('google.com') || url.includes('youtube.com/results')) continue;
    if (!url.startsWith('http')) continue;

    // Extract title
    const titleMatch = container.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const title = titleMatch ? cleanHtml(titleMatch[1]) : '';

    // Extract snippet
    const snippetMatch = container.match(/class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+)/i);
    const snippet = snippetMatch ? cleanHtml(snippetMatch[1]) : '';

    if (title && url) {
      position++;
      try {
        results.push({
          title,
          url,
          snippet,
          position,
          domain: new URL(url).hostname,
          type: 'organic'
        });
      } catch {
        // Invalid URL, skip
      }
    }
  }

  // Simpler fallback: just find all external links with context
  if (results.length < 5) {
    const simplePattern = /href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>([^<]+)/gi;
    while ((match = simplePattern.exec(html)) !== null && results.length < 30) {
      const url = match[1];
      const text = cleanHtml(match[2]);

      if (url.includes('google.com')) continue;
      if (text.length < 5) continue;
      if (results.some(r => r.url === url)) continue;

      try {
        results.push({
          title: text,
          url,
          snippet: '',
          position: results.length + 1,
          domain: new URL(url).hostname,
          type: 'organic'
        });
      } catch {
        // Invalid URL
      }
    }
  }

  return results;
}

export function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
