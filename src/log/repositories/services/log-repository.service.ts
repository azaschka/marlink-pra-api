import { Injectable } from '@nestjs/common';
import { Between, DataSource, FindOptionsWhere, LessThan, MoreThan } from 'typeorm';
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
        creationDateFrom?: Date,
        creationDateTo?: Date,
        sortOrderType?: SortOrderType,
    ): Promise<LogEntity[]> {
        const where: FindOptionsWhere<LogEntity> = {};

        if (creationDateFrom && creationDateTo) {
            where.creationDate = Between(creationDateFrom, creationDateTo);
        } else if (creationDateFrom) {
            where.creationDate = MoreThan(creationDateFrom);
        } else if (creationDateTo) {
            where.creationDate = LessThan(creationDateTo);
        }

        return await super.findBy(
            where,
            pageNumber,
            pageSize,
            sortOrderType
                ? {
                      creationDate: sortOrderType,
                  }
                : undefined,
        );
    }
}
