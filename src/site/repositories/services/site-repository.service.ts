import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteEntity } from '../entities';
import { SiteApproverRepositoryService } from './site-approver.service';
import { SiteAuditorRepositoryService } from './site-auditor.service';
import { SiteManagerRepositoryService } from './site-manager.service';
import { SiteSupportTeamMemberRepositoryService } from './site-support-team-member.service';

@Injectable()
export class SiteRepositoryService extends BaseRepositoryService<SiteEntity> {
    constructor(
        dataSource: DataSource,
        private readonly siteManagerRepositoryService: SiteManagerRepositoryService,
        private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService,
        private readonly siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService,
        private readonly siteApproverRepositoryService: SiteApproverRepositoryService,
    ) {
        super(dataSource, SiteEntity);
    }

    public async createOrUpdateById(entity: Partial<SiteEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    /**
     * Updates a site entity along with its related managers, auditors, support team members, and approvers.
     * Use save() to ensure that the related entities are properly persisted in the database.
     * Ideally, the save() combined with orphanedRowAction: 'delete' automatically deletes any related entities
     * that are no longer associated with the site entity. However, the mechanism for deleting orphaned rows
     * is not working as expected (it sets the site id to null which breaks the non nullable constraint).
     * Therefore we manually delete the related entities that are no longer associated with the site entity.
     */
    public async update(entity: SiteEntity): Promise<void> {
        await this.siteManagerRepositoryService.deleteBySiteIdExceptUserIds(
            entity.id,
            entity.siteManagers.map((siteManager) => siteManager.userId),
        );

        await this.siteAuditorRepositoryService.deleteBySiteIdExceptUserIds(
            entity.id,
            entity.siteAuditors.map((siteAuditor) => siteAuditor.userId),
        );

        await this.siteSupportTeamMemberRepositoryService.deleteBySiteIdExceptUserIds(
            entity.id,
            entity.siteSupportTeamMembers.map((siteSupportTeamMember) => siteSupportTeamMember.userId),
        );

        await this.siteApproverRepositoryService.deleteBySiteIdExceptEmails(
            entity.id,
            entity.siteApprovers.map((siteApprover) => siteApprover.email),
        );

        await super.save(entity);
    }

    public async findOneById(id: number): Promise<SiteEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
