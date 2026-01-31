/**
 * System Loop - Post-Execution Tasks
 * Backlog sync, report saving, and failure notifications
 */

import { execSync } from 'child_process'
import { log, sendTelegram } from './utils.js'
import type { SchedulableItem, RunResult } from './types.js'

export function runPostExecution(
  results: Array<{ item: SchedulableItem; result: RunResult }>,
  now: Date
): void {
  const hasTeamMembers = results.some(r => r.item.type === 'team-member')

  if (hasTeamMembers) {
    const today = now.toISOString().split('T')[0]

    // Sync backlog items to Notion
    log('Running backlog sync to Notion...')
    try {
      execSync('npx tsx /root/.claude/scripts/sync-backlog-to-notion/index.ts', {
        cwd: '/root/.claude',
        timeout: 120000,
        encoding: 'utf-8'
      })
      log('Backlog sync complete')
    } catch (err) {
      log(`Backlog sync failed: ${err}`, 'error')
    }

    // Save team reports to Notion
    log('Saving team reports to Notion...')
    for (const reportType of ['cto', 'cpo', 'ceo']) {
      try {
        execSync(`npx tsx /root/.claude/scripts/save-report-to-notion/index.ts ${reportType} ${today}`, {
          cwd: '/root/.claude',
          timeout: 60000,
          encoding: 'utf-8'
        })
        log(`${reportType.toUpperCase()} report saved to Notion`)
      } catch (err) {
        log(`Failed to save ${reportType} report: ${err}`, 'error')
      }
    }
  }

  // Only notify on failures
  const failures = results.filter(r => !r.result.success)
  if (failures.length > 0) {
    const failureSummary = failures.map(r => {
      const error = r.result.error ? `: ${r.result.error.substring(0, 100)}` : ''
      return `❌ ${r.item.name}${error}\n   (auto-fix attempted, could not resolve)`
    }).join('\n')

    sendTelegram(
      `⚠️ <b>System Loop Failures</b>\n\n${failureSummary}`
    )
  }
}
