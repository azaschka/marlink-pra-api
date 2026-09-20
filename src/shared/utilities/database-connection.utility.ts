import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DefaultAppConfig } from '../../app-config/consts';

/**
 * Helpers for working with pooled MariaDB connections (MARLINKPRA-42).
 *
 * Why this exists:
 * - mysql2 has no acquire timeout. A request that waits for a free pooled connection waits without a
 *   time limit (the queue limit only bounds the queue depth), so a saturated pool shows up as requests
 *   that hang for minutes. {@link acquireQueryRunner} bounds that wait.
 * - A pooled connection can turn out to be dead when it is handed out (server closed it, network path
 *   dropped it). For read-only queries this is safe to repeat once with a fresh connection, see
 *   {@link executeRead}. Writes are intentionally never repeated here.
 */
export abstract class DatabaseConnectionUtility {
    private static readonly LOGGER = new Logger('DatabaseConnectionUtility');

    private static readonly TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
        'PROTOCOL_CONNECTION_LOST', // The server closed the connection
        'ECONNRESET', // The connection was reset by the peer
        'EPIPE', // Write on a connection that was already closed
    ]);

    // mysql2 raises this (without an error code) when a command is added to an already closed connection.
    private static readonly CLOSED_CONNECTION_MESSAGE = 'connection is in closed state';

    /**
     * Creates a query runner and waits at most `acquireTimeoutInMs` for a pooled connection.
     * Fails with 503 (Service Unavailable) when the pool is saturated for longer than that.
     */
    public static async acquireQueryRunner(
        dataSource: DataSource,
        acquireTimeoutInMs: number = DefaultAppConfig.database.acquireTimeoutInMs,
    ): Promise<QueryRunner> {
        const queryRunner = dataSource.createQueryRunner();
        const connectPromise = Promise.resolve(queryRunner.connect());
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(
                () =>
                    reject(
                        new ServiceUnavailableException(
                            `Timed out after ${acquireTimeoutInMs} ms while waiting for a free database connection.`,
                        ),
                    ),
                acquireTimeoutInMs,
            );
        });

        try {
            await Promise.race([connectPromise, timeoutPromise]);
            return queryRunner;
        } catch (error) {
            // TypeORM's release() does nothing until the pooled connection has actually been handed out. The
            // request for a connection stays queued in the pool after a timeout, so the connection that
            // arrives later must be released as soon as it is handed out. Otherwise it would leak from the pool.
            void connectPromise.then(
                () => queryRunner.release(),
                () => undefined,
            );
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Runs a read-only operation on a pooled connection and always releases the connection.
     * When the operation fails because the pooled connection was dead, it is repeated with a fresh
     * connection, up to `maxAttempts` attempts in total. Any other error is thrown immediately.
     */
    public static async executeRead<R>(
        dataSource: DataSource,
        operation: (queryRunner: QueryRunner) => Promise<R>,
        maxAttempts: number = DefaultAppConfig.database.readMaxAttempts,
    ): Promise<R> {
        let attempt = 1;

        for (;;) {
            const queryRunner = await DatabaseConnectionUtility.acquireQueryRunner(dataSource);

            try {
                return await operation(queryRunner);
            } catch (error) {
                if (attempt >= maxAttempts || !DatabaseConnectionUtility.isTransientConnectionError(error)) {
                    throw error;
                }

                DatabaseConnectionUtility.LOGGER.warn(
                    `Read query hit a dead pooled connection (attempt ${attempt}/${maxAttempts}), retrying with a fresh connection: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                );
                attempt++;
            } finally {
                await queryRunner.release();
            }
        }
    }

    /**
     * True when the error means that the pooled connection itself is unusable (as opposed to a problem
     * with the query, such as a syntax error, a constraint violation or a deadlock).
     */
    public static isTransientConnectionError(error: unknown): boolean {
        const candidates = [
            error,
            (error as { driverError?: unknown } | null | undefined)?.driverError,
            (error as { cause?: unknown } | null | undefined)?.cause,
        ];

        return candidates.some((candidate) => {
            if (typeof candidate !== 'object' || candidate === null) {
                return false;
            }

            const { code, message } = candidate as { code?: unknown; message?: unknown };

            return (
                (typeof code === 'string' && DatabaseConnectionUtility.TRANSIENT_ERROR_CODES.has(code)) ||
                (typeof message === 'string' &&
                    message.toLowerCase().includes(DatabaseConnectionUtility.CLOSED_CONNECTION_MESSAGE))
            );
        });
    }
}
