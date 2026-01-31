/**
 * Infrastructure metrics collector
 * Disk, RAM, swap, services, uptime
 */

import { exec } from '../exec.js';
import type { InfraData } from '../types.js';

export function collectInfra(): InfraData {
  return {
    diskUsagePercent: getDiskUsage(),
    ramUsagePercent: getRamUsage(),
    swapUsagePercent: getSwapUsage(),
    failedServices: getFailedServices(),
    uptimeHours: getUptimeHours(),
  };
}

function getDiskUsage(): number {
  const r = exec("df -h / | tail -1 | awk '{print $5}'");
  return parseInt(r.stdout.replace('%', ''), 10) || 0;
}

function getRamUsage(): number {
  const r = exec("free | grep Mem | awk '{print int($3/$2 * 100)}'");
  return parseInt(r.stdout, 10) || 0;
}

function getSwapUsage(): number {
  const r = exec(
    "free | grep Swap | awk '{if($2>0) print int($3/$2 * 100); else print 0}'",
  );
  return parseInt(r.stdout, 10) || 0;
}

function getFailedServices(): string[] {
  const r = exec(
    "systemctl --failed --no-legend 2>/dev/null | awk '{print $1}'",
  );
  return r.stdout ? r.stdout.split('\n').filter(Boolean) : [];
}

function getUptimeHours(): number {
  const r = exec("cat /proc/uptime | awk '{print $1}'");
  return Math.floor(parseFloat(r.stdout) / 3600) || 0;
}
