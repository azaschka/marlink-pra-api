import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { UuidUtility } from '../../shared/utilities';
import { CreateBeyondtrustInstanceBackupCommand } from '../commands';
import { BeyondtrustInstanceBackup, BeyondtrustInstanceBackupContent } from '../models';
import {
    RetrieveBeyondtrustInstanceBackupByIdQuery,
    RetrieveBeyondtrustInstanceBackupContentQuery,
    RetrieveBeyondtrustInstanceBackupsQuery,
} from '../queries';
import { BeyondtrustInstanceBackupController } from './beyondtrust-instance-backup.controller';

describe('BeyondtrustInstanceBackupController', () => {
    let controller: BeyondtrustInstanceBackupController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new BeyondtrustInstanceBackupController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveBeyondtrustInstanceBackups', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as BeyondtrustInstanceBackup[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveBeyondtrustInstanceBackups(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveBeyondtrustInstanceBackupsQuery('uuid-123', 10, 1, 123),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createBeyondtrustInstanceBackup', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as BeyondtrustInstanceBackup;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createBeyondtrustInstanceBackup(undefined, 123, {
                password: 'password-1',
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateBeyondtrustInstanceBackupCommand('uuid-123', 123, 'password-1'),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveBeyondtrustInstanceBackup', () => {
        it('should execute the query bus with the correct parameters and return the backup', async () => {
            const expectedResult = { id: 456 } as BeyondtrustInstanceBackup;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveBeyondtrustInstanceBackup(undefined, 123, 456);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveBeyondtrustInstanceBackupByIdQuery('uuid-123', 123, 456),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveBeyondtrustInstanceBackupContent', () => {
        it('should execute the query bus with the correct parameters and return the backup content', async () => {
            const expectedResult: BeyondtrustInstanceBackupContent = {
                filename: 'file.nsb',
                buffer: Buffer.from('backup content'),
            };
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);
            const mockRes = mockResponse();

            await controller.retrieveBeyondtrustInstanceBackupContent(undefined, 123, 456, mockRes);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveBeyondtrustInstanceBackupContentQuery('uuid-123', 123, 456),
            );
            expect(mockRes.send).toHaveBeenCalledWith(expectedResult.buffer);
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

function mockResponse(): Response {
    const res: Partial<Response> = {};
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);

    return res as Response;
}
