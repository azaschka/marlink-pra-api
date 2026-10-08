import { NotFoundException } from '@nestjs/common';
import { ResourceReportRegistry } from '../../../observability/services/resource-report-registry.service';
import { DiscrepancyScanStatus } from '../../dtos/outputs';
import { DiscrepancyScanStatusService } from '../../services/discrepancy-scan-status.service';
import { RetrieveDiscrepancyScanStatusQuery } from '../retrieve-discrepancy-scan-status.query';
import { RetrieveDiscrepancyScanStatusQueryHandler } from './retrieve-discrepancy-scan-status.query-handler';

describe('RetrieveDiscrepancyScanStatusQueryHandler', () => {
    const statusService = new DiscrepancyScanStatusService(new ResourceReportRegistry());
    const handler = new RetrieveDiscrepancyScanStatusQueryHandler(statusService);

    beforeAll(() => {
        statusService.begin(7, 'scan-1');
    });

    it('returns the status of a scan of the requesting tenant', async () => {
        await expect(handler.execute(new RetrieveDiscrepancyScanStatusQuery('tx', 7, 'scan-1'))).resolves.toEqual(
            expect.objectContaining({ scanId: 'scan-1', status: DiscrepancyScanStatus.Running }),
        );
    });

    it('answers 404 for the scan of another tenant', async () => {
        await expect(handler.execute(new RetrieveDiscrepancyScanStatusQuery('tx', 8, 'scan-1'))).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
