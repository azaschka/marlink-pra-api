import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Jumpoint } from '../../../jumpoint/models';
import { RetrieveJumpointsQuery } from '../../../jumpoint/queries';
import { Site } from '../../models';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { RetrieveSiteJumpointsQuery } from '../retrieve-site-jumpoints.query';

@QueryHandler(RetrieveSiteJumpointsQuery)
export class RetrieveSiteJumpointsQueryHandler implements IQueryHandler<RetrieveSiteJumpointsQuery> {
    constructor(
        private readonly siteRepositoryService: SiteRepositoryService,
        private readonly queryBus: QueryBus,
    ) {}

    public async execute(query: RetrieveSiteJumpointsQuery): Promise<Jumpoint[]> {
        const site = await this.getSite(query.siteId);

        return await this.queryBus.execute<RetrieveJumpointsQuery, Jumpoint[]>(
            new RetrieveJumpointsQuery(
                query.transactionId,
                query.pageSize,
                query.pageNumber,
                undefined, // name
                undefined, // publicIp
                undefined, // privateIp
                undefined, // hostname
                undefined, // codeName
                `%${site.name.toUpperCase()}_${site.key.toUpperCase()}`, // namePattern
            ),
        );
    }

    private async getSite(siteId: number): Promise<Site> {
        const site = await this.siteRepositoryService.findOneById(siteId);

        if (!site) {
            throw new NotFoundException(`Site with ID ${siteId} not found.`);
        }

        return site;
    }
}
