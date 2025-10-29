import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOptionsWhere } from 'typeorm';
import { Access } from '../../models';
import { AccessRepositoryService } from '../../repositories/services/access-repository.service';
import { RetrieveAccessQuery } from '../retrieve-access.query';

@QueryHandler(RetrieveAccessQuery)
export class RetrieveAccessQueryHandler implements IQueryHandler<RetrieveAccessQuery> {
    constructor(private readonly accessRepositoryService: AccessRepositoryService) {}

    public async execute(query: RetrieveAccessQuery): Promise<Access[]> {
        const accessFindByQuery = <FindOptionsWhere<Access>>{};

        if (query.key) {
            accessFindByQuery.key = query.key;
        }

        if (query.name) {
            accessFindByQuery.name = query.name;
        }

        const access = await this.accessRepositoryService.findBy(accessFindByQuery, query.pageNumber, query.pageSize);

        return access;
    }
}
