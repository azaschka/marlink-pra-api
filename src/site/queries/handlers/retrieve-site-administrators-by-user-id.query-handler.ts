import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteAdministrator } from '../../models';
import { SiteAdministratorRepositoryService } from '../../repositories/services/site-administrator.service';
import { RetrieveSiteAdministratorsByUserIdQuery } from '../retrieve-site-administrators-by-user-id.query';

@QueryHandler(RetrieveSiteAdministratorsByUserIdQuery)
export class RetrieveSiteAdministratorsByUserIdQueryHandler
    implements IQueryHandler<RetrieveSiteAdministratorsByUserIdQuery>
{
    constructor(private readonly siteAdministratorRepositoryService: SiteAdministratorRepositoryService) {}

    public async execute(query: RetrieveSiteAdministratorsByUserIdQuery): Promise<SiteAdministrator[]> {
        const siteAdministratorFindByQuery = <FindOptionsWhere<SiteAdministrator>>{};
        siteAdministratorFindByQuery.userId = query.userId;

        const siteAdministrators = await this.siteAdministratorRepositoryService.findBy(
            siteAdministratorFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteAdministrators;
    }
}
