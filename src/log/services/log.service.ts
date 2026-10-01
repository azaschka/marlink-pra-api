import { Injectable } from '@nestjs/common';
import { ICommand, IEvent, IQuery } from '@nestjs/cqrs';
import { name as serviceName } from '../../../package.json';
import { DefaultAppConfig } from '../../app-config/consts';
import { BaseCommand } from '../../core/commands';
import { BaseEvent } from '../../core/events';
import { BaseQuery } from '../../core/queries';
import { SortOrderType } from '../../shared/enums';
import { DateUtility } from '../../shared/utilities';
import { LogActionType } from '../enums';
import { Log } from '../models';
import { LogEntity } from '../repositories/entities';
import { LogRepositoryService } from '../repositories/services/log-repository.service';
import { LogFilterService } from './log-filter.service';
import { LogWriterService } from './log-writer.service';

@Injectable()
export class LogService {
    // Column limits of pra_logs. Entries are truncated instead of being rejected by the database.
    private static readonly ACTION_NAME_MAX_LENGTH = 255;
    private static readonly TRUNCATION_MARKER = '…[truncated]';

    constructor(
        private readonly logRepositoryService: LogRepositoryService,
        private readonly logFilterService: LogFilterService,
        private readonly logWriterService: LogWriterService,
    ) {}

    /** Queues the command for the system log. Never waits for the database. */
    public logCommand(command: ICommand): void {
        const commandData = this.logFilterService.filterCommand(command as BaseCommand);

        this.logWriterService.enqueue(
            this.createEntry(
                LogActionType.Command,
                commandData.commandType,
                commandData.transactionId,
                commandData.initiatedBy,
                DateUtility.getCurrentUtcDate(),
                commandData,
            ),
        );
    }

    /** Queues the query for the system log. Never waits for the database. */
    public logQuery(query: IQuery): void {
        const queryData = query as BaseQuery;

        this.logWriterService.enqueue(
            this.createEntry(
                LogActionType.Query,
                queryData.queryType,
                queryData.transactionId,
                queryData.initiatedBy,
                DateUtility.getCurrentUtcDate(),
                queryData,
            ),
        );
    }

    /** Queues the event for the system log. Never waits for the database. */
    public logEvent(event: IEvent): void {
        const eventData = event as BaseEvent;

        this.logWriterService.enqueue(
            this.createEntry(
                LogActionType.Event,
                eventData.eventType,
                eventData.transactionId,
                undefined,
                new Date(eventData.eventTime),
                eventData.payload,
            ),
        );
    }

    /** Queues a system entry. Never waits for the database. */
    public log(actionName: string, transactionId: string, initiatedBy: string | undefined, payload: string): void {
        this.logWriterService.enqueue(
            this.createEntry(
                LogActionType.System,
                actionName,
                transactionId,
                initiatedBy,
                DateUtility.getCurrentUtcDate(),
                payload,
            ),
        );
    }

    /**
     * Writes a system entry immediately and waits for the database. Only for rare entries that must not be
     * lost, never for anything on a hot path.
     */
    public async logDurably(
        actionName: string,
        transactionId: string,
        initiatedBy: string | undefined,
        payload: string,
    ): Promise<void> {
        await this.logRepositoryService.create(
            this.createEntry(
                LogActionType.System,
                actionName,
                transactionId,
                initiatedBy,
                DateUtility.getCurrentUtcDate(),
                payload,
            ),
        );
    }

    public async retrieveLogs(
        pageSize: number,
        pageNumber: number,
        searchString?: string,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        sortOrderType?: SortOrderType,
        tenantId?: number,
    ): Promise<Log[]> {
        return await this.logRepositoryService.findByDateBetween(
            pageNumber,
            pageSize,
            searchString,
            creationDateFrom,
            creationDateTo,
            sortOrderType,
            tenantId,
        );
    }

    public async countLogs(
        searchString?: string,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        tenantId?: number,
    ): Promise<number> {
        return this.logRepositoryService.countByDateBetween(searchString, creationDateFrom, creationDateTo, tenantId);
    }

    public async clearLogs(creationDateFrom?: Date, creationDateTo?: Date, tenantId?: number): Promise<void> {
        await this.logRepositoryService.deleteByDateBetween(creationDateFrom, creationDateTo, tenantId);
    }

    /**
     * Removes every log entry and resets the table's AUTO_INCREMENT counter.
     * Intended for administrative maintenance only.
     */
    public async purgeAllLogs(): Promise<void> {
        await this.logRepositoryService.truncate();
    }

    private createEntry(
        actionType: LogActionType,
        actionName: string,
        transactionId: string,
        initiatedBy: string | undefined,
        creationDate: Date,
        payload: unknown,
    ): LogEntity {
        return LogEntity.createWithoutId(
            serviceName,
            actionType,
            LogService.truncateCharacters(actionName, LogService.ACTION_NAME_MAX_LENGTH),
            transactionId,
            initiatedBy,
            creationDate,
            LogService.truncateBytes(
                typeof payload === 'string' ? payload : JSON.stringify(payload),
                DefaultAppConfig.logPayloadMaxBytes,
            ),
        );
    }

    private static truncateCharacters(value: string, maxLength: number): string {
        return value.length <= maxLength
            ? value
            : `${value.slice(0, maxLength - LogService.TRUNCATION_MARKER.length)}${LogService.TRUNCATION_MARKER}`;
    }

    private static truncateBytes(value: string, maxBytes: number): string {
        if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
            return value;
        }

        const markerBytes = Buffer.byteLength(LogService.TRUNCATION_MARKER, 'utf8');
        const truncated = Buffer.from(value, 'utf8')
            .subarray(0, maxBytes - markerBytes)
            .toString('utf8')
            // A multi-byte character cut in half decodes to U+FFFD.
            .replace(/\uFFFD+$/, '');

        return `${truncated}${LogService.TRUNCATION_MARKER}`;
    }
}
