import { Logger } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { DatabaseConnectionUtility } from '../../shared/utilities/database-connection.utility';

export interface BufferedEntityWriterOptions {
    /** Name used in log output, usually the table name. */
    readonly name: string;
    /** Maximum number of buffered rows. Rows offered while the buffer is full are dropped and counted. */
    readonly capacity: number;
    /** Maximum number of rows per INSERT statement. */
    readonly batchSize: number;
    readonly flushIntervalInMs: number;
    readonly acquireTimeoutInMs: number;
    readonly maxBackoffInMs: number;
    readonly shutdownTimeoutInMs: number;
    /** Dropped rows are reported at most once per interval. */
    readonly dropReportIntervalInMs: number;
}

export interface BufferedEntityWriterStats {
    readonly buffered: number;
    readonly written: number;
    readonly dropped: number;
    readonly rejected: number;
}

/** Creates the row that documents a gap after rows had to be dropped. */
export type DroppedRowsMarkerFactory<E> = (droppedRows: number, firstDroppedAt: Date, lastDroppedAt: Date) => E;

/**
 * Persists rows that are not allowed to slow down or endanger business operations (system log, monitoring).
 *
 * - Producers never wait: enqueue() only appends to a bounded in-memory buffer.
 * - At most one INSERT is in flight per writer, so the writer uses at most one pooled connection.
 * - Rows are written in multi-row INSERTs of up to batchSize rows.
 * - When the database is unavailable the rows stay buffered and the writer backs off exponentially.
 * - When the buffer is full new rows are dropped, counted and reported; the next written batch starts with a
 *   marker row that documents the gap, if a marker factory is given.
 * - Rows rejected by the database for deterministic reasons (data too long, invalid value) are dropped
 *   individually instead of blocking the whole batch.
 * - stop() writes what is buffered within the shutdown timeout, also while an INSERT hangs; the rest is reported
 *   as discarded.
 */
export class BufferedEntityWriter<E extends ObjectLiteral> {
    private static readonly DETERMINISTIC_ERROR_CODES: ReadonlySet<string> = new Set([
        'ER_DATA_TOO_LONG',
        'ER_TRUNCATED_WRONG_VALUE',
        'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
        'ER_BAD_NULL_ERROR',
        'ER_NO_DEFAULT_FOR_FIELD',
        'ER_WRONG_VALUE_COUNT_ON_ROW',
        'ER_DUP_ENTRY',
        'ER_INVALID_JSON_TEXT',
        'ER_WARN_DATA_OUT_OF_RANGE',
        'WARN_DATA_TRUNCATED',
    ]);

    private readonly logger: Logger;
    private buffer: E[] = [];
    private timer: NodeJS.Timeout | undefined;
    private flushInFlight: Promise<void> | undefined;
    private nextAttemptAt = 0;
    private backoffInMs = 0;
    private stopped = false;
    private stopDeadline = Number.POSITIVE_INFINITY;
    private pendingGap: { rows: number; first: Date; last: Date } | undefined;
    private droppedSinceReport = 0;
    private lastDropReportAt = 0;
    private writtenTotal = 0;
    private droppedTotal = 0;
    private rejectedTotal = 0;

    constructor(
        private readonly dataSource: DataSource,
        private readonly entity: EntityTarget<E>,
        private readonly options: BufferedEntityWriterOptions,
        private readonly droppedRowsMarkerFactory?: DroppedRowsMarkerFactory<E>,
    ) {
        this.logger = new Logger(`BufferedEntityWriter:${options.name}`);
    }

    public start(): void {
        if (this.timer || this.stopped) {
            return;
        }

        this.timer = setInterval(() => void this.flushIfDue(), this.options.flushIntervalInMs);
        this.timer.unref();
    }

    /** Never throws and never waits. Returns false when the row was dropped. */
    public enqueue(row: E): boolean {
        if (this.stopped || this.buffer.length >= this.options.capacity) {
            this.recordDrop();

            return false;
        }

        this.buffer.push(row);

        if (this.buffer.length >= this.options.batchSize) {
            void this.flushIfDue();
        }

        return true;
    }

    public stats(): BufferedEntityWriterStats {
        return {
            buffered: this.buffer.length,
            written: this.writtenTotal,
            dropped: this.droppedTotal,
            rejected: this.rejectedTotal,
        };
    }

    /** Writes buffered rows until the buffer is empty or a write fails. Never rejects. */
    public flush(): Promise<void> {
        return this.flushIfDue(true);
    }

    /**
     * Writes what is buffered within the shutdown timeout and discards the rest. Bounded even while an INSERT
     * hangs (for example on a half-open connection after a database failover): the hanging statement is left
     * behind and its rows count as not written.
     */
    public async stop(): Promise<void> {
        this.stopped = true;
        clearInterval(this.timer);
        this.timer = undefined;
        this.stopDeadline = Date.now() + this.options.shutdownTimeoutInMs;

        let finishedInTime = !this.flushInFlight || (await this.settlesBeforeStopDeadline(this.flushInFlight));

        while (finishedInTime && (this.buffer.length > 0 || this.hasPendingGap()) && !this.isPastStopDeadline()) {
            const write = this.writeNextBatch();
            finishedInTime = await this.settlesBeforeStopDeadline(write);

            if (finishedInTime && !(await write)) {
                break;
            }
        }

        if (!finishedInTime) {
            this.logger.warn(
                `A write did not finish within the shutdown timeout of ${this.options.shutdownTimeoutInMs} ms; its rows may be lost.`,
            );
        }

        if (this.buffer.length > 0) {
            this.droppedTotal += this.buffer.length;
            this.logger.warn(`Discarded ${this.buffer.length} buffered rows on shutdown.`);
            this.buffer = [];
        }
    }

