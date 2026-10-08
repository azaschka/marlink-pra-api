import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { StorageHealthCheck } from './storage.health-check';

describe('StorageHealthCheck', () => {
    let directory: string;

    beforeAll(() => {
        directory = mkdtempSync(join(tmpdir(), 'storage-check-'));
    });

    afterAll(() => {
        rmSync(directory, { recursive: true, force: true });
    });

    const create = (rootPath: string, warningPercent: number) =>
        new StorageHealthCheck({
            storage: { rootPath },
            health: { diskStorageUsageThresholdInPercent: warningPercent },
        } as AppConfigService);

    it('measures STORAGE_ROOT_PATH and is up below the threshold', async () => {
        const check = await create(directory, 100).check();

        expect(check).toEqual(
            expect.objectContaining({ status: 'up', critical: false, pathSource: 'STORAGE_ROOT_PATH' }),
        );
        expect(check.usedPercent).toEqual(expect.any(Number));
        expect(JSON.stringify(check)).not.toContain(directory);
    });

    it('is a warning, never down, at or above the threshold', async () => {
        const check = await create(directory, 1).check();

        expect(check.status).toBe('warning');
        expect(check.critical).toBe(false);
    });

    it('falls back to the root file system when STORAGE_ROOT_PATH is not set', async () => {
        const check = await create('unknown', 100).check();

        expect(check.pathSource).toBe('root file system (STORAGE_ROOT_PATH not set)');
        expect(check.status).toBe('up');
    });

    it('is a warning when the path cannot be read', async () => {
        const check = await create(join(directory, 'missing'), 100).check();

        expect(check).toEqual(
            expect.objectContaining({ status: 'warning', message: 'Disk usage could not be read (ENOENT)' }),
        );
    });
});
