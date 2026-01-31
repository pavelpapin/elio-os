/**
 * LinkedIn Content Parser (Jina reader format)
 */

import type { ScrapedProfile } from './types.js';

export function parseLinkedInContent(content: string, url: string): ScrapedProfile {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  const profile: ScrapedProfile = {
    name: 'Unknown',
    profileUrl: url,
    source: 'jina',
    raw: content.slice(0, 5000)
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
          profile.experience.push({
            title: parts[0].trim(),
            company: parts[1].trim()
          });
        }
      }
      i++;
      if (profile.experience.length >= 5) break;
    }
  }

  const locationMatch = content.match(/📍\s*([^\n]+)|Location[:\s]+([^\n]+)/i);
  if (locationMatch) {
    profile.location = (locationMatch[1] || locationMatch[2]).trim();
  }

  if (!profile.currentTitle && profile.experience?.[0]) {
    profile.currentTitle = profile.experience[0].title;
    profile.currentCompany = profile.experience[0].company;
  }

  return profile;
}
