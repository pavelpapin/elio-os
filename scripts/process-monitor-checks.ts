/**
 * Process Monitor - System Check Functions
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu: number;
  runtime: string;
}

export interface SystemStatus {
  processes: ProcessInfo[];
  totalMemory: number;
  usedMemory: number;
  memoryPercent: number;
  loadAvg: number[];
  uptime: string;
  issues: string[];
}

export const MEMORY_THRESHOLD_MB = 500;
export const CPU_THRESHOLD_PERCENT = 80;

export function getTotalMemory(): number {
  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf-8');
    const match = meminfo.match(/MemTotal:\s+(\d+)/);
    return match ? Math.round(parseInt(match[1]) / 1024) : 8192;
  } catch {
    return 8192;
  }
}

export function getElioProcesses(): ProcessInfo[] {
  try {
    const output = execSync(
      `ps aux | grep -E "(tsx|node|claude)" | grep -v grep | awk '{print $2, $3, $4, $11, $10}'`,
      { encoding: 'utf-8' }
    );

    return output.trim().split('\n').filter(Boolean).map(line => {
      const [pid, cpu, mem, cmd, time] = line.split(/\s+/);
      const totalMem = getTotalMemory();
      return {
        pid: parseInt(pid),
        cpu: parseFloat(cpu) || 0,
        memory: Math.round((parseFloat(mem) / 100) * totalMem),
        name: cmd.split('/').pop() || cmd,
        runtime: time
      };
    });
  } catch {
    return [];
  }
}

export function getMemoryUsage(): { total: number; used: number; percent: number } {
  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf-8');
    const total = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)?.[1] || '0') / 1024;
    const available = parseInt(meminfo.match(/MemAvailable:\s+(\d+)/)?.[1] || '0') / 1024;
    const used = total - available;
    return { total: Math.round(total), used: Math.round(used), percent: Math.round((used / total) * 100) };
  } catch {
    return { total: 0, used: 0, percent: 0 };
  }
}

export function getLoadAverage(): number[] {
  try {
    const loadavg = readFileSync('/proc/loadavg', 'utf-8');
    return loadavg.split(' ').slice(0, 3).map(parseFloat);
  } catch {
    return [0, 0, 0];
  }
}

export function getUptime(): string {
  try {
    const uptime = parseFloat(readFileSync('/proc/uptime', 'utf-8').split(' ')[0]);
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  } catch {
    return 'unknown';
  }
}

export function checkRedis(): boolean {
  try {
    execSync('redis-cli ping', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
