import { ScanAllDiscrepanciesCommandHandler } from './scan-all-discrepancies.command-handler';
import { ScanDiscrepancyCommandHandler } from './scan-discrepancy.command-handler';
import { SyncAllExternalDiscrepanciesCommandHandler } from './sync-all-external-discrepancies.command-handler';
import { SyncDiscrepancyCommandHandler } from './sync-discrepancy.command-handler';

export const CommandHandlers = [
    ScanAllDiscrepanciesCommandHandler,
    ScanDiscrepancyCommandHandler,
    SyncDiscrepancyCommandHandler,
    SyncAllExternalDiscrepanciesCommandHandler,
];
