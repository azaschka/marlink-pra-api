import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MonitoringRecordRepositoryService } from '../../repositories/services/monitoring-record-repository.service';
import { DeleteMonitoringRecordsCommand } from '../delete-monitoring-records.command';

@CommandHandler(DeleteMonitoringRecordsCommand)
export class DeleteMonitoringRecordsCommandHandler implements ICommandHandler<DeleteMonitoringRecordsCommand> {
    constructor(private readonly monitoringRecordRepositoryService: MonitoringRecordRepositoryService) {}

    public async execute(command: DeleteMonitoringRecordsCommand): Promise<void> {
        await this.monitoringRecordRepositoryService.deleteByDateBetween(
            command.creationDateFrom,
            command.creationDateTo,
        );
    }
}
