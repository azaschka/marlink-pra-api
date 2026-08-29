import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { CreateJumpPolicyCommand, ModifyJumpPolicyCommand } from '../../../jump-policy/commands';
import { JumpPolicy } from '../../../jump-policy/models';
import { PartialSiteApprover, PartialSiteManager } from '../../models';
import { AuthJumpPolicyWorkflow } from './auth-jump-policy.workflow';

function buildAppConfigService(): AppConfigService {
    return {
        site: {
            jumpPolicy: {
                authSuffix: '_AUTH',
                notificationDisplayNamePrefix: 'SITE MANAGER',
                approvalDisplayNamePrefix: 'SITE MANAGER',
            },
        },
    } as unknown as AppConfigService;
}

function buildSiteManager(username: string, email: string): PartialSiteManager {
    return { username, email };
}

function buildSiteApprover(email: string): PartialSiteApprover {
    return { email };
}

describe('AuthJumpPolicyWorkflow', () => {
    let appConfigService: AppConfigService;
    let queryBus: QueryBus;
    let commandBus: CommandBus;

    beforeEach(() => {
        appConfigService = buildAppConfigService();
        queryBus = { execute: jest.fn() } as unknown as QueryBus;
        commandBus = { execute: jest.fn() } as unknown as CommandBus;
    });

    function buildWorkflow(
        siteApprovers: PartialSiteApprover[],
        siteManagers: PartialSiteManager[],
    ): AuthJumpPolicyWorkflow {
        return new AuthJumpPolicyWorkflow(
            appConfigService,
            queryBus,
            commandBus,
            'transaction-1',
            'site-name',
            'site-key',
            siteApprovers,
            siteManagers,
            'customer-name',
            1,
        );
    }

    describe('getOrCreate (first creation)', () => {
        it('creates the policy with only site managers as approvalUserIds and an empty approvalEmailAddresses when no site approvers were ingested', async () => {
            const siteManagers = [buildSiteManager('manager-1', 'manager-1@example.com')];
            const workflow = buildWorkflow([], siteManagers);

            jest.spyOn(queryBus, 'execute').mockResolvedValue([]); // no existing policy
            const commandBusExecute = jest
                .spyOn(commandBus, 'execute')
                .mockResolvedValue({ id: 1 } as unknown as JumpPolicy);

            await workflow.getOrCreate(['101']);

            expect(commandBusExecute).toHaveBeenCalledTimes(1);
            const command = commandBusExecute.mock.calls[0]![0] as CreateJumpPolicyCommand;
            expect(command).toBeInstanceOf(CreateJumpPolicyCommand);
            expect(command.approvalEmailAddresses).toEqual([]);
            expect(command.approvalUserIds).toEqual(['101']);
            // Manager email must never leak into the approver-email list.
            expect(command.approvalEmailAddresses).not.toContain('manager-1@example.com');
            // Notifications legitimately still include the manager (separate from approvals).
            expect(command.notificationEmailAddresses).toEqual(['manager-1@example.com']);
        });

        it('creates the policy with explicit site approver emails plus site managers as approvalUserIds when site approvers were ingested', async () => {
            const siteManagers = [
                buildSiteManager('manager-1', 'manager-1@example.com'),
                buildSiteManager('manager-2', 'manager-2@example.com'),
            ];
            const siteApprovers = [buildSiteApprover('approver-1@example.com')];
            const workflow = buildWorkflow(siteApprovers, siteManagers);

            jest.spyOn(queryBus, 'execute').mockResolvedValue([]); // no existing policy
            const commandBusExecute = jest
                .spyOn(commandBus, 'execute')
                .mockResolvedValue({ id: 1 } as unknown as JumpPolicy);

            await workflow.getOrCreate(['101', '102']);

            const command = commandBusExecute.mock.calls[0]![0] as CreateJumpPolicyCommand;
            expect(command.approvalEmailAddresses).toEqual(['approver-1@example.com']);
            expect(command.approvalUserIds).toEqual(['101', '102']);
            // Never a manager's own email in the approver-email list.
            expect(command.approvalEmailAddresses).not.toContain('manager-1@example.com');
            expect(command.approvalEmailAddresses).not.toContain('manager-2@example.com');
            expect(command.notificationEmailAddresses).toEqual(
                expect.arrayContaining(['manager-1@example.com', 'manager-2@example.com', 'approver-1@example.com']),
            );
        });
    });

    describe('getOrCreate (idempotent re-ingestion)', () => {
        it('self-heals an existing policy whose approvalEmailAddresses still contains a stale site manager email (pre-fix state)', async () => {
            const siteManagers = [buildSiteManager('manager-1', 'manager-1@example.com')];
            const workflow = buildWorkflow([], siteManagers);

            const existingPolicy = {
                id: 5,
                displayName: 'CUSTOMER-NAME_SITE-NAME_SITE-KEY_AUTH',
                hasScheduledAccessRestriction: false,
                isSessionStartNotificationEnabled: true,
                isSessionEndNotificationEnabled: true,
                notificationDisplayName: 'SITE MANAGER CUSTOMER-NAME_SITE-NAME_SITE-KEY',
                isApprovalRequired: true,
                approvalMaxDurationInMinutes: 240,
                // Bug state: manager email leaked into approvalEmailAddresses, alongside their real userId.
                approvalEmailAddresses: ['manager-1@example.com'],
                approvalUserIds: ['101'],
                approvalDisplayName: 'SITE MANAGER CUSTOMER-NAME_SITE-NAME_SITE-KEY',
            } as unknown as JumpPolicy;

            jest.spyOn(queryBus, 'execute').mockResolvedValue([existingPolicy]);
            const modifiedPolicy = { ...existingPolicy, approvalEmailAddresses: [] } as unknown as JumpPolicy;
            const commandBusExecute = jest.spyOn(commandBus, 'execute').mockResolvedValue(modifiedPolicy);

            const result = await workflow.getOrCreate(['101']);

            expect(commandBusExecute).toHaveBeenCalledTimes(1);
            const command = commandBusExecute.mock.calls[0]![0] as ModifyJumpPolicyCommand;
            expect(command).toBeInstanceOf(ModifyJumpPolicyCommand);
            expect(command.approvalEmailAddresses).toEqual([]);
            // approvalUserIds is left alone here — SiteManagerWorkflow owns additions/removals for it.
            expect(command.approvalUserIds).toBeUndefined();
            expect(result).toBe(modifiedPolicy);
        });

        it('does not issue a modify call once the approver list has already converged', async () => {
            const siteManagers = [buildSiteManager('manager-1', 'manager-1@example.com')];
            const siteApprovers = [buildSiteApprover('approver-1@example.com')];
            const workflow = buildWorkflow(siteApprovers, siteManagers);

            const convergedPolicy = {
                id: 5,
                displayName: 'CUSTOMER-NAME_SITE-NAME_SITE-KEY_AUTH',
                hasScheduledAccessRestriction: false,
                isSessionStartNotificationEnabled: true,
                isSessionEndNotificationEnabled: true,
                notificationDisplayName: 'SITE MANAGER CUSTOMER-NAME_SITE-NAME_SITE-KEY',
                isApprovalRequired: true,
                approvalMaxDurationInMinutes: 240,
                approvalEmailAddresses: ['approver-1@example.com'],
                approvalUserIds: ['101'],
                approvalDisplayName: 'SITE MANAGER CUSTOMER-NAME_SITE-NAME_SITE-KEY',
            } as unknown as JumpPolicy;

            jest.spyOn(queryBus, 'execute').mockResolvedValue([convergedPolicy]);
            const commandBusExecute = jest.spyOn(commandBus, 'execute');

            const result = await workflow.getOrCreate(['101']);

            expect(commandBusExecute).not.toHaveBeenCalled();
            expect(result).toBe(convergedPolicy);
        });
    });
});
