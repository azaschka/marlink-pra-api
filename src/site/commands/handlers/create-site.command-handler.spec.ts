import { UnprocessableEntityException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { Customer } from '../../../customer/models';
import { RetrieveCustomersQuery } from '../../../customer/queries';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';
import { UserSourceType } from '../../../user/enums';
import { ErrorReport } from '../../error-reports';
import { SiteCreatedEvent, SiteModifiedEvent } from '../../events';
import { PartialSiteApprover, Site, SiteWorkflowResult } from '../../models';
import { SiteEntity } from '../../repositories/entities';
import { RemoveSiteAuditorCommand } from '../remove-site-auditor.command';
import { WorkflowFactory } from '../../workflows/factories';
import { RetrieveSiteByIdQuery, RetrieveSitesQuery } from '../../queries';
import { SiteRepositoryService } from '../../repositories/services/site-repository.service';
import { SiteWorkflow } from '../../workflows';
import { CreateSiteCommand } from '../create-site.command';
import { CreateSiteCommandHandler } from './create-site.command-handler';

class TestHelper {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static mockedErrorReport = new ErrorReport();

    public static get mockedSiteWorkflowResult(): SiteWorkflowResult {
        return {
            siteManagers: [
                {
                    userId: 1,
                    username: 'manager-username',
                    email: 'manager-email',
                    sourceType: UserSourceType.Internal,
                },
            ],
            siteAuditors: [
                {
                    userId: 2,
                    username: 'admin-username',
                    email: 'admin-email',
                    isAdminOperator: true,
                    sourceType: UserSourceType.Internal,
                },
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
                    sourceType: UserSourceType.Internal,
                },
            ],
            unresolvedEmails: { siteManagers: [], siteAuditors: [], siteSupportTeamMembers: [] },
            errorReport: this.mockedErrorReport,
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
        jest.spyOn(WorkflowFactory, 'create').mockReturnValue({
            createSiteManagerWorkflow: () => ({ delete: jest.fn().mockResolvedValue(undefined) }),
            createSiteAuditorWorkflow: () => ({ delete: jest.fn().mockResolvedValue(undefined) }),
            createSiteSupportTeamMemberWorkflow: () => ({ delete: jest.fn().mockResolvedValue(undefined) }),
        } as unknown as WorkflowFactory);
        appConfigService = {} as AppConfigService;
        commandBus = {} as CommandBus;
        queryBus = mockQueryBus();
        eventBus = mockEventBus();
        siteRepositoryService = mockSiteRepositoryService();
        handler = new CreateSiteCommandHandler(appConfigService, commandBus, queryBus, eventBus, siteRepositoryService);
    });

    describe('execute', () => {
        it('should sync new members, emit SiteModifiedEvent and return the updated site when a site with the same key already exists', async () => {
            // Arrange
            // existingSite already has auditor userId:2 — so no new auditor should be inserted.
            // Manager userId:1 and the approver email are both new.
            const existingSite = {
                id: 10,
                key: 'site-key-1',
                name: 'site-name-1',
                siteManagers: [],
                siteAuditors: [
                    { userId: 2, username: 'existing-auditor', email: 'existing@example.com', isAdminOperator: false },
                ],
                siteApprovers: [],
                siteSupportTeamMembers: [],
            } as unknown as Site;
            const updatedSite = { id: 10, key: 'site-key-1', name: 'site-name-1' } as unknown as Site;
            const customer = {
                name: 'customer-name-1',
                businessUnit: BusinessUnit.EG,
                beyondtrustInstanceId: 1,
            } as Customer;

            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([existingSite]) // getSiteByKey → found (triggers update path)
                .mockResolvedValueOnce([customer]) // getCustomer
                .mockResolvedValue(updatedSite); // getSiteById → re-fetch after sync

            const eventBusPublishMethod = jest.spyOn(eventBus, 'publish');

            // Act
            const result = await handler.execute(
                new CreateSiteCommand(
                    'transaction-1',
                    'site-key-1',
                    'site-name-1',
                    'customer-key-1',
                    [],
                    [],
                    [],
                    ['new-approver@example.com'],
                ),
            );

            // Assert
            // Re-fetch called with correct site ID
            expect(queryBusExecuteMethod).toHaveBeenCalledWith(
                new RetrieveSiteByIdQuery('transaction-1', existingSite.id),
            );
            // SiteModifiedEvent emitted (not SiteCreatedEvent)
            expect(eventBusPublishMethod).toHaveBeenCalledWith(
                expect.objectContaining(<SiteModifiedEvent>{
                    transactionId: 'transaction-1',
                    eventType: SiteModifiedEvent.EVENT_TYPE,
                    payload: { site: updatedSite },
                }),
            );
            expect(result).toStrictEqual({
                site: updatedSite,
                errorReport: TestHelper.mockedSiteWorkflowResult.errorReport,
            });
        });

        it('should reject a new site when no site manager could be processed', async () => {
            const customer = {
                name: 'customer-name-1',
                businessUnit: BusinessUnit.EG,
                beyondtrustInstanceId: 1,
            } as Customer;

            jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockResolvedValue({
                ...TestHelper.mockedSiteWorkflowResult,
                siteManagers: [],
                unresolvedEmails: {
                    siteManagers: ['manager-email'],
                    siteAuditors: [],
                    siteSupportTeamMembers: [],
                },
            });

            jest.spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // getSiteByKey -> not found
                .mockResolvedValueOnce([]) // validateSiteNameNotTaken
                .mockResolvedValueOnce([customer]); // getCustomer

            const siteRepositoryCreateMethod = jest.spyOn(siteRepositoryService, 'create');

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
            ).rejects.toThrow(UnprocessableEntityException);

            // The site must not be persisted without a manager.
            expect(siteRepositoryCreateMethod).not.toHaveBeenCalled();
        });

        it('should keep an existing site user that could not be processed instead of removing it', async () => {
            const existingSite = {
                id: 10,
                key: 'site-key-1',
                name: 'site-name-1',
                siteManagers: [{ userId: 1, username: 'manager', email: 'manager-email' }],
                siteAuditors: [{ userId: 2, username: 'auditor', email: 'auditor-email', isAdminOperator: false }],
                siteApprovers: [],
                siteSupportTeamMembers: [],
            } as unknown as Site;
            const customer = {
                name: 'customer-name-1',
                businessUnit: BusinessUnit.EG,
                beyondtrustInstanceId: 1,
            } as Customer;

            // The auditor failed to resolve this run: it is neither in the result nor removed from the sheet.
            jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockResolvedValue({
                ...TestHelper.mockedSiteWorkflowResult,
                siteAuditors: [],
                unresolvedEmails: {
                    siteManagers: [],
                    siteAuditors: ['auditor-email'],
                    siteSupportTeamMembers: [],
                },
            });

            jest.spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([existingSite]) // getSiteByKey
                .mockResolvedValueOnce([customer]) // getCustomer
                .mockResolvedValue(existingSite); // getSiteById

            const commandBusExecuteMethod = jest.fn().mockResolvedValue(undefined);
            commandBus.execute = commandBusExecuteMethod;

            const siteRepositoryUpdateMethod = jest.spyOn(siteRepositoryService, 'update');

            await handler.execute(
                new CreateSiteCommand('transaction-1', 'site-key-1', 'site-name-1', 'customer-key-1', [], [], [], []),
            );

            // No removal command was issued for the unresolved auditor.
            const executedCommands = commandBusExecuteMethod.mock.calls as unknown[][];
            expect(executedCommands.some((call) => call[0] instanceof RemoveSiteAuditorCommand)).toBe(false);

            // The unresolved auditor is still part of the persisted site, so its row survives.
            const persistedEntity = siteRepositoryUpdateMethod.mock.calls[0]?.[0];
            expect(persistedEntity?.siteAuditors.map((siteAuditor) => siteAuditor.email)).toContain('auditor-email');
        });

        describe('removal of site users that left the ingestion data (EXT-01)', () => {
            const customer = {
                name: 'customer-name-1',
                businessUnit: BusinessUnit.EG,
                beyondtrustInstanceId: 1,
            } as Customer;

            function mockWorkflowFactory(deletes: {
                manager?: jest.Mock;
                auditor?: jest.Mock;
                member?: jest.Mock;
            }): jest.SpyInstance {
                return jest.spyOn(WorkflowFactory, 'create').mockReturnValue({
                    createSiteManagerWorkflow: () => ({ delete: deletes.manager ?? jest.fn() }),
                    createSiteAuditorWorkflow: () => ({ delete: deletes.auditor ?? jest.fn() }),
                    createSiteSupportTeamMemberWorkflow: () => ({ delete: deletes.member ?? jest.fn() }),
                } as unknown as WorkflowFactory);
            }

            function mockExistingSite(existingSite: Site): void {
                jest.spyOn(queryBus, 'execute')
                    .mockReset()
                    .mockResolvedValueOnce([existingSite]) // getSiteByKey
                    .mockResolvedValueOnce([customer]) // getCustomer
                    .mockResolvedValue(existingSite); // getSiteById
            }

            afterEach(() => jest.restoreAllMocks());

            it('should replace the only site manager and remove the memberships of the old one', async () => {
                const existingSite = {
                    id: 10,
                    key: 'site-key-1',
                    name: 'site-name-1',
                    siteManagers: [{ id: 100, userId: 9, username: 'old@example.com', email: 'old@example.com' }],
                    siteAuditors: [],
                    siteApprovers: [],
                    siteSupportTeamMembers: [],
                } as unknown as Site;
                mockExistingSite(existingSite);
                mockSiteWorkflow();
                jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockResolvedValue({
                    ...TestHelper.mockedSiteWorkflowResult,
                    siteAuditors: [],
                    siteSupportTeamMembers: [],
                    errorReport: new ErrorReport(),
                });
                const managerDelete = jest.fn().mockResolvedValue(undefined);
                mockWorkflowFactory({ manager: managerDelete });
                const update = jest.spyOn(siteRepositoryService, 'update');

                const result = await handler.execute(
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
                );

                expect(managerDelete).toHaveBeenCalledTimes(1);
                expect(update.mock.calls[0]?.[0].siteManagers.map((manager) => manager.email)).toEqual([
                    'manager-email',
                ]);
                expect(result.errorReport.items).toEqual([]);
            });

            it('should keep a site user whose removal failed so that the next run retries it', async () => {
                const existingSite = {
                    id: 10,
                    key: 'site-key-1',
                    name: 'site-name-1',
                    siteManagers: [{ id: 100, userId: 1, username: 'manager-email', email: 'manager-email' }],
                    siteAuditors: [
                        {
                            id: 200,
                            userId: 7,
                            username: 'gone@example.com',
                            email: 'gone@example.com',
                            isAdminOperator: false,
                        },
                    ],
                    siteApprovers: [],
                    siteSupportTeamMembers: [],
                } as unknown as Site;
                mockExistingSite(existingSite);
                jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockResolvedValue({
                    ...TestHelper.mockedSiteWorkflowResult,
                    siteAuditors: [],
                    siteSupportTeamMembers: [],
                    errorReport: new ErrorReport(),
                });
                const auditorDelete = jest.fn().mockRejectedValue(new Error('BeyondTrust unavailable'));
                mockWorkflowFactory({ auditor: auditorDelete });
                const update = jest.spyOn(siteRepositoryService, 'update');

                const result = await handler.execute(
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
                );

                expect(auditorDelete).toHaveBeenCalledTimes(1);
                expect(update.mock.calls[0]?.[0].siteAuditors.map((auditor) => auditor.email)).toEqual([
                    'gone@example.com',
                ]);
                expect(result.errorReport.items.map((item) => item.message)).toContain('BeyondTrust unavailable');
            });

            it('should reject the run before removing anything when no site manager would remain', async () => {
                const existingSite = {
                    id: 10,
                    key: 'site-key-1',
                    name: 'site-name-1',
                    siteManagers: [{ id: 100, userId: 9, username: 'old@example.com', email: 'old@example.com' }],
                    siteAuditors: [],
                    siteApprovers: [],
                    siteSupportTeamMembers: [],
                } as unknown as Site;
                mockExistingSite(existingSite);
                jest.spyOn(SiteWorkflow.prototype, 'getOrCreate').mockResolvedValue({
                    ...TestHelper.mockedSiteWorkflowResult,
                    siteManagers: [],
                    siteAuditors: [],
                    siteSupportTeamMembers: [],
                    unresolvedEmails: {
                        siteManagers: ['new@example.com'],
                        siteAuditors: [],
                        siteSupportTeamMembers: [],
                    },
                    errorReport: new ErrorReport(),
                });
                const managerDelete = jest.fn();
                mockWorkflowFactory({ manager: managerDelete });
                const update = jest.spyOn(siteRepositoryService, 'update');

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
                ).rejects.toThrow(UnprocessableEntityException);

                expect(managerDelete).not.toHaveBeenCalled();
                expect(update).not.toHaveBeenCalled();
            });
        });

        it('should throw ConflictException if a site with the same name already exists', async () => {
            // Arrange
            const existingSite = { id: 1, key: 'site-key-1', name: 'site-name-1' } as SiteEntity;
            const queryBusExecuteMethod = jest
                .spyOn(queryBus, 'execute')
                .mockReset()
                .mockResolvedValueOnce([]) // First call: getSiteByKey → no existing site
                .mockResolvedValueOnce([existingSite]); // Second call: validateSiteNameNotTaken → conflict

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

        it('should call the repository service with correct parameters, publish a SiteCreatedEvent and return the result', async () => {
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
                TestHelper.mockedSiteWorkflowResult.siteAuditors,
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
            expect(result).toStrictEqual({
                site: expectedResult,
                errorReport: TestHelper.mockedSiteWorkflowResult.errorReport,
            });
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
        .mockResolvedValueOnce([]) // First call: getSiteByKey → no existing site (creation path)
        .mockResolvedValueOnce([]) // Second call: validateSiteNameNotTaken → no name conflict
        .mockResolvedValueOnce([
            {
                name: 'customer-name-1',
                beyondtrustInstance: { businessUnit: BusinessUnit.EG },
                beyondtrustInstanceId: 1,
            } as Customer,
        ]); // Third call: getCustomer → found

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
    siteRepositoryService.update = jest.fn();

    return siteRepositoryService;
}
