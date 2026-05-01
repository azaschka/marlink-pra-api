import { QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import { SessionPolicy } from '../models';
import { RetrieveSessionPoliciesQuery } from '../queries';
import { SessionPolicyController } from './session-policy.controller';

describe('SessionPolicyController', () => {
    let controller: SessionPolicyController;
    let queryBus: QueryBus;

    beforeEach(() => {
        queryBus = mockQueryBus();
        controller = new SessionPolicyController(queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveSessionPolicies', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as SessionPolicy[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveSessionPolicies(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                displayName: 'session-policy-1',
                codeName: 'session-policy-code-1',
                codeNamePatterns: ['session-policy-code%'],
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveSessionPoliciesQuery('uuid-123', 123, 10, 1, 'session-policy-1', 'session-policy-code-1', [
                    'session-policy-code%',
                ]),
            );
            expect(result).toStrictEqual(expectedResult);
        });
    });
});

function mockQueryBus() {
    const queryBus = {} as QueryBus;
    queryBus.execute = jest.fn();

    return queryBus;
}
