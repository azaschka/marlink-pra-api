import { Injectable } from '@nestjs/common';
import { Between, DataSource, FindOptionsWhere, LessThan, Like, MoreThan, Raw } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SortOrderType } from '../../../shared/enums';
import { BatchedDeleteOptions, BatchedDeleteUtility } from '../../../shared/utilities/batched-delete.utility';
import { LogEntity } from '../entities';

@Injectable()
export class LogRepositoryService extends BaseRepositoryService<LogEntity> {
    private static readonly CLEAR_DELETE_OPTIONS: BatchedDeleteOptions = {
        batchSize: 5000,
        pauseInMs: 20,
        maxDurationInMs: 0,
    };

    constructor(private readonly logDataSource: DataSource) {
        super(logDataSource, LogEntity);
    }

    public async findByDateBetween(
        pageNumber: number,
        pageSize: number,
        searchString?: string,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        sortOrderType?: SortOrderType,
        tenantId?: number,
    ): Promise<LogEntity[]> {
        const hasSearch = !!searchString && searchString.trim() !== '';

        const dateCond: FindOptionsWhere<LogEntity> = {};
        if (creationDateFrom && creationDateTo) {
            dateCond.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            dateCond.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            dateCond.creationDate = LessThan(creationDateTo);
        }

        const where: FindOptionsWhere<LogEntity>[] = hasSearch
            ? [
                  { ...dateCond, serviceName: Like(`%${searchString}%`) },
                  { ...dateCond, actionName: Like(`%${searchString}%`) },
                  { ...dateCond, transactionId: Like(`%${searchString}%`) },
              ]
            : [dateCond];

        if (tenantId !== undefined) {
            where.forEach((condition) => {
                condition.payload = Raw((alias) => `JSON_EXTRACT(${alias}, '$.tenantId') = :tenantId`, { tenantId });
            });
        }

        return await super.findBy(
            where,
            pageNumber,
            pageSize,
            sortOrderType ? { creationDate: sortOrderType } : undefined,
        );
    }

    public async countByDateBetween(
        searchString?: string,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        tenantId?: number,
    ): Promise<number> {
        const hasSearch = !!searchString && searchString.trim() !== '';

        const dateCond: FindOptionsWhere<LogEntity> = {};
        if (creationDateFrom && creationDateTo) {
            dateCond.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            dateCond.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            dateCond.creationDate = LessThan(creationDateTo);
        }

        const where: FindOptionsWhere<LogEntity>[] = hasSearch
            ? [
                  { ...dateCond, serviceName: Like(`%${searchString}%`) },
                  { ...dateCond, actionName: Like(`%${searchString}%`) },
                  { ...dateCond, transactionId: Like(`%${searchString}%`) },
              ]
            : [dateCond];

        if (tenantId !== undefined) {
            where.forEach((condition) => {
                condition.payload = Raw((alias) => `JSON_EXTRACT(${alias}, '$.tenantId') = :tenantId`, { tenantId });
            });
        }

        return super.countBy(where);
    }

    /**
     * "Clear system log": deletes in batches of 5,000 rows (each committed on its own) instead of one DELETE in one
     * long transaction that blocks concurrent log inserts. Same conditions as before: from and to inclusive
     * (BETWEEN), from alone exclusive, to alone exclusive.
     */
    public async deleteByDateBetween(creationDateFrom?: Date, creationDateTo?: Date, tenantId?: number): Promise<void> {
        const conditions: string[] = [];
        const parameters: unknown[] = [];

        if (creationDateFrom && creationDateTo) {
            conditions.push('`creation_date` BETWEEN ? AND ?');
            parameters.push(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            conditions.push('`creation_date` > ?');
            parameters.push(creationDateFrom);
        } else if (creationDateTo) {
            conditions.push('`creation_date` < ?');
            parameters.push(creationDateTo);
        }

        if (tenantId !== undefined) {
            conditions.push("JSON_EXTRACT(`payload`, '$.tenantId') = ?");
            parameters.push(tenantId);
        }

        await BatchedDeleteUtility.deleteInBatches(
            this.logDataSource,
            'pra_logs',
            { sql: conditions.length > 0 ? conditions.join(' AND ') : '1 = 1', parameters },
            'creation_date',
            LogRepositoryService.CLEAR_DELETE_OPTIONS,
        );
    }
}
