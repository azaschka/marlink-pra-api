import { BeforeApplicationShutdown, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { name as serviceName } from '../../../package.json';
import { DefaultAppConfig } from '../../app-config/consts';
import { BufferedEntityWriter, BufferedEntityWriterStats } from '../../core/services/buffered-entity-writer';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { LogActionType } from '../enums';
import { LogEntity } from '../repositories/entities';

/**
 * Owns the bounded, asynchronous writer for pra_logs. The system log is treated as an operational log:
 * under overload new entries are dropped, counted and documented by a LOG_ENTRIES_DROPPED entry.
 */
@Injectable()
export class LogWriterService implements OnApplicationBootstrap, BeforeApplicationShutdown {
    public static readonly DROPPED_ENTRIES_ACTION_NAME = 'LOG_ENTRIES_DROPPED';

    private readonly writer: BufferedEntityWriter<LogEntity>;

    constructor(dataSource: DataSource, resourceReportRegistry: ResourceReportRegistry) {
        this.writer = new BufferedEntityWriter<LogEntity>(
            dataSource,
            LogEntity,
            { name: 'pra_logs', ...DefaultAppConfig.logWriter },
            (droppedEntries, firstDroppedAt, lastDroppedAt) =>
                LogEntity.createWithoutId(
                    serviceName,
                    LogActionType.System,
                    LogWriterService.DROPPED_ENTRIES_ACTION_NAME,
                    'n/a',
                    undefined,
                    new Date(),
                    JSON.stringify({
                        droppedEntries,
                        firstDroppedAt: firstDroppedAt.toISOString(),
                        lastDroppedAt: lastDroppedAt.toISOString(),
                        reason: 'The system log buffer was full.',
                    }),
                ),
        );
        resourceReportRegistry.register('logWriter', () => ({ ...this.writer.stats() }));
    }

    public onApplicationBootstrap(): void {
        this.writer.start();
    }

    // Runs before TypeORM closes the DataSource in onApplicationShutdown.
    public async beforeApplicationShutdown(): Promise<void> {
        await this.writer.stop();
    }

    public enqueue(entry: LogEntity): void {
        this.writer.enqueue(entry);
    }

    public stats(): BufferedEntityWriterStats {
        return this.writer.stats();
    }
}
