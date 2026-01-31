/**
 * Query Validation
 */

// Validate query to prevent injection
// Allow: Unicode letters, numbers, spaces, common punctuation, site: prefix
const SAFE_QUERY_REGEX = /^[\p{L}\p{N}\s.,!?'":()\-/@]+$/u;
const MAX_QUERY_LENGTH = 500;

export function validateQuery(query: string): void {
  if (!query || query.length > MAX_QUERY_LENGTH) {
    throw new Error('Invalid query length');
  }
  // Allow Unicode letters, numbers, common punctuation, site: syntax
  if (!SAFE_QUERY_REGEX.test(query)) {
    throw new Error('Query contains unsafe characters');
  }
}
