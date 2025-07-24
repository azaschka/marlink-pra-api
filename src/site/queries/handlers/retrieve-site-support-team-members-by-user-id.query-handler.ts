import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteSupportTeamMember } from '../../models';
import { SiteSupportTeamMemberRepositoryService } from '../../repositories/services/site-support-team-member.service';
import { RetrieveSiteSupportTeamMembersByUserIdQuery } from '../retrieve-site-support-team-members-by-user-id.query';

@QueryHandler(RetrieveSiteSupportTeamMembersByUserIdQuery)
export class RetrieveSiteSupportTeamMembersByUserIdQueryHandler
    implements IQueryHandler<RetrieveSiteSupportTeamMembersByUserIdQuery>
{
    constructor(private readonly siteSupportTeamMemberRepositoryService: SiteSupportTeamMemberRepositoryService) {}

    public async execute(query: RetrieveSiteSupportTeamMembersByUserIdQuery): Promise<SiteSupportTeamMember[]> {
        const siteSupportTeamMemberFindByQuery = <FindOptionsWhere<SiteSupportTeamMember>>{};
        siteSupportTeamMemberFindByQuery.userId = query.userId;

        const siteSupportTeamMembers = await this.siteSupportTeamMemberRepositoryService.findBy(
            siteSupportTeamMemberFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteSupportTeamMembers;
    }
}
