/**
 * Type declarations for packages that don't have their own types yet
 * or whose exports don't match adapter usage
 */

declare module '@elio/system-review' {
  export function runSystemReview(opts: Record<string, unknown>): Promise<unknown>;
  export function getInfraMetrics(): {
    diskUsagePercent: number;
    ramUsagePercent: number;
    swapUsagePercent: number;
    uptimeHours: number;
    failedServices: string[];
  };
  export function formatAsMarkdown(result: unknown): string;
}
