/**
 * Dynamic concurrency adjustment based on system resources
 */

import * as os from 'os'
import type { WorkerWithConcurrency } from './types.js'
import {
  CONCURRENCY_ADJUST_INTERVAL,
  CPU_THRESHOLD_HIGH,
  CPU_THRESHOLD_LOW,
  MEMORY_THRESHOLD,
} from './config.js'

/**
 * Monitor system resources and adjust concurrency dynamically
 */
export function setupDynamicConcurrency(worker: WorkerWithConcurrency): void {
  setInterval(() => {
    try {
      // Get CPU usage (average across all cores)
      const cpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times]
        }
        totalIdle += cpu.times.idle
      }

      const cpuUsage = 100 - (totalIdle / totalTick * 100)

      // Get memory usage
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const memUsage = ((totalMem - freeMem) / totalMem) * 100

      // Adjust concurrency based on load
      const currentConcurrency = worker.getConcurrency()

      if (memUsage > MEMORY_THRESHOLD) {
        // Memory pressure - reduce aggressively
        worker.adjustConcurrency(-2)
        console.log(`[Worker] High memory (${memUsage.toFixed(1)}%), reducing concurrency`)
      } else if (cpuUsage > CPU_THRESHOLD_HIGH) {
        // High CPU - reduce by 1
        worker.adjustConcurrency(-1)
        console.log(`[Worker] High CPU (${cpuUsage.toFixed(1)}%), reducing concurrency`)
      } else if (cpuUsage < CPU_THRESHOLD_LOW && memUsage < 70) {
        // Low load - can increase
        worker.adjustConcurrency(1)
        console.log(`[Worker] Low load (CPU: ${cpuUsage.toFixed(1)}%, Mem: ${memUsage.toFixed(1)}%), increasing concurrency`)
      }

    } catch (err) {
      console.error('[Worker] Dynamic concurrency check error:', err)
    }
  }, CONCURRENCY_ADJUST_INTERVAL)
}
