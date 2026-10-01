import { Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DatabaseConnectionUtility } from '../../shared/utilities/database-connection.utility';

/** A held lock; release() is idempotent and never throws. */
export interface HeldNamedLock {
    release(): Promise<void>;
}

const LOGGER = new Logger('NamedLock');
const ACQUIRE_TIMEOUT_IN_MS = 5000;
const NOT_USED: HeldNamedLock = { release: () => Promise.resolve() };

/**
 * MariaDB named lock (GET_LOCK with timeout 0) on a dedicated connection, so that several replicas do not run the
 * same job at the same time. The server releases the lock if the connection or the process dies. Returns
 * undefined when another session holds the lock. When the lock cannot be requested because of a database error,
 * the job runs without it (warning logged).
 */
export async function tryNamedLock(
    dataSource: DataSource,
    name: string,
    holdForMs: number,
    enabled: boolean,
): Promise<HeldNamedLock | undefined> {
    if (!enabled) {
        return NOT_USED;
    }

    let queryRunner: QueryRunner | undefined;

    try {
        queryRunner = await DatabaseConnectionUtility.acquireQueryRunner(dataSource, ACQUIRE_TIMEOUT_IN_MS);
        // The lock connection stays idle while the job runs; it must outlive the job.
        await queryRunner.query(`SET SESSION wait_timeout = ${Math.ceil(holdForMs / 1000) + 600}`);
        const rows: unknown = await queryRunner.query('SELECT GET_LOCK(?, 0) AS acquired', [name]);

        if (Number((rows as { acquired?: unknown }[])[0]?.acquired) !== 1) {
            await restoreAndRelease(queryRunner);

            return undefined;
        }

        const held = queryRunner;
        let released = false;

        return {
            release: async () => {
                if (released) {
                    return;
                }
                released = true;
                await held.query('SELECT RELEASE_LOCK(?)', [name]).catch(() => undefined);
                await restoreAndRelease(held);
            },
        };
    } catch (error) {
        if (queryRunner) {
            await restoreAndRelease(queryRunner);
        }

        LOGGER.warn(
            `Could not request the lock ${name}, running without it: ${error instanceof Error ? error.message : String(error)}`,
        );

        return NOT_USED;
    }
}

// Session variables survive in the pool, so the default idle timeout is restored before the connection goes back.
async function restoreAndRelease(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET SESSION wait_timeout = @@GLOBAL.wait_timeout').catch(() => undefined);
    await queryRunner.release().catch(() => undefined);
}
