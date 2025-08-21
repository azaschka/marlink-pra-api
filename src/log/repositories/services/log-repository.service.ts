import { Injectable } from '@nestjs/common';
import { Between, DataSource, FindOptionsWhere, LessThan, Like, MoreThan } from 'typeorm';
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

        const where: FindOptionsWhere<LogEntity> | FindOptionsWhere<LogEntity>[] = hasSearch
            ? [
                  { ...dateCond, serviceName: Like(`%${searchString}%`) },
                  { ...dateCond, actionName: Like(`%${searchString}%`) },
                  { ...dateCond, transactionId: Like(`%${searchString}%`) },
              ]
            : dateCond;

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

        const where: FindOptionsWhere<LogEntity> | FindOptionsWhere<LogEntity>[] = hasSearch
            ? [
                  { ...dateCond, serviceName: Like(`%${searchString}%`) },
                  { ...dateCond, actionName: Like(`%${searchString}%`) },
                  { ...dateCond, transactionId: Like(`%${searchString}%`) },
              ]
            : dateCond;

        return super.countBy(where);
    }

    public async deleteByDateBetween(creationDateFrom?: Date, creationDateTo?: Date): Promise<void> {
        const where: FindOptionsWhere<LogEntity> = {};

        if (creationDateFrom && creationDateTo) {
            where.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            where.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            where.creationDate = LessThan(creationDateTo);
        }

        await super.deleteBy(where);
    }
}
