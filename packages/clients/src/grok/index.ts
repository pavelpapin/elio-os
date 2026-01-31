/**
 * Grok API Connector
 * xAI's Grok for real-time Twitter/X analysis and reasoning
 *
 * Features:
 * - Real-time X/Twitter data access
 * - Strong reasoning capabilities
 * - Web search integration
 *
 * https://x.ai/api
 */

// Types
export type { GrokMessage, GrokResponse, GrokSearchResponse, GrokModel } from './types.js';

// Client utilities
export { isAuthenticated, getCacheStats, clearCache } from './client.js';

// Chat
export { chat } from './chat.js';
export type { ChatOptions } from './chat.js';

// Research
export { research, analyzeTrends, getExpertOpinions } from './research.js';
