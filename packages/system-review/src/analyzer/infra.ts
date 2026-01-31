/**
 * System Review Analyzer - Infrastructure Metrics
 */

import { execSync } from 'child_process';
import type { InfraMetrics, SystemIssue } from '../types.js';
import { generateId } from './utils.js';

/**
 * Get infrastructure metrics
 */
export function getInfraMetrics(): InfraMetrics {
  const metrics: InfraMetrics = {
    diskUsagePercent: 0,
    ramUsagePercent: 0,
    swapUsagePercent: 0,
    failedServices: [],
    uptimeHours: 0,
  };

  try {
    // Disk usage
    const dfOutput = execSync("df -h / | tail -1 | awk '{print $5}'", {
      encoding: 'utf-8',
    }).trim();
    metrics.diskUsagePercent = parseInt(dfOutput.replace('%', ''), 10) || 0;

    // RAM usage
    const memOutput = execSync(
      "free | grep Mem | awk '{print int($3/$2 * 100)}'",
      { encoding: 'utf-8' }
    ).trim();
    metrics.ramUsagePercent = parseInt(memOutput, 10) || 0;

    // Swap usage
    const swapOutput = execSync(
      "free | grep Swap | awk '{if($2>0) print int($3/$2 * 100); else print 0}'",
      { encoding: 'utf-8' }
    ).trim();
    metrics.swapUsagePercent = parseInt(swapOutput, 10) || 0;

    // Failed services
    try {
      const failedOutput = execSync(
        'systemctl --failed --no-legend 2>/dev/null | awk \'{print $1}\'',
        { encoding: 'utf-8' }
      ).trim();
      if (failedOutput) {
        metrics.failedServices = failedOutput.split('\n').filter(Boolean);
      }
    } catch {
      // systemctl may not be available
    }

    // Uptime
    const uptimeOutput = execSync("cat /proc/uptime | awk '{print $1}'", {
      encoding: 'utf-8',
    }).trim();
    metrics.uptimeHours = Math.floor(parseFloat(uptimeOutput) / 3600);
  } catch {
    // Use defaults if commands fail
  }

  return metrics;
}

/**
 * Analyze infrastructure for issues
 */
export function analyzeInfra(metrics: InfraMetrics): SystemIssue[] {
  const issues: SystemIssue[] = [];

  if (metrics.diskUsagePercent >= 90) {
    issues.push({
      id: generateId(),
      category: 'infra',
      severity: 'critical',
      title: 'disk-critical',
      description: `Disk usage at ${metrics.diskUsagePercent}%`,
      suggestion: 'Free up disk space immediately',
      autoFixable: false,
    });
  } else if (metrics.diskUsagePercent >= 80) {
    issues.push({
      id: generateId(),
      category: 'infra',
      severity: 'high',
      title: 'disk-warning',
      description: `Disk usage at ${metrics.diskUsagePercent}%`,
      suggestion: 'Consider cleaning up disk space',
      autoFixable: false,
    });
  }

  if (metrics.ramUsagePercent >= 90) {
    issues.push({
      id: generateId(),
      category: 'infra',
      severity: 'high',
      title: 'ram-high',
      description: `RAM usage at ${metrics.ramUsagePercent}%`,
      suggestion: 'Check for memory leaks or reduce workload',
      autoFixable: false,
    });
  }

  if (metrics.swapUsagePercent > 0) {
    issues.push({
      id: generateId(),
      category: 'infra',
      severity: 'medium',
      title: 'swap-in-use',
      description: `Swap usage at ${metrics.swapUsagePercent}%`,
      suggestion: 'Consider adding more RAM',
      autoFixable: false,
    });
  }

  for (const service of metrics.failedServices) {
    issues.push({
      id: generateId(),
      category: 'infra',
      severity: 'high',
      title: 'service-failed',
      description: `Service ${service} has failed`,
      suggestion: `Check logs: journalctl -u ${service}`,
      autoFixable: false,
    });
  }

  return issues;
}
