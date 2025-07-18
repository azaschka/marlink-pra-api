import { Injectable } from '@nestjs/common';
import { ICommand, IEvent, IQuery } from '@nestjs/cqrs';
import { name as serviceName } from '../../../package.json';
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

@Injectable()
export class LogService {
    constructor(
        private readonly logRepositoryService: LogRepositoryService,
        private readonly logFilterService: LogFilterService,
    ) {}

    public async logCommand(command: ICommand): Promise<void> {
        const commandData = this.logFilterService.filterCommand(command as BaseCommand);

        await this.logRepositoryService.create(
            LogEntity.createWithoutId(
                serviceName,
                LogActionType.Command,
                commandData.commandType,
                commandData.transactionId,
                commandData.initiatedBy,
                DateUtility.getCurrentUtcDate(),
                JSON.stringify(commandData),
            ),
        );
    }

    public async logQuery(query: IQuery): Promise<void> {
        const queryData = query as BaseQuery;

        await this.logRepositoryService.create(
            LogEntity.createWithoutId(
                serviceName,
                LogActionType.Query,
                queryData.queryType,
                queryData.transactionId,
                queryData.initiatedBy,
                DateUtility.getCurrentUtcDate(),
                JSON.stringify(queryData),
            ),
        );
    }

    public async logEvent(event: IEvent): Promise<void> {
        const eventData = event as BaseEvent;

        await this.logRepositoryService.create(
            LogEntity.createWithoutId(
                serviceName,
                LogActionType.Event,
                eventData.eventType,
                eventData.transactionId,
                undefined,
                new Date(eventData.eventTime),
                JSON.stringify(eventData.payload),
            ),
        );
    }

    public async retrieveLogs(
        pageSize: number,
        pageNumber: number,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        sortOrderType?: SortOrderType,
    ): Promise<Log[]> {
        return await this.logRepositoryService.findByDateBetween(
            pageNumber,
            pageSize,
            creationDateFrom,
            creationDateTo,
            sortOrderType,
        );
    }

    public async countLogs(creationDateFrom?: Date, creationDateTo?: Date): Promise<number> {
        return this.logRepositoryService.countByDateBetween(creationDateFrom, creationDateTo);
    }

    public async clearLogs(creationDateFrom?: Date, creationDateTo?: Date): Promise<void> {
        await this.logRepositoryService.deleteByDateBetween(creationDateFrom, creationDateTo);
    }
}
