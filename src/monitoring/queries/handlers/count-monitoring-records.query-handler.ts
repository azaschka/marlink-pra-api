import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MonitoringRecordRepositoryService } from '../../repositories/services/monitoring-record-repository.service';
import { CountMonitoringRecordsQuery } from '../count-monitoring-records.query';

@QueryHandler(CountMonitoringRecordsQuery)
export class CountMonitoringRecordsQueryHandler implements IQueryHandler<CountMonitoringRecordsQuery> {
    constructor(private readonly monitoringRecordRepositoryService: MonitoringRecordRepositoryService) {}

    public async execute(query: CountMonitoringRecordsQuery): Promise<number> {
        return await this.monitoringRecordRepositoryService.countByDateBetween(
            query.creationDateFrom,
            query.creationDateTo,
        );
    }
}
