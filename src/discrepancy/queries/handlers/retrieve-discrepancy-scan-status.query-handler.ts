import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ScanStatusDtoOutput } from '../../dtos/outputs';
import { DiscrepancyScanStatusService } from '../../services/discrepancy-scan-status.service';
import { RetrieveDiscrepancyScanStatusQuery } from '../retrieve-discrepancy-scan-status.query';

@QueryHandler(RetrieveDiscrepancyScanStatusQuery)
export class RetrieveDiscrepancyScanStatusQueryHandler implements IQueryHandler<RetrieveDiscrepancyScanStatusQuery> {
    constructor(private readonly discrepancyScanStatusService: DiscrepancyScanStatusService) {}

    public execute(query: RetrieveDiscrepancyScanStatusQuery): Promise<ScanStatusDtoOutput> {
        // A NotFoundException becomes a rejection, as from an asynchronous handler.
        return Promise.resolve().then(() => this.discrepancyScanStatusService.get(query.tenantId, query.scanId));
    }
}
