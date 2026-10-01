import { Injectable } from '@nestjs/common';
import { HealthCheckEntry } from '../models/health-check-entry.model';

export type HealthContributor = () => HealthCheckEntry | Promise<HealthCheckEntry>;

/**
 * Lets feature modules add a non-critical check to the diagnostic /health without a dependency of the health
 * module on them. Contributors must be cheap: answer from memory, or bound and cache their own I/O. A failing
 * contributor is reported as warning.
 */
@Injectable()
export class HealthContributorRegistry {
    private readonly contributors = new Map<string, HealthContributor>();

    public register(name: string, contributor: HealthContributor): void {
        this.contributors.set(name, contributor);
    }

    public async collect(): Promise<Record<string, HealthCheckEntry>> {
        const names = [...this.contributors.keys()];
        const results = await Promise.allSettled(
            [...this.contributors.values()].map(async (contributor) => contributor()),
        );
        const entries: Record<string, HealthCheckEntry> = {};

        for (const [index, result] of results.entries()) {
            const name = names[index] as string;
            entries[name] =
                result.status === 'fulfilled'
                    ? result.value
                    : {
                          status: 'warning',
                          critical: false,
                          message: `check failed: ${
                              result.reason instanceof Error ? result.reason.message : String(result.reason)
                          }`,
                          checkedAt: new Date().toISOString(),
                      };
        }

        return entries;
    }
}
