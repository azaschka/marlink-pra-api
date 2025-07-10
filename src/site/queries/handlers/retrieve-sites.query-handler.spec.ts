import { Like } from 'typeorm';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { RetrieveSitesQuery } from '../retrieve-sites.query';
import { RetrieveSitesQueryHandler } from './retrieve-sites.query-handler';

describe('RetrieveSitesQueryHandler', () => {
    let siteRepositoryService: SiteRepositoryService;
    let handler: RetrieveSitesQueryHandler;

    beforeEach(() => {
        siteRepositoryService = mockSiteRepositoryService();
        handler = new RetrieveSitesQueryHandler(siteRepositoryService);
    });

    describe('execute', () => {
        it.each([
            {
                query: new RetrieveSitesQuery('transaction-1', 20, 2),
                expectedFindBy: {},
            },
            {
                query: new RetrieveSitesQuery('transaction-1', 20, 2, 'key-1', 'site-1', 'customer-key-1'),
                expectedFindBy: {
                    key: 'key-1',
                    name: 'site-1',
                    customerKey: 'customer-key-1',
                },
            },
            {
                query: new RetrieveSitesQuery('transaction-2', 10, 1, undefined, undefined, undefined, '%site%'),
                expectedFindBy: {
                    name: Like('%site%'),
                },
            },
        ])(
            'should call the repo with correct parameter and return value from the repo',
            async ({ query, expectedFindBy }) => {
                const expectedSites = [] as SiteEntity[];
                const siteRepositoryServiceFindByMethod = jest
                    .spyOn(siteRepositoryService, 'findBy')
                    .mockResolvedValue(expectedSites);

                const result = await handler.execute(query);

                expect(result).toBe(expectedSites);
                expect(siteRepositoryServiceFindByMethod).toHaveBeenCalledWith(
                    expectedFindBy,
                    query.pageNumber,
                    query.pageSize,
                );
            },
        );
    });
});

function mockSiteRepositoryService() {
    const service = {} as SiteRepositoryService;
    service.findBy = jest.fn();

    return service;
}
