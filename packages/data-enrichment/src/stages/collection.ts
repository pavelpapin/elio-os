/**
 * Stage 2: Collection — parallel batch enrichment via MCP tools
 */

import { callLLM, loadPrompt } from '../llm.js';
import { parseInput } from '../parsers/index.js';
import { CollectionResultSchema, BatchResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

const ENRICHMENT_TOOLS = [
  'mcp__elio__elio_perplexity_search',
  'mcp__elio__elio_linkedin_profile',
  'mcp__elio__elio_linkedin_search',
  'mcp__elio__elio_youtube_search',
  'mcp__elio__elio_web_search',
  'WebSearch',
  'WebFetch',
];

export async function execute(state: PipelineState): Promise<unknown> {
  const brief = state.stage_outputs.discovery!;
  const plan = state.stage_outputs.planning!;

  // Parse full input
  const parsed = await parseInput(brief.input_file);
  const records = parsed.records;
  const batchSize = plan.batch_size;

  // Split into batches
  const batches: Record<string, unknown>[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }

  // Determine enricher type based on fields
  const enricherType = detectEnricherType(brief.fields_to_enrich);
  const promptFile = `enricher_${enricherType}.md`;
  const prompt = loadPrompt(promptFile);

  let totalProcessed = 0;
  let totalErrors = 0;
  let totalApiCalls = 0;
  const batchResults = [];

  for (const batch of batches) {
    const context = JSON.stringify({
      records: batch,
      field_mappings: plan.field_mappings,
      output_schema: plan.output_schema,
      enrichment_goals: brief.enrichment_goals,
    });

    try {
      const result = await callLLM({
        provider: 'claude',
        prompt: `${prompt}\n\nEnrich each record using the available tools. For each record, search for information and fill in the target fields. Return JSON matching BatchResultSchema.`,
        input: context,
        outputSchema: BatchResultSchema,
        timeoutMs: 600_000,
        allowedTools: ENRICHMENT_TOOLS,
      });

      const batchResult = result as { records: unknown[]; errors: unknown[]; api_calls_made: number };
      totalProcessed += batchResult.records.length;
      totalErrors += batchResult.errors.length;
      totalApiCalls += batchResult.api_calls_made;
      batchResults.push(result);
    } catch (err) {
      totalErrors += batch.length;
      batchResults.push({
        records: [],
        errors: batch.map((_, i) => ({ record_index: i, error: String(err) })),
        api_calls_made: 0,
      });
    }
  }

  return CollectionResultSchema.parse({
    batches: batchResults,
    total_processed: totalProcessed,
    total_errors: totalErrors,
    total_api_calls: totalApiCalls,
  });
}

function detectEnricherType(fields: string[]): string {
  const joined = fields.join(' ').toLowerCase();
  if (joined.includes('company') || joined.includes('revenue') || joined.includes('employee') || joined.includes('industry')) {
    return 'company';
  }
  if (joined.includes('person') || joined.includes('name') || joined.includes('title') || joined.includes('linkedin')) {
    return 'person';
  }
  return 'generic';
}
