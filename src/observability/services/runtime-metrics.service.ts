import { Injectable } from '@nestjs/common';
import { getHeapStatistics } from 'v8';
import { DataSource } from 'typeorm';

export interface MemorySnapshot {
    readonly heapUsedBytes: number;
    readonly heapTotalBytes: number;
    readonly heapSizeLimitBytes: number;
    readonly rssBytes: number;
    readonly externalBytes: number;
    readonly arrayBuffersBytes: number;
}

export interface PoolSnapshot {
    readonly all: number;
    readonly free: number;
    readonly queued: number;
}

/** Cheap, read-only runtime figures for diagnostics. Never touches the database. */
@Injectable()
export class RuntimeMetricsService {
    constructor(private readonly dataSource: DataSource) {}

    public memory(): MemorySnapshot {
        const usage = process.memoryUsage();

        return {
            heapUsedBytes: usage.heapUsed,
            heapTotalBytes: usage.heapTotal,
            heapSizeLimitBytes: getHeapStatistics().heap_size_limit,
            rssBytes: usage.rss,
            externalBytes: usage.external,
            arrayBuffersBytes: usage.arrayBuffers,
        };
    }

    /**
     * Connection pool figures. Reads internals of the mysql2 3.x pool (no public API exists); returns undefined
     * when the driver or its internals are not as expected, so a driver upgrade cannot break the caller.
     */
    public pool(): PoolSnapshot | undefined {
        try {
            const pool = (this.dataSource.driver as unknown as { pool?: Record<string, unknown> }).pool;
            const all = pool?._allConnections as { length?: number } | undefined;
            const free = pool?._freeConnections as { length?: number } | undefined;
            const queue = pool?._connectionQueue as { length?: number } | undefined;

            if (
                typeof all?.length !== 'number' ||
                typeof free?.length !== 'number' ||
                typeof queue?.length !== 'number'
            ) {
                return undefined;
            }

            return { all: all.length, free: free.length, queued: queue.length };
        } catch {
            return undefined;
        }
    }

    /** Entries in the repository cache of the long-lived entity manager (bounded since STAB-03). */
    public repositoryCacheEntries(): number | undefined {
        const repositories = (this.dataSource.manager as unknown as { repositories?: Map<unknown, unknown> })
            .repositories;

        return repositories instanceof Map ? repositories.size : undefined;
    }
}
