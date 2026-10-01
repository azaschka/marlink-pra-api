import { DataSource } from 'typeorm';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { MonitoringRecordEntity } from '../repositories/entities';
import { MonitoringRecordWriterService } from './monitoring-record-writer.service';

describe('MonitoringRecordWriterService', () => {
    it('contributes the live writer figures to the resource report', () => {
        const registry = new ResourceReportRegistry();
        const service = new MonitoringRecordWriterService({} as DataSource, registry);

        service.enqueue(MonitoringRecordEntity.createWithoutId('/sites', new Date()));

        expect(registry.collect()).toEqual({
            monitoringWriter: { buffered: 1, written: 0, dropped: 0, rejected: 0 },
        });
    });
});
