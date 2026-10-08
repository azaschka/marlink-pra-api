import { ICommandHandler } from '@nestjs/cqrs';
import { RetentionService } from '../../services/retention.service';
import { EnforceRetentionCommand } from '../enforce-retention.command';
import { EnforceRetentionCommandHandler } from './enforce-retention.command-handler';

describe('EnforceRetentionCommandHandler', () => {
    it('runs the scheduled retention for every table and returns the reports', async () => {
        const reports = [{ table: 'pra_logs', status: 'completed', retentionDays: 90, finishedAt: 'x' }];
        const runScheduled = jest.fn().mockResolvedValue(reports);
        const handler: ICommandHandler<EnforceRetentionCommand> = new EnforceRetentionCommandHandler({
            runScheduled,
        } as unknown as RetentionService);

        await expect(handler.execute(new EnforceRetentionCommand('transaction-1'))).resolves.toBe(reports);
        expect(runScheduled).toHaveBeenCalledTimes(1);
    });

    it('passes a failure of the retention run on to the job', async () => {
        const runScheduled = jest.fn().mockRejectedValue(new Error('lock connection failed'));
        const handler: ICommandHandler<EnforceRetentionCommand> = new EnforceRetentionCommandHandler({
            runScheduled,
        } as unknown as RetentionService);

        await expect(handler.execute(new EnforceRetentionCommand('transaction-1'))).rejects.toThrow(
            'lock connection failed',
        );
    });
});
