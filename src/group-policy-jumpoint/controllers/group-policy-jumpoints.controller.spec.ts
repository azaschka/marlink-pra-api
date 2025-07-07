import { CommandBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { AddJumpointToGroupPolicyCommand, RemoveJumpointFromGroupPolicyCommand } from '../commands';
import { GroupPolicyJumpoint } from '../models';
import { GroupPolicyJumpointsController } from './group-policy-jumpoints.controller';

describe('GroupPolicyJumpointsController', () => {
    let controller: GroupPolicyJumpointsController;
    let commandBus: CommandBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        controller = new GroupPolicyJumpointsController(commandBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('addJumpointToGroupPolicy', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as GroupPolicyJumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.addJumpointToGroupPolicy(undefined, 1, {
                jumpointId: 2,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new AddJumpointToGroupPolicyCommand('uuid-123', 1, 2));
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeJumpointFromGroupPolicy', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(undefined);

            await controller.removeJumpointFromGroupPolicy(undefined, 1, 2);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new RemoveJumpointFromGroupPolicyCommand('uuid-123', 1, 2),
            );
        });
    });
});

function mockCommandBus() {
    const commandBus = {} as CommandBus;
    commandBus.execute = jest.fn();

    return commandBus;
}
