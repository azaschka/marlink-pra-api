import { Injectable } from '@nestjs/common';
import { Between, DataSource, FindOptionsWhere, LessThan, MoreThan } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SortOrderType } from '../../../shared/enums';
import { MonitoringRecordEntity } from '../entities';

@Injectable()
export class MonitoringRecordRepositoryService extends BaseRepositoryService<MonitoringRecordEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, MonitoringRecordEntity);
    }

    public async findByDateBetween(
        pageNumber: number,
        pageSize: number,
        creationDateFrom?: Date,
        creationDateTo?: Date,
        sortOrderType?: SortOrderType,
    ): Promise<MonitoringRecordEntity[]> {
        const dateCond: FindOptionsWhere<MonitoringRecordEntity> = {};

        if (creationDateFrom && creationDateTo) {
            dateCond.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            dateCond.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            dateCond.creationDate = LessThan(creationDateTo);
        }

        const where: FindOptionsWhere<MonitoringRecordEntity> = dateCond;

        return await super.findBy(
            where,
            pageNumber,
            pageSize,
            sortOrderType ? { creationDate: sortOrderType } : undefined,
        );
    }

    public async countByDateBetween(creationDateFrom?: Date, creationDateTo?: Date): Promise<number> {
        const dateCond: FindOptionsWhere<MonitoringRecordEntity> = {};

        if (creationDateFrom && creationDateTo) {
            dateCond.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            dateCond.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            dateCond.creationDate = LessThan(creationDateTo);
        }

        const where: FindOptionsWhere<MonitoringRecordEntity> = dateCond;

        return super.countBy(where);
    }

    public async deleteByDateBetween(creationDateFrom?: Date, creationDateTo?: Date): Promise<void> {
        const where: FindOptionsWhere<MonitoringRecordEntity> = {};

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
