import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MonitoringRecord } from '../../models';
import { MonitoringRecordRepositoryService } from '../../repositories/services/monitoring-record-repository.service';
import { RetrieveMonitoringRecordsQuery } from '../retrieve-monitoring-records.query';

@QueryHandler(RetrieveMonitoringRecordsQuery)
export class RetrieveMonitoringRecordsQueryHandler implements IQueryHandler<RetrieveMonitoringRecordsQuery> {
    constructor(private readonly monitoringRecordRepositoryService: MonitoringRecordRepositoryService) {}

    public async execute(query: RetrieveMonitoringRecordsQuery): Promise<MonitoringRecord[]> {
        return await this.monitoringRecordRepositoryService.findByDateBetween(
            query.pageNumber,
            query.pageSize,
            query.creationDateFrom,
            query.creationDateTo,
            query.sortOrderType,
        );
    }
}
