import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteManager } from '../../models';
import { SiteManagerRepositoryService } from '../../repositories/services/site-manager.service';
import { RetrieveSiteManagersQuery } from '../retrieve-site-managers.query';

@QueryHandler(RetrieveSiteManagersQuery)
export class RetrieveSiteManagersQueryHandler implements IQueryHandler<RetrieveSiteManagersQuery> {
    constructor(private readonly siteManagerRepositoryService: SiteManagerRepositoryService) {}

    public async execute(query: RetrieveSiteManagersQuery): Promise<SiteManager[]> {
        const siteManagerFindByQuery = <FindOptionsWhere<SiteManager>>{};

        if (query.userId) {
            siteManagerFindByQuery.userId = query.userId;
        }

        const siteManagers = await this.siteManagerRepositoryService.findBy(
            siteManagerFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteManagers;
    }
}
