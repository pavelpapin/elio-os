/**
 * Bot Guardian Service
 * Ensures only one bot instance runs at a time
 * Handles conflicts, recovery, and health monitoring
 */

import * as fs from 'fs';

export { acquireLock, forceAcquireLock, handleConflict } from './lock-manager.js';
import { HEALTH_FILE } from './lock-manager.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastPoll: string;
  pollErrors: number;
  messagesProcessed: number;
  uptime: number;
}

let healthStatus: HealthStatus = {
  status: 'healthy',
  lastPoll: new Date().toISOString(),
  pollErrors: 0,
  messagesProcessed: 0,
  uptime: 0
};

const startTime = Date.now();

function writeHealthStatus(): void {
  try {
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(healthStatus, null, 2));
  } catch { /* ignore */ }
}

/**
 * Record successful poll
 */
export function recordPollSuccess(): void {
  healthStatus.lastPoll = new Date().toISOString();
  healthStatus.pollErrors = 0;
  healthStatus.status = 'healthy';
  healthStatus.uptime = Math.floor((Date.now() - startTime) / 1000);
  writeHealthStatus();
}

/**
 * Record poll error
 */
export function recordPollError(): void {
  healthStatus.pollErrors++;
  healthStatus.lastPoll = new Date().toISOString();
  healthStatus.uptime = Math.floor((Date.now() - startTime) / 1000);

  if (healthStatus.pollErrors >= 10) {
    healthStatus.status = 'unhealthy';
  } else if (healthStatus.pollErrors >= 3) {
    healthStatus.status = 'degraded';
  }

  writeHealthStatus();
}

/**
 * Record message processed
 */
export function recordMessageProcessed(): void {
  healthStatus.messagesProcessed++;
  healthStatus.uptime = Math.floor((Date.now() - startTime) / 1000);
  writeHealthStatus();
}

/**
 * Get current health status
 */
export function getHealthStatus(): HealthStatus {
  healthStatus.uptime = Math.floor((Date.now() - startTime) / 1000);
  return { ...healthStatus };
}

/**
 * Check if bot is healthy
 */
export function isHealthy(): boolean {
  return healthStatus.status === 'healthy' && healthStatus.pollErrors < 5;
}
