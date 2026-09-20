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

    /**
     * Email, not user id, identifies a site user. A non-local user that was removed and re-created in
     * BeyondTrust comes back with a new user id, and deleting by user id would leave the previous row behind.
     */
    public async deleteBySiteIdExceptEmails(siteId: number, emails: string[]): Promise<void> {
        return await super.deleteBy({
            siteId: siteId,
            email: emails.length > 0 ? Not(In(emails)) : undefined,
        });
    }
}
