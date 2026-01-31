/**
 * Stage 2: Collection — run 5 parallel agents via Claude + MCP tools
 */

import { callLLM, loadPrompt } from '../llm.js';
import { AgentResultSchema, CollectionResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

const AGENT_PROMPTS: Record<string, string> = {
  web_scout: 'web_scout.md',
  market: 'market_analyst.md',
  tech: 'tech_analyst.md',
  legal: 'legal_analyst.md',
  people: 'people_analyst.md',
};

/** MCP tools available to collection agents */
const COLLECTION_TOOLS = [
  'mcp__elio__elio_perplexity_search',
  'mcp__elio__elio_perplexity_factcheck',
  'mcp__elio__elio_youtube_search',
  'mcp__elio__elio_youtube_transcript',
  'mcp__elio__elio_youtube_video_details',
  'mcp__elio__elio_web_search',
  'mcp__elio__elio_linkedin_profile',
  'mcp__elio__elio_linkedin_search',
  'WebSearch',
  'WebFetch',
];

export async function execute(state: PipelineState): Promise<unknown> {
  const plan = state.stage_outputs.planning!;
  const brief = state.stage_outputs.discovery!;
  const agents = plan.agents;

  const context = JSON.stringify({
    topic: brief.topic,
    goal: brief.goal,
    subtopics: plan.subtopics,
    geography: brief.geography,
    scope: brief.scope,
    known_players: brief.constraints?.known_players,
    audience: brief.constraints?.audience,
    existing_knowledge: brief.constraints?.existing_knowledge,
  });

  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const promptFile = AGENT_PROMPTS[agent] ?? 'web_scout.md';
      const prompt = loadPrompt(promptFile);
      const agentPrompt = `${prompt}

## CONTEXT
You are the **${agent}** agent in a multi-agent research pipeline.
The research goal: ${brief.goal}
Geography focus: ${brief.geography?.join(', ') || 'global'}

## MANDATORY: Available Tools (use in this priority order)
1. **elio_perplexity_search** — PRIMARY for all research queries. Always start here.
2. **elio_youtube_search** + **elio_youtube_transcript** — for expert talks, demos, interviews (top 3-5 videos).
3. **WebSearch** — for Reddit, HN, G2, job postings, specific site searches.
4. **WebFetch** — for reading specific URLs in full (pricing pages, blog posts, filings).
5. **elio_linkedin_profile/search** — for people research.

IMPORTANT: You MUST use elio_perplexity_search for every subtopic. Do NOT skip it.
IMPORTANT: For every key number, find at least 2 sources. If sources disagree, explain WHY.
IMPORTANT: For every fact, include "why_it_matters" — what this means for the research goal.`;

      const result = await callLLM({
        provider: 'claude',
        prompt: agentPrompt,
        input: context,
        outputSchema: AgentResultSchema,
        timeoutMs: 600_000,
        allowedTools: COLLECTION_TOOLS,
      });
      return result;
    }),
  );

  const successful = results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (successful.length === 0) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => `${agents[i]}: ${r.reason?.message || r.reason}`);
    throw new Error(`All agents failed: ${reasons.join('; ')}`);
  }

  return CollectionResultSchema.parse({ agents: successful });
}

/**
 * Targeted collection for iterative deepening.
 * Runs a single focused agent on specific gaps/questions.
 */
export async function executeTargetedCollection(
  state: PipelineState,
  gaps: string[],
): Promise<unknown> {
  const brief = state.stage_outputs.discovery!;

  const context = JSON.stringify({
    topic: brief.topic,
    goal: brief.goal,
    targeted_questions: gaps,
    previous_findings_summary: 'Focus ONLY on the targeted questions below. These are gaps identified in the first research pass.',
  });

  const prompt = loadPrompt('web_scout.md');
  const deepDivePrompt = `${prompt}

## DEEP DIVE MODE
This is a TARGETED second pass. The first research round identified these gaps:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Focus ALL your search effort on answering these specific questions.
Do NOT repeat general research — go deeper on these exact gaps.
Use WebFetch to read full articles/reports if needed.`;

  const result = await callLLM({
    provider: 'claude',
    prompt: deepDivePrompt,
    input: context,
    outputSchema: AgentResultSchema,
    timeoutMs: 600_000,
    allowedTools: COLLECTION_TOOLS,
  });

  return result;
}
