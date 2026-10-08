import { HealthCheckEntry, HealthCheckStatus } from '../observability/models/health-check-entry.model';

export type OverallStatus = 'healthy' | 'degraded' | 'unavailable';

export interface HealthReport {
    /** Legacy Terminus fields: status ok (200) or error (503); info/error/details only know up and down. */
    readonly status: 'ok' | 'error';
    readonly info: Record<string, { status: 'up' | 'down' }>;
    readonly error: Record<string, { status: 'up' | 'down' }>;
    readonly details: Record<string, { status: 'up' | 'down' }>;
    readonly overallStatus: OverallStatus;
    readonly service: string;
    readonly version: string;
    readonly checkedAt: string;
    readonly checks: Record<string, HealthCheckEntry>;
}

/**
 * Builds the diagnostic health contract (an additive superset of the Terminus format):
 * - unavailable: a critical check is down, or the service is shutting down (HTTP 503)
 * - degraded: a non-critical check is warning or down (HTTP 200)
 * - healthy: everything up (HTTP 200)
 * In the legacy fields a warning appears as up, so older consumers do not show a warning as an outage.
 */
export function buildHealthReport(
    service: string,
    version: string,
    checks: Record<string, HealthCheckEntry>,
    shuttingDown = false,
): { httpStatus: 200 | 503; body: HealthReport } {
    const entries = Object.entries(checks);
    const unavailable = shuttingDown || entries.some(([, check]) => check.critical && check.status === 'down');
    const degraded = entries.some(([, check]) => check.status !== 'up');
    const overallStatus: OverallStatus = unavailable ? 'unavailable' : degraded ? 'degraded' : 'healthy';
    const legacy = (status: HealthCheckStatus) => ({ status: status === 'down' ? ('down' as const) : ('up' as const) });
    const details = Object.fromEntries(entries.map(([name, check]) => [name, legacy(check.status)]));

    return {
        httpStatus: unavailable ? 503 : 200,
        body: {
            status: unavailable ? 'error' : 'ok',
            info: Object.fromEntries(
                entries.filter(([, c]) => c.status !== 'down').map(([n, c]) => [n, legacy(c.status)]),
            ),
            error: Object.fromEntries(
                entries.filter(([, c]) => c.status === 'down').map(([n, c]) => [n, legacy(c.status)]),
            ),
            details,
            overallStatus,
            service,
            version,
            checkedAt: new Date().toISOString(),
            checks: shuttingDown
                ? {
                      ...checks,
                      shutdown: {
                          status: 'down',
                          critical: true,
                          message: 'The service is shutting down',
                          checkedAt: new Date().toISOString(),
                      },
                  }
                : checks,
        },
    };
}
