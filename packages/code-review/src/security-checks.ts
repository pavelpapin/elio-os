/**
 * Security Check Patterns
 */

import type { SecurityCheck } from './types.js';

export const SECURITY_CHECKS: SecurityCheck[] = [
  // SQL Injection
  {
    name: 'sql-injection',
    pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi,
    severity: 'critical',
    description: 'Potential SQL injection via template literal',
    suggestion: 'Use parameterized queries instead of string interpolation',
  },
  {
    name: 'sql-concat',
    pattern: /["'].*(?:SELECT|INSERT|UPDATE|DELETE).*["']\s*\+/gi,
    severity: 'critical',
    description: 'SQL query string concatenation detected',
    suggestion: 'Use parameterized queries or an ORM',
  },

  // Hardcoded Secrets
  {
    name: 'hardcoded-password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/gi,
    severity: 'critical',
    description: 'Hardcoded password detected',
    suggestion: 'Move secrets to environment variables',
  },
  {
    name: 'hardcoded-api-key',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/gi,
    severity: 'critical',
    description: 'Hardcoded API key detected',
    suggestion: 'Move secrets to environment variables',
  },
  {
    name: 'hardcoded-token',
    pattern: /(?:token|bearer|auth)\s*[:=]\s*["'][A-Za-z0-9_\-\.]{20,}["']/gi,
    severity: 'critical',
    description: 'Hardcoded token detected',
    suggestion: 'Move secrets to environment variables',
  },
  {
    name: 'private-key',
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    severity: 'critical',
    description: 'Private key found in code',
    suggestion: 'Store private keys in secure vault or environment',
  },

  // Command Injection
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/g,
    severity: 'critical',
    description: 'eval() usage detected - potential code injection',
    suggestion: 'Avoid eval(), use safer alternatives',
  },
  {
    name: 'exec-interpolation',
    pattern: /exec(?:Sync)?\s*\(\s*`[^`]*\$\{/g,
    severity: 'critical',
    description: 'Command execution with interpolation - potential injection',
    suggestion: 'Use spawn() with array arguments instead',
  },
  {
    name: 'shell-true',
    pattern: /spawn\s*\([^)]*shell\s*:\s*true/g,
    severity: 'high',
    description: 'spawn with shell:true is vulnerable to injection',
    suggestion: 'Avoid shell:true, use spawn with array args',
  },

  // XSS
  {
    name: 'innerhtml-usage',
    pattern: /\.innerHTML\s*=/g,
    severity: 'high',
    description: 'Direct innerHTML assignment - potential XSS',
    suggestion: 'Use textContent or sanitize HTML input',
  },
  {
    name: 'dangerously-set',
    pattern: /dangerouslySetInnerHTML/g,
    severity: 'medium',
    description: 'dangerouslySetInnerHTML usage - ensure input is sanitized',
    suggestion: 'Sanitize HTML before using dangerouslySetInnerHTML',
  },

  // Path Traversal
  {
    name: 'path-traversal',
    pattern: /(?:readFile|writeFile|createReadStream|require)\s*\([^)]*\+[^)]*\)/g,
    severity: 'high',
    description: 'Dynamic file path - potential path traversal',
    suggestion: 'Validate and sanitize file paths',
  },

  // Insecure Crypto
  {
    name: 'md5-usage',
    pattern: /createHash\s*\(\s*['"]md5['"]/g,
    severity: 'medium',
    description: 'MD5 is cryptographically weak',
    suggestion: 'Use SHA-256 or stronger hash algorithm',
  },
  {
    name: 'sha1-usage',
    pattern: /createHash\s*\(\s*['"]sha1['"]/g,
    severity: 'medium',
    description: 'SHA1 is deprecated for security purposes',
    suggestion: 'Use SHA-256 or stronger hash algorithm',
  },

  // Insecure Defaults
  {
    name: 'cors-star',
    pattern: /(?:cors|Access-Control-Allow-Origin)\s*[:(]\s*['"]\*['"]/g,
    severity: 'medium',
    description: 'CORS allows all origins',
    suggestion: 'Restrict CORS to specific trusted origins',
  },
  {
    name: 'disable-ssl',
    pattern: /rejectUnauthorized\s*:\s*false/g,
    severity: 'high',
    description: 'SSL certificate verification disabled',
    suggestion: 'Enable SSL certificate verification',
  },
];
