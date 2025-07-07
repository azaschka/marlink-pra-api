import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpPolicyCommand, DeleteJumpPolicyCommand, ModifyJumpPolicyCommand } from '../commands';
import {
    ApprovalApproverScopeType,
    ApprovalScopeType,
    SimultaneousJumpsRdpType,
    SimultaneousJumpsType,
} from '../enums';
import { JumpPolicy } from '../models';
import { RetrieveJumpPoliciesQuery } from '../queries';
import { JumpPolicyController } from './jump-policy.controller';

describe('JumpPolicyController', () => {
    let controller: JumpPolicyController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpPolicyController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpPolicies', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as JumpPolicy[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpPolicies(undefined, {
                pageSize: 10,
                pageNumber: 1,
                codeName: 'jump-policy-1',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpPoliciesQuery('uuid-123', 10, 1, 'jump-policy-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpPolicy;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpPolicy(undefined, {
                displayName: 'jump policy 1',
                codeName: 'jump-policy-1',
                description: 'A test jump policy',
                hasScheduledAccessRestriction: true,
                simultaneousJumpsType: SimultaneousJumpsType.Disallow,
                doesSimultaneousJumpBehaviorApplyToCopies: false,
                simultaneousJumpsRdpType: SimultaneousJumpsRdpType.Global,
                shouldForceRemoveUsersWhenScheduleDisallows: false,
                isTicketIdRequired: false,
                isTwoFactorChallengeRequired: true,
                isSessionStartNotificationEnabled: true,
                isSessionEndNotificationEnabled: false,
                notificationEmailAddresses: ['email-1@example.com'],
                notificationDisplayName: 'Jump Policy Notifications',
                notificationEmailLanguage: 'en',
                isApprovalRequired: false,
                approvalMaxDurationInMinutes: 60,
                approvalScopeType: ApprovalScopeType.Requestor,
                approvalEmailAddresses: ['email-2@example.com'],
                approvalUserIds: ['user-1'],
                approvalTeamIds: ['team-1'],
                approvalDisplayName: 'Jump Policy Approval',
                approvalEmailLanguage: 'en',
                approvalApproverScopeType: ApprovalApproverScopeType.Anyone,
                isRecordingsDisabled: true,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpPolicyCommand(
                    'uuid-123',
                    'jump policy 1',
                    'jump-policy-1',
                    'A test jump policy',
                    true,
                    SimultaneousJumpsType.Disallow,
                    false,
                    SimultaneousJumpsRdpType.Global,
                    false,
                    false,
                    true,
                    true,
                    false,
                    ['email-1@example.com'],
                    'Jump Policy Notifications',
                    'en',
                    false,
                    60,
                    ApprovalScopeType.Requestor,
                    ['email-2@example.com'],
                    ['user-1'],
                    ['team-1'],
                    'Jump Policy Approval',
                    'en',
                    ApprovalApproverScopeType.Anyone,
                    true,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyJumpPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpPolicy;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyJumpPolicy('uuid-100', 1, {
                displayName: 'jump policy 1',
                codeName: 'jump-policy-1',
                description: 'A test jump policy',
                hasScheduledAccessRestriction: true,
                simultaneousJumpsType: SimultaneousJumpsType.Disallow,
                doesSimultaneousJumpBehaviorApplyToCopies: false,
                simultaneousJumpsRdpType: SimultaneousJumpsRdpType.Global,
                shouldForceRemoveUsersWhenScheduleDisallows: true,
                isTicketIdRequired: false,
                isTwoFactorChallengeRequired: false,
                isSessionStartNotificationEnabled: false,
                isSessionEndNotificationEnabled: true,
                notificationEmailAddresses: ['email-1@example.com'],
                notificationDisplayName: 'Jump Policy Notifications',
                notificationEmailLanguage: 'en',
                isApprovalRequired: false,
                approvalMaxDurationInMinutes: 60,
                approvalScopeType: ApprovalScopeType.Requestor,
                approvalEmailAddresses: ['email-2@example.com'],
                approvalUserIds: ['user-1'],
                approvalTeamIds: ['team-1'],
                approvalDisplayName: 'Jump Policy Approval',
                approvalEmailLanguage: 'en',
                approvalApproverScopeType: ApprovalApproverScopeType.Anyone,
                isRecordingsDisabled: false,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyJumpPolicyCommand(
                    'uuid-100',
                    1,
                    'jump policy 1',
                    'jump-policy-1',
                    'A test jump policy',
                    true,
                    SimultaneousJumpsType.Disallow,
                    false,
                    SimultaneousJumpsRdpType.Global,
                    true,
                    false,
                    false,
                    false,
                    true,
                    ['email-1@example.com'],
                    'Jump Policy Notifications',
                    'en',
                    false,
                    60,
                    ApprovalScopeType.Requestor,
                    ['email-2@example.com'],
                    ['user-1'],
                    ['team-1'],
                    'Jump Policy Approval',
                    'en',
                    ApprovalApproverScopeType.Anyone,
                    false,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpPolicy(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpPolicyCommand('uuid-123', 1));
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
