/**
 * Analyzer Utils
 */

let issueCounter = 0;

export function generateId(): string {
  return `issue-${++issueCounter}`;
}

export function resetCounter(): void {
  issueCounter = 0;
}
