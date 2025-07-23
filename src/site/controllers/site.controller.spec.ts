import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Jumpoint } from '../../jumpoint/models';
import { UuidUtility } from '../../shared/utilities';
import {
    AddSiteAdministratorCommand,
    AddSiteManagerCommand,
    AddSiteSupportTeamMemberCommand,
    CreateSiteCommand,
    DeleteSiteCommand,
    RemoveSiteAdministratorCommand,
    RemoveSiteManagerCommand,
    RemoveSiteSupportTeamMemberCommand,
} from '../commands';
import { SiteSupportTeamMemberDtoInput } from '../dtos/inputs';
import { SiteAdministratorDtoOutput, SiteManagerDtoOutput } from '../dtos/outputs';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../enums';
import { Site } from '../models';
import { RetrieveSiteJumpointsQuery, RetrieveSitesQuery } from '../queries';
import { SiteController } from './site.controller';

describe('SiteController', () => {
    let controller: SiteController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new SiteController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveSites', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Site[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveSites(undefined, {
                pageSize: 10,
                pageNumber: 1,
                key: 'key-1',
                name: 'name-1',
                customerKey: 'customer-key-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveSitesQuery('uuid-123', 10, 1, 'key-1', 'name-1', 'customer-key-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createSite', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Site;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createSite(undefined, {
                key: 'key-1',
                name: 'name-1',
                customerKey: 'customer-key-1',
                siteManagers: [
                    {
                        username: 'approver-username-1',
                        email: 'approver-email-1',
                    },
                ],
                siteAdministrators: [
                    {
                        username: 'admin-username-1',
                        email: 'admin-email-1',
                        isAdminOperator: true,
                    },
                ],
                siteSupportTeamMembers: [
                    {
                        firstname: 'support-firstname-1',
                        lastname: 'support-lastname-1',
                        email: 'support-email-1',
                    } as SiteSupportTeamMemberDtoInput,
                ],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateSiteCommand(
                    'uuid-123',
                    'key-1',
                    'name-1',
                    'customer-key-1',
                    [
                        {
                            username: 'approver-username-1',
                            email: 'approver-email-1',
                        },
                    ],
                    [
                        {
                            username: 'admin-username-1',
                            email: 'admin-email-1',
                            isAdminOperator: true,
                        },
                    ],
                    [
                        {
                            firstname: 'support-firstname-1',
                            lastname: 'support-lastname-1',
                            email: 'support-email-1',
                        } as SiteSupportTeamMemberDtoInput,
                    ],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteSite', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteSite('uuid-123', 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteSiteCommand('uuid-123', 1));
        });
    });

    describe('addSiteManager', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as SiteManagerDtoOutput;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addSiteManager('uuid-123', 1, {
                username: 'manager-username-1',
                email: 'manager-email-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddSiteManagerCommand('uuid-123', 1, 'manager-username-1', 'manager-email-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeSiteManager', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.removeSiteManager('uuid-123', 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveSiteManagerCommand('uuid-123', 1, 2));
        });
    });

    describe('addSiteAdministrator', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as SiteAdministratorDtoOutput;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addSiteAdministrator('uuid-123', 1, {
                username: 'admin-username-1',
                email: 'admin-email-1',
                isAdminOperator: true,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddSiteAdministratorCommand('uuid-123', 1, 'admin-username-1', 'admin-email-1', true),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeSiteAdministrator', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.removeSiteAdministrator('uuid-123', 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveSiteAdministratorCommand('uuid-123', 1, 2));
        });
    });

    describe('addSiteSupportTeamMember', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as SiteSupportTeamMemberDtoInput;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addSiteSupportTeamMember('uuid-123', 1, {
                firstname: 'support-firstname-1',
                lastname: 'support-lastname-1',
                email: 'support-email-1',
                supportTeamName: 'support-team-name-1',
                supportTeamAccessLevel: SiteSupportTeamAccessLevel.Full,
                supportTeamTrustLevel: SiteSupportTeamTrustLevel.NotifyOnly,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new AddSiteSupportTeamMemberCommand(
                    'uuid-123',
                    1,
                    'support-firstname-1',
                    'support-lastname-1',
                    'support-email-1',
                    'support-team-name-1',
                    SiteSupportTeamAccessLevel.Full,
                    SiteSupportTeamTrustLevel.NotifyOnly,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeSiteSupportTeamMember', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.removeSiteSupportTeamMember('uuid-123', 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new RemoveSiteSupportTeamMemberCommand('uuid-123', 1, 2));
        });
    });

    describe('getSiteJumpoints', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Jumpoint[]; // Replace with actual Jumpoint type
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);
            const result = await controller.getSiteJumpoints(
                'uuid-123',
                {
                    pageSize: 10,
                    pageNumber: 1,
                },
                123,
            );
            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveSiteJumpointsQuery('uuid-123', 10, 1, 123));
            expect(result).toBe(expectedResult);
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
