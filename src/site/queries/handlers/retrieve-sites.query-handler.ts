import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere, In, Like } from 'typeorm';
import { Site } from '../../models';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { RetrieveSitesQuery } from '../retrieve-sites.query';

@QueryHandler(RetrieveSitesQuery)
export class RetrieveSitesQueryHandler implements IQueryHandler<RetrieveSitesQuery> {
    constructor(private readonly siteRepositoryService: SiteRepositoryService) {}

    public async execute(query: RetrieveSitesQuery): Promise<Site[]> {
        const siteFindByQuery = <FindOptionsWhere<Site>>{};

        if (query.key) {
            siteFindByQuery.key = query.key;
        }

        if (query.name) {
            siteFindByQuery.name = query.name;
        }

        if (query.customerKeys && query.customerKeys.length > 0) {
            siteFindByQuery.customerKey = In(query.customerKeys);
        }

        if (query.namePattern) {
            siteFindByQuery.name = Like(query.namePattern);
        }

        const sites = await this.siteRepositoryService.findBy(siteFindByQuery, query.pageNumber, query.pageSize);

        return sites;
    }
}
