import { Injectable } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteAuditorEntity } from '../entities';

@Injectable()
export class SiteAuditorRepositoryService extends BaseRepositoryService<SiteAuditorEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteAuditorEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteAuditorEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteAuditorEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }

    public async deleteBySiteIdExceptUserIds(siteId: number, userIds: number[]): Promise<void> {
        return await super.deleteBy({
            siteId: siteId,
            userId: userIds.length > 0 ? Not(In(userIds)) : undefined,
        });
    }
}
