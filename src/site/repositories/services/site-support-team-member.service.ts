import { Injectable } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteSupportTeamMemberEntity } from '../entities';

@Injectable()
export class SiteSupportTeamMemberRepositoryService extends BaseRepositoryService<SiteSupportTeamMemberEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, SiteSupportTeamMemberEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteSupportTeamMemberEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<SiteSupportTeamMemberEntity | null> {
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
