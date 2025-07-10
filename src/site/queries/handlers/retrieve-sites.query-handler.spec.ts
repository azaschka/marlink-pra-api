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
        it('should call the repo with page size and page number; and return value from the repo', async () => {
            const expectedSites = [] as SiteEntity[];
            const siteRepositoryServiceFindByMethod = jest
                .spyOn(siteRepositoryService, 'findBy')
                .mockResolvedValue(expectedSites);

            const result = await handler.execute(new RetrieveSitesQuery('transaction-1', 20, 2));

            expect(result).toBe(expectedSites);
            expect(siteRepositoryServiceFindByMethod).toHaveBeenCalledWith({}, 2, 20);
        });

        it('should call the repo with correct parameter and return value from the repo', async () => {
            const expectedSites = [] as SiteEntity[];
            const siteRepositoryServiceFindByMethod = jest
                .spyOn(siteRepositoryService, 'findBy')
                .mockResolvedValue(expectedSites);

            const result = await handler.execute(
                new RetrieveSitesQuery('transaction-2', 10, 1, 'key-1', 'site-1', 'customer-key-1'),
            );

            expect(result).toBe(expectedSites);
            expect(siteRepositoryServiceFindByMethod).toHaveBeenCalledWith(
                {
                    key: 'key-1',
                    name: 'site-1',
                    customerKey: 'customer-key-1',
                },
                1,
                10,
            );
        });
    });
});

function mockSiteRepositoryService() {
    const service = {} as SiteRepositoryService;
    service.findBy = jest.fn();

    return service;
}
