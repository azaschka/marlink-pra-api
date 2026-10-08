import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RetentionRunReport, RetentionService } from '../../services/retention.service';
import { EnforceRetentionCommand } from '../enforce-retention.command';

@CommandHandler(EnforceRetentionCommand)
export class EnforceRetentionCommandHandler implements ICommandHandler<EnforceRetentionCommand> {
    constructor(private readonly retentionService: RetentionService) {}

    // The command carries only the transaction id, which the system log records for the run.
    public execute(): Promise<RetentionRunReport[]> {
        return this.retentionService.runScheduled();
    }
}
