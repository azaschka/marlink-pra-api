import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { SiteEntity } from '../entities';
import { SiteApproverRepositoryService } from './site-approver.service';
import { SiteAuditorRepositoryService } from './site-auditor.service';
import { SiteManagerRepositoryService } from './site-manager.service';
import { SiteRepositoryService } from './site-repository.service';
import { SiteSupportTeamMemberRepositoryService } from './site-support-team-member.service';

describe('SiteRepositoryService', () => {
    let service: SiteRepositoryService;
    let dataSource: DataSource;
    let siteManagerRepositoryService: SiteManagerRepositoryService;
    let siteAuditorRepositoryService: SiteAuditorRepositoryService;
    let siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService;
    let siteApproverRepositoryService: SiteApproverRepositoryService;

    beforeEach(() => {
        jest.clearAllMocks();

        dataSource = {} as DataSource;
        siteManagerRepositoryService = {
            deleteBySiteIdExceptEmails: jest.fn(),
        } as unknown as SiteManagerRepositoryService;
        siteAuditorRepositoryService = {
            deleteBySiteIdExceptEmails: jest.fn(),
        } as unknown as SiteAuditorRepositoryService;
        siteSupportTeamMemberRepositoryService = {
            deleteBySiteIdExceptEmails: jest.fn(),
        } as unknown as SiteSupportTeamMemberRepositoryService;
        siteApproverRepositoryService = {
            deleteBySiteIdExceptEmails: jest.fn(),
        } as unknown as SiteApproverRepositoryService;

        service = new SiteRepositoryService(
            dataSource,
            siteManagerRepositoryService,
            siteAuditorRepositoryService,
            siteSupportTeamMemberRepositoryService,
            siteApproverRepositoryService,
        );
    });

    describe('createOrUpdateById', () => {
        it('should call createOrUpdate with the correct parameters', async () => {
            const entity = { id: 1, name: 'Test site' };
            const expectedConflictPaths = ['id'];
            const baseRepositoryCreateOrUpdateMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'createOrUpdate')
                .mockReturnValue(Promise.resolve());

            await service.createOrUpdateById(entity);

            expect(baseRepositoryCreateOrUpdateMethod).toHaveBeenCalledWith(entity, expectedConflictPaths);
        });
    });

    describe('update', () => {
        it('should call deleteBySiteIdExceptEmails for each related entity and then call save', async () => {
            const siteEntity = {
                id: 1,
                siteManagers: [
                    { userId: 1, email: 'manager1@example.com' },
                    { userId: 2, email: 'manager2@example.com' },
                ],
                siteAuditors: [{ userId: 3, email: 'auditor@example.com' }],
                siteSupportTeamMembers: [{ userId: 4, email: 'support@example.com' }],
                siteApprovers: [{ email: 'approver@example.com' }],
            } as SiteEntity;

            const siteManagerDeleteBySiteIdExceptEmailsMethod = jest
                .spyOn(siteManagerRepositoryService, 'deleteBySiteIdExceptEmails')
                .mockReturnValue(Promise.resolve());
            const siteAuditorDeleteBySiteIdExceptEmailsMethod = jest
                .spyOn(siteAuditorRepositoryService, 'deleteBySiteIdExceptEmails')
                .mockReturnValue(Promise.resolve());
            const siteSupportTeamMemberDeleteBySiteIdExceptEmailsMethod = jest
                .spyOn(siteSupportTeamMemberRepositoryService, 'deleteBySiteIdExceptEmails')
                .mockReturnValue(Promise.resolve());
            const siteApproverDeleteBySiteIdExceptEmailsMethod = jest
                .spyOn(siteApproverRepositoryService, 'deleteBySiteIdExceptEmails')
                .mockReturnValue(Promise.resolve());
            const baseRepositorySaveMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'save')
                .mockReturnValue(Promise.resolve());

            await service.update(siteEntity);

            expect(siteManagerDeleteBySiteIdExceptEmailsMethod).toHaveBeenCalledWith(
                siteEntity.id,
                siteEntity.siteManagers.map((siteManager) => siteManager.email),
            );
            expect(siteAuditorDeleteBySiteIdExceptEmailsMethod).toHaveBeenCalledWith(
                siteEntity.id,
                siteEntity.siteAuditors.map((siteAuditor) => siteAuditor.email),
            );
            expect(siteSupportTeamMemberDeleteBySiteIdExceptEmailsMethod).toHaveBeenCalledWith(
                siteEntity.id,
                siteEntity.siteSupportTeamMembers.map((siteSupportTeamMember) => siteSupportTeamMember.email),
            );
            expect(siteApproverDeleteBySiteIdExceptEmailsMethod).toHaveBeenCalledWith(
                siteEntity.id,
                siteEntity.siteApprovers.map((siteApprover) => siteApprover.email),
            );
            expect(baseRepositorySaveMethod).toHaveBeenCalledWith(siteEntity);
        });
    });

    describe('findOneById', () => {
        it('should call findOneBy with the correct parameters', async () => {
            const id = 1;
            const expectedWhere = { id: id };
            const baseRepositoryFindOneByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'findOneBy')
                .mockReturnValue(Promise.resolve());

            await service.findOneById(id);

            expect(baseRepositoryFindOneByMethod).toHaveBeenCalledWith(expectedWhere);
        });
    });

    describe('deleteById', () => {
        it('should call deleteBy with the correct parameters', async () => {
            const id = 1;
            const expectedWhere = { id: id };
            const baseRepositoryDeleteByMethod = jest
                .spyOn(BaseRepositoryService.prototype, 'deleteBy')
                .mockReturnValue(Promise.resolve());

            await service.deleteById(id);

            expect(baseRepositoryDeleteByMethod).toHaveBeenCalledWith(expectedWhere);
        });
    });
});
