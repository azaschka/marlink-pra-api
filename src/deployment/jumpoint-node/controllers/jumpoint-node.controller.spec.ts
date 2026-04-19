import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { UuidUtility } from '../../../shared/utilities';
import {
    ApproveJumpointNodeCommand,
    CreateJumpointNodeCommand,
    CreateJumpointNodeServiceCommand,
    DeleteJumpointNodeCommand,
    DownloadJumpointNodeIsoCommand,
} from '../commands';
import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType, JumpointNodeServiceType } from '../enums';
import { JumpointNode, JumpointNodeIsoContent } from '../models';
import {
    RetrieveJumpointNodeByIdQuery,
    RetrieveJumpointNodeIsoByIdQuery,
    RetrieveJumpointNodesQuery,
} from '../queries';
import { JumpointNodeController } from './jumpoint-node.controller';

describe('JumpointController', () => {
    let controller: JumpointNodeController;
    let commandBus: CommandBus;
    let queryBus: QueryBus;

    beforeEach(() => {
        commandBus = mockCommandBus();
        queryBus = mockQueryBus();
        controller = new JumpointNodeController(commandBus, queryBus);

        // Mocking UuidUtility.generate to return a fixed UUID
        UuidUtility.generate = jest.fn(() => 'uuid-123');
    });

    describe('retrieveJumpointNode', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpointNode;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpointNode(undefined, 123);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveJumpointNodeByIdQuery('uuid-123', 123));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveJumpointNodes', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = [] as JumpointNode[];
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.retrieveJumpointNodes(undefined, {
                pageSize: 10,
                pageNumber: 1,
                certname: 'cert-1',
                businessUnits: [JumpointNodeBusinessUnit.MC],
                siteKey: 'site-1',
                customerName: 'customer-1',
                puppetServerDomain: 'puppet-1',
                hypervisorId: 'hypervisor-1',
                hypervisorType: JumpointNodeHypervisorType.OneEdge,
                vmId: 123,
            });

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(
                new RetrieveJumpointNodesQuery(
                    'uuid-123',
                    10,
                    1,
                    'cert-1',
                    [JumpointNodeBusinessUnit.MC],
                    'site-1',
                    'customer-1',
                    'puppet-1',
                    'hypervisor-1',
                    JumpointNodeHypervisorType.OneEdge,
                    123,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpointNode', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpointNode;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpointNode(undefined, {
                siteKey: 'site-1',
                businessUnit: JumpointNodeBusinessUnit.MC,
                hypervisorId: 'hypervisor-1',
                hypervisorType: JumpointNodeHypervisorType.OneEdge,
                vmId: 123,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpointNodeCommand(
                    'uuid-123',
                    'site-1',
                    JumpointNodeBusinessUnit.MC,
                    'hypervisor-1',
                    JumpointNodeHypervisorType.OneEdge,
                    123,
                ),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('createJumpointNodeService', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpointNode;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.createJumpointNodeService(undefined, 1, {
                serviceType: JumpointNodeServiceType.Pra,
            });

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(
                new CreateJumpointNodeServiceCommand('uuid-123', 1, JumpointNodeServiceType.Pra),
            );
            expect(result).toBe(expectedResult);
        });
    });

    describe('approveJumpointNode', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpointNode;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.approveJumpointNode(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new ApproveJumpointNodeCommand('uuid-123', 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('deployJumpointNode', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const commandBusExecuteSpy = jest
                .spyOn(commandBus, 'execute')
                .mockResolvedValueOnce({ id: 1 } as JumpointNode)
                .mockResolvedValueOnce({ id: 1, serviceType: JumpointNodeServiceType.Pra } as JumpointNode)
                .mockResolvedValueOnce({
                    id: 1,
                    serviceType: JumpointNodeServiceType.Pra,
                    hasApproval: true,
                } as JumpointNode)
                .mockResolvedValueOnce({
                    id: 1,
                    serviceType: JumpointNodeServiceType.Pra,
                    hasApproval: true,
                    isoFilePath: '/jumpoint/node/iso/cert-1.iso',
                } as JumpointNode);

            const result = await controller.deployJumpointNode(undefined, {
                siteKey: 'site-1',
                businessUnit: JumpointNodeBusinessUnit.MC,
                hypervisorId: 'hypervisor-1',
                hypervisorType: JumpointNodeHypervisorType.OneEdge,
                vmId: 123,
            });

            expect(commandBusExecuteSpy).toHaveBeenNthCalledWith(
                1,
                new CreateJumpointNodeCommand(
                    'uuid-123',
                    'site-1',
                    JumpointNodeBusinessUnit.MC,
                    'hypervisor-1',
                    JumpointNodeHypervisorType.OneEdge,
                    123,
                ),
            );
            expect(commandBusExecuteSpy).toHaveBeenNthCalledWith(
                2,
                new CreateJumpointNodeServiceCommand('uuid-123', 1, JumpointNodeServiceType.Pra),
            );
            expect(commandBusExecuteSpy).toHaveBeenNthCalledWith(3, new ApproveJumpointNodeCommand('uuid-123', 1));
            expect(commandBusExecuteSpy).toHaveBeenNthCalledWith(4, new DownloadJumpointNodeIsoCommand('uuid-123', 1));
            expect(result).toStrictEqual({
                id: 1,
                serviceType: JumpointNodeServiceType.Pra,
                hasApproval: true,
                isoFilePath: '/jumpoint/node/iso/cert-1.iso',
            });
        });
    });

    describe('downloadJumpointNodeIso', () => {
        it('should execute the command bus with the correct parameters and return the result', async () => {
            const expectedResult = {} as JumpointNode;
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute').mockResolvedValue(expectedResult);

            const result = await controller.downloadJumpointNodeIso(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DownloadJumpointNodeIsoCommand('uuid-123', 1));
            expect(result).toBe(expectedResult);
        });
    });

    describe('retrieveJumpointNodeIso', () => {
        it('should execute the query bus with the correct parameters and return the result', async () => {
            const expectedResult = {
                buffer: {
                    length: 12345,
                },
                filename: 'installer.iso',
            } as JumpointNodeIsoContent;
            const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(expectedResult);
            const res = mockResponse();
            const setHeaderMethod = jest.spyOn(res, 'set');

            await controller.retrieveJumpointNodeIso('uuid-100', 123, res);

            expect(queryBusExecuteSpy).toHaveBeenCalledWith(new RetrieveJumpointNodeIsoByIdQuery('uuid-100', 123));
            expect(setHeaderMethod).toHaveBeenCalledWith({
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/x-iso9660-image',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Disposition': `attachment; filename="${expectedResult.filename}"`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Length': expectedResult.buffer.length,
            });
        });
    });

    describe('deleteJumpointNode', () => {
        it('should execute the command bus with the correct parameters', async () => {
            const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

            await controller.deleteJumpointNode(undefined, 1);

            expect(commandBusExecuteSpy).toHaveBeenCalledWith(new DeleteJumpointNodeCommand('uuid-123', 1));
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
    res.setHeader = jest.fn().mockReturnValue(res);

    return res as Response;
}
