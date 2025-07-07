import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { PraUserEntity } from '../entities';

@Injectable()
export class PraUserRepositoryService extends BaseRepositoryService<PraUserEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, PraUserEntity);
    }

    public async createOrUpdateById(entity: Partial<PraUserEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<PraUserEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async findOneByUsername(username: string): Promise<PraUserEntity | null> {
        return await super.findOneBy({ username: username });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
