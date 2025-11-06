import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { AccessEntity } from '../entities';

@Injectable()
export class AccessRepositoryService extends BaseRepositoryService<AccessEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, AccessEntity);
    }

    public async createOrUpdateById(entity: Partial<AccessEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<AccessEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
