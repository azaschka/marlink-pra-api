import { DataSource } from 'typeorm';

export interface BatchedDeleteOptions {
    /** Rows per DELETE statement; each statement commits on its own (autocommit). */
    readonly batchSize: number;
    /** Pause between statements so that concurrent writes are not starved. */
    readonly pauseInMs: number;
    /** Stop after this time; the next run continues where this one stopped. 0 means no limit. */
    readonly maxDurationInMs: number;
}

export interface BatchedDeleteResult {
    readonly deleted: number;
    readonly batches: number;
    readonly durationMs: number;
    /** False when the time limit stopped the run before every matching row was deleted. */
    readonly complete: boolean;
}

/**
 * Deletes the rows that match a condition in batches of `DELETE ... ORDER BY <column> LIMIT n` instead of one
 * DELETE in one long transaction. The condition is the resume point, so an interrupted run is simply continued by
 * the next one. Table, column and condition are code constants; values are passed as parameters.
 */
export abstract class BatchedDeleteUtility {
    public static async deleteInBatches(
        dataSource: DataSource,
        table: string,
        condition: { sql: string; parameters: unknown[] },
        orderColumn: string,
        options: BatchedDeleteOptions,
    ): Promise<BatchedDeleteResult> {
        const startedAt = Date.now();
        let deleted = 0;
        let batches = 0;

        for (;;) {
            const result: unknown = await dataSource.query(
                `DELETE FROM \`${table}\` WHERE ${condition.sql} ORDER BY \`${orderColumn}\` LIMIT ${Math.floor(options.batchSize)}`,
                condition.parameters,
            );
            const affected = Number((result as { affectedRows?: unknown } | undefined)?.affectedRows ?? 0);
            deleted += affected;
            batches++;

            if (affected < options.batchSize) {
                return { deleted, batches, durationMs: Date.now() - startedAt, complete: true };
            }

            if (options.maxDurationInMs > 0 && Date.now() - startedAt >= options.maxDurationInMs) {
                return { deleted, batches, durationMs: Date.now() - startedAt, complete: false };
            }

            if (options.pauseInMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, options.pauseInMs));
            }
        }
    }
}
