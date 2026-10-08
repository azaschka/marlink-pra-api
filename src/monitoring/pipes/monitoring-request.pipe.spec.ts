import { ArgumentMetadata } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { AddMonitoringRecordCommand } from '../commands';
import { MonitoringRequestPipe } from './monitoring-request.pipe';

describe('MonitoringRequestPipe', () => {
    const query: ArgumentMetadata = { type: 'query' };
    const param: ArgumentMetadata = { type: 'param' };
    const body: ArgumentMetadata = { type: 'body' };

    function createPipe(request: Request) {
        const commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
        return { pipe: new MonitoringRequestPipe(request, commandBus as unknown as CommandBus), commandBus };
    }

    it('records a request once, even when several handler arguments pass through the pipe', async () => {
        const request = { headers: {}, path: '/sites/1' } as unknown as Request;
        const { pipe, commandBus } = createPipe(request);

        await pipe.transform('1', param);
        await pipe.transform({}, query);
        await pipe.transform({}, body);

        expect(commandBus.execute).toHaveBeenCalledTimes(1);
        expect(commandBus.execute).toHaveBeenCalledWith(expect.any(AddMonitoringRecordCommand));
    });

    it('records each request separately', async () => {
        const first = createPipe({ headers: {}, path: '/a' } as unknown as Request);
        const second = createPipe({ headers: {}, path: '/b' } as unknown as Request);

        await first.pipe.transform({}, query);
        await second.pipe.transform({}, query);

        expect(first.commandBus.execute).toHaveBeenCalledTimes(1);
        expect(second.commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('ignores custom parameter decorators and returns the value unchanged', async () => {
        const { pipe, commandBus } = createPipe({ headers: {}, path: '/a' } as unknown as Request);

        await expect(pipe.transform('tx', { type: 'custom' })).resolves.toBe('tx');
        expect(commandBus.execute).not.toHaveBeenCalled();
    });
});
