import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteAuditor } from '../../models';
import { SiteAuditorRepositoryService } from '../../repositories/services/site-auditor.service';
import { RetrieveSiteAuditorsByUserIdQuery } from '../retrieve-site-auditors-by-user-id.query';

@QueryHandler(RetrieveSiteAuditorsByUserIdQuery)
export class RetrieveSiteAuditorsByUserIdQueryHandler implements IQueryHandler<RetrieveSiteAuditorsByUserIdQuery> {
    constructor(private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService) {}

    public async execute(query: RetrieveSiteAuditorsByUserIdQuery): Promise<SiteAuditor[]> {
        const siteAuditorFindByQuery = <FindOptionsWhere<SiteAuditor>>{};
        siteAuditorFindByQuery.userId = query.userId;

        const siteAuditors = await this.siteAuditorRepositoryService.findBy(
            siteAuditorFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteAuditors;
    }
}
