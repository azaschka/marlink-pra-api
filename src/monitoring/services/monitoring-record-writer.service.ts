import { BeforeApplicationShutdown, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DefaultAppConfig } from '../../app-config/consts';
import { BufferedEntityWriter, BufferedEntityWriterStats } from '../../core/services/buffered-entity-writer';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { MonitoringRecordEntity } from '../repositories/entities';

/**
 * Owns the bounded, asynchronous writer for pra_monitorings. Monitoring records are request statistics:
 * under overload new records are dropped and counted, business requests never wait for them.
 */
@Injectable()
export class MonitoringRecordWriterService implements OnApplicationBootstrap, BeforeApplicationShutdown {
    private readonly writer: BufferedEntityWriter<MonitoringRecordEntity>;

    constructor(dataSource: DataSource, resourceReportRegistry: ResourceReportRegistry) {
        this.writer = new BufferedEntityWriter<MonitoringRecordEntity>(dataSource, MonitoringRecordEntity, {
            name: 'pra_monitorings',
            ...DefaultAppConfig.logWriter,
        });
        resourceReportRegistry.register('monitoringWriter', () => ({ ...this.writer.stats() }));
    }

    public onApplicationBootstrap(): void {
        this.writer.start();
    }

    // Runs before TypeORM closes the DataSource in onApplicationShutdown.
    public async beforeApplicationShutdown(): Promise<void> {
        await this.writer.stop();
    }

    public enqueue(record: MonitoringRecordEntity): void {
        this.writer.enqueue(record);
    }

    public stats(): BufferedEntityWriterStats {
        return this.writer.stats();
    }
}
