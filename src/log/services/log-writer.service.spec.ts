import { DataSource } from 'typeorm';
import { ResourceReportRegistry } from '../../observability/services/resource-report-registry.service';
import { LogActionType } from '../enums';
import { LogEntity } from '../repositories/entities';
import { LogWriterService } from './log-writer.service';

describe('LogWriterService', () => {
    it('contributes the live writer figures to the resource report', () => {
        const registry = new ResourceReportRegistry();
        const service = new LogWriterService({} as DataSource, registry);

        expect(registry.collect()).toEqual({ logWriter: { buffered: 0, written: 0, dropped: 0, rejected: 0 } });

        service.enqueue(
            LogEntity.createWithoutId('pra-api', LogActionType.Command, 'cmd', 'tx', undefined, new Date(), '{}'),
        );

        expect(registry.collect()).toEqual({ logWriter: { buffered: 1, written: 0, dropped: 0, rejected: 0 } });
    });
});
