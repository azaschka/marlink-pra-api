import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteManager } from '../../models';
import { SiteManagerRepositoryService } from '../../repositories/services/site-manager.service';
import { RetrieveSiteManagersByUserIdQuery } from '../retrieve-site-managers-by-user-id.query';

@QueryHandler(RetrieveSiteManagersByUserIdQuery)
export class RetrieveSiteManagersByUserIdQueryHandler implements IQueryHandler<RetrieveSiteManagersByUserIdQuery> {
    constructor(private readonly siteManagerRepositoryService: SiteManagerRepositoryService) {}

    public async execute(query: RetrieveSiteManagersByUserIdQuery): Promise<SiteManager[]> {
        const siteManagerFindByQuery = <FindOptionsWhere<SiteManager>>{};
        siteManagerFindByQuery.userId = query.userId;

        const siteManagers = await this.siteManagerRepositoryService.findBy(
            siteManagerFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteManagers;
    }
}
