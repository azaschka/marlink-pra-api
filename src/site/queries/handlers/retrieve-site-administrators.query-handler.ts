import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteAdministrator } from '../../models';
import { SiteAdministratorRepositoryService } from '../../repositories/services/site-administrator.service';
import { RetrieveSiteAdministratorsQuery } from '../retrieve-site-administrators.query';

@QueryHandler(RetrieveSiteAdministratorsQuery)
export class RetrieveSiteAdministratorsQueryHandler implements IQueryHandler<RetrieveSiteAdministratorsQuery> {
    constructor(private readonly siteAdministratorRepositoryService: SiteAdministratorRepositoryService) {}

    public async execute(query: RetrieveSiteAdministratorsQuery): Promise<SiteAdministrator[]> {
        const siteAdministratorFindByQuery = <FindOptionsWhere<SiteAdministrator>>{};
        siteAdministratorFindByQuery.siteId = query.siteId;

        const siteAdministrators = await this.siteAdministratorRepositoryService.findBy(
            siteAdministratorFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteAdministrators;
    }
}
