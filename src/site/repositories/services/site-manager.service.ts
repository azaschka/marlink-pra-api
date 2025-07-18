import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteManagerEntity } from '../entities';

@Injectable()
export class SiteManagerRepositoryService extends BaseRepositoryService<SiteManagerEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteManagerEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteManagerEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteManagerEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
