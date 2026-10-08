import { ManualDiscrepancyScanService } from '../../services/manual-discrepancy-scan.service';
import { ScanAllDiscrepanciesCommand } from '../scan-all-discrepancies.command';
import { ScanAllDiscrepanciesCommandHandler } from './scan-all-discrepancies.command-handler';

describe('ScanAllDiscrepanciesCommandHandler', () => {
    it('starts the manual scan of the tenant and returns its scanId', async () => {
        const start = jest.fn().mockReturnValue({ scanId: 'running-scan' });
        const handler = new ScanAllDiscrepanciesCommandHandler({ start } as unknown as ManualDiscrepancyScanService);

        await expect(handler.execute(new ScanAllDiscrepanciesCommand('transaction-1', 7))).resolves.toEqual({
            scanId: 'running-scan',
        });
        expect(start).toHaveBeenCalledWith('transaction-1', 7);
    });
});
