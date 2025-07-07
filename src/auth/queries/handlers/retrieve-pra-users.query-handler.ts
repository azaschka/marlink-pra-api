import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PraUser } from '../../models';
import { PraUserRepositoryService } from '../../repositories/services/pra-user-repository.service';
import { RetrievePraUsersQuery } from '../retrieve-pra-users.query';

@QueryHandler(RetrievePraUsersQuery)
export class RetrievePraUsersQueryHandler implements IQueryHandler<RetrievePraUsersQuery> {
    constructor(private readonly praUserRepositoryService: PraUserRepositoryService) {}

    public async execute(query: RetrievePraUsersQuery): Promise<PraUser[]> {
        const praUserFindByQuery = <PraUser>{};

        if (query.id) {
            praUserFindByQuery.id = query.id;
        }

        if (query.username) {
            praUserFindByQuery.username = query.username;
        }

        const praUsers = await this.praUserRepositoryService.findBy(
            praUserFindByQuery,
            query.pageNumber,
            query.pageSize,
        );

        return praUsers;
    }
}
