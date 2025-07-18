import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteSupportTeamMember } from '../../models';
import { SiteSupportTeamMemberRepositoryService } from '../../repositories/services/site-support-team-member.service';
import { RetrieveSiteSupportTeamMembersQuery } from '../retrieve-site-support-team-member.query';

@QueryHandler(RetrieveSiteSupportTeamMembersQuery)
export class RetrieveSiteSupportTeamMembersQueryHandler implements IQueryHandler<RetrieveSiteSupportTeamMembersQuery> {
    constructor(private readonly siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService) {}

    public async execute(query: RetrieveSiteSupportTeamMembersQuery): Promise<SiteSupportTeamMember[]> {
        const siteSupportTeamMemberFindByQuery = <FindOptionsWhere<SiteSupportTeamMember>>{};

        if (query.userId) {
            siteSupportTeamMemberFindByQuery.userId = query.userId;
        }

        if (query.supportTeamName) {
            siteSupportTeamMemberFindByQuery.supportTeamName = query.supportTeamName;
        }

        const siteSupportTeamMembers = await this.siteSupportTeamMemberRepositoryService.findBy(
            siteSupportTeamMemberFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteSupportTeamMembers;
    }
}
