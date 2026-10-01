import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DateUtility } from '../../../shared/utilities';
import { MonitoringRecordEntity } from '../../repositories/entities';
import { MonitoringRecordWriterService } from '../../services';
import { AddMonitoringRecordCommand } from '../add-monitoring-record.command';

@CommandHandler(AddMonitoringRecordCommand)
export class AddMonitoringRecordCommandHandler implements ICommandHandler<AddMonitoringRecordCommand> {
    constructor(private readonly monitoringRecordWriterService: MonitoringRecordWriterService) {}

    // Only queues the record; the request that triggered it does not wait for the database.
    public execute(command: AddMonitoringRecordCommand): Promise<void> {
        this.monitoringRecordWriterService.enqueue(
            MonitoringRecordEntity.createWithoutId(command.endpointPath, DateUtility.getCurrentUtcDate()),
        );

        return Promise.resolve();
    }
}