    private flushIfDue(ignoreBackoff = false): Promise<void> {
        if (this.flushInFlight) {
            return this.flushInFlight;
        }

        if (this.buffer.length === 0 && !this.hasPendingGap()) {
            return Promise.resolve();
        }

        if (!ignoreBackoff && Date.now() < this.nextAttemptAt) {
            return Promise.resolve();
        }

        this.flushInFlight = this.drain().finally(() => {
            this.flushInFlight = undefined;
        });

        return this.flushInFlight;
    }

    private async drain(): Promise<void> {
        // After stop() the loop ends at the shutdown deadline; stop() reports what is left.
        while ((this.buffer.length > 0 || this.hasPendingGap()) && !this.isPastStopDeadline()) {
            if (!(await this.writeNextBatch())) {
                return;
            }
        }
    }

    private isPastStopDeadline(): boolean {
        return Date.now() >= this.stopDeadline;
    }

    /** True when the promise settled before the shutdown deadline. */
    private async settlesBeforeStopDeadline(promise: Promise<unknown>): Promise<boolean> {
        let timer: NodeJS.Timeout | undefined;
        const deadlineReached = new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), Math.max(0, this.stopDeadline - Date.now()));
        });

        try {
            return await Promise.race([
                promise.then(
                    () => true as const,
                    () => true as const,
                ),
                deadlineReached,
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    /** Returns false when the batch could not be written for a transient reason and was requeued. */
    private async writeNextBatch(): Promise<boolean> {
        const batch = this.takeBatch();

        if (batch.length === 0) {
            return true;
        }

        try {
            await this.insert(batch);
            this.onWriteSucceeded(batch.length);

            return true;
        } catch (error) {
            if (BufferedEntityWriter.isDeterministicError(error)) {
                return this.writeIndividually(batch);
            }

            this.onWriteFailed(batch, error);

            return false;
        }
    }

    private async writeIndividually(batch: E[]): Promise<boolean> {
        let rejected = 0;

        for (const [index, row] of batch.entries()) {
            try {
                await this.insert([row]);
                this.onWriteSucceeded(1);
            } catch (error) {
                if (!BufferedEntityWriter.isDeterministicError(error)) {
                    this.onWriteFailed(batch.slice(index), error);

                    return false;
                }

                rejected++;
            }
        }

        if (rejected > 0) {
            this.rejectedTotal += rejected;
            this.logger.warn(`The database rejected ${rejected} rows; they were dropped.`);
        }

        return true;
    }

    private async insert(rows: E[]): Promise<void> {
        const queryRunner = await DatabaseConnectionUtility.acquireQueryRunner(
            this.dataSource,
            this.options.acquireTimeoutInMs,
        );

        try {
            await queryRunner.manager
                .createQueryBuilder()
                .insert()
                .into(this.entity)
                .values(rows)
                .updateEntity(false)
                .execute();
        } finally {
            await queryRunner.release();
        }
    }

    private takeBatch(): E[] {
        const batch: E[] = [];

        if (this.pendingGap && this.droppedRowsMarkerFactory) {
            batch.push(
                this.droppedRowsMarkerFactory(this.pendingGap.rows, this.pendingGap.first, this.pendingGap.last),
            );
        }

        this.pendingGap = undefined;
        batch.push(...this.buffer.splice(0, this.options.batchSize - batch.length));

        return batch;
    }

    private onWriteSucceeded(rows: number): void {
        this.writtenTotal += rows;
        this.backoffInMs = 0;
        this.nextAttemptAt = 0;
    }

    private onWriteFailed(batch: E[], error: unknown): void {
        // Put the batch back in front; rows beyond the capacity are dropped (newest first).
        this.buffer = [...batch, ...this.buffer];
        const overflow = this.buffer.length - this.options.capacity;

        if (overflow > 0) {
            this.buffer.splice(this.options.capacity, overflow);
            for (let i = 0; i < overflow; i++) {
                this.recordDrop();
            }
        }

        this.backoffInMs = Math.min(Math.max(this.backoffInMs * 2, 1000), this.options.maxBackoffInMs);
        this.nextAttemptAt = Date.now() + this.backoffInMs;
        this.logger.warn(
            `Writing ${batch.length} rows failed, ${this.buffer.length} rows buffered, next attempt in ${
                this.backoffInMs
            } ms: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    private recordDrop(): void {
        const now = new Date();

        this.droppedTotal++;
        this.droppedSinceReport++;
        this.pendingGap = this.pendingGap
            ? { rows: this.pendingGap.rows + 1, first: this.pendingGap.first, last: now }
            : { rows: 1, first: now, last: now };

        if (now.getTime() - this.lastDropReportAt >= this.options.dropReportIntervalInMs) {
            this.logger.warn(
                `Dropped ${this.droppedSinceReport} rows because the buffer is full (capacity ${this.options.capacity}).`,
            );
            this.droppedSinceReport = 0;
            this.lastDropReportAt = now.getTime();
        }
    }

    private hasPendingGap(): boolean {
        return !!this.pendingGap && !!this.droppedRowsMarkerFactory;
    }

    private static isDeterministicError(error: unknown): boolean {
        const candidates = [error, (error as { driverError?: unknown } | null | undefined)?.driverError];

        return candidates.some((candidate) => {
            const code = (candidate as { code?: unknown } | null | undefined)?.code;

            return typeof code === 'string' && BufferedEntityWriter.DETERMINISTIC_ERROR_CODES.has(code);
        });
    }
}
