/**
 * Jina Reader - Extract clean markdown from any URL
 * Free: 1M tokens/month, no API key needed
 */

import type { JinaReaderResult } from './types.js';

export async function jinaReader(url: string): Promise<JinaReaderResult> {
  try {
    // Basic URL validation
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain'
      }
    });

    if (!response.ok) {
      throw new Error(`Jina Reader error: ${response.status}`);
    }

    const content = await response.text();

    // Parse title from content (first line usually)
    const lines = content.split('\n');
    const titleLine = lines.find(l => l.startsWith('Title:'));
    const title = titleLine ? titleLine.replace('Title:', '').trim() : 'Unknown';

    return {
      title,
      url,
      content,
      success: true
    };
  } catch (error) {
    return {
      title: '',
      url,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
