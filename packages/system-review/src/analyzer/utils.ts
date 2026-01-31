/**
 * System Review Analyzer - Utilities
 */

let issueCounter = 0;

export function generateId(): string {
  return `sys-${++issueCounter}`;
}

export function resetCounter(): void {
  issueCounter = 0;
}
