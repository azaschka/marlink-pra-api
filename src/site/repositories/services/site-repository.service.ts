import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteEntity } from '../entities';

@Injectable()
export class SiteRepositoryService extends BaseRepositoryService<SiteEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
