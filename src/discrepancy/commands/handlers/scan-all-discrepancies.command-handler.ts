import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ManualDiscrepancyScanService } from '../../services/manual-discrepancy-scan.service';
import { ScanAllDiscrepanciesCommand } from '../scan-all-discrepancies.command';

@CommandHandler(ScanAllDiscrepanciesCommand)
export class ScanAllDiscrepanciesCommandHandler implements ICommandHandler<ScanAllDiscrepanciesCommand> {
    constructor(private readonly manualDiscrepancyScanService: ManualDiscrepancyScanService) {}

    public execute(command: ScanAllDiscrepanciesCommand): Promise<{ scanId: string }> {
        return Promise.resolve().then(() =>
            this.manualDiscrepancyScanService.start(command.transactionId, command.tenantId),
        );
    }
}
