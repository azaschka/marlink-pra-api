import { Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AxiosResponse } from 'axios';
import { Response } from 'express';
import { Readable, Writable } from 'stream';
import { UuidUtility } from '../../shared/utilities';
import { CreateJumpointCommand, DeleteJumpointCommand, ModifyJumpointCommand } from '../commands';
import { JumpointPlatformType, JzpClientAddressRestrictionsType } from '../enums';
import { Jumpoint, JumpointNode } from '../models';
import {
    RetrieveJumpointByIdQuery,
    RetrieveJumpointInstallerQuery,
    RetrieveJumpointNodesQuery,
    RetrieveJumpointsQuery,
} from '../queries';
import { JumpointController } from './jumpoint.controller';

describe('JumpointController', () => {
    let controller: JumpointController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpointController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpoint', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Jumpoint;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpoint(undefined, 123, 1);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveJumpointByIdQuery('uuid-123', 123, 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveJumpoints', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as Jumpoint[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpoints(undefined, 123, {
                pageSize: 10,
                pageNumber: 1,
                name: 'jumpoint-1',
                codeName: 'code-1',
                namePatterns: ['jumpoint%'],
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpointsQuery(
                    'uuid-123',
                    123,
                    10,
                    1,
                    'jumpoint-1',
                    undefined,
                    undefined,
                    undefined,
                    'code-1',
                    ['jumpoint%'],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpoint', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Jumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpoint(undefined, 123, {
                name: 'Jumpoint 1',
                platformType: JumpointPlatformType.LinuxX86,
                codeName: 'J1',
                comments: 'Test Jumpoint 1',
                isEnabled: true,
                isClustered: false,
                isShellJumpEnabled: true,
                externalJumpItemNetworkId: 'ext-1',
                isProtocolTunnelEnabled: true,
                rdpServiceAccountId: 1,
                managedIpRanges: [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                isJzpEnabled: true,
                jzpProxyHostname: 'proxy.example.com',
                jzpProxyPort: 8080,
                isJzpHttpGetAllowed: true,
                jzpClientAddressRestrictionsType: JzpClientAddressRestrictionsType.AllowAll,
                jzpRestrictedIps: ['192.168.1.100'],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpointCommand(
                    'uuid-123',
                    123,
                    'Jumpoint 1',
                    JumpointPlatformType.LinuxX86,
                    'J1',
                    'Test Jumpoint 1',
                    true,
                    false,
                    true,
                    'ext-1',
                    true,
                    1,
                    [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                    true,
                    'proxy.example.com',
                    8080,
                    true,
                    JzpClientAddressRestrictionsType.AllowAll,
                    ['192.168.1.100'],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('modifyJumpoint', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as Jumpoint;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.modifyJumpoint(undefined, 123, 1, {
                name: 'Jumpoint 1',
                codeName: 'J1',
                comments: 'Test Jumpoint 1',
                isEnabled: true,
                isShellJumpEnabled: true,
                externalJumpItemNetworkId: 'ext-1',
                isProtocolTunnelEnabled: true,
                rdpServiceAccountId: 1,
                managedIpRanges: [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                isJzpEnabled: true,
                jzpProxyHostname: 'proxy.example.com',
                jzpProxyPort: 8080,
                isJzpHttpGetAllowed: true,
                jzpClientAddressRestrictionsType: JzpClientAddressRestrictionsType.AllowAll,
                jzpRestrictedIps: ['192.168.1.100'],
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new ModifyJumpointCommand(
                    'uuid-123',
                    123,
                    1,
                    'Jumpoint 1',
                    'J1',
                    'Test Jumpoint 1',
                    true,
                    true,
                    'ext-1',
                    true,
                    1,
                    [{ start: '192.168.1.0/24', end: '192.168.1.255' }],
                    true,
                    'proxy.example.com',
                    8080,
                    true,
                    JzpClientAddressRestrictionsType.AllowAll,
                    ['192.168.1.100'],
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('deleteJumpoint', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpoint(undefined, 123, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpointCommand('uuid-123', 123, 1));
        });
    });

    describe('retrieveJumpointNodes', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [{}] as JumpointNode[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpointNodes(undefined, 123, 1, {
                pageNumber: 5,
                pageSize: 100,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveJumpointNodesQuery('uuid-123', 123, 100, 5, 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveJumpointInstaller', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-type': 'application/octet-stream',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-disposition': 'attachment; filename=installer.exe',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'content-length': '12345',
                },
                data: Readable.from([Buffer.from('installer-'), Buffer.from('bytes')]),
            } as unknown as AxiosResponse<NodeJS.ReadableStream>;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);
            const res = mockResponse();
            const setHeaderMethod = jest.spyOn(res, 'setHeader');

            await controller.retrieveJumpointInstaller('uuid-100', 100, 123, res);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveJumpointInstallerQuery('uuid-100', 100, 123));
            expect(setHeaderMethod).toHaveBeenCalledWith('Content-Type', expectedResult.headers['content-type']);
            expect(setHeaderMethod).toHaveBeenCalledWith(
                'Content-Disposition',
                expectedResult.headers['content-disposition'],
            );
            expect(setHeaderMethod).toHaveBeenCalledWith('Content-Length', expectedResult.headers['content-length']);
            expect(res.body()).toBe('installer-bytes');
        });

        it('closes the client connection and logs, instead of leaving it open, when the download breaks', async () => {
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            const body = new Readable({ read: () => undefined });
            body.push('first bytes');
            jest.spyOn(queryBus, 'execute').mockResolvedValue({ headers: {}, data: body });
            const res = mockResponse();
            setTimeout(() => body.destroy(new Error('jumpoint installer 123: no data for 120000 ms')), 20);

            await controller.retrieveJumpointInstaller('uuid-100', 100, 123, res);

            expect(res.body()).toBe('first bytes');
            expect(res.destroyed).toBe(true);
            expect((res.status as jest.Mock).mock.calls).toHaveLength(0); // the headers are already sent then
            expect(warn).toHaveBeenCalledWith(
                'Jumpoint installer download ended early: jumpoint installer 123: no data for 120000 ms',
            );
            warn.mockRestore();
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

/** A writable response, so that the download body is really forwarded (pipeline). */
function mockResponse(): Response & { body: () => string } {
    const chunks: Buffer[] = [];
    const res = new Writable({
        write(chunk: Buffer, _encoding, callback) {
            chunks.push(chunk);
            callback();
        },
    }) as unknown as Response & { body: () => string };
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.body = () => Buffer.concat(chunks).toString();

    return res;
}
