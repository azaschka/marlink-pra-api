import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UuidUtility } from '../../shared/utilities';
import {
    CreateBeyondtrustInstanceCommand,
    DeleteBeyondtrustInstanceCommand,
    ModifyBeyondtrustInstanceCommand,
} from '../commands';
import { BillingType, BusinessUnit } from '../enums';
import { BeyondtrustInstance } from '../models';
import { RetrieveBeyondtrustInstanceByIdQuery, RetrieveBeyondtrustInstancesQuery } from '../queries';
import { BeyondtrustInstanceController } from './beyondtrust-instance.controller';

describe('BeyondtrustInstanceController', () => {
    let controller: BeyondtrustInstanceController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new BeyondtrustInstanceController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveBeyondtrustInstance', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as BeyondtrustInstance;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveBeyondtrustInstance(undefined, 1);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveBeyondtrustInstanceByIdQuery('uuid-123', 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveBeyondtrustInstances', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as BeyondtrustInstance[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveBeyondtrustInstances(undefined, {
                pageSize: 10,
                pageNumber: 1,
                name: 'beyondtrust-instance-1',
                oauth2TokenUrl: 'https://oauth2.example.com/token',
                apiBaseUrl: 'https://api.example.com',
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveBeyondtrustInstancesQuery(
                    'uuid-123',
                    10,
                    1,
                    'beyondtrust-instance-1',
                    'https://oauth2.example.com/token',
                    'https://api.example.com',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createBeyondtrustInstance', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as BeyondtrustInstance;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createBeyondtrustInstance(undefined, {
                name: 'beyondtrust-instance-1',
                authClientId: 'auth-client-id-1',
                authClientSecret: 'auth-client-secret-1',
                oauth2TokenUrl: 'https://oauth2.example.com/token',
                apiBaseUrl: 'https://api.example.com',
                billingType: BillingType.Asset,
                businessUnit: BusinessUnit.MC,
                cname: 'https://pra.example.com',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateBeyondtrustInstanceCommand(
                    'uuid-123',
                    'beyondtrust-instance-1',
                    'auth-client-id-1',
                    'auth-client-secret-1',
                    'https://oauth2.example.com/token',
                    'https://api.example.com',
                    BillingType.Asset,
                    BusinessUnit.MC,
                    'https://pra.example.com',
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyBeyondtrustInstance', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as BeyondtrustInstance;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyBeyondtrustInstance('uuid-123', 1, {
                name: 'beyondtrust-instance-1',
                authClientId: 'auth-client-id-1',
                authClientSecret: 'auth-client-secret-1',
                oauth2TokenUrl: 'https://oauth2.example.com/token',
                apiBaseUrl: 'https://api.example.com',
                billingType: BillingType.Asset,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyBeyondtrustInstanceCommand(
                    'uuid-123',
                    1,
                    'beyondtrust-instance-1',
                    'auth-client-id-1',
                    'auth-client-secret-1',
                    'https://oauth2.example.com/token',
                    'https://api.example.com',
                    BillingType.Asset,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteBeyondtrustInstance', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteBeyondtrustInstance('uuid-123', 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteBeyondtrustInstanceCommand('uuid-123', 1));
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
