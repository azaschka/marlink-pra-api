import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';
import { SiteCreatedEvent } from '../../events';
import { PartialSiteApprover, SiteWorkflowResult } from '../../models';
import { RetrieveSitesQuery } from '../../queries';
import { SiteEntity } from '../../repositories/entities';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { CreateSiteCommand } from '../create-site.command';
import { CreateSiteCommandHandler } from './create-site.command-handler';

class TestHelper {
    public static get mockedSiteWorkflowResult(): SiteWorkflowResult {
        return {
            siteManagers: [{ userId: 1, username: 'manager-username', email: 'manager-email' }],
            siteAdministrators: [
                { userId: 2, username: 'admin-username', email: 'admin-email', isAdminOperator: true },
            ],
            siteSupportTeamMembers: [
                {
                    userId: 3,
                    firstname: 'support-firstname',
                    lastname: 'support-lastname',
                    email: 'support-email',
                    supportTeamName: 'support-team',
                    supportTeamAccessLevel: SiteSupportTeamAccessLevel.Limited,
                    supportTeamTrustLevel: SiteSupportTeamTrustLevel.NotifyOnly,
                },
            ],
        };
    }
}

describe('CreateSiteCommandHandler', () => {
    let appConfigService: AppConfigService;
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let eventBus: EventBus;
    let siteRepositoryService: SiteRepositoryService;
    let handler: CreateSiteCommandHandler;

    beforeEach(() => {
        mockSiteWorkflow();
        appConfigService = {} as AppConfigService;
        commandBus = {} as CommandBus;
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new CreateSiteCommandHandler(appConfigService, commandBus, queryBus, eventBus, siteRepositoryService);
    });

    describe('execute', () => {
        it('should throw ConflictException if a site with the same key already exists', async () => {
            // Arrange
            const existingSite = { id: 1, key: 'site-key-1', name: 'site-name-1' } as SiteEntity;
            const queryBusExecuteMethod = jest.spyOn(queryBus, 'execute').mockReset().mockResolvedValue([existingSite]);

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        [],
                        [],
                        [],
                        [],
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(1);
            expect(queryBusExecuteMethod).toHaveBeenCalledWith(
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
        });

        it('should throw ConflictException if a site with the same name already exists', async () => {
            'approver-1';
            // Arrange
            const existingSite = { id: 1, key: 'site-key-1', name: 'site-name-1' } as SiteEntity;
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // First call for key check
                .mockResolvedValueOnce([existingSite]); // Second call for name check

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        [],
                        [],
                        [],
                        [],
                    ),
                ),
            ).rejects.toThrow(ConflictException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(2);
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                1,
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                2,
                new RetrieveSitesQuery('transaction-1', 1, 1, undefined, undefined, undefined, '%site-name-1%'),
            );
        });

        it('should throw NotFoundException if the customer does not exist', async () => {
            'approver-1';
            // Arrange
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // First call for site key check
                .mockResolvedValueOnce([]) // Second call for site name check
                .mockResolvedValueOnce([]); // Third call for customer key check

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'site-key-1',
                        'site-name-1',
                        'customer-key-1',
                        [],
                        [],
                        [],
                        [],
                    ),
                ),
            ).rejects.toThrow(NotFoundException);
            expect(queryBusExecuteMethod).toHaveBeenCalledTimes(3);
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                1,
                new RetrieveSitesQuery('transaction-1', 1, 1, 'site-key-1', undefined),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                2,
                new RetrieveSitesQuery('transaction-1', 1, 1, undefined, undefined, undefined, '%site-name-1%'),
            );
            expect(queryBusExecuteMethod).toHaveBeenNthCalledWith(
                3,
                new RetrieveCustomersQuery('transaction-1', 1, 1, 'customer-key-1'),
            );
        });

        it('should call the repository service with correct parameters, publish an event and return the result', async () => {
            // Arrange
            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');
            const siteEntityToBeCreated = { id: 123 } as SiteEntity;
            const siteEntityCreateWithoutIdMethod = jest
                .spyOn(SiteEntity, 'createWithoutId')
                .mockReturnValue(siteEntityToBeCreated);
            const expectedResult = { id: 321 } as SiteEntity;
            const siteRepositoryServiceCreateMethod = jest
                .spyOn(siteRepositoryService, 'create')
                .mockResolvedValue(expectedResult);

            // Act
            const result = await handler.execute(
                new CreateSiteCommand('transaction-1', 'key-1', 'name-1', 'customer-key-1', [], [], [], ['approver-1']),
            );

            // Assert
            expect(siteEntityCreateWithoutIdMethod).toHaveBeenCalledWith(
                'key-1',
                'name-1',
                'customer-key-1',
                TestHelper.mockedSiteWorkflowResult.siteManagers,
                TestHelper.mockedSiteWorkflowResult.siteAdministrators,
                TestHelper.mockedSiteWorkflowResult.siteSupportTeamMembers,
                [{ email: 'approver-1' } as PartialSiteApprover],
            );
            expect(siteRepositoryServiceCreateMethod).toHaveBeenCalledWith(siteEntityToBeCreated);
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<SiteCreatedEvent>{
                    transactionId: 'transaction-1',
                    eventType: SiteCreatedEvent.EVENT_TYPE,
                    payload: {
                        site: expectedResult,
                    },
                }),
            );
            expect(result).toBe(expectedResult);
        });

        it('should throw an error if the repository fails', async () => {
            // Arrange
            const siteRepositoryServiceCreateMethod = jest
                .spyOn(siteRepositoryService, 'create')
                .mockRejectedValue(new Error('Error'));

            // Act & Assert
            await expect(
                handler.execute(
                    new CreateSiteCommand(
                        'transaction-1',
                        'key-1',
                        'name-1',
                        'customer-key-1',
                        [],
                        [],
                        [],
                        ['approver-1'],
                    ),
                ),
            ).rejects.toThrow();
            expect(siteRepositoryServiceCreateMethod).toHaveBeenCalled();
        });
    });
});

function mockSiteWorkflow() {
    jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockReturnValue(
        Promise.resolve(TestHelper.mockedSiteWorkflowResult),
    );
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest
        .fn()
        .mockResolvedValueOnce([]) // First call for site key check
        .mockResolvedValueOnce([]) // Second call for site name check
        .mockResolvedValueOnce([{} as Customer]); // Third call for customer key check

    return queryBus;
}

function mockEventBus() {
    const eventBus = {} as EventBus;
    eventBus.publish = jest.fn();

    return eventBus;
}

function mockSiteRepositoryService() {
    const siteRepositoryService = {} as SiteRepositoryService;
    siteRepositoryService.create = jest.fn();

    return siteRepositoryService;
}
