/**
 * Authentication utilities
 */

import { WHITELIST, WHITELIST_ENABLED } from '../config';

export function isAllowed(userId: number): boolean {
  if (!WHITELIST_ENABLED) return true;
  return WHITELIST.includes(userId);
}
