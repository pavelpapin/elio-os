/**
 * Deep Research Adapter
 * Exposes deep research capabilities as MCP tools
 */

import { Adapter } from '../../gateway/types.js';
import { tools } from './tools.js';

export const deepResearchAdapter: Adapter = {
  name: 'deep-research',
  isAuthenticated: () => true,
  tools,
};

export default deepResearchAdapter;
