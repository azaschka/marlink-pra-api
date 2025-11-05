import { Injectable } from '@nestjs/common';
import { Between, DataSource, FindOptionsWhere, LessThan, Like, MoreThan, Raw } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SortOrderType } from '../../../shared/enums';
import { LogEntity } from '../entities';

@Injectable()
export class LogRepositoryService extends BaseRepositoryService<LogEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, LogEntity);
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

    public async deleteByDateBetween(creationDateFrom?: Date, creationDateTo?: Date, tenantId?: number): Promise<void> {
        const where: FindOptionsWhere<LogEntity> = {};

        if (creationDateFrom && creationDateTo) {
            where.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            where.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            where.creationDate = LessThan(creationDateTo);
        }

        if (tenantId !== undefined) {
            where.payload = Raw((alias) => `JSON_EXTRACT(${alias}, '$.tenantId') = :tenantId`, { tenantId });
        }

        await super.deleteBy(where);
    }
}
