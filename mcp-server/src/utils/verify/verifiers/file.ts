/**
 * File Verifier
 * Validates local files exist and meet criteria
 */

import { existsSync, statSync, readFileSync } from 'fs';
import type { VerifyConfig, VerifyResult } from '../types.js';

/**
 * Verify file exists and meets criteria
 */
export async function verifyFile(config: VerifyConfig): Promise<VerifyResult> {
  const path = config.filePath;

  if (!path) {
    return { ok: false, error: 'filePath required' };
  }

  try {
    if (!existsSync(path)) {
      return { ok: false, error: `File not found: ${path}` };
    }

    const stats = statSync(path);

    if (config.minSize && stats.size < config.minSize) {
      return {
        ok: false,
        error: `File too small: ${stats.size} bytes, expected at least ${config.minSize}`,
        details: { actualSize: stats.size }
      };
    }

    if (config.containsText && config.containsText.length > 0) {
      const content = readFileSync(path, 'utf-8');
      const missing: string[] = [];

      for (const text of config.containsText) {
        if (!content.includes(text)) {
          missing.push(text);
        }
      }

      if (missing.length > 0) {
        return {
          ok: false,
          error: `Missing required content: ${missing.join(', ')}`,
          details: { missing }
        };
      }
    }

    return {
      ok: true,
      path,
      details: { size: stats.size }
    };
  } catch (error) {
    return { ok: false, error: `File verification failed: ${error}` };
  }
}
