import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { DefaultAppConfig } from '../../../app-config/consts/default-app-config.const';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../../enums';
import { DiscrepancyOverview } from '../../models';
import { ScanDiscrepancyCommand } from '../scan-discrepancy.command';
import { ScanDiscrepancyCommandHandler } from './scan-discrepancy.command-handler';

describe('ScanDiscrepancyCommandHandler', () => {
    it('passes the scan state and failure kind of the Sync API through unchanged', async () => {
        const overview: DiscrepancyOverview = {
            entityType: DiscrepancyEntityType.User,
            totalBtData: 0,
            totalDbData: 4,
            identicalIds: [],
            onlyInExternalIds: [],
            onlyInInternalIds: [],
            mismatchedIds: [],
            state: DiscrepancyScanState.Failed,
            failureKind: 'NotFound',
        };
        const post = jest.fn().mockReturnValue(of({ data: overview }));
        const handler = new ScanDiscrepancyCommandHandler(
            {
                praSyncApi: { ...DefaultAppConfig.praSyncApi, baseUrl: 'http://sync' },
                praSyncApiTimeouts: DefaultAppConfig.praSyncApiTimeouts,
            } as unknown as AppConfigService,
            { post } as unknown as HttpService,
        );

        const result = await handler.execute(new ScanDiscrepancyCommand('tx', 3, DiscrepancyEntityType.User));

        expect(result).toEqual(overview);
        expect(post).toHaveBeenCalledWith(
            'http://sync/discrepancies/scan/user',
            expect.anything(),
            expect.objectContaining({ timeout: DefaultAppConfig.praSyncApiTimeouts.scanInMs }),
        );
    });
});
