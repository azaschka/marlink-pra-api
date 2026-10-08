import { AddMonitoringRecordCommand } from '../add-monitoring-record.command';
import { MonitoringRecordWriterService } from '../../services';
import { AddMonitoringRecordCommandHandler } from './add-monitoring-record.command-handler';

describe('AddMonitoringRecordCommandHandler', () => {
    it('queues the record with the request time instead of writing it in the request path', async () => {
        const writer = { enqueue: jest.fn() };
        const handler = new AddMonitoringRecordCommandHandler(writer as unknown as MonitoringRecordWriterService);

        await handler.execute(new AddMonitoringRecordCommand('tx', '/sites'));

        expect(writer.enqueue).toHaveBeenCalledWith(
            expect.objectContaining({ endpointPath: '/sites', creationDate: expect.any(Date) as Date }),
        );
    });
});
