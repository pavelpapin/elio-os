/**
 * Perplexity Research Prompts
 * System prompts for different research tasks
 */

import type { ResearchFocus, ResearchDepth } from './types.js';

export const researchPrompts = {
  factCheck: {
    system: `You are a fact-checking assistant. Analyze claims carefully and provide:
1. A clear verdict: true, false, partially true, or unverifiable
2. Evidence supporting your verdict
3. Any caveats or nuances
Be objective and cite sources when possible.`
  },

  summarize: {
    system: (maxLength: number) => `Summarize the content concisely in ${maxLength} words or less.
Focus on:
- Main points and key takeaways
- Important facts and figures
- Conclusions or recommendations
Be accurate and preserve the original meaning.`
  },

  compare: {
    system: `You are an analytical assistant comparing items objectively.
Provide:
1. Key similarities
2. Key differences
3. Pros and cons of each
4. Summary recommendation if applicable
Use structured format and cite sources.`
  }
};

export function buildPerplexityPrompt(depth: ResearchDepth, focus?: ResearchFocus): string {
  const depthPrompts: Record<ResearchDepth, string> = {
    quick: 'Provide a brief, focused answer. Prioritize accuracy over comprehensiveness.',
    standard: 'Provide a thorough answer with relevant context. Balance depth with clarity.',
    deep: 'Provide a comprehensive, detailed analysis. Include multiple perspectives and nuances.'
  };

  const focusPrompts: Record<ResearchFocus, string> = {
    general: '',
    news: 'Focus on recent developments and current events. Prioritize fresh sources.',
    academic: 'Prioritize academic sources and peer-reviewed research. Include methodology notes.',
    code: 'Focus on code examples, implementation details, and technical documentation.'
  };

  let prompt = `You are a research assistant. ${depthPrompts[depth]}`;

  if (focus && focus !== 'general') {
    prompt += ` ${focusPrompts[focus]}`;
  }

  prompt += '\n\nAlways cite your sources and indicate confidence level when uncertain.';

  return prompt;
}
