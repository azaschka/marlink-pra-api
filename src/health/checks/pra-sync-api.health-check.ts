import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthCheckEntry, HealthCheckStatus } from '../../observability/models/health-check-entry.model';
import { HealthContributorRegistry } from '../../observability/services/health-contributor-registry.service';
import { CachedCheck } from './cached-check';

type RemoteCheck = { status?: unknown };
type InterpretedCheck = { readonly status: HealthCheckStatus; readonly [measurement: string]: unknown };
type RemoteReport = {
    overallStatus?: unknown;
    checks?: Record<string, RemoteCheck>;
    details?: Record<string, RemoteCheck>;
};

/**
 * The Sync API as a non-critical dependency of the PRA API: it can make the PRA API degraded, never unavailable.
 * Understands the new Sync contract (overallStatus, checks) and the old Terminus answer, including an old 503
 * that only reports memoryHeap or storage as down (shown as warning, not as outage). One request per 10 s at
 * most, 3 s timeout. The result never contains the URL or host of the Sync API.
 */
@Injectable()
export class PraSyncApiHealthCheck {
    public static readonly TIMEOUT_IN_MS = 3000;
    private static readonly CACHE_TTL_IN_MS = 10000;
    // Readiness-critical checks of the Sync API; everything else is a warning at most.
    private static readonly REMOTE_CRITICAL_CHECKS: ReadonlySet<string> = new Set(['database']);

    private readonly cached = new CachedCheck<HealthCheckEntry>(PraSyncApiHealthCheck.CACHE_TTL_IN_MS, () =>
        this.run(),
    );

    constructor(
        private readonly httpService: HttpService,
        private readonly appConfigService: AppConfigService,
        healthContributorRegistry: HealthContributorRegistry,
    ) {
        healthContributorRegistry.register('praSyncApi', () => this.check());
    }

    public check(): Promise<HealthCheckEntry> {
        return this.cached.get();
    }

    /** Maps an answer of the Sync API /health to the praSyncApi check. Exposed for tests. */
    public static interpret(httpStatus: number, body: unknown): InterpretedCheck {
        const report = PraSyncApiHealthCheck.unwrap(body);

        if (!report) {
            return {
                status: 'down',
                reachable: true,
                remoteHttpStatus: httpStatus,
                message: `Unexpected answer from the Sync API (HTTP ${httpStatus})`,
            };
        }

        if (typeof report.overallStatus === 'string') {
            const problems = Object.entries(report.checks ?? {})
                .filter(([, check]) => check?.status !== 'up')
                .map(([name]) => name);
            const status: HealthCheckStatus =
                report.overallStatus === 'healthy' ? 'up' : report.overallStatus === 'degraded' ? 'warning' : 'down';

            return PraSyncApiHealthCheck.result(status, httpStatus, report.overallStatus, problems);
        }

        // Older Sync API: Terminus details only know up and down.
        const down = Object.entries(report.details ?? {})
            .filter(([, check]) => check?.status === 'down')
            .map(([name]) => name);

        if (down.some((name) => PraSyncApiHealthCheck.REMOTE_CRITICAL_CHECKS.has(name))) {
            return PraSyncApiHealthCheck.result('down', httpStatus, 'unavailable', down);
        }

        return down.length === 0 && httpStatus < 500
            ? PraSyncApiHealthCheck.result('up', httpStatus, 'healthy', [])
            : PraSyncApiHealthCheck.result('warning', httpStatus, 'degraded', down);
    }

    private async run(): Promise<HealthCheckEntry> {
        const startedAt = Date.now();

        try {
            const response = await firstValueFrom(
                this.httpService.get<unknown>(this.appConfigService.health.pingCheckPraSyncApiUrl, {
                    timeout: PraSyncApiHealthCheck.TIMEOUT_IN_MS,
                    validateStatus: () => true,
                }),
            );

            return {
                ...PraSyncApiHealthCheck.interpret(response.status, response.data),
                critical: false,
                latencyMs: Date.now() - startedAt,
                checkedAt: new Date().toISOString(),
            };
        } catch (error) {
            const code = error instanceof AxiosError ? error.code : undefined;
            const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT';

            return {
                status: 'down',
                critical: false,
                reachable: false,
                message: timedOut
                    ? `No response within ${PraSyncApiHealthCheck.TIMEOUT_IN_MS} ms`
                    : `Sync API not reachable${code ? ` (${code})` : ''}`,
                checkedAt: new Date().toISOString(),
            };
        }
    }

    private static result(
        status: HealthCheckStatus,
        httpStatus: number,
        remoteOverallStatus: string,
        problems: string[],
    ): InterpretedCheck {
        return {
            status,
            reachable: true,
            remoteHttpStatus: httpStatus,
            remoteOverallStatus,
            ...(problems.length > 0 ? { remoteWarnings: problems } : {}),
            ...(status === 'warning' ? { message: `Sync API reachable; it reports: ${problems.join(', ')}` } : {}),
            ...(status === 'down' ? { message: `Sync API unavailable: ${problems.join(', ') || 'no details'}` } : {}),
        };
    }

    /** New contract, old Terminus body, or an old 503 that the exception filter wrapped into "message". */
    private static unwrap(body: unknown): RemoteReport | undefined {
        const isReport = (value: unknown): value is RemoteReport =>
            typeof value === 'object' && value !== null && ('overallStatus' in value || 'details' in value);

        if (isReport(body)) {
            return body;
        }

        const message = (body as { message?: unknown } | null | undefined)?.message;

        return isReport(message) ? message : undefined;
    }
}
