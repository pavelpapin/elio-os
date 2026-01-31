/**
 * Grok API Types
 */

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cached: boolean;
}

export interface GrokSearchResponse {
  answer: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  cached: boolean;
}

export type GrokModel = 'grok-3' | 'grok-3-mini' | 'grok-4-fast-reasoning';
