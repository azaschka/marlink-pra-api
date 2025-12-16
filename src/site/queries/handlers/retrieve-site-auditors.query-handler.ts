import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { SiteAuditor } from '../../models';
import { SiteAuditorRepositoryService } from '../../repositories/services/site-auditor.service';
import { RetrieveSiteAuditorsQuery } from '../retrieve-site-auditors.query';

@QueryHandler(RetrieveSiteAuditorsQuery)
export class RetrieveSiteAuditorsQueryHandler implements IQueryHandler<RetrieveSiteAuditorsQuery> {
    constructor(private readonly siteAuditorRepositoryService: SiteAuditorRepositoryService) {}

    public async execute(query: RetrieveSiteAuditorsQuery): Promise<SiteAuditor[]> {
        const siteAuditorFindByQuery = <FindOptionsWhere<SiteAuditor>>{};
        siteAuditorFindByQuery.siteId = query.siteId;

        const siteAuditors = await this.siteAuditorRepositoryService.findBy(
            siteAuditorFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return siteAuditors;
    }
}
