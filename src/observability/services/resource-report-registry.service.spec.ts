import { ResourceReportRegistry } from './resource-report-registry.service';

describe('ResourceReportRegistry', () => {
    it('collects the figures of every contributor under its name', () => {
        const registry = new ResourceReportRegistry();
        registry.register('logWriter', () => ({ buffered: 3, dropped: 0 }));
        registry.register('scans', () => ({ running: 1 }));

        expect(registry.collect()).toEqual({ logWriter: { buffered: 3, dropped: 0 }, scans: { running: 1 } });
    });

    it('isolates a failing contributor', () => {
        const registry = new ResourceReportRegistry();
        registry.register('broken', () => {
            throw new Error('not initialised');
        });
        registry.register('logWriter', () => ({ buffered: 0 }));

        expect(registry.collect()).toEqual({ broken: { error: 'not initialised' }, logWriter: { buffered: 0 } });
    });

    it('keeps one contributor per name', () => {
        const registry = new ResourceReportRegistry();
        registry.register('logWriter', () => ({ buffered: 1 }));
        registry.register('logWriter', () => ({ buffered: 2 }));

        expect(registry.collect()).toEqual({ logWriter: { buffered: 2 } });
    });
});
