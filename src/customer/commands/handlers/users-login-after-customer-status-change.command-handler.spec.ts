import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { RetrieveGroupPolicyMembersQuery } from '../../../group-policy-member/queries';
import { RetrieveGroupPoliciesQuery } from '../../../group-policy/queries';
import {
    RetrieveSiteAuditorsByUserIdQuery,
    RetrieveSiteByIdQuery,
    RetrieveSiteManagersByUserIdQuery,
    RetrieveSiteSupportTeamMembersByUserIdQuery,
} from '../../../site/queries';
import { ModifyUserCommand } from '../../../user/commands';
import { CustomerRepositoryService } from '../../repositories/services/customer-repository.service';
import { DisableUsersLoginAfterCustomerDeactivationCommand } from '../disable-users-login-after-customer-deactivation.command';
import { EnableUsersLoginAfterCustomerReactivationCommand } from '../enable-users-login-after-customer-reactivation.command';
import { DisableUsersLoginAfterCustomerDeactivationCommandHandler } from './disable-users-login-after-customer-deactivation.command-handler';
import { EnableUsersLoginAfterCustomerReactivationCommandHandler } from './enable-users-login-after-customer-reactivation.command-handler';

/**
 * Before STAB-15 every site assignment of a user triggered its site lookup at the same time (unbounded
 * Promise.all), so a user with many assignments sent a burst of queries beyond the pool queue.
 */
type Dependencies = [CommandBus, QueryBus, EventBus, CustomerRepositoryService];

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
    it('looks up at most 5 sites at once and still only changes users exclusive to the customer', async () => {
        let activeSiteLookups = 0;
        let maxActiveSiteLookups = 0;
        const sitesOf = (userId: number) => Array.from({ length: 30 }, (_, i) => ({ siteId: userId * 100 + i }));
        const firstPage = <T>(query: { pageNumber: number }, items: T[]) => (query.pageNumber === 1 ? items : []);

        const queryBus = {
            execute: jest.fn(async (query: unknown) => {
                if (query instanceof RetrieveGroupPoliciesQuery) {
                    return firstPage(query, [{ id: 10 }]);
                }
                if (query instanceof RetrieveGroupPolicyMembersQuery) {
                    return firstPage(query, [{ userId: 1 }, { userId: 2 }]);
                }
                if (query instanceof RetrieveSiteAuditorsByUserIdQuery) {
                    return firstPage(query, sitesOf(query.userId));
                }
                if (
                    query instanceof RetrieveSiteManagersByUserIdQuery ||
                    query instanceof RetrieveSiteSupportTeamMembersByUserIdQuery
                ) {
                    return [];
                }
                if (query instanceof RetrieveSiteByIdQuery) {
                    activeSiteLookups++;
                    maxActiveSiteLookups = Math.max(maxActiveSiteLookups, activeSiteLookups);
                    await new Promise((resolve) => setTimeout(resolve, 2));
                    activeSiteLookups--;

                    if (query.siteId === 215) {
                        throw new Error('site not found'); // ignored, as before
                    }

                    // User 2 also has a site of another customer.
                    return { customerKey: query.siteId === 217 ? 'OTHER' : 'CUST' };
                }

                throw new Error(`unexpected query ${String(query)}`);
            }),
        } as unknown as QueryBus;
        const commandBus = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as CommandBus;
        const eventBus = { publish: jest.fn() } as unknown as EventBus;
        const customers = {
            findOneById: jest.fn().mockResolvedValue({ id: 1, key: 'CUST', name: 'Cust', beyondtrustInstanceId: 7 }),
        } as unknown as CustomerRepositoryService;

        await run(commandBus, queryBus, eventBus, customers);

        expect(maxActiveSiteLookups).toBe(5);
        const modified = (commandBus.execute as jest.Mock).mock.calls.map(([sent]) => sent as ModifyUserCommand);
        expect(modified).toHaveLength(1);
        expect(modified[0]).toEqual(expect.objectContaining({ tenantId: 7, id: 1, isLoginAllowed }));
        expect((eventBus.publish as jest.Mock).mock.calls).toHaveLength(0);
    });
});
