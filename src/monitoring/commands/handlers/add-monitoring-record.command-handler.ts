import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MonitoringRecordEntity } from '../../repositories/entities';
import { MonitoringRecordRepositoryService } from '../../repositories/services/monitoring-record-repository.service';
import { AddMonitoringRecordCommand } from '../add-monitoring-record.command';

@CommandHandler(AddMonitoringRecordCommand)
export class AddMonitoringRecordCommandHandler implements ICommandHandler<AddMonitoringRecordCommand> {
    constructor(private readonly monitoringRecordRepositoryService: MonitoringRecordRepositoryService) {}

    public async execute(command: AddMonitoringRecordCommand): Promise<void> {
        await this.monitoringRecordRepositoryService.create(
            MonitoringRecordEntity.createWithoutId(command.endpointPath),
        );
    }
}
