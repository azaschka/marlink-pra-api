import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteAdministratorEntity } from '../entities';

@Injectable()
export class SiteAdministratorRepositoryService extends BaseRepositoryService<SiteAdministratorEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteAdministratorEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteAdministratorEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteAdministratorEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
