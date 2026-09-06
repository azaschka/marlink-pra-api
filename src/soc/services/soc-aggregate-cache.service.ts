import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../app-config/services/app-config.service';

interface SocCacheEntry {
    value: unknown;
    expiresAt: number;
}

/**
 * Caches the fully aggregated SOC result sets per tenant.
 *
 * Two reasons this exists, in order of importance:
 *
 * 1. **Pagination consistency.** A SOC pull walks many pages. Without a cache each page
 *    would be served from a fresh snapshot, so items could shift across page boundaries
 *    and the consumer would silently miss or duplicate records.
 * 2. **Cost.** A correct `totalCount` over the union of all jump item types requires
 *    materialising the whole platform, which is far too expensive to repeat per page.
 *
 * What is cached is the *unfiltered, attributed* result set. Scope and query filters are
 * applied per request afterwards, so a cache entry can never leak objects across access
 * keys — the cache key is the tenant, never the caller.
 *
 * The cache is per process. Multiple replicas therefore keep independent snapshots, which
 * is acceptable: each individual pull stays internally consistent because a consumer is
 * only inconsistent if its pages are answered by different replicas mid-pull.
 */
@Injectable()
export class SocAggregateCacheService {
    private readonly entries = new Map<string, SocCacheEntry>();
    private readonly inFlightLoads = new Map<string, Promise<unknown>>();

    constructor(private readonly appConfigService: AppConfigService) {}

    public async resolve<TValue>(cacheKey: string, load: () => Promise<TValue>): Promise<TValue> {
        const ttlInMs = this.appConfigService.soc.cacheTtlInMs;

        if (ttlInMs <= 0) {
            return load();
        }

        const entry = this.entries.get(cacheKey);

        if (entry && entry.expiresAt > Date.now()) {
            return entry.value as TValue;
        }

        // Single-flight: concurrent page requests on a cold cache must not each trigger a
        // full aggregation. The first one loads, the rest await the same promise.
        const inFlightLoad = this.inFlightLoads.get(cacheKey);

        if (inFlightLoad) {
            return inFlightLoad as Promise<TValue>;
        }

        const pendingLoad = load()
            .then((value) => {
                this.entries.set(cacheKey, { value, expiresAt: Date.now() + ttlInMs });

                return value;
            })
            .finally(() => {
                this.inFlightLoads.delete(cacheKey);
            });

        this.inFlightLoads.set(cacheKey, pendingLoad);
        this.pruneExpiredEntries();

        return pendingLoad;
    }

    public invalidate(): void {
        this.entries.clear();
    }

    private pruneExpiredEntries(): void {
        const now = Date.now();

        for (const [cacheKey, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(cacheKey);
            }
        }
    }
}
