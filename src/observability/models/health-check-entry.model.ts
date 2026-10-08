/** up: fine. warning: works, but needs attention. down: does not work. */
export type HealthCheckStatus = 'up' | 'warning' | 'down';

/**
 * One check of the diagnostic health contract. Besides the fixed fields a check adds its measured values and
 * thresholds. Entries never contain hostnames, URLs, stack traces or secrets.
 */
export interface HealthCheckEntry {
    readonly status: HealthCheckStatus;
    /** A critical check that is down makes the service unavailable (HTTP 503). */
    readonly critical: boolean;
    readonly message?: string;
    readonly checkedAt: string;
    readonly [measurement: string]: unknown;
}
