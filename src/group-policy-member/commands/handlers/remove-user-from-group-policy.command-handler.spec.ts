import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { TENANT_ID_HEADER, TRANSACTION_ID_HEADER } from '../../../core/decorators';
import { RemoveUserFromGroupPolicyCommand } from '../remove-user-from-group-policy.command';
import { RemoveUserFromGroupPolicyCommandHandler } from './remove-user-from-group-policy.command-handler';

describe('RemoveUserFromGroupPolicyCommandHandler (MARLINKPRA-81)', () => {
    const REMOVAL = { groupPolicyId: 30, userId: 9, removed: true, stillHoldsGroupPolicy: false };
    const appConfigService = {
        praSyncApi: {
            baseUrl: 'http://sync',
            groupPolicy: { path: '/group-policies', member: { path: '/members', user: { path: '/users' } } },
        },
    } as unknown as AppConfigService;

    it('should call the user removal of the Sync API and return its result', async () => {
        const del = jest.fn().mockReturnValue(of({ data: REMOVAL }));
        const handler = new RemoveUserFromGroupPolicyCommandHandler(appConfigService, {
            delete: del,
        } as unknown as HttpService);

        const result = await handler.execute(new RemoveUserFromGroupPolicyCommand('tx', 4, 30, 9, true));

        expect(result).toBe(REMOVAL);
        const [url, config] = del.mock.calls[0] as [
            string,
            { headers: { get(name: string): unknown }; params: unknown },
        ];
        expect(url).toBe('http://sync/group-policies/30/members/users/9');
        expect(config.params).toEqual({ verifyEffectiveMembership: true });
        expect(config.headers.get(TRANSACTION_ID_HEADER)).toBe('tx');
        expect(config.headers.get(TENANT_ID_HEADER)).toBe('4');
    });

    it('should not ask for the verification by default', async () => {
        const del = jest.fn().mockReturnValue(of({ data: REMOVAL }));
        const handler = new RemoveUserFromGroupPolicyCommandHandler(appConfigService, {
            delete: del,
        } as unknown as HttpService);

        await handler.execute(new RemoveUserFromGroupPolicyCommand('tx', 4, 30, 9));

        expect((del.mock.calls[0] as [string, { params: unknown }])[1].params).toEqual({
            verifyEffectiveMembership: false,
        });
    });

    it('should raise a failure of the Sync API', async () => {
        const handler = new RemoveUserFromGroupPolicyCommandHandler(appConfigService, {
            delete: jest.fn().mockReturnValue(throwError(() => new Error('sync down'))),
        } as unknown as HttpService);

        await expect(handler.execute(new RemoveUserFromGroupPolicyCommand('tx', 4, 30, 9))).rejects.toBeDefined();
    });
});
