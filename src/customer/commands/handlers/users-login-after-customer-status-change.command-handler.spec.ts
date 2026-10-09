import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { ModifyUserCommand } from '../../../user/commands';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { CustomerExclusiveUsers, CustomerExclusiveUsersWorkflow } from '../../workflows';
import { DisableUsersLoginAfterCustomerDeactivationCommand } from '../disable-users-login-after-customer-deactivation.command';
import { EnableUsersLoginAfterCustomerReactivationCommand } from '../enable-users-login-after-customer-reactivation.command';
import { DisableUsersLoginAfterCustomerDeactivationCommandHandler } from './disable-users-login-after-customer-deactivation.command-handler';
import { EnableUsersLoginAfterCustomerReactivationCommandHandler } from './enable-users-login-after-customer-reactivation.command-handler';

/**
 * EXT-27: both handlers take the users from CustomerExclusiveUsersWorkflow (covered by its own spec) and change
 * only their login. Users the workflow could not judge are reported, never changed.
 */
type Dependencies = [CommandBus, QueryBus, EventBus, CustomerRepositoryService, AppConfigService];

describe.each([
    {
        name: 'DisableUsersLoginAfterCustomerDeactivationCommandHandler',
        run: (...dependencies: Dependencies) =>
            new DisableUsersLoginAfterCustomerDeactivationCommandHandler(...dependencies).execute(
                new DisableUsersLoginAfterCustomerDeactivationCommand('tx', 1),
            ),
        isLoginAllowed: false,
    },
    {
        name: 'EnableUsersLoginAfterCustomerReactivationCommandHandler',
        run: (...dependencies: Dependencies) =>
            new EnableUsersLoginAfterCustomerReactivationCommandHandler(...dependencies).execute(
                new EnableUsersLoginAfterCustomerReactivationCommand('tx', 1),
            ),
        isLoginAllowed: true,
    },
])('$name', ({ run, isLoginAllowed }) => {
    let commandBus: CommandBus;
    let eventBus: EventBus;
    let customers: CustomerRepositoryService;
    let find: jest.SpyInstance<Promise<CustomerExclusiveUsers>, []>;

    beforeEach(() => {
        commandBus = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as CommandBus;
        eventBus = { publish: jest.fn() } as unknown as EventBus;
        customers = {
            findOneById: jest.fn().mockResolvedValue({ id: 1, key: 'CUST', name: 'Cust', beyondtrustInstanceId: 7 }),
        } as unknown as CustomerRepositoryService;
        find = jest.spyOn(CustomerExclusiveUsersWorkflow.prototype, 'find');
    });

    afterEach(() => jest.restoreAllMocks());

    async function execute(): Promise<void> {
        await run(commandBus, {} as QueryBus, eventBus, customers, {} as AppConfigService);
    }

    function modifiedUsers(): ModifyUserCommand[] {
        return (commandBus.execute as jest.Mock).mock.calls.map(([sent]) => sent as ModifyUserCommand);
    }

    function publishedMessages(): string[] {
        return (eventBus.publish as jest.Mock).mock.calls.map(
            ([event]) => (event as { payload: { errorMessage: string } }).payload.errorMessage,
        );
    }

    it('should change the login of the exclusive users on the instance of the customer only', async () => {
        find.mockResolvedValue({ userIds: [11, 14], skipped: [] });

        await execute();

        expect(modifiedUsers()).toEqual([
            expect.objectContaining({ tenantId: 7, id: 11, isLoginAllowed }),
            expect.objectContaining({ tenantId: 7, id: 14, isLoginAllowed }),
        ]);
        expect(publishedMessages()).toEqual([]);
    });

    it('should leave a user that could not be judged unchanged and report it', async () => {
        find.mockResolvedValue({
            userIds: [11],
            skipped: [{ userId: 15, reason: 'the site or customer of site id(s) 400 could not be read' }],
        });

        await execute();

        expect(modifiedUsers().map((command) => command.id)).toEqual([11]);
        expect(publishedMessages()).toEqual([
            'Login of user id 15 left unchanged: the site or customer of site id(s) 400 could not be read',
        ]);
    });

    it('should change nothing and report once when the users cannot be determined', async () => {
        find.mockRejectedValue(new Error('database unavailable'));

        await execute();

        expect(modifiedUsers()).toEqual([]);
        expect(publishedMessages()).toEqual([expect.stringContaining('database unavailable')]);
    });

    it('should report a user whose login change failed and continue with the next one', async () => {
        find.mockResolvedValue({ userIds: [11, 14], skipped: [] });
        (commandBus.execute as jest.Mock).mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(undefined);

        await execute();

        expect(modifiedUsers().map((command) => command.id)).toEqual([11, 14]);
        expect(publishedMessages()).toEqual([expect.stringMatching(/login for user id 11: .*timeout/)]);
    });
});
