import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Site } from '../../models';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { RetrieveSiteByIdQuery } from '../retrieve-site-by-id.query';

@QueryHandler(RetrieveSiteByIdQuery)
export class RetrieveSiteByIdQueryHandler implements IQueryHandler<RetrieveSiteByIdQuery> {
    constructor(private readonly siteRepositoryService: SiteRepositoryService) {}

    public async execute(query: RetrieveSiteByIdQuery): Promise<Site> {
        const site = await this.siteRepositoryService.findOneById(query.siteId);

        if (!site) {
            throw new NotFoundException(`Site with id ${query.siteId} not found`);
        }

        return site;
    }
}
