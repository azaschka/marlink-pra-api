import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteApproverEntity } from '../entities';

@Injectable()
export class SiteApproverRepositoryService extends BaseRepositoryService<SiteApproverEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteApproverEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteApproverEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteApproverEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
