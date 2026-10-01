import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DefaultAppConfig } from '../../app-config/consts';

export abstract class DatabaseConnectionUtility {
    private static readonly LOGGER = new Logger('DatabaseConnectionUtility');

    private static readonly TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'EPIPE',
    ]);

    private static readonly CLOSED_CONNECTION_MESSAGE = 'connection is in closed state';

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
            // The connection request stays queued in the pool after a timeout and TypeORM's release() is a
            // no-op until it is handed out, so release it once it arrives to avoid leaking it.
            void connectPromise.then(
                () => queryRunner.release(),
                () => undefined,
            );
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

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
     * Runs the operation inside a transaction on its own pooled connection. The connection is released on every
     * path, including a failing START TRANSACTION, and a rollback is only attempted once a transaction was started.
     * A failing rollback does not hide the original error.
     */
    public static async executeInTransaction<R>(
        dataSource: DataSource,
        operation: (queryRunner: QueryRunner) => Promise<R>,
    ): Promise<R> {
        const queryRunner = await DatabaseConnectionUtility.acquireQueryRunner(dataSource);
        let transactionStarted = false;

        try {
            await queryRunner.startTransaction();
            transactionStarted = true;
            const result = await operation(queryRunner);
            await queryRunner.commitTransaction();

            return result;
        } catch (error) {
            if (transactionStarted) {
                await DatabaseConnectionUtility.rollbackQuietly(queryRunner);
            }

            throw error;
        } finally {
            await queryRunner.release();
        }
    }

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

    private static async rollbackQuietly(queryRunner: QueryRunner): Promise<void> {
        try {
            await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
            DatabaseConnectionUtility.LOGGER.warn(
                `Rollback failed, the connection is released anyway: ${
                    rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
                }`,
            );
        }
    }
}
